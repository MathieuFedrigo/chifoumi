import { determineResult, getRandomChoice, getRandomDirection, useGameStore } from "@/store/gameStore";
import { getRoundTimings } from "@/lib/rhythmDifficulty";
import type { Choice, CountdownState, Direction, GameMode, ModeData } from "@/store/gameStore";

describe("determineResult", () => {
  it("returns draw for same choices", () => {
    expect(determineResult({ player: "rock", ai: "rock" })).toBe("draw");
    expect(determineResult({ player: "paper", ai: "paper" })).toBe("draw");
    expect(determineResult({ player: "scissors", ai: "scissors" })).toBe("draw");
  });

  it("returns win when player beats AI", () => {
    expect(determineResult({ player: "rock", ai: "scissors" })).toBe("win");
    expect(determineResult({ player: "paper", ai: "rock" })).toBe("win");
    expect(determineResult({ player: "scissors", ai: "paper" })).toBe("win");
  });

  it("returns lose when AI beats player", () => {
    expect(determineResult({ player: "rock", ai: "paper" })).toBe("lose");
    expect(determineResult({ player: "paper", ai: "scissors" })).toBe("lose");
    expect(determineResult({ player: "scissors", ai: "rock" })).toBe("lose");
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
  if (m.gameMode !== "directions") throw new Error("Not in directions mode");
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

  it("makeInput during result phase ends game with too_early (classic)", () => {
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

    // makeInput during result in classic mode → too_early (result is interactive)
    useGameStore.getState().actions.makeInput("paper");
    expect(useGameStore.getState().phase).toBe("idle");
    expect(useGameStore.getState().mistakeReason).toBe("too_early");
  });

  it("pressing twice during scissors ends game with too_early", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame();
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeInput("scissors"); // valid first input
    expect(md().playerInput).toBe("scissors");

    makeInput("rock"); // second press → too_early
    expect(useGameStore.getState().phase).toBe("idle");
    expect(useGameStore.getState().mistakeReason).toBe("too_early");
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
    expect(useGameStore.getState().score).toBe(1); // +1 for RPS input
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

    expect(useGameStore.getState().score).toBe(2);
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
    expect(useGameStore.getState().score).toBe(2);
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
    expect(useGameStore.getState().score).toBe(3); // +1 RPS + 2 direction attempts
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

    expect(useGameStore.getState().score).toBe(2); // +1 RPS + 1 direction
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

  it("makeInput second press during scissors phase ends game with too_early", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame();
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeInput("paper"); // first press: accepted

    makeInput("rock"); // second press: playerInput already set → too_early
    expect(useGameStore.getState().phase).toBe("idle");
    expect(useGameStore.getState().mistakeReason).toBe("too_early");
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

// Helpers for countdown mode
const mdCountdownState = (): CountdownState => {
  const m = md();
  if (m.gameMode !== "countdown") throw new Error("Not in countdown mode");
  return m.countdownState;
};

describe("useGameStore countdown mode", () => {
  it("startGame('countdown') initializes countdownState=3", () => {
    const { startGame } = useGameStore.getState().actions;
    startGame("countdown");
    expect(useGameStore.getState().phase).toBe("rock");
    expect(useGameStore.getState().isPlaying).toBe(true);
    expect(md().gameMode).toBe("countdown");
    expect(mdCountdownState()).toBe(3);
  });

  it("state 3: full R-P-S cycle (same as classic), input on scissors", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdown");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors
    makeInput("paper"); // wins vs rock
    expect(md().playerInput).toBe("paper");
    expect(useGameStore.getState().phase).toBe("scissors");
    advancePhase(); // scissors → result
    expect(useGameStore.getState().phase).toBe("result");
    advancePhase(); // result → rock (score++)
    expect(useGameStore.getState().score).toBe(1);
    expect(mdCountdownState()).toBe(2); // 3 → 2
  });

  it("state 2: R-P cycle, input on paper (choose phase)", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdown");

    // Complete state 3 to get to state 2
    advancePhase(); advancePhase(); // rock → paper → scissors
    makeInput("rock"); // draw
    advancePhase(); advancePhase(); // scissors → result → rock (score=1, state=2)

    expect(mdCountdownState()).toBe(2);
    advancePhase(); // rock → paper (choose phase for state 2)
    expect(useGameStore.getState().phase).toBe("paper");
    makeInput("paper"); // input on paper (choose phase)
    expect(md().playerInput).toBe("paper");
    advancePhase(); // paper → result
    expect(useGameStore.getState().phase).toBe("result");
    advancePhase(); // result → rock (score=2, state=1)
    expect(useGameStore.getState().score).toBe(2);
    expect(mdCountdownState()).toBe(1);
  });

  it("state 1: input on rock (choose phase)", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdown");

    // Complete state 3 → state 2
    advancePhase(); advancePhase();
    makeInput("rock");
    advancePhase(); advancePhase();
    // Complete state 2 → state 1
    advancePhase();
    makeInput("rock");
    advancePhase(); advancePhase();

    expect(mdCountdownState()).toBe(1);
    // Rock is the choose phase for state 1
    expect(useGameStore.getState().phase).toBe("rock");
    makeInput("paper"); // input on rock (choose phase)
    expect(md().playerInput).toBe("paper");
    advancePhase(); // rock → result
    expect(useGameStore.getState().phase).toBe("result");
    advancePhase(); // result → rock (score=3, state=3 again)
    expect(useGameStore.getState().score).toBe(3);
    expect(mdCountdownState()).toBe(3); // cycles back to 3
  });

  it("state 3: too_early on rock phase", () => {
    const { startGame, makeInput } = useGameStore.getState().actions;
    startGame("countdown");
    makeInput("rock"); // rock phase in state 3 → too_early (rock is not choose/grace phase)
    expect(useGameStore.getState().mistakeReason).toBe("too_early");
  });

  it("state 3: too_late when no input on scissors", () => {
    const { startGame, advancePhase } = useGameStore.getState().actions;
    startGame("countdown");
    advancePhase(); // rock → paper
    advancePhase(); // paper → scissors (choose phase)
    advancePhase(); // scissors with no input → too_late
    expect(useGameStore.getState().mistakeReason).toBe("too_late");
  });

  it("state 2: too_early on paper phase before grace", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdown");
    // Complete state 3
    advancePhase(); advancePhase();
    makeInput("rock");
    advancePhase(); advancePhase();

    expect(mdCountdownState()).toBe(2);
    // In state 2, rock is grace phase. Press during rock before grace period.
    makeInput("rock");
    expect(useGameStore.getState().mistakeReason).toBe("too_early");
  });

  it("state 2: too_late when no input on paper", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdown");
    // Complete state 3
    advancePhase(); advancePhase();
    makeInput("rock");
    advancePhase(); advancePhase();

    expect(mdCountdownState()).toBe(2);
    advancePhase(); // rock → paper (choose phase)
    advancePhase(); // paper with no input → too_late
    expect(useGameStore.getState().mistakeReason).toBe("too_late");
  });

  it("state 2: grace period on rock phase accepts input", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { beatInterval, graceBefore } = getRoundTimings(1);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdown");
    // Complete state 3
    advancePhase(); advancePhase();
    makeInput("rock");
    advancePhase(); advancePhase();

    expect(mdCountdownState()).toBe(2);
    // Advance time into grace period of rock phase
    jest.advanceTimersByTime(beatInterval - graceBefore + 10);
    makeInput("paper"); // grace period input on rock → accepted, advances to paper
    expect(useGameStore.getState().phase).toBe("paper");
    expect(md().playerInput).toBe("paper");
  });

  it("state 1: no grace phase, any non-rock phase is too_early", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdown");
    // Complete state 3 → state 2 → state 1
    advancePhase(); advancePhase();
    makeInput("rock");
    advancePhase(); advancePhase();
    advancePhase();
    makeInput("rock");
    advancePhase(); advancePhase();

    expect(mdCountdownState()).toBe(1);
    // State 1: rock is choose phase, no grace phase. Any other phase would be too_early.
    // But since we start at rock (which IS the choose phase), pressing immediately works.
    makeInput("rock"); // input on rock (choose phase) → accepted
    expect(md().playerInput).toBe("rock");
  });

  it("countdown cycles 3→2→1→3 across multiple rounds", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdown");

    // Round 1: state 3
    expect(mdCountdownState()).toBe(3);
    advancePhase(); advancePhase();
    makeInput("rock");
    advancePhase(); advancePhase();

    // Round 2: state 2
    expect(mdCountdownState()).toBe(2);
    advancePhase();
    makeInput("rock");
    advancePhase(); advancePhase();

    // Round 3: state 1
    expect(mdCountdownState()).toBe(1);
    makeInput("rock");
    advancePhase(); advancePhase();

    // Round 4: back to state 3
    expect(mdCountdownState()).toBe(3);
    expect(useGameStore.getState().score).toBe(3);
  });

  it("makeInput no-op when playerInput already set on choose phase", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdown");
    advancePhase(); advancePhase(); // → scissors (choose phase for state 3)
    makeInput("rock"); // first input
    const firstInput = md().playerInput;
    makeInput("paper"); // second input → no-op
    expect(md().playerInput).toBe(firstInput);
  });

  it("makeInput no-op when playerInput already set during grace period", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { beatInterval, graceBefore } = getRoundTimings(1);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdown");
    // Complete state 3 → state 2
    advancePhase(); advancePhase();
    makeInput("rock");
    advancePhase(); advancePhase();

    expect(mdCountdownState()).toBe(2);
    // Force playerInput to be set during grace
    jest.advanceTimersByTime(beatInterval - graceBefore + 10);
    makeInput("paper"); // first grace input
    expect(md().playerInput).toBe("paper");
    makeInput("rock"); // second grace input → no-op (already on choose phase with input)
    expect(md().playerInput).toBe("paper");
  });

  it("makeInput no-op during grace phase when playerInput already set (defensive)", () => {
    // Defensive edge case: playerInput is set via direct store manipulation while still in grace phase
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { beatInterval, graceBefore } = getRoundTimings(1);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdown");
    // Complete state 3 → state 2
    advancePhase(); advancePhase();
    makeInput("rock");
    advancePhase(); advancePhase();

    expect(mdCountdownState()).toBe(2);
    // Advance time into grace period of rock (grace phase for state 2)
    jest.advanceTimersByTime(beatInterval - graceBefore + 10);
    // Force playerInput to be already set
    useGameStore.setState((state) => ({
      modeData: { ...state.modeData, playerInput: "paper" as Choice } as ModeData,
    }));
    // Try to make input during grace phase → should be no-op
    makeInput("scissors");
    expect(md().playerInput).toBe("paper"); // unchanged
  });

  it("makeInput with direction is a no-op in countdown mode", () => {
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdown");
    advancePhase(); advancePhase(); // → scissors
    makeInput("up"); // direction in countdown → no-op (isDir && gameMode !== directions)
    expect(useGameStore.getState().phase).toBe("scissors");
    expect(md().playerInput).toBeNull();
  });

  it("state 2: too_early on rock phase before grace period starts", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdown");
    // Complete state 3
    advancePhase(); advancePhase();
    makeInput("rock");
    advancePhase(); advancePhase();

    expect(mdCountdownState()).toBe(2);
    // Rock is grace phase for state 2, but no time has elapsed yet → too_early
    makeInput("rock");
    expect(useGameStore.getState().mistakeReason).toBe("too_early");
  });
});

// Helpers for countdownDirections mode
const mdCdState = (): CountdownState => {
  const m = md();
  if (m.gameMode !== "countdownDirections") throw new Error("Not in countdownDirections mode");
  return m.countdownState;
};
const mdCdIsDirectionRound = () => {
  const m = md();
  return m.gameMode === "countdownDirections" && m.isDirectionRound;
};
const mdCdDirectionAttemptsLeft = () => {
  const m = md();
  if (m.gameMode !== "countdownDirections") throw new Error("Not in countdownDirections mode");
  return m.directionAttemptsLeft;
};
const mdCdPendingRpsResult = () => {
  const m = md();
  if (m.gameMode !== "countdownDirections" || !m.isDirectionRound) throw new Error("Not in countdownDirections direction round");
  return m.pendingRpsResult;
};

describe("useGameStore countdownDirections mode", () => {
  it("startGame('countdownDirections') initializes correctly", () => {
    const { startGame } = useGameStore.getState().actions;
    startGame("countdownDirections");
    expect(useGameStore.getState().phase).toBe("rock");
    expect(useGameStore.getState().isPlaying).toBe(true);
    expect(md().gameMode).toBe("countdownDirections");
    expect(mdCdState()).toBe(3);
    expect(mdCdIsDirectionRound()).toBe(false);
    expect(mdCdDirectionAttemptsLeft()).toBe(2);
  });

  it("countdown always advances 3→2→1→3 per round", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock → draw
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdownDirections");

    // Round 1: state 3 (scissors is choose phase)
    expect(mdCdState()).toBe(3);
    advancePhase(); advancePhase(); // rock → paper → scissors
    makeInput("rock"); // draw
    advancePhase(); advancePhase(); // scissors → result → rock

    // Round 2: state 2 (paper is choose phase)
    expect(mdCdState()).toBe(2);
    advancePhase(); // rock → paper
    makeInput("rock"); // draw
    advancePhase(); advancePhase(); // paper → result → rock

    // Round 3: state 1 (rock is choose phase)
    expect(mdCdState()).toBe(1);
    makeInput("rock"); // draw
    advancePhase(); advancePhase(); // rock → result → rock

    // Round 4: back to state 3
    expect(mdCdState()).toBe(3);
    expect(useGameStore.getState().score).toBe(3);
  });

  it("RPS draw → next countdown state, stays RPS phase", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdownDirections");

    advancePhase(); advancePhase(); // → scissors
    makeInput("rock"); // draw vs rock
    advancePhase(); advancePhase(); // scissors → result → rock

    expect(useGameStore.getState().score).toBe(1);
    expect(mdCdState()).toBe(2);
    expect(mdCdIsDirectionRound()).toBe(false);
  });

  it("RPS win → next countdown state, enters direction phase", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdownDirections");

    advancePhase(); advancePhase(); // → scissors
    makeInput("paper"); // wins vs rock
    advancePhase(); advancePhase(); // scissors → result → rock

    expect(mdCdState()).toBe(2);
    expect(mdCdIsDirectionRound()).toBe(true);
    expect(mdCdPendingRpsResult()).toBe("win");
    expect(mdCdDirectionAttemptsLeft()).toBe(2);
  });

  it("RPS lose → next countdown state, enters direction phase", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdownDirections");

    advancePhase(); advancePhase(); // → scissors
    makeInput("scissors"); // loses vs rock
    advancePhase(); advancePhase(); // scissors → result → rock

    expect(mdCdState()).toBe(2);
    expect(mdCdIsDirectionRound()).toBe(true);
    expect(mdCdPendingRpsResult()).toBe("lose");
  });

  it("direction match → next countdown state, back to RPS", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI rock, AI dir up
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdownDirections");

    // Win RPS in state 3
    advancePhase(); advancePhase();
    makeInput("paper");
    advancePhase(); advancePhase();

    // Direction round in state 2 (paper is choose phase)
    expect(mdCdState()).toBe(2);
    advancePhase(); // rock → paper
    makeInput("up"); // matches AI up
    advancePhase(); advancePhase(); // paper → result → rock

    expect(mdCdState()).toBe(1);
    expect(mdCdIsDirectionRound()).toBe(false);
    expect(useGameStore.getState().score).toBe(2);
  });

  it("direction mismatch with attempts → next countdown state, another direction round", () => {
    // Math.floor(0.25 * 3) = 0 → AI rock; Math.floor(0.25 * 4) = 1 → AI dir down
    jest.spyOn(Math, "random").mockReturnValue(0.25);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdownDirections");

    // Win RPS in state 3
    advancePhase(); advancePhase();
    makeInput("paper");
    advancePhase(); advancePhase();

    // Direction round in state 2 (paper is choose phase)
    expect(mdCdState()).toBe(2);
    advancePhase(); // rock → paper
    makeInput("up"); // miss (AI=down)
    advancePhase(); advancePhase(); // paper → result → rock

    expect(mdCdState()).toBe(1);
    expect(mdCdIsDirectionRound()).toBe(true);
    expect(mdCdDirectionAttemptsLeft()).toBe(1);
  });

  it("direction mismatch no attempts → next countdown state, voided, back to RPS", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.25); // AI rock, AI dir down
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdownDirections");

    // Win RPS in state 3
    advancePhase(); advancePhase();
    makeInput("paper");
    advancePhase(); advancePhase();

    // 1st direction attempt in state 2
    advancePhase();
    makeInput("up"); // miss
    advancePhase(); advancePhase();

    // 2nd direction attempt in state 1
    expect(mdCdState()).toBe(1);
    makeInput("up"); // miss again, attemptsLeft=1 → voided
    advancePhase(); advancePhase();

    expect(mdCdState()).toBe(3); // cycled back
    expect(mdCdIsDirectionRound()).toBe(false);
    expect(useGameStore.getState().score).toBe(3);
  });

  it("choose/grace phases follow countdown state rhythm", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { beatInterval, graceBefore } = getRoundTimings(1);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdownDirections");

    // Complete state 3 → state 2
    advancePhase(); advancePhase();
    makeInput("rock");
    advancePhase(); advancePhase();

    expect(mdCdState()).toBe(2);
    // State 2: grace on rock, choose on paper
    jest.advanceTimersByTime(beatInterval - graceBefore + 10);
    makeInput("paper"); // grace period input on rock → accepted
    expect(useGameStore.getState().phase).toBe("paper");
    expect(md().playerInput).toBe("paper");
  });

  it("wrong input type rejected: direction during RPS round", () => {
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdownDirections");
    advancePhase(); advancePhase(); // → scissors
    makeInput("up"); // direction during RPS → wrong_type
    expect(useGameStore.getState().mistakeReason).toBe("wrong_type");
  });

  it("wrong input type rejected: RPS during direction round", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdownDirections");
    advancePhase(); advancePhase();
    makeInput("paper"); // win
    advancePhase(); advancePhase();

    // In direction round, state 2
    advancePhase(); // rock → paper (choose phase)
    makeInput("rock"); // RPS during direction round → wrong_type
    expect(useGameStore.getState().mistakeReason).toBe("wrong_type");
  });

  it("too_late when no input on choose phase", () => {
    const { startGame, advancePhase } = useGameStore.getState().actions;
    startGame("countdownDirections");
    advancePhase(); advancePhase(); // → scissors (choose for state 3)
    advancePhase(); // scissors with no input → too_late
    expect(useGameStore.getState().mistakeReason).toBe("too_late");
  });

  it("too_early on rock in state 3", () => {
    const { startGame, makeInput } = useGameStore.getState().actions;
    startGame("countdownDirections");
    makeInput("rock"); // rock in state 3 → too_early
    expect(useGameStore.getState().mistakeReason).toBe("too_early");
  });

  it("direction input during grace period in direction round accepted", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { beatInterval, graceBefore } = getRoundTimings(1);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdownDirections");

    // Win RPS in state 3
    advancePhase(); advancePhase();
    makeInput("paper");
    advancePhase(); advancePhase();

    // Direction round in state 2, grace on rock, choose on paper
    jest.advanceTimersByTime(beatInterval - graceBefore + 10);
    makeInput("up"); // direction during grace → accepted, advances to paper
    expect(useGameStore.getState().phase).toBe("paper");
    const mData = useGameStore.getState().modeData;
    expect(mData.gameMode === "countdownDirections" && mData.isDirectionRound ? mData.playerInput : null).toBe("up");
  });

  it("makeInput with direction is a no-op during idle phase", () => {
    const { startGame, makeInput } = useGameStore.getState().actions;
    startGame("countdownDirections");
    useGameStore.getState().actions.endGame("too_early");
    makeInput("up"); // phase=idle → return early
    expect(useGameStore.getState().phase).toBe("idle");
  });

  it("makeInput no-op when playerInput already set", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdownDirections");
    advancePhase(); advancePhase();
    makeInput("rock");
    const first = md().playerInput;
    makeInput("paper"); // no-op
    expect(md().playerInput).toBe(first);
  });

  it("too_late in direction round when no direction chosen", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdownDirections");
    advancePhase(); advancePhase();
    makeInput("paper"); // win
    advancePhase(); advancePhase();

    // Direction round state 2 (paper is choose phase)
    advancePhase(); // rock → paper
    advancePhase(); // paper with no input → too_late
    expect(useGameStore.getState().mistakeReason).toBe("too_late");
  });

  it("wrong_type: direction during grace period when NOT in direction round", () => {
    const { beatInterval, graceBefore } = getRoundTimings(0);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdownDirections");
    jest.advanceTimersByTime(beatInterval);
    advancePhase(); // rock → paper
    jest.advanceTimersByTime(beatInterval - graceBefore + 10);
    makeInput("up"); // not direction round, press direction → wrong_type
    expect(useGameStore.getState().mistakeReason).toBe("wrong_type");
  });

  it("wrong_type: RPS during grace period when in direction round", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { beatInterval, graceBefore } = getRoundTimings(1);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdownDirections");
    advancePhase(); advancePhase();
    makeInput("paper"); // win
    advancePhase(); advancePhase();

    // Direction round state 2 (grace on rock)
    jest.advanceTimersByTime(beatInterval - graceBefore + 10);
    makeInput("scissors"); // RPS during direction round grace → wrong_type
    expect(useGameStore.getState().mistakeReason).toBe("wrong_type");
  });

  it("makeInput no-op when direction already chosen in direction round", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdownDirections");
    advancePhase(); advancePhase();
    makeInput("paper"); // win
    advancePhase(); advancePhase();

    // Direction round state 2
    advancePhase(); // rock → paper (choose phase)
    makeInput("up"); // first
    makeInput("down"); // second → no-op
    const mData = useGameStore.getState().modeData;
    expect(mData.gameMode === "countdownDirections" && mData.isDirectionRound ? mData.playerInput : null).toBe("up");
  });

  it("makeInput no-op during grace period when direction already chosen (defensive)", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { beatInterval, graceBefore } = getRoundTimings(1);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdownDirections");
    advancePhase(); advancePhase();
    makeInput("paper"); // win
    advancePhase(); advancePhase();

    // Direction round state 2 (grace on rock)
    jest.advanceTimersByTime(beatInterval - graceBefore + 10);
    useGameStore.setState((state) => ({
      modeData: { ...state.modeData, playerInput: "up" as Direction } as ModeData,
    }));
    makeInput("down"); // already set → no-op
    const mData = useGameStore.getState().modeData;
    expect(mData.gameMode === "countdownDirections" && mData.isDirectionRound ? mData.playerInput : null).toBe("up");
  });

  it("cS=2 result grace: RPS input creates new round (countdown mode)", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdown");

    // Complete state 3 → state 2
    advancePhase(); advancePhase();
    makeInput("rock"); // draw
    advancePhase(); advancePhase(); // scissors → result → rock (now cS=2)

    // State 2: paper is choose phase
    expect(mdCountdownState()).toBe(2);
    advancePhase(); // rock → paper
    makeInput("paper"); // win on rock
    advancePhase(); // paper → result

    expect(useGameStore.getState().phase).toBe("result");

    // Advance into grace window
    const t = getRoundTimings(2);
    jest.advanceTimersByTime(t.beatInterval - t.graceBefore + 10);

    // Grace press during cS=2 result → creates new round with cS=1
    makeInput("paper");
    expect(useGameStore.getState().phase).toBe("rock");
    expect(mdCountdownState()).toBe(1);
    expect(md().playerInput).toBe("paper");
  });

  it("cS=2 result grace: direction input in countdown mode is ignored (no-op)", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdown");

    // Complete state 3 → state 2
    advancePhase(); advancePhase();
    makeInput("rock");
    advancePhase(); advancePhase();

    expect(mdCountdownState()).toBe(2);
    advancePhase(); // rock → paper
    makeInput("paper");
    advancePhase(); // paper → result

    const t = getRoundTimings(2);
    jest.advanceTimersByTime(t.beatInterval - t.graceBefore + 10);

    // Direction press in countdown mode → no-op (filtered by gameMode check)
    makeInput("up");
    expect(useGameStore.getState().phase).toBe("result");
  });

  it("cS=1 result: press ends game with too_early (no grace here)", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdown");

    // Complete state 3 → 2 → 1
    advancePhase(); advancePhase();
    makeInput("rock");
    advancePhase(); advancePhase();
    advancePhase();
    makeInput("rock");
    advancePhase(); advancePhase();

    expect(mdCountdownState()).toBe(1);
    makeInput("paper"); // win on rock
    advancePhase(); // rock → result

    const t = getRoundTimings(2);
    jest.advanceTimersByTime(t.beatInterval - t.graceBefore + 10);

    // Press during cS=1 result → too_early (next is cS=3, choose=scissors, not rock)
    makeInput("paper");
    expect(useGameStore.getState().mistakeReason).toBe("too_early");
  });

  it("cS=3 result: press ends game with too_early (no grace here)", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdown");

    // Complete state 3
    advancePhase(); advancePhase();
    makeInput("rock"); // draw
    advancePhase(); // scissors → result

    expect(useGameStore.getState().phase).toBe("result");

    const t = getRoundTimings(0);
    jest.advanceTimersByTime(t.beatInterval - t.graceBefore + 10);

    // Press during cS=3 result → too_early (next is cS=2, choose=paper, not rock)
    makeInput("paper");
    expect(useGameStore.getState().mistakeReason).toBe("too_early");
  });

  it("cS=2 result grace: wrong_type direction in countdownDirections (draw → next is RPS)", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdownDirections");

    // Complete state 3 → state 2 with draw
    advancePhase(); advancePhase();
    makeInput("rock"); // draw
    advancePhase(); advancePhase(); // scissors → result → rock (now cS=2)

    // State 2: paper is choose phase
    expect(mdCdState()).toBe(2);
    advancePhase(); // rock → paper
    makeInput("rock"); // draw on paper choose
    advancePhase(); // paper → result

    expect(useGameStore.getState().phase).toBe("result");

    const t = getRoundTimings(2);
    jest.advanceTimersByTime(t.beatInterval - t.graceBefore + 10);

    // Grace press: next round is RPS (draw → COUNTDOWN_DIR_RPS_RESET), direction should be wrong_type
    makeInput("up");
    expect(useGameStore.getState().mistakeReason).toBe("wrong_type");
  });

  it("cS=2 result grace: wrong_type direction in countdownDirections (win → next is direction round)", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock, AI dir up
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdownDirections");

    // Complete state 3 → state 2
    advancePhase(); advancePhase();
    makeInput("rock"); // draw
    advancePhase(); advancePhase(); // scissors → result → rock (now cS=2)

    // State 2: paper is choose phase
    expect(mdCdState()).toBe(2);
    advancePhase(); // rock → paper
    makeInput("paper"); // win on rock → next round will be direction round
    advancePhase(); // paper → result

    expect(useGameStore.getState().phase).toBe("result");

    const t = getRoundTimings(2);
    jest.advanceTimersByTime(t.beatInterval - t.graceBefore + 10);

    // Grace press: direction during RPS result → early wrong_type (before phase-specific logic)
    makeInput("up");
    expect(useGameStore.getState().mistakeReason).toBe("wrong_type");
  });

  it("cS=2 result grace: wrong_type RPS in countdownDirections (win → next is direction round)", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock, AI dir up
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdownDirections");

    // Complete state 3 → state 2
    advancePhase(); advancePhase();
    makeInput("rock"); // draw
    advancePhase(); advancePhase(); // scissors → result → rock (now cS=2)

    // State 2: paper is choose phase
    expect(mdCdState()).toBe(2);
    advancePhase(); // rock → paper
    makeInput("paper"); // win on rock → next round will be direction round
    advancePhase(); // paper → result

    expect(useGameStore.getState().phase).toBe("result");

    const t = getRoundTimings(2);
    jest.advanceTimersByTime(t.beatInterval - t.graceBefore + 10);

    // Grace press: RPS input matches current round type (passes early check),
    // but next round expects direction → wrong_type at result grace logic
    makeInput("rock");
    expect(useGameStore.getState().mistakeReason).toBe("wrong_type");
  });

  it("cS=2 result grace: direction accepted when next round is also direction (countdownDirections)", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock, AI dir up
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdownDirections");

    // Win RPS at cS=3 → direction round at cS=2
    advancePhase(); advancePhase();
    makeInput("paper"); // win vs rock
    advancePhase(); // scissors → result

    // Advance past result to direction round at cS=2
    advancePhase(); // result → rock (direction round, cS=2, attemptsLeft=2)
    expect(useGameStore.getState().phase).toBe("rock");
    const mData = useGameStore.getState().modeData;
    expect(mData.gameMode === "countdownDirections" && mData.isDirectionRound).toBe(true);

    // Wrong direction guess (AI picks up=0, we pick down)
    advancePhase(); // rock → paper (grace phase for cS=2)
    makeInput("down"); // wrong direction, attemptsLeft was 2 → next round: direction, cS=1, attemptsLeft=1
    advancePhase(); // paper → result

    expect(useGameStore.getState().phase).toBe("result");
    expect(mdCdState()).toBe(2); // still cS=2 until next round

    const t = getRoundTimings(2);
    jest.advanceTimersByTime(t.beatInterval - t.graceBefore + 10);

    // Grace press: direction matches current (direction) and next (direction) round type
    makeInput("up");
    expect(useGameStore.getState().phase).toBe("rock");
    expect(mdCdState()).toBe(1);
  });

  it("cS=2 result grace: press before grace window ends game with too_early", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { startGame, advancePhase, makeInput } = useGameStore.getState().actions;
    startGame("countdown");

    // Complete state 3 → state 2
    advancePhase(); advancePhase();
    makeInput("rock");
    advancePhase(); advancePhase();

    expect(mdCountdownState()).toBe(2);
    advancePhase(); // rock → paper
    makeInput("paper");
    advancePhase(); // paper → result

    // Press immediately (before grace window)
    makeInput("paper");
    expect(useGameStore.getState().mistakeReason).toBe("too_early");
  });
});
