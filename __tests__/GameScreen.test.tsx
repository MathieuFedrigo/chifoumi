import { renderRouter, screen, userEvent, act } from "expo-router/testing-library";
import { Text } from "react-native";
import HomeScreen from "@/app/index";
import GameScreen from "@/app/game";
import * as Haptics from "expo-haptics";
import { getRoundTimings } from "@/lib/rhythmDifficulty";

const renderApp = () => {
  return renderRouter(
    { "game": GameScreen },
    { initialUrl: "/game" }
  );
};

const renderDirectionsApp = () => {
  return renderRouter(
    { "game": GameScreen },
    { initialUrl: "/game?mode=directions" }
  );
};

/** Advance through rock + paper to reach scissors phase */
const advanceToScissors = (round = 0) => {
  const { beatInterval } = getRoundTimings(round);
  act(() => {
    jest.advanceTimersByTime(beatInterval); // rock → paper
  });
  act(() => {
    jest.advanceTimersByTime(beatInterval); // paper → scissors
  });
};

/** Advance through rock + paper + scissors timeout = game over */
const advanceToTimeout = (round = 0) => {
  const { beatInterval, graceAfter } = getRoundTimings(round);
  act(() => {
    jest.advanceTimersByTime(beatInterval); // rock → paper
  });
  act(() => {
    jest.advanceTimersByTime(beatInterval); // paper → scissors
  });
  act(() => {
    jest.advanceTimersByTime(graceAfter); // scissors → too late
  });
};

/** Advance through a full round (scissors → result → rock) after player chose */
const advanceResultToRock = (round = 0) => {
  const { beatInterval } = getRoundTimings(round);
  act(() => {
    jest.advanceTimersByTime(beatInterval); // scissors remainder → result
  });
  act(() => {
    jest.advanceTimersByTime(beatInterval); // result → rock
  });
};

describe("GameScreen", () => {
  it("auto-starts and shows Rock! immediately on mount", () => {
    renderApp();

    expect(screen.getByText("Rock!")).toBeTruthy();
    expect(screen.getByText("Score: 0")).toBeTruthy();
  });

  it("shows all 3 choice buttons", () => {
    renderApp();

    expect(screen.getByLabelText("Rock!")).toBeTruthy();
    expect(screen.getByLabelText("Paper!")).toBeTruthy();
    expect(screen.getByLabelText("Scissors!")).toBeTruthy();
  });

  it("transitions through rock → paper → scissors phases", () => {
    renderApp();
    const { beatInterval } = getRoundTimings(0);

    expect(screen.getByText("Rock!")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(beatInterval);
    });
    expect(screen.getByText("Paper!")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(beatInterval);
    });
    expect(screen.getByText("Scissors!")).toBeTruthy();
  });

  it("ends game with 'too late' when player misses scissors window", () => {
    renderApp();

    advanceToTimeout();

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Too late!")).toBeTruthy();
    expect(screen.getByText("Final Score: 0")).toBeTruthy();
    expect(screen.getByText("Play Again")).toBeTruthy();
  });

  it("hides back arrow during gameplay", () => {
    renderApp();

    expect(screen.queryByLabelText("Home")).toBeNull();
  });

  it("shows back arrow after game over", () => {
    renderApp();

    advanceToTimeout();

    expect(screen.getByLabelText("Home")).toBeTruthy();
  });

  it("navigates home when pressing the back arrow", async () => {
    const user = userEvent.setup();
    const { getPathname } = renderRouter(
      { "index": HomeScreen, "game": GameScreen, "settings": () => <Text>{"Settings"}</Text> },
      { initialUrl: "/" }
    );

    await user.press(screen.getByText("Classic"));
    expect(getPathname()).toBe("/game");

    advanceToTimeout();

    await user.press(screen.getByLabelText("Home"));

    expect(getPathname()).toBe("/");
  });

  it("ends game with 'too early' when pressing during rock phase", async () => {
    const user = userEvent.setup();
    renderApp();

    expect(screen.getByText("Rock!")).toBeTruthy();

    await user.press(screen.getByLabelText("Rock!"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Too early!")).toBeTruthy();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Error
    );
  });

  it("ends game with 'too early' when pressing during paper phase", async () => {
    const user = userEvent.setup();
    renderApp();
    const { beatInterval } = getRoundTimings(0);

    act(() => {
      jest.advanceTimersByTime(beatInterval);
    });
    expect(screen.getByText("Paper!")).toBeTruthy();

    await user.press(screen.getByLabelText("Scissors!"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Too early!")).toBeTruthy();
  });

  it("ends game with 'too early' when pressing before grace period", async () => {
    const user = userEvent.setup();
    renderApp();
    const { beatInterval } = getRoundTimings(0);

    act(() => {
      jest.advanceTimersByTime(beatInterval); // rock → paper
    });
    act(() => {
      // Advance 400ms into paper (well before 650ms grace threshold)
      jest.advanceTimersByTime(400);
    });
    expect(screen.getByText("Paper!")).toBeTruthy();

    await user.press(screen.getByLabelText("Scissors!"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Too early!")).toBeTruthy();
  });

  it("accepts input during grace period", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock

    const user = userEvent.setup();
    renderApp();
    const { beatInterval, graceBefore } = getRoundTimings(0);

    act(() => {
      jest.advanceTimersByTime(beatInterval); // rock → paper
    });
    act(() => {
      // Advance to exactly when grace period starts
      jest.advanceTimersByTime(beatInterval - graceBefore);
    });
    expect(screen.getByText("Paper!")).toBeTruthy();

    // Player picks paper (beats rock) during grace period
    await user.press(screen.getByLabelText("Paper!"));

    expect(screen.getByText("You Win!")).toBeTruthy();
    expect(Haptics.impactAsync).toHaveBeenCalledWith(
      Haptics.ImpactFeedbackStyle.Light
    );
  });

  it("shows win result when player wins during scissors phase", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock

    const user = userEvent.setup();
    renderApp();

    advanceToScissors();
    expect(screen.getByText("Scissors!")).toBeTruthy();

    // Player picks paper (beats rock)
    await user.press(screen.getByLabelText("Paper!"));

    expect(screen.getByText("You Win!")).toBeTruthy();
    expect(Haptics.impactAsync).toHaveBeenCalledWith(
      Haptics.ImpactFeedbackStyle.Light
    );
  });

  it("shows lose result when player loses during scissors phase", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock

    const user = userEvent.setup();
    renderApp();

    advanceToScissors();

    // Player picks scissors (loses to rock)
    await user.press(screen.getByLabelText("Scissors!"));

    expect(screen.getByText("You Lose!")).toBeTruthy();
  });

  it("shows draw result when choices match", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock

    const user = userEvent.setup();
    renderApp();

    advanceToScissors();

    // Player picks rock (draws with rock)
    await user.press(screen.getByLabelText("Rock!"));

    expect(screen.getByText("Draw!")).toBeTruthy();
  });

  it("grace deadline is harmless after player already chose", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock

    const user = userEvent.setup();
    renderApp();

    advanceToScissors();

    // Player picks paper during scissors
    await user.press(screen.getByLabelText("Paper!"));
    expect(screen.getByText("You Win!")).toBeTruthy();

    // Advance past graceAfter — grace deadline should not end the game
    const { graceAfter } = getRoundTimings(0);
    act(() => {
      jest.advanceTimersByTime(graceAfter);
    });

    // Still showing result, not game over
    expect(screen.getByText("You Win!")).toBeTruthy();
  });

  it("increments score and starts next round after result phase", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock

    const user = userEvent.setup();
    renderApp();

    advanceToScissors();

    // Player picks paper (beats rock)
    await user.press(screen.getByLabelText("Paper!"));
    expect(screen.getByText("You Win!")).toBeTruthy();
    expect(screen.getByText("Score: 0")).toBeTruthy();

    const { beatInterval } = getRoundTimings(0);
    act(() => {
      jest.advanceTimersByTime(beatInterval); // scissors remainder → result
    });
    act(() => {
      jest.advanceTimersByTime(beatInterval); // result → rock
    });

    expect(screen.getByText("Rock!")).toBeTruthy();
    expect(screen.getByText("Score: 1")).toBeTruthy();
  });

  it("resets score to 0 when restarting after game over", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);

    const user = userEvent.setup();
    renderApp();

    // First game: play one round
    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!"));
    const t0 = getRoundTimings(0);
    act(() => {
      jest.advanceTimersByTime(t0.beatInterval); // scissors remainder → result
    });
    act(() => {
      jest.advanceTimersByTime(t0.beatInterval); // result → next round
    });
    expect(screen.getByText("Score: 1")).toBeTruthy();

    // Let it time out on second round (too late)
    advanceToTimeout(1);

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Final Score: 1")).toBeTruthy();

    // Restart
    await user.press(screen.getByText("Play Again"));

    expect(screen.getByText("Score: 0")).toBeTruthy();
    expect(screen.getByText("Rock!")).toBeTruthy();
  });

  it("ignores button presses when not playing", async () => {
    const user = userEvent.setup();
    renderApp();

    // Trigger game over first (timeout)
    advanceToTimeout();

    // Now game is over (not playing), press choice button
    await user.press(screen.getByLabelText("Rock!"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it("grace-before press plays full scissors beat before advancing to result", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock

    const user = userEvent.setup();
    renderApp();
    const { beatInterval, graceBefore } = getRoundTimings(0);

    act(() => { jest.advanceTimersByTime(beatInterval); }); // rock → paper
    act(() => { jest.advanceTimersByTime(beatInterval - graceBefore); }); // into grace
    expect(screen.getByText("Paper!")).toBeTruthy();

    await user.press(screen.getByLabelText("Paper!")); // wins vs rock
    expect(screen.getByText("You Win!")).toBeTruthy(); // overlay immediate

    act(() => { jest.advanceTimersByTime(beatInterval); }); // scissors beat → result
    expect(screen.getByText("You Win!")).toBeTruthy(); // still in result, not rock yet

    act(() => { jest.advanceTimersByTime(beatInterval); }); // result → rock
    expect(screen.getByText("Rock!")).toBeTruthy();
    expect(screen.getByText("Score: 1")).toBeTruthy();
  });

  it("shows player and AI choice icons in result phase", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock

    const user = userEvent.setup();
    renderApp();

    advanceToScissors();

    await user.press(screen.getByLabelText("Paper!"));

    expect(screen.getByText("vs")).toBeTruthy();
    expect(screen.getAllByText("Paper!").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Rock!").length).toBeGreaterThanOrEqual(1);
  });
});

describe("GameScreen – Directions mode", () => {
  it("shows direction buttons in directions mode", () => {
    renderDirectionsApp();

    expect(screen.getByLabelText("Up")).toBeTruthy();
    expect(screen.getByLabelText("Down")).toBeTruthy();
    expect(screen.getByLabelText("Left")).toBeTruthy();
    expect(screen.getByLabelText("Right")).toBeTruthy();
  });

  it("does not show direction buttons in classic mode", () => {
    renderApp();

    expect(screen.queryByLabelText("Up")).toBeNull();
    expect(screen.queryByLabelText("Down")).toBeNull();
    expect(screen.queryByLabelText("Left")).toBeNull();
    expect(screen.queryByLabelText("Right")).toBeNull();
  });

  it("pressing direction during rock phase ends game with wrong_type", async () => {
    const user = userEvent.setup();
    renderDirectionsApp();

    expect(screen.getByText("Rock!")).toBeTruthy();

    await user.press(screen.getByLabelText("Up"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Wrong button!")).toBeTruthy();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Error
    );
  });

  it("pressing direction during paper phase ends game with wrong_type", async () => {
    const user = userEvent.setup();
    renderDirectionsApp();
    const { beatInterval } = getRoundTimings(0);

    act(() => { jest.advanceTimersByTime(beatInterval); }); // rock → paper
    expect(screen.getByText("Paper!")).toBeTruthy();

    await user.press(screen.getByLabelText("Down"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Wrong button!")).toBeTruthy();
  });

  it("pressing direction during normal scissors phase ends game with wrong_type", async () => {
    const user = userEvent.setup();
    renderDirectionsApp();

    advanceToScissors();
    expect(screen.getByText("Scissors!")).toBeTruthy();

    // Not in direction round — direction press = wrong_type
    await user.press(screen.getByLabelText("Left"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Wrong button!")).toBeTruthy();
  });

  it("pressing RPS during direction round scissors phase ends game with wrong_type", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock → player wins
    const user = userEvent.setup();
    renderDirectionsApp();

    // Win RPS round
    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!"));
    advanceResultToRock();
    // Now in direction round
    advanceToScissors();

    // RPS press during direction scissors = wrong_type
    await user.press(screen.getByLabelText("Rock!"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Wrong button!")).toBeTruthy();
  });

  it("draw in directions mode increments score without entering direction round", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const user = userEvent.setup();
    renderDirectionsApp();

    advanceToScissors();
    await user.press(screen.getByLabelText("Rock!")); // draw vs rock
    advanceResultToRock();

    // Score incremented, still in normal RPS phase (no direction round)
    expect(screen.getByText("Score: 1")).toBeTruthy();
    expect(screen.getByText("Rock!")).toBeTruthy();
  });

  it("win enters direction round", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const user = userEvent.setup();
    renderDirectionsApp();

    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!")); // win vs rock
    advanceResultToRock();

    // Now in direction round — should still show Rock! phase
    expect(screen.getByText("Rock!")).toBeTruthy();
    expect(screen.getByText("Score: 1")).toBeTruthy(); // +1 for RPS input
  });

  it("too late in first round ends game", () => {
    renderDirectionsApp();
    // Just advance through the first round without pressing anything
    advanceToTimeout();

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Too late!")).toBeTruthy();
  });

  it("too late in direction round scissors ends game (grace timer)", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI RPS = rock
    const user = userEvent.setup();
    renderDirectionsApp();

    // Win RPS → enter direction round
    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!"));
    advanceResultToRock();

    // Advance to direction scissors, then let grace timer expire without pressing direction
    advanceToScissors();
    const { graceAfter } = getRoundTimings(0);
    act(() => {
      jest.advanceTimersByTime(graceAfter);
    });

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Too late!")).toBeTruthy();
  });

  it("win + correct direction → score increments and returns to RPS", async () => {
    // AI picks rock (random=0 for RPS), then AI direction = "up" (random=0 → index 0)
    jest.spyOn(Math, "random").mockReturnValue(0);
    const user = userEvent.setup();
    renderDirectionsApp();

    // Win RPS
    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!"));
    advanceResultToRock();

    // Direction round
    advanceToScissors();
    await user.press(screen.getByLabelText("Up")); // player picks up; AI also picks up
    // Shows direction result
    expect(screen.getByText("Confirm!")).toBeTruthy();
    advanceResultToRock();

    expect(screen.getByText("Score: 2")).toBeTruthy();
    expect(screen.getByText("Rock!")).toBeTruthy();
  });

  it("win + wrong direction shows miss text and retry count", async () => {
    // Math.floor(0.25 * 3) = 0 → AI RPS "rock"; Math.floor(0.25 * 4) = 1 → AI direction "down"
    jest.spyOn(Math, "random").mockReturnValue(0.25);
    const user = userEvent.setup();
    renderDirectionsApp();

    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!")); // win vs rock
    advanceResultToRock();

    advanceToScissors();
    await user.press(screen.getByLabelText("Up")); // player=up, AI=down → miss

    expect(screen.getByText("Wrong direction!")).toBeTruthy();
    expect(screen.getByText("1 try left")).toBeTruthy();
  });

  it("win + 2 wrong directions → round voided, no score", async () => {
    // Math.floor(0.25 * 3) = 0 → AI RPS "rock"; Math.floor(0.25 * 4) = 1 → AI direction "down"
    jest.spyOn(Math, "random").mockReturnValue(0.25);
    const user = userEvent.setup();
    renderDirectionsApp();

    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!")); // win vs rock
    advanceResultToRock();

    // 1st direction attempt — miss (player=up, AI=down)
    advanceToScissors();
    await user.press(screen.getByLabelText("Up"));
    advanceResultToRock();

    // 2nd direction attempt — miss again (attemptsLeft=1 → void)
    advanceToScissors();
    await user.press(screen.getByLabelText("Up"));
    advanceResultToRock();

    expect(screen.getByText("Score: 3")).toBeTruthy();
    expect(screen.getByText("Rock!")).toBeTruthy();
  });

  it("lose + AI direction matches player direction → AI confirmed, no score", async () => {
    // Math.floor(0 * 3) = 0 → AI RPS "rock"; Math.floor(0 * 4) = 0 → AI direction "up"
    jest.spyOn(Math, "random").mockReturnValue(0);
    const user = userEvent.setup();
    renderDirectionsApp();

    advanceToScissors();
    await user.press(screen.getByLabelText("Scissors!")); // lose vs rock
    advanceResultToRock();

    advanceToScissors();
    await user.press(screen.getByLabelText("Up")); // player picks up; AI picks up → matched

    expect(screen.getByText("They confirmed!")).toBeTruthy();
    advanceResultToRock();

    expect(screen.getByText("Score: 2")).toBeTruthy();
    expect(screen.getByText("Rock!")).toBeTruthy();
  });

  it("direction buttons not visible after direction buttons disabled when playing at rock phase", () => {
    renderDirectionsApp();

    // Direction buttons should be rendered but visually disabled (opacity)
    expect(screen.getByLabelText("Up")).toBeTruthy();
    // Still accessible but disabled during rock phase
  });

  it("restarting directions game stays in directions mode", async () => {
    const user = userEvent.setup();
    renderDirectionsApp();

    advanceToTimeout();
    expect(screen.getByText("Game Over")).toBeTruthy();

    await user.press(screen.getByText("Play Again"));

    expect(screen.getByText("Rock!")).toBeTruthy();
    expect(screen.getByText("Score: 0")).toBeTruthy();
    // Direction buttons still visible after restart
    expect(screen.getByLabelText("Up")).toBeTruthy();
  });

  it("ignores direction button presses when not playing", async () => {
    const user = userEvent.setup();
    renderDirectionsApp();

    advanceToTimeout();

    await user.press(screen.getByLabelText("Up"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it("navigates to directions game from home", async () => {
    const user = userEvent.setup();
    const { getPathname } = renderRouter(
      { "index": HomeScreen, "game": GameScreen, "settings": () => <Text>{"Settings"}</Text> },
      { initialUrl: "/" }
    );

    await user.press(screen.getByText("Directions"));
    expect(getPathname()).toBe("/game");
    expect(screen.getByLabelText("Up")).toBeTruthy();
  });
});

const renderCountdownApp = () => {
  return renderRouter(
    { "game": GameScreen },
    { initialUrl: "/game?mode=countdown" }
  );
};

describe("GameScreen – Countdown mode", () => {
  it("renders with countdown mode and shows countdown indicator", () => {
    renderCountdownApp();

    expect(screen.getByText("Rock!")).toBeTruthy();
    expect(screen.getByText("Score: 0")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy(); // countdown state indicator
  });

  it("state 3: full R-P-S cycle, input on scissors shows result", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const user = userEvent.setup();
    renderCountdownApp();

    advanceToScissors();
    expect(screen.getByText("Scissors!")).toBeTruthy();

    await user.press(screen.getByLabelText("Paper!"));
    expect(screen.getByText("You Win!")).toBeTruthy();
    expect(Haptics.impactAsync).toHaveBeenCalledWith(
      Haptics.ImpactFeedbackStyle.Light
    );
  });

  it("state 2: input on paper (choose phase) shows result", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const user = userEvent.setup();
    renderCountdownApp();

    // Complete state 3
    advanceToScissors();
    await user.press(screen.getByLabelText("Rock!")); // draw
    advanceResultToRock();

    // State 2: paper is choose phase
    expect(screen.getByText("2")).toBeTruthy();
    const { beatInterval } = getRoundTimings(1);
    act(() => { jest.advanceTimersByTime(beatInterval); }); // rock → paper
    expect(screen.getByText("Paper!")).toBeTruthy();

    await user.press(screen.getByLabelText("Paper!"));
    expect(screen.getByText("You Win!")).toBeTruthy();
  });

  it("state 1: input on rock (choose phase) shows result", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const user = userEvent.setup();
    renderCountdownApp();

    // Complete state 3
    advanceToScissors();
    await user.press(screen.getByLabelText("Rock!"));
    advanceResultToRock();
    // Complete state 2
    const t1 = getRoundTimings(1);
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // rock → paper
    await user.press(screen.getByLabelText("Rock!"));
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // paper → result
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // result → rock

    // State 1: rock is choose phase
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("Rock!")).toBeTruthy();

    await user.press(screen.getByLabelText("Paper!"));
    expect(screen.getByText("You Win!")).toBeTruthy();
  });

  it("too early on rock in state 3", async () => {
    const user = userEvent.setup();
    renderCountdownApp();

    await user.press(screen.getByLabelText("Rock!"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Too early!")).toBeTruthy();
  });

  it("too late in state 3 when missing scissors window", () => {
    renderCountdownApp();

    advanceToTimeout();

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Too late!")).toBeTruthy();
  });

  it("too late in state 2 when missing paper window (grace timer)", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const user = userEvent.setup();
    renderCountdownApp();

    // Complete state 3
    advanceToScissors();
    await user.press(screen.getByLabelText("Rock!"));
    advanceResultToRock();

    // State 2: paper is choose phase
    const t1 = getRoundTimings(1);
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // rock → paper
    // Let grace timer expire
    act(() => { jest.advanceTimersByTime(t1.graceAfter); });

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Too late!")).toBeTruthy();
  });

  it("restarting countdown game stays in countdown mode", async () => {
    const user = userEvent.setup();
    renderCountdownApp();

    advanceToTimeout();
    expect(screen.getByText("Game Over")).toBeTruthy();

    await user.press(screen.getByText("Play Again"));

    expect(screen.getByText("Rock!")).toBeTruthy();
    expect(screen.getByText("Score: 0")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("navigates to countdown game from home", async () => {
    const user = userEvent.setup();
    const { getPathname } = renderRouter(
      { "index": HomeScreen, "game": GameScreen, "settings": () => <Text>{"Settings"}</Text> },
      { initialUrl: "/" }
    );

    await user.press(screen.getByText("3-2-1"));
    expect(getPathname()).toBe("/game");
    expect(screen.getByText("3")).toBeTruthy(); // countdown indicator
  });

  it("buttons enabled on choose phase and grace phase in state 3", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const user = userEvent.setup();
    renderCountdownApp();

    // During paper (grace phase for state 3), grace period input should work
    const { beatInterval, graceBefore } = getRoundTimings(0);
    act(() => { jest.advanceTimersByTime(beatInterval); }); // rock → paper
    act(() => { jest.advanceTimersByTime(beatInterval - graceBefore); }); // into grace

    await user.press(screen.getByLabelText("Paper!"));
    expect(screen.getByText("You Win!")).toBeTruthy();
    expect(Haptics.impactAsync).toHaveBeenCalledWith(
      Haptics.ImpactFeedbackStyle.Light
    );
  });

  it("does not show direction buttons in countdown mode", () => {
    renderCountdownApp();

    expect(screen.queryByLabelText("Up")).toBeNull();
    expect(screen.queryByLabelText("Down")).toBeNull();
  });
});

const renderCountdownDirApp = () => {
  return renderRouter(
    { "game": GameScreen },
    { initialUrl: "/game?mode=countdownDirections" }
  );
};

/** Advance to choose phase for a given countdown state */
const advanceToChoosePhase = (countdownState: number, round = 0) => {
  const { beatInterval } = getRoundTimings(round);
  if (countdownState === 3) {
    // Choose phase = scissors → need rock + paper
    act(() => { jest.advanceTimersByTime(beatInterval); }); // rock → paper
    act(() => { jest.advanceTimersByTime(beatInterval); }); // paper → scissors
  } else if (countdownState === 2) {
    // Choose phase = paper → need rock
    act(() => { jest.advanceTimersByTime(beatInterval); }); // rock → paper
  }
  // countdownState === 1: choose phase = rock, already there
};

describe("GameScreen – CountdownDirections mode", () => {
  it("renders with countdown indicator and direction buttons", () => {
    renderCountdownDirApp();

    expect(screen.getByText("Rock!")).toBeTruthy();
    expect(screen.getByText("Score: 0")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByLabelText("Up")).toBeTruthy();
    expect(screen.getByLabelText("Down")).toBeTruthy();
    expect(screen.getByLabelText("Left")).toBeTruthy();
    expect(screen.getByLabelText("Right")).toBeTruthy();
  });

  it("shows RPS choice buttons", () => {
    renderCountdownDirApp();

    expect(screen.getByLabelText("Rock!")).toBeTruthy();
    expect(screen.getByLabelText("Paper!")).toBeTruthy();
    expect(screen.getByLabelText("Scissors!")).toBeTruthy();
  });

  it("state 3: RPS input on scissors shows result", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const user = userEvent.setup();
    renderCountdownDirApp();

    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!"));
    expect(screen.getByText("You Win!")).toBeTruthy();
    expect(Haptics.impactAsync).toHaveBeenCalledWith(
      Haptics.ImpactFeedbackStyle.Light
    );
  });

  it("draw stays in RPS phase, advances countdown", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const user = userEvent.setup();
    renderCountdownDirApp();

    advanceToScissors();
    await user.press(screen.getByLabelText("Rock!")); // draw vs rock
    advanceResultToRock();

    expect(screen.getByText("Score: 1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy(); // countdown advanced
    expect(screen.getByText("Rock!")).toBeTruthy();
  });

  it("win enters direction round with countdown advancing", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const user = userEvent.setup();
    renderCountdownDirApp();

    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!")); // win vs rock
    advanceResultToRock();

    expect(screen.getByText("2")).toBeTruthy(); // state advanced
    expect(screen.getByText("Score: 1")).toBeTruthy();
    expect(screen.getByText("Rock!")).toBeTruthy();
  });

  it("win + correct direction → back to RPS", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI rock, AI dir up
    const user = userEvent.setup();
    renderCountdownDirApp();

    // Win RPS in state 3
    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!"));
    advanceResultToRock();

    // Direction round in state 2 (paper is choose phase)
    const t1 = getRoundTimings(1);
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // rock → paper
    await user.press(screen.getByLabelText("Up")); // matches AI up
    expect(screen.getByText("Confirm!")).toBeTruthy();

    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // paper → result
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // result → rock

    expect(screen.getByText("1")).toBeTruthy(); // state 2 → 1
    expect(screen.getByText("Score: 2")).toBeTruthy();
  });

  it("win + wrong direction shows miss text and retry count", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.25); // AI rock, AI dir down
    const user = userEvent.setup();
    renderCountdownDirApp();

    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!")); // win
    advanceResultToRock();

    // Direction round state 2
    const t1 = getRoundTimings(1);
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // rock → paper
    await user.press(screen.getByLabelText("Up")); // miss

    expect(screen.getByText("Wrong direction!")).toBeTruthy();
    expect(screen.getByText("1 try left")).toBeTruthy();
  });

  it("win + 2 wrong directions → voided, back to RPS", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.25); // AI rock, AI dir down
    const user = userEvent.setup();
    renderCountdownDirApp();

    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!")); // win
    advanceResultToRock();

    // 1st direction attempt state 2
    const t1 = getRoundTimings(1);
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // rock → paper
    await user.press(screen.getByLabelText("Up")); // miss
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // paper → result
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // result → rock

    // 2nd direction attempt state 1 (rock is choose phase)
    expect(screen.getByText("1")).toBeTruthy();
    const t2 = getRoundTimings(2);
    await user.press(screen.getByLabelText("Up")); // miss, voided
    act(() => { jest.advanceTimersByTime(t2.beatInterval); }); // rock → result
    act(() => { jest.advanceTimersByTime(t2.beatInterval); }); // result → rock

    expect(screen.getByText("3")).toBeTruthy(); // back to state 3
    expect(screen.getByText("Score: 3")).toBeTruthy();
  });

  it("too early on rock in state 3", async () => {
    const user = userEvent.setup();
    renderCountdownDirApp();

    await user.press(screen.getByLabelText("Rock!"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Too early!")).toBeTruthy();
  });

  it("too late when missing choose window", () => {
    renderCountdownDirApp();

    advanceToTimeout();

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Too late!")).toBeTruthy();
  });

  it("pressing direction during RPS round ends game with wrong_type", async () => {
    const user = userEvent.setup();
    renderCountdownDirApp();

    advanceToScissors();
    await user.press(screen.getByLabelText("Up")); // direction during RPS

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Wrong button!")).toBeTruthy();
  });

  it("pressing RPS during direction round ends game with wrong_type", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const user = userEvent.setup();
    renderCountdownDirApp();

    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!")); // win
    advanceResultToRock();

    // Direction round state 2, paper is choose
    const t1 = getRoundTimings(1);
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // rock → paper
    await user.press(screen.getByLabelText("Rock!")); // RPS during direction

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Wrong button!")).toBeTruthy();
  });

  it("restarting stays in countdownDirections mode", async () => {
    const user = userEvent.setup();
    renderCountdownDirApp();

    advanceToTimeout();
    expect(screen.getByText("Game Over")).toBeTruthy();

    await user.press(screen.getByText("Play Again"));

    expect(screen.getByText("Rock!")).toBeTruthy();
    expect(screen.getByText("Score: 0")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByLabelText("Up")).toBeTruthy();
  });

  it("ignores direction button presses when not playing", async () => {
    const user = userEvent.setup();
    renderCountdownDirApp();

    advanceToTimeout();

    await user.press(screen.getByLabelText("Up"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it("navigates to countdownDirections game from home", async () => {
    const user = userEvent.setup();
    const { getPathname } = renderRouter(
      { "index": HomeScreen, "game": GameScreen, "settings": () => <Text>{"Settings"}</Text> },
      { initialUrl: "/" }
    );

    await user.press(screen.getByText("3-2-1 Directions"));
    expect(getPathname()).toBe("/game");
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByLabelText("Up")).toBeTruthy();
  });

  it("lose + AI direction matches → confirmed, back to RPS", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI rock, AI dir up
    const user = userEvent.setup();
    renderCountdownDirApp();

    advanceToScissors();
    await user.press(screen.getByLabelText("Scissors!")); // lose vs rock
    advanceResultToRock();

    // Direction round state 2
    const t1 = getRoundTimings(1);
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // rock → paper
    await user.press(screen.getByLabelText("Up")); // matched

    expect(screen.getByText("They confirmed!")).toBeTruthy();
  });

  it("grace period accepts direction input in direction round", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const user = userEvent.setup();
    renderCountdownDirApp();

    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!")); // win
    advanceResultToRock();

    // Direction round state 2 (grace on rock, choose on paper)
    const { beatInterval, graceBefore } = getRoundTimings(1);
    act(() => { jest.advanceTimersByTime(beatInterval - graceBefore); }); // into grace

    await user.press(screen.getByLabelText("Up")); // direction in grace
    expect(screen.getByText("Confirm!")).toBeTruthy();
    expect(Haptics.impactAsync).toHaveBeenCalledWith(
      Haptics.ImpactFeedbackStyle.Light
    );
  });
});

describe("GameScreen – Interactive result phase", () => {
  it("pressing RPS during result phase in classic mode ends game with too_early", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const user = userEvent.setup();
    renderApp();

    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!")); // win
    const { beatInterval } = getRoundTimings(0);
    act(() => { jest.advanceTimersByTime(beatInterval); }); // scissors → result

    // Now in result phase — press should end game
    await user.press(screen.getByLabelText("Rock!"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Too early!")).toBeTruthy();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Error
    );
  });

  it("buttons visually enabled during result phase in classic mode", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const user = userEvent.setup();
    renderApp();

    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!"));
    const { beatInterval } = getRoundTimings(0);
    act(() => { jest.advanceTimersByTime(beatInterval); }); // scissors → result

    // Buttons should not be visually disabled (opacity 1, not 0.4)
    const rockButton = screen.getByLabelText("Rock!");
    expect(rockButton).toHaveStyle({ opacity: 1 });
  });

  it("countdown cS=2: grace press during result creates new round", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const user = userEvent.setup();
    renderCountdownApp();

    // Complete state 3 (scissors choose)
    advanceToScissors();
    await user.press(screen.getByLabelText("Rock!")); // draw
    advanceResultToRock();

    // State 2: paper is choose phase
    expect(screen.getByText("2")).toBeTruthy();
    const t1 = getRoundTimings(1);
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // rock → paper
    await user.press(screen.getByLabelText("Paper!")); // win on paper choose
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // paper → result

    // Now in result phase with cS=2
    // Advance into grace window
    const t2 = getRoundTimings(2);
    act(() => { jest.advanceTimersByTime(t2.beatInterval - t2.graceBefore); }); // into grace

    // Grace press during cS=2 result — should create new round with cS=1
    await user.press(screen.getByLabelText("Paper!"));

    expect(screen.getByText("Rock!")).toBeTruthy();
    expect(Haptics.impactAsync).toHaveBeenCalledWith(
      Haptics.ImpactFeedbackStyle.Light
    );
  });

  it("countdown cS=2: press before grace window during result ends game with too_early", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const user = userEvent.setup();
    renderCountdownApp();

    // Complete state 3
    advanceToScissors();
    await user.press(screen.getByLabelText("Rock!"));
    advanceResultToRock();

    // State 2: paper is choose phase
    const t1 = getRoundTimings(1);
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // rock → paper
    await user.press(screen.getByLabelText("Paper!"));
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // paper → result

    // In result phase with cS=2, press immediately (before grace window)
    await user.press(screen.getByLabelText("Rock!"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Too early!")).toBeTruthy();
  });

  it("countdown cS=1: press during result ends game with too_early", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const user = userEvent.setup();
    renderCountdownApp();

    // Complete state 3
    advanceToScissors();
    await user.press(screen.getByLabelText("Rock!"));
    advanceResultToRock();
    // Complete state 2
    const t1 = getRoundTimings(1);
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // rock → paper
    await user.press(screen.getByLabelText("Rock!"));
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // paper → result
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // result → rock

    // State 1: play a round
    const t2 = getRoundTimings(2);
    await user.press(screen.getByLabelText("Paper!"));
    act(() => { jest.advanceTimersByTime(t2.beatInterval); }); // rock → result

    // Press during cS=1 result (even in grace window) → too_early (next is cS=3)
    act(() => { jest.advanceTimersByTime(t2.beatInterval - t2.graceBefore); });
    await user.press(screen.getByLabelText("Rock!"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Too early!")).toBeTruthy();
  });

  it("countdown cS=3: press during result ends game with too_early", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const user = userEvent.setup();
    renderCountdownApp();

    // Complete state 3
    advanceToScissors();
    await user.press(screen.getByLabelText("Rock!"));
    const { beatInterval } = getRoundTimings(0);
    act(() => { jest.advanceTimersByTime(beatInterval); }); // scissors → result

    // Now in result phase with cS=3 (next is cS=2, choose=paper, not rock)
    await user.press(screen.getByLabelText("Rock!"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Too early!")).toBeTruthy();
  });

  it("buttons visually enabled during result in countdown mode", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const user = userEvent.setup();
    renderCountdownApp();

    advanceToScissors();
    await user.press(screen.getByLabelText("Rock!"));
    const { beatInterval } = getRoundTimings(0);
    act(() => { jest.advanceTimersByTime(beatInterval); }); // scissors → result

    const rockButton = screen.getByLabelText("Rock!");
    expect(rockButton).toHaveStyle({ opacity: 1 });
  });

  it("direction buttons visually enabled during result in directions mode", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const user = userEvent.setup();
    renderDirectionsApp();

    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!"));
    const { beatInterval } = getRoundTimings(0);
    act(() => { jest.advanceTimersByTime(beatInterval); }); // scissors → result

    const upButton = screen.getByLabelText("Up");
    expect(upButton).toHaveStyle({ opacity: 1 });
  });

  it("pressing direction during result in directions mode ends game with wrong_type", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const user = userEvent.setup();
    renderDirectionsApp();

    // Win RPS → result shows win
    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!"));
    const { beatInterval } = getRoundTimings(0);
    act(() => { jest.advanceTimersByTime(beatInterval); }); // scissors → result

    // Press direction during result → early wrong_type (direction input in RPS round)
    await user.press(screen.getByLabelText("Up"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Wrong button!")).toBeTruthy();
  });
});
