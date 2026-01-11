import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system";
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
import { supabase } from "../lib/supabase";

// Monday-start week bounds (Mon–Sun) in local time, returned as YYYY-MM-DD strings
function getCurrentWeekBoundsISO() {
  const now = new Date();
  const day = now.getDay(); // 0 Sun .. 6 Sat
  const diffToMonday = (day + 6) % 7; // Mon=0, Tue=1 ... Sun=6
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const toISODate = (d) => d.toISOString().slice(0, 10);
  return { week_start: toISODate(monday), week_end: toISODate(sunday) };
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

      // Basic guardrails (MVP): strongly recommend short clips for now
      // asset.duration is in ms on some platforms; may be null
      if (asset.duration && asset.duration > 180000) {
        Alert.alert(
          "Video too long (for now)",
          "For the MVP upload flow, please keep weekly videos under 3 minutes. We’ll add robust long-video uploads next."
        );
        setUploading(false);
        return;
      }

      const ext = guessExt(asset.fileName || asset.uri);
      const contentType = asset.mimeType || guessContentType(ext);

      const objectPath = `weekly/${churchId}/${week_start}/weekly-${Date.now()}.${ext}`;
      const bucket = "weekly-videos";

      // Preferred: arrayBuffer() (no blob usage)
      let fileBody;

      try {
        const res = await fetch(asset.uri);
        if (typeof res.arrayBuffer === "function") {
          const ab = await res.arrayBuffer();
          fileBody = ab; // Supabase upload accepts ArrayBuffer
        } else {
          throw new Error("arrayBuffer() not available");
        }
      } catch (e) {
        // Fallback: FileSystem base64 -> ArrayBuffer
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
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
      Alert.alert("Uploaded", "Video uploaded and attached to this weekly message.");
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

    // iOS can require microphone permission for video audio
    const micPerm = await ImagePicker.requestMicrophonePermissionsAsync?.();
    if (micPerm && !micPerm.granted) {
      Alert.alert("Permission required", "Please allow microphone access.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["videos"],
      allowsEditing: false,
      quality: 1,
      videoMaxDuration: 180, // seconds (MVP)
    });

    if (result.canceled) return;

    const asset = result.assets?.[0];
    await uploadPickedVideo(asset);
  }

  async function save(nextStatus) {
    if (!videoUrl.trim()) {
      Alert.alert(
        "Missing video",
        "Please upload a video (or paste a valid hosted video URL)."
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
      nextStatus === "published" ? "Published" : "Saved",
      nextStatus === "published"
        ? "Weekly message is live for this week."
        : "Draft saved."
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "700" }}>
          Weekly Encouragement (Mon–Sun)
        </Text>
        <Text style={{ opacity: 0.7 }}>
          Week: {week_start} → {week_end}
        </Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : (
          <View style={{ gap: 12, marginTop: 10 }}>
            {/* Upload controls */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontWeight: "800" }}>Weekly video</Text>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  disabled={uploading}
                  onPress={recordWithCamera}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "rgba(0,0,0,0.12)",
                    opacity: uploading ? 0.6 : 1,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontWeight: "800" }}>
                    {uploading ? "Uploading..." : "Record video"}
                  </Text>
                </Pressable>

                <Pressable
                  disabled={uploading}
                  onPress={pickFromLibrary}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "rgba(0,0,0,0.12)",
                    opacity: uploading ? 0.6 : 1,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontWeight: "800" }}>
                    {uploading ? "Uploading..." : "Choose from library"}
                  </Text>
                </Pressable>
              </View>

              <Text style={{ opacity: 0.7, fontSize: 12 }}>
                MVP note: keep videos short for now (we’ll add robust long-video uploads next).
              </Text>
            </View>

            {/* URL (auto-filled after upload; still editable) */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontWeight: "700" }}>Video URL</Text>
              <TextInput
                value={videoUrl}
                onChangeText={setVideoUrl}
                placeholder="Upload a video or paste a hosted URL"
                autoCapitalize="none"
                style={{
                  padding: 12,
                  borderWidth: 1,
                  borderRadius: 12,
                  borderColor: "rgba(0,0,0,0.12)",
                }}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontWeight: "700" }}>Speaker (optional)</Text>
              <TextInput
                value={speakerLabel}
                onChangeText={setSpeakerLabel}
                placeholder="Pastor John"
                style={{
                  padding: 12,
                  borderWidth: 1,
                  borderRadius: 12,
                  borderColor: "rgba(0,0,0,0.12)",
                }}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontWeight: "700" }}>Title (optional)</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="A message of hope for this week"
                style={{
                  padding: 12,
                  borderWidth: 1,
                  borderRadius: 12,
                  borderColor: "rgba(0,0,0,0.12)",
                }}
              />
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <Pressable
                disabled={saving || uploading}
                onPress={() => save("draft")}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "rgba(0,0,0,0.12)",
                  opacity: saving || uploading ? 0.6 : 1,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "800" }}>
                  {saving ? "Saving..." : "Save Draft"}
                </Text>
              </Pressable>

              <Pressable
                disabled={saving || uploading}
                onPress={() => save("published")}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "rgba(0,0,0,0.12)",
                  opacity: saving || uploading ? 0.6 : 1,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "800" }}>
                  {saving ? "Publishing..." : "Publish Now"}
                </Text>
              </Pressable>
            </View>

            <Text style={{ marginTop: 6, opacity: 0.7 }}>
              Current status: {status}
            </Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
