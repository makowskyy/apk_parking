import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScreenWrapper } from "../components";
import { ThemeColors, ThemeContext } from "../theme/ThemeContext";

const TICKETS_STORAGE_KEY = "@parking_tickets" as const;
const BALANCE_KEY = "@parking_balance" as const;

const ZONES = {
  A: { name: "Strefa A (centrum)", ratePerHour: 6.0 },
  B: { name: "Strefa B", ratePerHour: 4.0 },
  C: { name: "Strefa C", ratePerHour: 3.0 },
} as const;

type ZoneKey = keyof typeof ZONES;

type ParkingTicket = {
  id: string;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  createdAtISO: string;
  plate: string;
  zone: ZoneKey;
  zoneName?: string;
  startISO: string;
  endISO: string;
  durationMin: number;
  amount: number;
  notifyBeforeEnd: boolean;
};

function formatPLN(v: number): string {
  try {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      minimumFractionDigits: 2,
    }).format(v);
  } catch {
    const n = typeof v === "number" ? v.toFixed(2) : v;
    return `${n} PLN`;
  }
}

function formatCzasPostoju(czasPostoju?: number): string {
  const mins = Math.max(0, czasPostoju ?? 0);
  const godziny = Math.floor(mins / 60);
  const minuty = mins % 60;
  let wynik = "";
  if (godziny > 0) wynik += `${godziny} godz. `;
  if (minuty > 0) wynik += `${minuty} min.`;
  return wynik.trim() || "0 min.";
}

function formatDateTime(d: Date): string {
  try {
    return d.toLocaleString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return d.toString();
  }
}

function addMinutes(date: Date, minutes: number): Date {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

function ceilToQuarterMinutes(mins: number): number {
  const block = 15;
  return Math.ceil(mins / block) * block;
}

function computePricePLN(
  durationMinutes: number,
  ratePerHour: number
): { billable: number; price: number } {
  const billable = ceilToQuarterMinutes(Math.max(0, durationMinutes));
  const price = (billable / 60) * ratePerHour;
  return { billable, price: +price.toFixed(2) };
}

export async function extendTransactionTicket(
  tickets: ParkingTicket[],
  id: string,
  setTickets: (value: ParkingTicket[]) => void
): Promise<void> {
  const EXTENSION_MINUTES = 15;
  try {
    const target = tickets.find((t) => t.id === id);
    if (!target) return;

    const storedBalance = await AsyncStorage.getItem(BALANCE_KEY);
    const currentBalance = storedBalance ? parseFloat(storedBalance) : 0;

    const end = new Date(target.endISO);
    const newEnd = addMinutes(end, EXTENSION_MINUTES);
    const newDuration = (target.durationMin || 0) + EXTENSION_MINUTES;
    const zoneCfg = ZONES[target.zone] || { ratePerHour: 0 };
    const { price } = computePricePLN(newDuration, zoneCfg.ratePerHour);
    const extraCost = Math.max(0, price - target.amount);

    if (extraCost > currentBalance) {
      Alert.alert("Brak środków", "Doładuj saldo, aby przedłużyć bilet.");
      return;
    }

    const updated = tickets.map((t) =>
      t.id === id
        ? {
            ...t,
            endISO: newEnd.toISOString(),
            durationMin: newDuration,
            amount: price,
          }
        : t
    );

    setTickets(updated);
    await AsyncStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(updated));

    if (extraCost > 0) {
      const newBalance = +(currentBalance - extraCost).toFixed(2);
      await AsyncStorage.setItem(BALANCE_KEY, String(newBalance));
    }
  } catch (e) {
    console.warn("Nie udało się przedłużyć biletu", e);
  }
}

function isTicketActive(ticket: ParkingTicket): boolean {
  const now = new Date();
  const start = new Date(ticket.startISO);
  const end = new Date(ticket.endISO);
  return now >= start && now < end;
}

function isTicketFuture(ticket: ParkingTicket): boolean {
  const now = new Date();
  const start = new Date(ticket.startISO);
  return now < start;
}

function getRemainingMinutes(ticket: ParkingTicket): number {
  const now = new Date();
  const end = new Date(ticket.endISO);
  const diffMs = end.getTime() - now.getTime();
  const diffMin = Math.floor(diffMs / (60 * 1000));
  return diffMin > 0 ? diffMin : 0;
}

const ParkingTransactionsScreen: React.FC = () => {
  const { colors, isDark } = useContext(ThemeContext);
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [tickets, setTickets] = useState<ParkingTicket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    void loadTickets();
  }, []);

  async function loadTickets(): Promise<void> {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem(TICKETS_STORAGE_KEY);
      const parsed: ParkingTicket[] = stored ? JSON.parse(stored) : [];
      const sorted = parsed.sort(
        (a, b) =>
          new Date(b.startISO).getTime() - new Date(a.startISO).getTime()
      );
      setTickets(sorted);
    } catch (e) {
      console.warn("Nie udało się wczytać historii biletów", e);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleMoreInfo(id: string): void {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  async function handleExtend(id: string): Promise<void> {
    await extendTransactionTicket(tickets, id, setTickets);
  }

  const renderItem: ListRenderItem<ParkingTicket> = ({ item }) => {
    const active = isTicketActive(item);
    const future = isTicketFuture(item);
    const remaining = active ? getRemainingMinutes(item) : 0;
    const expanded = expandedId === item.id;

    const start = new Date(item.startISO);
    const end = new Date(item.endISO);

    let statusLabel = "Zakończony";
    let statusStyle = styles.statusEnded;
    if (future) {
      statusLabel = "Zaplanowany";
      statusStyle = styles.statusFuture;
    } else if (active) {
      statusLabel = "Aktywny";
      statusStyle = styles.statusActive;
    }

    return (
      <View style={styles.transactionContainer}>
        <Text style={styles.transactionText}>
          Data: {formatDateTime(start)}
        </Text>
        <Text style={styles.transactionText}>
          Pojazd: <Text style={styles.bold}>{item.plate}</Text>
        </Text>
        <Text style={styles.transactionText}>
          Strefa: {item.zone} • {item.zoneName || ZONES[item.zone]?.name}
        </Text>
        <Text style={styles.transactionText}>
          Kwota: {formatPLN(item.amount)}
        </Text>
        <Text style={styles.transactionText}>
          Czas postoju: {formatCzasPostoju(item.durationMin)}
        </Text>

        <View style={styles.statusRow}>
          <Text style={[styles.statusText, statusStyle]}>
            Status: {statusLabel}
          </Text>
          {active && (
            <Text style={styles.remainingText}>
              Pozostały czas: {remaining} min
            </Text>
          )}
        </View>

        <View style={styles.buttonsRow}>
          <Pressable
            onPress={() => toggleMoreInfo(item.id)}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>
              {expanded ? "Mniej informacji" : "Wiecej informacji"}
            </Text>
          </Pressable>

          {active && (
            <Pressable
              onPress={() => handleExtend(item.id)}
              style={({ pressed }) => [
                styles.button,
                styles.extendButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.buttonText}>Przedluz postoj</Text>
            </Pressable>
          )}
        </View>

        {expanded && (
          <View style={styles.moreInfoContainer}>
            <Text style={styles.moreInfoText}>ID biletu: {item.id}</Text>
            <Text style={styles.moreInfoText}>
              Okres: {formatDateTime(start)} - {formatDateTime(end)}
            </Text>
            <Text style={styles.moreInfoText}>
              Laczny czas: {formatCzasPostoju(item.durationMin)}
            </Text>
            <Text style={styles.moreInfoText}>
              Powiadomienie przed końcem: {item.notifyBeforeEnd ? "tak" : "nie"}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={styles.container}>
        <Text style={styles.title}>Historia biletów</Text>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.container}>
      <Text style={styles.title}>Historia biletów</Text>

      {tickets.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Brak zapisanych biletów.</Text>
        </View>
      ) : (
        <FlatList
          data={tickets}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
      </View>
    </ScreenWrapper>
  );
};

export default ParkingTransactionsScreen;

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 20,
    },
    title: {
      color: colors.text,
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 16,
      marginTop: 16,
      textAlign: "center",
    },
    listContainer: {
      paddingBottom: 20,
    },
    transactionContainer: {
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 10,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    transactionText: {
      color: colors.text,
      fontSize: 15,
      marginBottom: 4,
    },
    bold: {
      fontWeight: "700",
    },
    statusRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 5,
      marginBottom: 10,
    },
    statusText: {
      fontSize: 14,
      fontWeight: "bold",
    },
    statusActive: {
      color: colors.primary,
    },
    statusEnded: {
      color: "#FF5252",
    },
    statusFuture: {
      color: "#FFCA28",
    },
    remainingText: {
      color: colors.subtitle,
      fontSize: 14,
    },
    buttonsRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
    },
    button: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: isDark ? "#2f2f2f" : "#e8e8e8",
    },
    extendButton: {
      backgroundColor: colors.primary,
    },
    buttonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
    },
    moreInfoContainer: {
      marginTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 10,
    },
    moreInfoText: {
      color: colors.subtitle,
      fontSize: 14,
      marginBottom: 3,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyText: {
      color: colors.subtitle,
      fontSize: 16,
    },
    pressed: {
      opacity: 0.85,
    },
  });
