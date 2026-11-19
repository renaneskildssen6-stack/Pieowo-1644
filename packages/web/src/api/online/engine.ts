import { createCombat, resolveRound, applyPvpAction, type Combat, type CombatAction, type Side } from "../../web/game/combat";
import { randomInt } from "node:crypto";
import { CATALOG_IDS } from "../../web/game/robots";
import type { RobotSave } from "../../web/game/engine";

export const COMPETITIVE_LEVEL = 10;
export const TURN_MS = 60_000;
const allowed = new Set(CATALOG_IDS);
export function validateTeam(ids: string[]): void {
  if (ids.length < 1 || ids.length > 4 || new Set(ids).size !== ids.length || ids.some(id => !allowed.has(id))) throw new Error("Escolha de 1 a 4 robôs únicos do catálogo de 256.");
}
const ARENAS = ["neodojo", "neodojo", "dojo", "sky", "frozen", "volcano", "orbital"];
/** Equipe aleatória do catálogo para vagas de IA. */
export function botTeam(size: number, avoid: string[] = []): string[] {
  const pool = CATALOG_IDS.filter(id => !avoid.includes(id)); const out: string[] = [];
  while (out.length < size && pool.length) out.push(pool.splice(randomInt(0, pool.length), 1)[0]);
  return out;
}
/** Combate competitivo. `bots` = índices globais (player0.., enemy0..) controlados pela IA do servidor. */
export function competitiveCombat(host: string[], guest: string[], opts: { doubles?: boolean; botUids?: string[] } = {}): Combat {
  validateTeam(host); validateTeam(guest);
  if (host.length !== guest.length) throw new Error("As equipes precisam ter o mesmo tamanho.");
  const robot = (id: string): RobotSave => ({ id, level: COMPETITIVE_LEVEL, xp: 0, trained: { str: 0, def: 0, agl: 0 }, borrowed: true, gadgetLevel: 0 });
  const arena = opts.doubles ? ARENAS[randomInt(0, ARENAS.length)] : "neodojo";
  const c = createCombat({ arena, pvp: true, doubles: opts.doubles, mode: opts.doubles ? "team" : undefined, playerTeam: host.map(robot), enemyTeam: guest.map(robot), items: {}, difficulty: "normal" });
  if (opts.botUids?.length) c.botUids = [...opts.botUids];
  c.rngSalt = randomInt(1, 2 ** 31 - 1);
  resolveRound(c);
  return c;
}
export function ownerSide(c: Combat): Side | null {
  return [...c.player.fighters, ...c.enemy.fighters].find(f => f.uid === c.ready)?.side ?? null;
}
export function playOnline(c: Combat, side: Side, action: CombatAction) { return applyPvpAction(c, side, action); }

/** Só inverte apresentação. IDs e regras permanecem canônicos no servidor. */
export function perspective(c: Combat, side: Side): Combat {
  const copy = structuredClone(c);
  delete copy.rngSalt;
  if (side === "player") return copy;
  [copy.player, copy.enemy] = [copy.enemy, copy.player];
  copy.player.side = "player"; copy.enemy.side = "enemy";
  for (const f of copy.player.fighters) f.side = "player";
  for (const f of copy.enemy.fighters) f.side = "enemy";
  if (copy.result) copy.result = copy.result === "win" ? "lose" : "win";
  return copy;
}