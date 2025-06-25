module.exports = {
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
    "^.+\\.(js|jsx)$": "babel-jest",
  },
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(ts|tsx)$",
  collectCoverage: true,
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts"],
  coverageDirectory: "coverage",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^react-native$": "<rootDir>/__mocks__/react-native.js",
    "^react-native-health$": "<rootDir>/__mocks__/react-native-health.js",
    "^react-native-health-connect$":
      "<rootDir>/__mocks__/react-native-health-connect.js",
  },
  transformIgnorePatterns: ["node_modules/(?!(react-native|@react-native)/)"],
};
