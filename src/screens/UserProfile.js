// src/screens/UserProfile.js
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    Share,
    Text,
    View,
} from "react-native";

import PostCard from "../components/PostCard";
import PostCommentsModal from "../components/PostCommentsModal";
import Screen from "../components/Screen";
import VerifiedBadge from "../components/VerifiedBadge";
import { supabase } from "../lib/supabase";
import { theme } from "../theme/theme";

function safeInitials(nameOrEmail) {
  if (!nameOrEmail) return "?";
  const parts = String(nameOrEmail).trim().split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(nameOrEmail).trim()[0]?.toUpperCase() || "?";
}

/**
 * Normalize a Supabase posts row into what PostCard expects.
 * PostCard expects:
 * - post.reactions: [{ user_id, type }]
 * - post.comment_count: number
 */
function normalizePostRow(row) {
  const reactions = Array.isArray(row?.post_reactions)
    ? row.post_reactions.map((r) => ({
        user_id: r.user_id,
        type: r.type,
      }))
    : [];

  const comment_count = Number(row?.post_comments?.[0]?.count ?? 0);

  return {
    ...row,
    reactions,
    comment_count,
  };
}

export default function UserProfile({ route, navigation }) {
  const targetUserId = route?.params?.userId;

  const [loading, setLoading] = useState(true);

  // Current logged-in user (for reactions, etc.)
  const [currentUserId, setCurrentUserId] = useState(null);

  // Target user profile data
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  // Groups joined (read-only)
  const [groupsJoined, setGroupsJoined] = useState([]);

  // Tabs
  const [activeTab, setActiveTab] = useState("posts"); // "posts" | "about"

  // Posts
  const [userPosts, setUserPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // PostCard wiring
  const [reactionPickerForPost, setReactionPickerForPost] = useState(null);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState(null);

  const initials = useMemo(() => {
    return safeInitials(displayName);
  }, [displayName]);

  async function loadPosts(userId) {
    if (!userId) return;

    try {
      setLoadingPosts(true);

      const { data: postsData, error: postsError } = await supabase
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
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (postsError) {
        console.log("UserProfile posts load error:", postsError);
        return;
      }

      const normalized = (postsData || []).map(normalizePostRow);
      setUserPosts(normalized);
    } catch (e) {
      console.log("UserProfile error loading posts", e);
    } finally {
      setLoadingPosts(false);
    }
  }

  // Load: session (current user) + target profile + groups + posts
  useEffect(() => {
    (async () => {
      try {
        if (!targetUserId) {
          setLoading(false);
          return;
        }

        // 1) current session user id
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const meId = sessionData?.session?.user?.id ?? null;
        setCurrentUserId(meId);
        // ✅ If someone taps *their own* avatar anywhere, send them to the real Profile tab
if (meId && targetUserId === meId) {
  navigation.navigate("MainTabs", { screen: "Profile" });
  return;
}


        // 2) target profile
        const { data: p, error: pError } = await supabase
          .from("profiles")
          .select(
            `
            id,
            display_name,
            avatar_url,
            cover_image_url,
            is_verified,
            relationship_status,
            church_name,
            baptism_status,
            ministry_areas,
            favourite_bible_verse,
            short_testimony
          `
          )
          .eq("id", targetUserId)
          .single();

        if (pError) {
          console.log("UserProfile profile load error:", pError);
          throw pError;
        }

        setProfile(p);
        setDisplayName(p?.display_name || "Triunely user");
        setIsVerified(Boolean(p?.is_verified));

        // 3) groups joined (read-only)
        try {
          const { data: userGroupsData, error: userGroupsError } = await supabase
            .from("user_groups")
            .select("group_id, groups(name)")
            .eq("user_id", targetUserId);

          if (userGroupsError) {
            console.log("UserProfile user_groups error:", userGroupsError);
            setGroupsJoined([]);
          } else {
            const names =
              (userGroupsData || [])
                .map((ug) => ug.groups?.name)
                .filter((n) => !!n) || [];
            setGroupsJoined(names);
          }
        } catch (e) {
          console.log("UserProfile error loading groups joined", e);
          setGroupsJoined([]);
        }

        // 4) posts
        await loadPosts(targetUserId);
      } catch (e) {
        console.log("UserProfile load error:", e);
        Alert.alert("Profile error", "We couldn't load this profile right now.");
      } finally {
        setLoading(false);
      }
    })();
  }, [targetUserId]);

  // --------- PostCard actions (share / reactions / comments) ---------

  async function handleSetReaction(postId, type) {
    if (!currentUserId) return;

    const target = userPosts.find((p) => p.id === postId);
    const existing = target?.reactions?.find((r) => r.user_id === currentUserId);
    const isSame = existing?.type === type;

    try {
      if (isSame) {
        const { error } = await supabase
          .from("post_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", currentUserId);

        if (error) throw error;

        setUserPosts((prev) =>
          prev.map((p) => {
            if (p.id !== postId) return p;
            const next = (p.reactions || []).filter((r) => r.user_id !== currentUserId);
            return { ...p, reactions: next };
          })
        );
      } else {
        const { error } = await supabase
          .from("post_reactions")
          .upsert({ post_id: postId, user_id: currentUserId, type }, { onConflict: "post_id,user_id" });

        if (error) throw error;

        setUserPosts((prev) =>
          prev.map((p) => {
            if (p.id !== postId) return p;

            const withoutMine = (p.reactions || []).filter((r) => r.user_id !== currentUserId);
            return { ...p, reactions: [...withoutMine, { user_id: currentUserId, type }] };
          })
        );
      }
    } catch (e) {
      console.log("UserProfile reaction error:", e);
      Alert.alert("Error", "We couldn't update your reaction. Please try again.");
    } finally {
      setReactionPickerForPost(null);
    }
  }

  function handleOpenComments(post) {
    setSelectedPostForComments(post);
    setCommentsModalVisible(true);
  }

  async function handleCloseComments() {
    setCommentsModalVisible(false);
    setSelectedPostForComments(null);
    await loadPosts(targetUserId);
  }

  async function handleSharePost(post) {
    try {
      const message = [post?.content, post?.url].filter(Boolean).join("\n\n");
      if (!message) {
        Alert.alert("Nothing to share", "This post has no text or link to share.");
        return;
      }
      await Share.share({ message });
    } catch (e) {
      console.log("UserProfile share error:", e);
      Alert.alert("Error", "We couldn't share this post right now.");
    }
  }

  // --------- Render helpers ---------

  function renderAboutTab() {
    return (
      <View>
        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: theme.colors.muted, marginBottom: 4 }}>Relationship status</Text>
          <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
            {profile?.relationship_status || "Not set yet"}
          </Text>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: theme.colors.muted, marginBottom: 4 }}>Church name</Text>
          <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
            {profile?.church_name || "Not set yet"}
          </Text>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: theme.colors.muted, marginBottom: 4 }}>Faith journey</Text>
          <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
            {profile?.baptism_status || "Not set yet"}
          </Text>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: theme.colors.muted, marginBottom: 4 }}>Ministry / serving areas</Text>
          <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
            {profile?.ministry_areas || "Not set yet"}
          </Text>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: theme.colors.muted, marginBottom: 4 }}>Favourite Bible verse</Text>
          <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
            {profile?.favourite_bible_verse || "Not set yet"}
          </Text>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: theme.colors.muted, marginBottom: 4 }}>Short testimony</Text>
          <Text style={{ color: theme.colors.text2, fontWeight: "500" }}>
            {profile?.short_testimony || "Not set yet"}
          </Text>
        </View>

        <View style={{ marginBottom: 0 }}>
          <Text style={{ color: theme.colors.muted, marginBottom: 4 }}>Groups joined</Text>
          {groupsJoined.length === 0 ? (
            <Text style={{ color: theme.colors.text, fontWeight: "700" }}>No groups yet.</Text>
          ) : (
            <View>
              {groupsJoined.map((name) => (
                <Text
                  key={name}
                  style={{ color: theme.colors.text, fontWeight: "700", marginBottom: 2 }}
                >
                  • {name}
                </Text>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }

  function renderPostsTab() {
    if (loadingPosts) {
      return (
        <View style={{ paddingVertical: 16, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="small" color={theme.colors.gold} />
          <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Loading posts…</Text>
        </View>
      );
    }

    if (!userPosts || userPosts.length === 0) {
      return (
        <View style={{ paddingVertical: 12 }}>
          <Text style={{ color: theme.colors.muted }}>No posts yet.</Text>
        </View>
      );
    }

    return (
      <View style={{ marginTop: 8 }}>
        {userPosts.map((post) => {
          const isAnon = post?.is_anonymous === true;

          return (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              author={{
                name: isAnon ? "Anonymous" : displayName,
                avatarUrl: isAnon ? null : profile?.avatar_url ?? null,
                isAnonymous: isAnon,
                isOwner: false,
              }}
              onDelete={null}
              onHide={null}
              onOpenComments={handleOpenComments}
              onShare={handleSharePost}
              onSetReaction={handleSetReaction}
              reactionPickerForPost={reactionPickerForPost}
              setReactionPickerForPost={setReactionPickerForPost}
              preferInAppYouTube={true}
            />
          );
        })}
      </View>
    );
  }

  // --------- UI ---------

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.gold} />
        <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Loading profile…</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.bg,
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        <Text style={{ color: theme.colors.text, fontSize: 18, marginBottom: 8 }}>
          Profile unavailable
        </Text>
        <Text style={{ color: theme.colors.muted, textAlign: "center" }}>
          We couldn't load this profile.
        </Text>

        <Pressable
          onPress={() => navigation.goBack()}
          style={[theme.button.primary, { marginTop: 14, borderRadius: 14, paddingVertical: 12 }]}
        >
          <Text style={theme.button.primaryText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Screen backgroundColor={theme.colors.bg} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: bottomPad }}>
            {/* Header row: back + title */}
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
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="chevron-back" size={22} color={theme.colors.text2} />
              </Pressable>

              <Text style={theme.text.h1}>Profile</Text>

              <View style={{ width: 38, height: 38 }} />
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
                {profile?.cover_image_url ? (
                  <Image
                    source={{ uri: profile.cover_image_url }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      flex: 1,
                      justifyContent: "center",
                      alignItems: "center",
                      paddingHorizontal: 16,
                      backgroundColor: theme.colors.sageTint,
                    }}
                  >
                    <Text style={{ color: theme.colors.text2, fontSize: 12 }}>
                      No background image yet.
                    </Text>
                  </View>
                )}
              </View>

              {/* Avatar */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  paddingHorizontal: 4,
                }}
              >
                <View style={{ marginTop: -48, marginRight: 12 }}>
                  {profile?.avatar_url ? (
                    <Image
                      source={{ uri: profile.avatar_url }}
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: 48,
                        borderWidth: 2,
                        borderColor: theme.colors.bg,
                      }}
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
                      <Text style={{ color: "#fff", fontSize: 32, fontWeight: "900" }}>
                        {initials}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Name + verified */}
              <View
                style={{
                  marginTop: 10,
                  paddingHorizontal: 4,
                  flexDirection: "row",
                  alignItems: "baseline",
                }}
              >
                <Text
                  style={{ color: theme.colors.text, fontSize: 22, fontWeight: "900" }}
                  numberOfLines={1}
                >
                  {displayName || "Triunely user"}
                </Text>

                {isVerified ? (
                  <View style={{ marginLeft: 6, marginTop: 1 }}>
                    <VerifiedBadge size={15} />
                  </View>
                ) : null}
              </View>
            </View>

            {/* Tabs (Posts / About) */}
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
                <Text
                  style={{
                    color: activeTab === "posts" ? theme.colors.text : theme.colors.text2,
                    fontWeight: "900",
                  }}
                >
                  Posts
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab("about")}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 999,
                  alignItems: "center",
                  backgroundColor: activeTab === "about" ? theme.colors.gold : "transparent",
                }}
              >
                <Text
                  style={{
                    color: activeTab === "about" ? theme.colors.text : theme.colors.text2,
                    fontWeight: "900",
                  }}
                >
                  About
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
              {activeTab === "about" ? (
                <>
                  <Text style={theme.text.h2}>About</Text>
                  <View style={{ marginTop: 10 }}>{renderAboutTab()}</View>
                </>
              ) : (
                <>
                  <Text style={theme.text.h2}>Posts</Text>
                  {renderPostsTab()}
                </>
              )}
            </View>
          </ScrollView>

          {/* Comments Modal */}
          <PostCommentsModal
            visible={commentsModalVisible}
            post={selectedPostForComments}
            currentUserId={currentUserId}
            onClose={handleCloseComments}
          />
        </>
      )}
    </Screen>
  );
}
