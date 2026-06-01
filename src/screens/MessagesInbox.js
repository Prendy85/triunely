// src/screens/MessagesInbox.js
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";

import Screen from "../components/Screen";
import {
  getOrCreateDirectConversation,
  listMyInbox,
  searchUsersForDM,
} from "../lib/messages";
import { supabase } from "../lib/supabase";
import { theme } from "../theme/theme";

const GOLD = theme.colors.gold || "#D99400";
const GOLD_SOFT = "rgba(217, 148, 0, 0.10)";
const GOLD_BORDER = "rgba(217, 148, 0, 0.20)";
const GOLD_LINE = "rgba(217, 148, 0, 0.75)";

const OLIVE = "#4F633B";
const OLIVE_SOFT = "rgba(79, 99, 59, 0.10)";
const OLIVE_BORDER = "rgba(79, 99, 59, 0.16)";

const TEXT_DARK = theme.colors.text || "#111827";
const TEXT_MUTED = theme.colors.muted || "#7B8493";
const CARD_BORDER = "rgba(15, 23, 42, 0.08)";
const CARD_SHADOW = "rgba(15, 23, 42, 0.08)";
const WHITE = "#FFFFFF";
const CREAM = "#FFFCF5";

const FONT_DISPLAY = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: undefined,
});

const FONT_BODY = undefined;

function safeInitials(name) {
  const n = String(name ?? "").trim();
  if (!n) return "?";

  const parts = n.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();

  return n[0]?.toUpperCase() || "?";
}

function normaliseType(row) {
  return row?.type || "dm";
}

function titleForRow(row) {
  const type = normaliseType(row);

  if (type === "church_group") return row?.title || "Group chat";
  if (type === "church") {
  return (
    row?.title ||
    row?.church_display_name ||
    row?.church_name ||
    "Church Messages"
  );
}
  if (type === "dm") return row?.other_display_name || "Conversation";

  return row?.title || "Conversation";
}

function subtitleForRow(row) {
  const type = normaliseType(row);

  if (type === "church_group") return "Church group";
  if (type === "church") return "Church messages";
  if (type === "dm" && row?.other_handle) return `@${row.other_handle}`;

  return "Direct";
}

function tabHeader(activeTab) {
  if (activeTab === "groups") {
    return {
      title: "Groups",
      body: "Church group conversations",
      icon: "people-outline",
    };
  }

  if (activeTab === "church") {
    return {
      title: "Church",
      body: "Church messages and updates",
      icon: "business-outline",
    };
  }

  return {
    title: "People",
    body: "Direct conversations",
    icon: "person-outline",
  };
}

function emptyTextForTab(activeTab) {
  if (activeTab === "groups") return "No group chats yet.";
  if (activeTab === "church") return "No church messages yet.";
  return "No direct messages yet.";
}

function emptyBodyForTab(activeTab) {
  if (activeTab === "groups") {
    return "When you join or open a church group chat, it will appear here.";
  }

  if (activeTab === "church") {
    return "Church-wide conversations will appear here when enabled.";
  }

  return "Search for someone to start a direct message.";
}

function formatDate(value) {
  if (!value) return null;

  try {
    const date = new Date(value);

    return date.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return null;
  }
}

export default function MessagesInbox({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [me, setMe] = useState(null);
  const [activeTab, setActiveTab] = useState("people");

  const [refreshing, setRefreshing] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerResults, setPickerResults] = useState([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const { data: sess } = await supabase.auth.getSession();
      const myId = sess?.session?.user?.id || null;
      setMe(myId);

      const data = await listMyInbox(100);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log("MessagesInbox load error", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filteredRows = useMemo(() => {
    const allRows = Array.isArray(rows) ? rows : [];

    if (activeTab === "groups") {
      return allRows.filter((row) => normaliseType(row) === "church_group");
    }

    if (activeTab === "church") {
      return allRows.filter((row) => normaliseType(row) === "church");
    }

    return allRows.filter((row) => normaliseType(row) === "dm");
  }, [rows, activeTab]);

  const tabCounts = useMemo(() => {
    const allRows = Array.isArray(rows) ? rows : [];

    return {
      people: allRows.filter((row) => normaliseType(row) === "dm").length,
      groups: allRows.filter((row) => normaliseType(row) === "church_group").length,
      church: allRows.filter((row) => normaliseType(row) === "church").length,
    };
  }, [rows]);

  const openConversation = useCallback(
    (row) => {
      if (!row?.conversation_id) return;

      setRows((prev) =>
        (prev || []).map((r) =>
          r.conversation_id === row.conversation_id
            ? { ...r, unread_count: 0 }
            : r
        )
      );

      const type = normaliseType(row);
      const isDM = type === "dm";

      navigation.navigate("Chat", {
        conversationId: row.conversation_id,
        type,
        title: titleForRow(row),
        avatarUrl: isDM ? row.other_avatar_url || null : null,
        otherUserId: isDM ? row.other_user_id || null : null,
        handle: isDM ? row.other_handle || row.other_username || null : null,
      });
    },
    [navigation]
  );

  const openPicker = useCallback(() => {
    setPickerQuery("");
    setPickerResults([]);
    setPickerOpen(true);
  }, []);

  const runSearch = useCallback(
    async (text) => {
      setPickerQuery(text);

      const q = String(text ?? "").trim();

      if (!q) {
        setPickerResults([]);
        return;
      }

      try {
        setPickerLoading(true);

        const results = await searchUsersForDM(q, 20);
        const filtered = (results || []).filter((u) => u.id !== me);

        setPickerResults(filtered);
      } catch (e) {
        console.log("searchUsersForDM error", e);
        setPickerResults([]);
      } finally {
        setPickerLoading(false);
      }
    },
    [me]
  );

  const startDmWith = useCallback(
    async (userRow) => {
      try {
        if (!userRow?.id) return;

        setPickerLoading(true);

        const conversationId = await getOrCreateDirectConversation(userRow.id);

        setPickerOpen(false);
        setPickerQuery("");
        setPickerResults([]);

        navigation.navigate("Chat", {
          conversationId,
          type: "dm",
          title: userRow.display_name || "Conversation",
          avatarUrl: userRow.avatar_url || null,
          otherUserId: userRow.id,
          handle: userRow.username || userRow.handle || null,
        });
      } catch (e) {
        console.log("startDmWith error", e);
      } finally {
        setPickerLoading(false);
      }
    },
    [navigation]
  );

  function renderUnderlineTabs() {
    const tabs = [
      {
        key: "people",
        label: "People",
        icon: "person-outline",
        count: tabCounts.people,
      },
      {
        key: "groups",
        label: "Groups",
        icon: "people-outline",
        count: tabCounts.groups,
      },
      {
        key: "church",
        label: "Church",
        icon: "business-outline",
        count: tabCounts.church,
      },
    ];

    return (
      <View
        style={{
          marginHorizontal: 20,
          marginTop: 17,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(15, 23, 42, 0.10)",
          flexDirection: "row",
          alignItems: "flex-end",
        }}
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.key;

          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={({ pressed }) => ({
                flex: 1,
                paddingTop: 8,
                paddingBottom: 10,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name={tab.icon}
                  size={17}
                  color={active ? GOLD : OLIVE}
                />

                <Text
                  style={{
                    color: active ? GOLD : OLIVE,
                    fontFamily: FONT_BODY,
                    fontWeight: active ? "900" : "800",
                    fontSize: 13.5,
                    marginLeft: 6,
                  }}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>

                <Text
                  style={{
                    color: active ? GOLD : TEXT_MUTED,
                    fontFamily: FONT_BODY,
                    fontWeight: "900",
                    fontSize: 10.5,
                    marginLeft: 5,
                    marginTop: 1,
                  }}
                >
                  {tab.count}
                </Text>
              </View>

              <View
                style={{
                  position: "absolute",
                  left: 16,
                  right: 16,
                  bottom: -1,
                  height: active ? 3 : 0,
                  borderRadius: 999,
                  backgroundColor: active ? GOLD_LINE : "transparent",
                  shadowColor: GOLD,
                  shadowOpacity: active ? 0.35 : 0,
                  shadowRadius: active ? 5 : 0,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: active ? 2 : 0,
                }}
              />
            </Pressable>
          );
        })}
      </View>
    );
  }

  function renderSectionHeader() {
    const header = tabHeader(activeTab);

    return (
      <View
        style={{
          marginHorizontal: 20,
          marginTop: 20,
          marginBottom: 10,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 39,
            height: 39,
            borderRadius: 19.5,
            backgroundColor: WHITE,
            borderWidth: 1,
            borderColor: activeTab === "church" ? OLIVE_BORDER : GOLD_BORDER,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 11,
            shadowColor: activeTab === "church" ? OLIVE : GOLD,
            shadowOpacity: 0.1,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
            elevation: 1,
          }}
        >
          <Ionicons
            name={header.icon}
            size={19}
            color={activeTab === "church" ? OLIVE : GOLD}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: TEXT_DARK,
              fontFamily: FONT_DISPLAY,
              fontWeight: "900",
              fontSize: 24,
              letterSpacing: -0.2,
            }}
          >
            {header.title}
          </Text>

          <Text
            style={{
              color: TEXT_MUTED,
              fontFamily: FONT_BODY,
              fontWeight: "700",
              fontSize: 12.5,
              marginTop: 0,
            }}
            numberOfLines={1}
          >
            {header.body}
          </Text>
        </View>
      </View>
    );
  }

  function renderAvatar(item) {
    const type = normaliseType(item);
    const isDM = type === "dm";
const avatarUrl =
  type === "church"
    ? item?.church_avatar_url || null
    : isDM
    ? item?.other_avatar_url || null
    : null;
    const title = titleForRow(item);
    const initials = safeInitials(title);

    if (avatarUrl) {
      return (
        <Image
          source={{ uri: avatarUrl }}
          style={{
            width: 50,
            height: 50,
            borderRadius: 25,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.9)",
            backgroundColor: theme.colors.surfaceAlt,
          }}
        />
      );
    }

    if (type === "church_group") {
      return (
        <View
          style={{
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: OLIVE_SOFT,
            borderWidth: 1,
            borderColor: OLIVE_BORDER,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: OLIVE,
              fontFamily: FONT_DISPLAY,
              fontWeight: "900",
              fontSize: 15,
              letterSpacing: 0.2,
            }}
            numberOfLines={1}
          >
            {initials}
          </Text>

          <View
            style={{
              position: "absolute",
              right: -1,
              bottom: -1,
              width: 17,
              height: 17,
              borderRadius: 8.5,
              backgroundColor: GOLD,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: WHITE,
            }}
          >
            <Ionicons name="people" size={9} color="#fff" />
          </View>
        </View>
      );
    }

    if (type === "church") {
      return (
        <View
          style={{
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: OLIVE_SOFT,
            borderWidth: 1,
            borderColor: OLIVE_BORDER,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="business-outline" size={24} color={OLIVE} />
        </View>
      );
    }

    return (
      <View
        style={{
          width: 50,
          height: 50,
          borderRadius: 25,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          backgroundColor: theme.colors.surfaceAlt,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            color: TEXT_DARK,
            fontFamily: FONT_DISPLAY,
            fontWeight: "900",
            fontSize: 15,
          }}
        >
          {initials}
        </Text>
      </View>
    );
  }

  function renderConversationRow({ item }) {
    const type = normaliseType(item);
    const unread = Number(item.unread_count || 0);
    const preview = item.last_message ?? item.last_message_text ?? "No messages yet";
    const dateLabel = formatDate(item.last_message_at);

    const typeBadge =
      type === "church_group"
        ? "Group"
        : type === "church"
        ? "Church"
        : "Direct";

    const badgeColor =
      type === "church_group" || type === "church" ? OLIVE : GOLD;

    const badgeBg =
      type === "church_group" || type === "church" ? OLIVE_SOFT : GOLD_SOFT;

    return (
      <Pressable
        onPress={() => openConversation(item)}
        style={({ pressed }) => ({
          marginHorizontal: 20,
          marginBottom: 10,
          paddingVertical: 11,
          paddingHorizontal: 13,
          borderRadius: 20,
          backgroundColor: WHITE,
          borderWidth: 1,
          borderColor: unread > 0 ? GOLD_BORDER : CARD_BORDER,
          shadowColor: CARD_SHADOW,
          shadowOpacity: 0.12,
          shadowRadius: 9,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
          opacity: pressed ? 0.84 : 1,
        })}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {renderAvatar(item)}

          <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  color: TEXT_DARK,
                  fontFamily: FONT_DISPLAY,
                  fontWeight: "900",
                  fontSize: 15.5,
                  letterSpacing: -0.1,
                  marginRight: 7,
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {titleForRow(item)}
              </Text>

              {dateLabel ? (
                <Text
                  style={{
                    color: TEXT_MUTED,
                    fontFamily: FONT_BODY,
                    fontWeight: "800",
                    fontSize: 11.5,
                  }}
                  numberOfLines={1}
                >
                  {dateLabel}
                </Text>
              ) : null}
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 5,
              }}
            >
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2.5,
                  borderRadius: 999,
                  backgroundColor: badgeBg,
                  marginRight: 7,
                }}
              >
                <Text
                  style={{
                    color: badgeColor,
                    fontFamily: FONT_BODY,
                    fontWeight: "900",
                    fontSize: 10.5,
                  }}
                >
                  {typeBadge}
                </Text>
              </View>

              <Text
                style={{
                  flex: 1,
                  color: TEXT_MUTED,
                  fontFamily: FONT_BODY,
                  fontWeight: "700",
                  fontSize: 12,
                }}
                numberOfLines={1}
              >
                {subtitleForRow(item)}
              </Text>
            </View>

            <Text
              style={{
                color: unread > 0 ? TEXT_DARK : TEXT_MUTED,
                fontFamily: FONT_BODY,
                fontWeight: unread > 0 ? "900" : "700",
                fontSize: 12.5,
                lineHeight: 16,
              }}
              numberOfLines={1}
            >
              {preview}
            </Text>
          </View>

          <View
            style={{
              marginLeft: 8,
              alignItems: "center",
              justifyContent: "center",
              width: 18,
            }}
          >
            {unread > 0 ? (
              <View
                style={{
                  minWidth: 18,
                  height: 18,
                  paddingHorizontal: 5,
                  borderRadius: 999,
                  backgroundColor: GOLD,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 6,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontFamily: FONT_BODY,
                    fontWeight: "900",
                    fontSize: 9.5,
                  }}
                >
                  {unread > 99 ? "99+" : unread}
                </Text>
              </View>
            ) : null}

            <Ionicons name="chevron-forward" size={21} color="#333333" />
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Screen
      backgroundColor={CREAM}
      padded={false}
      style={{ flex: 1 }}
      contentStyle={{ flex: 1 }}
    >
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 18,
          paddingBottom: 2,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: pressed ? "rgba(255,255,255,0.78)" : WHITE,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 13,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 9,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
          })}
        >
          <Ionicons name="chevron-back" size={25} color={OLIVE} />
        </Pressable>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              color: "#102116",
              fontFamily: FONT_DISPLAY,
              fontSize: 33,
              fontWeight: "900",
              letterSpacing: -0.6,
              lineHeight: 37,
            }}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
          >
            Messages
          </Text>

          <Text
            style={{
              color: TEXT_MUTED,
              fontFamily: FONT_BODY,
              fontSize: 13,
              fontWeight: "700",
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            People, groups & church
          </Text>
        </View>

        <Pressable
          onPress={openPicker}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? theme.colors.surfaceAlt : WHITE,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 9,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
            marginLeft: 12,
          })}
        >
          <Ionicons name="search-outline" size={25} color="#101010" />
        </Pressable>
      </View>

      {renderUnderlineTabs()}

      {loading ? (
        <View style={{ paddingTop: 30, alignItems: "center" }}>
          <ActivityIndicator size="large" color={GOLD} />
        </View>
      ) : (
        <FlatList
          data={filteredRows}
          keyExtractor={(r) => String(r.conversation_id)}
          ListHeaderComponent={renderSectionHeader}
          contentContainerStyle={{
            paddingBottom: 24,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={GOLD}
            />
          }
          ListEmptyComponent={
            <View
              style={{
                marginHorizontal: 20,
                marginTop: 6,
                padding: 18,
                borderRadius: 22,
                backgroundColor: WHITE,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                shadowColor: CARD_SHADOW,
                shadowOpacity: 0.1,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: 2,
              }}
            >
              <Text
                style={{
                  color: TEXT_DARK,
                  fontFamily: FONT_DISPLAY,
                  fontWeight: "900",
                  fontSize: 19,
                }}
              >
                {emptyTextForTab(activeTab)}
              </Text>

              <Text
                style={{
                  color: TEXT_MUTED,
                  fontFamily: FONT_BODY,
                  fontWeight: "700",
                  fontSize: 13,
                  lineHeight: 19,
                  marginTop: 5,
                }}
              >
                {emptyBodyForTab(activeTab)}
              </Text>
            </View>
          }
          renderItem={renderConversationRow}
        />
      )}

      <Modal visible={pickerOpen} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.42)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: CREAM,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 20,
              maxHeight: "82%",
              borderWidth: 1,
              borderColor: theme.colors.divider,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View>
                <Text
                  style={{
                    color: TEXT_DARK,
                    fontFamily: FONT_DISPLAY,
                    fontWeight: "900",
                    fontSize: 25,
                  }}
                >
                  New message
                </Text>

                <Text
                  style={{
                    color: TEXT_MUTED,
                    fontFamily: FONT_BODY,
                    fontWeight: "700",
                    fontSize: 13,
                    marginTop: 2,
                  }}
                >
                  Search for someone to message.
                </Text>
              </View>

              <Pressable
                onPress={() => setPickerOpen(false)}
                hitSlop={12}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: WHITE,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                }}
              >
                <Ionicons name="close" size={22} color={TEXT_MUTED} />
              </Pressable>
            </View>

            <View
              style={{
                marginTop: 15,
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: WHITE,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                borderRadius: 20,
                paddingHorizontal: 14,
                height: 50,
              }}
            >
              <Ionicons name="search-outline" size={20} color={TEXT_MUTED} />

              <TextInput
                value={pickerQuery}
                onChangeText={runSearch}
                placeholder="Search people by name or username"
                placeholderTextColor={TEXT_MUTED}
                autoCorrect={false}
                autoCapitalize="none"
                style={{
                  flex: 1,
                  marginLeft: 10,
                  color: TEXT_DARK,
                  fontFamily: FONT_BODY,
                  fontWeight: "800",
                  fontSize: 14,
                }}
              />

              {pickerQuery.length > 0 ? (
                <Pressable onPress={() => runSearch("")} hitSlop={10}>
                  <Ionicons name="close-circle" size={19} color={TEXT_MUTED} />
                </Pressable>
              ) : null}
            </View>

            {pickerLoading ? (
              <View style={{ paddingTop: 18, alignItems: "center" }}>
                <ActivityIndicator color={GOLD} />
              </View>
            ) : (
              <FlatList
                style={{ marginTop: 12 }}
                data={pickerResults}
                keyExtractor={(u) => u.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item: u }) => {
                  const displayName = u.display_name || "User";
                  const username = u.username ? `@${u.username}` : null;

                  return (
                    <Pressable
                      onPress={() => startDmWith(u)}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: CARD_BORDER,
                        opacity: pressed ? 0.75 : 1,
                      })}
                    >
                      {u.avatar_url ? (
                        <Image
                          source={{ uri: u.avatar_url }}
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 21,
                            marginRight: 12,
                          }}
                        />
                      ) : (
                        <View
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 21,
                            marginRight: 12,
                            backgroundColor: WHITE,
                            borderWidth: 1,
                            borderColor: CARD_BORDER,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: TEXT_DARK,
                              fontFamily: FONT_DISPLAY,
                              fontWeight: "900",
                            }}
                          >
                            {safeInitials(displayName)}
                          </Text>
                        </View>
                      )}

                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: TEXT_DARK,
                            fontFamily: FONT_DISPLAY,
                            fontWeight: "900",
                            fontSize: 16,
                          }}
                          numberOfLines={1}
                        >
                          {displayName}
                        </Text>

                        {username ? (
                          <Text
                            style={{
                              color: TEXT_MUTED,
                              fontFamily: FONT_BODY,
                              fontWeight: "700",
                              marginTop: 2,
                            }}
                            numberOfLines={1}
                          >
                            {username}
                          </Text>
                        ) : null}
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={TEXT_MUTED}
                      />
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  pickerQuery.trim() ? (
                    <Text
                      style={{
                        color: TEXT_MUTED,
                        marginTop: 14,
                        fontFamily: FONT_BODY,
                        fontWeight: "700",
                      }}
                    >
                      No users found.
                    </Text>
                  ) : (
                    <Text
                      style={{
                        color: TEXT_MUTED,
                        marginTop: 14,
                        fontFamily: FONT_BODY,
                        fontWeight: "700",
                      }}
                    >
                      Type to search.
                    </Text>
                  )
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}