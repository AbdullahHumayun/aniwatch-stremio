# AniWatch Stremio Addon

Stream anime from **AniWatch.tv (HiAnime)** directly inside Stremio — HD quality, sub & dub, with subtitle support.

---

## Install (one click)

Once deployed (see below), click the badge to add the addon to Stremio:

> Replace `YOUR-APP-NAME.onrender.com` with your actual deployed URL after deploying.

[![Install in Stremio](https://img.shields.io/badge/Install%20in-Stremio-8A5BE2?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyek0xMCAxNi41di05bDYgNC41LTYgNC41eiIvPjwvc3ZnPg==)](stremio://YOUR-APP-NAME.onrender.com/manifest.json)

Or paste this URL into **Stremio → Add-ons → Community add-ons → paste URL**:

```
https://YOUR-APP-NAME.onrender.com/manifest.json
```

---

## Deploy for free

### Option 1 — Render.com (recommended)

1. Fork this repo to your GitHub account
2. Go to [render.com](https://render.com) and sign up (free)
3. Click **New → Web Service** → connect your fork
4. Render auto-detects `render.yaml` — click **Deploy**
5. Your addon URL will be `https://YOUR-APP-NAME.onrender.com`

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/abdullahhumayun/aniwatch-stremio)

### Option 2 — Railway

1. Fork this repo
2. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
3. Select your fork — Railway auto-detects Node.js
4. Set `PORT` to `7000` in the environment variables (optional, Railway sets its own)
5. Your addon URL will be in the Railway dashboard

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/aniwatch-stremio)

### Option 3 — Docker (any VPS / cloud)

```bash
docker build -t aniwatch-stremio .
docker run -d -p 7000:7000 aniwatch-stremio
```

---

## Features

| Feature | Detail |
|---|---|
| Catalogs | Trending, Latest Episodes, Top Rated, Search |
| Streams | Sub + Dub HLS from VidStreaming (hd-1) and VidCloud (hd-2) |
| Subtitles | VTT tracks bundled with each stream |
| Caching | In-memory TTL cache (30 min catalog, 5 min streams) |

## Local development

```bash
npm install
npm start
# Open: http://localhost:7000/manifest.json
# Install: stremio://localhost:7000/manifest.json
```
