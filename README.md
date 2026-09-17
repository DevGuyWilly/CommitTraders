# About CommitTraders
Digitalize Commitment of Traders Report to provide Retail/Day Traders with
another tool in making informed decisions on Market forecast

## `Fastify Two Responsibility`
1. Serve API
2. Once a week, fetch the CFTC report, parse it, compute the derived fields and insert it into PostgreSQL

## `The Flow`

1. Cron Fires
2. Download HTML
3. Parse `<pre>` block
4. Create typed object
5. Compute derived fields
6. Insert into PostgresSQL

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [PostgreSQL](https://www.postgresql.org/) (v14+)

---

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create the database

Make sure PostgreSQL is running, then create the database:

```bash
createdb commit_traders
```

### 3. Configure environment variables

Copy the example env file and update the values:

```bash
cp .env.example .env
```

Edit `.env` with your local connection string:

```
DATABASE_URL=postgres://<your-username>@localhost:5432/commit_traders
```

### 4. Run database migrations

Creates the `cot_reports` table and indexes:

```bash
npm run db:migrate
```

### 5. (Optional) Ingest CFTC data

Manually fetch and populate the database with the latest CFTC report:

```bash
npm run cftc:ingest
```

### 6. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Available Scripts

### `npm run dev`
Starts the app in development mode with TypeScript watch and auto-restart.

### `npm start`
Builds TypeScript and starts the app in production mode.

### `npm run build:ts`
Compiles TypeScript to `dist/`.

### `npm run test`
Runs the test suite with coverage.

### `npm run db:migrate`
Runs PostgreSQL migrations (creates tables and indexes if they don't exist).

### `npm run cftc:ingest`
Manually triggers CFTC report ingestion into the database.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/cot-reports` | List latest COT reports by instrument |
| GET | `/api/cot-reports/:contractCode` | Get history for a specific contract |

---

## Deployment

For deploying CommitTraders using a 100% free-tier stack (Supabase PostgreSQL + Render/Koyeb Container Service), see the detailed [Deployment Guide](DEPLOYMENT.md).
