// src/screens/Profile.js
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";

import PostCard from "../components/PostCard";
import PostCommentsModal from "../components/PostCommentsModal";
import Screen from "../components/Screen";
import UnifiedInboxHeaderButton from "../components/UnifiedInboxHeaderButton";
import VerifiedBadge from "../components/VerifiedBadge";
import { useFellowshipRequestsModal } from "../context/FellowshipRequestsModalProvider";
import { useRealtime } from "../context/RealtimeProvider";
import { fetchMyEvents } from "../features/events/services/eventsService";
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

const iconButtonStyle = {
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
};

const iconBadgeStyle = {
  position: "absolute",
  top: -3,
  right: -3,
  minWidth: 17,
  height: 17,
  paddingHorizontal: 4,
  borderRadius: 999,
  backgroundColor: EVENT_AMBER,
  justifyContent: "center",
  alignItems: "center",
  borderWidth: 1.5,
  borderColor: SURFACE,
};

const iconBadgeTextStyle = {
  color: SURFACE,
  fontSize: 10,
  fontWeight: "900",
};

const RELATIONSHIP_OPTIONS = [
  "Single",
  "Courting / Dating",
  "Engaged",
  "Married",
  "Widowed",
  "Prefer not to say",
];

const BAPTISM_OPTIONS = [
  "Not yet baptised",
  "Planning to be baptised",
  "Baptised as a child",
  "Born Again",
  "Unsure",
  "Still Seeking",
  "Prefer not to say",
];

const LETTER_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

const SYMBOL_ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["!", "@", "#", "£", "$", "%", "&", "*", "(", ")"],
  ["-", "_", "'", '"', ",", ".", "?", "/"],
];

function safeInitials(nameOrEmail) {
  if (!nameOrEmail) return "?";

  const parts = String(nameOrEmail).trim().split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return String(nameOrEmail).trim()[0]?.toUpperCase() || "?";
}

function formatDateTime(ts) {
  if (!ts) return "";

  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}

async function openExternalUrl(url) {
  if (!url) return;

  try {
    const supported = await Linking.canOpenURL(url);

    if (!supported) {
      Alert.alert("Can't open link", "Your device couldn't open this link.");
      return;
    }

    await Linking.openURL(url);
  } catch {
    Alert.alert("Can't open link", "We couldn't open this link right now.");
  }
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

function PremiumSectionHeader({ title, subtitle, icon, actionLabel, onAction }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          flex: 1,
          minWidth: 0,
          paddingRight: 10,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: AMBER_SOFT,
            borderWidth: 1,
            borderColor: AMBER_BORDER,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Ionicons name={icon} size={19} color={EVENT_AMBER} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              ...serifHeading,
              fontSize: 20,
              lineHeight: 25,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>

          {subtitle ? (
            <Text
              style={{
                color: MUTED,
                fontSize: 12.5,
                fontWeight: "700",
                lineHeight: 17,
                marginTop: 1,
              }}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => ({
            borderRadius: 999,
            paddingHorizontal: 11,
            paddingVertical: 7,
            backgroundColor: pressed ? "rgba(180, 83, 9, 0.14)" : AMBER_SOFT,
            borderWidth: 1,
            borderColor: AMBER_BORDER,
          })}
        >
          <Text
            style={{
              color: EVENT_BROWN,
              fontSize: 12,
              fontWeight: "900",
            }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
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

export default function Profile({ navigation, route }) {
  const rt = useRealtime();
  const { openFellowshipRequests } = useFellowshipRequestsModal();

  const unreadMessageCount =
    rt?.unreadMessageCount ??
    rt?.unreadInboxCount ??
    rt?.messageUnreadCount ??
    0;

  const [loading, setLoading] = useState(true);

  const [savingAvatar, setSavingAvatar] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);

  const [coverImageUrl, setCoverImageUrl] = useState(null);
  const [savingCover, setSavingCover] = useState(false);

  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState(null);

  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [editedDisplayName, setEditedDisplayName] = useState("");
  const [savingDisplayName, setSavingDisplayName] = useState(false);

  const [activeTab, setActiveTab] = useState("about");

  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [churchName, setChurchName] = useState("");
  const [baptismStatus, setBaptismStatus] = useState("");
  const [ministryAreas, setMinistryAreas] = useState("");
  const [favouriteBibleVerse, setFavouriteBibleVerse] = useState("");
  const [shortTestimony, setShortTestimony] = useState("");
  const [groupsJoined, setGroupsJoined] = useState([]);

  const [following, setFollowing] = useState([]);

  const [peopleSearchModalVisible, setPeopleSearchModalVisible] =
    useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [justRequestedIds, setJustRequestedIds] = useState([]);

  const [isSymbolsMode, setIsSymbolsMode] = useState(false);
  const [shiftActive, setShiftActive] = useState(true);
  const [capsLock, setCapsLock] = useState(false);

  const [pendingRequests, setPendingRequests] = useState([]);
  const [requestsModalVisible, setRequestsModalVisible] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [savingAbout, setSavingAbout] = useState(false);

  const [userPosts, setUserPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const [userEvents, setUserEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const [reactionPickerForPost, setReactionPickerForPost] = useState(null);

  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState(null);

  const [isVerified, setIsVerified] = useState(false);

  const ALWAYS_VERIFIED_EMAILS = ["mrdavey.p1985@gmail.com"];

  const [adminChurchId, setAdminChurchId] = useState(null);
  const [checkingChurchAdmin, setCheckingChurchAdmin] = useState(false);

  const refreshChurchAdminStatus = useCallback(
    async (userIdOverride) => {
      const uid = userIdOverride || user?.id;

      if (!uid) return;

      try {
        setCheckingChurchAdmin(true);

        const { data, error } = await supabase
          .from("church_admins")
          .select("church_id")
          .eq("user_id", uid)
          .limit(1);

        if (error) {
          console.log("church_admins lookup error:", error);
          setAdminChurchId(null);
          return;
        }

        setAdminChurchId(data?.[0]?.church_id ?? null);
      } catch (e) {
        console.log("church_admins lookup exception:", e);
        setAdminChurchId(null);
      } finally {
        setCheckingChurchAdmin(false);
      }
    },
    [user?.id]
  );

  const initials = useMemo(() => {
    return safeInitials(displayName || user?.email);
  }, [displayName, user?.email]);

  const followingCount = following?.length || 0;
  const postsCount = userPosts?.length || 0;
  const eventsCount = userEvents?.length || 0;

  async function loadMyPosts(userId) {
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
        console.log("Posts load error:", postsError);
        return;
      }

      const normalized = (postsData || []).map(normalizePostRow);
      setUserPosts(normalized);
    } catch (e) {
      console.log("Error loading user posts", e);
    } finally {
      setLoadingPosts(false);
    }
  }

  async function loadMyEvents(userId) {
    if (!userId) return;

    try {
      setLoadingEvents(true);

      const res = await fetchMyEvents({ userId, limit: 50 });

      if (!res.ok) {
        console.log("Profile events load error:", res.error);
        setUserEvents([]);
        return;
      }

      setUserEvents(res.events || []);
    } catch (e) {
      console.log("Error loading profile events", e);
      setUserEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }

  useEffect(() => {
    const wantsOpen = route?.params?.openFellowshipRequests === true;

    if (wantsOpen) {
      setRequestsModalVisible(true);
      navigation.setParams({ openFellowshipRequests: false });
    }
  }, [
    route?.params?.openFellowshipRequests,
    route?.params?.openFellowshipRequestsNonce,
    navigation,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;

      rt?.refreshCounts?.();

      let alive = true;

      (async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("display_name, avatar_url, cover_image_url, is_verified")
          .eq("id", user.id)
          .single();

        if (error) {
          console.log("Profile focus refresh error:", error);
          return;
        }

        if (!alive) return;

        const nextDisplayName = data?.display_name ?? null;
        setDisplayName(nextDisplayName);
        setEditedDisplayName(nextDisplayName ?? "");
        setAvatarUrl(data?.avatar_url ?? null);
        setCoverImageUrl(data?.cover_image_url ?? null);

        const alwaysVerified = ALWAYS_VERIFIED_EMAILS.includes(
          (user?.email || "").toLowerCase()
        );

        setIsVerified(Boolean(data?.is_verified) || alwaysVerified);
      })();

      return () => {
        alive = false;
      };
    }, [user?.id, rt])
  );

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      refreshChurchAdminStatus(user.id);
    }, [user?.id, refreshChurchAdminStatus])
  );
    useEffect(() => {
    (async () => {
      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        const userId = sessionData?.session?.user?.id;
        const email = sessionData?.session?.user?.email || "";
        const isAlwaysVerified = ALWAYS_VERIFIED_EMAILS.includes(
          email.toLowerCase()
        );

        if (!userId) {
          setLoading(false);
          return;
        }

        setUser({ id: userId, email });

        await refreshChurchAdminStatus(userId);

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select(
            `
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
          .eq("id", userId)
          .single();

        if (profileError && profileError.code !== "PGRST116") {
          throw profileError;
        }

        setAvatarUrl(profile?.avatar_url ?? null);
        setCoverImageUrl(profile?.cover_image_url ?? null);

        const nextDisplayName = profile?.display_name ?? null;
        setDisplayName(nextDisplayName);
        setEditedDisplayName(nextDisplayName ?? "");
        setIsVerified(Boolean(profile?.is_verified) || isAlwaysVerified);

        setRelationshipStatus(profile?.relationship_status ?? "");
        setChurchName(profile?.church_name ?? "");
        setBaptismStatus(profile?.baptism_status ?? "");
        setMinistryAreas(profile?.ministry_areas ?? "");
        setFavouriteBibleVerse(profile?.favourite_bible_verse ?? "");
        setShortTestimony(profile?.short_testimony ?? "");

        try {
          const { data: userGroupsData, error: userGroupsError } =
            await supabase
              .from("user_groups")
              .select("group_id, groups(name)")
              .eq("user_id", userId);

          if (userGroupsError) {
            console.log("user_groups error:", userGroupsError);
          } else if (userGroupsData) {
            const names =
              userGroupsData
                .map((ug) => ug.groups?.name)
                .filter((n) => !!n) || [];

            setGroupsJoined(names);
          }
        } catch (e) {
          console.log("Error loading groups joined", e);
        }

        try {
          const { data: followsData, error: followsError } = await supabase
            .from("follows")
            .select("followed_id")
            .eq("follower_id", userId)
            .eq("status", "accepted");

          if (followsError) {
            console.log("follows load error:", followsError);
          } else if (followsData && followsData.length > 0) {
            const followedIds = followsData.map((f) => f.followed_id);

            const { data: profilesData, error: followedProfilesError } =
              await supabase
                .from("profiles")
                .select("id, display_name, avatar_url")
                .in("id", followedIds);

            if (followedProfilesError) {
              console.log(
                "followed profiles load error:",
                followedProfilesError
              );
            } else {
              setFollowing(profilesData || []);
            }
          } else {
            setFollowing([]);
          }
        } catch (e) {
          console.log("Error loading friendships list", e);
        }

        try {
          const { data: pendingData, error: pendingError } = await supabase
            .from("follows")
            .select("id, follower_id, status")
            .eq("followed_id", userId)
            .eq("status", "pending");

          if (pendingError) {
            console.log("pending follows load error:", pendingError);
          } else if (pendingData && pendingData.length > 0) {
            const requesterIds = pendingData.map((r) => r.follower_id);

            const { data: requesterProfiles, error: requesterProfilesError } =
              await supabase
                .from("profiles")
                .select("id, display_name, avatar_url")
                .in("id", requesterIds);

            if (requesterProfilesError) {
              console.log(
                "requester profiles load error:",
                requesterProfilesError
              );
              setPendingRequests([]);
            } else {
              const combined = pendingData.map((req) => ({
                ...req,
                profile:
                  requesterProfiles.find((p) => p.id === req.follower_id) ||
                  null,
              }));

              setPendingRequests(combined);
            }
          } else {
            setPendingRequests([]);
          }
        } catch (e) {
          console.log("Error loading pending fellowship requests", e);
        }

        await loadMyPosts(userId);
        await loadMyEvents(userId);

        try {
          const { data: notificationsData, error: notificationsError } =
            await supabase
              .from("notifications")
              .select("*")
              .eq("user_id", userId)
              .order("created_at", { ascending: false });

          if (notificationsError) {
            console.log("notifications load error:", notificationsError);
          } else if (notificationsData) {
            setNotifications(notificationsData);

            const unread = notificationsData.filter((n) => !n.is_read).length;
            setUnreadNotificationCount(unread);
          }
        } catch (e) {
          console.log("Error loading notifications", e);
        }
      } catch (e) {
        console.log("Error loading profile", e);

        Alert.alert(
          "Profile error",
          "We couldn't load your profile right now. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`church_admins_profile_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "church_admins",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refreshChurchAdminStatus(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refreshChurchAdminStatus]);

  async function handleSetReaction(postId, type) {
    if (!user?.id) return;

    const target = userPosts.find((p) => p.id === postId);
    const existing = target?.reactions?.find((r) => r.user_id === user.id);
    const isSame = existing?.type === type;

    try {
      if (isSame) {
        const { error } = await supabase
          .from("post_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);

        if (error) throw error;

        setUserPosts((prev) =>
          prev.map((p) => {
            if (p.id !== postId) return p;

            const next = (p.reactions || []).filter(
              (r) => r.user_id !== user.id
            );

            return { ...p, reactions: next };
          })
        );
      } else {
        const { error } = await supabase
          .from("post_reactions")
          .upsert(
            { post_id: postId, user_id: user.id, type },
            { onConflict: "post_id,user_id" }
          );

        if (error) throw error;

        setUserPosts((prev) =>
          prev.map((p) => {
            if (p.id !== postId) return p;

            const withoutMine = (p.reactions || []).filter(
              (r) => r.user_id !== user.id
            );

            return {
              ...p,
              reactions: [...withoutMine, { user_id: user.id, type }],
            };
          })
        );
      }
    } catch (e) {
      console.log("Reaction error:", e);
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
    await loadMyPosts(user?.id);
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
      console.log("Share error:", e);
      Alert.alert("Error", "We couldn't share this post right now.");
    }
  }

  function handleDeletePost(postId) {
    if (!user?.id) return;

    Alert.alert("Delete post?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("posts")
              .delete()
              .eq("id", postId)
              .eq("user_id", user.id);

            if (error) throw error;

            setUserPosts((prev) => prev.filter((p) => p.id !== postId));
          } catch (e) {
            console.log("Delete post error:", e);
            Alert.alert(
              "Error",
              "We couldn't delete this post. Please try again."
            );
          }
        },
      },
    ]);
  }

  function handleHidePost() {
    Alert.alert("Hidden", "This post has been hidden.");
  }

  async function handlePickAvatar() {
    if (!user?.id) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "We need access to your photos to set a profile picture."
        );
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
        Alert.alert(
          "Avatar error",
          "We couldn't read this image. Please try another photo."
        );
        return;
      }

      setPendingAvatar(asset);
    } catch (e) {
      console.log("Error picking avatar", e);

      Alert.alert(
        "Avatar error",
        "We couldn't open your photos. Please try again."
      );
    }
  }

  async function confirmAvatarChange() {
    if (!user?.id || !pendingAvatar) return;

    try {
      setSavingAvatar(true);

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        Alert.alert(
          "Not signed in",
          "You need to be signed in to update your profile picture."
        );
        return;
      }

      const asset = pendingAvatar;

      const fileExtFromUri =
        asset.uri.split(".").pop()?.toLowerCase().split("?")[0] || "jpg";
      const fileExt = fileExtFromUri === "" ? "jpg" : fileExtFromUri;

      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const contentType = asset.type || "image/jpeg";

      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        "upload-post-image",
        {
          body: {
            base64: asset.base64,
            fileName,
            contentType,
            pathPrefix: `avatars/${userId}`,
          },
        }
      );

      if (fnError) {
        console.log("Avatar edge function error:", fnError);
        throw fnError;
      }

      if (!fnData?.publicUrl) {
        throw new Error("No publicUrl returned from edge function");
      }

      const publicUrl = fnData.publicUrl;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (profileError) {
        console.log("Avatar profile update error", profileError);
        throw profileError;
      }

      setAvatarUrl(publicUrl);
      setPendingAvatar(null);

      Alert.alert("Profile updated", "Your profile picture has been saved.");
    } catch (e) {
      console.log("Error setting avatar", e);

      Alert.alert(
        "Avatar error",
        "We couldn't update your profile picture. Please try again."
      );
    } finally {
      setSavingAvatar(false);
    }
  }

  async function handlePickCoverImage() {
    if (!user?.id) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "We need access to your photos to set a cover image."
        );
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
        Alert.alert(
          "Cover error",
          "We couldn't read this image. Please try another photo."
        );
        return;
      }

      setSavingCover(true);

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        Alert.alert(
          "Not signed in",
          "You need to be signed in to update your cover image."
        );
        return;
      }

      const fileExtFromUri =
        asset.uri.split(".").pop()?.toLowerCase().split("?")[0] || "jpg";
      const fileExt = fileExtFromUri === "" ? "jpg" : fileExtFromUri;

      const fileName = `cover-${Date.now()}.${fileExt}`;
      const contentType = asset.type || "image/jpeg";

      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        "upload-post-image",
        {
          body: {
            base64: asset.base64,
            fileName,
            contentType,
            pathPrefix: `covers/${userId}`,
          },
        }
      );

      if (fnError) {
        console.log("Cover edge function error:", fnError);
        throw fnError;
      }

      if (!fnData?.publicUrl) {
        throw new Error("No publicUrl returned from edge function");
      }

      const publicUrl = fnData.publicUrl;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ cover_image_url: publicUrl })
        .eq("id", userId);

      if (profileError) {
        console.log("Cover profile update error", profileError);
        throw profileError;
      }

      setCoverImageUrl(publicUrl);

      Alert.alert("Profile updated", "Your background image has been saved.");
    } catch (e) {
      console.log("Error setting cover image", e);

      Alert.alert(
        "Cover error",
        "We couldn't update your background image. Please try again."
      );
    } finally {
      setSavingCover(false);
    }
  }

  function handleCancelDisplayNameEdit() {
    setEditedDisplayName(displayName ?? "");
    setIsEditingDisplayName(false);
  }

  async function handleSaveDisplayName() {
    if (!user?.id) return;

    const trimmedName = editedDisplayName.trim();

    if (!trimmedName) {
      Alert.alert("Name required", "Please enter a profile name.");
      return;
    }

    try {
      setSavingDisplayName(true);

      const { error } = await supabase
        .from("profiles")
        .update({ display_name: trimmedName })
        .eq("id", user.id);

      if (error) {
        console.log("Save display name error:", error);
        throw error;
      }

      setDisplayName(trimmedName);
      setEditedDisplayName(trimmedName);
      setIsEditingDisplayName(false);

      Alert.alert("Profile updated", "Your profile name has been saved.");
    } catch (e) {
      console.log("Error saving display name", e);

      Alert.alert(
        "Save error",
        "We couldn't save your profile name. Please try again."
      );
    } finally {
      setSavingDisplayName(false);
    }
  }

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
      Alert.alert("Signed out", "You have been signed out.");
    } catch (e) {
      console.log("Sign out error", e);
    }
  }

  async function handleSaveAbout() {
    if (!user?.id) return;

    try {
      setSavingAbout(true);

      const updates = {
        relationship_status: relationshipStatus || null,
        church_name: churchName || null,
        baptism_status: baptismStatus || null,
        ministry_areas: ministryAreas || null,
        favourite_bible_verse: favouriteBibleVerse || null,
        short_testimony: shortTestimony || null,
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) {
        console.log("Save about error:", error);
        throw error;
      }

      setIsEditingAbout(false);

      Alert.alert("Profile updated", "Your About information has been saved.");
    } catch (e) {
      console.log("Error saving About info", e);

      Alert.alert(
        "Save error",
        "We couldn't save your About information. Please try again."
      );
    } finally {
      setSavingAbout(false);
    }
  }

  async function handleSearchPeople() {
    if (!user?.id) return;

    const trimmed = searchQuery.trim();

    if (trimmed.length < 2) {
      Alert.alert("Search too short", "Type at least 2 characters.");
      return;
    }

    try {
      setSearchLoading(true);
      setSearchError(null);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .neq("id", user.id)
        .ilike("display_name", `%${trimmed}%`)
        .limit(30);

      if (error) {
        console.log("Search people error:", error);
        setSearchError("We couldn't search for people right now.");
        setSearchResults([]);
        return;
      }

      setSearchResults(data || []);
    } catch (e) {
      console.log("Search people exception:", e);
      setSearchError("We couldn't search for people right now.");
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleSendFellowshipRequest(targetProfile) {
    if (!user?.id) return;

    try {
      const alreadyFriend = following.some((p) => p.id === targetProfile.id);

      if (alreadyFriend) {
        Alert.alert(
          "Already in fellowship",
          "You are already in fellowship with this person."
        );
        return;
      }

      if (justRequestedIds.includes(targetProfile.id)) {
        Alert.alert(
          "Request already sent",
          "You have already sent a fellowship request to this person."
        );
        return;
      }

      const { error } = await supabase.from("follows").insert({
        follower_id: user.id,
        followed_id: targetProfile.id,
        status: "pending",
      });

      if (error) {
        console.log("Send fellowship request error:", error);

        Alert.alert(
          "Error",
          "We couldn't send this fellowship request. They may already have a request from you."
        );
        return;
      }

      setJustRequestedIds((prev) => [...prev, targetProfile.id]);

      Alert.alert(
        "Request sent",
        "Your fellowship request has been sent and will appear in their fellowship inbox."
      );
    } catch (e) {
      console.log("Send fellowship request exception:", e);

      Alert.alert(
        "Error",
        "We couldn't send this fellowship request. Please try again."
      );
    }
  }

  async function handleAcceptFellowshipRequest(request) {
    if (!user?.id) return;

    try {
      const { error: updateError } = await supabase
        .from("follows")
        .update({ status: "accepted" })
        .eq("id", request.id);

      if (updateError) {
        console.log("Error updating request to accepted:", updateError);
        throw updateError;
      }

      const { error: reverseError } = await supabase.from("follows").insert({
        follower_id: user.id,
        followed_id: request.follower_id,
        status: "accepted",
      });

      if (reverseError) {
        console.log("Reverse follow insert error:", reverseError);
      }

      try {
        const notifTitle = "Fellowship accepted";
        const accepterName = displayName || "Someone";
        const notifBody = `${accepterName} accepted your fellowship request.`;

        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            user_id: request.follower_id,
            type: "fellowship_accepted",
            title: notifTitle,
            body: notifBody,
            related_user_id: user.id,
            follow_id: request.id,
          });

        if (notifError) {
          console.log("Notification insert error:", notifError);
        }
      } catch (notifEx) {
        console.log("Notification insert exception:", notifEx);
      }

      setPendingRequests((prev) => prev.filter((r) => r.id !== request.id));

      if (request.profile) {
        setFollowing((prev) => {
          const alreadyThere = prev.some((p) => p.id === request.profile.id);

          if (alreadyThere) return prev;

          return [...prev, request.profile];
        });
      }

      Alert.alert(
        "Fellowship accepted",
        "You are now in fellowship with this person."
      );
    } catch (e) {
      console.log("Error accepting fellowship request", e);

      Alert.alert(
        "Error",
        "We couldn't accept this fellowship request. Please try again."
      );
    }
  }

  async function handleDeclineFellowshipRequest(requestId) {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from("follows")
        .update({ status: "declined" })
        .eq("id", requestId);

      if (error) {
        console.log("Error declining request:", error);
        throw error;
      }

      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));

      Alert.alert("Request declined", "You have declined this fellowship request.");
    } catch (e) {
      console.log("Error declining fellowship request", e);

      Alert.alert(
        "Error",
        "We couldn't decline this fellowship request. Please try again."
      );
    }
  }

  function handleOpenNotifications() {
    navigation.navigate("Notifications");
  }

  function handleKeyPress(baseChar) {
    let char = baseChar;

    if (!isSymbolsMode) {
      if (shiftActive || capsLock) char = baseChar.toUpperCase();
      else char = baseChar.toLowerCase();
    }

    setSearchQuery((prev) => prev + char);

    if (shiftActive && !capsLock) {
      setShiftActive(false);
    }
  }

  function handleBackspace() {
    setSearchQuery((prev) => prev.slice(0, -1));
  }

  function handleSpace() {
    setSearchQuery((prev) => prev + " ");
  }

  function handleClear() {
    setSearchQuery("");
  }

  function handleShiftPress() {
    if (!shiftActive && !capsLock) {
      setShiftActive(true);
      setCapsLock(false);
    } else if (shiftActive && !capsLock) {
      setShiftActive(false);
      setCapsLock(true);
    } else if (capsLock) {
      setShiftActive(false);
      setCapsLock(false);
    }
  }

  function handleToggleSymbols() {
    setIsSymbolsMode((prev) => !prev);
  }

  function closePeopleSearchModal() {
    setPeopleSearchModalVisible(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError(null);
    setSearchLoading(false);
    setJustRequestedIds([]);
    setIsSymbolsMode(false);
    setShiftActive(true);
    setCapsLock(false);
  }

  function goToUserProfile(targetUserId, { closeModal } = {}) {
    if (!targetUserId) return;

    const go = () => {
      if (targetUserId === user?.id) {
        navigation.navigate("MainTabs", { screen: "Profile" });
        return;
      }

      navigation.navigate("UserProfile", { userId: targetUserId });
    };

    if (typeof closeModal === "function") {
      closeModal();
      setTimeout(go, 50);
      return;
    }

    go();
  }
    function renderOptionPills(options, selected, onSelect) {
    return (
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          marginTop: 9,
          gap: 8,
        }}
      >
        {options.map((opt) => {
          const isActive = selected === opt;

          return (
            <Pressable
              key={opt}
              onPress={() => onSelect(opt)}
              style={({ pressed }) => ({
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: isActive ? AMBER_BORDER : CARD_BORDER,
                backgroundColor: isActive
                  ? AMBER_SOFT
                  : pressed
                  ? "rgba(79, 99, 59, 0.06)"
                  : SURFACE,
              })}
            >
              <Text
                style={{
                  color: isActive ? EVENT_BROWN : OLIVE,
                  fontSize: 12.5,
                  fontWeight: "900",
                }}
              >
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  function renderPremiumInput({
    label,
    value,
    onChangeText,
    placeholder,
    multiline = false,
    numberOfLines,
  }) {
    return (
      <View style={{ marginBottom: 15 }}>
        <Text
          style={{
            color: MUTED,
            fontSize: 12,
            fontWeight: "900",
            textTransform: "uppercase",
            letterSpacing: 0.45,
            marginBottom: 7,
          }}
        >
          {label}
        </Text>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(107, 114, 128, 0.75)"
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={multiline ? "top" : "center"}
          style={{
            minHeight: multiline ? 108 : 48,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            backgroundColor: "rgba(255, 252, 245, 0.75)",
            paddingHorizontal: 13,
            paddingVertical: multiline ? 12 : 10,
            color: TEXT,
            fontSize: 14,
            fontWeight: "700",
            lineHeight: multiline ? 20 : undefined,
          }}
        />
      </View>
    );
  }

  function renderAboutView() {
    if (isEditingAbout) {
      return (
        <View>
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                color: MUTED,
                fontSize: 12,
                fontWeight: "900",
                textTransform: "uppercase",
                letterSpacing: 0.45,
              }}
            >
              Relationship status
            </Text>

            {renderOptionPills(
              RELATIONSHIP_OPTIONS,
              relationshipStatus,
              setRelationshipStatus
            )}
          </View>

          {renderPremiumInput({
            label: "Church name",
            value: churchName,
            onChangeText: setChurchName,
            placeholder: "e.g. Hope Community Church, Southampton",
          })}

          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                color: MUTED,
                fontSize: 12,
                fontWeight: "900",
                textTransform: "uppercase",
                letterSpacing: 0.45,
              }}
            >
              Faith journey
            </Text>

            {renderOptionPills(BAPTISM_OPTIONS, baptismStatus, setBaptismStatus)}
          </View>

          {renderPremiumInput({
            label: "Ministry / serving areas",
            value: ministryAreas,
            onChangeText: setMinistryAreas,
            placeholder: "e.g. Worship, Kids, Street outreach",
          })}

          {renderPremiumInput({
            label: "Favourite Bible verse",
            value: favouriteBibleVerse,
            onChangeText: setFavouriteBibleVerse,
            placeholder: 'e.g. "John 3:16 – For God so loved the world..."',
          })}

          {renderPremiumInput({
            label: "Short testimony",
            value: shortTestimony,
            onChangeText: setShortTestimony,
            placeholder: "Share a short version of your story with Jesus.",
            multiline: true,
            numberOfLines: 4,
          })}

          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                color: MUTED,
                fontSize: 12,
                fontWeight: "900",
                textTransform: "uppercase",
                letterSpacing: 0.45,
                marginBottom: 8,
              }}
            >
              Groups joined
            </Text>

            {groupsJoined.length === 0 ? (
              <Text
                style={{
                  color: MUTED,
                  fontSize: 13.5,
                  fontWeight: "700",
                  lineHeight: 19,
                }}
              >
                You are not part of any groups yet.
              </Text>
            ) : (
              <View style={{ gap: 7 }}>
                {groupsJoined.map((name) => (
                  <View
                    key={name}
                    style={{
                      borderRadius: 16,
                      backgroundColor: OLIVE_SOFT,
                      borderWidth: 1,
                      borderColor: OLIVE_BORDER,
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                    }}
                  >
                    <Text
                      style={{
                        color: OLIVE,
                        fontSize: 13,
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

          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 9,
              marginTop: 2,
            }}
          >
            <Pressable
              onPress={() => setIsEditingAbout(false)}
              disabled={savingAbout}
              style={({ pressed }) => ({
                borderRadius: 999,
                paddingVertical: 11,
                paddingHorizontal: 15,
                backgroundColor: pressed
                  ? "rgba(79, 99, 59, 0.08)"
                  : SURFACE,
                borderWidth: 1,
                borderColor: OLIVE_BORDER,
                opacity: savingAbout ? 0.65 : 1,
              })}
            >
              <Text
                style={{
                  color: OLIVE,
                  fontSize: 13,
                  fontWeight: "900",
                }}
              >
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSaveAbout}
              disabled={savingAbout}
              style={({ pressed }) => ({
                borderRadius: 999,
                paddingVertical: 11,
                paddingHorizontal: 16,
                backgroundColor: pressed
                  ? "rgba(180, 83, 9, 0.88)"
                  : EVENT_AMBER,
                borderWidth: 1,
                borderColor: EVENT_AMBER,
                opacity: savingAbout ? 0.7 : 1,
                shadowColor: EVENT_AMBER,
                shadowOpacity: 0.18,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: 3,
              })}
            >
              <Text
                style={{
                  color: SURFACE,
                  fontSize: 13,
                  fontWeight: "900",
                }}
              >
                {savingAbout ? "Saving…" : "Save"}
              </Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View>
        <PremiumFieldRow
          icon="heart-outline"
          label="Relationship status"
          value={relationshipStatus || "Not set yet"}
          mutedValue={!relationshipStatus}
        />

        <PremiumFieldRow
          icon="business-outline"
          label="Church name"
          value={churchName || "Not set yet"}
          mutedValue={!churchName}
        />

        <PremiumFieldRow
          icon="water-outline"
          label="Faith journey"
          value={baptismStatus || "Not set yet"}
          mutedValue={!baptismStatus}
        />

        <PremiumFieldRow
          icon="hand-left-outline"
          label="Ministry / serving areas"
          value={ministryAreas || "Not set yet"}
          mutedValue={!ministryAreas}
        />

        <PremiumFieldRow
          icon="book-outline"
          label="Favourite Bible verse"
          value={favouriteBibleVerse || "Not set yet"}
          mutedValue={!favouriteBibleVerse}
        />

        <PremiumFieldRow
          icon="sparkles-outline"
          label="Short testimony"
          value={shortTestimony || "Not set yet"}
          mutedValue={!shortTestimony}
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
              You are not part of any groups yet.
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
            Loading your posts…
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
            <Ionicons name="chatbubble-ellipses-outline" size={23} color={OLIVE} />
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
            Your shared posts will appear here.
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
              currentUserId={user.id}
              author={{
                name: isAnon ? "Anonymous" : displayName || "Triunely user",
                avatarUrl: isAnon ? null : avatarUrl,
                isAnonymous: isAnon,
                isOwner: true,
              }}
              onDelete={handleDeletePost}
              onHide={handleHidePost}
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

  function renderEventsTab() {
    if (loadingEvents) {
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
            Loading your events…
          </Text>
        </View>
      );
    }

    function formatSmallEventDate(startAt) {
      if (!startAt) return { day: "TBC", month: "DATE" };

      try {
        const d = new Date(startAt);

        return {
          day: d.toLocaleDateString(undefined, { day: "numeric" }),
          month: d
            .toLocaleDateString(undefined, { month: "short" })
            .toUpperCase(),
        };
      } catch {
        return { day: "TBC", month: "DATE" };
      }
    }

    function formatSmallEventTime(startAt) {
      if (!startAt) return "";

      try {
        const d = new Date(startAt);

        return d.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        return "";
      }
    }

    function getEventImageUrl(event) {
      return (
        event?.image_url ||
        event?.cover_image_url ||
        event?.banner_url ||
        event?.poster_url ||
        event?.media_url ||
        event?.church?.cover_image_url ||
        event?.church?.avatar_url ||
        null
      );
    }

    function getFallbackEventImage(event) {
      const title = String(event?.title || "").toLowerCase();

      if (
        title.includes("carol") ||
        title.includes("christmas") ||
        title.includes("worship") ||
        title.includes("music")
      ) {
        return "https://images.unsplash.com/photo-1512389142860-9c449e58a543?q=80&w=1200&auto=format&fit=crop";
      }

      if (
        title.includes("prayer") ||
        title.includes("bible") ||
        title.includes("service")
      ) {
        return "https://images.unsplash.com/photo-1507692049790-de58290a4334?q=80&w=1200&auto=format&fit=crop";
      }

      if (
        title.includes("youth") ||
        title.includes("social") ||
        title.includes("party") ||
        title.includes("meal")
      ) {
        return "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?q=80&w=1200&auto=format&fit=crop";
      }

      return "https://images.unsplash.com/photo-1507692049790-de58290a4334?q=80&w=1200&auto=format&fit=crop";
    }

    function getEventIcon(event) {
      const title = String(event?.title || "").toLowerCase();

      if (
        title.includes("carol") ||
        title.includes("music") ||
        title.includes("worship")
      ) {
        return "musical-notes-outline";
      }

      if (title.includes("christmas")) return "sparkles-outline";
      if (title.includes("meal") || title.includes("food")) {
        return "restaurant-outline";
      }
      if (title.includes("prayer")) return "hand-left-outline";

      return "sparkles-outline";
    }

    const previewEvents = (userEvents || []).slice(0, 3);

    const renderEventCard = (event) => {
      const location =
        event.location_name ||
        event.location_address ||
        (event.online_url ? "Online" : "Location TBC");

      const date = formatSmallEventDate(event.start_at);
      const timeLabel = formatSmallEventTime(event.start_at);
      const eventImageUrl = getEventImageUrl(event) || getFallbackEventImage(event);
      const eventIcon = getEventIcon(event);

      return (
        <Pressable
          key={event.id}
          onPress={() => {
            const targetNav = navigation.getParent?.() || navigation;

            targetNav.navigate("EventDetails", {
              eventId: event.id,
              event,
            });
          }}
          style={({ pressed }) => ({
            width: 166,
            minHeight: 190,
            marginRight: 12,
            borderRadius: 24,
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            overflow: "hidden",
            shadowColor: SHADOW,
            shadowOpacity: pressed ? 0.06 : 0.12,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: pressed ? 2 : 4,
            transform: [{ scale: pressed ? 0.985 : 1 }],
          })}
        >
          <View
            style={{
              height: 94,
              width: "100%",
              backgroundColor: OLIVE_SOFT,
              overflow: "hidden",
            }}
          >
            <Image
              source={{ uri: eventImageUrl }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />

            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.18)",
              }}
            />

            <View
              style={{
                position: "absolute",
                top: 9,
                left: 9,
                width: 44,
                height: 48,
                borderRadius: 14,
                backgroundColor: "rgba(255,255,255,0.94)",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: SHADOW,
                shadowOpacity: 0.12,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 3 },
                elevation: 3,
              }}
            >
              <Text
                style={{
                  color: TEXT,
                  fontSize: 16,
                  fontWeight: "900",
                  lineHeight: 18,
                }}
                numberOfLines={1}
              >
                {date.day}
              </Text>

              <Text
                style={{
                  color: EVENT_AMBER,
                  fontSize: 9.5,
                  fontWeight: "900",
                  letterSpacing: 0.4,
                  marginTop: 1,
                }}
                numberOfLines={1}
              >
                {date.month}
              </Text>
            </View>

            <View
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: "rgba(255,255,255,0.92)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name={eventIcon} size={18} color={EVENT_AMBER} />
            </View>
          </View>

          <View
            style={{
              flex: 1,
              paddingHorizontal: 11,
              paddingTop: 10,
              paddingBottom: 11,
              backgroundColor: SURFACE,
            }}
          >
            <Text
              style={{
                ...serifHeading,
                fontSize: 17,
                lineHeight: 20,
                letterSpacing: -0.15,
              }}
              numberOfLines={2}
            >
              {event.title || "Untitled event"}
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <Ionicons name="time-outline" size={13} color={EVENT_AMBER} />

              <Text
                style={{
                  color: EVENT_AMBER,
                  fontSize: 11.5,
                  fontWeight: "900",
                  marginLeft: 4,
                }}
                numberOfLines={1}
              >
                {timeLabel || "Time TBC"}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                marginTop: 5,
              }}
            >
              <Ionicons
                name="location-outline"
                size={13}
                color={OLIVE}
                style={{ marginTop: 1 }}
              />

              <Text
                style={{
                  flex: 1,
                  color: MUTED,
                  fontSize: 11,
                  fontWeight: "700",
                  lineHeight: 14,
                  marginLeft: 4,
                }}
                numberOfLines={2}
              >
                {location}
              </Text>
            </View>

            <View
              style={{
                marginTop: 9,
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: "rgba(15, 23, 42, 0.07)",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  color: OLIVE,
                  fontSize: 11.5,
                  fontWeight: "900",
                }}
              >
                View event
              </Text>

              <Ionicons name="chevron-forward" size={15} color={OLIVE} />
            </View>
          </View>
        </Pressable>
      );
    };

    const renderAddEventCard = () => (
      <Pressable
        onPress={() => navigation.navigate("Events")}
        style={({ pressed }) => ({
          width: 84,
          minHeight: 190,
          borderRadius: 24,
          paddingVertical: 12,
          paddingHorizontal: 8,
          backgroundColor: SURFACE,
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: CARD_BORDER,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: SHADOW,
          shadowOpacity: pressed ? 0.03 : 0.07,
          shadowRadius: 7,
          shadowOffset: { width: 0, height: 3 },
          elevation: pressed ? 1 : 2,
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: OLIVE_SOFT,
            borderWidth: 1,
            borderColor: OLIVE_BORDER,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 8,
          }}
        >
          <Ionicons name="add" size={23} color={OLIVE} />
        </View>

        <Text
          style={{
            color: OLIVE,
            fontSize: 11.5,
            fontWeight: "900",
            textAlign: "center",
            lineHeight: 14,
          }}
        >
          More
        </Text>

        <Text
          style={{
            color: MUTED,
            fontSize: 10,
            fontWeight: "700",
            textAlign: "center",
            lineHeight: 12,
            marginTop: 2,
          }}
        >
          events
        </Text>
      </Pressable>
    );

    if (!userEvents || userEvents.length === 0) {
      return (
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 4 }}
          >
            {renderAddEventCard()}
          </ScrollView>

          <Text
            style={{
              color: MUTED,
              fontWeight: "700",
              fontSize: 13,
              lineHeight: 18,
              marginTop: 12,
            }}
          >
            You don&apos;t have any events yet.
          </Text>

          <Pressable
            onPress={() => navigation.navigate("Events")}
            style={({ pressed }) => ({
              opacity: pressed ? 0.75 : 1,
              marginTop: 12,
              alignSelf: "center",
            })}
          >
            <Text
              style={{
                color: EVENT_AMBER,
                fontWeight: "900",
                fontSize: 13,
              }}
            >
              View all events
            </Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={{ marginTop: 2 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 4 }}
        >
          {previewEvents.map(renderEventCard)}
          {renderAddEventCard()}
        </ScrollView>

        <Pressable
          onPress={() => navigation.navigate("Events")}
          style={({ pressed }) => ({
            opacity: pressed ? 0.75 : 1,
            marginTop: 14,
            alignSelf: "center",
          })}
        >
          <Text
            style={{
              color: EVENT_AMBER,
              fontWeight: "900",
              fontSize: 13,
            }}
          >
            View all events
          </Text>
        </Pressable>
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

  if (!user) {
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
            Not signed in
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
            Please sign in again to manage your profile.
          </Text>
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
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 32,
                    lineHeight: 37,
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
                  }}
                  numberOfLines={2}
                >
                  Your faith, fellowship and journey
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingTop: 2,
                }}
              >
                <UnifiedInboxHeaderButton
                  navigation={navigation}
                  iconButtonStyle={iconButtonStyle}
                  iconSize={21}
                />

                <Pressable
                  onPress={handleOpenNotifications}
                  style={iconButtonStyle}
                  hitSlop={8}
                >
                  <Ionicons name="notifications-outline" size={21} color={OLIVE} />

                  {unreadNotificationCount > 0 && (
                    <View style={iconBadgeStyle}>
                      <Text style={iconBadgeTextStyle}>
                        {unreadNotificationCount}
                      </Text>
                    </View>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => openFellowshipRequests()}
                  style={iconButtonStyle}
                  hitSlop={8}
                >
                  <Ionicons name="people-outline" size={21} color={OLIVE} />

                  {pendingRequests.length > 0 && (
                    <View style={iconBadgeStyle}>
                      <Text style={iconBadgeTextStyle}>
                        {pendingRequests.length}
                      </Text>
                    </View>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => setPeopleSearchModalVisible(true)}
                  style={iconButtonStyle}
                  hitSlop={8}
                >
                  <Ionicons name="search-outline" size={21} color={OLIVE} />
                </Pressable>
              </View>
            </View>

            <View style={{ marginBottom: 16 }}>
              <View
                style={{
                  height: 168,
                  width: "100%",
                  overflow: "hidden",
                  backgroundColor: OLIVE_SOFT,
                  marginBottom: -50,
                }}
              >
                {coverImageUrl ? (
                  <Image
                    source={{ uri: coverImageUrl }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      flex: 1,
                      justifyContent: "center",
                      alignItems: "center",
                      paddingHorizontal: 22,
                      backgroundColor: OLIVE_SOFT,
                    }}
                  >
                    <Ionicons
                      name="image-outline"
                      size={24}
                      color={OLIVE}
                      style={{ marginBottom: 8 }}
                    />

                    <Text
                      style={{
                        color: OLIVE,
                        fontSize: 12.5,
                        fontWeight: "800",
                        textAlign: "center",
                      }}
                    >
                      Add a background image to personalise your profile.
                    </Text>
                  </View>
                )}

                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 78,
                    backgroundColor: "rgba(31, 41, 51, 0.16)",
                  }}
                />

                <Pressable
                  onPress={handlePickCoverImage}
                  disabled={savingCover}
                  style={({ pressed }) => ({
                    position: "absolute",
                    top: 12,
                    right: 14,
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: savingCover
                      ? SURFACE
                      : pressed
                      ? "rgba(180, 83, 9, 0.88)"
                      : EVENT_AMBER,
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: AMBER_BORDER,
                    opacity: savingCover ? 0.7 : 1,
                  })}
                >
                  <Ionicons
                    name={savingCover ? "time-outline" : "camera-outline"}
                    size={18}
                    color={savingCover ? EVENT_AMBER : SURFACE}
                  />
                </Pressable>
              </View>

              <View
                style={{
                  paddingHorizontal: 18,
                }}
              >
                <View
                  style={{
                    ...premiumCardStyle,
                    paddingTop: 56,
                    paddingHorizontal: 16,
                    paddingBottom: 16,
                    borderRadius: 28,
                  }}
                >
                  <View
                    style={{
                      position: "absolute",
                      top: -48,
                      left: 16,
                    }}
                  >
                    {avatarUrl ? (
                      <Image
                        source={{ uri: avatarUrl }}
                        style={{
                          width: 98,
                          height: 98,
                          borderRadius: 49,
                          borderWidth: 4,
                          borderColor: PREMIUM_CREAM,
                          backgroundColor: OLIVE_SOFT,
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 98,
                          height: 98,
                          borderRadius: 49,
                          backgroundColor: OLIVE,
                          justifyContent: "center",
                          alignItems: "center",
                          borderWidth: 4,
                          borderColor: PREMIUM_CREAM,
                        }}
                      >
                        <Text
                          style={{
                            color: SURFACE,
                            fontSize: 32,
                            fontWeight: "900",
                          }}
                        >
                          {initials}
                        </Text>
                      </View>
                    )}

                    <Pressable
                      onPress={handlePickAvatar}
                      disabled={savingAvatar}
                      style={({ pressed }) => ({
                        position: "absolute",
                        bottom: -3,
                        right: -4,
                        width: 33,
                        height: 33,
                        borderRadius: 16.5,
                        backgroundColor: savingAvatar
                          ? SURFACE
                          : pressed
                          ? "rgba(180, 83, 9, 0.88)"
                          : EVENT_AMBER,
                        justifyContent: "center",
                        alignItems: "center",
                        borderWidth: 2,
                        borderColor: PREMIUM_CREAM,
                        opacity: savingAvatar ? 0.7 : 1,
                      })}
                    >
                      <Ionicons
                        name={savingAvatar ? "time-outline" : "camera-outline"}
                        size={17}
                        color={savingAvatar ? EVENT_AMBER : SURFACE}
                      />
                    </Pressable>
                  </View>

                  {!isEditingDisplayName ? (
                    <View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            flex: 1,
                            minWidth: 0,
                            paddingRight: 12,
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
                              <VerifiedBadge size={17} />
                            </View>
                          ) : null}
                        </View>

                        <Pressable
                          onPress={() => {
                            setEditedDisplayName(displayName ?? "");
                            setIsEditingDisplayName(true);
                          }}
                          style={({ pressed }) => ({
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: pressed
                              ? "rgba(79, 99, 59, 0.12)"
                              : OLIVE_SOFT,
                            borderWidth: 1,
                            borderColor: OLIVE_BORDER,
                            alignItems: "center",
                            justifyContent: "center",
                          })}
                        >
                          <Ionicons name="create-outline" size={18} color={OLIVE} />
                        </Pressable>
                      </View>

                      <Text
                        style={{
                          color: MUTED,
                          fontSize: 13,
                          fontWeight: "700",
                          marginTop: 4,
                        }}
                        numberOfLines={1}
                      >
                        {user?.email}
                      </Text>
                    </View>
                  ) : (
                    <View>
                      <Text
                        style={{
                          color: MUTED,
                          fontSize: 12,
                          fontWeight: "900",
                          textTransform: "uppercase",
                          letterSpacing: 0.45,
                          marginBottom: 8,
                        }}
                      >
                        Profile name
                      </Text>

                      <TextInput
                        value={editedDisplayName}
                        onChangeText={setEditedDisplayName}
                        placeholder="Enter your name"
                        placeholderTextColor="rgba(107, 114, 128, 0.75)"
                        style={{
                          minHeight: 48,
                          borderRadius: 18,
                          borderWidth: 1,
                          borderColor: CARD_BORDER,
                          backgroundColor: "rgba(255, 252, 245, 0.75)",
                          paddingHorizontal: 13,
                          color: TEXT,
                          fontSize: 15,
                          fontWeight: "800",
                        }}
                      />

                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "flex-end",
                          gap: 9,
                          marginTop: 10,
                        }}
                      >
                        <Pressable
                          onPress={handleCancelDisplayNameEdit}
                          disabled={savingDisplayName}
                          style={({ pressed }) => ({
                            borderRadius: 999,
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            backgroundColor: pressed
                              ? "rgba(79, 99, 59, 0.08)"
                              : SURFACE,
                            borderWidth: 1,
                            borderColor: OLIVE_BORDER,
                          })}
                        >
                          <Text
                            style={{
                              color: OLIVE,
                              fontSize: 13,
                              fontWeight: "900",
                            }}
                          >
                            Cancel
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={handleSaveDisplayName}
                          disabled={savingDisplayName}
                          style={({ pressed }) => ({
                            borderRadius: 999,
                            paddingHorizontal: 15,
                            paddingVertical: 10,
                            backgroundColor: pressed
                              ? "rgba(180, 83, 9, 0.88)"
                              : EVENT_AMBER,
                            borderWidth: 1,
                            borderColor: EVENT_AMBER,
                            opacity: savingDisplayName ? 0.7 : 1,
                          })}
                        >
                          <Text
                            style={{
                              color: SURFACE,
                              fontSize: 13,
                              fontWeight: "900",
                            }}
                          >
                            {savingDisplayName ? "Saving…" : "Save"}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  )}

                  <View
                    style={{
                      flexDirection: "row",
                      gap: 9,
                      marginTop: 15,
                    }}
                  >
                    {[
                      { label: "Posts", value: postsCount },
                      { label: "Events", value: eventsCount },
                      { label: "Fellowship", value: followingCount },
                    ].map((item) => (
                      <View
                        key={item.label}
                        style={{
                          flex: 1,
                          borderRadius: 18,
                          backgroundColor: item.label === "Events" ? AMBER_SOFT : OLIVE_SOFT,
                          borderWidth: 1,
                          borderColor:
                            item.label === "Events" ? AMBER_BORDER : OLIVE_BORDER,
                          paddingVertical: 10,
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: item.label === "Events" ? EVENT_BROWN : OLIVE,
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
                        >
                          {item.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            <View
              style={{
                paddingHorizontal: 18,
              }}
            >
              <View
                style={{
                  ...premiumCardStyle,
                  padding: 10,
                  marginBottom: 14,
                  flexDirection: "row",
                  gap: 7,
                }}
              >
                <PremiumTabButton
                  label="About"
                  icon="person-outline"
                  active={activeTab === "about"}
                  onPress={() => setActiveTab("about")}
                />

                <PremiumTabButton
                  label="Events"
                  icon="calendar-outline"
                  active={activeTab === "events"}
                  onPress={() => setActiveTab("events")}
                />

                <PremiumTabButton
                  label="Posts"
                  icon="chatbubble-outline"
                  active={activeTab === "posts"}
                  onPress={() => setActiveTab("posts")}
                />
              </View>

              <View
                style={{
                  ...premiumCardStyle,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                {activeTab === "about" ? (
                  <PremiumSectionHeader
                    title="About"
                    subtitle="Your faith profile and community details"
                    icon="sparkles-outline"
                    actionLabel={isEditingAbout ? null : "Edit"}
                    onAction={() => setIsEditingAbout(true)}
                  />
                ) : activeTab === "events" ? (
                  <PremiumSectionHeader
                    title="Events"
                    subtitle="Events you are connected with"
                    icon="calendar-outline"
                  />
                ) : (
                  <PremiumSectionHeader
                    title="Posts"
                    subtitle="Your shared encouragement and updates"
                    icon="chatbubble-ellipses-outline"
                  />
                )}

                {activeTab === "about"
                  ? renderAboutView()
                  : activeTab === "events"
                  ? renderEventsTab()
                  : renderPostsTab()}
              </View>

              <View
                style={{
                  ...premiumCardStyle,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <PremiumSectionHeader
                  title="Church Admin"
                  subtitle="Admin access and ministry tools"
                  icon="shield-checkmark-outline"
                />

                <View
                  style={{
                    borderRadius: 18,
                    backgroundColor: adminChurchId ? OLIVE_SOFT : AMBER_SOFT,
                    borderWidth: 1,
                    borderColor: adminChurchId ? OLIVE_BORDER : AMBER_BORDER,
                    padding: 13,
                  }}
                >
                  {checkingChurchAdmin ? (
                    <Text
                      style={{
                        color: MUTED,
                        fontSize: 13.5,
                        fontWeight: "800",
                        lineHeight: 20,
                      }}
                    >
                      Checking admin access…
                    </Text>
                  ) : adminChurchId ? (
                    <Text
                      style={{
                        color: OLIVE,
                        fontSize: 13.5,
                        fontWeight: "900",
                        lineHeight: 20,
                      }}
                    >
                      You are set as a church admin. Use the Church tab at the
                      bottom to open your church profile.
                    </Text>
                  ) : (
                    <Text
                      style={{
                        color: EVENT_BROWN,
                        fontSize: 13.5,
                        fontWeight: "900",
                        lineHeight: 20,
                      }}
                    >
                      This account is not set as a church admin yet.
                    </Text>
                  )}
                </View>
              </View>

              <Pressable
                onPress={handleSignOut}
                style={({ pressed }) => ({
                  backgroundColor: pressed
                    ? "rgba(153, 27, 27, 0.86)"
                    : DANGER_RED,
                  paddingVertical: 13,
                  borderRadius: 18,
                  marginBottom: 10,
                })}
              >
                <Text
                  style={{
                    color: SURFACE,
                    fontWeight: "900",
                    textAlign: "center",
                  }}
                >
                  Sign out
                </Text>
              </Pressable>
            </View>
          </ScrollView>

          <PostCommentsModal
            visible={commentsModalVisible}
            post={selectedPostForComments}
            currentUserId={user.id}
            onClose={handleCloseComments}
          />

          <Modal
            visible={peopleSearchModalVisible}
            transparent
            animationType="slide"
            onRequestClose={closePeopleSearchModal}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.62)",
                justifyContent: "flex-end",
              }}
            >
              <View
                style={{
                  backgroundColor: PREMIUM_CREAM,
                  borderTopLeftRadius: 26,
                  borderTopRightRadius: 26,
                  padding: 18,
                  maxHeight: "84%",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 14,
                  }}
                >
                  <Text
                    style={{
                      ...serifHeading,
                      fontSize: 24,
                      lineHeight: 29,
                    }}
                  >
                    Find people
                  </Text>

                  <Pressable
                    onPress={closePeopleSearchModal}
                    style={({ pressed }) => ({
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor: pressed
                        ? "rgba(79, 99, 59, 0.10)"
                        : SURFACE,
                      borderWidth: 1,
                      borderColor: CARD_BORDER,
                    })}
                  >
                    <Text
                      style={{
                        color: OLIVE,
                        fontSize: 13,
                        fontWeight: "900",
                      }}
                    >
                      Close
                    </Text>
                  </Pressable>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 12,
                    gap: 8,
                  }}
                >
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search by name..."
                    placeholderTextColor="rgba(107, 114, 128, 0.75)"
                    autoCapitalize="words"
                    style={{
                      flex: 1,
                      minHeight: 48,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: CARD_BORDER,
                      backgroundColor: SURFACE,
                      paddingHorizontal: 13,
                      color: TEXT,
                      fontSize: 14,
                      fontWeight: "800",
                    }}
                  />

                  <Pressable
                    onPress={handleSearchPeople}
                    disabled={searchLoading}
                    style={({ pressed }) => ({
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: pressed
                        ? "rgba(180, 83, 9, 0.88)"
                        : EVENT_AMBER,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: searchLoading ? 0.7 : 1,
                    })}
                  >
                    {searchLoading ? (
                      <ActivityIndicator size="small" color={SURFACE} />
                    ) : (
                      <Ionicons name="search-outline" size={21} color={SURFACE} />
                    )}
                  </Pressable>
                </View>

                {searchError ? (
                  <Text
                    style={{
                      color: DANGER_RED,
                      fontWeight: "800",
                      marginBottom: 10,
                    }}
                  >
                    {searchError}
                  </Text>
                ) : null}

                <ScrollView
                  style={{ maxHeight: 260 }}
                  keyboardShouldPersistTaps="handled"
                >
                  {searchResults.length === 0 ? (
                    <Text
                      style={{
                        color: MUTED,
                        fontSize: 13,
                        fontWeight: "700",
                        lineHeight: 19,
                        marginVertical: 10,
                      }}
                    >
                      Search for someone by name to send a fellowship request.
                    </Text>
                  ) : (
                    searchResults.map((person) => {
                      const alreadyFriend = following.some(
                        (p) => p.id === person.id
                      );
                      const justRequested = justRequestedIds.includes(person.id);
                      const disabled = alreadyFriend || justRequested;

                      return (
                        <View
                          key={person.id}
                          style={{
                            ...premiumCardStyle,
                            padding: 12,
                            marginBottom: 10,
                            flexDirection: "row",
                            alignItems: "center",
                          }}
                        >
                          <Pressable
                            onPress={() =>
                              goToUserProfile(person.id, {
                                closeModal: closePeopleSearchModal,
                              })
                            }
                            style={({ pressed }) => ({
                              flexDirection: "row",
                              alignItems: "center",
                              flex: 1,
                              opacity: pressed ? 0.75 : 1,
                              minWidth: 0,
                            })}
                          >
                            {person.avatar_url ? (
                              <Image
                                source={{ uri: person.avatar_url }}
                                style={{
                                  width: 42,
                                  height: 42,
                                  borderRadius: 21,
                                  marginRight: 10,
                                }}
                              />
                            ) : (
                              <View
                                style={{
                                  width: 42,
                                  height: 42,
                                  borderRadius: 21,
                                  backgroundColor: OLIVE,
                                  justifyContent: "center",
                                  alignItems: "center",
                                  marginRight: 10,
                                }}
                              >
                                <Text
                                  style={{
                                    color: SURFACE,
                                    fontSize: 16,
                                    fontWeight: "900",
                                  }}
                                >
                                  {safeInitials(person.display_name)}
                                </Text>
                              </View>
                            )}

                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text
                                style={{
                                  color: TEXT,
                                  fontSize: 14,
                                  fontWeight: "900",
                                }}
                                numberOfLines={1}
                              >
                                {person.display_name || "Triunely user"}
                              </Text>

                              <Text
                                style={{
                                  color: MUTED,
                                  fontSize: 12,
                                  fontWeight: "700",
                                  marginTop: 2,
                                }}
                              >
                                Tap to view profile
                              </Text>
                            </View>
                          </Pressable>

                          <Pressable
                            onPress={() => handleSendFellowshipRequest(person)}
                            disabled={disabled}
                            style={({ pressed }) => ({
                              borderRadius: 999,
                              paddingHorizontal: 11,
                              paddingVertical: 8,
                              backgroundColor: disabled
                                ? "rgba(107, 114, 128, 0.10)"
                                : pressed
                                ? "rgba(180, 83, 9, 0.88)"
                                : EVENT_AMBER,
                              opacity: disabled ? 0.8 : 1,
                            })}
                          >
                            <Text
                              style={{
                                color: disabled ? MUTED : SURFACE,
                                fontSize: 12,
                                fontWeight: "900",
                              }}
                            >
                              {alreadyFriend
                                ? "Friends"
                                : justRequested
                                ? "Sent"
                                : "Request"}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })
                  )}
                </ScrollView>

                <View
                  style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTopWidth: 1,
                    borderTopColor: CARD_BORDER,
                  }}
                >
                  {(isSymbolsMode ? SYMBOL_ROWS : LETTER_ROWS).map((row, rowIndex) => (
                    <View
                      key={`keyboard-row-${rowIndex}`}
                      style={{
                        flexDirection: "row",
                        justifyContent: "center",
                        gap: 6,
                        marginBottom: 7,
                      }}
                    >
                      {row.map((key) => {
                        const label =
                          !isSymbolsMode && (shiftActive || capsLock)
                            ? key.toUpperCase()
                            : key;

                        return (
                          <Pressable
                            key={key}
                            onPress={() => handleKeyPress(key)}
                            style={({ pressed }) => ({
                              minWidth: 29,
                              minHeight: 34,
                              borderRadius: 10,
                              backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
                              borderWidth: 1,
                              borderColor: CARD_BORDER,
                              alignItems: "center",
                              justifyContent: "center",
                            })}
                          >
                            <Text
                              style={{
                                color: TEXT,
                                fontSize: 13,
                                fontWeight: "900",
                              }}
                            >
                              {label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: 7,
                    }}
                  >
                    <Pressable
                      onPress={handleToggleSymbols}
                      style={({ pressed }) => ({
                        minHeight: 36,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
                        borderWidth: 1,
                        borderColor: CARD_BORDER,
                        justifyContent: "center",
                      })}
                    >
                      <Text style={{ color: OLIVE, fontWeight: "900" }}>
                        {isSymbolsMode ? "ABC" : "123"}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={handleShiftPress}
                      style={({ pressed }) => ({
                        minHeight: 36,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        backgroundColor:
                          shiftActive || capsLock ? AMBER_SOFT : pressed ? OLIVE_SOFT : SURFACE,
                        borderWidth: 1,
                        borderColor:
                          shiftActive || capsLock ? AMBER_BORDER : CARD_BORDER,
                        justifyContent: "center",
                      })}
                    >
                      <Text style={{ color: EVENT_BROWN, fontWeight: "900" }}>
                        Shift
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={handleSpace}
                      style={({ pressed }) => ({
                        minHeight: 36,
                        minWidth: 92,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
                        borderWidth: 1,
                        borderColor: CARD_BORDER,
                        justifyContent: "center",
                        alignItems: "center",
                      })}
                    >
                      <Text style={{ color: OLIVE, fontWeight: "900" }}>
                        Space
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={handleBackspace}
                      style={({ pressed }) => ({
                        minHeight: 36,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
                        borderWidth: 1,
                        borderColor: CARD_BORDER,
                        justifyContent: "center",
                      })}
                    >
                      <Ionicons name="backspace-outline" size={18} color={OLIVE} />
                    </Pressable>

                    <Pressable
                      onPress={handleClear}
                      style={({ pressed }) => ({
                        minHeight: 36,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        backgroundColor: pressed ? AMBER_SOFT : SURFACE,
                        borderWidth: 1,
                        borderColor: AMBER_BORDER,
                        justifyContent: "center",
                      })}
                    >
                      <Text style={{ color: EVENT_BROWN, fontWeight: "900" }}>
                        Clear
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          </Modal>

          <Modal
            visible={requestsModalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setRequestsModalVisible(false)}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.62)",
                justifyContent: "flex-end",
              }}
            >
              <View
                style={{
                  backgroundColor: PREMIUM_CREAM,
                  borderTopLeftRadius: 26,
                  borderTopRightRadius: 26,
                  padding: 18,
                  maxHeight: "74%",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 14,
                  }}
                >
                  <Text
                    style={{
                      ...serifHeading,
                      fontSize: 24,
                      lineHeight: 29,
                    }}
                  >
                    Fellowship requests
                  </Text>

                  <Pressable
                    onPress={() => setRequestsModalVisible(false)}
                    style={({ pressed }) => ({
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor: pressed
                        ? "rgba(79, 99, 59, 0.10)"
                        : SURFACE,
                      borderWidth: 1,
                      borderColor: CARD_BORDER,
                    })}
                  >
                    <Text
                      style={{
                        color: OLIVE,
                        fontSize: 13,
                        fontWeight: "900",
                      }}
                    >
                      Close
                    </Text>
                  </Pressable>
                </View>

                {pendingRequests && pendingRequests.length > 0 ? (
                  <ScrollView>
                    {pendingRequests.map((req) => {
                      const profile = req.profile;
                      const name = profile?.display_name || "Triunely user";
                      const avatar = profile?.avatar_url || null;
                      const initialsReq = safeInitials(profile?.display_name);

                      return (
                        <View
                          key={req.id}
                          style={{
                            ...premiumCardStyle,
                            padding: 12,
                            marginBottom: 10,
                          }}
                        >
                          <Pressable
                            onPress={() =>
                              goToUserProfile(req.follower_id, {
                                closeModal: () => setRequestsModalVisible(false),
                              })
                            }
                            hitSlop={8}
                            style={({ pressed }) => ({
                              flexDirection: "row",
                              alignItems: "center",
                              opacity: pressed ? 0.75 : 1,
                            })}
                          >
                            {avatar ? (
                              <Image
                                source={{ uri: avatar }}
                                style={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: 22,
                                  marginRight: 10,
                                }}
                              />
                            ) : (
                              <View
                                style={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: 22,
                                  backgroundColor: OLIVE,
                                  justifyContent: "center",
                                  alignItems: "center",
                                  marginRight: 10,
                                }}
                              >
                                <Text
                                  style={{
                                    color: SURFACE,
                                    fontSize: 16,
                                    fontWeight: "900",
                                  }}
                                >
                                  {initialsReq}
                                </Text>
                              </View>
                            )}

                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text
                                style={{
                                  color: TEXT,
                                  fontSize: 14,
                                  fontWeight: "900",
                                }}
                                numberOfLines={1}
                              >
                                {name}
                              </Text>

                              <Text
                                style={{
                                  color: MUTED,
                                  fontSize: 12,
                                  fontWeight: "700",
                                  marginTop: 2,
                                }}
                              >
                                Wants to connect in fellowship
                              </Text>
                            </View>
                          </Pressable>

                          <View
                            style={{
                              flexDirection: "row",
                              gap: 8,
                              marginTop: 12,
                            }}
                          >
                            <Pressable
                              onPress={() => handleAcceptFellowshipRequest(req)}
                              style={({ pressed }) => ({
                                flex: 1,
                                borderRadius: 999,
                                paddingVertical: 10,
                                backgroundColor: pressed
                                  ? "rgba(79, 99, 59, 0.82)"
                                  : OLIVE,
                              })}
                            >
                              <Text
                                style={{
                                  color: SURFACE,
                                  fontSize: 13,
                                  fontWeight: "900",
                                  textAlign: "center",
                                }}
                              >
                                Accept
                              </Text>
                            </Pressable>

                            <Pressable
                              onPress={() => handleDeclineFellowshipRequest(req.id)}
                              style={({ pressed }) => ({
                                flex: 1,
                                borderRadius: 999,
                                paddingVertical: 10,
                                backgroundColor: pressed
                                  ? "rgba(153, 27, 27, 0.10)"
                                  : SURFACE,
                                borderWidth: 1,
                                borderColor: "rgba(153, 27, 27, 0.20)",
                              })}
                            >
                              <Text
                                style={{
                                  color: DANGER_RED,
                                  fontSize: 13,
                                  fontWeight: "900",
                                  textAlign: "center",
                                }}
                              >
                                Decline
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 13.5,
                      fontWeight: "700",
                      lineHeight: 20,
                    }}
                  >
                    You have no pending fellowship requests.
                  </Text>
                )}
              </View>
            </View>
          </Modal>

          <Modal
            visible={!!pendingAvatar}
            transparent
            animationType="fade"
            onRequestClose={() => {
              if (!savingAvatar) setPendingAvatar(null);
            }}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.68)",
                alignItems: "center",
                justifyContent: "center",
                padding: 22,
              }}
            >
              <View
                style={{
                  ...premiumCardStyle,
                  width: "100%",
                  maxWidth: 360,
                  padding: 18,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 22,
                    lineHeight: 27,
                    textAlign: "center",
                  }}
                >
                  Update profile picture?
                </Text>

                {pendingAvatar?.uri ? (
                  <Image
                    source={{ uri: pendingAvatar.uri }}
                    style={{
                      width: 160,
                      height: 160,
                      borderRadius: 80,
                      marginTop: 16,
                      marginBottom: 16,
                      borderWidth: 4,
                      borderColor: PREMIUM_CREAM,
                      backgroundColor: OLIVE_SOFT,
                    }}
                  />
                ) : null}

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 13.5,
                    fontWeight: "700",
                    lineHeight: 20,
                    textAlign: "center",
                  }}
                >
                  This will replace your current profile picture.
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    gap: 9,
                    marginTop: 18,
                    width: "100%",
                  }}
                >
                  <Pressable
                    onPress={() => setPendingAvatar(null)}
                    disabled={savingAvatar}
                    style={({ pressed }) => ({
                      flex: 1,
                      borderRadius: 999,
                      paddingVertical: 12,
                      backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
                      borderWidth: 1,
                      borderColor: OLIVE_BORDER,
                      opacity: savingAvatar ? 0.6 : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: OLIVE,
                        fontSize: 13,
                        fontWeight: "900",
                        textAlign: "center",
                      }}
                    >
                      Cancel
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={confirmAvatarChange}
                    disabled={savingAvatar}
                    style={({ pressed }) => ({
                      flex: 1,
                      borderRadius: 999,
                      paddingVertical: 12,
                      backgroundColor: pressed
                        ? "rgba(180, 83, 9, 0.88)"
                        : EVENT_AMBER,
                      opacity: savingAvatar ? 0.7 : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: SURFACE,
                        fontSize: 13,
                        fontWeight: "900",
                        textAlign: "center",
                      }}
                    >
                      {savingAvatar ? "Saving…" : "Save"}
                    </Text>
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