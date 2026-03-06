import type { Choice, Direction, HistoryEntry } from "@/store/gameStore";
import { useAppStore } from "@/store/appStore";
import { type AiRuleId, ALL_AI_RULE_IDS } from "@/lib/aiRuleIds";

export type { AiRuleId };
export { ALL_AI_RULE_IDS };

export type AiGuess = Choice | Direction | null;
export type RoundType = "rps" | "directions";

type GuessRule = (history: HistoryEntry[], forRoundType: RoundType) => AiGuess;

/** If last 2 inputs of same type were identical, guess same */
export const repeatRule: GuessRule = (history, forRoundType) => {
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

/** Detect a repeating cycle of length L in an array (last 2*L elements must be two identical halves) */
const detectCycle = <T>(arr: T[], cycleLen: number): T | null => {
  if (arr.length < 2 * cycleLen) return null;
  const tail = arr.slice(-2 * cycleLen);
  const first = tail.slice(0, cycleLen);
  const second = tail.slice(cycleLen);
  for (let i = 0; i < cycleLen; i++) {
    if (first[i] !== second[i]) return null;
  }
  // next in cycle = arr.length % cycleLen index into the second half
  return second[arr.length % cycleLen]!;
};

/** RPS-only cycle detection over last 12 RPS rounds */
export const rpsOnlyCycleRule: GuessRule = (history, forRoundType) => {
  if (forRoundType !== "rps") return null;
  const choices: Choice[] = [];
  for (let i = history.length - 1; i >= 0 && choices.length < 12; i--) {
    const entry = history[i]!;
    if (entry.type === "round" && entry.isDirectionRound === false) {
      choices.unshift(entry.playerChoice);
    }
  }
  for (const len of [2, 3, 4]) {
    const result = detectCycle(choices, len);
    if (result !== null) return result;
  }
  return null;
};

/** Direction-only cycle detection over last 12 direction rounds */
export const dirOnlyCycleRule: GuessRule = (history, forRoundType) => {
  if (forRoundType !== "directions") return null;
  const dirs: Direction[] = [];
  for (let i = history.length - 1; i >= 0 && dirs.length < 12; i--) {
    const entry = history[i]!;
    if (entry.type === "round" && entry.isDirectionRound === true) {
      dirs.unshift(entry.playerDirection);
    }
  }
  for (const len of [2, 3, 4]) {
    const result = detectCycle(dirs, len);
    if (result !== null) return result;
  }
  return null;
};

/** Mixed-type cycle over last 12 entries of any type */
export const crossTypeCycleRule: GuessRule = (history, forRoundType) => {
  type MixedEntry = { value: Choice | Direction; isDir: boolean };
  const mixed: MixedEntry[] = [];
  for (let i = history.length - 1; i >= 0 && mixed.length < 12; i--) {
    const entry = history[i]!;
    if (entry.type === "round") {
      if (entry.isDirectionRound) {
        mixed.unshift({ value: entry.playerDirection, isDir: true });
      } else {
        mixed.unshift({ value: entry.playerChoice, isDir: false });
      }
    }
  }

  const values = mixed.map((e) => e.value);
  for (const len of [2, 3, 4]) {
    if (values.length < 2 * len) continue;
    const tail = values.slice(-2 * len);
    const first = tail.slice(0, len);
    const second = tail.slice(len);
    let match = true;
    for (let i = 0; i < len; i++) {
      if (first[i] !== second[i]) { match = false; break; }
    }
    if (!match) continue;
    const nextIdx = mixed.length % len;
    const nextEntry = mixed.slice(-len)[nextIdx]!;
    const wantDir = forRoundType === "directions";
    if (nextEntry.isDir !== wantDir) return null;
    return nextEntry.value;
  }
  return null;
};

/** RPS only: among RPS rounds that immediately follow a direction round, find dominant choice */
export const afterDirectionRule: GuessRule = (history, forRoundType) => {
  if (forRoundType !== "rps") return null;
  const counts: Record<Choice, number> = { rock: 0, paper: 0, scissors: 0 };
  let total = 0;
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1]!;
    const curr = history[i]!;
    if (
      prev.type === "round" && prev.isDirectionRound === true &&
      curr.type === "round" && curr.isDirectionRound === false
    ) {
      counts[curr.playerChoice]++;
      total++;
    }
  }
  if (total < 3) return null;
  const dominant = (Object.keys(counts) as Choice[]).reduce((a, b) => counts[a] >= counts[b] ? a : b);
  if (counts[dominant] / total >= 0.6) return dominant;
  return null;
};

/** Directions only: among direction rounds that immediately follow an RPS round, find dominant direction */
export const afterRPSRule: GuessRule = (history, forRoundType) => {
  if (forRoundType !== "directions") return null;
  const counts: Record<Direction, number> = { up: 0, down: 0, left: 0, right: 0 };
  let total = 0;
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1]!;
    const curr = history[i]!;
    if (
      prev.type === "round" && prev.isDirectionRound === false &&
      curr.type === "round" && curr.isDirectionRound === true
    ) {
      counts[curr.playerDirection]++;
      total++;
    }
  }
  if (total < 3) return null;
  const dominant = (Object.keys(counts) as Direction[]).reduce((a, b) => counts[a] >= counts[b] ? a : b);
  if (counts[dominant] / total >= 0.6) return dominant;
  return null;
};

/** Most frequent choice/direction among all rounds of given type; fires 70% of the time */
export const mostFrequentRule: GuessRule = (history, forRoundType) => {
  if (forRoundType === "rps") {
    const counts: Record<Choice, number> = { rock: 0, paper: 0, scissors: 0 };
    let total = 0;
    for (const entry of history) {
      if (entry.type === "round" && entry.isDirectionRound === false) {
        counts[entry.playerChoice]++;
        total++;
      }
    }
    if (total < 5) return null;
    const choices = Object.keys(counts) as Choice[];
    const max = Math.max(...choices.map((c) => counts[c]));
    const topChoices = choices.filter((c) => counts[c] === max);
    if (topChoices.length !== 1) return null;
    const dominant = topChoices[0]!;
    if (counts[dominant] / total < 0.6) return null;
    return Math.random() < 0.7 ? dominant : null;
  }

  const counts: Record<Direction, number> = { up: 0, down: 0, left: 0, right: 0 };
  let total = 0;
  for (const entry of history) {
    if (entry.type === "round" && entry.isDirectionRound === true) {
      counts[entry.playerDirection]++;
      total++;
    }
  }
  if (total < 5) return null;
  const dirs = Object.keys(counts) as Direction[];
  const max = Math.max(...dirs.map((d) => counts[d]));
  const topDirs = dirs.filter((d) => counts[d] === max);
  if (topDirs.length !== 1) return null;
  const dominant = topDirs[0]!;
  if (counts[dominant] / total < 0.6) return null;
  return Math.random() < 0.7 ? dominant : null;
};


const RULE_MAP: Record<AiRuleId, GuessRule> = {
  repeat: repeatRule,
  rpsCycle: rpsOnlyCycleRule,
  dirCycle: dirOnlyCycleRule,
  crossCycle: crossTypeCycleRule,
  afterDirection: afterDirectionRule,
  afterRPS: afterRPSRule,
  mostFrequent: mostFrequentRule,
};

export const computeAiGuess = ({
  history,
  forRoundType,
}: {
  history: HistoryEntry[];
  forRoundType: RoundType;
}): AiGuess => {
  const enabledRules = useAppStore.getState().enabledAiRules;
  for (const id of enabledRules) {
    const guess = RULE_MAP[id](history, forRoundType);
    if (guess !== null) return guess;
  }
  return null;
};
