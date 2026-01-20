// src/screens/ChurchAdminThread.js
import { useRoute } from "@react-navigation/native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import Screen from "../components/Screen";
import {
  fetchAdminThreadMessages,
  sendChurchAdminReply,
} from "../lib/churchInbox";
import { theme } from "../theme/theme";

const INPUT_MIN_HEIGHT = 44;
const INPUT_MAX_HEIGHT = 140;

export default function ChurchAdminThread() {
  const route = useRoute();

  const churchId = route?.params?.churchId;
  const threadId = route?.params?.threadId;
  const directUserId = route?.params?.directUserId;
  const userDisplayName = route?.params?.userDisplayName || "User";

  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [errorText, setErrorText] = useState("");

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [inputHeight, setInputHeight] = useState(INPUT_MIN_HEIGHT);

  const listRef = useRef(null);

  const computedInputHeight = useMemo(
    () => Math.max(INPUT_MIN_HEIGHT, Math.min(INPUT_MAX_HEIGHT, inputHeight)),
    [inputHeight]
  );

  // Coach pattern: iOS uses padding offset, Android uses 0 with behavior="height"
  const keyboardVerticalOffset = Platform.OS === "ios" ? 90 : 0;

  const scrollToBottom = () => {
    setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 80);
  };

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  async function loadMessages() {
    if (!churchId || !threadId) {
      setErrorText("Missing churchId/threadId (navigation params).");
      return;
    }

    try {
      setErrorText("");
      setLoading(true);

      const data = await fetchAdminThreadMessages({ churchId, threadId });
      setMessages(data || []);

      scrollToBottom();
    } catch (e) {
      setErrorText(e.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [churchId, threadId]);

  async function onSend() {
    const body = draft.trim();
    if (!body || sending) return;

    try {
      setSending(true);
      setDraft("");
      setInputHeight(INPUT_MIN_HEIGHT);

      await sendChurchAdminReply({ churchId, threadId, body });
      await loadMessages();
    } catch (e) {
      setErrorText(e.message || "Failed to send reply");
    } finally {
      setSending(false);
    }
  }

  const renderItem = ({ item }) => {
    const isUser = item.sender_id === directUserId;

    // Faith Coach colour mapping:
    // - User messages: surfaceAlt + divider border
    // - Admin/church replies: blue bubble, no border
    const bubbleBg = isUser ? theme.colors.surfaceAlt : theme.colors.blue;
    const bubbleBorderWidth = isUser ? 1 : 0;
    const bubbleBorderColor = isUser ? theme.colors.divider : "transparent";

    // Keep text readable on both bubble types (theme uses dark text)
    const metaColor = isUser ? theme.colors.muted : theme.colors.text;

    return (
      <View
        style={{
          alignSelf: isUser ? "flex-start" : "flex-end",
          maxWidth: "88%",
          marginVertical: 6,
          padding: 12,
          borderRadius: 16,
          backgroundColor: bubbleBg,
          borderWidth: bubbleBorderWidth,
          borderColor: bubbleBorderColor,
        }}
      >
        <Text
          style={{
            color: metaColor,
            fontSize: 12,
            fontWeight: "800",
            opacity: isUser ? 1 : 0.9,
          }}
        >
          {isUser ? userDisplayName : "Church (Admin reply)"}
        </Text>

        <Text
          style={{
            color: theme.colors.text,
            marginTop: 6,
            lineHeight: 20,
            fontWeight: "600",
          }}
        >
          {item.body}
        </Text>

        <Text
          style={{
            color: metaColor,
            marginTop: 8,
            fontSize: 11,
            opacity: 0.7,
          }}
        >
          {new Date(item.created_at).toLocaleString()}
        </Text>
      </View>
    );
  };

  // Coach pattern: a small bottom pad tweak when keyboard is closed
  const inputBottomPad = keyboardOpen ? 10 : 6;

  return (
    <Screen backgroundColor={theme.colors.bg} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          <View style={{ flex: 1 }}>
            {/* Header */}
            <View
              style={{
                paddingHorizontal: 14,
                paddingTop: 14,
                paddingBottom: 10,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.divider,
                backgroundColor: theme.colors.bg,
              }}
            >
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
                {userDisplayName}
              </Text>

              <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
                Replies appear to the user as the church identity.
              </Text>

              {errorText ? (
                <Text style={{ color: "tomato", marginTop: 8, fontWeight: "800" }}>
                  {errorText}
                </Text>
              ) : null}
            </View>

            {/* Messages */}
            <View style={{ flex: 1 }}>
              {loading && messages.length === 0 ? (
                <View style={{ marginTop: 12, alignItems: "center" }}>
                  <ActivityIndicator color={theme.colors.gold} />
                  <Text style={{ color: theme.colors.muted, marginTop: 8 }}>
                    Loading thread…
                  </Text>
                </View>
              ) : (
                <FlatList
                  ref={listRef}
                  data={messages}
                  keyExtractor={(x) => x.id}
                  renderItem={renderItem}
                  contentContainerStyle={{
                    padding: 14,
                    paddingBottom:
                      (bottomPad || 0) + computedInputHeight + 24 + inputBottomPad,
                  }}
                  keyboardShouldPersistTaps="handled"
                  onContentSizeChange={scrollToBottom}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>

            {/* Composer */}
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: theme.colors.divider,
                backgroundColor: theme.colors.bg,
                paddingHorizontal: 12,
                paddingTop: 10,
                paddingBottom: (bottomPad || 0) + inputBottomPad,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Write a reply…"
                  placeholderTextColor={theme.input.placeholder}
                  style={[
                    theme.input.box,
                    {
                      flex: 1,
                      marginRight: 10,
                      minHeight: INPUT_MIN_HEIGHT,
                      height: computedInputHeight,
                      lineHeight: 20,
                      paddingTop: 12,
                      paddingBottom: 12,
                      opacity: sending ? 0.7 : 1,
                    },
                  ]}
                  multiline
                  textAlignVertical="top"
                  editable={!sending}
                  onContentSizeChange={(e) => {
                    const h = e?.nativeEvent?.contentSize?.height || INPUT_MIN_HEIGHT;
                    setInputHeight(h + 12);
                  }}
                  scrollEnabled={computedInputHeight >= INPUT_MAX_HEIGHT}
                />

                <Pressable
                  onPress={onSend}
                  disabled={sending || !draft.trim()}
                  style={[
                    theme.button.primary,
                    {
                      height: INPUT_MIN_HEIGHT,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      justifyContent: "center",
                      alignItems: "center",
                      opacity: sending || !draft.trim() ? 0.6 : 1,
                    },
                  ]}
                  hitSlop={10}
                >
                  <Text style={theme.button.primaryText}>Send</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}
