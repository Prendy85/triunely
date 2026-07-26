// C:\triunely\src\screens\MyNetworkInvitations.js

import { Ionicons } from "@expo/vector-icons";
import {
    useFocusEffect,
    useNavigation,
} from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
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
import { theme } from "../theme/theme";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const HEAVENLY_GOLD = "#D99400";
const EVENT_BROWN = "#7C2D12";
const DEEP_OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";
const DANGER = "#991B1B";

const SOFT_GOLD_BG = "rgba(217, 148, 0, 0.10)";
const GOLD_BORDER = "rgba(217, 148, 0, 0.18)";
const SOFT_OLIVE_BG = "rgba(79, 99, 59, 0.10)";
const OLIVE_BORDER = "rgba(79, 99, 59, 0.18)";
const SOFT_DANGER_BG = "rgba(153, 27, 27, 0.10)";
const DANGER_BORDER = "rgba(153, 27, 27, 0.18)";
const CARD_BORDER = "rgba(15, 23, 42, 0.08)";
const SHADOW = "rgba(15, 23, 42, 0.10)";
const MODAL_BACKDROP = "rgba(15, 23, 42, 0.62)";

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

function formatHandle(handle) {
  const cleaned = String(handle || "").trim();

  if (!cleaned) {
    return "";
  }

  return cleaned.startsWith("@")
    ? cleaned
    : `@${cleaned}`;
}

function formatDateTime(value) {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(value) {
  const words = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  if (words.length === 1) {
    return words[0].slice(0, 1).toUpperCase();
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function NetworkImage({ invitation }) {
  const imageUrl = invitation?.network_image_url;
  const networkName =
    invitation?.network_name || "Network";

  return (
    <View
      style={{
        width: 66,
        height: 66,
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: SOFT_GOLD_BG,
        borderWidth: 1,
        borderColor: GOLD_BORDER,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          resizeMode="cover"
          style={{
            width: "100%",
            height: "100%",
          }}
        />
      ) : (
        <Text
          style={{
            color: HEAVENLY_GOLD,
            fontSize: 20,
            fontWeight: "900",
          }}
        >
          {getInitials(networkName)}
        </Text>
      )}
    </View>
  );
}

function InviterAvatar({ invitation }) {
  const displayName =
    invitation?.invited_by_display_name ||
    formatHandle(invitation?.invited_by_handle) ||
    "Network Admin";

  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: DEEP_OLIVE,
        borderWidth: 2,
        borderColor: SURFACE,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: SURFACE,
          fontSize: 10,
          fontWeight: "900",
        }}
      >
        {getInitials(displayName)}
      </Text>
    </View>
  );
}

function InformationModal({
  visible,
  title,
  message,
  destructive = false,
  actionLabel = "Got it",
  onAction,
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
              : OLIVE_BORDER,
            padding: 22,
          }}
        >
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              alignSelf: "center",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: destructive
                ? SOFT_DANGER_BG
                : SOFT_OLIVE_BG,
              borderWidth: 1,
              borderColor: destructive
                ? DANGER_BORDER
                : OLIVE_BORDER,
            }}
          >
            <Ionicons
              name={
                destructive
                  ? "alert-circle-outline"
                  : "checkmark-circle-outline"
              }
              size={30}
              color={
                destructive
                  ? DANGER
                  : DEEP_OLIVE
              }
            />
          </View>

          <Text
            style={{
              ...serifHeading,
              fontSize: 22,
              lineHeight: 27,
              textAlign: "center",
              marginTop: 15,
            }}
          >
            {title}
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

          <Pressable
            onPress={onAction || onClose}
            style={({ pressed }) => ({
              minHeight: 48,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 20,
              backgroundColor: destructive
                ? pressed
                  ? "#7F1D1D"
                  : DANGER
                : pressed
                ? "#40512F"
                : DEEP_OLIVE,
            })}
          >
            <Text
              style={{
                color: SURFACE,
                fontSize: 14,
                fontWeight: "900",
              }}
            >
              {actionLabel}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function InvitationDecisionModal({
  visible,
  invitation,
  response,
  saving,
  bottomInset,
  onConfirm,
  onClose,
}) {
  if (!invitation || !response) {
    return null;
  }

  const isAccept = response === "accepted";

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
          onPress={(event) => event.stopPropagation()}
          style={{
            backgroundColor: PREMIUM_CREAM,
            borderTopLeftRadius: 29,
            borderTopRightRadius: 29,
            borderWidth: 1,
            borderColor: isAccept
              ? OLIVE_BORDER
              : DANGER_BORDER,
            paddingHorizontal: 18,
            paddingTop: 12,
            paddingBottom: Math.max(
              24,
              bottomInset + 18
            ),
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

          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              alignSelf: "center",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isAccept
                ? SOFT_OLIVE_BG
                : SOFT_DANGER_BG,
              borderWidth: 1,
              borderColor: isAccept
                ? OLIVE_BORDER
                : DANGER_BORDER,
            }}
          >
            <Ionicons
              name={
                isAccept
                  ? "checkmark-circle-outline"
                  : "close-circle-outline"
              }
              size={31}
              color={
                isAccept
                  ? DEEP_OLIVE
                  : DANGER
              }
            />
          </View>

          <Text
            style={{
              ...serifHeading,
              fontSize: 22,
              lineHeight: 27,
              textAlign: "center",
              marginTop: 14,
            }}
          >
            {isAccept
              ? "Accept Network invitation?"
              : "Decline Network invitation?"}
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
            {isAccept
              ? `You will become a joined member of ${invitation.network_name}.`
              : `The invitation from ${invitation.network_name} will be declined and removed from your pending invitations.`}
          </Text>

          <Pressable
            onPress={onConfirm}
            disabled={saving}
            style={({ pressed }) => ({
              minHeight: 49,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 20,
              opacity: saving ? 0.7 : 1,
              backgroundColor: isAccept
                ? pressed
                  ? "#40512F"
                  : DEEP_OLIVE
                : pressed
                ? "#7F1D1D"
                : DANGER,
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
                {isAccept
                  ? "Accept Invitation"
                  : "Decline Invitation"}
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
              marginTop: 10,
            })}
          >
            <Text
              style={{
                color: DEEP_OLIVE,
                fontSize: 14,
                fontWeight: "900",
              }}
            >
              Keep Invitation
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function InvitationCard({
  invitation,
  saving,
  onAccept,
  onDecline,
}) {
  const inviterName =
    invitation?.invited_by_display_name ||
    formatHandle(invitation?.invited_by_handle) ||
    "A Network Admin";

  return (
    <View
      style={{
        ...premiumCardStyle,
        borderWidth: 1.5,
        borderColor: OLIVE_BORDER,
        padding: 16,
        marginBottom: 14,
        shadowOpacity: 0.11,
        shadowRadius: 14,
        shadowOffset: {
          width: 0,
          height: 6,
        },
        elevation: 4,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
        }}
      >
        <NetworkImage invitation={invitation} />

        <View
          style={{
            flex: 1,
            minWidth: 0,
            marginLeft: 13,
          }}
        >
          <Text
            style={{
              color: TEXT,
              fontSize: 16,
              fontWeight: "900",
              lineHeight: 21,
            }}
            numberOfLines={2}
          >
            {invitation.network_name}
          </Text>

          <View
            style={{
              alignSelf: "flex-start",
              borderRadius: 999,
              backgroundColor: "rgba(79, 99, 59, 0.08)",
              borderWidth: 1,
              borderColor: OLIVE_BORDER,
              paddingVertical: 4,
              paddingHorizontal: 8,
              marginTop: 7,
            }}
          >
            <Text
              style={{
                color: DEEP_OLIVE,
                fontSize: 10.5,
                fontWeight: "900",
              }}
            >
              Network invitation
            </Text>
          </View>

          <Text
            style={{
              color: MUTED,
              fontSize: 11,
              fontWeight: "700",
              lineHeight: 16,
              marginTop: 7,
            }}
          >
            Expires {formatDateTime(invitation.expires_at)}
          </Text>
        </View>
      </View>

      {invitation?.network_description ? (
        <Text
          style={{
            color: MUTED,
            fontSize: 12.5,
            fontWeight: "700",
            lineHeight: 19,
            marginTop: 13,
          }}
          numberOfLines={3}
        >
          {invitation.network_description}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderRadius: 17,
          backgroundColor: SOFT_OLIVE_BG,
          borderWidth: 1,
          borderColor: OLIVE_BORDER,
          padding: 12,
          marginTop: 13,
        }}
      >
        <InviterAvatar invitation={invitation} />

        <View
          style={{
            flex: 1,
            marginLeft: 10,
          }}
        >
          <Text
            style={{
              color: MUTED,
              fontSize: 10.5,
              fontWeight: "800",
              textTransform: "uppercase",
              letterSpacing: 0.35,
            }}
          >
            Invited by
          </Text>

          <Text
            style={{
              color: TEXT,
              fontSize: 12.5,
              fontWeight: "900",
              marginTop: 2,
            }}
          >
            {inviterName}
          </Text>

          {invitation?.invited_by_handle ? (
            <Text
              style={{
                color: MUTED,
                fontSize: 11,
                fontWeight: "700",
                marginTop: 1,
              }}
            >
              {formatHandle(
                invitation.invited_by_handle
              )}
            </Text>
          ) : null}
        </View>
      </View>

      {invitation?.invitation_message ? (
        <View
          style={{
            borderRadius: 17,
            backgroundColor: PREMIUM_CREAM,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            padding: 13,
            marginTop: 12,
          }}
        >
          <Text
            style={{
              color: MUTED,
              fontSize: 10.5,
              fontWeight: "900",
              textTransform: "uppercase",
              letterSpacing: 0.4,
              marginBottom: 5,
            }}
          >
            Personal message
          </Text>

          <Text
            style={{
              color: TEXT,
              fontSize: 12.5,
              fontWeight: "700",
              lineHeight: 19,
            }}
          >
            {invitation.invitation_message}
          </Text>
        </View>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          gap: 10,
          marginTop: 15,
        }}
      >
        <Pressable
          onPress={() => onDecline(invitation)}
          disabled={saving}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 46,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: DANGER_BORDER,
            backgroundColor: pressed
              ? "rgba(153, 27, 27, 0.15)"
              : SOFT_DANGER_BG,
            alignItems: "center",
            justifyContent: "center",
            opacity: saving ? 0.6 : 1,
          })}
        >
          <Text
            style={{
              color: DANGER,
              fontSize: 13,
              fontWeight: "900",
            }}
          >
            Decline
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onAccept(invitation)}
          disabled={saving}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 46,
            borderRadius: 999,
            backgroundColor: pressed
              ? "#40512F"
              : DEEP_OLIVE,
            alignItems: "center",
            justifyContent: "center",
            opacity: saving ? 0.6 : 1,
          })}
        >
          <Text
            style={{
              color: SURFACE,
              fontSize: 13,
              fontWeight: "900",
            }}
          >
            Accept
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View
      style={{
        ...premiumCardStyle,
        paddingVertical: 30,
        paddingHorizontal: 20,
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
        }}
      >
        <Ionicons
          name="mail-open-outline"
          size={29}
          color={DEEP_OLIVE}
        />
      </View>

      <Text
        style={{
          ...serifHeading,
          fontSize: 20,
          lineHeight: 25,
          textAlign: "center",
          marginTop: 15,
        }}
      >
        No pending invitations
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
        Network invitations sent to your Triunely account
        will appear here.
      </Text>
    </View>
  );
}

export default function MyNetworkInvitations() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [loadError, setLoadError] = useState("");

  const [decision, setDecision] = useState(null);
  const [savingDecision, setSavingDecision] =
    useState(false);

  const [information, setInformation] =
    useState(null);

  const invitationCount = useMemo(
    () => invitations.length,
    [invitations]
  );

  const loadInvitations = useCallback(
    async ({ showLoader = true } = {}) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        setLoadError("");

        const {
          data: sessionData,
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        console.log(
          "MY NETWORK INVITATIONS AUTH USER:",
          sessionData?.session?.user?.id
        );

        const { data, error } = await supabase.rpc(
          "get_my_network_invitations_rpc"
        );


        if (error) {
          throw error;
        }

        setInvitations(
          Array.isArray(data) ? data : []
        );
      } catch (error) {
        console.log(
          "My Network invitations load error:",
          error
        );

        setLoadError(
          error?.message ||
            "Triunely could not load your Network invitations."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      loadInvitations();
    }, [loadInvitations])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);

    loadInvitations({
      showLoader: false,
    });
  }, [loadInvitations]);

  const openDecision = useCallback(
    (response, invitation) => {
      setDecision({
        response,
        invitation,
      });
    },
    []
  );

  const closeDecision = useCallback(() => {
    if (savingDecision) {
      return;
    }

    setDecision(null);
  }, [savingDecision]);

  const performDecision = useCallback(async () => {
    const invitation = decision?.invitation;
    const response = decision?.response;

    if (
      !invitation?.invitation_id ||
      !["accepted", "declined"].includes(response) ||
      savingDecision
    ) {
      return;
    }

    try {
      setSavingDecision(true);

      const { error } = await supabase.rpc(
        "respond_to_network_invitation_rpc",
        {
          p_invitation_id:
            invitation.invitation_id,
          p_response: response,
        }
      );

      if (error) {
        throw error;
      }

      setDecision(null);

      setInvitations((currentInvitations) =>
        currentInvitations.filter(
          (item) =>
            item.invitation_id !==
            invitation.invitation_id
        )
      );

      if (response === "accepted") {
        setInformation({
          title: "Invitation accepted",
          message: `You are now a member of ${invitation.network_name}.`,
          destructive: false,
          actionLabel: "Open Network",
          networkUuid: invitation.network_uuid,
        });
      } else {
        setInformation({
          title: "Invitation declined",
          message: `The invitation from ${invitation.network_name} has been declined.`,
          destructive: false,
          actionLabel: "Got it",
        });
      }
    } catch (error) {
      console.log(
        "Network invitation response error:",
        error
      );

      setDecision(null);

      setInformation({
        title: "Invitation could not be updated",
        message:
          error?.message ||
          "Triunely could not complete this invitation response.",
        destructive: true,
        actionLabel: "Got it",
      });
    } finally {
      setSavingDecision(false);
    }
  }, [decision, savingDecision]);

  const closeInformation = useCallback(() => {
    setInformation(null);
  }, []);

  const handleInformationAction =
    useCallback(async () => {
      const networkUuid =
        information?.networkUuid || null;

      setInformation(null);

      if (!networkUuid) {
        return;
      }

      try {
        const { data, error } = await supabase
          .from("networks")
          .select("id, slug")
          .eq("id", networkUuid)
          .maybeSingle();

        if (error) {
          throw error;
        }

        navigation.replace("NetworkDetail", {
          networkId: data?.slug || networkUuid,
          networkUuid,
          networkSlug: data?.slug || null,
          slug: data?.slug || null,
        });
      } catch (error) {
        console.log(
          "Open accepted Network error:",
          error
        );

        navigation.goBack();
      }
    }, [information?.networkUuid, navigation]);

  return (
    <Screen
      backgroundColor={theme.colors.bg}
      padded={false}
      style={{ flex: 1 }}
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
              paddingTop: 12,
              paddingBottom:
                bottomPad + insets.bottom + 24,
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

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 26,
                    lineHeight: 31,
                  }}
                >
                  My Invitations
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 12,
                    fontWeight: "800",
                    marginTop: 2,
                  }}
                >
                  Network invitations sent to you
                </Text>
              </View>
            </View>

            <View
              style={{
                borderRadius: 24,
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
                  top: -108,
                  right: -42,
                  backgroundColor:
                    "rgba(217, 148, 0, 0.25)",
                }}
              />

              <Ionicons
                name="mail-unread-outline"
                size={28}
                color={SURFACE}
              />

              <Text
                style={{
                  fontFamily: displayFont,
                  color: SURFACE,
                  fontSize: 22,
                  fontWeight: "900",
                  lineHeight: 27,
                  marginTop: 10,
                }}
              >
                Join by Invitation
              </Text>

              <Text
                style={{
                  color:
                    "rgba(255, 255, 255, 0.80)",
                  fontSize: 12.5,
                  fontWeight: "700",
                  lineHeight: 19,
                  marginTop: 5,
                }}
              >
                Review invitations from Network Owners and
                Admins before deciding whether to join.
              </Text>

              {!loading && !loadError ? (
                <View
                  style={{
                    alignSelf: "flex-start",
                    borderRadius: 999,
                    backgroundColor:
                      "rgba(255, 255, 255, 0.12)",
                    borderWidth: 1,
                    borderColor:
                      "rgba(255, 255, 255, 0.16)",
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    marginTop: 14,
                  }}
                >
                  <Text
                    style={{
                      color: SURFACE,
                      fontSize: 11,
                      fontWeight: "900",
                    }}
                  >
                    {invitationCount === 1
                      ? "1 pending invitation"
                      : `${invitationCount} pending invitations`}
                  </Text>
                </View>
              ) : null}
            </View>

            {loading ? (
              <View
                style={{
                  ...premiumCardStyle,
                  paddingVertical: 30,
                  alignItems: "center",
                }}
              >
                <ActivityIndicator
                  size="small"
                  color={HEAVENLY_GOLD}
                />

                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 19,
                    marginTop: 14,
                  }}
                >
                  Loading Invitations
                </Text>
              </View>
            ) : loadError ? (
              <View
                style={{
                  ...premiumCardStyle,
                  padding: 22,
                  alignItems: "center",
                  borderColor: DANGER_BORDER,
                }}
              >
                <Ionicons
                  name="cloud-offline-outline"
                  size={31}
                  color={DANGER}
                />

                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 20,
                    textAlign: "center",
                    marginTop: 12,
                  }}
                >
                  Invitations unavailable
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
                  {loadError}
                </Text>

                <Pressable
                  onPress={() => loadInvitations()}
                  style={({ pressed }) => ({
                    minHeight: 47,
                    borderRadius: 999,
                    backgroundColor: pressed
                      ? "#92400E"
                      : HEAVENLY_GOLD,
                    paddingHorizontal: 24,
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 18,
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
            ) : invitations.length === 0 ? (
              <EmptyState />
            ) : (
              invitations.map((invitation) => (
                <InvitationCard
                  key={invitation.invitation_id}
                  invitation={invitation}
                  saving={savingDecision}
                  onAccept={(selectedInvitation) =>
                    openDecision(
                      "accepted",
                      selectedInvitation
                    )
                  }
                  onDecline={(selectedInvitation) =>
                    openDecision(
                      "declined",
                      selectedInvitation
                    )
                  }
                />
              ))
            )}
          </ScrollView>

          <InvitationDecisionModal
            visible={Boolean(decision)}
            invitation={decision?.invitation}
            response={decision?.response}
            saving={savingDecision}
            bottomInset={insets.bottom}
            onConfirm={performDecision}
            onClose={closeDecision}
          />

          <InformationModal
            visible={Boolean(information)}
            title={information?.title || ""}
            message={information?.message || ""}
            destructive={
              information?.destructive === true
            }
            actionLabel={
              information?.actionLabel || "Got it"
            }
            onAction={
              information?.networkUuid
                ? handleInformationAction
                : closeInformation
            }
            onClose={closeInformation}
          />
        </>
      )}
    </Screen>
  );
}