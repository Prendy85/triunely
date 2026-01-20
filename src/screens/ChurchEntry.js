// src/screens/ChurchEntry.js
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { supabase } from "../lib/supabase";
import { theme } from "../theme/theme";

/**
 * This screen is a router for the bottom Church tab.
 * It finds the logged-in user's churchId and then navigates to ChurchProfilePublic.
 *
 * IMPORTANT:
 * You must wire getMyChurchId() to match your schema.
 */
export default function ChurchEntry({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  const getMyChurchId = useCallback(async (userId) => {
    /**
     * OPTION A (most common): profiles has a church_id column
     *   - profiles: id, church_id
     */
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("church_id")
        .eq("id", userId)
        .single();

      // If the column doesn't exist, PostgREST will error — we fall through to Option B.
      if (!error && data?.church_id) return data.church_id;
    } catch (e) {
      // fall through
    }

    /**
     * OPTION B: membership table (adjust table/columns to match your DB)
     * Examples you might have:
     *  - church_members (user_id, church_id, status)
     *  - user_churches (user_id, church_id)
     */
    try {
      const { data, error } = await supabase
        .from("church_memberships")
        .select("church_id")
        .eq("user_id", userId)
        .limit(1);

      if (!error && data?.[0]?.church_id) return data[0].church_id;
    } catch (e) {
      // fall through
    }

    return null;
  }, []);

  const routeToChurch = useCallback(async () => {
    setLoading(true);
    setErrorText("");

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        setErrorText("Not signed in.");
        return;
      }

      const churchId = await getMyChurchId(userId);

      if (!churchId) {
        setErrorText("No church connected to this account yet.");
        return;
      }

      // Navigate into the actual church profile screen
      navigation.navigate("ChurchProfilePublic", { churchId });
    } catch (e) {
      console.log("ChurchEntry routing error:", e);
      setErrorText("We couldn't open your church right now.");
    } finally {
      setLoading(false);
    }
  }, [getMyChurchId, navigation]);

  useFocusEffect(
    useCallback(() => {
      routeToChurch();
    }, [routeToChurch])
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.bg,
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
      }}
    >
      {loading ? (
        <>
          <ActivityIndicator size="large" color={theme.colors.gold} />
          <Text style={{ color: theme.colors.muted, marginTop: 10 }}>
            Opening your church…
          </Text>
        </>
      ) : (
        <>
          <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
            Church
          </Text>
          <Text
            style={{
              color: theme.colors.muted,
              textAlign: "center",
              marginTop: 8,
              marginBottom: 12,
            }}
          >
            {errorText || "Ready"}
          </Text>

          {/* Optional: if you have a Church Directory screen */}
          {/* 
          <Pressable
            onPress={() => navigation.navigate("ChurchDirectory")}
            style={[theme.button.primary, { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999 }]}
          >
            <Text style={theme.button.primaryText}>Find a church</Text>
          </Pressable>
          */}
        </>
      )}
    </View>
  );
}
