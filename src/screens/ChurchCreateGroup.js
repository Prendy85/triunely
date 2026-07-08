// src/screens/ChurchCreateGroup.js
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";

const CARD_BORDER = "rgba(15, 23, 42, 0.08)";
const AMBER_SOFT = "rgba(180, 83, 9, 0.10)";
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

const defaultGroupCategories = [
  {
    id: "Tables",
    title: "Tables",
    subtitle: "Local discipleship tables and smaller relational groups.",
    icon: "restaurant-outline",
    tint: "amber",
    source: "default",
  },
  {
    id: "Bible Studies",
    title: "Bible Studies",
    subtitle: "Scripture-focused groups and study communities.",
    icon: "book-outline",
    tint: "olive",
    source: "default",
  },
  {
    id: "Men’s Groups",
    title: "Men’s Groups",
    subtitle: "Men’s fellowship, discipleship and accountability groups.",
    icon: "man-outline",
    tint: "amber",
    source: "default",
  },
  {
    id: "Women’s Groups",
    title: "Women’s Groups",
    subtitle: "Women’s fellowship, encouragement and discipleship groups.",
    icon: "woman-outline",
    tint: "olive",
    source: "default",
  },
  {
    id: "Young Adults",
    title: "Young Adults",
    subtitle: "Groups for younger adults growing in faith and friendship.",
    icon: "people-circle-outline",
    tint: "amber",
    source: "default",
  },
  {
    id: "Prayer Groups",
    title: "Prayer Groups",
    subtitle: "Prayer gatherings, intercession and app Prayer Spaces.",
    icon: "hand-left-outline",
    tint: "olive",
    source: "default",
  },
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

const meetingFormatOptions = [
  {
    key: "physical",
    label: "In person",
    description:
      "This group meets physically at a church, home, hall, or local place.",
  },
  {
    key: "online",
    label: "Online",
    description:
      "This group meets through Zoom, Teams, Google Meet, or another online link.",
  },
  {
    key: "hybrid",
    label: "In person + online",
    description: "This group has a physical meeting and an online option.",
  },
  {
    key: "app_only",
    label: "App-only Prayer Space",
    description:
      "This group mainly exists inside Triunely for prayer requests and ongoing prayer.",
  },
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

function tintColors(tint) {
  if (tint === "amber") {
    return {
      soft: AMBER_SOFT,
      border: AMBER_BORDER,
      main: EVENT_AMBER,
      strong: EVENT_BROWN,
    };
  }

  return {
    soft: OLIVE_SOFT,
    border: OLIVE_BORDER,
    main: OLIVE,
    strong: OLIVE,
  };
}

function SectionCard({ icon, title, helper, children, highlighted = false }) {
  return (
    <View
      style={{
        backgroundColor: SURFACE,
        borderWidth: 1,
        borderColor: highlighted ? AMBER_BORDER : CARD_BORDER,
        borderRadius: 26,
        padding: 15,
        marginBottom: 14,
        shadowColor: SHADOW,
        shadowOpacity: highlighted ? 0.09 : 0.055,
        shadowRadius: highlighted ? 14 : 10,
        shadowOffset: { width: 0, height: highlighted ? 6 : 4 },
        elevation: highlighted ? 3 : 2,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          marginBottom: helper ? 12 : 10,
        }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: highlighted ? AMBER_SOFT : OLIVE_SOFT,
            borderWidth: 1,
            borderColor: highlighted ? AMBER_BORDER : OLIVE_BORDER,
            marginRight: 10,
          }}
        >
          <Ionicons
            name={icon}
            size={18}
            color={highlighted ? EVENT_AMBER : OLIVE}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: TEXT,
              fontSize: 16,
              lineHeight: 20,
              fontWeight: "900",
            }}
          >
            {title}
          </Text>

          {helper ? (
            <Text
              style={{
                color: MUTED,
                fontSize: 12.5,
                lineHeight: 18,
                fontWeight: "700",
                marginTop: 3,
              }}
            >
              {helper}
            </Text>
          ) : null}
        </View>
      </View>

      {children}
    </View>
  );
}

function FieldLabel({ children }) {
  return (
    <Text
      style={{
        color: TEXT,
        fontSize: 13,
        fontWeight: "900",
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}

function TypePill({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selected ? AMBER_BORDER : CARD_BORDER,
        backgroundColor: selected ? AMBER_SOFT : PREMIUM_CREAM,
        marginRight: 8,
        marginBottom: 8,
        opacity: pressed ? 0.82 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <Text
        style={{
          color: selected ? EVENT_BROWN : MUTED,
          fontWeight: "900",
          fontSize: 12,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function CategoryChoiceCard({ category, selected, onPress }) {
  const colors = tintColors(category.tint);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 172,
        minHeight: 132,
        marginRight: 10,
        borderRadius: 26,
        padding: 14,
        backgroundColor: selected ? colors.soft : SURFACE,
        borderWidth: 1,
        borderColor: selected ? colors.border : CARD_BORDER,
        shadowColor: SHADOW,
        shadowOpacity: selected ? 0.095 : 0.05,
        shadowRadius: selected ? 13 : 9,
        shadowOffset: { width: 0, height: selected ? 6 : 4 },
        elevation: selected ? 3 : 2,
        opacity: pressed ? 0.86 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: selected ? SURFACE : colors.soft,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Ionicons name={category.icon} size={21} color={colors.main} />
        </View>

        {selected ? (
          <View
            style={{
              marginLeft: "auto",
              width: 28,
              height: 28,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.main,
            }}
          >
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          </View>
        ) : null}
      </View>

      <Text
        style={{
          color: selected ? colors.strong : TEXT,
          fontSize: 15.5,
          fontWeight: "900",
          lineHeight: 20,
          marginTop: 11,
        }}
        numberOfLines={1}
      >
        {category.title}
      </Text>

      <Text
        style={{
          color: MUTED,
          fontSize: 12,
          fontWeight: "700",
          lineHeight: 17,
          marginTop: 5,
        }}
        numberOfLines={2}
      >
        {category.subtitle || "Custom group category for this church."}
      </Text>

      <Text
        style={{
          color: colors.strong,
          fontSize: 11.5,
          fontWeight: "900",
          marginTop: 8,
        }}
      >
        {category.source === "custom" ? "Church category" : "Default category"}
      </Text>
    </Pressable>
  );
}

function OptionCard({ label, description, selected, onPress, icon }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        padding: 13,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: selected ? AMBER_BORDER : CARD_BORDER,
        backgroundColor: selected ? AMBER_SOFT : PREMIUM_CREAM,
        marginBottom: 9,
        opacity: pressed ? 0.82 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: selected ? AMBER_BORDER : CARD_BORDER,
            backgroundColor: selected ? EVENT_AMBER : SURFACE,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
            marginTop: 1,
          }}
        >
          {selected ? (
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          ) : (
            <Ionicons
              name={icon || "ellipse-outline"}
              size={14}
              color={MUTED}
            />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: selected ? EVENT_BROWN : TEXT,
              fontWeight: "900",
              fontSize: 13.5,
              lineHeight: 18,
            }}
          >
            {label}
          </Text>

          {description ? (
            <Text
              style={{
                color: MUTED,
                fontWeight: "700",
                fontSize: 12.2,
                lineHeight: 17,
                marginTop: 4,
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

function inputStyle(extra = {}) {
  return {
    backgroundColor: SURFACE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: TEXT,
    fontSize: 15,
    fontWeight: "650",
    shadowColor: SHADOW,
    shadowOpacity: 0.035,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
    ...extra,
  };
}

export default function ChurchCreateGroup() {
  const navigation = useNavigation();
  const route = useRoute();

  const churchId = route?.params?.churchId || null;
  const churchName = route?.params?.churchName || "your church";
  const selectedCategoryParam = route?.params?.selectedCategory || "Tables";

  const [customCategories, setCustomCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState(selectedCategoryParam || "Tables");
  const [audience, setAudience] = useState("everyone");
  const [visibility, setVisibility] = useState("church");
  const [area, setArea] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [meetingDay, setMeetingDay] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingFormat, setMeetingFormat] = useState("physical");
  const [enablePrayerSpace, setEnablePrayerSpace] = useState(false);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadCustomCategories() {
      if (!churchId) return;

      try {
        setLoadingCategories(true);

        const { data, error } = await supabase
          .from("church_group_categories")
          .select("*")
          .eq("church_id", churchId)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });

        if (error) throw error;

        if (alive) {
          setCustomCategories(data || []);
        }
      } catch (e) {
        console.log("load create group categories error:", e);

        if (alive) {
          setCustomCategories([]);
        }
      } finally {
        if (alive) {
          setLoadingCategories(false);
        }
      }
    }

    loadCustomCategories();

    return () => {
      alive = false;
    };
  }, [churchId]);

  const allCategories = useMemo(() => {
    const mappedCustom = customCategories.map((item) => ({
      id: item.name,
      title: item.name,
      subtitle: item.description || "Custom group category for this church.",
      icon: item.icon_name || "people-outline",
      tint: item.tint || "olive",
      source: "custom",
      rawId: item.id,
    }));

    return [...defaultGroupCategories, ...mappedCustom];
  }, [customCategories]);

  const selectedCategory = useMemo(() => {
    return (
      allCategories.find((category) => category.id === type) ||
      allCategories[0] ||
      defaultGroupCategories[0]
    );
  }, [allCategories, type]);

  useEffect(() => {
    if (!type && allCategories.length > 0) {
      setType(allCategories[0].id);
      return;
    }

    if (
      selectedCategoryParam &&
      allCategories.some((category) => category.id === selectedCategoryParam)
    ) {
      setType(selectedCategoryParam);
    }
  }, [selectedCategoryParam, allCategories]);

  function handleSelectMeetingFormat(nextFormat) {
    setMeetingFormat(nextFormat);

    if (nextFormat === "app_only") {
      setEnablePrayerSpace(true);
    }
  }

  function shouldCreatePrayerSpace() {
    return enablePrayerSpace || meetingFormat === "app_only";
  }

  const prayerSpaceEnabled = shouldCreatePrayerSpace();

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

    const existing =
      Array.isArray(existingRows) && existingRows.length > 0
        ? existingRows[0]
        : null;

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

    const { error: insertError } = await supabase
      .from("church_group_members")
      .insert({
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
      Alert.alert(
        "Missing churchId",
        "Go back and open this screen from the church admin hub."
      );
      return;
    }

    if (title.trim().length < 3) {
      Alert.alert("Group name too short", "Enter at least 3 characters.");
      return;
    }

    try {
      setSaving(true);

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const userId = sessionData?.session?.user?.id || null;

      if (!userId) {
        Alert.alert("Not signed in", "Please sign in again before creating a group.");
        return;
      }

      const trimmedTitle = title.trim();

      const savedArea =
        meetingFormat === "app_only"
          ? area.trim() || "Triunely app"
          : area.trim() || null;

      const { data: createdGroup, error: groupError } = await supabase
        .from("church_groups")
        .insert({
          church_id: churchId,
          name: trimmedTitle,
          type,
          audience,
          visibility,
          area: savedArea,
          leader_name: leaderName.trim() || null,
          meeting_day:
            meetingFormat === "app_only" ? null : meetingDay.trim() || null,
          meeting_time:
            meetingFormat === "app_only" ? null : meetingTime.trim() || null,
          meeting_format: meetingFormat,
          has_prayer_space: prayerSpaceEnabled,
          description: description.trim() || null,
          status: "active",
          is_public: visibility === "church",
          created_by: userId,
        })
        .select("id, church_id, name, description, created_by")
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

      if (prayerSpaceEnabled) {
        const prayerDescription =
          description.trim() || `Official Prayer Space for ${trimmedTitle}.`;

        const { data: createdPrayerGroup, error: prayerGroupError } =
          await supabase
            .from("prayer_groups")
            .insert({
              creator_id: userId,
              name: trimmedTitle,
              description: prayerDescription,
              privacy: visibility === "hidden" ? "private" : "group",
              group_type: "church",
              church_id: churchId,
              church_group_id: createdGroup.id,
            })
            .select("id")
            .single();

        if (prayerGroupError) {
          console.log("Create linked prayer group error:", prayerGroupError);
          throw prayerGroupError;
        }

        if (createdPrayerGroup?.id) {
          const { error: prayerMemberError } = await supabase
            .from("prayer_group_members")
            .insert({
              group_id: createdPrayerGroup.id,
              user_id: userId,
              role: "admin",
            });

          if (prayerMemberError) {
            console.log(
              "Create linked prayer group admin member error:",
              prayerMemberError
            );
          }
        }
      }

      Alert.alert(
        prayerSpaceEnabled ? "Group and Prayer Space created" : "Group created",
        prayerSpaceEnabled
          ? `${trimmedTitle} has been created and linked to the Prayer tab.`
          : `${trimmedTitle} has been created for ${churchName}.`,
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (e) {
      console.log("Create church group error:", e);

      Alert.alert(
        "Could not create group",
        e?.message || "Something went wrong. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: PREMIUM_CREAM }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: CARD_BORDER,
          backgroundColor: PREMIUM_CREAM,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => ({
              width: 42,
              height: 42,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: CARD_BORDER,
              backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={21} color={TEXT} />
          </Pressable>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text
              style={[
                serifHeading,
                {
                  fontSize: 24,
                  lineHeight: 29,
                },
              ]}
              numberOfLines={1}
            >
              Create group
            </Text>

            <Text
              style={{
                color: MUTED,
                marginTop: 1,
                fontSize: 12.5,
                lineHeight: 17,
                fontWeight: "700",
              }}
              numberOfLines={1}
            >
              Church admin setup
            </Text>
          </View>

          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 999,
              backgroundColor: AMBER_SOFT,
              borderWidth: 1,
              borderColor: AMBER_BORDER,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="people-outline" size={19} color={EVENT_AMBER} />
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 18,
          paddingBottom: 36,
        }}
      >
        <View
          style={{
            backgroundColor: SURFACE,
            borderRadius: 30,
            borderWidth: 1,
            borderColor: AMBER_BORDER,
            padding: 18,
            marginBottom: 16,
            shadowColor: SHADOW,
            shadowOpacity: 0.09,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 7 },
            elevation: 3,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: AMBER_SOFT,
                borderWidth: 1,
                borderColor: AMBER_BORDER,
                marginRight: 12,
              }}
            >
              <Ionicons name="sparkles-outline" size={24} color={EVENT_AMBER} />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  serifHeading,
                  {
                    fontSize: 28,
                    lineHeight: 33,
                  },
                ]}
              >
                New church group
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 13,
                  lineHeight: 19,
                  fontWeight: "700",
                  marginTop: 4,
                }}
              >
                Create an official church group, ministry team, Bible study,
                Prayer Space or discipleship community for {churchName}.
              </Text>
            </View>
          </View>
        </View>

        <SectionCard
          icon="grid-outline"
          title="Group category"
          helper="Choose the category this group belongs to. Custom church categories appear here too."
        >
          {loadingCategories ? (
            <View
              style={{
                paddingVertical: 16,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ActivityIndicator color={EVENT_AMBER} />

              <Text
                style={{
                  color: MUTED,
                  fontWeight: "800",
                  marginTop: 8,
                }}
              >
                Loading categories…
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingRight: 10,
                paddingBottom: 4,
              }}
              style={{ marginRight: -15 }}
            >
              {allCategories.map((category) => (
                <CategoryChoiceCard
                  key={`${category.source}-${category.id}`}
                  category={category}
                  selected={type === category.id}
                  onPress={() => setType(category.id)}
                />
              ))}
            </ScrollView>
          )}

          {selectedCategory ? (
            <View
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 18,
                backgroundColor: AMBER_SOFT,
                borderWidth: 1,
                borderColor: AMBER_BORDER,
                flexDirection: "row",
                alignItems: "flex-start",
              }}
            >
              <Ionicons
                name={selectedCategory.icon || "grid-outline"}
                size={17}
                color={EVENT_AMBER}
                style={{ marginRight: 9, marginTop: 1 }}
              />

              <Text
                style={{
                  flex: 1,
                  color: EVENT_BROWN,
                  fontSize: 12.5,
                  lineHeight: 18,
                  fontWeight: "800",
                }}
              >
                Selected category: {selectedCategory.title}
              </Text>
            </View>
          ) : null}
        </SectionCard>

        <SectionCard
          icon="person-circle-outline"
          title="Who is this group for?"
          helper="This controls whether the group can be suggested to members."
        >
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
        </SectionCard>

        <SectionCard
          icon="eye-outline"
          title="Visibility"
          helper="Choose whether this group can be discovered or should stay private."
        >
          {visibilityOptions.map((item) => (
            <OptionCard
              key={item.key}
              icon={item.key === "church" ? "people-outline" : "lock-closed-outline"}
              label={item.label}
              description={item.description}
              selected={visibility === item.key}
              onPress={() => setVisibility(item.key)}
            />
          ))}
        </SectionCard>

        <SectionCard
          icon="create-outline"
          title="Group basics"
          helper="Name the group and add the key details people need."
          highlighted
        >
          <FieldLabel>Group name</FieldLabel>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Women’s Prayer Night"
            placeholderTextColor="rgba(107, 114, 128, 0.72)"
            style={inputStyle({ marginBottom: 13 })}
          />

          <FieldLabel>Description</FieldLabel>

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Short description of this group..."
            placeholderTextColor="rgba(107, 114, 128, 0.72)"
            multiline
            style={inputStyle({
              minHeight: 104,
              textAlignVertical: "top",
              marginBottom: 2,
            })}
          />
        </SectionCard>

        <SectionCard
          icon="calendar-outline"
          title="Meeting format"
          helper="Choose how this group meets. App-only is for groups that live mainly inside Triunely."
        >
          {meetingFormatOptions.map((item) => (
            <OptionCard
              key={item.key}
              icon={
                item.key === "physical"
                  ? "location-outline"
                  : item.key === "online"
                    ? "videocam-outline"
                    : item.key === "hybrid"
                      ? "git-compare-outline"
                      : "phone-portrait-outline"
              }
              label={item.label}
              description={item.description}
              selected={meetingFormat === item.key}
              onPress={() => handleSelectMeetingFormat(item.key)}
            />
          ))}
        </SectionCard>

        <SectionCard
          icon="hand-left-outline"
          title="App Prayer Space"
          helper="Create a linked Prayer tab space where approved members can share prayer requests and pray during the week."
          highlighted={prayerSpaceEnabled}
        >
          <OptionCard
            icon="hand-left-outline"
            label="Enable app Prayer Space"
            description={
              meetingFormat === "app_only"
                ? "Required for app-only groups."
                : "Recommended for prayer groups, pastoral support, and ongoing prayer communities."
            }
            selected={enablePrayerSpace}
            onPress={() => {
              if (meetingFormat === "app_only") {
                setEnablePrayerSpace(true);
                return;
              }

              setEnablePrayerSpace((current) => !current);
            }}
          />

          {prayerSpaceEnabled ? (
            <View
              style={{
                marginTop: 4,
                padding: 12,
                borderRadius: 18,
                backgroundColor: AMBER_SOFT,
                borderWidth: 1,
                borderColor: AMBER_BORDER,
                flexDirection: "row",
                alignItems: "flex-start",
              }}
            >
              <Ionicons
                name="information-circle-outline"
                size={17}
                color={EVENT_AMBER}
                style={{ marginRight: 9, marginTop: 1 }}
              />

              <Text
                style={{
                  flex: 1,
                  color: EVENT_BROWN,
                  fontSize: 12.5,
                  lineHeight: 18,
                  fontWeight: "800",
                }}
              >
                This will also create a linked Church Prayer Space inside the
                Prayer tab.
              </Text>
            </View>
          ) : null}
        </SectionCard>

        <SectionCard
          icon="location-outline"
          title="Location and leadership"
          helper={
            meetingFormat === "app_only"
              ? "App-only groups do not need a physical meeting day or time."
              : "Add where and when this group normally meets."
          }
        >
          <FieldLabel>
            {meetingFormat === "app_only" ? "App location" : "Area / location"}
          </FieldLabel>

          <TextInput
            value={area}
            onChangeText={setArea}
            placeholder={
              meetingFormat === "app_only"
                ? "Defaults to Triunely app"
                : "e.g. Bitterne, Shirley, Church Hall"
            }
            placeholderTextColor="rgba(107, 114, 128, 0.72)"
            style={inputStyle({ marginBottom: 13 })}
          />

          <FieldLabel>Leader name</FieldLabel>

          <TextInput
            value={leaderName}
            onChangeText={setLeaderName}
            placeholder="e.g. Rachel"
            placeholderTextColor="rgba(107, 114, 128, 0.72)"
            style={inputStyle({ marginBottom: 13 })}
          />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <FieldLabel>Meeting day</FieldLabel>

              <TextInput
                value={meetingDay}
                onChangeText={setMeetingDay}
                editable={meetingFormat !== "app_only"}
                placeholder={
                  meetingFormat === "app_only" ? "Not needed" : "e.g. Tuesday"
                }
                placeholderTextColor="rgba(107, 114, 128, 0.72)"
                style={inputStyle({
                  opacity: meetingFormat === "app_only" ? 0.55 : 1,
                })}
              />
            </View>

            <View style={{ flex: 1 }}>
              <FieldLabel>Time</FieldLabel>

              <TextInput
                value={meetingTime}
                onChangeText={setMeetingTime}
                editable={meetingFormat !== "app_only"}
                placeholder={
                  meetingFormat === "app_only" ? "Not needed" : "e.g. 7:30pm"
                }
                placeholderTextColor="rgba(107, 114, 128, 0.72)"
                style={inputStyle({
                  opacity: meetingFormat === "app_only" ? 0.55 : 1,
                })}
              />
            </View>
          </View>
        </SectionCard>

        <Pressable
          onPress={handleCreate}
          disabled={!canCreate}
          style={({ pressed }) => ({
            borderRadius: 999,
            paddingVertical: 15,
            paddingHorizontal: 18,
            opacity: canCreate ? (pressed ? 0.88 : 1) : 0.5,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: EVENT_AMBER,
            borderWidth: 1,
            borderColor: AMBER_BORDER,
            shadowColor: EVENT_AMBER,
            shadowOpacity: canCreate ? 0.18 : 0,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: canCreate ? 3 : 0,
            transform: [{ scale: pressed && canCreate ? 0.98 : 1 }],
          })}
        >
          <Ionicons
            name={prayerSpaceEnabled ? "sparkles-outline" : "add-circle-outline"}
            size={18}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />

          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 14.5,
              fontWeight: "900",
            }}
          >
            {saving
              ? "Creating..."
              : prayerSpaceEnabled
                ? "Create group + Prayer Space"
                : "Create group"}
          </Text>
        </Pressable>

        <View
          style={{
            marginTop: 14,
            backgroundColor: OLIVE_SOFT,
            borderWidth: 1,
            borderColor: OLIVE_BORDER,
            borderRadius: 22,
            padding: 14,
            flexDirection: "row",
            alignItems: "flex-start",
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              backgroundColor: SURFACE,
              borderWidth: 1,
              borderColor: OLIVE_BORDER,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Ionicons name="shield-checkmark-outline" size={17} color={OLIVE} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: OLIVE, fontWeight: "900", fontSize: 13 }}>
              Leader permission note
            </Text>

            <Text
              style={{
                color: MUTED,
                fontWeight: "700",
                lineHeight: 19,
                marginTop: 5,
                fontSize: 12.5,
              }}
            >
              The creator of this group will automatically be added as an
              approved group leader, so they can manage members and approve join
              requests.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}