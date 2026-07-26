// C:\triunely\src\screens\TriunelyPlatformStaffManagement.js

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
    useCallback,
    useEffect,
    useMemo,
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
const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";
const DANGER = "#991B1B";

const CARD_BORDER = "rgba(15, 23, 42, 0.08)";
const AMBER_SOFT = "rgba(180, 83, 9, 0.10)";
const AMBER_BORDER = "rgba(180, 83, 9, 0.18)";
const OLIVE_SOFT = "rgba(79, 99, 59, 0.10)";
const OLIVE_BORDER = "rgba(79, 99, 59, 0.18)";
const DANGER_SOFT = "rgba(153, 27, 27, 0.10)";
const DANGER_BORDER = "rgba(153, 27, 27, 0.18)";
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
  borderRadius: 23,
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

const STAFF_ROLE_OPTIONS = [
  {
    value: "platform_reviewer",
    title: "Platform Reviewer",
    description:
      "Reviews standard ownership-recovery cases and records platform decisions.",
    icon: "shield-checkmark-outline",
  },
  {
    value: "senior_reviewer",
    title: "Senior Reviewer",
    description:
      "Handles escalated, disputed or higher-risk governance cases.",
    icon: "ribbon-outline",
  },
  {
    value: "platform_admin",
    title: "Platform Admin",
    description:
      "Manages platform staff and protected operational controls.",
    icon: "key-outline",
  },
];

function safeInitials(value) {
  const cleaned = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (cleaned.length >= 2) {
    return `${cleaned[0][0]}${cleaned[1][0]}`.toUpperCase();
  }

  return cleaned[0]?.[0]?.toUpperCase() || "?";
}

function formatHandle(handle) {
  if (!handle) {
    return null;
  }

  return `@${String(handle).replace(/^@/, "")}`;
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

function getPersonName(person) {
  return (
    person?.display_name ||
    formatHandle(person?.handle) ||
    "Triunely user"
  );
}

function getRoleDefinition(role) {
  return (
    STAFF_ROLE_OPTIONS.find(
      (option) => option.value === role
    ) || {
      value: role,
      title: "Platform Staff",
      description: "Protected Triunely platform authority.",
      icon: "shield-outline",
    }
  );
}

function ProfileAvatar({
  person,
  size = 48,
  backgroundColor = OLIVE,
}) {
  const name = getPersonName(person);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        backgroundColor,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: CARD_BORDER,
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
          {safeInitials(name)}
        </Text>
      )}
    </View>
  );
}

function Header({
  onBack,
  refreshing,
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
            ? OLIVE_SOFT
            : SURFACE,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          marginRight: 11,
        })}
      >
        <Ionicons
          name="chevron-back"
          size={23}
          color={OLIVE}
        />
      </Pressable>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            ...serifHeading,
            fontSize: 23,
            lineHeight: 28,
          }}
          numberOfLines={1}
        >
          Platform Staff
        </Text>

        <Text
          style={{
            color: MUTED,
            fontSize: 12,
            fontWeight: "700",
            lineHeight: 16,
            marginTop: 1,
          }}
          numberOfLines={1}
        >
          Triunely governance and delegated authority
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
            ? AMBER_SOFT
            : SURFACE,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          marginLeft: 10,
          opacity: refreshing ? 0.6 : 1,
        })}
      >
        {refreshing ? (
          <ActivityIndicator
            size="small"
            color={EVENT_AMBER}
          />
        ) : (
          <Ionicons
            name="refresh-outline"
            size={21}
            color={EVENT_AMBER}
          />
        )}
      </Pressable>
    </View>
  );
}

function AuthoritySummaryCard({ authority }) {
  const ownerLabel = authority?.is_platform_owner
    ? authority?.ownership_type === "founder"
      ? "Triunely Founder"
      : "Triunely Owner"
    : null;

  const roleDefinition = getRoleDefinition(
    authority?.staff_role
  );

  return (
    <View
      style={{
        ...premiumCardStyle,
        marginHorizontal: 16,
        padding: 17,
        borderColor: AMBER_BORDER,
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
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: AMBER_SOFT,
            borderWidth: 1,
            borderColor: AMBER_BORDER,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={25}
            color={EVENT_AMBER}
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
            Your platform authority
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 12.5,
              fontWeight: "700",
              lineHeight: 18,
              marginTop: 2,
            }}
          >
            Protected access is verified for every management
            action.
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          marginTop: 14,
          marginHorizontal: -4,
        }}
      >
        {ownerLabel ? (
          <View
            style={{
              margin: 4,
              paddingHorizontal: 11,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: AMBER_SOFT,
              borderWidth: 1,
              borderColor: AMBER_BORDER,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons
              name="diamond-outline"
              size={14}
              color={EVENT_AMBER}
            />

            <Text
              style={{
                color: EVENT_BROWN,
                fontSize: 11.5,
                fontWeight: "900",
                marginLeft: 5,
              }}
            >
              {ownerLabel}
            </Text>
          </View>
        ) : null}

        {authority?.staff_role ? (
          <View
            style={{
              margin: 4,
              paddingHorizontal: 11,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: OLIVE_SOFT,
              borderWidth: 1,
              borderColor: OLIVE_BORDER,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons
              name={roleDefinition.icon}
              size={14}
              color={OLIVE}
            />

            <Text
              style={{
                color: OLIVE,
                fontSize: 11.5,
                fontWeight: "900",
                marginLeft: 5,
              }}
            >
              {roleDefinition.title}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function StaffMemberCard({
  staffMember,
  currentUserId,
  onManage,
}) {
  const role = getRoleDefinition(staffMember?.staff_role);
  const isSelf =
    staffMember?.user_id === currentUserId;

  const handle = formatHandle(staffMember?.handle);

  return (
    <View
      style={{
        ...premiumCardStyle,
        padding: 15,
        marginBottom: 12,
        opacity: staffMember?.is_active ? 1 : 0.76,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
        }}
      >
        <ProfileAvatar
          person={staffMember}
          size={50}
          backgroundColor={
            staffMember?.is_active ? OLIVE : MUTED
          }
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
              flexWrap: "wrap",
            }}
          >
            <Text
              style={{
                color: TEXT,
                fontSize: 15,
                lineHeight: 20,
                fontWeight: "900",
                marginRight: 6,
              }}
              numberOfLines={1}
            >
              {getPersonName(staffMember)}
            </Text>

            {isSelf ? (
              <View
                style={{
                  borderRadius: 999,
                  backgroundColor: AMBER_SOFT,
                  borderWidth: 1,
                  borderColor: AMBER_BORDER,
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                }}
              >
                <Text
                  style={{
                    color: EVENT_BROWN,
                    fontSize: 9.5,
                    fontWeight: "900",
                  }}
                >
                  YOU
                </Text>
              </View>
            ) : null}
          </View>

          {handle ? (
            <Text
              style={{
                color: MUTED,
                fontSize: 12,
                fontWeight: "800",
                marginTop: 1,
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
                backgroundColor: OLIVE_SOFT,
                borderWidth: 1,
                borderColor: OLIVE_BORDER,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Ionicons
                name={role.icon}
                size={12}
                color={OLIVE}
              />

              <Text
                style={{
                  color: OLIVE,
                  fontSize: 10.5,
                  fontWeight: "900",
                  marginLeft: 4,
                }}
              >
                {role.title}
              </Text>
            </View>

            <View
              style={{
                margin: 3,
                borderRadius: 999,
                paddingHorizontal: 9,
                paddingVertical: 5,
                backgroundColor: staffMember?.is_active
                  ? OLIVE_SOFT
                  : DANGER_SOFT,
                borderWidth: 1,
                borderColor: staffMember?.is_active
                  ? OLIVE_BORDER
                  : DANGER_BORDER,
              }}
            >
              <Text
                style={{
                  color: staffMember?.is_active
                    ? OLIVE
                    : DANGER,
                  fontSize: 10.5,
                  fontWeight: "900",
                }}
              >
                {staffMember?.is_active
                  ? "Active"
                  : "Suspended"}
              </Text>
            </View>

            {staffMember?.is_platform_owner ? (
              <View
                style={{
                  margin: 3,
                  borderRadius: 999,
                  paddingHorizontal: 9,
                  paddingVertical: 5,
                  backgroundColor: AMBER_SOFT,
                  borderWidth: 1,
                  borderColor: AMBER_BORDER,
                }}
              >
                <Text
                  style={{
                    color: EVENT_BROWN,
                    fontSize: 10.5,
                    fontWeight: "900",
                  }}
                >
                  {staffMember?.ownership_type === "founder"
                    ? "Founder"
                    : "Owner"}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {!isSelf && !staffMember?.is_platform_owner ? (
          <Pressable
            onPress={() => onManage(staffMember)}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 39,
              height: 39,
              borderRadius: 20,
              backgroundColor: pressed
                ? AMBER_SOFT
                : SURFACE,
              borderWidth: 1,
              borderColor: CARD_BORDER,
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 8,
            })}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={20}
              color={EVENT_AMBER}
            />
          </Pressable>
        ) : null}
      </View>

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
            lineHeight: 16,
            fontWeight: "700",
          }}
        >
          Appointed {formatDateTime(staffMember?.appointed_at)}
        </Text>

        {staffMember?.appointed_by_display_name ||
        staffMember?.appointed_by_handle ? (
          <Text
            style={{
              color: MUTED,
              fontSize: 11,
              lineHeight: 16,
              fontWeight: "700",
              marginTop: 2,
            }}
          >
            By{" "}
            {staffMember?.appointed_by_display_name ||
              formatHandle(
                staffMember?.appointed_by_handle
              )}
          </Text>
        ) : null}

        {!staffMember?.is_active &&
        staffMember?.revoked_at ? (
          <Text
            style={{
              color: DANGER,
              fontSize: 11,
              lineHeight: 16,
              fontWeight: "800",
              marginTop: 2,
            }}
          >
            Suspended {formatDateTime(staffMember.revoked_at)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function SearchResultCard({
  person,
  onSelect,
}) {
  const currentRole = person?.current_staff_role
    ? getRoleDefinition(person.current_staff_role)
    : null;

  return (
    <Pressable
      onPress={() => onSelect(person)}
      style={({ pressed }) => ({
        ...premiumCardStyle,
        padding: 14,
        marginBottom: 10,
        backgroundColor: pressed
          ? "rgba(79, 99, 59, 0.05)"
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
          size={46}
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
              numberOfLines={1}
            >
              {formatHandle(person.handle)}
            </Text>
          ) : null}

          {currentRole ? (
            <Text
              style={{
                color: person?.current_staff_is_active
                  ? OLIVE
                  : DANGER,
                fontSize: 11,
                fontWeight: "900",
                marginTop: 4,
              }}
            >
              {currentRole.title}
              {person?.current_staff_is_active
                ? " · Active"
                : " · Suspended"}
            </Text>
          ) : (
            <Text
              style={{
                color: MUTED,
                fontSize: 11,
                fontWeight: "700",
                marginTop: 4,
              }}
            >
              Not currently platform staff
            </Text>
          )}
        </View>

        <Ionicons
          name="chevron-forward"
          size={19}
          color={EVENT_AMBER}
        />
      </View>
    </Pressable>
  );
}

function RoleOption({
  option,
  selected,
  disabled,
  onPress,
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        borderRadius: 19,
        borderWidth: 1.5,
        borderColor: selected
          ? AMBER_BORDER
          : CARD_BORDER,
        backgroundColor: selected
          ? AMBER_SOFT
          : pressed
          ? OLIVE_SOFT
          : SURFACE,
        padding: 14,
        marginBottom: 10,
        opacity: disabled ? 0.46 : 1,
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
            width: 41,
            height: 41,
            borderRadius: 21,
            backgroundColor: selected
              ? "rgba(180, 83, 9, 0.15)"
              : OLIVE_SOFT,
            borderWidth: 1,
            borderColor: selected
              ? AMBER_BORDER
              : OLIVE_BORDER,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 11,
          }}
        >
          <Ionicons
            name={option.icon}
            size={20}
            color={selected ? EVENT_AMBER : OLIVE}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: selected ? EVENT_BROWN : TEXT,
              fontSize: 14,
              fontWeight: "900",
            }}
          >
            {option.title}
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 11.5,
              lineHeight: 16,
              fontWeight: "700",
              marginTop: 3,
            }}
          >
            {option.description}
          </Text>
        </View>

        <Ionicons
          name={
            selected
              ? "radio-button-on"
              : "radio-button-off"
          }
          size={21}
          color={selected ? EVENT_AMBER : MUTED}
        />
      </View>
    </Pressable>
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
      statusBarTranslucent
      animationType="fade"
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
                ? DANGER_SOFT
                : OLIVE_SOFT,
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
              color={destructive ? DANGER : OLIVE}
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
              lineHeight: 20,
              fontWeight: "700",
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
                : OLIVE,
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

function AppointmentModal({
  visible,
  person,
  selectedRole,
  saving,
  canAppointPlatformAdmins,
  bottomInset,
  onSelectRole,
  onConfirm,
  onClose,
}) {
  if (!person) {
    return null;
  }

  const isExistingStaff =
    Boolean(person?.current_staff_role);

  const sameRole =
    person?.current_staff_role === selectedRole;

  const canSubmit =
    Boolean(selectedRole) &&
    !saving &&
    !(
      isExistingStaff &&
      person?.current_staff_is_active &&
      sameRole
    );

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={saving ? undefined : onClose}
    >
      <KeyboardAvoidingView
        behavior={
          Platform.OS === "ios" ? "padding" : "height"
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
            onPress={(event) => event.stopPropagation()}
            style={{
              maxHeight: "90%",
              backgroundColor: PREMIUM_CREAM,
              borderTopLeftRadius: 29,
              borderTopRightRadius: 29,
              borderWidth: 1,
              borderColor: AMBER_BORDER,
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
                  marginBottom: 17,
                }}
              >
                <ProfileAvatar
                  person={person}
                  size={62}
                />

                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 21,
                    lineHeight: 26,
                    textAlign: "center",
                    marginTop: 11,
                  }}
                >
                  {isExistingStaff
                    ? "Update platform authority"
                    : "Appoint platform staff"}
                </Text>

                <Text
                  style={{
                    color: TEXT,
                    fontSize: 14,
                    fontWeight: "900",
                    textAlign: "center",
                    marginTop: 7,
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

              <Text
                style={{
                  color: TEXT,
                  fontSize: 12,
                  fontWeight: "900",
                  marginBottom: 9,
                  textTransform: "uppercase",
                  letterSpacing: 0.45,
                }}
              >
                Select platform role
              </Text>

              {STAFF_ROLE_OPTIONS.map((option) => (
                <RoleOption
                  key={option.value}
                  option={option}
                  selected={
                    selectedRole === option.value
                  }
                  disabled={
                    option.value === "platform_admin" &&
                    !canAppointPlatformAdmins
                  }
                  onPress={() =>
                    onSelectRole(option.value)
                  }
                />
              ))}

              {!canAppointPlatformAdmins ? (
                <View
                  style={{
                    borderRadius: 17,
                    backgroundColor: AMBER_SOFT,
                    borderWidth: 1,
                    borderColor: AMBER_BORDER,
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={17}
                    color={EVENT_AMBER}
                    style={{ marginTop: 1 }}
                  />

                  <Text
                    style={{
                      flex: 1,
                      color: EVENT_BROWN,
                      fontSize: 11.5,
                      lineHeight: 17,
                      fontWeight: "800",
                      marginLeft: 8,
                    }}
                  >
                    Only an active Triunely Owner can appoint
                    Platform Admins.
                  </Text>
                </View>
              ) : null}

              <Pressable
                onPress={onConfirm}
                disabled={!canSubmit}
                style={({ pressed }) => ({
                  minHeight: 50,
                  borderRadius: 999,
                  backgroundColor: !canSubmit
                    ? "rgba(107, 114, 128, 0.18)"
                    : pressed
                    ? "#92400E"
                    : EVENT_AMBER,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 3,
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
                    {isExistingStaff
                      ? person?.current_staff_is_active
                        ? "Confirm Role Change"
                        : "Restore with Selected Role"
                      : "Confirm Appointment"}
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
                    ? OLIVE_SOFT
                    : SURFACE,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 10,
                })}
              >
                <Text
                  style={{
                    color: OLIVE,
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

function StaffActionsModal({
  visible,
  staffMember,
  saving,
  authority,
  bottomInset,
  onChangeRole,
  onToggleActive,
  onClose,
}) {
  if (!staffMember) {
    return null;
  }

  const role = getRoleDefinition(
    staffMember?.staff_role
  );

  const actorCanManageTarget =
    authority?.is_platform_owner ||
    staffMember?.staff_role !== "platform_admin";

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
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
            borderColor: CARD_BORDER,
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
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 18,
            }}
          >
            <ProfileAvatar
              person={staffMember}
              size={54}
            />

            <View
              style={{
                flex: 1,
                minWidth: 0,
                marginLeft: 12,
              }}
            >
              <Text
                style={{
                  ...serifHeading,
                  fontSize: 19,
                  lineHeight: 24,
                }}
                numberOfLines={1}
              >
                {getPersonName(staffMember)}
              </Text>

              <Text
                style={{
                  color: OLIVE,
                  fontSize: 12,
                  fontWeight: "900",
                  marginTop: 3,
                }}
              >
                {role.title}
              </Text>
            </View>
          </View>

          {!actorCanManageTarget ? (
            <View
              style={{
                borderRadius: 18,
                backgroundColor: AMBER_SOFT,
                borderWidth: 1,
                borderColor: AMBER_BORDER,
                padding: 13,
                flexDirection: "row",
                alignItems: "flex-start",
              }}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={EVENT_AMBER}
                style={{ marginTop: 1 }}
              />

              <Text
                style={{
                  flex: 1,
                  color: EVENT_BROWN,
                  fontSize: 12,
                  lineHeight: 18,
                  fontWeight: "800",
                  marginLeft: 8,
                }}
              >
                Only a Triunely Owner can manage another
                Platform Admin.
              </Text>
            </View>
          ) : (
            <>
              <Pressable
                onPress={onChangeRole}
                disabled={saving}
                style={({ pressed }) => ({
                  minHeight: 52,
                  borderRadius: 18,
                  backgroundColor: pressed
                    ? AMBER_SOFT
                    : SURFACE,
                  borderWidth: 1,
                  borderColor: AMBER_BORDER,
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 14,
                  marginBottom: 10,
                })}
              >
                <View
                  style={{
                    width: 37,
                    height: 37,
                    borderRadius: 19,
                    backgroundColor: AMBER_SOFT,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 11,
                  }}
                >
                  <Ionicons
                    name="swap-horizontal-outline"
                    size={19}
                    color={EVENT_AMBER}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: TEXT,
                      fontSize: 13.5,
                      fontWeight: "900",
                    }}
                  >
                    Change platform role
                  </Text>

                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 11,
                      fontWeight: "700",
                      marginTop: 2,
                    }}
                  >
                    Select a different delegated authority
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={EVENT_AMBER}
                />
              </Pressable>

              <Pressable
                onPress={onToggleActive}
                disabled={saving}
                style={({ pressed }) => ({
                  minHeight: 52,
                  borderRadius: 18,
                  backgroundColor: pressed
                    ? staffMember?.is_active
                      ? DANGER_SOFT
                      : OLIVE_SOFT
                    : SURFACE,
                  borderWidth: 1,
                  borderColor: staffMember?.is_active
                    ? DANGER_BORDER
                    : OLIVE_BORDER,
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 14,
                })}
              >
                <View
                  style={{
                    width: 37,
                    height: 37,
                    borderRadius: 19,
                    backgroundColor: staffMember?.is_active
                      ? DANGER_SOFT
                      : OLIVE_SOFT,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 11,
                  }}
                >
                  <Ionicons
                    name={
                      staffMember?.is_active
                        ? "pause-circle-outline"
                        : "play-circle-outline"
                    }
                    size={20}
                    color={
                      staffMember?.is_active
                        ? DANGER
                        : OLIVE
                    }
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: staffMember?.is_active
                        ? DANGER
                        : OLIVE,
                      fontSize: 13.5,
                      fontWeight: "900",
                    }}
                  >
                    {staffMember?.is_active
                      ? "Suspend platform authority"
                      : "Restore platform authority"}
                  </Text>

                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 11,
                      fontWeight: "700",
                      marginTop: 2,
                    }}
                  >
                    {staffMember?.is_active
                      ? "Immediately removes protected access"
                      : "Restores the existing platform role"}
                  </Text>
                </View>

                {saving ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      staffMember?.is_active
                        ? DANGER
                        : OLIVE
                    }
                  />
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={
                      staffMember?.is_active
                        ? DANGER
                        : OLIVE
                    }
                  />
                )}
              </Pressable>
            </>
          )}

          <Pressable
            onPress={onClose}
            disabled={saving}
            style={({ pressed }) => ({
              minHeight: 48,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: CARD_BORDER,
              backgroundColor: pressed
                ? OLIVE_SOFT
                : SURFACE,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 13,
            })}
          >
            <Text
              style={{
                color: OLIVE,
                fontSize: 14,
                fontWeight: "900",
              }}
            >
              Close
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ConfirmationModal({
  visible,
  title,
  message,
  confirmLabel,
  destructive,
  saving,
  bottomInset,
  onConfirm,
  onClose,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
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
            borderColor: destructive
              ? DANGER_BORDER
              : OLIVE_BORDER,
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
              width: 58,
              height: 58,
              borderRadius: 29,
              alignItems: "center",
              justifyContent: "center",
              alignSelf: "center",
              backgroundColor: destructive
                ? DANGER_SOFT
                : OLIVE_SOFT,
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
                  : "shield-checkmark-outline"
              }
              size={29}
              color={destructive ? DANGER : OLIVE}
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
            {title}
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 13.5,
              lineHeight: 20,
              fontWeight: "700",
              textAlign: "center",
              marginTop: 8,
            }}
          >
            {message}
          </Text>

          <Pressable
            onPress={onConfirm}
            disabled={saving}
            style={({ pressed }) => ({
              minHeight: 49,
              borderRadius: 999,
              backgroundColor: destructive
                ? pressed
                  ? "#7F1D1D"
                  : DANGER
                : pressed
                ? "#3F512F"
                : OLIVE,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 20,
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
              borderColor: CARD_BORDER,
              backgroundColor: pressed
                ? OLIVE_SOFT
                : SURFACE,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 10,
            })}
          >
            <Text
              style={{
                color: OLIVE,
                fontSize: 14,
                fontWeight: "900",
              }}
            >
              Go Back
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function TriunelyPlatformStaffManagement() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [authority, setAuthority] = useState(null);
  const [currentUserId, setCurrentUserId] =
    useState(null);

  const [staffDirectory, setStaffDirectory] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

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

  const [selectedRole, setSelectedRole] =
    useState("");

  const [appointmentModalVisible, setAppointmentModalVisible] =
    useState(false);

  const [selectedStaffMember, setSelectedStaffMember] =
    useState(null);

  const [staffActionsVisible, setStaffActionsVisible] =
    useState(false);

  const [confirmation, setConfirmation] =
    useState(null);

  const [saving, setSaving] =
    useState(false);

  const [information, setInformation] =
    useState({
      visible: false,
      title: "",
      message: "",
      destructive: false,
    });

  const activeStaff = useMemo(
    () =>
      staffDirectory.filter(
        (member) => member?.is_active
      ),
    [staffDirectory]
  );

  const suspendedStaff = useMemo(
    () =>
      staffDirectory.filter(
        (member) => !member?.is_active
      ),
    [staffDirectory]
  );

  const showInformation = useCallback(
    ({
      title,
      message,
      destructive = false,
    }) => {
      setInformation({
        visible: true,
        title,
        message,
        destructive,
      });
    },
    []
  );

  const loadPlatformStaff = useCallback(
    async ({ showRefresh = false } = {}) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        const uid =
          sessionData?.session?.user?.id || null;

        setCurrentUserId(uid);

        if (!uid) {
          throw new Error(
            "You must be signed in to manage Triunely platform staff."
          );
        }

        const {
          data: authorityData,
          error: authorityError,
        } = await supabase.rpc(
          "get_my_triunely_platform_authority_rpc"
        );

        if (authorityError) {
          throw authorityError;
        }

        const resolvedAuthority =
          Array.isArray(authorityData)
            ? authorityData[0] || null
            : authorityData || null;

        setAuthority(resolvedAuthority);

        if (
          !resolvedAuthority?.can_manage_platform_staff
        ) {
          setStaffDirectory([]);
          return;
        }

        const {
          data: directoryData,
          error: directoryError,
        } = await supabase.rpc(
          "get_triunely_platform_staff_directory_rpc"
        );

        if (directoryError) {
          throw directoryError;
        }

        setStaffDirectory(
          Array.isArray(directoryData)
            ? directoryData
            : []
        );
      } catch (error) {
        console.log(
          "Platform staff management load error:",
          error
        );

        showInformation({
          title: "Unable to load platform staff",
          message:
            error?.message ||
            "Triunely could not load platform staff management right now.",
          destructive: true,
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showInformation]
  );

  useFocusEffect(
    useCallback(() => {
      loadPlatformStaff();
    }, [loadPlatformStaff])
  );

  const searchUsers = useCallback(
    async ({
      queryOverride,
      showValidationMessage = true,
    } = {}) => {
      const query = String(
        queryOverride ?? searchQuery
      ).trim();

      if (query.replace(/^@/, "").length < 2) {
        setSearchResults([]);
        setSearchAttempted(false);

        if (showValidationMessage) {
          showInformation({
            title: "Enter more information",
            message:
              "Enter at least two characters from the person's name or @username.",
          });
        }

        return;
      }

      try {
        setSearching(true);
        setSearchAttempted(true);

        const { data, error } = await supabase.rpc(
          "search_triunely_users_for_platform_staff_rpc",
          {
            p_search_query: query,
            p_limit: 20,
          }
        );

        if (error) {
          throw error;
        }

        setSearchResults(
          Array.isArray(data) ? data : []
        );
      } catch (error) {
        console.log(
          "Platform staff user search error:",
          error
        );

        setSearchResults([]);

        if (showValidationMessage) {
          showInformation({
            title: "Search unavailable",
            message:
              error?.message ||
              "Triunely could not search for users right now.",
            destructive: true,
          });
        }
      } finally {
        setSearching(false);
      }
    },
    [searchQuery, showInformation]
  );

  useEffect(() => {
    const query = searchQuery.trim();
    const normalizedQuery = query.replace(/^@/, "");

    if (normalizedQuery.length < 2) {
      setSearchResults([]);
      setSearchAttempted(false);
      setSearching(false);
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      searchUsers({
        queryOverride: query,
        showValidationMessage: false,
      });
    }, 350);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchQuery, searchUsers]);

  const openAppointment = useCallback(
    (person) => {
      if (person?.is_platform_owner) {
        showInformation({
          title: "Protected Triunely Owner",
          message:
            "Triunely Owner authority cannot be managed through ordinary platform staff controls.",
        });
        return;
      }

      setSelectedPerson(person);

      setSelectedRole(
        person?.current_staff_role ||
          "platform_reviewer"
      );

      setAppointmentModalVisible(true);
    },
    [showInformation]
  );

  const closeAppointment = useCallback(() => {
    if (saving) {
      return;
    }

    setAppointmentModalVisible(false);
    setSelectedPerson(null);
    setSelectedRole("");
  }, [saving]);

  const confirmAppointment = useCallback(
    async () => {
      if (
        !selectedPerson?.user_id ||
        !selectedRole ||
        saving
      ) {
        return;
      }

      try {
        setSaving(true);

        const isExistingStaff =
          Boolean(
            selectedPerson?.current_staff_role
          );

        let error = null;

        if (
          isExistingStaff &&
          selectedPerson?.current_staff_is_active
        ) {
          const response = await supabase.rpc(
            "change_triunely_platform_staff_role_rpc",
            {
              p_target_user_id:
                selectedPerson.user_id,
              p_new_staff_role: selectedRole,
            }
          );

          error = response.error;
        } else {
          const response = await supabase.rpc(
            "appoint_triunely_platform_staff_rpc",
            {
              p_target_user_id:
                selectedPerson.user_id,
              p_staff_role: selectedRole,
            }
          );

          error = response.error;
        }

        if (error) {
          throw error;
        }

        setAppointmentModalVisible(false);
        setSelectedPerson(null);
        setSelectedRole("");
        setSearchResults([]);
        setSearchQuery("");
        setSearchAttempted(false);

        await loadPlatformStaff({
          showRefresh: true,
        });

        showInformation({
          title: isExistingStaff
            ? "Platform authority updated"
            : "Platform staff appointed",
          message: isExistingStaff
            ? "The person's protected platform authority has been updated and permanently audited."
            : "The person now has delegated Triunely platform authority. The appointment has been permanently audited.",
        });
      } catch (error) {
        console.log(
          "Platform staff appointment error:",
          error
        );

        showInformation({
          title: "Authority not changed",
          message:
            error?.message ||
            "Triunely could not update this person's platform authority.",
          destructive: true,
        });
      } finally {
        setSaving(false);
      }
    },
    [
      selectedPerson,
      selectedRole,
      saving,
      loadPlatformStaff,
      showInformation,
    ]
  );

  const openStaffActions = useCallback(
    (staffMember) => {
      setSelectedStaffMember(staffMember);
      setStaffActionsVisible(true);
    },
    []
  );

  const closeStaffActions = useCallback(() => {
    if (saving) {
      return;
    }

    setStaffActionsVisible(false);
    setSelectedStaffMember(null);
  }, [saving]);

  const openRoleChange = useCallback(() => {
    if (!selectedStaffMember) {
      return;
    }

    setStaffActionsVisible(false);

    setSelectedPerson({
      user_id: selectedStaffMember.user_id,
      display_name:
        selectedStaffMember.display_name,
      handle: selectedStaffMember.handle,
      avatar_url:
        selectedStaffMember.avatar_url,
      current_staff_role:
        selectedStaffMember.staff_role,
      current_staff_is_active:
        selectedStaffMember.is_active,
      is_platform_owner:
        selectedStaffMember.is_platform_owner,
      ownership_type:
        selectedStaffMember.ownership_type,
    });

    setSelectedRole(
      selectedStaffMember.staff_role
    );

    setAppointmentModalVisible(true);
  }, [selectedStaffMember]);

  const requestToggleActive = useCallback(() => {
    if (!selectedStaffMember) {
      return;
    }

    const willRestore =
      !selectedStaffMember.is_active;

    setStaffActionsVisible(false);

    setConfirmation({
      type: "toggle_active",
      staffMember: selectedStaffMember,
      title: willRestore
        ? "Restore platform authority?"
        : "Suspend platform authority?",
      message: willRestore
        ? `${getPersonName(
            selectedStaffMember
          )} will immediately regain access attached to the ${
            getRoleDefinition(
              selectedStaffMember.staff_role
            ).title
          } role.`
        : `${getPersonName(
            selectedStaffMember
          )} will immediately lose protected platform access. Their staff record and audit history will remain preserved.`,
      confirmLabel: willRestore
        ? "Restore Authority"
        : "Suspend Authority",
      destructive: !willRestore,
    });
  }, [selectedStaffMember]);

  const closeConfirmation = useCallback(() => {
    if (saving) {
      return;
    }

    setConfirmation(null);
  }, [saving]);

  const confirmToggleActive = useCallback(
    async () => {
      const staffMember =
        confirmation?.staffMember;

      if (
        !staffMember?.user_id ||
        confirmation?.type !== "toggle_active" ||
        saving
      ) {
        return;
      }

      const nextActiveStatus =
        !staffMember.is_active;

      try {
        setSaving(true);

        const { error } = await supabase.rpc(
          "set_triunely_platform_staff_active_rpc",
          {
            p_target_user_id:
              staffMember.user_id,
            p_is_active: nextActiveStatus,
          }
        );

        if (error) {
          throw error;
        }

        setConfirmation(null);
        setSelectedStaffMember(null);

        await loadPlatformStaff({
          showRefresh: true,
        });

        showInformation({
          title: nextActiveStatus
            ? "Platform authority restored"
            : "Platform authority suspended",
          message: nextActiveStatus
            ? "The staff member's existing platform role is active again. This action has been permanently audited."
            : "Protected platform access has been removed immediately. The staff record and audit history remain preserved.",
        });
      } catch (error) {
        console.log(
          "Platform staff status change error:",
          error
        );

        showInformation({
          title: "Authority not changed",
          message:
            error?.message ||
            "Triunely could not change this person's platform authority.",
          destructive: true,
        });
      } finally {
        setSaving(false);
      }
    },
    [
      confirmation,
      saving,
      loadPlatformStaff,
      showInformation,
    ]
  );

  if (loading) {
    return (
      <Screen
        style={{
          flex: 1,
          backgroundColor: PREMIUM_CREAM,
        }}
      >
        <Header
          onBack={() => navigation.goBack()}
          refreshing={false}
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
            color={EVENT_AMBER}
          />

          <Text
            style={{
              color: MUTED,
              fontSize: 13.5,
              fontWeight: "800",
              marginTop: 13,
              textAlign: "center",
            }}
          >
            Loading protected platform authority…
          </Text>
        </View>
      </Screen>
    );
  }

  if (!authority?.can_manage_platform_staff) {
    return (
      <Screen
        style={{
          flex: 1,
          backgroundColor: PREMIUM_CREAM,
        }}
      >
        <Header
          onBack={() => navigation.goBack()}
          refreshing={false}
          onRefresh={() => loadPlatformStaff()}
        />

        <View
          style={{
            flex: 1,
            paddingHorizontal: 18,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              ...premiumCardStyle,
              width: "100%",
              padding: 22,
              alignItems: "center",
              borderColor: DANGER_BORDER,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: DANGER_SOFT,
                borderWidth: 1,
                borderColor: DANGER_BORDER,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="lock-closed-outline"
                size={31}
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
              Protected Platform Area
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 13.5,
                lineHeight: 20,
                fontWeight: "700",
                textAlign: "center",
                marginTop: 8,
              }}
            >
              Only active Triunely Owners and Platform
              Admins can manage delegated platform
              authority.
            </Text>

            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => ({
                minHeight: 48,
                borderRadius: 999,
                backgroundColor: pressed
                  ? "#3F512F"
                  : OLIVE,
                paddingHorizontal: 24,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 19,
              })}
            >
              <Text
                style={{
                  color: SURFACE,
                  fontSize: 14,
                  fontWeight: "900",
                }}
              >
                Return to Profile
              </Text>
            </Pressable>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      style={{
        flex: 1,
        backgroundColor: PREMIUM_CREAM,
      }}
    >
      <Header
        onBack={() => navigation.goBack()}
        refreshing={refreshing}
        onRefresh={() =>
          loadPlatformStaff({
            showRefresh: true,
          })
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              loadPlatformStaff({
                showRefresh: true,
              })
            }
            tintColor={EVENT_AMBER}
          />
        }
        contentContainerStyle={{
          paddingBottom: Math.max(
            30,
            insets.bottom + 24
          ),
        }}
      >
        <AuthoritySummaryCard
          authority={authority}
        />

        <View
          style={{
            marginHorizontal: 16,
            marginTop: 16,
          }}
        >
          <View
            style={{
              ...premiumCardStyle,
              padding: 16,
              borderColor: OLIVE_BORDER,
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
                  width: 43,
                  height: 43,
                  borderRadius: 22,
                  backgroundColor: OLIVE_SOFT,
                  borderWidth: 1,
                  borderColor: OLIVE_BORDER,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 11,
                }}
              >
                <Ionicons
                  name="person-add-outline"
                  size={21}
                  color={OLIVE}
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
                  Appoint platform staff
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 12,
                    lineHeight: 17,
                    fontWeight: "700",
                    marginTop: 2,
                  }}
                >
                  Search by name or unique @username
                </Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 14,
              }}
            >
              <View
                style={{
                  flex: 1,
                  minHeight: 49,
                  borderRadius: 17,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  backgroundColor: PREMIUM_CREAM,
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
                  onSubmitEditing={() => searchUsers()}
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
                      setSearchQuery("");
                      setSearchResults([]);
                      setSearchAttempted(false);
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
                  minWidth: 50,
                  height: 49,
                  borderRadius: 17,
                  backgroundColor: pressed
                    ? "#3F512F"
                    : OLIVE,
                  alignItems: "center",
                  justifyContent: "center",
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
            <View style={{ marginTop: 13 }}>
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
                Search results
              </Text>

              {searchResults.map((person) => (
                <SearchResultCard
                  key={person.user_id}
                  person={person}
                  onSelect={openAppointment}
                />
              ))}
            </View>
          ) : searchAttempted && !searching ? (
            <View
              style={{
                ...premiumCardStyle,
                marginTop: 13,
                padding: 18,
                alignItems: "center",
              }}
            >
              <Ionicons
                name="search-outline"
                size={26}
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
                No users found
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 12,
                  lineHeight: 17,
                  fontWeight: "700",
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                Check the spelling or search using the
                person's unique @username.
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={{
            marginHorizontal: 16,
            marginTop: 20,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginBottom: 11,
              paddingHorizontal: 2,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  ...serifHeading,
                  fontSize: 21,
                  lineHeight: 26,
                }}
              >
                Active platform staff
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 12,
                  lineHeight: 17,
                  fontWeight: "700",
                  marginTop: 2,
                }}
              >
                {activeStaff.length} active{" "}
                {activeStaff.length === 1
                  ? "staff member"
                  : "staff members"}
              </Text>
            </View>
          </View>

          {activeStaff.length > 0 ? (
            activeStaff.map((staffMember) => (
              <StaffMemberCard
                key={staffMember.user_id}
                staffMember={staffMember}
                currentUserId={currentUserId}
                onManage={openStaffActions}
              />
            ))
          ) : (
            <View
              style={{
                ...premiumCardStyle,
                padding: 18,
              }}
            >
              <Text
                style={{
                  color: MUTED,
                  fontSize: 13,
                  lineHeight: 19,
                  fontWeight: "700",
                  textAlign: "center",
                }}
              >
                No active platform staff records were found.
              </Text>
            </View>
          )}
        </View>

        {suspendedStaff.length > 0 ? (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 20,
            }}
          >
            <Text
              style={{
                ...serifHeading,
                fontSize: 21,
                lineHeight: 26,
                marginBottom: 3,
                paddingHorizontal: 2,
              }}
            >
              Suspended authority
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 12,
                lineHeight: 17,
                fontWeight: "700",
                marginBottom: 11,
                paddingHorizontal: 2,
              }}
            >
              Preserved staff records with no current
              platform access
            </Text>

            {suspendedStaff.map((staffMember) => (
              <StaffMemberCard
                key={staffMember.user_id}
                staffMember={staffMember}
                currentUserId={currentUserId}
                onManage={openStaffActions}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <AppointmentModal
        visible={appointmentModalVisible}
        person={selectedPerson}
        selectedRole={selectedRole}
        saving={saving}
        canAppointPlatformAdmins={
          authority?.can_appoint_platform_admins ===
          true
        }
        bottomInset={insets.bottom}
        onSelectRole={setSelectedRole}
        onConfirm={confirmAppointment}
        onClose={closeAppointment}
      />

      <StaffActionsModal
        visible={staffActionsVisible}
        staffMember={selectedStaffMember}
        saving={saving}
        authority={authority}
        bottomInset={insets.bottom}
        onChangeRole={openRoleChange}
        onToggleActive={requestToggleActive}
        onClose={closeStaffActions}
      />

      <ConfirmationModal
        visible={Boolean(confirmation)}
        title={confirmation?.title || ""}
        message={confirmation?.message || ""}
        confirmLabel={
          confirmation?.confirmLabel || "Confirm"
        }
        destructive={
          confirmation?.destructive === true
        }
        saving={saving}
        bottomInset={insets.bottom}
        onConfirm={confirmToggleActive}
        onClose={closeConfirmation}
      />

      <InformationModal
        visible={information.visible}
        title={information.title}
        message={information.message}
        destructive={information.destructive}
        onClose={() =>
          setInformation((current) => ({
            ...current,
            visible: false,
          }))
        }
      />
    </Screen>
  );
}