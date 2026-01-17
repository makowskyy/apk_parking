import React from "react";
import { Platform } from "react-native";
import { fireEvent, waitFor } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";
import SettingsScreen from "../../src/screens/SettingsScreen";
import { renderWithTheme } from "../__helpers__/renderWithTheme";

const getSwitches = (utils: {
  UNSAFE_getAllByType: (type: string) => any[];
}) => {
  const types = ["AndroidSwitch", "RCTSwitch", "Switch"];
  for (const type of types) {
    try {
      const found = utils.UNSAFE_getAllByType(type);
      if (found.length > 0) return found;
    } catch {
      // ignore missing type
    }
  }
  return [];
};

describe("SettingsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("navigates back on cancel", () => {
    const goBack = jest.fn();

    const { getByText } = renderWithTheme(
      <SettingsScreen navigation={{ goBack }} />
    );

    fireEvent.press(getByText(/Anuluj/i));

    expect(goBack).toHaveBeenCalled();
  });

  it("calls onLogout when pressing logout", () => {
    const onLogout = jest.fn();

    const { getByText } = renderWithTheme(
      <SettingsScreen navigation={{ goBack: jest.fn() }} onLogout={onLogout} />
    );

    fireEvent.press(getByText(/Wyloguj/i));

    expect(onLogout).toHaveBeenCalled();
  });

  it("saves settings and navigates back", () => {
    const goBack = jest.fn();
    const setForceDark = jest.fn(async () => {});
    const setBiometricsEnabled = jest.fn(async () => {});
    const setNotificationsEnabled = jest.fn();

    const { getByText } = renderWithTheme(
      <SettingsScreen navigation={{ goBack }} />,
      {
        theme: {
          isDark: true,
          forceDark: true,
          setForceDark,
          biometricsEnabled: false,
          setBiometricsEnabled,
          notificationsEnabled: true,
          setNotificationsEnabled,
          colors: {
            background: "#101010",
            card: "#1b1b1b",
            text: "#ffffff",
            subtitle: "#bbbbbb",
            border: "rgba(255,255,255,0.06)",
            primary: "#8BC34A",
          },
        },
      }
    );

    fireEvent.press(getByText(/Zapisz/i));

    expect(setForceDark).toHaveBeenCalledWith(true);
    expect(setBiometricsEnabled).toHaveBeenCalledWith(false);
    expect(setNotificationsEnabled).toHaveBeenCalledWith(true);
    expect(goBack).toHaveBeenCalled();
  });

  it("updates dark mode and biometrics toggles", () => {
    const goBack = jest.fn();
    const setForceDark = jest.fn(async () => {});
    const setBiometricsEnabled = jest.fn(async () => {});
    const setNotificationsEnabled = jest.fn();

    const { UNSAFE_getAllByType, getByText } = renderWithTheme(
      <SettingsScreen navigation={{ goBack }} />,
      {
        theme: {
          isDark: true,
          forceDark: false,
          setForceDark,
          biometricsEnabled: true,
          setBiometricsEnabled,
          notificationsEnabled: false,
          setNotificationsEnabled,
          colors: {
            background: "#101010",
            card: "#1b1b1b",
            text: "#ffffff",
            subtitle: "#bbbbbb",
            border: "rgba(255,255,255,0.06)",
            primary: "#8BC34A",
          },
        },
      }
    );

    const switches = getSwitches({ UNSAFE_getAllByType });
    fireEvent(switches[0], "valueChange", true);
    fireEvent(switches[2], "valueChange", false);
    fireEvent.press(getByText(/Zapisz/i));

    expect(setForceDark).toHaveBeenCalledWith(true);
    expect(setBiometricsEnabled).toHaveBeenCalledWith(false);
  });

  it("schedules notification when enabling notifications", async () => {
    const goBack = jest.fn();
    const setForceDark = jest.fn(async () => {});
    const setBiometricsEnabled = jest.fn(async () => {});
    const setNotificationsEnabled = jest.fn();

    const { UNSAFE_getAllByType, getByText } = renderWithTheme(
      <SettingsScreen navigation={{ goBack }} />,
      {
        theme: {
          isDark: true,
          forceDark: false,
          setForceDark,
          biometricsEnabled: false,
          setBiometricsEnabled,
          notificationsEnabled: false,
          setNotificationsEnabled,
          colors: {
            background: "#101010",
            card: "#1b1b1b",
            text: "#ffffff",
            subtitle: "#bbbbbb",
            border: "rgba(255,255,255,0.06)",
            primary: "#8BC34A",
          },
        },
      }
    );

    const switches = getSwitches({ UNSAFE_getAllByType });
    fireEvent(switches[1], "valueChange", true);
    fireEvent.press(getByText(/Zapisz/i));

    await waitFor(() => {
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    });
  });

  it("does not schedule notification when permissions are denied", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "denied",
    });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "denied",
    });

    const goBack = jest.fn();

    const { UNSAFE_getAllByType, getByText } = renderWithTheme(
      <SettingsScreen navigation={{ goBack }} />
    );

    const switches = getSwitches({ UNSAFE_getAllByType });
    fireEvent(switches[1], "valueChange", true);
    fireEvent.press(getByText(/Zapisz/i));

    await waitFor(() => {
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
      expect(goBack).toHaveBeenCalled();
    });
  });

  it("creates notification channel on Android when enabling notifications", async () => {
    const originalOs = Platform.OS;
    Object.defineProperty(Platform, "OS", { value: "android" });

    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });

    const goBack = jest.fn();

    const { UNSAFE_getAllByType, getByText } = renderWithTheme(
      <SettingsScreen navigation={{ goBack }} />,
      {
        theme: {
          isDark: true,
          forceDark: false,
          setForceDark: async () => {},
          biometricsEnabled: false,
          setBiometricsEnabled: async () => {},
          notificationsEnabled: false,
          setNotificationsEnabled: () => {},
          colors: {
            background: "#101010",
            card: "#1b1b1b",
            text: "#ffffff",
            subtitle: "#bbbbbb",
            border: "rgba(255,255,255,0.06)",
            primary: "#8BC34A",
          },
        },
      }
    );

    const switches = getSwitches({ UNSAFE_getAllByType });
    fireEvent(switches[1], "valueChange", true);
    fireEvent.press(getByText(/Zapisz/i));

    await waitFor(() => {
      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalled();
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    });

    Object.defineProperty(Platform, "OS", { value: originalOs });
  });

  it("warns when scheduling notification fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });
    (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValue(
      new Error("fail")
    );

    const goBack = jest.fn();

    const { UNSAFE_getAllByType, getByText } = renderWithTheme(
      <SettingsScreen navigation={{ goBack }} />,
      {
        theme: {
          isDark: true,
          forceDark: false,
          setForceDark: async () => {},
          biometricsEnabled: false,
          setBiometricsEnabled: async () => {},
          notificationsEnabled: false,
          setNotificationsEnabled: () => {},
          colors: {
            background: "#101010",
            card: "#1b1b1b",
            text: "#ffffff",
            subtitle: "#bbbbbb",
            border: "rgba(255,255,255,0.06)",
            primary: "#8BC34A",
          },
        },
      }
    );

    const switches = getSwitches({ UNSAFE_getAllByType });
    fireEvent(switches[1], "valueChange", true);
    fireEvent.press(getByText(/Zapisz/i));

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalled();
      expect(goBack).toHaveBeenCalled();
    });

    warnSpy.mockRestore();
  });
});
