module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)"
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^expect/build/matchers$": "<rootDir>/__mocks__/expect-matchers.js",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  clearMocks: true,
  restoreMocks: true,
  coveragePathIgnorePatterns: ["/node_modules/", "<rootDir>/locales/", "<rootDir>/i18n\\.ts", "<rootDir>/types/"],
  collectCoverageFrom: [
    "**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!locales/**",
    "!i18n.ts",
    "!types/**",
    "!jest.config.ts",
    "!jest.setup.ts",
    "!hooks/useReducedMotion.ts",
    "!**/__mocks__/**",
  ],
};
