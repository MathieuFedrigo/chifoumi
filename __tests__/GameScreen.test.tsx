import { renderRouter, screen, userEvent, act } from "expo-router/testing-library";
import { Text } from "react-native";
import HomeScreen from "@/app/index";
import GameScreen from "@/app/game";
import * as Haptics from "expo-haptics";

const renderApp = () => {
  return renderRouter(
    { "game": GameScreen },
    { initialUrl: "/game" }
  );
};

/** Advance through rock(800ms) → paper(800ms) to reach scissors phase */
const advanceToScissors = () => {
  act(() => {
    jest.advanceTimersByTime(800); // rock → paper
  });
  act(() => {
    jest.advanceTimersByTime(800); // paper → scissors
  });
};

/** Advance through rock(800) + paper(800) + scissors(800) = timeout */
const advanceToTimeout = () => {
  act(() => {
    jest.advanceTimersByTime(800); // rock → paper
  });
  act(() => {
    jest.advanceTimersByTime(800); // paper → scissors
  });
  act(() => {
    jest.advanceTimersByTime(800); // scissors → too late
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

    expect(screen.getByText("Rock!")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(800);
    });
    expect(screen.getByText("Paper!")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(800);
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

  it("shows back arrow at top-left", () => {
    renderApp();

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

    act(() => {
      jest.advanceTimersByTime(800);
    });
    expect(screen.getByText("Paper!")).toBeTruthy();

    await user.press(screen.getByLabelText("Scissors!"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Too early!")).toBeTruthy();
  });

  it("ends game with 'too early' when pressing 400ms into paper phase", async () => {
    const user = userEvent.setup();
    renderApp();

    act(() => {
      jest.advanceTimersByTime(800); // rock → paper
    });
    act(() => {
      jest.advanceTimersByTime(400); // 400ms into paper (< 650ms grace threshold)
    });
    expect(screen.getByText("Paper!")).toBeTruthy();

    await user.press(screen.getByLabelText("Scissors!"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Too early!")).toBeTruthy();
  });

  it("accepts input during grace period (650ms into paper phase)", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock

    const user = userEvent.setup();
    renderApp();

    act(() => {
      jest.advanceTimersByTime(800); // rock → paper
    });
    act(() => {
      jest.advanceTimersByTime(650); // 650ms into paper (>= 650ms grace threshold)
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

  it("increments score and starts next round after result phase", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock

    const user = userEvent.setup();
    renderApp();

    advanceToScissors();

    // Player picks paper (beats rock)
    await user.press(screen.getByLabelText("Paper!"));
    expect(screen.getByText("You Win!")).toBeTruthy();
    expect(screen.getByText("Score: 0")).toBeTruthy();

    // Advance through result phase (1000ms) → next rock phase
    act(() => {
      jest.advanceTimersByTime(1000);
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
    act(() => {
      jest.advanceTimersByTime(1000); // result → next round
    });
    expect(screen.getByText("Score: 1")).toBeTruthy();

    // Let it time out on second round (too late)
    advanceToTimeout();

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
