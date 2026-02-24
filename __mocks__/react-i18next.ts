import en from "@/locales/en";

function resolve(obj: Record<string, unknown>, key: string): string {
  const parts = key.split(".");
  let cur: unknown = obj;
  for (const part of parts) cur = (cur as Record<string, unknown>)?.[part];
  if (typeof cur === "string") return cur;
  // Plural fallback: try key + "_other"
  const otherKey = key + "_other";
  const parts2 = otherKey.split(".");
  let cur2: unknown = obj;
  for (const part of parts2) cur2 = (cur2 as Record<string, unknown>)?.[part];
  return typeof cur2 === "string" ? cur2 : key;
}

const t = (key: string, vars?: Record<string, unknown>) => {
  let str = resolve(en as unknown as Record<string, unknown>, key);
  if (vars) str = str.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? `{{${k}}}`));
  return str;
};

export const useTranslation = () => ({ t, i18n: { language: "en", changeLanguage: jest.fn() } });
export const Trans = ({ i18nKey }: { i18nKey: string }) => i18nKey;
export const initReactI18next = { type: "3rdParty", init: () => {} };
