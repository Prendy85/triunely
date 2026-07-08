// src/screens/ChurchFeed.js
import { Ionicons } from "@expo/vector-icons";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import NewPostModal from "../components/NewPostModal";
import PostCard from "../components/PostCard";
import PostCommentsModal from "../components/PostCommentsModal";
import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";
import { isFeedVideoMedia, uploadFeedMedia } from "../lib/uploadFeedMedia";
import { theme } from "../theme/theme";

const PAGE_LIMIT = 50;

function cleanText(value) {
  const text = String(value || "").trim();
  return text || null;
}

function normalizeLinkedContent(raw) {
  if (!raw || typeof raw !== "object") return null;

  const type = cleanText(raw.link_type || raw.type);

  if (!["event", "group", "course", "church", "registration"].includes(type)) {
    return null;
  }

  return {
    link_type: type,

    linked_event_id:
      raw.linked_event_id || raw.eventId || raw.event_id || null,

    linked_group_id:
      raw.linked_group_id || raw.groupId || raw.group_id || null,

    linked_course_id:
      raw.linked_course_id || raw.courseId || raw.course_id || null,

    linked_church_id:
      raw.linked_church_id || raw.churchId || raw.church_id || null,

    linked_title:
      cleanText(raw.linked_title || raw.title || raw.name) || "Shared church item",

    linked_subtitle:
      cleanText(raw.linked_subtitle || raw.subtitle) || null,

    linked_description:
      cleanText(raw.linked_description || raw.description) || null,

    linked_image_url:
      cleanText(raw.linked_image_url || raw.image_url || raw.imageUrl) || null,

    linked_button_label:
      cleanText(raw.linked_button_label || raw.buttonLabel) ||
      (type === "event"
        ? "View Event"
        : type === "group"
        ? "Open Group"
        : type === "course"
        ? "View Course"
        : "Open"),

    linked_visibility:
      cleanText(raw.linked_visibility || raw.visibility) || "church",

    linked_payload:
      raw.linked_payload && typeof raw.linked_payload === "object"
        ? raw.linked_payload
        : {},
  };
}

const churchFeedColors = {
  cream: "#FFF8EC",
  creamDeep: "#F7EBD8",
  card: "#FFFDF7",
  border: "#E7D8BE",
  brown: "#4A321F",
  brownSoft: "#7A5A3A",
  olive: "#6F7D4F",
  oliveDark: "#56633D",
  oliveSoft: "#EEF2E4",
};

export default function ChurchFeed({ route, navigation }) {
  const insets = useSafeAreaInsets();

  const {
    churchId,
    churchName,
    churchFeedCommunityId: routeChurchFeedCommunityId,
    sharedLinkedContent,
  } = route?.params || {};

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [showNewModal, setShowNewModal] = useState(false);
  const [posting, setPosting] = useState(false);
  const [linkedContentForPost, setLinkedContentForPost] = useState(null);

  const [currentUserId, setCurrentUserId] = useState(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(null);
  const [profilesById, setProfilesById] = useState({});

  const [churchProfile, setChurchProfile] = useState(null);
  const [resolvedFeedCommunityId, setResolvedFeedCommunityId] = useState(
    routeChurchFeedCommunityId || null
  );

  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState(null);

  const [reactionPickerForPost, setReactionPickerForPost] = useState(null);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const feedCommunityId = resolvedFeedCommunityId || routeChurchFeedCommunityId || null;

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    if (!q) return posts;

    return posts.filter((p) => {
      const content = (p.content || "").toLowerCase();
      const url = (p.url || "").toLowerCase();

      return content.includes(q) || url.includes(q);
    });
  }, [posts, searchQuery]);

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", userId)
        .single();

      if (error) return;

      setProfileAvatarUrl(data?.avatar_url ?? null);
    } catch (e) {
      console.log("ChurchFeed fetchProfile error:", e);
    }
  }

  async function fetchProfilesForUsers(userIds) {
    try {
      const ids = Array.from(new Set((userIds || []).filter(Boolean)));

      if (ids.length === 0) return;

      const missing = ids.filter((id) => !profilesById[id]);

      if (missing.length === 0) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", missing);

      if (error) return;

      const next = {};

      (data || []).forEach((p) => {
        if (!p?.id) return;

        next[p.id] = {
          id: p.id,
          display_name: p.display_name || null,
          avatar_url: p.avatar_url || null,
        };
      });

      setProfilesById((prev) => ({ ...prev, ...next }));
    } catch (e) {
      console.log("ChurchFeed fetchProfilesForUsers error:", e);
    }
  }

  async function fetchChurchProfile() {
    if (!churchId) {
      setChurchProfile(null);
      setResolvedFeedCommunityId(routeChurchFeedCommunityId || null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("churches")
        .select(
          "id, display_name, name, avatar_url, cover_image_url, about, location, feed_community_id"
        )
        .eq("id", churchId)
        .maybeSingle();

      if (error) {
        console.log("ChurchFeed fetchChurchProfile error:", error);
        setChurchProfile(null);
        setResolvedFeedCommunityId(routeChurchFeedCommunityId || null);
        return;
      }

      setChurchProfile(data || null);

      const linkedFeedId = data?.feed_community_id || routeChurchFeedCommunityId || null;
      setResolvedFeedCommunityId(linkedFeedId);
    } catch (e) {
      console.log("ChurchFeed fetchChurchProfile catch:", e);
      setChurchProfile(null);
      setResolvedFeedCommunityId(routeChurchFeedCommunityId || null);
    }
  }

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) return;

      const userId = data?.session?.user?.id ?? null;

      setCurrentUserId(userId);

      if (userId) fetchProfile(userId);
    })();
  }, []);

  useEffect(() => {
    fetchChurchProfile();
  }, [churchId, routeChurchFeedCommunityId]);
    useEffect(() => {
    const normalized = normalizeLinkedContent(sharedLinkedContent);

    if (!normalized) return;

    setLinkedContentForPost(normalized);
    setShowNewModal(true);
  }, [sharedLinkedContent]);

  async function fetchPosts(isRefresh = false) {
    if (!feedCommunityId) {
      setPosts([]);
      setError("This church feed is not linked yet.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

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
          link_title,
          link_description,
          link_image,
          is_anonymous,
          media_url,
          media_type,

          link_type,
          linked_event_id,
          linked_group_id,
          linked_course_id,
          linked_church_id,
          linked_title,
          linked_subtitle,
          linked_description,
          linked_image_url,
          linked_button_label,
          linked_visibility,
          linked_payload,

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
        .eq("community_id", feedCommunityId)
        .eq("visibility", "church")
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
            link_title: row.link_title,
            link_description: row.link_description,
            link_image: row.link_image,
            is_anonymous: row.is_anonymous,
            media_url: row.media_url,
            media_type: row.media_type,

            link_type: row.link_type,
            linked_event_id: row.linked_event_id,
            linked_group_id: row.linked_group_id,
            linked_course_id: row.linked_course_id,
            linked_church_id: row.linked_church_id,
            linked_title: row.linked_title,
            linked_subtitle: row.linked_subtitle,
            linked_description: row.linked_description,
            linked_image_url: row.linked_image_url,
            linked_button_label: row.linked_button_label,
            linked_visibility: row.linked_visibility,
            linked_payload: row.linked_payload || {},

            created_at: row.created_at,
            reactions: row.post_reactions || [],
            comment_count: commentCount,
          };
        }) ?? [];

      setPosts(mapped);

      const authorIds = mapped
        .filter((p) => !p.is_anonymous)
        .map((p) => p.user_id)
        .filter(Boolean);

      if (currentUserId) authorIds.push(currentUserId);

      fetchProfilesForUsers(authorIds);
    } catch (e) {
      console.log("ChurchFeed fetchPosts error:", e);
      setError("Could not load church posts right now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (feedCommunityId) fetchPosts(false);
  }, [feedCommunityId, currentUserId]);


  async function handleCreatePost(content, url, isAnonymous, media) {
    const linkedPayload = normalizeLinkedContent(linkedContentForPost);

    if (!content.trim() && !media && !linkedPayload) {
      Alert.alert("Message required", "Please write something or attach media.");
      return;
    }

    if (!feedCommunityId) {
      Alert.alert(
        "Church feed not linked",
        "This church does not have a linked feed yet. Please check the church setup."
      );
      return;
    }

    try {
      setPosting(true);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        Alert.alert("Not signed in", "Please sign in again before posting a message.");
        return;
      }

      let mediaUrl = null;
      let mediaType = null;

      if (media && media.uri) {
        try {
          const uploaded = await uploadFeedMedia({
            media,
            scope: "posts",
            ownerId: userId,
            folderId: feedCommunityId,
          });

          mediaUrl = uploaded.mediaUrl;
          mediaType = uploaded.mediaType;
        } catch (e) {
          console.log("ChurchFeed media upload error RAW:", e);

          console.log("ChurchFeed media upload error DETAILS:", {
            message: e?.message,
            name: e?.name,
            status: e?.status,
            statusCode: e?.statusCode,
            error: e?.error,
            details: e?.details,
            hint: e?.hint,
            stack: e?.stack,
            media,
          });

          Alert.alert(
            "Upload failed",
            isFeedVideoMedia(media)
              ? `Video upload failed: ${e?.message || "Unknown upload error."}`
              : `Image upload failed: ${e?.message || "Unknown upload error."}`
          );

          return;
        }
      }

      const payload = {
        user_id: userId,
        community_id: feedCommunityId,
        content: content.trim(),
        visibility: "church",
        is_anonymous: !!isAnonymous,
      };

      if (linkedPayload) {

        payload.link_type = linkedPayload.link_type;
        payload.linked_event_id = linkedPayload.linked_event_id;
        payload.linked_group_id = linkedPayload.linked_group_id;
        payload.linked_course_id = linkedPayload.linked_course_id;
        payload.linked_church_id = linkedPayload.linked_church_id;
        payload.linked_title = linkedPayload.linked_title;
        payload.linked_subtitle = linkedPayload.linked_subtitle;
        payload.linked_description = linkedPayload.linked_description;
        payload.linked_image_url = linkedPayload.linked_image_url;
        payload.linked_button_label = linkedPayload.linked_button_label;
        payload.linked_visibility = linkedPayload.linked_visibility;
        payload.linked_payload = linkedPayload.linked_payload;
      }

      if (url && url.trim()) payload.url = url.trim();

      if (mediaUrl) {
        payload.media_url = mediaUrl;
        payload.media_type = mediaType;
      }

      let linkPreview = null;

      if (url && url.trim()) {
        try {
          const { data: previewData, error: previewError } =
            await supabase.functions.invoke("link-preview", {
              body: { url: url.trim() },
            });

          console.log("link-preview data:", previewData);
          console.log("link-preview error:", previewError);

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
          content,
          url,
          link_title,
          link_description,
          link_image,
          is_anonymous,
          media_url,
          media_type,

          link_type,
          linked_event_id,
          linked_group_id,
          linked_course_id,
          linked_church_id,
          linked_title,
          linked_subtitle,
          linked_description,
          linked_image_url,
          linked_button_label,
          linked_visibility,
          linked_payload,

          created_at
        `
        )
        .single();

      if (error) throw error;

      const newPost = { ...data, reactions: [], comment_count: 0 };

      setPosts((prev) => [newPost, ...prev]);

      if (!newPost.is_anonymous && newPost.user_id) {
        fetchProfilesForUsers([newPost.user_id]);
      }

      setShowNewModal(false);
      setLinkedContentForPost(null);
    } catch (e) {
      console.log("ChurchFeed createPost error:", e);

      const msg =
        e?.message ||
        e?.error_description ||
        "We couldn’t post your message right now. Please try again.";

      Alert.alert("Could not post", msg);
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
      prev.map((p) =>
        p.id === postId
          ? { ...p, comment_count: (p.comment_count || 0) + 1 }
          : p
      )
    );
  }

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

        let newReactions = (p.reactions || []).filter(
          (r) => r.user_id !== currentUserId
        );

        if (finalType) {
          newReactions = [
            ...newReactions,
            { user_id: currentUserId, type: finalType },
          ];
        }

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

        if (insError && insError.code !== "23505") throw insError;
      }
    } catch (e) {
      console.log("ChurchFeed setReaction error:", e);
      Alert.alert(
        "Reaction failed",
        "We couldn’t update your reaction. It might correct itself on refresh."
      );
    }
  }

  async function sharePost(post) {
    if (!currentUserId) {
      Alert.alert("Please sign in", "You need to be signed in to share.");
      return;
    }

    if (!feedCommunityId) {
      Alert.alert(
        "Church feed not linked",
        "This church does not have a linked feed yet. Please check the church setup."
      );
      return;
    }

    try {
      const { data, error } = await supabase
        .from("posts")
        .insert({
          user_id: currentUserId,
          community_id: feedCommunityId,
          content: post.content,
          url: post.url,
          media_url: post.media_url,
          media_type: post.media_type,
          visibility: "church",
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

      if (newPost.user_id) fetchProfilesForUsers([newPost.user_id]);

      Alert.alert("Shared", "Post shared to the church feed.");
    } catch (e) {
      console.log("ChurchFeed sharePost error:", e);
      Alert.alert("Share failed", "We couldn’t share this post. Please try again.");
    }
  }

  const renderHeader = () => {
    const displayChurchName =
      churchProfile?.display_name || churchProfile?.name || churchName || "Church Feed";

    const displayLocation = churchProfile?.location || null;
    const avatarUrl = churchProfile?.avatar_url || null;

    return (
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: insets.top + 10,
          paddingBottom: 14,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: churchFeedColors.border,
              backgroundColor: churchFeedColors.card,
            }}
            hitSlop={10}
          >
            <Ionicons name="arrow-back" size={20} color={churchFeedColors.brownSoft} />
          </Pressable>

          <Text
            style={{
              color: churchFeedColors.brown,
              fontWeight: "900",
              fontSize: 16,
              flex: 1,
              textAlign: "center",
              marginHorizontal: 10,
            }}
            numberOfLines={1}
          >
            {displayChurchName}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
              onPress={() => setShowSearch(true)}
              hitSlop={10}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: churchFeedColors.card,
                borderWidth: 1,
                borderColor: churchFeedColors.border,
              }}
            >
              <Ionicons name="search-outline" size={19} color={churchFeedColors.brownSoft} />
            </Pressable>

            <Pressable
              onPress={() => setShowNewModal(true)}
              hitSlop={10}
              style={({ pressed }) => ({
                width: 38,
                height: 38,
                borderRadius: 19,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed
                  ? churchFeedColors.creamDeep
                  : churchFeedColors.oliveSoft,
                borderWidth: 1,
                borderColor: churchFeedColors.olive,
              })}
            >
              <Ionicons name="add" size={22} color={churchFeedColors.olive} />
            </Pressable>
          </View>
        </View>

        <View
          style={{
            marginTop: 16,
            backgroundColor: churchFeedColors.card,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: churchFeedColors.border,
            padding: 16,
            overflow: "hidden",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 29,
                backgroundColor: churchFeedColors.oliveSoft,
                borderWidth: 1,
                borderColor: churchFeedColors.border,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons
                  name="business-outline"
                  size={25}
                  color={churchFeedColors.olive}
                />
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: churchFeedColors.brown,
                  fontSize: 18,
                  fontWeight: "900",
                }}
                numberOfLines={2}
              >
                {displayChurchName}
              </Text>

              {!!displayLocation && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    marginTop: 4,
                  }}
                >
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color={churchFeedColors.olive}
                  />

                  <Text
                    style={{
                      color: churchFeedColors.brownSoft,
                      fontSize: 12,
                      fontWeight: "800",
                    }}
                    numberOfLines={1}
                  >
                    {displayLocation}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View
            style={{
              marginTop: 14,
              backgroundColor: churchFeedColors.cream,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: churchFeedColors.border,
              padding: 14,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: churchFeedColors.oliveSoft,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 1,
                }}
              >
                <Ionicons
                  name="people-outline"
                  size={18}
                  color={churchFeedColors.olive}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: churchFeedColors.brown,
                    fontSize: 15,
                    fontWeight: "900",
                    lineHeight: 20,
                  }}
                >
                  Welcome to the church feed
                </Text>

                <Text
                  style={{
                    color: churchFeedColors.brownSoft,
                    fontSize: 13,
                    fontWeight: "700",
                    lineHeight: 19,
                    marginTop: 5,
                  }}
                >
                  A shared space for testimonies, prayer needs, encouragements and updates
                  from your church family.
                </Text>

                <Text
                  style={{
                    color: churchFeedColors.oliveDark,
                    fontSize: 12,
                    fontWeight: "900",
                    lineHeight: 17,
                    marginTop: 9,
                  }}
                >
                  Tap the + above when you’re ready to share.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderItem = ({ item }) => {
    const authorProfile =
      !item.is_anonymous && item.user_id ? profilesById[item.user_id] || null : null;

    let who;

    if (item.is_anonymous) who = "Anonymous";
    else if (currentUserId && item.user_id === currentUserId) who = "You";
    else who = authorProfile?.display_name || "Member on Triunely";

    const avatarUrl = (() => {
      if (item.is_anonymous) return null;
      if (currentUserId && item.user_id === currentUserId) return profileAvatarUrl || null;
      return authorProfile?.avatar_url || null;
    })();

    const isOwner = !!(currentUserId && item.user_id === currentUserId);

    return (
      <PostCard
        post={item}
        currentUserId={currentUserId}
        author={{
          id: item.user_id,
          name: who,
          avatarUrl,
          isAnonymous: !!item.is_anonymous,
          isOwner,
        }}
        onPressAvatar={(userId) => navigation.navigate("UserProfile", { userId })}
        onOpenComments={(post) => openComments(post)}
        onShare={(post) => sharePost(post)}
        onSetReaction={(postId, typeOrNull) => setReaction(postId, typeOrNull)}
        reactionPickerForPost={reactionPickerForPost}
        setReactionPickerForPost={setReactionPickerForPost}
        preferInAppYouTube={true}
      />
    );
  };

  return (
    <Screen
      backgroundColor={churchFeedColors.cream}
      padded={false}
      style={{ flex: 1 }}
      contentStyle={{ flex: 1 }}
    >
      {({ bottomPad }) => (
        <>
          {loading ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="large" color={churchFeedColors.olive} />
              <Text style={{ color: churchFeedColors.brownSoft, marginTop: 8 }}>
                Loading church feed…
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredPosts}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              ListHeaderComponent={renderHeader}
              contentContainerStyle={{
                paddingBottom: bottomPad + 16,
                backgroundColor: churchFeedColors.cream,
              }}
              ItemSeparatorComponent={() => (
                <View style={{ height: 10, backgroundColor: churchFeedColors.cream }} />
              )}
              onRefresh={() => fetchPosts(true)}
              refreshing={refreshing}
              ListEmptyComponent={
                <View
                  style={{
                    marginHorizontal: 16,
                    marginTop: 4,
                    backgroundColor: churchFeedColors.card,
                    borderRadius: 22,
                    borderWidth: 1,
                    borderColor: churchFeedColors.border,
                    padding: 18,
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: churchFeedColors.oliveSoft,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 10,
                    }}
                  >
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={23}
                      color={churchFeedColors.olive}
                    />
                  </View>

                  <Text
                    style={{
                      color: churchFeedColors.brown,
                      fontWeight: "900",
                      fontSize: 15,
                      textAlign: "center",
                    }}
                  >
                    No posts here yet
                  </Text>

                  <Text
                    style={{
                      color: churchFeedColors.brownSoft,
                      fontWeight: "700",
                      fontSize: 13,
                      textAlign: "center",
                      lineHeight: 19,
                      marginTop: 5,
                    }}
                  >
                    When your church starts posting, updates and encouragements will appear here.
                  </Text>
                </View>
              }
            />
          )}

          {!!error && (
            <View
              style={{
                position: "absolute",
                left: 16,
                right: 16,
                bottom: bottomPad + 16,
                backgroundColor: churchFeedColors.card,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: churchFeedColors.border,
                padding: 12,
              }}
            >
              <Text style={{ color: theme.colors.danger, fontWeight: "800" }}>
                {error}
              </Text>
            </View>
          )}

          <NewPostModal
            visible={showNewModal}
            linkedContent={linkedContentForPost}
            onClose={() => {
              if (!posting) {
                setShowNewModal(false);
                setLinkedContentForPost(null);
              }
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

          <Modal
            visible={showSearch}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowSearch(false)}
          >
            <View style={{ flex: 1, backgroundColor: "rgba(46, 34, 20, 0.46)" }}>
              <View
                style={{
                  marginTop: insets.top + 10,
                  marginHorizontal: 12,
                  borderRadius: 20,
                  overflow: "hidden",
                  backgroundColor: churchFeedColors.card,
                  borderWidth: 1,
                  borderColor: churchFeedColors.border,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: churchFeedColors.border,
                    backgroundColor: churchFeedColors.cream,
                  }}
                >
                  <Text
                    style={{
                      color: churchFeedColors.brown,
                      fontWeight: "900",
                      fontSize: 16,
                    }}
                  >
                    Search
                  </Text>

                  <Pressable
                    onPress={() => {
                      setShowSearch(false);
                      setSearchQuery("");
                    }}
                    hitSlop={10}
                    style={{ paddingHorizontal: 10, paddingVertical: 6 }}
                  >
                    <Text
                      style={{
                        color: churchFeedColors.brownSoft,
                        fontWeight: "900",
                        fontSize: 16,
                      }}
                    >
                      ✕
                    </Text>
                  </Pressable>
                </View>

                <View style={{ padding: 12 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      backgroundColor: churchFeedColors.cream,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: churchFeedColors.border,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                    }}
                  >
                    <Ionicons name="search" size={18} color={churchFeedColors.olive} />

                    <TextInput
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Search posts by text or link…"
                      placeholderTextColor={churchFeedColors.brownSoft}
                      style={{
                        flex: 1,
                        color: churchFeedColors.brown,
                        fontWeight: "700",
                      }}
                      autoFocus
                    />
                  </View>
                </View>

                <View style={{ maxHeight: 520, paddingBottom: 10 }}>
                  <FlatList
                    data={filteredPosts}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <Pressable
                        onPress={() => setShowSearch(false)}
                        style={({ pressed }) => ({
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                          borderTopWidth: 1,
                          borderTopColor: churchFeedColors.border,
                          backgroundColor: pressed
                            ? churchFeedColors.cream
                            : "transparent",
                        })}
                      >
                        <Text
                          style={{
                            color: churchFeedColors.brown,
                            fontWeight: "800",
                          }}
                          numberOfLines={2}
                        >
                          {item.content ? item.content : "(Media post)"}
                        </Text>

                        {!!item.url && (
                          <Text
                            style={{
                              color: churchFeedColors.brownSoft,
                              marginTop: 4,
                            }}
                            numberOfLines={1}
                          >
                            {item.url}
                          </Text>
                        )}
                      </Pressable>
                    )}
                    ListEmptyComponent={
                      <Text
                        style={{
                          color: churchFeedColors.brownSoft,
                          textAlign: "center",
                          padding: 16,
                        }}
                      >
                        No matches.
                      </Text>
                    }
                  />
                </View>
              </View>

              <Pressable style={{ flex: 1 }} onPress={() => setShowSearch(false)} />
            </View>
          </Modal>
        </>
      )}
    </Screen>
  );
}