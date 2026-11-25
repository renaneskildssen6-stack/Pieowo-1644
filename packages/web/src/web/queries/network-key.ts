import { createContext, useContext } from "react";
export const NetworkAccount = createContext("");
export function useAccountQuery<T extends {queryKey: readonly unknown[]}>(opts: T) {
  const id = useContext(NetworkAccount);
  return { ...opts, queryKey: [...opts.queryKey, id] };
}
