import React from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, waitFor } from "@testing-library/react-native";
import HomeScreen, {
  extendTicketFromStorage,
  pickTicketToDisplay,
} from "../../src/screens/HomeScreen";
import { renderWithTheme } from "../__helpers__/renderWithTheme";

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback: () => void) => {
    const React = require("react");
    React.useEffect(() => callback(), [callback]);
  },
}));

describe("HomeScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it("returns null when there are no tickets", () => {
    expect(pickTicketToDisplay([])).toBeNull();
  });

  it("does nothing when extending without a ticket", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    await extendTicketFromStorage(null, jest.fn(), jest.fn());

    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it("renders balance and empty ticket state", async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@parking_balance") {
        return Promise.resolve("12.5");
      }
      if (key === "@parking_tickets") {
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    });

    const { getByText } = renderWithTheme(
      <HomeScreen navigation={{ navigate: jest.fn() }} />
    );

    await waitFor(() => {
      expect(getByText(/12\.50/)).toBeTruthy();
      expect(getByText("Brak")).toBeTruthy();
    });
  });

  it("ignores storage results after unmount", async () => {
    const deferred = () => {
      let resolve: (value: string) => void = () => {};
      const promise = new Promise<string>((res) => {
        resolve = res;
      });
      return { promise, resolve };
    };

    const balanceDeferred = deferred();
    const ticketsDeferred = deferred();

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@parking_balance") {
        return balanceDeferred.promise;
      }
      if (key === "@parking_tickets") {
        return ticketsDeferred.promise;
      }
      return Promise.resolve(null);
    });

    const { unmount } = renderWithTheme(
      <HomeScreen navigation={{ navigate: jest.fn() }} />
    );

    unmount();

    await act(async () => {
      balanceDeferred.resolve("10");
      ticketsDeferred.resolve("[]");
      await Promise.resolve();
    });

    expect(AsyncStorage.getItem).toHaveBeenCalled();
  });

  it("opens and closes the info panel", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { getByLabelText, getByText, queryByText } = renderWithTheme(
      <HomeScreen navigation={{ navigate: jest.fn() }} />
    );

    fireEvent.press(getByLabelText("Open info panel"));

    await waitFor(() => {
      expect(getByText("Informacje")).toBeTruthy();
    });

    fireEvent.press(getByLabelText("Close info panel"));

    await waitFor(() => {
      expect(queryByText("Informacje")).toBeNull();
    });
  });

  it("toggles info panel with the info button", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { getByLabelText, queryByText } = renderWithTheme(
      <HomeScreen navigation={{ navigate: jest.fn() }} />
    );

    fireEvent.press(getByLabelText("Open info panel"));

    await waitFor(() => {
      expect(queryByText("Informacje")).toBeTruthy();
    });

    fireEvent.press(getByLabelText("Open info panel"));

    await waitFor(() => {
      expect(queryByText("Informacje")).toBeNull();
    });
  });

  it("navigates to Ticket screen from tile", async () => {
    const navigate = jest.fn();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { getByText } = renderWithTheme(
      <HomeScreen navigation={{ navigate }} />
    );

    fireEvent.press(getByText(/Kup bilet/i));

    expect(navigate).toHaveBeenCalledWith("Ticket");
  });

  it("navigates to Map screen from tile", async () => {
    const navigate = jest.fn();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { getByText } = renderWithTheme(
      <HomeScreen navigation={{ navigate }} />
    );

    fireEvent.press(getByText(/Lokalizacja/i));

    expect(navigate).toHaveBeenCalledWith("Map");
  });

  it("navigates to Settings from footer", async () => {
    const navigate = jest.fn();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { getByText } = renderWithTheme(
      <HomeScreen navigation={{ navigate }} />
    );

    fireEvent.press(getByText(/Ustawienia/i));

    expect(navigate).toHaveBeenCalledWith("Settings");
  });

  it("handles storage errors by showing empty ticket state", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@parking_balance") {
        return Promise.resolve("20");
      }
      if (key === "@parking_tickets") {
        return Promise.reject(new Error("boom"));
      }
      return Promise.resolve(null);
    });

    const { findByText, getByText } = renderWithTheme(
      <HomeScreen navigation={{ navigate: jest.fn() }} />
    );

    await findByText("Brak");

    expect(getByText(/0\.00/)).toBeTruthy();
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("shows alert when extending without balance", async () => {
    jest.useFakeTimers();
    const now = new Date("2024-01-01T10:00:00.000Z");
    jest.setSystemTime(now);

    const ticket = {
      id: "1",
      status: "ACTIVE",
      createdAtISO: new Date(now.getTime() - 10 * 60000).toISOString(),
      plate: "WX 12345",
      zone: "A",
      zoneName: "Strefa A",
      startISO: new Date(now.getTime() - 5 * 60000).toISOString(),
      endISO: new Date(now.getTime() + 5 * 60000).toISOString(),
      durationMin: 60,
      amount: 6,
      notifyBeforeEnd: true,
    };

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@parking_balance") {
        return Promise.resolve("0");
      }
      if (key === "@parking_tickets") {
        return Promise.resolve(JSON.stringify([ticket]));
      }
      return Promise.resolve(null);
    });

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { findByText, getByText } = renderWithTheme(
      <HomeScreen navigation={{ navigate: jest.fn() }} />
    );

    await findByText(/Aktywny/i);

    fireEvent.press(getByText(/Przed/i));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    jest.useRealTimers();
  });

  it("shows planned ticket state", async () => {
    jest.useFakeTimers();
    const now = new Date("2024-01-01T10:00:00.000Z");
    jest.setSystemTime(now);

    const ticket = {
      id: "2",
      status: "ACTIVE",
      createdAtISO: now.toISOString(),
      plate: "WX 12345",
      zone: "A",
      zoneName: "Strefa A",
      startISO: new Date(now.getTime() + 10 * 60000).toISOString(),
      endISO: new Date(now.getTime() + 70 * 60000).toISOString(),
      durationMin: 60,
      amount: 6,
      notifyBeforeEnd: true,
    };

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@parking_balance") {
        return Promise.resolve("5");
      }
      if (key === "@parking_tickets") {
        return Promise.resolve(JSON.stringify([ticket]));
      }
      return Promise.resolve(null);
    });

    const { findByText } = renderWithTheme(
      <HomeScreen navigation={{ navigate: jest.fn() }} />
    );

    await findByText(/Zaplanowany/i);

    jest.useRealTimers();
  });

  it("shows finished ticket state", async () => {
    jest.useFakeTimers();
    const now = new Date("2024-01-01T10:00:00.000Z");
    jest.setSystemTime(now);

    const ticket = {
      id: "3",
      status: "EXPIRED",
      createdAtISO: new Date(now.getTime() - 70 * 60000).toISOString(),
      plate: "WX 12345",
      zone: "A",
      zoneName: "Strefa A",
      startISO: new Date(now.getTime() - 60 * 60000).toISOString(),
      endISO: new Date(now.getTime() - 10 * 60000).toISOString(),
      durationMin: 50,
      amount: 6,
      notifyBeforeEnd: true,
    };

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@parking_balance") {
        return Promise.resolve("5");
      }
      if (key === "@parking_tickets") {
        return Promise.resolve(JSON.stringify([ticket]));
      }
      return Promise.resolve(null);
    });

    const { findByText } = renderWithTheme(
      <HomeScreen navigation={{ navigate: jest.fn() }} />
    );

    await findByText(/Zako/i);

    jest.useRealTimers();
  });

  it("picks the latest-ending active ticket when multiple are active", async () => {
    jest.useFakeTimers();
    const now = new Date("2024-01-01T10:00:00.000Z");
    jest.setSystemTime(now);

    const tickets = [
      {
        id: "t1",
        status: "ACTIVE",
        createdAtISO: now.toISOString(),
        plate: "WX 11111",
        zone: "A",
        zoneName: "Strefa A",
        startISO: new Date(now.getTime() - 30 * 60000).toISOString(),
        endISO: new Date(now.getTime() + 5 * 60000).toISOString(),
        durationMin: 45,
        amount: 4.5,
        notifyBeforeEnd: true,
      },
      {
        id: "t2",
        status: "ACTIVE",
        createdAtISO: now.toISOString(),
        plate: "WX 22222",
        zone: "A",
        zoneName: "Strefa A",
        startISO: new Date(now.getTime() - 10 * 60000).toISOString(),
        endISO: new Date(now.getTime() + 20 * 60000).toISOString(),
        durationMin: 60,
        amount: 6,
        notifyBeforeEnd: true,
      },
    ];

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@parking_balance") {
        return Promise.resolve("20");
      }
      if (key === "@parking_tickets") {
        return Promise.resolve(JSON.stringify(tickets));
      }
      return Promise.resolve(null);
    });

    const { findByText, getByText } = renderWithTheme(
      <HomeScreen navigation={{ navigate: jest.fn() }} />
    );

    await findByText(/Aktywny/i);

    fireEvent.press(getByText(/Przed/i));

    await waitFor(() => {
      const calls = (AsyncStorage.setItem as jest.Mock).mock.calls;
      const ticketCall = calls.find(([key]) => key === "@parking_tickets");
      expect(ticketCall).toBeTruthy();
      const updated = JSON.parse(ticketCall?.[1] as string);
      const updatedT2 = updated.find((t: { id: string }) => t.id === "t2");
      expect(updatedT2.durationMin).toBe(75);
    });

    jest.useRealTimers();
  });

  it("shows earliest planned ticket countdown when multiple are planned", async () => {
    jest.useFakeTimers();
    const now = new Date("2024-01-01T10:00:00.000Z");
    jest.setSystemTime(now);

    const tickets = [
      {
        id: "p1",
        status: "ACTIVE",
        createdAtISO: now.toISOString(),
        plate: "WX 33333",
        zone: "A",
        zoneName: "Strefa A",
        startISO: new Date(now.getTime() + 10 * 60000).toISOString(),
        endISO: new Date(now.getTime() + 40 * 60000).toISOString(),
        durationMin: 30,
        amount: 3,
        notifyBeforeEnd: true,
      },
      {
        id: "p2",
        status: "ACTIVE",
        createdAtISO: now.toISOString(),
        plate: "WX 44444",
        zone: "A",
        zoneName: "Strefa A",
        startISO: new Date(now.getTime() + 20 * 60000).toISOString(),
        endISO: new Date(now.getTime() + 50 * 60000).toISOString(),
        durationMin: 30,
        amount: 3,
        notifyBeforeEnd: true,
      },
    ];

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@parking_balance") {
        return Promise.resolve("10");
      }
      if (key === "@parking_tickets") {
        return Promise.resolve(JSON.stringify(tickets));
      }
      return Promise.resolve(null);
    });

    const { findByText, getByText } = renderWithTheme(
      <HomeScreen navigation={{ navigate: jest.fn() }} />
    );

    await findByText(/Zaplanowany/i);

    expect(getByText(/Do startu: 00:0(9|10):/i)).toBeTruthy();

    jest.useRealTimers();
  });

  it("shows finished status when multiple tickets are in the past", async () => {
    jest.useFakeTimers();
    const now = new Date("2024-01-01T10:00:00.000Z");
    jest.setSystemTime(now);

    const tickets = [
      {
        id: "past-1",
        status: "EXPIRED",
        createdAtISO: new Date(now.getTime() - 90 * 60000).toISOString(),
        plate: "WX 55555",
        zone: "A",
        zoneName: "Strefa A",
        startISO: new Date(now.getTime() - 80 * 60000).toISOString(),
        endISO: new Date(now.getTime() - 60 * 60000).toISOString(),
        durationMin: 20,
        amount: 2,
        notifyBeforeEnd: true,
      },
      {
        id: "past-2",
        status: "EXPIRED",
        createdAtISO: new Date(now.getTime() - 50 * 60000).toISOString(),
        plate: "WX 66666",
        zone: "A",
        zoneName: "Strefa A",
        startISO: new Date(now.getTime() - 40 * 60000).toISOString(),
        endISO: new Date(now.getTime() - 20 * 60000).toISOString(),
        durationMin: 20,
        amount: 2,
        notifyBeforeEnd: true,
      },
    ];

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@parking_balance") {
        return Promise.resolve("5");
      }
      if (key === "@parking_tickets") {
        return Promise.resolve(JSON.stringify(tickets));
      }
      return Promise.resolve(null);
    });

    const { findByText, queryByText } = renderWithTheme(
      <HomeScreen navigation={{ navigate: jest.fn() }} />
    );

    await findByText(/Zako/i);

    expect(queryByText(/Przed/i)).toBeNull();

    jest.useRealTimers();
  });

  it("logs a warning when extend fails", async () => {
    jest.useFakeTimers();
    const now = new Date("2024-01-01T10:00:00.000Z");
    jest.setSystemTime(now);

    const ticket = {
      id: "1",
      status: "ACTIVE",
      createdAtISO: new Date(now.getTime() - 10 * 60000).toISOString(),
      plate: "WX 12345",
      zone: "A",
      zoneName: "Strefa A",
      startISO: new Date(now.getTime() - 5 * 60000).toISOString(),
      endISO: new Date(now.getTime() + 5 * 60000).toISOString(),
      durationMin: 60,
      amount: 6,
      notifyBeforeEnd: true,
    };

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce("10")
      .mockResolvedValueOnce(JSON.stringify([ticket]))
      .mockRejectedValueOnce(new Error("boom"));

    const { findByText, getByText } = renderWithTheme(
      <HomeScreen navigation={{ navigate: jest.fn() }} />
    );

    await findByText(/Aktywny/i);

    fireEvent.press(getByText(/Przed/i));

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalled();
    });

    warnSpy.mockRestore();
    jest.useRealTimers();
  });

  it("extends ticket when balance is sufficient", async () => {
    jest.useFakeTimers();
    const now = new Date("2024-01-01T10:00:00.000Z");
    jest.setSystemTime(now);

    const ticket = {
      id: "1",
      status: "ACTIVE",
      createdAtISO: new Date(now.getTime() - 10 * 60000).toISOString(),
      plate: "WX 12345",
      zone: "A",
      zoneName: "Strefa A",
      startISO: new Date(now.getTime() - 5 * 60000).toISOString(),
      endISO: new Date(now.getTime() + 5 * 60000).toISOString(),
      durationMin: 60,
      amount: 6,
      notifyBeforeEnd: true,
    };

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@parking_balance") {
        return Promise.resolve("10");
      }
      if (key === "@parking_tickets") {
        return Promise.resolve(JSON.stringify([ticket]));
      }
      return Promise.resolve(null);
    });

    const { findByText, getByText } = renderWithTheme(
      <HomeScreen navigation={{ navigate: jest.fn() }} />
    );

    await findByText(/Aktywny/i);

    fireEvent.press(getByText(/Przed/i));

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "@parking_balance",
        "8.5"
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "@parking_tickets",
        expect.stringContaining("\"durationMin\":75")
      );
    });

    jest.useRealTimers();
  });
});
