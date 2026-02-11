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
import VerifiedBadge from "../components/VerifiedBadge";
import { supabase } from "../lib/supabase";
import { theme } from "../theme/theme";

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
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
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

export default function Profile({ navigation }) {

  const [loading, setLoading] = useState(true);

  // Avatar state
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);

  // Cover (background) state
  const [coverImageUrl, setCoverImageUrl] = useState(null);
  const [savingCover, setSavingCover] = useState(false);

  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState(null);

  // Tabs
  const [activeTab, setActiveTab] = useState("about"); // 'about' | 'posts'

  // About info state
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [churchName, setChurchName] = useState("");
  const [baptismStatus, setBaptismStatus] = useState("");
  const [ministryAreas, setMinistryAreas] = useState("");
  const [favouriteBibleVerse, setFavouriteBibleVerse] = useState("");
  const [shortTestimony, setShortTestimony] = useState("");
  const [groupsJoined, setGroupsJoined] = useState([]);

  // Friendships (accepted follows where YOU are the follower)
  const [following, setFollowing] = useState([]);

  // PEOPLE SEARCH MODAL (Find people)
  const [peopleSearchModalVisible, setPeopleSearchModalVisible] =
    useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [justRequestedIds, setJustRequestedIds] = useState([]);

  const [isSymbolsMode, setIsSymbolsMode] = useState(false);
  const [shiftActive, setShiftActive] = useState(true); // start with first letter capital
  const [capsLock, setCapsLock] = useState(false);

  // Incoming fellowship requests (where YOU are followed and status = 'pending')
  const [pendingRequests, setPendingRequests] = useState([]);

  // Modals
  const [requestsModalVisible, setRequestsModalVisible] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
 

  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [savingAbout, setSavingAbout] = useState(false);

  // Posts tab
  const [userPosts, setUserPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // PostCard wiring
  const [reactionPickerForPost, setReactionPickerForPost] = useState(null);

  // Comments modal wiring
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState(null);

  const [isVerified, setIsVerified] = useState(false);
  const ALWAYS_VERIFIED_EMAILS = ["mrdavey.p1985@gmail.com"];
  // ✅ Church admin routing
const [adminChurchId, setAdminChurchId] = useState(null);
const [checkingChurchAdmin, setCheckingChurchAdmin] = useState(false);

const refreshChurchAdminStatus = useCallback(
  async (userIdOverride) => {
    const uid = userIdOverride || user?.id;
    if (!uid) return;

    try {
      setCheckingChurchAdmin(true);

      // Use .limit(1) rather than maybeSingle() to avoid errors if multiple rows exist
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

  useFocusEffect(
  useCallback(() => {
    if (!user?.id) return;

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

      setDisplayName(data?.display_name ?? null);
      setAvatarUrl(data?.avatar_url ?? null);
      setCoverImageUrl(data?.cover_image_url ?? null);

      const alwaysVerified =
        ALWAYS_VERIFIED_EMAILS.includes((user?.email || "").toLowerCase());
      setIsVerified(Boolean(data?.is_verified) || alwaysVerified);
    })();

    return () => {
      alive = false;
    };
  }, [user?.id])
);

useFocusEffect(
  useCallback(() => {
    if (!user?.id) return;
    refreshChurchAdminStatus(user.id);
  }, [user?.id, refreshChurchAdminStatus])
);

  // Load session + profile + groups + fellowships + pending requests + posts + notifications
  useEffect(() => {
    (async () => {
      try {
        // 1) Get the current logged-in user/session
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
 
        // ✅ Check whether this user is a church admin (and get church_id)
await refreshChurchAdminStatus(userId);



        // 2) Load profile including About fields + avatar + cover
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
        setDisplayName(profile?.display_name ?? null);
        setIsVerified(Boolean(profile?.is_verified) || isAlwaysVerified);

        setRelationshipStatus(profile?.relationship_status ?? "");
        setChurchName(profile?.church_name ?? "");
        setBaptismStatus(profile?.baptism_status ?? "");
        setMinistryAreas(profile?.ministry_areas ?? "");
        setFavouriteBibleVerse(profile?.favourite_bible_verse ?? "");
        setShortTestimony(profile?.short_testimony ?? "");

        // 3) Load groups joined
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

        // 4) Load friendships (accepted follows where YOU are the follower)
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

        // 4b) Load incoming fellowship requests (where YOU are followed and status = 'pending')
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

        // 5) Load this user's posts (normalized for PostCard)
        console.log("Profile userId is:", userId);
        await loadMyPosts(userId);

        // 6) Load notifications for this user
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


  // --------- POSTCARD ACTIONS (reactions / comments / share / delete) ---------

  async function handleSetReaction(postId, type) {
    if (!user?.id) return;

    const target = userPosts.find((p) => p.id === postId);
    const existing = target?.reactions?.find((r) => r.user_id === user.id);
    const isSame = existing?.type === type;

    try {
      // Toggle off if user taps Like and already has Like
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
            const next = (p.reactions || []).filter((r) => r.user_id !== user.id);
            return { ...p, reactions: next };
          })
        );
      } else {
        // Upsert new reaction type
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
      // Close picker if open
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

    // safest: reload counts after commenting
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
            Alert.alert("Error", "We couldn't delete this post. Please try again.");
          }
        },
      },
    ]);
  }

  // Keep signature for PostCard (not used on own profile, but passed for completeness)
  function handleHidePost() {
    Alert.alert("Hidden", "This post has been hidden.");
  }

  // --------- AVATAR + COVER UPLOADS ---------

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

      const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);

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

  // --- SEARCH PEOPLE + SEND FELLOWSHIP REQUESTS ---

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
        Alert.alert("Already in fellowship", "You are already in fellowship with this person.");
        return;
      }

      if (justRequestedIds.includes(targetProfile.id)) {
        Alert.alert("Request already sent", "You have already sent a fellowship request to this person.");
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
      Alert.alert("Error", "We couldn't send this fellowship request. Please try again.");
    }
  }

  // Accept a pending fellowship request
  async function handleAcceptFellowshipRequest(request) {
    if (!user?.id) return;

    try {
      // 1) Mark the incoming request as accepted
      const { error: updateError } = await supabase
        .from("follows")
        .update({ status: "accepted" })
        .eq("id", request.id);

      if (updateError) {
        console.log("Error updating request to accepted:", updateError);
        throw updateError;
      }

      // 2) Insert reverse row so YOU also follow them
      const { error: reverseError } = await supabase.from("follows").insert({
        follower_id: user.id,
        followed_id: request.follower_id,
        status: "accepted",
      });

      if (reverseError) {
        console.log("Reverse follow insert error:", reverseError);
      }

      // 3) Create notification for the original requester
      try {
        const notifTitle = "Fellowship accepted";
        const accepterName = displayName || "Someone";
        const notifBody = `${accepterName} accepted your fellowship request.`;

        const { error: notifError } = await supabase.from("notifications").insert({
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

      // 4) Update UI locally: remove from pendingRequests
      setPendingRequests((prev) => prev.filter((r) => r.id !== request.id));

      // 5) Add to Fellowships list immediately if we have profile data
      if (request.profile) {
        setFollowing((prev) => {
          const alreadyThere = prev.some((p) => p.id === request.profile.id);
          if (alreadyThere) return prev;
          return [...prev, request.profile];
        });
      }

      Alert.alert("Fellowship accepted", "You are now in fellowship with this person.");
    } catch (e) {
      console.log("Error accepting fellowship request", e);
      Alert.alert("Error", "We couldn't accept this fellowship request. Please try again.");
    }
  }

  // Decline a pending fellowship request
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
      Alert.alert("Error", "We couldn't decline this fellowship request. Please try again.");
    }
  }

 

  // --- Notifications ---

  function handleOpenNotifications() {
  navigation.navigate("Notifications");
}


  // --- CUSTOM KEYBOARD HANDLERS FOR PEOPLE SEARCH ---

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

  // SAFE UX: close modal + reset its state so reopening is clean
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
        <Text style={{ color: theme.colors.muted, marginTop: 8 }}>
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
          backgroundColor: theme.colors.bg,
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        <Text style={{ color: theme.colors.text, fontSize: 18, marginBottom: 8 }}>
          Not signed in
        </Text>
        <Text style={{ color: theme.colors.muted, textAlign: "center" }}>
          Please sign in again to manage your profile.
        </Text>
      </View>
    );
  }

 function goToUserProfile(targetUserId, { closeModal } = {}) {
  if (!targetUserId) return;

  const go = () => {
    // ✅ If the target is YOU, go straight to your real Profile tab
    if (targetUserId === user?.id) {
      navigation.navigate("MainTabs", { screen: "Profile" });
      return;
    }

    navigation.navigate("UserProfile", { userId: targetUserId });
  };

  if (typeof closeModal === "function") {
    closeModal();
    // Small delay so the modal closes cleanly before navigating
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
          marginTop: 8,
          gap: 8,
        }}
      >
        {options.map((opt) => {
          const isActive = selected === opt;
          return (
            <Pressable
              key={opt}
              onPress={() => onSelect(opt)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: isActive
                  ? theme.colors.goldOutline
                  : theme.colors.divider,
                backgroundColor: isActive
                  ? theme.colors.goldHalo
                  : theme.colors.surface,
              }}
            >
              <Text
                style={{
                  color: isActive ? theme.colors.goldPressed : theme.colors.text2,
                  fontSize: 13,
                  fontWeight: isActive ? "800" : "600",
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

  function renderAboutView() {
    if (isEditingAbout) {
      return (
        <View>
          {/* Relationship status */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: theme.colors.muted, marginBottom: 4 }}>
              Relationship status
            </Text>
            {renderOptionPills(
              RELATIONSHIP_OPTIONS,
              relationshipStatus,
              setRelationshipStatus
            )}
          </View>

          {/* Church name */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: theme.colors.muted, marginBottom: 4 }}>
              Church name
            </Text>
            <TextInput
              value={churchName}
              onChangeText={setChurchName}
              placeholder="e.g. Hope Community Church, Southampton"
              placeholderTextColor={theme.input.placeholder}
              style={theme.input.box}
            />
          </View>

          {/* Faith & baptism journey */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: theme.colors.muted, marginBottom: 4 }}>
              Faith Journey
            </Text>
            {renderOptionPills(BAPTISM_OPTIONS, baptismStatus, setBaptismStatus)}
          </View>

          {/* Ministry areas */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: theme.colors.muted, marginBottom: 4 }}>
              Ministry / serving areas
            </Text>
            <TextInput
              value={ministryAreas}
              onChangeText={setMinistryAreas}
              placeholder="e.g. Worship, Kids, Street outreach"
              placeholderTextColor={theme.input.placeholder}
              style={theme.input.box}
            />
          </View>

          {/* Favourite Bible verse */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: theme.colors.muted, marginBottom: 4 }}>
              Favourite Bible verse
            </Text>
            <TextInput
              value={favouriteBibleVerse}
              onChangeText={setFavouriteBibleVerse}
              placeholder='e.g. "John 3:16 – For God so loved the world..."'
              placeholderTextColor={theme.input.placeholder}
              style={theme.input.box}
            />
          </View>

          {/* Short testimony */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: theme.colors.muted, marginBottom: 4 }}>
              Short testimony
            </Text>
            <TextInput
              value={shortTestimony}
              onChangeText={setShortTestimony}
              placeholder="Share a short version of your story with Jesus."
              placeholderTextColor={theme.input.placeholder}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={[
                theme.input.box,
                {
                  minHeight: 110,
                },
              ]}
            />
          </View>

          {/* Groups joined – read-only */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: theme.colors.muted, marginBottom: 4 }}>
              Groups joined
            </Text>
            {groupsJoined.length === 0 ? (
              <Text style={{ color: theme.colors.text2 }}>
                You are not part of any groups yet.
              </Text>
            ) : (
              <View style={{ marginTop: 4 }}>
                {groupsJoined.map((name) => (
                  <Text
                    key={name}
                    style={{
                      color: theme.colors.text2,
                      marginBottom: 2,
                      fontWeight: "600",
                    }}
                  >
                    • {name}
                  </Text>
                ))}
              </View>
            )}
          </View>

          {/* Save / Cancel buttons */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              marginTop: 8,
            }}
          >
            <Pressable
              onPress={() => setIsEditingAbout(false)}
              disabled={savingAbout}
              style={[
                theme.button.outline,
                {
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  marginRight: 8,
                },
              ]}
            >
              <Text style={theme.button.outlineText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleSaveAbout}
              disabled={savingAbout}
              style={[
                theme.button.primary,
                {
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  opacity: savingAbout ? 0.7 : 1,
                },
              ]}
            >
              <Text style={theme.button.primaryText}>
                {savingAbout ? "Saving…" : "Save"}
              </Text>
            </Pressable>
          </View>
        </View>
      );
    }

    // VIEW MODE
    return (
      <View>
        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: theme.colors.muted, marginBottom: 4 }}>
            Relationship status
          </Text>
          <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
            {relationshipStatus || "Not set yet"}
          </Text>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: theme.colors.muted, marginBottom: 4 }}>
            Church name
          </Text>
          <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
            {churchName || "Not set yet"}
          </Text>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: theme.colors.muted, marginBottom: 4 }}>
            Faith Journey
          </Text>
          <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
            {baptismStatus || "Not set yet"}
          </Text>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: theme.colors.muted, marginBottom: 4 }}>
            Ministry / serving areas
          </Text>
          <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
            {ministryAreas || "Not set yet"}
          </Text>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: theme.colors.muted, marginBottom: 4 }}>
            Favourite Bible verse
          </Text>
          <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
            {favouriteBibleVerse || "Not set yet"}
          </Text>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: theme.colors.muted, marginBottom: 4 }}>
            Short testimony
          </Text>
          <Text style={{ color: theme.colors.text2, fontWeight: "500" }}>
            {shortTestimony || "Not set yet"}
          </Text>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: theme.colors.muted, marginBottom: 4 }}>
            Groups joined
          </Text>
          {groupsJoined.length === 0 ? (
            <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
              You are not part of any groups yet.
            </Text>
          ) : (
            <View>
              {groupsJoined.map((name) => (
                <Text
                  key={name}
                  style={{
                    color: theme.colors.text,
                    fontWeight: "700",
                    marginBottom: 2,
                  }}
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
        <View
          style={{
            paddingVertical: 16,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="small" color={theme.colors.gold} />
          <Text style={{ color: theme.colors.muted, marginTop: 8 }}>
            Loading your posts…
          </Text>
        </View>
      );
    }

    if (!userPosts || userPosts.length === 0) {
      return (
        <View style={{ paddingVertical: 16 }}>
          <Text style={{ color: theme.colors.muted }}>
            You haven&apos;t posted anything yet.
          </Text>
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
              currentUserId={user.id}
              author={{
                name: isAnon ? "Anonymous" : displayName || "Triunely user",
                avatarUrl: isAnon ? null : avatarUrl,
                isAnonymous: isAnon,
                isOwner: true, // this is your own profile feed
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

  return (
    <Screen backgroundColor={theme.colors.bg} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: bottomPad }}
          >
            {/* Header row with title + icons */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <Text style={theme.text.h1}>Profile</Text>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>

           
                {/* Notifications */}
                <Pressable
                  onPress={handleOpenNotifications}
                  style={iconButtonStyle}
                  hitSlop={8}
                >
                  <Ionicons
                    name="notifications-outline"
                    size={22}
                    color={theme.colors.text2}
                  />
                  {unreadNotificationCount > 0 && (
                    <View style={iconBadgeStyle}>
                      <Text
                        style={{
                          color: theme.colors.text,
                          fontSize: 10,
                          fontWeight: "900",
                        }}
                      >
                        {unreadNotificationCount}
                      </Text>
                    </View>
                  )}
                </Pressable>

                {/* Fellowship requests */}
                <Pressable
                  onPress={() => setRequestsModalVisible(true)}
                  style={iconButtonStyle}
                  hitSlop={8}
                >
                  <Ionicons name="people-outline" size={22} color={theme.colors.text2} />
                  {pendingRequests.length > 0 && (
                    <View style={iconBadgeStyle}>
                      <Text
                        style={{
                          color: theme.colors.text,
                          fontSize: 10,
                          fontWeight: "900",
                        }}
                      >
                        {pendingRequests.length}
                      </Text>
                    </View>
                  )}
                </Pressable>

                {/* Find people */}
                <Pressable
                  onPress={() => setPeopleSearchModalVisible(true)}
                  style={iconButtonStyle}
                  hitSlop={8}
                >
                  <Ionicons name="search-outline" size={22} color={theme.colors.text2} />
                </Pressable>
              </View>
            </View>

            {/* FULL-BLEED COVER + padded avatar/name */}
            <View style={{ marginBottom: 18 }}>
              {/* FULL-BLEED COVER (no radius, no border) */}
              <View
                style={{
                  height: 160,
                  width: "100%",
                  overflow: "hidden",
                  backgroundColor: theme.colors.surfaceAlt,
                  marginBottom: -52,
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
                      paddingHorizontal: 16,
                      backgroundColor: theme.colors.sageTint,
                    }}
                  >
                    <Text style={{ color: theme.colors.text2, fontSize: 12 }}>
                      Add a background image to personalise your profile.
                    </Text>
                  </View>
                )}

                {/* Cover camera icon */}
                <Pressable
                  onPress={handlePickCoverImage}
                  disabled={savingCover}
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: savingCover
                      ? theme.colors.surfaceAlt
                      : theme.colors.gold,
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: theme.colors.goldOutline,
                  }}
                >
                  <Ionicons
                    name={savingCover ? "time-outline" : "camera-outline"}
                    size={18}
                    color={theme.colors.text}
                  />
                </Pressable>
              </View>

              {/* Avatar + name row */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  paddingHorizontal: 4,
                }}
              >
                <View style={{ marginTop: -48, marginRight: 12 }}>
                  {/* Avatar */}
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
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
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 32,
                          fontWeight: "900",
                        }}
                      >
                        {initials}
                      </Text>
                    </View>
                  )}

                  {/* Small camera icon over avatar */}
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
                      backgroundColor: savingAvatar
                        ? theme.colors.surfaceAlt
                        : theme.colors.gold,
                      justifyContent: "center",
                      alignItems: "center",
                      borderWidth: 2,
                      borderColor: theme.colors.bg,
                    }}
                  >
                    <Ionicons name="camera-outline" size={18} color={theme.colors.text} />
                  </Pressable>
                </View>
              </View>

              {/* Display name under header */}
              <View
                style={{
                  marginTop: 10,
                  paddingHorizontal: 4,
                  flexDirection: "row",
                  alignItems: "baseline",
                }}
              >
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: 22,
                    fontWeight: "900",
                  }}
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

              {/* Pending avatar preview */}
              {pendingAvatar && (
                <View
                  style={{
                    marginTop: 16,
                    alignItems: "flex-start",
                    backgroundColor: theme.colors.surface,
                    borderRadius: 16,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: theme.colors.divider,
                  }}
                >
                  <Text style={{ color: theme.colors.text2, marginBottom: 8 }}>
                    Preview new profile picture
                  </Text>

                  <Image
                    source={{ uri: pendingAvatar.uri }}
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 48,
                      marginBottom: 10,
                    }}
                    resizeMode="cover"
                  />

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "flex-start",
                    }}
                  >
                    <Pressable
                      disabled={savingAvatar}
                      onPress={confirmAvatarChange}
                      style={{
                        backgroundColor: savingAvatar
                          ? theme.colors.surfaceAlt
                          : theme.colors.blue,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 999,
                        marginRight: 8,
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "800" }}>
                        {savingAvatar ? "Saving…" : "Use this photo"}
                      </Text>
                    </Pressable>

                    <Pressable
                      disabled={savingAvatar}
                      onPress={() => setPendingAvatar(null)}
                      style={[
                        theme.button.outline,
                        { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
                      ]}
                    >
                      <Text style={theme.button.outlineText}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>

            {/* Fellowships card */}
            <View
              style={[
                theme.glow.outer,
                { padding: 1, marginBottom: 16, borderRadius: 18 },
              ]}
            >
              <View style={[theme.glow.inner, { padding: 16, borderRadius: 16 }]}>
                <Text style={theme.text.h2}>Fellowships</Text>

                {following && following.length > 0 ? (
                  <View style={{ marginTop: 10 }}>
                    {following.map((account) => {
                      const connInitials = safeInitials(account.display_name);

                     return (
  <Pressable
    key={account.id}
    onPress={() => goToUserProfile(account.id)}
    hitSlop={8}
    style={({ pressed }) => ({
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
      opacity: pressed ? 0.7 : 1,
    })}
  >

                          {account.avatar_url ? (
                            <Image
                              source={{ uri: account.avatar_url }}
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                marginRight: 10,
                              }}
                            />
                          ) : (
                            <View
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: theme.colors.blue,
                                justifyContent: "center",
                                alignItems: "center",
                                marginRight: 10,
                              }}
                            >
                              <Text
                                style={{
                                  color: "#fff",
                                  fontSize: 14,
                                  fontWeight: "900",
                                }}
                              >
                                {connInitials}
                              </Text>
                            </View>
                          )}

                          <Text
                            style={{
                              color: theme.colors.text,
                              fontSize: 14,
                              fontWeight: "800",
                            }}
                          >
                            {account.display_name || "Triunely user"}
                          </Text>
                       </Pressable>

                      );
                    })}
                  </View>
                ) : (
                  <Text style={[theme.text.muted, { marginTop: 10 }]}>
                    You are not connected with anyone yet. Send a fellowship request
                    from the community to start building fellowships.
                  </Text>
                )}
              </View>
            </View>

            {/* Tabs */}
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
                  backgroundColor:
                    activeTab === "posts" ? theme.colors.gold : "transparent",
                }}
              >
                <Text
                  style={{
                    color:
                      activeTab === "posts" ? theme.colors.text : theme.colors.text2,
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
                  backgroundColor:
                    activeTab === "about" ? theme.colors.gold : "transparent",
                }}
              >
                <Text
                  style={{
                    color:
                      activeTab === "about" ? theme.colors.text : theme.colors.text2,
                    fontWeight: "900",
                  }}
                >
                  About
                </Text>
              </Pressable>
            </View>

            {/* Tab content */}
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
              {activeTab === "about" && (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <Text style={theme.text.h2}>About</Text>

                  <Pressable
                    onPress={() => setIsEditingAbout((prev) => !prev)}
                    style={[
                      theme.button.outline,
                      { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
                    ]}
                  >
                    <Text style={theme.button.outlineText}>
                      {isEditingAbout ? "View" : "Edit"}
                    </Text>
                  </Pressable>
                </View>
              )}

              {activeTab === "about" ? renderAboutView() : renderPostsTab()}
            </View>
            {/* Church Admin (MVP) */}
            <View
              style={[
                theme.glow.outer,
                { padding: 1, marginBottom: 16, borderRadius: 18 },
              ]}
            >
              <View style={[theme.glow.inner, { padding: 16, borderRadius: 16 }]}>
                <Text style={theme.text.h2}>Church Admin</Text>

                <Text style={[theme.text.muted, { marginTop: 10 }]}>
                  Manage weekly encouragement and church announcements.
                </Text>

    <View style={{ marginTop: 12 }}>
  {checkingChurchAdmin ? (
    <Text style={[theme.text.muted, { fontWeight: "700" }]}>
      Checking admin access…
    </Text>
  ) : adminChurchId ? (
    <Text style={[theme.text.muted, { fontWeight: "700" }]}>
      You are set as a church admin. Use the Church tab at the bottom to open your church profile.
    </Text>
  ) : (
    <Text style={[theme.text.muted, { fontWeight: "700" }]}>
      This account is not set as a church admin yet.
    </Text>
  )}
</View>


              </View>
            </View>

            {/* Sign out button */}
            <Pressable
              onPress={handleSignOut}
              style={{
                backgroundColor: theme.colors.danger,
                paddingVertical: 12,
                borderRadius: 14,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "900",
                  textAlign: "center",
                }}
              >
                Sign out
              </Text>
            </Pressable>
          </ScrollView>

          {/* COMMENTS MODAL (wired to PostCard) */}
          <PostCommentsModal
            visible={commentsModalVisible}
            post={selectedPostForComments}
            currentUserId={user.id}
            onClose={handleCloseComments}
          />

          {/* People Search Modal */}
          <Modal
            visible={peopleSearchModalVisible}
            transparent
            animationType="slide"
            onRequestClose={closePeopleSearchModal}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.7)",
                justifyContent: "flex-end",
              }}
            >
              <View
                style={{
                  backgroundColor: theme.colors.surface,
                  borderTopLeftRadius: 18,
                  borderTopRightRadius: 18,
                  padding: 16,
                  maxHeight: "80%",
                }}
              >
                {/* Modal header */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <Text style={theme.text.h2}>Find people</Text>

                  <Pressable
                    onPress={closePeopleSearchModal}
                    style={[
                      theme.button.outline,
                      { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
                    ]}
                  >
                    <Text style={theme.button.outlineText}>Close</Text>
                  </Pressable>
                </View>

                {/* Search bar + button */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search by name…"
                    showSoftInputOnFocus={false}
                    caretHidden
                    placeholderTextColor={theme.input.placeholder}
                    style={[theme.input.box, { flex: 1, marginRight: 8 }]}
                  />
                  <Pressable
                    onPress={handleSearchPeople}
                    disabled={searchLoading}
                    style={[
                      theme.button.primary,
                      {
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 999,
                        opacity: searchLoading ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={theme.button.primaryText}>
                      {searchLoading ? "Searching…" : "Search"}
                    </Text>
                  </Pressable>
                </View>

                {/* Custom on-screen keyboard */}
                <View style={{ marginBottom: 12 }}>
                  {(isSymbolsMode ? SYMBOL_ROWS : LETTER_ROWS).map(
                    (row, rowIndex) => (
                      <View
                        key={rowIndex}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          marginBottom: 6,
                        }}
                      >
                        {row.map((keyChar) => {
                          let displayChar = keyChar;
                          if (!isSymbolsMode) {
                            if (shiftActive || capsLock)
                              displayChar = keyChar.toUpperCase();
                            else displayChar = keyChar.toLowerCase();
                          }

                          return (
                            <Pressable
                              key={keyChar}
                              onPress={() => handleKeyPress(keyChar)}
                              style={{
                                flex: 1,
                                marginHorizontal: 1,
                                paddingVertical: 10,
                                borderRadius: 10,
                                backgroundColor: theme.colors.surfaceAlt,
                                borderWidth: 1,
                                borderColor: theme.colors.divider,
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Text
                                style={{
                                  color: theme.colors.text,
                                  fontWeight: "900",
                                  fontSize: 14,
                                }}
                              >
                                {displayChar}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )
                  )}

                  {/* Bottom row: shift, 123/ABC, space, backspace, clear */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "center",
                      marginTop: 4,
                      flexWrap: "wrap",
                    }}
                  >
                    {!isSymbolsMode && (
                      <Pressable
                        onPress={handleShiftPress}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          margin: 4,
                          borderRadius: 999,
                          backgroundColor:
                            shiftActive || capsLock
                              ? theme.colors.gold
                              : theme.colors.surfaceAlt,
                          borderWidth: 1,
                          borderColor:
                            shiftActive || capsLock
                              ? theme.colors.goldOutline
                              : theme.colors.divider,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.colors.text,
                            fontWeight: "900",
                            fontSize: 13,
                          }}
                        >
                          {capsLock ? "⇪" : "⇧"}
                        </Text>
                      </Pressable>
                    )}

                    <Pressable
                      onPress={handleToggleSymbols}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        margin: 4,
                        borderRadius: 999,
                        backgroundColor: theme.colors.surfaceAlt,
                        borderWidth: 1,
                        borderColor: theme.colors.divider,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.colors.text,
                          fontWeight: "800",
                          fontSize: 13,
                        }}
                      >
                        {isSymbolsMode ? "ABC" : "123"}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={handleSpace}
                      style={{
                        paddingHorizontal: 24,
                        paddingVertical: 10,
                        margin: 4,
                        borderRadius: 999,
                        backgroundColor: theme.colors.surfaceAlt,
                        borderWidth: 1,
                        borderColor: theme.colors.divider,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.colors.text,
                          fontWeight: "800",
                          fontSize: 13,
                        }}
                      >
                        Space
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={handleBackspace}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        margin: 4,
                        borderRadius: 999,
                        backgroundColor: theme.colors.surfaceAlt,
                        borderWidth: 1,
                        borderColor: theme.colors.divider,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.colors.text,
                          fontWeight: "800",
                          fontSize: 13,
                        }}
                      >
                        ⌫
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={handleClear}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        margin: 4,
                        borderRadius: 999,
                        backgroundColor: theme.colors.danger,
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontWeight: "900",
                          fontSize: 13,
                        }}
                      >
                        Clear
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Error text */}
                {searchError && (
                  <Text
                    style={{
                      color: theme.colors.danger,
                      fontSize: 13,
                      marginBottom: 8,
                      fontWeight: "700",
                    }}
                  >
                    {searchError}
                  </Text>
                )}

                {/* Results list */}
                <ScrollView
                  style={{ marginTop: 4 }}
                  contentContainerStyle={{ paddingBottom: 8 }}
                >
                  {searchResults.length === 0 && !searchLoading ? (
                    <Text style={{ color: theme.colors.muted, fontSize: 13 }}>
                      Type a name and tap Search to find people.
                    </Text>
                  ) : (
                    searchResults.map((profile) => {
                      const initialsLocal = safeInitials(profile.display_name);

                      const alreadyFriend = following.some((p) => p.id === profile.id);
                      const justRequested = justRequestedIds.includes(profile.id);

                      let buttonLabel = "Send fellowship";
                      if (alreadyFriend) buttonLabel = "Already in fellowship";
                      else if (justRequested) buttonLabel = "Request sent";

                      const buttonDisabled =
                        alreadyFriend || justRequested || searchLoading;

                      return (
                        <View
                          key={profile.id}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 10,
                          }}
                        >
                       <Pressable
  onPress={() =>
    goToUserProfile(profile.id, { closeModal: closePeopleSearchModal })
  }
  hitSlop={8}
  style={({ pressed }) => ({
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    opacity: pressed ? 0.7 : 1,
  })}
>
  {profile.avatar_url ? (
    <Image
      source={{ uri: profile.avatar_url }}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
      }}
    />
  ) : (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.blue,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
      }}
    >
      <Text
        style={{
          color: "#fff",
          fontSize: 16,
          fontWeight: "900",
        }}
      >
        {initialsLocal}
      </Text>
    </View>
  )}

  <View style={{ flex: 1 }}>
    <Text
      style={{
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: "900",
      }}
      numberOfLines={1}
    >
      {profile.display_name || "Triunely user"}
    </Text>
  </View>
</Pressable>


                          <Pressable
                            disabled={buttonDisabled}
                            onPress={() => handleSendFellowshipRequest(profile)}
                            style={{
                              marginLeft: 8,
                              paddingHorizontal: 10,
                              paddingVertical: 8,
                              borderRadius: 999,
                              backgroundColor: buttonDisabled
                                ? theme.colors.surfaceAlt
                                : theme.colors.gold,
                              borderWidth: buttonDisabled ? 1 : 0,
                              borderColor: theme.colors.divider,
                            }}
                          >
                            <Text
                              style={{
                                color: buttonDisabled
                                  ? theme.colors.muted
                                  : theme.colors.text,
                                fontSize: 12,
                                fontWeight: "900",
                              }}
                            >
                              {buttonLabel}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Fellowship Requests Modal */}
          <Modal
            visible={requestsModalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setRequestsModalVisible(false)}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.7)",
                justifyContent: "flex-end",
              }}
            >
              <View
                style={{
                  backgroundColor: theme.colors.surface,
                  borderTopLeftRadius: 18,
                  borderTopRightRadius: 18,
                  padding: 16,
                  maxHeight: "70%",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <Text style={theme.text.h2}>Fellowship requests</Text>

                  <Pressable
                    onPress={() => setRequestsModalVisible(false)}
                    style={[
                      theme.button.outline,
                      { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
                    ]}
                  >
                    <Text style={theme.button.outlineText}>Close</Text>
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
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          {/* TAP AREA: avatar + name + subtext opens their profile */}
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
              flex: 1,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            {avatar ? (
              <Image
                source={{ uri: avatar }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  marginRight: 10,
                }}
              />
            ) : (
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.colors.blue,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 10,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: "900",
                  }}
                >
                  {initialsReq}
                </Text>
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: 14,
                  fontWeight: "900",
                }}
              >
                {name}
              </Text>
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                has sent you a fellowship request
              </Text>
            </View>
          </Pressable>

          {/* ACTIONS: keep these buttons separate so they still work */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginLeft: 8,
            }}
          >
            <Pressable
              onPress={() => handleAcceptFellowshipRequest(req)}
              style={{
                backgroundColor: "#22c55e",
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 999,
                marginRight: 6,
              }}
            >
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: 12,
                  fontWeight: "900",
                }}
              >
                Accept
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleDeclineFellowshipRequest(req.id)}
              style={[
                theme.button.outline,
                { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999 },
              ]}
            >
              <Text style={theme.button.outlineText}>Decline</Text>
            </Pressable>
          </View>
        </View>
      );
    })}
  </ScrollView>
) : (
  <Text style={{ color: theme.colors.muted }}>
    You have no pending fellowship requests right now.
  </Text>
)}

              </View>
            </View>
          </Modal>

          
        </>
      )}
    </Screen>
  );
}
