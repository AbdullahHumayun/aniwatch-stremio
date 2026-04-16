import { HiAnime } from "aniwatch";
import * as cache from "./cache.js";

const scraper = new HiAnime.Scraper();

const TTL = {
  HOME: 30 * 60 * 1000,       // 30 minutes
  SEARCH: 60 * 60 * 1000,     // 1 hour
  INFO: 60 * 60 * 1000,       // 1 hour
  EPISODES: 30 * 60 * 1000,   // 30 minutes
  SOURCES: 5 * 60 * 1000,     // 5 minutes — stream URLs expire quickly
};

export async function getHomePage() {
  const cached = cache.get("homepage");
  if (cached) return cached;
  const data = await scraper.getHomePage();
  cache.set("homepage", data, TTL.HOME);
  return data;
}

export async function search(query, page = 1) {
  const key = `search:${query}:${page}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const data = await scraper.search(query, page);
  cache.set(key, data, TTL.SEARCH);
  return data;
}

export async function getInfo(animeId) {
  const key = `info:${animeId}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const data = await scraper.getInfo(animeId);
  cache.set(key, data, TTL.INFO);
  return data;
}

export async function getEpisodes(animeId) {
  const key = `episodes:${animeId}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const data = await scraper.getEpisodes(animeId);
  cache.set(key, data, TTL.EPISODES);
  return data;
}

export async function getEpisodeSources(episodeId, server, category) {
  const key = `sources:${episodeId}:${server}:${category}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const data = await scraper.getEpisodeSources(episodeId, server, category);
  cache.set(key, data, TTL.SOURCES);
  return data;
}
