import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { apiBase, ensureSession, logout, type WippProfile } from '@/lib/api';

const ROWS = [
  ['Confidentialité', '/privacy'],
  ['Notifications', '/privacy'],
  ['Apparence', '/privacy'],
  ['Sécurité', '/privacy'],
  ['Aide', '/privacy'],
] as const;

export default function MeScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<WippProfile | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const me = await ensureSession();
      if (!me) {
        router.replace('/login');
        return;
      }
      setProfile(me);
    })();
  }, [router]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.brand}>wipp</Text>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(profile?.displayName || 'W').slice(0, 1).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{profile?.displayName ?? '…'}</Text>
        <Text style={styles.handle}>@{profile?.username ?? '…'}</Text>
        <Text style={styles.bio}>{profile?.bio || 'Discute · Partage · Découvre'}</Text>
      </View>
      {ROWS.map(([label, href]) => (
        <Pressable key={label} style={styles.row} onPress={() => router.push(href)}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.chev}>›</Text>
        </Pressable>
      ))}
      {profile?.isAdmin ? (
        <Pressable style={styles.row} onPress={() => router.push('/admin')}>
          <Text style={styles.rowLabel}>Administration</Text>
          <Text style={styles.chev}>›</Text>
        </Pressable>
      ) : null}
      <Text style={styles.meta}>Session conservée sur cet appareil.</Text>
      <Text style={styles.meta}>{apiBase()}</Text>
      <Pressable
        style={[styles.logout, busy && { opacity: 0.6 }]}
        disabled={busy}
        onPress={() => {
          setBusy(true);
          void logout().finally(() => router.replace('/login'));
        }}
      >
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070a0f' },
  content: { padding: 18, paddingBottom: 40 },
  brand: { color: '#f4f6fb', fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  hero: { alignItems: 'center', paddingVertical: 18 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#ffd84d', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#1a1400', fontSize: 32, fontWeight: '800' },
  name: { color: '#f4f6fb', fontSize: 22, fontWeight: '700', marginTop: 12 },
  handle: { color: '#ffd84d', marginTop: 2 },
  bio: { color: '#8b93a7', marginTop: 6, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#121722',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
  rowLabel: { color: '#f4f6fb', fontSize: 16 },
  chev: { color: '#8b93a7', fontSize: 22 },
  meta: { color: '#8b93a7', fontSize: 12, marginTop: 14 },
  logout: { marginTop: 18, alignItems: 'center', padding: 14 },
  logoutText: { color: '#ff6b6b', fontWeight: '700' },
});
