// src/screens/ChurchEventsAdmin.js
import { Ionicons } from "@expo/vector-icons";
import { Alert, Platform, Pressable, ScrollView, Text, View } from "react-native";

import Screen from "../components/Screen";

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
const DISABLED_BG = "rgba(107, 114, 128, 0.08)";
const DISABLED_BORDER = "rgba(107, 114, 128, 0.16)";
const SHADOW = "rgba(15, 23, 42, 0.10)";

const displayFont = Platform.OS === "ios" ? "Georgia" : "serif";

const serifHeading = {
  fontFamily: displayFont,
  color: TEXT,
  fontWeight: "900",
  letterSpacing: -0.45,
};

function AdminActionCard({
  icon,
  title,
  subtitle,
  onPress,
  tint = "amber",
  badge,
  disabled = false,
}) {
  const isOlive = tint === "olive";
  const accent = disabled ? MUTED : isOlive ? OLIVE : EVENT_AMBER;
  const bg = disabled ? DISABLED_BG : isOlive ? OLIVE_SOFT : AMBER_SOFT;
  const border = disabled ? DISABLED_BORDER : isOlive ? OLIVE_BORDER : AMBER_BORDER;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: SURFACE,
        borderWidth: 1,
        borderColor: disabled ? DISABLED_BORDER : CARD_BORDER,
        borderRadius: 22,
        padding: 15,
        marginBottom: 12,
        shadowColor: SHADOW,
        shadowOpacity: disabled ? 0.03 : pressed ? 0.04 : 0.09,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: disabled ? 1 : pressed ? 1 : 3,
        opacity: disabled ? 0.72 : 1,
        transform: [{ scale: pressed && !disabled ? 0.99 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: bg,
            borderWidth: 1,
            borderColor: border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={22} color={accent} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          {badge ? (
            <View
              style={{
                alignSelf: "flex-start",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: bg,
                borderWidth: 1,
                borderColor: border,
                marginBottom: 6,
              }}
            >
              <Text
                style={{
                  color: disabled ? MUTED : isOlive ? OLIVE : EVENT_BROWN,
                  fontSize: 10,
                  fontWeight: "900",
                  letterSpacing: 0.3,
                  textTransform: "uppercase",
                }}
              >
                {badge}
              </Text>
            </View>
          ) : null}

          <Text
            style={{
              color: disabled ? MUTED : TEXT,
              fontSize: 15.5,
              fontWeight: "900",
              lineHeight: 20,
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
              marginTop: 4,
            }}
          >
            {subtitle}
          </Text>
        </View>

        {disabled ? (
          <Ionicons name="lock-closed-outline" size={18} color={MUTED} />
        ) : (
          <Ionicons name="chevron-forward" size={18} color={accent} />
        )}
      </View>
    </Pressable>
  );
}

export default function ChurchEventsAdmin({ route, navigation }) {
  const { churchId, churchName } = route?.params || {};

  const params = {
    churchId,
    churchName,
  };

  function showComingNext(title) {
    Alert.alert(
      title,
      "This admin tool is not built yet. We have left it visible here so the structure is clear, but we should not make it clickable until the proper data filtering and admin actions exist."
    );
  }

  return (
    <Screen backgroundColor={PREMIUM_CREAM} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: bottomPad + 24,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 18,
            }}
          >
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={10}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: SURFACE,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Ionicons name="chevron-back" size={22} color={TEXT} />
            </Pressable>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: EVENT_BROWN,
                  fontSize: 11,
                  fontWeight: "900",
                  letterSpacing: 0.7,
                  textTransform: "uppercase",
                  marginBottom: 3,
                }}
              >
                Ministry Tools
              </Text>

              <Text
                style={{
                  ...serifHeading,
                  fontSize: 28,
                  lineHeight: 34,
                }}
              >
                Manage Events
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 13,
                  fontWeight: "700",
                  lineHeight: 18,
                  marginTop: 3,
                }}
                numberOfLines={2}
              >
                {churchName || "Church events, courses and registrations"}
              </Text>
            </View>
          </View>

          <View
            style={{
              backgroundColor: SURFACE,
              borderRadius: 28,
              padding: 18,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: AMBER_BORDER,
              shadowColor: EVENT_AMBER,
              shadowOpacity: 0.12,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 7 },
              elevation: 4,
              overflow: "hidden",
            }}
          >
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: -50,
                right: -44,
                width: 150,
                height: 150,
                borderRadius: 75,
                backgroundColor: AMBER_SOFT,
              }}
            />

            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                bottom: -66,
                left: -48,
                width: 160,
                height: 160,
                borderRadius: 80,
                backgroundColor: OLIVE_SOFT,
              }}
            />

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
              <Ionicons name="calendar-outline" size={27} color={EVENT_AMBER} />
            </View>

            <Text
              style={{
                ...serifHeading,
                fontSize: 24,
                lineHeight: 30,
              }}
            >
              Events, courses and sign-ups in one place
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 13.5,
                fontWeight: "700",
                lineHeight: 20,
                marginTop: 8,
              }}
            >
              For now, this hub only links to the tools that genuinely work.
              Course management, archive and cancellation tools are shown as
              coming next until those screens and database filters are properly
              built.
            </Text>
          </View>

          <AdminActionCard
            icon="add-circle-outline"
            title="Create event or course"
            subtitle="Create a normal event, or choose course / programme inside the event creator."
            badge="Create"
            onPress={() =>
              navigation.navigate("CreateEvent", {
                ...params,
              })
            }
          />

          <AdminActionCard
            icon="calendar-number-outline"
            title="Manage upcoming events"
            subtitle="View upcoming church events and open event details."
            onPress={() =>
              navigation.navigate("Events", {
                ...params,
                adminMode: true,
                scope: "upcoming",
              })
            }
          />

          <AdminActionCard
            icon="clipboard-outline"
            title="Registrations"
            subtitle="View event sign-ups, registration forms, attendees and follow-up status."
            onPress={() =>
              navigation.navigate("ChurchEventRegistrations", {
                ...params,
              })
            }
          />

<AdminActionCard
  icon="library-outline"
  title="Manage courses / programmes"
  subtitle="View course programmes, linked sessions, linked groups and registrations."
  badge="Courses"
  tint="olive"
  onPress={() =>
    navigation.navigate("ChurchCoursesAdmin", {
      ...params,
    })
  }
/>

          <AdminActionCard
            icon="archive-outline"
            title="Archived / cancelled events"
            subtitle="Coming next: safe archive, cancellation and restore tools. Not hard delete."
            badge="Coming next"
            tint="olive"
            onPress={() => showComingNext("Archived / cancelled events")}
            disabled
          />
        </ScrollView>
      )}
    </Screen>
  );
}