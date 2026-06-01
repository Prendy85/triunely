// src/components/NewPrayerModal.js
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

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
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [audience, setAudience] = useState("global");
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  useEffect(() => {
    if (audience === "group" && groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [audience, groups, selectedGroupId]);

  useEffect(() => {
    if (!visible) {
      resetState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const resetState = () => {
    setTitle("");
    setBody("");
    setIsAnonymous(false);
    setAudience("global");
    setSelectedGroupId(null);
  };

  const handleClose = () => {
    if (loading) return;
    resetState();
    onClose && onClose();
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    let visibility = "global";
    let groupId = null;

    if (audience === "group" && groups.length > 0 && selectedGroupId) {
      visibility = "group";
      groupId = selectedGroupId;
    } else if (audience === "private") {
      visibility = "private";
      groupId = null;
    }

    onSubmit(
      title.trim(),
      body.trim() || null,
      isAnonymous,
      visibility,
      groupId
    );
  };

  const AudienceCard = ({ value, title: cardTitle, subtitle, icon, disabled }) => {
    const active = audience === value;

    return (
      <Pressable
        onPress={() => !disabled && setAudience(value)}
        disabled={disabled}
        style={({ pressed }) => ({
          padding: 13,
          borderRadius: 22,
          marginBottom: 10,
          backgroundColor: active ? AMBER_SOFT : SURFACE,
          borderWidth: 1,
          borderColor: active ? AMBER_BORDER : CARD_BORDER,
          opacity: disabled ? 0.5 : 1,
          shadowColor: SHADOW,
          shadowOpacity: pressed ? 0.03 : 0.06,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: pressed ? 1 : 2,
          transform: [{ scale: pressed && !disabled ? 0.985 : 1 }],
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
              backgroundColor: active ? AMBER_SOFT : OLIVE_SOFT,
              borderWidth: 1,
              borderColor: active ? AMBER_BORDER : OLIVE_BORDER,
              marginRight: 11,
            }}
          >
            <Ionicons
              name={icon}
              size={19}
              color={active ? EVENT_AMBER : OLIVE}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: active ? EVENT_BROWN : TEXT,
                fontSize: 14,
                fontWeight: "900",
              }}
            >
              {cardTitle}
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
              {subtitle}
            </Text>
          </View>

          {active ? (
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
      onRequestClose={handleClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: PREMIUM_CREAM }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={{ flex: 1 }}>
            <View
              style={{
                paddingHorizontal: 18,
                paddingTop: 12,
                paddingBottom: 14,
                backgroundColor: PREMIUM_CREAM,
                borderBottomWidth: 1,
                borderBottomColor: CARD_BORDER,
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
                        fontSize: 26,
                        lineHeight: 30,
                      },
                    ]}
                  >
                    New prayer
                  </Text>

                  <Text
                    style={{
                      color: MUTED,
                      marginTop: 2,
                      fontSize: 13,
                      lineHeight: 18,
                      fontWeight: "700",
                    }}
                  >
                    Share what you would like others to pray for.
                  </Text>
                </View>
              </View>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 18,
                paddingTop: 16,
                paddingBottom: 120,
              }}
            >
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
                      Keep it clear, honest, and easy for others to pray into.
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
                  Title
                </Text>

                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Job interview on Tuesday"
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
                  placeholder="Share any details that would help others pray."
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
                    minHeight: 105,
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                  }}
                />
              </View>

              <View
                style={{
                  marginTop: 14,
                  backgroundColor: SURFACE,
                  borderRadius: 28,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  padding: 16,
                  shadowColor: SHADOW,
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 5 },
                  elevation: 2,
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
                  Who can see this?
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
                  Choose where this prayer request should be shared.
                </Text>

                <AudienceCard
                  value="global"
                  title="Triunely Prayer"
                  subtitle="Visible in the main Prayer feed."
                  icon="earth-outline"
                />

                <AudienceCard
                  value="group"
                  title={groups.length > 0 ? "One of my groups" : "Prayer group"}
                  subtitle={
                    groups.length > 0
                      ? "Share this inside a selected prayer group."
                      : "Create a group first to use this option."
                  }
                  icon="people-outline"
                  disabled={groups.length === 0}
                />

                <AudienceCard
                  value="private"
                  title="Private"
                  subtitle="Only you can see this prayer request."
                  icon="lock-closed-outline"
                />

                {audience === "group" && groups.length > 0 ? (
                  <View
                    style={{
                      marginTop: 4,
                      backgroundColor: PREMIUM_CREAM,
                      borderRadius: 22,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: CARD_BORDER,
                    }}
                  >
                    <Text
                      style={{
                        color: TEXT,
                        fontSize: 13,
                        fontWeight: "900",
                        marginBottom: 8,
                      }}
                    >
                      Choose group
                    </Text>

                    {groups.map((g) => {
                      const selected = selectedGroupId === g.id;

                      return (
                        <Pressable
                          key={g.id}
                          onPress={() => setSelectedGroupId(g.id)}
                          style={({ pressed }) => ({
                            paddingVertical: 10,
                            paddingHorizontal: 11,
                            borderRadius: 16,
                            backgroundColor: selected
                              ? AMBER_SOFT
                              : pressed
                              ? OLIVE_SOFT
                              : SURFACE,
                            borderWidth: 1,
                            borderColor: selected ? AMBER_BORDER : CARD_BORDER,
                            marginBottom: 8,
                            flexDirection: "row",
                            alignItems: "center",
                          })}
                        >
                          <Ionicons
                            name="people-outline"
                            size={17}
                            color={selected ? EVENT_AMBER : OLIVE}
                          />

                          <Text
                            style={{
                              color: selected ? EVENT_BROWN : TEXT,
                              fontSize: 13,
                              fontWeight: "900",
                              marginLeft: 8,
                              flex: 1,
                            }}
                          >
                            {g.name}
                          </Text>

                          {selected ? (
                            <Ionicons
                              name="checkmark-circle"
                              size={19}
                              color={EVENT_AMBER}
                            />
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
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
                    backgroundColor: isAnonymous ? EVENT_AMBER : PREMIUM_CREAM,
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
            </ScrollView>

            <View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                paddingHorizontal: 18,
                paddingTop: 12,
                paddingBottom: Platform.OS === "ios" ? 20 : 14,
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
                  shadowOpacity: title.trim() ? 0.18 : 0,
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
                  {loading ? "Posting…" : "Post request"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}