import { SymbolView } from 'expo-symbols';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Face } from '@/chats/faces';
import {
  chatsForFilter,
  filters,
  stories,
  type ChatFilter,
  type ChatRow,
  type Story,
} from '@/chats/data';
import { ink, Pressable, radii, spacing, Text } from '@/design-system';

export default function ChatsRoute() {
  const [filter, setFilter] = useState<ChatFilter>('tous');
  const rows = chatsForFilter(filter);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <StatusBar style="light" />
      <Header />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Stories />
        <Demandes />
        <Filters selected={filter} onSelect={setFilter} />
        {rows.map((row) => (
          <ChatListRow key={row.id} row={row} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <View style={styles.wordmark}>
        <Text variant="wordmark" style={styles.wordmarkText}>
          wipp
        </Text>
        <View style={styles.swooshClip}>
          <View style={styles.swoosh} />
        </View>
      </View>
      <View style={styles.headerActions}>
        <Pressable accessibilityLabel="Rechercher" onPress={noop} style={styles.iconHit}>
          <SymbolView
            name={{ ios: 'magnifyingglass', android: 'search' }}
            size={22}
            tintColor={ink.text}
          />
        </Pressable>
        <Pressable accessibilityLabel="Nouveau" onPress={noop} style={styles.iconHit}>
          <SymbolView name={{ ios: 'plus', android: 'add' }} size={24} tintColor={ink.text} />
        </Pressable>
        <View style={styles.headerAvatar}>
          <Face kind="vous" size={36} />
          <View style={styles.headerDot} />
        </View>
      </View>
    </View>
  );
}

function Stories() {
  return (
    <ScrollView
      horizontal
      contentContainerStyle={styles.storiesContent}
      showsHorizontalScrollIndicator={false}
    >
      {stories.map((story) => (
        <StoryItem key={story.id} story={story} />
      ))}
    </ScrollView>
  );
}

function StoryItem({ story }: { story: Story }) {
  return (
    <View style={styles.story}>
      <View style={styles.storyRingWrap}>
        <View style={styles.storyRing}>
          <Face kind={story.face} size={54} />
        </View>
        <StoryBadge story={story} />
      </View>
      <Text numberOfLines={story.label ? 2 : 1} style={styles.storyLabel} variant="label">
        {story.label}
      </Text>
    </View>
  );
}

function StoryBadge({ story }: { story: Story }) {
  if (story.badge === 'none') return null;
  if (story.badge === 'dot') return <View style={styles.storyDot} />;

  return (
    <View style={styles.storyBadge}>
      {story.badge === 'plus' ? (
        <Text style={styles.storyBadgeMark} variant="label">
          +
        </Text>
      ) : null}
      {story.badge === 'play' ? (
        <SymbolView
          name={{ ios: 'play.fill', android: 'play_arrow' }}
          size={11}
          tintColor={ink.onYellow}
        />
      ) : null}
      {story.badge === 'music' ? (
        <SymbolView
          name={{ ios: 'music.note', android: 'music_note' }}
          size={12}
          tintColor={ink.onYellow}
        />
      ) : null}
    </View>
  );
}

function Demandes() {
  return (
    <Pressable accessibilityLabel="Demandes" onPress={noop} style={styles.demandes}>
      <SymbolView
        name={{ ios: 'person.badge.plus', android: 'person_add' }}
        size={24}
        tintColor={ink.text}
      />
      <Text style={styles.demandesLabel} variant="name">
        Demandes
      </Text>
      <CountBadge value="2" />
    </Pressable>
  );
}

function Filters({
  selected,
  onSelect,
}: {
  selected: ChatFilter;
  onSelect: (filter: ChatFilter) => void;
}) {
  return (
    <ScrollView
      horizontal
      contentContainerStyle={styles.filters}
      showsHorizontalScrollIndicator={false}
    >
      {filters.map((item) => {
        const active = item.id === selected;
        return (
          <Pressable
            accessibilityState={{ selected: active }}
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={[styles.pill, active ? styles.pillActive : styles.pillIdle]}
          >
            <Text style={active ? styles.pillTextActive : styles.pillText} variant="name">
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function ChatListRow({ row }: { row: ChatRow }) {
  return (
    <Pressable accessibilityLabel={row.name} onPress={noop} style={styles.row}>
      <View style={styles.rowAvatar}>
        <Face kind={row.face} size={52} />
        {row.dot ? <View style={styles.rowDot} /> : null}
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text numberOfLines={1} style={styles.rowName} variant="name">
            {row.name}
          </Text>
          {row.chip ? (
            <View style={styles.chip}>
              <Text style={styles.chipText} variant="label">
                {row.chip}
              </Text>
            </View>
          ) : null}
          <SymbolView
            name={{ ios: 'lock.fill', android: 'lock' }}
            size={12}
            tintColor={ink.muted}
          />
          {row.clock ? (
            <SymbolView
              name={{ ios: 'clock', android: 'schedule' }}
              size={12}
              tintColor={ink.muted}
            />
          ) : null}
          <View style={styles.flex} />
          <Text style={styles.time} variant="meta">
            {row.time}
          </Text>
        </View>
        <View style={styles.rowBottom}>
          <Text numberOfLines={1} style={styles.preview} variant="preview">
            {row.preview}
          </Text>
          {row.unread ? <CountBadge value={row.unread} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

function CountBadge({ value }: { value: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText} variant="label">
        {value}
      </Text>
    </View>
  );
}

function noop() {}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: ink.background,
    flex: 1,
  },
  scroll: {
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  wordmark: {
    alignSelf: 'flex-start',
  },
  wordmarkText: {
    color: ink.text,
    letterSpacing: -0.6,
  },
  swooshClip: {
    height: 8,
    marginTop: -4,
    overflow: 'hidden',
  },
  swoosh: {
    borderColor: ink.yellow,
    borderRadius: 18,
    borderWidth: 2.5,
    height: 22,
    marginTop: -15,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconHit: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  headerAvatar: {
    height: 36,
    width: 36,
  },
  headerDot: {
    backgroundColor: ink.yellow,
    borderColor: ink.background,
    borderRadius: radii.pill,
    borderWidth: 2,
    bottom: -1,
    height: 12,
    position: 'absolute',
    right: -1,
    width: 12,
  },
  storiesContent: {
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
  },
  story: {
    alignItems: 'center',
    width: 72,
  },
  storyRingWrap: {
    height: 64,
    width: 64,
  },
  storyRing: {
    alignItems: 'center',
    borderColor: ink.yellow,
    borderRadius: radii.pill,
    borderWidth: 2.5,
    height: 64,
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 2,
    width: 64,
  },
  storyLabel: {
    color: ink.muted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  storyDot: {
    backgroundColor: ink.yellow,
    borderColor: ink.background,
    borderRadius: radii.pill,
    borderWidth: 2,
    bottom: 0,
    height: 14,
    position: 'absolute',
    right: 0,
    width: 14,
  },
  storyBadge: {
    alignItems: 'center',
    backgroundColor: ink.yellow,
    borderColor: ink.background,
    borderRadius: radii.pill,
    borderWidth: 2,
    bottom: -2,
    height: 20,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    width: 20,
  },
  storyBadgeMark: {
    color: ink.onYellow,
    fontSize: 14,
    lineHeight: 16,
  },
  demandes: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  demandesLabel: {
    color: ink.text,
    flex: 1,
  },
  filters: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  pill: {
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillActive: {
    backgroundColor: ink.yellow,
  },
  pillIdle: {
    backgroundColor: ink.pill,
  },
  pillText: {
    color: ink.text,
    fontSize: 14,
    lineHeight: 18,
  },
  pillTextActive: {
    color: ink.onYellow,
    fontSize: 14,
    lineHeight: 18,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  rowAvatar: {
    height: 52,
    width: 52,
  },
  rowDot: {
    backgroundColor: ink.yellow,
    borderColor: ink.background,
    borderRadius: radii.pill,
    borderWidth: 2,
    bottom: 0,
    height: 12,
    position: 'absolute',
    right: 0,
    width: 12,
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  rowTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  rowName: {
    color: ink.text,
    flexShrink: 1,
  },
  chip: {
    backgroundColor: ink.yellow,
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipText: {
    color: ink.onYellow,
    fontSize: 11,
    lineHeight: 14,
  },
  flex: {
    flex: 1,
  },
  time: {
    color: ink.muted,
  },
  rowBottom: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  preview: {
    color: ink.muted,
    flex: 1,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: ink.yellow,
    borderRadius: radii.pill,
    height: 22,
    justifyContent: 'center',
    minWidth: 22,
    paddingHorizontal: 6,
  },
  badgeText: {
    color: ink.onYellow,
    fontSize: 12,
    lineHeight: 14,
  },
});
