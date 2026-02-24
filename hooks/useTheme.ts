import { lightTheme, darkTheme, Theme } from "@/constants/theme";
import { useAppStore } from "@/store/appStore";
import { useColorScheme } from "react-native";

/**
 * Returns the active theme based on the user's theme mode preference.
 * Resolves "system" mode to light or dark based on OS settings.
 */
export const useTheme = (): Theme => {
  const themeMode = useAppStore((state) => state.themeMode);
  const systemColorScheme = useColorScheme();

  if (themeMode === "system") {
    return systemColorScheme === "dark" ? darkTheme : lightTheme;
  }

  return themeMode === "dark" ? darkTheme : lightTheme;
};
