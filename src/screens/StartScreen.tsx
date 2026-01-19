import AntDesign from "@expo/vector-icons/AntDesign";
import type { StackNavigationProp } from "@react-navigation/stack";
import React from "react";
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScreenWrapper } from "../components";
import type { AuthStackParamList } from "../navigation/types";

const GREEN = "#8BC34A";
const OVERLAY = "rgba(0,0,0,0.55)";

type StartScreenProps = {
  navigation: StackNavigationProp<AuthStackParamList, "Start">;
};

const StartScreen: React.FC<StartScreenProps> = ({ navigation }) => {
  return (
    <ScreenWrapper>
      <View style={styles.root}>
        <ImageBackground
          source={require("../../assets/parking.png")}
          style={styles.bg}
          resizeMode="cover"
        >
          <View style={styles.header}>
            <AntDesign name="car" size={50} color="#303130ff" />
            <Text style={styles.logoText}>
              <Text style={styles.logoAccent}>Aplikacja </Text>Parkingowa
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Parkowanie staje się łatwiejsze</Text>
            <View style={styles.hr} />
            <Text style={styles.cardBody}>
              Nasza aplikacja to prosty sposób na płatności i parkowanie. Kupisz
              bilety, zaparkujesz w strefach płatnych, zarządzasz czasem postoju,
              saldem konta i historią parkowania. Dodatkowo lokalizacja miejsca
              postoju i rozpoznawanie tablic rejestracyjnych.
              {"\n\n"}Zarejestruj się, aby odkryć wszystkie funkcje, lub zaloguj
              się, jeśli masz już konto.
            </Text>
          </View>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.cta,
              styles.ctaSecondary,
              pressed && styles.pressed,
            ]}
            onPress={() => navigation.navigate("Register")}
          >
            <Text style={[styles.ctaText, styles.ctaTextSecondary]}>
              ZAŁÓŻ KONTO
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.cta,
              styles.ctaPrimary,
              pressed && styles.pressed,
            ]}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={[styles.ctaText, styles.ctaTextPrimary]}>
              ZALOGUJ SIĘ
            </Text>
          </Pressable>
        </View>
      </ImageBackground>
      </View>
    </ScreenWrapper>
  );
};

export default StartScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  bg: { flex: 1 },
  header: {
    height: 150,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
    paddingBottom: 5,
  },
  pressed: {
    opacity: 0.85,
  },
  logoText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0.5,
    textShadowRadius: 5,
    textShadowColor: "black",
  },
  logoAccent: {
    color: "#b0f8acff",
    fontWeight: "800",
    textShadowRadius: 5,
    textShadowColor: "black",
  },
  card: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: OVERLAY,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  hr: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.35)",
    marginBottom: 10,
  },
  cardBody: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 22,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: "row",
    gap: 12,
  },
  cta: {
    flex: 1,
    height: 52,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaSecondary: {
    backgroundColor: "#E3F2FD",
    borderWidth: 1,
    borderColor: GREEN,
  },
  ctaPrimary: {
    backgroundColor: GREEN,
  },
  ctaText: { fontSize: 16, fontWeight: "700" },
  ctaTextSecondary: { color: GREEN },
  ctaTextPrimary: { color: "#0B2B13" },
});
