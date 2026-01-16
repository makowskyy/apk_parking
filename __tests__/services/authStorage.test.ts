import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearSession,
  getSavedToken,
  getSavedUser,
  saveSession,
} from "../../src/services/authStorage";

describe("authStorage", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("saves, reads, and clears session data", async () => {
    const token = "token-123";
    const user = { id: 7, email: "user@parking.app", name: "User" };

    await saveSession(token, user);

    const savedUser = await getSavedUser();
    const savedToken = await getSavedToken();

    expect(savedUser).toEqual(user);
    expect(savedToken).toBe(token);

    await clearSession();

    const clearedUser = await getSavedUser();
    const clearedToken = await getSavedToken();

    expect(clearedUser).toBeNull();
    expect(clearedToken).toBeNull();
  });

  it("returns null when stored user JSON is invalid", async () => {
    await AsyncStorage.setItem("@parking_auth_user", "{bad json");

    const savedUser = await getSavedUser();

    expect(savedUser).toBeNull();
  });
});
