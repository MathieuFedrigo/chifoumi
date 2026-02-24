export const checkForUpdateAsync = jest.fn();
export const fetchUpdateAsync = jest.fn();
export const reloadAsync = jest.fn();

// Mock useUpdates hook
export const useUpdates = jest.fn(() => ({
  isUpdatePending: false,
  isUpdateAvailable: false,
}));
