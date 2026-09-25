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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ink, Pressable, radii, Text } from '@/design-system';

type WippTabButtonProps = {
  onPress?: (event: GestureResponderEvent) => void;
  accessibilityState?: { selected?: boolean };
  style?: StyleProp<ViewStyle>;
};

function Handsets() {
  return (
    <View style={styles.handsets}>
      <View style={styles.handsetLeft}>
        <SymbolView
          name={{ ios: 'phone.fill', android: 'call' }}
          size={15}
          tintColor={ink.text}
        />
      </View>
      <View style={styles.handsetRight}>
        <SymbolView
          name={{ ios: 'phone.fill', android: 'call' }}
          size={15}
          tintColor={ink.text}
        />
      </View>
    </View>
  );
}

function WippTabButton({ onPress, accessibilityState, style }: WippTabButtonProps) {
  const selected = Boolean(accessibilityState?.selected);

  return (
    <Pressable
      accessibilityLabel="WIPP"
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[style, styles.wippHit]}
    >
      <View style={styles.wippMark}>
        <Handsets />
      </View>
      <Text variant="label" style={{ color: selected ? ink.yellow : ink.muted }}>
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
  ios: 'bubble.left' | 'phone' | 'location.north.line' | 'person';
  android: 'chat_bubble' | 'call' | 'explore' | 'person';
}) {
  return <SymbolView name={{ ios, android }} size={22} tintColor={color} />;
}

const badgeStyle = {
  backgroundColor: ink.yellow,
  color: ink.onYellow,
  fontSize: 10,
  fontWeight: '700' as const,
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ink.yellow,
        tabBarInactiveTintColor: ink.muted,
        tabBarBadgeStyle: badgeStyle,
        tabBarStyle: {
          backgroundColor: ink.background,
          borderTopColor: ink.line,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 58 + insets.bottom,
          overflow: 'visible',
          paddingBottom: Math.max(insets.bottom - 4, 6),
          paddingTop: 6,
        },
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chats',
          tabBarBadge: '9+',
          tabBarIcon: ({ color }) => (
            <TabIcon android="chat_bubble" color={color} ios="bubble.left" />
          ),
        }}
      />
      <Tabs.Screen
        name="appels"
        options={{
          title: 'Appels',
          tabBarBadge: '1',
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
          tabBarIcon: ({ color }) => (
            <TabIcon android="explore" color={color} ios="location.north.line" />
          ),
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
  handsets: {
    height: 22,
    width: 28,
  },
  handsetLeft: {
    left: 0,
    position: 'absolute',
    top: 2,
    transform: [{ rotate: '-125deg' }],
  },
  handsetRight: {
    position: 'absolute',
    right: 0,
    top: 2,
    transform: [{ rotate: '55deg' }],
  },
  wippHit: {
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  wippMark: {
    alignItems: 'center',
    backgroundColor: ink.yellow,
    borderRadius: radii.pill,
    height: 48,
    justifyContent: 'center',
    marginTop: -14,
    width: 48,
  },
});
