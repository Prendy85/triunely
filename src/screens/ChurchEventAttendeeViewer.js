// src/screens/ChurchEventAttendeeViewer.js
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";
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

function normaliseAgeGroup(value) {
  if (value === "child") return "child";
  return "adult";
}

function getAgeGroupLabel(value) {
  return normaliseAgeGroup(value) === "child"
    ? "Child under 17"
    : "Adult 18+";
}

function normaliseStatus(value) {
  const status = String(value || "new").toLowerCase().trim();

  if (status === "confirmed") return "confirmed";
  if (status === "contacted") return "contacted";
  if (status === "cancelled" || status === "canceled") return "cancelled";

  return "new";
}

function getStatusLabel(value) {
  const status = normaliseStatus(value);

  if (status === "confirmed") return "Confirmed";
  if (status === "contacted") return "Contacted";
  if (status === "cancelled") return "Cancelled";

  return "New";
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

function FilterChip({ label, active, onPress, tint = "event" }) {
  const accent = tint === "olive" ? OLIVE : EVENT_AMBER;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: active ? accent : "rgba(15, 23, 42, 0.08)",
        backgroundColor: active
          ? tint === "olive"
            ? "rgba(79, 99, 59, 0.08)"
            : "rgba(180, 83, 9, 0.09)"
          : WHITE,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <Text
        style={{
          color: active ? accent : MUTED,
          fontSize: 12,
          fontWeight: "900",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function AttendeeRow({ attendee }) {
  const ageGroup = normaliseAgeGroup(attendee?.age_group);
  const isChild = ageGroup === "child";

  return (
    <View
      style={{
        backgroundColor: WHITE,
        borderRadius: 22,
        padding: 14,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        marginBottom: 10,
        shadowColor: isChild ? EVENT_AMBER : OLIVE,
        shadowOpacity: 0.07,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 11 }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: isChild
              ? "rgba(180, 83, 9, 0.10)"
              : "rgba(79, 99, 59, 0.10)",
            borderWidth: 1,
            borderColor: isChild
              ? "rgba(180, 83, 9, 0.17)"
              : "rgba(79, 99, 59, 0.16)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={isChild ? "happy-outline" : "person-outline"}
            size={20}
            color={isChild ? EVENT_AMBER : OLIVE}
          />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              color: TEXT,
              fontSize: 16,
              fontWeight: "900",
              letterSpacing: -0.2,
            }}
            numberOfLines={1}
          >
            {attendee?.name || "Unnamed attendee"}
          </Text>

          <Text
            style={{
              color: isChild ? EVENT_BROWN : OLIVE,
              fontSize: 12.5,
              fontWeight: "900",
              marginTop: 4,
            }}
          >
            {getAgeGroupLabel(ageGroup)}
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 12.5,
              fontWeight: "700",
              lineHeight: 18,
              marginTop: 5,
            }}
            numberOfLines={2}
          >
            Main contact: {attendee?.main_contact_name || "Not provided"}
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 12.5,
              fontWeight: "700",
              lineHeight: 18,
            }}
            numberOfLines={1}
          >
            {attendee?.main_contact_email || "No email"} ·{" "}
            {attendee?.main_contact_phone || "No phone"}
          </Text>

          <Text
            style={{
              color: EVENT_BROWN,
              fontSize: 11.5,
              fontWeight: "900",
              marginTop: 6,
            }}
          >
            Registration status: {getStatusLabel(attendee?.registration_status)}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function ChurchEventAttendeeViewer({ route, navigation }) {
  const { churchId, churchName, eventId, eventTitle } = route?.params || {};

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [errorText, setErrorText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [ageFilter, setAgeFilter] = useState("all");

  useEffect(() => {
    let alive = true;

    async function loadData() {
      if (!eventId) {
        setLoading(false);
        setErrorText("Missing event ID.");
        return;
      }

      try {
        setLoading(true);
        setErrorText("");

        const { data: eventRow, error: eventError } = await supabase
          .from("events")
          .select("*")
          .eq("id", eventId)
          .single();

        if (eventError) throw eventError;

        if (churchId && eventRow?.church_id && eventRow.church_id !== churchId) {
          throw new Error("This event does not belong to the selected church.");
        }

        const { data: registrationRows, error: registrationError } =
          await supabase
            .from("event_registrations")
            .select(
              `
              id,
              event_id,
              name,
              email,
              phone,
              number_attending,
              attendee_details,
              status,
              created_at
            `
            )
            .eq("event_id", eventId)
            .order("created_at", { ascending: false });

        if (registrationError) throw registrationError;

        if (!alive) return;

        setEvent(eventRow || null);
        setRegistrations(
          Array.isArray(registrationRows) ? registrationRows : []
        );
      } catch (e) {
        console.log("ChurchEventAttendeeViewer load error:", e);

        if (!alive) return;

        setEvent(null);
        setRegistrations([]);
        setErrorText(e?.message || "Could not load attendee list.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadData();

    return () => {
      alive = false;
    };
  }, [eventId, churchId]);

  const attendees = useMemo(() => {
    const rows = [];

    registrations.forEach((registration) => {
      rows.push({
        id: `${registration.id}-main`,
        name: registration?.name || "Main contact",
        age_group: "adult",
        attendee_type: "main_contact",
        main_contact_name: registration?.name,
        main_contact_email: registration?.email,
        main_contact_phone: registration?.phone,
        registration_status: registration?.status,
        registration_id: registration?.id,
      });

      const extras = Array.isArray(registration?.attendee_details)
        ? registration.attendee_details
        : [];

      extras.forEach((attendee, index) => {
        rows.push({
          id: `${registration.id}-extra-${index}`,
          name: attendee?.name || `Additional attendee ${index + 1}`,
          age_group: normaliseAgeGroup(attendee?.age_group),
          attendee_type: "additional",
          main_contact_name: registration?.name,
          main_contact_email: registration?.email,
          main_contact_phone: registration?.phone,
          registration_status: registration?.status,
          registration_id: registration?.id,
        });
      });
    });

    return rows;
  }, [registrations]);

  const stats = useMemo(() => {
    const adults = attendees.filter(
      (attendee) => normaliseAgeGroup(attendee?.age_group) === "adult"
    ).length;

    const children = attendees.filter(
      (attendee) => normaliseAgeGroup(attendee?.age_group) === "child"
    ).length;

    return {
      total: attendees.length,
      adults,
      children,
      registrations: registrations.length,
    };
  }, [attendees, registrations]);

  const filteredAttendees = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return attendees.filter((attendee) => {
      const ageGroup = normaliseAgeGroup(attendee?.age_group);

      if (ageFilter !== "all" && ageGroup !== ageFilter) return false;

      if (search) {
        const haystack = [
          attendee?.name,
          attendee?.main_contact_name,
          attendee?.main_contact_email,
          attendee?.main_contact_phone,
          getStatusLabel(attendee?.registration_status),
          getAgeGroupLabel(attendee?.age_group),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(search)) return false;
      }

      return true;
    });
  }, [attendees, searchText, ageFilter]);

  const title = event?.title || eventTitle || "Attendee list";
  const subtitle = churchName || "Church";

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
          keyboardShouldPersistTaps="handled"
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
                  fontSize: 28,
                  lineHeight: 32,
                  fontWeight: "900",
                  letterSpacing: -0.5,
                }}
                numberOfLines={1}
              >
                Attendees
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
                {subtitle}
              </Text>
            </View>
          </View>

          <View
            style={{
              backgroundColor: WHITE,
              borderRadius: 28,
              padding: 17,
              borderWidth: 1,
              borderColor: "rgba(180, 83, 9, 0.16)",
              shadowColor: EVENT_AMBER,
              shadowOpacity: 0.11,
              shadowRadius: 13,
              shadowOffset: { width: 0, height: 6 },
              elevation: 4,
              marginBottom: 16,
              overflow: "hidden",
            }}
          >
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: -42,
                right: -36,
                width: 132,
                height: 132,
                borderRadius: 66,
                backgroundColor: "rgba(180, 83, 9, 0.09)",
              }}
            />

            <View
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: "rgba(180, 83, 9, 0.11)",
                borderWidth: 1,
                borderColor: "rgba(180, 83, 9, 0.20)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Ionicons name="people-outline" size={25} color={EVENT_AMBER} />
            </View>

            <Text
              style={{
                color: TEXT,
                fontSize: 23,
                fontWeight: "900",
                letterSpacing: -0.5,
                lineHeight: 28,
              }}
            >
              {title}
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
              A readable list of everyone attending, including additional
              attendees added to each registration.
            </Text>
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
              icon="people-outline"
              value={stats.total}
              label="Total attendees"
            />
            <StatCard
              icon="person-outline"
              value={stats.adults}
              label="Adults"
              tint="olive"
            />
            <StatCard
              icon="happy-outline"
              value={stats.children}
              label="Children"
            />
            <StatCard
              icon="document-text-outline"
              value={stats.registrations}
              label="Registrations"
            />
          </View>

          <View
            style={{
              backgroundColor: WHITE,
              borderRadius: 26,
              padding: 15,
              borderWidth: 1,
              borderColor: CARD_BORDER,
              marginBottom: 16,
            }}
          >
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search attendee or main contact..."
              placeholderTextColor={MUTED}
              style={{
                borderRadius: 18,
                borderWidth: 1,
                borderColor: "rgba(15, 23, 42, 0.08)",
                backgroundColor: "rgba(255,252,245,0.8)",
                paddingHorizontal: 13,
                paddingVertical: 11,
                color: TEXT,
                fontSize: 14,
                fontWeight: "700",
                marginBottom: 12,
              }}
            />

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <FilterChip
                label="All"
                active={ageFilter === "all"}
                onPress={() => setAgeFilter("all")}
              />

              <FilterChip
                label="Adults"
                active={ageFilter === "adult"}
                onPress={() => setAgeFilter("adult")}
                tint="olive"
              />

              <FilterChip
                label="Children"
                active={ageFilter === "child"}
                onPress={() => setAgeFilter("child")}
              />
            </View>

            <Text
              style={{
                color: MUTED,
                fontSize: 12.5,
                fontWeight: "700",
                lineHeight: 18,
                marginTop: 12,
              }}
            >
              Showing {filteredAttendees.length} of {attendees.length} attendees.
            </Text>
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
                Loading attendees…
              </Text>
            </View>
          ) : errorText ? (
            <View
              style={{
                backgroundColor: WHITE,
                borderRadius: 26,
                padding: 18,
                borderWidth: 1,
                borderColor: "rgba(153, 27, 27, 0.18)",
              }}
            >
              <Text
                style={{
                  color: DANGER_RED,
                  fontSize: 15,
                  fontWeight: "900",
                }}
              >
                {errorText}
              </Text>
            </View>
          ) : filteredAttendees.length === 0 ? (
            <View
              style={{
                backgroundColor: WHITE,
                borderRadius: 26,
                padding: 18,
                borderWidth: 1,
                borderColor: CARD_BORDER,
              }}
            >
              <Text
                style={{
                  color: TEXT,
                  fontSize: 17,
                  fontWeight: "900",
                }}
              >
                No attendees found
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 13,
                  fontWeight: "700",
                  lineHeight: 19,
                  marginTop: 6,
                }}
              >
                Try changing your search or filter.
              </Text>
            </View>
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
                Attendee list
              </Text>

              {filteredAttendees.map((attendee) => (
                <AttendeeRow key={attendee.id} attendee={attendee} />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}