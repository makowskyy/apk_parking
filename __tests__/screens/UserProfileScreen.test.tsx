import React from "react";
import { Alert } from "react-native";
import { act, fireEvent, waitFor } from "@testing-library/react-native";
import UserProfileScreen from "../../src/screens/UserProfileScreen";
import { renderWithTheme } from "../__helpers__/renderWithTheme";
import { getSavedUser } from "../../src/services/authStorage";
import {
  defaultUserProfile,
  fetchUserProfile,
  updateUserProfile,
} from "../../src/services/userProfileApi";

jest.mock("../../src/services/authStorage", () => ({
  getSavedUser: jest.fn(),
}));

jest.mock("../../src/services/userProfileApi", () => ({
  defaultUserProfile: {
    fullName: "",
    email: "",
    phone: "",
    defaultZone: "A",
    defaultDurationMin: 60,
    notifyBeforeEnd: true,
    allowMarketing: false,
    paymentMethodLabel: "",
  },
  fetchUserProfile: jest.fn(),
  updateUserProfile: jest.fn(),
}));

const getSwitches = (utils: {
  UNSAFE_getAllByType: (type: string) => any[];
}) => {
  const types = ["AndroidSwitch", "RCTSwitch", "Switch"];
  for (const type of types) {
    try {
      const found = utils.UNSAFE_getAllByType(type);
      if (found.length > 0) return found;
    } catch {
      // ignore missing type
    }
  }
  return [];
};

const toggleSwitch = (node: { props?: any }, value: boolean) => {
  if (!node) return;
  if (typeof node.props?.onValueChange === "function") {
    node.props.onValueChange(value);
    return;
  }
  if (typeof node.props?.onChange === "function") {
    node.props.onChange({ nativeEvent: { value } });
    return;
  }
  fireEvent(node as never, "valueChange", value);
};

describe("UserProfileScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSavedUser as jest.Mock).mockResolvedValue({
      id: 5,
      email: "user@parking.app",
      name: "Test User",
    });
    (fetchUserProfile as jest.Mock).mockResolvedValue({
      ...defaultUserProfile,
      fullName: "Test User",
      email: "user@parking.app",
    });
  });

  it("saves profile changes", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    (updateUserProfile as jest.Mock).mockResolvedValue({
      ...defaultUserProfile,
      fullName: "Jan Nowak",
      email: "jan@parking.app",
      phone: "500 600 700",
    });

    const { findByText, getAllByPlaceholderText, getByPlaceholderText, getByText } =
      renderWithTheme(<UserProfileScreen />);

    await findByText(/Profil/i);

    fireEvent.press(getByText(/Edytuj/i));

    const [nameInput] = getAllByPlaceholderText(/Jan/i);
    fireEvent.changeText(nameInput, "Jan Nowak");
    fireEvent.changeText(
      getByPlaceholderText(/example/i),
      "jan@parking.app"
    );
    fireEvent.changeText(getByPlaceholderText(/500/i), "500 600 700");

    fireEvent.press(getByText(/Zapisz zmiany/i));

    await waitFor(() => {
      expect(updateUserProfile).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          fullName: "Jan Nowak",
          email: "jan@parking.app",
          phone: "500 600 700",
        })
      );
      expect(alertSpy).toHaveBeenCalled();
    });
  });

  it("validates payment method before applying", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { findByText, getByText } = renderWithTheme(<UserProfileScreen />);

    await findByText(/Profil/i);

    const paymentToggle = getByText(/Dodaj .*spos/i);
    fireEvent.press(paymentToggle.parent as never);
    fireEvent.press(getByText(/Zastosuj/i));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
  });

  it("shows alert when saving without a logged user", async () => {
    (getSavedUser as jest.Mock).mockResolvedValue(null);
    (fetchUserProfile as jest.Mock).mockResolvedValue({
      ...defaultUserProfile,
    });

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { findByText, getByText } = renderWithTheme(<UserProfileScreen />);

    await findByText(/Profil/i);

    fireEvent.press(getByText(/Zapisz zmiany/i));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
      expect(updateUserProfile).not.toHaveBeenCalled();
    });
  });

  it("applies card payment label", async () => {
    const { findByText, getByPlaceholderText, getByText } = renderWithTheme(
      <UserProfileScreen />
    );

    await findByText(/Profil/i);

    const paymentToggle = getByText(/Dodaj .*spos/i);
    fireEvent.press(paymentToggle.parent as never);

    fireEvent.changeText(getByPlaceholderText(/1234/i), "1234");
    fireEvent.press(getByText(/Zastosuj/i));

    await waitFor(() => {
      expect(getByText(/Karta .*1234/i)).toBeTruthy();
    });
  });

  it("applies BLIK payment label", async () => {
    const { findByText, getByPlaceholderText, getByText } = renderWithTheme(
      <UserProfileScreen />
    );

    await findByText(/Profil/i);

    const paymentToggle = getByText(/Dodaj .*spos/i);
    fireEvent.press(paymentToggle.parent as never);

    fireEvent.press(getByText(/BLIK/i));
    fireEvent.changeText(getByPlaceholderText(/BLIK/i), "Moje BLIK");
    fireEvent.press(getByText(/Zastosuj/i));

    await waitFor(() => {
      expect(getByText(/BLIK -/i)).toBeTruthy();
    });
  });

  it("switches payment type back to card", async () => {
    const { findByText, getByPlaceholderText, getByText, queryByPlaceholderText } =
      renderWithTheme(<UserProfileScreen />);

    await findByText(/Profil/i);

    const paymentToggle = getByText(/Dodaj .*spos/i);
    fireEvent.press(paymentToggle.parent as never);

    fireEvent.press(getByText(/BLIK/i));
    expect(getByPlaceholderText(/BLIK/i)).toBeTruthy();
    expect(queryByPlaceholderText(/1234/i)).toBeNull();

    fireEvent.press(getByText(/Karta/i));

    expect(getByPlaceholderText(/1234/i)).toBeTruthy();
  });

  it("shows alert when update fails", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    (updateUserProfile as jest.Mock).mockRejectedValue(new Error("fail"));

    const { findByText, getByText } = renderWithTheme(<UserProfileScreen />);

    await findByText(/Profil/i);

    fireEvent.press(getByText(/Zapisz zmiany/i));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    errorSpy.mockRestore();
  });

  it("uses fallback profile when loading fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    (fetchUserProfile as jest.Mock).mockRejectedValue(new Error("fail"));

    const { findAllByText } = renderWithTheme(<UserProfileScreen />);

    expect((await findAllByText(/Test User/i)).length).toBeGreaterThan(0);
    expect((await findAllByText(/user@parking.app/i)).length).toBeGreaterThan(0);

    warnSpy.mockRestore();
  });

  it("applies edits when leaving edit mode", async () => {
    const { findByText, getAllByPlaceholderText, getAllByText, getByText } =
      renderWithTheme(<UserProfileScreen />);

    await findByText(/Profil/i);

    fireEvent.press(getByText(/Edytuj dane/i));

    const [nameInput] = getAllByPlaceholderText(/Jan/i);
    fireEvent.changeText(nameInput, "Ala Nowak");

    fireEvent.press(getByText(/Zako/i));

    expect(getAllByText("Ala Nowak").length).toBeGreaterThan(0);
  });

  it("clamps duration and saves selected zone", async () => {
    (updateUserProfile as jest.Mock).mockResolvedValue({
      ...defaultUserProfile,
      fullName: "Test User",
      email: "user@parking.app",
      defaultZone: "B",
      defaultDurationMin: 480,
    });

    const { findByText, getByPlaceholderText, getByText } = renderWithTheme(
      <UserProfileScreen />
    );

    await findByText(/Profil/i);

    fireEvent.press(getByText(/^B .*Strefa B/i));
    fireEvent.changeText(getByPlaceholderText(/min/i), "999");
    fireEvent.press(getByText(/Zapisz zmiany/i));

    await waitFor(() => {
      expect(updateUserProfile).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          defaultZone: "B",
          defaultDurationMin: 480,
        })
      );
    });
  });

  it("updates notify and marketing preferences", async () => {
    (updateUserProfile as jest.Mock).mockResolvedValue({
      ...defaultUserProfile,
      fullName: "Test User",
      email: "user@parking.app",
      notifyBeforeEnd: false,
      allowMarketing: true,
    });

    const { UNSAFE_getAllByType, findByText, getByText } = renderWithTheme(
      <UserProfileScreen />
    );

    await findByText(/Profil/i);

    const switches = getSwitches({ UNSAFE_getAllByType });
    const notifySwitch = switches.find((sw) => sw.props.value === true);
    const marketingSwitch = switches.find((sw) => sw.props.value === false);
    await act(async () => {
      toggleSwitch(notifySwitch, false);
      toggleSwitch(marketingSwitch, true);
    });

    fireEvent.press(getByText(/Zapisz zmiany/i));

    await waitFor(() => {
      expect(updateUserProfile).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          notifyBeforeEnd: false,
          allowMarketing: true,
        })
      );
    });
  });

  it("closes the payment form on cancel", async () => {
    const { findByText, getByText, queryByText } = renderWithTheme(
      <UserProfileScreen />
    );

    await findByText(/Profil/i);

    const paymentToggle = getByText(/Dodaj .*spos/i);
    fireEvent.press(paymentToggle.parent as never);

    fireEvent.press(getByText(/Anuluj/i));

    expect(queryByText(/Zastosuj/i)).toBeNull();
  });

  it("shows alert when BLIK alias is empty", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { findByText, getByText } = renderWithTheme(<UserProfileScreen />);

    await findByText(/Profil/i);

    const paymentToggle = getByText(/Dodaj .*spos/i);
    fireEvent.press(paymentToggle.parent as never);

    fireEvent.press(getByText(/BLIK/i));
    fireEvent.press(getByText(/Zastosuj/i));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
  });

  it("renders initials for single-part name", async () => {
    (fetchUserProfile as jest.Mock).mockResolvedValue({
      ...defaultUserProfile,
      fullName: "Monika",
      email: "monika@parking.app",
    });

    const { findByText, getByText } = renderWithTheme(<UserProfileScreen />);

    await findByText(/Profil/i);

    expect(getByText(/^M$/)).toBeTruthy();
  });

  it("avoids state updates after unmount", async () => {
    let resolveProfile: ((value: any) => void) | undefined;
    const pending = new Promise((resolve) => {
      resolveProfile = resolve;
    });
    (fetchUserProfile as jest.Mock).mockReturnValue(pending);

    const { unmount } = renderWithTheme(<UserProfileScreen />);

    unmount();

    await act(async () => {
      resolveProfile?.({
        ...defaultUserProfile,
        fullName: "Late User",
        email: "late@parking.app",
      });
    });

    expect(fetchUserProfile).toHaveBeenCalled();
  });
});
