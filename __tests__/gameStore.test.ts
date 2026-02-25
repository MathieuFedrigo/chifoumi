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
    const { makeChoice } = useGameStore.getState();
    makeChoice("rock");
    expect(useGameStore.getState().phase).toBe("idle");
    expect(useGameStore.getState().isPlaying).toBe(false);
  });

  it("makeChoice is a no-op during result phase", () => {
    // Setup: start game, advance to scissors, make a choice to enter result
    jest.spyOn(Math, "random").mockReturnValue(0);
    const store = useGameStore.getState();
    store.startGame();
    store.setPhase("scissors");
    store.makeChoice("rock"); // enters result phase

    expect(useGameStore.getState().phase).toBe("result");

    // Now try makeChoice during result - should be no-op
    useGameStore.getState().makeChoice("paper");
    expect(useGameStore.getState().phase).toBe("result");
  });

  it("processRound is a no-op when playerChoice is set", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const store = useGameStore.getState();
    store.startGame();
    store.setPhase("scissors");
    store.makeChoice("rock"); // sets playerChoice

    expect(useGameStore.getState().playerChoice).toBe("rock");

    // processRound should not end the game since playerChoice exists
    useGameStore.getState().processRound();
    expect(useGameStore.getState().phase).toBe("result");
    expect(useGameStore.getState().isPlaying).toBe(true);
  });
});
