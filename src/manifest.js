export const manifest = {
  id: "community.aniwatch.stremio",
  version: "1.0.0",
  name: "AniWatch",
  description:
    "Stream anime from AllAnime — HD sub & dub, search, and cloud-friendly (no datacenter blocks).",
  logo: "https://allmanga.to/logo.png",
  background: "https://allmanga.to/logo.png",
  types: ["series", "movie"],
  catalogs: [
    {
      type: "series",
      id: "aniwatch-trending",
      name: "AniWatch - Trending",
      extra: [{ name: "skip", isRequired: false }],
    },
    {
      type: "series",
      id: "aniwatch-recent",
      name: "AniWatch - Latest Episodes",
      extra: [{ name: "skip", isRequired: false }],
    },
    {
      type: "series",
      id: "aniwatch-top-rated",
      name: "AniWatch - Top Rated",
      extra: [{ name: "skip", isRequired: false }],
    },
    {
      type: "series",
      id: "aniwatch-search",
      name: "AniWatch",
      extra: [
        { name: "search", isRequired: true },
        { name: "skip", isRequired: false },
      ],
    },
  ],
  resources: [
    "catalog",
    {
      name: "meta",
      types: ["series", "movie"],
      idPrefixes: ["aniwatch:"],
    },
    {
      name: "stream",
      types: ["series", "movie"],
      idPrefixes: ["aniwatch:"],
    },
  ],
  idPrefixes: ["aniwatch:"],
  behaviorHints: {
    adult: false,
    p2p: false,
  },
};
