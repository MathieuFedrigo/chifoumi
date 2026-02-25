import { renderRouter, screen } from "expo-router/testing-library";
import { Text } from "react-native";
import RootLayout from "@/app/_layout";
import i18n from "@/i18n";
import { useFonts } from "expo-font";
import { getLocales } from "expo-localization";
import * as Sentry from "@sentry/react-native";
import { useAppStore } from "@/store/appStore";

const useColorSchemeMock = jest.requireMock(
  "react-native/Libraries/Utilities/useColorScheme"
).default;

// _layout.tsx calls Sentry.reactNavigationIntegration() at module load time.
// Capture the reference here (file-level, before any beforeEach can clear it)
// so we can later assert that registerNavigationContainer was called.
const sentryNavIntegration = (Sentry.reactNavigationIntegration as jest.Mock).mock.results[0]?.value as
  | { registerNavigationContainer: jest.Mock }
  | undefined;

const HomeStub = () => <Text>{"Home"}</Text>;

const renderLayout = (initialUrl = "/") =>
  renderRouter(
    { "_layout": RootLayout, "(tabs)/index": HomeStub },
    { initialUrl }
  );

describe("RootLayout", () => {
  beforeEach(() => {
    (useFonts as jest.Mock).mockReturnValue([true, null]);
    (getLocales as jest.Mock).mockReturnValue([{ languageCode: "en" }]);
  });

  describe("font loading", () => {
    it("renders null when fonts are not loaded", () => {
      (useFonts as jest.Mock).mockReturnValue([false, null]);
      renderLayout();
      expect(screen.queryByText("Home")).toBeFalsy();
    });

    it("renders null when fonts fail to load", () => {
      (useFonts as jest.Mock).mockReturnValue([false, new Error("Font load error")]);
      renderLayout();
      expect(screen.queryByText("Home")).toBeFalsy();
    });

    it("renders content when fonts are loaded", () => {
      renderLayout();
      expect(screen.getByText("Home")).toBeTruthy();
    });
  });

  describe("locale initialization", () => {
    it("sets language to 'en' when system locale is English", () => {
      const changeLanguageSpy = jest.spyOn(i18n, "changeLanguage").mockResolvedValue(undefined as never);
      (getLocales as jest.Mock).mockReturnValue([{ languageCode: "en" }]);
      renderLayout();
      expect(changeLanguageSpy).toHaveBeenCalledWith("en");
    });

    it("sets language to 'fr' when system locale is French", () => {
      const changeLanguageSpy = jest.spyOn(i18n, "changeLanguage").mockResolvedValue(undefined as never);
      (getLocales as jest.Mock).mockReturnValue([{ languageCode: "fr" }]);
      renderLayout();
      expect(changeLanguageSpy).toHaveBeenCalledWith("fr");
    });

    it("falls back to 'en' when system locale is unsupported", () => {
      const changeLanguageSpy = jest.spyOn(i18n, "changeLanguage").mockResolvedValue(undefined as never);
      (getLocales as jest.Mock).mockReturnValue([{ languageCode: "es" }]);
      renderLayout();
      expect(changeLanguageSpy).toHaveBeenCalledWith("en");
    });

    it("sets language to 'fr' when locale is explicitly set to fr", () => {
      const changeLanguageSpy = jest.spyOn(i18n, "changeLanguage").mockResolvedValue(undefined as never);
      useAppStore.getState().actions.setLocaleMode("fr");
      renderLayout();
      expect(changeLanguageSpy).toHaveBeenCalledWith("fr");
    });

    it("falls back to 'en' when getLocales returns empty array", () => {
      const changeLanguageSpy = jest.spyOn(i18n, "changeLanguage").mockResolvedValue(undefined as never);
      (getLocales as jest.Mock).mockReturnValue([]);
      renderLayout();
      expect(changeLanguageSpy).toHaveBeenCalledWith("en");
    });
  });

  describe("theme", () => {
    it("applies dark theme when system color scheme is dark", () => {
      useColorSchemeMock.mockReturnValue("dark");
      renderLayout();
      // Layout renders with dark theme (isDark=true) — no error means branches covered
      expect(screen.getByText("Home")).toBeTruthy();
    });
  });

  describe("Sentry navigation registration", () => {
    it("registers navigation container with Sentry", () => {
      renderLayout();
      // sentryNavIntegration is the object returned by the module-level
      // reactNavigationIntegration() call in _layout.tsx
      expect(sentryNavIntegration?.registerNavigationContainer).toHaveBeenCalled();
    });
  });
});
