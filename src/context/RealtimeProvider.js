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
 * - refreshCounts()  // manual refresh when needed
 */
const RealtimeContext = createContext(null);

export function RealtimeProvider({ session, profile, children }) {
  const userId = session?.user?.id ?? null;

  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [pendingFellowshipCount, setPendingFellowshipCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  // Global in-app banner notification state
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
        // Unified inbox unread count = sum of conversation_members.unread_count for this user
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

    // 1) initial count load
    refreshCounts();

    // 2) realtime: notifications
    // Any change refreshes the bell count.
    // INSERT also triggers the global in-app banner.
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

    // 3) realtime: fellowship requests
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

    // 4) realtime: message unread counts
    // Recount message badge whenever membership rows change (unread_count changes live here)
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

    // 5) hardening: when app comes back to foreground -> recount
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshCounts();
    });

    return () => {
      alive = false;
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(followsChannel);
      supabase.removeChannel(messagesChannel);
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

      // Manual refresh hook (optional use from screens)
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