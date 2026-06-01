// src/screens/ChurchEventRegistrations.js
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";

import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";
import { navigateToAvailableRoute } from "../navigation/navigationHelpers";
import { theme } from "../theme/theme";

const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const DANGER_RED = "#991B1B";
const CREAM = theme.premium?.colors?.cream || "#FFFCF5";
const WHITE = theme.premium?.colors?.surface || "#FFFFFF";
const OLIVE = theme.premium?.colors?.olive || "#4F633B";
const MUTED = theme.premium?.colors?.muted || theme.colors.muted;
const TEXT = theme.premium?.colors?.text || theme.colors.text;
const CARD_BORDER =
  theme.premium?.colors?.cardBorder || "rgba(15, 23, 42, 0.08)";

function normaliseStatus(value) {
  const status = String(value || "new").toLowerCase().trim();

  if (status === "confirmed") return "confirmed";
  if (status === "contacted") return "contacted";
  if (status === "cancelled" || status === "canceled") return "cancelled";

  return "new";
}

function getEventTitle(event) {
  return (
    event?.title ||
    event?.name ||
    event?.event_title ||
    event?.summary ||
    "Untitled event"
  );
}

function getEventDateLabel(event) {
  const raw =
    event?.start_at ||
    event?.starts_at ||
    event?.start_time ||
    event?.start_date ||
    event?.event_date ||
    event?.date ||
    event?.created_at ||
    null;

  if (!raw) return "Date not set";

  try {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return String(raw);

    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(raw);
  }
}

function getEventLocation(event) {
  return (
    event?.location_name ||
    event?.location_address ||
    event?.location ||
    event?.venue ||
    event?.address ||
    "Location not set"
  );
}

function getQuestionCount(event) {
  return Array.isArray(event?.registration_questions)
    ? event.registration_questions.length
    : 0;
}

function StatCard({ icon, label, value, tint = "event" }) {
  const isOlive = tint === "olive";
  const isDanger = tint === "danger";
  const accent = isDanger ? DANGER_RED : isOlive ? OLIVE : EVENT_AMBER;

  return (
    <View
      style={{
        flex: 1,
        minWidth: "46%",
        backgroundColor: WHITE,
        borderRadius: 22,
        padding: 14,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        shadowColor: accent,
        shadowOpacity: 0.08,
        shadowRadius: 9,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: isDanger
            ? "rgba(153, 27, 27, 0.08)"
            : isOlive
            ? "rgba(79, 99, 59, 0.10)"
            : "rgba(180, 83, 9, 0.10)",
          borderWidth: 1,
          borderColor: isDanger
            ? "rgba(153, 27, 27, 0.14)"
            : isOlive
            ? "rgba(79, 99, 59, 0.16)"
            : "rgba(180, 83, 9, 0.16)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 9,
        }}
      >
        <Ionicons name={icon} size={18} color={accent} />
      </View>

      <Text
        style={{
          color: TEXT,
          fontSize: 22,
          fontWeight: "900",
          letterSpacing: -0.4,
        }}
      >
        {value}
      </Text>

      <Text
        style={{
          color: MUTED,
          fontSize: 11.5,
          fontWeight: "800",
          lineHeight: 16,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function StatusChip({ label, value, tint = "event" }) {
  const isOlive = tint === "olive";
  const isDanger = tint === "danger";
  const accent = isDanger ? DANGER_RED : isOlive ? OLIVE : EVENT_AMBER;

  return (
    <View
      style={{
        paddingHorizontal: 9,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: isDanger
          ? "rgba(153, 27, 27, 0.08)"
          : isOlive
          ? "rgba(79, 99, 59, 0.08)"
          : "rgba(180, 83, 9, 0.08)",
        borderWidth: 1,
        borderColor: isDanger
          ? "rgba(153, 27, 27, 0.14)"
          : isOlive
          ? "rgba(79, 99, 59, 0.14)"
          : "rgba(180, 83, 9, 0.14)",
      }}
    >
      <Text
        style={{
          color: accent,
          fontSize: 11,
          fontWeight: "900",
        }}
      >
        {value} {label}
      </Text>
    </View>
  );
}

function EventAdminCard({ event, registrations, onPress }) {
  const total = registrations.length;

  const newCount = registrations.filter(
    (row) => normaliseStatus(row?.status) === "new"
  ).length;

  const contactedCount = registrations.filter(
    (row) => normaliseStatus(row?.status) === "contacted"
  ).length;

  const confirmedCount = registrations.filter(
    (row) => normaliseStatus(row?.status) === "confirmed"
  ).length;

  const cancelledCount = registrations.filter(
    (row) => normaliseStatus(row?.status) === "cancelled"
  ).length;

  const needsFollowUp = newCount + contactedCount;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: WHITE,
        borderRadius: 26,
        padding: 16,
        marginBottom: 13,
        borderWidth: 1,
        borderColor: "rgba(180, 83, 9, 0.16)",
        shadowColor: EVENT_AMBER,
        shadowOpacity: pressed ? 0.06 : 0.1,
        shadowRadius: pressed ? 8 : 12,
        shadowOffset: { width: 0, height: pressed ? 2 : 5 },
        elevation: pressed ? 2 : 3,
        overflow: "hidden",
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -44,
          right: -38,
          width: 130,
          height: 130,
          borderRadius: 65,
          backgroundColor: "rgba(180, 83, 9, 0.08)",
        }}
      />

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: "rgba(180, 83, 9, 0.10)",
            borderWidth: 1,
            borderColor: "rgba(180, 83, 9, 0.18)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name="calendar-clear-outline"
            size={23}
            color={EVENT_AMBER}
          />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              color: TEXT,
              fontSize: 17,
              fontWeight: "900",
              letterSpacing: -0.25,
              lineHeight: 22,
            }}
            numberOfLines={2}
          >
            {getEventTitle(event)}
          </Text>

          <Text
            style={{
              color: EVENT_BROWN,
              fontSize: 12.5,
              fontWeight: "900",
              lineHeight: 18,
              marginTop: 5,
            }}
          >
            {getEventDateLabel(event)}
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 12.5,
              fontWeight: "700",
              lineHeight: 18,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {getEventLocation(event)}
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 14,
        }}
      >
        <StatusChip label="registered" value={total} />
        <StatusChip label="new" value={newCount} />
        <StatusChip label="needs follow-up" value={needsFollowUp} tint="danger" />
        <StatusChip label="confirmed" value={confirmedCount} tint="olive" />
      </View>

      <View
        style={{
          marginTop: 14,
          padding: 12,
          borderRadius: 18,
          backgroundColor: "rgba(79, 99, 59, 0.07)",
          borderWidth: 1,
          borderColor: "rgba(79, 99, 59, 0.12)",
        }}
      >
        <Text
          style={{
            color: OLIVE,
            fontSize: 12.5,
            fontWeight: "900",
          }}
        >
          Registration setup
        </Text>

        <Text
          style={{
            color: MUTED,
            fontSize: 12,
            fontWeight: "700",
            lineHeight: 17,
            marginTop: 4,
          }}
        >
          {getQuestionCount(event)} custom question
          {getQuestionCount(event) === 1 ? "" : "s"} · {contactedCount} contacted
          · {cancelledCount} cancelled
        </Text>
      </View>

      <View
        style={{
          marginTop: 13,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            color: MUTED,
            fontSize: 11.5,
            fontWeight: "800",
          }}
        >
          Open registration list
        </Text>

        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(180, 83, 9, 0.10)",
            borderWidth: 1,
            borderColor: "rgba(180, 83, 9, 0.16)",
          }}
        >
          <Ionicons name="chevron-forward" size={15} color={EVENT_AMBER} />
        </View>
      </View>
    </Pressable>
  );
}

function EmptyStateCard({ errorText }) {
  return (
    <View
      style={{
        backgroundColor: WHITE,
        borderRadius: 28,
        padding: 18,
        borderWidth: 1,
        borderColor: errorText
          ? "rgba(153, 27, 27, 0.18)"
          : "rgba(180, 83, 9, 0.16)",
        shadowColor: errorText ? DANGER_RED : EVENT_AMBER,
        shadowOpacity: 0.1,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
        overflow: "hidden",
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -42,
          right: -38,
          width: 130,
          height: 130,
          borderRadius: 65,
          backgroundColor: errorText
            ? "rgba(153, 27, 27, 0.07)"
            : "rgba(180, 83, 9, 0.09)",
        }}
      />

      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: errorText
            ? "rgba(153, 27, 27, 0.08)"
            : "rgba(180, 83, 9, 0.11)",
          borderWidth: 1,
          borderColor: errorText
            ? "rgba(153, 27, 27, 0.16)"
            : "rgba(180, 83, 9, 0.20)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 13,
        }}
      >
        <Ionicons
          name={errorText ? "warning-outline" : "calendar-clear-outline"}
          size={25}
          color={errorText ? DANGER_RED : EVENT_AMBER}
        />
      </View>

      <Text
        style={{
          color: TEXT,
          fontSize: 22,
          fontWeight: "900",
          letterSpacing: -0.45,
          lineHeight: 27,
        }}
      >
        {errorText ? "Could not load registrations" : "No registration events yet"}
      </Text>

      <Text
        style={{
          color: MUTED,
          fontSize: 13.5,
          fontWeight: "700",
          lineHeight: 20,
          marginTop: 8,
        }}
      >
        {errorText ||
          "When this church creates events with registration enabled, they will appear here for admin follow-up, custom answers and attendance preparation."}
      </Text>
    </View>
  );
}

export default function ChurchEventRegistrations({ route, navigation }) {
  const { churchId, churchName } = route?.params || {};
  const name = churchName || "Church";

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadData() {
      if (!churchId) {
        setLoading(false);
        setErrorText("Missing church ID. Go back and reopen Ministry Operations.");
        return;
      }

      try {
        setLoading(true);
        setErrorText("");

        const { data: eventRows, error: eventsError } = await supabase
          .from("events")
          .select("*")
          .eq("church_id", churchId)
          .eq("registration_enabled", true)
          .order("created_at", { ascending: false });

        if (eventsError) throw eventsError;

        const safeEvents = Array.isArray(eventRows) ? eventRows : [];
        const eventIds = safeEvents.map((event) => event.id).filter(Boolean);

        let registrationRows = [];

        if (eventIds.length > 0) {
          const { data, error } = await supabase
            .from("event_registrations")
            .select("*")
            .in("event_id", eventIds)
            .order("created_at", { ascending: false });

          if (error) throw error;

          registrationRows = Array.isArray(data) ? data : [];
        }

        if (!alive) return;

        setEvents(safeEvents);
        setRegistrations(registrationRows);
      } catch (e) {
        console.log("ChurchEventRegistrations load error:", e);

        if (!alive) return;

        setEvents([]);
        setRegistrations([]);
        setErrorText(
          e?.message ||
            "Something went wrong while loading events and registrations."
        );
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadData();

    return () => {
      alive = false;
    };
  }, [churchId]);

  const registrationsByEventId = useMemo(() => {
    const grouped = {};

    for (const row of registrations || []) {
      const eventId = row?.event_id;
      if (!eventId) continue;

      if (!grouped[eventId]) grouped[eventId] = [];
      grouped[eventId].push(row);
    }

    return grouped;
  }, [registrations]);

  const stats = useMemo(() => {
    const totalRegistrations = registrations.length;

    const newRegistrations = registrations.filter(
      (row) => normaliseStatus(row?.status) === "new"
    ).length;

    const contactedRegistrations = registrations.filter(
      (row) => normaliseStatus(row?.status) === "contacted"
    ).length;

    const confirmedRegistrations = registrations.filter(
      (row) => normaliseStatus(row?.status) === "confirmed"
    ).length;

    return {
      eventCount: events.length,
      totalRegistrations,
      needsFollowUp: newRegistrations + contactedRegistrations,
      confirmedRegistrations,
    };
  }, [events, registrations]);

function openRegistrationList(event) {
  navigateToAvailableRoute(navigation, "ChurchEventRegistrationList", {
    churchId,
    churchName: name,
    eventId: event.id,
    eventTitle: getEventTitle(event),
  });
}

  return (
    <Screen backgroundColor={CREAM} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: bottomPad + 24,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 18,
            }}
          >
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={12}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: pressed ? "rgba(255,255,255,0.76)" : WHITE,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 13,
                shadowColor: "rgba(15, 23, 42, 0.08)",
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
                  ...(theme.premium?.text?.screenTitle || theme.text.h1),
                  color: TEXT,
                  fontSize: 30,
                  lineHeight: 34,
                  fontWeight: "900",
                  letterSpacing: -0.5,
                }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                Events & Registrations
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 13,
                  fontWeight: "700",
                  lineHeight: 18,
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {name}
              </Text>
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <StatCard
              icon="calendar-outline"
              value={stats.eventCount}
              label="Registration events"
            />
            <StatCard
              icon="person-add-outline"
              value={stats.totalRegistrations}
              label="Total registrations"
            />
            <StatCard
              icon="alert-circle-outline"
              value={stats.needsFollowUp}
              label="Needs follow-up"
              tint="danger"
            />
            <StatCard
              icon="checkmark-circle-outline"
              value={stats.confirmedRegistrations}
              label="Confirmed"
              tint="olive"
            />
          </View>

          {loading ? (
            <View
              style={{
                backgroundColor: WHITE,
                borderRadius: 26,
                padding: 22,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                alignItems: "center",
                justifyContent: "center",
                minHeight: 150,
              }}
            >
              <ActivityIndicator size="large" color={EVENT_AMBER} />

              <Text
                style={{
                  color: MUTED,
                  fontWeight: "800",
                  marginTop: 10,
                }}
              >
                Loading registration events…
              </Text>
            </View>
          ) : errorText || events.length === 0 ? (
            <EmptyStateCard errorText={errorText} />
          ) : (
            <View>
              <Text
                style={{
                  color: EVENT_BROWN,
                  fontSize: 11.5,
                  fontWeight: "900",
                  textTransform: "uppercase",
                  letterSpacing: 0.55,
                  marginBottom: 9,
                }}
              >
                Registration events
              </Text>

              {events.map((event) => (
                <EventAdminCard
                  key={event.id}
                  event={event}
                  registrations={registrationsByEventId[event.id] || []}
                  onPress={() => openRegistrationList(event)}
                />
              ))}
            </View>
          )}

          <View
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 22,
              backgroundColor: "rgba(180, 83, 9, 0.08)",
              borderWidth: 1,
              borderColor: "rgba(180, 83, 9, 0.14)",
            }}
          >
            <Text
              style={{
                color: EVENT_BROWN,
                fontWeight: "900",
                fontSize: 14,
              }}
            >
              Current build step
            </Text>

            <Text
              style={{
                color: MUTED,
                fontWeight: "700",
                lineHeight: 19,
                marginTop: 6,
              }}
            >
              This screen now loads registration-enabled church events and their
              registration counts. Next we will open each event into a full
              registration list.
            </Text>
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}