// src/screens/ChurchProfilePublic.js
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";

import ChurchNoticeboardPanel from "../components/ChurchNoticeboardPanel";
import NewPostModal from "../components/NewPostModal";
import PostCard from "../components/PostCard";
import PostCommentsModal from "../components/PostCommentsModal";
import Screen from "../components/Screen";
import SearchLaunchButton from "../components/SearchLaunchButton";
import VerifiedBadge from "../components/VerifiedBadge";
import { useFellowshipRequestsModal } from "../context/FellowshipRequestsModalProvider";
import { useRealtime } from "../context/RealtimeProvider";
import {
  fetchUpcomingEventsForChurch,
  formatEventDateTime,
} from "../features/events/services/eventsService";
import { getOrCreateChurchConversation } from "../lib/messages";
import { supabase } from "../lib/supabase";
import { isFeedVideoMedia, uploadFeedMedia } from "../lib/uploadFeedMedia";

const POSTS_ENABLED = true;
const PAGE_LIMIT = 50;

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

function PremiumSparkIcon({ size = 40, amber = true }) {
  const accent = amber ? EVENT_AMBER : OLIVE;
  const bg = amber ? AMBER_SOFT : OLIVE_SOFT;
  const border = amber ? AMBER_BORDER : OLIVE_BORDER;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name="sparkles-outline" size={Math.round(size * 0.48)} color={accent} />
    </View>
  );
}

function PremiumSectionHeader({
  title,
  subtitle,
  icon = "sparkles-outline",
  amber = true,
  actionLabel,
  onAction,
}) {
  const accent = amber ? EVENT_AMBER : OLIVE;
  const border = amber ? AMBER_BORDER : OLIVE_BORDER;
  const bg = amber ? AMBER_SOFT : OLIVE_SOFT;

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
            backgroundColor: bg,
            borderWidth: 1,
            borderColor: border,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Ionicons name={icon} size={19} color={accent} />
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

function ChurchActionCard({
  icon,
  title,
  subtitle,
  tint = "amber",
  onPress,
  disabled = false,
}) {
  const isOlive = tint === "olive";
  const accent = isOlive ? OLIVE : EVENT_AMBER;
  const bg = isOlive ? OLIVE_SOFT : AMBER_SOFT;
  const border = isOlive ? OLIVE_BORDER : AMBER_BORDER;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => ({
        width: "48%",
        minHeight: 128,
        borderRadius: 22,
        padding: 13,
        backgroundColor: SURFACE,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        shadowColor: SHADOW,
        shadowOpacity: pressed ? 0.04 : 0.09,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: pressed ? 1 : 3,
        opacity: disabled ? 0.55 : 1,
        transform: [{ scale: pressed && !disabled ? 0.985 : 1 }],
      })}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: border,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}
      >
        <Ionicons name={icon} size={21} color={accent} />
      </View>

      <Text
        style={{
          color: TEXT,
          fontSize: 14,
          fontWeight: "900",
        }}
        numberOfLines={1}
      >
        {title}
      </Text>

      <Text
        style={{
          color: MUTED,
          fontSize: 11.5,
          fontWeight: "700",
          lineHeight: 16,
          marginTop: 5,
          flex: 1,
        }}
        numberOfLines={3}
      >
        {subtitle}
      </Text>

      <View
        style={{
          marginTop: 8,
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: border,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
          alignSelf: "flex-end",
        }}
      >
        <Ionicons name="chevron-forward" size={13} color={accent} />
      </View>
    </Pressable>
  );
}

function getImageContentType(asset) {
  const explicitMime =
    asset?.mimeType ||
    asset?.mime_type ||
    asset?.file?.type ||
    null;

  if (typeof explicitMime === "string" && explicitMime.startsWith("image/")) {
    return explicitMime;
  }

  const cleanUri = String(asset?.uri || "").toLowerCase().split("?")[0];

  if (cleanUri.endsWith(".png")) return "image/png";
  if (cleanUri.endsWith(".webp")) return "image/webp";
  if (cleanUri.endsWith(".heic")) return "image/heic";
  if (cleanUri.endsWith(".heif")) return "image/heif";

  return "image/jpeg";
}

function getImageFileExtension(contentType) {
  const type = String(contentType || "").toLowerCase();

  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("heic")) return "heic";
  if (type.includes("heif")) return "heif";

  return "jpg";
}

function safeInitials(name) {
  if (!name) return "?";

  const parts = String(name).trim().split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return String(name).trim()[0]?.toUpperCase() || "?";
}

function getChurchProfileEventImageUrl(event, church) {
  return (
    event?.image_url ||
    event?.cover_image_url ||
    event?.banner_url ||
    event?.poster_url ||
    event?.media_url ||
    church?.cover_image_url ||
    church?.avatar_url ||
    null
  );
}

function getChurchProfileFallbackEventImage(event) {
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
    title.includes("youth") ||
    title.includes("social") ||
    title.includes("party") ||
    title.includes("meal")
  ) {
    return "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?q=80&w=1200&auto=format&fit=crop";
  }

  if (
    title.includes("prayer") ||
    title.includes("bible") ||
    title.includes("service")
  ) {
    return "https://images.unsplash.com/photo-1507692049790-de58290a4334?q=80&w=1200&auto=format&fit=crop";
  }

  return "https://images.unsplash.com/photo-1507692049790-de58290a4334?q=80&w=1200&auto=format&fit=crop";
}

function formatChurchProfileDateBadge(startAt) {
  if (!startAt) {
    return {
      day: "TBC",
      month: "DATE",
    };
  }

  try {
    const d = new Date(startAt);

    return {
      day: d.toLocaleDateString(undefined, { day: "numeric" }),
      month: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    };
  } catch {
    return {
      day: "TBC",
      month: "DATE",
    };
  }
}

function getChurchProfileEventLabel(event) {
  if (event?.status === "cancelled") return "Cancelled";

  if (event?.is_course_session_projection || event?.event_type === "course_programme") {
    return "Course / programme";
  }

  return "Church event";
}

function getChurchProfileEventIcon(event) {
  const title = String(event?.title || "").toLowerCase();

  if (event?.is_course_session_projection || event?.event_type === "course_programme") {
    return "school-outline";
  }

  if (title.includes("prayer")) return "hand-left-outline";
  if (title.includes("meal") || title.includes("food")) return "restaurant-outline";
  if (title.includes("music") || title.includes("worship")) return "musical-notes-outline";

  return "calendar-outline";
}

function getChurchProfileEventLocation(event) {
  return (
    event?.location_name ||
    event?.location_address ||
    (event?.online_url ? "Online" : "Location to be confirmed")
  );
}

function countChurchProfileGoing(event) {
  const attendees = Array.isArray(event?.event_attendees)
    ? event.event_attendees
    : [];

  return attendees.filter((a) => a.status === "going").length;
}

function getChurchEventTypeLabel(event) {
  if (event?.is_course_session_projection || event?.event_type === "course_programme") {
    return "Course / programme";
  }

  if (event?.status === "cancelled") {
    return "Cancelled";
  }

  return "Church event";
}

function getChurchEventLocationLabel(event) {
  if (event?.online_url) return "Online";

  return (
    event?.location_name ||
    event?.location_address ||
    "Location to be confirmed"
  );
}

function MemberPreviewStack({ members = [], total = 0 }) {
  const visibleMembers = (members || []).slice(0, 3);
  const extraCount = Math.max(0, total - visibleMembers.length);

  if (total <= 0) {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: 10,
        }}
      >
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
            marginRight: 8,
          }}
        >
          <Ionicons name="people-outline" size={15} color={OLIVE} />
        </View>

        <Text
          style={{
            color: MUTED,
            fontSize: 12.5,
            fontWeight: "800",
          }}
        >
          Members will appear here
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginTop: 10,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginRight: 9,
        }}
      >
        {visibleMembers.map((member, index) => {
          const displayName = member?.display_name || "Member";
          const avatarUrl = member?.avatar_url || null;

          return (
            <View
              key={member?.id || `${displayName}-${index}`}
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
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
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
                  {safeInitials(displayName)}
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
              marginLeft: visibleMembers.length > 0 ? -9 : 0,
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
      </View>

      <Text
        style={{
          color: MUTED,
          fontSize: 12.5,
          fontWeight: "800",
        }}
      >
        {total} {total === 1 ? "member" : "members"}
      </Text>
    </View>
  );
}

export default function ChurchProfilePublic({ navigation, route }) {
  const churchId = route?.params?.churchId;
  const rt = useRealtime();
  const { openFellowshipRequests } = useFellowshipRequestsModal();

  const unreadMessageCount =
    rt?.unreadMessageCount ??
    rt?.unreadInboxCount ??
    rt?.messageUnreadCount ??
    0;

  const unreadNotificationCount = rt?.unreadNotificationCount ?? 0;
  const pendingFellowshipCount = rt?.pendingFellowshipCount ?? 0;

  const isDefaultTriunelyChurch = route?.params?.isDefaultTriunelyChurch === true;

  const [viewerId, setViewerId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [church, setChurch] = useState(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [pendingGroupRequestCount, setPendingGroupRequestCount] = useState(0);

  const [membershipLoading, setMembershipLoading] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState("none");
  const [membershipRow, setMembershipRow] = useState(null);

  const [memberPreview, setMemberPreview] = useState([]);
  const [memberCount, setMemberCount] = useState(0);

  const [activeTab, setActiveTab] = useState("about");

  const [about, setAbout] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

  const [showAdminMenu, setShowAdminMenu] = useState(false);

  const [savingAvatar, setSavingAvatar] = useState(false);
  const [savingCover, setSavingCover] = useState(false);

  const [postsLoading, setPostsLoading] = useState(false);
  const [posts, setPosts] = useState([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [posting, setPosting] = useState(false);

  const [churchEventsLoading, setChurchEventsLoading] = useState(false);
  const [churchEvents, setChurchEvents] = useState([]);

  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState(null);
  const [reactionPickerForPost, setReactionPickerForPost] = useState(null);

  const churchName = church?.display_name || church?.name || "Church";
  const initials = useMemo(() => safeInitials(churchName), [churchName]);
  const isVerified = Boolean(church?.is_verified);

  const isMember = membershipStatus === "approved";
  const canSeeChurchLife = isAdmin || isMember;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const { data: sessData } = await supabase.auth.getSession();
        const uid = sessData?.session?.user?.id || null;
        setViewerId(uid);

        if (!churchId) {
          setChurch(null);
          return;
        }

        await loadChurch(churchId);
                await loadMemberPreview(churchId);

        let admin = false;

        if (uid) {
          admin = await checkIsAdmin(uid, churchId);
        } else {
          setIsAdmin(false);
        }

        if (admin) {
          await loadPendingGroupRequestCount(churchId);
        } else {
          setPendingGroupRequestCount(0);
        }

        if (uid && !admin) {
          await loadMembership(uid, churchId);
        } else {
          setMembershipRow(null);
          setMembershipStatus(admin ? "approved" : "none");
        }

        await loadChurchEvents(churchId, admin);

        if (POSTS_ENABLED) {
          await loadChurchPosts(churchId);
        }
      } catch (e) {
        console.log("ChurchProfilePublic load error", e);
        Alert.alert("Error", "We couldn't load this church profile right now.");
      } finally {
        setLoading(false);
      }
    })();
  }, [churchId]);

  async function loadChurch(id) {
    const { data, error } = await supabase
      .from("churches")
.select(
  "id, name, display_name, avatar_url, cover_image_url, about, website, location, is_verified, feed_community_id"
)
      .eq("id", id)
      .single();

    if (error) {
      console.log("loadChurch error:", error);
      throw error;
    }

    setChurch(data || null);
    setAbout(data?.about ?? "");
    setWebsite(data?.website ?? "");
    setLocation(data?.location ?? "");
  }

async function loadMemberPreview(id) {
  try {
    if (!id) {
      setMemberPreview([]);
      setMemberCount(0);
      return;
    }

    const { data, error } = await supabase.rpc("get_church_member_preview", {
      target_church_id: id,
    });

    if (error) {
      console.log("loadMemberPreview rpc error:", error);
      setMemberPreview([]);
      setMemberCount(0);
      return;
    }

    const rows = data || [];

    const total = rows?.[0]?.total_count ? Number(rows[0].total_count) : 0;

    const mapped = rows.map((row) => ({
      id: row.user_id,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
    }));

    setMemberCount(total);
    setMemberPreview(mapped);
  } catch (e) {
    console.log("loadMemberPreview exception:", e);
    setMemberPreview([]);
    setMemberCount(0);
  }
}

  async function loadPendingGroupRequestCount(id) {
    try {
      if (!id) return;

      const { count, error } = await supabase
        .from("church_group_members")
        .select("id", { count: "exact", head: true })
        .eq("church_id", id)
        .eq("status", "pending");

      if (error) {
        console.log("loadPendingGroupRequestCount error:", error);
        setPendingGroupRequestCount(0);
        return;
      }

      setPendingGroupRequestCount(count || 0);
    } catch (e) {
      console.log("loadPendingGroupRequestCount exception:", e);
      setPendingGroupRequestCount(0);
    }
  }

  async function checkIsAdmin(_uid, id) {
    try {
      setCheckingAdmin(true);

      const { data, error } = await supabase.rpc("is_church_admin", {
        target_church_id: id,
      });

      if (error) {
        console.log("checkIsAdmin rpc error:", error);
        setIsAdmin(false);
        return false;
      }

      const admin = Boolean(data);
      setIsAdmin(admin);

      if (admin) {
        setMembershipStatus("approved");
      }

      return admin;
    } finally {
      setCheckingAdmin(false);
    }
  }

  async function loadMembership(uid, id) {
    try {
      setMembershipLoading(true);

      const { data, error } = await supabase
        .from("church_memberships")
        .select("id, user_id, church_id, status, created_at")
        .eq("user_id", uid)
        .eq("church_id", id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.log("loadMembership error:", error);
        setMembershipStatus("unknown");
        setMembershipRow(null);
        return;
      }

      const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
      setMembershipRow(row || null);

      const status = row?.status ? String(row.status).toLowerCase() : "none";

      if (status === "approved") setMembershipStatus("approved");
      else if (status === "pending") setMembershipStatus("pending");
      else if (status === "rejected") setMembershipStatus("rejected");
      else if (status === "left") setMembershipStatus("left");
      else if (status === "requested") setMembershipStatus("pending");
      else setMembershipStatus(row ? "unknown" : "none");
    } catch (e) {
      console.log("loadMembership exception:", e);
      setMembershipStatus("unknown");
      setMembershipRow(null);
    } finally {
      setMembershipLoading(false);
    }
  }

  async function handleMessageChurch() {
    try {
      if (!churchId) return;

      const conversationId = await getOrCreateChurchConversation(churchId);
      navigation.navigate("Chat", { conversationId });
    } catch (e) {
      console.log("Message Church error", e);
      Alert.alert("Messages", e?.message || "Could not open messages right now.");
    }
  }

  async function handleJoinChurch() {
    if (!viewerId) {
      Alert.alert("Please sign in", "You need to be signed in to join a church.");
      return;
    }

    if (!churchId) return;
    if (isAdmin) return;

    if (membershipStatus === "approved") {
      Alert.alert("You're already a member", "You’re already linked to this church.");
      return;
    }

    if (membershipStatus === "pending") {
      Alert.alert("Request pending", "Your join request is already pending approval.");
      return;
    }

    try {
      setMembershipLoading(true);

      if (membershipRow?.id) {
        const { error: updErr } = await supabase
          .from("church_memberships")
          .update({ status: "pending" })
          .eq("id", membershipRow.id)
          .eq("user_id", viewerId);

        if (updErr) {
          console.log("reopen membership update error:", updErr);
          Alert.alert("Could not rejoin", updErr.message || "Please try again.");
          return;
        }

        await loadMembership(viewerId, churchId);
        Alert.alert("Request sent", "Your request to join has been sent to the church.");
        return;
      }

      const { error: insErr } = await supabase.from("church_memberships").insert({
        user_id: viewerId,
        church_id: churchId,
        status: "pending",
      });

      if (insErr) {
        console.log("handleJoinChurch insert error:", insErr);
        Alert.alert("Could not join", insErr.message || "Please try again.");
        return;
      }

      await loadMembership(viewerId, churchId);
      Alert.alert("Request sent", "Your request to join has been sent to the church.");
    } catch (e) {
      console.log("handleJoinChurch exception:", e);
      Alert.alert("Could not join", e?.message || "Please try again.");
    } finally {
      setMembershipLoading(false);
    }
  }

  async function handleCancelJoinRequest() {
    if (!viewerId) {
      Alert.alert("Please sign in", "You need to be signed in.");
      return;
    }

    if (!churchId) return;
    if (!membershipRow?.id) return;

    try {
      setMembershipLoading(true);

      const { error } = await supabase
        .from("church_memberships")
        .delete()
        .eq("id", membershipRow.id);

      if (error) {
        console.log("cancel request delete error:", error);
        Alert.alert("Could not cancel", error?.message || "Please try again.");
        return;
      }

      setMembershipRow(null);
      setMembershipStatus("none");

      Alert.alert("Cancelled", "Your join request has been cancelled.");
    } catch (e) {
      console.log("cancel request exception:", e);
      Alert.alert("Could not cancel", "Please try again.");
    } finally {
      setMembershipLoading(false);
    }
  }

  async function handleLeaveChurch() {
    if (!viewerId) {
      Alert.alert("Please sign in", "You need to be signed in.");
      return;
    }

    if (!churchId) return;

    if (!membershipRow?.id) {
      Alert.alert("Not linked", "We couldn't find your membership record.");
      return;
    }

    Alert.alert(
      "Leave church",
      "Are you sure you want to leave this church? You can request to rejoin later.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              setMembershipLoading(true);

              const { error } = await supabase.rpc("leave_church", {
                p_membership_id: membershipRow.id,
              });

              if (error) {
                console.log("leave_church rpc error:", error);
                Alert.alert("Could not leave", error.message || "Please try again.");
                return;
              }

              setMembershipRow(null);
              setMembershipStatus("none");

              await loadMembership(viewerId, churchId);

              Alert.alert("Left church", "You have left this church.");
            } catch (e) {
              console.log("leave church exception:", e);
              Alert.alert("Could not leave", e?.message || "Please try again.");
            } finally {
              setMembershipLoading(false);
            }
          },
        },
      ]
    );
  }

async function loadChurchPosts(id, explicitFeedCommunityId = null) {
  try {
    setPostsLoading(true);

    let feedCommunityId = explicitFeedCommunityId || church?.feed_community_id || null;

    if (!feedCommunityId && id) {
      const { data: churchFeedData, error: churchFeedError } = await supabase
        .from("churches")
        .select("feed_community_id")
        .eq("id", id)
        .maybeSingle();

      if (churchFeedError) {
        console.log("loadChurchPosts feed lookup error:", churchFeedError);
      }

      feedCommunityId = churchFeedData?.feed_community_id || null;
    }

    if (!feedCommunityId) {
      console.log("loadChurchPosts missing feed_community_id for church:", id);
      setPosts([]);
      return;
    }

    const { data, error } = await supabase
      .from("posts")
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

    if (error) throw error;

    const mapped =
      (data || []).map((row) => {
        const commentCount =
          Array.isArray(row.post_comments) && row.post_comments.length > 0
            ? row.post_comments[0].count ?? 0
            : 0;

        return {
          id: row.id,
          user_id: row.user_id,
          church_id: row.church_id,
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
  } catch (e) {
    console.log("loadChurchPosts error:", e);
    setPosts([]);
  } finally {
    setPostsLoading(false);
  }
}

async function loadChurchEvents(id, adminOverride = isAdmin) {
  try {
    setChurchEventsLoading(true);

    const res = await fetchUpcomingEventsForChurch({
      churchId: id,
      limit: 6,
      includeInviteOnly: adminOverride === true,
    });

    if (!res?.ok) {
      console.log("ChurchProfilePublic events load error:", res?.error);
      setChurchEvents([]);
      return;
    }

    setChurchEvents(Array.isArray(res.events) ? res.events : []);
  } catch (e) {
    console.log("ChurchProfilePublic events unexpected error:", e);
    setChurchEvents([]);
  } finally {
    setChurchEventsLoading(false);
  }
}



  useFocusEffect(
    useCallback(() => {
      if (!churchId) return;

      rt?.refreshCounts?.();

      loadChurch(churchId);
      loadMemberPreview(churchId);
      loadChurchEvents(churchId, isAdmin);

      (async () => {
        const admin = viewerId ? await checkIsAdmin(viewerId, churchId) : false;

        if (admin) {
          await loadPendingGroupRequestCount(churchId);
        } else {
          setPendingGroupRequestCount(0);
        }

        await loadChurchEvents(churchId, admin);

        if (viewerId && !admin) {
          await loadMembership(viewerId, churchId);
        } else {
          setMembershipRow(null);
          setMembershipStatus(admin ? "approved" : "none");
        }
      })();

      if (POSTS_ENABLED) {
        loadChurchPosts(churchId);
      }
    }, [churchId, viewerId, rt])
  );

  useEffect(() => {
  if (!churchId) return;
  if (activeTab !== "posts") return;

  let channel = null;
  let cancelled = false;

  async function startChurchPostsRealtime() {
    let feedCommunityId = church?.feed_community_id || null;

    if (!feedCommunityId) {
      const { data, error } = await supabase
        .from("churches")
        .select("feed_community_id")
        .eq("id", churchId)
        .maybeSingle();

      if (error) {
        console.log("ChurchProfilePublic realtime feed lookup error:", error);
        return;
      }

      feedCommunityId = data?.feed_community_id || null;
    }

    if (!feedCommunityId || cancelled) return;

    channel = supabase
      .channel(`church-profile-posts-${feedCommunityId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
          filter: `community_id=eq.${feedCommunityId}`,
        },
        () => {
          loadChurchPosts(churchId, feedCommunityId);
        }
      )
      .subscribe((status) => {
        console.log("ChurchProfilePublic posts realtime status:", status);
      });
  }

  startChurchPostsRealtime();

  return () => {
    cancelled = true;

    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}, [churchId, activeTab, church?.feed_community_id]);

  async function uploadImageToChurch(pathPrefix, asset) {
    if (!church?.id) {
      throw new Error("Missing church id for image upload.");
    }

    if (!asset?.base64) {
      throw new Error("No base64 image data found.");
    }

    const contentType = getImageContentType(asset);
    const fileExt = getImageFileExtension(contentType);
    const fileName = `${pathPrefix}-${Date.now()}.${fileExt}`;

    const { data: fnData, error: fnError } = await supabase.functions.invoke(
      "upload-post-image",
      {
        body: {
          base64: asset.base64,
          fileName,
          contentType,
          pathPrefix: `churches/${church.id}/${pathPrefix}`,
        },
      }
    );

    if (fnError) {
      console.log("upload edge function error:", fnError);
      throw fnError;
    }

    if (!fnData?.publicUrl) {
      throw new Error("No publicUrl returned from upload function.");
    }

    return fnData.publicUrl;
  }

  async function handlePickAvatar() {
    if (!isAdmin || !church?.id) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert("Permission needed", "We need access to photos to set an avatar.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];

      if (!asset.base64) {
        Alert.alert("Avatar error", "We couldn't read this image. Try another.");
        return;
      }

      setSavingAvatar(true);

      const publicUrl = await uploadImageToChurch("avatars", asset);

      const { error } = await supabase
        .from("churches")
        .update({ avatar_url: publicUrl })
        .eq("id", church.id);

      if (error) throw error;

      setChurch((prev) => ({ ...(prev || {}), avatar_url: publicUrl }));
    } catch (e) {
      console.log("handlePickAvatar error:", e);

      Alert.alert(
        "Avatar upload failed",
        e?.message || "We couldn't update the church avatar right now."
      );
    } finally {
      setSavingAvatar(false);
    }
  }

  async function handlePickCover() {
    if (!isAdmin || !church?.id) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert("Permission needed", "We need access to photos to set a cover image.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [3, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];

      if (!asset.base64) {
        Alert.alert("Cover error", "We couldn't read this image. Try another.");
        return;
      }

      setSavingCover(true);

      const publicUrl = await uploadImageToChurch("covers", asset);

      const { error } = await supabase
        .from("churches")
        .update({ cover_image_url: publicUrl })
        .eq("id", church.id);

      if (error) throw error;

      setChurch((prev) => ({ ...(prev || {}), cover_image_url: publicUrl }));
    } catch (e) {
      console.log("handlePickCover error:", e);

      Alert.alert(
        "Cover upload failed",
        e?.message || "We couldn't update the cover image right now."
      );
    } finally {
      setSavingCover(false);
    }
  }

  function handleCancelDetailsEdit() {
  setAbout(church?.about ?? "");
  setWebsite(church?.website ?? "");
  setLocation(church?.location ?? "");
  setIsEditingDetails(false);
}

  async function handleSaveDetails() {
    if (!isAdmin || !church?.id) return;

    try {
      setSavingDetails(true);

      const updates = {
        about: about || null,
        website: website || null,
        location: location || null,
      };

      const { error } = await supabase
        .from("churches")
        .update(updates)
        .eq("id", church.id);

      if (error) throw error;

      setChurch((prev) => ({ ...(prev || {}), ...updates }));
      setIsEditingDetails(false);

      Alert.alert("Saved", "Church profile updated.");
    } catch (e) {
      console.log("handleSaveDetails error:", e);
      Alert.alert("Error", "We couldn't save the church profile right now.");
    } finally {
      setSavingDetails(false);
    }
  }

  async function handleCreateChurchPost(content, url, _isAnonymous, media) {
    if (!isAdmin) return;

    if (!content.trim() && !media) {
      Alert.alert("Message required", "Please write something or attach media.");
      return;
    }

    try {
      setPosting(true);

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        Alert.alert("Not signed in", "Please sign in again before posting.");
        return;
      }

      let mediaUrl = null;
      let mediaType = null;

      if (media && media.uri) {
        try {
          const feedCommunityIdForUpload = church?.feed_community_id || null;

          if (!feedCommunityIdForUpload) {
            Alert.alert(
              "Church feed not linked",
              "This church does not have a linked feed yet. Please check the church setup."
            );
            return;
          }

          console.log("ChurchProfilePublic about to upload media:", {
            media,
            userId,
            feedCommunityId: feedCommunityIdForUpload,
          });

          const uploaded = await uploadFeedMedia({
            media,
            scope: "posts",
            ownerId: userId,
            folderId: feedCommunityIdForUpload,
          });

          mediaUrl = uploaded.mediaUrl;
          mediaType = uploaded.mediaType;

          console.log("ChurchProfilePublic media upload complete:", {
            mediaUrl,
            mediaType,
          });
        } catch (e) {
          console.log("ChurchProfilePublic media upload error RAW:", e);

          console.log("ChurchProfilePublic media upload error DETAILS:", {
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

const feedCommunityId = church?.feed_community_id || null;

if (!feedCommunityId) {
  Alert.alert(
    "Church feed not linked",
    "This church does not have a linked feed yet. Please check the church setup."
  );
  return;
}

const payload = {
  user_id: userId,
  community_id: feedCommunityId,
  church_id: churchId,
  visibility: "church",
  is_anonymous: false,
  content: content.trim(),
};

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

          if (!previewError && previewData?.ok) {
            linkPreview = previewData;
          }
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

      if (error) throw error;

      const newPost = { ...data, reactions: [], comment_count: 0 };

      setPosts((prev) => [newPost, ...(prev || [])]);
      setShowNewModal(false);
    } catch (e) {
      console.log("handleCreateChurchPost error:", e);
      Alert.alert("Could not post", e?.message || "Please try again.");
    } finally {
      setPosting(false);
    }
  }

  function handleDeleteChurchPost(postId) {
  if (!isAdmin) {
    Alert.alert("Permission needed", "Only church admins can delete church posts.");
    return;
  }

  if (!postId) return;

  Alert.alert(
    "Delete post?",
    "This will permanently remove this post from the church feed.",
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("posts")
              .delete()
              .eq("id", postId);

            if (error) throw error;

            setPosts((prev) => (prev || []).filter((p) => p.id !== postId));
          } catch (e) {
            console.log("handleDeleteChurchPost error:", e);

            Alert.alert(
              "Could not delete post",
              e?.message || "Please try again."
            );
          }
        },
      },
    ]
  );
}

function handleHideChurchPost() {
  Alert.alert("Not available yet", "Hiding church posts can be added later.");
}

  function openComments(post) {
    setSelectedPostForComments(post);
    setShowCommentsModal(true);
  }

  function handleCommentAdded(postId) {
    setPosts((prev) =>
      (prev || []).map((p) =>
        p.id === postId
          ? { ...p, comment_count: (p.comment_count || 0) + 1 }
          : p
      )
    );
  }

  async function setReaction(postId, newTypeOrNull) {
    if (!viewerId) {
      Alert.alert("Please sign in", "You need to be signed in to react.");
      return;
    }

    const target = (posts || []).find((p) => p.id === postId);
    if (!target) return;

    const existing =
      target.reactions?.find((r) => r.user_id === viewerId) || null;
    const isSame = existing && existing.type === newTypeOrNull;
    const finalType = isSame ? null : newTypeOrNull;

    setPosts((prev) =>
      (prev || []).map((p) => {
        if (p.id !== postId) return p;

        let newReactions = (p.reactions || []).filter(
          (r) => r.user_id !== viewerId
        );

        if (finalType) {
          newReactions = [...newReactions, { user_id: viewerId, type: finalType }];
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
        .eq("user_id", viewerId);

      if (delError) throw delError;

      if (finalType) {
        const { error: insError } = await supabase.from("post_reactions").insert({
          post_id: postId,
          user_id: viewerId,
          type: finalType,
        });

        if (insError && insError.code !== "23505") throw insError;
      }
    } catch (e) {
      console.log("ChurchProfilePublic setReaction error:", e);

      Alert.alert(
        "Reaction failed",
        "We couldn’t update your reaction. It might correct itself on refresh."
      );
    }
  }

  function renderAboutTab() {
  return (
    <View style={{ marginTop: 10 }}>
      <View
        style={{
          ...premiumCardStyle,
          padding: 16,
          borderRadius: 22,
        }}
      >

        {about ? (
          <Text
            style={{
              color: TEXT,
              fontSize: 14,
              fontWeight: "700",
              lineHeight: 21,
            }}
          >
            {about}
          </Text>
        ) : (
          <Text
            style={{
              color: MUTED,
              fontSize: 13,
              fontWeight: "700",
              lineHeight: 19,
            }}
          >
            This church has not added an about section yet.
          </Text>
        )}

        {location ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 14,
            }}
          >
            <Ionicons name="location-outline" size={16} color={OLIVE} />

            <Text
              style={{
                color: MUTED,
                fontSize: 13,
                fontWeight: "800",
                marginLeft: 7,
                flex: 1,
              }}
              numberOfLines={2}
            >
              {location}
            </Text>
          </View>
        ) : null}

        {website ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 10,
            }}
          >
            <Ionicons name="globe-outline" size={16} color={EVENT_AMBER} />

            <Text
              style={{
                color: MUTED,
                fontSize: 13,
                fontWeight: "800",
                marginLeft: 7,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {website}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function renderEventsTab() {
  const screenWidth = Dimensions.get("window").width;
  const carouselCardWidth = Math.min(292, Math.max(252, screenWidth * 0.74));
  const carouselGap = 12;

  const carouselEvents = (churchEvents || []).slice(0, 6);
  const upcomingListEvents = (churchEvents || []).slice(0, 6);

  function openEvent(event) {
    if (!event?.id) return;

    navigation.navigate("EventDetails", {
      eventId: event.id,
      event,
    });
  }

  function openAllEvents() {
    navigation.navigate("Events");
  }

  function openManageEvents() {
    navigation.navigate("ChurchEventsAdmin", {
      churchId,
      churchName,
    });
  }

  function renderCarouselEventCard(event, index) {
    const dateBadge = formatChurchProfileDateBadge(event.start_at);
    const imageUrl =
      getChurchProfileEventImageUrl(event, church) ||
      getChurchProfileFallbackEventImage(event);

    return (
      <Pressable
        key={event.id}
        onPress={() => openEvent(event)}
        style={({ pressed }) => ({
          width: carouselCardWidth,
          marginRight: carouselGap,
          borderRadius: 24,
          overflow: "hidden",
          backgroundColor: SURFACE,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          shadowColor: SHADOW,
          shadowOpacity: pressed ? 0.05 : 0.12,
          shadowRadius: pressed ? 7 : 13,
          shadowOffset: { width: 0, height: pressed ? 3 : 6 },
          elevation: pressed ? 1 : 4,
          opacity: event?.status === "cancelled" ? 0.72 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        })}
      >
        <View
          style={{
            height: 142,
            width: "100%",
            backgroundColor: OLIVE_SOFT,
          }}
        >
          <Image
            source={{ uri: imageUrl }}
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
              backgroundColor: "rgba(0,0,0,0.22)",
            }}
          />

          <View
            style={{
              position: "absolute",
              top: 11,
              left: 11,
              width: 50,
              height: 56,
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.95)",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: SHADOW,
              shadowOpacity: 0.12,
              shadowRadius: 7,
              shadowOffset: { width: 0, height: 3 },
              elevation: 3,
            }}
          >
            <Text
              style={{
                color: TEXT,
                fontSize: 19,
                fontWeight: "900",
                lineHeight: 21,
              }}
              numberOfLines={1}
            >
              {dateBadge.day}
            </Text>

            <Text
              style={{
                color: EVENT_AMBER,
                fontSize: 9.5,
                fontWeight: "900",
                letterSpacing: 0.45,
                marginTop: 1,
              }}
              numberOfLines={1}
            >
              {dateBadge.month}
            </Text>
          </View>

          <View
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: "rgba(255,255,255,0.92)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={getChurchProfileEventIcon(event)}
              size={20}
              color={EVENT_AMBER}
            />
          </View>

          <View
            style={{
              position: "absolute",
              left: 12,
              right: 12,
              bottom: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <View
              style={{
                flexShrink: 1,
                paddingHorizontal: 9,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.94)",
              }}
            >
              <Text
                style={{
                  color:
                    event?.status === "cancelled" ? DANGER_RED : EVENT_BROWN,
                  fontSize: 10,
                  fontWeight: "900",
                  letterSpacing: 0.35,
                  textTransform: "uppercase",
                }}
                numberOfLines={1}
              >
                {getChurchProfileEventLabel(event)}
              </Text>
            </View>

            {index === 0 ? (
              <View
                style={{
                  paddingHorizontal: 9,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.20)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.34)",
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons name="sparkles" size={11} color={SURFACE} />

                <Text
                  style={{
                    color: SURFACE,
                    fontSize: 10,
                    fontWeight: "900",
                    marginLeft: 4,
                  }}
                >
                  Next
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View
          style={{
            paddingHorizontal: 13,
            paddingTop: 12,
            paddingBottom: 13,
            minHeight: 122,
          }}
        >
          <Text
            style={{
              color: TEXT,
              fontSize: 18,
              fontWeight: "900",
              lineHeight: 22,
              letterSpacing: -0.2,
            }}
            numberOfLines={2}
          >
            {event?.title || "Untitled event"}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              marginTop: 9,
            }}
          >
            <Ionicons
              name="time-outline"
              size={14}
              color={EVENT_AMBER}
              style={{ marginTop: 1 }}
            />

            <Text
              style={{
                flex: 1,
                color: EVENT_AMBER,
                fontSize: 12,
                fontWeight: "900",
                lineHeight: 16,
                marginLeft: 6,
              }}
              numberOfLines={2}
            >
              {formatEventDateTime(event.start_at, event.end_at)}
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              marginTop: 6,
            }}
          >
            <Ionicons
              name={event?.online_url ? "videocam-outline" : "location-outline"}
              size={14}
              color={OLIVE}
              style={{ marginTop: 1 }}
            />

            <Text
              style={{
                flex: 1,
                color: MUTED,
                fontSize: 11.5,
                fontWeight: "800",
                lineHeight: 15,
                marginLeft: 6,
              }}
              numberOfLines={1}
            >
              {getChurchProfileEventLocation(event)}
            </Text>
          </View>

          <View
            style={{
              marginTop: 10,
              paddingTop: 9,
              borderTopWidth: 1,
              borderTopColor: "rgba(15, 23, 42, 0.07)",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                color: MUTED,
                fontSize: 11.5,
                fontWeight: "800",
              }}
            >
              {countChurchProfileGoing(event)} going
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  color: OLIVE,
                  fontSize: 11.5,
                  fontWeight: "900",
                  marginRight: 3,
                }}
              >
                Details
              </Text>

              <Ionicons name="chevron-forward" size={14} color={OLIVE} />
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  function renderUpcomingListEvent(event) {
    const dateBadge = formatChurchProfileDateBadge(event.start_at);

    return (
      <Pressable
        key={event.id}
        onPress={() => openEvent(event)}
        style={({ pressed }) => ({
          borderRadius: 20,
          padding: 10,
          backgroundColor: pressed
            ? "rgba(180, 83, 9, 0.06)"
            : "rgba(255, 252, 245, 0.72)",
          borderWidth: 1,
          borderColor: CARD_BORDER,
          flexDirection: "row",
          alignItems: "center",
          opacity: event?.status === "cancelled" ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        })}
      >
        <View
          style={{
            width: 74,
            height: 74,
            borderRadius: 17,
            overflow: "hidden",
            backgroundColor: OLIVE_SOFT,
            marginRight: 11,
          }}
        >
          <Image
            source={{
              uri:
                getChurchProfileEventImageUrl(event, church) ||
                getChurchProfileFallbackEventImage(event),
            }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />

          <View
            style={{
              position: "absolute",
              left: 6,
              top: 6,
              borderRadius: 10,
              paddingHorizontal: 6,
              paddingVertical: 4,
              backgroundColor: "rgba(255,255,255,0.94)",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: TEXT,
                fontSize: 13,
                fontWeight: "900",
                lineHeight: 15,
              }}
            >
              {dateBadge.day}
            </Text>

            <Text
              style={{
                color: EVENT_AMBER,
                fontSize: 8.5,
                fontWeight: "900",
              }}
            >
              {dateBadge.month}
            </Text>
          </View>
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              color: TEXT,
              fontSize: 14.5,
              fontWeight: "900",
              lineHeight: 19,
            }}
            numberOfLines={2}
          >
            {event?.title || "Untitled event"}
          </Text>

          <Text
            style={{
              color: EVENT_AMBER,
              fontSize: 12,
              fontWeight: "900",
              lineHeight: 17,
              marginTop: 4,
            }}
            numberOfLines={1}
          >
            {formatEventDateTime(event.start_at, event.end_at)}
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 11.5,
              fontWeight: "800",
              lineHeight: 16,
              marginTop: 3,
            }}
            numberOfLines={1}
          >
            {getChurchProfileEventLocation(event)}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={17}
          color={OLIVE}
          style={{ marginLeft: 7 }}
        />
      </Pressable>
    );
  }

  return (
    <View style={{ marginTop: 10 }}>
      <View
        style={{
          ...premiumCardStyle,
          paddingVertical: 16,
          borderRadius: 24,
        }}
      >
        {churchEventsLoading ? (
          <View style={{ paddingVertical: 28, alignItems: "center" }}>
            <ActivityIndicator color={EVENT_AMBER} />

            <Text
              style={{
                color: MUTED,
                marginTop: 9,
                fontWeight: "800",
              }}
            >
              Loading church events…
            </Text>
          </View>
        ) : null}

        {!churchEventsLoading && carouselEvents.length === 0 ? (
          <View
            style={{
              alignItems: "center",
              paddingVertical: 18,
              paddingHorizontal: 16,
            }}
          >
            <PremiumSparkIcon amber size={48} />

            <Text
              style={{
                ...serifHeading,
                fontSize: 21,
                lineHeight: 26,
                textAlign: "center",
                marginTop: 12,
              }}
            >
              No upcoming events yet
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 13,
                fontWeight: "700",
                lineHeight: 19,
                textAlign: "center",
                marginTop: 6,
              }}
            >
              When this church publishes services, courses or gatherings, they’ll appear here.
            </Text>

            {isAdmin ? (
              <Pressable
                onPress={openManageEvents}
                style={({ pressed }) => ({
                  marginTop: 14,
                  borderRadius: 999,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  backgroundColor: pressed ? AMBER_SOFT : EVENT_AMBER,
                  borderWidth: 1,
                  borderColor: AMBER_BORDER,
                })}
              >
                <Text
                  style={{
                    color: SURFACE,
                    fontSize: 13,
                    fontWeight: "900",
                  }}
                >
                  Manage events
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {!churchEventsLoading && carouselEvents.length > 0 ? (
          <>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                paddingHorizontal: 16,
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: AMBER_SOFT,
                  borderWidth: 1,
                  borderColor: AMBER_BORDER,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 9,
                  marginTop: 1,
                }}
              >
                <Ionicons name="sparkles-outline" size={17} color={EVENT_AMBER} />
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    color: TEXT,
                    fontSize: 20,
                    fontWeight: "900",
                    lineHeight: 24,
                    letterSpacing: -0.25,
                  }}
                  numberOfLines={1}
                >
                  Coming up
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 12.5,
                    fontWeight: "700",
                    lineHeight: 17,
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  Swipe through the next events
                </Text>
              </View>

              <View
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 9,
                  paddingVertical: 6,
                  backgroundColor: OLIVE_SOFT,
                  borderWidth: 1,
                  borderColor: OLIVE_BORDER,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: OLIVE,
                    fontSize: 11,
                    fontWeight: "900",
                    marginRight: 4,
                  }}
                >
                  Swipe
                </Text>

                <Ionicons name="arrow-forward" size={13} color={OLIVE} />
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={carouselCardWidth + carouselGap}
              decelerationRate="fast"
              contentContainerStyle={{
                paddingLeft: 16,
                paddingRight: 28,
              }}
            >
              {carouselEvents.map(renderCarouselEventCard)}
            </ScrollView>

            <View style={{ marginTop: 20, paddingHorizontal: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  marginBottom: 10,
                  paddingHorizontal: 2,
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: OLIVE_SOFT,
                    borderWidth: 1,
                    borderColor: OLIVE_BORDER,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 8,
                    marginTop: 1,
                  }}
                >
                  <Ionicons name="calendar-clear-outline" size={15} color={OLIVE} />
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      color: TEXT,
                      fontSize: 17,
                      fontWeight: "900",
                      lineHeight: 22,
                    }}
                    numberOfLines={2}
                  >
                    Upcoming at {churchName}
                  </Text>

                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 12,
                      fontWeight: "700",
                      lineHeight: 16,
                      marginTop: 2,
                    }}
                    numberOfLines={1}
                  >
                    More services, courses and gatherings
                  </Text>
                </View>
              </View>

              <View style={{ gap: 10 }}>
                {upcomingListEvents.map(renderUpcomingListEvent)}
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                gap: 10,
                marginTop: 16,
                paddingHorizontal: 16,
              }}
            >
              <Pressable
                onPress={openAllEvents}
                style={({ pressed }) => ({
                  flex: 1,
                  borderRadius: 999,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  backgroundColor: pressed
                    ? "rgba(180, 83, 9, 0.86)"
                    : EVENT_AMBER,
                  borderWidth: 1,
                  borderColor: EVENT_AMBER,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                })}
              >
                <Text
                  style={{
                    color: SURFACE,
                    fontSize: 13,
                    fontWeight: "900",
                    marginRight: 6,
                  }}
                >
                  View all events
                </Text>

                <Ionicons name="calendar-outline" size={16} color={SURFACE} />
              </Pressable>

              {isAdmin ? (
                <Pressable
                  onPress={openManageEvents}
                  style={({ pressed }) => ({
                    borderRadius: 999,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
                    borderWidth: 1,
                    borderColor: OLIVE_BORDER,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                  })}
                >
                  <Text
                    style={{
                      color: OLIVE,
                      fontSize: 13,
                      fontWeight: "900",
                      marginRight: 6,
                    }}
                  >
                    Manage
                  </Text>

                  <Ionicons name="settings-outline" size={16} color={OLIVE} />
                </Pressable>
              ) : null}
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

    function renderPostsTab() {
    if (!POSTS_ENABLED) {
      return (
        <View style={{ marginTop: 10 }}>
          <Text
            style={{
              color: MUTED,
              fontWeight: "700",
              lineHeight: 19,
            }}
          >
            Church posts are coming soon.
          </Text>
        </View>
      );
    }

    return (
      <View style={{ marginTop: 10 }}>
        {isAdmin ? (
          <View
            style={{
              ...premiumCardStyle,
              padding: 12,
              marginBottom: 12,
              borderRadius: 20,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {church?.avatar_url ? (
                <Image
                  source={{ uri: church.avatar_url }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    marginRight: 10,
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                    backgroundColor: OLIVE_SOFT,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: OLIVE_SOFT,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 10,
                    borderWidth: 1,
                    borderColor: OLIVE_BORDER,
                  }}
                >
                  <Text
                    style={{
                      color: OLIVE,
                      fontWeight: "900",
                    }}
                  >
                    {initials}
                  </Text>
                </View>
              )}

              <Pressable
                onPress={() => setShowNewModal(true)}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: pressed
                    ? "rgba(79, 99, 59, 0.08)"
                    : "rgba(255, 252, 245, 0.80)",
                  borderRadius: 999,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                })}
              >
                <Text
                  style={{
                    color: MUTED,
                    fontSize: 14,
                    fontWeight: "700",
                  }}
                  numberOfLines={1}
                >
                  Share an update with your church…
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setShowNewModal(true)}
                hitSlop={8}
                style={({ pressed }) => ({
                  marginLeft: 10,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: pressed ? AMBER_SOFT : AMBER_SOFT,
                  borderWidth: 1,
                  borderColor: AMBER_BORDER,
                  alignItems: "center",
                  justifyContent: "center",
                })}
              >
                <Ionicons name="camera-outline" size={18} color={EVENT_AMBER} />
              </Pressable>
            </View>
          </View>
        ) : null}

        {postsLoading ? (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
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
        ) : null}

        {!postsLoading && (posts || []).length === 0 ? (
          <View
            style={{
              alignItems: "center",
              paddingVertical: 18,
            }}
          >
            <PremiumSparkIcon amber={false} size={48} />

            <Text
              style={{
                color: TEXT,
                fontSize: 16,
                fontWeight: "900",
                marginTop: 10,
              }}
            >
              No posts yet
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 13,
                fontWeight: "700",
                textAlign: "center",
                lineHeight: 18,
                marginTop: 4,
              }}
            >
              Church updates and encouragement will appear here.
            </Text>
          </View>
        ) : null}

        {(posts || []).map((p) => (
          <View key={p.id} style={{ marginBottom: 10 }}>
<PostCard
  post={p}
  currentUserId={viewerId}
  author={{
    id: churchId,
    name: churchName,
    avatarUrl: church?.avatar_url || null,
    isAnonymous: false,
    isOwner: !!isAdmin,
  }}
  onPressAvatar={() => {}}
  onDelete={(postId) => handleDeleteChurchPost(postId)}
  onHide={() => handleHideChurchPost()}
  onOpenComments={(post) => openComments(post)}
  onShare={null}
  onSetReaction={(postId, typeOrNull) =>
    setReaction(postId, typeOrNull)
  }
  reactionPickerForPost={reactionPickerForPost}
  setReactionPickerForPost={setReactionPickerForPost}
  preferInAppYouTube={true}
/>
          </View>
        ))}
      </View>
    );
  }

  function renderNoticeboardTab() {
    return (
<ChurchNoticeboardPanel
  churchId={churchId}
  bottomPad={0}
  showHeader={false}
  embedded={true}
  isAdminOverride={isAdmin}
/>
    );
  }

  function renderMembershipPanel() {
    if (isDefaultTriunelyChurch) {
      return (
        <View
          style={{
            ...premiumCardStyle,
            padding: 15,
            marginTop: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <PremiumSparkIcon size={42} amber />

            <View style={{ flex: 1, marginLeft: 11 }}>
              <Text
                style={{
                  color: TEXT,
                  fontWeight: "900",
                  fontSize: 15,
                  lineHeight: 20,
                }}
              >
                Want to add your local church?
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontWeight: "700",
                  fontSize: 13,
                  lineHeight: 18,
                  marginTop: 4,
                }}
              >
                You’re currently viewing Triunely Church. You can search and add
                your local church as well.
              </Text>

              <Pressable
                onPress={() => navigation.navigate("ChurchFind")}
                style={({ pressed }) => ({
                  marginTop: 12,
                  borderRadius: 999,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  backgroundColor: pressed
                    ? "rgba(180, 83, 9, 0.88)"
                    : EVENT_AMBER,
                  alignSelf: "flex-start",
                })}
              >
                <Text
                  style={{
                    color: SURFACE,
                    fontSize: 13,
                    fontWeight: "900",
                  }}
                >
                  Find your church
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      );
    }

    if (isAdmin) return null;

    return (
      <View style={{ marginTop: 12 }}>
        {membershipLoading ? (
          <View
            style={{
              ...premiumCardStyle,
              padding: 13,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="small" color={EVENT_AMBER} />

            <Text
              style={{
                color: MUTED,
                marginLeft: 10,
                fontWeight: "800",
              }}
            >
              Checking membership…
            </Text>
          </View>
        ) : membershipStatus === "approved" ? (
          <View
            style={{
              ...premiumCardStyle,
              padding: 14,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <PremiumSparkIcon size={42} amber={false} />

              <View style={{ flex: 1, marginLeft: 11 }}>
                <Text
                  style={{
                    color: OLIVE,
                    fontWeight: "900",
                    fontSize: 15,
                  }}
                >
                  Member
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    marginTop: 4,
                    fontWeight: "700",
                    lineHeight: 18,
                  }}
                >
                  You’re linked to this church.
                </Text>

                <Pressable
                  onPress={handleLeaveChurch}
                  disabled={membershipLoading}
                  style={({ pressed }) => ({
                    marginTop: 11,
                    borderRadius: 999,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    backgroundColor: pressed
                      ? "rgba(153, 27, 27, 0.08)"
                      : SURFACE,
                    borderWidth: 1,
                    borderColor: "rgba(153, 27, 27, 0.22)",
                    opacity: membershipLoading ? 0.6 : 1,
                    alignSelf: "flex-start",
                  })}
                >
                  <Text
                    style={{
                      color: DANGER_RED,
                      fontSize: 13,
                      fontWeight: "900",
                    }}
                  >
                    Leave church
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : membershipStatus === "pending" ? (
          <View
            style={{
              ...premiumCardStyle,
              padding: 14,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <PremiumSparkIcon size={42} amber />

              <View style={{ flex: 1, marginLeft: 11 }}>
                <Text
                  style={{
                    color: EVENT_BROWN,
                    fontWeight: "900",
                    fontSize: 15,
                  }}
                >
                  Request pending
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    marginTop: 4,
                    fontWeight: "700",
                    lineHeight: 18,
                  }}
                >
                  Your join request is waiting for approval.
                </Text>

                <Pressable
                  onPress={handleCancelJoinRequest}
                  style={({ pressed }) => ({
                    marginTop: 11,
                    borderRadius: 999,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    backgroundColor: pressed ? AMBER_SOFT : SURFACE,
                    borderWidth: 1,
                    borderColor: AMBER_BORDER,
                    alignSelf: "flex-start",
                  })}
                >
                  <Text
                    style={{
                      color: EVENT_BROWN,
                      fontSize: 13,
                      fontWeight: "900",
                    }}
                  >
                    Cancel request
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={handleJoinChurch}
            style={({ pressed }) => ({
              borderRadius: 18,
              paddingVertical: 13,
              paddingHorizontal: 14,
              backgroundColor: pressed
                ? "rgba(180, 83, 9, 0.88)"
                : EVENT_AMBER,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              shadowColor: EVENT_AMBER,
              shadowOpacity: 0.18,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 3,
            })}
          >
            <Ionicons name="add-circle-outline" size={18} color={SURFACE} />

            <Text
              style={{
                color: SURFACE,
                fontSize: 14,
                fontWeight: "900",
              }}
            >
              Join this church
            </Text>
          </Pressable>
        )}
      </View>
    );
  }

function renderDetailsPreview() {
  return (
    <View
      style={{
        marginTop: 12,
      }}
    >
      <Text
        style={{
          color: MUTED,
          fontSize: 13.5,
          fontWeight: "700",
          lineHeight: 20,
        }}
        numberOfLines={2}
      >
        A digital home for {churchName}, helping church life continue beyond Sunday.
      </Text>

      <MemberPreviewStack members={memberPreview} total={memberCount} />

      {checkingAdmin ? (
        <Text
          style={{
            color: MUTED,
            fontSize: 12.5,
            fontWeight: "700",
            marginTop: 8,
          }}
        >
          Checking admin permissions…
        </Text>
      ) : null}
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
          Loading church…
        </Text>
      </View>
    );
  }

  if (!church) {
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
          <PremiumSparkIcon size={52} amber />

          <Text
            style={{
              ...serifHeading,
              fontSize: 22,
              lineHeight: 27,
              textAlign: "center",
              marginTop: 12,
            }}
          >
            Church not found
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
            We couldn’t load this church profile.
          </Text>

          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => ({
              marginTop: 16,
              borderRadius: 999,
              paddingHorizontal: 15,
              paddingVertical: 10,
              backgroundColor: pressed ? AMBER_SOFT : SURFACE,
              borderWidth: 1,
              borderColor: AMBER_BORDER,
            })}
          >
            <Text
              style={{
                color: EVENT_BROWN,
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
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text
  style={{
    ...serifHeading,
    fontSize: 30,
    lineHeight: 35,
    flexShrink: 1,
  }}
  numberOfLines={1}
  adjustsFontSizeToFit
  minimumFontScale={0.78}
>
  My Church
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
                  Church life & ministry
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
                <Pressable
                  onPress={() => navigation.navigate("MessagesInbox")}
                  style={iconButtonStyle}
                  hitSlop={8}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={21}
                    color={OLIVE}
                  />

                  {unreadMessageCount > 0 && (
                    <View style={iconBadgeStyle}>
                      <Text style={iconBadgeTextStyle}>
                        {unreadMessageCount > 99
                          ? "99+"
                          : String(unreadMessageCount)}
                      </Text>
                    </View>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => navigation.navigate("Notifications")}
                  style={iconButtonStyle}
                  hitSlop={8}
                >
                  <Ionicons
                    name="notifications-outline"
                    size={21}
                    color={OLIVE}
                  />

                  {unreadNotificationCount > 0 && (
                    <View style={iconBadgeStyle}>
                      <Text style={iconBadgeTextStyle}>
                        {unreadNotificationCount > 99
                          ? "99+"
                          : String(unreadNotificationCount)}
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

                  {pendingFellowshipCount > 0 && (
                    <View style={iconBadgeStyle}>
                      <Text style={iconBadgeTextStyle}>
                        {pendingFellowshipCount > 99
                          ? "99+"
                          : String(pendingFellowshipCount)}
                      </Text>
                    </View>
                  )}
                </Pressable>

                <SearchLaunchButton navigation={navigation} />

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
                {church.cover_image_url ? (
                  <Image
                    source={{ uri: church.cover_image_url }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      flex: 1,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: OLIVE_SOFT,
                      paddingHorizontal: 22,
                    }}
                  >
                    <PremiumSparkIcon amber={false} size={48} />

                    <Text
                      style={{
                        color: OLIVE,
                        fontSize: 12.5,
                        fontWeight: "800",
                        textAlign: "center",
                        marginTop: 8,
                      }}
                    >
                      Add a background image to personalise this page.
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

                {isAdmin ? (
                  <Pressable
                    onPress={handlePickCover}
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
                ) : null}
              </View>

              <View style={{ paddingHorizontal: 18 }}>
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
                    {church.avatar_url ? (
                      <Image
                        source={{ uri: church.avatar_url }}
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

                    {isAdmin ? (
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
                    ) : null}
                  </View>

                  <View>
                    <View
  style={{
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  }}
>
  <View
    style={{
      flexDirection: "row",
      alignItems: "flex-start",
      flex: 1,
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
  numberOfLines={2}
  adjustsFontSizeToFit
  minimumFontScale={0.78}
>
  {churchName}
</Text>

                        {isVerified ? (
                          <View style={{ marginLeft: 7 }}>
                            <VerifiedBadge size={17} />
                          </View>
                        ) : null}
                      </View>

                      {!isAdmin ? <PremiumSparkIcon size={38} amber /> : null}
                    </View>

                  <View
  style={{
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 12,
  }}
>
  <View style={{ flex: 1, minWidth: 0 }}>
    {renderDetailsPreview()}
  </View>

  {isAdmin ? (
    <Pressable
      onPress={() => navigation.navigate("ChurchAdminHub", { churchId: church.id })}
      style={({ pressed }) => ({
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 7,
        backgroundColor: pressed
          ? "rgba(180, 83, 9, 0.88)"
          : EVENT_AMBER,
        borderWidth: 1,
        borderColor: EVENT_AMBER,
        shadowColor: EVENT_AMBER,
        shadowOpacity: 0.12,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
      })}
      hitSlop={8}
    >
      <Text
        style={{
          color: SURFACE,
          fontSize: 11.5,
          fontWeight: "900",
          letterSpacing: 0.2,
        }}
      >
        Admin
      </Text>
    </Pressable>
  ) : null}
</View>

{renderMembershipPanel()}
                  </View>
                </View>
              </View>
            </View>

            <View style={{ paddingHorizontal: 18 }}>
              {canSeeChurchLife ? (
                <View
                  style={{
                    ...premiumCardStyle,
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <PremiumSectionHeader
                    title="Church Life"
                    subtitle="Groups, updates, giving and ways to connect"
                    icon="sparkles-outline"
                    amber
                  />
<View
  style={{
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  }}
>
                    <ChurchActionCard
                      icon="megaphone-outline"
                      title="Noticeboard"
                      subtitle="Church updates, announcements, serving needs and practical notices."
                      tint="olive"
                      onPress={() =>
                        navigation.navigate("ChurchNoticeboard", {
                          churchId,
                          churchName,
                        })
                      }
                    />

                    <ChurchActionCard
                      icon="people-outline"
                      title="Groups"
                      subtitle={
                        isAdmin && pendingGroupRequestCount > 0
                          ? `${pendingGroupRequestCount} group request${
                              pendingGroupRequestCount === 1 ? "" : "s"
                            } need review.`
                          : "Tables, Bible studies, prayer groups and smaller discipleship spaces."
                      }
                      onPress={() =>
                        navigation.navigate("ChurchGroupsMember", {
                          churchId,
                          churchName,
                        })
                      }
                    />

                    <ChurchActionCard
                      icon="heart-outline"
                      title="Giving"
                      subtitle="Support mission, outreach, community needs and church life."
                      onPress={() =>
                        navigation.navigate("ChurchGiving", {
                          churchId,
                          churchName,
                        })
                      }
                    />

                    <ChurchActionCard
                      icon="mail-outline"
                      title="Message"
                      subtitle="Contact your church leadership or admin team directly."
                      tint="olive"
                      onPress={handleMessageChurch}
                    />
                  </View>
                </View>
              ) : null}

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
    icon="information-circle-outline"
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
    icon="chatbubble-ellipses-outline"
    active={activeTab === "posts"}
    onPress={() => setActiveTab("posts")}
  />
</View>

              <View
                style={{
                  ...premiumCardStyle,
                  padding: 16,
                  marginBottom: 24,
                }}
              >
{activeTab === "about" ? (
  <>
    <PremiumSectionHeader
      title="About"
      subtitle="Learn more about this church"
      icon="information-circle-outline"
      amber={false}
      actionLabel={isAdmin && !isEditingDetails ? "Edit" : null}
      onAction={() => {
        setAbout(church?.about ?? "");
        setWebsite(church?.website ?? "");
        setLocation(church?.location ?? "");
        setIsEditingDetails(true);
      }}
    />
    {renderAboutTab()}
  </>
) : activeTab === "events" ? (
  <>
    <PremiumSectionHeader
      title="Events"
      subtitle="Services, courses and gatherings coming up."
      icon="calendar-outline"
      amber
      actionLabel={isAdmin ? "Manage" : undefined}
      onAction={
        isAdmin
          ? () =>
              navigation.navigate("ChurchEventsAdmin", {
                churchId,
                churchName,
              })
          : undefined
      }
    />
    {renderEventsTab()}
  </>
) : (
  <>
    <PremiumSectionHeader
      title="Church posts"
      subtitle="Encouragement, updates and media from the church"
      icon="chatbubble-ellipses-outline"
      amber
    />
    {renderPostsTab()}
  </>
)}
              </View>
            </View>
          </ScrollView>

          <NewPostModal
            visible={showNewModal}
            onClose={() => {
              if (!posting) setShowNewModal(false);
            }}
            onSubmit={handleCreateChurchPost}
            loading={posting}
          />

          <PostCommentsModal
            visible={showCommentsModal}
            onClose={() => setShowCommentsModal(false)}
            post={selectedPostForComments}
            currentUserId={viewerId}
            onCommentAdded={handleCommentAdded}
          />

          <Modal
            visible={showAdminMenu}
            transparent
            animationType="fade"
            onRequestClose={() => setShowAdminMenu(false)}
          >
            <Pressable
              onPress={() => setShowAdminMenu(false)}
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.62)",
                justifyContent: "flex-end",
              }}
            >
              <Pressable
                onPress={() => {}}
                style={{
                  backgroundColor: PREMIUM_CREAM,
                  padding: 18,
                  borderTopLeftRadius: 26,
                  borderTopRightRadius: 26,
                }}
              >
                <PremiumSectionHeader
                  title="Church Admin"
                  subtitle="Quick access to church tools"
                  icon="shield-checkmark-outline"
                  amber
                />

                <Pressable
                  onPress={() => {
                    setShowAdminMenu(false);
                    navigation.navigate("ChurchAdminHub", { churchId: church.id });
                  }}
                  style={({ pressed }) => ({
                    borderRadius: 16,
                    paddingVertical: 13,
                    paddingHorizontal: 14,
                    backgroundColor: pressed
                      ? "rgba(180, 83, 9, 0.88)"
                      : EVENT_AMBER,
                    marginBottom: 10,
                  })}
                >
                  <Text
                    style={{
                      color: SURFACE,
                      fontSize: 14,
                      fontWeight: "900",
                      textAlign: "center",
                    }}
                  >
                    Open Admin Hub
                  </Text>
                </Pressable>

                {[
                  {
                    label: "Edit Church Profile",
                    action: () => navigation.navigate("ChurchEdit", { churchId: church.id }),
                  },
                  {
                    label: "Edit Noticeboard",
                    action: () =>
                      navigation.navigate("ChurchNoticeboard", { churchId: church.id }),
                  },
                  {
                    label: "Weekly Message",
                    action: () =>
                      navigation.navigate("WeeklyMessageEditor", { churchId: church.id }),
                  },
                  {
                    label: "Weekly Challenge",
                    action: () =>
                      navigation.navigate("WeeklyChallengeEditor", { churchId: church.id }),
                  },
                  {
                    label: "Edit Church Details",
                    action: () => setIsEditingDetails(true),
                  },
                ].map((item) => (
                  <Pressable
                    key={item.label}
                    onPress={() => {
                      setShowAdminMenu(false);
                      item.action();
                    }}
                    style={({ pressed }) => ({
                      borderRadius: 16,
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
                      borderWidth: 1,
                      borderColor: CARD_BORDER,
                      marginBottom: 10,
                    })}
                  >
                    <Text
                      style={{
                        color: OLIVE,
                        fontSize: 14,
                        fontWeight: "900",
                        textAlign: "center",
                      }}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </Pressable>
            </Pressable>
          </Modal>

<Modal
  visible={isEditingDetails}
  transparent
  animationType="slide"
  onRequestClose={handleCancelDetailsEdit}
>
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
  >
    <View
      style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.70)",
        justifyContent: "flex-end",
      }}
    >
      <View
        style={{
          backgroundColor: PREMIUM_CREAM,
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          paddingHorizontal: 18,
          paddingTop: 18,
          paddingBottom: 26,
          maxHeight: "86%",
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
                    Edit Church Details
                  </Text>

                  <Pressable
                    onPress={() => setIsEditingDetails(false)}
                    style={({ pressed }) => ({
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
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

                <ScrollView
  keyboardShouldPersistTaps="handled"
  showsVerticalScrollIndicator={false}
  contentContainerStyle={{
    paddingBottom: 34,
  }}
>
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
                    About
                  </Text>

                  <TextInput
                    value={about}
                    onChangeText={setAbout}
                    placeholder="Tell people about your church…"
                    placeholderTextColor="rgba(107, 114, 128, 0.75)"
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    style={{
                      minHeight: 120,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: CARD_BORDER,
                      backgroundColor: SURFACE,
                      paddingHorizontal: 13,
                      paddingVertical: 12,
                      color: TEXT,
                      fontSize: 14,
                      fontWeight: "700",
                      lineHeight: 20,
                    }}
                  />

                  <View style={{ height: 14 }} />

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
                    Location
                  </Text>

                  <TextInput
                    value={location}
                    onChangeText={setLocation}
                    placeholder="e.g. Southampton"
                    placeholderTextColor="rgba(107, 114, 128, 0.75)"
                    style={{
                      minHeight: 48,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: CARD_BORDER,
                      backgroundColor: SURFACE,
                      paddingHorizontal: 13,
                      color: TEXT,
                      fontSize: 14,
                      fontWeight: "700",
                    }}
                  />

                  <View style={{ height: 14 }} />

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
                    Website
                  </Text>

                  <TextInput
                    value={website}
                    onChangeText={setWebsite}
                    placeholder="https://..."
                    placeholderTextColor="rgba(107, 114, 128, 0.75)"
                    style={{
                      minHeight: 48,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: CARD_BORDER,
                      backgroundColor: SURFACE,
                      paddingHorizontal: 13,
                      color: TEXT,
                      fontSize: 14,
                      fontWeight: "700",
                    }}
                  />

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "flex-end",
                      gap: 9,
                      marginTop: 16,
                    }}
                  >
<Pressable
  onPress={handleCancelDetailsEdit}
  disabled={savingDetails}
                      style={({ pressed }) => ({
                        borderRadius: 999,
                        paddingHorizontal: 14,
                        paddingVertical: 11,
                        backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
                        borderWidth: 1,
                        borderColor: OLIVE_BORDER,
                        opacity: savingDetails ? 0.65 : 1,
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
                      onPress={handleSaveDetails}
                      disabled={savingDetails}
                      style={({ pressed }) => ({
                        borderRadius: 999,
                        paddingHorizontal: 15,
                        paddingVertical: 11,
                        backgroundColor: pressed
                          ? "rgba(180, 83, 9, 0.88)"
                          : EVENT_AMBER,
                        opacity: savingDetails ? 0.7 : 1,
                      })}
                    >
                      <Text
                        style={{
                          color: SURFACE,
                          fontSize: 13,
                          fontWeight: "900",
                        }}
                      >
                        {savingDetails ? "Saving…" : "Save"}
                      </Text>
                    </Pressable>
                  </View>
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        </>
      )}
    </Screen>
  );
}