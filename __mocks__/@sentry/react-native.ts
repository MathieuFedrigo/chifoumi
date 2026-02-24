import * as React from "react";

export const init = jest.fn();
export const captureException = jest.fn();
export const captureMessage = jest.fn();
export const addBreadcrumb = jest.fn();
export const setTag = jest.fn();
export const setContext = jest.fn();
export const setUser = jest.fn();

export const wrap = jest.fn((component: React.ComponentType) => component);

export const ErrorBoundary = jest.fn(({ children }: { children: React.ReactNode }) => children);

export const mobileReplayIntegration = jest.fn();
export const reactNavigationIntegration = jest.fn(() => ({
  registerNavigationContainer: jest.fn(),
}));
export const reactNativeTracingIntegration = jest.fn();
