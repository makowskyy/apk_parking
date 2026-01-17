import React from "react";
import { Alert } from "react-native";
import { fireEvent, waitFor } from "@testing-library/react-native";
import RegisterScreen from "../../src/screens/RegisterScreen";
import { renderWithTheme } from "../__helpers__/renderWithTheme";
import { register } from "../../src/services/authApi";

jest.mock("../../src/services/authApi", () => ({
  register: jest.fn(),
}));

describe("RegisterScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks registration when terms are not accepted", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getAllByPlaceholderText, getByPlaceholderText, getByText } = renderWithTheme(
      <RegisterScreen navigation={{ navigate: jest.fn() }} />
    );

    fireEvent.changeText(getByPlaceholderText(/Imi/i), "Jan Nowak");
    fireEvent.changeText(getByPlaceholderText(/E-mail/i), "jan@parking.app");
    const [passwordInput] = getAllByPlaceholderText(/Has/i);
    fireEvent.changeText(passwordInput, "Password1!");
    fireEvent.changeText(getByPlaceholderText(/Powt/i), "Password1!");

    fireEvent.press(getByText(/Zarejestruj/i));

    expect(alertSpy).toHaveBeenCalled();
    expect(register).not.toHaveBeenCalled();
  });

  it("blocks registration when passwords do not match", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getAllByPlaceholderText, getByPlaceholderText, getByText } =
      renderWithTheme(<RegisterScreen navigation={{ navigate: jest.fn() }} />);

    fireEvent.changeText(getByPlaceholderText(/Imi/i), "Jan Nowak");
    fireEvent.changeText(getByPlaceholderText(/E-mail/i), "jan@parking.app");

    const passwordInputs = getAllByPlaceholderText(/Has/i);
    fireEvent.changeText(passwordInputs[0], "Password1!");
    fireEvent.changeText(passwordInputs[1], "Password2!");

    fireEvent.press(getByText(/Akceptuj/i));
    fireEvent.press(getByText(/Zarejestruj/i));

    expect(alertSpy).toHaveBeenCalled();
    expect(register).not.toHaveBeenCalled();
  });

  it("toggles password visibility", () => {
    const { getAllByPlaceholderText, getByLabelText } = renderWithTheme(
      <RegisterScreen navigation={{ navigate: jest.fn() }} />
    );

    const [passwordInput] = getAllByPlaceholderText(/Has/i);
    expect(passwordInput.props.secureTextEntry).toBe(true);

    fireEvent.press(getByLabelText(/Poka/i));

    const [updatedPasswordInput] = getAllByPlaceholderText(/Has/i);
    expect(updatedPasswordInput.props.secureTextEntry).toBe(false);
  });

  it("registers and navigates on success", async () => {
    const navigate = jest.fn();
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    (register as jest.Mock).mockResolvedValue({ user: { id: 1 } });

    const { getByPlaceholderText, getByText } =
      renderWithTheme(<RegisterScreen navigation={{ navigate }} />);

    fireEvent.changeText(getByPlaceholderText(/Imi/i), "Jan Nowak");
    fireEvent.changeText(getByPlaceholderText(/E-mail/i), "jan@parking.app");
    fireEvent.changeText(getByPlaceholderText(/^Has/i), "Password1!");
    fireEvent.changeText(getByPlaceholderText(/Powt/i), "Password1!");

    const acceptLabel = getByText(/Akceptuj/i);
    fireEvent.press(acceptLabel.parent as never);
    fireEvent.press(getByText(/Zarejestruj/i));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith(
        "Jan Nowak",
        "jan@parking.app",
        "Password1!"
      );
    });

    const [, , buttons] = alertSpy.mock.calls[0];
    const okButton = Array.isArray(buttons) ? buttons[0] : null;
    okButton?.onPress?.();

    expect(navigate).toHaveBeenCalledWith("Login");
  });

  it("shows error when register fails", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    (register as jest.Mock).mockRejectedValue(new Error("Bad request"));

    const { getByPlaceholderText, getByText } =
      renderWithTheme(<RegisterScreen navigation={{ navigate: jest.fn() }} />);

    fireEvent.changeText(getByPlaceholderText(/Imi/i), "Jan Nowak");
    fireEvent.changeText(getByPlaceholderText(/E-mail/i), "jan@parking.app");
    fireEvent.changeText(getByPlaceholderText(/^Has/i), "Password1!");
    fireEvent.changeText(getByPlaceholderText(/Powt/i), "Password1!");

    const acceptLabel = getByText(/Akceptuj/i);
    fireEvent.press(acceptLabel.parent as never);
    fireEvent.press(getByText(/Zarejestruj/i));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
  });

  it("shows validation error when name is missing", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getAllByPlaceholderText, getByPlaceholderText, getByText } =
      renderWithTheme(<RegisterScreen navigation={{ navigate: jest.fn() }} />);

    fireEvent.changeText(getByPlaceholderText(/E-mail/i), "jan@parking.app");
    const passwordInputs = getAllByPlaceholderText(/Has/i);
    fireEvent.changeText(passwordInputs[0], "Password1!");
    fireEvent.changeText(passwordInputs[1], "Password1!");
    fireEvent.press(getByText(/Akceptuj/i));
    fireEvent.press(getByText(/Zarejestruj/i));

    expect(alertSpy).toHaveBeenCalled();
    expect(register).not.toHaveBeenCalled();
  });

  it("shows validation error when email is invalid", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getAllByPlaceholderText, getByPlaceholderText, getByText } =
      renderWithTheme(<RegisterScreen navigation={{ navigate: jest.fn() }} />);

    fireEvent.changeText(getByPlaceholderText(/Imi/i), "Jan Nowak");
    fireEvent.changeText(getByPlaceholderText(/E-mail/i), "bad-email");
    const passwordInputs = getAllByPlaceholderText(/Has/i);
    fireEvent.changeText(passwordInputs[0], "Password1!");
    fireEvent.changeText(passwordInputs[1], "Password1!");
    fireEvent.press(getByText(/Akceptuj/i));
    fireEvent.press(getByText(/Zarejestruj/i));

    expect(alertSpy).toHaveBeenCalled();
    expect(register).not.toHaveBeenCalled();
  });

  it("shows validation error when password is too short", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getAllByPlaceholderText, getByPlaceholderText, getByText } =
      renderWithTheme(<RegisterScreen navigation={{ navigate: jest.fn() }} />);

    fireEvent.changeText(getByPlaceholderText(/Imi/i), "Jan Nowak");
    fireEvent.changeText(getByPlaceholderText(/E-mail/i), "jan@parking.app");
    const passwordInputs = getAllByPlaceholderText(/Has/i);
    fireEvent.changeText(passwordInputs[0], "Pass1!");
    fireEvent.changeText(passwordInputs[1], "Pass1!");
    const acceptLabel = getByText(/Akceptuj/i);
    fireEvent.press(acceptLabel.parent as never);
    fireEvent.press(getByText(/Zarejestruj/i));

    expect(alertSpy).toHaveBeenCalled();
    expect(register).not.toHaveBeenCalled();
  });

  it("shows generic error when register throws non-Error", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    (register as jest.Mock).mockRejectedValue("fail");

    const { getAllByPlaceholderText, getByPlaceholderText, getByText } =
      renderWithTheme(<RegisterScreen navigation={{ navigate: jest.fn() }} />);

    fireEvent.changeText(getByPlaceholderText(/Imi/i), "Jan Nowak");
    fireEvent.changeText(getByPlaceholderText(/E-mail/i), "jan@parking.app");
    const passwordInputs = getAllByPlaceholderText(/Has/i);
    fireEvent.changeText(passwordInputs[0], "Password1!");
    fireEvent.changeText(passwordInputs[1], "Password1!");
    fireEvent.press(getByText(/Akceptuj/i));
    fireEvent.press(getByText(/Zarejestruj/i));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
  });

  it("navigates to login from the link", () => {
    const navigate = jest.fn();
    const { getByText } = renderWithTheme(
      <RegisterScreen navigation={{ navigate }} />
    );

    fireEvent.press(getByText(/Zaloguj/i));

    expect(navigate).toHaveBeenCalledWith("Login");
  });
});
