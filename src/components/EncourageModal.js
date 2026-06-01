// src/components/EncourageModal.js
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
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

export default function EncourageModal({
  visible,
  onClose,
  onSubmit,
  loading,
  prayer,
}) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (visible) {
      setMessage("");
    }
  }, [visible, prayer?.id]);

  const handleClose = () => {
    if (loading) return;
    setMessage("");
    onClose && onClose();
  };

  const handleSend = () => {
    if (!message.trim()) return;
    onSubmit && onSubmit(message.trim());
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
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    Encourage
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
                    Send a short encouragement or prayer.
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
              {prayer ? (
                <View
                  style={{
                    backgroundColor: SURFACE,
                    borderRadius: 26,
                    borderWidth: 1,
                    borderColor: AMBER_BORDER,
                    padding: 15,
                    marginBottom: 14,
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
                        name="heart-outline"
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
                        You are replying with encouragement.
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      marginTop: 13,
                      padding: 13,
                      borderRadius: 20,
                      backgroundColor: PREMIUM_CREAM,
                      borderWidth: 1,
                      borderColor: CARD_BORDER,
                    }}
                  >
                    <Text
                      style={{
                        color: TEXT,
                        fontSize: 15,
                        lineHeight: 20,
                        fontWeight: "900",
                      }}
                    >
                      {prayer.title}
                    </Text>

                    {prayer.body ? (
                      <Text
                        style={{
                          color: MUTED,
                          fontSize: 13,
                          lineHeight: 19,
                          fontWeight: "650",
                          marginTop: 6,
                        }}
                        numberOfLines={4}
                      >
                        {prayer.body}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}

              <View
                style={{
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
                  Your encouragement
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
                  Write something gentle, prayerful, and sincere.
                </Text>

                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder="e.g. Praying for peace, strength, and God’s favour over you in this situation."
                  placeholderTextColor="rgba(107, 114, 128, 0.72)"
                  multiline
                  textAlignVertical="top"
                  style={{
                    backgroundColor: PREMIUM_CREAM,
                    borderRadius: 20,
                    paddingHorizontal: 13,
                    paddingVertical: 12,
                    color: TEXT,
                    fontSize: 15,
                    lineHeight: 21,
                    fontWeight: "650",
                    minHeight: 140,
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                  }}
                />

                <View
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 20,
                    backgroundColor: OLIVE_SOFT,
                    borderWidth: 1,
                    borderColor: OLIVE_BORDER,
                    flexDirection: "row",
                    alignItems: "flex-start",
                  }}
                >
                  <Ionicons name="leaf-outline" size={17} color={OLIVE} />

                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 12,
                      lineHeight: 17,
                      fontWeight: "700",
                      marginLeft: 8,
                      flex: 1,
                    }}
                  >
                    Encouragement should comfort, strengthen, and point people
                    toward hope.
                  </Text>
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
                onPress={handleSend}
                disabled={loading || !message.trim()}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 13,
                  borderRadius: 999,
                  alignItems: "center",
                  backgroundColor: message.trim() ? EVENT_AMBER : AMBER_SOFT,
                  borderWidth: 1,
                  borderColor: AMBER_BORDER,
                  opacity: loading || !message.trim() ? 0.65 : 1,
                  shadowColor: EVENT_AMBER,
                  shadowOpacity: message.trim() ? 0.16 : 0,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 5 },
                  elevation: message.trim() ? 3 : 0,
                  transform: [{ scale: pressed && message.trim() ? 0.97 : 1 }],
                })}
              >
                <Text
                  style={{
                    color: message.trim() ? "#FFFFFF" : EVENT_BROWN,
                    fontSize: 14,
                    fontWeight: "900",
                  }}
                >
                  {loading ? "Sending…" : "Send"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}