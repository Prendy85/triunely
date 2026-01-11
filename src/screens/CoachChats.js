// src/screens/CoachChats.js
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";
import { theme } from "../theme/theme";

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
  const insets = useSafeAreaInsets();

  // IMPORTANT:
  // - We want list content to end ABOVE the tab bar.
  // - On some Android devices, tabBarHeight already “bakes in” the bottom inset.
  // - So we do NOT add insets.bottom on top (avoids double padding / floating list).
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
        if (!previewByChat[m.chat_id]) previewByChat[m.chat_id] = m.content;
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

      // End any other active chats first (one-active-chat rule)
      await supabase
        .from("faith_coach_chats")
        .update({ ended_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("ended_at", null)
        .neq("id", chatId);

      // Resume selected
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
        backgroundColor: theme.colors.blue,
        borderRadius: 12,
        marginBottom: 10,
        paddingLeft: 14,
      }}
    >
      <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Resume</Text>
    </View>
  );

  const renderRightActions = () => (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "flex-end",
        backgroundColor: "#D64545",
        borderRadius: 12,
        marginBottom: 10,
        paddingRight: 14,
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "900" }}>Delete</Text>
    </View>
  );

  const ChatRow = ({ item }) => {
    const swipeRef = useRef(null);
    const triggeredRef = useRef(false);

    const when = formatWhen(item.started_at);
    const active = item.ended_at === null;

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
          style={{
            backgroundColor: theme.colors.surfaceAlt,
            borderRadius: 14,
            padding: 12,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: theme.colors.divider,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ color: theme.colors.text, fontWeight: "800", flex: 1 }}>
              {item.title?.trim() ? item.title : "Faith Coach Chat"}
            </Text>

            {active ? (
              <View
                style={{
                  backgroundColor: theme.colors.blue,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "800", fontSize: 12 }}>
                  Active
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={{ color: theme.colors.muted, marginTop: 6 }}>{when}</Text>

          {item.summary?.trim() ? (
            <Text style={{ color: theme.colors.text2, marginTop: 8 }} numberOfLines={2}>
              {item.summary}
            </Text>
          ) : item.preview ? (
            <Text style={{ color: theme.colors.text2, marginTop: 8 }} numberOfLines={2}>
              {item.preview}
            </Text>
          ) : (
            <Text style={{ color: theme.colors.text2, marginTop: 8 }} numberOfLines={2}>
              (No messages)
            </Text>
          )}
        </Pressable>
      </Swipeable>
    );
  };

  // Bottom padding rules:
  // - Use tabBarHeight (it already accounts for bottom inset on many devices)
  // - Add only a small breathing gap
  const listBottomPad = Math.max(12, tabBarHeight + 12);

  return (
    <Screen backgroundColor={theme.colors.bg} padded>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            backgroundColor: theme.colors.surfaceAlt,
            borderWidth: 1,
            borderColor: theme.colors.divider,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
            marginRight: 10,
          }}
        >
          <Text style={{ color: theme.colors.text, fontWeight: "800" }}>Back</Text>
        </Pressable>

        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "800", flex: 1 }}>
          Chats
        </Text>

        <Pressable
          onPress={load}
          style={{
            backgroundColor: theme.colors.surfaceAlt,
            borderWidth: 1,
            borderColor: theme.colors.divider,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: theme.colors.text, fontWeight: "800" }}>Refresh</Text>
        </Pressable>
      </View>

      <Text style={{ color: theme.colors.muted, marginBottom: 10 }}>
        Swipe right to resume • Swipe left to delete
      </Text>

      {loading ? (
        <View style={{ marginTop: 20 }}>
          <ActivityIndicator />
          <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Loading chats…</Text>
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
