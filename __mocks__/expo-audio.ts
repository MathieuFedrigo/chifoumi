export const useAudioPlayer = jest.fn(() => ({
  play: jest.fn(),
  seekTo: jest.fn(),
  pause: jest.fn(),
  replace: jest.fn(),
}));

export const useAudioRecorder = jest.fn(() => ({
  record: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  isRecording: false,
  isPaused: false,
  duration: 0,
}));

export const AudioPlayer = jest.fn();
export const AudioRecorder = jest.fn();

export const setAudioModeAsync = jest.fn().mockResolvedValue(undefined);
