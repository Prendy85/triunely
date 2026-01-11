// src/components/FaithCoachModal.js
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { theme } from "../theme/theme";

function parseFaithCoachText(text) {
  const raw = (text || "").trim();
  if (!raw) return null;

  // Expect headings:
  // SCRIPTURE:
  // PRAYER TO PRAY:
  // ENCOURAGEMENT:
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

function Section({ title, children }) {
  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: theme.colors.divider,
      }}
    >
      <Text
        style={{
          color: theme.colors.gold,
          fontWeight: "900",
          fontSize: 12,
          marginBottom: 8,
          letterSpacing: 0.4,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

export default function FaithCoachModal({ visible, onClose, loading, request, text }) {
  const parsed = useMemo(() => parseFaithCoachText(text), [text]);

  const fallbackText =
    !loading && (!text || text.trim().length === 0)
      ? "No response available right now. Please try again."
      : "";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: theme.colors.bg,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 24,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: "80%",
            borderTopWidth: 1,
            borderColor: theme.colors.divider,
          }}
        >
          {/* Drag handle */}
          <View
            style={{
              width: 46,
              height: 4,
              borderRadius: 999,
              backgroundColor: theme.colors.divider,
              alignSelf: "center",
              marginBottom: 12,
            }}
          />

          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
            <Text style={[theme.text.h1, { fontSize: 18, flex: 1 }]}>Faith Coach</Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={[
                theme.button.outline,
                { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 8 },
              ]}
            >
              <Ionicons name="close" size={16} color={theme.colors.text2} />
              <Text style={theme.button.outlineText}>Close</Text>
            </Pressable>
          </View>

          {request?.title ? (
            <Text style={[theme.text.muted, { fontSize: 13, marginBottom: 12 }]}>
              For: {request.title}
            </Text>
          ) : (
            <Text style={[theme.text.muted, { fontSize: 13, marginBottom: 12 }]}>
              Guidance, scripture, and prayer
            </Text>
          )}

          <ScrollView contentContainerStyle={{ paddingBottom: 14 }}>
            {loading ? (
              <View style={{ alignItems: "center", paddingVertical: 20 }}>
                <ActivityIndicator size="large" color={theme.colors.gold} />
                <Text style={[theme.text.muted, { marginTop: 10, fontSize: 13 }]}>
                  Seeking scriptures and guidance…
                </Text>
              </View>
            ) : parsed ? (
              <>
                <Section title="SCRIPTURE">
                  <Text style={{ color: theme.colors.text2, fontSize: 14, lineHeight: 20 }}>
                    {parsed.scripture || "No scripture returned."}
                  </Text>
                </Section>

                <Section title="PRAYER TO PRAY">
                  <Text style={{ color: theme.colors.text, fontSize: 14, lineHeight: 21 }}>
                    {parsed.prayer || "No prayer returned."}
                  </Text>
                </Section>

                <Section title="ENCOURAGEMENT">
                  <Text style={{ color: theme.colors.text2, fontSize: 14, lineHeight: 20 }}>
                    {parsed.encouragement || "No encouragement returned."}
                  </Text>
                </Section>

                {(!parsed.scripture || !parsed.prayer || !parsed.encouragement) ? (
                  <Text style={{ color: theme.colors.muted, fontSize: 12, lineHeight: 18 }}>
                    {"\n"}If a section looks empty, it may be due to formatting. The response is still valid.
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={{ color: theme.colors.text2, fontSize: 14, lineHeight: 20 }}>
                {fallbackText || (text || "")}
              </Text>
            )}
          </ScrollView>

          {/* Bottom close (kept for usability) */}
          <Pressable
            onPress={onClose}
            style={[
              theme.button.outline,
              {
                marginTop: 8,
                paddingVertical: 10,
                borderRadius: 999,
                alignItems: "center",
              },
            ]}
          >
            <Text style={theme.button.outlineText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
