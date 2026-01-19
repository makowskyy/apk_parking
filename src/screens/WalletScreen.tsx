import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useContext, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ListRenderItem,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenWrapper } from "../components";
import { BALANCE_KEY, HISTORY_KEY } from "../services/storageKeys";
import { ThemeColors, ThemeContext } from "../theme/ThemeContext";
type TopUpEntry = {
  id: string;
  amount: number;
  date: string;
};

const WalletScreen: React.FC = () => {
  const { colors, isDark } = useContext(ThemeContext);
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [balance, setBalance] = useState<number>(0);
  const [amount, setAmount] = useState<string>("10");
  const [history, setHistory] = useState<TopUpEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadData = async () => {
        try {
          const storedBalance = await AsyncStorage.getItem(BALANCE_KEY);
          const storedHistory = await AsyncStorage.getItem(HISTORY_KEY);

          if (isActive) {
            if (storedBalance !== null) {
              setBalance(parseFloat(storedBalance));
            } else {
              setBalance(0);
            }

            if (storedHistory !== null) {
              setHistory(JSON.parse(storedHistory));
            } else {
              setHistory([]);
            }
          }
        } catch (e) {
          console.warn("Błąd wczytywania danych płatności:", e);
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };

      setLoading(true);
      void loadData();

      return () => {
        isActive = false;
      };
    }, [])
  );

  const saveBalance = async (newBalance: number): Promise<void> => {
    try {
      await AsyncStorage.setItem(BALANCE_KEY, String(newBalance));
    } catch (e) {
      console.warn("Błąd zapisu salda:", e);
    }
  };

  const saveHistory = async (newHistory: TopUpEntry[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.warn("Błąd zapisu historii:", e);
    }
  };

  const handleTopUp = async (): Promise<void> => {
    const normalized = amount.replace(",", ".");
    const value = parseFloat(normalized);

    if (Number.isNaN(value) || value <= 0) {
      Alert.alert("Błąd", "Wpisz prawidłową kwotę doładowania.");
      return;
    }

    const newBalance = balance + value;
    setBalance(newBalance);

    const now = new Date();
    const newEntry: TopUpEntry = {
      id: Date.now().toString(),
      amount: value,
      date: now.toLocaleString("pl-PL"),
    };

    const newHistory = [newEntry, ...history];
    setHistory(newHistory);

    await saveBalance(newBalance);
    await saveHistory(newHistory);
  };

  const renderItem: ListRenderItem<TopUpEntry> = ({ item }) => (
    <View style={styles.historyItem}>
      <Text style={styles.historyAmount}>{item.amount.toFixed(2)} zł</Text>
      <Text style={styles.historyDate}>{item.date}</Text>
    </View>
  );

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={styles.root}>
          <View
            style={[styles.container, { justifyContent: "center", alignItems: "center" }]}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.text, marginTop: 10 }}>
              Wczytywanie danych...
            </Text>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.root}>
        <View style={styles.container}>
          <View style={styles.balanceContainer}>
            <View style={styles.balanceRow}>
              <MaterialCommunityIcons
                name="wallet"
                size={28}
                color={colors.primary}
                style={{ marginRight: 10 }}
              />
              <Text style={styles.balanceLabel}>Dostępne saldo</Text>
            </View>
            <Text style={styles.balanceValue}>{balance.toFixed(2)} zł</Text>
          </View>

          <View style={styles.topUpContainer}>
            <Text style={styles.sectionTitle}>Doładuj konto</Text>

            <View style={styles.amountRow}>
              <TextInput
                style={styles.amountInput}
                keyboardType="numeric"
                placeholder="Kwota"
                placeholderTextColor={colors.subtitle}
                value={amount}
                onChangeText={setAmount}
              />
              <Text style={styles.amountCurrency}>zł</Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.topUpButton,
                pressed && styles.pressed,
              ]}
              onPress={handleTopUp}
            >
              <Text style={styles.topUpButtonText}>Doładuj</Text>
            </Pressable>
          </View>

          <View style={styles.historyContainer}>
            <Text style={styles.sectionTitle}>Historia doładowań</Text>

            <FlatList
              data={history}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <Text style={styles.emptyHistory}>
                  Brak zarejestrowanych doładowań.
                </Text>
              }
            />
          </View>
        </View>
      </View>
    </ScreenWrapper>
  );
};

export default WalletScreen;

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 20,
    },
    balanceContainer: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      marginTop: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    balanceRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    balanceLabel: {
      color: colors.subtitle,
      fontSize: 16,
    },
    balanceValue: {
      color: colors.text,
      fontSize: 28,
      fontWeight: "bold",
    },
    topUpContainer: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 12,
    },
    amountRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    amountInput: {
      flex: 1,
      backgroundColor: isDark ? "#2a2a2a" : "#f4f4f4",
      color: colors.text,
      padding: 12,
      borderRadius: 8,
      fontSize: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    amountCurrency: {
      color: colors.text,
      fontSize: 16,
      marginLeft: 8,
    },
    topUpButton: {
      backgroundColor: colors.primary,
      padding: 14,
      borderRadius: 10,
      alignItems: "center",
      marginTop: 4,
    },
    topUpButtonText: {
      color: "#0b2b13",
      fontSize: 16,
      fontWeight: "600",
    },
    historyContainer: {
      flex: 1,
    },
    historyItem: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    historyAmount: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "500",
    },
    historyDate: {
      color: colors.subtitle,
      fontSize: 13,
    },
    emptyHistory: {
      color: colors.subtitle,
      fontSize: 14,
      marginTop: 8,
    },
    pressed: {
      opacity: 0.85,
    },
  });
