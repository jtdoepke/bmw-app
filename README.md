# Best·Worst — Group Prioritization Tool

A web app implementing the **Fuzzy Best-Worst Method (BWM)** for multi-criteria group decision-making. Create a session, share a link with participants, and get statistically aggregated priority rankings with fuzzy uncertainty ranges.

## How It Works

1. **Create a session** — Enter a title and list items to prioritize (3–15 items)
2. **Share the link** — Send the participation URL to your group
3. **Participants respond** — Each person completes a guided 6-step wizard:
   - Pick the most important item
   - Pick the least important item
   - Rate how the best compares to all others using a 5-point linguistic scale (Equal → Absolutely more)
   - Rate how all others compare to the worst using the same scale
4. **View results** — Aggregated priority weights with fuzzy uncertainty ranges, consistency scores, and individual breakdowns

BWM requires only **2n − 3** comparisons per person (vs n(n−1)/2 for full pairwise), making it practical even with 10+ items.

---

## Architecture

```
React frontend (Vercel) → Vercel Serverless Functions → DynamoDB
```

- **Frontend**: React + Vite, deployed to Vercel
- **API**: Vercel serverless functions in `/api`
- **Database**: AWS DynamoDB (single table design)
- **BWM Solver**: Runs client-side in the browser

---

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- An [AWS account](https://aws.amazon.com/) (free tier works fine)
- A [Vercel account](https://vercel.com/) (free tier works fine)
- [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`

---

## Step 1: Create the DynamoDB Table

1. Go to the [DynamoDB Console](https://console.aws.amazon.com/dynamodbv2/)
2. Click **Create table**
3. Configure:
   - **Table name**: `bwm-sessions`
   - **Partition key**: `PK` (String)
   - **Sort key**: `SK` (String)
4. Under **Table settings**, select **Customize settings**
5. Under **Read/write capacity settings**, select **On-demand** (simplest, and free tier covers low usage)
6. Click **Create table**

That's it for the database. No indexes needed.

---

## Step 2: Create an IAM User for the App

1. Go to the [IAM Console](https://console.aws.amazon.com/iam/)
2. Go to **Users** → **Create user**
3. Name it something like `bwm-app`
4. Click **Next**, then **Attach policies directly**
5. Click **Create policy** and paste this JSON:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/bwm-sessions"
    }
  ]
}
```

6. Name the policy `bwm-dynamodb-access` and create it
7. Back in the user creation flow, attach this policy
8. Create the user
9. Go to the user → **Security credentials** → **Create access key**
10. Choose **Application running outside AWS**
11. **Save the Access Key ID and Secret Access Key** — you'll need them in Step 4

---

## Step 3: Clone and Install

```bash
git clone <your-repo-url>
cd bwm-app
npm install
```

---

## Step 4: Deploy to Vercel

### Option A: Deploy via CLI

```bash
# Login to Vercel
vercel login

# Deploy (follow the prompts to link/create a project)
vercel

# Set environment variables
vercel env add AWS_ACCESS_KEY_ID        # paste your access key
vercel env add AWS_SECRET_ACCESS_KEY    # paste your secret key
vercel env add AWS_REGION               # e.g. us-east-2
vercel env add DYNAMODB_TABLE           # bwm-sessions

# Redeploy with the environment variables
vercel --prod
```

### Option B: Deploy via Vercel Dashboard

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub repository
4. In **Environment Variables**, add:
   - `AWS_ACCESS_KEY_ID` — your IAM user's access key
   - `AWS_SECRET_ACCESS_KEY` — your IAM user's secret key
   - `AWS_REGION` — the region your DynamoDB table is in (e.g. `us-east-2`)
   - `DYNAMODB_TABLE` — `bwm-sessions`
5. Click **Deploy**

---

## Step 5: Use It

1. Visit your Vercel URL (e.g. `https://bwm-app.vercel.app`)
2. Create a session with your items
3. Share the participant link with your group
4. View aggregated results on the results page

---

## Local Development

For local development, create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
# Edit .env with your AWS credentials
```

Then run:

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Run locally (this enables the /api serverless functions)
vercel dev
```

Note: `npm run dev` (plain Vite) will only serve the frontend — the API routes won't work without `vercel dev`.

---

## Project Structure

```
bwm-app/
├── api/                    # Vercel serverless functions
│   ├── _db.js              # Shared DynamoDB client
│   ├── create-session.js   # POST /api/create-session
│   ├── get-session.js      # GET  /api/get-session?id=xxx
│   ├── get-results.js      # GET  /api/get-results?id=xxx
│   └── submit-response.js  # POST /api/submit-response
├── src/
│   ├── lib/
│   │   └── bwm-solver.js   # BWM math (weights, consistency, aggregation)
│   ├── pages/
│   │   ├── CreateSession.jsx
│   │   ├── Participate.jsx
│   │   └── Results.jsx
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
├── index.html
├── package.json
├── vercel.json
└── vite.config.js
```

---

## DynamoDB Data Model

Single-table design with composite keys:

| PK | SK | Description |
|---|---|---|
| `SESSION#abc123` | `META` | Session metadata (title, items, createdAt) |
| `SESSION#abc123` | `RESP#xyz789` | One participant's response |

This makes it efficient to fetch a session and all its responses in a single query.

---

## About the BWM Algorithm

The **Best-Worst Method** (Rezaei, 2015) works by:

1. The participant selects the **best** (most important) and **worst** (least important) criteria
2. They rate how the best compares to each other item (Best-to-Others vector)
3. They rate how each item compares to the worst (Others-to-Worst vector)
4. An optimization model finds weights that minimize the maximum deviation from perfect consistency

This implementation uses a geometric mean approximation of the two comparison vectors, which is computationally simple and produces results very close to the full linear programming solution.

**Fuzzy BWM**: This app uses the **Fuzzy BWM** extension, where participants rate comparisons on a 5-option linguistic scale (Equal, Slightly more, Moderately more, Strongly more, Absolutely more). Each label maps to a Triangular Fuzzy Number (TFN). The solver runs the geometric mean approximation three times (once per TFN component: lower, modal, upper), then defuzzifies via Center of Gravity `(l + m + u) / 3` to produce crisp weights. Results display both defuzzified weights and fuzzy uncertainty ranges `[l%–u%]`. Legacy sessions using integer 1–9 ratings are auto-detected and solved with the original crisp method.

**Consistency Ratio**: A value from 0 to 1 where lower is better. Below 0.25 is considered highly consistent. The app labels results as Excellent (≤0.10), Good (≤0.25), Fair (≤0.40), or Poor (>0.40).

---

## References

- Rezaei, J. (2015). Best-Worst Multi-Criteria Decision-Making Method. *Omega*, 53, 49–57.
- Rezaei, J. (2016). Best-worst multi-criteria decision-making method: Some properties and a linear model. *Omega*, 64, 126–130.
- [bestworstmethod.com](https://bestworstmethod.com/) — Official BWM resource by Jafar Rezaei

---

## License

MIT
