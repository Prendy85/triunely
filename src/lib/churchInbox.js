// src/lib/churchInbox.js
import { supabase } from "./supabase";

/**
 * Calls:
 *   public.send_church_inbox_message(p_church_id uuid, p_sender_id uuid, p_body text)
 *
 * Returns:
 *   out_thread_id uuid
 *   out_inbox_type text  ('member' | 'non_member')
 *   out_user_message_id uuid
 *   out_auto_message_id uuid (nullable)
 */
export async function sendChurchInboxMessage({ churchId, senderId, body }) {
  if (!churchId) throw new Error("sendChurchInboxMessage: missing churchId");
  if (!senderId) throw new Error("sendChurchInboxMessage: missing senderId");
  if (!body || !body.trim()) throw new Error("sendChurchInboxMessage: empty body");

  const { data, error } = await supabase.rpc("send_church_inbox_message", {
    p_church_id: churchId,
    p_sender_id: senderId,
    p_body: body.trim(),
  });

  if (error) {
    console.log("send_church_inbox_message error", error);
    throw new Error(error.message || "Failed to send message");
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.out_thread_id) throw new Error("send_church_inbox_message returned no out_thread_id");
  return row;
}

/**
 * User-side: fetch messages for a thread (chronological).
 * Uses direct table select (assumes RLS allows for thread members).
 */
export async function fetchThreadMessages(threadId) {
  if (!threadId) throw new Error("fetchThreadMessages: missing threadId");

  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, thread_id, sender_id, body, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    console.log("fetchThreadMessages error", error);
    throw new Error(error.message || "Failed to fetch messages");
  }

  return data ?? [];
}

/**
 * Admin-side: list threads for a church inbox tab (member / non_member).
 * Calls SECURITY DEFINER function:
 *   public.get_church_inbox_threads(p_church_id uuid, p_inbox_type text)
 */
export async function fetchChurchInboxThreads({ churchId, inboxType }) {
  if (!churchId) throw new Error("fetchChurchInboxThreads: missing churchId");
  if (!inboxType) throw new Error("fetchChurchInboxThreads: missing inboxType");

  const { data, error } = await supabase.rpc("get_church_inbox_threads", {
    p_church_id: churchId,
    p_inbox_type: inboxType,
  });

  if (error) {
    console.log("get_church_inbox_threads error", error);
    throw new Error(error.message || "Failed to load inbox threads");
  }

  return data ?? [];
}

/**
 * Admin-side: fetch messages in a thread (SECURITY DEFINER).
 *   public.get_church_thread_messages(p_church_id uuid, p_thread_id uuid)
 */
export async function fetchAdminThreadMessages({ churchId, threadId }) {
  if (!churchId) throw new Error("fetchAdminThreadMessages: missing churchId");
  if (!threadId) throw new Error("fetchAdminThreadMessages: missing threadId");

  const { data, error } = await supabase.rpc("get_church_thread_messages", {
    p_church_id: churchId,
    p_thread_id: threadId,
  });

  if (error) {
    console.log("get_church_thread_messages error", error);
    throw new Error(error.message || "Failed to load thread messages");
  }

  return data ?? [];
}

/**
 * Admin-side: send reply (SECURITY DEFINER).
 *   public.send_church_admin_reply(p_church_id uuid, p_thread_id uuid, p_body text)
 */
export async function sendChurchAdminReply({ churchId, threadId, body }) {
  if (!churchId) throw new Error("sendChurchAdminReply: missing churchId");
  if (!threadId) throw new Error("sendChurchAdminReply: missing threadId");
  if (!body || !body.trim()) throw new Error("sendChurchAdminReply: empty body");

  const { data, error } = await supabase.rpc("send_church_admin_reply", {
    p_church_id: churchId,
    p_thread_id: threadId,
    p_body: body.trim(),
  });

  if (error) {
    console.log("send_church_admin_reply error", error);
    throw new Error(error.message || "Failed to send reply");
  }

  const row = Array.isArray(data) ? data[0] : data;
  return row;
}
