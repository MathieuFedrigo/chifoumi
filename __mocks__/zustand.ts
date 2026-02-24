import { act } from "react";
import type * as ZustandExportedTypes from "zustand";

// Capture the actual implementations
const { create: actualCreate, createStore: actualCreateStore } =
  jest.requireActual<typeof ZustandExportedTypes>("zustand");

// A set to hold reset functions for all stores declared in the app
export const storeResetFns = new Set<() => void>();

const createUncurried = <T>(
  stateCreator: ZustandExportedTypes.StateCreator<T>,
) => {
  const store = actualCreate(stateCreator);
  const initialState = store.getInitialState();
  storeResetFns.add(() => {
    store.setState(initialState, true);
  });
  return store;
};

// Wrap create to capture initial state and provide reset
export const create: typeof ZustandExportedTypes.create = (<T>(
  stateCreator: ZustandExportedTypes.StateCreator<T>,
) => {
  // Support curried version of create
  return typeof stateCreator === "function"
    ? createUncurried(stateCreator)
    : createUncurried;
}) as typeof ZustandExportedTypes.create;

const createStoreUncurried = <T>(
  stateCreator: ZustandExportedTypes.StateCreator<T>,
) => {
  const store = actualCreateStore(stateCreator);
  const initialState = store.getInitialState();
  storeResetFns.add(() => {
    store.setState(initialState, true);
  });
  return store;
};

// Wrap createStore to capture initial state and provide reset
export const createStore: typeof ZustandExportedTypes.createStore = (<T>(
  stateCreator: ZustandExportedTypes.StateCreator<T>,
) => {
  // Support curried version of createStore
  return typeof stateCreator === "function"
    ? createStoreUncurried(stateCreator)
    : createStoreUncurried;
}) as typeof ZustandExportedTypes.createStore;

// Reset all stores after each test
afterEach(() => {
  act(() => {
    storeResetFns.forEach((resetFn) => {
      resetFn();
    });
  });
});
