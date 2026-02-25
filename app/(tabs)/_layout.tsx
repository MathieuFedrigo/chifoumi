import { Tabs, router } from "expo-router";
import { Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "react-i18next";

export default function TabLayout() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.button,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: { backgroundColor: theme.colors.surface },
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("game.title"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="hand-back-right"
              size={size}
              color={color}
            />
          ),
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/settings")}
              accessibilityRole="button"
              accessibilityLabel={t("settings.title")}
              style={{ marginRight: 12 }}
            >
              <MaterialCommunityIcons
                name="cog"
                size={24}
                color={theme.colors.text}
              />
            </Pressable>
          ),
        }}
      />
    </Tabs>
  );
}
