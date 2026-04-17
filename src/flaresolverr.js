// IMPORTANT: this module patches axios.create at import time.
// It MUST be the first static import in index.js so the patch is active
// before the aniwatch package (which calls axios.create at module load) runs.

import axios from "axios";
import { gotScraping } from "got-scraping";

const TARGET_URL = "https://aniwatchtv.to/";
const HIANIME_HOSTS = new Set(["aniwatchtv.to", "hianime.to"]);
const REFRESH_INTERVAL = 25 * 60 * 1000; // refresh before 30-min CF cookie expiry

let cookieHeader = "";
let solvedUA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// Patch axios.create at load time so every instance created afterwards
// (including the one inside the aniwatch package) gets the cookie interceptor.
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
      // malformed URL — skip injection
    }
    return req;
  });
  return instance;
};

export async function initCFBypass() {
  // Retry on startup — the first cloud request may take a moment
  for (let attempt = 1; attempt <= 15; attempt++) {
    const ok = await refreshCookies();
    if (ok) break;
    const delay = Math.min(2 ** attempt * 500, 30_000);
    console.log(`[cf-bypass] attempt ${attempt} failed, retrying in ${delay}ms`);
    await new Promise((r) => setTimeout(r, delay));
  }

  setInterval(refreshCookies, REFRESH_INTERVAL);
}

async function refreshCookies() {
  try {
    const res = await gotScraping({
      url: TARGET_URL,
      headerGeneratorOptions: {
        browsers: ["chrome"],
        operatingSystems: ["windows"],
      },
    });

    // Extract cookies from Set-Cookie response headers
    const raw = Array.isArray(res.headers["set-cookie"])
      ? res.headers["set-cookie"]
      : res.headers["set-cookie"]
      ? [res.headers["set-cookie"]]
      : [];

    if (raw.length === 0 && res.statusCode !== 200) {
      console.warn(`[cf-bypass] unexpected status ${res.statusCode}`);
      return false;
    }

    cookieHeader = raw.map((c) => c.split(";")[0]).join("; ");
    // got-scraping auto-generates a browser User-Agent; read it back
    const ua = res.request?.options?.headers?.["user-agent"];
    if (ua) solvedUA = ua;

    console.log(
      `[cf-bypass] cookies refreshed (${raw.length} cookies, status ${res.statusCode})`
    );
    return true;
  } catch (err) {
    console.error("[cf-bypass] error:", err.message);
    return false;
  }
}
