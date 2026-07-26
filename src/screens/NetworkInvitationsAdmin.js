// C:\triunely\src\screens\NetworkInvitationsAdmin.js

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Image,
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

function formatStatus(status) {
  const normalizedStatus =
    String(status || "").toLowerCase();

  if (normalizedStatus === "pending") {
    return "Pending";
  }

  if (normalizedStatus === "accepted") {
    return "Accepted";
  }

  if (normalizedStatus === "declined") {
    return "Declined";
  }

  if (normalizedStatus === "cancelled") {
    return "Cancelled";
  }

  if (normalizedStatus === "expired") {
    return "Expired";
  }

  return "Unknown";
}

function getStatusStyle(status) {
  const normalizedStatus =
    String(status || "").toLowerCase();

  if (normalizedStatus === "pending") {
    return {
      backgroundColor: SOFT_GOLD_BG,
      borderColor: GOLD_BORDER,
      textColor: EVENT_BROWN,
      icon: "time-outline",
    };
  }

  if (normalizedStatus === "accepted") {
    return {
      backgroundColor: SOFT_OLIVE_BG,
      borderColor: OLIVE_BORDER,
      textColor: DEEP_OLIVE,
      icon: "checkmark-circle-outline",
    };
  }

  if (normalizedStatus === "declined") {
    return {
      backgroundColor: SOFT_DANGER_BG,
      borderColor: DANGER_BORDER,
      textColor: DANGER,
      icon: "close-circle-outline",
    };
  }

  return {
    backgroundColor: "rgba(107, 114, 128, 0.08)",
    borderColor: CARD_BORDER,
    textColor: MUTED,
    icon: "remove-circle-outline",
  };
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

function getPersonName(person) {
  return (
    person?.display_name ||
    formatHandle(person?.handle) ||
    "Triunely user"
  );
}

function ProfileAvatar({
  person,
  size = 48,
  muted = false,
}) {
  const displayName = getPersonName(person);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: muted ? MUTED : DEEP_OLIVE,
        borderWidth: 1,
        borderColor: muted
          ? CARD_BORDER
          : OLIVE_BORDER,
      }}
    >
      {person?.avatar_url ? (
        <Image
          source={{ uri: person.avatar_url }}
          resizeMode="cover"
          style={{
            width: "100%",
            height: "100%",
          }}
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

function Header({
  networkName,
  refreshing,
  onBack,
  onRefresh,
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
      }}
    >
      <Pressable
        onPress={onBack}
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
          minWidth: 0,
        }}
      >
        <Text
          style={{
            ...serifHeading,
            fontSize: 24,
            lineHeight: 29,
          }}
          numberOfLines={1}
        >
          Network Invitations
        </Text>

        <Text
          style={{
            color: MUTED,
            fontSize: 12,
            fontWeight: "800",
            marginTop: 1,
          }}
          numberOfLines={1}
        >
          {networkName || "Manage invited people"}
        </Text>
      </View>

      <Pressable
        onPress={onRefresh}
        disabled={refreshing}
        hitSlop={10}
        style={({ pressed }) => ({
          width: 42,
          height: 42,
          borderRadius: 21,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed
            ? SOFT_GOLD_BG
            : SURFACE,
          borderWidth: 1,
          borderColor: GOLD_BORDER,
          marginLeft: 10,
          opacity: refreshing ? 0.65 : 1,
        })}
      >
        {refreshing ? (
          <ActivityIndicator
            size="small"
            color={HEAVENLY_GOLD}
          />
        ) : (
          <Ionicons
            name="refresh-outline"
            size={21}
            color={HEAVENLY_GOLD}
          />
        )}
      </Pressable>
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
            onPress={onClose}
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
              Got it
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function InviteModal({
  visible,
  person,
  networkName,
  message,
  saving,
  bottomInset,
  onChangeMessage,
  onConfirm,
  onClose,
}) {
  if (!person) {
    return null;
  }

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
              maxHeight: "90%",
              backgroundColor: PREMIUM_CREAM,
              borderTopLeftRadius: 29,
              borderTopRightRadius: 29,
              borderWidth: 1,
              borderColor: GOLD_BORDER,
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

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View
                style={{
                  alignItems: "center",
                }}
              >
                <ProfileAvatar
                  person={person}
                  size={64}
                />

                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 22,
                    lineHeight: 27,
                    textAlign: "center",
                    marginTop: 12,
                  }}
                >
                  Invite to Network
                </Text>

                <Text
                  style={{
                    color: TEXT,
                    fontSize: 14.5,
                    fontWeight: "900",
                    textAlign: "center",
                    marginTop: 8,
                  }}
                >
                  {getPersonName(person)}
                </Text>

                {person?.handle ? (
                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 12,
                      fontWeight: "800",
                      marginTop: 2,
                    }}
                  >
                    {formatHandle(person.handle)}
                  </Text>
                ) : null}
              </View>

              <View
                style={{
                  borderRadius: 18,
                  backgroundColor: SOFT_GOLD_BG,
                  borderWidth: 1,
                  borderColor: GOLD_BORDER,
                  padding: 13,
                  marginTop: 17,
                  flexDirection: "row",
                  alignItems: "flex-start",
                }}
              >
                <Ionicons
                  name="people-outline"
                  size={18}
                  color={HEAVENLY_GOLD}
                  style={{ marginTop: 1 }}
                />

                <Text
                  style={{
                    flex: 1,
                    color: EVENT_BROWN,
                    fontSize: 12,
                    fontWeight: "800",
                    lineHeight: 18,
                    marginLeft: 8,
                  }}
                >
                  This invitation gives standard member
                  access to {networkName || "this Network"}.
                  Higher roles can only be granted after the
                  person joins.
                </Text>
              </View>

              <Text
                style={{
                  color: TEXT,
                  fontSize: 12,
                  fontWeight: "900",
                  textTransform: "uppercase",
                  letterSpacing: 0.45,
                  marginTop: 18,
                  marginBottom: 8,
                }}
              >
                Optional invitation message
              </Text>

              <TextInput
                value={message}
                onChangeText={onChangeMessage}
                multiline
                maxLength={500}
                textAlignVertical="top"
                placeholder="Add a warm personal message explaining why you are inviting them."
                placeholderTextColor="rgba(107, 114, 128, 0.72)"
                style={{
                  minHeight: 125,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: OLIVE_BORDER,
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
                {message.length}/500
              </Text>

              <Pressable
                onPress={onConfirm}
                disabled={saving}
                style={({ pressed }) => ({
                  minHeight: 50,
                  borderRadius: 999,
                  backgroundColor: pressed
                    ? "#92400E"
                    : HEAVENLY_GOLD,
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
                    Send Network Invitation
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
                  Cancel
                </Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CancelInvitationModal({
  visible,
  invitation,
  saving,
  bottomInset,
  onConfirm,
  onClose,
}) {
  if (!invitation) {
    return null;
  }

  const displayName =
    invitation.invited_display_name ||
    formatHandle(invitation.invited_handle) ||
    "this person";

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
              backgroundColor: SOFT_DANGER_BG,
              borderWidth: 1,
              borderColor: DANGER_BORDER,
              alignItems: "center",
              justifyContent: "center",
              alignSelf: "center",
            }}
          >
            <Ionicons
              name="close-circle-outline"
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
              marginTop: 14,
            }}
          >
            Cancel invitation?
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
            {displayName} will no longer be able to accept
            this invitation. The record will remain in the
            invitation history.
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
                Cancel Invitation
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

function UserSearchResultCard({
  person,
  onSelect,
}) {
  const canInvite = person?.can_invite === true;

  return (
    <Pressable
      onPress={() => {
        if (canInvite) {
          onSelect(person);
        }
      }}
      disabled={!canInvite}
      style={({ pressed }) => ({
        ...premiumCardStyle,
        padding: 14,
        marginBottom: 10,
        opacity: canInvite ? 1 : 0.68,
        backgroundColor:
          pressed && canInvite
            ? SOFT_OLIVE_BG
            : SURFACE,
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <ProfileAvatar
          person={person}
          size={47}
          muted={!canInvite}
        />

        <View
          style={{
            flex: 1,
            minWidth: 0,
            marginLeft: 11,
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
                fontSize: 14.5,
                fontWeight: "900",
                paddingRight: 7,
              }}
              numberOfLines={1}
            >
              {getPersonName(person)}
            </Text>

            {person?.is_verified ? (
              <View
                style={{
                  width: 21,
                  height: 21,
                  borderRadius: 11,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: HEAVENLY_GOLD,
                }}
              >
                <Ionicons
                  name="checkmark"
                  size={12}
                  color={SURFACE}
                />
              </View>
            ) : null}
          </View>

          {person?.handle ? (
            <Text
              style={{
                color: MUTED,
                fontSize: 12,
                fontWeight: "800",
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {formatHandle(person.handle)}
            </Text>
          ) : null}

          <Text
            style={{
              color: canInvite
                ? DEEP_OLIVE
                : DANGER,
              fontSize: 11,
              fontWeight: "900",
              marginTop: 5,
            }}
          >
            {canInvite
              ? "Available to invite"
              : person?.unavailable_reason ||
                "Unavailable"}
          </Text>
        </View>

        <Ionicons
          name={
            canInvite
              ? "person-add-outline"
              : "lock-closed-outline"
          }
          size={20}
          color={
            canInvite
              ? HEAVENLY_GOLD
              : MUTED
          }
        />
      </View>
    </Pressable>
  );
}

function InvitationCard({
  invitation,
  onCancel,
}) {
  const statusStyle = getStatusStyle(
    invitation?.status
  );

  const displayName =
    invitation?.invited_display_name ||
    formatHandle(invitation?.invited_handle) ||
    "Triunely user";

  const handle = formatHandle(
    invitation?.invited_handle
  );

  const isPending =
    invitation?.status === "pending";

  return (
    <View
      style={{
        ...premiumCardStyle,
        padding: 15,
        marginBottom: 12,
        borderColor: isPending
          ? GOLD_BORDER
          : CARD_BORDER,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
        }}
      >
        <ProfileAvatar
          person={{
            display_name:
              invitation?.invited_display_name,
            handle: invitation?.invited_handle,
            avatar_url:
              invitation?.invited_avatar_url,
          }}
          size={49}
          muted={!isPending}
        />

        <View
          style={{
            flex: 1,
            minWidth: 0,
            marginLeft: 11,
          }}
        >
          <Text
            style={{
              color: TEXT,
              fontSize: 14.5,
              fontWeight: "900",
            }}
            numberOfLines={1}
          >
            {displayName}
          </Text>

          {handle ? (
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

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginTop: 8,
              marginHorizontal: -3,
            }}
          >
            <View
              style={{
                margin: 3,
                borderRadius: 999,
                paddingHorizontal: 9,
                paddingVertical: 5,
                backgroundColor:
                  statusStyle.backgroundColor,
                borderWidth: 1,
                borderColor:
                  statusStyle.borderColor,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Ionicons
                name={statusStyle.icon}
                size={12}
                color={statusStyle.textColor}
              />

              <Text
                style={{
                  color: statusStyle.textColor,
                  fontSize: 10.5,
                  fontWeight: "900",
                  marginLeft: 4,
                }}
              >
                {formatStatus(
                  invitation?.status
                )}
              </Text>
            </View>

            <View
              style={{
                margin: 3,
                borderRadius: 999,
                paddingHorizontal: 9,
                paddingVertical: 5,
                backgroundColor:
                  "rgba(107, 114, 128, 0.08)",
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
                Member
              </Text>
            </View>
          </View>
        </View>

        {isPending ? (
          <Pressable
            onPress={() => onCancel(invitation)}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 39,
              height: 39,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 8,
              backgroundColor: pressed
                ? "rgba(153, 27, 27, 0.15)"
                : SOFT_DANGER_BG,
              borderWidth: 1,
              borderColor: DANGER_BORDER,
            })}
          >
            <Ionicons
              name="close-outline"
              size={22}
              color={DANGER}
            />
          </Pressable>
        ) : null}
      </View>

      {invitation?.invitation_message ? (
        <View
          style={{
            borderRadius: 16,
            backgroundColor: PREMIUM_CREAM,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            padding: 12,
            marginTop: 13,
          }}
        >
          <Text
            style={{
              color: MUTED,
              fontSize: 11,
              fontWeight: "900",
              textTransform: "uppercase",
              letterSpacing: 0.4,
              marginBottom: 5,
            }}
          >
            Invitation message
          </Text>

          <Text
            style={{
              color: TEXT,
              fontSize: 12.5,
              fontWeight: "700",
              lineHeight: 18,
            }}
          >
            {invitation.invitation_message}
          </Text>
        </View>
      ) : null}

      <View
        style={{
          marginTop: 13,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: CARD_BORDER,
        }}
      >
        <Text
          style={{
            color: MUTED,
            fontSize: 11,
            fontWeight: "700",
            lineHeight: 16,
          }}
        >
          Sent {formatDateTime(invitation?.created_at)}
        </Text>

        {isPending ? (
          <Text
            style={{
              color: EVENT_BROWN,
              fontSize: 11,
              fontWeight: "800",
              lineHeight: 16,
              marginTop: 2,
            }}
          >
            Expires {formatDateTime(invitation?.expires_at)}
          </Text>
        ) : null}

        {invitation?.responded_at ? (
          <Text
            style={{
              color: MUTED,
              fontSize: 11,
              fontWeight: "700",
              lineHeight: 16,
              marginTop: 2,
            }}
          >
            Responded{" "}
            {formatDateTime(
              invitation.responded_at
            )}
          </Text>
        ) : null}

        {invitation?.cancelled_at ? (
          <Text
            style={{
              color: DANGER,
              fontSize: 11,
              fontWeight: "800",
              lineHeight: 16,
              marginTop: 2,
            }}
          >
            Cancelled{" "}
            {formatDateTime(
              invitation.cancelled_at
            )}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  message,
}) {
  return (
    <View
      style={{
        ...premiumCardStyle,
        paddingVertical: 26,
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
          marginTop: 14,
        }}
      >
        {title}
      </Text>

      <Text
        style={{
          color: MUTED,
          fontSize: 13,
          fontWeight: "700",
          lineHeight: 19,
          textAlign: "center",
          marginTop: 7,
        }}
      >
        {message}
      </Text>
    </View>
  );
}

export default function NetworkInvitationsAdmin() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const networkUuid =
    route.params?.networkUuid ||
    route.params?.networkId ||
    null;

  const initialNetworkName =
    route.params?.networkName || "";

  const latestSearchIdRef = useRef(0);

  const [networkName, setNetworkName] =
    useState(initialNetworkName);

  const [invitations, setInvitations] =
    useState([]);

  const [activeSection, setActiveSection] =
    useState("pending");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [loadError, setLoadError] =
    useState("");

  const [searchQuery, setSearchQuery] =
    useState("");

  const [searchResults, setSearchResults] =
    useState([]);

  const [searching, setSearching] =
    useState(false);

  const [searchAttempted, setSearchAttempted] =
    useState(false);

  const [selectedPerson, setSelectedPerson] =
    useState(null);

  const [invitationMessage, setInvitationMessage] =
    useState("");

  const [inviteModalVisible, setInviteModalVisible] =
    useState(false);

  const [savingInvitation, setSavingInvitation] =
    useState(false);

  const [invitationToCancel, setInvitationToCancel] =
    useState(null);

  const [cancellingInvitation, setCancellingInvitation] =
    useState(false);

  const [information, setInformation] =
    useState(null);

  const pendingInvitations = useMemo(
    () =>
      invitations.filter(
        (invitation) =>
          invitation?.status === "pending"
      ),
    [invitations]
  );

  const invitationHistory = useMemo(
    () =>
      invitations.filter(
        (invitation) =>
          invitation?.status !== "pending"
      ),
    [invitations]
  );

  const loadInvitations = useCallback(
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
          data: networkData,
          error: networkError,
        } = await supabase
          .from("networks")
          .select("id, name")
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

        setNetworkName(
          networkData?.name ||
            initialNetworkName ||
            "Network"
        );

        const {
          data: invitationData,
          error: invitationError,
        } = await supabase.rpc(
          "get_network_invitations_for_management_rpc",
          {
            p_network_uuid: networkUuid,
          }
        );

        if (invitationError) {
          throw invitationError;
        }

        setInvitations(
          Array.isArray(invitationData)
            ? invitationData
            : []
        );
      } catch (error) {
        console.log(
          "Network invitations load error:",
          error
        );

        setLoadError(
          error?.message ||
            "Triunely could not load Network invitations."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [initialNetworkName, networkUuid]
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

  const searchUsers = useCallback(
    async ({
      queryOverride,
      showError = true,
    } = {}) => {
      const query = String(
        queryOverride ?? searchQuery
      ).trim();

      const normalizedQuery =
        query.replace(/^@/, "");

      if (normalizedQuery.length < 2) {
        setSearchResults([]);
        setSearchAttempted(false);
        setSearching(false);
        return;
      }

      const searchId =
        latestSearchIdRef.current + 1;

      latestSearchIdRef.current = searchId;

      try {
        setSearching(true);
        setSearchAttempted(true);

        const { data, error } =
          await supabase.rpc(
            "search_triunely_users_for_network_invitation_rpc",
            {
              p_network_uuid: networkUuid,
              p_search_query: query,
              p_limit: 20,
            }
          );

        if (error) {
          throw error;
        }

        if (
          latestSearchIdRef.current !== searchId
        ) {
          return;
        }

        setSearchResults(
          Array.isArray(data) ? data : []
        );
      } catch (error) {
        console.log(
          "Network invitation user search error:",
          error
        );

        if (
          latestSearchIdRef.current !== searchId
        ) {
          return;
        }

        setSearchResults([]);

        if (showError) {
          setInformation({
            title: "Search unavailable",
            message:
              error?.message ||
              "Triunely could not search for people right now.",
            destructive: true,
          });
        }
      } finally {
        if (
          latestSearchIdRef.current === searchId
        ) {
          setSearching(false);
        }
      }
    },
    [networkUuid, searchQuery]
  );

  useEffect(() => {
    const query = searchQuery.trim();
    const normalizedQuery =
      query.replace(/^@/, "");

    if (normalizedQuery.length < 2) {
      latestSearchIdRef.current += 1;
      setSearchResults([]);
      setSearchAttempted(false);
      setSearching(false);
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      searchUsers({
        queryOverride: query,
        showError: false,
      });
    }, 350);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchQuery, searchUsers]);

  const openInviteModal = useCallback(
    (person) => {
      if (!person?.can_invite) {
        return;
      }

      setSelectedPerson(person);
      setInvitationMessage("");
      setInviteModalVisible(true);
    },
    []
  );

  const closeInviteModal = useCallback(() => {
    if (savingInvitation) {
      return;
    }

    setInviteModalVisible(false);
    setSelectedPerson(null);
    setInvitationMessage("");
  }, [savingInvitation]);

  const sendInvitation = useCallback(
    async () => {
      if (
        !networkUuid ||
        !selectedPerson?.user_id ||
        savingInvitation
      ) {
        return;
      }

      try {
        setSavingInvitation(true);

        const { error } = await supabase.rpc(
          "create_network_invitation_rpc",
          {
            p_network_uuid: networkUuid,
            p_invited_user_id:
              selectedPerson.user_id,
            p_invitation_message:
              invitationMessage.trim() || null,
          }
        );

        if (error) {
          throw error;
        }

        const invitedName =
          getPersonName(selectedPerson);

        setInviteModalVisible(false);
        setSelectedPerson(null);
        setInvitationMessage("");
        setSearchQuery("");
        setSearchResults([]);
        setSearchAttempted(false);

        await loadInvitations({
          showLoader: false,
        });

        setActiveSection("pending");

        setInformation({
          title: "Invitation sent",
          message: `${invitedName} has been invited to join ${networkName}. The invitation will remain available for 30 days.`,
          destructive: false,
        });
      } catch (error) {
        console.log(
          "Create Network invitation error:",
          error
        );

        setInformation({
          title: "Invitation not sent",
          message:
            error?.message ||
            "Triunely could not send this Network invitation.",
          destructive: true,
        });
      } finally {
        setSavingInvitation(false);
      }
    },
    [
      invitationMessage,
      loadInvitations,
      networkName,
      networkUuid,
      savingInvitation,
      selectedPerson,
    ]
  );

  const openCancelInvitation =
    useCallback((invitation) => {
      setInvitationToCancel(invitation);
    }, []);

  const closeCancelInvitation =
    useCallback(() => {
      if (cancellingInvitation) {
        return;
      }

      setInvitationToCancel(null);
    }, [cancellingInvitation]);

  const cancelInvitation = useCallback(
    async () => {
      if (
        !invitationToCancel?.invitation_id ||
        cancellingInvitation
      ) {
        return;
      }

      try {
        setCancellingInvitation(true);

        const { error } = await supabase.rpc(
          "cancel_network_invitation_rpc",
          {
            p_invitation_id:
              invitationToCancel.invitation_id,
          }
        );

        if (error) {
          throw error;
        }

        const displayName =
          invitationToCancel.invited_display_name ||
          formatHandle(
            invitationToCancel.invited_handle
          ) ||
          "The person";

        setInvitationToCancel(null);

        await loadInvitations({
          showLoader: false,
        });

        setInformation({
          title: "Invitation cancelled",
          message: `${displayName} can no longer accept this invitation. The record remains preserved in invitation history.`,
          destructive: false,
        });
      } catch (error) {
        console.log(
          "Cancel Network invitation error:",
          error
        );

        setInformation({
          title: "Invitation not cancelled",
          message:
            error?.message ||
            "Triunely could not cancel this invitation.",
          destructive: true,
        });
      } finally {
        setCancellingInvitation(false);
      }
    },
    [
      cancellingInvitation,
      invitationToCancel,
      loadInvitations,
    ]
  );

  if (loading) {
    return (
      <Screen
        backgroundColor={PREMIUM_CREAM}
        padded={false}
        style={{ flex: 1 }}
      >
        <Header
          networkName={networkName}
          refreshing={false}
          onBack={() => navigation.goBack()}
          onRefresh={() => {}}
        />

        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <ActivityIndicator
            size="large"
            color={HEAVENLY_GOLD}
          />

          <Text
            style={{
              ...serifHeading,
              fontSize: 20,
              lineHeight: 25,
              textAlign: "center",
              marginTop: 15,
            }}
          >
            Loading Invitations
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
            Checking pending invitations and Network
            invitation history.
          </Text>
        </View>
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen
        backgroundColor={PREMIUM_CREAM}
        padded={false}
        style={{ flex: 1 }}
      >
        <Header
          networkName={networkName}
          refreshing={false}
          onBack={() => navigation.goBack()}
          onRefresh={() => loadInvitations()}
        />

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
              borderColor: DANGER_BORDER,
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
              }}
            >
              <Ionicons
                name="mail-unread-outline"
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
                marginTop: 15,
              }}
            >
              Invitations unavailable
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
              onPress={() => loadInvitations()}
              style={({ pressed }) => ({
                minHeight: 48,
                borderRadius: 999,
                backgroundColor: pressed
                  ? "#92400E"
                  : HEAVENLY_GOLD,
                paddingHorizontal: 26,
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
                Try Again
              </Text>
            </Pressable>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      backgroundColor={PREMIUM_CREAM}
      padded={false}
      style={{ flex: 1 }}
    >
      <Header
        networkName={networkName}
        refreshing={refreshing}
        onBack={() => navigation.goBack()}
        onRefresh={handleRefresh}
      />

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
          paddingBottom: Math.max(
            30,
            insets.bottom + 24
          ),
        }}
      >
        <View
          style={{
            borderRadius: 24,
            backgroundColor: DEEP_OLIVE,
            padding: 17,
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
            Invite People
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
            Search for a Triunely user by their name or
            unique @username.
          </Text>

          <View
            style={{
              flexDirection: "row",
              marginTop: 15,
            }}
          >
            <View
              style={{
                flex: 1,
                minHeight: 50,
                borderRadius: 17,
                backgroundColor:
                  "rgba(255, 255, 255, 0.96)",
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 13,
              }}
            >
              <Ionicons
                name="search-outline"
                size={19}
                color={MUTED}
              />

              <TextInput
                value={searchQuery}
                onChangeText={(value) => {
                  setSearchQuery(value);

                  if (!value.trim()) {
                    setSearchResults([]);
                    setSearchAttempted(false);
                  }
                }}
                onSubmitEditing={() =>
                  searchUsers()
                }
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Name or @username"
                placeholderTextColor="rgba(107, 114, 128, 0.72)"
                style={{
                  flex: 1,
                  color: TEXT,
                  fontSize: 14,
                  fontWeight: "700",
                  paddingHorizontal: 9,
                  paddingVertical: 0,
                }}
              />

              {searchQuery ? (
                <Pressable
                  onPress={() => {
                    latestSearchIdRef.current += 1;
                    setSearchQuery("");
                    setSearchResults([]);
                    setSearchAttempted(false);
                    setSearching(false);
                  }}
                  hitSlop={8}
                >
                  <Ionicons
                    name="close-circle"
                    size={19}
                    color={MUTED}
                  />
                </Pressable>
              ) : null}
            </View>

            <Pressable
              onPress={() => searchUsers()}
              disabled={searching}
              style={({ pressed }) => ({
                width: 50,
                height: 50,
                borderRadius: 17,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed
                  ? "#92400E"
                  : HEAVENLY_GOLD,
                marginLeft: 9,
                opacity: searching ? 0.65 : 1,
              })}
            >
              {searching ? (
                <ActivityIndicator
                  size="small"
                  color={SURFACE}
                />
              ) : (
                <Ionicons
                  name="arrow-forward"
                  size={21}
                  color={SURFACE}
                />
              )}
            </Pressable>
          </View>
        </View>

        {searchResults.length > 0 ? (
          <View style={{ marginTop: 15 }}>
            <Text
              style={{
                color: TEXT,
                fontSize: 12,
                fontWeight: "900",
                textTransform: "uppercase",
                letterSpacing: 0.45,
                marginBottom: 9,
                marginLeft: 3,
              }}
            >
              Suggested people
            </Text>

            {searchResults.map((person) => (
              <UserSearchResultCard
                key={person.user_id}
                person={person}
                onSelect={openInviteModal}
              />
            ))}
          </View>
        ) : searchAttempted && !searching ? (
          <View
            style={{
              ...premiumCardStyle,
              padding: 18,
              alignItems: "center",
              marginTop: 15,
            }}
          >
            <Ionicons
              name="search-outline"
              size={27}
              color={MUTED}
            />

            <Text
              style={{
                color: TEXT,
                fontSize: 14,
                fontWeight: "900",
                marginTop: 9,
              }}
            >
              No people found
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 12,
                fontWeight: "700",
                lineHeight: 17,
                textAlign: "center",
                marginTop: 4,
              }}
            >
              Check the spelling or search using the
              person's unique @username.
            </Text>
          </View>
        ) : null}

        <View
          style={{
            flexDirection: "row",
            backgroundColor: SURFACE,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            padding: 4,
            marginTop: 20,
            marginBottom: 18,
          }}
        >
          <Pressable
            onPress={() =>
              setActiveSection("pending")
            }
            style={({ pressed }) => ({
              flex: 1,
              borderRadius: 14,
              paddingVertical: 11,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor:
                activeSection === "pending"
                  ? SOFT_GOLD_BG
                  : pressed
                  ? SOFT_OLIVE_BG
                  : "transparent",
              borderWidth:
                activeSection === "pending"
                  ? 1
                  : 0,
              borderColor:
                activeSection === "pending"
                  ? GOLD_BORDER
                  : "transparent",
            })}
          >
            <Text
              style={{
                color:
                  activeSection === "pending"
                    ? EVENT_BROWN
                    : MUTED,
                fontSize: 12,
                fontWeight: "900",
              }}
            >
              Pending ({pendingInvitations.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              setActiveSection("history")
            }
            style={({ pressed }) => ({
              flex: 1,
              borderRadius: 14,
              paddingVertical: 11,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor:
                activeSection === "history"
                  ? SOFT_GOLD_BG
                  : pressed
                  ? SOFT_OLIVE_BG
                  : "transparent",
              borderWidth:
                activeSection === "history"
                  ? 1
                  : 0,
              borderColor:
                activeSection === "history"
                  ? GOLD_BORDER
                  : "transparent",
            })}
          >
            <Text
              style={{
                color:
                  activeSection === "history"
                    ? EVENT_BROWN
                    : MUTED,
                fontSize: 12,
                fontWeight: "900",
              }}
            >
              History ({invitationHistory.length})
            </Text>
          </Pressable>
        </View>

        {activeSection === "pending" ? (
          <View>
            <Text
              style={{
                ...serifHeading,
                fontSize: 21,
                lineHeight: 26,
                marginBottom: 4,
              }}
            >
              Pending Invitations
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
              Invitations remain available for 30 days
              unless they are accepted, declined or
              cancelled.
            </Text>

            {pendingInvitations.length === 0 ? (
              <EmptyState
                icon="mail-open-outline"
                title="No pending invitations"
                message="Search for someone above to send the first invitation to this Network."
              />
            ) : (
              pendingInvitations.map(
                (invitation) => (
                  <InvitationCard
                    key={
                      invitation.invitation_id
                    }
                    invitation={invitation}
                    onCancel={
                      openCancelInvitation
                    }
                  />
                )
              )
            )}
          </View>
        ) : null}

        {activeSection === "history" ? (
          <View>
            <Text
              style={{
                ...serifHeading,
                fontSize: 21,
                lineHeight: 26,
                marginBottom: 4,
              }}
            >
              Invitation History
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
              Accepted, declined, cancelled and expired
              invitation records remain preserved.
            </Text>

            {invitationHistory.length === 0 ? (
              <EmptyState
                icon="time-outline"
                title="No invitation history"
                message="Resolved Network invitations will remain visible here."
              />
            ) : (
              invitationHistory.map(
                (invitation) => (
                  <InvitationCard
                    key={
                      invitation.invitation_id
                    }
                    invitation={invitation}
                    onCancel={() => {}}
                  />
                )
              )
            )}
          </View>
        ) : null}
      </ScrollView>

      <InviteModal
        visible={inviteModalVisible}
        person={selectedPerson}
        networkName={networkName}
        message={invitationMessage}
        saving={savingInvitation}
        bottomInset={insets.bottom}
        onChangeMessage={setInvitationMessage}
        onConfirm={sendInvitation}
        onClose={closeInviteModal}
      />

      <CancelInvitationModal
        visible={Boolean(invitationToCancel)}
        invitation={invitationToCancel}
        saving={cancellingInvitation}
        bottomInset={insets.bottom}
        onConfirm={cancelInvitation}
        onClose={closeCancelInvitation}
      />

      <InformationModal
        visible={Boolean(information)}
        title={information?.title || ""}
        message={information?.message || ""}
        destructive={
          information?.destructive === true
        }
        onClose={() => setInformation(null)}
      />
    </Screen>
  );
}