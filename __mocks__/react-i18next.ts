import en from "@/locales/en";

function resolveKey(obj: Record<string, unknown>, key: string): string | undefined {
  const parts = key.split(".");
  let cur: unknown = obj;
  for (const part of parts) cur = (cur as Record<string, unknown>)?.[part];
  return typeof cur === "string" ? cur : undefined;
}

function resolve(obj: Record<string, unknown>, key: string, count?: number): string {
  // Try plural form first when count is provided
  if (count !== undefined) {
    const pluralSuffix = count === 1 ? "_one" : "_other";
    const pluralResult = resolveKey(obj, key + pluralSuffix);
    if (pluralResult !== undefined) return pluralResult;
  }
  const direct = resolveKey(obj, key);
  if (direct !== undefined) return direct;
  // Fallback to _other
  const otherResult = resolveKey(obj, key + "_other");
  return otherResult ?? key;
}

const t = (key: string, vars?: Record<string, unknown>) => {
  const count = typeof vars?.count === "number" ? vars.count : undefined;
  let str = resolve(en as unknown as Record<string, unknown>, key, count);
  if (vars) str = str.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? `{{${k}}}`));
  return str;
};

export const useTranslation = () => ({ t, i18n: { language: "en", changeLanguage: jest.fn() } });
export const Trans = ({ i18nKey }: { i18nKey: string }) => i18nKey;
export const initReactI18next = { type: "3rdParty", init: () => {} };
