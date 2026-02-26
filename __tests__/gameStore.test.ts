import { determineResult, getRandomChoice, getRandomDirection, useGameStore } from "@/store/gameStore";
import { getRoundTimings } from "@/lib/rhythmDifficulty";
import type { Choice, Direction, GameMode, ModeData } from "@/store/gameStore";

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

// Helpers for narrowing modeData in assertions
const md = () => useGameStore.getState().modeData;
const mdIsDirectionRound = () => {
  const m = md();
  return m.gameMode === "directions" && m.isDirectionRound;
};
const mdDirectionAttemptsLeft = () => {
  const m = md();
  if (m.gameMode === "classic") throw new Error("Not in directions mode");
  return m.directionAttemptsLeft;
};
const mdPendingRpsResult = () => {
  const m = md();
  if (m.gameMode !== "directions" || !m.isDirectionRound) throw new Error("Not in direction round");
  return m.pendingRpsResult;
};

describe("useGameStore edge cases", () => {
  it("makeInput is a no-op during idle phase", () => {
    const { makeInput } = useGameStore.getState().actions;
    makeInput("rock");
    expect(useGameStore.getState().phase).toBe("idle");
    expect(useGameStore.getState().isPlaying).toBe(false);
  });

  it("makeInput is a no-op during result phase", () => {
    // Setup: start game, advance to scissors, make a choice, advance to result
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame();
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeInput("rock"); // stores choices, phase stays scissors
    expect(useGameStore.getState().phase).toBe("scissors");
    advancePhase(); // scissors + playerChoice → result
    expect(useGameStore.getState().phase).toBe("result");

    // Now try makeInput during result - should be no-op
    useGameStore.getState().actions.makeInput("paper");
    expect(useGameStore.getState().phase).toBe("result");
  });

  it("advancePhase from scissors with playerChoice transitions to result then next round", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame();
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeInput("rock"); // sets playerInput, phase stays scissors

    expect(md().playerInput).toBe("rock");
    expect(useGameStore.getState().phase).toBe("scissors");

    // advancePhase during scissors with playerInput → result
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

    // No makeChoice — playerInput is null
    advancePhase(); // scissors + null playerInput → endGame("too_late")
    expect(useGameStore.getState().phase).toBe("idle");
    expect(useGameStore.getState().isPlaying).toBe(false);
    expect(useGameStore.getState().mistakeReason).toBe("too_late");
  });

  it("makeInput with direction is a no-op in classic mode", () => {
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("classic");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeInput("up");
    // No effect since gameMode is classic
    expect(useGameStore.getState().phase).toBe("scissors");
    expect(md().playerInput).toBeNull();
    expect(useGameStore.getState().isPlaying).toBe(true);
  });

  it("makeInput with direction is a no-op during idle phase (classic mode)", () => {
    const { makeInput } = useGameStore.getState().actions;
    makeInput("up");
    expect(useGameStore.getState().phase).toBe("idle");
    expect(useGameStore.getState().isPlaying).toBe(false);
  });

  it("advancePhase from scissors in direction round with no direction choice ends game too_late", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock → player wins
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("directions");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeInput("paper"); // player wins vs rock
    advancePhase(); // scissors → result
    advancePhase(); // result → rock (enters direction round)

    expect(mdIsDirectionRound()).toBe(true);
    expect(useGameStore.getState().phase).toBe("rock");

    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors

    // No direction choice made
    advancePhase(); // scissors in direction round + no playerInput → too_late
    expect(useGameStore.getState().phase).toBe("idle");
    expect(useGameStore.getState().mistakeReason).toBe("too_late");
  });

  it("directions mode draw increments score without entering direction round", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("directions");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeInput("rock"); // player picks rock → draw vs rock
    advancePhase(); // scissors → result
    advancePhase(); // result → rock (draw → score++)

    expect(useGameStore.getState().score).toBe(1);
    expect(mdIsDirectionRound()).toBe(false);
    expect(useGameStore.getState().phase).toBe("rock");
  });

  it("directions mode win enters direction round and saves pendingRpsResult", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("directions");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeInput("paper"); // player wins vs rock
    advancePhase(); // scissors → result
    advancePhase(); // result → rock (win → enter direction round)

    expect(mdIsDirectionRound()).toBe(true);
    expect(mdPendingRpsResult()).toBe("win");
    expect(mdDirectionAttemptsLeft()).toBe(2);
    expect(useGameStore.getState().score).toBe(0); // no score yet
    expect(useGameStore.getState().phase).toBe("rock");
  });

  it("directions mode win + correct direction → score++", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock, then AI direction = up
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("directions");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeInput("paper"); // win vs rock
    advancePhase(); // scissors → result
    advancePhase(); // result → direction round rock

    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeInput("up"); // player picks up; AI picks up (random=0 → index 0 = "up")
    advancePhase(); // scissors → result
    advancePhase(); // result → rock (matched, win → score++)

    expect(useGameStore.getState().score).toBe(1);
    expect(mdIsDirectionRound()).toBe(false);
    expect(useGameStore.getState().phase).toBe("rock");
  });

  it("directions mode win + wrong direction + retry → new direction round", () => {
    // Math.floor(0.25 * 3) = 0 → AI RPS "rock"; Math.floor(0.25 * 4) = 1 → AI direction "down"
    jest.spyOn(Math, "random").mockReturnValue(0.25);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("directions");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeInput("paper"); // win vs rock
    advancePhase(); // scissors → result
    advancePhase(); // result → direction round rock

    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeInput("up"); // player picks up; AI picks down → miss
    advancePhase(); // scissors → result
    advancePhase(); // result → new direction round (attemptsLeft 2→1)

    expect(mdIsDirectionRound()).toBe(true);
    expect(mdDirectionAttemptsLeft()).toBe(1);
    expect(useGameStore.getState().score).toBe(0);
    expect(useGameStore.getState().phase).toBe("rock");
  });

  it("directions mode win + 2 wrong directions → round voided, back to normal", () => {
    // Math.floor(0.25 * 3) = 0 → AI RPS "rock"; Math.floor(0.25 * 4) = 1 → AI direction "down"
    jest.spyOn(Math, "random").mockReturnValue(0.25);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("directions");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeInput("paper"); // win
    advancePhase(); // scissors → result
    advancePhase(); // result → direction round

    // 1st direction attempt
    advancePhase(); advancePhase(); // rock → paper → scissors
    makeInput("up"); // miss (AI=down)
    advancePhase(); advancePhase(); // scissors → result → new direction round

    // 2nd direction attempt
    advancePhase(); advancePhase(); // rock → paper → scissors
    makeInput("up"); // miss again (AI=down, attemptsLeft=1 → voided)
    advancePhase(); advancePhase(); // scissors → result → back to normal

    expect(mdIsDirectionRound()).toBe(false);
    expect(useGameStore.getState().score).toBe(0); // voided
    expect(useGameStore.getState().phase).toBe("rock");
    expect(mdDirectionAttemptsLeft()).toBe(2); // reset
  });

  it("directions mode lose + AI matches player direction → no score, back to normal", () => {
    // Math.floor(0 * 3) = 0 → AI RPS "rock"; Math.floor(0 * 4) = 0 → AI direction "up"
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("directions");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeInput("scissors"); // player picks scissors, AI picks rock → player loses
    advancePhase(); // scissors → result
    advancePhase(); // result → direction round (lose)

    expect(mdPendingRpsResult()).toBe("lose");

    advancePhase(); advancePhase(); // rock → paper → scissors
    makeInput("up"); // player picks up; AI picks up → matched
    advancePhase(); advancePhase(); // scissors → result → rock

    expect(useGameStore.getState().score).toBe(0); // no score for player
    expect(mdIsDirectionRound()).toBe(false);
    expect(useGameStore.getState().phase).toBe("rock");
  });

  it("makeInput with direction wrong_type during normal scissors phase", () => {
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("directions");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    // isDirectionRound is false here, pressing direction = wrong_type
    makeInput("up");
    expect(useGameStore.getState().phase).toBe("idle");
    expect(useGameStore.getState().mistakeReason).toBe("wrong_type");
  });

  it("makeInput with choice wrong_type during direction round scissors phase", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock → player wins
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("directions");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeInput("paper"); // win
    advancePhase(); // scissors → result
    advancePhase(); // result → direction round

    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    // isDirectionRound is true, pressing RPS = wrong_type
    makeInput("rock");
    expect(useGameStore.getState().phase).toBe("idle");
    expect(useGameStore.getState().mistakeReason).toBe("wrong_type");
  });

  it("makeInput with choice wrong_type during grace period when in direction round", () => {
    // Enter direction round, then press RPS during grace period → wrong_type
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { beatInterval, graceBefore } = getRoundTimings(0);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("directions");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeInput("paper"); // win
    advancePhase(); // scissors → result
    advancePhase(); // result → direction round (phase=rock)

    // Advance to paper phase in direction round
    jest.advanceTimersByTime(beatInterval);
    advancePhase(); // rock → paper
    // Advance into grace period
    jest.advanceTimersByTime(beatInterval - graceBefore + 10);
    // Press RPS during grace period in direction round = wrong_type
    makeInput("scissors");
    expect(useGameStore.getState().phase).toBe("idle");
    expect(useGameStore.getState().mistakeReason).toBe("wrong_type");
  });

  it("makeInput with direction wrong_type during grace period when NOT in direction round", () => {
    const { beatInterval, graceBefore } = getRoundTimings(0);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("directions");
    // Advance to paper phase
    jest.advanceTimersByTime(beatInterval);
    advancePhase(); // rock → paper
    // Advance into grace period
    jest.advanceTimersByTime(beatInterval - graceBefore + 10);
    // Not in direction round, press direction during grace period = wrong_type
    makeInput("up");
    expect(useGameStore.getState().phase).toBe("idle");
    expect(useGameStore.getState().mistakeReason).toBe("wrong_type");
  });

  it("makeInput with direction accepted during grace period when in direction round", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { beatInterval, graceBefore } = getRoundTimings(0);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("directions");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeInput("paper"); // win vs rock
    advancePhase(); // scissors → result
    advancePhase(); // result → direction round (phase=rock)

    // Advance to paper phase in direction round
    jest.advanceTimersByTime(beatInterval);
    advancePhase(); // rock → paper
    // Advance into grace period
    jest.advanceTimersByTime(beatInterval - graceBefore + 10);
    // In direction round, press direction during grace period = accepted
    makeInput("up");
    // Phase transitions to scissors (grace period input treated as scissors timing)
    expect(useGameStore.getState().phase).toBe("scissors");
    const modeData = useGameStore.getState().modeData;
    expect(modeData.gameMode === "directions" && modeData.isDirectionRound ? modeData.playerInput : null).toBe("up");
    expect(useGameStore.getState().isPlaying).toBe(true);
  });

  it("makeInput no-op during grace period when direction already chosen (defensive)", () => {
    // This tests the defensive guard at the top of the grace-period branch.
    // The only way to have playerInput set while still in paper phase is via
    // direct store manipulation — there is no natural UI path to this state.
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { beatInterval, graceBefore } = getRoundTimings(0);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("directions");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeInput("paper"); // win vs rock
    advancePhase(); // scissors → result
    advancePhase(); // result → direction round (phase=rock)

    // Advance to paper phase in direction round
    jest.advanceTimersByTime(beatInterval);
    advancePhase(); // rock → paper
    // Advance into grace period
    jest.advanceTimersByTime(beatInterval - graceBefore + 10);
    // Force playerInput to be already set (defensive edge case)
    useGameStore.setState((state) => ({
      modeData: { ...state.modeData, playerInput: "up" as Direction } as ModeData,
    }));

    // Should return early — playerInput already set
    makeInput("down");
    const modeData = useGameStore.getState().modeData;
    expect(modeData.gameMode === "directions" && modeData.isDirectionRound ? modeData.playerInput : null).toBe("up"); // unchanged
  });

  it("makeInput no-op in scissors phase when direction already chosen", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("directions");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeInput("paper"); // win vs rock
    advancePhase(); // scissors → result
    advancePhase(); // result → direction round

    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors

    makeInput("up"); // sets playerInput
    {
      const modeData = useGameStore.getState().modeData;
      expect(modeData.gameMode === "directions" && modeData.isDirectionRound ? modeData.playerInput : null).toBe("up");
    }

    // Second direction choice in scissors should be no-op
    makeInput("down");
    {
      const modeData = useGameStore.getState().modeData;
      expect(modeData.gameMode === "directions" && modeData.isDirectionRound ? modeData.playerInput : null).toBe("up"); // unchanged
    }
  });

  it("makeInput with choice accepted during grace period in directions RPS round (non-direction round)", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const { beatInterval, graceBefore } = getRoundTimings(0);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("directions");
    jest.advanceTimersByTime(beatInterval);
    advancePhase(); // rock → paper
    jest.advanceTimersByTime(beatInterval - graceBefore + 10); // into grace period
    // In directions RPS round (not direction round), grace period RPS press = accepted
    makeInput("paper"); // wins vs rock
    expect(useGameStore.getState().phase).toBe("scissors");
    expect(md().playerInput).toBe("paper");
    expect(useGameStore.getState().isPlaying).toBe(true);
  });

  it("makeInput is a no-op when player already chose in scissors phase", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame();
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeInput("paper"); // first press
    const firstInput = md().playerInput;

    makeInput("rock"); // second press: playerInput already set → no-op
    expect(md().playerInput).toBe(firstInput); // unchanged
    expect(useGameStore.getState().isPlaying).toBe(true);
  });

  it("makeInput with direction is a no-op when phase is not scissors (directions mode, idle phase)", () => {
    // Tests the `if (phase !== "scissors") return` guard for directions mode
    const { startGame, makeInput } = useGameStore.getState().actions;
    startGame("directions");
    // End game to get to idle phase with gameMode=directions still set
    useGameStore.getState().actions.endGame("too_early");
    expect(useGameStore.getState().phase).toBe("idle");
    expect(useGameStore.getState().modeData.gameMode).toBe("directions" as GameMode);

    makeInput("up"); // phase=idle, not scissors → return early
    expect(useGameStore.getState().phase).toBe("idle");
    expect(useGameStore.getState().modeData.playerInput).toBeNull();
  });
});
