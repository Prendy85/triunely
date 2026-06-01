// src/features/events/screens/CreateEventScreen.js
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as LegacyFileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import Screen from "../../../components/Screen";
import { supabase } from "../../../lib/supabase";
import { theme } from "../../../theme/theme";
import { createEvent } from "../services/eventsService";

const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const CREAM = theme.premium?.colors?.cream || "#FFFCF5";
const WHITE = theme.premium?.colors?.surface || "#FFFFFF";
const OLIVE = theme.premium?.colors?.olive || "#4F633B";
const MUTED = theme.premium?.colors?.muted || theme.colors.muted;
const TEXT = theme.premium?.colors?.text || theme.colors.text;
const CARD_BORDER =
  theme.premium?.colors?.cardBorder || "rgba(15, 23, 42, 0.08)";

function getDefaultStartDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(19, 0, 0, 0);
  return d;
}

function getDefaultEndDate(startDate) {
  const d = new Date(startDate || getDefaultStartDate());
  d.setHours(d.getHours() + 2);
  return d;
}

function combineDateAndTime(datePart, timePart) {
  const combined = new Date(datePart);
  combined.setHours(timePart.getHours());
  combined.setMinutes(timePart.getMinutes());
  combined.setSeconds(0);
  combined.setMilliseconds(0);
  return combined;
}

function formatDisplayDate(value) {
  if (!value) return "Choose date";

  try {
    return value.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Choose date";
  }
}

function formatDisplayTime(value) {
  if (!value) return "Choose time";

  try {
    return value.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Choose time";
  }
}

function getWeekdayName(value) {
  if (!value) return "selected day";

  try {
    return value.toLocaleDateString(undefined, {
      weekday: "long",
    });
  } catch {
    return "selected day";
  }
}

function getAttendanceMethodLabel(value) {
  if (value === "registration_required") return "Registration required";
  if (value === "external_registration") return "External registration";
  if (value === "invite_only") return "Invite-only";
  return "Open RSVP";
}

function createQuestionId() {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getQuestionTypeLabel(value) {
  if (value === "long_text") return "Long answer";
  if (value === "yes_no") return "Yes / No";
  if (value === "single_choice") return "Single choice";
  if (value === "multi_choice") return "Multiple choice";
  return "Short answer";
}

function questionNeedsOptions(type) {
  return type === "single_choice" || type === "multi_choice";
}

function FieldLabel({ children, style }) {
  return <Text style={[labelStyle, style]}>{children}</Text>;
}

function OptionChip({ label, active, onPress, icon }) {
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
        shadowColor: active ? EVENT_AMBER : "rgba(15, 23, 42, 0.08)",
        shadowOpacity: pressed ? 0.04 : active ? 0.08 : 0.03,
        shadowRadius: pressed ? 4 : 6,
        shadowOffset: { width: 0, height: pressed ? 1 : 2 },
        elevation: pressed ? 1 : active ? 2 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={15}
          color={active ? EVENT_AMBER : OLIVE}
          style={{ marginRight: 6 }}
        />
      ) : null}

      <Text
        style={{
          color: active ? EVENT_AMBER : OLIVE,
          fontWeight: "900",
          fontSize: 12.5,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function PickerCard({ icon, label, value, onPress, muted = false }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        marginTop: 8,
        borderRadius: 18,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: pressed ? "rgba(180, 83, 9, 0.26)" : CARD_BORDER,
        padding: 13,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "rgba(15, 23, 42, 0.08)",
        shadowOpacity: pressed ? 0.04 : 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: pressed ? 1 : 3 },
        elevation: pressed ? 1 : 2,
        transform: [{ scale: pressed ? 0.992 : 1 }],
      })}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: "rgba(180, 83, 9, 0.10)",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Ionicons name={icon} size={19} color={EVENT_AMBER} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            color: MUTED,
            fontSize: 11.5,
            fontWeight: "900",
            textTransform: "uppercase",
            letterSpacing: 0.35,
          }}
        >
          {label}
        </Text>

        <Text
          style={{
            color: muted ? MUTED : TEXT,
            fontSize: 15,
            fontWeight: "900",
            marginTop: 2,
          }}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={OLIVE} />
    </Pressable>
  );
}

function PremiumCreateButton({ title, onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        minHeight: 52,
        borderRadius: 999,
        paddingHorizontal: 18,
        paddingVertical: 13,
        backgroundColor: pressed
          ? "rgba(180, 83, 9, 0.88)"
          : EVENT_AMBER,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.6 : 1,
        shadowColor: EVENT_AMBER,
        shadowOpacity: pressed ? 0.12 : 0.22,
        shadowRadius: pressed ? 7 : 11,
        shadowOffset: { width: 0, height: pressed ? 2 : 5 },
        elevation: pressed ? 2 : 4,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <Ionicons name="sparkles-outline" size={18} color="#fff" />

      <Text
        style={{
          color: "#fff",
          fontSize: 15,
          fontWeight: "900",
          marginLeft: 8,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function SmallOutlineButton({ title, icon, onPress, danger = false }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        alignSelf: "flex-start",
        marginTop: 9,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: danger
          ? pressed
            ? "rgba(153, 27, 27, 0.10)"
            : "rgba(153, 27, 27, 0.06)"
          : pressed
          ? "rgba(79, 99, 59, 0.10)"
          : WHITE,
        borderWidth: 1,
        borderColor: danger ? "rgba(153, 27, 27, 0.16)" : CARD_BORDER,
        flexDirection: "row",
        alignItems: "center",
      })}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={15}
          color={danger ? "#991B1B" : OLIVE}
          style={{ marginRight: 6 }}
        />
      ) : null}

      <Text
        style={{
          color: danger ? "#991B1B" : OLIVE,
          fontSize: 12,
          fontWeight: "900",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function RegistrationQuestionCard({
  question,
  index,
  onUpdate,
  onRemove,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
}) {
  const needsOptions = questionNeedsOptions(question.type);

  return (
    <View
      style={{
        marginTop: 12,
        padding: 13,
        borderRadius: 20,
        backgroundColor: "rgba(79, 99, 59, 0.06)",
        borderWidth: 1,
        borderColor: "rgba(79, 99, 59, 0.13)",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: OLIVE,
              fontSize: 12,
              fontWeight: "900",
              textTransform: "uppercase",
              letterSpacing: 0.35,
            }}
          >
            Question {index + 1}
          </Text>

          <Text
            style={{
              color: MUTED,
              marginTop: 3,
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            {getQuestionTypeLabel(question.type)}
            {question.required ? " · Required" : ""}
          </Text>
        </View>

        <Pressable
          onPress={onRemove}
          hitSlop={10}
          style={({ pressed }) => ({
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: pressed
              ? "rgba(153, 27, 27, 0.12)"
              : "rgba(153, 27, 27, 0.07)",
            borderWidth: 1,
            borderColor: "rgba(153, 27, 27, 0.15)",
            alignItems: "center",
            justifyContent: "center",
          })}
        >
          <Ionicons name="trash-outline" size={17} color="#991B1B" />
        </Pressable>
      </View>

      <FieldLabel style={{ marginTop: 12 }}>Question text</FieldLabel>
      <TextInput
        value={question.label}
        onChangeText={(value) => onUpdate({ label: value })}
        placeholder="Example: Do you have any dietary requirements?"
        placeholderTextColor={theme.input.placeholder}
        style={[theme.input.box, premiumInputStyle]}
      />

      <FieldLabel style={{ marginTop: 12 }}>Answer type</FieldLabel>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 8,
        }}
      >
        <OptionChip
          label="Short"
          icon="text-outline"
          active={question.type === "short_text"}
          onPress={() => onUpdate({ type: "short_text", options: [] })}
        />

        <OptionChip
          label="Long"
          icon="document-text-outline"
          active={question.type === "long_text"}
          onPress={() => onUpdate({ type: "long_text", options: [] })}
        />

        <OptionChip
          label="Yes / No"
          icon="toggle-outline"
          active={question.type === "yes_no"}
          onPress={() => onUpdate({ type: "yes_no", options: [] })}
        />

        <OptionChip
          label="Single choice"
          icon="radio-button-on-outline"
          active={question.type === "single_choice"}
          onPress={() =>
            onUpdate({
              type: "single_choice",
              options:
                question.options && question.options.length > 0
                  ? question.options
                  : [""],
            })
          }
        />

        <OptionChip
          label="Multiple choice"
          icon="checkbox-outline"
          active={question.type === "multi_choice"}
          onPress={() =>
            onUpdate({
              type: "multi_choice",
              options:
                question.options && question.options.length > 0
                  ? question.options
                  : [""],
            })
          }
        />
      </View>

      <Pressable
        onPress={() => onUpdate({ required: !question.required })}
        style={({ pressed }) => ({
          marginTop: 11,
          padding: 11,
          borderRadius: 16,
          backgroundColor: question.required
            ? "rgba(180, 83, 9, 0.10)"
            : pressed
            ? "rgba(79, 99, 59, 0.08)"
            : WHITE,
          borderWidth: 1,
          borderColor: question.required
            ? "rgba(180, 83, 9, 0.20)"
            : CARD_BORDER,
          flexDirection: "row",
          alignItems: "center",
        })}
      >
        <Ionicons
          name={question.required ? "checkmark-circle" : "ellipse-outline"}
          size={19}
          color={question.required ? EVENT_AMBER : OLIVE}
          style={{ marginRight: 8 }}
        />

        <Text
          style={{
            color: question.required ? EVENT_AMBER : OLIVE,
            fontWeight: "900",
            fontSize: 13,
          }}
        >
          Required question
        </Text>
      </Pressable>

      {needsOptions ? (
        <View style={{ marginTop: 12 }}>
          <FieldLabel>Options</FieldLabel>

          {(question.options || []).map((option, optionIndex) => (
            <View
              key={`${question.id}-option-${optionIndex}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginTop: 8,
              }}
            >
              <TextInput
                value={option}
                onChangeText={(value) => onUpdateOption(optionIndex, value)}
                placeholder={`Option ${optionIndex + 1}`}
                placeholderTextColor={theme.input.placeholder}
                style={[
                  theme.input.box,
                  premiumInputStyle,
                  {
                    flex: 1,
                    marginTop: 0,
                  },
                ]}
              />

              <Pressable
                onPress={() => onRemoveOption(optionIndex)}
                hitSlop={8}
                style={({ pressed }) => ({
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed
                    ? "rgba(153, 27, 27, 0.12)"
                    : "rgba(153, 27, 27, 0.07)",
                  borderWidth: 1,
                  borderColor: "rgba(153, 27, 27, 0.14)",
                })}
              >
                <Ionicons name="close-outline" size={20} color="#991B1B" />
              </Pressable>
            </View>
          ))}

          <SmallOutlineButton
            title="Add option"
            icon="add-outline"
            onPress={onAddOption}
          />
        </View>
      ) : null}
    </View>
  );
}

export default function CreateEventScreen({ route, navigation }) {
  const params = route?.params || {};
  const defaultStart = getDefaultStartDate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [eventType, setEventType] = useState("single");
  const [attendanceMethod, setAttendanceMethod] = useState("open_rsvp");
  const [repeatType, setRepeatType] = useState("none");
  const [registrationQuestions, setRegistrationQuestions] = useState([]);

  const [eventDate, setEventDate] = useState(defaultStart);
  const [startTime, setStartTime] = useState(defaultStart);

  const [endDate, setEndDate] = useState(defaultStart);
  const [endTime, setEndTime] = useState(getDefaultEndDate(defaultStart));
  const [hasEndDateTime, setHasEndDateTime] = useState(false);

  const [pickerMode, setPickerMode] = useState(null);
  // pickerMode values: "date" | "startTime" | "endDate" | "endTime" | null

  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [onlineUrl, setOnlineUrl] = useState("");
  const [externalRegistrationUrl, setExternalRegistrationUrl] = useState("");

  const [eventImage, setEventImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [visibility, setVisibility] = useState(
    params?.churchId ? "church" : "public"
  );
  const [saving, setSaving] = useState(false);

  const churchId = params?.churchId || null;
  const churchName = params?.churchName || null;

  const isCourseProgramme = eventType === "course_programme";
  const isWeeklyCourse = isCourseProgramme && repeatType === "weekly";
  const repeatDay = isWeeklyCourse ? eventDate.getDay() : null;
  const isRegistrationRequired = attendanceMethod === "registration_required";

  const startDateTime = combineDateAndTime(eventDate, startTime);
  const endDateTime = hasEndDateTime
    ? combineDateAndTime(endDate, endTime)
    : null;

  function handlePickerChange(_, selectedDate) {
    if (Platform.OS === "android") {
      setPickerMode(null);
    }

    if (!selectedDate) return;

    if (pickerMode === "date") {
      setEventDate(selectedDate);

      if (!hasEndDateTime) {
        setEndDate(selectedDate);
      }

      return;
    }

    if (pickerMode === "startTime") {
      setStartTime(selectedDate);

      if (!hasEndDateTime) {
        const suggestedEnd = getDefaultEndDate(selectedDate);
        setEndTime(suggestedEnd);
      }

      return;
    }

    if (pickerMode === "endDate") {
      setEndDate(selectedDate);
      setHasEndDateTime(true);
      return;
    }

    if (pickerMode === "endTime") {
      setEndTime(selectedDate);
      setHasEndDateTime(true);
    }
  }

  function handleSelectEventType(nextType) {
    setEventType(nextType);

    if (nextType === "single") {
      setRepeatType("none");
    }

    if (nextType === "course_programme" && !hasEndDateTime) {
      setHasEndDateTime(true);
      setEndDate(eventDate);
      setEndTime(getDefaultEndDate(startTime));
    }
  }

  function handleSelectAttendanceMethod(nextMethod) {
    setAttendanceMethod(nextMethod);

    if (nextMethod === "invite_only") {
      setVisibility("invite_only");
    }
  }

  function addRegistrationQuestion() {
    setRegistrationQuestions((current) => [
      ...current,
      {
        id: createQuestionId(),
        label: "",
        type: "short_text",
        required: false,
        options: [],
      },
    ]);
  }

  function updateRegistrationQuestion(questionId, patch) {
    setRegistrationQuestions((current) =>
      current.map((question) =>
        question.id === questionId
          ? {
              ...question,
              ...patch,
            }
          : question
      )
    );
  }

  function removeRegistrationQuestion(questionId) {
    setRegistrationQuestions((current) =>
      current.filter((question) => question.id !== questionId)
    );
  }

  function addQuestionOption(questionId) {
    setRegistrationQuestions((current) =>
      current.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: [...(question.options || []), ""],
            }
          : question
      )
    );
  }

  function updateQuestionOption(questionId, optionIndex, value) {
    setRegistrationQuestions((current) =>
      current.map((question) => {
        if (question.id !== questionId) return question;

        const nextOptions = [...(question.options || [])];
        nextOptions[optionIndex] = value;

        return {
          ...question,
          options: nextOptions,
        };
      })
    );
  }

  function removeQuestionOption(questionId, optionIndex) {
    setRegistrationQuestions((current) =>
      current.map((question) => {
        if (question.id !== questionId) return question;

        const nextOptions = [...(question.options || [])].filter(
          (_, index) => index !== optionIndex
        );

        return {
          ...question,
          options: nextOptions,
        };
      })
    );
  }

  function getCleanRegistrationQuestionsForSave() {
    return registrationQuestions
      .map((question) => {
        const label = String(question?.label || "").trim();

        if (!label) return null;

        const type = [
          "short_text",
          "long_text",
          "yes_no",
          "single_choice",
          "multi_choice",
        ].includes(question?.type)
          ? question.type
          : "short_text";

        const options = Array.isArray(question?.options)
          ? question.options
              .map((option) => String(option || "").trim())
              .filter(Boolean)
          : [];

        return {
          id: question.id || createQuestionId(),
          label,
          type,
          required: question.required === true,
          options: questionNeedsOptions(type) ? options : [],
        };
      })
      .filter(Boolean);
  }

  async function handlePickEventImage() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "We need access to your photos so you can add an event image."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];

      if (!asset?.uri || !asset?.base64) {
        Alert.alert(
          "Image error",
          "We couldn't read this image. Please try another photo."
        );
        return;
      }

      setEventImage(asset);
    } catch (e) {
      console.log("handlePickEventImage error:", e);
      Alert.alert("Image error", "We couldn't open your photos. Please try again.");
    }
  }

  async function uploadEventImageIfNeeded() {
    if (!eventImage) return null;

    try {
      setUploadingImage(true);

      let base64 = eventImage.base64;

      if (!base64 && eventImage.uri) {
        base64 = await LegacyFileSystem.readAsStringAsync(eventImage.uri, {
          encoding: "base64",
        });
      }

      if (!base64) {
        throw new Error("Could not read image data");
      }

      const fileExtFromUri =
        eventImage.uri?.split(".").pop()?.toLowerCase().split("?")[0] || "jpg";

      const fileExt = fileExtFromUri || "jpg";
      const fileName = `event-${Date.now()}.${fileExt}`;
      const contentType = eventImage.mimeType || eventImage.type || "image/jpeg";

      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        "upload-post-image",
        {
          body: {
            base64,
            fileName,
            contentType,
            pathPrefix: "events",
          },
        }
      );

      if (fnError) {
        console.log("Event image upload edge function error:", fnError);
        throw fnError;
      }

      if (!fnData?.publicUrl) {
        throw new Error("No publicUrl returned from upload function");
      }

      return fnData.publicUrl;
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleCreate() {
    if (!title.trim()) {
      Alert.alert("Create Event", "Please add an event title.");
      return;
    }

    const startAt = startDateTime.toISOString();
    const endAt = endDateTime ? endDateTime.toISOString() : null;

    if (endDateTime && endDateTime <= startDateTime) {
      Alert.alert(
        "Create Event",
        "The end date/time must be after the start date/time."
      );
      return;
    }

    if (isCourseProgramme && !endDateTime) {
      Alert.alert(
        "Create Event",
        "Please add an end date/time for a course or programme."
      );
      return;
    }

    if (isWeeklyCourse && !endDateTime) {
      Alert.alert(
        "Create Event",
        "Please add an end date so Triunely knows how long the weekly course runs."
      );
      return;
    }

    if (
      attendanceMethod === "external_registration" &&
      !externalRegistrationUrl.trim()
    ) {
      Alert.alert(
        "Create Event",
        "Please add the external registration link."
      );
      return;
    }

    if (isRegistrationRequired) {
      const hasBlankQuestion = registrationQuestions.some(
        (question) => !String(question?.label || "").trim()
      );

      if (hasBlankQuestion) {
        Alert.alert(
          "Create Event",
          "Please complete or remove any blank registration questions."
        );
        return;
      }

      const invalidChoiceQuestion = registrationQuestions.find((question) => {
        if (!questionNeedsOptions(question.type)) return false;

        const cleanOptions = Array.isArray(question.options)
          ? question.options
              .map((option) => String(option || "").trim())
              .filter(Boolean)
          : [];

        return cleanOptions.length < 1;
      });

      if (invalidChoiceQuestion) {
        Alert.alert(
          "Create Event",
          "Choice questions need at least one option."
        );
        return;
      }
    }

    try {
      setSaving(true);

      const imageUrl = await uploadEventImageIfNeeded();

      const res = await createEvent({
        title,
        description,
        startAt,
        endAt,
        locationName,
        locationAddress,
        onlineUrl,
        imageUrl,
        visibility,
        churchId: churchId || null,

        eventType,
        attendanceMethod,
        repeatType: isCourseProgramme ? repeatType : "none",
        repeatInterval: 1,
        repeatDay,
        registrationEnabled:
          attendanceMethod === "registration_required" ||
          attendanceMethod === "external_registration",
        externalRegistrationUrl:
          attendanceMethod === "external_registration"
            ? externalRegistrationUrl
            : null,
        registrationQuestions: isRegistrationRequired
          ? getCleanRegistrationQuestionsForSave()
          : [],
      });

      if (!res.ok) {
        Alert.alert("Create Event", res.error || "Could not create event.");
        return;
      }

      Alert.alert("Event created", "Your event has been created.", [
        {
          text: "View Event",
          onPress: () =>
            navigation.replace("EventDetails", {
              eventId: res.event.id,
              event: res.event,
            }),
        },
      ]);
    } catch (e) {
      console.log("CreateEventScreen handleCreate error:", e);
      Alert.alert("Create Event", "Could not create event right now.");
    } finally {
      setSaving(false);
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
            paddingBottom: bottomPad + 22,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
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
                Create Event
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 13,
                  fontWeight: "700",
                  lineHeight: 18,
                  marginTop: 2,
                }}
              >
                Add a gathering, meetup, course, or church event.
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
            {churchName ? (
              <View
                style={{
                  marginBottom: 15,
                  padding: 13,
                  borderRadius: 18,
                  backgroundColor: "rgba(79, 99, 59, 0.10)",
                  borderWidth: 1,
                  borderColor: "rgba(79, 99, 59, 0.16)",
                }}
              >
                <Text style={{ color: TEXT, fontWeight: "900" }}>
                  Creating for {churchName}
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    marginTop: 4,
                    fontWeight: "700",
                    lineHeight: 18,
                  }}
                >
                  Public is best for outreach events. Church is best for
                  church-family events.
                </Text>
              </View>
            ) : null}

            <FieldLabel>Event title</FieldLabel>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Example: Alpha Course"
              placeholderTextColor={theme.input.placeholder}
              style={[theme.input.box, premiumInputStyle]}
            />

            <FieldLabel style={{ marginTop: 14 }}>Description</FieldLabel>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What is this event about?"
              placeholderTextColor={theme.input.placeholder}
              multiline
              textAlignVertical="top"
              style={[
                theme.input.box,
                premiumInputStyle,
                {
                  minHeight: 110,
                  paddingTop: 12,
                },
              ]}
            />

            <FieldLabel style={{ marginTop: 16 }}>Event type</FieldLabel>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 8,
              }}
            >
              <OptionChip
                label="Single event"
                icon="calendar-outline"
                active={eventType === "single"}
                onPress={() => handleSelectEventType("single")}
              />

              <OptionChip
                label="Course / programme"
                icon="school-outline"
                active={eventType === "course_programme"}
                onPress={() => handleSelectEventType("course_programme")}
              />
            </View>

            <Text style={hintStyle}>
              Use Course / programme for Alpha, discipleship courses, Bible
              studies, or anything running over several sessions.
            </Text>

            {isCourseProgramme ? (
              <>
                <FieldLabel style={{ marginTop: 16 }}>Repeat</FieldLabel>

                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  <OptionChip
                    label="No repeat"
                    icon="remove-circle-outline"
                    active={repeatType === "none"}
                    onPress={() => setRepeatType("none")}
                  />

                  <OptionChip
                    label="Weekly"
                    icon="repeat-outline"
                    active={repeatType === "weekly"}
                    onPress={() => setRepeatType("weekly")}
                  />
                </View>

                {isWeeklyCourse ? (
                  <Text style={hintStyle}>
                    This will show as weekly on {getWeekdayName(eventDate)}.
                    The card can show the next session while the course is
                    active.
                  </Text>
                ) : (
                  <Text style={hintStyle}>
                    Use weekly for courses that meet on the same day each week.
                  </Text>
                )}
              </>
            ) : null}

            <FieldLabel style={{ marginTop: 16 }}>How do people join?</FieldLabel>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 8,
              }}
            >
              <OptionChip
                label="Open RSVP"
                icon="checkmark-circle-outline"
                active={attendanceMethod === "open_rsvp"}
                onPress={() => handleSelectAttendanceMethod("open_rsvp")}
              />

              <OptionChip
                label="Registration required"
                icon="create-outline"
                active={attendanceMethod === "registration_required"}
                onPress={() =>
                  handleSelectAttendanceMethod("registration_required")
                }
              />

              <OptionChip
                label="External link"
                icon="open-outline"
                active={attendanceMethod === "external_registration"}
                onPress={() =>
                  handleSelectAttendanceMethod("external_registration")
                }
              />

              <OptionChip
                label="Invite-only"
                icon="lock-closed-outline"
                active={attendanceMethod === "invite_only"}
                onPress={() => handleSelectAttendanceMethod("invite_only")}
              />
            </View>

            <Text style={hintStyle}>
              {attendanceMethod === "registration_required"
                ? "People will register through Triunely. You can add your own extra form questions below."
                : attendanceMethod === "external_registration"
                ? "People will use an external form or website link."
                : attendanceMethod === "invite_only"
                ? "Only invited people should respond to this event."
                : "People can simply mark themselves as going."}
            </Text>

            {attendanceMethod === "external_registration" ? (
              <>
                <FieldLabel style={{ marginTop: 14 }}>
                  External registration URL
                </FieldLabel>

                <TextInput
                  value={externalRegistrationUrl}
                  onChangeText={setExternalRegistrationUrl}
                  placeholder="https://..."
                  placeholderTextColor={theme.input.placeholder}
                  autoCapitalize="none"
                  style={[theme.input.box, premiumInputStyle]}
                />
              </>
            ) : null}

            {isRegistrationRequired ? (
              <View
                style={{
                  marginTop: 16,
                  padding: 14,
                  borderRadius: 22,
                  backgroundColor: "rgba(180, 83, 9, 0.07)",
                  borderWidth: 1,
                  borderColor: "rgba(180, 83, 9, 0.16)",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: TEXT,
                        fontSize: 17,
                        fontWeight: "900",
                        letterSpacing: -0.1,
                      }}
                    >
                      Extra registration questions
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
                      Add any extra questions you need for this event. Leave this
                      empty if the standard registration form is enough.
                    </Text>
                  </View>

                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: WHITE,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: "rgba(180, 83, 9, 0.18)",
                    }}
                  >
                    <Ionicons
                      name="clipboard-outline"
                      size={21}
                      color={EVENT_AMBER}
                    />
                  </View>
                </View>

                {registrationQuestions.length === 0 ? (
                  <View
                    style={{
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 18,
                      backgroundColor: WHITE,
                      borderWidth: 1,
                      borderColor: CARD_BORDER,
                    }}
                  >
                    <Text
                      style={{
                        color: TEXT,
                        fontWeight: "900",
                        lineHeight: 19,
                      }}
                    >
                      No extra questions added
                    </Text>

                    <Text
                      style={{
                        color: MUTED,
                        marginTop: 4,
                        lineHeight: 18,
                        fontSize: 12.5,
                        fontWeight: "700",
                      }}
                    >
                      The form will still collect name, email, phone, number
                      attending, message, accessibility needs, and consent.
                    </Text>
                  </View>
                ) : null}

                {registrationQuestions.map((question, index) => (
                  <RegistrationQuestionCard
                    key={question.id}
                    question={question}
                    index={index}
                    onUpdate={(patch) =>
                      updateRegistrationQuestion(question.id, patch)
                    }
                    onRemove={() => removeRegistrationQuestion(question.id)}
                    onAddOption={() => addQuestionOption(question.id)}
                    onUpdateOption={(optionIndex, value) =>
                      updateQuestionOption(question.id, optionIndex, value)
                    }
                    onRemoveOption={(optionIndex) =>
                      removeQuestionOption(question.id, optionIndex)
                    }
                  />
                ))}

                <SmallOutlineButton
                  title="Add question"
                  icon="add-circle-outline"
                  onPress={addRegistrationQuestion}
                />
              </View>
            ) : null}

            <FieldLabel style={{ marginTop: 16 }}>Event image</FieldLabel>

            {eventImage?.uri ? (
              <View
                style={{
                  marginTop: 8,
                  borderRadius: 20,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  backgroundColor: theme.colors.surfaceAlt,
                }}
              >
                <Image
                  source={{ uri: eventImage.uri }}
                  style={{ width: "100%", height: 180 }}
                  resizeMode="cover"
                />

                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    padding: 10,
                    backgroundColor: WHITE,
                  }}
                >
                  <Pressable
                    onPress={handlePickEventImage}
                    disabled={saving || uploadingImage}
                    style={({ pressed }) => ({
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 999,
                      backgroundColor: pressed
                        ? "rgba(79, 99, 59, 0.08)"
                        : WHITE,
                      borderWidth: 1,
                      borderColor: CARD_BORDER,
                      alignItems: "center",
                    })}
                  >
                    <Text style={{ color: OLIVE, fontWeight: "900" }}>
                      Change image
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setEventImage(null)}
                    disabled={saving || uploadingImage}
                    style={({ pressed }) => ({
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 999,
                      backgroundColor: pressed
                        ? "rgba(153, 27, 27, 0.08)"
                        : WHITE,
                      borderWidth: 1,
                      borderColor: "rgba(153, 27, 27, 0.16)",
                      alignItems: "center",
                    })}
                  >
                    <Text style={{ color: "#991B1B", fontWeight: "900" }}>
                      Remove
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={handlePickEventImage}
                disabled={saving || uploadingImage}
                style={({ pressed }) => ({
                  marginTop: 8,
                  minHeight: 130,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: pressed
                    ? "rgba(180, 83, 9, 0.36)"
                    : "rgba(180, 83, 9, 0.24)",
                  backgroundColor: "rgba(180, 83, 9, 0.08)",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 16,
                })}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: WHITE,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 9,
                    borderWidth: 1,
                    borderColor: "rgba(180, 83, 9, 0.18)",
                  }}
                >
                  <Ionicons name="image-outline" size={25} color={EVENT_AMBER} />
                </View>

                <Text
                  style={{
                    color: TEXT,
                    fontWeight: "900",
                    textAlign: "center",
                  }}
                >
                  Add event image
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    marginTop: 4,
                    textAlign: "center",
                    lineHeight: 18,
                    fontWeight: "700",
                  }}
                >
                  Choose a photo or poster image for this event.
                </Text>
              </Pressable>
            )}

            <FieldLabel style={{ marginTop: 16 }}>Date & time</FieldLabel>

            <PickerCard
              icon="calendar-outline"
              label="Event date"
              value={formatDisplayDate(eventDate)}
              onPress={() => setPickerMode("date")}
            />

            <PickerCard
              icon="time-outline"
              label="Start time"
              value={formatDisplayTime(startTime)}
              onPress={() => setPickerMode("startTime")}
            />

            <PickerCard
              icon="calendar-number-outline"
              label={isCourseProgramme ? "Final date" : "End date"}
              value={hasEndDateTime ? formatDisplayDate(endDate) : "Optional"}
              muted={!hasEndDateTime}
              onPress={() => {
                setHasEndDateTime(true);
                setPickerMode("endDate");
              }}
            />

            <PickerCard
              icon="hourglass-outline"
              label={isCourseProgramme ? "Session end time" : "End time"}
              value={hasEndDateTime ? formatDisplayTime(endTime) : "Optional"}
              muted={!hasEndDateTime}
              onPress={() => {
                setHasEndDateTime(true);
                setPickerMode("endTime");
              }}
            />

            {hasEndDateTime ? (
              <Pressable
                onPress={() => {
                  setHasEndDateTime(false);
                  setEndDate(eventDate);
                  setEndTime(getDefaultEndDate(startTime));

                  if (isCourseProgramme) {
                    setRepeatType("none");
                  }
                }}
                style={({ pressed }) => ({
                  alignSelf: "flex-start",
                  marginTop: 9,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: pressed
                    ? "rgba(153, 27, 27, 0.10)"
                    : "rgba(153, 27, 27, 0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(153, 27, 27, 0.14)",
                })}
              >
                <Text
                  style={{
                    color: "#991B1B",
                    fontSize: 12,
                    fontWeight: "900",
                  }}
                >
                  Clear end date/time
                </Text>
              </Pressable>
            ) : null}

            {pickerMode ? (
              <View
                style={{
                  marginTop: 10,
                  borderRadius: 18,
                  overflow: "hidden",
                  backgroundColor: WHITE,
                }}
              >
                <DateTimePicker
                  value={
                    pickerMode === "date"
                      ? eventDate
                      : pickerMode === "startTime"
                      ? startTime
                      : pickerMode === "endDate"
                      ? endDate
                      : endTime
                  }
                  mode={
                    pickerMode === "date" || pickerMode === "endDate"
                      ? "date"
                      : "time"
                  }
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handlePickerChange}
                />

                {Platform.OS === "ios" ? (
                  <Pressable
                    onPress={() => setPickerMode(null)}
                    style={{
                      marginTop: 8,
                      alignSelf: "flex-end",
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: 999,
                      backgroundColor: EVENT_AMBER,
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "900" }}>
                      Done
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <View
              style={{
                marginTop: 13,
                padding: 12,
                borderRadius: 18,
                backgroundColor: "rgba(79, 99, 59, 0.08)",
                borderWidth: 1,
                borderColor: "rgba(79, 99, 59, 0.13)",
              }}
            >
              <Text
                style={{
                  color: OLIVE,
                  fontSize: 12,
                  fontWeight: "900",
                  marginBottom: 3,
                }}
              >
                Preview
              </Text>

              <Text
                style={{
                  color: TEXT,
                  fontSize: 13,
                  fontWeight: "800",
                  lineHeight: 18,
                }}
              >
                {eventType === "course_programme"
                  ? "Course / programme"
                  : "Single event"}{" "}
                · {getAttendanceMethodLabel(attendanceMethod)}
              </Text>

              <Text
                style={{
                  color: TEXT,
                  fontSize: 13,
                  fontWeight: "800",
                  lineHeight: 18,
                  marginTop: 4,
                }}
              >
                {formatDisplayDate(eventDate)} · {formatDisplayTime(startTime)}
                {hasEndDateTime
                  ? ` - ${formatDisplayDate(endDate)} · ${formatDisplayTime(
                      endTime
                    )}`
                  : ""}
              </Text>

              {isWeeklyCourse ? (
                <Text
                  style={{
                    color: EVENT_AMBER,
                    fontSize: 12.5,
                    fontWeight: "900",
                    lineHeight: 18,
                    marginTop: 5,
                  }}
                >
                  Repeats weekly on {getWeekdayName(eventDate)}
                </Text>
              ) : null}

              {isRegistrationRequired && registrationQuestions.length > 0 ? (
                <Text
                  style={{
                    color: EVENT_AMBER,
                    fontSize: 12.5,
                    fontWeight: "900",
                    lineHeight: 18,
                    marginTop: 5,
                  }}
                >
                  {registrationQuestions.length} extra registration question
                  {registrationQuestions.length === 1 ? "" : "s"}
                </Text>
              ) : null}
            </View>

            <FieldLabel style={{ marginTop: 16 }}>Location name</FieldLabel>
            <TextInput
              value={locationName}
              onChangeText={setLocationName}
              placeholder="Example: Main Hall"
              placeholderTextColor={theme.input.placeholder}
              style={[theme.input.box, premiumInputStyle]}
            />

            <FieldLabel style={{ marginTop: 14 }}>Location address</FieldLabel>
            <TextInput
              value={locationAddress}
              onChangeText={setLocationAddress}
              placeholder="Optional address"
              placeholderTextColor={theme.input.placeholder}
              style={[theme.input.box, premiumInputStyle]}
            />

            <FieldLabel style={{ marginTop: 14 }}>Online URL</FieldLabel>
            <TextInput
              value={onlineUrl}
              onChangeText={setOnlineUrl}
              placeholder="Optional Zoom / livestream link"
              placeholderTextColor={theme.input.placeholder}
              autoCapitalize="none"
              style={[theme.input.box, premiumInputStyle]}
            />

            <FieldLabel style={{ marginTop: 16 }}>Visibility</FieldLabel>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 8,
              }}
            >
              {[
                { key: "public", label: "Public" },
                ...(churchId ? [{ key: "church", label: "Church" }] : []),
                { key: "invite_only", label: "Invite Only" },
              ].map((option) => {
                const active = visibility === option.key;

                return (
                  <OptionChip
                    key={option.key}
                    label={option.label}
                    active={active}
                    icon={
                      option.key === "public"
                        ? "globe-outline"
                        : option.key === "church"
                        ? "business-outline"
                        : "lock-closed-outline"
                    }
                    onPress={() => {
                      setVisibility(option.key);

                      if (option.key === "invite_only") {
                        setAttendanceMethod("invite_only");
                      }

                      if (
                        option.key !== "invite_only" &&
                        attendanceMethod === "invite_only"
                      ) {
                        setAttendanceMethod("open_rsvp");
                      }
                    }}
                  />
                );
              })}
            </View>

            <Text style={hintStyle}>
              Public is best for Alpha, Carol nights, outreach, and events
              people can share. Church is for internal church-family events.
            </Text>

            {visibility === "invite_only" ? (
              <Text style={hintStyle}>
                Invite-only events will be created first. You can invite people
                after the event has been created.
              </Text>
            ) : null}

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
                    {uploadingImage ? "Uploading image…" : "Creating event…"}
                  </Text>
                </View>
              ) : (
                <PremiumCreateButton
                  title="Create Event"
                  onPress={handleCreate}
                  disabled={saving || uploadingImage}
                />
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const labelStyle = {
  color: TEXT,
  fontWeight: "900",
};

const hintStyle = {
  color: MUTED,
  marginTop: 8,
  fontSize: 12,
  lineHeight: 18,
  fontWeight: "700",
};

const premiumInputStyle = {
  marginTop: 6,
  borderRadius: 18,
  backgroundColor: WHITE,
  borderColor: CARD_BORDER,
  color: TEXT,
  fontWeight: "700",
};