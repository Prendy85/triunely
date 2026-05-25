// src/screens/ChurchGroupsAdmin.js
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";
import { theme } from "../theme/theme";

const HEAVENLY_GOLD = "#D99400";
const DEEP_OLIVE = "#4F633B";
const SOFT_GOLD_BG = "rgba(217, 148, 0, 0.10)";
const SOFT_OLIVE_BG = "rgba(79, 99, 59, 0.10)";
const CARD_BORDER = "rgba(217, 148, 0, 0.18)";
const SELECTED_GOLD_BORDER = "rgba(217, 148, 0, 0.42)";
const SELECTED_OLIVE_BORDER = "rgba(79, 99, 59, 0.42)";

const mockGroups = [
  {
    id: "table-bitterne-rachel",
    name: "Table — Bitterne",
    type: "Tables",
    area: "Bitterne",
    leader: "Rachel",
    time: "Tuesday evenings",
    status: "Active",
  },
  {
    id: "table-shirley-daniel",
    name: "Table — Shirley",
    type: "Tables",
    area: "Shirley",
    leader: "Daniel",
    time: "Thursday evenings",
    status: "Active",
  },
  {
    id: "table-central-mark",
    name: "Table — Central",
    type: "Tables",
    area: "Central",
    leader: "Mark",
    time: "Wednesday 7:30pm",
    status: "Active",
  },
  {
    id: "mens-bible-study",
    name: "Men’s Bible Study",
    type: "Bible Studies",
    area: "Central",
    leader: "Mark",
    time: "Monday 7:30pm",
    status: "Active",
  },
  {
    id: "young-adults",
    name: "Young Adults Group",
    type: "Young Adults",
    area: "Church Hall",
    leader: "Sarah",
    time: "Friday evenings",
    status: "Active",
  },
  {
    id: "prayer-group",
    name: "Morning Prayer Group",
    type: "Prayer Groups",
    area: "Chapel",
    leader: "Anne",
    time: "Wednesday mornings",
    status: "Active",
  },
];

const groupCategories = [
  {
    id: "Tables",
    title: "Tables",
    subtitle: "Local discipleship tables and smaller relational groups.",
    icon: "restaurant-outline",
    tint: "gold",
  },
  {
    id: "Bible Studies",
    title: "Bible Studies",
    subtitle: "Scripture-focused groups and study communities.",
    icon: "book-outline",
    tint: "olive",
  },
  {
    id: "Men’s Groups",
    title: "Men’s Groups",
    subtitle: "Men’s fellowship, discipleship and accountability groups.",
    icon: "man-outline",
    tint: "gold",
  },
  {
    id: "Women’s Groups",
    title: "Women’s Groups",
    subtitle: "Women’s fellowship, encouragement and discipleship groups.",
    icon: "woman-outline",
    tint: "olive",
  },
  {
    id: "Young Adults",
    title: "Young Adults",
    subtitle: "Groups for younger adults growing in faith and friendship.",
    icon: "people-circle-outline",
    tint: "gold",
  },
  {
    id: "Prayer Groups",
    title: "Prayer Groups",
    subtitle: "Prayer gatherings and intercession groups.",
    icon: "hand-left-outline",
    tint: "olive",
  },
];

function GroupAdminCard({ group, onManage }) {
  const isTable = group.type === "Tables";

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 18,
        padding: 14,
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: isTable ? SOFT_GOLD_BG : SOFT_OLIVE_BG,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={isTable ? "restaurant-outline" : "people-outline"}
            size={21}
            color={isTable ? HEAVENLY_GOLD : DEEP_OLIVE}
          />
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 16,
                fontWeight: "900",
                flex: 1,
              }}
            >
              {group.name}
            </Text>

            <Text
              style={{
                color: DEEP_OLIVE,
                fontSize: 11,
                fontWeight: "900",
                backgroundColor: SOFT_OLIVE_BG,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 999,
              }}
            >
              {group.status}
            </Text>
          </View>

          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 12.5,
              fontWeight: "700",
              marginTop: 5,
            }}
          >
            {group.type} · {group.area}
          </Text>

          <Text
            style={{
              color: theme.colors.text2,
              fontSize: 12.5,
              fontWeight: "800",
              marginTop: 5,
            }}
          >
            Leader: {group.leader}
          </Text>

          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 12.5,
              fontWeight: "700",
              marginTop: 3,
            }}
          >
            {group.time}
          </Text>

          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <Pressable
              style={[
                theme.button.outline,
                { flex: 1, borderRadius: 14, paddingVertical: 10 },
              ]}
            >
              <Text style={theme.button.outlineText}>Edit</Text>
            </Pressable>

            <Pressable
              onPress={() => onManage(group)}
              style={[
                theme.button.primary,
                { flex: 1, borderRadius: 14, paddingVertical: 10 },
              ]}
            >
              <Text style={theme.button.primaryText}>Manage</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function CategorySection({ category, groups, expanded, onToggle, onManage }) {
  const isOlive = category.tint === "olive";

  return (
    <View style={{ marginBottom: 12 }}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => ({
          backgroundColor: theme.colors.surface,
          borderWidth: expanded ? 3 : 1,
          borderColor: expanded
            ? isOlive
              ? SELECTED_OLIVE_BORDER
              : SELECTED_GOLD_BORDER
            : CARD_BORDER,
          borderRadius: 20,
          padding: 14,
          shadowColor: HEAVENLY_GOLD,
          shadowOpacity: pressed ? 0.03 : 0.07,
          shadowRadius: 7,
          shadowOffset: { width: 0, height: 3 },
          elevation: pressed ? 1 : 2,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        })}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: isOlive ? SOFT_OLIVE_BG : SOFT_GOLD_BG,
              borderWidth: 1,
              borderColor: CARD_BORDER,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={category.icon}
              size={21}
              color={isOlive ? DEEP_OLIVE : HEAVENLY_GOLD}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: "900" }}>
              {category.title}
            </Text>

            <Text
              style={{
                color: theme.colors.muted,
                fontSize: 12.5,
                fontWeight: "700",
                lineHeight: 17,
                marginTop: 4,
              }}
            >
              {category.subtitle}
            </Text>

            <Text
              style={{
                color: isOlive ? DEEP_OLIVE : HEAVENLY_GOLD,
                fontSize: 11,
                fontWeight: "900",
                marginTop: 7,
              }}
            >
              {groups.length} {groups.length === 1 ? "group" : "groups"}
            </Text>
          </View>

          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={isOlive ? DEEP_OLIVE : HEAVENLY_GOLD}
          />
        </View>
      </Pressable>

      {expanded ? (
        <View style={{ marginTop: 10, paddingLeft: 6 }}>
          {groups.length === 0 ? (
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                borderRadius: 18,
                padding: 14,
              }}
            >
              <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                No groups added yet
              </Text>
              <Text style={{ color: theme.colors.muted, fontWeight: "700", marginTop: 6 }}>
                Create the first {category.title.toLowerCase()} group when ready.
              </Text>
            </View>
          ) : (
            groups.map((group) => (
              <GroupAdminCard key={group.id} group={group} onManage={onManage} />
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

export default function ChurchGroupsAdmin({ navigation, route }) {
  const { churchId, churchName } = route?.params || {};

  const [search, setSearch] = useState("");
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [liveGroups, setLiveGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const loadGroups = useCallback(async () => {
  if (!churchId) return;

  try {
    setLoadingGroups(true);

    const { data, error } = await supabase
      .from("church_groups")
      .select("*")
      .eq("church_id", churchId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const mapped = (data || []).map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      area: item.area || "Area not set",
      leader: item.leader_name || "Leader not set",
      time:
        item.meeting_day || item.meeting_time
          ? `${item.meeting_day || ""} ${item.meeting_time || ""}`.trim()
          : "Time not set",
      status: item.status === "active" ? "Active" : item.status,
    }));

    setLiveGroups(mapped);
  } catch (e) {
    console.log("load church groups error:", e);
    setLiveGroups([]);
  } finally {
    setLoadingGroups(false);
  }
}, [churchId]);

useEffect(() => {
  loadGroups();
}, [loadGroups]);

useFocusEffect(
  useCallback(() => {
    loadGroups();
  }, [loadGroups])
);

  const activeGroups = liveGroups.length > 0 ? liveGroups : mockGroups;

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];

    return activeGroups.filter((group) => {
      const haystack = [
        group.name,
        group.type,
        group.area,
        group.leader,
        group.time,
        group.status,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [search, activeGroups]);

  function getGroupsForCategory(categoryId) {
    return activeGroups.filter((group) => group.type === categoryId);
  }

  function handleManage(selectedGroup) {
    navigation.navigate("ChurchGroupManage", {
      churchId,
      churchName,
      group: selectedGroup,
    });
  }

  const hasSearch = search.trim().length > 0;

  return (
    <Screen backgroundColor={theme.colors.bg} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: bottomPad + 24,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={10}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.divider,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="chevron-back" size={22} color={DEEP_OLIVE} />
            </Pressable>

            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
              Groups Admin
            </Text>

            <View style={{ width: 38 }} />
          </View>

          <Text
            style={{
              color: theme.colors.text,
              fontSize: 28,
              fontWeight: "900",
              letterSpacing: -0.7,
              marginBottom: 8,
            }}
          >
            Church groups
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
            Manage group categories, subgroups, leaders and locations for{" "}
            {churchName || "your church"}.
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: CARD_BORDER,
              borderRadius: 18,
              paddingHorizontal: 12,
              marginBottom: 14,
            }}
          >
            <Ionicons name="search-outline" size={20} color={DEEP_OLIVE} />

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search Rachel, Bitterne, Tables, Bible Study..."
              placeholderTextColor={theme.colors.muted}
              style={{
                flex: 1,
                color: theme.colors.text,
                fontWeight: "800",
                paddingVertical: 12,
                paddingHorizontal: 10,
              }}
            />

            {search.trim() ? (
              <Pressable onPress={() => setSearch("")} hitSlop={10}>
                <Ionicons name="close-circle" size={20} color={theme.colors.muted} />
              </Pressable>
            ) : null}
          </View>

          <Pressable
            onPress={() =>
              navigation.navigate("ChurchCreateGroup", {
                churchId,
                churchName,
              })
            }
            style={[
              theme.button.primary,
              {
                borderRadius: 16,
                paddingVertical: 14,
                marginBottom: 16,
                flexDirection: "row",
                gap: 8,
              },
            ]}
          >
            <Ionicons name="add-circle-outline" size={18} color={theme.colors.text} />
            <Text style={theme.button.primaryText}>Create new group</Text>
          </Pressable>

          {loadingGroups ? (
            <Text
              style={{
                color: theme.colors.muted,
                fontWeight: "700",
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              Loading saved groups…
            </Text>
          ) : null}

          {hasSearch ? (
            <>
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: 22,
                  fontWeight: "900",
                  marginBottom: 10,
                }}
              >
                Search results
              </Text>

              {searchResults.length === 0 ? (
                <View
                  style={{
                    backgroundColor: SOFT_OLIVE_BG,
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                    borderRadius: 18,
                    padding: 14,
                  }}
                >
                  <Text style={{ color: DEEP_OLIVE, fontWeight: "900" }}>
                    No groups found
                  </Text>
                  <Text style={{ color: theme.colors.muted, fontWeight: "700", marginTop: 6 }}>
                    Try searching by leader, area, type or group name.
                  </Text>
                </View>
              ) : (
                searchResults.map((group) => (
                  <GroupAdminCard key={group.id} group={group} onManage={handleManage} />
                ))
              )}
            </>
          ) : (
            <>
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: 22,
                  fontWeight: "900",
                  marginBottom: 10,
                }}
              >
                Group categories
              </Text>

              {groupCategories.map((category) => (
                <CategorySection
                  key={category.id}
                  category={category}
                  groups={getGroupsForCategory(category.id)}
                  expanded={expandedCategory === category.id}
                  onToggle={() =>
                    setExpandedCategory((current) =>
                      current === category.id ? null : category.id
                    )
                  }
                  onManage={handleManage}
                />
              ))}
            </>
          )}

          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 11,
              fontWeight: "700",
              textAlign: "center",
              marginTop: 18,
            }}
          >
            Church ID: {churchId || "not set"}
          </Text>
        </ScrollView>
      )}
    </Screen>
  );
}