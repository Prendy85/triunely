// src/components/ScriptureReaderModal.js
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";

// WebView is optional; this will work if installed (expo install step)
let WebView = null;
try {
  WebView = require("react-native-webview").WebView;
} catch (e) {
  WebView = null;
}

export default function ScriptureReaderModal({ open, onClose, reference, translation = "WEB" }) {
  const url = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(
    reference
  )}&version=${encodeURIComponent(translation)}`;

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#0D1B2A" }}>
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: "#163154",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
              {reference}
            </Text>
            <Text style={{ color: "#9bb3c9", marginTop: 2 }}>{translation}</Text>
          </View>

          <Pressable onPress={onClose} style={{ padding: 10 }}>
            <Text style={{ color: "#9CD8C3", fontWeight: "800" }}>Close</Text>
          </Pressable>
        </View>

        {!WebView ? (
          <View style={{ padding: 16 }}>
            <Text style={{ color: "#fff", lineHeight: 22 }}>
              Scripture reader isn’t available because WebView isn’t installed.
            </Text>
            <Text style={{ color: "#9bb3c9", marginTop: 10, lineHeight: 22 }}>
              Install it with: npx expo install react-native-webview
            </Text>
            <Text style={{ color: "#9bb3c9", marginTop: 10, lineHeight: 22 }}>
              For now, open this passage in your browser:
            </Text>
            <Text style={{ color: "#9CD8C3", marginTop: 6 }}>{url}</Text>
          </View>
        ) : (
          <WebView
            source={{ uri: url }}
            startInLoadingState
            renderLoading={() => (
              <View style={{ padding: 16 }}>
                <ActivityIndicator />
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
}
