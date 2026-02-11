// src/screens/ChurchCreateChurch.js
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";
import { theme } from "../theme/theme";

function normalizeWebsite(input) {
  const w = (input || "").trim();
  if (!w) return null;
  if (w.startsWith("http://") || w.startsWith("https://")) return w;
  return `https://${w}`;
}

export default function ChurchCreateChurch({ navigation }) {
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(""); // internal
  const [displayName, setDisplayName] = useState(""); // public
  const [about, setAbout] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");

  const onCreate = async () => {
    const dn = displayName.trim();
    const n = name.trim() || dn; // ✅ auto-fill internal name from displayName

    if (!dn) {
      Alert.alert("Missing info", "Please enter a display name for your church.");
      return;
    }

    try {
      setSaving(true);

      const { data, error } = await supabase.rpc("create_church", {
        p_name: n,
        p_display_name: dn,
        p_about: about.trim() || null,
        p_location: location.trim() || null,
        p_website: normalizeWebsite(website),
      });

      if (error) throw error;

      const newChurchId = data;
      if (!newChurchId) throw new Error("No church id returned.");

      navigation.replace("ChurchProfilePublic", {
        churchId: newChurchId,
        isDefaultTriunelyChurch: false,
      });
    } catch (e) {
      console.log("create church error:", e);
      Alert.alert("Could not create church", e?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 18,
            fontWeight: "900",
            marginBottom: 12,
          }}
        >
          Create your church profile
        </Text>

        <Text style={{ color: theme.colors.muted, marginBottom: 6 }}>
          Internal name (optional)
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. St Peters Farnham"
          placeholderTextColor={theme.colors.muted}
          style={{
            borderWidth: 1,
            borderColor: theme.colors.divider,
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 14,
          }}
        />

        <Text style={{ color: theme.colors.muted, marginBottom: 6 }}>
          Display name
        </Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="What users will see"
          placeholderTextColor={theme.colors.muted}
          style={{
            borderWidth: 1,
            borderColor: theme.colors.divider,
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 14,
          }}
        />

        <Text style={{ color: theme.colors.muted, marginBottom: 6 }}>About</Text>
        <TextInput
          value={about}
          onChangeText={setAbout}
          placeholder="Short description"
          placeholderTextColor={theme.colors.muted}
          multiline
          style={{
            borderWidth: 1,
            borderColor: theme.colors.divider,
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            height: 120,
            textAlignVertical: "top",
            marginBottom: 14,
          }}
        />

        <Text style={{ color: theme.colors.muted, marginBottom: 6 }}>Location</Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. Farnham"
          placeholderTextColor={theme.colors.muted}
          style={{
            borderWidth: 1,
            borderColor: theme.colors.divider,
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 14,
          }}
        />

        <Text style={{ color: theme.colors.muted, marginBottom: 6 }}>Website</Text>
        <TextInput
          value={website}
          onChangeText={setWebsite}
          placeholder="https://..."
          placeholderTextColor={theme.colors.muted}
          autoCapitalize="none"
          style={{
            borderWidth: 1,
            borderColor: theme.colors.divider,
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 14,
          }}
        />

        <Pressable
          disabled={saving}
          onPress={onCreate}
          style={[
            theme.button.primary,
            { borderRadius: 14, paddingVertical: 12, opacity: saving ? 0.7 : 1 },
          ]}
        >
          {saving ? (
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ActivityIndicator size="small" color={theme.colors.text} />
              <Text style={theme.button.primaryText}>Creating…</Text>
            </View>
          ) : (
            <Text style={theme.button.primaryText}>Create church</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => navigation.goBack()}
          style={{ marginTop: 12, alignItems: "center" }}
        >
          <Text style={{ color: theme.colors.sageSoft, fontWeight: "800" }}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
