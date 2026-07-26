// C:\triunely\src\screens\NetworkMembersAdmin.js

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

const displayFont = Platform.OS === "ios" ? "Georgia" : "serif";

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

function formatHandle(handle) {
  const cleaned = String(handle || "").trim();

  if (!cleaned) {
    return "";
  }

  return cleaned.startsWith("@") ? cleaned : `@${cleaned}`;
}

function formatRole(role) {
  const value = String(role || "member").trim().toLowerCase();

  if (value === "owner") {
    return "Owner";
  }

  if (value === "admin") {
    return "Admin";
  }

  if (value === "moderator") {
    return "Moderator";
  }

  return "Member";
}

function formatRequestDate(value) {
  if (!value) {
    return "Request date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Request date unavailable";
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

  return `${words[0].slice(0, 1)}${words[1].slice(0, 1)}`.toUpperCase();
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
        Loading Members
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
        Checking membership requests and Network access.
      </Text>
    </View>
  );
}

function EmptyState({ icon, title, message }) {
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
          name={icon}
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
        {title}
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
        {message}
      </Text>
    </View>
  );
}

function StatusBadge({ role }) {
  const normalizedRole = String(role || "member").toLowerCase();

  const isOwner = normalizedRole === "owner";
  const isAdmin = normalizedRole === "admin";
  const isModerator = normalizedRole === "moderator";

  const backgroundColor = isOwner
    ? SOFT_GOLD_BG
    : isAdmin || isModerator
    ? SOFT_OLIVE_BG
    : "rgba(107, 114, 128, 0.08)";

  const borderColor = isOwner
    ? GOLD_BORDER
    : isAdmin || isModerator
    ? OLIVE_BORDER
    : CARD_BORDER;

  const textColor = isOwner
    ? EVENT_BROWN
    : isAdmin || isModerator
    ? DEEP_OLIVE
    : MUTED;

  return (
    <View
      style={{
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 999,
        backgroundColor,
        borderWidth: 1,
        borderColor,
      }}
    >
      <Text
        style={{
          color: textColor,
          fontSize: 10,
          fontWeight: "900",
        }}
      >
        {formatRole(role)}
      </Text>
    </View>
  );
}

function ProfileAvatar({ profile, size = 48 }) {
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
            fontSize: size * 0.32,
            fontWeight: "900",
          }}
        >
          {getInitials(displayName)}
        </Text>
      )}
    </View>
  );
}

function PendingRequestCard({
  item,
  savingAction,
  onApprove,
  onDecline,
}) {
  const profile = item.profile || {};
  const displayName =
    profile.display_name ||
    formatHandle(profile.handle) ||
    "Triunely Member";

  const handle = formatHandle(profile.handle);
  const isSaving = savingAction?.membershipId === item.id;

  return (
    <View
      style={{
        ...premiumCardStyle,
        borderColor: GOLD_BORDER,
        padding: 15,
        marginBottom: 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
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
                paddingRight: 8,
              }}
              numberOfLines={1}
            >
              {displayName}
            </Text>

            {profile.is_verified ? (
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: HEAVENLY_GOLD,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="checkmark"
                  size={13}
                  color={SURFACE}
                />
              </View>
            ) : null}
          </View>

          {handle && handle !== displayName ? (
            <Text
              style={{
                color: MUTED,
                fontSize: 12,
                fontWeight: "800",
                marginTop: 2,
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
              marginTop: 5,
            }}
          >
            Requested {formatRequestDate(item.created_at)}
          </Text>
        </View>
      </View>

      <View
        style={{
          height: 1,
          backgroundColor: CARD_BORDER,
          marginVertical: 14,
        }}
      />

      <View
        style={{
          flexDirection: "row",
          gap: 10,
        }}
      >
        <Pressable
          onPress={() => onDecline(item)}
          disabled={isSaving}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 45,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: DANGER_BORDER,
            backgroundColor: pressed
              ? "rgba(153, 27, 27, 0.15)"
              : SOFT_DANGER_BG,
            alignItems: "center",
            justifyContent: "center",
            opacity: isSaving ? 0.65 : 1,
          })}
        >
          {isSaving &&
          savingAction?.action === "decline" ? (
            <ActivityIndicator
              size="small"
              color={DANGER}
            />
          ) : (
            <Text
              style={{
                color: DANGER,
                fontSize: 13,
                fontWeight: "900",
              }}
            >
              Decline
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => onApprove(item)}
          disabled={isSaving}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 45,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: OLIVE_BORDER,
            backgroundColor: pressed
              ? "#40512F"
              : DEEP_OLIVE,
            alignItems: "center",
            justifyContent: "center",
            opacity: isSaving ? 0.65 : 1,
          })}
        >
          {isSaving &&
          savingAction?.action === "approve" ? (
            <ActivityIndicator
              size="small"
              color={SURFACE}
            />
          ) : (
            <Text
              style={{
                color: SURFACE,
                fontSize: 13,
                fontWeight: "900",
              }}
            >
              Approve
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function JoinedMemberCard({
  item,
  currentUserId,
  onRemove,
}) {
  const profile = item.profile || {};
  const displayName =
    profile.display_name ||
    formatHandle(profile.handle) ||
    "Triunely Member";

  const handle = formatHandle(profile.handle);

  const isOwner = item.role === "owner";
  const isCurrentUser = item.user_id === currentUserId;

  return (
    <View
      style={{
        ...premiumCardStyle,
        padding: 15,
        marginBottom: 12,
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
                paddingRight: 8,
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

            <StatusBadge role={item.role} />
          </View>

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
              marginTop: 5,
            }}
          >
            Joined {formatRequestDate(item.created_at)}
          </Text>
        </View>

        {!isOwner && !isCurrentUser ? (
          <Pressable
            onPress={() => onRemove(item)}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 19,
              borderWidth: 1,
              borderColor: DANGER_BORDER,
              backgroundColor: pressed
                ? "rgba(153, 27, 27, 0.15)"
                : SOFT_DANGER_BG,
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 9,
            })}
          >
            <Ionicons
              name="person-remove-outline"
              size={18}
              color={DANGER}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function ConfirmationModal({
  visible,
  action,
  member,
  saving,
  onConfirm,
  onClose,
}) {
  if (!member || !action) {
    return null;
  }

  const profile = member.profile || {};

  const displayName =
    profile.display_name ||
    formatHandle(profile.handle) ||
    "this member";

  const isApprove = action === "approve";
  const isDecline = action === "decline";
  const isRemove = action === "remove";
  const destructive = isDecline || isRemove;

  const title = isApprove
    ? "Approve membership request?"
    : isDecline
    ? "Decline membership request?"
    : "Remove Network member?";

  const message = isApprove
    ? `${displayName} will become a joined member of this Network.`
    : isDecline
    ? `${displayName} will not be added to this Network.`
    : `${displayName} will lose access as a joined Network member.`;

  const confirmLabel = isApprove
    ? "Approve Request"
    : isDecline
    ? "Decline Request"
    : "Remove Member";

  const icon = isApprove
    ? "checkmark-circle-outline"
    : isDecline
    ? "close-circle-outline"
    : "person-remove-outline";

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
          onPress={(event) => event.stopPropagation()}
          style={{
            backgroundColor: SURFACE,
            borderRadius: 27,
            borderWidth: 1,
            borderColor: destructive
              ? DANGER_BORDER
              : OLIVE_BORDER,
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
                : SOFT_OLIVE_BG,
              borderWidth: 1,
              borderColor: destructive
                ? DANGER_BORDER
                : OLIVE_BORDER,
              marginBottom: 16,
            }}
          >
            <Ionicons
              name={icon}
              size={29}
              color={destructive ? DANGER : DEEP_OLIVE}
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
                minHeight: 48,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: destructive
                  ? pressed
                    ? "#7F1D1D"
                    : DANGER
                  : pressed
                  ? "#40512F"
                  : DEEP_OLIVE,
                opacity: saving ? 0.72 : 1,
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
                  {confirmLabel}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={onClose}
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
                Cancel
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
          onPress={(event) => event.stopPropagation()}
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

export default function NetworkMembersAdmin() {
  const navigation = useNavigation();
  const route = useRoute();

  const networkUuid =
    route.params?.networkUuid ||
    route.params?.networkId ||
    null;

  const [network, setNetwork] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [memberships, setMemberships] = useState([]);

  const [activeSection, setActiveSection] =
    useState("requests");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [confirmation, setConfirmation] = useState(null);
  const [savingAction, setSavingAction] = useState(null);
  const [information, setInformation] = useState(null);

  const pendingRequests = useMemo(
    () =>
      memberships.filter(
        (membership) => membership.status === "pending"
      ),
    [memberships]
  );

  const joinedMembers = useMemo(
    () =>
      memberships
        .filter(
          (membership) => membership.status === "joined"
        )
        .sort((a, b) => {
          const roleOrder = {
            owner: 0,
            admin: 1,
            moderator: 2,
            member: 3,
          };

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
        }),
    [memberships]
  );

  const loadMembers = useCallback(
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

        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        const userId =
          sessionData?.session?.user?.id || null;

        if (!userId) {
          throw new Error(
            "Please sign in again before managing Network members."
          );
        }

        setCurrentUserId(userId);

        const { data: networkData, error: networkError } =
          await supabase
            .from("networks")
            .select(
              `
                id,
                slug,
                name,
                owner_user_id,
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

        const { data: currentMembership, error: currentMembershipError } =
          await supabase
            .from("network_memberships")
            .select(
              "id, status, role, user_id, network_uuid"
            )
            .eq("network_uuid", networkUuid)
            .eq("user_id", userId)
            .maybeSingle();

        if (currentMembershipError) {
          throw currentMembershipError;
        }

        const canAdminister =
          networkData.owner_user_id === userId ||
          (
            currentMembership?.status === "joined" &&
            ["owner", "admin"].includes(
              String(currentMembership?.role || "")
            )
          );

        if (!canAdminister) {
          throw new Error(
            "You do not have permission to manage this Network."
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
          .in("status", ["pending", "joined"])
          .order("created_at", {
            ascending: true,
          });

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
              .map((membership) => membership.user_id)
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
            (profileData || []).map((profile) => [
              profile.id,
              profile,
            ])
          );
        }

        const hydratedMemberships =
          membershipRows.map((membership) => ({
            ...membership,
            profile:
              profilesById[membership.user_id] || null,
          }));

        setNetwork(networkData);
        setMemberships(hydratedMemberships);
      } catch (error) {
        console.log(
          "Network members admin load error:",
          error
        );

        setLoadError(
          error?.message ||
            "Triunely could not load Network members."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [networkUuid]
  );

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    const unsubscribe = navigation.addListener(
      "focus",
      () => {
        loadMembers({
          showLoader: false,
        });
      }
    );

    return unsubscribe;
  }, [loadMembers, navigation]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);

    loadMembers({
      showLoader: false,
    });
  }, [loadMembers]);

  const openConfirmation = useCallback(
    (action, member) => {
      setConfirmation({
        action,
        member,
      });
    },
    []
  );

  const closeConfirmation = useCallback(() => {
    if (savingAction) {
      return;
    }

    setConfirmation(null);
  }, [savingAction]);

  const performMembershipAction = useCallback(async () => {
    const action = confirmation?.action;
    const member = confirmation?.member;

    if (
      !action ||
      !member?.id ||
      !networkUuid ||
      savingAction
    ) {
      return;
    }

    try {
      setSavingAction({
        action,
        membershipId: member.id,
      });

      const { data, error } = await supabase.rpc(
        "manage_network_membership_request_rpc",
        {
          p_network_uuid: networkUuid,
          p_membership_id: member.id,
          p_action: action,
        }
      );

      if (error) {
        throw error;
      }

      const updatedMembership = Array.isArray(data)
        ? data[0]
        : data;

      setMemberships((currentMemberships) =>
        currentMemberships
          .map((membership) =>
            membership.id === member.id
              ? {
                  ...membership,
                  ...updatedMembership,
                  profile: membership.profile,
                }
              : membership
          )
          .filter((membership) =>
            ["pending", "joined"].includes(
              membership.status
            )
          )
      );

      setConfirmation(null);

      const profile = member.profile || {};

      const displayName =
        profile.display_name ||
        formatHandle(profile.handle) ||
        "The member";

      const successTitle =
        action === "approve"
          ? "Request approved"
          : action === "decline"
          ? "Request declined"
          : "Member removed";

      const successMessage =
        action === "approve"
          ? `${displayName} is now a joined member of ${network?.name}.`
          : action === "decline"
          ? `${displayName} was not added to ${network?.name}.`
          : `${displayName} is no longer a joined member of ${network?.name}.`;

      setInformation({
        title: successTitle,
        message: successMessage,
        destructive: false,
      });
    } catch (error) {
      console.log(
        "Network membership action error:",
        error
      );

      setConfirmation(null);

      setInformation({
        title: "Membership could not be updated",
        message:
          error?.message ||
          "Triunely could not complete this membership action.",
        destructive: true,
      });
    } finally {
      setSavingAction(null);
    }
  }, [
    confirmation?.action,
    confirmation?.member,
    network?.name,
    networkUuid,
    savingAction,
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
                  backgroundColor: SOFT_DANGER_BG,
                  borderWidth: 1,
                  borderColor: DANGER_BORDER,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 15,
                }}
              >
                <Ionicons
                  name="people-circle-outline"
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
                Members unavailable
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
                  onPress={() => navigation.goBack()}
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
                  onPress={() => loadMembers()}
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
                onPress={() => navigation.goBack()}
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
                  Members and Requests
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
                  width: 180,
                  height: 180,
                  borderRadius: 90,
                  top: -108,
                  right: -42,
                  backgroundColor: "rgba(180, 83, 9, 0.26)",
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
                Membership Overview
              </Text>

              <Text
                style={{
                  color: "rgba(255, 255, 255, 0.80)",
                  fontSize: 12,
                  fontWeight: "700",
                  lineHeight: 18,
                  marginTop: 4,
                }}
              >
                Review requests and manage existing Network access.
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  marginTop: 15,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(255, 255, 255, 0.10)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.15)",
                    borderRadius: 17,
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                  }}
                >
                  <Text
                    style={{
                      color: SURFACE,
                      fontSize: 21,
                      fontWeight: "900",
                    }}
                  >
                    {pendingRequests.length}
                  </Text>

                  <Text
                    style={{
                      color: "rgba(255, 255, 255, 0.76)",
                      fontSize: 10.5,
                      fontWeight: "800",
                      marginTop: 2,
                    }}
                  >
                    Pending requests
                  </Text>
                </View>

                <View
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(255, 255, 255, 0.10)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.15)",
                    borderRadius: 17,
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                  }}
                >
                  <Text
                    style={{
                      color: SURFACE,
                      fontSize: 21,
                      fontWeight: "900",
                    }}
                  >
                    {joinedMembers.length}
                  </Text>

                  <Text
                    style={{
                      color: "rgba(255, 255, 255, 0.76)",
                      fontSize: 10.5,
                      fontWeight: "800",
                      marginTop: 2,
                    }}
                  >
                    Joined members
                  </Text>
                </View>
              </View>
            </View>

            <Pressable
              onPress={() =>
                navigation.navigate(
                  "NetworkInvitationsAdmin",
                  {
                    networkUuid,
                    networkName: network.name,
                  }
                )
              }
              style={({ pressed }) => ({
                ...premiumCardStyle,
                padding: 16,
                marginBottom: 18,
                borderColor: GOLD_BORDER,
                backgroundColor: pressed
                  ? SOFT_GOLD_BG
                  : SURFACE,
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
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: SOFT_GOLD_BG,
                    borderWidth: 1,
                    borderColor: GOLD_BORDER,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="person-add-outline"
                    size={23}
                    color={HEAVENLY_GOLD}
                  />
                </View>

                <View
                  style={{
                    flex: 1,
                    marginLeft: 13,
                  }}
                >
                  <Text
                    style={{
                      color: TEXT,
                      fontSize: 15,
                      fontWeight: "900",
                    }}
                  >
                    Invite People
                  </Text>

                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 12,
                      fontWeight: "700",
                      lineHeight: 18,
                      marginTop: 3,
                    }}
                  >
                    Search for people, send invitations and
                    manage invitation history.
                  </Text>
                </View>

                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: SOFT_OLIVE_BG,
                    borderWidth: 1,
                    borderColor: OLIVE_BORDER,
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: 10,
                  }}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={DEEP_OLIVE}
                  />
                </View>
              </View>
            </Pressable>

            <View
              style={{
                backgroundColor: SURFACE,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                padding: 4,
                marginBottom: 20,
                shadowColor: SHADOW,
                shadowOpacity: 0.06,
                shadowRadius: 8,
                shadowOffset: {
                  width: 0,
                  height: 3,
                },
                elevation: 2,
                flexDirection: "row",
              }}
            >
              <Pressable
                onPress={() => setActiveSection("requests")}
                style={({ pressed }) => ({
                  flex: 1,
                  borderRadius: 14,
                  paddingVertical: 11,
                  paddingHorizontal: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    activeSection === "requests"
                      ? SOFT_GOLD_BG
                      : pressed
                      ? SOFT_OLIVE_BG
                      : "transparent",
                  borderWidth:
                    activeSection === "requests" ? 1 : 0,
                  borderColor:
                    activeSection === "requests"
                      ? GOLD_BORDER
                      : "transparent",
                })}
              >
                <Text
                  style={{
                    color:
                      activeSection === "requests"
                        ? EVENT_BROWN
                        : MUTED,
                    fontSize: 12,
                    fontWeight: "900",
                  }}
                >
                  Requests ({pendingRequests.length})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveSection("members")}
                style={({ pressed }) => ({
                  flex: 1,
                  borderRadius: 14,
                  paddingVertical: 11,
                  paddingHorizontal: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    activeSection === "members"
                      ? SOFT_GOLD_BG
                      : pressed
                      ? SOFT_OLIVE_BG
                      : "transparent",
                  borderWidth:
                    activeSection === "members" ? 1 : 0,
                  borderColor:
                    activeSection === "members"
                      ? GOLD_BORDER
                      : "transparent",
                })}
              >
                <Text
                  style={{
                    color:
                      activeSection === "members"
                        ? EVENT_BROWN
                        : MUTED,
                    fontSize: 12,
                    fontWeight: "900",
                  }}
                >
                  Members ({joinedMembers.length})
                </Text>
              </Pressable>
            </View>

            {activeSection === "requests" ? (
              <View>
                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 21,
                    lineHeight: 26,
                    marginBottom: 4,
                  }}
                >
                  Pending Requests
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
                  Approve or decline people waiting to join this Network.
                </Text>

                {pendingRequests.length === 0 ? (
                  <EmptyState
                    icon="checkmark-done-outline"
                    title="No pending requests"
                    message="New membership requests will appear here when this Network requires approval."
                  />
                ) : (
                  pendingRequests.map((request) => (
                    <PendingRequestCard
                      key={request.id}
                      item={request}
                      savingAction={savingAction}
                      onApprove={(member) =>
                        openConfirmation(
                          "approve",
                          member
                        )
                      }
                      onDecline={(member) =>
                        openConfirmation(
                          "decline",
                          member
                        )
                      }
                    />
                  ))
                )}
              </View>
            ) : null}

            {activeSection === "members" ? (
              <View>
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
                  View current members and remove non-owner access where necessary.
                </Text>

                {joinedMembers.length === 0 ? (
                  <EmptyState
                    icon="people-outline"
                    title="No joined members"
                    message="Joined members will appear here once people enter this Network."
                  />
                ) : (
                  joinedMembers.map((member) => (
                    <JoinedMemberCard
                      key={member.id}
                      item={member}
                      currentUserId={currentUserId}
                      onRemove={(selectedMember) =>
                        openConfirmation(
                          "remove",
                          selectedMember
                        )
                      }
                    />
                  ))
                )}
              </View>
            ) : null}
          </ScrollView>

          <ConfirmationModal
            visible={Boolean(confirmation)}
            action={confirmation?.action}
            member={confirmation?.member}
            saving={Boolean(savingAction)}
            onConfirm={performMembershipAction}
            onClose={closeConfirmation}
          />

          <InformationModal
            visible={Boolean(information)}
            title={information?.title || ""}
            message={information?.message || ""}
            destructive={Boolean(
              information?.destructive
            )}
            onClose={() => setInformation(null)}
          />
        </>
      )}
    </Screen>
  );
}