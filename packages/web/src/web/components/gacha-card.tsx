import { memo } from "react";
import { RobotSprite } from "@/components/pixel";
import { ROBOT_MAP } from "@/game/robots";
import { ELEMENTS } from "@/game/elements";
import { TIER_INFO, type GachaTier } from "@/game/gacha-robots";
import type { PullResult } from "@/game/gacha";

const ELEM_COLOR: Record<string, string> = Object.fromEntries(ELEMENTS.map((e) => [e.id, e.color]));

/** Marca do verso por raridade — cada tier tem uma moldura própria. */
const BACK_GLYPH: Record<GachaTier, string> = { C: "⬡", R: "◈", E: "✶", L: "♛", M: "✺" };

export function TierStars({ tier }: { tier: GachaTier }) {
  const n = TIER_INFO[tier].stars;
  return (
    <span className="gx-stars" aria-label={`${n} estrelas`}>
      {Array.from({ length: n }, (_, i) => (
        <i key={i} style={{ ["--i" as string]: i }}>★</i>
      ))}
    </span>
  );
}

export const GachaCard = memo(function GachaCard({
  r,
  index,
  flipped,
  big,
  onFlip,
}: {
  r: PullResult;
  index: number;
  flipped: boolean;
  big?: boolean;
  onFlip: () => void;
}) {
  const def = ROBOT_MAP[r.id];
  const info = TIER_INFO[r.tier];
  const el = def?.element ?? "";
  return (
    <button
      type="button"
      data-skin="none"
      data-testid="gacha-card"
      className={`gx-card t-${r.tier}${flipped ? " is-flipped" : ""}${big ? " is-big" : ""}`}
      style={{ ["--i" as string]: index, ["--tc" as string]: info.color, ["--tg" as string]: info.glow, ["--ec" as string]: ELEM_COLOR[el] ?? info.color }}
      onClick={onFlip}
      aria-label={flipped ? `${def?.name} — ${info.label}` : "Virar carta"}
    >
      <span className="gx-card-in">
        {/* VERSO */}
        <span className="gx-face gx-back" aria-hidden>
          <span className="gx-back-frame" />
          <span className="gx-back-core">
            <b>{BACK_GLYPH[r.tier]}</b>
          </span>
          <span className="gx-back-tag">NEXUS</span>
          <span className="gx-shine" />
        </span>
        {/* FRENTE */}
        <span className="gx-face gx-front">
          <span className="gx-front-bg" aria-hidden />
          <span className="gx-front-tier">{info.label}</span>
          {flipped && (
            <span className="gx-front-art">
              <RobotSprite robotId={r.id} size={big ? 168 : 92} fps={4} />
            </span>
          )}
          <span className="gx-front-name">{def?.name ?? r.id}</span>
          <span className="gx-front-meta">
            <em style={{ color: ELEM_COLOR[el] }}>{el}</em>
            <TierStars tier={r.tier} />
          </span>
          {r.isNew ? (
            <span className="gx-badge is-new">NOVO!</span>
          ) : (
            <span className="gx-badge is-dup">+{r.gold} OURO · +{r.frags}◆</span>
          )}
          <span className="gx-shine" aria-hidden />
        </span>
      </span>
    </button>
  );
});
