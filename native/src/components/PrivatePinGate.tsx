import { useRef, useState } from "react";
import { Modal, Text, TextInput, View } from "react-native";
import { Btn, Press } from "./ui";
import { colors } from "../theme";

export function PrivatePinGate({
  visible,
  title = "Code WIPP Privé",
  hint = "Ce code est distinct du code PIN du téléphone.",
  onCancel,
  onSubmit,
}: {
  visible: boolean;
  title?: string;
  hint?: string;
  onCancel: () => void;
  onSubmit: (pin: string) => void;
}) {
  const [pin, setPin] = useState("");
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Press onPress={onCancel} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 }}>
        <Press onPress={() => undefined} style={{ borderRadius: 16, backgroundColor: colors.surface, padding: 20 }}>
          <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold", fontSize: 17 }}>{title}</Text>
          <Text style={{ marginTop: 8, color: colors.muted, fontSize: 13, lineHeight: 18 }}>{hint}</Text>
          <TextInput
            value={pin}
            onChangeText={setPin}
            secureTextEntry
            autoFocus
            autoCapitalize="none"
            placeholder="••••"
            placeholderTextColor={colors.muted}
            style={{
              marginTop: 16,
              height: 48,
              borderRadius: 8,
              paddingHorizontal: 16,
              color: colors.fg,
              backgroundColor: colors.surface2,
              fontSize: 18,
              letterSpacing: 6,
            }}
          />
          <View style={{ marginTop: 16, gap: 8 }}>
            <Btn
              label="Continuer"
              disabled={pin.trim().length < 4}
              onPress={() => {
                const next = pin.trim();
                setPin("");
                onSubmit(next);
              }}
            />
            <Btn
              label="Annuler"
              variant="ghost"
              onPress={() => {
                setPin("");
                onCancel();
              }}
            />
          </View>
        </Press>
      </Press>
    </Modal>
  );
}

export function usePrivatePinAsk() {
  const [open, setOpen] = useState(false);
  const wait = useRef<((v: string | null) => void) | null>(null);
  function askPin() {
    return new Promise<string | null>((resolve) => {
      wait.current = resolve;
      setOpen(true);
    });
  }
  const gate = (
    <PrivatePinGate
      visible={open}
      onCancel={() => {
        wait.current?.(null);
        wait.current = null;
        setOpen(false);
      }}
      onSubmit={(pin) => {
        wait.current?.(pin);
        wait.current = null;
        setOpen(false);
      }}
    />
  );
  return { askPin, gate };
}
