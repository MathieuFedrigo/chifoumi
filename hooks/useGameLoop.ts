import { useEffect } from "react";
import { useGameStore, useGameStoreActions } from "@/store/gameStore";
import { getRoundTimings } from "@/lib/rhythmDifficulty";

export const useGameLoop = () => {
  const isPlaying = useGameStore((s) => s.isPlaying);
  const phase = useGameStore((s) => s.phase);
  const score = useGameStore((s) => s.score);
  const { advancePhase, endGame } = useGameStoreActions();

  // Main beat timer — all phases use beatInterval
  useEffect(() => {
    if (!isPlaying || phase === "idle") return;

    const { beatInterval } = getRoundTimings(score);

    const timer = setTimeout(() => {
      advancePhase();
    }, beatInterval);

    return () => clearTimeout(timer);
  }, [isPlaying, phase, score, advancePhase]);

  // Grace deadline timer — only during scissors phase
  useEffect(() => {
    if (!isPlaying || phase !== "scissors") return;

    const { graceAfter } = getRoundTimings(score);

    const timer = setTimeout(() => {
      const { playerChoice } = useGameStore.getState();
      if (playerChoice === null) {
        endGame("too_late");
      }
    }, graceAfter);

    return () => clearTimeout(timer);
  }, [isPlaying, phase, score, endGame]);
};
