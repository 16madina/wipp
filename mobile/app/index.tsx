import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { restoreSession } from '@/lib/api';

/**
 * Porte d’entrée WhatsApp-like :
 * logo / animation → si session valide → chats, sinon → login.
 */
export default function BootScreen() {
  const router = useRouter();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const [status, setStatus] = useState('Ouverture…');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 520, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, useNativeDriver: true }),
    ]).start();

    let cancelled = false;
    const minSplash = new Promise((r) => setTimeout(r, 900));

    void (async () => {
      setStatus('Vérification de la session…');
      const [profile] = await Promise.all([restoreSession(), minSplash]);
      if (cancelled) return;
      if (profile) {
        setStatus(`Bonjour @${profile.username}`);
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [opacity, router, scale]);

  return (
    <View style={styles.root}>
      <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center' }}>
        <Image
          source={require('../assets/images/icon.png')}
          style={styles.logo}
          accessibilityLabel="Wipp"
        />
        <Text style={styles.brand}>wipp</Text>
        <Text style={styles.status}>{status}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 112,
    height: 112,
    borderRadius: 28,
    marginBottom: 18,
  },
  brand: {
    color: Colors.dark.tint,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  status: {
    marginTop: 14,
    color: '#8b93a7',
    fontSize: 14,
  },
});
