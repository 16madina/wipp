import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import * as Clipboard from 'expo-clipboard';
import Colors from '@/constants/Colors';
import {
  editMessage,
  ensureSession,
  fetchChats,
  fetchMessages,
  getStoredProfile,
  hideMessage,
  pinMessage,
  postFocus,
  postReceipts,
  postTyping,
  reactMessage,
  sendMessage,
  tombstoneMessage,
  type WippMessage,
  type WippProfile,
} from '@/lib/api';
import { decodePlain, encodePlain } from '../../../src/lib/messaging/plain';
import { dropOutbox, enqueueOutbox, listOutbox } from '@/lib/outbox';
import { startNativeStream } from '@/lib/live';
import { readReceiptsEnabled } from '@/lib/receipts-pref';
import {
  decryptDmBody,
  encryptDmBody,
  ensureE2eReady,
} from '@/lib/e2e';
import type { KeyBundle } from '@/lib/e2e-crypto';

const c = Colors.dark;

type DisplayMessage = WippMessage & {
  displayText: string;
  replyPreview?: string;
  forwarded?: boolean;
};

export default function ChatScreen() {
  const { id, title, username, private: isPrivate } = useLocalSearchParams<{
    id: string;
    title?: string;
    private?: string;
    username?: string;
  }>();
  const navigation = useNavigation();
  const [me, setMe] = useState<WippProfile | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [text, setText] = useState('');
  const [findOpen, setFindOpen] = useState(false);
  const [threadQuery, setThreadQuery] = useState('');
  const [reply, setReply] = useState<DisplayMessage | null>(null);
  const [editing, setEditing] = useState<DisplayMessage | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [peerTyping, setPeerTyping] = useState('');
  const [forwardChoices, setForwardChoices] = useState<{ id: string; title: string }[] | null>(null);
  const [forwardText, setForwardText] = useState('');
  const listRef = useRef<FlatList<DisplayMessage>>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [identity, setIdentity] = useState<KeyBundle | null>(null);
  const [peerPub, setPeerPub] = useState<JsonWebKey | null>(null);
  const [e2eHint, setE2eHint] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({
      title: title || (username ? `@${username}` : 'Chat'),
    });
  }, [navigation, title, username]);

  useEffect(() => {
    if (isPrivate !== '1') return;
    void ScreenCapture.preventScreenCaptureAsync('wipp-prive-chat');
    return () => {
      void ScreenCapture.allowScreenCaptureAsync('wipp-prive-chat');
    };
  }, [isPrivate]);

  const decodeList = useCallback(
    async (list: WippMessage[], idBundle: KeyBundle, chatId: string) => {
      const out: DisplayMessage[] = [];
      for (const m of list) {
        const dec = await decryptDmBody(idBundle, chatId, m.body);
        if ('failed' in dec && dec.failed) {
          out.push({ ...m, displayText: '🔒 Impossible de déchiffrer', encFailed: true, encrypted: true });
        } else if (dec.encrypted) {
          const plain = decodePlain(dec.text ?? '');
          out.push({
            ...m,
            text: plain.text,
            displayText: m.deletedAt ? 'Message supprimé' : plain.text || '🔒 Message chiffré',
            encrypted: true,
            replyTo: plain.reply?.id ?? m.replyTo,
            replyPreview: plain.reply?.preview,
            forwarded: plain.forwarded,
          });
        } else {
          const plain = decodePlain(dec.text ?? m.body);
          out.push({
            ...m,
            text: plain.text,
            displayText: m.deletedAt ? 'Message supprimé' : plain.text,
            encrypted: false,
            replyTo: plain.reply?.id ?? m.replyTo,
            replyPreview: plain.reply?.preview,
            forwarded: plain.forwarded,
          });
        }
      }
      return out;
    },
    [],
  );

  const load = useCallback(async () => {
    if (!id) return;
    await ensureSession();
    const profile = await getStoredProfile();
    setMe(profile);
    if (!profile) {
      setLoading(false);
      return;
    }
    const idBundle = await ensureE2eReady();
    setIdentity(idBundle);
    const chats = await fetchChats();
    const chat = chats.find((c) => c.id === id);
    const pub = chat?.peer.e2ePublicJwk ?? null;
    setPeerPub(pub);
    setE2eHint(pub ? 'DM chiffré de bout en bout' : 'En attente de la clé E2E du contact');
    const list = await fetchMessages(id);
    setMessages(await decodeList(list, idBundle, id));
    setLoading(false);
  }, [decodeList, id]);

  useLayoutEffect(() => {
    void load().catch(() => setLoading(false));
    if (!id) return;
    void AsyncStorage.getItem(`wipp-draft:${id}`).then((saved) => {
      if (saved) setText(saved);
    });
  }, [load, id]);

  async function onSend() {
    const body = text.trim();
    if (!body || !id || sending || !identity) return;
    setSending(true);
    setText('');
    try {
      const clientId = editing ? editing.id : `m_${Date.now()}`;
      const cite = reply?.displayText.slice(0, 80);
      const plain = encodePlain({
        text: body,
        reply: reply ? { id: reply.id, preview: cite ?? '' } : undefined,
        forwarded: editing?.forwarded,
      });
      const wire = peerPub != null ? await encryptDmBody(identity, peerPub, id, plain) : plain;
      if (editing) {
        await editMessage(id, editing.id, wire);
        setEditing(null);
      } else {
        const item = {
          chatId: id,
          clientId,
          text: body,
          replyId: reply?.id,
          replyPreview: cite,
          vault: isPrivate === '1',
        };
        await enqueueOutbox(item);
        await sendMessage(id, wire, clientId, { replyTo: reply?.id, vault: isPrivate === '1' });
        await dropOutbox(clientId);
      }
      setReply(null);
      if (id) await AsyncStorage.removeItem(`wipp-draft:${id}`);
      await load();
    } catch {
      setText(body);
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    void postFocus(id, true);
    const beat = setInterval(() => void postFocus(id, true), 12_000);
    const mine = me?.id;
    const incoming = messages.filter((m) => m.senderId !== mine && !m.deletedAt).map((m) => m.id);
    if (incoming.length) {
      void readReceiptsEnabled().then((on) => postReceipts(id, incoming, on ? 'read' : 'delivered'));
    }
    return () => {
      clearInterval(beat);
      void postFocus(id, false);
      void postTyping(id, false);
    };
  }, [id, me?.id, messages.length]);

  useEffect(() => {
    if (!id || !identity) return;
    const stop = startNativeStream((event) => {
      if (event.chatId !== id) return;
      if (event.kind === 'typing') {
        const payload = event.payload as { active?: boolean; profileId?: string; username?: string };
        if (payload.profileId && payload.profileId === me?.id) return;
        if (typingTimer.current) clearTimeout(typingTimer.current);
        if (payload.active) {
          setPeerTyping(payload.username ? `${payload.username} écrit…` : 'écrit…');
          typingTimer.current = setTimeout(() => setPeerTyping(''), 4500);
        } else {
          setPeerTyping('');
        }
        return;
      }
      void load();
    });
    void (async () => {
      const queued = (await listOutbox()).filter((item) => item.chatId === id);
      for (const item of queued) {
        try {
          const plain = encodePlain({
            text: item.text,
            reply: item.replyId ? { id: item.replyId, preview: item.replyPreview ?? '' } : undefined,
            forwarded: item.forwarded,
          });
          const wire = peerPub != null ? await encryptDmBody(identity, peerPub, id, plain) : plain;
          await sendMessage(id, wire, item.clientId, { replyTo: item.replyId, vault: item.vault });
          await dropOutbox(item.clientId);
        } catch {
          /* keep queued */
        }
      }
      if (queued.length) await load();
    })();
    return () => {
      stop();
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [id, identity, peerPub, load, me?.id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}>
      {e2eHint ? <Text style={styles.e2e}>{e2eHint}</Text> : null}
      {peerTyping ? <Text style={styles.e2e}>{peerTyping}</Text> : null}
      <FlatList
        ref={listRef}
        data={messages.filter((m) => !threadQuery.trim() || m.displayText.toLowerCase().includes(threadQuery.trim().toLowerCase()))}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 14, gap: 8 }}
        onScrollToIndexFailed={() => undefined}
        renderItem={({ item }) => {
          const mine = me && item.senderId === me.id;
          const status = !mine || item.deletedAt ? '' : item.readAt ? 'Lu' : item.deliveredAt ? 'Reçu' : 'Envoyé';
          const swipe = PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) => g.dx > 18 && Math.abs(g.dy) < 20,
            onPanResponderRelease: (_, g) => {
              if (g.dx > 48 && !item.deletedAt) setReply(item);
            },
          });
          return (
            <Pressable
              {...swipe.panHandlers}
              onLongPress={() => {
                if (!id) return;
                const buttons: { text: string; onPress?: () => void; style?: 'destructive' | 'cancel' }[] = [];
                if (!item.deletedAt) {
                  buttons.push({ text: 'Répondre', onPress: () => setReply(item) });
                  buttons.push({ text: '❤️', onPress: () => void reactMessage(id, item.id, '❤️').then(() => load()) });
                  buttons.push({ text: '😂', onPress: () => void reactMessage(id, item.id, '😂').then(() => load()) });
                  if (item.displayText && !item.displayText.startsWith('🔒')) {
                    buttons.push({
                      text: 'Copier',
                      onPress: () => {
                        void Clipboard.setStringAsync(item.displayText);
                      },
                    });
                  }
                  buttons.push({
                    text: 'Transférer',
                    onPress: () => {
                      void fetchChats().then((chats) => {
                        setForwardText(item.displayText);
                        setForwardChoices(
                          chats
                            .filter((chat) => chat.id !== id)
                            .map((chat) => ({ id: chat.id, title: chat.peer.displayName })),
                        );
                      });
                    },
                  });
                }
                if (mine && !item.deletedAt && Date.now() - item.createdAt < 15 * 60 * 1000 && item.displayText && !item.displayText.startsWith('🔒')) {
                  buttons.push({
                    text: 'Modifier',
                    onPress: () => {
                      setEditing(item);
                      setText(item.displayText);
                    },
                  });
                  buttons.push({
                    text: 'Supprimer pour tout le monde',
                    style: 'destructive',
                    onPress: () => void tombstoneMessage(id, item.id).then(() => load()),
                  });
                }
                buttons.push({
                  text: 'Supprimer pour moi',
                  style: 'destructive',
                  onPress: () => void hideMessage(id, item.id).then(() => load()),
                });
                if (!item.deletedAt) {
                  buttons.push({
                    text: item.pinnedAt ? 'Désépingler' : 'Épingler',
                    onPress: () => void pinMessage(id, item.id, !item.pinnedAt).then(() => load()),
                  });
                }
                buttons.push({
                  text: selected.includes(item.id) ? 'Retirer la sélection' : 'Sélectionner',
                  onPress: () =>
                    setSelected((ids) =>
                      ids.includes(item.id) ? ids.filter((x) => x !== item.id) : [...ids, item.id],
                    ),
                });
                buttons.push({ text: 'Annuler', style: 'cancel' });
                Alert.alert(item.deletedAt ? 'Message supprimé' : 'Message', undefined, buttons);
              }}>
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs, selected.includes(item.id) && { borderWidth: 1, borderColor: c.accent }]}>
                {item.replyTo ? (
                  <Pressable
                    onPress={() => {
                      const at = messages.findIndex((m) => m.id === item.replyTo);
                      if (at >= 0) listRef.current?.scrollToIndex({ index: at, viewPosition: 0.4 });
                    }}>
                    <Text style={styles.cite}>{item.replyPreview || 'Message'}</Text>
                  </Pressable>
                ) : null}
                {item.forwarded ? <Text style={styles.meta}>Transféré</Text> : null}
                <Text style={[styles.bubbleText, mine && { color: c.accentFg }]}>{item.displayText}</Text>
                {item.editedAt ? <Text style={styles.meta}>Modifié</Text> : null}
                {item.pinnedAt ? <Text style={styles.meta}>Épinglé</Text> : null}
                {item.reactions?.length ? (
                  <Text style={styles.meta}>{item.reactions.map((r) => r.emoji).join(' ')}</Text>
                ) : null}
                {status ? <Text style={styles.meta}>{status}</Text> : null}
              </View>
            </Pressable>
          );
        }}
      />
      {selected.length ? (
        <Pressable
          onPress={() => {
            if (!id) return;
            for (const mid of selected) void hideMessage(id, mid);
            setSelected([]);
            void load();
          }}
          style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={styles.cite}>Supprimer pour moi ({selected.length})</Text>
        </Pressable>
      ) : null}
      {forwardChoices ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <Text style={styles.cite}>Transférer vers</Text>
          {forwardChoices.map((choice) => (
            <Pressable
              key={choice.id}
              onPress={() => {
                if (!identity || !forwardText) return;
                void (async () => {
                  const chats = await fetchChats();
                  const dest = chats.find((chat) => chat.id === choice.id);
                  const destPub = dest?.peer.e2ePublicJwk ?? null;
                  const plain = encodePlain({ text: forwardText, forwarded: true });
                  const wire = destPub ? await encryptDmBody(identity, destPub, choice.id, plain) : plain;
                  const clientId = `m_${Date.now()}`;
                  await sendMessage(choice.id, wire, clientId, { vault: false });
                  setForwardChoices(null);
                  setForwardText('');
                })();
              }}>
              <Text style={styles.bubbleText}>{choice.title}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Pressable onPress={() => setFindOpen((v) => !v)} style={{ paddingHorizontal: 16 }}>
        <Text style={styles.cite}>Rechercher</Text>
      </Pressable>
      {findOpen ? (
        <TextInput
          value={threadQuery}
          onChangeText={setThreadQuery}
          placeholder="Rechercher dans la conversation"
          placeholderTextColor={c.textMuted}
          style={[styles.input, { marginHorizontal: 12, marginBottom: 8 }]}
        />
      ) : null}
      {reply ? <Text style={[styles.cite, { paddingHorizontal: 16 }]}>Réponse · {reply.displayText.slice(0, 40)}</Text> : null}
      {editing ? <Text style={[styles.cite, { paddingHorizontal: 16 }]}>Modification</Text> : null}
      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={(value) => {
            setText(value);
            if (id) {
              void postTyping(id, value.trim().length > 0);
              if (value.trim()) void AsyncStorage.setItem(`wipp-draft:${id}`, value);
              else void AsyncStorage.removeItem(`wipp-draft:${id}`);
            }
          }}
          placeholder="Message"
          placeholderTextColor={c.textMuted}
          style={styles.input}
          onSubmitEditing={() => void onSend()}
        />
        <Pressable style={styles.send} onPress={() => void onSend()} disabled={sending}>
          <Text style={styles.sendText}>Envoyer</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background },
  e2e: {
    textAlign: 'center',
    color: c.textMuted,
    fontSize: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  mine: { alignSelf: 'flex-end', backgroundColor: c.accent },
  theirs: { alignSelf: 'flex-start', backgroundColor: c.surface2 },
  bubbleText: { color: c.text, fontSize: 15, lineHeight: 20 },
  cite: { color: c.textMuted, fontSize: 12, marginBottom: 4 },
  meta: { color: c.textMuted, fontSize: 11, marginTop: 4 },
  composer: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.hair,
    backgroundColor: c.surface,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    backgroundColor: c.surface2,
    color: c.text,
  },
  send: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: c.accentFg, fontWeight: '800' },
});
