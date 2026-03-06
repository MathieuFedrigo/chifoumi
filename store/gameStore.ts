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

export type HistoryEntry = {
  type: "round";
  choosePhase: GamePhase;
  aiChoice: Choice;
  playerChoice: Choice;
  roundResult: RoundResult;
  directionRound?: {
    aiDirection: Direction;
    playerDirection: Direction;
    matched: boolean;
  };
} | {
  type: "mistake";
  choosePhase: GamePhase;
  mistakeReason: MistakeReason;
  aiInput: Choice | Direction;
  playerInput: Choice | Direction | null;
};

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
  endGame: (reason: MistakeReason, input?: Choice | Direction) => void;
}

interface GameState {
  phase: GamePhase;
  score: number;
  isPlaying: boolean;
  mistakeReason: MistakeReason | null;
  phaseStartedAt: number;
  modeData: ModeData;
  roundHistory: HistoryEntry[];
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

const RPS_PHASE_BASE = { playerInput: null, aiInput: null, roundResult: null } as const;
const DIR_PHASE_BASE = { playerInput: null, aiInput: null, directionAttemptsLeft: 2 } as const;
const CLASSIC_RESET: ClassicModeData = {
  gameMode: "classic",
  ...RPS_PHASE_BASE,
};
const DIRECTIONS_RPS_RESET: DirectionsRpsPhase = {
  gameMode: "directions",
  ...RPS_PHASE_BASE,
  isDirectionRound: false,
  directionAttemptsLeft: 2,
};
const COUNTDOWN_RESET: CountdownModeData = {
  gameMode: "countdown",
  ...RPS_PHASE_BASE,
  countdownState: 3,
};
const COUNTDOWN_DIR_RPS_RESET: CountdownDirRpsPhase = {
  gameMode: "countdownDirections",
  ...RPS_PHASE_BASE,
  countdownState: 3,
  isDirectionRound: false,
  directionAttemptsLeft: 2,
};
const DIRECTIONS_DIR_RESET = {
  gameMode: "directions" ,
  ...DIR_PHASE_BASE,
  isDirectionRound: true ,
} as const;
const COUNTDOWN_DIR_DIR_RESET = {
  gameMode: "countdownDirections" ,
  ...DIR_PHASE_BASE,
  isDirectionRound: true ,
  countdownState: 3,
} as const;

const isGracePeriodActive = ({ phaseStartedAt, score }: { phaseStartedAt: number; score: number }): boolean => {
  const { beatInterval, graceBefore } = getRoundTimings(score);
  return Date.now() - phaseStartedAt >= beatInterval - graceBefore;
};

// Narrows to direction-round phases (isDirectionRound: true)
const isDirectionPhase = (m: ModeData): m is DirectionsDirectionPhase | CountdownDirDirectionPhase =>
  "isDirectionRound" in m && m.isDirectionRound === true;

// Narrows to Direction (vs Choice); replaces the inline (DIRECTIONS as readonly string[]) cast in makeInput
export const isDirectionInput = (input: Choice | Direction): input is Direction =>
  input === "up" || input === "down" || input === "left" || input === "right";

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

const MODE_RESET: Record<GameMode, ModeData> = {
  classic: CLASSIC_RESET,
  directions: DIRECTIONS_RPS_RESET,
  countdown: COUNTDOWN_RESET,
  countdownDirections: COUNTDOWN_DIR_RPS_RESET,
};

/**
 * Build updated modeData after a valid input.
 * Precondition: isDirectionPhase(modeData) === isDirectionInput(input).
 */
const buildInputModeData = (modeData: ModeData, input: Choice | Direction): ModeData => {
  if (isDirectionPhase(modeData)) {
    // Cast needed: TypeScript can't infer spread of DirectionsDirectionPhase | CountdownDirDirectionPhase
    return { ...modeData, playerInput: input as Direction, aiInput: getRandomDirection() } as
      DirectionsDirectionPhase | CountdownDirDirectionPhase;
  }
  // modeData is narrowed to RPS phases — no cast needed
  return buildRpsInputData({ modeData, choice: input as Choice, ai: getRandomChoice() });
};

/** Build a completed-round HistoryEntry from current modeData (RPS phases only). */
const buildRoundHistoryEntry = (modeData: ClassicModeData | DirectionsRpsPhase | CountdownModeData | CountdownDirRpsPhase): HistoryEntry => {
  const choosePhase = getChoosePhase(modeData);

  return {
    type: "round",
    choosePhase,
    aiChoice: modeData.aiInput!,
    playerChoice: modeData.playerInput!,
    roundResult: modeData.roundResult!,
  };
};

/** Build a direction sub-round entry from direction-phase modeData. */
const buildDirectionHistoryEntry = (modeData: DirectionsDirectionPhase | CountdownDirDirectionPhase): HistoryEntry => {
  const choosePhase = getChoosePhase(modeData);

  return {
    type: "round",
    choosePhase,
    aiChoice: "rock", // placeholder — direction rounds don't have RPS choices
    playerChoice: "rock",
    roundResult: modeData.pendingRpsResult,
    directionRound: {
      aiDirection: modeData.aiInput!,
      playerDirection: modeData.playerInput!,
      matched: modeData.playerInput === modeData.aiInput,
    },
  };
};

/** Build a mistake HistoryEntry from current modeData + reason + optional player input. */
const buildMistakeHistoryEntry = (modeData: ModeData, reason: MistakeReason, input?: Choice | Direction): HistoryEntry => {
  const choosePhase = getChoosePhase(modeData);

  if (isDirectionPhase(modeData)) {
    return {
      type: "mistake",
      choosePhase,
      mistakeReason: reason,
      aiInput: modeData.aiInput ?? getRandomDirection(),
      playerInput: input ?? modeData.playerInput ?? null,
    };
  }

  return {
    type: "mistake",
    choosePhase,
    mistakeReason: reason,
    aiInput: modeData.aiInput ?? getRandomChoice(),
    playerInput: input ?? modeData.playerInput ?? null,
  };
};

export const useGameStore = create<GameState>()((set, get) => ({
  phase: "idle",
  score: 0,
  isPlaying: false,
  mistakeReason: null,
  phaseStartedAt: Date.now(),
  modeData: CLASSIC_RESET,
  roundHistory: [],

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
        roundHistory: [],
      });
    },

    makeInput: (input: Choice | Direction) => {
      const { phase, score, phaseStartedAt, modeData, actions: { endGame } } = get();
      const isDir = isDirectionInput(input);

      if (isDir && modeData.gameMode !== "directions" && modeData.gameMode !== "countdownDirections") return;
      if (phase === "idle") return;
      if (modeData.playerInput !== null && phase !== "result") return endGame("too_early", input);

      const choosePhase = getChoosePhase(modeData);
      const gracePhase = getGracePhase(modeData);

      if (phase === "result") {
        const currentEntry = isDirectionPhase(modeData)
          ? buildDirectionHistoryEntry(modeData)
          : buildRoundHistoryEntry(modeData);

        const nextModeData = getNextRoundModeData(modeData);
        const nextChoosePhase = getChoosePhase(nextModeData);

        if (nextChoosePhase !== "rock") {
          set({ roundHistory: [...get().roundHistory, currentEntry] });
          return endGame("too_early", input);
        }

        // Type change (direction ↔ RPS): ignore input, advancePhase handles transition
        if (isDirectionPhase(modeData) !== isDirectionPhase(nextModeData)) return;

        if (!isGracePeriodActive({ phaseStartedAt, score })) {
          set({ roundHistory: [...get().roundHistory, currentEntry] });
          return endGame("too_early", input);
        }

        if (isDir !== isDirectionPhase(nextModeData)) {
          set({ roundHistory: [...get().roundHistory, currentEntry] });
          return endGame("wrong_type", input);
        }

        return set({
          modeData: buildInputModeData(nextModeData, input),
          phase: nextChoosePhase,
          phaseStartedAt: Date.now(),
          roundHistory: [...get().roundHistory, currentEntry],
        });
      }

      if (isDir !== isDirectionPhase(modeData)) return endGame("wrong_type", input);

      if (phase === choosePhase) return set({ modeData: buildInputModeData(modeData, input) });
      if (phase === gracePhase) {
        if (!isGracePeriodActive({ phaseStartedAt, score })) return endGame("too_early", input);
        return set({ modeData: buildInputModeData(modeData, input), phase: choosePhase, phaseStartedAt: Date.now() });
      }

      return endGame("too_early", input);
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

      // Result phase: push history entry, then compute next round
      const entry = isDirectionPhase(modeData)
        ? buildDirectionHistoryEntry(modeData)
        : buildRoundHistoryEntry(modeData);
      return set({ phase: "rock", phaseStartedAt: Date.now(), modeData: getNextRoundModeData(modeData), roundHistory: [...get().roundHistory, entry] });
    },

    endGame: (reason: MistakeReason, input?: Choice | Direction) => {
      const { modeData, roundHistory } = get();
      Sentry.addBreadcrumb({
        category: "game",
        message: `Game ended: ${reason}`,
        level: "info",
        data: { score: get().score, reason },
      });
      const mistakeEntry = buildMistakeHistoryEntry(modeData, reason, input);
      set({
        isPlaying: false,
        phase: "idle",
        mistakeReason: reason,
        phaseStartedAt: Date.now(),
        roundHistory: [...roundHistory, mistakeEntry],
      });
    },
  },
}));

/** Compute the next round's modeData (with countdown cycling). */
const getNextRoundModeData = (modeData: ModeData): ModeData => {
  switch (modeData.gameMode) {
    case "classic":
      return CLASSIC_RESET;
    case "countdown":
      return { ...COUNTDOWN_RESET, countdownState: NEXT_COUNTDOWN_STATE[modeData.countdownState] };
    case "directions":
      if (!modeData.isDirectionRound) {
        if (modeData.roundResult === "draw") return DIRECTIONS_RPS_RESET;
        return { ...DIRECTIONS_DIR_RESET, pendingRpsResult: modeData.roundResult! };
      }
      if (modeData.playerInput === modeData.aiInput) return DIRECTIONS_RPS_RESET;
      if (modeData.directionAttemptsLeft > 1)
        return { ...modeData, playerInput: null, aiInput: null, directionAttemptsLeft: modeData.directionAttemptsLeft - 1 };
      return DIRECTIONS_RPS_RESET;
    case "countdownDirections": {
      const nextCd = NEXT_COUNTDOWN_STATE[modeData.countdownState];
      if (!modeData.isDirectionRound) {
        if (modeData.roundResult === "draw")
          return { ...COUNTDOWN_DIR_RPS_RESET, countdownState: nextCd };
        return { ...COUNTDOWN_DIR_DIR_RESET, countdownState: nextCd, pendingRpsResult: modeData.roundResult! };
      }
      if (modeData.playerInput === modeData.aiInput)
        return { ...COUNTDOWN_DIR_RPS_RESET, countdownState: nextCd };
      if (modeData.directionAttemptsLeft > 1)
        return { ...modeData, playerInput: null, aiInput: null, directionAttemptsLeft: modeData.directionAttemptsLeft - 1, countdownState: nextCd };
      return { ...COUNTDOWN_DIR_RPS_RESET, countdownState: nextCd };
    }
  }
};

export const useGameStoreActions = () => useGameStore((s) => s.actions);
