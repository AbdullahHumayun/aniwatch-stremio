# AniWatch Stremio Addon

Stream anime from **AniWatch.tv (HiAnime)** directly inside Stremio — HD quality, sub & dub, with subtitle support.

---

## Install (one click)

Once deployed, paste your URL into **Stremio → Add-ons → Community add-ons → paste URL**:

```
https://YOUR-APP-NAME.onrender.com/manifest.json
```

Or use the `stremio://` deep-link to install directly:

```
stremio://YOUR-APP-NAME.onrender.com/manifest.json
```

---

## Deploy for free

The addon uses [`got-scraping`](https://github.com/apify/got-scraping) to mimic browser
TLS fingerprints, keeping RAM usage at **~80–120 MB** — well within every free tier below.

> **Note**: if HiAnime is blocking the server's IP range (not just TLS fingerprints), streams
> may still fail from cloud hosts. In that case, **Option 5 (local + tunnel)** always works
> because your home IP is residential.

### Option 1 — Render.com (free tier, recommended)

1. Fork this repo to your GitHub account
2. Go to [render.com](https://render.com) → sign up (free)
3. **New → Web Service** → connect your fork
4. Render auto-detects `render.yaml` → click **Deploy**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/abdullahhumayun/aniwatch-stremio)

### Option 2 — Koyeb (free tier, 512 MB)

1. Fork this repo
2. Go to [koyeb.com](https://www.koyeb.com) → **Create App → GitHub**
3. Select your fork — Koyeb auto-detects Node.js
4. Deploy → get a `*.koyeb.app` URL

### Option 3 — Fly.io (free tier, 256 MB)

```bash
# Install flyctl, then:
fly launch   # detects Node.js automatically
fly deploy
```

### Option 4 — Oracle Cloud Always Free (1 GB RAM)

1. Sign up at [cloud.oracle.com](https://cloud.oracle.com) (free forever, no credit card required for Always Free)
2. Create an ARM VM (Ampere) — 1 GB RAM free
3. Install Node.js 20, clone the repo, `npm install && npm start`
4. Open port 7000 in the security list

### Option 5 — Local + Cloudflare Tunnel (always free, best reliability)

Your home IP is residential — no blocks, no proxy needed.

```bash
npm start
# In a second terminal:
npx cloudflared tunnel --url http://localhost:7000
# Prints a permanent https://....trycloudflare.com URL — paste into Stremio
```

---

## Features

| Feature | Detail |
|---|---|
| Catalogs | Trending, Latest Episodes, Top Rated, Search |
| Streams | Sub + Dub HLS from VidStreaming (hd-1) and MegaCloud |
| Subtitles | VTT tracks bundled with each stream |
| CF Bypass | `got-scraping` injects browser-like TLS + cookies (~100 MB RAM) |
| Caching | In-memory TTL cache (30 min catalog, 5 min streams) |
| Keep-alive | Auto-pings Render every 14 min to prevent free-tier spin-down |

## Local development

```bash
npm install
npm start
# Open:    http://localhost:7000/manifest.json
# Install: stremio://localhost:7000/manifest.json
```
