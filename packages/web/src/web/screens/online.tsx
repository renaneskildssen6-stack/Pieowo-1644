import { useCallback, useEffect, useMemo, useState } from "react";
import { authClient, captureBearer, completeManagedRedirect, refreshSession } from "@/lib/auth";
import { CATALOG_IDS, ROBOT_MAP, faceUrl } from "@/game/robots";
import { ELEMENTS, elementDef } from "@/game/elements";
import { LOCAL_BUILD, apiOrigin, setApiOrigin } from "@/lib/origin";
import { useCancelQueue, useJoinRoom, useOnlineLobby, useQueueOnline, useVersusBot } from "@/queries/online";
import { DirectConnect } from "./direct-connect";
import { OnlineBattle, errText } from "./online-battle";
import { DuoPanel } from "./online-duo";
import { RankedCard, RankedLeaders, RankedRules } from "./online-ranked";
import "./online.css";

const GUEST_KEY = "mecha.guest";
/** Convidado = conta real e descartável no servidor (e-mail local + senha aleatória guardados no aparelho). */
async function guestLogin(): Promise<string | null> {
  const opts = { onSuccess: captureBearer };
  let saved: { email: string; password: string } | null = null;
  try { saved = JSON.parse(localStorage.getItem(GUEST_KEY) || "null"); } catch { saved = null; }
  if (saved) {
    const r = await authClient.signIn.email({ email: saved.email, password: saved.password }, opts);
    if (!r.error) { refreshSession(); return null; }
  }
  const tag = Math.random().toString(36).slice(2, 8).toUpperCase();
  const fresh = { email: `guest-${tag.toLowerCase()}-${Date.now().toString(36)}@mecha.local`, password: crypto.randomUUID().replace(/-/g, "").slice(0, 20) };
  const r = await authClient.signUp.email({ name: `PILOTO-${tag}`, email: fresh.email, password: fresh.password }, opts);
  if (r.error) return r.error.message ?? "Não foi possível criar o convidado.";
  localStorage.setItem(GUEST_KEY, JSON.stringify(fresh)); refreshSession(); return null;
}

/** Entrada do modo online: conta → lobby (fila/sala) → batalha autoritativa. */
export type LobbyTab = "public" | "private" | "duo" | "ranked";
export function OnlineScreen({ onBack, backLabel = "CIDADE", initialTab = "public", rankedOnly = false }: { onBack: () => void; backLabel?: string; initialTab?: LobbyTab; rankedOnly?: boolean }) {
  const [redirected, setRedirected] = useState(false);
  const [autoGuest, setAutoGuest] = useState(rankedOnly ? "idle" : "done");
  useEffect(() => { void completeManagedRedirect().finally(() => setRedirected(true)); }, []);
  const { data: session, isPending } = authClient.useSession();
  // Ranqueada: entra direto como convidado (conta descartável salva no aparelho) — sem tela de login no caminho.
  useEffect(() => {
    if (!redirected || isPending || session?.user || autoGuest !== "idle") return;
    setAutoGuest("busy");
    void guestLogin().catch(() => "x").finally(() => setAutoGuest("done"));
  }, [redirected, isPending, session?.user, autoGuest]);
  if (!redirected || isPending || (!session?.user && autoGuest !== "done")) return <div className="mo-screen mo-center"><p className="mo-kicker">CONECTANDO AO SERVIDOR…</p></div>;
  const user = session?.user;
  if (!user) return <AuthPanel onBack={onBack} />;
  const pilotName = user.name?.trim() || user.email?.split("@")[0] || "PILOTO";
  return <Lobby onBack={onBack} backLabel={backLabel} name={pilotName} initialTab={rankedOnly ? "ranked" : initialTab} rankedOnly={rankedOnly} />;
}

function AuthPanel({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [direct, setDirect] = useState(false);
  const [server, setServer] = useState(() => apiOrigin());
  const guest = async () => {
    setError(null); setBusy(true);
    try { const e = await guestLogin(); if (e) setError(e); } catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  };
  const google = async () => {
    setError(null); setBusy(true);
    try {
      const r = await authClient.managedAuth.signIn({ provider: "google" });
      if (r.error && r.error.code !== "POPUP_CLOSED") setError(r.error.message ?? "Login Google indisponível.");
      else if (!r.error) refreshSession();
    } catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setBusy(true);
    try {
      const opts = { onSuccess: captureBearer };
      const r = mode === "up"
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password }, opts)
        : await authClient.signIn.email({ email: email.trim(), password }, opts);
      if (r.error) setError(r.error.message ?? "Não foi possível entrar.");
      else refreshSession();
    } catch (err) { setError(errText(err)); }
    finally { setBusy(false); }
  };
  if (direct) return <DirectConnect onBack={() => setDirect(false)} />;
  return <div className="mo-screen mo-auth">
    <header className="mo-top"><button className="mo-ghost" onClick={onBack}>‹ VOLTAR</button><span>ARENA ONLINE</span></header>
    <div className="mo-auth-card">
      <p className="mo-kicker">PvP EM TEMPO REAL · SERVIDOR AUTORITATIVO</p>
      <h1>CONECTE SEU PILOTO</h1>
      <p className="mo-lead">Uma conta guarda vitórias, derrotas e a partida em andamento. O progresso offline continua no seu aparelho.</p>
      {LOCAL_BUILD && <form className="mo-join" onSubmit={e => { e.preventDefault(); setApiOrigin(server); window.location.reload(); }}>
        <input value={server} onChange={e => setServer(e.target.value)} placeholder="https://seu-jogo.runable.site" aria-label="Servidor" />
        <button className="mo-secondary">SERVIDOR</button>
      </form>}
      <button className="mo-primary" onClick={() => void guest()} disabled={busy}>{busy ? "CONECTANDO…" : "JOGAR COMO CONVIDADO"}</button>
      <button className="mo-google" onClick={google} disabled={busy}><span>G</span>CONTINUAR COM GOOGLE</button>
      <div className="mo-split"><span>OU E-MAIL</span></div>
      <div className="mo-tabs" role="tablist">
        <button role="tab" aria-selected={mode === "in"} onClick={() => setMode("in")}>ENTRAR</button>
        <button role="tab" aria-selected={mode === "up"} onClick={() => setMode("up")}>CRIAR CONTA</button>
      </div>
      <form onSubmit={submit} className="mo-form">
        {mode === "up" && <label>NOME DE PILOTO<input aria-label="Nome de piloto" value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={24} autoComplete="name" /></label>}
        <label>E-MAIL<input aria-label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
        <label>SENHA<input aria-label="Senha" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={10} autoComplete={mode === "up" ? "new-password" : "current-password"} /></label>
        {mode === "up" && <small>Mínimo de 10 caracteres.</small>}
        {error && <p className="mo-error" role="alert">{error}</p>}
        <button className="mo-secondary" disabled={busy}>{busy ? "AGUARDE…" : mode === "up" ? "CRIAR E ENTRAR" : "ENTRAR"}</button>
      </form>
      <button className="mo-ghost" onClick={() => setDirect(true)}>CONEXÃO DIRETA ENTRE APARELHOS (WebRTC)</button>
    </div>
  </div>;
}

function Lobby({ onBack, backLabel, name, initialTab, rankedOnly }: { onBack: () => void; backLabel: string; name: string; initialTab: LobbyTab; rankedOnly: boolean }) {
  const [team, setTeam] = useState<string[]>([]);
  const [tab, setTab] = useState<LobbyTab>(initialTab);
  const [code, setCode] = useState("");
  const [query, setQuery] = useState("");
  const [element, setElement] = useState<string>("");
  const [watching, setWatching] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [lobbyWaiting, setLobbyWaiting] = useState(false);
  const lobby = useOnlineLobby(true, lobbyWaiting);
  const queue = useQueueOnline(), join = useJoinRoom(), cancel = useCancelQueue(), vsBot = useVersusBot();
  const ticket = lobby.data?.ticket ?? null;
  const waiting = !!ticket && !ticket.matchId;
  useEffect(() => setLobbyWaiting(waiting), [waiting]);
  const activeMatch = ticket?.matchId && !ticket.matchFinished ? ticket.matchId : null;
  useEffect(() => { if (activeMatch) setWatching(activeMatch); }, [activeMatch]);
  const error = queue.error ?? join.error ?? cancel.error ?? lobby.error;
  /** Uma ação nova limpa erros antigos das outras, para a faixa mostrar só o que vale agora. */
  const fresh = () => { queue.reset(); join.reset(); cancel.reset(); };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATALOG_IDS.map(id => ROBOT_MAP[id]).filter(r => r && (!element || elementDef(r.element)?.id === element) && (!q || r.name.toLowerCase().includes(q)));
  }, [query, element]);
  const cap = tab === "duo" ? 1 : 4;
  const toggle = (id: string) => setTeam(t => t.includes(id) ? t.filter(x => x !== id) : cap === 1 ? [id] : t.length >= cap ? t : [...t, id]);

  const openMatch = useCallback((id: string) => setWatching(id), []);
  if (watching) return <OnlineBattle key={watching} id={watching} onNext={openMatch} onExit={() => { setWatching(null); void lobby.refetch(); }} />;
  const stats = lobby.data?.stats;
  const waitedS = ticket ? Math.max(0, Math.floor(((lobby.data?.serverNow ?? Date.now()) - ticket.joined) / 1000)) : 0;

  return <div className="mo-screen">
    <header className="mo-top">
      <button className="mo-ghost" onClick={onBack}>‹ {backLabel}</button>
      <span>{tab === "ranked" ? "RANQUEADA ONLINE" : "ARENA ONLINE"}</span>
      <button className="mo-ghost" onClick={() => void authClient.signOut()}>SAIR</button>
    </header>
    <section className="mo-pilot">
      <div><small>PILOTO</small><strong>{name}</strong></div>
      <div className="mo-record"><b>{lobby.data?.record.wins ?? 0}</b><small>V</small><b className="mo-loss">{lobby.data?.record.losses ?? 0}</b><small>D</small></div>
    </section>
    {stats && <p className="mo-stats"><span><b>{stats.live}</b> batalhas ao vivo</span><span><b>{stats.queued}</b> na fila</span><span><b>{stats.duoRooms}</b> salas 2v2</span></p>}
    {(tab === "ranked" || ticket?.kind === "ranked") && lobby.data?.ranked && <RankedCard me={lobby.data.ranked.me} />}
    {tab === "ranked" && <RankedRules />}
    <p className="mo-rules">Nível 10 fixo · sem treino, equipamentos, pets, cards ou itens · turno de 60 s · 3 turnos perdidos = derrota</p>

    {ticket?.matchId && ticket.matchFinished && <p className="mo-note">Última partida encerrada. Monte a equipe para jogar de novo.</p>}

    {waiting ? <section className="mo-wait">
      {ticket.kind === "private" && ticket.code ? <>
        <p className="mo-kicker">SALA PRIVADA · AGUARDANDO RIVAL</p>
        <button className="mo-code" onClick={() => { void navigator.clipboard?.writeText(ticket.code!).then(() => setCopied(true), () => setCopied(false)); }} aria-label={`Código ${ticket.code}, copiar`}>{ticket.code}</button>
        <small>{copied ? "CÓDIGO COPIADO" : "Toque para copiar e envie ao oponente. Mantenha esta tela aberta."}</small>
      </> : <>
        <p className="mo-kicker">{ticket.kind === "ranked" ? "FILA RANQUEADA · RATING " + (lobby.data?.ranked.me.rating ?? "") : "FILA PÚBLICA"}</p>
        <div className="mo-scan" aria-hidden><i /><i /><i /><i /><i /></div>
        <strong>PROCURANDO OPONENTE · {ticket.team.length}v{ticket.team.length}</strong>
        <small>{waitedS} s na fila · {stats?.queued ?? 0} na fila agora</small>
        {waitedS >= 10 && ticket.kind !== "ranked" && <button className="mo-primary" disabled={vsBot.isPending} onClick={() => vsBot.mutate({}, { onSuccess: r => setWatching(r.matchId) })}>JOGAR CONTRA IA AGORA</button>}
      </>}
      <div className="mo-wait-team">{ticket.team.map(id => <img key={id} src={faceUrl(id)} alt={ROBOT_MAP[id]?.name ?? id} />)}</div>
      <button className="mo-secondary" disabled={cancel.isPending} onClick={() => { fresh(); cancel.mutate({}); }}>CANCELAR</button>
    </section> : <>
      {!rankedOnly && <div className="mo-tabs mo-tabs4" role="tablist">
        <button role="tab" aria-selected={tab === "ranked"} onClick={() => setTab("ranked")}>RANQUEADA</button>
        <button role="tab" aria-selected={tab === "public"} onClick={() => setTab("public")}>FILA PÚBLICA</button>
        <button role="tab" aria-selected={tab === "private"} onClick={() => setTab("private")}>SALA PRIVADA</button>
        <button role="tab" aria-selected={tab === "duo"} onClick={() => { setTab("duo"); setTeam(t => t.slice(0, 1)); }}>DUPLAS 2v2</button>
      </div>}
      {tab === "duo" ? <DuoPanel robot={team[0] ?? null} onMatch={openMatch} /> : <><section className="mo-team" aria-label="Equipe online">
        {[0, 1, 2, 3].map(i => { const id = team[i]; return <button key={i} className="mo-slot" disabled={!id} onClick={() => id && toggle(id)} aria-label={id ? `Remover ${ROBOT_MAP[id]?.name}` : `Vaga ${i + 1} livre`}>
          {id ? <><img src={faceUrl(id)} alt="" /><span>{ROBOT_MAP[id]?.name}</span></> : <span className="mo-empty">{String(i + 1).padStart(2, "0")}</span>}
        </button>; })}
      </section>
      <div className="mo-actions">
        {tab === "ranked"
          ? <button className="mo-primary" disabled={!team.length || queue.isPending} onClick={() => { fresh(); queue.mutate({ team, privateRoom: false, ranked: true }); }}>BUSCAR RANQUEADA {team.length ? `${team.length}v${team.length}` : ""}</button>
          : tab === "public"
          ? <button className="mo-primary" disabled={!team.length || queue.isPending} onClick={() => { fresh(); queue.mutate({ team, privateRoom: false }); }}>BUSCAR PARTIDA {team.length ? `${team.length}v${team.length}` : ""}</button>
          : <>
            <button className="mo-primary" disabled={!team.length || queue.isPending} onClick={() => { fresh(); setCopied(false); queue.mutate({ team, privateRoom: true }); }}>CRIAR SALA</button>
            <form className="mo-join" onSubmit={e => { e.preventDefault(); fresh(); join.mutate({ team, code: code.trim() }, { onSuccess: r => setWatching(r.matchId) }); }}>
              <input value={code} onChange={e => setCode(e.target.value.replace(/[^0-9a-f]/gi, "").slice(0, 10).toUpperCase())} placeholder="CÓDIGO" aria-label="Código da sala" />
              <button className="mo-secondary" disabled={!team.length || code.length !== 10 || join.isPending}>ENTRAR</button>
            </form>
          </>}
      </div></>}
    </>}
    {error && <p className="mo-error" role="alert">{errText(error)}</p>}

    {!waiting && <section className="mo-roster" aria-label="Catálogo competitivo">
      <div className="mo-filter">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar entre 256 robôs" aria-label="Buscar robô" />
        <select value={element} onChange={e => setElement(e.target.value)} aria-label="Filtrar por elemento">
          <option value="">TODOS</option>
          {ELEMENTS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
      </div>
      <div className="mo-grid">{list.map(r => { const el = elementDef(r.element); const on = team.includes(r.id); return <button key={r.id} className="mo-pick" aria-pressed={on} disabled={!on && cap > 1 && team.length >= cap} onClick={() => toggle(r.id)} style={{ ["--el" as string]: el?.color ?? "#35e2f0" }}>
        <img src={faceUrl(r.id)} alt="" loading="lazy" /><span>{r.name}</span><small>{el?.abbr ?? r.element}</small>
      </button>; })}</div>
      {!list.length && <p className="mo-note">Nenhum robô encontrado.</p>}
    </section>}

    {tab === "ranked" && lobby.data?.ranked && <RankedLeaders leaders={lobby.data.ranked.leaders} />}
    {tab !== "ranked" && !!lobby.data?.leaders.length && <section className="mo-leaders"><h3>TOP PILOTOS</h3><ol>{lobby.data.leaders.map((l, i) => <li key={i}><span>{l.name}</span><b>{l.wins}V</b><small>{l.losses}D</small></li>)}</ol></section>}
  </div>;
}
