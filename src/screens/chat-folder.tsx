import { Header, StatusBar } from "@/components/ui";
import { useWgoStore } from "@/lib/store";
import type { Message } from "@/lib/types";

export function ArchivesScreen() {
  const pop = useWgoStore((s) => s.pop);
  const push = useWgoStore((s) => s.push);
  const chats = useWgoStore((s) => s.chats.filter((c) => c.archived));
  const users = useWgoStore((s) => s.users);
  const archiveChat = useWgoStore((s) => s.archiveChat);

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header title="Archives" onBack={pop} />
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <p className="px-4 py-8 text-center text-[14px] text-muted">Aucune conversation archivée.</p>
        ) : (
          chats.map((chat) => {
            const peerId = chat.participantIds.find((id) => id !== "me");
            const name = chat.name || (peerId ? users[peerId]?.displayName : "") || "Conversation";
            return (
              <div key={chat.id} className="flex items-center gap-2 border-b border-hair px-4 py-3">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => push({ name: "conversation", chatId: chat.id })}>
                  <span className="block truncate text-[16px]">{name}</span>
                  <span className="block truncate text-[13px] text-muted">{chat.preview}</span>
                </button>
                <button type="button" className="text-[13px] text-accent" onClick={() => archiveChat(chat.id, false)}>
                  Désarchiver
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function linksIn(text: string) {
  return text.match(/https?:\/\/\S+/g) ?? [];
}

export function ChatInfoScreen({ chatId }: { chatId: string }) {
  const pop = useWgoStore((s) => s.pop);
  const chat = useWgoStore((s) => s.chats.find((c) => c.id === chatId));
  const users = useWgoStore((s) => s.users);
  const messages = useWgoStore((s) => s.messages[chatId] ?? []);
  const setMute = useWgoStore((s) => s.setMute);
  const pinChat = useWgoStore((s) => s.pinChat);
  const archiveChat = useWgoStore((s) => s.archiveChat);
  if (!chat) return null;
  const peerId = chat.participantIds.find((id) => id !== "me");
  const peer = peerId ? users[peerId] : undefined;
  const media = messages.filter((m) => m.type === "image" || m.type === "video" || m.type === "voice");
  const docs = messages.filter((m) => m.type === "listing");
  const links = messages.flatMap((m) => (m.text ? linksIn(m.text).map((url) => ({ id: m.id, url })) : []));

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <Header title="Infos" onBack={pop} />
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="text-[20px] font-semibold">{peer?.displayName || chat.name || "Conversation"}</p>
        {peer ? <p className="text-[14px] text-muted">@{peer.username}</p> : null}
        <p className="mt-2 text-[13px] text-muted">Chiffré de bout en bout</p>
        <div className="mt-4 grid gap-2">
          <button type="button" className="h-11 rounded-xl bg-surface-2 text-left px-3" onClick={() => pinChat(chatId, !chat.pinned)}>
            {chat.pinned ? "Désépingler" : "Épingler"}
          </button>
          <button type="button" className="h-11 rounded-xl bg-surface-2 text-left px-3" onClick={() => archiveChat(chatId, !chat.archived)}>
            {chat.archived ? "Désarchiver" : "Archiver"}
          </button>
          {(["off", "1h", "8h", "1w", "always"] as const).map((choice) => (
            <button key={choice} type="button" className="h-11 rounded-xl bg-surface-2 text-left px-3" onClick={() => setMute(chatId, choice)}>
              Sourdine {choice === "off" ? "désactivée" : choice === "always" ? "toujours" : choice}
            </button>
          ))}
        </div>
        <Section title="Médias" empty="Aucun média dans ce fil." items={media.map((m) => labelOf(m))} />
        <Section title="Liens" empty="Aucun lien dans ce fil." items={links.map((l) => l.url)} />
        <Section title="Documents" empty="Aucun document dans ce fil." items={docs.map((m) => m.text || "Document")} />
      </div>
    </div>
  );
}

function labelOf(m: Message) {
  if (m.type === "image") return "Image";
  if (m.type === "video") return "Vidéo";
  if (m.type === "voice") return "Message vocal";
  return m.text || m.type;
}

function Section({ title, empty, items }: { title: string; empty: string; items: string[] }) {
  return (
    <section className="mt-6">
      <h2 className="text-[13px] font-semibold uppercase text-muted">{title}</h2>
      {items.length === 0 ? <p className="mt-2 text-[14px] text-muted">{empty}</p> : (
        <ul className="mt-2 grid gap-1">
          {items.map((item, i) => (
            <li key={`${item}-${i}`} className="truncate text-[14px]">{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
