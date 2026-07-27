// src/components/VerifiedBadge.js
import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import Svg, {
  Path,
} from "react-native-svg";

const VERIFIED_BLUE =
  "#2563EB";

const VERIFIED_BLUE_DARK =
  "#1D4ED8";

const PREMIUM_CREAM =
  "#FFFCF5";

const SURFACE =
  "#FFFFFF";

const TEXT =
  "#1F2933";

const MUTED =
  "#6B7280";

const EVENT_AMBER =
  "#B45309";

const CARD_BORDER =
  "rgba(15, 23, 42, 0.10)";

const displayFont =
  Platform.OS === "ios"
    ? "Georgia"
    : "serif";

function BadgeIcon({
  size,
  style,
}) {
  const badgeSize = Math.max(
    14,
    Number(size) || 20
  );

  return (
    <View
      style={[
        {
          width: badgeSize,
          height: badgeSize,
          borderRadius:
            badgeSize / 2,
          backgroundColor:
            VERIFIED_BLUE,
          borderWidth: Math.max(
            0.6,
            badgeSize * 0.035
          ),
          borderColor:
            VERIFIED_BLUE_DARK,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Svg
        width={badgeSize * 0.78}
        height={badgeSize * 0.78}
        viewBox="0 0 24 24"
      >
        <Path
          d="
            M5.3 12.4
            C6.8 13.2 8.1 14.5 9.4 16
            C12.1 12.6 15.2 9.5 19.1 6.9
          "
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="3.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

export default function VerifiedBadge({
  size = 20,
  style,
  interactive = true,
}) {
  const [
    explanationVisible,
    setExplanationVisible,
  ] = useState(false);

  if (!interactive) {
    return (
      <BadgeIcon
        size={size}
        style={style}
      />
    );
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Verified Partner information"
        hitSlop={8}
        onPress={(event) => {
          event?.stopPropagation?.();

          setExplanationVisible(true);
        }}
        style={({ pressed }) => ({
          opacity: pressed
            ? 0.72
            : 1,
        })}
      >
        <BadgeIcon
          size={size}
          style={style}
        />
      </Pressable>

      <Modal
        visible={explanationVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setExplanationVisible(false)
        }
      >
        <Pressable
          onPress={() =>
            setExplanationVisible(false)
          }
          style={{
            flex: 1,
            backgroundColor:
              "rgba(15, 23, 42, 0.56)",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 22,
          }}
        >
          <Pressable
            onPress={(event) =>
              event?.stopPropagation?.()
            }
            style={{
              width: "100%",
              maxWidth: 420,
              backgroundColor:
                PREMIUM_CREAM,
              borderRadius: 28,
              borderWidth: 1,
              borderColor:
                CARD_BORDER,
              padding: 22,
              shadowColor:
                "#000000",
              shadowOpacity: 0.2,
              shadowRadius: 20,
              shadowOffset: {
                width: 0,
                height: 10,
              },
              elevation: 10,
            }}
          >
            <View
              style={{
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 29,
                  backgroundColor:
                    "rgba(37, 99, 235, 0.10)",
                  alignItems: "center",
                  justifyContent:
                    "center",
                  marginBottom: 14,
                }}
              >
                <BadgeIcon
                  size={34}
                />
              </View>

              <Text
                style={{
                  color: TEXT,
                  fontFamily:
                    displayFont,
                  fontSize: 23,
                  lineHeight: 29,
                  fontWeight: "900",
                  textAlign: "center",
                  letterSpacing: -0.35,
                }}
              >
                Verified Partner
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 13.5,
                  lineHeight: 20,
                  fontWeight: "700",
                  textAlign: "center",
                  marginTop: 9,
                }}
              >
                Triunely has checked
                this Partner’s identity,
                organisation or profile
                information.
              </Text>
            </View>

            <View
              style={{
                backgroundColor:
                  SURFACE,
                borderRadius: 20,
                borderWidth: 1,
                borderColor:
                  CARD_BORDER,
                padding: 16,
                marginTop: 19,
              }}
            >
              <Text
                style={{
                  color: TEXT,
                  fontSize: 13,
                  lineHeight: 20,
                  fontWeight: "800",
                }}
              >
                The badge remains active
                only while the Partner
                has approved verification
                and an eligible active
                Partner Growth
                membership.
              </Text>

              <View
                style={{
                  height: 1,
                  backgroundColor:
                    CARD_BORDER,
                  marginVertical: 13,
                }}
              />

              <Text
                style={{
                  color: MUTED,
                  fontSize: 12.5,
                  lineHeight: 19,
                  fontWeight: "700",
                }}
              >
                Verification confirms
                that information has been
                checked. It does not mean
                Triunely endorses every
                product, service, claim
                or activity offered by
                the Partner.
              </Text>
            </View>

            <Pressable
              onPress={() =>
                setExplanationVisible(
                  false
                )
              }
              style={({ pressed }) => ({
                minHeight: 48,
                borderRadius: 16,
                backgroundColor:
                  pressed
                    ? "#92400E"
                    : EVENT_AMBER,
                alignItems: "center",
                justifyContent:
                  "center",
                marginTop: 18,
                paddingHorizontal: 18,
              })}
            >
              <Text
                style={{
                  color: "#FFFFFF",
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
    </>
  );
}