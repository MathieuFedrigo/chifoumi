import {
  ClassicModeData,
  DirectionsRpsPhase,
  CountdownModeData,
  CountdownDirRpsPhase,
  GameState,
  GameMode,
  ModeData,
} from "../gameStore";

const RPS_PHASE_BASE = {
  playerInput: null,
  aiInput: null,
  roundResult: null,
} as const;
const DIR_PHASE_BASE = {
  playerInput: null,
  aiInput: null,
  directionAttemptsLeft: 2,
} as const;

export const CLASSIC_RESET: ClassicModeData = {
  gameMode: "classic",
  ...RPS_PHASE_BASE,
};
export const DIRECTIONS_RPS_RESET: DirectionsRpsPhase = {
  gameMode: "directions",
  ...RPS_PHASE_BASE,
  isDirectionRound: false,
  directionAttemptsLeft: 2,
};
export const COUNTDOWN_RESET: CountdownModeData = {
  gameMode: "countdown",
  ...RPS_PHASE_BASE,
  countdownState: 3,
};
export const COUNTDOWN_DIR_RPS_RESET: CountdownDirRpsPhase = {
  gameMode: "countdownDirections",
  ...RPS_PHASE_BASE,
  countdownState: 3,
  isDirectionRound: false,
  directionAttemptsLeft: 2,
};
export const DIRECTIONS_DIR_RESET = {
  gameMode: "directions",
  ...DIR_PHASE_BASE,
  isDirectionRound: true,
} as const;
export const COUNTDOWN_DIR_DIR_RESET = {
  gameMode: "countdownDirections",
  ...DIR_PHASE_BASE,
  isDirectionRound: true,
  countdownState: 3,
} as const;

export const MODE_RESET: Record<GameMode, ModeData> = {
  classic: CLASSIC_RESET,
  directions: DIRECTIONS_RPS_RESET,
  countdown: COUNTDOWN_RESET,
  countdownDirections: COUNTDOWN_DIR_RPS_RESET,
};

export const GUESS_RESET: Partial<GameState> = {
  aiGuess: null,
  aiGuessRevealed: false,
};
