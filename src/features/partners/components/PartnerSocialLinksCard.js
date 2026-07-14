// src/features/partners/components/PartnerSocialLinksCard.js
import { Ionicons } from "@expo/vector-icons";
import {
    Platform,
    Pressable,
    Text,
    View,
} from "react-native";

const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";

const CARD_BORDER = "rgba(15, 23, 42, 0.08)";
const AMBER_SOFT = "rgba(180, 83, 9, 0.10)";
const AMBER_BORDER = "rgba(180, 83, 9, 0.18)";
const OLIVE_SOFT = "rgba(79, 99, 59, 0.10)";
const OLIVE_BORDER = "rgba(79, 99, 59, 0.18)";
const SHADOW = "rgba(15, 23, 42, 0.10)";

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

function SocialLinkButton({
  icon,
  label,
  url,
  onPress,
  amber = false,
}) {
  if (!url) return null;

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
      style={({ pressed }) => ({
        width: "48%",
        minHeight: 58,
        borderRadius: 18,
        paddingHorizontal: 12,
        paddingVertical: 11,
        marginBottom: 10,
        backgroundColor,
        borderWidth: 1,
        borderColor,
        opacity: pressed ? 0.8 : 1,
        flexDirection: "row",
        alignItems: "center",
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: SURFACE,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 9,
        }}
      >
        <Ionicons
          name={icon}
          size={18}
          color={color}
        />
      </View>

      <View
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
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

        <Text
          style={{
            color: MUTED,
            fontSize: 10.5,
            fontWeight: "700",
            marginTop: 2,
          }}
          numberOfLines={1}
        >
          Open link
        </Text>
      </View>

      <Ionicons
        name="open-outline"
        size={14}
        color={color}
        style={{
          marginLeft: 5,
        }}
      />
    </Pressable>
  );
}

export default function PartnerSocialLinksCard({
  socialLinks = [],
  onOpenLink,
}) {
  if (!Array.isArray(socialLinks) || socialLinks.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        ...premiumCardStyle,
        marginHorizontal: 16,
        marginTop: 14,
        padding: 16,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 5,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: AMBER_SOFT,
            borderWidth: 1,
            borderColor: AMBER_BORDER,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Ionicons
            name="share-social-outline"
            size={21}
            color={EVENT_BROWN}
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
              fontSize: 21,
              lineHeight: 26,
            }}
          >
            Connect elsewhere
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
            Follow, watch, listen or explore more from this Partner.
          </Text>
        </View>
      </View>

      <View
        style={{
          marginTop: 13,
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        {socialLinks.map((item) => (
          <SocialLinkButton
            key={item.key}
            icon={item.icon}
            label={item.label}
            url={item.url}
            amber={item.amber}
            onPress={() =>
              onOpenLink?.(
                item.url,
                item.label
              )
            }
          />
        ))}
      </View>
    </View>
  );
}