import { create } from "zustand";
import * as Sentry from "@sentry/react-native";

export type Choice = "rock" | "paper" | "scissors";
export type GamePhase = "idle" | "rock" | "paper" | "scissors" | "result";
export type RoundResult = "win" | "lose" | "draw";
export type MistakeReason = "too_early" | "too_late";

export const ROCK_DURATION = 800;
export const PAPER_DURATION = 800;
export const SCISSORS_DURATION = 800;
export const RESULT_DURATION = 1000;
export const INPUT_GRACE_BEFORE_SCISSORS = 150;

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
  phaseStartedAt: number;
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
  phaseStartedAt: Date.now(),

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
        phaseStartedAt: Date.now(),
      });
    },

    makeChoice: (choice: Choice) => {
      const { phase, phaseStartedAt } = get();
      if (phase === "rock") {
        get().actions.endGame("too_early");
        return;
      }
      if (phase === "paper") {
        const elapsed = Date.now() - phaseStartedAt;
        if (elapsed < PAPER_DURATION - INPUT_GRACE_BEFORE_SCISSORS) {
          get().actions.endGame("too_early");
        } else {
          // grace period — treat as valid scissors input
          const ai = getRandomChoice();
          const result = determineResult(choice, ai);
          set({
            playerChoice: choice,
            aiChoice: ai,
            roundResult: result,
            phase: "result",
          });
        }
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
        set({ phase: "paper", phaseStartedAt: Date.now() });
      } else if (phase === "paper") {
        set({ phase: "scissors", phaseStartedAt: Date.now() });
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
          phaseStartedAt: Date.now(),
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
        phaseStartedAt: Date.now(),
      });
    },
  },
}));

export const useGameStoreActions = () => useGameStore((s) => s.actions);
