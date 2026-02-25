import { useEffect } from "react";
import { useGameStore } from "@/store/gameStore";

const ROCK_DURATION = 800;
const PAPER_DURATION = 800;
const SCISSORS_DURATION = 1200;
const RESULT_DURATION = 1000;

export const useGameLoop = () => {
  const isPlaying = useGameStore((s) => s.isPlaying);
  const phase = useGameStore((s) => s.phase);

  useEffect(() => {
    if (!isPlaying) return;

    let timer: ReturnType<typeof setTimeout>;

    if (phase === "rock") {
      timer = setTimeout(() => {
        useGameStore.getState().setPhase("paper");
      }, ROCK_DURATION);
    } else if (phase === "paper") {
      timer = setTimeout(() => {
        useGameStore.getState().setPhase("scissors");
      }, PAPER_DURATION);
    } else if (phase === "scissors") {
      timer = setTimeout(() => {
        useGameStore.getState().processRound();
      }, SCISSORS_DURATION);
    } else if (phase === "result") {
      timer = setTimeout(() => {
        useGameStore.getState().setPhase("rock");
      }, RESULT_DURATION);
    }

    return () => clearTimeout(timer);
  }, [isPlaying, phase]);
};
