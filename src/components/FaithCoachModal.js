// src/components/FaithCoachModal.js
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
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

function parseFaithCoachText(text) {
  const raw = (text || "").trim();
  if (!raw) return null;

  const getSection = (label) => {
    const re = new RegExp(
      `${label}:\\s*([\\s\\S]*?)(?=\\n\\n[A-Z ][A-Z ][A-Z ]+:\\s*|$)`,
      "i"
    );
    const m = raw.match(re);
    return m?.[1]?.trim() || "";
  };

  const scripture = getSection("SCRIPTURE");
  const prayer = getSection("PRAYER TO PRAY");
  const encouragement = getSection("ENCOURAGEMENT");

  return { scripture, prayer, encouragement, raw };
}

function CoachSection({ title, icon, tone = "amber", children }) {
  const isOlive = tone === "olive";

  return (
    <View
      style={{
        backgroundColor: SURFACE,
        borderRadius: 26,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: isOlive ? OLIVE_BORDER : AMBER_BORDER,
        shadowColor: SHADOW,
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 1,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isOlive ? OLIVE_SOFT : AMBER_SOFT,
            borderWidth: 1,
            borderColor: isOlive ? OLIVE_BORDER : AMBER_BORDER,
            marginRight: 10,
          }}
        >
          <Ionicons
            name={icon}
            size={20}
            color={isOlive ? OLIVE : EVENT_AMBER}
          />
        </View>

        <Text
          style={{
            color: isOlive ? OLIVE : EVENT_BROWN,
            fontSize: 13,
            fontWeight: "900",
            letterSpacing: 0.3,
          }}
        >
          {title}
        </Text>
      </View>

      {children}
    </View>
  );
}

export default function FaithCoachModal({
  visible,
  onClose,
  loading,
  request,
  text,
}) {
  const insets = useSafeAreaInsets();
  const parsed = useMemo(() => parseFaithCoachText(text), [text]);

  const fallbackText =
    !loading && (!text || text.trim().length === 0)
      ? "No response available right now. Please try again."
      : "";

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      presentationStyle="fullScreen"
      onRequestClose={onClose}
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
                  onPress={onClose}
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
                    Faith Coach
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
                    Scripture, prayer, and encouragement for this request.
                  </Text>
                </View>
              </View>
            </View>

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
              {request ? (
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
                        name="sparkles-outline"
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
                        Faith Coach is responding to this request.
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
                      {request.title}
                    </Text>

                    {request.body ? (
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
                        {request.body}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {loading ? (
                <View
                  style={{
                    backgroundColor: SURFACE,
                    borderRadius: 26,
                    borderWidth: 1,
                    borderColor: AMBER_BORDER,
                    padding: 22,
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
                      width: 58,
                      height: 58,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: AMBER_SOFT,
                      borderWidth: 1,
                      borderColor: AMBER_BORDER,
                      marginBottom: 14,
                    }}
                  >
                    <ActivityIndicator size="small" color={EVENT_AMBER} />
                  </View>

                  <Text
                    style={[
                      serifHeading,
                      {
                        fontSize: 22,
                        lineHeight: 27,
                        textAlign: "center",
                      },
                    ]}
                  >
                    Seeking guidance
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
                    Finding scripture, prayer, and encouragement for this
                    request.
                  </Text>
                </View>
              ) : parsed ? (
                <>
                  <CoachSection
                    title="SCRIPTURE"
                    icon="book-outline"
                    tone="amber"
                  >
                    <Text
                      style={{
                        color: TEXT,
                        fontSize: 14,
                        lineHeight: 21,
                        fontWeight: "650",
                      }}
                    >
                      {parsed.scripture || "No scripture returned."}
                    </Text>
                  </CoachSection>

                  <CoachSection
                    title="PRAYER TO PRAY"
                    icon="heart-outline"
                    tone="olive"
                  >
                    <Text
                      style={{
                        color: TEXT,
                        fontSize: 14,
                        lineHeight: 21,
                        fontWeight: "650",
                      }}
                    >
                      {parsed.prayer || "No prayer returned."}
                    </Text>
                  </CoachSection>

                  <CoachSection
                    title="ENCOURAGEMENT"
                    icon="leaf-outline"
                    tone="amber"
                  >
                    <Text
                      style={{
                        color: MUTED,
                        fontSize: 14,
                        lineHeight: 21,
                        fontWeight: "650",
                      }}
                    >
                      {parsed.encouragement || "No encouragement returned."}
                    </Text>
                  </CoachSection>

                  {!parsed.scripture || !parsed.prayer || !parsed.encouragement ? (
                    <View
                      style={{
                        marginTop: 2,
                        padding: 12,
                        borderRadius: 20,
                        backgroundColor: OLIVE_SOFT,
                        borderWidth: 1,
                        borderColor: OLIVE_BORDER,
                        flexDirection: "row",
                        alignItems: "flex-start",
                      }}
                    >
                      <Ionicons
                        name="information-circle-outline"
                        size={17}
                        color={OLIVE}
                      />

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
                        If a section looks empty, it may be due to formatting.
                        The response is still valid.
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : (
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
                      fontSize: 15,
                      lineHeight: 22,
                      fontWeight: "650",
                    }}
                  >
                    {fallbackText || text || "No response available right now."}
                  </Text>
                </View>
              )}
            </ScrollView>

            <View
              style={{
                paddingHorizontal: 18,
                paddingTop: 12,
                paddingBottom: Math.max(insets.bottom, 12),
                backgroundColor: PREMIUM_CREAM,
                borderTopWidth: 1,
                borderTopColor: CARD_BORDER,
              }}
            >
              <Pressable
                onPress={onClose}
                disabled={loading}
                style={({ pressed }) => ({
                  paddingVertical: 13,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: SURFACE,
                  borderWidth: 1,
                  borderColor: OLIVE_BORDER,
                  opacity: loading ? 0.6 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <Text
                  style={{
                    color: OLIVE,
                    fontSize: 14,
                    fontWeight: "900",
                  }}
                >
                  Close
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}