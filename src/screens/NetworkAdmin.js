// C:\triunely\src\screens\NetworkAdmin.js

import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";

import Screen from "../components/Screen";
import useCommercialAccountScope from "../hooks/useCommercialAccountScope";
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

function formatMemberCount(value) {
  const count = Number(value || 0);

  if (!Number.isFinite(count) || count <= 0) {
    return "No members";
  }

  if (count === 1) {
    return "1 member";
  }

  return `${count.toLocaleString()} members`;
}

function AdminToolCard({
  icon,
  title,
  description,
  badge,
  tone = "olive",
  onPress,
}) {
  const isGold = tone === "gold";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        ...premiumCardStyle,
        borderRadius: 21,
        borderColor: isGold ? GOLD_BORDER : OLIVE_BORDER,
        backgroundColor: pressed
          ? isGold
            ? "rgba(180, 83, 9, 0.07)"
            : "rgba(79, 99, 59, 0.07)"
          : SURFACE,
        padding: 15,
        marginBottom: 12,
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
            size={22}
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

            {badge ? (
              <View
                style={{
                  borderRadius: 999,
                  paddingVertical: 4,
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
                  {badge}
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

        <View
          style={{
            width: 31,
            height: 31,
            borderRadius: 16,
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
            size={18}
            color={isGold ? HEAVENLY_GOLD : DEEP_OLIVE}
          />
        </View>
      </View>
    </Pressable>
  );
}

export default function NetworkAdmin() {
  const navigation = useNavigation();
  const route = useRoute();

  const networkUuid =
    route.params?.networkUuid ||
    route.params?.networkId ||
    null;

  useCommercialAccountScope(
    "network",
    networkUuid
  );

  const [network, setNetwork] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [membership, setMembership] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadAdmin = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");

      if (!networkUuid) {
        throw new Error("No Network identity was provided.");
      }

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const userId = sessionData?.session?.user?.id || null;

      if (!userId) {
        throw new Error(
          "Please sign in again before opening Network Admin."
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
              short_description,
              category,
              member_count,
              owner_user_id,
              status,
              is_verified
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

      const { data: membershipData, error: membershipError } =
        await supabase
          .from("network_memberships")
          .select(
            "id, network_uuid, user_id, status, role"
          )
          .eq("network_uuid", networkData.id)
          .eq("user_id", userId)
          .maybeSingle();

      if (membershipError) {
        throw membershipError;
      }

      const isOwner =
        networkData.owner_user_id === userId ||
        (
          membershipData?.status === "joined" &&
          membershipData?.role === "owner"
        );

      const isAdmin =
        membershipData?.status === "joined" &&
        ["owner", "admin"].includes(
          String(membershipData?.role || "")
        );

      if (!isOwner && !isAdmin) {
        throw new Error(
          "You do not have permission to administer this Network."
        );
      }

      setNetwork(networkData);
      setMembership(membershipData || null);
    } catch (error) {
      console.log("Network Admin load error:", error);

      setLoadError(
        error?.message ||
          "Triunely could not open Network Admin."
      );
    } finally {
      setLoading(false);
    }
  }, [networkUuid]);

  useEffect(() => {
    loadAdmin();
  }, [loadAdmin]);

function showPlannedFeature(title) {
  console.log(`${title} will be connected in the next Network phase.`);
}

  if (loading) {
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
              Opening Network Admin
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
              Checking your Network permissions.
            </Text>
          </View>
        )}
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
                  backgroundColor: SOFT_GOLD_BG,
                  borderWidth: 1,
                  borderColor: GOLD_BORDER,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 15,
                }}
              >
                <Ionicons
                  name="lock-closed-outline"
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
                Network Admin unavailable
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
                  onPress={loadAdmin}
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

  const isOwner =
    network.owner_user_id === currentUserId ||
    (
      membership?.status === "joined" &&
      membership?.role === "owner"
    );

  const roleLabel = isOwner
    ? "Network Owner"
    : "Network Admin";

  return (
    <Screen
      backgroundColor={PREMIUM_CREAM}
      padded={false}
      style={{
        flex: 1,
      }}
    >
      {({ bottomPad }) => (
        <ScrollView
          showsVerticalScrollIndicator={false}
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
                Network Admin
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 12,
                  fontWeight: "800",
                  marginTop: 2,
                }}
              >
                Manage this Network independently from Church Admin
              </Text>
            </View>
          </View>

          <View
            style={{
              borderRadius: 25,
              backgroundColor: DEEP_OLIVE,
              padding: 18,
              marginBottom: 20,
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
                top: -105,
                right: -45,
                backgroundColor: "rgba(180, 83, 9, 0.26)",
              }}
            />

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 27,
                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.20)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 13,
                }}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={27}
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
                    fontFamily: displayFont,
                    color: SURFACE,
                    fontSize: 22,
                    fontWeight: "900",
                    lineHeight: 27,
                  }}
                >
                  {network.name}
                </Text>

                <Text
                  style={{
                    color: "rgba(255, 255, 255, 0.82)",
                    fontSize: 12,
                    fontWeight: "800",
                    marginTop: 4,
                  }}
                >
                  {roleLabel} · {formatMemberCount(network.member_count)}
                </Text>
              </View>
            </View>
          </View>

          <Text
            style={{
              ...serifHeading,
              fontSize: 21,
              lineHeight: 26,
              marginBottom: 4,
            }}
          >
            Manage Network
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
            Members, content, governance and growth controls will be
            managed here.
          </Text>

          <AdminToolCard
            icon="people-outline"
            title="Members and Requests"
            description="Review membership requests, view members and manage Network access."
            badge="Live"
            onPress={() =>
              navigation.navigate("NetworkMembersAdmin", {
                networkUuid: network.id,
              })
            }
          />

          <AdminToolCard
            icon="shield-checkmark-outline"
            title="Roles and Permissions"
            description={
              isOwner
                ? "Assign admins and moderators while protecting Network ownership."
                : "View Network leadership and manage authorised Moderator roles."
            }
            badge="Live"
            onPress={() =>
              navigation.navigate("NetworkRolesAdmin", {
                networkUuid: network.id,
              })
            }
          />

          <AdminToolCard
            icon="shield-half-outline"
            title="Ownership Recovery"
            description={
              isOwner
                ? "Monitor protected emergency ownership recovery cases and governance decisions."
                : "Request, review and monitor protected emergency ownership recovery."
            }
            badge="Live"
            tone="gold"
            onPress={() =>
              navigation.navigate(
                "NetworkOwnershipRecovery",
                {
                  networkUuid: network.id,
                }
              )
            }
          />

<AdminToolCard
  icon="megaphone-outline"
  title="Posts and Announcements"
  description="Create announcements and manage Network posts and discussions."
  tone="gold"
  badge="Live"
  onPress={() =>
    navigation.navigate("NetworkPostsAdmin", {
      networkUuid: network.id,
    })
  }
/>

          <AdminToolCard
            icon="calendar-outline"
            title="Events and Gatherings"
            description="Create Network events and manage authorised shared activity."
            tone="gold"
            onPress={() =>
              showPlannedFeature("Events and Gatherings")
            }
          />

          <AdminToolCard
            icon="document-text-outline"
            title="Rules and Safeguarding"
            description="Set Network standards, reporting information and moderation guidance."
            onPress={() =>
              showPlannedFeature("Rules and Safeguarding")
            }
          />

          <AdminToolCard
            icon="settings-outline"
            title="Network Settings"
            description="Manage public identity, access settings, visibility and Network information."
            onPress={() =>
              showPlannedFeature("Network Settings")
            }
          />

          <AdminToolCard
            icon="analytics-outline"
            title="Growth and Insights"
            description="Future verified tools for reach, engagement, membership and Network impact."
            badge="Verified"
            tone="gold"
            onPress={() =>
              showPlannedFeature("Growth and Insights")
            }
          />
        </ScrollView>
      )}
    </Screen>
  );
}