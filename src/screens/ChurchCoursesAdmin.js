// src/screens/ChurchCoursesAdmin.js
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
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

function getCourseTitle(course) {
  return (
    course?.title ||
    course?.name ||
    course?.course_title ||
    course?.programme_title ||
    "Untitled course"
  );
}

function getCourseDescription(course) {
  return (
    course?.description ||
    course?.summary ||
    course?.details ||
    "No course description has been added yet."
  );
}

function getDateValue(row, keys) {
  for (const key of keys) {
    if (row?.[key]) return row[key];
  }

  return null;
}

function formatDate(value) {
  if (!value) return "Date not set";

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}

function formatTime(value) {
  if (!value) return "";

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatDateTimeRange(startValue, endValue) {
  const dateLabel = formatDate(startValue);
  const startTime = formatTime(startValue);
  const endTime = formatTime(endValue);

  if (startTime && endTime) return `${dateLabel}, ${startTime}–${endTime}`;
  if (startTime) return `${dateLabel}, ${startTime}`;

  return dateLabel;
}

function getCourseStartLabel(course) {
  const start =
    getDateValue(course, [
      "start_at",
      "starts_at",
      "start_date",
      "course_start_at",
      "created_at",
    ]) || null;

  return formatDate(start);
}

function getCourseEndLabel(course) {
  const end =
    getDateValue(course, [
      "end_at",
      "ends_at",
      "end_date",
      "course_end_at",
      "finish_at",
    ]) || null;

  return end ? formatDate(end) : "End date not set";
}

function getSessionStart(session) {
  return getDateValue(session, [
    "start_at",
    "starts_at",
    "session_start_at",
    "start_time",
    "date",
  ]);
}

function getSessionEnd(session) {
  return getDateValue(session, [
    "end_at",
    "ends_at",
    "session_end_at",
    "end_time",
  ]);
}

function getNextSession(sessions) {
  const now = Date.now();

  const upcoming = sessions
    .map((session) => {
      const rawStart = getSessionStart(session);
      const date = rawStart ? new Date(rawStart) : null;

      return {
        session,
        time: date && !Number.isNaN(date.getTime()) ? date.getTime() : null,
      };
    })
    .filter((item) => item.time && item.time >= now)
    .sort((a, b) => a.time - b.time);

  return upcoming[0]?.session || null;
}

function StatPill({ icon, label, value, tint = "amber" }) {
  const isOlive = tint === "olive";
  const accent = isOlive ? OLIVE : EVENT_AMBER;
  const bg = isOlive ? "rgba(79, 99, 59, 0.09)" : "rgba(180, 83, 9, 0.09)";
  const border = isOlive
    ? "rgba(79, 99, 59, 0.15)"
    : "rgba(180, 83, 9, 0.15)";

  return (
    <View
      style={{
        flex: 1,
        minWidth: "46%",
        borderRadius: 18,
        padding: 12,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
        <Ionicons name={icon} size={16} color={accent} />
        <Text
          style={{
            color: accent,
            fontSize: 11,
            fontWeight: "900",
            textTransform: "uppercase",
            letterSpacing: 0.35,
          }}
        >
          {label}
        </Text>
      </View>

      <Text
        style={{
          color: TEXT,
          fontSize: 18,
          fontWeight: "900",
          marginTop: 6,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function EmptyState({ loading, errorText }) {
  if (loading) {
    return (
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
          Loading courses…
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: WHITE,
        borderRadius: 28,
        padding: 18,
        borderWidth: 1,
        borderColor: "rgba(180, 83, 9, 0.16)",
        shadowColor: EVENT_AMBER,
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
          backgroundColor: "rgba(180, 83, 9, 0.08)",
        }}
      />

      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: "rgba(180, 83, 9, 0.10)",
          borderWidth: 1,
          borderColor: "rgba(180, 83, 9, 0.18)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 13,
        }}
      >
        <Ionicons
          name={errorText ? "warning-outline" : "school-outline"}
          size={25}
          color={EVENT_AMBER}
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
        {errorText ? "Could not load courses" : "No courses yet"}
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
          "When this church creates a course or programme, such as Alpha, it will appear here with its sessions, registrations and linked group."}
      </Text>
    </View>
  );
}

function CourseCard({ item, navigation, churchId, churchName }) {
  const course = item.course;
  const sessions = item.sessions;
  const linkedGroup = item.linkedGroup;
  const registrationCount = item.registrationCount;
  const nextSession = getNextSession(sessions);

  const title = getCourseTitle(course);
  const description = getCourseDescription(course);
  const startLabel = getCourseStartLabel(course);
  const endLabel = getCourseEndLabel(course);

  const linkedEventId =
    course?.event_id ||
    course?.linked_event_id ||
    course?.source_event_id ||
    course?.origin_event_id ||
    null;

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
    if (!linkedEventId) return;

    navigation.navigate("EventDetails", {
      eventId: linkedEventId,
      churchId,
      churchName,
    });
  }

    function openEditCourse() {
    navigation.navigate("ChurchCourseEdit", {
      courseId: course.id,
      churchId,
      churchName,
    });
  }

  return (
    <View
      style={{
        backgroundColor: WHITE,
        borderRadius: 26,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        shadowColor: EVENT_AMBER,
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
          top: -46,
          right: -40,
          width: 140,
          height: 140,
          borderRadius: 70,
          backgroundColor: "rgba(180, 83, 9, 0.07)",
        }}
      />

      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: "rgba(79, 99, 59, 0.10)",
            borderWidth: 1,
            borderColor: "rgba(79, 99, 59, 0.16)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="school-outline" size={23} color={OLIVE} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              color: TEXT,
              fontSize: 19,
              fontWeight: "900",
              letterSpacing: -0.35,
              lineHeight: 24,
            }}
          >
            {title}
          </Text>

          <Text
            style={{
              color: EVENT_BROWN,
              fontSize: 12,
              fontWeight: "900",
              marginTop: 4,
            }}
          >
            {startLabel} → {endLabel}
          </Text>
        </View>
      </View>

      <Text
        style={{
          color: MUTED,
          fontSize: 13,
          fontWeight: "700",
          lineHeight: 19,
          marginTop: 12,
        }}
        numberOfLines={3}
      >
        {description}
      </Text>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
          marginTop: 14,
        }}
      >
        <StatPill
          icon="calendar-number-outline"
          label="Sessions"
          value={String(sessions.length)}
        />

        <StatPill
          icon="people-outline"
          label="Registrations"
          value={String(registrationCount)}
          tint="olive"
        />

        <StatPill
          icon="chatbubbles-outline"
          label="Linked group"
          value={linkedGroup?.id ? "Yes" : "No"}
          tint="olive"
        />

        <StatPill
          icon="radio-button-on-outline"
          label="Status"
          value={course?.status || "Active"}
        />
      </View>

      <View
        style={{
          marginTop: 14,
          padding: 13,
          borderRadius: 18,
          backgroundColor: "rgba(180, 83, 9, 0.07)",
          borderWidth: 1,
          borderColor: "rgba(180, 83, 9, 0.14)",
        }}
      >
        <Text
          style={{
            color: EVENT_BROWN,
            fontSize: 12,
            fontWeight: "900",
            textTransform: "uppercase",
            letterSpacing: 0.35,
            marginBottom: 5,
          }}
        >
          Next session
        </Text>

        <Text
          style={{
            color: TEXT,
            fontSize: 13.5,
            fontWeight: "800",
            lineHeight: 19,
          }}
        >
          {nextSession
            ? formatDateTimeRange(getSessionStart(nextSession), getSessionEnd(nextSession))
            : sessions.length > 0
              ? "No future session found"
              : "No sessions created yet"}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
          marginTop: 14,
        }}
      >

                <Pressable
          onPress={openEditCourse}
          style={({ pressed }) => ({
            flexGrow: 1,
            minWidth: "46%",
            borderRadius: 18,
            paddingVertical: 12,
            paddingHorizontal: 12,
            backgroundColor: pressed
              ? "rgba(180, 83, 9, 0.15)"
              : "rgba(180, 83, 9, 0.10)",
            borderWidth: 1,
            borderColor: "rgba(180, 83, 9, 0.18)",
            alignItems: "center",
          })}
        >
          <Text
            style={{
              color: EVENT_BROWN,
              fontSize: 12.5,
              fontWeight: "900",
            }}
          >
            Edit Course
          </Text>
        </Pressable>
        
        <Pressable
          disabled={!linkedGroup?.id}
          onPress={openLinkedGroup}
          style={({ pressed }) => ({
            flexGrow: 1,
            minWidth: "46%",
            borderRadius: 18,
            paddingVertical: 12,
            paddingHorizontal: 12,
            backgroundColor: !linkedGroup?.id
              ? "rgba(107, 114, 128, 0.09)"
              : pressed
                ? "rgba(79, 99, 59, 0.15)"
                : "rgba(79, 99, 59, 0.10)",
            borderWidth: 1,
            borderColor: !linkedGroup?.id
              ? "rgba(107, 114, 128, 0.15)"
              : "rgba(79, 99, 59, 0.18)",
            alignItems: "center",
          })}
        >
          <Text
            style={{
              color: !linkedGroup?.id ? MUTED : OLIVE,
              fontSize: 12.5,
              fontWeight: "900",
            }}
          >
            View linked group
          </Text>
        </Pressable>

        <Pressable
          disabled={!linkedEventId}
          onPress={openLinkedEvent}
          style={({ pressed }) => ({
            flexGrow: 1,
            minWidth: "46%",
            borderRadius: 18,
            paddingVertical: 12,
            paddingHorizontal: 12,
            backgroundColor: !linkedEventId
              ? "rgba(107, 114, 128, 0.09)"
              : pressed
                ? "rgba(180, 83, 9, 0.15)"
                : "rgba(180, 83, 9, 0.10)",
            borderWidth: 1,
            borderColor: !linkedEventId
              ? "rgba(107, 114, 128, 0.15)"
              : "rgba(180, 83, 9, 0.18)",
            alignItems: "center",
          })}
        >
          <Text
            style={{
              color: !linkedEventId ? MUTED : EVENT_BROWN,
              fontSize: 12.5,
              fontWeight: "900",
            }}
          >
            View course event
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ChurchCoursesAdmin({ route, navigation }) {
  const { churchId, churchName } = route?.params || {};
  const name = churchName || "Church";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [errorText, setErrorText] = useState("");

  const loadCourses = useCallback(async () => {
    if (!churchId) {
      setLoading(false);
      setErrorText("Missing church ID. Go back and reopen Manage Events.");
      return;
    }

    try {
      setErrorText("");

      const { data: courseRows, error: courseError } = await supabase
        .from("church_courses")
        .select("*")
        .eq("church_id", churchId)
        .order("created_at", { ascending: false });

      if (courseError) throw courseError;

      const safeCourses = Array.isArray(courseRows) ? courseRows : [];
      const courseIds = safeCourses.map((course) => course.id).filter(Boolean);

      let sessionRows = [];
      let groupRows = [];
      let registrationRows = [];

      if (courseIds.length > 0) {
const { data: fetchedSessions, error: sessionError } = await supabase
  .from("church_course_sessions")
  .select("*")
  .in("course_id", courseIds)
  .order("starts_at", { ascending: true });

        if (sessionError) throw sessionError;
        sessionRows = Array.isArray(fetchedSessions) ? fetchedSessions : [];

        const { data: fetchedGroups, error: groupError } = await supabase
          .from("church_groups")
          .select("*")
          .eq("church_id", churchId)
          .in("linked_course_id", courseIds)
          .order("created_at", { ascending: false });

        if (groupError) throw groupError;
        groupRows = Array.isArray(fetchedGroups) ? fetchedGroups : [];

const { data: fetchedRegistrations, error: registrationError } =
  await supabase
    .from("event_registrations")
    .select("*")
    .in("linked_course_id", courseIds)
    .order("created_at", { ascending: false });

        if (registrationError) throw registrationError;
        registrationRows = Array.isArray(fetchedRegistrations)
          ? fetchedRegistrations
          : [];
      }

      setCourses(safeCourses);
      setSessions(sessionRows);
      setGroups(groupRows);
      setRegistrations(registrationRows);
    } catch (error) {
      console.log("ChurchCoursesAdmin load error:", error);
      setErrorText(error?.message || "Could not load courses.");
      setCourses([]);
      setSessions([]);
      setGroups([]);
      setRegistrations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [churchId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadCourses();
    }, [loadCourses])
  );

  const courseItems = useMemo(() => {
    return courses.map((course) => {
      const courseSessions = sessions.filter(
        (session) => session.course_id === course.id
      );

      const linkedGroup =
        groups.find((group) => group.linked_course_id === course.id) || null;

      const registrationCount = registrations.filter(
        (registration) => registration.linked_course_id === course.id
      ).length;

      return {
        course,
        sessions: courseSessions,
        linkedGroup,
        registrationCount,
      };
    });
  }, [courses, sessions, groups, registrations]);

  function handleRefresh() {
    setRefreshing(true);
    loadCourses();
  }

  return (
    <Screen backgroundColor={CREAM} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
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
                Manage Events
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
                Courses / Programmes
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
                {name}
              </Text>
            </View>
          </View>

          <View
            style={{
              backgroundColor: WHITE,
              borderRadius: 28,
              padding: 18,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: "rgba(79, 99, 59, 0.16)",
              shadowColor: OLIVE,
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
                top: -48,
                right: -42,
                width: 145,
                height: 145,
                borderRadius: 72.5,
                backgroundColor: "rgba(79, 99, 59, 0.08)",
              }}
            />

            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                backgroundColor: "rgba(79, 99, 59, 0.10)",
                borderWidth: 1,
                borderColor: "rgba(79, 99, 59, 0.18)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Ionicons name="library-outline" size={27} color={OLIVE} />
            </View>

            <Text
              style={{
                color: TEXT,
                fontSize: 23,
                fontWeight: "900",
                letterSpacing: -0.5,
                lineHeight: 29,
              }}
            >
              Manage courses
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
View each course, its sessions, linked group and registrations in one
place.
            </Text>
          </View>

          {courseItems.length > 0 ? (
            courseItems.map((item) => (
              <CourseCard
                key={item.course.id}
                item={item}
                navigation={navigation}
                churchId={churchId}
                churchName={name}
              />
            ))
          ) : (
            <EmptyState loading={loading} errorText={errorText} />
          )}
        </ScrollView>
      )}
    </Screen>
  );
}