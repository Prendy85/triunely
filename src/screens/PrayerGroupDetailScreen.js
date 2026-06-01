// src/screens/PrayerGroupDetailScreen.js
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "../lib/supabase";

const GLOBAL_COMMUNITY_ID = "bb6353e4-8517-4c3e-b360-3cf5adbe9bb3";

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
const DANGER = "#B42318";
const DANGER_BORDER = "rgba(180, 35, 24, 0.18)";

const displayFont = Platform.OS === "ios" ? "Georgia" : "serif";

const serifHeading = {
  fontFamily: displayFont,
  color: TEXT,
  fontWeight: "900",
  letterSpacing: -0.45,
};

function prettyPrivacy(value) {
  if (value === "request") return "By request";
  if (value === "private") return "Private";
  return "Public";
}

function prettyGroupType(value) {
  if (value === "church") return "Church";
  if (value === "family") return "Family";
  if (value === "friends") return "Friends";
  if (value === "youth") return "Youth";
  if (value === "ministry") return "Ministry";
  return "Other";
}

function groupTypeIcon(value) {
  if (value === "church") return "business-outline";
  if (value === "family") return "home-outline";
  if (value === "friends") return "people-outline";
  if (value === "youth") return "happy-outline";
  if (value === "ministry") return "heart-outline";
  return "ellipse-outline";
}

function formatDateTime(ts) {
  if (!ts) return "";

  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}

function NewGroupPrayerModal({
  visible,
  groupName,
  loading,
  onClose,
  onSubmit,
}) {
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    if (!visible) {
      setTitle("");
      setBody("");
      setIsAnonymous(false);
    }
  }, [visible]);

  const handleClose = () => {
    if (loading) return;
    setTitle("");
    setBody("");
    setIsAnonymous(false);
    onClose?.();
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert("Title required", "Please add a short title.");
      return;
    }

    onSubmit?.({
      title: title.trim(),
      body: body.trim() || null,
      isAnonymous,
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <SafeAreaView
        edges={["top"]}
        style={{ flex: 1, backgroundColor: PREMIUM_CREAM }}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={{ flex: 1, backgroundColor: PREMIUM_CREAM }}>
            <View
              style={{
                paddingHorizontal: 18,
                paddingTop: 8,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: CARD_BORDER,
                backgroundColor: PREMIUM_CREAM,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Pressable
                  onPress={handleClose}
                  disabled={loading}
                  hitSlop={10}
                  style={({ pressed }) => ({
                    width: 42,
                    height: 42,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                    opacity: loading ? 0.6 : 1,
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                  })}
                >
                  <Ionicons name="close" size={22} color={TEXT} />
                </Pressable>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={[
                      serifHeading,
                      {
                        fontSize: 25,
                        lineHeight: 29,
                      },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    Group prayer
                  </Text>

                  <Text
                    style={{
                      color: MUTED,
                      marginTop: 1,
                      fontSize: 12.5,
                      lineHeight: 17,
                      fontWeight: "700",
                    }}
                    numberOfLines={2}
                  >
                    Share a request inside {groupName || "this prayer group"}.
                  </Text>
                </View>
              </View>
            </View>

            <FlatList
              data={[]}
              keyExtractor={(_, index) => String(index)}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 18,
                paddingTop: 16,
                paddingBottom: Math.max(insets.bottom + 96, 120),
              }}
              ListHeaderComponent={
                <View>
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
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 16,
                      }}
                    >
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 999,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: AMBER_SOFT,
                          borderWidth: 1,
                          borderColor: AMBER_BORDER,
                          marginRight: 12,
                        }}
                      >
                        <Ionicons
                          name="heart-outline"
                          size={23}
                          color={EVENT_AMBER}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: TEXT,
                            fontSize: 16,
                            fontWeight: "900",
                          }}
                        >
                          Prayer request
                        </Text>

                        <Text
                          style={{
                            color: MUTED,
                            marginTop: 3,
                            fontSize: 12,
                            lineHeight: 17,
                            fontWeight: "700",
                          }}
                        >
                          This will only be posted into this prayer group.
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={{
                        color: TEXT,
                        fontSize: 13,
                        fontWeight: "900",
                        marginBottom: 7,
                      }}
                    >
                      Title
                    </Text>

                    <TextInput
                      value={title}
                      onChangeText={setTitle}
                      placeholder="e.g. Please pray for our family this week"
                      placeholderTextColor="rgba(107, 114, 128, 0.72)"
                      style={{
                        backgroundColor: PREMIUM_CREAM,
                        borderRadius: 18,
                        paddingHorizontal: 13,
                        paddingVertical: 12,
                        color: TEXT,
                        fontSize: 15,
                        fontWeight: "650",
                        borderWidth: 1,
                        borderColor: CARD_BORDER,
                      }}
                    />

                    <Text
                      style={{
                        color: TEXT,
                        fontSize: 13,
                        fontWeight: "900",
                        marginTop: 15,
                        marginBottom: 7,
                      }}
                    >
                      Details
                    </Text>

                    <TextInput
                      value={body}
                      onChangeText={setBody}
                      placeholder="Share any details that would help the group pray."
                      placeholderTextColor="rgba(107, 114, 128, 0.72)"
                      multiline
                      textAlignVertical="top"
                      style={{
                        backgroundColor: PREMIUM_CREAM,
                        borderRadius: 18,
                        paddingHorizontal: 13,
                        paddingVertical: 12,
                        color: TEXT,
                        fontSize: 15,
                        lineHeight: 21,
                        fontWeight: "650",
                        minHeight: 130,
                        borderWidth: 1,
                        borderColor: CARD_BORDER,
                      }}
                    />
                  </View>

                  <Pressable
                    onPress={() => setIsAnonymous((prev) => !prev)}
                    style={({ pressed }) => ({
                      marginTop: 14,
                      backgroundColor: SURFACE,
                      borderRadius: 24,
                      borderWidth: 1,
                      borderColor: isAnonymous ? AMBER_BORDER : CARD_BORDER,
                      padding: 14,
                      flexDirection: "row",
                      alignItems: "center",
                      shadowColor: SHADOW,
                      shadowOpacity: 0.05,
                      shadowRadius: 10,
                      shadowOffset: { width: 0, height: 4 },
                      elevation: 2,
                      transform: [{ scale: pressed ? 0.985 : 1 }],
                    })}
                  >
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 7,
                        borderWidth: 1,
                        borderColor: isAnonymous ? AMBER_BORDER : CARD_BORDER,
                        marginRight: 11,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isAnonymous
                          ? EVENT_AMBER
                          : PREMIUM_CREAM,
                      }}
                    >
                      {isAnonymous ? (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      ) : null}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: TEXT,
                          fontSize: 14,
                          fontWeight: "900",
                        }}
                      >
                        Post anonymously
                      </Text>

                      <Text
                        style={{
                          color: MUTED,
                          marginTop: 2,
                          fontSize: 12,
                          lineHeight: 17,
                          fontWeight: "700",
                        }}
                      >
                        Your name and avatar will not be shown on this request.
                      </Text>
                    </View>
                  </Pressable>
                </View>
              }
              renderItem={null}
            />

            <View
              style={{
                paddingHorizontal: 18,
                paddingTop: 12,
                paddingBottom: Math.max(insets.bottom, 12),
                backgroundColor: PREMIUM_CREAM,
                borderTopWidth: 1,
                borderTopColor: CARD_BORDER,
                flexDirection: "row",
              }}
            >
              <Pressable
                onPress={handleClose}
                disabled={loading}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 13,
                  borderRadius: 999,
                  alignItems: "center",
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: OLIVE_BORDER,
                  backgroundColor: SURFACE,
                  opacity: loading ? 0.6 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <Text
                  style={{
                    color: OLIVE,
                    fontSize: 14,
                    fontWeight: "900",
                  }}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSubmit}
                disabled={loading || !title.trim()}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 13,
                  borderRadius: 999,
                  alignItems: "center",
                  backgroundColor: title.trim() ? EVENT_AMBER : AMBER_SOFT,
                  borderWidth: 1,
                  borderColor: AMBER_BORDER,
                  opacity: loading || !title.trim() ? 0.65 : 1,
                  shadowColor: EVENT_AMBER,
                  shadowOpacity: title.trim() ? 0.16 : 0,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 5 },
                  elevation: title.trim() ? 3 : 0,
                  transform: [{ scale: pressed && title.trim() ? 0.97 : 1 }],
                })}
              >
                <Text
                  style={{
                    color: title.trim() ? "#FFFFFF" : EVENT_BROWN,
                    fontSize: 14,
                    fontWeight: "900",
                  }}
                >
                  {loading ? "Posting…" : "Post prayer"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export default function PrayerGroupDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();

  const routeGroup = route?.params?.group || null;
  const groupId = route?.params?.groupId || routeGroup?.id || null;

  const [group, setGroup] = useState(routeGroup);
  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
const [posting, setPosting] = useState(false);
const [showNewPrayer, setShowNewPrayer] = useState(false);
const [errorText, setErrorText] = useState("");

const [menuVisible, setMenuVisible] = useState(false);
const [editNameVisible, setEditNameVisible] = useState(false);
const [editedGroupName, setEditedGroupName] = useState("");
const [updatingGroupName, setUpdatingGroupName] = useState(false);
const [deletingGroup, setDeletingGroup] = useState(false);

  const groupName = group?.name || "Prayer Group";
  const icon = groupTypeIcon(group?.group_type);

  const totalPrayed = useMemo(
    () => requests.reduce((sum, item) => sum + (item.prayed_count || 0), 0),
    [requests]
  );

  const loadGroup = useCallback(async () => {
    if (!groupId) return;

    try {
      const { data, error } = await supabase
        .from("prayer_groups")
        .select("id, name, description, privacy, group_type, created_at")
        .eq("id", groupId)
        .single();

      if (error) throw error;

      setGroup(data || null);
    } catch (e) {
      console.log("Error loading prayer group", e);
      setErrorText("Could not load this prayer group.");
    }
  }, [groupId]);

  const loadRequests = useCallback(async () => {
    if (!groupId) return;

    try {
      const { data, error } = await supabase
        .from("prayer_requests")
        .select(
          "id, title, body, is_anonymous, prayed_count, created_at, user_id, visibility, group_id"
        )
        .eq("group_id", groupId)
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRequests(data || []);
    } catch (e) {
      console.log("Error loading group prayer requests", e);
      setErrorText("Could not load prayer requests for this group.");
    }
  }, [groupId]);

  const loadAll = useCallback(
    async ({ refresh = false } = {}) => {
      if (!groupId) {
        setErrorText("No prayer group was selected.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        if (refresh) setRefreshing(true);
        else setLoading(true);

        setErrorText("");

        await Promise.all([loadGroup(), loadRequests()]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [groupId, loadGroup, loadRequests]
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleCreateGroupPrayer({ title, body, isAnonymous }) {
    if (!groupId) {
      Alert.alert("No group selected", "Please go back and choose a group.");
      return;
    }

    if (!title?.trim()) {
      Alert.alert("Title required", "Please add a short title.");
      return;
    }

    try {
      setPosting(true);

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        Alert.alert(
          "Not signed in",
          "Please sign in again before posting a prayer request."
        );
        return;
      }

      const { data, error } = await supabase
        .from("prayer_requests")
        .insert({
          user_id: userId,
          community_id: GLOBAL_COMMUNITY_ID,
          title: title.trim(),
          body: body || null,
          is_anonymous: !!isAnonymous,
          visibility: "group",
          group_id: groupId,
        })
        .select(
          "id, title, body, is_anonymous, prayed_count, created_at, user_id, visibility, group_id"
        )
        .single();

      if (error) throw error;

      setRequests((prev) => [data, ...prev]);
      setShowNewPrayer(false);
    } catch (e) {
      console.log("Error creating group prayer", e);

      const msg =
        e?.message ||
        e?.error_description ||
        "We couldn’t post your group prayer right now. Please try again.";

      Alert.alert("Could not post", msg);
    } finally {
      setPosting(false);
    }
  }

function openEditGroupName() {
  setEditedGroupName(group?.name || "");
  setMenuVisible(false);
  setEditNameVisible(true);
}

async function handleSaveGroupName() {
  const nextName = editedGroupName.trim();

  if (!groupId) {
    Alert.alert("No group selected", "Please go back and choose a group.");
    return;
  }

  if (!nextName) {
    Alert.alert("Group name required", "Please enter a group name.");
    return;
  }

  try {
    setUpdatingGroupName(true);

    const { error } = await supabase
      .from("prayer_groups")
      .update({
        name: nextName,
      })
      .eq("id", groupId);

    if (error) throw error;

    setGroup((prev) => ({
      ...(prev || {}),
      id: groupId,
      name: nextName,
    }));

    setEditNameVisible(false);
  } catch (e) {
    console.log("Error updating prayer group name", e);

    Alert.alert(
      "Could not update group",
      e?.message || "Please try again in a moment."
    );
  } finally {
    setUpdatingGroupName(false);
  }
}

function confirmDeleteGroup() {
  setMenuVisible(false);

  Alert.alert(
    "Delete prayer group?",
    "This will permanently delete this prayer group and all prayer requests inside it. This cannot be undone.",
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete group",
        style: "destructive",
        onPress: handleDeleteGroup,
      },
    ]
  );
}

async function handleDeleteGroup() {
  if (!groupId) {
    Alert.alert("No group selected", "Please go back and choose a group.");
    return;
  }

  try {
    setDeletingGroup(true);

    const { error: prayerDeleteError } = await supabase
      .from("prayer_requests")
      .delete()
      .eq("group_id", groupId);

    if (prayerDeleteError) throw prayerDeleteError;

    const { error: groupDeleteError } = await supabase
      .from("prayer_groups")
      .delete()
      .eq("id", groupId);

    if (groupDeleteError) throw groupDeleteError;

    navigation?.goBack?.();
  } catch (e) {
    console.log("Error deleting prayer group", e);

    Alert.alert(
      "Could not delete group",
      e?.message || "Please try again in a moment."
    );
  } finally {
    setDeletingGroup(false);
  }
}

  async function handlePrayedForPrayer(prayerId) {
    setRequests((prev) =>
      prev.map((item) =>
        item.id === prayerId
          ? { ...item, prayed_count: (item.prayed_count || 0) + 1 }
          : item
      )
    );

    try {
      const { data, error } = await supabase.rpc("increment_prayed_count", {
        prayer_id: prayerId,
      });

      if (error) throw error;

      if (typeof data === "number") {
        setRequests((prev) =>
          prev.map((item) =>
            item.id === prayerId ? { ...item, prayed_count: data } : item
          )
        );
      }
    } catch (e) {
      console.log("Error incrementing group prayer count", e);
    }
  }

  const renderGroupMenuModal = () => (
  <Modal
    visible={menuVisible}
    animationType="fade"
    transparent
    onRequestClose={() => setMenuVisible(false)}
  >
    <Pressable
      onPress={() => setMenuVisible(false)}
      style={{
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.28)",
        justifyContent: "flex-end",
      }}
    >
      <Pressable
        onPress={() => {}}
        style={{
          backgroundColor: PREMIUM_CREAM,
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
          paddingHorizontal: 18,
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom + 14, 26),
          borderTopWidth: 1,
          borderColor: CARD_BORDER,
        }}
      >
        <View
          style={{
            width: 44,
            height: 5,
            borderRadius: 999,
            backgroundColor: CARD_BORDER,
            alignSelf: "center",
            marginBottom: 16,
          }}
        />

        <Text
          style={[
            serifHeading,
            {
              fontSize: 24,
              lineHeight: 29,
              marginBottom: 4,
            },
          ]}
        >
          Group settings
        </Text>

        <Text
          style={{
            color: MUTED,
            fontSize: 13,
            lineHeight: 19,
            fontWeight: "700",
            marginBottom: 14,
          }}
        >
          Manage this prayer group, its members, and admin settings.
        </Text>

        <Pressable
          onPress={openEditGroupName}
          style={({ pressed }) => ({
            padding: 15,
            borderRadius: 22,
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 10,
            transform: [{ scale: pressed ? 0.985 : 1 }],
          })}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: AMBER_SOFT,
              borderWidth: 1,
              borderColor: AMBER_BORDER,
              marginRight: 12,
            }}
          >
            <Ionicons name="create-outline" size={20} color={EVENT_AMBER} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: TEXT, fontSize: 15, fontWeight: "900" }}>
              Edit group name
            </Text>
            <Text
              style={{
                color: MUTED,
                marginTop: 2,
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              Rename this prayer group.
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => {
            setMenuVisible(false);
            Alert.alert(
              "Coming next",
              "Members and admin management will be built after group chat."
            );
          }}
          style={({ pressed }) => ({
            padding: 15,
            borderRadius: 22,
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 10,
            transform: [{ scale: pressed ? 0.985 : 1 }],
          })}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: OLIVE_SOFT,
              borderWidth: 1,
              borderColor: OLIVE_BORDER,
              marginRight: 12,
            }}
          >
            <Ionicons name="people-outline" size={20} color={OLIVE} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: TEXT, fontSize: 15, fontWeight: "900" }}>
              Members and admins
            </Text>
            <Text
              style={{
                color: MUTED,
                marginTop: 2,
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              Invite, remove, and promote members.
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={confirmDeleteGroup}
          disabled={deletingGroup}
          style={({ pressed }) => ({
            padding: 15,
            borderRadius: 22,
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: DANGER_BORDER,
            flexDirection: "row",
            alignItems: "center",
            opacity: deletingGroup ? 0.55 : 1,
            transform: [{ scale: pressed ? 0.985 : 1 }],
          })}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(180, 35, 24, 0.08)",
              borderWidth: 1,
              borderColor: DANGER_BORDER,
              marginRight: 12,
            }}
          >
            <Ionicons name="trash-outline" size={20} color={DANGER} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: DANGER, fontSize: 15, fontWeight: "900" }}>
              {deletingGroup ? "Deleting group…" : "Delete group"}
            </Text>
            <Text
              style={{
                color: MUTED,
                marginTop: 2,
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              Permanently delete this group and its prayer requests.
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Pressable>
  </Modal>
);

const renderEditNameModal = () => (
  <Modal
    visible={editNameVisible}
    animationType="fade"
    transparent
    onRequestClose={() => {
      if (!updatingGroupName) setEditNameVisible(false);
    }}
  >
    <View
      style={{
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.30)",
        justifyContent: "center",
        paddingHorizontal: 18,
      }}
    >
      <View
        style={{
          backgroundColor: PREMIUM_CREAM,
          borderRadius: 30,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          padding: 18,
          shadowColor: SHADOW,
          shadowOpacity: 0.14,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 6,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: AMBER_SOFT,
              borderWidth: 1,
              borderColor: AMBER_BORDER,
              marginRight: 12,
            }}
          >
            <Ionicons name="create-outline" size={23} color={EVENT_AMBER} />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={[
                serifHeading,
                {
                  fontSize: 23,
                  lineHeight: 28,
                },
              ]}
            >
              Edit group name
            </Text>

            <Text
              style={{
                color: MUTED,
                marginTop: 2,
                fontSize: 12.5,
                lineHeight: 18,
                fontWeight: "700",
              }}
            >
              Choose a clear name for this prayer group.
            </Text>
          </View>
        </View>

        <Text
          style={{
            color: TEXT,
            fontSize: 13,
            fontWeight: "900",
            marginTop: 18,
            marginBottom: 7,
          }}
        >
          Group name
        </Text>

        <TextInput
          value={editedGroupName}
          onChangeText={setEditedGroupName}
          placeholder="Prayer group name"
          placeholderTextColor="rgba(107, 114, 128, 0.72)"
          editable={!updatingGroupName}
          style={{
            backgroundColor: SURFACE,
            borderRadius: 18,
            paddingHorizontal: 13,
            paddingVertical: 12,
            color: TEXT,
            fontSize: 15,
            fontWeight: "700",
            borderWidth: 1,
            borderColor: CARD_BORDER,
          }}
        />

        <View style={{ flexDirection: "row", marginTop: 18 }}>
          <Pressable
            onPress={() => setEditNameVisible(false)}
            disabled={updatingGroupName}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 13,
              borderRadius: 999,
              alignItems: "center",
              marginRight: 8,
              borderWidth: 1,
              borderColor: OLIVE_BORDER,
              backgroundColor: SURFACE,
              opacity: updatingGroupName ? 0.55 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <Text style={{ color: OLIVE, fontSize: 14, fontWeight: "900" }}>
              Cancel
            </Text>
          </Pressable>

          <Pressable
            onPress={handleSaveGroupName}
            disabled={updatingGroupName || !editedGroupName.trim()}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 13,
              borderRadius: 999,
              alignItems: "center",
              backgroundColor: editedGroupName.trim()
                ? EVENT_AMBER
                : AMBER_SOFT,
              borderWidth: 1,
              borderColor: AMBER_BORDER,
              opacity:
                updatingGroupName || !editedGroupName.trim() ? 0.65 : 1,
              transform: [
                { scale: pressed && editedGroupName.trim() ? 0.97 : 1 },
              ],
            })}
          >
            <Text
              style={{
                color: editedGroupName.trim() ? "#FFFFFF" : EVENT_BROWN,
                fontSize: 14,
                fontWeight: "900",
              }}
            >
              {updatingGroupName ? "Saving…" : "Save"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>
);

  const renderHeader = () => (
    <View>
      <View
        style={{
          padding: 16,
          borderRadius: 28,
          backgroundColor: SURFACE,
          borderWidth: 1,
          borderColor: AMBER_BORDER,
          shadowColor: SHADOW,
          shadowOpacity: 0.08,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 3,
          marginBottom: 14,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
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
            <Ionicons name={icon} size={25} color={EVENT_AMBER} />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={[
                serifHeading,
                {
                  fontSize: 27,
                  lineHeight: 32,
                },
              ]}
            >
              {groupName}
            </Text>

            {group?.description ? (
              <Text
                style={{
                  color: MUTED,
                  marginTop: 6,
                  fontSize: 13,
                  lineHeight: 19,
                  fontWeight: "700",
                }}
              >
                {group.description}
              </Text>
            ) : (
              <Text
                style={{
                  color: MUTED,
                  marginTop: 6,
                  fontSize: 13,
                  lineHeight: 19,
                  fontWeight: "700",
                }}
              >
                A shared prayer space for this group.
              </Text>
            )}
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            marginTop: 14,
          }}
        >
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: OLIVE_SOFT,
              borderWidth: 1,
              borderColor: OLIVE_BORDER,
              marginRight: 8,
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                color: OLIVE,
                fontSize: 11,
                fontWeight: "900",
              }}
            >
              {prettyGroupType(group?.group_type)}
            </Text>
          </View>

          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: AMBER_SOFT,
              borderWidth: 1,
              borderColor: AMBER_BORDER,
              marginRight: 8,
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                color: EVENT_BROWN,
                fontSize: 11,
                fontWeight: "900",
              }}
            >
              {prettyPrivacy(group?.privacy)}
            </Text>
          </View>

          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: PREMIUM_CREAM,
              borderWidth: 1,
              borderColor: CARD_BORDER,
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                color: MUTED,
                fontSize: 11,
                fontWeight: "900",
              }}
            >
              {requests.length} requests · {totalPrayed} prayed
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        onPress={() => setShowNewPrayer(true)}
        style={({ pressed }) => ({
          paddingVertical: 13,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: EVENT_AMBER,
          borderWidth: 1,
          borderColor: AMBER_BORDER,
          shadowColor: EVENT_AMBER,
          shadowOpacity: 0.17,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 5 },
          elevation: 3,
          transform: [{ scale: pressed ? 0.97 : 1 }],
          marginBottom: 14,
        })}
      >
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 14,
            fontWeight: "900",
          }}
        >
          + New group prayer
        </Text>
      </Pressable>

      {errorText ? (
        <View
          style={{
            padding: 14,
            borderRadius: 22,
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: DANGER_BORDER,
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              color: DANGER,
              fontWeight: "800",
              lineHeight: 19,
            }}
          >
            {errorText}
          </Text>
        </View>
      ) : null}
    </View>
  );

  const renderPrayer = ({ item }) => {
    const createdLabel = formatDateTime(item.created_at);

    return (
      <View
        style={{
          marginBottom: 14,
          borderRadius: 26,
          backgroundColor: SURFACE,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          shadowColor: SHADOW,
          shadowOpacity: 0.07,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 5 },
          elevation: 2,
          overflow: "hidden",
        }}
      >
        <View style={{ padding: 15 }}>
          <View
            style={{
              backgroundColor: PREMIUM_CREAM,
              borderRadius: 20,
              padding: 12,
              marginBottom: 13,
              borderWidth: 1,
              borderColor: CARD_BORDER,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                backgroundColor: OLIVE_SOFT,
                borderWidth: 1,
                borderColor: OLIVE_BORDER,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Ionicons
                name={item.is_anonymous ? "person-outline" : "person-circle-outline"}
                size={20}
                color={OLIVE}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: TEXT,
                  fontWeight: "900",
                  fontSize: 14,
                }}
              >
                {item.is_anonymous ? "Someone in this group" : "Group member"}
              </Text>

              <Text
                style={{
                  color: OLIVE,
                  fontSize: 11,
                  fontWeight: "800",
                  marginTop: 3,
                }}
              >
                Group prayer
              </Text>
            </View>

            {createdLabel ? (
              <Text
                style={{
                  color: MUTED,
                  fontSize: 10.5,
                  fontWeight: "700",
                  maxWidth: 86,
                  textAlign: "right",
                }}
                numberOfLines={2}
              >
                {createdLabel}
              </Text>
            ) : null}
          </View>

          <Text
            style={{
              color: TEXT,
              fontSize: 19,
              lineHeight: 24,
              fontWeight: "900",
            }}
          >
            {item.title}
          </Text>

          {item.body ? (
            <Text
              style={{
                color: MUTED,
                marginTop: 8,
                fontSize: 14,
                lineHeight: 21,
                fontWeight: "650",
              }}
            >
              {item.body}
            </Text>
          ) : null}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 14,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 11,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: AMBER_SOFT,
                borderWidth: 1,
                borderColor: AMBER_BORDER,
              }}
            >
              <Ionicons name="people-outline" size={15} color={EVENT_AMBER} />

              <Text
                style={{
                  color: EVENT_BROWN,
                  fontSize: 12,
                  fontWeight: "900",
                  marginLeft: 6,
                }}
              >
                {item.prayed_count || 0} prayed
              </Text>
            </View>

            <View style={{ flex: 1 }} />

            <Pressable
              onPress={() => handlePrayedForPrayer(item.id)}
              style={({ pressed }) => ({
                backgroundColor: EVENT_AMBER,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: AMBER_BORDER,
                shadowColor: EVENT_AMBER,
                shadowOpacity: pressed ? 0.04 : 0.16,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: 2,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontWeight: "900",
                  fontSize: 13,
                }}
              >
                I prayed
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: PREMIUM_CREAM }}
    >
      <View style={{ flex: 1, backgroundColor: PREMIUM_CREAM }}>
        <View
          style={{
            paddingHorizontal: 18,
            paddingTop: 8,
            paddingBottom: 12,
            backgroundColor: PREMIUM_CREAM,
            borderBottomWidth: 1,
            borderBottomColor: CARD_BORDER,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={10}
              style={({ pressed }) => ({
                width: 42,
                height: 42,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              <Ionicons name="chevron-back" size={23} color={TEXT} />
            </Pressable>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={[
                  serifHeading,
                  {
                    fontSize: 25,
                    lineHeight: 29,
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Prayer Group
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
                {groupName}
              </Text>
            </View>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
  <Pressable
    onPress={() => loadAll({ refresh: true })}
    hitSlop={10}
    style={({ pressed }) => ({
      width: 42,
      height: 42,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: pressed ? AMBER_SOFT : SURFACE,
      borderWidth: 1,
      borderColor: AMBER_BORDER,
      marginRight: 8,
      transform: [{ scale: pressed ? 0.96 : 1 }],
    })}
  >
    <Ionicons name="refresh" size={18} color={EVENT_AMBER} />
  </Pressable>

  <Pressable
    onPress={() => setMenuVisible(true)}
    hitSlop={10}
    style={({ pressed }) => ({
      width: 42,
      height: 42,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
      borderWidth: 1,
      borderColor: CARD_BORDER,
      transform: [{ scale: pressed ? 0.96 : 1 }],
    })}
  >
    <Ionicons name="ellipsis-horizontal" size={21} color={TEXT} />
  </Pressable>
</View>
          </View>
        </View>

        {loading ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 24,
            }}
          >
            <ActivityIndicator size="large" color={EVENT_AMBER} />

            <Text
              style={{
                color: MUTED,
                marginTop: 10,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              Loading prayer group…
            </Text>
          </View>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            renderItem={renderPrayer}
            ListHeaderComponent={renderHeader}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadAll({ refresh: true })}
                tintColor={EVENT_AMBER}
              />
            }
            ListEmptyComponent={
              <View
                style={{
                  padding: 20,
                  borderRadius: 26,
                  backgroundColor: SURFACE,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  alignItems: "center",
                  shadowColor: SHADOW,
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 5 },
                  elevation: 2,
                }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: OLIVE_SOFT,
                    borderWidth: 1,
                    borderColor: OLIVE_BORDER,
                    marginBottom: 13,
                  }}
                >
                  <Ionicons name="heart-outline" size={27} color={OLIVE} />
                </View>

                <Text
                  style={{
                    color: TEXT,
                    fontSize: 17,
                    fontWeight: "900",
                    textAlign: "center",
                  }}
                >
                  No group prayers yet
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    marginTop: 7,
                    fontSize: 13,
                    lineHeight: 19,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  Be the first to share a prayer request inside this group.
                </Text>
              </View>
            }
            contentContainerStyle={{
              paddingHorizontal: 18,
              paddingTop: 16,
              paddingBottom: Math.max(insets.bottom + 18, 36),
            }}
            showsVerticalScrollIndicator={false}
          />
        )}

        <NewGroupPrayerModal
          visible={showNewPrayer}
          groupName={groupName}
          loading={posting}
          onClose={() => {
            if (!posting) setShowNewPrayer(false);
          }}
          onSubmit={handleCreateGroupPrayer}
        />
        {renderGroupMenuModal()}
{renderEditNameModal()}
      </View>
    </SafeAreaView>
  );
}