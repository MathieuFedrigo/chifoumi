import { determineResult, getRandomChoice, getRandomDirection, useGameStore } from "@/store/gameStore";
import { getRoundTimings } from "@/lib/rhythmDifficulty";
import type { Choice, Direction, GameMode } from "@/store/gameStore";

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

describe("getRandomDirection", () => {
  it("returns a valid direction", () => {
    const validDirections: Direction[] = ["up", "down", "left", "right"];
    for (let i = 0; i < 20; i++) {
      expect(validDirections).toContain(getRandomDirection());
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

  it("makeDirectionChoice is a no-op in classic mode", () => {
    const { startGame, advancePhase, makeDirectionChoice } = useGameStore.getState().actions;
    startGame("classic");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeDirectionChoice("up");
    // No effect since gameMode is classic
    expect(useGameStore.getState().phase).toBe("scissors");
    expect(useGameStore.getState().playerDirectionChoice).toBeNull();
    expect(useGameStore.getState().isPlaying).toBe(true);
  });

  it("makeDirectionChoice is a no-op during idle phase (classic mode)", () => {
    const { makeDirectionChoice } = useGameStore.getState().actions;
    makeDirectionChoice("up");
    expect(useGameStore.getState().phase).toBe("idle");
    expect(useGameStore.getState().isPlaying).toBe(false);
  });

  it("advancePhase from scissors in direction round with no direction choice ends game too_late", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock → player wins
    const { startGame, advancePhase, makeChoice } = useGameStore.getState().actions;
    startGame("directions");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeChoice("paper"); // player wins vs rock
    advancePhase(); // scissors → result
    advancePhase(); // result → rock (enters direction round)

    expect(useGameStore.getState().isDirectionRound).toBe(true);
    expect(useGameStore.getState().phase).toBe("rock");

    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors

    // No direction choice made
    advancePhase(); // scissors in direction round + no playerDirectionChoice → too_late
    expect(useGameStore.getState().phase).toBe("idle");
    expect(useGameStore.getState().mistakeReason).toBe("too_late");
  });

  it("directions mode draw increments score without entering direction round", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const { startGame, advancePhase, makeChoice } = useGameStore.getState().actions;
    startGame("directions");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeChoice("rock"); // player picks rock → draw vs rock
    advancePhase(); // scissors → result
    advancePhase(); // result → rock (draw → score++)

    expect(useGameStore.getState().score).toBe(1);
    expect(useGameStore.getState().isDirectionRound).toBe(false);
    expect(useGameStore.getState().phase).toBe("rock");
  });

  it("directions mode win enters direction round and saves pendingRpsResult", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const { startGame, advancePhase, makeChoice } = useGameStore.getState().actions;
    startGame("directions");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeChoice("paper"); // player wins vs rock
    advancePhase(); // scissors → result
    advancePhase(); // result → rock (win → enter direction round)

    expect(useGameStore.getState().isDirectionRound).toBe(true);
    expect(useGameStore.getState().pendingRpsResult).toBe("win");
    expect(useGameStore.getState().directionAttemptsLeft).toBe(2);
    expect(useGameStore.getState().score).toBe(0); // no score yet
    expect(useGameStore.getState().phase).toBe("rock");
  });

  it("directions mode win + correct direction → score++", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock, then AI direction = up
    const { startGame, advancePhase, makeChoice, makeDirectionChoice } = useGameStore.getState().actions;
    startGame("directions");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeChoice("paper"); // win vs rock
    advancePhase(); // scissors → result
    advancePhase(); // result → direction round rock

    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeDirectionChoice("up"); // player picks up; AI picks up (random=0 → index 0 = "up")
    advancePhase(); // scissors → result
    advancePhase(); // result → rock (matched, win → score++)

    expect(useGameStore.getState().score).toBe(1);
    expect(useGameStore.getState().isDirectionRound).toBe(false);
    expect(useGameStore.getState().phase).toBe("rock");
  });

  it("directions mode win + wrong direction + retry → new direction round", () => {
    // Math.floor(0.25 * 3) = 0 → AI RPS "rock"; Math.floor(0.25 * 4) = 1 → AI direction "down"
    jest.spyOn(Math, "random").mockReturnValue(0.25);
    const { startGame, advancePhase, makeChoice, makeDirectionChoice } = useGameStore.getState().actions;
    startGame("directions");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeChoice("paper"); // win vs rock
    advancePhase(); // scissors → result
    advancePhase(); // result → direction round rock

    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeDirectionChoice("up"); // player picks up; AI picks down → miss
    advancePhase(); // scissors → result
    advancePhase(); // result → new direction round (attemptsLeft 2→1)

    expect(useGameStore.getState().isDirectionRound).toBe(true);
    expect(useGameStore.getState().directionAttemptsLeft).toBe(1);
    expect(useGameStore.getState().score).toBe(0);
    expect(useGameStore.getState().phase).toBe("rock");
  });

  it("directions mode win + 2 wrong directions → round voided, back to normal", () => {
    // Math.floor(0.25 * 3) = 0 → AI RPS "rock"; Math.floor(0.25 * 4) = 1 → AI direction "down"
    jest.spyOn(Math, "random").mockReturnValue(0.25);
    const { startGame, advancePhase, makeChoice, makeDirectionChoice } = useGameStore.getState().actions;
    startGame("directions");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeChoice("paper"); // win
    advancePhase(); // scissors → result
    advancePhase(); // result → direction round

    // 1st direction attempt
    advancePhase(); advancePhase(); // rock → paper → scissors
    makeDirectionChoice("up"); // miss (AI=down)
    advancePhase(); advancePhase(); // scissors → result → new direction round

    // 2nd direction attempt
    advancePhase(); advancePhase(); // rock → paper → scissors
    makeDirectionChoice("up"); // miss again (AI=down, attemptsLeft=1 → voided)
    advancePhase(); advancePhase(); // scissors → result → back to normal

    expect(useGameStore.getState().isDirectionRound).toBe(false);
    expect(useGameStore.getState().score).toBe(0); // voided
    expect(useGameStore.getState().phase).toBe("rock");
    expect(useGameStore.getState().directionAttemptsLeft).toBe(2); // reset
  });

  it("directions mode lose + AI matches player direction → no score, back to normal", () => {
    // Math.floor(0 * 3) = 0 → AI RPS "rock"; Math.floor(0 * 4) = 0 → AI direction "up"
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { startGame, advancePhase, makeChoice, makeDirectionChoice } = useGameStore.getState().actions;
    startGame("directions");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeChoice("scissors"); // player picks scissors, AI picks rock → player loses
    advancePhase(); // scissors → result
    advancePhase(); // result → direction round (lose)

    expect(useGameStore.getState().pendingRpsResult).toBe("lose");

    advancePhase(); advancePhase(); // rock → paper → scissors
    makeDirectionChoice("up"); // player picks up; AI picks up → matched
    advancePhase(); advancePhase(); // scissors → result → rock

    expect(useGameStore.getState().score).toBe(0); // no score for player
    expect(useGameStore.getState().isDirectionRound).toBe(false);
    expect(useGameStore.getState().phase).toBe("rock");
  });

  it("makeDirectionChoice wrong_type during normal scissors phase", () => {
    const { startGame, advancePhase, makeDirectionChoice } = useGameStore.getState().actions;
    startGame("directions");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    // isDirectionRound is false here, pressing direction = wrong_type
    makeDirectionChoice("up");
    expect(useGameStore.getState().phase).toBe("idle");
    expect(useGameStore.getState().mistakeReason).toBe("wrong_type");
  });

  it("makeChoice wrong_type during direction round scissors phase", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock → player wins
    const { startGame, advancePhase, makeChoice } = useGameStore.getState().actions;
    startGame("directions");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeChoice("paper"); // win
    advancePhase(); // scissors → result
    advancePhase(); // result → direction round

    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    // isDirectionRound is true, pressing RPS = wrong_type
    makeChoice("rock");
    expect(useGameStore.getState().phase).toBe("idle");
    expect(useGameStore.getState().mistakeReason).toBe("wrong_type");
  });

  it("makeChoice wrong_type during grace period when in direction round", () => {
    // Enter direction round, then press RPS during grace period → wrong_type
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { beatInterval, graceBefore } = getRoundTimings(0);
    const { startGame, advancePhase, makeChoice } = useGameStore.getState().actions;
    startGame("directions");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeChoice("paper"); // win
    advancePhase(); // scissors → result
    advancePhase(); // result → direction round (phase=rock)

    // Advance to paper phase in direction round
    jest.advanceTimersByTime(beatInterval);
    advancePhase(); // rock → paper
    // Advance into grace period
    jest.advanceTimersByTime(beatInterval - graceBefore + 10);
    // Press RPS during grace period in direction round = wrong_type
    makeChoice("scissors");
    expect(useGameStore.getState().phase).toBe("idle");
    expect(useGameStore.getState().mistakeReason).toBe("wrong_type");
  });

  it("makeDirectionChoice wrong_type during grace period when NOT in direction round", () => {
    const { beatInterval, graceBefore } = getRoundTimings(0);
    const { startGame, advancePhase, makeDirectionChoice } = useGameStore.getState().actions;
    startGame("directions");
    // Advance to paper phase
    jest.advanceTimersByTime(beatInterval);
    advancePhase(); // rock → paper
    // Advance into grace period
    jest.advanceTimersByTime(beatInterval - graceBefore + 10);
    // Not in direction round, press direction during grace period = wrong_type
    makeDirectionChoice("up");
    expect(useGameStore.getState().phase).toBe("idle");
    expect(useGameStore.getState().mistakeReason).toBe("wrong_type");
  });

  it("makeDirectionChoice accepted during grace period when in direction round", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { beatInterval, graceBefore } = getRoundTimings(0);
    const { startGame, advancePhase, makeChoice, makeDirectionChoice } = useGameStore.getState().actions;
    startGame("directions");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeChoice("paper"); // win vs rock
    advancePhase(); // scissors → result
    advancePhase(); // result → direction round (phase=rock)

    // Advance to paper phase in direction round
    jest.advanceTimersByTime(beatInterval);
    advancePhase(); // rock → paper
    // Advance into grace period
    jest.advanceTimersByTime(beatInterval - graceBefore + 10);
    // In direction round, press direction during grace period = accepted
    makeDirectionChoice("up");
    // Phase transitions to scissors (grace period input treated as scissors timing)
    expect(useGameStore.getState().phase).toBe("scissors");
    expect(useGameStore.getState().playerDirectionChoice).toBe("up");
    expect(useGameStore.getState().isPlaying).toBe(true);
  });

  it("makeDirectionChoice no-op during grace period when direction already chosen (defensive)", () => {
    // This tests the defensive guard at the top of the grace-period branch.
    // The only way to have playerDirectionChoice set while still in paper phase is via
    // direct store manipulation — there is no natural UI path to this state.
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { beatInterval, graceBefore } = getRoundTimings(0);
    const { startGame, advancePhase, makeChoice, makeDirectionChoice } = useGameStore.getState().actions;
    startGame("directions");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeChoice("paper"); // win vs rock
    advancePhase(); // scissors → result
    advancePhase(); // result → direction round (phase=rock)

    // Advance to paper phase in direction round
    jest.advanceTimersByTime(beatInterval);
    advancePhase(); // rock → paper
    // Advance into grace period
    jest.advanceTimersByTime(beatInterval - graceBefore + 10);
    // Force playerDirectionChoice to be already set (defensive edge case)
    useGameStore.setState({ playerDirectionChoice: "up" as Direction });

    // Should return early — playerDirectionChoice already set
    makeDirectionChoice("down");
    expect(useGameStore.getState().playerDirectionChoice).toBe("up"); // unchanged
  });

  it("makeDirectionChoice no-op in scissors phase when direction already chosen", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { startGame, advancePhase, makeChoice, makeDirectionChoice } = useGameStore.getState().actions;
    startGame("directions");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeChoice("paper"); // win vs rock
    advancePhase(); // scissors → result
    advancePhase(); // result → direction round

    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors

    makeDirectionChoice("up"); // sets playerDirectionChoice
    expect(useGameStore.getState().playerDirectionChoice).toBe("up");

    // Second direction choice in scissors should be no-op (line 179)
    makeDirectionChoice("down");
    expect(useGameStore.getState().playerDirectionChoice).toBe("up"); // unchanged
  });

  it("makeDirectionChoice is a no-op when phase is not scissors (directions mode, idle phase)", () => {
    // Tests the `if (phase !== "scissors") return` guard for directions mode
    const { startGame, makeDirectionChoice } = useGameStore.getState().actions;
    startGame("directions");
    // End game to get to idle phase with gameMode=directions still set
    useGameStore.getState().actions.endGame("too_early");
    expect(useGameStore.getState().phase).toBe("idle");
    expect(useGameStore.getState().gameMode).toBe("directions" as GameMode);

    makeDirectionChoice("up"); // phase=idle, not scissors → return early
    expect(useGameStore.getState().phase).toBe("idle");
    expect(useGameStore.getState().playerDirectionChoice).toBeNull();
  });
});
