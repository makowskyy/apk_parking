import React from "react";
import { fireEvent, waitFor } from "@testing-library/react-native";
import CarScreen, { removeSelectedCar } from "../../src/screens/CarScreen";
import { renderWithTheme } from "../__helpers__/renderWithTheme";
import * as ImagePicker from "expo-image-picker";

describe("CarScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("adds a new plate", async () => {
    const { getByPlaceholderText, getByText } = renderWithTheme(<CarScreen />);

    fireEvent.press(getByText("+"));

    fireEvent.changeText(
      getByPlaceholderText(/Nowy numer/i),
      "gd 12345"
    );
    fireEvent.press(getByText(/^Dodaj$/i));

    await waitFor(() => {
      expect(getByText("GD 12345")).toBeTruthy();
    });
  });

  it("returns null when removing a missing car", () => {
    expect(removeSelectedCar([], "missing")).toBeNull();
  });

  it("keeps add form open when plate is empty", () => {
    const { getByPlaceholderText, getByText } = renderWithTheme(<CarScreen />);

    fireEvent.press(getByText("+"));
    fireEvent.press(getByText(/^Dodaj$/i));

    expect(getByPlaceholderText(/Nowy numer/i)).toBeTruthy();
  });

  it("shows cancel message when scan is cancelled", async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true,
    });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: true,
      assets: [],
    });

    const { getByText } = renderWithTheme(<CarScreen />);

    fireEvent.press(getByText(/Wykryj tablice/i));

    await waitFor(() => {
      expect(getByText(/Anulowano/i)).toBeTruthy();
    });
  });

  it("shows permission message when camera access is denied", async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: false,
    });

    const { getByText } = renderWithTheme(<CarScreen />);

    fireEvent.press(getByText(/Wykryj tablice/i));

    await waitFor(() => {
      expect(getByText(/Brak dostepu/i)).toBeTruthy();
    });
  });

  it("removes selected car from the list", async () => {
    const { getByText, queryByText } = renderWithTheme(<CarScreen />);

    expect(getByText("WX12345")).toBeTruthy();

    fireEvent.press(getByText(/Usun/i));

    await waitFor(() => {
      expect(queryByText("WX12345")).toBeNull();
    });
  });

  it("removes the currently selected car", async () => {
    const { getByText, queryByText } = renderWithTheme(<CarScreen />);

    fireEvent.press(getByText("PO9ABC1"));
    fireEvent.press(getByText(/Usun/i));

    await waitFor(() => {
      expect(queryByText("PO9ABC1")).toBeNull();
      expect(getByText("WX12345")).toBeTruthy();
    });
  });

  it("opens camera when editing a car photo", async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true,
    });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file://photo.jpg" }],
    });

    const { getByText } = renderWithTheme(<CarScreen />);

    fireEvent.press(getByText(/Edytuj/i));

    await waitFor(() => {
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
    });
  });

  it("shows message when scan result has no base64 data", async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true,
    });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file://photo.jpg" }],
    });

    const { getByText } = renderWithTheme(<CarScreen />);

    fireEvent.press(getByText(/Wykryj tablice/i));

    await waitFor(() => {
      expect(getByText(/Nie udalo sie pobrac danych/i)).toBeTruthy();
    });
  });

  it("shows message when recognition returns no plate", async () => {
    const fetchSpy = jest.fn().mockResolvedValue({
      json: async () => ({ results: [] }),
    });
    const globalAny: { fetch?: jest.Mock } = global as { fetch?: jest.Mock };
    globalAny.fetch = fetchSpy;

    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true,
    });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file://photo.jpg", base64: "abcd" }],
    });

    const { getByText } = renderWithTheme(<CarScreen />);

    fireEvent.press(getByText(/Wykryj tablice/i));

    await waitFor(() => {
      expect(getByText(/Nie udalo sie odczytac tablicy/i)).toBeTruthy();
    });
  });

  it("shows message when API key is missing", async () => {
    const originalKey = process.env.EXPO_PUBLIC_PLATE_RECOGNIZER_API_KEY;
    delete process.env.EXPO_PUBLIC_PLATE_RECOGNIZER_API_KEY;

    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true,
    });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file://photo.jpg", base64: "abcd" }],
    });

    const { getByText } = renderWithTheme(<CarScreen />);

    fireEvent.press(getByText(/Wykryj tablice/i));

    await waitFor(() => {
      expect(
        getByText(/EXPO_PUBLIC_PLATE_RECOGNIZER_API_KEY/i)
      ).toBeTruthy();
    });

    if (originalKey === undefined) {
      delete process.env.EXPO_PUBLIC_PLATE_RECOGNIZER_API_KEY;
    } else {
      process.env.EXPO_PUBLIC_PLATE_RECOGNIZER_API_KEY = originalKey;
    }
  });

  it("fills plate from scan when recognition succeeds", async () => {
    const fetchSpy = jest.fn().mockResolvedValue({
      json: async () => ({ results: [{ plate: "wx1234" }] }),
    });
    const globalAny: { fetch?: jest.Mock } = global as { fetch?: jest.Mock };
    globalAny.fetch = fetchSpy;

    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true,
    });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file://photo.jpg", base64: "abcd" }],
    });

    const { getByPlaceholderText, getByText } = renderWithTheme(<CarScreen />);

    fireEvent.press(getByText(/Wykryj tablice/i));

    await waitFor(() => {
      expect(getByText(/Odczytano tablice/i)).toBeTruthy();
      expect(getByPlaceholderText(/Nowy numer/i).props.value).toBe("WX1234");
    });
  });

  it("shows error message when scan request fails", async () => {
    const fetchSpy = jest.fn().mockRejectedValue(new Error("fail"));
    const globalAny: { fetch?: jest.Mock } = global as { fetch?: jest.Mock };
    globalAny.fetch = fetchSpy;

    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true,
    });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file://photo.jpg", base64: "abcd" }],
    });

    const { getByText } = renderWithTheme(<CarScreen />);

    fireEvent.press(getByText(/Wykryj tablice/i));

    await waitFor(() => {
      expect(getByText(/Wystapil blad/i)).toBeTruthy();
    });
  });

  it("adds photo to a newly added car", async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true,
    });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file://photo.jpg" }],
    });

    const { getByPlaceholderText, getByText, queryByText } = renderWithTheme(
      <CarScreen />
    );

    fireEvent.press(getByText("+"));
    fireEvent.changeText(getByPlaceholderText(/Nowy numer/i), "GD 12345");
    fireEvent.press(getByText(/^Dodaj$/i));

    await waitFor(() => {
      expect(getByText("GD 12345")).toBeTruthy();
    });

    fireEvent.press(getByText(/Dodaj zdj/i));

    await waitFor(() => {
      expect(queryByText(/Dodaj zdj/i)).toBeNull();
    });
  });

  it("shows message when add photo permission is denied", async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: false,
    });

    const { getByPlaceholderText, getByText } = renderWithTheme(<CarScreen />);

    fireEvent.press(getByText("+"));
    fireEvent.changeText(getByPlaceholderText(/Nowy numer/i), "GD 12345");
    fireEvent.press(getByText(/^Dodaj$/i));

    fireEvent.press(getByText(/Dodaj zdj/i));

    await waitFor(() => {
      expect(getByText(/Brak dostepu/i)).toBeTruthy();
    });
  });

  it("keeps add photo button when camera is canceled", async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true,
    });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: true,
      assets: [],
    });

    const { getByPlaceholderText, getByText } = renderWithTheme(<CarScreen />);

    fireEvent.press(getByText("+"));
    fireEvent.changeText(getByPlaceholderText(/Nowy numer/i), "GD 12345");
    fireEvent.press(getByText(/^Dodaj$/i));

    fireEvent.press(getByText(/Dodaj zdj/i));

    await waitFor(() => {
      expect(getByText(/Dodaj zdj/i)).toBeTruthy();
    });
  });

  it("does not update photo when edit is canceled", async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true,
    });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: true,
      assets: [],
    });

    const { getByText } = renderWithTheme(<CarScreen />);

    fireEvent.press(getByText(/Edytuj/i));

    await waitFor(() => {
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
    });
  });

  it("shows message when edit photo permission is denied", async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: false,
    });

    const { getByText } = renderWithTheme(<CarScreen />);

    fireEvent.press(getByText(/Edytuj/i));

    await waitFor(() => {
      expect(getByText(/Brak dostepu/i)).toBeTruthy();
    });
  });
});
