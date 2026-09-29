/**
 * Forward copies content into the target chat and re-encrypts media
 * with that conversation's peer key (never reuse the source file key).
 */
import { useWippStore } from "../store";
import type { MediaItem, Message } from "../types";
import { downloadCipherFile, readLocalBytes } from "./media-upload";
import { startAlbumUpload, startUpload, localBlobs } from "./send-media";

async function localOrDownload(opts: {
  url?: string;
  attachmentId?: string;
  mediaKey?: string;
  mediaChunks?: { i: number; iv: string; sha256: string }[];
  mime?: string;
}) {
  if (opts.url) return opts.url;
  if (opts.attachmentId && localBlobs.get(opts.attachmentId)) return localBlobs.get(opts.attachmentId)!;
  if (opts.attachmentId && opts.mediaKey && opts.mediaChunks?.length) {
    const uri = await downloadCipherFile({
      attachmentId: opts.attachmentId,
      fileKey: opts.mediaKey,
      chunks: opts.mediaChunks,
      mime: opts.mime,
    });
    localBlobs.set(opts.attachmentId, uri);
    return uri;
  }
  return null;
}

function albumParts(source: Message): MediaItem[] {
  if (source.album?.length) return source.album;
  if (source.type === "image" && (source.imageUrl || source.attachmentId)) {
    return [
      {
        type: "image",
        url: source.imageUrl ?? "",
        attachmentId: source.attachmentId,
        mediaKey: source.mediaKey,
        mediaChunks: source.mediaChunks,
        mime: source.mediaMime,
      },
    ];
  }
  if (source.type === "video" && (source.videoUrl || source.attachmentId)) {
    return [
      {
        type: "video",
        url: source.videoUrl ?? "",
        duration: source.duration,
        attachmentId: source.attachmentId,
        mediaKey: source.mediaKey,
        mediaChunks: source.mediaChunks,
        mime: source.mediaMime,
      },
    ];
  }
  return [];
}

export async function forwardMessageToChat(targetChatId: string, source: Message) {
  if (source.deletedForAll || source.viewOnce) return;
  const send = useWippStore.getState().sendMessage;
  const caption = source.text?.trim() || "";

  if (source.type === "sticker" && source.stickerId) {
    send(targetChatId, { type: "sticker", stickerId: source.stickerId, forwarded: true });
    return;
  }
  if (source.type === "scratch") {
    send(targetChatId, {
      type: "scratch",
      text: source.text,
      scratchDesign: source.scratchDesign,
      scratchCardId: source.scratchCardId,
      effectId: source.effectId,
      duration: source.duration,
      forwarded: true,
    });
    return;
  }
  if (source.type === "text" && source.text) {
    send(targetChatId, { type: "text", text: source.text, forwarded: true });
    return;
  }

  const parts = albumParts(source);
  if (parts.length > 1) {
    const resolved: MediaItem[] = [];
    for (const p of parts) {
      const url = await localOrDownload(p);
      if (!url) continue;
      resolved.push({ ...p, url });
    }
    if (!resolved.length) return;
    const first = resolved[0]!;
    const id = send(targetChatId, {
      type: first.type,
      imageUrl: first.type === "image" ? first.url : undefined,
      videoUrl: first.type === "video" ? first.url : undefined,
      album: resolved,
      text: caption,
      forwarded: true,
      mediaState: "preparing",
    });
    startAlbumUpload({
      chatId: targetChatId,
      messageId: id,
      items: resolved.map((p) => ({
        blobUrl: p.url,
        kind: p.type,
        mime: p.mime,
        durationMs: p.duration ? p.duration * 1000 : undefined,
      })),
      caption,
    });
    return;
  }

  if (source.type === "voice") {
    const uri = await localOrDownload({
      url: source.audioUrl,
      attachmentId: source.attachmentId,
      mediaKey: source.mediaKey,
      mediaChunks: source.mediaChunks,
      mime: source.mediaMime ?? "audio/m4a",
    });
    if (!uri) return;
    const bytes = await readLocalBytes(uri);
    void bytes;
    const id = send(targetChatId, {
      type: "voice",
      audioUrl: uri,
      duration: source.duration,
      forwarded: true,
      mediaState: "preparing",
    });
    startUpload({
      chatId: targetChatId,
      messageId: id,
      blobUrl: uri,
      kind: "voice",
      mime: source.mediaMime,
      durationMs: source.duration ? source.duration * 1000 : undefined,
    });
    return;
  }

  if (source.type === "file" && source.file) {
    const uri = await localOrDownload({
      url: source.file.url,
      attachmentId: source.attachmentId,
      mediaKey: source.mediaKey,
      mediaChunks: source.mediaChunks,
      mime: source.file.mime,
    });
    if (!uri) return;
    const id = send(targetChatId, {
      type: "file",
      file: { ...source.file, url: uri },
      forwarded: true,
      mediaState: "preparing",
    });
    startUpload({
      chatId: targetChatId,
      messageId: id,
      blobUrl: uri,
      kind: "file",
      name: source.file.name,
      mime: source.file.mime,
    });
    return;
  }

  if (source.type === "gif" && (source.gifUrl || source.imageUrl || source.attachmentId)) {
    const uri = await localOrDownload({
      url: source.gifUrl ?? source.imageUrl,
      attachmentId: source.attachmentId,
      mediaKey: source.mediaKey,
      mediaChunks: source.mediaChunks,
      mime: source.mediaMime ?? "image/gif",
    });
    if (!uri) return;
    const id = send(targetChatId, {
      type: "gif",
      gifUrl: uri,
      imageUrl: uri,
      forwarded: true,
      mediaState: "preparing",
    });
    startUpload({
      chatId: targetChatId,
      messageId: id,
      blobUrl: uri,
      kind: "gif",
      mime: source.mediaMime ?? "image/gif",
    });
    return;
  }

  if (parts.length === 1) {
    const p = parts[0]!;
    const uri = await localOrDownload(p);
    if (!uri) return;
    const id = send(targetChatId, {
      type: p.type,
      imageUrl: p.type === "image" ? uri : undefined,
      videoUrl: p.type === "video" ? uri : undefined,
      text: caption,
      forwarded: true,
      mediaState: "preparing",
      duration: p.duration,
    });
    startUpload({
      chatId: targetChatId,
      messageId: id,
      blobUrl: uri,
      kind: p.type,
      mime: p.mime,
      durationMs: p.duration ? p.duration * 1000 : undefined,
      caption,
    });
  }
}
