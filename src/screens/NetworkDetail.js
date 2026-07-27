// C:\triunely\src\screens\NetworkDetail.js

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
  Share,
  Text,
  View,
} from "react-native";

import NetworkPostsFeed from "../components/NetworkPostsFeed";
import Screen from "../components/Screen";
import useUserCommercialAccountScope from "../hooks/useUserCommercialAccountScope";
import { supabase } from "../lib/supabase";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const HEAVENLY_GOLD = "#B45309";
const EVENT_BROWN = "#7C2D12";
const DEEP_OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";

const SOFT_GOLD_BG = "rgba(180, 83, 9, 0.10)";
const GOLD_BORDER = "rgba(180, 83, 9, 0.18)";
const SOFT_OLIVE_BG = "rgba(79, 99, 59, 0.10)";
const OLIVE_BORDER = "rgba(79, 99, 59, 0.18)";
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

const NETWORK_TABS = ["Home", "Posts", "Events", "About"];

const CATEGORY_ICON_BY_NAME = {
  prayer: "hand-left-outline",
  "bible study": "book-outline",
  bible: "book-outline",
  men: "male-outline",
  women: "female-outline",
  "young adults": "sparkles-outline",
  youth: "sparkles-outline",
  business: "briefcase-outline",
  hobbies: "extension-puzzle-outline",
  activism: "megaphone-outline",
  family: "home-outline",
  "local fellowship": "location-outline",
  fellowship: "people-outline",
  worship: "musical-notes-outline",
  ministry: "heart-outline",
  mission: "earth-outline",
  missions: "earth-outline",
  education: "school-outline",
  leadership: "shield-checkmark-outline",
};

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function formatLabel(value, fallback = "") {
  const cleaned = String(value || "")
    .trim()
    .replace(/[_-]+/g, " ");

  if (!cleaned) {
    return fallback;
  }

  return cleaned.replace(/\b\w/g, (character) => character.toUpperCase());
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );
}

function formatMemberCount(value) {
  const count = Number(value || 0);

  if (!Number.isFinite(count) || count <= 0) {
    return "No members yet";
  }

  if (count === 1) {
    return "1 member";
  }

  if (count >= 1000000) {
    const formatted = (count / 1000000).toFixed(
      count >= 10000000 ? 0 : 1
    );

    return `${formatted.replace(".0", "")}M members`;
  }

  if (count >= 1000) {
    const formatted = (count / 1000).toFixed(count >= 10000 ? 0 : 1);

    return `${formatted.replace(".0", "")}K members`;
  }

  return `${count.toLocaleString()} members`;
}

function getNetworkIcon(network) {
  if (network?.icon_name) {
    return network.icon_name;
  }

  return (
    CATEGORY_ICON_BY_NAME[normalizeText(network?.category)] ||
    "people-outline"
  );
}

function getNetworkImage(network) {
  return network?.cover_image_url || network?.avatar_url || null;
}

function getScopeLabel(network) {
  if (network?.location_name) {
    return network.location_name;
  }

  return formatLabel(network?.scope, "Network");
}

function getVisibilityLabel(network) {
  if (network?.visibility === "members_only") {
    return "Members Only";
  }

  if (network?.visibility === "unlisted") {
    return "Unlisted";
  }

  return "Public";
}

function getMembershipModeLabel(network) {
  if (network?.membership_mode === "approval_required") {
    return "Approval Required";
  }

  if (network?.membership_mode === "invite_only") {
    return "Invite Only";
  }

  return "Open Membership";
}

function StatPill({ icon, label, tone = "olive" }) {
  const isGold = tone === "gold";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: isGold ? SOFT_GOLD_BG : SOFT_OLIVE_BG,
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Ionicons
        name={icon}
        size={14}
        color={isGold ? HEAVENLY_GOLD : DEEP_OLIVE}
      />

      <Text
        style={{
          color: isGold ? HEAVENLY_GOLD : DEEP_OLIVE,
          fontSize: 11,
          fontWeight: "900",
          marginLeft: 5,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

function SectionTitle({ title, subtitle, action }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 12,
      }}
    >
      <View
        style={{
          flex: 1,
          paddingRight: 12,
        }}
      >
        <Text
          style={{
            ...serifHeading,
            fontSize: 22,
            lineHeight: 27,
          }}
        >
          {title}
        </Text>

        {subtitle ? (
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
        ) : null}
      </View>

      {action ? (
        <Pressable
          onPress={action.onPress}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 7,
            paddingHorizontal: 10,
            borderRadius: 999,
            backgroundColor: pressed
              ? "rgba(180, 83, 9, 0.15)"
              : SOFT_GOLD_BG,
            borderWidth: 1,
            borderColor: GOLD_BORDER,
            marginTop: 1,
          })}
        >
          <Ionicons
            name="add"
            size={15}
            color={HEAVENLY_GOLD}
          />

          <Text
            style={{
              color: EVENT_BROWN,
              fontSize: 12,
              fontWeight: "900",
              marginLeft: 3,
            }}
          >
            {action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function FeaturePreviewCard({
  icon,
  title,
  description,
  label,
  tone = "olive",
  onPress,
}) {
  const isGold = tone === "gold";

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        ...premiumCardStyle,
        borderRadius: 21,
        padding: 15,
        marginBottom: 12,
        borderColor: isGold ? GOLD_BORDER : OLIVE_BORDER,
        backgroundColor: pressed
          ? isGold
            ? "rgba(180, 83, 9, 0.07)"
            : "rgba(79, 99, 59, 0.07)"
          : SURFACE,
        opacity: pressed ? 0.84 : 1,
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
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isGold
              ? SOFT_GOLD_BG
              : SOFT_OLIVE_BG,
            borderWidth: 1,
            borderColor: isGold
              ? GOLD_BORDER
              : OLIVE_BORDER,
            marginRight: 12,
          }}
        >
          <Ionicons
            name={icon}
            size={21}
            color={isGold ? HEAVENLY_GOLD : DEEP_OLIVE}
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
                color: TEXT,
                fontSize: 15,
                fontWeight: "900",
                paddingRight: 8,
              }}
            >
              {title}
            </Text>

            {label ? (
              <View
                style={{
                  borderRadius: 999,
                  paddingVertical: 5,
                  paddingHorizontal: 8,
                  backgroundColor: isGold
                    ? SOFT_GOLD_BG
                    : SOFT_OLIVE_BG,
                  borderWidth: 1,
                  borderColor: isGold
                    ? GOLD_BORDER
                    : OLIVE_BORDER,
                }}
              >
                <Text
                  style={{
                    color: isGold
                      ? EVENT_BROWN
                      : DEEP_OLIVE,
                    fontSize: 10,
                    fontWeight: "900",
                  }}
                >
                  {label}
                </Text>
              </View>
            ) : null}
          </View>

          <Text
            style={{
              color: MUTED,
              fontSize: 12.5,
              fontWeight: "700",
              lineHeight: 18,
              marginTop: 5,
            }}
          >
            {description}
          </Text>
        </View>

        {onPress ? (
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isGold
                ? SOFT_GOLD_BG
                : SOFT_OLIVE_BG,
              marginLeft: 8,
            }}
          >
            <Ionicons
              name="chevron-forward"
              size={17}
              color={isGold ? HEAVENLY_GOLD : DEEP_OLIVE}
            />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function EmptyFeatureState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}) {
  return (
    <View
      style={{
        ...premiumCardStyle,
        borderRadius: 23,
        paddingVertical: 30,
        paddingHorizontal: 22,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 62,
          height: 62,
          borderRadius: 31,
          backgroundColor: SOFT_OLIVE_BG,
          borderWidth: 1,
          borderColor: OLIVE_BORDER,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 15,
        }}
      >
        <Ionicons
          name={icon}
          size={28}
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
          marginTop: 8,
        }}
      >
        {message}
      </Text>

      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => ({
            marginTop: 18,
            paddingVertical: 11,
            paddingHorizontal: 19,
            borderRadius: 999,
            backgroundColor: pressed
              ? "#92400E"
              : HEAVENLY_GOLD,
          })}
        >
          <Text
            style={{
              color: SURFACE,
              fontSize: 13,
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

function LoadingScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 28,
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
          marginTop: 16,
          textAlign: "center",
        }}
      >
        Loading Network
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
        Preparing this Network’s public home.
      </Text>
    </View>
  );
}

function NetworkErrorScreen({ message, onBack, onRetry }) {
  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 22,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          ...premiumCardStyle,
          width: "100%",
          maxWidth: 420,
          borderRadius: 26,
          paddingVertical: 27,
          paddingHorizontal: 21,
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: SOFT_GOLD_BG,
            borderWidth: 1,
            borderColor: GOLD_BORDER,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Ionicons
            name="cloud-offline-outline"
            size={30}
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
          Network unavailable
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
          {message}
        </Text>

        <View
          style={{
            width: "100%",
            flexDirection: "row",
            marginTop: 21,
            gap: 10,
          }}
        >
          <Pressable
            onPress={onBack}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 47,
              paddingVertical: 11,
              paddingHorizontal: 15,
              borderRadius: 999,
              backgroundColor: pressed
                ? SOFT_OLIVE_BG
                : SURFACE,
              borderWidth: 1,
              borderColor: OLIVE_BORDER,
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
            onPress={onRetry}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 47,
              paddingVertical: 11,
              paddingHorizontal: 15,
              borderRadius: 999,
              backgroundColor: pressed
                ? "#92400E"
                : HEAVENLY_GOLD,
              borderWidth: 1,
              borderColor: GOLD_BORDER,
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
  );
}

function InformationModal({
  visible,
  icon,
  title,
  message,
  primaryLabel = "Got it",
  onPrimary,
  secondaryLabel,
  onSecondary,
  destructive = false,
}) {
  const destructiveColor = "#991B1B";
  const destructiveSoft = "rgba(153, 27, 27, 0.10)";
  const destructiveBorder = "rgba(153, 27, 27, 0.18)";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onPrimary}
    >
      <Pressable
        onPress={onPrimary}
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
              ? destructiveBorder
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
              marginBottom: 16,
              backgroundColor: destructive
                ? destructiveSoft
                : SOFT_GOLD_BG,
              borderWidth: 1,
              borderColor: destructive
                ? destructiveBorder
                : GOLD_BORDER,
            }}
          >
            <Ionicons
              name={icon}
              size={29}
              color={
                destructive
                  ? destructiveColor
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

          <View
            style={{
              marginTop: 21,
              gap: 10,
            }}
          >
            <Pressable
              onPress={onPrimary}
              style={({ pressed }) => ({
                minHeight: 48,
                borderRadius: 999,
                paddingVertical: 12,
                paddingHorizontal: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: destructive
                  ? pressed
                    ? "#7F1D1D"
                    : destructiveColor
                  : pressed
                  ? "#92400E"
                  : HEAVENLY_GOLD,
                borderWidth: 1,
                borderColor: destructive
                  ? destructiveBorder
                  : GOLD_BORDER,
              })}
            >
              <Text
                style={{
                  color: SURFACE,
                  fontSize: 14,
                  fontWeight: "900",
                }}
              >
                {primaryLabel}
              </Text>
            </Pressable>

            {secondaryLabel && onSecondary ? (
              <Pressable
                onPress={onSecondary}
                style={({ pressed }) => ({
                  minHeight: 48,
                  borderRadius: 999,
                  paddingVertical: 12,
                  paddingHorizontal: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed
                    ? SOFT_OLIVE_BG
                    : SURFACE,
                  borderWidth: 1,
                  borderColor: OLIVE_BORDER,
                })}
              >
                <Text
                  style={{
                    color: DEEP_OLIVE,
                    fontSize: 14,
                    fontWeight: "900",
                  }}
                >
                  {secondaryLabel}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function NetworkDetail() {
  useUserCommercialAccountScope();

  const navigation = useNavigation();
  const route = useRoute();

  const routeNetworkUuid = route.params?.networkUuid || null;
  const routeNetworkSlug =
    route.params?.networkSlug ||
    route.params?.slug ||
    (!isUuid(route.params?.networkId) ? route.params?.networkId : null);
  const routeNetworkId = route.params?.networkId || null;

  const [activeTab, setActiveTab] = useState("Home");

  const [network, setNetwork] = useState(null);
  const [membership, setMembership] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [membershipSaving, setMembershipSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [informationModal, setInformationModal] = useState(null);
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);

  const membershipStatus = membership?.status || "none";
  const membershipRole = membership?.role || null;

  const isJoined = membershipStatus === "joined";
  const isPending = membershipStatus === "pending";
  const isDeclined = membershipStatus === "declined";
  const isRemoved = membershipStatus === "removed";

  const isOwner =
    Boolean(
      currentUserId &&
        network?.owner_user_id &&
        currentUserId === network.owner_user_id
    ) ||
    (isJoined && membershipRole === "owner");

  const canAdminister =
    isOwner ||
    (isJoined &&
      ["owner", "admin"].includes(String(membershipRole || "")));

  const isModerator =
    isJoined && String(membershipRole || "") === "moderator";

  const loadNetwork = useCallback(
    async ({ showLoader = true } = {}) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        setLoadError("");

        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        const userId = sessionData?.session?.user?.id || null;

        setCurrentUserId(userId);

        let networkQuery = supabase
          .from("networks")
          .select(
            `
              id,
              slug,
              name,
              short_description,
              about,
              category,
              scope,
              visibility,
              membership_mode,
              status,
              avatar_url,
              cover_image_url,
              icon_name,
              location_name,
              country_code,
              created_by_user_id,
              owner_user_id,
              member_count,
              is_verified,
              is_featured,
              created_at,
              updated_at
            `
          )
          .limit(1);

        const canonicalUuid =
          routeNetworkUuid ||
          (isUuid(routeNetworkId) ? routeNetworkId : null);

        if (canonicalUuid) {
          networkQuery = networkQuery.eq("id", canonicalUuid);
        } else if (routeNetworkSlug) {
          networkQuery = networkQuery.eq("slug", routeNetworkSlug);
        } else {
          throw new Error("No Network identity was provided.");
        }

        const { data: networkData, error: networkError } =
          await networkQuery.maybeSingle();

        if (networkError) {
          throw networkError;
        }

        if (!networkData) {
          throw new Error(
            "This Network could not be found or is not available to your account."
          );
        }

        setNetwork(networkData);

        if (!userId) {
          setMembership(null);
          return;
        }

        const { data: membershipData, error: membershipError } =
          await supabase
            .from("network_memberships")
            .select(
              "id, network_id, network_uuid, user_id, status, role, created_at, updated_at"
            )
            .eq("user_id", userId)
            .eq("network_uuid", networkData.id)
            .maybeSingle();

        if (membershipError) {
          throw membershipError;
        }

        setMembership(membershipData || null);
      } catch (error) {
        console.log("Network detail load error:", error);

        setLoadError(
          error?.message ||
            "Triunely could not load this Network. Please try again."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [routeNetworkId, routeNetworkSlug, routeNetworkUuid]
  );

  useEffect(() => {
    loadNetwork();

    const unsubscribe = navigation.addListener("focus", () => {
      loadNetwork({
        showLoader: false,
      });
    });

    return unsubscribe;
  }, [loadNetwork, navigation]);

  const membershipButton = useMemo(() => {
    if (membershipSaving) {
      return {
        label: "Updating...",
        backgroundColor: SOFT_OLIVE_BG,
        borderColor: OLIVE_BORDER,
        textColor: DEEP_OLIVE,
      };
    }

    if (isOwner) {
      return {
        label: "Network Owner",
        backgroundColor: DEEP_OLIVE,
        borderColor: DEEP_OLIVE,
        textColor: SURFACE,
      };
    }

    if (isJoined) {
      return {
        label:
          membershipRole === "admin"
            ? "Network Admin"
            : membershipRole === "moderator"
            ? "Network Moderator"
            : "Joined",
        backgroundColor: DEEP_OLIVE,
        borderColor: DEEP_OLIVE,
        textColor: SURFACE,
      };
    }

    if (isPending) {
      return {
        label: "Request Sent",
        backgroundColor: SOFT_OLIVE_BG,
        borderColor: OLIVE_BORDER,
        textColor: DEEP_OLIVE,
      };
    }

    if (isDeclined) {
      return {
        label: "Request Again",
        backgroundColor: SURFACE,
        borderColor: OLIVE_BORDER,
        textColor: DEEP_OLIVE,
      };
    }

    if (isRemoved) {
      return {
        label: "Membership Unavailable",
        backgroundColor: "rgba(107, 114, 128, 0.08)",
        borderColor: CARD_BORDER,
        textColor: MUTED,
      };
    }

    if (network?.membership_mode === "invite_only") {
      return {
        label: "Invite Only",
        backgroundColor: "rgba(107, 114, 128, 0.08)",
        borderColor: CARD_BORDER,
        textColor: MUTED,
      };
    }

    if (network?.membership_mode === "approval_required") {
      return {
        label: "Request to Join",
        backgroundColor: SURFACE,
        borderColor: OLIVE_BORDER,
        textColor: DEEP_OLIVE,
      };
    }

    return {
      label: "Join Network",
      backgroundColor: HEAVENLY_GOLD,
      borderColor: HEAVENLY_GOLD,
      textColor: SURFACE,
    };
  }, [
    isDeclined,
    isJoined,
    isOwner,
    isPending,
    isRemoved,
    membershipRole,
    membershipSaving,
    network?.membership_mode,
  ]);

  const closeInformationModal = useCallback(() => {
    setInformationModal(null);
  }, []);

  const showInformation = useCallback((config) => {
    setInformationModal(config);
  }, []);

  const handleMembershipPress = useCallback(async () => {
    if (!network || membershipSaving) {
      return;
    }

    if (!currentUserId) {
      showInformation({
        icon: "person-circle-outline",
        title: "Sign in required",
        message:
          "Please sign in again before joining or requesting access to this Network.",
      });

      return;
    }

    if (isOwner || canAdminister || isModerator) {
      showInformation({
        icon: "shield-checkmark-outline",
        title: isOwner
          ? "You own this Network"
          : canAdminister
          ? "You administer this Network"
          : "You moderate this Network",
        message:
          "Your Network role and management access will be available through the dedicated Network Admin experience.",
      });

      return;
    }

    if (isJoined) {
      setLeaveModalVisible(true);
      return;
    }

    if (isPending) {
      showInformation({
        icon: "time-outline",
        title: "Request already sent",
        message: `Your request to join ${network.name} is waiting for review.`,
      });

      return;
    }

    if (isDeclined) {
      showInformation({
        icon: "refresh-circle-outline",
        title: "Request to join again?",
        message: `Your previous request to join ${network.name} was declined. You can submit a new request for the Network administrators to review.`,
        primaryLabel: "Send New Request",
        secondaryLabel: "Not Now",
        onSecondary: closeInformationModal,
        onPrimary: async () => {
          try {
            closeInformationModal();
            setMembershipSaving(true);

            const { data, error } = await supabase.rpc(
              "request_network_membership_again_rpc",
              {
                p_network_uuid: network.id,
              }
            );

            if (error) {
              throw error;
            }

            const updatedMembership = Array.isArray(data)
              ? data[0]
              : data;

            setMembership(updatedMembership);

            showInformation({
              icon: "paper-plane-outline",
              title: "Request sent",
              message: `Your new request to join ${network.name} has been sent to its Network administrators.`,
            });
          } catch (error) {
            console.log(
              "Network membership request-again error:",
              error
            );

            showInformation({
              icon: "alert-circle-outline",
              title: "Request could not be sent",
              message:
                error?.message ||
                "Triunely could not send your new membership request. Please try again.",
            });
          } finally {
            setMembershipSaving(false);
          }
        },
      });

      return;
    }

    if (isRemoved) {
      showInformation({
        icon: "remove-circle-outline",
        title: "Membership unavailable",
        message:
          "This membership must be reviewed by a Network owner or admin before you can join again.",
      });

      return;
    }

    if (network.membership_mode === "invite_only") {
      showInformation({
        icon: "lock-closed-outline",
        title: "Invite-only Network",
        message: `${network.name} can currently only be joined through an invitation from an authorised Network representative.`,
      });

      return;
    }

    const nextStatus =
      network.membership_mode === "approval_required"
        ? "pending"
        : "joined";

    try {
      setMembershipSaving(true);

      const { data, error } = await supabase
        .from("network_memberships")
        .insert({
          network_id: network.slug,
          network_uuid: network.id,
          user_id: currentUserId,
          status: nextStatus,
          role: "member",
        })
        .select(
          "id, network_id, network_uuid, user_id, status, role, created_at, updated_at"
        )
        .single();

      if (error) {
        throw error;
      }

      setMembership(data);

      if (nextStatus === "joined") {
        setNetwork((currentNetwork) =>
          currentNetwork
            ? {
                ...currentNetwork,
                member_count:
                  Number(currentNetwork.member_count || 0) + 1,
              }
            : currentNetwork
        );
      }

      showInformation({
        icon:
          nextStatus === "joined"
            ? "checkmark-circle-outline"
            : "paper-plane-outline",
        title:
          nextStatus === "joined"
            ? "Welcome to the Network"
            : "Request sent",
        message:
          nextStatus === "joined"
            ? `You have joined ${network.name}.`
            : `Your request to join ${network.name} has been sent to its Network administrators.`,
      });
    } catch (error) {
      console.log("Network membership insert error:", error);

      showInformation({
        icon: "alert-circle-outline",
        title: "Membership could not be updated",
        message:
          error?.message ||
          "Triunely could not update your Network membership. Please try again.",
      });
    } finally {
      setMembershipSaving(false);
    }
  }, [
    canAdminister,
    currentUserId,
    isDeclined,
    isJoined,
    isModerator,
    isOwner,
    isPending,
    isRemoved,
    membershipSaving,
    network,
    showInformation,
  ]);

  const handleLeaveNetwork = useCallback(async () => {
    if (!membership?.id || !network || isOwner || membershipSaving) {
      return;
    }

    try {
      setMembershipSaving(true);
      setLeaveModalVisible(false);

      const { error } = await supabase
        .from("network_memberships")
        .delete()
        .eq("id", membership.id)
        .eq("user_id", currentUserId);

      if (error) {
        throw error;
      }

      setMembership(null);

      setNetwork((currentNetwork) =>
        currentNetwork
          ? {
              ...currentNetwork,
              member_count: Math.max(
                0,
                Number(currentNetwork.member_count || 0) - 1
              ),
            }
          : currentNetwork
      );

      showInformation({
        icon: "log-out-outline",
        title: "You left the Network",
        message: `You are no longer a member of ${network.name}.`,
      });
    } catch (error) {
      console.log("Network leave error:", error);

      showInformation({
        icon: "alert-circle-outline",
        title: "Could not leave Network",
        message:
          error?.message ||
          "Triunely could not update your membership. Please try again.",
      });
    } finally {
      setMembershipSaving(false);
    }
  }, [
    currentUserId,
    isOwner,
    membership?.id,
    membershipSaving,
    network,
    showInformation,
  ]);

  const handleShare = useCallback(async () => {
    if (!network) {
      return;
    }

    try {
      const deepLink = `triunelyapp://network/${network.slug}`;

      await Share.share({
        title: network.name,
        message: `${network.name}\n\n${
          network.short_description ||
          network.about ||
          "Discover this Christian Network on Triunely."
        }\n\n${deepLink}`,
      });
    } catch (error) {
      console.log("Network share error:", error);
    }
  }, [network]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);

    loadNetwork({
      showLoader: false,
    });
  }, [loadNetwork]);

  const openComingLater = useCallback(
    (title, message, icon = "construct-outline") => {
      showInformation({
        icon,
        title,
        message,
      });
    },
    [showInformation]
  );

  const handleAdminPress = useCallback(() => {
    if (!network?.id) {
      return;
    }

    navigation.navigate("NetworkAdmin", {
      networkUuid: network.id,
    });
  }, [navigation, network?.id]);

  if (loading) {
    return (
      <Screen
        backgroundColor={PREMIUM_CREAM}
        padded={false}
        style={{
          flex: 1,
        }}
      >
        {() => <LoadingScreen />}
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
          <NetworkErrorScreen
            message={
              loadError ||
              "This Network could not be found or is no longer available."
            }
            onBack={() => navigation.goBack()}
            onRetry={() => loadNetwork()}
          />
        )}
      </Screen>
    );
  }

  const networkImage = getNetworkImage(network);
  const networkIcon = getNetworkIcon(network);

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
              paddingBottom: bottomPad + 22,
            }}
          >
            {/* Hero */}
            <View
              style={{
                height: 236,
                backgroundColor: DEEP_OLIVE,
                overflow: "hidden",
              }}
            >
              {networkImage ? (
                <Image
                  source={{
                    uri: networkImage,
                  }}
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: "100%",
                    height: "100%",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: DEEP_OLIVE,
                  }}
                >
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      width: 250,
                      height: 250,
                      borderRadius: 125,
                      top: -125,
                      right: -80,
                      backgroundColor: "rgba(180, 83, 9, 0.20)",
                    }}
                  />

                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      width: 190,
                      height: 190,
                      borderRadius: 95,
                      bottom: -115,
                      left: -45,
                      backgroundColor: "rgba(255, 255, 255, 0.06)",
                    }}
                  />

                  <View
                    style={{
                      width: 94,
                      height: 94,
                      borderRadius: 47,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(255, 255, 255, 0.12)",
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.22)",
                    }}
                  >
                    <Ionicons
                      name={networkIcon}
                      size={43}
                      color={SURFACE}
                    />
                  </View>
                </View>
              )}

              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: networkImage
                    ? "rgba(15, 23, 42, 0.30)"
                    : "rgba(15, 23, 42, 0.08)",
                }}
              />

              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 105,
                  backgroundColor: "rgba(15, 23, 42, 0.20)",
                }}
              />

              <View
                style={{
                  position: "absolute",
                  top: 14,
                  left: 16,
                  right: 16,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Pressable
                  onPress={() => navigation.goBack()}
                  hitSlop={10}
                  style={({ pressed }) => ({
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: pressed
                      ? "rgba(255, 255, 255, 0.78)"
                      : "rgba(255, 255, 255, 0.94)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.55)",
                    shadowColor: "#000",
                    shadowOpacity: 0.12,
                    shadowRadius: 7,
                    shadowOffset: {
                      width: 0,
                      height: 3,
                    },
                    elevation: 3,
                  })}
                >
                  <Ionicons
                    name="chevron-back"
                    size={24}
                    color={DEEP_OLIVE}
                  />
                </Pressable>

                <View
                  style={{
                    flexDirection: "row",
                    gap: 9,
                  }}
                >
                  {canAdminister ? (
                    <Pressable
                      onPress={handleAdminPress}
                      hitSlop={8}
                      style={({ pressed }) => ({
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: pressed
                          ? "rgba(255, 255, 255, 0.78)"
                          : "rgba(255, 255, 255, 0.94)",
                        borderWidth: 1,
                        borderColor: "rgba(255, 255, 255, 0.55)",
                        shadowColor: "#000",
                        shadowOpacity: 0.12,
                        shadowRadius: 7,
                        shadowOffset: {
                          width: 0,
                          height: 3,
                        },
                        elevation: 3,
                      })}
                    >
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={20}
                        color={DEEP_OLIVE}
                      />
                    </Pressable>
                  ) : null}

                  <Pressable
                    onPress={handleShare}
                    hitSlop={10}
                    style={({ pressed }) => ({
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: pressed
                        ? "rgba(255, 255, 255, 0.78)"
                        : "rgba(255, 255, 255, 0.94)",
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.55)",
                      shadowColor: "#000",
                      shadowOpacity: 0.12,
                      shadowRadius: 7,
                      shadowOffset: {
                        width: 0,
                        height: 3,
                      },
                      elevation: 3,
                    })}
                  >
                    <Ionicons
                      name="share-social-outline"
                      size={20}
                      color={DEEP_OLIVE}
                    />
                  </Pressable>
                </View>
              </View>
            </View>

            <View
              style={{
                paddingHorizontal: 16,
                marginTop: -44,
              }}
            >
              {/* Identity card */}
              <View
                style={{
                  ...premiumCardStyle,
                  borderRadius: 26,
                  padding: 17,
                  marginBottom: 18,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                  }}
                >
                  <View
                    style={{
                      width: 66,
                      height: 66,
                      borderRadius: 33,
                      backgroundColor: DEEP_OLIVE,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 3,
                      borderColor: SURFACE,
                      marginRight: 13,
                      overflow: "hidden",
                      shadowColor: SHADOW,
                      shadowOpacity: 0.14,
                      shadowRadius: 8,
                      shadowOffset: {
                        width: 0,
                        height: 4,
                      },
                      elevation: 3,
                    }}
                  >
                    {network.avatar_url ? (
                      <Image
                        source={{
                          uri: network.avatar_url,
                        }}
                        style={{
                          width: "100%",
                          height: "100%",
                        }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons
                        name={networkIcon}
                        size={30}
                        color={SURFACE}
                      />
                    )}
                  </View>

                  <View
                    style={{
                      flex: 1,
                      paddingTop: 2,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                      }}
                    >
                      <Text
                        style={{
                          ...serifHeading,
                          flex: 1,
                          fontSize: 27,
                          lineHeight: 32,
                          letterSpacing: -0.55,
                          paddingRight: 7,
                        }}
                      >
                        {network.name}
                      </Text>

                      {network.is_verified ? (
                        <View
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 13,
                            backgroundColor: HEAVENLY_GOLD,
                            alignItems: "center",
                            justifyContent: "center",
                            marginTop: 2,
                            borderWidth: 1,
                            borderColor: GOLD_BORDER,
                          }}
                        >
                          <Ionicons
                            name="checkmark"
                            size={15}
                            color={SURFACE}
                          />
                        </View>
                      ) : null}
                    </View>

                    <Text
                      style={{
                        color: MUTED,
                        fontSize: 13,
                        fontWeight: "700",
                        lineHeight: 19,
                        marginTop: 6,
                      }}
                    >
                      {network.short_description ||
                        network.about ||
                        "A Christian Network on Triunely."}
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    height: 1,
                    backgroundColor: CARD_BORDER,
                    marginTop: 16,
                    marginBottom: 14,
                  }}
                />

                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                  }}
                >
                  <StatPill
                    icon="pricetag-outline"
                    label={formatLabel(
                      network.category,
                      "Christian Network"
                    )}
                  />

                  <StatPill
                    icon="people-outline"
                    label={formatMemberCount(network.member_count)}
                  />

                  <StatPill
                    icon="globe-outline"
                    label={getVisibilityLabel(network)}
                    tone="gold"
                  />

                  <StatPill
                    icon="location-outline"
                    label={getScopeLabel(network)}
                    tone="gold"
                  />
                </View>

                {isOwner || canAdminister || isModerator ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      alignSelf: "flex-start",
                      paddingVertical: 7,
                      paddingHorizontal: 10,
                      borderRadius: 999,
                      backgroundColor: SOFT_OLIVE_BG,
                      borderWidth: 1,
                      borderColor: OLIVE_BORDER,
                      marginTop: 2,
                    }}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={15}
                      color={DEEP_OLIVE}
                    />

                    <Text
                      style={{
                        color: DEEP_OLIVE,
                        fontSize: 11.5,
                        fontWeight: "900",
                        marginLeft: 5,
                      }}
                    >
                      {isOwner
                        ? "You own this Network"
                        : canAdminister
                        ? "You administer this Network"
                        : "You moderate this Network"}
                    </Text>
                  </View>
                ) : null}

                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    marginTop: 14,
                  }}
                >
                  <Pressable
                    onPress={handleMembershipPress}
                    disabled={membershipSaving || isOwner}
                    style={({ pressed }) => ({
                      flex: 1,
                      minHeight: 49,
                      borderRadius: 999,
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor:
                        membershipButton.backgroundColor,
                      borderWidth: 1,
                      borderColor: membershipButton.borderColor,
                      shadowColor:
                        membershipButton.backgroundColor ===
                        HEAVENLY_GOLD
                          ? HEAVENLY_GOLD
                          : "transparent",
                      shadowOpacity:
                        membershipButton.backgroundColor ===
                        HEAVENLY_GOLD
                          ? 0.16
                          : 0,
                      shadowRadius: 8,
                      shadowOffset: {
                        width: 0,
                        height: 4,
                      },
                      elevation:
                        membershipButton.backgroundColor ===
                        HEAVENLY_GOLD
                          ? 3
                          : 0,
                      opacity:
                        membershipSaving || isOwner
                          ? 0.88
                          : pressed
                          ? 0.76
                          : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: membershipButton.textColor,
                        fontSize: 14,
                        fontWeight: "900",
                        textAlign: "center",
                      }}
                    >
                      {membershipButton.label}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      openComingLater(
                        "Invite to Network",
                        "Network invitations will be added alongside member management and authorised representative controls.",
                        "person-add-outline"
                      )
                    }
                    style={({ pressed }) => ({
                      width: 49,
                      height: 49,
                      borderRadius: 25,
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
                      name="person-add-outline"
                      size={20}
                      color={DEEP_OLIVE}
                    />
                  </Pressable>
                </View>

                {isJoined && !isOwner ? (
                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 10.5,
                      fontWeight: "800",
                      textAlign: "center",
                      marginTop: 8,
                    }}
                  >
                    Press your membership button to leave this Network.
                  </Text>
                ) : null}
              </View>
              {/* Tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  flexGrow: 1,
                }}
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
                }}
              >
                {NETWORK_TABS.map((label) => {
                  const active = activeTab === label;

                  return (
                    <Pressable
                      key={label}
                      onPress={() => setActiveTab(label)}
                      style={({ pressed }) => ({
                        flex: 1,
                        minWidth: 78,
                        borderRadius: 14,
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: active
                          ? SOFT_GOLD_BG
                          : pressed
                          ? SOFT_OLIVE_BG
                          : "transparent",
                        borderWidth: active ? 1 : 0,
                        borderColor: active
                          ? GOLD_BORDER
                          : "transparent",
                      })}
                    >
                      <Text
                        style={{
                          color: active
                            ? EVENT_BROWN
                            : MUTED,
                          fontSize: 12,
                          fontWeight: "900",
                        }}
                      >
                        {label}
                      </Text>

                      {active ? (
                        <View
                          style={{
                            width: 18,
                            height: 3,
                            borderRadius: 999,
                            backgroundColor: HEAVENLY_GOLD,
                            marginTop: 5,
                          }}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Home */}
              {activeTab === "Home" ? (
                <View>
                  <SectionTitle
                    title="Network Home"
                    subtitle="The central place for this Network’s purpose, people and shared Christian activity."
                  />

                  <View
                    style={{
                      ...premiumCardStyle,
                      borderRadius: 22,
                      padding: 17,
                      marginBottom: 19,
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
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: SOFT_GOLD_BG,
                          borderWidth: 1,
                          borderColor: GOLD_BORDER,
                          marginRight: 11,
                        }}
                      >
                        <Ionicons
                          name="compass-outline"
                          size={19}
                          color={HEAVENLY_GOLD}
                        />
                      </View>

                      <View
                        style={{
                          flex: 1,
                        }}
                      >
                        <Text
                          style={{
                            ...serifHeading,
                            fontSize: 18,
                            lineHeight: 22,
                          }}
                        >
                          Purpose
                        </Text>

                        <Text
                          style={{
                            color: MUTED,
                            fontSize: 11,
                            fontWeight: "800",
                            marginTop: 2,
                          }}
                        >
                          Why this Network exists
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        height: 1,
                        backgroundColor: CARD_BORDER,
                        marginBottom: 12,
                      }}
                    />

                    <Text
                      style={{
                        color: TEXT,
                        fontSize: 13.5,
                        fontWeight: "700",
                        lineHeight: 21,
                      }}
                    >
                      {network.about ||
                        network.short_description ||
                        "This Network’s full purpose and public description will appear here."}
                    </Text>
                  </View>

                  <SectionTitle
                    title="Inside this Network"
                    subtitle="Networks will connect activity, resources and collaboration across Triunely without taking ownership away from churches or Partners."
                  />

                  <FeaturePreviewCard
                    icon="megaphone-outline"
                    title="Announcements and Posts"
                    description="Network discussions, updates, pinned announcements and content shared from across the Christian ecosystem."
                    label="Next phase"
                    onPress={() => setActiveTab("Posts")}
                  />

                  <FeaturePreviewCard
                    icon="calendar-outline"
                    title="Events and Gatherings"
                    description="Network-created events alongside authorised events distributed from churches and other Christian organisations."
                    label="Planned"
                    tone="gold"
                    onPress={() => setActiveTab("Events")}
                  />

                  <FeaturePreviewCard
                    icon="people-outline"
                    title="Members and Representatives"
                    description="Individual members and, later, authorised church and Partner representatives with clearly separated permissions."
                    label={formatMemberCount(network.member_count)}
                    onPress={() =>
                      openComingLater(
                        "Network Members",
                        "A secure member directory, role indicators and institutional representatives will be introduced with the membership phase.",
                        "people-outline"
                      )
                    }
                  />

                  <FeaturePreviewCard
                    icon="briefcase-outline"
                    title="Opportunities and Collaboration"
                    description="Projects, ministry opportunities, jobs, volunteering, shared initiatives and cross-church collaboration."
                    label="Future"
                    tone="gold"
                    onPress={() =>
                      openComingLater(
                        "Network Collaboration",
                        "Projects, working groups, opportunities and collaboration requests belong to a later Networks phase.",
                        "briefcase-outline"
                      )
                    }
                  />

                  {canAdminister ? (
                    <Pressable
                      onPress={handleAdminPress}
                      style={({ pressed }) => ({
                        borderRadius: 22,
                        borderWidth: 1,
                        borderColor: OLIVE_BORDER,
                        backgroundColor: pressed
                          ? "rgba(79, 99, 59, 0.14)"
                          : SOFT_OLIVE_BG,
                        padding: 16,
                        marginTop: 6,
                        marginBottom: 5,
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
                            width: 46,
                            height: 46,
                            borderRadius: 23,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: DEEP_OLIVE,
                            marginRight: 12,
                            shadowColor: DEEP_OLIVE,
                            shadowOpacity: 0.16,
                            shadowRadius: 7,
                            shadowOffset: {
                              width: 0,
                              height: 3,
                            },
                            elevation: 3,
                          }}
                        >
                          <Ionicons
                            name="shield-checkmark-outline"
                            size={22}
                            color={SURFACE}
                          />
                        </View>

                        <View
                          style={{
                            flex: 1,
                          }}
                        >
                          <Text
                            style={{
                              ...serifHeading,
                              color: DEEP_OLIVE,
                              fontSize: 17,
                              lineHeight: 21,
                            }}
                          >
                            Network Admin
                          </Text>

                          <Text
                            style={{
                              color: DEEP_OLIVE,
                              fontSize: 12,
                              fontWeight: "700",
                              lineHeight: 18,
                              marginTop: 3,
                              opacity: 0.84,
                            }}
                          >
                            Manage members, permissions, content and
                            settings separately from Church Admin.
                          </Text>
                        </View>

                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: SURFACE,
                            borderWidth: 1,
                            borderColor: OLIVE_BORDER,
                            marginLeft: 8,
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
                  ) : null}
                </View>
              ) : null}

{/* Posts */}
{activeTab === "Posts" ? (
  <NetworkPostsFeed
    networkUuid={network.id}
    networkName={network.name}
    isJoined={isJoined}
    canManage={
      canAdminister ||
      isModerator
    }
  />
) : null}

              {/* Events */}
              {activeTab === "Events" ? (
                <View>
                  <SectionTitle
                    title="Network Events"
                    subtitle="Networks will host their own activity and distribute authorised events created elsewhere in Triunely."
                    action={
                      canAdminister
                        ? {
                            label: "Create",
                            onPress: () =>
                              openComingLater(
                                "Create Network Event",
                                "Network event creation will be introduced after the public profile, membership and administration foundations are secure.",
                                "calendar-outline"
                              ),
                          }
                        : null
                    }
                  />

                  <EmptyFeatureState
                    icon="calendar-outline"
                    title="No Network events yet"
                    message="Upcoming gatherings, online sessions, prayer meetings, conferences and authorised shared events will appear here."
                  />
                </View>
              ) : null}

              {/* About */}
              {activeTab === "About" ? (
                <View>
                  <SectionTitle
                    title="About this Network"
                    subtitle="Public identity, access settings and the purpose governing this Network."
                  />

                  <View
                    style={{
                      ...premiumCardStyle,
                      borderRadius: 22,
                      padding: 17,
                      marginBottom: 13,
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
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: SOFT_GOLD_BG,
                          borderWidth: 1,
                          borderColor: GOLD_BORDER,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 11,
                        }}
                      >
                        <Ionicons
                          name="compass-outline"
                          size={19}
                          color={HEAVENLY_GOLD}
                        />
                      </View>

                      <View
                        style={{
                          flex: 1,
                        }}
                      >
                        <Text
                          style={{
                            ...serifHeading,
                            fontSize: 18,
                            lineHeight: 22,
                          }}
                        >
                          Purpose
                        </Text>

                        <Text
                          style={{
                            color: MUTED,
                            fontSize: 11,
                            fontWeight: "800",
                            marginTop: 2,
                          }}
                        >
                          The mission behind this Network
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        height: 1,
                        backgroundColor: CARD_BORDER,
                        marginBottom: 12,
                      }}
                    />

                    <Text
                      style={{
                        color: TEXT,
                        fontSize: 13,
                        fontWeight: "700",
                        lineHeight: 20,
                      }}
                    >
                      {network.about ||
                        network.short_description ||
                        "This Network has not added a full public description yet."}
                    </Text>
                  </View>

                  <View
                    style={{
                      ...premiumCardStyle,
                      borderRadius: 22,
                      padding: 17,
                      marginBottom: 13,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 14,
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: SOFT_OLIVE_BG,
                          borderWidth: 1,
                          borderColor: OLIVE_BORDER,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 11,
                        }}
                      >
                        <Ionicons
                          name="information-circle-outline"
                          size={20}
                          color={DEEP_OLIVE}
                        />
                      </View>

                      <View
                        style={{
                          flex: 1,
                        }}
                      >
                        <Text
                          style={{
                            ...serifHeading,
                            fontSize: 18,
                            lineHeight: 22,
                          }}
                        >
                          Network Details
                        </Text>

                        <Text
                          style={{
                            color: MUTED,
                            fontSize: 11,
                            fontWeight: "800",
                            marginTop: 2,
                          }}
                        >
                          Public access and membership information
                        </Text>
                      </View>
                    </View>

                    {[
                      {
                        label: "Category",
                        value: formatLabel(
                          network.category,
                          "Christian Network"
                        ),
                        icon: "pricetag-outline",
                      },
                      {
                        label: "Scope",
                        value: formatLabel(
                          network.scope,
                          "Not specified"
                        ),
                        icon: "earth-outline",
                      },
                      {
                        label: "Location",
                        value:
                          network.location_name || "Not specified",
                        icon: "location-outline",
                      },
                      {
                        label: "Visibility",
                        value: getVisibilityLabel(network),
                        icon: "eye-outline",
                      },
                      {
                        label: "Membership",
                        value: getMembershipModeLabel(network),
                        icon: "people-outline",
                      },
                      {
                        label: "Members",
                        value: formatMemberCount(
                          network.member_count
                        ),
                        icon: "person-outline",
                      },
                      {
                        label: "Status",
                        value: formatLabel(
                          network.status,
                          "Active"
                        ),
                        icon: "checkmark-circle-outline",
                      },
                    ].map((row, index, rows) => (
                      <View
                        key={row.label}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingBottom:
                            index === rows.length - 1 ? 0 : 12,
                          marginBottom:
                            index === rows.length - 1 ? 0 : 12,
                          borderBottomWidth:
                            index === rows.length - 1 ? 0 : 1,
                          borderBottomColor: CARD_BORDER,
                        }}
                      >
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: SOFT_OLIVE_BG,
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 10,
                          }}
                        >
                          <Ionicons
                            name={row.icon}
                            size={16}
                            color={DEEP_OLIVE}
                          />
                        </View>

                        <Text
                          style={{
                            flex: 1,
                            color: MUTED,
                            fontSize: 12.5,
                            fontWeight: "800",
                          }}
                        >
                          {row.label}
                        </Text>

                        <Text
                          style={{
                            flex: 1,
                            color: TEXT,
                            fontSize: 12.5,
                            fontWeight: "900",
                            textAlign: "right",
                          }}
                        >
                          {row.value}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <Pressable
                    onPress={() =>
                      openComingLater(
                        "Network Rules",
                        "Network-specific rules, safeguarding information, reporting and moderation controls will be added as structured records rather than generic placeholder text.",
                        "document-text-outline"
                      )
                    }
                    style={({ pressed }) => ({
                      borderRadius: 22,
                      borderWidth: 1,
                      borderColor: GOLD_BORDER,
                      backgroundColor: pressed
                        ? "rgba(180, 83, 9, 0.15)"
                        : SOFT_GOLD_BG,
                      padding: 16,
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
                          width: 42,
                          height: 42,
                          borderRadius: 21,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: SURFACE,
                          borderWidth: 1,
                          borderColor: GOLD_BORDER,
                          marginRight: 11,
                        }}
                      >
                        <Ionicons
                          name="document-text-outline"
                          size={20}
                          color={HEAVENLY_GOLD}
                        />
                      </View>

                      <View
                        style={{
                          flex: 1,
                        }}
                      >
                        <Text
                          style={{
                            ...serifHeading,
                            color: EVENT_BROWN,
                            fontSize: 17,
                            lineHeight: 21,
                          }}
                        >
                          Rules and Safeguarding
                        </Text>

                        <Text
                          style={{
                            color: EVENT_BROWN,
                            fontSize: 12,
                            fontWeight: "700",
                            lineHeight: 18,
                            marginTop: 3,
                            opacity: 0.84,
                          }}
                        >
                          View this Network’s standards, access rules and
                          safety information.
                        </Text>
                      </View>

                      <View
                        style={{
                          width: 31,
                          height: 31,
                          borderRadius: 16,
                          backgroundColor: SURFACE,
                          borderWidth: 1,
                          borderColor: GOLD_BORDER,
                          alignItems: "center",
                          justifyContent: "center",
                          marginLeft: 8,
                        }}
                      >
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={HEAVENLY_GOLD}
                        />
                      </View>
                    </View>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </ScrollView>

          <InformationModal
            visible={Boolean(informationModal)}
            icon={informationModal?.icon || "information-circle-outline"}
            title={informationModal?.title || ""}
            message={informationModal?.message || ""}
            primaryLabel={informationModal?.primaryLabel || "Got it"}
            onPrimary={
              informationModal?.onPrimary ||
              closeInformationModal
            }
            secondaryLabel={informationModal?.secondaryLabel}
            onSecondary={informationModal?.onSecondary}
          />

          <InformationModal
            visible={leaveModalVisible}
            icon="log-out-outline"
            title="Leave this Network?"
            message={`You will stop being a member of ${network.name}. You can join again later if its membership settings allow it.`}
            primaryLabel="Leave Network"
            onPrimary={handleLeaveNetwork}
            secondaryLabel="Keep Membership"
            onSecondary={() => setLeaveModalVisible(false)}
            destructive
          />
        </>
      )}
    </Screen>
  );
}