import { useMemo, useState } from "react";
import { CAST, type CastId } from "@/game/story-cast";
import { STORY_CHAPTERS, type SpeakerId, type StoryLine } from "@/game/story";

const CAST_IDS = Object.keys(CAST) as CastId[];

/** Personagens do elenco novo que já falaram em capítulos concluídos. */
function metSpeakers(cleared: string[]): Set<SpeakerId> {
  const met = new Set<SpeakerId>();
  const add = (l: StoryLine) => met.add(l.who);
  for (const c of STORY_CHAPTERS) {
    if (!cleared.includes(c.id)) continue;
    for (const b of c.beats) {
      if (b.kind === "line") add(b);
      else if (b.kind === "choice") b.options.forEach((o) => o.reply.forEach(add));
    }
  }
  return met;
}

/** Faixa “ELENCO”: retratos de quem você já conheceu; o resto aparece como silhueta. */
export function StoryCast({ cleared }: { cleared: string[] }) {
  const met = useMemo(() => metSpeakers(cleared), [cleared]);
  const [pick, setPick] = useState<CastId | null>(null);
  const known = CAST_IDS.filter((id) => met.has(id)).length;
  const sel = pick ? CAST[pick] : null;
  return (
    <section className="sg-cast" aria-label="Elenco da história">
      <header><small>ELENCO</small><b>{known}/{CAST_IDS.length} PERSONAGENS CONHECIDOS</b></header>
      <div className="sg-cast-row">
        {CAST_IDS.map((id) => {
          const sp = CAST[id];
          const ok = met.has(id);
          return (
            <button key={id} type="button" data-skin="none" className={`sg-cast-card${ok ? "" : " is-unknown"}${pick === id ? " is-picked" : ""}`}
              style={{ ["--tone" as string]: sp.tone }} disabled={!ok} onClick={() => setPick(pick === id ? null : id)}
              aria-label={ok ? `${sp.name}: ${sp.role ?? ""}` : "Personagem desconhecido"}>
              <img src={sp.portrait} alt="" loading="lazy" className={sp.portrait?.includes("/busts/") ? "is-bust" : ""} />
              <span>{ok ? sp.name.split(" · ")[0] : "???"}</span>
            </button>
          );
        })}
      </div>
      {sel && <p className="sg-cast-bio" style={{ ["--tone" as string]: sel.tone }}><b>{sel.name}</b>{sel.role}</p>}
    </section>
  );
}
