// src/screens/NotificationsScreen.js
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from "react-native";

import {
  deleteNotification,
  fetchNotifications,
  fetchProfilesByIds,
  fetchUnreadCount,
  markAllRead,
  markNotificationRead,
  respondToChurchJoinRequest,
} from "../lib/notifications";

import { theme } from "../theme/theme";

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString();
}

function safeInitials(nameOrEmail) {
  if (!nameOrEmail) return "?";
  const parts = String(nameOrEmail).trim().split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(nameOrEmail).trim()[0]?.toUpperCase() || "?";
}

function getNotificationChurchId(item) {
  return (
    item?.church_id ||
    item?.payload?.church_id ||
    item?.data?.church_id ||
    item?.metadata?.church_id ||
    null
  );
}

function getNotificationChurchName(item) {
  return (
    item?.church_name ||
    item?.payload?.church_name ||
    item?.data?.church_name ||
    item?.metadata?.church_name ||
    "Church"
  );
}

export default function NotificationsScreen() {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [errorText, setErrorText] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [profilesById, setProfilesById] = useState({});
  const [decisionLoadingByNotifId, setDecisionLoadingByNotifId] = useState({});

  const hasUnread = unreadCount > 0;

  const load = useCallback(async () => {
    try {
      setErrorText("");
      setLoading(true);

      const [list, count] = await Promise.all([
        fetchNotifications({ limit: 80 }),
        fetchUnreadCount(),
      ]);

      setItems(list || []);
      setUnreadCount(count || 0);

      const requesterIds = Array.from(
        new Set(
          (list || [])
            .filter(
              (n) =>
                (n.type === "church_join_request" ||
                  n.type === "church_group_join_request") &&
                n.related_user_id
            )
            .map((n) => n.related_user_id)
        )
      );

      if (requesterIds.length > 0) {
        const profiles = await fetchProfilesByIds(requesterIds);
        const map = {};
        for (const p of profiles || []) map[p.id] = p;
        setProfilesById(map);
      } else {
        setProfilesById({});
      }
    } catch (e) {
      setErrorText(e?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const goToUserProfile = useCallback(
    (userId) => {
      if (!userId) return;
      navigation.navigate("UserProfile", { userId });
    },
    [navigation]
  );

  const handleOpenEventInvite = useCallback(
    async (item) => {
      try {
        if (!item?.id) return;

        console.log("EVENT INVITE NOTIFICATION PRESSED:", {
          notificationId: item.id,
          payload: item?.payload,
          eventId: item?.payload?.event_id,
        });

        if (item.is_read === false) {
          await markNotificationRead(item.id);
        }

        const eventId = item?.payload?.event_id;

        if (!eventId) {
          setErrorText("This event invitation is missing its event link.");
          await load();
          return;
        }

        navigation.navigate("EventDetails", {
          eventId,
        });

        await load();
      } catch (e) {
        console.log("handleOpenEventInvite error:", e);
        setErrorText(e?.message || "Failed to open event invitation");
      }
    },
    [navigation, load]
  );

  const handleOpenChurchGroupRequest = useCallback(
    async (item) => {
      try {
        if (!item?.id) return;

        if (item.is_read === false) {
          await markNotificationRead(item.id);
        }

        const churchId = getNotificationChurchId(item);
        const churchName = getNotificationChurchName(item);

        if (!churchId) {
          setErrorText("This group request notification is missing its church link.");
          await load();
          return;
        }

        navigation.navigate("ChurchGroupsAdmin", {
          churchId,
          churchName,
          openRequests: true,
          fromNotification: true,
          notificationId: item.id,
          churchGroupId: item?.church_group_id || item?.payload?.church_group_id || null,
          churchGroupMemberId:
            item?.church_group_member_id || item?.payload?.church_group_member_id || null,
        });

        await load();
      } catch (e) {
        console.log("handleOpenChurchGroupRequest error:", e);
        setErrorText(e?.message || "Failed to open group request");
      }
    },
    [navigation, load]
  );

  const handleAcceptJoin = useCallback(
    async (item) => {
      const notifId = item?.id;
      if (!notifId) return;

      try {
        setErrorText("");
        setDecisionLoadingByNotifId((prev) => ({ ...prev, [notifId]: true }));

        await markNotificationRead(notifId);
        await respondToChurchJoinRequest({ item, decision: "accepted" });

        try {
          await deleteNotification(notifId);
        } catch (e) {
          console.log("deleteNotification blocked/failed (ok):", e?.message || e);
        }

        await load();
      } catch (e) {
        setErrorText(e?.message || "Failed to accept join request");
      } finally {
        setDecisionLoadingByNotifId((prev) => {
          const next = { ...prev };
          delete next[notifId];
          return next;
        });
      }
    },
    [load]
  );

  const handleDeclineJoin = useCallback(
    async (item) => {
      const notifId = item?.id;
      if (!notifId) return;

      try {
        setErrorText("");
        setDecisionLoadingByNotifId((prev) => ({ ...prev, [notifId]: true }));

        await markNotificationRead(notifId);
        await respondToChurchJoinRequest({ item, decision: "declined" });

        try {
          await deleteNotification(notifId);
        } catch (e) {
          console.log("deleteNotification blocked/failed (ok):", e?.message || e);
        }

        await load();
      } catch (e) {
        setErrorText(e?.message || "Failed to decline join request");
      } finally {
        setDecisionLoadingByNotifId((prev) => {
          const next = { ...prev };
          delete next[notifId];
          return next;
        });
      }
    },
    [load]
  );

  const headerRight = useMemo(() => {
    return (
      <Pressable
        onPress={async () => {
          try {
            await markAllRead();
            load();
          } catch (e) {
            setErrorText(e?.message || "Failed to mark all read");
          }
        }}
        style={{ paddingHorizontal: 12, paddingVertical: 8 }}
      >
        <Text style={{ color: theme.colors.gold, fontWeight: "900" }}>
          Mark all read
        </Text>
      </Pressable>
    );
  }, [load]);

  const renderItem = ({ item }) => {
    const time = formatTime(item.created_at);
    const isUnread = item.is_read === false;

    const requester =
      (item.type === "church_join_request" ||
        item.type === "church_group_join_request") &&
      item.related_user_id
        ? profilesById[item.related_user_id]
        : null;

    const requesterName = requester?.display_name || "Triunely user";
    const requesterAvatar = requester?.avatar_url || null;
    const requesterInitials = safeInitials(requesterName);

    if (item.type === "church_join_request") {
      const busy = Boolean(decisionLoadingByNotifId[item.id]);

      return (
        <View
          style={{
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.divider,
            backgroundColor: theme.colors.bg,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons
              name="people-outline"
              size={22}
              color={isUnread ? theme.colors.gold : theme.colors.muted}
            />

            <Pressable
              onPress={async () => {
                try {
                  if (isUnread) await markNotificationRead(item.id);
                  if (item.related_user_id) goToUserProfile(item.related_user_id);
                  await load();
                } catch (e) {
                  setErrorText(e?.message || "Failed to open profile");
                }
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                marginLeft: 10,
                flex: 1,
                opacity: pressed ? 0.7 : 1,
              })}
              hitSlop={8}
            >
              {requesterAvatar ? (
                <Image
                  source={{ uri: requesterAvatar }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    marginRight: 10,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    marginRight: 10,
                    backgroundColor: theme.colors.blue,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "900" }}>
                    {requesterInitials}
                  </Text>
                </View>
              )}

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontWeight: isUnread ? "900" : "800",
                  }}
                  numberOfLines={1}
                >
                  {requesterName}
                </Text>

                <Text
                  style={{ color: theme.colors.muted, marginTop: 2 }}
                  numberOfLines={2}
                >
                  {item.body || "requested to join your church."}
                </Text>

                <Text
                  style={{
                    color: theme.colors.muted,
                    fontSize: 12,
                    marginTop: 6,
                  }}
                >
                  {time}
                </Text>
              </View>
            </Pressable>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginLeft: 10,
              }}
            >
              <Pressable
                disabled={busy}
                onPress={() => handleAcceptJoin(item)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: busy ? theme.colors.surfaceAlt : "#22c55e",
                  marginRight: 8,
                  opacity: busy ? 0.7 : 1,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.text,
                    fontWeight: "900",
                    fontSize: 12,
                  }}
                >
                  {busy ? "…" : "Accept"}
                </Text>
              </Pressable>

              <Pressable
                disabled={busy}
                onPress={() => handleDeclineJoin(item)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: theme.colors.divider,
                  backgroundColor: theme.colors.bg,
                  opacity: busy ? 0.7 : 1,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.text,
                    fontWeight: "900",
                    fontSize: 12,
                  }}
                >
                  Decline
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      );
    }

    if (item.type === "church_group_join_request") {
      return (
        <Pressable
          onPress={() => handleOpenChurchGroupRequest(item)}
          style={({ pressed }) => ({
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.divider,
            backgroundColor: theme.colors.bg,
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons
              name="people-circle-outline"
              size={23}
              color={isUnread ? theme.colors.gold : theme.colors.muted}
            />

            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text
                style={{
                  color: theme.colors.text,
                  fontWeight: isUnread ? "900" : "800",
                }}
                numberOfLines={1}
              >
                {item.title || "New group request"}
              </Text>

              <Text
                style={{ color: theme.colors.muted, marginTop: 3 }}
                numberOfLines={2}
              >
                {item.body || "Someone requested to join a church group."}
              </Text>

              <Text
                style={{
                  color: theme.colors.goldPressed,
                  fontSize: 12,
                  fontWeight: "900",
                  marginTop: 6,
                }}
              >
                Tap to review group requests
              </Text>
            </View>

            <View style={{ alignItems: "flex-end", marginLeft: 10 }}>
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                {time}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={theme.colors.muted}
                style={{ marginTop: 6 }}
              />
            </View>
          </View>
        </Pressable>
      );
    }

    if (item.type === "event_invite") {
      const eventTitle = item?.payload?.event_title || "event";

      return (
        <Pressable
          onPress={() => handleOpenEventInvite(item)}
          style={({ pressed }) => ({
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.divider,
            backgroundColor: theme.colors.bg,
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons
              name="calendar-outline"
              size={22}
              color={isUnread ? theme.colors.gold : theme.colors.muted}
            />

            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text
                style={{
                  color: theme.colors.text,
                  fontWeight: isUnread ? "900" : "800",
                }}
                numberOfLines={1}
              >
                {item.title || "New event invitation"}
              </Text>

              <Text
                style={{ color: theme.colors.muted, marginTop: 3 }}
                numberOfLines={2}
              >
                {item.body || `You have been invited to ${eventTitle}.`}
              </Text>

              <Text
                style={{
                  color: theme.colors.goldPressed,
                  fontSize: 12,
                  fontWeight: "900",
                  marginTop: 6,
                }}
              >
                Tap to view and respond
              </Text>
            </View>

            <View style={{ alignItems: "flex-end", marginLeft: 10 }}>
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                {time}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={theme.colors.muted}
                style={{ marginTop: 6 }}
              />
            </View>
          </View>
        </Pressable>
      );
    }

    return (
      <Pressable
        onPress={async () => {
          try {
            if (isUnread) await markNotificationRead(item.id);
            await load();
          } catch (e) {
            setErrorText(e?.message || "Failed to open notification");
          }
        }}
        style={{
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.divider,
          backgroundColor: theme.colors.bg,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons
            name="notifications-outline"
            size={22}
            color={isUnread ? theme.colors.gold : theme.colors.muted}
          />

          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text
              style={{
                color: theme.colors.text,
                fontWeight: isUnread ? "900" : "800",
              }}
            >
              {item.title || "Notification"}
            </Text>

            {!!item.body && (
              <Text
                style={{ color: theme.colors.muted, marginTop: 3 }}
                numberOfLines={2}
              >
                {item.body}
              </Text>
            )}
          </View>

          <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{time}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View
        style={{
          paddingHorizontal: 14,
          paddingTop: 14,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.divider,
          backgroundColor: theme.colors.bg,
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
              fontSize: 20,
              fontWeight: "900",
            }}
          >
            Notifications
          </Text>

          <Pressable onPress={() => navigation.goBack()} style={{ padding: 8 }}>
            <Ionicons name="close" size={22} color={theme.colors.muted} />
          </Pressable>
        </View>

        <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
          {hasUnread ? `${unreadCount} unread` : "All caught up"}
        </Text>

        <View style={{ marginTop: 10, alignSelf: "flex-start" }}>
          {headerRight}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={theme.colors.gold} />
          <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Loading…</Text>
        </View>
      ) : errorText ? (
        <View style={{ padding: 14 }}>
          <Text style={{ color: "tomato", fontWeight: "900" }}>{errorText}</Text>

          <Pressable
            onPress={load}
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: theme.colors.divider,
              backgroundColor: theme.colors.bg,
            }}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontWeight: "900",
                textAlign: "center",
              }}
            >
              Retry
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => String(x.id)}
          renderItem={renderItem}
          refreshing={loading}
          onRefresh={load}
          ListEmptyComponent={
            <View style={{ padding: 14 }}>
              <Text style={{ color: theme.colors.muted }}>No notifications yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}