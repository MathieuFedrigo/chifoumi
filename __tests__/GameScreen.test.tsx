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
