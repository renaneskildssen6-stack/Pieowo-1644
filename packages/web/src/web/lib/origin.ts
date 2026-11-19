/**
 * Origem do servidor online. Na web é a própria página; no APK (file://) usa
 * VITE_PUBLIC_API_ORIGIN ou o endereço salvo pelo jogador em "mecha.apiOrigin".
 */
export const LOCAL_BUILD = typeof window !== "undefined" && (window.location.protocol === "file:" || window.location.origin === "null");
const ORIGIN_KEY = "mecha.apiOrigin";
function clean(url: string | null | undefined) {
  const v = (url ?? "").trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(v) ? v : "";
}
export function apiOrigin(): string {
  if (!LOCAL_BUILD) return window.location.origin;
  let saved = "";
  try { saved = clean(localStorage.getItem(ORIGIN_KEY)); } catch { /* sem storage */ }
  return saved || clean(import.meta.env.VITE_PUBLIC_API_ORIGIN as string | undefined) || "http://localhost";
}
export function setApiOrigin(url: string) {
  const v = clean(url);
  if (v) localStorage.setItem(ORIGIN_KEY, v); else localStorage.removeItem(ORIGIN_KEY);
  return v;
}
