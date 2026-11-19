import "../screens/battle-pace.css";

/** Pulso "SUA VEZ" quando o menu volta. */
export function YourTurnPulse({ show, k }: { show: boolean; k: number }) {
  if (!show) return null;
  return (
    <div className="mk-title mk-your-turn" key={k} aria-hidden>
      <b>SUA VEZ</b>
    </div>
  );
}
