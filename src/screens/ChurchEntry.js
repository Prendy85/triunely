// src/screens/ChurchEntry.js
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { supabase } from "../lib/supabase";
import { theme } from "../theme/theme";

/**
 * Church tab router:
 * - If user has an APPROVED church membership -> open that church
 * - Otherwise -> show "Find your church" UI (button -> ChurchFind)
 *
 * IMPORTANT:
 * This intentionally has ZERO "default church" fallback.
 * A church only opens if the user is actually a member/admin.
 */
export default function ChurchEntry({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [showFind, setShowFind] = useState(false);

  // Prevent setState on unmounted component after navigation.replace(...)
  const isActiveRef = useRef(true);

  const resolveChurchId = useCallback(async (userId) => {
    // 1) Approved membership
    try {
      const { data, error } = await supabase
        .from("church_memberships")
        .select("church_id, created_at")
        .eq("user_id", userId)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!error && Array.isArray(data) && data.length > 0) {
        return data[0].church_id ?? null;
      }
    } catch (e) {
      // ignore
    }

    // 2) Optional: admin routing support (only if your church_admins table exists)
    try {
      const { data, error } = await supabase
        .from("church_admins")
        .select("church_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!error && Array.isArray(data) && data.length > 0) {
        return data[0].church_id ?? null;
      }
    } catch (e) {
      // ignore
    }

    return null;
  }, []);

  const route = useCallback(async () => {
    if (!isActiveRef.current) return;

    setLoading(true);
    setErrorText("");
    setShowFind(false);

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const userId = sessionData?.session?.user?.id;

      // If not logged in (or session missing), default to Find UI (do not navigate)
      if (!userId) {
        if (!isActiveRef.current) return;
        setShowFind(true);
        return;
      }

      const churchId = await resolveChurchId(userId);

      if (!churchId) {
        // No church membership -> show Find Your Church UI
        if (!isActiveRef.current) return;
        setShowFind(true);
        return;
      }

      // Has church -> go to Church
      navigation.replace("ChurchProfilePublic", { churchId });
      return;
    } catch (e) {
      console.log("ChurchEntry routing error:", e);
      if (!isActiveRef.current) return;
      setErrorText("We couldn't open Church right now.");
    } finally {
      if (!isActiveRef.current) return;
      setLoading(false);
    }
  }, [navigation, resolveChurchId]);

  useFocusEffect(
    useCallback(() => {
      isActiveRef.current = true;
      route();

      return () => {
        isActiveRef.current = false;
      };
    }, [route])
  );

  // Error fallback
  if (!loading && errorText) {
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
        <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
          Church
        </Text>

        <Text style={{ color: "tomato", marginTop: 10, textAlign: "center" }}>
          {errorText}
        </Text>

        <Text
          onPress={() => navigation.navigate("ChurchFind")}
          style={{ color: theme.colors.gold, marginTop: 16, fontWeight: "900" }}
        >
          Find your church
        </Text>
      </View>
    );
  }

  // No membership -> show Find UI here (matches your required behavior)
  if (!loading && showFind) {
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
        <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 18 }}>
          Find your church
        </Text>

        <Text style={{ color: theme.colors.muted, marginTop: 10, textAlign: "center" }}>
          Join your church to access its hub, updates and community.
        </Text>

        <Pressable
          onPress={() => navigation.navigate("ChurchFind")}
          style={{
            marginTop: 18,
            paddingVertical: 12,
            paddingHorizontal: 18,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.colors.gold,
          }}
        >
          <Text style={{ color: theme.colors.gold, fontWeight: "900" }}>
            Find your church
          </Text>
        </Pressable>
      </View>
    );
  }

  // Loading state
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
      <ActivityIndicator size="large" color={theme.colors.gold} />
      <Text style={{ color: theme.colors.muted, marginTop: 10 }}>
        Opening Church…
      </Text>
    </View>
  );
}
