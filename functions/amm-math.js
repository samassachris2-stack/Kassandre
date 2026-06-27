// Fonctions mathématiques pures (CPMM + LMSR), identiques à celles de
// src/lib/amm.js côté client — mais ici elles ne servent qu'au calcul côté
// serveur. Le client garde sa propre copie pour l'affichage des previews
// (aperçu avant achat/vente), mais c'est TOUJOURS ce fichier qui fait foi
// pour l'écriture réelle en base.

export const FEE = 0.02;

export function defaultLiquidityB(numOptions) {
  return Math.round(75 * Math.log(numOptions + 1));
}

export function getPricesLMSR(quantities, b) {
  const maxQ = Math.max(...quantities);
  const exps = quantities.map((q) => Math.exp((q - maxQ) / b));
  const sumExps = exps.reduce((a, v) => a + v, 0);
  return exps.map((e) => e / sumExps);
}

function lmsrCost(quantities, b) {
  const maxQ = Math.max(...quantities);
  const sumExps = quantities.reduce((acc, q) => acc + Math.exp((q - maxQ) / b), 0);
  return maxQ + b * Math.log(sumExps);
}

export function calcSharesLMSR(quantities, b, optionIndex, amount) {
  const amountAfterFee = amount * (1 - FEE);
  const costBefore = lmsrCost(quantities, b);

  let lo = 0;
  let hi = amountAfterFee * 50 + b * 10 + 1;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const trialQuantities = quantities.map((q, i2) => (i2 === optionIndex ? q + mid : q));
    const cost = lmsrCost(trialQuantities, b) - costBefore;
    if (cost > amountAfterFee) hi = mid;
    else lo = mid;
  }
  const deltaShares = lo;

  const newQuantities = quantities.map((q, i) => (i === optionIndex ? q + deltaShares : q));
  const pricePerShare = deltaShares > 0 ? amountAfterFee / deltaShares : 1;
  const newPrices = getPricesLMSR(newQuantities, b);

  return {
    shares: deltaShares,
    newQuantities,
    pricePerShare,
    newPrice: newPrices[optionIndex],
  };
}

export function calcSellSharesLMSR(quantities, b, optionIndex, sharesToSell) {
  const costBefore = (() => {
    const maxQ = Math.max(...quantities);
    const sumExps = quantities.reduce((acc, q) => acc + Math.exp((q - maxQ) / b), 0);
    return maxQ + b * Math.log(sumExps);
  })();

  const newQuantities = quantities.map((q, i) => (i === optionIndex ? q - sharesToSell : q));

  if (newQuantities[optionIndex] < 0) throw new Error("Pas assez de parts dans le pool");

  const costAfter = (() => {
    const maxQ = Math.max(...newQuantities);
    const sumExps = newQuantities.reduce((acc, q) => acc + Math.exp((q - maxQ) / b), 0);
    return maxQ + b * Math.log(sumExps);
  })();

  const grossProceeds = costBefore - costAfter;
  const netProceeds = grossProceeds * (1 - FEE);
  const pricePerShare = grossProceeds / sharesToSell;
  const newPrices = getPricesLMSR(newQuantities, b);

  return { proceeds: netProceeds, newQuantities, pricePerShare, newPrice: newPrices[optionIndex] };
}

export function calcShares(poolYes, poolNo, side, amount) {
  const amountAfterFee = amount * (1 - FEE);
  const k = poolYes * poolNo;

  if (side === "yes") {
    const newPoolNo = poolNo + amountAfterFee;
    const newPoolYes = k / newPoolNo;
    const shares = poolYes - newPoolYes;
    const pricePerShare = amountAfterFee / shares;
    return { shares, newPoolYes, newPoolNo, pricePerShare };
  } else {
    const newPoolYes = poolYes + amountAfterFee;
    const newPoolNo = k / newPoolYes;
    const shares = poolNo - newPoolNo;
    const pricePerShare = amountAfterFee / shares;
    return { shares, newPoolYes, newPoolNo, pricePerShare };
  }
}

export function calcSellShares(poolYes, poolNo, side, sharesToSell) {
  const k = poolYes * poolNo;

  if (side === "yes") {
    const newPoolYes = poolYes + sharesToSell;
    const newPoolNo = k / newPoolYes;
    const grossProceeds = poolNo - newPoolNo;
    const netProceeds = grossProceeds * (1 - FEE);
    const pricePerShare = grossProceeds / sharesToSell;
    return { proceeds: netProceeds, newPoolYes, newPoolNo, pricePerShare };
  } else {
    const newPoolNo = poolNo + sharesToSell;
    const newPoolYes = k / newPoolNo;
    const grossProceeds = poolYes - newPoolYes;
    const netProceeds = grossProceeds * (1 - FEE);
    const pricePerShare = grossProceeds / sharesToSell;
    return { proceeds: netProceeds, newPoolYes, newPoolNo, pricePerShare };
  }
}
