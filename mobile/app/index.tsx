import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';

/**
 * L'application ouverte dans le navigateur, affichée plein écran dans Expo.
 * Elle vient de l'ordinateur (même adresse qu'Expo, port 8080), pas d'un site public.
 */
function appOnThisComputer() {
  const hostUri = Constants.expoConfig?.hostUri ?? '';
  const host = hostUri.split(':')[0];
  if (!host) return null;
  return `http://${host}:8080`;
}

export default function BootScreen() {
  const url = useMemo(() => appOnThisComputer(), []);
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <View style={styles.root}>
        <Text style={styles.brand}>wipp</Text>
        <Text style={styles.message}>
          Lance d’abord l’application sur l’ordinateur, puis rouvre Wipp ici.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <WebView
        source={{ uri: url }}
        style={styles.web}
        originWhitelist={['*']}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        setSupportMultipleWindows={false}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <Text style={styles.brand}>wipp</Text>
            <ActivityIndicator color="#ffd84d" />
          </View>
        )}
        onHttpError={() => setFailed(true)}
        onError={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070a0f' },
  web: { flex: 1, backgroundColor: '#070a0f' },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#070a0f',
    gap: 16,
  },
  brand: {
    color: '#ffd84d',
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  message: {
    color: '#f9fafb',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 28,
  },
});
