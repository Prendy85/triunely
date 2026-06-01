// src/screens/CoachChats.js
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";

import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";

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
const DANGER = "#B42318";
const DANGER_SOFT = "rgba(180, 35, 24, 0.10)";

const displayFont = Platform.OS === "ios" ? "Georgia" : "serif";

const serifHeading = {
  fontFamily: displayFont,
  color: TEXT,
  fontWeight: "900",
  letterSpacing: -0.45,
};

const formatWhen = (iso) => {
  if (!iso) return "";

  const d = new Date(iso);
  const now = new Date();

  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();

  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");

  if (sameDay) return `Today ${hh}:${mm}`;
  if (isYesterday) return `Yesterday ${hh}:${mm}`;

  return `${d.toLocaleDateString()} ${hh}:${mm}`;
};

export default function CoachChats({ navigation }) {
  const tabBarHeight = useBottomTabBarHeight();

  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState([]);

  const load = async () => {
    setLoading(true);

    try {
      const { data: sessionData, error: sessErr } =
        await supabase.auth.getSession();

      if (sessErr) throw sessErr;

      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        setChats([]);
        return;
      }

      const { data: chatRows, error: chatErr } = await supabase
        .from("faith_coach_chats")
        .select("id, started_at, ended_at, title, summary")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(50);

      if (chatErr) throw chatErr;

      const ids = (chatRows || []).map((c) => c.id);

      if (ids.length === 0) {
        setChats([]);
        return;
      }

      const { data: msgRows, error: msgErr } = await supabase
        .from("faith_coach_messages")
        .select("chat_id, content, created_at")
        .in("chat_id", ids)
        .order("created_at", { ascending: false })
        .limit(200);

      if (msgErr) throw msgErr;

      const previewByChat = {};

      for (const m of msgRows || []) {
        if (!previewByChat[m.chat_id]) {
          previewByChat[m.chat_id] = m.content;
        }
      }

      setChats(
        (chatRows || []).map((c) => ({
          ...c,
          preview: previewByChat[c.id] || "",
        }))
      );
    } catch (e) {
      console.log("CoachChats load error", e);
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    return unsub;
  }, [navigation]);

  const resumeChat = async (chatId) => {
    try {
      const { data: sessionData, error: sessErr } =
        await supabase.auth.getSession();

      if (sessErr) throw sessErr;

      const userId = sessionData?.session?.user?.id;
      if (!userId) return;

      await supabase
        .from("faith_coach_chats")
        .update({ ended_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("ended_at", null)
        .neq("id", chatId);

      const { error } = await supabase
        .from("faith_coach_chats")
        .update({ ended_at: null })
        .eq("id", chatId)
        .eq("user_id", userId);

      if (error) throw error;

      navigation.navigate("CoachMain", { chatId });
    } catch (e) {
      console.log("Resume chat error", e);
      Alert.alert("Couldn’t resume chat", "Please try again.");
    }
  };

  const deleteChat = async (chatId) => {
    Alert.alert(
      "Delete chat?",
      "This will permanently delete this chat and all messages inside it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { data: sessionData, error: sessErr } =
                await supabase.auth.getSession();

              if (sessErr) throw sessErr;

              const userId = sessionData?.session?.user?.id;
              if (!userId) return;

              const { error } = await supabase
                .from("faith_coach_chats")
                .delete()
                .eq("id", chatId)
                .eq("user_id", userId);

              if (error) throw error;

              load();
            } catch (e) {
              console.log("Delete chat error", e);
              Alert.alert("Couldn’t delete chat", "Please try again.");
            }
          },
        },
      ]
    );
  };

  const renderLeftActions = () => (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        backgroundColor: OLIVE_SOFT,
        borderRadius: 22,
        marginBottom: 12,
        paddingLeft: 16,
        borderWidth: 1,
        borderColor: OLIVE_BORDER,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Ionicons name="play-circle-outline" size={20} color={OLIVE} />

        <Text
          style={{
            color: OLIVE,
            fontWeight: "900",
            marginLeft: 8,
          }}
        >
          Resume
        </Text>
      </View>
    </View>
  );

  const renderRightActions = () => (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "flex-end",
        backgroundColor: DANGER_SOFT,
        borderRadius: 22,
        marginBottom: 12,
        paddingRight: 16,
        borderWidth: 1,
        borderColor: "rgba(180, 35, 24, 0.18)",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text
          style={{
            color: DANGER,
            fontWeight: "900",
            marginRight: 8,
          }}
        >
          Delete
        </Text>

        <Ionicons name="trash-outline" size={19} color={DANGER} />
      </View>
    </View>
  );

  const ChatRow = ({ item }) => {
    const swipeRef = useRef(null);
    const triggeredRef = useRef(false);

    const when = formatWhen(item.started_at);
    const active = item.ended_at === null;

    const title = item.title?.trim() ? item.title : "Faith Coach Chat";

    const preview = item.summary?.trim()
      ? item.summary
      : item.preview?.trim()
      ? item.preview
      : "No messages yet.";

    const onLeftOpen = () => {
      if (triggeredRef.current) return;

      triggeredRef.current = true;
      swipeRef.current?.close();
      resumeChat(item.id);
    };

    const onRightOpen = () => {
      if (triggeredRef.current) return;

      triggeredRef.current = true;
      swipeRef.current?.close();
      deleteChat(item.id);
    };

    return (
      <Swipeable
        ref={swipeRef}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        friction={2.2}
        leftThreshold={70}
        rightThreshold={70}
        overshootLeft
        overshootRight
        overshootFriction={10}
        onSwipeableLeftOpen={onLeftOpen}
        onSwipeableRightOpen={onRightOpen}
        onSwipeableClose={() => {
          triggeredRef.current = false;
        }}
      >
        <Pressable
          onPress={() => navigation.navigate("CoachMain", { chatId: item.id })}
          style={({ pressed }) => ({
            backgroundColor: SURFACE,
            borderRadius: 24,
            padding: 15,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: active ? AMBER_BORDER : CARD_BORDER,
            shadowColor: SHADOW,
            shadowOpacity: pressed ? 0.04 : 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 5 },
            elevation: pressed ? 1 : 3,
            transform: [{ scale: pressed ? 0.985 : 1 }],
          })}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: active ? AMBER_SOFT : OLIVE_SOFT,
                borderWidth: 1,
                borderColor: active ? AMBER_BORDER : OLIVE_BORDER,
                marginRight: 12,
              }}
            >
              <Ionicons
                name={active ? "sparkles-outline" : "chatbubble-ellipses-outline"}
                size={20}
                color={active ? EVENT_AMBER : OLIVE}
              />
            </View>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  style={{
                    color: TEXT,
                    fontSize: 15,
                    lineHeight: 20,
                    fontWeight: "900",
                    flex: 1,
                    paddingRight: 8,
                  }}
                  numberOfLines={2}
                >
                  {title}
                </Text>

                {active ? (
                  <View
                    style={{
                      paddingHorizontal: 9,
                      paddingVertical: 4,
                      borderRadius: 999,
                      backgroundColor: AMBER_SOFT,
                      borderWidth: 1,
                      borderColor: AMBER_BORDER,
                    }}
                  >
                    <Text
                      style={{
                        color: EVENT_BROWN,
                        fontWeight: "900",
                        fontSize: 11,
                      }}
                    >
                      Active
                    </Text>
                  </View>
                ) : null}
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 6,
                }}
              >
                <Ionicons name="time-outline" size={13} color={MUTED} />

                <Text
                  style={{
                    color: MUTED,
                    marginLeft: 5,
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >
                  {when}
                </Text>
              </View>

              <Text
                style={{
                  color: MUTED,
                  marginTop: 9,
                  fontSize: 13,
                  lineHeight: 19,
                  fontWeight: "650",
                }}
                numberOfLines={3}
              >
                {preview}
              </Text>
            </View>
          </View>
        </Pressable>
      </Swipeable>
    );
  };

  const listBottomPad = Math.max(18, tabBarHeight + 18);

  return (
    <Screen backgroundColor={PREMIUM_CREAM} padded>
      {/* Header */}
      <View
        style={{
          marginBottom: 16,
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
            gap: 12,
          }}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 42,
              height: 42,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed ? OLIVE_SOFT : PREMIUM_CREAM,
              borderWidth: 1,
              borderColor: OLIVE_BORDER,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}
          >
            <Ionicons name="chevron-back" size={21} color={OLIVE} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text
              style={[
                serifHeading,
                {
                  fontSize: 25,
                  lineHeight: 29,
                },
              ]}
            >
              Coach Chats
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
              Revisit previous guidance and continue your conversations.
            </Text>
          </View>

          <Pressable
            onPress={load}
            disabled={loading}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 42,
              height: 42,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed ? AMBER_SOFT : EVENT_AMBER,
              borderWidth: 1,
              borderColor: AMBER_BORDER,
              opacity: loading ? 0.6 : 1,
              shadowColor: EVENT_AMBER,
              shadowOpacity: loading ? 0 : 0.16,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 5 },
              elevation: loading ? 0 : 3,
              transform: [{ scale: pressed && !loading ? 0.96 : 1 }],
            })}
          >
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        <View
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 20,
            backgroundColor: PREMIUM_CREAM,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Ionicons name="swap-horizontal-outline" size={17} color={OLIVE} />

          <Text
            style={{
              color: MUTED,
              marginLeft: 8,
              fontSize: 12,
              lineHeight: 17,
              fontWeight: "750",
              flex: 1,
            }}
          >
            Swipe right to resume. Swipe left to delete.
          </Text>
        </View>
      </View>

      {loading ? (
        <View
          style={{
            marginTop: 20,
            alignItems: "center",
            justifyContent: "center",
            padding: 22,
            borderRadius: 24,
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: CARD_BORDER,
          }}
        >
          <ActivityIndicator color={EVENT_AMBER} />

          <Text
            style={{
              color: MUTED,
              marginTop: 10,
              fontWeight: "700",
            }}
          >
            Loading chats…
          </Text>
        </View>
      ) : chats.length === 0 ? (
        <View
          style={{
            marginTop: 20,
            padding: 20,
            borderRadius: 26,
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            alignItems: "center",
            shadowColor: SHADOW,
            shadowOpacity: 0.06,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 5 },
            elevation: 2,
          }}
        >
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: AMBER_SOFT,
              borderWidth: 1,
              borderColor: AMBER_BORDER,
              marginBottom: 12,
            }}
          >
            <Ionicons name="chatbubbles-outline" size={25} color={EVENT_AMBER} />
          </View>

          <Text
            style={{
              color: TEXT,
              fontSize: 17,
              fontWeight: "900",
              textAlign: "center",
            }}
          >
            No saved chats yet
          </Text>

          <Text
            style={{
              color: MUTED,
              marginTop: 7,
              fontSize: 13,
              lineHeight: 19,
              fontWeight: "700",
              textAlign: "center",
            }}
          >
            Your Faith Coach conversations will appear here once you start
            chatting.
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatRow item={item} />}
          contentContainerStyle={{
            paddingBottom: listBottomPad,
            paddingTop: 2,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}