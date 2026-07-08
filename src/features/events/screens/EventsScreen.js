// src/features/events/screens/EventsScreen.js
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import Screen from "../../../components/Screen";
import { theme } from "../../../theme/theme";
import {
  fetchUpcomingEvents,
  fetchUpcomingEventsForChurch,
  getCurrentUserId,
} from "../services/eventsService";

const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const CREAM = theme.premium?.colors?.cream || "#FFFCF5";
const WHITE = theme.premium?.colors?.surface || "#FFFFFF";
const OLIVE = theme.premium?.colors?.olive || "#4F633B";
const MUTED = theme.premium?.colors?.muted || theme.colors.muted;
const TEXT = theme.premium?.colors?.text || theme.colors.text;
const CARD_BORDER =
  theme.premium?.colors?.cardBorder || "rgba(15, 23, 42, 0.08)";

function formatEventDateParts(startAt) {
  if (!startAt) {
    return {
      day: "TBC",
      month: "DATE",
      full: "Date TBC",
      time: "Time TBC",
    };
  }

  try {
    const d = new Date(startAt);

    return {
      day: d.toLocaleDateString(undefined, { day: "numeric" }),
      month: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
      full: d.toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
      time: d.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  } catch {
    return {
      day: "TBC",
      month: "DATE",
      full: "Date TBC",
      time: "Time TBC",
    };
  }
}

function formatCompactDate(value) {
  if (!value) return "Date TBC";

  try {
    const d = new Date(value);

    return d.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return "Date TBC";
  }
}

function formatCompactTime(value) {
  if (!value) return "Time TBC";

  try {
    const d = new Date(value);

    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Time TBC";
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

function getDaysBetween(startAt, endAt) {
  if (!startAt || !endAt) return 0;

  try {
    const start = new Date(startAt);
    const end = new Date(endAt);
    const diffMs = end.getTime() - start.getTime();

    if (diffMs <= 0) return 0;

    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

function isProgrammeEvent(event) {
  if (event?.event_type === "course_programme") return true;

  const title = String(event?.title || "").toLowerCase();
  const description = String(event?.description || "").toLowerCase();
  const days = getDaysBetween(event?.start_at, event?.end_at);

  if (
    title.includes("alpha") ||
    title.includes("course") ||
    title.includes("programme") ||
    title.includes("program") ||
    description.includes("alpha") ||
    description.includes("course") ||
    description.includes("weekly") ||
    description.includes("programme")
  ) {
    return true;
  }

  return days >= 7;
}

function isWeeklyProgramme(event) {
  return (
    event?.event_type === "course_programme" &&
    event?.repeat_type === "weekly"
  );
}

function getProgrammeDurationLabel(event) {
  const days = getDaysBetween(event?.start_at, event?.end_at);

  if (!days || days < 2) return null;

  const weeks = Math.round(days / 7);

  if (weeks >= 2) {
    return `Runs across ${weeks} weeks`;
  }

  return `Runs across ${days} days`;
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

function getNextWeeklySession(event) {
  if (!event?.start_at || !event?.end_at) return null;

  try {
    const start = new Date(event.start_at);
    const end = new Date(event.end_at);
    const now = new Date();

    if (now <= start) {
      return start;
    }

    if (now > end) {
      return null;
    }

    const next = new Date(start);

    while (next < now && next <= end) {
      next.setDate(next.getDate() + 7);
    }

    if (next > end) return null;

    return next;
  } catch {
    return null;
  }
}

function getAttendanceLabel(event) {
  if (event?.attendance_method === "registration_required") {
    return "Registration";
  }

  if (event?.attendance_method === "external_registration") {
    return "External sign-up";
  }

  if (event?.attendance_method === "invite_only") {
    return "Invite-only";
  }

  return null;
}

function getEventCardDateMeta(event) {
  const programme = isProgrammeEvent(event);
  const weeklyProgramme = isWeeklyProgramme(event);
  const sameDay = isSameCalendarDay(event?.start_at, event?.end_at);
  const durationLabel = getProgrammeDurationLabel(event);
  const weekdayName = getWeekdayNameFromNumber(event?.repeat_day);

  if (!programme) {
    const date = formatEventDateParts(event?.start_at);

    return {
      badgeLabel: "Upcoming event",
      icon: "time-outline",
      mainLine: `${date.full} · ${date.time}`,
      subLine: null,
      dateBadgeDate: event?.start_at,
      durationLabel: null,
      programme: false,
      weeklyProgramme: false,
    };
  }

  if (weeklyProgramme) {
    const nextSession = getNextWeeklySession(event);
    const now = new Date();
    const start = event?.start_at ? new Date(event.start_at) : null;
    const hasStarted = start ? now > start : false;

    if (nextSession) {
      return {
        badgeLabel: hasStarted ? "Active course" : "Course / programme",
        icon: "school-outline",
        mainLine: hasStarted
          ? `Next session ${formatCompactDate(nextSession)} · ${formatCompactTime(
              nextSession
            )}`
          : `Starts ${formatCompactDate(nextSession)} · ${formatCompactTime(
              nextSession
            )}`,
        subLine: event?.end_at
          ? `Weekly${
              weekdayName ? ` on ${weekdayName}` : ""
            } · Runs until ${formatCompactDate(
              event.end_at
            )} · ${formatCompactTime(event.end_at)}`
          : durationLabel,
        dateBadgeDate: nextSession,
        durationLabel,
        programme: true,
        weeklyProgramme: true,
      };
    }

    if (event?.end_at && now > new Date(event.end_at)) {
      return {
        badgeLabel: "Completed",
        icon: "checkmark-circle-outline",
        mainLine: `Ended ${formatCompactDate(event.end_at)} · ${formatCompactTime(
          event.end_at
        )}`,
        subLine: durationLabel,
        dateBadgeDate: event.end_at,
        durationLabel,
        programme: true,
        weeklyProgramme: true,
      };
    }
  }

  if (!sameDay && event?.end_at) {
    return {
      badgeLabel: "Course / programme",
      icon: "school-outline",
      mainLine: `${formatCompactDate(event.start_at)} - ${formatCompactDate(
        event.end_at
      )}`,
      subLine: durationLabel,
      dateBadgeDate: event.start_at,
      durationLabel,
      programme: true,
      weeklyProgramme: false,
    };
  }

  const date = formatEventDateParts(event?.start_at);

  return {
    badgeLabel: "Course / programme",
    icon: "school-outline",
    mainLine: `${date.full} · ${date.time}`,
    subLine: durationLabel,
    dateBadgeDate: event?.start_at,
    durationLabel,
    programme: true,
    weeklyProgramme: false,
  };
}

function visibilityLabel(value) {
  if (value === "church") return "Church";
  if (value === "invite_only") return "Invite-only";
  return "Public";
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

  if (title.includes("meal") || title.includes("food")) {
    return "restaurant-outline";
  }

  if (title.includes("prayer")) return "hand-left-outline";
  if (title.includes("alpha") || title.includes("course")) return "school-outline";

  return "sparkles-outline";
}

function countGoing(event) {
  const attendees = Array.isArray(event?.event_attendees)
    ? event.event_attendees
    : [];

  return attendees.filter((a) => a.status === "going").length;
}

function EventPosterCard({ event, onPress }) {
  const cardMeta = getEventCardDateMeta(event);
  const date = formatEventDateParts(cardMeta.dateBadgeDate || event?.start_at);
  const eventImageUrl = getEventImageUrl(event) || getFallbackEventImage(event);
  const eventIcon = cardMeta.programme ? "school-outline" : getEventIcon(event);
  const attendanceLabel = getAttendanceLabel(event);

  const church = Array.isArray(event?.churches)
    ? event?.churches?.[0]
    : event?.churches;

  const churchName = church?.display_name || church?.name || null;

  const location =
    event?.location_name ||
    event?.location_address ||
    (event?.online_url ? "Online" : "Location TBC");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: 28,
        overflow: "hidden",
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.94)",
        shadowColor: "#000",
        shadowOpacity: pressed ? 0.08 : 0.14,
        shadowRadius: pressed ? 10 : 15,
        shadowOffset: { width: 0, height: pressed ? 3 : 7 },
        elevation: pressed ? 2 : 5,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <View
        style={{
          height: 172,
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
            top: -38,
            right: -30,
            width: 124,
            height: 124,
            borderRadius: 62,
            backgroundColor: "rgba(255,255,255,0.16)",
          }}
        />

        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: -48,
            left: -36,
            width: 140,
            height: 140,
            borderRadius: 70,
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
            numberOfLines={1}
          >
            {date.day}
          </Text>

          <Text
            style={{
              color: EVENT_AMBER,
              fontSize: 10.5,
              fontWeight: "900",
              letterSpacing: 0.5,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {date.month}
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
              marginBottom: 9,
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
                {cardMeta.badgeLabel}
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
                {visibilityLabel(event?.visibility)}
              </Text>
            </View>
          </View>

          <Text
            style={{
              color: "#fff",
              fontFamily: theme.fonts?.display,
              fontSize: 29,
              fontWeight: "900",
              lineHeight: 33,
              letterSpacing: -0.45,
            }}
            numberOfLines={2}
          >
            {event?.title || "Untitled event"}
          </Text>
        </View>
      </View>

      <View
        style={{
          paddingHorizontal: 15,
          paddingVertical: 14,
          backgroundColor: WHITE,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            marginBottom: cardMeta.subLine ? 6 : 9,
          }}
        >
          <Ionicons
            name={cardMeta.icon}
            size={16}
            color={EVENT_AMBER}
            style={{ marginTop: 1 }}
          />

          <View style={{ flex: 1, marginLeft: 7 }}>
            <Text
              style={{
                color: EVENT_AMBER,
                fontSize: 13,
                fontWeight: "900",
                lineHeight: 18,
              }}
              numberOfLines={2}
            >
              {cardMeta.mainLine}
            </Text>

            {cardMeta.subLine ? (
              <Text
                style={{
                  color: MUTED,
                  fontSize: 12.5,
                  fontWeight: "800",
                  lineHeight: 17,
                  marginTop: 2,
                }}
                numberOfLines={2}
              >
                {cardMeta.subLine}
              </Text>
            ) : null}
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            marginBottom: churchName ? 9 : 0,
          }}
        >
          <Ionicons
            name="location-outline"
            size={16}
            color={OLIVE}
            style={{ marginTop: 1 }}
          />

          <Text
            style={{
              flex: 1,
              color: MUTED,
              fontSize: 13,
              fontWeight: "750",
              lineHeight: 18,
              marginLeft: 7,
            }}
            numberOfLines={2}
          >
            {location}
          </Text>
        </View>

        {churchName ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons name="business-outline" size={16} color={OLIVE} />

            <Text
              style={{
                flex: 1,
                color: MUTED,
                fontSize: 13,
                fontWeight: "750",
                marginLeft: 7,
              }}
              numberOfLines={1}
            >
              Hosted by {churchName}
            </Text>
          </View>
        ) : null}

        <View
          style={{
            marginTop: 13,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: "rgba(15, 23, 42, 0.07)",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              flex: 1,
              paddingRight: 8,
            }}
          >
            {cardMeta.programme ? (
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: "rgba(124, 45, 18, 0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(124, 45, 18, 0.16)",
                }}
              >
                <Text
                  style={{
                    color: EVENT_BROWN,
                    fontSize: 11.5,
                    fontWeight: "900",
                  }}
                >
                  Course
                </Text>
              </View>
            ) : null}

            {attendanceLabel ? (
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: "rgba(79, 99, 59, 0.09)",
                  borderWidth: 1,
                  borderColor: "rgba(79, 99, 59, 0.14)",
                }}
              >
                <Text
                  style={{
                    color: OLIVE,
                    fontSize: 11.5,
                    fontWeight: "900",
                  }}
                >
                  {attendanceLabel}
                </Text>
              </View>
            ) : null}

            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: "rgba(180, 83, 9, 0.10)",
                borderWidth: 1,
                borderColor: "rgba(180, 83, 9, 0.18)",
              }}
            >
              <Text
                style={{
                  color: EVENT_AMBER,
                  fontSize: 11.5,
                  fontWeight: "900",
                }}
              >
                {countGoing(event)} going
              </Text>
            </View>

            {event?.status === "cancelled" ? (
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: "rgba(153, 27, 27, 0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(153, 27, 27, 0.18)",
                }}
              >
                <Text
                  style={{
                    color: "#991B1B",
                    fontSize: 11.5,
                    fontWeight: "900",
                  }}
                >
                  Cancelled
                </Text>
              </View>
            ) : null}
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: OLIVE,
                fontSize: 12.5,
                fontWeight: "900",
                marginRight: 4,
              }}
            >
              View
            </Text>

            <Ionicons name="chevron-forward" size={16} color={OLIVE} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function EventsScreen({ route, navigation }) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("upcoming");

  const adminMode = route?.params?.adminMode === true;
  const churchId = route?.params?.churchId || null;
  const churchName = route?.params?.churchName || null;
  const scopedToChurch = Boolean(churchId);
  const canGoBack = navigation.canGoBack();

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);

      const uid = await getCurrentUserId();
      setCurrentUserId(uid);

      const res = churchId
        ? await fetchUpcomingEventsForChurch({
            churchId,
            limit: 50,
            includeInviteOnly: adminMode === true,
          })
        : await fetchUpcomingEvents({ limit: 50 });

      if (!res.ok) {
        Alert.alert("Events", res.error || "Could not load events.");
        setEvents([]);
        return;
      }

      setEvents(res.events || []);
    } catch (e) {
      console.log("EventsScreen load error:", e);
      Alert.alert("Events", "Could not load events right now.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [adminMode, churchId]);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  const filteredEvents = (() => {
    if (activeFilter === "public") {
      return events.filter((e) => e.visibility === "public");
    }

    if (activeFilter === "church") {
      return events.filter((e) => e.visibility === "church");
    }

    if (activeFilter === "invites") {
      return events.filter((e) => {
        const invites = Array.isArray(e.event_invites) ? e.event_invites : [];
        return invites.some((i) => i.invited_user_id === currentUserId);
      });
    }

    return events;
  })();

  return (
    <Screen backgroundColor={CREAM} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: bottomPad + 22,
          }}
        >
            {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            {canGoBack ? (
              <Pressable
                onPress={() => navigation.goBack()}
                hitSlop={10}
                style={({ pressed }) => ({
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: WHITE,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <Ionicons name="chevron-back" size={22} color={TEXT} />
              </Pressable>
            ) : null}

            <View style={{ flex: 1, paddingRight: 14 }}>
              <Text
                style={{
                  ...(theme.premium?.text?.screenTitle || theme.text.h1),
                  fontSize: 34,
                  lineHeight: 38,
                }}
                numberOfLines={1}
              >
                {adminMode
                  ? "Upcoming Events"
                  : scopedToChurch && churchName
                  ? `${churchName} Events`
                  : "Events"}
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 13.5,
                  fontWeight: "700",
                  lineHeight: 19,
                  marginTop: 4,
                }}
                numberOfLines={2}
              >
                {adminMode
                  ? churchName
                    ? `Manage upcoming events for ${churchName}.`
                    : "Manage upcoming church events."
                  : scopedToChurch && churchName
                  ? `Upcoming services, courses and gatherings from ${churchName}.`
                  : "Gatherings, church events and moments worth showing up for."}
              </Text>
            </View>

            {!adminMode && !scopedToChurch ? (
              <Pressable
                onPress={() => navigation.navigate("CreateEvent")}
                hitSlop={10}
                style={({ pressed }) => ({
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: pressed
                    ? "rgba(180, 83, 9, 0.88)"
                    : EVENT_AMBER,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: EVENT_AMBER,
                  shadowOpacity: pressed ? 0.12 : 0.22,
                  shadowRadius: pressed ? 6 : 10,
                  shadowOffset: { width: 0, height: pressed ? 2 : 4 },
                  elevation: pressed ? 2 : 4,
                })}
              >
                <Ionicons name="add" size={25} color="#fff" />
              </Pressable>
            ) : null}
          </View>

          {/* Filters */}
          <View
            style={{
              borderBottomWidth: 1,
              borderBottomColor: "rgba(15, 23, 42, 0.10)",
              marginBottom: 16,
            }}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 0 }}
            >
              {[
                { key: "upcoming", label: "Upcoming" },
                { key: "public", label: "Public" },
                { key: "church", label: "Church" },
                { key: "invites", label: "Invites" },
              ].map((f) => {
                const active = activeFilter === f.key;

                return (
                  <Pressable
                    key={f.key}
                    onPress={() => setActiveFilter(f.key)}
                    style={({ pressed }) => ({
                      paddingTop: 8,
                      paddingBottom: 11,
                      paddingHorizontal: 4,
                      marginRight: 24,
                      opacity: pressed ? 0.72 : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: active ? EVENT_AMBER : OLIVE,
                        fontWeight: active ? "900" : "800",
                        fontSize: 13.5,
                      }}
                    >
                      {f.label}
                    </Text>

                    <View
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: -1,
                        height: active ? 3 : 0,
                        borderRadius: 999,
                        backgroundColor: active ? EVENT_AMBER : "transparent",
                        shadowColor: EVENT_AMBER,
                        shadowOpacity: active ? 0.28 : 0,
                        shadowRadius: active ? 5 : 0,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: active ? 2 : 0,
                      }}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 36, alignItems: "center" }}>
              <ActivityIndicator color={EVENT_AMBER} />

              <Text
                style={{
                  color: MUTED,
                  marginTop: 9,
                  fontWeight: "800",
                }}
              >
                Loading events…
              </Text>
            </View>
          ) : filteredEvents.length === 0 ? (
            <View
              style={{
                backgroundColor: WHITE,
                borderRadius: 24,
                padding: 18,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                shadowColor: "rgba(15, 23, 42, 0.08)",
                shadowOpacity: 0.1,
                shadowRadius: 9,
                shadowOffset: { width: 0, height: 4 },
                elevation: 2,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: "rgba(180, 83, 9, 0.10)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Ionicons
                  name="calendar-outline"
                  size={23}
                  color={EVENT_AMBER}
                />
              </View>

              <Text
                style={{
                  color: TEXT,
                  fontFamily: theme.fonts?.display,
                  fontWeight: "900",
                  fontSize: 22,
                }}
              >
                No events yet
              </Text>

              <Text
                style={{
                  color: MUTED,
                  marginTop: 8,
                  lineHeight: 20,
                  fontWeight: "700",
                }}
              >
                Events you can see will appear here. Create one, or check back
                when your church posts a gathering.
              </Text>

              <Pressable
                onPress={() => navigation.navigate("CreateEvent")}
                style={({ pressed }) => ({
                  marginTop: 15,
                  alignSelf: "flex-start",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: pressed
                    ? "rgba(180, 83, 9, 0.88)"
                    : EVENT_AMBER,
                  flexDirection: "row",
                  alignItems: "center",
                  shadowColor: EVENT_AMBER,
                  shadowOpacity: pressed ? 0.08 : 0.16,
                  shadowRadius: pressed ? 4 : 8,
                  shadowOffset: { width: 0, height: pressed ? 1 : 3 },
                  elevation: pressed ? 1 : 3,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <Ionicons name="add" size={18} color="#fff" />

                <Text
                  style={{
                    color: "#fff",
                    fontWeight: "900",
                    marginLeft: 6,
                  }}
                >
                  Create event
                </Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <View
                style={{
                  marginBottom: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text
                    style={{
                      color: TEXT,
                      fontFamily: theme.fonts?.display,
                      fontSize: 22,
                      fontWeight: "900",
                      letterSpacing: -0.2,
                    }}
                  >
                    Most recent
                  </Text>

                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 12.5,
                      fontWeight: "700",
                      marginTop: 2,
                    }}
                  >
                    Latest upcoming events, shown first
                  </Text>
                </View>

                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: "rgba(180, 83, 9, 0.10)",
                    borderWidth: 1,
                    borderColor: "rgba(180, 83, 9, 0.18)",
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="flash-outline" size={13} color={EVENT_AMBER} />

                  <Text
                    style={{
                      color: EVENT_AMBER,
                      fontSize: 11.5,
                      fontWeight: "900",
                      marginLeft: 5,
                    }}
                  >
                    {filteredEvents.length}
                  </Text>
                </View>
              </View>

              <View style={{ gap: 16 }}>
                {filteredEvents.map((event, index) => (
                  <View key={event.id}>
                    {index === 0 ? (
                      <View
                        style={{
                          alignSelf: "flex-start",
                          marginBottom: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 999,
                          backgroundColor: "rgba(79, 99, 59, 0.10)",
                          borderWidth: 1,
                          borderColor: "rgba(79, 99, 59, 0.16)",
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons name="pin-outline" size={13} color={OLIVE} />

                        <Text
                          style={{
                            color: OLIVE,
                            fontSize: 11.5,
                            fontWeight: "900",
                            marginLeft: 5,
                          }}
                        >
                          Pinned first
                        </Text>
                      </View>
                    ) : null}

                    <EventPosterCard
                      event={event}
                      onPress={() =>
                        navigation.navigate("EventDetails", {
                          eventId: event.id,
                          event,
                        })
                      }
                    />
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}