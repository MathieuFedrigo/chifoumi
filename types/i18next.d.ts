import type en from "@/locales/en";

type Leaves<T extends object, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends object
    ? Leaves<T[K], `${Prefix}${K}.`>
    : `${Prefix}${K}`;
}[keyof T & string];

export type TranslationKey = Leaves<typeof en>;

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: {
      translation: typeof en;
    };
  }
}
