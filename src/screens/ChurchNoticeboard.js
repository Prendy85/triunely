// src/screens/ChurchNoticeboard.js
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import ChurchNoticeboardPanel from "../components/ChurchNoticeboardPanel";
import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";

const CARD_BORDER = "rgba(15, 23, 42, 0.08)";
const AMBER_SOFT = "rgba(180, 83, 9, 0.10)";
const OLIVE_SOFT = "rgba(79, 99, 59, 0.10)";
const SHADOW = "rgba(15, 23, 42, 0.10)";

function safeInitials(name) {
  if (!name) return "?";

  const parts = String(name).trim().split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return String(name).trim()[0]?.toUpperCase() || "?";
}

export default function ChurchNoticeboard({ route, navigation }) {
  const churchId = route?.params?.churchId;
  const routeChurchName = route?.params?.churchName;

  const [loading, setLoading] = useState(true);
  const [church, setChurch] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const churchName =
    church?.display_name || church?.name || routeChurchName || "Church";

  const initials = useMemo(() => safeInitials(churchName), [churchName]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        setLoading(true);

        const { data: sessData } = await supabase.auth.getSession();
        const uid = sessData?.session?.user?.id || null;

        if (churchId) {
          const { data: churchData, error: churchError } = await supabase
            .from("churches")
            .select("id, name, display_name, avatar_url, is_verified")
            .eq("id", churchId)
            .maybeSingle();

          if (churchError) {
            console.log("ChurchNoticeboard load church error:", churchError);
          }

          if (mounted) {
            setChurch(churchData || null);
          }
        }

        if (uid && churchId) {
          const { data, error } = await supabase.rpc("is_church_admin", {
            target_church_id: churchId,
          });

          if (error) {
            console.log("ChurchNoticeboard admin rpc error:", error);

            if (mounted) {
              setIsAdmin(false);
            }
          } else if (mounted) {
            setIsAdmin(Boolean(data));
          }

          try {
            await supabase.from("church_noticeboard_reads").upsert(
              {
                user_id: uid,
                church_id: churchId,
                last_seen_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id,church_id" }
            );
          } catch (e) {
            console.log("ChurchNoticeboard mark seen error:", e);
          }
        } else if (mounted) {
          setIsAdmin(false);
        }
      } catch (e) {
        console.log("ChurchNoticeboard init error:", e);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [churchId]);

  function renderChurchAvatar(size = 48) {
    const radius = size / 2;

    if (church?.avatar_url) {
      return (
        <Image
          source={{ uri: church.avatar_url }}
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            backgroundColor: PREMIUM_CREAM,
          }}
        />
      );
    }

    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: OLIVE_SOFT,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            color: OLIVE,
            fontWeight: "900",
            fontSize: size > 40 ? 16 : 13,
          }}
        >
          {initials}
        </Text>
      </View>
    );
  }

  function renderHeader() {
    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: pressed ? PREMIUM_CREAM : SURFACE,
              borderWidth: 1,
              borderColor: CARD_BORDER,
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <Ionicons name="chevron-back" size={22} color={OLIVE} />
          </Pressable>

          <Text
            style={{
              color: TEXT,
              fontSize: 18,
              fontWeight: "900",
            }}
          >
            Noticeboard
          </Text>

          <View style={{ width: 38 }} />
        </View>

        <View
          style={{
            backgroundColor: SURFACE,
            borderRadius: 22,
            padding: 16,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            shadowColor: SHADOW,
            shadowOpacity: 0.18,
            shadowRadius: 9,
            shadowOffset: { width: 0, height: 3 },
            elevation: 3,
            overflow: "hidden",
          }}
        >
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: -45,
              right: -32,
              width: 180,
              height: 130,
              borderRadius: 40,
              backgroundColor: AMBER_SOFT,
            }}
          />

          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              bottom: -45,
              left: -45,
              width: 130,
              height: 130,
              borderRadius: 65,
              backgroundColor: OLIVE_SOFT,
            }}
          />

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {renderChurchAvatar(48)}

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: TEXT,
                  fontSize: 22,
                  fontWeight: "900",
                }}
              >
                Noticeboard
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 12.5,
                  fontWeight: "800",
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {churchName}
              </Text>
            </View>

            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: AMBER_SOFT,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="megaphone-outline"
                size={20}
                color={EVENT_AMBER}
              />
            </View>
          </View>

          <Text
            style={{
              color: MUTED,
              fontSize: 14,
              fontWeight: "700",
              lineHeight: 20,
              marginTop: 14,
            }}
          >
            Official updates, announcements, service changes, serving needs and
            practical notices from your church.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Screen
      backgroundColor={PREMIUM_CREAM}
      padded={false}
      style={{ flex: 1 }}
      contentStyle={{ flex: 1 }}
    >
      {({ bottomPad }) => (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: bottomPad + 18,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderHeader()}

          {loading ? (
            <View
              style={{
                minHeight: 360,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="large" color={EVENT_AMBER} />

              <Text
                style={{
                  color: MUTED,
                  marginTop: 8,
                  fontWeight: "800",
                }}
              >
                Loading notices…
              </Text>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 16 }}>
              <ChurchNoticeboardPanel
                churchId={churchId}
                bottomPad={0}
                showHeader={false}
                embedded={true}
                isAdminOverride={isAdmin}
              />
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}