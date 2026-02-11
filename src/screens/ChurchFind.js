// src/screens/ChurchFind.js
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";

import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";
import { theme } from "../theme/theme";

const PAGE_LIMIT = 30;
const MIN_CHARS_TO_AUTOFETCH = 2;
const DEBOUNCE_MS = 350;

export default function ChurchFind({ navigation }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const [hasSearched, setHasSearched] = useState(false);
  const searchSeqRef = useRef(0);

  const trimmed = useMemo(() => query.trim(), [query]);

  async function runSearch(text, opts = { silent: false }) {
    const q = (text || "").trim();
    const silent = Boolean(opts?.silent);

    if (!q) {
      setResults([]);
      setLoading(false);
      setHasSearched(false);
      return;
    }

    if (silent && q.length < MIN_CHARS_TO_AUTOFETCH) {
      setResults([]);
      setLoading(false);
      setHasSearched(false);
      return;
    }

    const mySeq = ++searchSeqRef.current;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("churches")
        .select("id, name, display_name, location, is_verified, avatar_url")
        .or(`name.ilike.%${q}%,display_name.ilike.%${q}%,location.ilike.%${q}%`)
        .order("is_verified", { ascending: false })
        .limit(PAGE_LIMIT);

      if (error) throw error;

      if (mySeq !== searchSeqRef.current) return;

      setResults(Array.isArray(data) ? data : []);
      setHasSearched(true);
    } catch (e) {
      console.log("ChurchFind search error:", e);

      if (mySeq !== searchSeqRef.current) return;

      setResults([]);
      setHasSearched(true);

      if (!silent) {
        Alert.alert("Search failed", "We couldn’t search churches right now. Please try again.");
      }
    } finally {
      if (mySeq !== searchSeqRef.current) return;
      setLoading(false);
    }
  }

  useEffect(() => {
    const q = trimmed;

    if (!q) {
      setResults([]);
      setLoading(false);
      setHasSearched(false);
      return;
    }

    if (q.length < MIN_CHARS_TO_AUTOFETCH) {
      setResults([]);
      setLoading(false);
      setHasSearched(false);
      return;
    }

    const t = setTimeout(() => {
      runSearch(q, { silent: true });
    }, DEBOUNCE_MS);

    return () => clearTimeout(t);
  }, [trimmed]);

  function openChurch(church) {
    if (!church?.id) return;

    navigation.navigate("ChurchProfilePublic", {
      churchId: church.id,
      isDefaultTriunelyChurch: false,
    });
  }

  function renderRow({ item }) {
    const title = item.display_name || item.name || "Church";
    const loc = item.location || "";

    return (
      <Pressable
        onPress={() => openChurch(item)}
        style={{
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.divider,
          borderRadius: 16,
          padding: 14,
          marginBottom: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }} numberOfLines={1}>
              {title}
            </Text>

            {loc ? (
              <Text style={{ color: theme.colors.muted, fontWeight: "700", marginTop: 4 }} numberOfLines={1}>
                {loc}
              </Text>
            ) : null}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {item.is_verified ? (
              <Ionicons name="checkmark-circle" size={18} color={theme.colors.gold} />
            ) : null}

            <Ionicons name="chevron-forward" size={18} color={theme.colors.text2} />
          </View>
        </View>
      </Pressable>
    );
  }

  const showNoResults =
    !loading &&
    hasSearched &&
    trimmed.length >= MIN_CHARS_TO_AUTOFETCH &&
    (results || []).length === 0;

  return (
    <Screen backgroundColor={theme.colors.bg} padded={true} style={{ flex: 1 }}>
      {() => (
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "900" }}>
              Find your church
            </Text>

            <Pressable onPress={() => navigation.goBack()} style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
              <Text style={{ color: theme.colors.text2, fontWeight: "900" }}>Close</Text>
            </Pressable>
          </View>

          <Text style={{ color: theme.colors.muted, fontWeight: "700", marginTop: 8, marginBottom: 10 }}>
            Search by church name or location.
          </Text>

          {/* Create church CTA */}
          <View
            style={{
              marginBottom: 12,
              padding: 14,
              borderRadius: 16,
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.divider,
            }}
          >
            <Text style={{ color: theme.colors.text, fontWeight: "900", marginBottom: 6 }}>
              Can’t find your church?
            </Text>

            <Text style={{ color: theme.colors.muted, fontWeight: "600", marginBottom: 12 }}>
              Create a church profile and invite your admins.
            </Text>

            <Pressable
              onPress={() => navigation.navigate("ChurchCreateChurch")}
              style={[theme.button.primary, { borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14 }]}
            >
              <Text style={theme.button.primaryText}>Create your church</Text>
            </Pressable>
          </View>

          {/* Search box */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: theme.colors.divider,
              borderRadius: 14,
              backgroundColor: theme.colors.surface,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <Ionicons name="search-outline" size={18} color={theme.colors.text2} />
            <TextInput
              value={query}
              onChangeText={(t) => setQuery(t)}
              onSubmitEditing={() => runSearch(query, { silent: false })}
              placeholder="e.g. St Mary’s, Southampton"
              placeholderTextColor={theme.input.placeholder}
              style={{ flex: 1, color: theme.colors.text, marginLeft: 10, fontWeight: "700" }}
              returnKeyType="search"
            />
            <Pressable
              onPress={() => runSearch(query, { silent: false })}
              disabled={!trimmed || loading}
              style={{ paddingHorizontal: 10, paddingVertical: 8, opacity: !trimmed || loading ? 0.5 : 1 }}
            >
              <Text style={{ color: theme.colors.gold, fontWeight: "900" }}>Search</Text>
            </Pressable>
          </View>

          {trimmed.length > 0 && trimmed.length < MIN_CHARS_TO_AUTOFETCH ? (
            <Text style={{ color: theme.colors.muted, fontWeight: "700", marginTop: 10 }}>
              Type at least {MIN_CHARS_TO_AUTOFETCH} characters to search.
            </Text>
          ) : null}

          {/* Results */}
          <View style={{ flex: 1, marginTop: 12 }}>
            {loading ? (
              <View style={{ alignItems: "center", paddingVertical: 18 }}>
                <ActivityIndicator size="small" color={theme.colors.gold} />
                <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Searching…</Text>
              </View>
            ) : null}

            {showNoResults ? (
              <Text style={{ color: theme.colors.muted, fontWeight: "700", marginTop: 10 }}>
                No churches found. Try a different name or location.
              </Text>
            ) : null}

            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={renderRow}
              contentContainerStyle={{ paddingBottom: 24 }}
            />
          </View>
        </View>
      )}
    </Screen>
  );
}
