// src/features/events/screens/RegisterEventScreen.js
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

import Screen from "../../../components/Screen";
import { theme } from "../../../theme/theme";
import {
  createEventRegistration,
  fetchMyEventRegistration,
} from "../services/eventRegistrationsService";

const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const CREAM = theme.premium?.colors?.cream || "#FFFCF5";
const WHITE = theme.premium?.colors?.surface || "#FFFFFF";
const OLIVE = theme.premium?.colors?.olive || "#4F633B";
const MUTED = theme.premium?.colors?.muted || theme.colors.muted;
const TEXT = theme.premium?.colors?.text || theme.colors.text;
const CARD_BORDER =
  theme.premium?.colors?.cardBorder || "rgba(15, 23, 42, 0.08)";

function FieldLabel({ children, style }) {
  return <Text style={[labelStyle, style]}>{children}</Text>;
}

function getRegistrationQuestions(event) {
  return Array.isArray(event?.registration_questions)
    ? event.registration_questions
    : [];
}

function getQuestionTypeLabel(type) {
  if (type === "long_text") return "Long answer";
  if (type === "yes_no") return "Yes / No";
  if (type === "single_choice") return "Choose one";
  if (type === "multi_choice") return "Choose any";
  return "Short answer";
}

function isAnswerEmpty(question, value) {
  if (question?.type === "multi_choice") {
    return !Array.isArray(value) || value.length === 0;
  }

  return !String(value || "").trim();
}

function normaliseAgeGroup(value) {
  if (value === "child") return "child";
  return "adult";
}

function getAgeGroupLabel(value) {
  return normaliseAgeGroup(value) === "child"
    ? "Child under 17"
    : "Adult 18+";
}

function PremiumButton({ title, icon, onPress, disabled, variant = "primary" }) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        minHeight: 52,
        borderRadius: 999,
        paddingHorizontal: 18,
        paddingVertical: 13,
        backgroundColor: isPrimary
          ? pressed
            ? "rgba(180, 83, 9, 0.88)"
            : EVENT_AMBER
          : pressed
          ? "rgba(79, 99, 59, 0.08)"
          : WHITE,
        borderWidth: 1,
        borderColor: isPrimary ? EVENT_AMBER : CARD_BORDER,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.6 : 1,
        shadowColor: isPrimary ? EVENT_AMBER : "rgba(15, 23, 42, 0.08)",
        shadowOpacity: pressed ? 0.08 : isPrimary ? 0.22 : 0.1,
        shadowRadius: pressed ? 7 : isPrimary ? 11 : 8,
        shadowOffset: { width: 0, height: pressed ? 2 : 5 },
        elevation: pressed ? 1 : isPrimary ? 4 : 2,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={isPrimary ? "#fff" : OLIVE}
          style={{ marginRight: 8 }}
        />
      ) : null}

      <Text
        style={{
          color: isPrimary ? "#fff" : OLIVE,
          fontSize: 15,
          fontWeight: "900",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function ChoiceButton({ label, active, onPress, multi = false }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: active
          ? "rgba(180, 83, 9, 0.12)"
          : pressed
          ? "rgba(79, 99, 59, 0.08)"
          : WHITE,
        borderWidth: 1,
        borderColor: active ? "rgba(180, 83, 9, 0.26)" : CARD_BORDER,
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
      })}
    >
      <Ionicons
        name={
          multi
            ? active
              ? "checkbox"
              : "square-outline"
            : active
            ? "radio-button-on"
            : "radio-button-off-outline"
        }
        size={17}
        color={active ? EVENT_AMBER : OLIVE}
        style={{ marginRight: 7 }}
      />

      <Text
        style={{
          color: active ? EVENT_AMBER : OLIVE,
          fontWeight: "900",
          fontSize: 13,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function AgeGroupButton({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: "46%",
        borderRadius: 999,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: active
          ? "rgba(79, 99, 59, 0.12)"
          : pressed
          ? "rgba(79, 99, 59, 0.07)"
          : WHITE,
        borderWidth: 1,
        borderColor: active ? "rgba(79, 99, 59, 0.25)" : CARD_BORDER,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
      })}
    >
      <Ionicons
        name={active ? "checkmark-circle" : "ellipse-outline"}
        size={17}
        color={active ? OLIVE : MUTED}
        style={{ marginRight: 7 }}
      />

      <Text
        style={{
          color: active ? OLIVE : TEXT,
          fontWeight: "900",
          fontSize: 12.5,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function CustomQuestionField({ question, value, onChange }) {
  const cleanOptions = Array.isArray(question?.options)
    ? question.options.map((option) => String(option || "").trim()).filter(Boolean)
    : [];

  if (question?.type === "long_text") {
    return (
      <TextInput
        value={String(value || "")}
        onChangeText={onChange}
        placeholder="Type your answer"
        placeholderTextColor={theme.input.placeholder}
        multiline
        textAlignVertical="top"
        style={[
          theme.input.box,
          premiumInputStyle,
          {
            minHeight: 90,
            paddingTop: 12,
          },
        ]}
      />
    );
  }

  if (question?.type === "yes_no") {
    return (
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 8,
        }}
      >
        <ChoiceButton
          label="Yes"
          active={value === "Yes"}
          onPress={() => onChange("Yes")}
        />

        <ChoiceButton
          label="No"
          active={value === "No"}
          onPress={() => onChange("No")}
        />
      </View>
    );
  }

  if (question?.type === "single_choice") {
    return (
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 8,
        }}
      >
        {cleanOptions.map((option) => (
          <ChoiceButton
            key={`${question.id}-${option}`}
            label={option}
            active={value === option}
            onPress={() => onChange(option)}
          />
        ))}
      </View>
    );
  }

  if (question?.type === "multi_choice") {
    const selectedValues = Array.isArray(value) ? value : [];

    return (
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 8,
        }}
      >
        {cleanOptions.map((option) => {
          const active = selectedValues.includes(option);

          return (
            <ChoiceButton
              key={`${question.id}-${option}`}
              label={option}
              active={active}
              multi
              onPress={() => {
                if (active) {
                  onChange(selectedValues.filter((item) => item !== option));
                } else {
                  onChange([...selectedValues, option]);
                }
              }}
            />
          );
        })}
      </View>
    );
  }

  return (
    <TextInput
      value={String(value || "")}
      onChangeText={onChange}
      placeholder="Type your answer"
      placeholderTextColor={theme.input.placeholder}
      style={[theme.input.box, premiumInputStyle]}
    />
  );
}

function AdditionalAttendeeCard({ index, attendee, onChange }) {
  const attendeeName = attendee?.name || "";
  const ageGroup = normaliseAgeGroup(attendee?.age_group);

  return (
    <View
      style={{
        marginTop: 13,
        padding: 13,
        borderRadius: 20,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "rgba(79, 99, 59, 0.13)",
      }}
    >
      <Text
        style={{
          color: OLIVE,
          fontSize: 14,
          fontWeight: "900",
          marginBottom: 10,
        }}
      >
        Additional attendee {index + 1}
      </Text>

      <FieldLabel>Name *</FieldLabel>
      <TextInput
        value={attendeeName}
        onChangeText={(text) =>
          onChange({
            ...attendee,
            name: text,
            age_group: ageGroup,
          })
        }
        placeholder="Full name"
        placeholderTextColor={theme.input.placeholder}
        style={[theme.input.box, premiumInputStyle]}
      />

      <FieldLabel style={{ marginTop: 12 }}>Age group *</FieldLabel>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 8,
        }}
      >
        <AgeGroupButton
          label="Adult 18+"
          active={ageGroup === "adult"}
          onPress={() =>
            onChange({
              ...attendee,
              name: attendeeName,
              age_group: "adult",
            })
          }
        />

        <AgeGroupButton
          label="Child under 17"
          active={ageGroup === "child"}
          onPress={() =>
            onChange({
              ...attendee,
              name: attendeeName,
              age_group: "child",
            })
          }
        />
      </View>
    </View>
  );
}

export default function RegisterEventScreen({ route, navigation }) {
  const params = route?.params || {};
  const event = params?.event || null;
  const eventId = params?.eventId || event?.id || null;
  const registrationQuestions = getRegistrationQuestions(event);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [numberAttending, setNumberAttending] = useState("1");
  const [attendeeDetails, setAttendeeDetails] = useState([]);
  const [message, setMessage] = useState("");
  const [accessibilityNeeds, setAccessibilityNeeds] = useState("");
  const [consentToContact, setConsentToContact] = useState(true);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);

  const additionalAttendeeCount = useMemo(() => {
    const value = Number(numberAttending || 1);

    if (!Number.isFinite(value) || value < 2) return 0;

    return Math.max(0, Math.floor(value) - 1);
  }, [numberAttending]);

  useEffect(() => {
    setAttendeeDetails((current) => {
      const next = [...current];

      while (next.length < additionalAttendeeCount) {
        next.push({
          name: "",
          age_group: "adult",
        });
      }

      return next.slice(0, additionalAttendeeCount);
    });
  }, [additionalAttendeeCount]);

  function updateAnswer(questionId, value) {
    setAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
  }

  function updateAttendee(index, nextAttendee) {
    setAttendeeDetails((current) => {
      const next = [...current];
      next[index] = {
        name: nextAttendee?.name || "",
        age_group: normaliseAgeGroup(nextAttendee?.age_group),
      };
      return next;
    });
  }

  function getCleanAnswersForSave() {
    const cleanAnswers = {};

    registrationQuestions.forEach((question) => {
      if (!question?.id) return;

      const value = answers[question.id];

      if (question?.type === "multi_choice") {
        cleanAnswers[question.id] = Array.isArray(value) ? value : [];
        return;
      }

      cleanAnswers[question.id] = String(value || "").trim();
    });

    return cleanAnswers;
  }

  function getCleanAttendeeDetailsForSave(attendingNumber) {
    const extraCount = Math.max(0, attendingNumber - 1);

    return attendeeDetails.slice(0, extraCount).map((attendee) => ({
      name: String(attendee?.name || "").trim(),
      age_group: normaliseAgeGroup(attendee?.age_group),
      age_group_label: getAgeGroupLabel(attendee?.age_group),
    }));
  }

  async function handleSubmit() {
    if (!eventId) {
      Alert.alert("Register", "Missing event details.");
      return;
    }

    if (!name.trim()) {
      Alert.alert("Register", "Please add your name.");
      return;
    }

    const attendingNumber = Number(numberAttending || 1);

    if (
      !Number.isFinite(attendingNumber) ||
      !Number.isInteger(attendingNumber) ||
      attendingNumber < 1
    ) {
      Alert.alert("Register", "Number attending must be a whole number of at least 1.");
      return;
    }

    const cleanAttendeeDetails = getCleanAttendeeDetailsForSave(attendingNumber);

    const missingAttendeeIndex = cleanAttendeeDetails.findIndex(
      (attendee) => !attendee.name
    );

    if (missingAttendeeIndex >= 0) {
      Alert.alert(
        "Register",
        `Please add the name for additional attendee ${missingAttendeeIndex + 1}.`
      );
      return;
    }

    const missingRequiredQuestion = registrationQuestions.find((question) => {
      if (!question?.required) return false;
      return isAnswerEmpty(question, answers[question.id]);
    });

    if (missingRequiredQuestion) {
      Alert.alert(
        "Register",
        `Please answer: ${missingRequiredQuestion.label}`
      );
      return;
    }

    try {
      setSaving(true);

      const existing = await fetchMyEventRegistration(eventId);

      if (existing.ok && existing.registration) {
        Alert.alert(
          "Already registered",
          "You are already registered for this event.",
          [
            {
              text: "View Event",
              onPress: () =>
                navigation.replace("EventDetails", {
                  eventId,
                  event,
                }),
            },
          ]
        );
        return;
      }

      const res = await createEventRegistration({
        eventId,
        name,
        email,
        phone,
        numberAttending: attendingNumber,
        attendeeDetails: cleanAttendeeDetails,
        message,
        accessibilityNeeds,
        consentToContact,
        answers: getCleanAnswersForSave(),
      });

      if (!res.ok) {
        Alert.alert("Register", res.error || "Could not register right now.");
        return;
      }

      Alert.alert(
        "Registration sent",
        "Your registration has been sent to the event organiser.",
        [
          {
            text: "View Event",
            onPress: () =>
              navigation.replace("EventDetails", {
                eventId,
                event,
              }),
          },
        ]
      );
    } catch (e) {
      console.log("RegisterEventScreen handleSubmit error:", e);
      Alert.alert("Register", "Could not register right now.");
    } finally {
      setSaving(false);
    }
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
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 18,
              paddingBottom: bottomPad + 22,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
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
                    fontSize: 31,
                    lineHeight: 35,
                  }}
                  numberOfLines={1}
                >
                  Register
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
                  {event?.title || "Event registration"}
                </Text>
              </View>
            </View>

            <View
              style={{
                backgroundColor: WHITE,
                borderRadius: 26,
                padding: 16,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                shadowColor: "rgba(15, 23, 42, 0.08)",
                shadowOpacity: 0.12,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 5 },
                elevation: 3,
              }}
            >
              <View
                style={{
                  padding: 13,
                  borderRadius: 18,
                  backgroundColor: "rgba(180, 83, 9, 0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(180, 83, 9, 0.16)",
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    color: TEXT,
                    fontWeight: "900",
                    fontSize: 15,
                  }}
                >
                  {event?.title || "Event"}
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontWeight: "700",
                    lineHeight: 18,
                    marginTop: 4,
                  }}
                >
                  Your details will be sent to the event organiser so they can
                  manage attendance and contact you about this event.
                </Text>
              </View>

              <FieldLabel>Name *</FieldLabel>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                placeholderTextColor={theme.input.placeholder}
                style={[theme.input.box, premiumInputStyle]}
              />

              <FieldLabel style={{ marginTop: 14 }}>Email</FieldLabel>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={theme.input.placeholder}
                autoCapitalize="none"
                keyboardType="email-address"
                style={[theme.input.box, premiumInputStyle]}
              />

              <FieldLabel style={{ marginTop: 14 }}>Phone</FieldLabel>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Optional phone number"
                placeholderTextColor={theme.input.placeholder}
                keyboardType="phone-pad"
                style={[theme.input.box, premiumInputStyle]}
              />

              <FieldLabel style={{ marginTop: 14 }}>Number attending</FieldLabel>
              <TextInput
                value={numberAttending}
                onChangeText={setNumberAttending}
                placeholder="1"
                placeholderTextColor={theme.input.placeholder}
                keyboardType="number-pad"
                style={[theme.input.box, premiumInputStyle]}
              />

              {additionalAttendeeCount > 0 ? (
                <View
                  style={{
                    marginTop: 18,
                    padding: 14,
                    borderRadius: 22,
                    backgroundColor: "rgba(180, 83, 9, 0.06)",
                    borderWidth: 1,
                    borderColor: "rgba(180, 83, 9, 0.13)",
                  }}
                >
                  <Text
                    style={{
                      color: TEXT,
                      fontSize: 17,
                      fontWeight: "900",
                    }}
                  >
                    Additional attendees
                  </Text>

                  <Text
                    style={{
                      color: MUTED,
                      marginTop: 5,
                      lineHeight: 18,
                      fontSize: 12.5,
                      fontWeight: "700",
                    }}
                  >
                    You are already included as the main contact. Please add the
                    other people attending with you.
                  </Text>

                  {attendeeDetails.map((attendee, index) => (
                    <AdditionalAttendeeCard
                      key={`attendee-${index}`}
                      index={index}
                      attendee={attendee}
                      onChange={(nextAttendee) =>
                        updateAttendee(index, nextAttendee)
                      }
                    />
                  ))}
                </View>
              ) : null}

              {registrationQuestions.length > 0 ? (
                <View
                  style={{
                    marginTop: 18,
                    padding: 14,
                    borderRadius: 22,
                    backgroundColor: "rgba(79, 99, 59, 0.06)",
                    borderWidth: 1,
                    borderColor: "rgba(79, 99, 59, 0.13)",
                  }}
                >
                  <Text
                    style={{
                      color: TEXT,
                      fontSize: 17,
                      fontWeight: "900",
                    }}
                  >
                    Event questions
                  </Text>

                  <Text
                    style={{
                      color: MUTED,
                      marginTop: 5,
                      lineHeight: 18,
                      fontSize: 12.5,
                      fontWeight: "700",
                    }}
                  >
                    Please answer the extra questions added by the organiser.
                  </Text>

                  {registrationQuestions.map((question, index) => (
                    <View
                      key={question.id || `question-${index}`}
                      style={{
                        marginTop: 14,
                        paddingTop: 14,
                        borderTopWidth: index === 0 ? 0 : 1,
                        borderTopColor: "rgba(15, 23, 42, 0.07)",
                      }}
                    >
                      <FieldLabel>
                        {question.label}
                        {question.required ? " *" : ""}
                      </FieldLabel>

                      <Text
                        style={{
                          color: MUTED,
                          marginTop: 4,
                          fontSize: 12,
                          fontWeight: "700",
                        }}
                      >
                        {getQuestionTypeLabel(question.type)}
                      </Text>

                      <CustomQuestionField
                        question={question}
                        value={answers[question.id]}
                        onChange={(value) => updateAnswer(question.id, value)}
                      />
                    </View>
                  ))}
                </View>
              ) : null}

              <FieldLabel style={{ marginTop: 14 }}>Message/question</FieldLabel>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Optional message for the organiser"
                placeholderTextColor={theme.input.placeholder}
                multiline
                textAlignVertical="top"
                style={[
                  theme.input.box,
                  premiumInputStyle,
                  {
                    minHeight: 90,
                    paddingTop: 12,
                  },
                ]}
              />

              <FieldLabel style={{ marginTop: 14 }}>
                Accessibility needs
              </FieldLabel>
              <TextInput
                value={accessibilityNeeds}
                onChangeText={setAccessibilityNeeds}
                placeholder="Optional accessibility needs"
                placeholderTextColor={theme.input.placeholder}
                multiline
                textAlignVertical="top"
                style={[
                  theme.input.box,
                  premiumInputStyle,
                  {
                    minHeight: 80,
                    paddingTop: 12,
                  },
                ]}
              />

              <Pressable
                onPress={() => setConsentToContact((v) => !v)}
                style={({ pressed }) => ({
                  marginTop: 16,
                  flexDirection: "row",
                  alignItems: "flex-start",
                  padding: 12,
                  borderRadius: 18,
                  backgroundColor: pressed
                    ? "rgba(79, 99, 59, 0.10)"
                    : "rgba(79, 99, 59, 0.07)",
                  borderWidth: 1,
                  borderColor: "rgba(79, 99, 59, 0.14)",
                })}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: consentToContact ? OLIVE : WHITE,
                    borderWidth: 1,
                    borderColor: consentToContact ? OLIVE : CARD_BORDER,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 10,
                    marginTop: 1,
                  }}
                >
                  {consentToContact ? (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  ) : null}
                </View>

                <Text
                  style={{
                    flex: 1,
                    color: TEXT,
                    fontWeight: "700",
                    lineHeight: 19,
                  }}
                >
                  I’m happy for the organiser to contact me about this event.
                </Text>
              </Pressable>

              <View style={{ marginTop: 20 }}>
                {saving ? (
                  <View style={{ alignItems: "center", paddingVertical: 8 }}>
                    <ActivityIndicator color={EVENT_AMBER} />

                    <Text
                      style={{
                        color: MUTED,
                        marginTop: 8,
                        fontWeight: "700",
                      }}
                    >
                      Sending registration…
                    </Text>
                  </View>
                ) : (
                  <>
                    <PremiumButton
                      title="Send Registration"
                      icon="send-outline"
                      onPress={handleSubmit}
                      disabled={saving}
                    />

                    <View style={{ height: 10 }} />

                    <PremiumButton
                      title="Cancel"
                      icon="close-outline"
                      onPress={() => navigation.goBack()}
                      disabled={saving}
                      variant="outline"
                    />
                  </>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}

const labelStyle = {
  color: TEXT,
  fontWeight: "900",
};

const premiumInputStyle = {
  marginTop: 6,
  borderRadius: 18,
  backgroundColor: WHITE,
  borderColor: CARD_BORDER,
  color: TEXT,
  fontWeight: "700",
};