import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";

export default function HomeScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.topBar}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t("home.title")}
        </Text>
        <Pressable
          onPress={() => router.push("/settings")}
          accessibilityRole="button"
          accessibilityLabel={t("settings.title")}
        >
          <MaterialCommunityIcons
            name="cog"
            size={28}
            color={theme.colors.text}
          />
        </Pressable>
      </View>

      <View style={styles.modes}>
        <Pressable
          style={[styles.modeCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={() => router.push("/game")}
          accessibilityRole="button"
          accessibilityLabel={t("home.classicMode")}
        >
          <Text style={[styles.modeText, { color: theme.colors.text }]}>
            {t("home.classicMode")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
  },
  modes: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modeCard: {
    width: "100%",
    paddingVertical: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  modeText: {
    fontSize: 28,
    fontWeight: "700",
  },
});
