import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "./storage";
import type { GameMode } from "@/store/gameStore";

export type ThemeMode = "light" | "dark" | "system";
export type LocaleMode = "system" | "en" | "fr";

interface AppActions {
  cycleThemeMode: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  setLocaleMode: (mode: LocaleMode) => void;
  setAiGuessEnabled: (enabled: boolean) => void;
  updateHighScore: (mode: GameMode, score: number) => void;
}

interface AppState {
  themeMode: ThemeMode;
  localeMode: LocaleMode;
  aiGuessEnabled: boolean;
  highScores: Record<GameMode, number>;
  actions: AppActions;
}

const THEME_CYCLE: ThemeMode[] = ["light", "system", "dark"];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      themeMode: "system",
      localeMode: "system",
      aiGuessEnabled: false,
      highScores: { classic: 0, directions: 0, countdown: 0, countdownDirections: 0 },

      actions: {
        cycleThemeMode: () => {
          const current = get().themeMode;
          const idx = THEME_CYCLE.indexOf(current);
          const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length] ?? /* istanbul ignore next */ "system";
          set({ themeMode: next });
        },

        setThemeMode: (mode) => set({ themeMode: mode }),
        setLocaleMode: (mode) => set({ localeMode: mode }),
        setAiGuessEnabled: (enabled) => set({ aiGuessEnabled: enabled }),

        updateHighScore: (mode, score) => {
          if (score > get().highScores[mode]) {
            set((state) => ({ highScores: { ...state.highScores, [mode]: score } }));
          }
        },
      },
    }),
    {
      name: "app-storage",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        themeMode: state.themeMode,
        localeMode: state.localeMode,
        aiGuessEnabled: state.aiGuessEnabled,
        highScores: state.highScores,
      }),
    }
  )
);

export const useAppStoreActions = () => useAppStore((s) => s.actions);
