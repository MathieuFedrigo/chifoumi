import { renderRouter, screen, userEvent, act } from "expo-router/testing-library";
import { Text } from "react-native";
import HomeScreen from "@/app/index";
import GameScreen from "@/app/game";
import { getRoundTimings } from "@/lib/rhythmDifficulty";

const useColorSchemeMock = jest.requireMock(
  "react-native/Libraries/Utilities/useColorScheme"
).default;

const renderHome = () =>
  renderRouter(
    { "index": HomeScreen, "game": GameScreen, "settings": () => <Text>{"Settings"}</Text> },
    { initialUrl: "/" }
  );

const renderFullApp = () =>
  renderRouter(
    { "index": HomeScreen, "game": GameScreen, "settings": () => <Text>{"Settings"}</Text>, "history": () => <Text>{"History"}</Text> },
    { initialUrl: "/" }
  );

const advanceToScissors = (round = 0) => {
  const { beatInterval } = getRoundTimings(round);
  act(() => { jest.advanceTimersByTime(beatInterval); });
  act(() => { jest.advanceTimersByTime(beatInterval); });
};

const advanceResultToRock = (round = 0) => {
  const { beatInterval } = getRoundTimings(round);
  act(() => { jest.advanceTimersByTime(beatInterval); });
  act(() => { jest.advanceTimersByTime(beatInterval); });
};

const advanceToTimeout = (round = 0) => {
  const { beatInterval, graceAfter } = getRoundTimings(round);
  act(() => { jest.advanceTimersByTime(beatInterval); });
  act(() => { jest.advanceTimersByTime(beatInterval); });
  act(() => { jest.advanceTimersByTime(graceAfter); });
};

describe("HomeScreen", () => {
  it("renders app title", () => {
    renderHome();

    expect(screen.getByText("Chifoumi")).toBeTruthy();
  });

  it("renders settings gear button", () => {
    renderHome();

    expect(screen.getByLabelText("Settings")).toBeTruthy();
  });

  it("navigates to settings when gear is pressed", async () => {
    const user = userEvent.setup();
    const { getPathname } = renderHome();

    await user.press(screen.getByLabelText("Settings"));

    expect(getPathname()).toBe("/settings");
  });

  it("renders Classic mode button", () => {
    renderHome();

    expect(screen.getByText("Classic")).toBeTruthy();
  });

  it("renders Directions mode button", () => {
    renderHome();

    expect(screen.getByText("Directions")).toBeTruthy();
  });

  it("navigates to game when Classic is pressed", async () => {
    const user = userEvent.setup();
    const { getPathname } = renderHome();

    await user.press(screen.getByText("Classic"));

    expect(getPathname()).toBe("/game");
  });

  it("navigates to game when Directions is pressed", async () => {
    const user = userEvent.setup();
    const { getPathname } = renderHome();

    await user.press(screen.getByText("Directions"));

    expect(getPathname()).toBe("/game");
  });

  it("renders 3-2-1 mode button", () => {
    renderHome();

    expect(screen.getByText("3-2-1")).toBeTruthy();
  });

  it("navigates to game when 3-2-1 is pressed", async () => {
    const user = userEvent.setup();
    const { getPathname } = renderHome();

    await user.press(screen.getByText("3-2-1"));

    expect(getPathname()).toBe("/game");
  });

  it("renders 3-2-1 Directions mode button", () => {
    renderHome();

    expect(screen.getByText("3-2-1 Directions")).toBeTruthy();
  });

  it("navigates to game when 3-2-1 Directions is pressed", async () => {
    const user = userEvent.setup();
    const { getPathname } = renderHome();

    await user.press(screen.getByText("3-2-1 Directions"));

    expect(getPathname()).toBe("/game");
  });

  it("applies dark theme colors", () => {
    useColorSchemeMock.mockReturnValue("dark");
    renderHome();

    expect(screen.getByText("Chifoumi")).toBeTruthy();
  });

  it("does not show best score on mode cards when score is 0", () => {
    renderHome();

    expect(screen.queryByText(/Best:/)).toBeNull();
  });

  it("shows best score on Classic card after game is played", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // AI always picks rock

    const user = userEvent.setup();
    renderFullApp();

    // Navigate to game and win one round (score 1), then timeout
    await user.press(screen.getByText("Classic"));
    advanceToScissors();
    await user.press(screen.getByLabelText("Paper!"));
    advanceResultToRock();
    advanceToTimeout(1);

    // Navigate back home
    await user.press(screen.getByLabelText("Home"));

    expect(screen.getByText("Best: 1")).toBeTruthy();
  });
});
