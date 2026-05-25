// src/screens/ChurchNoticeboard.js
import { Ionicons } from "@expo/vector-icons";
import { Video } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as LegacyFileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useEffect, useMemo, useState } from "react";
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

const HEAVENLY_GOLD = "#D99400";
const DEEP_OLIVE = "#4F633B";
const SOFT_GOLD_BG = "rgba(217, 148, 0, 0.10)";
const SOFT_OLIVE_BG = "rgba(79, 99, 59, 0.10)";
const CARD_BORDER = "rgba(217, 148, 0, 0.18)";

function safeInitials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name).trim()[0]?.toUpperCase() || "?";
}

function formatNoticeDate(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function ChurchNoticeboard({ route, navigation }) {
  const churchId = route?.params?.churchId;
  const routeChurchName = route?.params?.churchName;

  const [viewerId, setViewerId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [church, setChurch] = useState(null);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [mediaAsset, setMediaAsset] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const churchName = church?.display_name || church?.name || routeChurchName || "Church";
  const initials = useMemo(() => safeInitials(churchName), [churchName]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const { data: sessData } = await supabase.auth.getSession();
        const uid = sessData?.session?.user?.id || null;
        setViewerId(uid);

        if (churchId) {
          await loadChurch();
        }

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

  async function loadChurch() {
    if (!churchId) return;

    const { data, error } = await supabase
      .from("churches")
      .select("id, name, display_name, avatar_url, is_verified")
      .eq("id", churchId)
      .single();

    if (error) {
      console.log("noticeboard load church error:", error);
      setChurch(null);
      return;
    }

    setChurch(data || null);
  }

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

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id && churchId) {
        await supabase.from("church_noticeboard_reads").upsert(
          {
            user_id: user.id,
            church_id: churchId,
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,church_id" }
        );
      }
    } catch (e) {
      console.log("noticeboard mark seen error:", e);
    }
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

    try {
      const info = await FileSystem.getInfoAsync(asset.uri, { size: true });
      const sizeBytes = info?.size ?? 0;

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

  function renderChurchAvatar(size = 46) {
    const radius = size / 2;

    if (church?.avatar_url) {
      return (
        <Image
          source={{ uri: church.avatar_url }}
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            backgroundColor: theme.colors.surfaceAlt,
          }}
        />
      );
    }

    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: SOFT_OLIVE_BG,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: DEEP_OLIVE, fontWeight: "900", fontSize: size > 40 ? 16 : 13 }}>
          {initials}
        </Text>
      </View>
    );
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
            height: 245,
            backgroundColor: theme.colors.surfaceAlt,
          }}
          resizeMode="cover"
        />
      );
    }

    if (isVideo) {
      return (
        <Video
          source={{ uri: item.media_url }}
          style={{
            width: "100%",
            height: 245,
            backgroundColor: theme.colors.surfaceAlt,
          }}
          useNativeControls
          resizeMode="contain"
          usePoster={Boolean(item.thumbnail_url)}
          posterSource={item.thumbnail_url ? { uri: item.thumbnail_url } : undefined}
        />
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
          borderColor: CARD_BORDER,
          backgroundColor: theme.colors.surface,
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <View style={{ padding: 10 }}>
          <Text style={{ color: theme.colors.muted, fontWeight: "800", marginBottom: 8 }}>
            Attached {isVideo ? "video" : "image"}
          </Text>
        </View>

        {isVideo ? (
          <Video
            source={{ uri: mediaAsset.uri }}
            style={{ width: "100%", height: 190, backgroundColor: theme.colors.surfaceAlt }}
            useNativeControls
            resizeMode="contain"
          />
        ) : (
          <Image
            source={{ uri: mediaAsset.uri }}
            style={{ width: "100%", height: 190, backgroundColor: theme.colors.surfaceAlt }}
            resizeMode="cover"
          />
        )}

        <View style={{ padding: 10 }}>
          <Pressable
            onPress={() => setMediaAsset(null)}
            disabled={saving || uploadingMedia}
            style={[theme.button.outline, { borderRadius: 12, paddingVertical: 10 }]}
          >
            <Text style={theme.button.outlineText}>Remove attachment</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function renderHeader() {
    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
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
            }}
          >
            <Ionicons name="chevron-back" size={22} color={DEEP_OLIVE} />
          </Pressable>

          <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
            Noticeboard
          </Text>

          <View style={{ width: 38 }} />
        </View>

        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 22,
            padding: 16,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            shadowColor: HEAVENLY_GOLD,
            shadowOpacity: 0.08,
            shadowRadius: 9,
            shadowOffset: { width: 0, height: 3 },
            elevation: 3,
            overflow: "hidden",
          }}
        >
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: -45,
              right: -32,
              width: 180,
              height: 130,
              borderRadius: 40,
              backgroundColor: SOFT_GOLD_BG,
            }}
          />

          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              bottom: -45,
              left: -45,
              width: 130,
              height: 130,
              borderRadius: 65,
              backgroundColor: SOFT_OLIVE_BG,
            }}
          />

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {renderChurchAvatar(48)}

            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: "900" }}>
                Noticeboard
              </Text>

              <Text
                style={{
                  color: theme.colors.muted,
                  fontSize: 12.5,
                  fontWeight: "800",
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {churchName}
              </Text>
            </View>

            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: SOFT_GOLD_BG,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="megaphone-outline" size={20} color={HEAVENLY_GOLD} />
            </View>
          </View>

          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 14,
              fontWeight: "700",
              lineHeight: 20,
              marginTop: 14,
            }}
          >
            Official updates, announcements, service changes, serving needs and practical
            notices from your church.
          </Text>

          {isAdmin ? (
            <Pressable
              onPress={() => {
                resetNewNoticeForm();
                setShowNew(true);
              }}
              style={({ pressed }) => ({
                marginTop: 14,
                borderRadius: 999,
                paddingVertical: 11,
                paddingHorizontal: 14,
                backgroundColor: HEAVENLY_GOLD,
                opacity: pressed ? 0.85 : 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              })}
            >
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "900" }}>New notice</Text>
            </Pressable>
          ) : null}
        </View>

        <View
          style={{
            marginTop: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 22,
                fontWeight: "900",
                letterSpacing: -0.4,
              }}
            >
              Church notices
            </Text>

            <Text
              style={{
                color: theme.colors.muted,
                fontSize: 13,
                fontWeight: "700",
                lineHeight: 18,
                marginTop: 3,
              }}
            >
              The latest practical updates from the church.
            </Text>
          </View>

          {loading ? null : (
            <Text
              style={{
                color: DEEP_OLIVE,
                fontWeight: "900",
                fontSize: 12,
              }}
            >
              {items.length} {items.length === 1 ? "notice" : "notices"}
            </Text>
          )}
        </View>
      </View>
    );
  }

  function renderNoticeItem({ item }) {
    const hasMedia = Boolean(item?.media_url && item?.media_type);
    const dateText = formatNoticeDate(item.created_at);

    return (
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          borderRadius: 20,
          overflow: "hidden",
          shadowColor: HEAVENLY_GOLD,
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 2,
        }}
      >
        <View style={{ padding: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {renderChurchAvatar(36)}

            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 13 }}>
                Noticeboard
              </Text>

              <Text style={{ color: theme.colors.muted, fontWeight: "700", fontSize: 11, marginTop: 2 }}>
                {dateText}
              </Text>
            </View>

            <View
              style={{
                paddingHorizontal: 9,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: SOFT_OLIVE_BG,
                borderWidth: 1,
                borderColor: CARD_BORDER,
              }}
            >
              <Text style={{ color: DEEP_OLIVE, fontWeight: "900", fontSize: 10 }}>
                Notice
              </Text>
            </View>
          </View>

          <Text
            style={{
              color: theme.colors.text,
              fontWeight: "900",
              fontSize: 17,
              lineHeight: 22,
              marginTop: 12,
            }}
          >
            {item.title || "Notice"}
          </Text>

          {item.content ? (
            <Text
              style={{
                color: theme.colors.text2,
                marginTop: 7,
                fontWeight: "600",
                lineHeight: 20,
                fontSize: 14,
              }}
            >
              {item.content}
            </Text>
          ) : null}
        </View>

        {hasMedia ? renderNoticeMedia(item) : null}
      </View>
    );
  }

  return (
    <Screen backgroundColor={theme.colors.bg} padded={false} style={{ flex: 1 }} contentStyle={{ flex: 1 }}>
      {({ bottomPad }) => (
        <>
          {loading ? (
            <View style={{ flex: 1 }}>
              {renderHeader()}

              <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={HEAVENLY_GOLD} />
                <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Loading notices…</Text>
              </View>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(it) => it.id}
              ListHeaderComponent={renderHeader}
              contentContainerStyle={{
                paddingBottom: bottomPad + 18,
              }}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              ListEmptyComponent={
                <View
                  style={{
                    marginHorizontal: 16,
                    marginTop: 6,
                    padding: 18,
                    borderRadius: 20,
                    backgroundColor: theme.colors.surface,
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 23,
                      backgroundColor: SOFT_GOLD_BG,
                      borderWidth: 1,
                      borderColor: CARD_BORDER,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 10,
                    }}
                  >
                    <Ionicons name="megaphone-outline" size={22} color={HEAVENLY_GOLD} />
                  </View>

                  <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
                    No notices yet
                  </Text>

                  <Text
                    style={{
                      color: theme.colors.muted,
                      textAlign: "center",
                      marginTop: 6,
                      fontWeight: "700",
                      lineHeight: 19,
                    }}
                  >
                    Church announcements, service changes and practical updates will appear here.
                  </Text>
                </View>
              }
              renderItem={renderNoticeItem}
              style={{ flex: 1 }}
              contentInsetAdjustmentBehavior="automatic"
              showsVerticalScrollIndicator={false}
              ListFooterComponent={<View style={{ height: 6 }} />}
              CellRendererComponent={({ children, style, ...props }) => (
                <View {...props} style={[style, { paddingHorizontal: 16 }]}>
                  {children}
                </View>
              )}
            />
          )}

          {/* NEW NOTICE MODAL */}
          <Modal visible={showNew} animationType="slide" transparent onRequestClose={() => setShowNew(false)}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}>
              <Pressable
                style={{ flex: 1 }}
                onPress={() => !saving && !uploadingMedia && setShowNew(false)}
              />

              <View
                style={{
                  backgroundColor: theme.colors.surface,
                  borderTopLeftRadius: 22,
                  borderTopRightRadius: 22,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  padding: 16,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                    {renderChurchAvatar(34)}

                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 17 }}>
                        New notice
                      </Text>
                      <Text style={{ color: theme.colors.muted, fontWeight: "700", fontSize: 12, marginTop: 2 }}>
                        Share an official update with your church.
                      </Text>
                    </View>
                  </View>

                  <Pressable onPress={() => !saving && !uploadingMedia && setShowNew(false)} hitSlop={10}>
                    <Ionicons name="close" size={22} color={theme.colors.muted} />
                  </Pressable>
                </View>

                <View style={{ height: 14 }} />

                <Text style={{ color: theme.colors.muted, marginBottom: 6, fontWeight: "800" }}>
                  Title (optional)
                </Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Sunday service time change"
                  placeholderTextColor={theme.input.placeholder}
                  style={theme.input.box}
                />

                <View style={{ height: 12 }} />

                <Text style={{ color: theme.colors.muted, marginBottom: 6, fontWeight: "800" }}>
                  Notice
                </Text>
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

                <View style={{ height: 12 }} />

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pressable
                    onPress={pickImageFromLibrary}
                    disabled={saving || uploadingMedia}
                    style={({ pressed }) => ({
                      flex: 1,
                      borderRadius: 14,
                      paddingVertical: 12,
                      borderWidth: 1,
                      borderColor: CARD_BORDER,
                      backgroundColor: pressed ? SOFT_GOLD_BG : theme.colors.surface,
                      alignItems: "center",
                    })}
                  >
                    <Text style={{ color: HEAVENLY_GOLD, fontWeight: "900" }}>Add image</Text>
                  </Pressable>

                  <Pressable
                    onPress={recordVideo}
                    disabled={saving || uploadingMedia}
                    style={({ pressed }) => ({
                      flex: 1,
                      borderRadius: 14,
                      paddingVertical: 12,
                      borderWidth: 1,
                      borderColor: CARD_BORDER,
                      backgroundColor: pressed ? SOFT_OLIVE_BG : theme.colors.surface,
                      alignItems: "center",
                    })}
                  >
                    <Text style={{ color: DEEP_OLIVE, fontWeight: "900" }}>Record video</Text>
                  </Pressable>
                </View>

                {renderNewNoticeMediaPreview()}

                <View style={{ height: 12 }} />

                <Pressable
                  onPress={createNotice}
                  disabled={saving || uploadingMedia}
                  style={{
                    borderRadius: 14,
                    paddingVertical: 13,
                    opacity: saving || uploadingMedia ? 0.7 : 1,
                    backgroundColor: HEAVENLY_GOLD,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "900" }}>
                    {uploadingMedia ? "Uploading…" : saving ? "Posting…" : "Post notice"}
                  </Text>
                </Pressable>

                <View style={{ height: 10 }} />

                <Pressable
                  onPress={() => !saving && !uploadingMedia && setShowNew(false)}
                  style={[theme.button.outline, { borderRadius: 14, paddingVertical: 12 }]}
                >
                  <Text style={theme.button.outlineText}>Cancel</Text>
                </Pressable>

                <View style={{ height: 10 }} />
              </View>
            </View>
          </Modal>
        </>
      )}
    </Screen>
  );
}