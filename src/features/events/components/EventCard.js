// src/features/events/components/EventCard.js
import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Text, View } from "react-native";
import { theme } from "../../../theme/theme";
import { formatEventDateTime, getEventCounts } from "../services/eventsService";

function getVisibilityLabel(visibility) {
  if (visibility === "church") return "Church";
  if (visibility === "invite_only") return "Invite only";
  return "Public";
}

function getStatusLabel(status) {
  if (status === "cancelled") return "Cancelled";
  if (status === "draft") return "Draft";
  return null;
}

export default function EventCard({
  event,
  currentUserId,
  compact = false,
  onPress,
}) {
  if (!event) return null;

  const counts = getEventCounts(event, currentUserId);
  const goingCount = counts.goingCount || 0;
  const myStatus = counts.myAttendance?.status || counts.myInvite?.status || null;

  const church = Array.isArray(event.churches) ? event.churches[0] : event.churches;
  const churchName = church?.display_name || church?.name || null;

  const visibilityLabel = getVisibilityLabel(event.visibility);
  const statusLabel = getStatusLabel(event.status);

  const location =
    event.location_name ||
    event.location_address ||
    (event.online_url ? "Online" : "Location to be confirmed");

  const isGoing = myStatus === "going" || myStatus === "accepted";
const isMaybe = myStatus === "maybe";
const isDeclined = myStatus === "declined";
const isInvited = myStatus === "pending";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? theme.colors.surfaceAlt : theme.colors.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        overflow: "hidden",
        opacity: pressed ? 0.92 : 1,
      })}
    >
      {event.image_url ? (
        <Image
          source={{ uri: event.image_url }}
          style={{
            width: "100%",
            height: compact ? 92 : 130,
            backgroundColor: theme.colors.surfaceAlt,
          }}
          resizeMode="cover"
        />
      ) : null}

      <View style={{ padding: compact ? 12 : 14 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View
            style={{
              width: compact ? 36 : 42,
              height: compact ? 36 : 42,
              borderRadius: compact ? 18 : 21,
              backgroundColor: theme.colors.goldHalo,
              borderWidth: 1,
              borderColor: theme.colors.goldOutline,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons
              name="calendar-outline"
              size={compact ? 18 : 21}
              color={theme.colors.goldPressed}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: theme.colors.text,
                fontWeight: "900",
                fontSize: compact ? 15 : 17,
              }}
              numberOfLines={compact ? 1 : 2}
            >
              {event.title || "Untitled event"}
            </Text>

            <Text
              style={{
                color: theme.colors.goldPressed,
                fontWeight: "900",
                marginTop: 5,
                fontSize: compact ? 12 : 13,
              }}
              numberOfLines={1}
            >
              {formatEventDateTime(event.start_at, event.end_at)}
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 7 }}>
              <Ionicons name="location-outline" size={14} color={theme.colors.sage} />
              <Text
                style={{
                  color: theme.colors.text2,
                  marginLeft: 4,
                  fontWeight: "700",
                  fontSize: compact ? 12 : 13,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {location}
              </Text>
            </View>

            {churchName ? (
              <Text
                style={{
                  color: theme.colors.muted,
                  marginTop: 5,
                  fontSize: 12,
                  fontWeight: "700",
                }}
                numberOfLines={1}
              >
                Hosted by {churchName}
              </Text>
            ) : null}
          </View>
        </View>

        {!compact && event.description ? (
          <Text
            style={{
              color: theme.colors.text2,
              lineHeight: 20,
              marginTop: 12,
            }}
            numberOfLines={2}
          >
            {event.description}
          </Text>
        ) : null}

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 12,
          }}
        >
          <View style={chipStyle}>
            <Text style={chipText}>{visibilityLabel}</Text>
          </View>

          {statusLabel ? (
            <View style={[chipStyle, { backgroundColor: "rgba(239,68,68,0.12)" }]}>
              <Text style={[chipText, { color: theme.colors.danger || "tomato" }]}>
                {statusLabel}
              </Text>
            </View>
          ) : null}

          <View style={chipStyle}>
            <Text style={chipText}>{goingCount} going</Text>
          </View>

         {isGoing ? (
  <View style={[chipStyle, { backgroundColor: theme.colors.goldHalo }]}>
    <Text style={[chipText, { color: theme.colors.goldPressed }]}>Going</Text>
  </View>
) : isMaybe ? (
  <View style={chipStyle}>
    <Text style={chipText}>Maybe</Text>
  </View>
) : isDeclined ? (
  <View style={chipStyle}>
    <Text style={chipText}>Declined</Text>
  </View>
) : isInvited ? (
  <View style={[chipStyle, { backgroundColor: theme.colors.goldHalo }]}>
    <Text style={[chipText, { color: theme.colors.goldPressed }]}>Invited</Text>
  </View>
) : null}
        </View>
      </View>
    </Pressable>
  );
}

const chipStyle = {
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 999,
  backgroundColor: theme.colors.surfaceAlt,
  borderWidth: 1,
  borderColor: theme.colors.divider,
};

const chipText = {
  color: theme.colors.text2,
  fontWeight: "900",
  fontSize: 12,
};