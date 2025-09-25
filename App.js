import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';

export default function App() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [steps, setSteps] = useState(null);
  const [hint, setHint] = useState("Procure o tesouro!");
  const [bgColor, setBgColor] = useState('#87CEFA');
  const [bearing, setBearing] = useState(0);
  const [heading, setHeading] = useState(0);
  const [treasureFound, setTreasureFound] = useState(false);

  const soundRef = useRef(null);
  const treasureFoundRef = useRef(false);

  let latitude = -23.11412;
  let longitude = -45.70905;
  const TREASURE_DISTANCE_THRESHOLD = 5;

  const loadSound = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound: audioSound } = await Audio.Sound.createAsync(
        require('./musica3.mp3'),
        { shouldPlay: false, isLooping: true }
      );
      
      soundRef.current = audioSound;
    } catch (error) {
      console.log('Erro ao carregar musica:', error);
    }
  };

  const playTreasureMusic = async () => {
    try {
      if (soundRef.current && !treasureFoundRef.current) {
        await soundRef.current.playAsync();
        treasureFoundRef.current = true;
        setTreasureFound(true);
      }
    } catch (error) {
      console.log('Erro ao tocar musica:', error);
    }
  };

  const stopMusic = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        treasureFoundRef.current = false;
        setTreasureFound(false);
      }
    } catch (error) {
      console.log('Erro ao parar musica:', error);
    }
  };

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

  const calcularBearing = (lat1, lon1, lat2, lon2) => {
    const toRad = (value) => (value * Math.PI) / 180;
    
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δλ = toRad(lon2 - lon1);
    
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    
    let θ = Math.atan2(y, x);
    θ = (θ * 180 / Math.PI + 360) % 360;
    
    return θ;
  };

  const updateHint = (distMeters) => {
    if (distMeters < TREASURE_DISTANCE_THRESHOLD) {
      setHint("TESOURO ENCONTRADO! Parabens!");
      if (!treasureFoundRef.current) {
        playTreasureMusic();
      }
    } else if (distMeters < 10) {
      setHint("Muito quente! Esta quase la!");
    } else if (distMeters < 25) {
      setHint("Quente! Esta perto!");
    } else if (distMeters < 50) {
      setHint("Morno! Continue procurando.");
    } else {
      setHint("Frio! Esta longe do tesouro.");
      if (treasureFoundRef.current && distMeters > TREASURE_DISTANCE_THRESHOLD + 5) {
        stopMusic();
      }
    }
  };

  const updateBackground = (distSteps) => {
    if (distSteps < 50) setBgColor('#FF4500');
    else setBgColor('#87CEFA');
  };

  useEffect(() => {
    loadSound();

    let locationSubscription;
    let compassSubscription;

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permissao para acessar localizacao negada');
        return;
      }

      try {
        compassSubscription = Location.watchHeadingAsync((headingData) => {
          setHeading(headingData.trueHeading || headingData.magHeading);
        });
      } catch (error) {
        console.log('Bussola nao disponivel');
      }

      locationSubscription = await Location.watchPositionAsync(
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
          updateHint(distMeters);
          updateBackground(distMeters);
          
          const angle = calcularBearing(
            loc.coords.latitude,
            loc.coords.longitude,
            latitude,
            longitude
          );
          setBearing(angle);
        }
      );
    })();

    return () => {
      if (locationSubscription) locationSubscription.remove();
      if (compassSubscription) compassSubscription.remove();
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const relativeAngle = (360 - ((heading - bearing) + 360) % 360) % 360;

  const Arrow = ({ angle }) => (
    <View style={[styles.arrowContainer, { transform: [{ rotate: `${angle}deg` }] }]}>
      <View style={styles.arrow}>
        <Text style={styles.arrowText}>↑</Text>
      </View>
      <View style={styles.circle} />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Text style={styles.title}>
        {treasureFound ? 'TESOURO ENCONTRADO!' : 'Caça ao Tesouro'}
      </Text>
      
      {treasureFound && (
        <View style={styles.treasureCelebration}>
          <Text style={styles.celebrationText}>PARABENS!</Text>
          <Text style={styles.musicText}>Musica tocando...</Text>
        </View>
      )}
      
      <Text style={styles.locationText}>
        {errorMsg
          ? errorMsg
          : location
          ? `Sua posicao:\nLat: ${location.coords.latitude.toFixed(5)}\nLon: ${location.coords.longitude.toFixed(5)}`
          : <ActivityIndicator size="large" color="#0000ff" />}
      </Text>
      
      <Text style={styles.treasureText}>Tesouro em: Lat {latitude}, Lon {longitude}</Text>
      
      {steps !== null && location && (
        <>
          <Text style={styles.stepsText}>{steps} passos ate o tesouro</Text>
          <Text style={styles.hintText}>{hint}</Text>
          
          <View style={styles.compass}>
            <Arrow angle={relativeAngle} />
            <Text style={styles.compassText}>
              {treasureFound ? 'Missao Cumprida!' : 
               (relativeAngle < 30 || relativeAngle > 330 ? 'Direcao correta!' : 'Gire o celular')}
            </Text>
          </View>

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
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  treasureCelebration: {
    backgroundColor: 'rgba(255, 215, 0, 0.8)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  celebrationText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF0000',
  },
  musicText: {
    fontSize: 16,
    color: '#333',
    marginTop: 5,
  },
  locationText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 10,
    borderRadius: 8,
  },
  treasureText: {
    fontSize: 14,
    marginBottom: 15,
    color: '#555',
    fontWeight: '600',
  },
  stepsText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  hintText: {
    fontSize: 16,
    fontStyle: 'italic',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
    fontWeight: '600',
  },
  compass: {
    alignItems: 'center',
    marginBottom: 20,
  },
  arrowContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  arrow: {
    width: 70,
    height: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FF0000',
    zIndex: 2,
  },
  arrowText: {
    fontSize: 35,
    fontWeight: 'bold',
    color: '#FF0000',
  },
  circle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#333',
    zIndex: 1,
  },
  compassText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  tips: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  tip: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
});