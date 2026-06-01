// src/features/events/screens/EventDetailsScreen.js
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import Screen from "../../../components/Screen";
import { theme } from "../../../theme/theme";
import {
  deleteMyEventRegistration,
  fetchMyEventRegistration,
} from "../services/eventRegistrationsService";
import {
  fetchEventById,
  getCurrentUserId,
  getEventCounts,
  leaveEvent,
  rsvpToEvent,
  updateEventVisibility,
} from "../services/eventsService";

const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const EVENT_RED = "#991B1B";
const CREAM = theme.premium?.colors?.cream || "#FFFCF5";
const WHITE = theme.premium?.colors?.surface || "#FFFFFF";
const OLIVE = theme.premium?.colors?.olive || "#4F633B";
const MUTED = theme.premium?.colors?.muted || theme.colors.muted;
const TEXT = theme.premium?.colors?.text || theme.colors.text;
const CARD_BORDER =
  theme.premium?.colors?.cardBorder || "rgba(15, 23, 42, 0.08)";

function safeInitials(nameOrEmail) {
  if (!nameOrEmail) return "?";

  const parts = String(nameOrEmail).trim().split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return String(nameOrEmail).trim()[0]?.toUpperCase() || "?";
}

function visibilityLabel(value) {
  if (value === "church") return "Church event";
  if (value === "invite_only") return "Invite-only event";
  return "Public event";
}

function getAttendanceLabel(event) {
  const method = event?.attendance_method;

  if (method === "registration_required" || event?.registration_enabled) {
    return "Registration required";
  }

  if (method === "external_registration") {
    return "External sign-up";
  }

  if (method === "invite_only" || event?.visibility === "invite_only") {
    return "Invite-only";
  }

  return "Open RSVP";
}

function requiresRegistration(event) {
  return (
    event?.attendance_method === "registration_required" ||
    event?.registration_enabled === true
  );
}

function getAttendanceDescription(event) {
  const method = event?.attendance_method;

  if (method === "registration_required" || event?.registration_enabled) {
    return "People register their interest through Triunely.";
  }

  if (method === "external_registration") {
    return "People sign up using an external registration link.";
  }

  if (method === "invite_only" || event?.visibility === "invite_only") {
    return "Only invited people should respond to this event.";
  }

  return "People can mark themselves as going.";
}

function getWeekdayNameFromNumber(value) {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  if (value === null || value === undefined) return null;

  const index = Number(value);

  if (Number.isNaN(index) || index < 0 || index > 6) return null;

  return days[index];
}

function isWeeklyProgramme(event) {
  return (
    event?.event_type === "course_programme" &&
    event?.repeat_type === "weekly"
  );
}

function getEventImageUrl(event) {
  const church = Array.isArray(event?.churches)
    ? event?.churches?.[0]
    : event?.churches;

  return (
    event?.image_url ||
    event?.cover_image_url ||
    event?.banner_url ||
    event?.poster_url ||
    event?.media_url ||
    church?.cover_image_url ||
    church?.avatar_url ||
    null
  );
}

function getFallbackEventImage(event) {
  const title = String(event?.title || "").toLowerCase();

  if (
    title.includes("carol") ||
    title.includes("christmas") ||
    title.includes("worship") ||
    title.includes("music")
  ) {
    return "https://images.unsplash.com/photo-1512389142860-9c449e58a543?q=80&w=1200&auto=format&fit=crop";
  }

  if (
    title.includes("youth") ||
    title.includes("social") ||
    title.includes("party") ||
    title.includes("meal")
  ) {
    return "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?q=80&w=1200&auto=format&fit=crop";
  }

  if (
    title.includes("prayer") ||
    title.includes("bible") ||
    title.includes("service")
  ) {
    return "https://images.unsplash.com/photo-1507692049790-de58290a4334?q=80&w=1200&auto=format&fit=crop";
  }

  return "https://images.unsplash.com/photo-1507692049790-de58290a4334?q=80&w=1200&auto=format&fit=crop";
}

function getEventIcon(event) {
  const title = String(event?.title || "").toLowerCase();

  if (event?.event_type === "course_programme") return "school-outline";

  if (
    title.includes("carol") ||
    title.includes("music") ||
    title.includes("worship")
  ) {
    return "musical-notes-outline";
  }

  if (title.includes("christmas")) return "sparkles-outline";
  if (title.includes("meal") || title.includes("food")) return "restaurant-outline";
  if (title.includes("prayer")) return "hand-left-outline";
  if (title.includes("course") || title.includes("alpha")) return "school-outline";

  return "sparkles-outline";
}

function getDateParts(startAt) {
  if (!startAt) {
    return {
      day: "TBC",
      month: "DATE",
      weekday: "Soon",
    };
  }

  try {
    const d = new Date(startAt);

    return {
      day: d.toLocaleDateString(undefined, { day: "numeric" }),
      month: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
      weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
    };
  } catch {
    return {
      day: "TBC",
      month: "DATE",
      weekday: "Soon",
    };
  }
}

function formatFullDate(value) {
  if (!value) return "Date to be confirmed";

  try {
    const d = new Date(value);

    return d.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Date to be confirmed";
  }
}

function formatTime(value) {
  if (!value) return "Time to be confirmed";

  try {
    const d = new Date(value);

    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Time to be confirmed";
  }
}

function isSameCalendarDay(startAt, endAt) {
  if (!startAt || !endAt) return true;

  try {
    const start = new Date(startAt);
    const end = new Date(endAt);

    return (
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate()
    );
  } catch {
    return true;
  }
}

function getDurationLabel(startAt, endAt) {
  if (!startAt || !endAt) return null;

  try {
    const start = new Date(startAt);
    const end = new Date(endAt);
    const diffMs = end.getTime() - start.getTime();

    if (diffMs <= 0) return null;

    const dayMs = 1000 * 60 * 60 * 24;
    const days = Math.ceil(diffMs / dayMs);

    if (days <= 1) return null;

    const weeks = Math.round(days / 7);

    if (weeks >= 2 && Math.abs(days - weeks * 7) <= 2) {
      return `Runs across ${weeks} weeks`;
    }

    if (days >= 7) {
      return `Runs across ${weeks} weeks`;
    }

    return `Runs across ${days} days`;
  } catch {
    return null;
  }
}

function isProgrammeEvent(event) {
  if (event?.event_type === "course_programme") return true;

  const title = String(event?.title || "").toLowerCase();
  const description = String(event?.description || "").toLowerCase();

  if (
    title.includes("course") ||
    title.includes("alpha") ||
    title.includes("programme") ||
    title.includes("program") ||
    description.includes("course") ||
    description.includes("weekly") ||
    description.includes("programme")
  ) {
    return true;
  }

  if (
    event?.start_at &&
    event?.end_at &&
    !isSameCalendarDay(event.start_at, event.end_at)
  ) {
    return true;
  }

  return false;
}

function PremiumButton({
  title,
  icon,
  onPress,
  disabled,
  variant = "primary",
  danger = false,
}) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        minHeight: 48,
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: danger
          ? "rgba(153, 27, 27, 0.08)"
          : isPrimary
          ? EVENT_AMBER
          : WHITE,
        borderWidth: 1,
        borderColor: danger
          ? "rgba(153, 27, 27, 0.24)"
          : isPrimary
          ? EVENT_AMBER
          : CARD_BORDER,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.58 : 1,
        shadowColor: isPrimary ? EVENT_AMBER : "rgba(15, 23, 42, 0.08)",
        shadowOpacity: pressed ? 0.08 : isPrimary ? 0.2 : 0.1,
        shadowRadius: pressed ? 6 : isPrimary ? 10 : 7,
        shadowOffset: { width: 0, height: pressed ? 2 : 4 },
        elevation: pressed ? 1 : isPrimary ? 4 : 2,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={danger ? EVENT_RED : isPrimary ? "#fff" : OLIVE}
          style={{ marginRight: 8 }}
        />
      ) : null}

      <Text
        style={{
          color: danger ? EVENT_RED : isPrimary ? "#fff" : OLIVE,
          fontWeight: "900",
          fontSize: 14,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function RaisedCard({ children, style }) {
  return (
    <View
      style={[
        {
          marginHorizontal: 20,
          marginTop: 14,
          backgroundColor: WHITE,
          borderRadius: 22,
          padding: 16,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          shadowColor: "rgba(15, 23, 42, 0.08)",
          shadowOpacity: 0.1,
          shadowRadius: 9,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function PremiumInfoRow({
  icon,
  label,
  value,
  accent = EVENT_AMBER,
  last = false,
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: "rgba(15, 23, 42, 0.06)",
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor:
            accent === OLIVE
              ? "rgba(79, 99, 59, 0.10)"
              : "rgba(180, 83, 9, 0.10)",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Ionicons name={icon} size={18} color={accent} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            color: MUTED,
            fontSize: 11.5,
            fontWeight: "900",
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          {label}
        </Text>

        <Text
          style={{
            color: TEXT,
            fontSize: 14,
            fontWeight: "800",
            lineHeight: 19,
            marginTop: 2,
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function StatusChip({ children, active, eventTone = false, amber = false }) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: active
          ? "rgba(180, 83, 9, 0.12)"
          : eventTone
          ? "rgba(124, 45, 18, 0.08)"
          : amber
          ? "rgba(180, 83, 9, 0.10)"
          : "rgba(79, 99, 59, 0.09)",
        borderWidth: 1,
        borderColor: active
          ? "rgba(180, 83, 9, 0.24)"
          : eventTone
          ? "rgba(124, 45, 18, 0.16)"
          : amber
          ? "rgba(180, 83, 9, 0.18)"
          : "rgba(79, 99, 59, 0.14)",
      }}
    >
      <Text
        style={{
          color: active
            ? EVENT_AMBER
            : eventTone
            ? EVENT_BROWN
            : amber
            ? EVENT_AMBER
            : OLIVE,
          fontWeight: "900",
          fontSize: 11.5,
        }}
      >
        {children}
      </Text>
    </View>
  );
}

function DateSummaryCard({ event }) {
  const hasEnd = !!event?.end_at;
  const sameDay = hasEnd ? isSameCalendarDay(event.start_at, event.end_at) : true;
  const durationLabel = getDurationLabel(event?.start_at, event?.end_at);
  const programme = isProgrammeEvent(event);
  const weeklyProgramme = isWeeklyProgramme(event);
  const weekdayName = getWeekdayNameFromNumber(event?.repeat_day);

  if (!hasEnd) {
    return (
      <PremiumInfoRow
        icon="calendar-outline"
        label="When"
        value={`${formatFullDate(event?.start_at)} · ${formatTime(event?.start_at)}`}
        last
      />
    );
  }

  if (sameDay && !programme) {
    return (
      <PremiumInfoRow
        icon="calendar-outline"
        label="When"
        value={`${formatFullDate(event?.start_at)} · ${formatTime(
          event?.start_at
        )} - ${formatTime(event?.end_at)}`}
        last
      />
    );
  }

  return (
    <View style={{ paddingVertical: 12 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(180, 83, 9, 0.10)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Ionicons
            name={programme ? "school-outline" : "calendar-outline"}
            size={18}
            color={EVENT_AMBER}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: MUTED,
              fontSize: 11.5,
              fontWeight: "900",
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            {programme ? "Course / programme dates" : "Event dates"}
          </Text>

          {weeklyProgramme ? (
            <Text
              style={{
                color: EVENT_AMBER,
                fontSize: 13,
                fontWeight: "900",
                marginTop: 2,
              }}
            >
              Weekly{weekdayName ? ` on ${weekdayName}` : ""}
            </Text>
          ) : durationLabel ? (
            <Text
              style={{
                color: EVENT_AMBER,
                fontSize: 13,
                fontWeight: "900",
                marginTop: 2,
              }}
            >
              {durationLabel}
            </Text>
          ) : null}

          {weeklyProgramme && durationLabel ? (
            <Text
              style={{
                color: MUTED,
                fontSize: 12.5,
                fontWeight: "800",
                marginTop: 2,
              }}
            >
              {durationLabel}
            </Text>
          ) : null}
        </View>
      </View>

      <View
        style={{
          borderRadius: 18,
          backgroundColor: "rgba(180, 83, 9, 0.08)",
          borderWidth: 1,
          borderColor: "rgba(180, 83, 9, 0.16)",
          padding: 12,
        }}
      >
        <Text
          style={{
            color: EVENT_BROWN,
            fontSize: 11.5,
            fontWeight: "900",
            textTransform: "uppercase",
            letterSpacing: 0.35,
          }}
        >
          Starts
        </Text>

        <Text
          style={{
            color: TEXT,
            fontSize: 14,
            fontWeight: "900",
            marginTop: 3,
            lineHeight: 19,
          }}
        >
          {formatFullDate(event?.start_at)} · {formatTime(event?.start_at)}
        </Text>

        <View
          style={{
            height: 1,
            backgroundColor: "rgba(124, 45, 18, 0.10)",
            marginVertical: 11,
          }}
        />

        <Text
          style={{
            color: EVENT_BROWN,
            fontSize: 11.5,
            fontWeight: "900",
            textTransform: "uppercase",
            letterSpacing: 0.35,
          }}
        >
          {programme ? "Final date" : "Ends"}
        </Text>

        <Text
          style={{
            color: TEXT,
            fontSize: 14,
            fontWeight: "900",
            marginTop: 3,
            lineHeight: 19,
          }}
        >
          {formatFullDate(event?.end_at)} · {formatTime(event?.end_at)}
        </Text>
      </View>
    </View>
  );
}

export default function EventDetailsScreen({ route, navigation }) {
  const { eventId, event: initialEvent } = route?.params || {};

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(initialEvent || null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [myRegistration, setMyRegistration] = useState(null);

  const loadEvent = useCallback(async () => {
    try {
      setLoading(true);

      const uid = await getCurrentUserId();
      setCurrentUserId(uid);

      const res = await fetchEventById(eventId);

      if (!res.ok) {
        Alert.alert("Event", res.error || "Could not load this event.");
        setEvent(null);
        setMyRegistration(null);
        return;
      }

      setEvent(res.event);

      if (requiresRegistration(res.event)) {
        const regRes = await fetchMyEventRegistration(res.event.id);

        if (regRes.ok) {
          setMyRegistration(regRes.registration || null);
        } else {
          setMyRegistration(null);
        }
      } else {
        setMyRegistration(null);
      }
    } catch (e) {
      console.log("EventDetailsScreen load error:", e);
      Alert.alert("Event", "Could not load this event right now.");
      setEvent(null);
      setMyRegistration(null);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      loadEvent();
    }, [loadEvent])
  );

  const counts = getEventCounts(event, currentUserId);
  const myStatus = counts.myAttendance?.status || counts.myInvite?.status || null;
  const isGoing = myStatus === "going" || myStatus === "accepted";
  const isCreator = !!(currentUserId && event?.created_by === currentUserId);
  const nextVisibility =
    event?.visibility === "invite_only" ? "public" : "invite_only";
  const nextVisibilityLabel =
    nextVisibility === "invite_only"
      ? "Switch to invite-only"
      : "Switch to public";
  const canInvitePeople = event?.visibility === "public" || isCreator;

  const church = Array.isArray(event?.churches)
    ? event?.churches?.[0]
    : event?.churches;

  const churchName = church?.display_name || church?.name || null;

  const attendees = Array.isArray(event?.event_attendees)
    ? event.event_attendees
    : [];

  const goingAttendees = attendees.filter((a) => a.status === "going");
  const maybeAttendees = attendees.filter((a) => a.status === "maybe");

  const eventImageUrl = getEventImageUrl(event) || getFallbackEventImage(event);
  const dateParts = getDateParts(event?.start_at);
  const eventIcon = getEventIcon(event);
  const programme = isProgrammeEvent(event);
  const weeklyProgramme = isWeeklyProgramme(event);
  const attendanceLabel = getAttendanceLabel(event);
  const attendanceDescription = getAttendanceDescription(event);
  const eventRequiresRegistration = requiresRegistration(event);
  const isRegistered = !!myRegistration;

  async function handleRsvp(status) {
    if (!event?.id) return;

    try {
      setSaving(true);
      const res = await rsvpToEvent({ eventId: event.id, status });

      if (!res.ok) {
        Alert.alert("Event", res.error || "Could not update your RSVP.");
        return;
      }

      await loadEvent();
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelRegistration() {
    if (!event?.id) return;

    Alert.alert(
      "Cancel registration?",
      "This will remove your registration for this event.",
      [
        { text: "Keep registration", style: "cancel" },
        {
          text: "Cancel registration",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);

              const res = await deleteMyEventRegistration(event.id);

              if (!res.ok) {
                Alert.alert(
                  "Registration",
                  res.error || "Could not cancel your registration."
                );
                return;
              }

              setMyRegistration(null);
              await loadEvent();
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }

  async function handleLeaveEvent() {
    if (!event?.id) return;

    try {
      setSaving(true);
      const res = await leaveEvent(event.id);

      if (!res.ok) {
        Alert.alert("Event", res.error || "Could not leave this event.");
        return;
      }

      await loadEvent();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleVisibility() {
    if (!event?.id) return;

    const goingInviteOnly = event.visibility !== "invite_only";

    Alert.alert(
      "Change event visibility?",
      goingInviteOnly
        ? "This will make the event invite-only. Only invited users and allowed managers should be able to see it."
        : "This will make the event public. More users may be able to see and RSVP to it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: goingInviteOnly ? "Make invite-only" : "Make public",
          style: goingInviteOnly ? "default" : "destructive",
          onPress: async () => {
            try {
              setSaving(true);

              const res = await updateEventVisibility({
                eventId: event.id,
                visibility: nextVisibility,
              });

              if (!res.ok) {
                Alert.alert("Event", res.error || "Could not update visibility.");
                return;
              }

              await loadEvent();
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }

  async function openOnlineUrl() {
    if (!event?.online_url) return;

    try {
      const supported = await Linking.canOpenURL(event.online_url);

      if (!supported) {
        Alert.alert("Event", "Your device could not open this link.");
        return;
      }

      await Linking.openURL(event.online_url);
    } catch {
      Alert.alert("Event", "Could not open this link right now.");
    }
  }

  async function openExternalRegistrationUrl() {
    if (!event?.external_registration_url) return;

    try {
      const supported = await Linking.canOpenURL(event.external_registration_url);

      if (!supported) {
        Alert.alert("Event", "Your device could not open this registration link.");
        return;
      }

      await Linking.openURL(event.external_registration_url);
    } catch {
      Alert.alert("Event", "Could not open this registration link right now.");
    }
  }

  function renderAttendeeRow(attendee, type = "going") {
    const profile = Array.isArray(attendee.profiles)
      ? attendee.profiles?.[0]
      : attendee.profiles;

    const name = profile?.display_name || "Triunely user";
    const avatar = profile?.avatar_url || null;
    const initials = safeInitials(name);
    const isMaybe = type === "maybe";

    return (
      <View
        key={`${type}-${attendee.user_id}`}
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 10,
          opacity: isMaybe ? 0.82 : 1,
        }}
      >
        {avatar ? (
          <Image
            source={{ uri: avatar }}
            style={{
              width: isMaybe ? 34 : 38,
              height: isMaybe ? 34 : 38,
              borderRadius: isMaybe ? 17 : 19,
              marginRight: 10,
            }}
          />
        ) : (
          <View
            style={{
              width: isMaybe ? 34 : 38,
              height: isMaybe ? 34 : 38,
              borderRadius: isMaybe ? 17 : 19,
              marginRight: 10,
              backgroundColor: isMaybe
                ? theme.premium?.colors?.oliveSoft || "rgba(79, 99, 59, 0.10)"
                : "rgba(180, 83, 9, 0.10)",
              borderWidth: 1,
              borderColor: isMaybe
                ? theme.premium?.colors?.oliveBorder || "rgba(79, 99, 59, 0.16)"
                : "rgba(180, 83, 9, 0.20)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: isMaybe ? OLIVE : EVENT_AMBER,
                fontWeight: "900",
              }}
            >
              {initials}
            </Text>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={{ color: TEXT, fontWeight: "900" }}>{name}</Text>
          <Text
            style={{
              color: MUTED,
              marginTop: 2,
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            {isMaybe ? "Maybe" : "Going"}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Screen backgroundColor={CREAM} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: bottomPad + 20,
          }}
        >
          {/* Header */}
          <View
            style={{
              paddingHorizontal: theme.premium?.spacing?.screenX || 20,
              paddingTop: theme.premium?.spacing?.headerTop || 18,
              paddingBottom: 12,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={12}
              style={({ pressed }) => ({
                ...(theme.premium?.headerButton || {}),
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: pressed ? "rgba(255,255,255,0.76)" : WHITE,
                marginRight: 13,
                shadowOpacity: pressed ? 0.04 : 0.1,
                shadowRadius: pressed ? 5 : 8,
                shadowOffset: { width: 0, height: pressed ? 2 : 3 },
                elevation: pressed ? 1 : 2,
                transform: [{ scale: pressed ? 0.975 : 1 }],
              })}
            >
              <Ionicons name="chevron-back" size={25} color={OLIVE} />
            </Pressable>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  ...(theme.premium?.text?.screenTitle || {}),
                  fontSize: 31,
                  lineHeight: 35,
                }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                Event
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 13,
                  fontWeight: "700",
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                Details, guests and RSVP
              </Text>
            </View>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 44, alignItems: "center" }}>
              <ActivityIndicator color={EVENT_AMBER} />
              <Text
                style={{
                  color: MUTED,
                  marginTop: 9,
                  fontWeight: "800",
                }}
              >
                Loading event…
              </Text>
            </View>
          ) : !event ? (
            <RaisedCard style={{ marginTop: 8 }}>
              <Text
                style={{
                  color: TEXT,
                  fontFamily: theme.fonts?.display,
                  fontWeight: "900",
                  fontSize: 21,
                }}
              >
                Event not found
              </Text>

              <Text
                style={{
                  color: MUTED,
                  marginTop: 8,
                  lineHeight: 20,
                  fontWeight: "700",
                }}
              >
                This event may have been deleted, cancelled, or you may not have
                access to it.
              </Text>
            </RaisedCard>
          ) : (
            <>
              {/* Poster hero */}
              <View
                style={{
                  marginHorizontal: 20,
                  borderRadius: 28,
                  overflow: "hidden",
                  backgroundColor: WHITE,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.94)",
                  shadowColor: "#000",
                  shadowOpacity: 0.16,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 5,
                }}
              >
                <View
                  style={{
                    height: 230,
                    width: "100%",
                    backgroundColor: theme.colors.surfaceAlt,
                  }}
                >
                  <Image
                    source={{ uri: eventImageUrl }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />

                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: 0,
                      bottom: 0,
                      backgroundColor: "rgba(0,0,0,0.24)",
                    }}
                  />

                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      top: -44,
                      right: -34,
                      width: 142,
                      height: 142,
                      borderRadius: 71,
                      backgroundColor: "rgba(255,255,255,0.16)",
                    }}
                  />

                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      bottom: -54,
                      left: -40,
                      width: 156,
                      height: 156,
                      borderRadius: 78,
                      backgroundColor: "rgba(255,255,255,0.11)",
                    }}
                  />

                  <View
                    style={{
                      position: "absolute",
                      top: 14,
                      left: 14,
                      width: 58,
                      height: 64,
                      borderRadius: 18,
                      backgroundColor: "rgba(255,255,255,0.95)",
                      alignItems: "center",
                      justifyContent: "center",
                      shadowColor: "#000",
                      shadowOpacity: 0.14,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 3 },
                      elevation: 3,
                    }}
                  >
                    <Text
                      style={{
                        color: TEXT,
                        fontSize: 22,
                        fontWeight: "900",
                        lineHeight: 24,
                      }}
                    >
                      {dateParts.day}
                    </Text>

                    <Text
                      style={{
                        color: EVENT_AMBER,
                        fontSize: 10.5,
                        fontWeight: "900",
                        letterSpacing: 0.5,
                        marginTop: 2,
                      }}
                    >
                      {dateParts.month}
                    </Text>
                  </View>

                  <View
                    style={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: "rgba(255,255,255,0.92)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name={eventIcon} size={23} color={EVENT_AMBER} />
                  </View>

                  <View
                    style={{
                      position: "absolute",
                      left: 16,
                      right: 16,
                      bottom: 16,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 999,
                          backgroundColor: "rgba(255,255,255,0.94)",
                        }}
                      >
                        <Text
                          style={{
                            color: EVENT_BROWN,
                            fontSize: 10.5,
                            fontWeight: "900",
                            letterSpacing: 0.45,
                            textTransform: "uppercase",
                          }}
                        >
                          {programme ? "Course / programme" : "Upcoming event"}
                        </Text>
                      </View>

                      <View
                        style={{
                          paddingHorizontal: 9,
                          paddingVertical: 6,
                          borderRadius: 999,
                          backgroundColor: "rgba(255,255,255,0.20)",
                          borderWidth: 1,
                          borderColor: "rgba(255,255,255,0.35)",
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons name="sparkles-outline" size={12} color="#fff" />
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 10.5,
                            fontWeight: "900",
                            marginLeft: 4,
                          }}
                        >
                          {visibilityLabel(event.visibility)}
                        </Text>
                      </View>

                      <View
                        style={{
                          paddingHorizontal: 9,
                          paddingVertical: 6,
                          borderRadius: 999,
                          backgroundColor: "rgba(255,255,255,0.20)",
                          borderWidth: 1,
                          borderColor: "rgba(255,255,255,0.35)",
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons name="create-outline" size={12} color="#fff" />
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 10.5,
                            fontWeight: "900",
                            marginLeft: 4,
                          }}
                        >
                          {attendanceLabel}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={{
                        color: "#fff",
                        fontFamily: theme.fonts?.display,
                        fontSize: 34,
                        fontWeight: "900",
                        lineHeight: 38,
                        letterSpacing: -0.5,
                      }}
                      numberOfLines={2}
                    >
                      {event.title || "Untitled event"}
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    backgroundColor: WHITE,
                  }}
                >
                  <DateSummaryCard event={event} />

                  <PremiumInfoRow
                    icon="create-outline"
                    label="How people join"
                    accent={OLIVE}
                    value={`${attendanceLabel}. ${attendanceDescription}`}
                    last={false}
                  />

                  <PremiumInfoRow
                    icon="location-outline"
                    label="Where"
                    accent={OLIVE}
                    value={
                      event.location_name ||
                      event.location_address ||
                      (event.online_url ? "Online" : "Location to be confirmed")
                    }
                    last={!churchName}
                  />

                  {churchName ? (
                    <PremiumInfoRow
                      icon="business-outline"
                      label="Hosted by"
                      accent={OLIVE}
                      value={churchName}
                      last
                    />
                  ) : null}

                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 12,
                    }}
                  >
                    <StatusChip eventTone>{visibilityLabel(event.visibility)}</StatusChip>

                    {programme ? (
                      <StatusChip eventTone>Course / programme</StatusChip>
                    ) : null}

                    {weeklyProgramme ? (
                      <StatusChip amber>
                        Weekly
                        {getWeekdayNameFromNumber(event?.repeat_day)
                          ? ` on ${getWeekdayNameFromNumber(event?.repeat_day)}`
                          : ""}
                      </StatusChip>
                    ) : null}

                    <StatusChip>{attendanceLabel}</StatusChip>

                    <StatusChip>{counts.goingCount} going</StatusChip>

                    {eventRequiresRegistration && isRegistered ? (
                      <StatusChip active>Registered</StatusChip>
                    ) : myStatus ? (
                      <StatusChip active>Your status: {myStatus}</StatusChip>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* Description */}
              <RaisedCard>
                <Text
                  style={{
                    color: TEXT,
                    fontFamily: theme.fonts?.display,
                    fontSize: 22,
                    fontWeight: "900",
                    letterSpacing: -0.2,
                  }}
                >
                  About this event
                </Text>

                <Text
                  style={{
                    color: event.description ? theme.colors.text2 : MUTED,
                    lineHeight: 22,
                    marginTop: 10,
                    fontWeight: event.description ? "600" : "700",
                  }}
                >
                  {event.description || "No description has been added yet."}
                </Text>
              </RaisedCard>

              {/* Who's going */}
              <RaisedCard>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <Text
                    style={{
                      color: TEXT,
                      fontFamily: theme.fonts?.display,
                      fontSize: 22,
                      fontWeight: "900",
                      letterSpacing: -0.2,
                    }}
                  >
                    Who’s going
                  </Text>

                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 999,
                      backgroundColor: "rgba(180, 83, 9, 0.10)",
                    }}
                  >
                    <Text
                      style={{
                        color: EVENT_AMBER,
                        fontSize: 11.5,
                        fontWeight: "900",
                      }}
                    >
                      {counts.goingCount}
                    </Text>
                  </View>
                </View>

                {goingAttendees.length === 0 ? (
                  <Text
                    style={{
                      color: MUTED,
                      marginTop: 2,
                      fontWeight: "700",
                      lineHeight: 19,
                    }}
                  >
                    No one has marked themselves as going yet.
                  </Text>
                ) : (
                  <View style={{ marginTop: 2 }}>
                    {goingAttendees.map((attendee) =>
                      renderAttendeeRow(attendee, "going")
                    )}
                  </View>
                )}

                {maybeAttendees.length > 0 ? (
                  <View style={{ marginTop: 10 }}>
                    <Text
                      style={{
                        color: OLIVE,
                        fontWeight: "900",
                        marginBottom: 8,
                      }}
                    >
                      Maybe
                    </Text>

                    {maybeAttendees.map((attendee) =>
                      renderAttendeeRow(attendee, "maybe")
                    )}
                  </View>
                ) : null}
              </RaisedCard>

              {/* Actions */}
              <View
                style={{
                  marginHorizontal: 20,
                  marginTop: 14,
                  gap: 10,
                }}
              >
                {isCreator ? (
                  <PremiumButton
                    title={saving ? "Updating..." : nextVisibilityLabel}
                    icon="lock-closed-outline"
                    onPress={handleToggleVisibility}
                    disabled={saving}
                    variant="outline"
                  />
                ) : null}

                {canInvitePeople ? (
                  <PremiumButton
                    title="Invite people"
                    icon="person-add-outline"
                    onPress={() =>
                      navigation.navigate("EventInvitePeople", {
                        eventId: event.id,
                      })
                    }
                    variant="outline"
                  />
                ) : null}

                {event.external_registration_url ? (
                  <PremiumButton
                    title="Open registration link"
                    icon="open-outline"
                    onPress={openExternalRegistrationUrl}
                    variant="outline"
                  />
                ) : null}

                {event.online_url ? (
                  <PremiumButton
                    title="Open online link"
                    icon="open-outline"
                    onPress={openOnlineUrl}
                    variant="outline"
                  />
                ) : null}

                {eventRequiresRegistration ? (
                  isRegistered ? (
                    <>
                      <View
                        style={{
                          padding: 14,
                          borderRadius: 20,
                          backgroundColor: "rgba(79, 99, 59, 0.08)",
                          borderWidth: 1,
                          borderColor: "rgba(79, 99, 59, 0.16)",
                        }}
                      >
                        <Text
                          style={{
                            color: OLIVE,
                            fontWeight: "900",
                            fontSize: 14,
                          }}
                        >
                          You’re registered
                        </Text>

                        <Text
                          style={{
                            color: MUTED,
                            fontWeight: "700",
                            lineHeight: 19,
                            marginTop: 4,
                          }}
                        >
                          Your registration has been sent to the event organiser.
                        </Text>
                      </View>

                      <PremiumButton
                        title={saving ? "Updating..." : "Cancel registration"}
                        icon="close-circle-outline"
                        onPress={handleCancelRegistration}
                        disabled={saving}
                        variant="outline"
                        danger
                      />
                    </>
                  ) : (
                    <PremiumButton
                      title="Register"
                      icon="create-outline"
                      onPress={() =>
                        navigation.navigate("RegisterEvent", {
                          eventId: event.id,
                          event,
                        })
                      }
                      disabled={saving}
                      variant="primary"
                    />
                  )
                ) : isGoing ? (
                  <PremiumButton
                    title={saving ? "Updating..." : "Leave event"}
                    icon="exit-outline"
                    onPress={handleLeaveEvent}
                    disabled={saving}
                    variant="outline"
                    danger
                  />
                ) : (
                  <>
                    <PremiumButton
                      title={saving ? "Updating..." : "I’m going"}
                      icon="checkmark-circle-outline"
                      onPress={() => handleRsvp("going")}
                      disabled={saving}
                      variant="primary"
                    />

                    <PremiumButton
                      title={saving ? "Updating..." : "Maybe"}
                      icon="help-circle-outline"
                      onPress={() => handleRsvp("maybe")}
                      disabled={saving}
                      variant="outline"
                    />

                    <PremiumButton
                      title={saving ? "Updating..." : "Decline"}
                      icon="close-circle-outline"
                      onPress={() => handleRsvp("declined")}
                      disabled={saving}
                      variant="outline"
                      danger
                    />
                  </>
                )}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}