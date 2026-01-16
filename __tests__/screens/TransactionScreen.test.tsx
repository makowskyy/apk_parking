import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { fireEvent, waitFor } from "@testing-library/react-native";
import TransactionScreen, {
  extendTransactionTicket,
} from "../../src/screens/TransactionScreen";
import { renderWithTheme } from "../__helpers__/renderWithTheme";

describe("TransactionScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it("shows empty state when there are no tickets", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { getByText } = renderWithTheme(<TransactionScreen />);

    await waitFor(() => {
      expect(getByText(/Brak zapisanych/i)).toBeTruthy();
    });
  });

  it("shows active ticket actions only for active tickets", async () => {
    jest.useFakeTimers();
    const now = new Date("2024-01-01T10:00:00.000Z");
    jest.setSystemTime(now);

    const tickets = [
      {
        id: "active",
        status: "ACTIVE",
        createdAtISO: new Date(now.getTime() - 40 * 60000).toISOString(),
        plate: "WX 12345",
        zone: "A",
        zoneName: "Strefa A",
        startISO: new Date(now.getTime() - 10 * 60000).toISOString(),
        endISO: new Date(now.getTime() + 10 * 60000).toISOString(),
        durationMin: 20,
        amount: 3,
        notifyBeforeEnd: true,
      },
      {
        id: "past",
        status: "EXPIRED",
        createdAtISO: new Date(now.getTime() - 120 * 60000).toISOString(),
        plate: "KR 7J202",
        zone: "B",
        zoneName: "Strefa B",
        startISO: new Date(now.getTime() - 90 * 60000).toISOString(),
        endISO: new Date(now.getTime() - 60 * 60000).toISOString(),
        durationMin: 30,
        amount: 4,
        notifyBeforeEnd: false,
      },
    ];

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify(tickets)
    );

    const { getAllByText, getByText } = renderWithTheme(
      <TransactionScreen />
    );

    await waitFor(() => {
      expect(getByText(/Aktywny/i)).toBeTruthy();
      expect(getAllByText(/Przedluz postoj/i).length).toBe(1);
    });

    jest.useRealTimers();
  });

  it("toggles extra details for a ticket", async () => {
    const tickets = [
      {
        id: "active",
        status: "ACTIVE",
        createdAtISO: "2024-01-01T09:00:00.000Z",
        plate: "WX 12345",
        zone: "A",
        zoneName: "Strefa A",
        startISO: "2024-01-01T09:00:00.000Z",
        endISO: "2024-01-01T10:00:00.000Z",
        durationMin: 60,
        amount: 6,
        notifyBeforeEnd: true,
      },
    ];

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify(tickets)
    );

    const { getByText, queryByText } = renderWithTheme(
      <TransactionScreen />
    );

    await waitFor(() => {
      expect(getByText(/Wiecej informacji/i)).toBeTruthy();
    });

    fireEvent.press(getByText(/Wiecej informacji/i));
    expect(getByText(/ID biletu/i)).toBeTruthy();

    fireEvent.press(getByText(/Mniej informacji/i));
    expect(queryByText(/ID biletu/i)).toBeNull();
  });

  it("shows future ticket without extension and expands details", async () => {
    jest.useFakeTimers();
    const now = new Date("2024-01-01T10:00:00.000Z");
    jest.setSystemTime(now);

    const tickets = [
      {
        id: "future",
        status: "ACTIVE",
        createdAtISO: now.toISOString(),
        plate: "PO 9ABC1",
        zone: "C",
        zoneName: "Strefa C",
        startISO: new Date(now.getTime() + 60 * 60000).toISOString(),
        endISO: new Date(now.getTime() + 90 * 60000).toISOString(),
        durationMin: 30,
        amount: 1.5,
        notifyBeforeEnd: false,
      },
    ];

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify(tickets)
    );

    const { getByText, queryByText } = renderWithTheme(
      <TransactionScreen />
    );

    await waitFor(() => {
      expect(getByText(/Zaplanowany/i)).toBeTruthy();
      expect(queryByText(/Przedluz postoj/i)).toBeNull();
    });

    fireEvent.press(getByText(/Wiecej informacji/i));
    expect(getByText(/Powiadomienie.*nie/i)).toBeTruthy();

    jest.useRealTimers();
  });

  it("extends ticket without balance update when extra cost is zero", async () => {
    jest.useFakeTimers();
    const now = new Date("2024-01-01T10:00:00.000Z");
    jest.setSystemTime(now);

    const tickets = [
      {
        id: "active",
        status: "ACTIVE",
        createdAtISO: new Date(now.getTime() - 40 * 60000).toISOString(),
        plate: "WX 12345",
        zone: "B",
        zoneName: "Strefa B",
        startISO: new Date(now.getTime() - 10 * 60000).toISOString(),
        endISO: new Date(now.getTime() + 10 * 60000).toISOString(),
        durationMin: 15,
        amount: 2,
        notifyBeforeEnd: true,
      },
    ];

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@parking_tickets") {
        return Promise.resolve(JSON.stringify(tickets));
      }
      if (key === "@parking_balance") {
        return Promise.resolve("0");
      }
      return Promise.resolve(null);
    });

    const { getByText } = renderWithTheme(<TransactionScreen />);

    await waitFor(() => {
      expect(getByText(/Przedluz postoj/i)).toBeTruthy();
    });

    fireEvent.press(getByText(/Przedluz postoj/i));

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "@parking_tickets",
        expect.stringContaining("\"durationMin\":30")
      );
      const setCalls = (AsyncStorage.setItem as jest.Mock).mock.calls;
      expect(setCalls.some(([key]) => key === "@parking_balance")).toBe(false);
    });

    jest.useRealTimers();
  });

  it("extends active ticket when balance is sufficient", async () => {
    jest.useFakeTimers();
    const now = new Date("2024-01-01T10:00:00.000Z");
    jest.setSystemTime(now);

    const tickets = [
      {
        id: "active",
        status: "ACTIVE",
        createdAtISO: new Date(now.getTime() - 40 * 60000).toISOString(),
        plate: "WX 12345",
        zone: "A",
        zoneName: "Strefa A",
        startISO: new Date(now.getTime() - 10 * 60000).toISOString(),
        endISO: new Date(now.getTime() + 10 * 60000).toISOString(),
        durationMin: 20,
        amount: 3,
        notifyBeforeEnd: true,
      },
    ];

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@parking_tickets") {
        return Promise.resolve(JSON.stringify(tickets));
      }
      if (key === "@parking_balance") {
        return Promise.resolve("10");
      }
      return Promise.resolve(null);
    });

    const { getByText } = renderWithTheme(<TransactionScreen />);

    await waitFor(() => {
      expect(getByText(/Przedluz postoj/i)).toBeTruthy();
    });

    fireEvent.press(getByText(/Przedluz postoj/i));

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "@parking_balance",
        "8.5"
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "@parking_tickets",
        expect.stringContaining("\"durationMin\":35")
      );
    });

    jest.useRealTimers();
  });

  it("shows alert when balance is insufficient for extension", async () => {
    jest.useFakeTimers();
    const now = new Date("2024-01-01T10:00:00.000Z");
    jest.setSystemTime(now);

    const tickets = [
      {
        id: "active",
        status: "ACTIVE",
        createdAtISO: new Date(now.getTime() - 40 * 60000).toISOString(),
        plate: "WX 12345",
        zone: "A",
        zoneName: "Strefa A",
        startISO: new Date(now.getTime() - 10 * 60000).toISOString(),
        endISO: new Date(now.getTime() + 10 * 60000).toISOString(),
        durationMin: 20,
        amount: 3,
        notifyBeforeEnd: true,
      },
    ];

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@parking_tickets") {
        return Promise.resolve(JSON.stringify(tickets));
      }
      if (key === "@parking_balance") {
        return Promise.resolve("0");
      }
      return Promise.resolve(null);
    });

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getByText } = renderWithTheme(<TransactionScreen />);

    await waitFor(() => {
      expect(getByText(/Przedluz postoj/i)).toBeTruthy();
    });

    fireEvent.press(getByText(/Przedluz postoj/i));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
      expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
        "@parking_tickets",
        expect.anything()
      );
    });

    jest.useRealTimers();
  });

  it("does nothing when extending missing ticket", async () => {
    await extendTransactionTicket([], "missing", jest.fn());

    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  });

  it("uses fallback formatting when Intl and date formatting fail", async () => {
    const numberFormatSpy = jest
      .spyOn(Intl, "NumberFormat")
      .mockImplementation(() => {
        throw new Error("fail");
      });
    const toLocaleSpy = jest
      .spyOn(Date.prototype, "toLocaleString")
      .mockImplementation(() => {
        throw new Error("fail");
      });
    const toStringSpy = jest
      .spyOn(Date.prototype, "toString")
      .mockReturnValue("DATE_STR");

    const tickets = [
      {
        id: "active",
        status: "ACTIVE",
        createdAtISO: "2024-01-01T09:00:00.000Z",
        plate: "WX 12345",
        zone: "A",
        zoneName: "Strefa A",
        startISO: "2024-01-01T09:00:00.000Z",
        endISO: "2024-01-01T10:00:00.000Z",
        durationMin: 60,
        amount: 3,
        notifyBeforeEnd: true,
      },
    ];

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify(tickets)
    );

    const { getByText } = renderWithTheme(<TransactionScreen />);

    await waitFor(() => {
      expect(getByText(/DATE_STR/)).toBeTruthy();
      expect(getByText(/3.00 PLN/)).toBeTruthy();
    });

    numberFormatSpy.mockRestore();
    toLocaleSpy.mockRestore();
    toStringSpy.mockRestore();
  });

  it("warns when loading tickets fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error("fail"));

    const { getByText } = renderWithTheme(<TransactionScreen />);

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalled();
      expect(getByText(/Brak zapisanych/i)).toBeTruthy();
    });

    warnSpy.mockRestore();
  });

  it("warns when extending a ticket fails", async () => {
    jest.useFakeTimers();
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const now = new Date("2024-01-01T10:00:00.000Z");
    jest.setSystemTime(now);

    const tickets = [
      {
        id: "active",
        status: "ACTIVE",
        createdAtISO: new Date(now.getTime() - 40 * 60000).toISOString(),
        plate: "WX 12345",
        zone: "A",
        zoneName: "Strefa A",
        startISO: new Date(now.getTime() - 10 * 60000).toISOString(),
        endISO: new Date(now.getTime() + 10 * 60000).toISOString(),
        durationMin: 20,
        amount: 3,
        notifyBeforeEnd: true,
      },
    ];

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@parking_tickets") {
        return Promise.resolve(JSON.stringify(tickets));
      }
      if (key === "@parking_balance") {
        return Promise.resolve("10");
      }
      return Promise.resolve(null);
    });
    (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error("fail"));

    const { getByText } = renderWithTheme(<TransactionScreen />);

    await waitFor(() => {
      expect(getByText(/Przedluz postoj/i)).toBeTruthy();
    });

    fireEvent.press(getByText(/Przedluz postoj/i));

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalled();
    });

    warnSpy.mockRestore();
    jest.useRealTimers();
  });
});
