// src/screens/Auth.js
import { Ionicons } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";

const CARD_BORDER = "rgba(15, 23, 42, 0.08)";
const AMBER_BORDER = "rgba(180, 83, 9, 0.18)";
const OLIVE_SOFT = "rgba(79, 99, 59, 0.10)";
const OLIVE_BORDER = "rgba(79, 99, 59, 0.18)";
const SHADOW = "rgba(15, 23, 42, 0.10)";

const displayFont = Platform.OS === "ios" ? "Georgia" : "serif";

const serifHeading = {
  fontFamily: displayFont,
  color: TEXT,
  fontWeight: "900",
  letterSpacing: -0.45,
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function AuthScreen({ onAuthSuccessStart, onAuthSuccessEnd }) {
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [mode, setMode] = useState("signin");
  const [loading, setLoading] = useState(false);
  const [animatingOut, setAnimatingOut] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const [keyboardLocked, setKeyboardLocked] = useState(false);
  const [authCoverVisible, setAuthCoverVisible] = useState(false);

  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const keyboardDismissTimersRef = useRef([]);
  const authLockRef = useRef(false);
  const transitionTimerRef = useRef(null);
  const authSuccessEndCalledRef = useRef(false);

  function showErr(prefix, err) {
    const msg =
      (err && (err.message || err.error_description)) ||
      (typeof err === "string" ? err : JSON.stringify(err));

    Alert.alert(prefix, msg);
  }

  const redirectTo = useMemo(
    () =>
      AuthSession.makeRedirectUri({
        useProxy: true,
        scheme: "triunelyapp",
      }),
    []
  );

  const logoScale = useSharedValue(1);
  const logoOpacity = useSharedValue(1);

  const glowScale = useSharedValue(0.25);
  const glowOpacity = useSharedValue(0);

  const coverOpacity = useSharedValue(0);

  const logoAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const glowAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const coverStyle = useAnimatedStyle(() => ({
    opacity: coverOpacity.value,
  }));

  useEffect(() => {
    return () => {
      clearKeyboardDismissTimers();

      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function safeCall(fn) {
    if (typeof fn === "function") fn();
  }

  function finishAuthTransitionOnce() {
    if (authSuccessEndCalledRef.current) return;

    authSuccessEndCalledRef.current = true;
    safeCall(onAuthSuccessEnd);
  }

  function clearKeyboardDismissTimers() {
    keyboardDismissTimersRef.current.forEach((timer) => clearTimeout(timer));
    keyboardDismissTimersRef.current = [];
  }

  function hardDismissKeyboard() {
    emailInputRef.current?.blur?.();
    passwordInputRef.current?.blur?.();
    Keyboard.dismiss();
  }

  function dismissAuthKeyboardRepeatedly() {
    clearKeyboardDismissTimers();

    hardDismissKeyboard();

    const delays = [40, 90, 160, 260, 420, 650, 950, 1300];

    keyboardDismissTimersRef.current = delays.map((delay) =>
      setTimeout(() => {
        hardDismissKeyboard();
      }, delay)
    );
  }

  function beginAuthLock({ showCover = true } = {}) {
    authLockRef.current = true;
    setKeyboardLocked(true);

    if (showCover) {
      setAuthCoverVisible(true);
      coverOpacity.value = 1;
    }

    dismissAuthKeyboardRepeatedly();
  }

  function releaseAuthLock() {
    authLockRef.current = false;
    setKeyboardLocked(false);
    setAuthCoverVisible(false);
    authSuccessEndCalledRef.current = false;
    coverOpacity.value = 0;

    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    clearKeyboardDismissTimers();
    hardDismissKeyboard();
  }

  function handleInputFocus() {
    if (authLockRef.current || keyboardLocked || loading || animatingOut) {
      hardDismissKeyboard();
    }
  }

  function playExitAnimation() {
    beginAuthLock({ showCover: true });

    setAnimatingOut(true);
    safeCall(onAuthSuccessStart);

    authSuccessEndCalledRef.current = false;

    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    /*
      Auth.js now does NO logo transition.
      It only covers the login form with cream while App.js takes over.
      App.js owns the proper logo split/reveal animation.
    */
    coverOpacity.value = 1;

    logoScale.value = withTiming(1, {
      duration: 80,
      easing: Easing.out(Easing.quad),
    });

    logoOpacity.value = withTiming(1, {
      duration: 80,
      easing: Easing.out(Easing.quad),
    });

    transitionTimerRef.current = setTimeout(() => {
      hardDismissKeyboard();
      finishAuthTransitionOnce();
      runOnJS(setAnimatingOut)(false);
    }, 220);
  }

  async function onSubmit() {
    if (loading || animatingOut) return;

    const cleanEmail = email.trim();
    const cleanPassword = pw;

    if (!cleanEmail || !cleanPassword) {
      hardDismissKeyboard();
      return Alert.alert("Missing", "Enter email and password");
    }

    beginAuthLock({ showCover: true });
    setLoading(true);

    let authSucceeded = false;

    try {
      await wait(220);
      dismissAuthKeyboardRepeatedly();

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (error) throw error;

        if (!data.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword,
          });

          if (signInError) throw signInError;
        }

        authSucceeded = true;

        setAuthCoverVisible(false);
        coverOpacity.value = 0;

        Alert.alert(
          "Welcome",
          "Your account has been created and you are now signed in.",
          [
            {
              text: "Continue",
              onPress: playExitAnimation,
            },
          ]
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (error) throw error;

        authSucceeded = true;

        dismissAuthKeyboardRepeatedly();
        playExitAnimation();
      }
    } catch (e) {
      releaseAuthLock();
      showErr("Auth error", e);
    } finally {
      setLoading(false);

      if (!authSucceeded) {
        releaseAuthLock();
      }
    }
  }

  async function signInWithGoogle() {
    if (loading || animatingOut) return;

    beginAuthLock({ showCover: true });
    setLoading(true);

    try {
      await wait(180);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;
    } catch (e) {
      releaseAuthLock();
      showErr("Google sign-in failed", e);
    } finally {
      setLoading(false);
    }
  }

  async function testConnection() {
    dismissAuthKeyboardRepeatedly();

    try {
      const { error } = await supabase.auth.getSettings();

      if (error) throw error;

      Alert.alert("Supabase OK", "Connection succeeded.");
    } catch (e) {
      showErr("Connection failed", e);
    }
  }

  const disableAll = loading || animatingOut || keyboardLocked || authCoverVisible;
  const isSignup = mode === "signup";

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: PREMIUM_CREAM }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingTop: Math.max(insets.top + 4, 18),
            paddingBottom: Math.max(insets.bottom + 20, 30),
            justifyContent: "center",
          }}
        >
          <View style={{ alignItems: "center", marginBottom: 18 }}>
            <Animated.View
              style={[
                {
                  position: "absolute",
                  width: 210,
                  height: 210,
                  borderRadius: 999,
                  backgroundColor: "rgba(180, 83, 9, 0.12)",
                  shadowColor: EVENT_AMBER,
                  shadowOpacity: 0.28,
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
                style={{
                  width: 230,
                  height: 230,
                  marginBottom: -6,
                }}
                resizeMode="contain"
              />
            </Animated.View>

            <Text
              style={[
                serifHeading,
                {
                  fontSize: 30,
                  lineHeight: 35,
                  textAlign: "center",
                  opacity: authCoverVisible || animatingOut ? 0 : 1,
                },
              ]}
            >
              {isSignup ? "Create your account" : "Welcome back"}
            </Text>

            <Text
              style={{
                color: MUTED,
                marginTop: 6,
                fontSize: 13,
                lineHeight: 19,
                fontWeight: "700",
                textAlign: "center",
                opacity: authCoverVisible || animatingOut ? 0 : 1,
                maxWidth: 310,
              }}
            >
              {isSignup
                ? "Join Triunely and begin your daily walk of prayer, fellowship, and formation."
                : "Sign in to continue your prayer, fellowship, and daily formation journey."}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: SURFACE,
              borderRadius: 28,
              borderWidth: 1,
              borderColor: AMBER_BORDER,
              padding: 16,
              shadowColor: SHADOW,
              shadowOpacity: 0.08,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
              elevation: 3,
              opacity: authCoverVisible || animatingOut ? 0 : 1,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                backgroundColor: PREMIUM_CREAM,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                padding: 4,
                marginBottom: 14,
              }}
            >
              <Pressable
                onPress={() => setMode("signin")}
                disabled={disableAll}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 9,
                  borderRadius: 999,
                  alignItems: "center",
                  backgroundColor: !isSignup ? EVENT_AMBER : "transparent",
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text
                  style={{
                    color: !isSignup ? "#FFFFFF" : MUTED,
                    fontSize: 13,
                    fontWeight: "900",
                  }}
                >
                  Sign in
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setMode("signup")}
                disabled={disableAll}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 9,
                  borderRadius: 999,
                  alignItems: "center",
                  backgroundColor: isSignup ? EVENT_AMBER : "transparent",
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text
                  style={{
                    color: isSignup ? "#FFFFFF" : MUTED,
                    fontSize: 13,
                    fontWeight: "900",
                  }}
                >
                  Create account
                </Text>
              </Pressable>
            </View>

            <Text
              style={{
                color: TEXT,
                fontSize: 13,
                fontWeight: "900",
                marginBottom: 7,
              }}
            >
              Email
            </Text>

            <View
              style={{
                backgroundColor: PREMIUM_CREAM,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                marginBottom: 12,
              }}
            >
              <Ionicons name="mail-outline" size={18} color={OLIVE} />

              <TextInput
                ref={emailInputRef}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Email address"
                placeholderTextColor="rgba(107, 114, 128, 0.72)"
                value={email}
                onChangeText={setEmail}
                editable={!disableAll}
                showSoftInputOnFocus={!disableAll}
                caretHidden={disableAll}
                returnKeyType="done"
                blurOnSubmit
                onFocus={handleInputFocus}
                onSubmitEditing={() => {
                  hardDismissKeyboard();
                }}
                textContentType="username"
                autoComplete="email"
                style={{
                  flex: 1,
                  color: TEXT,
                  paddingVertical: 12,
                  paddingHorizontal: 10,
                  fontSize: 15,
                  fontWeight: "650",
                }}
              />
            </View>

            <Text
              style={{
                color: TEXT,
                fontSize: 13,
                fontWeight: "900",
                marginBottom: 7,
              }}
            >
              Password
            </Text>

            <View
              style={{
                backgroundColor: PREMIUM_CREAM,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
              }}
            >
              <Ionicons name="lock-closed-outline" size={18} color={OLIVE} />

              <TextInput
                ref={passwordInputRef}
                secureTextEntry={!passwordVisible}
                placeholder={isSignup ? "Password (min 6 chars)" : "Password"}
                placeholderTextColor="rgba(107, 114, 128, 0.72)"
                value={pw}
                onChangeText={setPw}
                editable={!disableAll}
                showSoftInputOnFocus={!disableAll}
                caretHidden={disableAll}
                onFocus={handleInputFocus}
                onSubmitEditing={onSubmit}
                returnKeyType="done"
                blurOnSubmit
                textContentType={isSignup ? "newPassword" : "password"}
                autoComplete={isSignup ? "password-new" : "password"}
                style={{
                  flex: 1,
                  color: TEXT,
                  paddingVertical: 12,
                  paddingHorizontal: 10,
                  fontSize: 15,
                  fontWeight: "650",
                }}
              />

              <Pressable
                onPress={() => setPasswordVisible((prev) => !prev)}
                disabled={disableAll}
                hitSlop={10}
                style={({ pressed }) => ({
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed ? OLIVE_SOFT : "transparent",
                  opacity: disableAll ? 0.6 : 1,
                })}
              >
                <Ionicons
                  name={passwordVisible ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={MUTED}
                />
              </Pressable>
            </View>

            <Pressable
              onPressIn={() => {
                if (!email.trim() || !pw || disableAll) return;
                beginAuthLock({ showCover: true });
              }}
              onPress={onSubmit}
              disabled={disableAll}
              style={({ pressed }) => ({
                backgroundColor: EVENT_AMBER,
                marginTop: 16,
                paddingVertical: 13,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: AMBER_BORDER,
                opacity: disableAll ? 0.65 : 1,
                shadowColor: EVENT_AMBER,
                shadowOpacity: disableAll ? 0 : 0.18,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 5 },
                elevation: disableAll ? 0 : 3,
                transform: [{ scale: pressed && !disableAll ? 0.98 : 1 }],
              })}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontWeight: "900",
                  textAlign: "center",
                  fontSize: 15,
                }}
              >
                {loading
                  ? "Please wait…"
                  : isSignup
                  ? "Create account"
                  : "Sign in"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setMode(isSignup ? "signin" : "signup")}
              disabled={disableAll}
              style={({ pressed }) => ({
                marginTop: 13,
                opacity: disableAll ? 0.65 : pressed ? 0.75 : 1,
              })}
            >
              <Text
                style={{
                  color: EVENT_BROWN,
                  textAlign: "center",
                  fontWeight: "900",
                  fontSize: 13,
                }}
              >
                {isSignup
                  ? "Already have an account? Sign in"
                  : "New here? Create account"}
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={signInWithGoogle}
            disabled={disableAll}
            style={({ pressed }) => ({
              backgroundColor: SURFACE,
              marginTop: 14,
              paddingVertical: 13,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: OLIVE_BORDER,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              opacity: disableAll ? 0.65 : pressed ? 0.85 : 1,
              shadowColor: SHADOW,
              shadowOpacity: 0.04,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: 1,
            })}
          >
            <Ionicons name="logo-google" size={18} color={OLIVE} />

            <Text
              style={{
                color: OLIVE,
                fontWeight: "900",
                textAlign: "center",
                fontSize: 14,
                marginLeft: 8,
              }}
            >
              Continue with Google
            </Text>
          </Pressable>

          <Pressable
            onPress={testConnection}
            disabled={disableAll}
            style={({ pressed }) => ({
              marginTop: 14,
              opacity: disableAll ? 0.5 : pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                color: MUTED,
                textAlign: "center",
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              Test Supabase connection
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {authCoverVisible || animatingOut ? (
        <Animated.View
          pointerEvents="auto"
          style={[
            {
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              zIndex: 999,
              elevation: 999,
              backgroundColor: PREMIUM_CREAM,
            },
            coverStyle,
          ]}
        />
      ) : null}
    </SafeAreaView>
  );
}