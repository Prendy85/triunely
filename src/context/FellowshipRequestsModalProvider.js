// src/context/FellowshipRequestsModalProvider.js
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    Pressable,
    Text,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

const FellowshipRequestsModalContext = createContext({
  openFellowshipRequests: async () => {},
  closeFellowshipRequests: () => {},
  isOpen: false,
});

export function FellowshipRequestsModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyUserId, setBusyUserId] = useState(null);
  const [requests, setRequests] = useState([]); // [{ userId, displayName, avatarUrl, followRow }]
  const [errorText, setErrorText] = useState("");

  const openInFlightRef = useRef(false);

  const getCurrentUserId = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const uid = data?.session?.user?.id;
    if (!uid) throw new Error("Not signed in");
    return uid;
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setErrorText("");

    try {
      const me = await getCurrentUserId();

      // Incoming fellowship requests: someone (follower_id) requested to follow me (followed_id)
      const { data: followRows, error: followsErr } = await supabase
        .from("follows")
        .select("id, follower_id, followed_id, status, created_at")
        .eq("followed_id", me)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (followsErr) throw followsErr;

      const followerIds = (followRows || []).map((r) => r.follower_id).filter(Boolean);

      if (followerIds.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      // Load requester profiles
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", followerIds);

      if (profErr) throw profErr;

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      const merged = (followRows || []).map((row) => {
        const p = profileMap.get(row.follower_id);
        return {
          userId: row.follower_id,
          displayName: p?.display_name ?? "Unknown",
          avatarUrl: p?.avatar_url ?? null,
          followRow: row,
        };
      });

      setRequests(merged);
    } catch (e) {
      setErrorText(e?.message || "Failed to load requests.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [getCurrentUserId]);

  const openFellowshipRequests = useCallback(async () => {
    // Prevent double-tap races opening twice / loading twice
    if (openInFlightRef.current) return;
    openInFlightRef.current = true;

    try {
      setIsOpen(true);
      await loadRequests();
    } finally {
      openInFlightRef.current = false;
    }
  }, [loadRequests]);

  const closeFellowshipRequests = useCallback(() => {
    setIsOpen(false);
    setBusyUserId(null);
    setErrorText("");
  }, []);

  const insertNotificationSafe = useCallback(async ({ toUserId, actorUserId, type, meta }) => {
    // Optional: don't break if notifications table/columns differ
    try {
      await supabase.from("notifications").insert({
        user_id: toUserId,
        actor_id: actorUserId,
        type,
        meta: meta ?? {},
      });
    } catch (_e) {
      // Swallow on purpose (non-negotiable: do not break existing flows)
    }
  }, []);

  const acceptRequest = useCallback(
    async (requesterUserId) => {
      if (!requesterUserId) return;

      setBusyUserId(requesterUserId);
      try {
        const me = await getCurrentUserId();

        // 1) Update incoming follow row to accepted
        const { error: updErr } = await supabase
          .from("follows")
          .update({ status: "accepted" })
          .eq("follower_id", requesterUserId)
          .eq("followed_id", me)
          .eq("status", "pending");

        if (updErr) throw updErr;

        // 2) Insert or upsert reverse follow row (me -> requester) as accepted
        // NOTE: This assumes a unique constraint on (follower_id, followed_id). If you use a different unique key,
        // you'll adjust onConflict later without touching other logic.
        const { error: upsertErr } = await supabase
          .from("follows")
          .upsert(
            {
              follower_id: me,
              followed_id: requesterUserId,
              status: "accepted",
            },
            { onConflict: "follower_id,followed_id" }
          );

        if (upsertErr) {
          // If upsert fails due to missing constraint, try plain insert (still safe)
          const { error: insErr } = await supabase.from("follows").insert({
            follower_id: me,
            followed_id: requesterUserId,
            status: "accepted",
          });
          if (insErr) throw insErr;
        }

        // 3) Optional notification to requester
        await insertNotificationSafe({
          toUserId: requesterUserId,
          actorUserId: me,
          type: "fellowship_accepted",
          meta: { by: me },
        });

        // Refresh list
        await loadRequests();
      } catch (e) {
        Alert.alert("Couldn’t accept request", e?.message || "Please try again.");
      } finally {
        setBusyUserId(null);
      }
    },
    [getCurrentUserId, insertNotificationSafe, loadRequests]
  );

  const declineRequest = useCallback(
    async (requesterUserId) => {
      if (!requesterUserId) return;

      setBusyUserId(requesterUserId);
      try {
        const me = await getCurrentUserId();

        const { error: updErr } = await supabase
          .from("follows")
          .update({ status: "declined" })
          .eq("follower_id", requesterUserId)
          .eq("followed_id", me)
          .eq("status", "pending");

        if (updErr) throw updErr;

        // Optional notification to requester (safe no-op if schema differs)
        await insertNotificationSafe({
          toUserId: requesterUserId,
          actorUserId: me,
          type: "fellowship_declined",
          meta: { by: me },
        });

        await loadRequests();
      } catch (e) {
        Alert.alert("Couldn’t decline request", e?.message || "Please try again.");
      } finally {
        setBusyUserId(null);
      }
    },
    [getCurrentUserId, insertNotificationSafe, loadRequests]
  );

  const ctxValue = useMemo(
    () => ({
      openFellowshipRequests,
      closeFellowshipRequests,
      isOpen,
    }),
    [openFellowshipRequests, closeFellowshipRequests, isOpen]
  );

  const renderRow = ({ item }) => {
    const isBusy = busyUserId === item.userId;

    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(0,0,0,0.08)",
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            overflow: "hidden",
            backgroundColor: "rgba(0,0,0,0.06)",
            marginRight: 12,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={{ width: 44, height: 44 }} />
          ) : (
            <Text style={{ fontSize: 16, color: "rgba(0,0,0,0.45)" }}>
              {item.displayName?.[0]?.toUpperCase?.() || "?"}
            </Text>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#111" }}>
            {item.displayName}
          </Text>
          <Text style={{ fontSize: 12, color: "rgba(0,0,0,0.55)", marginTop: 2 }}>
            Sent a fellowship request
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            disabled={isBusy}
            onPress={() => acceptRequest(item.userId)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: isBusy ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.10)",
            }}
          >
            {isBusy ? (
              <ActivityIndicator />
            ) : (
              <Text style={{ fontWeight: "700" }}>Accept</Text>
            )}
          </Pressable>

          <Pressable
            disabled={isBusy}
            onPress={() => declineRequest(item.userId)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: "rgba(0,0,0,0.04)",
              borderWidth: 1,
              borderColor: "rgba(0,0,0,0.10)",
            }}
          >
            <Text style={{ fontWeight: "700" }}>Decline</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <FellowshipRequestsModalContext.Provider value={ctxValue}>
      {children}

      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeFellowshipRequests}
      >
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          {/* Header */}
          <View
            style={{
              paddingTop: 14,
              paddingBottom: 12,
              paddingHorizontal: 14,
              borderBottomWidth: 1,
              borderBottomColor: "rgba(0,0,0,0.08)",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#111" }}>
              Fellowship Requests
            </Text>

            <Pressable onPress={closeFellowshipRequests} style={{ padding: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: "800" }}>Close</Text>
            </Pressable>
          </View>

          {/* Body */}
          {loading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="large" />
              <Text style={{ marginTop: 10, color: "rgba(0,0,0,0.6)" }}>
                Loading requests…
              </Text>
            </View>
          ) : errorText ? (
            <View style={{ flex: 1, padding: 16 }}>
              <Text style={{ color: "#B00020", fontWeight: "700" }}>{errorText}</Text>

              <Pressable
                onPress={loadRequests}
                style={{
                  marginTop: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: "rgba(0,0,0,0.10)",
                  alignSelf: "flex-start",
                }}
              >
                <Text style={{ fontWeight: "800" }}>Retry</Text>
              </Pressable>
            </View>
          ) : requests.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#111" }}>
                No pending requests
              </Text>
              <Text style={{ marginTop: 6, color: "rgba(0,0,0,0.6)", textAlign: "center" }}>
                When someone requests fellowship, it will appear here.
              </Text>

              <Pressable
                onPress={loadRequests}
                style={{
                  marginTop: 14,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: "rgba(0,0,0,0.10)",
                }}
              >
                <Text style={{ fontWeight: "800" }}>Refresh</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={requests}
              keyExtractor={(x) => String(x.userId)}
              renderItem={renderRow}
              contentContainerStyle={{ paddingBottom: 24 }}
            />
          )}
        </View>
      </Modal>
    </FellowshipRequestsModalContext.Provider>
  );
}

export function useFellowshipRequestsModal() {
  return useContext(FellowshipRequestsModalContext);
}