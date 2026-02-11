// src/screens/ChurchAdminHub.js
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";
import { theme } from "../theme/theme";

export default function ChurchAdminHub({ route, navigation }) {
  const { churchId, churchName, role } = route?.params || {};

  console.log("ChurchAdminHub route params:", route?.params);
console.log("ChurchAdminHub churchId:", churchId);


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

  const name = church?.name || churchName || "Church";

  return (
    <Screen backgroundColor={theme.colors.bg}>
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "900", color: theme.colors.text }}>{name}</Text>
        <Text style={{ color: theme.colors.muted, fontWeight: "700" }}>
          Admin hub {role ? `(${role})` : ""} — manage your church presence on Triunely.
        </Text>

        {loading ? <ActivityIndicator color={theme.colors.gold} /> : null}

        {/* MAIN NAV */}
        <View style={{ gap: 10, marginTop: 8 }}>
          <Pressable
            onPress={() =>
              navigation.navigate("ChurchFeed", {
                churchId,
                churchName: name,
              })
            }
            style={cardStyle}
          >
            <Text style={cardTitle}>Open Church Feed</Text>
            <Text style={cardSub}>See church-only posts. Tap avatars to view profiles.</Text>
          </Pressable>

          <Pressable
            onPress={() =>
              navigation.navigate("ChurchProfilePublic", {
                churchId,
                churchName: name,
              })
            }
            style={cardStyle}
          >
            <Text style={cardTitle}>Open Church Profile</Text>
            <Text style={cardSub}>View the church page details (public-facing).</Text>
          </Pressable>

          <View style={{ height: 1, backgroundColor: theme.colors.divider, marginVertical: 6 }} />

          {/* ADMIN TOOLS */}
          <Text style={{ fontWeight: "900", fontSize: 14, color: theme.colors.text }}>
            Admin tools
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <Pressable
              onPress={() =>
                navigation.navigate("ChurchAdminInbox", {
                  churchId,
                  churchName: name,
                })
              }
              style={pillStyle}
            >
              <Text style={pillText}>Inbox</Text>
            </Pressable>

            <Pressable
              onPress={() =>
                navigation.navigate("WeeklyMessageEditor", {
                  churchId,
                  churchName: name,
                })
              }
              style={pillStyle}
            >
              <Text style={pillText}>Post Weekly Message</Text>
            </Pressable>

            <Pressable
              onPress={() =>
                navigation.navigate("WeeklyChallengeEditor", {
                  churchId,
                  churchName: name,
                })
              }
              style={pillStyle}
            >
              <Text style={pillText}>Weekly Challenge</Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate("ChurchNoticeboard", { churchId })}
              style={pillStyle}
            >
              <Text style={pillText}>Noticeboard</Text>
            </Pressable>

            {/* ✅ NEW: Admins manager */}
    <Pressable
  onPress={() =>
    navigation.navigate("ChurchAdminAdmins", {
      churchId,
      churchName: name,
    })
  }
  style={pillStyle}
>
  <Text style={pillText}>Admins</Text>
</Pressable>


          </View>

          <View style={{ marginTop: 12 }}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.colors.divider,
                alignSelf: "flex-start",
                backgroundColor: theme.colors.surface,
              }}
            >
              <Text style={{ fontWeight: "900", color: theme.colors.text2 }}>Back to Churches</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const cardStyle = {
  padding: 14,
  borderWidth: 1,
  borderRadius: 14,
  borderColor: theme.colors.divider,
  backgroundColor: theme.colors.surface,
};

const cardTitle = {
  fontSize: 16,
  fontWeight: "900",
  color: theme.colors.text,
};

const cardSub = {
  marginTop: 6,
  color: theme.colors.muted,
  fontWeight: "700",
};

const pillStyle = {
  paddingVertical: 10,
  paddingHorizontal: 12,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: theme.colors.divider,
  backgroundColor: theme.colors.surface,
};

const pillText = {
  fontWeight: "900",
  color: theme.colors.text2,
};
