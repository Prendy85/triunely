// src/screens/Auth.js
import * as AuthSession from "expo-auth-session";
import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { supabase } from "../lib/supabase";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [mode, setMode] = useState("signup");
  const [loading, setLoading] = useState(false);

  function showErr(prefix, err) {
    const msg =
      (err && (err.message || err.error_description)) ||
      (typeof err === "string" ? err : JSON.stringify(err));
    Alert.alert(prefix, msg);
  }

  // Expo: compute a redirect that works in Expo Go and in builds
  const redirectTo = AuthSession.makeRedirectUri({
    // In Expo Go, using the proxy is easiest:
    // useProxy: true adds https://auth.expo.io/... which you added in Supabase > URL Config
    useProxy: true,
    scheme: "triunelyapp",
  });

    async function onSubmit() {
    if (!email || !pw) {
      return Alert.alert("Missing", "Enter email and password");
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        // 1) Create the user with email + password
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pw,
        });

        if (error) throw error;

        // 2) If Supabase did not automatically log us in, log in manually
        if (!data.session) {
          const { error: signInError } =
            await supabase.auth.signInWithPassword({
              email,
              password: pw,
            });
          if (signInError) throw signInError;
        }

        // 3) Optional small confirmation
        Alert.alert(
          "Welcome",
          "Your account has been created and you are now signed in."
        );
      } else {
        // LOGIN EXISTING USER
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: pw,
        });
        if (error) throw error;
      }
    } catch (e) {
      showErr("Auth error", e);
    } finally {
      setLoading(false);
    }
  }


  async function signInWithGoogle() {
    try {
      // Important: supply a redirect that Supabase will bounce back to after Google
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,                 // Expo Go proxy or your app scheme
          // helpful extras for refresh tokens:
          queryParams: { access_type: "offline", prompt: "consent" }
        }
      });
      if (error) throw error;
      // Supabase opens the browser; when the flow returns, App.js deep-link handler
      // (exchangeCodeForSession) logs the user in automatically.
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

  return (
    <View style={{ flex:1, backgroundColor:"#0D1B2A", padding:20, justifyContent:"center" }}>
      <Text style={{ color:"#fff", fontSize:28, fontWeight:"700", marginBottom:12 }}>Triunely</Text>
      <Text style={{ color:"#9bb3c9", marginBottom:16 }}>
        {mode === "signup" ? "Create an account" : "Sign in"}
      </Text>

      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        placeholderTextColor="#9bb3c9"
        value={email}
        onChangeText={setEmail}
        style={{ backgroundColor:"#11233B", color:"#fff", padding:12, borderRadius:10, marginBottom:10 }}
      />
      <TextInput
        secureTextEntry
        placeholder="Password (min 6 chars)"
        placeholderTextColor="#9bb3c9"
        value={pw}
        onChangeText={setPw}
        style={{ backgroundColor:"#11233B", color:"#fff", padding:12, borderRadius:10 }}
      />

      <Pressable onPress={onSubmit} disabled={loading}
        style={{ backgroundColor:"#1B6BF2", marginTop:16, padding:12, borderRadius:10 }}>
        <Text style={{ color:"#fff", fontWeight:"700", textAlign:"center" }}>
          {loading ? "Please wait…" : mode === "signup" ? "Sign up" : "Sign in"}
        </Text>
      </Pressable>

      <Pressable onPress={() => setMode(mode === "signup" ? "signin" : "signup")} style={{ marginTop:12 }}>
        <Text style={{ color:"#F2B705", textAlign:"center" }}>
          {mode === "signup" ? "Have an account? Sign in" : "New here? Create account"}
        </Text>
      </Pressable>

      <Pressable onPress={signInWithGoogle}
        style={{ backgroundColor:"#fff", marginTop:16, padding:12, borderRadius:10 }}>
        <Text style={{ color:"#0D1B2A", fontWeight:"700", textAlign:"center" }}>
          Continue with Google
        </Text>
      </Pressable>

      <Pressable onPress={testConnection} style={{ marginTop:16 }}>
        <Text style={{ color:"#9bb3c9", textAlign:"center" }}>Test Supabase connection</Text>
      </Pressable>
    </View>
  );
}
