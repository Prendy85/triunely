// src/screens/Community.js
import { Video } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";

import * as Clipboard from "expo-clipboard";

import CommunityDeletePostModal from "../components/CommunityDeletePostModal";
import CommunityShareSheet from "../components/CommunityShareSheet";
import NewPostModal from "../components/NewPostModal";
import PostCommentsModal from "../components/PostCommentsModal";
import { createStory, fetchActiveStories } from "../lib/stories";
import { supabase } from "../lib/supabase";
import { isFeedVideoMedia, uploadFeedMedia } from "../lib/uploadFeedMedia";

import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { useCallback } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PostCard from "../components/PostCard";
import Screen from "../components/Screen";

import TriunelyImageEditor from "../components/media/TriunelyImageEditor";
import TriunelyStoryMediaPicker from "../components/media/TriunelyStoryMediaPicker";
import TriunelyStoryPreview from "../components/media/TriunelyStoryPreview";

import UnifiedInboxHeaderButton from "../components/UnifiedInboxHeaderButton";
import { useBackgroundUploads } from "../context/BackgroundUploadProvider";
import { useFellowshipRequestsModal } from "../context/FellowshipRequestsModalProvider";
import { useRealtime } from "../context/RealtimeProvider";
import PartnerCommunityPostCard from "../features/partners/components/PartnerCommunityPostCard";
import { HOME_COMMUNITY_ID } from "../lib/constants";
import { theme } from "../theme/theme";

import {
  fetchConnectedPartnerFeedPosts,
} from "../features/partners/services/partnersService";


const iconButtonStyle = {
  width: 36,
  height: 36,
  borderRadius: 18,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "transparent",
};

const iconBadgeStyle = {
  position: "absolute",
  top: -2,
  right: -2,
  minWidth: 16,
  height: 16,
  paddingHorizontal: 3,
  borderRadius: 999,
  backgroundColor: theme.colors.gold,
  justifyContent: "center",
  alignItems: "center",
  borderWidth: 1,
  borderColor: theme.colors.goldOutline,
};


const PAGE_LIMIT = 50;
// Stories UI sizing
const STORY_SIZE = 72;
const STORY_RING = 3;
const STORY_INNER =
  STORY_SIZE - STORY_RING * 2;

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const DEEP_OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";

const SAGE_TINT =
  "rgba(120, 150, 110, 0.14)";

const HEAVENLY_GOLD = "#D99400";

const SOFT_GOLD_BG =
  "rgba(180, 83, 9, 0.10)";

const SOFT_OLIVE_BG =
  "rgba(79, 99, 59, 0.10)";

const CARD_BORDER =
  "rgba(15, 23, 42, 0.08)";

const AMBER_BORDER =
  "rgba(180, 83, 9, 0.18)";

const OLIVE_BORDER =
  "rgba(79, 99, 59, 0.18)";

const SHADOW =
  "rgba(15, 23, 42, 0.10)";


function SuggestedNetworkCard({
  imageUrl,
  badgeIcon,
  title,
  subtitle,
  members,
  action,
  onPress,
}) {
  const isJoin = action === "Join";

  return (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => ({
      width: 178,
      marginRight: 10,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOpacity: pressed ? 0.03 : 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: pressed ? 1 : 3,
      transform: [{ scale: pressed ? 0.985 : 1 }],
    })}
  >
      <View style={{ height: 70, backgroundColor: theme.colors.surfaceAlt }}>
        <Image
          source={{ uri: imageUrl }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />

        <View
          style={{
            position: "absolute",
            left: 10,
            bottom: -17,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: DEEP_OLIVE,
            borderWidth: 2,
            borderColor: theme.colors.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={badgeIcon} size={17} color="#fff" />
        </View>
      </View>

      <View style={{ paddingTop: 22, paddingHorizontal: 10, paddingBottom: 10 }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 13,
            fontWeight: "900",
            lineHeight: 16,
          }}
          numberOfLines={2}
        >
          {title}
        </Text>

        <Text
          style={{
            color: theme.colors.muted,
            fontSize: 10.5,
            fontWeight: "700",
            lineHeight: 14,
            marginTop: 4,
            minHeight: 28,
          }}
          numberOfLines={2}
        >
          {subtitle}
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 8,
            gap: 6,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <Ionicons name="people-outline" size={13} color={DEEP_OLIVE} />
            <Text
              style={{
                color: theme.colors.muted,
                fontSize: 10,
                fontWeight: "800",
                marginLeft: 4,
              }}
              numberOfLines={1}
            >
              {members}
            </Text>
          </View>

          <Pressable
            onPress={onPress}
            style={({ pressed }) => ({
              minWidth: 54,
              borderRadius: 999,
              paddingVertical: 5,
              paddingHorizontal: 8,
              alignItems: "center",
              backgroundColor: isJoin ? "transparent" : theme.colors.surface,
              borderWidth: 1,
              borderColor: isJoin ? HEAVENLY_GOLD : DEEP_OLIVE,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Text
              style={{
                color: isJoin ? HEAVENLY_GOLD : DEEP_OLIVE,
                fontWeight: "900",
                fontSize: 10.5,
              }}
            >
              {action}
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
const isYouTubeUrl = (u) => {
  if (!u) return false;
  const s = String(u).toLowerCase();
  return s.includes("youtube.com") || s.includes("youtu.be");
};

// Robust YouTube video id + thumbnail extractor


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

function HeaderIconButton({ icon, onPress, badgeCount = 0, size = 22 }) {
  const showBadge = Number(badgeCount) > 0;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => ({
        width: 42,                 // slightly larger tap target like Profile
        height: 42,
        borderRadius: 21,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed
          ? (theme.colors.sageSoft || "rgba(134,171,142,0.12)")
          : (theme.colors.surfaceAlt || "rgba(255,255,255,0.06)"),
        borderWidth: 1,
        borderColor: theme.colors.divider,
        marginLeft: 10,
      })}
    >
      <Ionicons name={icon} size={size} color={theme.colors.text2} />

      {showBadge ? (
        <View
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            minWidth: 18,
            height: 18,
            paddingHorizontal: 5,
            borderRadius: 9,
            backgroundColor: theme.colors.gold,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: theme.colors.surface,
          }}
        >
          <Text style={{ color: theme.colors.text, fontSize: 11, fontWeight: "900" }}>
            {badgeCount > 99 ? "99+" : String(badgeCount)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
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
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { openFellowshipRequests } = useFellowshipRequestsModal();



  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch {
    tabBarHeight = 0;
  }

  const [posts, setPosts] = useState([]);

  const [
    connectedPartnerPosts,
    setConnectedPartnerPosts,
  ] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [showNewModal, setShowNewModal] = useState(false);
  const [posting, setPosting] = useState(false);

  const [currentUserId, setCurrentUserId] = useState(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(null);
  const rt = useRealtime();

  const {
    startUpload,
    setUploadProgress,
    completeUpload,
    failUpload,
  } = useBackgroundUploads();

// Always live values (provided by RealtimeProvider)
const unreadNotificationCount = rt?.unreadNotificationCount ?? 0;
const unreadFellowshipCount = rt?.pendingFellowshipCount ?? 0;
const unreadMessageCount =
  rt?.unreadMessageCount ??
  rt?.unreadInboxCount ??
  rt?.messageUnreadCount ??
  0;
  console.log("COMMUNITY HEADER MESSAGE COUNT:", {
  unreadMessageCount,
  unreadMessageCount_key: rt?.unreadMessageCount,
  unreadInboxCount_key: rt?.unreadInboxCount,
  messageUnreadCount_key: rt?.messageUnreadCount,
  rtKeys: rt ? Object.keys(rt) : null,
});
useFocusEffect(
  useCallback(() => {
    // When you come back from Notifications screen, force recount now
    rt?.refreshCounts?.();
  }, [rt])
);

console.log("RT COUNTS:", { unreadNotificationCount, unreadFellowshipCount });

console.log("USER ID IN RT:", rt?.userId);



  // NEW: cache profiles for feed authors (so posts show real name/avatar)
  const [profilesById, setProfilesById] = useState({}); // { [userId]: { id, display_name, avatar_url } }

  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState(null);

  const [showShareSheet, setShowShareSheet] = useState(false);
  const [selectedPostForShare, setSelectedPostForShare] = useState(null);
  const [sharingToFeed, setSharingToFeed] = useState(false);

  const [showDeletePostModal, setShowDeletePostModal] = useState(false);
  const [selectedPostIdForDelete, setSelectedPostIdForDelete] = useState(null);
  const [deletingPost, setDeletingPost] = useState(false);

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

  const [
    storyMediaPickerMode,
    setStoryMediaPickerMode,
  ] = useState(null);

  const [
    selectedStoryImage,
    setSelectedStoryImage,
  ] = useState(null);

  const [
    storyImageEditorVisible,
    setStoryImageEditorVisible,
  ] = useState(false);

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

   // Notifications overlay (Modal below uses showNotifications)

  const [adminChurchId, setAdminChurchId] = useState(null);
const [checkingChurchAdmin, setCheckingChurchAdmin] = useState(false);


   // Search overlay
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  function handleOpenSearch() {
  navigation.navigate("GlobalSearch");
}


useEffect(() => {
  let alive = true;

  (async () => {
    try {
      setCheckingChurchAdmin(true);

      const { data: sessData } = await supabase.auth.getSession();
      const uid = sessData?.session?.user?.id;

      if (!uid) {
        if (alive) setAdminChurchId(null);
        return;
      }

      const { data, error } = await supabase
        .from("church_admins")
        .select("church_id")
        .eq("user_id", uid)
        .limit(1);

      if (error) {
        console.log("church_admins lookup error:", error);
        if (alive) setAdminChurchId(null);
        return;
      }

      if (alive) setAdminChurchId(data?.[0]?.church_id ?? null);
    } catch (e) {
      console.log("church_admins lookup exception:", e);
      if (alive) setAdminChurchId(null);
    } finally {
      if (alive) setCheckingChurchAdmin(false);
    }
  })();

  return () => {
    alive = false;
  };
}, []);


  // Which overlay (if any) is selected for resizing
  const [selectedOverlayId, setSelectedOverlayId] = useState(null);

  // ---------- PULSE ANIMATION (for unseen story halos) ----------
  const pulse = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.45],
  });

  const mixedFeedPosts = (() => {
    const communityItems = (
      Array.isArray(posts)
        ? posts
        : []
    ).map((post) => ({
      ...post,
      feed_source: "community",
      feed_key:
        post.feed_key ||
        `community:${post.id}`,
    }));

    const partnerItems = (
      Array.isArray(
        connectedPartnerPosts
      )
        ? connectedPartnerPosts
        : []
    ).map((post) => ({
      ...post,
      feed_source: "partner",
      feed_key:
        post.feed_key ||
        `partner:${post.id}`,
    }));

    if (
      partnerItems.length === 0
    ) {
      return communityItems;
    }

    if (
      communityItems.length === 0
    ) {
      return partnerItems;
    }

    const combined = [];
    let partnerIndex = 0;

    communityItems.forEach(
      (communityPost, index) => {
        combined.push(
          communityPost
        );

        const shouldInsertPartner =
          (index + 1) % 4 === 0 &&
          partnerIndex <
            partnerItems.length;

        if (shouldInsertPartner) {
          combined.push(
            partnerItems[
              partnerIndex
            ]
          );

          partnerIndex += 1;
        }
      }
    );

    // If fewer than four Community
    // posts exist, still allow one
    // connected Partner post to appear.
    if (
      partnerIndex === 0 &&
      partnerItems.length > 0
    ) {
      combined.push(
        partnerItems[0]
      );

      partnerIndex = 1;
    }

    // Do not append every remaining
    // Partner post. This prevents
    // Partner content dominating the
    // Community feed.
    return combined;
  })();

  const filteredPosts = (() => {
    const query = String(
      searchQuery || ""
    )
      .trim()
      .toLowerCase();

    if (!query) {
      return mixedFeedPosts;
    }

    return mixedFeedPosts.filter(
      (post) => {
        if (
          post.feed_source ===
          "partner"
        ) {
          const partnerText = [
            post?.partner?.name,
            post?.partner
              ?.short_description,
            post?.title,
            post?.content,
            post?.link_url,
            post?.link_title,
            post?.post_type,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return partnerText.includes(
            query
          );
        }

        const communityText = [
          post?.content,
          post?.url,
          post?.link_title,
          post?.link_description,
          post?.church?.name,
          post?.church
            ?.display_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return communityText.includes(
          query
        );
      }
    );
  })();

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

  // NEW: Load a batch of profiles for the feed (authors)
  async function fetchProfilesForUsers(userIds) {
    try {
      const ids = Array.from(new Set((userIds || []).filter(Boolean)));
      if (ids.length === 0) return;

      // Avoid refetching ids we already have cached
      const missing = ids.filter((id) => !profilesById[id]);
      if (missing.length === 0) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", missing);

      if (error) {
        console.log("Error loading feed profiles", error);
        return;
      }

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
      console.log("Unexpected error loading feed profiles", e);
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
    if (!HOME_COMMUNITY_ID) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth
          .getSession();

      if (sessionError) {
        console.log(
          "Community feed session error:",
          sessionError
        );
      }

      const feedUserId =
        sessionData?.session
          ?.user?.id || null;

      const { data, error: err } = await supabase
        .from("posts")
        .select(
          `
          id,
          user_id,
          church_id,
          shared_post_id,

          churches:church_id (
            id,
            name,
            display_name,
            avatar_url,
            is_verified
          ),

          shared_post:shared_post_id (
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

            churches:church_id (
              id,
              name,
              display_name,
              avatar_url,
              is_verified
            )
          ),

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
        .eq(
          "community_id",
          HOME_COMMUNITY_ID
        )

        // Do not filter visibility here.
        // RLS decides which posts the user may read.
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(PAGE_LIMIT);

      if (err) {
        throw err;
      }

      const mapped =
        (data || []).map((row) => {
          const commentCount =
            Array.isArray(
              row.post_comments
            ) &&
            row.post_comments.length > 0
              ? row.post_comments[0]
                  .count ?? 0
              : 0;

          return {
            id: row.id,
            user_id: row.user_id,
            church_id: row.church_id,
            church:
              row.churches || null,

            shared_post_id:
              row.shared_post_id ||
              null,

            shared_post:
              row.shared_post
                ? {
                    ...row.shared_post,
                    church:
                      row.shared_post
                        .churches ||
                      null,
                  }
                : null,

            content: row.content,
            url: row.url,
            link_title:
              row.link_title,
            link_description:
              row.link_description,
            link_image:
              row.link_image,
            is_anonymous:
              row.is_anonymous,
            media_url:
              row.media_url,
            media_type:
              row.media_type,
            created_at:
              row.created_at,
            reactions:
              row.post_reactions ||
              [],
            comment_count:
              commentCount,
          };
        }) ?? [];

      setPosts(mapped);

      const connectedPartnerResult =
        await fetchConnectedPartnerFeedPosts({
          userId: feedUserId,
          limit: 20,
        });

      if (
        connectedPartnerResult.ok
      ) {
        setConnectedPartnerPosts(
          connectedPartnerResult.posts ||
            []
        );
      } else {
        console.log(
          "Community connected Partner posts error:",
          connectedPartnerResult.error
        );

        setConnectedPartnerPosts([]);
      }

      // Preload the authors of normal posts
      // and the original authors of shared posts.
      const authorIds = mapped
        .flatMap((post) => {
          const ids = [];

          if (
            !post?.is_anonymous &&
            post?.user_id
          ) {
            ids.push(post.user_id);
          }

          if (
            !post?.shared_post
              ?.is_anonymous &&
            post?.shared_post
              ?.user_id
          ) {
            ids.push(
              post.shared_post.user_id
            );
          }

          return ids;
        })
        .filter(Boolean);

      if (currentUserId) {
        authorIds.push(
          currentUserId
        );
      }

      fetchProfilesForUsers(
        authorIds
      );
    } catch (e) {
      console.log("Error loading posts", e);
      setError(
        "Could not load posts right now."
      );

      setConnectedPartnerPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
  if (!HOME_COMMUNITY_ID) return;

  const channel = supabase
    .channel(`posts-feed-${HOME_COMMUNITY_ID}`)

    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "posts",
        filter: `community_id=eq.${HOME_COMMUNITY_ID}`,
      },
      async (payload) => {
        const newRow = payload.new;
        if (!newRow?.id) return;

        // Pull the full post shape (so reactions/comment_count mapping stays consistent)
        const { data: full, error } = await supabase
          .from("posts")
          .select(
            `
            id,
            user_id,
            church_id,
            shared_post_id,

            churches:church_id (
              id,
              name,
              display_name,
              avatar_url,
              is_verified
            ),

            shared_post:shared_post_id (
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

              churches:church_id (
                id,
                name,
                display_name,
                avatar_url,
                is_verified
              )
            ),

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
          .eq("id", newRow.id)
          .single();

        if (error || !full) {
          return;
        }

        const commentCount =
          Array.isArray(full.post_comments) &&
          full.post_comments.length > 0
            ? full.post_comments[0].count ?? 0
            : 0;

        const mappedNew = {
          id: full.id,
          user_id: full.user_id,
          church_id: full.church_id,
          church: full.churches || null,

          shared_post_id: full.shared_post_id || null,

          shared_post: full.shared_post
            ? {
                ...full.shared_post,
                church: full.shared_post.churches || null,
              }
            : null,

          content: full.content,
          url: full.url,
          link_title: full.link_title,
          link_description: full.link_description,
          link_image: full.link_image,
          is_anonymous: full.is_anonymous,
          media_url: full.media_url,
          media_type: full.media_type,
          created_at: full.created_at,
          reactions: full.post_reactions || [],
          comment_count: commentCount,
        };

        // Dedupe then prepend
        setPosts((prev) => {
          if (prev?.some((p) => p.id === mappedNew.id)) return prev;
          return [mappedNew, ...(prev ?? [])];
        });

        // Preload both the sharer and the
        // original author of a shared post.
        const realtimeAuthorIds = [];

        if (
          !mappedNew?.is_anonymous &&
          mappedNew?.user_id
        ) {
          realtimeAuthorIds.push(
            mappedNew.user_id
          );
        }

        if (
          !mappedNew?.shared_post
            ?.is_anonymous &&
          mappedNew?.shared_post
            ?.user_id
        ) {
          realtimeAuthorIds.push(
            mappedNew.shared_post.user_id
          );
        }

        if (
          realtimeAuthorIds.length > 0
        ) {
          fetchProfilesForUsers(
            realtimeAuthorIds
          );
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [HOME_COMMUNITY_ID]);


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
      Alert.alert("Permission needed", "We need access to your camera so you can capture a story.");
      return false;
    }
    return true;
  }

  // Pick from gallery (photo or video) → open preview (no immediate upload)
  async function pickStoryMedia(kind) {
    console.log(
      "pickStoryMedia called with:",
      kind
    );

    if (!currentUserId) {
      Alert.alert(
        "Not signed in",
        "Please sign in again before posting a story."
      );

      return;
    }

    const ok =
      await ensureMediaPermissions();

    if (!ok) return;

    const mediaTypes =
      kind === "video"
        ? ImagePicker.MediaTypeOptions
            .Videos
        : ImagePicker.MediaTypeOptions
            .Images;

    try {
      const result =
        await ImagePicker.launchImageLibraryAsync(
          {
            mediaTypes,
            quality:
              kind === "video"
                ? 0.7
                : 1,
            allowsEditing: false,
            videoMaxDuration:
              kind === "video"
                ? 15
                : undefined,
          }
        );

      if (result.canceled) {
        return;
      }

      const asset =
        result.assets?.[0];

      if (!asset?.uri) {
        return;
      }

      if (kind === "image") {
        setSelectedStoryImage(
          asset
        );

        setStoryImageEditorVisible(
          true
        );

        return;
      }

      setStoryPreview({
        uri: asset.uri,
        mediaType: "video",
        width:
          asset.width || null,
        height:
          asset.height || null,
        duration:
          asset.duration || null,
        fileName:
          asset.fileName || null,
        mimeType:
          asset.mimeType ||
          "video/mp4",
      });
    } catch (error) {
      console.log(
        "Story gallery picker error:",
        error
      );

      Alert.alert(
        "Story failed",
        "We couldn't open that media. Please try another file."
      );
    }
  }

  async function captureStoryMedia(
    kind
  ) {
    console.log(
      "captureStoryMedia called with:",
      kind
    );

    if (!currentUserId) {
      Alert.alert(
        "Not signed in",
        "Please sign in again before posting a story."
      );

      return;
    }

    const ok =
      await ensureCameraPermissions();

    if (!ok) return;

    const mediaTypes =
      kind === "video"
        ? ImagePicker.MediaTypeOptions
            .Videos
        : ImagePicker.MediaTypeOptions
            .Images;

    try {
      const result =
        await ImagePicker.launchCameraAsync(
          {
            mediaTypes,
            quality:
              kind === "video"
                ? 0.7
                : 1,
            allowsEditing: false,
            videoMaxDuration:
              kind === "video"
                ? 15
                : undefined,
          }
        );

      if (result.canceled) {
        return;
      }

      const asset =
        result.assets?.[0];

      if (!asset?.uri) {
        return;
      }

      if (kind === "image") {
        setSelectedStoryImage(
          asset
        );

        setStoryImageEditorVisible(
          true
        );

        return;
      }

      setStoryPreview({
        uri: asset.uri,
        mediaType: "video",
        width:
          asset.width || null,
        height:
          asset.height || null,
        duration:
          asset.duration || null,
        fileName:
          asset.fileName || null,
        mimeType:
          asset.mimeType ||
          "video/mp4",
      });
    } catch (error) {
      console.log(
        "Story camera picker error:",
        error
      );

      Alert.alert(
        "Story failed",
        kind === "video"
          ? "We couldn't record that video Story."
          : "We couldn't take that photo."
      );
    }
  }

  function handleStoryImageEditorCancel() {
    setStoryImageEditorVisible(
      false
    );

    setSelectedStoryImage(null);
  }

  function handleChooseDifferentStoryImage() {
    setStoryImageEditorVisible(
      false
    );

    setSelectedStoryImage(null);

    setTimeout(() => {
      setStoryMediaPickerMode(
        "photo-source"
      );
    }, 180);
  }

  function handleStoryImagePrepared(
    preparedImage
  ) {
    if (!preparedImage?.uri) {
      Alert.alert(
        "Story image",
        "The prepared Story image could not be created."
      );

      return;
    }

    setStoryImageEditorVisible(
      false
    );

    setSelectedStoryImage(null);

    setStoryPreview({
      ...preparedImage,
      uri: preparedImage.uri,
      mediaType: "image",
    });
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

  function closeStoryMediaPicker() {
    setStoryMediaPickerMode(null);
  }

  function openStoryTypePicker() {
    setStoryMediaPickerMode("type");
  }

  function openPhotoStorySources() {
    setStoryMediaPickerMode(
      "photo-source"
    );
  }

  function openVideoStorySources() {
    setStoryMediaPickerMode(
      "video-source"
    );
  }

  async function handleStoryGallerySelection() {
    const kind =
      storyMediaPickerMode ===
      "video-source"
        ? "video"
        : "image";

    closeStoryMediaPicker();

    await pickStoryMedia(kind);
  }

  async function handleStoryCameraSelection() {
    const kind =
      storyMediaPickerMode ===
      "video-source"
        ? "video"
        : "image";

    closeStoryMediaPicker();

    await captureStoryMedia(kind);
  }

  function handleAddStoryPress() {
    if (!currentUserId) {
      Alert.alert(
        "Not signed in",
        "Please sign in again before posting a story."
      );

      return;
    }

    openStoryTypePicker();
  }

  function handleStoryBubblePress(group) {
    if (!group || !group.stories || group.stories.length === 0) return;

    // Keep chronological order for the narrative: oldest → newest
    const sorted = [...group.stories].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

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

    function formatDateTime(ts) {
    if (!ts) return "";
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return "";
    }
  }

  async function handleOpenNotifications() {
      navigation.navigate("Notifications");
return;


  }

function handleOpenFellowship() {
  openFellowshipRequests();
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
    if (layout && typeof overlay.normalizedX === "number" && typeof overlay.normalizedY === "number") {
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

    setStoryOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, normalizedX, normalizedY } : o)));
  }

  // Resize the currently selected overlay (text/emoji/sticker)
  function adjustSelectedOverlayScale(delta) {
    if (!selectedOverlayId) return;

    setStoryOverlays((prev) =>
      prev.map((o) => {
        if (o.id !== selectedOverlayId) return o;

        const current =
          o.scale ?? 1;

        const next = Math.min(
          2.5,
          Math.max(
            0.5,
            current + delta
          )
        );

        return {
          ...o,
          scale: next,
        };
      })
    );
  }

  function deleteSelectedStoryOverlay() {
    if (!selectedOverlayId) {
      return;
    }

    setStoryOverlays((prev) =>
      prev.filter(
        (overlay) =>
          overlay.id !==
          selectedOverlayId
      )
    );

    setSelectedOverlayId(null);
  }

  async function handleCreatePost(
    content,
    url,
    isAnonymous,
    media
  ) {
    const cleanContent =
      String(content || "").trim();

    const cleanUrl =
      String(url || "").trim();

    if (!cleanContent && !media) {
      Alert.alert(
        "Message required",
        "Please write something or attach media."
      );

      return;
    }

    const mediaIsVideo =
      isFeedVideoMedia(media);

    const mediaIsImage =
      Boolean(media?.uri) &&
      !mediaIsVideo;

    let backgroundUploadId =
      null;

    try {
      setPosting(true);

      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth
          .getSession();

      if (sessionError) {
        throw sessionError;
      }

      const userId =
        sessionData?.session
          ?.user?.id;

      if (!userId) {
        throw new Error(
          "Please sign in again before posting."
        );
      }

      backgroundUploadId =
        startUpload({
          title: mediaIsVideo
            ? "Uploading Community video…"
            : mediaIsImage
              ? "Uploading Community photo…"
              : "Publishing Community post…",

          subtitle:
            "You can continue using Triunely while this finishes.",

          mediaType: mediaIsVideo
            ? "video"
            : mediaIsImage
              ? "image"
              : null,

          metadata: {
            destination:
              "community",
          },
        });

      setUploadProgress(
        backgroundUploadId,
        0.06
      );

      let mediaUrl = null;
      let mediaType = null;

      if (media?.uri) {
        setUploadProgress(
          backgroundUploadId,
          0.12
        );

        const uploaded =
          await uploadFeedMedia({
            media,
            scope: "posts",
            ownerId: userId,
            folderId:
              HOME_COMMUNITY_ID,
          });

        mediaUrl =
          uploaded?.mediaUrl ||
          null;

        mediaType =
          uploaded?.mediaType ||
          null;

        if (!mediaUrl) {
          throw new Error(
            mediaIsVideo
              ? "Triunely could not upload the selected video."
              : "Triunely could not upload the selected photo."
          );
        }

        setUploadProgress(
          backgroundUploadId,
          0.82
        );
      } else {
        setUploadProgress(
          backgroundUploadId,
          0.72
        );
      }

      if (!HOME_COMMUNITY_ID) {
        throw new Error(
          "Triunely could not identify the Community feed."
        );
      }

      const payload = {
        user_id: userId,
        community_id:
          HOME_COMMUNITY_ID,
        church_id: null,
        visibility:
          "communities",
        is_anonymous:
          Boolean(isAnonymous),
        content: cleanContent,
      };

      if (cleanUrl) {
        payload.url =
          cleanUrl;
      }

      if (mediaUrl) {
        payload.media_url =
          mediaUrl;

        payload.media_type =
          mediaType;
      }

      if (cleanUrl) {
        try {
          const {
            data: previewData,
            error: previewError,
          } =
            await supabase.functions
              .invoke(
                "link-preview",
                {
                  body: {
                    url: cleanUrl,
                  },
                }
              );

          console.log(
            "link-preview data:",
            previewData
          );

          console.log(
            "link-preview error:",
            previewError
          );

          if (
            !previewError &&
            previewData?.ok
          ) {
            payload.link_title =
              previewData.title ||
              null;

            payload.link_description =
              previewData.description ||
              null;

            payload.link_image =
              previewData.image ||
              null;
          }
        } catch (error) {
          console.log(
            "link-preview failed",
            error
          );
        }
      }

      setUploadProgress(
        backgroundUploadId,
        0.92
      );

      const {
        data,
        error,
      } =
        await supabase
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

      if (error) {
        throw error;
      }

      const newPost = {
        ...data,
        church: null,
        reactions: [],
        comment_count: 0,
      };

      setPosts((previous) => {
        const alreadyExists =
          previous.some(
            (post) =>
              post.id ===
              newPost.id
          );

        if (alreadyExists) {
          return previous;
        }

        return [
          newPost,
          ...previous,
        ];
      });

      if (
        !newPost.is_anonymous &&
        newPost.user_id
      ) {
        fetchProfilesForUsers([
          newPost.user_id,
        ]);
      }

      setUploadProgress(
        backgroundUploadId,
        1
      );

      completeUpload(
        backgroundUploadId,
        {
          title: mediaIsVideo
            ? "Community video posted"
            : mediaIsImage
              ? "Community photo posted"
              : "Community post published",

          subtitle:
            "Your post is now live in Community.",

          metadata: {
            destination:
              "community",
            postId:
              newPost.id,
          },
        }
      );
    } catch (error) {
      console.log(
        "Error creating Community post:",
        error
      );

      if (backgroundUploadId) {
        failUpload(
          backgroundUploadId,
          error?.message ||
            "Triunely could not publish this post."
        );
      } else {
        Alert.alert(
          "Could not post",
          error?.message ||
            "Triunely could not publish this post."
        );
      }
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

        if (insError && insError.code !== "23505") {
          throw insError;
        }
      }
    } catch (e) {
      console.log("Error setting reaction", e);
      Alert.alert("Reaction failed", "We couldn’t update your reaction. It might correct itself on refresh.");
    }
  }

  function openComments(post) {
    setSelectedPostForComments(post);
    setShowCommentsModal(true);
  }

  function handleCommentAdded(postId) {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p)));
  }

  function confirmDeletePost(postId) {
    if (!postId || deletingPost) {
      return;
    }

    setSelectedPostIdForDelete(postId);
    setShowDeletePostModal(true);
  }

  function closeDeletePostModal() {
    if (deletingPost) {
      return;
    }

    setShowDeletePostModal(false);
    setSelectedPostIdForDelete(null);
  }

  async function deleteSelectedPost() {
    if (
      !currentUserId ||
      !selectedPostIdForDelete ||
      deletingPost
    ) {
      return;
    }

    try {
      setDeletingPost(true);

      const { error } = await supabase
        .from("posts")
        .delete()
        .eq(
          "id",
          selectedPostIdForDelete
        )
        .eq(
          "user_id",
          currentUserId
        );

      if (error) {
        throw error;
      }

      setPosts((previousPosts) =>
        previousPosts.filter(
          (post) =>
            post.id !==
            selectedPostIdForDelete
        )
      );

      setShowDeletePostModal(false);
      setSelectedPostIdForDelete(null);
    } catch (error) {
      console.log(
        "Error deleting post",
        error
      );

      Alert.alert(
        "Delete failed",
        "We couldn’t delete this post. Please try again."
      );
    } finally {
      setDeletingPost(false);
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

  function closeShareSheet() {
    if (sharingToFeed) {
      return;
    }

    setShowShareSheet(false);
    setSelectedPostForShare(null);
  }

  function sharePost(post) {
    if (!currentUserId) {
      Alert.alert(
        "Please sign in",
        "You need to be signed in to share."
      );
      return;
    }

    if (!post?.id) {
      return;
    }

    setSelectedPostForShare(post);
    setShowShareSheet(true);
  }

  async function handleConfirmFeedShare(commentary) {
    if (
      !currentUserId ||
      !selectedPostForShare?.id ||
      sharingToFeed
    ) {
      return;
    }

    try {
      setSharingToFeed(true);

      const payload = {
        user_id: currentUserId,
        community_id: HOME_COMMUNITY_ID,
        shared_post_id: selectedPostForShare.id,
        content: String(commentary || "").trim(),
        visibility: "communities",
        is_anonymous: false,
      };

      const { data, error } = await supabase
        .from("posts")
        .insert(payload)
        .select(
          `
          id,
          user_id,
          shared_post_id,
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

      if (error) {
        throw error;
      }

      const newPost = {
        ...data,

        shared_post: {
          ...selectedPostForShare,
          church:
            selectedPostForShare?.church ||
            null,
        },

        reactions: [],
        comment_count: 0,
      };

      setPosts((previousPosts) => {
        const existingIndex =
          previousPosts.findIndex(
            (existingPost) =>
              existingPost.id ===
              newPost.id
          );

        if (existingIndex === -1) {
          return [
            newPost,
            ...previousPosts,
          ];
        }

        return previousPosts.map(
          (existingPost) =>
            existingPost.id ===
            newPost.id
              ? {
                  ...existingPost,
                  ...newPost,
                  shared_post:
                    newPost.shared_post,
                }
              : existingPost
        );
      });

      if (newPost.user_id) {
        fetchProfilesForUsers([
          newPost.user_id,
        ]);
      }

      setShowShareSheet(false);
      setSelectedPostForShare(null);
    } catch (error) {
      console.log(
        "Error sharing post to feed:",
        error
      );

      Alert.alert(
        "Share failed",
        "We couldn’t share this post. Please try again."
      );
    } finally {
      setSharingToFeed(false);
    }
  }

  function buildCommunityPostLink(post) {
    if (!post?.id) {
      return null;
    }

    return `triunelyapp://community/post/${post.id}`;
  }

  async function handleCopyPostLink(post) {
    const postLink =
      buildCommunityPostLink(post);

    if (!postLink) {
      return;
    }

    try {
      await Clipboard.setStringAsync(
        postLink
      );

      setShowShareSheet(false);
      setSelectedPostForShare(null);
    } catch (error) {
      console.log(
        "Copy Community post link error:",
        error
      );

      Alert.alert(
        "Copy failed",
        "We couldn’t copy this post link."
      );
    }
  }

  async function handleExternalPostShare(
    post
  ) {
    const postLink =
      buildCommunityPostLink(post);

    if (!postLink) {
      return;
    }

    const postText =
      String(post?.content || "").trim();

    try {
      await Share.share({
        title: "Share from Triunely",
        message: postText
          ? `${postText}\n\n${postLink}`
          : postLink,
        url: postLink,
      });

      setShowShareSheet(false);
      setSelectedPostForShare(null);
    } catch (error) {
      console.log(
        "External Community share error:",
        error
      );
    }
  }

  function handleSendPostInMessage(post) {
    if (!post?.id) {
      return;
    }

    setShowShareSheet(false);
    setSelectedPostForShare(null);

    navigation.navigate(
      "SharePostRecipient",
      {
        sharedPostId: post.id,
        sharedPost: post,
      }
    );
  }

 const renderItem = ({ item }) => {
   if (
     item?.feed_source ===
     "partner"
   ) {
     return (
       <PartnerCommunityPostCard
         post={item}
         currentUserId={
           currentUserId
         }
         onOpenPartnerProfile={(
           partner
         ) => {
           if (!partner?.id) {
             return;
           }

           navigation.navigate(
             "PartnerProfilePublic",
             {
               partnerProfileId:
                 partner.id,
             }
           );
         }}
       />
     );
   }

  // Resolve the author of the feed post.
  const authorProfile =
    !item.is_anonymous &&
    item.user_id
      ? profilesById[
          item.user_id
        ] || null
      : null;

  // Resolve the original author when
  // this is a shared post.
  const sharedAuthorProfile =
    !item?.shared_post
      ?.is_anonymous &&
    item?.shared_post
      ?.user_id
      ? profilesById[
          item.shared_post
            .user_id
        ] || null
      : null;

  const postForCard =
    item?.shared_post
      ? {
          ...item,
          shared_post: {
            ...item.shared_post,
            author_profile:
              sharedAuthorProfile,
          },
        }
      : item;

  // Determine display name
  let who;
  if (item.is_anonymous) {
    who = "Anonymous";
  } else if (currentUserId && item.user_id === currentUserId) {
    who = "You";
  } else {
    who = authorProfile?.display_name || "Member on Triunely";
  }

  // Determine avatar
  const avatarUrl = (() => {
    if (item.is_anonymous) return null;
    if (currentUserId && item.user_id === currentUserId) return profileAvatarUrl || null;
    return authorProfile?.avatar_url || null;
  })();

  const isOwner = !!(currentUserId && item.user_id === currentUserId);

  return (
    <PostCard
      post={postForCard}
      currentUserId={currentUserId}
         author={
  item.church_id && item.church
    ? {
        id: item.church_id,
        name: item.church.display_name || item.church.name || "Church",
        avatarUrl: item.church.avatar_url || null,
        isAnonymous: false,
        isOwner: false,
        isVerified: !!item.church.is_verified,
      }
    : {
        id: item.user_id,
        name: who,
        avatarUrl,
        isAnonymous: !!item.is_anonymous,
        isOwner,
      }
}

      onPressAvatar={(id) => {
  // If this post is authored by a church, open church profile instead
  if (item.church_id) {
  navigation.navigate("MainTabs", {
    screen: "Church",
    params: {
      screen: "ChurchProfilePublic",
      params: { churchId: item.church_id },
    },
  });
  return;
}


  // If it's your own avatar, jump to your real Profile tab
  if (currentUserId && id === currentUserId) {
    navigation.navigate("MainTabs", { screen: "Profile" });
    return;
  }

  navigation.navigate("UserProfile", { userId: id });
}}


      onPressOriginalAuthor={(
        originalPost
      ) => {
        if (
          originalPost?.church_id
        ) {
          navigation.navigate(
            "MainTabs",
            {
              screen: "Church",
              params: {
                screen:
                  "ChurchProfilePublic",
                params: {
                  churchId:
                    originalPost.church_id,
                },
              },
            }
          );

          return;
        }

        if (
          !originalPost?.user_id ||
          originalPost?.is_anonymous
        ) {
          return;
        }

        if (
          currentUserId &&
          originalPost.user_id ===
            currentUserId
        ) {
          navigation.navigate(
            "MainTabs",
            {
              screen: "Profile",
            }
          );

          return;
        }

        navigation.navigate(
          "UserProfile",
          {
            userId:
              originalPost.user_id,
          }
        );
      }}
      onPressOriginalPost={(
        originalPost
      ) => {
        if (!originalPost?.id) {
          return;
        }

        openComments(
          originalPost
        );
      }}
      onDelete={(postId) =>
        confirmDeletePost(postId)
      }
      onHide={(postId) =>
        confirmHidePost(postId)
      }
      onOpenComments={(post) =>
        openComments(post)
      }
      onShare={(post) =>
        sharePost(post)
      }
      onSetReaction={(postId, typeOrNull) => setReaction(postId, typeOrNull)}
      reactionPickerForPost={reactionPickerForPost}
      setReactionPickerForPost={setReactionPickerForPost}
      preferInAppYouTube={true}
    />
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

  const yourGroup = currentUserId ? orderedStoryGroups.find((g) => g.user_id === currentUserId) : null;

  const yourHasUnseen =
    !!yourGroup && Array.isArray(yourGroup.stories) ? yourGroup.stories.some((s) => !seenStoryIds[s.id]) : false;

  function handleYourStoryPress() {
    if (!currentUserId) {
      Alert.alert(
        "Not signed in",
        "Please sign in again before posting a story."
      );

      return;
    }

    if (yourGroup) {
      handleStoryBubblePress(
        yourGroup
      );

      return;
    }

    handleAddStoryPress();
  }

  const currentStory = storyViewerGroup && storyViewerGroup.stories[storyViewerIndex];

  const isOwnStoryViewer = storyViewerGroup && currentUserId && storyViewerGroup.user_id === currentUserId;

  const viewerName = isOwnStoryViewer ? "You" : storyViewerGroup?.profile?.display_name || "Someone on Triunely";

  const currentOverlays = currentStory?.overlays && Array.isArray(currentStory.overlays) ? currentStory.overlays : [];

  // Mark a story as "seen" whenever it becomes the current story in the viewer
  useEffect(() => {
    if (!currentStory?.id) return;

    setSeenStoryIds((prev) => {
      if (prev[currentStory.id]) return prev;
      return { ...prev, [currentStory.id]: true };
    });
  }, [currentStory?.id]);

  const renderFeedHeader = () => (
    <View
  style={{
    paddingHorizontal: theme.premium.spacing.screenX,
    paddingTop: theme.premium.spacing.headerTop,
    paddingBottom: 6,
  }}
>
 {/* Top header row */}
<View
  style={{
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    minHeight: 44,
  }}
>
{/* Left: Community */}
<View style={{ flexShrink: 1, minWidth: 0 }}>
 <Text
  style={{
    ...theme.premium.text.screenTitle,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.35,
  }}
  numberOfLines={1}
  adjustsFontSizeToFit
  minimumFontScale={0.86}
>
  Community
</Text>
</View>

  {/* Right: Messages + Notifications + Fellowship + Search */}
  <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
    {/* Messages / Unified Inbox */}
    <UnifiedInboxHeaderButton
      navigation={navigation}
      iconButtonStyle={{
        ...iconButtonStyle,
        width: 30,
        height: 30,
        borderRadius: 15,
      }}
      iconBadgeStyle={iconBadgeStyle}
      iconSize={23}
    />

    {/* Notifications */}
    <Pressable
      onPress={handleOpenNotifications}
      style={{
        ...iconButtonStyle,
        width: 30,
        height: 30,
        borderRadius: 15,
      }}
      hitSlop={8}
    >
      <Ionicons name="notifications-outline" size={24} color={DEEP_OLIVE} />

      {unreadNotificationCount > 0 && (
        <View
          style={{
            ...iconBadgeStyle,
            top: -6,
            right: -5,
            minWidth: 20,
            height: 20,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "900" }}>
            {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
          </Text>
        </View>
      )}
    </Pressable>

    {/* Fellowship requests */}
    <Pressable
      onPress={handleOpenFellowship}
      style={{
        ...iconButtonStyle,
        width: 30,
        height: 30,
        borderRadius: 15,
      }}
      hitSlop={8}
    >
      <Ionicons name="people-outline" size={25} color={DEEP_OLIVE} />

      {unreadFellowshipCount > 0 && (
        <View
          style={{
            ...iconBadgeStyle,
            top: -6,
            right: -6,
            minWidth: 20,
            height: 20,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "900" }}>
            {unreadFellowshipCount > 99 ? "99+" : unreadFellowshipCount}
          </Text>
        </View>
      )}
    </Pressable>

    {/* Search */}
    <Pressable
      onPress={handleOpenSearch}
      style={{
        ...iconButtonStyle,
        width: 30,
        height: 30,
        borderRadius: 15,
      }}
      hitSlop={8}
    >
      <Ionicons name="search-outline" size={26} color={DEEP_OLIVE} />
    </Pressable>
  </View>
</View>


  {/* Community introduction */}
  <View
    style={{
      marginBottom: 18,
      borderRadius: 26,
      padding: 18,
      backgroundColor:
        SURFACE,
      borderWidth: 1,
      borderColor:
        CARD_BORDER,
      shadowColor: SHADOW,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      elevation: 3,
      overflow: "hidden",
    }}
  >
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: -55,
        right: -40,
        width: 165,
        height: 165,
        borderRadius: 83,
        backgroundColor:
          SOFT_GOLD_BG,
      }}
    />

    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        bottom: -50,
        left: -35,
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor:
          SOFT_OLIVE_BG,
      }}
    />

    <View
      style={{
        width: 46,
        height: 46,
        borderRadius: 17,
        backgroundColor:
          SOFT_OLIVE_BG,
        borderWidth: 1,
        borderColor:
          OLIVE_BORDER,
        alignItems: "center",
        justifyContent:
          "center",
        marginBottom: 13,
      }}
    >
      <Ionicons
        name="people-outline"
        size={23}
        color={DEEP_OLIVE}
      />
    </View>

    <Text
      style={{
        color: TEXT,
        fontSize: 23,
        lineHeight: 28,
        fontWeight: "900",
        letterSpacing: -0.35,
        maxWidth: 310,
      }}
    >
      Christian life, connected
    </Text>

    <Text
      style={{
        color: MUTED,
        fontSize: 14,
        fontWeight: "700",
        lineHeight: 21,
        marginTop: 7,
        maxWidth: 325,
      }}
    >
      Find fellowship, events,
      purpose-led networks and
      Christian Partners—all in one
      place.
    </Text>
  </View>


{/* Explore Community */}
<View
  style={{
    marginBottom: 22,
  }}
>
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 12,
    }}
  >
    <View
      style={{
        flex: 1,
        minWidth: 0,
      }}
    >
      <Text
        style={{
          ...theme.premium.text
            .sectionTitle,
          color: TEXT,
        }}
      >
        Explore Community
      </Text>

      <Text
        style={{
          color: MUTED,
          fontSize: 12.5,
          fontWeight: "700",
          lineHeight: 18,
          marginTop: 3,
        }}
      >
        Discover more ways to connect,
        gather and grow.
      </Text>
    </View>

    <View
      style={{
        width: 42,
        height: 42,
        borderRadius: 16,
        backgroundColor:
          SOFT_OLIVE_BG,
        borderWidth: 1,
        borderColor:
          OLIVE_BORDER,
        alignItems: "center",
        justifyContent:
          "center",
        marginLeft: 12,
      }}
    >
      <Ionicons
        name="compass-outline"
        size={21}
        color={DEEP_OLIVE}
      />
    </View>
  </View>

  <View
    style={{
      backgroundColor: SURFACE,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: CARD_BORDER,
      shadowColor: SHADOW,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      elevation: 3,
      overflow: "hidden",
    }}
  >
    <Pressable
      onPress={() =>
        navigation.navigate(
          "PartnerProfilesDirectory"
        )
      }
      style={({ pressed }) => ({
        paddingHorizontal: 15,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: pressed
          ? SOFT_OLIVE_BG
          : SURFACE,
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 16,
          backgroundColor:
            SOFT_OLIVE_BG,
          borderWidth: 1,
          borderColor:
            OLIVE_BORDER,
          alignItems: "center",
          justifyContent:
            "center",
          marginRight: 12,
        }}
      >
        <Ionicons
          name="briefcase-outline"
          size={21}
          color={DEEP_OLIVE}
        />
      </View>

      <View
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <Text
          style={{
            color: TEXT,
            fontSize: 15,
            fontWeight: "900",
          }}
        >
          Discover Christian Partners
        </Text>

        <Text
          style={{
            color: MUTED,
            fontSize: 12,
            fontWeight: "700",
            lineHeight: 17,
            marginTop: 3,
          }}
          numberOfLines={2}
        >
          Businesses, ministries,
          creators and organisations.
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={19}
        color={DEEP_OLIVE}
      />
    </Pressable>

    <View
      style={{
        height: 1,
        backgroundColor:
          CARD_BORDER,
        marginLeft: 71,
      }}
    />

    <Pressable
      onPress={() =>
        navigation.navigate(
          "Networks"
        )
      }
      style={({ pressed }) => ({
        paddingHorizontal: 15,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: pressed
          ? SOFT_GOLD_BG
          : SURFACE,
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 16,
          backgroundColor:
            SOFT_GOLD_BG,
          borderWidth: 1,
          borderColor:
            AMBER_BORDER,
          alignItems: "center",
          justifyContent:
            "center",
          marginRight: 12,
        }}
      >
        <Ionicons
          name="people-circle-outline"
          size={22}
          color={EVENT_BROWN}
        />
      </View>

      <View
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <Text
          style={{
            color: TEXT,
            fontSize: 15,
            fontWeight: "900",
          }}
        >
          Explore Christian Networks
        </Text>

        <Text
          style={{
            color: MUTED,
            fontSize: 12,
            fontWeight: "700",
            lineHeight: 17,
            marginTop: 3,
          }}
          numberOfLines={2}
        >
          Join purpose-led spaces built
          around shared interests.
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={19}
        color={EVENT_BROWN}
      />
    </Pressable>

    <View
      style={{
        height: 1,
        backgroundColor:
          CARD_BORDER,
        marginLeft: 71,
      }}
    />

    <Pressable
      onPress={() =>
        navigation.navigate(
          "EventsScreen"
        )
      }
      style={({ pressed }) => ({
        paddingHorizontal: 15,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: pressed
          ? SOFT_GOLD_BG
          : SURFACE,
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 16,
          backgroundColor:
            SOFT_GOLD_BG,
          borderWidth: 1,
          borderColor:
            AMBER_BORDER,
          alignItems: "center",
          justifyContent:
            "center",
          marginRight: 12,
        }}
      >
        <Ionicons
          name="calendar-outline"
          size={21}
          color={EVENT_BROWN}
        />
      </View>

      <View
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <Text
          style={{
            color: TEXT,
            fontSize: 15,
            fontWeight: "900",
          }}
        >
          Find Christian Events
        </Text>

        <Text
          style={{
            color: MUTED,
            fontSize: 12,
            fontWeight: "700",
            lineHeight: 17,
            marginTop: 3,
          }}
          numberOfLines={2}
        >
          Discover church gatherings,
          courses, concerts and events.
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={19}
        color={EVENT_BROWN}
      />
    </Pressable>

    <View
      style={{
        height: 1,
        backgroundColor:
          CARD_BORDER,
        marginLeft: 71,
      }}
    />

    <Pressable
      onPress={
        handleOpenFellowship
      }
      style={({ pressed }) => ({
        paddingHorizontal: 15,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: pressed
          ? SOFT_OLIVE_BG
          : SURFACE,
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 16,
          backgroundColor:
            SOFT_OLIVE_BG,
          borderWidth: 1,
          borderColor:
            OLIVE_BORDER,
          alignItems: "center",
          justifyContent:
            "center",
          marginRight: 12,
        }}
      >
        <Ionicons
          name="people-outline"
          size={21}
          color={DEEP_OLIVE}
        />
      </View>

      <View
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <Text
          style={{
            color: TEXT,
            fontSize: 15,
            fontWeight: "900",
          }}
        >
          Fellowship Connections
        </Text>

        <Text
          style={{
            color: MUTED,
            fontSize: 12,
            fontWeight: "700",
            lineHeight: 17,
            marginTop: 3,
          }}
          numberOfLines={2}
        >
          Build meaningful Christian
          relationships across Triunely.
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={19}
        color={DEEP_OLIVE}
      />
    </Pressable>
  </View>
</View>  

      {/* Stories */}
      <View
        style={{
          marginBottom: 18,
          borderRadius: 24,
          paddingTop: 15,
          paddingBottom: 14,
          backgroundColor: SURFACE,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          shadowColor: SHADOW,
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: {
            width: 0,
            height: 5,
          },
          elevation: 3,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            paddingHorizontal: 15,
            marginBottom: 8,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 14,
              backgroundColor:
                SOFT_GOLD_BG,
              borderWidth: 1,
              borderColor:
                AMBER_BORDER,
              alignItems: "center",
              justifyContent:
                "center",
              marginRight: 10,
            }}
          >
            <Ionicons
              name="sparkles-outline"
              size={19}
              color={EVENT_BROWN}
            />
          </View>

          <View
            style={{
              flex: 1,
              minWidth: 0,
            }}
          >
            <Text
              style={{
                color: TEXT,
                fontSize: 18,
                lineHeight: 22,
                fontWeight: "900",
              }}
            >
              Stories
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 11.5,
                lineHeight: 16,
                fontWeight: "700",
                marginTop: 2,
              }}
            >
              Share moments from Christian life.
            </Text>
          </View>

          <Pressable
            onPress={
              handleAddStoryPress
            }
            hitSlop={8}
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 14,
              backgroundColor:
                pressed
                  ? SOFT_OLIVE_BG
                  : PREMIUM_CREAM,
              borderWidth: 1,
              borderColor:
                OLIVE_BORDER,
              alignItems: "center",
              justifyContent:
                "center",
            })}
          >
            <Ionicons
              name="add"
              size={21}
              color={DEEP_OLIVE}
            />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
contentContainerStyle={{
  paddingVertical: 5,
  paddingHorizontal: 15,
}}
        >
          {/* Your story bubble */}
          <Pressable
            onPress={handleYourStoryPress}
            style={({ pressed }) => ({
              alignItems: "center",
              marginRight: 16,
              transform: [{ scale: pressed ? 0.97 : 1 }],
              opacity: pressed ? 0.92 : 1,
            })}
          >
            <View style={{ position: "relative", width: STORY_SIZE, height: STORY_SIZE }}>
              {/* Soft pulse for unseen Story */}
              {yourHasUnseen ? (
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    top: -7,
                    left: -7,
                    width: STORY_SIZE + 14,
                    height: STORY_SIZE + 14,
                    borderRadius:
                      (STORY_SIZE + 14) / 2,
                    backgroundColor:
                      "rgba(79, 99, 59, 0.14)",
                    opacity: pulseOpacity,
                    transform: [
                      {
                        scale: pulseScale,
                      },
                    ],
                    shadowColor: DEEP_OLIVE,
                    shadowOpacity: 0.18,
                    shadowRadius: 10,
                    shadowOffset: {
                      width: 0,
                      height: 0,
                    },
                    elevation: 5,
                  }}
                />
              ) : null}

              {/* Premium Story ring */}
              <View
                style={{
                  width: STORY_SIZE,
                  height: STORY_SIZE,
                  borderRadius:
                    STORY_SIZE / 2,
                  padding: STORY_RING,
                  backgroundColor:
                    hasOwnStory
                      ? yourHasUnseen
                        ? "rgba(180, 83, 9, 0.12)"
                        : "rgba(79, 99, 59, 0.09)"
                      : PREMIUM_CREAM,
                  borderWidth:
                    yourHasUnseen
                      ? 2
                      : 1,
                  borderColor:
                    yourHasUnseen
                      ? EVENT_AMBER
                      : hasOwnStory
                        ? OLIVE_BORDER
                        : CARD_BORDER,
                  shadowColor:
                    yourHasUnseen
                      ? EVENT_AMBER
                      : SHADOW,
                  shadowOpacity:
                    yourHasUnseen
                      ? 0.16
                      : 0.08,
                  shadowRadius:
                    yourHasUnseen
                      ? 8
                      : 5,
                  shadowOffset: {
                    width: 0,
                    height: 3,
                  },
                  elevation:
                    yourHasUnseen
                      ? 4
                      : 2,
                }}
              >
                {/* INNER AVATAR */}
                <View
                  style={{
                    width: STORY_INNER,
                    height: STORY_INNER,
                    borderRadius: STORY_INNER / 2,
                    overflow: "hidden",
                    backgroundColor: theme.colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: theme.colors.divider,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {profileAvatarUrl ? (
                    <Image source={{ uri: profileAvatarUrl }} style={{ width: STORY_INNER, height: STORY_INNER }} />
                  ) : (
                    <Text style={{ color: theme.colors.text, fontWeight: "900" }}>You</Text>
                  )}
                </View>
              </View>

              {/* Add Story badge */}
              <Pressable
                onPress={(event) => {
                  event.stopPropagation?.();
                  handleAddStoryPress();
                }}
                hitSlop={8}
                style={({ pressed }) => ({
                  position: "absolute",
                  bottom: -3,
                  right: -3,
                  width: 27,
                  height: 27,
                  borderRadius: 10,
                  backgroundColor:
                    pressed
                      ? EVENT_BROWN
                      : EVENT_AMBER,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2.5,
                  borderColor: SURFACE,
                  shadowColor: SHADOW,
                  shadowOpacity: 0.2,
                  shadowRadius: 5,
                  shadowOffset: {
                    width: 0,
                    height: 2,
                  },
                  elevation: 5,
                  transform: [
                    {
                      scale:
                        pressed
                          ? 0.92
                          : 1,
                    },
                  ],
                })}
              >
                <Ionicons
                  name="add"
                  size={18}
                  color={SURFACE}
                />
              </Pressable>
            </View>

<Text
  style={{
    color: MUTED,
    fontSize: 11.5,
    fontWeight: "800",
    marginTop: 7,
    maxWidth:
      STORY_SIZE + 8,
  }}
  numberOfLines={1}
>
  Your story
</Text>
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
                    style={({ pressed }) => ({
                      alignItems: "center",
                      marginRight: 14,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                      opacity: pressed ? 0.92 : 1,
                    })}
                  >
                    {/* Premium Story ring */}
                    <View
                      style={{
                        width: STORY_SIZE,
                        height: STORY_SIZE,
                        borderRadius:
                          STORY_SIZE / 2,
                        padding: STORY_RING,
                        backgroundColor:
                          hasUnseen
                            ? "rgba(180, 83, 9, 0.11)"
                            : "rgba(79, 99, 59, 0.07)",
                        borderWidth:
                          hasUnseen
                            ? 2
                            : 1,
                        borderColor:
                          hasUnseen
                            ? EVENT_AMBER
                            : OLIVE_BORDER,
                        shadowColor:
                          hasUnseen
                            ? EVENT_AMBER
                            : SHADOW,
                        shadowOpacity:
                          hasUnseen
                            ? 0.15
                            : 0.06,
                        shadowRadius:
                          hasUnseen
                            ? 8
                            : 4,
                        shadowOffset: {
                          width: 0,
                          height: 3,
                        },
                        elevation:
                          hasUnseen
                            ? 4
                            : 2,
                      }}
                    >
                      {/* INNER AVATAR */}
                      <View
                        style={{
                          width: STORY_INNER,
                          height: STORY_INNER,
                          borderRadius: STORY_INNER / 2,
                          overflow: "hidden",
                          backgroundColor: theme.colors.surfaceAlt,
                          borderWidth: 1,
                          borderColor: theme.colors.divider,
                        }}
                      >
                        {avatar ? (
                          <Image source={{ uri: avatar }} style={{ width: STORY_INNER, height: STORY_INNER }} />
                        ) : (
                          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ color: theme.colors.text2, fontWeight: "900" }}>
                              {name.slice(0, 1).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <Text
style={{
  color: MUTED,
  fontSize: 11.5,
  fontWeight: "800",
  marginTop: 7,
  maxWidth:
    STORY_SIZE + 8,
}}
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

      {/* Community composer */}
      <View
        style={{
          borderRadius: 22,
          backgroundColor: SURFACE,
          borderWidth: 1,
          borderColor: OLIVE_BORDER,
          padding: 12,
          shadowColor: SHADOW,
          shadowOpacity: 0.08,
          shadowRadius: 10,
          shadowOffset: {
            width: 0,
            height: 4,
          },
          elevation: 2,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              padding: 2,
              backgroundColor:
                SOFT_OLIVE_BG,
              borderWidth: 1,
              borderColor:
                OLIVE_BORDER,
              marginRight: 10,
            }}
          >
            <View
              style={{
                flex: 1,
                borderRadius: 19,
                overflow: "hidden",
                backgroundColor:
                  PREMIUM_CREAM,
                alignItems: "center",
                justifyContent:
                  "center",
              }}
            >
              {profileAvatarUrl ? (
                <Image
                  source={{
                    uri: profileAvatarUrl,
                  }}
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                />
              ) : (
                <Text
                  style={{
                    color: DEEP_OLIVE,
                    fontWeight: "900",
                  }}
                >
                  Y
                </Text>
              )}
            </View>
          </View>

          <Pressable
            onPress={() =>
              setShowNewModal(true)
            }
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 44,
              backgroundColor:
                pressed
                  ? SOFT_OLIVE_BG
                  : PREMIUM_CREAM,
              borderRadius: 999,
              paddingVertical: 11,
              paddingHorizontal: 15,
              borderWidth: 1,
              borderColor:
                CARD_BORDER,
              justifyContent:
                "center",
            })}
          >
            <Text
              style={{
                color: MUTED,
                fontSize: 14,
                fontWeight: "700",
              }}
            >
              What’s on your heart?
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              setShowNewModal(true)
            }
            hitSlop={6}
            style={({ pressed }) => ({
              width: 42,
              height: 42,
              borderRadius: 15,
              marginLeft: 9,
              backgroundColor:
                pressed
                  ? SOFT_GOLD_BG
                  : PREMIUM_CREAM,
              borderWidth: 1,
              borderColor:
                AMBER_BORDER,
              alignItems: "center",
              justifyContent:
                "center",
            })}
          >
            <Ionicons
              name="image-outline"
              size={21}
              color={EVENT_AMBER}
            />
          </Pressable>
        </View>
      </View>

      {/* Community Feed header */}
<View style={{ marginTop: 20, marginBottom: 12 }}>
 <Text
  style={{
    ...theme.premium.text.sectionTitle,
    marginBottom: 12,
  }}
>
  Community Feed
</Text>

  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    }}
  >
    <Pressable
      onPress={() => Alert.alert("Feed filter", "Showing all posts for now.")}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: DEEP_OLIVE,
        borderWidth: 1,
        borderColor: DEEP_OLIVE,
      }}
    >
      <Text style={{ color: "#fff", fontSize: 12, fontWeight: "900" }}>All</Text>
    </Pressable>

    <Pressable
      onPress={() => Alert.alert("My Church", "Church feed filtering is coming later.")}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 13,
        borderRadius: 999,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.divider,
      }}
    >
      <Text style={{ color: theme.colors.text2, fontSize: 12, fontWeight: "800" }}>
        My Church
      </Text>
    </Pressable>

    <Pressable
      onPress={() => Alert.alert("My Networks", "Network feed filtering is coming later.")}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 13,
        borderRadius: 999,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.divider,
      }}
    >
      <Text style={{ color: theme.colors.text2, fontSize: 12, fontWeight: "800" }}>
        My Networks
      </Text>
    </Pressable>

    <Pressable
      onPress={() => Alert.alert("Local", "Local feed filtering is coming later.")}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 13,
        borderRadius: 999,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.divider,
      }}
    >
      <Text style={{ color: theme.colors.text2, fontSize: 12, fontWeight: "800" }}>
        Local
      </Text>
    </Pressable>

    <Pressable
      onPress={() => Alert.alert("Filters", "Advanced feed filters are coming later.")}
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: "auto",
      }}
    >
      <Ionicons name="options-outline" size={18} color={DEEP_OLIVE} />
    </Pressable>
  </View>
</View>

      {error ? <Text style={{ color: theme.colors.danger, marginTop: 10 }}>{error}</Text> : null}
    </View>
  );

  return (
<Screen
  backgroundColor={
    PREMIUM_CREAM
  }
  padded={false}
  style={{ flex: 1 }}
  contentStyle={{
    flex: 1,
  }}
>
      {({ bottomPad }) => (
        <>
          {loading ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator size="large" color={theme.colors.gold} />
              <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Loading posts…</Text>
            </View>
          ) : (
            <FlatList
              data={filteredPosts}
              keyExtractor={(item) =>
                item.feed_key ||
                `${
                  item.feed_source ||
                  "community"
                }:${item.id}`
              }
              renderItem={renderItem}
              ListHeaderComponent={renderFeedHeader}
              contentContainerStyle={{
                paddingHorizontal: 0,
                paddingTop: 0,
                paddingBottom: bottomPad + 16,
backgroundColor:
  PREMIUM_CREAM,
              }}
ItemSeparatorComponent={() => (
  <View
    style={{
      height: 12,
      backgroundColor:
        PREMIUM_CREAM,
    }}
  />
)}
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

          <CommunityDeletePostModal
            visible={showDeletePostModal}
            deleting={deletingPost}
            onCancel={closeDeletePostModal}
            onConfirm={deleteSelectedPost}
          />

          <CommunityShareSheet
            visible={showShareSheet}
            post={selectedPostForShare}
            sharingToFeed={sharingToFeed}
            onClose={closeShareSheet}
            onConfirmFeedShare={
              handleConfirmFeedShare
            }
            onSendInMessage={
              handleSendPostInMessage
            }
            onShareExternally={
              handleExternalPostShare
            }
            onCopyLink={
              handleCopyPostLink
            }
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
                {/* Header row */}
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

                {/* Input */}
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

                {/* Results */}
                <View style={{ maxHeight: 520, paddingBottom: 10 }}>
                  <FlatList
                    data={filteredPosts}
              keyExtractor={(item) =>
                item.feed_key ||
                `${
                  item.feed_source ||
                  "community"
                }:${item.id}`
              }
                    renderItem={({ item }) => (
                      <Pressable
                        onPress={() => {
                          // For now: just close search when you tap a result.
                          // Later we can scroll to the post or open a post detail view.
                          setShowSearch(false);
                        }}
                        style={({ pressed }) => ({
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                          borderTopWidth: 1,
                          borderTopColor: theme.colors.divider,
                          backgroundColor: pressed
                            ? theme.colors.sageSoft || "rgba(134,171,142,0.10)"
                            : "transparent",
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

              {/* Tap outside to close */}
              <Pressable style={{ flex: 1 }} onPress={() => setShowSearch(false)} />
            </View>
          </Modal>

                    <TriunelyImageEditor
            visible={
              storyImageEditorVisible
            }
            imageUri={
              selectedStoryImage?.uri ||
              null
            }
            cropMode="story"
            title="Prepare your Story"
            onCancel={
              handleStoryImageEditorCancel
            }
            onChooseDifferent={
              handleChooseDifferentStoryImage
            }
            onComplete={
              handleStoryImagePrepared
            }
          />

                    <TriunelyStoryMediaPicker
            visible={Boolean(
              storyMediaPickerMode
            )}
            mode={
              storyMediaPickerMode ||
              "type"
            }
            onClose={
              closeStoryMediaPicker
            }
            onChoosePhoto={
              storyMediaPickerMode ===
                "type"
                ? openPhotoStorySources
                : openStoryTypePicker
            }
            onChooseVideo={
              openVideoStorySources
            }
            onChooseGallery={
              handleStoryGallerySelection
            }
            onChooseCamera={
              handleStoryCameraSelection
            }
          />

          <TriunelyStoryPreview
            visible={Boolean(
              storyPreview
            )}
            preview={
              storyPreview
            }
            insets={insets}
            posting={
              storyPosting
            }
            overlays={
              storyOverlays
            }
            selectedOverlayId={
              selectedOverlayId
            }
            setSelectedOverlayId={
              setSelectedOverlayId
            }
            canvasLayout={
              storyCanvasLayout
            }
            setCanvasLayout={
              setStoryCanvasLayout
            }
            isTypingText={
              isTypingStoryText
            }
            setIsTypingText={
              setIsTypingStoryText
            }
            textDraft={
              storyTextDraft
            }
            setTextDraft={
              setStoryTextDraft
            }
            textStyleMode={
              storyTextStyleMode
            }
            setTextStyleMode={
              setStoryTextStyleMode
            }
            onAddText={
              handleAddTextOverlay
            }
            onAddEmoji={
              addEmojiOverlay
            }
            onAddSticker={
              addStickerOverlay
            }
            onAdjustOverlayScale={
              adjustSelectedOverlayScale
            }
            onDeleteSelectedOverlay={
              deleteSelectedStoryOverlay
            }
            onUpdateOverlayPosition={
              updateOverlayPosition
            }
            getOverlayAbsoluteStyle={
              getOverlayAbsoluteStyle
            }
            onCancel={
              handleCancelStoryPreview
            }
            onPost={
              handlePostStoryFromPreview
            }
          />


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
                paddingTop: 0,
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
                        <Image source={{ uri: storyViewerGroup.profile.avatar_url }} style={{ width: 36, height: 36 }} />
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

                  <Pressable onPress={handleCloseStoryViewer} style={{ paddingHorizontal: 10, paddingVertical: 6 }} hitSlop={10}>
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
                    <Image source={{ uri: currentStory.media_url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                 ) : isYouTubeUrl(currentStory?.media_url) ? (
  <Pressable
    onPress={() => Linking.openURL(currentStory.media_url)}
    style={{
      width: "100%",
      height: "100%",
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
