// src/screens/ChurchCourseEdit.js
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
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
const OLIVE = "#4F633B";
const CREAM = theme.premium?.colors?.cream || "#FFFCF5";
const WHITE = theme.premium?.colors?.surface || "#FFFFFF";
const MUTED = theme.premium?.colors?.muted || theme.colors.muted;
const TEXT = theme.premium?.colors?.text || theme.colors.text;
const CARD_BORDER =
  theme.premium?.colors?.cardBorder || "rgba(15, 23, 42, 0.08)";

const TITLE_KEYS = ["title", "name", "course_title", "programme_title"];
const DESCRIPTION_KEYS = ["description", "summary", "details"];
const LOCATION_KEYS = ["location", "venue", "address", "where_text"];
const EVENT_ID_KEYS = [
  "event_id",
  "linked_event_id",
  "source_event_id",
  "origin_event_id",
];

function firstExistingKey(row, keys) {
  if (!row) return null;

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      return key;
    }
  }

  return null;
}

function hasKey(row, key) {
  return Object.prototype.hasOwnProperty.call(row || {}, key);
}

function getValue(row, keys, fallback = "") {
  const key = firstExistingKey(row, keys);

  if (!key) return fallback;

  return row?.[key] || fallback;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toDateInput(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`;
}

function toTimeInput(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function makeLocalIso(dateText, timeText) {
  if (!dateText || !timeText) return null;

  const date = new Date(`${dateText}T${timeText}:00`);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

function formatFriendlyDateTime(value) {
  if (!value) return "Not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSessionTitle(session, index) {
  return (
    session?.title ||
    session?.name ||
    session?.session_title ||
    session?.topic ||
    `Week ${index + 1}`
  );
}

function SectionCard({ icon, title, subtitle, children, tint = "amber" }) {
  const isOlive = tint === "olive";
  const accent = isOlive ? OLIVE : EVENT_AMBER;
  const bg = isOlive ? "rgba(79, 99, 59, 0.10)" : "rgba(180, 83, 9, 0.10)";
  const border = isOlive
    ? "rgba(79, 99, 59, 0.18)"
    : "rgba(180, 83, 9, 0.18)";

  return (
    <View
      style={{
        backgroundColor: WHITE,
        borderRadius: 28,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        shadowColor: accent,
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: bg,
            borderWidth: 1,
            borderColor: border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={23} color={accent} />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: TEXT,
              fontSize: 20,
              fontWeight: "900",
              letterSpacing: -0.4,
              lineHeight: 25,
            }}
          >
            {title}
          </Text>

          {subtitle ? (
            <Text
              style={{
                color: MUTED,
                fontSize: 13.5,
                fontWeight: "700",
                lineHeight: 20,
                marginTop: 5,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {children ? <View style={{ marginTop: 16 }}>{children}</View> : null}
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, multiline = false }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text
        style={{
          color: TEXT,
          fontSize: 13,
          fontWeight: "900",
          marginBottom: 8,
        }}
      >
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={{
          minHeight: multiline ? 120 : undefined,
          backgroundColor: "#FFFCF5",
          borderWidth: 1,
          borderColor: "rgba(15, 23, 42, 0.10)",
          borderRadius: 18,
          paddingHorizontal: 14,
          paddingVertical: 12,
          color: TEXT,
          fontSize: 15,
          fontWeight: multiline ? "700" : "800",
          lineHeight: multiline ? 21 : undefined,
        }}
      />
    </View>
  );
}

function SmallButton({ label, onPress, disabled, tint = "amber", icon }) {
  const isOlive = tint === "olive";
  const accent = disabled ? MUTED : isOlive ? OLIVE : EVENT_BROWN;
  const bg = disabled
    ? "rgba(107, 114, 128, 0.09)"
    : isOlive
      ? "rgba(79, 99, 59, 0.10)"
      : "rgba(180, 83, 9, 0.10)";
  const border = disabled
    ? "rgba(107, 114, 128, 0.15)"
    : isOlive
      ? "rgba(79, 99, 59, 0.18)"
      : "rgba(180, 83, 9, 0.18)";

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flexGrow: 1,
        minWidth: "46%",
        borderRadius: 18,
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: pressed && !disabled ? border : bg,
        borderWidth: 1,
        borderColor: border,
        alignItems: "center",
        opacity: disabled ? 0.72 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
        {icon ? <Ionicons name={icon} size={15} color={accent} /> : null}
        <Text
          style={{
            color: accent,
            fontSize: 12.5,
            fontWeight: "900",
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function ToggleRow({ value, onChange, title, subtitle }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={({ pressed }) => ({
        borderRadius: 20,
        padding: 14,
        backgroundColor: value ? "rgba(79, 99, 59, 0.10)" : "#FFFCF5",
        borderWidth: 1,
        borderColor: value
          ? "rgba(79, 99, 59, 0.22)"
          : "rgba(15, 23, 42, 0.10)",
        opacity: pressed ? 0.85 : 1,
        flexDirection: "row",
        gap: 12,
        alignItems: "flex-start",
      })}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          borderWidth: 2,
          borderColor: value ? OLIVE : "rgba(107, 114, 128, 0.55)",
          backgroundColor: value ? OLIVE : "transparent",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
        }}
      >
        {value ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ color: TEXT, fontSize: 14, fontWeight: "900" }}>
          {title}
        </Text>

        {subtitle ? (
          <Text
            style={{
              color: MUTED,
              fontSize: 12.5,
              fontWeight: "700",
              lineHeight: 18,
              marginTop: 4,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function ChurchCourseEdit({ route, navigation }) {
  const { courseId, churchId, churchName } = route?.params || {};

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [viewerId, setViewerId] = useState(null);
  const [course, setCourse] = useState(null);
  const [linkedEvent, setLinkedEvent] = useState(null);
  const [linkedGroup, setLinkedGroup] = useState(null);

  const [sessions, setSessions] = useState([]);
  const [expandedSessionId, setExpandedSessionId] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  const [announceUpdate, setAnnounceUpdate] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");

  const [errorText, setErrorText] = useState("");

  const titleKey = useMemo(() => firstExistingKey(course, TITLE_KEYS), [course]);

  const descriptionKey = useMemo(
    () => firstExistingKey(course, DESCRIPTION_KEYS),
    [course]
  );

  const courseLocationKey = useMemo(
    () => firstExistingKey(course, LOCATION_KEYS),
    [course]
  );

  const eventLocationKey = useMemo(
    () => firstExistingKey(linkedEvent, LOCATION_KEYS),
    [linkedEvent]
  );

  async function loadCourse() {
    if (!courseId) {
      setErrorText("Missing course ID. Go back and reopen this course.");
      setLoading(false);
      return;
    }

    try {
      setErrorText("");

      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id || null;
      setViewerId(uid);

      const { data: courseRow, error: courseError } = await supabase
        .from("church_courses")
        .select("*")
        .eq("id", courseId)
        .single();

      if (courseError) throw courseError;

      const { data: sessionRows, error: sessionError } = await supabase
        .from("church_course_sessions")
        .select("*")
        .eq("course_id", courseId)
        .order("starts_at", { ascending: true });

      if (sessionError) throw sessionError;

      const { data: groupRows, error: groupError } = await supabase
        .from("church_groups")
        .select("*")
        .eq("linked_course_id", courseId)
        .limit(1);

      if (groupError) throw groupError;

      let eventRow = null;

      const linkedEventId = getValue(courseRow, EVENT_ID_KEYS, null);

      if (linkedEventId) {
        const { data: eventById, error: eventByIdError } = await supabase
          .from("events")
          .select("*")
          .eq("id", linkedEventId)
          .maybeSingle();

        if (eventByIdError) throw eventByIdError;
        eventRow = eventById || null;
      }

      if (!eventRow) {
        const { data: eventRows, error: eventRowsError } = await supabase
          .from("events")
          .select("*")
          .eq("linked_course_id", courseId)
          .limit(1);

        if (eventRowsError) throw eventRowsError;

        eventRow =
          Array.isArray(eventRows) && eventRows.length > 0
            ? eventRows[0]
            : null;
      }

      const safeSessions = Array.isArray(sessionRows) ? sessionRows : [];
      const safeGroup =
        Array.isArray(groupRows) && groupRows.length > 0 ? groupRows[0] : null;

      const loadedTitle = getValue(courseRow, TITLE_KEYS, "");

      setCourse(courseRow);
      setLinkedEvent(eventRow);
      setLinkedGroup(safeGroup);

      setTitle(loadedTitle);
      setDescription(getValue(courseRow, DESCRIPTION_KEYS, ""));
      setLocation(
        getValue(courseRow, LOCATION_KEYS, "") ||
          getValue(eventRow, LOCATION_KEYS, "")
      );

      setAnnouncementText(
        loadedTitle
          ? `${loadedTitle} has been updated. Please check the latest course details.`
          : "This course has been updated. Please check the latest details."
      );

      setSessions(
        safeSessions.map((session, index) => ({
          id: session.id,
          original: session,
          title: getSessionTitle(session, index),
          topic: session.topic || "",
          description: session.description || "",
          dateText: toDateInput(session.starts_at),
          startTimeText: toTimeInput(session.starts_at),
          endTimeText: toTimeInput(session.ends_at),
        }))
      );
    } catch (error) {
      console.log("ChurchCourseEdit load error:", error);
      setErrorText(error?.message || "Could not load course.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCourse();
  }, [courseId]);

  function updateSessionField(sessionId, field, value) {
    setSessions((currentSessions) =>
      currentSessions.map((session) =>
        session.id === sessionId ? { ...session, [field]: value } : session
      )
    );
  }

    function toggleSessionExpanded(sessionId) {
    setExpandedSessionId((currentId) =>
      currentId === sessionId ? null : sessionId
    );
  }

  function getSessionHeaderTitle(session, index) {
    const baseTitle = session.title || `Week ${index + 1}`;

    if (title.trim()) {
      return `${baseTitle}`;
    }

    return baseTitle;
  }

  function validateSessions() {
    for (const session of sessions) {
      if (!session.dateText || !session.startTimeText || !session.endTimeText) {
        return `Please complete the date, start time and end time for ${session.title}.`;
      }

      const startsAt = makeLocalIso(session.dateText, session.startTimeText);
      const endsAt = makeLocalIso(session.dateText, session.endTimeText);

      if (!startsAt || !endsAt) {
        return `Please check the date and time format for ${session.title}. Use YYYY-MM-DD and HH:MM.`;
      }

      if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
        return `${session.title} must end after it starts.`;
      }
    }

    return "";
  }

  async function createNoticeboardAnnouncement() {
    if (!announceUpdate) return;

    const cleanAnnouncement = announcementText.trim();

    if (!cleanAnnouncement) {
      throw new Error(
        "Please write a short noticeboard announcement or untick the announcement option."
      );
    }

    if (!viewerId) {
      throw new Error(
        "You need to be signed in to create a noticeboard announcement."
      );
    }

    const payload = {
      church_id: churchId,
      title: title.trim() ? `Course update: ${title.trim()}` : "Course update",
      content: cleanAnnouncement,
      created_by: viewerId,
      media_url: null,
      media_type: null,
      thumbnail_url: null,
      link_type: "course",
      linked_course_id: courseId,
      linked_event_id: linkedEvent?.id || null,
      linked_group_id: linkedGroup?.id || null,
      visibility: "public",
    };

    const { error } = await supabase
      .from("church_noticeboard_posts")
      .insert(payload);

    if (error) throw error;
  }

  async function saveCourse() {
    if (!courseId) {
      Alert.alert("Missing course", "The course ID is missing.");
      return;
    }

    if (!title.trim()) {
      Alert.alert("Course title needed", "Please enter a course title.");
      return;
    }

    const sessionError = validateSessions();

    if (sessionError) {
      Alert.alert("Check sessions", sessionError);
      return;
    }

    if (announceUpdate && !announcementText.trim()) {
      Alert.alert(
        "Announcement needed",
        "Write a short noticeboard announcement or untick the announcement option."
      );
      return;
    }

    try {
      setSaving(true);

      const courseUpdates = {};

      if (titleKey) {
        courseUpdates[titleKey] = title.trim();
      }

      if (descriptionKey) {
        courseUpdates[descriptionKey] = description.trim();
      }

      if (courseLocationKey) {
        courseUpdates[courseLocationKey] = location.trim();
      }

      if (hasKey(course, "updated_at")) {
        courseUpdates.updated_at = new Date().toISOString();
      }

      if (Object.keys(courseUpdates).length > 0) {
        const { error: courseUpdateError } = await supabase
          .from("church_courses")
          .update(courseUpdates)
          .eq("id", courseId);

        if (courseUpdateError) throw courseUpdateError;
      }

      for (const session of sessions) {
        const startsAt = makeLocalIso(session.dateText, session.startTimeText);
        const endsAt = makeLocalIso(session.dateText, session.endTimeText);

        const sessionUpdates = {
          starts_at: startsAt,
          ends_at: endsAt,
        };

        if (hasKey(session.original, "topic")) {
          sessionUpdates.topic = session.topic.trim() || null;
        }

        if (hasKey(session.original, "description")) {
          sessionUpdates.description = session.description.trim() || null;
        }

        if (hasKey(session.original, "updated_at")) {
          sessionUpdates.updated_at = new Date().toISOString();
        }

        const { error: sessionUpdateError } = await supabase
          .from("church_course_sessions")
          .update(sessionUpdates)
          .eq("id", session.id);

        if (sessionUpdateError) throw sessionUpdateError;
      }

      if (linkedEvent?.id) {
        const eventUpdates = {};

        if (hasKey(linkedEvent, "title")) {
          eventUpdates.title = title.trim();
        }

        if (hasKey(linkedEvent, "description")) {
          eventUpdates.description = description.trim();
        }

        if (eventLocationKey) {
          eventUpdates[eventLocationKey] = location.trim();
        }

        if (sessions.length > 0 && hasKey(linkedEvent, "start_at")) {
          const firstSession = sessions[0];

          eventUpdates.start_at = makeLocalIso(
            firstSession.dateText,
            firstSession.startTimeText
          );
        }

        if (sessions.length > 0 && hasKey(linkedEvent, "end_at")) {
          const lastSession = sessions[sessions.length - 1];

          eventUpdates.end_at = makeLocalIso(
            lastSession.dateText,
            lastSession.endTimeText
          );
        }

        if (hasKey(linkedEvent, "updated_at")) {
          eventUpdates.updated_at = new Date().toISOString();
        }

        if (Object.keys(eventUpdates).length > 0) {
          const { error: eventUpdateError } = await supabase
            .from("events")
            .update(eventUpdates)
            .eq("id", linkedEvent.id);

          if (eventUpdateError) throw eventUpdateError;
        }
      }

      await createNoticeboardAnnouncement();

      Alert.alert(
        announceUpdate ? "Course updated and announced" : "Course updated",
        announceUpdate
          ? "Your course changes have been saved and a noticeboard announcement has been posted."
          : "Your course details and session times have been saved.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.log("ChurchCourseEdit save error:", error);
      Alert.alert(
        "Could not save course",
        error?.message || "Something went wrong while saving this course."
      );
    } finally {
      setSaving(false);
    }
  }

  function openLinkedGroup() {
    if (!linkedGroup?.id) return;

    navigation.navigate("ChurchGroupDetail", {
      churchId,
      churchName,
      group: linkedGroup,
      churchGroupId: linkedGroup.id,
    });
  }

  function openLinkedEvent() {
    if (!linkedEvent?.id) return;

    navigation.navigate("EventDetails", {
      eventId: linkedEvent.id,
      churchId,
      churchName,
    });
  }

  return (
    <Screen backgroundColor={CREAM} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
contentContainerStyle={{
  paddingHorizontal: 20,
  paddingTop: 18,
  paddingBottom: bottomPad + 112,
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
                  backgroundColor: WHITE,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <Ionicons name="chevron-back" size={23} color={TEXT} />
              </Pressable>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: EVENT_BROWN,
                    fontSize: 11,
                    fontWeight: "900",
                    letterSpacing: 0.7,
                    textTransform: "uppercase",
                    marginBottom: 3,
                  }}
                >
                  Manage Courses
                </Text>

                <Text
                  style={{
                    color: TEXT,
                    fontSize: 28,
                    fontWeight: "900",
                    letterSpacing: -0.7,
                    lineHeight: 33,
                  }}
                >
                  Edit Course
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 13,
                    fontWeight: "700",
                    lineHeight: 18,
                    marginTop: 3,
                  }}
                  numberOfLines={2}
                >
                  {churchName || "Church course"}
                </Text>
              </View>
            </View>

            {loading ? (
              <View
                style={{
                  marginTop: 28,
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 20,
                }}
              >
                <ActivityIndicator color={EVENT_AMBER} />

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 13,
                    fontWeight: "800",
                    marginTop: 10,
                  }}
                >
                  Loading course…
                </Text>
              </View>
            ) : errorText ? (
              <View
                style={{
                  backgroundColor: WHITE,
                  borderRadius: 24,
                  padding: 18,
                  borderWidth: 1,
                  borderColor: "rgba(180, 83, 9, 0.16)",
                }}
              >
                <Ionicons
                  name="warning-outline"
                  size={28}
                  color={EVENT_AMBER}
                />

                <Text
                  style={{
                    color: TEXT,
                    fontSize: 20,
                    fontWeight: "900",
                    marginTop: 10,
                  }}
                >
                  Could not load course
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
                  {errorText}
                </Text>
              </View>
            ) : (
              <>
                <SectionCard
                  icon="create-outline"
                  title="Course details"
                  subtitle="Update the main course information people will see."
                  tint="olive"
                >
                  <Field
                    label="Course title"
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Enter course title"
                  />

                  <Field
                    label="Course description"
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Enter course description"
                    multiline
                  />

                  {courseLocationKey || eventLocationKey ? (
                    <Field
                      label="Location / venue"
                      value={location}
                      onChangeText={setLocation}
                      placeholder="Where is this course happening?"
                    />
                  ) : (
                    <View
                      style={{
                        borderRadius: 18,
                        padding: 13,
                        backgroundColor: "rgba(107, 114, 128, 0.08)",
                        borderWidth: 1,
                        borderColor: "rgba(107, 114, 128, 0.14)",
                      }}
                    >
                      <Text
                        style={{
                          color: MUTED,
                          fontSize: 12.5,
                          fontWeight: "800",
                          lineHeight: 18,
                        }}
                      >
                        No editable location field was found on the course or
                        linked event row.
                      </Text>
                    </View>
                  )}
                </SectionCard>

                <SectionCard
                  icon="calendar-number-outline"
                  title="Course sessions"
                  subtitle="Change the date or time for each week of the course."
                >
                  {sessions.length > 0 ? (
                    sessions.map((session, index) => {
                      const expanded = expandedSessionId === session.id;

                      return (
                        <View
                          key={session.id}
                          style={{
                            borderRadius: 22,
                            marginBottom: 12,
                            backgroundColor: expanded ? "#FFFCF5" : WHITE,
                            borderWidth: 1,
                            borderColor: expanded
                              ? "rgba(180, 83, 9, 0.22)"
                              : "rgba(15, 23, 42, 0.08)",
                            overflow: "hidden",
                            shadowColor: expanded
                              ? EVENT_AMBER
                              : "rgba(15, 23, 42, 0.08)",
                            shadowOpacity: expanded ? 0.1 : 0.06,
                            shadowRadius: expanded ? 10 : 6,
                            shadowOffset: { width: 0, height: expanded ? 4 : 2 },
                            elevation: expanded ? 3 : 1,
                          }}
                        >
                          <Pressable
                            onPress={() => toggleSessionExpanded(session.id)}
                            style={({ pressed }) => ({
                              padding: 14,
                              backgroundColor: pressed
                                ? "rgba(180, 83, 9, 0.08)"
                                : expanded
                                ? "rgba(180, 83, 9, 0.07)"
                                : WHITE,
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 12,
                            })}
                          >
                            <View
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 19,
                                backgroundColor: expanded
                                  ? "rgba(180, 83, 9, 0.12)"
                                  : "rgba(79, 99, 59, 0.09)",
                                borderWidth: 1,
                                borderColor: expanded
                                  ? "rgba(180, 83, 9, 0.22)"
                                  : "rgba(79, 99, 59, 0.16)",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Text
                                style={{
                                  color: expanded ? EVENT_BROWN : OLIVE,
                                  fontSize: 13,
                                  fontWeight: "900",
                                }}
                              >
                                {index + 1}
                              </Text>
                            </View>

                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text
                                style={{
                                  color: TEXT,
                                  fontSize: 14,
                                  fontWeight: "900",
                                  lineHeight: 19,
                                }}
                                numberOfLines={1}
                              >
                                {getSessionHeaderTitle(session, index)}
                              </Text>

                              <Text
                                style={{
                                  color: MUTED,
                                  fontSize: 12,
                                  fontWeight: "700",
                                  lineHeight: 17,
                                  marginTop: 3,
                                }}
                                numberOfLines={1}
                              >
                                {session.topic
                                  ? session.topic
                                  : `${session.dateText || "No date"} · ${
                                      session.startTimeText || "--:--"
                                    } - ${session.endTimeText || "--:--"}`}
                              </Text>
                            </View>

                            <Ionicons
                              name={expanded ? "chevron-up" : "chevron-down"}
                              size={20}
                              color={expanded ? EVENT_AMBER : MUTED}
                            />
                          </Pressable>

                          {expanded ? (
                            <View
                              style={{
                                paddingHorizontal: 14,
                                paddingTop: 4,
                                paddingBottom: 14,
                                borderTopWidth: 1,
                                borderTopColor: "rgba(180, 83, 9, 0.10)",
                              }}
                            >
                              <Field
                                label="Topic optional"
                                value={session.topic}
                                onChangeText={(value) =>
                                  updateSessionField(session.id, "topic", value)
                                }
                                placeholder="e.g. Who is Jesus?"
                              />

                              <Field
                                label="Short description optional"
                                value={session.description}
                                onChangeText={(value) =>
                                  updateSessionField(
                                    session.id,
                                    "description",
                                    value
                                  )
                                }
                                placeholder="Briefly describe what this session will cover"
                                multiline
                              />

                              <Field
                                label="Date"
                                value={session.dateText}
                                onChangeText={(value) =>
                                  updateSessionField(session.id, "dateText", value)
                                }
                                placeholder="YYYY-MM-DD"
                              />

                              <View
                                style={{
                                  flexDirection: "row",
                                  gap: 10,
                                }}
                              >
                                <View style={{ flex: 1 }}>
                                  <Field
                                    label="Start"
                                    value={session.startTimeText}
                                    onChangeText={(value) =>
                                      updateSessionField(
                                        session.id,
                                        "startTimeText",
                                        value
                                      )
                                    }
                                    placeholder="18:00"
                                  />
                                </View>

                                <View style={{ flex: 1 }}>
                                  <Field
                                    label="End"
                                    value={session.endTimeText}
                                    onChangeText={(value) =>
                                      updateSessionField(
                                        session.id,
                                        "endTimeText",
                                        value
                                      )
                                    }
                                    placeholder="20:00"
                                  />
                                </View>
                              </View>

                              <Text
                                style={{
                                  color: MUTED,
                                  fontSize: 12,
                                  fontWeight: "700",
                                  lineHeight: 17,
                                  marginTop: -4,
                                }}
                              >
                                Current:{" "}
                                {formatFriendlyDateTime(
                                  session.original?.starts_at
                                )}{" "}
                                →{" "}
                                {formatFriendlyDateTime(session.original?.ends_at)}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      );
                    })
                  ) : (
                    <Text
                      style={{
                        color: MUTED,
                        fontSize: 13,
                        fontWeight: "700",
                        lineHeight: 19,
                      }}
                    >
                      No sessions have been created for this course yet.
                    </Text>
                  )}
                </SectionCard>

                <SectionCard
                  icon="link-outline"
                  title="Linked course areas"
                  subtitle="Open the connected group or view the course event page."
                  tint="olive"
                >
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    <SmallButton
                      label="Open linked group"
                      icon="chatbubbles-outline"
                      tint="olive"
                      disabled={!linkedGroup?.id}
                      onPress={openLinkedGroup}
                    />

                    <SmallButton
                      label="View Course Event"
                      icon="calendar-outline"
                      disabled={!linkedEvent?.id}
                      onPress={openLinkedEvent}
                    />
                  </View>

                  {!linkedEvent?.id ? (
                    <Text
                      style={{
                        color: MUTED,
                        fontSize: 12,
                        fontWeight: "700",
                        lineHeight: 17,
                        marginTop: 10,
                      }}
                    >
                      No linked event page was found for this course.
                    </Text>
                  ) : null}
                </SectionCard>

                <SectionCard
                  icon="megaphone-outline"
                  title="Announce update"
                  subtitle="Optionally post a linked notice so members know what changed."
                >
                  <ToggleRow
                    value={announceUpdate}
                    onChange={setAnnounceUpdate}
                    title="Post this update to the noticeboard"
                    subtitle="Use this for important changes such as dates, times, location or key course information."
                  />

                  {announceUpdate ? (
                    <View style={{ marginTop: 14 }}>
                      <Field
                        label="Noticeboard message"
                        value={announcementText}
                        onChangeText={setAnnouncementText}
                        placeholder="Write a short update for members"
                        multiline
                      />

                      <Text
                        style={{
                          color: MUTED,
                          fontSize: 12,
                          fontWeight: "700",
                          lineHeight: 17,
                          marginTop: -4,
                        }}
                      >
                        This notice will be linked to this course, its event page
                        and its linked group where available.
                      </Text>
                    </View>
                  ) : null}
                </SectionCard>
              </>
            )}
          </ScrollView>

          {!loading && !errorText ? (
            <View
              style={{
                paddingHorizontal: 20,
                paddingTop: 10,
                paddingBottom: bottomPad + 12,
                backgroundColor: "rgba(255, 252, 245, 0.96)",
                borderTopWidth: 1,
                borderTopColor: "rgba(15, 23, 42, 0.08)",
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: -4 },
                elevation: 8,
              }}
            >
              {announceUpdate ? (
                <Text
                  style={{
                    color: EVENT_BROWN,
                    fontSize: 12,
                    fontWeight: "800",
                    textAlign: "center",
                    marginBottom: 8,
                  }}
                  numberOfLines={2}
                >
                  This save will also post a noticeboard update.
                </Text>
              ) : null}

              <Pressable
                disabled={saving}
                onPress={saveCourse}
                style={({ pressed }) => ({
                  borderRadius: 20,
                  paddingVertical: 15,
                  paddingHorizontal: 16,
                  backgroundColor: saving
                    ? "rgba(180, 83, 9, 0.45)"
                    : pressed
                      ? "rgba(180, 83, 9, 0.88)"
                      : EVENT_AMBER,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: EVENT_AMBER,
                  shadowOpacity: pressed ? 0.1 : 0.22,
                  shadowRadius: pressed ? 6 : 10,
                  shadowOffset: { width: 0, height: pressed ? 2 : 4 },
                  elevation: pressed ? 2 : 4,
                })}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 15,
                    fontWeight: "900",
                  }}
                >
                  {saving
                    ? "Saving…"
                    : announceUpdate
                      ? "Save and announce"
                      : "Save course changes"}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}