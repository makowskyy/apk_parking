import React from "react";
import { fireEvent } from "@testing-library/react-native";
import AppButton from "../../src/components/AppButton";
import { renderWithTheme } from "../__helpers__/renderWithTheme";

describe("AppButton", () => {
  it("renders primary variant with default colors", () => {
    const { getByTestId, getByText } = renderWithTheme(
      <AppButton testID="btn" title="OK" onPress={() => {}} />
    );

    expect(getByTestId("btn")).toHaveStyle({
      backgroundColor: "#8BC34A",
      borderWidth: 0,
    });
    expect(getByText("OK")).toHaveStyle({ color: "#0B2B13" });
  });

  it("renders outline variant with border", () => {
    const { getByTestId, getByText } = renderWithTheme(
      <AppButton testID="btn" title="Outline" variant="outline" />
    );

    expect(getByTestId("btn")).toHaveStyle({
      backgroundColor: "transparent",
      borderWidth: 1,
    });
    expect(getByText("Outline")).toHaveStyle({ color: "#8BC34A" });
  });

  it("fires onPress handler", () => {
    const onPress = jest.fn();
    const { getByText } = renderWithTheme(
      <AppButton title="Click" onPress={onPress} />
    );

    fireEvent.press(getByText("Click"));

    expect(onPress).toHaveBeenCalled();
  });
});
