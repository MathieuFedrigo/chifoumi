export enum NotificationFeedbackType {
  Success = "success",
  Warning = "warning",
  Error = "error",
}

export enum ImpactFeedbackStyle {
  Light = "light",
  Medium = "medium",
  Heavy = "heavy",
}

export const notificationAsync = jest.fn();
export const impactAsync = jest.fn();
export const selectionAsync = jest.fn();
