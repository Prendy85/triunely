// src/screens/Coach.js
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Screen from "../components/Screen";
import { usePoints } from "../context/PointsContext";
import { supabase } from "../lib/supabase";
import { theme } from "../theme/theme";

const FAITH_COACH_URL =
  "https://eadxngfhthbrwrkgpdsw.supabase.co/functions/v1/faith-coach";

const MAX_HISTORY = 20;
const PAGE_SIZE = 80;

const INPUT_MIN_HEIGHT = 44;
const INPUT_MAX_HEIGHT = 140;

const firstNameOnly = (s) => (s || "").trim().split(/\s+/)[0] || "";

export default function Coach({ navigation, route }) {
  const { awardCoachPointOnce } = usePoints();
  const listRef = useRef(null);

  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets(); // kept, but NOT used for bottom spacing (see below)

  const routeChatId = route?.params?.chatId || null;

  const [chatId, setChatId] = useState(null);
  const [chatEnded, setChatEnded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [booting, setBooting] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const [inputHeight, setInputHeight] = useState(INPUT_MIN_HEIGHT);

  // iOS: offset by tab bar so the input clears it when keyboard shows.
  // Android: 0 (tab bar + insets can over-lift; "height" behavior handles most cases).
  const keyboardVerticalOffset = Platform.OS === "ios" ? tabBarHeight : 0;

  const canSend = useMemo(
    () => !!input.trim() && !sending && !!chatId && !chatEnded,
    [input, sending, chatId, chatEnded]
  );

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

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, sending]);

  const getSessionOrThrow = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const session = data?.session;
    if (!session?.access_token || !session?.user?.id) throw new Error("No session");
    return session;
  };

  const loadProfileFirstName = async (userId) => {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();

    if (!error) {
      const fn = firstNameOnly(profile?.display_name);
      if (fn) return fn;
    }
    return "";
  };

  const getOrCreateActiveChat = async (userId) => {
    const { data: existing, error: selErr } = await supabase
      .from("faith_coach_chats")
      .select("id")
      .eq("user_id", userId)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1);

    if (selErr) throw selErr;
    if (existing && existing.length > 0) return existing[0].id;

    const { data: created, error: insErr } = await supabase
      .from("faith_coach_chats")
      .insert({ user_id: userId })
      .select("id")
      .single();

    if (insErr) throw insErr;
    return created.id;
  };

  const getChatEndedState = async (cid) => {
    const { data, error } = await supabase
      .from("faith_coach_chats")
      .select("ended_at")
      .eq("id", cid)
      .maybeSingle();

    if (error) throw error;
    return data?.ended_at ? true : false;
  };

  const loadMessagesForChat = async (cid) => {
    const { data, error } = await supabase
      .from("faith_coach_messages")
      .select("id, role, content, created_at")
      .eq("chat_id", cid)
      .order("created_at", { ascending: true })
      .limit(PAGE_SIZE);

    if (error) throw error;
    return data || [];
  };

  const insertMessage = async (cid, userId, role, content) => {
    const { data, error } = await supabase
      .from("faith_coach_messages")
      .insert({ chat_id: cid, user_id: userId, role, content })
      .select("id, role, content, created_at")
      .single();

    if (error) throw error;
    return data;
  };

  const fetchGreetingIfEmpty = async (session, cid, fn) => {
    const existing = await loadMessagesForChat(cid);
    if (existing.length > 0) {
      setMessages(existing);
      return;
    }

    const res = await fetch(FAITH_COACH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ messages: [], user_first_name: fn }),
    });

    let greetText = fn
      ? `Hello ${fn}, how can I help you today?`
      : "Hello, how can I help you today?";

    if (res.ok) {
      const json = await res.json();
      if (json?.text?.trim()) greetText = json.text.trim();
    }

    const saved = await insertMessage(cid, session.user.id, "assistant", greetText);
    setMessages([saved]);
  };

  const summarizeChat = async (session, cid, localMsgs) => {
    const tail = (localMsgs || []).slice(-MAX_HISTORY).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    if (tail.length === 0) return null;

    const res = await fetch(FAITH_COACH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: "summarize",
        messages: tail,
      }),
    });

    if (!res.ok) return null;
    const json = await res.json();
    return {
      title: (json?.title || "").trim(),
      summary: (json?.summary || "").trim(),
    };
  };

  const boot = async () => {
    setBooting(true);
    try {
      const session = await getSessionOrThrow();
      const fn = await loadProfileFirstName(session.user.id);
      setFirstName(fn);

      const cid = routeChatId || (await getOrCreateActiveChat(session.user.id));
      setChatId(cid);

      const ended = await getChatEndedState(cid);
      setChatEnded(ended);

      if (!routeChatId) {
        await fetchGreetingIfEmpty(session, cid, fn);
      } else {
        const existing = await loadMessagesForChat(cid);
        setMessages(existing);
      }
    } catch (e) {
      console.log("Coach boot error", e);
      setMessages([
        {
          id: "local-boot",
          role: "assistant",
          content: "Please sign in again to use Faith Coach.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setBooting(false);
    }
  };

  useEffect(() => {
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeChatId]);

  const endChat = async () => {
    try {
      const session = await getSessionOrThrow();
      if (!chatId) return;

      const endingChatId = chatId;
      const endingMessages = messages;

      const { error } = await supabase
        .from("faith_coach_chats")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", endingChatId)
        .eq("user_id", session.user.id);

      if (error) throw error;

      try {
        const meta = await summarizeChat(session, endingChatId, endingMessages);
        if (meta?.title || meta?.summary) {
          await supabase
            .from("faith_coach_chats")
            .update({
              title: meta.title || null,
              summary: meta.summary || null,
            })
            .eq("id", endingChatId)
            .eq("user_id", session.user.id);
        }
      } catch (e) {
        console.log("Summarize failed (non-blocking)", e);
      }

      const newChatId = await getOrCreateActiveChat(session.user.id);
      setChatId(newChatId);
      setChatEnded(false);
      setMessages([]);

      await fetchGreetingIfEmpty(session, newChatId, firstName);

      navigation.setParams?.({ chatId: null });
    } catch (e) {
      console.log("End chat error", e);
      Alert.alert("Couldn’t end chat", "Please try again.");
    }
  };

  const resumeChat = async () => {
    try {
      const session = await getSessionOrThrow();
      if (!chatId) return;

      await supabase
        .from("faith_coach_chats")
        .update({ ended_at: new Date().toISOString() })
        .eq("user_id", session.user.id)
        .is("ended_at", null)
        .neq("id", chatId);

      const { error } = await supabase
        .from("faith_coach_chats")
        .update({ ended_at: null })
        .eq("id", chatId)
        .eq("user_id", session.user.id);

      if (error) throw error;
      setChatEnded(false);
    } catch (e) {
      console.log("Resume chat error", e);
      Alert.alert("Couldn’t resume chat", "Please try again.");
    }
  };

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending || !chatId || chatEnded) return;

    setSending(true);
    setInput("");
    setInputHeight(INPUT_MIN_HEIGHT);

    try {
      const session = await getSessionOrThrow();

      const savedUserMsg = await insertMessage(chatId, session.user.id, "user", trimmed);
      const nextMessages = [...messages, savedUserMsg];
      setMessages(nextMessages);

      const historyForAI = nextMessages
        .slice(-MAX_HISTORY)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(FAITH_COACH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: historyForAI, user_first_name: firstName }),
      });

      if (!res.ok) {
        const t = await res.text();
        console.log("Faith Coach HTTP error:", res.status, t);

        const fallback = await insertMessage(
          chatId,
          session.user.id,
          "assistant",
          "I’m not able to respond right now. Please try again in a moment."
        );
        setMessages((prev) => [...prev, fallback]);
        return;
      }

      const data = await res.json();
      const replyText = data?.text?.trim() || "I didn’t receive a response. Please try again.";

      const savedAssistantMsg = await insertMessage(chatId, session.user.id, "assistant", replyText);
      setMessages((prev) => [...prev, savedAssistantMsg]);

      const award = awardCoachPointOnce();
      if (award?.granted) {
        Alert.alert("+1 Light Point", "Daily Faith Coach bonus awarded.");
      }
    } catch (e) {
      console.log("Faith Coach send error", e);
      Alert.alert("Faith Coach error", "Please try again.");
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }) => {
    const isUser = item.role === "user";
    return (
      <View
        style={{
          alignSelf: isUser ? "flex-end" : "flex-start",
          backgroundColor: isUser ? theme.colors.blue : theme.colors.surfaceAlt,
          borderWidth: 1,
          borderColor: isUser ? "transparent" : theme.colors.divider,
          padding: 12,
          borderRadius: 16,
          marginVertical: 6,
          maxWidth: "88%",
        }}
      >
        <Text style={{ color: theme.colors.text, lineHeight: 20, fontWeight: "600" }}>
          {item.content}
        </Text>
      </View>
    );
  };

  const computedInputHeight = Math.max(
    INPUT_MIN_HEIGHT,
    Math.min(INPUT_MAX_HEIGHT, inputHeight)
  );

  /**
   * KEY FIX:
   * Do NOT use insets.bottom here (it’s ~48px on your device and creates the “inch gap”).
   * Your bottom tab bar already occupies the bottom area visually.
   */
  const inputBottomPad = keyboardOpen ? 10 : 4;

  return (
    <Screen backgroundColor={theme.colors.bg} padded={false} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <View style={{ flex: 1, padding: 16 }}>
          {/* Header row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <View>
              <Text style={theme.text.h1}>Faith Coach</Text>
              <Text style={[theme.text.muted, { marginTop: 2 }]}>Saved automatically</Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Pressable
                onPress={() => navigation.navigate("CoachChats")}
                disabled={booting || sending}
                hitSlop={8}
                style={[
                  theme.button.outline,
                  {
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    opacity: booting || sending ? 0.6 : 1,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  },
                ]}
              >
                <Ionicons name="chatbubbles-outline" size={16} color={theme.colors.text2} />
                <Text style={theme.button.outlineText}>Chats</Text>
              </Pressable>

              <Pressable
                onPress={endChat}
                disabled={booting || !chatId || sending}
                hitSlop={8}
                style={[
                  theme.button.primary,
                  {
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    opacity: booting || !chatId || sending ? 0.6 : 1,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  },
                ]}
              >
                <Ionicons name="stop-circle-outline" size={16} color={theme.colors.text} />
                <Text style={theme.button.primaryText}>End</Text>
              </Pressable>
            </View>
          </View>

          {/* Ended banner */}
          {chatEnded ? (
            <View style={[theme.glow.outer, { padding: 1, borderRadius: 18, marginBottom: 12 }]}>
              <View style={[theme.glow.inner, { padding: 12, borderRadius: 16 }]}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color={theme.colors.muted}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={{ color: theme.colors.text2, flex: 1, fontWeight: "600" }}>
                    This chat is ended. Resume it to continue.
                  </Text>

                  <Pressable
                    onPress={resumeChat}
                    style={[
                      theme.button.primary,
                      {
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 999,
                        marginLeft: 10,
                      },
                    ]}
                  >
                    <Text style={theme.button.primaryText}>Resume</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}

          {/* Messages */}
          <View style={{ flex: 1 }}>
            {booting ? (
              <View style={{ marginTop: 12, alignItems: "center" }}>
                <ActivityIndicator color={theme.colors.gold} />
                <Text style={[theme.text.muted, { marginTop: 8 }]}>Loading…</Text>
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{
                  paddingBottom: computedInputHeight + 24 + inputBottomPad,
                }}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={scrollToBottom}
                showsVerticalScrollIndicator={false}
              />
            )}

            {sending ? (
              <View
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: theme.colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: theme.colors.divider,
                  padding: 12,
                  borderRadius: 16,
                  marginVertical: 6,
                  maxWidth: "88%",
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <ActivityIndicator size="small" color={theme.colors.gold} />
                <Text style={{ color: theme.colors.muted, marginLeft: 8, fontWeight: "600" }}>
                  Faith Coach is thinking…
                </Text>
              </View>
            ) : null}
          </View>

          {/* Input row */}
          <View style={{ paddingBottom: inputBottomPad }}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 10 }}>
              <TextInput
                placeholder={chatEnded ? "Resume chat to reply…" : "Ask Faith Coach…"}
                placeholderTextColor={theme.input.placeholder}
                value={input}
                onChangeText={setInput}
                editable={!sending && !!chatId && !chatEnded}
                multiline
                textAlignVertical="top"
                onContentSizeChange={(e) => {
                  const h = e?.nativeEvent?.contentSize?.height || INPUT_MIN_HEIGHT;
                  setInputHeight(h + 12);
                }}
                scrollEnabled={computedInputHeight >= INPUT_MAX_HEIGHT}
                style={[
                  theme.input.box,
                  {
                    flex: 1,
                    marginRight: 10,
                    opacity: sending || !chatId || chatEnded ? 0.7 : 1,
                    minHeight: INPUT_MIN_HEIGHT,
                    height: computedInputHeight,
                    lineHeight: 20,
                    paddingTop: 12,
                    paddingBottom: 12,
                  },
                ]}
              />

              <Pressable
                onPress={send}
                disabled={!canSend}
                style={[
                  theme.button.primary,
                  {
                    height: INPUT_MIN_HEIGHT,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    justifyContent: "center",
                    alignItems: "center",
                    opacity: !canSend ? 0.6 : 1,
                    flexDirection: "row",
                    gap: 8,
                  },
                ]}
              >
                <Ionicons name="send" size={16} color={theme.colors.text} />
                <Text style={theme.button.primaryText}>Send</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
