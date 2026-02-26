import { create } from "zustand";
import * as Sentry from "@sentry/react-native";
import { getRoundTimings } from "@/lib/rhythmDifficulty";

export type Choice = "rock" | "paper" | "scissors";
export type GamePhase = "idle" | "rock" | "paper" | "scissors" | "result";
export type RoundResult = "win" | "lose" | "draw";
export type MistakeReason = "too_early" | "too_late" | "wrong_type";
export type Direction = "up" | "down" | "left" | "right";
export type GameMode = "classic" | "directions" | "countdown";
export type CountdownState = 3 | 2 | 1;

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

type CountdownModeData = {
  gameMode: "countdown";
  countdownState: CountdownState;
  playerInput: Choice | null;
  aiInput: Choice | null;
  roundResult: RoundResult | null;
};

export type ModeData = ClassicModeData | DirectionsRpsPhase | DirectionsDirectionPhase | CountdownModeData;

const COUNTDOWN_CHOOSE_PHASE: Record<CountdownState, GamePhase> = { 3: "scissors", 2: "paper", 1: "rock" };
const COUNTDOWN_GRACE_PHASE: Record<CountdownState, GamePhase | null> = { 3: "paper", 2: "rock", 1: null };

/** Which phase the player must input on */
export const getChoosePhase = (modeData: ModeData): GamePhase =>
  modeData.gameMode === "countdown" ? COUNTDOWN_CHOOSE_PHASE[modeData.countdownState] : "scissors";

/** Which phase has a grace window (one beat before choose), or null */
export const getGracePhase = (modeData: ModeData): GamePhase | null =>
  modeData.gameMode === "countdown" ? COUNTDOWN_GRACE_PHASE[modeData.countdownState] : "paper";

/** Next R-P-S phase, or null if already at/past choosePhase */
const getNextPhase = (phase: GamePhase, choosePhase: GamePhase): GamePhase | null => {
  if (phase === "rock" && choosePhase !== "rock") return "paper";
  if (phase === "paper" && choosePhase === "scissors") return "scissors";
  return null;
};

interface GameActions {
  startGame: (mode?: GameMode) => void;
  makeInput: (input: Choice | Direction) => void;
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

const COUNTDOWN_RESET: CountdownModeData = {
  gameMode: "countdown",
  countdownState: 3,
  playerInput: null,
  aiInput: null,
  roundResult: null,
};

const isGracePeriodActive = (phaseStartedAt: number, score: number): boolean => {
  const { beatInterval, graceBefore } = getRoundTimings(score);
  return Date.now() - phaseStartedAt >= beatInterval - graceBefore;
};

const buildRpsInputData = (
  modeData: ClassicModeData | DirectionsRpsPhase | CountdownModeData,
  choice: Choice,
  ai: Choice
): ClassicModeData | DirectionsRpsPhase | CountdownModeData => {
  const roundResult = determineResult(choice, ai);
  if (modeData.gameMode === "classic") {
    return { gameMode: "classic", playerInput: choice, aiInput: ai, roundResult };
  }
  if (modeData.gameMode === "countdown") {
    return { gameMode: "countdown", countdownState: modeData.countdownState, playerInput: choice, aiInput: ai, roundResult };
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
        modeData: mode === "classic" ? CLASSIC_RESET : mode === "countdown" ? COUNTDOWN_RESET : DIRECTIONS_RPS_RESET,
      });
    },

    makeInput: (input: Choice | Direction) => {
      const { phase, score, phaseStartedAt, modeData, actions: { endGame } } = get();
      const isDir = (DIRECTIONS as readonly string[]).includes(input);

      if (isDir && modeData.gameMode !== "directions") return;
      if (phase === "idle" || phase === "result") return;

      const choosePhase = getChoosePhase(modeData);
      const gracePhase = getGracePhase(modeData);

      const isWrongType = isDir !== (modeData.gameMode === "directions" && modeData.isDirectionRound);

      const buildUpdate = (): Partial<GameState> => isDir
        ? { modeData: { ...modeData, playerInput: input as Direction, aiInput: getRandomDirection() } as DirectionsDirectionPhase }
        : { modeData: buildRpsInputData(modeData as ClassicModeData | DirectionsRpsPhase | CountdownModeData, input as Choice, getRandomChoice()) };

      if (phase === choosePhase) {
        if (isWrongType) return endGame("wrong_type");
        if (modeData.playerInput !== null) return;
        set(buildUpdate());
        return;
      }
      if (gracePhase && phase === gracePhase) {
        if (!isGracePeriodActive(phaseStartedAt, score)) return endGame("too_early");
        if (isWrongType) return endGame("wrong_type");
        if (modeData.playerInput !== null) return;
        set({ ...buildUpdate(), phase: choosePhase, phaseStartedAt: Date.now() });
        return;
      }
      return endGame("too_early");
    },

    advancePhase: () => {
      const { phase, modeData, actions: { endGame } } = get();
      const choosePhase = getChoosePhase(modeData);

      // Advance through R-P-S phases before choose
      const nextPhase = getNextPhase(phase, choosePhase);
      if (nextPhase) return set({ phase: nextPhase, phaseStartedAt: Date.now() });

      // Choose phase: resolve or too_late
      if (phase === choosePhase) {
        if (modeData.playerInput !== null) {
          set({ phase: "result", phaseStartedAt: Date.now() });
        } else {
          endGame("too_late");
        }
        return;
      }
      if (phase !== "result") return;

      // Result phase: mode-specific handling
      if (modeData.gameMode === "classic") return set((s) => ({ phase: "rock", score: s.score + 1, modeData: CLASSIC_RESET, phaseStartedAt: Date.now() }));

      if (modeData.gameMode === "countdown") {
        const nextCountdown: CountdownState = modeData.countdownState === 3 ? 2 : modeData.countdownState === 2 ? 1 : 3;
        set((s) => ({
          phase: "rock",
          score: s.score + 1,
          modeData: { ...COUNTDOWN_RESET, countdownState: nextCountdown },
          phaseStartedAt: Date.now(),
        }));
        return;
      }

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
