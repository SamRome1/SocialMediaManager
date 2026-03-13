# Social Media Manager

AI-powered social media management — scrape posts, audit performance, explore trends, and simulate content ideas. Built with Next.js, Supabase, Claude (claude-sonnet-4-6), and Apify.

---

## Features

| Page | What it does |
|------|-------------|
| `/dashboard` | Overview metrics, recent posts, recent audits |
| `/audit` | Scrape posts via Apify, trigger Claude AI audit, view scores |
| `/trends` | Streaming chat with Claude about platform trends |
| `/simulator` | Generate and score content ideas per platform/format/topic |
| `/settings` | Brand config, platform toggles, handles, Apify token |

Daily cron at 09:00 UTC auto-scrapes all active platforms via Vercel Cron.

---

## Prerequisites

- Node.js >= 20.9
- A [Supabase](https://supabase.com) project
- An [Anthropic API key](https://console.anthropic.com)
- An [Apify](https://apify.com) account + API token

---

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd SocialMediaManager
npm install
```

### 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in all values:

```bash
cp .env.local.example .env.local
```

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (server-side only) |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `APIFY_API_TOKEN` | Apify API token (can also be stored in settings table) |
| `CRON_SECRET` | Random secret to authenticate the cron endpoint |

### 3. Run the Supabase migration

In your Supabase project, open the **SQL Editor** and run the contents of:

```
supabase/migrations/001_initial.sql
```

This creates the four tables (`posts`, `audits`, `simulations`, `settings`) with RLS policies.

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to `/dashboard`.

### 5. Configure your brand

Go to `/settings`, enter your brand name, niche, tone, select active platforms, enter their handles, and save your Apify token.

---

## Project Structure

```
app/
  dashboard/page.tsx       — metrics overview (server component)
  audit/page.tsx           — scrape + AI audit (client component)
  trends/page.tsx          — streaming Claude chat (client component)
  simulator/page.tsx       — content idea generator (client component)
  settings/page.tsx        — brand config (client component)
  api/
    scrape/route.ts        — POST: trigger Apify scrape
    audit/route.ts         — POST: run Claude audit, save result
    trends/route.ts        — POST: streaming Claude chat
    simulate/route.ts      — POST: generate content ideas
    cron/route.ts          — GET: daily cron (auth-gated)
    posts/route.ts         — GET: list posts
    audits/route.ts        — GET: list audits
    simulations/route.ts   — GET: list simulations
    simulations/[id]/route.ts — PATCH: update published status
    settings/route.ts      — GET/POST: read/write settings

lib/
  supabase.ts              — supabase + supabaseAdmin clients
  anthropic.ts             — runAudit, runSimulation, streamTrendsChat
  apify.ts                 — scrapeAndStore() with per-platform normalization

components/
  PostCard.tsx
  AuditResult.tsx
  SimulationCard.tsx
  PlatformBadge.tsx
  MetricCard.tsx

types/
  index.ts                 — Post, Audit, Simulation, Settings interfaces

supabase/
  migrations/
    001_initial.sql        — full schema + RLS policies
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Import into Vercel
3. Add all environment variables in the Vercel dashboard
4. Set `CRON_SECRET` in Vercel env vars — the daily cron at `vercel.json` will hit `/api/cron` with `Authorization: Bearer <CRON_SECRET>`
5. Deploy

The `vercel.json` cron runs daily at 09:00 UTC and scrapes all active platforms configured in Settings.

---

## Apify Actor Map

| Platform | Actor ID |
|----------|----------|
| Instagram | `apify/instagram-scraper` |
| TikTok | `clockworks/tiktok-scraper` |
| Twitter/X | `quacker/twitter-scraper` |
| LinkedIn | `curious_coder/linkedin-post-search` |
| YouTube | `streamers/youtube-scraper` |
