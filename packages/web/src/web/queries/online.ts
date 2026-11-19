import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { client, orpc } from "../lib/api";
import type { OnlineMatchView } from "../../api/online/service";

/** Lobby: fila/sala atual, partida retomável, V/D e ranking. Polling também mantém o lugar na fila. */
export function useOnlineLobby(enabled: boolean, waiting: boolean) {
  return useQuery({ ...orpc.online.lobby.queryOptions(), enabled, refetchInterval: waiting ? 2000 : 15000, refetchIntervalInBackground: true, retry: 1 });
}
/** Estado autoritativo + long-poll: o servidor segura a requisição até a partida mudar (resposta em ~0,5 s). */
export function useOnlineMatch(id: string | null) {
  const qc = useQueryClient();
  const query = useQuery({ ...orpc.online.state.queryOptions({ input: { id: id ?? "" } }), enabled: !!id, refetchInterval: 20000, refetchIntervalInBackground: true, retry: 2 });
  useEffect(() => {
    if (!id) return;
    let alive = true;
    const key = orpc.online.state.queryKey({ input: { id } });
    void (async () => {
      let fails = 0;
      while (alive) {
        const cur = qc.getQueryData<OnlineMatchView>(key);
        if (!cur) { await new Promise(r => setTimeout(r, 400)); continue; }
        if (cur.finished && (cur.nextId || cur.rematchMine === false)) { await new Promise(r => setTimeout(r, 1500)); }
        try {
          const chatAt = cur.chat.length ? cur.chat[cur.chat.length - 1].at : 0;
          const next = await client.online.wait({ id, revision: cur.revision, chatAt });
          if (alive) qc.setQueryData(key, next); fails = 0;
        } catch { fails++; await new Promise(r => setTimeout(r, Math.min(8000, 800 * fails))); }
      }
    })();
    return () => { alive = false; };
  }, [id, qc]);
  return query;
}
export function useEmote() { return useMutation(orpc.online.emote.mutationOptions()); }
export function useRematch() { return useMutation(orpc.online.rematch.mutationOptions()); }
export function useVersusBot() {
  const done = useLobbyInvalidate();
  return useMutation(orpc.online.vsBot.mutationOptions({ onSuccess: done }));
}
/** Sala DUPLAS 2v2: polling a cada 1,5 s mantém o assento vivo. */
export function useDuoRoom(code: string | null) {
  return useQuery({ ...orpc.online.duoRoom.queryOptions({ input: { code: code ?? "" } }), enabled: !!code, refetchInterval: 1500, refetchIntervalInBackground: true, retry: 0 });
}
export function useDuoMutations() {
  return {
    create: useMutation(orpc.online.duoCreate.mutationOptions()),
    join: useMutation(orpc.online.duoJoin.mutationOptions()),
    seat: useMutation(orpc.online.duoSeat.mutationOptions()),
    start: useMutation(orpc.online.duoStart.mutationOptions()),
    leave: useMutation(orpc.online.duoLeave.mutationOptions()),
  };
}
function useLobbyInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: orpc.online.lobby.key() });
}
export function useQueueOnline() {
  const done = useLobbyInvalidate();
  return useMutation(orpc.online.queue.mutationOptions({ onSuccess: done }));
}
export function useJoinRoom() {
  const done = useLobbyInvalidate();
  return useMutation(orpc.online.join.mutationOptions({ onSuccess: done }));
}
export function useCancelQueue() {
  const done = useLobbyInvalidate();
  return useMutation(orpc.online.cancel.mutationOptions({ onSuccess: done }));
}
export function useOnlineAction() {
  const qc = useQueryClient();
  return useMutation(orpc.online.action.mutationOptions({
    onSuccess: view => qc.setQueryData(orpc.online.state.queryKey({ input: { id: view.id } }), view),
  }));
}
export function useSurrender() {
  const qc = useQueryClient();
  return useMutation(orpc.online.surrender.mutationOptions({
    onSuccess: view => { qc.setQueryData(orpc.online.state.queryKey({ input: { id: view.id } }), view); void qc.invalidateQueries({ queryKey: orpc.online.lobby.key() }); },
  }));
}
