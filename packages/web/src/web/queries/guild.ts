import { useQuery } from "@tanstack/react-query";
import { client, orpc } from "@/lib/api";
import { useAccountQuery } from "./network-key";
export const guildApi = client.guild;
export const useGuildHome = (enabled = true) => useQuery(useAccountQuery({...orpc.guild.home.queryOptions(), enabled, refetchInterval: 10000}));
export const useGuildList = (term: string, enabled: boolean) => useQuery(useAccountQuery({...orpc.guild.list.queryOptions({input:{term}}), enabled, refetchInterval: 15000}));
export const useGuildStatus = (enabled: boolean, fast: boolean) => useQuery(useAccountQuery({...orpc.guild.status.queryOptions(), enabled, refetchInterval: fast ? 3000 : 9000}));
export const useGuildRooms = (enabled: boolean) => useQuery(useAccountQuery({...orpc.guild.rooms.queryOptions(), enabled, refetchInterval: 3000}));
