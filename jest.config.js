module.exports = {
  preset: "react-native",
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|@react-native-async-storage|react-native-.*|@react-native-.*|expo|expo-.*|@expo|@expo/.*)/)",
  ],
};
