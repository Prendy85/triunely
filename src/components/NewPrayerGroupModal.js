// src/components/NewPrayerGroupModal.js
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
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
  letterSpacing: -0.35,
};

const PRIVACY_OPTIONS = [
  {
    id: "public",
    label: "Public",
    description: "Anyone can find the group and see prayer requests.",
    icon: "earth-outline",
  },
  {
    id: "request",
    label: "By request",
    description: "People can ask to join before seeing group prayers.",
    icon: "person-add-outline",
  },
  {
    id: "private",
    label: "Private",
    description: "Invite-only. Best for sensitive or closed groups.",
    icon: "lock-closed-outline",
  },
];

const GROUP_TYPES = [
  { id: "church", label: "Church", icon: "business-outline" },
  { id: "family", label: "Family", icon: "home-outline" },
  { id: "friends", label: "Friends", icon: "people-outline" },
  { id: "youth", label: "Youth", icon: "happy-outline" },
  { id: "ministry", label: "Ministry", icon: "heart-outline" },
  { id: "other", label: "Other", icon: "ellipse-outline" },
];

export default function NewPrayerGroupModal({
  visible,
  onClose,
  onSubmit,
  loading,
}) {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [groupType, setGroupType] = useState("church");

  const reset = () => {
    setName("");
    setDescription("");
    setPrivacy("public");
    setGroupType("church");
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    onSubmit(name.trim(), description.trim() || null, privacy, groupType);
  };

  const resetAndClose = () => {
    if (loading) return;
    reset();
    onClose && onClose();
  };

  const PrivacyOption = ({ option }) => {
    const selected = privacy === option.id;

    return (
      <Pressable
        onPress={() => setPrivacy(option.id)}
        style={({ pressed }) => ({
          padding: 13,
          borderRadius: 22,
          marginBottom: 10,
          backgroundColor: selected ? AMBER_SOFT : SURFACE,
          borderWidth: 1,
          borderColor: selected ? AMBER_BORDER : CARD_BORDER,
          shadowColor: SHADOW,
          shadowOpacity: selected ? 0.05 : 0.03,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: selected ? 2 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        })}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: selected ? AMBER_SOFT : OLIVE_SOFT,
              borderWidth: 1,
              borderColor: selected ? AMBER_BORDER : OLIVE_BORDER,
              marginRight: 11,
            }}
          >
            <Ionicons
              name={option.icon}
              size={19}
              color={selected ? EVENT_AMBER : OLIVE}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: selected ? EVENT_BROWN : TEXT,
                fontSize: 14,
                fontWeight: "900",
              }}
            >
              {option.label}
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
              {option.description}
            </Text>
          </View>

          {selected ? (
            <Ionicons name="checkmark-circle" size={21} color={EVENT_AMBER} />
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      presentationStyle="fullScreen"
      onRequestClose={resetAndClose}
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
            {/* Header */}
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
                  onPress={resetAndClose}
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
                    Prayer group
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
                    Create a shared space for prayer and encouragement.
                  </Text>
                </View>
              </View>
            </View>

            {/* Body */}
            <ScrollView
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 18,
                paddingTop: 16,
                paddingBottom: 22,
              }}
            >
              <View
                style={{
                  backgroundColor: SURFACE,
                  borderRadius: 26,
                  borderWidth: 1,
                  borderColor: AMBER_BORDER,
                  padding: 15,
                  shadowColor: SHADOW,
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 5 },
                  elevation: 2,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 46,
                      height: 46,
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
                      name="people-outline"
                      size={22}
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
                      Group details
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
                      Name it clearly so people understand the purpose.
                    </Text>
                  </View>
                </View>

                <Text
                  style={{
                    color: TEXT,
                    fontSize: 13,
                    fontWeight: "900",
                    marginTop: 16,
                    marginBottom: 7,
                  }}
                >
                  Group name
                </Text>

                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Hope Church Young Adults"
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
                    marginTop: 14,
                    marginBottom: 7,
                  }}
                >
                  Description
                </Text>

                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe who this group is for and how to use it."
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
                    minHeight: 92,
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                  }}
                />
              </View>

              <View
                style={{
                  marginTop: 14,
                  backgroundColor: SURFACE,
                  borderRadius: 26,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  padding: 15,
                  shadowColor: SHADOW,
                  shadowOpacity: 0.04,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 1,
                }}
              >
                <Text
                  style={{
                    color: TEXT,
                    fontSize: 16,
                    fontWeight: "900",
                    marginBottom: 4,
                  }}
                >
                  Privacy
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 12,
                    lineHeight: 17,
                    fontWeight: "700",
                    marginBottom: 12,
                  }}
                >
                  Choose how visible this group should be.
                </Text>

                {PRIVACY_OPTIONS.map((option) => (
                  <PrivacyOption key={option.id} option={option} />
                ))}
              </View>

              <View
                style={{
                  marginTop: 14,
                  backgroundColor: SURFACE,
                  borderRadius: 26,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  padding: 15,
                  shadowColor: SHADOW,
                  shadowOpacity: 0.04,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 1,
                }}
              >
                <Text
                  style={{
                    color: TEXT,
                    fontSize: 16,
                    fontWeight: "900",
                    marginBottom: 4,
                  }}
                >
                  Group type
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 12,
                    lineHeight: 17,
                    fontWeight: "700",
                    marginBottom: 12,
                  }}
                >
                  This helps organise prayer spaces later.
                </Text>

                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {GROUP_TYPES.map((g) => {
                    const selected = groupType === g.id;

                    return (
                      <Pressable
                        key={g.id}
                        onPress={() => setGroupType(g.id)}
                        style={({ pressed }) => ({
                          paddingHorizontal: 12,
                          paddingVertical: 9,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: selected ? AMBER_BORDER : CARD_BORDER,
                          backgroundColor: selected
                            ? AMBER_SOFT
                            : pressed
                            ? OLIVE_SOFT
                            : PREMIUM_CREAM,
                          marginRight: 8,
                          marginBottom: 8,
                          flexDirection: "row",
                          alignItems: "center",
                          transform: [{ scale: pressed ? 0.97 : 1 }],
                        })}
                      >
                        <Ionicons
                          name={g.icon}
                          size={15}
                          color={selected ? EVENT_AMBER : OLIVE}
                        />

                        <Text
                          style={{
                            color: selected ? EVENT_BROWN : TEXT,
                            fontSize: 12,
                            fontWeight: "900",
                            marginLeft: 6,
                          }}
                        >
                          {g.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
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
                onPress={resetAndClose}
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
                onPress={handleCreate}
                disabled={loading || !name.trim()}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 13,
                  borderRadius: 999,
                  alignItems: "center",
                  backgroundColor: name.trim() ? EVENT_AMBER : AMBER_SOFT,
                  borderWidth: 1,
                  borderColor: AMBER_BORDER,
                  opacity: loading || !name.trim() ? 0.65 : 1,
                  shadowColor: EVENT_AMBER,
                  shadowOpacity: name.trim() ? 0.16 : 0,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 5 },
                  elevation: name.trim() ? 3 : 0,
                  transform: [{ scale: pressed && name.trim() ? 0.97 : 1 }],
                })}
              >
                <Text
                  style={{
                    color: name.trim() ? "#FFFFFF" : EVENT_BROWN,
                    fontSize: 14,
                    fontWeight: "900",
                  }}
                >
                  {loading ? "Creating…" : "Create group"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}