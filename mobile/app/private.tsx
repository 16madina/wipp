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
import {
  authenticateBiometric,
  lastPinWaitMs,
  privateChatIds,
  replacePrivateCode,
  unlockChatFromPrivate,
} from '@/lib/private-vault';

const c = Colors.dark;

export default function PrivateChatsScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<WippChat[]>([]);
  const [pinFor, setPinFor] = useState<null | 'open' | 'reset-next' | 'reset-confirm'>(null);
  const [pendingCode, setPendingCode] = useState('');
  const pinWait = useRef<((pin: string | null) => void) | null>(null);
  const askPin = () =>
    new Promise<string | null>((resolve) => {
      pinWait.current = resolve;
      setPinFor('open');
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
                      else if (lastPinWaitMs() > 0) {
                        const secs = Math.max(1, Math.ceil(lastPinWaitMs() / 1000));
                        Alert.alert('Code WIPP Privé', `Code incorrect. Réessaie dans ${secs} s.`);
                      }
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
        visible={pinFor !== null}
        title={pinFor === 'reset-confirm' ? 'Confirmer le nouveau code' : 'Code WIPP Privé'}
        hint="Ce code est distinct du code de déverrouillage du téléphone."
        onForgot={
          pinFor === 'open'
            ? () => {
                void (async () => {
                  const bio = await authenticateBiometric();
                  if (bio === 'unavailable') {
                    Alert.alert(
                      'Code oublié',
                      'Sans biométrie configurée, ce code ne peut pas être réinitialisé sur cet appareil. Le coffre reste scellé.',
                    );
                    return;
                  }
                  if (bio !== 'success') return;
                  pinWait.current?.(null);
                  pinWait.current = null;
                  setPinFor('reset-next');
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
          if (pinFor === 'reset-next') {
            if (pin.trim().length < 4) {
              Alert.alert('WIPP Privé', 'Le code doit contenir au moins 4 caractères.');
              return;
            }
            setPendingCode(pin.trim());
            setPinFor('reset-confirm');
            return;
          }
          if (pinFor === 'reset-confirm') {
            if (pin.trim() !== pendingCode) {
              Alert.alert('WIPP Privé', 'Les deux codes ne correspondent pas.');
              setPinFor('reset-next');
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
