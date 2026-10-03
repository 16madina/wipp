import { Alert, Platform, type AlertButton } from "react-native";

// React Native Web's Alert.alert does nothing, so every confirmation and message
// silently disappeared in the browser. Map it to the browser's own dialogs.
if (Platform.OS === "web" && typeof window !== "undefined") {
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join("\n\n");
    const actions = buttons?.length ? buttons : [{ text: "OK" }];
    const cancel = actions.find((b) => b.style === "cancel");
    const others = actions.filter((b) => b !== cancel);
    if (others.length <= 1 && !cancel) {
      window.alert(text);
      others[0]?.onPress?.();
      return;
    }
    // Two or more choices: OK runs the main (last non-cancel) action, Cancel runs cancel.
    const main = others[others.length - 1];
    if (window.confirm(main?.text ? `${text}\n\n→ ${main.text} ?` : text)) main?.onPress?.();
    else cancel?.onPress?.();
  };
}
