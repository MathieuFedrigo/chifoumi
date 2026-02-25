import { useEffect } from "react";
import {
  useGameStore,
  useGameStoreActions,
  ROCK_DURATION,
  PAPER_DURATION,
  SCISSORS_DURATION,
  RESULT_DURATION,
} from "@/store/gameStore";

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
