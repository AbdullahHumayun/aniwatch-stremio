import { getPopular, getTopRated, getRecent, search } from "./allanime.js";

const ID_PREFIX = "aniwatch:";
const PAGE_SIZE = 26;

function toStremioMeta(anime) {
  return {
    id: `${ID_PREFIX}${anime.id}`,
    type: anime.type,
    name: anime.name,
    poster: anime.poster,
    posterShape: "poster",
  };
}

export async function catalogHandler({ id, extra }) {
  const skip = parseInt(extra.skip) || 0;
  const page = Math.floor(skip / PAGE_SIZE) + 1;

  if (id === "aniwatch-search") {
    if (!extra.search) return { metas: [] };
    const animes = await search(extra.search, page);
    return { metas: animes.map(toStremioMeta) };
  }

  if (id === "aniwatch-trending") {
    const animes = await getPopular(page);
    return { metas: animes.map(toStremioMeta) };
  }

  if (id === "aniwatch-recent") {
    const animes = await getRecent(page);
    return { metas: animes.map(toStremioMeta) };
  }

  if (id === "aniwatch-top-rated") {
    const animes = await getTopRated(page);
    return { metas: animes.map(toStremioMeta) };
  }

  return { metas: [] };
}
