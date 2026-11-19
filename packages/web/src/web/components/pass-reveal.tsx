import { useEffect } from "react";
import { createPortal } from "react-dom";
import { mergeRewards, rewardIcon, rewardText, type Reward } from "@/game/pass";

/** Pop-up de revelação: raios girando, ícones entrando em escala, toque para fechar. */
export function PassReveal({ title, rewards, onClose }: { title: string; rewards: Reward[]; onClose: () => void }) {
  const list = mergeRewards(rewards);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [onClose]);
  return createPortal(<div className="ps-reveal" role="dialog" aria-label="Recompensas recebidas" onPointerDown={(e) => { e.stopPropagation(); onClose(); }}>
    <div className="ps-rays" aria-hidden />
    <div className="ps-burst" aria-hidden>{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ ["--a" as string]: `${i * 30}deg`, ["--d" as string]: `${(i % 3) * 40}ms` }} />)}</div>
    <b className="ps-reveal-t">{title}</b>
    <div className="ps-reveal-list">
      {list.map((r, i) => <div key={i} className="ps-reveal-item" style={{ ["--i" as string]: i }}>
        <span><img src={rewardIcon(r)} alt="" /></span>
        <small>{rewardText(r)}</small>
      </div>)}
    </div>
    <em>TOQUE PARA CONTINUAR</em>
  </div>, document.body);
}
