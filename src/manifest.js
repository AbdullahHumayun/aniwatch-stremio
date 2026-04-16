export const manifest = {
  id: "community.aniwatch.stremio",
  version: "1.0.0",
  name: "AniWatch",
  description:
    "Watch anime from AniWatch.tv (HiAnime) — HD streaming with sub & dub support, subtitles, and search.",
  logo: "https://hianime.to/images/logo.png",
  background: "https://hianime.to/images/bg.jpg",
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
