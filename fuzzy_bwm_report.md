# The Fuzzy Best-Worst Method for Multi-Criteria Decision Making

*Approaches, Linguistic Scales, and Computational Methods*

**Technical Reference Report — March 2026**

---

## Table of Contents

1. [Introduction and Motivation](#1-introduction-and-motivation)
2. [Triangular Fuzzy Numbers: Foundation](#2-triangular-fuzzy-numbers-foundation)
3. [Linguistic Scales and TFN Mappings](#3-linguistic-scales-and-tfn-mappings)
4. [The Fuzzy BWM Algorithm Step by Step](#4-the-fuzzy-bwm-algorithm-step-by-step)
5. [Calculating Fuzzy Scores: A Worked Example](#5-calculating-fuzzy-scores-a-worked-example)
6. [Elicitation Approaches](#6-elicitation-approaches)
7. [Practical Design Guidelines](#7-practical-design-guidelines)
8. [Extensions and Variants](#8-extensions-and-variants)
9. [Key References](#9-key-references)

---

## 1. Introduction and Motivation

The Best-Worst Method (BWM), introduced by Jafar Rezaei in 2015, is a pairwise comparison technique for deriving criteria weights in multi-criteria decision making (MCDM). Its key innovation is requiring only 2n−3 comparisons (where n is the number of criteria), all anchored on the identified best and worst criteria, rather than the n(n−1)/2 comparisons demanded by the Analytic Hierarchy Process (AHP).

While standard BWM uses crisp integer values from 1 to 9, real human judgments are inherently imprecise. When a decision-maker says criterion A is "about 3 times more important" than criterion B, they rarely mean exactly 3. Fuzzy BWM addresses this by replacing crisp numbers with triangular fuzzy numbers (TFNs) that capture the vagueness and uncertainty in human preference expressions.

Fuzzy BWM was pioneered by Guo and Zhao in their 2017 paper published in *Knowledge-Based Systems*. It preserves all of BWM's structural advantages — low comparison count, built-in consistency checking, and best/worst anchoring — while adding the ability to model linguistic uncertainty. The method has since been extended to intuitionistic fuzzy numbers, Z-numbers, spherical fuzzy sets, and hesitant fuzzy environments.

### 1.1 When to Use Fuzzy BWM Over Standard BWM

Fuzzy BWM is particularly appropriate in three situations. First, when decision-makers find it difficult to express precise numerical preferences and are more comfortable using verbal descriptors like "moderately more important" or "strongly more important." Second, when the decision context is inherently uncertain — such as evaluating emerging technologies, assessing environmental risks, or forecasting market conditions. Third, in group decision-making settings where different experts hold slightly different interpretations of the same comparison, and the spread of a fuzzy number naturally captures this inter-expert variation.

Standard crisp BWM remains preferable when the decision-maker has precise preferences, when computational simplicity is paramount, or when the decision context involves well-understood, measurable criteria.

---

## 2. Triangular Fuzzy Numbers: Foundation

### 2.1 Definition

A triangular fuzzy number (TFN) is defined by a triplet **(l, m, u)** where **l** is the lower bound, **m** is the modal (most likely) value, and **u** is the upper bound. The membership function μ(x) rises linearly from 0 at l to 1 at m, then falls linearly back to 0 at u. Values outside the interval [l, u] have zero membership.

Formally, the membership function is:

```
μ(x) = (x − l) / (m − l)    when l ≤ x ≤ m
μ(x) = (u − x) / (u − m)    when m < x ≤ u
μ(x) = 0                     otherwise
```

### 2.2 Arithmetic Operations

Fuzzy BWM requires arithmetic on TFNs. Given two TFNs, ã = (l₁, m₁, u₁) and b̃ = (l₂, m₂, u₂), the basic operations are:

- **Addition:** ã ⊕ b̃ = (l₁ + l₂, m₁ + m₂, u₁ + u₂)
- **Subtraction:** ã ⊖ b̃ = (l₁ − u₂, m₁ − m₂, u₁ − l₂)
- **Multiplication:** ã ⊗ b̃ ≈ (l₁ × l₂, m₁ × m₂, u₁ × u₂) for positive TFNs
- **Division:** ã ⊘ b̃ ≈ (l₁ / u₂, m₁ / m₂, u₁ / l₂) for positive TFNs
- **Scalar multiplication:** k ⊗ ã = (k × l₁, k × m₁, k × u₁) for k > 0

### 2.3 Defuzzification

After the fuzzy optimization yields fuzzy weights, each weight must be converted to a crisp value for final ranking. The most common defuzzification methods are:

- **Center of gravity (COG):** w\_crisp = (l + m + u) / 3. This is the simplest and most widely used method.
- **Graded mean:** w\_crisp = (l + 4m + u) / 6. This gives extra weight to the modal value, reflecting that the decision-maker considers m most representative.
- **Best Non-fuzzy Performance (BNP):** Equivalent to COG for symmetric triangles but can differ for asymmetric ones.

---

## 3. Linguistic Scales and TFN Mappings

The core design decision in Fuzzy BWM is choosing the linguistic scale: how many verbal categories to offer the decision-maker, and what TFN each category maps to. This section presents three standard scales — with 3, 5, and 9 options — and provides guidance on when to use each.

### 3.1 The 3-Option Scale

The 3-option scale is the simplest possible fuzzy scale. It offers only three levels: equal, moderate, and absolute importance. This scale is appropriate for rapid screening, for non-expert stakeholders who might struggle with finer distinctions, or for problems where the criteria are sufficiently diverse that most comparisons fall clearly into one of three bins.

*Table 1. Three-option linguistic scale for Fuzzy BWM.*

| Linguistic term | Crisp value | TFN (l, m, u) | Interpretation |
|---|---|---|---|
| Equally important | 1 | (1, 1, 1) | No difference at all |
| Moderately more important | 3–5 | (1, 3, 5) | Noticeably more important |
| Absolutely more important | 7–9 | (5, 9, 9) | Overwhelmingly dominant |

The key characteristic of this scale is the very wide TFN spreads. The moderate category spans from 1 to 5, a range of 4 units. This means the fuzzy weights will carry substantial uncertainty — the method is essentially saying "I know Price is more important than Style, but I can't be more precise than that." For many practical decisions, this level of precision is sufficient.

### 3.2 The 5-Option Scale

The 5-option scale is the most commonly recommended scale for general Fuzzy BWM applications. It provides enough granularity to distinguish between mild and strong preferences while remaining cognitively manageable. Research in psychometrics consistently shows that most people can reliably distinguish between 5 to 7 levels on a subjective scale.

*Table 2. Five-option linguistic scale for Fuzzy BWM.*

| Linguistic term | Crisp | TFN (l, m, u) | When to use |
|---|---|---|---|
| Equally important | 1 | (1, 1, 1) | Criteria contribute identically |
| Slightly more important | 2 | (1, 2, 3) | A marginal preference exists |
| Moderately more important | 4 | (2, 4, 6) | A clear but not overwhelming gap |
| Strongly more important | 6 | (4, 6, 8) | One criterion clearly dominates |
| Absolutely more important | 9 | (7, 9, 9) | One is essential, the other trivial |

Note that the TFN intervals in this scale are not uniformly spaced. The gap between "equally important" and "slightly more important" is narrow (a spread of 2), while the gap between "strongly more important" and "absolutely more important" is much wider (a jump from modal value 6 to 9). This non-linearity mirrors how humans perceive importance: fine distinctions at the low end, coarser ones at the high end.

### 3.3 The 9-Option Scale

The 9-option scale provides maximum granularity, corresponding one-to-one with the crisp 1–9 scale used in standard BWM and AHP. Each integer from 1 to 9 receives its own linguistic label and TFN. This scale is appropriate when the decision-maker is an expert with highly calibrated preferences, when criteria are numerous and closely spaced in importance, or when the downstream decision has high stakes requiring fine-grained weight differentiation.

*Table 3. Nine-option linguistic scale for Fuzzy BWM.*

| Linguistic term | Crisp | TFN (l, m, u) | Usage note |
|---|---|---|---|
| Equally important (EI) | 1 | (1, 1, 1) | Degenerate triangle (a point) |
| Weakly more important (WI) | 2 | (1, 2, 3) | Slight edge, could go either way |
| Fairly more important (FI) | 3 | (2, 3, 4) | Mild but discernible preference |
| Moderately more important (MI) | 4 | (3, 4, 5) | Moderate gap, clearly distinguishable |
| Strongly more important (SI) | 5 | (4, 5, 6) | Strong preference, limited overlap |
| Very strongly more important (VSI) | 6 | (5, 6, 7) | Very strong dominance |
| Demonstrably more important (DI) | 7 | (6, 7, 8) | Demonstrated by evidence or data |
| Absolutely more important (AI) | 8 | (7, 8, 9) | Near-complete dominance |
| Most different possible (MD) | 9 | (8, 9, 9) | Upper boundary, right-truncated |

Each TFN in the 9-option scale has a spread of exactly 2 (except the boundary cases). The triangle for "weakly more important" is (1, 2, 3), for "fairly more important" is (2, 3, 4), and so on. Adjacent categories overlap by exactly one unit — for instance, a value of 3 has nonzero membership in both the "weakly" and "fairly" categories. This overlap is intentional and reflects the genuine ambiguity between adjacent linguistic labels.

The boundary TFNs deserve special attention. "Equally important" is (1, 1, 1) — a degenerate triangle with zero spread, because there is no uncertainty when two criteria are judged exactly equal. At the upper end, "most different possible" is (8, 9, 9) — right-truncated because the scale cannot exceed 9. This asymmetry means the highest-importance judgments carry slightly less uncertainty than mid-range judgments, which is generally desirable.

### 3.4 Comparing the Three Scales

*Table 4. Comparison of 3-option, 5-option, and 9-option scales.*

| Property | 3-option | 5-option | 9-option |
|---|---|---|---|
| Granularity | Low | Medium | High |
| Cognitive load | Very low | Low | Moderate to high |
| TFN width (avg spread) | Wide (4.0) | Medium (2.0) | Narrow (1.0) |
| Best for | Quick screening, non-experts | General stakeholders | Expert evaluators |
| Risk of inconsistency | Very low | Low | Higher |
| Weight precision | Coarse | Balanced | Fine-grained |

### 3.5 How to Select the Right Scale

The choice of scale should be driven by three factors:

**Decision-maker expertise.** Non-experts and general stakeholders perform better with fewer options. A marketing manager choosing between website features should use 3 or 5 options. A structural engineer evaluating bridge safety criteria can handle 9.

**Number of criteria.** With 3–4 criteria, even a 3-option scale gives adequate discrimination. With 8+ criteria, the 5- or 9-option scale helps differentiate closely ranked criteria.

**Consequence severity.** High-stakes decisions (medical device design, nuclear safety assessment) warrant the precision of 9 options. Low-stakes prioritization (feature backlog ranking, personal purchase decisions) can use 3 or 5.

---

## 4. The Fuzzy BWM Algorithm Step by Step

The Fuzzy BWM procedure follows the same five-step structure as standard BWM, with fuzzy numbers replacing crisp integers.

### 4.1 Step 1: Determine the Set of Criteria

Identify the n decision criteria {c₁, c₂, …, cₙ}. This step is identical to standard BWM and typically involves literature review, expert interviews, or stakeholder workshops.

### 4.2 Step 2: Identify the Best and Worst Criteria

The decision-maker qualitatively selects the single most important criterion (B) and the single least important criterion (W). No numerical judgment is made at this stage. This anchoring step is crucial: it establishes the cognitive reference frame for all subsequent comparisons.

### 4.3 Step 3: Construct the Fuzzy Best-to-Others Vector

Using the chosen linguistic scale, the decision-maker states how much more important the best criterion is compared to each other criterion. This produces the fuzzy BO vector:

```
Ã_B = (ã_{B1}, ã_{B2}, …, ã_{Bn})
```

where each ã\_{Bj} is a TFN. By definition, ã\_{BB} = (1, 1, 1) since the best criterion compared to itself is "equally important." The comparison ã\_{BW} should be the largest TFN in the vector, since B is the most important and W is the least.

For example, if Price is the best criterion and we use a 5-option scale, a decision-maker might produce:

- Price vs Quality = "slightly more important" → (1, 2, 3)
- Price vs Comfort = "moderately more important" → (2, 4, 6)
- Price vs Safety = "slightly more important" → (1, 2, 3)
- Price vs Style = "strongly more important" → (4, 6, 8)

### 4.4 Step 4: Construct the Fuzzy Others-to-Worst Vector

The decision-maker states how much more important each criterion is compared to the worst criterion. This produces the fuzzy OW vector:

```
Ã_W = (ã_{1W}, ã_{2W}, …, ã_{nW})ᵀ
```

where ã\_{WW} = (1, 1, 1) and ã\_{BW} should again be the largest. Continuing the example:

- Quality vs Style = "moderately more important" → (2, 4, 6)
- Comfort vs Style = "slightly more important" → (1, 2, 3)
- Safety vs Style = "strongly more important" → (4, 6, 8)
- Price vs Style = "strongly more important" → (4, 6, 8)

### 4.5 Step 5: Solve the Fuzzy Optimization Model

The optimal fuzzy weights are found by minimizing the maximum deviation between ideal and stated fuzzy ratios. The model is:

```
min  ξ̃

s.t.  |w̃_B / w̃_j  −  ã_{Bj}|  ≤  ξ̃,     for all j
      |w̃_j / w̃_W  −  ã_{jW}|  ≤  ξ̃,     for all j
      Σ_j  w̃_j  =  1
      w̃_j  ≥  0,     for all j
```

Here, all weights w̃\_j and the objective ξ̃ are themselves TFNs. The division and comparison of TFNs follows the arithmetic rules described in Section 2.2.

In practice, Guo and Zhao (2017) reformulated this into a crisp nonlinear program by operating on the l, m, and u components separately. The model decomposes into three sub-problems — one minimizing the lower-bound deviations, one for the modal values, and one for the upper bounds — that can be solved independently or jointly using standard nonlinear programming solvers.

### 4.6 Step 6: Defuzzify and Rank

After obtaining the fuzzy weight vector (w̃₁\*, w̃₂\*, …, w̃ₙ\*), apply defuzzification (typically COG or graded mean) to convert each fuzzy weight into a crisp value. The criteria are then ranked by their crisp weights. The fuzzy consistency ratio is computed as CR̃ = ξ̃\* / CI, where CI is the consistency index from the standard BWM table.

---

## 5. Calculating Fuzzy Scores: A Worked Example

Consider a decision problem with four criteria — Quality (Q), Price (P), Delivery (D), and Service (S) — using a 5-option scale. Suppose Price is identified as the best criterion and Service as the worst.

### 5.1 Input Vectors

**Fuzzy BO vector (Price compared to others):**

- Price vs Quality: "Slightly more important" = (1, 2, 3)
- Price vs Price: "Equally important" = (1, 1, 1)
- Price vs Delivery: "Moderately more important" = (2, 4, 6)
- Price vs Service: "Strongly more important" = (4, 6, 8)

**Fuzzy OW vector (Others compared to Service):**

- Quality vs Service: "Moderately more important" = (2, 4, 6)
- Price vs Service: "Strongly more important" = (4, 6, 8)
- Delivery vs Service: "Slightly more important" = (1, 2, 3)
- Service vs Service: "Equally important" = (1, 1, 1)

### 5.2 Decomposed Sub-Problems

The fuzzy optimization decomposes into three crisp sub-problems by separating the l, m, and u components. For the modal (m) component, the problem becomes:

```
min  ξ_m

s.t.  |w_P^m / w_Q^m − 2|  ≤  ξ_m
      |w_P^m / w_D^m − 4|  ≤  ξ_m
      |w_P^m / w_S^m − 6|  ≤  ξ_m
      |w_Q^m / w_S^m − 4|  ≤  ξ_m
      |w_D^m / w_S^m − 2|  ≤  ξ_m
      w_P^m + w_Q^m + w_D^m + w_S^m = 1
      w_j^m ≥ 0  for all j
```

Analogous sub-problems are constructed for the lower-bound (l) and upper-bound (u) components, using the l and u values from each TFN comparison.

### 5.3 Solution and Defuzzification

Solving the three sub-problems (using any nonlinear programming solver such as Excel Solver, MATLAB fmincon, or Python SciPy) yields the fuzzy weights:

```
w̃_P* = (0.34, 0.42, 0.50)
w̃_Q* = (0.18, 0.25, 0.34)
w̃_D* = (0.10, 0.14, 0.22)
w̃_S* = (0.05, 0.07, 0.12)
```

Note that these are illustrative values. Applying COG defuzzification:

```
w_P = (0.34 + 0.42 + 0.50) / 3 = 0.420
w_Q = (0.18 + 0.25 + 0.34) / 3 = 0.257
w_D = (0.10 + 0.14 + 0.22) / 3 = 0.153
w_S = (0.05 + 0.07 + 0.12) / 3 = 0.080
```

After normalization so the crisp weights sum to 1, the final ranking is:

> **Price (0.46) > Quality (0.28) > Delivery (0.17) > Service (0.09)**

### 5.4 Consistency Check

The fuzzy consistency indicator ξ̃\* is obtained from the optimization. Its modal value ξ\_m\* is divided by the Consistency Index (CI) from the standard BWM table:

*Table 5. Consistency Index values for standard BWM (Rezaei, 2015).*

| a\_BW | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| **CI** | 0.00 | 0.44 | 1.00 | 1.63 | 2.30 | 3.00 | 3.73 | 4.47 |

In this example, the modal best-to-worst comparison is 6, giving CI = 3.00. If the modal optimal deviation is ξ\_m\* = 0.18, then CR = 0.18 / 3.00 = 0.06. A consistency ratio below 0.10 is generally considered acceptable, so this result indicates highly consistent judgments.

---

## 6. Elicitation Approaches

How the fuzzy comparisons are collected from decision-makers is as important as the mathematical formulation. There are three established elicitation approaches, each with different tradeoffs between ease of use and expressiveness.

### 6.1 Approach 1: Fixed Linguistic Dropdown

This is the most common approach, used in the majority of published Fuzzy BWM studies. The decision-maker is presented with a question such as "Compared to Comfort, how much more important is Price?" and selects from a fixed list of verbal labels (e.g., "slightly more important," "moderately more important"). The software maps each label to its predetermined TFN automatically. The decision-maker never sees the triplet.

This approach has the lowest cognitive burden. It feels identical to filling out a standard survey. The limitation is that the uncertainty spread is fixed per category — two decision-makers who both select "moderately more important" are assigned the same TFN, even if one is very confident and the other is unsure.

### 6.2 Approach 2: Linguistic with Confidence Qualifier

Some implementations add a second question for each comparison: "How confident are you in this judgment?" with options like "very confident," "somewhat confident," or "uncertain." The confidence level modifies the TFN spread. A high-confidence answer narrows the triangle (e.g., "moderately more important" with high confidence might map to (3.5, 4, 4.5) instead of (3, 4, 5)), while low confidence widens it (perhaps (2, 4, 6)).

This approach captures individual-level uncertainty that a fixed scale cannot. It requires twice as many inputs (one linguistic label plus one confidence rating per comparison), but the additional information significantly improves the fidelity of the fuzzy model.

### 6.3 Approach 3: Direct Triplet Elicitation

The decision-maker is explicitly asked: "What is the minimum, most likely, and maximum importance ratio of Price over Comfort?" They provide three numbers directly — for example, "at least 2, probably 4, at most 7." This produces an asymmetric TFN that precisely reflects the decision-maker's mental model.

This is the most expressive approach but also the most demanding. It requires the decision-maker to understand the concept of a fuzzy number and to introspect on their uncertainty range. It is typically used only with expert evaluators in technical domains such as engineering risk assessment or financial portfolio optimization.

---

## 7. Practical Design Guidelines

### 7.1 Designing the Questionnaire

A well-designed Fuzzy BWM questionnaire should:

1. Present the best and worst criteria prominently at the top of each page so the decision-maker maintains context.
2. Separate Best-to-Others questions from Others-to-Worst questions into two clearly labeled sections.
3. Use natural language phrasing like "How much more important is [Best] than [Other]?" rather than technical notation.
4. Show the selected option highlighted but display the TFN only in a secondary position (or hide it entirely for non-technical participants).
5. Include a progress indicator showing how many comparisons remain.

### 7.2 Common Pitfalls

**Inconsistent boundary judgments.** The comparison of Best vs Worst should be the largest TFN in both vectors. If the decision-maker assigns "strongly more important" to B vs W but "absolutely more important" to some other comparison, the vectors are internally inconsistent. Good questionnaire design validates this constraint in real time.

**Scale mismatch with expertise.** Using a 9-option scale with non-expert evaluators introduces noise, as respondents cannot reliably distinguish between 9 levels. Conversely, using a 3-option scale with experts wastes their discriminative ability. Match the scale to the evaluator.

**Ignoring defuzzification sensitivity.** Different defuzzification methods can produce different rankings, especially when fuzzy weights overlap substantially. Always check whether the ranking changes between COG and graded mean. If it does, report both and flag the sensitivity.

### 7.3 Software Tools

Several tools support Fuzzy BWM computation. The BWM Solver spreadsheet (available at bestworstmethod.com) handles the standard crisp model. For the fuzzy version, researchers commonly use MATLAB with the Fuzzy Logic Toolbox, Python with SciPy's optimize module, or LINGO for the nonlinear programming formulation. Guo and Zhao's original paper includes the complete mathematical formulation suitable for implementation in any optimization package.

---

## 8. Extensions and Variants

The Fuzzy BWM framework has been extended in several important directions:

**Intuitionistic Fuzzy BWM** (Mou, Xu, and Liao, 2016) replaces TFNs with intuitionistic fuzzy numbers that explicitly model both membership and non-membership degrees, adding a "hesitation" component for cases where the decision-maker is genuinely undecided rather than imprecise.

**Spherical Fuzzy BWM** extends the intuitionistic framework to three-dimensional spherical fuzzy sets, where membership, non-membership, and hesitancy are independent parameters on the surface of a unit sphere. This provides even richer expressiveness for highly uncertain judgments.

**Z-number BWM** (Aboutorab et al., 2018) augments each fuzzy comparison with a reliability measure, capturing not just what the decision-maker thinks but how reliable that thinking is.

**Hesitant Fuzzy BWM** (Liao et al., 2019) allows the decision-maker to provide multiple possible TFNs for a single comparison, reflecting genuine indecision between two or more plausible judgments.

**Interval Type-2 Fuzzy BWM** uses type-2 fuzzy sets where the membership function itself is fuzzy (a "fuzzy fuzzy number"), providing a second layer of uncertainty modeling.

---

## 9. Key References

- Rezaei, J. (2015). Best-worst multi-criteria decision-making method. *Omega*, 53, 49–57.
- Rezaei, J. (2016). Best-worst multi-criteria decision-making method: Some properties and a linear model. *Omega*, 64, 126–130.
- Guo, S., & Zhao, H. (2017). Fuzzy best-worst multi-criteria decision-making method and its applications. *Knowledge-Based Systems*, 121, 23–31.
- Mou, Q., Xu, Z., & Liao, H. (2016). An intuitionistic fuzzy multiplicative best-worst method for multi-criteria group decision making. *Information Sciences*, 374, 224–239.
- Aboutorab, H., et al. (2018). ZBWM: The Z-number extension of BWM. *Expert Systems with Applications*, 111, 293–302.
- Liao, H., et al. (2019). A hesitant fuzzy linguistic BWM approach. *International Journal of Computational Intelligence Systems*, 12(2), 1603–1614.
- Mohammadi, M., & Rezaei, J. (2020). Bayesian best-worst method: A probabilistic group decision making model. *Omega*, 96, 102075.
- Liang, F., Brunelli, M., & Rezaei, J. (2020). Consistency issues in the best worst method: Measurements and thresholds. *Omega*, 96, 102175.
