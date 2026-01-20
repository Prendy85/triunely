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
  const [viewerId, setViewerId] = useState(null);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [saving, setSaving] = useState(false);

  // New: track whether we have actually performed a search (so "No churches found" doesn’t appear too early)
  const [hasSearched, setHasSearched] = useState(false);

  // New: protect against out-of-order responses when typing quickly
  const searchSeqRef = useRef(0);

  const trimmed = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data?.session?.user?.id || null;
      setViewerId(uid);
    })();
  }, []);

  async function runSearch(text, opts = { silent: false }) {
    const q = (text || "").trim();
    const silent = Boolean(opts?.silent);

    // If user cleared input:
    if (!q) {
      setResults([]);
      setLoading(false);
      setHasSearched(false);
      return;
    }

    // For auto-search we enforce a minimum length
    if (silent && q.length < MIN_CHARS_TO_AUTOFETCH) {
      setResults([]);
      setLoading(false);
      setHasSearched(false);
      return;
    }

    const mySeq = ++searchSeqRef.current;

    try {
      setLoading(true);

      // Basic search: case-insensitive match against name/display_name/location
      const { data, error } = await supabase
        .from("churches")
        .select("id, name, display_name, location, is_verified, avatar_url")
        .or(`name.ilike.%${q}%,display_name.ilike.%${q}%,location.ilike.%${q}%`)
        .order("is_verified", { ascending: false })
        .limit(PAGE_LIMIT);

      if (error) throw error;

      // Ignore stale results if a newer search has been started
      if (mySeq !== searchSeqRef.current) return;

      setResults(Array.isArray(data) ? data : []);
      setHasSearched(true);
    } catch (e) {
      console.log("ChurchFind search error:", e);

      // Ignore stale errors if a newer search has been started
      if (mySeq !== searchSeqRef.current) return;

      setResults([]);
      setHasSearched(true);

      // Silent searches (typing) should not spam alerts
      if (!silent) {
        Alert.alert("Search failed", "We couldn’t search churches right now. Please try again.");
      }
    } finally {
      // Ignore stale finishes if a newer search has been started
      if (mySeq !== searchSeqRef.current) return;
      setLoading(false);
    }
  }

  // New: Debounced auto-search as user types
  useEffect(() => {
    const q = trimmed;

    // If empty, reset
    if (!q) {
      setResults([]);
      setLoading(false);
      setHasSearched(false);
      return;
    }

    // If not enough chars, don’t search yet
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

  async function setAsMyChurch(church) {
    if (!viewerId) {
      Alert.alert("Not signed in", "Please sign in again.");
      return;
    }

    try {
      setSaving(true);

      // 1) Mark all existing memberships as not primary (best effort)
      // NOTE: If you don't have is_primary column, this will fail safely and we still insert membership.
      try {
        await supabase
          .from("church_memberships")
          .update({ is_primary: false })
          .eq("user_id", viewerId);
      } catch (e) {
        // ignore
      }

      // 2) Upsert membership row for selected church
      // If you have a unique constraint on (user_id, church_id), upsert will work cleanly.
      // If you do NOT, insert will work but could duplicate rows; we'll handle that later if needed.
      const { error: insErr } = await supabase
        .from("church_memberships")
        .upsert(
          {
            user_id: viewerId,
            church_id: church.id,
            is_primary: true,
          },
          { onConflict: "user_id,church_id" }
        );

      if (insErr) {
        // Fallback to insert if onConflict isn't supported by your schema
        const { error: fallbackErr } = await supabase.from("church_memberships").insert({
          user_id: viewerId,
          church_id: church.id,
          is_primary: true,
        });

        if (fallbackErr) throw fallbackErr;
      }

      // 3) Optionally also set profiles.church_id (fast routing)
      try {
        await supabase.from("profiles").update({ church_id: church.id }).eq("id", viewerId);
      } catch (e) {
        // ignore if column doesn't exist yet
      }

      // 4) Navigate to selected church profile
      navigation.replace("ChurchProfilePublic", {
        churchId: church.id,
        isDefaultTriunelyChurch: false,
      });
    } catch (e) {
      console.log("setAsMyChurch error:", e);
      Alert.alert("Could not set church", e?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function renderRow({ item }) {
    const title = item.display_name || item.name || "Church";
    const loc = item.location || "";

    return (
      <Pressable
        onPress={() => setAsMyChurch(item)}
        disabled={saving}
        style={{
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.divider,
          borderRadius: 16,
          padding: 14,
          marginBottom: 10,
          opacity: saving ? 0.7 : 1,
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
              onChangeText={(t) => {
                setQuery(t);
              }}
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

          {/* Helper hint (optional but useful UX) */}
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

          {/* Saving overlay */}
          {saving ? (
            <View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                paddingVertical: 14,
                alignItems: "center",
                backgroundColor: "rgba(0,0,0,0.35)",
                borderRadius: 16,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900" }}>Setting your church…</Text>
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}
