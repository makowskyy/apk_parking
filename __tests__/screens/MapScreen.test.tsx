import React from "react";
import { act, waitFor } from "@testing-library/react-native";
import MapScreen from "../../src/screens/MapScreen";
import { renderWithTheme } from "../__helpers__/renderWithTheme";
import * as Location from "expo-location";

type Feature = {
  id: string;
  properties: { nazwa: string };
  geometry: { type: string; coordinates: number[][][] };
};

let mockFeatures: Feature[] = [];

jest.mock("../../assets/strefy.json", () => ({
  get features() {
    return mockFeatures;
  },
}));

describe("MapScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFeatures = [];
  });

  it("shows error when location permission is denied", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "denied",
    });

    mockFeatures = [];
    const { getByText } = renderWithTheme(
      <MapScreen navigation={{}} />
    );

    await waitFor(() => {
      expect(getByText(/Brak zgody/i)).toBeTruthy();
    });
  });

  it("renders zone label when location is available", async () => {
    const features: Feature[] = [
      {
        id: "zone-1",
        properties: { nazwa: "Strefa A" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [21.0, 52.0],
              [21.001, 52.0],
              [21.001, 52.001],
              [21.0, 52.001],
              [21.0, 52.0],
            ],
          ],
        },
      },
    ];

    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 52.0, longitude: 21.0 },
    });

    jest.useFakeTimers();

    mockFeatures = features;
    const { getByText } = renderWithTheme(
      <MapScreen navigation={{}} />
    );

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(getByText(/^A$/)).toBeTruthy();
    });

    jest.useRealTimers();
  });

  it("does not render zone labels when there are no zones", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 52.0, longitude: 21.0 },
    });

    jest.useFakeTimers();

    mockFeatures = [];
    const { queryByText } = renderWithTheme(
      <MapScreen navigation={{}} />
    );

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(queryByText(/^A$/)).toBeNull();
    });

    jest.useRealTimers();
  });

  it("skips center calculation when polygon has no points", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 52.0, longitude: 21.0 },
    });

    jest.useFakeTimers();

    mockFeatures = [
      {
        id: "zone-empty",
        properties: { nazwa: "Strefa A" },
        geometry: {
          type: "Polygon",
          coordinates: [[[]]],
        },
      },
    ];

    const { queryByText } = renderWithTheme(
      <MapScreen navigation={{}} />
    );

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(queryByText(/^A$/)).toBeNull();
    });

    jest.useRealTimers();
  });

  it("ignores non-polygon features", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 52.0, longitude: 21.0 },
    });

    jest.useFakeTimers();

    mockFeatures = [
      {
        id: "line-1",
        properties: { nazwa: "Strefa B" },
        geometry: { type: "LineString", coordinates: [] },
      },
    ];

    const { queryByText } = renderWithTheme(
      <MapScreen navigation={{}} />
    );

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(queryByText(/^B$/)).toBeNull();
    });

    jest.useRealTimers();
  });

  it("shows error when location fetch fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(
      new Error("Location error")
    );

    mockFeatures = [];
    const { getByText } = renderWithTheme(
      <MapScreen navigation={{}} />
    );

    await waitFor(() => {
      expect(getByText(/Nie uda/i)).toBeTruthy();
    });

    warnSpy.mockRestore();
  });

  it("passes polygon holes to the map", async () => {
    const features: Feature[] = [
      {
        id: "zone-2",
        properties: { nazwa: "Strefa B" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [21.0, 52.0],
              [21.002, 52.0],
              [21.002, 52.002],
              [21.0, 52.002],
              [21.0, 52.0],
            ],
            [
              [21.0005, 52.0005],
              [21.0015, 52.0005],
              [21.0015, 52.0015],
              [21.0005, 52.0015],
              [21.0005, 52.0005],
            ],
          ],
        },
      },
    ];

    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 52.0, longitude: 21.0 },
    });

    mockFeatures = features;
    const { UNSAFE_getAllByType } = renderWithTheme(
      <MapScreen navigation={{}} />
    );

    await waitFor(() => {
      const polygons = UNSAFE_getAllByType("Polygon");
      expect(polygons.length).toBe(1);
      expect(polygons[0].props.holes.length).toBe(1);
    });
  });
});
