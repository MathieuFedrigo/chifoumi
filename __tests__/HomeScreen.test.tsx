import { renderRouter, screen, userEvent } from "expo-router/testing-library";
import { Text } from "react-native";
import HomeScreen from "@/app/index";
import GameScreen from "@/app/game";

const useColorSchemeMock = jest.requireMock(
  "react-native/Libraries/Utilities/useColorScheme"
).default;

const renderHome = () =>
  renderRouter(
    { "index": HomeScreen, "game": GameScreen, "settings": () => <Text>{"Settings"}</Text> },
    { initialUrl: "/" }
  );

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

  it("applies dark theme colors", () => {
    useColorSchemeMock.mockReturnValue("dark");
    renderHome();

    expect(screen.getByText("Chifoumi")).toBeTruthy();
  });
});
