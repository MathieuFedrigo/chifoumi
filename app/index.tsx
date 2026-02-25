import { View, Text, Pressable, StyleSheet, FlatList } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";

const GAME_MODES = [
  { key: "classic", labelKey: "home.classicMode", route: "/game" },
  { key: "directions", labelKey: "home.directionsMode", route: "/game?mode=directions" },
] as const;

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

      <FlatList
        data={GAME_MODES}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.modes}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.modeCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => router.push(item.route)}
            accessibilityRole="button"
            accessibilityLabel={t(item.labelKey)}
          >
            <Text style={[styles.modeText, { color: theme.colors.text }]}>
              {t(item.labelKey)}
            </Text>
          </Pressable>
        )}
      />
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
    paddingTop: 8,
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
