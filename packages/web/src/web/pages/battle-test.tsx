import { BattleScreen } from "@/screens/battle";
import { STORY_CHAPTERS, storyEnemies } from "@/game/story";
import { teamSaves, useGame } from "@/game/save";

/** Rota de desenvolvimento: abre uma batalha direto para testar layout. */
export default function BattleTest() {
  const g = useGame();
  const all = STORY_CHAPTERS.flatMap((c) => c.beats).filter((b) => b.kind === "battle");
  const beat = all[0];
  const mine = all[all.length - 1];
  if (!beat || beat.kind !== "battle") return null;
  return <div style={{ position: "fixed", inset: 0 }}><BattleScreen arena={beat.arena} playerTeam={teamSaves(g).length ? teamSaves(g) : mine && mine.kind === "battle" ? storyEnemies(mine) : []} enemyTeam={storyEnemies(beat)} items={g.items} label="TESTE" recordProgress={false} onUseItem={() => {}} onFinish={() => {}} /></div>;
}
