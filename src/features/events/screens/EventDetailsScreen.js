// src/features/events/screens/EventDetailsScreen.js
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";

import GlowButton from "../../../components/GlowButton";
import Screen from "../../../components/Screen";
import { theme } from "../../../theme/theme";
import {
    fetchEventById,
    formatEventDateTime,
    getCurrentUserId,
    getEventCounts,
    leaveEvent,
    rsvpToEvent,
    updateEventVisibility,
} from "../services/eventsService";

function safeInitials(nameOrEmail) {
  if (!nameOrEmail) return "?";

  const parts = String(nameOrEmail).trim().split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return String(nameOrEmail).trim()[0]?.toUpperCase() || "?";
}

function visibilityLabel(value) {
  if (value === "church") return "Church event";
  if (value === "invite_only") return "Invite-only event";
  return "Public event";
}

export default function EventDetailsScreen({ route, navigation }) {
  const { eventId } = route?.params || {};

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadEvent = useCallback(async () => {
    try {
      setLoading(true);

      const uid = await getCurrentUserId();
      setCurrentUserId(uid);

      const res = await fetchEventById(eventId);

      if (!res.ok) {
        Alert.alert("Event", res.error || "Could not load this event.");
        setEvent(null);
        return;
      }

      setEvent(res.event);
    } catch (e) {
      console.log("EventDetailsScreen load error:", e);
      Alert.alert("Event", "Could not load this event right now.");
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      loadEvent();
    }, [loadEvent])
  );

  const counts = getEventCounts(event, currentUserId);
  const myStatus = counts.myAttendance?.status || counts.myInvite?.status || null;
  const isGoing = myStatus === "going" || myStatus === "accepted";
  const isCreator = !!(currentUserId && event?.created_by === currentUserId);
const nextVisibility = event?.visibility === "invite_only" ? "public" : "invite_only";
const nextVisibilityLabel =
  nextVisibility === "invite_only" ? "Switch to Invite-only" : "Switch to Public";
  const canInvitePeople =
  event?.visibility === "public" || isCreator;

  const church = Array.isArray(event?.churches) ? event?.churches?.[0] : event?.churches;
  const churchName = church?.display_name || church?.name || null;

  const attendees = Array.isArray(event?.event_attendees)
  ? event.event_attendees
  : [];

const goingAttendees = attendees.filter((a) => a.status === "going");
const maybeAttendees = attendees.filter((a) => a.status === "maybe");

  async function handleRsvp(status) {
    if (!event?.id) return;

    try {
      setSaving(true);
      const res = await rsvpToEvent({ eventId: event.id, status });

      if (!res.ok) {
        Alert.alert("Event", res.error || "Could not update your RSVP.");
        return;
      }

      await loadEvent();
    } finally {
      setSaving(false);
    }
  }

  async function handleLeaveEvent() {
    if (!event?.id) return;

    try {
      setSaving(true);
      const res = await leaveEvent(event.id);

      if (!res.ok) {
        Alert.alert("Event", res.error || "Could not leave this event.");
        return;
      }

      await loadEvent();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleVisibility() {
  if (!event?.id) return;

  const goingInviteOnly = event.visibility !== "invite_only";

  Alert.alert(
    "Change event visibility?",
    goingInviteOnly
      ? "This will make the event invite-only. Only invited users and allowed managers should be able to see it."
      : "This will make the event public. More users may be able to see and RSVP to it.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: goingInviteOnly ? "Make Invite-only" : "Make Public",
        style: goingInviteOnly ? "default" : "destructive",
        onPress: async () => {
          try {
            setSaving(true);

            const res = await updateEventVisibility({
              eventId: event.id,
              visibility: nextVisibility,
            });

            if (!res.ok) {
              Alert.alert("Event", res.error || "Could not update visibility.");
              return;
            }

            await loadEvent();
          } finally {
            setSaving(false);
          }
        },
      },
    ]
  );
}

  async function openOnlineUrl() {
    if (!event?.online_url) return;

    try {
      const supported = await Linking.canOpenURL(event.online_url);

      if (!supported) {
        Alert.alert("Event", "Your device could not open this link.");
        return;
      }

      await Linking.openURL(event.online_url);
    } catch {
      Alert.alert("Event", "Could not open this link right now.");
    }
  }

  return (
    <Screen backgroundColor={theme.colors.bg} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: bottomPad + 18,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={10}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.divider,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Ionicons name="chevron-back" size={22} color={theme.colors.text2} />
            </Pressable>

            <View style={{ flex: 1 }}>
              <Text style={[theme.text.h1, { fontSize: 22 }]}>Event v12.4</Text>
              <Text style={[theme.text.sub, { marginTop: 2 }]}>
                Details and RSVP
              </Text>
            </View>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 30, alignItems: "center" }}>
              <ActivityIndicator color={theme.colors.gold} />
              <Text style={{ color: theme.colors.muted, marginTop: 8, fontWeight: "700" }}>
                Loading event…
              </Text>
            </View>
          ) : !event ? (
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: 18,
                padding: 16,
                borderWidth: 1,
                borderColor: theme.colors.divider,
              }}
            >
              <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
                Event not found
              </Text>
              <Text style={{ color: theme.colors.text2, marginTop: 8 }}>
                This event may have been deleted, cancelled, or you may not have access to it.
              </Text>
            </View>
          ) : (
            <>
              <View
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: theme.colors.divider,
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 22 }}>
                  {event.title || "Untitled event"}
                </Text>

                <Text
                  style={{
                    color: theme.colors.goldPressed,
                    fontWeight: "900",
                    marginTop: 10,
                  }}
                >
                  {formatEventDateTime(event.start_at, event.end_at)}
                </Text>

                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
                  <Ionicons name="location-outline" size={18} color={theme.colors.sage} />
                  <Text
                    style={{
                      color: theme.colors.text2,
                      marginLeft: 6,
                      flex: 1,
                      fontWeight: "700",
                    }}
                  >
                    {event.location_name ||
                      event.location_address ||
                      (event.online_url ? "Online" : "Location to be confirmed")}
                  </Text>
                </View>

                {churchName ? (
                  <Text style={{ color: theme.colors.muted, marginTop: 10, fontWeight: "700" }}>
                    Hosted by {churchName}
                  </Text>
                ) : null}

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                  <View style={chipStyle}>
                    <Text style={chipText}>{visibilityLabel(event.visibility)}</Text>
                  </View>

                  <View style={chipStyle}>
                    <Text style={chipText}>{counts.goingCount} going</Text>
                  </View>

                  {myStatus ? (
                    <View style={[chipStyle, { backgroundColor: theme.colors.goldHalo }]}>
                      <Text style={[chipText, { color: theme.colors.goldPressed }]}>
                        Your status: {myStatus}
                      </Text>
                    </View>
                  ) : null}
                </View>

                               {event.description ? (
                  <Text style={{ color: theme.colors.text2, lineHeight: 22, marginTop: 16 }}>
                    {event.description}
                  </Text>
                ) : null}
              </View>

              <View
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: theme.colors.divider,
                  marginTop: 14,
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 17 }}>
                  Who’s going
                </Text>

                {goingAttendees.length === 0 ? (
                  <Text style={{ color: theme.colors.muted, marginTop: 8, fontWeight: "700" }}>
                    No one has marked themselves as going yet.
                  </Text>
                ) : (
                  <View style={{ marginTop: 10 }}>
                    {goingAttendees.map((attendee) => {
                      const profile = Array.isArray(attendee.profiles)
                        ? attendee.profiles?.[0]
                        : attendee.profiles;

                      const name = profile?.display_name || "Triunely user";
                      const avatar = profile?.avatar_url || null;
                      const initials = safeInitials(name);

                      return (
                        <View
                          key={`going-${attendee.user_id}`}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 10,
                          }}
                        >
                          {avatar ? (
                            <Image
                              source={{ uri: avatar }}
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 19,
                                marginRight: 10,
                              }}
                            />
                          ) : (
                            <View
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 19,
                                marginRight: 10,
                                backgroundColor: theme.colors.goldHalo,
                                borderWidth: 1,
                                borderColor: theme.colors.goldOutline,
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                                {initials}
                              </Text>
                            </View>
                          )}

                          <View style={{ flex: 1 }}>
                            <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                              {name}
                            </Text>
                            <Text style={{ color: theme.colors.muted, marginTop: 2, fontSize: 12 }}>
                              Going
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {maybeAttendees.length > 0 ? (
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ color: theme.colors.text2, fontWeight: "900", marginBottom: 8 }}>
                      Maybe
                    </Text>

                    {maybeAttendees.map((attendee) => {
                      const profile = Array.isArray(attendee.profiles)
                        ? attendee.profiles?.[0]
                        : attendee.profiles;

                      const name = profile?.display_name || "Triunely user";
                      const avatar = profile?.avatar_url || null;
                      const initials = safeInitials(name);

                      return (
                        <View
                          key={`maybe-${attendee.user_id}`}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 10,
                            opacity: 0.8,
                          }}
                        >
                          {avatar ? (
                            <Image
                              source={{ uri: avatar }}
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 17,
                                marginRight: 10,
                              }}
                            />
                          ) : (
                            <View
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 17,
                                marginRight: 10,
                                backgroundColor: theme.colors.surfaceAlt,
                                borderWidth: 1,
                                borderColor: theme.colors.divider,
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Text style={{ color: theme.colors.text2, fontWeight: "900" }}>
                                {initials}
                              </Text>
                            </View>
                          )}

                          <Text style={{ color: theme.colors.text2, fontWeight: "800", flex: 1 }}>
                            {name}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>

              <View style={{ marginTop: 14, gap: 10 }}>
  {isCreator ? (
    <GlowButton
      title={saving ? "Updating..." : nextVisibilityLabel}
      onPress={handleToggleVisibility}
      disabled={saving}
      variant="outline"
    />
  ) : null}

 {canInvitePeople ? (
  <GlowButton
    title="Invite People"
    onPress={() =>
      navigation.navigate("EventInvitePeople", {
        eventId: event.id,
      })
    }
    variant="outline"
  />
) : null}

  {event.online_url ? (
    <GlowButton
      title="Open Online Link"
      onPress={openOnlineUrl}
      variant="outline"
    />
  ) : null}

  {isGoing ? (
                  <GlowButton
                    title={saving ? "Updating..." : "Leave Event"}
                    onPress={handleLeaveEvent}
                    disabled={saving}
                    variant="outline"
                  />
                ) : (
                  <>
                    <GlowButton
                      title={saving ? "Updating..." : "I'm Going"}
                      onPress={() => handleRsvp("going")}
                      disabled={saving}
                      variant="primary"
                    />

                    <GlowButton
                      title={saving ? "Updating..." : "Maybe"}
                      onPress={() => handleRsvp("maybe")}
                      disabled={saving}
                      variant="outline"
                    />

                    <GlowButton
                      title={saving ? "Updating..." : "Decline"}
                      onPress={() => handleRsvp("declined")}
                      disabled={saving}
                      variant="outline"
                    />
                  </>
                )}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </Screen>
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