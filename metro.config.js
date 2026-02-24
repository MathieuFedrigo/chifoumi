const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);

// Disable package.json exports to force CommonJS resolution
// This fixes Zustand's ESM middleware using import.meta which fails on web
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
