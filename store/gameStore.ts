import { create } from "zustand";
import * as Sentry from "@sentry/react-native";
import { getRoundTimings } from "@/lib/rhythmDifficulty";

export type Choice = "rock" | "paper" | "scissors";
export type GamePhase = "idle" | "rock" | "paper" | "scissors" | "result";
export type RoundResult = "win" | "lose" | "draw";
export type MistakeReason = "too_early" | "too_late" | "wrong_type";
export type Direction = "up" | "down" | "left" | "right";
export type GameMode = "classic" | "directions";

type ClassicModeData = {
  gameMode: "classic";
  playerInput: Choice | null;
  aiInput: Choice | null;
  roundResult: RoundResult | null;
};

type DirectionsRpsPhase = {
  gameMode: "directions";
  isDirectionRound: false;
  playerInput: Choice | null;
  aiInput: Choice | null;
  roundResult: RoundResult | null;
  directionAttemptsLeft: number;
};

type DirectionsDirectionPhase = {
  gameMode: "directions";
  isDirectionRound: true;
  playerInput: Direction | null;
  aiInput: Direction | null;
  pendingRpsResult: RoundResult;
  directionAttemptsLeft: number;
};

export type ModeData = ClassicModeData | DirectionsRpsPhase | DirectionsDirectionPhase;

interface GameActions {
  startGame: (mode?: GameMode) => void;
  makeChoice: (choice: Choice) => void;
  makeDirectionChoice: (direction: Direction) => void;
  advancePhase: () => void;
  endGame: (reason: MistakeReason) => void;
}

interface GameState {
  phase: GamePhase;
  score: number;
  isPlaying: boolean;
  mistakeReason: MistakeReason | null;
  phaseStartedAt: number;
  modeData: ModeData;
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
const DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

export const getRandomChoice = (): Choice => {
  return CHOICES[Math.floor(Math.random() * CHOICES.length)]!;
};

export const getRandomDirection = (): Direction => {
  return DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)]!;
};

const CLASSIC_RESET: ClassicModeData = {
  gameMode: "classic",
  playerInput: null,
  aiInput: null,
  roundResult: null,
};

const DIRECTIONS_RPS_RESET: DirectionsRpsPhase = {
  gameMode: "directions",
  isDirectionRound: false,
  playerInput: null,
  aiInput: null,
  roundResult: null,
  directionAttemptsLeft: 2,
};

const isGracePeriodActive = (phaseStartedAt: number, score: number): boolean => {
  const { beatInterval, graceBefore } = getRoundTimings(score);
  return Date.now() - phaseStartedAt >= beatInterval - graceBefore;
};

const buildRpsInputData = (
  modeData: ClassicModeData | DirectionsRpsPhase,
  choice: Choice,
  ai: Choice
): ClassicModeData | DirectionsRpsPhase => {
  const roundResult = determineResult(choice, ai);
  if (modeData.gameMode === "classic") {
    return { gameMode: "classic", playerInput: choice, aiInput: ai, roundResult };
  }
  return {
    gameMode: "directions",
    isDirectionRound: false,
    playerInput: choice,
    aiInput: ai,
    roundResult,
    directionAttemptsLeft: modeData.directionAttemptsLeft,
  };
};

export const useGameStore = create<GameState>()((set, get) => ({
  phase: "idle",
  score: 0,
  isPlaying: false,
  mistakeReason: null,
  phaseStartedAt: Date.now(),
  modeData: CLASSIC_RESET,

  actions: {
    startGame: (mode: GameMode = "classic") => {
      Sentry.addBreadcrumb({
        category: "game",
        message: "Game started",
        level: "info",
      });
      set({
        phase: "rock",
        score: 0,
        isPlaying: true,
        mistakeReason: null,
        phaseStartedAt: Date.now(),
        modeData: mode === "classic" ? CLASSIC_RESET : DIRECTIONS_RPS_RESET,
      });
    },

    makeChoice: (choice: Choice) => {
      const { phase, score, phaseStartedAt, modeData, actions: { endGame } } = get();
      if (phase === "rock") return endGame("too_early");
      if (phase === "paper") {
        if (!isGracePeriodActive(phaseStartedAt, score)) return endGame("too_early");
        // grace period — treat as valid scissors input
        if (modeData.gameMode === "directions" && modeData.isDirectionRound) return endGame("wrong_type");
        const ai = getRandomChoice();
        set({ modeData: buildRpsInputData(modeData, choice, ai), phase: "scissors", phaseStartedAt: Date.now() });
        return;
      }
      if (phase !== "scissors") return;
      // In directions mode, RPS press during direction round = wrong_type (check before playerInput guard)
      if (modeData.gameMode === "directions" && modeData.isDirectionRound) return endGame("wrong_type");
      if (modeData.playerInput !== null) return;
      set({ modeData: buildRpsInputData(modeData, choice, getRandomChoice()) });
      // phase stays "scissors" — beat timer will advance to result naturally
    },

    makeDirectionChoice: (direction: Direction) => {
      const { phase, score, phaseStartedAt, modeData, actions: { endGame } } = get();
      if (modeData.gameMode !== "directions") return;
      if (phase === "rock") return endGame("too_early");
      if (phase === "paper") {
        if (!isGracePeriodActive(phaseStartedAt, score)) return endGame("too_early");
        // grace period
        if (!modeData.isDirectionRound) return endGame("wrong_type");
        if (modeData.playerInput !== null) return;
        set({
          modeData: { ...modeData, playerInput: direction, aiInput: getRandomDirection() },
          phase: "scissors",
          phaseStartedAt: Date.now(),
        });
        return;
      }
      if (phase !== "scissors") return;
      if (!modeData.isDirectionRound) return endGame("wrong_type");
      if (modeData.playerInput !== null) return;
      set({
        modeData: { ...modeData, playerInput: direction, aiInput: getRandomDirection() },
      });
      // phase stays "scissors" — beat timer will advance to result naturally
    },

    advancePhase: () => {
      const { phase, modeData, actions: { endGame } } = get();

      if (phase === "rock") return set({ phase: "paper", phaseStartedAt: Date.now() });
      if (phase === "paper") return set({ phase: "scissors", phaseStartedAt: Date.now() });
      if (phase === "scissors") {
        if (modeData.playerInput !== null) {
          set({ phase: "result", phaseStartedAt: Date.now() });
        } else {
          endGame("too_late");
        }
        return;
      }
      if (phase !== "result") return;

      if (modeData.gameMode === "classic") return set((s) => ({ phase: "rock", score: s.score + 1, modeData: CLASSIC_RESET, phaseStartedAt: Date.now() }));

      if (!modeData.isDirectionRound) {
        // DirectionsRpsPhase result
        if (modeData.roundResult === "draw") return set((s) => ({ phase: "rock", score: s.score + 1, modeData: DIRECTIONS_RPS_RESET, phaseStartedAt: Date.now() }));
        // win or lose → enter direction phase
        set({
          phase: "rock",
          modeData: {
            gameMode: "directions",
            isDirectionRound: true,
            playerInput: null,
            aiInput: null,
            pendingRpsResult: modeData.roundResult!,
            directionAttemptsLeft: 2,
          },
          phaseStartedAt: Date.now(),
        });
        return;
      }

      // DirectionsDirectionPhase result
      const matched = modeData.playerInput === modeData.aiInput;
      if (matched) {
        const scoreIncrease = modeData.pendingRpsResult === "win" ? 1 : 0;
        set((s) => ({ phase: "rock", score: s.score + scoreIncrease, modeData: DIRECTIONS_RPS_RESET, phaseStartedAt: Date.now() }));
        return;
      }
      // more attempts: new direction round
      if (modeData.directionAttemptsLeft > 1) return set({
        phase: "rock",
        modeData: { ...modeData, playerInput: null, aiInput: null, directionAttemptsLeft: modeData.directionAttemptsLeft - 1 },
        phaseStartedAt: Date.now(),
      });
      // no more attempts: round voided
      set({ phase: "rock", modeData: DIRECTIONS_RPS_RESET, phaseStartedAt: Date.now() });
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
