// src/lib/realtime.js
import { supabase } from "./supabase";

/**
 * Subscribe to notifications for a user and call `onChange` with { unreadCount }.
 * This keeps badges live across the app.
 */
export function subscribeToNotifications(userId, onChange) {
  if (!userId) return { unsubscribe: () => {} };

  const channel = supabase
    .channel(`rt-notifications-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      async () => {
        // Recompute unread count after any insert/update/delete
        const { data, error } = await supabase
          .from("notifications")
          .select("id,is_read")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (!error) {
          const unreadCount = (data || []).filter((n) => !n.is_read).length;
          onChange?.({ unreadCount });
        }
      }
    )
    .subscribe();

  return {
    unsubscribe: () => supabase.removeChannel(channel),
  };
}

/**
 * Subscribe to fellowship requests (pending follows where you are followed_id).
 * Calls `onChange` with { pendingCount }.
 */
export function subscribeToFellowshipRequests(userId, onChange) {
  if (!userId) return { unsubscribe: () => {} };

  const channel = supabase
    .channel(`rt-follows-pending-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "follows",
        filter: `followed_id=eq.${userId}`,
      },
      async () => {
        const { data, error } = await supabase
          .from("follows")
          .select("id")
          .eq("followed_id", userId)
          .eq("status", "pending");

        if (!error) {
          onChange?.({ pendingCount: (data || []).length });
        }
      }
    )
    .subscribe();

  return {
    unsubscribe: () => supabase.removeChannel(channel),
  };
}

/**
 * Subscribe to feed changes in posts for a community_id.
 * Calls onInsert/onUpdate/onDelete with row payloads.
 */
export function subscribeToCommunityPosts(communityId, { onInsert, onUpdate, onDelete }) {
  if (!communityId) return { unsubscribe: () => {} };

  const channel = supabase
    .channel(`rt-posts-${communityId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "posts", filter: `community_id=eq.${communityId}` },
      (payload) => onInsert?.(payload.new)
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "posts", filter: `community_id=eq.${communityId}` },
      (payload) => onUpdate?.(payload.new)
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "posts", filter: `community_id=eq.${communityId}` },
      (payload) => onDelete?.(payload.old)
    )
    .subscribe();

  return {
    unsubscribe: () => supabase.removeChannel(channel),
  };
}

/**
 * Subscribe to reactions for a list of post ids.
 * Calls `onChange(postId)` so the screen can re-fetch that one post shape.
 */
export function subscribeToPostReactions(postIds, onChange) {
  const ids = Array.from(new Set((postIds || []).filter(Boolean)));
  if (ids.length === 0) return { unsubscribe: () => {} };

  // Supabase realtime filter doesn't support IN directly in the filter string.
  // So we subscribe to table and then ignore irrelevant events client-side.
  const channel = supabase
    .channel(`rt-post-reactions`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "post_reactions" },
      (payload) => {
        const postId = payload?.new?.post_id || payload?.old?.post_id;
        if (postId && ids.includes(postId)) onChange?.(postId);
      }
    )
    .subscribe();

  return {
    unsubscribe: () => supabase.removeChannel(channel),
  };
}

/**
 * Subscribe to comments for a list of post ids.
 * Calls `onChange(postId)` so screen can re-fetch that one post shape.
 */
export function subscribeToPostComments(postIds, onChange) {
  const ids = Array.from(new Set((postIds || []).filter(Boolean)));
  if (ids.length === 0) return { unsubscribe: () => {} };

  const channel = supabase
    .channel(`rt-post-comments`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "post_comments" },
      (payload) => {
        const postId = payload?.new?.post_id || payload?.old?.post_id;
        if (postId && ids.includes(postId)) onChange?.(postId);
      }
    )
    .subscribe();

  return {
    unsubscribe: () => supabase.removeChannel(channel),
  };
}
