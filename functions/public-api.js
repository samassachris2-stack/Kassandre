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
