import { StyleSheet, Text, View } from 'react-native';
import Colors from '@/constants/Colors';

const c = Colors.dark;

export default function CallsScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Appels</Text>
      <Text style={styles.body}>
        Prochaine étape native : appels A/V (LiveKit). Pour l’instant le socle Expo est branché
        sur la messagerie serveur.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background, padding: 24, gap: 10 },
  title: { color: c.text, fontSize: 24, fontWeight: '700' },
  body: { color: c.textMuted, fontSize: 15, lineHeight: 22 },
});
