import mockSafeAreaContext from "react-native-safe-area-context/jest/mock";

// Mock react-native-nitro-modules to prevent TurboModule import crash
// This allows react-native-mmkv's built-in Jest mock to activate automatically
jest.mock("react-native-nitro-modules", () => ({}));

// Mock react-native-safe-area-context
jest.mock("react-native-safe-area-context", () => mockSafeAreaContext);

// Mock useColorScheme for dark mode tests
jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  default: jest.fn(() => "light"),
}));

// Mock useWindowDimensions for orientation tests (portrait by default)
jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  default: jest.fn(() => ({ width: 375, height: 812 })),
}));

// Mock useReducedMotion wrapper as a controllable jest.fn
jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: jest.fn(() => false),
}));

// Use fake timers for all tests
jest.useFakeTimers();

// Suppress console.warn and console.error in tests to prevent output pollution
// Tests can still spy on these methods to verify they were called
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
