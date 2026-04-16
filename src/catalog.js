import { getHomePage, search } from "./aniwatch.js";

const ID_PREFIX = "aniwatch:";
const PAGE_SIZE = 20;

function animeToMeta(anime) {
  const type = anime.type === "Movie" ? "movie" : "series";
  const episodeInfo = [];
  if (anime.episodes?.sub) episodeInfo.push(`Sub: ${anime.episodes.sub}`);
  if (anime.episodes?.dub) episodeInfo.push(`Dub: ${anime.episodes.dub}`);

  return {
    id: `${ID_PREFIX}${anime.id}`,
    type,
    name: anime.name,
    poster: anime.poster,
    posterShape: "poster",
    description: episodeInfo.length ? episodeInfo.join(" | ") : undefined,
  };
}

export async function catalogHandler({ id, extra }) {
  const skip = parseInt(extra.skip) || 0;
  const page = Math.floor(skip / PAGE_SIZE) + 1;

  if (id === "aniwatch-search") {
    if (!extra.search) return { metas: [] };
    const results = await search(extra.search, page);
    return { metas: (results.animes || []).map(animeToMeta) };
  }

  const homepage = await getHomePage();

  if (id === "aniwatch-trending") {
    const animes = homepage.trendingAnimes || [];
    const slice = animes.slice(skip, skip + PAGE_SIZE);
    return { metas: slice.map(animeToMeta) };
  }

  if (id === "aniwatch-recent") {
    const animes = homepage.latestEpisodeAnimes || [];
    const slice = animes.slice(skip, skip + PAGE_SIZE);
    return { metas: slice.map(animeToMeta) };
  }

  if (id === "aniwatch-top-rated") {
    const animes = homepage.top10Animes?.today || homepage.mostViewedAnimes || [];
    const slice = animes.slice(skip, skip + PAGE_SIZE);
    return { metas: slice.map(animeToMeta) };
  }

  return { metas: [] };
}
