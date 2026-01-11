// src/components/WeeklyChallengeSpotlight.js
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Alert, Linking, Pressable, Text, View } from "react-native";

export default function WeeklyChallengeSpotlight({
  theme,
  challenge,
  onPressGoToChallenges,
  onOpenScripture,
  onStart,
  onShare,
  shareEnabled = false,
  commitmentText = "",
  hasStarted = false,
}) {
  const [expanded, setExpanded] = useState(false);

  const hasLink = !!challenge?.action_url;
  const shareDisabled = !shareEnabled;

  const weekLabel = useMemo(() => {
    const ws = challenge?.week_start;
    if (!ws) return "This week";

    const monday = new Date(`${ws}T00:00:00`);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const fmt = (d) =>
      d.toLocaleDateString(undefined, { day: "numeric", month: "short" });

    return `${fmt(monday)} – ${fmt(sunday)}`;
  }, [challenge?.week_start]);

  const openLink = async () => {
    if (!challenge?.action_url) return;

    try {
      const url = String(challenge.action_url).trim();
      const ok = await Linking.canOpenURL(url);
      if (!ok) {
        Alert.alert("Link", "Cannot open this link on your device.");
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert("Link", "Could not open link.");
    }
  };

  const disciplineLabel = challenge?.discipline
    ? String(challenge.discipline).replace(/^\w/, (c) => c.toUpperCase())
    : "Weekly Challenge";

  const trimmedCommitment = String(commitmentText || "").trim();
  const showCommitment = shareEnabled && trimmedCommitment.length > 0;

  return (
    <View
      style={{
        borderRadius: 18,
        overflow: "hidden",
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        marginBottom: 12,
      }}
    >
      {/* Header / summary */}
      <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 12 }}>
        {/* Header row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <Text
            style={{
              color: theme.colors.text,
              fontWeight: "900",
              fontSize: 16,
              flex: 1,
            }}
            numberOfLines={1}
          >
            Weekly Challenge
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {!!challenge?.lp_bonus ? (
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: theme.colors.goldHalo,
                  borderWidth: 1,
                  borderColor: theme.colors.goldOutline,
                }}
              >
                <Text style={{ color: theme.colors.goldPressed, fontWeight: "900" }}>
                  +{Number(challenge.lp_bonus) || 0} LP
                </Text>
              </View>
            ) : null}

            {/* Share icon (disabled until commitment saved) */}
            <Pressable
              disabled={shareDisabled}
              onPress={() => {
                if (shareDisabled) return;
                onShare?.();
              }}
              hitSlop={10}
              style={({ pressed }) => ({
                width: 34,
                height: 34,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: theme.colors.divider,
                backgroundColor: pressed ? theme.colors.surfaceAlt : "transparent",
                opacity: shareDisabled ? 0.35 : 1,
              })}
              accessibilityRole="button"
              accessibilityLabel="Share weekly challenge"
              accessibilityState={{ disabled: shareDisabled }}
            >
              <Ionicons
                name="share-outline"
                size={18}
                color={shareDisabled ? theme.colors.muted : theme.colors.text2}
              />
            </Pressable>
          </View>
        </View>

        {/* Week row */}
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 6 }}>
          <Ionicons name="calendar-outline" size={14} color={theme.colors.sage} />
          <Text style={{ color: theme.colors.sage, fontWeight: "800", fontSize: 12 }}>
            {weekLabel}
          </Text>
        </View>

        {/* Commitment reminder (exactly where you requested: below week date, above title) */}
        {showCommitment ? (
          <View
            style={{
              marginTop: 10,
              padding: 12,
              borderRadius: 14,
              backgroundColor: theme.colors.surfaceAlt,
              borderWidth: 1,
              borderColor: theme.colors.goldOutline,
            }}
          >
            <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
              My commitment
            </Text>
            <Text style={{ color: theme.colors.text2, marginTop: 6, lineHeight: 20 }}>
              {trimmedCommitment}
            </Text>
          </View>
        ) : null}

        {/* Title */}
        <Text style={{ color: theme.colors.text, fontWeight: "900", marginTop: 10 }}>
          {challenge?.title || "Weekly challenge"}
        </Text>

        {/* Collapse toggle (controls details below) */}
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          style={{ marginTop: 10, alignSelf: "flex-start" }}
          hitSlop={10}
        >
          <Text style={{ color: theme.colors.sage, fontWeight: "900" }}>
            {expanded ? "Hide details ▲" : "Show details ▼"}
          </Text>
        </Pressable>

        {/* Collapsible details */}
        {expanded ? (
          <View style={{ marginTop: 10 }}>
            <View
              style={{
                padding: 12,
                borderRadius: 14,
                backgroundColor: theme.colors.surfaceAlt,
                borderWidth: 1,
                borderColor: theme.colors.divider,
              }}
            >
              {/* FIX: was muted, should be header colour */}
              <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                {disciplineLabel}
              </Text>

              {!!challenge?.description ? (
                <Text style={{ color: theme.colors.text2, marginTop: 8, lineHeight: 20 }}>
                  {challenge.description}
                </Text>
              ) : (
                <Text style={{ color: theme.colors.muted, marginTop: 8 }}>
                  No description set yet.
                </Text>
              )}

              {!!challenge?.why_it_matters ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                    Why it matters
                  </Text>
                  <Text style={{ color: theme.colors.text2, marginTop: 6, lineHeight: 20 }}>
                    {challenge.why_it_matters}
                  </Text>
                </View>
              ) : null}

              {Array.isArray(challenge?.scripture_refs) && challenge.scripture_refs.length ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                    Read
                  </Text>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
                    {challenge.scripture_refs.map((r) => (
                      <Pressable
                        key={`wkref-${r}`}
                        onPress={() => onOpenScripture?.(r)}
                        style={{
                          backgroundColor: theme.colors.surface,
                          borderRadius: 999,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderWidth: 1,
                          borderColor: theme.colors.divider,
                          marginRight: 8,
                          marginBottom: 8,
                        }}
                      >
                        <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                          {r}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Optional link button if provided */}
              {hasLink ? (
                <Pressable
                  onPress={openLink}
                  style={({ pressed }) => ({
                    marginTop: 12,
                    paddingVertical: 12,
                    borderRadius: 999,
                    alignItems: "center",
                    backgroundColor: pressed ? theme.colors.surface : "transparent",
                    borderWidth: 1,
                    borderColor: theme.colors.divider,
                  })}
                >
                  <Text style={{ color: theme.colors.text2, fontWeight: "900" }}>
                    {challenge?.action_label || "Open link"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>

      {/* Actions (kept visible; does not bloat the card) */}
      <View
        style={{
          padding: 12,
          gap: 10,
          borderTopWidth: 1,
          borderTopColor: theme.colors.divider,
        }}
      >
        <Pressable
          onPress={() => onStart?.()}
          style={({ pressed }) => ({
            paddingVertical: 12,
            borderRadius: 999,
            alignItems: "center",
            backgroundColor: pressed ? theme.colors.goldPressed : theme.colors.gold,
          })}
        >
          <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
            {hasStarted ? "Edit commitment" : "Start weekly challenge"}
          </Text>
        </Pressable>

        <Pressable
          onPress={onPressGoToChallenges}
          style={({ pressed }) => ({
            paddingVertical: 12,
            borderRadius: 999,
            alignItems: "center",
            backgroundColor: pressed ? theme.colors.surfaceAlt : "transparent",
            borderWidth: 1,
            borderColor: theme.colors.divider,
          })}
        >
          <Text style={{ color: theme.colors.text2, fontWeight: "900" }}>
            View daily challenges
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
