// src/lib/messages.js
import { supabase } from "./supabase";

/**
 * Option 1 unified messaging API.
 * Backed by tables:
 *  - conversations
 *  - conversation_members
 *  - messages
 *  - profiles
 *
 * RPCs:
 *  - get_or_create_dm_conversation(uuid)
 *  - get_or_create_church_conversation(uuid)
 *  - mark_conversation_read(uuid)
 *  - list_my_inbox(int)
 *
 * DM search support:
 *  - search_users_for_dm(text, int)
 */

// ---------- Inbox ----------

export async function listMyInbox(limit = 50) {
  const { data, error } = await supabase.rpc("list_my_inbox", { p_limit: limit });
  if (error) throw error;

  // Normalize rows a bit for UI safety (do NOT remove fields)
  const rows = data ?? [];
  return rows.map((r) => ({
    ...r,
    // Ensure UI always treats these rows as DMs (Option 1 DM inbox)
    type: r.type ?? "dm",

    // Backward/forward compatibility for last message preview
    last_message: r.last_message ?? r.last_message_text ?? null,
  }));
}

// ---------- Conversation creation ----------

export async function getOrCreateDirectConversation(otherUserId) {
  if (!otherUserId) throw new Error("Missing otherUserId");

  const { data, error } = await supabase.rpc("get_or_create_dm_conversation", {
    other_user_id: otherUserId,
  });

  if (error) throw error;
  return data; // uuid
}

export async function getOrCreateChurchConversation(churchId) {
  if (!churchId) throw new Error("Missing churchId");

  const { data, error } = await supabase.rpc("get_or_create_church_conversation", {
    p_church_id: churchId,
  });

  if (error) throw error;
  return data; // uuid
}

// ---------- User search (DM) ----------

/**
 * Search users to start a DM with.
 * Uses RPC: search_users_for_dm(p_query text, p_limit int default 20)
 * returns:
 *   id uuid, display_name text, username/handle text, avatar_url text
 */
export async function searchUsersForDM(query, limit = 20) {
  const q = String(query ?? "").trim();
  if (!q) return [];

  const { data, error } = await supabase.rpc("search_users_for_dm", {
    p_query: q,
    p_limit: limit,
  });

  if (error) throw error;
  return data ?? [];
}

// ---------- Messages ----------

export async function fetchMessages(conversationId, limit = 80) {
  if (!conversationId) throw new Error("Missing conversationId");

  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })

    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(conversationId, body) {
  if (!conversationId) throw new Error("Missing conversationId");
  const text = String(body ?? "").trim();
  if (!text) throw new Error("Empty message");

  const { data: sess } = await supabase.auth.getSession();
  const me = sess?.session?.user?.id;
  if (!me) throw new Error("Not signed in");

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: me,
    body: text,
  });

  if (error) throw error;
}

// ---------- Read tracking ----------

export async function markConversationRead(conversationId) {
  if (!conversationId) throw new Error("Missing conversationId");

  const { error } = await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
  });

  if (error) throw error;
}
