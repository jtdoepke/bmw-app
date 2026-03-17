/**
 * Best-Worst Method (BWM) Solver
 * Supports both crisp BWM (Rezaei 2015, 2016) and Fuzzy BWM (Guo & Zhao 2017).
 *
 * Crisp BWM uses a 1-9 integer scale.
 * Fuzzy BWM uses a 5-option linguistic scale mapped to Triangular Fuzzy Numbers.
 */

// Consistency Index table from Rezaei (2015)
// Index corresponds to aBW value (1-9)
const CONSISTENCY_INDEX = [0, 0.44, 1.0, 1.63, 2.3, 3.0, 3.73, 4.47, 5.23];

// 5-option linguistic scale → Triangular Fuzzy Numbers [l, m, u]
const FUZZY_SCALE = {
  1: [1, 1, 1],   // Equally important
  2: [1, 2, 3],   // Slightly more important
  4: [2, 4, 6],   // Moderately more important
  6: [4, 6, 8],   // Strongly more important
  9: [7, 9, 9],   // Absolutely more important
};

// Fuzzy Consistency Index (keyed by crisp best-to-worst value)
const FUZZY_CI = { 1: 0, 2: 0.44, 4: 1.63, 6: 3.0, 9: 5.23 };

const FUZZY_VALID = new Set([1, 2, 4, 6, 9]);

function isFuzzyInput(bestToOthers, othersToWorst) {
  const allValues = [...Object.values(bestToOthers), ...Object.values(othersToWorst)];
  return allValues.every((v) => FUZZY_VALID.has(v));
}

/**
 * Solve Fuzzy BWM: runs geometric mean approximation 3x (once per TFN component).
 * Returns crisp defuzzified weights plus the raw fuzzy weight triplets.
 */
function solveFuzzyBWM(items, bestItem, worstItem, bestToOthers, othersToWorst) {
  // For each TFN component index (0=l, 1=m, 2=u), compute weights.
  // BO vector: w ∝ 1/TFN(aBj). For lower bound of weight, use upper bound of rating (and vice versa).
  // OW vector: w ∝ TFN(ajW). Lower maps to lower directly.
  const componentWeights = [null, null, null]; // [l, m, u] each is { item: weight }

  for (let c = 0; c < 3; c++) {
    // For BO: to get weight component c, use rating component (2-c) for l/u swap
    // c=0 (lower weight) → use rating component 2 (upper, larger divisor → smaller weight)
    // c=1 (modal weight) → use rating component 1 (modal)
    // c=2 (upper weight) → use rating component 0 (lower, smaller divisor → larger weight)
    const boComponent = 2 - c;

    const rawBO = {};
    let sumBO = 0;
    for (const item of items) {
      const rating = item === bestItem ? 1 : (bestToOthers[item] || 1);
      const tfn = FUZZY_SCALE[rating] || [rating, rating, rating];
      rawBO[item] = 1 / tfn[boComponent];
      sumBO += rawBO[item];
    }

    // For OW: component maps directly (l→l, m→m, u→u)
    const rawOW = {};
    let sumOW = 0;
    for (const item of items) {
      const rating = item === worstItem ? 1 : (othersToWorst[item] || 1);
      const tfn = FUZZY_SCALE[rating] || [rating, rating, rating];
      rawOW[item] = tfn[c];
      sumOW += rawOW[item];
    }

    // Geometric mean combination + normalize
    const combined = {};
    let sumCombined = 0;
    for (const item of items) {
      const wBO = rawBO[item] / sumBO;
      const wOW = rawOW[item] / sumOW;
      combined[item] = Math.sqrt(wBO * wOW);
      sumCombined += combined[item];
    }

    const weights = {};
    for (const item of items) {
      weights[item] = combined[item] / sumCombined;
    }
    componentWeights[c] = weights;
  }

  // Ensure l ≤ m ≤ u for each item (numerical stability)
  const fuzzyWeights = {};
  for (const item of items) {
    const l = componentWeights[0][item];
    const m = componentWeights[1][item];
    const u = componentWeights[2][item];
    fuzzyWeights[item] = [Math.min(l, m, u), m, Math.max(l, m, u)];
  }

  // Defuzzify via Center of Gravity, then normalize
  const crisp = {};
  let sumCrisp = 0;
  for (const item of items) {
    const [l, m, u] = fuzzyWeights[item];
    crisp[item] = (l + m + u) / 3;
    sumCrisp += crisp[item];
  }
  const weights = {};
  for (const item of items) {
    weights[item] = crisp[item] / sumCrisp;
  }

  // Fuzzy consistency ratio (using modal component)
  const wBm = componentWeights[1][bestItem];
  const wWm = componentWeights[1][worstItem];
  let xi = 0;
  for (const item of items) {
    const aBj = item === bestItem ? 1 : (bestToOthers[item] || 1);
    const ajW = item === worstItem ? 1 : (othersToWorst[item] || 1);
    const tfnBj = FUZZY_SCALE[aBj] || [aBj, aBj, aBj];
    const tfnJW = FUZZY_SCALE[ajW] || [ajW, ajW, ajW];
    xi = Math.max(xi, Math.abs(wBm - tfnBj[1] * componentWeights[1][item]));
    xi = Math.max(xi, Math.abs(componentWeights[1][item] - tfnJW[1] * wWm));
  }

  const aBW = bestToOthers[worstItem] || 1;
  const ci = FUZZY_CI[aBW] || 1;
  const consistencyRatio = ci > 0 ? xi / ci : 0;

  return { weights, fuzzyWeights, consistencyRatio };
}

/**
 * Solve a single participant's BWM comparisons to get item weights.
 * Auto-detects fuzzy vs crisp input and delegates accordingly.
 *
 * @param {string[]} items - All item names
 * @param {string} bestItem - The item chosen as best
 * @param {string} worstItem - The item chosen as worst
 * @param {Object} bestToOthers - { itemName: rating } best vs each other
 * @param {Object} othersToWorst - { itemName: rating } each vs worst
 * @returns {{ weights: Object, consistencyRatio: number, fuzzyWeights?: Object }}
 */
export function solveBWM(items, bestItem, worstItem, bestToOthers, othersToWorst) {
  if (isFuzzyInput(bestToOthers, othersToWorst)) {
    return solveFuzzyBWM(items, bestItem, worstItem, bestToOthers, othersToWorst);
  }
  const n = items.length;

  // Compute raw weights from Best-to-Others vector: w_j ∝ 1/a_Bj
  const rawBO = {};
  let sumBO = 0;
  for (const item of items) {
    const aBj = item === bestItem ? 1 : (bestToOthers[item] || 1);
    rawBO[item] = 1 / aBj;
    sumBO += rawBO[item];
  }

  // Compute raw weights from Others-to-Worst vector: w_j ∝ a_jW
  const rawOW = {};
  let sumOW = 0;
  for (const item of items) {
    const ajW = item === worstItem ? 1 : (othersToWorst[item] || 1);
    rawOW[item] = ajW;
    sumOW += rawOW[item];
  }

  // Combine both vectors using geometric mean for robustness
  const combined = {};
  let sumCombined = 0;
  for (const item of items) {
    const wBO = rawBO[item] / sumBO;
    const wOW = rawOW[item] / sumOW;
    combined[item] = Math.sqrt(wBO * wOW);
    sumCombined += combined[item];
  }

  // Normalize to get final weights
  const weights = {};
  for (const item of items) {
    weights[item] = combined[item] / sumCombined;
  }

  // Compute consistency ratio
  const wB = weights[bestItem];
  const wW = weights[worstItem];
  let xi = 0;
  for (const item of items) {
    const aBj = item === bestItem ? 1 : (bestToOthers[item] || 1);
    const ajW = item === worstItem ? 1 : (othersToWorst[item] || 1);
    xi = Math.max(xi, Math.abs(wB - aBj * weights[item]));
    xi = Math.max(xi, Math.abs(weights[item] - ajW * wW));
  }

  const aBW = bestToOthers[worstItem] || 1;
  const ci = CONSISTENCY_INDEX[aBW - 1] || 1;
  const consistencyRatio = ci > 0 ? xi / ci : 0;

  return { weights, consistencyRatio };
}

/**
 * Aggregate weights from multiple participants using arithmetic mean.
 *
 * @param {Array<{ weights: Object }>} results - Array of individual BWM results
 * @param {string[]} items - All item names
 * @returns {Object} aggregatedWeights - { itemName: averageWeight }
 */
export function aggregateWeights(results, items) {
  const agg = {};
  for (const item of items) {
    agg[item] = 0;
  }

  for (const r of results) {
    for (const item of items) {
      agg[item] += (r.weights[item] || 0);
    }
  }

  for (const item of items) {
    agg[item] /= results.length;
  }

  return agg;
}

/**
 * Aggregate fuzzy weights (TFN triplets) from multiple participants.
 * Averages l, m, u components separately.
 *
 * @param {Array<{ fuzzyWeights: Object }>} results - Individual results with fuzzyWeights
 * @param {string[]} items - All item names
 * @returns {Object} { itemName: [avgL, avgM, avgU] }
 */
export function aggregateFuzzyWeights(results, items) {
  const agg = {};
  for (const item of items) {
    agg[item] = [0, 0, 0];
  }

  for (const r of results) {
    if (!r.fuzzyWeights) continue;
    for (const item of items) {
      const [l, m, u] = r.fuzzyWeights[item] || [0, 0, 0];
      agg[item][0] += l;
      agg[item][1] += m;
      agg[item][2] += u;
    }
  }

  const n = results.filter((r) => r.fuzzyWeights).length || 1;
  for (const item of items) {
    agg[item][0] /= n;
    agg[item][1] /= n;
    agg[item][2] /= n;
  }

  return agg;
}

/**
 * Convert weights to a 1–5 priority scale.
 * Rank items by weight, then distribute into 5 buckets.
 *
 * @param {Object} weights - { itemName: weight }
 * @returns {Object} priorities - { itemName: priority (1-5) }
 */
export function weightsToPriorities(weights) {
  const sorted = Object.entries(weights).sort((a, b) => b[1] - a[1]);
  const n = sorted.length;
  const priorities = {};

  for (let i = 0; i < n; i++) {
    // Map position to 1-5 scale
    const bucket = Math.floor((i / n) * 5) + 1;
    priorities[sorted[i][0]] = Math.min(bucket, 5);
  }

  return priorities;
}
