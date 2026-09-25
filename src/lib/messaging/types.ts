export type WippProfile = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string;
  createdAt?: string;
  /** ECDH P-256 public JWK for DM E2E (null until the client publishes it). */
  e2ePublicJwk?: JsonWebKey | null;
  /** user | admin */
  role?: "user" | "admin";
  phoneE164?: string | null;
  isAdmin?: boolean;
};

export type WippAdminStats = {
  users: number;
  chats: number;
  messages: number;
  blocks: number;
  openFlags: number;
  admins: number;
};

export type WippAdminUser = {
  id: string;
  username: string;
  displayName: string;
  phoneE164?: string | null;
  role: string;
  createdAt: string;
  blockedByAdmin: boolean;
};

export type WippChatSummary = {
  id: string;
  peer: WippProfile;
  preview: string;
  lastAt: number;
  unread: number;
  pinnedAt?: number | null;
  archivedAt?: number | null;
  /** number = expiry, "always" = muted forever, null = not muted */
  mutedUntil?: number | "always" | null;
  manuallyUnreadAt?: number | null;
};

export type WippReaction = {
  profileId: string;
  emoji: string;
  createdAt: number;
};

export type WippMessage = {
  id: string;
  chatId: string;
  senderId: string;
  body: string;
  clientId?: string | null;
  createdAt: number;
  replyTo?: string | null;
  editedAt?: number | null;
  deletedAt?: number | null;
  pinnedAt?: number | null;
  pinnedBy?: string | null;
  deliveredAt?: number | null;
  readAt?: number | null;
  reactions?: WippReaction[];
};

export type WippSessionPayload = {
  token: string;
  profile: WippProfile;
};
