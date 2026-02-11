import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";
import { supabase } from "../lib/supabase";
import { theme } from "../theme/theme";

export default function ChurchProfileEdit({ route, navigation }) {
  const { churchId } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("churches")
          .select("name, bio, location, website")
          .eq("id", churchId)
          .single();

        if (error) throw error;
        if (!alive) return;

        setName(data?.name ?? "");
        setBio(data?.bio ?? "");
        setLocation(data?.location ?? "");
        setWebsite(data?.website ?? "");
      } catch (e) {
        console.log("ChurchProfileEdit load error:", e);
        Alert.alert("Error", "Could not load church profile.");
        navigation.goBack();
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [churchId, navigation]);

  const onSave = async () => {
    try {
      if (!name.trim()) {
        Alert.alert("Missing name", "Church name cannot be empty.");
        return;
      }

      setSaving(true);

      const { error } = await supabase
        .from("churches")
        .update({
          name: name.trim(),
          bio: bio.trim(),
          location: location.trim(),
          website: website.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", churchId);

      if (error) throw error;

      Alert.alert("Saved", "Church profile updated.");
      navigation.goBack();
    } catch (e) {
      console.log("ChurchProfileEdit save error:", e);
      Alert.alert("Error", e?.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={theme.colors.gold} />
        <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, padding: 16 }}>
      <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 18, marginBottom: 12 }}>
        Edit church profile
      </Text>

      <Text style={{ color: theme.colors.muted, marginBottom: 6 }}>Church name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. St Mark’s Church"
        placeholderTextColor={theme.colors.muted}
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.divider,
          borderWidth: 1,
          borderRadius: 12,
          padding: 12,
          color: theme.colors.text,
          marginBottom: 12,
        }}
      />

      <Text style={{ color: theme.colors.muted, marginBottom: 6 }}>Bio</Text>
      <TextInput
        value={bio}
        onChangeText={setBio}
        placeholder="A short description of the church..."
        placeholderTextColor={theme.colors.muted}
        multiline
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.divider,
          borderWidth: 1,
          borderRadius: 12,
          padding: 12,
          color: theme.colors.text,
          height: 120,
          textAlignVertical: "top",
          marginBottom: 12,
        }}
      />

      <Text style={{ color: theme.colors.muted, marginBottom: 6 }}>Location</Text>
      <TextInput
        value={location}
        onChangeText={setLocation}
        placeholder="Town / City"
        placeholderTextColor={theme.colors.muted}
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.divider,
          borderWidth: 1,
          borderRadius: 12,
          padding: 12,
          color: theme.colors.text,
          marginBottom: 12,
        }}
      />

      <Text style={{ color: theme.colors.muted, marginBottom: 6 }}>Website</Text>
      <TextInput
        value={website}
        onChangeText={setWebsite}
        placeholder="https://"
        placeholderTextColor={theme.colors.muted}
        autoCapitalize="none"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.divider,
          borderWidth: 1,
          borderRadius: 12,
          padding: 12,
          color: theme.colors.text,
          marginBottom: 16,
        }}
      />

      <Pressable
        onPress={onSave}
        disabled={saving}
        style={[
          theme.button.primary,
          { opacity: saving ? 0.6 : 1, borderRadius: 14, paddingVertical: 12, alignItems: "center" },
        ]}
      >
        <Text style={theme.button.primaryText}>{saving ? "Saving…" : "Save changes"}</Text>
      </Pressable>
    </View>
  );
}
