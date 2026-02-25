import { create } from "zustand";
import * as Sentry from "@sentry/react-native";

export type Choice = "rock" | "paper" | "scissors";
export type GamePhase = "idle" | "rock" | "paper" | "scissors" | "result";
export type RoundResult = "win" | "lose" | "draw";
export type MistakeReason = "too_early" | "too_late";

interface GameActions {
  startGame: () => void;
  makeChoice: (choice: Choice) => void;
  advancePhase: () => void;
  endGame: (reason: MistakeReason) => void;
}

interface GameState {
  phase: GamePhase;
  score: number;
  isPlaying: boolean;
  playerChoice: Choice | null;
  aiChoice: Choice | null;
  roundResult: RoundResult | null;
  mistakeReason: MistakeReason | null;
  actions: GameActions;
}

export const determineResult = (player: Choice, ai: Choice): RoundResult => {
  if (player === ai) return "draw";
  if (
    (player === "rock" && ai === "scissors") ||
    (player === "paper" && ai === "rock") ||
    (player === "scissors" && ai === "paper")
  ) {
    return "win";
  }
  return "lose";
};

const CHOICES: Choice[] = ["rock", "paper", "scissors"];

export const getRandomChoice = (): Choice => {
  return CHOICES[Math.floor(Math.random() * CHOICES.length)]!;
};

export const useGameStore = create<GameState>()((set, get) => ({
  phase: "idle",
  score: 0,
  isPlaying: false,
  playerChoice: null,
  aiChoice: null,
  roundResult: null,
  mistakeReason: null,

  actions: {
    startGame: () => {
      Sentry.addBreadcrumb({
        category: "game",
        message: "Game started",
        level: "info",
      });
      set({
        phase: "rock",
        score: 0,
        isPlaying: true,
        playerChoice: null,
        aiChoice: null,
        roundResult: null,
        mistakeReason: null,
      });
    },

    makeChoice: (choice: Choice) => {
      const { phase } = get();
      if (phase === "rock" || phase === "paper") {
        get().actions.endGame("too_early");
        return;
      }
      if (phase !== "scissors") return;
      const ai = getRandomChoice();
      const result = determineResult(choice, ai);
      set({
        playerChoice: choice,
        aiChoice: ai,
        roundResult: result,
        phase: "result",
      });
    },

    advancePhase: () => {
      const { phase, playerChoice } = get();
      if (phase === "rock") {
        set({ phase: "paper" });
      } else if (phase === "paper") {
        set({ phase: "scissors" });
      } else if (phase === "scissors") {
        if (playerChoice === null) {
          get().actions.endGame("too_late");
        }
      } else if (phase === "result") {
        set((state) => ({
          phase: "rock",
          score: state.score + 1,
          playerChoice: null,
          aiChoice: null,
          roundResult: null,
        }));
      }
    },

    endGame: (reason: MistakeReason) => {
      Sentry.addBreadcrumb({
        category: "game",
        message: `Game ended: ${reason}`,
        level: "info",
        data: { score: get().score, reason },
      });
      set({
        isPlaying: false,
        phase: "idle",
        mistakeReason: reason,
      });
    },
  },
}));

export const useGameStoreActions = () => useGameStore((s) => s.actions);
