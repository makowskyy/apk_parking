import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Alert,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  Pressable,
  View,
} from "react-native";

import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import { ZONES, type ZoneKey } from "../constants/zones";
import { ThemeColors, ThemeContext } from "../theme/ThemeContext";
import { ScreenWrapper } from "@/components";
import { getSavedUser } from "../services/authStorage";
import {
  defaultUserProfile as defaultProfile,
  fetchUserProfile,
  patchUserProfile,
  updateUserProfile,
  type UserProfile,
} from "../services/userProfileApi";

type PaymentType = "CARD" | "BLIK";

type UserProfileScreenProps = {
  navigation?: {
    goBack?: () => void;
  };
};

type ChipProps = {
  selected: boolean;

  onPress: () => void;

  children: React.ReactNode;
};

const UserProfileScreen: React.FC<UserProfileScreenProps> = ({
  navigation,
}) => {
  const { colors, isDark } = useContext(ThemeContext);

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const zoneKeys = useMemo(() => Object.keys(ZONES) as ZoneKey[], []);

  const Card: React.FC<{ children: React.ReactNode; style?: object }> = ({
    children,

    style,
  }) => <View style={[styles.card, style]}>{children}</View>;

  const Chip: React.FC<ChipProps> = ({ selected, onPress, children }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,

        selected && styles.chipSelected,

        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {children}
      </Text>
    </Pressable>
  );

  const [profile, setProfile] = useState<UserProfile>(defaultProfile);

  const [defaultDurationInput, setDefaultDurationInput] =
    useState<string>(String(defaultProfile.defaultDurationMin));

  const [loading, setLoading] = useState<boolean>(true);

  const [saving, setSaving] = useState<boolean>(false);

  const userIdRef = useRef<number | string | null>(null);

  const fullNameRef = useRef<string>("");

  const emailRef = useRef<string>("");

  const phoneRef = useRef<string>("");
  const durationRef = useRef<string>("");
  const cardLast4Ref = useRef<string>("");
  const blikAliasRef = useRef<string>("");

  // tryb edycji danych osobowych

  const [isEditingPersonal, setIsEditingPersonal] = useState<boolean>(false);

  const [personalDraft, setPersonalDraft] = useState<{
    fullName: string;

    email: string;

    phone: string;
  }>({
    fullName: "",

    email: "",

    phone: "",
  });

  // stan formularza płatności

  const [showPaymentForm, setShowPaymentForm] = useState<boolean>(false);

  const [paymentType, setPaymentType] = useState<PaymentType>("CARD");

  const [cardLast4, setCardLast4] = useState<string>("");

  const [blikAlias, setBlikAlias] = useState<string>("");

  useEffect(() => {
    let active = true;

    const applyProfile = (nextProfile: UserProfile): void => {
      if (!active) return;

      setProfile(nextProfile);

      setPersonalDraft({
        fullName: nextProfile.fullName ?? "",
        email: nextProfile.email ?? "",
        phone: nextProfile.phone ?? "",
      });

      const loadedDuration = String(
        nextProfile.defaultDurationMin ?? defaultProfile.defaultDurationMin
      );
      setDefaultDurationInput(loadedDuration);
      durationRef.current = loadedDuration;
    };

    (async () => {
      const savedSession = await getSavedUser();
      const savedEmail = savedSession?.email ?? "";
      const savedFullName = savedSession?.name ?? "";

      userIdRef.current = savedSession?.id ?? null;

      const fallbackProfile: UserProfile = {
        ...defaultProfile,
        email: savedEmail,
        fullName: savedFullName,
      };

      try {
        if (savedSession?.id == null) {
          applyProfile(fallbackProfile);
          return;
        }

        const remoteProfile = await fetchUserProfile(savedSession.id, {
          email: savedEmail,
          fullName: savedFullName,
        });

        applyProfile(remoteProfile);
      } catch (e) {
        applyProfile(fallbackProfile);
        console.warn("Nie udało się wczytać profilu użytkownika", e);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    fullNameRef.current = personalDraft.fullName;

    emailRef.current = personalDraft.email;

    phoneRef.current = personalDraft.phone;
  }, [personalDraft.fullName, personalDraft.email, personalDraft.phone]);

  useEffect(() => {
    durationRef.current = defaultDurationInput;
    cardLast4Ref.current = cardLast4;
    blikAliasRef.current = blikAlias;
  }, [defaultDurationInput, cardLast4, blikAlias]);

  const applyPartialUpdate = useCallback(
    async (partial: Partial<UserProfile>) => {
      const userId = userIdRef.current;
      if (userId == null) return;

      try {
        const updated = await patchUserProfile(userId, partial);
        setProfile(updated);
      } catch (e) {
        console.warn("Nie udało się zapisać zmian cząstkowych", e);
      }
    },
    []
  );

  const handleSelectZone = useCallback((z: ZoneKey) => {
    setProfile((p) => ({ ...p, defaultZone: z }));
  }, []);

  const handleNotifyToggle = useCallback((v: boolean) => {
    setProfile((p) => ({ ...p, notifyBeforeEnd: v }));
    void applyPartialUpdate({ notifyBeforeEnd: v });
  }, [applyPartialUpdate]);

  const handleMarketingToggle = useCallback((v: boolean) => {
    setProfile((p) => ({ ...p, allowMarketing: v }));
    void applyPartialUpdate({ allowMarketing: v });
  }, [applyPartialUpdate]);

  const toggleEditingPersonal = useCallback(() => {
    setIsEditingPersonal((v) => {
      const next = !v;

      if (!v) {
        setPersonalDraft({
          fullName: profile.fullName,

          email: profile.email,

          phone: profile.phone,
        });

        fullNameRef.current = profile.fullName;

        emailRef.current = profile.email;

        phoneRef.current = profile.phone;
      } else {
        const updatedDraft = {
          fullName: fullNameRef.current || personalDraft.fullName,
          email: emailRef.current || personalDraft.email,
          phone: phoneRef.current || personalDraft.phone,
        };
        setPersonalDraft(updatedDraft);
        setProfile((p) => ({
          ...p,
          ...updatedDraft,
        }));
      }
      return next;
    });
  }, [
    personalDraft.fullName,
    personalDraft.email,
    personalDraft.phone,
    profile.email,
    profile.fullName,
    profile.phone,
  ]);

  const initials = useMemo(() => {
    const name = profile.fullName?.trim() || "";

    if (!name) return "🅿️";

    const parts = name.split(/\s+/);

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return (
      (parts[0][0] ?? "").toUpperCase() +
      (parts[parts.length - 1][0] ?? "").toUpperCase()
    );
  }, [profile.fullName]);

  async function handleSave(): Promise<void> {
    const userId = userIdRef.current;
    if (userId == null) {
      Alert.alert("Blad", "Brak zalogowanego uzytkownika.");
      return;
    }

    setSaving(true);

    try {
      const nextPersonal = {
        fullName: fullNameRef.current || personalDraft.fullName,

        email: emailRef.current || personalDraft.email,

        phone: phoneRef.current || personalDraft.phone,
      };

      const parsed = parseInt(
        durationRef.current || defaultDurationInput || "60",
        10
      );

      const normalized = isNaN(parsed) ? 60 : parsed;

      const clamped = Math.min(8 * 60, Math.max(15, normalized));

      const toSave: UserProfile = {
        ...profile,

        ...nextPersonal,

        defaultDurationMin: clamped,
      };

      const updated = await updateUserProfile(userId, toSave);

      setProfile(updated);

      setPersonalDraft({
        fullName: updated.fullName,
        email: updated.email,
        phone: updated.phone,
      });

      setDefaultDurationInput(String(updated.defaultDurationMin));

      setIsEditingPersonal(false);

      Alert.alert("Zapisano", "Profil użytkownika został zaktualizowany.");
    } catch (e) {
      console.error(e);

      Alert.alert("Błąd", "Nie udało się zapisać profilu. Spróbuj ponownie.");
    } finally {
      setSaving(false);
    }
  }

  function applyPaymentMethod(): void {
    if (paymentType === "CARD") {
      const last4Clean = (cardLast4Ref.current || cardLast4 || "")
        .replace(/[^\d]/g, "")
        .slice(-4);

      if (!last4Clean) {
        Alert.alert("Karta", "Podaj ostatnie cyfry karty (np. 1234).");

        return;
      }

      const label = `Karta **** ${last4Clean}`;

      setProfile((p) => ({
        ...p,

        paymentMethodLabel: label,
      }));

      setCardLast4(last4Clean);
    } else {
      const alias = (blikAliasRef.current || blikAlias || "").trim();

      if (!alias) {
        Alert.alert("BLIK", "Podaj opis lub alias dla BLIK (np. Mój BLIK).");

        return;
      }

      const label = `BLIK - ${alias}`;

      setProfile((p) => ({
        ...p,

        paymentMethodLabel: label,
      }));

      setBlikAlias(alias);
    }

    setShowPaymentForm(false);
  }

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={{ color: colors.text }}>Wczytywanie profilu...</Text>
      </View>
    );
  }

  return (
    <ScreenWrapper>
      <KeyboardAwareScrollView
        style={styles.screen}
        contentContainerStyle={[styles.container, { flexGrow: 1 }]}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
        enableOnAndroid
        enableResetScrollToCoords={false}
        extraScrollHeight={24}
        keyboardOpeningTime={0}
      >
        <Text style={styles.heading}>Profil użytkownika</Text>

        <Card style={styles.avatarCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.avatarName}>
              {profile.fullName || "Twoje imię i nazwisko"}
            </Text>

            <Text style={styles.avatarSubtitle}>
              {profile.email
                ? profile.email
                : "Dodaj adres e-mail, aby otrzymywać potwierdzenia"}
            </Text>
          </View>
        </Card>

        <Card>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.label}>Dane osobowe</Text>

            <Pressable
              onPress={toggleEditingPersonal}
              style={({ pressed }) => [
                styles.editToggleBtn,

                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.editToggleText}>
                {isEditingPersonal ? "Zakończ edycję" : "Edytuj dane"}
              </Text>
            </Pressable>
          </View>

          {!isEditingPersonal ? (
            <>
              <View style={styles.readonlyRow}>
                <Text style={styles.readonlyLabel}>Imię i nazwisko</Text>

                <Text style={styles.readonlyValue}>
                  {profile.fullName || "Nie podano"}
                </Text>
              </View>

              <View style={styles.readonlyRow}>
                <Text style={styles.readonlyLabel}>Adres e-mail</Text>

                <Text style={styles.readonlyValue}>
                  {profile.email || "Nie podano"}
                </Text>
              </View>

              <View style={styles.readonlyRow}>
                <Text style={styles.readonlyLabel}>Telefon</Text>

                <Text style={styles.readonlyValue}>
                  {profile.phone || "Nie podano"}
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Imię i nazwisko</Text>

              <TextInput
                defaultValue={personalDraft.fullName}
                style={styles.input}
                placeholder="Np. Jan Kowalski"
                placeholderTextColor={colors.subtitle}
                onChangeText={(text) => {
                  fullNameRef.current = text;
                }}
              />

              <Text style={styles.fieldLabel}>Adres e-mail</Text>

              <TextInput
                style={styles.input}
                placeholder="np. jan.kowalski@example.com"
                placeholderTextColor={colors.subtitle}
                keyboardType="email-address"
                autoCapitalize="none"
                defaultValue={personalDraft.email}
                onChangeText={(text) => {
                  emailRef.current = text;
                }}
              />

              <Text style={styles.fieldLabel}>Telefon</Text>

              <TextInput
                style={styles.input}
                placeholder="np. 500 600 700"
                placeholderTextColor={colors.subtitle}
                keyboardType="phone-pad"
                defaultValue={personalDraft.phone}
                onChangeText={(text) => {
                  phoneRef.current = text;
                }}
              />
            </>
          )}
        </Card>

        <Card>
          <Text style={styles.label}>Preferencje parkowania</Text>

          <Text style={styles.fieldLabel}>Domyślna strefa parkowania</Text>

          <View style={styles.rowWrap}>
            {zoneKeys.map((z) => (
              <Chip
                key={z}
                selected={profile.defaultZone === z}
                onPress={() => handleSelectZone(z)}
              >
                {z} • {ZONES[z].name}
              </Chip>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Domyślny czas biletu</Text>

          <View style={styles.inlineRow}>
            <TextInput
              style={[styles.input, styles.inputSmall]}
              placeholder="min"
              placeholderTextColor={colors.subtitle}
              keyboardType="number-pad"
              defaultValue={defaultDurationInput}
              onChangeText={(text) => {
                durationRef.current = text.replace(/[^\d]/g, "");
              }}
            />

            <Text style={styles.inlineSuffix}>min (15–480)</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.reminderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.reminderTitle}>
                Przypomnij przed końcem biletu
              </Text>

              <Text style={styles.hint}>
                Używane jako domyślna opcja na ekranie zakupu biletu.
              </Text>
            </View>

            <Switch
              value={profile.notifyBeforeEnd}
              onValueChange={handleNotifyToggle}
              thumbColor={
                profile.notifyBeforeEnd ? colors.primary : colors.border
              }
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
        </Card>

        <Card>
          <Text style={styles.label}>Płatności</Text>

          {profile.paymentMethodLabel ? (
            <Text style={styles.paymentSummary}>
              Wybrany sposób płatności:{" "}
              <Text style={{ fontWeight: "700" }}>
                {profile.paymentMethodLabel}
              </Text>
            </Text>
          ) : (
            <Text style={styles.hint}>
              Brak zapisanego sposobu płatności. Dodaj go, aby szybciej opłacać
              bilety.
            </Text>
          )}

          {!showPaymentForm && (
            <Pressable
              style={({ pressed }) => [
                styles.paymentBtn,

                pressed && styles.pressed,
              ]}
              onPress={() => setShowPaymentForm(true)}
            >
              <Text style={styles.paymentBtnText}>
                Dodaj / zmień sposób płatności
              </Text>
            </Pressable>
          )}

          {showPaymentForm && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.fieldLabel}>Rodzaj płatności</Text>

              <View style={styles.rowWrap}>
                <Chip
                  selected={paymentType === "CARD"}
                  onPress={() => setPaymentType("CARD")}
                >
                  Karta płatnicza
                </Chip>

                <Chip
                  selected={paymentType === "BLIK"}
                  onPress={() => setPaymentType("BLIK")}
                >
                  BLIK
                </Chip>
              </View>

              {paymentType === "CARD" ? (
                <>
                  <Text style={styles.fieldLabel}>Ostatnie cyfry karty</Text>

                  <TextInput
                    style={styles.input}
                    placeholder="np. 1234"
                    placeholderTextColor={colors.subtitle}
                    keyboardType="number-pad"
                    maxLength={4}
                    defaultValue={cardLast4}
                    onChangeText={(t) => {
                      cardLast4Ref.current = t.replace(/[^\d]/g, "");
                    }}
                  />

                  <Text style={styles.hint}>
                    Dla bezpieczeństwa zapisujemy tylko opis i ostatnie cyfry
                    karty.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.fieldLabel}>Opis / alias BLIK</Text>

                  <TextInput
                    style={styles.input}
                    placeholder="np. Mój BLIK"
                    placeholderTextColor={colors.subtitle}
                    defaultValue={blikAlias}
                    onChangeText={(text) => {
                      blikAliasRef.current = text;
                    }}
                  />
                </>
              )}

              <View style={styles.paymentActionsRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.paymentGhostBtn,

                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    setShowPaymentForm(false);
                  }}
                >
                  <Text style={styles.paymentGhostText}>Anuluj</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.paymentApplyBtn,

                    pressed && styles.pressed,
                  ]}
                  onPress={applyPaymentMethod}
                >
                  <Text style={styles.paymentApplyText}>Zastosuj</Text>
                </Pressable>
              </View>
            </View>
          )}
        </Card>

        <Card>
          <Text style={styles.label}>Komunikacja</Text>

          <View style={styles.reminderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.reminderTitle}>
                Oferty i komunikacja marketingowa
              </Text>

              <Text style={styles.hint}>
                Okazjonalne powiadomienia o nowych funkcjach i promocjach.
              </Text>
            </View>

            <Switch
              value={profile.allowMarketing}
              onValueChange={handleMarketingToggle}
              thumbColor={profile.allowMarketing ? colors.primary : colors.border}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
        </Card>

        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,

            saving && { opacity: 0.7 },

            pressed && styles.pressed,
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveText}>
            {saving ? "Zapisywanie..." : "Zapisz zmiany"}
          </Text>
        </Pressable>

        <View style={{ height: 28 }} />
      </KeyboardAwareScrollView>
    </ScreenWrapper>
  );
};

export default UserProfileScreen;

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },

    container: { padding: 16, paddingBottom: 40 },

    heading: {
      color: colors.text,

      fontSize: 28,

      fontWeight: "800",

      marginBottom: 16,
    },

    center: {
      alignItems: "center",

      justifyContent: "center",
    },

    card: {
      backgroundColor: colors.card,

      borderRadius: 14,

      padding: 16,

      marginBottom: 12,

      borderWidth: 1,

      borderColor: colors.border,
    },

    avatarCard: {
      flexDirection: "row",

      alignItems: "center",

      gap: 12,
    },

    avatarCircle: {
      width: 64,

      height: 64,

      borderRadius: 32,

      backgroundColor: isDark ? "#1e1e1e" : "#f4f4f4",

      borderWidth: 1,

      borderColor: colors.border,

      alignItems: "center",

      justifyContent: "center",

      marginRight: 12,
    },

    avatarInitials: {
      color: colors.text,

      fontSize: 24,

      fontWeight: "800",
    },

    avatarName: {
      color: colors.text,

      fontSize: 18,

      fontWeight: "700",
    },

    avatarSubtitle: {
      color: colors.subtitle,

      fontSize: 13,

      marginTop: 2,
    },

    label: {
      color: colors.subtitle,

      fontSize: 13,

      marginBottom: 8,

      textTransform: "uppercase",

      letterSpacing: 0.5,
    },

    fieldLabel: {
      color: colors.text,

      fontSize: 14,

      marginTop: 10,

      marginBottom: 4,
    },

    cardHeaderRow: {
      flexDirection: "row",

      justifyContent: "space-between",

      alignItems: "center",

      marginBottom: 4,
    },

    editToggleBtn: {
      paddingHorizontal: 10,

      paddingVertical: 6,

      borderRadius: 999,

      borderWidth: 1,

      borderColor: colors.border,

      backgroundColor: isDark ? "#1e1e1e" : "#f4f4f4",
    },

    editToggleText: {
      color: colors.text,

      fontSize: 12,

      fontWeight: "600",
    },

    readonlyRow: {
      marginTop: 8,
    },

    readonlyLabel: {
      color: colors.subtitle,

      fontSize: 12,

      marginBottom: 2,
    },

    readonlyValue: {
      color: colors.text,

      fontSize: 15,

      fontWeight: "600",
    },

    input: {
      backgroundColor: isDark ? "#1e1e1e" : "#f7f7f7",

      color: colors.text,

      padding: 12,

      borderRadius: 10,

      fontSize: 15,

      borderWidth: 1,

      borderColor: colors.border,
    },

    inputSmall: {
      width: 100,

      textAlign: "center",
    },

    rowWrap: {
      flexDirection: "row",

      flexWrap: "wrap",

      marginTop: 4,

      gap: 8,
    },

    chip: {
      paddingVertical: 8,

      paddingHorizontal: 12,

      borderRadius: 999,

      backgroundColor: isDark ? "#1e1e1e" : "#f4f4f4",

      borderWidth: 1,

      borderColor: colors.border,
    },

    chipSelected: {
      backgroundColor: colors.primary,

      borderColor: colors.primary,
    },

    chipText: { color: colors.subtitle, fontSize: 14 },

    chipTextSelected: { color: colors.text, fontWeight: "700" },

    inlineRow: {
      flexDirection: "row",

      alignItems: "center",

      gap: 8,

      marginTop: 4,
    },

    inlineSuffix: { color: colors.subtitle, fontSize: 13 },

    divider: {
      height: 1,

      backgroundColor: colors.border,

      marginVertical: 12,
    },

    reminderRow: {
      flexDirection: "row",

      alignItems: "center",

      gap: 12,
    },

    reminderTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },

    hint: { color: colors.subtitle, fontSize: 12, marginTop: 4 },

    paymentSummary: {
      color: colors.subtitle,

      fontSize: 14,

      marginBottom: 8,
    },

    paymentBtn: {
      marginTop: 8,

      paddingVertical: 10,

      paddingHorizontal: 14,

      borderRadius: 10,

      borderWidth: 1,

      borderColor: colors.primary,

      backgroundColor: isDark ? "#0a1a0d" : "#e8f5e9",

      alignItems: "center",

      justifyContent: "center",
    },

    paymentBtnText: {
      color: colors.primary,

      fontWeight: "700",

      fontSize: 14,
    },

    paymentActionsRow: {
      flexDirection: "row",

      justifyContent: "flex-end",

      gap: 10,

      marginTop: 12,
    },

    paymentGhostBtn: {
      paddingHorizontal: 12,

      paddingVertical: 8,

      borderRadius: 8,

      borderWidth: 1,

      borderColor: colors.border,
    },

    paymentGhostText: {
      color: colors.text,

      fontWeight: "600",

      fontSize: 13,
    },

    paymentApplyBtn: {
      paddingHorizontal: 14,

      paddingVertical: 8,

      borderRadius: 8,

      backgroundColor: colors.primary,
    },

    paymentApplyText: {
      color: "#071b0a",

      fontWeight: "700",

      fontSize: 13,
    },

    saveBtn: {
      backgroundColor: colors.primary,

      paddingVertical: 14,

      borderRadius: 12,

      alignItems: "center",

      justifyContent: "center",

      borderWidth: 1,

      borderColor: colors.primary,

      marginTop: 4,
    },

    saveText: { color: "#071b0a", fontSize: 17, fontWeight: "800" },

    pressed: {
      opacity: 0.85,
    },
  });
