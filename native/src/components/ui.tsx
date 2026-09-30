import type { ReactNode } from "react";
import { Pressable, Text, TextInput, View, type StyleProp, type ViewStyle } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptic } from "../lib/haptics";
import { useT } from "../lib/store";
import { colors, layout } from "../theme";

export function SafeTop() {
  const insets = useSafeAreaInsets();
  return <View style={{ height: insets.top, backgroundColor: "transparent" }} />;
}

export function Press({
  onPress,
  onLongPress,
  children,
  style,
  disabled,
  accessibilityLabel,
}: {
  onPress?: () => void;
  onLongPress?: () => void;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        if (!disabled) haptic("tap");
        onPress?.();
      }}
      onLongPress={onLongPress}
      style={({ pressed }) => [style, pressed && !disabled ? { transform: [{ scale: 0.96 }] } : null]}
    >
      {children}
    </Pressable>
  );
}

export function Btn({
  label,
  onPress,
  variant = "primary",
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "navy";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg =
    variant === "primary"
      ? colors.accent
      : variant === "navy"
        ? colors.navy
        : variant === "danger"
          ? "rgba(255,93,115,0.15)"
          : variant === "ghost"
            ? "transparent"
            : colors.glassCard;
  const color =
    variant === "primary" ? colors.accentFg : variant === "danger" ? colors.danger : colors.fg;
  return (
    <Press
      disabled={disabled}
      onPress={onPress}
      style={[
        {
          height: 48,
          minHeight: layout.minTouch,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 20,
          backgroundColor: bg,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      <Text style={{ color, fontSize: 15, fontFamily: "Inter_500Medium" }}>{label}</Text>
    </Press>
  );
}

export function IconBtn({
  label,
  onPress,
  children,
  size,
}: {
  label: string;
  onPress?: () => void;
  children: ReactNode;
  size?: number;
}) {
  const s = size ?? layout.minTouch;
  return (
    <Press
      onPress={onPress}
      accessibilityLabel={label}
      style={{
        width: s,
        height: s,
        flexShrink: 0,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
      }}
    >
      {children}
    </Press>
  );
}

export function Header({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const t = useT();
  return (
    <View
      style={{
        height: layout.navBarHeight,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
      }}
    >
      {onBack ? (
        <IconBtn label={t("back")} onPress={onBack} size={40}>
          <ChevronLeft size={24} color={colors.fg} />
        </IconBtn>
      ) : (
        <View style={{ width: 8 }} />
      )}
      <View style={{ flex: 1, minWidth: 0, overflow: "hidden", justifyContent: "center" }}>
        {typeof title === "string" ? (
          <Text numberOfLines={1} style={{ fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.fg }}>
            {title}
          </Text>
        ) : (
          title
        )}
        {subtitle ? (
          typeof subtitle === "string" ? (
            <Text numberOfLines={1} style={{ fontSize: 12, color: colors.muted }}>
              {subtitle}
            </Text>
          ) : (
            subtitle
          )
        ) : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", flexShrink: 0 }}>{right}</View>
    </View>
  );
}

export function Row({
  icon,
  label,
  value,
  onPress,
  danger,
  trailing,
}: {
  icon?: ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  trailing?: ReactNode;
}) {
  const inner = (
    <View
      style={{
        minHeight: layout.minTouch,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
    >
      {icon ? (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: colors.surface2,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </View>
      ) : null}
      <Text style={{ flex: 1, fontSize: 15, color: danger ? colors.danger : colors.fg, fontFamily: "Inter_400Regular" }}>
        {label}
      </Text>
      {value ? <Text style={{ fontSize: 13, color: colors.muted }}>{value}</Text> : null}
      {trailing}
      {onPress && !trailing ? <ChevronRight size={16} color={colors.muted} /> : null}
    </View>
  );
  if (onPress) return <Press onPress={onPress}>{inner}</Press>;
  return inner;
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View>
      <Text
        style={{
          paddingHorizontal: 16,
          paddingBottom: 6,
          fontSize: 13,
          fontFamily: "Inter_500Medium",
          color: colors.muted,
        }}
      >
        {title}
      </Text>
      <View style={{ backgroundColor: colors.surface, overflow: "hidden" }}>{children}</View>
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  trailing,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  trailing?: ReactNode;
}) {
  return (
    <Press
      onPress={onPress}
      style={{
        height: 32,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: active ? colors.accent : colors.surface2,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontFamily: "Inter_500Medium",
          color: active ? colors.accentFg : colors.fg,
        }}
      >
        {label}
      </Text>
      {trailing}
    </Press>
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      style={{
        height: 44,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 15,
        color: colors.fg,
        backgroundColor: colors.glassCard,
        fontFamily: "Inter_400Regular",
      }}
    />
  );
}

export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <View style={{ paddingHorizontal: 24, paddingTop: 48, alignItems: "center" }}>
      <Text style={{ fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.fg, textAlign: "center" }}>
        {title}
      </Text>
      {body ? (
        <Text style={{ marginTop: 8, fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 20 }}>
          {body}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: 20, alignSelf: "stretch" }}>{action}</View> : null}
    </View>
  );
}

export function GlassHeader({ children }: { children: ReactNode }) {
  return (
    <View style={{ backgroundColor: colors.glassStrong }}>
      <SafeTop />
      {children}
    </View>
  );
}

export function ScreenRoot({ children, padBottom }: { children: ReactNode; padBottom?: boolean }) {
  const insets = useSafeAreaInsets();
  const bottom = padBottom ? layout.tabBarHeight + Math.max(insets.bottom, 8) + 20 : 0;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingBottom: bottom }}>{children}</View>
  );
}

export const PENDING = "NATIVE/BACKEND INTEGRATION PENDING";

export function PendingNote({ label }: { label?: string }) {
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "rgba(255,216,77,0.12)",
        borderWidth: 1,
        borderColor: "rgba(255,216,77,0.28)",
      }}
    >
      <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.accent }}>{PENDING}</Text>
      {label ? <Text style={{ marginTop: 2, fontSize: 11, color: colors.muted }}>{label}</Text> : null}
    </View>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "phone-pad" | "url" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words";
  secureTextEntry?: boolean;
}) {
  return (
    <View>
      <Text style={{ marginBottom: 6, fontSize: 12, fontFamily: "Inter_500Medium", color: colors.muted }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        style={{
          minHeight: multiline ? 88 : 48,
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: multiline ? 12 : 0,
          fontSize: 15,
          color: colors.fg,
          backgroundColor: colors.surface2,
          fontFamily: "Inter_400Regular",
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Press
      onPress={() => onChange(!value)}
      style={{
        width: 44,
        height: 26,
        borderRadius: 999,
        backgroundColor: value ? colors.accent : colors.surface2,
        justifyContent: "center",
        paddingHorizontal: 3,
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: value ? colors.accentFg : colors.muted,
          alignSelf: value ? "flex-end" : "flex-start",
        }}
      />
    </Press>
  );
}

export function Badge({ n }: { n: number }) {
  if (!n) return null;
  return (
    <View
      style={{
        minWidth: 18,
        height: 18,
        paddingHorizontal: 5,
        borderRadius: 999,
        backgroundColor: colors.accent,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.ink }}>
        {n > 9 ? "9+" : n}
      </Text>
    </View>
  );
}
