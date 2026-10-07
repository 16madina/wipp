import { Component, type ReactNode } from "react";
import { Text, View } from "react-native";
import { Btn } from "./ui";
import { colors } from "../theme";
import { logAppError } from "../lib/crash-log";

/**
 * One broken screen must not kill the whole app: show a calm message with « Revenir » instead.
 * `resetKey` (the screen) clears the error when the user navigates elsewhere.
 */
export class ScreenErrorBoundary extends Component<{ resetKey: string; onBack: () => void; silent?: boolean; children: ReactNode }, { error: Error | null; key: string }> {
  state = { error: null as Error | null, key: this.props.resetKey };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  static getDerivedStateFromProps(props: { resetKey: string }, state: { error: Error | null; key: string }) {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }

  componentDidCatch(error: Error) {
    logAppError(error, false, "écran");
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.silent) return null;
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Text style={{ color: colors.fg, fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center" }}>Un problème est survenu</Text>
        <Text style={{ marginTop: 8, color: colors.muted, fontSize: 14, textAlign: "center" }}>Cet écran n’a pas pu s’afficher. Le reste de WIPP fonctionne.</Text>
        <View style={{ marginTop: 22, alignSelf: "stretch" }}>
          <Btn label="Revenir" onPress={() => this.props.onBack()} />
        </View>
      </View>
    );
  }
}
