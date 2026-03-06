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

  it("shows theme section with compact row and System value by default", () => {
    renderSettings();

    expect(screen.getByText("Theme")).toBeTruthy();
    expect(screen.getByText("Language")).toBeTruthy();

    // System appears in both theme row value and language row value
    expect(screen.getAllByText("System").length).toBe(2);

    // Chevron visible for both dropdowns
    expect(screen.getAllByText("chevron-down").length).toBe(2);

    // Only AI Guess Off check visible by default (theme/lang checks are inside closed modals)
    expect(screen.getAllByText("check").length).toBe(1);
  });

  it("shows language section with compact row and System value by default", () => {
    renderSettings();

    expect(screen.getByText("Language")).toBeTruthy();
    // Options hidden until dropdown opened
    expect(screen.queryByText("English")).toBeNull();
    expect(screen.queryByText("Français")).toBeNull();
  });

  it("opening theme dropdown shows all options with check on selected", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.press(screen.getByText("Theme"));

    expect(screen.getByText("Light")).toBeTruthy();
    expect(screen.getByText("Dark")).toBeTruthy();
    // 2 checks: theme System (in modal) + AI Guess Off
    expect(screen.getAllByText("check").length).toBe(2);
  });

  it("pressing Dark selects dark theme", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.press(screen.getByText("Theme"));
    await user.press(screen.getByText("Dark"));

    // Modal closed, Dark now in theme row
    expect(screen.getByText("Dark")).toBeTruthy();
    // System only in language row now
    expect(screen.getAllByText("System").length).toBe(1);
    // Back to 1 check (AI Guess Off only)
    expect(screen.getAllByText("check").length).toBe(1);
  });

  it("pressing Light selects light theme", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.press(screen.getByText("Theme"));
    await user.press(screen.getByText("Light"));

    expect(screen.getByText("Light")).toBeTruthy();
    expect(screen.getAllByText("System").length).toBe(1);
  });

  it("opening language dropdown shows all options with check on selected", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.press(screen.getByText("Language"));

    expect(screen.getByText("English")).toBeTruthy();
    expect(screen.getByText("Français")).toBeTruthy();
    // 2 checks: lang System (in modal) + AI Guess Off
    expect(screen.getAllByText("check").length).toBe(2);
  });

  it("pressing English selects en locale", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.press(screen.getByText("Language"));
    await user.press(screen.getByText("English"));

    expect(screen.getByText("English")).toBeTruthy();
    // System only in theme row now
    expect(screen.getAllByText("System").length).toBe(1);
  });

  it("pressing Français selects fr locale", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.press(screen.getByText("Language"));
    await user.press(screen.getByText("Français"));

    expect(screen.getByText("Français")).toBeTruthy();
    expect(screen.getAllByText("System").length).toBe(1);
  });

  it("shows AI Guess section with On/Off options, Off selected by default", () => {
    renderSettings();

    expect(screen.getByText("AI Guess")).toBeTruthy();
    expect(screen.getByText("On")).toBeTruthy();
    expect(screen.getByText("Off")).toBeTruthy();

    // Off check visible
    expect(screen.getAllByText("check").length).toBe(1);
  });

  it("pressing On enables AI Guess", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.press(screen.getByText("On"));

    // check now on On, not Off
    expect(screen.getAllByText("check").length).toBe(1);
  });

  it("pressing Off after On disables AI Guess", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.press(screen.getByText("On"));
    await user.press(screen.getByText("Off"));

    expect(screen.getAllByText("check").length).toBe(1);
  });

  it("cycles through theme modes via dropdown", async () => {
    const user = userEvent.setup();
    renderSettings();

    // Default: System in both rows
    expect(screen.getAllByText("System").length).toBe(2);

    // Select dark
    await user.press(screen.getByText("Theme"));
    await user.press(screen.getByText("Dark"));
    expect(screen.getByText("Dark")).toBeTruthy();
    expect(screen.getAllByText("System").length).toBe(1);

    // Select light
    await user.press(screen.getByText("Theme"));
    await user.press(screen.getByText("Light"));
    expect(screen.getByText("Light")).toBeTruthy();

    // Open modal: Light has check, Dark and System don't
    await user.press(screen.getByText("Theme"));
    expect(screen.getAllByText("check").length).toBe(2); // light (modal) + AI guess off
    // Dismiss by pressing Dark to avoid ambiguous System press
    await user.press(screen.getByText("Dark"));
    expect(screen.getByText("Dark")).toBeTruthy();
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
