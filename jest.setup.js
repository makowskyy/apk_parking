require("@testing-library/jest-native/extend-expect");

if (!process.env.EXPO_PUBLIC_PLATE_RECOGNIZER_API_KEY) {
  process.env.EXPO_PUBLIC_PLATE_RECOGNIZER_API_KEY = "test-key";
}

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  return {
    SafeAreaView: ({ children }) => React.createElement("SafeAreaView", null, children),
    SafeAreaProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("expo-local-authentication", () => ({
  hasHardwareAsync: jest.fn(async () => false),
  isEnrolledAsync: jest.fn(async () => false),
  authenticateAsync: jest.fn(async () => ({ success: false })),
}));

jest.mock("expo-notifications", () => ({
  setNotificationChannelAsync: jest.fn(async () => {}),
  getPermissionsAsync: jest.fn(async () => ({ status: "granted" })),
  requestPermissionsAsync: jest.fn(async () => ({ status: "granted" })),
  scheduleNotificationAsync: jest.fn(async () => {}),
  AndroidImportance: { DEFAULT: 3 },
}));

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: "granted" })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: { latitude: 52.0, longitude: 21.0 },
  })),
  Accuracy: { High: 3 },
}));

jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));

jest.mock("expo-linear-gradient", () => {
  const React = require("react");
  return {
    LinearGradient: ({ children }) =>
      React.createElement("LinearGradient", null, children),
  };
});

jest.mock("@expo/vector-icons/MaterialCommunityIcons", () => {
  const React = require("react");
  return function MockMaterialCommunityIcons() {
    return React.createElement("Icon");
  };
});

jest.mock("@expo/vector-icons/AntDesign", () => {
  const React = require("react");
  return function MockAntDesign() {
    return React.createElement("Icon");
  };
});

jest.mock("react-native-vector-icons/Ionicons", () => {
  const React = require("react");
  return function MockIonicons() {
    return React.createElement("Icon");
  };
});

jest.mock("react-native-maps", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ children, ...props }) =>
      React.createElement("MapView", props, children),
    Marker: ({ children, ...props }) =>
      React.createElement("Marker", props, children),
    Polygon: ({ children, ...props }) =>
      React.createElement("Polygon", props, children),
  };
});

jest.mock("react-native-keyboard-aware-scroll-view", () => {
  const React = require("react");
  return {
    KeyboardAwareScrollView: ({ children }) =>
      React.createElement("KeyboardAwareScrollView", null, children),
  };
});
