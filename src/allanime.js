import { gotScraping } from "got-scraping";
import * as cache from "./cache.js";

const API = "https://api.allanime.day/api";
const SITE = "https://allmanga.to";

const TTL = {
  POPULAR: 30 * 60 * 1000,
  SEARCH: 60 * 60 * 1000,
  INFO: 60 * 60 * 1000,
  SOURCES: 5 * 60 * 1000,
};

async function gql(query, variables = {}) {
  const res = await gotScraping({
    url: API,
    searchParams: {
      variables: JSON.stringify(variables),
      query,
    },
    headers: { Referer: SITE },
    responseType: "json",
    timeout: { request: 15000 },
  });

  if (res.statusCode !== 200) {
    throw new Error(`AllAnime API ${res.statusCode}`);
  }

  const errors = res.body?.errors;
  if (errors?.length) {
    throw new Error(`AllAnime GQL: ${errors[0].message}`);
  }

  return res.body?.data;
}

// Hex-encoded bytes XOR'd with 56
function decodeUrl(encoded) {
  if (!encoded?.startsWith("--")) return encoded ?? null;
  const hex = encoded.slice(2);
  const bytes = [];
  for (let i = 0; i + 1 < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16) ^ 56);
  }
  try {
    return Buffer.from(bytes).toString("utf8");
  } catch {
    return null;
  }
}

function showToMeta(show) {
  if (!show?._id) return null;
  return {
    id: show._id,
    name: show.englishName || show.name,
    poster: show.thumbnail,
    type: show.type === "Movie" ? "movie" : "series",
    episodes: show.availableEpisodes || { sub: 0, dub: 0 },
  };
}

// ─── Queries ─────────────────────────────────────────────────────────────────

const Q_POPULAR = `query($type:VaildShowTypeEnumType,$size:Int,$dateRange:Int,$page:Int){
  queryPopular(type:$type,size:$size,dateRange:$dateRange,page:$page){
    recommendations{ anyCard{_id name englishName thumbnail type availableEpisodes{sub dub}} }
  }
}`;

const Q_RECENT = `query($page:Int,$size:Int){
  queryRecentEpisodes(page:$page,size:$size,allowAdult:false,allowUnknown:false){
    edges{ anyCard{_id name englishName thumbnail type availableEpisodes{sub dub}} }
  }
}`;

const Q_SEARCH = `query($search:SearchInput,$limit:Int,$page:Int){
  shows(search:$search,limit:$limit,page:$page){
    edges{_id name englishName thumbnail type availableEpisodes{sub dub}}
  }
}`;

const Q_SHOW = `query($showId:String!){
  show(_id:$showId){
    _id name englishName thumbnail description type genres rating
    season{year quarter}
    availableEpisodes{sub dub}
  }
}`;

const Q_EPISODE = `query($showId:String!,$translationType:VaildTranslationTypeEnumType!,$episodeString:String!){
  episode(showId:$showId,translationType:$translationType,episodeString:$episodeString){
    episodeString sourceUrls
  }
}`;

// ─── Public API ──────────────────────────────────────────────────────────────

export async function getPopular(page = 1) {
  const key = `aa:popular:${page}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const data = await gql(Q_POPULAR, { type: "anime", size: 26, dateRange: 7, page });
  const animes = (data?.queryPopular?.recommendations ?? [])
    .map((r) => showToMeta(r?.anyCard))
    .filter(Boolean);

  cache.set(key, animes, TTL.POPULAR);
  return animes;
}

export async function getTopRated(page = 1) {
  const key = `aa:toprated:${page}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const data = await gql(Q_POPULAR, { type: "anime", size: 26, dateRange: 365, page });
  const animes = (data?.queryPopular?.recommendations ?? [])
    .map((r) => showToMeta(r?.anyCard))
    .filter(Boolean);

  cache.set(key, animes, TTL.POPULAR);
  return animes;
}

export async function getRecent(page = 1) {
  const key = `aa:recent:${page}`;
  const hit = cache.get(key);
  if (hit) return hit;

  try {
    const data = await gql(Q_RECENT, { page, size: 26 });
    const animes = (data?.queryRecentEpisodes?.edges ?? [])
      .map((e) => showToMeta(e?.anyCard))
      .filter(Boolean);

    cache.set(key, animes, TTL.POPULAR);
    return animes;
  } catch (err) {
    console.warn("[AllAnime] getRecent failed, falling back to popular:", err.message);
    return getPopular(page);
  }
}

export async function search(query, page = 1) {
  const key = `aa:search:${query}:${page}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const data = await gql(Q_SEARCH, {
    search: { query, allowAdult: false, allowUnknown: false },
    limit: 26,
    page,
  });

  const animes = (data?.shows?.edges ?? []).map(showToMeta).filter(Boolean);
  cache.set(key, animes, TTL.SEARCH);
  return animes;
}

export async function getInfo(animeId) {
  const key = `aa:info:${animeId}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const data = await gql(Q_SHOW, { showId: animeId });
  const show = data?.show;
  if (!show) throw new Error(`AllAnime: show not found — ${animeId}`);

  const result = {
    id: show._id,
    name: show.englishName || show.name,
    poster: show.thumbnail,
    description: show.description ?? null,
    type: show.type === "Movie" ? "movie" : "series",
    genres: show.genres ?? [],
    year: show.season?.year ?? null,
    rating: show.rating ?? null,
    availableEpisodes: show.availableEpisodes ?? { sub: 0, dub: 0 },
  };

  cache.set(key, result, TTL.INFO);
  return result;
}

export async function getStreams(animeId, episodeNum, translationType) {
  const key = `aa:streams:${animeId}:${episodeNum}:${translationType}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const data = await gql(Q_EPISODE, {
    showId: animeId,
    translationType,
    episodeString: String(episodeNum),
  });

  const rawSources = data?.episode?.sourceUrls ?? [];
  const streams = [];

  for (const raw of rawSources) {
    // sourceUrls may be strings or objects; normalise both
    const encodedUrl = typeof raw === "string" ? raw : raw?.sourceUrl;
    const sourceName = typeof raw === "object" ? (raw?.sourceName ?? "") : "";
    if (!encodedUrl) continue;

    const decoded = decodeUrl(encodedUrl);
    if (!decoded) continue;

    // AllAnime CDN — follow the clock endpoint to get the real HLS URL
    if (decoded.includes("allanime") || decoded.includes("/clock")) {
      try {
        const cdnRes = await gotScraping({
          url: decoded,
          headers: { Referer: SITE },
          responseType: "json",
          timeout: { request: 10000 },
        });
        for (const link of cdnRes.body?.links ?? []) {
          const url = link.link || link.hls || link.mp4;
          if (!url) continue;
          streams.push({
            url,
            quality: link.resolutionStr ?? link.resolution ?? "auto",
            isHls: !!link.hls || url.includes(".m3u8"),
            sourceName: sourceName || "AllAnime",
            translationType,
          });
        }
      } catch (err) {
        console.warn(`[AllAnime] CDN resolve failed (${sourceName}):`, err.message);
      }
      continue;
    }

    // Direct URL (MP4 or HLS)
    if (decoded.startsWith("http")) {
      streams.push({
        url: decoded,
        quality: "auto",
        isHls: decoded.includes(".m3u8"),
        sourceName: sourceName || "Direct",
        translationType,
      });
    }
  }

  cache.set(key, streams, TTL.SOURCES);
  return streams;
}
