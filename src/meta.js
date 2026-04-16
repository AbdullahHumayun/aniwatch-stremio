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

  const animeType = info.stats?.type === "Movie" ? "movie" : "series";

  // Build episode list for series
  const videos = [];
  if (animeType === "series" && episodesData.status === "fulfilled") {
    const episodes = episodesData.value?.episodes || [];
    for (const ep of episodes) {
      videos.push({
        // Encode the full episode ID into the video ID so stream handler can
        // retrieve it without an extra lookup. We base64-encode the episodeId
        // to avoid URL-unsafe characters like "?" and "=".
        id: `${ID_PREFIX}${animeId}:${Buffer.from(ep.episodeId).toString("base64url")}`,
        title: ep.title || `Episode ${ep.number}`,
        season: 1,
        episode: ep.number,
        // AniWatch doesn't expose per-episode air dates; use epoch as placeholder.
        released: new Date(0).toISOString(),
      });
    }
  }

  // Extract year from aired string like "Oct 4, 2009 to ..."
  const yearMatch = (moreInfo?.aired || "").match(/\d{4}/);
  const year = yearMatch ? parseInt(yearMatch[0]) : undefined;

  const meta = {
    id,
    type: animeType,
    name: info.name,
    poster: info.poster,
    background: info.poster,
    description: info.description,
    genres: moreInfo?.genres || [],
    runtime: moreInfo?.duration,
    status: moreInfo?.status,
    year,
    imdbRating: info.stats?.rating
      ? String(info.stats.rating).replace(/[^0-9.]/g, "")
      : undefined,
    ...(animeType === "series" && { videos }),
  };

  return { meta };
}
