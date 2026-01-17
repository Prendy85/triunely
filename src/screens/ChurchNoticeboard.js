// src/screens/ChurchNoticeboard.js
import { Video } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as LegacyFileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";
import { theme } from "../theme/theme";



export default function ChurchNoticeboard({ route, navigation }) {
  const churchId = route?.params?.churchId;

  const [viewerId, setViewerId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // NEW: media for notices
  const [mediaAsset, setMediaAsset] = useState(null); // { uri, type, fileName, etc. }
  const [uploadingMedia, setUploadingMedia] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const { data: sessData } = await supabase.auth.getSession();
        const uid = sessData?.session?.user?.id || null;
        setViewerId(uid);

        if (uid && churchId) {
          const { data: adminRow } = await supabase
            .from("church_admins")
            .select("user_id, church_id")
            .eq("user_id", uid)
            .eq("church_id", churchId)
            .maybeSingle();

          setIsAdmin(Boolean(adminRow));
        } else {
          setIsAdmin(false);
        }

        if (churchId) await load();
      } catch (e) {
        console.log("ChurchNoticeboard init error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [churchId]);

  async function load() {
    if (!churchId) return;

    const { data, error } = await supabase
      .from("church_noticeboard_posts")
      .select("id, title, content, media_url, media_type, thumbnail_url, created_at, created_by")
      .eq("church_id", churchId)
      .order("created_at", { ascending: false });

    if (error) {
      console.log("noticeboard load error:", error);
      Alert.alert("Error", "Could not load noticeboard right now.");
      return;
    }

    setItems(data || []);
  }

  function resetNewNoticeForm() {
    setTitle("");
    setContent("");
    setMediaAsset(null);
  }

  async function ensureMediaPermissions() {
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (lib.status !== "granted") {
      Alert.alert("Permission needed", "We need access to your photos to attach media.");
      return false;
    }

    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (cam.status !== "granted") {
      // Camera only needed for recording; library upload still works
      return true;
    }

    return true;
  }

  async function pickImageFromLibrary() {
    if (!isAdmin) return;

    const ok = await ensureMediaPermissions();
    if (!ok) return;

    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (res.canceled) return;

      const asset = res.assets?.[0];
      if (!asset?.uri) return;

      setMediaAsset({
        uri: asset.uri,
        type: "image",
        fileName: asset.fileName || `notice-${Date.now()}.jpg`,
      });
    } catch (e) {
      console.log("pickImageFromLibrary error:", e);
      Alert.alert("Error", "Could not open your photo library.");
    }
  }

  async function recordVideo() {
  if (!isAdmin) return;

  // library permission still useful for picking; but recording needs camera permission
  const cam = await ImagePicker.requestCameraPermissionsAsync();
  if (cam.status !== "granted") {
    Alert.alert("Permission needed", "We need camera permission to record a video.");
    return;
  }

  try {
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 30,
      quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });

    if (res.canceled) return;

    const asset = res.assets?.[0];
    if (!asset?.uri) return;

    setMediaAsset({
      uri: asset.uri,
      type: "video",
      fileName: asset.fileName || `notice-${Date.now()}.mp4`,
    });
  } catch (e) {
    console.log("recordVideo error:", e);
    Alert.alert("Error", "Could not open the camera to record video.");
  }
}

  async function uploadNoticeMedia(asset) {
  if (!asset?.uri) return { mediaUrl: null, mediaType: null, thumbnailUrl: null };

  // Guard: large videos can crash if base64-encoded (MVP safety)
  try {
    const info = await FileSystem.getInfoAsync(asset.uri, { size: true });
    const sizeBytes = info?.size ?? 0;

    // ~12MB cap for MVP via base64 edge upload
    const MAX = 6 * 1024 * 1024;
    if (asset.type === "video" && sizeBytes > MAX) {
      Alert.alert(
        "Video too large",
        "For now, please record a shorter clip (under ~30 seconds). We’ll upgrade to large-file uploads next."
      );
      return { mediaUrl: null, mediaType: null, thumbnailUrl: null };
    }
  } catch {
    // ignore size check failures
  }

  setUploadingMedia(true);

  try {
    let thumbnailUrl = null;

    // 1) If this is a video: generate + upload thumbnail first
    if (asset.type === "video") {
      try {
       const thumbRes = await VideoThumbnails.getThumbnailAsync(asset.uri, {
  time: 1000,
});

console.log("THUMB RES:", thumbRes);

if (!thumbRes?.uri) {
  console.log("THUMB FAILED: no uri returned");
} else {
  console.log("THUMB URI:", thumbRes.uri);

  const thumbBase64 = await LegacyFileSystem.readAsStringAsync(thumbRes.uri, {
    encoding: "base64",
  });

  console.log("THUMB BASE64 LENGTH:", thumbBase64?.length);

  const thumbFileName = `notice-thumb-${Date.now()}.jpg`;

  const { data: thumbData, error: thumbError } = await supabase.functions.invoke(
    "upload-post-image",
    {
      body: {
        base64: thumbBase64,
        fileName: thumbFileName,
        contentType: "image/jpeg",
        pathPrefix: `noticeboard/${churchId}/images`,
      },
    }
  );

  console.log("THUMB UPLOAD DATA:", thumbData);
  console.log("THUMB UPLOAD ERROR:", thumbError);
  console.log("THUMB UPLOAD STATUS:", thumbError?.context?.status);
  console.log("THUMB UPLOAD BODY:", thumbError?.context?.body);

  if (!thumbError && thumbData?.publicUrl) {
    thumbnailUrl = thumbData.publicUrl;
  }
}


      } catch (e) {
        console.log("thumbnail generation failed:", e);
      }
    }

    // 2) Upload the actual media
    const base64 = await LegacyFileSystem.readAsStringAsync(asset.uri, {
      encoding: "base64",
    });

    const fileName = asset.fileName || `notice-${Date.now()}`;
    const contentType = asset.type === "video" ? "video/mp4" : "image/jpeg";

    const { data: fnData, error: fnError } = await supabase.functions.invoke("upload-post-image", {
      body: {
        base64,
        fileName,
        contentType,
        pathPrefix: `noticeboard/${churchId}/${asset.type === "video" ? "videos" : "images"}`,
      },
    });

  if (fnError) {
  console.log("upload-post-image fnError:", fnError);
  console.log("status:", fnError?.context?.status);
  console.log("body:", fnError?.context?.body);
  throw fnError;
}

    if (!fnData?.publicUrl) throw new Error("No publicUrl returned");

    return {
      mediaUrl: fnData.publicUrl,
      mediaType: contentType,
      thumbnailUrl,
    };
  } catch (e) {
    console.log("uploadNoticeMedia error:", e);
    Alert.alert("Upload failed", "We couldn’t upload that media right now.");
    return { mediaUrl: null, mediaType: null, thumbnailUrl: null };
  } finally {
    setUploadingMedia(false);
  }
}


  async function createNotice() {
    if (!churchId) return;
    if (!viewerId) {
      Alert.alert("Not signed in", "Please sign in again.");
      return;
    }

    const body = content.trim();
    if (!body && !mediaAsset) {
      Alert.alert("Missing content", "Please write a notice or attach media.");
      return;
    }

    try {
      setSaving(true);

      let media_url = null;
let media_type = null;
let thumbnail_url = null;

if (mediaAsset) {
  const uploaded = await uploadNoticeMedia(mediaAsset);
  media_url = uploaded.mediaUrl;
  media_type = uploaded.mediaType;
  thumbnail_url = uploaded.thumbnailUrl;
}


      const payload = {
  church_id: churchId,
  title: title.trim() || null,
  content: body || "",
  created_by: viewerId,
  media_url,
  media_type,
  thumbnail_url,
};


      const { data, error } = await supabase
        .from("church_noticeboard_posts")
        .insert(payload)
        .select("id, title, content, media_url, media_type, thumbnail_url, created_at, created_by")
        .single();

      if (error) throw error;

      setItems((prev) => [data, ...(prev || [])]);
      setShowNew(false);
      resetNewNoticeForm();
    } catch (e) {
      console.log("noticeboard create error:", e);
      Alert.alert("Could not post", e?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function renderNoticeMedia(item) {
    if (!item?.media_url || !item?.media_type) return null;

    const isVideo = String(item.media_type).startsWith("video/");
    const isImage = String(item.media_type).startsWith("image/");

    if (isImage) {
      return (
        <Image
          source={{ uri: item.media_url }}
          style={{
            width: "100%",
            height: 220,
            borderRadius: 14,
            marginTop: 10,
            backgroundColor: theme.colors.surfaceAlt,
          }}
          resizeMode="cover"
        />
      );
    }

    if (isVideo) {
      return (
        <View style={{ marginTop: 10, borderRadius: 14, overflow: "hidden" }}>
         <Video
  source={{ uri: item.media_url }}
  style={{
    width: "100%",
    height: 220,
    backgroundColor: theme.colors.surfaceAlt,
  }}
  useNativeControls
  resizeMode="contain"
  usePoster={Boolean(item.thumbnail_url)}
  posterSource={item.thumbnail_url ? { uri: item.thumbnail_url } : undefined}
/>
        </View>
      );
    }

    return null;
  }

  function renderNewNoticeMediaPreview() {
    if (!mediaAsset) return null;

    const isVideo = mediaAsset.type === "video";

    return (
      <View
        style={{
          marginTop: 10,
          borderWidth: 1,
          borderColor: theme.colors.divider,
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: 14,
          padding: 10,
        }}
      >
        <Text style={{ color: theme.colors.muted, fontWeight: "800", marginBottom: 8 }}>
          Attached {isVideo ? "video" : "image"}
        </Text>

        {isVideo ? (
          <View style={{ borderRadius: 12, overflow: "hidden" }}>
            <Video
              source={{ uri: mediaAsset.uri }}
              style={{ width: "100%", height: 180, backgroundColor: theme.colors.surfaceAlt }}
              useNativeControls
              resizeMode="contain"
            />
          </View>
        ) : (
          <Image
            source={{ uri: mediaAsset.uri }}
            style={{ width: "100%", height: 180, borderRadius: 12 }}
            resizeMode="cover"
          />
        )}

        <Pressable
          onPress={() => setMediaAsset(null)}
          disabled={saving || uploadingMedia}
          style={[theme.button.outline, { marginTop: 10, borderRadius: 12, paddingVertical: 10 }]}
        >
          <Text style={theme.button.outlineText}>Remove attachment</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Screen backgroundColor={theme.colors.bg} padded={false} style={{ flex: 1 }} contentStyle={{ flex: 1 }}>
      {({ bottomPad }) => (
        <>
          <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 22, fontWeight: "900", color: theme.colors.text }}>
                Noticeboard
              </Text>

              {isAdmin ? (
                <Pressable
                  onPress={() => {
                    resetNewNoticeForm();
                    setShowNew(true);
                  }}
                  style={[
                    theme.button.primary,
                    { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999 },
                  ]}
                >
                  <Text style={theme.button.primaryText}>New notice</Text>
                </Pressable>
              ) : null}
            </View>

            <Text style={{ marginTop: 6, color: theme.colors.muted }}>
              Official announcements and events from the church.
            </Text>
          </View>

          {loading ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator size="large" color={theme.colors.gold} />
              <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Loading…</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(it) => it.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPad + 16 }}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              ListEmptyComponent={
                <Text style={{ color: theme.colors.muted, textAlign: "center", marginTop: 20 }}>
                  No notices yet.
                </Text>
              }
              renderItem={({ item }) => (
                <View
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderWidth: 1,
                    borderColor: theme.colors.divider,
                    borderRadius: 16,
                    padding: 14,
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
                    {item.title || "Notice"}
                  </Text>

                  {item.content ? (
                    <Text style={{ color: theme.colors.text2, marginTop: 6, fontWeight: "600" }}>
                      {item.content}
                    </Text>
                  ) : null}

                  {renderNoticeMedia(item)}

                  <Text style={{ color: theme.colors.muted, marginTop: 10, fontSize: 12 }}>
                    {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
                  </Text>
                </View>
              )}
            />
          )}

          {/* NEW NOTICE MODAL */}
          <Modal visible={showNew} animationType="slide" transparent onRequestClose={() => setShowNew(false)}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}>
              <View
                style={{
                  backgroundColor: theme.colors.surface,
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  borderWidth: 1,
                  borderColor: theme.colors.divider,
                  padding: 16,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
                    New notice
                  </Text>
                  <Pressable onPress={() => !saving && !uploadingMedia && setShowNew(false)} hitSlop={10}>
                    <Text style={{ color: theme.colors.muted, fontWeight: "900", fontSize: 18 }}>✕</Text>
                  </Pressable>
                </View>

                <View style={{ height: 12 }} />

                <Text style={{ color: theme.colors.muted, marginBottom: 6 }}>Title (optional)</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Sunday service time change"
                  placeholderTextColor={theme.input.placeholder}
                  style={theme.input.box}
                />

                <View style={{ height: 12 }} />

                <Text style={{ color: theme.colors.muted, marginBottom: 6 }}>Notice</Text>
                <TextInput
                  value={content}
                  onChangeText={setContent}
                  placeholder="Write the announcement…"
                  placeholderTextColor={theme.input.placeholder}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  style={[theme.input.box, { minHeight: 110 }]}
                />

                {/* Media buttons */}
                <View style={{ height: 12 }} />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pressable
                    onPress={pickImageFromLibrary}
                    disabled={saving || uploadingMedia}
                    style={[theme.button.outline, { flex: 1, borderRadius: 14, paddingVertical: 12 }]}
                  >
                    <Text style={theme.button.outlineText}>Add image</Text>
                  </Pressable>

                  <Pressable
                    onPress={recordVideo}
                    disabled={saving || uploadingMedia}
                    style={[theme.button.outline, { flex: 1, borderRadius: 14, paddingVertical: 12 }]}
                  >
                    <Text style={theme.button.outlineText}>Record video</Text>
                  </Pressable>
                </View>

                {renderNewNoticeMediaPreview()}

                <View style={{ height: 12 }} />

                <Pressable
                  onPress={createNotice}
                  disabled={saving || uploadingMedia}
                  style={[
                    theme.button.primary,
                    { borderRadius: 14, paddingVertical: 12, opacity: saving || uploadingMedia ? 0.7 : 1 },
                  ]}
                >
                  <Text style={theme.button.primaryText}>
                    {uploadingMedia ? "Uploading…" : saving ? "Posting…" : "Post notice"}
                  </Text>
                </Pressable>

                <View style={{ height: 10 }} />
                <View style={{ height: 1, backgroundColor: theme.colors.divider }} />
                <View style={{ height: 10 }} />

                <Pressable
                  onPress={() => !saving && !uploadingMedia && setShowNew(false)}
                  style={[theme.button.outline, { borderRadius: 14, paddingVertical: 12 }]}
                >
                  <Text style={theme.button.outlineText}>Cancel</Text>
                </Pressable>

                <View style={{ height: 10 }} />
              </View>

              <Pressable style={{ flex: 1 }} onPress={() => !saving && !uploadingMedia && setShowNew(false)} />
            </View>
          </Modal>
        </>
      )}
    </Screen>
  );
}
