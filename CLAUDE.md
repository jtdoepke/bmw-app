# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Fuzzy Best-Worst Method (BWM) group prioritization web app. Users create sessions with items to rank, share a link, participants complete a comparison wizard using linguistic labels, and results show aggregated priority weights with fuzzy uncertainty ranges and consistency scores.

## Architecture

```
React frontend (Vite) → Vercel Serverless Functions → DynamoDB
```

- **Frontend**: React 18 + React Router v6 + Vite, no TypeScript
- **API**: Vercel serverless functions in `api/` (ES module default exports), share a DynamoDB client via `api/_db.js`
- **Database**: DynamoDB single-table design — partition key `PK`, sort key `SK`. Sessions stored as `SESSION#<id> / META`, responses as `SESSION#<id> / RESP#<id>`
- **BWM Solver**: Runs client-side in the browser (`src/lib/bwm-solver.js`), not on the server

## Development

```bash
# Local dev (MUST use vercel dev, not npm run dev, to get API routes)
vercel dev

# Build
npm run build
```

Requires a `.env` file with `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, and `DYNAMODB_TABLE` (see `.env.example`).

## Routes

| Path | Page | Purpose |
|------|------|---------|
| `/` | CreateSession | Create a new session with items |
| `/s/:sessionId` | Participate | 6-step wizard for participants |
| `/s/:sessionId/results` | Results | Aggregated weights and individual breakdowns |

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/create-session` | POST | Create a session (title + items) |
| `/api/get-session?id=` | GET | Fetch session metadata |
| `/api/submit-response` | POST | Submit a participant's BWM comparisons |
| `/api/get-results?id=` | GET | Fetch all responses for a session |

## BWM Solver

The solver (`src/lib/bwm-solver.js`) supports two modes, auto-detected from input values:

**Fuzzy BWM** (current default): Uses a 5-option linguistic scale mapped to Triangular Fuzzy Numbers (TFNs). Valid rating values are `{1, 2, 4, 6, 9}`, stored as integers in DynamoDB. The solver runs a geometric mean approximation 3 times (once per TFN component: lower, modal, upper), defuzzifies via Center of Gravity `(l + m + u) / 3`, then normalizes. Returns both crisp weights and fuzzy weight triplets `[l, m, u]` per item.

| Linguistic label | Stored value | TFN (l, m, u) |
|---|---|---|
| Equal | 1 | (1, 1, 1) |
| Slightly more | 2 | (1, 2, 3) |
| Moderately more | 4 | (2, 4, 6) |
| Strongly more | 6 | (4, 6, 8) |
| Absolutely more | 9 | (7, 9, 9) |

**Crisp BWM** (legacy): Accepts any integer 1-9. Used automatically for old sessions with ratings outside `{1, 2, 4, 6, 9}`.

Exported functions: `solveBWM`, `aggregateWeights`, `aggregateFuzzyWeights`, `weightsToPriorities`.

Consistency ratio thresholds: Excellent ≤0.10, Good ≤0.25, Fair ≤0.40, Poor >0.40.

## Deployment

- Hosted on Vercel: https://bwm-app.vercel.app
- DynamoDB table: `jdoepke-bwm-sessions` in `us-east-2` (Mintel dev account, `089720790877`)
- IAM user: `jdoepke-best-worst-method-table-access` (scoped to the table)
- Deploy: `vercel --prod`

## Key Details

- No linter, formatter, or test framework is configured
- No TypeScript — all files are `.jsx` / `.js`
- `vercel.json` rewrites all non-API routes to `index.html` for client-side routing
- API validation in `api/submit-response.js` enforces ratings are in `{1, 2, 4, 6, 9}`
- The `Participate` page uses a `LinguisticScale` component (5 pill buttons) for comparisons
- Results page shows fuzzy uncertainty ranges `[l%–u%]` alongside defuzzified weights, with a lighter bar extension visualizing the spread
