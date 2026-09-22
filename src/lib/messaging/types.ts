export type WippProfile = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string;
  createdAt?: string;
};

export type WippChatSummary = {
  id: string;
  peer: WippProfile;
  preview: string;
  lastAt: number;
  unread: number;
};

export type WippMessage = {
  id: string;
  chatId: string;
  senderId: string;
  body: string;
  clientId?: string | null;
  createdAt: number;
};

export type WippSessionPayload = {
  token: string;
  profile: WippProfile;
};
