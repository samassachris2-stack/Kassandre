// Calcul du tracker de prévisions d'un membre, à partir de ses paris (publics)
// et des marchés résolus. Tout est fait dans le navigateur : aucune donnée
// n'est stockée, les chiffres se recalculent à chaque visite.
//
// Vocabulaire
//  - position : l'ensemble des achats/ventes d'un membre sur un même choix
//    (OUI, NON ou une option) d'un même marché.
//  - prix d'entrée : prix moyen payé par part, lu comme la probabilité que le
//    marché donnait à ce choix au moment de l'achat.
//  - avantage : issue réelle (1 si gagné, 0 si perdu) moins prix d'entrée.
//    Positif en moyenne = le membre achète des choix que le marché sous-estime.

import {
  collection, documentId, getDocs, query, where,
} from "firebase/firestore";
import { db } from "./firebase";

const MAX_MARKETS = 100;
const CHUNK = 30;
export const MIN_SAMPLE = 10;

const keyOf = (bet) => bet.optionId || bet.side;
const toMillis = (t) => (t && t.toMillis ? t.toMillis() : t ? new Date(t).getTime() : 0);
const asCats = (m) => (Array.isArray(m.categories) ? m.categories : m.category ? [m.category] : ["Autre"]);

async function fetchMarkets(ids) {
  const out = new Map();
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const snap = await getDocs(query(collection(db, "markets"), where(documentId(), "in", chunk)));
    snap.forEach((d) => out.set(d.id, { id: d.id, ...d.data() }));
  }
  return out;
}

async function fetchOptionLabels(marketId) {
  const snap = await getDocs(collection(db, "markets", marketId, "options"));
  const map = {};
  snap.forEach((d) => { map[d.id] = d.data().label || d.id; });
  return map;
}

// Gain estimé d'un membre sur un marché résolu : on rejoue la règle de
// distribution de resolveMarket (functions/index.js) sur l'ensemble des paris.
function estimatePayout(userBets, allBets, outcome, isMulti) {
  const field = isMulti ? "optionId" : "side";
  let winningShares = 0;
  let losingAmount = 0;
  allBets.forEach((b) => {
    if (b[field] === undefined) return;
    if (b[field] === outcome) winningShares += b.shares || 0;
    else losingAmount += b.amount || 0;
  });
  let payout = 0;
  userBets.forEach((b) => {
    if (b[field] !== outcome) return;
    const ratio = winningShares > 0 ? (b.shares || 0) / winningShares : 0;
    payout += (b.amount || 0) + ratio * losingAmount * 0.98;
  });
  const spent = userBets.reduce((s, b) => s + (b.amount || 0), 0);
  return payout - spent;
}

export async function loadForecastStats(uid, onProgress = () => {}) {
  onProgress("Lecture des paris...");
  const betsSnap = await getDocs(query(collection(db, "bets"), where("userId", "==", uid)));
  const bets = betsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const marketIds = [...new Set(bets.map((b) => b.marketId))];
  if (marketIds.length === 0) return buildStats([], 0, 0);

  onProgress("Lecture des marchés...");
  const markets = await fetchMarkets(marketIds);
  const open = marketIds.filter((id) => markets.get(id)?.status === "open").length;

  const resolved = marketIds
    .map((id) => markets.get(id))
    .filter((m) => m && m.status === "resolved")
    .sort((a, b) => toMillis(b.resolvedAt) - toMillis(a.resolvedAt))
    .slice(0, MAX_MARKETS);

  const positions = [];
  let done = 0;
  // Un marché à la fois pour rester léger côté base.
  for (const m of resolved) {
    done += 1;
    onProgress(`Analyse des marchés résolus (${done}/${resolved.length})...`);
    const isMulti = m.type === "multi";
    const allSnap = await getDocs(query(collection(db, "bets"), where("marketId", "==", m.id)));
    const all = allSnap.docs.map((d) => d.data());
    const mine = bets.filter((b) => b.marketId === m.id);
    const labels = isMulti ? await fetchOptionLabels(m.id) : {};
    const pnlMarket = estimatePayout(mine, all, m.outcome, isMulti);

    const byKey = new Map();
    mine.forEach((b) => {
      const k = keyOf(b);
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(b);
    });

    // Le résultat du marché est réparti sur les positions en proportion des mises.
    const stakes = new Map();
    byKey.forEach((list, k) => stakes.set(k, list.reduce((s, b) => s + Math.max(0, b.amount || 0), 0)));
    const totalStake = [...stakes.values()].reduce((s, v) => s + v, 0);

    byKey.forEach((list, k) => {
      const buys = list.filter((b) => (b.shares || 0) > 0);
      const buyShares = buys.reduce((s, b) => s + b.shares, 0);
      const buyCost = buys.reduce((s, b) => s + b.amount, 0);
      const netShares = list.reduce((s, b) => s + (b.shares || 0), 0);
      const first = Math.min(...list.map((b) => toMillis(b.createdAt)).filter(Boolean));
      const entry = buyShares > 0 ? buyCost / buyShares : null;
      const won = String(k) === String(m.outcome);
      const closedEarly = netShares < 1e-6;
      const share = totalStake > 0 ? (stakes.get(k) || 0) / totalStake : 0;
      positions.push({
        marketId: m.id,
        question: m.question || "",
        categories: asCats(m),
        choice: isMulti ? (labels[k] || String(k)) : (k === "yes" ? "OUI" : "NON"),
        entry: entry !== null ? Math.min(0.99, Math.max(0.01, entry)) : null,
        stake: buyCost,
        won,
        closedEarly,
        pnl: pnlMarket * share,
        resolvedAt: toMillis(m.resolvedAt),
        firstBetAt: first,
      });
    });
  }
  return buildStats(positions, open, marketIds.length);
}

export function buildStats(positions, openMarkets, totalMarkets) {
  const held = positions.filter((p) => !p.closedEarly && p.entry !== null);
  const wins = held.filter((p) => p.won).length;
  const pnl = positions.reduce((s, p) => s + p.pnl, 0);
  const staked = positions.reduce((s, p) => s + p.stake, 0);
  const edges = held.map((p) => (p.won ? 1 : 0) - p.entry);
  const avg = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);

  // Calibration : le choix payé x % se réalise-t-il x % du temps ?
  const BUCKETS = [[0, 0.2], [0.2, 0.4], [0.4, 0.6], [0.6, 0.8], [0.8, 1.01]];
  const calibration = BUCKETS.map(([lo, hi]) => {
    const inB = held.filter((p) => p.entry >= lo && p.entry < hi);
    return {
      label: `${Math.round(lo * 100)}-${Math.min(100, Math.round(hi * 100))}%`,
      n: inB.length,
      expected: avg(inB.map((p) => p.entry)),
      observed: inB.length ? inB.filter((p) => p.won).length / inB.length : null,
    };
  });

  // Par catégorie
  const cat = new Map();
  positions.forEach((p) => {
    p.categories.forEach((c) => {
      if (!cat.has(c)) cat.set(c, { name: c, n: 0, held: [], pnl: 0 });
      const e = cat.get(c);
      e.n += 1;
      e.pnl += p.pnl / p.categories.length;
      if (!p.closedEarly && p.entry !== null) e.held.push(p);
    });
  });
  const categories = [...cat.values()].map((e) => ({
    name: e.name,
    n: e.n,
    hit: e.held.length ? e.held.filter((p) => p.won).length / e.held.length : null,
    edge: avg(e.held.map((p) => (p.won ? 1 : 0) - p.entry)),
    pnl: e.pnl,
    sample: e.held.length,
  })).sort((a, b) => b.n - a.n);

  // Courbe du résultat cumulé, dans l'ordre des résolutions
  const timeline = [...positions].sort((a, b) => a.resolvedAt - b.resolvedAt);
  let run = 0;
  const curve = timeline.map((p) => { run += p.pnl; return { t: p.resolvedAt, v: run }; });

  // Séries
  const ordered = [...held].sort((a, b) => a.resolvedAt - b.resolvedAt);
  let best = 0, cur = 0;
  ordered.forEach((p) => { cur = p.won ? cur + 1 : 0; if (cur > best) best = cur; });
  let streak = 0;
  for (let i = ordered.length - 1; i >= 0 && ordered[i].won; i -= 1) streak += 1;

  const sorted = [...positions].sort((a, b) => b.pnl - a.pnl);

  return {
    positions: [...positions].sort((a, b) => b.resolvedAt - a.resolvedAt),
    resolvedCount: positions.length,
    heldCount: held.length,
    openMarkets,
    totalMarkets,
    hitRate: held.length ? wins / held.length : null,
    pnl,
    staked,
    roi: staked > 0 ? pnl / staked : null,
    avgEntry: avg(held.map((p) => p.entry)),
    edge: avg(edges),
    calibration,
    categories,
    curve,
    bestStreak: best,
    currentStreak: streak,
    bestBet: sorted[0] && sorted[0].pnl > 0 ? sorted[0] : null,
    worstBet: sorted.length && sorted[sorted.length - 1].pnl < 0 ? sorted[sorted.length - 1] : null,
    reliable: held.length >= MIN_SAMPLE,
  };
}
