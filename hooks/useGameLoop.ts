import { useEffect } from "react";
import { useGameStore, useGameStoreActions } from "@/store/gameStore";
import { getRoundTimings } from "@/lib/rhythmDifficulty";

export const useGameLoop = () => {
  const isPlaying = useGameStore((s) => s.isPlaying);
  const phase = useGameStore((s) => s.phase);
  const score = useGameStore((s) => s.score);
  const { advancePhase } = useGameStoreActions();

  useEffect(() => {
    if (!isPlaying || phase === "idle") return;

    const timings = getRoundTimings(score);
    const duration =
      phase === "scissors" ? timings.graceAfter : timings.beatInterval;

    const timer = setTimeout(() => {
      advancePhase();
    }, duration);

    return () => clearTimeout(timer);
  }, [isPlaying, phase, score, advancePhase]);
};
