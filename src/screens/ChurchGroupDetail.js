// src/screens/ChurchGroupDetail.js
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
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
import { getOrCreateChurchGroupConversation } from "../lib/messages";
import { supabase } from "../lib/supabase";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const OLIVE = "#4F633B";
const TEXT = "#1F2933";
const TEXT_SOFT = "#374151";
const MUTED = "#6B7280";

const CARD_BORDER = "rgba(15, 23, 42, 0.08)";
const AMBER_SOFT = "rgba(180, 83, 9, 0.10)";
const AMBER_BORDER = "rgba(180, 83, 9, 0.18)";
const OLIVE_SOFT = "rgba(79, 99, 59, 0.10)";
const OLIVE_BORDER = "rgba(79, 99, 59, 0.18)";
const SHADOW = "rgba(15, 23, 42, 0.10)";

function formatGroupType(type) {
  if (!type) return "Church group";

  return String(type)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMeeting(group) {
  const day = group?.meeting_day || group?.meetingDay || "";
  const time = group?.meeting_time || group?.meetingTime || "";

  if (day && time) return `${day} · ${time}`;
  if (day) return day;
  if (time) return time;

  return "Meeting time to be confirmed";
}

function formatAudience(audience) {
  if (!audience || audience === "everyone") return "Everyone";

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

function getGroupVisual(group) {
  const rawType = String(group?.type || "").trim().toLowerCase();
  const rawName = String(group?.name || "").trim().toLowerCase();
  const rawDescription = String(group?.description || "").trim().toLowerCase();
  const rawAudience = String(group?.audience || "").trim().toLowerCase();

  const haystack = `${rawName} ${rawDescription} ${rawType} ${rawAudience}`;

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
      tone: "amber",
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
      tone: "amber",
      label: "Men’s Prayer",
    };
  }

  if (haystack.includes("prayer")) {
    return {
      image:
        "https://images.unsplash.com/photo-1507692049790-de58290a4334?q=80&w=1200&auto=format&fit=crop",
      icon: "hand-left-outline",
      tone: "amber",
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
      tone: "amber",
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
      tone: "amber",
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

function toneColors(tone) {
  const isAmber = tone === "amber" || tone === "gold";

  if (isAmber) {
    return {
      accent: EVENT_AMBER,
      strong: EVENT_BROWN,
      soft: AMBER_SOFT,
      border: AMBER_BORDER,
    };
  }

  return {
    accent: OLIVE,
    strong: OLIVE,
    soft: OLIVE_SOFT,
    border: OLIVE_BORDER,
  };
}

function DetailRow({ icon, label, value }) {
  if (!value) return null;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: CARD_BORDER,
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

      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: MUTED,
            fontSize: 11.5,
            fontWeight: "900",
            marginBottom: 2,
          }}
        >
          {label}
        </Text>

        <Text
          style={{
            color: TEXT,
            fontSize: 14,
            fontWeight: "800",
            lineHeight: 19,
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function InfoBox({ icon, title, body, tone = "amber" }) {
  const colors = toneColors(tone);

  return (
    <View
      style={{
        backgroundColor: colors.soft,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        marginTop: 14,
      }}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: SURFACE,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Ionicons name={icon} size={21} color={colors.accent} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ color: TEXT, fontSize: 15, fontWeight: "900" }}>
          {title}
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
          {body}
        </Text>
      </View>
    </View>
  );
}

export default function ChurchGroupDetail({ navigation, route }) {
  const group = route?.params?.group || null;
  const churchId = route?.params?.churchId || group?.church_id || group?.churchId || null;
  const churchName = route?.params?.churchName || "Church";
  const initialMembershipStatus = route?.params?.membershipStatus || "";

  const [viewerId, setViewerId] = useState(null);
  const [membership, setMembership] = useState(null);
  const [membershipStatus, setMembershipStatus] = useState(initialMembershipStatus);
  const [loadingMembership, setLoadingMembership] = useState(true);
  const [acting, setActing] = useState(false);
  const [isChurchAdmin, setIsChurchAdmin] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);

  const visual = getGroupVisual(group);
  const visualTheme = toneColors(visual.tone);
  const visualAccent = visualTheme.accent;
  const visualBg = visualTheme.soft;
  const visualBorder = visualTheme.border;

  const groupVisibility = String(group?.visibility || "church").toLowerCase();
  const groupAudience = String(group?.audience || "everyone").toLowerCase();

  const leaderName = group?.leader_name || group?.leader || "";
  const groupArea = group?.area || "";

  const canRequestToJoin = useMemo(() => {
    const status = String(membershipStatus || "").toLowerCase();

    return (
      group?.id &&
      churchId &&
      viewerId &&
      status !== "approved" &&
      status !== "pending" &&
      status !== "invited" &&
      groupVisibility === "church" &&
      groupAudience === "everyone"
    );
  }, [
    group?.id,
    churchId,
    viewerId,
    membershipStatus,
    groupVisibility,
    groupAudience,
  ]);

  const canOpenGroupChat = useMemo(() => {
    const status = String(membershipStatus || "").toLowerCase();

    return !!group?.id && !!viewerId && (status === "approved" || isChurchAdmin);
  }, [group?.id, viewerId, membershipStatus, isChurchAdmin]);

  useEffect(() => {
    let alive = true;

    async function loadMembership() {
      try {
        setLoadingMembership(true);

        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError) {
          console.log("ChurchGroupDetail get user error:", userError);
        }

        const uid = userData?.user?.id || null;

        if (!alive) return;

        setViewerId(uid);

        if (!uid || !group?.id || !churchId) {
          setMembership(null);
          setMembershipStatus(initialMembershipStatus || "");
          setIsChurchAdmin(false);
          return;
        }

        const { data: adminRows, error: adminError } = await supabase
          .from("church_admins")
          .select("user_id")
          .eq("church_id", churchId)
          .eq("user_id", uid)
          .limit(1);

        if (adminError) {
          console.log("ChurchGroupDetail admin check error:", adminError);
        }

        if (!alive) return;

        setIsChurchAdmin(Array.isArray(adminRows) && adminRows.length > 0);

        const { data, error } = await supabase
          .from("church_group_members")
          .select("id, group_id, church_id, user_id, role, status, created_at")
          .eq("church_id", churchId)
          .eq("group_id", group.id)
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) {
          console.log("ChurchGroupDetail load membership error:", error);
          return;
        }

        const row = Array.isArray(data) && data.length > 0 ? data[0] : null;

        if (!alive) return;

        setMembership(row);
        setMembershipStatus(row?.status || initialMembershipStatus || "");
      } catch (e) {
        console.log("ChurchGroupDetail load membership exception:", e);
      } finally {
        if (alive) setLoadingMembership(false);
      }
    }

    loadMembership();

    return () => {
      alive = false;
    };
  }, [group?.id, churchId, initialMembershipStatus]);

  async function handleRequestToJoin() {
    if (!group?.id || !churchId) return;

    if (!viewerId) {
      Alert.alert(
        "Please sign in",
        "You need to be signed in to request to join a group."
      );
      return;
    }

    if (groupVisibility !== "church" || groupAudience !== "everyone") {
      Alert.alert(
        "Group not open to request",
        "This group is restricted or invite-only. Please speak to a church leader."
      );
      return;
    }

    const existingStatus = String(membershipStatus || "").toLowerCase();

    if (existingStatus === "approved") {
      Alert.alert("Already joined", "You are already a member of this group.");
      return;
    }

    if (existingStatus === "invited") {
      Alert.alert("Invite waiting", "You already have an invite for this group.");
      return;
    }

    if (existingStatus === "pending") {
      Alert.alert(
        "Request pending",
        "Your request to join this group is already waiting for approval."
      );
      return;
    }

    try {
      setActing(true);

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
        console.log("ChurchGroupDetail request insert error:", error);
        Alert.alert(
          "Could not request to join",
          error?.message || "Please try again."
        );
        return;
      }

      setMembership(data);
      setMembershipStatus(data?.status || "pending");

      Alert.alert("Request sent", "Your request has been sent to the group leader.");
    } catch (e) {
      console.log("ChurchGroupDetail request exception:", e);
      Alert.alert("Could not request to join", e?.message || "Please try again.");
    } finally {
      setActing(false);
    }
  }

  async function handleAcceptInvite() {
    if (!membership?.id) {
      Alert.alert(
        "Invite not found",
        "We could not find this invite. Please refresh and try again."
      );
      return;
    }

    try {
      setActing(true);

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

      setMembership(data);
      setMembershipStatus("approved");

      Alert.alert(
        "Invite accepted",
        `You’re now in ${group?.name || "this group"}.`
      );
    } catch (e) {
      console.log("ChurchGroupDetail accept invite error:", e);
      Alert.alert("Could not accept invite", e?.message || "Please try again.");
    } finally {
      setActing(false);
    }
  }

  async function handleDeclineInvite() {
    if (!membership?.id) {
      Alert.alert(
        "Invite not found",
        "We could not find this invite. Please refresh and try again."
      );
      return;
    }

    try {
      setActing(true);

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

      setMembership(data);
      setMembershipStatus("declined");

      Alert.alert("Invite declined", "The invite has been declined.");
    } catch (e) {
      console.log("ChurchGroupDetail decline invite error:", e);
      Alert.alert("Could not decline invite", e?.message || "Please try again.");
    } finally {
      setActing(false);
    }
  }

  async function handleOpenGroupChat() {
    if (!group?.id) {
      Alert.alert("Group not found", "We could not find this group.");
      return;
    }

    if (!canOpenGroupChat) {
      Alert.alert(
        "Group chat unavailable",
        "Only approved group members and church admins can open this group chat."
      );
      return;
    }

    try {
      setOpeningChat(true);

      const conversationId = await getOrCreateChurchGroupConversation(group.id);

      navigation.navigate("Chat", {
        conversationId,
        type: "church_group",
        title: group?.name || "Group chat",
      });
    } catch (e) {
      console.log("ChurchGroupDetail open group chat error:", e);

      Alert.alert(
        "Could not open group chat",
        e?.message || "Please try again."
      );
    } finally {
      setOpeningChat(false);
    }
  }

  function renderActionPanel() {
    const status = String(membershipStatus || "").toLowerCase();

    if (loadingMembership) {
      return (
        <InfoBox
          icon="time-outline"
          title="Checking group status"
          body="We’re checking whether you’re already linked to this group."
          tone="amber"
        />
      );
    }

    if (status === "approved") {
      return (
        <InfoBox
          icon="checkmark-circle-outline"
          title="You’re in this group"
          body="You can now join the group conversation, prayer, care and discipleship life here."
          tone="olive"
        />
      );
    }

    if (isChurchAdmin) {
      return (
        <InfoBox
          icon="shield-checkmark-outline"
          title="Church admin access"
          body="As a church admin, you can open this group chat and support the group’s communication."
          tone="olive"
        />
      );
    }

    if (status === "pending") {
      return (
        <InfoBox
          icon="time-outline"
          title="Request pending"
          body="Your request is waiting for a church leader or group leader to approve."
          tone="amber"
        />
      );
    }

    if (status === "invited") {
      return (
        <View
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 18,
            backgroundColor: AMBER_SOFT,
            borderWidth: 1,
            borderColor: AMBER_BORDER,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: SURFACE,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
                borderWidth: 1,
                borderColor: AMBER_BORDER,
              }}
            >
              <Ionicons
                name="mail-unread-outline"
                size={21}
                color={EVENT_AMBER}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ color: TEXT, fontSize: 15, fontWeight: "900" }}>
                Invite waiting
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
                You have been invited to this group.
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={handleDeclineInvite}
              disabled={acting}
              style={({ pressed }) => ({
                flex: 1,
                borderRadius: 999,
                paddingVertical: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: SURFACE,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                opacity: pressed || acting ? 0.75 : 1,
              })}
            >
              <Text style={{ color: MUTED, fontWeight: "900" }}>Decline</Text>
            </Pressable>

            <Pressable
              onPress={handleAcceptInvite}
              disabled={acting}
              style={({ pressed }) => ({
                flex: 1,
                borderRadius: 999,
                paddingVertical: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: EVENT_AMBER,
                opacity: pressed || acting ? 0.75 : 1,
                flexDirection: "row",
                gap: 8,
              })}
            >
              {acting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color="#fff"
                />
              )}

              <Text style={{ color: "#fff", fontWeight: "900" }}>Accept</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (status === "declined") {
      return (
        <InfoBox
          icon="close-circle-outline"
          title="Invite declined"
          body="You declined this invite. A church leader can invite you again if needed."
          tone="amber"
        />
      );
    }

    if (!canRequestToJoin) {
      return (
        <InfoBox
          icon="lock-closed-outline"
          title="Invite-only or restricted"
          body="This group is not currently open for public requests. Please speak to a church leader if you think you should be added."
          tone="amber"
        />
      );
    }

    return (
      <Pressable
        onPress={handleRequestToJoin}
        disabled={acting}
        style={({ pressed }) => ({
          marginTop: 14,
          borderRadius: 999,
          paddingVertical: 13,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: EVENT_AMBER,
          opacity: pressed || acting ? 0.75 : 1,
          flexDirection: "row",
          gap: 8,
        })}
      >
        {acting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="add-circle-outline" size={19} color="#fff" />
        )}

        <Text style={{ color: "#fff", fontWeight: "900" }}>
          {acting ? "Sending request…" : "Request to join"}
        </Text>
      </Pressable>
    );
  }

  if (!group) {
    return (
      <Screen backgroundColor={PREMIUM_CREAM} padded={false} style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            padding: 16,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ color: TEXT, fontSize: 18, fontWeight: "900" }}>
            Group not found
          </Text>

          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => ({
              marginTop: 14,
              borderRadius: 999,
              paddingVertical: 12,
              paddingHorizontal: 18,
              backgroundColor: EVENT_AMBER,
              opacity: pressed ? 0.78 : 1,
            })}
          >
            <Text style={{ color: "#fff", fontWeight: "900" }}>Go back</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={PREMIUM_CREAM} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomPad + 24 }}
        >
          <View style={{ height: 245, backgroundColor: PREMIUM_CREAM }}>
            <Image
              source={{ uri: visual.image }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />

            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.20)",
              }}
            />

            <View
              style={{
                position: "absolute",
                top: 14,
                left: 16,
                right: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Pressable
                onPress={() => navigation.goBack()}
                hitSlop={10}
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: pressed
                    ? "rgba(255,255,255,0.78)"
                    : "rgba(255,255,255,0.92)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.55)",
                })}
              >
                <Ionicons name="chevron-back" size={24} color={OLIVE} />
              </Pressable>

              <View
                style={{
                  paddingHorizontal: 11,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.92)",
                  borderWidth: 1,
                  borderColor: visualBorder,
                }}
              >
                <Text
                  style={{
                    color: visualAccent,
                    fontSize: 11,
                    fontWeight: "900",
                  }}
                >
                  {visual.label}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: 16, marginTop: -38 }}>
            <View
              style={{
                backgroundColor: SURFACE,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                padding: 16,
                shadowColor: SHADOW,
                shadowOpacity: 0.16,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 6 },
                elevation: 5,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 29,
                    backgroundColor: visualAccent,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                    borderWidth: 3,
                    borderColor: SURFACE,
                  }}
                >
                  <Ionicons name={visual.icon} size={27} color="#fff" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: TEXT,
                      fontSize: 25,
                      fontWeight: "900",
                      lineHeight: 30,
                      letterSpacing: -0.4,
                    }}
                  >
                    {group.name || "Church group"}
                  </Text>

                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 13,
                      fontWeight: "800",
                      marginTop: 5,
                    }}
                  >
                    {churchName}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 7,
                  marginTop: 14,
                }}
              >
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: visualBg,
                    borderWidth: 1,
                    borderColor: visualBorder,
                  }}
                >
                  <Text
                    style={{
                      color: visualAccent,
                      fontSize: 11,
                      fontWeight: "900",
                    }}
                  >
                    {formatGroupType(group.type)}
                  </Text>
                </View>

                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: AMBER_SOFT,
                    borderWidth: 1,
                    borderColor: AMBER_BORDER,
                  }}
                >
                  <Text
                    style={{
                      color: EVENT_AMBER,
                      fontSize: 11,
                      fontWeight: "900",
                    }}
                  >
                    {formatAudience(group.audience)}
                  </Text>
                </View>
              </View>

              {group.description ? (
                <Text
                  style={{
                    color: TEXT_SOFT,
                    fontSize: 14,
                    fontWeight: "700",
                    lineHeight: 21,
                    marginTop: 14,
                  }}
                >
                  {group.description}
                </Text>
              ) : (
                <Text
                  style={{
                    color: MUTED,
                    fontSize: 14,
                    fontWeight: "700",
                    lineHeight: 21,
                    marginTop: 14,
                  }}
                >
                  More details about this group will be added by the church soon.
                </Text>
              )}

              {renderActionPanel()}
            </View>

            <View
              style={{
                backgroundColor: SURFACE,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                padding: 15,
                marginTop: 16,
              }}
            >
              <Text
                style={{
                  color: TEXT,
                  fontSize: 19,
                  fontWeight: "900",
                  marginBottom: 4,
                }}
              >
                Group details
              </Text>

              <DetailRow
                icon="calendar-outline"
                label="Meeting"
                value={formatMeeting(group)}
              />

              <DetailRow
                icon="location-outline"
                label="Location / area"
                value={groupArea || "Location to be confirmed"}
              />

              <DetailRow
                icon="person-outline"
                label="Leader"
                value={leaderName || "Leader to be confirmed"}
              />

              <DetailRow
                icon="eye-outline"
                label="Visibility"
                value={
                  groupVisibility === "hidden"
                    ? "Hidden / invite only"
                    : "Visible to church"
                }
              />
            </View>

            <View
              style={{
                backgroundColor: SURFACE,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                padding: 15,
                marginTop: 16,
              }}
            >
              <Text
                style={{
                  color: TEXT,
                  fontSize: 19,
                  fontWeight: "900",
                  marginBottom: 6,
                }}
              >
                Group chat
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 13,
                  fontWeight: "700",
                  lineHeight: 20,
                }}
              >
                A shared conversation for approved members, leaders and church
                admins.
              </Text>

              {canOpenGroupChat ? (
                <Pressable
                  onPress={handleOpenGroupChat}
                  disabled={openingChat}
                  style={({ pressed }) => ({
                    marginTop: 14,
                    borderRadius: 999,
                    paddingVertical: 13,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: EVENT_AMBER,
                    opacity: pressed || openingChat ? 0.75 : 1,
                    flexDirection: "row",
                    gap: 8,
                  })}
                >
                  {openingChat ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="chatbubbles-outline" size={19} color="#fff" />
                  )}

                  <Text style={{ color: "#fff", fontWeight: "900" }}>
                    {openingChat ? "Opening chat…" : "Message group"}
                  </Text>
                </Pressable>
              ) : (
                <View
                  style={{
                    marginTop: 14,
                    borderRadius: 16,
                    padding: 12,
                    backgroundColor: OLIVE_SOFT,
                    borderWidth: 1,
                    borderColor: OLIVE_BORDER,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={OLIVE}
                  />

                  <Text
                    style={{
                      flex: 1,
                      marginLeft: 8,
                      color: MUTED,
                      fontSize: 12.5,
                      fontWeight: "800",
                      lineHeight: 18,
                    }}
                  >
                    Group chat unlocks once you’re an approved group member.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}