// src/context/RealtimeProvider.js
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { supabase } from "../lib/supabase";

/**
 * Centralizes realtime subscriptions so we don’t duplicate channels across screens.
 *
 * Exposes:
 * - unreadNotificationCount
 * - pendingFellowshipCount
 * - unreadMessageCount
 * - latestBannerNotification
 * - clearLatestBannerNotification()
 * - refreshCounts()
 */
const RealtimeContext = createContext(null);

export function RealtimeProvider({ session, profile, children }) {
  const userId = session?.user?.id ?? null;

  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [pendingFellowshipCount, setPendingFellowshipCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  const [latestBannerNotification, setLatestBannerNotification] = useState(null);

  useEffect(() => {
    if (!userId) {
      setUnreadNotificationCount(0);
      setPendingFellowshipCount(0);
      setUnreadMessageCount(0);
      setLatestBannerNotification(null);
      return;
    }

    let alive = true;

    async function refreshUnreadNotifications() {
      try {
        const { count, error } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_read", false);

        if (!error && alive) setUnreadNotificationCount(count ?? 0);
      } catch (e) {
        console.log("refreshUnreadNotifications exception:", e);
      }
    }

    async function refreshPendingFellowship() {
      try {
        const { count, error } = await supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("followed_id", userId)
          .eq("status", "pending");

        if (!error && alive) setPendingFellowshipCount(count ?? 0);
      } catch (e) {
        console.log("refreshPendingFellowship exception:", e);
      }
    }

    async function refreshUnreadMessages() {
      try {
        const { data, error } = await supabase
          .from("conversation_members")
          .select("unread_count")
          .eq("user_id", userId);

        if (error) {
          console.log("refreshUnreadMessages error:", error);
          return;
        }

        const total = (data || []).reduce(
          (sum, row) => sum + Number(row?.unread_count || 0),
          0
        );

        if (alive) setUnreadMessageCount(total);
      } catch (e) {
        console.log("refreshUnreadMessages exception:", e);
      }
    }

    async function refreshCounts() {
      await Promise.all([
        refreshUnreadNotifications(),
        refreshPendingFellowship(),
        refreshUnreadMessages(),
      ]);
    }

    async function showGroupApprovedBanner(memberRow) {
      try {
        if (!memberRow?.id || !alive) return;

        let groupName = "your church group";

        if (memberRow?.group_id) {
          const { data, error } = await supabase
            .from("church_groups")
            .select("name")
            .eq("id", memberRow.group_id)
            .maybeSingle();

          if (!error && data?.name) {
            groupName = data.name;
          }
        }

        if (!alive) return;

        setLatestBannerNotification({
          id: `church_group_request_approved-${memberRow.id}-${Date.now()}`,
          type: "church_group_request_approved",
          title: "Group request approved",
          body: `Your request to join ${groupName} has been approved.`,
          user_id: userId,
          church_id: memberRow.church_id || null,
          church_group_id: memberRow.group_id || null,
          church_group_member_id: memberRow.id,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      } catch (e) {
        console.log("showGroupApprovedBanner exception:", e);
      }
    }

    refreshCounts();

    const notifChannel = supabase
      .channel(`rt-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          refreshUnreadNotifications();

          if (payload?.eventType === "INSERT" && payload?.new) {
            setLatestBannerNotification(payload.new);
          }
        }
      )
      .subscribe();

    const followsChannel = supabase
      .channel(`rt-follows-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "follows",
          filter: `followed_id=eq.${userId}`,
        },
        () => {
          refreshPendingFellowship();
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel(`rt-conversation-members-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_members",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          refreshUnreadMessages();
        }
      )
      .subscribe();

    // Extra reliability for church group approvals:
    // if the member is sitting on Groups and their membership row changes
    // from pending -> approved, show the approval banner directly.
    const churchGroupMembersChannel = supabase
      .channel(`rt-church-group-members-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "church_group_members",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const oldStatus = String(payload?.old?.status || "").toLowerCase();
          const newStatus = String(payload?.new?.status || "").toLowerCase();

          refreshUnreadNotifications();

          if (oldStatus === "pending" && newStatus === "approved") {
            showGroupApprovedBanner(payload.new);
          }
        }
      )
      .subscribe();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshCounts();
    });

    return () => {
      alive = false;
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(followsChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(churchGroupMembersChannel);
      sub?.remove?.();
    };
  }, [userId]);

  const value = useMemo(
    () => ({
      userId,
      profile,
      unreadNotificationCount,
      pendingFellowshipCount,
      unreadMessageCount,

      latestBannerNotification,
      clearLatestBannerNotification: () => setLatestBannerNotification(null),

      async refreshCounts() {
        if (!userId) return;

        try {
          const [notifRes, followsRes, convoRes] = await Promise.all([
            supabase
              .from("notifications")
              .select("id", { count: "exact", head: true })
              .eq("user_id", userId)
              .eq("is_read", false),

            supabase
              .from("follows")
              .select("id", { count: "exact", head: true })
              .eq("followed_id", userId)
              .eq("status", "pending"),

            supabase
              .from("conversation_members")
              .select("unread_count")
              .eq("user_id", userId),
          ]);

          const nCount = notifRes?.count ?? 0;
          const fCount = followsRes?.count ?? 0;

          if (convoRes?.error) {
            console.log("manual refresh conversation_members error:", convoRes.error);
          }

          const mCount = (convoRes?.data || []).reduce(
            (sum, row) => sum + Number(row?.unread_count || 0),
            0
          );

          setUnreadNotificationCount(nCount);
          setPendingFellowshipCount(fCount);
          setUnreadMessageCount(mCount);
        } catch (e) {
          console.log("manual refreshCounts exception:", e);
        }
      },
    }),
    [
      userId,
      profile,
      unreadNotificationCount,
      pendingFellowshipCount,
      unreadMessageCount,
      latestBannerNotification,
    ]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  return useContext(RealtimeContext);
}