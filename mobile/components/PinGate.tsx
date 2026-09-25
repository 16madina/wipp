import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Colors from '@/constants/Colors';

const c = Colors.dark;

export function PinGate({
  visible,
  title = 'Code WIPP Privé',
  hint,
  onCancel,
  onSubmit,
  onForgot,
}: {
  visible: boolean;
  title?: string;
  hint?: string;
  onCancel: () => void;
  onSubmit: (pin: string) => void;
  onForgot?: () => void;
}) {
  const [pin, setPin] = useState('');
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
          <TextInput
            value={pin}
            onChangeText={setPin}
            secureTextEntry
            keyboardType="number-pad"
            placeholder="Code"
            placeholderTextColor={c.textMuted}
            style={styles.input}
          />
          {onForgot ? (
            <Pressable onPress={onForgot}>
              <Text style={styles.forgot}>Code oublié ?</Text>
            </Pressable>
          ) : null}
          <View style={styles.row}>
            <Pressable onPress={onCancel}>
              <Text style={styles.cancel}>Annuler</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                const value = pin;
                setPin('');
                onSubmit(value);
              }}>
              <Text style={styles.ok}>OK</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  title: { color: c.text, fontSize: 17, fontWeight: '700' },
  hint: { color: c.textMuted, fontSize: 13, lineHeight: 18 },
  forgot: { color: c.accent, fontSize: 14 },
  input: {
    borderWidth: 1,
    borderColor: c.hair,
    borderRadius: 10,
    color: c.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 18 },
  cancel: { color: c.textMuted, fontSize: 16 },
  ok: { color: c.accent, fontSize: 16, fontWeight: '700' },
});
