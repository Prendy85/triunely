// C:\triunely\src\screens\Networks.js

import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
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
const MODAL_BACKDROP = "rgba(17, 24, 14, 0.52)";

const DEFAULT_CATEGORIES = [
  "Prayer",
  "Bible Study",
  "Men",
  "Women",
  "Young Adults",
  "Business",
  "Hobbies",
  "Activism",
  "Family",
  "Local Fellowship",
];

const DIRECTORY_TABS = ["Suggested", "Popular", "Local", "My Networks"];

const FALLBACK_NETWORK_ICON = "people-outline";

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

function formatMemberCount(value) {
  const count = Number(value || 0);

  if (!Number.isFinite(count) || count <= 0) {
    return "No members yet";
  }

  if (count === 1) {
    return "1 member";
  }

  if (count >= 1000000) {
    const formatted = (count / 1000000).toFixed(count >= 10000000 ? 0 : 1);
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

  const categoryKey = normalizeText(network?.category);

  return CATEGORY_ICON_BY_NAME[categoryKey] || FALLBACK_NETWORK_ICON;
}

function getNetworkImage(network) {
  return network?.cover_image_url || network?.avatar_url || null;
}

function getMembershipButtonLabel(network, membershipStatus) {
  if (membershipStatus === "joined") {
    return "Joined";
  }

  if (membershipStatus === "pending") {
    return "Request Sent";
  }

  if (membershipStatus === "declined") {
    return network?.membership_mode === "approval_required"
      ? "Request Again"
      : "Join";
  }

  if (network?.membership_mode === "approval_required") {
    return "Request";
  }

  if (network?.membership_mode === "invite_only") {
    return "Invite Only";
  }

  return "Join";
}

function getScopeLabel(network) {
  if (network?.location_name) {
    return network.location_name;
  }

  return formatLabel(network?.scope, "Network");
}

function getDirectoryTitle(activeTab, selectedCategory, searchQuery) {
  if (searchQuery.trim()) {
    return "Search Results";
  }

  if (selectedCategory) {
    return selectedCategory;
  }

  return activeTab === "My Networks"
    ? "My Networks"
    : `${activeTab} Networks`;
}

function EmptyState({
  icon = "people-outline",
  title,
  message,
  actionLabel,
  onAction,
}) {
  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        paddingVertical: 28,
        paddingHorizontal: 20,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 54,
          height: 54,
          borderRadius: 27,
          backgroundColor: SOFT_OLIVE_BG,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        <Ionicons name={icon} size={25} color={DEEP_OLIVE} />
      </View>

      <Text
        style={{
          color: theme.colors.text,
          fontSize: 17,
          fontWeight: "900",
          textAlign: "center",
        }}
      >
        {title}
      </Text>

      <Text
        style={{
          color: theme.colors.muted,
          fontSize: 13,
          fontWeight: "700",
          lineHeight: 20,
          textAlign: "center",
          marginTop: 7,
        }}
      >
        {message}
      </Text>

      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => ({
            marginTop: 17,
            paddingVertical: 10,
            paddingHorizontal: 18,
            borderRadius: 999,
            backgroundColor: pressed ? "#40512F" : DEEP_OLIVE,
          })}
        >
          <Text
            style={{
              color: "#fff",
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

function LoadingState() {
  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        paddingVertical: 30,
        paddingHorizontal: 20,
        alignItems: "center",
      }}
    >
      <ActivityIndicator size="small" color={HEAVENLY_GOLD} />

      <Text
        style={{
          color: theme.colors.text,
          fontSize: 14,
          fontWeight: "900",
          marginTop: 13,
        }}
      >
        Loading Networks
      </Text>

      <Text
        style={{
          color: theme.colors.muted,
          fontSize: 12.5,
          fontWeight: "700",
          marginTop: 5,
          textAlign: "center",
        }}
      >
        Finding Christian communities across Triunely.
      </Text>
    </View>
  );
}

function CategoryChip({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: selected
          ? DEEP_OLIVE
          : pressed
          ? SOFT_OLIVE_BG
          : theme.colors.surface,
        borderWidth: 1,
        borderColor: selected ? DEEP_OLIVE : theme.colors.divider,
        marginRight: 8,
        marginBottom: 8,
        opacity: pressed ? 0.82 : 1,
      })}
    >
      <Text
        style={{
          color: selected ? "#fff" : DEEP_OLIVE,
          fontSize: 12,
          fontWeight: "900",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function NetworkImage({ network }) {
  const imageUrl = getNetworkImage(network);
  const icon = getNetworkIcon(network);

  return (
    <View
      style={{
        width: 96,
        height: 138,
        backgroundColor: theme.colors.surfaceAlt,
      }}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{
            width: 96,
            height: 138,
          }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: 96,
            height: 138,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: SOFT_GOLD_BG,
          }}
        >
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: 27,
              backgroundColor: "rgba(255, 255, 255, 0.78)",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: CARD_BORDER,
            }}
          >
            <Ionicons name={icon} size={27} color={HEAVENLY_GOLD} />
          </View>
        </View>
      )}

      <View
        style={{
          position: "absolute",
          left: 8,
          bottom: 8,
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: DEEP_OLIVE,
          borderWidth: 2,
          borderColor: theme.colors.surface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={17} color="#fff" />
      </View>

      {network?.is_verified ? (
        <View
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 25,
            height: 25,
            borderRadius: 13,
            backgroundColor: HEAVENLY_GOLD,
            borderWidth: 2,
            borderColor: theme.colors.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="checkmark" size={14} color="#fff" />
        </View>
      ) : null}
    </View>
  );
}

function NetworkListCard({ network, membershipStatus }) {
  const navigation = useNavigation();

  const isJoined = membershipStatus === "joined";
  const isPending = membershipStatus === "pending";
  const isInviteOnly =
    !membershipStatus && network?.membership_mode === "invite_only";

  const buttonLabel = getMembershipButtonLabel(network, membershipStatus);

  const openNetwork = useCallback(() => {
    navigation.push("NetworkDetail", {
      // Keep the existing slug route working until NetworkDetail is migrated.
      networkId: network.slug,

      // Canonical identity for the upcoming NetworkDetail migration.
      networkUuid: network.id,
      networkSlug: network.slug,
      slug: network.slug,
    });
  }, [navigation, network.id, network.slug]);

  return (
    <Pressable
      onPress={openNetwork}
      style={({ pressed }) => ({
        flexDirection: "row",
        minHeight: 138,
        backgroundColor: theme.colors.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: network?.is_featured
          ? CARD_BORDER
          : theme.colors.divider,
        overflow: "hidden",
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: {
          width: 0,
          height: 4,
        },
        elevation: 3,
        transform: [
          {
            scale: pressed ? 0.99 : 1,
          },
        ],
      })}
    >
      <NetworkImage network={network} />

      <View
        style={{
          flex: 1,
          minHeight: 138,
          padding: 12,
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
              flex: 1,
              color: theme.colors.text,
              fontSize: 15,
              fontWeight: "900",
              lineHeight: 19,
              paddingRight: 5,
            }}
            numberOfLines={2}
          >
            {network.name}
          </Text>

          {network?.is_featured ? (
            <Ionicons
              name="star"
              size={14}
              color={HEAVENLY_GOLD}
              style={{
                marginTop: 2,
              }}
            />
          ) : null}
        </View>

        <Text
          style={{
            color: theme.colors.muted,
            fontSize: 11.5,
            fontWeight: "700",
            lineHeight: 16,
            marginTop: 4,
          }}
          numberOfLines={2}
        >
          {network.short_description ||
            network.about ||
            "A Christian Network on Triunely."}
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 6,
            marginTop: 8,
          }}
        >
          <View
            style={{
              paddingVertical: 4,
              paddingHorizontal: 8,
              borderRadius: 999,
              backgroundColor: SOFT_OLIVE_BG,
            }}
          >
            <Text
              style={{
                color: DEEP_OLIVE,
                fontSize: 10.5,
                fontWeight: "900",
              }}
              numberOfLines={1}
            >
              {formatLabel(network.category, "Christian Network")}
            </Text>
          </View>

          <View
            style={{
              paddingVertical: 4,
              paddingHorizontal: 8,
              borderRadius: 999,
              backgroundColor: SOFT_GOLD_BG,
              maxWidth: 125,
            }}
          >
            <Text
              style={{
                color: HEAVENLY_GOLD,
                fontSize: 10.5,
                fontWeight: "900",
              }}
              numberOfLines={1}
            >
              {getScopeLabel(network)}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "auto",
            paddingTop: 8,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flex: 1,
              paddingRight: 8,
            }}
          >
            <Ionicons name="people-outline" size={14} color={DEEP_OLIVE} />

            <Text
              style={{
                color: theme.colors.muted,
                fontSize: 11,
                fontWeight: "800",
                marginLeft: 4,
              }}
              numberOfLines={1}
            >
              {formatMemberCount(network.member_count)}
            </Text>
          </View>

          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              openNetwork();
            }}
            style={({ pressed }) => ({
              minWidth: isPending ? 94 : 70,
              paddingVertical: 7,
              paddingHorizontal: 10,
              borderRadius: 999,
              alignItems: "center",
              backgroundColor: isJoined
                ? DEEP_OLIVE
                : isPending
                ? SOFT_OLIVE_BG
                : isInviteOnly
                ? theme.colors.surfaceAlt
                : "transparent",
              borderWidth: 1,
              borderColor: isJoined
                ? DEEP_OLIVE
                : isPending
                ? DEEP_OLIVE
                : isInviteOnly
                ? theme.colors.divider
                : network.membership_mode === "approval_required"
                ? DEEP_OLIVE
                : HEAVENLY_GOLD,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Text
              style={{
                color: isJoined
                  ? "#fff"
                  : isPending
                  ? DEEP_OLIVE
                  : isInviteOnly
                  ? theme.colors.muted
                  : network.membership_mode === "approval_required"
                  ? DEEP_OLIVE
                  : HEAVENLY_GOLD,
                fontSize: 12,
                fontWeight: "900",
              }}
              numberOfLines={1}
            >
              {buttonLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

function CreateNetworkComingSoonModal({ visible, onClose }) {
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
            backgroundColor: theme.colors.surface,
            borderRadius: 26,
            borderWidth: 1,
            borderColor: CARD_BORDER,
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
              width: 58,
              height: 58,
              borderRadius: 29,
              backgroundColor: SOFT_GOLD_BG,
              alignItems: "center",
              justifyContent: "center",
              alignSelf: "center",
              marginBottom: 16,
            }}
          >
            <Ionicons
              name="git-network-outline"
              size={29}
              color={HEAVENLY_GOLD}
            />
          </View>

          <Text
            style={{
              color: theme.colors.text,
              fontSize: 22,
              fontWeight: "900",
              textAlign: "center",
            }}
          >
            Create a Network
          </Text>

          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 14,
              fontWeight: "700",
              lineHeight: 21,
              textAlign: "center",
              marginTop: 9,
            }}
          >
            Secure Network creation, ownership and administration are being
            prepared as the next part of the Networks build.
          </Text>

          <View
            style={{
              backgroundColor: SOFT_OLIVE_BG,
              borderRadius: 16,
              padding: 14,
              marginTop: 18,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
              }}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={DEEP_OLIVE}
                style={{
                  marginTop: 1,
                }}
              />

              <Text
                style={{
                  flex: 1,
                  color: DEEP_OLIVE,
                  fontSize: 12.5,
                  fontWeight: "800",
                  lineHeight: 19,
                  marginLeft: 9,
                }}
              >
                Network creation will use a secure approval and ownership flow,
                rather than an unfinished public form.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({
              marginTop: 20,
              backgroundColor: pressed ? "#40512F" : DEEP_OLIVE,
              borderRadius: 999,
              paddingVertical: 12,
              alignItems: "center",
            })}
          >
            <Text
              style={{
                color: "#fff",
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

export default function Networks() {
  const navigation = useNavigation();

  const [activeTab, setActiveTab] = useState("Suggested");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [networks, setNetworks] = useState([]);
  const [membershipByNetworkUuid, setMembershipByNetworkUuid] = useState({});
  const [membershipByNetworkSlug, setMembershipByNetworkSlug] = useState({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadDirectory = useCallback(async ({ showLoader = true } = {}) => {
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

      const networkPromise = supabase
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
            owner_user_id,
            member_count,
            is_verified,
            is_featured,
            created_at,
            updated_at
          `
        )
        .eq("status", "active")
        .order("is_featured", {
          ascending: false,
        })
        .order("member_count", {
          ascending: false,
        })
        .order("name", {
          ascending: true,
        });

      const membershipPromise = userId
        ? supabase
            .from("network_memberships")
            .select(
              "network_id, network_uuid, status, role, created_at, updated_at"
            )
            .eq("user_id", userId)
        : Promise.resolve({
            data: [],
            error: null,
          });

      const [networkResult, membershipResult] = await Promise.all([
        networkPromise,
        membershipPromise,
      ]);

      if (networkResult.error) {
        throw networkResult.error;
      }

      if (membershipResult.error) {
        throw membershipResult.error;
      }

      const nextNetworks = Array.isArray(networkResult.data)
        ? networkResult.data
        : [];

      const nextMembershipByUuid = {};
      const nextMembershipBySlug = {};

      (membershipResult.data || []).forEach((membership) => {
        if (membership.network_uuid) {
          nextMembershipByUuid[membership.network_uuid] = membership;
        }

        if (membership.network_id) {
          nextMembershipBySlug[membership.network_id] = membership;
        }
      });

      setNetworks(nextNetworks);
      setMembershipByNetworkUuid(nextMembershipByUuid);
      setMembershipByNetworkSlug(nextMembershipBySlug);
    } catch (error) {
      console.log("Networks directory load error:", error);

      setLoadError(
        error?.message ||
          "Triunely could not load Networks. Check your connection and try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDirectory();

    const unsubscribe = navigation.addListener("focus", () => {
      loadDirectory({
        showLoader: false,
      });
    });

    return unsubscribe;
  }, [loadDirectory, navigation]);

  const getMembershipForNetwork = useCallback(
    (network) => {
      return (
        membershipByNetworkUuid[network.id] ||
        membershipByNetworkSlug[network.slug] ||
        null
      );
    },
    [membershipByNetworkSlug, membershipByNetworkUuid]
  );

  const categories = useMemo(() => {
    const categoryMap = new Map();

    DEFAULT_CATEGORIES.forEach((category) => {
      categoryMap.set(normalizeText(category), category);
    });

    networks.forEach((network) => {
      const category = formatLabel(network.category);

      if (category) {
        categoryMap.set(normalizeText(category), category);
      }
    });

    return Array.from(categoryMap.values());
  }, [networks]);

  const displayedNetworks = useMemo(() => {
    let nextNetworks = [...networks];

    if (activeTab === "My Networks") {
      nextNetworks = nextNetworks.filter((network) => {
        const membership = getMembershipForNetwork(network);

        return (
          membership?.status === "joined" ||
          membership?.status === "pending"
        );
      });

      nextNetworks.sort((first, second) => {
        const firstMembership = getMembershipForNetwork(first);
        const secondMembership = getMembershipForNetwork(second);

        const firstJoined = firstMembership?.status === "joined" ? 1 : 0;
        const secondJoined = secondMembership?.status === "joined" ? 1 : 0;

        if (firstJoined !== secondJoined) {
          return secondJoined - firstJoined;
        }

        return String(first.name || "").localeCompare(
          String(second.name || "")
        );
      });
    } else if (activeTab === "Popular") {
      nextNetworks.sort((first, second) => {
        const memberDifference =
          Number(second.member_count || 0) - Number(first.member_count || 0);

        if (memberDifference !== 0) {
          return memberDifference;
        }

        return String(first.name || "").localeCompare(
          String(second.name || "")
        );
      });
    } else if (activeTab === "Local") {
      nextNetworks = nextNetworks.filter((network) => {
        return ["local", "regional"].includes(normalizeText(network.scope));
      });

      nextNetworks.sort((first, second) => {
        const firstHasLocation = first.location_name ? 1 : 0;
        const secondHasLocation = second.location_name ? 1 : 0;

        if (firstHasLocation !== secondHasLocation) {
          return secondHasLocation - firstHasLocation;
        }

        return (
          Number(second.member_count || 0) - Number(first.member_count || 0)
        );
      });
    } else {
      nextNetworks.sort((first, second) => {
        const firstMembership = getMembershipForNetwork(first);
        const secondMembership = getMembershipForNetwork(second);

        const firstNotJoined = firstMembership?.status === "joined" ? 0 : 1;
        const secondNotJoined = secondMembership?.status === "joined" ? 0 : 1;

        if (firstNotJoined !== secondNotJoined) {
          return secondNotJoined - firstNotJoined;
        }

        const firstFeatured = first.is_featured ? 1 : 0;
        const secondFeatured = second.is_featured ? 1 : 0;

        if (firstFeatured !== secondFeatured) {
          return secondFeatured - firstFeatured;
        }

        const firstVerified = first.is_verified ? 1 : 0;
        const secondVerified = second.is_verified ? 1 : 0;

        if (firstVerified !== secondVerified) {
          return secondVerified - firstVerified;
        }

        return (
          Number(second.member_count || 0) - Number(first.member_count || 0)
        );
      });
    }

    if (selectedCategory) {
      const selectedCategoryKey = normalizeText(selectedCategory);

      nextNetworks = nextNetworks.filter((network) => {
        return normalizeText(network.category) === selectedCategoryKey;
      });
    }

    const query = normalizeText(searchQuery);

    if (query) {
      nextNetworks = nextNetworks.filter((network) => {
        const searchableText = [
          network.name,
          network.short_description,
          network.about,
          network.category,
          network.scope,
          network.location_name,
          network.country_code,
          network.slug,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(query);
      });
    }

    return nextNetworks;
  }, [
    activeTab,
    getMembershipForNetwork,
    networks,
    searchQuery,
    selectedCategory,
  ]);

  const listTitle = getDirectoryTitle(
    activeTab,
    selectedCategory,
    searchQuery
  );

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedCategory(null);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);

    loadDirectory({
      showLoader: false,
    });
  }, [loadDirectory]);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  const handleCategoryPress = useCallback((category) => {
    setSelectedCategory((currentCategory) =>
      currentCategory === category ? null : category
    );
  }, []);

  const showFilterClear =
    Boolean(selectedCategory) || Boolean(searchQuery.trim());

  return (
    <Screen
      backgroundColor={theme.colors.bg}
      padded={false}
      style={{
        flex: 1,
      }}
    >
      {({ bottomPad }) => (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
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
              paddingTop: 12,
              paddingBottom: bottomPad + 20,
            }}
          >
            {/* Header */}
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
                style={({ pressed }) => ({
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed
                    ? SOFT_OLIVE_BG
                    : theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.divider,
                })}
              >
                <Ionicons
                  name="chevron-back"
                  size={23}
                  color={DEEP_OLIVE}
                />
              </Pressable>

              <Pressable
                onPress={() => navigation.navigate("CreateNetwork")}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 9,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  backgroundColor: pressed
                    ? SOFT_GOLD_BG
                    : theme.colors.surface,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                })}
              >
                <Ionicons name="add" size={17} color={HEAVENLY_GOLD} />

                <Text
                  style={{
                    color: HEAVENLY_GOLD,
                    fontSize: 12,
                    fontWeight: "900",
                    marginLeft: 4,
                  }}
                >
                  Create
                </Text>
              </Pressable>
            </View>

            {/* Hero */}
            <View
              style={{
                marginBottom: 16,
              }}
            >
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: -20,
                  right: -20,
                  width: 190,
                  height: 120,
                  borderRadius: 28,
                  backgroundColor: "rgba(217, 148, 0, 0.08)",
                }}
              />

              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: 34,
                  fontWeight: "900",
                  letterSpacing: -0.8,
                }}
              >
                Networks
              </Text>

              <Text
                style={{
                  color: theme.colors.muted,
                  fontSize: 15,
                  fontWeight: "700",
                  lineHeight: 22,
                  marginTop: 8,
                }}
              >
                Join Christian networks built around prayer, purpose,
                fellowship, mission, and shared interests.
              </Text>
            </View>

            <Pressable
              onPress={() =>
                navigation.navigate(
                  "MyNetworkInvitations"
                )
              }
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: theme.colors.surface,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: theme.colors.divider,
                padding: 14,
                marginBottom: 14,
                shadowColor: "#000",
                shadowOpacity: pressed ? 0.025 : 0.08,
                shadowRadius: pressed ? 3 : 9,
                shadowOffset: {
                  width: 0,
                  height: pressed ? 1 : 5,
                },
                elevation: pressed ? 1 : 4,
                transform: [
                  {
                    translateY: pressed ? 3 : 0,
                  },
                ],
              })}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: SOFT_GOLD_BG,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="mail-unread-outline"
                  size={23}
                  color={HEAVENLY_GOLD}
                />
              </View>

              <View
                style={{
                  flex: 1,
                  marginLeft: 12,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: 15,
                    fontWeight: "900",
                  }}
                >
                  My Network Invitations
                </Text>

                <Text
                  style={{
                    color: theme.colors.muted,
                    fontSize: 12,
                    fontWeight: "700",
                    lineHeight: 18,
                    marginTop: 3,
                  }}
                >
                  Review invitations and choose whether to
                  join.
                </Text>
              </View>

              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: SOFT_OLIVE_BG,
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
            </Pressable>

            {/* Search */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: theme.colors.surface,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: searchQuery.trim()
                  ? CARD_BORDER
                  : theme.colors.divider,
                paddingHorizontal: 14,
                paddingVertical: 10,
                marginBottom: 12,
              }}
            >
              <Ionicons
                name="search-outline"
                size={18}
                color={DEEP_OLIVE}
              />

              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search networks, topics, or keywords..."
                placeholderTextColor={theme.colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                style={{
                  flex: 1,
                  color: theme.colors.text,
                  fontWeight: "700",
                  marginLeft: 8,
                  paddingVertical: 0,
                }}
              />

              {searchQuery ? (
                <Pressable
                  onPress={() => setSearchQuery("")}
                  hitSlop={10}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.55 : 1,
                  })}
                >
                  <Ionicons
                    name="close-circle"
                    size={19}
                    color={theme.colors.muted}
                  />
                </Pressable>
              ) : (
                <Ionicons
                  name="options-outline"
                  size={18}
                  color={DEEP_OLIVE}
                />
              )}
            </View>

            {/* Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: 8,
                paddingRight: 16,
              }}
              style={{
                marginBottom: 18,
              }}
            >
              {DIRECTORY_TABS.map((label) => {
                const active = activeTab === label;

                return (
                  <Pressable
                    key={label}
                    onPress={() => handleTabChange(label)}
                    style={({ pressed }) => ({
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 999,
                      backgroundColor: active
                        ? DEEP_OLIVE
                        : theme.colors.surface,
                      borderWidth: 1,
                      borderColor: active
                        ? DEEP_OLIVE
                        : theme.colors.divider,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: active ? "#fff" : theme.colors.text2,
                        fontSize: 12,
                        fontWeight: "900",
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Categories */}
            <View
              style={{
                marginBottom: 18,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: 22,
                    fontWeight: "900",
                  }}
                >
                  Browse by Category
                </Text>

                {selectedCategory ? (
                  <Pressable
                    onPress={() => setSelectedCategory(null)}
                    hitSlop={8}
                  >
                    <Text
                      style={{
                        color: HEAVENLY_GOLD,
                        fontSize: 12,
                        fontWeight: "900",
                      }}
                    >
                      Clear
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                }}
              >
                {categories.map((category) => (
                  <CategoryChip
                    key={category}
                    label={category}
                    selected={selectedCategory === category}
                    onPress={() => handleCategoryPress(category)}
                  />
                ))}
              </View>
            </View>

            {/* Network list */}
            <View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
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
                      color: theme.colors.text,
                      fontSize: 22,
                      fontWeight: "900",
                    }}
                  >
                    {listTitle}
                  </Text>

                  {!loading && !loadError ? (
                    <Text
                      style={{
                        color: theme.colors.muted,
                        fontSize: 11.5,
                        fontWeight: "800",
                        marginTop: 3,
                      }}
                    >
                      {displayedNetworks.length === 1
                        ? "1 Network"
                        : `${displayedNetworks.length} Networks`}
                    </Text>
                  ) : null}
                </View>

                {showFilterClear ? (
                  <Pressable
                    onPress={clearFilters}
                    hitSlop={8}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Ionicons
                      name="close-outline"
                      size={17}
                      color={HEAVENLY_GOLD}
                    />

                    <Text
                      style={{
                        color: HEAVENLY_GOLD,
                        fontSize: 13,
                        fontWeight: "900",
                        marginLeft: 2,
                      }}
                    >
                      Clear
                    </Text>
                  </Pressable>
                ) : (
                  <Text
                    style={{
                      color: HEAVENLY_GOLD,
                      fontSize: 13,
                      fontWeight: "900",
                    }}
                  >
                    View all
                  </Text>
                )}
              </View>

              {loading ? (
                <LoadingState />
              ) : loadError ? (
                <EmptyState
                  icon="cloud-offline-outline"
                  title="Networks could not load"
                  message={loadError}
                  actionLabel="Try Again"
                  onAction={() => loadDirectory()}
                />
              ) : displayedNetworks.length === 0 ? (
                <EmptyState
                  icon={
                    activeTab === "My Networks"
                      ? "people-outline"
                      : "search-outline"
                  }
                  title={
                    activeTab === "My Networks" && !showFilterClear
                      ? "You have not joined a Network yet"
                      : "No Networks found"
                  }
                  message={
                    activeTab === "My Networks" && !showFilterClear
                      ? "Networks you join or request to join will appear here."
                      : "Try another search, category or directory tab."
                  }
                  actionLabel={showFilterClear ? "Clear Filters" : null}
                  onAction={showFilterClear ? clearFilters : null}
                />
              ) : (
                displayedNetworks.map((network) => {
                  const membership = getMembershipForNetwork(network);

                  return (
                    <NetworkListCard
                      key={network.id}
                      network={network}
                      membershipStatus={membership?.status || null}
                    />
                  );
                })
              )}
            </View>
          </ScrollView>


        </>
      )}
    </Screen>
  );
}