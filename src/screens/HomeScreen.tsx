import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Animated,
  Alert,
  FlatList,
  ListRenderItem,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenWrapper } from "../components";
import type { MainTabParamList } from "../navigation/types";
import { BALANCE_KEY } from "../services/storageKeys";
import {
  extendTicketInList,
  loadTickets,
  saveTickets,
} from "../services/ticketStorage";
import { ThemeColors, ThemeContext } from "../theme/ThemeContext";
import type { ParkingTicket } from "../types/parking";

const DRAWER_WIDTH = 260;

type HomeItem = {
  key: string;
  title: string;
  route: string;
};

const items: HomeItem[] = [
  { key: "3", title: "TicketScreen", route: "Ticket" },
  { key: "4", title: "Transaction", route: "Transaction" },
  { key: "5", title: "Wallet", route: "Wallet" },
  { key: "6", title: "Car", route: "Car" },
  { key: "7", title: "Map", route: "Map" },
  { key: "8", title: "UserProfile", route: "UserProfile" },
];

type HomeScreenProps = {
  navigation: BottomTabNavigationProp<MainTabParamList, "Home">;
};

export function pickTicketToDisplay(
  tickets: ParkingTicket[]
): ParkingTicket | null {
  if (!tickets.length) return null;

  const now = new Date();

  const activeTickets = tickets.filter((t) => {
    const start = new Date(t.startISO);
    const end = new Date(t.endISO);
    return now >= start && now < end;
  });

  if (activeTickets.length > 0) {
    activeTickets.sort(
      (a, b) => new Date(b.endISO).getTime() - new Date(a.endISO).getTime()
    );
    return activeTickets[0];
  }

  const plannedTickets = tickets.filter((t) => {
    const start = new Date(t.startISO);
    return start > now;
  });

  if (plannedTickets.length > 0) {
    plannedTickets.sort(
      (a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime()
    );
    return plannedTickets[0];
  }

  const sortedByStartDesc = [...tickets].sort(
    (a, b) => new Date(b.startISO).getTime() - new Date(a.startISO).getTime()
  );
  return sortedByStartDesc[0] ?? null;
}

export async function extendTicketFromStorage(
  lastTicket: ParkingTicket | null,
  setLastTicket: (ticket: ParkingTicket | null) => void,
  setBalance: (balance: number) => void
): Promise<void> {
  if (!lastTicket) return;

  try {
    const storedBalance = await AsyncStorage.getItem(BALANCE_KEY);
    const currentBalance = storedBalance ? parseFloat(storedBalance) : 0;

    const parsed = await loadTickets();
    const extension = extendTicketInList(parsed, lastTicket.id);
    if (!extension) return;
    const { updated, updatedTicket, extraCost } = extension;

    if (extraCost > currentBalance) {
      Alert.alert("Brak środków", "Doładuj saldo, aby przedłużyć bilet.");
      return;
    }

    await saveTickets(updated);
    setLastTicket(updatedTicket);

    if (extraCost > 0) {
      const newBalance = +(currentBalance - extraCost).toFixed(2);
      setBalance(newBalance);
      await AsyncStorage.setItem(BALANCE_KEY, String(newBalance));
    }
  } catch (e) {
    console.warn("Nie udało się przedłużyć biletu:", e);
  }
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useContext(ThemeContext);
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [ticketActive, setTicketActive] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [ticketLabel, setTicketLabel] = useState<string>("Brak");

  const [balance, setBalance] = useState<number>(0);
  const [lastTicket, setLastTicket] = useState<ParkingTicket | null>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  const openDrawer = () => {
    setIsDrawerOpen(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(slideAnim, {
      toValue: -DRAWER_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsDrawerOpen(false);
      }
    });
  };

  const toggleDrawer = () => {
    if (isDrawerOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadData = async () => {
        try {
          const storedBalance = await AsyncStorage.getItem(BALANCE_KEY);
          const parsed = await loadTickets();

          if (!isActive) return;

          setBalance(storedBalance !== null ? parseFloat(storedBalance) : 0);

          const ticketToShow =
            parsed.length > 0 ? pickTicketToDisplay(parsed) : null;
          setLastTicket(ticketToShow);
        } catch (e) {
          console.warn("Błąd wczytywania salda/biletu startowego:", e);
          setLastTicket(null);
        }
      };

      void loadData();

      return () => {
        isActive = false;
      };
    }, [])
  );

  useEffect(() => {
    if (!lastTicket) {
      setTicketActive(false);
      setTicketLabel("Brak");
      setSecondsLeft(0);
      return;
    }

    const updateStateFromTicket = () => {
      const now = new Date();
      const start = new Date(lastTicket.startISO);
      const end = new Date(lastTicket.endISO);

      if (now < start) {
        setTicketActive(false);
        setTicketLabel("Zaplanowany");
        const diffMs = start.getTime() - now.getTime();
        setSecondsLeft(Math.max(0, Math.floor(diffMs / 1000)));
      } else if (now >= start && now < end) {
        setTicketActive(true);
        setTicketLabel("Aktywny");
        const diffMs = end.getTime() - now.getTime();
        setSecondsLeft(Math.max(0, Math.floor(diffMs / 1000)));
      } else {
        setTicketActive(false);
        setTicketLabel("Zakończony");
        setSecondsLeft(0);
      }
    };

    updateStateFromTicket();
    const interval = setInterval(updateStateFromTicket, 1000);
    return () => clearInterval(interval);
  }, [lastTicket]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (v: number) => String(v).padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  const handleExtend = async () => {
    await extendTicketFromStorage(lastTicket, setLastTicket, setBalance);
  };

  const renderItem: ListRenderItem<HomeItem> = ({ item }) => {
    const isTicket = item.route === "Ticket";
    const isWallet = item.route === "Wallet";
    const isTransaction = item.route === "Transaction";
    const isCar = item.route === "Car";
    const isMap = item.route === "Map";
    const isUserProfile = item.route === "UserProfile";

    return (
      <Pressable
        style={({ pressed }) => [
          styles.tile,
          styles.StyleTile,
          pressed && styles.pressed,
        ]}
        onPress={() => navigation.navigate(item.route)}
      >
        {isTicket ? (
          <>
            <Icon name="ticket-outline" size={46} color={colors.primary} />
            <Text style={[styles.tileDesc, styles.StyleText]}>Kup bilet</Text>
          </>
        ) : isWallet ? (
          <>
            <Icon name="wallet-outline" size={46} color={colors.primary} />
            <Text style={[styles.tileDesc, styles.StyleText]}>Portfel</Text>
          </>
        ) : isTransaction ? (
          <>
            <Icon name="receipt-outline" size={46} color={colors.primary} />
            <Text style={[styles.tileDesc, styles.StyleText]}>
              Historia transakcji
            </Text>
          </>
        ) : isCar ? (
          <>
            <Icon name="car-outline" size={46} color={colors.primary} />
            <Text style={[styles.tileDesc, styles.StyleText]}>
              Dane pojazdów
            </Text>
          </>
        ) : isMap ? (
          <>
            <Icon name="map-outline" size={46} color={colors.primary} />
            <Text style={[styles.tileDesc, styles.StyleText]}>Lokalizacja</Text>
          </>
        ) : isUserProfile ? (
          <>
            <Icon name="person-circle-outline" size={46} color={colors.primary} />
            <Text style={[styles.tileDesc, styles.StyleText]}>Twój profil</Text>
          </>
        ) : (
          <>
            <Text style={styles.StyleTitle}>{item.title}</Text>
            <Text style={styles.tileDesc}>Przejdź do {item.title}</Text>
          </>
        )}
      </Pressable>
    );
  };

  return (
    <ScreenWrapper
      footer={
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(8, insets.bottom), paddingTop: 8 },
          ]}
        >
          <View style={styles.footerItem}>
            <Icon name="home" size={26} color={colors.primary} />
            <Text style={[styles.footerLabel, { color: colors.primary }]}>
              Home
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.footerItem,
              pressed && styles.pressed,
            ]}
            onPress={() => navigation.navigate("Settings")}
          >
            <Icon name="settings-outline" size={24} color={colors.subtitle} />
            <Text style={styles.footerLabel}>Ustawienia</Text>
          </Pressable>
        </View>
      }
    >
      <View style={styles.root}>
        <View style={styles.banner}>
          <View style={styles.bannerTopRow}>
            <Pressable
              style={({ pressed }) => [
                styles.menuButton,
                pressed && styles.pressed,
              ]}
              onPress={toggleDrawer}
              accessibilityLabel="Open info panel"
            >
              <Icon name="information-circle-outline" size={22} color="#fff" />
            </Pressable>

            <View>
              <Text style={styles.bannerLabel}>Saldo</Text>
              <Text style={styles.bannerValue}>{balance.toFixed(2)} zł</Text>
            </View>
          </View>

          <View style={styles.bannerBottomRow}>
            <View style={styles.bannerStatusRow}>
              <Text style={styles.bannerTicketStatus}>
                Bilet:{" "}
                <Text
                  style={{ color: ticketActive ? colors.primary : "#ff5252" }}
                >
                  {ticketLabel}
                </Text>
              </Text>

              {secondsLeft > 0 && (ticketActive || ticketLabel === "Zaplanowany") && (
                <Text style={styles.bannerTime}>
                  {ticketLabel === "Zaplanowany" ? "Do startu: " : "Do końca: "}
                  {formatTime(secondsLeft)}
                </Text>
              )}
            </View>

            {ticketActive && (
              <Pressable
                style={({ pressed }) => [
                  styles.extendButton,
                  pressed && styles.pressed,
                ]}
                onPress={handleExtend}
              >
                <Text style={styles.extendButtonText}>Przedłuż</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.content}>
          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={(it) => it.key}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContent}
          />
        </View>

        {isDrawerOpen && (
          <View style={styles.drawerOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={closeDrawer}
              accessibilityLabel="Close info panel"
            />

            <Animated.View
              style={[
                styles.drawer,
                {
                  transform: [{ translateX: slideAnim }],
                  paddingTop: insets.top + 16,
                  paddingBottom: Math.max(16, insets.bottom + 8),
                },
              ]}
            >
              <Text style={styles.drawerTitle}>Informacje</Text>
              <Text style={styles.drawerText}>
                Dodatkowe informacje o koncie i aplikacji. Zamknij klikając
                poza panelem.
              </Text>
            </Animated.View>
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
};

export default HomeScreen;

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    banner: {
      paddingHorizontal: 22,
      paddingVertical: 12,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    bannerLeft: {
      flex: 1,
      justifyContent: "center",
    },
    bannerLeftRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    menuButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 20,
      backgroundColor: isDark ? "#242424" : "#f1f1f1",
    },
    bannerRight: {
      marginTop: 8,
      alignItems: "flex-end",
    },
    bannerLabel: {
      color: colors.subtitle,
      fontSize: 13,
      marginBottom: 4,
    },
    bannerValue: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "700",
    },

    bannerStatusRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    bannerTicketStatus: {
      color: colors.text,
      fontSize: 18,
    },
    bannerTime: {
      color: colors.subtitle,
      fontSize: 14,
      marginLeft: 12,
    },
    bannerTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
    },

    bannerBottomRow: {
      marginTop: 10,
      alignItems: "flex-end",
    },
    extendButton: {
      marginTop: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    extendButtonText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: "600",
    },

    content: {
      flex: 1,
    },

    listContent: {
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 40,
    },
    row: {
      justifyContent: "space-between",
      marginBottom: 16,
    },

    tile: {
      width: "48%",
      aspectRatio: 1,
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 2,
      justifyContent: "center",
    },
    StyleTile: {
      alignItems: "center",
      justifyContent: "center",
    },
    StyleText: {
      marginTop: 8,
      textAlign: "center",
    },
    StyleTitle: {
      color: colors.primary,
      fontSize: 18,
      fontWeight: "800",
      marginBottom: 6,
    },
    tileDesc: {
      color: colors.subtitle,
      fontSize: 15,
    },

    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      paddingHorizontal: 24,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.card,
    },
    footerItem: {
      alignItems: "center",
      justifyContent: "center",
    },
    footerLabel: {
      marginTop: 2,
      fontSize: 11,
      color: colors.subtitle,
    },

    drawerOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.08)",
    },
    drawer: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      width: DRAWER_WIDTH,
      backgroundColor: colors.card,
      paddingHorizontal: 16,
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    drawerTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 12,
    },
    drawerText: {
      color: colors.subtitle,
      fontSize: 14,
      lineHeight: 20,
    },
    pressed: {
      opacity: 0.85,
    },
  });
