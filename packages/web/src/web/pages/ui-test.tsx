import { useEffect } from "react";
import { PassHub } from "@/components/pass-hub";
import { LabScreen } from "@/screens/lab";
import { SkinsScreen } from "@/screens/meta";
import { RankedScreen } from "@/screens/ranked";
import { RosterScreen } from "@/screens/roster";
import { StoryScreen } from "@/screens/story";
import { setState, unlockRobot, setTeam, getState } from "@/game/save";

/** Página de dev para inspecionar telas isoladas (?v=pass | ?v=lab | ?v=skins | ?v=ranked | ?v=seed → cidade com save de teste). */
export default function UiTest() {
  const v = new URLSearchParams(location.search).get("v") ?? "pass";
  useEffect(() => {
    if (v === "labrich") { setState(s => ({ ...s, gold: 50000, mining: { ...s.mining, bars: { ...s.mining.bars, [Object.keys(s.mining.bars)[0] ?? "iron"]: 60 } } })); return; }
    if (v !== "seed") return;
    setState(s => ({ ...s, playerLevel: 30, gold: 20000, tutorial: { ...s.tutorial, started: true, completed: true } }));
    ["aurorion", "voltronin", "pyrokaiser", "cryolance"].forEach(unlockRobot);
    setTeam(getState().robots.slice(0, 3).map(r => r.id));
    location.href = `/?entry=${new URLSearchParams(location.search).get("to") ?? "city"}`;
  }, [v]);
  return <div className="mk-root" style={{ position: "fixed", inset: 0, background: "#050b14", overflow: "hidden" }}>
    {v === "hangar" ? <RosterScreen onBack={() => {}} /> : v === "skins" ? <SkinsScreen onBack={() => {}} /> : v === "ranked" ? <RankedScreen onBack={() => {}} /> : v === "story" ? <StoryScreen onBack={() => {}} /> : v === "lab" || v === "labrich" ? <LabScreen onBack={() => {}} /> : v === "seed" ? null : <div style={{ position: "absolute", inset: 0 }}><PassHub /></div>}
  </div>;
}
