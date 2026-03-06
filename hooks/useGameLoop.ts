import { useEffect } from "react";
import { useGameStore, useGameStoreActions } from "@/store/gameStore";
import { getRoundTimings } from "@/lib/rhythmDifficulty";
import { getChoosePhase } from "@/store/helpers/getNext";

export const useGameLoop = () => {
  const isPlaying = useGameStore((s) => s.isPlaying);
  const phase = useGameStore((s) => s.phase);
  const score = useGameStore((s) => s.score);
  const modeData = useGameStore((s) => s.modeData);
  const { advancePhase, endGame } = useGameStoreActions();

  const isChoosePhase = phase === getChoosePhase(modeData);

  // Main beat timer — all phases use beatInterval
  useEffect(() => {
    if (!isPlaying || phase === "idle") return;

    const { beatInterval } = getRoundTimings(score);

    const timer = setTimeout(() => {
      advancePhase();
    }, beatInterval);

    return () => clearTimeout(timer);
  }, [isPlaying, phase, score, advancePhase]);

  // Grace deadline timer — only during choose phase
  useEffect(() => {
    if (!isPlaying || !isChoosePhase) return;

    const { graceAfter } = getRoundTimings(score);

    const timer = setTimeout(() => {
      const state = useGameStore.getState();
      if (state.modeData.playerInput === null) {
        endGame("too_late");
      }
    }, graceAfter);

    return () => clearTimeout(timer);
  }, [isPlaying, isChoosePhase, score, endGame]);
};
