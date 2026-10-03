# Deployment Guide for CommitTraders

This guide outlines how to deploy **CommitTraders** using 100% **free-tier cloud services**:
- **Database**: Supabase (Free Managed PostgreSQL)
- **Compute / API Service**: Render or Koyeb (Free Container Web Service)
- **Automated Ingestion**: A Render Cron Job (see section 4)

---

## 1. Database Setup: Supabase (Free Tier)

Supabase offers a free managed PostgreSQL database with 500MB storage and direct SSL support.

### Steps:
1. Sign up/log in at [supabase.com](https://supabase.com).
2. Create a new project (e.g., `committraders-db`). Choose a strong database password and select a region close to your compute location.
3. Once created, navigate to **Project Settings** -> **Database**.
4. Locate the **Connection string** section:
   - For direct migration and connection, copy the **URI** format connection string:
     ```
     postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?sslmode=require
     ```
   - If using Supabase Connection Pooling (Transaction Mode on port 6543):
     ```
     postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
     ```

---

## 2. Compute Setup: Render (Free Tier) or Koyeb

You can deploy the app using the included `Dockerfile` on Render or Koyeb.

### Deploying on Render:
1. Push your repository to GitHub or GitLab.
2. Sign up/log in at [render.com](https://render.com).
3. Click **New +** -> **Web Service**.
4. Connect your repository.
5. Configure the service settings:
   - **Name**: `committraders-api`
   - **Environment**: `Docker`
   - **Region**: Choose same region as Supabase DB.
   - **Instance Type**: `Free`
6. Add **Environment Variables**:
   - `DATABASE_URL`: `postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?sslmode=require`
   - `PORT`: `3000`
   - `HOST`: `0.0.0.0`
   - `NODE_ENV`: `production`
7. Click **Create Web Service**.

---

## 3. Database Migration & Initial Ingestion

Once your compute environment and database are connected:

### Option A: From your local environment (Easiest)
Set `DATABASE_URL` in your local `.env` pointing to your Supabase instance, then run:

```bash
# Run migrations
npm run db:migrate

# Seed initial CFTC historical report data
npm run cftc:ingest
```

### Option B: Via Render Shell or One-Off Job
In Render Dashboard:
1. Go to your Web Service -> **Shell**.
2. Run:
   ```bash
   npx ts-node src/db/migrate.ts
   npx ts-node src/jobs/ingest-cftc.ts
   ```

---

## 4. Weekly CFTC Report Ingestion

Ingestion is run by a **Render Cron Job**, a separate service from the web app, so it fires on schedule even while the free web service is asleep. The web app itself does not schedule anything.

Create it in Render (**New +** -> **Cron Job**), pointing at the same repository, with:
- **Build Command**: `npm install && npm run build:ts`
- **Command**: `node dist/jobs/ingest-cftc.js`
- **Schedule**: `0 21 * * 1,5,6` (21:00 UTC on Friday, Saturday and Monday). The CFTC publishes Friday at 3:30pm ET; the Saturday and Monday runs catch holiday-delayed releases.
- **Environment**: the same `DATABASE_URL` as the web service.

Each run fetches the latest week of the Legacy report (metals) and the TFF report (financials) and upserts rows for every instrument in the `instruments` table. Re-running is always safe: rows are upserted, never duplicated. To run it by hand, use `npm run cftc:ingest`, or trigger a run from the cron job's page in Render and read its logs.

> **Free-tier cold starts**: separately from ingestion, a sleeping Render web service takes about a minute to answer, which hurts page speed and crawling. If that matters, point an external ping service (e.g. [cron-job.org](https://cron-job.org) or UptimeRobot) at `https://your-app.onrender.com/api/cot-reports` every 10 minutes, or move to a paid instance.

---

## 5. SEO

The app is a client-rendered SPA, so the server fills in per-page `<head>` tags and a crawlable HTML snapshot (`src/services/seo.service.ts`). It also serves `/robots.txt` and `/sitemap.xml`.

- **Canonical URLs / sitemap origin**: taken from `SITE_URL`, else Render's automatic `RENDER_EXTERNAL_URL`. Once a custom domain is attached, set `SITE_URL` to it (e.g. `https://www.example.com`), otherwise canonicals keep pointing at the `*.onrender.com` address.
- **After deploying**: add the site in [Google Search Console](https://search.google.com/search-console), submit `/sitemap.xml`, and use URL Inspection on `/` and one instrument page to confirm the rendered HTML looks right.
- **Free-tier cold starts**: a sleeping Render instance takes ~a minute to answer, which hurts crawling and page speed. Keep it awake with a ping (see section 4) or move to a paid instance.

---

## 6. Adding Financials to an existing deployment

The Financials (TFF) markets ship switched off. Roll them out in this order — the migration is additive, but it does write to the production database, so run it deliberately:

1. `npm run db:migrate` — adds the `instruments` registry and the format-neutral `primary_*` columns (backfilled from the existing Non-Commercial columns; nothing is dropped or rewritten). **Run it before deploying the new code**, which reads those columns.
2. Deploy the new code.
3. `npm run instruments:sync-tff` — registers every other contract in the TFF report (about 90: currencies, rates, equity indexes, crypto) as inactive and not featured. Add `-- --dry-run` first to see what it would add.
4. `npm run cftc:backfill` — loads TFF history from 2025 to present for everything registered.
5. Check the data, then turn markets on: `npm run instruments:activate -- 099741 097741 043602 13874A 1170E1` for the five featured ones (EUR/USD, Japanese Yen, 10-Year T-Note, S&P 500 E-mini, VIX), or `npm run instruments:activate-all` for every registered market that has data. It goes one at a time and refuses any contract with no stored data.

Only the five are `featured`, so the app shows just those on first load; the rest appear through "Load more" and search. To change what's featured, edit the `featured` column in `instruments`. Contracts that CFTC only started reporting recently (some crypto) will have fewer weeks than 2025-to-now; that's expected.

The weekly Render Cron Job (`node dist/jobs/ingest-cftc.js`) needs no change — it now ingests both reports.

---

## Summary Checklist

- [ ] Supabase PostgreSQL database created.
- [ ] Environment variable `DATABASE_URL` configured with `?sslmode=require`.
- [ ] Container deployed on Render/Koyeb.
- [ ] Database migration executed (`npm run db:migrate`).
- [ ] Initial CFTC ingestion executed (`npm run cftc:ingest`).
