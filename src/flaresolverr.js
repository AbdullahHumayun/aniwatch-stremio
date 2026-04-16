// IMPORTANT: this module patches axios.create at import time.
// It must be the FIRST static import in index.js so the patch is active
// before the aniwatch package (which calls axios.create at module load) runs.

import axios from "axios";

const FURL = process.env.FLARESOLVERR_URL;
const TARGET_URL = "https://aniwatchtv.to/";
const HIANIME_HOSTS = new Set(["aniwatchtv.to", "hianime.to"]);
const REFRESH_INTERVAL = 25 * 60 * 1000; // refresh before 30-min CF cookie expiry

let cookieHeader = "";
let solvedUA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

if (FURL) {
  // Wrap axios.create so every instance created afterwards (including the one
  // inside the aniwatch package) automatically injects the CF clearance cookies.
  const _create = axios.create.bind(axios);
  axios.create = function (config) {
    const instance = _create(config);
    instance.interceptors.request.use((req) => {
      try {
        const rawUrl =
          req.url?.startsWith("http")
            ? req.url
            : `${req.baseURL ?? ""}${req.url ?? ""}`;
        const { hostname } = new URL(rawUrl);
        if (HIANIME_HOSTS.has(hostname)) {
          req.headers = req.headers ?? {};
          if (cookieHeader) req.headers["Cookie"] = cookieHeader;
          req.headers["User-Agent"] = solvedUA;
        }
      } catch {
        // malformed URL – skip injection
      }
      return req;
    });
    return instance;
  };
  console.log("[flaresolverr] axios.create patched");
}

export async function initFlareSolverr() {
  if (!FURL) return;

  // FlareSolverr may still be starting up — retry with backoff
  for (let attempt = 1; attempt <= 15; attempt++) {
    const ok = await refreshCookies();
    if (ok) break;
    const delay = Math.min(2 ** attempt * 500, 30_000);
    console.log(`[flaresolverr] attempt ${attempt} failed, retrying in ${delay}ms`);
    await new Promise((r) => setTimeout(r, delay));
  }

  setInterval(refreshCookies, REFRESH_INTERVAL);
}

async function refreshCookies() {
  try {
    const res = await fetch(`${FURL}/v1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cmd: "request.get",
        url: TARGET_URL,
        maxTimeout: 60_000,
      }),
    });

    const data = await res.json();

    if (data.status !== "ok") {
      console.error("[flaresolverr] solve failed:", data.message ?? data.status);
      return false;
    }

    const cookies = data.solution?.cookies ?? [];
    cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    solvedUA = data.solution?.userAgent ?? solvedUA;
    console.log(`[flaresolverr] cookies refreshed (${cookies.length} cookies)`);
    return true;
  } catch (err) {
    console.error("[flaresolverr] error:", err.message);
    return false;
  }
}
