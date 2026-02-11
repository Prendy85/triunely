import { supabase } from "./supabase";

/**
 * Fetch notifications for the signed-in user.
 * - If onlyUnread = true: returns unread only
 * - If churchId provided: filters to one church (optional)
 */
export async function fetchNotifications({
  limit = 50,
  onlyUnread = false,
  churchId = null,
} = {}) {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) throw new Error("Not signed in.");

  let q = supabase
    .from("notifications")
    .select(
      "id, created_at, type, title, body, church_id, membership_id, related_user_id, is_read"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (onlyUnread) q = q.eq("is_read", false);
  if (churchId) q = q.eq("church_id", churchId);

  const { data, error } = await q;
  if (error) throw error;

  return data || [];
}

/** Simple unread count for header badge */
export async function fetchUnreadCount() {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) return 0;

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) throw error;
  return count || 0;
}

/** Mark one notification read */
export async function markNotificationRead(id) {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) throw new Error("Not signed in.");

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);

  if (error) throw error;
}

/** Mark all notifications read */
export async function markAllRead() {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) throw new Error("Not signed in.");

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) throw error;
}

/** Delete one notification (used after Accept/Decline so it disappears) */
export async function deleteNotification(id) {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) throw new Error("Not signed in.");

  const { error } = await supabase.from("notifications").delete().eq("id", id);

  if (error) throw error;
}

/**
 * Fetch profiles for a list of user ids (used for join requests UI)
 */
export async function fetchProfilesByIds(userIds = []) {
  const ids = Array.from(new Set((userIds || []).filter(Boolean)));
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, is_verified")
    .in("id", ids);

  if (error) throw error;
  return data || [];
}

/**
 * Accept/decline a church join request by calling the DB function you created.
 * DB expects p_decision to be: "approve" | "reject"
 * UI can send: accepted/declined or approve/reject etc.
 */
export async function respondToChurchJoinRequest({ item, decision }) {
  const membershipId = item?.membership_id;
  if (!membershipId) throw new Error("Missing membership_id on notification.");

  const raw = String(decision || "").toLowerCase();

  // Map UI values -> DB values
  const mapped =
    raw === "accepted" || raw === "accept" || raw === "approve"
      ? "approve"
      : raw === "declined" || raw === "decline" || raw === "reject"
      ? "reject"
      : null;

  if (!mapped) {
    throw new Error("Decision must be approve or reject");
  }

  const { data, error } = await supabase.rpc("decide_church_membership", {
    p_membership_id: membershipId,
    p_decision: mapped,
  });

  if (error) throw error;
  return data;
}
