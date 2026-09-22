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
import Colors from '@/constants/Colors';
import {
  ensureDemoSession,
  fetchMessages,
  getStoredProfile,
  sendMessage,
  type WippMessage,
  type WippProfile,
} from '@/lib/api';

const c = Colors.dark;

export default function ChatScreen() {
  const { id, title, username } = useLocalSearchParams<{
    id: string;
    title?: string;
    username?: string;
  }>();
  const navigation = useNavigation();
  const [me, setMe] = useState<WippProfile | null>(null);
  const [messages, setMessages] = useState<WippMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: title || (username ? `@${username}` : 'Chat'),
    });
  }, [navigation, title, username]);

  const load = useCallback(async () => {
    if (!id) return;
    await ensureDemoSession();
    setMe(await getStoredProfile());
    const list = await fetchMessages(id);
    setMessages(list);
    setLoading(false);
  }, [id]);

  useLayoutEffect(() => {
    void load().catch(() => setLoading(false));
  }, [load]);

  async function onSend() {
    const body = text.trim();
    if (!body || !id || sending) return;
    setSending(true);
    setText('');
    try {
      const clientId = `m_${Date.now()}`;
      const msg = await sendMessage(id, body, clientId);
      setMessages((prev) => [...prev.filter((m) => m.id !== msg.id), msg]);
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
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 14, gap: 8 }}
        renderItem={({ item }) => {
          const mine = me && item.senderId === me.id;
          return (
            <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              <Text style={[styles.bubbleText, mine && { color: c.accentFg }]}>{item.body}</Text>
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
