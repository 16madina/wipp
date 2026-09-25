import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import Colors from '@/constants/Colors';
import { PinGate } from '@/components/PinGate';
import { fetchChats, type WippChat } from '@/lib/api';
import { privateChatIds, unlockChatFromPrivate } from '@/lib/private-vault';

const c = Colors.dark;

export default function PrivateChatsScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<WippChat[]>([]);
  const [pinOpen, setPinOpen] = useState(false);
  const pinWait = useRef<((pin: string | null) => void) | null>(null);
  const askPin = () =>
    new Promise<string | null>((resolve) => {
      pinWait.current = resolve;
      setPinOpen(true);
    });

  const load = useCallback(async () => {
    const ids = new Set(await privateChatIds());
    const list = await fetchChats();
    setChats(list.filter((chat) => ids.has(chat.id)));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void ScreenCapture.preventScreenCaptureAsync('wipp-prive');
      void load();
      return () => {
        void ScreenCapture.allowScreenCaptureAsync('wipp-prive');
      };
    }, [load]),
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>←</Text>
        </Pressable>
        <Text style={styles.title}>WIPP Privé 🔒</Text>
      </View>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>Aucune conversation privée.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              router.push({
                pathname: '/chat/[id]',
                params: {
                  id: item.id,
                  title: item.peer.displayName,
                  username: item.peer.username,
                  private: '1',
                },
              })
            }
            onLongPress={() => {
              Alert.alert(item.peer.displayName, undefined, [
                {
                  text: 'Retirer de WIPP Privé',
                  onPress: () => {
                    void (async () => {
                      const ok = await unlockChatFromPrivate(item.id, askPin);
                      if (ok) await load();
                    })();
                  },
                },
                { text: 'Annuler', style: 'cancel' },
              ]);
            }}>
            <Text style={styles.name}>{item.peer.displayName}</Text>
            <Text style={styles.preview} numberOfLines={1}>
              {item.preview || `@${item.peer.username}`}
            </Text>
          </Pressable>
        )}
      />
      <PinGate
        visible={pinOpen}
        title="Code WIPP Privé"
        onCancel={() => {
          pinWait.current?.(null);
          pinWait.current = null;
          setPinOpen(false);
        }}
        onSubmit={(pin) => {
          pinWait.current?.(pin);
          pinWait.current = null;
          setPinOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  back: { color: c.accent, fontSize: 22 },
  title: { color: c.text, fontSize: 20, fontWeight: '700' },
  empty: { color: c.textMuted, padding: 24 },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.hair,
  },
  name: { color: c.text, fontSize: 16, fontWeight: '650' },
  preview: { color: c.textMuted, fontSize: 13, marginTop: 3 },
});
