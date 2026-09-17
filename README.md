# CommitTraders

Digitalizes the CFTC Commitment of Traders report so retail and day traders can track market positioning and use it as part of their forecasting process.

## How it works

The app has two jobs:

**Weekly ingestion** — every Friday at 8pm ET, fetches the CFTC Legacy Futures-Only report, parses each instrument section, computes derived fields, and upserts the results into PostgreSQL. Saturday and Monday runs catch reports delayed by federal holidays. Re-running is always safe — rows are upserted, never duplicated.

**API** — exposes the stored data so clients can query the latest snapshot per instrument or page through historical weekly data.

The derived fields computed on each row:
- `noncommercial_net` / `commercial_net` = long − short
- `*_net_pct_oi` = net ÷ open interest × 100
- `change_*_net` = change in long − change in short

## Prerequisites

- Node.js v18+
- PostgreSQL v14+ (or a Supabase project)

## Local Setup

```bash
# Install dependencies
npm install

# Create the local database
createdb commit_traders

# Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL to your local or Supabase connection string

# Run migrations
npm run db:migrate

# Seed with the latest CFTC data
npm run cftc:ingest

# Start the dev server
npm run dev
```

App runs at `http://localhost:3000`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev mode with TypeScript watch and auto-restart |
| `npm start` | Build and start in production mode |
| `npm run build:ts` | Compile TypeScript to `dist/` |
| `npm run test` | Run test suite with coverage |
| `npm run db:migrate` | Create tables and indexes if they don't exist |
| `npm run cftc:ingest` | Manually trigger a CFTC ingestion run |

## API

| Method | Path | Description |
|---|---|---|
| GET | `/api/cot-reports` | Latest week per instrument |
| GET | `/api/cot-reports/:contractCode` | Weekly history for a contract |

The history endpoint accepts optional query params:
- `limit` — number of weeks to return (default 52, max 260)
- `before` — `YYYY-MM-DD` cursor for paging to older data

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for deploying on Supabase + Render using the free tier.
