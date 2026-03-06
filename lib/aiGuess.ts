import type { Choice, Direction, HistoryEntry } from "@/store/gameStore";

export type AiGuess = Choice | Direction | null;
export type RoundType = "rps" | "directions";

type GuessRule = (history: HistoryEntry[], forRoundType: RoundType) => AiGuess;

/** If last 2 inputs of same type were identical, guess same */
const repeatRule: GuessRule = (history, forRoundType) => {
  if (forRoundType === "rps") {
    const choices: Choice[] = [];
    for (let i = history.length - 1; i >= 0 && choices.length < 2; i--) {
      const entry = history[i]!;
      if (entry.type === "round" && entry.isDirectionRound === false) {
        choices.push(entry.playerChoice);
      }
    }
    if (choices.length === 2 && choices[0] === choices[1]) return choices[0]!;
    return null;
  }

  // directions
  const dirs: Direction[] = [];
  for (let i = history.length - 1; i >= 0 && dirs.length < 2; i--) {
    const entry = history[i]!;
    if (entry.type === "round" && entry.isDirectionRound === true) {
      dirs.push(entry.playerDirection);
    }
  }
  if (dirs.length === 2 && dirs[0] === dirs[1]) return dirs[0]!;
  return null;
};

const GUESS_RULES: GuessRule[] = [repeatRule];

export const computeAiGuess = ({ history, forRoundType }: { history: HistoryEntry[]; forRoundType: RoundType }): AiGuess => {
  for (const rule of GUESS_RULES) {
    const guess = rule(history, forRoundType);
    if (guess !== null) return guess;
  }
  return null;
};
