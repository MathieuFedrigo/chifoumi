export const Orientation = {
  UNKNOWN: 0,
  PORTRAIT_UP: 1,
  PORTRAIT_DOWN: 2,
  LANDSCAPE_LEFT: 3,
  LANDSCAPE_RIGHT: 4,
};

export const OrientationLock = {
  DEFAULT: 0,
  PORTRAIT_UP: 1,
  PORTRAIT_DOWN: 2,
  LANDSCAPE_LEFT: 3,
  LANDSCAPE_RIGHT: 4,
  PORTRAIT: 5,
  LANDSCAPE: 6,
};

export const getOrientationAsync = jest.fn().mockResolvedValue(0);
export const addOrientationChangeListener = jest.fn().mockReturnValue({
  remove: jest.fn(),
});
export const lockAsync = jest.fn().mockResolvedValue(undefined);
export const unlockAsync = jest.fn().mockResolvedValue(undefined);
