// src/features/events/services/eventsService.js
import { supabase } from "../../../lib/supabase";

export async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.log("getCurrentUserId error:", error);
    return null;
  }

  return data?.user?.id ?? null;
}

export async function fetchUpcomingEvents({ limit = 20 } = {}) {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("events")
    .select(
      `
      id,
      created_by,
      church_id,
      title,
      description,
      start_at,
      end_at,
      location_name,
      location_address,
      online_url,
      image_url,
      visibility,
      status,
      capacity,
      created_at,
      event_attendees (
        user_id,
        status
      ),
      event_invites (
        invited_user_id,
        status
      ),
      churches:church_id (
        id,
        name,
        display_name,
        avatar_url,
        is_verified
      )
    `
    )
    .gte("start_at", nowIso)
    .in("status", ["published", "cancelled"])
    .order("start_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.log("fetchUpcomingEvents error:", error);
    return { ok: false, error: error.message, events: [] };
  }

  return {
    ok: true,
    events: data || [],
  };
}

export async function fetchMyEvents({ userId, limit = 50 } = {}) {
  if (!userId) {
    return { ok: false, error: "Missing userId", events: [] };
  }

  const nowIso = new Date().toISOString();

  try {
    // 1) Events created by this user
    const { data: createdEvents, error: createdErr } = await supabase
      .from("events")
      .select(
        `
        id,
        created_by,
        church_id,
        title,
        description,
        start_at,
        end_at,
        location_name,
        location_address,
        online_url,
        image_url,
        visibility,
        status,
        capacity,
        created_at,
        event_attendees (
          user_id,
          status
        ),
        event_invites (
          invited_user_id,
          status
        ),
        churches:church_id (
          id,
          name,
          display_name,
          avatar_url,
          is_verified
        )
      `
      )
      .eq("created_by", userId)
      .gte("start_at", nowIso)
      .in("status", ["published", "cancelled"])
      .order("start_at", { ascending: true })
      .limit(limit);

    if (createdErr) throw createdErr;

    // 2) Event IDs where this user is going/maybe
    const { data: attendeeRows, error: attendeeErr } = await supabase
      .from("event_attendees")
      .select("event_id")
      .eq("user_id", userId)
      .in("status", ["going", "maybe"]);

    if (attendeeErr) throw attendeeErr;

    // 3) Event IDs where this user is invited
    const { data: inviteRows, error: inviteErr } = await supabase
      .from("event_invites")
      .select("event_id")
      .eq("invited_user_id", userId)
      .in("status", ["pending", "accepted", "going", "maybe"]);

    if (inviteErr) throw inviteErr;

    const relatedEventIds = Array.from(
      new Set([
        ...(attendeeRows || []).map((r) => r.event_id).filter(Boolean),
        ...(inviteRows || []).map((r) => r.event_id).filter(Boolean),
      ])
    );

    let relatedEvents = [];

    if (relatedEventIds.length > 0) {
      const { data, error } = await supabase
        .from("events")
        .select(
          `
          id,
          created_by,
          church_id,
          title,
          description,
          start_at,
          end_at,
          location_name,
          location_address,
          online_url,
          image_url,
          visibility,
          status,
          capacity,
          created_at,
          event_attendees (
            user_id,
            status
          ),
          event_invites (
            invited_user_id,
            status
          ),
          churches:church_id (
            id,
            name,
            display_name,
            avatar_url,
            is_verified
          )
        `
        )
        .in("id", relatedEventIds)
        .gte("start_at", nowIso)
        .in("status", ["published", "cancelled"])
        .order("start_at", { ascending: true })
        .limit(limit);

      if (error) throw error;
      relatedEvents = data || [];
    }

    const mergedById = new Map();

    for (const e of createdEvents || []) {
      if (e?.id) mergedById.set(e.id, e);
    }

    for (const e of relatedEvents || []) {
      if (e?.id) mergedById.set(e.id, e);
    }

    const events = Array.from(mergedById.values())
      .sort((a, b) => new Date(a.start_at) - new Date(b.start_at))
      .slice(0, limit);

    return {
      ok: true,
      events,
    };
  } catch (e) {
    console.log("fetchMyEvents error:", e);
    return {
      ok: false,
      error: e?.message || "Could not load profile events.",
      events: [],
    };
  }
}

export async function fetchEventById(eventId) {
  if (!eventId) {
    return { ok: false, error: "Missing eventId", event: null };
  }

  const { data, error } = await supabase
    .from("events")
    .select(
      `
      id,
      created_by,
      church_id,
      title,
      description,
      start_at,
      end_at,
      location_name,
      location_address,
      online_url,
      image_url,
      visibility,
      status,
      capacity,
      created_at,
      event_attendees (
        user_id,
        status,
        profiles:user_id (
          id,
          display_name,
          avatar_url
        )
      ),
      event_invites (
        invited_user_id,
        status,
        profiles:invited_user_id (
          id,
          display_name,
          avatar_url
        )
      ),
      churches:church_id (
        id,
        name,
        display_name,
        avatar_url,
        is_verified
      )
    `
    )
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    console.log("fetchEventById error:", error);
    return { ok: false, error: error.message, event: null };
  }

  return {
    ok: true,
    event: data || null,
  };
}

export async function createEvent({
  title,
  description,
  startAt,
  endAt,
  locationName,
  locationAddress,
  onlineUrl,
  imageUrl = null,
  visibility = "public",
  churchId = null,
  capacity = null,
}) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return { ok: false, error: "Not signed in", event: null };
  }

  const cleanTitle = String(title || "").trim();

  if (!cleanTitle) {
    return { ok: false, error: "Event title is required", event: null };
  }

  if (!startAt) {
    return {
      ok: false,
      error: "Event start date/time is required",
      event: null,
    };
  }

  const payload = {
    created_by: userId,
    church_id: churchId || null,
    title: cleanTitle,
    description: description ? String(description).trim() : null,
    start_at: startAt,
    end_at: endAt || null,
    location_name: locationName ? String(locationName).trim() : null,
    location_address: locationAddress ? String(locationAddress).trim() : null,
    online_url: onlineUrl ? String(onlineUrl).trim() : null,
    image_url: imageUrl ? String(imageUrl).trim() : null,
    visibility,
    status: "published",
    capacity: capacity ? Number(capacity) : null,
  };

  const { data, error } = await supabase.rpc("create_event_rpc", {
    p_title: payload.title,
    p_description: payload.description,
    p_start_at: payload.start_at,
    p_end_at: payload.end_at,
    p_location_name: payload.location_name,
    p_location_address: payload.location_address,
    p_online_url: payload.online_url,
    p_visibility: payload.visibility,
    p_church_id: payload.church_id,
    p_capacity: payload.capacity,
    p_image_url: payload.image_url,
  });

  if (error) {
    console.log("createEvent rpc error:", error);
    return { ok: false, error: error.message, event: null };
  }

  return {
    ok: true,
    event: data,
  };
}

export async function rsvpToEvent({ eventId, status = "going" }) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return { ok: false, error: "Not signed in" };
  }

  if (!eventId) {
    return { ok: false, error: "Missing eventId" };
  }

  const { error } = await supabase.from("event_attendees").upsert(
    {
      event_id: eventId,
      user_id: userId,
      status,
    },
    { onConflict: "event_id,user_id" }
  );

  if (error) {
    console.log("rsvpToEvent error:", error);
    return { ok: false, error: error.message };
  }

  // If user was invited, keep invite status in sync where possible.
  await supabase
    .from("event_invites")
    .update({ status: status === "going" ? "accepted" : status })
    .eq("event_id", eventId)
    .eq("invited_user_id", userId);

  return { ok: true };
}

export async function leaveEvent(eventId) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return { ok: false, error: "Not signed in" };
  }

  if (!eventId) {
    return { ok: false, error: "Missing eventId" };
  }

  const { error } = await supabase
    .from("event_attendees")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (error) {
    console.log("leaveEvent error:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function inviteUsersToEvent({ eventId, userIds }) {
  const invitedBy = await getCurrentUserId();

  if (!invitedBy) {
    return { ok: false, error: "Not signed in" };
  }

  if (!eventId) {
    return { ok: false, error: "Missing eventId" };
  }

  const cleanUserIds = Array.from(new Set((userIds || []).filter(Boolean)));

  if (cleanUserIds.length === 0) {
    return { ok: false, error: "No users selected" };
  }

  const rows = cleanUserIds.map((id) => ({
    event_id: eventId,
    invited_user_id: id,
    invited_by: invitedBy,
    status: "pending",
  }));

  const { error } = await supabase
    .from("event_invites")
    .upsert(rows, { onConflict: "event_id,invited_user_id" });

  if (error) {
    console.log("inviteUsersToEvent error:", error);
    return { ok: false, error: error.message };
  }

    // Create notifications through secure RPC.
  // Non-blocking: if notification creation fails, the invite still counts as sent.
  try {
    const { data: notificationCount, error: notifErr } = await supabase.rpc(
      "create_event_invite_notifications",
      {
        p_event_id: eventId,
        p_invited_user_ids: cleanUserIds,
      }
    );

    if (notifErr) {
      console.log("inviteUsersToEvent notification rpc error:", notifErr);
    } else {
      console.log("EVENT INVITE NOTIFICATIONS CREATED:", notificationCount);
    }
  } catch (e) {
    console.log("inviteUsersToEvent notification rpc exception:", e);
  }

  return { ok: true };
}

export async function updateEventVisibility({ eventId, visibility }) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return { ok: false, error: "Not signed in" };
  }

  if (!eventId) {
    return { ok: false, error: "Missing eventId" };
  }

  if (!["public", "invite_only", "church"].includes(visibility)) {
    return { ok: false, error: "Invalid visibility value" };
  }

  const { data, error } = await supabase
    .from("events")
    .update({ visibility })
    .eq("id", eventId)
    .select(
      `
      id,
      created_by,
      church_id,
      title,
      description,
      start_at,
      end_at,
      location_name,
      location_address,
      online_url,
      image_url,
      visibility,
      status,
      capacity,
      created_at,
      event_attendees (
        user_id,
        status
      ),
      event_invites (
        invited_user_id,
        status
      ),
      churches:church_id (
        id,
        name,
        display_name,
        avatar_url,
        is_verified
      )
    `
    )
    .maybeSingle();

  if (error) {
    console.log("updateEventVisibility error:", error);
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    event: data || null,
  };
}

export function getEventCounts(event, currentUserId) {
  const attendees = Array.isArray(event?.event_attendees)
    ? event.event_attendees
    : [];

  const invites = Array.isArray(event?.event_invites)
    ? event.event_invites
    : [];

  const goingCount = attendees.filter((a) => a.status === "going").length;
  const maybeCount = attendees.filter((a) => a.status === "maybe").length;

  const myAttendance = currentUserId
    ? attendees.find((a) => a.user_id === currentUserId) || null
    : null;

  const myInvite = currentUserId
    ? invites.find((i) => i.invited_user_id === currentUserId) || null
    : null;

  return {
    goingCount,
    maybeCount,
    myAttendance,
    myInvite,
  };
}

export function formatEventDateTime(startAt, endAt) {
  if (!startAt) return "Date to be confirmed";

  try {
    const start = new Date(startAt);

    const date = start.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    const startTime = start.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (!endAt) return `${date} · ${startTime}`;

    const end = new Date(endAt);

    const endTime = end.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${date} · ${startTime} - ${endTime}`;
  } catch {
    return "Date to be confirmed";
  }
}