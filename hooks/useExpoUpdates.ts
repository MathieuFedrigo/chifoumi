import { useEffect } from "react";
import * as Updates from "expo-updates";
import { useUpdates } from "expo-updates";
import * as Sentry from "@sentry/react-native";

export function useExpoUpdates() {
  const { isUpdatePending } = useUpdates();

  useEffect(() => {
    // Skip in development mode
    if (__DEV__) {
      return;
    }

    // Phase 1: On cold start, if update is already downloaded, apply it immediately
    if (isUpdatePending) {
      Updates.reloadAsync();
      return;
    }

    // Phase 2: Check and download updates silently in background
    async function checkAndDownload() {
      try {
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          // Download silently in background (non-blocking)
          await Updates.fetchUpdateAsync();
          // Don't reload here - wait for next cold start
        }
      } catch (error) {
        Sentry.captureException(error, {
          tags: { component: "expo_updates" },
          level: "warning", // Not critical - retries next launch
          contexts: {
            update_check: {
              isUpdatePending,
              environment: /* istanbul ignore next */ __DEV__ ? "development" : "production",
            },
          },
        });
        // Silent failure - don't interrupt user experience
      }
    }

    checkAndDownload();
  }, [isUpdatePending]);
}
