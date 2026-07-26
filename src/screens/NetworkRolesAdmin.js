// C:\triunely\src\screens\NetworkRolesAdmin.js

import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const HEAVENLY_GOLD = "#B45309";
const EVENT_BROWN = "#7C2D12";
const DEEP_OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";
const DANGER = "#991B1B";

const SOFT_GOLD_BG = "rgba(180, 83, 9, 0.10)";
const GOLD_BORDER = "rgba(180, 83, 9, 0.18)";
const SOFT_OLIVE_BG = "rgba(79, 99, 59, 0.10)";
const OLIVE_BORDER = "rgba(79, 99, 59, 0.18)";
const SOFT_DANGER_BG = "rgba(153, 27, 27, 0.10)";
const DANGER_BORDER = "rgba(153, 27, 27, 0.18)";
const CARD_BORDER = "rgba(15, 23, 42, 0.08)";
const SHADOW = "rgba(15, 23, 42, 0.10)";
const MODAL_BACKDROP = "rgba(15, 23, 42, 0.58)";

const displayFont =
  Platform.OS === "ios" ? "Georgia" : "serif";

const serifHeading = {
  fontFamily: displayFont,
  color: TEXT,
  fontWeight: "900",
  letterSpacing: -0.45,
};

const premiumCardStyle = {
  backgroundColor: SURFACE,
  borderRadius: 22,
  borderWidth: 1,
  borderColor: CARD_BORDER,
  shadowColor: SHADOW,
  shadowOpacity: 0.09,
  shadowRadius: 12,
  shadowOffset: {
    width: 0,
    height: 5,
  },
  elevation: 3,
};

const ROLE_DETAILS = {
  owner: {
    label: "Owner",
    icon: "key-outline",
    description:
      "Full authority over the Network, including roles, settings and ownership.",
  },
  admin: {
    label: "Admin",
    icon: "shield-checkmark-outline",
    description:
      "Can manage membership requests, members and core Network administration.",
  },
  moderator: {
    label: "Moderator",
    icon: "shield-outline",
    description:
      "Supports community safety, discussions and future content moderation.",
  },
  member: {
    label: "Member",
    icon: "person-outline",
    description:
      "Standard Network participation without administrative permissions.",
  },
};

function formatHandle(handle) {
  const cleaned = String(handle || "").trim();

  if (!cleaned) {
    return "";
  }

  return cleaned.startsWith("@")
    ? cleaned
    : `@${cleaned}`;
}

function getInitials(name) {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  if (words.length === 1) {
    return words[0].slice(0, 1).toUpperCase();
  }

  return `${words[0].slice(0, 1)}${words[1].slice(
    0,
    1
  )}`.toUpperCase();
}

function getRoleDetails(role) {
  return (
    ROLE_DETAILS[String(role || "").toLowerCase()] ||
    ROLE_DETAILS.member
  );
}

function ProfileAvatar({ profile, size = 50 }) {
  const displayName =
    profile?.display_name ||
    profile?.handle ||
    "Network Member";

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: DEEP_OLIVE,
        borderWidth: 1,
        borderColor: OLIVE_BORDER,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {profile?.avatar_url ? (
        <Image
          source={{
            uri: profile.avatar_url,
          }}
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
            fontSize: size * 0.31,
            fontWeight: "900",
          }}
        >
          {getInitials(displayName)}
        </Text>
      )}
    </View>
  );
}

function RoleBadge({ role }) {
  const normalizedRole = String(
    role || "member"
  ).toLowerCase();

  const roleDetails = getRoleDetails(normalizedRole);
  const isOwner = normalizedRole === "owner";
  const isLeadership = [
    "admin",
    "moderator",
  ].includes(normalizedRole);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderRadius: 999,
        backgroundColor: isOwner
          ? SOFT_GOLD_BG
          : isLeadership
          ? SOFT_OLIVE_BG
          : "rgba(107, 114, 128, 0.08)",
        borderWidth: 1,
        borderColor: isOwner
          ? GOLD_BORDER
          : isLeadership
          ? OLIVE_BORDER
          : CARD_BORDER,
      }}
    >
      <Ionicons
        name={roleDetails.icon}
        size={12}
        color={
          isOwner
            ? HEAVENLY_GOLD
            : isLeadership
            ? DEEP_OLIVE
            : MUTED
        }
      />

      <Text
        style={{
          color: isOwner
            ? EVENT_BROWN
            : isLeadership
            ? DEEP_OLIVE
            : MUTED,
          fontSize: 10,
          fontWeight: "900",
          marginLeft: 4,
        }}
      >
        {roleDetails.label}
      </Text>
    </View>
  );
}

function LoadingState() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
      }}
    >
      <View
        style={{
          width: 66,
          height: 66,
          borderRadius: 33,
          backgroundColor: SOFT_GOLD_BG,
          borderWidth: 1,
          borderColor: GOLD_BORDER,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator
          size="small"
          color={HEAVENLY_GOLD}
        />
      </View>

      <Text
        style={{
          ...serifHeading,
          fontSize: 20,
          lineHeight: 25,
          textAlign: "center",
          marginTop: 16,
        }}
      >
        Loading Roles
      </Text>

      <Text
        style={{
          color: MUTED,
          fontSize: 13,
          fontWeight: "700",
          textAlign: "center",
          lineHeight: 19,
          marginTop: 6,
        }}
      >
        Checking Network leadership and permissions.
      </Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View
      style={{
        ...premiumCardStyle,
        paddingVertical: 28,
        paddingHorizontal: 20,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: SOFT_OLIVE_BG,
          borderWidth: 1,
          borderColor: OLIVE_BORDER,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        <Ionicons
          name="people-outline"
          size={27}
          color={DEEP_OLIVE}
        />
      </View>

      <Text
        style={{
          ...serifHeading,
          fontSize: 19,
          lineHeight: 24,
          textAlign: "center",
        }}
      >
        No joined members yet
      </Text>

      <Text
        style={{
          color: MUTED,
          fontSize: 13,
          fontWeight: "700",
          lineHeight: 20,
          textAlign: "center",
          marginTop: 7,
        }}
      >
        Approve or invite members before assigning
        Network leadership roles.
      </Text>
    </View>
  );
}

function RoleExplanationCard({
  icon,
  title,
  description,
  tone = "olive",
}) {
  const isGold = tone === "gold";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 12,
        paddingHorizontal: 13,
        borderRadius: 17,
        backgroundColor: isGold
          ? SOFT_GOLD_BG
          : SOFT_OLIVE_BG,
        borderWidth: 1,
        borderColor: isGold
          ? GOLD_BORDER
          : OLIVE_BORDER,
        marginBottom: 9,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: SURFACE,
          borderWidth: 1,
          borderColor: isGold
            ? GOLD_BORDER
            : OLIVE_BORDER,
          marginRight: 11,
        }}
      >
        <Ionicons
          name={icon}
          size={19}
          color={
            isGold ? HEAVENLY_GOLD : DEEP_OLIVE
          }
        />
      </View>

      <View
        style={{
          flex: 1,
        }}
      >
        <Text
          style={{
            color: isGold ? EVENT_BROWN : DEEP_OLIVE,
            fontSize: 13,
            fontWeight: "900",
          }}
        >
          {title}
        </Text>

        <Text
          style={{
            color: MUTED,
            fontSize: 11.5,
            fontWeight: "700",
            lineHeight: 17,
            marginTop: 3,
          }}
        >
          {description}
        </Text>
      </View>
    </View>
  );
}

function MemberRoleCard({
  item,
  currentUserId,
  canManage,
  isSuccessor = false,
  onManage,
}) {
  const profile = item.profile || {};
  const displayName =
    profile.display_name ||
    formatHandle(profile.handle) ||
    "Triunely Member";

  const handle = formatHandle(profile.handle);
  const isOwner = item.role === "owner";
  const isCurrentUser =
    item.user_id === currentUserId;

  return (
    <View
      style={{
        ...premiumCardStyle,
        padding: 15,
        marginBottom: 12,
        borderColor: isOwner
          ? GOLD_BORDER
          : CARD_BORDER,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <ProfileAvatar profile={profile} />

        <View
          style={{
            flex: 1,
            marginLeft: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                flex: 1,
                color: TEXT,
                fontSize: 15,
                fontWeight: "900",
                paddingRight: 7,
              }}
              numberOfLines={1}
            >
              {displayName}
              {isCurrentUser ? " · You" : ""}
            </Text>

            {profile.is_verified ? (
              <View
                style={{
                  width: 21,
                  height: 21,
                  borderRadius: 11,
                  backgroundColor: HEAVENLY_GOLD,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 7,
                }}
              >
                <Ionicons
                  name="checkmark"
                  size={12}
                  color={SURFACE}
                />
              </View>
            ) : null}

            <RoleBadge role={item.role} />
          </View>

          {isSuccessor ? (
            <View
              style={{
                alignSelf: "flex-start",
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 5,
                paddingHorizontal: 8,
                borderRadius: 999,
                backgroundColor: SOFT_GOLD_BG,
                borderWidth: 1,
                borderColor: GOLD_BORDER,
                marginTop: 7,
              }}
            >
              <Ionicons
                name="sparkles-outline"
                size={12}
                color={HEAVENLY_GOLD}
              />

              <Text
                style={{
                  color: EVENT_BROWN,
                  fontSize: 10,
                  fontWeight: "900",
                  marginLeft: 4,
                }}
              >
                DESIGNATED SUCCESSOR
              </Text>
            </View>
          ) : null}

          {handle && handle !== displayName ? (
            <Text
              style={{
                color: MUTED,
                fontSize: 12,
                fontWeight: "800",
                marginTop: 3,
              }}
              numberOfLines={1}
            >
              {handle}
            </Text>
          ) : null}

          <Text
            style={{
              color: MUTED,
              fontSize: 11.5,
              fontWeight: "700",
              lineHeight: 17,
              marginTop: 5,
            }}
          >
            {getRoleDetails(item.role).description}
          </Text>
        </View>

        {canManage && !isOwner && !isCurrentUser ? (
          <Pressable
            onPress={() => onManage(item)}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: OLIVE_BORDER,
              backgroundColor: pressed
                ? SOFT_OLIVE_BG
                : SURFACE,
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 9,
            })}
          >
            <Ionicons
              name="options-outline"
              size={19}
              color={DEEP_OLIVE}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function SuccessorCard({
  successor,
  actorIsOwner,
  onManage,
  onTransfer,
}) {
  const profile = successor?.profile || {};

  const displayName =
    profile.display_name ||
    formatHandle(profile.handle) ||
    "No successor appointed";

  return (
    <View
      style={{
        ...premiumCardStyle,
        padding: 16,
        marginBottom: 20,
        borderColor: GOLD_BORDER,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: SOFT_GOLD_BG,
            borderWidth: 1,
            borderColor: GOLD_BORDER,
            marginRight: 12,
          }}
        >
          <Ionicons
            name="sparkles-outline"
            size={22}
            color={HEAVENLY_GOLD}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              ...serifHeading,
              fontSize: 18,
              lineHeight: 23,
            }}
          >
            Designated Successor
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 11.8,
              fontWeight: "700",
              lineHeight: 17,
              marginTop: 3,
            }}
          >
            A trusted Admin nominated to support continuity.
            This does not transfer ownership.
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: 15,
          padding: 12,
          borderRadius: 17,
          backgroundColor: successor
            ? SOFT_GOLD_BG
            : "rgba(107, 114, 128, 0.06)",
          borderWidth: 1,
          borderColor: successor
            ? GOLD_BORDER
            : CARD_BORDER,
        }}
      >
        {successor ? (
          <ProfileAvatar
            profile={profile}
            size={44}
          />
        ) : (
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: SURFACE,
              borderWidth: 1,
              borderColor: CARD_BORDER,
            }}
          >
            <Ionicons
              name="person-add-outline"
              size={20}
              color={MUTED}
            />
          </View>
        )}

        <View
          style={{
            flex: 1,
            marginLeft: 11,
          }}
        >
          <Text
            style={{
              color: successor ? EVENT_BROWN : TEXT,
              fontSize: 14,
              fontWeight: "900",
            }}
            numberOfLines={1}
          >
            {displayName}
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 11.5,
              fontWeight: "700",
              lineHeight: 16,
              marginTop: 2,
            }}
          >
            {successor
              ? "Currently appointed as the Network’s designated successor."
              : "No Admin has been appointed as successor yet."}
          </Text>
        </View>
      </View>

      {actorIsOwner ? (
        <View
          style={{
            gap: 10,
            marginTop: 13,
          }}
        >
          <Pressable
            onPress={onManage}
            style={({ pressed }) => ({
              minHeight: 47,
              borderRadius: 999,
              backgroundColor: pressed
                ? "#92400E"
                : HEAVENLY_GOLD,
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <Text
              style={{
                color: SURFACE,
                fontSize: 13,
                fontWeight: "900",
              }}
            >
              {successor
                ? "Change or Remove Successor"
                : "Appoint Successor"}
            </Text>
          </Pressable>

          <Pressable
            onPress={onTransfer}
            style={({ pressed }) => ({
              minHeight: 47,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: DANGER_BORDER,
              backgroundColor: pressed
                ? SOFT_DANGER_BG
                : SURFACE,
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <Text
              style={{
                color: DANGER,
                fontSize: 13,
                fontWeight: "900",
              }}
            >
              Transfer Network Ownership
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function SuccessorSelectionModal({
  visible,
  admins,
  currentSuccessorUserId,
  selectedMembershipId,
  saving,
  bottomInset = 0,
  onSelect,
  onRemove,
  onContinue,
  onClose,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={saving ? undefined : onClose}
    >
      <Pressable
        onPress={saving ? undefined : onClose}
        style={{
          flex: 1,
          backgroundColor: MODAL_BACKDROP,
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          onPress={(event) =>
            event.stopPropagation()
          }
          style={{
            backgroundColor: PREMIUM_CREAM,
            borderTopLeftRadius: 29,
            borderTopRightRadius: 29,
            borderWidth: 1,
            borderColor: GOLD_BORDER,
            paddingHorizontal: 18,
            paddingTop: 12,
            paddingBottom: Math.max(
              25,
              bottomInset + 18
            ),
            maxHeight: "88%",
          }}
        >
          <View
            style={{
              width: 46,
              height: 5,
              borderRadius: 999,
              backgroundColor:
                "rgba(107, 114, 128, 0.24)",
              alignSelf: "center",
              marginBottom: 17,
            }}
          />

          <ScrollView
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: SOFT_GOLD_BG,
                  borderWidth: 1,
                  borderColor: GOLD_BORDER,
                  marginRight: 12,
                }}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={23}
                  color={HEAVENLY_GOLD}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 21,
                    lineHeight: 26,
                  }}
                >
                  Choose Successor
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
                  Only existing joined Admins are eligible.
                </Text>
              </View>

              <Pressable
                onPress={onClose}
                disabled={saving}
                hitSlop={8}
                style={({ pressed }) => ({
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed
                    ? SOFT_OLIVE_BG
                    : SURFACE,
                  borderWidth: 1,
                  borderColor: OLIVE_BORDER,
                })}
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={DEEP_OLIVE}
                />
              </Pressable>
            </View>

            {admins.length === 0 ? (
              <View
                style={{
                  padding: 18,
                  borderRadius: 18,
                  backgroundColor: SURFACE,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                }}
              >
                <Text
                  style={{
                    color: TEXT,
                    fontSize: 14,
                    fontWeight: "900",
                    textAlign: "center",
                  }}
                >
                  No eligible Admins
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 12,
                    fontWeight: "700",
                    lineHeight: 18,
                    textAlign: "center",
                    marginTop: 5,
                  }}
                >
                  Promote a trusted joined member to Admin
                  before appointing a successor.
                </Text>
              </View>
            ) : (
              admins.map((admin) => {
                const profile = admin.profile || {};

                const displayName =
                  profile.display_name ||
                  formatHandle(profile.handle) ||
                  "Network Admin";

                const isCurrent =
                  admin.user_id ===
                  currentSuccessorUserId;

                const isSelected =
                  admin.id === selectedMembershipId;

                return (
                  <Pressable
                    key={admin.id}
                    onPress={() =>
                      onSelect(admin.id)
                    }
                    disabled={saving}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 12,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: isSelected
                        ? GOLD_BORDER
                        : isCurrent
                        ? OLIVE_BORDER
                        : CARD_BORDER,
                      backgroundColor: isSelected
                        ? SOFT_GOLD_BG
                        : isCurrent
                        ? SOFT_OLIVE_BG
                        : pressed
                        ? "rgba(79, 99, 59, 0.05)"
                        : SURFACE,
                      marginBottom: 10,
                    })}
                  >
                    <ProfileAvatar
                      profile={profile}
                      size={46}
                    />

                    <View
                      style={{
                        flex: 1,
                        marginLeft: 11,
                      }}
                    >
                      <Text
                        style={{
                          color: isSelected
                            ? EVENT_BROWN
                            : TEXT,
                          fontSize: 14,
                          fontWeight: "900",
                        }}
                        numberOfLines={1}
                      >
                        {displayName}
                      </Text>

                      <Text
                        style={{
                          color: MUTED,
                          fontSize: 11.5,
                          fontWeight: "700",
                          marginTop: 2,
                        }}
                      >
                        {isCurrent
                          ? "Current designated successor"
                          : "Network Admin"}
                      </Text>
                    </View>

                    {isSelected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={HEAVENLY_GOLD}
                      />
                    ) : null}
                  </Pressable>
                );
              })
            )}

            <Pressable
              onPress={onContinue}
              disabled={
                !selectedMembershipId || saving
              }
              style={({ pressed }) => ({
                minHeight: 49,
                borderRadius: 999,
                backgroundColor:
                  !selectedMembershipId || saving
                    ? "rgba(107, 114, 128, 0.18)"
                    : pressed
                    ? "#92400E"
                    : HEAVENLY_GOLD,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 5,
                opacity:
                  !selectedMembershipId || saving
                    ? 0.7
                    : 1,
              })}
            >
              <Text
                style={{
                  color:
                    !selectedMembershipId || saving
                      ? MUTED
                      : SURFACE,
                  fontSize: 14,
                  fontWeight: "900",
                }}
              >
                Confirm Appointment
              </Text>
            </Pressable>

            {currentSuccessorUserId ? (
              <Pressable
                onPress={onRemove}
                disabled={saving}
                style={({ pressed }) => ({
                  minHeight: 48,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: DANGER_BORDER,
                  backgroundColor: pressed
                    ? SOFT_DANGER_BG
                    : SURFACE,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 10,
                  opacity: saving ? 0.6 : 1,
                })}
              >
                <Text
                  style={{
                    color: DANGER,
                    fontSize: 14,
                    fontWeight: "900",
                  }}
                >
                  Remove Successor
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function OwnershipTransferSelectionModal({
  visible,
  admins,
  selectedMembershipId,
  saving,
  bottomInset = 0,
  onSelect,
  onContinue,
  onClose,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={saving ? undefined : onClose}
    >
      <Pressable
        onPress={saving ? undefined : onClose}
        style={{
          flex: 1,
          backgroundColor: MODAL_BACKDROP,
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          onPress={(event) =>
            event.stopPropagation()
          }
          style={{
            backgroundColor: PREMIUM_CREAM,
            borderTopLeftRadius: 29,
            borderTopRightRadius: 29,
            borderWidth: 1,
            borderColor: DANGER_BORDER,
            paddingHorizontal: 18,
            paddingTop: 12,
            paddingBottom: Math.max(
              25,
              bottomInset + 18
            ),
            maxHeight: "88%",
          }}
        >
          <View
            style={{
              width: 46,
              height: 5,
              borderRadius: 999,
              backgroundColor:
                "rgba(107, 114, 128, 0.24)",
              alignSelf: "center",
              marginBottom: 17,
            }}
          />

          <ScrollView
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: SOFT_DANGER_BG,
                  borderWidth: 1,
                  borderColor: DANGER_BORDER,
                  marginRight: 12,
                }}
              >
                <Ionicons
                  name="swap-horizontal-outline"
                  size={24}
                  color={DANGER}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 21,
                    lineHeight: 26,
                  }}
                >
                  Transfer Ownership
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
                  Select the joined Admin who will become
                  the new Owner.
                </Text>
              </View>

              <Pressable
                onPress={onClose}
                disabled={saving}
                hitSlop={8}
                style={({ pressed }) => ({
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed
                    ? SOFT_OLIVE_BG
                    : SURFACE,
                  borderWidth: 1,
                  borderColor: OLIVE_BORDER,
                })}
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={DEEP_OLIVE}
                />
              </Pressable>
            </View>

            <View
              style={{
                padding: 13,
                borderRadius: 17,
                backgroundColor: SOFT_DANGER_BG,
                borderWidth: 1,
                borderColor: DANGER_BORDER,
                marginBottom: 14,
              }}
            >
              <Text
                style={{
                  color: DANGER,
                  fontSize: 12,
                  fontWeight: "900",
                  lineHeight: 18,
                }}
              >
                This changes final authority over the
                Network. You will become an Admin, the
                selected Admin will become Owner, and the
                current successor designation will be
                cleared.
              </Text>
            </View>

            {admins.length === 0 ? (
              <View
                style={{
                  padding: 18,
                  borderRadius: 18,
                  backgroundColor: SURFACE,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                }}
              >
                <Text
                  style={{
                    color: TEXT,
                    fontSize: 14,
                    fontWeight: "900",
                    textAlign: "center",
                  }}
                >
                  No eligible Admins
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 12,
                    fontWeight: "700",
                    lineHeight: 18,
                    textAlign: "center",
                    marginTop: 5,
                  }}
                >
                  Appoint at least one joined Admin before
                  transferring ownership.
                </Text>
              </View>
            ) : (
              admins.map((admin) => {
                const profile = admin.profile || {};

                const displayName =
                  profile.display_name ||
                  formatHandle(profile.handle) ||
                  "Network Admin";

                const isSelected =
                  admin.id === selectedMembershipId;

                return (
                  <Pressable
                    key={admin.id}
                    onPress={() =>
                      onSelect(admin.id)
                    }
                    disabled={saving}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 12,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: isSelected
                        ? DANGER_BORDER
                        : CARD_BORDER,
                      backgroundColor: isSelected
                        ? SOFT_DANGER_BG
                        : pressed
                        ? "rgba(79, 99, 59, 0.05)"
                        : SURFACE,
                      marginBottom: 10,
                    })}
                  >
                    <ProfileAvatar
                      profile={profile}
                      size={46}
                    />

                    <View
                      style={{
                        flex: 1,
                        marginLeft: 11,
                      }}
                    >
                      <Text
                        style={{
                          color: isSelected
                            ? DANGER
                            : TEXT,
                          fontSize: 14,
                          fontWeight: "900",
                        }}
                        numberOfLines={1}
                      >
                        {displayName}
                      </Text>

                      <Text
                        style={{
                          color: MUTED,
                          fontSize: 11.5,
                          fontWeight: "700",
                          marginTop: 2,
                        }}
                      >
                        Joined Network Admin
                      </Text>
                    </View>

                    {isSelected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={DANGER}
                      />
                    ) : null}
                  </Pressable>
                );
              })
            )}

            <Pressable
              onPress={onContinue}
              disabled={
                !selectedMembershipId || saving
              }
              style={({ pressed }) => ({
                minHeight: 49,
                borderRadius: 999,
                backgroundColor:
                  !selectedMembershipId || saving
                    ? "rgba(107, 114, 128, 0.18)"
                    : pressed
                    ? "#7F1D1D"
                    : DANGER,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 5,
                opacity:
                  !selectedMembershipId || saving
                    ? 0.7
                    : 1,
              })}
            >
              <Text
                style={{
                  color:
                    !selectedMembershipId || saving
                      ? MUTED
                      : SURFACE,
                  fontSize: 14,
                  fontWeight: "900",
                }}
              >
                Review Ownership Transfer
              </Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function OwnershipTransferConfirmationModal({
  visible,
  currentOwner,
  newOwner,
  saving,
  onConfirm,
  onBack,
  onClose,
}) {
  if (!currentOwner || !newOwner) {
    return null;
  }

  const currentOwnerName =
    currentOwner.profile?.display_name ||
    formatHandle(currentOwner.profile?.handle) ||
    "Current Owner";

  const newOwnerName =
    newOwner.profile?.display_name ||
    formatHandle(newOwner.profile?.handle) ||
    "Selected Admin";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={saving ? undefined : onClose}
    >
      <Pressable
        onPress={saving ? undefined : onClose}
        style={{
          flex: 1,
          backgroundColor: MODAL_BACKDROP,
          justifyContent: "center",
          paddingHorizontal: 22,
        }}
      >
        <Pressable
          onPress={(event) =>
            event.stopPropagation()
          }
          style={{
            backgroundColor: SURFACE,
            borderRadius: 27,
            borderWidth: 1,
            borderColor: DANGER_BORDER,
            padding: 22,
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 24,
            shadowOffset: {
              width: 0,
              height: 12,
            },
            elevation: 12,
          }}
        >
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              alignItems: "center",
              justifyContent: "center",
              alignSelf: "center",
              backgroundColor: SOFT_DANGER_BG,
              borderWidth: 1,
              borderColor: DANGER_BORDER,
              marginBottom: 16,
            }}
          >
            <Ionicons
              name="warning-outline"
              size={30}
              color={DANGER}
            />
          </View>

          <Text
            style={{
              ...serifHeading,
              fontSize: 22,
              lineHeight: 27,
              textAlign: "center",
            }}
          >
            Final ownership transfer
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 13.5,
              fontWeight: "700",
              lineHeight: 20,
              textAlign: "center",
              marginTop: 8,
            }}
          >
            Review the permanent authority change before
            confirming.
          </Text>

          <View
            style={{
              marginTop: 18,
              gap: 10,
            }}
          >
            <View
              style={{
                padding: 13,
                borderRadius: 17,
                backgroundColor: SOFT_OLIVE_BG,
                borderWidth: 1,
                borderColor: OLIVE_BORDER,
              }}
            >
              <Text
                style={{
                  color: TEXT,
                  fontSize: 13,
                  fontWeight: "900",
                }}
              >
                {currentOwnerName}
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 11.5,
                  fontWeight: "700",
                  marginTop: 3,
                }}
              >
                Owner → Admin
              </Text>
            </View>

            <View
              style={{
                padding: 13,
                borderRadius: 17,
                backgroundColor: SOFT_GOLD_BG,
                borderWidth: 1,
                borderColor: GOLD_BORDER,
              }}
            >
              <Text
                style={{
                  color: EVENT_BROWN,
                  fontSize: 13,
                  fontWeight: "900",
                }}
              >
                {newOwnerName}
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 11.5,
                  fontWeight: "700",
                  marginTop: 3,
                }}
              >
                Admin → Owner
              </Text>
            </View>

            <View
              style={{
                padding: 13,
                borderRadius: 17,
                backgroundColor: SOFT_DANGER_BG,
                borderWidth: 1,
                borderColor: DANGER_BORDER,
              }}
            >
              <Text
                style={{
                  color: DANGER,
                  fontSize: 11.8,
                  fontWeight: "900",
                  lineHeight: 17,
                }}
              >
                The designated successor will be cleared.
                Only the new Owner will be able to transfer
                ownership again.
              </Text>
            </View>
          </View>

          <View
            style={{
              marginTop: 20,
              gap: 10,
            }}
          >
            <Pressable
              onPress={onConfirm}
              disabled={saving}
              style={({ pressed }) => ({
                minHeight: 49,
                borderRadius: 999,
                backgroundColor: pressed
                  ? "#7F1D1D"
                  : DANGER,
                alignItems: "center",
                justifyContent: "center",
                opacity: saving ? 0.7 : 1,
              })}
            >
              {saving ? (
                <ActivityIndicator
                  size="small"
                  color={SURFACE}
                />
              ) : (
                <Text
                  style={{
                    color: SURFACE,
                    fontSize: 14,
                    fontWeight: "900",
                  }}
                >
                  Transfer Ownership Now
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={onBack}
              disabled={saving}
              style={({ pressed }) => ({
                minHeight: 48,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: OLIVE_BORDER,
                backgroundColor: pressed
                  ? SOFT_OLIVE_BG
                  : SURFACE,
                alignItems: "center",
                justifyContent: "center",
                opacity: saving ? 0.55 : 1,
              })}
            >
              <Text
                style={{
                  color: DEEP_OLIVE,
                  fontSize: 14,
                  fontWeight: "900",
                }}
              >
                Change Selection
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function RoleOption({
  role,
  currentRole,
  selectedRole,
  onPress,
}) {
  const roleDetails = getRoleDetails(role);
  const isCurrent = role === currentRole;
  const isSelected = role === selectedRole;

  return (
    <Pressable
      onPress={() => onPress(role)}
      disabled={isCurrent}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        minHeight: 66,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: isSelected
          ? GOLD_BORDER
          : isCurrent
          ? OLIVE_BORDER
          : CARD_BORDER,
        backgroundColor: isSelected
          ? SOFT_GOLD_BG
          : isCurrent
          ? SOFT_OLIVE_BG
          : pressed
          ? "rgba(79, 99, 59, 0.05)"
          : SURFACE,
        paddingVertical: 11,
        paddingHorizontal: 12,
        marginBottom: 10,
        opacity: isCurrent ? 0.75 : 1,
      })}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isSelected
            ? SURFACE
            : isCurrent
            ? SURFACE
            : SOFT_OLIVE_BG,
          borderWidth: 1,
          borderColor: isSelected
            ? GOLD_BORDER
            : OLIVE_BORDER,
          marginRight: 11,
        }}
      >
        <Ionicons
          name={roleDetails.icon}
          size={20}
          color={
            isSelected
              ? HEAVENLY_GOLD
              : DEEP_OLIVE
          }
        />
      </View>

      <View
        style={{
          flex: 1,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              flex: 1,
              color: isSelected
                ? EVENT_BROWN
                : TEXT,
              fontSize: 14,
              fontWeight: "900",
            }}
          >
            {roleDetails.label}
          </Text>

          {isCurrent ? (
            <Text
              style={{
                color: DEEP_OLIVE,
                fontSize: 10,
                fontWeight: "900",
              }}
            >
              CURRENT
            </Text>
          ) : null}

          {isSelected ? (
            <Ionicons
              name="checkmark-circle"
              size={21}
              color={HEAVENLY_GOLD}
            />
          ) : null}
        </View>

        <Text
          style={{
            color: MUTED,
            fontSize: 11.5,
            fontWeight: "700",
            lineHeight: 16,
            marginTop: 3,
            paddingRight: 5,
          }}
        >
          {roleDetails.description}
        </Text>
      </View>
    </Pressable>
  );
}

function RoleSelectionModal({
  visible,
  member,
  selectedRole,
  saving,
  bottomInset = 0,
  allowedRoles = [
    "admin",
    "moderator",
    "member",
  ],
  onSelectRole,
  onContinue,
  onClose,
}) {
  if (!member) {
    return null;
  }

  const profile = member.profile || {};

  const displayName =
    profile.display_name ||
    formatHandle(profile.handle) ||
    "this member";

  const hasSelection =
    selectedRole &&
    selectedRole !== member.role;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={saving ? undefined : onClose}
    >
      <Pressable
        onPress={saving ? undefined : onClose}
        style={{
          flex: 1,
          backgroundColor: MODAL_BACKDROP,
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          onPress={(event) =>
            event.stopPropagation()
          }
          style={{
            backgroundColor: PREMIUM_CREAM,
            borderTopLeftRadius: 29,
            borderTopRightRadius: 29,
            borderWidth: 1,
            borderColor: GOLD_BORDER,
            paddingHorizontal: 18,
            paddingTop: 12,
            paddingBottom: Math.max(
              25,
              bottomInset + 18
            ),
            maxHeight: "88%",
          }}
        >
          <View
            style={{
              width: 46,
              height: 5,
              borderRadius: 999,
              backgroundColor:
                "rgba(107, 114, 128, 0.24)",
              alignSelf: "center",
              marginBottom: 17,
            }}
          />

          <ScrollView
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 17,
              }}
            >
              <ProfileAvatar
                profile={profile}
                size={52}
              />

              <View
                style={{
                  flex: 1,
                  marginLeft: 12,
                }}
              >
                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 21,
                    lineHeight: 26,
                  }}
                  numberOfLines={1}
                >
                  Manage Role
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 12.5,
                    fontWeight: "800",
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  {displayName}
                </Text>
              </View>

              <Pressable
                onPress={onClose}
                disabled={saving}
                hitSlop={8}
                style={({ pressed }) => ({
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed
                    ? SOFT_OLIVE_BG
                    : SURFACE,
                  borderWidth: 1,
                  borderColor: OLIVE_BORDER,
                })}
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={DEEP_OLIVE}
                />
              </Pressable>
            </View>

            <Text
              style={{
                color: TEXT,
                fontSize: 13,
                fontWeight: "900",
                marginBottom: 10,
              }}
            >
              Select a Network role
            </Text>

            {allowedRoles.map((role) => (
              <RoleOption
                key={role}
                role={role}
                currentRole={member.role}
                selectedRole={selectedRole}
                onPress={onSelectRole}
              />
            ))}

            <Pressable
              onPress={onContinue}
              disabled={!hasSelection || saving}
              style={({ pressed }) => ({
                minHeight: 50,
                borderRadius: 999,
                backgroundColor:
                  !hasSelection || saving
                    ? "rgba(107, 114, 128, 0.18)"
                    : pressed
                    ? "#92400E"
                    : HEAVENLY_GOLD,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 6,
                opacity:
                  !hasSelection || saving
                    ? 0.7
                    : 1,
              })}
            >
              <Text
                style={{
                  color:
                    !hasSelection || saving
                      ? MUTED
                      : SURFACE,
                  fontSize: 14,
                  fontWeight: "900",
                }}
              >
                Review Role Change
              </Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ConfirmationModal({
  visible,
  member,
  selectedRole,
  saving,
  onConfirm,
  onBack,
  onClose,
}) {
  if (!member || !selectedRole) {
    return null;
  }

  const profile = member.profile || {};

  const displayName =
    profile.display_name ||
    formatHandle(profile.handle) ||
    "This member";

  const currentRoleDetails = getRoleDetails(
    member.role
  );

  const newRoleDetails =
    getRoleDetails(selectedRole);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={saving ? undefined : onClose}
    >
      <Pressable
        onPress={saving ? undefined : onClose}
        style={{
          flex: 1,
          backgroundColor: MODAL_BACKDROP,
          justifyContent: "center",
          paddingHorizontal: 22,
        }}
      >
        <Pressable
          onPress={(event) =>
            event.stopPropagation()
          }
          style={{
            backgroundColor: SURFACE,
            borderRadius: 27,
            borderWidth: 1,
            borderColor: GOLD_BORDER,
            padding: 22,
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 24,
            shadowOffset: {
              width: 0,
              height: 12,
            },
            elevation: 12,
          }}
        >
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              alignItems: "center",
              justifyContent: "center",
              alignSelf: "center",
              backgroundColor: SOFT_GOLD_BG,
              borderWidth: 1,
              borderColor: GOLD_BORDER,
              marginBottom: 16,
            }}
          >
            <Ionicons
              name={newRoleDetails.icon}
              size={29}
              color={HEAVENLY_GOLD}
            />
          </View>

          <Text
            style={{
              ...serifHeading,
              fontSize: 22,
              lineHeight: 27,
              textAlign: "center",
            }}
          >
            Confirm role change?
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 14,
              fontWeight: "700",
              lineHeight: 21,
              textAlign: "center",
              marginTop: 9,
            }}
          >
            {displayName} will change from{" "}
            {currentRoleDetails.label} to{" "}
            {newRoleDetails.label}.
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 18,
            }}
          >
            <RoleBadge role={member.role} />

            <Ionicons
              name="arrow-forward"
              size={18}
              color={MUTED}
              style={{
                marginHorizontal: 10,
              }}
            />

            <RoleBadge role={selectedRole} />
          </View>

          <View
            style={{
              marginTop: 21,
              gap: 10,
            }}
          >
            <Pressable
              onPress={onConfirm}
              disabled={saving}
              style={({ pressed }) => ({
                minHeight: 49,
                borderRadius: 999,
                backgroundColor: pressed
                  ? "#92400E"
                  : HEAVENLY_GOLD,
                alignItems: "center",
                justifyContent: "center",
                opacity: saving ? 0.7 : 1,
              })}
            >
              {saving ? (
                <ActivityIndicator
                  size="small"
                  color={SURFACE}
                />
              ) : (
                <Text
                  style={{
                    color: SURFACE,
                    fontSize: 14,
                    fontWeight: "900",
                  }}
                >
                  Confirm Role Change
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={onBack}
              disabled={saving}
              style={({ pressed }) => ({
                minHeight: 48,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: OLIVE_BORDER,
                backgroundColor: pressed
                  ? SOFT_OLIVE_BG
                  : SURFACE,
                alignItems: "center",
                justifyContent: "center",
                opacity: saving ? 0.55 : 1,
              })}
            >
              <Text
                style={{
                  color: DEEP_OLIVE,
                  fontSize: 14,
                  fontWeight: "900",
                }}
              >
                Change Selection
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function InformationModal({
  visible,
  title,
  message,
  destructive = false,
  onClose,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: MODAL_BACKDROP,
          justifyContent: "center",
          paddingHorizontal: 22,
        }}
      >
        <Pressable
          onPress={(event) =>
            event.stopPropagation()
          }
          style={{
            backgroundColor: SURFACE,
            borderRadius: 27,
            borderWidth: 1,
            borderColor: destructive
              ? DANGER_BORDER
              : GOLD_BORDER,
            padding: 22,
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 24,
            shadowOffset: {
              width: 0,
              height: 12,
            },
            elevation: 12,
          }}
        >
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              alignItems: "center",
              justifyContent: "center",
              alignSelf: "center",
              backgroundColor: destructive
                ? SOFT_DANGER_BG
                : SOFT_GOLD_BG,
              borderWidth: 1,
              borderColor: destructive
                ? DANGER_BORDER
                : GOLD_BORDER,
              marginBottom: 16,
            }}
          >
            <Ionicons
              name={
                destructive
                  ? "alert-circle-outline"
                  : "checkmark-circle-outline"
              }
              size={29}
              color={
                destructive
                  ? DANGER
                  : HEAVENLY_GOLD
              }
            />
          </View>

          <Text
            style={{
              ...serifHeading,
              fontSize: 22,
              lineHeight: 27,
              textAlign: "center",
            }}
          >
            {title}
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 14,
              fontWeight: "700",
              lineHeight: 21,
              textAlign: "center",
              marginTop: 9,
            }}
          >
            {message}
          </Text>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({
              minHeight: 48,
              borderRadius: 999,
              backgroundColor: destructive
                ? pressed
                  ? "#7F1D1D"
                  : DANGER
                : pressed
                ? "#92400E"
                : HEAVENLY_GOLD,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 21,
            })}
          >
            <Text
              style={{
                color: SURFACE,
                fontSize: 14,
                fontWeight: "900",
              }}
            >
              Got it
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function NetworkRolesAdmin() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const networkUuid =
    route.params?.networkUuid ||
    route.params?.networkId ||
    null;

  const [network, setNetwork] = useState(null);

  const [currentUserId, setCurrentUserId] =
    useState(null);

  const [actorMembership, setActorMembership] =
    useState(null);

  const [memberships, setMemberships] =
    useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [loadError, setLoadError] = useState("");

  const [selectedMember, setSelectedMember] =
    useState(null);

  const [selectedRole, setSelectedRole] =
    useState(null);

  const [roleModalVisible, setRoleModalVisible] =
    useState(false);

  const [
    confirmationModalVisible,
    setConfirmationModalVisible,
  ] = useState(false);

  const [saving, setSaving] = useState(false);

  const [information, setInformation] =
    useState(null);

  const [
    successorModalVisible,
    setSuccessorModalVisible,
  ] = useState(false);

  const [
    selectedSuccessorMembershipId,
    setSelectedSuccessorMembershipId,
  ] = useState(null);

  const [
    ownershipTransferModalVisible,
    setOwnershipTransferModalVisible,
  ] = useState(false);

  const [
    ownershipTransferConfirmationVisible,
    setOwnershipTransferConfirmationVisible,
  ] = useState(false);

  const [
    selectedNewOwnerMembershipId,
    setSelectedNewOwnerMembershipId,
  ] = useState(null);

  const sortedMemberships = useMemo(() => {
    const roleOrder = {
      owner: 0,
      admin: 1,
      moderator: 2,
      member: 3,
    };

    return [...memberships].sort((a, b) => {
      const aRole =
        roleOrder[String(a.role || "member")] ?? 4;

      const bRole =
        roleOrder[String(b.role || "member")] ?? 4;

      if (aRole !== bRole) {
        return aRole - bRole;
      }

      const aName =
        a.profile?.display_name ||
        a.profile?.handle ||
        "";

      const bName =
        b.profile?.display_name ||
        b.profile?.handle ||
        "";

      return aName.localeCompare(bName);
    });
  }, [memberships]);

  const roleCounts = useMemo(
    () => ({
      owners: memberships.filter(
        (membership) =>
          membership.role === "owner"
      ).length,
      admins: memberships.filter(
        (membership) =>
          membership.role === "admin"
      ).length,
      moderators: memberships.filter(
        (membership) =>
          membership.role === "moderator"
      ).length,
      members: memberships.filter(
        (membership) =>
          membership.role === "member"
      ).length,
    }),
    [memberships]
  );

  const eligibleSuccessorAdmins = useMemo(
    () =>
      memberships.filter(
        (membership) =>
          membership.status === "joined" &&
          membership.role === "admin"
      ),
    [memberships]
  );

  const designatedSuccessor = useMemo(
    () =>
      memberships.find(
        (membership) =>
          membership.user_id ===
          network?.designated_successor_user_id
      ) || null,
    [
      memberships,
      network?.designated_successor_user_id,
    ]
  );

  const currentOwnerMembership = useMemo(
    () =>
      memberships.find(
        (membership) =>
          membership.user_id ===
          network?.owner_user_id
      ) || null,
    [memberships, network?.owner_user_id]
  );

  const selectedNewOwnerMembership = useMemo(
    () =>
      memberships.find(
        (membership) =>
          membership.id ===
          selectedNewOwnerMembershipId
      ) || null,
    [memberships, selectedNewOwnerMembershipId]
  );

  const loadRoles = useCallback(
    async ({ showLoader = true } = {}) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        setLoadError("");

        if (!networkUuid) {
          throw new Error(
            "No Network identity was provided."
          );
        }

        const {
          data: sessionData,
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        const userId =
          sessionData?.session?.user?.id || null;

        if (!userId) {
          throw new Error(
            "Please sign in again before managing Network roles."
          );
        }

        setCurrentUserId(userId);

        const {
          data: networkData,
          error: networkError,
        } = await supabase
          .from("networks")
          .select(
            `
              id,
              name,
              slug,
              owner_user_id,
              designated_successor_user_id,
              member_count,
              status
            `
          )
          .eq("id", networkUuid)
          .maybeSingle();

        if (networkError) {
          throw networkError;
        }

        if (!networkData) {
          throw new Error(
            "This Network could not be found."
          );
        }

        const {
          data: actorMembershipData,
          error: actorMembershipError,
        } = await supabase
          .from("network_memberships")
          .select(
            "id, network_uuid, user_id, status, role"
          )
          .eq("network_uuid", networkUuid)
          .eq("user_id", userId)
          .maybeSingle();

        if (actorMembershipError) {
          throw actorMembershipError;
        }

        const actorIsOwner =
          networkData.owner_user_id === userId ||
          (
            actorMembershipData?.status === "joined" &&
            actorMembershipData?.role === "owner"
          );

        const actorIsAdmin =
          actorMembershipData?.status === "joined" &&
          actorMembershipData?.role === "admin";

        if (!actorIsOwner && !actorIsAdmin) {
          throw new Error(
            "Only the Network owner or an authorised Network admin can view roles and permissions."
          );
        }

        const {
          data: membershipData,
          error: membershipError,
        } = await supabase
          .from("network_memberships")
          .select(
            `
              id,
              network_id,
              network_uuid,
              user_id,
              status,
              role,
              created_at,
              updated_at
            `
          )
          .eq("network_uuid", networkUuid)
          .eq("status", "joined");

        if (membershipError) {
          throw membershipError;
        }

        const membershipRows = Array.isArray(
          membershipData
        )
          ? membershipData
          : [];

        const userIds = [
          ...new Set(
            membershipRows
              .map(
                (membership) =>
                  membership.user_id
              )
              .filter(Boolean)
          ),
        ];

        let profilesById = {};

        if (userIds.length > 0) {
          const {
            data: profileData,
            error: profileError,
          } = await supabase
            .from("profiles")
            .select(
              "id, display_name, handle, avatar_url, is_verified"
            )
            .in("id", userIds);

          if (profileError) {
            throw profileError;
          }

          profilesById = Object.fromEntries(
            (profileData || []).map(
              (profile) => [
                profile.id,
                profile,
              ]
            )
          );
        }

        const hydratedMemberships =
          membershipRows.map((membership) => ({
            ...membership,
            profile:
              profilesById[
                membership.user_id
              ] || null,
          }));

        setNetwork(networkData);

        setActorMembership(
          actorMembershipData || null
        );

        setMemberships(hydratedMemberships);
      } catch (error) {
        console.log(
          "Network roles admin load error:",
          error
        );

        setLoadError(
          error?.message ||
            "Triunely could not load Network roles."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [networkUuid]
  );

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    const unsubscribe = navigation.addListener(
      "focus",
      () => {
        loadRoles({
          showLoader: false,
        });
      }
    );

    return unsubscribe;
  }, [loadRoles, navigation]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);

    loadRoles({
      showLoader: false,
    });
  }, [loadRoles]);

  const openRoleModal = useCallback(
    (member) => {
      const actorIsOwner =
        network?.owner_user_id === currentUserId ||
        (
          actorMembership?.status === "joined" &&
          actorMembership?.role === "owner"
        );

      const actorIsAdmin =
        actorMembership?.status === "joined" &&
        actorMembership?.role === "admin";

      const adminCanManageTarget =
        actorIsAdmin &&
        ["member", "moderator"].includes(
          String(member?.role || "")
        );

      if (
        !member ||
        member.user_id === currentUserId ||
        member.role === "owner" ||
        member.user_id ===
          network?.designated_successor_user_id ||
        (!actorIsOwner && !adminCanManageTarget)
      ) {
        return;
      }

      setSelectedMember(member);
      setSelectedRole(null);
      setConfirmationModalVisible(false);
      setRoleModalVisible(true);
    },
    [
      actorMembership?.role,
      actorMembership?.status,
      currentUserId,
      network?.designated_successor_user_id,
      network?.owner_user_id,
    ]
  );

  const closeRoleFlow = useCallback(() => {
    if (saving) {
      return;
    }

    setRoleModalVisible(false);
    setConfirmationModalVisible(false);
    setSelectedMember(null);
    setSelectedRole(null);
  }, [saving]);

  const handleReviewRoleChange =
    useCallback(() => {
      if (
        !selectedMember ||
        !selectedRole ||
        selectedRole === selectedMember.role
      ) {
        return;
      }

      setRoleModalVisible(false);
      setConfirmationModalVisible(true);
    }, [selectedMember, selectedRole]);

  const handleBackToSelection =
    useCallback(() => {
      if (saving) {
        return;
      }

      setConfirmationModalVisible(false);
      setRoleModalVisible(true);
    }, [saving]);

  const handleConfirmRoleChange =
    useCallback(async () => {
      if (
        !selectedMember?.id ||
        !selectedRole ||
        !networkUuid ||
        saving
      ) {
        return;
      }

      const previousRole = selectedMember.role;
      const profile =
        selectedMember.profile || {};

      const displayName =
        profile.display_name ||
        formatHandle(profile.handle) ||
        "The member";

      try {
        setSaving(true);

        const { data, error } =
          await supabase.rpc(
            "manage_network_member_role_rpc",
            {
              p_network_uuid: networkUuid,
              p_membership_id:
                selectedMember.id,
              p_new_role: selectedRole,
            }
          );

        if (error) {
          throw error;
        }

        const updatedMembership =
          Array.isArray(data) ? data[0] : data;

        setMemberships(
          (currentMemberships) =>
            currentMemberships.map(
              (membership) =>
                membership.id ===
                selectedMember.id
                  ? {
                      ...membership,
                      ...updatedMembership,
                      profile:
                        membership.profile,
                    }
                  : membership
            )
        );

        setConfirmationModalVisible(false);
        setRoleModalVisible(false);
        setSelectedMember(null);
        setSelectedRole(null);

        setInformation({
          title: "Role updated",
          message: `${displayName} has changed from ${
            getRoleDetails(previousRole).label
          } to ${
            getRoleDetails(selectedRole).label
          }.`,
          destructive: false,
        });
      } catch (error) {
        console.log(
          "Network role update error:",
          error
        );

        setConfirmationModalVisible(false);
        setRoleModalVisible(false);
        setSelectedMember(null);
        setSelectedRole(null);

        setInformation({
          title: "Role could not be updated",
          message:
            error?.message ||
            "Triunely could not complete this role change.",
          destructive: true,
        });
      } finally {
        setSaving(false);
      }
    }, [
      networkUuid,
      saving,
      selectedMember,
      selectedRole,
    ]);

  const openSuccessorModal = useCallback(() => {
    const currentSuccessorMembership =
      memberships.find(
        (membership) =>
          membership.user_id ===
          network?.designated_successor_user_id
      );

    setSelectedSuccessorMembershipId(
      currentSuccessorMembership?.id || null
    );

    setSuccessorModalVisible(true);
  }, [
    memberships,
    network?.designated_successor_user_id,
  ]);

  const closeSuccessorModal = useCallback(() => {
    if (saving) {
      return;
    }

    setSuccessorModalVisible(false);
    setSelectedSuccessorMembershipId(null);
  }, [saving]);

  const saveSuccessor = useCallback(
    async (membershipId) => {
      if (!networkUuid || saving) {
        return;
      }

      const selectedMembership =
        memberships.find(
          (membership) =>
            membership.id === membershipId
        ) || null;

      const profile =
        selectedMembership?.profile || {};

      const displayName =
        profile.display_name ||
        formatHandle(profile.handle) ||
        "The selected Admin";

      try {
        setSaving(true);

        const { data, error } =
          await supabase.rpc(
            "set_network_designated_successor_rpc",
            {
              p_network_uuid: networkUuid,
              p_successor_membership_id:
                membershipId || null,
            }
          );

        if (error) {
          throw error;
        }

        const updatedNetwork =
          Array.isArray(data) ? data[0] : data;

        setNetwork((currentNetwork) => ({
          ...currentNetwork,
          ...updatedNetwork,
        }));

        setSuccessorModalVisible(false);
        setSelectedSuccessorMembershipId(null);

        setInformation({
          title: membershipId
            ? "Successor appointed"
            : "Successor removed",
          message: membershipId
            ? `${displayName} is now the designated successor. Ownership has not been transferred.`
            : "The designated successor has been removed. Network ownership remains unchanged.",
          destructive: false,
        });
      } catch (error) {
        console.log(
          "Network successor update error:",
          error
        );

        setSuccessorModalVisible(false);
        setSelectedSuccessorMembershipId(null);

        setInformation({
          title: "Successor could not be updated",
          message:
            error?.message ||
            "Triunely could not update the designated successor.",
          destructive: true,
        });
      } finally {
        setSaving(false);
      }
    },
    [memberships, networkUuid, saving]
  );

  const openOwnershipTransferModal =
    useCallback(() => {
      const preferredMembership =
        eligibleSuccessorAdmins.find(
          (membership) =>
            membership.user_id ===
            network?.designated_successor_user_id
        ) || null;

      setSelectedNewOwnerMembershipId(
        preferredMembership?.id || null
      );

      setOwnershipTransferConfirmationVisible(false);
      setOwnershipTransferModalVisible(true);
    }, [
      eligibleSuccessorAdmins,
      network?.designated_successor_user_id,
    ]);

  const closeOwnershipTransferFlow =
    useCallback(() => {
      if (saving) {
        return;
      }

      setOwnershipTransferModalVisible(false);
      setOwnershipTransferConfirmationVisible(false);
      setSelectedNewOwnerMembershipId(null);
    }, [saving]);

  const reviewOwnershipTransfer =
    useCallback(() => {
      if (!selectedNewOwnerMembershipId || saving) {
        return;
      }

      setOwnershipTransferModalVisible(false);
      setOwnershipTransferConfirmationVisible(true);
    }, [
      saving,
      selectedNewOwnerMembershipId,
    ]);

  const returnToOwnershipSelection =
    useCallback(() => {
      if (saving) {
        return;
      }

      setOwnershipTransferConfirmationVisible(false);
      setOwnershipTransferModalVisible(true);
    }, [saving]);

  const confirmOwnershipTransfer =
    useCallback(async () => {
      if (
        !networkUuid ||
        !selectedNewOwnerMembershipId ||
        !selectedNewOwnerMembership ||
        saving
      ) {
        return;
      }

      const profile =
        selectedNewOwnerMembership.profile || {};

      const displayName =
        profile.display_name ||
        formatHandle(profile.handle) ||
        "The selected Admin";

      try {
        setSaving(true);

        const { error } = await supabase.rpc(
          "transfer_network_ownership_rpc",
          {
            p_network_uuid: networkUuid,
            p_new_owner_membership_id:
              selectedNewOwnerMembershipId,
          }
        );

        if (error) {
          throw error;
        }

        setOwnershipTransferModalVisible(false);
        setOwnershipTransferConfirmationVisible(false);
        setSelectedNewOwnerMembershipId(null);

        await loadRoles({
          showLoader: false,
        });

        setInformation({
          title: "Ownership transferred",
          message: `${displayName} is now the Network Owner. You are now a Network Admin, and the previous successor designation has been cleared.`,
          destructive: false,
        });
      } catch (error) {
        console.log(
          "Network ownership transfer error:",
          error
        );

        setOwnershipTransferModalVisible(false);
        setOwnershipTransferConfirmationVisible(false);
        setSelectedNewOwnerMembershipId(null);

        setInformation({
          title: "Ownership could not be transferred",
          message:
            error?.message ||
            "Triunely could not complete the ownership transfer.",
          destructive: true,
        });
      } finally {
        setSaving(false);
      }
    }, [
      loadRoles,
      networkUuid,
      saving,
      selectedNewOwnerMembership,
      selectedNewOwnerMembershipId,
    ]);

  if (loading) {
    return (
      <Screen
        backgroundColor={PREMIUM_CREAM}
        padded={false}
        style={{
          flex: 1,
        }}
      >
        {() => <LoadingState />}
      </Screen>
    );
  }

  if (loadError || !network) {
    return (
      <Screen
        backgroundColor={PREMIUM_CREAM}
        padded={false}
        style={{
          flex: 1,
        }}
      >
        {() => (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              paddingHorizontal: 20,
            }}
          >
            <View
              style={{
                ...premiumCardStyle,
                borderRadius: 26,
                padding: 22,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: 31,
                  backgroundColor:
                    SOFT_DANGER_BG,
                  borderWidth: 1,
                  borderColor: DANGER_BORDER,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 15,
                }}
              >
                <Ionicons
                  name="shield-outline"
                  size={30}
                  color={DANGER}
                />
              </View>

              <Text
                style={{
                  ...serifHeading,
                  fontSize: 22,
                  lineHeight: 27,
                  textAlign: "center",
                }}
              >
                Roles unavailable
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 13.5,
                  fontWeight: "700",
                  lineHeight: 20,
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                {loadError}
              </Text>

              <View
                style={{
                  width: "100%",
                  flexDirection: "row",
                  gap: 10,
                  marginTop: 20,
                }}
              >
                <Pressable
                  onPress={() =>
                    navigation.goBack()
                  }
                  style={({ pressed }) => ({
                    flex: 1,
                    minHeight: 47,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: OLIVE_BORDER,
                    backgroundColor: pressed
                      ? SOFT_OLIVE_BG
                      : SURFACE,
                    alignItems: "center",
                    justifyContent: "center",
                  })}
                >
                  <Text
                    style={{
                      color: DEEP_OLIVE,
                      fontSize: 13,
                      fontWeight: "900",
                    }}
                  >
                    Go Back
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => loadRoles()}
                  style={({ pressed }) => ({
                    flex: 1,
                    minHeight: 47,
                    borderRadius: 999,
                    backgroundColor: pressed
                      ? "#92400E"
                      : HEAVENLY_GOLD,
                    alignItems: "center",
                    justifyContent: "center",
                  })}
                >
                  <Text
                    style={{
                      color: SURFACE,
                      fontSize: 13,
                      fontWeight: "900",
                    }}
                  >
                    Try Again
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </Screen>
    );
  }

  const actorIsOwner =
    network.owner_user_id === currentUserId ||
    (
      actorMembership?.status === "joined" &&
      actorMembership?.role === "owner"
    );

  const actorIsAdmin =
    actorMembership?.status === "joined" &&
    actorMembership?.role === "admin";

  function canManageMemberRole(member) {
    if (!member || member.user_id === currentUserId) {
      return false;
    }

    if (member.role === "owner") {
      return false;
    }

    if (
      member.user_id ===
      network.designated_successor_user_id
    ) {
      return false;
    }

    if (actorIsOwner) {
      return true;
    }

    if (actorIsAdmin) {
      return ["member", "moderator"].includes(
        String(member.role || "")
      );
    }

    return false;
  }

  const allowedRolesForSelectedMember = actorIsOwner
    ? ["admin", "moderator", "member"]
    : selectedMember?.role === "moderator"
    ? ["member"]
    : ["moderator"];

  return (
    <Screen
      backgroundColor={PREMIUM_CREAM}
      padded={false}
      style={{
        flex: 1,
      }}
    >
      {({ bottomPad }) => (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={HEAVENLY_GOLD}
                colors={[HEAVENLY_GOLD]}
              />
            }
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: bottomPad + 24,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 18,
              }}
            >
              <Pressable
                onPress={() =>
                  navigation.goBack()
                }
                hitSlop={10}
                style={({ pressed }) => ({
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed
                    ? SOFT_OLIVE_BG
                    : SURFACE,
                  borderWidth: 1,
                  borderColor: OLIVE_BORDER,
                  marginRight: 12,
                })}
              >
                <Ionicons
                  name="chevron-back"
                  size={23}
                  color={DEEP_OLIVE}
                />
              </Pressable>

              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 26,
                    lineHeight: 31,
                  }}
                >
                  Roles and Permissions
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 12,
                    fontWeight: "800",
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  {network.name}
                </Text>
              </View>
            </View>

            <View
              style={{
                borderRadius: 24,
                backgroundColor: DEEP_OLIVE,
                padding: 17,
                marginBottom: 18,
                overflow: "hidden",
              }}
            >
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  width: 190,
                  height: 190,
                  borderRadius: 95,
                  top: -112,
                  right: -45,
                  backgroundColor:
                    "rgba(180, 83, 9, 0.26)",
                }}
              />

              <Text
                style={{
                  fontFamily: displayFont,
                  color: SURFACE,
                  fontSize: 21,
                  fontWeight: "900",
                  lineHeight: 26,
                }}
              >
                Network Leadership
              </Text>

              <Text
                style={{
                  color:
                    "rgba(255, 255, 255, 0.80)",
                  fontSize: 12,
                  fontWeight: "700",
                  lineHeight: 18,
                  marginTop: 4,
                }}
              >
                {actorIsOwner
                  ? "Assign trusted members to support administration, moderation and Network continuity."
                  : "View Network leadership, succession and authorised Moderator assignments."}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 9,
                  marginTop: 15,
                }}
              >
                {[
                  {
                    label: "Owners",
                    value: roleCounts.owners,
                  },
                  {
                    label: "Admins",
                    value: roleCounts.admins,
                  },
                  {
                    label: "Moderators",
                    value: roleCounts.moderators,
                  },
                  {
                    label: "Members",
                    value: roleCounts.members,
                  },
                ].map((stat) => (
                  <View
                    key={stat.label}
                    style={{
                      width: "47.5%",
                      backgroundColor:
                        "rgba(255, 255, 255, 0.10)",
                      borderWidth: 1,
                      borderColor:
                        "rgba(255, 255, 255, 0.15)",
                      borderRadius: 16,
                      paddingVertical: 10,
                      paddingHorizontal: 11,
                    }}
                  >
                    <Text
                      style={{
                        color: SURFACE,
                        fontSize: 19,
                        fontWeight: "900",
                      }}
                    >
                      {stat.value}
                    </Text>

                    <Text
                      style={{
                        color:
                          "rgba(255, 255, 255, 0.74)",
                        fontSize: 10.5,
                        fontWeight: "800",
                        marginTop: 1,
                      }}
                    >
                      {stat.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <SuccessorCard
              successor={designatedSuccessor}
              actorIsOwner={actorIsOwner}
              onManage={openSuccessorModal}
              onTransfer={openOwnershipTransferModal}
            />

            <View
              style={{
                ...premiumCardStyle,
                padding: 15,
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  ...serifHeading,
                  fontSize: 19,
                  lineHeight: 24,
                  marginBottom: 11,
                }}
              >
                Permission Levels
              </Text>

              <RoleExplanationCard
                icon="key-outline"
                title="Owner"
                description="The owner retains final authority, appoints Admins, nominates the successor and can change any eligible non-owner role."
                tone="gold"
              />

              <RoleExplanationCard
                icon="shield-checkmark-outline"
                title="Admin"
                description="Admins can view leadership and move joined Members between Member and Moderator. Only the owner can appoint or remove Admins."
              />

              <RoleExplanationCard
                icon="sparkles-outline"
                title="Designated Successor"
                description="A nominated Admin for continuity. The designation does not itself transfer ownership or give additional authority."
                tone="gold"
              />

              <RoleExplanationCard
                icon="shield-outline"
                title="Moderator"
                description="Moderators will support discussions, safeguarding and content moderation as those tools are built."
              />
            </View>

            <Text
              style={{
                ...serifHeading,
                fontSize: 21,
                lineHeight: 26,
                marginBottom: 4,
              }}
            >
              Joined Members
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 12.5,
                fontWeight: "700",
                lineHeight: 18,
                marginBottom: 14,
              }}
            >
              {actorIsOwner
                ? "Press the controls beside an eligible member to review and change their Network role. Remove or replace the successor before changing their Admin role."
                : "Admins can view all roles and manage Member and Moderator assignments. Admin, Owner and successor roles remain protected."}
            </Text>

            {sortedMemberships.length === 0 ? (
              <EmptyState />
            ) : (
              sortedMemberships.map(
                (membership) => (
                  <MemberRoleCard
                    key={membership.id}
                    item={membership}
                    currentUserId={currentUserId}
                    canManage={canManageMemberRole(
                      membership
                    )}
                    isSuccessor={
                      membership.user_id ===
                      network.designated_successor_user_id
                    }
                    onManage={openRoleModal}
                  />
                )
              )
            )}
          </ScrollView>

          <OwnershipTransferSelectionModal
            visible={ownershipTransferModalVisible}
            admins={eligibleSuccessorAdmins}
            selectedMembershipId={
              selectedNewOwnerMembershipId
            }
            saving={saving}
            bottomInset={insets.bottom}
            onSelect={
              setSelectedNewOwnerMembershipId
            }
            onContinue={reviewOwnershipTransfer}
            onClose={closeOwnershipTransferFlow}
          />

          <OwnershipTransferConfirmationModal
            visible={
              ownershipTransferConfirmationVisible
            }
            currentOwner={currentOwnerMembership}
            newOwner={selectedNewOwnerMembership}
            saving={saving}
            onConfirm={confirmOwnershipTransfer}
            onBack={returnToOwnershipSelection}
            onClose={closeOwnershipTransferFlow}
          />

          <SuccessorSelectionModal
            visible={successorModalVisible}
            admins={eligibleSuccessorAdmins}
            currentSuccessorUserId={
              network.designated_successor_user_id
            }
            selectedMembershipId={
              selectedSuccessorMembershipId
            }
            saving={saving}
            bottomInset={insets.bottom}
            onSelect={
              setSelectedSuccessorMembershipId
            }
            onRemove={() => saveSuccessor(null)}
            onContinue={() =>
              saveSuccessor(
                selectedSuccessorMembershipId
              )
            }
            onClose={closeSuccessorModal}
          />

          <RoleSelectionModal
            visible={roleModalVisible}
            member={selectedMember}
            selectedRole={selectedRole}
            saving={saving}
            bottomInset={insets.bottom}
            allowedRoles={
              allowedRolesForSelectedMember
            }
            onSelectRole={setSelectedRole}
            onContinue={handleReviewRoleChange}
            onClose={closeRoleFlow}
          />

          <ConfirmationModal
            visible={confirmationModalVisible}
            member={selectedMember}
            selectedRole={selectedRole}
            saving={saving}
            onConfirm={handleConfirmRoleChange}
            onBack={handleBackToSelection}
            onClose={closeRoleFlow}
          />

          <InformationModal
            visible={Boolean(information)}
            title={information?.title || ""}
            message={information?.message || ""}
            destructive={Boolean(
              information?.destructive
            )}
            onClose={() =>
              setInformation(null)
            }
          />
        </>
      )}
    </Screen>
  );
}