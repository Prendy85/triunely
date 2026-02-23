// src/screens/Chat.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchMessages, markConversationRead, sendMessage } from "../lib/messages";
import { supabase } from "../lib/supabase";
import { theme } from "../theme/theme";

function safeInitials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name).trim()[0]?.toUpperCase() || "?";
}

export default function Chat({ route, navigation }) {
  const insets = useSafeAreaInsets();

  const conversationId = route?.params?.conversationId;
  const title = route?.params?.title || "Chat";
  const avatarUrl = route?.params?.avatarUrl || null;
  const otherUserId = route?.params?.otherUserId || null;
  const type = route?.params?.type || null;

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [me, setMe] = useState(null);

  const listRef = useRef(null);

  const initials = useMemo(() => safeInitials(title), [title]);

  const ordered = useMemo(() => {
    const arr = Array.isArray(messages) ? [...messages] : [];
    arr.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    return arr;
  }, [messages]);

  const shouldAutoScrollToBottom = ordered.length >= 3;

  const scrollToBottom = useCallback((animated = false) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd?.({ animated });
    });
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const { data: sess } = await supabase.auth.getSession();
      setMe(sess?.session?.user?.id || null);

      const rows = await fetchMessages(conversationId, 80);
      setMessages(rows);

      await markConversationRead(conversationId);
    } catch (e) {
      console.log("Chat load error", e);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    load();
  }, [conversationId, load]);

  useEffect(() => {
    if (!shouldAutoScrollToBottom) return;
    scrollToBottom(false);
  }, [shouldAutoScrollToBottom, ordered.length, scrollToBottom]);

  async function handleSend() {
    try {
      const text = draft.trim();
      if (!text) return;

      setDraft("");

      await sendMessage(conversationId, text);

      const rows = await fetchMessages(conversationId, 80);
      setMessages(rows);
      await markConversationRead(conversationId);

      scrollToBottom(true);
    } catch (e) {
      console.log("sendMessage error", e);
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      edges={["top", "left", "right", "bottom"]}
    >
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.divider,
            backgroundColor: theme.colors.bg,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={10}
              style={{ paddingRight: 12, paddingVertical: 6 }}
            >
              <Text style={{ color: theme.colors.text2, fontWeight: "900" }}>Back</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (otherUserId) navigation.navigate("UserProfile", { userId: otherUserId });
              }}
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: theme.colors.divider,
                  overflow: "hidden",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={{ width: "100%", height: "100%" }} />
                ) : (
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }}>{initials}</Text>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}
                  numberOfLines={1}
                >
                  {title}
                </Text>
                {type ? (
                  <Text style={{ color: theme.colors.muted, fontWeight: "700", fontSize: 12 }}>
                    {type === "dm"
                      ? "Direct message"
                      : type === "church"
                      ? "Church messages"
                      : "Conversation"}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          </View>
        </View>

        {/* Main body */}
        <View style={{ flex: 1, minHeight: 0 }}>
          {/* Messages area */}
          <View style={{ flex: 1, minHeight: 0 }}>
            {loading ? (
              <View style={{ paddingTop: 20, alignItems: "center" }}>
                <ActivityIndicator size="large" color={theme.colors.gold} />
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={ordered}
                keyExtractor={(m) => String(m.id)}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                style={{ flex: 1 }}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  paddingTop: 12,
                  // reserve space for composer in normal flow so last message isn't hidden
                  paddingBottom: 12,
                }}
                onContentSizeChange={() => {
                  if (shouldAutoScrollToBottom) scrollToBottom(false);
                }}
                renderItem={({ item }) => {
                  const mine = me && item.sender_id === me;
                  return (
                    <View
                      style={{
                        alignSelf: mine ? "flex-end" : "flex-start",
                        maxWidth: "82%",
                        marginBottom: 10,
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 14,
                        backgroundColor: mine ? theme.colors.goldHalo : theme.colors.surface,
                        borderWidth: 1,
                        borderColor: theme.colors.divider,
                      }}
                    >
                      <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                        {item.body}
                      </Text>
                      <Text style={{ color: theme.colors.muted, fontSize: 11, marginTop: 6 }}>
                        {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
                      </Text>
                    </View>
                  );
                }}
              />
            )}
          </View>

          {/* ✅ Composer stays in normal flow */}
          {/* ✅ KAV wraps ONLY composer (not the whole screen) */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: theme.colors.divider,
                backgroundColor: theme.colors.surface,
                paddingHorizontal: 12,
                paddingTop: 12,
                paddingBottom: Platform.OS === "ios" ? Math.max(insets.bottom, 8) : 8,
              }}
            >
              <View style={{ flexDirection: "row", columnGap: 10, alignItems: "center" }}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Message..."
                  placeholderTextColor={theme.colors.muted}
                  multiline={false}
                  returnKeyType="send"
                  returnKeyLabel="Send"
                  enterKeyHint="send"
                  onSubmitEditing={handleSend}
                  blurOnSubmit={false}
                  enablesReturnKeyAutomatically
                  style={{
                    flex: 1,
                    backgroundColor: theme.colors.surfaceAlt,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: theme.colors.divider,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    color: theme.colors.text,
                    fontWeight: "700",
                  }}
                />
                <Pressable
                  onPress={handleSend}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 999,
                    backgroundColor: theme.colors.gold,
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Send</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </SafeAreaView>
  );
}