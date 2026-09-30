/**
 * Règle de confidentialité pour les notifications WIPP Privé.
 * Le serveur envoie déjà une copie générique (killed / background).
 * Cette couche recouvre le rendu client si un payload trop bavard arrivait.
 */
export type IncomingNotice = {
  title?: string;
  body?: string;
  avatar?: string;
  chatId?: string;
};

export const PRIVATE_NOTICE_TITLE = "WIPP";
export const PRIVATE_NOTICE_BODY = "Nouveau message";

export function redactNotification(notice: IncomingNotice, isPrivate: boolean): IncomingNotice {
  if (!isPrivate) return notice;
  return {
    title: PRIVATE_NOTICE_TITLE,
    body: PRIVATE_NOTICE_BODY,
    avatar: undefined,
    chatId: notice.chatId,
  };
}

export function noticeForChat(chatId: string, incoming: Omit<IncomingNotice, "chatId">, isPrivate: boolean) {
  return redactNotification({ ...incoming, chatId }, isPrivate);
}
