module.exports = {
  Platform: {
    OS: "android", // Changed to android for testing streaming features
    Version: "12.0",
  },
  NativeModules: {
    RCTAppleHealthKit: {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    XDripReceiver: {
      startListening: jest.fn().mockResolvedValue(true),
      stopListening: jest.fn().mockResolvedValue(true),
      isListening: jest.fn().mockResolvedValue(false),
    },
  },
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    removeListener: jest.fn(),
  })),
  DeviceEventEmitter: {
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
  },
};
