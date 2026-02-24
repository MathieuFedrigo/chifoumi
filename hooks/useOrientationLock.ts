import { useEffect } from "react";
import * as ScreenOrientation from "expo-screen-orientation";
import * as Sentry from "@sentry/react-native";

/**
 * Hook to lock device orientation based on fullscreen state.
 * Locks to portrait when not fullscreen, allows rotation when fullscreen.
 */
export const useOrientationLock = (isFullscreen: boolean) => {
  useEffect(() => {
    const lockOrientation = async () => {
      try {
        if (isFullscreen) {
          // Allow all orientations when fullscreen
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.DEFAULT
          );
        } else {
          // Lock to portrait when not fullscreen
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.PORTRAIT_UP
          );
        }
      } catch (error) {
        Sentry.captureException(error, {
          tags: { component: "orientation_lock" },
          level: "warning", // Not critical - app.json fallback exists
          contexts: {
            orientation: {
              isFullscreen,
              requestedLock: isFullscreen ? "DEFAULT" : "PORTRAIT_UP",
            },
          },
        });
        console.warn("Failed to lock screen orientation:", error);
      }
    };

    lockOrientation();

    // Cleanup: Always lock back to portrait on unmount
    return () => {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      ).catch((error) => {
        Sentry.captureException(error, {
          tags: { component: "orientation_unlock" },
          level: "warning",
          contexts: {
            orientation: {
              action: "cleanup_restore_portrait",
            },
          },
        });
        console.warn("Failed to restore portrait orientation:", error);
      });
    };
  }, [isFullscreen]);
};
