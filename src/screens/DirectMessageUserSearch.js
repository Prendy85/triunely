// src/screens/DirectMessageUserSearch.js
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";
import Screen from "../components/Screen";
import { getOrCreateDirectConversation, searchUsersForDM } from "../lib/messages";
import { theme } from "../theme/theme";

function safeInitials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name).trim()[0]?.toUpperCase() || "?";
}

export default function DirectMessageUserSearch({ navigation }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [errorText, setErrorText] = useState("");

  const q = useMemo(() => String(query ?? "").trim(), [query]);

  const runSearch = useCallback(async () => {
    try {
      setErrorText("");
      setLoading(true);
      const data = await searchUsersForDM(q, 20);
      setRows(data);
    } catch (e) {
      console.log("DM user search error", e);
      setRows([]);
      setErrorText("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [q]);

  // Lightweight debounce (no extra deps)
  useEffect(() => {
    const t = setTimeout(() => {
      runSearch();
    }, 250);
    return () => clearTimeout(t);
  }, [runSearch]);

  async function openChatWith(userId) {
    try {
      setLoading(true);
      const conversationId = await getOrCreateDirectConversation(userId);
      navigation.navigate("Chat", { conversationId });
    } catch (e) {
      console.log("openChatWith error", e);
      setErrorText("Could not start chat. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen backgroundColor={theme.colors.bg} padded={false} style={{ flex: 1 }} contentStyle={{ flex: 1 }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.text2} />
        </Pressable>

        <Text style={theme.text.h1}>New message</Text>

        <View style={{ width: 38, height: 38 }} />
      </View>

      {/* Search box */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.colors.divider,
            backgroundColor: theme.colors.surface,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Ionicons name="search" size={18} color={theme.colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name or @handle"
            placeholderTextColor={theme.colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              flex: 1,
              marginLeft: 10,
              color: theme.colors.text,
              fontWeight: "700",
            }}
          />
          {loading ? <ActivityIndicator size="small" color={theme.colors.gold} /> : null}
        </View>

        {errorText ? (
          <Text style={{ color: theme.colors.muted, marginTop: 8, fontWeight: "700" }}>
            {errorText}
          </Text>
        ) : null}
      </View>

      {/* Results */}
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        ListEmptyComponent={
          loading ? null : (
            <View style={{ paddingTop: 24 }}>
              <Text style={{ color: theme.colors.muted, fontWeight: "700" }}>
                No users found.
              </Text>
              <Text style={{ color: theme.colors.muted, marginTop: 6 }}>
                Try searching a name or an @handle.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const name = item.display_name || "User";
          const initials = safeInitials(name);
          const handle = item.handle ? `@${item.handle}` : null;

          return (
            <Pressable
              onPress={() => openChatWith(item.id)}
              style={{
                padding: 12,
                borderRadius: 16,
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.divider,
                marginBottom: 10,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              {item.avatar_url ? (
                <Image
                  source={{ uri: item.avatar_url }}
                  style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }}
                />
              ) : (
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    marginRight: 12,
                    backgroundColor: theme.colors.blue,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "900" }}>{initials}</Text>
                </View>
              )}

              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontWeight: "900" }} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={{ color: theme.colors.muted, fontWeight: "700", marginTop: 2 }} numberOfLines={1}>
                  {handle || "No @handle yet"}
                </Text>
              </View>

              <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.colors.muted} />
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}
