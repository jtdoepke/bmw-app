/**
 * Best-Worst Method (BWM) Solver
 * Supports both crisp BWM (Rezaei 2015, 2016) and Fuzzy BWM (Guo & Zhao 2017).
 *
 * Uses a linear programming solver (simplex method) to compute optimal weights.
 * Consistency ratios use ratio-form deviations (|wB/wj - aBj|) from LP-optimal
 * weights, divided by Rezaei's published Consistency Index (calibrated for the
 * ratio form). The LP provides well-bounded weights that prevent the extreme
 * ratios that geometric mean approximations produce with many items.
 *
 * Crisp BWM uses a 1-9 integer scale.
 * Fuzzy BWM uses a 5-option linguistic scale mapped to Triangular Fuzzy Numbers.
 */

import solver from "javascript-lp-solver";

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
 * Build and solve the BWM linear program for a single set of crisp ratings.
 *
 * LP formulation (Rezaei 2015):
 *   min ξ
 *   s.t. |wB - aBj·wj| ≤ ξ   for all j
 *        |wj - ajW·wW| ≤ ξ   for all j
 *        Σwj = 1,  wj ≥ 0,  ξ ≥ 0
 *
 * @param {string[]} items
 * @param {string} bestItem
 * @param {string} worstItem
 * @param {Object} ratingsBO - { item: crisp_rating } for best-to-others
 * @param {Object} ratingsOW - { item: crisp_rating } for others-to-worst
 * @returns {{ weights: Object, xi: number }}
 */
function solveBWMLP(items, bestItem, worstItem, ratingsBO, ratingsOW) {
  if (items.length <= 1) {
    const weights = {};
    for (const item of items) weights[item] = 1;
    return { weights, xi: 0 };
  }

  const constraints = {};
  const variables = {};

  // Weight sum constraint
  constraints["sum"] = { equal: 1 };

  // Initialize xi variable (the objective to minimize)
  variables["xi"] = { obj: 1, sum: 0 };

  // Initialize weight variables
  for (const item of items) {
    const varName = `w_${item}`;
    variables[varName] = { obj: 0, sum: 1 };
  }

  // Best-to-Others constraints: |wB - aBj·wj| ≤ ξ
  for (const item of items) {
    if (item === bestItem) continue;
    const aBj = ratingsBO[item] || 1;
    const upperName = `bo_u_${item}`;
    const lowerName = `bo_l_${item}`;

    // wB - aBj·wj - ξ ≤ 0
    constraints[upperName] = { max: 0 };
    variables[`w_${bestItem}`][upperName] = 1;
    variables[`w_${item}`][upperName] = -aBj;
    variables["xi"][upperName] = -1;

    // aBj·wj - wB - ξ ≤ 0
    constraints[lowerName] = { max: 0 };
    variables[`w_${bestItem}`][lowerName] = -1;
    variables[`w_${item}`][lowerName] = aBj;
    variables["xi"][lowerName] = -1;
  }

  // Others-to-Worst constraints: |wj - ajW·wW| ≤ ξ
  for (const item of items) {
    if (item === worstItem) continue;
    const ajW = ratingsOW[item] || 1;
    const upperName = `ow_u_${item}`;
    const lowerName = `ow_l_${item}`;

    // wj - ajW·wW - ξ ≤ 0
    constraints[upperName] = { max: 0 };
    variables[`w_${item}`][upperName] = 1;
    variables[`w_${worstItem}`][upperName] = -ajW;
    variables["xi"][upperName] = -1;

    // ajW·wW - wj - ξ ≤ 0
    constraints[lowerName] = { max: 0 };
    variables[`w_${item}`][lowerName] = -1;
    variables[`w_${worstItem}`][lowerName] = ajW;
    variables["xi"][lowerName] = -1;
  }

  const model = { optimize: "obj", opType: "min", constraints, variables };
  const result = solver.Solve(model);

  if (!result.feasible) {
    return null;
  }

  const weights = {};
  for (const item of items) {
    weights[item] = result[`w_${item}`] || 0;
  }
  const xi = result.xi || 0;

  return { weights, xi };
}

/**
 * Solve Fuzzy BWM using LP solver, run 3 times (once per TFN component).
 * Returns crisp defuzzified weights plus the raw fuzzy weight triplets.
 */
function solveFuzzyBWM(items, bestItem, worstItem, bestToOthers, othersToWorst) {
  const componentWeights = [null, null, null];
  const componentRatingsBO = [null, null, null];
  const componentRatingsOW = [null, null, null];

  for (let c = 0; c < 3; c++) {
    // For BO: to get weight component c, use rating component (2-c) for l/u swap
    // c=0 (lower weight) → use rating component 2 (upper, tighter constraint → lower weights)
    // c=1 (modal weight) → use rating component 1 (modal)
    // c=2 (upper weight) → use rating component 0 (lower, looser constraint → higher weights)
    const boComponent = 2 - c;

    // Extract crisp ratings for this TFN component
    const crispBO = {};
    for (const item of items) {
      if (item === bestItem) continue;
      const rating = bestToOthers[item] || 1;
      const tfn = FUZZY_SCALE[rating] || [rating, rating, rating];
      crispBO[item] = tfn[boComponent];
    }

    const crispOW = {};
    for (const item of items) {
      if (item === worstItem) continue;
      const rating = othersToWorst[item] || 1;
      const tfn = FUZZY_SCALE[rating] || [rating, rating, rating];
      crispOW[item] = tfn[c];
    }

    componentRatingsBO[c] = crispBO;
    componentRatingsOW[c] = crispOW;

    const result = solveBWMLP(items, bestItem, worstItem, crispBO, crispOW);

    if (!result) {
      // Fallback: equal weights
      const w = {};
      for (const item of items) w[item] = 1 / items.length;
      componentWeights[c] = w;
    } else {
      componentWeights[c] = result.weights;
    }
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

  // Consistency ratio: ratio-form deviations from modal LP weights
  const modalW = componentWeights[1];
  const modalBO = componentRatingsBO[1];
  const modalOW = componentRatingsOW[1];
  let xi = 0;
  for (const item of items) {
    if (item !== bestItem) {
      const aBj = modalBO[item] || 1;
      if (modalW[item] > 0) {
        xi = Math.max(xi, Math.abs(modalW[bestItem] / modalW[item] - aBj));
      }
    }
    if (item !== worstItem) {
      const ajW = modalOW[item] || 1;
      if (modalW[worstItem] > 0) {
        xi = Math.max(xi, Math.abs(modalW[item] / modalW[worstItem] - ajW));
      }
    }
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

  const result = solveBWMLP(items, bestItem, worstItem, bestToOthers, othersToWorst);

  if (!result) {
    // Fallback: equal weights
    const weights = {};
    for (const item of items) weights[item] = 1 / items.length;
    return { weights, consistencyRatio: 0 };
  }

  // Ratio-form deviations from LP-optimal weights
  const { weights } = result;
  let xi = 0;
  for (const item of items) {
    if (item !== bestItem) {
      const aBj = bestToOthers[item] || 1;
      if (weights[item] > 0) {
        xi = Math.max(xi, Math.abs(weights[bestItem] / weights[item] - aBj));
      }
    }
    if (item !== worstItem) {
      const ajW = othersToWorst[item] || 1;
      if (weights[worstItem] > 0) {
        xi = Math.max(xi, Math.abs(weights[item] / weights[worstItem] - ajW));
      }
    }
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
