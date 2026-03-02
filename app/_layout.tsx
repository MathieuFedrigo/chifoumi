import i18n from "@/i18n";
import { ThemeProvider } from "@react-navigation/native";
import { lightTheme, darkTheme, toNavigationTheme } from "@/constants/theme";
import { useExpoUpdates } from "@/hooks/useExpoUpdates";
import { useAppStore } from "@/store/appStore";
import { useFonts } from "expo-font";
import { getLocales } from "expo-localization";
import { Stack, useNavigationContainerRef } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

// Toggle this to enable Sentry in development (always enabled in production)
const ENABLE_SENTRY_IN_DEV = false;

// Create navigation integration BEFORE Sentry.init()
const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

/* istanbul ignore next */
if (!__DEV__ || ENABLE_SENTRY_IN_DEV) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,

    // Adds more context data to events (IP address, cookies, user, etc.)
    // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
    sendDefaultPii: true,

    // Enable Logs
    enableLogs: true,

    // Performance Monitoring
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,

    // Integrations
    integrations: [
      navigationIntegration,
      Sentry.mobileReplayIntegration(),
      Sentry.reactNativeTracingIntegration(),
    ],

    // Profiling
    profilesSampleRate: __DEV__ ? 0.5 : 0.1,

    // Release Tracking
    release: Constants.expoConfig?.version,
    dist:
      Constants.expoConfig?.ios?.buildNumber ||
      Constants.expoConfig?.android?.versionCode?.toString(),

    // Environment
    environment: __DEV__ ? "development" : "production",

    // Configure Session Replay (adjusted for prod)
    replaysSessionSampleRate: __DEV__ ? 0.1 : 0.05,
    replaysOnErrorSampleRate: 1.0,

    // Spotlight (dev debugging)
    spotlight: __DEV__,
  });
}

const RootLayout = function RootLayout() {
  // TODO: Replace with your app's fonts (or remove if using system fonts)
  const [loaded, error] = useFonts({
    // "MyFont-Regular": require("../assets/fonts/MyFont-Regular.ttf"),
  });

  const ref = useNavigationContainerRef();

  const { t } = useTranslation();

  useExpoUpdates();

  // Register navigation container for Sentry
  useEffect(() => {
    /* istanbul ignore else */
    if (ref) {
      navigationIntegration.registerNavigationContainer(ref);
    }
  }, [ref]);

  // Locale mode from store
  const localeMode = useAppStore((s) => s.localeMode);

  useEffect(() => {
    const deviceLang = getLocales()[0]?.languageCode ?? "en";
    const lang = localeMode === "system"
      ? (["en", "fr"].includes(deviceLang) ? deviceLang : "en")
      : localeMode;
    i18n.changeLanguage(lang);
  }, [localeMode]);

  // Theme mode from store and system preference
  const themeMode = useAppStore((s) => s.themeMode);
  const systemScheme = useColorScheme();
  const isDark =
    themeMode === "dark" || (themeMode === "system" && systemScheme === "dark");

  if (!loaded || error) return null;

  return (
    <ThemeProvider value={toNavigationTheme(isDark ? darkTheme : lightTheme, isDark)}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="game" />
        <Stack.Screen
          name="history"
          options={{
            presentation: "modal",
            headerShown: true,
            title: t("history.title"),
            headerStyle: { backgroundColor: isDark ? darkTheme.colors.surface : lightTheme.colors.surface },
            headerTintColor: isDark ? darkTheme.colors.text : lightTheme.colors.text,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            presentation: "modal",
            headerShown: true,
            title: t("settings.title"),
            headerStyle: { backgroundColor: isDark ? darkTheme.colors.surface : lightTheme.colors.surface },
            headerTintColor: isDark ? darkTheme.colors.text : lightTheme.colors.text,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
};

/* istanbul ignore next */
export default !__DEV__ || ENABLE_SENTRY_IN_DEV
  ? Sentry.wrap(RootLayout)
  : RootLayout;
