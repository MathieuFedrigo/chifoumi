import type en from "./en";

type DeepString<T> = {
  [K in keyof T]: T[K] extends object ? DeepString<T[K]> : string;
};

export default {
  example: { hello: "Bonjour" },
} satisfies DeepString<typeof en>;
