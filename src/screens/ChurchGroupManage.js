// src/screens/ChurchGroupManage.js
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";

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
const DANGER_SOFT = "rgba(180, 35, 24, 0.08)";
const DANGER_BORDER = "rgba(180, 35, 24, 0.18)";

const DEFAULT_RECENT_ACTIVITY = "Active this week";

const displayFont = Platform.OS === "ios" ? "Georgia" : "serif";

const serifHeading = {
  fontFamily: displayFont,
  color: TEXT,
  fontWeight: "900",
  letterSpacing: -0.45,
};

const defaultGroupCategories = [
  {
    id: "Tables",
    title: "Tables",
    subtitle: "Local discipleship tables and smaller relational groups.",
    icon: "restaurant-outline",
    tint: "amber",
    source: "default",
  },
  {
    id: "Bible Studies",
    title: "Bible Studies",
    subtitle: "Scripture-focused groups and study communities.",
    icon: "book-outline",
    tint: "olive",
    source: "default",
  },
  {
    id: "Men’s Groups",
    title: "Men’s Groups",
    subtitle: "Men’s fellowship, discipleship and accountability groups.",
    icon: "man-outline",
    tint: "amber",
    source: "default",
  },
  {
    id: "Women’s Groups",
    title: "Women’s Groups",
    subtitle: "Women’s fellowship, encouragement and discipleship groups.",
    icon: "woman-outline",
    tint: "olive",
    source: "default",
  },
  {
    id: "Young Adults",
    title: "Young Adults",
    subtitle: "Groups for younger adults growing in faith and friendship.",
    icon: "people-circle-outline",
    tint: "amber",
    source: "default",
  },
  {
    id: "Prayer Groups",
    title: "Prayer Groups",
    subtitle: "Prayer gatherings, intercession and app Prayer Spaces.",
    icon: "hand-left-outline",
    tint: "olive",
    source: "default",
  },
];

const audienceOptions = [
  { key: "everyone", label: "Everyone" },
  { key: "men", label: "Men" },
  { key: "women", label: "Women" },
  { key: "young_adults", label: "Young Adults" },
  { key: "parents", label: "Parents" },
  { key: "seniors", label: "Seniors" },
  { key: "invite_only", label: "Invite Only" },
];

const visibilityOptions = [
  {
    key: "church",
    label: "Visible to church",
    description: "Eligible church members can discover this group.",
  },
  {
    key: "hidden",
    label: "Hidden / invite only",
    description: "Only admins and leaders can add or invite people.",
  },
];

const meetingFormatOptions = [
  {
    key: "physical",
    label: "In person",
    description:
      "This group meets physically at a church, home, hall, or local place.",
    icon: "location-outline",
  },
  {
    key: "online",
    label: "Online",
    description:
      "This group meets through Zoom, Teams, Google Meet, or another online link.",
    icon: "videocam-outline",
  },
  {
    key: "hybrid",
    label: "In person + online",
    description: "This group has a physical meeting and an online option.",
    icon: "git-compare-outline",
  },
  {
    key: "app_only",
    label: "App-only Prayer Space",
    description:
      "This group mainly exists inside Triunely for prayer requests and ongoing prayer.",
    icon: "phone-portrait-outline",
  },
];

function emptyEditForm() {
  return {
    name: "",
    type: "Tables",
    description: "",
    audience: "everyone",
    visibility: "church",
    area: "",
    leaderName: "",
    meetingDay: "",
    meetingTime: "",
    meetingFormat: "physical",
    hasPrayerSpace: false,
  };
}

function getInitials(name) {
  const cleanName = String(name || "").trim();
  if (!cleanName) return "?";

  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }

  return cleanName.charAt(0).toUpperCase();
}

function formatMeetingFormat(value) {
  const format = String(value || "").toLowerCase();

  if (format === "physical") return "In person";
  if (format === "online") return "Online";
  if (format === "hybrid") return "In person + online";
  if (format === "app_only") return "App-only prayer space";

  return "Format not set";
}

function tintColors(tint) {
  if (tint === "amber") {
    return {
      soft: AMBER_SOFT,
      border: AMBER_BORDER,
      main: EVENT_AMBER,
      strong: EVENT_BROWN,
    };
  }

  if (tint === "danger") {
    return {
      soft: DANGER_SOFT,
      border: DANGER_BORDER,
      main: DANGER,
      strong: DANGER,
    };
  }

  return {
    soft: OLIVE_SOFT,
    border: OLIVE_BORDER,
    main: OLIVE,
    strong: OLIVE,
  };
}

function PremiumIcon({ icon, tint = "olive", size = 42 }) {
  const colors = tintColors(tint);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.soft,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Ionicons name={icon} size={Math.round(size * 0.47)} color={colors.main} />
    </View>
  );
}

function Pill({ children, tint = "olive" }) {
  const colors = tintColors(tint);

  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: 999,
        paddingHorizontal: 9,
        paddingVertical: 5,
        backgroundColor: colors.soft,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text
        style={{
          color: colors.strong,
          fontSize: 11,
          fontWeight: "900",
        }}
        numberOfLines={1}
      >
        {children}
      </Text>
    </View>
  );
}

function mapDbMember(item) {
  const role =
    item.role === "leader"
      ? "Leader"
      : item.role === "co_leader"
        ? "Co-leader"
        : "Member";

  const status = item.status === "approved" ? "Active" : item.status || "Pending";

  const fallbackName = item.user_id?.slice(0, 8) || "Member";
  const displayName =
    item.profile?.display_name || item.profile?.handle || fallbackName;

  return {
    id: item.id,
    userId: item.user_id,
    rawRole: item.role,
    rawStatus: item.status,
    name: displayName,
    role,
    status,
    initials: getInitials(displayName),
    avatarUrl: item.profile?.avatar_url || null,
  };
}

function normalizeChurchGroupRole(role) {
  const value = String(role || "").toLowerCase();

  if (value === "leader") return "leader";
  if (value === "co_leader") return "co_leader";
  if (value === "co-leader") return "co_leader";
  if (value === "admin") return "leader";

  return "member";
}

function getChurchGroupRoleLabel(role) {
  const normalized = normalizeChurchGroupRole(role);

  if (normalized === "leader") return "Leader";
  if (normalized === "co_leader") return "Co-leader";

  return "Member";
}

function getChurchGroupRoleTint(role) {
  const normalized = normalizeChurchGroupRole(role);

  if (normalized === "leader") return "amber";
  if (normalized === "co_leader") return "amber";

  return "olive";
}

function canCurrentUserManageChurchGroupMember({
  isChurchAdmin,
  canManageGroup,
  currentUserRole,
  currentUserId,
  targetMember,
}) {
  if (!targetMember?.userId) return false;

  const targetUserId = targetMember.userId;
  const targetRole = normalizeChurchGroupRole(targetMember.rawRole);
  const viewerRole = normalizeChurchGroupRole(currentUserRole);

  if (currentUserId && targetUserId === currentUserId) {
    return false;
  }

  if (isChurchAdmin) {
    return true;
  }

  if (viewerRole === "leader") {
    return targetRole !== "leader";
  }

  if (canManageGroup) {
    return targetRole !== "leader";
  }

  return false;
}

function getChurchGroupMemberSortWeight(member) {
  const role = normalizeChurchGroupRole(member?.rawRole);

  if (role === "leader") return 1;
  if (role === "co_leader") return 2;

  return 3;
}

function mapDbGroup(item) {
  if (!item) return null;

  const meetingFormat = item.meeting_format || item.meetingFormat || null;

  return {
    id: item.id,
    church_id: item.church_id || item.churchId || null,
    churchId: item.church_id || item.churchId || null,
    name: item.name || "Church Group",
    type: item.type || "Group",
    area: item.area || "Location not set",
    leader: item.leader_name || item.leader || "Leader not set",
     meetingFormat,
    meetingDay: item.meeting_day || item.meetingDay || "",
    meetingTime: item.meeting_time || item.meetingTime || "",
    audience: item.audience || "everyone",
    visibility: item.visibility || (item.is_public === false ? "hidden" : "church"),
    hasPrayerSpace: !!(item.has_prayer_space || item.hasPrayerSpace),
    time:
      item.meeting_day || item.meeting_time || item.meetingDay || item.meetingTime
        ? `${item.meeting_day || item.meetingDay || ""} ${
            item.meeting_time || item.meetingTime || ""
          }`.trim()
        : meetingFormat === "app_only"
          ? "App-only"
          : item.time || "Time not set",
    status: item.status === "active" ? "Active" : item.status || "Active",
    rawStatus: item.status || "active",
    description: item.description || "",
  };
}

function DraggableSheet({
  visible,
  onClose,
  children,
  maxHeight = "86%",
  showHandle = true,
}) {
  const translateY = useRef(new Animated.Value(0)).current;

  const closeWithAnimation = () => {
    Animated.timing(translateY, {
      toValue: 420,
      duration: 170,
      useNativeDriver: true,
    }).start(() => {
      translateY.setValue(0);
      onClose?.();
    });
  };

  const snapBack = () => {
    Animated.spring(translateY, {
      toValue: 0,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 5,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          translateY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 80 || gesture.vy > 0.75) {
          closeWithAnimation();
        } else {
          snapBack();
        }
      },
      onPanResponderTerminate: snapBack,
    })
  ).current;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(20, 24, 18, 0.42)",
            justifyContent: "flex-end",
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} />

          <Animated.View
            style={{
              maxHeight,
              backgroundColor: PREMIUM_CREAM,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: Platform.OS === "ios" ? 24 : 18,
              transform: [{ translateY }],
            }}
          >
            {showHandle ? (
              <View
                {...panResponder.panHandlers}
                style={{
                  height: 28,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 4,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 5,
                    borderRadius: 999,
                    backgroundColor: "rgba(79, 99, 59, 0.25)",
                  }}
                />
              </View>
            ) : null}

            {children}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ManageActionCard({ icon, title, subtitle, tint = "amber", onPress }) {
  const colors = tintColors(tint);

  return (
    <Pressable
      onPress={onPress || (() => {})}
      style={({ pressed }) => ({
        backgroundColor: SURFACE,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 24,
        padding: 14,
        marginBottom: 11,
        shadowColor: SHADOW,
        shadowOpacity: pressed ? 0.03 : 0.055,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: pressed ? 1 : 2,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <PremiumIcon icon={icon} tint={tint} size={44} />

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={{
              color: TEXT,
              fontSize: 15,
              fontWeight: "900",
              lineHeight: 20,
            }}
          >
            {title}
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 12.5,
              fontWeight: "700",
              lineHeight: 18,
              marginTop: 4,
            }}
          >
            {subtitle}
          </Text>
        </View>

        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            backgroundColor: colors.soft,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 8,
          }}
        >
          <Ionicons name="chevron-forward" size={17} color={colors.main} />
        </View>
      </View>
    </Pressable>
  );
}

function OverviewStat({ label, value, tint = "amber" }) {
  const colors = tintColors(tint);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: tint === "amber" ? AMBER_SOFT : OLIVE_SOFT,
        borderWidth: 1,
        borderColor: tint === "amber" ? AMBER_BORDER : OLIVE_BORDER,
        borderRadius: 18,
        paddingVertical: 12,
        paddingHorizontal: 10,
      }}
    >
      <Text
        style={{
          color: colors.strong,
          fontSize: 18,
          fontWeight: "900",
          textAlign: "center",
        }}
        numberOfLines={1}
      >
        {value}
      </Text>

      <Text
        style={{
          color: MUTED,
          fontSize: 10.5,
          fontWeight: "800",
          textAlign: "center",
          marginTop: 4,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

function DetailRow({ icon, label, value, tint = "amber" }) {
  const colors = tintColors(tint);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 9,
        borderTopWidth: 1,
        borderTopColor: CARD_BORDER,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 999,
          backgroundColor: colors.soft,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
        }}
      >
        <Ionicons name={icon} size={15} color={colors.main} />
      </View>

      <Text style={{ color: MUTED, fontWeight: "800", width: 86, fontSize: 12.5 }}>
        {label}
      </Text>

      <Text
        style={{
          color: TEXT,
          fontWeight: "850",
          flex: 1,
          fontSize: 12.8,
        }}
        numberOfLines={2}
      >
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
  groupMeetingFormat,
  hasPrayerSpace,
  memberCount = 0,
  pendingRequestCount = 0,
}) {
  const isPrayerSpace = !!hasPrayerSpace;

  return (
    <View
      style={{
        backgroundColor: SURFACE,
        borderWidth: 1,
        borderColor: isPrayerSpace ? AMBER_BORDER : CARD_BORDER,
        borderRadius: 30,
        padding: 16,
        marginBottom: 18,
        shadowColor: SHADOW,
        shadowOpacity: 0.09,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 7 },
        elevation: 3,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          marginBottom: 14,
        }}
      >
        <PremiumIcon
          icon={isPrayerSpace ? "hand-left-outline" : "people-outline"}
          tint={isPrayerSpace ? "amber" : "olive"}
          size={54}
        />

        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <Text
              style={[
                serifHeading,
                {
                  fontSize: 22,
                  lineHeight: 27,
                  flex: 1,
                  paddingRight: 8,
                },
              ]}
            >
              {groupName}
            </Text>

            <Pill tint={groupStatus === "Active" ? "olive" : "amber"}>
              {groupStatus}
            </Pill>
          </View>

          <Text
            style={{
              color: MUTED,
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
              color: MUTED,
              fontSize: 12.8,
              fontWeight: "700",
              lineHeight: 19,
              marginTop: 7,
            }}
          >
            {groupDescription ||
              "A smaller discipleship space for fellowship, growth, care and community."}
          </Text>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 7,
              marginTop: 11,
            }}
          >
            <Pill tint="amber">{formatMeetingFormat(groupMeetingFormat)}</Pill>

            {isPrayerSpace ? (
              <Pill tint="amber">Prayer space enabled</Pill>
            ) : (
              <Pill tint="olive">No app prayer space</Pill>
            )}
          </View>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
        <OverviewStat label="Members" value={memberCount} tint="amber" />
        <OverviewStat label="Requests" value={pendingRequestCount} tint="olive" />
        <OverviewStat label="Status" value="Live" tint="amber" />
      </View>

      <DetailRow icon="person-outline" label="Leader" value={groupLeader} tint="olive" />
      <DetailRow icon="location-outline" label="Area" value={groupArea} tint="amber" />
      <DetailRow icon="time-outline" label="Meets" value={groupTime} tint="olive" />
      <DetailRow
        icon="calendar-outline"
        label="Format"
        value={formatMeetingFormat(groupMeetingFormat)}
        tint="amber"
      />
      <DetailRow
        icon="pulse-outline"
        label="Activity"
        value={DEFAULT_RECENT_ACTIVITY}
        tint="olive"
      />
    </View>
  );
}

function MemberRow({ member }) {
  const isLeader = member.role === "Leader";
  const isCoLeader = member.role === "Co-leader";
  const tint = isLeader || isCoLeader ? "amber" : "olive";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 11,
        borderTopWidth: 1,
        borderTopColor: CARD_BORDER,
      }}
    >
      <PremiumIcon icon="person-outline" tint={tint} size={42} />

      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ color: TEXT, fontSize: 14.5, fontWeight: "900" }}>
          {member.name}
        </Text>

        <Text
          style={{
            color: MUTED,
            fontSize: 12,
            fontWeight: "700",
            marginTop: 3,
          }}
        >
          {member.status}
        </Text>
      </View>

      <Pill tint={tint}>{member.role}</Pill>
    </View>
  );
}

function PendingRequestRow({ request, onApprove, onDecline }) {
  const rawStatus = String(request.rawStatus || request.status || "").toLowerCase();

  const label =
    rawStatus === "pending"
      ? "Requested to join this group"
      : rawStatus === "invited"
        ? "Invited — waiting for response"
        : request.status;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 11,
        borderTopWidth: 1,
        borderTopColor: CARD_BORDER,
      }}
    >
      <PremiumIcon icon="person-outline" tint="amber" size={42} />

      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ color: TEXT, fontSize: 14.5, fontWeight: "900" }}>
          {request.name}
        </Text>

        <Text
          style={{
            color: MUTED,
            fontSize: 12,
            fontWeight: "700",
            marginTop: 3,
          }}
        >
          {label}
        </Text>
      </View>

      {rawStatus === "invited" ? null : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable
            onPress={() => onApprove?.(request)}
            style={({ pressed }) => ({
              width: 34,
              height: 34,
              borderRadius: 999,
              backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
              borderWidth: 1,
              borderColor: OLIVE_BORDER,
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <Ionicons name="checkmark" size={18} color={OLIVE} />
          </Pressable>

          <Pressable
            onPress={() => onDecline?.(request)}
            style={({ pressed }) => ({
              width: 34,
              height: 34,
              borderRadius: 999,
              backgroundColor: pressed ? DANGER_SOFT : SURFACE,
              borderWidth: 1,
              borderColor: DANGER_BORDER,
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <Ionicons name="close" size={18} color={DANGER} />
          </Pressable>
        </View>
      )}
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
  onOpenInviteMember,
}) {
  return (
    <View
      style={{
        backgroundColor: SURFACE,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 28,
        padding: 16,
        marginBottom: 18,
        shadowColor: SHADOW,
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 5 },
        elevation: 2,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text
            style={[
              serifHeading,
              {
                fontSize: 22,
                lineHeight: 27,
              },
            ]}
          >
            Members
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 12.5,
              fontWeight: "700",
              lineHeight: 18,
              marginTop: 5,
            }}
          >
            View leaders, members and join requests for this group.
          </Text>
        </View>

        <Pill tint="olive">{memberCount} total</Pill>
      </View>

      {loadingMembers ? (
        <View style={{ paddingVertical: 18, alignItems: "center" }}>
          <ActivityIndicator color={EVENT_AMBER} />
          <Text style={{ color: MUTED, marginTop: 8, fontWeight: "700" }}>
            Loading members…
          </Text>
        </View>
      ) : members.length === 0 ? (
        <Text
          style={{
            color: MUTED,
            fontWeight: "700",
            marginTop: 14,
          }}
        >
          No members found yet.
        </Text>
      ) : (
        members.map((member) => <MemberRow key={member.id} member={member} />)
      )}

      <View style={{ marginTop: 14 }}>
        <Text style={{ color: TEXT, fontSize: 15, fontWeight: "900" }}>
          Pending requests and invites
        </Text>

        <Text
          style={{
            color: MUTED,
            fontSize: 12,
            fontWeight: "700",
            lineHeight: 17,
            marginTop: 4,
            marginBottom: 4,
          }}
        >
          {canManageGroup
            ? "Review people waiting to join, or invite approved church members into this group."
            : "Only church admins, group leaders and co-leaders can approve, decline or invite members."}
        </Text>

        {loadingMembers ? null : pendingMembers.length === 0 ? (
          <Text
            style={{
              color: MUTED,
              fontWeight: "700",
              marginTop: 10,
            }}
          >
            No pending requests or invites.
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
        onPress={onOpenInviteMember}
        style={({ pressed }) => ({
          marginTop: 14,
          borderRadius: 999,
          paddingVertical: 12,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
          borderWidth: 1,
          borderColor: OLIVE_BORDER,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <Ionicons
          name="person-add-outline"
          size={17}
          color={OLIVE}
          style={{ marginRight: 8 }}
        />

        <Text
          style={{
            color: OLIVE,
            fontSize: 13,
            fontWeight: "900",
          }}
        >
          Add or invite member
        </Text>
      </Pressable>
    </View>
  );
}

function InviteCandidateRow({ candidate, inviting, onInvite }) {
  const sourceLabel = candidate.isAdmin ? "Church admin" : "Approved church member";

  return (
    <View
      style={{
        backgroundColor: SURFACE,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 22,
        padding: 12,
        marginBottom: 10,
        shadowColor: SHADOW,
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 1,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <PremiumIcon
          icon={candidate.isAdmin ? "shield-checkmark-outline" : "person-outline"}
          tint={candidate.isAdmin ? "amber" : "olive"}
          size={46}
        />

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: TEXT, fontSize: 14.5, fontWeight: "900" }}>
            {candidate.name}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
            <Ionicons
              name={
                candidate.isAdmin
                  ? "shield-checkmark-outline"
                  : "checkmark-circle-outline"
              }
              size={13}
              color={candidate.isAdmin ? EVENT_AMBER : OLIVE}
            />

            <Text
              style={{
                color: MUTED,
                fontSize: 12,
                fontWeight: "700",
                marginLeft: 6,
              }}
            >
              {sourceLabel}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => onInvite?.(candidate)}
          disabled={inviting}
          style={({ pressed }) => ({
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 9,
            backgroundColor: EVENT_AMBER,
            opacity: pressed || inviting ? 0.75 : 1,
            flexDirection: "row",
            alignItems: "center",
          })}
        >
          {inviting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="mail-outline" size={15} color="#FFFFFF" />
          )}

          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 12,
              fontWeight: "900",
              marginLeft: inviting ? 0 : 6,
            }}
          >
            Invite
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function InviteMemberModal({
  visible,
  onClose,
  groupName,
  search,
  onChangeSearch,
  loading,
  candidates,
  invitingUserId,
  onInvite,
}) {
  const q = String(search || "").trim().toLowerCase();

  const filteredCandidates = candidates.filter((candidate) => {
    if (!q) return true;

    return (
      String(candidate.name || "").toLowerCase().includes(q) ||
      String(candidate.handle || "").toLowerCase().includes(q)
    );
  });

return (
  <DraggableSheet visible={visible} onClose={onClose} maxHeight="86%">
    <View
        style={{
          backgroundColor: SURFACE,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          borderRadius: 26,
          padding: 14,
          marginBottom: 12,
          shadowColor: SHADOW,
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 5 },
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <PremiumIcon icon="person-add-outline" tint="amber" size={46} />

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text
              style={[
                serifHeading,
                {
                  fontSize: 22,
                  lineHeight: 27,
                },
              ]}
            >
              Invite to group
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 13,
                fontWeight: "700",
                lineHeight: 19,
                marginTop: 4,
              }}
            >
              Choose approved church members or church admins to invite into{" "}
              {groupName || "this group"}.
            </Text>
          </View>

          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 999,
              backgroundColor: pressed ? OLIVE_SOFT : PREMIUM_CREAM,
              borderWidth: 1,
              borderColor: CARD_BORDER,
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 8,
            })}
          >
            <Ionicons name="close" size={21} color={TEXT} />
          </Pressable>
        </View>
      </View>

      <View
        style={{
          backgroundColor: SURFACE,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Ionicons name="search-outline" size={18} color={MUTED} />

        <TextInput
          value={search}
          onChangeText={onChangeSearch}
          placeholder="Search by name"
          placeholderTextColor="rgba(107, 114, 128, 0.72)"
          style={{
            flex: 1,
            color: TEXT,
            fontSize: 14,
            fontWeight: "800",
            paddingVertical: 0,
            marginLeft: 8,
          }}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: OLIVE_SOFT,
            borderWidth: 1,
            borderColor: OLIVE_BORDER,
            borderRadius: 16,
            paddingVertical: 9,
            paddingHorizontal: 10,
          }}
        >
          <Text style={{ color: OLIVE, fontSize: 15, fontWeight: "900" }}>
            {candidates.length}
          </Text>

          <Text style={{ color: MUTED, fontSize: 11, fontWeight: "800" }}>
            Available
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            backgroundColor: AMBER_SOFT,
            borderWidth: 1,
            borderColor: AMBER_BORDER,
            borderRadius: 16,
            paddingVertical: 9,
            paddingHorizontal: 10,
          }}
        >
          <Text style={{ color: EVENT_BROWN, fontSize: 15, fontWeight: "900" }}>
            {filteredCandidates.length}
          </Text>

          <Text style={{ color: MUTED, fontSize: 11, fontWeight: "800" }}>
            Showing
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: 18,
        }}
      >
        {loading ? (
          <View
            style={{
              backgroundColor: SURFACE,
              borderWidth: 1,
              borderColor: CARD_BORDER,
              borderRadius: 22,
              paddingVertical: 24,
              alignItems: "center",
            }}
          >
            <ActivityIndicator color={EVENT_AMBER} />

            <Text
              style={{
                color: MUTED,
                fontWeight: "700",
                marginTop: 10,
              }}
            >
              Loading people…
            </Text>
          </View>
        ) : filteredCandidates.length === 0 ? (
          <View
            style={{
              backgroundColor: SURFACE,
              borderWidth: 1,
              borderColor: CARD_BORDER,
              borderRadius: 22,
              padding: 14,
            }}
          >
            <Text style={{ color: TEXT, fontSize: 15, fontWeight: "900" }}>
              No available people found
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 12.5,
                fontWeight: "700",
                lineHeight: 18,
                marginTop: 5,
              }}
            >
              They may already be in this group, already invited, waiting for
              approval, or not yet approved in this church.
            </Text>
          </View>
        ) : (
          filteredCandidates.map((candidate) => (
            <InviteCandidateRow
              key={candidate.userId}
              candidate={candidate}
              inviting={invitingUserId === candidate.userId}
              onInvite={onInvite}
            />
          ))
        )}
      </ScrollView>
    </DraggableSheet>
  );
}

function ManageMemberLeaderRow({
  member,
  currentUserId,
  currentUserRole,
  isChurchAdmin,
  canManageGroup,
  actingMemberId,
  onPromoteToLeader,
  onPromoteToCoLeader,
  onDemoteToMember,
  onRemoveMember,
}) {
  const role = normalizeChurchGroupRole(member?.rawRole);
  const roleLabel = getChurchGroupRoleLabel(role);
  const tint = getChurchGroupRoleTint(role);
  const colors = tintColors(tint);

const canManage = canCurrentUserManageChurchGroupMember({
  isChurchAdmin,
  canManageGroup,
  currentUserRole,
  currentUserId,
  targetMember: member,
});

  const isActing = actingMemberId === member?.id;

  return (
    <View
      style={{
        backgroundColor: SURFACE,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 22,
        padding: 12,
        marginBottom: 10,
        shadowColor: SHADOW,
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 1,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <PremiumIcon
          icon={role === "leader" ? "shield-checkmark-outline" : "person-outline"}
          tint={tint}
          size={44}
        />

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={{
              color: TEXT,
              fontSize: 14.5,
              fontWeight: "900",
            }}
            numberOfLines={1}
          >
            {member?.name || "Member"}
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 12,
              fontWeight: "700",
              marginTop: 3,
            }}
            numberOfLines={1}
          >
            {member?.status || "Active"}
          </Text>
        </View>

        <View
          style={{
            borderRadius: 999,
            paddingHorizontal: 9,
            paddingVertical: 5,
            backgroundColor: colors.soft,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              color: colors.strong,
              fontSize: 11,
              fontWeight: "900",
            }}
            numberOfLines={1}
          >
            {roleLabel}
          </Text>
        </View>
      </View>

      {canManage ? (
        <View
          style={{
            marginTop: 12,
            paddingTop: 11,
            borderTopWidth: 1,
            borderTopColor: CARD_BORDER,
          }}
        >
          {isActing ? (
            <View
              style={{
                paddingVertical: 10,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
              }}
            >
              <ActivityIndicator size="small" color={EVENT_AMBER} />

              <Text
                style={{
                  color: MUTED,
                  fontSize: 12.5,
                  fontWeight: "800",
                  marginLeft: 8,
                }}
              >
                Updating member…
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {role !== "leader" ? (
                <Pressable
                  onPress={() => onPromoteToLeader?.(member)}
                  style={({ pressed }) => ({
                    borderRadius: 999,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    backgroundColor: pressed ? AMBER_SOFT : SURFACE,
                    borderWidth: 1,
                    borderColor: AMBER_BORDER,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  })}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={15}
                    color={EVENT_AMBER}
                    style={{ marginRight: 7 }}
                  />

                  <Text
                    style={{
                      color: EVENT_BROWN,
                      fontSize: 12.5,
                      fontWeight: "900",
                    }}
                  >
                    Make leader
                  </Text>
                </Pressable>
              ) : null}

              {role === "member" ? (
                <Pressable
                  onPress={() => onPromoteToCoLeader?.(member)}
                  style={({ pressed }) => ({
                    borderRadius: 999,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
                    borderWidth: 1,
                    borderColor: OLIVE_BORDER,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  })}
                >
                  <Ionicons
                    name="person-add-outline"
                    size={15}
                    color={OLIVE}
                    style={{ marginRight: 7 }}
                  />

                  <Text
                    style={{
                      color: OLIVE,
                      fontSize: 12.5,
                      fontWeight: "900",
                    }}
                  >
                    Make co-leader
                  </Text>
                </Pressable>
              ) : null}

              {role !== "member" ? (
                <Pressable
                  onPress={() => onDemoteToMember?.(member)}
                  style={({ pressed }) => ({
                    borderRadius: 999,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  })}
                >
                  <Ionicons
                    name="arrow-down-circle-outline"
                    size={15}
                    color={MUTED}
                    style={{ marginRight: 7 }}
                  />

                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 12.5,
                      fontWeight: "900",
                    }}
                  >
                    Make member
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={() => onRemoveMember?.(member)}
                style={({ pressed }) => ({
                  borderRadius: 999,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  backgroundColor: pressed ? DANGER_SOFT : SURFACE,
                  borderWidth: 1,
                  borderColor: DANGER_BORDER,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <Ionicons
                  name="trash-outline"
                  size={15}
                  color={DANGER}
                  style={{ marginRight: 7 }}
                />

                <Text
                  style={{
                    color: DANGER,
                    fontSize: 12.5,
                    fontWeight: "900",
                  }}
                >
                  Remove from group
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

function ManageMembersLeadersSheet({
  visible,
  onClose,
  members,
  currentUserId,
  currentUserRole,
  isChurchAdmin,
  canManageGroup,
  actingMemberId,
  onPromoteToLeader,
  onPromoteToCoLeader,
  onDemoteToMember,
  onRemoveMember,
}) {
  const sortedMembers = useMemo(() => {
    return [...(members || [])].sort((a, b) => {
      const roleWeight =
        getChurchGroupMemberSortWeight(a) - getChurchGroupMemberSortWeight(b);

      if (roleWeight !== 0) return roleWeight;

      return String(a?.name || "").localeCompare(String(b?.name || ""));
    });
  }, [members]);

  const leaders = sortedMembers.filter(
    (member) => normalizeChurchGroupRole(member?.rawRole) === "leader"
  );

  const coLeaders = sortedMembers.filter(
    (member) => normalizeChurchGroupRole(member?.rawRole) === "co_leader"
  );

  const normalMembers = sortedMembers.filter(
    (member) => normalizeChurchGroupRole(member?.rawRole) === "member"
  );

  function renderSection(title, subtitle, rows) {
    return (
      <View
        style={{
          backgroundColor: SURFACE,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          borderRadius: 24,
          padding: 14,
          marginBottom: 12,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: rows.length ? 10 : 0,
          }}
        >
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text
              style={{
                color: TEXT,
                fontSize: 16,
                fontWeight: "900",
              }}
            >
              {title}
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 12.5,
                fontWeight: "700",
                lineHeight: 18,
                marginTop: 4,
              }}
            >
              {subtitle}
            </Text>
          </View>

          <Pill tint="olive">{rows.length}</Pill>
        </View>

        {rows.length === 0 ? (
          <Text
            style={{
              color: MUTED,
              fontSize: 12.5,
              fontWeight: "700",
              marginTop: 10,
            }}
          >
            None yet.
          </Text>
        ) : (
          rows.map((member) => (
           <ManageMemberLeaderRow
  key={member.id}
  member={member}
  currentUserId={currentUserId}
  currentUserRole={currentUserRole}
  isChurchAdmin={isChurchAdmin}
  canManageGroup={canManageGroup}
  actingMemberId={actingMemberId}
              onPromoteToLeader={onPromoteToLeader}
              onPromoteToCoLeader={onPromoteToCoLeader}
              onDemoteToMember={onDemoteToMember}
              onRemoveMember={onRemoveMember}
            />
          ))
        )}
      </View>
    );
  }

  return (
    <DraggableSheet visible={visible} onClose={onClose} maxHeight="88%">
      <View
        style={{
          backgroundColor: SURFACE,
          borderWidth: 1,
          borderColor: AMBER_BORDER,
          borderRadius: 28,
          padding: 15,
          marginBottom: 12,
          shadowColor: SHADOW,
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 5 },
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <PremiumIcon icon="people-outline" tint="amber" size={48} />

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text
              style={[
                serifHeading,
                {
                  fontSize: 24,
                  lineHeight: 29,
                },
              ]}
            >
              Members & leaders
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 13,
                fontWeight: "700",
                lineHeight: 19,
                marginTop: 4,
              }}
            >
              Promote leaders, assign co-leaders, or remove people from this
              church group.
            </Text>
          </View>

          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 999,
              backgroundColor: pressed ? OLIVE_SOFT : PREMIUM_CREAM,
              borderWidth: 1,
              borderColor: CARD_BORDER,
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 8,
            })}
          >
            <Ionicons name="close" size={21} color={TEXT} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 18 }}
      >
        <View
          style={{
            backgroundColor: OLIVE_SOFT,
            borderWidth: 1,
            borderColor: OLIVE_BORDER,
            borderRadius: 22,
            padding: 13,
            marginBottom: 12,
            flexDirection: "row",
            alignItems: "flex-start",
          }}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color={OLIVE}
            style={{ marginRight: 9, marginTop: 1 }}
          />

          <Text
            style={{
              flex: 1,
              color: MUTED,
              fontSize: 12.5,
              lineHeight: 18,
              fontWeight: "700",
            }}
          >
            Church admins can manage all roles. Group leaders can manage
            members and co-leaders. Co-leaders can help invite and approve, but
            role changes stay with leaders/admins.
          </Text>
        </View>

        {renderSection(
          "Leaders",
          "People responsible for leading and managing this group.",
          leaders
        )}

        {renderSection(
          "Co-leaders",
          "Trusted helpers who can support group care and membership flow.",
          coLeaders
        )}

        {renderSection(
          "Members",
          "Approved members currently in this group.",
          normalMembers
        )}
      </ScrollView>
    </DraggableSheet>
  );
}

function GroupSettingsSheet({
  visible,
  onClose,
  hasPrayerSpace,
  onOpenInviteMember,
  onEditDetails,
  onPrayerSpacePress,
  onOpenManageMembers,
  onArchiveGroup,
}) {
  return (
    <DraggableSheet visible={visible} onClose={onClose} maxHeight="92%">
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: 34,
        }}
      >
        <View
          style={{
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            borderRadius: 26,
            padding: 14,
            marginBottom: 12,
            shadowColor: SHADOW,
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 5 },
            elevation: 2,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <PremiumIcon icon="settings-outline" tint="amber" size={46} />

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={[
                  serifHeading,
                  {
                    fontSize: 22,
                    lineHeight: 27,
                  },
                ]}
              >
                Group settings
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 13,
                  fontWeight: "700",
                  lineHeight: 19,
                  marginTop: 4,
                }}
              >
                Manage this church group’s details, members, and Prayer Space.
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={({ pressed }) => ({
                width: 38,
                height: 38,
                borderRadius: 999,
                backgroundColor: pressed ? OLIVE_SOFT : PREMIUM_CREAM,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                alignItems: "center",
                justifyContent: "center",
                marginLeft: 8,
              })}
            >
              <Ionicons name="close" size={21} color={TEXT} />
            </Pressable>
          </View>
        </View>

        <ManageActionCard
          icon="create-outline"
          title="Edit group details"
          subtitle="Update name, type, description, audience, visibility, location, leader and meeting format."
          tint="amber"
          onPress={() => {
            onClose?.();
            setTimeout(() => onEditDetails?.(), 180);
          }}
        />

        <ManageActionCard
          icon="person-add-outline"
          title="Add or invite member"
          subtitle="Invite approved church members or admins into this group."
          tint="olive"
          onPress={() => {
            onClose?.();
            setTimeout(() => onOpenInviteMember?.(), 180);
          }}
        />

        <ManageActionCard
          icon="people-outline"
          title="Manage members & leaders"
          subtitle="Promote leaders, assign co-leaders, demote roles, or remove members."
          tint="amber"
          onPress={() => {
            onClose?.();
            setTimeout(() => onOpenManageMembers?.(), 180);
          }}
        />

        <ManageActionCard
          icon={hasPrayerSpace ? "hand-left-outline" : "ellipse-outline"}
          title={hasPrayerSpace ? "Disable Prayer Space" : "Enable Prayer Space"}
          subtitle={
            hasPrayerSpace
              ? "Turn off the Prayer Space link for this group without deleting existing prayer data."
              : "Create a linked Prayer Space for ongoing group prayer and requests."
          }
          tint={hasPrayerSpace ? "amber" : "olive"}
          onPress={() => {
            onClose?.();
            setTimeout(() => onPrayerSpacePress?.(), 180);
          }}
        />

        <ManageActionCard
          icon="archive-outline"
          title="Archive group"
          subtitle="Remove this group from Church Groups without deleting members, requests, chat or Prayer Space history."
          tint="danger"
          onPress={() => {
            onClose?.();
            setTimeout(() => onArchiveGroup?.(), 180);
          }}
        />

        <View
          style={{
            padding: 14,
            borderRadius: 22,
            backgroundColor: OLIVE_SOFT,
            borderWidth: 1,
            borderColor: OLIVE_BORDER,
            marginTop: 4,
          }}
        >
          <Text style={{ color: OLIVE, fontWeight: "900", fontSize: 13 }}>
            Coming soon
          </Text>

          <Text
            style={{
              color: MUTED,
              fontWeight: "700",
              lineHeight: 19,
              marginTop: 5,
              fontSize: 12.5,
            }}
          >
            Leader notes, group updates and attendance will be wired after the
            core management flow is complete.
          </Text>
        </View>
      </ScrollView>
    </DraggableSheet>
  );
}

function FieldLabel({ children }) {
  return (
    <Text
      style={{
        color: TEXT,
        fontSize: 13,
        fontWeight: "900",
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}

function inputStyle(extra = {}) {
  return {
    backgroundColor: SURFACE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: TEXT,
    fontSize: 15,
    fontWeight: "650",
    shadowColor: SHADOW,
    shadowOpacity: 0.035,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
    ...extra,
  };
}

function TypePill({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selected ? AMBER_BORDER : CARD_BORDER,
        backgroundColor: selected ? AMBER_SOFT : PREMIUM_CREAM,
        marginRight: 8,
        marginBottom: 8,
        opacity: pressed ? 0.82 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <Text
        style={{
          color: selected ? EVENT_BROWN : MUTED,
          fontWeight: "900",
          fontSize: 12,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function OptionCard({ label, description, selected, onPress, icon }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        padding: 13,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: selected ? AMBER_BORDER : CARD_BORDER,
        backgroundColor: selected ? AMBER_SOFT : PREMIUM_CREAM,
        marginBottom: 9,
        opacity: pressed ? 0.82 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: selected ? AMBER_BORDER : CARD_BORDER,
            backgroundColor: selected ? EVENT_AMBER : SURFACE,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
            marginTop: 1,
          }}
        >
          {selected ? (
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          ) : (
            <Ionicons
              name={icon || "ellipse-outline"}
              size={14}
              color={MUTED}
            />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: selected ? EVENT_BROWN : TEXT,
              fontWeight: "900",
              fontSize: 13.5,
              lineHeight: 18,
            }}
          >
            {label}
          </Text>

          {description ? (
            <Text
              style={{
                color: MUTED,
                fontWeight: "700",
                fontSize: 12.2,
                lineHeight: 17,
                marginTop: 4,
              }}
            >
              {description}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function CategoryChoiceCard({ category, selected, onPress }) {
  const colors = tintColors(category.tint);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 168,
        minHeight: 126,
        marginRight: 10,
        borderRadius: 26,
        padding: 13,
        backgroundColor: selected ? colors.soft : SURFACE,
        borderWidth: 1,
        borderColor: selected ? colors.border : CARD_BORDER,
        shadowColor: SHADOW,
        shadowOpacity: selected ? 0.095 : 0.05,
        shadowRadius: selected ? 13 : 9,
        shadowOffset: { width: 0, height: selected ? 6 : 4 },
        elevation: selected ? 3 : 2,
        opacity: pressed ? 0.86 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <PremiumIcon icon={category.icon} tint={category.tint} size={42} />

        {selected ? (
          <View
            style={{
              marginLeft: "auto",
              width: 28,
              height: 28,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.main,
            }}
          >
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          </View>
        ) : null}
      </View>

      <Text
        style={{
          color: selected ? colors.strong : TEXT,
          fontSize: 15,
          fontWeight: "900",
          lineHeight: 19,
          marginTop: 10,
        }}
        numberOfLines={1}
      >
        {category.title}
      </Text>

      <Text
        style={{
          color: MUTED,
          fontSize: 11.5,
          fontWeight: "700",
          lineHeight: 16,
          marginTop: 4,
        }}
        numberOfLines={2}
      >
        {category.subtitle || "Custom group category for this church."}
      </Text>
    </Pressable>
  );
}

function EditGroupDetailsSheet({
  visible,
  onClose,
  editForm,
  setEditForm,
  categories,
  saving,
  onSave,
}) {
const selectedMeetingFormat = editForm.meetingFormat || "physical";
const prayerSpaceLockedOn = selectedMeetingFormat === "app_only";
const prayerSpaceAlreadyEnabled = !!editForm.existingHasPrayerSpace;
const prayerSpaceWillBeEnabled =
  prayerSpaceAlreadyEnabled || prayerSpaceLockedOn || !!editForm.hasPrayerSpace;

  function updateField(key, value) {
    setEditForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

function handleSelectMeetingFormat(nextFormat) {
  setEditForm((current) => {
    const movingAwayFromAppOnly =
      current.meetingFormat === "app_only" && nextFormat !== "app_only";

    return {
      ...current,
      meetingFormat: nextFormat,
      hasPrayerSpace:
        nextFormat === "app_only"
          ? true
          : movingAwayFromAppOnly && !current.existingHasPrayerSpace
            ? false
            : current.hasPrayerSpace,
      meetingDay: nextFormat === "app_only" ? "" : current.meetingDay,
      meetingTime: nextFormat === "app_only" ? "" : current.meetingTime,
      area:
        nextFormat === "app_only" && !String(current.area || "").trim()
          ? "Triunely app"
          : current.area,
    };
  });
}

  return (
    <DraggableSheet visible={visible} onClose={onClose} maxHeight="92%">
      <View
        style={{
          backgroundColor: SURFACE,
          borderWidth: 1,
          borderColor: AMBER_BORDER,
          borderRadius: 28,
          padding: 15,
          marginBottom: 12,
          shadowColor: SHADOW,
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 5 },
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <PremiumIcon icon="create-outline" tint="amber" size={48} />

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text
              style={[
                serifHeading,
                {
                  fontSize: 24,
                  lineHeight: 29,
                },
              ]}
            >
              Edit group details
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 13,
                fontWeight: "700",
                lineHeight: 19,
                marginTop: 4,
              }}
            >
              Update the group’s category, meeting details, visibility and Prayer
              Space settings.
            </Text>
          </View>

          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 999,
              backgroundColor: pressed ? OLIVE_SOFT : PREMIUM_CREAM,
              borderWidth: 1,
              borderColor: CARD_BORDER,
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 8,
            })}
          >
            <Ionicons name="close" size={21} color={TEXT} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 18 }}
      >
        <View
          style={{
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            borderRadius: 24,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <FieldLabel>Group category</FieldLabel>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 10, paddingBottom: 4 }}
            style={{ marginRight: -14, marginBottom: 8 }}
          >
            {categories.map((category) => (
              <CategoryChoiceCard
                key={`${category.source}-${category.id}`}
                category={category}
                selected={editForm.type === category.id}
                onPress={() => updateField("type", category.id)}
              />
            ))}
          </ScrollView>

          <View
            style={{
              marginTop: 8,
              padding: 12,
              borderRadius: 18,
              backgroundColor: AMBER_SOFT,
              borderWidth: 1,
              borderColor: AMBER_BORDER,
              flexDirection: "row",
              alignItems: "flex-start",
            }}
          >
            <Ionicons
              name="information-circle-outline"
              size={17}
              color={EVENT_AMBER}
              style={{ marginRight: 9, marginTop: 1 }}
            />

            <Text
              style={{
                flex: 1,
                color: EVENT_BROWN,
                fontSize: 12.5,
                lineHeight: 18,
                fontWeight: "800",
              }}
            >
              Changing category moves this group into that category on the Groups
              Admin screen.
            </Text>
          </View>
        </View>

        <View
          style={{
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            borderRadius: 24,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <FieldLabel>Group name</FieldLabel>

          <TextInput
            value={editForm.name}
            onChangeText={(value) => updateField("name", value)}
            placeholder="e.g. Women’s Prayer Night"
            placeholderTextColor="rgba(107, 114, 128, 0.72)"
            style={inputStyle({ marginBottom: 13 })}
          />

          <FieldLabel>Description</FieldLabel>

          <TextInput
            value={editForm.description}
            onChangeText={(value) => updateField("description", value)}
            placeholder="Short description of this group..."
            placeholderTextColor="rgba(107, 114, 128, 0.72)"
            multiline
            style={inputStyle({
              minHeight: 98,
              textAlignVertical: "top",
            })}
          />
        </View>

        <View
          style={{
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            borderRadius: 24,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <FieldLabel>Who is this group for?</FieldLabel>

          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {audienceOptions.map((item) => (
              <TypePill
                key={item.key}
                label={item.label}
                selected={editForm.audience === item.key}
                onPress={() => updateField("audience", item.key)}
              />
            ))}
          </View>
        </View>

        <View
          style={{
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            borderRadius: 24,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <FieldLabel>Visibility</FieldLabel>

          {visibilityOptions.map((item) => (
            <OptionCard
              key={item.key}
              icon={item.key === "church" ? "people-outline" : "lock-closed-outline"}
              label={item.label}
              description={item.description}
              selected={editForm.visibility === item.key}
              onPress={() => updateField("visibility", item.key)}
            />
          ))}
        </View>

        <View
          style={{
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            borderRadius: 24,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <FieldLabel>Meeting format</FieldLabel>

          {meetingFormatOptions.map((item) => (
            <OptionCard
              key={item.key}
              icon={item.icon}
              label={item.label}
              description={item.description}
              selected={selectedMeetingFormat === item.key}
              onPress={() => handleSelectMeetingFormat(item.key)}
            />
          ))}
        </View>

        <View
          style={{
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            borderRadius: 24,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <FieldLabel>
            {selectedMeetingFormat === "app_only" ? "App location" : "Area / location"}
          </FieldLabel>

          <TextInput
            value={editForm.area}
            onChangeText={(value) => updateField("area", value)}
            placeholder={
              selectedMeetingFormat === "app_only"
                ? "Defaults to Triunely app"
                : "e.g. Bitterne, Shirley, Church Hall"
            }
            placeholderTextColor="rgba(107, 114, 128, 0.72)"
            style={inputStyle({ marginBottom: 13 })}
          />

          <FieldLabel>Leader name</FieldLabel>

          <TextInput
            value={editForm.leaderName}
            onChangeText={(value) => updateField("leaderName", value)}
            placeholder="e.g. Rachel"
            placeholderTextColor="rgba(107, 114, 128, 0.72)"
            style={inputStyle({ marginBottom: 13 })}
          />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <FieldLabel>Meeting day</FieldLabel>

              <TextInput
                value={editForm.meetingDay}
                onChangeText={(value) => updateField("meetingDay", value)}
                editable={selectedMeetingFormat !== "app_only"}
                placeholder={
                  selectedMeetingFormat === "app_only" ? "Not needed" : "e.g. Tuesday"
                }
                placeholderTextColor="rgba(107, 114, 128, 0.72)"
                style={inputStyle({
                  opacity: selectedMeetingFormat === "app_only" ? 0.55 : 1,
                })}
              />
            </View>

            <View style={{ flex: 1 }}>
              <FieldLabel>Time</FieldLabel>

              <TextInput
                value={editForm.meetingTime}
                onChangeText={(value) => updateField("meetingTime", value)}
                editable={selectedMeetingFormat !== "app_only"}
                placeholder={
                  selectedMeetingFormat === "app_only" ? "Not needed" : "e.g. 7:30pm"
                }
                placeholderTextColor="rgba(107, 114, 128, 0.72)"
                style={inputStyle({
                  opacity: selectedMeetingFormat === "app_only" ? 0.55 : 1,
                })}
              />
            </View>
          </View>
        </View>

<View
  style={{
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: prayerSpaceWillBeEnabled ? AMBER_BORDER : CARD_BORDER,
    borderRadius: 24,
    padding: 14,
    marginBottom: 12,
  }}
>
  <FieldLabel>App Prayer Space</FieldLabel>

  <View
    style={{
      padding: 13,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: prayerSpaceWillBeEnabled ? AMBER_BORDER : CARD_BORDER,
      backgroundColor: prayerSpaceWillBeEnabled ? AMBER_SOFT : PREMIUM_CREAM,
      flexDirection: "row",
      alignItems: "flex-start",
    }}
  >
    <View
      style={{
        width: 30,
        height: 30,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: prayerSpaceWillBeEnabled ? AMBER_BORDER : CARD_BORDER,
        backgroundColor: prayerSpaceWillBeEnabled ? EVENT_AMBER : SURFACE,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
        marginTop: 1,
      }}
    >
      <Ionicons
        name={
          prayerSpaceWillBeEnabled
            ? "checkmark"
            : "information-circle-outline"
        }
        size={16}
        color={prayerSpaceWillBeEnabled ? "#FFFFFF" : MUTED}
      />
    </View>

    <View style={{ flex: 1 }}>
      <Text
        style={{
          color: prayerSpaceWillBeEnabled ? EVENT_BROWN : TEXT,
          fontWeight: "900",
          fontSize: 13.5,
          lineHeight: 18,
        }}
      >
        {prayerSpaceWillBeEnabled
          ? "Prayer Space enabled"
          : "Prayer Space disabled"}
      </Text>

      <Text
        style={{
          color: MUTED,
          fontWeight: "700",
          fontSize: 12.2,
          lineHeight: 17,
          marginTop: 4,
        }}
      >
        {prayerSpaceLockedOn
          ? "App-only groups require a linked Church Prayer Space."
          : "Enable or disable Prayer Space from Group Settings. This edit screen is for group details."}
      </Text>
    </View>
  </View>
</View>

        <Pressable
          onPress={onSave}
          disabled={saving || editForm.name.trim().length < 3}
          style={({ pressed }) => ({
            borderRadius: 999,
            paddingVertical: 15,
            paddingHorizontal: 18,
            opacity: saving || editForm.name.trim().length < 3 ? 0.55 : pressed ? 0.86 : 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: EVENT_AMBER,
            borderWidth: 1,
            borderColor: AMBER_BORDER,
            shadowColor: EVENT_AMBER,
            shadowOpacity: 0.16,
            shadowRadius: 11,
            shadowOffset: { width: 0, height: 5 },
            elevation: 3,
            marginBottom: 8,
          })}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name="save-outline"
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
          )}

          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: "900",
            }}
          >
            {saving ? "Saving..." : "Save group details"}
          </Text>
        </Pressable>
      </ScrollView>
    </DraggableSheet>
  );
}

function FutureToolsSection() {
  const futureTools = [
    {
      icon: "chatbubbles-outline",
      title: "Group updates",
      text: "Announcements, encouragements and practical updates for group members.",
      tint: "olive",
    },
    {
      icon: "document-text-outline",
      title: "Leader notes",
      text: "Private leader/admin notes for care, follow-up and pastoral oversight.",
      tint: "amber",
    },
    {
      icon: "pause-circle-outline",
      title: "Pause or archive group",
      text: "Temporarily pause a group or archive it when it has finished.",
      tint: "olive",
    },
    {
      icon: "checkmark-circle-outline",
      title: "Attendance and activity",
      text: "Track attendance, engagement and group health when that module is ready.",
      tint: "amber",
    },
  ];

  return (
    <View
      style={{
        marginTop: 8,
        marginBottom: 4,
        padding: 14,
        borderRadius: 24,
        backgroundColor: OLIVE_SOFT,
        borderWidth: 1,
        borderColor: OLIVE_BORDER,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <PremiumIcon icon="sparkles-outline" tint="olive" size={38} />

        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: OLIVE, fontWeight: "900", fontSize: 14 }}>
            Future church group tools
          </Text>

          <Text
            style={{
              color: MUTED,
              fontWeight: "700",
              lineHeight: 19,
              marginTop: 5,
              fontSize: 12.5,
            }}
          >
            These are genuine church tools we will build after the core group
            management flow is solid.
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 12 }}>
        {futureTools.map((item) => {
          const colors = tintColors(item.tint);

          return (
            <View
              key={item.title}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                paddingVertical: 10,
                borderTopWidth: 1,
                borderTopColor: CARD_BORDER,
              }}
            >
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.soft,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginRight: 10,
                }}
              >
                <Ionicons name={item.icon} size={15} color={colors.main} />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: TEXT,
                    fontSize: 13,
                    fontWeight: "900",
                  }}
                >
                  {item.title}
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 12,
                    fontWeight: "700",
                    lineHeight: 17,
                    marginTop: 2,
                  }}
                >
                  {item.text}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function ChurchGroupManage({ navigation, route }) {
  const routeChurchId = route?.params?.churchId || null;
  const churchName = route?.params?.churchName || "your church";
  const group = route?.params?.group || null;
  const groupId = group?.id || route?.params?.groupId || null;

  const [dbGroup, setDbGroup] = useState(null);
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [dbMembers, setDbMembers] = useState([]);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isChurchAdmin, setIsChurchAdmin] = useState(false);
  const [canManageGroup, setCanManageGroup] = useState(false);

const [settingsSheetVisible, setSettingsSheetVisible] = useState(false);
const [inviteModalVisible, setInviteModalVisible] = useState(false);
const [inviteSearch, setInviteSearch] = useState("");
const [inviteCandidates, setInviteCandidates] = useState([]);
const [loadingInviteCandidates, setLoadingInviteCandidates] = useState(false);
const [invitingUserId, setInvitingUserId] = useState(null);

const [customCategories, setCustomCategories] = useState([]);
const [loadingCategories, setLoadingCategories] = useState(false);
const [editDetailsVisible, setEditDetailsVisible] = useState(false);
const [editForm, setEditForm] = useState(emptyEditForm());
const [savingEditDetails, setSavingEditDetails] = useState(false);

const [togglingPrayerSpace, setTogglingPrayerSpace] = useState(false);
const [archivingGroup, setArchivingGroup] = useState(false);
const [manageMembersVisible, setManageMembersVisible] = useState(false);
const [actingChurchGroupMemberId, setActingChurchGroupMemberId] = useState(null);

  const effectiveChurchId =
    routeChurchId || group?.church_id || dbGroup?.church_id || dbGroup?.churchId || null;
    const currentUserChurchGroupRole = useMemo(() => {
  if (!currentUserId) return "member";

  const currentMember = (dbMembers || []).find(
    (member) => member.userId === currentUserId
  );

  return currentMember?.rawRole || "member";
}, [currentUserId, dbMembers]);

const allCategories = useMemo(() => {
  const mappedCustom = customCategories.map((item) => ({
    id: item.name,
    title: item.name,
    subtitle: item.description || "Custom group category for this church.",
    icon: item.icon_name || "people-outline",
    tint: item.tint || "olive",
    source: "custom",
    rawId: item.id,
  }));

  return [...defaultGroupCategories, ...mappedCustom];
}, [customCategories]);

useEffect(() => {
  let alive = true;

  async function loadCustomCategories() {
    if (!effectiveChurchId) return;

    try {
      setLoadingCategories(true);

      const { data, error } = await supabase
        .from("church_group_categories")
        .select("*")
        .eq("church_id", effectiveChurchId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (alive) {
        setCustomCategories(data || []);
      }
    } catch (e) {
      console.log("load manage group categories error:", e);

      if (alive) {
        setCustomCategories([]);
      }
    } finally {
      if (alive) {
        setLoadingCategories(false);
      }
    }
  }

  loadCustomCategories();

  return () => {
    alive = false;
  };
}, [effectiveChurchId]);

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

      if (effectiveChurchId) {
        const { data: adminRows, error: adminError } = await supabase
          .from("church_admins")
          .select("user_id")
          .eq("church_id", effectiveChurchId)
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
  }, [effectiveChurchId]);

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

      setDbMembers(approvedMapped);
      setPendingMembers(pendingMapped);
      setCanManageGroup(userCanManageGroup);
    } catch (e) {
      console.log("load church group members error:", e);

      setDbMembers([]);
      setPendingMembers([]);
      setCanManageGroup(false);
    } finally {
      setLoadingMembers(false);
    }
  }

  function getChurchGroupLeaderCount() {
  return (dbMembers || []).filter(
    (member) => normalizeChurchGroupRole(member.rawRole) === "leader"
  ).length;
}

async function handleUpdateChurchGroupMemberRole(member, nextRole) {
  if (!member?.id || !member?.userId) return;

 const allowed = canCurrentUserManageChurchGroupMember({
  isChurchAdmin,
  canManageGroup,
  currentUserRole: currentUserChurchGroupRole,
  currentUserId,
  targetMember: member,
});

  if (!allowed) {
    Alert.alert(
      "Permission needed",
      "You do not have permission to manage this member."
    );
    return;
  }

  const normalizedNextRole = normalizeChurchGroupRole(nextRole);
  const currentRole = normalizeChurchGroupRole(member.rawRole);

  if (
    currentRole === "leader" &&
    normalizedNextRole !== "leader" &&
    getChurchGroupLeaderCount() <= 1
  ) {
    Alert.alert(
      "At least one leader required",
      "This group must keep at least one leader."
    );
    return;
  }

  try {
    setActingChurchGroupMemberId(member.id);

    const { error } = await supabase
      .from("church_group_members")
      .update({
        role: normalizedNextRole,
        updated_at: new Date().toISOString(),
      })
      .eq("id", member.id);

    if (error) throw error;

    await loadMembers();

    Alert.alert(
      "Role updated",
      `${member.name || "This member"} is now a ${getChurchGroupRoleLabel(
        normalizedNextRole
      ).toLowerCase()}.`
    );
  } catch (e) {
    console.log("update church group member role error:", e);

    Alert.alert(
      "Could not update role",
      e?.message || "Please try again."
    );
  } finally {
    setActingChurchGroupMemberId(null);
  }
}

function confirmPromoteChurchGroupMemberToLeader(member) {
  if (!member?.id) return;

  Alert.alert(
    "Make leader?",
    `${member.name || "This member"} will be able to lead and manage this group.`,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Make leader",
        onPress: () => handleUpdateChurchGroupMemberRole(member, "leader"),
      },
    ]
  );
}

function confirmPromoteChurchGroupMemberToCoLeader(member) {
  if (!member?.id) return;

  Alert.alert(
    "Make co-leader?",
    `${member.name || "This member"} will be able to help manage members and group care.`,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Make co-leader",
        onPress: () => handleUpdateChurchGroupMemberRole(member, "co_leader"),
      },
    ]
  );
}

function confirmDemoteChurchGroupMemberToMember(member) {
  if (!member?.id) return;

  Alert.alert(
    "Make member?",
    `${member.name || "This person"} will remain in the group but will no longer have leader permissions.`,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Make member",
        style: "destructive",
        onPress: () => handleUpdateChurchGroupMemberRole(member, "member"),
      },
    ]
  );
}

function confirmRemoveChurchGroupMember(member) {
  if (!member?.id || !member?.userId) return;

  const allowed = canCurrentUserManageChurchGroupMember({
    isChurchAdmin,
    currentUserRole: currentUserChurchGroupRole,
    currentUserId,
    targetMember: member,
  });

  if (!allowed) {
    Alert.alert(
      "Permission needed",
      "You do not have permission to remove this member."
    );
    return;
  }

  const currentRole = normalizeChurchGroupRole(member.rawRole);

  if (currentRole === "leader" && getChurchGroupLeaderCount() <= 1) {
    Alert.alert(
      "At least one leader required",
      "You cannot remove the last leader from this group."
    );
    return;
  }

  Alert.alert(
    "Remove from group?",
    `${member.name || "This member"} will be removed from this church group.`,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => handleRemoveChurchGroupMember(member),
      },
    ]
  );
}

async function handleRemoveChurchGroupMember(member) {
  if (!member?.id) return;

  try {
    setActingChurchGroupMemberId(member.id);

    const { error } = await supabase
      .from("church_group_members")
      .delete()
      .eq("id", member.id);

    if (error) throw error;

    await loadMembers();

    Alert.alert(
      "Member removed",
      `${member.name || "This member"} has been removed from the group.`
    );
  } catch (e) {
    console.log("remove church group member error:", e);

    Alert.alert(
      "Could not remove member",
      e?.message || "Please try again."
    );
  } finally {
    setActingChurchGroupMemberId(null);
  }
}

  useEffect(() => {
    loadMembers();
  }, [groupId, currentUserId, isChurchAdmin]);

  async function loadInviteCandidates() {
    if (!effectiveChurchId || !groupId) {
      setInviteCandidates([]);
      return;
    }

    try {
      setLoadingInviteCandidates(true);

      const { data: churchMembersData, error: churchMembersError } =
        await supabase
          .from("church_memberships")
          .select("user_id, role, status")
          .eq("church_id", effectiveChurchId)
          .eq("status", "approved");

      if (churchMembersError) throw churchMembersError;

      const { data: churchAdminsData, error: churchAdminsError } = await supabase
        .from("church_admins")
        .select("user_id, role")
        .eq("church_id", effectiveChurchId);

      if (churchAdminsError) throw churchAdminsError;

      const { data: groupMembersData, error: groupMembersError } = await supabase
        .from("church_group_members")
        .select("user_id")
        .eq("group_id", groupId);

      if (groupMembersError) throw groupMembersError;

      const alreadyInGroupUserIds = new Set(
        (groupMembersData || []).map((row) => row.user_id).filter(Boolean)
      );

      const mergedPeopleByUserId = {};

      (churchMembersData || []).forEach((row) => {
        if (!row?.user_id) return;

        mergedPeopleByUserId[row.user_id] = {
          userId: row.user_id,
          isAdmin: false,
          source: "member",
        };
      });

      (churchAdminsData || []).forEach((row) => {
        if (!row?.user_id) return;

        mergedPeopleByUserId[row.user_id] = {
          ...(mergedPeopleByUserId[row.user_id] || {}),
          userId: row.user_id,
          isAdmin: true,
          source: mergedPeopleByUserId[row.user_id] ? "member_admin" : "admin",
        };
      });

      const availablePeople = Object.values(mergedPeopleByUserId).filter(
        (person) => person.userId && !alreadyInGroupUserIds.has(person.userId)
      );

      const availableUserIds = availablePeople.map((person) => person.userId);

      if (availableUserIds.length === 0) {
        setInviteCandidates([]);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, handle, avatar_url")
        .in("id", availableUserIds);

      if (profilesError) {
        console.log("load invite candidate profiles error:", profilesError);
      }

      const profilesByUserId = (profilesData || []).reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {});

      const mappedCandidates = availablePeople
        .map((person) => {
          const profile = profilesByUserId[person.userId] || {};
          const displayName =
            profile.display_name || profile.handle || person.userId?.slice(0, 8) || "Member";

          return {
            userId: person.userId,
            name: displayName,
            handle: profile.handle || "",
            initials: getInitials(displayName),
            avatarUrl: profile.avatar_url || null,
            isAdmin: Boolean(person.isAdmin),
            source: person.source,
          };
        })
        .sort((a, b) => {
          if (a.isAdmin && !b.isAdmin) return -1;
          if (!a.isAdmin && b.isAdmin) return 1;
          return String(a.name).localeCompare(String(b.name));
        });

      setInviteCandidates(mappedCandidates);
    } catch (e) {
      console.log("load invite candidates error:", e);
      Alert.alert("Could not load people", "Please try again.");
      setInviteCandidates([]);
    } finally {
      setLoadingInviteCandidates(false);
    }
  }

  async function checkCanManageGroupNow() {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.log("checkCanManageGroupNow user error:", userError);
        return false;
      }

      const uid = userData?.user?.id || currentUserId || null;

      if (!uid || !groupId) return false;

      let resolvedChurchId = effectiveChurchId;

      if (!resolvedChurchId) {
        const { data: groupData, error: groupError } = await supabase
          .from("church_groups")
          .select("church_id")
          .eq("id", groupId)
          .maybeSingle();

        if (groupError) {
          console.log("checkCanManageGroupNow group error:", groupError);
        }

        resolvedChurchId = groupData?.church_id || null;
      }

      if (!resolvedChurchId) return false;

      const { data: adminRows, error: adminError } = await supabase
        .from("church_admins")
        .select("user_id")
        .eq("church_id", resolvedChurchId)
        .eq("user_id", uid)
        .limit(1);

      if (adminError) {
        console.log("checkCanManageGroupNow admin error:", adminError);
      }

      const isAdminNow = Array.isArray(adminRows) && adminRows.length > 0;

      if (isAdminNow) {
        setCurrentUserId(uid);
        setIsChurchAdmin(true);
        setCanManageGroup(true);
        return true;
      }

      const { data: leaderRows, error: leaderError } = await supabase
        .from("church_group_members")
        .select("id")
        .eq("group_id", groupId)
        .eq("church_id", resolvedChurchId)
        .eq("user_id", uid)
        .eq("status", "approved")
        .in("role", ["leader", "co_leader"])
        .limit(1);

      if (leaderError) {
        console.log("checkCanManageGroupNow leader error:", leaderError);
      }

      const isLeaderNow = Array.isArray(leaderRows) && leaderRows.length > 0;

      setCurrentUserId(uid);
      setIsChurchAdmin(false);
      setCanManageGroup(isLeaderNow);

      return isLeaderNow;
    } catch (e) {
      console.log("checkCanManageGroupNow exception:", e);
      return false;
    }
  }

  async function handleOpenInviteMember() {
    const allowed = canManageGroup || (await checkCanManageGroupNow());

    if (!allowed) {
      Alert.alert(
        "Permission needed",
        "Only church admins, group leaders and co-leaders can invite members."
      );
      return;
    }

    setInviteSearch("");
    setInviteModalVisible(true);
    loadInviteCandidates();
  }

  async function handleInviteMember(candidate) {
    if (!candidate?.userId || !effectiveChurchId || !groupId) return;

    const allowed = canManageGroup || (await checkCanManageGroupNow());

    if (!allowed) {
      Alert.alert(
        "Permission needed",
        "Only church admins, group leaders and co-leaders can invite members."
      );
      return;
    }

    try {
      setInvitingUserId(candidate.userId);

      const { data, error } = await supabase
        .from("church_group_members")
        .insert({
          group_id: groupId,
          church_id: effectiveChurchId,
          user_id: candidate.userId,
          role: "member",
          status: "invited",
        })
        .select("id, group_id, church_id, user_id, role, status, created_at, updated_at")
        .single();

      if (error) throw error;

      const invitedMember = mapDbMember({
        ...data,
        profile: {
          id: candidate.userId,
          display_name: candidate.name,
          handle: candidate.handle,
          avatar_url: candidate.avatarUrl,
        },
      });

      setPendingMembers((current) => [...current, invitedMember]);
      setInviteCandidates((current) =>
        current.filter((item) => item.userId !== candidate.userId)
      );

      Alert.alert(
        "Invite sent",
        `${candidate.name} has been invited to ${groupName || "this group"}.`
      );
    } catch (e) {
      console.log("invite group member error:", e);
      Alert.alert("Could not send invite", e?.message || "Please try again.");
    } finally {
      setInvitingUserId(null);
    }
  }

  async function handleApproveRequest(request) {
    const allowed = canManageGroup || (await checkCanManageGroupNow());

    if (!allowed) {
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

      setPendingMembers((current) =>
        current.filter((member) => member.id !== request.id)
      );

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
    const allowed = canManageGroup || (await checkCanManageGroupNow());

    if (!allowed) {
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

      setPendingMembers((current) =>
        current.filter((member) => member.id !== request.id)
      );
    } catch (e) {
      console.log("decline church group request error:", e);
      Alert.alert("Could not decline request", "Please try again.");
    }
  }

  async function handleArchiveGroup() {
  const allowed = canManageGroup || (await checkCanManageGroupNow());

  if (!allowed) {
    Alert.alert(
      "Permission needed",
      "Only church admins, group leaders and co-leaders can archive this group."
    );
    return;
  }

  if (!groupId || !effectiveChurchId) {
    Alert.alert("Group not found", "We could not find this group.");
    return;
  }

  Alert.alert(
    "Archive group?",
    `Archive ${groupName}? This will remove it from Church Groups, but keep members, requests, chat and Prayer Space history safe.`,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Archive",
        style: "destructive",
        onPress: async () => {
          try {
            setArchivingGroup(true);

            const { data, error } = await supabase
              .from("church_groups")
              .update({
                status: "archived",
                is_public: false,
                updated_at: new Date().toISOString(),
              })
              .eq("id", groupId)
              .eq("church_id", effectiveChurchId)
              .select("*");

            if (error) throw error;

            if (!data || data.length === 0) {
              Alert.alert(
                "Could not archive",
                "Supabase did not update this group. This may be a permissions or policy issue."
              );
              return;
            }

            setDbGroup(mapDbGroup(data[0]));

            Alert.alert(
              "Group archived",
              `${groupName} has been removed from active Church Groups.`
            );

            navigation.goBack();
          } catch (e) {
            console.log("archive church group error:", e);

            Alert.alert(
              "Could not archive group",
              e?.message || "Please try again."
            );
          } finally {
            setArchivingGroup(false);
          }
        },
      },
    ]
  );
}

 async function handleOpenEditDetails() {
  const allowed = canManageGroup || (await checkCanManageGroupNow());

  if (!allowed) {
    Alert.alert(
      "Permission needed",
      "Only church admins, group leaders and co-leaders can edit group details."
    );
    return;
  }

  const source = activeGroup || {};

  setEditForm({
    name: source.name || "",
    type: source.type || "Tables",
    description: source.description || "",
    audience: source.audience || "everyone",
    visibility: source.visibility || "church",
    area:
      source.area && source.area !== "Location not set"
        ? source.area
        : "",
    leaderName:
      source.leader && source.leader !== "Leader not set"
        ? source.leader
        : "",
    meetingDay: source.meetingDay || "",
    meetingTime: source.meetingTime || "",
    meetingFormat: source.meetingFormat || "physical",
    hasPrayerSpace: !!source.hasPrayerSpace,
    existingHasPrayerSpace: !!source.hasPrayerSpace,
  });

  setEditDetailsVisible(true);
}

async function handleSaveEditDetails() {
  const allowed = canManageGroup || (await checkCanManageGroupNow());

  if (!allowed) {
    Alert.alert(
      "Permission needed",
      "Only church admins, group leaders and co-leaders can edit group details."
    );
    return;
  }

  if (!groupId || !effectiveChurchId) {
    Alert.alert("Group not found", "We could not find this group.");
    return;
  }

  const trimmedName = editForm.name.trim();

  if (trimmedName.length < 3) {
    Alert.alert("Group name too short", "Enter at least 3 characters.");
    return;
  }

  const nextMeetingFormat = editForm.meetingFormat || "physical";
  const nextHasPrayerSpace =
    editForm.existingHasPrayerSpace ||
    editForm.hasPrayerSpace ||
    nextMeetingFormat === "app_only";

  try {
    setSavingEditDetails(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) throw userError;

    const userId = userData?.user?.id || currentUserId || null;

    const savedArea =
      nextMeetingFormat === "app_only"
        ? editForm.area.trim() || "Triunely app"
        : editForm.area.trim() || null;

    const updatePayload = {
      name: trimmedName,
      type: editForm.type || "Tables",
      description: editForm.description.trim() || null,
      audience: editForm.audience || "everyone",
      visibility: editForm.visibility || "church",
      area: savedArea,
      leader_name: editForm.leaderName.trim() || null,
      meeting_day:
        nextMeetingFormat === "app_only"
          ? null
          : editForm.meetingDay.trim() || null,
      meeting_time:
        nextMeetingFormat === "app_only"
          ? null
          : editForm.meetingTime.trim() || null,
      meeting_format: nextMeetingFormat,
      has_prayer_space: nextHasPrayerSpace,
      is_public: editForm.visibility !== "hidden",
      updated_at: new Date().toISOString(),
    };

    const { data: updatedGroup, error: updateError } = await supabase
      .from("church_groups")
      .update(updatePayload)
      .eq("id", groupId)
      .select("*")
      .single();

    if (updateError) throw updateError;

    if (nextHasPrayerSpace && userId) {
      const { data: existingPrayerGroup, error: existingPrayerError } =
        await supabase
          .from("prayer_groups")
          .select("id")
          .eq("church_group_id", groupId)
          .maybeSingle();

      if (existingPrayerError) throw existingPrayerError;

      if (!existingPrayerGroup?.id) {
        const { data: createdPrayerGroup, error: createPrayerError } =
          await supabase
            .from("prayer_groups")
            .insert({
              creator_id: userId,
              name: trimmedName,
              description:
                editForm.description.trim() ||
                `Official Prayer Space for ${trimmedName}.`,
              privacy: editForm.visibility === "hidden" ? "private" : "group",
              group_type: "church",
              church_id: effectiveChurchId,
              church_group_id: groupId,
            })
            .select("id")
            .single();

        if (createPrayerError) throw createPrayerError;

        if (createdPrayerGroup?.id) {
          const { error: memberError } = await supabase
            .from("prayer_group_members")
            .insert({
              group_id: createdPrayerGroup.id,
              user_id: userId,
              role: "admin",
            });

          if (memberError) {
            console.log("create edited group prayer member error:", memberError);
          }
        }
      } else {
        const { error: prayerUpdateError } = await supabase
          .from("prayer_groups")
          .update({
            name: trimmedName,
            description:
              editForm.description.trim() ||
              `Official Prayer Space for ${trimmedName}.`,
          })
          .eq("id", existingPrayerGroup.id);

        if (prayerUpdateError) {
          console.log("update linked prayer group details error:", prayerUpdateError);
        }
      }
    }

    setDbGroup(mapDbGroup(updatedGroup));
    setEditDetailsVisible(false);

    Alert.alert("Group updated", `${trimmedName} has been updated.`);
  } catch (e) {
    console.log("save group details error:", e);

    Alert.alert(
      "Could not update group",
      e?.message || "Please try again."
    );
  } finally {
    setSavingEditDetails(false);
  }
}

async function handlePrayerSpacePress() {
  const allowed = canManageGroup || (await checkCanManageGroupNow());

  if (!allowed) {
    Alert.alert(
      "Permission needed",
      "Only church admins, group leaders and co-leaders can manage this Prayer Space."
    );
    return;
  }

  if (!groupId || !effectiveChurchId) {
    Alert.alert("Group not found", "We could not find this church group.");
    return;
  }

  const nextEnabled = !hasPrayerSpace;

  Alert.alert(
    nextEnabled ? "Enable Prayer Space?" : "Disable Prayer Space?",
    nextEnabled
      ? "This will enable a linked Church Prayer Space for this group. Members can then use it from the Prayer tab."
      : "This will turn off the Prayer Space link for this group. Existing prayer requests will not be deleted.",
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: nextEnabled ? "Enable" : "Disable",
        style: nextEnabled ? "default" : "destructive",
        onPress: async () => {
          try {
            setTogglingPrayerSpace(true);

            const { data: userData, error: userError } =
              await supabase.auth.getUser();

            if (userError) throw userError;

            const userId = userData?.user?.id || currentUserId || null;

            if (nextEnabled && !userId) {
              Alert.alert(
                "Please sign in",
                "You need to be signed in to enable a Prayer Space."
              );
              return;
            }

            if (nextEnabled) {
              const { data: existingPrayerGroup, error: existingError } =
                await supabase
                  .from("prayer_groups")
                  .select("id")
                  .eq("church_group_id", groupId)
                  .maybeSingle();

              if (existingError) throw existingError;

              if (!existingPrayerGroup?.id) {
                const { data: createdPrayerGroup, error: createError } =
                  await supabase
                    .from("prayer_groups")
                    .insert({
                      creator_id: userId,
                      name: groupName,
                      description:
                        groupDescription ||
                        `Official Prayer Space for ${groupName}.`,
                      privacy: "group",
                      group_type: "church",
                      church_id: effectiveChurchId,
                      church_group_id: groupId,
                    })
                    .select("id")
                    .single();

                if (createError) throw createError;

                if (createdPrayerGroup?.id) {
                  const { error: memberError } = await supabase
                    .from("prayer_group_members")
                    .insert({
                      group_id: createdPrayerGroup.id,
                      user_id: userId,
                      role: "admin",
                    });

                  if (memberError) {
                    console.log(
                      "create manage group prayer member error:",
                      memberError
                    );
                  }
                }
              }
            }

            const { data: updatedGroup, error: updateError } = await supabase
              .from("church_groups")
              .update({
                has_prayer_space: nextEnabled,
                updated_at: new Date().toISOString(),
              })
              .eq("id", groupId)
              .select("*")
              .single();

            if (updateError) throw updateError;

            setDbGroup(mapDbGroup(updatedGroup));

            Alert.alert(
              nextEnabled ? "Prayer Space enabled" : "Prayer Space disabled",
              nextEnabled
                ? "This group now has a linked Church Prayer Space."
                : "This group’s Prayer Space has been disabled. Existing prayers have not been deleted."
            );
          } catch (e) {
            console.log("toggle group prayer space error:", e);

            Alert.alert(
              "Could not update Prayer Space",
              e?.message || "Please try again."
            );
          } finally {
            setTogglingPrayerSpace(false);
          }
        },
      },
    ]
  );
}

  const activeGroup = useMemo(() => {
    return dbGroup || mapDbGroup(group) || {};
  }, [dbGroup, group]);

  const groupName = activeGroup?.name || "Church Group";
  const groupType = activeGroup?.type || "Group";
  const groupArea = activeGroup?.area || "Location not set";
  const groupLeader = activeGroup?.leader || "Leader not set";
  const groupTime = activeGroup?.time || "Time not set";
  const groupStatus = activeGroup?.status || "Active";
  const groupDescription = activeGroup?.description || "";
  const groupMeetingFormat = activeGroup?.meetingFormat || null;
  const hasPrayerSpace = !!activeGroup?.hasPrayerSpace;

  return (
    <Screen backgroundColor={PREMIUM_CREAM} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <>
          <View style={{ flex: 1, backgroundColor: PREMIUM_CREAM }}>
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: CARD_BORDER,
                backgroundColor: PREMIUM_CREAM,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Pressable
                  onPress={() => navigation.goBack()}
                  hitSlop={10}
                  style={({ pressed }) => ({
                    width: 42,
                    height: 42,
                    borderRadius: 999,
                    backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                    alignItems: "center",
                    justifyContent: "center",
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                  })}
                >
                  <Ionicons name="chevron-back" size={22} color={TEXT} />
                </Pressable>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={[
                      serifHeading,
                      {
                        fontSize: 24,
                        lineHeight: 29,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    Manage group
                  </Text>

                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 12.5,
                      lineHeight: 17,
                      fontWeight: "700",
                      marginTop: 1,
                    }}
                    numberOfLines={1}
                  >
                    {groupName}
                  </Text>
                </View>

                <Pressable
                  onPress={() => setSettingsSheetVisible(true)}
                  hitSlop={10}
                  style={({ pressed }) => ({
                    width: 42,
                    height: 42,
                    borderRadius: 999,
                    backgroundColor: pressed
                      ? hasPrayerSpace
                        ? AMBER_SOFT
                        : OLIVE_SOFT
                      : SURFACE,
                    borderWidth: 1,
                    borderColor: hasPrayerSpace ? AMBER_BORDER : CARD_BORDER,
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: SHADOW,
                    shadowOpacity: 0.06,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 3 },
                    elevation: 2,
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                  })}
                >
                  <Ionicons
                    name="settings-outline"
                    size={20}
                    color={hasPrayerSpace ? EVENT_AMBER : OLIVE}
                  />
                </Pressable>
              </View>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 18,
                paddingBottom: bottomPad + 24,
              }}
            >
              {loadingGroup ? (
                <View
                  style={{
                    padding: 14,
                    borderRadius: 24,
                    backgroundColor: SURFACE,
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 14,
                  }}
                >
                  <ActivityIndicator color={EVENT_AMBER} />
                  <Text
                    style={{
                      color: MUTED,
                      fontWeight: "700",
                      marginLeft: 10,
                    }}
                  >
                    Loading group…
                  </Text>
                </View>
              ) : null}

              <GroupOverviewCard
                groupName={groupName}
                groupType={groupType}
                groupArea={groupArea}
                groupLeader={groupLeader}
                groupTime={groupTime}
                groupStatus={groupStatus}
                groupDescription={groupDescription}
                groupMeetingFormat={groupMeetingFormat}
                hasPrayerSpace={hasPrayerSpace}
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
                onOpenInviteMember={handleOpenInviteMember}
              />

              <FutureToolsSection />
            </ScrollView>
          </View>

<GroupSettingsSheet
  visible={settingsSheetVisible}
  onClose={() => setSettingsSheetVisible(false)}
  hasPrayerSpace={hasPrayerSpace}
  onOpenInviteMember={handleOpenInviteMember}
  onEditDetails={handleOpenEditDetails}
  onPrayerSpacePress={handlePrayerSpacePress}
  onOpenManageMembers={() => setManageMembersVisible(true)}
  onArchiveGroup={handleArchiveGroup}
/>

<EditGroupDetailsSheet
  visible={editDetailsVisible}
  onClose={() => setEditDetailsVisible(false)}
  editForm={editForm}
  setEditForm={setEditForm}
  categories={allCategories}
  saving={savingEditDetails}
  onSave={handleSaveEditDetails}
/>

<ManageMembersLeadersSheet
  visible={manageMembersVisible}
  onClose={() => setManageMembersVisible(false)}
  members={dbMembers}
  currentUserId={currentUserId}
  currentUserRole={currentUserChurchGroupRole}
  isChurchAdmin={isChurchAdmin}
  canManageGroup={canManageGroup}
  actingMemberId={actingChurchGroupMemberId}
  onPromoteToLeader={confirmPromoteChurchGroupMemberToLeader}
  onPromoteToCoLeader={confirmPromoteChurchGroupMemberToCoLeader}
  onDemoteToMember={confirmDemoteChurchGroupMemberToMember}
  onRemoveMember={confirmRemoveChurchGroupMember}
/>

          <InviteMemberModal
            visible={inviteModalVisible}
            onClose={() => setInviteModalVisible(false)}
            groupName={groupName}
            search={inviteSearch}
            onChangeSearch={setInviteSearch}
            loading={loadingInviteCandidates}
            candidates={inviteCandidates}
            invitingUserId={invitingUserId}
            onInvite={handleInviteMember}
          />

        </>
      )}
    </Screen>
  );
}