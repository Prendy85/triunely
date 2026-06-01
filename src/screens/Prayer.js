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
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import EncourageModal from "../components/EncourageModal";
import FaithCoachModal from "../components/FaithCoachModal";
import NewPrayerGroupModal from "../components/NewPrayerGroupModal";
import NewPrayerModal from "../components/NewPrayerModal";
import Screen from "../components/Screen";
import { usePoints } from "../context/PointsContext";
import { supabase } from "../lib/supabase";
import PrayerGroupDetailScreen from "./PrayerGroupDetailScreen";

const GLOBAL_COMMUNITY_ID = "bb6353e4-8517-4c3e-b360-3cf5adbe9bb3";
const PAGE_LIMIT = 50;

// --- Premium Triunely Prayer visual system ---
const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";

const CARD_BORDER = "rgba(15, 23, 42, 0.08)";
const AMBER_SOFT = "rgba(180, 83, 9, 0.10)";
const AMBER_BORDER = "rgba(180, 83, 9, 0.18)";
const OLIVE_SOFT = "rgba(79, 99, 59, 0.10)";
const OLIVE_BORDER = "rgba(79, 99, 59, 0.18)";
const SHADOW = "rgba(15, 23, 42, 0.10)";
const DANGER = "#B42318";
const DANGER_BORDER = "rgba(180, 35, 24, 0.18)";

const displayFont = Platform.OS === "ios" ? "Georgia" : "serif";

const serifHeading = {
  fontFamily: displayFont,
  color: TEXT,
  fontWeight: "900",
  letterSpacing: -0.45,
};

// TEMP: disable prayer daily cap while testing swipe + animations
const DISABLE_DAILY_PRAYER_CAP_FOR_TESTING = true;

// Swipe direction toggle.
// If swipe is back-to-front, flip this once.
const SWIPE_DIRECTION_MODE = "INVERTED"; // "INVERTED" | "NORMAL"

const FILTERS = [
  {
    id: "all",
    label: "Open",
    icon: "flame-outline",
    helper: "Pray now",
  },
  {
    id: "mine",
    label: "Mine",
    icon: "person-outline",
    helper: "Your requests",
  },
  {
    id: "saved",
    label: "Saved",
    icon: "bookmark-outline",
    helper: "Return later",
  },
  {
    id: "prayed",
    label: "Prayed",
    icon: "checkmark-circle-outline",
    helper: "Today",
  },
];

function firstNameOnly(s) {
  return (s || "").trim().split(/\s+/)[0] || "";
}

function initialsFromName(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

  return (
    parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)
  ).toUpperCase();
}

function formatDateTime(ts) {
  if (!ts) return "";

  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}

function prettyPrivacy(value) {
  if (value === "request") return "By request";
  if (value === "private") return "Private";
  return "Public";
}

function prettyGroupType(value) {
  if (value === "church") return "Church";
  if (value === "family") return "Family";
  if (value === "friends") return "Friends";
  if (value === "youth") return "Youth";
  if (value === "ministry") return "Ministry";
  return "Other";
}

function groupTypeIcon(value) {
  if (value === "church") return "business-outline";
  if (value === "family") return "home-outline";
  if (value === "friends") return "people-outline";
  if (value === "youth") return "happy-outline";
  if (value === "ministry") return "heart-outline";
  return "ellipse-outline";
}

function PrayerGroupsFullScreen({
  visible,
  groups,
  loading,
  onClose,
  onCreateGroup,
  onRefresh,
  onOpenGroup,
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView
        edges={["top"]}
        style={{ flex: 1, backgroundColor: PREMIUM_CREAM }}
      >
        <View style={{ flex: 1, backgroundColor: PREMIUM_CREAM }}>
          {/* Header */}
          <View
            style={{
              paddingHorizontal: 18,
              paddingTop: 8,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: CARD_BORDER,
              backgroundColor: PREMIUM_CREAM,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                style={({ pressed }) => ({
                  width: 42,
                  height: 42,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <Ionicons name="close" size={22} color={TEXT} />
              </Pressable>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={[
                    serifHeading,
                    {
                      fontSize: 26,
                      lineHeight: 30,
                    },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  Prayer Groups
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    marginTop: 1,
                    fontSize: 12.5,
                    lineHeight: 17,
                    fontWeight: "700",
                  }}
                  numberOfLines={2}
                >
                  Shared spaces for church, family, friends, and ministry prayer.
                </Text>
              </View>

              <Pressable
                onPress={onRefresh}
                hitSlop={10}
                style={({ pressed }) => ({
                  width: 42,
                  height: 42,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed ? AMBER_SOFT : SURFACE,
                  borderWidth: 1,
                  borderColor: AMBER_BORDER,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <Ionicons name="refresh" size={18} color={EVENT_AMBER} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 18,
              paddingTop: 16,
              paddingBottom: Math.max(insets.bottom + 24, 40),
            }}
          >
            <View
              style={{
                backgroundColor: SURFACE,
                borderRadius: 28,
                borderWidth: 1,
                borderColor: AMBER_BORDER,
                padding: 16,
                marginBottom: 14,
                shadowColor: SHADOW,
                shadowOpacity: 0.08,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 6 },
                elevation: 3,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: AMBER_SOFT,
                    borderWidth: 1,
                    borderColor: AMBER_BORDER,
                    marginRight: 12,
                  }}
                >
                  <Ionicons
                    name="people-outline"
                    size={24}
                    color={EVENT_AMBER}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: TEXT,
                      fontSize: 17,
                      fontWeight: "900",
                    }}
                  >
                    My prayer groups
                  </Text>

                  <Text
                    style={{
                      color: MUTED,
                      marginTop: 3,
                      fontSize: 12.5,
                      lineHeight: 18,
                      fontWeight: "700",
                    }}
                  >
                    Groups you create will appear here so you can return to them
                    later.
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={onCreateGroup}
                style={({ pressed }) => ({
                  marginTop: 15,
                  paddingVertical: 13,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: EVENT_AMBER,
                  borderWidth: 1,
                  borderColor: AMBER_BORDER,
                  shadowColor: EVENT_AMBER,
                  shadowOpacity: 0.17,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 5 },
                  elevation: 3,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 14,
                    fontWeight: "900",
                  }}
                >
                  + Create new group
                </Text>
              </Pressable>
            </View>

            {loading ? (
              <View
                style={{
                  padding: 20,
                  borderRadius: 24,
                  backgroundColor: SURFACE,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  alignItems: "center",
                }}
              >
                <ActivityIndicator color={EVENT_AMBER} />

                <Text
                  style={{
                    color: MUTED,
                    marginTop: 10,
                    fontWeight: "700",
                  }}
                >
                  Loading prayer groups…
                </Text>
              </View>
            ) : groups.length === 0 ? (
              <View
                style={{
                  padding: 20,
                  borderRadius: 26,
                  backgroundColor: SURFACE,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  alignItems: "center",
                  shadowColor: SHADOW,
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 5 },
                  elevation: 2,
                }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: OLIVE_SOFT,
                    borderWidth: 1,
                    borderColor: OLIVE_BORDER,
                    marginBottom: 13,
                  }}
                >
                  <Ionicons name="people-outline" size={27} color={OLIVE} />
                </View>

                <Text
                  style={{
                    color: TEXT,
                    fontSize: 17,
                    fontWeight: "900",
                    textAlign: "center",
                  }}
                >
                  No prayer groups yet
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    marginTop: 7,
                    fontSize: 13,
                    lineHeight: 19,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  Create a group for your church, family, friends, youth group,
                  or ministry team.
                </Text>
              </View>
            ) : (
              groups.map((group) => {
                const icon = groupTypeIcon(group.group_type);

                return (
                  <Pressable
                    key={group.id}
                    onPress={() => onOpenGroup?.(group)}
                    style={({ pressed }) => ({
                      marginBottom: 12,
                      padding: 15,
                      borderRadius: 26,
                      backgroundColor: SURFACE,
                      borderWidth: 1,
                      borderColor: CARD_BORDER,
                      shadowColor: SHADOW,
                      shadowOpacity: 0.06,
                      shadowRadius: 12,
                      shadowOffset: { width: 0, height: 5 },
                      elevation: 2,
                      transform: [{ scale: pressed ? 0.985 : 1 }],
                    })}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 999,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: AMBER_SOFT,
                          borderWidth: 1,
                          borderColor: AMBER_BORDER,
                          marginRight: 12,
                        }}
                      >
                        <Ionicons name={icon} size={22} color={EVENT_AMBER} />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: TEXT,
                            fontSize: 16,
                            fontWeight: "900",
                          }}
                          numberOfLines={2}
                        >
                          {group.name}
                        </Text>

                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginTop: 7,
                            flexWrap: "wrap",
                          }}
                        >
                          <View
                            style={{
                              paddingHorizontal: 9,
                              paddingVertical: 5,
                              borderRadius: 999,
                              backgroundColor: OLIVE_SOFT,
                              borderWidth: 1,
                              borderColor: OLIVE_BORDER,
                              marginRight: 7,
                              marginBottom: 5,
                            }}
                          >
                            <Text
                              style={{
                                color: OLIVE,
                                fontSize: 11,
                                fontWeight: "900",
                              }}
                            >
                              {prettyGroupType(group.group_type)}
                            </Text>
                          </View>

                          <View
                            style={{
                              paddingHorizontal: 9,
                              paddingVertical: 5,
                              borderRadius: 999,
                              backgroundColor: AMBER_SOFT,
                              borderWidth: 1,
                              borderColor: AMBER_BORDER,
                              marginBottom: 5,
                            }}
                          >
                            <Text
                              style={{
                                color: EVENT_BROWN,
                                fontSize: 11,
                                fontWeight: "900",
                              }}
                            >
                              {prettyPrivacy(group.privacy)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={19}
                        color={MUTED}
                      />
                    </View>

                    {group.description ? (
                      <Text
                        style={{
                          color: MUTED,
                          marginTop: 10,
                          fontSize: 13,
                          lineHeight: 19,
                          fontWeight: "650",
                        }}
                        numberOfLines={3}
                      >
                        {group.description}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export default function Prayer({ navigation }) {
  const points = usePoints();
  const awardPrayerPoint = points?.awardPrayerPoint;

  const totalLP = points?.total ?? 0;
  const monthTotal = points?.monthTotal;
  const monthLP = Number.isFinite(Number(monthTotal))
    ? Number(monthTotal)
    : Number(totalLP || 0);

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

  const [profilesById, setProfilesById] = useState({});

  const [toastText, setToastText] = useState("");
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastScale = useRef(new Animated.Value(0.98)).current;

  const flyOpacity = useRef(new Animated.Value(0)).current;
  const flyScale = useRef(new Animated.Value(0.9)).current;
  const flyX = useRef(new Animated.Value(0)).current;
  const flyY = useRef(new Animated.Value(0)).current;

  const pointsAnchorRef = useRef(null);
  const [pointsAnchor, setPointsAnchor] = useState(null);

  const pillPulse = useRef(new Animated.Value(1)).current;
  const pillGlow = useRef(new Animated.Value(0)).current;

  function pulsePointsPill() {
    pillPulse.stopAnimation();
    pillGlow.stopAnimation();
    pillPulse.setValue(1);
    pillGlow.setValue(0);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(pillPulse, {
          toValue: 1.08,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(pillPulse, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(pillGlow, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(pillGlow, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
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
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(toastScale, {
          toValue: 1.02,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(toastScale, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 220,
        delay: 900,
        useNativeDriver: true,
      }).start();
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
      Animated.timing(flyOpacity, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(flyScale, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(flyX, {
          toValue: targetX - 14,
          duration: 520,
          useNativeDriver: true,
        }),
        Animated.timing(flyY, {
          toValue: targetY - 10,
          duration: 520,
          useNativeDriver: true,
        }),
        Animated.timing(flyScale, {
          toValue: 0.75,
          duration: 520,
          useNativeDriver: true,
        }),
      ]).start(() => {
        pulsePointsPill();

        Animated.timing(flyOpacity, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }).start();
      });
    });
  }

const [showGroupModal, setShowGroupModal] = useState(false);
const [showGroupsScreen, setShowGroupsScreen] = useState(false);
const [selectedPrayerGroup, setSelectedPrayerGroup] = useState(null);
const [creatingGroup, setCreatingGroup] = useState(false);

  const [myGroups, setMyGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  const [faithCoachVisible, setFaithCoachVisible] = useState(false);
  const [faithCoachLoading, setFaithCoachLoading] = useState(false);
  const [faithCoachText, setFaithCoachText] = useState("");
  const [faithCoachRequest, setFaithCoachRequest] = useState(null);

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
      setGroupsLoading(true);

      const { data, error } = await supabase
        .from("prayer_groups")
        .select("id, name, description, privacy, group_type, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setMyGroups(data || []);
    } catch (e) {
      console.log("Error loading prayer groups", e);
      setMyGroups([]);
    } finally {
      setGroupsLoading(false);
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
        .select(
          "id, title, body, is_anonymous, prayed_count, created_at, user_id, visibility, group_id"
        )
        .eq("community_id", GLOBAL_COMMUNITY_ID)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(PAGE_LIMIT);

      if (err) throw err;

      const rows = data || [];
      setRequests(rows);

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
      await fetchMyGroups();
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

    showToast(wasSaved ? "Removed from Saved" : "Saved for later");

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

      Alert.alert(
        "Could not save",
        "We couldn’t update your saved prayers right now. Please try again."
      );
    }
  }

  async function handlePrayedForPrayer(prayerId) {
    if (prayedThisSessionById[prayerId]) {
      showToast("Already marked as prayed");
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
      : "I prayed · +1 Light Point";

    showToast(toastLine);
    animateLightToPoints();

    setRequests((prev) =>
      prev.map((r) =>
        r.id === prayerId
          ? { ...r, prayed_count: (r.prayed_count || 0) + 1 }
          : r
      )
    );

    try {
      const { data, error } = await supabase.rpc("increment_prayed_count", {
        prayer_id: prayerId,
      });

      if (error) throw error;

      if (typeof data === "number") {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === prayerId ? { ...r, prayed_count: data } : r
          )
        );
      }
    } catch (e) {
      console.log("Error incrementing prayed_count", e);
    }
  }

  async function handleCreateRequest(
    title,
    body,
    isAnonymous,
    visibility,
    groupId
  ) {
    if (!title) {
      Alert.alert("Title required", "Please add a short title to your request.");
      return;
    }

    try {
      setPosting(true);

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        Alert.alert(
          "Not signed in",
          "Please sign in again before posting a prayer request."
        );
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
        .select(
          "id, title, body, is_anonymous, prayed_count, created_at, user_id, visibility, group_id"
        )
        .single();

      if (error) throw error;

      if (!currentUserId) setCurrentUserId(userId);

      setRequests((prev) => [data, ...prev]);
      setShowNewModal(false);

      if (!data.is_anonymous) fetchProfilesForRequests([data]);
    } catch (e) {
      console.log("Error creating prayer request", e);

      const msg =
        e?.message ||
        e?.error_description ||
        (typeof e === "string"
          ? e
          : "We couldn’t post your prayer request right now. Please try again.");

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
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) throw sessionError;
        userId = sessionData?.session?.user?.id;
      }

      if (!userId) {
        Alert.alert(
          "Not signed in",
          "Please sign in again before creating a prayer group."
        );
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
        .select("id, name, description, privacy, group_type, created_at")
        .single();

      if (groupError) throw groupError;

      const { error: memberError } = await supabase
        .from("prayer_group_members")
        .insert({
          group_id: group.id,
          user_id: userId,
          role: "admin",
        });

      if (memberError) throw memberError;

      setMyGroups((prev) => [group, ...prev]);
      setShowGroupModal(false);
      setShowGroupsScreen(true);

      Alert.alert(
        "Prayer group created",
        "Your new prayer group is ready and has been added to Prayer Groups."
      );
    } catch (e) {
      console.log("Error creating prayer group", e);

      const msg =
        e?.message ||
        e?.error_description ||
        (typeof e === "string"
          ? e
          : "We couldn’t create that group right now. Please try again.");

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
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) throw sessionError;
        userId = sessionData?.session?.user?.id;

        if (userId && !currentUserId) setCurrentUserId(userId);
      }

      if (!userId) {
        Alert.alert(
          "Not signed in",
          "Please sign in again before sending encouragement."
        );
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
        (typeof e === "string"
          ? e
          : "We couldn’t send that encouragement right now. Please try again.");

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
        setFaithCoachText(
          "Sorry, Faith Coach could not load a response right now. Please try again in a moment."
        );
        return;
      }

      setFaithCoachText(data?.text || "Faith Coach did not return any text.");
    } catch (e) {
      console.log("Faith Coach invoke exception", e);
      setFaithCoachText(
        "Sorry, something went wrong while talking to Faith Coach. Please try again soon."
      );
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
  }, [
    activeFilter,
    requests,
    currentUserId,
    bookmarkedById,
    prayedThisSessionById,
  ]);

  const totalPrayed = requests.reduce(
    (sum, r) => sum + (r.prayed_count || 0),
    0
  );

  const emptyMessage = useMemo(() => {
    if (activeFilter === "mine") {
      return "You have not shared a prayer request yet. When you do, it will appear here.";
    }

    if (activeFilter === "saved" && currentUserId && bookmarksLoaded) {
      return "No saved prayers yet. Save prayers you want to return to later.";
    }

    if (activeFilter === "saved" && !currentUserId) {
      return "Please sign in to view your saved prayers.";
    }

    if (activeFilter === "prayed") {
      return "No prayers marked as prayed yet today. Prayers you complete will appear here.";
    }

    return "No open prayer requests yet. Be the first to share one.";
  }, [activeFilter, currentUserId, bookmarksLoaded]);

  function getPosterMeta(item) {
    if (item?.is_anonymous) {
      return { name: "Someone on Triunely", avatarUrl: null, initials: "" };
    }

    const prof = profilesById[item?.user_id];
    const displayName = prof?.display_name || "Triunely Member";
    const avatarUrl = prof?.avatar_url || null;

    return {
      name: displayName,
      avatarUrl,
      initials: initialsFromName(displayName),
    };
  }

  function PosterAvatar({ item }) {
    const meta = getPosterMeta(item);

    if (item?.is_anonymous) {
      return (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            backgroundColor: OLIVE_SOFT,
            borderWidth: 1,
            borderColor: OLIVE_BORDER,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="person-outline" size={19} color={OLIVE} />
        </View>
      );
    }

    if (meta.avatarUrl) {
      return (
        <Image
          source={{ uri: meta.avatarUrl }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
          }}
        />
      );
    }

    return (
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 999,
          backgroundColor: OLIVE_SOFT,
          borderWidth: 1,
          borderColor: OLIVE_BORDER,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: OLIVE, fontWeight: "900" }}>
          {meta.initials || "T"}
        </Text>
      </View>
    );
  }

  const swipeHint = useMemo(() => {
    const prayedDir =
      SWIPE_DIRECTION_MODE === "INVERTED" ? "Swipe left" : "Swipe right";
    const saveDir =
      SWIPE_DIRECTION_MODE === "INVERTED" ? "Swipe right" : "Swipe left";

    return `${prayedDir} to mark prayed  •  ${saveDir} to save`;
  }, []);

  const renderItem = ({ item }) => {
    const createdLabel = formatDateTime(item.created_at);

    let visibilityLabel = "";
    if (item.visibility === "group" && item.group_id) {
      visibilityLabel = "Group prayer";
    } else if (item.visibility === "private") {
      visibilityLabel = "Private prayer";
    } else {
      visibilityLabel = "Open prayer";
    }

    const replies = repliesByPrayerId[item.id] || [];
    const isExpanded = !!expandedPrayerIds[item.id];
    const isSaved = !!bookmarkedById[item.id];
    const alreadyPrayedThisSession = !!prayedThisSessionById[item.id];

    const poster = getPosterMeta(item);

    const closeSwipe = () => {
      swipeRefs.current?.[item.id]?.close?.();
    };

    const renderLeftActions = () => (
      <View
        style={{
          justifyContent: "center",
          marginBottom: 12,
          marginRight: 10,
        }}
      >
        <View
          style={{
            backgroundColor: alreadyPrayedThisSession
              ? CARD_BORDER
              : AMBER_SOFT,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            minWidth: 116,
            borderWidth: 1,
            borderColor: alreadyPrayedThisSession ? CARD_BORDER : AMBER_BORDER,
          }}
        >
          <Ionicons
            name={
              alreadyPrayedThisSession
                ? "checkmark-circle"
                : "checkmark-circle-outline"
            }
            size={19}
            color={alreadyPrayedThisSession ? MUTED : EVENT_AMBER}
          />

          <Text
            style={{
              color: alreadyPrayedThisSession ? MUTED : EVENT_BROWN,
              fontWeight: "900",
              fontSize: 13,
              marginTop: 4,
            }}
          >
            {alreadyPrayedThisSession ? "Prayed" : "I prayed"}
          </Text>
        </View>
      </View>
    );

    const renderRightActions = () => (
      <View
        style={{
          justifyContent: "center",
          marginBottom: 12,
          marginLeft: 10,
          alignItems: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: isSaved ? AMBER_SOFT : SURFACE,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            minWidth: 116,
            borderWidth: 1,
            borderColor: isSaved ? AMBER_BORDER : CARD_BORDER,
          }}
        >
          <Ionicons
            name={isSaved ? "bookmark" : "bookmark-outline"}
            size={19}
            color={isSaved ? EVENT_AMBER : OLIVE}
          />

          <Text
            style={{
              color: isSaved ? EVENT_BROWN : OLIVE,
              fontWeight: "900",
              fontSize: 13,
              marginTop: 4,
            }}
          >
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
        <View
          style={{
            marginBottom: 14,
            borderRadius: 26,
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: alreadyPrayedThisSession ? AMBER_BORDER : CARD_BORDER,
            shadowColor: SHADOW,
            shadowOpacity: 0.08,
            shadowRadius: 13,
            shadowOffset: { width: 0, height: 5 },
            elevation: 3,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              paddingHorizontal: 15,
              paddingVertical: 14,
            }}
          >
            <View
              style={{
                backgroundColor: PREMIUM_CREAM,
                borderRadius: 20,
                padding: 12,
                marginBottom: 13,
                borderWidth: 1,
                borderColor: CARD_BORDER,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <PosterAvatar item={item} />

                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text
                    style={{
                      color: TEXT,
                      fontWeight: "900",
                      fontSize: 14,
                    }}
                    numberOfLines={1}
                  >
                    {item.is_anonymous ? "Someone on Triunely" : poster.name}
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 3,
                    }}
                  >
                    <Ionicons name="earth-outline" size={12} color={OLIVE} />

                    <Text
                      style={{
                        color: OLIVE,
                        fontSize: 11,
                        fontWeight: "800",
                        marginLeft: 4,
                      }}
                    >
                      {visibilityLabel}
                    </Text>
                  </View>
                </View>

                {createdLabel ? (
                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 10.5,
                      fontWeight: "700",
                      maxWidth: 86,
                      textAlign: "right",
                    }}
                    numberOfLines={2}
                  >
                    {createdLabel}
                  </Text>
                ) : null}
              </View>
            </View>

            <Text
              style={{
                color: TEXT,
                fontSize: 19,
                lineHeight: 24,
                fontWeight: "900",
              }}
            >
              {item.title}
            </Text>

            {item.body ? (
              <Text
                style={{
                  color: MUTED,
                  marginTop: 8,
                  fontSize: 14,
                  lineHeight: 21,
                  fontWeight: "650",
                }}
              >
                {item.body}
              </Text>
            ) : null}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 14,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 11,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: AMBER_SOFT,
                  borderWidth: 1,
                  borderColor: AMBER_BORDER,
                }}
              >
                <Ionicons name="people-outline" size={15} color={EVENT_AMBER} />

                <Text
                  style={{
                    color: EVENT_BROWN,
                    fontSize: 12,
                    fontWeight: "900",
                    marginLeft: 6,
                  }}
                >
                  {item.prayed_count || 0} prayed
                </Text>
              </View>

              <View style={{ flex: 1 }} />

              <Pressable
                onPress={() => handlePrayedForPrayer(item.id)}
                style={({ pressed }) => ({
                  backgroundColor: alreadyPrayedThisSession
                    ? OLIVE_SOFT
                    : EVENT_AMBER,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: alreadyPrayedThisSession
                    ? OLIVE_BORDER
                    : AMBER_BORDER,
                  shadowColor: EVENT_AMBER,
                  shadowOpacity:
                    alreadyPrayedThisSession || pressed ? 0.04 : 0.16,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: alreadyPrayedThisSession ? 0 : 2,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <Text
                  style={{
                    color: alreadyPrayedThisSession ? OLIVE : "#FFFFFF",
                    fontWeight: "900",
                    fontSize: 13,
                  }}
                >
                  {alreadyPrayedThisSession ? "Prayed" : "I prayed"}
                </Text>
              </Pressable>
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: CARD_BORDER,
                marginTop: 13,
                marginBottom: 11,
              }}
            />

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Pressable
                onPress={() => openEncourage(item)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  marginRight: 15,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Ionicons name="heart-outline" size={18} color={OLIVE} />

                <Text
                  style={{
                    color: OLIVE,
                    fontSize: 12,
                    fontWeight: "900",
                    marginLeft: 6,
                  }}
                >
                  Encourage
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleAskFaithCoach(item)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={18}
                  color={EVENT_AMBER}
                />

                <Text
                  style={{
                    color: EVENT_BROWN,
                    fontSize: 12,
                    fontWeight: "900",
                    marginLeft: 6,
                  }}
                >
                  Faith Coach
                </Text>
              </Pressable>

              <View style={{ flex: 1 }} />

              <Pressable
                onPress={() => toggleBookmark(item.id)}
                hitSlop={10}
                style={({ pressed }) => ({
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isSaved ? AMBER_SOFT : PREMIUM_CREAM,
                  borderWidth: 1,
                  borderColor: isSaved ? AMBER_BORDER : CARD_BORDER,
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                })}
              >
                <Ionicons
                  name={isSaved ? "bookmark" : "bookmark-outline"}
                  size={18}
                  color={isSaved ? EVENT_AMBER : MUTED}
                />
              </Pressable>
            </View>

            <View style={{ marginTop: 11 }}>
              <Pressable onPress={() => toggleReplies(item.id)}>
                <Text
                  style={{
                    color: MUTED,
                    fontSize: 12,
                    fontWeight: "900",
                  }}
                >
                  {isExpanded
                    ? "Hide encouragement"
                    : replies.length > 0
                    ? `View encouragement (${replies.length})`
                    : "View encouragement"}
                </Text>
              </Pressable>

              {isExpanded ? (
                <View
                  style={{
                    marginTop: 10,
                    padding: 12,
                    borderRadius: 18,
                    backgroundColor: PREMIUM_CREAM,
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                  }}
                >
                  {replies.length > 0 ? (
                    <View>
                      {replies.map((reply, index) => {
                        const isMine = reply.user_id === currentUserId;
                        const whoReply = isMine ? "You" : "Someone on Triunely";
                        const replyCreated = formatDateTime(reply.created_at);
                        const isLast = index === replies.length - 1;

                        return (
                          <View
                            key={reply.id}
                            style={{
                              paddingBottom: isLast ? 0 : 10,
                              marginBottom: isLast ? 0 : 10,
                              borderBottomWidth: isLast ? 0 : 1,
                              borderBottomColor: CARD_BORDER,
                            }}
                          >
                            <Text
                              style={{
                                color: TEXT,
                                fontSize: 12,
                                fontWeight: "900",
                              }}
                            >
                              {whoReply}
                              {replyCreated ? ` · ${replyCreated}` : ""}
                            </Text>

                            <Text
                              style={{
                                color: MUTED,
                                fontSize: 12,
                                marginTop: 4,
                                lineHeight: 18,
                                fontWeight: "650",
                              }}
                            >
                              {reply.message}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text
                      style={{
                        color: MUTED,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      No encouragement yet. Be the first to encourage.
                    </Text>
                  )}
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Swipeable>
    );
  };

  const renderPrayerHeader = () => (
    <View>
      <View
        style={{
          marginBottom: 14,
          padding: 16,
          borderRadius: 28,
          backgroundColor: SURFACE,
          borderWidth: 1,
          borderColor: AMBER_BORDER,
          shadowColor: SHADOW,
          shadowOpacity: 0.09,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 3,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: AMBER_SOFT,
              borderWidth: 1,
              borderColor: AMBER_BORDER,
              marginRight: 12,
            }}
          >
            <Ionicons name="heart-outline" size={24} color={EVENT_AMBER} />
          </View>

          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text
              style={[
                serifHeading,
                {
                  fontSize: 28,
                  lineHeight: 32,
                },
              ]}
            >
              Prayer
            </Text>

            <Text
              style={{
                color: MUTED,
                marginTop: 4,
                fontSize: 13,
                lineHeight: 19,
                fontWeight: "700",
              }}
            >
              Share burdens, lift others up, and build a rhythm of prayer.
            </Text>
          </View>

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
                backgroundColor: AMBER_SOFT,
                opacity: pillGlow,
              }}
            />

            <View
              style={{
                backgroundColor: PREMIUM_CREAM,
                borderRadius: 18,
                paddingHorizontal: 11,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: AMBER_BORDER,
                shadowColor: EVENT_AMBER,
                shadowOpacity: 0.14,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 5 },
                elevation: 2,
                alignItems: "flex-end",
                minWidth: 76,
              }}
            >
              <Text
                style={{
                  color: MUTED,
                  fontSize: 10,
                  fontWeight: "900",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                Month
              </Text>

              <Text
                style={{
                  color: EVENT_BROWN,
                  fontSize: 17,
                  fontWeight: "900",
                  marginTop: 1,
                }}
              >
                {monthLP}
              </Text>
            </View>
          </Animated.View>
        </View>

        <View
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 22,
            backgroundColor: PREMIUM_CREAM,
            borderWidth: 1,
            borderColor: CARD_BORDER,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: TEXT,
                  fontSize: 13,
                  fontWeight: "900",
                }}
              >
                Open requests
              </Text>

              <Text
                style={{
                  color: EVENT_BROWN,
                  fontSize: 18,
                  fontWeight: "900",
                  marginTop: 2,
                }}
              >
                {requests.length}
              </Text>
            </View>

            <View
              style={{
                width: 1,
                height: 34,
                backgroundColor: CARD_BORDER,
                marginHorizontal: 14,
                transform: [{ rotate: "12deg" }],
              }}
            />

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: TEXT,
                  fontSize: 13,
                  fontWeight: "900",
                }}
              >
                Total prayed
              </Text>

              <Text
                style={{
                  color: OLIVE,
                  fontSize: 18,
                  fontWeight: "900",
                  marginTop: 2,
                }}
              >
                {totalPrayed}
              </Text>
            </View>
          </View>

          <View
            style={{
              marginTop: 11,
              paddingTop: 10,
              borderTopWidth: 1,
              borderTopColor: CARD_BORDER,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons name="swap-horizontal-outline" size={16} color={OLIVE} />

            <Text
              style={{
                color: MUTED,
                marginLeft: 7,
                fontSize: 12,
                lineHeight: 17,
                fontWeight: "700",
                flex: 1,
              }}
            >
              {swipeHint}
            </Text>
          </View>
        </View>
      </View>

      <View
        style={{
          marginBottom: 12,
          backgroundColor: SURFACE,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          paddingVertical: 8,
          paddingHorizontal: 6,
          shadowColor: SHADOW,
          shadowOpacity: 0.06,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "stretch" }}>
          {FILTERS.map((f, index) => {
            const isActive = activeFilter === f.id;
            const isLast = index === FILTERS.length - 1;

            return (
              <View
                key={f.id}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Pressable
                  onPress={() => setActiveFilter(f.id)}
                  style={({ pressed }) => ({
                    flex: 1,
                    minHeight: 58,
                    borderRadius: 18,
                    paddingHorizontal: 6,
                    paddingVertical: 8,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isActive
                      ? AMBER_SOFT
                      : pressed
                      ? OLIVE_SOFT
                      : "transparent",
                    borderWidth: isActive ? 1 : 0,
                    borderColor: isActive ? AMBER_BORDER : "transparent",
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  })}
                >
                  <Ionicons
                    name={f.icon}
                    size={17}
                    color={isActive ? EVENT_AMBER : OLIVE}
                  />

                  <Text
                    style={{
                      color: isActive ? EVENT_BROWN : TEXT,
                      fontSize: 12,
                      fontWeight: "900",
                      marginTop: 4,
                    }}
                    numberOfLines={1}
                  >
                    {f.label}
                  </Text>

                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 9.5,
                      fontWeight: "700",
                      marginTop: 2,
                      textAlign: "center",
                    }}
                    numberOfLines={1}
                  >
                    {f.helper}
                  </Text>
                </Pressable>

                {!isLast ? (
                  <View
                    style={{
                      width: 1,
                      height: 34,
                      backgroundColor: CARD_BORDER,
                      marginHorizontal: 4,
                      transform: [{ rotate: "14deg" }],
                    }}
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: "row", marginBottom: 12 }}>
        <Pressable
          onPress={() => setShowNewModal(true)}
          disabled={posting}
          style={({ pressed }) => ({
            flex: 1,
            marginRight: 8,
            paddingVertical: 12,
            borderRadius: 999,
            backgroundColor: EVENT_AMBER,
            borderWidth: 1,
            borderColor: AMBER_BORDER,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: EVENT_AMBER,
            shadowOpacity: 0.17,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 5 },
            elevation: 3,
            opacity: posting ? 0.6 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontWeight: "900",
              fontSize: 13,
            }}
          >
            {posting ? "Posting…" : "+ New request"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setShowGroupsScreen(true);
            fetchMyGroups();
          }}
          style={({ pressed }) => ({
            flex: 1,
            paddingVertical: 12,
            borderRadius: 999,
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: OLIVE_BORDER,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <Text
            style={{
              color: OLIVE,
              fontWeight: "900",
              fontSize: 13,
            }}
          >
            Prayer Groups
          </Text>
        </Pressable>
      </View>

      <View
        style={{
          marginBottom: 10,
          height: 1,
          backgroundColor: CARD_BORDER,
        }}
      />
    </View>
  );

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View
          style={{
            padding: 24,
            marginTop: 10,
            borderRadius: 24,
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            alignItems: "center",
          }}
        >
          <ActivityIndicator size="large" color={EVENT_AMBER} />

          <Text
            style={{
              color: MUTED,
              marginTop: 10,
              fontWeight: "700",
            }}
          >
            Loading prayer requests…
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View
          style={{
            padding: 18,
            marginTop: 6,
            borderRadius: 24,
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: DANGER_BORDER,
          }}
        >
          <Text
            style={{
              color: TEXT,
              fontWeight: "900",
              fontSize: 17,
            }}
          >
            Couldn’t load prayers
          </Text>

          <Text
            style={{
              color: DANGER,
              marginTop: 7,
              lineHeight: 20,
              fontWeight: "700",
            }}
          >
            {error}
          </Text>
        </View>
      );
    }

    return (
      <View
        style={{
          padding: 18,
          marginTop: 6,
          borderRadius: 24,
          backgroundColor: SURFACE,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          shadowColor: SHADOW,
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 5 },
          elevation: 2,
        }}
      >
        <View
          style={{
            width: 50,
            height: 50,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: AMBER_SOFT,
            borderWidth: 1,
            borderColor: AMBER_BORDER,
            marginBottom: 12,
          }}
        >
          <Ionicons name="heart-outline" size={24} color={EVENT_AMBER} />
        </View>

        <Text
          style={{
            color: TEXT,
            fontWeight: "900",
            fontSize: 17,
          }}
        >
          Nothing here yet
        </Text>

        <Text
          style={{
            color: MUTED,
            marginTop: 7,
            lineHeight: 20,
            fontWeight: "700",
          }}
        >
          {emptyMessage}
        </Text>
      </View>
    );
  };

  return (
    <Screen backgroundColor={PREMIUM_CREAM} padded>
      {({ bottomPad }) => (
        <>
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
                backgroundColor: AMBER_SOFT,
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
                borderColor: AMBER_BORDER,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "900",
                  textAlign: "center",
                }}
              >
                {toastText}
              </Text>
            </View>
          </Animated.View>

          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              width: 28,
              height: 28,
              borderRadius: 999,
              backgroundColor: EVENT_AMBER,
              alignItems: "center",
              justifyContent: "center",
              opacity: flyOpacity,
              transform: [
                { translateX: flyX },
                { translateY: flyY },
                { scale: flyScale },
              ],
              zIndex: 998,
              borderWidth: 1,
              borderColor: AMBER_BORDER,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 12 }}>
              +1
            </Text>
          </Animated.View>

<FlatList
  data={loading ? [] : filteredRequests}
  keyExtractor={(item) => item.id}
  renderItem={renderItem}
  ListHeaderComponent={renderPrayerHeader()}
  ListEmptyComponent={renderEmptyState}
  onRefresh={refreshAll}
  refreshing={refreshing}
  extraData={{
    activeFilter,
    bookmarkedById,
    prayedThisSessionById,
    repliesByPrayerId,
    expandedPrayerIds,
    requestsLength: requests.length,
    totalPrayed,
    myGroupsLength: myGroups.length,
    loading,
    error,
  }}
  keyboardShouldPersistTaps="handled"
  contentContainerStyle={{
    paddingBottom: (bottomPad || 0) + 16,
  }}
  showsVerticalScrollIndicator={false}
/>

        <PrayerGroupsFullScreen
  visible={showGroupsScreen}
  groups={myGroups}
  loading={groupsLoading}
  onClose={() => setShowGroupsScreen(false)}
  onCreateGroup={() => setShowGroupModal(true)}
  onRefresh={fetchMyGroups}
onOpenGroup={(group) => {
  setShowGroupsScreen(false);
  setSelectedPrayerGroup(group);
}}
/>

<Modal
  visible={!!selectedPrayerGroup}
  animationType="fade"
  transparent={false}
  presentationStyle="fullScreen"
  onRequestClose={() => setSelectedPrayerGroup(null)}
>
  {selectedPrayerGroup ? (
    <PrayerGroupDetailScreen
      route={{
        params: {
          groupId: selectedPrayerGroup.id,
          group: selectedPrayerGroup,
        },
      }}
      navigation={{
        goBack: () => setSelectedPrayerGroup(null),
      }}
    />
  ) : null}
</Modal>

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