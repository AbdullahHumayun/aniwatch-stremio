import { getInfo, getEpisodes } from "./aniwatch.js";

const ID_PREFIX = "aniwatch:";

export async function metaHandler({ type, id }) {
  if (!id.startsWith(ID_PREFIX)) return { meta: null };

  const animeId = id.slice(ID_PREFIX.length);

  // Fetch info and episodes concurrently
  const [infoData, episodesData] = await Promise.allSettled([
    getInfo(animeId),
    getEpisodes(animeId),
  ]);

  if (infoData.status === "rejected") {
    console.error("[Meta] getInfo failed:", infoData.reason?.message);
    return { meta: null };
  }

  const { anime } = infoData.value;
  const info = anime?.info;
  const moreInfo = anime?.moreInfo;

  if (!info) return { meta: null };

  // moreInfo keys are lowercased site labels, e.g. "genres", "status", "aired"
  // Helper to find a key case-insensitively and handle possible key variants
  const mi = (key) => moreInfo?.[key] ?? moreInfo?.[key.toLowerCase()] ?? null;

  const animeType =
    info.stats?.type === "Movie" ||
    String(mi("type") ?? "").toLowerCase() === "movie"
      ? "movie"
      : "series";

  // Build episode list for series
  const videos = [];
  if (animeType === "series" && episodesData.status === "fulfilled") {
    const episodes = episodesData.value?.episodes || [];
    for (const ep of episodes) {
      if (!ep.episodeId) continue;
      videos.push({
        // Encode the full HiAnime episodeId (e.g. "one-piece-100?ep=1234") as
        // base64url so the colon-separated stream ID stays URL-safe.
        id: `${ID_PREFIX}${animeId}:${Buffer.from(ep.episodeId).toString("base64url")}`,
        title: ep.title || `Episode ${ep.number}`,
        season: 1,
        episode: ep.number,
        released: new Date(0).toISOString(),
      });
    }
  }

  // Extract year from aired string like "Oct 4, 2009 to ..."
  const airedStr = String(mi("aired") ?? "");
  const yearMatch = airedStr.match(/\d{4}/);
  const year = yearMatch ? parseInt(yearMatch[0]) : undefined;

  const genres = mi("genres");

  const meta = {
    id,
    type: animeType,
    name: info.name,
    poster: info.poster,
    background: info.poster,
    description: info.description,
    genres: Array.isArray(genres) ? genres : [],
    runtime: String(mi("duration") ?? mi("runtime") ?? ""),
    status: String(mi("status") ?? ""),
    year,
    imdbRating: info.stats?.rating
      ? String(info.stats.rating).replace(/[^0-9.]/g, "")
      : undefined,
    ...(animeType === "series" && { videos }),
  };

  return { meta };
}
