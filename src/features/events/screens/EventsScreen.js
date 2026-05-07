// src/features/events/screens/EventsScreen.js
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";

import Screen from "../../../components/Screen";
import { theme } from "../../../theme/theme";
import EventCard from "../components/EventCard";
import {
    fetchUpcomingEvents,
    getCurrentUserId,
} from "../services/eventsService";

export default function EventsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("upcoming");

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);

      const uid = await getCurrentUserId();
      setCurrentUserId(uid);

      const res = await fetchUpcomingEvents({ limit: 50 });

      if (!res.ok) {
        Alert.alert("Events", res.error || "Could not load events.");
        setEvents([]);
        return;
      }

      setEvents(res.events || []);
    } catch (e) {
      console.log("EventsScreen load error:", e);
      Alert.alert("Events", "Could not load events right now.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  const filteredEvents = (() => {
    if (activeFilter === "public") {
      return events.filter((e) => e.visibility === "public");
    }

    if (activeFilter === "church") {
      return events.filter((e) => e.visibility === "church");
    }

    if (activeFilter === "invites") {
      return events.filter((e) => {
        const invites = Array.isArray(e.event_invites) ? e.event_invites : [];
        return invites.some((i) => i.invited_user_id === currentUserId);
      });
    }

    return events;
  })();

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
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[theme.text.h1, { fontSize: 24 }]}>Events</Text>
              <Text style={[theme.text.sub, { marginTop: 4 }]}>
                Gatherings, church events, and invite-only moments.
              </Text>
            </View>

            <Pressable
              onPress={() => navigation.navigate("CreateEvent")}
              hitSlop={10}
              style={({ pressed }) => ({
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: pressed ? theme.colors.goldPressed : theme.colors.gold,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: theme.colors.goldOutline,
              })}
            >
              <Ionicons name="add" size={26} color={theme.colors.text} />
            </Pressable>
          </View>

          {/* Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 12 }}
          >
            {[
              { key: "upcoming", label: "Upcoming" },
              { key: "public", label: "Public" },
              { key: "church", label: "Church" },
              { key: "invites", label: "Invites" },
            ].map((f) => {
              const active = activeFilter === f.key;

              return (
                <Pressable
                  key={f.key}
                  onPress={() => setActiveFilter(f.key)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: active ? theme.colors.gold : theme.colors.surface,
                    borderWidth: 1,
                    borderColor: active ? theme.colors.goldOutline : theme.colors.divider,
                    marginRight: 8,
                  }}
                >
                  <Text
                    style={{
                      color: active ? theme.colors.text : theme.colors.text2,
                      fontWeight: "900",
                    }}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {loading ? (
            <View style={{ paddingVertical: 28, alignItems: "center" }}>
              <ActivityIndicator color={theme.colors.gold} />
              <Text style={{ color: theme.colors.muted, marginTop: 8, fontWeight: "700" }}>
                Loading events…
              </Text>
            </View>
          ) : filteredEvents.length === 0 ? (
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
                No events yet
              </Text>
              <Text style={{ color: theme.colors.text2, marginTop: 8, lineHeight: 20 }}>
                Events you can see will appear here. Create one, or check back when your church posts a gathering.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  currentUserId={currentUserId}
                  onPress={() =>
                    navigation.navigate("EventDetails", {
                      eventId: event.id,
                    })
                  }
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}