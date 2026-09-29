import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { X } from "lucide-react-native";
import type { MediaItem } from "../lib/types";
import { Press } from "./ui";

function VideoClip({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });
  return <VideoView player={player} style={{ width: "100%", height: "100%" }} contentFit="contain" nativeControls />;
}

export function MediaViewer({
  items,
  start,
  onClose,
}: {
  items: MediaItem[];
  start: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(start);
  const item = items[i];
  if (!item) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <Press onPress={onClose} style={{ position: "absolute", top: 48, right: 16, zIndex: 2, width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
          <X size={22} color="#fff" />
        </Press>
        {item.type === "video" ? (
          <VideoClip uri={item.url} />
        ) : (
          <Image source={{ uri: item.url }} style={{ width: "100%", height: "100%" }} contentFit="contain" />
        )}
        {items.length > 1 ? (
          <View style={{ position: "absolute", bottom: 40, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 16 }}>
            <Pressable onPress={() => setI((n) => Math.max(0, n - 1))}>
              <Text style={{ color: "#fff" }}>‹</Text>
            </Pressable>
            <Text style={{ color: "#fff" }}>
              {i + 1}/{items.length}
            </Text>
            <Pressable onPress={() => setI((n) => Math.min(items.length - 1, n + 1))}>
              <Text style={{ color: "#fff" }}>›</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
