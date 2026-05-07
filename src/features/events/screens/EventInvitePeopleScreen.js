// src/features/events/screens/EventInvitePeopleScreen.js
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

import GlowButton from "../../../components/GlowButton";
import Screen from "../../../components/Screen";
import { supabase } from "../../../lib/supabase";
import { theme } from "../../../theme/theme";
import {
    fetchEventById,
    getCurrentUserId,
    inviteUsersToEvent,
} from "../services/eventsService";

function safeInitials(nameOrEmail) {
  if (!nameOrEmail) return "?";

  const parts = String(nameOrEmail).trim().split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return String(nameOrEmail).trim()[0]?.toUpperCase() || "?";
}

export default function EventInvitePeopleScreen({ route, navigation }) {
  const { eventId } = route?.params || {};

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const existingInvitedIds = useMemo(() => {
    const invites = Array.isArray(event?.event_invites) ? event.event_invites : [];
    return invites.map((i) => i.invited_user_id).filter(Boolean);
  }, [event?.event_invites]);

  const existingAttendeeIds = useMemo(() => {
    const attendees = Array.isArray(event?.event_attendees)
      ? event.event_attendees
      : [];

    return attendees.map((a) => a.user_id).filter(Boolean);
  }, [event?.event_attendees]);

  const selectedCount = selectedIds.length;

  const loadEvent = useCallback(async () => {
    try {
      setLoading(true);

      const uid = await getCurrentUserId();
      setCurrentUserId(uid);

      const res = await fetchEventById(eventId);

      if (!res.ok) {
        Alert.alert("Invite People", res.error || "Could not load this event.");
        setEvent(null);
        return;
      }

      setEvent(res.event);
    } catch (e) {
      console.log("EventInvitePeopleScreen load error:", e);
      Alert.alert("Invite People", "Could not load this event right now.");
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

  const runSearch = useCallback(
  async (searchText) => {
    const trimmed = String(searchText || "").trim();

    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    try {
      setSearching(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .neq("id", currentUserId)
        .ilike("display_name", `%${trimmed}%`)
        .limit(30);

      if (error) {
        console.log("Event invite people live search error:", error);
        setResults([]);
        return;
      }

      setResults(data || []);
    } catch (e) {
      console.log("Event invite people live search exception:", e);
      setResults([]);
    } finally {
      setSearching(false);
    }
  },
  [currentUserId]
);

useEffect(() => {
  const trimmed = query.trim();

  if (trimmed.length < 2) {
    setResults([]);
    setSearching(false);
    return;
  }

  setSearching(true);

  const timer = setTimeout(() => {
    runSearch(trimmed);
  }, 350);

  return () => clearTimeout(timer);
}, [query, runSearch]);

  function toggleSelected(userId) {
    if (!userId) return;

    if (existingInvitedIds.includes(userId)) {
      Alert.alert("Already invited", "This person has already been invited.");
      return;
    }

    if (existingAttendeeIds.includes(userId)) {
      Alert.alert("Already attending", "This person is already attending this event.");
      return;
    }

    setSelectedIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }

      return [...prev, userId];
    });
  }

  async function handleSendInvites() {
    if (!event?.id) return;

    if (selectedIds.length === 0) {
      Alert.alert("Invite People", "Select at least one person to invite.");
      return;
    }

    try {
      setSaving(true);

      const res = await inviteUsersToEvent({
        eventId: event.id,
        userIds: selectedIds,
      });

      if (!res.ok) {
        Alert.alert("Invite People", res.error || "Could not send invites.");
        return;
      }

      Alert.alert("Invites sent", "Your event invites have been sent.", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (e) {
      console.log("handleSendInvites error:", e);
      Alert.alert("Invite People", "Could not send invites right now.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen backgroundColor={theme.colors.bg} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
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
              <Text style={[theme.text.h1, { fontSize: 22 }]}>Invite People</Text>
              <Text style={[theme.text.sub, { marginTop: 2 }]}>
                Invite people to your event.
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
                This event may have been deleted or you may not have access to it.
              </Text>
            </View>
          ) : (
            <>
              <View
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: 18,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: theme.colors.divider,
                  marginBottom: 14,
                }}
              >
                <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
                  Inviting to
                </Text>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontWeight: "900",
                    fontSize: 17,
                    marginTop: 4,
                  }}
                >
                  {event.title || "Untitled event"}
                </Text>
                <Text style={{ color: theme.colors.text2, marginTop: 6 }}>
                  Already invited: {existingInvitedIds.length}
                </Text>
              </View>

              {/* Search box */}
              <View
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: 18,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: theme.colors.divider,
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                  Search people
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 10,
                    gap: 8,
                  }}
                >
                 <TextInput
  value={query}
  onChangeText={setQuery}
  placeholder="Type a name..."
  placeholderTextColor={theme.input.placeholder}
  autoCapitalize="words"
  style={[theme.input.box, { flex: 1 }]}
/>
                </View>

                <Text style={{ color: theme.colors.muted, marginTop: 8, fontSize: 12 }}>
  Start typing to search people. Select one or more, then send invites.
</Text>

{searching ? (
  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
    <ActivityIndicator size="small" color={theme.colors.gold} />
    <Text style={{ color: theme.colors.muted, marginLeft: 8, fontWeight: "700" }}>
      Searching…
    </Text>
  </View>
) : null}
              </View>

              {/* Results */}
              <View style={{ marginTop: 14, gap: 10 }}>
                {results.length === 0 && !searching ? (
                  <Text style={{ color: theme.colors.muted, fontWeight: "700" }}>
                    Search results will appear here.
                  </Text>
                ) : null}

                {results.map((profile) => {
                  const selected = selectedIds.includes(profile.id);
                  const alreadyInvited = existingInvitedIds.includes(profile.id);
                  const alreadyAttending = existingAttendeeIds.includes(profile.id);

                  const disabled = alreadyInvited || alreadyAttending;
                  const name = profile.display_name || "Triunely user";
                  const initials = safeInitials(name);

                  return (
                    <Pressable
                      key={profile.id}
                      onPress={() => toggleSelected(profile.id)}
                      disabled={disabled}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: selected
                          ? theme.colors.goldHalo
                          : theme.colors.surface,
                        borderRadius: 16,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: selected
                          ? theme.colors.goldOutline
                          : theme.colors.divider,
                        opacity: disabled ? 0.55 : pressed ? 0.86 : 1,
                      })}
                    >
                      {profile.avatar_url ? (
                        <Image
                          source={{ uri: profile.avatar_url }}
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 21,
                            marginRight: 10,
                          }}
                        />
                      ) : (
                        <View
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 21,
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
                        <Text
                          style={{
                            color: theme.colors.text,
                            fontWeight: "900",
                          }}
                          numberOfLines={1}
                        >
                          {name}
                        </Text>

                        <Text style={{ color: theme.colors.muted, marginTop: 2, fontSize: 12 }}>
                          {alreadyAttending
                            ? "Already attending"
                            : alreadyInvited
                            ? "Already invited"
                            : selected
                            ? "Selected"
                            : "Tap to select"}
                        </Text>
                      </View>

                      <Ionicons
                        name={
                          alreadyInvited || alreadyAttending
                            ? "checkmark-done-outline"
                            : selected
                            ? "checkmark-circle"
                            : "ellipse-outline"
                        }
                        size={24}
                        color={selected ? theme.colors.goldPressed : theme.colors.text2}
                      />
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ marginTop: 18 }}>
                <GlowButton
                  title={
                    saving
                      ? "Sending..."
                      : selectedCount > 0
                      ? `Send ${selectedCount} Invite${selectedCount === 1 ? "" : "s"}`
                      : "Send Invites"
                  }
                  onPress={handleSendInvites}
                  disabled={saving || selectedCount === 0}
                  variant="primary"
                />
              </View>
            </>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}