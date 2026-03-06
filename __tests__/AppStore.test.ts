import { useAppStore } from "@/store/appStore";
import type { GameMode } from "@/store/gameStore";

describe("updateHighScore", () => {
  it("initializes all high scores to 0", () => {
    const { highScores } = useAppStore.getState();
    expect(highScores.classic).toBe(0);
    expect(highScores.directions).toBe(0);
    expect(highScores.countdown).toBe(0);
    expect(highScores.countdownDirections).toBe(0);
  });

  it("sets high score when new score exceeds current best", () => {
    const { actions } = useAppStore.getState();

    actions.updateHighScore("classic", 5);

    expect(useAppStore.getState().highScores.classic).toBe(5);
  });

  it("does not update high score when new score is lower than current best", () => {
    const { actions } = useAppStore.getState();
    actions.updateHighScore("classic", 10);

    actions.updateHighScore("classic", 3);

    expect(useAppStore.getState().highScores.classic).toBe(10);
  });

  it("does not update high score when new score equals current best", () => {
    const { actions } = useAppStore.getState();
    actions.updateHighScore("classic", 7);

    actions.updateHighScore("classic", 7);

    expect(useAppStore.getState().highScores.classic).toBe(7);
  });

  it("updates each game mode independently", () => {
    const { actions } = useAppStore.getState();
    const modes: GameMode[] = ["classic", "directions", "countdown", "countdownDirections"];

    modes.forEach((mode, i) => actions.updateHighScore(mode, (i + 1) * 3));

    const { highScores } = useAppStore.getState();
    expect(highScores.classic).toBe(3);
    expect(highScores.directions).toBe(6);
    expect(highScores.countdown).toBe(9);
    expect(highScores.countdownDirections).toBe(12);
  });

  it("updating one mode does not affect other modes", () => {
    const { actions } = useAppStore.getState();
    actions.updateHighScore("countdown", 20);

    actions.updateHighScore("classic", 5);

    expect(useAppStore.getState().highScores.countdown).toBe(20);
    expect(useAppStore.getState().highScores.classic).toBe(5);
  });
});
