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

const FAITH_COACH_URL =
  "https://eadxngfhthbrwrkgpdsw.supabase.co/functions/v1/faith-coach";

const MAX_HISTORY = 20;
const PAGE_SIZE = 80;

const INPUT_MIN_HEIGHT = 44;
const INPUT_MAX_HEIGHT = 140;

// --- Premium Triunely Coach visual system ---
const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";

const CARD_BORDER = "rgba(15, 23, 42, 0.08)";
const AMBER_SOFT = "rgba(180, 83, 9, 0.10)";
const AMBER_BORDER = "rgba(180, 83, 9, 0.18)";
const OLIVE_SOFT = "rgba(79, 99, 59, 0.10)";
const OLIVE_BORDER = "rgba(79, 99, 59, 0.18)";
const SHADOW = "rgba(15, 23, 42, 0.10)";

const displayFont = Platform.OS === "ios" ? "Georgia" : "serif";

const serifHeading = {
  fontFamily: displayFont,
  color: TEXT,
  fontWeight: "900",
  letterSpacing: -0.45,
};

const firstNameOnly = (s) => (s || "").trim().split(/\s+/)[0] || "";

export default function Coach({ navigation, route }) {
  const { awardCoachPointOnce } = usePoints();
  const listRef = useRef(null);

  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();

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

    const showSub = Keyboard.addListener(showEvent, () =>
      setKeyboardOpen(true)
    );
    const hideSub = Keyboard.addListener(hideEvent, () =>
      setKeyboardOpen(false)
    );

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
    if (!session?.access_token || !session?.user?.id) {
      throw new Error("No session");
    }

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

    const saved = await insertMessage(
      cid,
      session.user.id,
      "assistant",
      greetText
    );

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

      const savedUserMsg = await insertMessage(
        chatId,
        session.user.id,
        "user",
        trimmed
      );

      const nextMessages = [...messages, savedUserMsg];

      setMessages(nextMessages);

      const historyForAI = nextMessages.slice(-MAX_HISTORY).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(FAITH_COACH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: historyForAI,
          user_first_name: firstName,
        }),
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
      const replyText =
        data?.text?.trim() || "I didn’t receive a response. Please try again.";

      const savedAssistantMsg = await insertMessage(
        chatId,
        session.user.id,
        "assistant",
        replyText
      );

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
          maxWidth: isUser ? "82%" : "92%",
          marginVertical: 7,
        }}
      >
        {!isUser ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 6,
              marginLeft: 2,
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: AMBER_SOFT,
                borderWidth: 1,
                borderColor: AMBER_BORDER,
                marginRight: 7,
              }}
            >
              <Ionicons name="sparkles-outline" size={14} color={EVENT_AMBER} />
            </View>

            <Text
              style={{
                color: EVENT_BROWN,
                fontSize: 12,
                fontWeight: "900",
              }}
            >
              Faith Coach
            </Text>
          </View>
        ) : null}

        <View
          style={{
            backgroundColor: isUser ? OLIVE_SOFT : "#FFFFFF",
            borderWidth: 1,
            borderColor: isUser ? OLIVE_BORDER : AMBER_BORDER,
            paddingVertical: isUser ? 10 : 14,
            paddingHorizontal: isUser ? 12 : 15,
            borderRadius: isUser ? 16 : 22,
            borderTopRightRadius: isUser ? 6 : 22,
            borderTopLeftRadius: isUser ? 16 : 6,
            shadowColor: SHADOW,
            shadowOpacity: isUser ? 0.03 : 0.09,
            shadowRadius: isUser ? 6 : 13,
            shadowOffset: { width: 0, height: isUser ? 2 : 5 },
            elevation: isUser ? 1 : 3,
          }}
        >
          {!isUser ? (
            <View
              style={{
                marginBottom: 10,
                paddingBottom: 9,
                borderBottomWidth: 1,
                borderBottomColor: CARD_BORDER,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Ionicons name="leaf-outline" size={15} color={EVENT_AMBER} />

              <Text
                style={{
                  color: MUTED,
                  marginLeft: 6,
                  fontSize: 11,
                  fontWeight: "800",
                }}
              >
                Biblical encouragement
              </Text>
            </View>
          ) : null}

          <Text
            style={{
              color: isUser ? OLIVE : TEXT,
              lineHeight: isUser ? 20 : 23,
              fontWeight: isUser ? "700" : "650",
              fontSize: isUser ? 14 : 15.5,
            }}
          >
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  const computedInputHeight = Math.max(
    INPUT_MIN_HEIGHT,
    Math.min(INPUT_MAX_HEIGHT, inputHeight)
  );

  const inputBottomPad = keyboardOpen ? 10 : 4;

  return (
    <Screen backgroundColor={PREMIUM_CREAM} padded={false} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 14 }}>
          {/* Premium Coach Header */}
          <View
            style={{
              marginBottom: 14,
              padding: 16,
              borderRadius: 28,
              backgroundColor: SURFACE,
              borderWidth: 1,
              borderColor: AMBER_BORDER,
              shadowColor: SHADOW,
              shadowOpacity: 0.09,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
              elevation: 3,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  flex: 1,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: AMBER_SOFT,
                    borderWidth: 1,
                    borderColor: AMBER_BORDER,
                    marginRight: 12,
                  }}
                >
                  <Ionicons
                    name="sparkles-outline"
                    size={22}
                    color={EVENT_AMBER}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      serifHeading,
                      {
                        fontSize: 26,
                        lineHeight: 30,
                      },
                    ]}
                  >
                    Faith Coach
                  </Text>

                  <Text
                    style={{
                      color: MUTED,
                      marginTop: 3,
                      fontSize: 13,
                      lineHeight: 18,
                      fontWeight: "700",
                    }}
                  >
                    Gentle guidance, prayerful reflection, and biblical
                    encouragement.
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 14,
                gap: 10,
              }}
            >
              <Pressable
                onPress={() => navigation.navigate("CoachChats")}
                disabled={booting || sending}
                hitSlop={8}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 11,
                  paddingHorizontal: 13,
                  borderRadius: 999,
                  backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
                  borderWidth: 1,
                  borderColor: OLIVE_BORDER,
                  opacity: booting || sending ? 0.6 : 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                })}
              >
                <Ionicons name="chatbubbles-outline" size={16} color={OLIVE} />

                <Text
                  style={{
                    color: OLIVE,
                    fontSize: 13,
                    fontWeight: "900",
                  }}
                >
                  Chats
                </Text>
              </Pressable>

              <Pressable
                onPress={endChat}
                disabled={booting || !chatId || sending}
                hitSlop={8}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 11,
                  paddingHorizontal: 13,
                  borderRadius: 999,
                  backgroundColor: pressed ? AMBER_SOFT : EVENT_AMBER,
                  borderWidth: 1,
                  borderColor: AMBER_BORDER,
                  opacity: booting || !chatId || sending ? 0.6 : 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  shadowColor: EVENT_AMBER,
                  shadowOpacity: booting || !chatId || sending ? 0 : 0.18,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 5 },
                  elevation: booting || !chatId || sending ? 0 : 3,
                })}
              >
                <Ionicons
                  name="stop-circle-outline"
                  size={16}
                  color="#FFFFFF"
                />

                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 13,
                    fontWeight: "900",
                  }}
                >
                  End Chat
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Ended banner */}
          {chatEnded ? (
            <View
              style={{
                padding: 12,
                borderRadius: 18,
                marginBottom: 12,
                backgroundColor: SURFACE,
                borderWidth: 1,
                borderColor: AMBER_BORDER,
                shadowColor: SHADOW,
                shadowOpacity: 0.06,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={EVENT_AMBER}
                  style={{ marginRight: 8 }}
                />

                <Text
                  style={{
                    color: TEXT,
                    flex: 1,
                    fontWeight: "700",
                    lineHeight: 18,
                  }}
                >
                  This chat is ended. Resume it to continue.
                </Text>

                <Pressable
                  onPress={resumeChat}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    marginLeft: 10,
                    backgroundColor: EVENT_AMBER,
                    borderWidth: 1,
                    borderColor: AMBER_BORDER,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontWeight: "900",
                      fontSize: 12,
                    }}
                  >
                    Resume
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* Messages */}
          <View style={{ flex: 1 }}>
            {booting ? (
              <View style={{ marginTop: 12, alignItems: "center" }}>
                <ActivityIndicator color={EVENT_AMBER} />

                <Text
                  style={{
                    color: MUTED,
                    marginTop: 8,
                    fontWeight: "700",
                  }}
                >
                  Loading…
                </Text>
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
                  backgroundColor: SURFACE,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  paddingVertical: 11,
                  paddingHorizontal: 13,
                  borderRadius: 18,
                  borderTopLeftRadius: 6,
                  marginVertical: 6,
                  maxWidth: "88%",
                  flexDirection: "row",
                  alignItems: "center",
                  shadowColor: SHADOW,
                  shadowOpacity: 0.06,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 2,
                }}
              >
                <ActivityIndicator size="small" color={EVENT_AMBER} />

                <Text
                  style={{
                    color: MUTED,
                    marginLeft: 8,
                    fontWeight: "700",
                  }}
                >
                  Faith Coach is reflecting…
                </Text>
              </View>
            ) : null}
          </View>

          {/* Premium Input row */}
          <View
            style={{
              paddingBottom: inputBottomPad,
              paddingTop: 10,
              backgroundColor: PREMIUM_CREAM,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                padding: 10,
                borderRadius: 24,
                backgroundColor: SURFACE,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                shadowColor: SHADOW,
                shadowOpacity: 0.08,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 5 },
                elevation: 3,
              }}
            >
              <TextInput
                placeholder={chatEnded ? "Resume chat to reply…" : "Ask Faith Coach…"}
                placeholderTextColor="rgba(107, 114, 128, 0.72)"
                value={input}
                onChangeText={setInput}
                editable={!sending && !!chatId && !chatEnded}
                multiline
                textAlignVertical="top"
                onContentSizeChange={(e) => {
                  const h =
                    e?.nativeEvent?.contentSize?.height || INPUT_MIN_HEIGHT;
                  setInputHeight(h + 12);
                }}
                scrollEnabled={computedInputHeight >= INPUT_MAX_HEIGHT}
                style={{
                  flex: 1,
                  marginRight: 10,
                  opacity: sending || !chatId || chatEnded ? 0.7 : 1,
                  minHeight: INPUT_MIN_HEIGHT,
                  height: computedInputHeight,
                  maxHeight: INPUT_MAX_HEIGHT,
                  color: TEXT,
                  fontSize: 15,
                  lineHeight: 21,
                  fontWeight: "650",
                  paddingTop: 11,
                  paddingBottom: 11,
                  paddingHorizontal: 12,
                  borderRadius: 18,
                  backgroundColor: PREMIUM_CREAM,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                }}
              />

              <Pressable
                onPress={send}
                disabled={!canSend}
                style={({ pressed }) => ({
                  width: 46,
                  height: 46,
                  borderRadius: 999,
                  justifyContent: "center",
                  alignItems: "center",
                  opacity: !canSend ? 0.5 : 1,
                  backgroundColor: canSend ? EVENT_AMBER : AMBER_SOFT,
                  borderWidth: 1,
                  borderColor: AMBER_BORDER,
                  shadowColor: EVENT_AMBER,
                  shadowOpacity: canSend ? 0.22 : 0,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 5 },
                  elevation: canSend ? 3 : 0,
                  transform: [{ scale: pressed && canSend ? 0.95 : 1 }],
                })}
              >
                <Ionicons
                  name="send"
                  size={17}
                  color={canSend ? "#FFFFFF" : EVENT_BROWN}
                />
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}