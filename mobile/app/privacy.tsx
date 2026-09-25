import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { PinGate } from '@/components/PinGate';
import {
  authenticateBiometric,
  enablePrivateVault,
  isPrivateEnabled,
  replacePrivateCode,
  verifyPin,
} from '@/lib/private-vault';

const c = Colors.dark;

type PinMode = null | 'create' | 'create-confirm' | 'old' | 'next' | 'confirm';

export default function PrivacyScreen() {
  const router = useRouter();
  const [priveOn, setPriveOn] = useState(false);
  const [detail, setDetail] = useState(false);
  const [pinMode, setPinMode] = useState<PinMode>(null);
  const [pendingCode, setPendingCode] = useState('');

  useFocusEffect(
    useCallback(() => {
      void isPrivateEnabled().then(setPriveOn);
    }, []),
  );

  const title =
    pinMode === 'old'
      ? 'Ancien code WIPP Privé'
      : pinMode === 'confirm' || pinMode === 'create-confirm'
        ? 'Confirmer le nouveau code'
        : 'Code WIPP Privé';

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (detail) {
              setDetail(false);
              return;
            }
            router.back();
          }}
          hitSlop={12}>
          <Text style={styles.back}>←</Text>
        </Pressable>
        <Text style={styles.title}>{detail ? 'WIPP Privé' : 'Confidentialité'}</Text>
      </View>

      {detail ? (
        <View style={styles.card}>
          <Text style={styles.sub}>
            {priveOn
              ? 'Le code WIPP Privé est distinct du code de déverrouillage du téléphone. Les conversations masquées restent sur cet appareil.'
              : 'Choisis un code pour activer le coffre. Il est distinct du code de déverrouillage du téléphone.'}
          </Text>
          <Pressable
            style={styles.row}
            onPress={() => {
              if (!priveOn) {
                setPinMode('create');
                return;
              }
              void (async () => {
                const bio = await authenticateBiometric();
                if (bio === 'success') {
                  setPinMode('next');
                  return;
                }
                if (bio === 'cancel') return;
                setPinMode('old');
              })();
            }}>
            <Text style={styles.rowTitle}>{priveOn ? 'Modifier le code' : 'Créer le code'}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.card} onPress={() => setDetail(true)}>
          <Text style={styles.rowTitle}>WIPP Privé</Text>
          <Text style={styles.sub}>{priveOn ? 'Activé' : 'Désactivé'}</Text>
        </Pressable>
      )}

      <PinGate
        visible={pinMode !== null}
        title={title}
        hint="Ce code est distinct du code de déverrouillage du téléphone."
        onForgot={
          pinMode !== 'old'
            ? undefined
            : () => {
                void (async () => {
                  const bio = await authenticateBiometric();
                  if (bio === 'unavailable') {
                    Alert.alert(
                      'Code oublié',
                      'Sans biométrie configurée, ce code ne peut pas être réinitialisé sur cet appareil. Le coffre reste scellé.',
                    );
                    return;
                  }
                  if (bio === 'success') setPinMode('next');
                })();
              }
        }
        onCancel={() => {
          setPinMode(null);
          setPendingCode('');
        }}
        onSubmit={(pin) => {
          void (async () => {
            try {
              if (pinMode === 'create' || pinMode === 'next') {
                if (pin.trim().length < 4) {
                  Alert.alert('WIPP Privé', 'Le code doit contenir au moins 4 caractères.');
                  return;
                }
                setPendingCode(pin.trim());
                setPinMode(pinMode === 'create' ? 'create-confirm' : 'confirm');
                return;
              }
              if (pinMode === 'create-confirm' || pinMode === 'confirm') {
                if (pin.trim() !== pendingCode) {
                  Alert.alert('WIPP Privé', 'Les deux codes ne correspondent pas.');
                  setPinMode(pinMode === 'create-confirm' ? 'create' : 'next');
                  return;
                }
                if (pinMode === 'create-confirm') {
                  await enablePrivateVault(pin);
                  setPriveOn(true);
                  Alert.alert('WIPP Privé', 'Pour ouvrir WIPP Privé, maintiens le logo wipp pendant 3 secondes.');
                } else {
                  await replacePrivateCode(pin);
                  Alert.alert('WIPP Privé', 'Le code a été modifié. Tes conversations privées sont inchangées.');
                }
                setPendingCode('');
                setPinMode(null);
                return;
              }
              const checked = await verifyPin(pin);
              if (!checked.ok) {
                const secs = Math.max(1, Math.ceil(checked.waitMs / 1000));
                Alert.alert('Code WIPP Privé', `Code incorrect. Réessaie dans ${secs} s.`);
                return;
              }
              setPinMode('next');
            } catch {
              Alert.alert('WIPP Privé', 'Le code doit contenir au moins 4 caractères.');
            }
          })();
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
  card: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  row: { paddingVertical: 8 },
  rowTitle: { color: c.text, fontSize: 16, fontWeight: '700' },
  sub: { color: c.textMuted, fontSize: 13, lineHeight: 18 },
});
