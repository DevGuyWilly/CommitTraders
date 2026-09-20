# CommitTraders

Digitalizes the CFTC Commitment of Traders report so retail and day traders can track market positioning and use it as part of their forecasting process.

## How it works

The app has two jobs:

**Weekly ingestion** — every Friday at 8pm ET, fetches the CFTC reports (Legacy for metals, Traders in Financial Futures for financials), parses them, computes derived fields, and upserts the results into PostgreSQL. Saturday and Monday runs catch reports delayed by federal holidays. Re-running is always safe — rows are upserted, never duplicated.

**Instrument registry** — the `instruments` table decides which markets are tracked and shown (contract code, display name, exchange, category, report format, and the report's speculator-equivalent trader group). Ingestion only stores registered contracts, and the API lists only instruments that are `active` **and** have data. Adding a market is a new row plus ingestion — no code change. `featured` instruments are what the app shows on first load; the rest sit behind "Load more" and search, so a category can hold a hundred markets without burying the main ones. Each report format maps its speculator-equivalent group (Non-Commercial for Legacy, Leveraged Funds for TFF) into the same `primary_*` columns, so everything downstream is format-agnostic.

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
| `npm run db:migrate` | Create/upgrade tables and seed the instrument registry (additive and idempotent) |
| `npm run cftc:ingest` | Manually trigger a CFTC ingestion run (latest week, all report formats) |
| `npm run cftc:backfill [-- --from 2025]` | Load TFF history from a year to present (default 2025); safe to re-run |
| `npm run instruments:sync-tff [-- --dry-run]` | Register every contract in the current TFF report that isn't in the registry yet (inactive, not featured) |
| `npm run instruments:activate -- <code> ...` | Turn instruments on for the API, one at a time; refuses if no data is stored. `-- --all` activates every inactive instrument that has data |
| `npm run test` (in `frontend/`) | Frontend unit tests (search matching); needs Node 22.6+ |

## API

| Method | Path | Description |
|---|---|---|
| GET | `/api/cot-reports` | Latest week per active instrument, with its category and report format |
| GET | `/api/cot-reports/:contractCode` | Weekly history for a contract (long/short/net of its primary trader group) |

Each entry of the list endpoint carries `contractCode`, `displayName`, `exchange`, `category` / `categoryLabel`, `reportFormat` / `reportFormatLabel`, `primaryCategoryLabel`, `featured`, `asOfDate`, `long`, `short`, `net` and `netPctOi` (plus the raw CFTC name as `instrument`). Categories come back in display order: metals, financials, energy, agriculture.

The history endpoint accepts optional query params:
- `limit` — number of weeks to return (default 52, max 260)
- `before` — `YYYY-MM-DD` cursor for paging to older data

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for deploying on Supabase + Render using the free tier.
