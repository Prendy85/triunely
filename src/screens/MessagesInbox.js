// src/screens/MessagesInbox.js
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
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

function safeInitials(name) {
  const n = String(name ?? "").trim();
  if (!n) return "?";
  const parts = n.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return n[0]?.toUpperCase() || "?";
}

function titleForRow(row) {
  if (row.type === "church") return row?.church_name || "Church Messages";
  if (row.type === "dm") return row?.other_display_name || "Direct Message";
  return "Conversation";
}

function subtitleForRow(row) {
  if (row.type === "dm" && row?.other_handle) return `@${row.other_handle}`;
  return row.type === "church" ? "Church" : "Direct message";
}

export default function MessagesInbox({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [me, setMe] = useState(null);

  const [refreshing, setRefreshing] = useState(false);

  // New message (user search) modal state
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

      const data = await listMyInbox(50);
      setRows(data);
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

  // ✅ Optimistic UI clear so badge never “sticks”
  const openConversation = useCallback(
    (conversationId) => {
      setRows((prev) =>
        (prev || []).map((r) =>
          r.conversation_id === conversationId ? { ...r, unread_count: 0 } : r
        )
      );

      navigation.navigate("Chat", { conversationId });
    },
    [navigation]
  );

  // ---------- New Message (user search) ----------

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

        // RPC returns: id, display_name, username, avatar_url (per your comment)
        const results = await searchUsersForDM(q, 20);

        // Hide self if present
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
        setPickerLoading(true);

        const conversationId = await getOrCreateDirectConversation(userRow.id);

        setPickerOpen(false);
        setPickerQuery("");
        setPickerResults([]);

        navigation.navigate("Chat", { conversationId });
      } catch (e) {
        console.log("startDmWith error", e);
      } finally {
        setPickerLoading(false);
      }
    },
    [navigation]
  );

  return (
    <Screen
      backgroundColor={theme.colors.bg}
      padded={false}
      style={{ flex: 1 }}
      contentStyle={{ flex: 1 }}
    >
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 10,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={theme.text.h1}>Messages</Text>
          <Text style={[theme.text.muted, { marginTop: 4 }]}>
            Your conversations
          </Text>
        </View>

        {/* Compose / New DM */}
        <Pressable onPress={openPicker} hitSlop={12} style={{ padding: 10 }}>
         <Ionicons name="search-outline" size={22} color={theme.colors.text} />

        </Pressable>
      </View>

      {/* New message modal */}
      <Modal visible={pickerOpen} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.bg,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              padding: 16,
              maxHeight: "80%",
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
              <Text
                style={{
                  color: theme.colors.text,
                  fontWeight: "900",
                  fontSize: 16,
                }}
              >
                New message
              </Text>
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color={theme.colors.muted} />
              </Pressable>
            </View>

            {/* Search input */}
            <View
              style={{
                marginTop: 12,
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.divider,
                borderRadius: 14,
                paddingHorizontal: 12,
                height: 44,
              }}
            >
              <Ionicons name="search-outline" size={20} color={theme.colors.muted} />

              <TextInput
                value={pickerQuery}
                onChangeText={runSearch}
                placeholder="Search people by name or username"
                placeholderTextColor={theme.colors.muted}
                autoCorrect={false}
                autoCapitalize="none"
                style={{
                  flex: 1,
                  marginLeft: 10,
                  color: theme.colors.text,
                  fontWeight: "700",
                }}
              />
              {pickerQuery.length > 0 ? (
                <Pressable onPress={() => runSearch("")} hitSlop={10}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={theme.colors.muted}
                  />
                </Pressable>
              ) : null}
            </View>

            {pickerLoading ? (
              <View style={{ paddingTop: 16, alignItems: "center" }}>
                <ActivityIndicator color={theme.colors.gold} />
              </View>
            ) : (
              <FlatList
                style={{ marginTop: 12 }}
                data={pickerResults}
                keyExtractor={(u) => u.id}
                renderItem={({ item: u }) => {
                  const displayName = u.display_name || "User";
                  const username = u.username ? `@${u.username}` : null;

                  return (
                    <Pressable
                      onPress={() => startDmWith(u)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 10,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.colors.divider,
                      }}
                    >
                      {u.avatar_url ? (
                        <Image
                          source={{ uri: u.avatar_url }}
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 19,
                            marginRight: 12,
                          }}
                        />
                      ) : (
                        <View
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 19,
                            marginRight: 12,
                            backgroundColor: theme.colors.surfaceAlt,
                            borderWidth: 1,
                            borderColor: theme.colors.divider,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: theme.colors.text,
                              fontWeight: "900",
                            }}
                          >
                            {safeInitials(displayName)}
                          </Text>
                        </View>
                      )}

                      <View style={{ flex: 1 }}>
                        <Text
                          style={{ color: theme.colors.text, fontWeight: "900" }}
                          numberOfLines={1}
                        >
                          {displayName}
                        </Text>
                        {username ? (
                          <Text
                            style={{
                              color: theme.colors.muted,
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
                        size={18}
                        color={theme.colors.muted}
                      />
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  pickerQuery.trim() ? (
                    <Text
                      style={{
                        color: theme.colors.muted,
                        marginTop: 14,
                        fontWeight: "700",
                      }}
                    >
                      No users found.
                    </Text>
                  ) : (
                    <Text
                      style={{
                        color: theme.colors.muted,
                        marginTop: 14,
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

      {/* Inbox list */}
      {loading ? (
        <View style={{ paddingTop: 20, alignItems: "center" }}>
          <ActivityIndicator size="large" color={theme.colors.gold} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.conversation_id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.gold}
            />
          }
          ListEmptyComponent={
            <View style={{ paddingTop: 24 }}>
              <Text style={{ color: theme.colors.muted, fontWeight: "700" }}>
                No conversations yet.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const unread = Number(item.unread_count || 0);

            const isDM = item.type === "dm";
            const avatarUrl = isDM ? item?.other_avatar_url : null;
            const initials = safeInitials(titleForRow(item));

            return (
              <Pressable
                onPress={() => openConversation(item.conversation_id)}
                style={{
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.divider,
                  marginBottom: 10,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {/* Avatar */}
                  <View style={{ marginRight: 12 }}>
                    {avatarUrl ? (
                      <Image
                        source={{ uri: avatarUrl }}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          borderWidth: 1,
                          borderColor: theme.colors.divider,
                          backgroundColor: theme.colors.surfaceAlt,
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          borderWidth: 1,
                          borderColor: theme.colors.divider,
                          backgroundColor: theme.colors.surfaceAlt,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                          {initials}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Main content */}
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text
                          style={{
                            color: theme.colors.text,
                            fontWeight: "900",
                            fontSize: 16,
                          }}
                          numberOfLines={1}
                        >
                          {titleForRow(item)}
                        </Text>

                        <Text
                          style={{
                            color: theme.colors.muted,
                            fontWeight: "700",
                            marginTop: 2,
                          }}
                          numberOfLines={1}
                        >
                          {subtitleForRow(item)}
                        </Text>
                      </View>

                      {unread > 0 ? (
                        <View
                          style={{
                            minWidth: 22,
                            paddingHorizontal: 8,
                            height: 22,
                            borderRadius: 999,
                            backgroundColor: theme.colors.gold,
                            alignItems: "center",
                            justifyContent: "center",
                            borderWidth: 1,
                            borderColor: theme.colors.goldOutline,
                          }}
                        >
                          <Text
                            style={{
                              color: theme.colors.text,
                              fontWeight: "900",
                              fontSize: 12,
                            }}
                          >
                            {unread}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Text
                      style={{ color: theme.colors.muted, fontWeight: "700", marginTop: 8 }}
                      numberOfLines={1}
                    >
                      {item.last_message ?? item.last_message_text ?? "No messages yet"}
                    </Text>

                    {item.last_message_at ? (
                      <Text style={{ color: theme.colors.muted, fontSize: 11, marginTop: 6 }}>
                        {new Date(item.last_message_at).toLocaleString()}
                      </Text>
                    ) : null}
                  </View>

                  {/* Chevron */}
                  <View style={{ marginLeft: 10 }}>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}
