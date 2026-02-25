import { create } from "zustand";
import * as Sentry from "@sentry/react-native";
import { getRoundTimings } from "@/lib/rhythmDifficulty";

export type Choice = "rock" | "paper" | "scissors";
export type GamePhase = "idle" | "rock" | "paper" | "scissors" | "result";
export type RoundResult = "win" | "lose" | "draw";
export type MistakeReason = "too_early" | "too_late" | "wrong_type";
export type Direction = "up" | "down" | "left" | "right";
export type GameMode = "classic" | "directions";

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
  playerChoice: Choice | null;
  aiChoice: Choice | null;
  roundResult: RoundResult | null;
  mistakeReason: MistakeReason | null;
  phaseStartedAt: number;
  gameMode: GameMode;
  isDirectionRound: boolean;
  pendingRpsResult: RoundResult | null;
  directionAiChoice: Direction | null;
  playerDirectionChoice: Direction | null;
  directionAttemptsLeft: number;
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

export const useGameStore = create<GameState>()((set, get) => ({
  phase: "idle",
  score: 0,
  isPlaying: false,
  playerChoice: null,
  aiChoice: null,
  roundResult: null,
  mistakeReason: null,
  phaseStartedAt: Date.now(),
  gameMode: "classic",
  isDirectionRound: false,
  pendingRpsResult: null,
  directionAiChoice: null,
  playerDirectionChoice: null,
  directionAttemptsLeft: 2,

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
        playerChoice: null,
        aiChoice: null,
        roundResult: null,
        mistakeReason: null,
        phaseStartedAt: Date.now(),
        gameMode: mode,
        isDirectionRound: false,
        pendingRpsResult: null,
        directionAiChoice: null,
        playerDirectionChoice: null,
        directionAttemptsLeft: 2,
      });
    },

    makeChoice: (choice: Choice) => {
      const { phase, score, phaseStartedAt, playerChoice, isDirectionRound, gameMode } = get();
      if (phase === "rock") {
        get().actions.endGame("too_early");
        return;
      }
      if (phase === "paper") {
        const elapsed = Date.now() - phaseStartedAt;
        const timings = getRoundTimings(score);
        if (elapsed < timings.beatInterval - timings.graceBefore) {
          get().actions.endGame("too_early");
        } else {
          // grace period — treat as valid scissors input
          if (gameMode === "directions" && isDirectionRound) {
            get().actions.endGame("wrong_type");
            return;
          }
          const ai = getRandomChoice();
          const result = determineResult(choice, ai);
          set({
            playerChoice: choice,
            aiChoice: ai,
            roundResult: result,
            phase: "scissors",
            phaseStartedAt: Date.now(),
          });
        }
        return;
      }
      if (phase !== "scissors" || playerChoice !== null) return;
      // In directions mode, RPS press during direction round = wrong_type
      if (gameMode === "directions" && isDirectionRound) {
        get().actions.endGame("wrong_type");
        return;
      }
      const ai = getRandomChoice();
      set({
        playerChoice: choice,
        aiChoice: ai,
        roundResult: determineResult(choice, ai),
      });
      // phase stays "scissors" — beat timer will advance to result naturally
    },

    makeDirectionChoice: (direction: Direction) => {
      const { phase, score, phaseStartedAt, playerDirectionChoice, isDirectionRound, gameMode } = get();
      if (gameMode !== "directions") return;
      if (phase === "rock") {
        get().actions.endGame("too_early");
        return;
      }
      if (phase === "paper") {
        const elapsed = Date.now() - phaseStartedAt;
        const timings = getRoundTimings(score);
        if (elapsed < timings.beatInterval - timings.graceBefore) {
          get().actions.endGame("too_early");
          return;
        }
        // grace period
        if (!isDirectionRound) {
          get().actions.endGame("wrong_type");
          return;
        }
        if (playerDirectionChoice !== null) return;
        set({
          playerDirectionChoice: direction,
          directionAiChoice: getRandomDirection(),
          phase: "scissors",
          phaseStartedAt: Date.now(),
        });
        return;
      }
      if (phase !== "scissors") return;
      if (!isDirectionRound) {
        get().actions.endGame("wrong_type");
        return;
      }
      if (playerDirectionChoice !== null) return;
      set({
        playerDirectionChoice: direction,
        directionAiChoice: getRandomDirection(),
      });
      // phase stays "scissors" — beat timer will advance to result naturally
    },

    advancePhase: () => {
      const state = get();
      const {
        phase,
        gameMode,
        isDirectionRound,
        roundResult,
        playerDirectionChoice,
        directionAiChoice,
        pendingRpsResult,
        directionAttemptsLeft,
      } = state;

      if (phase === "rock") {
        set({ phase: "paper", phaseStartedAt: Date.now() });
      } else if (phase === "paper") {
        set({ phase: "scissors", phaseStartedAt: Date.now() });
      } else if (phase === "scissors") {
        const inDirectionRound = gameMode === "directions" && isDirectionRound;
        if (inDirectionRound) {
          if (playerDirectionChoice !== null) {
            set({ phase: "result", phaseStartedAt: Date.now() });
          } else {
            get().actions.endGame("too_late");
          }
        } else {
          if (state.playerChoice !== null) {
            set({ phase: "result", phaseStartedAt: Date.now() });
          } else {
            get().actions.endGame("too_late");
          }
        }
      } else if (phase === "result") {
        if (gameMode === "classic") {
          set((s) => ({
            phase: "rock",
            score: s.score + 1,
            playerChoice: null,
            aiChoice: null,
            roundResult: null,
            phaseStartedAt: Date.now(),
          }));
        } else {
          // directions mode
          if (!isDirectionRound) {
            if (roundResult === "draw") {
              set((s) => ({
                phase: "rock",
                score: s.score + 1,
                playerChoice: null,
                aiChoice: null,
                roundResult: null,
                phaseStartedAt: Date.now(),
              }));
            } else {
              // win or lose → enter direction phase
              set({
                isDirectionRound: true,
                pendingRpsResult: roundResult,
                directionAttemptsLeft: 2,
                phase: "rock",
                playerChoice: null,
                aiChoice: null,
                roundResult: null,
                playerDirectionChoice: null,
                directionAiChoice: null,
                phaseStartedAt: Date.now(),
              });
            }
          } else {
            // direction round result
            const matched = playerDirectionChoice === directionAiChoice;
            if (matched) {
              const scoreIncrease = pendingRpsResult === "win" ? 1 : 0;
              set((s) => ({
                phase: "rock",
                score: s.score + scoreIncrease,
                playerChoice: null,
                aiChoice: null,
                roundResult: null,
                isDirectionRound: false,
                pendingRpsResult: null,
                directionAiChoice: null,
                playerDirectionChoice: null,
                directionAttemptsLeft: 2,
                phaseStartedAt: Date.now(),
              }));
            } else if (directionAttemptsLeft > 1) {
              // more attempts: new direction round
              set({
                phase: "rock",
                playerDirectionChoice: null,
                directionAiChoice: null,
                directionAttemptsLeft: directionAttemptsLeft - 1,
                playerChoice: null,
                aiChoice: null,
                roundResult: null,
                phaseStartedAt: Date.now(),
              });
            } else {
              // no more attempts: round voided
              set({
                phase: "rock",
                isDirectionRound: false,
                pendingRpsResult: null,
                directionAiChoice: null,
                playerDirectionChoice: null,
                directionAttemptsLeft: 2,
                playerChoice: null,
                aiChoice: null,
                roundResult: null,
                phaseStartedAt: Date.now(),
              });
            }
          }
        }
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
