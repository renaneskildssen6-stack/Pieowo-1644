import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
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

/**
 * Define your database schema here, then apply it with `bun run db:push`
 * (from packages/web). Re-export any generated schema from this file
 * (e.g. Better Auth's auth-schema.ts) so drizzle generates complete migrations.
 * Table patterns and conventions: skills/app/references/api.md
 */
