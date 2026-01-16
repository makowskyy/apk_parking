import React from "react";
import { Text } from "react-native";
import { renderWithTheme } from "../__helpers__/renderWithTheme";
import ScreenWrapper from "../../src/components/ScreenWrapper";

describe("ScreenWrapper", () => {
  it("renders content and footer when provided", () => {
    const { getByText } = renderWithTheme(
      <ScreenWrapper footer={<Text>Footer</Text>}>
        <Text>Content</Text>
      </ScreenWrapper>
    );

    expect(getByText("Content")).toBeTruthy();
    expect(getByText("Footer")).toBeTruthy();
  });

  it("renders content without footer", () => {
    const { getByText, queryByText } = renderWithTheme(
      <ScreenWrapper>
        <Text>Content</Text>
      </ScreenWrapper>
    );

    expect(getByText("Content")).toBeTruthy();
    expect(queryByText("Footer")).toBeNull();
  });
});
