// src/features/events/services/eventRegistrationsService.js
import { supabase } from "../../../lib/supabase";

const EVENT_REGISTRATION_SELECT = `
  id,
  event_id,
  user_id,
  name,
  email,
  phone,
  number_attending,
  attendee_details,
  message,
  accessibility_needs,
  consent_to_contact,
  answers,
  status,
  created_at,
  updated_at
`;

function cleanAnswers(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value;
}

function cleanAttendeeDetails(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((attendee) => {
      const name = String(attendee?.name || "").trim();
      const ageGroup = attendee?.age_group === "child" ? "child" : "adult";
      const ageGroupLabel =
        ageGroup === "child" ? "Child under 17" : "Adult 18+";

      return {
        name,
        age_group: ageGroup,
        age_group_label: ageGroupLabel,
      };
    })
    .filter((attendee) => attendee.name);
}

export async function getCurrentRegistrationUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.log("getCurrentRegistrationUserId error:", error);
    return null;
  }

  return data?.user?.id ?? null;
}

export async function fetchMyEventRegistration(eventId) {
  const userId = await getCurrentRegistrationUserId();

  if (!userId) {
    return {
      ok: false,
      error: "Not signed in",
      registration: null,
    };
  }

  if (!eventId) {
    return {
      ok: false,
      error: "Missing eventId",
      registration: null,
    };
  }

  const { data, error } = await supabase
    .from("event_registrations")
    .select(EVENT_REGISTRATION_SELECT)
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.log("fetchMyEventRegistration error:", error);
    return {
      ok: false,
      error: error.message,
      registration: null,
    };
  }

  return {
    ok: true,
    registration: data || null,
  };
}

export async function createEventRegistration({
  eventId,
  name,
  email,
  phone,
  numberAttending = 1,
  attendeeDetails = [],
  message,
  accessibilityNeeds,
  consentToContact = true,
  answers = {},
}) {
  const userId = await getCurrentRegistrationUserId();

  if (!userId) {
    return {
      ok: false,
      error: "Not signed in",
      registration: null,
    };
  }

  if (!eventId) {
    return {
      ok: false,
      error: "Missing eventId",
      registration: null,
    };
  }

  const cleanName = String(name || "").trim();

  if (!cleanName) {
    return {
      ok: false,
      error: "Please add your name.",
      registration: null,
    };
  }

  const cleanNumberAttending = Number(numberAttending || 1);

  if (
    !Number.isFinite(cleanNumberAttending) ||
    !Number.isInteger(cleanNumberAttending) ||
    cleanNumberAttending < 1
  ) {
    return {
      ok: false,
      error: "Number attending must be a whole number of at least 1.",
      registration: null,
    };
  }

  const cleanedAttendeeDetails = cleanAttendeeDetails(attendeeDetails);

  if (cleanNumberAttending > 1) {
    const expectedExtraAttendees = cleanNumberAttending - 1;

    if (cleanedAttendeeDetails.length !== expectedExtraAttendees) {
      return {
        ok: false,
        error: "Please add details for each additional attendee.",
        registration: null,
      };
    }
  }

  const existing = await fetchMyEventRegistration(eventId);

  if (existing.ok && existing.registration) {
    return {
      ok: false,
      error: "You are already registered for this event.",
      registration: existing.registration,
    };
  }

  const payload = {
    event_id: eventId,
    user_id: userId,
    name: cleanName,
    email: email ? String(email).trim() : null,
    phone: phone ? String(phone).trim() : null,
    number_attending: cleanNumberAttending,
    attendee_details: cleanedAttendeeDetails,
    message: message ? String(message).trim() : null,
    accessibility_needs: accessibilityNeeds
      ? String(accessibilityNeeds).trim()
      : null,
    consent_to_contact: !!consentToContact,
    answers: cleanAnswers(answers),
    status: "new",
  };

  const { data, error } = await supabase
    .from("event_registrations")
    .insert(payload)
    .select(EVENT_REGISTRATION_SELECT)
    .maybeSingle();

  if (error) {
    console.log("createEventRegistration error:", error);
    return {
      ok: false,
      error: error.message,
      registration: null,
    };
  }

  return {
    ok: true,
    registration: data || null,
  };
}

export async function deleteMyEventRegistration(eventId) {
  const userId = await getCurrentRegistrationUserId();

  if (!userId) {
    return {
      ok: false,
      error: "Not signed in",
    };
  }

  if (!eventId) {
    return {
      ok: false,
      error: "Missing eventId",
    };
  }

  const { error } = await supabase
    .from("event_registrations")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (error) {
    console.log("deleteMyEventRegistration error:", error);
    return {
      ok: false,
      error: error.message,
    };
  }

  return {
    ok: true,
  };
}

export async function fetchEventRegistrations(eventId) {
  if (!eventId) {
    return {
      ok: false,
      error: "Missing eventId",
      registrations: [],
    };
  }

  const { data, error } = await supabase
    .from("event_registrations")
    .select(EVENT_REGISTRATION_SELECT)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    console.log("fetchEventRegistrations error:", error);
    return {
      ok: false,
      error: error.message,
      registrations: [],
    };
  }

  return {
    ok: true,
    registrations: data || [],
  };
}

export async function updateEventRegistrationStatus({
  registrationId,
  status,
}) {
  if (!registrationId) {
    return {
      ok: false,
      error: "Missing registrationId",
      registration: null,
    };
  }

  if (!["new", "contacted", "confirmed", "cancelled"].includes(status)) {
    return {
      ok: false,
      error: "Invalid registration status",
      registration: null,
    };
  }

  const { data, error } = await supabase
    .from("event_registrations")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", registrationId)
    .select(EVENT_REGISTRATION_SELECT)
    .maybeSingle();

  if (error) {
    console.log("updateEventRegistrationStatus error:", error);
    return {
      ok: false,
      error: error.message,
      registration: null,
    };
  }

  return {
    ok: true,
    registration: data || null,
  };
}