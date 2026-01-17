import React from "react";
import { fireEvent } from "@testing-library/react-native";
import StartScreen from "../../src/screens/StartScreen";
import { renderWithTheme } from "../__helpers__/renderWithTheme";

describe("StartScreen", () => {
  it("navigates to Register", () => {
    const navigate = jest.fn();
    const { getByText } = renderWithTheme(
      <StartScreen navigation={{ navigate }} />
    );

    fireEvent.press(getByText(/KONTO$/i));

    expect(navigate).toHaveBeenCalledWith("Register");
  });

  it("navigates to Login", () => {
    const navigate = jest.fn();
    const { getByText } = renderWithTheme(
      <StartScreen navigation={{ navigate }} />
    );

    fireEvent.press(getByText(/^ZALOGUJ/i));

    expect(navigate).toHaveBeenCalledWith("Login");
  });
});
