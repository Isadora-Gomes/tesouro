import * as Location from 'expo-location';
import { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [steps, setSteps] = useState(null);
  const [hint, setHint] = useState("Procure o tesouro!");
  const [bgColor, setBgColor] = useState('#87CEFA');

  let latitude = -23.122230;
  let longitude = -45.722250;

  const distancia = (lat1, lon1, lat2, lon2) => {
    const raio = 6371e3;
    const toRad = (value) => (value * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return raio * c;
  };

  const updateHint = (distSteps) => {
    if (distSteps < 10) setHint("Muito quente! Está quase lá!");
    else if (distSteps < 25) setHint("Quente! Está perto!");
    else if (distSteps < 50) setHint("Morno! Continue procurando.");
    else setHint("Frio! Está longe do tesouro.");
  };

  const updateBackground = (distSteps) => {
    if (distSteps < 50) setBgColor('#FF4500');
    else setBgColor('#87CEFA');
  };

  useEffect(() => {
    let subscription;
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permissão para acessar localização negada');
        return;
      }
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 500,
          distanceInterval: 0.5,
        },
        (loc) => {
          setLocation(loc);
          const distMeters = distancia(
            loc.coords.latitude,
            loc.coords.longitude,
            latitude,
            longitude
          );
          const distSteps = Math.round(distMeters / 0.8);
          setSteps(distSteps);
          updateHint(distSteps);
          updateBackground(distSteps);
        }
      );
    })();
    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Text>
        {errorMsg
          ? errorMsg
          : location
          ? `Sua posição: \nLat: ${location.coords.latitude.toFixed(5)}\nLon: ${location.coords.longitude.toFixed(5)}`
          : "Carregando localização..."}
      </Text>
      <Text>Latitude Tesouro: {latitude}</Text>
      <Text>Longitude Tesouro: {longitude}</Text>
      {steps !== null && (
        <>
          <Text>{steps} passos até o tesouro</Text>
          <Text>{hint}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
