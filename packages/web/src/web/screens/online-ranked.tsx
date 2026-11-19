import "./online-ranked.css";

/** Dados da ranqueada online vindos do lobby (rating autoritativo do servidor). */
export interface RankedMe { rating: number; name: string; color: string; emblem: string; placing: boolean; placementsLeft: number; progress: number; wins: number; losses: number; peak: number; streak: number }
export interface RankedLeader { name: string; rating: number; wins: number; losses: number; rank: string; color: string; emblem: string; placing: boolean }

/** Cartão do piloto na RANQUEADA ONLINE: emblema do tier, rating, progresso da divisão e classificatórias. */
export function RankedCard({ me }: { me: RankedMe }) {
  const games = me.wins + me.losses;
  const wr = games ? Math.round((me.wins / games) * 100) : 0;
  return <section className="mor-card" style={{ ["--tier" as string]: me.color }}>
    <img src={me.emblem} alt="" width={72} height={72} />
    <div className="mor-info">
      <small>RANQUEADA ONLINE · SERVIDOR</small>
      <strong>{me.placing ? "CLASSIFICATÓRIAS" : me.name}</strong>
      <div className="mor-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={me.placing ? 0 : me.progress} aria-label="Progresso da divisão">
        <i style={{ width: `${me.placing ? ((5 - me.placementsLeft) / 5) * 100 : me.progress}%` }} />
      </div>
      <p>
        <span><b>{me.rating}</b> RATING</span>
        <span>{me.placing ? `${me.placementsLeft} PARTIDAS PARA O TIER` : `PICO ${me.peak}`}</span>
        <span>{me.wins}V {me.losses}D · {wr}%</span>
        {me.streak >= 2 && <span className="mor-hot">{me.streak} SEGUIDAS</span>}
      </p>
    </div>
  </section>;
}

export function RankedRules() {
  return <p className="mo-rules">Ranqueada 100% online · rating Elo no servidor · rival pelo rating mais próximo (a janela abre com a espera) · 5 classificatórias valem mais · 3+ vitórias seguidas = bônus · sem revanche</p>;
}

export function RankedLeaders({ leaders }: { leaders: RankedLeader[] }) {
  if (!leaders.length) return <section className="mo-leaders"><h3>TOP RANQUEADA</h3><p className="mo-note">Ninguém pontuou ainda nesta arena — seja o primeiro.</p></section>;
  return <section className="mo-leaders mor-leaders"><h3>TOP RANQUEADA</h3><ol>{leaders.map((l, i) => <li key={i} style={{ ["--tier" as string]: l.color }}>
    <span><img src={l.emblem} alt="" width={18} height={18} />{l.name}</span><b>{l.rating}</b><small>{l.placing ? "CLASS." : l.rank}</small>
  </li>)}</ol></section>;
}

/** Faixa do fim de partida ranqueada: +/- rating. */
export function RankedDelta({ delta }: { delta: number | null }) {
  if (delta == null) return null;
  return <div className="mor-delta" data-up={delta >= 0} role="status">{delta >= 0 ? "+" : ""}{delta} RATING</div>;
}
