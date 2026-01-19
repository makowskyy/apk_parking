import AsyncStorage from "@react-native-async-storage/async-storage";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from "./storageKeys";

export { AUTH_TOKEN_KEY, AUTH_USER_KEY } from "./storageKeys";

export type StoredUser = {
  id: number;
  email: string;
  name?: string;
};

export async function saveSession(token: string, user: StoredUser): Promise<void> {
  await AsyncStorage.multiSet([
    [AUTH_TOKEN_KEY, token],
    [AUTH_USER_KEY, JSON.stringify(user)],
  ]);
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
}

export async function getSavedUser(): Promise<StoredUser | null> {
  const data = await AsyncStorage.getItem(AUTH_USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as StoredUser;
  } catch {
    return null;
  }
}

export async function getSavedToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
}
