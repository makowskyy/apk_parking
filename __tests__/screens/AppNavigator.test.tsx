import React from "react";
import { fireEvent, waitFor } from "@testing-library/react-native";
import AppNavigator from "../../src/navigation/AppNavigator";
import { renderWithTheme } from "../__helpers__/renderWithTheme";
import { clearSession, getSavedToken } from "../../src/services/authStorage";

jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return {
    NavigationContainer: ({ children }) =>
      React.createElement("NavigationContainer", null, children),
  };
});

jest.mock("../../src/navigation/AuthNavigator", () => (props) => {
  const React = require("react");
  return React.createElement(
    "Text",
    { onPress: props.onLoginSuccess },
    "AuthNavigator"
  );
});

jest.mock("../../src/navigation/MainTabNavigator", () => (props) => {
  const React = require("react");
  return React.createElement(
    "Text",
    { onPress: props.onLogout },
    "MainTabNavigator"
  );
});

jest.mock("../../src/services/authStorage", () => ({
  getSavedToken: jest.fn(),
  clearSession: jest.fn(),
}));

describe("AppNavigator", () => {
  const navigationTheme = {
    dark: false,
    colors: {
      primary: "#8BC34A",
      background: "#ffffff",
      card: "#ffffff",
      text: "#000000",
      border: "#cccccc",
      notification: "#ff0000",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows AuthNavigator when no token is stored", async () => {
    (getSavedToken as jest.Mock).mockResolvedValue(null);

    const { getByText } = renderWithTheme(
      <AppNavigator navigationTheme={navigationTheme} />
    );

    await waitFor(() => {
      expect(getByText("AuthNavigator")).toBeTruthy();
    });
  });

  it("shows MainTabNavigator when token exists", async () => {
    (getSavedToken as jest.Mock).mockResolvedValue("token-1");

    const { getByText } = renderWithTheme(
      <AppNavigator navigationTheme={navigationTheme} />
    );

    await waitFor(() => {
      expect(getByText("MainTabNavigator")).toBeTruthy();
    });
  });

  it("falls back to AuthNavigator when token loading fails", async () => {
    (getSavedToken as jest.Mock).mockRejectedValue(new Error("fail"));
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    const { getByText } = renderWithTheme(
      <AppNavigator navigationTheme={navigationTheme} />
    );

    await waitFor(() => {
      expect(getByText("AuthNavigator")).toBeTruthy();
    });

    warnSpy.mockRestore();
  });

  it("logs out and returns to AuthNavigator", async () => {
    (getSavedToken as jest.Mock).mockResolvedValue("token-1");

    const { getByText } = renderWithTheme(
      <AppNavigator navigationTheme={navigationTheme} />
    );

    const main = await waitFor(() => getByText("MainTabNavigator"));
    fireEvent.press(main);

    await waitFor(() => {
      expect(clearSession).toHaveBeenCalled();
      expect(getByText("AuthNavigator")).toBeTruthy();
    });
  });

  it("switches to MainTabNavigator after login success", async () => {
    (getSavedToken as jest.Mock).mockResolvedValue(null);

    const { getByText } = renderWithTheme(
      <AppNavigator navigationTheme={navigationTheme} />
    );

    const auth = await waitFor(() => getByText("AuthNavigator"));
    fireEvent.press(auth);

    await waitFor(() => {
      expect(getByText("MainTabNavigator")).toBeTruthy();
    });
  });
});
