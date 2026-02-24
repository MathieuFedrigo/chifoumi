import { useWindowDimensions } from "react-native";

/**
 * Hook to detect if the device is in landscape orientation.
 * Returns true when width > height.
 */
export const useIsLandscape = (): boolean => {
  const { width, height } = useWindowDimensions();
  return width > height;
};
