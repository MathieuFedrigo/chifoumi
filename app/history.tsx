import { View, Text, FlatList, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { FontAwesome5 } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useGameStore } from "@/store/gameStore";
import type { HistoryEntry, Choice, Direction, GamePhase } from "@/store/gameStore";
import type { ComponentProps } from "react";
import type { Theme } from "@/constants/theme";
import type { TFunction } from "i18next";

type IconName = ComponentProps<typeof FontAwesome5>["name"];

const CHOICE_ICONS: Record<Choice, IconName> = {
  rock: "hand-rock",
  paper: "hand-paper",
  scissors: "hand-scissors",
};

const DIRECTION_ICONS: Record<Direction, IconName> = {
  up: "arrow-up",
  down: "arrow-down",
  left: "arrow-left",
  right: "arrow-right",
};

const PHASE_BEAT_COUNT: Record<GamePhase, number> = {
  idle: 0,
  rock: 1,
  paper: 2,
  scissors: 3,
  result: 0,
};

const PHASE_LABELS = ["R", "P", "S"] as const;

export default function HistoryScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const roundHistory = useGameStore((s) => s.roundHistory);

  const renderItem = ({ item, index }: { item: HistoryEntry; index: number }) => (
    <View style={styles.itemWrapper}>
      {index > 0 && (
        <View style={[styles.separator, { borderColor: theme.colors.border }]} />
      )}
      <HistoryItem entry={item} index={index} colors={theme.colors} t={t} />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {roundHistory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            {t("history.title")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={roundHistory}
          renderItem={renderItem}
          keyExtractor={(_, i) => String(i)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          initialNumToRender={50}
        />
      )}
    </View>
  );
}

interface HistoryItemProps {
  entry: HistoryEntry;
  index: number;
  colors: Theme["colors"];
  t: TFunction;
}

function HistoryItem({ entry, index, colors, t }: HistoryItemProps) {
  const isMistake = entry.type === "mistake";
  const beatCount = PHASE_BEAT_COUNT[entry.choosePhase];

  return (
    <View style={styles.item}>
      <Text style={[styles.roundLabel, { color: isMistake ? colors.warning : colors.textSecondary }]}>
        {isMistake
          ? entry.mistakeReason === "too_early"
            ? t("game.tooEarly")
            : entry.mistakeReason === "too_late"
              ? t("game.tooLate")
              : t("game.wrongType")
          : t("history.round", { count: index + 1 })}
      </Text>

      {/* AI display */}
      <View style={styles.iconSection}>
        <Text style={[styles.sideLabel, { color: colors.textTertiary }]}>
          {t("history.ai")}
        </Text>
        {entry.type === "round" && entry.directionRound ? (
          <FontAwesome5
            name={DIRECTION_ICONS[entry.directionRound.aiDirection]}
            size={28}
            color={colors.text}
          />
        ) : (
          <FontAwesome5
            name={CHOICE_ICONS[entry.aiChoice]}
            size={28}
            color={colors.text}
          />
        )}
      </View>

      <Text style={[styles.vs, { color: colors.textTertiary }]}>
        {t("game.vs")}
      </Text>

      {/* Player display */}
      <View style={styles.iconSection}>
        {isMistake ? (
          entry.playerDirection ? (
            <FontAwesome5
              name={DIRECTION_ICONS[entry.playerDirection]}
              size={28}
              color={colors.warning}
            />
          ) : entry.playerChoice ? (
            <FontAwesome5
              name={CHOICE_ICONS[entry.playerChoice]}
              size={28}
              color={colors.warning}
            />
          ) : (
            <Text style={[styles.mistakeEmpty, { color: colors.textTertiary }]}>
              {"—"}
            </Text>
          )
        ) : entry.type === "round" && entry.directionRound ? (
          <FontAwesome5
            name={DIRECTION_ICONS[entry.directionRound.playerDirection]}
            size={28}
            color={entry.directionRound.matched ? colors.exercise : colors.warning}
          />
        ) : (
          <FontAwesome5
            name={CHOICE_ICONS[entry.playerChoice]}
            size={28}
            color={entry.roundResult === "win" ? colors.exercise : entry.roundResult === "lose" ? colors.warning : colors.text}
          />
        )}
        <Text style={[styles.sideLabel, { color: colors.textTertiary }]}>
          {t("history.you")}
        </Text>
      </View>

      {/* Beat ticks */}
      <View style={styles.beatRow}>
        {PHASE_LABELS.slice(0, beatCount).map((label, i) => (
          <View key={label} style={styles.beatTick}>
            <View style={[styles.tickLine, { backgroundColor: i === beatCount - 1 ? colors.text : colors.border }]} />
            <Text style={[styles.tickLabel, { color: i === beatCount - 1 ? colors.text : colors.textTertiary }]}>
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: 16,
    alignItems: "center",
  },
  itemWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  separator: {
    width: 1,
    height: 120,
    borderLeftWidth: 1,
    borderStyle: "dashed",
    marginHorizontal: 8,
  },
  item: {
    width: 140,
    alignItems: "center",
    gap: 6,
    paddingVertical: 16,
  },
  roundLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  iconSection: {
    alignItems: "center",
    gap: 2,
    minHeight: 48,
    justifyContent: "center",
  },
  sideLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
  vs: {
    fontSize: 14,
    fontWeight: "600",
  },
  mistakeEmpty: {
    fontSize: 28,
    fontWeight: "300",
    lineHeight: 34,
  },
  beatRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  beatTick: {
    alignItems: "center",
    gap: 2,
  },
  tickLine: {
    width: 2,
    height: 12,
    borderRadius: 1,
  },
  tickLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
});
