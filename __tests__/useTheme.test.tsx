import { renderRouter, screen, userEvent } from "expo-router/testing-library";
import { View, Text, Pressable } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { useAppStoreActions } from "@/store/appStore";

const useColorSchemeMock = jest.requireMock(
  "react-native/Libraries/Utilities/useColorScheme"
).default;

const ThemeDisplay = () => {
  const theme = useTheme();
  const { setThemeMode } = useAppStoreActions();

  return (
    <View>
      <Text>{`bg:${theme.colors.background}`}</Text>
      <Pressable onPress={() => setThemeMode("dark")} accessibilityRole="button">
        <Text>{"Set Dark"}</Text>
      </Pressable>
      <Pressable onPress={() => setThemeMode("light")} accessibilityRole="button">
        <Text>{"Set Light"}</Text>
      </Pressable>
      <Pressable onPress={() => setThemeMode("system")} accessibilityRole="button">
        <Text>{"Set System"}</Text>
      </Pressable>
    </View>
  );
};

describe("useTheme", () => {
  const renderApp = () =>
    renderRouter({ index: ThemeDisplay }, { initialUrl: "/" });

  it("returns light theme by default (system mode, light scheme)", () => {
    useColorSchemeMock.mockReturnValue("light");
    renderApp();
    expect(screen.getByText("bg:#FFFFFF")).toBeTruthy();
  });

  it("returns dark theme when system scheme is dark", () => {
    useColorSchemeMock.mockReturnValue("dark");
    renderApp();
    // system mode + dark scheme = dark theme
    expect(screen.getByText("bg:#0F172A")).toBeTruthy();
  });

  it("returns dark theme when explicitly set to dark", async () => {
    useColorSchemeMock.mockReturnValue("light");
    const user = userEvent.setup();
    renderApp();

    await user.press(screen.getByText("Set Dark"));
    expect(screen.getByText("bg:#0F172A")).toBeTruthy();
  });

  it("returns light theme when explicitly set to light", async () => {
    useColorSchemeMock.mockReturnValue("dark");
    const user = userEvent.setup();
    renderApp();

    await user.press(screen.getByText("Set Light"));
    expect(screen.getByText("bg:#FFFFFF")).toBeTruthy();
  });
});
