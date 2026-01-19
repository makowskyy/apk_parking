import type { StackNavigationProp } from "@react-navigation/stack";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenWrapper } from "../components";
import type { AuthStackParamList } from "../navigation/types";
import { register } from "../services/authApi";

type RegisterScreenProps = {
  navigation: StackNavigationProp<AuthStackParamList, "Register">;
};

interface PasswordStrength {
  score: number;
  label: string;
}

const GREEN = "#8BC34A";

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirm, setConfirm] = useState<string>("");
  const [showPass, setShowPass] = useState<boolean>(false);
  const [accepted, setAccepted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const passwordStrength = useMemo<PasswordStrength>(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    const labels = [
      "Bardzo słabe",
      "Słabe",
      "Średnie",
      "Dobre",
      "Bardzo dobre",
    ];
    return { score, label: labels[score] || labels[0] };
  }, [password]);

  const validate = (): string | null => {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!name.trim()) return "Podaj imię i nazwisko (lub nick).";
    if (!emailOk) return "Podaj poprawny adres e-mail.";
    if (password.length < 8) return "Hasło musi mieć co najmniej 8 znaków.";
    if (password !== confirm) return "Hasła nie są takie same.";
    if (!accepted) return "Musisz zaakceptować regulamin.";
    return null;
  };

  const handleRegister = async (): Promise<void> => {
    const err = validate();
    if (err) {
      Alert.alert("Błąd", err);
      return;
    }
    try {
      setLoading(true);
      const nameValue = name.trim();
      const emailValue = email.trim();
      await register(nameValue, emailValue, password);
      Alert.alert("Sukces", "Konto utworzone! Możesz się zalogować.", [
        {
          text: "OK",
          onPress: () => {
            if (navigation?.navigate) navigation.navigate("Login");
          },
        },
      ]);
    } catch (e) {
      if (e instanceof Error) {
        Alert.alert("Blad", e.message);
        return;
      }
      Alert.alert("Błąd", "Coś poszło nie tak. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.root}>
        <View style={styles.container}>
          <Text style={styles.title}>Utwórz konto</Text>

          <TextInput
            style={styles.input}
            placeholder="Imię i nazwisko / Nick"
            placeholderTextColor="#aaa"
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={styles.input}
            placeholder="E-mail"
            placeholderTextColor="#aaa"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Hasło"
              placeholderTextColor="#aaa"
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
            />
          <Pressable
            onPress={() => setShowPass((s) => !s)}
            style={({ pressed }) => [styles.eyeBtn, pressed && styles.pressed]}
            accessibilityLabel={showPass ? "Ukryj hasło" : "Pokaż hasło"}
          >
            <Text style={styles.eyeText}>{showPass ? "Ukryj" : "Pokaż"}</Text>
          </Pressable>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Powtórz hasło"
            placeholderTextColor="#aaa"
            secureTextEntry={!showPass}
            value={confirm}
            onChangeText={setConfirm}
          />

          <View style={styles.strengthWrap}>
            <View style={styles.strengthBarBg}>
              <View
                style={[
                  styles.strengthBarFill,
                  { width: `${(passwordStrength.score / 4) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.strengthText}>
              Siła hasła: {passwordStrength.label}
            </Text>
          </View>

          <Pressable
            onPress={() => setAccepted((v) => !v)}
            style={({ pressed }) => [styles.checkboxRow, pressed && styles.pressed]}
          >
            <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
              {accepted ? <Text style={styles.checkboxMark}>✓</Text> : null}
            </View>
            <Text style={styles.checkboxLabel}>
              Akceptuję regulamin i politykę prywatności
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              loading && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Tworzenie konta..." : "Zarejestruj się"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => navigation?.navigate?.("Login")}
            style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
          >
            <Text style={styles.link}>Masz już konto? Zaloguj się</Text>
          </Pressable>
        </View>
      </View>
    </ScreenWrapper>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  container: {
    flex: 1,
    backgroundColor: "#101010",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
  },
  input: {
    width: "100%",
    backgroundColor: "#1e1e1e",
    color: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  passwordRow: {
    width: "100%",
    position: "relative",
  },
  passwordInput: {
    paddingRight: 80,
  },
  eyeBtn: {
    position: "absolute",
    right: 10,
    top: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  eyeText: {
    color: GREEN,
    fontWeight: "700",
  },
  strengthWrap: {
    width: "100%",
    marginBottom: 8,
  },
  strengthBarBg: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#2a2a2a",
    overflow: "hidden",
  },
  strengthBarFill: {
    height: "100%",
    backgroundColor: GREEN,
  },
  strengthText: {
    color: "#aaa",
    marginTop: 6,
    fontSize: 13,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#666",
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkboxChecked: {
    borderColor: GREEN,
    backgroundColor: "#1f2d1d",
  },
  checkboxMark: {
    color: GREEN,
    fontSize: 14,
    fontWeight: "800",
  },
  checkboxLabel: {
    color: "#ccc",
    fontSize: 14,
    flexShrink: 1,
  },
  button: {
    width: "100%",
    backgroundColor: GREEN,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "700",
  },
  linkBtn: {
    marginTop: 12,
  },
  link: {
    color: "#aaa",
    fontSize: 14,
  },
  pressed: {
    opacity: 0.85,
  },
});
