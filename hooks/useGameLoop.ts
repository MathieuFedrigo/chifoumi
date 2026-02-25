import { useEffect } from "react";
import { useGameStore, useGameStoreActions } from "@/store/gameStore";

const ROCK_DURATION = 800;
const PAPER_DURATION = 800;
const SCISSORS_DURATION = 1200;
const RESULT_DURATION = 1000;

export const useGameLoop = () => {
  const isPlaying = useGameStore((s) => s.isPlaying);
  const phase = useGameStore((s) => s.phase);
  const { advancePhase } = useGameStoreActions();

  useEffect(() => {
    if (!isPlaying || phase === "idle") return;

    const duration =
      phase === "rock" ? ROCK_DURATION :
      phase === "paper" ? PAPER_DURATION :
      phase === "scissors" ? SCISSORS_DURATION :
      RESULT_DURATION;

    const timer = setTimeout(() => {
      advancePhase();
    }, duration);

    return () => clearTimeout(timer);
  }, [isPlaying, phase, advancePhase]);
};
