import { renderHook, act } from "@testing-library/react-native";
import { useExpoUpdates } from "@/hooks/useExpoUpdates";
import * as Updates from "expo-updates";
import * as Sentry from "@sentry/react-native";

describe("useExpoUpdates", () => {
  describe("when __DEV__ is true", () => {
    it("returns early without calling Updates", async () => {
      // __DEV__ is true by default in Jest
      renderHook(() => useExpoUpdates());
      await act(async () => {});

      expect(Updates.reloadAsync).not.toHaveBeenCalled();
      expect(Updates.checkForUpdateAsync).not.toHaveBeenCalled();
    });
  });

  describe("when __DEV__ is false", () => {
    beforeEach(() => {
      // @ts-ignore
      global.__DEV__ = false;
      (Updates.useUpdates as jest.Mock).mockReturnValue({ isUpdatePending: false });
    });

    afterEach(() => {
      // @ts-ignore
      global.__DEV__ = true;
    });

    it("calls reloadAsync when update is pending", async () => {
      (Updates.useUpdates as jest.Mock).mockReturnValue({ isUpdatePending: true });

      renderHook(() => useExpoUpdates());
      await act(async () => {});

      expect(Updates.reloadAsync).toHaveBeenCalled();
      expect(Updates.checkForUpdateAsync).not.toHaveBeenCalled();
    });

    it("checks for updates and does not fetch when none available", async () => {
      (Updates.checkForUpdateAsync as jest.Mock).mockResolvedValue({ isAvailable: false });

      renderHook(() => useExpoUpdates());
      await act(async () => {});

      expect(Updates.checkForUpdateAsync).toHaveBeenCalled();
      expect(Updates.fetchUpdateAsync).not.toHaveBeenCalled();
    });

    it("fetches update when one is available", async () => {
      (Updates.checkForUpdateAsync as jest.Mock).mockResolvedValue({ isAvailable: true });
      (Updates.fetchUpdateAsync as jest.Mock).mockResolvedValue(undefined);

      renderHook(() => useExpoUpdates());
      await act(async () => {});

      expect(Updates.fetchUpdateAsync).toHaveBeenCalled();
    });

    it("captures exception via Sentry when checkForUpdateAsync throws", async () => {
      const error = new Error("Network error");
      (Updates.checkForUpdateAsync as jest.Mock).mockRejectedValue(error);

      renderHook(() => useExpoUpdates());
      await act(async () => {});

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: { component: "expo_updates" },
        })
      );
    });
  });
});
