import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { ensureDemoSession, openDm } from '@/lib/api';

const c = Colors.dark;

export default function ConnectScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('lea');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function startChat() {
    setBusy(true);
    setError('');
    try {
      await ensureDemoSession();
      const chat = await openDm(username.trim().replace(/^@/, ''));
      router.push({
        pathname: '/chat/[id]',
        params: { id: chat.id, title: chat.peer.displayName, username: chat.peer.username },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <Text style={styles.kicker}>CONNECT</Text>
      <Text style={styles.title}>Écrire à un @username</Text>
      <Text style={styles.body}>Recherche serveur Supabase — essai @lea ou @samira.</Text>
      <TextInput
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="@lea"
        placeholderTextColor={c.textMuted}
        style={styles.input}
      />
      <Pressable
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }, busy && { opacity: 0.6 }]}
        disabled={busy || !username.trim()}
        onPress={() => void startChat()}>
        {busy ? <ActivityIndicator color={c.accentFg} /> : <Text style={styles.ctaText}>Ouvrir le chat</Text>}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background, padding: 24, gap: 12 },
  kicker: { color: c.accent, letterSpacing: 2, fontSize: 11, fontWeight: '700' },
  title: { color: c.text, fontSize: 26, fontWeight: '700' },
  body: { color: c.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  input: {
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: c.surface,
    color: c.text,
    borderWidth: 1,
    borderColor: c.hair,
    fontSize: 16,
  },
  cta: {
    height: 52,
    borderRadius: 999,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: c.accentFg, fontWeight: '800', fontSize: 15 },
  error: { color: c.danger, marginTop: 4 },
});
