import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { FontAwesome5 } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useGameStore, useGameStoreActions } from "@/store/gameStore";
import { getRoundTimings } from "@/lib/rhythmDifficulty";
import { useGameLoop } from "@/hooks/useGameLoop";
import type { Choice } from "@/store/gameStore";
import type { ComponentProps } from "react";

type IconName = ComponentProps<typeof FontAwesome5>["name"];

const CHOICE_ICONS: Record<Choice, IconName> = {
  rock: "hand-rock",
  paper: "hand-paper",
  scissors: "hand-scissors",
};

export default function GameScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  useGameLoop();

  const phase = useGameStore((s) => s.phase);
  const score = useGameStore((s) => s.score);
  const isPlaying = useGameStore((s) => s.isPlaying);
  const playerChoice = useGameStore((s) => s.playerChoice);
  const aiChoice = useGameStore((s) => s.aiChoice);
  const roundResult = useGameStore((s) => s.roundResult);
  const mistakeReason = useGameStore((s) => s.mistakeReason);
  const phaseStartedAt = useGameStore((s) => s.phaseStartedAt);
  const { startGame, makeChoice } = useGameStoreActions();

  useEffect(() => {
    startGame();
  }, []);

  const phaseBackground =
    phase === "rock"
      ? theme.colors.exerciseLight
      : phase === "paper"
        ? theme.colors.restLight
        : phase === "scissors"
          ? theme.colors.warningLight
          : theme.colors.background;

  const handleChoice = (choice: Choice) => {
    if (!isPlaying) return;
    const elapsed = Date.now() - phaseStartedAt;
    const timings = getRoundTimings(score);
    const inGracePeriod = phase === "paper" && elapsed >= timings.beatInterval - timings.graceBefore;
    if (phase === "scissors" || inGracePeriod) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    makeChoice(choice);
  };

  const phaseText =
    phase === "rock"
      ? t("game.rock")
      : phase === "paper"
        ? t("game.paper")
        : phase === "scissors"
          ? t("game.scissors")
          : "";

  const resultText =
    roundResult === "win"
      ? t("game.result.win")
      : roundResult === "lose"
        ? t("game.result.lose")
        : roundResult === "draw"
          ? t("game.result.draw")
          : "";

  const mistakeText =
    mistakeReason === "too_early"
      ? t("game.tooEarly")
      : mistakeReason === "too_late"
        ? t("game.tooLate")
        : "";

  const buttonsDisabled = phase !== "scissors" && isPlaying;
  const isGameOver = !isPlaying && !!mistakeReason;

  return (
    <View style={[styles.container, { backgroundColor: phaseBackground }]}>
      <View style={styles.topBar}>
        {isGameOver ? (
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t("game.goHome")}
          >
            <FontAwesome5 name="arrow-left" size={20} color={theme.colors.text} />
          </Pressable>
        ) : (
          <View style={styles.topBarSpacer} />
        )}
        <Text style={[styles.score, { color: theme.colors.text }]}>
          {t("game.score", { count: score })}
        </Text>
        <View style={styles.topBarSpacer} />
      </View>

      <View style={styles.center}>
        {phase === "result" ? (
          <View style={styles.resultContainer}>
            <Text style={[styles.resultText, { color: theme.colors.text }]}>
              {resultText}
            </Text>
            {playerChoice && aiChoice && (
              <View style={styles.choiceRow}>
                <View style={styles.choiceDisplay}>
                  <FontAwesome5
                    name={CHOICE_ICONS[playerChoice]}
                    size={48}
                    color={theme.colors.text}
                  />
                  <Text style={[styles.choiceLabel, { color: theme.colors.textSecondary }]}>
                    {t(`game.${playerChoice}` as "game.rock" | "game.paper" | "game.scissors")}
                  </Text>
                </View>
                <Text style={[styles.vs, { color: theme.colors.textTertiary }]}>
                  {/* eslint-disable-next-line i18next/no-literal-string */}
                  {"vs"}
                </Text>
                <View style={styles.choiceDisplay}>
                  <FontAwesome5
                    name={CHOICE_ICONS[aiChoice]}
                    size={48}
                    color={theme.colors.text}
                  />
                  <Text style={[styles.choiceLabel, { color: theme.colors.textSecondary }]}>
                    {t(`game.${aiChoice}` as "game.rock" | "game.paper" | "game.scissors")}
                  </Text>
                </View>
              </View>
            )}
          </View>
        ) : isPlaying ? (
          <Text style={[styles.phaseText, { color: theme.colors.text }]}>
            {phaseText}
          </Text>
        ) : mistakeReason ? (
          <View style={styles.gameOver}>
            <Text style={[styles.gameOverTitle, { color: theme.colors.warning }]}>
              {t("game.gameOver")}
            </Text>
            <Text style={[styles.mistakeText, { color: theme.colors.textSecondary }]}>
              {mistakeText}
            </Text>
            <Text style={[styles.finalScore, { color: theme.colors.text }]}>
              {t("game.finalScore", { count: score })}
            </Text>
            <Pressable
              style={[styles.actionButton, { backgroundColor: theme.colors.button }]}
              onPress={startGame}
              accessibilityRole="button"
              accessibilityLabel={t("game.restart")}
            >
              <Text style={[styles.actionButtonText, { color: theme.colors.buttonTint }]}>
                {t("game.restart")}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.choiceButtons}>
        {/* eslint-disable-next-line i18next/no-literal-string */}
        {(["rock", "paper", "scissors"] as const).map((choice) => (
          <Pressable
            key={choice}
            style={[
              styles.choiceButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                opacity: buttonsDisabled ? 0.4 : 1,
              },
            ]}
            onPress={() => handleChoice(choice)}
            accessibilityRole="button"
            accessibilityLabel={t(`game.${choice}` as "game.rock" | "game.paper" | "game.scissors")}
          >
            <FontAwesome5
              name={CHOICE_ICONS[choice]}
              size={40}
              color={theme.colors.text}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  topBarSpacer: {
    width: 20,
  },
  score: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  phaseText: {
    fontSize: 64,
    fontWeight: "900",
  },
  resultContainer: {
    alignItems: "center",
    gap: 16,
  },
  resultText: {
    fontSize: 36,
    fontWeight: "800",
  },
  choiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  choiceDisplay: {
    alignItems: "center",
    gap: 4,
  },
  choiceLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  vs: {
    fontSize: 18,
    fontWeight: "600",
  },
  gameOver: {
    alignItems: "center",
    gap: 12,
  },
  gameOverTitle: {
    fontSize: 32,
    fontWeight: "900",
  },
  mistakeText: {
    fontSize: 18,
    fontWeight: "500",
  },
  finalScore: {
    fontSize: 24,
    fontWeight: "700",
  },
  actionButton: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 24,
    fontWeight: "700",
  },
  choiceButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
  },
  choiceButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
});
