import { integer, text, sqliteTable, index } from "drizzle-orm/sqlite-core";
export * from "./auth-schema";

export const onlineTickets = sqliteTable("mecha_online_tickets", {
  userId: text("user_id").primaryKey(),
  name: text("name").notNull(),
  team: text("team").notNull(),
  kind: text("kind").notNull(),
  code: text("code").unique(),
  matchId: text("match_id"),
  heartbeat: integer("heartbeat").notNull(),
  joined: integer("joined").notNull(),
});
export const onlineMatches = sqliteTable("mecha_online_matches", {
  id: text("id").primaryKey(),
  hostId: text("host_id").notNull(),
  guestId: text("guest_id").notNull(),
  hostName: text("host_name").notNull(),
  guestName: text("guest_name").notNull(),
  state: text("state").notNull(),
  /** Últimas transições compactas (reprodução das animações no cliente). */
  events: text("events").notNull().default("[]"),
  revision: integer("revision").notNull().default(0),
  deadline: integer("deadline").notNull(),
  missedHost: integer("missed_host").notNull().default(0),
  missedGuest: integer("missed_guest").notNull().default(0),
  winnerId: text("winner_id"),
  finished: integer("finished"),
  created: integer("created").notNull(),
  /** "duel" (1v1 / equipes) ou "doubles" (2v2 com quatro pilotos). */
  mode: text("mode").notNull().default("duel"),
  /** Pilotos: [{ userId, name, side, uids, bot }]. Vazio = partida antiga (host/guest). */
  pilots: text("pilots").notNull().default("[]"),
  /** Emotes rápidos: [{ userId, name, side, emote, at }]. */
  chat: text("chat").notNull().default("[]"),
  /** Presença: { userId: último contato em ms }. */
  seen: text("seen").notNull().default("{}"),
  /** Votos de revanche (userIds) e a partida seguinte, quando todos aceitam. */
  rematch: text("rematch").notNull().default("[]"),
  nextId: text("next_id"),
  /** 1 = partida da fila RANQUEADA online (altera o rating). */
  ranked: integer("ranked").default(0),
  /** Variação de rating por piloto: { userId: delta }. */
  rankDelta: text("rank_delta").default("{}"),
});
/** Salas de Duplas 2v2: quatro assentos (A1, A2, B1, B2); vagas vazias viram IA ao iniciar. */
export const onlineRooms = sqliteTable("mecha_online_rooms", {
  code: text("code").primaryKey(),
  hostId: text("host_id").notNull(),
  isPublic: integer("is_public").notNull().default(0),
  /** JSON de 4 posições: null | { userId, name, robot, seen }. */
  seats: text("seats").notNull(),
  matchId: text("match_id"),
  updated: integer("updated").notNull(),
  created: integer("created").notNull(),
});
export const onlineReceipts = sqliteTable("mecha_online_receipts", {
  id: text("id").primaryKey(),
  matchId: text("match_id").notNull(),
  userId: text("user_id").notNull(),
  requestId: text("request_id").notNull(),
  revision: integer("revision").notNull(),
});
export const onlineRecords = sqliteTable("mecha_online_records", {
  userId: text("user_id").primaryKey(),
  name: text("name").notNull(),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
});
/** Rating da RANQUEADA ONLINE (Elo por piloto; tier derivado dos RANKS do jogo). */
export const onlineRatings = sqliteTable("mecha_online_ratings", {
  userId: text("user_id").primaryKey(),
  name: text("name").notNull(),
  rating: integer("rating").notNull().default(1000),
  peak: integer("peak").notNull().default(1000),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  updated: integer("updated").notNull().default(0),
});

/* ===== SOCIAL: perfil público, chat do servidor, mensagens privadas ===== */
export const socialProfiles = sqliteTable("mecha_profiles", {
  userId: text("user_id").primaryKey(),
  name: text("name").notNull(),
  title: text("title").notNull().default(""),
  bio: text("bio").notNull().default(""),
  avatar: text("avatar").notNull().default(""),
  /** JSON: até 4 robôs em destaque. */
  showcase: text("showcase").notNull().default("[]"),
  level: integer("level").notNull().default(1),
  robots: integer("robots").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  rank: text("rank").notNull().default(""),
  rankEmblem: text("rank_emblem").notNull().default(""),
  color: text("color").notNull().default("#35e2f0"),
  guildId: text("guild_id"),
  lastSeen: integer("last_seen").notNull().default(0),
  updated: integer("updated").notNull().default(0),
});
export const chatMessages = sqliteTable("mecha_chat", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** "global" ou "guild:<id>". */
  channel: text("channel").notNull(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  tag: text("tag").notNull().default(""),
  text: text("text").notNull(),
  kind: text("kind").notNull().default("msg"),
  at: integer("at").notNull(),
}, t => [index("mecha_chat_channel_id").on(t.channel, t.id), index("mecha_chat_sender_time").on(t.userId, t.at)]);
export const directMessages = sqliteTable("mecha_dms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fromId: text("from_id").notNull(),
  toId: text("to_id").notNull(),
  text: text("text").notNull(),
  at: integer("at").notNull(),
  read: integer("read").notNull().default(0),
}, t => [index("mecha_dm_sender_time").on(t.fromId, t.at), index("mecha_dm_recipient_sender").on(t.toId, t.fromId, t.id), index("mecha_dm_sender_recipient").on(t.fromId, t.toId, t.id)]);
export const socialBlocks = sqliteTable("mecha_blocks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  blockedId: text("blocked_id").notNull(),
}, t => [index("mecha_blocks_pilots").on(t.userId, t.blockedId)]);

/* ===== GUILDAS ===== */
export const guilds = sqliteTable("mecha_guilds", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  tag: text("tag").notNull().unique(),
  emblem: text("emblem").notNull(),
  color: text("color").notNull(),
  motto: text("motto").notNull().default(""),
  /** "open" entra direto; "request" precisa de aprovação. */
  joinMode: text("join_mode").notNull().default("open"),
  minLevel: integer("min_level").notNull().default(1),
  leaderId: text("leader_id").notNull(),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  trophies: integer("trophies").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  /** Momento em que começou a procurar guerra (null = não procura). */
  warSearch: integer("war_search"),
  created: integer("created").notNull(),
});
export const guildMembers = sqliteTable("mecha_guild_members", {
  userId: text("user_id").primaryKey(),
  guildId: text("guild_id").notNull(),
  name: text("name").notNull(),
  /** leader | officer | member */
  role: text("role").notNull().default("member"),
  joined: integer("joined").notNull(),
  contribution: integer("contribution").notNull().default(0),
  warPoints: integer("war_points").notNull().default(0),
  bossDamage: integer("boss_damage").notNull().default(0),
  duelWins: integer("duel_wins").notNull().default(0),
  duelLosses: integer("duel_losses").notNull().default(0),
  /** JSON: 3 robôs da defesa de guerra. */
  defense: text("defense").notNull().default("[]"),
  lastDonate: integer("last_donate").notNull().default(0),
  warClaim: text("war_claim"),
}, t => [index("mecha_members_guild").on(t.guildId)]);
export const guildRequests = sqliteTable("mecha_guild_requests", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  /** "request" (piloto pediu) ou "invite" (guilda convidou). */
  kind: text("kind").notNull().default("request"),
  level: integer("level").notNull().default(1),
  created: integer("created").notNull(),
});
export const guildWars = sqliteTable("mecha_guild_wars", {
  id: text("id").primaryKey(),
  guildA: text("guild_a").notNull(),
  guildB: text("guild_b").notNull(),
  nameA: text("name_a").notNull(),
  nameB: text("name_b").notNull(),
  tagA: text("tag_a").notNull(),
  tagB: text("tag_b").notNull(),
  emblemB: text("emblem_b").notNull().default(""),
  colorB: text("color_b").notNull().default(""),
  emblemA: text("emblem_a").notNull().default(""),
  colorA: text("color_a").notNull().default(""),
  defensesA: text("defenses_a").notNull().default("[]"),
  defensesB: text("defenses_b").notNull().default("[]"),
  scoreA: integer("score_a").notNull().default(0),
  scoreB: integer("score_b").notNull().default(0),
  /** Guilda NPC: defensores sorteados e meta de pontos simulada. */
  npc: text("npc"),
  starts: integer("starts").notNull(),
  ends: integer("ends").notNull(),
  status: text("status").notNull().default("active"),
  winner: text("winner"),
}, t => [index("mecha_wars_guild_a").on(t.guildA, t.status), index("mecha_wars_guild_b").on(t.guildB, t.status)]);
export const guildBattles = sqliteTable("mecha_guild_battles", {
  matchId: text("match_id").primaryKey(),
  /** war | boss | duel */
  kind: text("kind").notNull(),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  warId: text("war_id"),
  target: text("target"),
  targetName: text("target_name"),
  settled: integer("settled").notNull().default(0),
  value: integer("value").notNull().default(0),
  won: integer("won").notNull().default(0),
  reward: integer("reward").notNull().default(0),
  claimed: integer("claimed").notNull().default(0),
  created: integer("created").notNull(),
}, t => [index("mecha_guild_battle_settle").on(t.guildId, t.settled), index("mecha_guild_battle_pilot").on(t.guildId, t.userId, t.created)]);
export const guildBoss = sqliteTable("mecha_guild_boss", {
  guildId: text("guild_id").primaryKey(),
  tier: integer("tier").notNull().default(1),
  hp: integer("hp").notNull(),
  maxHp: integer("max_hp").notNull(),
  robot: text("robot").notNull(),
  week: integer("week").notNull(),
  kills: integer("kills").notNull().default(0),
});
/** Arena interna: desafios x1 (2 assentos) e x2 (4 assentos, vagas viram IA). */
export const guildChallenges = sqliteTable("mecha_guild_challenges", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  mode: text("mode").notNull(),
  hostId: text("host_id").notNull(),
  seats: text("seats").notNull(),
  matchId: text("match_id"),
  updated: integer("updated").notNull(),
  created: integer("created").notNull(),
}, t => [index("mecha_guild_rooms_active").on(t.guildId, t.matchId, t.updated)]);

/**
 * Define your database schema here, then apply it with `bun run db:push`
 * (from packages/web). Re-export any generated schema from this file
 * (e.g. Better Auth's auth-schema.ts) so drizzle generates complete migrations.
 * Table patterns and conventions: skills/app/references/api.md
 */
