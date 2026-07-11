// src/screens/UserProfile.js
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
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
import { fetchMyEvents } from "../features/events/services/eventsService";
import { getOrCreateDirectConversation } from "../lib/messages";
import { supabase } from "../lib/supabase";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const DANGER_RED = "#991B1B";
const OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";

const CARD_BORDER = "rgba(15, 23, 42, 0.08)";
const AMBER_SOFT = "rgba(180, 83, 9, 0.10)";
const AMBER_BORDER = "rgba(180, 83, 9, 0.18)";
const OLIVE_SOFT = "rgba(79, 99, 59, 0.10)";
const OLIVE_BORDER = "rgba(79, 99, 59, 0.18)";
const DANGER_SOFT = "rgba(153, 27, 27, 0.08)";
const DANGER_BORDER = "rgba(153, 27, 27, 0.18)";
const SHADOW = "rgba(15, 23, 42, 0.10)";

const displayFont = Platform.OS === "ios" ? "Georgia" : "serif";

const serifHeading = {
  fontFamily: displayFont,
  color: TEXT,
  fontWeight: "900",
  letterSpacing: -0.45,
};

const premiumCardStyle = {
  backgroundColor: SURFACE,
  borderRadius: 24,
  borderWidth: 1,
  borderColor: CARD_BORDER,
  shadowColor: SHADOW,
  shadowOpacity: 0.09,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 5 },
  elevation: 3,
};

function safeInitials(nameOrEmail) {
  if (!nameOrEmail) return "?";

  const parts = String(nameOrEmail).trim().split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return String(nameOrEmail).trim()[0]?.toUpperCase() || "?";
}

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

function PremiumFieldRow({ icon, label, value, mutedValue = false }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(15, 23, 42, 0.06)",
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: OLIVE_SOFT,
          borderWidth: 1,
          borderColor: OLIVE_BORDER,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
        }}
      >
        <Ionicons name={icon} size={17} color={OLIVE} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            color: MUTED,
            fontSize: 11.5,
            fontWeight: "900",
            textTransform: "uppercase",
            letterSpacing: 0.45,
            marginBottom: 3,
          }}
        >
          {label}
        </Text>

        <Text
          style={{
            color: mutedValue ? MUTED : TEXT,
            fontSize: 14,
            fontWeight: mutedValue ? "700" : "900",
            lineHeight: 20,
          }}
        >
          {value || "Not set yet"}
        </Text>
      </View>
    </View>
  );
}

function PremiumTabButton({ label, icon, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        borderRadius: 18,
        backgroundColor: active
          ? AMBER_SOFT
          : pressed
          ? "rgba(79, 99, 59, 0.06)"
          : "transparent",
        borderWidth: 1,
        borderColor: active ? AMBER_BORDER : "transparent",
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Ionicons
          name={icon}
          size={15}
          color={active ? EVENT_AMBER : OLIVE}
          style={{ marginRight: 5 }}
        />

        <Text
          style={{
            color: active ? EVENT_BROWN : OLIVE,
            fontSize: 12.5,
            fontWeight: "900",
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function FellowshipPreviewRow({ following = [], followingCount = 0 }) {
  const visiblePeople = Array.isArray(following) ? following.slice(0, 3) : [];
  const extraCount = Math.max(0, followingCount - visiblePeople.length);
  const hasFellowship = followingCount > 0;

  return (
    <View
      style={{
        marginTop: 14,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginRight: 12,
        }}
      >
        {hasFellowship ? (
          <>
            {visiblePeople.map((person, index) => {
              const name = person?.display_name || "Triunely user";
              const avatar = person?.avatar_url || null;

              return (
                <View
                  key={person?.id || `${name}-${index}`}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    marginLeft: index === 0 ? 0 : -9,
                    backgroundColor: OLIVE,
                    borderWidth: 2,
                    borderColor: SURFACE,
                    overflow: "hidden",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {avatar ? (
                    <Image
                      source={{ uri: avatar }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text
                      style={{
                        color: SURFACE,
                        fontSize: 10.5,
                        fontWeight: "900",
                      }}
                    >
                      {safeInitials(name)}
                    </Text>
                  )}
                </View>
              );
            })}

            {extraCount > 0 ? (
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  marginLeft: visiblePeople.length > 0 ? -9 : 0,
                  backgroundColor: AMBER_SOFT,
                  borderWidth: 2,
                  borderColor: SURFACE,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: EVENT_BROWN,
                    fontSize: 10.5,
                    fontWeight: "900",
                  }}
                >
                  +{extraCount}
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: OLIVE_SOFT,
              borderWidth: 1,
              borderColor: OLIVE_BORDER,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="people-outline" size={15} color={OLIVE} />
          </View>
        )}
      </View>

      <Text
        style={{
          color: MUTED,
          fontSize: 13.5,
          fontWeight: "900",
          flex: 1,
        }}
        numberOfLines={1}
      >
        {followingCount} {followingCount === 1 ? "fellowship" : "fellowships"}
      </Text>
    </View>
  );
}

export default function UserProfile({ route, navigation }) {
  const targetUserId = route?.params?.userId;

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  const [groupsJoined, setGroupsJoined] = useState([]);
  const [following, setFollowing] = useState([]);
  const [userEvents, setUserEvents] = useState([]);

  const [activeTab, setActiveTab] = useState("posts");

  const [userPosts, setUserPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const [myFollowRow, setMyFollowRow] = useState(null);
  const [reverseFollowRow, setReverseFollowRow] = useState(null);
  const [postConnectionRow, setPostConnectionRow] = useState(null);
  const [updatingRelationship, setUpdatingRelationship] = useState(false);
  const [relationshipConfirm, setRelationshipConfirm] = useState(null);

  const [reactionPickerForPost, setReactionPickerForPost] = useState(null);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState(null);

  const initials = useMemo(() => {
    return safeInitials(displayName);
  }, [displayName]);

  const isMe = Boolean(
    currentUserId && targetUserId && currentUserId === targetUserId
  );

  const isInFellowship = Boolean(
    myFollowRow?.status === "accepted" || reverseFollowRow?.status === "accepted"
  );

  const isConnectedToPosts = postConnectionRow?.is_connected !== false;

  const followingCount = following?.length || 0;
  const postsCount = userPosts?.length || 0;
  const eventsCount = userEvents?.length || 0;

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

      setUserPosts((postsData || []).map(normalizePostRow));
    } catch (e) {
      console.log("UserProfile error loading posts", e);
    } finally {
      setLoadingPosts(false);
    }
  }

  async function loadRelationship(meId, otherUserId) {
    if (!meId || !otherUserId || meId === otherUserId) {
      setMyFollowRow(null);
      setReverseFollowRow(null);
      return;
    }

    try {
      const { data: myRows, error: myError } = await supabase
        .from("follows")
        .select("id, follower_id, followed_id, status")
        .eq("follower_id", meId)
        .eq("followed_id", otherUserId)
        .limit(1);

      if (myError) {
        console.log("UserProfile my follow row error:", myError);
        setMyFollowRow(null);
      } else {
        setMyFollowRow(myRows?.[0] || null);
      }

      const { data: reverseRows, error: reverseError } = await supabase
        .from("follows")
        .select("id, follower_id, followed_id, status")
        .eq("follower_id", otherUserId)
        .eq("followed_id", meId)
        .limit(1);

      if (reverseError) {
        console.log("UserProfile reverse follow row error:", reverseError);
        setReverseFollowRow(null);
      } else {
        setReverseFollowRow(reverseRows?.[0] || null);
      }
    } catch (e) {
      console.log("UserProfile relationship load exception:", e);
      setMyFollowRow(null);
      setReverseFollowRow(null);
    }
  }

  async function loadPostConnection(meId, otherUserId) {
    if (!meId || !otherUserId || meId === otherUserId) {
      setPostConnectionRow(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("post_connections")
        .select("id, user_id, connected_user_id, is_connected")
        .eq("user_id", meId)
        .eq("connected_user_id", otherUserId)
        .maybeSingle();

      if (error) {
        console.log("UserProfile post connection load error:", error);
        setPostConnectionRow(null);
        return;
      }

      setPostConnectionRow(data || null);
    } catch (e) {
      console.log("UserProfile post connection load exception:", e);
      setPostConnectionRow(null);
    }
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        if (!targetUserId) {
          setLoading(false);
          return;
        }

        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        const meId = sessionData?.session?.user?.id ?? null;

        if (!alive) return;

        setCurrentUserId(meId);

        if (meId && targetUserId === meId) {
          navigation.navigate("MainTabs", {
            screen: "Profile",
            params: {
              screen: "ProfileMain",
            },
          });
          return;
        }

        await loadRelationship(meId, targetUserId);
        await loadPostConnection(meId, targetUserId);

        const { data: p, error: pError } = await supabase
          .from("profiles")
          .select(
            `
            id,
            display_name,
            handle,
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

        if (!alive) return;

        setProfile(p);
        setDisplayName(p?.display_name || "Triunely user");
        setHandle(p?.handle || "");
        setIsVerified(Boolean(p?.is_verified));

        try {
          const { data: userGroupsData, error: userGroupsError } =
            await supabase
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

        try {
          const { data: followsData, error: followsError } = await supabase
            .from("follows")
            .select("followed_id")
            .eq("follower_id", targetUserId)
            .eq("status", "accepted");

          if (followsError) {
            console.log("UserProfile follows load error:", followsError);
            setFollowing([]);
          } else if (followsData && followsData.length > 0) {
            const followedIds = followsData
              .map((f) => f.followed_id)
              .filter(Boolean);

            const { data: profilesData, error: followedProfilesError } =
              await supabase
                .from("profiles")
                .select("id, display_name, avatar_url")
                .in("id", followedIds);

            if (followedProfilesError) {
              console.log(
                "UserProfile followed profiles load error:",
                followedProfilesError
              );
              setFollowing([]);
            } else {
              setFollowing(profilesData || []);
            }
          } else {
            setFollowing([]);
          }
        } catch (e) {
          console.log("UserProfile error loading fellowship list", e);
          setFollowing([]);
        }

        try {
          const eventsRes = await fetchMyEvents({
            userId: targetUserId,
            limit: 50,
          });

          if (eventsRes?.ok) {
            setUserEvents(eventsRes.events || []);
          } else {
            console.log("UserProfile events load error:", eventsRes?.error);
            setUserEvents([]);
          }
        } catch (e) {
          console.log("UserProfile error loading events", e);
          setUserEvents([]);
        }

        await loadPosts(targetUserId);
      } catch (e) {
        console.log("UserProfile load error:", e);
        Alert.alert("Profile error", "We couldn't load this profile right now.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [targetUserId, navigation]);

  async function handleMessageUser() {
    try {
      if (!targetUserId) return;

      const conversationId = await getOrCreateDirectConversation(targetUserId);

      navigation.navigate("Chat", {
        conversationId,
        type: "dm",
        title: displayName || "Direct Message",
        avatarUrl: profile?.avatar_url || null,
        otherUserId: targetUserId,
        handle: handle || null,
      });
    } catch (e) {
      console.log("UserProfile handleMessageUser error", e);
      Alert.alert("Error", "We couldn't start a message right now.");
    }
  }

  async function handleTogglePostConnection() {
    if (!currentUserId || !targetUserId || updatingRelationship) return;

    const nextValue = !isConnectedToPosts;

    setRelationshipConfirm({
      icon: nextValue ? "add-circle-outline" : "remove-circle-outline",
      title: nextValue ? "Connect?" : "Disconnect?",
      message: nextValue
        ? "Their ordinary posts will appear in your feed again."
        : "You’ll stay in fellowship, but their ordinary posts won’t appear in your feed. Prayer requests can still appear.",
      confirmLabel: nextValue ? "Connect" : "Disconnect",
      danger: !nextValue,
      onConfirm: async () => {
        try {
          setUpdatingRelationship(true);

          const { data, error } = await supabase.rpc("set_post_connection", {
            p_connected_user_id: targetUserId,
            p_is_connected: nextValue,
          });

          if (error) throw error;

          const nextRow = Array.isArray(data) ? data[0] : data;

          setPostConnectionRow(
            nextRow || {
              user_id: currentUserId,
              connected_user_id: targetUserId,
              is_connected: nextValue,
            }
          );

          setRelationshipConfirm(null);

          setTimeout(() => {
            loadPostConnection(currentUserId, targetUserId);
          }, 350);
        } catch (e) {
          console.log("UserProfile toggle post connection error:", e);
          Alert.alert(
            "Error",
            e?.message || "We couldn't update this connection right now."
          );
        } finally {
          setUpdatingRelationship(false);
        }
      },
    });
  }

  async function handleRemoveFellowship() {
    if (!currentUserId || !targetUserId || updatingRelationship) return;

    setRelationshipConfirm({
      icon: "person-remove-outline",
      title: "Remove fellowship?",
      message:
        "This will remove the fellowship connection between you and this person. You can send a new request again later.",
      confirmLabel: "Remove fellowship",
      danger: true,
      onConfirm: async () => {
        try {
          setUpdatingRelationship(true);

          try {
            await supabase.rpc("set_post_connection", {
              p_connected_user_id: targetUserId,
              p_is_connected: false,
            });
          } catch (connectionError) {
            console.log(
              "UserProfile remove fellowship post connection warning:",
              connectionError
            );
          }

          const { error: forwardError } = await supabase
            .from("follows")
            .delete()
            .eq("follower_id", currentUserId)
            .eq("followed_id", targetUserId);

          if (forwardError) throw forwardError;

          const { error: reverseError } = await supabase
            .from("follows")
            .delete()
            .eq("follower_id", targetUserId)
            .eq("followed_id", currentUserId);

          if (reverseError) throw reverseError;

          setMyFollowRow(null);
          setReverseFollowRow(null);
          setPostConnectionRow({
            user_id: currentUserId,
            connected_user_id: targetUserId,
            is_connected: false,
          });
          setRelationshipConfirm(null);
        } catch (e) {
          console.log("UserProfile remove fellowship error:", e);
          Alert.alert(
            "Error",
            e?.message || "We couldn't remove this fellowship right now."
          );
        } finally {
          setUpdatingRelationship(false);
        }
      },
    });
  }

  async function handleSetReaction(postId, type) {
    if (!currentUserId) return;

    const target = userPosts.find((p) => p.id === postId);
    const existing = target?.reactions?.find(
      (r) => r.user_id === currentUserId
    );
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

            const next = (p.reactions || []).filter(
              (r) => r.user_id !== currentUserId
            );

            return { ...p, reactions: next };
          })
        );
      } else {
        const { error } = await supabase
          .from("post_reactions")
          .upsert(
            { post_id: postId, user_id: currentUserId, type },
            { onConflict: "post_id,user_id" }
          );

        if (error) throw error;

        setUserPosts((prev) =>
          prev.map((p) => {
            if (p.id !== postId) return p;

            const withoutMine = (p.reactions || []).filter(
              (r) => r.user_id !== currentUserId
            );

            return {
              ...p,
              reactions: [...withoutMine, { user_id: currentUserId, type }],
            };
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

  function renderRelationshipConfirmModal() {
    if (!relationshipConfirm) return null;

    const isDanger = relationshipConfirm.danger === true;
    const accent = isDanger ? DANGER_RED : EVENT_AMBER;
    const softBg = isDanger ? DANGER_SOFT : AMBER_SOFT;
    const border = isDanger ? DANGER_BORDER : AMBER_BORDER;

    return (
      <Modal
        visible={!!relationshipConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!updatingRelationship) setRelationshipConfirm(null);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.58)",
            justifyContent: "center",
            paddingHorizontal: 18,
          }}
        >
          <View
            style={{
              backgroundColor: PREMIUM_CREAM,
              borderRadius: 28,
              padding: 18,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.72)",
              shadowColor: "#000",
              shadowOpacity: 0.22,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
              elevation: 8,
            }}
          >
            <View
              style={{
                alignItems: "center",
                paddingTop: 6,
              }}
            >
              <View
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 29,
                  backgroundColor: softBg,
                  borderWidth: 1,
                  borderColor: border,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Ionicons
                  name={relationshipConfirm.icon}
                  size={28}
                  color={accent}
                />
              </View>

              <Text
                style={{
                  ...serifHeading,
                  fontSize: 25,
                  lineHeight: 31,
                  textAlign: "center",
                }}
              >
                {relationshipConfirm.title}
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 14,
                  fontWeight: "700",
                  lineHeight: 21,
                  textAlign: "center",
                  marginTop: 8,
                  paddingHorizontal: 4,
                }}
              >
                {relationshipConfirm.message}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                gap: 10,
                marginTop: 18,
              }}
            >
              <Pressable
                disabled={updatingRelationship}
                onPress={() => setRelationshipConfirm(null)}
                style={({ pressed }) => ({
                  flex: 1,
                  opacity: updatingRelationship ? 0.55 : pressed ? 0.82 : 1,
                  borderRadius: 18,
                  paddingVertical: 13,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: SURFACE,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                })}
              >
                <Text
                  style={{
                    color: OLIVE,
                    fontSize: 13.5,
                    fontWeight: "900",
                  }}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                disabled={updatingRelationship}
                onPress={relationshipConfirm.onConfirm}
                style={({ pressed }) => ({
                  flex: 1,
                  opacity: updatingRelationship ? 0.55 : pressed ? 0.86 : 1,
                  borderRadius: 18,
                  paddingVertical: 13,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: accent,
                  flexDirection: "row",
                })}
              >
                {updatingRelationship ? (
                  <ActivityIndicator size="small" color={SURFACE} />
                ) : (
                  <>
                    <Ionicons
                      name={relationshipConfirm.icon}
                      size={16}
                      color={SURFACE}
                      style={{ marginRight: 6 }}
                    />

                    <Text
                      style={{
                        color: SURFACE,
                        fontSize: 13.5,
                        fontWeight: "900",
                      }}
                    >
                      {relationshipConfirm.confirmLabel}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  function renderRelationshipActions() {
    if (isMe || !isInFellowship) return null;

    return (
      <View
        style={{
          marginTop: 12,
          flexDirection: "row",
          gap: 8,
        }}
      >
        <Pressable
          onPress={handleTogglePostConnection}
          disabled={updatingRelationship}
          style={({ pressed }) => ({
            flex: 1,
            opacity: updatingRelationship ? 0.6 : pressed ? 0.86 : 1,
            borderRadius: 16,
            paddingVertical: 11,
            paddingHorizontal: 10,
            backgroundColor: isConnectedToPosts ? AMBER_SOFT : OLIVE_SOFT,
            borderWidth: 1,
            borderColor: isConnectedToPosts ? AMBER_BORDER : OLIVE_BORDER,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
          })}
        >
          <Ionicons
            name={
              isConnectedToPosts
                ? "remove-circle-outline"
                : "add-circle-outline"
            }
            size={16}
            color={isConnectedToPosts ? EVENT_BROWN : OLIVE}
            style={{ marginRight: 6 }}
          />

          <Text
            style={{
              color: isConnectedToPosts ? EVENT_BROWN : OLIVE,
              fontSize: 12.5,
              fontWeight: "900",
            }}
          >
            {isConnectedToPosts ? "Disconnect" : "Connect"}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleRemoveFellowship}
          disabled={updatingRelationship}
          style={({ pressed }) => ({
            flex: 1,
            opacity: updatingRelationship ? 0.6 : pressed ? 0.86 : 1,
            borderRadius: 16,
            paddingVertical: 11,
            paddingHorizontal: 10,
            backgroundColor: DANGER_SOFT,
            borderWidth: 1,
            borderColor: DANGER_BORDER,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
          })}
        >
          <Ionicons
            name="person-remove-outline"
            size={16}
            color={DANGER_RED}
            style={{ marginRight: 6 }}
          />

          <Text
            style={{
              color: DANGER_RED,
              fontSize: 12.5,
              fontWeight: "900",
            }}
          >
            Remove fellowship
          </Text>
        </Pressable>
      </View>
    );
  }

  function renderAboutTab() {
    return (
      <View>
        <PremiumFieldRow
          icon="heart-outline"
          label="Relationship status"
          value={profile?.relationship_status || "Not set yet"}
          mutedValue={!profile?.relationship_status}
        />

        <PremiumFieldRow
          icon="business-outline"
          label="Church name"
          value={profile?.church_name || "Not set yet"}
          mutedValue={!profile?.church_name}
        />

        <PremiumFieldRow
          icon="water-outline"
          label="Faith journey"
          value={profile?.baptism_status || "Not set yet"}
          mutedValue={!profile?.baptism_status}
        />

        <PremiumFieldRow
          icon="hand-left-outline"
          label="Ministry / serving areas"
          value={profile?.ministry_areas || "Not set yet"}
          mutedValue={!profile?.ministry_areas}
        />

        <PremiumFieldRow
          icon="book-outline"
          label="Favourite Bible verse"
          value={profile?.favourite_bible_verse || "Not set yet"}
          mutedValue={!profile?.favourite_bible_verse}
        />

        <PremiumFieldRow
          icon="sparkles-outline"
          label="Short testimony"
          value={profile?.short_testimony || "Not set yet"}
          mutedValue={!profile?.short_testimony}
        />

        <View style={{ paddingTop: 12 }}>
          <Text
            style={{
              color: MUTED,
              fontSize: 11.5,
              fontWeight: "900",
              textTransform: "uppercase",
              letterSpacing: 0.45,
              marginBottom: 7,
            }}
          >
            Groups joined
          </Text>

          {groupsJoined.length === 0 ? (
            <Text
              style={{
                color: MUTED,
                fontSize: 14,
                fontWeight: "700",
                lineHeight: 20,
              }}
            >
              No groups yet.
            </Text>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {groupsJoined.map((name) => (
                <View
                  key={name}
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 11,
                    paddingVertical: 7,
                    backgroundColor: OLIVE_SOFT,
                    borderWidth: 1,
                    borderColor: OLIVE_BORDER,
                  }}
                >
                  <Text
                    style={{
                      color: OLIVE,
                      fontSize: 12.5,
                      fontWeight: "900",
                    }}
                  >
                    {name}
                  </Text>
                </View>
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
        <View
          style={{
            paddingVertical: 22,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="small" color={EVENT_AMBER} />

          <Text
            style={{
              color: MUTED,
              marginTop: 8,
              fontWeight: "800",
            }}
          >
            Loading posts…
          </Text>
        </View>
      );
    }

    if (!userPosts || userPosts.length === 0) {
      return (
        <View
          style={{
            paddingVertical: 18,
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: OLIVE_SOFT,
              borderWidth: 1,
              borderColor: OLIVE_BORDER,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 10,
            }}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={23}
              color={OLIVE}
            />
          </View>

          <Text
            style={{
              color: TEXT,
              fontSize: 16,
              fontWeight: "900",
              textAlign: "center",
            }}
          >
            No posts yet
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 13,
              fontWeight: "700",
              lineHeight: 18,
              marginTop: 4,
              textAlign: "center",
            }}
          >
            Shared posts will appear here.
          </Text>
        </View>
      );
    }

    return (
      <View style={{ marginTop: 2 }}>
        {userPosts.map((post) => {
          const isAnon = post?.is_anonymous === true;

          return (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              author={{
                name: isAnon ? "Anonymous" : displayName || "Triunely user",
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

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: PREMIUM_CREAM,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={EVENT_AMBER} />

        <Text
          style={{
            color: MUTED,
            marginTop: 10,
            fontWeight: "800",
          }}
        >
          Loading profile…
        </Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: PREMIUM_CREAM,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <View
          style={{
            ...premiumCardStyle,
            padding: 22,
            width: "100%",
            maxWidth: 360,
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: OLIVE_SOFT,
              borderWidth: 1,
              borderColor: OLIVE_BORDER,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Ionicons name="person-outline" size={25} color={OLIVE} />
          </View>

          <Text
            style={{
              ...serifHeading,
              fontSize: 22,
              lineHeight: 27,
              textAlign: "center",
            }}
          >
            Profile unavailable
          </Text>

          <Text
            style={{
              color: MUTED,
              textAlign: "center",
              fontWeight: "700",
              lineHeight: 20,
              marginTop: 8,
            }}
          >
            We couldn't load this profile.
          </Text>

          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => ({
              opacity: pressed ? 0.86 : 1,
              marginTop: 16,
              borderRadius: 999,
              paddingHorizontal: 16,
              paddingVertical: 11,
              backgroundColor: EVENT_AMBER,
            })}
          >
            <Text
              style={{
                color: SURFACE,
                fontSize: 13,
                fontWeight: "900",
              }}
            >
              Go back
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Screen backgroundColor={PREMIUM_CREAM} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingBottom: bottomPad + 18,
            }}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
                paddingHorizontal: 18,
                paddingTop: 12,
                paddingBottom: 12,
              }}
            >
              <Pressable
                onPress={() => navigation.goBack()}
                hitSlop={10}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: SURFACE,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  shadowColor: SHADOW,
                  shadowOpacity: 0.08,
                  shadowRadius: 7,
                  shadowOffset: { width: 0, height: 3 },
                  elevation: 2,
                }}
              >
                <Ionicons name="chevron-back" size={22} color={OLIVE} />
              </Pressable>

              <View style={{ flex: 1, paddingHorizontal: 12 }}>
                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 30,
                    lineHeight: 35,
                    textAlign: "center",
                  }}
                  numberOfLines={1}
                >
                  Profile
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 13,
                    fontWeight: "700",
                    lineHeight: 18,
                    marginTop: 2,
                    textAlign: "center",
                  }}
                  numberOfLines={1}
                >
                  Faith, fellowship and journey
                </Text>
              </View>

              <View style={{ width: 38, height: 38 }} />
            </View>

            <View
              style={{
                ...premiumCardStyle,
                marginHorizontal: 16,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: 146,
                  backgroundColor: OLIVE_SOFT,
                  overflow: "hidden",
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
                      backgroundColor: OLIVE_SOFT,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="leaf-outline" size={30} color={OLIVE} />
                  </View>
                )}

                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.12)",
                  }}
                />
              </View>

              <View
                style={{
                  paddingHorizontal: 16,
                  paddingBottom: 16,
                  marginTop: -42,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-end",
                  }}
                >
                  <View
                    style={{
                      width: 92,
                      height: 92,
                      borderRadius: 46,
                      backgroundColor: OLIVE,
                      borderWidth: 4,
                      borderColor: SURFACE,
                      overflow: "hidden",
                      alignItems: "center",
                      justifyContent: "center",
                      shadowColor: SHADOW,
                      shadowOpacity: 0.12,
                      shadowRadius: 12,
                      shadowOffset: { width: 0, height: 5 },
                      elevation: 4,
                    }}
                  >
                    {profile?.avatar_url ? (
                      <Image
                        source={{ uri: profile.avatar_url }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text
                        style={{
                          color: SURFACE,
                          fontSize: 30,
                          fontWeight: "900",
                        }}
                      >
                        {initials}
                      </Text>
                    )}
                  </View>

                  {!isMe ? (
                    <Pressable
                      onPress={handleMessageUser}
                      style={({ pressed }) => ({
                        marginLeft: "auto",
                        marginBottom: 5,
                        borderRadius: 999,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        backgroundColor: pressed
                          ? "rgba(180, 83, 9, 0.88)"
                          : EVENT_AMBER,
                        flexDirection: "row",
                        alignItems: "center",
                        shadowColor: EVENT_AMBER,
                        shadowOpacity: 0.16,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 4 },
                        elevation: 3,
                      })}
                    >
                      <Ionicons
                        name="chatbubble-ellipses"
                        size={16}
                        color={SURFACE}
                        style={{ marginRight: 6 }}
                      />

                      <Text
                        style={{
                          color: SURFACE,
                          fontSize: 13,
                          fontWeight: "900",
                        }}
                      >
                        Message
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                <View style={{ marginTop: 11 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      minWidth: 0,
                    }}
                  >
                    <Text
                      style={{
                        ...serifHeading,
                        fontSize: 25,
                        lineHeight: 30,
                        flexShrink: 1,
                      }}
                      numberOfLines={1}
                    >
                      {displayName || "Triunely user"}
                    </Text>

                    {isVerified ? (
                      <View style={{ marginLeft: 7 }}>
                        <VerifiedBadge size={16} />
                      </View>
                    ) : null}
                  </View>

                  {handle ? (
                    <Text
                      style={{
                        color: MUTED,
                        fontSize: 13,
                        fontWeight: "800",
                        marginTop: 3,
                      }}
                    >
                      @{handle}
                    </Text>
                  ) : null}

                  <FellowshipPreviewRow
                    following={following}
                    followingCount={followingCount}
                  />

                  {renderRelationshipActions()}
                </View>
              </View>
            </View>

            <View
              style={{
                marginHorizontal: 16,
                marginTop: 14,
                flexDirection: "row",
                gap: 9,
              }}
            >
              {[
                {
                  label: "Posts",
                  value: postsCount,
                  icon: "chatbubble-ellipses-outline",
                  amber: false,
                },
                {
                  label: "Events",
                  value: eventsCount,
                  icon: "calendar-outline",
                  amber: true,
                },
                {
                  label: "Fellowship",
                  value: followingCount,
                  icon: "people-outline",
                  amber: false,
                },
              ].map((item) => {
                const accent = item.amber ? EVENT_BROWN : OLIVE;
                const bg = item.amber ? AMBER_SOFT : OLIVE_SOFT;
                const border = item.amber ? AMBER_BORDER : OLIVE_BORDER;

                return (
                  <View
                    key={item.label}
                    style={{
                      flex: 1,
                      borderRadius: 18,
                      backgroundColor: bg,
                      borderWidth: 1,
                      borderColor: border,
                      paddingVertical: 10,
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name={item.icon}
                      size={16}
                      color={accent}
                      style={{ marginBottom: 4 }}
                    />

                    <Text
                      style={{
                        color: accent,
                        fontSize: 18,
                        fontWeight: "900",
                      }}
                    >
                      {item.value}
                    </Text>

                    <Text
                      style={{
                        color: MUTED,
                        fontSize: 11,
                        fontWeight: "900",
                        marginTop: 1,
                      }}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View
              style={{
                marginHorizontal: 16,
                marginTop: 12,
                marginBottom: 12,
                backgroundColor: SURFACE,
                borderRadius: 22,
                padding: 5,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                flexDirection: "row",
                shadowColor: SHADOW,
                shadowOpacity: 0.05,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 3 },
                elevation: 2,
              }}
            >
              <PremiumTabButton
                label="Posts"
                icon="chatbubble-ellipses-outline"
                active={activeTab === "posts"}
                onPress={() => setActiveTab("posts")}
              />

              <PremiumTabButton
                label="About"
                icon="person-circle-outline"
                active={activeTab === "about"}
                onPress={() => setActiveTab("about")}
              />
            </View>

            <View
              style={{
                ...premiumCardStyle,
                marginHorizontal: 16,
                padding: 16,
                marginBottom: 24,
              }}
            >
              {activeTab === "about" ? (
                <>
                  <Text
                    style={{
                      ...serifHeading,
                      fontSize: 22,
                      lineHeight: 27,
                    }}
                  >
                    About
                  </Text>

                  <View style={{ marginTop: 8 }}>{renderAboutTab()}</View>
                </>
              ) : (
                <>
                  <Text
                    style={{
                      ...serifHeading,
                      fontSize: 22,
                      lineHeight: 27,
                    }}
                  >
                    Posts
                  </Text>

                  <View style={{ marginTop: 10 }}>{renderPostsTab()}</View>
                </>
              )}
            </View>
          </ScrollView>

          {renderRelationshipConfirmModal()}

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