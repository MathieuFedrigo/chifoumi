import { Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "react-i18next";
import { useAppStore, useAppStoreActions, ThemeMode, LocaleMode } from "@/store/appStore";
import * as Sentry from "@sentry/react-native";

export default function SettingsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const themeMode = useAppStore((s) => s.themeMode);
  const localeMode = useAppStore((s) => s.localeMode);
  const aiGuessEnabled = useAppStore((s) => s.aiGuessEnabled);
  const { setThemeMode, setLocaleMode, setAiGuessEnabled } = useAppStoreActions();

  const handleThemeChange = (mode: ThemeMode) => {
    Sentry.addBreadcrumb({
      category: "settings",
      message: "Theme changed",
      level: "info",
      data: { from: themeMode, to: mode },
    });
    setThemeMode(mode);
  };

  const handleLocaleChange = (mode: LocaleMode) => {
    Sentry.addBreadcrumb({
      category: "settings",
      message: "Language changed",
      level: "info",
      data: { from: localeMode, to: mode },
    });
    setLocaleMode(mode);
  };

  const handleAiGuessChange = (enabled: boolean) => {
    Sentry.addBreadcrumb({
      category: "settings",
      message: "AI Guess changed",
      level: "info",
      data: { from: aiGuessEnabled, to: enabled },
    });
    setAiGuessEnabled(enabled);
  };

  const aiGuessOptions: { key: boolean; label: string }[] = [
    { key: true, label: t("settings.aiGuessOn") },
    { key: false, label: t("settings.aiGuessOff") },
  ];

  const themeOptions: { key: ThemeMode; label: string }[] = [
    { key: "light", label: t("settings.themeLight") },
    { key: "dark", label: t("settings.themeDark") },
    { key: "system", label: t("settings.themeSystem") },
  ];

  const localeOptions: { key: LocaleMode; label: string }[] = [
    { key: "system", label: t("settings.langSystem") },
    { key: "en", label: t("settings.langEn") },
    { key: "fr", label: t("settings.langFr") },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
        {t("settings.theme")}
      </Text>
      {themeOptions.map((option) => (
        <Pressable
          key={option.key}
          style={[styles.row, { borderBottomColor: theme.colors.border }]}
          onPress={() => handleThemeChange(option.key)}
          accessibilityRole="button"
          accessibilityLabel={option.label}
        >
          <Text style={[styles.rowText, { color: theme.colors.text }]}>
            {option.label}
          </Text>
          {themeMode === option.key && (
            <MaterialCommunityIcons
              name="check"
              size={22}
              color={theme.colors.button}
            />
          )}
        </Pressable>
      ))}

      <Text
        style={[
          styles.sectionTitle,
          styles.sectionSpacing,
          { color: theme.colors.textSecondary },
        ]}
      >
        {t("settings.language")}
      </Text>
      {localeOptions.map((option) => (
        <Pressable
          key={option.key}
          style={[styles.row, { borderBottomColor: theme.colors.border }]}
          onPress={() => handleLocaleChange(option.key)}
          accessibilityRole="button"
          accessibilityLabel={option.label}
        >
          <Text style={[styles.rowText, { color: theme.colors.text }]}>
            {option.label}
          </Text>
          {localeMode === option.key && (
            <MaterialCommunityIcons
              name="check"
              size={22}
              color={theme.colors.button}
            />
          )}
        </Pressable>
      ))}

      <Text
        style={[
          styles.sectionTitle,
          styles.sectionSpacing,
          { color: theme.colors.textSecondary },
        ]}
      >
        {t("settings.aiGuess")}
      </Text>
      {aiGuessOptions.map((option) => (
        <Pressable
          key={String(option.key)}
          style={[styles.row, { borderBottomColor: theme.colors.border }]}
          onPress={() => handleAiGuessChange(option.key)}
          accessibilityRole="button"
          accessibilityLabel={option.label}
        >
          <Text style={[styles.rowText, { color: theme.colors.text }]}>
            {option.label}
          </Text>
          {aiGuessEnabled === option.key && (
            <MaterialCommunityIcons
              name="check"
              size={22}
              color={theme.colors.button}
            />
          )}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    paddingTop: 24,
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  sectionSpacing: {
    marginTop: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    fontSize: 16,
  },
});
