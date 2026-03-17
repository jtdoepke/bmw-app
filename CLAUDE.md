# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Best-Worst Method (BWM) group prioritization web app. Users create sessions with items to rank, share a link, participants complete a comparison wizard, and results show aggregated priority weights with consistency scores.

## Architecture

```
React frontend (Vite) → Vercel Serverless Functions → DynamoDB
```

- **Frontend**: React 18 + React Router v6 + Vite, no TypeScript
- **API**: Vercel serverless functions in `api/` (CommonJS-style default exports), share a DynamoDB client via `api/_db.js`
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

## Key Details

- No linter, formatter, or test framework is configured
- No TypeScript — all files are `.jsx` / `.js`
- `vercel.json` rewrites all non-API routes to `index.html` for client-side routing
- The BWM solver uses a geometric mean approximation (not full linear programming) — consistency ratio thresholds: Excellent ≤0.10, Good ≤0.25, Fair ≤0.40, Poor >0.40
