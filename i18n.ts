import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import en from "@/locales/en";
import fr from "@/locales/fr";

const deviceLocale = getLocales()[0]?.languageCode /* istanbul ignore next */ ?? "en";

// i18next v25 emits a promotional console.info("🌐 ...") directly — not via its logger plugin.
// Filter it out here before init runs.
/* istanbul ignore next */
const _consoleInfo = console.info.bind(console);
/* istanbul ignore next */
console.info = (...args: unknown[]) => {
  if (typeof args[0] === "string" && args[0].includes("🌐")) return;
  _consoleInfo(...args);
};

// eslint-disable-next-line import/no-named-as-default-member -- default instance's .use() is the correct i18next pattern.
i18n.use(initReactI18next).init({
  lng: deviceLocale,
  fallbackLng: "en",
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  interpolation: { escapeValue: false },
});

export default i18n;
