// Skins no Hangar: palco com a skin aplicada, retrato do card e seletor rápido.
import type { CSSProperties } from "react";
import { RobotSprite } from "@/components/pixel";
import { RobotBust } from "@/components/robot-bust";
import { SKIN_MAP, SKINS, skinOfRobot, type Skin } from "@/game/meta";
import { applySkin, buySkin } from "@/game/meta-actions";
import { portraitUrl } from "@/game/robots";
import { useGame } from "@/game/save";

const skinFilter = (s: Skin) =>
  `${s.filter}${s.aura ? ` drop-shadow(0 0 5px ${s.aura}) drop-shadow(0 0 10px ${s.aura})` : ""}` || undefined;

/** Robô do palco: skin IA troca o desenho; skin de filtro recolore o busto. */
export function HangarStageRobot({ robotId }: { robotId: string }) {
  const g = useGame();
  const skin = skinOfRobot(g, robotId);
  if (skin?.sprite) return <RobotSprite robotId={robotId} clip="idle" size={168} fps={4} skin={skin} />;
  return (
    <div style={{ filter: skin ? skinFilter(skin) : undefined }}>
      <RobotBust robotId={robotId} size={184} />
    </div>
  );
}

/** Conteúdo do card da grade (dentro do Frame). */
export function HangarCardArt({ robotId, locked, size = 58 }: { robotId: string; locked: boolean; size?: number }) {
  const g = useGame();
  const skin = locked ? null : skinOfRobot(g, robotId);
  if (skin?.sprite)
    return (
      <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", overflow: "hidden" }}>
        <RobotSprite robotId={robotId} size={size} fps={3} skin={skin} />
      </div>
    );
  const style: CSSProperties = {
    width: "100%",
    height: "100%",
    imageRendering: "pixelated",
    filter: locked ? "grayscale(1) brightness(0.3) contrast(1.2)" : skin ? skinFilter(skin) : undefined,
  };
  return <img src={portraitUrl(robotId)} alt="" style={style} />;
}

/** Faixa de skins do robô em foco: original, skin IA exclusiva e as compradas. */
export function HangarSkinBar({ robotId }: { robotId: string }) {
  const g = useGame();
  const cur = g.skinOf[robotId] ?? null;
  const ai = SKIN_MAP[`ai_${robotId}`];
  const owned = SKINS.filter((s) => g.skinsOwned.includes(s.id));
  const list: (Skin | null)[] = [null, ...(ai ? [ai] : []), ...owned];
  return (
    <div className="mk-hangar-skins" style={{ display: "flex", gap: 4, overflowX: "auto", padding: "5px 8px", background: "rgba(6,12,22,0.95)", borderBottom: "2px solid rgba(179,107,255,0.35)", flexShrink: 0, alignItems: "center" }}>
      <span className="mk-title" style={{ fontSize: 6, color: "#e0b8ff", flexShrink: 0 }}>SKINS</span>
      {list.map((s) => {
        const id = s?.id ?? null;
        const has = !s || g.skinsOwned.includes(s.id);
        const on = cur === id || (!s && !cur);
        const isAi = !!s?.sprite;
        const label = !s ? "ORIGINAL" : isAi ? `IA ${s.name.split(" · ")[0]}` : s.name;
        return (
          <button
            key={id ?? "orig"}
            type="button"
            title={s?.name ?? "ORIGINAL"}
            onClick={() => (has ? applySkin(robotId, id) : s && buySkin(s.id))}
            style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4, padding: "2px 5px 2px 2px", cursor: "pointer", background: isAi ? "linear-gradient(90deg,rgba(60,20,90,0.95),rgba(8,18,32,0.95))" : "rgba(10,20,34,0.9)", border: `2px solid ${on ? "#ffe36a" : isAi ? "#b36bff" : "rgba(53,226,240,0.3)"}` }}
          >
            <div style={{ width: 30, height: 30, overflow: "hidden", display: "grid", placeItems: "center", background: "rgba(0,0,0,0.35)" }}>
              <RobotSprite robotId={robotId} size={30} fps={2} skin={s} />
            </div>
            <div style={{ textAlign: "left" }}>
              <div className="mk-title" style={{ fontSize: 5, color: "#fff", whiteSpace: "nowrap" }}>{label}</div>
              <div className="mk-title" style={{ fontSize: 5, marginTop: 2, color: on ? "#ffe36a" : has ? "#5fe08a" : g.diamonds >= (s?.cost ?? 0) ? "#7fe4ff" : "#ff6a6a" }}>
                {on ? "EM USO" : has ? "APLICAR" : `${s!.cost} DIAM.`}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
