// src/screens/ChurchFeed.js
import { Ionicons } from "@expo/vector-icons";
import * as LegacyFileSystem from "expo-file-system/legacy";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    Text,
    TextInput,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import NewPostModal from "../components/NewPostModal";
import PostCard from "../components/PostCard";
import PostCommentsModal from "../components/PostCommentsModal";
import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";
import { theme } from "../theme/theme";

const PAGE_LIMIT = 50;

export default function ChurchFeed({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { churchId, churchName } = route?.params || {};

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [showNewModal, setShowNewModal] = useState(false);
  const [posting, setPosting] = useState(false);

  const [currentUserId, setCurrentUserId] = useState(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(null);

  const [profilesById, setProfilesById] = useState({});

  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState(null);

  const [reactionPickerForPost, setReactionPickerForPost] = useState(null);

  // Search overlay (simple)
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) return;

      const userId = data?.session?.user?.id ?? null;
      setCurrentUserId(userId);

      if (userId) fetchProfile(userId);
    })();
  }, []);

  async function fetchPosts(isRefresh = false) {
    if (!churchId) {
      setError("Missing church id.");
      setLoading(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      // NOTE: We include both 'church' and 'global' to avoid silent empty feeds
      // if your existing data uses a different visibility convention.
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
        .eq("community_id", churchId)
        .in("visibility", ["church", "global"])
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
    fetchPosts(false);
  }, [churchId]);

  async function handleCreatePost(content, url, isAnonymous, media) {
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
        Alert.alert("Not signed in", "Please sign in again before posting a message.");
        return;
      }

      let mediaUrl = null;
      let mediaType = null;

      if (media && media.uri) {
        try {
          const base64 = await LegacyFileSystem.readAsStringAsync(media.uri, {
            encoding: "base64",
          });

          const fileName = media.fileName || `image-${Date.now()}.jpg`;
          const contentType = media.type || "image/jpeg";

          const { data: fnData, error: fnError } = await supabase.functions.invoke("upload-post-image", {
            body: { base64, fileName, contentType },
          });

          if (fnError) throw fnError;

          mediaUrl = fnData?.publicUrl ?? null;
          mediaType = contentType;
        } catch (e) {
          console.log("ChurchFeed upload error:", e);
          Alert.alert("Upload failed", "We couldn’t upload your image. You can still post text only.");
        }
      }

      const payload = {
        user_id: userId,
        community_id: churchId,
        content: content.trim(),
        visibility: "church",
        is_anonymous: !!isAnonymous,
      };

      if (url && url.trim()) payload.url = url.trim();
      if (mediaUrl) {
        payload.media_url = mediaUrl;
        payload.media_type = mediaType;
      }

      // Optional link preview (same as your Community.js)
      let linkPreview = null;

      if (url && url.trim()) {
        try {
          const { data: previewData, error: previewError } = await supabase.functions.invoke("link-preview", {
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
          created_at
        `
        )
        .single();

      if (error) throw error;

      const newPost = { ...data, reactions: [], comment_count: 0 };
      setPosts((prev) => [newPost, ...prev]);

      if (!newPost.is_anonymous && newPost.user_id) fetchProfilesForUsers([newPost.user_id]);

      setShowNewModal(false);
    } catch (e) {
      console.log("ChurchFeed createPost error:", e);
      const msg = e?.message || e?.error_description || "We couldn’t post your message right now. Please try again.";
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
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p)));
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
        let newReactions = (p.reactions || []).filter((r) => r.user_id !== currentUserId);
        if (finalType) newReactions = [...newReactions, { user_id: currentUserId, type: finalType }];
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
      Alert.alert("Reaction failed", "We couldn’t update your reaction. It might correct itself on refresh.");
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
          community_id: churchId,
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

  const renderHeader = () => (
    <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 10, paddingBottom: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: theme.colors.divider,
            backgroundColor: theme.colors.surface,
          }}
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.text2} />
        </Pressable>

        <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }} numberOfLines={1}>
          {churchName || "Church Feed"}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable onPress={() => setShowSearch(true)} hitSlop={10} style={{ padding: 8 }}>
            <Ionicons name="search-outline" size={20} color={theme.colors.text2} />
          </Pressable>

          <Pressable onPress={() => setShowNewModal(true)} hitSlop={10} style={{ padding: 8 }}>
            <Ionicons name="add-circle-outline" size={22} color={theme.colors.text2} />
          </Pressable>
        </View>
      </View>

      <View style={{ marginTop: 12 }}>
        <Text style={{ color: theme.colors.muted, fontWeight: "700" }}>
          Church-only encouragements and updates.
        </Text>
      </View>
    </View>
  );

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
    <Screen backgroundColor={theme.colors.bg} padded={false} style={{ flex: 1 }} contentStyle={{ flex: 1 }}>
      {({ bottomPad }) => (
        <>
          {loading ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator size="large" color={theme.colors.gold} />
              <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Loading church feed…</Text>
            </View>
          ) : (
            <FlatList
              data={filteredPosts}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              ListHeaderComponent={renderHeader}
              contentContainerStyle={{
                paddingBottom: bottomPad + 16,
                backgroundColor: theme.colors.bg,
              }}
              ItemSeparatorComponent={() => <View style={{ height: 10, backgroundColor: theme.colors.bg }} />}
              onRefresh={() => fetchPosts(true)}
              refreshing={refreshing}
              ListEmptyComponent={
                <Text style={{ color: theme.colors.muted, textAlign: "center", marginTop: 20 }}>
                  No posts yet for this church.
                </Text>
              }
            />
          )}

          {!!error && (
            <View style={{ position: "absolute", left: 16, right: 16, bottom: bottomPad + 16 }}>
              <Text style={{ color: theme.colors.danger, fontWeight: "800" }}>{error}</Text>
            </View>
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

          {/* SEARCH OVERLAY */}
          <Modal
            visible={showSearch}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowSearch(false)}
          >
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }}>
              <View
                style={{
                  marginTop: insets.top + 10,
                  marginHorizontal: 12,
                  borderRadius: 18,
                  overflow: "hidden",
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.divider,
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
                    borderBottomColor: theme.colors.divider,
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>Search</Text>

                  <Pressable
                    onPress={() => {
                      setShowSearch(false);
                      setSearchQuery("");
                    }}
                    hitSlop={10}
                    style={{ paddingHorizontal: 10, paddingVertical: 6 }}
                  >
                    <Text style={{ color: theme.colors.muted, fontWeight: "900", fontSize: 16 }}>✕</Text>
                  </Pressable>
                </View>

                <View style={{ padding: 12 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      backgroundColor: theme.colors.surfaceAlt,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: theme.colors.divider,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                    }}
                  >
                    <Ionicons name="search" size={18} color={theme.colors.sage} />
                    <TextInput
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Search posts by text or link…"
                      placeholderTextColor={theme.colors.muted}
                      style={{ flex: 1, color: theme.colors.text, fontWeight: "700" }}
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
                          borderTopColor: theme.colors.divider,
                          backgroundColor: pressed ? theme.colors.surfaceAlt : "transparent",
                        })}
                      >
                        <Text style={{ color: theme.colors.text, fontWeight: "800" }} numberOfLines={2}>
                          {item.content ? item.content : "(Media post)"}
                        </Text>
                        {!!item.url && (
                          <Text style={{ color: theme.colors.muted, marginTop: 4 }} numberOfLines={1}>
                            {item.url}
                          </Text>
                        )}
                      </Pressable>
                    )}
                    ListEmptyComponent={
                      <Text style={{ color: theme.colors.muted, textAlign: "center", padding: 16 }}>No matches.</Text>
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
