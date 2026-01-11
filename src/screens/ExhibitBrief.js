// src/screens/ExhibitBrief.js
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, {
    Easing,
    FadeIn,
    FadeOut,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withTiming,
} from "react-native-reanimated";

import Screen from "../components/Screen";

export default function ExhibitBrief() {
  const navigation = useNavigation();
  const route = useRoute();

  // Backwards + forwards compatible param reads
  const exhibit =
    route?.params?.exhibit ??
    route?.params?.item ??
    route?.params?.brief ??
    null;

  const opponentRaw =
    route?.params?.opponent_type ??
    route?.params?.opponentType ??
    route?.params?.opponent ??
    "";

  const opponent = String(opponentRaw || "").toLowerCase();

  const stamp = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    // Subtle haptic + “case file opened” feel
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    // Stamp animation: pop + settle
    stamp.value = 0;
    stamp.value = withDelay(
      120,
      withSequence(
        withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }),
        withTiming(0.92, { duration: 140 }),
        withTiming(1, { duration: 120 })
      )
    );

    // Glow pulse
    glow.value = 0;
    glow.value = withDelay(
      80,
      withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exhibit?.key, exhibit?.title]);

  const stampStyle = useAnimatedStyle(() => {
    const s = interpolate(stamp.value, [0, 1], [0.85, 1]);
    const r = interpolate(stamp.value, [0, 1], [-10, 0]);
    return {
      transform: [{ scale: s }, { rotate: `${r}deg` }],
      opacity: stamp.value,
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    const o = interpolate(glow.value, [0, 1], [0, 1]);
    return { opacity: o };
  });

  const title = exhibit?.title || "Exhibit Brief";
  const meta = exhibit?.meta || "";
  const proof = exhibit?.proof || "";
  const howToUse = exhibit?.howToUse || "";
  const muslimAngle = exhibit?.muslimAngle || "";
  const refs = Array.isArray(exhibit?.refs) ? exhibit.refs : [];

  const opponentNote = useMemo(() => {
    if (opponent !== "muslim") return null;
    return "Opponent is Muslim: stay respectful, press for definitions, evidence, and consistency.";
  }, [opponent]);

  const missing = !exhibit;

  return (
    <Screen backgroundColor="#0D1B2A">
      {/* Top Bar */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: "#102740",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable onPress={() => navigation.goBack()} style={{ width: 90 }}>
          <Text style={{ color: "#9CD8C3", fontWeight: "900" }}>← Back</Text>
        </Pressable>

        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>
            Case File
          </Text>
          <Text style={{ color: "#6f87a2", marginTop: 2 }}>
            Exhibit Brief
          </Text>
        </View>

        <View style={{ width: 90, alignItems: "flex-end" }}>
          <Animated.View
            entering={FadeIn.duration(200)}
            style={[
              {
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: "#FFCF4A",
                backgroundColor: "rgba(255,207,74,0.06)",
              },
              stampStyle,
            ]}
          >
            <Text style={{ color: "#FFCF4A", fontWeight: "900" }}>
              EXHIBIT
            </Text>
          </Animated.View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* If exhibit missing, show a clear fallback instead of blank screen */}
        {missing ? (
          <View
            style={{
              marginTop: 8,
              padding: 14,
              borderRadius: 18,
              backgroundColor: "#11233B",
              borderWidth: 1,
              borderColor: "#FFCF4A",
            }}
          >
            <Text style={{ color: "#FFCF4A", fontWeight: "900", fontSize: 18 }}>
              No Exhibit Loaded
            </Text>
            <Text style={{ color: "#fff", marginTop: 10, lineHeight: 20 }}>
              This screen didn’t receive an exhibit payload. Go back and open an exhibit again.
            </Text>

            <Pressable
              onPress={() => navigation.goBack()}
              style={{
                marginTop: 14,
                backgroundColor: "#1B6BF2",
                paddingVertical: 12,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900" }}>
                Return
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Title Card */}
            <Animated.View
              entering={FadeIn.duration(220)}
              exiting={FadeOut.duration(160)}
              style={{
                padding: 14,
                borderRadius: 18,
                backgroundColor: "#11233B",
                borderWidth: 1,
                borderColor: "#23466f",
              }}
            >
              <Text style={{ color: "#FFCF4A", fontWeight: "900", fontSize: 18 }}>
                {title}
              </Text>

              {!!meta ? (
                <Text style={{ color: "#6f87a2", marginTop: 8, lineHeight: 20 }}>
                  {meta}
                </Text>
              ) : null}

              {opponentNote ? (
                <Text style={{ color: "#9CD8C3", marginTop: 10, fontWeight: "900" }}>
                  {opponentNote}
                </Text>
              ) : null}
            </Animated.View>

            {/* Glow Divider */}
            <Animated.View
              style={[
                {
                  marginTop: 12,
                  height: 1,
                  backgroundColor: "#FFCF4A",
                  borderRadius: 999,
                },
                glowStyle,
              ]}
            />

            {/* The point */}
            {!!proof ? (
              <Animated.View
                entering={FadeIn.duration(220).delay(80)}
                style={{
                  marginTop: 14,
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: "#0D1B2A",
                  borderWidth: 1,
                  borderColor: "#23466f",
                }}
              >
                <Text style={{ color: "#CFE0FF", fontWeight: "900" }}>
                  The point
                </Text>
                <Text style={{ color: "#fff", marginTop: 8, lineHeight: 20 }}>
                  {proof}
                </Text>
              </Animated.View>
            ) : null}

            {/* How to use */}
            {!!howToUse ? (
              <Animated.View
                entering={FadeIn.duration(220).delay(120)}
                style={{
                  marginTop: 12,
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: "#0D1B2A",
                  borderWidth: 1,
                  borderColor: "#23466f",
                }}
              >
                <Text style={{ color: "#CFE0FF", fontWeight: "900" }}>
                  How to use it in debate
                </Text>
                <Text style={{ color: "#fff", marginTop: 8, lineHeight: 20 }}>
                  {howToUse}
                </Text>
              </Animated.View>
            ) : null}

            {/* If Muslim */}
            {!!muslimAngle ? (
              <Animated.View
                entering={FadeIn.duration(220).delay(160)}
                style={{
                  marginTop: 12,
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: "#0D1B2A",
                  borderWidth: 1,
                  borderColor: "#23466f",
                }}
              >
                <Text style={{ color: "#CFE0FF", fontWeight: "900" }}>
                  If opponent is Muslim
                </Text>
                <Text style={{ color: "#fff", marginTop: 8, lineHeight: 20 }}>
                  {muslimAngle}
                </Text>
              </Animated.View>
            ) : null}

            {/* What to look up */}
            {refs.length ? (
              <Animated.View
                entering={FadeIn.duration(220).delay(200)}
                style={{
                  marginTop: 12,
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: "#11233B",
                  borderWidth: 1,
                  borderColor: "#23466f",
                }}
              >
                <Text style={{ color: "#CFE0FF", fontWeight: "900" }}>
                  What to look up
                </Text>

                {refs.map((r, idx) => (
                  <View
                    key={`ref-${idx}`}
                    style={{
                      marginTop: 10,
                      padding: 12,
                      borderRadius: 14,
                      backgroundColor: "#0D1B2A",
                      borderWidth: 1,
                      borderColor: "#23466f",
                    }}
                  >
                    <Text style={{ color: "#9CD8C3", fontWeight: "900" }}>
                      {idx + 1}. {r}
                    </Text>
                  </View>
                ))}
              </Animated.View>
            ) : null}

            <Pressable
              onPress={() => navigation.goBack()}
              style={{
                marginTop: 16,
                backgroundColor: "#1B6BF2",
                paddingVertical: 12,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900" }}>
                Return to Evidence
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
