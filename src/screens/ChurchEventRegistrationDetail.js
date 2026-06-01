// src/screens/ChurchEventRegistrationDetail.js
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
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

function formatDateTime(value) {
  if (!value) return "Not set";

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function formatBoolean(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "Not answered";
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

function formatAnswerValue(value) {
  if (value === null || value === undefined || value === "") {
    return "Not answered";
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "Not answered";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function DetailRow({ icon, label, value }) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 11,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(15, 23, 42, 0.06)",
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: "rgba(180, 83, 9, 0.09)",
          borderWidth: 1,
          borderColor: "rgba(180, 83, 9, 0.15)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={17} color={EVENT_AMBER} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            color: MUTED,
            fontSize: 11.5,
            fontWeight: "900",
            textTransform: "uppercase",
            letterSpacing: 0.45,
            marginBottom: 3,
          }}
        >
          {label}
        </Text>

        <Text
          style={{
            color: TEXT,
            fontSize: 14.5,
            fontWeight: "800",
            lineHeight: 20,
          }}
        >
          {value || "Not provided"}
        </Text>
      </View>
    </View>
  );
}

function SectionCard({ title, subtitle, icon, children }) {
  return (
    <View
      style={{
        backgroundColor: WHITE,
        borderRadius: 26,
        padding: 16,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        shadowColor: EVENT_AMBER,
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
        elevation: 2,
        marginBottom: 14,
        overflow: "hidden",
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -48,
          right: -42,
          width: 130,
          height: 130,
          borderRadius: 65,
          backgroundColor: "rgba(180, 83, 9, 0.06)",
        }}
      />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 11,
          marginBottom: 10,
        }}
      >
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: "rgba(180, 83, 9, 0.10)",
            borderWidth: 1,
            borderColor: "rgba(180, 83, 9, 0.17)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={21} color={EVENT_AMBER} />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: TEXT,
              fontSize: 17,
              fontWeight: "900",
              letterSpacing: -0.2,
            }}
          >
            {title}
          </Text>

          {subtitle ? (
            <Text
              style={{
                color: MUTED,
                fontSize: 12.5,
                fontWeight: "700",
                marginTop: 2,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {children}
    </View>
  );
}

function StatusBadge({ status }) {
  const statusStyle = getStatusStyle(status);

  return (
    <View
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: statusStyle.bg,
        borderWidth: 1,
        borderColor: statusStyle.border,
      }}
    >
      <Ionicons
        name={statusStyle.icon}
        size={15}
        color={statusStyle.color}
        style={{ marginRight: 6 }}
      />

      <Text
        style={{
          color: statusStyle.color,
          fontSize: 11.5,
          fontWeight: "900",
        }}
      >
        {statusStyle.label}
      </Text>
    </View>
  );
}

function StatusActionButton({ label, status, active, disabled, onPress }) {
  const statusStyle = getStatusStyle(status);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: "46%",
        borderRadius: 18,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: active ? statusStyle.border : CARD_BORDER,
        backgroundColor: active ? statusStyle.bg : WHITE,
        opacity: disabled ? 0.58 : 1,
        transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Ionicons
          name={statusStyle.icon}
          size={17}
          color={active ? statusStyle.color : MUTED}
          style={{ marginRight: 7 }}
        />

        <Text
          style={{
            color: active ? statusStyle.color : TEXT,
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

function QuickActionButton({ icon, label, disabled, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: "46%",
        borderRadius: 18,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: disabled
          ? "rgba(15, 23, 42, 0.06)"
          : "rgba(180, 83, 9, 0.16)",
        backgroundColor: disabled
          ? "rgba(15, 23, 42, 0.03)"
          : "rgba(180, 83, 9, 0.08)",
        opacity: disabled ? 0.55 : 1,
        transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Ionicons
          name={icon}
          size={17}
          color={disabled ? MUTED : EVENT_AMBER}
          style={{ marginRight: 7 }}
        />

        <Text
          style={{
            color: disabled ? MUTED : EVENT_BROWN,
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

function AnswerCard({ label, value }) {
  return (
    <View
      style={{
        padding: 13,
        borderRadius: 18,
        backgroundColor: "rgba(79, 99, 59, 0.06)",
        borderWidth: 1,
        borderColor: "rgba(79, 99, 59, 0.12)",
        marginTop: 9,
      }}
    >
      <Text
        style={{
          color: OLIVE,
          fontSize: 12.5,
          fontWeight: "900",
          lineHeight: 17,
        }}
      >
        {label}
      </Text>

      <Text
        style={{
          color: TEXT,
          fontSize: 14,
          fontWeight: "800",
          lineHeight: 20,
          marginTop: 6,
        }}
      >
        {formatAnswerValue(value)}
      </Text>
    </View>
  );
}

function EmptyAnswers() {
  return (
    <View
      style={{
        padding: 13,
        borderRadius: 18,
        backgroundColor: "rgba(180, 83, 9, 0.07)",
        borderWidth: 1,
        borderColor: "rgba(180, 83, 9, 0.13)",
        marginTop: 6,
      }}
    >
      <Text
        style={{
          color: MUTED,
          fontSize: 13,
          fontWeight: "800",
          lineHeight: 19,
        }}
      >
        No custom answers were submitted for this registration.
      </Text>
    </View>
  );
}

function ErrorCard({ message }) {
  return (
    <View
      style={{
        backgroundColor: WHITE,
        borderRadius: 26,
        padding: 18,
        borderWidth: 1,
        borderColor: "rgba(153, 27, 27, 0.18)",
        shadowColor: DANGER_RED,
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
        elevation: 2,
      }}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: "rgba(153, 27, 27, 0.08)",
          borderWidth: 1,
          borderColor: "rgba(153, 27, 27, 0.16)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 13,
        }}
      >
        <Ionicons name="warning-outline" size={25} color={DANGER_RED} />
      </View>

      <Text
        style={{
          color: TEXT,
          fontSize: 21,
          fontWeight: "900",
          letterSpacing: -0.4,
        }}
      >
        Could not load detail
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
        {message || "Something went wrong while loading this registration."}
      </Text>
    </View>
  );
}

export default function ChurchEventRegistrationDetail({ route, navigation }) {
  const { churchId, churchName, eventId, registrationId } = route?.params || {};

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [errorText, setErrorText] = useState("");
  const [actionError, setActionError] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadData() {
      if (!eventId || !registrationId) {
        setLoading(false);
        setErrorText("Missing event ID or registration ID.");
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

        const { data: registrationRow, error: registrationError } =
          await supabase
            .from("event_registrations")
            .select("*")
            .eq("id", registrationId)
            .eq("event_id", eventId)
            .single();

        if (registrationError) throw registrationError;

        if (!alive) return;

        setEvent(eventRow || null);
        setRegistration(registrationRow || null);
        setAdminNotes(registrationRow?.admin_notes || "");
        setNotesSaved(false);
      } catch (e) {
        console.log("ChurchEventRegistrationDetail load error:", e);

        if (!alive) return;

        setEvent(null);
        setRegistration(null);
        setErrorText(
          e?.message || "Something went wrong while loading this registration."
        );
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadData();

    return () => {
      alive = false;
    };
  }, [eventId, registrationId, churchId]);

  const mappedAnswers = useMemo(() => {
    const questions = Array.isArray(event?.registration_questions)
      ? event.registration_questions
      : [];

    const answers =
      registration?.answers &&
      typeof registration.answers === "object" &&
      !Array.isArray(registration.answers)
        ? registration.answers
        : {};

    const usedKeys = new Set();

    const mappedFromQuestions = questions.map((question, index) => {
      const id = getQuestionId(question);
      const label = getQuestionLabel(question);

      let value = undefined;

      if (id && Object.prototype.hasOwnProperty.call(answers, id)) {
        value = answers[id];
        usedKeys.add(id);
      } else {
        const possibleKey = `q_${index + 1}`;
        if (Object.prototype.hasOwnProperty.call(answers, possibleKey)) {
          value = answers[possibleKey];
          usedKeys.add(possibleKey);
        }
      }

      return {
        key: id || `question_${index}`,
        label,
        value,
      };
    });

    const extraAnswers = Object.entries(answers)
      .filter(([key]) => !usedKeys.has(key))
      .map(([key, value]) => ({
        key,
        label: key,
        value,
      }));

    return [...mappedFromQuestions, ...extraAnswers].filter(
      (item) => item.value !== undefined && item.value !== null && item.value !== ""
    );
  }, [event, registration]);

  const title = event?.title || "Event registration";
  const subtitle = churchName || "Church";

  async function updateRegistrationStatus(nextStatus) {
    if (!registration?.id || !eventId) return;

    const safeStatus = normaliseStatus(nextStatus);

    if (normaliseStatus(registration?.status) === safeStatus) {
      return;
    }

    try {
      setSavingStatus(true);
      setActionError("");

      const updatedAt = new Date().toISOString();

      const { data, error } = await supabase
        .from("event_registrations")
        .update({
          status: safeStatus,
          updated_at: updatedAt,
        })
        .eq("id", registration.id)
        .eq("event_id", eventId)
        .select("*")
        .single();

      if (error) throw error;

      setRegistration(
        data || {
          ...registration,
          status: safeStatus,
          updated_at: updatedAt,
        }
      );
    } catch (e) {
      console.log("ChurchEventRegistrationDetail status update error:", e);
      setActionError(e?.message || "Could not update this registration status.");
    } finally {
      setSavingStatus(false);
    }
  }

  function openPhone(phone) {
    if (!phone) return;

    const cleaned = String(phone).replace(/\s+/g, "");

    Linking.openURL(`tel:${cleaned}`).catch((e) => {
      console.log("Could not open phone link:", e);
      setActionError("Could not open the phone app.");
    });
  }

  function openEmail(email) {
    if (!email) return;

    Linking.openURL(`mailto:${email}`).catch((e) => {
      console.log("Could not open email link:", e);
      setActionError("Could not open the email app.");
    });
  }

  async function saveAdminNotes() {
    if (!registration?.id || !eventId) return;

    try {
      setSavingNotes(true);
      setNotesSaved(false);
      setActionError("");

      const updatedAt = new Date().toISOString();

      const { data, error } = await supabase
        .from("event_registrations")
        .update({
          admin_notes: adminNotes,
          updated_at: updatedAt,
        })
        .eq("id", registration.id)
        .eq("event_id", eventId)
        .select("*")
        .single();

      if (error) throw error;

      setRegistration(
        data || {
          ...registration,
          admin_notes: adminNotes,
          updated_at: updatedAt,
        }
      );

      setNotesSaved(true);
    } catch (e) {
      console.log("ChurchEventRegistrationDetail notes update error:", e);
      setActionError(e?.message || "Could not save admin notes.");
    } finally {
      setSavingNotes(false);
    }
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
                  fontSize: 28,
                  lineHeight: 32,
                  fontWeight: "900",
                  letterSpacing: -0.5,
                }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
              >
                Registration Detail
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
                minHeight: 170,
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
                Loading registration detail…
              </Text>
            </View>
          ) : errorText ? (
            <ErrorCard message={errorText} />
          ) : (
            <>
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
                    width: 54,
                    height: 54,
                    borderRadius: 27,
                    backgroundColor: "rgba(180, 83, 9, 0.11)",
                    borderWidth: 1,
                    borderColor: "rgba(180, 83, 9, 0.20)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                  }}
                >
                  <Ionicons name="person-outline" size={26} color={EVENT_AMBER} />
                </View>

                <Text
                  style={{
                    color: TEXT,
                    fontSize: 24,
                    fontWeight: "900",
                    letterSpacing: -0.5,
                    lineHeight: 29,
                  }}
                >
                  {registration?.name || "Unnamed registrant"}
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 13.5,
                    fontWeight: "800",
                    lineHeight: 20,
                    marginTop: 6,
                  }}
                >
                  {title}
                </Text>

                <View style={{ marginTop: 13 }}>
                  <StatusBadge status={registration?.status} />
                </View>
              </View>

              <SectionCard
                title="Follow-up status"
                subtitle="Update where this person is in the admin follow-up process"
                icon="checkmark-done-outline"
              >
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 10,
                    marginTop: 4,
                  }}
                >
                  <StatusActionButton
                    label="New"
                    status="new"
                    active={normaliseStatus(registration?.status) === "new"}
                    disabled={savingStatus}
                    onPress={() => updateRegistrationStatus("new")}
                  />

                  <StatusActionButton
                    label="Contacted"
                    status="contacted"
                    active={normaliseStatus(registration?.status) === "contacted"}
                    disabled={savingStatus}
                    onPress={() => updateRegistrationStatus("contacted")}
                  />

                  <StatusActionButton
                    label="Confirmed"
                    status="confirmed"
                    active={normaliseStatus(registration?.status) === "confirmed"}
                    disabled={savingStatus}
                    onPress={() => updateRegistrationStatus("confirmed")}
                  />

                  <StatusActionButton
                    label="Cancelled"
                    status="cancelled"
                    active={normaliseStatus(registration?.status) === "cancelled"}
                    disabled={savingStatus}
                    onPress={() => updateRegistrationStatus("cancelled")}
                  />
                </View>

                {savingStatus ? (
                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 12.5,
                      fontWeight: "800",
                      marginTop: 11,
                    }}
                  >
                    Saving status…
                  </Text>
                ) : null}

                {actionError ? (
                  <Text
                    style={{
                      color: DANGER_RED,
                      fontSize: 12.5,
                      fontWeight: "800",
                      lineHeight: 18,
                      marginTop: 11,
                    }}
                  >
                    {actionError}
                  </Text>
                ) : null}
              </SectionCard>

              <SectionCard
                title="Contact details"
                subtitle="Information submitted by the registrant"
                icon="call-outline"
              >
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <QuickActionButton
                    icon="call-outline"
                    label="Call"
                    disabled={!registration?.phone}
                    onPress={() => openPhone(registration?.phone)}
                  />

                  <QuickActionButton
                    icon="mail-outline"
                    label="Email"
                    disabled={!registration?.email}
                    onPress={() => openEmail(registration?.email)}
                  />
                </View>

                <DetailRow
                  icon="mail-outline"
                  label="Email"
                  value={registration?.email}
                />

                <DetailRow
                  icon="call-outline"
                  label="Phone"
                  value={registration?.phone}
                />

                <DetailRow
                  icon="people-outline"
                  label="Number attending"
                  value={String(registration?.number_attending || 1)}
                />

                <DetailRow
                  icon="time-outline"
                  label="Registered"
                  value={formatDateTime(registration?.created_at)}
                />
              </SectionCard>

              <SectionCard
                title="Registration notes"
                subtitle="Message, accessibility and consent"
                icon="document-text-outline"
              >
                <DetailRow
                  icon="chatbubble-ellipses-outline"
                  label="Message"
                  value={registration?.message}
                />

                <DetailRow
                  icon="accessibility-outline"
                  label="Accessibility needs"
                  value={registration?.accessibility_needs}
                />

                <DetailRow
                  icon="shield-checkmark-outline"
                  label="Consent to contact"
                  value={formatBoolean(registration?.consent_to_contact)}
                />
              </SectionCard>

              <SectionCard
                title="Admin notes"
                subtitle="Private follow-up notes for church admins"
                icon="create-outline"
              >
                <TextInput
                  value={adminNotes}
                  onChangeText={(text) => {
                    setAdminNotes(text);
                    setNotesSaved(false);
                  }}
                  placeholder="Add notes for follow-up..."
                  placeholderTextColor={MUTED}
                  multiline
                  textAlignVertical="top"
                  style={{
                    minHeight: 120,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: "rgba(15, 23, 42, 0.08)",
                    backgroundColor: "rgba(255,255,255,0.85)",
                    paddingHorizontal: 13,
                    paddingVertical: 12,
                    color: TEXT,
                    fontSize: 14,
                    fontWeight: "700",
                    lineHeight: 20,
                  }}
                />

                <Pressable
                  onPress={saveAdminNotes}
                  disabled={savingNotes}
                  style={({ pressed }) => ({
                    marginTop: 12,
                    borderRadius: 18,
                    paddingVertical: 13,
                    paddingHorizontal: 14,
                    backgroundColor: savingNotes
                      ? "rgba(79, 99, 59, 0.45)"
                      : OLIVE,
                    alignItems: "center",
                    justifyContent: "center",
                    transform: [{ scale: pressed && !savingNotes ? 0.98 : 1 }],
                  })}
                >
                  <Text
                    style={{
                      color: WHITE,
                      fontSize: 13,
                      fontWeight: "900",
                    }}
                  >
                    {savingNotes ? "Saving notes…" : "Save admin notes"}
                  </Text>
                </Pressable>

                {notesSaved ? (
                  <Text
                    style={{
                      color: OLIVE,
                      fontSize: 12.5,
                      fontWeight: "900",
                      marginTop: 10,
                    }}
                  >
                    Notes saved.
                  </Text>
                ) : null}
              </SectionCard>

              <SectionCard
                title="Custom answers"
                subtitle="Mapped from this event’s registration form"
                icon="list-outline"
              >
                {mappedAnswers.length === 0 ? (
                  <EmptyAnswers />
                ) : (
                  mappedAnswers.map((answer) => (
                    <AnswerCard
                      key={answer.key}
                      label={answer.label}
                      value={answer.value}
                    />
                  ))
                )}
              </SectionCard>

              <View
                style={{
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
                  Next admin step
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontWeight: "700",
                    lineHeight: 19,
                    marginTop: 6,
                  }}
                >
                  Next we can add large-event search, filters, summary totals,
                  and ticket/payment status.
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}