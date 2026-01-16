import React from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, waitFor, act } from "@testing-library/react-native";
import TicketScreen from "../../src/screens/TicketScreen";
import { renderWithTheme } from "../__helpers__/renderWithTheme";

describe("TicketScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockImplementation(() =>
      Promise.resolve(null)
    );
    (AsyncStorage.setItem as jest.Mock).mockImplementation(() =>
      Promise.resolve()
    );
  });

  it("shows alert when balance is insufficient", async () => {
    jest.useFakeTimers();
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@parking_balance") {
        return Promise.resolve("0");
      }
      return Promise.resolve(null);
    });

    const { getByText } = renderWithTheme(<TicketScreen />);

    fireEvent.press(getByText(/Kup bilet -/i));

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    jest.useRealTimers();
  });

  it("adds a new plate to the list", () => {
    const { getAllByText, getByText, getByPlaceholderText, queryByText } =
      renderWithTheme(<TicketScreen />);

    expect(queryByText("GD 12345")).toBeNull();

    fireEvent.press(getByText(/\+ Dodaj/i));

    fireEvent.changeText(getByPlaceholderText(/Np\./i), "GD 12345");
    fireEvent.press(getByText(/^Dodaj$/i));

    expect(getAllByText("GD 12345").length).toBeGreaterThan(0);
  });

  it("uses selected plate when buying a ticket", async () => {
    jest.useFakeTimers();
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@parking_balance") {
        return Promise.resolve("100");
      }
      if (key === "@parking_tickets") {
        return Promise.resolve("[]");
      }
      return Promise.resolve(null);
    });

    const { getByText } = renderWithTheme(<TicketScreen />);

    fireEvent.press(getByText("KR 7J202"));
    fireEvent.press(getByText(/Kup bilet -/i));

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "@parking_tickets",
        expect.stringContaining("\"plate\":\"KR 7J202\"")
      );
    });

    jest.useRealTimers();
  });

  it("shows alert when trying to add an empty plate", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getByText } = renderWithTheme(<TicketScreen />);

    fireEvent.press(getByText(/\+ Dodaj/i));
    fireEvent.press(getByText(/^Dodaj$/i));

    expect(alertSpy).toHaveBeenCalled();
  });

  it("shows alert when no plate is selected", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getByText } = renderWithTheme(
      <TicketScreen initialPlates={[]} />
    );

    fireEvent.press(getByText(/Kup bilet -/i));

    expect(alertSpy).toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it("cancels adding a plate", () => {
    const { getByText, getByPlaceholderText, queryByPlaceholderText } =
      renderWithTheme(<TicketScreen />);

    fireEvent.press(getByText(/\+ Dodaj/i));
    expect(getByPlaceholderText(/Np\./i)).toBeTruthy();

    fireEvent.press(getByText(/Anuluj/i));

    expect(queryByPlaceholderText(/Np\./i)).toBeNull();
  });

  it("blocks adding a duplicate plate", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getByText, getByPlaceholderText } = renderWithTheme(
      <TicketScreen />
    );

    fireEvent.press(getByText(/\+ Dodaj/i));
    fireEvent.changeText(getByPlaceholderText(/Np\./i), "WX 12345");
    fireEvent.press(getByText(/^Dodaj$/i));

    expect(alertSpy).toHaveBeenCalled();
  });

  it("switches parking zone in the summary", () => {
    const { getByText } = renderWithTheme(<TicketScreen />);

    fireEvent.press(getByText(/B.*4,00/i));

    expect(getByText(/B .*Strefa B/i)).toBeTruthy();
  });

  it("shows planned start input when scheduling", () => {
    const { getByText, getByPlaceholderText, queryByPlaceholderText } =
      renderWithTheme(<TicketScreen />);

    expect(queryByPlaceholderText(/min/i)).toBeNull();

    fireEvent.press(getByText(/Zaplanuj/i));

    expect(getByPlaceholderText(/min/i)).toBeTruthy();

    fireEvent.press(getByText(/Teraz/i));

    expect(queryByPlaceholderText(/min/i)).toBeNull();
  });

  it("stores numeric start offset when scheduling", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-01T10:00:00.000Z"));
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@parking_balance") {
        return Promise.resolve("100");
      }
      if (key === "@parking_tickets") {
        return Promise.resolve("[]");
      }
      return Promise.resolve(null);
    });

    const { getByPlaceholderText, getByText } = renderWithTheme(<TicketScreen />);

    fireEvent.press(getByText(/Zaplanuj/i));
    fireEvent.changeText(getByPlaceholderText(/min/i), "30min");
    fireEvent.press(getByText(/Teraz/i));
    fireEvent.press(getByText(/Zaplanuj/i));
    fireEvent.press(getByText(/Kup bilet -/i));

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      const ticketCall = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
        ([key]) => key === "@parking_tickets"
      );
      const saved = ticketCall ? JSON.parse(ticketCall[1])[0] : null;
      expect(saved?.startISO).toBe(
        new Date("2024-01-01T10:30:00.000Z").toISOString()
      );
      expect(alertSpy).toHaveBeenCalled();
    });

    jest.useRealTimers();
  });

  it("falls back to PLN formatting when Intl.NumberFormat fails", () => {
    const numberFormatSpy = jest
      .spyOn(Intl, "NumberFormat")
      .mockImplementation(() => {
        throw new Error("fail");
      });

    const { getAllByText } = renderWithTheme(<TicketScreen />);

    expect(getAllByText(/PLN\/h/).length).toBeGreaterThan(0);

    numberFormatSpy.mockRestore();
  });

  it("falls back to Date.toString when formatting fails", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-01T10:00:00.000Z"));
    const originalToLocale = Date.prototype.toLocaleString;
    Date.prototype.toLocaleString = () => {
      throw new Error("fail");
    };

    const { getByText } = renderWithTheme(<TicketScreen />);

    expect(getByText(/Start: .*2024/i)).toBeTruthy();

    Date.prototype.toLocaleString = originalToLocale;
    jest.useRealTimers();
  });

  it("does not exceed the maximum duration", () => {
    const { getByText } = renderWithTheme(<TicketScreen />);

    for (let i = 0; i < 28; i += 1) {
      fireEvent.press(getByText("+15"));
    }

    expect(getByText("8 h 0 min")).toBeTruthy();

    fireEvent.press(getByText("+15"));

    expect(getByText("8 h 0 min")).toBeTruthy();
  });

  it("does not go below the minimum duration", () => {
    const { getByText } = renderWithTheme(<TicketScreen />);

    for (let i = 0; i < 4; i += 1) {
      fireEvent.press(getByText("-15"));
    }

    expect(getByText("0 h 15 min")).toBeTruthy();

    fireEvent.press(getByText("-15"));

    expect(getByText("0 h 15 min")).toBeTruthy();
  });

  it("handles read balance errors as insufficient funds", async () => {
    jest.useFakeTimers();
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error("fail"));

    const { getByText } = renderWithTheme(<TicketScreen />);

    fireEvent.press(getByText(/Kup bilet -/i));

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    jest.useRealTimers();
  });

  it("warns when saving ticket to storage fails", async () => {
    jest.useFakeTimers();
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@parking_balance") {
        return Promise.resolve("100");
      }
      if (key === "@parking_tickets") {
        return Promise.resolve("[]");
      }
      return Promise.resolve(null);
    });

    (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@parking_tickets") {
        return Promise.reject(new Error("fail"));
      }
      return Promise.resolve();
    });

    const { getByText } = renderWithTheme(<TicketScreen />);

    fireEvent.press(getByText(/Kup bilet -/i));

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalled();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "@parking_balance",
        "94"
      );
    });

    warnSpy.mockRestore();
    jest.useRealTimers();
  });

  it("shows error when balance update fails", async () => {
    jest.useFakeTimers();
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@parking_balance") {
        return Promise.resolve("100");
      }
      if (key === "@parking_tickets") {
        return Promise.resolve("[]");
      }
      return Promise.resolve(null);
    });

    (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@parking_balance") {
        return Promise.reject(new Error("fail"));
      }
      return Promise.resolve();
    });

    const { getByText } = renderWithTheme(<TicketScreen />);

    fireEvent.press(getByText(/Kup bilet -/i));

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalled();
    });

    errorSpy.mockRestore();
    jest.useRealTimers();
  });

  it("buys a ticket when balance is sufficient", async () => {
    jest.useFakeTimers();
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@parking_balance") {
        return Promise.resolve("100");
      }
      if (key === "@parking_tickets") {
        return Promise.resolve("[]");
      }
      return Promise.resolve(null);
    });

    const { getByText } = renderWithTheme(<TicketScreen />);

    fireEvent.press(getByText(/Kup bilet -/i));

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "@parking_balance",
        "94"
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "@parking_tickets",
        expect.stringContaining("\"plate\"")
      );
    });

    jest.useRealTimers();
  });
});
