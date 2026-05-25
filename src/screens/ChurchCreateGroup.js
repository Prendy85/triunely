// src/screens/ChurchCreateGroup.js
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { supabase } from "../lib/supabase";
import { theme } from "../theme/theme";

const HEAVENLY_GOLD = "#D99400";
const DEEP_OLIVE = "#4F633B";
const SOFT_GOLD_BG = "rgba(217, 148, 0, 0.10)";
const SOFT_OLIVE_BG = "rgba(79, 99, 59, 0.10)";
const CARD_BORDER = "rgba(217, 148, 0, 0.18)";

const groupTypes = [
  "Tables",
  "Bible Studies",
  "Men’s Groups",
  "Women’s Groups",
  "Young Adults",
  "Prayer Groups",
];

const audienceOptions = [
  { key: "everyone", label: "Everyone" },
  { key: "men", label: "Men" },
  { key: "women", label: "Women" },
  { key: "young_adults", label: "Young Adults" },
  { key: "parents", label: "Parents" },
  { key: "seniors", label: "Seniors" },
  { key: "invite_only", label: "Invite Only" },
];

const visibilityOptions = [
  {
    key: "church",
    label: "Visible to church",
    description: "Eligible members can discover this group.",
  },
  {
    key: "hidden",
    label: "Hidden / invite only",
    description: "Only admins/leaders can add or invite people.",
  },
];

function TypePill({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? HEAVENLY_GOLD : CARD_BORDER,
        backgroundColor: selected ? SOFT_GOLD_BG : theme.colors.surface,
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Text
        style={{
          color: selected ? HEAVENLY_GOLD : theme.colors.text2,
          fontWeight: "900",
          fontSize: 12,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function OptionCard({ label, description, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        padding: 12,
        borderRadius: 16,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? HEAVENLY_GOLD : CARD_BORDER,
        backgroundColor: selected ? SOFT_GOLD_BG : theme.colors.surface,
        marginBottom: 8,
        opacity: pressed ? 0.82 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: selected ? HEAVENLY_GOLD : CARD_BORDER,
            backgroundColor: selected ? HEAVENLY_GOLD : theme.colors.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {selected ? <Ionicons name="checkmark" size={15} color="#fff" /> : null}
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: selected ? HEAVENLY_GOLD : theme.colors.text,
              fontWeight: "900",
              fontSize: 13,
            }}
          >
            {label}
          </Text>

          {description ? (
            <Text
              style={{
                color: theme.colors.muted,
                fontWeight: "700",
                fontSize: 12,
                lineHeight: 17,
                marginTop: 3,
              }}
            >
              {description}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function ChurchCreateGroup() {
  const navigation = useNavigation();
  const route = useRoute();

  const churchId = route?.params?.churchId || null;
  const churchName = route?.params?.churchName || "your church";

  const [title, setTitle] = useState("");
  const [type, setType] = useState("Tables");
  const [audience, setAudience] = useState("everyone");
  const [visibility, setVisibility] = useState("church");
  const [area, setArea] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [meetingDay, setMeetingDay] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const canCreate = useMemo(() => {
    return Boolean(churchId) && title.trim().length >= 3 && !saving;
  }, [churchId, title, saving]);

  async function ensureCreatorIsApprovedLeader({ groupId, churchId, userId }) {
    if (!groupId || !churchId || !userId) {
      throw new Error("Missing group, church, or user when assigning group leader.");
    }

    const { data: existingRows, error: existingError } = await supabase
      .from("church_group_members")
      .select("id, group_id, church_id, user_id, role, status")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .limit(1);

    if (existingError) {
      console.log("ensureCreatorIsApprovedLeader lookup error:", existingError);
      throw existingError;
    }

    const existing = Array.isArray(existingRows) && existingRows.length > 0 ? existingRows[0] : null;

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from("church_group_members")
        .update({
          church_id: churchId,
          role: "leader",
          status: "approved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        console.log("ensureCreatorIsApprovedLeader update error:", updateError);
        throw updateError;
      }

      return;
    }

    const { error: insertError } = await supabase.from("church_group_members").insert({
      group_id: groupId,
      church_id: churchId,
      user_id: userId,
      role: "leader",
      status: "approved",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      console.log("ensureCreatorIsApprovedLeader insert error:", insertError);
      throw insertError;
    }
  }

  async function handleCreate() {
    if (!churchId) {
      Alert.alert("Missing churchId", "Go back and open this screen from the church admin hub.");
      return;
    }

    if (title.trim().length < 3) {
      Alert.alert("Group name too short", "Enter at least 3 characters.");
      return;
    }

    try {
      setSaving(true);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const userId = sessionData?.session?.user?.id || null;

      if (!userId) {
        Alert.alert("Not signed in", "Please sign in again before creating a group.");
        return;
      }

      const trimmedTitle = title.trim();

      const { data: createdGroup, error: groupError } = await supabase
        .from("church_groups")
        .insert({
          church_id: churchId,
          name: trimmedTitle,
          type,
          audience,
          visibility,
          area: area.trim() || null,
          leader_name: leaderName.trim() || null,
          meeting_day: meetingDay.trim() || null,
          meeting_time: meetingTime.trim() || null,
          description: description.trim() || null,
          status: "active",
          is_public: visibility === "church",
          created_by: userId,
        })
        .select("id, church_id, name, created_by")
        .single();

      if (groupError) throw groupError;

      if (!createdGroup?.id) {
        throw new Error("Group was created but no group id was returned.");
      }

      await ensureCreatorIsApprovedLeader({
        groupId: createdGroup.id,
        churchId,
        userId,
      });

      Alert.alert("Group created", `${trimmedTitle} has been created for ${churchName}.`, [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (e) {
      console.log("Create church group error:", e);
      Alert.alert("Could not create group", e?.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
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
          <Ionicons name="chevron-back" size={20} color={DEEP_OLIVE} />
        </Pressable>

        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
          Create Group
        </Text>

        <View style={{ width: 38, height: 38 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 32,
        }}
      >
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 28,
            fontWeight: "900",
            letterSpacing: -0.7,
            marginBottom: 8,
          }}
        >
          New church group
        </Text>

        <Text
          style={{
            color: theme.colors.muted,
            fontSize: 15,
            fontWeight: "700",
            lineHeight: 22,
            marginBottom: 16,
          }}
        >
          Create a Table, Bible study, prayer group or discipleship community for {churchName}.
        </Text>

        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            borderRadius: 20,
            padding: 14,
            marginBottom: 14,
          }}
        >
          <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: "900", marginBottom: 10 }}>
            Group type
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {groupTypes.map((item) => (
              <TypePill
                key={item}
                label={item}
                selected={type === item}
                onPress={() => setType(item)}
              />
            ))}
          </View>
        </View>

        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            borderRadius: 20,
            padding: 14,
            marginBottom: 14,
          }}
        >
          <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: "900", marginBottom: 4 }}>
            Who is this group for?
          </Text>

          <Text
            style={{
              color: theme.colors.muted,
              fontWeight: "700",
              fontSize: 12,
              lineHeight: 18,
              marginBottom: 10,
            }}
          >
            This controls whether the group can be suggested to members.
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {audienceOptions.map((item) => (
              <TypePill
                key={item.key}
                label={item.label}
                selected={audience === item.key}
                onPress={() => setAudience(item.key)}
              />
            ))}
          </View>
        </View>

        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            borderRadius: 20,
            padding: 14,
            marginBottom: 14,
          }}
        >
          <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: "900", marginBottom: 4 }}>
            Visibility
          </Text>

          <Text
            style={{
              color: theme.colors.muted,
              fontWeight: "700",
              fontSize: 12,
              lineHeight: 18,
              marginBottom: 10,
            }}
          >
            Choose whether this group can be discovered or should stay private.
          </Text>

          {visibilityOptions.map((item) => (
            <OptionCard
              key={item.key}
              label={item.label}
              description={item.description}
              selected={visibility === item.key}
              onPress={() => setVisibility(item.key)}
            />
          ))}
        </View>

        <Text style={{ color: theme.colors.muted, fontWeight: "800", marginBottom: 8 }}>
          Group name
        </Text>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Table — Bitterne"
          placeholderTextColor={theme.input.placeholder}
          style={[theme.input.box, { marginBottom: 12 }]}
        />

        <Text style={{ color: theme.colors.muted, fontWeight: "800", marginBottom: 8 }}>
          Area / location
        </Text>

        <TextInput
          value={area}
          onChangeText={setArea}
          placeholder="e.g. Bitterne, Shirley, Church Hall"
          placeholderTextColor={theme.input.placeholder}
          style={[theme.input.box, { marginBottom: 12 }]}
        />

        <Text style={{ color: theme.colors.muted, fontWeight: "800", marginBottom: 8 }}>
          Leader name
        </Text>

        <TextInput
          value={leaderName}
          onChangeText={setLeaderName}
          placeholder="e.g. Rachel"
          placeholderTextColor={theme.input.placeholder}
          style={[theme.input.box, { marginBottom: 12 }]}
        />

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.muted, fontWeight: "800", marginBottom: 8 }}>
              Meeting day
            </Text>

            <TextInput
              value={meetingDay}
              onChangeText={setMeetingDay}
              placeholder="e.g. Tuesday"
              placeholderTextColor={theme.input.placeholder}
              style={[theme.input.box, { marginBottom: 12 }]}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.muted, fontWeight: "800", marginBottom: 8 }}>
              Time
            </Text>

            <TextInput
              value={meetingTime}
              onChangeText={setMeetingTime}
              placeholder="e.g. 7:30pm"
              placeholderTextColor={theme.input.placeholder}
              style={[theme.input.box, { marginBottom: 12 }]}
            />
          </View>
        </View>

        <Text style={{ color: theme.colors.muted, fontWeight: "800", marginBottom: 8 }}>
          Description
        </Text>

        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Short description of this group..."
          placeholderTextColor={theme.input.placeholder}
          multiline
          style={[
            theme.input.box,
            {
              minHeight: 96,
              textAlignVertical: "top",
              marginBottom: 14,
            },
          ]}
        />

        <Pressable
          onPress={handleCreate}
          disabled={!canCreate}
          style={[
            theme.button.primary,
            {
              borderRadius: 16,
              paddingVertical: 14,
              opacity: canCreate ? 1 : 0.5,
              flexDirection: "row",
              gap: 8,
            },
          ]}
        >
          <Ionicons name="add-circle-outline" size={18} color={theme.colors.text} />
          <Text style={theme.button.primaryText}>{saving ? "Creating..." : "Create group"}</Text>
        </Pressable>

        <View
          style={{
            marginTop: 14,
            backgroundColor: SOFT_OLIVE_BG,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            borderRadius: 18,
            padding: 14,
          }}
        >
          <Text style={{ color: DEEP_OLIVE, fontWeight: "900" }}>
            Leader permission note
          </Text>

          <Text
            style={{
              color: theme.colors.muted,
              fontWeight: "700",
              lineHeight: 19,
              marginTop: 6,
            }}
          >
            The creator of this group will automatically be added as an approved group leader, so they can manage members and approve join requests.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}