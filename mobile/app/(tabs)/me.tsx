import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Colors from '@/constants/Colors';
import { apiBase, ensureDemoSession, getStoredProfile, type WippProfile } from '@/lib/api';

const c = Colors.dark;

export default function MeScreen() {
  const [profile, setProfile] = useState<WippProfile | null>(null);

  useEffect(() => {
    void (async () => {
      await ensureDemoSession();
      setProfile(await getStoredProfile());
    })();
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.brand}>wipp</Text>
        <Text style={styles.name}>{profile?.displayName ?? '…'}</Text>
        <Text style={styles.handle}>@{profile?.username ?? '…'}</Text>
        <Text style={styles.bio}>{profile?.bio || 'Compte serveur démo'}</Text>
      </View>
      <Text style={styles.meta}>API : {apiBase()}</Text>
      <Text style={styles.meta}>Auth SMS Firebase OTP — prévu plus tard</Text>
      <Text style={styles.meta}>Base : Supabase</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background, padding: 20, gap: 14 },
  card: {
    backgroundColor: c.surface,
    borderRadius: 20,
    padding: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,216,77,0.25)',
  },
  brand: { color: c.accent, fontWeight: '800', fontSize: 18, marginBottom: 8 },
  name: { color: c.text, fontSize: 22, fontWeight: '700' },
  handle: { color: c.accent, fontSize: 14 },
  bio: { color: c.textMuted, marginTop: 8, fontSize: 13 },
  meta: { color: c.textMuted, fontSize: 12 },
});
