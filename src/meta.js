import { getInfo } from "./allanime.js";

const ID_PREFIX = "aniwatch:";

export async function metaHandler({ type, id }) {
  if (!id.startsWith(ID_PREFIX)) return { meta: null };

  const animeId = id.slice(ID_PREFIX.length);

  const info = await getInfo(animeId);

  // Build episode list for series using availableEpisodes count
  const videos = [];
  if (info.type === "series") {
    const count = info.availableEpisodes?.sub || info.availableEpisodes?.dub || 0;
    for (let i = 1; i <= count; i++) {
      videos.push({
        id: `${ID_PREFIX}${animeId}:${i}`,
        title: `Episode ${i}`,
        season: 1,
        episode: i,
        released: new Date(0).toISOString(),
      });
    }
  }

  const meta = {
    id,
    type: info.type,
    name: info.name,
    poster: info.poster,
    background: info.poster,
    description: info.description ?? undefined,
    genres: info.genres,
    year: info.year ?? undefined,
    imdbRating: info.rating ? String(info.rating).replace(/[^0-9.]/g, "") : undefined,
    ...(info.type === "series" && { videos }),
  };

  return { meta };
}
