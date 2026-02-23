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
 * - refreshCounts()  // manual refresh when needed
 */
const RealtimeContext = createContext(null);

export function RealtimeProvider({ session, profile, children }) {
  const userId = session?.user?.id ?? null;

  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [pendingFellowshipCount, setPendingFellowshipCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setUnreadNotificationCount(0);
      setPendingFellowshipCount(0);
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

    async function refreshCounts() {
      await Promise.all([refreshUnreadNotifications(), refreshPendingFellowship()]);
    }

    // 1) initial
    refreshCounts();

    // 2) realtime: on ANY change -> recount
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
        () => {
          refreshUnreadNotifications();
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

    // 3) hardening: when app comes back to foreground -> recount
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshCounts();
    });

    return () => {
      alive = false;
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(followsChannel);
      sub?.remove?.();
    };
  }, [userId]);

  const value = useMemo(
    () => ({
      userId,
      profile,
      unreadNotificationCount,
      pendingFellowshipCount,
      // Manual refresh hook (optional use from screens)
      async refreshCounts() {
        if (!userId) return;
        const [{ count: nCount }, { count: fCount }] = await Promise.all([
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
        ]);

        setUnreadNotificationCount(nCount ?? 0);
        setPendingFellowshipCount(fCount ?? 0);
      },
    }),
    [userId, profile, unreadNotificationCount, pendingFellowshipCount]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
