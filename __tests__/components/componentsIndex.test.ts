import { AppButton, ScreenWrapper } from "../../src/components";

describe("components index", () => {
  it("exports AppButton and ScreenWrapper", () => {
    expect(AppButton).toBeTruthy();
    expect(ScreenWrapper).toBeTruthy();
  });
});
