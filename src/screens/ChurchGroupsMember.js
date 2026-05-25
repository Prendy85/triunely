// src/screens/ChurchGroupsMember.js
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";
import { theme } from "../theme/theme";

const HEAVENLY_GOLD = "#D99400";
const DEEP_OLIVE = "#4F633B";
const SOFT_GOLD_BG = "rgba(217, 148, 0, 0.10)";
const SOFT_OLIVE_BG = "rgba(79, 99, 59, 0.10)";
const CARD_BORDER = "rgba(217, 148, 0, 0.18)";
const GROUP_VISUALS = {
  tables: {
    image:
      "https://images.unsplash.com/photo-1528605248644-14dd04022da1?q=80&w=1200&auto=format&fit=crop",
    icon: "restaurant-outline",
    tone: "olive",
  },
  "bible studies": {
    image:
      "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?q=80&w=1200&auto=format&fit=crop",
    icon: "book-outline",
    tone: "olive",
  },
  "prayer groups": {
    image:
      "https://images.unsplash.com/photo-1507692049790-de58290a4334?q=80&w=1200&auto=format&fit=crop",
    icon: "hand-left-outline",
    tone: "gold",
  },
  "men’s groups": {
    image:
      "https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=1200&auto=format&fit=crop",
    icon: "people-outline",
    tone: "olive",
  },
  "mens groups": {
    image:
      "https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=1200&auto=format&fit=crop",
    icon: "people-outline",
    tone: "olive",
  },
  "women’s groups": {
    image:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=1200&auto=format&fit=crop",
    icon: "heart-outline",
    tone: "gold",
  },
  "womens groups": {
    image:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=1200&auto=format&fit=crop",
    icon: "heart-outline",
    tone: "gold",
  },
  "young adults": {
    image:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=1200&auto=format&fit=crop",
    icon: "sparkles-outline",
    tone: "gold",
  },
};

const DEFAULT_GROUP_VISUAL = {
  image:
    "https://images.unsplash.com/photo-1528605248644-14dd04022da1?q=80&w=1200&auto=format&fit=crop",
  icon: "people-outline",
  tone: "olive",
};

const FILTERS = [
  {
    key: "joined",
    label: "My Groups",
    icon: "checkmark-circle-outline",
    description: "Groups you’re in",
  },
  {
    key: "invited",
    label: "Invites",
    icon: "mail-unread-outline",
    description: "Awaiting your reply",
  },
  {
    key: "pending",
    label: "Pending",
    icon: "time-outline",
    description: "Waiting approval",
  },
  {
    key: "suggested",
    label: "Suggested",
    icon: "sparkles-outline",
    description: "Open to request",
  },
];

function safeInitials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name).trim()[0]?.toUpperCase() || "?";
}

function getGroupVisual(group) {
  const rawType = String(group?.type || "").trim().toLowerCase();
  const rawName = String(group?.name || "").trim().toLowerCase();
  const rawDescription = String(group?.description || "").trim().toLowerCase();
  const rawAudience = String(group?.audience || "").trim().toLowerCase();

  const haystack = `${rawName} ${rawDescription} ${rawType} ${rawAudience}`;

  // Very specific matching first
  if (
    haystack.includes("pool") ||
    haystack.includes("billiard") ||
    haystack.includes("snooker")
  ) {
    return {
      image:
        "https://images.unsplash.com/photo-1606167668584-78701c57f13d?q=80&w=1200&auto=format&fit=crop",
      icon: "ellipse-outline",
      tone: "olive",
      label: "Social",
    };
  }

  if (
    haystack.includes("business") ||
    haystack.includes("work") ||
    haystack.includes("entrepreneur") ||
    haystack.includes("marketplace")
  ) {
    return {
      image:
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop",
      icon: "briefcase-outline",
      tone: "olive",
      label: "Business",
    };
  }

  if (
    haystack.includes("bible") ||
    haystack.includes("scripture") ||
    haystack.includes("study")
  ) {
    return {
      image:
        "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?q=80&w=1200&auto=format&fit=crop",
      icon: "book-outline",
      tone: "olive",
      label: "Bible Study",
    };
  }

  if (
    haystack.includes("prayer") &&
    (haystack.includes("women") ||
      haystack.includes("woman") ||
      haystack.includes("ladies"))
  ) {
    return {
      image:
        "https://images.unsplash.com/photo-1507692049790-de58290a4334?q=80&w=1200&auto=format&fit=crop",
      icon: "hand-left-outline",
      tone: "gold",
      label: "Women’s Prayer",
    };
  }

  if (
    haystack.includes("prayer") &&
    (haystack.includes("men") ||
      haystack.includes("mens") ||
      haystack.includes("men’s"))
  ) {
    return {
      image:
        "https://images.unsplash.com/photo-1507692049790-de58290a4334?q=80&w=1200&auto=format&fit=crop",
      icon: "hand-left-outline",
      tone: "gold",
      label: "Men’s Prayer",
    };
  }

  if (haystack.includes("prayer")) {
    return {
      image:
        "https://images.unsplash.com/photo-1507692049790-de58290a4334?q=80&w=1200&auto=format&fit=crop",
      icon: "hand-left-outline",
      tone: "gold",
      label: "Prayer",
    };
  }

  if (
    haystack.includes("young") ||
    haystack.includes("youth") ||
    haystack.includes("teen") ||
    haystack.includes("student")
  ) {
    return {
      image:
        "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=1200&auto=format&fit=crop",
      icon: "sparkles-outline",
      tone: "gold",
      label: "Young Adults",
    };
  }

  if (
    haystack.includes("men") ||
    haystack.includes("mens") ||
    haystack.includes("men’s") ||
    haystack.includes("brothers") ||
    haystack.includes("geezer")
  ) {
    return {
      image:
        "https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=1200&auto=format&fit=crop",
      icon: "people-outline",
      tone: "olive",
      label: "Men",
    };
  }

  if (
    haystack.includes("women") ||
    haystack.includes("woman") ||
    haystack.includes("womens") ||
    haystack.includes("women’s") ||
    haystack.includes("ladies") ||
    haystack.includes("sisters")
  ) {
    return {
      image:
        "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=1200&auto=format&fit=crop",
      icon: "heart-outline",
      tone: "gold",
      label: "Women",
    };
  }

  if (
    haystack.includes("table") ||
    haystack.includes("meal") ||
    haystack.includes("food") ||
    haystack.includes("dinner") ||
    haystack.includes("lunch")
  ) {
    return {
      image:
        "https://images.unsplash.com/photo-1528605248644-14dd04022da1?q=80&w=1200&auto=format&fit=crop",
      icon: "restaurant-outline",
      tone: "olive",
      label: "Tables",
    };
  }

  return {
    image:
      "https://images.unsplash.com/photo-1528605248644-14dd04022da1?q=80&w=1200&auto=format&fit=crop",
    icon: "people-outline",
    tone: "olive",
    label: "Group",
  };
}

function formatGroupType(type) {
  if (!type) return "Church group";
  return String(type)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMeeting(group) {
  const day = group?.meeting_day || "";
  const time = group?.meeting_time || "";

  if (day && time) return `${day} · ${time}`;
  if (day) return day;
  if (time) return time;
  return "Meeting time to be confirmed";
}

function formatAudience(audience) {
  if (!audience || audience === "everyone") return null;

  const map = {
    men: "Men",
    women: "Women",
    young_adults: "Young Adults",
    parents: "Parents",
    seniors: "Seniors",
    invite_only: "Invite Only",
  };

  return map[audience] || String(audience).replace(/_/g, " ");
}

function StatusBadge({ status }) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "approved") {
    return (
      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: SOFT_OLIVE_BG,
          borderWidth: 1,
          borderColor: CARD_BORDER,
        }}
      >
        <Text style={{ color: DEEP_OLIVE, fontSize: 11, fontWeight: "900" }}>
          Joined
        </Text>
      </View>
    );
  }

  if (normalized === "invited") {
    return (
      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: SOFT_GOLD_BG,
          borderWidth: 1,
          borderColor: CARD_BORDER,
        }}
      >
        <Text style={{ color: HEAVENLY_GOLD, fontSize: 11, fontWeight: "900" }}>
          Invited
        </Text>
      </View>
    );
  }

  if (normalized === "pending") {
    return (
      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: SOFT_GOLD_BG,
          borderWidth: 1,
          borderColor: CARD_BORDER,
        }}
      >
        <Text style={{ color: HEAVENLY_GOLD, fontSize: 11, fontWeight: "900" }}>
          Pending
        </Text>
      </View>
    );
  }

  return null;
}

function FilterCard({ label, description, icon, selected, count, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: "48.5%",
        minHeight: 92,
        borderRadius: 20,
        padding: 12,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? HEAVENLY_GOLD : CARD_BORDER,
        backgroundColor: theme.colors.surface,
        opacity: pressed ? 0.82 : 1,
        shadowColor: selected ? HEAVENLY_GOLD : "#000",
        shadowOpacity: selected ? 0.09 : 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: selected ? 3 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: selected ? SOFT_GOLD_BG : SOFT_OLIVE_BG,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: selected ? HEAVENLY_GOLD : CARD_BORDER,
          }}
        >
          <Ionicons name={icon} size={18} color={selected ? HEAVENLY_GOLD : DEEP_OLIVE} />
        </View>

        <View
          style={{
            minWidth: 28,
            height: 28,
            borderRadius: 14,
            paddingHorizontal: 7,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: selected ? SOFT_GOLD_BG : SOFT_OLIVE_BG,
            borderWidth: selected ? 1 : 0,
            borderColor: selected ? CARD_BORDER : "transparent",
          }}
        >
          <Text
            style={{
              color: selected ? HEAVENLY_GOLD : DEEP_OLIVE,
              fontWeight: "900",
              fontSize: 12,
            }}
          >
            {count}
          </Text>
        </View>
      </View>

      <Text
        style={{
          color: selected ? HEAVENLY_GOLD : theme.colors.text,
          fontWeight: "900",
          fontSize: 14,
          marginTop: 10,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>

      <Text
        style={{
          color: theme.colors.muted,
          fontWeight: "700",
          fontSize: 11.5,
          lineHeight: 16,
          marginTop: 3,
        }}
        numberOfLines={2}
      >
        {description}
      </Text>
    </Pressable>
  );
}

export default function ChurchGroupsMember({ route, navigation }) {
  const churchId = route?.params?.churchId;
  const routeChurchName = route?.params?.churchName;

  const [viewerId, setViewerId] = useState(null);
  const [church, setChurch] = useState(null);
  const [groups, setGroups] = useState([]);
  const [membershipsByGroup, setMembershipsByGroup] = useState({});
  const [loading, setLoading] = useState(true);
  const [requestingGroupId, setRequestingGroupId] = useState(null);
  const [respondingInviteId, setRespondingInviteId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("suggested");
  const [isAdmin, setIsAdmin] = useState(false);
const [pendingAdminRequestCount, setPendingAdminRequestCount] = useState(0);

  const churchName = church?.display_name || church?.name || routeChurchName || "Church";
  const initials = useMemo(() => safeInitials(churchName), [churchName]);

  const joinedGroups = useMemo(() => {
    return (groups || []).filter((group) => {
      const status = String(membershipsByGroup?.[group.id]?.status || "").toLowerCase();
      return status === "approved";
    });
  }, [groups, membershipsByGroup]);

  const invitedGroups = useMemo(() => {
    return (groups || []).filter((group) => {
      const status = String(membershipsByGroup?.[group.id]?.status || "").toLowerCase();
      return status === "invited";
    });
  }, [groups, membershipsByGroup]);

  const pendingGroups = useMemo(() => {
    return (groups || []).filter((group) => {
      const status = String(membershipsByGroup?.[group.id]?.status || "").toLowerCase();
      return status === "pending";
    });
  }, [groups, membershipsByGroup]);

  const suggestedGroups = useMemo(() => {
    return (groups || []).filter((group) => {
      const membershipStatus = String(membershipsByGroup?.[group.id]?.status || "").toLowerCase();
      const visibility = String(group?.visibility || "church").toLowerCase();
      const audience = String(group?.audience || "everyone").toLowerCase();

      return (
        membershipStatus !== "approved" &&
        membershipStatus !== "pending" &&
        membershipStatus !== "invited" &&
        visibility === "church" &&
        audience === "everyone"
      );
    });
  }, [groups, membershipsByGroup]);

  const filteredGroups = useMemo(() => {
    if (activeFilter === "joined") return joinedGroups;
    if (activeFilter === "invited") return invitedGroups;
    if (activeFilter === "pending") return pendingGroups;
    return suggestedGroups;
  }, [activeFilter, joinedGroups, invitedGroups, pendingGroups, suggestedGroups]);

  const filterCounts = useMemo(
    () => ({
      joined: joinedGroups.length,
      invited: invitedGroups.length,
      pending: pendingGroups.length,
      suggested: suggestedGroups.length,
    }),
    [joinedGroups.length, invitedGroups.length, pendingGroups.length, suggestedGroups.length]
  );

  useEffect(() => {
    let alive = true;

    async function loadScreen() {
      try {
        setLoading(true);

        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError) {
          console.log("ChurchGroupsMember get user error:", userError);
        }

        const uid = userData?.user?.id || null;

        if (alive) {
          setViewerId(uid);
        }

        if (churchId) {
  const admin = await checkIsAdmin(churchId);

  await Promise.all([
    loadChurch(churchId, alive),
    loadGroups(churchId, alive),
    uid ? loadMemberships(churchId, uid, alive) : Promise.resolve(),
    admin ? loadPendingAdminRequestCount(churchId) : Promise.resolve(),
  ]);

  if (!admin) {
    setPendingAdminRequestCount(0);
  }
}
      } catch (e) {
        console.log("ChurchGroupsMember load error:", e);
        Alert.alert("Groups", "Could not load church groups right now.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadScreen();

    return () => {
      alive = false;
    };
  }, [churchId]);

  async function loadChurch(id, alive = true) {
    const { data, error } = await supabase
      .from("churches")
      .select("id, name, display_name, avatar_url, is_verified")
      .eq("id", id)
      .single();

    if (error) {
      console.log("ChurchGroupsMember load church error:", error);
      if (alive) setChurch(null);
      return;
    }

    if (alive) setChurch(data || null);
  }

  async function loadGroups(id, alive = true) {
    const { data, error } = await supabase
      .from("church_groups")
      .select(
        "id, church_id, name, type, description, area, meeting_day, meeting_time, leader_name, audience, visibility, status, is_public, created_at"
      )
      .eq("church_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.log("ChurchGroupsMember load groups error:", error);
      if (alive) setGroups([]);
      return;
    }

    const visibleGroups = (data || []).filter((group) => {
      const status = String(group?.status || "").toLowerCase();
      return status !== "archived";
    });

    if (alive) setGroups(visibleGroups);
  }

  async function loadMemberships(id, uid, alive = true) {
    const { data, error } = await supabase
      .from("church_group_members")
      .select("id, group_id, church_id, user_id, role, status, created_at")
      .eq("church_id", id)
      .eq("user_id", uid);

    if (error) {
      console.log("ChurchGroupsMember load memberships error:", error);
      if (alive) setMembershipsByGroup({});
      return;
    }

    const map = {};
    (data || []).forEach((row) => {
      if (row?.group_id) {
        map[row.group_id] = row;
      }
    });

    if (alive) setMembershipsByGroup(map);
  }

  async function checkIsAdmin(id) {
  try {
    if (!id) {
      setIsAdmin(false);
      return false;
    }

    const { data, error } = await supabase.rpc("is_church_admin", {
      target_church_id: id,
    });

    if (error) {
      console.log("ChurchGroupsMember admin check error:", error);
      setIsAdmin(false);
      return false;
    }

    const admin = Boolean(data);
    setIsAdmin(admin);
    return admin;
  } catch (e) {
    console.log("ChurchGroupsMember admin check exception:", e);
    setIsAdmin(false);
    return false;
  }
}

async function loadPendingAdminRequestCount(id) {
  try {
    if (!id) {
      setPendingAdminRequestCount(0);
      return;
    }

    const { count, error } = await supabase
      .from("church_group_members")
      .select("id", { count: "exact", head: true })
      .eq("church_id", id)
      .eq("status", "pending");

    if (error) {
      console.log("ChurchGroupsMember pending admin request count error:", error);
      setPendingAdminRequestCount(0);
      return;
    }

    setPendingAdminRequestCount(count || 0);
  } catch (e) {
    console.log("ChurchGroupsMember pending admin request count exception:", e);
    setPendingAdminRequestCount(0);
  }
}

  async function handleAcceptInvite(group) {
    const membership = membershipsByGroup?.[group?.id];

    if (!membership?.id) {
      Alert.alert("Invite not found", "We could not find this invite. Please refresh and try again.");
      return;
    }

    try {
      setRespondingInviteId(group.id);

      const { data, error } = await supabase
        .from("church_group_members")
        .update({
          status: "approved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", membership.id)
        .select("id, group_id, church_id, user_id, role, status, created_at")
        .single();

      if (error) throw error;

      setMembershipsByGroup((prev) => ({
        ...(prev || {}),
        [group.id]: data,
      }));

      setActiveFilter("joined");
      Alert.alert("Invite accepted", `You’re now in ${group?.name || "this group"}.`);
    } catch (e) {
      console.log("ChurchGroupsMember accept invite error:", e);
      Alert.alert("Could not accept invite", e?.message || "Please try again.");
    } finally {
      setRespondingInviteId(null);
    }
  }

  async function handleDeclineInvite(group) {
    const membership = membershipsByGroup?.[group?.id];

    if (!membership?.id) {
      Alert.alert("Invite not found", "We could not find this invite. Please refresh and try again.");
      return;
    }

    try {
      setRespondingInviteId(group.id);

      const { data, error } = await supabase
        .from("church_group_members")
        .update({
          status: "declined",
          updated_at: new Date().toISOString(),
        })
        .eq("id", membership.id)
        .select("id, group_id, church_id, user_id, role, status, created_at")
        .single();

      if (error) throw error;

      setMembershipsByGroup((prev) => ({
        ...(prev || {}),
        [group.id]: data,
      }));

      Alert.alert("Invite declined", "The invite has been declined.");
    } catch (e) {
      console.log("ChurchGroupsMember decline invite error:", e);
      Alert.alert("Could not decline invite", e?.message || "Please try again.");
    } finally {
      setRespondingInviteId(null);
    }
  }

  async function handleRequestToJoin(group) {
    if (!group?.id || !churchId) return;

    if (!viewerId) {
      Alert.alert("Please sign in", "You need to be signed in to request to join a group.");
      return;
    }

    const visibility = String(group?.visibility || "church").toLowerCase();
    const audience = String(group?.audience || "everyone").toLowerCase();

    if (visibility !== "church" || audience !== "everyone") {
      Alert.alert(
        "Group not open to request",
        "This group is restricted or invite-only. Please speak to a church leader."
      );
      return;
    }

    const existing = membershipsByGroup[group.id];
    const existingStatus = String(existing?.status || "").toLowerCase();

    if (existingStatus === "approved") {
      Alert.alert("Already joined", "You are already a member of this group.");
      return;
    }

    if (existingStatus === "invited") {
      setActiveFilter("invited");
      Alert.alert("Invite waiting", "You already have an invite for this group.");
      return;
    }

    if (existingStatus === "pending") {
      Alert.alert("Request pending", "Your request to join this group is already waiting for approval.");
      return;
    }

    try {
      setRequestingGroupId(group.id);

      const { data, error } = await supabase
        .from("church_group_members")
        .insert({
          group_id: group.id,
          church_id: churchId,
          user_id: viewerId,
          role: "member",
          status: "pending",
        })
        .select("id, group_id, church_id, user_id, role, status, created_at")
        .single();

      if (error) {
        console.log("ChurchGroupsMember request insert error:", error);
        Alert.alert("Could not request to join", error?.message || "Please try again.");
        return;
      }

      setMembershipsByGroup((prev) => ({
        ...(prev || {}),
        [group.id]: data,
      }));

      setActiveFilter("pending");

      Alert.alert("Request sent", "Your request has been sent to the group leader.");
    } catch (e) {
      console.log("ChurchGroupsMember request exception:", e);
      Alert.alert("Could not request to join", e?.message || "Please try again.");
    } finally {
      setRequestingGroupId(null);
    }
  }

  useFocusEffect(
  useCallback(() => {
    if (!churchId) return;

    let alive = true;

    async function refreshOnFocus() {
      try {
        await loadGroups(churchId, alive);

        if (viewerId) {
          await loadMemberships(churchId, viewerId, alive);
        }

        const admin = await checkIsAdmin(churchId);

        if (admin) {
          await loadPendingAdminRequestCount(churchId);
        } else {
          setPendingAdminRequestCount(0);
        }
      } catch (e) {
        console.log("ChurchGroupsMember focus refresh error:", e);
      }
    }

    refreshOnFocus();

    return () => {
      alive = false;
    };
  }, [churchId, viewerId])
);

  function renderChurchAvatar(size = 48) {
    const radius = size / 2;

    if (church?.avatar_url) {
      return (
        <Image
          source={{ uri: church.avatar_url }}
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            backgroundColor: theme.colors.surfaceAlt,
          }}
        />
      );
    }

    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: SOFT_OLIVE_BG,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: DEEP_OLIVE, fontWeight: "900", fontSize: size > 40 ? 16 : 13 }}>
          {initials}
        </Text>
      </View>
    );
  }

  function renderFilterEmptyState() {
    let title = "No suggested groups";
    let body =
      "There are no open groups to suggest right now. Restricted groups may be available by invitation or through a church leader.";
    let icon = "sparkles-outline";

    if (activeFilter === "joined") {
      title = "No groups joined yet";
      body = "Once you are approved into a church group, it will appear here.";
      icon = "checkmark-circle-outline";
    }

    if (activeFilter === "invited") {
      title = "No group invites";
      body = "When a church leader invites you to a group, it will appear here for you to accept or decline.";
      icon = "mail-unread-outline";
    }

    if (activeFilter === "pending") {
      title = "No pending requests";
      body = "When you request to join a group, it will appear here while it waits for approval.";
      icon = "time-outline";
    }

    return (
      <View
        style={{
          marginTop: 8,
          padding: 18,
          borderRadius: 20,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: activeFilter === "pending" || activeFilter === "invited" ? SOFT_GOLD_BG : SOFT_OLIVE_BG,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 10,
          }}
        >
          <Ionicons
            name={icon}
            size={22}
            color={activeFilter === "pending" || activeFilter === "invited" ? HEAVENLY_GOLD : DEEP_OLIVE}
          />
        </View>

        <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
          {title}
        </Text>

        <Text
          style={{
            color: theme.colors.muted,
            textAlign: "center",
            marginTop: 6,
            fontWeight: "700",
            lineHeight: 19,
          }}
        >
          {body}
        </Text>
      </View>
    );
  }

function renderGroupCard(group) {
  const membership = membershipsByGroup[group.id] || null;
  const membershipStatus = String(membership?.status || "").toLowerCase();
  const isJoined = membershipStatus === "approved";
  const isInvited = membershipStatus === "invited";
  const isPending = membershipStatus === "pending";
  const isRequesting = requestingGroupId === group.id;
  const isResponding = respondingInviteId === group.id;
  const audienceLabel = formatAudience(group?.audience);
  const visual = getGroupVisual(group);
  const isGoldVisual = visual.tone === "gold";
  const visualAccent = isGoldVisual ? HEAVENLY_GOLD : DEEP_OLIVE;
  const visualBg = isGoldVisual ? SOFT_GOLD_BG : SOFT_OLIVE_BG;

  return (
  <Pressable
    key={group.id}
    onPress={() =>
      navigation.navigate("ChurchGroupDetail", {
        churchId,
        churchName,
        group,
        membershipStatus,
      })
    }
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        overflow: "hidden",
        shadowColor: HEAVENLY_GOLD,
        shadowOpacity: 0.07,
        shadowRadius: 9,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
        marginBottom: 16,
      }}
    >
      <View
        style={{
          height: 138,
          width: "100%",
          backgroundColor: theme.colors.surfaceAlt,
        }}
      >
        <Image
          source={{ uri: visual.image }}
          style={{ width: "100%", height: 138 }}
          resizeMode="cover"
        />

        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.14)",
          }}
        />

        <View
          style={{
            position: "absolute",
            left: 14,
            bottom: 14,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: visualAccent,
            borderWidth: 2,
            borderColor: theme.colors.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={visual.icon} size={21} color="#fff" />
        </View>

        <View
          style={{
            position: "absolute",
            right: 14,
            bottom: 14,
          }}
        >
          <StatusBadge status={membershipStatus} />
        </View>
      </View>

      <View style={{ padding: 15 }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 20,
            fontWeight: "900",
            lineHeight: 25,
          }}
          numberOfLines={2}
        >
          {group.name || "Church group"}
        </Text>

        <Text
          style={{
            color: theme.colors.muted,
            fontSize: 12.5,
            fontWeight: "800",
            marginTop: 4,
          }}
          numberOfLines={1}
        >
          {formatGroupType(group.type)}
        </Text>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 7,
            marginTop: 11,
          }}
        >
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: visualBg,
              borderWidth: 1,
              borderColor: CARD_BORDER,
            }}
          >
            <Text
              style={{
                color: visualAccent,
                fontSize: 11,
                fontWeight: "900",
              }}
            >
              {visual.label || formatGroupType(group.type)}
            </Text>
          </View>

          {audienceLabel ? (
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: SOFT_GOLD_BG,
                borderWidth: 1,
                borderColor: CARD_BORDER,
              }}
            >
              <Text
                style={{
                  color: HEAVENLY_GOLD,
                  fontSize: 11,
                  fontWeight: "900",
                }}
              >
                {audienceLabel}
              </Text>
            </View>
          ) : null}
        </View>

        {group.description ? (
          <Text
            style={{
              color: theme.colors.text2,
              fontSize: 14,
              fontWeight: "700",
              lineHeight: 21,
              marginTop: 12,
            }}
          >
            {group.description}
          </Text>
        ) : null}

        <View style={{ marginTop: 14, gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="calendar-outline" size={16} color={DEEP_OLIVE} />
            <Text
              style={{
                color: theme.colors.muted,
                fontSize: 13,
                fontWeight: "800",
                flex: 1,
              }}
            >
              {formatMeeting(group)}
            </Text>
          </View>

          {group.area ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="location-outline" size={16} color={DEEP_OLIVE} />
              <Text
                style={{
                  color: theme.colors.muted,
                  fontSize: 13,
                  fontWeight: "800",
                  flex: 1,
                }}
              >
                {group.area}
              </Text>
            </View>
          ) : null}

          {group.leader_name ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="person-outline" size={16} color={DEEP_OLIVE} />
              <Text
                style={{
                  color: theme.colors.muted,
                  fontSize: 13,
                  fontWeight: "800",
                  flex: 1,
                }}
              >
                Led by {group.leader_name}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ marginTop: 15 }}>
          {isJoined ? (
            <View
              style={{
                borderRadius: 999,
                paddingVertical: 11,
                alignItems: "center",
                backgroundColor: SOFT_OLIVE_BG,
                borderWidth: 1,
                borderColor: CARD_BORDER,
              }}
            >
              <Text style={{ color: DEEP_OLIVE, fontWeight: "900" }}>
                You’re in this group
              </Text>
            </View>
          ) : isInvited ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => handleDeclineInvite(group)}
                disabled={isResponding}
                style={({ pressed }) => ({
                  flex: 1,
                  borderRadius: 999,
                  paddingVertical: 11,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  opacity: pressed || isResponding ? 0.75 : 1,
                })}
              >
                <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
                  Decline
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleAcceptInvite(group)}
                disabled={isResponding}
                style={({ pressed }) => ({
                  flex: 1,
                  borderRadius: 999,
                  paddingVertical: 11,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: HEAVENLY_GOLD,
                  opacity: pressed || isResponding ? 0.75 : 1,
                  flexDirection: "row",
                  gap: 7,
                })}
              >
                {isResponding ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="checkmark-circle-outline" size={17} color="#fff" />
                )}

                <Text style={{ color: "#fff", fontWeight: "900" }}>Accept</Text>
              </Pressable>
            </View>
          ) : isPending ? (
            <View
              style={{
                borderRadius: 999,
                paddingVertical: 11,
                alignItems: "center",
                backgroundColor: SOFT_GOLD_BG,
                borderWidth: 1,
                borderColor: CARD_BORDER,
              }}
            >
              <Text style={{ color: HEAVENLY_GOLD, fontWeight: "900" }}>
                Request pending approval
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={() => handleRequestToJoin(group)}
              disabled={isRequesting}
              style={({ pressed }) => ({
                borderRadius: 999,
                paddingVertical: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: HEAVENLY_GOLD,
                opacity: pressed || isRequesting ? 0.75 : 1,
                flexDirection: "row",
                gap: 8,
              })}
            >
              {isRequesting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
              )}

              <Text style={{ color: "#fff", fontWeight: "900" }}>
                {isRequesting ? "Sending request…" : "Request to join"}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

  return (
    <Screen backgroundColor={theme.colors.bg} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: bottomPad + 24,
          }}
          showsVerticalScrollIndicator={false}
        >
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
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.divider,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="chevron-back" size={22} color={DEEP_OLIVE} />
            </Pressable>

            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
              Groups
            </Text>

            <View style={{ width: 38 }} />
          </View>

          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 22,
              padding: 16,
              borderWidth: 1,
              borderColor: CARD_BORDER,
              shadowColor: HEAVENLY_GOLD,
              shadowOpacity: 0.08,
              shadowRadius: 9,
              shadowOffset: { width: 0, height: 3 },
              elevation: 3,
              overflow: "hidden",
              marginBottom: 14,
            }}
          >
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: -45,
                right: -32,
                width: 180,
                height: 130,
                borderRadius: 40,
                backgroundColor: SOFT_GOLD_BG,
              }}
            />

            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                bottom: -45,
                left: -45,
                width: 130,
                height: 130,
                borderRadius: 65,
                backgroundColor: SOFT_OLIVE_BG,
              }}
            />

            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              {renderChurchAvatar(48)}

              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: "900" }}>
                  Church Groups
                </Text>

                <Text
                  style={{
                    color: theme.colors.muted,
                    fontSize: 12.5,
                    fontWeight: "800",
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  {churchName}
                </Text>
              </View>

              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: SOFT_GOLD_BG,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="people-outline" size={20} color={HEAVENLY_GOLD} />
              </View>
            </View>

            <Text
              style={{
                color: theme.colors.muted,
                fontSize: 14,
                fontWeight: "700",
                lineHeight: 20,
                marginTop: 14,
              }}
            >
              Check the groups you’re part of, respond to invites, see requests waiting
              for approval, and discover suggested groups from your church.
            </Text>
          </View>

          {isAdmin && pendingAdminRequestCount > 0 ? (
  <View
    style={{
      backgroundColor: SOFT_GOLD_BG,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: CARD_BORDER,
      padding: 14,
      marginBottom: 14,
      flexDirection: "row",
      alignItems: "center",
    }}
  >
    <View
      style={{
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
      }}
    >
      <Ionicons name="alert-circle-outline" size={22} color={HEAVENLY_GOLD} />
    </View>

    <View style={{ flex: 1 }}>
      <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: "900" }}>
        {pendingAdminRequestCount} group request
        {pendingAdminRequestCount === 1 ? "" : "s"} need review
      </Text>

      <Text
        style={{
          color: theme.colors.muted,
          fontSize: 12.5,
          fontWeight: "700",
          lineHeight: 18,
          marginTop: 3,
        }}
      >
        Review pending requests from your church group admin area.
      </Text>
    </View>

    <Pressable
      onPress={() =>
        navigation.navigate("ChurchGroupsAdmin", {
          churchId,
          churchName,
        })
      }
      style={({ pressed }) => ({
        marginLeft: 10,
        paddingVertical: 8,
        paddingHorizontal: 11,
        borderRadius: 999,
        backgroundColor: HEAVENLY_GOLD,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Text style={{ color: "#fff", fontSize: 12, fontWeight: "900" }}>
        Review
      </Text>
    </Pressable>
  </View>
) : null}

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
              rowGap: 10,
              marginBottom: 14,
            }}
          >
            {FILTERS.map((filter) => (
              <FilterCard
                key={filter.key}
                label={filter.label}
                description={filter.description}
                icon={filter.icon}
                selected={activeFilter === filter.key}
                count={filterCounts[filter.key] || 0}
                onPress={() => setActiveFilter(filter.key)}
              />
            ))}
          </View>

          {loading ? (
            <View style={{ paddingVertical: 30, alignItems: "center" }}>
              <ActivityIndicator size="large" color={HEAVENLY_GOLD} />
              <Text style={{ color: theme.colors.muted, marginTop: 8, fontWeight: "700" }}>
                Loading groups…
              </Text>
            </View>
          ) : null}

          {!loading && filteredGroups.length === 0 ? renderFilterEmptyState() : null}

          {!loading ? filteredGroups.map((group) => renderGroupCard(group)) : null}
        </ScrollView>
      )}
    </Screen>
  );
}