import React from "react";
import { Alert } from "react-native";
import { act, fireEvent, waitFor } from "@testing-library/react-native";
import LoginScreen from "../../src/screens/LoginScreen";
import { renderWithTheme } from "../__helpers__/renderWithTheme";
import { login } from "../../src/services/authApi";
import { saveSession } from "../../src/services/authStorage";
import * as LocalAuthentication from "expo-local-authentication";

jest.mock("../../src/services/authApi", () => ({
  login: jest.fn(),
}));

jest.mock("../../src/services/authStorage", () => ({
  saveSession: jest.fn(),
}));

describe("LoginScreen", () => {
  const flushBiometricsEffect = async () => {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows validation alert when fields are empty", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getByText } = renderWithTheme(
      <LoginScreen navigation={{ navigate: jest.fn() }} />
    );
    await flushBiometricsEffect();

    fireEvent.press(getByText(/^Zaloguj$/i));

    expect(alertSpy).toHaveBeenCalled();
    expect(login).not.toHaveBeenCalled();
  });

  it("logs in and saves session on success", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const onLoginSuccess = jest.fn();

    (login as jest.Mock).mockResolvedValue({
      token: "token-1",
      user: { id: 1, email: "user@parking.app", name: "User" },
    });

    (saveSession as jest.Mock).mockResolvedValue(undefined);

    const { getByPlaceholderText, getByText } = renderWithTheme(
      <LoginScreen
        navigation={{ navigate: jest.fn() }}
        onLoginSuccess={onLoginSuccess}
      />
    );
    await flushBiometricsEffect();

    const emailInput = getByPlaceholderText(/E-mail/i);
    const passwordInput = getByPlaceholderText(/Has/i);

    fireEvent.changeText(emailInput, " user@parking.app ");
    fireEvent.changeText(passwordInput, "secret");
    fireEvent.press(getByText(/^Zaloguj$/i));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith("user@parking.app", "secret");
      expect(saveSession).toHaveBeenCalledWith("token-1", {
        id: 1,
        email: "user@parking.app",
        name: "User",
      });
    });

    expect(onLoginSuccess).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalled();
  });

  it("logs in with biometrics when available", async () => {
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
      success: true,
    });

    const onLoginSuccess = jest.fn();

    const { findByText } = renderWithTheme(
      <LoginScreen
        navigation={{ navigate: jest.fn() }}
        onLoginSuccess={onLoginSuccess}
      />
    );
    await flushBiometricsEffect();

    const biometricButton = await findByText(/Zaloguj odciskiem/i);

    fireEvent.press(biometricButton);

    await waitFor(() => {
      expect(onLoginSuccess).toHaveBeenCalled();
      expect(login).not.toHaveBeenCalled();
    });
  });

  it("shows alert when login fails", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    (login as jest.Mock).mockRejectedValue(new Error("Bad credentials"));

    const { getByPlaceholderText, getByText } = renderWithTheme(
      <LoginScreen navigation={{ navigate: jest.fn() }} />
    );
    await flushBiometricsEffect();

    fireEvent.changeText(getByPlaceholderText(/E-mail/i), "user@parking.app");
    fireEvent.changeText(getByPlaceholderText(/Has/i), "badpass");
    fireEvent.press(getByText(/^Zaloguj$/i));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
  });

  it("shows alert when biometric auth fails", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
      success: false,
    });

    const { findByText } = renderWithTheme(
      <LoginScreen navigation={{ navigate: jest.fn() }} />
    );
    await flushBiometricsEffect();

    const biometricButton = await findByText(/Zaloguj odciskiem/i);
    fireEvent.press(biometricButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
  });

  it("disables biometrics when availability check fails", async () => {
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockRejectedValue(
      new Error("fail")
    );

    const { queryByText } = renderWithTheme(
      <LoginScreen navigation={{ navigate: jest.fn() }} />
    );
    await flushBiometricsEffect();

    expect(queryByText(/Zaloguj odciskiem/i)).toBeNull();
  });

  it("hides biometrics when disabled in theme", async () => {
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
    const { queryByText } = renderWithTheme(
      <LoginScreen navigation={{ navigate: jest.fn() }} />,
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

    await flushBiometricsEffect();
    await waitFor(() => {
      expect(queryByText(/Zaloguj odciskiem/i)).toBeNull();
    });
    expect(LocalAuthentication.hasHardwareAsync).not.toHaveBeenCalled();
  });

  it("shows alert when biometric auth throws", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.authenticateAsync as jest.Mock).mockRejectedValue(
      new Error("fail")
    );

    const { findByText } = renderWithTheme(
      <LoginScreen navigation={{ navigate: jest.fn() }} />
    );
    await flushBiometricsEffect();

    const biometricButton = await findByText(/Zaloguj odciskiem/i);
    fireEvent.press(biometricButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
  });

  it("navigates to register from the link", async () => {
    const navigate = jest.fn();

    const { getByText } = renderWithTheme(
      <LoginScreen navigation={{ navigate }} />
    );
    await flushBiometricsEffect();

    fireEvent.press(getByText(/Zarejestruj/i));

    expect(navigate).toHaveBeenCalledWith("Register");
  });
});
