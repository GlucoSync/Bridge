module.exports = {
  Platform: {
    OS: "ios",
    Version: "14.0",
  },
  NativeModules: {
    RCTAppleHealthKit: {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
  },
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    removeListener: jest.fn(),
  })),
};
