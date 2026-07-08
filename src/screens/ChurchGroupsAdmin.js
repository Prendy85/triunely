// src/screens/ChurchGroupsAdmin.js
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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

const customCategoryIcons = [
  {
    icon: "people-outline",
    label: "General",
    helper: "Any church group",
  },
  {
    icon: "home-outline",
    label: "Home",
    helper: "Home groups",
  },
  {
    icon: "heart-outline",
    label: "Care",
    helper: "Support or care",
  },
  {
    icon: "bookmarks-outline",
    label: "Course",
    helper: "Courses or classes",
  },
  {
    icon: "musical-notes-outline",
    label: "Worship",
    helper: "Music or worship",
  },
  {
    icon: "megaphone-outline",
    label: "Outreach",
    helper: "Mission or outreach",
  },
  {
    icon: "cafe-outline",
    label: "Social",
    helper: "Coffee or social",
  },
  {
    icon: "briefcase-outline",
    label: "Serving",
    helper: "Teams or rotas",
  },
  {
    icon: "leaf-outline",
    label: "Growth",
    helper: "Discipleship",
  },
  {
    icon: "sparkles-outline",
    label: "Special",
    helper: "Custom purpose",
  },
];

function getInitials(name) {
  if (!name) return "?";

  const parts = String(name).trim().split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return String(name).trim()[0]?.toUpperCase() || "?";
}

function formatRequestDate(value) {
  if (!value) return "Requested recently";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Requested recently";
  }

  return `Requested ${date.toLocaleDateString()} at ${date.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  )}`;
}

function formatMeetingFormat(value) {
  const format = String(value || "").toLowerCase();

  if (format === "physical") return "In person";
  if (format === "online") return "Online";
  if (format === "hybrid") return "In person + online";
  if (format === "app_only") return "App-only Prayer Space";

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

function GroupAdminCard({
  group,
  onManage,
  onEnablePrayerSpace,
  enablingPrayerSpace,
}) {
  const hasPrayerSpace = !!group.hasPrayerSpace;
  const tint = hasPrayerSpace ? "amber" : "olive";
  const colors = tintColors(tint);

  return (
    <View
      style={{
        backgroundColor: SURFACE,
        borderWidth: 1,
        borderColor: hasPrayerSpace ? AMBER_BORDER : CARD_BORDER,
        borderRadius: 24,
        padding: 14,
        marginBottom: 11,
        shadowColor: SHADOW,
        shadowOpacity: hasPrayerSpace ? 0.08 : 0.055,
        shadowRadius: hasPrayerSpace ? 13 : 10,
        shadowOffset: { width: 0, height: hasPrayerSpace ? 6 : 4 },
        elevation: hasPrayerSpace ? 3 : 2,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <PremiumIcon
          icon={
            hasPrayerSpace
              ? "hand-left-outline"
              : group.type === "Tables"
                ? "restaurant-outline"
                : "people-outline"
          }
          tint={tint}
          size={46}
        />

        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text
                style={{
                  color: TEXT,
                  fontSize: 16,
                  lineHeight: 21,
                  fontWeight: "900",
                }}
              >
                {group.name}
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 12.5,
                  lineHeight: 18,
                  fontWeight: "700",
                  marginTop: 4,
                }}
                numberOfLines={2}
              >
                {group.type} · {group.area}
              </Text>
            </View>

            <Pill tint={group.status === "Active" ? "olive" : "amber"}>
              {group.status || "Active"}
            </Pill>
          </View>

          <View
            style={{
              marginTop: 10,
              gap: 6,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="person-outline" size={14} color={MUTED} />
              <Text
                style={{
                  color: MUTED,
                  fontSize: 12.5,
                  fontWeight: "800",
                  marginLeft: 6,
                }}
                numberOfLines={1}
              >
                Leader: {group.leader}
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="time-outline" size={14} color={MUTED} />
              <Text
                style={{
                  color: MUTED,
                  fontSize: 12.5,
                  fontWeight: "800",
                  marginLeft: 6,
                }}
                numberOfLines={1}
              >
                {group.time}
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="calendar-outline" size={14} color={MUTED} />
              <Text
                style={{
                  color: MUTED,
                  fontSize: 12.5,
                  fontWeight: "800",
                  marginLeft: 6,
                }}
                numberOfLines={1}
              >
                {formatMeetingFormat(group.meetingFormat)}
              </Text>
            </View>
          </View>

          <View
            style={{
              alignSelf: "flex-start",
              marginTop: 11,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 6,
              backgroundColor: hasPrayerSpace ? AMBER_SOFT : OLIVE_SOFT,
              borderWidth: 1,
              borderColor: hasPrayerSpace ? AMBER_BORDER : OLIVE_BORDER,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons
              name={
                hasPrayerSpace
                  ? "checkmark-circle-outline"
                  : "ellipse-outline"
              }
              size={14}
              color={colors.main}
            />

            <Text
              style={{
                color: colors.strong,
                fontSize: 11,
                fontWeight: "900",
                marginLeft: 6,
              }}
            >
              {hasPrayerSpace ? "Prayer Space enabled" : "No app Prayer Space"}
            </Text>
          </View>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: 8,
          marginTop: 14,
        }}
      >
        <Pressable
          onPress={() => onManage(group)}
          style={({ pressed }) => ({
            flex: 1,
            borderRadius: 999,
            paddingVertical: 11,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          <Text
            style={{
              color: OLIVE,
              fontWeight: "900",
              fontSize: 12.5,
              textAlign: "center",
            }}
          >
            Manage
          </Text>
        </Pressable>

        {!hasPrayerSpace ? (
          <Pressable
            onPress={() => onEnablePrayerSpace?.(group)}
            disabled={enablingPrayerSpace}
            style={({ pressed }) => ({
              flex: 1.25,
              borderRadius: 999,
              paddingVertical: 11,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              backgroundColor: AMBER_SOFT,
              borderWidth: 1,
              borderColor: AMBER_BORDER,
              opacity: pressed || enablingPrayerSpace ? 0.72 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            {enablingPrayerSpace ? (
              <ActivityIndicator size="small" color={EVENT_AMBER} />
            ) : (
              <Ionicons
                name="hand-left-outline"
                size={15}
                color={EVENT_AMBER}
              />
            )}

            <Text
              style={{
                color: EVENT_BROWN,
                fontWeight: "900",
                fontSize: 12.5,
                marginLeft: 6,
              }}
            >
              Enable prayer
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function AdminToolsMenu({
  visible,
  onClose,
  onCreateGroup,
  onCreateCategory,
  onOpenArchivedGroups,
  archivedCount = 0,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(20, 24, 18, 0.30)",
          justifyContent: "flex-start",
          alignItems: "flex-end",
          paddingTop: Platform.OS === "ios" ? 86 : 66,
          paddingRight: 16,
        }}
      >
        <Pressable
          onPress={onClose}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />

        <View
          style={{
            width: 236,
            backgroundColor: PREMIUM_CREAM,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            padding: 10,
            shadowColor: SHADOW,
            shadowOpacity: 0.16,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
          }}
        >
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: CARD_BORDER,
              marginBottom: 6,
            }}
          >
            <Text
              style={{
                color: TEXT,
                fontSize: 15,
                fontWeight: "900",
              }}
            >
              Group tools
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 11.5,
                fontWeight: "700",
                marginTop: 3,
              }}
            >
              Manage group setup and archived groups.
            </Text>
          </View>

          <Pressable
            onPress={onCreateGroup}
            style={({ pressed }) => ({
              borderRadius: 18,
              paddingHorizontal: 11,
              paddingVertical: 11,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: pressed ? AMBER_SOFT : "transparent",
            })}
          >
            <PremiumIcon icon="add-circle-outline" tint="amber" size={34} />

            <Text
              style={{
                flex: 1,
                color: TEXT,
                fontSize: 13.5,
                fontWeight: "900",
                marginLeft: 10,
              }}
            >
              Create new group
            </Text>
          </Pressable>

          <Pressable
            onPress={onCreateCategory}
            style={({ pressed }) => ({
              borderRadius: 18,
              paddingHorizontal: 11,
              paddingVertical: 11,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: pressed ? OLIVE_SOFT : "transparent",
            })}
          >
            <PremiumIcon icon="albums-outline" tint="olive" size={34} />

            <Text
              style={{
                flex: 1,
                color: TEXT,
                fontSize: 13.5,
                fontWeight: "900",
                marginLeft: 10,
              }}
            >
              Create category
            </Text>
          </Pressable>

          <Pressable
            onPress={onOpenArchivedGroups}
            style={({ pressed }) => ({
              borderRadius: 18,
              paddingHorizontal: 11,
              paddingVertical: 11,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: pressed ? DANGER_SOFT : "transparent",
            })}
          >
            <PremiumIcon icon="archive-outline" tint="danger" size={34} />

            <Text
              style={{
                flex: 1,
                color: TEXT,
                fontSize: 13.5,
                fontWeight: "900",
                marginLeft: 10,
              }}
            >
              Archived groups
            </Text>

            {archivedCount > 0 ? (
              <View
                style={{
                  minWidth: 24,
                  height: 24,
                  borderRadius: 999,
                  paddingHorizontal: 7,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: DANGER_SOFT,
                  borderWidth: 1,
                  borderColor: DANGER_BORDER,
                }}
              >
                <Text
                  style={{
                    color: DANGER,
                    fontSize: 11,
                    fontWeight: "900",
                  }}
                >
                  {archivedCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ArchivedGroupCard({
  group,
  onRestore,
  restoring,
}) {
  return (
    <View
      style={{
        backgroundColor: SURFACE,
        borderWidth: 1,
        borderColor: DANGER_BORDER,
        borderRadius: 24,
        padding: 14,
        marginBottom: 11,
        shadowColor: SHADOW,
        shadowOpacity: 0.055,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <PremiumIcon icon="archive-outline" tint="danger" size={46} />

        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text
                style={{
                  color: TEXT,
                  fontSize: 16,
                  lineHeight: 21,
                  fontWeight: "900",
                }}
              >
                {group.name}
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 12.5,
                  lineHeight: 18,
                  fontWeight: "700",
                  marginTop: 4,
                }}
                numberOfLines={2}
              >
                {group.type} · {group.area}
              </Text>
            </View>

            <Pill tint="danger">Archived</Pill>
          </View>

          <View style={{ marginTop: 10, gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="person-outline" size={14} color={MUTED} />

              <Text
                style={{
                  color: MUTED,
                  fontSize: 12.5,
                  fontWeight: "800",
                  marginLeft: 6,
                }}
                numberOfLines={1}
              >
                Leader: {group.leader}
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="time-outline" size={14} color={MUTED} />

              <Text
                style={{
                  color: MUTED,
                  fontSize: 12.5,
                  fontWeight: "800",
                  marginLeft: 6,
                }}
                numberOfLines={1}
              >
                {group.time}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => onRestore?.(group)}
            disabled={restoring}
            style={({ pressed }) => ({
              marginTop: 13,
              borderRadius: 999,
              paddingVertical: 11,
              paddingHorizontal: 13,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
              borderWidth: 1,
              borderColor: OLIVE_BORDER,
              opacity: restoring ? 0.65 : 1,
              transform: [{ scale: pressed && !restoring ? 0.98 : 1 }],
            })}
          >
            {restoring ? (
              <ActivityIndicator size="small" color={OLIVE} />
            ) : (
              <Ionicons
                name="refresh-circle-outline"
                size={17}
                color={OLIVE}
                style={{ marginRight: 7 }}
              />
            )}

            <Text
              style={{
                color: OLIVE,
                fontSize: 12.5,
                fontWeight: "900",
                marginLeft: restoring ? 7 : 0,
              }}
            >
              {restoring ? "Restoring..." : "Restore group"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ArchivedGroupsSheet({
  visible,
  onClose,
  groups,
  onRestore,
  restoringGroupId,
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(20, 24, 18, 0.42)",
            justifyContent: "flex-end",
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} />

          <View
            style={{
              backgroundColor: PREMIUM_CREAM,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 24,
              maxHeight: "88%",
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
                backgroundColor: SURFACE,
                borderWidth: 1,
                borderColor: DANGER_BORDER,
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
                <PremiumIcon icon="archive-outline" tint="danger" size={48} />

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
                    Archived groups
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
                    These groups are hidden from normal Church Groups. Restore a
                    group if it should become active again.
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
              contentContainerStyle={{ paddingBottom: 14 }}
            >
              {groups.length === 0 ? (
                <View
                  style={{
                    backgroundColor: SURFACE,
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                    borderRadius: 24,
                    padding: 16,
                    alignItems: "center",
                  }}
                >
                  <PremiumIcon icon="checkmark-circle-outline" tint="olive" size={52} />

                  <Text
                    style={{
                      color: TEXT,
                      fontWeight: "900",
                      fontSize: 16,
                      marginTop: 12,
                    }}
                  >
                    No archived groups
                  </Text>

                  <Text
                    style={{
                      color: MUTED,
                      fontWeight: "700",
                      marginTop: 6,
                      lineHeight: 19,
                      textAlign: "center",
                    }}
                  >
                    Archived groups will appear here when an admin archives them.
                  </Text>
                </View>
              ) : (
                groups.map((group) => (
                  <ArchivedGroupCard
                    key={group.id}
                    group={group}
                    onRestore={onRestore}
                    restoring={restoringGroupId === group.id}
                  />
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PendingRequestCard({
  request,
  acting,
  onApprove,
  onDecline,
  onOpenGroup,
}) {
  return (
    <View
      style={{
        backgroundColor: SURFACE,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 22,
        padding: 14,
        marginTop: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            backgroundColor: AMBER_SOFT,
            borderWidth: 1,
            borderColor: AMBER_BORDER,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Text style={{ color: EVENT_BROWN, fontWeight: "900", fontSize: 14 }}>
            {request.initials}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: TEXT,
              fontSize: 15,
              fontWeight: "900",
              lineHeight: 20,
            }}
          >
            {request.name} requested to join
          </Text>

          <Pressable onPress={() => onOpenGroup?.(request)} hitSlop={6}>
            <Text
              style={{
                color: EVENT_AMBER,
                fontSize: 13,
                fontWeight: "900",
                marginTop: 4,
              }}
            >
              {request.groupName}
            </Text>
          </Pressable>

          <Text
            style={{
              color: MUTED,
              fontSize: 12,
              fontWeight: "700",
              marginTop: 4,
            }}
          >
            {formatRequestDate(request.createdAt)}
          </Text>

          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <Pressable
              onPress={() => onDecline?.(request)}
              disabled={acting}
              style={({ pressed }) => ({
                flex: 1,
                borderRadius: 999,
                paddingVertical: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed ? DANGER_SOFT : SURFACE,
                borderWidth: 1,
                borderColor: pressed ? DANGER_BORDER : CARD_BORDER,
                opacity: acting ? 0.65 : 1,
              })}
            >
              <Text style={{ color: MUTED, fontWeight: "900" }}>Decline</Text>
            </Pressable>

            <Pressable
              onPress={() => onApprove?.(request)}
              disabled={acting}
              style={({ pressed }) => ({
                flex: 1,
                borderRadius: 999,
                paddingVertical: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: EVENT_AMBER,
                borderWidth: 1,
                borderColor: AMBER_BORDER,
                opacity: pressed || acting ? 0.75 : 1,
                flexDirection: "row",
              })}
            >
              {acting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name="checkmark-circle-outline"
                  size={17}
                  color="#FFFFFF"
                />
              )}

              <Text
                style={{
                  color: "#FFFFFF",
                  fontWeight: "900",
                  marginLeft: acting ? 0 : 6,
                }}
              >
                Approve
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function PendingRequestsPanel({
  requests,
  loading,
  actingRequestId,
  onApprove,
  onDecline,
  onOpenGroup,
}) {
  if (loading) {
    return (
      <View
        style={{
          backgroundColor: SURFACE,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          borderRadius: 24,
          padding: 14,
          marginBottom: 16,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="small" color={EVENT_AMBER} />
        <Text style={{ color: MUTED, fontWeight: "800", marginLeft: 10 }}>
          Checking group requests…
        </Text>
      </View>
    );
  }

  if (!requests.length) return null;

  return (
    <View
      style={{
        backgroundColor: AMBER_SOFT,
        borderWidth: 1,
        borderColor: AMBER_BORDER,
        borderRadius: 26,
        padding: 14,
        marginBottom: 16,
        shadowColor: SHADOW,
        shadowOpacity: 0.07,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 5 },
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <PremiumIcon icon="alert-circle-outline" tint="amber" size={44} />

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: TEXT, fontSize: 18, fontWeight: "900" }}>
            Requests needing review
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
            {requests.length} group request{requests.length === 1 ? "" : "s"}{" "}
            waiting for approval.
          </Text>
        </View>
      </View>

      {requests.map((request) => (
        <PendingRequestCard
          key={request.id}
          request={request}
          acting={actingRequestId === request.id}
          onApprove={onApprove}
          onDecline={onDecline}
          onOpenGroup={onOpenGroup}
        />
      ))}
    </View>
  );
}

function CategoryCard({ category, selected, groupCount, onPress, onLongPress }) {
  const colors = tintColors(category.tint);

  return (
<Pressable
  onPress={onPress}
  onLongPress={onLongPress}
  delayLongPress={450}
  style={({ pressed }) => ({
        width: 178,
        minHeight: 138,
        marginRight: 11,
        borderRadius: 28,
        padding: 14,
        backgroundColor: selected ? colors.soft : SURFACE,
        borderWidth: 1,
        borderColor: selected ? colors.border : CARD_BORDER,
        shadowColor: SHADOW,
        shadowOpacity: selected ? 0.1 : 0.055,
        shadowRadius: selected ? 14 : 10,
        shadowOffset: { width: 0, height: selected ? 6 : 4 },
        elevation: selected ? 3 : 2,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <PremiumIcon icon={category.icon} tint={category.tint} size={44} />

        <View
          style={{
            marginLeft: "auto",
            borderRadius: 999,
            paddingHorizontal: 8,
            paddingVertical: 4,
            backgroundColor: selected ? SURFACE : colors.soft,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              color: colors.strong,
              fontSize: 10.5,
              fontWeight: "900",
            }}
          >
            {groupCount}
          </Text>
        </View>
      </View>

      <Text
        style={{
          color: TEXT,
          fontSize: 16,
          fontWeight: "900",
          lineHeight: 20,
          marginTop: 12,
        }}
        numberOfLines={1}
      >
        {category.title}
      </Text>

      <Text
        style={{
          color: MUTED,
          fontSize: 12,
          fontWeight: "700",
          lineHeight: 17,
          marginTop: 5,
        }}
        numberOfLines={2}
      >
        {category.subtitle || "Custom group category for this church."}
      </Text>

      <Text
        style={{
          color: colors.strong,
          fontSize: 11.5,
          fontWeight: "900",
          marginTop: 9,
        }}
      >
        {groupCount} {groupCount === 1 ? "group" : "groups"}
      </Text>
    </Pressable>
  );
}

function CreateCategoryCard({ onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 178,
        minHeight: 138,
        marginRight: 11,
        borderRadius: 28,
        padding: 14,
        backgroundColor: pressed ? AMBER_SOFT : SURFACE,
        borderWidth: 1.5,
        borderColor: pressed ? AMBER_BORDER : "rgba(180, 83, 9, 0.22)",
        shadowColor: SHADOW,
        shadowOpacity: pressed ? 0.04 : 0.055,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: pressed ? 1 : 2,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: AMBER_SOFT,
            borderWidth: 1,
            borderColor: AMBER_BORDER,
          }}
        >
          <Ionicons name="add" size={23} color={EVENT_AMBER} />
        </View>

        <View
          style={{
            marginLeft: "auto",
            borderRadius: 999,
            paddingHorizontal: 8,
            paddingVertical: 4,
            backgroundColor: PREMIUM_CREAM,
            borderWidth: 1,
            borderColor: CARD_BORDER,
          }}
        >
          <Text
            style={{
              color: MUTED,
              fontSize: 10.5,
              fontWeight: "900",
            }}
          >
            New
          </Text>
        </View>
      </View>

      <Text
        style={{
          color: TEXT,
          fontSize: 16,
          fontWeight: "900",
          lineHeight: 20,
          marginTop: 12,
        }}
      >
        Create category
      </Text>

      <Text
        style={{
          color: MUTED,
          fontSize: 12,
          fontWeight: "700",
          lineHeight: 17,
          marginTop: 5,
        }}
        numberOfLines={2}
      >
        Add a custom group type for this church.
      </Text>

      <View
        style={{
          alignSelf: "flex-start",
          marginTop: 9,
          borderRadius: 999,
          paddingHorizontal: 9,
          paddingVertical: 5,
          backgroundColor: OLIVE_SOFT,
          borderWidth: 1,
          borderColor: OLIVE_BORDER,
        }}
      >
        <Text
          style={{
            color: OLIVE,
            fontSize: 11,
            fontWeight: "900",
          }}
        >
          Church-only
        </Text>
      </View>
    </Pressable>
  );
}

function CreateCategoryModal({
  visible,
  onClose,
  name,
  onChangeName,
  description,
  onChangeDescription,
  iconName,
  onChangeIconName,
  tint,
  onChangeTint,
  saving,
  onCreate,
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(20, 24, 18, 0.42)",
            justifyContent: "flex-end",
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} />

          <View
            style={{
              backgroundColor: PREMIUM_CREAM,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: Platform.OS === "ios" ? 30 : 24,
              maxHeight: "84%",
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

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 34 }}
            >
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
                  <PremiumIcon icon="add-circle-outline" tint="amber" size={48} />

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
                      Create category
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
                      Add a custom group category that belongs only to this church.
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
                  borderRadius: 24,
                  padding: 14,
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: TEXT, fontWeight: "900", marginBottom: 8 }}>
                  Category name
                </Text>

                <TextInput
                  value={name}
                  onChangeText={onChangeName}
                  placeholder="e.g. Worship Team, Alpha, Food Bank"
                  placeholderTextColor="rgba(107, 114, 128, 0.72)"
                  style={{
                    backgroundColor: PREMIUM_CREAM,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    color: TEXT,
                    fontSize: 15,
                    fontWeight: "700",
                    marginBottom: 13,
                  }}
                />

                <Text style={{ color: TEXT, fontWeight: "900", marginBottom: 8 }}>
                  Description optional
                </Text>

                <TextInput
                  value={description}
                  onChangeText={onChangeDescription}
                  placeholder="What kind of groups belong here?"
                  placeholderTextColor="rgba(107, 114, 128, 0.72)"
                  multiline
                  style={{
                    backgroundColor: PREMIUM_CREAM,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    color: TEXT,
                    fontSize: 14,
                    fontWeight: "700",
                    minHeight: 88,
                    textAlignVertical: "top",
                  }}
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
                <Text style={{ color: TEXT, fontWeight: "900", marginBottom: 8 }}>
                  Accent
                </Text>

                <View style={{ flexDirection: "row", gap: 8, marginBottom: 13 }}>
                  {["amber", "olive"].map((item) => {
                    const selected = tint === item;
                    const colors = tintColors(item);

                    return (
                      <Pressable
                        key={item}
                        onPress={() => onChangeTint(item)}
                        style={({ pressed }) => ({
                          flex: 1,
                          borderRadius: 18,
                          padding: 12,
                          backgroundColor: selected ? colors.soft : PREMIUM_CREAM,
                          borderWidth: 1,
                          borderColor: selected ? colors.border : CARD_BORDER,
                          opacity: pressed ? 0.78 : 1,
                        })}
                      >
                        <Text
                          style={{
                            color: selected ? colors.strong : MUTED,
                            fontWeight: "900",
                            textTransform: "capitalize",
                            textAlign: "center",
                          }}
                        >
                          {item}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={{ color: TEXT, fontWeight: "900", marginBottom: 4 }}>
                  Icon style
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 12.2,
                    fontWeight: "700",
                    lineHeight: 17,
                    marginBottom: 10,
                  }}
                >
                  Choose the closest style for this category. This is just a visual
                  label — it does not affect how the group works.
                </Text>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {customCategoryIcons.map((item) => {
                    const selected = iconName === item.icon;
                    const colors = tintColors(tint);

                    return (
                      <Pressable
                        key={item.icon}
                        onPress={() => onChangeIconName(item.icon)}
                        style={({ pressed }) => ({
                          width: "48%",
                          borderRadius: 18,
                          padding: 10,
                          backgroundColor: selected ? colors.soft : PREMIUM_CREAM,
                          borderWidth: 1,
                          borderColor: selected ? colors.border : CARD_BORDER,
                          opacity: pressed ? 0.78 : 1,
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        })}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                          }}
                        >
                          <View
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 999,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: selected ? SURFACE : OLIVE_SOFT,
                              borderWidth: 1,
                              borderColor: selected ? colors.border : OLIVE_BORDER,
                              marginRight: 9,
                            }}
                          >
                            <Ionicons
                              name={item.icon}
                              size={17}
                              color={selected ? colors.main : OLIVE}
                            />
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                color: selected ? colors.strong : TEXT,
                                fontSize: 12.5,
                                fontWeight: "900",
                              }}
                              numberOfLines={1}
                            >
                              {item.label}
                            </Text>

                            <Text
                              style={{
                                color: MUTED,
                                fontSize: 10.5,
                                fontWeight: "700",
                                marginTop: 2,
                              }}
                              numberOfLines={1}
                            >
                              {item.helper}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Pressable
                onPress={onCreate}
                disabled={saving || name.trim().length < 2}
                style={({ pressed }) => ({
                  borderRadius: 999,
                  paddingVertical: 15,
                  paddingHorizontal: 18,
                  opacity: saving || name.trim().length < 2 ? 0.55 : pressed ? 0.86 : 1,
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
                })}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons
                    name="add-circle-outline"
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
                    marginLeft: saving ? 0 : 0,
                  }}
                >
                  {saving ? "Creating..." : "Create category"}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CategorySection({
  category,
  groups,
  onManage,
  onEnablePrayerSpace,
  enablingPrayerSpaceId,
}) {
  const colors = tintColors(category.tint);

  return (
    <View style={{ marginBottom: 14 }}>
      <View
        style={{
          backgroundColor: SURFACE,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 26,
          padding: 15,
          shadowColor: SHADOW,
          shadowOpacity: 0.065,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 5 },
          elevation: 2,
          marginBottom: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <PremiumIcon icon={category.icon} tint={category.tint} size={46} />

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text
              style={{
                color: TEXT,
                fontSize: 17,
                fontWeight: "900",
              }}
            >
              {category.title}
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 12.5,
                fontWeight: "700",
                lineHeight: 18,
                marginTop: 4,
              }}
              numberOfLines={2}
            >
              {category.subtitle}
            </Text>
          </View>

          <Pill tint={category.tint}>
            {groups.length} {groups.length === 1 ? "group" : "groups"}
          </Pill>
        </View>
      </View>

      {groups.length === 0 ? (
        <View
          style={{
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            borderRadius: 22,
            padding: 14,
          }}
        >
          <Text style={{ color: TEXT, fontWeight: "900" }}>
            No groups added yet
          </Text>

          <Text
            style={{
              color: MUTED,
              fontWeight: "700",
              marginTop: 6,
              lineHeight: 19,
            }}
          >
            Create the first {category.title.toLowerCase()} group when ready.
          </Text>
        </View>
      ) : (
        groups.map((group) => (
          <GroupAdminCard
            key={group.id}
            group={group}
            onManage={onManage}
            onEnablePrayerSpace={onEnablePrayerSpace}
            enablingPrayerSpace={enablingPrayerSpaceId === group.id}
          />
        ))
      )}
    </View>
  );
}

export default function ChurchGroupsAdmin({ navigation, route }) {
  const { churchId, churchName } = route?.params || {};

  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("Tables");
  const [liveGroups, setLiveGroups] = useState([]);
const [archivedGroups, setArchivedGroups] = useState([]);
const [restoringGroupId, setRestoringGroupId] = useState(null);
const [toolsMenuVisible, setToolsMenuVisible] = useState(false);
const [archivedGroupsVisible, setArchivedGroupsVisible] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [customCategories, setCustomCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [createCategoryVisible, setCreateCategoryVisible] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryIconName, setCategoryIconName] = useState("people-outline");
  const [categoryTint, setCategoryTint] = useState("olive");
  const [savingCategory, setSavingCategory] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [actingRequestId, setActingRequestId] = useState(null);
  const [enablingPrayerSpaceId, setEnablingPrayerSpaceId] = useState(null);

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

  const selectedCategory =
    allCategories.find((category) => category.id === selectedCategoryId) ||
    allCategories[0] ||
    defaultGroupCategories[0];

  const loadCategories = useCallback(async () => {
    if (!churchId) return;

    try {
      setLoadingCategories(true);

      const { data, error } = await supabase
        .from("church_group_categories")
        .select("*")
        .eq("church_id", churchId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;

      setCustomCategories(data || []);
    } catch (e) {
      console.log("load church group categories error:", e);
      setCustomCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }, [churchId]);

  const loadGroups = useCallback(async () => {
    if (!churchId) return;

    try {
      setLoadingGroups(true);

      const { data, error } = await supabase
        .from("church_groups")
        .select("*")
        .eq("church_id", churchId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      function mapGroupRow(item) {
        return {
          id: item.id,
          churchId: item.church_id,
          name: item.name,
          type: item.type,
          description: item.description || "",
          area: item.area || "Area not set",
          leader: item.leader_name || "Leader not set",
          meetingDay: item.meeting_day || "",
          meetingTime: item.meeting_time || "",
          meetingFormat: item.meeting_format || null,
          hasPrayerSpace: !!item.has_prayer_space,
          time:
            item.meeting_day || item.meeting_time
              ? `${item.meeting_day || ""} ${item.meeting_time || ""}`.trim()
              : item.meeting_format === "app_only"
                ? "App-only"
                : "Time not set",
          rawStatus: item.status || "active",
          status:
            item.status === "active"
              ? "Active"
              : item.status === "archived"
                ? "Archived"
                : item.status || "Active",
        };
      }

      const visibleRows = (data || []).filter((item) => {
        const status = String(item?.status || "").toLowerCase();
        return status !== "archived";
      });

      const archivedRows = (data || []).filter((item) => {
        const status = String(item?.status || "").toLowerCase();
        return status === "archived";
      });

      setLiveGroups(visibleRows.map(mapGroupRow));
      setArchivedGroups(archivedRows.map(mapGroupRow));
    } catch (e) {
      console.log("load church groups error:", e);
            setLiveGroups([]);
      setArchivedGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  }, [churchId]);

  const loadPendingRequests = useCallback(async () => {
    if (!churchId) return;

    try {
      setLoadingRequests(true);

      const { data: memberRows, error: memberError } = await supabase
        .from("church_group_members")
        .select("id, group_id, church_id, user_id, role, status, created_at")
        .eq("church_id", churchId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (memberError) throw memberError;

      const rows = memberRows || [];

      if (rows.length === 0) {
        setPendingRequests([]);
        return;
      }

      const groupIds = [
        ...new Set(rows.map((row) => row.group_id).filter(Boolean)),
      ];

      const userIds = [
        ...new Set(rows.map((row) => row.user_id).filter(Boolean)),
      ];

      let groupsById = {};
      let profilesById = {};

      if (groupIds.length > 0) {
        const { data: groupsData, error: groupsError } = await supabase
          .from("church_groups")
          .select(
            "id, name, type, area, leader_name, meeting_day, meeting_time, meeting_format, status"
          )
          .in("id", groupIds);

        if (groupsError) {
          console.log("load pending request groups error:", groupsError);
        } else {
          groupsById = (groupsData || []).reduce((acc, group) => {
            acc[group.id] = group;
            return acc;
          }, {});
        }
      }

      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, display_name, handle, avatar_url")
          .in("id", userIds);

        if (profilesError) {
          console.log("load pending request profiles error:", profilesError);
        } else {
          profilesById = (profilesData || []).reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {});
        }
      }

      const mapped = rows.map((row) => {
        const profile = profilesById[row.user_id] || null;
        const group = groupsById[row.group_id] || null;

        const name =
          profile?.display_name ||
          profile?.handle ||
          row.user_id?.slice(0, 8) ||
          "Someone";

        return {
          id: row.id,
          userId: row.user_id,
          groupId: row.group_id,
          churchId: row.church_id,
          createdAt: row.created_at,
          name,
          initials: getInitials(name),
          groupName: group?.name || "Unknown group",
          group: group
            ? {
                id: group.id,
                name: group.name,
                type: group.type,
                area: group.area || "Area not set",
                leader: group.leader_name || "Leader not set",
                meetingFormat: group.meeting_format || null,
                time:
                  group.meeting_day || group.meeting_time
                    ? `${group.meeting_day || ""} ${
                        group.meeting_time || ""
                      }`.trim()
                    : group.meeting_format === "app_only"
                      ? "App-only"
                      : "Time not set",
                status: group.status === "active" ? "Active" : group.status,
              }
            : null,
        };
      });

      setPendingRequests(mapped);
    } catch (e) {
      console.log("load pending group requests error:", e);
      setPendingRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  }, [churchId]);

  useEffect(() => {
    loadCategories();
    loadGroups();
    loadPendingRequests();
  }, [loadCategories, loadGroups, loadPendingRequests]);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
      loadGroups();
      loadPendingRequests();
    }, [loadCategories, loadGroups, loadPendingRequests])
  );

  const activeGroups = liveGroups;

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return [];

    return activeGroups.filter((group) => {
      const haystack = [
        group.name,
        group.type,
        group.area,
        group.leader,
        group.time,
        group.status,
        formatMeetingFormat(group.meetingFormat),
        group.hasPrayerSpace ? "prayer space" : "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [search, activeGroups]);

  function getGroupsForCategory(categoryId) {
    return activeGroups.filter((group) => group.type === categoryId);
  }

  function getGroupCount(categoryId) {
    return getGroupsForCategory(categoryId).length;
  }

  function resetCreateCategoryForm() {
    setCategoryName("");
    setCategoryDescription("");
    setCategoryIconName("people-outline");
    setCategoryTint("olive");
  }

  async function handleDeleteCategory(category) {
  if (!category || category.source !== "custom" || !category.rawId) {
    Alert.alert(
      "Built-in category",
      "Default group categories cannot be deleted."
    );
    return;
  }

  const groupsUsingCategory = getGroupCount(category.id);

  if (groupsUsingCategory > 0) {
    Alert.alert(
      "Category in use",
      `${category.title} is used by ${groupsUsingCategory} ${
        groupsUsingCategory === 1 ? "group" : "groups"
      }. Move or edit those groups before deleting this category.`
    );
    return;
  }

  Alert.alert(
    "Delete category?",
    `Delete ${category.title}? This only removes the category, not any groups.`,
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
            const { data, error } = await supabase
              .from("church_group_categories")
              .delete()
              .eq("id", category.rawId)
              .eq("church_id", churchId)
              .select("id");

            if (error) throw error;

            if (!data || data.length === 0) {
              Alert.alert(
                "Could not delete",
                "Supabase did not delete this category. This may be a permissions or policy issue."
              );

              await loadCategories();
              return;
            }

            setCustomCategories((current) =>
              (current || []).filter((item) => item.id !== category.rawId)
            );

            if (selectedCategoryId === category.id) {
              setSelectedCategoryId("Tables");
            }

            Alert.alert("Category deleted", `${category.title} has been deleted.`);
          } catch (e) {
            console.log("delete church group category error:", e);

            Alert.alert(
              "Could not delete category",
              e?.message || "Please try again."
            );

            await loadCategories();
          }
        },
      },
    ]
  );
}

  async function handleCreateCategory() {
    const trimmedName = categoryName.trim();
    const trimmedDescription = categoryDescription.trim();

    if (!churchId) {
      Alert.alert("Missing church", "Please reopen this screen from the church admin hub.");
      return;
    }

    if (trimmedName.length < 2) {
      Alert.alert("Name too short", "Enter at least 2 characters.");
      return;
    }

    const duplicate = allCategories.some(
      (category) => category.title.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicate) {
      Alert.alert("Category already exists", "Choose a different category name.");
      return;
    }

    try {
      setSavingCategory(true);

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError) throw userError;

      const userId = userData?.user?.id || null;

      const nextSortOrder = 100 + customCategories.length;

      const { data, error } = await supabase
        .from("church_group_categories")
        .insert({
          church_id: churchId,
          name: trimmedName,
          description: trimmedDescription || null,
          icon_name: categoryIconName || "people-outline",
          tint: categoryTint || "olive",
          sort_order: nextSortOrder,
          created_by: userId,
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) throw error;

      setCustomCategories((current) => [...current, data]);
      setSelectedCategoryId(data.name);
      resetCreateCategoryForm();
      setCreateCategoryVisible(false);

      Alert.alert("Category created", `${data.name} has been added for ${churchName}.`);
    } catch (e) {
      console.log("create church group category error:", e);

      Alert.alert(
        "Could not create category",
        e?.message || "Please try again."
      );
    } finally {
      setSavingCategory(false);
    }
  }

    async function handleRestoreArchivedGroup(group) {
    if (!group?.id || !churchId) {
      Alert.alert("Group not found", "We could not find this archived group.");
      return;
    }

    Alert.alert(
      "Restore group?",
      `Restore ${group.name}? It will return to the normal Groups Admin list and become visible to eligible church members again.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Restore",
          onPress: async () => {
            try {
              setRestoringGroupId(group.id);

              const { data, error } = await supabase
                .from("church_groups")
                .update({
                  status: "active",
                  is_public: true,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", group.id)
                .eq("church_id", churchId)
                .select("id");

              if (error) throw error;

              if (!data || data.length === 0) {
                Alert.alert(
                  "Could not restore",
                  "Supabase did not update this group. This may be a permissions or policy issue."
                );

                await loadGroups();
                return;
              }

              await loadGroups();

              Alert.alert("Group restored", `${group.name} is active again.`);
            } catch (e) {
              console.log("restore archived church group error:", e);

              Alert.alert(
                "Could not restore group",
                e?.message || "Please try again."
              );

              await loadGroups();
            } finally {
              setRestoringGroupId(null);
            }
          },
        },
      ]
    );
  }

  async function handleEnablePrayerSpace(group) {
    if (!group?.id || !churchId) {
      Alert.alert("Group not found", "We could not find this church group.");
      return;
    }

    Alert.alert(
      "Enable app Prayer Space?",
      `Create a Prayer tab space for ${group.name}? Members will be able to use it for prayer requests and group prayer life.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Enable",
          onPress: async () => {
            try {
              setEnablingPrayerSpaceId(group.id);

              const { data: userData, error: userError } =
                await supabase.auth.getUser();

              if (userError) throw userError;

              const userId = userData?.user?.id;

              if (!userId) {
                Alert.alert(
                  "Please sign in",
                  "You need to be signed in to enable a Prayer Space."
                );
                return;
              }

              const { data: existingPrayerGroup, error: existingError } =
                await supabase
                  .from("prayer_groups")
                  .select("id")
                  .eq("church_group_id", group.id)
                  .maybeSingle();

              if (existingError) throw existingError;

              if (!existingPrayerGroup?.id) {
                const { data: createdPrayerGroup, error: createError } =
                  await supabase
                    .from("prayer_groups")
                    .insert({
                      creator_id: userId,
                      name: group.name,
                      description:
                        group.description ||
                        `Official Prayer Space for ${group.name}.`,
                      privacy: "group",
                      group_type: "church",
                      church_id: churchId,
                      church_group_id: group.id,
                    })
                    .select("id")
                    .single();

                if (createError) throw createError;

                const { error: memberError } = await supabase
                  .from("prayer_group_members")
                  .insert({
                    group_id: createdPrayerGroup.id,
                    user_id: userId,
                    role: "admin",
                  });

                if (memberError) {
                  console.log(
                    "create linked prayer group admin member error:",
                    memberError
                  );
                }
              }

              const { error: updateError } = await supabase
                .from("church_groups")
                .update({
                  has_prayer_space: true,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", group.id);

              if (updateError) throw updateError;

              await loadGroups();

              Alert.alert(
                "Prayer Space enabled",
                `${group.name} can now be connected into the Prayer tab.`
              );
            } catch (e) {
              console.log("enable prayer space error:", e);

              Alert.alert(
                "Could not enable Prayer Space",
                e?.message || "Please try again."
              );
            } finally {
              setEnablingPrayerSpaceId(null);
            }
          },
        },
      ]
    );
  }

    function handleOpenCreateGroup() {
    setToolsMenuVisible(false);

    navigation.navigate("ChurchCreateGroup", {
      churchId,
      churchName,
      selectedCategory: selectedCategory?.title,
    });
  }

  function handleOpenCreateCategory() {
    setToolsMenuVisible(false);
    resetCreateCategoryForm();
    setCreateCategoryVisible(true);
  }

  function handleOpenArchivedGroups() {
    setToolsMenuVisible(false);
    setArchivedGroupsVisible(true);
  }

  function handleManage(selectedGroup) {
    navigation.navigate("ChurchGroupManage", {
      churchId,
      churchName,
      group: selectedGroup,
    });
  }

  async function handleApproveRequest(request) {
    if (!request?.id) return;

    try {
      setActingRequestId(request.id);

      const { error } = await supabase
        .from("church_group_members")
        .update({
          status: "approved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (error) throw error;

      setPendingRequests((current) =>
        current.filter((item) => item.id !== request.id)
      );

      Alert.alert("Approved", `${request.name} has been added to ${request.groupName}.`);

      await loadGroups();
      await loadPendingRequests();
    } catch (e) {
      console.log("approve pending group request error:", e);

      Alert.alert(
        "Could not approve request",
        e?.message || "Please try again."
      );
    } finally {
      setActingRequestId(null);
    }
  }

  async function handleDeclineRequest(request) {
    if (!request?.id) return;

    Alert.alert(
      "Decline request",
      `Decline ${request.name}'s request to join ${request.groupName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            try {
              setActingRequestId(request.id);

              const { error } = await supabase
                .from("church_group_members")
                .delete()
                .eq("id", request.id);

              if (error) throw error;

              setPendingRequests((current) =>
                current.filter((item) => item.id !== request.id)
              );

              await loadGroups();
              await loadPendingRequests();
            } catch (e) {
              console.log("decline pending group request error:", e);

              Alert.alert(
                "Could not decline request",
                e?.message || "Please try again."
              );
            } finally {
              setActingRequestId(null);
            }
          },
        },
      ]
    );
  }

  function handleOpenRequestGroup(request) {
    const targetGroup =
      activeGroups.find((group) => group.id === request.groupId) ||
      request.group ||
      null;

    if (!targetGroup) {
      Alert.alert("Group not found", "We could not open this group right now.");
      return;
    }

    navigation.navigate("ChurchGroupManage", {
      churchId,
      churchName,
      group: targetGroup,
    });
  }

  const hasSearch = search.trim().length > 0;

  return (
    <Screen backgroundColor={PREMIUM_CREAM} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
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
                  Groups Admin
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
                  Church groups and Prayer Spaces
                </Text>
              </View>

              <Pressable
                onPress={() => setToolsMenuVisible(true)}
                hitSlop={8}
                style={({ pressed }) => ({
                  width: 42,
                  height: 42,
                  borderRadius: 999,
                  backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: SHADOW,
                  shadowOpacity: 0.08,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 5 },
                  elevation: 2,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <Ionicons name="ellipsis-vertical" size={21} color={TEXT} />
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
            <View
              style={{
                backgroundColor: SURFACE,
                borderRadius: 30,
                borderWidth: 1,
                borderColor: AMBER_BORDER,
                padding: 18,
                marginBottom: 16,
                shadowColor: SHADOW,
                shadowOpacity: 0.09,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 7 },
                elevation: 3,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <PremiumIcon icon="people-outline" tint="amber" size={52} />

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={[
                      serifHeading,
                      {
                        fontSize: 28,
                        lineHeight: 33,
                      },
                    ]}
                  >
                    Church groups
                  </Text>

                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 13,
                      lineHeight: 19,
                      fontWeight: "700",
                      marginTop: 4,
                    }}
                  >
                    Manage group categories, leaders, locations, members and
                    linked Prayer Spaces for {churchName || "your church"}.
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: SURFACE,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                borderRadius: 22,
                paddingHorizontal: 13,
                paddingVertical: 8,
                marginBottom: 14,
                shadowColor: SHADOW,
                shadowOpacity: 0.04,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 3 },
                elevation: 1,
              }}
            >
              <Ionicons name="search-outline" size={19} color={MUTED} />

              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by group, leader, area or Prayer Space"
                placeholderTextColor="rgba(107, 114, 128, 0.72)"
                style={{
                  flex: 1,
                  color: TEXT,
                  fontWeight: "800",
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  fontSize: 14,
                }}
              />

              {search.trim() ? (
                <Pressable
                  onPress={() => setSearch("")}
                  hitSlop={10}
                  style={({ pressed }) => ({
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: pressed ? OLIVE_SOFT : PREMIUM_CREAM,
                  })}
                >
                  <Ionicons name="close" size={16} color={MUTED} />
                </Pressable>
              ) : null}
            </View>

            <Pressable
              onPress={handleOpenCreateGroup}
              style={({ pressed }) => ({
                borderRadius: 999,
                paddingVertical: 14,
                paddingHorizontal: 16,
                marginBottom: 16,
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
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <Ionicons
                name="add-circle-outline"
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />

              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: "900",
                }}
              >
                Create new group
              </Text>
            </Pressable>

            <PendingRequestsPanel
              requests={pendingRequests}
              loading={loadingRequests}
              actingRequestId={actingRequestId}
              onApprove={handleApproveRequest}
              onDecline={handleDeclineRequest}
              onOpenGroup={handleOpenRequestGroup}
            />

            {loadingGroups || loadingCategories ? (
              <View
                style={{
                  padding: 16,
                  borderRadius: 24,
                  backgroundColor: SURFACE,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                <ActivityIndicator color={EVENT_AMBER} />

                <Text
                  style={{
                    color: MUTED,
                    fontWeight: "800",
                    marginLeft: 10,
                  }}
                >
                  Loading saved groups…
                </Text>
              </View>
            ) : null}

            {hasSearch ? (
              <>
                <Text
                  style={[
                    serifHeading,
                    {
                      fontSize: 22,
                      lineHeight: 27,
                      marginBottom: 10,
                    },
                  ]}
                >
                  Search results
                </Text>

                {searchResults.length === 0 ? (
                  <View
                    style={{
                      backgroundColor: SURFACE,
                      borderWidth: 1,
                      borderColor: CARD_BORDER,
                      borderRadius: 24,
                      padding: 16,
                      alignItems: "center",
                    }}
                  >
                    <PremiumIcon icon="search-outline" tint="olive" size={52} />

                    <Text
                      style={{
                        color: TEXT,
                        fontWeight: "900",
                        fontSize: 16,
                        marginTop: 12,
                      }}
                    >
                      No groups found
                    </Text>

                    <Text
                      style={{
                        color: MUTED,
                        fontWeight: "700",
                        marginTop: 6,
                        lineHeight: 19,
                        textAlign: "center",
                      }}
                    >
                      Try searching by leader, area, type, meeting format or
                      group name.
                    </Text>
                  </View>
                ) : (
                  searchResults.map((group) => (
                    <GroupAdminCard
                      key={group.id}
                      group={group}
                      onManage={handleManage}
                      onEnablePrayerSpace={handleEnablePrayerSpace}
                      enablingPrayerSpace={enablingPrayerSpaceId === group.id}
                    />
                  ))
                )}
              </>
            ) : (
              <>
<View
  style={{
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 10,
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
      Group categories
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
      Tap to view. Hold a custom category to delete.
    </Text>
  </View>

  <View style={{ alignItems: "flex-end" }}>
    <Pill tint="amber">{allCategories.length} total</Pill>

    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginTop: 6,
        backgroundColor: OLIVE_SOFT,
        borderWidth: 1,
        borderColor: OLIVE_BORDER,
        borderRadius: 999,
        paddingHorizontal: 9,
        paddingVertical: 5,
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

      <Ionicons name="chevron-back" size={12} color={OLIVE} />
      <Ionicons name="chevron-forward" size={12} color={OLIVE} />
    </View>
  </View>
</View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingRight: 14,
                    paddingBottom: 14,
                  }}
                  style={{
                    marginHorizontal: -16,
                    paddingLeft: 16,
                    marginBottom: 4,
                  }}
                >
<CreateCategoryCard
  onPress={() => {
    resetCreateCategoryForm();
    setCreateCategoryVisible(true);
  }}
/>

{allCategories.map((category) => (
  <CategoryCard
    key={`${category.source}-${category.id}`}
    category={category}
    selected={selectedCategory?.id === category.id}
    groupCount={getGroupCount(category.id)}
    onPress={() => setSelectedCategoryId(category.id)}
    onLongPress={() => handleDeleteCategory(category)}
  />
))}
                </ScrollView>

                <CategorySection
                  category={selectedCategory}
                  groups={getGroupsForCategory(selectedCategory?.id)}
                  onManage={handleManage}
                  onEnablePrayerSpace={handleEnablePrayerSpace}
                  enablingPrayerSpaceId={enablingPrayerSpaceId}
                />
              </>
            )}
          </ScrollView>

          <CreateCategoryModal
            visible={createCategoryVisible}
            onClose={() => setCreateCategoryVisible(false)}
            name={categoryName}
            onChangeName={setCategoryName}
            description={categoryDescription}
            onChangeDescription={setCategoryDescription}
            iconName={categoryIconName}
            onChangeIconName={setCategoryIconName}
            tint={categoryTint}
            onChangeTint={setCategoryTint}
            saving={savingCategory}
            onCreate={handleCreateCategory}
          />
                    <AdminToolsMenu
            visible={toolsMenuVisible}
            onClose={() => setToolsMenuVisible(false)}
            onCreateGroup={handleOpenCreateGroup}
            onCreateCategory={handleOpenCreateCategory}
            onOpenArchivedGroups={handleOpenArchivedGroups}
            archivedCount={archivedGroups.length}
          />

          <ArchivedGroupsSheet
            visible={archivedGroupsVisible}
            onClose={() => setArchivedGroupsVisible(false)}
            groups={archivedGroups}
            onRestore={handleRestoreArchivedGroup}
            restoringGroupId={restoringGroupId}
          />
        </View>
      )}
    </Screen>
  );
}