// cfbypass (src/flaresolverr.js) patches axios.create at import-evaluation time.
// It MUST be listed first so the patch is active before any module that
// imports the aniwatch package (which calls axios.create at module load).
import { initCFBypass } from "./src/flaresolverr.js";

import express from "express";
import cors from "cors";
import { manifest } from "./src/manifest.js";
import { catalogHandler } from "./src/catalog.js";
import { metaHandler } from "./src/meta.js";
import { streamHandler } from "./src/stream.js";

const app = express();

app.use(cors());
app.use(express.json());

// ─── Manifest ────────────────────────────────────────────────────────────────

app.get("/manifest.json", (_req, res) => {
  res.json(manifest);
});

// ─── Catalog ─────────────────────────────────────────────────────────────────

app.get("/catalog/:type/:id/:extra.json", async (req, res) => {
  try {
    const { type, id } = req.params;
    const extra = parseExtra(req.params.extra);
    res.json(await catalogHandler({ type, id, extra }));
  } catch (err) {
    console.error("[Catalog]", err.message);
    res.json({ metas: [] });
  }
});

app.get("/catalog/:type/:id.json", async (req, res) => {
  try {
    const { type, id } = req.params;
    res.json(await catalogHandler({ type, id, extra: {} }));
  } catch (err) {
    console.error("[Catalog]", err.message);
    res.json({ metas: [] });
  }
});

// ─── Meta ─────────────────────────────────────────────────────────────────────

app.get("/meta/:type/:id.json", async (req, res) => {
  try {
    const { type } = req.params;
    const id = safeDecodeURIComponent(req.params.id);
    res.json(await metaHandler({ type, id }));
  } catch (err) {
    console.error("[Meta]", err.message);
    res.json({ meta: null });
  }
});

// ─── Stream ──────────────────────────────────────────────────────────────────

app.get("/stream/:type/:id.json", async (req, res) => {
  try {
    const { type } = req.params;
    const id = safeDecodeURIComponent(req.params.id);
    res.json(await streamHandler({ type, id }));
  } catch (err) {
    console.error("[Stream]", err.message);
    res.json({ streams: [] });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseExtra(raw) {
  const params = {};
  if (!raw) return params;
  for (const part of raw.split("&")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx > 0) {
      params[safeDecodeURIComponent(part.slice(0, eqIdx))] =
        safeDecodeURIComponent(part.slice(eqIdx + 1));
    }
  }
  return params;
}

function safeDecodeURIComponent(str) {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

// ─── Start ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 7000;
app.listen(PORT, async () => {
  console.log(`AniWatch Stremio Addon`);
  console.log(`  Local:    http://localhost:${PORT}`);
  console.log(`  Manifest: http://localhost:${PORT}/manifest.json`);
  console.log(`  Install:  stremio://localhost:${PORT}/manifest.json`);

  // Start CF bypass cookie refresh loop
  await initCFBypass();

  // Keep-alive ping for Render free tier (prevents idle spin-down)
  const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
  if (RENDER_URL) {
    setInterval(async () => {
      try {
        await fetch(`${RENDER_URL}/manifest.json`);
        console.log("[keep-alive] ping sent");
      } catch (err) {
        console.warn("[keep-alive] ping failed:", err.message);
      }
    }, 14 * 60 * 1000);
    console.log(`  Keep-alive active (pinging every 14 min)`);
  }
});
