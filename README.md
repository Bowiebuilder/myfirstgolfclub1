# MyFirstGolfClub

Community site where golfers share where they played their first round. Lightning-fast, cheap-to-run, Cloudflare-native.

## Stack
- **Frontend**: Static HTML/CSS + Leaflet map (OpenStreetMap tiles)
- **API**: Cloudflare Pages Functions (Workers)
- **Database**: Cloudflare D1 (SQLite)
- **Images**: Cloudflare R2
- **Anti-spam**: Cloudflare Turnstile

## Quick start

### 1) Prereqs
- Node 18+
- `npm i -g wrangler` or use the local devDependency
- Cloudflare account with D1 + R2 access

### 2) Install deps
```bash
npm install
```

### 3) Create D1 & R2
```bash
# Create D1 (note the returned database_id and update wrangler.toml)
wrangler d1 create mfgc-db

# Apply schema
npm run d1:apply

# Create R2 bucket (from dashboard) named: mfgc-uploads
```

### 4) Env vars (Dashboard → Pages → your project → Settings → Environment variables)
- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `ADMIN_API_KEY`
- Bindings for **D1** (`DB`) and **R2** (`BUCKET`). Also set `database_id` and `bucket_name` in `wrangler.toml`.

> In `public/index.html`, replace `REPLACE_WITH_TURNSTILE_SITE_KEY` with your site key for local testing. In production, you can also inject via a template step if desired.

### 5) Dev
```bash
npm run dev
# Wrangler will serve /public and your Functions in /functions
```

### 6) Deploy (Pages)
```bash
# Either via GitHub integration (recommended) or manual
npm run deploy
```

## API
- `POST /api/submissions` — create a submission (multipart form-data; requires Turnstile).

- `GET /api/submissions` — list approved submissions (optional `?country=...`).

Admin (temporary, simple):
- `POST /admin/moderation?id=<id>&action=approve|reject` with header `x-admin-key: <ADMIN_API_KEY>`

## Data model
See `migrations/001_init.sql`

## Notes
- Uses `crypto.randomUUID()` (native in Workers) instead of bundling a UUID lib.
- Swap Leaflet tiles for Mapbox if you want custom styling + clustering.
- Add CSV export and moderation UI when ready.