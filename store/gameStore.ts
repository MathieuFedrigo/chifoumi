import { create } from "zustand";
import * as Sentry from "@sentry/react-native";
import { getRoundTimings } from "@/lib/rhythmDifficulty";

export type Choice = "rock" | "paper" | "scissors";
export type GamePhase = "idle" | "rock" | "paper" | "scissors" | "result";
export type RoundResult = "win" | "lose" | "draw";
export type MistakeReason = "too_early" | "too_late" | "wrong_type";
export type Direction = "up" | "down" | "left" | "right";
export type GameMode = "classic" | "directions" | "countdown" | "countdownDirections";
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

type CountdownDirRpsPhase = {
  gameMode: "countdownDirections";
  countdownState: CountdownState;
  isDirectionRound: false;
  playerInput: Choice | null;
  aiInput: Choice | null;
  roundResult: RoundResult | null;
  directionAttemptsLeft: number;
};

type CountdownDirDirectionPhase = {
  gameMode: "countdownDirections";
  countdownState: CountdownState;
  isDirectionRound: true;
  playerInput: Direction | null;
  aiInput: Direction | null;
  pendingRpsResult: RoundResult;
  directionAttemptsLeft: number;
};

export type ModeData = ClassicModeData | DirectionsRpsPhase | DirectionsDirectionPhase | CountdownModeData | CountdownDirRpsPhase | CountdownDirDirectionPhase;

const COUNTDOWN_CHOOSE_PHASE: Record<CountdownState, GamePhase> = { 3: "scissors", 2: "paper", 1: "rock" };
const COUNTDOWN_GRACE_PHASE: Record<CountdownState, GamePhase | null> = { 3: "paper", 2: "rock", 1: null };

/** Which phase the player must input on */
export const getChoosePhase = (modeData: ModeData): GamePhase =>
  modeData.gameMode === "countdown" || modeData.gameMode === "countdownDirections"
    ? COUNTDOWN_CHOOSE_PHASE[modeData.countdownState]
    : "scissors";

/** Which phase has a grace window (one beat before choose), or null */
export const getGracePhase = (modeData: ModeData): GamePhase | null =>
  modeData.gameMode === "countdown" || modeData.gameMode === "countdownDirections"
    ? COUNTDOWN_GRACE_PHASE[modeData.countdownState]
    : "paper";

/** Next R-P-S phase, or null if already at/past choosePhase */
const getNextPhase = ({ phase, choosePhase }: { phase: GamePhase; choosePhase: GamePhase }): GamePhase | null => {
  if (phase === "rock" && choosePhase !== "rock") return "paper";
  if (phase === "paper" && choosePhase === "scissors") return "scissors";
  return null;
};

const NEXT_COUNTDOWN_STATE: Record<CountdownState, CountdownState> = { 3: 2, 2: 1, 1: 3 };

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

export const determineResult = ({ player, ai }: { player: Choice; ai: Choice }): RoundResult => {
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

const COUNTDOWN_DIR_RPS_RESET: CountdownDirRpsPhase = {
  gameMode: "countdownDirections",
  countdownState: 3,
  isDirectionRound: false,
  playerInput: null,
  aiInput: null,
  roundResult: null,
  directionAttemptsLeft: 2,
};

const isGracePeriodActive = ({ phaseStartedAt, score }: { phaseStartedAt: number; score: number }): boolean => {
  const { beatInterval, graceBefore } = getRoundTimings(score);
  return Date.now() - phaseStartedAt >= beatInterval - graceBefore;
};

const buildRpsInputData = ({
  modeData,
  choice,
  ai,
}: {
  modeData: ClassicModeData | DirectionsRpsPhase | CountdownModeData | CountdownDirRpsPhase;
  choice: Choice;
  ai: Choice;
}): ClassicModeData | DirectionsRpsPhase | CountdownModeData | CountdownDirRpsPhase => {
  const roundResult = determineResult({ player: choice, ai });
  if (modeData.gameMode === "classic") {
    return { gameMode: "classic", playerInput: choice, aiInput: ai, roundResult };
  }
  if (modeData.gameMode === "countdown") {
    return { gameMode: "countdown", countdownState: modeData.countdownState, playerInput: choice, aiInput: ai, roundResult };
  }
  if (modeData.gameMode === "countdownDirections") {
    return {
      gameMode: "countdownDirections",
      countdownState: modeData.countdownState,
      isDirectionRound: false,
      playerInput: choice,
      aiInput: ai,
      roundResult,
      directionAttemptsLeft: modeData.directionAttemptsLeft,
    };
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

const nextRockRound = (modeData: ModeData): Partial<GameState> => ({
  phase: "rock",
  phaseStartedAt: Date.now(),
  modeData,
});

const resolveDirectionRound = ({
  modeData,
  resetData,
}: {
  modeData: DirectionsDirectionPhase | CountdownDirDirectionPhase;
  resetData: ModeData;
}): Partial<GameState> => {
  if (modeData.playerInput === modeData.aiInput) return nextRockRound(resetData);
  if (modeData.directionAttemptsLeft > 1)
    return nextRockRound({ ...modeData, playerInput: null, aiInput: null, directionAttemptsLeft: modeData.directionAttemptsLeft - 1 });
  return nextRockRound(resetData);
};

const MODE_RESET: Record<GameMode, ModeData> = {
  classic: CLASSIC_RESET,
  directions: DIRECTIONS_RPS_RESET,
  countdown: COUNTDOWN_RESET,
  countdownDirections: COUNTDOWN_DIR_RPS_RESET,
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
        modeData: MODE_RESET[mode],
      });
    },

    makeInput: (input: Choice | Direction) => {
      const { phase, score, phaseStartedAt, modeData, actions: { endGame } } = get();
      const isDir = (DIRECTIONS as readonly string[]).includes(input);

      if (isDir && modeData.gameMode !== "directions" && modeData.gameMode !== "countdownDirections") return;
      if (phase === "idle" || phase === "result") return;
      if (modeData.playerInput !== null) return;

      const choosePhase = getChoosePhase(modeData);
      const gracePhase = getGracePhase(modeData);

      const expectsDirection = (modeData.gameMode === "directions" || modeData.gameMode === "countdownDirections") && modeData.isDirectionRound;
      const isWrongType = isDir !== expectsDirection;
      if (isWrongType) return endGame("wrong_type");

      const buildUpdate = (): Partial<GameState> => isDir
        ? { modeData: { ...modeData, playerInput: input as Direction, aiInput: getRandomDirection() } as DirectionsDirectionPhase | CountdownDirDirectionPhase }
        : { modeData: buildRpsInputData({ modeData: modeData as ClassicModeData | DirectionsRpsPhase | CountdownModeData | CountdownDirRpsPhase, choice: input as Choice, ai: getRandomChoice() }) };

      if (phase === choosePhase) return set(buildUpdate());
      if (phase === gracePhase) {
        if (!isGracePeriodActive({ phaseStartedAt, score })) return endGame("too_early");
        return set({ ...buildUpdate(), phase: choosePhase, phaseStartedAt: Date.now() });
      }
      return endGame("too_early");
    },

    advancePhase: () => {
      const { phase, modeData, actions: { endGame } } = get();
      const choosePhase = getChoosePhase(modeData);

      // Advance through R-P-S phases before choose
      const nextPhase = getNextPhase({ phase, choosePhase });
      if (nextPhase) return set({ phase: nextPhase, phaseStartedAt: Date.now() });

      // Choose phase: resolve or too_late
      if (phase === choosePhase) {
        if (modeData.playerInput) return set((s) => ({ phase: "result", score: s.score + 1, phaseStartedAt: Date.now() }));
        return endGame("too_late");
      }
      if (phase !== "result") return;

      // Result phase: mode-specific handling
      switch (modeData.gameMode) {
        case "classic":
          return set(nextRockRound(CLASSIC_RESET));

        case "countdown":
          return set(nextRockRound({ ...COUNTDOWN_RESET, countdownState: NEXT_COUNTDOWN_STATE[modeData.countdownState] }));

        case "countdownDirections": {
          const nextState = NEXT_COUNTDOWN_STATE[modeData.countdownState];
          if (!modeData.isDirectionRound) {
            if (modeData.roundResult === "draw")
              return set(nextRockRound({ ...COUNTDOWN_DIR_RPS_RESET, countdownState: nextState }));
            return set(nextRockRound({
              gameMode: "countdownDirections",
              countdownState: nextState,
              isDirectionRound: true,
              playerInput: null,
              aiInput: null,
              pendingRpsResult: modeData.roundResult!,
              directionAttemptsLeft: 2,
            }));
          }
          return set(resolveDirectionRound({
            modeData: { ...modeData, countdownState: nextState },
            resetData: { ...COUNTDOWN_DIR_RPS_RESET, countdownState: nextState },
          }));
        }

        case "directions":
          if (!modeData.isDirectionRound) {
            // DirectionsRpsPhase result
            if (modeData.roundResult === "draw") return set(nextRockRound(DIRECTIONS_RPS_RESET));
            // win or lose → enter direction phase
            return set(nextRockRound({
              gameMode: "directions",
              isDirectionRound: true,
              playerInput: null,
              aiInput: null,
              pendingRpsResult: modeData.roundResult!,
              directionAttemptsLeft: 2,
            }));
          }
          // DirectionsDirectionPhase result
          set(resolveDirectionRound({ modeData, resetData: DIRECTIONS_RPS_RESET }));
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
