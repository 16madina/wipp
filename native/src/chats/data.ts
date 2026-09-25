export type FaceKind =
  | 'vous'
  | 'samira'
  | 'julien'
  | 'maya'
  | 'alex'
  | 'six'
  | 'famille'
  | 'ines'
  | 'lea';

export type StoryBadge = 'plus' | 'dot' | 'play' | 'music' | 'none';

export type Story = {
  id: string;
  label: string;
  face: FaceKind;
  badge: StoryBadge;
};

export type ChatTag = 'personnel' | 'boutique' | 'groupe';

export type ChatFilter = 'tous' | 'personnel' | 'boutiques' | 'groupes';

export type ChatRow = {
  id: string;
  name: string;
  face: FaceKind;
  tag: ChatTag;
  time: string;
  preview: string;
  unread: string | null;
  clock: boolean;
  chip: string | null;
  dot: boolean;
};

export const stories: Story[] = [
  { id: 'vous', label: 'Votre story', face: 'vous', badge: 'plus' },
  { id: 'samira', label: 'Samira', face: 'samira', badge: 'dot' },
  { id: 'julien', label: 'Julien', face: 'julien', badge: 'play' },
  { id: 'maya', label: 'Maya', face: 'maya', badge: 'music' },
  { id: 'alex', label: 'Alex', face: 'alex', badge: 'dot' },
  { id: 'six', label: '', face: 'six', badge: 'none' },
];

export const chats: ChatRow[] = [
  {
    id: 'alex',
    name: 'Alex',
    face: 'alex',
    tag: 'personnel',
    time: '13:42',
    preview: 'Ça WIPP !',
    unread: '2',
    clock: false,
    chip: null,
    dot: false,
  },
  {
    id: 'famille',
    name: 'Famille Diallo',
    face: 'famille',
    tag: 'groupe',
    time: '13:26',
    preview: 'Dimanche on mange ensemble.',
    unread: '3',
    clock: false,
    chip: null,
    dot: false,
  },
  {
    id: 'ines',
    name: 'Inès',
    face: 'ines',
    tag: 'personnel',
    time: '12 min',
    preview: 'Je suis juste à côté.',
    unread: '1',
    clock: true,
    chip: null,
    dot: true,
  },
  {
    id: 'lea',
    name: 'Léa',
    face: 'lea',
    tag: 'boutique',
    time: '13:35',
    preview: 'Beauté · Bonjour, un rendez-vous samedi ?',
    unread: '1',
    clock: false,
    chip: 'Boutique',
    dot: false,
  },
  {
    id: 'maya',
    name: 'Maya',
    face: 'maya',
    tag: 'personnel',
    time: '13:02',
    preview: 'How are you?',
    unread: null,
    clock: false,
    chip: null,
    dot: false,
  },
];

export const filters: { id: ChatFilter; label: string }[] = [
  { id: 'tous', label: 'Tous' },
  { id: 'personnel', label: 'Personnel' },
  { id: 'boutiques', label: 'Boutiques' },
  { id: 'groupes', label: 'Groupes' },
];

export function chatsForFilter(filter: ChatFilter): ChatRow[] {
  if (filter === 'tous') return chats;
  if (filter === 'boutiques') return chats.filter((chat) => chat.tag === 'boutique');
  if (filter === 'groupes') return chats.filter((chat) => chat.tag === 'groupe');
  return chats.filter((chat) => chat.tag === 'personnel');
}
