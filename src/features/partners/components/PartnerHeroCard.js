// src/features/partners/components/PartnerHeroCard.js
import { Ionicons } from "@expo/vector-icons";
import {
    ActivityIndicator,
    Image,
    Platform,
    Pressable,
    Text,
    View,
} from "react-native";

import VerifiedBadge from "../../../components/VerifiedBadge";


const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";

const CARD_BORDER =
  "rgba(15, 23, 42, 0.08)";
const AMBER_SOFT =
  "rgba(180, 83, 9, 0.10)";
const AMBER_BORDER =
  "rgba(180, 83, 9, 0.18)";
const OLIVE_SOFT =
  "rgba(79, 99, 59, 0.10)";
const OLIVE_BORDER =
  "rgba(79, 99, 59, 0.18)";
const SHADOW =
  "rgba(15, 23, 42, 0.10)";

const displayFont =
  Platform.OS === "ios"
    ? "Georgia"
    : "serif";

const serifHeading = {
  fontFamily: displayFont,
  color: TEXT,
  fontWeight: "900",
  letterSpacing: -0.45,
};

const premiumCardStyle = {
  backgroundColor: SURFACE,
  borderRadius: 24,
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

function safeInitials(name) {
  if (!name) return "?";

  const parts = String(name)
    .trim()
    .split(" ")
    .filter(Boolean);

  if (parts.length >= 2) {
    return (
      parts[0][0] +
      parts[1][0]
    ).toUpperCase();
  }

  return (
    String(name)
      .trim()[0]
      ?.toUpperCase() || "?"
  );
}

function InfoPill({
  icon,
  label,
  amber = false,
}) {
  if (!label) return null;

  const color = amber
    ? EVENT_BROWN
    : OLIVE;

  const backgroundColor = amber
    ? AMBER_SOFT
    : OLIVE_SOFT;

  const borderColor = amber
    ? AMBER_BORDER
    : OLIVE_BORDER;

  return (
    <View
      style={{
        borderRadius: 999,
        backgroundColor,
        borderWidth: 1,
        borderColor,
        paddingHorizontal: 10,
        paddingVertical: 7,
        flexDirection: "row",
        alignItems: "center",
        marginRight: 7,
        marginBottom: 7,
      }}
    >
      <Ionicons
        name={icon}
        size={14}
        color={color}
        style={{
          marginRight: 6,
        }}
      />

      <Text
        style={{
          color,
          fontSize: 12,
          fontWeight: "900",
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

function HeroActionButton({
  label,
  icon,
  onPress,
  amber = false,
  disabled = false,
}) {
  const backgroundColor = amber
    ? AMBER_SOFT
    : OLIVE_SOFT;

  const borderColor = amber
    ? AMBER_BORDER
    : OLIVE_BORDER;

  const color = amber
    ? EVENT_BROWN
    : OLIVE;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flex: 1,
        borderRadius: 17,
        paddingVertical: 11,
        paddingHorizontal: 10,
        backgroundColor,
        borderWidth: 1,
        borderColor,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        opacity: disabled
          ? 0.45
          : pressed
            ? 0.84
            : 1,
      })}
    >
      <Ionicons
        name={icon}
        size={16}
        color={color}
        style={{
          marginRight: 6,
        }}
      />

      <Text
        style={{
          color,
          fontSize: 12.5,
          fontWeight: "900",
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function PartnerConnectionButton({
  isConnected = false,
  connectionCount = 0,
  connectionLoading = false,
  onPress,
}) {
  const backgroundColor =
    isConnected
      ? OLIVE_SOFT
      : EVENT_AMBER;

  const borderColor =
    isConnected
      ? OLIVE_BORDER
      : EVENT_AMBER;

  const contentColor =
    isConnected
      ? OLIVE
      : SURFACE;

  return (
    <View
      style={{
        marginTop: 15,
      }}
    >
      <Pressable
        onPress={onPress}
        disabled={connectionLoading}
        style={({ pressed }) => ({
          minHeight: 48,
          borderRadius: 18,
          backgroundColor,
          borderWidth: 1,
          borderColor,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          opacity: connectionLoading
            ? 0.66
            : pressed
              ? 0.84
              : 1,
          shadowColor:
            isConnected
              ? SHADOW
              : EVENT_AMBER,
          shadowOpacity:
            isConnected
              ? 0.04
              : pressed
                ? 0.06
                : 0.18,
          shadowRadius:
            pressed ? 3 : 8,
          shadowOffset: {
            width: 0,
            height: pressed ? 1 : 4,
          },
          elevation:
            pressed ? 1 : 3,
          transform: [
            {
              translateY:
                pressed ? 2 : 0,
            },
            {
              scale:
                pressed ? 0.99 : 1,
            },
          ],
        })}
      >
        {connectionLoading ? (
          <ActivityIndicator
            size="small"
            color={contentColor}
          />
        ) : (
          <>
            <Ionicons
              name={
                isConnected
                  ? "checkmark-circle"
                  : "person-add-outline"
              }
              size={19}
              color={contentColor}
              style={{
                marginRight: 8,
              }}
            />

            <Text
              style={{
                color: contentColor,
                fontSize: 14,
                fontWeight: "900",
              }}
            >
              {isConnected
                ? "Connected"
                : "Connect"}
            </Text>
          </>
        )}
      </Pressable>

      <View
        style={{
          marginTop: 8,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name="people-outline"
          size={14}
          color={MUTED}
          style={{
            marginRight: 5,
          }}
        />

        <Text
          style={{
            color: MUTED,
            fontSize: 12,
            lineHeight: 17,
            fontWeight: "800",
          }}
        >
          {connectionCount}{" "}
          {connectionCount === 1
            ? "connection"
            : "connections"}
        </Text>
      </View>
    </View>
  );
}

export default function PartnerHeroCard({
  partner,
  typeIcon,
  typeLabel,
  showVerifiedBadge = false,
  isOwner = false,
  isConnected = false,
  connectionCount = 0,
  connectionLoading = false,
  onConnectionPress,
  onMessagePress,
  onWebsitePress,
  onEmailPress,
}) {
  const initials =
    safeInitials(partner?.name);

  return (
    <View
      style={{
        ...premiumCardStyle,
        marginHorizontal: 16,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          height: 154,
          backgroundColor:
            OLIVE_SOFT,
          overflow: "hidden",
        }}
      >
        {partner?.cover_image_url ? (
          <Image
            source={{
              uri:
                partner.cover_image_url,
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
              flex: 1,
              backgroundColor:
                OLIVE_SOFT,
              alignItems: "center",
              justifyContent:
                "center",
            }}
          >
            <Ionicons
              name={typeIcon}
              size={32}
              color={OLIVE}
            />
          </View>
        )}

        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor:
              "rgba(0,0,0,0.12)",
          }}
        />
      </View>

      <View
        style={{
          paddingHorizontal: 16,
          paddingBottom: 16,
          marginTop: -44,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
          }}
        >
          <View
            style={{
              width: 92,
              height: 92,
              borderRadius: 28,
              backgroundColor: OLIVE,
              borderWidth: 4,
              borderColor: SURFACE,
              overflow: "hidden",
              alignItems: "center",
              justifyContent:
                "center",
              shadowColor: SHADOW,
              shadowOpacity: 0.12,
              shadowRadius: 12,
              shadowOffset: {
                width: 0,
                height: 5,
              },
              elevation: 4,
            }}
          >
            {partner?.logo_url ? (
              <Image
                source={{
                  uri:
                    partner.logo_url,
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
                  fontSize: 30,
                  fontWeight: "900",
                }}
              >
                {initials}
              </Text>
            )}
          </View>

          <View
            style={{
              marginLeft: "auto",
            }}
          />
        </View>

        <View
          style={{
            marginTop: 12,
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
                ...serifHeading,
                fontSize: 28,
                lineHeight: 34,
                flexShrink: 1,
              }}
            >
              {partner?.name}
            </Text>

{showVerifiedBadge === true ? (
              <View
                style={{
                  marginLeft: 8,
                  marginTop: 2,
                }}
              >
                <VerifiedBadge
                  size={21}
                />
              </View>
            ) : null}
          </View>

          <View
            style={{
              marginTop: 8,
              flexDirection: "row",
              flexWrap: "wrap",
            }}
          >
            <InfoPill
              icon={typeIcon}
              label={typeLabel}
              amber
            />

            <InfoPill
              icon="pricetag-outline"
              label={
                partner?.category
              }
            />

            <InfoPill
              icon="location-outline"
              label={
                partner?.location_text
              }
            />
          </View>

          {partner?.short_description ? (
            <Text
              style={{
                color: TEXT,
                fontSize: 14.5,
                fontWeight: "700",
                lineHeight: 22,
                marginTop: 8,
              }}
            >
              {
                partner.short_description
              }
            </Text>
          ) : null}

          {!isOwner ? (
            <PartnerConnectionButton
              isConnected={
                isConnected
              }
              connectionCount={
                connectionCount
              }
              connectionLoading={
                connectionLoading
              }
              onPress={
                onConnectionPress
              }
            />
          ) : (
            <View
              style={{
                marginTop: 14,
                borderRadius: 18,
                paddingHorizontal: 14,
                paddingVertical: 11,
                backgroundColor:
                  OLIVE_SOFT,
                borderWidth: 1,
                borderColor:
                  OLIVE_BORDER,
                flexDirection: "row",
                alignItems: "center",
                justifyContent:
                  "center",
              }}
            >
              <Ionicons
                name="people-outline"
                size={16}
                color={OLIVE}
                style={{
                  marginRight: 7,
                }}
              />

              <Text
                style={{
                  color: OLIVE,
                  fontSize: 12.5,
                  fontWeight: "900",
                }}
              >
                {connectionCount}{" "}
                {connectionCount === 1
                  ? "connection"
                  : "connections"}
              </Text>
            </View>
          )}

          <View
            style={{
              marginTop: 14,
              flexDirection: "row",
              gap: 8,
            }}
          >
            <HeroActionButton
              label="Message"
              icon="chatbubble-ellipses-outline"
              onPress={
                onMessagePress
              }
              amber
            />

            <HeroActionButton
              label="Website"
              icon="globe-outline"
              onPress={
                onWebsitePress
              }
            />

            <HeroActionButton
              label="Email"
              icon="mail-outline"
              onPress={
                onEmailPress
              }
            />
          </View>
        </View>
      </View>
    </View>
  );
}