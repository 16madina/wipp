import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/Colors';
import { PinGate } from '@/components/PinGate';
import {
  ensureSession,
  fetchChats,
  postChatPrefs,
  type WippChat,
  type WippProfile,
} from '@/lib/api';
import {
  authenticateBiometric,
  authenticatePrivate,
  biometricAvailable,
  isPrivateEnabled,
  lastPinWaitMs,
  lockChatPrivate,
  privateChatIds,
  replacePrivateCode,
} from '@/lib/private-vault';

const c = Colors.dark;

export default function ChatsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<WippProfile | null>(null);
  const [chats, setChats] = useState<WippChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pinFor, setPinFor] = useState<
    null | { kind: 'open' } | { kind: 'lock'; chatId: string } | { kind: 'reset-next' } | { kind: 'reset-confirm' }
  >(null);
  const [pendingCode, setPendingCode] = useState('');
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hapticTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinWait = useRef<((pin: string | null) => void) | null>(null);

  const askPin = useCallback(
    () =>
      new Promise<string | null>((resolve) => {
        pinWait.current = resolve;
        setPinFor({ kind: 'open' });
      }),
    [],
  );

  const clearHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (hapticTimer.current) clearTimeout(hapticTimer.current);
    holdTimer.current = null;
    hapticTimer.current = null;
  };

  const load = useCallback(async () => {
    setError('');
    try {
      const me = await ensureSession();
      if (!me) {
        router.replace('/login');
        return;
      }
      setProfile(me);
      const hidden = new Set(await privateChatIds());
      const list = await fetchChats();
      setChats(list.filter((chat) => !hidden.has(chat.id) && !chat.archivedAt));
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
        <Pressable
          onPressIn={() => {
            void (async () => {
              if (!(await isPrivateEnabled())) return;
              hapticTimer.current = setTimeout(() => {
                void Haptics.selectionAsync();
              }, 2500);
              holdTimer.current = setTimeout(() => {
                void (async () => {
                  const ok = await authenticatePrivate(askPin);
                  if (ok) router.push('/private');
                  else if (lastPinWaitMs() > 0) {
                    const secs = Math.max(1, Math.ceil(lastPinWaitMs() / 1000));
                    Alert.alert('Code WIPP Privé', `Code incorrect. Réessaie dans ${secs} s.`);
                  }
                })();
              }, 3000);
            })();
          }}
          onPressOut={clearHold}
          delayLongPress={10000}>
          <Text style={styles.brand}>wipp</Text>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push('/archives')}>
            <Text style={styles.muted}>Archives</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/me')} style={styles.meDot}>
            <Text style={styles.meDotText}>{(profile?.displayName || 'W').slice(0, 1).toUpperCase()}</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.stories}>
        <View style={styles.story}>
          <View style={styles.storyRing}>
            <Text style={styles.storyPlus}>+</Text>
          </View>
          <Text style={styles.storyLabel}>Votre story</Text>
        </View>
      </View>
      <View style={styles.filters}>
        {['Tous', 'Perso', 'Boutiques', 'Groupes'].map((label, i) => (
          <View key={label} style={[styles.chip, i === 0 && styles.chipOn]}>
            <Text style={[styles.chipText, i === 0 && styles.chipTextOn]}>{label}</Text>
          </View>
        ))}
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
            }
            onLongPress={() => {
              Alert.alert(item.peer.displayName, undefined, [
                { text: item.pinnedAt ? 'Désépingler' : 'Épingler', onPress: () => void postChatPrefs(item.id, { pinned: !item.pinnedAt }).then(load) },
                { text: 'Archiver', onPress: () => void postChatPrefs(item.id, { archived: true }).then(load) },
                { text: 'Sourdine 1 h', onPress: () => void postChatPrefs(item.id, { mute: '1h' }).then(load) },
                { text: 'Sourdine 8 h', onPress: () => void postChatPrefs(item.id, { mute: '8h' }).then(load) },
                { text: 'Sourdine 1 semaine', onPress: () => void postChatPrefs(item.id, { mute: '1w' }).then(load) },
                { text: 'Sourdine toujours', onPress: () => void postChatPrefs(item.id, { mute: 'always' }).then(load) },
                { text: 'Notifications', onPress: () => void postChatPrefs(item.id, { mute: 'off' }).then(load) },
                { text: 'Marquer non lu', onPress: () => void postChatPrefs(item.id, { manuallyUnread: true }).then(load) },
                { text: 'Marquer lu', onPress: () => void postChatPrefs(item.id, { manuallyUnread: false }).then(load) },
                {
                  text: 'Infos',
                  onPress: () => router.push({ pathname: '/chat-info/[id]', params: { id: item.id, title: item.peer.displayName, username: item.peer.username } }),
                },
                {
                  text: 'Masquer et verrouiller',
                  onPress: () => {
                    void (async () => {
                      if (!(await isPrivateEnabled())) {
                        Alert.alert('WIPP Privé', 'Active WIPP Privé dans Moi avant de masquer une conversation.');
                        return;
                      }
                      const ok = await lockChatPrivate(item.id, askPin);
                      if (ok) await load();
                    })();
                  },
                },
                { text: 'Annuler', style: 'cancel' },
              ]);
            }}>
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
      <PinGate
        visible={pinFor !== null}
        title={pinFor?.kind === 'reset-confirm' ? 'Confirmer le nouveau code' : 'Code WIPP Privé'}
        hint="Ce code est distinct du code de déverrouillage du téléphone."
        onForgot={
          pinFor?.kind === 'open' || pinFor?.kind === 'lock'
            ? () => {
                void (async () => {
                  if (!(await biometricAvailable())) {
                    Alert.alert(
                      'Code oublié',
                      'Sans biométrie configurée, ce code ne peut pas être réinitialisé sur cet appareil.',
                    );
                    return;
                  }
                  const bio = await authenticateBiometric();
                  if (bio !== "success") return;
                  pinWait.current?.(null);
                  pinWait.current = null;
                  setPinFor({ kind: 'reset-next' });
                })();
              }
            : undefined
        }
        onCancel={() => {
          pinWait.current?.(null);
          pinWait.current = null;
          setPendingCode('');
          setPinFor(null);
        }}
        onSubmit={(pin) => {
          if (pinFor?.kind === 'reset-next') {
            if (pin.trim().length < 4) {
              Alert.alert('WIPP Privé', 'Le code doit contenir au moins 4 caractères.');
              return;
            }
            setPendingCode(pin.trim());
            setPinFor({ kind: 'reset-confirm' });
            return;
          }
          if (pinFor?.kind === 'reset-confirm') {
            if (pin.trim() !== pendingCode) {
              Alert.alert('WIPP Privé', 'Les deux codes ne correspondent pas.');
              setPinFor({ kind: 'reset-next' });
              return;
            }
            void replacePrivateCode(pin).then(() => {
              setPendingCode('');
              setPinFor(null);
              Alert.alert('WIPP Privé', 'Nouveau code enregistré. Tes conversations privées sont inchangées.');
            });
            return;
          }
          pinWait.current?.(pin);
          pinWait.current = null;
          setPinFor(null);
        }}
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
  brand: { color: '#f4f6fb', fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  meDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ffd84d', alignItems: 'center', justifyContent: 'center' },
  meDotText: { color: '#1a1400', fontWeight: '800' },
  stories: { paddingHorizontal: 16, paddingBottom: 8 },
  story: { width: 68, alignItems: 'center', gap: 6 },
  storyRing: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#2a3142', alignItems: 'center', justifyContent: 'center' },
  storyPlus: { color: '#ffd84d', fontSize: 22, fontWeight: '700' },
  storyLabel: { color: c.textMuted, fontSize: 11 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#121722' },
  chipOn: { backgroundColor: '#ffd84d' },
  chipText: { color: '#f4f6fb', fontSize: 13 },
  chipTextOn: { color: '#1a1400', fontWeight: '700' },
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
