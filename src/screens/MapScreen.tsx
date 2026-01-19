import React, { useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polygon, Region } from "react-native-maps";
import * as Location from "expo-location";
import { ScreenWrapper } from "../components";
import { ThemeColors, ThemeContext } from "../theme/ThemeContext";
import strefy from "../../assets/strefy.json";

type GeoJsonFeature = {
  id?: string | number;
  properties?: { nazwa?: string };
  geometry?: {
    type?: string;
    coordinates?: number[][][];
  };
};

type ZonePolygon = {
  id: string;
  name: string;
  color: string;
  outer: { latitude: number; longitude: number }[];
  holes: { latitude: number; longitude: number }[][];
  center: { latitude: number; longitude: number } | null;
};

const MapScreen: React.FC = () => {
  const { colors } = useContext(ThemeContext);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [region, setRegion] = useState<Region | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [labelsReady, setLabelsReady] = useState(false);

  const zones = useMemo<ZonePolygon[]>(() => {
    const features = (strefy as { features?: GeoJsonFeature[] }).features ?? [];

    const toLatLng = (ring: number[][]) =>
      ring
        .filter((pair) => pair.length >= 2)
        .map(([lng, lat]) => ({ latitude: lat, longitude: lng }));

    const getZoneColor = (name: string) =>
      name.toLowerCase().includes("b") ? "#FF9800" : colors.primary;

    const getCenter = (coords: { latitude: number; longitude: number }[]) => {
      if (!coords.length) return null;
      const { latSum, lngSum } = coords.reduce(
        (acc, cur) => ({
          latSum: acc.latSum + cur.latitude,
          lngSum: acc.lngSum + cur.longitude,
        }),
        { latSum: 0, lngSum: 0 }
      );
      return {
        latitude: latSum / coords.length,
        longitude: lngSum / coords.length,
      };
    };

    return features
      .filter((f) => f.geometry?.type === "Polygon")
      .map((feature, index) => {
        const coords = feature.geometry?.coordinates ?? [];
        const [outerRing = [], ...holes] = coords;
        const name = feature.properties?.nazwa ?? "Strefa";
        const outer = toLatLng(outerRing);

        return {
          id: String(feature.id ?? `${name}-${index}`),
          name,
          color: getZoneColor(name),
          outer,
          holes: holes.map(toLatLng).filter((h) => h.length > 0),
          center: getCenter(outer),
        };
      })
      .filter((z) => z.outer.length > 2);
  }, [colors.primary]);

  useEffect(() => {
    const initLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          setErrorMsg("Brak zgody na dostęp do lokalizacji.");
          setLoading(false);
          return;
        }

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const { latitude, longitude } = pos.coords;

        const initialRegion: Region = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };

        setRegion(initialRegion);
        setLoading(false);
      } catch (e) {
        console.warn(e);
        setErrorMsg("Nie udało się pobrać lokalizacji.");
        setLoading(false);
      }
    };

    void initLocation();
  }, []);

  useEffect(() => {
    setLabelsReady(false);
    const timer = setTimeout(() => setLabelsReady(true), 300);
    return () => clearTimeout(timer);
  }, [zones.length]);

  return (
    <ScreenWrapper>
      <View style={styles.root}>
        {loading && (
          <View style={styles.centerOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.infoText}>Pobieranie lokalizacji...</Text>
          </View>
        )}

        {!loading && errorMsg && (
          <View style={styles.centerOverlay}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {!loading && !errorMsg && region && (
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={region}
            showsUserLocation
            showsMyLocationButton
          >
            <Marker coordinate={region} title="Twoja pozycja" />
            {zones.map((zone) => (
              <Polygon
                key={zone.id}
                coordinates={zone.outer}
                holes={zone.holes}
                strokeColor={zone.color}
                fillColor={`${zone.color}33`}
                strokeWidth={2}
                zIndex={0}
              />
            ))}
            {zones
              .filter((z) => z.center)
              .map((zone) => (
                <Marker
                  key={`${zone.id}-label`}
                  coordinate={
                    zone.center as { latitude: number; longitude: number }
                  }
                  title={zone.name}
                  zIndex={10}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges={!labelsReady}
                >
                  <View style={[styles.zoneBadge, { borderColor: zone.color }]}>
                    <Text
                      style={[styles.zoneBadgeText, { color: zone.color }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {zone.name.split(" ")[1]}
                    </Text>
                  </View>
                </Marker>
              ))}
          </MapView>
        )}
      </View>
    </ScreenWrapper>
  );
};

export default MapScreen;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centerOverlay: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      backgroundColor: colors.background,
    },
    infoText: {
      marginTop: 12,
      color: colors.subtitle,
      fontSize: 14,
      textAlign: "center",
    },
    errorText: {
      marginTop: 12,
      color: "#ff5252",
      fontSize: 14,
      textAlign: "center",
    },
    zoneBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: colors.card,
      borderRadius: 8,
      borderWidth: 1,
      elevation: 2,
    },
    zoneBadgeText: {
      fontSize: 12,
      fontWeight: "700",
    },
  });
