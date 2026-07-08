// src/screens/WeeklyMessageEditor.js
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import Screen from "../components/Screen";
import WeeklyMessageCard from "../components/WeeklyMessageCard";
import { supabase } from "../lib/supabase";
import { theme } from "../theme/theme";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const OLIVE = "#4F633B";
const OLIVE_DARK = "#39472B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";
const CARD_BORDER = "rgba(15, 23, 42, 0.08)";
const AMBER_SOFT = "rgba(180, 83, 9, 0.10)";
const AMBER_BORDER = "rgba(180, 83, 9, 0.18)";
const OLIVE_SOFT = "rgba(79, 99, 59, 0.10)";
const OLIVE_BORDER = "rgba(79, 99, 59, 0.18)";
const DANGER = "#B42318";
const DANGER_SOFT = "rgba(180, 35, 24, 0.08)";
const DANGER_BORDER = "rgba(180, 35, 24, 0.18)";
const SHADOW = "rgba(15, 23, 42, 0.10)";

const displayFont = Platform.OS === "ios" ? "Georgia" : "serif";

const serifHeading = {
  fontFamily: displayFont,
  color: TEXT,
  fontWeight: "900",
  letterSpacing: -0.45,
};

function getCurrentWeekBoundsISO() {
  const now = new Date();

  const utcYear = now.getUTCFullYear();
  const utcMonth = now.getUTCMonth();
  const utcDate = now.getUTCDate();
  const utcDay = now.getUTCDay();

  const diffToMonday = (utcDay + 6) % 7;

  const monday = new Date(Date.UTC(utcYear, utcMonth, utcDate - diffToMonday));
  const sunday = new Date(Date.UTC(utcYear, utcMonth, utcDate - diffToMonday + 6));

  const toISODate = (d) => d.toISOString().slice(0, 10);

  return {
    week_start: toISODate(monday),
    week_end: toISODate(sunday),
  };
}

function formatWeekLabel(weekStart, weekEnd) {
  const fmt = (value) => {
    const d = new Date(`${value}T00:00:00`);

    return d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });
  };

  return `${fmt(weekStart)} – ${fmt(weekEnd)}`;
}

function getVideoExpiresAtISO(weekEnd) {
  const expiry = new Date(`${weekEnd}T00:00:00.000Z`);
  expiry.setUTCDate(expiry.getUTCDate() + 1);
  return expiry.toISOString();
}

function guessExt(uriOrName) {
  if (!uriOrName) return "mp4";

  const clean = String(uriOrName).split("?")[0];
  const parts = clean.split(".");
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "mp4";

  if (!ext || ext.length > 6) return "mp4";

  return ext;
}

function guessContentType(ext) {
  if (ext === "mov") return "video/quicktime";
  if (ext === "m4v") return "video/x-m4v";

  return "video/mp4";
}

function tintColors(tint) {
  if (tint === "amber") {
    return {
      soft: AMBER_SOFT,
      border: AMBER_BORDER,
      main: EVENT_AMBER,
      strong: EVENT_BROWN,
    };
  }

  if (tint === "danger") {
    return {
      soft: DANGER_SOFT,
      border: DANGER_BORDER,
      main: DANGER,
      strong: DANGER,
    };
  }

  return {
    soft: OLIVE_SOFT,
    border: OLIVE_BORDER,
    main: OLIVE,
    strong: OLIVE_DARK,
  };
}

function StudioIcon({ icon, tint = "olive", size = 42 }) {
  const colors = tintColors(tint);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        backgroundColor: colors.soft,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={icon} size={Math.round(size * 0.46)} color={colors.main} />
    </View>
  );
}

function StatusPill({ status }) {
  const published = status === "published";
  const colors = published ? tintColors("amber") : tintColors("olive");

  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: colors.soft,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text
        style={{
          color: colors.strong,
          fontSize: 11,
          fontWeight: "900",
          letterSpacing: 0.4,
        }}
      >
        {published ? "LIVE" : "DRAFT"}
      </Text>
    </View>
  );
}

function StudioCard({ children, style }) {
  return (
    <View
      style={[
        {
          backgroundColor: SURFACE,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          borderRadius: 28,
          padding: 15,
          shadowColor: SHADOW,
          shadowOpacity: 0.065,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function StepCard({
  step,
  title,
  subtitle,
  icon,
  tint = "amber",
  complete,
  open,
  onToggle,
  children,
}) {
  const colors = complete ? tintColors("olive") : tintColors(tint);

  return (
    <StudioCard style={{ marginBottom: 12, padding: 0, overflow: "hidden" }}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => ({
          padding: 15,
          backgroundColor: pressed ? PREMIUM_CREAM : SURFACE,
        })}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View style={{ position: "relative" }}>
            <StudioIcon icon={icon} tint={complete ? "olive" : tint} size={44} />

            <View
              style={{
                position: "absolute",
                right: -5,
                bottom: -5,
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: colors.main,
                borderWidth: 2,
                borderColor: SURFACE,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 10,
                  fontWeight: "900",
                }}
              >
                {complete ? "✓" : step}
              </Text>
            </View>
          </View>

          <View style={{ flex: 1, marginLeft: 13 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text
                  style={{
                    color: TEXT,
                    fontSize: 17,
                    fontWeight: "900",
                    lineHeight: 21,
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
                      lineHeight: 18,
                      marginTop: 4,
                    }}
                  >
                    {subtitle}
                  </Text>
                ) : null}
              </View>

              <Ionicons
                name={open ? "chevron-up" : "chevron-down"}
                size={21}
                color={MUTED}
              />
            </View>
          </View>
        </View>
      </Pressable>

      {open ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: CARD_BORDER,
            padding: 15,
            paddingTop: 14,
          }}
        >
          {children}
        </View>
      ) : null}
    </StudioCard>
  );
}

function FieldLabel({ children, helper }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text
        style={{
          color: TEXT,
          fontSize: 13,
          fontWeight: "900",
        }}
      >
        {children}
      </Text>

      {helper ? (
        <Text
          style={{
            color: MUTED,
            fontSize: 11.8,
            fontWeight: "700",
            lineHeight: 16,
            marginTop: 3,
          }}
        >
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

function inputStyle(extra = {}) {
  return {
    backgroundColor: PREMIUM_CREAM,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: TEXT,
    fontSize: 14.5,
    fontWeight: "700",
    ...extra,
  };
}

function PrimaryButton({
  title,
  subtitle,
  icon,
  tint = "amber",
  loading,
  disabled,
  onPress,
}) {
  const amber = tint === "amber";
  const colors = tintColors(tint);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        borderRadius: 22,
        padding: 13,
        backgroundColor: amber ? EVENT_AMBER : SURFACE,
        borderWidth: 1,
        borderColor: amber ? EVENT_AMBER : colors.border,
        opacity: disabled || loading ? 0.62 : pressed ? 0.86 : 1,
        transform: [{ scale: pressed && !disabled && !loading ? 0.99 : 1 }],
        shadowColor: SHADOW,
        shadowOpacity: amber ? 0.12 : 0.04,
        shadowRadius: amber ? 14 : 8,
        shadowOffset: { width: 0, height: amber ? 6 : 3 },
        elevation: amber ? 3 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: amber ? "rgba(255,255,255,0.17)" : colors.soft,
            borderWidth: 1,
            borderColor: amber ? "rgba(255,255,255,0.22)" : colors.border,
          }}
        >
          {loading ? (
            <ActivityIndicator color={amber ? "#FFFFFF" : colors.main} />
          ) : (
            <Ionicons
              name={icon}
              size={19}
              color={amber ? "#FFFFFF" : colors.main}
            />
          )}
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={{
              color: amber ? "#FFFFFF" : colors.strong,
              fontSize: 14.5,
              fontWeight: "900",
            }}
          >
            {title}
          </Text>

          {subtitle ? (
            <Text
              style={{
                color: amber ? "rgba(255,255,255,0.82)" : MUTED,
                fontSize: 12,
                fontWeight: "700",
                lineHeight: 17,
                marginTop: 3,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function ProgressDot({ done, label }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: done ? OLIVE : PREMIUM_CREAM,
          borderWidth: 1,
          borderColor: done ? OLIVE : CARD_BORDER,
        }}
      >
        <Ionicons
          name={done ? "checkmark" : "ellipse-outline"}
          size={15}
          color={done ? "#FFFFFF" : MUTED}
        />
      </View>

      <Text
        style={{
          color: done ? OLIVE_DARK : MUTED,
          fontSize: 10.5,
          fontWeight: "900",
          textAlign: "center",
          marginTop: 5,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}
function SavedEditsSummary({ plan }) {
  if (!plan) return null;

  return (
    <View
      style={{
        marginTop: 13,
        padding: 13,
        borderRadius: 22,
        backgroundColor: OLIVE_SOFT,
        borderWidth: 1,
        borderColor: OLIVE_BORDER,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <StudioIcon icon="checkmark-circle-outline" tint="olive" size={38} />

        <View style={{ flex: 1, marginLeft: 11 }}>
          <Text
            style={{
              color: TEXT,
              fontSize: 14,
              fontWeight: "900",
            }}
          >
            Video edits saved
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 12.4,
              fontWeight: "700",
              lineHeight: 18,
              marginTop: 4,
            }}
          >
            Trim: {plan.trimLabel || "Not set"} • Music:{" "}
            {plan.musicMood || "No music"} • Transition:{" "}
            {plan.transition || "None"}
          </Text>

          {plan.scriptureOverlay ? (
            <Text
              style={{
                color: EVENT_BROWN,
                fontSize: 12.2,
                fontWeight: "800",
                lineHeight: 18,
                marginTop: 4,
              }}
            >
              Scripture overlay: {plan.scriptureOverlay}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function WeeklyMessageEditor({ route, navigation }) {
  const { churchId, churchName } = route.params || {};
  const { week_start, week_end } = useMemo(getCurrentWeekBoundsISO, []);

  const weekLabel = useMemo(
    () => formatWeekLabel(week_start, week_end),
    [week_start, week_end]
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [videoUrl, setVideoUrl] = useState("");
  const [speakerLabel, setSpeakerLabel] = useState("");
  const [title, setTitle] = useState("");
  const [existingId, setExistingId] = useState(null);
  const [status, setStatus] = useState("draft");

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedMusicMood, setSelectedMusicMood] = useState("No music");
  const [videoEditorPlan, setVideoEditorPlan] = useState(null);

  const [openStep, setOpenStep] = useState("video");

  const hasVideo = !!String(videoUrl || "").trim();
  const hasTitle = String(title || "").trim().length >= 4;
  const hasSpeaker = String(speakerLabel || "").trim().length >= 2;
  const hasDetails = hasTitle && hasSpeaker;
  const hasEdits = !!videoEditorPlan;
  const readyToPublish = hasVideo && hasDetails;

  useEffect(() => {
    navigation.setOptions?.({
      title: churchName ? `${churchName} Weekly Message` : "Weekly Message",
    });
  }, [churchName, navigation]);

  useEffect(() => {
    let isMounted = true;

    async function loadExisting() {
      setLoading(true);

      const { data, error } = await supabase
        .from("church_weekly_messages")
        .select("id, video_url, speaker_label, title, status, video_editor_plan")
        .eq("church_id", churchId)
        .eq("week_start", week_start)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        console.log("WeeklyMessageEditor loadExisting error:", error);
      }

      if (!error && data) {
        setExistingId(data.id);
        setVideoUrl(data.video_url || "");
        setSpeakerLabel(data.speaker_label || "");
        setTitle(data.title || "");
        setStatus(data.status || "draft");
        setVideoEditorPlan(data.video_editor_plan || null);

        if (data.video_editor_plan?.musicMood) {
          setSelectedMusicMood(data.video_editor_plan.musicMood);
        }

        if (data.video_url && data.title && data.speaker_label) {
          setOpenStep("preview");
        } else if (data.video_url) {
          setOpenStep("details");
        }
      }

      setLoading(false);
    }

    if (churchId) {
      loadExisting();
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [churchId, week_start]);

  function toggleStep(step) {
    setOpenStep((current) => (current === step ? null : step));
  }

  async function uploadPickedVideo(asset) {
    if (!asset?.uri) {
      Alert.alert("No video found", "Please try again.");
      return;
    }

    try {
      setUploading(true);

      if (asset.duration && asset.duration > 180000) {
        Alert.alert(
          "Video too long for now",
          "For this first studio version, please keep weekly videos under 3 minutes. Longer-video processing will come later in the Church Media Studio plan."
        );
        setUploading(false);
        return;
      }

      const ext = guessExt(asset.fileName || asset.uri);
      const contentType = asset.mimeType || guessContentType(ext);

      const objectPath = `weekly/${churchId}/${week_start}/weekly-${Date.now()}.${ext}`;
      const bucket = "weekly-videos";

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        Alert.alert("Not signed in", "Please sign in again before uploading.");
        setUploading(false);
        return;
      }

      const supabaseUrl = supabase.supabaseUrl;
      const supabaseKey = supabase.supabaseKey;

      if (!supabaseUrl || !supabaseKey) {
        Alert.alert(
          "Upload setup error",
          "Supabase URL or key is missing from the app client."
        );
        setUploading(false);
        return;
      }

      const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`;

      const uploadResult = await FileSystem.uploadAsync(uploadUrl, asset.uri, {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabaseKey,
          "Content-Type": contentType,
          "x-upsert": "true",
        },
      });

      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        console.log("Weekly video direct upload failed:", uploadResult);

        Alert.alert(
          "Upload failed",
          `Supabase rejected the upload.\n\nStatus: ${uploadResult.status}\n\n${
            uploadResult.body || ""
          }`
        );

        return;
      }

      const { data: publicData } = supabase.storage
        .from(bucket)
        .getPublicUrl(objectPath);

      const publicUrl = publicData?.publicUrl;

      if (!publicUrl) {
        Alert.alert(
          "Upload succeeded, but URL missing",
          "We uploaded the video but could not generate a public URL."
        );
        return;
      }

      setVideoUrl(publicUrl);
      setOpenStep("details");

      Alert.alert(
        "Video uploaded",
        "Your weekly message video has been added. Next, add the title and speaker."
      );
    } catch (e) {
      console.log("Weekly video upload error full:", e);

      Alert.alert(
        "Upload error",
        e?.message
          ? `We couldn't upload this video.\n\nError: ${e.message}`
          : "We couldn't upload this video. Please try again."
      );
    } finally {
      setUploading(false);
    }
  }

  async function pickFromLibrary() {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert("Permission required", "Please allow photo library access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled) return;

    const asset = result.assets?.[0];

    await uploadPickedVideo(asset);
  }

  async function recordWithCamera() {
    const camPerm = await ImagePicker.requestCameraPermissionsAsync();

    if (!camPerm.granted) {
      Alert.alert("Permission required", "Please allow camera access.");
      return;
    }

    const micPerm = await ImagePicker.requestMicrophonePermissionsAsync?.();

    if (micPerm && !micPerm.granted) {
      Alert.alert("Permission required", "Please allow microphone access.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["videos"],
      allowsEditing: false,
      quality: 1,
      videoMaxDuration: 180,
    });

    if (result.canceled) return;

    const asset = result.assets?.[0];

    await uploadPickedVideo(asset);
  }
    async function save(nextStatus, editorPlanOverride = videoEditorPlan, options = {}) {
    if (!videoUrl.trim()) {
      Alert.alert(
        "Missing video",
        "Please upload or record a video before saving."
      );
      return false;
    }

    if (nextStatus === "published" && !readyToPublish) {
      Alert.alert(
        "Not ready to publish",
        "Add a video, message title and speaker before publishing to members."
      );
      return false;
    }

    setSaving(true);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      setSaving(false);
      Alert.alert("Not signed in", "Please sign in again.");
      return false;
    }

const payload = {
  id: existingId || undefined,
  church_id: churchId,
  week_start,
  week_end,
  source_label: churchName || "Church",
  speaker_label: speakerLabel.trim() || null,
  video_url: videoUrl.trim(),
  title: title.trim() || null,
  status: nextStatus,
  published_at: nextStatus === "published" ? new Date().toISOString() : null,
  created_by: user.id,
  video_editor_plan: editorPlanOverride || null,
  video_expires_at: getVideoExpiresAtISO(week_end),
};

    const { data, error } = await supabase
      .from("church_weekly_messages")
      .upsert(payload, { onConflict: "church_id,week_start" })
      .select("id, status, video_editor_plan")
      .maybeSingle();

    setSaving(false);

    if (error) {
      Alert.alert("Save failed", error.message);
      return false;
    }

    setExistingId(data?.id || existingId || null);
    setStatus(data?.status || nextStatus);
    setVideoEditorPlan(data?.video_editor_plan || editorPlanOverride || null);

    if (!options.silent) {
      Alert.alert(
        nextStatus === "published" ? "Published" : "Draft saved",
        nextStatus === "published"
          ? "This weekly message is now live for approved church members."
          : "Your weekly message has been saved as a draft."
      );
    }

    return true;
  }

  function confirmPublish() {
    Alert.alert(
      status === "published" ? "Update live message?" : "Publish to members?",
      status === "published"
        ? "This will update the live weekly message members can see."
        : `This will make this weekly message visible to ${
            churchName || "your church"
          } members for ${weekLabel}.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: status === "published" ? "Update Live" : "Publish",
          onPress: () => save("published"),
        },
      ]
    );
  }

  function openVideoEditor(initialTab = "trim") {
    if (!hasVideo) {
      Alert.alert(
        "Add a video first",
        "Upload or record the weekly message video before opening the editor."
      );
      return;
    }

    navigation.navigate("WeeklyMessageVideoEditor", {
      videoUrl,
      title,
      speakerLabel,
      churchName,
      weekLabel,
      selectedMusicMood,
      initialTab,
      existingPlan: videoEditorPlan,
      onSavePlan: async (plan) => {
        setVideoEditorPlan(plan);

        if (plan?.musicMood) {
          setSelectedMusicMood(plan.musicMood);
        }

        await save("draft", plan, { silent: true });
      },
    });
  }

  return (
    <Screen backgroundColor={PREMIUM_CREAM} padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 34,
        }}
      >
        <View
          style={{
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: AMBER_BORDER,
            borderRadius: 34,
            padding: 17,
            marginBottom: 14,
            shadowColor: SHADOW,
            shadowOpacity: 0.1,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 4,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <StudioIcon icon="videocam-outline" tint="amber" size={58} />

            <View style={{ flex: 1, marginLeft: 13 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text
                    style={{
                      color: EVENT_BROWN,
                      fontSize: 11,
                      fontWeight: "900",
                      letterSpacing: 1.1,
                      textTransform: "uppercase",
                    }}
                  >
                    Ministry Tools
                  </Text>

                  <Text
                    style={[
                      serifHeading,
                      {
                        fontSize: 27,
                        lineHeight: 32,
                        marginTop: 3,
                      },
                    ]}
                  >
                    Weekly Message Studio
                  </Text>
                </View>

                <StatusPill status={status} />
              </View>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 13.5,
                  fontWeight: "700",
                  lineHeight: 20,
                  marginTop: 8,
                }}
              >
                Add this week’s message, make simple video edits, preview it, then
                save as a draft or publish to members.
              </Text>
            </View>
          </View>

          <View style={{ marginTop: 15 }}>
            <View
              style={{
                flexDirection: "row",
                gap: 9,
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: 20,
                  backgroundColor: AMBER_SOFT,
                  borderWidth: 1,
                  borderColor: AMBER_BORDER,
                  padding: 11,
                }}
              >
                <Text
                  style={{
                    color: EVENT_BROWN,
                    fontSize: 16,
                    fontWeight: "900",
                  }}
                >
                  {weekLabel}
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 11.5,
                    fontWeight: "800",
                    marginTop: 3,
                  }}
                >
                  Current week
                </Text>
              </View>

              <View
                style={{
                  width: 112,
                  borderRadius: 20,
                  backgroundColor: readyToPublish ? OLIVE_SOFT : DANGER_SOFT,
                  borderWidth: 1,
                  borderColor: readyToPublish ? OLIVE_BORDER : DANGER_BORDER,
                  padding: 11,
                }}
              >
                <Text
                  style={{
                    color: readyToPublish ? OLIVE : DANGER,
                    fontSize: 16,
                    fontWeight: "900",
                  }}
                >
                  {readyToPublish ? "Ready" : "Draft"}
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 11.5,
                    fontWeight: "800",
                    marginTop: 3,
                  }}
                >
                  Status
                </Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                backgroundColor: PREMIUM_CREAM,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                padding: 10,
              }}
            >
              <ProgressDot done={hasVideo} label="Video" />
              <ProgressDot done={hasDetails} label="Details" />
              <ProgressDot done={hasEdits} label="Edits" />
              <ProgressDot done={readyToPublish} label="Ready" />
            </View>
          </View>
        </View>

        {loading ? (
          <StudioCard style={{ alignItems: "center", paddingVertical: 34 }}>
            <ActivityIndicator color={EVENT_AMBER} />

            <Text
              style={{
                color: MUTED,
                fontWeight: "800",
                marginTop: 10,
              }}
            >
              Loading weekly message…
            </Text>
          </StudioCard>
        ) : (
          <>
            <StepCard
              step="1"
              title="Add your video"
              subtitle={
                hasVideo
                  ? "Video uploaded. You can replace it if needed."
                  : "Upload or record the weekly message video."
              }
              icon={hasVideo ? "checkmark-circle-outline" : "cloud-upload-outline"}
              tint="amber"
              complete={hasVideo}
              open={openStep === "video"}
              onToggle={() => toggleStep("video")}
            >
              {hasVideo ? (
                <View
                  style={{
                    padding: 13,
                    borderRadius: 22,
                    backgroundColor: AMBER_SOFT,
                    borderWidth: 1,
                    borderColor: AMBER_BORDER,
                    marginBottom: 12,
                    flexDirection: "row",
                    alignItems: "flex-start",
                  }}
                >
                  <StudioIcon icon="checkmark-circle-outline" tint="amber" size={38} />

                  <View style={{ flex: 1, marginLeft: 11 }}>
                    <Text
                      style={{
                        color: TEXT,
                        fontSize: 14,
                        fontWeight: "900",
                      }}
                    >
                      Video uploaded
                    </Text>

                    <Text
                      style={{
                        color: MUTED,
                        fontSize: 12.4,
                        fontWeight: "700",
                        lineHeight: 18,
                        marginTop: 4,
                      }}
                      numberOfLines={2}
                    >
                      Your weekly message video is ready. You can replace it
                      below if needed.
                    </Text>
                  </View>
                </View>
              ) : (
                <View
                  style={{
                    padding: 13,
                    borderRadius: 22,
                    backgroundColor: DANGER_SOFT,
                    borderWidth: 1,
                    borderColor: DANGER_BORDER,
                    marginBottom: 12,
                    flexDirection: "row",
                    alignItems: "flex-start",
                  }}
                >
                  <StudioIcon icon="alert-circle-outline" tint="danger" size={38} />

                  <View style={{ flex: 1, marginLeft: 11 }}>
                    <Text
                      style={{
                        color: TEXT,
                        fontSize: 14,
                        fontWeight: "900",
                      }}
                    >
                      No video added yet
                    </Text>

                    <Text
                      style={{
                        color: MUTED,
                        fontSize: 12.4,
                        fontWeight: "700",
                        lineHeight: 18,
                        marginTop: 4,
                      }}
                    >
                      Add a video first, then you can edit, preview, save or publish.
                    </Text>
                  </View>
                </View>
              )}

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    title={uploading ? "Uploading..." : hasVideo ? "Record again" : "Record"}
                    subtitle="Use camera"
                    icon="videocam-outline"
                    tint="olive"
                    loading={uploading}
                    disabled={saving}
                    onPress={recordWithCamera}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    title={uploading ? "Uploading..." : hasVideo ? "Replace video" : "Upload"}
                    subtitle="From library"
                    icon="cloud-upload-outline"
                    tint="amber"
                    loading={uploading}
                    disabled={saving}
                    onPress={pickFromLibrary}
                  />
                </View>
              </View>

              <Pressable
                onPress={() => setShowAdvanced((v) => !v)}
                style={({ pressed }) => ({
                  marginTop: 12,
                  borderRadius: 18,
                  padding: 12,
                  backgroundColor: pressed ? OLIVE_SOFT : PREMIUM_CREAM,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                })}
              >
                <Text
                  style={{
                    color: OLIVE_DARK,
                    fontSize: 13,
                    fontWeight: "900",
                  }}
                >
                  Advanced: use hosted video URL
                </Text>

                <Ionicons
                  name={showAdvanced ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={OLIVE_DARK}
                />
              </Pressable>

              {showAdvanced ? (
                <View style={{ marginTop: 12 }}>
                  <FieldLabel helper="Paste a hosted video URL for testing or external videos.">
                    Video URL
                  </FieldLabel>

                  <TextInput
                    value={videoUrl}
                    onChangeText={(value) => {
                      setVideoUrl(value);

                      if (value?.trim()) {
                        setOpenStep("details");
                      }
                    }}
                    placeholder="https://..."
                    placeholderTextColor="rgba(107, 114, 128, 0.68)"
                    autoCapitalize="none"
                    style={inputStyle()}
                  />
                </View>
              ) : null}
            </StepCard>
                       <StepCard
              step="2"
              title="Add message details"
              subtitle={
                hasDetails
                  ? "Title and speaker are ready."
                  : "Add the title and speaker shown to members."
              }
              icon={hasDetails ? "checkmark-circle-outline" : "create-outline"}
              tint="olive"
              complete={hasDetails}
              open={openStep === "details"}
              onToggle={() => toggleStep("details")}
            >
              <FieldLabel helper="Short, clear and spiritually focused.">
                Message title
              </FieldLabel>

              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Example: Walk in faith"
                placeholderTextColor="rgba(107, 114, 128, 0.68)"
                style={inputStyle({ marginBottom: 13 })}
              />

              <FieldLabel helper="Pastor, leader or presenter name.">
                Speaker / presenter
              </FieldLabel>

              <TextInput
                value={speakerLabel}
                onChangeText={setSpeakerLabel}
                placeholder="Example: Pastor John"
                placeholderTextColor="rgba(107, 114, 128, 0.68)"
                style={inputStyle()}
              />

              <Pressable
                onPress={() => setOpenStep("edit")}
                style={({ pressed }) => ({
                  marginTop: 13,
                  borderRadius: 18,
                  padding: 12,
                  backgroundColor: pressed ? OLIVE_SOFT : PREMIUM_CREAM,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                })}
              >
                <Text
                  style={{
                    color: OLIVE_DARK,
                    fontSize: 13,
                    fontWeight: "900",
                  }}
                >
                  Next: edit video
                </Text>
              </Pressable>
            </StepCard>

            <StepCard
              step="3"
              title="Edit video"
              subtitle={
                hasEdits
                  ? "Video edits have been saved."
                  : "Optional: trim, music, captions and overlays."
              }
              icon={hasEdits ? "checkmark-circle-outline" : "cut-outline"}
              tint="amber"
              complete={hasEdits}
              open={openStep === "edit"}
              onToggle={() => toggleStep("edit")}
            >
              <Text
                style={{
                  color: MUTED,
                  fontSize: 13,
                  fontWeight: "700",
                  lineHeight: 19,
                  marginBottom: 12,
                }}
              >
                Use the video editor if you want to trim the message, choose a
                music mood, prepare transitions, add captions or include a
                scripture overlay.
              </Text>

              <PrimaryButton
                title={hasEdits ? "Edit again" : "Edit video"}
                subtitle={
                  hasVideo
                    ? "Turn sideways to open the video editor."
                    : "Add a video first."
                }
                icon="phone-landscape-outline"
                tint="amber"
                disabled={!hasVideo || uploading || saving}
                onPress={() => openVideoEditor("trim")}
              />

              <SavedEditsSummary plan={videoEditorPlan} />

              {!hasEdits ? (
                <View
                  style={{
                    marginTop: 13,
                    padding: 12,
                    borderRadius: 20,
                    backgroundColor: PREMIUM_CREAM,
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                  }}
                >
                  <Text
                    style={{
                      color: TEXT,
                      fontSize: 13,
                      fontWeight: "900",
                    }}
                  >
                    Editing is optional
                  </Text>

                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 12.3,
                      fontWeight: "700",
                      lineHeight: 18,
                      marginTop: 4,
                    }}
                  >
                    You can still save or publish the message without video edits.
                  </Text>
                </View>
              ) : null}
            </StepCard>

            <StepCard
              step="4"
              title="Preview"
              subtitle="Check how this weekly message will look to members."
              icon="phone-portrait-outline"
              tint="olive"
              complete={readyToPublish}
              open={openStep === "preview"}
              onToggle={() => toggleStep("preview")}
            >
              <WeeklyMessageCard
                theme={theme}
                messageTitle={title.trim() || null}
                sourceLabel={churchName || "Church"}
                speakerLabel={speakerLabel.trim() || ""}
                videoUrl={videoUrl.trim() || null}
                weekLabel={weekLabel}
                videoEditorPlan={videoEditorPlan}
                noticeboardUnreadCount={0}
                onPressChallenges={() =>
                  Alert.alert("Preview", "Challenges opens from the Daily page.")
                }
                onPressNoticeboard={() =>
                  Alert.alert("Preview", "Noticeboard opens from the Daily page.")
                }
                onPressChurchProfile={() =>
                  Alert.alert("Preview", "Church Profile opens from the Daily page.")
                }
              />

              <Pressable
                onPress={() => setOpenStep("publish")}
                style={({ pressed }) => ({
                  marginTop: 13,
                  borderRadius: 18,
                  padding: 12,
                  backgroundColor: pressed ? OLIVE_SOFT : PREMIUM_CREAM,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                })}
              >
                <Text
                  style={{
                    color: OLIVE_DARK,
                    fontSize: 13,
                    fontWeight: "900",
                  }}
                >
                  Next: save or publish
                </Text>
              </Pressable>
            </StepCard>

            <StepCard
              step="5"
              title="Save or publish"
              subtitle="Save privately as a draft, or publish to approved members."
              icon="rocket-outline"
              tint="amber"
              complete={status === "published"}
              open={openStep === "publish"}
              onToggle={() => toggleStep("publish")}
            >
              <View
                style={{
                  padding: 13,
                  borderRadius: 22,
                  backgroundColor: readyToPublish ? OLIVE_SOFT : DANGER_SOFT,
                  borderWidth: 1,
                  borderColor: readyToPublish ? OLIVE_BORDER : DANGER_BORDER,
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    color: readyToPublish ? OLIVE_DARK : DANGER,
                    fontSize: 14,
                    fontWeight: "900",
                  }}
                >
                  {readyToPublish ? "Ready to save or publish" : "Not ready yet"}
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 12.4,
                    fontWeight: "700",
                    lineHeight: 18,
                    marginTop: 4,
                  }}
                >
                  {readyToPublish
                    ? "You have added the video, title and speaker."
                    : "Add a video, title and speaker before publishing."}
                </Text>
              </View>

              <View style={{ gap: 10 }}>
                <PrimaryButton
                  title={saving ? "Saving..." : "Save as draft"}
                  subtitle="Keep this private so you can come back later."
                  icon="save-outline"
                  tint="olive"
                  loading={saving}
                  disabled={uploading || !hasVideo}
                  onPress={() => save("draft")}
                />

                <PrimaryButton
                  title={
                    saving
                      ? "Publishing..."
                      : status === "published"
                        ? "Update live message"
                        : "Publish to members"
                  }
                  subtitle="Make this visible to approved church members."
                  icon="cloud-upload-outline"
                  tint="amber"
                  loading={saving}
                  disabled={uploading}
                  onPress={confirmPublish}
                />

                <Pressable
                  onPress={() => navigation.goBack()}
                  disabled={saving || uploading}
                  style={({ pressed }) => ({
                    borderRadius: 20,
                    paddingVertical: 13,
                    paddingHorizontal: 14,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                    backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
                    opacity: saving || uploading ? 0.55 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 13,
                      fontWeight: "900",
                    }}
                  >
                    Back to Ministry Tools
                  </Text>
                </Pressable>
              </View>
            </StepCard>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}