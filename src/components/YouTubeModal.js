// src/components/YouTubeModal.js
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useMemo } from "react";
import { Alert, Modal, Pressable, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { getYouTubeEmbedUrl, openExternalUrl } from "../lib/youtube";
import { theme } from "../theme/theme";

export default function YouTubeModal({ visible, url, onClose }) {
  const embedUrl = useMemo(() => getYouTubeEmbedUrl(url), [url]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        {/* Header */}
        <View
          style={{
            paddingTop: 12,
            paddingHorizontal: 12,
            paddingBottom: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255,255,255,0.10)",
          }}
        >
          <Pressable onPress={onClose} hitSlop={10} style={{ padding: 8 }}>
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>

          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }} numberOfLines={1}>
            YouTube
          </Text>

          <Pressable
            onPress={() => openExternalUrl(url, Linking, Alert)}
            hitSlop={10}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: theme.colors.goldHalo,
              borderWidth: 1,
              borderColor: theme.colors.goldOutline,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}>Open in YouTube</Text>
          </Pressable>
        </View>

        {/* Player */}
        {embedUrl ? (
          <WebView
            source={{ uri: embedUrl }}
            style={{ flex: 1, backgroundColor: "#000" }}
            allowsFullscreenVideo
            javaScriptEnabled
            domStorageEnabled
            mediaPlaybackRequiresUserAction={false}
          />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
            <Text style={{ color: "rgba(255,255,255,0.75)", textAlign: "center" }}>
              This link does not look like a YouTube video.
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
