import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { ensureDemoSession, openDm } from '@/lib/api';
import { acceptTouchCode, resolveTouchCode } from '@/lib/touch-api';

const c = Colors.dark;

export default function ConnectScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('lea');
  const [touchCode, setTouchCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [touchMsg, setTouchMsg] = useState('');

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

  /** Receiver fallback: enter same ephemeral code (no need to open Touch as B). */
  async function redeemTouch() {
    setBusy(true);
    setError('');
    setTouchMsg('');
    try {
      await ensureDemoSession();
      const code = touchCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      await resolveTouchCode(code, { manual: true });
      const { invite } = await acceptTouchCode(code);
      setTouchMsg(`Connecté avec ${invite.sender.displayName}`);
      setTouchCode('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Code invalide');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <Text style={styles.kicker}>CONNECT</Text>
      <Text style={styles.title}>Écrire à un @username</Text>
      <Text style={styles.body}>Recherche serveur Supabase — essai @lea ou @samira.</Text>
      <Pressable
        style={({ pressed }) => [styles.touchCta, pressed && { opacity: 0.9 }]}
        onPress={() => router.push('/touch')}>
        <Text style={styles.touchCtaText}>WIPP Touch — Partager mon WIPP</Text>
      </Pressable>
      <Text style={styles.sub}>Code reçu (QR / dicté) — même invitation que le BLE</Text>
      <TextInput
        value={touchCode}
        onChangeText={setTouchCode}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="ABCD2345"
        placeholderTextColor={c.textMuted}
        style={styles.input}
        maxLength={12}
      />
      <Pressable
        style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.9 }, busy && { opacity: 0.6 }]}
        disabled={busy || touchCode.trim().length < 6}
        onPress={() => void redeemTouch()}>
        <Text style={styles.secondaryText}>Accepter le code WIPP</Text>
      </Pressable>
      {touchMsg ? <Text style={styles.ok}>{touchMsg}</Text> : null}
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
  sub: { color: c.textMuted, fontSize: 12, marginTop: 4 },
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
  ctaText: { color: c.accentFg, fontWeight: '700', fontSize: 16 },
  secondary: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.hair,
  },
  secondaryText: { color: c.text, fontWeight: '600' },
  touchCta: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.accent,
  },
  touchCtaText: { color: c.accent, fontWeight: '700' },
  error: { color: '#f87171', fontSize: 13 },
  ok: { color: c.accent, fontSize: 13 },
});
