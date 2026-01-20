// src/screens/ChurchInbox.js
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";
import { fetchThreadMessages, sendChurchInboxMessage } from "../lib/churchInbox";
import { supabase } from "../lib/supabase";

export default function ChurchInbox({ route }) {
  // IMPORTANT: pass churchId into this screen via navigation params
  // e.g. navigation.navigate("ChurchInbox", { churchId: church.id })
  const churchId = route?.params?.churchId;

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [userId, setUserId] = useState(null);
  const [threadId, setThreadId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const canSend = useMemo(() => !!text.trim() && !!churchId && !!userId, [text, churchId, userId]);

  useEffect(() => {
    let alive = true;

    async function init() {
      try {
        if (!churchId) {
          throw new Error("Missing churchId. You must navigate here with { churchId }.");
        }

        setLoading(true);

        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;

        const uid = authData?.user?.id;
        if (!uid) throw new Error("Not logged in (no user id).");

        if (!alive) return;
        setUserId(uid);

        // We don't know the threadId yet until first send (or you can add a “get existing thread” query later).
        // For now, the first message will create/reuse and return out_thread_id.

        setLoading(false);
      } catch (e) {
        console.error(e);
        Alert.alert("Church Inbox", e.message || "Failed to load");
        setLoading(false);
      }
    }

    init();
    return () => {
      alive = false;
    };
  }, [churchId]);

  async function refreshMessages(tid) {
    try {
      const rows = await fetchThreadMessages(tid);
      setMessages(rows);
    } catch (e) {
      console.error(e);
      Alert.alert("Church Inbox", e.message || "Failed to fetch messages");
    }
  }

  async function onSend() {
    if (!canSend) return;

    try {
      setSending(true);

      const result = await sendChurchInboxMessage({
        churchId,
        senderId: userId,
        body: text,
      });

      const newThreadId = result.out_thread_id;
      setThreadId(newThreadId);
      setText("");

      // Pull messages from DB (includes your inserted message, plus any auto message if you add one later)
      await refreshMessages(newThreadId);
    } catch (e) {
      console.error(e);
      Alert.alert("Send failed", e.message || "Unknown error");
    } finally {
      setSending(false);
    }
  }

  // Optional: manual refresh button once you have a thread
  async function onRefresh() {
    if (!threadId) return;
    await refreshMessages(threadId);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 10 }}>Loading inbox…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "white" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <View style={{ flex: 1, padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 18, fontWeight: "700" }}>Church Inbox</Text>

          <Pressable
            onPress={onRefresh}
            disabled={!threadId}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 10,
              opacity: threadId ? 1 : 0.4,
              borderWidth: 1,
              borderColor: "#ddd",
            }}
          >
            <Text>Refresh</Text>
          </Pressable>
        </View>

        {!threadId ? (
          <Text style={{ marginTop: 10, color: "#666" }}>
            Send your first message to start the conversation.
          </Text>
        ) : null}

        <View style={{ flex: 1, marginTop: 12 }}>
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 12 }}
            renderItem={({ item }) => {
              const mine = item.sender_id === userId;
              return (
                <View
                  style={{
                    alignSelf: mine ? "flex-end" : "flex-start",
                    maxWidth: "85%",
                    padding: 12,
                    borderRadius: 14,
                    marginBottom: 8,
                    backgroundColor: mine ? "#E8F0FF" : "#F2F2F2",
                  }}
                >
                  <Text style={{ fontSize: 15 }}>{item.body}</Text>
                  <Text style={{ marginTop: 6, fontSize: 11, color: "#666" }}>
                    {new Date(item.created_at).toLocaleString()}
                  </Text>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={{ paddingTop: 24 }}>
                <Text style={{ color: "#666" }}>No messages yet.</Text>
              </View>
            }
          />
        </View>

        <View style={{ borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 12 }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type your message…"
            multiline
            style={{
              minHeight: 46,
              maxHeight: 120,
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 15,
              backgroundColor: "white",
            }}
          />

          <Pressable
            onPress={onSend}
            disabled={!canSend || sending}
            style={{
              marginTop: 10,
              height: 46,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              opacity: canSend && !sending ? 1 : 0.5,
              backgroundColor: "#111",
            }}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>
              {sending ? "Sending…" : "Send"}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
