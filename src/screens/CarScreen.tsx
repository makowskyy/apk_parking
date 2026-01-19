import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { ScreenWrapper } from "../components";
import { ThemeColors, ThemeContext } from "../theme/ThemeContext";

const getPlateRecognizerApiKey = () =>
  process.env.EXPO_PUBLIC_PLATE_RECOGNIZER_API_KEY;
const SCAN_COLOR = "#a855f7";

async function recognizePlate(base64Image: string, apiKey: string) {
  const formData = new FormData();
  formData.append("upload", {
    uri: `data:image/jpeg;base64,${base64Image}`,
    name: "car.jpg",
    type: "image/jpeg",
  } as any);

  const res = await fetch("https://api.platerecognizer.com/v1/plate-reader/", {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
    },
    body: formData,
  });

  const data = await res.json();
  const plate = data.results?.[0]?.plate;
  return plate as string | undefined;
}

type Car = {
  id: string;
  plate: string;
  image?: any;
};

const initialCars: Car[] = [
  {
    id: "1",
    plate: "WX12345",
    image: require("../../assets/cars/car1.png"),
  },
  {
    id: "2",
    plate: "PO9ABC1",
    image: require("../../assets/cars/car2.png"),
  },
  {
    id: "3",
    plate: "KR7J202",
    image: require("../../assets/cars/car3.png"),
  },
];

export function removeSelectedCar(cars: Car[], selectedId: string) {
  const selectedCar = cars.find((car) => car.id === selectedId);
  if (!selectedCar) return null;

  const updated = cars.filter((car) => car.id !== selectedCar.id);
  const nextId = updated[0]?.id ?? "";
  return { updated, nextId };
}

const CarsScreen: React.FC = () => {
  const [cars, setCars] = useState<Car[]>(initialCars);
  const [selectedId, setSelectedId] = useState<string>(initialCars[0]?.id ?? "");
  const [isAdding, setIsAdding] = useState(false);
  const [newPlate, setNewPlate] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | undefined>();
  const { colors, isDark } = useContext(ThemeContext);
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const badgePulse = useRef(new Animated.Value(0));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(badgePulse.current, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(badgePulse.current, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    return () => pulse.stop();
  }, []);

  const badgePulseStyle = {
    transform: [
      {
        scale: badgePulse.current.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.12],
        }),
      },
    ],
    opacity: badgePulse.current.interpolate({
      inputRange: [0, 1],
      outputRange: [0.85, 1],
    }),
  };

  const selectedCar = cars.find((c) => c.id === selectedId);

  const handleAddPlate = () => {
    const plate = newPlate.trim().toUpperCase();
    if (!plate) return;

    const newCar: Car = {
      id: Date.now().toString(),
      plate,
      image: pendingPhotoUri ? { uri: pendingPhotoUri } : undefined,
    };

    setCars((prev) => [...prev, newCar]);
    setSelectedId(newCar.id);
    setNewPlate("");
    setIsAdding(false);
    setPendingPhotoUri(undefined);
    setScanMessage(null);
  };

  const handleScanPlate = async () => {
    setScanMessage(null);

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setScanMessage("Brak dostepu do aparatu.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.length) {
      setScanMessage("Anulowano wykonanie zdjecia.");
      return;
    }

    const asset = result.assets[0];
    if (!asset.base64) {
      setScanMessage("Nie udalo sie pobrac danych zdjecia.");
      return;
    }

    const apiKey = getPlateRecognizerApiKey();
    if (!apiKey) {
      setScanMessage("Ustaw EXPO_PUBLIC_PLATE_RECOGNIZER_API_KEY w pliku .env.");
      return;
    }

    setIsScanning(true);
    try {
      const plate = await recognizePlate(asset.base64, apiKey);
      if (plate) {
        const normalizedPlate = plate.toUpperCase();
        setNewPlate(normalizedPlate);
        setIsAdding(true);
        setPendingPhotoUri(asset.uri);
        setScanMessage(`Odczytano tablice: ${normalizedPlate}`);
      } else {
        setScanMessage("Nie udalo sie odczytac tablicy.");
      }
    } catch (error) {
      setScanMessage("Wystapil blad podczas wysylania zdjecia.");
    } finally {
      setIsScanning(false);
    }
  };

  const updateSelectedCarImage = (uri: string) => {
    if (!selectedCar) return;
    setCars((prev) =>
      prev.map((car) =>
        car.id === selectedCar.id ? { ...car, image: { uri } } : car
      )
    );
  };

  const handleCapturePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setScanMessage("Brak dostepu do aparatu.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length || !selectedCar) {
      return;
    }

    const asset = result.assets[0];
    updateSelectedCarImage(asset.uri);
  };

  const handleDelete = () => {
    const result = removeSelectedCar(cars, selectedId);
    if (!result) return;

    setCars(result.updated);
    setSelectedId(result.nextId);
  };

  return (
    <ScreenWrapper>
      <View style={styles.root}>
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Twoje samochody</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.platesScrollContent}
          >
            {cars.map((car) => {
              const isActive = car.id === selectedId;
              return (
                <Pressable
                  key={car.id}
                  style={({ pressed }) => [
                    styles.plateButton,
                    isActive && styles.plateButtonActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setSelectedId(car.id)}
                >
                  <Text
                    style={[styles.plateText, isActive && styles.plateTextActive]}
                  >
                    {car.plate}
                  </Text>
                </Pressable>
              );
            })}

            <Pressable
              style={({ pressed }) => [
                styles.addPlateButton,
                pressed && styles.pressed,
              ]}
              onPress={() => setIsAdding((prev) => !prev)}
            >
              <Text style={styles.addPlateText}>+</Text>
            </Pressable>
          </ScrollView>

          <View style={styles.scanRow}>
            <Pressable
              style={({ pressed }) => [
                styles.scanButton,
                pressed && styles.pressed,
                isScanning && styles.scanButtonDisabled,
              ]}
              disabled={isScanning}
              onPress={handleScanPlate}
            >
              <Text style={styles.scanButtonText}>Wykryj tablice</Text>
              <Animated.View style={[styles.aiBadgeAnimated, badgePulseStyle]}>
                <LinearGradient
                  colors={["#d946ef", "#6366f1"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.aiBadge}
                >
                  <Text style={styles.aiBadgeText}>AI</Text>
                </LinearGradient>
              </Animated.View>
            </Pressable>

            {isScanning && (
              <View style={styles.scanStatus}>
                <ActivityIndicator size="small" color={SCAN_COLOR} />
                <Text style={styles.scanStatusText}>Odczytywanie tablicy...</Text>
              </View>
            )}

            {!isScanning && scanMessage && (
              <Text style={styles.scanStatusText}>{scanMessage}</Text>
            )}
          </View>

          {isAdding && (
            <View style={styles.addPlateForm}>
              <TextInput
                style={styles.addPlateInput}
                value={newPlate}
                onChangeText={setNewPlate}
                placeholder="Nowy numer rejestracyjny"
                placeholderTextColor={colors.subtitle}
                autoCapitalize="characters"
              />
              <Pressable
                style={({ pressed }) => [
                  styles.addPlateConfirm,
                  pressed && styles.pressed,
                ]}
                onPress={handleAddPlate}
              >
                <Text style={styles.addPlateConfirmText}>Dodaj</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {selectedCar ? (
            <>
              <View style={styles.carImageWrapper}>
                <View style={styles.carImageFrame}>
                  {selectedCar.image ? (
                    <Image
                      source={selectedCar.image}
                      style={styles.carImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Pressable
                      style={({ pressed }) => [
                        styles.addPhotoButton,
                        pressed && styles.pressed,
                      ]}
                      onPress={handleCapturePhoto}
                    >
                      <Text style={styles.addPhotoText}>Dodaj zdjęcie</Text>
                    </Pressable>
                  )}
                </View>
              </View>

              <View style={styles.editWrapper}>
                <Pressable
                  style={({ pressed }) => [
                    styles.editButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={handleCapturePhoto}
                >
                  <Text style={styles.editButtonText}>Edytuj</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.deleteButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={handleDelete}
                >
                  <Text style={styles.deleteButtonText}>Usun</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Text style={styles.noCarText}>
              Wybierz samochód z listy tablic rejestracyjnych powyżej.
            </Text>
          )}
        </View>
      </View>
    </ScreenWrapper>
  );
};

export default CarsScreen;

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },

    banner: {
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 10,
    },
    bannerTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 8,
      marginTop: 8,
    },
    platesScrollContent: {
      paddingVertical: 4,
      paddingRight: 4,
      alignItems: "center",
    },
    plateButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
      backgroundColor: isDark ? "#252525" : "#f2f2f2",
    },
    plateButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    plateText: {
      color: colors.subtitle,
      fontSize: 16,
      fontWeight: "600",
    },
    plateTextActive: {
      color: colors.background,
    },

    addPlateButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginLeft: 4,
      marginRight: 4,
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#252525" : "#f2f2f2",
    },
    addPlateText: {
      color: colors.primary,
      fontSize: 24,
      fontWeight: "700",
      lineHeight: 26,
    },
    scanRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 12,
      flexWrap: "wrap",
    },
    scanButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: SCAN_COLOR,
      backgroundColor: isDark ? "#252525" : "#f2f2f2",
      flexDirection: "row",
      alignItems: "center",
    },
    scanButtonDisabled: {
      opacity: 0.6,
    },
    scanButtonText: {
      color: SCAN_COLOR,
      fontSize: 15,
      fontWeight: "700",
    },
    aiBadgeAnimated: {
      marginLeft: 6,
      position: "relative",
      top: -2,
    },
    aiBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.2)",
      shadowColor: "#d946ef",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.95,
      shadowRadius: 22,
      elevation: 16,
    },
    aiBadgeText: {
      color: "#ffffff",
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.3,
      textShadowColor: "#ffffff",
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 6,
    },
    scanStatus: {
      flexDirection: "row",
      alignItems: "center",
      marginLeft: 10,
    },
    scanStatusText: {
      color: colors.subtitle,
      fontSize: 13,
      marginLeft: 8,
    },

    addPlateForm: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 12,
    },
    addPlateInput: {
      flex: 1,
      height: 40,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      color: colors.text,
      backgroundColor: isDark ? "#202020" : "#f7f7f7",
      marginRight: 8,
    },
    addPlateConfirm: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.primary,
    },
    addPlateConfirmText: {
      color: "#101010",
      fontWeight: "700",
      fontSize: 14,
    },

    content: {
      flex: 1,
      padding: 20,
    },

    carImageWrapper: {
      alignItems: "center",
    },

    carImageFrame: {
      width: "100%",
      aspectRatio: 1,
      borderRadius: 16,
      borderWidth: 3,
      borderColor: colors.primary,
      overflow: "hidden",
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    carImage: {
      width: "100%",
      height: "100%",
    },

    addPhotoButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    addPhotoText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: "600",
    },

    editWrapper: {
      marginTop: 16,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
    },
    editButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: isDark ? "#252525" : "#f2f2f2",
    },
    editButtonText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: "600",
    },
    deleteButton: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "#d32f2f",
      backgroundColor: isDark ? "#2a1c1c" : "#fdeaea",
      marginLeft: 10,
    },
    deleteButtonText: {
      color: "#d32f2f",
      fontSize: 15,
      fontWeight: "700",
    },

    noCarText: {
      color: colors.subtitle,
      fontSize: 14,
      marginTop: 24,
    },
    pressed: {
      opacity: 0.85,
    },
  });
