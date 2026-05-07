// src/features/events/screens/CreateEventScreen.js
import { Ionicons } from "@expo/vector-icons";
import * as LegacyFileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View
} from "react-native";

import GlowButton from "../../../components/GlowButton";
import Screen from "../../../components/Screen";
import { supabase } from "../../../lib/supabase";
import { theme } from "../../../theme/theme";
import { createEvent } from "../services/eventsService";

function getDefaultStartValue() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(19, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

function parseDateTimeInput(value) {
  const raw = String(value || "").trim();

  if (!raw) return null;

  // Accepts formats like:
  // 2026-05-02T19:00
  // 2026-05-02 19:00
  const normalised = raw.includes("T") ? raw : raw.replace(" ", "T");
  const d = new Date(normalised);

  if (Number.isNaN(d.getTime())) return null;

  return d.toISOString();
}

export default function CreateEventScreen({ route, navigation }) {
  const params = route?.params || {};

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startInput, setStartInput] = useState(getDefaultStartValue());
  const [endInput, setEndInput] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [onlineUrl, setOnlineUrl] = useState("");

const [eventImage, setEventImage] = useState(null);
const [uploadingImage, setUploadingImage] = useState(false);

const [visibility, setVisibility] = useState(params?.churchId ? "church" : "public");
const [saving, setSaving] = useState(false);

  const churchId = params?.churchId || null;
  const churchName = params?.churchName || null;

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
      Alert.alert("Image error", "We couldn't read this image. Please try another photo.");
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
    const startAt = parseDateTimeInput(startInput);
    const endAt = endInput.trim() ? parseDateTimeInput(endInput) : null;

    if (!title.trim()) {
      Alert.alert("Create Event", "Please add an event title.");
      return;
    }

    if (!startAt) {
      Alert.alert(
        "Create Event",
        "Please enter a valid start date/time. Example: 2026-05-02T19:00"
      );
      return;
    }

    if (endInput.trim() && !endAt) {
      Alert.alert(
        "Create Event",
        "Please enter a valid end date/time or leave it blank."
      );
      return;
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
    churchId: visibility === "church" ? churchId : null,
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
    <Screen backgroundColor={theme.colors.bg} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: bottomPad + 18,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={10}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.divider,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Ionicons name="chevron-back" size={22} color={theme.colors.text2} />
            </Pressable>

            <View style={{ flex: 1 }}>
              <Text style={[theme.text.h1, { fontSize: 22 }]}>Create Event</Text>
              <Text style={[theme.text.sub, { marginTop: 2 }]}>
                Add a gathering, meetup, or church event.
              </Text>
            </View>
          </View>

          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 18,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.colors.divider,
            }}
          >
            {churchName ? (
              <View
                style={{
                  marginBottom: 14,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: theme.colors.goldHalo,
                  borderWidth: 1,
                  borderColor: theme.colors.goldOutline,
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                  Creating for {churchName}
                </Text>
                <Text style={{ color: theme.colors.text2, marginTop: 4 }}>
                  Choose Church visibility to publish this under the church.
                </Text>
              </View>
            ) : null}

            <Text style={labelStyle}>Event title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Example: Prayer Night"
              placeholderTextColor={theme.input.placeholder}
              style={[theme.input.box, { marginTop: 6 }]}
            />

            <Text style={[labelStyle, { marginTop: 14 }]}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What is this event about?"
              placeholderTextColor={theme.input.placeholder}
              multiline
              textAlignVertical="top"
              style={[theme.input.box, { marginTop: 6, minHeight: 100 }]}
            />

            <Text style={[labelStyle, { marginTop: 14 }]}>Start date/time</Text>
            <TextInput
              value={startInput}
              onChangeText={setStartInput}
              placeholder="2026-05-02T19:00"
              placeholderTextColor={theme.input.placeholder}
              autoCapitalize="none"
              style={[theme.input.box, { marginTop: 6 }]}
            />
            <Text style={hintStyle}>
              Format for now: YYYY-MM-DDTHH:mm. We can add a proper date picker next.
            </Text>

            <Text style={[labelStyle, { marginTop: 14 }]}>End date/time</Text>
            <TextInput
              value={endInput}
              onChangeText={setEndInput}
              placeholder="Optional: 2026-05-02T21:00"
              placeholderTextColor={theme.input.placeholder}
              autoCapitalize="none"
              style={[theme.input.box, { marginTop: 6 }]}
            />

            <Text style={[labelStyle, { marginTop: 14 }]}>Location name</Text>
            <TextInput
              value={locationName}
              onChangeText={setLocationName}
              placeholder="Example: Main Hall"
              placeholderTextColor={theme.input.placeholder}
              style={[theme.input.box, { marginTop: 6 }]}
            />

            <Text style={[labelStyle, { marginTop: 14 }]}>Location address</Text>
            <TextInput
              value={locationAddress}
              onChangeText={setLocationAddress}
              placeholder="Optional address"
              placeholderTextColor={theme.input.placeholder}
              style={[theme.input.box, { marginTop: 6 }]}
            />

           <Text style={[labelStyle, { marginTop: 14 }]}>Online URL</Text>
<TextInput
  value={onlineUrl}
  onChangeText={setOnlineUrl}
  placeholder="Optional Zoom / livestream link"
  placeholderTextColor={theme.input.placeholder}
  autoCapitalize="none"
  style={[theme.input.box, { marginTop: 6 }]}
/>

<Text style={[labelStyle, { marginTop: 14 }]}>Event image</Text>

{eventImage?.uri ? (
  <View
    style={{
      marginTop: 8,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.colors.surfaceAlt,
    }}
  >
    <Image
      source={{ uri: eventImage.uri }}
      style={{ width: "100%", height: 170 }}
      resizeMode="cover"
    />

    <View
      style={{
        flexDirection: "row",
        gap: 10,
        padding: 10,
      }}
    >
      <Pressable
        onPress={handlePickEventImage}
        disabled={saving || uploadingImage}
        style={{
          flex: 1,
          paddingVertical: 10,
          borderRadius: 999,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.divider,
          alignItems: "center",
        }}
      >
        <Text style={{ color: theme.colors.text2, fontWeight: "900" }}>
          Change image
        </Text>
      </Pressable>

      <Pressable
        onPress={() => setEventImage(null)}
        disabled={saving || uploadingImage}
        style={{
          flex: 1,
          paddingVertical: 10,
          borderRadius: 999,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.divider,
          alignItems: "center",
        }}
      >
        <Text style={{ color: theme.colors.text2, fontWeight: "900" }}>
          Remove
        </Text>
      </Pressable>
    </View>
  </View>
) : (
  <Pressable
    onPress={handlePickEventImage}
    disabled={saving || uploadingImage}
    style={{
      marginTop: 8,
      minHeight: 120,
      borderRadius: 16,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: theme.colors.goldOutline,
      backgroundColor: theme.colors.goldHalo,
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    }}
  >
    <Ionicons name="image-outline" size={28} color={theme.colors.goldPressed} />
    <Text
      style={{
        color: theme.colors.text,
        fontWeight: "900",
        marginTop: 8,
        textAlign: "center",
      }}
    >
      Add event image
    </Text>
    <Text
      style={{
        color: theme.colors.text2,
        marginTop: 4,
        textAlign: "center",
        lineHeight: 18,
      }}
    >
      Choose a photo or poster image for this event.
    </Text>
  </Pressable>
)}

<Text style={[labelStyle, { marginTop: 14 }]}>Visibility</Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {[
                { key: "public", label: "Public" },
                ...(churchId ? [{ key: "church", label: "Church" }] : []),
                { key: "invite_only", label: "Invite Only" },
              ].map((option) => {
                const active = visibility === option.key;

                return (
                  <Pressable
                    key={option.key}
                    onPress={() => setVisibility(option.key)}
                    style={{
                      paddingVertical: 9,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      backgroundColor: active ? theme.colors.gold : theme.colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor: active ? theme.colors.goldOutline : theme.colors.divider,
                    }}
                  >
                    <Text
                      style={{
                        color: active ? theme.colors.text : theme.colors.text2,
                        fontWeight: "900",
                      }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {visibility === "invite_only" ? (
              <Text style={hintStyle}>
                Invite-only events will be created first. We will add the invite people step next.
              </Text>
            ) : null}

            <View style={{ marginTop: 18 }}>
              {saving ? (
                <View style={{ alignItems: "center", paddingVertical: 8 }}>
                  <ActivityIndicator color={theme.colors.gold} />
                  <Text style={{ color: theme.colors.muted, marginTop: 8 }}>
  {uploadingImage ? "Uploading image…" : "Creating event…"}
</Text>
                </View>
              ) : (
                <GlowButton title="Create Event" onPress={handleCreate} variant="primary" />
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const labelStyle = {
  color: theme.colors.text,
  fontWeight: "900",
};

const hintStyle = {
  color: theme.colors.muted,
  marginTop: 6,
  fontSize: 12,
  lineHeight: 18,
};