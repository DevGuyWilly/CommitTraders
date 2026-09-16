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

## Available Scripts

In the project directory, you can run:

### `npm run dev`

### `npm start`

For production mode

### `npm run test`

Run the test cases.

### `npm run db:migrate`

Run PostgreSQL migrations.

### `npm run cftc:ingest`

Manually trigger CFTC report ingestion into the database.

## Deployment

For deploying CommitTraders using a 100% free-tier stack (Supabase PostgreSQL + Render/Koyeb Container Service), see the detailed [Deployment Guide](DEPLOYMENT.md).
