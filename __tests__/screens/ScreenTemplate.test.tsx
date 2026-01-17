import React from "react";
import { renderWithTheme } from "../__helpers__/renderWithTheme";
import ScreenTemplate from "../../src/screens/ScreenTemplate";

describe("ScreenTemplate", () => {
  it("renders title from route params", () => {
    const { getByText } = renderWithTheme(
      <ScreenTemplate route={{ params: { title: "Testowy" } }} />
    );

    expect(getByText("Testowy")).toBeTruthy();
  });

  it("renders default title when no params", () => {
    const { getByText } = renderWithTheme(
      <ScreenTemplate route={{}} />
    );

    expect(getByText("Ekran")).toBeTruthy();
  });
});