// src/screens/Prayer.js
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";

import EncourageModal from "../components/EncourageModal";
import FaithCoachModal from "../components/FaithCoachModal";
import NewPrayerGroupModal from "../components/NewPrayerGroupModal";
import NewPrayerModal from "../components/NewPrayerModal";
import Screen from "../components/Screen";
import { usePoints } from "../context/PointsContext";
import { supabase } from "../lib/supabase";

// ✅ Theme
import GlowButton from "../components/GlowButton";
import GlowCard from "../components/GlowCard";
import { theme } from "../theme/theme";

// IMPORTANT: keep this as your real Triunely Global community id
const GLOBAL_COMMUNITY_ID = "bb6353e4-8517-4c3e-b360-3cf5adbe9bb3";
const PAGE_LIMIT = 50;

// TEMP: disable prayer daily cap while testing swipe + animations
const DISABLE_DAILY_PRAYER_CAP_FOR_TESTING = true;

// ✅ Swipe direction toggle (locks behaviour per device)
// If swipe is back-to-front, flip this once and you’re done.
const SWIPE_DIRECTION_MODE = "INVERTED"; // "INVERTED" | "NORMAL"

const FILTERS = [
  { id: "all", label: "All requests" },
  { id: "mine", label: "My requests" },
  { id: "saved", label: "Saved" },
  { id: "prayed", label: "Prayed" },
];

function firstNameOnly(s) {
  return (s || "").trim().split(/\s+/)[0] || "";
}

function initialsFromName(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
}

function formatDateTime(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}

export default function Prayer() {
  // ✅ Keep existing behaviour, but also read totals for the header pill
  const points = usePoints();
  const awardPrayerPoint = points?.awardPrayerPoint;

  const totalLP = points?.total ?? 0;
  const monthTotal = points?.monthTotal;
  const monthLP = Number.isFinite(Number(monthTotal)) ? Number(monthTotal) : Number(totalLP || 0);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [showNewModal, setShowNewModal] = useState(false);
  const [posting, setPosting] = useState(false);

  const [activeFilter, setActiveFilter] = useState("all");
  const [currentUserId, setCurrentUserId] = useState(null);

  const [bookmarkedById, setBookmarkedById] = useState({});
  const [bookmarksLoaded, setBookmarksLoaded] = useState(false);

  const [prayedThisSessionById, setPrayedThisSessionById] = useState({});

  const swipeRefs = useRef({});

  // ✅ cache profiles used in prayer cards
  // profilesById[userId] = { display_name, avatar_url }
  const [profilesById, setProfilesById] = useState({});

  // ---- Toast + “light travel” animation ----
  const [toastText, setToastText] = useState("");
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastScale = useRef(new Animated.Value(0.98)).current;

  const flyOpacity = useRef(new Animated.Value(0)).current;
  const flyScale = useRef(new Animated.Value(0.9)).current;
  const flyX = useRef(new Animated.Value(0)).current;
  const flyY = useRef(new Animated.Value(0)).current;

  const pointsAnchorRef = useRef(null);
  const [pointsAnchor, setPointsAnchor] = useState(null);

  // ✅ Light Points pill pulse when orb lands
  const pillPulse = useRef(new Animated.Value(1)).current;
  const pillGlow = useRef(new Animated.Value(0)).current;

  function pulsePointsPill() {
    pillPulse.stopAnimation();
    pillGlow.stopAnimation();
    pillPulse.setValue(1);
    pillGlow.setValue(0);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(pillPulse, { toValue: 1.08, duration: 140, useNativeDriver: true }),
        Animated.timing(pillPulse, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(pillGlow, { toValue: 1, duration: 140, useNativeDriver: true }),
        Animated.timing(pillGlow, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]),
    ]).start();
  }

  function showToast(text) {
    setToastText(text);

    toastOpacity.stopAnimation();
    toastScale.stopAnimation();
    toastOpacity.setValue(0);
    toastScale.setValue(0.98);

    Animated.parallel([
      Animated.timing(toastOpacity, { toValue: 1, duration: 140, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(toastScale, { toValue: 1.02, duration: 140, useNativeDriver: true }),
        Animated.timing(toastScale, { toValue: 1, duration: 140, useNativeDriver: true }),
      ]),
    ]).start(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 220, delay: 900, useNativeDriver: true }).start();
    });
  }

  function animateLightToPoints() {
    const { width, height } = Dimensions.get("window");
    const startX = width / 2 - 14;
    const startY = height * 0.42;

    const targetX = pointsAnchor?.x ?? width - 40;
    const targetY = pointsAnchor?.y ?? 42;

    flyOpacity.stopAnimation();
    flyScale.stopAnimation();
    flyX.stopAnimation();
    flyY.stopAnimation();

    flyOpacity.setValue(0);
    flyScale.setValue(0.9);
    flyX.setValue(startX);
    flyY.setValue(startY);

    Animated.parallel([
      Animated.timing(flyOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(flyScale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(flyX, { toValue: targetX - 14, duration: 520, useNativeDriver: true }),
        Animated.timing(flyY, { toValue: targetY - 10, duration: 520, useNativeDriver: true }),
        Animated.timing(flyScale, { toValue: 0.75, duration: 520, useNativeDriver: true }),
      ]).start(() => {
        pulsePointsPill();

        Animated.timing(flyOpacity, { toValue: 0, duration: 140, useNativeDriver: true }).start();
      });
    });
  }

  // Group creation modal state
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [myGroups, setMyGroups] = useState([]);

  // Faith Coach modal state
  const [faithCoachVisible, setFaithCoachVisible] = useState(false);
  const [faithCoachLoading, setFaithCoachLoading] = useState(false);
  const [faithCoachText, setFaithCoachText] = useState("");
  const [faithCoachRequest, setFaithCoachRequest] = useState(null);

  // Encouragement state
  const [repliesByPrayerId, setRepliesByPrayerId] = useState({});
  const [expandedPrayerIds, setExpandedPrayerIds] = useState({});
  const [encourageVisible, setEncourageVisible] = useState(false);
  const [encourageLoading, setEncourageLoading] = useState(false);
  const [encourageTargetPrayer, setEncourageTargetPrayer] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.log("Error getting session", sessionError);
        } else {
          const userId = data?.session?.user?.id ?? null;
          setCurrentUserId(userId);

          if (userId) {
            await fetchMyGroups();
            await fetchBookmarks(userId);
          } else {
            setBookmarkedById({});
            setBookmarksLoaded(true);
          }
        }
      } catch (e) {
        console.log("Unexpected error getting session", e);
      }

      fetchRequests(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      pointsAnchorRef.current?.measureInWindow?.((x, y, w, h) => {
        setPointsAnchor({ x: x + w / 2, y: y + h / 2 });
      });
    }, 250);

    return () => clearTimeout(t);
  }, [activeFilter, loading]);

  async function fetchMyGroups() {
    try {
      const { data, error } = await supabase
        .from("prayer_groups")
        .select("id, name")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMyGroups(data || []);
    } catch (e) {
      console.log("Error loading prayer groups", e);
      setMyGroups([]);
    }
  }

  async function fetchBookmarks(userId) {
    try {
      setBookmarksLoaded(false);

      const { data, error } = await supabase
        .from("prayer_bookmarks")
        .select("prayer_id")
        .eq("user_id", userId);

      if (error) throw error;

      const map = {};
      (data || []).forEach((row) => {
        if (row?.prayer_id) map[row.prayer_id] = true;
      });

      setBookmarkedById(map);
    } catch (e) {
      console.log("Error loading prayer bookmarks", e);
      setBookmarkedById({});
    } finally {
      setBookmarksLoaded(true);
    }
  }

  // ✅ fetch profiles for visible (non-anonymous) requests
  async function fetchProfilesForRequests(requestRows) {
    try {
      const ids = Array.from(
        new Set(
          (requestRows || [])
            .filter((r) => !!r?.user_id && !r?.is_anonymous)
            .map((r) => r.user_id)
        )
      );

      if (ids.length === 0) return;

      const missing = ids.filter((id) => !profilesById[id]);
      if (missing.length === 0) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", missing);

      if (error) {
        console.log("Error loading profiles for prayers", error);
        return;
      }

      const patch = {};
      (data || []).forEach((p) => {
        if (p?.id) {
          patch[p.id] = {
            display_name: p.display_name || null,
            avatar_url: p.avatar_url || null,
          };
        }
      });

      setProfilesById((prev) => ({ ...prev, ...patch }));
    } catch (e) {
      console.log("Unexpected error loading profiles for prayers", e);
    }
  }

  async function fetchRequests(isRefresh = false) {
    if (!GLOBAL_COMMUNITY_ID) return;

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      const { data, error: err } = await supabase
        .from("prayer_requests")
        .select("id, title, body, is_anonymous, prayed_count, created_at, user_id, visibility, group_id")
        .eq("community_id", GLOBAL_COMMUNITY_ID)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(PAGE_LIMIT);

      if (err) throw err;

      const rows = data || [];
      setRequests(rows);

      // Best-effort: fetch display_name + avatar_url for these rows
      fetchProfilesForRequests(rows);
    } catch (e) {
      console.log("Error loading prayer requests", e);
      setError("Could not load prayer requests right now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function refreshAll() {
    await fetchRequests(true);
    if (currentUserId) {
      await fetchBookmarks(currentUserId);
    }
  }

  async function ensureUserIdOrAlert() {
    let userId = currentUserId;

    if (!userId) {
      const { data: sessionData } = await supabase.auth.getSession();
      userId = sessionData?.session?.user?.id ?? null;
      if (userId) setCurrentUserId(userId);
    }

    if (!userId) {
      Alert.alert("Not signed in", "Please sign in again to use this feature.");
      return null;
    }

    return userId;
  }

  async function toggleBookmark(prayerId) {
    const userId = await ensureUserIdOrAlert();
    if (!userId) return;

    const wasSaved = !!bookmarkedById[prayerId];

    setBookmarkedById((prev) => {
      const next = { ...prev };
      if (wasSaved) delete next[prayerId];
      else next[prayerId] = true;
      return next;
    });

    showToast(wasSaved ? "Removed from Saved" : "Saved");

    try {
      if (wasSaved) {
        const { error } = await supabase
          .from("prayer_bookmarks")
          .delete()
          .eq("user_id", userId)
          .eq("prayer_id", prayerId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("prayer_bookmarks").insert({
          user_id: userId,
          prayer_id: prayerId,
        });

        if (error) throw error;
      }
    } catch (e) {
      console.log("Error toggling bookmark", e);

      setBookmarkedById((prev) => {
        const next = { ...prev };
        if (wasSaved) next[prayerId] = true;
        else delete next[prayerId];
        return next;
      });

      Alert.alert("Could not save", "We couldn’t update your saved prayers right now. Please try again.");
    }
  }

  async function handlePrayedForPrayer(prayerId) {
    if (prayedThisSessionById[prayerId]) {
      showToast("Already prayed (this session)");
      return;
    }

    const res = awardPrayerPoint?.();

    if (res && !res.granted && !DISABLE_DAILY_PRAYER_CAP_FOR_TESTING) {
      showToast("Daily cap reached");
      return;
    }

    setPrayedThisSessionById((prev) => ({ ...prev, [prayerId]: true }));

    const toastLine = res?.granted
      ? `I prayed · +1 Light Point (${res.remaining ?? 4} left)`
      : "I prayed · +1 Light Point (cap disabled)";

    showToast(toastLine);
    animateLightToPoints();

    setRequests((prev) => prev.map((r) => (r.id === prayerId ? { ...r, prayed_count: (r.prayed_count || 0) + 1 } : r)));

    try {
      const { data, error } = await supabase.rpc("increment_prayed_count", { prayer_id: prayerId });

      if (error) throw error;

      if (typeof data === "number") {
        setRequests((prev) => prev.map((r) => (r.id === prayerId ? { ...r, prayed_count: data } : r)));
      }
    } catch (e) {
      console.log("Error incrementing prayed_count", e);
    }
  }

  async function handleCreateRequest(title, body, isAnonymous, visibility, groupId) {
    if (!title) {
      Alert.alert("Title required", "Please add a short title to your request.");
      return;
    }

    try {
      setPosting(true);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        Alert.alert("Not signed in", "Please sign in again before posting a prayer request.");
        return;
      }

      const finalVisibility = visibility || "global";

      const { data, error } = await supabase
        .from("prayer_requests")
        .insert({
          user_id: userId,
          community_id: GLOBAL_COMMUNITY_ID,
          title,
          body: body || null,
          is_anonymous: isAnonymous,
          visibility: finalVisibility,
          group_id: groupId || null,
        })
        .select("id, title, body, is_anonymous, prayed_count, created_at, user_id, visibility, group_id")
        .single();

      if (error) throw error;

      if (!currentUserId) setCurrentUserId(userId);

      setRequests((prev) => [data, ...prev]);
      setShowNewModal(false);

      // Add profile to cache immediately if needed (non-anonymous)
      if (!data.is_anonymous) fetchProfilesForRequests([data]);
    } catch (e) {
      console.log("Error creating prayer request", e);
      const msg =
        e?.message ||
        e?.error_description ||
        (typeof e === "string" ? e : "We couldn’t post your prayer request right now. Please try again.");
      Alert.alert("Could not post", msg);
    } finally {
      setPosting(false);
    }
  }

  async function handleCreateGroup(name, description, privacy, groupType) {
    if (!name) {
      Alert.alert("Group name required", "Please add a group name.");
      return;
    }

    try {
      setCreatingGroup(true);

      let userId = currentUserId;
      if (!userId) {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        userId = sessionData?.session?.user?.id;
      }

      if (!userId) {
        Alert.alert("Not signed in", "Please sign in again before creating a prayer group.");
        return;
      }

      const { data: group, error: groupError } = await supabase
        .from("prayer_groups")
        .insert({
          creator_id: userId,
          name,
          description,
          privacy,
          group_type: groupType,
        })
        .select("id, name")
        .single();

      if (groupError) throw groupError;

      const { error: memberError } = await supabase.from("prayer_group_members").insert({
        group_id: group.id,
        user_id: userId,
        role: "admin",
      });

      if (memberError) throw memberError;

      setMyGroups((prev) => [group, ...prev]);
      setShowGroupModal(false);

      Alert.alert("Prayer group created", "Your new prayer group is ready. You can now post requests directly to this group.");
    } catch (e) {
      console.log("Error creating prayer group", e);
      const msg =
        e?.message ||
        e?.error_description ||
        (typeof e === "string" ? e : "We couldn’t create that group right now. Please try again.");
      Alert.alert("Could not create group", msg);
    } finally {
      setCreatingGroup(false);
    }
  }

  async function fetchRepliesForPrayer(prayerId) {
    try {
      const { data, error } = await supabase
        .from("prayer_replies")
        .select("id, prayer_id, user_id, message, created_at")
        .eq("prayer_id", prayerId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setRepliesByPrayerId((prev) => ({
        ...prev,
        [prayerId]: data || [],
      }));
    } catch (e) {
      console.log("Error loading prayer replies", e);
      Alert.alert("Could not load replies", "Please try again in a moment.");
    }
  }

  async function toggleReplies(prayerId) {
    const isCurrentlyExpanded = !!expandedPrayerIds[prayerId];

    if (!isCurrentlyExpanded && !repliesByPrayerId[prayerId]) {
      await fetchRepliesForPrayer(prayerId);
    }

    setExpandedPrayerIds((prev) => ({
      ...prev,
      [prayerId]: !isCurrentlyExpanded,
    }));
  }

  function openEncourage(prayer) {
    setEncourageTargetPrayer(prayer);
    setEncourageVisible(true);
  }

  async function handleSubmitEncouragement(message) {
    if (!message || !message.trim()) {
      Alert.alert("Message required", "Please write an encouragement message.");
      return;
    }

    if (!encourageTargetPrayer) {
      Alert.alert("No prayer selected", "Please try again.");
      return;
    }

    try {
      setEncourageLoading(true);

      let userId = currentUserId;
      if (!userId) {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        userId = sessionData?.session?.user?.id;
        if (userId && !currentUserId) setCurrentUserId(userId);
      }

      if (!userId) {
        Alert.alert("Not signed in", "Please sign in again before sending encouragement.");
        return;
      }

      const { data, error } = await supabase
        .from("prayer_replies")
        .insert({
          prayer_id: encourageTargetPrayer.id,
          user_id: userId,
          message: message.trim(),
        })
        .select("id, prayer_id, user_id, message, created_at")
        .single();

      if (error) throw error;

      setRepliesByPrayerId((prev) => {
        const existing = prev[encourageTargetPrayer.id] || [];
        return {
          ...prev,
          [encourageTargetPrayer.id]: [...existing, data],
        };
      });

      setExpandedPrayerIds((prev) => ({
        ...prev,
        [encourageTargetPrayer.id]: true,
      }));

      setEncourageVisible(false);
      setEncourageTargetPrayer(null);
    } catch (e) {
      console.log("Error sending encouragement", e);
      const msg =
        e?.message ||
        e?.error_description ||
        (typeof e === "string" ? e : "We couldn’t send that encouragement right now. Please try again.");
      Alert.alert("Could not send encouragement", msg);
    } finally {
      setEncourageLoading(false);
    }
  }

  async function handleAskFaithCoach(item) {
    setFaithCoachRequest(item);
    setFaithCoachVisible(true);
    setFaithCoachLoading(true);
    setFaithCoachText("");

    try {
      const title = item?.title || "";
      const body = item?.body || "";

      const { data, error } = await supabase.functions.invoke("faith-coach", {
        body: {
          title,
          body,
          viewer_is_owner: !!currentUserId && item?.user_id === currentUserId,
        },
      });

      if (error) {
        console.log("Faith Coach invoke error", error);
        setFaithCoachText("Sorry, Faith Coach could not load a response right now. Please try again in a moment.");
        return;
      }

      setFaithCoachText(data?.text || "Faith Coach did not return any text.");
    } catch (e) {
      console.log("Faith Coach invoke exception", e);
      setFaithCoachText("Sorry, something went wrong while talking to Faith Coach. Please try again soon.");
    } finally {
      setFaithCoachLoading(false);
    }
  }

  const filteredRequests = useMemo(() => {
    if (activeFilter === "mine" && currentUserId) {
      return requests.filter((r) => r.user_id === currentUserId);
    }

    if (activeFilter === "saved") {
      if (!currentUserId) return [];
      return requests.filter((r) => !!bookmarkedById[r.id]);
    }

    if (activeFilter === "prayed") {
      return requests.filter((r) => !!prayedThisSessionById[r.id]);
    }

    return requests.filter((r) => !prayedThisSessionById[r.id]);
  }, [activeFilter, requests, currentUserId, bookmarkedById, prayedThisSessionById]);

  const totalPrayed = requests.reduce((sum, r) => sum + (r.prayed_count || 0), 0);

  const emptyMessage = useMemo(() => {
    if (activeFilter === "saved" && currentUserId && bookmarksLoaded) {
      return "No saved prayers yet. Swipe to save a prayer.";
    }
    if (activeFilter === "saved" && !currentUserId) {
      return "Please sign in to view your saved prayers.";
    }
    if (activeFilter === "prayed") {
      return "Nothing in Prayed yet. Swipe to mark a prayer as prayed.";
    }
    return "No prayer requests yet. Be the first to share one.";
  }, [activeFilter, currentUserId, bookmarksLoaded]);

  function getPosterMeta(item) {
    if (item?.is_anonymous) {
      return { name: "Someone on Triunely", avatarUrl: null, initials: "" };
    }

    const prof = profilesById[item?.user_id];
    const displayName = prof?.display_name || "Triunely Member";
    const avatarUrl = prof?.avatar_url || null;
    return { name: displayName, avatarUrl, initials: initialsFromName(displayName) };
  }

  function PosterAvatar({ item }) {
    const meta = getPosterMeta(item);

    if (item?.is_anonymous) {
      return (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            backgroundColor: theme.colors.sageTint,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="person-outline" size={18} color={theme.colors.sage} />
        </View>
      );
    }

    if (meta.avatarUrl) {
      return <Image source={{ uri: meta.avatarUrl }} style={{ width: 36, height: 36, borderRadius: 999 }} />;
    }

    return (
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          backgroundColor: theme.colors.sageTint,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: theme.colors.sage, fontWeight: "900" }}>{meta.initials || "T"}</Text>
      </View>
    );
  }

  const swipeHint = useMemo(() => {
    const prayedDir = SWIPE_DIRECTION_MODE === "INVERTED" ? "Swipe left" : "Swipe right";
    const saveDir = SWIPE_DIRECTION_MODE === "INVERTED" ? "Swipe right" : "Swipe left";
    return `${prayedDir} = I prayed  •  ${saveDir} = Save`;
  }, []);

  const renderItem = ({ item }) => {
    const createdLabel = formatDateTime(item.created_at);

    let visibilityLabel = "";
    if (item.visibility === "group" && item.group_id) visibilityLabel = "Group request";
    else if (item.visibility === "private") visibilityLabel = "Private";
    else visibilityLabel = "Global";

    const replies = repliesByPrayerId[item.id] || [];
    const isExpanded = !!expandedPrayerIds[item.id];
    const isSaved = !!bookmarkedById[item.id];
    const alreadyPrayedThisSession = !!prayedThisSessionById[item.id];

    const poster = getPosterMeta(item);

    const closeSwipe = () => {
      swipeRefs.current?.[item.id]?.close?.();
    };

    const renderLeftActions = () => (
      <View style={{ justifyContent: "center", marginBottom: 10, marginRight: 10 }}>
        <View
          style={{
            backgroundColor: alreadyPrayedThisSession ? theme.colors.divider : theme.colors.gold,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            minWidth: 110,
            borderWidth: 1,
            borderColor: alreadyPrayedThisSession ? theme.colors.divider : theme.colors.goldOutline,
          }}
        >
          <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 13 }}>
            {alreadyPrayedThisSession ? "Prayed" : "I prayed"}
          </Text>
        </View>
      </View>
    );

    const renderRightActions = () => (
      <View style={{ justifyContent: "center", marginBottom: 10, marginLeft: 10, alignItems: "flex-end" }}>
        <View
          style={{
            backgroundColor: theme.colors.surface,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            minWidth: 110,
            borderWidth: 1,
            borderColor: isSaved ? theme.colors.gold : theme.colors.goldOutline,
          }}
        >
          <Text style={{ color: isSaved ? theme.colors.goldPressed : theme.colors.text2, fontWeight: "900", fontSize: 13 }}>
            {isSaved ? "Saved" : "Save"}
          </Text>
        </View>
      </View>
    );

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) swipeRefs.current[item.id] = ref;
        }}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        overshootLeft={false}
        overshootRight={false}
        onSwipeableOpen={(direction) => {
          closeSwipe();

          setTimeout(() => {
            if (SWIPE_DIRECTION_MODE === "INVERTED") {
              if (direction === "left") handlePrayedForPrayer(item.id);
              else if (direction === "right") toggleBookmark(item.id);
            } else {
              if (direction === "right") handlePrayedForPrayer(item.id);
              else if (direction === "left") toggleBookmark(item.id);
            }
          }, 0);
        }}
      >
        {/* Edge-to-edge + only top/bottom border (Triunely style) */}
        <View
          style={{
            marginHorizontal: -16,
            marginBottom: 14,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: theme.colors.goldOutline,
            backgroundColor: theme.colors.surface,
          }}
        >
          <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
            {/* Meta bar */}
            <View
              style={{
                backgroundColor: theme.colors.sageTint,
                borderRadius: 14,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <PosterAvatar item={item} />

                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                    {item.is_anonymous ? "Someone on Triunely" : poster.name}
                  </Text>
                  <Text style={{ color: theme.colors.sageSoft, fontSize: 12, fontWeight: "800", marginTop: 2 }}>
                    {visibilityLabel}
                  </Text>
                </View>

                {createdLabel ? (
                  <Text style={{ color: theme.colors.muted, fontSize: 11, fontWeight: "700" }}>
                    {createdLabel}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Title + body */}
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
              {item.title}
            </Text>

            {item.body ? (
              <Text style={{ color: theme.colors.text2, marginTop: 8, fontSize: 14, lineHeight: 20 }}>
                {item.body}
              </Text>
            ) : null}

            {/* Primary action row */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
              <Text style={{ color: theme.colors.goldPressed, fontSize: 13, fontWeight: "800" }}>
                {item.prayed_count || 0} prayed
              </Text>

              <Pressable
                onPress={() => handlePrayedForPrayer(item.id)}
                style={{
                  backgroundColor: alreadyPrayedThisSession ? theme.colors.divider : theme.colors.gold,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: alreadyPrayedThisSession ? theme.colors.divider : theme.colors.goldOutline,
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 13 }}>
                  {alreadyPrayedThisSession ? "Prayed" : "I prayed"}
                </Text>
              </Pressable>
            </View>

            {/* Divider for clarity */}
            <View
              style={{
                height: 1,
                backgroundColor: theme.colors.divider,
                marginTop: 12,
                marginBottom: 10,
              }}
            />

            {/* Secondary actions */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Pressable
                onPress={() => openEncourage(item)}
                style={{ flexDirection: "row", alignItems: "center", marginRight: 16 }}
              >
                <Ionicons name="heart-outline" size={18} color={theme.colors.text2} />
                <Text style={{ color: theme.colors.text2, fontSize: 12, fontWeight: "800", marginLeft: 6 }}>
                  Encourage
                </Text>
              </Pressable>

              <Pressable onPress={() => handleAskFaithCoach(item)} style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="sparkles-outline" size={18} color={theme.colors.goldPressed} />
                <Text style={{ color: theme.colors.goldPressed, fontSize: 12, fontWeight: "900", marginLeft: 6 }}>
                  Ask Faith Coach
                </Text>
              </Pressable>

              <View style={{ flex: 1 }} />

              <Pressable onPress={() => toggleBookmark(item.id)} style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name={isSaved ? "bookmark" : "bookmark-outline"}
                  size={18}
                  color={isSaved ? theme.colors.goldPressed : theme.colors.text2}
                />
              </Pressable>
            </View>

            {/* Replies */}
            <View style={{ marginTop: 10 }}>
              <Pressable onPress={() => toggleReplies(item.id)}>
                <Text style={{ color: theme.colors.text2, fontSize: 12, fontWeight: "800" }}>
                  {isExpanded ? "Hide replies" : replies.length > 0 ? `View replies (${replies.length})` : "View replies"}
                </Text>
              </Pressable>

              {isExpanded && (
                <View
                  style={{
                    marginTop: 10,
                    padding: 12,
                    borderRadius: 14,
                    backgroundColor: theme.colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: theme.colors.goldOutline,
                  }}
                >
                  {replies.length > 0 ? (
                    <View>
                      {replies.map((reply) => {
                        const isMine = reply.user_id === currentUserId;
                        const whoReply = isMine ? "You" : "Someone on Triunely";
                        const replyCreated = formatDateTime(reply.created_at);

                        return (
                          <View
                            key={reply.id}
                            style={{
                              paddingBottom: 10,
                              marginBottom: 10,
                              borderBottomWidth: 1,
                              borderBottomColor: theme.colors.divider,
                            }}
                          >
                            <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: "900" }}>
                              {whoReply}
                              {replyCreated ? ` · ${replyCreated}` : ""}
                            </Text>
                            <Text style={{ color: theme.colors.text2, fontSize: 12, marginTop: 4, lineHeight: 18 }}>
                              {reply.message}
                            </Text>
                          </View>
                        );
                      })}
                      {/* remove last divider feel */}
                      <View style={{ marginTop: -10 }} />
                    </View>
                  ) : (
                    <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                      No replies yet. Be the first to encourage.
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      </Swipeable>
    );
  };

  return (
    <Screen padded>
      {({ bottomPad }) => (
        <>
          {/* Glow toast */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "42%",
              alignItems: "center",
              opacity: toastOpacity,
              transform: [{ scale: toastScale }],
              zIndex: 999,
            }}
          >
            <View
              style={{
                backgroundColor: theme.colors.goldGlow,
                padding: 18,
                borderRadius: 999,
                marginBottom: -28,
              }}
            />
            <View
              style={{
                backgroundColor: "rgba(11,18,32,0.92)",
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 14,
                maxWidth: "85%",
                borderWidth: 1,
                borderColor: theme.colors.goldOutline,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900", textAlign: "center" }}>{toastText}</Text>
            </View>
          </Animated.View>

          {/* Flying +1 orb */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              width: 28,
              height: 28,
              borderRadius: 999,
              backgroundColor: theme.colors.gold,
              alignItems: "center",
              justifyContent: "center",
              opacity: flyOpacity,
              transform: [{ translateX: flyX }, { translateY: flyY }, { scale: flyScale }],
              zIndex: 998,
              borderWidth: 1,
              borderColor: theme.colors.goldOutline,
            }}
          >
            <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 12 }}>+1</Text>
          </Animated.View>

          {/* Header */}
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[theme.text.h1, { fontSize: 22 }]}>Prayer</Text>
                <Text style={[theme.text.sub, { marginTop: 2 }]}>Ask for prayer and pray for others.</Text>
              </View>

              {/* Light Points pill + glow overlay */}
              <Animated.View
                ref={pointsAnchorRef}
                onLayout={() => {
                  pointsAnchorRef.current?.measureInWindow?.((x, y, w, h) => {
                    setPointsAnchor({ x: x + w / 2, y: y + h / 2 });
                  });
                }}
                style={{ transform: [{ scale: pillPulse }] }}
              >
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: -10,
                    right: -10,
                    top: -10,
                    bottom: -10,
                    borderRadius: 999,
                    backgroundColor: theme.colors.goldGlow,
                    opacity: pillGlow,
                  }}
                />
                <View
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: theme.colors.goldOutline,
                    shadowColor: theme.colors.gold,
                    shadowOpacity: 0.18,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 3,
                    alignItems: "flex-end",
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: "900" }}>
                    Light Points (Month)
                  </Text>
                  <Text style={{ color: theme.colors.goldPressed, fontSize: 14, fontWeight: "900", marginTop: 2 }}>
                    {monthLP}
                  </Text>
                </View>
              </Animated.View>
            </View>

            {/* Summary + swipe hint */}
            <View style={{ marginTop: 10 }}>
              <GlowCard innerStyle={{ paddingVertical: 10, paddingHorizontal: 14 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: theme.colors.text2, fontSize: 12, fontWeight: "700" }}>
                    Open requests: {requests.length}
                  </Text>
                  <Text style={{ color: theme.colors.text2, fontSize: 12, fontWeight: "700" }}>
                    Total prayed: {totalPrayed}
                  </Text>
                </View>

                <Text style={{ color: theme.colors.muted, marginTop: 6, fontSize: 12 }}>
                  {swipeHint}
                </Text>
              </GlowCard>
            </View>
          </View>

          {/* Filters */}
          <View style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {FILTERS.map((f) => {
                const isActive = activeFilter === f.id;
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => setActiveFilter(f.id)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 999,
                      marginRight: 8,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: isActive ? theme.colors.gold : theme.colors.goldOutline,
                      backgroundColor: isActive ? theme.colors.goldHalo : theme.colors.surface,
                      shadowColor: theme.colors.gold,
                      shadowOpacity: 0.10,
                      shadowRadius: 10,
                      shadowOffset: { width: 0, height: 4 },
                      elevation: 2,
                    }}
                  >
                    <Text
                      style={{
                        color: isActive ? theme.colors.text : theme.colors.text2,
                        fontSize: 12,
                        fontWeight: isActive ? "900" : "700",
                      }}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Actions */}
          <View style={{ flexDirection: "row", marginBottom: 12 }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <GlowButton
                title={posting ? "Posting…" : "+ New request"}
                onPress={() => setShowNewModal(true)}
                disabled={posting}
                variant="primary"
              />
            </View>

            <View style={{ flex: 1 }}>
              <GlowButton
                title={creatingGroup ? "Creating…" : "+ Create group"}
                onPress={() => setShowGroupModal(true)}
                disabled={creatingGroup}
                variant="outline"
              />
            </View>
          </View>

          {/* Section divider to separate controls from feed */}
          <View
            style={{
              marginHorizontal: -16,
              borderTopWidth: 1,
              borderColor: theme.colors.goldOutline,
              marginBottom: 10,
            }}
          />

          {loading ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator size="large" color={theme.colors.gold} />
              <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Loading prayer requests…</Text>
            </View>
          ) : (
            <>
              {error && (
                <GlowCard innerStyle={{ padding: 12, marginBottom: 10 }}>
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Couldn’t load prayers</Text>
                  <Text style={{ color: theme.colors.danger, marginTop: 6 }}>{error}</Text>
                </GlowCard>
              )}

              <FlatList
                data={filteredRequests}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                onRefresh={refreshAll}
                refreshing={refreshing}
                contentContainerStyle={{ paddingBottom: (bottomPad || 0) + 16 }}
                ListEmptyComponent={
                  <GlowCard innerStyle={{ padding: 14, marginTop: 6 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Nothing here yet</Text>
                    <Text style={{ color: theme.colors.text2, marginTop: 6, lineHeight: 20 }}>
                      {emptyMessage}
                    </Text>
                  </GlowCard>
                }
              />
            </>
          )}

          <NewPrayerModal
            visible={showNewModal}
            onClose={() => {
              if (!posting) setShowNewModal(false);
            }}
            onSubmit={handleCreateRequest}
            loading={posting}
            groups={myGroups}
          />

          <NewPrayerGroupModal
            visible={showGroupModal}
            onClose={() => {
              if (!creatingGroup) setShowGroupModal(false);
            }}
            onSubmit={handleCreateGroup}
            loading={creatingGroup}
          />

          <FaithCoachModal
            visible={faithCoachVisible}
            onClose={() => setFaithCoachVisible(false)}
            loading={faithCoachLoading}
            request={faithCoachRequest}
            text={faithCoachText}
          />

          <EncourageModal
            visible={encourageVisible}
            onClose={() => {
              if (!encourageLoading) {
                setEncourageVisible(false);
                setEncourageTargetPrayer(null);
              }
            }}
            loading={encourageLoading}
            onSubmit={handleSubmitEncouragement}
            prayer={encourageTargetPrayer}
          />
        </>
      )}
    </Screen>
  );
}
