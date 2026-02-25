import { renderRouter, screen, userEvent, act } from "expo-router/testing-library";
import GameScreen from "@/app/(tabs)/index";
import * as Haptics from "expo-haptics";

const renderApp = () => {
  return renderRouter(
    { "(tabs)/index": GameScreen },
    { initialUrl: "/(tabs)" }
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

/** Advance through rock(800) + paper(800) + scissors(1200) = timeout */
const advanceToTimeout = () => {
  act(() => {
    jest.advanceTimersByTime(800); // rock → paper
  });
  act(() => {
    jest.advanceTimersByTime(800); // paper → scissors
  });
  act(() => {
    jest.advanceTimersByTime(1200); // scissors → too late
  });
};

describe("GameScreen", () => {
  it("shows idle state with start button", () => {
    renderApp();

    expect(screen.getByText("Start")).toBeTruthy();
    expect(screen.getByText("Score: 0")).toBeTruthy();
  });

  it("shows all 3 choice buttons", () => {
    renderApp();

    expect(screen.getByLabelText("Rock!")).toBeTruthy();
    expect(screen.getByLabelText("Paper!")).toBeTruthy();
    expect(screen.getByLabelText("Scissors!")).toBeTruthy();
  });

  it("shows Rock! phase after pressing start", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.press(screen.getByText("Start"));

    expect(screen.getByText("Rock!")).toBeTruthy();
  });

  it("transitions through rock → paper → scissors phases", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.press(screen.getByText("Start"));
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

  it("ends game with 'too late' when player misses scissors window", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.press(screen.getByText("Start"));
    advanceToTimeout();

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Too late!")).toBeTruthy();
    expect(screen.getByText("Final Score: 0")).toBeTruthy();
    expect(screen.getByText("Play Again")).toBeTruthy();
  });

  it("ends game with 'too early' when pressing during rock phase", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.press(screen.getByText("Start"));
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

    await user.press(screen.getByText("Start"));

    act(() => {
      jest.advanceTimersByTime(800);
    });
    expect(screen.getByText("Paper!")).toBeTruthy();

    await user.press(screen.getByLabelText("Scissors!"));

    expect(screen.getByText("Game Over")).toBeTruthy();
    expect(screen.getByText("Too early!")).toBeTruthy();
  });

  it("shows win result when player wins during scissors phase", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock

    const user = userEvent.setup();
    renderApp();

    await user.press(screen.getByText("Start"));
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

    await user.press(screen.getByText("Start"));
    advanceToScissors();

    // Player picks scissors (loses to rock)
    await user.press(screen.getByLabelText("Scissors!"));

    expect(screen.getByText("You Lose!")).toBeTruthy();
  });

  it("shows draw result when choices match", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock

    const user = userEvent.setup();
    renderApp();

    await user.press(screen.getByText("Start"));
    advanceToScissors();

    // Player picks rock (draws with rock)
    await user.press(screen.getByLabelText("Rock!"));

    expect(screen.getByText("Draw!")).toBeTruthy();
  });

  it("increments score and starts next round after result phase", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock

    const user = userEvent.setup();
    renderApp();

    await user.press(screen.getByText("Start"));
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
    await user.press(screen.getByText("Start"));
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

    await user.press(screen.getByLabelText("Rock!"));

    expect(screen.getByText("Start")).toBeTruthy();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it("shows player and AI choice icons in result phase", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI picks rock

    const user = userEvent.setup();
    renderApp();

    await user.press(screen.getByText("Start"));
    advanceToScissors();

    await user.press(screen.getByLabelText("Paper!"));

    expect(screen.getByText("vs")).toBeTruthy();
    expect(screen.getAllByText("Paper!").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Rock!").length).toBeGreaterThanOrEqual(1);
  });
});
