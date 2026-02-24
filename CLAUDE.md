# AGENTS.md

This file provides guidance for AI coding agents working in this repository.

## General

Always use Context7 MCP when I need library/API documentation, code generation, setup or configuration steps without me having to explicitly ask.

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.

## Code Style Guidelines

### TypeScript Configuration
- Strict mode enabled
- Path alias: `@/*` maps to `./*` (root directory)
- Always use TypeScript for new files

### Imports
- Use `@/` path alias for imports from project root:
  ```typescript
  import { useAppStore } from "@/store/appStore";
  import { theme } from "@/constants/theme";
  ```
- Order: React/Expo imports first, then third-party libraries, then local imports
- Use named exports/imports over default exports

### Naming Conventions
- **Components**: PascalCase (e.g., `HomeScreen.tsx`, `UserCard.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useTimer.ts`)
- **Types/Interfaces**: PascalCase (e.g., `AppState`, `UserProfile`)
- **Constants**: UPPER_SNAKE_CASE for true constants (e.g., `MAX_RETRIES`)
- **Files**: Match the primary export name (PascalCase for components)

### Formatting
- 2-space indentation
- Double quotes for strings
- Semicolons required
- No trailing commas in single-line, trailing commas in multi-line
- Max line length: follow existing patterns (~100 chars)

### Types & Interfaces
- Define explicit types for store state, function parameters, and return values
- Use union types for literal unions: `type Status = "idle" | "loading" | "error"`
- Prefer interfaces for object shapes, type aliases for unions/complex types
- Store types in the same file as the implementation

### State Management (Zustand)
- Store in `store/<name>Store.ts`
- Export store hook as `use<Name>Store`
- Keep state minimal, derive computed values in components
- Actions should be simple setters; complex logic in separate functions

#### Zustand Performance: Selective Subscriptions

**CRITICAL: Always use selective subscriptions to prevent unnecessary re-renders.**

**Pattern - Individual Selectors (ALWAYS use this):**
```typescript
// ✅ Correct - subscribe only to needed state
const themeMode = useAppStore((state) => state.themeMode);
const localeMode = useAppStore((state) => state.localeMode);
const setThemeMode = useAppStore((state) => state.setThemeMode);
```

**Derived Data Pattern:**
```typescript
// ✅ Correct - compute derived data in selector
const isDark = useAppStore((state) =>
  state.themeMode === "dark" || (state.themeMode === "system" && systemScheme === "dark")
);
```

**Anti-Pattern - Whole Store Subscription:**
```typescript
// ❌ NEVER do this - re-renders on ANY state change
const { themeMode, localeMode } = useAppStore();
```

**Why This Matters:**
- Whole-store subscriptions cause components to re-render on ANY state change
- Selective subscriptions = significantly fewer re-renders

**Zustand Equality Checking:**
- Individual selectors use `Object.is()` for equality (works for primitives, functions, arrays)
- Actions are stable (defined once), safe to select individually
- Derived data returning new objects/arrays may re-render if identity changes (acceptable trade-off)
- TypeScript infers types automatically from each selector

**When Refactoring:**
1. Identify what state/actions the component actually needs
2. Replace destructuring with individual selectors
3. Run tests to ensure behavior unchanged
4. Verify with React DevTools that re-renders reduced

### Component Patterns
- Functional components with hooks
- Use `StyleSheet.create()` for styles
- Access theme values from `@/constants/theme.ts`
- Keep components focused; extract logic to hooks or stores

### Testing

**CRITICAL: Maintain 100% test coverage at all times.**

#### Test Structure
- Test files: `__tests__/*.test.tsx`
- Use `@testing-library/react-native` and `expo-router/testing-library`
- Use `describe` blocks for grouping related tests
- Use `it` blocks for individual test cases
- Test behavior, not implementation details

#### User Interactions - userEvent API

**CRITICAL: Use `userEvent` for all user interactions (not `fireEvent`).**

`userEvent` is the officially recommended API for React Native Testing Library v13+ because it simulates realistic event sequences that match the React Native runtime.

**Basic Pattern:**
```typescript
import { render, screen, userEvent } from "@testing-library/react-native";

it("should handle user interaction", async () => {
  const user = userEvent.setup();
  render(<MyComponent />);

  // Press button
  await user.press(screen.getByText("Submit"));

  // Type text (automatically clears first)
  await user.clear(input);
  await user.type(input, "Hello");

  // Long press
  await user.longPress(screen.getByText("Delete"));
});
```

**Key Rules:**
- All userEvent calls return Promises → must `await`
- All test functions using userEvent must be `async`
- Call `const user = userEvent.setup();` at the start of each test
- `user.type()` types character-by-character (may need `user.clear()` first)
- `user.press()` has realistic delays (~130ms) but better confidence

**When to use fireEvent:**
Only for edge case tests where you need to set invalid values atomically (e.g., testing validation of "1000" when max is 999). Using `userEvent.type("1000")` would type "1", "10", "100", "1000" character-by-character, triggering validation at "100" (valid). Use `fireEvent.changeText()` to set the value atomically in these rare cases.

#### Test Selection & Assertions
- **Prefer text users can see** over testIDs when selecting elements
- Only use `testID` when there's no visible text alternative
- Use `screen.getByText()`, `screen.getByRole()` before `screen.getByTestId()`
- Use `expect().toBeTruthy()` and `expect().toBeFalsy()` for boolean assertions

#### Accessibility
- Add `accessibilityRole` to all interactive components (e.g., "button")
- Add `accessibilityLabel` to describe the element's purpose
- Add `accessibilityHint` for additional context (e.g., "Long press to delete")
- Use accessible queries in tests when possible: `getByRole("button", { name: "Submit" })`

#### Timers & `act()` Usage
- Fake timers are globally configured in `jest.setup.ts`
- **ONLY wrap `jest.advanceTimersByTime()` in `act()`**, never `userEvent`
- `userEvent` already includes `act()` internally - wrapping it is redundant
- userEvent works with fake timers automatically
- Example:
  ```typescript
  // ✅ Correct
  await user.press(button);
  act(() => {
    jest.advanceTimersByTime(1000);
  });

  // ❌ Wrong - userEvent doesn't need act()
  act(() => {
    await user.press(button);
  });
  ```

#### Zustand Store Testing
- **Never mock stores** - use the real store in all tests
- **Never interact with store directly** via `getState()`/`setState()` in tests
- Always interact via UI like a real user would
- Store state resets automatically between tests (configured in `__mocks__/zustand.ts`)
- **Exception**: Direct store access is allowed ONLY for testing defensive edge cases with no UI path (ask first)

#### Navigation Testing
- **Never mock expo-router**
- Use `expo-router/testing-library` for all navigation tests
- Use `testRouter.navigate()` to change routes
- Use `getPathname()` from `renderRouter` to assert current route

#### Coverage Requirements
- **100% coverage is mandatory** (statements, branches, functions, lines)
- If you add functionality, add tests immediately to maintain 100% coverage
- Run `npm run test:coverage` to verify coverage before committing
- Every new branch, condition, or function must be tested

#### Mocking

**Global Mocks (`__mocks__/` folder and `jest.setup.ts`):**
**IMPORTANT:** Never mock these libraries again in individual tests. Import them directly:
```typescript
import { setAudioModeAsync } from "expo-audio"; // Already mocked globally
(setAudioModeAsync as jest.Mock).mockResolvedValue(undefined);
```
**Jest Mock Configuration (`jest.config.ts`):**
- `clearMocks: true` - Automatically clears mock call history between tests
- `restoreMocks: true` - Automatically restores spies (`jest.spyOn()`) between tests
- These eliminate most manual cleanup needs

**Mock Reset Options:**
| Config                | What It Clears                 | Clears Implementations?  | Notes      |
|----------------------|--------------------------------|--------|------------------------------|
| `clearMocks: true`   | Call history, counts           | ❌ No  | Safe, use always             |
| `resetMocks: true`   | Call history + implementations | ✅ Yes | Dangerous - breaks ALL mocks |
| `restoreMocks: true` | Only `jest.spyOn()` spies      | N/A    | Safe, use always             |

**When Manual Hooks Are Still Needed:**
- When you change mock implementations in tests (e.g., `.mockRejectedValue()`)
- `clearMocks` doesn't reset implementations, only call history
- Use `beforeEach`/`afterEach` to restore implementations in those specific describe blocks
- Example:
  ```typescript
  describe("Error Handling", () => {
    beforeEach(() => {
      (myMock as jest.Mock).mockResolvedValue(defaultValue);
    });
    afterEach(() => {
      (myMock as jest.Mock).mockResolvedValue(defaultValue);
    });
    // ... tests that change mock behavior ...
  });
  ```

**Importing Mocked Functions:**
- Import mocked functions directly - they're already jest.Mock types
  ```typescript
  import { setAudioModeAsync } from "expo-audio";
  // No need for require() or reassignment
  (setAudioModeAsync as jest.Mock).mockResolvedValue(undefined);
  ```

**Mocking React Native APIs:**
- Mock React Native `Alert` for dialogs:
  ```typescript
  const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((title, msg, buttons) => {
    buttons?.find(b => b.style === "destructive")?.onPress?.();
  });
  // ... test code ...
  // No need for alertSpy.mockRestore() - restoreMocks handles it
  ```

### Error Handling
- Use TypeScript to prevent runtime errors where possible
- Validate edge cases in store logic
- No explicit try-catch needed for React Native UI errors

### Sentry Monitoring

**Overview**: This app uses Sentry for comprehensive error tracking, performance monitoring, and user behavior analysis.

#### What's Being Tracked

**Errors & Exceptions:**
- Initialization failures (tagged with relevant `component`)
- React component crashes (via ErrorBoundary)

**Performance:**
- Navigation timing and screen loads
- App start metrics
- Profiling data (50% in dev, 10% in prod)
- Session replays (10% in dev, 5% in prod, 100% on errors)

**User Behavior (Breadcrumbs):**
- User-initiated actions (button presses, form submissions, navigation)
- Settings changes (with old→new values)
- Theme changes

**User Context & Tags:**
- `Sentry.setTag("theme", mode)` - Updated when theme changes
- `Sentry.setContext("app_config", { ... })` - Updated when settings change

#### Adding Sentry to New Features

**Add breadcrumbs for user actions:**
```typescript
import * as Sentry from "@sentry/react-native";

// In store actions
myAction: () => {
  Sentry.addBreadcrumb({
    category: "feature",  // "settings", "navigation", etc.
    message: "User did something",
    level: "info",  // "info", "warning", "error"
    data: { key: "value" },  // Optional context
  });

  set({ /* state changes */ });
}
```

**Capture exceptions in try-catch blocks:**
```typescript
try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: { component: "feature_name" },
    level: "error",
  });
  // Handle gracefully
}
```

**Add tags for filtering:**
```typescript
Sentry.setTag("feature_enabled", true);
```

**Add context for debugging:**
```typescript
Sentry.setContext("feature_config", {
  setting1: value1,
  setting2: value2,
});
```

**Capture warnings (non-errors):**
```typescript
if (unexpectedCondition) {
  Sentry.captureMessage("Warning: unexpected condition", "warning");
}
```

#### Guidelines for Instrumentation

**DO:**
- ✅ Add breadcrumbs for all user-initiated actions
- ✅ Log state transitions and phase changes
- ✅ Capture exceptions with relevant tags and context
- ✅ Use descriptive messages and include old→new values for changes
- ✅ Set user context when loading/saving user data
- ✅ Update tags when persistent settings change

**DON'T:**
- ❌ Log every timer tick or high-frequency events (quota waste)
- ❌ Log personal or sensitive information
- ❌ Add instrumentation that affects app performance
- ❌ Create duplicate breadcrumbs (e.g., don't log in both action and caller)
- ❌ Use Sentry for analytics (use dedicated analytics tool instead)

#### Testing with Sentry

**Global Mock** (`__mocks__/@sentry/react-native.ts`):
All Sentry functions are mocked globally for tests:
- `init`, `captureException`, `captureMessage`, `addBreadcrumb`
- `setTag`, `setContext`, `setUser`
- `wrap`, `ErrorBoundary`
- `mobileReplayIntegration`, `reactNavigationIntegration`, `reactNativeTracingIntegration`

**In Tests:**
```typescript
import * as Sentry from "@sentry/react-native";

// Sentry calls are automatically mocked, no need to verify them
// Just test that your feature works correctly
// Don't couple tests to Sentry implementation details
```

**Note:** Sentry has quota limits on free tier. Be mindful of high-frequency events.

### Constants & Theming

**CRITICAL: Always use dynamic theming with the `useTheme()` hook.**

#### Theme System
- Two themes: `lightTheme` and `darkTheme` in `@/constants/theme.ts`
- User can choose: "light", "dark", or "system" (follows OS preference)
- Theme preference stored in `appStore.themeMode` and persisted to MMKV

#### Using Themes in Components
```typescript
// ✅ Correct - use useTheme() hook for dynamic colors
import { useTheme } from "@/hooks/useTheme";

export const MyComponent = () => {
  const theme = useTheme();

  return (
    <View style={{ backgroundColor: theme.colors.background }}>
      <Text style={{ color: theme.colors.text }}>Hello</Text>
    </View>
  );
};

// ❌ Wrong - don't import theme directly (won't switch with dark mode)
import { theme } from "@/constants/theme";
```

#### Theme Testing
- `useColorScheme` is globally mocked in `jest.setup.ts`
- Access mock: `jest.requireMock("react-native/Libraries/Utilities/useColorScheme").default`
- Test both light and dark modes when adding UI components
- Verify theme changes with `useAppStore.getState().cycleThemeMode()`

#### Adding New Theme Colors
1. Add to `Theme` interface in `constants/theme.ts`
2. Add to both `lightTheme` and `darkTheme` objects
3. Update dark mode tests to include in `requiredColors` array
4. Use semantic names that describe purpose, not appearance

### Localization

**CRITICAL: Every user-visible string in JSX must use `t()` — never raw string literals.**

- Translation files: `locales/en.ts` (English) and `locales/fr.ts` (French)

#### Usage
```typescript
import { useTranslation } from "react-i18next";

export const MyComponent = () => {
  const { t } = useTranslation();

  return (
    // ✅ Correct - localized string
    <Text>{t("my.key")}</Text>

    // ✅ Correct - localized attribute
    <TextInput placeholder={t("search.placeholder")} />

    // ❌ Wrong - raw string literal in JSX
    <Text>Hello</Text>
  );
};
```

#### Attribute Exceptions (non-visible, no translation needed)
The following attributes are excluded from the lint rule and must NOT be translated:
`testID`, `accessibilityRole`, `key`, `style`, `href`, `source`, `name`, `id`, `className`, `type`

Attributes that ARE visible and MUST be translated:
`accessibilityLabel`, `accessibilityHint`, `placeholder`

### Adding Tests
1. Create `__tests__/Feature.test.tsx` in the `__tests__/` directory
2. Import components using path aliases: `@/components/ComponentName`
3. Structure tests with `describe` blocks for features and `it` blocks for cases
4. Use `renderRouter()` from `expo-router/testing-library` for routing tests
5. Select elements by visible text first: `screen.getByText("Button Text")`
6. Use `userEvent` for all user interactions (press, type, longPress)
7. Make test functions `async` and `await` all userEvent calls
8. Use `act()` ONLY for `jest.advanceTimersByTime()`
9. Assert with `expect().toBeTruthy()` / `expect().toBeFalsy()` / `expect().toBe()`
10. Run `npm run test:coverage` to verify 100% coverage is maintained
11. Never access store directly unless testing defensive edge case (ask first)

Example test structure:
```typescript
import { renderRouter, screen, userEvent, act } from "expo-router/testing-library";
import MyComponent from "@/components/MyComponent";

describe("My Feature", () => {
  it("should do something when user interacts", async () => {
    const user = userEvent.setup();
    renderRouter({ "(tabs)/index": MyComponent }, { initialUrl: "/" });

    // Interact via UI
    await user.press(screen.getByText("Click Me"));

    // Advance timers if needed
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Assert visible outcome
    expect(screen.getByText("Success")).toBeTruthy();
  });
});
```
