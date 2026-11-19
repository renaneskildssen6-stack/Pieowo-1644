// Ritmo da batalha: um único ritmo rápido e fluido (sem turbo nem seletor).
// Eventos só de texto (passiva, status, números, avisos) não seguram a fila:
// aparecem por cima da ação seguinte em vez de deixar os robôs parados.

/** Multiplicador global aplicado a todos os tempos de playback. */
export const BATTLE_PACE = 0.5;

/** Escala um tempo em ms pelo ritmo atual, com piso para não cortar quadros. */
export function paced(ms: number, k: number, floor = 40): number {
  if (ms <= 0) return ms;
  return Math.max(Math.min(ms, floor), Math.round(ms * k));
}
