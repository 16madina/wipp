import { useCallback, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import Colors from '@/constants/Colors';
import {
  ensureSession,
  fetchChats,
  fetchMessages,
  getStoredProfile,
  sendMessage,
  type WippMessage,
  type WippProfile,
} from '@/lib/api';
import {
  decryptDmBody,
  encryptDmBody,
  ensureE2eReady,
} from '@/lib/e2e';
import type { KeyBundle } from '@/lib/e2e-crypto';

const c = Colors.dark;

type DisplayMessage = WippMessage & {
  displayText: string;
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

  const decodeList = useCallback(
    async (list: WippMessage[], idBundle: KeyBundle, chatId: string) => {
      const out: DisplayMessage[] = [];
      for (const m of list) {
        const dec = await decryptDmBody(idBundle, chatId, m.body);
        if ('failed' in dec && dec.failed) {
          out.push({ ...m, displayText: '🔒 Impossible de déchiffrer', encFailed: true, encrypted: true });
        } else if (dec.encrypted) {
          out.push({
            ...m,
            text: dec.text,
            displayText: dec.text ?? '🔒 Message chiffré',
            encrypted: true,
          });
        } else {
          out.push({ ...m, text: dec.text, displayText: dec.text, encrypted: false });
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
  }, [load]);

  async function onSend() {
    const body = text.trim();
    if (!body || !id || sending || !identity) return;
    setSending(true);
    setText('');
    try {
      const clientId = `m_${Date.now()}`;
      const wire =
        peerPub != null
          ? await encryptDmBody(identity, peerPub, id, body)
          : body;
      const msg = await sendMessage(id, wire, clientId);
      const [display] = await decodeList([msg], identity, id);
      // Show our plaintext immediately even if envelope round-trips
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== msg.id),
        { ...display, displayText: body, text: body, encrypted: peerPub != null },
      ]);
    } catch {
      setText(body);
    } finally {
      setSending(false);
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
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}>
      {e2eHint ? <Text style={styles.e2e}>{e2eHint}</Text> : null}
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 14, gap: 8 }}
        renderItem={({ item }) => {
          const mine = me && item.senderId === me.id;
          return (
            <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              <Text style={[styles.bubbleText, mine && { color: c.accentFg }]}>
                {item.displayText}
              </Text>
            </View>
          );
        }}
      />
      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
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
