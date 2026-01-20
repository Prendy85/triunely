// src/screens/GlobalSearch.js
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { GLOBAL_COMMUNITY_ID } from "../lib/constants";
import { supabase } from "../lib/supabase";
import { theme } from "../theme/theme";

const TAB_POSTS = "posts";
const TAB_PEOPLE = "people";
const TAB_CHURCHES = "churches";

function initials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name).trim()[0]?.toUpperCase() || "?";
}

export default function GlobalSearch({ navigation }) {
  const [activeTab, setActiveTab] = useState(TAB_PEOPLE);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const [people, setPeople] = useState([]);
  const [churches, setChurches] = useState([]);
  const [posts, setPosts] = useState([]);

  const debounceRef = useRef(null);

  const trimmed = useMemo(() => q.trim(), [q]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      runSearch(activeTab, trimmed);
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, trimmed]);

  async function runSearch(tab, query) {
    setLoading(true);
    try {
      if (tab === TAB_PEOPLE) {
        const { data, error } = await supabase.rpc("search_people", {
          q: query,
          lim: 25,
        });
        if (error) throw error;
        setPeople(data || []);
        return;
      }

      if (tab === TAB_CHURCHES) {
        const { data, error } = await supabase.rpc("search_churches", {
          q: query,
          lim: 25,
        });
        if (error) throw error;
        setChurches(data || []);
        return;
      }

      // Posts (optional but useful): simple ilike search
      if (!GLOBAL_COMMUNITY_ID) {
        setPosts([]);
        return;
      }

      if (!query) {
        setPosts([]);
        return;
      }

      const { data, error } = await supabase
        .from("posts")
        .select("id, user_id, church_id, content, created_at")
        .eq("community_id", GLOBAL_COMMUNITY_ID)
        .eq("visibility", "global")
        .ilike("content", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(25);

      if (error) throw error;
      setPosts(data || []);
    } catch (e) {
      console.log("GlobalSearch error:", e);
      // Keep silent; UI will just show empty state.
      if (activeTab === TAB_PEOPLE) setPeople([]);
      if (activeTab === TAB_CHURCHES) setChurches([]);
      if (activeTab === TAB_POSTS) setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  function TabButton({ id, label, icon }) {
    const active = activeTab === id;
    return (
      <Pressable
        onPress={() => setActiveTab(id)}
        style={{
          flex: 1,
          paddingVertical: 10,
          borderRadius: 999,
          alignItems: "center",
          backgroundColor: active ? theme.colors.gold : "transparent",
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <Ionicons
          name={icon}
          size={16}
          color={active ? theme.colors.text : theme.colors.text2}
        />
        <Text
          style={{
            color: active ? theme.colors.text : theme.colors.text2,
            fontWeight: "900",
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  function Row({ title, subtitle, avatarUrl, onPress, verified }) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 12,
          paddingHorizontal: 12,
          backgroundColor: pressed ? theme.colors.surfaceAlt : theme.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.divider,
        })}
      >
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              marginRight: 12,
              backgroundColor: theme.colors.surfaceAlt,
            }}
          />
        ) : (
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              marginRight: 12,
              backgroundColor: theme.colors.surfaceAlt,
              borderWidth: 1,
              borderColor: theme.colors.divider,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: theme.colors.text2, fontWeight: "900" }}>
              {initials(title)}
            </Text>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text
              style={{ color: theme.colors.text, fontWeight: "900" }}
              numberOfLines={1}
            >
              {title}
            </Text>
            {verified ? (
              <Ionicons name="checkmark-circle" size={16} color={theme.colors.gold} />
            ) : null}
          </View>

          {subtitle ? (
            <Text style={{ color: theme.colors.muted, marginTop: 2 }} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <Ionicons name="chevron-forward" size={18} color={theme.colors.text2} />
      </Pressable>
    );
  }

  const data = activeTab === TAB_PEOPLE ? people : activeTab === TAB_CHURCHES ? churches : posts;

  return (
    <Screen backgroundColor={theme.colors.bg} padded={false} style={{ flex: 1 }}>
      {({ bottomPad, topPad }) => (
        <View style={{ flex: 1, paddingTop: topPad }}>
          {/* Header */}
          <View
            style={{
              paddingHorizontal: 14,
              paddingTop: 10,
              paddingBottom: 10,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.divider,
              backgroundColor: theme.colors.bg,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={theme.text.h1}>Search</Text>

              <Pressable
                onPress={() => navigation.goBack()}
                hitSlop={10}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.divider,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="close" size={20} color={theme.colors.text2} />
              </Pressable>
            </View>

            {/* Input */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginTop: 12,
                backgroundColor: theme.colors.surface,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: theme.colors.divider,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <Ionicons name="search" size={18} color={theme.colors.sage} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Search people, churches, posts…"
                placeholderTextColor={theme.colors.muted}
                style={{ flex: 1, color: theme.colors.text, fontWeight: "700" }}
                autoFocus
              />
              {q ? (
                <Pressable onPress={() => setQ("")} hitSlop={10}>
                  <Ionicons name="close-circle" size={18} color={theme.colors.text2} />
                </Pressable>
              ) : null}
            </View>

            {/* Tabs */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: theme.colors.surfaceAlt,
                borderRadius: 999,
                padding: 4,
                marginTop: 12,
                borderWidth: 1,
                borderColor: theme.colors.divider,
              }}
            >
              <TabButton id={TAB_PEOPLE} label="People" icon="person-outline" />
              <TabButton id={TAB_CHURCHES} label="Churches" icon="home-outline" />
              <TabButton id={TAB_POSTS} label="Posts" icon="newspaper-outline" />
            </View>
          </View>

          {/* Results */}
          {loading ? (
            <View style={{ paddingVertical: 18, alignItems: "center" }}>
              <ActivityIndicator size="small" color={theme.colors.gold} />
              <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Searching…</Text>
            </View>
          ) : (
            <FlatList
              data={data}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{
                paddingBottom: bottomPad + 16,
                backgroundColor: theme.colors.bg,
              }}
              renderItem={({ item }) => {
                if (activeTab === TAB_PEOPLE) {
                  return (
                    <Row
                      title={item.display_name || "Member on Triunely"}
                      subtitle="View profile"
                      avatarUrl={item.avatar_url || null}
                      onPress={() => navigation.navigate("UserProfile", { userId: item.id })}
                    />
                  );
                }

                if (activeTab === TAB_CHURCHES) {
                  const title = item.display_name || item.name || "Church";
                  const sub = item.location ? `Location: ${item.location}` : "View church";
                  return (
                    <Row
                      title={title}
                      subtitle={sub}
                      avatarUrl={item.avatar_url || null}
                      verified={!!item.is_verified}
                      onPress={() => navigation.navigate("ChurchProfilePublic", { churchId: item.id })}
                    />
                  );
                }

                // Posts
                const preview = item.content ? item.content : "(Media post)";
                return (
                  <Row
                    title={preview}
                    subtitle={new Date(item.created_at).toLocaleString()}
                    avatarUrl={null}
                    onPress={() => {
                      // optional: navigate to a Post detail screen later
                      navigation.goBack();
                    }}
                  />
                );
              }}
              ListEmptyComponent={
                <Text style={{ color: theme.colors.muted, textAlign: "center", padding: 16 }}>
                  {trimmed ? "No matches." : "Start typing to search."}
                </Text>
              }
            />
          )}
        </View>
      )}
    </Screen>
  );
}
