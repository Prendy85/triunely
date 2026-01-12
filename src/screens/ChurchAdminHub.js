// src/screens/ChurchAdminHub.js
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";

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

  const name = church?.name || churchName || "Church";

  return (
    <Screen>
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "800" }}>{name}</Text>
        <Text style={{ opacity: 0.7 }}>
          Admin hub {role ? `(${role})` : ""} — manage your church presence on Triunely.
        </Text>

        {loading ? (
          <ActivityIndicator />
        ) : null}

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

          <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.08)", marginVertical: 6 }} />

          {/* ADMIN TOOLS */}
          <Text style={{ fontWeight: "800", fontSize: 14 }}>Admin tools</Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
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
              style={[pillStyle, { opacity: 0.75 }]}
            >
              <Text style={pillText}>Noticeboard</Text>
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
                borderColor: "rgba(0,0,0,0.12)",
                alignSelf: "flex-start",
              }}
            >
              <Text style={{ fontWeight: "800" }}>Back to Churches</Text>
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
  borderColor: "rgba(0,0,0,0.10)",
  backgroundColor: "rgba(255,255,255,0.70)",
};

const cardTitle = {
  fontSize: 16,
  fontWeight: "900",
};

const cardSub = {
  marginTop: 6,
  opacity: 0.75,
  fontWeight: "600",
};

const pillStyle = {
  paddingVertical: 10,
  paddingHorizontal: 12,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "rgba(0,0,0,0.12)",
};

const pillText = {
  fontWeight: "800",
};
