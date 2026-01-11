// src/screens/Community.js
import { Video } from "expo-av";
import * as LegacyFileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import NewPostModal from "../components/NewPostModal";
import PostCommentsModal from "../components/PostCommentsModal";
import { createStory, fetchActiveStories } from "../lib/stories";
import { supabase } from "../lib/supabase";

import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GlowCard from "../components/GlowCard";
import Screen from "../components/Screen";
import { theme } from "../theme/theme";

// Use the SAME id as in Prayer.js for Triunely Global
const GLOBAL_COMMUNITY_ID = "bb6353e4-8517-4c3e-b360-3cf5adbe9bb3";

const PAGE_LIMIT = 50;

// Simple domain extractor for display
function getDomainFromUrl(url) {
  try {
    const withoutProtocol = url.replace(/^https?:\/\/(www\.)?/, "");
    return withoutProtocol.split("/")[0];
  } catch {
    return null;
  }
}

// Robust YouTube video id + thumbnail extractor
function getYouTubeThumbnail(url) {
  if (!url) return null;

  let videoId = null;

  try {
    const lower = url.toLowerCase();

    // youtu.be short links
    if (lower.includes("youtu.be/")) {
      const match = url.match(/youtu\.be\/([^?&/]+)/i);
      if (match && match[1]) videoId = match[1];
    }

    // youtube.com links (watch, shorts, etc.)
    if (!videoId && lower.includes("youtube.com")) {
      // Shorts: https://www.youtube.com/shorts/VIDEOID
      if (lower.includes("/shorts/")) {
        const match = url.match(/shorts\/([^?&/]+)/i);
        if (match && match[1]) videoId = match[1];
      }

      // Standard watch URLs: https://www.youtube.com/watch?v=VIDEOID
      if (!videoId) {
        const match = url.match(/[?&]v=([^&]+)/i);
        if (match && match[1]) videoId = match[1];
      }
    }
  } catch (e) {
    console.log("Error parsing YouTube url for thumb", e);
  }

  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// Group stories by user so each user appears once in the Stories bar
function groupStoriesByUser(stories) {
  const map = {};
  stories.forEach((s) => {
    if (!s.user_id) return;
    if (!map[s.user_id]) {
      map[s.user_id] = {
        user_id: s.user_id,
        profile: s.profiles || null,
        stories: [],
      };
    }
    map[s.user_id].stories.push(s);
  });

  // Sort stories per user by created_at desc (newest first)
  Object.values(map).forEach((group) => {
    group.stories.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  });

  // Sort users by newest story first
  return Object.values(map).sort((a, b) => {
    const aLatest = a.stories[0]?.created_at || 0;
    const bLatest = b.stories[0]?.created_at || 0;
    return new Date(bLatest) - new Date(aLatest);
  });
}

function FeedActionButton({ icon, label, active, onPress, onLongPress }) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => ({
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        gap: 8,
        backgroundColor: active
          ? theme.colors.goldHalo
          : pressed
          ? theme.colors.surfaceAlt
          : theme.colors.surface,
      })}
    >
      <Ionicons
        name={icon}
        size={18}
        color={active ? theme.colors.goldPressed : theme.colors.text2}
      />
      <Text
        style={{
          color: active ? theme.colors.goldPressed : theme.colors.text2,
          fontWeight: "800",
          fontSize: 13,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function Community() {
  const insets = useSafeAreaInsets();

  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch {
    tabBarHeight = 0;
  }

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [showNewModal, setShowNewModal] = useState(false);
  const [posting, setPosting] = useState(false);

  const [currentUserId, setCurrentUserId] = useState(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(null);

  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState(null);

  // Which post (if any) has the reaction picker open
  const [reactionPickerForPost, setReactionPickerForPost] = useState(null);

  // Stories state
  const [stories, setStories] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(false);

  // Story viewer state
  const [storyViewerGroup, setStoryViewerGroup] = useState(null); // { user_id, profile, stories[] }
  const [storyViewerIndex, setStoryViewerIndex] = useState(0);

  // Story creation preview state
  const [storyPreview, setStoryPreview] = useState(null); // { uri, mediaType }
  const [storyPosting, setStoryPosting] = useState(false);

  // Tracks which story ids this user has seen in this session
  const [seenStoryIds, setSeenStoryIds] = useState({});

  // Overlays (text, emoji, stickers) for the story being composed
  const [storyOverlays, setStoryOverlays] = useState([]);

  // Simple text entry for overlays
  const [isTypingStoryText, setIsTypingStoryText] = useState(false);
  const [storyTextDraft, setStoryTextDraft] = useState("");

  // Which text style to use for newly added text overlays: "normal" | "highlight"
  const [storyTextStyleMode, setStoryTextStyleMode] = useState("normal");

  // Layouts used for drag positioning (preview + viewer)
  const [storyCanvasLayout, setStoryCanvasLayout] = useState(null);
  const [viewerCanvasLayout, setViewerCanvasLayout] = useState(null);

  // Which overlay (if any) is selected for resizing
  const [selectedOverlayId, setSelectedOverlayId] = useState(null);

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", userId)
        .single();

      if (error) {
        console.log("Error loading profile", error);
        return;
      }

      setProfileAvatarUrl(data?.avatar_url ?? null);
    } catch (e) {
      console.log("Unexpected error loading profile", e);
    }
  }

  // Get current user id once
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.log("Error getting session for Community", error);
        return;
      }

      const userId = data?.session?.user?.id ?? null;
      setCurrentUserId(userId);

      if (userId) {
        fetchProfile(userId); // load avatar when we know who the user is
      }
    })();
  }, []);

  async function fetchPosts(isRefresh = false) {
    if (!GLOBAL_COMMUNITY_ID) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from("posts")
        .select(
          `
          id,
          user_id,
          content,
          url,
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
        .eq("visibility", "global")
        .order("created_at", { ascending: false })
        .limit(PAGE_LIMIT);

      if (err) throw err;

      const mapped =
        (data || []).map((row) => {
          const commentCount =
            Array.isArray(row.post_comments) && row.post_comments.length > 0
              ? row.post_comments[0].count ?? 0
              : 0;

          return {
            id: row.id,
            user_id: row.user_id,
            content: row.content,
            url: row.url,
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
      console.log("Error loading posts", e);
      setError("Could not load posts right now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadStories() {
    try {
      setStoriesLoading(true);
      const data = await fetchActiveStories();
      setStories(data || []);
    } catch (e) {
      console.log("Error loading stories", e);
    } finally {
      setStoriesLoading(false);
    }
  }

  useEffect(() => {
    fetchPosts(false);
    loadStories();
  }, []);

  // Auto-advance for image stories: 5 seconds per story
  useEffect(() => {
    if (!storyViewerGroup) return;

    const current = storyViewerGroup.stories[storyViewerIndex];
    if (!current) return;

    if (current.media_type === "image") {
      const timer = setTimeout(() => {
        handleNextStory();
      }, 5000); // 5 seconds

      return () => clearTimeout(timer);
    }
  }, [storyViewerGroup, storyViewerIndex]);

  const openUrl = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Cannot open link", url);
      }
    } catch (e) {
      Alert.alert(
        "Cannot open link",
        "Something went wrong opening this link. Please try again."
      );
    }
  };

  // ---------- STORY CREATION (photo + video) ----------

  async function ensureMediaPermissions() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "We need access to your photos and videos so you can post a story."
      );
      return false;
    }
    return true;
  }

  async function ensureCameraPermissions() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "We need access to your camera so you can capture a story."
      );
      return false;
    }
    return true;
  }

  // Pick from gallery (photo or video) → open preview (no immediate upload)
  async function pickStoryMedia(kind) {
    // kind: "image" | "video"
    console.log("pickStoryMedia called with:", kind);

    if (!currentUserId) {
      Alert.alert("Not signed in", "Please sign in again before posting a story.");
      return;
    }

    const ok = await ensureMediaPermissions();
    if (!ok) return;

    const mediaTypes =
      kind === "video"
        ? ImagePicker.MediaTypeOptions.Videos
        : ImagePicker.MediaTypeOptions.Images;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        quality: kind === "video" ? 0.4 : 0.7,
        allowsEditing: kind === "image",
        aspect: kind === "image" ? [9, 16] : undefined,
      });

      console.log("ImagePicker (gallery) result:", result);

      if (result.canceled) {
        console.log("User cancelled picker");
        return;
      }

      const asset = result.assets && result.assets[0];
      if (!asset || !asset.uri) {
        console.log("No asset/uri from picker");
        return;
      }

      const mediaType = kind === "video" ? "video" : "image";

      // Open preview overlay
      setStoryPreview({
        uri: asset.uri,
        mediaType,
      });
    } catch (e) {
      console.log("Error choosing story media from gallery", e);
      Alert.alert(
        "Story failed",
        "We couldn’t open that media. Please try again or choose another file."
      );
    }
  }

  // Capture from camera (photo or video) → open preview (no immediate upload)
  async function captureStoryMedia(kind) {
    // kind: "image" | "video"
    console.log("captureStoryMedia called with:", kind);

    if (!currentUserId) {
      Alert.alert("Not signed in", "Please sign in again before posting a story.");
      return;
    }

    const ok = await ensureCameraPermissions();
    if (!ok) return;

    const mediaTypes =
      kind === "video"
        ? ImagePicker.MediaTypeOptions.Videos
        : ImagePicker.MediaTypeOptions.Images;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes,
        quality: kind === "video" ? 0.5 : 0.7,
        allowsEditing: kind === "image",
        aspect: kind === "image" ? [9, 16] : undefined,
        videoMaxDuration: kind === "video" ? 15 : undefined, // ~15 seconds clips
      });

      console.log("ImagePicker (camera) result:", result);

      if (result.canceled) {
        console.log("User cancelled camera");
        return;
      }

      const asset = result.assets && result.assets[0];
      if (!asset || !asset.uri) {
        console.log("No asset/uri from camera");
        return;
      }

      const mediaType = kind === "video" ? "video" : "image";

      // Open preview overlay
      setStoryPreview({
        uri: asset.uri,
        mediaType,
      });
    } catch (e) {
      console.log("Error capturing story media from camera", e);
      Alert.alert("Story failed", "We couldn’t capture that story. Please try again.");
    }
  }

  async function handlePostStoryFromPreview() {
    if (!currentUserId || !storyPreview) return;

    try {
      setStoryPosting(true);

      await createStory({
        mediaType: storyPreview.mediaType,
        localUri: storyPreview.uri,
        caption: null,
        userId: currentUserId,
        overlays: storyOverlays,
      });

      await loadStories();
      setStoryPreview(null);
      clearStoryOverlays();

      Alert.alert("Story posted", "Your story is now live for 24 hours.");
    } catch (e) {
      console.log("Error creating story from preview", e);

      const msg =
        e?.message ||
        "We couldn’t upload your story right now. If this is a large video, try trimming it to 15 seconds and exporting as 720p, then try again.";

      Alert.alert("Story failed", msg);
    } finally {
      setStoryPosting(false);
    }
  }

  function handleCancelStoryPreview() {
    if (storyPosting) return;
    setStoryPreview(null);
    clearStoryOverlays();
  }

  function handleAddTextOverlay() {
    const value = storyTextDraft.trim();
    if (!value) {
      setIsTypingStoryText(false);
      setStoryTextDraft("");
      return;
    }

    setStoryOverlays((prev) => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        type: "text",
        value,
        // Start in the middle of the frame
        normalizedX: 0.5,
        normalizedY: 0.5,
        textStyle: storyTextStyleMode, // "normal" or "highlight"
      },
    ]);

    setIsTypingStoryText(false);
    setStoryTextDraft("");
  }

  function addEmojiOverlay(emoji) {
    setStoryOverlays((prev) => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        type: "emoji",
        value: emoji,
        // Near the bottom by default
        normalizedX: 0.5,
        normalizedY: 0.8,
      },
    ]);
  }

  function addStickerOverlay(label) {
    setStoryOverlays((prev) => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        type: "sticker",
        value: label,
        // Near the top by default
        normalizedX: 0.5,
        normalizedY: 0.2,
      },
    ]);
  }

  function clearStoryOverlays() {
    setStoryOverlays([]);
    setIsTypingStoryText(false);
    setStoryTextDraft("");
    setStoryTextStyleMode("normal");
    setSelectedOverlayId(null);
  }

  function promptPhotoStorySource() {
    Alert.alert("Photo story", "How would you like to share your photo story?", [
      { text: "From gallery", onPress: () => pickStoryMedia("image") },
      { text: "Take photo", onPress: () => captureStoryMedia("image") },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function promptVideoStorySource() {
    Alert.alert("Video story", "How would you like to share your video story?", [
      { text: "From gallery", onPress: () => pickStoryMedia("video") },
      { text: "Record video", onPress: () => captureStoryMedia("video") },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function handleAddStoryPress() {
    if (!currentUserId) {
      Alert.alert("Not signed in", "Please sign in again before posting a story.");
      return;
    }

    Alert.alert("New story", "What would you like to create?", [
      { text: "Photo story", onPress: () => promptPhotoStorySource() },
      { text: "Video story", onPress: () => promptVideoStorySource() },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function handleStoryBubblePress(group) {
    if (!group || !group.stories || group.stories.length === 0) return;

    // Keep chronological order for the narrative: oldest → newest
    const sorted = [...group.stories].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

    // Find first unseen story (if any)
    let startIndex = 0;
    let allSeen = true;

    for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i];
      if (!seenStoryIds[s.id]) {
        startIndex = i;
        allSeen = false;
        break;
      }
    }

    // If all are seen, start at the most recent one
    if (allSeen && sorted.length > 0) {
      startIndex = sorted.length - 1;
    }

    setStoryViewerGroup({ ...group, stories: sorted });
    setStoryViewerIndex(startIndex);
  }

  function handleCloseStoryViewer() {
    setStoryViewerGroup(null);
    setStoryViewerIndex(0);
  }

  function handleNextStory() {
    if (!storyViewerGroup) return;
    const total = storyViewerGroup.stories.length;
    if (storyViewerIndex < total - 1) {
      setStoryViewerIndex((idx) => idx + 1);
    } else {
      // Last story → close viewer
      handleCloseStoryViewer();
    }
  }

  function handlePrevStory() {
    if (!storyViewerGroup) return;
    if (storyViewerIndex > 0) {
      setStoryViewerIndex((idx) => idx - 1);
    } else {
      // At first story: just stay on it for now
    }
  }

  // Old helper is still used as a fallback if overlays don't have normalized coords
  function getOverlayPositionStyle(position) {
    switch (position) {
      case "top":
        return { top: 80, alignSelf: "center" };
      case "bottom":
        return { bottom: 90, alignSelf: "center" };
      default:
        // center by default
        return { top: "45%", alignSelf: "center" };
    }
  }

  // New: turn normalized x/y into absolute style inside a given layout
  function getOverlayAbsoluteStyle(overlay, layout) {
    // If overlay has normalized coords and we know layout, use those
    if (
      layout &&
      typeof overlay.normalizedX === "number" &&
      typeof overlay.normalizedY === "number"
    ) {
      const { width, height } = layout;
      const x = overlay.normalizedX * width;
      const y = overlay.normalizedY * height;

      return {
        position: "absolute",
        left: x,
        top: y,
      };
    }

    // Fallback for older overlays that only have "position": "top|center|bottom"
    const posStyle = getOverlayPositionStyle(overlay.position);
    return {
      position: "absolute",
      ...posStyle,
    };
  }

  // New: update a single overlay's position while dragging
  function updateOverlayPosition(id, locationX, locationY, layout) {
    if (!layout) return;
    const { width, height } = layout;
    if (!width || !height) return;

    const normalizedX = Math.min(1, Math.max(0, locationX / width));
    const normalizedY = Math.min(1, Math.max(0, locationY / height));

    setStoryOverlays((prev) =>
      prev.map((o) => (o.id === id ? { ...o, normalizedX, normalizedY } : o))
    );
  }

  // Resize the currently selected overlay (text/emoji/sticker)
  function adjustSelectedOverlayScale(delta) {
    if (!selectedOverlayId) return;

    setStoryOverlays((prev) =>
      prev.map((o) => {
        if (o.id !== selectedOverlayId) return o;
        const current = o.scale ?? 1;
        // Limit between 0.5x and 2.5x
        const next = Math.min(2.5, Math.max(0.5, current + delta));
        return { ...o, scale: next };
      })
    );
  }

  async function handleCreatePost(content, url, isAnonymous, media) {
    if (!content.trim() && !media) {
      Alert.alert("Message required", "Please write something or attach an image.");
      return;
    }

    try {
      setPosting(true);

      // Get current user
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        Alert.alert("Not signed in", "Please sign in again before posting a message.");
        return;
      }

      // ---------- 1) Upload image via Edge Function (if we have an image) ----------
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

          if (fnError) {
            console.log("Edge function error:", fnError);
            throw fnError;
          }

          console.log("Edge function response:", fnData);

          mediaUrl = fnData?.publicUrl ?? null;
          mediaType = contentType;
        } catch (e) {
          console.log("Error uploading image via edge function", e);
          Alert.alert(
            "Upload failed",
            "We couldn’t upload your image. You can still post text only."
          );
        }
      }

      // ---------- 2) Insert the post row ----------
      const payload = {
        user_id: userId,
        community_id: GLOBAL_COMMUNITY_ID,
        content: content.trim(),
        visibility: "global",
        is_anonymous: !!isAnonymous,
      };

      if (url && url.trim()) payload.url = url.trim();
      if (mediaUrl) {
        payload.media_url = mediaUrl;
        payload.media_type = mediaType;
      }

      const { data, error } = await supabase
        .from("posts")
        .insert(payload)
        .select(
          `
        id,
        user_id,
        content,
        url,
        is_anonymous,
        media_url,
        media_type,
        created_at
      `
        )
        .single();

      if (error) throw error;

      const newPost = { ...data, reactions: [], comment_count: 0 };

      // Put new post at the top of the feed
      setPosts((prev) => [newPost, ...prev]);
      setShowNewModal(false);
    } catch (e) {
      console.log("Error creating post", e);
      const msg =
        e?.message ||
        e?.error_description ||
        "We couldn’t post your message right now. Please try again.";
      Alert.alert("Could not post", msg);
    } finally {
      setPosting(false);
    }
  }

  // ---------- REACTIONS ----------
  async function setReaction(postId, newTypeOrNull) {
    if (!currentUserId) {
      Alert.alert("Please sign in", "You need to be signed in to react.");
      return;
    }

    const target = posts.find((p) => p.id === postId);
    if (!target) return;

    const existing = target.reactions?.find((r) => r.user_id === currentUserId) || null;
    const isSame = existing && existing.type === newTypeOrNull;

    const finalType = isSame ? null : newTypeOrNull;

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        let newReactions = (p.reactions || []).filter((r) => r.user_id !== currentUserId);
        if (finalType)
          newReactions = [...newReactions, { user_id: currentUserId, type: finalType }];
        return { ...p, reactions: newReactions };
      })
    );

    setReactionPickerForPost(null);

    try {
      const { error: delError } = await supabase
        .from("post_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", currentUserId);

      if (delError) throw delError;

      if (finalType) {
        const { error: insError } = await supabase.from("post_reactions").insert({
          post_id: postId,
          user_id: currentUserId,
          type: finalType,
        });

        if (insError && insError.code !== "23505") {
          throw insError;
        }
      }
    } catch (e) {
      console.log("Error setting reaction", e);
      Alert.alert(
        "Reaction failed",
        "We couldn’t update your reaction. It might correct itself on refresh."
      );
    }
  }

  function openComments(post) {
    setSelectedPostForComments(post);
    setShowCommentsModal(true);
  }

  function handleCommentAdded(postId) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p
      )
    );
  }

  function confirmDeletePost(postId) {
    Alert.alert(
      "Delete post?",
      "This will remove the post and its reactions/comments for everyone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deletePost(postId) },
      ]
    );
  }

  async function deletePost(postId) {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", currentUserId);

      if (error) throw error;

      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (e) {
      console.log("Error deleting post", e);
      Alert.alert("Delete failed", "We couldn’t delete this post. Please try again.");
    }
  }

  function confirmHidePost(postId) {
    Alert.alert("Hide this post?", "You won’t see this post again in your feed.", [
      { text: "Cancel", style: "cancel" },
      { text: "Hide", style: "destructive", onPress: () => hidePost(postId) },
    ]);
  }

  async function hidePost(postId) {
    if (!currentUserId) return;

    try {
      const { error } = await supabase.from("hidden_posts").insert({
        user_id: currentUserId,
        post_id: postId,
      });

      if (error && error.code !== "23505") {
        throw error;
      }

      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (e) {
      console.log("Error hiding post", e);
      Alert.alert("Hide failed", "We couldn’t hide this post. Please try again.");
    }
  }

  async function sharePost(post) {
    if (!currentUserId) {
      Alert.alert("Please sign in", "You need to be signed in to share.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("posts")
        .insert({
          user_id: currentUserId,
          community_id: GLOBAL_COMMUNITY_ID,
          content: post.content,
          url: post.url,
          media_url: post.media_url,
          media_type: post.media_type,
          visibility: "global",
          is_anonymous: false,
        })
        .select(
          `
          id,
          user_id,
          content,
          url,
          is_anonymous,
          media_url,
          media_type,
          created_at
        `
        )
        .single();

      if (error) throw error;

      const newPost = { ...data, reactions: [], comment_count: 0 };

      setPosts((prev) => [newPost, ...prev]);
      Alert.alert("Shared", "Post shared to your feed.");
    } catch (e) {
      console.log("Error sharing post", e);
      Alert.alert("Share failed", "We couldn’t share this post. Please try again.");
    }
  }

  const renderItem = ({ item }) => {
    const domain = item.url ? getDomainFromUrl(item.url) : null;
    const youtubeThumb = item.url ? getYouTubeThumbnail(item.url) : null;

    const reactions = item.reactions || [];
    const likeCount = reactions.filter((r) => r.type === "like").length;
    const loveCount = reactions.filter((r) => r.type === "love").length;
    const prayCount = reactions.filter((r) => r.type === "pray").length;
    const totalReactions = likeCount + loveCount + prayCount;

    const userReaction = currentUserId ? reactions.find((r) => r.user_id === currentUserId) : null;

    const isOwner = currentUserId && item.user_id === currentUserId;

    let who;
    if (item.is_anonymous) {
      who = "Anonymous";
    } else if (currentUserId && item.user_id === currentUserId) {
      who = "You";
    } else {
      who = "Someone on Triunely";
    }

    const createdLabel = item.created_at ? new Date(item.created_at).toLocaleString() : "";

    const isImage = item.media_url && item.media_type && item.media_type.startsWith("image");

    const initials = (who || "T").slice(0, 1).toUpperCase();

    const socialLeft =
      totalReactions > 0 ? `${totalReactions} reaction${totalReactions === 1 ? "" : "s"}` : "";

    const socialRight =
      item.comment_count && item.comment_count > 0
        ? `${item.comment_count} comment${item.comment_count === 1 ? "" : "s"}`
        : "";

    const likeIcon = userReaction?.type === "like" ? "thumbs-up" : "thumbs-up-outline";
    const commentIcon = "chatbubble-outline";
    const shareIcon = "arrow-redo-outline";

    return (
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: theme.colors.divider,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 10,
        }}
      >
        {/* Header row: avatar + name/time + menu */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.colors.surfaceAlt,
                borderWidth: 1,
                borderColor: theme.colors.divider,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {/* Step C will replace this with real avatar */}
              <Text style={{ color: theme.colors.text2, fontWeight: "900" }}>{initials}</Text>
            </View>

            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text
                style={{
                  color: theme.colors.text,
                  fontWeight: "900",
                  fontSize: 14,
                }}
                numberOfLines={1}
              >
                {who}
              </Text>
              {!!createdLabel && (
                <Text
                  style={{
                    color: theme.colors.muted,
                    fontSize: 12,
                    marginTop: 1,
                  }}
                >
                  {createdLabel}
                </Text>
              )}
            </View>
          </View>

          {currentUserId ? (
            <Pressable
              onPress={() => (isOwner ? confirmDeletePost(item.id) : confirmHidePost(item.id))}
              style={{ paddingHorizontal: 6, paddingVertical: 6 }}
              hitSlop={8}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={theme.colors.muted} />
            </Pressable>
          ) : null}
        </View>

        {/* Body text */}
        {!!item.content && (
          <Text
            style={{
              color: theme.colors.text,
              marginTop: 10,
              fontSize: 15,
              lineHeight: 21,
              fontWeight: "500",
            }}
          >
            {item.content}
          </Text>
        )}

        {/* Image media */}
        {isImage && (
          <View
            style={{
              marginTop: 10,
              borderRadius: 14,
              overflow: "hidden",
              width: "100%",
              backgroundColor: theme.colors.surfaceAlt,
              borderWidth: 1,
              borderColor: theme.colors.divider,
            }}
          >
            <Image
              source={{ uri: item.media_url }}
              style={{ width: "100%", height: undefined, aspectRatio: 1 }}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Link preview */}
        {item.url ? (
          <Pressable
            onPress={() => openUrl(item.url)}
            style={{
              marginTop: 10,
              borderRadius: 14,
              overflow: "hidden",
              backgroundColor: theme.colors.surfaceAlt,
              borderWidth: 1,
              borderColor: theme.colors.divider,
            }}
          >
            {youtubeThumb ? (
              <Image
                source={{ uri: youtubeThumb }}
                style={{ width: "100%", height: 190 }}
                resizeMode="cover"
              />
            ) : null}

            <View style={{ padding: 12 }}>
              <Text
                style={{
                  color: theme.colors.muted,
                  fontSize: 12,
                  fontWeight: "800",
                  marginBottom: 4,
                }}
              >
                {domain ? domain.toUpperCase() : "LINK"}
              </Text>

              <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 13 }}>
                {domain ? `Open on ${domain}` : "Open link"}
              </Text>

              <Text
                style={{
                  color: theme.colors.text2,
                  marginTop: 4,
                  fontSize: 12,
                }}
                numberOfLines={1}
              >
                {item.url}
              </Text>
            </View>
          </Pressable>
        ) : null}

        {/* Social proof row */}
        {(socialLeft || socialRight) && (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 12,
              paddingTop: 10,
              borderTopWidth: 1,
              borderTopColor: theme.colors.divider,
            }}
          >
            <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: "800" }}>
              {socialLeft}
            </Text>
            <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: "800" }}>
              {socialRight}
            </Text>
          </View>
        )}

        {/* Action row (Facebook-style) */}
        <View
          style={{
            flexDirection: "row",
            marginTop: 10,
            borderTopWidth: 1,
            borderTopColor: theme.colors.divider,
          }}
        >
          <FeedActionButton
            icon={likeIcon}
            label="Like"
            active={!!userReaction}
            onPress={() => setReaction(item.id, "like")}
            onLongPress={() => setReactionPickerForPost(item.id)}
          />

          <FeedActionButton
            icon={commentIcon}
            label="Comment"
            active={false}
            onPress={() => openComments(item)}
          />

          <FeedActionButton
            icon={shareIcon}
            label="Share"
            active={false}
            onPress={() => sharePost(item)}
          />
        </View>

        {/* Reaction picker */}
        {reactionPickerForPost === item.id && (
          <View
            style={{
              flexDirection: "row",
              marginTop: 10,
              alignSelf: "flex-start",
              backgroundColor: theme.colors.surfaceAlt,
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: theme.colors.divider,
            }}
          >
            <Pressable onPress={() => setReaction(item.id, "like")} style={{ marginHorizontal: 6 }}>
              <Text style={{ fontSize: 20 }}>👍</Text>
            </Pressable>
            <Pressable onPress={() => setReaction(item.id, "love")} style={{ marginHorizontal: 6 }}>
              <Text style={{ fontSize: 20 }}>❤️</Text>
            </Pressable>
            <Pressable onPress={() => setReaction(item.id, "pray")} style={{ marginHorizontal: 6 }}>
              <Text style={{ fontSize: 20 }}>🙏</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  // ----- STORY GROUPS + YOUR STORY STATE -----
  const storyGroups = groupStoriesByUser(stories);
  const hasOwnStory = currentUserId && storyGroups.some((g) => g.user_id === currentUserId);

  const orderedStoryGroups = storyGroups.slice().sort((a, b) => {
    const aHasUnseen = a.stories.some((s) => !seenStoryIds[s.id]);
    const bHasUnseen = b.stories.some((s) => !seenStoryIds[s.id]);

    if (aHasUnseen && !bHasUnseen) return -1;
    if (!aHasUnseen && bHasUnseen) return 1;

    const aLatest = a.stories[0]?.created_at || 0;
    const bLatest = b.stories[0]?.created_at || 0;
    return new Date(bLatest) - new Date(aLatest);
  });

  function handleYourStoryPress() {
    if (!currentUserId) {
      Alert.alert("Not signed in", "Please sign in again before posting a story.");
      return;
    }

    const ownGroup = orderedStoryGroups.find((g) => g.user_id === currentUserId);

    if (ownGroup) {
      Alert.alert("Your story", "What would you like to do?", [
        { text: "View your story", onPress: () => handleStoryBubblePress(ownGroup) },
        { text: "Add new story", onPress: () => handleAddStoryPress() },
        { text: "Cancel", style: "cancel" },
      ]);
    } else {
      handleAddStoryPress();
    }
  }

  const currentStory = storyViewerGroup && storyViewerGroup.stories[storyViewerIndex];

  const isOwnStoryViewer = storyViewerGroup && currentUserId && storyViewerGroup.user_id === currentUserId;

  const viewerName = isOwnStoryViewer
    ? "You"
    : storyViewerGroup?.profile?.display_name || "Someone on Triunely";

  const currentOverlays =
    currentStory?.overlays && Array.isArray(currentStory.overlays) ? currentStory.overlays : [];

  // Mark a story as "seen" whenever it becomes the current story in the viewer
  useEffect(() => {
    if (!currentStory?.id) return;

    setSeenStoryIds((prev) => {
      if (prev[currentStory.id]) return prev;
      return { ...prev, [currentStory.id]: true };
    });
  }, [currentStory?.id]);

  const renderFeedHeader = () => (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 }}>
      {/* Title + subtitle */}
      <View style={{ marginBottom: 12 }}>
        <Text style={[theme.text.h1, { fontSize: 22 }]}>Home</Text>
        <Text style={[theme.text.sub, { marginTop: 2, color: theme.colors.sageSoft }]}>
          Encouragements and shared links from Triunely.
        </Text>
      </View>

      {/* Stories */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: theme.colors.sage, fontWeight: "800", marginBottom: 8 }}>
          Stories
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 4 }}
        >
          {/* Your story bubble */}
          <Pressable onPress={handleYourStoryPress} style={{ alignItems: "center", marginRight: 14 }}>
            <View style={{ position: "relative" }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  borderWidth: 2,
                  borderColor: hasOwnStory ? theme.colors.gold : theme.colors.goldOutline,
                  overflow: "hidden",
                  backgroundColor: theme.colors.surfaceAlt,
                }}
              >
                {profileAvatarUrl ? (
                  <Image source={{ uri: profileAvatarUrl }} style={{ width: 64, height: 64 }} />
                ) : (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: theme.colors.text, fontWeight: "900" }}>You</Text>
                  </View>
                )}
              </View>

              {/* + badge */}
              <View
                style={{
                  position: "absolute",
                  bottom: -2,
                  right: -2,
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: theme.colors.gold,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: theme.colors.surface,
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "900", marginTop: -1 }}>+</Text>
              </View>
            </View>

            <Text style={{ color: theme.colors.muted, fontSize: 12, marginTop: 6 }}>Your story</Text>
          </Pressable>

          {/* Other users' stories */}
          {storiesLoading && orderedStoryGroups.length === 0 ? (
            <View style={{ justifyContent: "center", alignItems: "center", paddingHorizontal: 10 }}>
              <ActivityIndicator size="small" color={theme.colors.gold} />
            </View>
          ) : (
            orderedStoryGroups
              .filter((g) => g.user_id !== currentUserId)
              .map((group) => {
                const avatar = group.profile?.avatar_url || null;
                const name = group.profile?.display_name || "Someone on Triunely";

                const hasUnseen = group.stories?.some((s) => !seenStoryIds[s.id]);

                return (
                  <Pressable
                    key={group.user_id}
                    onPress={() => handleStoryBubblePress(group)}
                    style={{ alignItems: "center", marginRight: 14 }}
                  >
                    <View
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        borderWidth: 2,
                        borderColor: hasUnseen ? theme.colors.gold : theme.colors.divider,
                        overflow: "hidden",
                        backgroundColor: theme.colors.surfaceAlt,
                      }}
                    >
                      {avatar ? (
                        <Image source={{ uri: avatar }} style={{ width: 64, height: 64 }} />
                      ) : (
                        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ color: theme.colors.text2, fontWeight: "900" }}>
                            {name.slice(0, 1).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text
                      style={{ color: theme.colors.muted, fontSize: 12, marginTop: 6, maxWidth: 72 }}
                      numberOfLines={1}
                    >
                      {name}
                    </Text>
                  </Pressable>
                );
              })
          )}
        </ScrollView>
      </View>

      {/* Composer */}
      <GlowCard innerStyle={{ padding: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {profileAvatarUrl ? (
            <Image
              source={{ uri: profileAvatarUrl }}
              style={{ width: 38, height: 38, borderRadius: 19, marginRight: 10 }}
            />
          ) : (
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: theme.colors.surfaceAlt,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
                borderWidth: 1,
                borderColor: theme.colors.divider,
              }}
            >
              <Text style={{ color: theme.colors.text2, fontWeight: "900" }}>Y</Text>
            </View>
          )}

          <Pressable
            onPress={() => setShowNewModal(true)}
            style={{
              flex: 1,
              backgroundColor: theme.colors.surfaceAlt,
              borderRadius: 999,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: theme.colors.divider,
            }}
          >
            <Text style={{ color: theme.colors.muted, fontSize: 14, fontWeight: "700" }}>
              What’s on your heart?
            </Text>
          </Pressable>

          <Pressable onPress={() => setShowNewModal(true)} style={{ marginLeft: 10, padding: 6 }}>
            <Text style={{ fontSize: 18, color: theme.colors.text2 }}>📷</Text>
          </Pressable>
        </View>
      </GlowCard>

      {error ? <Text style={{ color: theme.colors.danger, marginTop: 10 }}>{error}</Text> : null}
    </View>
  );
  return (
    <Screen backgroundColor={theme.colors.bg} padded={false} style={{ flex: 1 }} contentStyle={{ flex: 1 }}>
      {({ bottomPad }) => (
        <>
          {loading ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator size="large" color={theme.colors.gold} />
              <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Loading posts…</Text>
            </View>
          ) : (
            <FlatList
              data={posts}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              ListHeaderComponent={renderFeedHeader}
              contentContainerStyle={{
                paddingHorizontal: 0,
                paddingTop: 0,
                paddingBottom: bottomPad + 16,
                backgroundColor: theme.colors.bg,
              }}
              ItemSeparatorComponent={() => <View style={{ height: 10, backgroundColor: theme.colors.bg }} />}
              onRefresh={() => {
                fetchPosts(true);
                loadStories();
              }}
              refreshing={refreshing}
              ListEmptyComponent={
                <Text style={{ color: theme.colors.muted, textAlign: "center", marginTop: 20 }}>
                  No posts yet. Be the first to share something encouraging.
                </Text>
              }
            />
          )}

          <NewPostModal
            visible={showNewModal}
            onClose={() => {
              if (!posting) setShowNewModal(false);
            }}
            onSubmit={handleCreatePost}
            loading={posting}
          />

          <PostCommentsModal
            visible={showCommentsModal}
            onClose={() => setShowCommentsModal(false)}
            post={selectedPostForComments}
            currentUserId={currentUserId}
            onCommentAdded={handleCommentAdded}
          />

          {/* STORY PREVIEW OVERLAY (before upload, with text/emoji/stickers) */}
          {storyPreview && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.95)",
                zIndex: 1001,
                paddingTop: insets.top + 10,
                paddingBottom: insets.bottom + 10,
              }}
            >
              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Preview story</Text>
                <Pressable
                  onPress={handleCancelStoryPreview}
                  style={{ paddingHorizontal: 8, paddingVertical: 4 }}
                  disabled={storyPosting}
                >
                  <Text style={{ color: "#fff", fontSize: 18 }}>✕</Text>
                </Pressable>
              </View>

              {/* Optional text input row for adding overlay text */}
              {isTypingStoryText && (
                <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#111827",
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                    }}
                  >
                    <TextInput
                      value={storyTextDraft}
                      onChangeText={setStoryTextDraft}
                      placeholder="Type your text…"
                      placeholderTextColor="#9CA3AF"
                      style={{ flex: 1, color: "#fff", paddingVertical: 6 }}
                    />
                    <Pressable
                      onPress={handleAddTextOverlay}
                      style={{
                        marginLeft: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor: theme.colors.gold,
                      }}
                    >
                      <Text style={{ color: theme.colors.text, fontWeight: "800" }}>Add</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Content with overlays on top */}
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: 10,
                  position: "relative",
                }}
                onLayout={(e) => setStoryCanvasLayout(e.nativeEvent.layout)}
              >
                {storyPreview.mediaType === "image" ? (
                  <Image
                    source={{ uri: storyPreview.uri }}
                    style={{ width: "100%", height: "100%", borderRadius: 12 }}
                    resizeMode="contain"
                  />
                ) : isYouTubeUrl(storyPreview?.uri) ? (
  <Pressable
    onPress={() => Linking.openURL(storyPreview.uri)}
    style={{
      width: "100%",
      height: "100%",
      borderRadius: 12,
      backgroundColor: "#000",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    }}
  >
    <Text style={{ color: "#fff", fontWeight: "800", textAlign: "center" }}>
      YouTube videos can’t play here. Tap to open in YouTube.
    </Text>
  </Pressable>
) : (
  <Video
    source={{ uri: storyPreview.uri }}
    style={{
      width: "100%",
      height: "100%",
      borderRadius: 12,
      backgroundColor: "#000",
    }}
    resizeMode="contain"
    shouldPlay
    isLooping
    useNativeControls
  />
)}


                {/* Render overlays for this draft story (draggable in preview) */}
                {storyOverlays.map((overlay) => {
                  const baseStyle = getOverlayAbsoluteStyle(overlay, storyCanvasLayout);

                  if (overlay.type === "emoji") {
                    const scale = overlay.scale ?? 1;
                    const fontSize = 40 * scale;

                    return (
                      <View
                        key={overlay.id}
                        style={baseStyle}
                        onStartShouldSetResponder={() => true}
                        onResponderGrant={() => setSelectedOverlayId(overlay.id)}
                        onResponderMove={(e) => {
                          if (!storyCanvasLayout) return;
                          const { pageX, pageY } = e.nativeEvent;
                          const { x, y } = storyCanvasLayout;
                          const localX = pageX - x;
                          const localY = pageY - y;
                          updateOverlayPosition(overlay.id, localX, localY, storyCanvasLayout);
                        }}
                      >
                        <Text
                          style={{
                            fontSize,
                            textShadowColor: "rgba(0,0,0,0.6)",
                            textShadowOffset: { width: 0, height: 2 },
                            textShadowRadius: 4,
                          }}
                        >
                          {overlay.value}
                        </Text>
                      </View>
                    );
                  }

                  const isSticker = overlay.type === "sticker";
                  const isHighlight = overlay.textStyle === "highlight" && overlay.type === "text";

                  const bgColor = isSticker || isHighlight ? "rgba(0,0,0,0.65)" : "transparent";

                  const baseFontSize = isSticker || isHighlight ? 20 : 16;
                  const scale = overlay.scale ?? 1;
                  const fontSize = baseFontSize * scale;
                  const fontWeight = isSticker || isHighlight ? "700" : "600";

                  const isSelected = selectedOverlayId === overlay.id;

                  return (
                    <View
                      key={overlay.id}
                      style={[
                        baseStyle,
                        {
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 999,
                          backgroundColor: bgColor,
                          borderWidth: isSelected ? 2 : isSticker ? 1 : 0,
                          borderColor: isSelected ? "#3B82F6" : isSticker ? "#FBBF24" : "transparent",
                        },
                      ]}
                      onStartShouldSetResponder={() => true}
                      onResponderGrant={() => setSelectedOverlayId(overlay.id)}
                      onResponderMove={(e) => {
                        if (!storyCanvasLayout) return;
                        const { pageX, pageY } = e.nativeEvent;
                        const { x, y } = storyCanvasLayout;
                        const localX = pageX - x;
                        const localY = pageY - y;
                        updateOverlayPosition(overlay.id, localX, localY, storyCanvasLayout);
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontWeight,
                          fontSize,
                          textTransform: isSticker ? "uppercase" : "none",
                          textShadowColor: "rgba(0,0,0,0.8)",
                          textShadowOffset: { width: 0, height: 1 },
                          textShadowRadius: 3,
                          letterSpacing: isSticker ? 1 : 0.2,
                        }}
                      >
                        {overlay.value}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* PREVIEW TOOLBAR + ACTIONS (FIXED: viewer code removed from preview) */}
              <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
                {/* Top row tools */}
                <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                  <Pressable
                    onPress={() => setIsTypingStoryText((v) => !v)}
                    style={{
                      flex: 1,
                      backgroundColor: "rgba(255,255,255,0.10)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.16)",
                      paddingVertical: 10,
                      borderRadius: 999,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "800" }}>Text</Text>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      Alert.alert("Add emoji", "Choose one", [
                        { text: "🙏", onPress: () => addEmojiOverlay("🙏") },
                        { text: "❤️", onPress: () => addEmojiOverlay("❤️") },
                        { text: "👍", onPress: () => addEmojiOverlay("👍") },
                        { text: "😇", onPress: () => addEmojiOverlay("😇") },
                        { text: "Cancel", style: "cancel" },
                      ])
                    }
                    style={{
                      flex: 1,
                      backgroundColor: "rgba(255,255,255,0.10)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.16)",
                      paddingVertical: 10,
                      borderRadius: 999,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "800" }}>Emoji</Text>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      Alert.alert("Add sticker", "Choose one", [
                        { text: "AMEN", onPress: () => addStickerOverlay("AMEN") },
                        { text: "GOD IS GOOD", onPress: () => addStickerOverlay("GOD IS GOOD") },
                        { text: "PRAYING", onPress: () => addStickerOverlay("PRAYING") },
                        { text: "BLESSED", onPress: () => addStickerOverlay("BLESSED") },
                        { text: "Cancel", style: "cancel" },
                      ])
                    }
                    style={{
                      flex: 1,
                      backgroundColor: "rgba(255,255,255,0.10)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.16)",
                      paddingVertical: 10,
                      borderRadius: 999,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "800" }}>Sticker</Text>
                  </Pressable>
                </View>

                {/* Second row: highlight + size + delete */}
                <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                  <Pressable
                    onPress={() =>
                      setStoryTextStyleMode((m) => (m === "highlight" ? "normal" : "highlight"))
                    }
                    style={{
                      flex: 1,
                      backgroundColor:
                        storyTextStyleMode === "highlight"
                          ? "rgba(255,215,0,0.30)"
                          : "rgba(255,255,255,0.10)",
                      borderWidth: 1,
                      borderColor:
                        storyTextStyleMode === "highlight"
                          ? "rgba(255,215,0,0.65)"
                          : "rgba(255,255,255,0.16)",
                      paddingVertical: 10,
                      borderRadius: 999,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "900" }}>Highlight</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => adjustSelectedOverlayScale(-0.1)}
                    disabled={!selectedOverlayId}
                    style={{
                      width: 52,
                      backgroundColor: selectedOverlayId ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.16)",
                      paddingVertical: 10,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: selectedOverlayId ? 1 : 0.5,
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "900" }}>−</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => adjustSelectedOverlayScale(0.1)}
                    disabled={!selectedOverlayId}
                    style={{
                      width: 52,
                      backgroundColor: selectedOverlayId ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.16)",
                      paddingVertical: 10,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: selectedOverlayId ? 1 : 0.5,
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "900" }}>+</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      if (!selectedOverlayId) return;
                      setStoryOverlays((prev) => prev.filter((o) => o.id !== selectedOverlayId));
                      setSelectedOverlayId(null);
                    }}
                    disabled={!selectedOverlayId}
                    style={{
                      width: 52,
                      backgroundColor: selectedOverlayId ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.05)",
                      borderWidth: 1,
                      borderColor: selectedOverlayId ? "rgba(239,68,68,0.55)" : "rgba(255,255,255,0.16)",
                      paddingVertical: 10,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: selectedOverlayId ? 1 : 0.5,
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "900" }}>🗑</Text>
                  </Pressable>
                </View>

                {/* Bottom actions */}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pressable
                    onPress={handleCancelStoryPreview}
                    disabled={storyPosting}
                    style={{
                      flex: 1,
                      backgroundColor: "rgba(255,255,255,0.10)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.16)",
                      paddingVertical: 12,
                      borderRadius: 999,
                      alignItems: "center",
                      opacity: storyPosting ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "900" }}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    onPress={handlePostStoryFromPreview}
                    disabled={storyPosting}
                    style={{
                      flex: 1,
                      backgroundColor: theme.colors.gold,
                      paddingVertical: 12,
                      borderRadius: 999,
                      alignItems: "center",
                      opacity: storyPosting ? 0.7 : 1,
                    }}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                      {storyPosting ? "Posting…" : "Post story"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          {/* STORY VIEWER OVERLAY (ONLY ONCE) */}
          {storyViewerGroup && currentStory && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.95)",
                zIndex: 999,
                paddingTop: 0, // FIX: was 40; we already use insets.top in the header container
              }}
            >
              {/* Progress bars */}
              <View style={{ paddingHorizontal: 10, paddingTop: insets.top + 8 }}>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {storyViewerGroup.stories.map((s, idx) => {
                    const done = idx < storyViewerIndex;
                    const active = idx === storyViewerIndex;
                    return (
                      <View
                        key={s.id}
                        style={{
                          flex: 1,
                          height: 3,
                          borderRadius: 999,
                          backgroundColor: "rgba(255,255,255,0.18)",
                          overflow: "hidden",
                        }}
                      >
                        <View
                          style={{
                            width: done ? "100%" : active ? "60%" : "0%",
                            height: "100%",
                            backgroundColor: "rgba(255,215,0,0.95)",
                          }}
                        />
                      </View>
                    );
                  })}
                </View>

                {/* Header */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 10,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: "rgba(255,255,255,0.10)",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.12)",
                        overflow: "hidden",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {storyViewerGroup?.profile?.avatar_url ? (
                        <Image
                          source={{ uri: storyViewerGroup.profile.avatar_url }}
                          style={{ width: 36, height: 36 }}
                        />
                      ) : (
                        <Text style={{ color: "#fff", fontWeight: "900" }}>
                          {viewerName?.slice(0, 1)?.toUpperCase() || "T"}
                        </Text>
                      )}
                    </View>

                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={{ color: "#fff", fontWeight: "900" }} numberOfLines={1}>
                        {viewerName}
                      </Text>
                      <Text style={{ color: "rgba(255,255,255,0.70)", fontSize: 12, marginTop: 1 }}>
                        {currentStory?.created_at ? new Date(currentStory.created_at).toLocaleString() : ""}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={handleCloseStoryViewer}
                    style={{ paddingHorizontal: 10, paddingVertical: 6 }}
                    hitSlop={10}
                  >
                    <Text style={{ color: "#fff", fontSize: 18 }}>✕</Text>
                  </Pressable>
                </View>
              </View>

              {/* Story content */}
              <View
                style={{
                  flex: 1,
                  marginTop: 12,
                  marginBottom: insets.bottom + 12,
                  paddingHorizontal: 10,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    overflow: "hidden",
                    backgroundColor: "#000",
                  }}
                  onLayout={(e) => setViewerCanvasLayout(e.nativeEvent.layout)}
                >
                  {currentStory.media_type === "image" ? (
                    <Image
                      source={{ uri: currentStory.media_url }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Video
                      source={{ uri: currentStory.media_url }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                      shouldPlay
                      isLooping
                      useNativeControls={false}
                    />
                  )}

                  {/* Overlays */}
                  {currentOverlays.map((overlay) => {
                    const baseStyle = getOverlayAbsoluteStyle(overlay, viewerCanvasLayout);

                    if (overlay.type === "emoji") {
                      const scale = overlay.scale ?? 1;
                      const fontSize = 40 * scale;
                      return (
                        <View key={overlay.id} style={baseStyle}>
                          <Text
                            style={{
                              fontSize,
                              textShadowColor: "rgba(0,0,0,0.6)",
                              textShadowOffset: { width: 0, height: 2 },
                              textShadowRadius: 4,
                            }}
                          >
                            {overlay.value}
                          </Text>
                        </View>
                      );
                    }

                    const isSticker = overlay.type === "sticker";
                    const isHighlight = overlay.textStyle === "highlight" && overlay.type === "text";

                    const bgColor = isSticker || isHighlight ? "rgba(0,0,0,0.65)" : "transparent";

                    const baseFontSize = isSticker || isHighlight ? 20 : 16;
                    const scale = overlay.scale ?? 1;
                    const fontSize = baseFontSize * scale;
                    const fontWeight = isSticker || isHighlight ? "900" : "700";

                    return (
                      <View
                        key={overlay.id}
                        style={[
                          baseStyle,
                          {
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 999,
                            backgroundColor: bgColor,
                            borderWidth: isSticker ? 1 : 0,
                            borderColor: isSticker ? "rgba(255,215,0,0.55)" : "transparent",
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: "#fff",
                            fontWeight,
                            fontSize,
                            textTransform: isSticker ? "uppercase" : "none",
                            textShadowColor: "rgba(0,0,0,0.8)",
                            textShadowOffset: { width: 0, height: 1 },
                            textShadowRadius: 3,
                            letterSpacing: isSticker ? 1 : 0.2,
                          }}
                        >
                          {overlay.value}
                        </Text>
                      </View>
                    );
                  })}

                  {/* Tap zones (prev / next) */}
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      flexDirection: "row",
                    }}
                    pointerEvents="box-none"
                  >
                    <Pressable style={{ flex: 1 }} onPress={handlePrevStory} />
                    <Pressable style={{ flex: 1 }} onPress={handleNextStory} />
                  </View>
                </View>

                <Text
                  style={{
                    color: "rgba(255,255,255,0.65)",
                    fontSize: 12,
                    marginTop: 10,
                    textAlign: "center",
                  }}
                >
                  Tap left/right to navigate
                </Text>
              </View>
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
