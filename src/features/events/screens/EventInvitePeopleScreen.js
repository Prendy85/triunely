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

import Screen from "../../../components/Screen";
import { supabase } from "../../../lib/supabase";
import {
  fetchEventById,
  getCurrentUserId,
  inviteUsersToEvent,
} from "../services/eventsService";

const PREMIUM_CREAM = "#FFFCF5";
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

const premiumCardStyle = {
  backgroundColor: SURFACE,
  borderRadius: 24,
  borderWidth: 1,
  borderColor: CARD_BORDER,
  shadowColor: SHADOW,
  shadowOpacity: 0.09,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 5 },
  elevation: 3,
};

function safeInitials(nameOrEmail) {
  if (!nameOrEmail) return "?";

  const parts = String(nameOrEmail).trim().split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return String(nameOrEmail).trim()[0]?.toUpperCase() || "?";
}

function InviteIcon({ icon = "person-add-outline", amber = true, size = 42 }) {
  const accent = amber ? EVENT_AMBER : OLIVE;
  const bg = amber ? AMBER_SOFT : OLIVE_SOFT;
  const border = amber ? AMBER_BORDER : OLIVE_BORDER;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={icon} size={Math.round(size * 0.48)} color={accent} />
    </View>
  );
}

function PremiumButton({ title, icon, onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        minHeight: 50,
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 13,
        backgroundColor: EVENT_AMBER,
        borderWidth: 1,
        borderColor: EVENT_AMBER,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.52 : 1,
        shadowColor: EVENT_AMBER,
        shadowOpacity: pressed ? 0.08 : 0.22,
        shadowRadius: pressed ? 6 : 11,
        shadowOffset: { width: 0, height: pressed ? 2 : 5 },
        elevation: pressed ? 1 : 4,
        transform: [{ scale: pressed && !disabled ? 0.985 : 1 }],
      })}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={18}
          color="#FFFFFF"
          style={{ marginRight: 8 }}
        />
      ) : null}

      <Text
        style={{
          color: "#FFFFFF",
          fontWeight: "900",
          fontSize: 14,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
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
    const invites = Array.isArray(event?.event_invites)
      ? event.event_invites
      : [];

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

      if (!eventId) {
        Alert.alert("Invite People", "Missing event ID.");
        setEvent(null);
        return;
      }

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

        let searchQuery = supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .ilike("display_name", `%${trimmed}%`)
          .limit(30);

        if (currentUserId) {
          searchQuery = searchQuery.neq("id", currentUserId);
        }

        const { data, error } = await searchQuery;

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
    <Screen backgroundColor={PREMIUM_CREAM} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: bottomPad + 22,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={10}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: pressed ? AMBER_SOFT : SURFACE,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
                shadowColor: SHADOW,
                shadowOpacity: 0.08,
                shadowRadius: 7,
                shadowOffset: { width: 0, height: 3 },
                elevation: 2,
              })}
            >
              <Ionicons name="chevron-back" size={22} color={OLIVE} />
            </Pressable>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  color: TEXT,
                  fontSize: 24,
                  fontWeight: "900",
                  letterSpacing: -0.35,
                }}
                numberOfLines={1}
              >
                Invite People
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 13,
                  fontWeight: "700",
                  lineHeight: 18,
                  marginTop: 2,
                }}
                numberOfLines={2}
              >
                Invite people to join this event.
              </Text>
            </View>
          </View>

          {loading ? (
            <View
              style={{
                ...premiumCardStyle,
                paddingVertical: 30,
                alignItems: "center",
              }}
            >
              <ActivityIndicator color={EVENT_AMBER} />

              <Text
                style={{
                  color: MUTED,
                  marginTop: 8,
                  fontWeight: "800",
                }}
              >
                Loading event…
              </Text>
            </View>
          ) : !event ? (
            <View
              style={{
                ...premiumCardStyle,
                padding: 16,
              }}
            >
              <InviteIcon icon="alert-circle-outline" amber size={48} />

              <Text
                style={{
                  color: TEXT,
                  fontWeight: "900",
                  fontSize: 18,
                  marginTop: 12,
                }}
              >
                Event not found
              </Text>

              <Text
                style={{
                  color: MUTED,
                  marginTop: 7,
                  lineHeight: 19,
                  fontWeight: "700",
                }}
              >
                This event may have been deleted or you may not have access to it.
              </Text>
            </View>
          ) : (
            <>
              <View
                style={{
                  ...premiumCardStyle,
                  padding: 15,
                  marginBottom: 14,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <InviteIcon icon="calendar-outline" amber size={44} />

                  <View style={{ flex: 1, minWidth: 0, marginLeft: 11 }}>
                    <Text
                      style={{
                        color: EVENT_BROWN,
                        fontWeight: "900",
                        fontSize: 11.5,
                        textTransform: "uppercase",
                        letterSpacing: 0.55,
                      }}
                    >
                      Inviting to
                    </Text>

                    <Text
                      style={{
                        color: TEXT,
                        fontWeight: "900",
                        fontSize: 18,
                        lineHeight: 23,
                        marginTop: 4,
                      }}
                      numberOfLines={2}
                    >
                      {event.title || "Untitled event"}
                    </Text>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 9,
                      }}
                    >
                      <Ionicons name="mail-outline" size={15} color={OLIVE} />

                      <Text
                        style={{
                          color: MUTED,
                          marginLeft: 6,
                          fontWeight: "800",
                          fontSize: 12.5,
                        }}
                      >
                        Already invited: {existingInvitedIds.length}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View
                style={{
                  ...premiumCardStyle,
                  padding: 15,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <InviteIcon icon="search-outline" amber={false} size={38} />

                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text
                      style={{
                        color: TEXT,
                        fontWeight: "900",
                        fontSize: 16,
                      }}
                    >
                      Search people
                    </Text>

                    <Text
                      style={{
                        color: MUTED,
                        fontSize: 12.5,
                        fontWeight: "700",
                        marginTop: 2,
                      }}
                    >
                      Select one or more people, then send invites.
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 13,
                    borderRadius: 18,
                    backgroundColor: "rgba(255, 252, 245, 0.86)",
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                    paddingHorizontal: 12,
                  }}
                >
                  <Ionicons name="person-outline" size={17} color={MUTED} />

                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Type a name..."
                    placeholderTextColor="rgba(107, 114, 128, 0.72)"
                    autoCapitalize="words"
                    style={{
                      flex: 1,
                      color: TEXT,
                      fontSize: 15,
                      fontWeight: "700",
                      paddingVertical: 12,
                      marginLeft: 8,
                    }}
                  />
                </View>

                {searching ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 10,
                    }}
                  >
                    <ActivityIndicator size="small" color={EVENT_AMBER} />

                    <Text
                      style={{
                        color: MUTED,
                        marginLeft: 8,
                        fontWeight: "800",
                      }}
                    >
                      Searching…
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={{ marginTop: 14 }}>
                {results.length === 0 && !searching ? (
                  <View
                    style={{
                      ...premiumCardStyle,
                      padding: 16,
                      alignItems: "center",
                    }}
                  >
                    <InviteIcon icon="people-outline" amber={false} size={48} />

                    <Text
                      style={{
                        color: TEXT,
                        fontSize: 16,
                        fontWeight: "900",
                        marginTop: 11,
                      }}
                    >
                      Search results will appear here
                    </Text>

                    <Text
                      style={{
                        color: MUTED,
                        fontSize: 13,
                        fontWeight: "700",
                        lineHeight: 18,
                        textAlign: "center",
                        marginTop: 5,
                      }}
                    >
                      Start typing a name to find someone to invite.
                    </Text>
                  </View>
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
                        backgroundColor: selected ? AMBER_SOFT : SURFACE,
                        borderRadius: 20,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: selected ? AMBER_BORDER : CARD_BORDER,
                        opacity: disabled ? 0.55 : pressed ? 0.86 : 1,
                        marginBottom: 10,
                        shadowColor: SHADOW,
                        shadowOpacity: selected ? 0.09 : 0.06,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 3 },
                        elevation: selected ? 2 : 1,
                        transform: [{ scale: pressed && !disabled ? 0.99 : 1 }],
                      })}
                    >
                      {profile.avatar_url ? (
                        <Image
                          source={{ uri: profile.avatar_url }}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            marginRight: 11,
                            backgroundColor: OLIVE_SOFT,
                          }}
                        />
                      ) : (
                        <View
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            marginRight: 11,
                            backgroundColor: selected ? AMBER_SOFT : OLIVE_SOFT,
                            borderWidth: 1,
                            borderColor: selected ? AMBER_BORDER : OLIVE_BORDER,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: selected ? EVENT_BROWN : OLIVE,
                              fontWeight: "900",
                            }}
                          >
                            {initials}
                          </Text>
                        </View>
                      )}

                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={{
                            color: TEXT,
                            fontWeight: "900",
                            fontSize: 14.5,
                          }}
                          numberOfLines={1}
                        >
                          {name}
                        </Text>

                        <Text
                          style={{
                            color: MUTED,
                            marginTop: 3,
                            fontSize: 12,
                            fontWeight: "700",
                          }}
                          numberOfLines={1}
                        >
                          {alreadyAttending
                            ? "Already attending"
                            : alreadyInvited
                            ? "Already invited"
                            : selected
                            ? "Selected"
                            : "Tap to select"}
                        </Text>
                      </View>

                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: selected ? EVENT_AMBER : OLIVE_SOFT,
                          borderWidth: 1,
                          borderColor: selected ? EVENT_AMBER : OLIVE_BORDER,
                          alignItems: "center",
                          justifyContent: "center",
                          marginLeft: 8,
                        }}
                      >
                        <Ionicons
                          name={
                            alreadyInvited || alreadyAttending
                              ? "checkmark-done-outline"
                              : selected
                              ? "checkmark"
                              : "add-outline"
                          }
                          size={18}
                          color={selected ? "#FFFFFF" : OLIVE}
                        />
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ marginTop: 8 }}>
                <PremiumButton
                  title={
                    saving
                      ? "Sending..."
                      : selectedCount > 0
                      ? `Send ${selectedCount} Invite${selectedCount === 1 ? "" : "s"}`
                      : "Send Invites"
                  }
                  icon="send-outline"
                  onPress={handleSendInvites}
                  disabled={saving || selectedCount === 0}
                />
              </View>
            </>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}