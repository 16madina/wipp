import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import {
  adminBlock,
  adminUnblock,
  ensureSession,
  fetchAdminFlags,
  fetchAdminMessages,
  fetchAdminStats,
  fetchAdminUsers,
  linkAdminPhone,
  type WippProfile,
} from '@/lib/api';

const c = Colors.dark;

type Tab = 'stats' | 'users' | 'messages' | 'flags';

export default function AdminScreen() {
  const router = useRouter();
  const [me, setMe] = useState<WippProfile | null>(null);
  const [tab, setTab] = useState<Tab>('stats');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [users, setUsers] = useState<Awaited<ReturnType<typeof fetchAdminUsers>>>([]);
  const [messages, setMessages] = useState<Awaited<ReturnType<typeof fetchAdminMessages>>>([]);
  const [flags, setFlags] = useState<Awaited<ReturnType<typeof fetchAdminFlags>>>([]);
  const [phone, setPhone] = useState('');
  const [blockUser, setBlockUser] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const profile = await ensureSession();
      if (!profile?.isAdmin) {
        router.replace('/(tabs)/me');
        return;
      }
      setMe(profile);
      setPhone(profile.phoneE164 || '');
      const [s, u, m, f] = await Promise.all([
        fetchAdminStats(),
        fetchAdminUsers(),
        fetchAdminMessages(),
        fetchAdminFlags(),
      ]);
      setStats(s);
      setUsers(u);
      setMessages(m);
      setFlags(f);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur admin');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  async function onSavePhone() {
    try {
      const profile = await linkAdminPhone(phone.trim());
      setMe(profile);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de lier le numéro');
    }
  }

  async function onBlock() {
    try {
      await adminBlock(blockUser.trim().replace(/^@/, ''), 'moderation');
      setBlockUser('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Blocage impossible');
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Panneau admin</Text>
      <Text style={styles.sub}>@{me?.username} · accès modération</Text>

      <View style={styles.phoneBox}>
        <Text style={styles.label}>Ton numéro admin (connexion téléphone + MDP)</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+225…"
          placeholderTextColor="#8b93a7"
        />
        <Pressable style={styles.smallCta} onPress={() => void onSavePhone()}>
          <Text style={styles.smallCtaTxt}>Enregistrer le numéro</Text>
        </Pressable>
      </View>

      <View style={styles.tabs}>
        {(['stats', 'users', 'messages', 'flags'] as Tab[]).map((t) => (
          <Pressable key={t} style={[styles.tab, tab === t && styles.tabOn]} onPress={() => setTab(t)}>
            <Text style={styles.tabTxt}>
              {t === 'stats' ? 'Stats' : t === 'users' ? 'Users' : t === 'messages' ? 'Msgs' : 'Flags'}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.err}>{error}</Text> : null}

      {tab === 'stats' && stats ? (
        <View style={styles.grid}>
          {Object.entries(stats).map(([k, v]) => (
            <View key={k} style={styles.stat}>
              <Text style={styles.statN}>{v}</Text>
              <Text style={styles.statL}>{k}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {tab === 'users' ? (
        <>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={blockUser}
              onChangeText={setBlockUser}
              placeholder="@username à bloquer"
              placeholderTextColor="#8b93a7"
              autoCapitalize="none"
            />
            <Pressable style={styles.smallCta} onPress={() => void onBlock()}>
              <Text style={styles.smallCtaTxt}>Bloquer</Text>
            </Pressable>
          </View>
          <FlatList
            data={users}
            keyExtractor={(u) => u.id}
            refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} tintColor={c.accent} />}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  @{item.username} {item.role === 'admin' ? '· admin' : ''}
                </Text>
                <Text style={styles.cardMeta}>
                  {item.displayName}
                  {item.phoneE164 ? ` · ${item.phoneE164}` : ''}
                  {item.blockedByAdmin ? ' · bloqué' : ''}
                </Text>
                {item.blockedByAdmin ? (
                  <Pressable
                    onPress={() => void adminUnblock(item.username).then(load)}>
                    <Text style={styles.link}>Débloquer</Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          />
        </>
      ) : null}

      {tab === 'messages' ? (
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>@{item.username}</Text>
              <Text style={styles.cardMeta}>{item.preview}</Text>
            </View>
          )}
        />
      ) : null}

      {tab === 'flags' ? (
        <FlatList
          data={flags}
          keyExtractor={(f) => f.id}
          ListEmptyComponent={<Text style={styles.cardMeta}>Aucun signalement ouvert.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {item.targetType} · {item.status}
              </Text>
              <Text style={styles.cardMeta}>{item.reason || item.targetId}</Text>
            </View>
          )}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background },
  title: { color: c.accent, fontSize: 28, fontWeight: '800' },
  sub: { color: c.textMuted, marginBottom: 12 },
  phoneBox: { backgroundColor: c.surface, borderRadius: 16, padding: 12, marginBottom: 12, gap: 8 },
  label: { color: c.textMuted, fontSize: 12 },
  input: {
    backgroundColor: c.surface2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: c.text,
  },
  smallCta: {
    backgroundColor: c.accent,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  smallCtaTxt: { color: c.accentFg, fontWeight: '700', fontSize: 13 },
  tabs: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  tab: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: c.surface2 },
  tabOn: { borderWidth: 1, borderColor: c.accent },
  tabTxt: { color: c.text, fontWeight: '600', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: {
    width: '47%',
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 14,
  },
  statN: { color: c.accent, fontSize: 28, fontWeight: '800' },
  statL: { color: c.textMuted, marginTop: 4, fontSize: 12 },
  card: { backgroundColor: c.surface, borderRadius: 14, padding: 12, marginBottom: 8 },
  cardTitle: { color: c.text, fontWeight: '700' },
  cardMeta: { color: c.textMuted, marginTop: 4, fontSize: 13 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 10, alignItems: 'center' },
  err: { color: '#ff5d73', marginBottom: 8 },
  link: { color: c.accent, marginTop: 8, fontWeight: '600' },
});
