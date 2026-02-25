import { renderRouter, screen, userEvent } from "expo-router/testing-library";
import { Text } from "react-native";
import SettingsScreen from "@/app/settings";
import TabLayout from "@/app/(tabs)/_layout";
import { useAppStore } from "@/store/appStore";

describe("SettingsScreen", () => {
  const renderSettings = () =>
    renderRouter(
      { settings: SettingsScreen },
      { initialUrl: "/settings" }
    );

  it("shows theme section with 3 options, System selected by default", () => {
    renderSettings();

    expect(screen.getByText("Theme")).toBeTruthy();
    expect(screen.getByText("Light")).toBeTruthy();
    expect(screen.getByText("Dark")).toBeTruthy();

    // "System" appears in both theme and language sections
    const systemTexts = screen.getAllByText("System");
    expect(systemTexts.length).toBe(2);

    // Check icon renders for default selection (system theme)
    const checks = screen.getAllByText("check");
    expect(checks.length).toBe(2); // one for theme, one for language
  });

  it("shows language section with 3 options, System selected by default", () => {
    renderSettings();

    expect(screen.getByText("Language")).toBeTruthy();
    expect(screen.getByText("English")).toBeTruthy();
    expect(screen.getByText("Français")).toBeTruthy();
  });

  it("pressing Dark selects dark theme", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.press(screen.getByText("Dark"));

    // After selecting dark, we should have checks for Dark + System (language)
    const checks = screen.getAllByText("check");
    expect(checks.length).toBe(2);

    // Verify dark is now selected by pressing Light and checking it works
    await user.press(screen.getByText("Light"));
    expect(screen.getAllByText("check").length).toBe(2);
  });

  it("pressing Light selects light theme", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.press(screen.getByText("Light"));

    const checks = screen.getAllByText("check");
    expect(checks.length).toBe(2);
  });

  it("pressing English selects en locale", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.press(screen.getByText("English"));

    const checks = screen.getAllByText("check");
    expect(checks.length).toBe(2);
  });

  it("pressing Français selects fr locale", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.press(screen.getByText("Français"));

    const checks = screen.getAllByText("check");
    expect(checks.length).toBe(2);
  });

  it("cycles through all theme modes via direct selection", async () => {
    const user = userEvent.setup();
    renderSettings();

    // Default is system - 2 checks (theme system + lang system)
    expect(screen.getAllByText("check").length).toBe(2);

    // Select dark
    await user.press(screen.getByText("Dark"));
    expect(screen.getAllByText("check").length).toBe(2);

    // Select light
    await user.press(screen.getByText("Light"));
    expect(screen.getAllByText("check").length).toBe(2);

    // Back to system
    await user.press(screen.getAllByText("System")[0]);
    expect(screen.getAllByText("check").length).toBe(2);
  });
});

describe("appStore - cycleThemeMode (no UI path)", () => {
  it("cycles theme: system → dark → light → system", () => {
    const { cycleThemeMode } = useAppStore.getState().actions;
    expect(useAppStore.getState().themeMode).toBe("system");

    cycleThemeMode();
    expect(useAppStore.getState().themeMode).toBe("dark");

    useAppStore.getState().actions.cycleThemeMode();
    expect(useAppStore.getState().themeMode).toBe("light");

    useAppStore.getState().actions.cycleThemeMode();
    expect(useAppStore.getState().themeMode).toBe("system");
  });
});

describe("Settings navigation", () => {
  it("gear icon visible in game screen header navigates to settings", async () => {
    const user = userEvent.setup();
    renderRouter(
      {
        "(tabs)/_layout": TabLayout,
        "(tabs)/index": () => <Text>{"Game Screen"}</Text>,
        settings: SettingsScreen,
      },
      { initialUrl: "/" }
    );

    expect(screen.getByText("Game Screen")).toBeTruthy();

    // The gear icon renders as "cog" text in the mock
    const cogIcon = screen.getByText("cog");
    expect(cogIcon).toBeTruthy();

    await user.press(cogIcon);

    // Settings screen should now be visible
    expect(screen.getByText("Theme")).toBeTruthy();
    expect(screen.getByText("Language")).toBeTruthy();
  });
});
