import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';

const ORDER = ['index', 'calls', 'explore', 'me'] as const;
const LABELS: Record<string, string> = {
  index: 'Chats',
  calls: 'Appels',
  explore: 'Explorer',
  me: 'Moi',
};

export function WippTabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const visible = ORDER.map((name) => state.routes.find((r) => r.name === name)).filter(Boolean);

  function go(name: string) {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    navigation.navigate(route.name);
  }

  return (
    <>
      <View style={styles.bar}>
        {visible.slice(0, 2).map((route) => (
          <Tab
            key={route!.key}
            label={LABELS[route!.name]}
            active={state.routes[state.index]?.name === route!.name && !open}
            onPress={() => {
              setOpen(false);
              go(route!.name);
            }}
          />
        ))}
        <Pressable style={styles.fab} onPress={() => setOpen(true)}>
          <View style={styles.fabDisc}>
            <Text style={styles.fabGlyph}>⌁</Text>
          </View>
          <Text style={styles.fabLabel}>WIPP</Text>
        </Pressable>
        {visible.slice(2).map((route) => (
          <Tab
            key={route!.key}
            label={LABELS[route!.name]}
            active={state.routes[state.index]?.name === route!.name && !open}
            onPress={() => {
              setOpen(false);
              go(route!.name);
            }}
          />
        ))}
      </View>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>
            wipp <Text style={styles.sheetConnect}>Connect</Text>
          </Text>
          <Text style={styles.sheetSub}>Comment veux-tu te connecter ?</Text>
          <Pressable
            style={styles.touch}
            onPress={() => {
              setOpen(false);
              router.push('/touch');
            }}
          >
            <Text style={styles.badge}>La façon la plus rapide</Text>
            <Text style={styles.touchName}>WIPP Touch</Text>
            <Text style={styles.touchHint}>Rapproche vos téléphones</Text>
          </Pressable>
          {[
            ['Scanner un QR', 'Scanne le WIPP de quelqu’un', '/(tabs)/connect'],
            ['Mon QR', 'Montre ton code', '/(tabs)/connect'],
            ['Rechercher', 'Trouve un @username', '/(tabs)/connect'],
            ['À proximité', 'Les personnes autour de toi', '/(tabs)/connect'],
          ].map(([title, hint, href]) => (
            <Pressable
              key={title}
              style={styles.alt}
              onPress={() => {
                setOpen(false);
                router.push(href as '/(tabs)/connect');
              }}
            >
              <View>
                <Text style={styles.altName}>{title}</Text>
                <Text style={styles.altHint}>{hint}</Text>
              </View>
              <Text style={styles.chev}>›</Text>
            </Pressable>
          ))}
        </View>
      </Modal>
    </>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.tab} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    backgroundColor: '#10151f',
    borderTopColor: '#1c2433',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: 10,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabText: { color: '#8b93a7', fontSize: 12, fontWeight: '600' },
  tabOn: { color: '#ffd84d' },
  fab: { width: 76, alignItems: 'center', marginTop: -22 },
  fabDisc: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#ffd84d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabGlyph: { color: '#1a1400', fontSize: 26, fontWeight: '800' },
  fabLabel: { marginTop: 4, color: '#f4f6fb', fontSize: 11, fontWeight: '700' },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: '#121722',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingBottom: 28,
    gap: 10,
  },
  handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: '#3a4254', marginBottom: 6 },
  sheetTitle: { color: '#f4f6fb', fontSize: 26, fontWeight: '800' },
  sheetConnect: { color: '#ffd84d' },
  sheetSub: { color: '#8b93a7', marginBottom: 6 },
  touch: { backgroundColor: '#0e1a33', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(255,216,77,0.35)' },
  badge: { color: '#ffd84d', fontSize: 12, fontWeight: '700' },
  touchName: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 4 },
  touchHint: { color: '#8b93a7', marginTop: 2 },
  alt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0c1018',
    borderRadius: 16,
    padding: 14,
  },
  altName: { color: '#f4f6fb', fontSize: 16, fontWeight: '600' },
  altHint: { color: '#8b93a7', fontSize: 12, marginTop: 2 },
  chev: { color: '#8b93a7', fontSize: 22 },
});
