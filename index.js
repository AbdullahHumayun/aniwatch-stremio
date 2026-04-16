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

// /catalog/:type/:id/:extra.json  (with search, skip, etc.)
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

// /catalog/:type/:id.json  (no extras)
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

/**
 * Parse Stremio's extra param string, e.g. "search=naruto&skip=20"
 * Keys and values are URL-decoded individually.
 */
function parseExtra(raw) {
  const params = {};
  if (!raw) return params;
  for (const part of raw.split("&")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx > 0) {
      const key = safeDecodeURIComponent(part.slice(0, eqIdx));
      const value = safeDecodeURIComponent(part.slice(eqIdx + 1));
      params[key] = value;
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
app.listen(PORT, () => {
  console.log(`AniWatch Stremio Addon`);
  console.log(`  Local:    http://localhost:${PORT}`);
  console.log(`  Manifest: http://localhost:${PORT}/manifest.json`);
  console.log(`  Install:  stremio://localhost:${PORT}/manifest.json`);
});
