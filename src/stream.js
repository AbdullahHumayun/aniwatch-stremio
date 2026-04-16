import { getEpisodes, getEpisodeSources } from "./aniwatch.js";

const ID_PREFIX = "aniwatch:";

// Try sub then dub on hd-1, fall back to megacloud
const TASKS = [
  { server: "hd-1",     category: "sub", label: "Sub" },
  { server: "hd-1",     category: "dub", label: "Dub" },
  { server: "megacloud", category: "sub", label: "Sub (MegaCloud)" },
  { server: "megacloud", category: "dub", label: "Dub (MegaCloud)" },
];

export async function streamHandler({ type, id }) {
  if (!id.startsWith(ID_PREFIX)) return { streams: [] };

  const withoutPrefix = id.slice(ID_PREFIX.length);

  // ID format:
  //   movie  → "aniwatch:<animeId>"
  //   series → "aniwatch:<animeId>:<base64url(episodeId)>"
  const colonIdx = withoutPrefix.lastIndexOf(":");
  let animeId, episodeId;

  if (colonIdx > 0) {
    animeId = withoutPrefix.slice(0, colonIdx);
    const encoded = withoutPrefix.slice(colonIdx + 1);
    try {
      episodeId = Buffer.from(encoded, "base64url").toString("utf-8");
    } catch {
      const epNum = parseInt(encoded);
      if (!isNaN(epNum)) episodeId = await resolveEpisodeId(animeId, epNum);
    }
  } else {
    animeId = withoutPrefix;
    episodeId = await resolveEpisodeId(animeId, 1);
  }

  if (!episodeId) {
    console.warn("[Stream] Could not resolve episodeId for", id);
    return { streams: [] };
  }

  console.log("[Stream] Fetching sources for episodeId:", episodeId);

  const results = await Promise.allSettled(
    TASKS.map(({ server, category }) =>
      getEpisodeSources(episodeId, server, category)
    )
  );

  const streams = [];
  const seen = new Set();

  for (let i = 0; i < TASKS.length; i++) {
    const { server, label } = TASKS[i];
    const result = results[i];

    if (result.status === "rejected") {
      console.warn(`[Stream] ${server}/${TASKS[i].category} failed:`, result.reason?.message);
      continue;
    }

    // The aniwatch package returns { sources, subtitles, headers }
    // subtitles: Array<{ url, lang }> — already processed by the package
    const { sources = [], subtitles = [], headers = {} } = result.value ?? {};

    console.log(`[Stream] ${server}/${TASKS[i].category}: ${sources.length} source(s)`);

    for (const source of sources) {
      if (!source.url || seen.has(source.url)) continue;
      seen.add(source.url);

      const quality = source.quality ? ` | ${source.quality}` : "";
      const referer = headers?.Referer || "https://hianime.to";

      const stremioSubtitles = subtitles.map((t, idx) => ({
        id: t.id || `sub-${idx}`,
        url: t.url,
        lang: t.lang || "Unknown",
      }));

      streams.push({
        name: "AniWatch",
        description: `${label} | ${server}${quality}`,
        url: source.url,
        subtitles: stremioSubtitles,
        behaviorHints: {
          notWebReady: false,
          proxyHeaders: {
            request: { Referer: referer },
          },
          bingeGroup: `aniwatch-${animeId}`,
        },
      });
    }
  }

  console.log(`[Stream] Returning ${streams.length} stream(s)`);
  return { streams };
}

async function resolveEpisodeId(animeId, episodeNumber) {
  try {
    const data = await getEpisodes(animeId);
    const ep = (data?.episodes || []).find((e) => e.number === episodeNumber);
    return ep?.episodeId ?? null;
  } catch (err) {
    console.error("[Stream] resolveEpisodeId failed:", err.message);
    return null;
  }
}
