// src/screens/ChurchAdminAdmins.js
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";
import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";
import { theme } from "../theme/theme";

const SEARCH_LIMIT = 20;
const DEBOUNCE_MS = 350;

export default function ChurchAdminAdmins({ route, navigation }) {
  const { churchId, churchName } = route?.params || {};

  console.log("ChurchAdminAdmins route params:", route?.params);
console.log("ChurchAdminAdmins churchId:", churchId);

  const [viewerId, setViewerId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState([]); // { user_id, role, created_at, profile? }

  const [search, setSearch] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]); // profiles
  const [savingUserId, setSavingUserId] = useState(null);

  const trimmed = useMemo(() => search.trim(), [search]);
  const searchSeqRef = useRef(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data?.session?.user?.id || null;
      setViewerId(uid);
    })();
  }, []);

  async function loadAdmins() {
    if (!churchId) return;

    try {
      setLoading(true);

      const { data: rows, error } = await supabase
        .from("church_admins")
        .select("user_id, role, created_at")
        .eq("church_id", churchId)
        .order("created_at", { ascending: true });

        console.log("church_admins rows:", rows);
console.log("church_admins error:", error);


      if (error) throw error;

      const adminRows = Array.isArray(rows) ? rows : [];
      const ids = adminRows.map((r) => r.user_id).filter(Boolean);

      let profileById = {};
      if (ids.length > 0) {
        const { data: profs, error: pErr } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, is_verified, is_searchable")
          .in("id", ids);

        if (!pErr && Array.isArray(profs)) {
          profs.forEach((p) => {
            profileById[p.id] = p;
          });
        }
      }

      const merged = adminRows.map((r) => ({
        ...r,
        profile: profileById[r.user_id] || null,
      }));

      setAdmins(merged);
    } catch (e) {
      console.log("ChurchAdminAdmins loadAdmins error:", e);
      Alert.alert("Could not load admins", e?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [churchId]);

  function looksLikeUuid(str) {
    // loose UUID check (good enough for search UX)
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  }

  async function runUserSearch(q) {
    const query = (q || "").trim();

    if (!query) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const mySeq = ++searchSeqRef.current;

    try {
      setSearchLoading(true);

      // Allow searching by:
      // - display_name
      // - id (uuid pasted)
      // Also: only return searchable users (since you have is_searchable)
      let req = supabase
        .from("profiles")
        .select("id, display_name, avatar_url, is_verified, is_searchable")
        .eq("is_searchable", true)
        .limit(SEARCH_LIMIT);

      if (looksLikeUuid(query)) {
        req = req.eq("id", query);
      } else {
        req = req.ilike("display_name", `%${query}%`);
      }

      const { data, error } = await req;
      if (error) throw error;
      if (mySeq !== searchSeqRef.current) return;

      const existingAdminIds = new Set((admins || []).map((a) => a.user_id));
      const cleaned = (Array.isArray(data) ? data : []).filter((p) => !existingAdminIds.has(p.id));

      setSearchResults(cleaned);
    } catch (e) {
      console.log("ChurchAdminAdmins search error:", e);
      if (mySeq !== searchSeqRef.current) return;
      setSearchResults([]);
    } finally {
      if (mySeq !== searchSeqRef.current) return;
      setSearchLoading(false);
    }
  }

  useEffect(() => {
    const q = trimmed;

    if (!q || q.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const t = setTimeout(() => runUserSearch(q), DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed, admins]);

  async function addAdmin(profile) {
    if (!churchId || !profile?.id) return;

    const label = profile.display_name || profile.id?.slice?.(0, 8) || "this user";

    Alert.alert("Add admin", `Make ${label} an admin of this church?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Add",
        style: "default",
        onPress: async () => {
          try {
            setSavingUserId(profile.id);

            const { error } = await supabase.rpc("add_church_admin", {
              target_church_id: churchId,
              target_user_id: profile.id,
              p_role: "admin",
            });

            if (error) throw error;

            setSearch("");
            setSearchResults([]);
            await loadAdmins();
          } catch (e) {
            console.log("addAdmin error:", e);
            Alert.alert("Could not add admin", e?.message || "Please try again.");
          } finally {
            setSavingUserId(null);
          }
        },
      },
    ]);
  }

  async function removeAdmin(adminRow) {
    if (!churchId || !adminRow?.user_id) return;

    if (adminRow.user_id === viewerId) {
      Alert.alert("Not allowed", "You can’t remove yourself here.");
      return;
    }

    const label =
      adminRow.profile?.display_name ||
      adminRow.user_id?.slice?.(0, 8) ||
      "this admin";

    Alert.alert("Remove admin", `Remove ${label} as an admin?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            setSavingUserId(adminRow.user_id);

            const { error } = await supabase.rpc("remove_church_admin", {
              target_church_id: churchId,
              target_user_id: adminRow.user_id,
            });

            if (error) throw error;

            await loadAdmins();
          } catch (e) {
            console.log("removeAdmin error:", e);
            Alert.alert("Could not remove admin", e?.message || "Please try again.");
          } finally {
            setSavingUserId(null);
          }
        },
      },
    ]);
  }

  const headerName = churchName || "Church";

  function Avatar({ url }) {
    if (url) {
      return (
        <Image
          source={{ uri: url }}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.bg }}
        />
      );
    }

    return (
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: theme.colors.bg,
          borderWidth: 1,
          borderColor: theme.colors.divider,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="person-outline" size={18} color={theme.colors.text2} />
      </View>
    );
  }

  function renderAdmin({ item }) {
    const display =
      item.profile?.display_name ||
      (item.user_id ? `User ${item.user_id.slice(0, 8)}` : "User");

    const isSelf = item.user_id === viewerId;

    return (
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.divider,
          borderRadius: 16,
          padding: 14,
          marginBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          opacity: savingUserId && savingUserId !== item.user_id ? 0.6 : 1,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1, paddingRight: 10 }}>
          <Avatar url={item.profile?.avatar_url} />

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }} numberOfLines={1}>
                {display} {isSelf ? "(you)" : ""}
              </Text>

              {item.profile?.is_verified ? (
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.gold} />
              ) : null}
            </View>

            <Text style={{ color: theme.colors.muted, fontWeight: "800", marginTop: 4 }} numberOfLines={1}>
              Role: {item.role || "admin"}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => removeAdmin(item)}
          disabled={isSelf || !!savingUserId}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.divider,
            backgroundColor: theme.colors.bg,
            opacity: isSelf || savingUserId ? 0.5 : 1,
          }}
        >
          {savingUserId === item.user_id ? (
            <ActivityIndicator size="small" color={theme.colors.gold} />
          ) : (
            <Text style={{ fontWeight: "900", color: "tomato" }}>Remove</Text>
          )}
        </Pressable>
      </View>
    );
  }

  function renderSearchRow({ item }) {
    const label = item.display_name || (item.id ? `User ${item.id.slice(0, 8)}` : "User");

    return (
      <Pressable
        onPress={() => addAdmin(item)}
        disabled={!!savingUserId}
        style={{
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.divider,
          borderRadius: 16,
          padding: 14,
          marginBottom: 10,
          opacity: savingUserId ? 0.7 : 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1, paddingRight: 10 }}>
          <Avatar url={item.avatar_url} />

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }} numberOfLines={1}>
                {label}
              </Text>

              {item.is_verified ? (
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.gold} />
              ) : null}
            </View>

            <Text style={{ color: theme.colors.muted, fontWeight: "700", marginTop: 4 }} numberOfLines={1}>
              ID: {item.id.slice(0, 8)}…
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="add-circle-outline" size={20} color={theme.colors.gold} />
          <Ionicons name="chevron-forward" size={18} color={theme.colors.text2} />
        </View>
      </Pressable>
    );
  }

  return (
    <Screen backgroundColor={theme.colors.bg} padded={true} style={{ flex: 1 }}>
      {() => (
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "900" }}>
              Admins — {headerName}
            </Text>

            <Pressable onPress={() => navigation.goBack()} style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
              <Text style={{ color: theme.colors.text2, fontWeight: "900" }}>Close</Text>
            </Pressable>
          </View>

          <Text style={{ color: theme.colors.muted, fontWeight: "700", marginTop: 8, marginBottom: 12 }}>
            Add or remove church administrators.
          </Text>

          {/* Add admin search */}
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.colors.divider,
              borderRadius: 14,
              backgroundColor: theme.colors.surface,
              paddingHorizontal: 12,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons name="search-outline" size={18} color={theme.colors.text2} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by display name or paste user ID"
              placeholderTextColor={theme.input.placeholder}
              style={{ flex: 1, color: theme.colors.text, marginLeft: 10, fontWeight: "700" }}
              returnKeyType="search"
              autoCapitalize="none"
            />
            {searchLoading ? <ActivityIndicator size="small" color={theme.colors.gold} /> : null}
          </View>

          {/* Search Results */}
          {trimmed.length >= 2 ? (
            <View style={{ marginTop: 12 }}>
              <Text style={{ color: theme.colors.text, fontWeight: "900", marginBottom: 8 }}>
                Add admin
              </Text>

              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                renderItem={renderSearchRow}
                ListEmptyComponent={
                  !searchLoading ? (
                    <Text style={{ color: theme.colors.muted, fontWeight: "700", marginTop: 6 }}>
                      No users found.
                    </Text>
                  ) : null
                }
              />
            </View>
          ) : null}

          {/* Admin list */}
          <View style={{ flex: 1, marginTop: 12 }}>
            <Text style={{ color: theme.colors.text, fontWeight: "900", marginBottom: 8 }}>
              Current admins
            </Text>

            {loading ? (
              <View style={{ alignItems: "center", paddingVertical: 18 }}>
                <ActivityIndicator size="small" color={theme.colors.gold} />
                <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Loading admins…</Text>
              </View>
            ) : null}

            <FlatList
              data={admins}
              keyExtractor={(item) => item.user_id}
              renderItem={renderAdmin}
              contentContainerStyle={{ paddingBottom: 24 }}
              ListEmptyComponent={
                !loading ? (
                  <Text style={{ color: theme.colors.muted, fontWeight: "700" }}>
                    No admins found.
                  </Text>
                ) : null
              }
            />
          </View>
        </View>
      )}
    </Screen>
  );
}
