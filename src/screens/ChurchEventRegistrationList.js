// src/screens/ChurchEventRegistrationList.js
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

function getStatusStyle(statusValue) {
  const status = normaliseStatus(statusValue);

  if (status === "confirmed") {
    return {
      label: "Confirmed",
      color: OLIVE,
      bg: "rgba(79, 99, 59, 0.09)",
      border: "rgba(79, 99, 59, 0.16)",
      icon: "checkmark-circle-outline",
    };
  }

  if (status === "contacted") {
    return {
      label: "Contacted",
      color: EVENT_AMBER,
      bg: "rgba(180, 83, 9, 0.09)",
      border: "rgba(180, 83, 9, 0.16)",
      icon: "chatbubble-ellipses-outline",
    };
  }

  if (status === "cancelled") {
    return {
      label: "Cancelled",
      color: DANGER_RED,
      bg: "rgba(153, 27, 27, 0.08)",
      border: "rgba(153, 27, 27, 0.15)",
      icon: "close-circle-outline",
    };
  }

  return {
    label: "New",
    color: EVENT_AMBER,
    bg: "rgba(180, 83, 9, 0.10)",
    border: "rgba(180, 83, 9, 0.18)",
    icon: "alert-circle-outline",
  };
}

function formatDate(value) {
  if (!value) return "Date unknown";

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}

function getQuestionId(question) {
  return (
    question?.id ||
    question?.question_id ||
    question?.key ||
    question?.name ||
    question?.field_id ||
    null
  );
}

function getQuestionLabel(question) {
  return (
    question?.label ||
    question?.question ||
    question?.title ||
    question?.text ||
    "Question"
  );
}

function normaliseAnswerValue(value) {
  if (value === null || value === undefined || value === "") return "";

  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== null && item !== undefined && item !== "")
      .map((item) => String(item).trim())
      .join(", ");
  }

  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value).trim();
}

function formatAnswerChipLabel(questionLabel, answer, count) {
  const label = String(questionLabel || "").toLowerCase();
  const answerText = String(answer || "").trim();
  const registrationText =
    count === 1 ? "1 registration" : `${count} registrations`;

  if (
    label.includes("ticket") ||
    label.includes("tickets") ||
    label.includes("seat") ||
    label.includes("seats") ||
    label.includes("how many")
  ) {
    const ticketText =
      answerText === "1" ? "1 ticket/seat" : `${answerText} tickets/seats`;

    return `${ticketText} — ${registrationText}`;
  }

  return `${answerText} — ${registrationText}`;
}

function getAnswerForQuestion(answers, question, index) {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return "";
  }

  const id = getQuestionId(question);

  if (id && Object.prototype.hasOwnProperty.call(answers, id)) {
    return normaliseAnswerValue(answers[id]);
  }

  const possibleKeys = [
    `q_${index + 1}`,
    `question_${index + 1}`,
    String(index),
    String(index + 1),
  ];

  for (const key of possibleKeys) {
    if (Object.prototype.hasOwnProperty.call(answers, key)) {
      return normaliseAnswerValue(answers[key]);
    }
  }

  return "";
}

function StatCard({ icon, label, value, helper, tint = "event" }) {
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

      {helper ? (
        <Text
          style={{
            color: MUTED,
            fontSize: 10.5,
            fontWeight: "700",
            lineHeight: 14,
            marginTop: 4,
          }}
        >
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

function FilterChip({ label, active, onPress, tint = "event" }) {
  const isDanger = tint === "danger";
  const isOlive = tint === "olive";
  const accent = isDanger ? DANGER_RED : isOlive ? OLIVE : EVENT_AMBER;

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
          ? isDanger
            ? "rgba(153, 27, 27, 0.08)"
            : isOlive
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

function RegistrationCard({ registration, onPress }) {
  const statusStyle = getStatusStyle(registration?.status);

  const customAnswerCount =
    registration?.answers &&
    typeof registration.answers === "object" &&
    !Array.isArray(registration.answers)
      ? Object.values(registration.answers).filter(
          (value) => value !== null && value !== undefined && value !== ""
        ).length
      : 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: WHITE,
        borderRadius: 24,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        shadowColor: EVENT_AMBER,
        shadowOpacity: pressed ? 0.05 : 0.09,
        shadowRadius: pressed ? 7 : 10,
        shadowOffset: { width: 0, height: pressed ? 2 : 4 },
        elevation: pressed ? 1 : 3,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: "rgba(180, 83, 9, 0.10)",
            borderWidth: 1,
            borderColor: "rgba(180, 83, 9, 0.17)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="person-outline" size={22} color={EVENT_AMBER} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              color: TEXT,
              fontSize: 16.5,
              fontWeight: "900",
              letterSpacing: -0.2,
            }}
            numberOfLines={1}
          >
            {registration?.name || "Unnamed registrant"}
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 12.5,
              fontWeight: "700",
              lineHeight: 18,
              marginTop: 3,
            }}
            numberOfLines={1}
          >
            {registration?.email || "No email"}
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
            {registration?.phone || "No phone"} ·{" "}
            {registration?.number_attending || 1} attending
          </Text>

          <Text
            style={{
              color: EVENT_BROWN,
              fontSize: 11.5,
              fontWeight: "900",
              marginTop: 7,
            }}
          >
            {customAnswerCount} custom answer
            {customAnswerCount === 1 ? "" : "s"}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color={EVENT_AMBER} />
      </View>

      <View
        style={{
          marginTop: 13,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <View
          style={{
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 9,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: statusStyle.bg,
            borderWidth: 1,
            borderColor: statusStyle.border,
          }}
        >
          <Ionicons
            name={statusStyle.icon}
            size={14}
            color={statusStyle.color}
            style={{ marginRight: 5 }}
          />

          <Text
            style={{
              color: statusStyle.color,
              fontSize: 11,
              fontWeight: "900",
            }}
          >
            {statusStyle.label}
          </Text>
        </View>

        <Text
          style={{
            color: MUTED,
            fontSize: 11.5,
            fontWeight: "800",
          }}
        >
          {formatDate(registration?.created_at)}
        </Text>
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
          name={errorText ? "warning-outline" : "people-outline"}
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
        {errorText ? "Could not load registrations" : "No registrations found"}
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
          "Try changing your search or filters, or check back when people have registered."}
      </Text>
    </View>
  );
}

function CustomQuestionFilterGroup({ summary, activeFilter, onSelectAnswer }) {
  if (!summary?.answers?.length) return null;

  return (
    <View
      style={{
        marginTop: 13,
        paddingTop: 13,
        borderTopWidth: 1,
        borderTopColor: "rgba(15, 23, 42, 0.06)",
      }}
    >
      <Text
        style={{
          color: TEXT,
          fontSize: 13.5,
          fontWeight: "900",
          lineHeight: 18,
          marginBottom: 4,
        }}
      >
        {summary.label}
      </Text>

      <Text
        style={{
          color: MUTED,
          fontSize: 11.5,
          fontWeight: "700",
          lineHeight: 16,
          marginBottom: 8,
        }}
      >
        Tap an answer below to show only registrations with that answer.
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {summary.answers.map((answer) => {
          const active =
            activeFilter?.questionKey === summary.key &&
            activeFilter?.answer === answer.answer;

          return (
            <Pressable
              key={`${summary.key}-${answer.answer}`}
              onPress={() =>
                onSelectAnswer({
                  questionKey: summary.key,
                  questionLabel: summary.label,
                  answer: answer.answer,
                })
              }
              style={({ pressed }) => ({
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 7,
                backgroundColor: active
                  ? "rgba(79, 99, 59, 0.14)"
                  : "rgba(79, 99, 59, 0.06)",
                borderWidth: 1,
                borderColor: active
                  ? "rgba(79, 99, 59, 0.30)"
                  : "rgba(79, 99, 59, 0.12)",
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <Text
                style={{
                  color: active ? OLIVE : TEXT,
                  fontSize: 11.5,
                  fontWeight: "900",
                }}
              >
                {formatAnswerChipLabel(
                  summary.label,
                  answer.answer,
                  answer.count
                )}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function ChurchEventRegistrationList({ route, navigation }) {
  const { churchId, churchName, eventId, eventTitle } = route?.params || {};

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [errorText, setErrorText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [answerFilter, setAnswerFilter] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadData() {
      if (!eventId) {
        setLoading(false);
        setErrorText("Missing event ID. Go back and reopen the event.");
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
            .select("*")
            .eq("event_id", eventId)
            .order("created_at", { ascending: false });

        if (registrationError) throw registrationError;

        if (!alive) return;

        setEvent(eventRow || null);
        setRegistrations(
          Array.isArray(registrationRows) ? registrationRows : []
        );
      } catch (e) {
        console.log("ChurchEventRegistrationList load error:", e);

        if (!alive) return;

        setEvent(null);
        setRegistrations([]);
        setErrorText(
          e?.message || "Something went wrong while loading registrations."
        );
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadData();

    return () => {
      alive = false;
    };
  }, [eventId, churchId]);

  const questions = useMemo(
    () =>
      Array.isArray(event?.registration_questions)
        ? event.registration_questions
        : [],
    [event]
  );

  const stats = useMemo(() => {
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

    const totalPeople = registrations.reduce((sum, row) => {
      const number = Number(row?.number_attending || 1);
      return sum + (Number.isFinite(number) && number > 0 ? number : 1);
    }, 0);

    const messagesCount = registrations.filter((row) =>
      String(row?.message || "").trim()
    ).length;

    const accessibilityCount = registrations.filter((row) =>
      String(row?.accessibility_needs || "").trim()
    ).length;

    const adminNotesCount = registrations.filter((row) =>
      String(row?.admin_notes || "").trim()
    ).length;

    return {
      total,
      totalPeople,
      needsFollowUp: newCount + contactedCount,
      confirmed: confirmedCount,
      messagesCount,
      accessibilityCount,
      adminNotesCount,
    };
  }, [registrations]);

  const questionSummaries = useMemo(() => {
    if (!questions.length || !registrations.length) return [];

    return questions
      .map((question, index) => {
        const questionKey = getQuestionId(question) || `question_${index}`;
        const label = getQuestionLabel(question);
        const grouped = {};

        for (const registration of registrations) {
          const answer = getAnswerForQuestion(
            registration?.answers,
            question,
            index
          );

          if (!answer) continue;

          grouped[answer] = (grouped[answer] || 0) + 1;
        }

        const answers = Object.entries(grouped)
          .map(([answer, count]) => ({ answer, count }))
          .sort((a, b) => b.count - a.count);

        return {
          key: questionKey,
          label,
          answers,
        };
      })
      .filter((summary) => summary.answers.length > 0);
  }, [questions, registrations]);

  const filteredRegistrations = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return registrations.filter((registration) => {
      const status = normaliseStatus(registration?.status);

      if (statusFilter !== "all" && status !== statusFilter) return false;

      if (search) {
        const haystack = [
          registration?.name,
          registration?.email,
          registration?.phone,
          registration?.message,
          registration?.accessibility_needs,
          registration?.admin_notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(search)) return false;
      }

      if (answerFilter) {
        const questionIndex = questions.findIndex((question, index) => {
          const key = getQuestionId(question) || `question_${index}`;
          return key === answerFilter.questionKey;
        });

        if (questionIndex < 0) return false;

        const answer = getAnswerForQuestion(
          registration?.answers,
          questions[questionIndex],
          questionIndex
        );

        if (answer !== answerFilter.answer) return false;
      }

      return true;
    });
  }, [registrations, searchText, statusFilter, answerFilter, questions]);

  const filteredPeople = useMemo(() => {
    return filteredRegistrations.reduce((sum, row) => {
      const number = Number(row?.number_attending || 1);
      return sum + (Number.isFinite(number) && number > 0 ? number : 1);
    }, 0);
  }, [filteredRegistrations]);

  const hasSearch = Boolean(searchText.trim());
  const hasStatusFilter = statusFilter !== "all";
  const hasAnswerFilter = Boolean(answerFilter);
  const hasFilters = hasSearch || hasStatusFilter || hasAnswerFilter;

  const activeFilterCount =
    (hasSearch ? 1 : 0) + (hasStatusFilter ? 1 : 0) + (hasAnswerFilter ? 1 : 0);

  function clearFilters() {
    setSearchText("");
    setStatusFilter("all");
    setAnswerFilter(null);
  }

  const title = event?.title || eventTitle || "Event registrations";
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
                adjustsFontSizeToFit
                minimumFontScale={0.78}
              >
                Registrations
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
              <Ionicons name="clipboard-outline" size={25} color={EVENT_AMBER} />
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
              Manage registrations, follow-up status, and answers for this
              event.
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
              icon="document-text-outline"
              value={stats.total}
              label="Registrations"
            />
            <StatCard
              icon="people-outline"
              value={stats.totalPeople}
              label="People attending"
              helper="Seats/tickets requested"
            />
            <StatCard
              icon="alert-circle-outline"
              value={stats.needsFollowUp}
              label="Needs follow-up"
              tint="danger"
            />
            <StatCard
              icon="checkmark-circle-outline"
              value={stats.confirmed}
              label="Confirmed"
              tint="olive"
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
            <Text
              style={{
                color: EVENT_BROWN,
                fontSize: 13.5,
                fontWeight: "900",
                marginBottom: 6,
              }}
            >
              Event summary
            </Text>

            <Text
              style={{
                color: TEXT,
                fontSize: 14,
                fontWeight: "900",
                lineHeight: 20,
              }}
            >
              Showing {filteredRegistrations.length} of {stats.total} registration
{stats.total === 1 ? "" : "s"} · {filteredPeople} people attending
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 12.5,
                fontWeight: "700",
                lineHeight: 19,
                marginTop: 5,
              }}
            >
              People attending can be higher than registrations if someone requested
multiple tickets or seats.
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 12.5,
                fontWeight: "700",
                lineHeight: 19,
                marginTop: 5,
              }}
            >
              Messages: {stats.messagesCount} · Accessibility needs:{" "}
              {stats.accessibilityCount} · Admin notes: {stats.adminNotesCount}
            </Text>

            <Pressable
  onPress={() =>
    navigateToAvailableRoute(navigation, "ChurchEventAttendeeViewer", {
      churchId,
      churchName,
      eventId,
      eventTitle: title,
    })
  }
  style={({ pressed }) => ({
    marginTop: 12,
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: pressed ? "rgba(79, 99, 59, 0.88)" : OLIVE,
    borderWidth: 1,
    borderColor: "rgba(79, 99, 59, 0.25)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ scale: pressed ? 0.98 : 1 }],
  })}
>
  <Ionicons
    name="people-outline"
    size={17}
    color={WHITE}
    style={{ marginRight: 7 }}
  />

  <Text
    style={{
      color: WHITE,
      fontSize: 13,
      fontWeight: "900",
    }}
  >
    View attendee list
  </Text>
</Pressable>

            {hasFilters ? (
              <View
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderRadius: 16,
                  backgroundColor: "rgba(180, 83, 9, 0.07)",
                  borderWidth: 1,
                  borderColor: "rgba(180, 83, 9, 0.13)",
                }}
              >
                <Text
                  style={{
                    color: EVENT_BROWN,
                    fontSize: 12.5,
                    fontWeight: "900",
                  }}
                >
                  Active filters: {activeFilterCount}
                </Text>

                {hasSearch ? (
                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 12,
                      fontWeight: "700",
                      marginTop: 4,
                    }}
                  >
                    Search: “{searchText.trim()}”
                  </Text>
                ) : null}

                {hasStatusFilter ? (
                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 12,
                      fontWeight: "700",
                      marginTop: 4,
                    }}
                  >
                    Status: {getStatusStyle(statusFilter).label}
                  </Text>
                ) : null}

                {hasAnswerFilter ? (
                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 12,
                      fontWeight: "700",
                      marginTop: 4,
                    }}
                  >
                    Answer: {answerFilter.questionLabel} ={" "}
                    {answerFilter.answer}
                  </Text>
                ) : null}
              </View>
            ) : null}
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
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: filtersOpen ? 12 : 0,
              }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: "rgba(15, 23, 42, 0.08)",
                  backgroundColor: "rgba(255,252,245,0.8)",
                  paddingHorizontal: 13,
                  paddingVertical: 2,
                }}
              >
                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="Search name, email, phone..."
                  placeholderTextColor={MUTED}
                  style={{
                    color: TEXT,
                    fontSize: 14,
                    fontWeight: "700",
                    paddingVertical: 9,
                  }}
                />
              </View>

              <Pressable
                onPress={() => setFiltersOpen((current) => !current)}
                style={({ pressed }) => ({
                  height: 46,
                  borderRadius: 18,
                  paddingHorizontal: 14,
                  backgroundColor: filtersOpen
                    ? "rgba(180, 83, 9, 0.12)"
                    : EVENT_AMBER,
                  borderWidth: 1,
                  borderColor: filtersOpen
                    ? "rgba(180, 83, 9, 0.22)"
                    : EVENT_AMBER,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <Ionicons
                  name="filter-outline"
                  size={17}
                  color={filtersOpen ? EVENT_BROWN : WHITE}
                  style={{ marginRight: 6 }}
                />

                <Text
                  style={{
                    color: filtersOpen ? EVENT_BROWN : WHITE,
                    fontSize: 12.5,
                    fontWeight: "900",
                  }}
                >
                  Filter{activeFilterCount ? ` ${activeFilterCount}` : ""}
                </Text>
              </Pressable>
            </View>

            {filtersOpen ? (
              <View
                style={{
                  borderRadius: 22,
                  padding: 14,
                  backgroundColor: "rgba(255, 252, 245, 0.85)",
                  borderWidth: 1,
                  borderColor: "rgba(180, 83, 9, 0.13)",
                }}
              >
                <Text
                  style={{
                    color: EVENT_BROWN,
                    fontSize: 15,
                    fontWeight: "900",
                    marginBottom: 4,
                  }}
                >
                  Filters
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 12.5,
                    fontWeight: "700",
                    lineHeight: 18,
                    marginBottom: 12,
                  }}
                >
                  Choose what you want to see in the registration list below.
                </Text>

                <Text
                  style={{
                    color: TEXT,
                    fontSize: 12.5,
                    fontWeight: "900",
                    marginBottom: 8,
                  }}
                >
                  Follow-up status
                </Text>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <FilterChip
                    label="All"
                    active={statusFilter === "all"}
                    onPress={() => setStatusFilter("all")}
                  />
                  <FilterChip
                    label="New"
                    active={statusFilter === "new"}
                    onPress={() => setStatusFilter("new")}
                  />
                  <FilterChip
                    label="Contacted"
                    active={statusFilter === "contacted"}
                    onPress={() => setStatusFilter("contacted")}
                  />
                  <FilterChip
                    label="Confirmed"
                    active={statusFilter === "confirmed"}
                    onPress={() => setStatusFilter("confirmed")}
                    tint="olive"
                  />
                  <FilterChip
                    label="Cancelled"
                    active={statusFilter === "cancelled"}
                    onPress={() => setStatusFilter("cancelled")}
                    tint="danger"
                  />
                </View>

                {questionSummaries.length > 0 ? (
                  <View style={{ marginTop: 16 }}>
                    <Text
                      style={{
                        color: TEXT,
                        fontSize: 12.5,
                        fontWeight: "900",
                        marginBottom: 2,
                      }}
                    >
                      Filter by registration answers
                    </Text>

                    <Text
                      style={{
                        color: MUTED,
                        fontSize: 12,
                        fontWeight: "700",
                        lineHeight: 17,
                        marginBottom: 2,
                      }}
                    >
                      These options come from the custom questions on this
                      event.
                    </Text>

                    {questionSummaries.map((summary) => (
                      <CustomQuestionFilterGroup
                        key={summary.key}
                        summary={summary}
                        activeFilter={answerFilter}
                        onSelectAnswer={(nextFilter) =>
                          setAnswerFilter(nextFilter)
                        }
                      />
                    ))}
                  </View>
                ) : (
                  <View
                    style={{
                      marginTop: 16,
                      padding: 12,
                      borderRadius: 18,
                      backgroundColor: "rgba(15, 23, 42, 0.03)",
                      borderWidth: 1,
                      borderColor: "rgba(15, 23, 42, 0.06)",
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
                      This event does not have custom question answers to filter
                      yet.
                    </Text>
                  </View>
                )}

                <Pressable
                  onPress={clearFilters}
                  disabled={!hasFilters}
                  style={({ pressed }) => ({
                    marginTop: 14,
                    borderRadius: 18,
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    backgroundColor: hasFilters
                      ? "rgba(180, 83, 9, 0.09)"
                      : "rgba(15, 23, 42, 0.03)",
                    borderWidth: 1,
                    borderColor: hasFilters
                      ? "rgba(180, 83, 9, 0.16)"
                      : "rgba(15, 23, 42, 0.06)",
                    alignItems: "center",
                    opacity: hasFilters ? 1 : 0.65,
                    transform: [{ scale: pressed && hasFilters ? 0.98 : 1 }],
                  })}
                >
                  <Text
                    style={{
                      color: hasFilters ? EVENT_BROWN : MUTED,
                      fontSize: 12.5,
                      fontWeight: "900",
                    }}
                  >
                    Reset search & filters
                  </Text>
                </Pressable>
              </View>
            ) : null}
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
                Loading registrations…
              </Text>
            </View>
          ) : errorText || filteredRegistrations.length === 0 ? (
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
                Registered people
              </Text>

              {filteredRegistrations.map((registration) => (
                <RegistrationCard
                  key={registration.id}
                  registration={registration}
                  onPress={() =>
                    navigateToAvailableRoute(
                      navigation,
                      "ChurchEventRegistrationDetail",
                      {
                        churchId,
                        churchName,
                        eventId,
                        registrationId: registration.id,
                      }
                    )
                  }
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}