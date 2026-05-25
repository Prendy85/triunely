// src/screens/ChurchGroupManage.js
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";

import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";
import { theme } from "../theme/theme";

const HEAVENLY_GOLD = "#D99400";
const DEEP_OLIVE = "#4F633B";
const SOFT_GOLD_BG = "rgba(217, 148, 0, 0.10)";
const SOFT_OLIVE_BG = "rgba(79, 99, 59, 0.10)";
const CARD_BORDER = "rgba(217, 148, 0, 0.18)";

const DEFAULT_RECENT_ACTIVITY = "Active this week";

function mapDbMember(item) {
  const role =
    item.role === "leader"
      ? "Leader"
      : item.role === "co_leader"
      ? "Co-leader"
      : "Member";

  const status = item.status === "approved" ? "Active" : item.status || "Pending";

  const fallbackName = item.user_id?.slice(0, 8) || "Member";

  const displayName = item.profile?.display_name || item.profile?.handle || fallbackName;

  return {
    id: item.id,
    userId: item.user_id,
    rawRole: item.role,
    rawStatus: item.status,
    name: displayName,
    role,
    status,
    initials: displayName.charAt(0).toUpperCase(),
    avatarUrl: item.profile?.avatar_url || null,
  };
}

function mapDbGroup(item) {
  if (!item) return null;

  return {
    id: item.id,
    name: item.name || "Church Group",
    type: item.type || "Group",
    area: item.area || "Location not set",
    leader: item.leader_name || "Leader not set",
    time:
      item.meeting_day || item.meeting_time
        ? `${item.meeting_day || ""} ${item.meeting_time || ""}`.trim()
        : "Time not set",
    status: item.status === "active" ? "Active" : item.status || "Active",
    description: item.description || "",
  };
}

function ManageActionCard({ icon, title, subtitle, tint = "gold", onPress }) {
  const isOlive = tint === "olive";

  return (
    <Pressable
      onPress={onPress || (() => {})}
      style={({ pressed }) => ({
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 18,
        padding: 14,
        marginBottom: 10,
        shadowColor: HEAVENLY_GOLD,
        shadowOpacity: pressed ? 0.03 : 0.07,
        shadowRadius: 7,
        shadowOffset: { width: 0, height: 3 },
        elevation: pressed ? 1 : 2,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: isOlive ? SOFT_OLIVE_BG : SOFT_GOLD_BG,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={icon}
            size={21}
            color={isOlive ? DEEP_OLIVE : HEAVENLY_GOLD}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: "900" }}>
            {title}
          </Text>

          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 12.5,
              fontWeight: "700",
              lineHeight: 17,
              marginTop: 4,
            }}
          >
            {subtitle}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color={HEAVENLY_GOLD} />
      </View>
    </Pressable>
  );
}

function OverviewStat({ label, value, tint = "gold" }) {
  const isOlive = tint === "olive";

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 10,
      }}
    >
      <Text
        style={{
          color: isOlive ? DEEP_OLIVE : HEAVENLY_GOLD,
          fontSize: 18,
          fontWeight: "900",
          textAlign: "center",
        }}
      >
        {value}
      </Text>

      <Text
        style={{
          color: theme.colors.muted,
          fontSize: 10.5,
          fontWeight: "800",
          textAlign: "center",
          marginTop: 4,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: "rgba(217, 148, 0, 0.10)",
      }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: SOFT_GOLD_BG,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
        }}
      >
        <Ionicons name={icon} size={15} color={HEAVENLY_GOLD} />
      </View>

      <Text style={{ color: theme.colors.muted, fontWeight: "800", width: 76 }}>
        {label}
      </Text>

      <Text style={{ color: theme.colors.text2, fontWeight: "900", flex: 1 }}>
        {value}
      </Text>
    </View>
  );
}

function GroupOverviewCard({
  groupName,
  groupType,
  groupArea,
  groupLeader,
  groupTime,
  groupStatus,
  groupDescription,
  memberCount = 0,
  pendingRequestCount = 0,
}) {
  const isTable = groupType === "Tables";

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 22,
        padding: 16,
        marginBottom: 18,
        shadowColor: HEAVENLY_GOLD,
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: isTable ? SOFT_GOLD_BG : SOFT_OLIVE_BG,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={isTable ? "restaurant-outline" : "people-outline"}
            size={25}
            color={isTable ? HEAVENLY_GOLD : DEEP_OLIVE}
          />
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 20,
                fontWeight: "900",
                flex: 1,
              }}
            >
              {groupName}
            </Text>

            <View
              style={{
                backgroundColor: SOFT_OLIVE_BG,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                borderRadius: 999,
                paddingHorizontal: 9,
                paddingVertical: 5,
              }}
            >
              <Text style={{ color: DEEP_OLIVE, fontSize: 11, fontWeight: "900" }}>
                {groupStatus}
              </Text>
            </View>
          </View>

          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 13,
              fontWeight: "800",
              lineHeight: 18,
              marginTop: 5,
            }}
          >
            {groupType} · {groupArea}
          </Text>

          <Text
            style={{
              color: theme.colors.text2,
              fontSize: 12.5,
              fontWeight: "800",
              lineHeight: 18,
              marginTop: 5,
            }}
          >
            {groupDescription ||
              "A smaller discipleship space for fellowship, growth, care and community."}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
        <OverviewStat label="Members" value={memberCount} />
        <OverviewStat label="Requests" value={pendingRequestCount} tint="olive" />
        <OverviewStat label="Status" value="Live" />
      </View>

      <DetailRow icon="person-outline" label="Leader" value={groupLeader} />
      <DetailRow icon="location-outline" label="Area" value={groupArea} />
      <DetailRow icon="time-outline" label="Meets" value={groupTime} />
      <DetailRow icon="pulse-outline" label="Activity" value={DEFAULT_RECENT_ACTIVITY} />
    </View>
  );
}

function MemberRow({ member }) {
  const isLeader = member.role === "Leader";
  const isCoLeader = member.role === "Co-leader";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 11,
        borderTopWidth: 1,
        borderTopColor: "rgba(217, 148, 0, 0.10)",
      }}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: isLeader || isCoLeader ? SOFT_GOLD_BG : SOFT_OLIVE_BG,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Text
          style={{
            color: isLeader || isCoLeader ? HEAVENLY_GOLD : DEEP_OLIVE,
            fontWeight: "900",
            fontSize: 15,
          }}
        >
          {member.initials}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.text, fontSize: 14.5, fontWeight: "900" }}>
          {member.name}
        </Text>

        <Text
          style={{
            color: theme.colors.muted,
            fontSize: 12,
            fontWeight: "700",
            marginTop: 3,
          }}
        >
          {member.status}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: isLeader || isCoLeader ? SOFT_GOLD_BG : SOFT_OLIVE_BG,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          borderRadius: 999,
          paddingHorizontal: 9,
          paddingVertical: 5,
        }}
      >
        <Text
          style={{
            color: isLeader || isCoLeader ? HEAVENLY_GOLD : DEEP_OLIVE,
            fontSize: 10.5,
            fontWeight: "900",
          }}
        >
          {member.role}
        </Text>
      </View>
    </View>
  );
}

function PendingRequestRow({ request, onApprove, onDecline }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 11,
        borderTopWidth: 1,
        borderTopColor: "rgba(217, 148, 0, 0.10)",
      }}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: SOFT_GOLD_BG,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Text style={{ color: HEAVENLY_GOLD, fontWeight: "900", fontSize: 15 }}>
          {request.initials}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.text, fontSize: 14.5, fontWeight: "900" }}>
          {request.name}
        </Text>

        <Text
          style={{
            color: theme.colors.muted,
            fontSize: 12,
            fontWeight: "700",
            marginTop: 3,
          }}
        >
          {request.status === "Pending" ? "Requested to join this group" : request.status}
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable
          onPress={() => onApprove?.(request)}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: SOFT_OLIVE_BG,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="checkmark" size={18} color={DEEP_OLIVE} />
        </Pressable>

        <Pressable
          onPress={() => onDecline?.(request)}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: SOFT_GOLD_BG,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="close" size={18} color={HEAVENLY_GOLD} />
        </Pressable>
      </View>
    </View>
  );
}

function MembersSection({
  members,
  pendingMembers = [],
  loadingMembers,
  memberCount = 0,
  canManageGroup = false,
  onApproveRequest,
  onDeclineRequest,
}) {
  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 22,
        padding: 16,
        marginBottom: 18,
        shadowColor: HEAVENLY_GOLD,
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 4,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "900" }}>
            Members
          </Text>

          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 12.5,
              fontWeight: "700",
              lineHeight: 18,
              marginTop: 5,
            }}
          >
            View leaders, members and join requests for this group.
          </Text>
        </View>

        <View
          style={{
            backgroundColor: SOFT_OLIVE_BG,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          <Text style={{ color: DEEP_OLIVE, fontSize: 11, fontWeight: "900" }}>
            {memberCount} total
          </Text>
        </View>
      </View>

      {loadingMembers ? (
        <ActivityIndicator color={theme.colors.gold} style={{ marginTop: 18 }} />
      ) : members.length === 0 ? (
        <Text
          style={{
            color: theme.colors.muted,
            fontWeight: "700",
            marginTop: 14,
          }}
        >
          No members found yet.
        </Text>
      ) : (
        members.map((member) => <MemberRow key={member.id} member={member} />)
      )}

      <View style={{ marginTop: 12 }}>
        <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: "900" }}>
          Pending requests
        </Text>

        <Text
          style={{
            color: theme.colors.muted,
            fontSize: 12,
            fontWeight: "700",
            lineHeight: 17,
            marginTop: 4,
            marginBottom: 4,
          }}
        >
          {canManageGroup
            ? "Review people waiting to join this group. Approve adds them as active members; decline removes the request."
            : "Only church admins, group leaders and co-leaders can approve or decline join requests."}
        </Text>

        {loadingMembers ? null : pendingMembers.length === 0 ? (
          <Text
            style={{
              color: theme.colors.muted,
              fontWeight: "700",
              marginTop: 10,
            }}
          >
            No pending requests.
          </Text>
        ) : (
          pendingMembers.map((request) => (
            <PendingRequestRow
              key={request.id}
              request={request}
              onApprove={onApproveRequest}
              onDecline={onDeclineRequest}
            />
          ))
        )}
      </View>

      <Pressable
        onPress={() => {}}
        style={[
          theme.button.outline,
          {
            marginTop: 14,
            borderRadius: 16,
            paddingVertical: 12,
            flexDirection: "row",
            gap: 8,
          },
        ]}
      >
        <Ionicons name="person-add-outline" size={17} color={theme.colors.goldPressed} />
        <Text style={theme.button.outlineText}>Add or invite member</Text>
      </Pressable>
    </View>
  );
}

function QuickActionButton({ icon, label, tint = "gold", onPress }) {
  const isOlive = tint === "olive";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: "48%",
        minHeight: 92,
        borderRadius: 18,
        padding: 12,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: HEAVENLY_GOLD,
        shadowOpacity: pressed ? 0.03 : 0.07,
        shadowRadius: 7,
        shadowOffset: { width: 0, height: 3 },
        elevation: pressed ? 1 : 2,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: isOlive ? SOFT_OLIVE_BG : SOFT_GOLD_BG,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        <Ionicons name={icon} size={19} color={isOlive ? DEEP_OLIVE : HEAVENLY_GOLD} />
      </View>

      <Text
        style={{
          color: theme.colors.text,
          fontSize: 12.5,
          fontWeight: "900",
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function QuickActionsSection({ groupName }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text
        style={{
          color: theme.colors.text,
          fontSize: 22,
          fontWeight: "900",
          marginBottom: 6,
        }}
      >
        Quick actions
      </Text>

      <Text
        style={{
          color: theme.colors.muted,
          fontSize: 13,
          fontWeight: "700",
          lineHeight: 18,
          marginBottom: 12,
        }}
      >
        Fast controls for managing this group without digging through settings.
      </Text>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <QuickActionButton
          icon="chatbubbles-outline"
          label="Message group"
          tint="olive"
          onPress={() =>
            Alert.alert("Message group", `${groupName} group messaging will be added later.`)
          }
        />

        <QuickActionButton
          icon="person-add-outline"
          label="Add member"
          onPress={() => Alert.alert("Add member", "Member invite flow will be added later.")}
        />

        <QuickActionButton
          icon="create-outline"
          label="Edit details"
          tint="olive"
          onPress={() => Alert.alert("Edit details", "Group detail editing will be added later.")}
        />

        <QuickActionButton
          icon="pause-circle-outline"
          label="Pause group"
          onPress={() =>
            Alert.alert("Pause group", "Pause/temporary closure flow will be added later.")
          }
        />

        <QuickActionButton
          icon="archive-outline"
          label="Archive group"
          tint="olive"
          onPress={() => Alert.alert("Archive group", "Archive flow will be added later.")}
        />
      </View>
    </View>
  );
}

export default function ChurchGroupManage({ navigation, route }) {
  const { churchId, churchName, group } = route?.params || {};
  const groupId = group?.id || route?.params?.groupId || null;

  const [dbGroup, setDbGroup] = useState(null);
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [dbMembers, setDbMembers] = useState([]);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isChurchAdmin, setIsChurchAdmin] = useState(false);
  const [canManageGroup, setCanManageGroup] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadCurrentUserAndAdminStatus() {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.log("load current user error:", error);
        return;
      }

      const uid = data?.user?.id || null;

      if (!uid) {
        if (alive) {
          setCurrentUserId(null);
          setIsChurchAdmin(false);
        }
        return;
      }

      let adminStatus = false;

      if (churchId) {
        const { data: adminRows, error: adminError } = await supabase
          .from("church_admins")
          .select("id")
          .eq("church_id", churchId)
          .eq("user_id", uid)
          .limit(1);

        if (adminError) {
          console.log("load church admin status error:", adminError);
        } else {
          adminStatus = Array.isArray(adminRows) && adminRows.length > 0;
        }
      }

      if (alive) {
        setCurrentUserId(uid);
        setIsChurchAdmin(adminStatus);
      }
    }

    loadCurrentUserAndAdminStatus();

    return () => {
      alive = false;
    };
  }, [churchId]);

  useEffect(() => {
    let alive = true;

    async function loadGroup() {
      if (!groupId) return;

      try {
        setLoadingGroup(true);

        const { data, error } = await supabase
          .from("church_groups")
          .select("*")
          .eq("id", groupId)
          .single();

        if (error) throw error;

        if (alive) setDbGroup(mapDbGroup(data));
      } catch (e) {
        console.log("load church group manage error:", e);
        if (alive) setDbGroup(null);
      } finally {
        if (alive) setLoadingGroup(false);
      }
    }

    loadGroup();

    return () => {
      alive = false;
    };
  }, [groupId]);

  useEffect(() => {
    let alive = true;

    async function loadMembers() {
      if (!groupId) return;

      try {
        setLoadingMembers(true);

        const { data, error } = await supabase
          .from("church_group_members")
          .select("*")
          .eq("group_id", groupId)
          .order("created_at", { ascending: true });

        if (error) throw error;

        const memberRows = data || [];

        const userIds = memberRows.map((member) => member.user_id).filter(Boolean);

        let profilesByUserId = {};

        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, display_name, handle, avatar_url")
            .in("id", userIds);

          if (profilesError) {
            console.log("load church group member profiles error:", profilesError);
          } else {
            profilesByUserId = (profilesData || []).reduce((acc, profile) => {
              acc[profile.id] = profile;
              return acc;
            }, {});
          }
        }

        const mapped = memberRows.map((member) =>
          mapDbMember({
            ...member,
            profile: profilesByUserId[member.user_id] || null,
          })
        );

        const approvedMapped = mapped.filter((member) => member.status === "Active");
        const pendingMapped = mapped.filter((member) => member.status !== "Active");

        const currentUserMembership = mapped.find(
          (member) => member.userId === currentUserId
        );

        const userIsGroupLeaderOrCoLeader =
          currentUserMembership?.rawStatus === "approved" &&
          ["leader", "co_leader"].includes(currentUserMembership?.rawRole);

        const userCanManageGroup = isChurchAdmin || userIsGroupLeaderOrCoLeader;

        if (alive) {
          setDbMembers(approvedMapped);
          setPendingMembers(pendingMapped);
          setCanManageGroup(userCanManageGroup);
        }
      } catch (e) {
        console.log("load church group members error:", e);

        if (alive) {
          setDbMembers([]);
          setPendingMembers([]);
          setCanManageGroup(false);
        }
      } finally {
        if (alive) {
          setLoadingMembers(false);
        }
      }
    }

    loadMembers();

    return () => {
      alive = false;
    };
  }, [groupId, currentUserId, isChurchAdmin]);

  async function handleApproveRequest(request) {
    if (!canManageGroup) {
      Alert.alert(
        "Permission needed",
        "Only church admins, group leaders and co-leaders can approve requests."
      );
      return;
    }

    try {
      const { error } = await supabase
        .from("church_group_members")
        .update({
          status: "approved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (error) throw error;

      setPendingMembers((current) => current.filter((member) => member.id !== request.id));

      setDbMembers((current) => [
        ...current,
        {
          ...request,
          status: "Active",
        },
      ]);
    } catch (e) {
      console.log("approve church group request error:", e);
      Alert.alert("Could not approve request", "Please try again.");
    }
  }

  async function handleDeclineRequest(request) {
    if (!canManageGroup) {
      Alert.alert(
        "Permission needed",
        "Only church admins, group leaders and co-leaders can decline requests."
      );
      return;
    }

    try {
      const { error } = await supabase
        .from("church_group_members")
        .delete()
        .eq("id", request.id);

      if (error) throw error;

      setPendingMembers((current) => current.filter((member) => member.id !== request.id));
    } catch (e) {
      console.log("decline church group request error:", e);
      Alert.alert("Could not decline request", "Please try again.");
    }
  }

  const activeGroup = useMemo(() => {
    return dbGroup || group || {};
  }, [dbGroup, group]);

  const groupName = activeGroup?.name || "Church Group";
  const groupType = activeGroup?.type || "Group";
  const groupArea = activeGroup?.area || "Location not set";
  const groupLeader = activeGroup?.leader || "Leader not set";
  const groupTime = activeGroup?.time || "Time not set";
  const groupStatus = activeGroup?.status || "Active";
  const groupDescription = activeGroup?.description || "";

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
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
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
              Manage Group
            </Text>

            <View style={{ width: 38 }} />
          </View>

          {loadingGroup ? (
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <ActivityIndicator color={theme.colors.gold} />
              <Text style={{ color: theme.colors.muted, fontWeight: "700", marginLeft: 10 }}>
                Loading group…
              </Text>
            </View>
          ) : null}

          <Text
            style={{
              color: theme.colors.text,
              fontSize: 28,
              fontWeight: "900",
              letterSpacing: -0.7,
              marginBottom: 8,
            }}
          >
            {groupName}
          </Text>

          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 15,
              fontWeight: "700",
              lineHeight: 22,
              marginBottom: 16,
            }}
          >
            Manage this group’s details, members, leaders and future discipleship tools for{" "}
            {churchName || "your church"}.
          </Text>

          <GroupOverviewCard
            groupName={groupName}
            groupType={groupType}
            groupArea={groupArea}
            groupLeader={groupLeader}
            groupTime={groupTime}
            groupStatus={groupStatus}
            groupDescription={groupDescription}
            memberCount={dbMembers.length}
            pendingRequestCount={pendingMembers.length}
          />

          <MembersSection
            members={dbMembers}
            pendingMembers={pendingMembers}
            loadingMembers={loadingMembers}
            memberCount={dbMembers.length}
            canManageGroup={canManageGroup}
            onApproveRequest={handleApproveRequest}
            onDeclineRequest={handleDeclineRequest}
          />

          <QuickActionsSection groupName={groupName} />

          <Text
            style={{
              color: theme.colors.text,
              fontSize: 22,
              fontWeight: "900",
              marginBottom: 10,
            }}
          >
            Group tools
          </Text>

          <ManageActionCard
            icon="create-outline"
            title="Edit group details"
            subtitle="Update group name, type, area, leader, meeting time and description."
          />

          <ManageActionCard
            icon="people-outline"
            title="Manage members"
            subtitle="View members, approve requests and manage who belongs to this group."
            tint="olive"
          />

          <ManageActionCard
            icon="person-add-outline"
            title="Manage leaders"
            subtitle="Assign group leaders, co-leaders and future pastoral oversight."
          />

          <ManageActionCard
            icon="chatbubbles-outline"
            title="Group updates"
            subtitle="Future place for announcements, encouragement and group communication."
            tint="olive"
          />

          <ManageActionCard
            icon="checkmark-circle-outline"
            title="Attendance and activity"
            subtitle="Future discipleship tracking for attendance, participation and care."
          />

          <View
            style={{
              marginTop: 8,
              padding: 14,
              borderRadius: 18,
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: CARD_BORDER,
            }}
          >
            <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 15 }}>
              Coming later
            </Text>

            <Text
              style={{
                color: theme.colors.muted,
                fontWeight: "700",
                lineHeight: 19,
                marginTop: 6,
              }}
            >
              Group details, approved members and join requests are now live. Permissions, leader roles,
              group updates, attendance and care tools will be wired separately.
            </Text>
          </View>

          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 11,
              fontWeight: "700",
              textAlign: "center",
              marginTop: 18,
            }}
          >
            Church ID: {churchId || "not set"}
          </Text>
        </ScrollView>
      )}
    </Screen>
  );
}