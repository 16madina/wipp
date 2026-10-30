/**
 * One phone per account (like WhatsApp): this phone tells the server it is using the account.
 * If another phone holds it, the person chooses: continue here (the other phone is signed out) or sign out here.
 * If this phone was replaced by another one, it signs out with a message.
 */
import { Alert, Platform } from "react-native";
import { wippApi } from "./proximity/wipp-session";
import { getInstallationId } from "./push/install-id";
import { useWippStore } from "./store";
import { tr } from "./tr";

let busy = false;
let asking = false;

async function claim(force: boolean) {
  return wippApi<{ ok: boolean }>("device/claim", {
    method: "POST",
    body: JSON.stringify({ installationId: await getInstallationId(), platform: Platform.OS, force }),
  });
}

export async function checkThisDevice() {
  if (busy || asking) return;
  busy = true;
  try {
    await claim(false);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "device_replaced") {
      useWippStore.getState().signOut();
      Alert.alert(tr("Compte utilisé ailleurs"), tr("Ton compte WIPP est maintenant utilisé sur un autre téléphone. Tu as été déconnecté de celui-ci."));
    } else if (code === "other_device") {
      asking = true;
      Alert.alert(
        tr("Compte déjà connecté"),
        tr("Ton compte WIPP est déjà connecté sur un autre téléphone. Si tu continues ici, l’autre téléphone sera déconnecté."),
        [
          {
            text: tr("Me déconnecter"),
            style: "cancel",
            onPress: () => {
              asking = false;
              useWippStore.getState().signOut();
            },
          },
          {
            text: tr("Continuer ici"),
            onPress: () => {
              asking = false;
              void claim(true).catch(() => undefined);
            },
          },
        ],
        { cancelable: false },
      );
    }
    // Network error or old server: try again next time.
  } finally {
    busy = false;
  }
}
