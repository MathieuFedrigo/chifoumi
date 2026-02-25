import {
  computeDuration,
  getRoundTimings,
  DEFAULT_DIFFICULTY_CONFIG,
} from "@/lib/rhythmDifficulty";
import type { DifficultyConfig } from "@/lib/rhythmDifficulty";

describe("computeDuration", () => {
  const config = DEFAULT_DIFFICULTY_CONFIG.beat;

  it("returns initial value at round 0", () => {
    expect(computeDuration(config, 0)).toBe(800);
  });

  it("approaches floor at large round numbers", () => {
    const value = computeDuration(config, 100);
    expect(value).toBeGreaterThanOrEqual(config.floor);
    expect(value).toBeLessThanOrEqual(config.floor + 1);
  });

  it("decreases monotonically", () => {
    for (let i = 0; i < 20; i++) {
      expect(computeDuration(config, i + 1)).toBeLessThanOrEqual(
        computeDuration(config, i)
      );
    }
  });

  it("returns rounded integer values", () => {
    for (let i = 0; i < 10; i++) {
      const value = computeDuration(config, i);
      expect(value).toBe(Math.round(value));
    }
  });
});

describe("getRoundTimings", () => {
  it("returns correct values at round 0 with default config", () => {
    const timings = getRoundTimings(0);
    expect(timings.beatInterval).toBe(800);
    expect(timings.graceBefore).toBe(150);
    expect(timings.graceAfter).toBe(400);
  });

  it("accepts a custom config", () => {
    const custom: DifficultyConfig = {
      beat: { initial: 1000, floor: 500, decayRate: 0.1 },
      graceBeforeRatio: 0.2,
      graceAfterRatio: 0.4,
    };
    const timings = getRoundTimings(0, custom);
    expect(timings.beatInterval).toBe(1000);
    expect(timings.graceBefore).toBe(200);
    expect(timings.graceAfter).toBe(400);
  });

  it("respects floor at high rounds", () => {
    const timings = getRoundTimings(100);
    expect(timings.beatInterval).toBeGreaterThanOrEqual(
      DEFAULT_DIFFICULTY_CONFIG.beat.floor
    );
  });

  it("applies ratios proportionally as beat shrinks", () => {
    const t0 = getRoundTimings(0);
    const t20 = getRoundTimings(20);

    expect(t20.beatInterval).toBeLessThan(t0.beatInterval);
    expect(t20.graceBefore).toBeLessThan(t0.graceBefore);
    expect(t20.graceAfter).toBeLessThan(t0.graceAfter);

    // Ratios should be consistent
    expect(t20.graceBefore / t20.beatInterval).toBeCloseTo(
      DEFAULT_DIFFICULTY_CONFIG.graceBeforeRatio,
      1
    );
    expect(t20.graceAfter / t20.beatInterval).toBeCloseTo(
      DEFAULT_DIFFICULTY_CONFIG.graceAfterRatio,
      1
    );
  });
});
