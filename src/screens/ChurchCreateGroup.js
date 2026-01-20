// src/screens/ChurchCreateGroup.js
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { theme } from "../theme/theme";

export default function ChurchCreateGroup() {
  const navigation = useNavigation();
  const route = useRoute();

  const churchId = route?.params?.churchId || null;

  const [title, setTitle] = useState("");

  const canCreate = useMemo(() => {
    return Boolean(churchId) && title.trim().length >= 3;
  }, [churchId, title]);

  function handleCreate() {
    if (!churchId) {
      Alert.alert("Missing churchId", "Go back and open this screen from the church inbox.");
      return;
    }

    if (title.trim().length < 3) {
      Alert.alert("Group name too short", "Enter at least 3 characters.");
      return;
    }

    // Placeholder for now. Next step will wire this to Supabase.
    Alert.alert("Next step", "Group creation UI is in place. Next we wire the database insert.");
    navigation.goBack();
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 14,
          paddingTop: 14,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.divider,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: theme.colors.divider,
            backgroundColor: theme.colors.surface,
          }}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color={theme.colors.text2} />
        </Pressable>

        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
          Create Group
        </Text>

        <View style={{ width: 38, height: 38 }} />
      </View>

      {/* Body */}
      <View style={{ padding: 14 }}>
        <Text style={{ color: theme.colors.muted, fontWeight: "800", marginBottom: 8 }}>
          Group name
        </Text>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Prayer Team"
          placeholderTextColor={theme.input.placeholder}
          style={theme.input.box}
        />

        <Pressable
          onPress={handleCreate}
          disabled={!canCreate}
          style={[
            theme.button.primary,
            {
              marginTop: 14,
              borderRadius: 14,
              paddingVertical: 12,
              opacity: canCreate ? 1 : 0.5,
            },
          ]}
        >
          <Text style={theme.button.primaryText}>Create group</Text>
        </Pressable>

        <Text style={{ color: theme.colors.muted, marginTop: 12 }}>
          Next step: we wire this to create a group thread + add members.
        </Text>
      </View>
    </View>
  );
}
