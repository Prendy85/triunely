// src/features/partners/components/PartnerGrowthTab.js
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
const SHADOW = "rgba(15, 23, 42, 0.12)";

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

function GrowthActionCard({
  icon,
  title,
  description,
  onPress,
  amber = false,
}) {
  const backgroundColor = amber
    ? AMBER_SOFT
    : OLIVE_SOFT;

  const borderColor = amber
    ? AMBER_BORDER
    : OLIVE_BORDER;

  const iconColor = amber
    ? EVENT_BROWN
    : OLIVE;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: 20,
        padding: 15,
        marginBottom: 11,
        backgroundColor,
        borderWidth: 1,
        borderColor,
        flexDirection: "row",
        alignItems: "center",

        transform: [
          {
            translateY: pressed ? 3 : 0,
          },
          {
            scale: pressed ? 0.985 : 1,
          },
        ],

        shadowColor: SHADOW,
        shadowOpacity: pressed ? 0.02 : 0.12,
        shadowRadius: pressed ? 2 : 8,
        shadowOffset: {
          width: 0,
          height: pressed ? 1 : 4,
        },

        elevation: pressed ? 0 : 3,
        opacity: pressed ? 0.96 : 1,
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: SURFACE,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Ionicons
          name={icon}
          size={21}
          color={iconColor}
        />
      </View>

      <View
        style={{
          flex: 1,
        }}
      >
        <Text
          style={{
            color: amber ? EVENT_BROWN : TEXT,
            fontSize: 14,
            fontWeight: "900",
          }}
        >
          {title}
        </Text>

        <Text
          style={{
            color: MUTED,
            fontSize: 12.5,
            fontWeight: "700",
            lineHeight: 18,
            marginTop: 3,
          }}
        >
          {description}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={19}
        color={iconColor}
        style={{
          marginLeft: 8,
        }}
      />
    </Pressable>
  );
}

export default function PartnerGrowthTab({
  isOwner = false,
  onChoosePostToBoost,
  onPromoteProfile,
}) {
  return (
    <View
      style={{
        ...premiumCardStyle,
        marginHorizontal: 16,
        padding: 16,
        marginBottom: 24,
      }}
    >
      <View
        style={{
          width: 54,
          height: 54,
          borderRadius: 27,
          backgroundColor: AMBER_SOFT,
          borderWidth: 1,
          borderColor: AMBER_BORDER,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <Ionicons
          name="trending-up-outline"
          size={26}
          color={EVENT_BROWN}
        />
      </View>

      <Text
        style={{
          ...serifHeading,
          fontSize: 25,
          lineHeight: 30,
        }}
      >
        Grow your reach
      </Text>

      <Text
        style={{
          color: MUTED,
          fontSize: 14,
          fontWeight: "700",
          lineHeight: 21,
          marginTop: 8,
          marginBottom: 16,
        }}
      >
        Promote your work to Christians, churches, families and relevant
        audiences across Triunely.
      </Text>

      {isOwner ? (
        <>
          <GrowthActionCard
            amber
            icon="rocket-outline"
            title="Boost a Partner Post"
            description="Choose one of your existing posts and promote it to a targeted audience."
            onPress={onChoosePostToBoost}
          />

          <GrowthActionCard
            icon="megaphone-outline"
            title="Promote your Partner Profile"
            description="Increase the visibility of the whole Partner Profile across Triunely."
            onPress={onPromoteProfile}
          />
        </>
      ) : (
        <Text
          style={{
            color: MUTED,
            fontSize: 13,
            fontWeight: "800",
            lineHeight: 19,
            marginTop: 2,
          }}
        >
          Partner growth tools are available to the owner of this profile.
        </Text>
      )}
    </View>
  );
}