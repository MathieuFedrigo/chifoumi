import { zustandStorage } from "@/store/storage";

describe("zustandStorage", () => {
  it("sets and gets a value", () => {
    zustandStorage.setItem("test-key", "test-value");
    expect(zustandStorage.getItem("test-key")).toBe("test-value");
  });

  it("returns null for missing key", () => {
    expect(zustandStorage.getItem("nonexistent")).toBeNull();
  });

  it("removes a value", () => {
    zustandStorage.setItem("to-remove", "value");
    zustandStorage.removeItem("to-remove");
    expect(zustandStorage.getItem("to-remove")).toBeNull();
  });
});
