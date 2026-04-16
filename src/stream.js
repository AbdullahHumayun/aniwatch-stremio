import { getEpisodes, getEpisodeSources } from "./aniwatch.js";

const ID_PREFIX = "aniwatch:";

// Servers to try in order. "hd-1" (VidStreaming) is typically most reliable.
const SERVERS = ["hd-1", "hd-2"];

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
      // Fallback: treat the segment as a plain episode number and look it up
      const epNum = parseInt(encoded);
      if (!isNaN(epNum)) {
        episodeId = await resolveEpisodeId(animeId, epNum);
      }
    }
  } else {
    // Movie — get the first (and usually only) episode
    animeId = withoutPrefix;
    episodeId = await resolveEpisodeId(animeId, 1);
  }

  if (!episodeId) {
    console.warn("[Stream] Could not resolve episodeId for", id);
    return { streams: [] };
  }

  // Fetch sub and dub from each server concurrently
  const tasks = [];
  for (const server of SERVERS) {
    tasks.push({ server, category: "sub", label: "Sub" });
    tasks.push({ server, category: "dub", label: "Dub" });
  }

  const results = await Promise.allSettled(
    tasks.map(({ server, category }) =>
      getEpisodeSources(episodeId, server, category)
    )
  );

  const streams = [];
  const seen = new Set(); // Deduplicate by URL

  for (let i = 0; i < tasks.length; i++) {
    const { server, label } = tasks[i];
    const result = results[i];

    if (result.status === "rejected") {
      console.debug(`[Stream] ${server}/${tasks[i].category} failed:`, result.reason?.message);
      continue;
    }

    const { sources = [], tracks = [], headers = {} } = result.value ?? {};

    for (const source of sources) {
      if (!source.url || seen.has(source.url)) continue;
      seen.add(source.url);

      const quality = source.quality ? ` | ${source.quality}` : "";
      const referer = headers?.Referer || "https://hianime.to";

      // Build subtitle list from companion VTT tracks
      const subtitles = tracks
        .filter((t) => t.kind === "captions" || t.kind === "subtitles")
        .map((t, idx) => ({
          id: `sub-${idx}`,
          url: t.file,
          lang: t.label || "Unknown",
        }));

      streams.push({
        name: "AniWatch",
        description: `${label} | ${server}${quality}`,
        url: source.url,
        subtitles,
        behaviorHints: {
          // M3U8 streams from this CDN need a Referer header; desktop Stremio
          // honours proxyHeaders while the web player will skip them.
          notWebReady: true,
          proxyHeaders: {
            request: { Referer: referer },
          },
          bingeGroup: `aniwatch-${animeId}`,
        },
      });
    }
  }

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
