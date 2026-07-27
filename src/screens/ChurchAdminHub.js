// src/screens/ChurchAdminHub.js
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View
} from "react-native";

import Screen from "../components/Screen";
import useCommercialAccountScope from "../hooks/useCommercialAccountScope";
import { supabase } from "../lib/supabase";

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

const displayFont = Platform.OS === "ios" ? "Georgia" : "serif";

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
  shadowOffset: { width: 0, height: 5 },
  elevation: 3,
};

function SectionHeader({ title, subtitle, icon = "sparkles-outline", amber = true }) {
  const accent = amber ? EVENT_AMBER : OLIVE;
  const bg = amber ? AMBER_SOFT : OLIVE_SOFT;
  const border = amber ? AMBER_BORDER : OLIVE_BORDER;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: border,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
        }}
      >
        <Ionicons name={icon} size={19} color={accent} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            ...serifHeading,
            fontSize: 20,
            lineHeight: 25,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>

        {subtitle ? (
          <Text
            style={{
              color: MUTED,
              fontSize: 12.5,
              fontWeight: "700",
              lineHeight: 17,
              marginTop: 1,
            }}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function MinistryOperationsCard({ onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: SURFACE,
        borderRadius: 28,
        padding: 17,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: AMBER_BORDER,
        shadowColor: EVENT_AMBER,
        shadowOpacity: pressed ? 0.07 : 0.14,
        shadowRadius: pressed ? 8 : 14,
        shadowOffset: { width: 0, height: pressed ? 2 : 7 },
        elevation: pressed ? 2 : 5,
        overflow: "hidden",
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -46,
          right: -38,
          width: 140,
          height: 140,
          borderRadius: 70,
          backgroundColor: AMBER_SOFT,
        }}
      />

      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          bottom: -62,
          left: -44,
          width: 150,
          height: 150,
          borderRadius: 75,
          backgroundColor: OLIVE_SOFT,
        }}
      />

      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 13 }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: AMBER_SOFT,
            borderWidth: 1,
            borderColor: AMBER_BORDER,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="sparkles-outline" size={25} color={EVENT_AMBER} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 9,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: AMBER_SOFT,
              borderWidth: 1,
              borderColor: AMBER_BORDER,
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                color: EVENT_BROWN,
                fontSize: 10.5,
                fontWeight: "900",
                letterSpacing: 0.35,
                textTransform: "uppercase",
              }}
            >
              Leadership workspace
            </Text>
          </View>

          <Text
            style={{
              ...serifHeading,
              fontSize: 22,
              lineHeight: 27,
            }}
          >
            Ministry Operations
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 13,
              fontWeight: "700",
              lineHeight: 19,
              marginTop: 6,
            }}
          >
            Run events, registrations, groups, serving, giving, communication and
            follow-up from one church leadership space.
          </Text>

          <View
            style={{
              marginTop: 13,
              alignSelf: "flex-start",
              borderRadius: 999,
              paddingHorizontal: 13,
              paddingVertical: 8,
              backgroundColor: EVENT_AMBER,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: SURFACE,
                fontSize: 12.5,
                fontWeight: "900",
                marginRight: 6,
              }}
            >
              Open workspace
            </Text>

            <Ionicons name="arrow-forward" size={14} color={SURFACE} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function AdminToolCard({ icon, title, subtitle, onPress, tint = "amber" }) {
  const isOlive = tint === "olive";
  const accent = isOlive ? OLIVE : EVENT_AMBER;
  const bg = isOlive ? OLIVE_SOFT : AMBER_SOFT;
  const border = isOlive ? OLIVE_BORDER : AMBER_BORDER;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: "48%",
        minHeight: 132,
        backgroundColor: SURFACE,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 20,
        padding: 13,
        marginBottom: 12,
        shadowColor: SHADOW,
        shadowOpacity: pressed ? 0.04 : 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: pressed ? 1 : 2,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: border,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}
      >
        <Ionicons name={icon} size={20} color={accent} />
      </View>

      <Text
        style={{
          color: TEXT,
          fontSize: 13.5,
          fontWeight: "900",
          lineHeight: 17,
        }}
        numberOfLines={2}
      >
        {title}
      </Text>

      <Text
        style={{
          color: MUTED,
          fontSize: 11,
          fontWeight: "700",
          lineHeight: 15,
          marginTop: 5,
        }}
        numberOfLines={3}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}

function QuickActionCard({ icon, title, subtitle, onPress, tint = "olive" }) {
  const isAmber = tint === "amber";
  const accent = isAmber ? EVENT_AMBER : OLIVE;
  const bg = isAmber ? AMBER_SOFT : OLIVE_SOFT;
  const border = isAmber ? AMBER_BORDER : OLIVE_BORDER;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: SURFACE,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 20,
        padding: 14,
        marginBottom: 11,
        shadowColor: SHADOW,
        shadowOpacity: pressed ? 0.04 : 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: pressed ? 1 : 2,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: bg,
            borderWidth: 1,
            borderColor: border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={21} color={accent} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              color: TEXT,
              fontSize: 15,
              fontWeight: "900",
            }}
            numberOfLines={1}
          >
            {title}
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 12,
              fontWeight: "700",
              lineHeight: 16,
              marginTop: 3,
            }}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color={accent} />
      </View>
    </Pressable>
  );
}

export default function ChurchAdminHub({ route, navigation }) {
  const { churchId, churchName, role } = route?.params || {};

  useCommercialAccountScope("church", churchId);

  const [loading, setLoading] = useState(true);
  const [church, setChurch] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadChurch() {
      if (!churchId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("churches")
          .select("*")
          .eq("id", churchId)
          .single();

        if (error) throw error;

        if (isMounted) {
          setChurch(data || null);
        }
      } catch (e) {
        console.log("ChurchAdminHub load church error:", e);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadChurch();

    return () => {
      isMounted = false;
    };
  }, [churchId]);

  const name = church?.display_name || church?.name || churchName || "Church";

  function openMinistryOperations() {
    const params = {
      churchId,
      churchName: name,
    };

    const rootNavigation = navigation.getParent?.()?.getParent?.();

    if (rootNavigation) {
      rootNavigation.navigate("MinistryOperations", params);
      return;
    }

    navigation.navigate("MinistryOperations", params);
  }

  function openCreateEvent() {
    const params = {
      churchId,
      churchName: name,
    };

    const parentNavigation = navigation.getParent?.();

    if (parentNavigation) {
      parentNavigation.navigate("CreateEvent", params);
      return;
    }

    navigation.navigate("CreateEvent", params);
  }

  return (
    <Screen backgroundColor={PREMIUM_CREAM} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 18,
            paddingTop: 14,
            paddingBottom: bottomPad + 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              marginBottom: 16,
            }}
          >
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={12}
              style={({ pressed }) => ({
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: pressed ? "rgba(255,255,255,0.76)" : SURFACE,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
                shadowColor: SHADOW,
                shadowOpacity: pressed ? 0.04 : 0.09,
                shadowRadius: pressed ? 5 : 8,
                shadowOffset: { width: 0, height: pressed ? 2 : 3 },
                elevation: pressed ? 1 : 2,
                transform: [{ scale: pressed ? 0.975 : 1 }],
              })}
            >
              <Ionicons name="chevron-back" size={24} color={OLIVE} />
            </Pressable>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  ...serifHeading,
                  fontSize: 31,
                  lineHeight: 36,
                }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
              >
                Church Admin
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 13,
                  fontWeight: "700",
                  lineHeight: 18,
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {name}
                {role ? ` · ${role}` : ""}
              </Text>
            </View>
          </View>

          {loading ? (
            <View
              style={{
                ...premiumCardStyle,
                padding: 13,
                marginBottom: 14,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <ActivityIndicator color={EVENT_AMBER} />

              <Text
                style={{
                  color: MUTED,
                  fontWeight: "800",
                  marginLeft: 10,
                }}
              >
                Loading church…
              </Text>
            </View>
          ) : null}

          <MinistryOperationsCard onPress={openMinistryOperations} />

          <View
            style={{
              ...premiumCardStyle,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <SectionHeader
              title="Ministry Tools"
              subtitle="Create, update and manage church ministry activity"
              icon="construct-outline"
              amber
            />

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
              }}
            >
<AdminToolCard
  icon="calendar-outline"
  title="Manage Events"
  subtitle="Create and manage church events, courses, registrations and sign-up forms."
  onPress={() =>
    navigation.navigate("ChurchEventsAdmin", {
      churchId,
      churchName: name,
    })
  }
/>

              <AdminToolCard
                icon="megaphone-outline"
                title="Noticeboard"
                subtitle="Post updates, serving needs and announcements."
                tint="olive"
                onPress={() => navigation.navigate("ChurchNoticeboard", { churchId })}
              />

              <AdminToolCard
                icon="videocam-outline"
                title="Weekly Message"
                subtitle="Create the main weekly spiritual anchor."
                onPress={() =>
                  navigation.navigate("WeeklyMessageEditor", {
                    churchId,
                    churchName: name,
                  })
                }
              />

              <AdminToolCard
                icon="trophy-outline"
                title="Weekly Challenge"
                subtitle="Set a weekly discipleship challenge."
                tint="olive"
                onPress={() =>
                  navigation.navigate("WeeklyChallengeEditor", {
                    churchId,
                    churchName: name,
                  })
                }
              />

              <AdminToolCard
                icon="people-circle-outline"
                title="Groups"
                subtitle="Manage groups, Bible studies and tables."
                tint="olive"
                onPress={() =>
                  navigation.navigate("ChurchGroupsAdmin", {
                    churchId,
                    churchName: name,
                  })
                }
              />

              <AdminToolCard
                icon="heart-outline"
                title="Giving"
                subtitle="Manage giving campaigns and impact updates."
                onPress={() =>
                  navigation.navigate("ChurchAdminGiving", {
                    churchId,
                    churchName: name,
                  })
                }
              />
            </View>
          </View>

          <View
            style={{
              ...premiumCardStyle,
              padding: 16,
              marginBottom: 10,
            }}
          >
            <SectionHeader
              title="Quick Actions"
              subtitle="Common actions for church admins"
              icon="flash-outline"
              amber={false}
            />

            <QuickActionCard
              icon="business-outline"
              title="Church Profile"
              subtitle="Open the church profile as members and visitors see it."
              tint="olive"
              onPress={() =>
                navigation.navigate("ChurchProfilePublic", {
                  churchId,
                  churchName: name,
                })
              }
            />

            <QuickActionCard
              icon="create-outline"
              title="Post to Church Feed"
              subtitle="Share an update, encouragement or media post."
              tint="amber"
              onPress={() =>
                navigation.navigate("ChurchFeed", {
                  churchId,
                  churchName: name,
                })
              }
            />

            <QuickActionCard
              icon="mail-outline"
              title="Inbox"
              subtitle="Read and reply to messages from members and visitors."
              tint="olive"
              onPress={() =>
                navigation.navigate("ChurchAdminInbox", {
                  churchId,
                  churchName: name,
                })
              }
            />

            <QuickActionCard
              icon="shield-checkmark-outline"
              title="Manage Admins"
              subtitle="Manage who can help run this church profile."
              tint="amber"
              onPress={() =>
                navigation.navigate("ChurchAdminAdmins", {
                  churchId,
                  churchName: name,
                })
              }
            />
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}