import { useEffect, useState } from "react";
import { Header, StatusBar } from "@/components/ui";
import { Avatar, GroupAvatar } from "@/components/avatar";
import { useT, useWgoStore } from "@/lib/store";
import {
  isPrivateChat,
  lastPinWaitMs,
  subscribePrivateVault,
  unlockChatFromPrivate,
  unlockPrivateVault,
} from "@/lib/private-vault";
import type { Chat, User } from "@/lib/types";

function askPin() {
  return Promise.resolve(window.prompt("Code WIPP Privé"));
}

export function PrivateChatsScreen() {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const push = useWgoStore((s) => s.push);
  const chats = useWgoStore((s) => s.chats);
  const users = useWgoStore((s) => s.users);
  const markRead = useWgoStore((s) => s.markRead);
  const [, setTick] = useState(0);

  useEffect(() => subscribePrivateVault(() => setTick((n) => n + 1)), []);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        document.documentElement.style.filter = "blur(28px)";
        return;
      }
      document.documentElement.style.filter = "";
      pop();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.documentElement.style.filter = "";
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pop]);

  const hidden = chats.filter((c) => isPrivateChat(c.id));

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header title="WIPP Privé 🔒" onBack={pop} />
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {hidden.length === 0 ? (
          <p className="px-6 pt-10 text-center text-[14px] text-muted">Aucune conversation privée.</p>
        ) : (
          hidden.map((chat) => (
            <PrivateRow
              key={chat.id}
              chat={chat}
              users={users}
              onOpen={() => {
                markRead(chat.id);
                push({ name: "conversation", chatId: chat.id });
              }}
              onRemove={async () => {
                const ok = await unlockChatFromPrivate(chat.id, askPin);
                if (!ok) return;
              }}
            />
          ))
        )}
      </div>
      <p className="sr-only">{t("chats")}</p>
    </div>
  );
}

function PrivateRow({
  chat,
  users,
  onOpen,
  onRemove,
}: {
  chat: Chat;
  users: Record<string, User>;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const peerId = chat.participantIds.find((id) => id !== "me");
  const peer = peerId ? users[peerId] : undefined;
  const title = chat.type === "group" ? chat.name : peer?.displayName;
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
      onClick={onOpen}
      onContextMenu={(e) => {
        e.preventDefault();
        if (window.confirm("Retirer de WIPP Privé ?")) onRemove();
      }}
    >
      {chat.type === "group" ? (
        <GroupAvatar users={[]} size={52} photo={chat.avatar} />
      ) : (
        <Avatar user={peer} size={52} />
      )}
      <span className="min-w-0 flex-1 border-b border-hair pb-2.5">
        <span className="block truncate text-[16px] font-medium">{title}</span>
        <span className="block truncate text-[14px] text-muted">{chat.preview}</span>
      </span>
    </button>
  );
}

export async function openPrivateIfUnlocked(push: (s: { name: "wipp-private" }) => void) {
  const ok = await unlockPrivateVault(askPin);
  if (ok) push({ name: "wipp-private" });
  else if (lastPinWaitMs() > 0) {
    const secs = Math.max(1, Math.ceil(lastPinWaitMs() / 1000));
    window.alert(`Code incorrect. Réessaie dans ${secs} s.`);
  }
}
