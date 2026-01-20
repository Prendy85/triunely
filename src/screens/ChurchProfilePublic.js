// src/screens/ChurchProfilePublic.js
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as LegacyFileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import ChurchNoticeboardPanel from "../components/ChurchNoticeboardPanel";
import NewPostModal from "../components/NewPostModal";
import PostCard from "../components/PostCard";
import PostCommentsModal from "../components/PostCommentsModal";
import Screen from "../components/Screen";
import VerifiedBadge from "../components/VerifiedBadge";
import { GLOBAL_COMMUNITY_ID } from "../lib/constants";
import { supabase } from "../lib/supabase";
import { theme } from "../theme/theme";


const POSTS_ENABLED = true;
const PAGE_LIMIT = 50;

function safeInitials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name).trim()[0]?.toUpperCase() || "?";
}

export default function ChurchProfilePublic({ navigation, route }) {
  const churchId = route?.params?.churchId;
  

  // ✅ Step 5B: are we viewing the default Triunely church fallback?
  const isDefaultTriunelyChurch =
    route?.params?.isDefaultTriunelyChurch === true;

  // viewer
  const [viewerId, setViewerId] = useState(null);

  // church
  const [loading, setLoading] = useState(true);
  const [church, setChurch] = useState(null);

  // admin permission
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);

  // tabs (requested: posts <-> noticeboard)
  const [activeTab, setActiveTab] = useState("posts"); // posts | noticeboard

  // Details fields (editable if admin via admin menu)
  const [about, setAbout] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

  // admin menu
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  // cover + avatar uploads
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [savingCover, setSavingCover] = useState(false);

  // church posts
  const [postsLoading, setPostsLoading] = useState(false);
  const [posts, setPosts] = useState([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [posting, setPosting] = useState(false);

  // comments + reactions
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState(null);
  const [reactionPickerForPost, setReactionPickerForPost] = useState(null);

  const churchName = church?.display_name || church?.name || "Church";
  const initials = useMemo(() => safeInitials(churchName), [churchName]);
  const isVerified = Boolean(church?.is_verified);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // 1) viewer
        const { data: sessData } = await supabase.auth.getSession();
        const uid = sessData?.session?.user?.id || null;
        setViewerId(uid);

        if (!churchId) {
          setChurch(null);
          return;
        }

        // 2) load church
        await loadChurch(churchId);

        // 3) admin check
        if (uid) await checkIsAdmin(uid, churchId);
        else setIsAdmin(false);

        // 4) load church posts
        if (POSTS_ENABLED) await loadChurchPosts(churchId);
      } catch (e) {
        console.log("ChurchProfilePublic load error", e);
        Alert.alert("Error", "We couldn't load this church profile right now.");
      } finally {
        setLoading(false);
      }
    })();
  }, [churchId]);

  async function loadChurch(id) {
    const { data, error } = await supabase
      .from("churches")
      .select("id, name, display_name, avatar_url, cover_image_url, about, website, location, is_verified")
      .eq("id", id)
      .single();

    if (error) {
      console.log("loadChurch error:", error);
      throw error;
    }

    setChurch(data || null);
    setAbout(data?.about ?? "");
    setWebsite(data?.website ?? "");
    setLocation(data?.location ?? "");
  }

  async function checkIsAdmin(uid, id) {
    try {
      setCheckingAdmin(true);

      const { data, error } = await supabase
        .from("church_admins")
        .select("user_id, church_id")
        .eq("user_id", uid)
        .eq("church_id", id)
        .maybeSingle();

      if (error) {
        console.log("checkIsAdmin error:", error);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(Boolean(data));
    } finally {
      setCheckingAdmin(false);
    }
  }

  async function loadChurchPosts(id) {
    try {
      setPostsLoading(true);

      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          id,
          user_id,
          church_id,
          content,
          url,
          link_title,
          link_description,
          link_image,
          is_anonymous,
          media_url,
          media_type,
          created_at,
          post_reactions (
            user_id,
            type
          ),
          post_comments (
            count
          )
        `
        )
        .eq("community_id", GLOBAL_COMMUNITY_ID)
        .eq("church_id", id)
        .in("visibility", ["global", "church"])
        .order("created_at", { ascending: false })
        .limit(PAGE_LIMIT);

      if (error) throw error;

      const mapped =
        (data || []).map((row) => {
          const commentCount =
            Array.isArray(row.post_comments) && row.post_comments.length > 0
              ? row.post_comments[0].count ?? 0
              : 0;

          return {
            id: row.id,
            user_id: row.user_id,
            church_id: row.church_id,
            content: row.content,
            url: row.url,
            link_title: row.link_title,
            link_description: row.link_description,
            link_image: row.link_image,
            is_anonymous: row.is_anonymous,
            media_url: row.media_url,
            media_type: row.media_type,
            created_at: row.created_at,
            reactions: row.post_reactions || [],
            comment_count: commentCount,
          };
        }) ?? [];

      setPosts(mapped);
    } catch (e) {
      console.log("loadChurchPosts error:", e);
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }

  useFocusEffect(
  useCallback(() => {
    if (!churchId) return;

    // Reload the church record when the screen is focused again
    loadChurch(churchId);

    // Re-check admin + refresh posts too (keeps it consistent)
    if (viewerId) checkIsAdmin(viewerId, churchId);
    if (POSTS_ENABLED) loadChurchPosts(churchId);
  }, [churchId, viewerId])
);

  async function uploadImageToChurch(pathPrefix, asset) {
    const fileExtFromUri =
      asset.uri.split(".").pop()?.toLowerCase().split("?")[0] || "jpg";
    const fileExt = fileExtFromUri === "" ? "jpg" : fileExtFromUri;

    const fileName = `${pathPrefix}-${Date.now()}.${fileExt}`;
    const contentType = asset.type || "image/jpeg";

    const { data: fnData, error: fnError } = await supabase.functions.invoke(
      "upload-post-image",
      {
        body: {
          base64: asset.base64,
          fileName,
          contentType,
          pathPrefix: `churches/${church.id}/${pathPrefix}`,
        },
      }
    );

    if (fnError) {
      console.log("upload edge function error:", fnError);
      throw fnError;
    }

    if (!fnData?.publicUrl) throw new Error("No publicUrl returned");
    return fnData.publicUrl;
  }

  async function handlePickAvatar() {
    if (!isAdmin || !church?.id) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "We need access to photos to set an avatar.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert("Avatar error", "We couldn't read this image. Try another.");
        return;
      }

      setSavingAvatar(true);

      const publicUrl = await uploadImageToChurch("avatars", asset);

      const { error } = await supabase
        .from("churches")
        .update({ avatar_url: publicUrl })
        .eq("id", church.id);

      if (error) throw error;

      setChurch((prev) => ({ ...(prev || {}), avatar_url: publicUrl }));
    } catch (e) {
      console.log("handlePickAvatar error:", e);
      Alert.alert("Error", "We couldn't update the church avatar right now.");
    } finally {
      setSavingAvatar(false);
    }
  }

  async function handlePickCover() {
    if (!isAdmin || !church?.id) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "We need access to photos to set a cover image.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert("Cover error", "We couldn't read this image. Try another.");
        return;
      }

      setSavingCover(true);

      const publicUrl = await uploadImageToChurch("covers", asset);

      const { error } = await supabase
        .from("churches")
        .update({ cover_image_url: publicUrl })
        .eq("id", church.id);

      if (error) throw error;

      setChurch((prev) => ({ ...(prev || {}), cover_image_url: publicUrl }));
    } catch (e) {
      console.log("handlePickCover error:", e);
      Alert.alert("Error", "We couldn't update the cover image right now.");
    } finally {
      setSavingCover(false);
    }
  }

  async function handleSaveDetails() {
    if (!isAdmin || !church?.id) return;

    try {
      setSavingDetails(true);

      const updates = {
        about: about || null,
        website: website || null,
        location: location || null,
      };

      const { error } = await supabase
        .from("churches")
        .update(updates)
        .eq("id", church.id);

      if (error) throw error;

      setChurch((prev) => ({ ...(prev || {}), ...updates }));
      setIsEditingDetails(false);
      Alert.alert("Saved", "Church profile updated.");
    } catch (e) {
      console.log("handleSaveDetails error:", e);
      Alert.alert("Error", "We couldn't save the church profile right now.");
    } finally {
      setSavingDetails(false);
    }
  }

  async function handleCreateChurchPost(content, url, _isAnonymous, media) {
    if (!isAdmin) return;

    if (!content.trim() && !media) {
      Alert.alert("Message required", "Please write something or attach an image.");
      return;
    }

    try {
      setPosting(true);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        Alert.alert("Not signed in", "Please sign in again before posting.");
        return;
      }

      // upload media (optional)
      let mediaUrl = null;
      let mediaType = null;

      if (media && media.uri) {
        try {
          const base64 = await LegacyFileSystem.readAsStringAsync(media.uri, {
            encoding: "base64",
          });

          const fileName = media.fileName || `image-${Date.now()}.jpg`;
          const contentType = media.type || "image/jpeg";

          const { data: fnData, error: fnError } = await supabase.functions.invoke(
            "upload-post-image",
            {
              body: { base64, fileName, contentType },
            }
          );

          if (fnError) throw fnError;

          mediaUrl = fnData?.publicUrl ?? null;
          mediaType = contentType;
        } catch (e) {
          console.log("ChurchProfilePublic upload error:", e);
          Alert.alert("Upload failed", "We couldn’t upload your image. You can still post text only.");
        }
      }

      const payload = {
        user_id: userId,
        church_id: churchId,
        community_id: GLOBAL_COMMUNITY_ID,
        visibility: "global",
        is_anonymous: false,
        content: content.trim(),
      };

      if (url && url.trim()) payload.url = url.trim();
      if (mediaUrl) {
        payload.media_url = mediaUrl;
        payload.media_type = mediaType;
      }

      // link preview (optional)
      let linkPreview = null;
      if (url && url.trim()) {
        try {
          const { data: previewData, error: previewError } = await supabase.functions.invoke(
            "link-preview",
            { body: { url: url.trim() } }
          );
          if (!previewError && previewData?.ok) linkPreview = previewData;
        } catch (e) {
          console.log("link-preview failed", e);
        }
      }

      if (linkPreview) {
        payload.link_title = linkPreview.title || null;
        payload.link_description = linkPreview.description || null;
        payload.link_image = linkPreview.image || null;
      }

      const { data, error } = await supabase
        .from("posts")
        .insert(payload)
        .select(
          `
          id,
          user_id,
          church_id,
          content,
          url,
          link_title,
          link_description,
          link_image,
          is_anonymous,
          media_url,
          media_type,
          created_at
        `
        )
        .single();

      if (error) throw error;

      const newPost = { ...data, reactions: [], comment_count: 0 };
      setPosts((prev) => [newPost, ...(prev || [])]);
      setShowNewModal(false);
    } catch (e) {
      console.log("handleCreateChurchPost error:", e);
      Alert.alert("Could not post", e?.message || "Please try again.");
    } finally {
      setPosting(false);
    }
  }

  function openComments(post) {
    setSelectedPostForComments(post);
    setShowCommentsModal(true);
  }

  function handleCommentAdded(postId) {
    setPosts((prev) =>
      (prev || []).map((p) =>
        p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p
      )
    );
  }

  async function setReaction(postId, newTypeOrNull) {
    if (!viewerId) {
      Alert.alert("Please sign in", "You need to be signed in to react.");
      return;
    }

    const target = (posts || []).find((p) => p.id === postId);
    if (!target) return;

    const existing = target.reactions?.find((r) => r.user_id === viewerId) || null;
    const isSame = existing && existing.type === newTypeOrNull;
    const finalType = isSame ? null : newTypeOrNull;

    setPosts((prev) =>
      (prev || []).map((p) => {
        if (p.id !== postId) return p;
        let newReactions = (p.reactions || []).filter((r) => r.user_id !== viewerId);
        if (finalType) newReactions = [...newReactions, { user_id: viewerId, type: finalType }];
        return { ...p, reactions: newReactions };
      })
    );

    setReactionPickerForPost(null);

    try {
      const { error: delError } = await supabase
        .from("post_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", viewerId);

      if (delError) throw delError;

      if (finalType) {
        const { error: insError } = await supabase.from("post_reactions").insert({
          post_id: postId,
          user_id: viewerId,
          type: finalType,
        });

        if (insError && insError.code !== "23505") throw insError;
      }
    } catch (e) {
      console.log("ChurchProfilePublic setReaction error:", e);
      Alert.alert(
        "Reaction failed",
        "We couldn’t update your reaction. It might correct itself on refresh."
      );
    }
  }

  function renderPostsTab() {
    if (!POSTS_ENABLED) {
      return (
        <View style={{ marginTop: 10 }}>
          <Text style={{ color: theme.colors.muted, fontWeight: "700" }}>
            Church posts are coming soon.
          </Text>
        </View>
      );
    }

    return (
      <View style={{ marginTop: 10 }}>
        {isAdmin ? (
          <Pressable
            onPress={() => setShowNewModal(true)}
            style={[theme.button.primary, { borderRadius: 14, paddingVertical: 12, marginBottom: 12 }]}
          >
            <Text style={theme.button.primaryText}>Create a church post</Text>
          </Pressable>
        ) : null}

        {postsLoading ? (
          <View style={{ paddingVertical: 18, alignItems: "center" }}>
            <ActivityIndicator size="small" color={theme.colors.gold} />
            <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Loading posts…</Text>
          </View>
        ) : null}

        {!postsLoading && (posts || []).length === 0 ? (
          <Text style={{ color: theme.colors.muted, fontWeight: "700" }}>No posts yet.</Text>
        ) : null}

        {(posts || []).map((p) => (
          <View key={p.id} style={{ marginBottom: 10 }}>
            <PostCard
              post={p}
              currentUserId={viewerId}
              author={{
                id: churchId,
                name: churchName,
                avatarUrl: church?.avatar_url || null,
                isAnonymous: false,
                isOwner: false,
              }}
              onPressAvatar={() => {}}
              onOpenComments={(post) => openComments(post)}
              onShare={null}
              onSetReaction={(postId, typeOrNull) => setReaction(postId, typeOrNull)}
              reactionPickerForPost={reactionPickerForPost}
              setReactionPickerForPost={setReactionPickerForPost}
              preferInAppYouTube={true}
            />
          </View>
        ))}
      </View>
    );
  }

  function renderNoticeboardTab() {
  return (
    <View style={{ marginTop: 10 }}>
      <ChurchNoticeboardPanel
        churchId={churchId}
        bottomPad={0}
        showHeader={false}
        embedded={true}
      />
    </View>
  );
}


  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={theme.colors.gold} />
        <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Loading church…</Text>
      </View>
    );
  }

  if (!church) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: "center", alignItems: "center", padding: 16 }}>
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900", marginBottom: 6 }}>
          Church not found
        </Text>
        <Text style={{ color: theme.colors.muted, textAlign: "center" }}>
          We couldn’t load this church profile.
        </Text>
        <Pressable
          onPress={() => navigation.goBack()}
          style={[theme.button.outline, { marginTop: 14, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 }]}
        >
          <Text style={theme.button.outlineText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Screen backgroundColor={theme.colors.bg} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: bottomPad }}>
            
            {/* Title row (icons on the RIGHT) */}
<View
  style={{
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingTop: 6,
  }}
>
  {/* Message button (everyone) */}
  <Pressable
    onPress={() => {
      if (!churchId) return;

      if (isAdmin) {
        navigation.navigate("ChurchAdminInbox", { churchId });
        return;
      }

      navigation.navigate("MainTabs", {
  screen: "Church",
  params: {
    screen: "ChurchInbox",
    params: { churchId },
  },
});

    }}
    disabled={!churchId}
style={{
  paddingHorizontal: 10,
  paddingVertical: 8,
  alignItems: "center",
  justifyContent: "center",
  opacity: churchId ? 1 : 0.4,
}}

    hitSlop={10}
  >
    <Ionicons
      name="chatbubble-ellipses-outline"
      size={23}
      color={theme.colors.text2}
    />
  </Pressable>

  {/* Admin button (admin only) - CLIPBOARD icon */}
  {isAdmin ? (
    <Pressable
      onPress={() => setShowAdminMenu(true)}
     style={{
  paddingHorizontal: 10,
  paddingVertical: 8,
  alignItems: "center",
  justifyContent: "center",
}}

      hitSlop={10}
    >
      <Ionicons name="clipboard-outline" size={26} color={theme.colors.text2} />
    </Pressable>
  ) : null}
</View>


            {/* Cover */}
            <View style={{ marginBottom: 18 }}>
              <View
                style={{
                  height: 160,
                  width: "100%",
                  overflow: "hidden",
                  backgroundColor: theme.colors.surfaceAlt,
                  marginBottom: -52,
                }}
              >
                {church.cover_image_url ? (
                  <Image source={{ uri: church.cover_image_url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                ) : (
                  <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.sageTint }}>
                    <Text style={{ color: theme.colors.text2, fontSize: 12 }}>
                      Add a background image to personalise this page.
                    </Text>
                  </View>
                )}

                {isAdmin ? (
                  <Pressable
                    onPress={handlePickCover}
                    disabled={savingCover}
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: savingCover ? theme.colors.surfaceAlt : theme.colors.gold,
                      justifyContent: "center",
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: theme.colors.goldOutline,
                    }}
                  >
                    <Ionicons name={savingCover ? "time-outline" : "camera-outline"} size={18} color={theme.colors.text} />
                  </Pressable>
                ) : null}
              </View>

              {/* Avatar row */}
              <View style={{ flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 4 }}>
                <View style={{ marginTop: -48, marginRight: 12 }}>
                  {church.avatar_url ? (
                    <Image
                      source={{ uri: church.avatar_url }}
                      style={{ width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: theme.colors.bg }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: 48,
                        backgroundColor: theme.colors.blue,
                        justifyContent: "center",
                        alignItems: "center",
                        borderWidth: 2,
                        borderColor: theme.colors.bg,
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: 32, fontWeight: "900" }}>{initials}</Text>
                    </View>
                  )}

                  {isAdmin ? (
                    <Pressable
                      onPress={handlePickAvatar}
                      disabled={savingAvatar}
                      style={{
                        position: "absolute",
                        bottom: -4,
                        right: -4,
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: savingAvatar ? theme.colors.surfaceAlt : theme.colors.gold,
                        justifyContent: "center",
                        alignItems: "center",
                        borderWidth: 2,
                        borderColor: theme.colors.bg,
                      }}
                    >
                      <Ionicons name={savingAvatar ? "time-outline" : "camera-outline"} size={18} color={theme.colors.text} />
                    </Pressable>
                  ) : null}
                </View>
              </View>

              {/* Name + badge */}
              <View style={{ marginTop: 10, paddingHorizontal: 4, flexDirection: "row", alignItems: "baseline" }}>
                <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: "900" }} numberOfLines={1}>
                  {churchName}
                </Text>
                {isVerified ? (
                  <View style={{ marginLeft: 6, marginTop: 1 }}>
                    <VerifiedBadge size={15} />
                  </View>
                ) : null}
              </View>

               {/* ✅ Step 5B: Show Find Church CTA when this is the default Triunely church */}
              {isDefaultTriunelyChurch ? (
                <View
                  style={{
                    marginTop: 12,
                    marginHorizontal: 4,
                    padding: 14,
                    borderRadius: 16,
                    backgroundColor: theme.colors.surface,
                    borderWidth: 1,
                    borderColor: theme.colors.divider,
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "900", marginBottom: 6 }}>
                    Want to add your local church?
                  </Text>

                  <Text style={{ color: theme.colors.muted, fontWeight: "600", marginBottom: 12 }}>
                    You’re currently viewing Triunely Church. You can search and add your local church as well.
                  </Text>

                  <Pressable
  onPress={() => navigation.navigate("ChurchFind")}
  style={[theme.button.primary, { borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14 }]}
>

                    <Text style={theme.button.primaryText}>Find your church</Text>
                  </Pressable>
                </View>
              ) : null}

              {/* Details preview */}
              <View style={{ marginTop: 8, paddingHorizontal: 4 }}>
                {about ? (
                  <Text style={{ color: theme.colors.text2, fontWeight: "600", marginBottom: 6 }}>
                    {about}
                  </Text>
                ) : null}

                {location ? (
                  <Text style={{ color: theme.colors.muted, fontWeight: "700" }}>
                    Location: <Text style={{ color: theme.colors.text2 }}>{location}</Text>
                  </Text>
                ) : null}

                {website ? (
                  <Text style={{ color: theme.colors.muted, fontWeight: "700", marginTop: 2 }}>
                    Website: <Text style={{ color: theme.colors.text2 }}>{website}</Text>
                  </Text>
                ) : null}

                {checkingAdmin ? (
                  <Text style={{ color: theme.colors.muted, marginTop: 6 }}>
                    Checking admin permissions…
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Message Church */}
{/* Message Church (non-admin only) */}
{!isAdmin ? (
  <Pressable
    onPress={() => navigation.navigate("ChurchInbox", { churchId })}
    disabled={!churchId}
    style={[
      theme.button.primary,
      {
        marginTop: 12,
        borderRadius: 14,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        opacity: churchId ? 1 : 0.5,
      },
    ]}
  >
    <Ionicons name="mail-outline" size={18} color={theme.colors.text} />
    <Text style={theme.button.primaryText}>Message Church</Text>
  </Pressable>
) : null}



            {/* Tabs: Posts / Noticeboard */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: theme.colors.surfaceAlt,
                borderRadius: 999,
                padding: 4,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: theme.colors.divider,
              }}
            >
              <Pressable
                onPress={() => setActiveTab("posts")}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 999,
                  alignItems: "center",
                  backgroundColor: activeTab === "posts" ? theme.colors.gold : "transparent",
                }}
              >
                <Text style={{ color: activeTab === "posts" ? theme.colors.text : theme.colors.text2, fontWeight: "900" }}>
                  Posts
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab("noticeboard")}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 999,
                  alignItems: "center",
                  backgroundColor: activeTab === "noticeboard" ? theme.colors.gold : "transparent",
                }}
              >
                <Text style={{ color: activeTab === "noticeboard" ? theme.colors.text : theme.colors.text2, fontWeight: "900" }}>
                  Noticeboard
                </Text>
              </Pressable>
            </View>

            {/* Tab content card */}
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: 16,
                padding: 16,
                marginBottom: 24,
                borderWidth: 1,
                borderColor: theme.colors.divider,
              }}
            >
              {activeTab === "posts" ? (
                <View>
                  <Text style={theme.text.h2}>Posts</Text>
                  {renderPostsTab()}
                </View>
              ) : (
                <View>
                  {renderNoticeboardTab()}
                </View>
              )}
            </View>
          </ScrollView>

          <NewPostModal
            visible={showNewModal}
            onClose={() => {
              if (!posting) setShowNewModal(false);
            }}
            onSubmit={handleCreateChurchPost}
            loading={posting}
          />

          <PostCommentsModal
            visible={showCommentsModal}
            onClose={() => setShowCommentsModal(false)}
            post={selectedPostForComments}
            currentUserId={viewerId}
            onCommentAdded={handleCommentAdded}
          />

          {/* Admin Menu Modal */}
          <Modal
            visible={showAdminMenu}
            transparent
            animationType="fade"
            onRequestClose={() => setShowAdminMenu(false)}
          >
            <Pressable
              onPress={() => setShowAdminMenu(false)}
              style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}
            >
              <View
                style={{
                  backgroundColor: theme.colors.surface,
                  padding: 16,
                  borderTopLeftRadius: 18,
                  borderTopRightRadius: 18,
                  borderWidth: 1,
                  borderColor: theme.colors.divider,
                }}
              >
                <Text style={theme.text.h2}>Church Admin</Text>
                <Text style={[theme.text.muted, { marginTop: 6 }]}>
                  Quick access to church tools.
                </Text>

                <View style={{ height: 12 }} />

                <Pressable
                  onPress={() => {
                    setShowAdminMenu(false);
                    navigation.navigate("ChurchAdminHub", { churchId: church.id });
                  }}
                  style={[theme.button.primary, { borderRadius: 14, paddingVertical: 12, marginBottom: 10 }]}
                >
                  <Text style={theme.button.primaryText}>Open Admin Hub</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setShowAdminMenu(false);
                    navigation.navigate("ChurchNoticeboard", { churchId: church.id });
                  }}
                  style={[theme.button.outline, { borderRadius: 14, paddingVertical: 12, marginBottom: 10 }]}
                >
                  <Text style={theme.button.outlineText}>Edit Noticeboard</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setShowAdminMenu(false);
                    navigation.navigate("WeeklyMessageEditor", { churchId: church.id });
                  }}
                  style={[theme.button.outline, { borderRadius: 14, paddingVertical: 12, marginBottom: 10 }]}
                >
                  <Text style={theme.button.outlineText}>Weekly Message</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setShowAdminMenu(false);
                    navigation.navigate("WeeklyChallengeEditor", { churchId: church.id });
                  }}
                  style={[theme.button.outline, { borderRadius: 14, paddingVertical: 12, marginBottom: 10 }]}
                >
                  <Text style={theme.button.outlineText}>Weekly Challenge</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setShowAdminMenu(false);
                    setIsEditingDetails(true);
                  }}
                  style={[theme.button.outline, { borderRadius: 14, paddingVertical: 12 }]}
                >
                  <Text style={theme.button.outlineText}>Edit Church Details</Text>
                </Pressable>
              </View>
            </Pressable>
          </Modal>

          {/* Edit Details Modal */}
          <Modal
            visible={isEditingDetails}
            transparent
            animationType="slide"
            onRequestClose={() => setIsEditingDetails(false)}
          >
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" }}>
              <View
                style={{
                  backgroundColor: theme.colors.surface,
                  borderTopLeftRadius: 18,
                  borderTopRightRadius: 18,
                  padding: 16,
                  maxHeight: "80%",
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <Text style={theme.text.h2}>Edit Church Details</Text>
                  <Pressable
                    onPress={() => setIsEditingDetails(false)}
                    style={[theme.button.outline, { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 }]}
                  >
                    <Text style={theme.button.outlineText}>Close</Text>
                  </Pressable>
                </View>

                <Text style={{ color: theme.colors.muted, marginBottom: 6 }}>About</Text>
                <TextInput
                  value={about}
                  onChangeText={setAbout}
                  placeholder="Tell people about your church…"
                  placeholderTextColor={theme.input.placeholder}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  style={[theme.input.box, { minHeight: 120 }]}
                />

                <View style={{ height: 12 }} />

                <Text style={{ color: theme.colors.muted, marginBottom: 6 }}>Location</Text>
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="e.g. Southampton"
                  placeholderTextColor={theme.input.placeholder}
                  style={theme.input.box}
                />

                <View style={{ height: 12 }} />

                <Text style={{ color: theme.colors.muted, marginBottom: 6 }}>Website</Text>
                <TextInput
                  value={website}
                  onChangeText={setWebsite}
                  placeholder="https://..."
                  placeholderTextColor={theme.input.placeholder}
                  style={theme.input.box}
                />

                <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 12 }}>
                  <Pressable
                    onPress={() => setIsEditingDetails(false)}
                    disabled={savingDetails}
                    style={[
                      theme.button.outline,
                      { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, marginRight: 8 },
                    ]}
                  >
                    <Text style={theme.button.outlineText}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleSaveDetails}
                    disabled={savingDetails}
                    style={[
                      theme.button.primary,
                      {
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 999,
                        opacity: savingDetails ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={theme.button.primaryText}>{savingDetails ? "Saving…" : "Save"}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}
    </Screen>
  );
}
