import { randomInt } from "node:crypto";
import { botTeam } from "./engine";
import type { Pilot } from "./service";

/** Fila ranqueada vazia: depois de uma espera "humana" (8–20 s, fixa por ticket) entra um piloto-bot com rating próximo. */
const NAMES = ["KAIZER_77", "nyx.mecha", "Lumen", "TORQUE", "bia_pilota", "RAFA-X", "Ferrugem", "zeroDrift", "MAYA.EXE", "Corvo", "Lucão", "jinx_br",
  "Valkyr", "DUDU2010", "Neblina", "sputnik", "ARKAN", "tati.gg", "Hexa", "Pistão", "MK_Vini", "Orbital", "KIRA", "Bruxo", "Ciano", "theo_ace",
  "Vortex", "Manu", "GIGA", "pedrin", "Sombra", "ZETA-9", "Lina", "Bolt", "Caio.mx", "NOVA", "Rex", "Tigrão", "Iris_", "Draco"];

export function botWaitMs(userId: string, joined: number) {
  let h = joined;
  for (const ch of userId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 8_000 + (h % 12_000);
}
export function rankedBot(team: string[], myRating: number): Pilot {
  const name = NAMES[randomInt(0, NAMES.length)];
  return { userId: `bot:${name}`, name, side: "enemy", uids: [], robots: botTeam(team.length, team), bot: true,
    rating: Math.max(0, myRating + randomInt(-70, 71)) };
}
