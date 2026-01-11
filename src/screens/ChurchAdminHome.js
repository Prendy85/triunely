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

      // Approved roles that can manage content
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
        <Text style={{ fontSize: 22, fontWeight: "700" }}>Church Admin</Text>
        <Text style={{ opacity: 0.7 }}>
          Post the weekly encouragement message and manage official church updates.
        </Text>

        {loading ? (
          <ActivityIndicator />
        ) : adminMemberships.length === 0 ? (
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontWeight: "600" }}>No admin access found</Text>
            <Text style={{ marginTop: 6, opacity: 0.7 }}>
              You need an Owner/Admin/Editor role in at least one church.
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 12, gap: 10 }}>
            {adminMemberships.map((m) => (
              <View
                key={`${m.church_id}-${m.role}`}
                style={{
                  padding: 12,
                  borderWidth: 1,
                  borderRadius: 12,
                  borderColor: "rgba(0,0,0,0.08)",
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "700" }}>
                  {m.churches?.name || "Church"}
                </Text>
                <Text style={{ marginTop: 4, opacity: 0.7 }}>
                  Role: {m.role}
                </Text>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                  <Pressable
                    onPress={() =>
                      navigation.navigate("WeeklyMessageEditor", {
                        churchId: m.church_id,
                        churchName: m.churches?.name || "Church",
                      })
                    }
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "rgba(0,0,0,0.12)",
                    }}
                  >
                    <Text style={{ fontWeight: "700" }}>Post Weekly Message</Text>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      navigation.navigate("WeeklyChallengeEditor", {
                        churchId: m.church_id,
                        churchName: m.churches?.name || "Church",
                      })
                    }
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "rgba(0,0,0,0.12)",
                    }}
                  >
                    <Text style={{ fontWeight: "700" }}>Weekly Challenge</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => navigation.navigate("ChurchNoticeboard", { churchId: m.church_id })}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "rgba(0,0,0,0.12)",
                      opacity: 0.7,
                    }}
                  >
                    <Text style={{ fontWeight: "700" }}>Noticeboard</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
