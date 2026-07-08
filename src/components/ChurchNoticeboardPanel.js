// src/components/ChurchNoticeboardPanel.js
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
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

const BUCKET = "post_media";
const SOFT_MAX_BYTES = 45 * 1024 * 1024;

const noticeColors = {
  cream: "#FFFCF5",
  creamDeep: "rgba(180, 83, 9, 0.10)",
  card: "#FFFFFF",
  border: "rgba(15, 23, 42, 0.08)",
  brown: "#1F2933",
  brownSoft: "#6B7280",
  olive: "#4F633B",
  oliveDark: "#3F512F",
  oliveSoft: "rgba(79, 99, 59, 0.10)",
  danger: "#991B1B",
  dangerSoft: "rgba(153, 27, 27, 0.08)",
  amber: "#B45309",
  amberDark: "#7C2D12",
  amberSoft: "rgba(180, 83, 9, 0.10)",
  amberBorder: "rgba(180, 83, 9, 0.18)",
  white: "#FFFFFF",
};

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

  if (!token) {
    throw new Error("No active session token. Please sign in again.");
  }

  return token;
}

function getStoragePathFromPublicUrl(publicUrl) {
  if (!publicUrl) return null;

  try {
    const url = String(publicUrl);
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const markerIndex = url.indexOf(marker);

    if (markerIndex === -1) return null;

    const pathWithPossibleQuery = url.slice(markerIndex + marker.length);
    const pathOnly = pathWithPossibleQuery.split("?")[0];

    return decodeURIComponent(pathOnly);
  } catch (e) {
    console.log("getStoragePathFromPublicUrl error:", e);
    return null;
  }
}

async function deleteNoticeMediaFromStorage(item) {
  try {
    const paths = [];

    const mediaPath = getStoragePathFromPublicUrl(item?.media_url);
    const thumbnailPath = getStoragePathFromPublicUrl(item?.thumbnail_url);

    if (mediaPath) paths.push(mediaPath);
    if (thumbnailPath) paths.push(thumbnailPath);

    if (paths.length === 0) return;

    const { error } = await supabase.storage.from(BUCKET).remove(paths);

    if (error) {
      console.log("noticeboard storage delete error:", error);
    }
  } catch (e) {
    console.log("deleteNoticeMediaFromStorage exception:", e);
  }
}

function formatNoticeDate(value) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return "";
  }
}

function getNoticeMeta(item) {
  const linkType = String(item?.link_type || "").toLowerCase();
  const hasCourseLink = Boolean(item?.linked_course_id) || linkType === "course";
  const hasEventLink = Boolean(item?.linked_event_id) || linkType === "event";
  const hasGroupLink = Boolean(item?.linked_group_id) || linkType === "group";

  const mediaType = String(item?.media_type || "").toLowerCase();
  const isImage = mediaType.startsWith("image/");
  const isVideo = mediaType.startsWith("video/");

  if (hasCourseLink) {
    return {
      label: "Course update",
      defaultTitle: "Course update",
      icon: "school-outline",
      accent: "#B45309",
      soft: "rgba(180, 83, 9, 0.10)",
      border: "rgba(180, 83, 9, 0.22)",
      strip: "#B45309",
    };
  }

  if (hasEventLink) {
    return {
      label: "Event update",
      defaultTitle: "Event update",
      icon: "calendar-outline",
      accent: "#B45309",
      soft: "rgba(180, 83, 9, 0.10)",
      border: "rgba(180, 83, 9, 0.22)",
      strip: "#B45309",
    };
  }

  if (hasGroupLink) {
    return {
      label: "Group update",
      defaultTitle: "Group update",
      icon: "chatbubbles-outline",
      accent: "#56633D",
      soft: "rgba(86, 99, 61, 0.10)",
      border: "rgba(86, 99, 61, 0.22)",
      strip: "#56633D",
    };
  }

  if (isVideo) {
    return {
      label: "Video notice",
      defaultTitle: "Video notice",
      icon: "play-circle-outline",
      accent: "#56633D",
      soft: "rgba(86, 99, 61, 0.10)",
      border: "rgba(86, 99, 61, 0.22)",
      strip: "#56633D",
    };
  }

  if (isImage) {
    return {
      label: "Photo notice",
      defaultTitle: "Photo notice",
      icon: "image-outline",
      accent: "#56633D",
      soft: "rgba(86, 99, 61, 0.10)",
      border: "rgba(86, 99, 61, 0.22)",
      strip: "#56633D",
    };
  }

  return {
    label: "Church notice",
    defaultTitle: "Notice",
    icon: "notifications-outline",
    accent: "#7A5A3A",
    soft: "rgba(122, 90, 58, 0.10)",
    border: "rgba(122, 90, 58, 0.20)",
    strip: "#D99400",
  };
}

export default function ChurchNoticeboardPanel({
  churchId,
  bottomPad = 0,
  showHeader = false,
  embedded = false,
  isAdminOverride = null,
}) {

    const navigation = useNavigation();
  const [viewerId, setViewerId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pendingMedia, setPendingMedia] = useState(null);

  const [editingNotice, setEditingNotice] = useState(null);

  const [showActions, setShowActions] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);

  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaToView, setMediaToView] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const { data: sessData } = await supabase.auth.getSession();
        const uid = sessData?.session?.user?.id || null;

        setViewerId(uid);

if (typeof isAdminOverride === "boolean") {
  setIsAdmin(isAdminOverride);
} else if (uid && churchId) {
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

        if (churchId) {
          await load();
        }
      } catch (e) {
        console.log("ChurchNoticeboardPanel init error:", e);
      } finally {
        setLoading(false);
      }
    })();
 }, [churchId, isAdminOverride]);

  async function load() {
    if (!churchId) return;

const { data, error } = await supabase
  .from("church_noticeboard_posts")
  .select(
    "id, title, content, media_url, media_type, thumbnail_url, created_at, created_by, link_type, linked_event_id, linked_course_id, linked_group_id, visibility"
  )
  .eq("church_id", churchId)
  .order("created_at", { ascending: false });

    if (error) {
      console.log("noticeboard load error:", error);
      Alert.alert("Error", "Could not load noticeboard right now.");
      return;
    }

    setItems(data || []);
  }

  function resetComposer() {
    setTitle("");
    setContent("");
    setPendingMedia(null);
    setEditingNotice(null);
  }

  function openNewNotice() {
    if (!isAdmin) return;

    resetComposer();
    setShowNew(true);
  }

  function openEditNotice(item) {
    if (!isAdmin || !item) return;

    setSelectedNotice(null);
    setShowActions(false);

    setEditingNotice(item);
    setTitle(item.title || "");
    setContent(item.content || "");
    setPendingMedia(null);
    setShowNew(true);
  }

  function openNoticeActions(item) {
    if (!isAdmin || !item) return;

    setSelectedNotice(item);
    setShowActions(true);
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
      throw new Error(
        "Supabase client is missing supabaseUrl/supabaseKey. Check lib/supabase."
      );
    }

    const url = `${supabaseUrl}/storage/v1/object/${BUCKET}/${encodeStoragePath(
      objectPath
    )}`;

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

    let res = await attempt("POST");

    if (res.status >= 400) {
      res = await attempt("PUT");
    }

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

    if (!data?.publicUrl) {
      throw new Error("No publicUrl returned from getPublicUrl().");
    }

    return data.publicUrl;
  }

  async function uploadNoticeMedia(media) {
    if (!media?.uri) {
      return { mediaUrl: null, mediaType: null, thumbnailUrl: null };
    }

    const isVideo = media.kind === "video";

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
      // Ignore size check failure.
    }

    let thumbnailUrl = null;

    if (isVideo) {
      try {
        const thumbRes = await VideoThumbnails.getThumbnailAsync(media.uri, {
          time: 1000,
        });

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

    const fallbackExt = isVideo ? "mp4" : "jpg";
    const ext = getExtFromUri(media.uri, fallbackExt);
    const fileName = media.fileName || `notice-${Date.now()}.${ext}`;
    const contentType = media.mimeType || (isVideo ? "video/mp4" : "image/jpeg");

    const objectPath = `noticeboard/${churchId}/${
      isVideo ? "videos" : "images"
    }/${Date.now()}-${fileName}`;

    const mediaUrl = await uploadViaStorageBinary({
      localUri: media.uri,
      objectPath,
      contentType,
    });

    return { mediaUrl, mediaType: contentType, thumbnailUrl };
  }

  async function createOrUpdateNotice() {
    if (!churchId) return;

    if (!viewerId) {
      Alert.alert("Not signed in", "Please sign in again.");
      return;
    }

    const body = content.trim();

    if (!body && !pendingMedia && !editingNotice?.media_url) {
      Alert.alert("Missing content", "Write a notice or attach media.");
      return;
    }

    try {
      setSaving(true);

      let media_url = editingNotice?.media_url || null;
      let media_type = editingNotice?.media_type || null;
      let thumbnail_url = editingNotice?.thumbnail_url || null;

      if (pendingMedia) {
        try {
          const uploaded = await uploadNoticeMedia(pendingMedia);

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

      if (editingNotice?.id) {
        const updates = {
          title: title.trim() || null,
          content: body || "",
          media_url,
          media_type,
          thumbnail_url,
        };

const { error } = await supabase
  .from("church_noticeboard_posts")
  .update(updates)
  .eq("id", editingNotice.id)
  .eq("church_id", churchId);

if (error) throw error;

await load();

setShowNew(false);
resetComposer();
return;
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

const { error } = await supabase
  .from("church_noticeboard_posts")
  .insert(payload);

if (error) throw error;

await load();

setShowNew(false);
resetComposer();
    } catch (e) {
      console.log("noticeboard save error:", e);
      Alert.alert("Could not save", e?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  }

function confirmDeleteNotice(item) {
  if (!isAdmin || !item?.id) return;

  setShowActions(false);

  Alert.alert(
    "Delete notice?",
    "This will permanently remove this notice and any attached media from the church noticeboard.",
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { data, error } = await supabase
              .from("church_noticeboard_posts")
              .delete()
              .eq("id", item.id)
              .eq("church_id", churchId)
              .select("id");

            if (error) throw error;

            if (!data || data.length === 0) {
              console.log("noticeboard delete affected 0 rows:", {
                noticeId: item.id,
                churchId,
              });

              Alert.alert(
                "Could not delete",
                "Supabase did not delete this notice. This usually means the DELETE policy on church_noticeboard_posts is missing or not matching this admin user."
              );

              await load();
              return;
            }

            await deleteNoticeMediaFromStorage(item);

            setItems((prev) =>
              (prev || []).filter((notice) => notice.id !== item.id)
            );

            setSelectedNotice(null);
          } catch (e) {
            console.log("noticeboard delete error:", e);

            Alert.alert(
              "Could not delete",
              e?.message || "Please try again."
            );

            await load();
          }
        },
      },
    ]
  );
}

  function removeExistingMedia() {
    if (editingNotice?.id) {
      setEditingNotice((prev) => ({
        ...(prev || {}),
        media_url: null,
        media_type: null,
        thumbnail_url: null,
      }));
    }

    setPendingMedia(null);
  }

  function openMedia(item) {
    if (!item?.media_url || !item?.media_type) return;

    setMediaToView({ url: item.media_url, type: item.media_type });
    setShowMediaModal(true);
  }

    function getLinkedNoticeAction(item) {
    if (!item) return null;

    if (item.linked_course_id && item.linked_event_id) {
      return {
        label: "View Course Event",
        icon: "calendar-outline",
        type: "event",
      };
    }

    if (item.linked_course_id && item.linked_group_id) {
      return {
        label: "Open Course Group",
        icon: "chatbubbles-outline",
        type: "group",
      };
    }

    if (item.linked_event_id) {
      return {
        label: "View Event",
        icon: "calendar-outline",
        type: "event",
      };
    }

    if (item.linked_group_id) {
      return {
        label: "Open Group",
        icon: "chatbubbles-outline",
        type: "group",
      };
    }

    return null;
  }

  function openLinkedNotice(item) {
    const action = getLinkedNoticeAction(item);

    if (!action) return;

    if (action.type === "event" && item.linked_event_id) {
      navigation.navigate("EventDetails", {
        eventId: item.linked_event_id,
        churchId,
      });

      return;
    }

    if (action.type === "group" && item.linked_group_id) {
      navigation.navigate("ChurchGroupDetail", {
        churchId,
        churchGroupId: item.linked_group_id,
      });
    }
  }

  const header = showHeader ? (
    <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: "900",
            color: noticeColors.brown,
          }}
        >
          Noticeboard
        </Text>

        {isAdmin ? (
          <Pressable
            onPress={openNewNotice}
            style={({ pressed }) => ({
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 999,
              backgroundColor: pressed ? noticeColors.oliveDark : noticeColors.olive,
            })}
          >
            <Text
              style={{
                color: noticeColors.white,
                fontWeight: "900",
              }}
            >
              New notice
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Text
        style={{
          marginTop: 6,
          color: noticeColors.brownSoft,
          fontWeight: "700",
          lineHeight: 18,
        }}
      >
        Official announcements and events from the church.
      </Text>
    </View>
  ) : (
    <View style={{ marginTop: embedded ? 6 : 0 }}>
      {isAdmin ? (
        <Pressable
          onPress={openNewNotice}
          style={({ pressed }) => ({
            borderRadius: 14,
            paddingVertical: 12,
            marginBottom: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? noticeColors.oliveDark : noticeColors.olive,
          })}
        >
          <Text
            style={{
              color: noticeColors.white,
              fontWeight: "900",
            }}
          >
            New notice
          </Text>
        </Pressable>
      ) : null}

      <Text
        style={{
          color: noticeColors.brownSoft,
          marginBottom: 10,
          fontWeight: "700",
          lineHeight: 18,
        }}
      >
        Official announcements and events from the church.
      </Text>
    </View>
  );

  return (
    <>
      {header}

      {loading ? (
        <View
          style={{
            justifyContent: "center",
            alignItems: "center",
            paddingVertical: 18,
          }}
        >
          <ActivityIndicator size="small" color={noticeColors.olive} />

          <Text
            style={{
              color: noticeColors.brownSoft,
              marginTop: 8,
              fontWeight: "800",
            }}
          >
            Loading…
          </Text>
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
            <Text
              style={{
                color: noticeColors.brownSoft,
                textAlign: "center",
                marginTop: 20,
                fontWeight: "700",
              }}
            >
              No notices yet.
            </Text>
          }
          renderItem={({ item }) => {
            const hasMedia = Boolean(item.media_url);
            const isImage = item.media_type?.startsWith("image/");
            const isVideo = item.media_type?.startsWith("video/");
            const meta = getNoticeMeta(item);
            const titleText = item.title || meta.defaultTitle;

            return (
              <View
                style={{
                  backgroundColor: noticeColors.card,
                  borderWidth: 1,
                  borderColor: meta.border || noticeColors.border,
                  borderRadius: 22,
                  padding: 14,
                  overflow: "hidden",
                  shadowColor: meta.accent || noticeColors.brown,
                  shadowOpacity: 0.10,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 3,
                }}
              >
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 5,
                    backgroundColor: meta.strip,
                  }}
                />

                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    top: -45,
                    right: -35,
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    backgroundColor: meta.soft,
                  }}
                />

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <View style={{ flex: 1, paddingLeft: 3 }}>
                    <View
                      style={{
                        alignSelf: "flex-start",
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 9,
                        paddingVertical: 5,
                        borderRadius: 999,
                        backgroundColor: meta.soft,
                        borderWidth: 1,
                        borderColor: meta.border,
                        marginBottom: 9,
                      }}
                    >
                      <Ionicons name={meta.icon} size={14} color={meta.accent} />

                      <Text
                        style={{
                          color: meta.accent,
                          fontSize: 11,
                          fontWeight: "900",
                          letterSpacing: 0.3,
                          textTransform: "uppercase",
                          marginLeft: 6,
                        }}
                      >
                        {meta.label}
                      </Text>
                    </View>

                    <Text
                      style={{
                        color: noticeColors.brown,
                        fontWeight: "900",
                        fontSize: 18,
                        lineHeight: 23,
                      }}
                    >
                      {titleText}
                    </Text>
                  </View>

                  {isAdmin ? (
                    <Pressable
                      onPress={() => openNoticeActions(item)}
                      hitSlop={8}
                      style={({ pressed }) => ({
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: pressed
                          ? noticeColors.creamDeep
                          : noticeColors.cream,
                        borderWidth: 1,
                        borderColor: noticeColors.border,
                      })}
                    >
                      <Ionicons
                        name="ellipsis-horizontal"
                        size={18}
                        color={noticeColors.brownSoft}
                      />
                    </Pressable>
                  ) : null}
                </View>

                {item.content ? (
                  <Text
                    style={{
                      color: noticeColors.brownSoft,
                      marginTop: 8,
                      fontWeight: "700",
                      lineHeight: 20,
                      fontSize: 14,
                    }}
                  >
                    {item.content}
                  </Text>
                ) : null}

                {hasMedia && isImage ? (
                  <Pressable
                    onPress={() => openMedia(item)}
                    style={({ pressed }) => ({
                      marginTop: 12,
                      borderRadius: 18,
                      overflow: "hidden",
                      borderWidth: 1,
                      borderColor: meta.border || noticeColors.border,
                      backgroundColor: noticeColors.cream,
                      opacity: pressed ? 0.94 : 1,
                    })}
                  >
                    <Image
                      source={{ uri: item.media_url }}
                      style={{
                        width: "100%",
                        height: 210,
                        backgroundColor: noticeColors.cream,
                      }}
                      resizeMode="cover"
                    />

                    <View
                      style={{
                        position: "absolute",
                        left: 10,
                        bottom: 10,
                        paddingHorizontal: 9,
                        paddingVertical: 5,
                        borderRadius: 999,
                        backgroundColor: "rgba(0,0,0,0.45)",
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons name="image-outline" size={14} color="#fff" />

                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: "900",
                          marginLeft: 5,
                        }}
                      >
                        Tap to view
                      </Text>
                    </View>
                  </Pressable>
                ) : null}

                {hasMedia && isVideo ? (
                  <Pressable
                    onPress={() => openMedia(item)}
                    style={({ pressed }) => ({
                      marginTop: 12,
                      borderRadius: 18,
                      overflow: "hidden",
                      borderWidth: 1,
                      borderColor: meta.border || noticeColors.border,
                      backgroundColor: noticeColors.cream,
                      opacity: pressed ? 0.94 : 1,
                    })}
                  >
                    {item.thumbnail_url ? (
                      <View style={{ width: "100%", height: 210 }}>
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
                            backgroundColor: "rgba(0,0,0,0.20)",
                          }}
                        >
                          <View
                            style={{
                              width: 70,
                              height: 70,
                              borderRadius: 35,
                              backgroundColor: "rgba(0,0,0,0.42)",
                              alignItems: "center",
                              justifyContent: "center",
                              borderWidth: 1,
                              borderColor: "rgba(255,255,255,0.45)",
                            }}
                          >
                            <Ionicons name="play" size={34} color="#fff" />
                          </View>
                        </View>

                        <View
                          style={{
                            position: "absolute",
                            left: 10,
                            bottom: 10,
                            paddingHorizontal: 9,
                            paddingVertical: 5,
                            borderRadius: 999,
                            backgroundColor: "rgba(0,0,0,0.45)",
                            flexDirection: "row",
                            alignItems: "center",
                          }}
                        >
                          <Ionicons name="videocam-outline" size={14} color="#fff" />

                          <Text
                            style={{
                              color: "#fff",
                              fontSize: 11,
                              fontWeight: "900",
                              marginLeft: 5,
                            }}
                          >
                            Tap to play
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View
                        style={{
                          paddingVertical: 16,
                          paddingHorizontal: 13,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <View
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: 21,
                              backgroundColor: meta.soft,
                              borderWidth: 1,
                              borderColor: meta.border,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Ionicons
                              name="play-circle-outline"
                              size={24}
                              color={meta.accent}
                            />
                          </View>

                          <Text
                            style={{
                              marginLeft: 10,
                              color: noticeColors.brown,
                              fontWeight: "900",
                            }}
                          >
                            Tap to play video
                          </Text>
                        </View>

                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={noticeColors.brownSoft}
                        />
                      </View>
                    )}
                  </Pressable>
                ) : null}

                {getLinkedNoticeAction(item) ? (
                  <Pressable
                    onPress={() => openLinkedNotice(item)}
                    style={({ pressed }) => ({
                      marginTop: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderRadius: 16,
                      backgroundColor: pressed ? meta.border : meta.soft,
                      borderWidth: 1,
                      borderColor: meta.border,
                      flexDirection: "row",
                      alignItems: "center",
                      opacity: pressed ? 0.86 : 1,
                    })}
                  >
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        backgroundColor: noticeColors.card,
                        borderWidth: 1,
                        borderColor: meta.border,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name={getLinkedNoticeAction(item).icon}
                        size={16}
                        color={meta.accent}
                      />
                    </View>

                    <Text
                      style={{
                        color: meta.accent,
                        fontSize: 13,
                        fontWeight: "900",
                        marginLeft: 9,
                        flex: 1,
                      }}
                    >
                      {getLinkedNoticeAction(item).label}
                    </Text>

                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color={meta.accent}
                    />
                  </Pressable>
                ) : null}

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 11,
                  }}
                >
                  <Ionicons
                    name="time-outline"
                    size={13}
                    color={noticeColors.brownSoft}
                  />

                  <Text
                    style={{
                      color: noticeColors.brownSoft,
                      marginLeft: 5,
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                  >
                    {formatNoticeDate(item.created_at)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      <Modal
        visible={showActions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActions(false)}
      >
        <Pressable
          onPress={() => setShowActions(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(46, 34, 20, 0.46)",
            justifyContent: "flex-end",
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: noticeColors.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderWidth: 1,
              borderColor: noticeColors.border,
              padding: 16,
            }}
          >
            <Text
              style={{
                color: noticeColors.brown,
                fontSize: 18,
                fontWeight: "900",
                marginBottom: 12,
              }}
            >
              Notice options
            </Text>

            <Pressable
              onPress={() => openEditNotice(selectedNotice)}
              style={({ pressed }) => ({
                borderRadius: 16,
                paddingVertical: 13,
                paddingHorizontal: 14,
                backgroundColor: pressed ? noticeColors.oliveSoft : noticeColors.cream,
                borderWidth: 1,
                borderColor: noticeColors.border,
                marginBottom: 10,
                flexDirection: "row",
                alignItems: "center",
              })}
            >
              <Ionicons name="create-outline" size={19} color={noticeColors.olive} />

              <Text
                style={{
                  color: noticeColors.brown,
                  fontWeight: "900",
                  marginLeft: 10,
                  fontSize: 14,
                }}
              >
                Edit notice
              </Text>
            </Pressable>

            <Pressable
              onPress={() => confirmDeleteNotice(selectedNotice)}
              style={({ pressed }) => ({
                borderRadius: 16,
                paddingVertical: 13,
                paddingHorizontal: 14,
                backgroundColor: pressed ? noticeColors.dangerSoft : noticeColors.card,
                borderWidth: 1,
                borderColor: "rgba(153, 27, 27, 0.22)",
                marginBottom: 10,
                flexDirection: "row",
                alignItems: "center",
              })}
            >
              <Ionicons name="trash-outline" size={19} color={noticeColors.danger} />

              <Text
                style={{
                  color: noticeColors.danger,
                  fontWeight: "900",
                  marginLeft: 10,
                  fontSize: 14,
                }}
              >
                Delete notice
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setShowActions(false)}
              style={({ pressed }) => ({
                borderRadius: 16,
                paddingVertical: 13,
                paddingHorizontal: 14,
                backgroundColor: pressed ? noticeColors.creamDeep : noticeColors.cream,
                borderWidth: 1,
                borderColor: noticeColors.border,
                alignItems: "center",
              })}
            >
              <Text
                style={{
                  color: noticeColors.brownSoft,
                  fontWeight: "900",
                  fontSize: 14,
                }}
              >
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showNew}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!saving) {
            setShowNew(false);
            resetComposer();
          }
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(46, 34, 20, 0.46)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: noticeColors.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderWidth: 1,
              borderColor: noticeColors.border,
              padding: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: noticeColors.brown,
                  fontWeight: "900",
                  fontSize: 18,
                }}
              >
                {editingNotice ? "Edit notice" : "New notice"}
              </Text>

              <Pressable
                onPress={() => {
                  if (!saving) {
                    setShowNew(false);
                    resetComposer();
                  }
                }}
                hitSlop={10}
              >
                <Text
                  style={{
                    color: noticeColors.brownSoft,
                    fontWeight: "900",
                    fontSize: 18,
                  }}
                >
                  ✕
                </Text>
              </Pressable>
            </View>

            <View style={{ height: 12 }} />

            <Text
              style={{
                color: noticeColors.brownSoft,
                marginBottom: 6,
                fontWeight: "800",
              }}
            >
              Title optional
            </Text>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Sunday service time change"
              placeholderTextColor={noticeColors.brownSoft}
              style={{
                minHeight: 48,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: noticeColors.border,
                backgroundColor: noticeColors.cream,
                paddingHorizontal: 13,
                color: noticeColors.brown,
                fontSize: 14,
                fontWeight: "700",
              }}
            />

            <View style={{ height: 12 }} />

            <Text
              style={{
                color: noticeColors.brownSoft,
                marginBottom: 6,
                fontWeight: "800",
              }}
            >
              Notice
            </Text>

            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Write the announcement…"
              placeholderTextColor={noticeColors.brownSoft}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              style={{
                minHeight: 120,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: noticeColors.border,
                backgroundColor: noticeColors.cream,
                paddingHorizontal: 13,
                paddingVertical: 12,
                color: noticeColors.brown,
                fontSize: 14,
                fontWeight: "700",
                lineHeight: 20,
              }}
            />

            <View style={{ height: 12 }} />

            <Pressable
              onPress={openAttachMenu}
              disabled={saving}
              style={({ pressed }) => ({
                borderRadius: 14,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: noticeColors.olive,
                backgroundColor: pressed ? noticeColors.oliveSoft : noticeColors.card,
                alignItems: "center",
              })}
            >
              <Text
                style={{
                  color: noticeColors.oliveDark,
                  fontWeight: "900",
                }}
              >
                {pendingMedia
                  ? pendingMedia.kind === "image"
                    ? "Change attached image"
                    : "Change attached video"
                  : editingNotice?.media_url
                  ? "Change attached media"
                  : "Attach image or video"}
              </Text>
            </Pressable>

            {pendingMedia?.uri || editingNotice?.media_url ? (
              <View
                style={{
                  marginTop: 12,
                  borderWidth: 1,
                  borderColor: noticeColors.border,
                  borderRadius: 14,
                  padding: 10,
                  backgroundColor: noticeColors.cream,
                }}
              >
                {pendingMedia?.kind === "image" ? (
                  <Image
                    source={{ uri: pendingMedia.uri }}
                    style={{
                      width: "100%",
                      height: 170,
                      borderRadius: 12,
                    }}
                    resizeMode="cover"
                  />
                ) : pendingMedia?.kind === "video" ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Ionicons
                        name="videocam-outline"
                        size={20}
                        color={noticeColors.olive}
                      />

                      <Text
                        style={{
                          marginLeft: 10,
                          color: noticeColors.brown,
                          fontWeight: "900",
                        }}
                      >
                        Video attached
                      </Text>
                    </View>

                    <Pressable onPress={removeExistingMedia} hitSlop={10}>
                      <Text
                        style={{
                          color: noticeColors.brownSoft,
                          fontWeight: "900",
                        }}
                      >
                        Remove
                      </Text>
                    </Pressable>
                  </View>
                ) : editingNotice?.media_url ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text
                        style={{
                          color: noticeColors.brown,
                          fontWeight: "900",
                        }}
                      >
                        Existing media attached
                      </Text>

                      <Text
                        style={{
                          color: noticeColors.brownSoft,
                          fontWeight: "700",
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        You can keep it, replace it, or remove it.
                      </Text>
                    </View>

                    <Pressable onPress={removeExistingMedia} hitSlop={10}>
                      <Text
                        style={{
                          color: noticeColors.danger,
                          fontWeight: "900",
                        }}
                      >
                        Remove
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={{ height: 12 }} />

            <Pressable
              onPress={createOrUpdateNotice}
              disabled={saving}
              style={({ pressed }) => ({
                borderRadius: 14,
                paddingVertical: 13,
                backgroundColor: saving
                  ? noticeColors.border
                  : pressed
                  ? noticeColors.oliveDark
                  : noticeColors.olive,
                alignItems: "center",
                opacity: saving ? 0.75 : 1,
              })}
            >
              <Text
                style={{
                  color: saving ? noticeColors.brownSoft : noticeColors.white,
                  fontWeight: "900",
                }}
              >
                {saving
                  ? editingNotice
                    ? "Saving…"
                    : "Posting…"
                  : editingNotice
                  ? "Save changes"
                  : "Post notice"}
              </Text>
            </Pressable>

            <View style={{ height: 10 }} />

            <Pressable
              onPress={() => {
                if (!saving) {
                  setShowNew(false);
                  resetComposer();
                }
              }}
              style={({ pressed }) => ({
                borderRadius: 14,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: noticeColors.border,
                backgroundColor: pressed ? noticeColors.creamDeep : noticeColors.cream,
                alignItems: "center",
              })}
            >
              <Text
                style={{
                  color: noticeColors.brownSoft,
                  fontWeight: "900",
                }}
              >
                Cancel
              </Text>
            </Pressable>

            <View style={{ height: 10 }} />
          </View>

          <Pressable
            style={{ flex: 1 }}
            onPress={() => {
              if (!saving) {
                setShowNew(false);
                resetComposer();
              }
            }}
          />
        </View>
      </Modal>

      <Modal
        visible={showMediaModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMediaModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.85)",
            justifyContent: "center",
          }}
        >
          <View style={{ paddingHorizontal: 14 }}>
            <Pressable
              onPress={() => setShowMediaModal(false)}
              style={{ alignSelf: "flex-end", padding: 10 }}
              hitSlop={10}
            >
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "900",
                  fontSize: 18,
                }}
              >
                ✕
              </Text>
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