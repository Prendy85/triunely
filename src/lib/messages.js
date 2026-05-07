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

  const rows = data ?? [];
  return rows.map((r) => ({
    ...r,
    type: r.type ?? "dm",
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

// ---------- DM helper: resolve "other user" from conversation ----------

/**
 * Resolve the other participant profile for a DM conversation.
 * Schema-tolerant: works whether profile uses username or handle, etc.
 *
 * Returns:
 *  {
 *    id,
 *    display_name,
 *    username,
 *    handle,
 *    avatar_url
 *  }
 */
export async function getOtherMemberProfile(conversationId) {
  if (!conversationId) throw new Error("Missing conversationId");

  const { data: sess } = await supabase.auth.getSession();
  const me = sess?.session?.user?.id;
  if (!me) throw new Error("Not signed in");

  const { data: members, error: memErr } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId);

  if (memErr) throw memErr;

  const otherId = (members || [])
    .map((m) => m.user_id)
    .find((id) => id && id !== me);

  if (!otherId) return null;

  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", otherId)
    .maybeSingle();

  if (profErr) throw profErr;

  if (!prof) return { id: otherId };

  return {
    id: prof.id,
    display_name: prof.display_name || prof.full_name || null,
    username: prof.username || null,
    handle: prof.handle || null,
    avatar_url: prof.avatar_url || prof.photo_url || null,
  };
}

// ---------- Messages ----------

export async function fetchMessages(conversationId, limit = 80) {
  if (!conversationId) throw new Error("Missing conversationId");

  const { data, error } = await supabase
    .from("messages")
    .select(
      "id, conversation_id, sender_id, body, created_at, message_type, audio_url, audio_duration_ms"
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.log("fetchMessages error", {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      conversationId,
      limit,
    });
    throw error;
  }

  const result = (data ?? []).slice().reverse();

  // console.log("fetchMessages success", {
  //   conversationId,
  //   requestedLimit: limit,
  //   returnedCount: result.length,
  //   audioCount: result.filter((m) => m?.message_type === "audio").length,
  //   lastIds: result.slice(-5).map((m) => ({
  //     id: m.id,
  //     type: m.message_type,
  //     hasAudioUrl: !!m.audio_url,
  //     hasBody: m.body != null,
  //   })),
  // });

  return result;
}

export async function sendMessage(conversationId, body) {
  if (!conversationId) throw new Error("Missing conversationId");

  const text = String(body ?? "").trim();
  if (!text) throw new Error("Empty message");

  const { data: sess } = await supabase.auth.getSession();
  const me = sess?.session?.user?.id;
  if (!me) throw new Error("Not signed in");

  // console.log("sendMessage start", {
  //   conversationId,
  //   senderId: me,
  //   length: text.length,
  // });

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: me,
    body: text,
    message_type: "text",
  });

  if (error) {
    console.log("sendMessage insert error", {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      conversationId,
      senderId: me,
    });
    throw error;
  }

  // console.log("sendMessage success", { conversationId, senderId: me });
}

export async function uploadChatAudio({
  conversationId,
  localUri,
  fileExt = "m4a",
}) {
  if (!conversationId) throw new Error("Missing conversationId");
  if (!localUri) throw new Error("Missing localUri");

  const { data: sess } = await supabase.auth.getSession();
  const me = sess?.session?.user?.id;
  if (!me) throw new Error("Not signed in");

  // Unique storage path
  const stamp = Date.now();
  const path = `${me}/${conversationId}/${stamp}.${fileExt}`;

  // console.log("uploadChatAudio start", {
  //   conversationId,
  //   senderId: me,
  //   localUri,
  //   fileExt,
  //   storagePath: path,
  // });

  // RN/Expo-safe local file upload payload
  let arrayBuffer;
  try {
    const fileResponse = await fetch(localUri);
    arrayBuffer = await fileResponse.arrayBuffer();

    // console.log("uploadChatAudio local file read success", {
    //   localUri,
    //   byteLength: arrayBuffer?.byteLength ?? null,
    // });
  } catch (e) {
    console.log("uploadChatAudio local file read error", {
      localUri,
      message: e?.message,
      name: e?.name,
    });
    throw e;
  }

  const ext = String(fileExt).toLowerCase();
  const contentType =
    ext === "mp3"
      ? "audio/mpeg"
      : ext === "aac"
      ? "audio/aac"
      : ext === "wav"
      ? "audio/wav"
      : "audio/mp4"; // m4a commonly uses audio/mp4

  // console.log("uploadChatAudio before storage.upload", {
  //   bucket: "chat-audio",
  //   storagePath: path,
  //   contentType,
  //   byteLength: arrayBuffer?.byteLength ?? null,
  // });

  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from("chat-audio")
    .upload(path, arrayBuffer, {
      contentType,
      upsert: false,
    });

  if (uploadErr) {
    console.log("uploadChatAudio storage.upload error", {
      message: uploadErr?.message,
      details: uploadErr?.details,
      hint: uploadErr?.hint,
      code: uploadErr?.code,
      bucket: "chat-audio",
      storagePath: path,
    });
    throw uploadErr;
  }

  // console.log("uploadChatAudio storage.upload success", {
  //   bucket: "chat-audio",
  //   storagePath: path,
  //   uploadData,
  // });

  return {
    storagePath: path,
  };
}

export async function sendAudioMessage({
  conversationId,
  audioStoragePath,
  durationMs = null,
}) {
  if (!conversationId) throw new Error("Missing conversationId");
  if (!audioStoragePath) throw new Error("Missing audioStoragePath");

  const { data: sess } = await supabase.auth.getSession();
  const me = sess?.session?.user?.id;
  if (!me) throw new Error("Not signed in");

  const payload = {
    conversation_id: conversationId,
    sender_id: me,
    body: null,
    message_type: "audio",
    audio_url: audioStoragePath, // storing storage path
    audio_duration_ms: durationMs,
  };

  // console.log("sendAudioMessage start", {
  //   conversationId,
  //   senderId: me,
  //   audioStoragePath,
  //   durationMs,
  //   payloadPreview: {
  //     ...payload,
  //     body: payload.body, // explicitly showing null
  //   },
  // });

  // NOTE:
  // We use select() here so if insert succeeds, we get the row back (useful for diagnostics).
  // If a trigger/RLS/check fails, Supabase should return a detailed error.
  const { data, error } = await supabase
    .from("messages")
    .insert(payload)
    .select("id, conversation_id, sender_id, message_type, audio_url, audio_duration_ms, body, created_at");

  if (error) {
    console.log("sendAudioMessage insert error", {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      conversationId,
      senderId: me,
      audioStoragePath,
      durationMs,
    });
    throw error;
  }

  // console.log("sendAudioMessage insert success", {
  //   insertedRows: data?.length ?? 0,
  //   row: data?.[0] ?? null,
  // });

  return data?.[0] ?? null;
}

/**
 * Convert stored storage path -> playable URL.
 * Uses signed URL (works for private buckets too).
 */
export async function getChatAudioSignedUrl(audioStoragePath, expiresInSeconds = 3600) {
  if (!audioStoragePath) return null;

  // console.log("getChatAudioSignedUrl start", {
  //   audioStoragePath,
  //   expiresInSeconds,
  // });

  const { data, error } = await supabase.storage
    .from("chat-audio")
    .createSignedUrl(audioStoragePath, expiresInSeconds);

  if (error) {
    console.log("getChatAudioSignedUrl error", {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      audioStoragePath,
    });
    throw error;
  }

  // console.log("getChatAudioSignedUrl success", {
  //   audioStoragePath,
  //   hasSignedUrl: !!data?.signedUrl,
  // });

  return data?.signedUrl || null;
}

// ---------- Delete message (for long-press actions) ----------

/**
 * Delete a message row.
 * RLS should enforce "only sender can delete".
 *
 * Returns the deleted row (if PostgREST returns it), otherwise null.
 * Caller should still treat successful delete + null data as success.
 */
export async function deleteMessage(messageId) {
  if (!messageId) throw new Error("Missing messageId");

  // console.log("deleteMessage start", { messageId });

  const { data, error } = await supabase
    .from("messages")
    .delete()
    .eq("id", messageId)
    .select("id, sender_id, message_type, audio_url");

  if (error) {
    console.log("deleteMessage error", {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      messageId,
    });
    throw error;
  }

  // console.log("deleteMessage result", {
  //   messageId,
  //   deletedCount: Array.isArray(data) ? data.length : null,
  //   deletedRows: data,
  // });

  // If nothing was deleted, treat it as a real failure
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(
      "Message was not deleted in database. Check RLS policy (delete permission) for messages."
    );
  }

  return data[0];
}

/**
 * Optional cleanup: delete uploaded audio file from storage.
 * Safe to call after deleting the DB row.
 */
export async function deleteChatAudioFile(audioStoragePath) {
  if (!audioStoragePath) return;

  // console.log("deleteChatAudioFile start", { audioStoragePath });

  const { data, error } = await supabase.storage
    .from("chat-audio")
    .remove([audioStoragePath]);

  if (error) {
    console.log("deleteChatAudioFile error", {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      audioStoragePath,
    });
    throw error;
  }

  // console.log("deleteChatAudioFile success", {
  //   audioStoragePath,
  //   data,
  // });
}

// ---------- Read tracking ----------

export async function markConversationRead(conversationId) {
  if (!conversationId) throw new Error("Missing conversationId");

  const { error } = await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
  });

  if (error) {
    console.log("markConversationRead error", {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      conversationId,
    });
    throw error;
  }
}