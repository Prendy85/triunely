// src/screens/ChurchEdit.js
import { useEffect, useState } from "react";
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

export default function ChurchEdit({ route, navigation }) {
  const churchId = route?.params?.churchId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);

  // Church fields (match ChurchProfilePublic)
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [about, setAbout] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        if (!churchId) {
          Alert.alert("Missing church", "No churchId was provided to this screen.");
          navigation.goBack();
          return;
        }

        setLoading(true);

        // 1) Must be signed in
        const { data: sessData, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) throw sessErr;

        const uid = sessData?.session?.user?.id || null;
        if (!uid) {
          Alert.alert("Not signed in", "Please sign in again.");
          navigation.goBack();
          return;
        }

        // 2) Admin permission check (robust under RLS)
        const { data: isAdminData, error: isAdminErr } = await supabase.rpc("is_church_admin", {
          target_church_id: churchId,
        });

        if (isAdminErr) {
          console.log("ChurchEdit is_church_admin rpc error:", isAdminErr);
          Alert.alert("Error", "Could not verify permissions.");
          navigation.goBack();
          return;
        }

        const admin = Boolean(isAdminData);

        if (!alive) return;
        setIsAdmin(admin);

        if (!admin) {
          Alert.alert("Not allowed", "You don't have permission to edit this church.");
          navigation.goBack();
          return;
        }

        // 3) Load church (same columns as ChurchProfilePublic)
        const { data, error } = await supabase
          .from("churches")
          .select("id, name, display_name, about, website, location")
          .eq("id", churchId)
          .single();

        if (error) throw error;

        if (!alive) return;

        setName(data?.name ?? "");
        setDisplayName(data?.display_name ?? "");
        setAbout(data?.about ?? "");
        setWebsite(data?.website ?? "");
        setLocation(data?.location ?? "");
      } catch (e) {
        console.log("ChurchEdit load error:", e);
        Alert.alert("Error", "Could not load church details.");
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
    if (!churchId) return;

    // Hard validation: name must exist (prevents NOT NULL errors)
    const cleanName = name.trim();
    if (!cleanName) {
      Alert.alert("Name required", "Please enter a church name.");
      return;
    }

    if (!isAdmin) {
      Alert.alert("Not allowed", "You don't have permission to edit this church.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: cleanName,
        display_name: displayName.trim() ? displayName.trim() : null,
        about: about.trim() ? about.trim() : null,
        location: location.trim() ? location.trim() : null,
        website: website.trim() ? website.trim() : null,
      };

      const { error } = await supabase.from("churches").update(payload).eq("id", churchId);
      if (error) throw error;

      Alert.alert("Saved", "Church profile updated.");
      navigation.goBack();
    } catch (e) {
      console.log("ChurchEdit save error:", e);
      Alert.alert("Save failed", e?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.gold} />
        <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900", marginBottom: 12 }}>
          Edit church profile
        </Text>

        <Text style={{ color: theme.colors.muted, marginBottom: 6 }}>Internal name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Church name (internal)"
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

        <Text style={{ color: theme.colors.muted, marginBottom: 6 }}>Display name</Text>
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
          placeholder="Tell people about your church"
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
            height: 140,
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
          onPress={onSave}
          style={[
            theme.button.primary,
            { borderRadius: 14, paddingVertical: 12, opacity: saving ? 0.7 : 1 },
          ]}
        >
          <Text style={theme.button.primaryText}>{saving ? "Saving…" : "Save changes"}</Text>
        </Pressable>

        <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 12, alignItems: "center" }}>
          <Text style={{ color: theme.colors.sageSoft, fontWeight: "800" }}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
