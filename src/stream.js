import { getStreams } from "./allanime.js";

const ID_PREFIX = "aniwatch:";

export async function streamHandler({ type, id }) {
  if (!id.startsWith(ID_PREFIX)) return { streams: [] };

  // ID formats:
  //   movie   → "aniwatch:<animeId>"
  //   episode → "aniwatch:<animeId>:<episodeNum>"
  const withoutPrefix = id.slice(ID_PREFIX.length);
  const colonIdx = withoutPrefix.lastIndexOf(":");

  let animeId, episodeNum;
  if (colonIdx > 0) {
    animeId = withoutPrefix.slice(0, colonIdx);
    episodeNum = withoutPrefix.slice(colonIdx + 1);
  } else {
    animeId = withoutPrefix;
    episodeNum = "1";
  }

  console.log(`[Stream] ${animeId} ep ${episodeNum}`);

  // Fetch sub and dub in parallel; ignore failures
  const [subResults, dubResults] = await Promise.allSettled([
    getStreams(animeId, episodeNum, "sub"),
    getStreams(animeId, episodeNum, "dub"),
  ]);

  const allSources = [
    ...(subResults.status === "fulfilled" ? subResults.value : []),
    ...(dubResults.status === "fulfilled" ? dubResults.value : []),
  ];

  if (subResults.status === "rejected") {
    console.warn("[Stream] sub failed:", subResults.reason?.message);
  }
  if (dubResults.status === "rejected") {
    console.warn("[Stream] dub failed:", dubResults.reason?.message);
  }

  const seen = new Set();
  const streams = [];

  for (const src of allSources) {
    if (!src.url || seen.has(src.url)) continue;
    seen.add(src.url);

    const lang = src.translationType === "dub" ? "Dub" : "Sub";
    const quality = src.quality !== "auto" ? ` | ${src.quality}` : "";

    streams.push({
      name: "AllAnime",
      description: `${lang}${quality} | ${src.sourceName}`,
      url: src.url,
      behaviorHints: {
        notWebReady: false,
        bingeGroup: `allanime-${animeId}`,
      },
    });
  }

  console.log(`[Stream] returning ${streams.length} stream(s)`);
  return { streams };
}
