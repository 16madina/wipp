import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { fetchChats, postChatPrefs, type WippChat } from '@/lib/api';
import { privateChatIds } from '@/lib/private-vault';
import Colors from '@/constants/Colors';

const c = Colors.dark;

export default function ArchivesScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<WippChat[]>([]);

  const load = useCallback(async () => {
    const hidden = new Set(await privateChatIds());
    const list = await fetchChats();
    setChats(list.filter((chat) => chat.archivedAt && !hidden.has(chat.id)));
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={{ color: c.textMuted, padding: 24 }}>Aucune conversation archivée.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={{ padding: 16 }}
            onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id, title: item.peer.displayName } })}>
            <Text style={{ color: c.text }}>{item.peer.displayName}</Text>
            <Pressable onPress={() => void postChatPrefs(item.id, { archived: false }).then(load)}>
              <Text style={{ color: c.accent, marginTop: 6 }}>Désarchiver</Text>
            </Pressable>
          </Pressable>
        )}
      />
    </View>
  );
}
