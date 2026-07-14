// src/features/partners/components/PartnerAboutTab.js
import { Ionicons } from "@expo/vector-icons";
import { Platform, Text, View } from "react-native";

const SURFACE = "#FFFFFF";
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

export default function PartnerAboutTab({
  partner,
  typeIcon,
  typeLabel,
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
      <Text
        style={{
          ...serifHeading,
          fontSize: 24,
          lineHeight: 29,
        }}
      >
        About
      </Text>

      <Text
        style={{
          color: TEXT,
          fontSize: 14.5,
          fontWeight: "700",
          lineHeight: 22,
          marginTop: 10,
        }}
      >
        {partner?.about ||
          partner?.short_description ||
          "This partner has not added a full about section yet."}
      </Text>

      <View
        style={{
          marginTop: 15,
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
          label={partner?.category}
        />

        <InfoPill
          icon="location-outline"
          label={partner?.location_text}
        />

        <InfoPill
          icon="earth-outline"
          label={partner?.service_area}
        />

        {partner?.is_online ? (
          <InfoPill
            icon="wifi-outline"
            label="Online"
          />
        ) : null}

        {partner?.serves_churches ? (
          <InfoPill
            icon="business-outline"
            label="Serves churches"
          />
        ) : null}

        {partner?.serves_families ? (
          <InfoPill
            icon="people-outline"
            label="Serves families"
          />
        ) : null}

        {partner?.serves_creators ? (
          <InfoPill
            icon="videocam-outline"
            label="Serves creators"
          />
        ) : null}

        {partner?.serves_businesses ? (
          <InfoPill
            icon="briefcase-outline"
            label="Serves businesses"
          />
        ) : null}
      </View>
    </View>
  );
}