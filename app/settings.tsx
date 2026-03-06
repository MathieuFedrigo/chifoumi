import { useState } from "react";
import { Text, Pressable, StyleSheet, View, Modal } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { type Theme } from "@/constants/theme";
import { useTranslation } from "react-i18next";
import { useAppStore, useAppStoreActions, type ThemeMode, type LocaleMode, type AiRuleId } from "@/store/appStore";
import { ALL_AI_RULE_IDS } from "@/lib/aiGuess";
import * as Sentry from "@sentry/react-native";

interface DropdownOption<T> {
  key: T;
  label: string;
}

interface SettingDropdownProps<T extends string> {
  label: string;
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  theme: Theme;
}

function SettingDropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  open,
  onOpen,
  onClose,
  theme,
}: SettingDropdownProps<T>) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const currentLabel = options.find((o) => o.key === value)!.label;

  return (
    <>
      <Pressable
        style={[styles.dropdownRow, { borderBottomColor: theme.colors.border }]}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={[styles.dropdownLabel, { color: theme.colors.textSecondary }]}>
          {label}
        </Text>
        <View style={styles.dropdownValue}>
          <Text style={[styles.rowText, { color: theme.colors.text }]}>{currentLabel}</Text>
          <MaterialCommunityIcons
            name="chevron-down"
            size={20}
            color={theme.colors.textSecondary}
          />
        </View>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            {options.map((option, index) => (
              <Pressable
                key={option.key}
                style={[
                  styles.optionRow,
                  index < options.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: theme.colors.border,
                  },
                ]}
                onPress={() => {
                  onChange(option.key);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityLabel={option.label}
              >
                <Text style={[styles.rowText, { color: theme.colors.text }]}>{option.label}</Text>
                {option.key === value && (
                  <MaterialCommunityIcons name="check" size={22} color={theme.colors.button} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

interface SettingMultiSelectProps<T extends string> {
  label: string;
  summary: string;
  options: { key: T; label: string }[];
  enabledKeys: T[];
  onToggle: (key: T) => void;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  theme: Theme;
}

function SettingMultiSelect<T extends string>({
  label,
  summary,
  options,
  enabledKeys,
  onToggle,
  open,
  onOpen,
  onClose,
  theme,
}: SettingMultiSelectProps<T>) {
  return (
    <>
      <Pressable
        style={[styles.dropdownRow, { borderBottomColor: theme.colors.border }]}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={[styles.dropdownLabel, { color: theme.colors.textSecondary }]}>
          {label}
        </Text>
        <View style={styles.dropdownValue}>
          <Text style={[styles.rowText, { color: theme.colors.text }]}>{summary}</Text>
          <MaterialCommunityIcons
            name="chevron-down"
            size={20}
            color={theme.colors.textSecondary}
          />
        </View>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable testID="multiselect-overlay" style={styles.overlay} onPress={onClose}>
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            {options.map((option, index) => (
              <Pressable
                key={option.key}
                style={[
                  styles.optionRow,
                  index < options.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: theme.colors.border,
                  },
                ]}
                onPress={() => onToggle(option.key)}
                accessibilityRole="button"
                accessibilityLabel={option.label}
              >
                <Text style={[styles.rowText, { color: theme.colors.text }]}>{option.label}</Text>
                {enabledKeys.includes(option.key) && (
                  <MaterialCommunityIcons name="check" size={22} color={theme.colors.button} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const themeMode = useAppStore((s) => s.themeMode);
  const localeMode = useAppStore((s) => s.localeMode);
  const enabledAiRules = useAppStore((s) => s.enabledAiRules);
  const { setThemeMode, setLocaleMode, setEnabledAiRules } = useAppStoreActions();

  const [themeOpen, setThemeOpen] = useState(false);
  const [localeOpen, setLocaleOpen] = useState(false);
  const [aiRulesOpen, setAiRulesOpen] = useState(false);

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

  const handleAiRuleToggle = (id: AiRuleId) => {
    Sentry.addBreadcrumb({
      category: "settings",
      message: "AI Rule toggled",
      level: "info",
      data: { rule: id },
    });
    const next = enabledAiRules.includes(id)
      ? enabledAiRules.filter((r) => r !== id)
      : [...enabledAiRules, id];
    setEnabledAiRules(next);
  };

  const themeOptions: DropdownOption<ThemeMode>[] = [
    { key: "light", label: t("settings.themeLight") },
    { key: "dark", label: t("settings.themeDark") },
    { key: "system", label: t("settings.themeSystem") },
  ];

  const localeOptions: DropdownOption<LocaleMode>[] = [
    { key: "system", label: t("settings.langSystem") },
    { key: "en", label: t("settings.langEn") },
    { key: "fr", label: t("settings.langFr") },
  ];

  const aiRuleOptions: { key: AiRuleId; label: string }[] = [
    { key: "repeat", label: t("settings.aiRuleRepeat") },
    { key: "rpsCycle", label: t("settings.aiRuleRpsCycle") },
    { key: "dirCycle", label: t("settings.aiRuleDirCycle") },
    { key: "crossCycle", label: t("settings.aiRuleCrossCycle") },
    { key: "afterDirection", label: t("settings.aiRuleAfterDirection") },
    { key: "afterRPS", label: t("settings.aiRuleAfterRPS") },
    { key: "mostFrequent", label: t("settings.aiRuleMostFrequent") },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SettingDropdown
        label={t("settings.theme")}
        value={themeMode}
        options={themeOptions}
        onChange={handleThemeChange}
        open={themeOpen}
        onOpen={() => setThemeOpen(true)}
        onClose={() => setThemeOpen(false)}
        theme={theme}
      />

      <SettingDropdown
        label={t("settings.language")}
        value={localeMode}
        options={localeOptions}
        onChange={handleLocaleChange}
        open={localeOpen}
        onOpen={() => setLocaleOpen(true)}
        onClose={() => setLocaleOpen(false)}
        theme={theme}
      />

      <SettingMultiSelect
        label={t("settings.aiRules")}
        summary={t("settings.aiRulesCount", { count: enabledAiRules.length })}
        options={aiRuleOptions}
        enabledKeys={enabledAiRules}
        onToggle={handleAiRuleToggle}
        open={aiRulesOpen}
        onOpen={() => setAiRulesOpen(true)}
        onClose={() => setAiRulesOpen(false)}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  dropdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  dropdownValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: 12,
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowText: {
    fontSize: 16,
  },
});
