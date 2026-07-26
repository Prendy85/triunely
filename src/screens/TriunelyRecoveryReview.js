// C:\triunely\src\screens\TriunelyRecoveryReview.js

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
    useCallback,
    useMemo,
    useState,
} from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
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
const MODAL_BACKDROP = "rgba(15, 23, 42, 0.60)";

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

function formatDateTime(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDisplayName(profile, fallback) {
  return (
    profile?.display_name ||
    profile?.handle ||
    fallback
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
              : OLIVE_BORDER,
            padding: 22,
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
                destructive ? DANGER : DEEP_OLIVE
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
            onPress={onClose}
            style={({ pressed }) => ({
              minHeight: 48,
              borderRadius: 999,
              backgroundColor: destructive
                ? pressed
                  ? "#7F1D1D"
                  : DANGER
                : pressed
                ? "#3F512F"
                : DEEP_OLIVE,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 20,
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

function ReviewDecisionModal({
  visible,
  decision,
  note,
  saving,
  bottomInset,
  onChangeNote,
  onConfirm,
  onClose,
}) {
  const isReject = decision === "rejected";
  const canSubmit =
    note.trim().length >= 10 && !saving;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={saving ? undefined : onClose}
    >
      <KeyboardAvoidingView
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
        keyboardVerticalOffset={0}
        style={{
          flex: 1,
          justifyContent: "flex-end",
        }}
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
              borderColor: isReject
                ? DANGER_BORDER
                : OLIVE_BORDER,
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
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 29,
                alignItems: "center",
                justifyContent: "center",
                alignSelf: "center",
                backgroundColor: isReject
                  ? SOFT_DANGER_BG
                  : SOFT_OLIVE_BG,
                borderWidth: 1,
                borderColor: isReject
                  ? DANGER_BORDER
                  : OLIVE_BORDER,
              }}
            >
              <Ionicons
                name={
                  isReject
                    ? "close-circle-outline"
                    : "shield-checkmark-outline"
                }
                size={29}
                color={isReject ? DANGER : DEEP_OLIVE}
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
              {isReject
                ? "Reject recovery case?"
                : "Approve recovery case?"}
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 13.5,
                fontWeight: "700",
                lineHeight: 20,
                textAlign: "center",
                marginTop: 7,
              }}
            >
              Your decision and review note will be
              permanently recorded in the Network governance
              audit history.
            </Text>

            <Text
              style={{
                color: TEXT,
                fontSize: 13,
                fontWeight: "900",
                marginTop: 18,
                marginBottom: 7,
              }}
            >
              Platform review note
            </Text>

            <TextInput
              value={note}
              onChangeText={onChangeNote}
              multiline
              maxLength={1800}
              textAlignVertical="top"
              placeholder={
                isReject
                  ? "Explain why Triunely is rejecting this recovery case."
                  : "Record the evidence and governance basis for platform approval."
              }
              placeholderTextColor="rgba(107, 114, 128, 0.72)"
              style={{
                minHeight: 140,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: isReject
                  ? DANGER_BORDER
                  : OLIVE_BORDER,
                backgroundColor: SURFACE,
                color: TEXT,
                fontSize: 13.5,
                fontWeight: "700",
                lineHeight: 20,
                paddingHorizontal: 14,
                paddingVertical: 13,
              }}
            />

            <Text
              style={{
                color: MUTED,
                fontSize: 10.5,
                fontWeight: "700",
                textAlign: "right",
                marginTop: 5,
              }}
            >
              {note.length}/1800
            </Text>

            <Pressable
              onPress={onConfirm}
              disabled={!canSubmit}
              style={({ pressed }) => ({
                minHeight: 49,
                borderRadius: 999,
                backgroundColor: !canSubmit
                  ? "rgba(107, 114, 128, 0.18)"
                  : isReject
                  ? pressed
                    ? "#7F1D1D"
                    : DANGER
                  : pressed
                  ? "#3F512F"
                  : DEEP_OLIVE,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 17,
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
                    color: canSubmit
                      ? SURFACE
                      : MUTED,
                    fontSize: 14,
                    fontWeight: "900",
                  }}
                >
                  {isReject
                    ? "Confirm Platform Rejection"
                    : "Confirm Platform Approval"}
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
                Go Back
              </Text>
            </Pressable>
          </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PersonRow({
  label,
  name,
  icon = "person-outline",
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 9,
      }}
    >
      <View
        style={{
          width: 35,
          height: 35,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: SOFT_OLIVE_BG,
          borderWidth: 1,
          borderColor: OLIVE_BORDER,
          marginRight: 10,
        }}
      >
        <Ionicons
          name={icon}
          size={17}
          color={DEEP_OLIVE}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: MUTED,
            fontSize: 10,
            fontWeight: "900",
            letterSpacing: 0.4,
          }}
        >
          {label}
        </Text>

        <Text
          style={{
            color: TEXT,
            fontSize: 13.5,
            fontWeight: "900",
            marginTop: 2,
          }}
        >
          {name}
        </Text>
      </View>
    </View>
  );
}

export default function TriunelyRecoveryReview() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [currentUserId, setCurrentUserId] =
    useState(null);

  const [isReviewer, setIsReviewer] =
    useState(false);

  const [cases, setCases] = useState([]);
  const [networksById, setNetworksById] =
    useState({});

  const [profilesById, setProfilesById] =
    useState({});

  const [approvalsByRequestId, setApprovalsByRequestId] =
    useState({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [loadError, setLoadError] = useState("");

  const [selectedCase, setSelectedCase] =
    useState(null);

  const [decision, setDecision] = useState(null);
  const [reviewNote, setReviewNote] =
    useState("");

  const [saving, setSaving] = useState(false);
  const [information, setInformation] =
    useState(null);

  const loadCases = useCallback(
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

        const userId =
          sessionData?.session?.user?.id || null;

        if (!userId) {
          throw new Error(
            "Please sign in again before opening Platform Review."
          );
        }

        setCurrentUserId(userId);

        const {
          data: reviewerData,
          error: reviewerError,
        } = await supabase.rpc(
          "is_triunely_platform_reviewer",
          {
            p_user_id: userId,
          }
        );

        if (reviewerError) {
          throw reviewerError;
        }

        const reviewerAllowed =
          reviewerData === true;

        setIsReviewer(reviewerAllowed);

        if (!reviewerAllowed) {
          throw new Error(
            "This account is not authorised to review Triunely recovery cases."
          );
        }

        const {
          data: requestData,
          error: requestError,
        } = await supabase
          .from(
            "network_ownership_recovery_requests"
          )
          .select("*")
          .eq("status", "awaiting_review")
          .eq("platform_review_status", "pending")
          .order("created_at", {
            ascending: true,
          });

        if (requestError) {
          throw requestError;
        }

        const loadedCases = requestData || [];

        const networkIds = [
          ...new Set(
            loadedCases
              .map((item) => item.network_uuid)
              .filter(Boolean)
          ),
        ];

        const profileIds = [
          ...new Set(
            loadedCases
              .flatMap((item) => [
                item.requested_by_user_id,
                item.proposed_new_owner_user_id,
              ])
              .filter(Boolean)
          ),
        ];

        let networkMap = {};
        let profileMap = {};
        let approvalMap = {};

        if (networkIds.length > 0) {
          const {
            data: networkData,
            error: networkError,
          } = await supabase
            .from("networks")
            .select(
              "id, name, owner_user_id, designated_successor_user_id"
            )
            .in("id", networkIds);

          if (networkError) {
            throw networkError;
          }

          networkMap = Object.fromEntries(
            (networkData || []).map((network) => [
              network.id,
              network,
            ])
          );

          const ownerIds = (networkData || [])
            .map((network) => network.owner_user_id)
            .filter(Boolean);

          profileIds.push(...ownerIds);
        }

        if (loadedCases.length > 0) {
          const requestIds = loadedCases.map(
            (item) => item.id
          );

          const {
            data: approvalData,
            error: approvalError,
          } = await supabase
            .from(
              "network_ownership_recovery_approvals"
            )
            .select("*")
            .in("recovery_request_id", requestIds)
            .order("created_at", {
              ascending: true,
            });

          if (approvalError) {
            throw approvalError;
          }

          approvalMap = (approvalData || []).reduce(
            (result, approval) => {
              const requestId =
                approval.recovery_request_id;

              result[requestId] = [
                ...(result[requestId] || []),
                approval,
              ];

              return result;
            },
            {}
          );

          profileIds.push(
            ...(approvalData || [])
              .map(
                (approval) =>
                  approval.approved_by_user_id
              )
              .filter(Boolean)
          );
        }

        const uniqueProfileIds = [
          ...new Set(profileIds.filter(Boolean)),
        ];

        if (uniqueProfileIds.length > 0) {
          const {
            data: profileData,
            error: profileError,
          } = await supabase
            .from("profiles")
            .select(
              "id, display_name, handle, avatar_url"
            )
            .in("id", uniqueProfileIds);

          if (profileError) {
            throw profileError;
          }

          profileMap = Object.fromEntries(
            (profileData || []).map((profile) => [
              profile.id,
              profile,
            ])
          );
        }

        setCases(loadedCases);
        setNetworksById(networkMap);
        setProfilesById(profileMap);
        setApprovalsByRequestId(approvalMap);
      } catch (error) {
        console.log(
          "Triunely recovery review load error:",
          error
        );

        setLoadError(
          error?.message ||
            "Triunely could not load recovery cases."
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
      loadCases();

      return undefined;
    }, [loadCases])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);

    loadCases({
      showLoader: false,
    });
  }, [loadCases]);

  const openReview = useCallback(
    (recoveryCase, nextDecision) => {
      setSelectedCase(recoveryCase);
      setDecision(nextDecision);
      setReviewNote("");
    },
    []
  );

  const closeReview = useCallback(() => {
    if (saving) {
      return;
    }

    setSelectedCase(null);
    setDecision(null);
    setReviewNote("");
  }, [saving]);

  const submitReview = useCallback(async () => {
    if (
      !selectedCase?.id ||
      !decision ||
      reviewNote.trim().length < 10 ||
      saving
    ) {
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.rpc(
        "review_network_ownership_recovery_rpc",
        {
          p_recovery_request_id:
            selectedCase.id,
          p_decision: decision,
          p_review_note: reviewNote.trim(),
        }
      );

      if (error) {
        throw error;
      }

      const completedDecision = decision;

      closeReview();

      await loadCases({
        showLoader: false,
      });

      setInformation({
        title:
          completedDecision === "approved"
            ? "Platform approval recorded"
            : "Recovery case rejected",
        message:
          completedDecision === "approved"
            ? "Triunely platform approval has been recorded. The proposed Owner must still wait until the protection period ends before completing recovery."
            : "The recovery case has been rejected and closed.",
        destructive:
          completedDecision === "rejected",
      });
    } catch (error) {
      console.log(
        "Triunely recovery review decision error:",
        error
      );

      setInformation({
        title: "Review could not be recorded",
        message:
          error?.message ||
          "Triunely could not record this platform decision.",
        destructive: true,
      });
    } finally {
      setSaving(false);
    }
  }, [
    closeReview,
    decision,
    loadCases,
    reviewNote,
    saving,
    selectedCase?.id,
  ]);

  const pendingCount = cases.length;

  const caseCards = useMemo(
    () =>
      cases.map((recoveryCase) => {
        const network =
          networksById[recoveryCase.network_uuid];

        const currentOwner =
          profilesById[network?.owner_user_id];

        const requester =
          profilesById[
            recoveryCase.requested_by_user_id
          ];

        const proposedOwner =
          profilesById[
            recoveryCase.proposed_new_owner_user_id
          ];

        const approvals =
          approvalsByRequestId[recoveryCase.id] ||
          [];

        const reviewerHasConflict = [
          network?.owner_user_id,
          recoveryCase.requested_by_user_id,
          recoveryCase.proposed_new_owner_user_id,
        ]
          .filter(Boolean)
          .includes(currentUserId);

        return {
          recoveryCase,
          network,
          currentOwner,
          requester,
          proposedOwner,
          approvals,
          reviewerHasConflict,
        };
      }),
    [
      approvalsByRequestId,
      cases,
      currentUserId,
      networksById,
      profilesById,
    ]
  );

  if (loading) {
    return (
      <Screen
        backgroundColor={PREMIUM_CREAM}
        padded={false}
        style={{ flex: 1 }}
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
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: SOFT_GOLD_BG,
                borderWidth: 1,
                borderColor: GOLD_BORDER,
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
                textAlign: "center",
                marginTop: 16,
              }}
            >
              Loading Platform Review
            </Text>
          </View>
        )}
      </Screen>
    );
  }

  if (loadError || !isReviewer) {
    return (
      <Screen
        backgroundColor={PREMIUM_CREAM}
        padded={false}
        style={{ flex: 1 }}
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
                padding: 22,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: 31,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: SOFT_DANGER_BG,
                  borderWidth: 1,
                  borderColor: DANGER_BORDER,
                }}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={29}
                  color={DANGER}
                />
              </View>

              <Text
                style={{
                  ...serifHeading,
                  fontSize: 22,
                  textAlign: "center",
                  marginTop: 15,
                }}
              >
                Platform Review unavailable
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

              <Pressable
                onPress={() => navigation.goBack()}
                style={({ pressed }) => ({
                  width: "100%",
                  minHeight: 48,
                  borderRadius: 999,
                  backgroundColor: pressed
                    ? "#3F512F"
                    : DEEP_OLIVE,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 18,
                })}
              >
                <Text
                  style={{
                    color: SURFACE,
                    fontSize: 14,
                    fontWeight: "900",
                  }}
                >
                  Go Back
                </Text>
              </Pressable>
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

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 26,
                    lineHeight: 31,
                  }}
                >
                  Platform Review
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 12,
                    fontWeight: "800",
                    marginTop: 2,
                  }}
                >
                  Independent Network recovery governance
                </Text>
              </View>
            </View>

            <View
              style={{
                borderRadius: 25,
                backgroundColor: DEEP_OLIVE,
                padding: 18,
                marginBottom: 19,
                overflow: "hidden",
              }}
            >
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  width: 185,
                  height: 185,
                  borderRadius: 93,
                  top: -108,
                  right: -45,
                  backgroundColor:
                    "rgba(180, 83, 9, 0.26)",
                }}
              />

              <Ionicons
                name="shield-checkmark-outline"
                size={30}
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
                Triunely Recovery Authority
              </Text>

              <Text
                style={{
                  color:
                    "rgba(255, 255, 255, 0.82)",
                  fontSize: 12,
                  fontWeight: "700",
                  lineHeight: 18,
                  marginTop: 4,
                }}
              >
                Review evidence independently. Never approve
                a case where identity, authority, availability
                or Admin consensus remains unclear.
              </Text>

              <View
                style={{
                  alignSelf: "flex-start",
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 999,
                  backgroundColor:
                    "rgba(255, 255, 255, 0.12)",
                  borderWidth: 1,
                  borderColor:
                    "rgba(255, 255, 255, 0.20)",
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
                  {pendingCount} pending{" "}
                  {pendingCount === 1
                    ? "case"
                    : "cases"}
                </Text>
              </View>
            </View>

            {caseCards.length === 0 ? (
              <View
                style={{
                  ...premiumCardStyle,
                  padding: 20,
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 29,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: SOFT_OLIVE_BG,
                    borderWidth: 1,
                    borderColor: OLIVE_BORDER,
                  }}
                >
                  <Ionicons
                    name="checkmark-done-outline"
                    size={28}
                    color={DEEP_OLIVE}
                  />
                </View>

                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 20,
                    lineHeight: 25,
                    textAlign: "center",
                    marginTop: 14,
                  }}
                >
                  No cases awaiting review
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 13,
                    fontWeight: "700",
                    lineHeight: 19,
                    textAlign: "center",
                    marginTop: 6,
                  }}
                >
                  New Network ownership recovery cases will
                  appear here after completing their required
                  Network-side approval stage.
                </Text>
              </View>
            ) : (
              caseCards.map(
                ({
                  recoveryCase,
                  network,
                  currentOwner,
                  requester,
                  proposedOwner,
                  approvals,
                  reviewerHasConflict,
                }) => (
                  <View
                    key={recoveryCase.id}
                    style={{
                      ...premiumCardStyle,
                      padding: 17,
                      borderColor: reviewerHasConflict
                        ? DANGER_BORDER
                        : GOLD_BORDER,
                      marginBottom: 14,
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
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor:
                            reviewerHasConflict
                              ? SOFT_DANGER_BG
                              : SOFT_GOLD_BG,
                          borderWidth: 1,
                          borderColor:
                            reviewerHasConflict
                              ? DANGER_BORDER
                              : GOLD_BORDER,
                          marginRight: 11,
                        }}
                      >
                        <Ionicons
                          name={
                            reviewerHasConflict
                              ? "warning-outline"
                              : "shield-half-outline"
                          }
                          size={23}
                          color={
                            reviewerHasConflict
                              ? DANGER
                              : HEAVENLY_GOLD
                          }
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            ...serifHeading,
                            fontSize: 19,
                            lineHeight: 24,
                          }}
                        >
                          {network?.name ||
                            "Network Recovery Case"}
                        </Text>

                        <Text
                          style={{
                            color: MUTED,
                            fontSize: 11.5,
                            fontWeight: "800",
                            marginTop: 3,
                          }}
                        >
                          Opened{" "}
                          {formatDateTime(
                            recoveryCase.created_at
                          )}
                        </Text>
                      </View>
                    </View>

                    {reviewerHasConflict ? (
                      <View
                        style={{
                          padding: 12,
                          borderRadius: 16,
                          backgroundColor:
                            SOFT_DANGER_BG,
                          borderWidth: 1,
                          borderColor: DANGER_BORDER,
                          marginTop: 13,
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
                          Conflict detected. You are the
                          current Owner, requester or proposed
                          Owner and cannot review this case.
                        </Text>
                      </View>
                    ) : null}

                    <View
                      style={{
                        borderRadius: 17,
                        backgroundColor:
                          PREMIUM_CREAM,
                        borderWidth: 1,
                        borderColor: CARD_BORDER,
                        paddingHorizontal: 12,
                        marginTop: 14,
                      }}
                    >
                      <PersonRow
                        label="CURRENT OWNER"
                        name={getDisplayName(
                          currentOwner,
                          "Current Network Owner"
                        )}
                        icon="key-outline"
                      />

                      <PersonRow
                        label="REQUESTED BY"
                        name={getDisplayName(
                          requester,
                          "Requesting Admin"
                        )}
                      />

                      <PersonRow
                        label="PROPOSED NEW OWNER"
                        name={getDisplayName(
                          proposedOwner,
                          "Proposed Owner"
                        )}
                        icon="person-add-outline"
                      />
                    </View>

                    <Text
                      style={{
                        color: TEXT,
                        fontSize: 12,
                        fontWeight: "900",
                        marginTop: 15,
                      }}
                    >
                      Recovery reason
                    </Text>

                    <Text
                      style={{
                        color: MUTED,
                        fontSize: 12.5,
                        fontWeight: "700",
                        lineHeight: 19,
                        marginTop: 5,
                      }}
                    >
                      {recoveryCase.reason}
                    </Text>

                    {recoveryCase.evidence_notes ? (
                      <>
                        <Text
                          style={{
                            color: TEXT,
                            fontSize: 12,
                            fontWeight: "900",
                            marginTop: 14,
                          }}
                        >
                          Supporting evidence
                        </Text>

                        <Text
                          style={{
                            color: MUTED,
                            fontSize: 12.5,
                            fontWeight: "700",
                            lineHeight: 19,
                            marginTop: 5,
                          }}
                        >
                          {
                            recoveryCase.evidence_notes
                          }
                        </Text>
                      </>
                    ) : null}

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
                          padding: 12,
                          borderRadius: 16,
                          backgroundColor:
                            SOFT_OLIVE_BG,
                          borderWidth: 1,
                          borderColor: OLIVE_BORDER,
                        }}
                      >
                        <Text
                          style={{
                            color: DEEP_OLIVE,
                            fontSize: 20,
                            fontWeight: "900",
                          }}
                        >
                          {
                            recoveryCase.approval_count
                          }
                        </Text>

                        <Text
                          style={{
                            color: MUTED,
                            fontSize: 10,
                            fontWeight: "800",
                            marginTop: 2,
                          }}
                        >
                          Admin approvals
                        </Text>
                      </View>

                      <View
                        style={{
                          flex: 1,
                          padding: 12,
                          borderRadius: 16,
                          backgroundColor:
                            SOFT_GOLD_BG,
                          borderWidth: 1,
                          borderColor: GOLD_BORDER,
                        }}
                      >
                        <Text
                          style={{
                            color: EVENT_BROWN,
                            fontSize: 20,
                            fontWeight: "900",
                          }}
                        >
                          {
                            recoveryCase.required_admin_approvals
                          }
                        </Text>

                        <Text
                          style={{
                            color: MUTED,
                            fontSize: 10,
                            fontWeight: "800",
                            marginTop: 2,
                          }}
                        >
                          Required
                        </Text>
                      </View>
                    </View>

                    {approvals.length > 0 ? (
                      <View
                        style={{
                          marginTop: 12,
                          padding: 12,
                          borderRadius: 16,
                          backgroundColor:
                            PREMIUM_CREAM,
                          borderWidth: 1,
                          borderColor: CARD_BORDER,
                        }}
                      >
                        <Text
                          style={{
                            color: TEXT,
                            fontSize: 11,
                            fontWeight: "900",
                            marginBottom: 7,
                          }}
                        >
                          Recorded Admin decisions
                        </Text>

                        {approvals.map(
                          (approval) => {
                            const approver =
                              profilesById[
                                approval
                                  .approved_by_user_id
                              ];

                            return (
                              <View
                                key={approval.id}
                                style={{
                                  paddingVertical: 6,
                                }}
                              >
                                <Text
                                  style={{
                                    color:
                                      approval.decision ===
                                      "approved"
                                        ? DEEP_OLIVE
                                        : DANGER,
                                    fontSize: 12,
                                    fontWeight: "900",
                                  }}
                                >
                                  {getDisplayName(
                                    approver,
                                    "Network Admin"
                                  )}{" "}
                                  {approval.decision}
                                </Text>

                                {approval.decision_note ? (
                                  <Text
                                    style={{
                                      color: MUTED,
                                      fontSize: 11.5,
                                      fontWeight: "700",
                                      lineHeight: 17,
                                      marginTop: 3,
                                    }}
                                  >
                                    {
                                      approval.decision_note
                                    }
                                  </Text>
                                ) : null}
                              </View>
                            );
                          }
                        )}
                      </View>
                    ) : null}

                    <View
                      style={{
                        padding: 12,
                        borderRadius: 16,
                        backgroundColor:
                          SOFT_GOLD_BG,
                        borderWidth: 1,
                        borderColor: GOLD_BORDER,
                        marginTop: 13,
                      }}
                    >
                      <Text
                        style={{
                          color: EVENT_BROWN,
                          fontSize: 10.5,
                          fontWeight: "900",
                        }}
                      >
                        PROTECTION PERIOD ENDS
                      </Text>

                      <Text
                        style={{
                          color: TEXT,
                          fontSize: 13,
                          fontWeight: "900",
                          marginTop: 4,
                        }}
                      >
                        {formatDateTime(
                          recoveryCase.review_available_at
                        )}
                      </Text>
                    </View>

                    {!reviewerHasConflict ? (
                      <View
                        style={{
                          flexDirection: "row",
                          gap: 10,
                          marginTop: 15,
                        }}
                      >
                        <Pressable
                          onPress={() =>
                            openReview(
                              recoveryCase,
                              "approved"
                            )
                          }
                          style={({ pressed }) => ({
                            flex: 1,
                            minHeight: 48,
                            borderRadius: 999,
                            backgroundColor: pressed
                              ? "#3F512F"
                              : DEEP_OLIVE,
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
                            Approve
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() =>
                            openReview(
                              recoveryCase,
                              "rejected"
                            )
                          }
                          style={({ pressed }) => ({
                            flex: 1,
                            minHeight: 48,
                            borderRadius: 999,
                            backgroundColor: pressed
                              ? "#7F1D1D"
                              : DANGER,
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
                            Reject
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                )
              )
            )}
          </ScrollView>

          <ReviewDecisionModal
            visible={Boolean(selectedCase && decision)}
            decision={decision}
            note={reviewNote}
            saving={saving}
            bottomInset={insets.bottom}
            onChangeNote={setReviewNote}
            onConfirm={submitReview}
            onClose={closeReview}
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