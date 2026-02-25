interface DifficultyCurveConfig {
  initial: number;
  floor: number;
  decayRate: number;
}

export interface DifficultyConfig {
  beat: DifficultyCurveConfig;
  graceBeforeRatio: number;
  graceAfterRatio: number;
}

export interface RoundTimings {
  beatInterval: number;
  graceBefore: number;
  graceAfter: number;
}

export const DEFAULT_DIFFICULTY_CONFIG: DifficultyConfig = {
  beat: { initial: 800, floor: 200, decayRate: 0.08 },
  graceBeforeRatio: 0.1875,
  graceAfterRatio: 0.5,
};

export const computeDuration = (
  config: DifficultyCurveConfig,
  round: number
): number => {
  return Math.round(
    config.floor + (config.initial - config.floor) * Math.exp(-config.decayRate * round)
  );
};

export const getRoundTimings = (
  round: number,
  config: DifficultyConfig = DEFAULT_DIFFICULTY_CONFIG
): RoundTimings => {
  const beatInterval = computeDuration(config.beat, round);
  return {
    beatInterval,
    graceBefore: Math.round(config.graceBeforeRatio * beatInterval),
    graceAfter: Math.round(config.graceAfterRatio * beatInterval),
  };
};
