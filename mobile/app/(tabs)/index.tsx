import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import {
  ensureSession,
  fetchChats,
  getStoredProfile,
  type WippChat,
  type WippProfile,
} from '@/lib/api';

const c = Colors.dark;

export default function ChatsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<WippProfile | null>(null);
  const [chats, setChats] = useState<WippChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const me = await ensureSession();
      if (!me) {
        router.replace('/login');
        return;
      }
      setProfile(me);
      const list = await fetchChats();
      setChats(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={c.accent} />
        <Text style={styles.muted}>Connexion au serveur WIPP…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.brand}>wipp</Text>
        <Text style={styles.muted}>@{profile?.username ?? '…'}</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} tintColor={c.accent} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aucun chat serveur</Text>
            <Text style={styles.muted}>
              Va dans WIPP / Moi pour écrire à @lea — les messages viennent de Supabase.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
            onPress={() =>
              router.push({
                pathname: '/chat/[id]',
                params: { id: item.id, title: item.peer.displayName, username: item.peer.username },
              })
            }>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(item.peer.displayName || item.peer.username).slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={styles.rowBody}>
              <View style={styles.rowTop}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.peer.displayName}
                </Text>
                <Text style={styles.time}>
                  {item.lastAt
                    ? new Date(item.lastAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : ''}
                </Text>
              </View>
              <Text style={styles.preview} numberOfLines={1}>
                {item.preview || `@${item.peer.username}`}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background, gap: 10 },
  header: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  brand: { color: c.accent, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  muted: { color: c.textMuted, fontSize: 13 },
  error: { color: c.danger, paddingHorizontal: 18, marginBottom: 8 },
  empty: { padding: 28, gap: 8 },
  emptyTitle: { color: c.text, fontSize: 17, fontWeight: '650' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.hair,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: c.accent,
  },
  avatarText: { color: c.accent, fontWeight: '700', fontSize: 18 },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  name: { color: c.text, fontSize: 16, fontWeight: '650', flex: 1 },
  time: { color: c.textMuted, fontSize: 12 },
  preview: { color: c.textMuted, fontSize: 13, marginTop: 3 },
});
