import { useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, type AppStateStatus, View } from "react-native";
import { WippWordmark } from "./Logo";
import { currentProtectMode, subscribeProtect, type ProtectMode } from "../lib/screen-protection";
import { isPrivateSessionUnlocked } from "../lib/private-vault";
import { isPrivateSurface, lockPrivateOnBackground } from "../lib/private-session";
import { useWippStore } from "../lib/store";
import { colors } from "../theme";

/**
 * Overlay de confidentialité du sélecteur d'apps + relock WIPP Privé.
 * Le contenu sensible ne doit pas flasher avant réauthentification.
 */
export function ScreenProtectionHost({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ProtectMode>(currentProtectMode);
  const [cover, setCover] = useState(false);
  const stack = useWippStore((s) => s.stack);
  const top = stack[stack.length - 1];
  const prev = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => subscribeProtect(setMode), []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => {
      const leaving = prev.current === "active" && st !== "active";
      prev.current = st;
      const sensitive =
        mode !== "none" || isPrivateSessionUnlocked() || isPrivateSurface(top);
      if (leaving && sensitive) {
        setCover(true);
        lockPrivateOnBackground();
      }
      if (st === "active") {
        setCover(false);
      }
    });
    return () => sub.remove();
  }, [mode, top]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {cover ? (
        <View
          pointerEvents="auto"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: colors.navy,
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}
        >
          <WippWordmark size={28} color={colors.accent} />
        </View>
      ) : null}
    </View>
  );
}
