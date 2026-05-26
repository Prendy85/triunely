// src/screens/ChurchGroupManage.js
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
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

const DEFAULT_RECENT_ACTIVITY = "Active this week";

function getInitials(name) {
  const cleanName = String(name || "").trim();

  if (!cleanName) return "?";

  const parts = cleanName.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }

  return cleanName.charAt(0).toUpperCase();
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
  const displayName = item.profile?.display_name || item.profile?.handle || fallbackName;

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

function mapDbGroup(item) {
  if (!item) return null;

  return {
    id: item.id,
    church_id: item.church_id || null,
    churchId: item.church_id || null,
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
  const label =
    request.status === "Pending"
      ? "Requested to join this group"
      : request.status === "invited"
      ? "Invited — waiting for response"
      : request.status;

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
          {label}
        </Text>
      </View>

      {request.status === "invited" ? null : (
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
          Pending requests and invites
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
            ? "Review people waiting to join, or invite approved church members into this group."
            : "Only church admins, group leaders and co-leaders can approve, decline or invite members."}
        </Text>

        {loadingMembers ? null : pendingMembers.length === 0 ? (
          <Text
            style={{
              color: theme.colors.muted,
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
        style={({ pressed }) => [
          theme.button.outline,
          {
            marginTop: 14,
            borderRadius: 16,
            paddingVertical: 12,
            flexDirection: "row",
            gap: 8,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <Ionicons name="person-add-outline" size={17} color={theme.colors.goldPressed} />
        <Text style={theme.button.outlineText}>Add or invite member</Text>
      </Pressable>
    </View>
  );
}

function InviteCandidateRow({ candidate, inviting, onInvite }) {
  const sourceLabel = candidate.isAdmin
    ? "Church admin"
    : "Approved church member";

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 18,
        padding: 12,
        marginBottom: 10,
        shadowColor: HEAVENLY_GOLD,
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: candidate.isAdmin ? SOFT_GOLD_BG : SOFT_OLIVE_BG,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Text
            style={{
              color: candidate.isAdmin ? HEAVENLY_GOLD : DEEP_OLIVE,
              fontWeight: "900",
              fontSize: 15,
            }}
          >
            {candidate.initials}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, fontSize: 14.5, fontWeight: "900" }}>
            {candidate.name}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
            <Ionicons
              name={candidate.isAdmin ? "shield-checkmark-outline" : "checkmark-circle-outline"}
              size={13}
              color={candidate.isAdmin ? HEAVENLY_GOLD : DEEP_OLIVE}
            />

            <Text
              style={{
                color: theme.colors.muted,
                fontSize: 12,
                fontWeight: "700",
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
            backgroundColor: HEAVENLY_GOLD,
            opacity: pressed || inviting ? 0.75 : 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          })}
        >
          {inviting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="mail-outline" size={15} color="#fff" />
          )}

          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "900" }}>
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(20, 24, 18, 0.42)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            maxHeight: "86%",
            backgroundColor: theme.colors.bg,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 22,
          }}
        >
          <View
            style={{
              width: 48,
              height: 5,
              borderRadius: 999,
              backgroundColor: "rgba(79, 99, 59, 0.25)",
              alignSelf: "center",
              marginBottom: 14,
            }}
          />

          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: CARD_BORDER,
              borderRadius: 22,
              padding: 14,
              marginBottom: 12,
              shadowColor: HEAVENLY_GOLD,
              shadowOpacity: 0.08,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: 2,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: SOFT_GOLD_BG,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="person-add-outline" size={23} color={HEAVENLY_GOLD} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: "900" }}>
                  Invite to group
                </Text>

                <Text
                  style={{
                    color: theme.colors.muted,
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
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: SOFT_OLIVE_BG,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="close" size={21} color={DEEP_OLIVE} />
              </Pressable>
            </View>
          </View>

          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: CARD_BORDER,
              borderRadius: 18,
              paddingHorizontal: 12,
              paddingVertical: 11,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <Ionicons name="search-outline" size={18} color={theme.colors.muted} />

            <TextInput
              value={search}
              onChangeText={onChangeSearch}
              placeholder="Search by name"
              placeholderTextColor={theme.colors.muted}
              style={{
                flex: 1,
                color: theme.colors.text,
                fontSize: 14,
                fontWeight: "800",
                paddingVertical: 0,
              }}
            />
          </View>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: SOFT_OLIVE_BG,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                borderRadius: 14,
                paddingVertical: 9,
                paddingHorizontal: 10,
              }}
            >
              <Text style={{ color: DEEP_OLIVE, fontSize: 15, fontWeight: "900" }}>
                {candidates.length}
              </Text>

              <Text style={{ color: theme.colors.muted, fontSize: 11, fontWeight: "800" }}>
                Available
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                backgroundColor: SOFT_GOLD_BG,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                borderRadius: 14,
                paddingVertical: 9,
                paddingHorizontal: 10,
              }}
            >
              <Text style={{ color: HEAVENLY_GOLD, fontSize: 15, fontWeight: "900" }}>
                {filteredCandidates.length}
              </Text>

              <Text style={{ color: theme.colors.muted, fontSize: 11, fontWeight: "800" }}>
                Showing
              </Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {loading ? (
              <View
                style={{
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  borderRadius: 18,
                  paddingVertical: 24,
                  alignItems: "center",
                }}
              >
                <ActivityIndicator color={theme.colors.gold} />
                <Text
                  style={{
                    color: theme.colors.muted,
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
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  borderRadius: 18,
                  padding: 14,
                }}
              >
                <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: "900" }}>
                  No available people found
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
                  They may already be in this group, already invited, waiting for approval,
                  or not yet approved in this church.
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
        </View>
      </View>
    </Modal>
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

function QuickActionsSection({ groupName, onOpenInviteMember }) {
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
          label="Invite member"
          onPress={onOpenInviteMember}
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

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteCandidates, setInviteCandidates] = useState([]);
  const [loadingInviteCandidates, setLoadingInviteCandidates] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState(null);

  const effectiveChurchId =
    routeChurchId || group?.church_id || dbGroup?.church_id || dbGroup?.churchId || null;

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

      const currentUserMembership = mapped.find((member) => member.userId === currentUserId);

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

      const { data: churchMembersData, error: churchMembersError } = await supabase
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
  .eq("church_id", effectiveChurchId)
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

    if (!canManageGroup) {
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
        <>
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
              onOpenInviteMember={handleOpenInviteMember}
            />

            <QuickActionsSection
              groupName={groupName}
              onOpenInviteMember={handleOpenInviteMember}
            />

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
                Group details, approved members and join requests are now live. Permissions, leader
                roles, group updates, attendance and care tools will be wired separately.
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
              Church ID: {effectiveChurchId || "not set"}
            </Text>
          </ScrollView>

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