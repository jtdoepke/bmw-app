/**
 * Best-Worst Method (BWM) Solver
 * Based on Rezaei (2015, 2016)
 *
 * Uses the analytical approximation for the linear BWM model.
 */

// Consistency Index table from Rezaei (2015)
// Index corresponds to aBW value (1-9)
const CONSISTENCY_INDEX = [0, 0.44, 1.0, 1.63, 2.3, 3.0, 3.73, 4.47, 5.23];

/**
 * Solve a single participant's BWM comparisons to get item weights.
 *
 * @param {string[]} items - All item names
 * @param {string} bestItem - The item chosen as best
 * @param {string} worstItem - The item chosen as worst
 * @param {Object} bestToOthers - { itemName: rating (1-9) } best vs each other
 * @param {Object} othersToWorst - { itemName: rating (1-9) } each vs worst
 * @returns {{ weights: Object, consistencyRatio: number }}
 */
export function solveBWM(items, bestItem, worstItem, bestToOthers, othersToWorst) {
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
