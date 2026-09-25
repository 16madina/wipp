import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  StyleSheet,
  View,
  type ColorValue,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Pressable, Text, radii, useColors } from '@/design-system';

type WippTabButtonProps = {
  onPress?: (event: GestureResponderEvent) => void;
  accessibilityState?: { selected?: boolean };
  style?: StyleProp<ViewStyle>;
};

function WippTabButton({ onPress, accessibilityState, style }: WippTabButtonProps) {
  const palette = useColors();
  const selected = Boolean(accessibilityState?.selected);

  return (
    <Pressable
      accessibilityLabel="WIPP"
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[style, styles.wippHit]}
    >
      <View style={[styles.wippMark, { backgroundColor: palette.accent }]}>
        <Text variant="label" style={[styles.wippLetter, { color: palette.onAccent }]}>
          W
        </Text>
      </View>
      <Text variant="label" style={{ color: selected ? palette.accent : palette.muted }}>
        WIPP
      </Text>
    </Pressable>
  );
}

function TabIcon({
  color,
  ios,
  android,
}: {
  color: ColorValue;
  ios: 'bubble.left.and.bubble.right' | 'phone' | 'safari' | 'person';
  android: 'chat_bubble' | 'call' | 'explore' | 'person';
}) {
  return <SymbolView name={{ ios, android }} size={22} tintColor={color} />;
}

export default function TabLayout() {
  const palette = useColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.muted,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.line,
          height: 72,
          overflow: 'visible',
          paddingTop: 8,
        },
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color }) => (
            <TabIcon android="chat_bubble" color={color} ios="bubble.left.and.bubble.right" />
          ),
        }}
      />
      <Tabs.Screen
        name="appels"
        options={{
          title: 'Appels',
          tabBarIcon: ({ color }) => <TabIcon android="call" color={color} ios="phone" />,
        }}
      />
      <Tabs.Screen
        name="wipp"
        options={{
          title: 'WIPP',
          tabBarShowLabel: false,
          tabBarButton: (props) => (
            <WippTabButton
              accessibilityState={props.accessibilityState}
              onPress={(event) => {
                props.onPress?.(event);
              }}
              style={props.style}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explorer"
        options={{
          title: 'Explorer',
          tabBarIcon: ({ color }) => <TabIcon android="explore" color={color} ios="safari" />,
        }}
      />
      <Tabs.Screen
        name="moi"
        options={{
          title: 'Moi',
          tabBarIcon: ({ color }) => <TabIcon android="person" color={color} ios="person" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  wippHit: {
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  wippLetter: {
    fontSize: 18,
    lineHeight: 22,
  },
  wippMark: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 52,
    justifyContent: 'center',
    marginTop: -22,
    width: 52,
  },
});
