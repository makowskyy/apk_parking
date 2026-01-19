import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  Pressable,
  View,
} from "react-native";
import * as Notifications from "expo-notifications";
import appConfig from "../../app.json";
import { ScreenWrapper } from "../components";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { MainTabParamList } from "../navigation/types";
import { ThemeColors, ThemeContext } from "../theme/ThemeContext";

const GREEN = "#8BC34A";
const LOGOUT_COLOR = "#c53b3bff";
const APP_VERSION = appConfig.expo?.version ?? "1.0.0";
const NOTIFICATION_CHANNEL_ID = "default";

const ensureNotificationChannelAsync = async () => {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
    name: "Default",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
};

const requestNotificationPermissionsAsync = async () => {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return true;

  const { status: requestStatus } =
    await Notifications.requestPermissionsAsync();

  return requestStatus === "granted";
};

const notifyNotificationsEnabledAsync = async () => {
  const permissionGranted = await requestNotificationPermissionsAsync();
  if (!permissionGranted) return;

  await ensureNotificationChannelAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Powiadomienia",
      body: "wlaczone",
    },
    trigger: null,
  });
};

type SettingsScreenProps = {
  navigation: BottomTabNavigationProp<MainTabParamList, "Settings">;
  onLogout?: () => void;
};

const SettingsScreen: React.FC<SettingsScreenProps> = ({
  navigation,
  onLogout,
}) => {
  const {
    isDark,
    forceDark,
    setForceDark,
    biometricsEnabled,
    setBiometricsEnabled,
    notificationsEnabled,
    setNotificationsEnabled,
    colors,
  } = useContext(ThemeContext);

  const initialSettingsRef = useRef({
    forceDark,
    biometricsEnabled,
    notificationsEnabled,
  });

  const [draftForceDark, setDraftForceDark] = useState(forceDark);
  const [draftBiometricsEnabled, setDraftBiometricsEnabled] =
    useState(biometricsEnabled);
  const [draftNotificationsEnabled, setDraftNotificationsEnabled] =
    useState(notificationsEnabled);

  useEffect(() => {
    setDraftForceDark(forceDark);
    setDraftBiometricsEnabled(biometricsEnabled);
    setDraftNotificationsEnabled(notificationsEnabled);
    initialSettingsRef.current = {
      forceDark,
      biometricsEnabled,
      notificationsEnabled,
    };
  }, [forceDark, biometricsEnabled, notificationsEnabled]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleDarkModeToggle = (value: boolean) => setDraftForceDark(value);
  const handleBiometricsToggle = (value: boolean) =>
    setDraftBiometricsEnabled(value);
  const handleNotificationsToggle = (value: boolean) =>
    setDraftNotificationsEnabled(value);
  const handleLogout = () => {
    onLogout?.();
  };
  const handleCancel = () => {
    const {
      forceDark: initialForceDark,
      biometricsEnabled: initialBiometrics,
      notificationsEnabled: initialNotifications,
    } = initialSettingsRef.current;

    setDraftForceDark(initialForceDark);
    setDraftBiometricsEnabled(initialBiometrics);
    setDraftNotificationsEnabled(initialNotifications);
    navigation.goBack();
  };
  const handleSave = async () => {
    const shouldNotifyEnabled =
      !notificationsEnabled && draftNotificationsEnabled;

    setForceDark(draftForceDark);
    setBiometricsEnabled(draftBiometricsEnabled);
    setNotificationsEnabled(draftNotificationsEnabled);

    if (shouldNotifyEnabled) {
      try {
        await notifyNotificationsEnabledAsync();
      } catch (error) {
        console.warn("Nie udalo sie wyslac powiadomienia", error);
      }
    }

    navigation.goBack();
  };

  return (
    <ScreenWrapper
      footer={
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.btn,
              styles.btnOutline,
              pressed && styles.pressed,
            ]}
            onPress={handleCancel}
          >
            <Text style={[styles.btnText, styles.btnTextOutline]}>Anuluj</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
            onPress={handleSave}
          >
            <Text style={styles.btnText}>Zapisz i wróć</Text>
          </Pressable>
        </View>
      }
    >
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ustawienia</Text>
          <Text style={styles.headerSubtitle}>
            Dostosuj działanie aplikacji do swoich potrzeb
          </Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.sectionTitle}>Ogólne</Text>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Tryb ciemny</Text>
              <Text style={styles.rowSubtitle}>
                Włącz, aby wymusić ciemny motyw. Gdy wyłączone, używany jest
                motyw systemowy.
              </Text>
            </View>
            <Switch
              value={draftForceDark}
              onValueChange={handleDarkModeToggle}
              thumbColor={draftForceDark ? GREEN : "#f4f3f4"}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Powiadomienia</Text>
              <Text style={styles.rowSubtitle}>
                Zezwol na wysylanie przypomnien o parkowaniu i alertow.
              </Text>
            </View>
            <Switch
              value={draftNotificationsEnabled}
              onValueChange={handleNotificationsToggle}
              thumbColor={draftNotificationsEnabled ? GREEN : "#f4f3f4"}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Wersja aplikacji</Text>
              <Text style={styles.rowSubtitle}>
                Aktualnie zainstalowana wersja aplikacji.
              </Text>
            </View>
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>v{APP_VERSION}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Polityka prywatności</Text>
              <Text style={styles.rowSubtitle}>
                Korzystając z aplikacji, wyrażasz zgodę na naszą politykę
                prywatności.
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Bezpieczeństwo</Text>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Logowanie biometryczne</Text>
              <Text style={styles.rowSubtitle}>
                Używaj odcisku palca lub Face ID (jeśli dostępne), aby szybciej
                się logować.
              </Text>
            </View>
            <Switch
              value={draftBiometricsEnabled}
              onValueChange={handleBiometricsToggle}
              thumbColor={draftBiometricsEnabled ? GREEN : "#f4f3f4"}
            />
          </View>

          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.row,
              styles.logoutRow,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, styles.logoutText]}>Wyloguj</Text>
              <Text style={[styles.rowSubtitle, styles.logoutText]}>
                Powrot do ekranu startowego i zakonczenie sesji.
              </Text>
            </View>
          </Pressable>
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
};

export default SettingsScreen;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 24,
      fontWeight: "800",
      marginBottom: 4,
    },
    headerSubtitle: {
      color: colors.subtitle,
      fontSize: 13,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    sectionTitle: {
      color: colors.subtitle,
      fontSize: 13,
      fontWeight: "700",
      marginTop: 20,
      marginBottom: 8,
      textTransform: "uppercase",
    },
    row: {
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    rowText: {
      flex: 1,
      paddingRight: 12,
    },
    rowTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
      marginBottom: 2,
    },
    rowSubtitle: {
      color: colors.subtitle,
      fontSize: 12,
    },
    versionBadge: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      minWidth: 64,
      alignItems: "center",
    },
    versionText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "800",
    },
    footer: {
      flexDirection: "row",
      padding: 16,
      gap: 12,
      backgroundColor: colors.background,
    },
    btn: {
      flex: 1,
      backgroundColor: GREEN,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    btnOutline: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: GREEN,
    },
    btnText: {
      color: "#0B2B13",
      fontSize: 14,
      fontWeight: "800",
    },
    btnTextOutline: {
      color: GREEN,
    },
    logoutRow: {
      backgroundColor: "rgba(211,47,47,0.08)",
      borderColor: LOGOUT_COLOR,
    },
    logoutText: {
      color: LOGOUT_COLOR,
    },
    pressed: {
      opacity: 0.85,
    },
  });
