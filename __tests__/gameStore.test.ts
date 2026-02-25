import { determineResult, getRandomChoice, useGameStore } from "@/store/gameStore";
import type { Choice } from "@/store/gameStore";

describe("determineResult", () => {
  it("returns draw for same choices", () => {
    expect(determineResult("rock", "rock")).toBe("draw");
    expect(determineResult("paper", "paper")).toBe("draw");
    expect(determineResult("scissors", "scissors")).toBe("draw");
  });

  it("returns win when player beats AI", () => {
    expect(determineResult("rock", "scissors")).toBe("win");
    expect(determineResult("paper", "rock")).toBe("win");
    expect(determineResult("scissors", "paper")).toBe("win");
  });

  it("returns lose when AI beats player", () => {
    expect(determineResult("rock", "paper")).toBe("lose");
    expect(determineResult("paper", "scissors")).toBe("lose");
    expect(determineResult("scissors", "rock")).toBe("lose");
  });
});

describe("getRandomChoice", () => {
  it("returns a valid choice", () => {
    const validChoices: Choice[] = ["rock", "paper", "scissors"];
    for (let i = 0; i < 20; i++) {
      expect(validChoices).toContain(getRandomChoice());
    }
  });
});

describe("useGameStore edge cases", () => {
  it("makeChoice is a no-op during idle phase", () => {
    const { makeChoice } = useGameStore.getState().actions;
    makeChoice("rock");
    expect(useGameStore.getState().phase).toBe("idle");
    expect(useGameStore.getState().isPlaying).toBe(false);
  });

  it("makeChoice is a no-op during result phase", () => {
    // Setup: start game, advance to scissors, make a choice, advance to result
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { startGame, advancePhase, makeChoice } = useGameStore.getState().actions;
    startGame();
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeChoice("rock"); // stores choices, phase stays scissors
    expect(useGameStore.getState().phase).toBe("scissors");
    advancePhase(); // scissors + playerChoice → result
    expect(useGameStore.getState().phase).toBe("result");

    // Now try makeChoice during result - should be no-op
    useGameStore.getState().actions.makeChoice("paper");
    expect(useGameStore.getState().phase).toBe("result");
  });

  it("advancePhase from scissors with playerChoice transitions to result then next round", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { startGame, advancePhase, makeChoice } = useGameStore.getState().actions;
    startGame();
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeChoice("rock"); // sets playerChoice, phase stays scissors

    expect(useGameStore.getState().playerChoice).toBe("rock");
    expect(useGameStore.getState().phase).toBe("scissors");

    // advancePhase during scissors with playerChoice → result
    useGameStore.getState().actions.advancePhase();
    expect(useGameStore.getState().phase).toBe("result");

    // advancePhase from result → rock (score+1)
    useGameStore.getState().actions.advancePhase();
    expect(useGameStore.getState().phase).toBe("rock");
    expect(useGameStore.getState().isPlaying).toBe(true);
  });

  it("advancePhase is a no-op during idle phase", () => {
    const { advancePhase } = useGameStore.getState().actions;
    advancePhase();
    expect(useGameStore.getState().phase).toBe("idle");
  });

  it("advancePhase from scissors with no playerChoice ends game as too_late (safety net)", () => {
    // Safety net: if beat timer fires during scissors before the player chose,
    // advancePhase ends the game as too_late (grace timer normally fires first).
    const { startGame, advancePhase } = useGameStore.getState().actions;
    startGame();
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors

    // No makeChoice — playerChoice is null
    advancePhase(); // scissors + null playerChoice → endGame("too_late")
    expect(useGameStore.getState().phase).toBe("idle");
    expect(useGameStore.getState().isPlaying).toBe(false);
    expect(useGameStore.getState().mistakeReason).toBe("too_late");
  });
});
