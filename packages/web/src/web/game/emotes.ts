/** Emotes das batalhas online (mesmos ids do servidor). Arte em /emotes/<id>.png; glifo é o fallback. */
export const EMOTE_LIST = [
  { id: "hi", label: "OLÁ", glyph: "👋" },
  { id: "gg", label: "GG", glyph: "🤝" },
  { id: "lol", label: "HAHA", glyph: "😂" },
  { id: "wow", label: "UAU", glyph: "😮" },
  { id: "think", label: "HMM", glyph: "🤔" },
  { id: "thumbs", label: "BOA", glyph: "👍" },
  { id: "fire", label: "EM CHAMAS", glyph: "🔥" },
  { id: "angry", label: "GRR", glyph: "😠" },
  { id: "cry", label: "NÃÃO", glyph: "😭" },
  { id: "sorry", label: "FOI MAL", glyph: "🙏" },
  { id: "taunt", label: "VEM!", glyph: "😏" },
  { id: "love", label: "S2", glyph: "💖" },
] as const;
export type EmoteId = (typeof EMOTE_LIST)[number]["id"];
export const emoteOf = (id: string) => EMOTE_LIST.find(e => e.id === id) ?? EMOTE_LIST[0];
export const emoteArt = (id: string) => `/emotes/${id}.png`;
