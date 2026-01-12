// src/screens/ChurchProfilePublic.js
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";

export default function ChurchProfilePublic({ route, navigation }) {
  const { churchId, churchName } = route?.params || {};

  const [loading, setLoading] = useState(true);
  const [church, setChurch] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!churchId) {
        setError("Missing church id.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: err } = await supabase
          .from("churches")
          .select("*")
          .eq("id", churchId)
          .single();

        if (err) throw err;

        if (isMounted) setChurch(data || null);
      } catch (e) {
        console.log("ChurchProfilePublic load error:", e);
        if (isMounted) setError("Could not load this church.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [churchId]);

  const name = church?.name || churchName || "Church";
  const visibility = church?.visibility || "—";
  const description = church?.description || church?.about || church?.bio || null; // safe fallback (if you have any of these columns)

  return (
    <Screen>
      <View style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 22, fontWeight: "900" }}>{name}</Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "rgba(0,0,0,0.12)",
            }}
          >
            <Text style={{ fontWeight: "800" }}>Back</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator />
        ) : error ? (
          <Text style={{ color: "crimson", fontWeight: "800" }}>{error}</Text>
        ) : (
          <>
            <View
              style={{
                padding: 14,
                borderWidth: 1,
                borderRadius: 14,
                borderColor: "rgba(0,0,0,0.10)",
              }}
            >
              <Text style={{ fontWeight: "900" }}>Visibility</Text>
              <Text style={{ marginTop: 6, opacity: 0.8 }}>{String(visibility)}</Text>

              <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.08)", marginVertical: 12 }} />

              <Text style={{ fontWeight: "900" }}>Description</Text>
              <Text style={{ marginTop: 6, opacity: 0.8 }}>
                {description ? String(description) : "No description set yet."}
              </Text>
            </View>

            <Pressable
              onPress={() =>
                navigation.navigate("ChurchFeed", {
                  churchId,
                  churchName: name,
                })
              }
              style={{
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "rgba(0,0,0,0.12)",
              }}
            >
              <Text style={{ fontWeight: "900" }}>Go to Church Feed</Text>
            </Pressable>
          </>
        )}
      </View>
    </Screen>
  );
}
