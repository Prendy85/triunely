import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

// Monday-start week bounds (Mon–Sun) in UTC-safe YYYY-MM-DD strings
function getCurrentWeekBoundsISO() {
  const now = new Date();

  const utcYear = now.getUTCFullYear();
  const utcMonth = now.getUTCMonth();
  const utcDate = now.getUTCDate();
  const utcDay = now.getUTCDay(); // 0 Sun .. 6 Sat

  const diffToMonday = (utcDay + 6) % 7;

  const monday = new Date(Date.UTC(utcYear, utcMonth, utcDate - diffToMonday));
  const sunday = new Date(Date.UTC(utcYear, utcMonth, utcDate - diffToMonday + 6));

  const toISODate = (d) => d.toISOString().slice(0, 10);

  return {
    week_start: toISODate(monday),
    week_end: toISODate(sunday),
  };
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

function StudioCard({ children, style }) {
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: 18,
          padding: 14,
          borderWidth: 1,
          borderColor: theme.colors.divider,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function StatusPill({ status }) {
  const published = status === "published";

  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: 999,
        paddingVertical: 7,
        paddingHorizontal: 12,
        backgroundColor: published ? theme.colors.goldHalo : theme.colors.surfaceAlt,
        borderWidth: 1,
        borderColor: published ? theme.colors.goldOutline : theme.colors.divider,
      }}
    >
      <Text
        style={{
          color: published ? theme.colors.goldPressed : theme.colors.text2,
          fontWeight: "900",
          fontSize: 12,
        }}
      >
        {published ? "PUBLISHED" : "DRAFT"}
      </Text>
    </View>
  );
}

export default function WeeklyMessageEditor({ route, navigation }) {
  const { churchId, churchName } = route.params || {};
  const { week_start, week_end } = useMemo(getCurrentWeekBoundsISO, []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);

  const [videoUrl, setVideoUrl] = useState("");
  const [speakerLabel, setSpeakerLabel] = useState("");
  const [title, setTitle] = useState("");
  const [existingId, setExistingId] = useState(null);
  const [status, setStatus] = useState("draft");

  const [showAdvanced, setShowAdvanced] = useState(false);

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
        .select("id, video_url, speaker_label, title, status")
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
      }

      setLoading(false);
    }

    if (churchId) loadExisting();
    else setLoading(false);

    return () => {
      isMounted = false;
    };
  }, [churchId, week_start]);

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

      let fileBody;

      try {
        const res = await fetch(asset.uri);

        if (typeof res.arrayBuffer === "function") {
          const ab = await res.arrayBuffer();
          fileBody = ab;
        } else {
          throw new Error("arrayBuffer() not available");
        }
      } catch (e) {
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: "base64",
        });

        fileBody = decode(base64);
      }

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(objectPath, fileBody, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        console.log("Weekly video upload error:", uploadError);
        Alert.alert("Upload failed", uploadError.message);
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
      Alert.alert("Video uploaded", "Your weekly message video is attached and ready to preview.");
    } catch (e) {
      console.log("Weekly video upload error:", e);
      Alert.alert("Upload error", "We couldn't upload this video. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function pickFromLibrary() {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

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

  async function save(nextStatus) {
    if (!videoUrl.trim()) {
      Alert.alert(
        "Missing video",
        "Please upload a video, or add a valid hosted video URL in Advanced."
      );
      return;
    }

    setSaving(true);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      setSaving(false);
      Alert.alert("Not signed in", "Please sign in again.");
      return;
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
    };

    const { error } = await supabase
      .from("church_weekly_messages")
      .upsert(payload, { onConflict: "church_id,week_start" });

    setSaving(false);

    if (error) {
      Alert.alert("Save failed", error.message);
      return;
    }

    setStatus(nextStatus);

    Alert.alert(
      nextStatus === "published" ? "Published" : "Draft saved",
      nextStatus === "published"
        ? "This weekly message is now live on Daily for approved church members."
        : "Your weekly message draft has been saved."
    );
  }

  function confirmPublish() {
    Alert.alert(
      "Publish Weekly Message?",
      `This will make this message visible on Daily for ${churchName || "your church"} members for ${week_start} → ${week_end}.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Publish",
          onPress: () => save("published"),
        },
      ]
    );
  }

  return (
    <Screen backgroundColor={theme.colors.bg} padded={false}>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 28,
          gap: 14,
        }}
      >
        <View>
          <Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: "900" }}>
            Weekly Message Studio
          </Text>

          <Text style={{ color: theme.colors.text2, marginTop: 6, lineHeight: 20 }}>
            Create the main weekly encouragement that appears on the Daily page for your church.
          </Text>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color={theme.colors.gold} />
            <Text style={{ color: theme.colors.muted, marginTop: 8 }}>
              Loading weekly message…
            </Text>
          </View>
        ) : (
          <>
            <StudioCard>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
                    This week
                  </Text>

                  <Text style={{ color: theme.colors.text2, marginTop: 6, lineHeight: 20 }}>
                    {week_start} → {week_end}
                  </Text>

                  <Text style={{ color: theme.colors.muted, marginTop: 6, lineHeight: 18 }}>
                    Weekly Message is designed as one main spiritual anchor per week.
                  </Text>
                </View>

                <StatusPill status={status} />
              </View>
            </StudioCard>

            <StudioCard>
              <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
                Message details
              </Text>

              <Text style={{ color: theme.colors.muted, marginTop: 6, lineHeight: 18 }}>
                These details appear on the Daily card above the video.
              </Text>

              <View style={{ height: 14 }} />

              <Text style={{ color: theme.colors.text2, fontWeight: "800", marginBottom: 6 }}>
                Title
              </Text>

              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Example: Walk in faith"
                placeholderTextColor={theme.input?.placeholder || theme.colors.muted}
                style={[
                  theme.input?.box,
                  {
                    padding: 12,
                    borderWidth: 1,
                    borderRadius: 12,
                    borderColor: theme.colors.divider,
                    color: theme.colors.text,
                  },
                ]}
              />

              <View style={{ height: 12 }} />

              <Text style={{ color: theme.colors.text2, fontWeight: "800", marginBottom: 6 }}>
                Speaker / presenter
              </Text>

              <TextInput
                value={speakerLabel}
                onChangeText={setSpeakerLabel}
                placeholder="Example: Pastor John"
                placeholderTextColor={theme.input?.placeholder || theme.colors.muted}
                style={[
                  theme.input?.box,
                  {
                    padding: 12,
                    borderWidth: 1,
                    borderRadius: 12,
                    borderColor: theme.colors.divider,
                    color: theme.colors.text,
                  },
                ]}
              />
            </StudioCard>

            <StudioCard>
              <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
                Video
              </Text>

              <Text style={{ color: theme.colors.muted, marginTop: 6, lineHeight: 18 }}>
                Record a short encouragement or upload one from your library.
              </Text>

              <View style={{ height: 12 }} />

              {videoUrl ? (
                <View
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    backgroundColor: theme.colors.goldHalo,
                    borderWidth: 1,
                    borderColor: theme.colors.goldOutline,
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                    Video attached
                  </Text>

                  <Text
                    style={{
                      color: theme.colors.text2,
                      marginTop: 4,
                      fontSize: 12,
                      lineHeight: 18,
                    }}
                    numberOfLines={2}
                  >
                    You can preview it below or replace it with a new recording/upload.
                  </Text>
                </View>
              ) : (
                <View
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    backgroundColor: theme.colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: theme.colors.divider,
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                    No video attached yet
                  </Text>

                  <Text style={{ color: theme.colors.text2, marginTop: 4, lineHeight: 18 }}>
                    Add a video before saving or publishing this weekly message.
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  disabled={uploading || saving}
                  onPress={recordWithCamera}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: theme.colors.divider,
                    opacity: uploading || saving ? 0.6 : 1,
                    alignItems: "center",
                    backgroundColor: theme.colors.surface,
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                    {uploading ? "Uploading..." : "Record"}
                  </Text>
                </Pressable>

                <Pressable
                  disabled={uploading || saving}
                  onPress={pickFromLibrary}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: theme.colors.divider,
                    opacity: uploading || saving ? 0.6 : 1,
                    alignItems: "center",
                    backgroundColor: theme.colors.surface,
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                    {uploading ? "Uploading..." : "Upload"}
                  </Text>
                </Pressable>
              </View>

              <Text style={{ color: theme.colors.muted, marginTop: 10, fontSize: 12, lineHeight: 18 }}>
                Current studio limit: keep videos under 3 minutes. Longer videos and trimming come later.
              </Text>
            </StudioCard>

            <StudioCard>
              <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
                Daily preview
              </Text>

              <Text style={{ color: theme.colors.muted, marginTop: 6, lineHeight: 18 }}>
                This is how members will see the weekly message on the Daily page.
              </Text>

              <View style={{ height: 12 }} />

              <WeeklyMessageCard
                theme={theme}
                messageTitle={title.trim() || null}
                sourceLabel={churchName || "Church"}
                speakerLabel={speakerLabel.trim() || ""}
                videoUrl={videoUrl.trim() || null}
                weekLabel={`${week_start} – ${week_end}`}
                noticeboardUnreadCount={0}
                onPressChallenges={() => Alert.alert("Preview", "Challenges opens from the Daily page.")}
                onPressNoticeboard={() => Alert.alert("Preview", "Noticeboard opens from the Daily page.")}
                onPressChurchProfile={() => Alert.alert("Preview", "Church Profile opens from the Daily page.")}
              />
            </StudioCard>

            <StudioCard>
              <Pressable
                onPress={() => setShowAdvanced((v) => !v)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
                  Advanced
                </Text>

                <Text style={{ color: theme.colors.sage, fontWeight: "900" }}>
                  {showAdvanced ? "Hide" : "Show"}
                </Text>
              </Pressable>

              {showAdvanced ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: theme.colors.text2, fontWeight: "800", marginBottom: 6 }}>
                    Video URL
                  </Text>

                  <TextInput
                    value={videoUrl}
                    onChangeText={setVideoUrl}
                    placeholder="Upload a video or paste a hosted URL"
                    placeholderTextColor={theme.input?.placeholder || theme.colors.muted}
                    autoCapitalize="none"
                    style={[
                      theme.input?.box,
                      {
                        padding: 12,
                        borderWidth: 1,
                        borderRadius: 12,
                        borderColor: theme.colors.divider,
                        color: theme.colors.text,
                      },
                    ]}
                  />

                  <Text style={{ color: theme.colors.muted, marginTop: 8, fontSize: 12, lineHeight: 18 }}>
                    This is mainly for testing or using an externally hosted video.
                  </Text>
                </View>
              ) : null}
            </StudioCard>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                disabled={saving || uploading}
                onPress={() => save("draft")}
                style={{
                  flex: 1,
                  paddingVertical: 13,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: theme.colors.divider,
                  opacity: saving || uploading ? 0.6 : 1,
                  alignItems: "center",
                  backgroundColor: theme.colors.surface,
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                  {saving ? "Saving..." : "Save Draft"}
                </Text>
              </Pressable>

              <Pressable
                disabled={saving || uploading}
                onPress={confirmPublish}
                style={{
                  flex: 1,
                  paddingVertical: 13,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: theme.colors.goldOutline,
                  opacity: saving || uploading ? 0.6 : 1,
                  alignItems: "center",
                  backgroundColor: theme.colors.gold,
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                  {saving ? "Publishing..." : status === "published" ? "Update Live" : "Publish"}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}