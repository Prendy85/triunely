// src/components/ChurchNoticeboardPanel.js
import { Ionicons } from "@expo/vector-icons";
import { Video } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { FileSystemUploadType } from "expo-file-system/legacy";
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
import { supabase } from "../lib/supabase";
import { theme } from "../theme/theme";

/**
 * Use an existing PUBLIC bucket.
 * From your screenshot: weekly-videos, stories, avatars, post_media
 */
const BUCKET = "post_media";

// Soft safety limit (Storage shows 50MB). Leave a little headroom.
const SOFT_MAX_BYTES = 45 * 1024 * 1024;

function encodeStoragePath(p) {
  return String(p)
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

function getExtFromUri(uri, fallback) {
  try {
    const clean = String(uri).split("?")[0];
    const ext = clean.split(".").pop()?.toLowerCase();
    if (ext && ext.length <= 6) return ext;
    return fallback;
  } catch {
    return fallback;
  }
}

async function getAccessTokenOrThrow() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("No active session token. Please sign in again.");
  return token;
}

export default function ChurchNoticeboardPanel({
  churchId,
  bottomPad = 0,
  showHeader = false,
  embedded = false,
}) {
  const [viewerId, setViewerId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [pendingMedia, setPendingMedia] = useState(null); // { uri, kind, fileName?, mimeType? }

  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaToView, setMediaToView] = useState(null); // { url, type }

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
        console.log("ChurchNoticeboardPanel init error:", e);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function pickImage() {
    if (!isAdmin) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "We need access to your photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });

    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    setPendingMedia({
      uri: asset.uri,
      kind: "image",
      fileName: asset.fileName,
      mimeType: asset.mimeType,
    });
  }

  async function pickVideo() {
    if (!isAdmin) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "We need access to your videos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      // Medium is usually plenty and keeps file sizes reasonable for mobile upload
      quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });

    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    setPendingMedia({
      uri: asset.uri,
      kind: "video",
      fileName: asset.fileName,
      mimeType: asset.mimeType,
    });
  }

  async function recordVideo() {
    if (!isAdmin) return;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "We need camera access to record video.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      // allow longer capture
      videoMaxDuration: 120,
    });

    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    setPendingMedia({
      uri: asset.uri,
      kind: "video",
      fileName: asset.fileName,
      mimeType: asset.mimeType,
    });
  }

  function openAttachMenu() {
    Alert.alert("Attach media", "Choose what you want to attach:", [
      { text: "Add image", onPress: pickImage },
      { text: "Add video", onPress: pickVideo },
      { text: "Record video", onPress: recordVideo },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function uploadViaStorageBinary({ localUri, objectPath, contentType }) {
    const token = await getAccessTokenOrThrow();

    const supabaseUrl = supabase?.supabaseUrl;
    const supabaseKey = supabase?.supabaseKey;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase client is missing supabaseUrl/supabaseKey (check lib/supabase).");
    }

    const url = `${supabaseUrl}/storage/v1/object/${BUCKET}/${encodeStoragePath(objectPath)}`;

    const headers = {
      "Content-Type": contentType,
      Authorization: `Bearer ${token}`,
      apikey: supabaseKey,
      "x-upsert": "true",
    };

    const attempt = async (httpMethod) => {
      return await FileSystem.uploadAsync(url, localUri, {
        httpMethod,
        headers,
        uploadType: FileSystemUploadType?.BINARY_CONTENT ?? "binaryContent",
      });
    };

    // Some projects accept POST, some require PUT. Try POST then fallback to PUT.
    let res = await attempt("POST");
    if (res.status >= 400) res = await attempt("PUT");

    if (res.status < 200 || res.status >= 300) {
      console.log("Storage upload failed:", {
        status: res.status,
        body: res.body,
        url,
        objectPath,
        contentType,
      });
      throw new Error(`Upload failed (${res.status}).`);
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
    if (!data?.publicUrl) throw new Error("No publicUrl returned from getPublicUrl()");
    return data.publicUrl;
  }

  async function uploadNoticeMedia(media) {
    if (!media?.uri) return { mediaUrl: null, mediaType: null, thumbnailUrl: null };
    const isVideo = media.kind === "video";

    // Size check (optional but keeps UX stable)
    try {
      const info = await FileSystem.getInfoAsync(media.uri, { size: true });
      const sizeBytes = info?.size ?? 0;

      if (sizeBytes > SOFT_MAX_BYTES) {
        Alert.alert(
          "File too large",
          "That file is quite large for a mobile upload. Try Medium quality or a slightly shorter clip."
        );
        return { mediaUrl: null, mediaType: null, thumbnailUrl: null };
      }
    } catch {
      // ignore
    }

    // 1) Thumbnail for video (best-effort)
    let thumbnailUrl = null;
    if (isVideo) {
      try {
        const thumbRes = await VideoThumbnails.getThumbnailAsync(media.uri, { time: 1000 });
        if (thumbRes?.uri) {
          const thumbPath = `noticeboard/${churchId}/thumbs/notice-thumb-${Date.now()}.jpg`;
          thumbnailUrl = await uploadViaStorageBinary({
            localUri: thumbRes.uri,
            objectPath: thumbPath,
            contentType: "image/jpeg",
          });
        }
      } catch (e) {
        console.log("NoticeboardPanel thumbnail generation/upload failed:", e);
      }
    }

    // 2) Upload media (binary)
    const fallbackExt = isVideo ? "mp4" : "jpg";
    const ext = getExtFromUri(media.uri, fallbackExt);
    const fileName = media.fileName || `notice-${Date.now()}.${ext}`;
    const contentType = media.mimeType || (isVideo ? "video/mp4" : "image/jpeg");

    const objectPath = `noticeboard/${churchId}/${isVideo ? "videos" : "images"}/${Date.now()}-${fileName}`;

    const mediaUrl = await uploadViaStorageBinary({
      localUri: media.uri,
      objectPath,
      contentType,
    });

    return { mediaUrl, mediaType: contentType, thumbnailUrl };
  }

  async function createNotice() {
    if (!churchId) return;

    if (!viewerId) {
      Alert.alert("Not signed in", "Please sign in again.");
      return;
    }

    const body = content.trim();
    if (!body && !pendingMedia) {
      Alert.alert("Missing content", "Write a notice or attach media.");
      return;
    }

    try {
      setSaving(true);

      let media_url = null;
      let media_type = null;
      let thumbnail_url = null;

      if (pendingMedia) {
        try {
          const uploaded = await uploadNoticeMedia(pendingMedia);

          // If uploadNoticeMedia refused the file, and there's no text, stop.
          if (!uploaded?.mediaUrl && !body) return;

          media_url = uploaded?.mediaUrl ?? null;
          media_type = uploaded?.mediaType ?? null;
          thumbnail_url = uploaded?.thumbnailUrl ?? null;
        } catch (e) {
          console.log("noticeboard media upload error:", e);
          Alert.alert("Upload failed", "We couldn’t upload that media right now. Try again.");
          if (!body) return;
        }
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
      setTitle("");
      setContent("");
      setPendingMedia(null);
    } catch (e) {
      console.log("noticeboard create error:", e);
      Alert.alert("Could not post", e?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function openMedia(item) {
    if (!item?.media_url || !item?.media_type) return;
    setMediaToView({ url: item.media_url, type: item.media_type });
    setShowMediaModal(true);
  }

  const header = showHeader ? (
    <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 22, fontWeight: "900", color: theme.colors.text }}>Noticeboard</Text>

        {isAdmin ? (
          <Pressable
            onPress={() => {
              setShowNew(true);
              setPendingMedia(null);
            }}
            style={[theme.button.primary, { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999 }]}
          >
            <Text style={theme.button.primaryText}>New notice</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={{ marginTop: 6, color: theme.colors.muted }}>
        Official announcements and events from the church.
      </Text>
    </View>
  ) : (
    <View style={{ marginTop: embedded ? 6 : 0 }}>
      {isAdmin ? (
        <Pressable
          onPress={() => {
            setShowNew(true);
            setPendingMedia(null);
          }}
          style={[theme.button.primary, { borderRadius: 14, paddingVertical: 12, marginBottom: 12 }]}
        >
          <Text style={theme.button.primaryText}>New notice</Text>
        </Pressable>
      ) : null}

      <Text style={{ color: theme.colors.muted, marginBottom: 10 }}>
        Official announcements and events from the church.
      </Text>
    </View>
  );

  return (
    <>
      {header}

      {loading ? (
        <View style={{ justifyContent: "center", alignItems: "center", paddingVertical: 18 }}>
          <ActivityIndicator size="small" color={theme.colors.gold} />
          <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          scrollEnabled={false}
          contentContainerStyle={{
            paddingHorizontal: showHeader ? 16 : 0,
            paddingBottom: bottomPad + 8,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <Text style={{ color: theme.colors.muted, textAlign: "center", marginTop: 20 }}>
              No notices yet.
            </Text>
          }
          renderItem={({ item }) => {
            const hasMedia = Boolean(item.media_url);
            const isImage = item.media_type?.startsWith("image/");
            const isVideo = item.media_type?.startsWith("video/");

            return (
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

                {hasMedia && isImage ? (
                  <Image
                    source={{ uri: item.media_url }}
                    style={{
                      width: "100%",
                      height: 190,
                      borderRadius: 14,
                      marginTop: 10,
                      backgroundColor: theme.colors.surfaceAlt,
                    }}
                    resizeMode="cover"
                  />
                ) : null}

                {hasMedia && isVideo ? (
                  <Pressable
                    onPress={() => openMedia(item)}
                    style={{
                      marginTop: 10,
                      borderRadius: 14,
                      overflow: "hidden",
                      borderWidth: 1,
                      borderColor: theme.colors.divider,
                      backgroundColor: theme.colors.surfaceAlt,
                    }}
                  >
                    {item.thumbnail_url ? (
                      <View style={{ width: "100%", height: 190 }}>
                        <Image
                          source={{ uri: item.thumbnail_url }}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="cover"
                        />
                        <View
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "rgba(0,0,0,0.15)",
                          }}
                        >
                          <Ionicons name="play-circle" size={54} color="#fff" />
                        </View>
                      </View>
                    ) : (
                      <View
                        style={{
                          paddingVertical: 14,
                          paddingHorizontal: 12,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <Ionicons name="play-circle-outline" size={22} color={theme.colors.text2} />
                          <Text style={{ marginLeft: 10, color: theme.colors.text, fontWeight: "900" }}>
                            Tap to play video
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
                      </View>
                    )}
                  </Pressable>
                ) : null}

                <Text style={{ color: theme.colors.muted, marginTop: 10, fontSize: 12 }}>
                  {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
                </Text>
              </View>
            );
          }}
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
              <Pressable onPress={() => !saving && setShowNew(false)} hitSlop={10}>
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
              style={[theme.input.box, { minHeight: 120 }]}
            />

            <View style={{ height: 12 }} />

            <Pressable
              onPress={openAttachMenu}
              disabled={saving}
              style={[theme.button.outline, { borderRadius: 14, paddingVertical: 12 }]}
            >
              <Text style={theme.button.outlineText}>
                {pendingMedia
                  ? pendingMedia.kind === "image"
                    ? "Change attached image"
                    : "Change attached video"
                  : "Attach image or video"}
              </Text>
            </Pressable>

            {pendingMedia?.uri ? (
              <View
                style={{
                  marginTop: 12,
                  borderWidth: 1,
                  borderColor: theme.colors.divider,
                  borderRadius: 14,
                  padding: 10,
                  backgroundColor: theme.colors.surfaceAlt,
                }}
              >
                {pendingMedia.kind === "image" ? (
                  <Image
                    source={{ uri: pendingMedia.uri }}
                    style={{ width: "100%", height: 170, borderRadius: 12 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Ionicons name="videocam-outline" size={20} color={theme.colors.text2} />
                      <Text style={{ marginLeft: 10, color: theme.colors.text, fontWeight: "900" }}>
                        Video attached
                      </Text>
                    </View>
                    <Pressable onPress={() => setPendingMedia(null)} hitSlop={10}>
                      <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>Remove</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ) : null}

            <View style={{ height: 12 }} />

            <Pressable
              onPress={createNotice}
              disabled={saving}
              style={[
                theme.button.primary,
                { borderRadius: 14, paddingVertical: 12, opacity: saving ? 0.7 : 1 },
              ]}
            >
              <Text style={theme.button.primaryText}>{saving ? "Posting…" : "Post notice"}</Text>
            </Pressable>

            <View style={{ height: 10 }} />
            <View style={{ height: 1, backgroundColor: theme.colors.divider }} />
            <View style={{ height: 10 }} />

            <Pressable
              onPress={() => !saving && setShowNew(false)}
              style={[theme.button.outline, { borderRadius: 14, paddingVertical: 12 }]}
            >
              <Text style={theme.button.outlineText}>Cancel</Text>
            </Pressable>

            <View style={{ height: 10 }} />
          </View>

          <Pressable style={{ flex: 1 }} onPress={() => !saving && setShowNew(false)} />
        </View>
      </Modal>

      {/* VIDEO PLAYER MODAL */}
      <Modal
        visible={showMediaModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMediaModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center" }}>
          <View style={{ paddingHorizontal: 14 }}>
            <Pressable
              onPress={() => setShowMediaModal(false)}
              style={{ alignSelf: "flex-end", padding: 10 }}
              hitSlop={10}
            >
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 18 }}>✕</Text>
            </Pressable>

            <View
              style={{
                backgroundColor: "#000",
                borderRadius: 16,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
              }}
            >
              {mediaToView?.url ? (
                <Video
                  source={{ uri: mediaToView.url }}
                  style={{ width: "100%", height: 320 }}
                  useNativeControls
                  resizeMode="contain"
                  shouldPlay
                />
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
