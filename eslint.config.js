// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const tseslint = require('@typescript-eslint/eslint-plugin');
const i18nextPlugin = require('eslint-plugin-i18next');

module.exports = defineConfig([
  expoConfig,
  {
    plugins: {
      'react-compiler': require('eslint-plugin-react-compiler'),
      '@typescript-eslint': tseslint,
    },
    rules: {
      'react-compiler/react-compiler': 'error',
      // Prevent usage of 'any' type everywhere
      '@typescript-eslint/no-explicit-any': 'error',
    }
  },
  {
    // Enforce localization in source files only (not tests/mocks/config)
    files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'hooks/**/*.{ts,tsx}', 'store/**/*.{ts,tsx}'],
    plugins: {
      'i18next': i18nextPlugin,
    },
    rules: {
      // All user-visible strings in JSX must use t() from useTranslation()
      'i18next/no-literal-string': ['error', {
        mode: 'jsx-only',
        // Only check these visible string attributes (not style/icon/control props)
        'jsx-attributes': {
          include: ['accessibilityLabel', 'accessibilityHint', 'placeholder'],
        },
      }],
    },
  },
  {
    ignores: ['dist/*'],
  },
]);
