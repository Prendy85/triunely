// C:\triunely\src\screens\NetworkOwnershipRecovery.js

import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
    useCallback,
    useEffect,
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
const MODAL_BACKDROP = "rgba(15, 23, 42, 0.58)";

const displayFont =
  Platform.OS === "ios" ? "Georgia" : "serif";

const serifHeading = {
  fontFamily: displayFont,
  color: TEXT,
  fontWeight: "900",
  letterSpacing: -0.4,
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

const ACTIVE_STATUSES = [
  "pending",
  "awaiting_approvals",
  "awaiting_review",
  "approved",
];

const STATUS_DETAILS = {
  pending: {
    label: "Pending",
    icon: "time-outline",
    tone: "gold",
    description:
      "The recovery request has been opened and is awaiting its next governance step.",
  },
  awaiting_approvals: {
    label: "Awaiting Admin Approvals",
    icon: "people-outline",
    tone: "gold",
    description:
      "Eligible Network Admins must review this request before platform review.",
  },
  awaiting_review: {
    label: "Awaiting Platform Review",
    icon: "shield-checkmark-outline",
    tone: "olive",
    description:
      "The Network-side approval stage is complete. Triunely platform review is required.",
  },
  approved: {
    label: "Approved",
    icon: "checkmark-circle-outline",
    tone: "olive",
    description:
      "The case has been approved and is awaiting completion.",
  },
  rejected: {
    label: "Rejected",
    icon: "close-circle-outline",
    tone: "danger",
    description:
      "The ownership recovery request has been rejected.",
  },
  cancelled: {
    label: "Cancelled",
    icon: "ban-outline",
    tone: "danger",
    description:
      "The ownership recovery request was cancelled.",
  },
  expired: {
    label: "Expired",
    icon: "hourglass-outline",
    tone: "danger",
    description:
      "The ownership recovery request expired before completion.",
  },
  completed: {
    label: "Completed",
    icon: "checkmark-done-circle-outline",
    tone: "olive",
    description:
      "Emergency ownership recovery has been completed.",
  },
};

function getStatusDetails(status) {
  return (
    STATUS_DETAILS[String(status || "").toLowerCase()] ||
    STATUS_DETAILS.pending
  );
}

function formatDateTime(value) {
  if (!value) {
    return "Not available";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Not available";
  }

  return parsed.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRemainingTime(value) {
  if (!value) {
    return "";
  }

  const target = new Date(value).getTime();

  if (!Number.isFinite(target)) {
    return "";
  }

  const difference = target - Date.now();

  if (difference <= 0) {
    return "Protection period complete";
  }

  const totalHours = Math.ceil(
    difference / (1000 * 60 * 60)
  );

  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0 && hours > 0) {
    return `${days}d ${hours}h remaining`;
  }

  if (days > 0) {
    return `${days} day${days === 1 ? "" : "s"} remaining`;
  }

  return `${hours} hour${hours === 1 ? "" : "s"} remaining`;
}

function StatusBadge({ status }) {
  const details = getStatusDetails(status);
  const isDanger = details.tone === "danger";
  const isGold = details.tone === "gold";

  return (
    <View
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
        paddingHorizontal: 9,
        borderRadius: 999,
        backgroundColor: isDanger
          ? SOFT_DANGER_BG
          : isGold
          ? SOFT_GOLD_BG
          : SOFT_OLIVE_BG,
        borderWidth: 1,
        borderColor: isDanger
          ? DANGER_BORDER
          : isGold
          ? GOLD_BORDER
          : OLIVE_BORDER,
      }}
    >
      <Ionicons
        name={details.icon}
        size={13}
        color={
          isDanger
            ? DANGER
            : isGold
            ? HEAVENLY_GOLD
            : DEEP_OLIVE
        }
      />

      <Text
        style={{
          color: isDanger
            ? DANGER
            : isGold
            ? EVENT_BROWN
            : DEEP_OLIVE,
          fontSize: 10.5,
          fontWeight: "900",
          marginLeft: 5,
        }}
      >
        {details.label}
      </Text>
    </View>
  );
}

function PlatformStatusBadge({ status }) {
  const normalizedStatus = String(
    status || "pending"
  ).toLowerCase();

  const isApproved = normalizedStatus === "approved";
  const isRejected = normalizedStatus === "rejected";

  return (
    <View
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
        paddingHorizontal: 9,
        borderRadius: 999,
        backgroundColor: isRejected
          ? SOFT_DANGER_BG
          : isApproved
          ? SOFT_OLIVE_BG
          : SOFT_GOLD_BG,
        borderWidth: 1,
        borderColor: isRejected
          ? DANGER_BORDER
          : isApproved
          ? OLIVE_BORDER
          : GOLD_BORDER,
      }}
    >
      <Ionicons
        name={
          isRejected
            ? "close-circle-outline"
            : isApproved
            ? "checkmark-circle-outline"
            : "time-outline"
        }
        size={13}
        color={
          isRejected
            ? DANGER
            : isApproved
            ? DEEP_OLIVE
            : HEAVENLY_GOLD
        }
      />

      <Text
        style={{
          color: isRejected
            ? DANGER
            : isApproved
            ? DEEP_OLIVE
            : EVENT_BROWN,
          fontSize: 10.5,
          fontWeight: "900",
          marginLeft: 5,
        }}
      >
        {isRejected
          ? "Platform Rejected"
          : isApproved
          ? "Platform Approved"
          : "Platform Review Pending"}
      </Text>
    </View>
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
                destructive ? DANGER : HEAVENLY_GOLD
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

function RecoveryRequestModal({
  visible,
  reason,
  evidenceNotes,
  saving,
  bottomInset = 0,
  onChangeReason,
  onChangeEvidenceNotes,
  onSubmit,
  onClose,
}) {
  const canSubmit =
    reason.trim().length >= 20 && !saving;

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
              borderColor: DANGER_BORDER,
              paddingHorizontal: 18,
              paddingTop: 12,
              paddingBottom: Math.max(
                25,
                bottomInset + 18
              ),
              maxHeight: "92%",
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
              marginBottom: 16,
            }}
          />

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
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
                  name="shield-half-outline"
                  size={23}
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
                  Request Ownership Recovery
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
                  Use only when the current Owner is genuinely
                  unavailable or unable to administer the Network.
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
                marginBottom: 16,
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
                This begins a formal seven-day recovery
                process. Other Admin approval and independent
                Triunely platform approval may be required.
              </Text>
            </View>

            <Text
              style={{
                color: TEXT,
                fontSize: 13,
                fontWeight: "900",
                marginBottom: 7,
              }}
            >
              Why is recovery required?
            </Text>

            <TextInput
              value={reason}
              onChangeText={onChangeReason}
              placeholder="Explain clearly why the current Owner cannot continue administering this Network."
              placeholderTextColor="rgba(107, 114, 128, 0.74)"
              multiline
              maxLength={1200}
              textAlignVertical="top"
              style={{
                minHeight: 132,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: CARD_BORDER,
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
              {reason.length}/1200
            </Text>

            <Text
              style={{
                color: TEXT,
                fontSize: 13,
                fontWeight: "900",
                marginTop: 14,
                marginBottom: 7,
              }}
            >
              Supporting evidence or context
            </Text>

            <TextInput
              value={evidenceNotes}
              onChangeText={onChangeEvidenceNotes}
              placeholder="Optional: attempts to contact the Owner, dates, account issues or other relevant context."
              placeholderTextColor="rgba(107, 114, 128, 0.74)"
              multiline
              maxLength={1800}
              textAlignVertical="top"
              style={{
                minHeight: 120,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: CARD_BORDER,
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
              {evidenceNotes.length}/1800
            </Text>

            <Pressable
              onPress={onSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => ({
                minHeight: 50,
                borderRadius: 999,
                backgroundColor: !canSubmit
                  ? "rgba(107, 114, 128, 0.18)"
                  : pressed
                  ? "#7F1D1D"
                  : DANGER,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 18,
                opacity: !canSubmit ? 0.7 : 1,
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
                    color: canSubmit ? SURFACE : MUTED,
                    fontSize: 14,
                    fontWeight: "900",
                  }}
                >
                  Submit Recovery Request
                </Text>
              )}
            </Pressable>
          </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DecisionModal({
  visible,
  decision,
  note,
  saving,
  bottomInset = 0,
  onChangeNote,
  onConfirm,
  onClose,
}) {
  const isReject = decision === "rejected";

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
              maxHeight: "82%",
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
            keyboardShouldPersistTaps="handled"
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
                    : "checkmark-circle-outline"
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
                ? "Reject recovery request?"
                : "Approve recovery request?"}
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
              Your decision will be permanently recorded in
              the Network governance audit history.
            </Text>

            <TextInput
              value={note}
              onChangeText={onChangeNote}
              placeholder={
                isReject
                  ? "Explain why this request should be rejected."
                  : "Add any relevant context supporting your approval."
              }
              placeholderTextColor="rgba(107, 114, 128, 0.74)"
              multiline
              maxLength={1000}
              textAlignVertical="top"
              style={{
                minHeight: 116,
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
                marginTop: 17,
              }}
            />

            <Pressable
              onPress={onConfirm}
              disabled={saving}
              style={({ pressed }) => ({
                minHeight: 49,
                borderRadius: 999,
                backgroundColor: isReject
                  ? pressed
                    ? "#7F1D1D"
                    : DANGER
                  : pressed
                  ? "#3F512F"
                  : DEEP_OLIVE,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 17,
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
                  {isReject
                    ? "Confirm Rejection"
                    : "Confirm Approval"}
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

function CompletionModal({
  visible,
  saving,
  onConfirm,
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
            borderColor: DANGER_BORDER,
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
              backgroundColor: SOFT_DANGER_BG,
              borderWidth: 1,
              borderColor: DANGER_BORDER,
            }}
          >
            <Ionicons
              name="key-outline"
              size={29}
              color={DANGER}
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
            Complete ownership recovery?
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
            You will become Network Owner. The previous Owner
            will become an Admin and the successor designation
            will be cleared.
          </Text>

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
              marginTop: 20,
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
                Complete Recovery Now
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
              Not Yet
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function NetworkOwnershipRecovery() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const networkUuid =
    route.params?.networkUuid ||
    route.params?.networkId ||
    null;

  const [network, setNetwork] = useState(null);
  const [membership, setMembership] = useState(null);
  const [currentUserId, setCurrentUserId] =
    useState(null);

  const [activeRequest, setActiveRequest] =
    useState(null);

  const [approvals, setApprovals] = useState([]);
  const [profilesById, setProfilesById] =
    useState({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [loadError, setLoadError] = useState("");

  const [requestModalVisible, setRequestModalVisible] =
    useState(false);

  const [decisionModalVisible, setDecisionModalVisible] =
    useState(false);

  const [completionModalVisible, setCompletionModalVisible] =
    useState(false);

  const [reason, setReason] = useState("");
  const [evidenceNotes, setEvidenceNotes] =
    useState("");

  const [decision, setDecision] = useState(null);
  const [decisionNote, setDecisionNote] =
    useState("");

  const [saving, setSaving] = useState(false);
  const [information, setInformation] =
    useState(null);

  const loadRecovery = useCallback(
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
            "Please sign in again before opening ownership recovery."
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
              owner_user_id,
              designated_successor_user_id,
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
          data: membershipData,
          error: membershipError,
        } = await supabase
          .from("network_memberships")
          .select(
            "id, network_uuid, user_id, status, role"
          )
          .eq("network_uuid", networkUuid)
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
          membershipData?.role === "admin";

        if (!isOwner && !isAdmin) {
          throw new Error(
            "Only the Network Owner or an authorised Admin can access ownership recovery."
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
          .eq("network_uuid", networkUuid)
          .order("created_at", {
            ascending: false,
          })
          .limit(1);

        if (requestError) {
          throw requestError;
        }

        const latestRequest =
          Array.isArray(requestData) &&
          requestData.length > 0
            ? requestData[0]
            : null;

        let approvalRows = [];

        if (latestRequest?.id) {
          const {
            data: approvalData,
            error: approvalError,
          } = await supabase
            .from(
              "network_ownership_recovery_approvals"
            )
            .select("*")
            .eq(
              "recovery_request_id",
              latestRequest.id
            )
            .order("created_at", {
              ascending: true,
            });

          if (approvalError) {
            throw approvalError;
          }

          approvalRows = approvalData || [];
        }

        const relevantUserIds = [
          networkData.owner_user_id,
          latestRequest?.requested_by_user_id,
          latestRequest?.proposed_new_owner_user_id,
          latestRequest?.platform_reviewed_by_user_id,
          ...approvalRows.map(
            (approval) =>
              approval.approved_by_user_id
          ),
        ].filter(Boolean);

        let loadedProfiles = {};

        if (relevantUserIds.length > 0) {
          const {
            data: profileData,
            error: profileError,
          } = await supabase
            .from("profiles")
            .select(
              "id, display_name, handle, avatar_url"
            )
            .in("id", [
              ...new Set(relevantUserIds),
            ]);

          if (profileError) {
            throw profileError;
          }

          loadedProfiles = Object.fromEntries(
            (profileData || []).map((profile) => [
              profile.id,
              profile,
            ])
          );
        }

        setNetwork(networkData);
        setMembership(membershipData || null);
        setActiveRequest(latestRequest);
        setApprovals(approvalRows);
        setProfilesById(loadedProfiles);
      } catch (error) {
        console.log(
          "Network ownership recovery load error:",
          error
        );

        setLoadError(
          error?.message ||
            "Triunely could not load ownership recovery."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [networkUuid]
  );

  useEffect(() => {
    loadRecovery();
  }, [loadRecovery]);

  useEffect(() => {
    const unsubscribe = navigation.addListener(
      "focus",
      () => {
        loadRecovery({
          showLoader: false,
        });
      }
    );

    return unsubscribe;
  }, [loadRecovery, navigation]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);

    loadRecovery({
      showLoader: false,
    });
  }, [loadRecovery]);

  const actorIsOwner =
    network?.owner_user_id === currentUserId ||
    (
      membership?.status === "joined" &&
      membership?.role === "owner"
    );

  const actorIsAdmin =
    membership?.status === "joined" &&
    membership?.role === "admin";

  const isActiveCase =
    activeRequest &&
    ACTIVE_STATUSES.includes(activeRequest.status);

  const actorDecision = approvals.find(
    (approval) =>
      approval.approved_by_user_id ===
      currentUserId
  );

  const canCreateRequest =
    actorIsAdmin && !isActiveCase;

  const canDecide =
    actorIsAdmin &&
    activeRequest?.status ===
      "awaiting_approvals" &&
    activeRequest?.requested_by_user_id !==
      currentUserId &&
    !actorDecision;

  const protectionPeriodComplete =
    activeRequest?.review_available_at &&
    new Date(
      activeRequest.review_available_at
    ).getTime() <= Date.now();

  const canComplete =
    actorIsAdmin &&
    activeRequest?.status === "awaiting_review" &&
    activeRequest?.proposed_new_owner_user_id ===
      currentUserId &&
    activeRequest?.platform_review_status ===
      "approved" &&
    protectionPeriodComplete;

  const requesterProfile = useMemo(
    () =>
      profilesById[
        activeRequest?.requested_by_user_id
      ] || null,
    [
      activeRequest?.requested_by_user_id,
      profilesById,
    ]
  );

  const proposedOwnerProfile = useMemo(
    () =>
      profilesById[
        activeRequest?.proposed_new_owner_user_id
      ] || null,
    [
      activeRequest?.proposed_new_owner_user_id,
      profilesById,
    ]
  );

  const requesterName =
    requesterProfile?.display_name ||
    requesterProfile?.handle ||
    "Network Admin";

  const proposedOwnerName =
    proposedOwnerProfile?.display_name ||
    proposedOwnerProfile?.handle ||
    "Proposed Owner";

  const submitRecoveryRequest =
    useCallback(async () => {
      if (
        !networkUuid ||
        reason.trim().length < 20 ||
        saving
      ) {
        return;
      }

      try {
        setSaving(true);

        const { error } = await supabase.rpc(
          "create_network_ownership_recovery_request_rpc",
          {
            p_network_uuid: networkUuid,
            p_reason: reason.trim(),
            p_evidence_notes:
              evidenceNotes.trim() || null,
          }
        );

        if (error) {
          throw error;
        }

        setRequestModalVisible(false);
        setReason("");
        setEvidenceNotes("");

        await loadRecovery({
          showLoader: false,
        });

        setInformation({
          title: "Recovery request submitted",
          message:
            "The formal ownership recovery process has started. The Owner notification, protection period and required governance reviews are now recorded.",
          destructive: false,
        });
      } catch (error) {
        console.log(
          "Create ownership recovery error:",
          error
        );

        setInformation({
          title: "Request could not be submitted",
          message:
            error?.message ||
            "Triunely could not create the ownership recovery request.",
          destructive: true,
        });
      } finally {
        setSaving(false);
      }
    }, [
      evidenceNotes,
      loadRecovery,
      networkUuid,
      reason,
      saving,
    ]);

  const openDecisionModal = useCallback(
    (nextDecision) => {
      setDecision(nextDecision);
      setDecisionNote("");
      setDecisionModalVisible(true);
    },
    []
  );

  const submitDecision = useCallback(async () => {
    if (
      !activeRequest?.id ||
      !decision ||
      saving
    ) {
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.rpc(
        "decide_network_ownership_recovery_request_rpc",
        {
          p_recovery_request_id:
            activeRequest.id,
          p_decision: decision,
          p_decision_note:
            decisionNote.trim() || null,
        }
      );

      if (error) {
        throw error;
      }

      setDecisionModalVisible(false);
      setDecision(null);
      setDecisionNote("");

      await loadRecovery({
        showLoader: false,
      });

      setInformation({
        title:
          decision === "approved"
            ? "Approval recorded"
            : "Rejection recorded",
        message:
          decision === "approved"
            ? "Your Admin approval has been permanently recorded."
            : "The ownership recovery request has been rejected and closed.",
        destructive:
          decision === "rejected",
      });
    } catch (error) {
      console.log(
        "Ownership recovery decision error:",
        error
      );

      setInformation({
        title: "Decision could not be recorded",
        message:
          error?.message ||
          "Triunely could not record your decision.",
        destructive: true,
      });
    } finally {
      setSaving(false);
    }
  }, [
    activeRequest?.id,
    decision,
    decisionNote,
    loadRecovery,
    saving,
  ]);

  const completeRecovery = useCallback(async () => {
    if (!activeRequest?.id || saving) {
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.rpc(
        "complete_network_ownership_recovery_rpc",
        {
          p_recovery_request_id:
            activeRequest.id,
        }
      );

      if (error) {
        throw error;
      }

      setCompletionModalVisible(false);

      await loadRecovery({
        showLoader: false,
      });

      setInformation({
        title: "Ownership recovery completed",
        message:
          "You are now the Network Owner. The previous Owner has become an Admin and the successor designation has been cleared.",
        destructive: false,
      });
    } catch (error) {
      console.log(
        "Complete ownership recovery error:",
        error
      );

      setInformation({
        title: "Recovery could not be completed",
        message:
          error?.message ||
          "Triunely could not complete ownership recovery.",
        destructive: true,
      });
    } finally {
      setSaving(false);
    }
  }, [
    activeRequest?.id,
    loadRecovery,
    saving,
  ]);

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
              Loading Ownership Recovery
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
              <Ionicons
                name="lock-closed-outline"
                size={34}
                color={DANGER}
              />

              <Text
                style={{
                  ...serifHeading,
                  fontSize: 22,
                  textAlign: "center",
                  marginTop: 14,
                }}
              >
                Recovery unavailable
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
                onPress={() => loadRecovery()}
                style={({ pressed }) => ({
                  width: "100%",
                  minHeight: 48,
                  borderRadius: 999,
                  backgroundColor: pressed
                    ? "#92400E"
                    : HEAVENLY_GOLD,
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
                  Try Again
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </Screen>
    );
  }

  const statusDetails = getStatusDetails(
    activeRequest?.status
  );

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
                  Ownership Recovery
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
                name="shield-half-outline"
                size={29}
                color={SURFACE}
              />

              <Text
                style={{
                  fontFamily: displayFont,
                  color: SURFACE,
                  fontSize: 21,
                  fontWeight: "900",
                  lineHeight: 26,
                  marginTop: 10,
                }}
              >
                Protected Governance Process
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
                Emergency recovery requires recorded Network
                governance, a seven-day protection period and
                independent Triunely platform review.
              </Text>
            </View>

            {!activeRequest ? (
              <View
                style={{
                  ...premiumCardStyle,
                  padding: 18,
                }}
              >
                <View
                  style={{
                    width: 55,
                    height: 55,
                    borderRadius: 28,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: SOFT_OLIVE_BG,
                    borderWidth: 1,
                    borderColor: OLIVE_BORDER,
                  }}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={28}
                    color={DEEP_OLIVE}
                  />
                </View>

                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 20,
                    lineHeight: 25,
                    marginTop: 14,
                  }}
                >
                  No recovery case
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 13,
                    fontWeight: "700",
                    lineHeight: 19,
                    marginTop: 6,
                  }}
                >
                  There is no current or previous ownership
                  recovery case available for this Network.
                </Text>

                {canCreateRequest ? (
                  <Pressable
                    onPress={() =>
                      setRequestModalVisible(true)
                    }
                    style={({ pressed }) => ({
                      minHeight: 49,
                      borderRadius: 999,
                      backgroundColor: pressed
                        ? "#7F1D1D"
                        : DANGER,
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 17,
                    })}
                  >
                    <Text
                      style={{
                        color: SURFACE,
                        fontSize: 14,
                        fontWeight: "900",
                      }}
                    >
                      Request Ownership Recovery
                    </Text>
                  </Pressable>
                ) : null}

                {actorIsOwner ? (
                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 11.5,
                      fontWeight: "700",
                      lineHeight: 17,
                      marginTop: 14,
                    }}
                  >
                    Owners can monitor recovery cases but
                    cannot open a case against their own
                    ownership.
                  </Text>
                ) : null}
              </View>
            ) : (
              <>
                <View
                  style={{
                    ...premiumCardStyle,
                    padding: 17,
                    borderColor:
                      statusDetails.tone === "danger"
                        ? DANGER_BORDER
                        : GOLD_BORDER,
                    marginBottom: 14,
                  }}
                >
                  <StatusBadge
                    status={activeRequest.status}
                  />

                  <Text
                    style={{
                      ...serifHeading,
                      fontSize: 20,
                      lineHeight: 25,
                      marginTop: 13,
                    }}
                  >
                    Recovery Case
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
                    {statusDetails.description}
                  </Text>

                  <View
                    style={{
                      marginTop: 15,
                      padding: 13,
                      borderRadius: 17,
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
                      REQUESTED BY
                    </Text>

                    <Text
                      style={{
                        color: TEXT,
                        fontSize: 14,
                        fontWeight: "900",
                        marginTop: 3,
                      }}
                    >
                      {requesterName}
                    </Text>

                    <Text
                      style={{
                        color: MUTED,
                        fontSize: 10.5,
                        fontWeight: "900",
                        marginTop: 12,
                      }}
                    >
                      PROPOSED NEW OWNER
                    </Text>

                    <Text
                      style={{
                        color: TEXT,
                        fontSize: 14,
                        fontWeight: "900",
                        marginTop: 3,
                      }}
                    >
                      {proposedOwnerName}
                    </Text>
                  </View>

                  <Text
                    style={{
                      color: TEXT,
                      fontSize: 12,
                      fontWeight: "900",
                      marginTop: 15,
                    }}
                  >
                    Reason
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
                    {activeRequest.reason}
                  </Text>

                  {activeRequest.evidence_notes ? (
                    <>
                      <Text
                        style={{
                          color: TEXT,
                          fontSize: 12,
                          fontWeight: "900",
                          marginTop: 15,
                        }}
                      >
                        Supporting context
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
                        {activeRequest.evidence_notes}
                      </Text>
                    </>
                  ) : null}
                </View>

                <View
                  style={{
                    ...premiumCardStyle,
                    padding: 17,
                    marginBottom: 14,
                  }}
                >
                  <Text
                    style={{
                      ...serifHeading,
                      fontSize: 18,
                      lineHeight: 23,
                    }}
                  >
                    Admin Approval
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 13,
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        padding: 13,
                        borderRadius: 17,
                        backgroundColor: SOFT_OLIVE_BG,
                        borderWidth: 1,
                        borderColor: OLIVE_BORDER,
                      }}
                    >
                      <Text
                        style={{
                          color: DEEP_OLIVE,
                          fontSize: 21,
                          fontWeight: "900",
                        }}
                      >
                        {activeRequest.approval_count || 0}
                      </Text>

                      <Text
                        style={{
                          color: MUTED,
                          fontSize: 10.5,
                          fontWeight: "800",
                          marginTop: 2,
                        }}
                      >
                        Approvals recorded
                      </Text>
                    </View>

                    <View style={{ width: 10 }} />

                    <View
                      style={{
                        flex: 1,
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
                          fontSize: 21,
                          fontWeight: "900",
                        }}
                      >
                        {
                          activeRequest.required_admin_approvals
                        }
                      </Text>

                      <Text
                        style={{
                          color: MUTED,
                          fontSize: 10.5,
                          fontWeight: "800",
                          marginTop: 2,
                        }}
                      >
                        Required approvals
                      </Text>
                    </View>
                  </View>

                  {actorDecision ? (
                    <View
                      style={{
                        marginTop: 13,
                        padding: 12,
                        borderRadius: 16,
                        backgroundColor:
                          actorDecision.decision ===
                          "approved"
                            ? SOFT_OLIVE_BG
                            : SOFT_DANGER_BG,
                        borderWidth: 1,
                        borderColor:
                          actorDecision.decision ===
                          "approved"
                            ? OLIVE_BORDER
                            : DANGER_BORDER,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            actorDecision.decision ===
                            "approved"
                              ? DEEP_OLIVE
                              : DANGER,
                          fontSize: 12,
                          fontWeight: "900",
                        }}
                      >
                        You {actorDecision.decision} this
                        request.
                      </Text>
                    </View>
                  ) : null}

                  {canDecide ? (
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 10,
                        marginTop: 14,
                      }}
                    >
                      <Pressable
                        onPress={() =>
                          openDecisionModal("approved")
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
                          openDecisionModal("rejected")
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

                <View
                  style={{
                    ...premiumCardStyle,
                    padding: 17,
                    marginBottom: 14,
                  }}
                >
                  <Text
                    style={{
                      ...serifHeading,
                      fontSize: 18,
                      lineHeight: 23,
                    }}
                  >
                    Platform Review
                  </Text>

                  <View style={{ marginTop: 12 }}>
                    <PlatformStatusBadge
                      status={
                        activeRequest.platform_review_status
                      }
                    />
                  </View>

                  {activeRequest.platform_review_note ? (
                    <Text
                      style={{
                        color: MUTED,
                        fontSize: 12.5,
                        fontWeight: "700",
                        lineHeight: 19,
                        marginTop: 12,
                      }}
                    >
                      {activeRequest.platform_review_note}
                    </Text>
                  ) : (
                    <Text
                      style={{
                        color: MUTED,
                        fontSize: 12.5,
                        fontWeight: "700",
                        lineHeight: 19,
                        marginTop: 12,
                      }}
                    >
                      An independent authorised Triunely
                      reviewer must approve the case before
                      ownership recovery can be completed.
                    </Text>
                  )}
                </View>

                <View
                  style={{
                    ...premiumCardStyle,
                    padding: 17,
                    marginBottom: 14,
                  }}
                >
                  <Text
                    style={{
                      ...serifHeading,
                      fontSize: 18,
                      lineHeight: 23,
                    }}
                  >
                    Protection Period
                  </Text>

                  <Text
                    style={{
                      color: TEXT,
                      fontSize: 13.5,
                      fontWeight: "900",
                      marginTop: 12,
                    }}
                  >
                    {formatDateTime(
                      activeRequest.review_available_at
                    )}
                  </Text>

                  <Text
                    style={{
                      color: protectionPeriodComplete
                        ? DEEP_OLIVE
                        : EVENT_BROWN,
                      fontSize: 11.5,
                      fontWeight: "900",
                      marginTop: 5,
                    }}
                  >
                    {formatRemainingTime(
                      activeRequest.review_available_at
                    )}
                  </Text>
                </View>

                {canComplete ? (
                  <Pressable
                    onPress={() =>
                      setCompletionModalVisible(true)
                    }
                    style={({ pressed }) => ({
                      minHeight: 51,
                      borderRadius: 999,
                      backgroundColor: pressed
                        ? "#7F1D1D"
                        : DANGER,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 14,
                    })}
                  >
                    <Text
                      style={{
                        color: SURFACE,
                        fontSize: 14,
                        fontWeight: "900",
                      }}
                    >
                      Complete Ownership Recovery
                    </Text>
                  </Pressable>
                ) : null}

                {!isActiveCase && canCreateRequest ? (
                  <Pressable
                    onPress={() =>
                      setRequestModalVisible(true)
                    }
                    style={({ pressed }) => ({
                      minHeight: 49,
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
                        fontSize: 14,
                        fontWeight: "900",
                      }}
                    >
                      Start New Recovery Request
                    </Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </ScrollView>

          <RecoveryRequestModal
            visible={requestModalVisible}
            reason={reason}
            evidenceNotes={evidenceNotes}
            saving={saving}
            bottomInset={insets.bottom}
            onChangeReason={setReason}
            onChangeEvidenceNotes={setEvidenceNotes}
            onSubmit={submitRecoveryRequest}
            onClose={() => {
              if (saving) {
                return;
              }

              setRequestModalVisible(false);
            }}
          />

          <DecisionModal
            visible={decisionModalVisible}
            decision={decision}
            note={decisionNote}
            saving={saving}
            bottomInset={insets.bottom}
            onChangeNote={setDecisionNote}
            onConfirm={submitDecision}
            onClose={() => {
              if (saving) {
                return;
              }

              setDecisionModalVisible(false);
              setDecision(null);
              setDecisionNote("");
            }}
          />

          <CompletionModal
            visible={completionModalVisible}
            saving={saving}
            onConfirm={completeRecovery}
            onClose={() => {
              if (saving) {
                return;
              }

              setCompletionModalVisible(false);
            }}
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