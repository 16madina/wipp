import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { PinGate } from '@/components/PinGate';
import { apiBase, ensureSession, logout, type WippProfile } from '@/lib/api';
import { enablePrivateVault, isPrivateEnabled } from '@/lib/private-vault';

const c = Colors.dark;

export default function MeScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<WippProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [priveOn, setPriveOn] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);

  useEffect(() => {
    void isPrivateEnabled().then(setPriveOn);
  }, []);

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

  async function onLogout() {
    setBusy(true);
    try {
      await logout();
      router.replace('/login');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.brand}>wipp</Text>
        <Text style={styles.name}>{profile?.displayName ?? '…'}</Text>
        <Text style={styles.handle}>@{profile?.username ?? '…'}</Text>
        {profile?.isAdmin ? <Text style={styles.badge}>Admin</Text> : null}
        <Text style={styles.bio}>{profile?.bio || 'Compte connecté'}</Text>
        {profile?.phoneE164 ? (
          <Text style={styles.phone}>{profile.phoneE164}</Text>
        ) : null}
      </View>

      {profile?.isAdmin ? (
        <Pressable style={styles.adminBtn} onPress={() => router.push('/admin')}>
          <Text style={styles.adminBtnTxt}>Ouvrir le panneau admin</Text>
          <Text style={styles.adminBtnSub}>Stats · users · messages · modération</Text>
        </Pressable>
      ) : null}

      <Pressable
        style={styles.prive}
        onPress={() => {
          if (priveOn) {
            Alert.alert(
              'WIPP Privé',
              'Pour ouvrir WIPP Privé, maintiens le logo wipp pendant 3 secondes sur Chats.',
            );
            return;
          }
          setPinOpen(true);
        }}>
        <Text style={styles.priveTitle}>WIPP Privé</Text>
        <Text style={styles.priveSub}>
          Cache et protège certaines conversations avec la biométrie de ton appareil.
        </Text>
      </Pressable>
      <PinGate
        visible={pinOpen}
        title="Choisis un code WIPP Privé"
        onCancel={() => setPinOpen(false)}
        onSubmit={(pin) => {
          setPinOpen(false);
          void enablePrivateVault(pin)
            .then(() => {
              setPriveOn(true);
              Alert.alert(
                'WIPP Privé',
                'Pour ouvrir WIPP Privé, maintiens le logo wipp pendant 3 secondes.',
              );
            })
            .catch(() => Alert.alert('WIPP Privé', 'Le code doit contenir au moins 4 caractères.'));
        }}
      />
      <Text style={styles.meta}>Session conservée sur cet appareil.</Text>
      <Text style={styles.meta}>API : {apiBase()}</Text>
      <Pressable
        style={[styles.logout, busy && { opacity: 0.6 }]}
        disabled={busy}
        onPress={() => void onLogout()}>
        <Text style={styles.logoutTxt}>Se déconnecter</Text>
      </Pressable>
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
  badge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: 'rgba(255,216,77,0.15)',
    color: c.accent,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontWeight: '700',
    fontSize: 12,
  },
  bio: { color: c.textMuted, marginTop: 8, fontSize: 13 },
  phone: { color: c.textMuted, fontSize: 12, marginTop: 4 },
  adminBtn: {
    backgroundColor: c.accent,
    borderRadius: 18,
    padding: 16,
  },
  adminBtnTxt: { color: c.accentFg, fontWeight: '800', fontSize: 16 },
  adminBtnSub: { color: 'rgba(11,18,32,0.7)', marginTop: 4, fontSize: 12 },
  meta: { color: c.textMuted, fontSize: 12 },
  prive: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  priveTitle: { color: c.text, fontSize: 16, fontWeight: '700' },
  priveSub: { color: c.textMuted, fontSize: 13, lineHeight: 18 },
  logout: {
    marginTop: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,93,115,0.5)',
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutTxt: { color: '#ff5d73', fontWeight: '700' },
});
