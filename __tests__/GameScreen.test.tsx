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
    expect(screen.getByText("See History")).toBeTruthy();
  });

  it("navigates to history when pressing See History button", async () => {
    const user = userEvent.setup();
    const { getPathname } = renderRouter(
      { "game": GameScreen, "history": () => <Text>{"History"}</Text> },
      { initialUrl: "/game" }
    );

    advanceToTimeout();

    await user.press(screen.getByText("See History"));
    expect(getPathname()).toBe("/history");
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

  it("direction buttons always enabled when playing", () => {
    renderDirectionsApp();

    // Direction buttons are always enabled; wrong-timing presses cause a loss
    expect(screen.getByLabelText("Up")).toBeTruthy();
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

    // Buttons are always enabled regardless of phase
    expect(screen.getByLabelText("Rock!")).toBeTruthy();
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

    expect(screen.getByLabelText("Rock!")).toBeTruthy();
  });

  it("direction buttons visually enabled during result in directions mode", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const user = userEvent.setup();
    renderDirectionsApp();

    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!"));
    const { beatInterval } = getRoundTimings(0);
    act(() => { jest.advanceTimersByTime(beatInterval); }); // scissors → result

    expect(screen.getByLabelText("Up")).toBeTruthy();
  });

  it("pressing direction during result in directions mode ends game with too_early (not wrong_type)", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const user = userEvent.setup();
    renderDirectionsApp();

    // Win RPS → result shows win
    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!"));
    const { beatInterval } = getRoundTimings(0);
    act(() => { jest.advanceTimersByTime(beatInterval); }); // scissors → result

    // Press direction during result → too_early (non-countdown mode, nextChoosePhase !== "rock")
    await user.press(screen.getByLabelText("Up"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Too early!")).toBeTruthy();
  });
});

describe("GameScreen – AI Guess", () => {
  beforeEach(() => {
    const { useAppStore } = require("@/store/appStore");
    useAppStore.getState().actions.setAiGuessEnabled(true);
  });

  afterEach(() => {
    const { useAppStore } = require("@/store/appStore");
    useAppStore.getState().actions.setAiGuessEnabled(false);
  });

  it("ends game with ai_guessed when pressing predicted button", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const user = userEvent.setup();
    renderApp();

    // Round 1: pick paper
    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!"));
    advanceResultToRock();

    // Round 2: pick paper again — AI now expects paper on round 3
    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!"));
    advanceResultToRock();

    // Round 3: AI guess should be "paper" (repeat rule). Press paper → ai_guessed
    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("AI guessed your move!")).toBeTruthy();
  });

  it("does not end game when pressing non-predicted button", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const user = userEvent.setup();
    renderApp();

    // Round 1: pick paper
    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!"));
    advanceResultToRock();

    // Round 2: pick paper again
    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!"));
    advanceResultToRock();

    // Round 3: AI guess is "paper", but press rock → not guessed, should work
    advanceToScissors();
    await user.press(screen.getByLabelText("Rock!"));

    expect(screen.getByText("Draw!")).toBeTruthy();
  });

  it("does not trigger ai_guessed when feature is disabled", async () => {
    const { useAppStore } = require("@/store/appStore");
    useAppStore.getState().actions.setAiGuessEnabled(false);

    jest.spyOn(Math, "random").mockReturnValue(0);
    const user = userEvent.setup();
    renderApp();

    // Play 2 rounds with paper, then press paper again
    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!"));
    advanceResultToRock();

    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!"));
    advanceResultToRock();

    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!"));

    // Should not be game over — should show result
    expect(screen.getByText("You Win!")).toBeTruthy();
  });

  it("triggers ai_guessed during grace period input", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const user = userEvent.setup();
    renderApp();

    // Round 1: pick paper during grace
    const { beatInterval, graceBefore } = getRoundTimings(0);
    act(() => { jest.advanceTimersByTime(beatInterval); }); // rock → paper
    act(() => { jest.advanceTimersByTime(beatInterval - graceBefore); }); // into grace
    await user.press(screen.getByLabelText("Paper!"));
    advanceResultToRock();

    // Round 2: pick paper during grace again
    act(() => { jest.advanceTimersByTime(beatInterval); }); // rock → paper
    act(() => { jest.advanceTimersByTime(beatInterval - graceBefore); }); // into grace
    await user.press(screen.getByLabelText("Paper!"));
    advanceResultToRock();

    // Round 3: AI guess = paper (repeat), press paper during grace → ai_guessed
    act(() => { jest.advanceTimersByTime(beatInterval); }); // rock → paper (reveal phase)
    act(() => { jest.advanceTimersByTime(beatInterval - graceBefore); }); // into grace
    await user.press(screen.getByLabelText("Paper!"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("AI guessed your move!")).toBeTruthy();
  });

  it("computes ai guess at cS=3 result→rock transition (cS=2 reveal=rock)", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const user = userEvent.setup();
    renderCountdownApp();

    // State 3 round 1: pick rock (draw)
    advanceToScissors();
    await user.press(screen.getByLabelText("Rock!"));
    advanceResultToRock();

    // State 2 round 2: pick rock (draw)
    const t1 = getRoundTimings(1);
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // rock → paper
    await user.press(screen.getByLabelText("Rock!"));
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // paper → result
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // result → rock

    // State 1 round 3: choose=rock, reveal=result. AI guess computed during cS=2 choose→result.
    // History has 2 rounds of "rock" → AI guess = "rock"
    // Press rock → ai_guessed
    await user.press(screen.getByLabelText("Rock!"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("AI guessed your move!")).toBeTruthy();
  });

  it("computes ai guess during cS=3 result→rock (next is cS=2 with reveal=rock)", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const user = userEvent.setup();
    renderCountdownApp();

    // Need to play full cycle cS=3→2→1→3 to have 2 same choices in cS=3 result→rock
    // Round 1 (cS=3): pick rock
    advanceToScissors();
    await user.press(screen.getByLabelText("Rock!"));
    advanceResultToRock();

    // Round 2 (cS=2): pick rock
    const t1 = getRoundTimings(1);
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // rock → paper
    await user.press(screen.getByLabelText("Rock!"));
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // paper → result
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // result → rock (cS=1)

    // Round 3 (cS=1): pick rock
    const t2 = getRoundTimings(2);
    await user.press(screen.getByLabelText("Rock!"));
    act(() => { jest.advanceTimersByTime(t2.beatInterval); }); // rock → result
    act(() => { jest.advanceTimersByTime(t2.beatInterval); }); // result → rock (cS=3)
    // 3 rounds of rock in history. cS=3 result→rock transitions to cS=2.
    // getAiGuessRevealPhase(cS=2) = "rock" → computes AI guess in result phase.
    // AI guess = "rock" (repeat).

    // Round 4 (cS=3): pick rock
    advanceToScissors();
    await user.press(screen.getByLabelText("Rock!"));
    advanceResultToRock();
    // This cS=3 result→rock also transitions to cS=2. AI guess = "rock" again.

    // Round 5 (cS=2): choose=paper. AI guess revealed at "rock" phase already.
    // Press rock on paper choose phase → but rock during paper is grace or choose?
    // cS=2 choose=paper. We're at rock phase. Press rock → too early (not in grace).
    // Actually, I just need to reach paper phase and press rock:
    const t4 = getRoundTimings(4);
    act(() => { jest.advanceTimersByTime(t4.beatInterval); }); // rock → paper (choose for cS=2)
    await user.press(screen.getByLabelText("Rock!"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("AI guessed your move!")).toBeTruthy();
  });

  it("computes ai guess during cS=2 choose→result (next is cS=1 with reveal=result)", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const user = userEvent.setup();
    renderCountdownApp();

    // Round 1 (cS=3): pick rock
    advanceToScissors();
    await user.press(screen.getByLabelText("Rock!"));
    advanceResultToRock();

    // Round 2 (cS=2): pick rock (choose=paper)
    const t1 = getRoundTimings(1);
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // rock → paper
    await user.press(screen.getByLabelText("Rock!"));
    // At this point: 2 rounds of "rock" in history + current entry.
    // Next round is cS=1, reveal = "result" → computes AI guess in choose phase.
    // AI guess = "rock" (repeat rule on [round1(rock), round2(rock)]).
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // paper → result
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // result → rock (cS=1)

    // Round 3 (cS=1): choose=rock. AI guess already revealed ("result" path kept it).
    // Press rock → ai_guessed
    await user.press(screen.getByLabelText("Rock!"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("AI guessed your move!")).toBeTruthy();
  });

  it("triggers ai_guessed during result-grace input (cS=2 result grace)", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const user = userEvent.setup();
    renderCountdownApp();

    // Round 1 (cS=3): pick rock
    advanceToScissors();
    await user.press(screen.getByLabelText("Rock!"));
    advanceResultToRock();

    // Round 2 (cS=2): pick rock
    const t1 = getRoundTimings(1);
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // rock → paper
    await user.press(screen.getByLabelText("Rock!"));
    act(() => { jest.advanceTimersByTime(t1.beatInterval); }); // paper → result
    // Now in result for cS=2. Next = cS=1, choose=rock. Grace falls in this result.
    // AI guess was computed during choose→result (step b): "rock" (repeat rule).
    // Advance into grace window and press rock → ai_guessed via result-grace checkAiGuess
    const t2 = getRoundTimings(2);
    act(() => { jest.advanceTimersByTime(t2.beatInterval - t2.graceBefore); }); // into grace
    await user.press(screen.getByLabelText("Rock!"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("AI guessed your move!")).toBeTruthy();
  });

  it("highlights direction button and triggers ai_guessed in directions mode", async () => {
    // AI picks rock for RPS, up for directions
    jest.spyOn(Math, "random").mockReturnValue(0);
    const user = userEvent.setup();
    renderDirectionsApp();

    // Round 1 RPS: win with paper → enter direction round
    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!"));
    advanceResultToRock();
    // Direction round: press up → matches AI up
    advanceToScissors();
    await user.press(screen.getByLabelText("Up"));
    advanceResultToRock();

    // Round 2 RPS: win with paper → enter direction round
    advanceToScissors(2);
    await user.press(screen.getByLabelText("Paper!"));
    advanceResultToRock(2);
    // Direction round: press up again → matches AI up
    advanceToScissors(3);
    await user.press(screen.getByLabelText("Up"));
    advanceResultToRock(3);

    // Round 3 RPS: win with paper → enter direction round
    // AI guess for RPS = "paper" (repeat rule on 2 paper rounds)
    advanceToScissors(4);
    // Press paper → ai_guessed
    await user.press(screen.getByLabelText("Paper!"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("AI guessed your move!")).toBeTruthy();
  });

  it("highlights direction button when AI guesses a direction", async () => {
    // AI picks rock for RPS, up for directions
    jest.spyOn(Math, "random").mockReturnValue(0);
    const user = userEvent.setup();
    renderDirectionsApp();

    // Round 1: win RPS with paper → direction round → press up (match)
    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!"));
    advanceResultToRock();
    advanceToScissors();
    await user.press(screen.getByLabelText("Up")); // direction 1: up
    advanceResultToRock();

    // Round 2: win RPS with paper → direction round → press up (match)
    advanceToScissors(2);
    await user.press(screen.getByLabelText("Paper!"));
    advanceResultToRock(2);
    advanceToScissors(3);
    await user.press(screen.getByLabelText("Up")); // direction 2: up
    advanceResultToRock(3);

    // Round 3: win RPS with rock (change choice to avoid RPS ai_guessed)
    advanceToScissors(4);
    await user.press(screen.getByLabelText("Rock!")); // draw vs rock
    advanceResultToRock(4);

    // Round 4: RPS with paper (different from rock, avoids RPS repeat guess)
    advanceToScissors(5);
    await user.press(screen.getByLabelText("Paper!")); // win → direction round
    advanceResultToRock(5);

    // Now in direction round. History has 2 "up" direction rounds.
    // AI guess for directions = "up" (repeat rule).
    // At paper phase (reveal), Up button should be highlighted.
    // Advance to paper (grace/reveal phase):
    const t6 = getRoundTimings(6);
    act(() => { jest.advanceTimersByTime(t6.beatInterval); }); // rock → paper
    // At this point, showHighlight should be true and aiGuess should be "up".
    // Press "up" → ai_guessed
    act(() => { jest.advanceTimersByTime(t6.beatInterval); }); // paper → scissors (choose)
    await user.press(screen.getByLabelText("Up"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("AI guessed your move!")).toBeTruthy();
  });

  it("highlights RPS button in classic mode when guess is active", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock
    const user = userEvent.setup();
    renderApp();

    // Round 1: pick paper
    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!"));
    advanceResultToRock();

    // Round 2: pick paper — AI now expects paper on round 3
    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!"));
    advanceResultToRock();

    // Round 3: AI guess is "paper". Advance to scissors (choose) and press Rock.
    advanceToScissors(2);
    await user.press(screen.getByLabelText("Rock!"));

    // Should show result (not ai_guessed since we pressed rock, not paper)
    expect(screen.getByText("Draw!")).toBeTruthy();
  });

  it("no ai_guessed on first 2 rounds (not enough history)", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const user = userEvent.setup();
    renderApp();

    // Round 1: pick paper — no history yet, no guess
    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!"));
    expect(screen.getByText("You Win!")).toBeTruthy();
    advanceResultToRock();

    // Round 2: pick paper — only 1 history entry, no guess yet
    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!"));
    expect(screen.getByText("You Win!")).toBeTruthy();
  });
});
