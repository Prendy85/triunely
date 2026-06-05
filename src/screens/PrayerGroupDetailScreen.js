// src/screens/PrayerGroupDetailScreen.js
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    PanResponder,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import EncourageModal from "../components/EncourageModal";
import FaithCoachModal from "../components/FaithCoachModal";
import { usePoints } from "../context/PointsContext";
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

function initialsFromName(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

  return (
    parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)
  ).toUpperCase();
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
  const [deliveryVisible, setDeliveryVisible] = useState(false);

  const planeAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      setTitle("");
      setBody("");
      setIsAnonymous(false);
      setDeliveryVisible(false);
      planeAnim.setValue(0);
      cardAnim.setValue(0);
    }
  }, [visible, planeAnim, cardAnim]);

  const handleClose = () => {
    if (loading || deliveryVisible) return;

    setTitle("");
    setBody("");
    setIsAnonymous(false);
    onClose?.();
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Title required", "Please add a short title.");
      return;
    }

    const success = await onSubmit?.({
      title: title.trim(),
      body: body.trim() || null,
      isAnonymous,
    });

    if (!success) return;

    setDeliveryVisible(true);
    planeAnim.setValue(0);
    cardAnim.setValue(0);

    Animated.sequence([
      Animated.timing(planeAnim, {
        toValue: 1,
        duration: 760,
        useNativeDriver: true,
      }),
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 360,
        useNativeDriver: true,
      }),
      Animated.delay(900),
    ]).start(() => {
      setTitle("");
      setBody("");
      setIsAnonymous(false);
      setDeliveryVisible(false);
      onClose?.();
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
                  disabled={loading || deliveryVisible}
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
                    opacity: loading || deliveryVisible ? 0.6 : 1,
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

            {deliveryVisible ? (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  zIndex: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 26,
                  backgroundColor: "rgba(255, 252, 245, 0.88)",
                }}
              >
                <Animated.View
                  style={{
                    transform: [
                      {
                        translateY: planeAnim.interpolate({
                          inputRange: [0, 0.25, 1],
                          outputRange: [80, 10, -260],
                        }),
                      },
                      {
                        translateX: planeAnim.interpolate({
                          inputRange: [0, 0.35, 1],
                          outputRange: [-70, 10, 145],
                        }),
                      },
                      {
                        rotate: planeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["-18deg", "18deg"],
                        }),
                      },
                      {
                        scale: planeAnim.interpolate({
                          inputRange: [0, 0.3, 0.75, 1],
                          outputRange: [0.82, 1.08, 1, 0.72],
                        }),
                      },
                    ],
                    opacity: planeAnim.interpolate({
                      inputRange: [0, 0.12, 0.78, 1],
                      outputRange: [0, 1, 1, 0],
                    }),
                  }}
                >
                  <View
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: AMBER_SOFT,
                      borderWidth: 1,
                      borderColor: AMBER_BORDER,
                      shadowColor: EVENT_AMBER,
                      shadowOpacity: 0.16,
                      shadowRadius: 14,
                      shadowOffset: { width: 0, height: 7 },
                      elevation: 4,
                    }}
                  >
                    <Ionicons
                      name="paper-plane-outline"
                      size={31}
                      color={EVENT_AMBER}
                    />
                  </View>
                </Animated.View>

                <Animated.View
                  style={{
                    marginTop: 18,
                    width: "100%",
                    maxWidth: 330,
                    backgroundColor: SURFACE,
                    borderRadius: 28,
                    borderWidth: 1,
                    borderColor: AMBER_BORDER,
                    padding: 18,
                    alignItems: "center",
                    shadowColor: SHADOW,
                    shadowOpacity: 0.12,
                    shadowRadius: 18,
                    shadowOffset: { width: 0, height: 8 },
                    elevation: 5,
                    opacity: cardAnim,
                    transform: [
                      {
                        translateY: cardAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [16, 0],
                        }),
                      },
                      {
                        scale: cardAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.96, 1],
                        }),
                      },
                    ],
                  }}
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
                      marginBottom: 10,
                    }}
                  >
                    <Ionicons name="checkmark" size={22} color={OLIVE} />
                  </View>

                  <Text
                    style={[
                      serifHeading,
                      {
                        fontSize: 24,
                        lineHeight: 29,
                        textAlign: "center",
                      },
                    ]}
                  >
                    Prayer delivered
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
                    Your group can now pray with you.
                  </Text>
                </Animated.View>
              </View>
            ) : null}

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
                disabled={loading || deliveryVisible}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 13,
                  borderRadius: 999,
                  alignItems: "center",
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: OLIVE_BORDER,
                  backgroundColor: SURFACE,
                  opacity: loading || deliveryVisible ? 0.6 : 1,
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
                disabled={loading || deliveryVisible}
                style={({ pressed }) => ({
                  flex: 1,
                                    paddingVertical: 13,
                  borderRadius: 999,
                  alignItems: "center",
                  backgroundColor: title.trim() ? EVENT_AMBER : AMBER_SOFT,
                  borderWidth: 1,
                  borderColor: AMBER_BORDER,
                  opacity: loading || deliveryVisible || !title.trim() ? 0.7 : 1,
                  shadowColor: EVENT_AMBER,
                  shadowOpacity: title.trim() ? 0.16 : 0,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 5 },
                  elevation: title.trim() ? 3 : 0,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <Text
                  style={{
                    color: title.trim() ? "#FFFFFF" : EVENT_BROWN,
                    fontSize: 14,
                    fontWeight: "900",
                  }}
                >
                  {loading ? "Posting…" : deliveryVisible ? "Delivered" : "Post prayer"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export default function PrayerGroupDetailScreen({
  route,
  navigation,
  onGroupDeleted,
}) {
  const insets = useSafeAreaInsets();

  const points = usePoints();
  const awardPrayerPoint = points?.awardPrayerPoint;

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
const [editedGroupDescription, setEditedGroupDescription] = useState("");
const [editedGroupPrivacy, setEditedGroupPrivacy] = useState("private");
const [editedGroupType, setEditedGroupType] = useState("other");
const [updatingGroupName, setUpdatingGroupName] = useState(false);
const [deletingGroup, setDeletingGroup] = useState(false);

const [selectedPrayer, setSelectedPrayer] = useState(null);
const [prayerMenuVisible, setPrayerMenuVisible] = useState(false);
const [deletingPrayer, setDeletingPrayer] = useState(false);

const [currentUserId, setCurrentUserId] = useState(null);
const [prayedById, setPrayedById] = useState({});

const [toastText, setToastText] = useState("");
const toastOpacity = useRef(new Animated.Value(0)).current;
const toastScale = useRef(new Animated.Value(0.98)).current;

const flyOpacity = useRef(new Animated.Value(0)).current;
const flyScale = useRef(new Animated.Value(0.9)).current;
const flyX = useRef(new Animated.Value(0)).current;
const flyY = useRef(new Animated.Value(0)).current;

const [prayedPeopleVisible, setPrayedPeopleVisible] = useState(false);
const [prayedPeopleLoading, setPrayedPeopleLoading] = useState(false);
const [prayedPeopleTitle, setPrayedPeopleTitle] = useState("");
const [prayedPeopleRows, setPrayedPeopleRows] = useState([]);

const [faithCoachVisible, setFaithCoachVisible] = useState(false);
const [faithCoachLoading, setFaithCoachLoading] = useState(false);
const [faithCoachText, setFaithCoachText] = useState("");
const [faithCoachRequest, setFaithCoachRequest] = useState(null);

const [encourageVisible, setEncourageVisible] = useState(false);
const [encourageLoading, setEncourageLoading] = useState(false);
const [encourageTargetPrayer, setEncourageTargetPrayer] = useState(null);
const [repliesByPrayerId, setRepliesByPrayerId] = useState({});
const [expandedPrayerIds, setExpandedPrayerIds] = useState({});
const [inviteMembersVisible, setInviteMembersVisible] = useState(false);
const [inviteSearchText, setInviteSearchText] = useState("");
const [inviteSearchLoading, setInviteSearchLoading] = useState(false);
const [inviteResults, setInviteResults] = useState([]);
const [sendingInviteByUserId, setSendingInviteByUserId] = useState({});
const [groupMembers, setGroupMembers] = useState([]);
const [pendingGroupInvites, setPendingGroupInvites] = useState([]);
const [membersLoading, setMembersLoading] = useState(false);
const [withdrawingInviteById, setWithdrawingInviteById] = useState({});
const [memberSearchText, setMemberSearchText] = useState("");
const [showAllGroupMembers, setShowAllGroupMembers] = useState(false);
const [memberActionsVisible, setMemberActionsVisible] = useState(false);
const [selectedMemberForActions, setSelectedMemberForActions] = useState(null);
const [managingMemberAction, setManagingMemberAction] = useState(false);

const inviteSheetTranslateY = useRef(new Animated.Value(0)).current;
const groupMenuTranslateY = useRef(new Animated.Value(0)).current;

function resetInviteMembersModal() {
  setInviteSearchText("");
  setInviteResults([]);
  setInviteSearchLoading(false);
  setSendingInviteByUserId({});
  setWithdrawingInviteById({});
  setMemberSearchText("");
  setShowAllGroupMembers(false);
}

function closeInviteMembersModal() {
  Animated.timing(inviteSheetTranslateY, {
    toValue: 420,
    duration: 145,
    useNativeDriver: true,
  }).start(() => {
    setInviteMembersVisible(false);
    resetInviteMembersModal();
    inviteSheetTranslateY.setValue(0);
  });
}

function closeGroupMenuModal() {
  Animated.timing(groupMenuTranslateY, {
    toValue: 420,
    duration: 145,
    useNativeDriver: true,
  }).start(() => {
    setMenuVisible(false);
    groupMenuTranslateY.setValue(0);
  });
}

const inviteSheetPanResponder = useRef(
  PanResponder.create({
    onStartShouldSetPanResponder: () => true,

    onMoveShouldSetPanResponder: (_, gestureState) =>
      Math.abs(gestureState.dy) > 2,

    onPanResponderGrant: () => {
      inviteSheetTranslateY.stopAnimation();
    },

    onPanResponderMove: (_, gestureState) => {
      const nextY =
        gestureState.dy < 0
          ? Math.max(gestureState.dy, -120)
          : gestureState.dy;

      inviteSheetTranslateY.setValue(nextY);
    },

    onPanResponderRelease: (_, gestureState) => {
      const shouldClose = gestureState.dy > 85 || gestureState.vy > 0.55;

      if (shouldClose) {
        closeInviteMembersModal();
        return;
      }

      Animated.spring(inviteSheetTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 22,
        bounciness: 4,
      }).start();
    },

    onPanResponderTerminate: () => {
      Animated.spring(inviteSheetTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 22,
        bounciness: 4,
      }).start();
    },
  })
).current;

const groupMenuPanResponder = useRef(
  PanResponder.create({
    onStartShouldSetPanResponder: () => true,

    onMoveShouldSetPanResponder: (_, gestureState) =>
      Math.abs(gestureState.dy) > 2,

    onPanResponderGrant: () => {
      groupMenuTranslateY.stopAnimation();
    },

    onPanResponderMove: (_, gestureState) => {
      const nextY =
        gestureState.dy < 0
          ? Math.max(gestureState.dy, -80)
          : gestureState.dy;

      groupMenuTranslateY.setValue(nextY);
    },

    onPanResponderRelease: (_, gestureState) => {
      const shouldClose = gestureState.dy > 85 || gestureState.vy > 0.55;

      if (shouldClose) {
        closeGroupMenuModal();
        return;
      }

      Animated.spring(groupMenuTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 22,
        bounciness: 4,
      }).start();
    },

    onPanResponderTerminate: () => {
      Animated.spring(groupMenuTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 22,
        bounciness: 4,
      }).start();
    },
  })
).current;

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

      const rows = data || [];
      setRequests(rows);

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id ?? null;

      if (userId) {
        setCurrentUserId(userId);

        const prayerIds = rows.map((item) => item.id).filter(Boolean);

        if (prayerIds.length > 0) {
          const { data: prayedRows, error: prayedError } = await supabase
            .from("prayer_request_prayers")
            .select("prayer_id")
            .eq("user_id", userId)
            .in("prayer_id", prayerIds);

          if (prayedError) {
            console.log("Error loading group prayed marks", prayedError);
          } else {
            const nextMap = {};

            (prayedRows || []).forEach((row) => {
              if (row?.prayer_id) nextMap[row.prayer_id] = true;
            });

            setPrayedById(nextMap);
          }
        } else {
          setPrayedById({});
        }
      }
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

function showToast(text) {
  setToastText(text);

  toastOpacity.stopAnimation();
  toastScale.stopAnimation();
  toastOpacity.setValue(0);
  toastScale.setValue(0.98);

  Animated.parallel([
    Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 140,
      useNativeDriver: true,
    }),
    Animated.sequence([
      Animated.timing(toastScale, {
        toValue: 1.02,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(toastScale, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
    ]),
  ]).start(() => {
    Animated.timing(toastOpacity, {
      toValue: 0,
      duration: 220,
      delay: 900,
      useNativeDriver: true,
    }).start();
  });
}

function animatePrayerLight() {
  const { width, height } = Dimensions.get("window");

  flyOpacity.stopAnimation();
  flyScale.stopAnimation();
  flyX.stopAnimation();
  flyY.stopAnimation();

  flyOpacity.setValue(0);
  flyScale.setValue(0.9);
  flyX.setValue(width / 2 - 14);
  flyY.setValue(height * 0.58);

  Animated.parallel([
    Animated.timing(flyOpacity, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }),
    Animated.timing(flyScale, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }),
  ]).start(() => {
    Animated.parallel([
      Animated.timing(flyX, {
        toValue: width - 44,
        duration: 560,
        useNativeDriver: true,
      }),
      Animated.timing(flyY, {
        toValue: 70,
        duration: 560,
        useNativeDriver: true,
      }),
      Animated.timing(flyScale, {
        toValue: 0.72,
        duration: 560,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.timing(flyOpacity, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }).start();
    });
  });
}

async function ensureUserIdOrAlert() {
  let userId = currentUserId;

  if (!userId) {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.log("Error getting session", error);
    }

    userId = data?.session?.user?.id ?? null;

    if (userId) setCurrentUserId(userId);
  }

  if (!userId) {
    Alert.alert("Not signed in", "Please sign in again to use this feature.");
    return null;
  }

  return userId;
}

async function searchInviteMembers(searchText = inviteSearchText) {
  const q = (searchText || "").trim();

  if (q.length < 2) {
    setInviteResults([]);
    return;
  }

  try {
    setInviteSearchLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, handle, avatar_url")
      .or(`display_name.ilike.%${q}%,handle.ilike.%${q}%`)
      .eq("is_searchable", true)
      .limit(20);

    if (error) throw error;

    setInviteResults(data || []);
  } catch (e) {
    console.log("Error searching invite members", e);

    Alert.alert(
      "Could not search",
      e?.message || "Please try searching again in a moment."
    );
  } finally {
    setInviteSearchLoading(false);
  }
}

async function handleSendPrayerGroupInvite(profile) {
  if (!profile?.id) return;

  if (!groupId) {
    Alert.alert("No group selected", "Please go back and choose a prayer group.");
    return;
  }

  try {
    setSendingInviteByUserId((prev) => ({
      ...prev,
      [profile.id]: true,
    }));

    const { error } = await supabase.rpc("send_prayer_group_invite", {
      target_group_id: groupId,
      target_user_id: profile.id,
    });

    if (error) throw error;

    setInviteResults((prev) =>
  prev.map((item) =>
    item.id === profile.id
      ? {
          ...item,
          invite_sent: true,
        }
      : item
  )
);

await fetchGroupMembersAndInvites();

showToast(`Invite sent to ${profile.display_name || "this person"}`);
  } catch (e) {
    console.log("Error sending prayer group invite", e);

    Alert.alert(
      "Could not send invite",
      e?.message || "Please try again in a moment."
    );
  } finally {
    setSendingInviteByUserId((prev) => {
      const next = { ...prev };
      delete next[profile.id];
      return next;
    });
  }
}

async function fetchGroupMembersAndInvites() {
  if (!groupId) {
    setGroupMembers([]);
    setPendingGroupInvites([]);
    return;
  }

  try {
    setMembersLoading(true);

    const { data: members, error: membersError } = await supabase
      .from("prayer_group_members")
      .select("id, group_id, user_id, role, created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });

    if (membersError) throw membersError;

    const memberRows = members || [];
    const memberUserIds = memberRows
      .map((member) => member.user_id)
      .filter(Boolean);

    let profilesByUserId = {};

    if (memberUserIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, handle")
        .in("id", memberUserIds);

      if (profilesError) throw profilesError;

      (profiles || []).forEach((profile) => {
        if (!profile?.id) return;
        profilesByUserId[profile.id] = profile;
      });
    }

    const enrichedMembers = memberRows.map((member) => {
      const profile = profilesByUserId[member.user_id] || {};

      return {
        ...member,
        profile,
      };
    });

    const { data: invites, error: invitesError } = await supabase
      .from("prayer_group_invites")
      .select("id, group_id, invited_user_id, invited_by, status, created_at")
      .eq("group_id", groupId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (invitesError) throw invitesError;

    const inviteRows = invites || [];
    const invitedUserIds = inviteRows
      .map((invite) => invite.invited_user_id)
      .filter(Boolean);

    let invitedProfilesByUserId = {};

    if (invitedUserIds.length > 0) {
      const { data: invitedProfiles, error: invitedProfilesError } =
        await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, handle")
          .in("id", invitedUserIds);

      if (invitedProfilesError) throw invitedProfilesError;

      (invitedProfiles || []).forEach((profile) => {
        if (!profile?.id) return;
        invitedProfilesByUserId[profile.id] = profile;
      });
    }

    const enrichedInvites = inviteRows.map((invite) => {
      const profile = invitedProfilesByUserId[invite.invited_user_id] || {};

      return {
        ...invite,
        profile,
      };
    });

    setGroupMembers(enrichedMembers);
    setPendingGroupInvites(enrichedInvites);
  } catch (e) {
    console.log("Error loading group members and invites", e);

    Alert.alert(
      "Could not load members",
      e?.message || "Please try again in a moment."
    );

    setGroupMembers([]);
    setPendingGroupInvites([]);
  } finally {
    setMembersLoading(false);
  }
}

async function handleWithdrawPrayerGroupInvite(invite) {
  if (!invite?.id) return;

  const invitedUserId = invite.invited_user_id;

  try {
    setWithdrawingInviteById((prev) => ({
      ...prev,
      [invite.id]: true,
    }));

    const { error } = await supabase.rpc("cancel_prayer_group_invite", {
      invite_id: invite.id,
    });

    if (error) throw error;

    setPendingGroupInvites((prev) =>
      prev.filter((item) => item.id !== invite.id)
    );

    if (invitedUserId) {
      setInviteResults((prev) =>
        prev.map((item) =>
          item.id === invitedUserId
            ? {
                ...item,
                invite_sent: false,
              }
            : item
        )
      );
    }

    await fetchGroupMembersAndInvites();

    showToast("Invite withdrawn");
  } catch (e) {
    console.log("Error withdrawing prayer group invite", e);

    Alert.alert(
      "Could not withdraw invite",
      e?.message || "Please try again in a moment."
    );
  } finally {
    setWithdrawingInviteById((prev) => {
      const next = { ...prev };
      delete next[invite.id];
      return next;
    });
  }
}

function confirmMakePrayerGroupAdmin(member) {
  if (!member?.user_id) return;

  const name = getMemberDisplayName(member);

  Alert.alert(
    "Make admin?",
    `${name} will be able to manage members, invites, and group settings.`,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Make admin",
        onPress: () => handleMakePrayerGroupAdmin(member),
      },
    ]
  );
}

async function handleMakePrayerGroupAdmin(member) {
  if (!member?.user_id || !groupId) return;

  try {
    setManagingMemberAction(true);

    const { error } = await supabase.rpc("make_prayer_group_admin", {
      target_group_id: groupId,
      target_user_id: member.user_id,
    });

    if (error) throw error;

    await fetchGroupMembersAndInvites();

    showToast(`${getMemberDisplayName(member)} is now an admin`);
    closeMemberActions();
  } catch (e) {
    console.log("Error making prayer group admin", e);

    Alert.alert(
      "Could not make admin",
      e?.message || "Please try again in a moment."
    );
  } finally {
    setManagingMemberAction(false);
  }
}

function confirmRemovePrayerGroupAdmin(member) {
  if (!member?.user_id) return;

  const name = getMemberDisplayName(member);

  Alert.alert(
    "Remove admin?",
    `${name} will remain in the group but will no longer be able to manage members or group settings.`,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Remove admin",
        style: "destructive",
        onPress: () => handleRemovePrayerGroupAdmin(member),
      },
    ]
  );
}

async function handleRemovePrayerGroupAdmin(member) {
  if (!member?.user_id || !groupId) return;

  try {
    setManagingMemberAction(true);

    const { error } = await supabase.rpc("remove_prayer_group_admin", {
      target_group_id: groupId,
      target_user_id: member.user_id,
    });

    if (error) throw error;

    await fetchGroupMembersAndInvites();

    showToast(`${getMemberDisplayName(member)} is now a member`);
    closeMemberActions();
  } catch (e) {
    console.log("Error removing prayer group admin", e);

    Alert.alert(
      "Could not remove admin",
      e?.message || "Please try again in a moment."
    );
  } finally {
    setManagingMemberAction(false);
  }
}

function confirmRemovePrayerGroupMember(member) {
  if (!member?.user_id) return;

  const name = getMemberDisplayName(member);

  Alert.alert(
    "Remove from group?",
    `${name} will be removed from this prayer group. They will need a new invite to rejoin.`,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => handleRemovePrayerGroupMember(member),
      },
    ]
  );
}

async function handleRemovePrayerGroupMember(member) {
  if (!member?.user_id || !groupId) return;

  try {
    setManagingMemberAction(true);

    const { error } = await supabase.rpc("remove_prayer_group_member", {
      target_group_id: groupId,
      target_user_id: member.user_id,
    });

    if (error) throw error;

    await fetchGroupMembersAndInvites();

    showToast(`${getMemberDisplayName(member)} removed from group`);
    closeMemberActions();
  } catch (e) {
    console.log("Error removing prayer group member", e);

    Alert.alert(
      "Could not remove member",
      e?.message || "Please try again in a moment."
    );
  } finally {
    setManagingMemberAction(false);
  }
}

  async function handleCreateGroupPrayer({ title, body, isAnonymous }) {
    if (!groupId) {
      Alert.alert("No group selected", "Please go back and choose a group.");
      return false;
    }

    if (!title?.trim()) {
      Alert.alert("Title required", "Please add a short title.");
      return false;
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
        return false;
      }

      const { data, error } = await supabase
        .from("prayer_requests")
        .insert({
          user_id: userId,
          community_id: GLOBAL_COMMUNITY_ID,
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
      return true;
    } catch (e) {
      console.log("Error creating group prayer", e);

      const msg =
        e?.message ||
        e?.error_description ||
        "We couldn’t post your group prayer right now. Please try again.";

      Alert.alert("Could not post", msg);
      return false;
    } finally {
      setPosting(false);
    }
  }

function openEditGroupName() {
  setEditedGroupName(group?.name || "");
  setEditedGroupDescription(group?.description || "");
  setEditedGroupPrivacy(group?.privacy || "private");
  setEditedGroupType(group?.group_type || "other");
  setMenuVisible(false);
  setEditNameVisible(true);
}

async function handleSaveGroupName() {
  const nextName = editedGroupName.trim();
  const nextDescription = editedGroupDescription.trim();

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

    const { data, error } = await supabase
      .from("prayer_groups")
      .update({
        name: nextName,
        description: nextDescription || null,
        privacy: editedGroupPrivacy || "private",
        group_type: editedGroupType || "other",
      })
      .eq("id", groupId)
      .select("id, name, description, privacy, group_type, created_at")
      .single();

    if (error) throw error;

    if (!data?.id) {
      throw new Error(
        "The group details were not updated. Please check your Supabase update policy."
      );
    }

    setGroup(data);
    setEditNameVisible(false);
    showToast("Group details updated");
  } catch (e) {
    console.log("Error updating prayer group details", e);

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

    const { data: deletedPrayers, error: prayerDeleteError } = await supabase
      .from("prayer_requests")
      .delete()
      .eq("group_id", groupId)
      .select("id");

    if (prayerDeleteError) throw prayerDeleteError;

    console.log("Deleted group prayers:", deletedPrayers?.length || 0);

    const { data: deletedMembers, error: memberDeleteError } = await supabase
      .from("prayer_group_members")
      .delete()
      .eq("group_id", groupId)
      .select("id");

    if (memberDeleteError) throw memberDeleteError;

    console.log("Deleted group members:", deletedMembers?.length || 0);

    const { data: deletedGroups, error: groupDeleteError } = await supabase
      .from("prayer_groups")
      .delete()
      .eq("id", groupId)
      .select("id");

    if (groupDeleteError) throw groupDeleteError;

    console.log("Deleted groups:", deletedGroups);

    if (!deletedGroups || deletedGroups.length === 0) {
      throw new Error(
        "The group was not deleted. Supabase returned zero deleted rows. Check the delete policy for prayer_groups."
      );
    }

    if (typeof onGroupDeleted === "function") {
      await onGroupDeleted(groupId);
      return;
    }

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

function openPrayerMenu(prayer) {
  setSelectedPrayer(prayer);
  setPrayerMenuVisible(true);
}

function closePrayerMenu() {
  if (deletingPrayer) return;

  setPrayerMenuVisible(false);
  setSelectedPrayer(null);
}

function confirmDeletePrayer() {
  const prayerTitle = selectedPrayer?.title || "this prayer request";

  setPrayerMenuVisible(false);

  Alert.alert(
    "Delete prayer request?",
    `This will permanently delete "${prayerTitle}". This cannot be undone.`,
    [
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => setSelectedPrayer(null),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: handleDeletePrayer,
      },
    ]
  );
}

async function handleDeletePrayer() {
  const prayerId = selectedPrayer?.id;

  if (!prayerId) {
    setSelectedPrayer(null);
    Alert.alert("No prayer selected", "Please try again.");
    return;
  }

  try {
    setDeletingPrayer(true);

    const { data, error } = await supabase
      .from("prayer_requests")
      .delete()
      .eq("id", prayerId)
      .eq("group_id", groupId)
      .select("id");

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error(
        "The prayer request was not deleted. Please check the Supabase delete policy for prayer_requests."
      );
    }

    setRequests((prev) => prev.filter((item) => item.id !== prayerId));
    setSelectedPrayer(null);
  } catch (e) {
    console.log("Error deleting group prayer request", e);

    await loadRequests();

    Alert.alert(
      "Could not delete prayer",
      e?.message || "Please try again in a moment."
    );
  } finally {
    setDeletingPrayer(false);
  }
}

  async function handlePrayedForPrayer(prayerId) {
    if (!prayerId) return;

    if (prayedById[prayerId]) {
      showToast("Already marked as prayed");
      return;
    }

    const userId = await ensureUserIdOrAlert();
    if (!userId) return;

    try {
      const { data: existingRows, error: existingError } = await supabase
        .from("prayer_request_prayers")
        .select("id")
        .eq("prayer_id", prayerId)
        .eq("user_id", userId)
        .limit(1);

      if (existingError) throw existingError;

      if ((existingRows || []).length > 0) {
        setPrayedById((prev) => ({ ...prev, [prayerId]: true }));
        showToast("Already marked as prayed");
        return;
      }

      setPrayedById((prev) => ({ ...prev, [prayerId]: true }));

      const res = awardPrayerPoint?.();

      showToast(
        res?.granted
          ? `Prayed · +1 Light Point (${res.remaining ?? 4} left)`
          : "Prayed · +1 Light Point"
      );

      animatePrayerLight();

      setRequests((prev) =>
        prev.map((item) =>
          item.id === prayerId
            ? { ...item, prayed_count: (item.prayed_count || 0) + 1 }
            : item
        )
      );

      const { error: insertError } = await supabase
        .from("prayer_request_prayers")
        .insert({
          prayer_id: prayerId,
          user_id: userId,
        });

      if (insertError) throw insertError;

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
      console.log("Error marking group prayer as prayed", e);

      setPrayedById((prev) => {
        const next = { ...prev };
        delete next[prayerId];
        return next;
      });

      await loadRequests();

      Alert.alert(
        "Could not mark as prayed",
        e?.message || "Please try again in a moment."
      );
    }
  }

  async function openPrayedPeople(prayer) {
    if (!prayer?.id) return;

    setPrayedPeopleTitle(prayer.title || "Prayer request");
    setPrayedPeopleRows([]);
    setPrayedPeopleVisible(true);

    try {
      setPrayedPeopleLoading(true);

      const { data: prayedRows, error: prayedError } = await supabase
        .from("prayer_request_prayers")
        .select("user_id, created_at")
        .eq("prayer_id", prayer.id)
        .order("created_at", { ascending: false });

      if (prayedError) throw prayedError;

      const rows = prayedRows || [];
      const userIds = rows.map((row) => row.user_id).filter(Boolean);

      if (userIds.length === 0) {
        setPrayedPeopleRows([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, handle")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      const profilesById = {};

      (profiles || []).forEach((profile) => {
        if (profile?.id) profilesById[profile.id] = profile;
      });

      const merged = rows.map((row) => {
        const profile = profilesById[row.user_id] || {};

        return {
          user_id: row.user_id,
          created_at: row.created_at,
          display_name:
                      profile.display_name ||
            (profile.handle ? `@${profile.handle}` : "Group member"),
          avatar_url: profile.avatar_url || null,
          handle: profile.handle || null,
        };
      });

      setPrayedPeopleRows(merged);
    } catch (e) {
      console.log("Error loading prayed people", e);

      Alert.alert(
        "Could not load prayed list",
        e?.message || "Please try again in a moment."
      );
    } finally {
      setPrayedPeopleLoading(false);
    }
  }

  async function fetchRepliesForPrayer(prayerId) {
  if (!prayerId) return;

  try {
    const { data, error } = await supabase
      .from("prayer_replies")
      .select("id, prayer_id, user_id, message, created_at")
      .eq("prayer_id", prayerId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    setRepliesByPrayerId((prev) => ({
      ...prev,
      [prayerId]: data || [],
    }));
  } catch (e) {
    console.log("Error loading group prayer replies", e);
    Alert.alert("Could not load encouragements", "Please try again in a moment.");
  }
}

async function toggleReplies(prayerId) {
  if (!prayerId) return;

  const isCurrentlyExpanded = !!expandedPrayerIds[prayerId];

  if (!isCurrentlyExpanded && !repliesByPrayerId[prayerId]) {
    await fetchRepliesForPrayer(prayerId);
  }

  setExpandedPrayerIds((prev) => ({
    ...prev,
    [prayerId]: !isCurrentlyExpanded,
  }));
}

  function openEncourage(prayer) {
    setEncourageTargetPrayer(prayer);
    setEncourageVisible(true);
  }

async function handleSubmitEncouragement(message) {
  if (!message || !message.trim()) {
    Alert.alert("Message required", "Please write an encouragement message.");
    return;
  }

  if (!encourageTargetPrayer) {
    Alert.alert("No prayer selected", "Please try again.");
    return;
  }

  try {
    setEncourageLoading(true);

    const userId = await ensureUserIdOrAlert();
    if (!userId) return;

    const { data, error } = await supabase
      .from("prayer_replies")
      .insert({
        prayer_id: encourageTargetPrayer.id,
        user_id: userId,
        message: message.trim(),
      })
      .select("id, prayer_id, user_id, message, created_at")
      .single();

    if (error) throw error;

    setRepliesByPrayerId((prev) => {
      const existing = prev[encourageTargetPrayer.id] || [];

      return {
        ...prev,
        [encourageTargetPrayer.id]: [...existing, data],
      };
    });

    setExpandedPrayerIds((prev) => ({
      ...prev,
      [encourageTargetPrayer.id]: true,
    }));

    setEncourageVisible(false);
    setEncourageTargetPrayer(null);
    showToast("Encouragement sent");
  } catch (e) {
    console.log("Error sending group encouragement", e);

    Alert.alert(
      "Could not send encouragement",
      e?.message || "Please try again in a moment."
    );
  } finally {
    setEncourageLoading(false);
  }
}

  async function handleAskFaithCoach(item) {
    setFaithCoachRequest(item);
    setFaithCoachVisible(true);
    setFaithCoachLoading(true);
    setFaithCoachText("");

    try {
      const title = item?.title || "";
      const body = item?.body || "";

      const { data, error } = await supabase.functions.invoke("faith-coach", {
        body: {
          title,
          body,
          viewer_is_owner: !!currentUserId && item?.user_id === currentUserId,
        },
      });

      if (error) {
        console.log("Group Faith Coach invoke error", error);
        setFaithCoachText(
          "Sorry, Faith Coach could not load a response right now. Please try again in a moment."
        );
        return;
      }

      setFaithCoachText(data?.text || "Faith Coach did not return any text.");
    } catch (e) {
      console.log("Group Faith Coach invoke exception", e);
      setFaithCoachText(
        "Sorry, something went wrong while talking to Faith Coach. Please try again soon."
      );
    } finally {
      setFaithCoachLoading(false);
    }
  }

  const sortedGroupMembers = useMemo(() => {
  return [...(groupMembers || [])].sort((a, b) => {
    const aIsAdmin = a.role === "admin";
    const bIsAdmin = b.role === "admin";

    if (aIsAdmin && !bIsAdmin) return -1;
    if (!aIsAdmin && bIsAdmin) return 1;

    const aName =
      a.profile?.display_name ||
      a.profile?.handle ||
      "Triunely Member";

    const bName =
      b.profile?.display_name ||
      b.profile?.handle ||
      "Triunely Member";

    return aName.localeCompare(bName);
  });
}, [groupMembers]);

const filteredGroupMembers = useMemo(() => {
  const q = memberSearchText.trim().toLowerCase();

  if (!q) return sortedGroupMembers;

  return sortedGroupMembers.filter((member) => {
    const profile = member.profile || {};

    const name = String(profile.display_name || "").toLowerCase();
    const handle = String(profile.handle || "").toLowerCase();

    return name.includes(q) || handle.includes(q);
  });
}, [memberSearchText, sortedGroupMembers]);

const hasMemberSearch = memberSearchText.trim().length > 0;
const memberPreviewLimit = 5;

const visibleGroupMembers =
  hasMemberSearch || showAllGroupMembers
    ? filteredGroupMembers
    : filteredGroupMembers.slice(0, memberPreviewLimit);

const hiddenGroupMemberCount = Math.max(
  filteredGroupMembers.length - visibleGroupMembers.length,
  0
);

const currentUserGroupMember = useMemo(() => {
  if (!currentUserId) return null;

  return (groupMembers || []).find(
    (member) => member.user_id === currentUserId
  );
}, [currentUserId, groupMembers]);

const currentUserIsGroupAdmin = currentUserGroupMember?.role === "admin";

const groupAdminCount = useMemo(() => {
  return (groupMembers || []).filter((member) => member.role === "admin")
    .length;
}, [groupMembers]);

function getMemberDisplayName(member) {
  const profile = member?.profile || {};

  return (
    profile.display_name ||
    (profile.handle ? `@${profile.handle}` : "Triunely Member")
  );
}

function openMemberActions(member) {
  if (!member?.user_id) return;

  setSelectedMemberForActions(member);
  setMemberActionsVisible(true);
}

function closeMemberActions() {
  if (managingMemberAction) return;

  setMemberActionsVisible(false);
  setSelectedMemberForActions(null);
}

const renderInviteMembersModal = () => (
  <Modal
    visible={inviteMembersVisible}
    animationType="fade"
    transparent
    onRequestClose={closeInviteMembersModal}
  >
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 18}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          onPress={closeInviteMembersModal}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.30)",
          }}
        />

        <Animated.View
          style={{
            backgroundColor: PREMIUM_CREAM,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            paddingHorizontal: 18,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom + 14, 28),
            borderTopWidth: 1,
            borderColor: CARD_BORDER,
            maxHeight: "88%",
            transform: [{ translateY: inviteSheetTranslateY }],
          }}
        >
         <View
  {...inviteSheetPanResponder.panHandlers}
  hitSlop={{ top: 12, bottom: 12, left: 40, right: 40 }}
  style={{
    alignSelf: "center",
    paddingHorizontal: 42,
    paddingTop: 8,
    paddingBottom: 18,
    marginBottom: 0,
  }}
>
            <View
              style={{
                width: 46,
                height: 5,
                borderRadius: 999,
                backgroundColor: CARD_BORDER,
              }}
            />
          </View>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: OLIVE_SOFT,
                borderWidth: 1,
                borderColor: OLIVE_BORDER,
                marginRight: 12,
              }}
            >
              <Ionicons name="people-outline" size={23} color={OLIVE} />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  serifHeading,
                  {
                    fontSize: 24,
                    lineHeight: 29,
                  },
                ]}
              >
                Members and admins
              </Text>

              <Text
                style={{
                  color: MUTED,
                  marginTop: 2,
                  fontSize: 12.5,
                  lineHeight: 18,
                  fontWeight: "700",
                }}
                numberOfLines={2}
              >
                Manage who can pray inside {groupName}.
              </Text>
              
                            <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  marginTop: 9,
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
                    marginRight: 7,
                    marginBottom: 6,
                  }}
                >
                  <Text
                    style={{
                      color: OLIVE,
                      fontSize: 11.5,
                      fontWeight: "900",
                    }}
                  >
                    {groupMembers.length === 1
                      ? "1 member"
                      : `${groupMembers.length} members`}
                  </Text>
                </View>

                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor:
                      pendingGroupInvites.length > 0 ? AMBER_SOFT : SURFACE,
                    borderWidth: 1,
                    borderColor:
                      pendingGroupInvites.length > 0
                        ? AMBER_BORDER
                        : CARD_BORDER,
                    marginRight: 7,
                    marginBottom: 6,
                  }}
                >
                  <Text
                    style={{
                      color:
                        pendingGroupInvites.length > 0 ? EVENT_BROWN : MUTED,
                      fontSize: 11.5,
                      fontWeight: "900",
                    }}
                  >
                    {pendingGroupInvites.length === 1
                      ? "1 pending invite"
                      : `${pendingGroupInvites.length} pending invites`}
                  </Text>
                </View>
              </View>

            </View>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={{ marginTop: 16 }}
            contentContainerStyle={{
              paddingBottom: 18,
            }}
          >
            {membersLoading ? (
              <View
                style={{
                  padding: 14,
                  borderRadius: 22,
                  backgroundColor: SURFACE,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <ActivityIndicator color={EVENT_AMBER} />

                <Text
                  style={{
                    color: MUTED,
                    marginLeft: 10,
                    fontSize: 13,
                    fontWeight: "800",
                  }}
                >
                  Loading members…
                </Text>
              </View>
            ) : null}

            <View
              style={{
                marginBottom: 14,
              }}
            >
                           <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    color: TEXT,
                    fontSize: 15,
                    fontWeight: "900",
                  }}
                >
                  Members
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 11.5,
                    fontWeight: "800",
                  }}
                >
                  {groupMembers.length === 1
                    ? "1 person"
                    : `${groupMembers.length} people`}
                </Text>
              </View>

                            <View
                style={{
                  backgroundColor: SURFACE,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  paddingHorizontal: 13,
                  paddingVertical: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <Ionicons name="search-outline" size={18} color={MUTED} />

                <TextInput
                  value={memberSearchText}
                  onChangeText={(text) => {
                    setMemberSearchText(text);
                    setShowAllGroupMembers(false);
                  }}
                  placeholder="Search members"
                  placeholderTextColor="rgba(107, 114, 128, 0.72)"
                  autoCapitalize="none"
                  style={{
                    flex: 1,
                    marginLeft: 9,
                    color: TEXT,
                    fontSize: 14.5,
                    fontWeight: "700",
                    paddingVertical: 4,
                  }}
                />

                {memberSearchText.trim().length > 0 ? (
                  <Pressable
                    onPress={() => {
                      setMemberSearchText("");
                      setShowAllGroupMembers(false);
                    }}
                    hitSlop={8}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: OLIVE_SOFT,
                    }}
                  >
                    <Ionicons name="close" size={16} color={OLIVE} />
                  </Pressable>
                ) : null}
              </View>

              {filteredGroupMembers.length === 0 && !membersLoading ? (
                <View
                  style={{
                    padding: 14,
                    borderRadius: 22,
                    backgroundColor: SURFACE,
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                  }}
                >
                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 12.5,
                      lineHeight: 18,
                      fontWeight: "700",
                      textAlign: "center",
                    }}
                  >
                    {hasMemberSearch
  ? "No members match that search."
  : "No members loaded yet."}
                  </Text>
                </View>
              ) : null}

              {visibleGroupMembers.map((member) => {
                const profile = member.profile || {};
                const displayName =
                  profile.display_name ||
                  (profile.handle ? `@${profile.handle}` : "Triunely Member");

                const isAdmin = member.role === "admin";

                return (
                  <View
                    key={member.id || member.user_id}
                    style={{
                      padding: 13,
                      borderRadius: 22,
                      backgroundColor: SURFACE,
                      borderWidth: 1,
                      borderColor: isAdmin ? AMBER_BORDER : CARD_BORDER,
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 9,
                    }}
                  >
                    {profile.avatar_url ? (
                      <Image
                        source={{ uri: profile.avatar_url }}
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 999,
                          marginRight: 12,
                          backgroundColor: OLIVE_SOFT,
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 999,
                          marginRight: 12,
                          backgroundColor: isAdmin ? AMBER_SOFT : OLIVE_SOFT,
                          borderWidth: 1,
                          borderColor: isAdmin ? AMBER_BORDER : OLIVE_BORDER,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: isAdmin ? EVENT_AMBER : OLIVE,
                            fontSize: 13,
                            fontWeight: "900",
                          }}
                        >
                          {initialsFromName(displayName)}
                        </Text>
                      </View>
                    )}

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: TEXT,
                          fontSize: 14.5,
                          fontWeight: "900",
                        }}
                        numberOfLines={1}
                      >
                        {displayName}
                      </Text>

                      <Text
                        style={{
                          color: MUTED,
                          marginTop: 2,
                          fontSize: 12,
                          fontWeight: "700",
                        }}
                        numberOfLines={1}
                      >
                        {isAdmin ? "Admin" : "Member"}
                        {member.user_id === currentUserId ? " · You" : ""}
                      </Text>
                    </View>

                    {isAdmin ? (
                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 999,
                          backgroundColor: AMBER_SOFT,
                          borderWidth: 1,
                          borderColor: AMBER_BORDER,
                        }}
                      >
                        <Text
                          style={{
                            color: EVENT_BROWN,
                            fontSize: 11,
                            fontWeight: "900",
                          }}
                        >
                          Admin
                        </Text>
                      </View>
                    ) : null}

                    {currentUserIsGroupAdmin ? (
                      <Pressable
                        onPress={() => openMemberActions(member)}
                        hitSlop={8}
                        style={({ pressed }) => ({
                          width: 34,
                          height: 34,
                          borderRadius: 999,
                          alignItems: "center",
                          justifyContent: "center",
                          marginLeft: 8,
                          backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
                          borderWidth: 1,
                          borderColor: CARD_BORDER,
                          transform: [{ scale: pressed ? 0.96 : 1 }],
                        })}
                      >
                        <Ionicons
                          name="ellipsis-horizontal"
                          size={18}
                          color={MUTED}
                        />
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}

              {!hasMemberSearch &&
              filteredGroupMembers.length > memberPreviewLimit ? (
                <Pressable
                  onPress={() => setShowAllGroupMembers((prev) => !prev)}
                  style={({ pressed }) => ({
                    marginTop: 2,
                    paddingVertical: 11,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
                    borderWidth: 1,
                    borderColor: OLIVE_BORDER,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  })}
                >
                  <Text
                    style={{
                      color: OLIVE,
                      fontSize: 13,
                      fontWeight: "900",
                    }}
                  >
                    {showAllGroupMembers
                      ? "Show fewer members"
                      : `View all ${filteredGroupMembers.length} members`}
                  </Text>
                </Pressable>
              ) : null}
                  </View>

            <View
              style={{
                marginBottom: 16,
              }}
            >
                           <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text
                    style={{
                      color: TEXT,
                      fontSize: 15,
                      fontWeight: "900",
                    }}
                  >
                    Pending invites
                  </Text>

                  <Text
                    style={{
                      color: MUTED,
                      marginTop: 2,
                      fontSize: 11.5,
                      lineHeight: 16,
                      fontWeight: "700",
                    }}
                  >
                    People invited but not yet accepted.
                  </Text>
                </View>

                <Text
                  style={{
                    color:
                      pendingGroupInvites.length > 0 ? EVENT_BROWN : MUTED,
                    fontSize: 11.5,
                    fontWeight: "900",
                  }}
                >
                  {pendingGroupInvites.length}
                </Text>
              </View>

              {pendingGroupInvites.length === 0 ? (
                <View
                  style={{
                    padding: 14,
                    borderRadius: 22,
                    backgroundColor: SURFACE,
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                  }}
                >
                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 12.5,
                      lineHeight: 18,
                      fontWeight: "700",
                      textAlign: "center",
                    }}
                  >
                    No pending invites. Anyone you invite will appear here until they accept or decline.
                  </Text>
                </View>
              ) : null}

              {pendingGroupInvites.map((invite) => {
                const profile = invite.profile || {};
                const displayName =
                  profile.display_name ||
                  (profile.handle ? `@${profile.handle}` : "Triunely Member");

                const isWithdrawing = !!withdrawingInviteById[invite.id];

                return (
                  <View
                    key={invite.id}
                    style={{
                      padding: 13,
                      borderRadius: 22,
                      backgroundColor: SURFACE,
                      borderWidth: 1,
                      borderColor: AMBER_BORDER,
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 9,
                    }}
                  >
                    {profile.avatar_url ? (
                      <Image
                        source={{ uri: profile.avatar_url }}
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 999,
                          marginRight: 12,
                          backgroundColor: AMBER_SOFT,
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 999,
                          marginRight: 12,
                          backgroundColor: AMBER_SOFT,
                          borderWidth: 1,
                          borderColor: AMBER_BORDER,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: EVENT_AMBER,
                            fontSize: 13,
                            fontWeight: "900",
                          }}
                        >
                          {initialsFromName(displayName)}
                        </Text>
                      </View>
                    )}

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: TEXT,
                          fontSize: 14.5,
                          fontWeight: "900",
                        }}
                        numberOfLines={1}
                      >
                        {displayName}
                      </Text>

                      <Text
                        style={{
                          color: MUTED,
                          marginTop: 2,
                          fontSize: 12,
                          fontWeight: "700",
                        }}
                        numberOfLines={1}
                      >
                        Waiting for response
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => handleWithdrawPrayerGroupInvite(invite)}
                      disabled={isWithdrawing}
                      style={({ pressed }) => ({
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 999,
                        backgroundColor: "rgba(180, 35, 24, 0.08)",
                        borderWidth: 1,
                        borderColor: DANGER_BORDER,
                        opacity: isWithdrawing ? 0.6 : 1,
                        transform: [{ scale: pressed ? 0.96 : 1 }],
                      })}
                    >
                      <Text
                        style={{
                          color: DANGER,
                          fontSize: 12,
                          fontWeight: "900",
                        }}
                      >
                        {isWithdrawing ? "Withdrawing…" : "Withdraw"}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <View
              style={{
                paddingTop: 2,
              }}
            >
              <Text
                style={{
                  color: TEXT,
                  fontSize: 15,
                  fontWeight: "900",
                  marginBottom: 8,
                }}
              >
                Invite someone
              </Text>

              <View
                style={{
                  backgroundColor: SURFACE,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  paddingHorizontal: 13,
                  paddingVertical: 10,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons name="search-outline" size={18} color={MUTED} />

                <TextInput
                  value={inviteSearchText}
                  onChangeText={(text) => {
                    setInviteSearchText(text);
                    searchInviteMembers(text);
                  }}
                  placeholder="Search by name or handle"
                  placeholderTextColor="rgba(107, 114, 128, 0.72)"
                  autoCapitalize="none"
                  style={{
                    flex: 1,
                    marginLeft: 9,
                    color: TEXT,
                    fontSize: 14.5,
                    fontWeight: "700",
                    paddingVertical: 4,
                  }}
                />

                {inviteSearchLoading ? (
                  <ActivityIndicator size="small" color={EVENT_AMBER} />
                ) : null}
              </View>

              <Text
                style={{
                  color: MUTED,
                  marginTop: 8,
                  fontSize: 11.5,
                  lineHeight: 16,
                  fontWeight: "700",
                }}
              >
                Search for existing Triunely profiles. Invites stay pending until accepted.
              </Text>

              <View style={{ marginTop: 12 }}>
                {inviteSearchText.trim().length < 2 ? (
                  <View
                    style={{
                      padding: 14,
                      borderRadius: 22,
                      backgroundColor: SURFACE,
                      borderWidth: 1,
                      borderColor: CARD_BORDER,
                      alignItems: "center",
                    }}
                  >
                    <Ionicons name="person-add-outline" size={26} color={OLIVE} />

                    <Text
                      style={{
                        color: MUTED,
                        marginTop: 6,
                        fontSize: 12.5,
                        lineHeight: 18,
                        fontWeight: "700",
                        textAlign: "center",
                      }}
                    >
                      Type at least 2 characters to find someone to invite.
                    </Text>
                  </View>
                ) : inviteResults.length === 0 && !inviteSearchLoading ? (
                  <View
                    style={{
                      padding: 14,
                      borderRadius: 22,
                      backgroundColor: SURFACE,
                      borderWidth: 1,
                      borderColor: CARD_BORDER,
                      alignItems: "center",
                    }}
                  >
                    <Ionicons name="search-outline" size={26} color={MUTED} />

                    <Text
                      style={{
                        color: MUTED,
                        marginTop: 6,
                        fontSize: 12.5,
                        lineHeight: 18,
                        fontWeight: "700",
                        textAlign: "center",
                      }}
                    >
                      No people found. Try another name or handle.
                    </Text>
                  </View>
                ) : (
                  inviteResults.map((item) => {
                    const displayName =
                      item.display_name ||
                      (item.handle ? `@${item.handle}` : "Triunely Member");

                    const isSending = !!sendingInviteByUserId[item.id];
                    const inviteSent = !!item.invite_sent;

                    return (
                      <View
                        key={item.id}
                        style={{
                          padding: 13,
                          borderRadius: 22,
                          backgroundColor: SURFACE,
                          borderWidth: 1,
                          borderColor: inviteSent ? AMBER_BORDER : CARD_BORDER,
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 10,
                        }}
                      >
                        {item.avatar_url ? (
                          <Image
                            source={{ uri: item.avatar_url }}
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: 999,
                              marginRight: 12,
                              backgroundColor: OLIVE_SOFT,
                            }}
                          />
                        ) : (
                          <View
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: 999,
                              marginRight: 12,
                              backgroundColor: OLIVE_SOFT,
                              borderWidth: 1,
                              borderColor: OLIVE_BORDER,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Text
                              style={{
                                color: OLIVE,
                                fontSize: 13,
                                fontWeight: "900",
                              }}
                            >
                              {initialsFromName(displayName)}
                            </Text>
                          </View>
                        )}

                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              color: TEXT,
                              fontSize: 14.5,
                              fontWeight: "900",
                            }}
                            numberOfLines={1}
                          >
                            {displayName}
                          </Text>

                          <Text
                            style={{
                              color: MUTED,
                              marginTop: 2,
                              fontSize: 12,
                              fontWeight: "700",
                            }}
                            numberOfLines={1}
                          >
                            {item.handle ? `@${item.handle}` : "Triunely profile"}
                          </Text>
                        </View>

                        <Pressable
                          onPress={() => handleSendPrayerGroupInvite(item)}
                          disabled={isSending || inviteSent}
                          style={({ pressed }) => ({
                            paddingHorizontal: 13,
                            paddingVertical: 8,
                            borderRadius: 999,
                            backgroundColor: inviteSent ? AMBER_SOFT : EVENT_AMBER,
                            borderWidth: 1,
                            borderColor: AMBER_BORDER,
                            opacity: isSending ? 0.65 : 1,
                            transform: [{ scale: pressed ? 0.96 : 1 }],
                          })}
                        >
                          <Text
                            style={{
                              color: inviteSent ? EVENT_BROWN : "#FFFFFF",
                              fontSize: 12,
                              fontWeight: "900",
                            }}
                          >
                            {isSending ? "Sending…" : inviteSent ? "Sent" : "Invite"}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

  const renderGroupMenuModal = () => (
  <Modal
    visible={menuVisible}
    animationType="fade"
    transparent
    onRequestClose={closeGroupMenuModal}
  >
    <Pressable
      onPress={closeGroupMenuModal}
      style={{
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.28)",
        justifyContent: "flex-end",
      }}
    >
          <Animated.View
        style={{
          backgroundColor: PREMIUM_CREAM,
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
          paddingHorizontal: 18,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom + 14, 26),
          borderTopWidth: 1,
          borderColor: CARD_BORDER,
          transform: [{ translateY: groupMenuTranslateY }],
        }}
      >
                      <View
          {...groupMenuPanResponder.panHandlers}
          style={{
            alignSelf: "center",
            paddingHorizontal: 42,
            paddingTop: 8,
            paddingBottom: 18,
            marginBottom: 0,
          }}
        >
          <View
            style={{
              width: 46,
              height: 5,
              borderRadius: 999,
              backgroundColor: CARD_BORDER,
            }}
          />
        </View>

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
              Edit group details
            </Text>
            <Text
              style={{
                color: MUTED,
                marginTop: 2,
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              Update the name, description, privacy, and group type.
            </Text>
          </View>
        </Pressable>

        <Pressable
onPress={async () => {
  setMenuVisible(false);
  setInviteMembersVisible(true);
  await fetchGroupMembersAndInvites();
}}
          style={({ pressed }) => ({
            padding: 15,
            borderRadius: 22,
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            flexDirection: "row",
            alignItems: "center",
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
            </Animated.View>
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 18}
    >
      <Pressable
        onPress={() => {
          if (!updatingGroupName) setEditNameVisible(false);
        }}
        style={{
          flex: 1,
          backgroundColor: "rgba(15, 23, 42, 0.30)",
          justifyContent: "center",
          paddingHorizontal: 18,
        }}
      >
        <Pressable
          onPress={() => {}}
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
            maxHeight: "88%",
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
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
                  Edit group details
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
                  Update how this prayer group appears to members.
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  if (!updatingGroupName) setEditNameVisible(false);
                }}
                disabled={updatingGroupName}
                hitSlop={10}
                style={({ pressed }) => ({
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  opacity: updatingGroupName ? 0.55 : 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <Ionicons name="close" size={19} color={TEXT} />
              </Pressable>
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

            <Text
              style={{
                color: TEXT,
                fontSize: 13,
                fontWeight: "900",
                marginTop: 15,
                marginBottom: 7,
              }}
            >
              Description
            </Text>

            <TextInput
              value={editedGroupDescription}
              onChangeText={setEditedGroupDescription}
              placeholder="What is this prayer group for?"
              placeholderTextColor="rgba(107, 114, 128, 0.72)"
              editable={!updatingGroupName}
              multiline
              textAlignVertical="top"
              style={{
                backgroundColor: SURFACE,
                borderRadius: 18,
                paddingHorizontal: 13,
                paddingVertical: 12,
                color: TEXT,
                fontSize: 15,
                lineHeight: 21,
                fontWeight: "650",
                borderWidth: 1,
                borderColor: CARD_BORDER,
                minHeight: 96,
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
              Privacy
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {[
                { value: "private", label: "Private" },
                { value: "public", label: "Public" },
                { value: "request", label: "By request" },
              ].map((option) => {
                const selected = editedGroupPrivacy === option.value;

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setEditedGroupPrivacy(option.value)}
                    disabled={updatingGroupName}
                    style={({ pressed }) => ({
                      paddingHorizontal: 13,
                      paddingVertical: 9,
                      borderRadius: 999,
                      backgroundColor: selected ? EVENT_AMBER : SURFACE,
                      borderWidth: 1,
                      borderColor: selected ? AMBER_BORDER : CARD_BORDER,
                      marginRight: 8,
                      marginBottom: 8,
                      opacity: updatingGroupName ? 0.6 : 1,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    })}
                  >
                    <Text
                      style={{
                        color: selected ? "#FFFFFF" : MUTED,
                        fontSize: 12.5,
                        fontWeight: "900",
                      }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text
              style={{
                color: TEXT,
                fontSize: 13,
                fontWeight: "900",
                marginTop: 7,
                marginBottom: 7,
              }}
            >
              Group type
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {[
                { value: "family", label: "Family" },
                { value: "friends", label: "Friends" },
                { value: "ministry", label: "Ministry" },
                { value: "youth", label: "Youth" },
                { value: "church", label: "Church" },
                { value: "other", label: "Other" },
              ].map((option) => {
                const selected = editedGroupType === option.value;

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setEditedGroupType(option.value)}
                    disabled={updatingGroupName}
                    style={({ pressed }) => ({
                      paddingHorizontal: 13,
                      paddingVertical: 9,
                      borderRadius: 999,
                      backgroundColor: selected ? OLIVE : SURFACE,
                      borderWidth: 1,
                      borderColor: selected ? OLIVE_BORDER : CARD_BORDER,
                      marginRight: 8,
                      marginBottom: 8,
                      opacity: updatingGroupName ? 0.6 : 1,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    })}
                  >
                    <Text
                      style={{
                        color: selected ? "#FFFFFF" : MUTED,
                        fontSize: 12.5,
                        fontWeight: "900",
                      }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

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
                {updatingGroupName ? "Saving…" : "Save changes"}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </KeyboardAvoidingView>
  </Modal>
);

const renderMemberActionsModal = () => {
  const member = selectedMemberForActions;
  const profile = member?.profile || {};
  const displayName = getMemberDisplayName(member);
  const isAdmin = member?.role === "admin";
  const isSelf = member?.user_id === currentUserId;
  const isOnlyAdmin = isAdmin && groupAdminCount <= 1;

  return (
    <Modal
      visible={memberActionsVisible}
      animationType="fade"
      transparent
      onRequestClose={closeMemberActions}
    >
      <Pressable
        onPress={closeMemberActions}
        style={{
          flex: 1,
          backgroundColor: "rgba(15, 23, 42, 0.30)",
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

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {profile.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 999,
                  marginRight: 12,
                  backgroundColor: OLIVE_SOFT,
                }}
              />
            ) : (
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 999,
                  marginRight: 12,
                  backgroundColor: isAdmin ? AMBER_SOFT : OLIVE_SOFT,
                  borderWidth: 1,
                  borderColor: isAdmin ? AMBER_BORDER : OLIVE_BORDER,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: isAdmin ? EVENT_AMBER : OLIVE,
                    fontSize: 14,
                    fontWeight: "900",
                  }}
                >
                  {initialsFromName(displayName)}
                </Text>
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  serifHeading,
                  {
                    fontSize: 23,
                    lineHeight: 28,
                  },
                ]}
                numberOfLines={1}
              >
                {displayName}
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
                {isAdmin ? "Admin" : "Member"}
                {isSelf ? " · You" : ""}
              </Text>
            </View>
          </View>

          {!isAdmin ? (
            <Pressable
              onPress={() => confirmMakePrayerGroupAdmin(member)}
              disabled={managingMemberAction}
              style={({ pressed }) => ({
                marginTop: 16,
                padding: 15,
                borderRadius: 22,
                backgroundColor: SURFACE,
                borderWidth: 1,
                borderColor: AMBER_BORDER,
                flexDirection: "row",
                alignItems: "center",
                opacity: managingMemberAction ? 0.55 : 1,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              })}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={21}
                color={EVENT_AMBER}
              />

              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: TEXT, fontSize: 15, fontWeight: "900" }}>
                  Make admin
                </Text>
                <Text
                  style={{
                    color: MUTED,
                    marginTop: 2,
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >
                  Let this member manage the group.
                </Text>
              </View>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => confirmRemovePrayerGroupAdmin(member)}
              disabled={managingMemberAction || isOnlyAdmin}
              style={({ pressed }) => ({
                marginTop: 16,
                padding: 15,
                borderRadius: 22,
                backgroundColor: SURFACE,
                borderWidth: 1,
                borderColor: isOnlyAdmin ? CARD_BORDER : DANGER_BORDER,
                flexDirection: "row",
                alignItems: "center",
                opacity: managingMemberAction || isOnlyAdmin ? 0.55 : 1,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              })}
            >
              <Ionicons
                name="shield-outline"
                size={21}
                color={isOnlyAdmin ? MUTED : DANGER}
              />

              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={{
                    color: isOnlyAdmin ? MUTED : DANGER,
                    fontSize: 15,
                    fontWeight: "900",
                  }}
                >
                  Remove admin
                </Text>
                <Text
                  style={{
                    color: MUTED,
                    marginTop: 2,
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >
                  {isOnlyAdmin
                    ? "This group must keep at least one admin."
                    : "Keep them in the group as a member."}
                </Text>
              </View>
            </Pressable>
          )}

          <Pressable
            onPress={() => confirmRemovePrayerGroupMember(member)}
            disabled={managingMemberAction || isOnlyAdmin}
            style={({ pressed }) => ({
              marginTop: 10,
              padding: 15,
              borderRadius: 22,
              backgroundColor: SURFACE,
              borderWidth: 1,
              borderColor: isOnlyAdmin ? CARD_BORDER : DANGER_BORDER,
              flexDirection: "row",
              alignItems: "center",
              opacity: managingMemberAction || isOnlyAdmin ? 0.55 : 1,
              transform: [{ scale: pressed ? 0.985 : 1 }],
            })}
          >
            <Ionicons
              name="person-remove-outline"
              size={21}
              color={isOnlyAdmin ? MUTED : DANGER}
            />

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={{
                  color: isOnlyAdmin ? MUTED : DANGER,
                  fontSize: 15,
                  fontWeight: "900",
                }}
              >
                Remove from group
              </Text>
              <Text
                style={{
                  color: MUTED,
                  marginTop: 2,
                  fontSize: 12,
                  fontWeight: "700",
                }}
              >
                {isOnlyAdmin
                  ? "You cannot remove the only admin."
                  : "They will need a new invite to rejoin."}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={closeMemberActions}
            disabled={managingMemberAction}
            style={({ pressed }) => ({
              marginTop: 12,
              paddingVertical: 13,
              borderRadius: 999,
              alignItems: "center",
              backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
              borderWidth: 1,
              borderColor: OLIVE_BORDER,
              opacity: managingMemberAction ? 0.55 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <Text style={{ color: OLIVE, fontSize: 14, fontWeight: "900" }}>
              Cancel
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const renderPrayerMenuModal = () => (
  <Modal
    visible={prayerMenuVisible}
    animationType="fade"
    transparent
    onRequestClose={closePrayerMenu}
  >
    <Pressable
      onPress={closePrayerMenu}
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
          Prayer request
        </Text>

        <Text
          style={{
            color: MUTED,
            fontSize: 13,
            lineHeight: 19,
            fontWeight: "700",
            marginBottom: 14,
          }}
          numberOfLines={2}
        >
          {selectedPrayer?.title || "Manage this group prayer request."}
        </Text>

        <Pressable
          onPress={confirmDeletePrayer}
          disabled={deletingPrayer}
          style={({ pressed }) => ({
            padding: 15,
            borderRadius: 22,
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: DANGER_BORDER,
            flexDirection: "row",
            alignItems: "center",
            opacity: deletingPrayer ? 0.55 : 1,
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
              {deletingPrayer ? "Deleting prayer…" : "Delete prayer request"}
            </Text>

            <Text
              style={{
                color: MUTED,
                marginTop: 2,
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              Permanently remove this request from the group.
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Pressable>
  </Modal>
);

const renderPrayedPeopleModal = () => (
  <Modal
    visible={prayedPeopleVisible}
    animationType="fade"
    transparent
    onRequestClose={() => setPrayedPeopleVisible(false)}
  >
    <Pressable
      onPress={() => setPrayedPeopleVisible(false)}
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
          maxHeight: "72%",
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
          Prayed for this
        </Text>

        <Text
          style={{
            color: MUTED,
            fontSize: 13,
            lineHeight: 19,
            fontWeight: "700",
            marginBottom: 14,
          }}
          numberOfLines={2}
        >
          {prayedPeopleTitle}
        </Text>

        {prayedPeopleLoading ? (
          <View
            style={{
              paddingVertical: 24,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator color={EVENT_AMBER} />

            <Text
              style={{
                color: MUTED,
                marginTop: 10,
                fontWeight: "700",
              }}
            >
              Loading people who prayed…
            </Text>
          </View>
        ) : prayedPeopleRows.length === 0 ? (
          <View
            style={{
              padding: 16,
              borderRadius: 22,
              backgroundColor: SURFACE,
              borderWidth: 1,
              borderColor: CARD_BORDER,
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: OLIVE_SOFT,
                borderWidth: 1,
                borderColor: OLIVE_BORDER,
                marginBottom: 10,
              }}
            >
              <Ionicons name="heart-outline" size={23} color={OLIVE} />
            </View>

            <Text
              style={{
                color: TEXT,
                fontWeight: "900",
                fontSize: 15,
                textAlign: "center",
              }}
            >
              No one has marked this as prayed yet
            </Text>

            <Text
              style={{
                color: MUTED,
                marginTop: 5,
                fontSize: 12.5,
                lineHeight: 18,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              When group members press Pray, they will appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={prayedPeopleRows}
            keyExtractor={(item) => `${item.user_id}-${item.created_at}`}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View
                style={{
                  padding: 13,
                  borderRadius: 22,
                  backgroundColor: SURFACE,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                {item.avatar_url ? (
                  <Image
                    source={{ uri: item.avatar_url }}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 999,
                      marginRight: 12,
                      backgroundColor: OLIVE_SOFT,
                    }}
                  />
                ) : (
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
                    <Text
                      style={{
                        color: OLIVE,
                        fontWeight: "900",
                        fontSize: 13,
                      }}
                    >
                      {initialsFromName(item.display_name)}
                    </Text>
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: TEXT,
                      fontSize: 14.5,
                      fontWeight: "900",
                    }}
                    numberOfLines={1}
                  >
                    {item.display_name}
                  </Text>

                  {item.handle ? (
                    <Text
                      style={{
                        color: MUTED,
                        marginTop: 2,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                      numberOfLines={1}
                    >
                      @{item.handle}
                    </Text>
                  ) : null}
                </View>

                <Ionicons
                  name="checkmark-circle"
                  size={21}
                  color={EVENT_AMBER}
                />
              </View>
            )}
          />
        )}
      </Pressable>
    </Pressable>
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
  const replies = repliesByPrayerId[item.id] || [];
  const isExpanded = !!expandedPrayerIds[item.id];

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
                name={
                  item.is_anonymous
                    ? "person-outline"
                    : "person-circle-outline"
                }
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

            <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
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

              <Pressable
                onPress={() => openPrayerMenu(item)}
                hitSlop={10}
                style={({ pressed }) => ({
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 6,
                  backgroundColor: pressed ? AMBER_SOFT : SURFACE,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                })}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={18}
                  color={MUTED}
                />
              </Pressable>
            </View>
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
            <Pressable
              onPress={() => openPrayedPeople(item)}
              hitSlop={8}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 11,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: pressed ? AMBER_BORDER : AMBER_SOFT,
                borderWidth: 1,
                borderColor: AMBER_BORDER,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
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
            </Pressable>

            <View style={{ flex: 1 }} />

            <Pressable
              onPress={() => handlePrayedForPrayer(item.id)}
              hitSlop={8}
              style={({ pressed }) => {
                const hasPrayed = !!prayedById[item.id];

                return {
                  backgroundColor: hasPrayed ? OLIVE_SOFT : EVENT_AMBER,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: hasPrayed ? OLIVE_BORDER : AMBER_BORDER,
                  shadowColor: EVENT_AMBER,
                  shadowOpacity: pressed || hasPrayed ? 0.04 : 0.16,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: hasPrayed ? 0 : 2,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                };
              }}
            >
              <Text
                style={{
                  color: prayedById[item.id] ? OLIVE : "#FFFFFF",
                  fontWeight: "900",
                  fontSize: 13,
                }}
              >
                {prayedById[item.id] ? "Prayed" : "Pray"}
              </Text>
            </Pressable>
          </View>

 <View
  style={{
    height: 1,
    backgroundColor: CARD_BORDER,
    marginTop: 13,
    marginBottom: 11,
  }}
/>

<View style={{ flexDirection: "row", alignItems: "center" }}>
  <Pressable
    onPress={() => openEncourage(item)}
    style={({ pressed }) => ({
      flexDirection: "row",
      alignItems: "center",
      marginRight: 15,
      opacity: pressed ? 0.7 : 1,
    })}
  >
    <Ionicons name="heart-outline" size={18} color={OLIVE} />

    <Text
      style={{
        color: OLIVE,
        fontSize: 12,
        fontWeight: "900",
        marginLeft: 6,
      }}
    >
      Encourage
    </Text>
  </Pressable>

  <Pressable
    onPress={() => handleAskFaithCoach(item)}
    style={({ pressed }) => ({
      flexDirection: "row",
      alignItems: "center",
      opacity: pressed ? 0.7 : 1,
    })}
  >
    <Ionicons
      name="sparkles-outline"
      size={18}
      color={EVENT_AMBER}
    />

    <Text
      style={{
        color: EVENT_BROWN,
        fontSize: 12,
        fontWeight: "900",
        marginLeft: 6,
      }}
    >
      Faith Coach
    </Text>
  </Pressable>
</View>

<View style={{ marginTop: 11 }}>
  <Pressable onPress={() => toggleReplies(item.id)}>
    <Text
      style={{
        color: MUTED,
        fontSize: 12,
        fontWeight: "900",
      }}
    >
      {isExpanded
        ? "Hide encouragement"
        : replies.length > 0
        ? `View encouragement (${replies.length})`
        : "View encouragement"}
    </Text>
  </Pressable>

  {isExpanded ? (
    <View
      style={{
        marginTop: 10,
        padding: 12,
        borderRadius: 18,
        backgroundColor: PREMIUM_CREAM,
        borderWidth: 1,
        borderColor: CARD_BORDER,
      }}
    >
      {replies.length > 0 ? (
        <View>
          {replies.map((reply, index) => {
            const isMine = reply.user_id === currentUserId;
            const whoReply = isMine ? "You" : "Group member";
            const replyCreated = formatDateTime(reply.created_at);
            const isLast = index === replies.length - 1;

            return (
              <View
                key={reply.id}
                style={{
                  paddingBottom: isLast ? 0 : 10,
                  marginBottom: isLast ? 0 : 10,
                  borderBottomWidth: isLast ? 0 : 1,
                  borderBottomColor: CARD_BORDER,
                }}
              >
                <Text
                  style={{
                    color: TEXT,
                    fontSize: 12,
                    fontWeight: "900",
                  }}
                >
                  {whoReply}
                  {replyCreated ? ` · ${replyCreated}` : ""}
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 12,
                    marginTop: 4,
                    lineHeight: 18,
                    fontWeight: "650",
                  }}
                >
                  {reply.message}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text
          style={{
            color: MUTED,
            fontSize: 12,
            fontWeight: "700",
          }}
        >
          No encouragement yet. Be the first to encourage.
        </Text>
      )}
    </View>
  ) : null}
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
                onPress={async () => {
                  setInviteMembersVisible(true);
                  await fetchGroupMembersAndInvites();
                }}
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
                <Ionicons
                  name="person-add-outline"
                  size={20}
                  color={EVENT_AMBER}
                />
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

        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: 28,
            height: 28,
            borderRadius: 999,
            backgroundColor: AMBER_SOFT,
            borderWidth: 1,
            borderColor: AMBER_BORDER,
            alignItems: "center",
            justifyContent: "center",
            opacity: flyOpacity,
            transform: [
              { translateX: flyX },
              { translateY: flyY },
              { scale: flyScale },
            ],
          }}
        >
          <View
            style={{
              width: 13,
              height: 13,
              borderRadius: 999,
              backgroundColor: EVENT_AMBER,
            }}
          />
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 18,
            right: 18,
            bottom: Math.max(insets.bottom + 22, 34),
            opacity: toastOpacity,
            transform: [{ scale: toastScale }],
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: TEXT,
              borderRadius: 999,
              paddingHorizontal: 15,
              paddingVertical: 10,
              shadowColor: SHADOW,
              shadowOpacity: 0.18,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
              elevation: 5,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 12.5,
                fontWeight: "900",
              }}
            >
              {toastText}
            </Text>
          </View>
        </Animated.View>

        {renderInviteMembersModal()}
        {renderGroupMenuModal()}
        {renderEditNameModal()}
        {renderMemberActionsModal()}
        {renderPrayerMenuModal()}
        {renderPrayedPeopleModal()}

        <FaithCoachModal
          visible={faithCoachVisible}
          onClose={() => setFaithCoachVisible(false)}
          loading={faithCoachLoading}
          request={faithCoachRequest}
          text={faithCoachText}
        />

        <EncourageModal
          visible={encourageVisible}
          onClose={() => {
            if (!encourageLoading) {
              setEncourageVisible(false);
              setEncourageTargetPrayer(null);
            }
          }}
          loading={encourageLoading}
          onSubmit={handleSubmitEncouragement}
          prayer={encourageTargetPrayer}
        />
      </View>
    </SafeAreaView>
  );
}