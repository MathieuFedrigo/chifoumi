import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "./storage";

export type ThemeMode = "light" | "dark" | "system";
export type LocaleMode = "system" | "en" | "fr";

interface AppActions {
  cycleThemeMode: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  setLocaleMode: (mode: LocaleMode) => void;
}

interface AppState {
  themeMode: ThemeMode;
  localeMode: LocaleMode;
  actions: AppActions;
}

const THEME_CYCLE: ThemeMode[] = ["light", "system", "dark"];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      themeMode: "system",
      localeMode: "system",

      actions: {
        cycleThemeMode: () => {
          const current = get().themeMode;
          const idx = THEME_CYCLE.indexOf(current);
          const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length] ?? "system";
          set({ themeMode: next });
        },

        setThemeMode: (mode) => set({ themeMode: mode }),
        setLocaleMode: (mode) => set({ localeMode: mode }),
      },
    }),
    {
      name: "app-storage",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        themeMode: state.themeMode,
        localeMode: state.localeMode,
      }),
    }
  )
);

export const useAppStoreActions = () => useAppStore((s) => s.actions);
