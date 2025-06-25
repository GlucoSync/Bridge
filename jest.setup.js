// Jest setup file

// Mock console.warn to avoid excessive warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
