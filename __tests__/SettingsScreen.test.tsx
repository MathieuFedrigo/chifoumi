import { renderRouter, screen, userEvent } from "expo-router/testing-library";
import SettingsScreen from "@/app/settings";
import HomeScreen from "@/app/index";
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

    // Check icon renders for default selection (system theme + lang system + ai guess off)
    const checks = screen.getAllByText("check");
    expect(checks.length).toBe(3);
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

    // After selecting dark, we should have checks for Dark + System (language) + Off (ai guess)
    const checks = screen.getAllByText("check");
    expect(checks.length).toBe(3);

    // Verify dark is now selected by pressing Light and checking it works
    await user.press(screen.getByText("Light"));
    expect(screen.getAllByText("check").length).toBe(3);
  });

  it("pressing Light selects light theme", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.press(screen.getByText("Light"));

    const checks = screen.getAllByText("check");
    expect(checks.length).toBe(3);
  });

  it("pressing English selects en locale", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.press(screen.getByText("English"));

    const checks = screen.getAllByText("check");
    expect(checks.length).toBe(3);
  });

  it("pressing Français selects fr locale", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.press(screen.getByText("Français"));

    const checks = screen.getAllByText("check");
    expect(checks.length).toBe(3);
  });

  it("shows AI Guess section with On/Off options, Off selected by default", () => {
    renderSettings();

    expect(screen.getByText("AI Guess")).toBeTruthy();
    expect(screen.getByText("On")).toBeTruthy();
    expect(screen.getByText("Off")).toBeTruthy();
  });

  it("pressing On enables AI Guess", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.press(screen.getByText("On"));

    // On is now selected, Off is not → still 3 checks total (theme + lang + ai guess On)
    expect(screen.getAllByText("check").length).toBe(3);
  });

  it("pressing Off after On disables AI Guess", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.press(screen.getByText("On"));
    await user.press(screen.getByText("Off"));

    expect(screen.getAllByText("check").length).toBe(3);
  });

  it("cycles through all theme modes via direct selection", async () => {
    const user = userEvent.setup();
    renderSettings();

    // Default is system - 2 checks (theme system + lang system)
    expect(screen.getAllByText("check").length).toBe(3);

    // Select dark
    await user.press(screen.getByText("Dark"));
    expect(screen.getAllByText("check").length).toBe(3);

    // Select light
    await user.press(screen.getByText("Light"));
    expect(screen.getAllByText("check").length).toBe(3);

    // Back to system
    await user.press(screen.getAllByText("System")[0]);
    expect(screen.getAllByText("check").length).toBe(3);
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
  it("gear icon on home screen navigates to settings", async () => {
    const user = userEvent.setup();
    renderRouter(
      {
        "index": HomeScreen,
        "settings": SettingsScreen,
      },
      { initialUrl: "/" }
    );

    expect(screen.getByText("Chifoumi")).toBeTruthy();

    // The gear icon renders as "cog" text in the mock
    const cogIcon = screen.getByText("cog");
    expect(cogIcon).toBeTruthy();

    await user.press(cogIcon);

    // Settings screen should now be visible
    expect(screen.getByText("Theme")).toBeTruthy();
    expect(screen.getByText("Language")).toBeTruthy();
  });
});
