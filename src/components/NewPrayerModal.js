// src/components/NewPrayerModal.js
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

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

export default function NewPrayerModal({
  visible,
  onClose,
  onSubmit,
  loading,
  groups = [],
}) {
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [audience, setAudience] = useState("fellowship");
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [allowReshare, setAllowReshare] = useState(false);
  const [deliveryVisible, setDeliveryVisible] = useState(false);

  const planeAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (audience === "group" && groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [audience, groups, selectedGroupId]);

  useEffect(() => {
    if (!visible) resetState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const resetState = () => {
    setTitle("");
    setBody("");
    setIsAnonymous(false);
    setAudience("fellowship");
    setSelectedGroupId(null);
    setAllowReshare(false);
    setDeliveryVisible(false);
    planeAnim.setValue(0);
    cardAnim.setValue(0);
  };

  const handleClose = () => {
    if (loading || deliveryVisible) return;
    resetState();
    onClose?.();
  };

  const handleSubmit = async () => {
    if (!title.trim() || loading || deliveryVisible) return;

    let visibility = "fellowship";
    let groupId = null;

    if (audience === "group" && groups.length > 0 && selectedGroupId) {
      visibility = "group";
      groupId = selectedGroupId;
    }

    const success = await onSubmit?.(
      title.trim(),
      body.trim() || null,
      isAnonymous,
      visibility,
      groupId,
      visibility === "fellowship" ? allowReshare : false
    );

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
      resetState();
      onClose?.();
    });
  };

  const AudienceCard = ({
    value,
    title: cardTitle,
    subtitle,
    icon,
    disabled,
  }) => {
    const active = audience === value;

    return (
      <Pressable
        onPress={() => {
          if (disabled || loading || deliveryVisible) return;
          setAudience(value);
        }}
        disabled={disabled || loading || deliveryVisible}
        style={({ pressed }) => ({
          padding: 10,
          borderRadius: 18,
          marginBottom: 8,
          backgroundColor: active ? AMBER_SOFT : SURFACE,
          borderWidth: 1,
          borderColor: active ? AMBER_BORDER : CARD_BORDER,
          opacity: disabled ? 0.5 : 1,
          transform: [{ scale: pressed && !disabled ? 0.985 : 1 }],
        })}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active ? AMBER_SOFT : OLIVE_SOFT,
              borderWidth: 1,
              borderColor: active ? AMBER_BORDER : OLIVE_BORDER,
              marginRight: 10,
            }}
          >
            <Ionicons
              name={icon}
              size={16}
              color={active ? EVENT_AMBER : OLIVE}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: active ? EVENT_BROWN : TEXT,
                fontSize: 13.5,
                fontWeight: "900",
              }}
              numberOfLines={1}
            >
              {cardTitle}
            </Text>

            <Text
              style={{
                color: MUTED,
                marginTop: 1,
                fontSize: 11.5,
                lineHeight: 15,
                fontWeight: "700",
              }}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          </View>

          {active ? (
            <Ionicons name="checkmark-circle" size={19} color={EVENT_AMBER} />
          ) : null}
        </View>
      </Pressable>
    );
  };

  const ToggleRow = ({ active, onPress, title: rowTitle, subtitle, icon }) => (
    <Pressable
      onPress={() => {
        if (loading || deliveryVisible) return;
        onPress?.();
      }}
      style={({ pressed }) => ({
        paddingVertical: 9,
        flexDirection: "row",
        alignItems: "center",
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 7,
          borderWidth: 1,
          borderColor: active ? OLIVE_BORDER : CARD_BORDER,
          marginRight: 10,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: active ? OLIVE : SURFACE,
        }}
      >
        {active ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: TEXT,
            fontSize: 13.2,
            fontWeight: "900",
          }}
          numberOfLines={1}
        >
          {rowTitle}
        </Text>

        <Text
          style={{
            color: MUTED,
            marginTop: 1,
            fontSize: 11.2,
            lineHeight: 15,
            fontWeight: "700",
          }}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      </View>

      {icon ? <Ionicons name={icon} size={18} color={active ? OLIVE : MUTED} /> : null}
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
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
                paddingHorizontal: 16,
                paddingTop: 4,
                paddingBottom: 8,
                backgroundColor: PREMIUM_CREAM,
                borderBottomWidth: 1,
                borderBottomColor: CARD_BORDER,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Pressable
                  onPress={handleClose}
                  disabled={loading || deliveryVisible}
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
                    opacity: loading || deliveryVisible ? 0.6 : 1,
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                  })}
                >
                  <Ionicons name="close" size={21} color={TEXT} />
                </Pressable>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={[
                      serifHeading,
                      {
                        fontSize: 23,
                        lineHeight: 26,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    New prayer
                  </Text>

                  <Text
                    style={{
                      color: MUTED,
                      marginTop: 0,
                      fontSize: 12,
                      lineHeight: 15,
                      fontWeight: "700",
                    }}
                    numberOfLines={1}
                  >
                    Share what you would like others to pray for.
                  </Text>
                </View>
              </View>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 10,
                paddingBottom: 12,
              }}
            >
              <View
                style={{
                  backgroundColor: SURFACE,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: AMBER_BORDER,
                  padding: 12,
                  shadowColor: SHADOW,
                  shadowOpacity: 0.06,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 2,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: AMBER_SOFT,
                      borderWidth: 1,
                      borderColor: AMBER_BORDER,
                      marginRight: 10,
                    }}
                  >
                    <Ionicons
                      name="heart-outline"
                      size={19}
                      color={EVENT_AMBER}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: TEXT,
                        fontSize: 14.5,
                        fontWeight: "900",
                      }}
                      numberOfLines={1}
                    >
                      Prayer request
                    </Text>

                    <Text
                      style={{
                        color: MUTED,
                        marginTop: 1,
                        fontSize: 11.2,
                        lineHeight: 15,
                        fontWeight: "700",
                      }}
                      numberOfLines={1}
                    >
                      Keep it clear, honest, and easy to pray into.
                    </Text>
                  </View>
                </View>

                <Text
                  style={{
                    color: TEXT,
                    fontSize: 12.2,
                    fontWeight: "900",
                    marginTop: 10,
                    marginBottom: 5,
                  }}
                >
                  Title
                </Text>

                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  editable={!loading && !deliveryVisible}
                  placeholder="e.g. Job interview on Tuesday"
                  placeholderTextColor="rgba(107, 114, 128, 0.72)"
                  style={{
                    backgroundColor: PREMIUM_CREAM,
                    borderRadius: 15,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    color: TEXT,
                    fontSize: 14,
                    fontWeight: "650",
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                  }}
                />

                <Text
                  style={{
                    color: TEXT,
                    fontSize: 12.2,
                    fontWeight: "900",
                    marginTop: 9,
                    marginBottom: 5,
                  }}
                >
                  Details
                </Text>

                <TextInput
                  value={body}
                  onChangeText={setBody}
                  editable={!loading && !deliveryVisible}
                  placeholder="Share any details that would help others pray."
                  placeholderTextColor="rgba(107, 114, 128, 0.72)"
                  multiline
                  textAlignVertical="top"
                  style={{
                    backgroundColor: PREMIUM_CREAM,
                    borderRadius: 15,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    color: TEXT,
                    fontSize: 14,
                    lineHeight: 18,
                    fontWeight: "650",
                    minHeight: 58,
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                  }}
                />
              </View>

              <View
                style={{
                  marginTop: 10,
                  backgroundColor: SURFACE,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  padding: 12,
                  shadowColor: SHADOW,
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 3 },
                  elevation: 1,
                }}
              >
                <Text
                  style={{
                    color: TEXT,
                    fontSize: 14.5,
                    fontWeight: "900",
                    marginBottom: 2,
                  }}
                >
                  Who can see this?
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 11.2,
                    lineHeight: 15,
                    fontWeight: "700",
                    marginBottom: 8,
                  }}
                  numberOfLines={1}
                >
                  Choose where this prayer request should be shared.
                </Text>

                <AudienceCard
                  value="fellowship"
                  title="My Fellowship"
                  subtitle="Visible to your Fellowship connections."
                  icon="people-circle-outline"
                />

                <AudienceCard
                  value="group"
                  title={groups.length > 0 ? "One of my groups" : "Prayer group"}
                  subtitle={
                    groups.length > 0
                      ? "Share inside a selected prayer group."
                      : "Create a group first to use this option."
                  }
                  icon="people-outline"
                  disabled={groups.length === 0}
                />

                {audience === "group" && groups.length > 0 ? (
                  <View
                    style={{
                      marginTop: 2,
                      backgroundColor: PREMIUM_CREAM,
                      borderRadius: 18,
                      padding: 9,
                      borderWidth: 1,
                      borderColor: CARD_BORDER,
                    }}
                  >
                    <Text
                      style={{
                        color: TEXT,
                        fontSize: 12,
                        fontWeight: "900",
                        marginBottom: 6,
                      }}
                    >
                      Choose group
                    </Text>

                    {groups.map((g) => {
                      const selected = selectedGroupId === g.id;

                      return (
                        <Pressable
                          key={g.id}
                          onPress={() => {
                            if (loading || deliveryVisible) return;
                            setSelectedGroupId(g.id);
                          }}
                          style={({ pressed }) => ({
                            paddingVertical: 8,
                            paddingHorizontal: 9,
                            borderRadius: 14,
                            backgroundColor: selected
                              ? AMBER_SOFT
                              : pressed
                              ? OLIVE_SOFT
                              : SURFACE,
                            borderWidth: 1,
                            borderColor: selected ? AMBER_BORDER : CARD_BORDER,
                            marginBottom: 6,
                            flexDirection: "row",
                            alignItems: "center",
                          })}
                        >
                          <Ionicons
                            name="people-outline"
                            size={15}
                            color={selected ? EVENT_AMBER : OLIVE}
                          />

                          <Text
                            style={{
                              color: selected ? EVENT_BROWN : TEXT,
                              fontSize: 12,
                              fontWeight: "900",
                              marginLeft: 7,
                              flex: 1,
                            }}
                            numberOfLines={1}
                          >
                            {g.name}
                          </Text>

                          {selected ? (
                            <Ionicons
                              name="checkmark-circle"
                              size={17}
                              color={EVENT_AMBER}
                            />
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}

                {audience === "fellowship" ? (
                  <ToggleRow
                    active={allowReshare}
                    onPress={() => setAllowReshare((prev) => !prev)}
                    title="Allow Fellowship sharing"
                    subtitle="Trusted connections may share this onward."
                    icon={allowReshare ? "share-social" : "share-social-outline"}
                  />
                ) : null}

                <View
                  style={{
                    height: 1,
                    backgroundColor: CARD_BORDER,
                    marginVertical: 2,
                  }}
                />

                <ToggleRow
                  active={isAnonymous}
                  onPress={() => setIsAnonymous((prev) => !prev)}
                  title="Post anonymously"
                  subtitle="Your name and avatar will not be shown."
                  icon="person-outline"
                />
              </View>
            </ScrollView>

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
                    {audience === "group"
                      ? "Your group can now pray with you."
                      : "Your Fellowship can now pray with you."}
                  </Text>
                </Animated.View>
              </View>
            ) : null}

            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 8,
                paddingBottom: Math.max(insets.bottom, 10),
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
                  paddingVertical: 10,
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
                    fontSize: 13.5,
                    fontWeight: "900",
                  }}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSubmit}
                disabled={loading || deliveryVisible || !title.trim()}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 999,
                  alignItems: "center",
                  backgroundColor: title.trim() ? EVENT_AMBER : AMBER_SOFT,
                  borderWidth: 1,
                  borderColor: AMBER_BORDER,
                  opacity: loading || deliveryVisible || !title.trim() ? 0.65 : 1,
                  transform: [
                    {
                      scale:
                        pressed && title.trim() && !deliveryVisible ? 0.97 : 1,
                    },
                  ],
                })}
              >
                <Text
                  style={{
                    color: title.trim() ? "#FFFFFF" : EVENT_BROWN,
                    fontSize: 13.5,
                    fontWeight: "900",
                  }}
                >
                  {loading
                    ? "Posting…"
                    : deliveryVisible
                    ? "Delivered"
                    : "Post request"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}