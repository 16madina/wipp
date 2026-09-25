import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Colors from '@/constants/Colors';
import { fetchMessages, postChatPrefs, type WippMessage } from '@/lib/api';
import { ensureSession } from '@/lib/api';
import { decodePlain } from '../../../src/lib/messaging/plain';
import { decryptDmBody, ensureE2eReady } from '@/lib/e2e';

const c = Colors.dark;

export default function ChatInfoScreen() {
  const { id, title, username } = useLocalSearchParams<{ id: string; title?: string; username?: string }>();
  const [lines, setLines] = useState<{ media: string[]; links: string[]; docs: string[] }>({
    media: [],
    links: [],
    docs: [],
  });

  const load = useCallback(async () => {
    if (!id) return;
    await ensureSession();
    const identity = await ensureE2eReady();
    const list = await fetchMessages(id);
    const media: string[] = [];
    const links: string[] = [];
    const docs: string[] = [];
    for (const message of list as WippMessage[]) {
      if (message.deletedAt) continue;
      const dec = await decryptDmBody(identity, id, message.body);
      const text = 'failed' in dec && dec.failed ? '' : decodePlain(dec.text ?? '').text;
      for (const url of text.match(/https?:\/\/\S+/g) ?? []) links.push(url);
      if (message.body.includes('"type":"image"') || message.body.includes('"type":"video"')) media.push('Média');
    }
    setLines({ media, links, docs });
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ color: c.text, fontSize: 22, fontWeight: '700' }}>{title || 'Infos'}</Text>
      {username ? <Text style={{ color: c.textMuted }}>@{username}</Text> : null}
      <Text style={{ color: c.textMuted }}>Chiffré de bout en bout</Text>
      {id ? (
        <View style={{ gap: 8 }}>
          <Pressable onPress={() => void postChatPrefs(id, { pinned: true })}><Text style={{ color: c.text }}>Épingler</Text></Pressable>
          <Pressable onPress={() => void postChatPrefs(id, { mute: 'always' })}><Text style={{ color: c.text }}>Sourdine toujours</Text></Pressable>
          <Pressable onPress={() => void postChatPrefs(id, { mute: '1h' })}><Text style={{ color: c.text }}>Sourdine 1 heure</Text></Pressable>
          <Pressable onPress={() => void postChatPrefs(id, { mute: '8h' })}><Text style={{ color: c.text }}>Sourdine 8 heures</Text></Pressable>
          <Pressable onPress={() => void postChatPrefs(id, { mute: '1w' })}><Text style={{ color: c.text }}>Sourdine 1 semaine</Text></Pressable>
          <Pressable onPress={() => void postChatPrefs(id, { mute: 'off' })}><Text style={{ color: c.text }}>Réactiver</Text></Pressable>
        </View>
      ) : null}
      <Text style={{ color: c.textMuted, marginTop: 12 }}>Médias</Text>
      <Text style={{ color: c.text }}>{lines.media.length ? lines.media.join('\n') : 'Aucun média dans ce fil.'}</Text>
      <Text style={{ color: c.textMuted }}>Liens</Text>
      <Text style={{ color: c.text }}>{lines.links.length ? lines.links.join('\n') : 'Aucun lien dans ce fil.'}</Text>
      <Text style={{ color: c.textMuted }}>Documents</Text>
      <Text style={{ color: c.text }}>{lines.docs.length ? lines.docs.join('\n') : 'Aucun document dans ce fil.'}</Text>
    </ScrollView>
  );
}
