// src/screens/Auth.js
import * as AuthSession from "expo-auth-session";
import { useMemo, useState } from "react";
import { Alert, Image, Pressable, Text, TextInput, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { supabase } from "../lib/supabase";

export default function AuthScreen({ onAuthSuccessStart, onAuthSuccessEnd }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [mode, setMode] = useState("signin"); // ✅ Default to SIGN IN
  const [loading, setLoading] = useState(false);

  // ✅ local lock while animating (prevents double taps)
  const [animatingOut, setAnimatingOut] = useState(false);

  function showErr(prefix, err) {
    const msg =
      (err && (err.message || err.error_description)) ||
      (typeof err === "string" ? err : JSON.stringify(err));
    Alert.alert(prefix, msg);
  }

  // Expo redirect
  const redirectTo = useMemo(
    () =>
      AuthSession.makeRedirectUri({
        useProxy: true,
        scheme: "triunelyapp",
      }),
    []
  );

  // ✅ Reanimated values
  const logoScale = useSharedValue(1);
  const logoOpacity = useSharedValue(1);

  // ✅ Glow should NOT show on load
  const glowScale = useSharedValue(0.25); // start tiny
  const glowOpacity = useSharedValue(0);  // invisible

  const logoAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const glowAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  function safeCall(fn) {
    if (typeof fn === "function") fn();
  }

  function playExitAnimation() {
    setAnimatingOut(true);
    safeCall(onAuthSuccessStart);

    // ✅ Smooth, premium timing
    const D = 1150;
    const ease = Easing.out(Easing.cubic);

    // ✅ Glow: appear + expand, then bloom big + fade out
    glowScale.value = 0.25;
    glowOpacity.value = 0;

    // pop in quickly (visible + small expansion)
    glowOpacity.value = withTiming(0.42, {
      duration: 160,
      easing: Easing.out(Easing.quad),
    });
    glowScale.value = withTiming(0.85, {
      duration: 160,
      easing: Easing.out(Easing.quad),
    });

    // then bloom big + fade out smoothly
    glowScale.value = withTiming(2.35, { duration: D, easing: ease });
    glowOpacity.value = withTiming(0, { duration: D, easing: ease });

    // ✅ Logo zooms toward user & fades
    logoScale.value = withTiming(1.65, { duration: D, easing: ease });
    logoOpacity.value = withTiming(
      0,
      { duration: D, easing: ease },
      (finished) => {
        if (finished) {
          runOnJS(safeCall)(onAuthSuccessEnd);
          runOnJS(setAnimatingOut)(false);
        }
      }
    );
  }

  async function onSubmit() {
    if (!email || !pw) {
      return Alert.alert("Missing", "Enter email and password");
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pw,
        });
        if (error) throw error;

        if (!data.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password: pw,
          });
          if (signInError) throw signInError;
        }

        Alert.alert(
          "Welcome",
          "Your account has been created and you are now signed in."
        );

        // ✅ animate into the app
        playExitAnimation();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: pw,
        });
        if (error) throw error;

        // ✅ animate into the app
        playExitAnimation();
      }
    } catch (e) {
      showErr("Auth error", e);
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) throw error;
    } catch (e) {
      showErr("Google sign-in failed", e);
    }
  }

  async function testConnection() {
    try {
      const { error } = await supabase.auth.getSettings();
      if (error) throw error;
      Alert.alert("Supabase OK", "Connection succeeded.");
    } catch (e) {
      showErr("Connection failed", e);
    }
  }

  const disableAll = loading || animatingOut;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FFFFFF",
        padding: 20,
        justifyContent: "center",
      }}
    >
      {/* ✅ Logo + glow */}
      <View style={{ alignItems: "center", marginBottom: 22 }}>
        {/* Glow halo behind (invisible until animation starts) */}
        <Animated.View
          style={[
            {
              position: "absolute",
              width: 240,
              height: 240,
              borderRadius: 240,
              backgroundColor: "rgba(242,183,5,0.22)",
              shadowColor: "#F2B705",
              shadowOpacity: 0.35,
              shadowRadius: 22,
              shadowOffset: { width: 0, height: 10 },
              elevation: 10,
            },
            glowAnimStyle,
          ]}
        />

        <Animated.View style={logoAnimStyle}>
          <Image
            source={require("../assets/brand/triunely-logo.png")}
            style={{ width: 320, height: 320, marginBottom: 10 }}
            resizeMode="contain"
          />
        </Animated.View>

        <Text
          style={{
            color: "#6B7280",
            marginTop: 4,
            fontSize: 16,
            fontWeight: "700",
            opacity: animatingOut ? 0 : 1,
          }}
        >
          {mode === "signup" ? "Create an account" : "Sign in"}
        </Text>
      </View>

      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        placeholderTextColor="#9CA3AF"
        value={email}
        onChangeText={setEmail}
        editable={!disableAll}
        style={{
          backgroundColor: "#F8FAFC",
          color: "#0F172A",
          padding: 14,
          borderRadius: 14,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          opacity: animatingOut ? 0.5 : 1,
        }}
      />

      <TextInput
        secureTextEntry
        placeholder="Password (min 6 chars)"
        placeholderTextColor="#9CA3AF"
        value={pw}
        onChangeText={setPw}
        editable={!disableAll}
        style={{
          backgroundColor: "#F8FAFC",
          color: "#0F172A",
          padding: 14,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          opacity: animatingOut ? 0.5 : 1,
        }}
      />

      <Pressable
        onPress={onSubmit}
        disabled={disableAll}
        style={{
          backgroundColor: "#F2B705",
          marginTop: 18,
          padding: 14,
          borderRadius: 14,
          opacity: disableAll ? 0.65 : 1,
        }}
      >
        <Text
          style={{
            color: "#0F172A",
            fontWeight: "900",
            textAlign: "center",
            fontSize: 16,
          }}
        >
          {loading ? "Please wait…" : mode === "signup" ? "Sign up" : "Sign in"}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => setMode(mode === "signup" ? "signin" : "signup")}
        disabled={disableAll}
        style={{ marginTop: 14, opacity: disableAll ? 0.65 : 1 }}
      >
        <Text style={{ color: "#B8860B", textAlign: "center", fontWeight: "800" }}>
          {mode === "signup" ? "Have an account? Sign in" : "New here? Create account"}
        </Text>
      </Pressable>

      <Pressable
        onPress={signInWithGoogle}
        disabled={disableAll}
        style={{
          backgroundColor: "#FFFFFF",
          marginTop: 16,
          padding: 14,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          opacity: disableAll ? 0.65 : 1,
        }}
      >
        <Text style={{ color: "#0F172A", fontWeight: "900", textAlign: "center", fontSize: 15 }}>
          Continue with Google
        </Text>
      </Pressable>

      <Pressable
        onPress={testConnection}
        disabled={disableAll}
        style={{ marginTop: 16, opacity: disableAll ? 0.65 : 1 }}
      >
        <Text style={{ color: "#9CA3AF", textAlign: "center" }}>
          Test Supabase connection
        </Text>
      </Pressable>
    </View>
  );
}