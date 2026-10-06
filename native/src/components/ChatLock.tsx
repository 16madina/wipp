import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { Lock } from "lucide-react-native";
import { Btn, Field, GlassHeader, Header, Row, ScreenRoot, Section, Toggle } from "./ui";
import { usePrivatePinAsk } from "./PrivatePinGate";
import { colors } from "../theme";
import { useWippStore } from "../lib/store";
import {
  authenticateLock,
  hasLockCode,
  isChatLocked,
  lastLockWaitMs,
  lockChat,
  unlockChatForGood,
  lockBiometricOn,
  markChatUnlocked,
  setLockBiometric,
  setLockCode,
  verifyLockCode,
} from "../lib/chat-lock";
import { authenticateBiometric, inspectBiometricHardware } from "../lib/private-vault";

export const LOCK_MIN = 4;

export function useLockPinAsk() {
  return usePrivatePinAsk({ title: "Code de verrouillage", hint: "Entre ton code de verrouillage.", numeric: true });
}

const waitText = () => `Code incorrect. Réessaie dans ${Math.max(1, Math.ceil(lastLockWaitMs() / 1000))} s.`;

/** Confidentialité › Code de verrouillage : créer / modifier le code, biométrie. */
export function ChatLockSettings({ onBack }: { onBack: () => void }) {
  const epoch = useWippStore((s) => s.vaultEpoch);
  void epoch;
  const { askPin, gate } = useLockPinAsk();
  const [step, setStep] = useState<"home" | "create" | "confirm">("home");
  const [draft, setDraft] = useState("");
  const [first, setFirst] = useState("");
  const [bioHw, setBioHw] = useState(false);
  useEffect(() => {
    void inspectBiometricHardware().then((hw) => setBioHw(hw.hasHardware && hw.enrolled));
  }, []);

  if (step !== "home") {
    return (
      <ScreenRoot>
        <GlassHeader>
          <Header title="Code de verrouillage" onBack={() => { setStep("home"); setDraft(""); setFirst(""); }} />
        </GlassHeader>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
            {step === "create"
              ? "Choisis un code d’au moins 4 chiffres, facile à retenir pour toi. Il est différent du code de WIPP Privé et du code du téléphone."
              : "Entre le même code une deuxième fois."}
          </Text>
          <Field label={step === "create" ? "Nouveau code" : "Confirmer le code"} value={draft} onChangeText={(v) => setDraft(v.replace(/\D/g, ""))} secureTextEntry keyboardType="number-pad" />
          <Btn
            label="Continuer"
            disabled={draft.length < LOCK_MIN}
            onPress={() => {
              if (step === "create") {
                setFirst(draft);
                setDraft("");
                setStep("confirm");
                return;
              }
              if (draft !== first) {
                Alert.alert("Code de verrouillage", "Les deux codes ne correspondent pas.");
                setDraft("");
                setStep("create");
                return;
              }
              const existed = hasLockCode();
              void setLockCode(first).then(() => {
                setStep("home");
                setDraft("");
                setFirst("");
                Alert.alert(
                  "Code de verrouillage",
                  existed
                    ? "Le code a été modifié."
                    : "Code créé. Pour verrouiller une conversation : ⋯ dans la conversation, ou appui long sur la conversation dans Chats.",
                );
              });
            }}
          />
        </ScrollView>
      </ScreenRoot>
    );
  }

  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="Code de verrouillage" onBack={onBack} />
      </GlassHeader>
      <ScrollView>
        <Section title="">
          <Row
            label={hasLockCode() ? "Modifier le code" : "Créer le code"}
            onPress={() => {
              void (async () => {
                if (hasLockCode()) {
                  const old = await askPin();
                  if (!old) return;
                  if (!(await verifyLockCode(old)).ok) {
                    Alert.alert("Code de verrouillage", waitText());
                    return;
                  }
                }
                setStep("create");
              })();
            }}
          />
          {hasLockCode() && bioHw ? (
            <Row
              label="Ouvrir avec Face ID / empreinte"
              trailing={
                <Toggle
                  value={lockBiometricOn()}
                  onChange={(v) => {
                    void (async () => {
                      if (v && (await authenticateBiometric()) !== "success") return;
                      await setLockBiometric(v);
                    })();
                  }}
                />
              }
            />
          ) : null}
          {hasLockCode() ? (
            <Row
              label="Code oublié ?"
              onPress={() => {
                void (async () => {
                  if (bioHw && (await authenticateBiometric()) === "success") {
                    setStep("create");
                    return;
                  }
                  Alert.alert("Code oublié", "Sans Face ID / empreinte valide, ce code ne peut pas être récupéré. Il n’existe que sur ce téléphone, jamais sur le serveur.");
                })();
              }}
            />
          ) : null}
        </Section>
        <Text style={{ paddingHorizontal: 16, paddingTop: 12, color: colors.muted, fontSize: 13, lineHeight: 18 }}>
          Une conversation verrouillée reste visible dans Chats, mais son contenu et ses notifications sont masqués. Le code est demandé à chaque ouverture.
        </Text>
      </ScrollView>
      {gate}
    </ScreenRoot>
  );
}

/** Lock or unlock a conversation (asks the code; offers to create it first). */
export function toggleChatLock(chatId: string, askPin: () => Promise<string | null>) {
  if (!hasLockCode()) {
    Alert.alert("Code de verrouillage", "Crée d’abord ton code dans Moi › Paramètres › Confidentialité › Code de verrouillage.", [
      { text: "Plus tard", style: "cancel" },
      { text: "Créer le code", onPress: () => useWippStore.getState().push({ name: "privacy" }) },
    ]);
    return;
  }
  const locked = isChatLocked(chatId);
  void (locked ? unlockChatForGood(chatId, askPin) : lockChat(chatId, askPin)).then((ok) => {
    if (ok) Alert.alert("Code de verrouillage", locked ? "Conversation déverrouillée." : "Conversation verrouillée. Le code sera demandé à chaque ouverture.");
    else if (lastLockWaitMs() > 0) Alert.alert("Code de verrouillage", waitText());
  });
}

/** Shown instead of a locked conversation until the code (or biometrics) is given. */
export function ChatLockGate({ chatId, title, onBack }: { chatId: string; title: string; onBack: () => void }) {
  const { askPin, gate } = useLockPinAsk();
  const open = () => {
    void authenticateLock(askPin).then((ok) => {
      if (ok) markChatUnlocked(chatId);
      else if (lastLockWaitMs() > 0) Alert.alert("Code de verrouillage", waitText());
    });
  };
  useEffect(() => {
    open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={title} onBack={onBack} />
      </GlassHeader>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
          <Lock size={30} color={colors.accent} />
        </View>
        <Text style={{ marginTop: 16, color: colors.fg, fontSize: 17, fontFamily: "Inter_600SemiBold" }}>Conversation verrouillée</Text>
        <Text style={{ marginTop: 6, color: colors.muted, fontSize: 13, textAlign: "center" }}>Entre ton code de verrouillage pour l’ouvrir.</Text>
        <View style={{ marginTop: 20, alignSelf: "stretch" }}>
          <Btn label="Déverrouiller" onPress={open} />
        </View>
      </View>
      {gate}
    </ScreenRoot>
  );
}
