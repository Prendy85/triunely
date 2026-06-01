// src/features/events/services/eventsService.js
import { supabase } from "../../../lib/supabase";

const EVENT_SELECT_SUMMARY = `
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

  event_type,
  attendance_method,
  repeat_type,
  repeat_interval,
  repeat_day,
  registration_enabled,
  external_registration_url,
  registration_questions,

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
`;

const EVENT_SELECT_DETAIL = `
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

  event_type,
  attendance_method,
  repeat_type,
  repeat_interval,
  repeat_day,
  registration_enabled,
  external_registration_url,
  registration_questions,

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
`;

function cleanRegistrationQuestions(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((question, index) => {
      const label = String(question?.label || "").trim();

      if (!label) return null;

      const type = [
        "short_text",
        "long_text",
        "yes_no",
        "single_choice",
        "multi_choice",
      ].includes(question?.type)
        ? question.type
        : "short_text";

      const options = Array.isArray(question?.options)
        ? question.options
            .map((option) => String(option || "").trim())
            .filter(Boolean)
        : [];

      const needsOptions = type === "single_choice" || type === "multi_choice";

      return {
        id:
          question?.id ||
          `q_${Date.now()}_${index}_${Math.random()
            .toString(36)
            .slice(2, 8)}`,
        label,
        type,
        required: question?.required === true,
        options: needsOptions ? options : [],
      };
    })
    .filter(Boolean);
}

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
    .select(EVENT_SELECT_SUMMARY)
    .or(`start_at.gte.${nowIso},end_at.gte.${nowIso}`)
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
      .select(EVENT_SELECT_SUMMARY)
      .eq("created_by", userId)
      .or(`start_at.gte.${nowIso},end_at.gte.${nowIso}`)
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
        .select(EVENT_SELECT_SUMMARY)
        .in("id", relatedEventIds)
        .or(`start_at.gte.${nowIso},end_at.gte.${nowIso}`)
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
    .select(EVENT_SELECT_DETAIL)
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

  eventType = "single",
  attendanceMethod = "open_rsvp",
  repeatType = "none",
  repeatInterval = 1,
  repeatDay = null,
  registrationEnabled = false,
  externalRegistrationUrl = null,
  registrationQuestions = [],
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

  const cleanEventType = ["single", "course_programme"].includes(eventType)
    ? eventType
    : "single";

  const cleanAttendanceMethod = [
    "open_rsvp",
    "registration_required",
    "external_registration",
    "invite_only",
  ].includes(attendanceMethod)
    ? attendanceMethod
    : "open_rsvp";

  const cleanRepeatType = ["none", "weekly"].includes(repeatType)
    ? repeatType
    : "none";

  const cleanRepeatInterval = Number(repeatInterval || 1);

  const cleanRepeatDay =
    repeatDay === null || repeatDay === undefined || repeatDay === ""
      ? null
      : Number(repeatDay);

  const cleanedRegistrationQuestions =
    cleanAttendanceMethod === "registration_required"
      ? cleanRegistrationQuestions(registrationQuestions)
      : [];

  const { data, error } = await supabase.rpc("create_event_rpc", {
    p_title: cleanTitle,
    p_description: description ? String(description).trim() : null,
    p_start_at: startAt,
    p_end_at: endAt || null,
    p_location_name: locationName ? String(locationName).trim() : null,
    p_location_address: locationAddress ? String(locationAddress).trim() : null,
    p_online_url: onlineUrl ? String(onlineUrl).trim() : null,
    p_visibility: visibility,
    p_church_id: churchId || null,
    p_capacity: capacity ? Number(capacity) : null,
    p_image_url: imageUrl ? String(imageUrl).trim() : null,

    p_event_type: cleanEventType,
    p_attendance_method: cleanAttendanceMethod,
    p_repeat_type: cleanRepeatType,
    p_repeat_interval: cleanRepeatInterval >= 1 ? cleanRepeatInterval : 1,
    p_repeat_day: cleanRepeatDay,
    p_registration_enabled: !!registrationEnabled,
    p_external_registration_url: externalRegistrationUrl
      ? String(externalRegistrationUrl).trim()
      : null,
    p_registration_questions: cleanedRegistrationQuestions,
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
    .select(EVENT_SELECT_SUMMARY)
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

    const startDate = start.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    const startTime = start.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (!endAt) return `${startDate} · ${startTime}`;

    const end = new Date(endAt);

    const endDate = end.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    const endTime = end.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });

    const sameDay =
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate();

    if (sameDay) {
      return `${startDate} · ${startTime} - ${endTime}`;
    }

    return `${startDate} · ${startTime} - ${endDate} · ${endTime}`;
  } catch {
    return "Date to be confirmed";
  }
}