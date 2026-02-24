import { useState, useEffect } from "react";
import * as ScreenOrientation from "expo-screen-orientation";

/**
 * Hook to track the current screen orientation direction.
 * Returns the Orientation enum value (e.g., LANDSCAPE_LEFT, LANDSCAPE_RIGHT).
 */
export const useOrientation = (): ScreenOrientation.Orientation => {
  const [orientation, setOrientation] = useState(
    ScreenOrientation.Orientation.UNKNOWN
  );

  useEffect(() => {
    ScreenOrientation.getOrientationAsync().then(setOrientation);

    const subscription = ScreenOrientation.addOrientationChangeListener(
      (event) => {
        setOrientation(event.orientationInfo.orientation);
      }
    );

    return () => subscription.remove();
  }, []);

  return orientation;
};
