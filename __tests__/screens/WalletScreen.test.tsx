import React from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, waitFor } from "@testing-library/react-native";
import WalletScreen from "../../src/screens/WalletScreen";
import { renderWithTheme } from "../__helpers__/renderWithTheme";

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback: () => void) => {
    const React = require("react");
    React.useEffect(() => callback(), [callback]);
  },
}));

describe("WalletScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockImplementation(() =>
      Promise.resolve(null)
    );
    await AsyncStorage.clear();
  });

  it("shows alert for invalid amount", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getByPlaceholderText, getByText } = renderWithTheme(<WalletScreen />);

    await waitFor(() => {
      expect(getByText(/saldo/i)).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText(/Kwota/i), "0");
    fireEvent.press(getByText(/Do.*aduj$/i));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
  });

  it("tops up balance with valid amount", async () => {
    const { getByPlaceholderText, getByText } = renderWithTheme(<WalletScreen />);

    await waitFor(() => {
      expect(getByText(/saldo/i)).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText(/Kwota/i), "15");
    fireEvent.press(getByText(/Do.*aduj$/i));

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "@parking_balance",
        "15"
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "@parking_topup_history",
        expect.stringContaining('"amount":15')
      );
    });
  });

  it("shows history entry after top up", async () => {
    const { getAllByText, getByPlaceholderText, getByText } = renderWithTheme(
      <WalletScreen />
    );

    await waitFor(() => {
      expect(getByText(/saldo/i)).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText(/Kwota/i), "25");
    fireEvent.press(getByText(/Do.*aduj$/i));

    await waitFor(() => {
      expect(getAllByText(/25\.00/).length).toBeGreaterThan(1);
    });
  });

  it("loads stored balance and history", async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@parking_balance") {
        return Promise.resolve("42.5");
      }
      if (key === "@parking_topup_history") {
        return Promise.resolve(
          JSON.stringify([{ id: "1", amount: 10, date: "2024-01-01" }])
        );
      }
      return Promise.resolve(null);
    });

    const { getByText } = renderWithTheme(<WalletScreen />);

    await waitFor(() => {
      expect(getByText(/42\.50/)).toBeTruthy();
      expect(getByText(/2024-01-01/)).toBeTruthy();
    });
  });

  it("accepts comma as decimal separator", async () => {
    const { getByPlaceholderText, getByText } = renderWithTheme(<WalletScreen />);

    await waitFor(() => {
      expect(getByText(/saldo/i)).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText(/Kwota/i), "12,5");
    fireEvent.press(getByText(/Do.*aduj$/i));

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "@parking_balance",
        "12.5"
      );
    });
  });

  it("warns when loading stored balance fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error("fail"));

    const { getByText } = renderWithTheme(<WalletScreen />);

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalled();
      expect(getByText(/saldo/i)).toBeTruthy();
    });

    warnSpy.mockRestore();
  });

  it("warns when saving balance and history fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error("fail"));

    const { getByPlaceholderText, getByText } = renderWithTheme(<WalletScreen />);

    await waitFor(() => {
      expect(getByText(/saldo/i)).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText(/Kwota/i), "7");
    fireEvent.press(getByText(/Do.*aduj$/i));

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalled();
    });

    warnSpy.mockRestore();
  });
});
