import { renderRouter, screen, userEvent } from "expo-router/testing-library";
import { View, Text, Pressable } from "react-native";
import { useAppStore } from "@/store/appStore";

const ThemeTestComponent = () => {
  const themeMode = useAppStore((s) => s.themeMode);
  const cycleThemeMode = useAppStore((s) => s.cycleThemeMode);
  const setThemeMode = useAppStore((s) => s.setThemeMode);
  const localeMode = useAppStore((s) => s.localeMode);
  const setLocaleMode = useAppStore((s) => s.setLocaleMode);

  return (
    <View>
      <Text>{`theme:${themeMode}`}</Text>
      <Text>{`locale:${localeMode}`}</Text>
      <Pressable onPress={cycleThemeMode} accessibilityRole="button">
        <Text>{"Cycle"}</Text>
      </Pressable>
      <Pressable onPress={() => setThemeMode("dark")} accessibilityRole="button">
        <Text>{"Set Dark"}</Text>
      </Pressable>
      <Pressable onPress={() => setLocaleMode("fr")} accessibilityRole="button">
        <Text>{"Set FR"}</Text>
      </Pressable>
    </View>
  );
};

describe("appStore", () => {
  const renderApp = () =>
    renderRouter(
      { index: ThemeTestComponent },
      { initialUrl: "/" }
    );

  it("starts with system theme and locale", () => {
    renderApp();
    expect(screen.getByText("theme:system")).toBeTruthy();
    expect(screen.getByText("locale:system")).toBeTruthy();
  });

  it("cycles theme mode: system → dark → light → system", async () => {
    const user = userEvent.setup();
    renderApp();

    expect(screen.getByText("theme:system")).toBeTruthy();

    await user.press(screen.getByText("Cycle"));
    expect(screen.getByText("theme:dark")).toBeTruthy();

    await user.press(screen.getByText("Cycle"));
    expect(screen.getByText("theme:light")).toBeTruthy();

    await user.press(screen.getByText("Cycle"));
    expect(screen.getByText("theme:system")).toBeTruthy();
  });

  it("sets theme mode directly", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.press(screen.getByText("Set Dark"));
    expect(screen.getByText("theme:dark")).toBeTruthy();
  });

  it("sets locale mode", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.press(screen.getByText("Set FR"));
    expect(screen.getByText("locale:fr")).toBeTruthy();
  });
});
