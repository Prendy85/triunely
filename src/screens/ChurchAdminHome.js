// src/screens/ChurchAdminHome.js
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";

export default function ChurchAdminHome({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [adminMemberships, setAdminMemberships] = useState([]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        if (isMounted) {
          setAdminMemberships([]);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("church_memberships")
        .select("role, church_id, churches:church_id (id, name, visibility)")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .in("role", ["owner", "admin", "editor"]);

      if (isMounted) {
        setAdminMemberships(error ? [] : data || []);
        setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Screen>
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "800" }}>Church Admin</Text>
        <Text style={{ opacity: 0.7 }}>
          Open a church admin hub to manage the feed, church profile, and official updates.
        </Text>

        {loading ? (
          <ActivityIndicator />
        ) : adminMemberships.length === 0 ? (
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontWeight: "700" }}>No admin access found</Text>
            <Text style={{ marginTop: 6, opacity: 0.7 }}>
              You need an Owner/Admin/Editor role in at least one church.
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 12, gap: 10 }}>
            {adminMemberships.map((m) => {
              const churchName = m.churches?.name || "Church";

              return (
                <View
                  key={`${m.church_id}-${m.role}`}
                  style={{
                    padding: 12,
                    borderWidth: 1,
                    borderRadius: 12,
                    borderColor: "rgba(0,0,0,0.08)",
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: "900" }}>{churchName}</Text>
                  <Text style={{ marginTop: 4, opacity: 0.7, fontWeight: "700" }}>Role: {m.role}</Text>

                  {/* Primary hub action */}
                  <Pressable
                    onPress={() =>
                      navigation.navigate("ChurchAdminHub", {
                        churchId: m.church_id,
                        churchName,
                        role: m.role,
                      })
                    }
                    style={{
                      marginTop: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "rgba(0,0,0,0.14)",
                      backgroundColor: "rgba(255,255,255,0.7)",
                    }}
                  >
                    <Text style={{ fontWeight: "900" }}>Open Admin Hub</Text>
                    <Text style={{ marginTop: 4, opacity: 0.7, fontWeight: "700" }}>
                      Feed · Church Profile · Weekly Message · Weekly Challenge
                    </Text>
                  </Pressable>

                  {/* Keep your existing quick actions as shortcuts */}
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                    <Pressable
                      onPress={() =>
                        navigation.navigate("WeeklyMessageEditor", {
                          churchId: m.church_id,
                          churchName,
                        })
                      }
                      style={pillStyle}
                    >
                      <Text style={pillText}>Post Weekly Message</Text>
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        navigation.navigate("WeeklyChallengeEditor", {
                          churchId: m.church_id,
                          churchName,
                        })
                      }
                      style={pillStyle}
                    >
                      <Text style={pillText}>Weekly Challenge</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => navigation.navigate("ChurchNoticeboard", { churchId: m.church_id })}
                      style={[pillStyle, { opacity: 0.75 }]}
                    >
                      <Text style={pillText}>Noticeboard</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </Screen>
  );
}

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
