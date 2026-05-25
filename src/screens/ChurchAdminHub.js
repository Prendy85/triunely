// src/screens/ChurchAdminHub.js
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";
import { theme } from "../theme/theme";

const HEAVENLY_GOLD = "#D99400";
const DEEP_OLIVE = "#4F633B";
const SOFT_GOLD_BG = "rgba(217, 148, 0, 0.10)";
const SOFT_OLIVE_BG = "rgba(79, 99, 59, 0.10)";
const CARD_BORDER = "rgba(217, 148, 0, 0.18)";

function PrimaryActionCard({ icon, title, subtitle, onPress, tint = "gold" }) {
  const isOlive = tint === "olive";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 20,
        padding: 15,
        marginBottom: 12,
        shadowColor: HEAVENLY_GOLD,
        shadowOpacity: pressed ? 0.04 : 0.09,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: pressed ? 1 : 3,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: isOlive ? SOFT_OLIVE_BG : SOFT_GOLD_BG,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={icon}
            size={22}
            color={isOlive ? DEEP_OLIVE : HEAVENLY_GOLD}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: "900" }}>
            {title}
          </Text>

          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 12.5,
              fontWeight: "700",
              lineHeight: 17,
              marginTop: 4,
            }}
          >
            {subtitle}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color={HEAVENLY_GOLD} />
      </View>
    </Pressable>
  );
}

function AdminToolCard({ icon, title, subtitle, onPress, tint = "gold" }) {
  const isOlive = tint === "olive";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: "48%",
        minHeight: 126,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 18,
        padding: 12,
        marginBottom: 10,
        shadowColor: HEAVENLY_GOLD,
        shadowOpacity: pressed ? 0.03 : 0.07,
        shadowRadius: 7,
        shadowOffset: { width: 0, height: 3 },
        elevation: pressed ? 1 : 2,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: isOlive ? SOFT_OLIVE_BG : SOFT_GOLD_BG,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}
      >
        <Ionicons
          name={icon}
          size={19}
          color={isOlive ? DEEP_OLIVE : HEAVENLY_GOLD}
        />
      </View>

      <Text style={{ color: theme.colors.text, fontSize: 13.5, fontWeight: "900" }}>
        {title}
      </Text>

      <Text
        style={{
          color: theme.colors.muted,
          fontSize: 11,
          fontWeight: "700",
          lineHeight: 15,
          marginTop: 5,
        }}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}

export default function ChurchAdminHub({ route, navigation }) {
  const { churchId, churchName, role } = route?.params || {};

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
        if (isMounted) setChurch(data || null);
      } catch (e) {
        console.log("ChurchAdminHub load church error:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadChurch();

    return () => {
      isMounted = false;
    };
  }, [churchId]);

  const name = church?.display_name || church?.name || churchName || "Church";

  return (
    <Screen backgroundColor={theme.colors.bg} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: bottomPad + 24,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
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
              }}
            >
              <Ionicons name="chevron-back" size={22} color={DEEP_OLIVE} />
            </Pressable>

            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
              Admin Hub
            </Text>

            <View style={{ width: 38 }} />
          </View>

          <View style={{ marginBottom: 18 }}>
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 28,
                fontWeight: "900",
                letterSpacing: -0.7,
                marginBottom: 8,
              }}
            >
              {name}
            </Text>

            <Text
              style={{
                color: theme.colors.muted,
                fontSize: 15,
                fontWeight: "700",
                lineHeight: 22,
                maxWidth: 340,
              }}
            >
              Manage your church presence, communication, giving and community tools on Triunely
              {role ? ` · ${role}` : ""}.
            </Text>

            {loading ? (
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
                <ActivityIndicator color={theme.colors.gold} />
                <Text style={{ color: theme.colors.muted, fontWeight: "700", marginLeft: 10 }}>
                  Loading church…
                </Text>
              </View>
            ) : null}
          </View>

          <Text
            style={{
              color: theme.colors.text,
              fontSize: 22,
              fontWeight: "900",
              marginBottom: 10,
            }}
          >
            Primary actions
          </Text>

          <PrimaryActionCard
            icon="business-outline"
            title="View Public Profile"
            subtitle="Open the public church page exactly as members see it."
            tint="olive"
            onPress={() =>
              navigation.navigate("ChurchProfilePublic", {
                churchId,
                churchName: name,
              })
            }
          />

          <PrimaryActionCard
            icon="newspaper-outline"
            title="Church Feed"
            subtitle="View church-only posts and community updates."
            onPress={() =>
              navigation.navigate("ChurchFeed", {
                churchId,
                churchName: name,
              })
            }
          />

          <PrimaryActionCard
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

          <Text
            style={{
              color: theme.colors.text,
              fontSize: 22,
              fontWeight: "900",
              marginTop: 10,
              marginBottom: 10,
            }}
          >
            Admin tools
          </Text>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            <AdminToolCard
              icon="heart-outline"
              title="Giving"
              subtitle="Manage giving campaigns, mock totals and impact updates."
              onPress={() =>
                navigation.navigate("ChurchAdminGiving", {
                  churchId,
                  churchName: name,
                })
              }
            />

            <AdminToolCard
              icon="megaphone-outline"
              title="Noticeboard"
              subtitle="Post church updates, needs, service changes and announcements."
              tint="olive"
              onPress={() => navigation.navigate("ChurchNoticeboard", { churchId })}
            />

            <AdminToolCard
              icon="videocam-outline"
              title="Weekly Message"
              subtitle="Create the main weekly spiritual anchor for your church."
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
              subtitle="Set a weekly discipleship challenge for members."
              tint="olive"
              onPress={() =>
                navigation.navigate("WeeklyChallengeEditor", {
                  churchId,
                  churchName: name,
                })
              }
            />

            <AdminToolCard
              icon="people-outline"
              title="Admins"
              subtitle="Manage who can help run this church profile."
              onPress={() =>
                navigation.navigate("ChurchAdminAdmins", {
                  churchId,
                  churchName: name,
                })
              }
            />

            <AdminToolCard
  icon="people-circle-outline"
  title="Groups"
  subtitle="Manage church groups, tables, Bible studies and discipleship communities."
  tint="olive"
  onPress={() =>
    navigation.navigate("ChurchGroupsAdmin", {
      churchId,
      churchName: name,
    })
  }
/>
          </View>

          <View
            style={{
              marginTop: 8,
              padding: 14,
              borderRadius: 18,
              backgroundColor: SOFT_OLIVE_BG,
              borderWidth: 1,
              borderColor: CARD_BORDER,
            }}
          >
            <Text style={{ color: DEEP_OLIVE, fontWeight: "900", fontSize: 14 }}>
              Admin note
            </Text>

            <Text
              style={{
                color: theme.colors.muted,
                fontWeight: "700",
                marginTop: 6,
                lineHeight: 19,
              }}
            >
              This hub is being shaped into the control centre for church leaders. We’ll keep
              each tool separate so existing church flows stay safe.
            </Text>
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}