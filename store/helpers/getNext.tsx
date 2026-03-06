import { CountdownState, GameMode, GamePhase, ModeData } from "../gameStore";

const COUNTDOWN_CHOOSE_PHASE: Record<CountdownState, GamePhase> = {
  3: "scissors",
  2: "paper",
  1: "rock",
};
const COUNTDOWN_GRACE_PHASE: Record<CountdownState, GamePhase | null> = {
  3: "paper",
  2: "rock",
  1: null,
};

/** Which phase the player must input on */
export const getChoosePhase = (modeData: ModeData): GamePhase =>
  modeData.gameMode === "countdown" ||
  modeData.gameMode === "countdownDirections"
    ? COUNTDOWN_CHOOSE_PHASE[modeData.countdownState]
    : "scissors";

/** Which phase has a grace window (one beat before choose), or null */
export const getGracePhase = (modeData: ModeData): GamePhase | null =>
  modeData.gameMode === "countdown" ||
  modeData.gameMode === "countdownDirections"
    ? COUNTDOWN_GRACE_PHASE[modeData.countdownState]
    : "paper";

/** Next R-P-S phase, or null if already at/past choosePhase */
export const getNextPhase = ({
  phase,
  choosePhase,
}: {
  phase: GamePhase;
  choosePhase: GamePhase;
}): GamePhase | null => {
  if (phase === "rock" && (choosePhase === "paper" || choosePhase === "scissors")) return "paper";
  if (phase === "paper" && choosePhase === "scissors") return "scissors";
  return null;
};

const NEXT_COUNTDOWN_STATE: Record<CountdownState, CountdownState> = { 3: 2, 2: 1, 1: 3 };

export const getNextCountdownState = (current: CountdownState): CountdownState => NEXT_COUNTDOWN_STATE[current];