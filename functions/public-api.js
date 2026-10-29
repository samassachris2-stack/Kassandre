// API publique en lecture seule : marchés (ouverts et passés), historique des
// probabilités, calibration. Lue avec l'Admin SDK (un appel REST direct à
// Firestore est refusé par App Check). Aucune donnée utilisateur n'est exposée :
// ni paris, ni identifiants, ni soldes.

export const LICENSE = {
  name: "CC BY 4.0",
  url: "https://creativecommons.org/licenses/by/4.0/",
  attribution: "Kassandre (https://kassandre.app)",
};

const SITE = "https://kassandre.app";
const MAX_LIMIT = 200;
const iso = (ts) => (ts && typeof ts.toDate === "function" ? ts.toDate().toISOString() : null);
const catsOf = (m) => (Array.isArray(m.categories) ? m.categories : m.category ? [m.category] : []);

// ── Cache mémoire (par instance) pour limiter les lectures Firestore ──────────
const cache = new Map();
async function memo(key, ttlMs, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
}

function cleanEvidence(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((e) => e && typeof e === "object")
    .map((e) => ({
      type: String(e.type || "source"),
      label: String(e.label || ""),
      url: typeof e.url === "string" ? e.url : null,
      archiveUrl: typeof e.archiveUrl === "string" ? e.archiveUrl : null,
      value: e.value != null ? String(e.value) : null,
      note: e.note != null ? String(e.note) : null,
      date: typeof e.date === "string" ? e.date : null,
    }));
}

export function serializeMarket(id, m, options) {
  const binary = m.type !== "multi";
  const total = (m.poolYes || 0) + (m.poolNo || 0);
  const out = {
    id,
    url: `${SITE}/market/${id}`,
    question: m.question ?? "",
    description: m.description ?? "",
    type: binary ? "binary" : "multi",
    status: m.status ?? null,
    categories: catsOf(m),
    tags: Array.isArray(m.tags) ? m.tags : [],
    createdAt: iso(m.createdAt),
    resolutionDate: typeof m.resolutionDate === "string" ? m.resolutionDate : iso(m.resolutionDate)?.slice(0, 10) ?? null,
    resolutionSource: m.resolutionSource ?? null,
    resolvedAt: iso(m.resolvedAt),
    outcome: m.outcome ?? null,
    probabilityYes: binary && total > 0 ? Math.round(((m.poolNo || 0) / total) * 1000) / 1000 : null,
    volume: typeof m.totalVolume === "number" ? Math.round(m.totalVolume) : null,
    resolutionNote: m.resolutionNote ?? null,
    evidence: cleanEvidence(m.evidence),
  };
  if (options) {
    out.options = options;
    if (m.status === "resolved" && m.outcome != null) {
      out.outcomeLabel = options.find((o) => o.id === m.outcome)?.label ?? null;
    }
  } else if (binary && m.outcome) {
    out.outcomeLabel = m.outcome === "yes" ? "OUI" : m.outcome === "no" ? "NON" : null;
  }
  return out;
}

async function allMarkets(db) {
  return memo("markets", 120000, async () => {
    const snap = await db.collection("markets").limit(2000).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  });
}

async function optionsOf(db, id) {
  const snap = await db.collection("markets").doc(id).collection("options").get();
  return snap.docs
    .map((d) => ({ id: d.id, label: String(d.data().label ?? ""), probability: typeof d.data().price === "number" ? Math.round(d.data().price * 1000) / 1000 : null }))
    .sort((a, b) => (b.probability ?? 0) - (a.probability ?? 0));
}

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export async function listMarkets(db, q) {
  const all = await allMarkets(db);
  const status = ["open", "resolved"].includes(q.status) ? q.status : null;
  const cat = q.category ? norm(q.category) : null;
  const tag = q.tag ? norm(q.tag) : null;
  const text = q.q ? norm(q.q) : null;
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(q.limit, 10) || 50));
  const offset = Math.max(0, parseInt(q.offset, 10) || 0);
  const rows = all
    .filter((m) => m.question)
    .filter((m) => (status ? m.status === status : true))
    .filter((m) => (cat ? catsOf(m).some((c) => norm(c) === cat) : true))
    .filter((m) => (tag ? (m.tags || []).some((t) => norm(t) === tag) : true))
    .filter((m) => (text ? norm(m.question).includes(text) : true))
    .sort((a, b) => (iso(b.resolvedAt) || iso(b.createdAt) || "").localeCompare(iso(a.resolvedAt) || iso(a.createdAt) || ""));
  return {
    total: rows.length,
    limit,
    offset,
    data: rows.slice(offset, offset + limit).map((m) => serializeMarket(m.id, m)),
  };
}

export async function getMarket(db, id) {
  const snap = await db.collection("markets").doc(id).get();
  if (!snap.exists) return null;
  const m = snap.data();
  const options = m.type === "multi" ? await optionsOf(db, id) : null;
  return serializeMarket(id, m, options);
}

export async function getHistory(db, id) {
  const mSnap = await db.collection("markets").doc(id).get();
  if (!mSnap.exists) return null;
  const m = mSnap.data();
  const multi = m.type === "multi";
  const options = multi ? await optionsOf(db, id) : null;
  const h = await db.collection("markets").doc(id).collection("priceHistory").orderBy("timestamp", "asc").limit(5000).get();
  const points = h.docs.map((d) => {
    const x = d.data();
    const t = iso(x.timestamp);
    if (!multi) return { t, yes: x.pctYes ?? null };
    const values = {};
    (options || []).forEach((o) => { if (typeof x[o.id] === "number") values[o.id] = x[o.id]; });
    return { t, values };
  });
  return { id, type: multi ? "multi" : "binary", unit: "percent", options, points };
}

// Calibration : pour chaque marché binaire résolu, la probabilité du marché
// `horizonDays` jours avant sa résolution, comparée au résultat réel.
export async function getCalibration(db, horizonDays = 7) {
  const h = Math.min(60, Math.max(1, Math.round(horizonDays) || 7));
  return memo(`calib:${h}`, 3600000, async () => {
    const all = await allMarkets(db);
    const resolved = all
      .filter((m) => m.status === "resolved" && m.type !== "multi" && (m.outcome === "yes" || m.outcome === "no") && m.resolvedAt)
      .sort((a, b) => (iso(b.resolvedAt) || "").localeCompare(iso(a.resolvedAt) || ""))
      .slice(0, 300);
    const samples = [];
    for (const m of resolved) {
      const cutoff = m.resolvedAt.toDate().getTime() - h * 86400000;
      const snap = await db.collection("markets").doc(m.id).collection("priceHistory").orderBy("timestamp", "asc").limit(5000).get();
      let p = null;
      snap.docs.forEach((d) => {
        const x = d.data();
        const t = x.timestamp?.toDate?.().getTime();
        if (t && t <= cutoff && typeof x.pctYes === "number") p = x.pctYes;
      });
      if (p === null) continue; // marché trop récent pour cet horizon
      samples.push({ id: m.id, question: m.question, predicted: p / 100, actual: m.outcome === "yes" ? 1 : 0 });
    }
    const buckets = Array.from({ length: 10 }, (_, i) => ({ from: i * 10, to: (i + 1) * 10, n: 0, yes: 0, sumP: 0 }));
    let brier = 0;
    samples.forEach((s) => {
      const b = buckets[Math.min(9, Math.floor(s.predicted * 10))];
      b.n += 1; b.yes += s.actual; b.sumP += s.predicted;
      brier += (s.predicted - s.actual) ** 2;
    });
    return {
      horizonDays: h,
      markets: samples.length,
      brierScore: samples.length ? Math.round((brier / samples.length) * 1000) / 1000 : null,
      note: "Score de Brier : 0 = parfait, 0,25 = équivalent à toujours répondre 50 %.",
      buckets: buckets.map((b) => ({
        range: `${b.from}-${b.to}%`,
        markets: b.n,
        meanPredicted: b.n ? Math.round((b.sumP / b.n) * 1000) / 1000 : null,
        observedYesRate: b.n ? Math.round((b.yes / b.n) * 1000) / 1000 : null,
      })),
    };
  });
}

export async function getStats(db) {
  const all = await allMarkets(db);
  const byStatus = { open: 0, resolved: 0 };
  const byCategory = {};
  all.forEach((m) => {
    if (m.status === "open" || m.status === "resolved") byStatus[m.status] += 1;
    catsOf(m).forEach((c) => { byCategory[c] = (byCategory[c] || 0) + 1; });
  });
  return { markets: all.length, ...byStatus, byCategory };
}

// ── CSV ───────────────────────────────────────────────────────────────────────
const csvCell = (v) => {
  const s = v == null ? "" : Array.isArray(v) ? v.join("|") : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export function toCsv(rows, columns) {
  return [columns.join(","), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(","))].join("\n") + "\n";
}
export const MARKET_COLUMNS = [
  "id", "question", "type", "status", "categories", "tags", "createdAt", "resolutionDate",
  "resolvedAt", "outcome", "outcomeLabel", "probabilityYes", "volume", "resolutionSource", "url",
];

// ── Statistiques par groupe (zone, âge, métier) ────────────────────────────────
// Chaque parieur compte pour une voix : OUI s'il détient plus d'actions OUI que
// NON sur le marché, NON dans le cas inverse. Les profils (collection
// "demographics") sont facultatifs et privés ; ils ne servent qu'ici, et un
// groupe n'est publié que s'il compte au moins MIN_GROUP personnes.
export const MIN_GROUP = 10;
const AGE_BANDS = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
const PROFESSIONS = {
  etudiant: "Étudiant", tech: "Tech et numérique", sante: "Santé et social", enseignement: "Enseignement et recherche",
  finance: "Finance, assurance, immobilier", commerce: "Commerce, vente, services", industrie: "Industrie, ingénierie, transport",
  public: "Administration et fonction publique", artisanat: "Artisanat, BTP, agriculture", medias: "Médias, culture, communication",
  "sans-emploi": "Sans emploi", retraite: "Retraité", autre: "Autre",
};

// Arrondit l'affichage des petits groupes pour limiter les recoupements.
const pct = (yes, n) => {
  const p = (yes / n) * 100;
  return Math.round(n < 30 ? Math.round(p / 5) * 5 : p);
};

function groupBy(voters, keyOf) {
  const map = new Map();
  voters.forEach((v) => {
    const k = keyOf(v);
    if (k == null || k === "") return;
    const g = map.get(k) || { n: 0, yes: 0 };
    g.n += 1; g.yes += v.vote === "yes" ? 1 : 0;
    map.set(k, g);
  });
  const shown = {};
  let hidden = 0;
  map.forEach((g, k) => {
    if (g.n >= MIN_GROUP) shown[k] = { n: g.n, yesPct: pct(g.yes, g.n) };
    else hidden += 1;
  });
  return { groups: shown, hiddenGroups: hidden };
}

// Vote net de chaque parieur sur un marché Oui/Non (une voix par personne).
async function marketVoters(db, marketId) {
  const bets = await db.collection("bets").where("marketId", "==", marketId).limit(10000).get();
  const net = new Map();
  bets.docs.forEach((d) => {
    const b = d.data();
    if (!b.userId || (b.side !== "yes" && b.side !== "no")) return;
    const u = net.get(b.userId) || { yes: 0, no: 0 };
    u[b.side] += b.shares || 0;
    net.set(b.userId, u);
  });
  const voters = [];
  net.forEach((u, uid) => {
    if (u.yes > 0.001 && u.yes >= u.no) voters.push({ uid, vote: "yes" });
    else if (u.no > 0.001) voters.push({ uid, vote: "no" });
  });
  return voters;
}

// Profils partagés (consentement explicite uniquement).
async function loadProfiles(db, uids) {
  const demo = new Map();
  for (let i = 0; i < uids.length; i += 300) {
    const refs = uids.slice(i, i + 300).map((u) => db.collection("demographics").doc(u));
    if (refs.length === 0) break;
    const docs = await db.getAll(...refs);
    docs.forEach((d) => { if (d.exists && d.data().consent === true) demo.set(d.id, d.data()); });
  }
  return demo;
}

// Marchés à plusieurs choix : chaque parieur compte pour l'option sur laquelle il détient
// le plus de parts. On montre les 3 choix les plus soutenus par groupe.
async function getInsightsMulti(db, marketId, m) {
  const [optSnap, betSnap] = await Promise.all([
    db.collection("markets").doc(marketId).collection("options").get(),
    db.collection("bets").where("marketId", "==", marketId).limit(10000).get(),
  ]);
  const options = optSnap.docs.map((d) => ({ id: d.id, label: d.data().label || d.id }));
  const labelOf = new Map(options.map((o) => [o.id, o.label]));
  const net = new Map();
  betSnap.docs.forEach((d) => {
    const b = d.data();
    if (!b.userId || !b.optionId) return;
    const u = net.get(b.userId) || new Map();
    u.set(b.optionId, (u.get(b.optionId) || 0) + (b.shares || 0));
    net.set(b.userId, u);
  });
  const voters = [];
  net.forEach((u, uid) => {
    let best = null;
    u.forEach((sh, oid) => { if (sh > 0.001 && (!best || sh > best.sh)) best = { oid, sh }; });
    if (best) voters.push({ uid, vote: best.oid });
  });
  const demo = await loadProfiles(db, voters.map((v) => v.uid));
  const withProfile = voters.filter((v) => demo.has(v.uid)).map((v) => ({ ...v, ...demo.get(v.uid) }));
  const enough = withProfile.length >= MIN_GROUP;

  const dist = (list) => {
    const c = new Map();
    list.forEach((v) => c.set(v.vote, (c.get(v.vote) || 0) + 1));
    return [...c.entries()]
      .map(([id, n]) => ({ id, label: labelOf.get(id) || id, pct: pct(n, list.length) }))
      .sort((a, b) => b.pct - a.pct);
  };
  const groupTop = (keyOf) => {
    const map = new Map();
    withProfile.forEach((v) => {
      const k = keyOf(v);
      if (!k) return;
      map.set(k, [...(map.get(k) || []), v]);
    });
    const groups = {};
    let hidden = 0;
    map.forEach((list, k) => {
      if (list.length >= MIN_GROUP) groups[k] = { n: list.length, top: dist(list).slice(0, 3) };
      else hidden += 1;
    });
    return { groups, hiddenGroups: hidden };
  };
  const empty = { groups: {}, hiddenGroups: 0 };
  return {
    id: marketId,
    supported: true,
    type: "multi",
    minGroupSize: MIN_GROUP,
    status: m.status || null,
    outcome: m.status === "resolved" && m.outcome ? String(m.outcome) : null,
    categories: catsOf(m),
    options,
    voters: voters.length,
    overall: voters.length >= MIN_GROUP ? dist(voters).slice(0, 6) : [],
    profiled: enough ? withProfile.length : null,
    profiledCount: withProfile.length,
    note: "Opinion des membres de Kassandre ayant renseigné leur profil, pas un sondage représentatif.",
    byAge: enough ? groupTop((v) => v.ageBand) : empty,
    byProfession: enough ? groupTop((v) => v.profession) : empty,
    labels: { professions: PROFESSIONS, ageBands: AGE_BANDS },
  };
}

export async function getInsights(db, marketId) {
  return memo(`insights:${marketId}`, 600000, async () => {
    const mSnap = await db.collection("markets").doc(marketId).get();
    if (!mSnap.exists) return null;
    const m = mSnap.data();
    if (m.type === "multi") return getInsightsMulti(db, marketId, m);

    const voters = await marketVoters(db, marketId);
    const demo = await loadProfiles(db, voters.map((v) => v.uid));
    const withProfile = voters.filter((v) => demo.has(v.uid)).map((v) => ({ ...v, ...demo.get(v.uid) }));

    const total = voters.length;
    const yesAll = voters.filter((v) => v.vote === "yes").length;
    const enough = withProfile.length >= MIN_GROUP;
    const empty = { groups: {}, hiddenGroups: 0 };
    return {
      id: marketId,
      supported: true,
      minGroupSize: MIN_GROUP,
      status: m.status || null,
      outcome: m.status === "resolved" && (m.outcome === "yes" || m.outcome === "no") ? m.outcome : null,
      categories: catsOf(m),
      voters: total,
      yesPct: total ? pct(yesAll, total) : null,
      profiled: enough ? withProfile.length : null,
      profiledCount: withProfile.length,
      note: "Opinion des membres de Kassandre ayant renseigné leur profil, pas un sondage représentatif.",
      byCountry: enough ? groupBy(withProfile, (v) => v.country || (v.dept ? "FR" : null)) : empty,
      byDepartment: enough ? groupBy(withProfile, (v) => v.dept) : empty,
      byParisArrondissement: enough ? groupBy(withProfile.filter((v) => v.dept === "75"), (v) => v.arr) : empty,
      byAge: enough ? groupBy(withProfile, (v) => v.ageBand) : empty,
      byProfession: enough ? groupBy(withProfile, (v) => v.profession) : empty,
      labels: { professions: PROFESSIONS, ageBands: AGE_BANDS },
    };
  });
}

// "Qui anticipe le mieux ?" : part de votes corrects (vote net du parieur comparé au
// résultat) sur les marchés Oui/Non résolus, par tranche d'âge et par métier.
// Un groupe n'apparaît qu'avec au moins 10 personnes et 30 votes.
const MIN_VOTES = 30;
const rightPct = (right, n) => {
  const p = (right / n) * 100;
  return Math.round(n < 100 ? Math.round(p / 5) * 5 : p);
};

export async function getTrackRecord(db, category) {
  return memo(`track:${category || "*"}`, 3600000, async () => {
    const snap = await db.collection("markets").where("status", "==", "resolved").get();
    const markets = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((m) => m.type !== "multi" && (m.outcome === "yes" || m.outcome === "no"))
      .filter((m) => !category || catsOf(m).includes(category));

    const votes = []; // { uid, right }
    for (let i = 0; i < markets.length; i += 8) {
      const chunk = markets.slice(i, i + 8);
      const lists = await Promise.all(chunk.map((m) => marketVoters(db, m.id)));
      lists.forEach((vs, k) => vs.forEach((v) => votes.push({ uid: v.uid, right: v.vote === chunk[k].outcome })));
    }
    const demo = await loadProfiles(db, [...new Set(votes.map((v) => v.uid))]);
    const prof = votes.filter((v) => demo.has(v.uid)).map((v) => ({ ...v, ...demo.get(v.uid) }));

    const group = (keyOf) => {
      const map = new Map();
      prof.forEach((v) => {
        const k = keyOf(v);
        if (!k) return;
        const g = map.get(k) || { users: new Set(), votes: 0, right: 0 };
        g.users.add(v.uid); g.votes += 1; g.right += v.right ? 1 : 0;
        map.set(k, g);
      });
      const groups = {};
      let hidden = 0;
      map.forEach((g, k) => {
        if (g.users.size >= MIN_GROUP && g.votes >= MIN_VOTES) groups[k] = { members: g.users.size, votes: g.votes, rightPct: rightPct(g.right, g.votes) };
        else hidden += 1;
      });
      return { groups, hiddenGroups: hidden };
    };

    const enough = new Set(prof.map((v) => v.uid)).size >= MIN_GROUP && prof.length >= MIN_VOTES;
    const empty = { groups: {}, hiddenGroups: 0 };
    return {
      category: category || null,
      markets: markets.length,
      minGroupSize: MIN_GROUP,
      minVotes: MIN_VOTES,
      allMembers: votes.length >= MIN_VOTES ? { votes: votes.length, rightPct: rightPct(votes.filter((v) => v.right).length, votes.length) } : null,
      byAge: enough ? group((v) => v.ageBand) : empty,
      byProfession: enough ? group((v) => v.profession) : empty,
      labels: { professions: PROFESSIONS, ageBands: AGE_BANDS },
      note: "Part des votes allant dans le sens du résultat, parmi les membres ayant renseigné leur profil. Un marché très déséquilibré gonfle ce chiffre : comparer au chiffre de tous les membres.",
    };
  });
}
