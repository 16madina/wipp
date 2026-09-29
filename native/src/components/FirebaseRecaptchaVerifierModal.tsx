import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, Button, Modal, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { setRecaptchaVerifier } from "../lib/firebase-phone";
import { FIREBASE_WEB_CONFIG } from "../lib/firebase-config";
import { FirebaseRecaptcha } from "./FirebaseRecaptcha";

export type RecaptchaVerifierHandle = {
  type: "recaptcha";
  verify: () => Promise<string>;
  _reset: () => void;
};

export const FirebaseRecaptchaVerifierModal = forwardRef<RecaptchaVerifierHandle>(function FirebaseRecaptchaVerifierModal(
  _props,
  ref,
) {
  const [visible, setVisible] = useState(false);
  const [visibleLoaded, setVisibleLoaded] = useState(false);
  const [invisibleLoaded, setInvisibleLoaded] = useState(false);
  const [invisibleVerify, setInvisibleVerify] = useState(false);
  const [invisibleKey, setInvisibleKey] = useState(1);
  const pending = useRef<{ resolve: (token: string) => void; reject: (err: Error) => void } | null>(null);
  const invisibleLoadedRef = useRef(false);

  useImperativeHandle(ref, () => ({
    type: "recaptcha" as const,
    verify: () =>
      new Promise<string>((resolve, reject) => {
        pending.current = { resolve, reject };
        if (invisibleLoadedRef.current) setInvisibleVerify(true);
        else {
          setVisible(true);
          setVisibleLoaded(false);
        }
      }),
    _reset: () => {},
  }));

  const finish = (token: string) => {
    pending.current?.resolve(token);
    pending.current = null;
    setVisible(false);
    setInvisibleVerify(false);
    invisibleLoadedRef.current = false;
    setInvisibleLoaded(false);
    setInvisibleKey((n) => n + 1);
  };

  const fail = (message: string) => {
    pending.current?.reject(new Error(message));
    pending.current = null;
    setVisible(false);
    setInvisibleVerify(false);
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <FirebaseRecaptcha
        key={`invisible${invisibleKey}`}
        firebaseConfig={FIREBASE_WEB_CONFIG}
        languageCode="fr"
        invisible
        verify={invisibleLoaded && invisibleVerify}
        onLoad={() => {
          invisibleLoadedRef.current = true;
          setInvisibleLoaded(true);
        }}
        onError={() => fail("Échec du reCAPTCHA")}
        onVerify={finish}
        onFullChallenge={() => {
          setInvisibleVerify(false);
          setVisible(true);
        }}
        style={styles.invisible}
      />
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => fail("Annulé")}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Vérification</Text>
            <View style={styles.cancel}>
              <Button title="Annuler" onPress={() => fail("Annulé")} />
            </View>
          </View>
          <View style={styles.content}>
            <FirebaseRecaptcha
              firebaseConfig={FIREBASE_WEB_CONFIG}
              languageCode="fr"
              onLoad={() => setVisibleLoaded(true)}
              onError={() => fail("Échec du reCAPTCHA")}
              onVerify={finish}
            />
            {!visibleLoaded ? (
              <View style={styles.loader}>
                <ActivityIndicator size="large" />
              </View>
            ) : null}
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
});

export function RecaptchaHost() {
  return (
    <FirebaseRecaptchaVerifierModal
      ref={(instance) => {
        setRecaptchaVerifier(instance);
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { width: 0, height: 0 },
  invisible: { width: 300, height: 300 },
  modal: { flex: 1, backgroundColor: "#fff" },
  header: {
    height: 44,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderBottomColor: "#CECECE",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cancel: { position: "absolute", left: 8 },
  title: { fontWeight: "700", color: "#111" },
  content: { flex: 1 },
  loader: { ...StyleSheet.absoluteFillObject, paddingTop: 20, alignItems: "center" },
});
