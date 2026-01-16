import React, { PropsWithChildren } from "react";
import { render, RenderOptions } from "@testing-library/react-native";
import { ThemeContext, ThemeContextValue } from "../../src/theme/ThemeContext";

const defaultTheme: ThemeContextValue = {
  isDark: true,
  forceDark: false,
  setForceDark: async () => {},
  biometricsEnabled: true,
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
};

type ThemeRenderOptions = RenderOptions & {
  theme?: ThemeContextValue;
};

const ThemeWrapper: React.FC<PropsWithChildren<{ theme?: ThemeContextValue }>> = ({
  theme,
  children,
}) => (
  <ThemeContext.Provider value={theme ?? defaultTheme}>
    {children}
  </ThemeContext.Provider>
);

export const renderWithTheme = (
  ui: React.ReactElement,
  options: ThemeRenderOptions = {}
) => {
  const { theme, ...renderOptions } = options;
  return render(ui, {
    wrapper: ({ children }) => (
      <ThemeWrapper theme={theme}>{children}</ThemeWrapper>
    ),
    ...renderOptions,
  });
};
