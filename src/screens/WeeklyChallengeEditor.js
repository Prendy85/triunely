// src/screens/WeeklyChallengeEditor.js
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";

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
const DANGER = "#B42318";
const DANGER_SOFT = "rgba(180, 35, 24, 0.08)";
const DANGER_BORDER = "rgba(180, 35, 24, 0.18)";
const SHADOW = "rgba(15, 23, 42, 0.10)";

const displayFont = Platform.OS === "ios" ? "Georgia" : "serif";

const serifHeading = {
  fontFamily: displayFont,
  color: TEXT,
  fontWeight: "900",
  letterSpacing: -0.45,
};

const DISCIPLINES = [
  {
    key: "scripture",
    label: "Scripture",
    icon: "book-outline",
    helper: "Help people open and apply the Bible.",
  },
  {
    key: "prayer",
    label: "Prayer",
    icon: "hand-left-outline",
    helper: "Encourage deeper prayer and intercession.",
  },
  {
    key: "obedience",
    label: "Obedience",
    icon: "walk-outline",
    helper: "Move faith from hearing into action.",
  },
  {
    key: "service",
    label: "Service",
    icon: "heart-outline",
    helper: "Encourage love, generosity and practical care.",
  },
  {
    key: "renunciation",
    label: "Renunciation",
    icon: "leaf-outline",
    helper: "Let go of distractions and choose holiness.",
  },
];

const QUICK_TEMPLATES = [
  {
    key: "invite",
    title: "Invite one person",
    discipline: "obedience",
    topic: "Evangelism",
    challengeTitle: "Invite One Person This Week",
    description:
      "This week, prayerfully choose one person to invite to church, a small group, or a faith conversation. Keep it simple, kind, and personal.",
    whyItMatters:
      "God often uses ordinary invitations to open extraordinary doors. A simple invitation can become the beginning of someone hearing the gospel, finding community, or taking a step back toward Jesus.",
    scriptureRefs: "Matthew 28:19-20, Romans 10:14",
    actionLabel: "I’ve invited someone",
    lpBonus: "10",
  },
  {
    key: "pray",
    title: "Pray daily",
    discipline: "prayer",
    topic: "Prayer consistency",
    challengeTitle: "Pray for 10 Minutes Each Day",
    description:
      "Set aside 10 minutes each day this week to pray without distraction. Bring your thanks, needs, family, church, and local community before God.",
    whyItMatters:
      "Prayer forms our attention around God. It teaches dependence, strengthens faith, and helps us carry burdens with the Lord rather than alone.",
    scriptureRefs: "Philippians 4:6-7, 1 Thessalonians 5:17",
    actionLabel: "I completed today’s prayer",
    lpBonus: "7",
  },
  {
    key: "serve",
    title: "Serve someone",
    discipline: "service",
    topic: "Practical love",
    challengeTitle: "Serve Someone Quietly",
    description:
      "Find one practical way to serve someone this week without needing recognition. It could be a message, a meal, a lift, a call, a gift, or help with something heavy.",
    whyItMatters:
      "Jesus teaches us that greatness in the Kingdom looks like service. Quiet acts of love train our hearts away from self-focus and toward Christlike compassion.",
    scriptureRefs: "Mark 10:45, Galatians 5:13",
    actionLabel: "I served someone",
    lpBonus: "10",
  },
];

function getCurrentWeekBoundsISO() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;

  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const toISODate = (d) => d.toISOString().slice(0, 10);

  return {
    week_start: toISODate(monday),
    week_end: toISODate(sunday),
  };
}

function parseRefs(input) {
  const raw = String(input || "")
    .split(/[\n,]+/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const seen = new Set();
  const out = [];

  for (const r of raw) {
    const k = r.toLowerCase();

    if (seen.has(k)) continue;

    seen.add(k);
    out.push(r);
  }

  return out.slice(0, 6);
}

function refsToString(refs) {
  if (!Array.isArray(refs) || refs.length === 0) return "";
  return refs.join(", ");
}

function formatWeekLabel(weekStart) {
  const fmt = (d) =>
    d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });

  const monday = new Date(`${weekStart}T00:00:00`);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return `${fmt(monday)} – ${fmt(sunday)}`;
}

function tintColors(tint) {
  if (tint === "amber") {
    return {
      soft: AMBER_SOFT,
      border: AMBER_BORDER,
      main: EVENT_AMBER,
      strong: EVENT_BROWN,
    };
  }

  if (tint === "danger") {
    return {
      soft: DANGER_SOFT,
      border: DANGER_BORDER,
      main: DANGER,
      strong: DANGER,
    };
  }

  return {
    soft: OLIVE_SOFT,
    border: OLIVE_BORDER,
    main: OLIVE,
    strong: OLIVE,
  };
}

function StudioIcon({ icon, tint = "olive", size = 46 }) {
  const colors = tintColors(tint);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        backgroundColor: colors.soft,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={icon} size={Math.round(size * 0.46)} color={colors.main} />
    </View>
  );
}

function StatusPill({ status }) {
  const published = status === "published";
  const colors = published ? tintColors("amber") : tintColors("olive");

  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: colors.soft,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text
        style={{
          color: colors.strong,
          fontSize: 11,
          fontWeight: "900",
          letterSpacing: 0.4,
        }}
      >
        {published ? "LIVE" : "DRAFT"}
      </Text>
    </View>
  );
}

function StudioCard({ children, style }) {
  return (
    <View
      style={[
        {
          backgroundColor: SURFACE,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          borderRadius: 28,
          padding: 15,
          shadowColor: SHADOW,
          shadowOpacity: 0.065,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function SectionHeader({ icon, tint = "amber", title, subtitle, right }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 13,
      }}
    >
      <StudioIcon icon={icon} tint={tint} size={44} />

      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text
          style={{
            color: TEXT,
            fontSize: 17,
            fontWeight: "900",
            lineHeight: 21,
          }}
        >
          {title}
        </Text>

        {subtitle ? (
          <Text
            style={{
              color: MUTED,
              fontSize: 12.6,
              fontWeight: "700",
              lineHeight: 18,
              marginTop: 4,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ? <View style={{ marginLeft: 8 }}>{right}</View> : null}
    </View>
  );
}

function FieldLabel({ children, helper }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text
        style={{
          color: TEXT,
          fontSize: 13,
          fontWeight: "900",
        }}
      >
        {children}
      </Text>

      {helper ? (
        <Text
          style={{
            color: MUTED,
            fontSize: 11.8,
            fontWeight: "700",
            lineHeight: 16,
            marginTop: 3,
          }}
        >
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

function inputStyle(extra = {}) {
  return {
    backgroundColor: PREMIUM_CREAM,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: TEXT,
    fontSize: 14.5,
    fontWeight: "700",
    ...extra,
  };
}

function PrimaryButton({
  title,
  subtitle,
  icon,
  tint = "amber",
  loading,
  disabled,
  onPress,
}) {
  const amber = tint === "amber";
  const colors = tintColors(tint);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        borderRadius: 22,
        padding: 13,
        backgroundColor: amber ? EVENT_AMBER : SURFACE,
        borderWidth: 1,
        borderColor: amber ? EVENT_AMBER : colors.border,
        opacity: disabled || loading ? 0.62 : pressed ? 0.86 : 1,
        transform: [{ scale: pressed && !disabled && !loading ? 0.99 : 1 }],
        shadowColor: SHADOW,
        shadowOpacity: amber ? 0.12 : 0.04,
        shadowRadius: amber ? 14 : 8,
        shadowOffset: { width: 0, height: amber ? 6 : 3 },
        elevation: amber ? 3 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: amber ? "rgba(255,255,255,0.17)" : colors.soft,
            borderWidth: 1,
            borderColor: amber ? "rgba(255,255,255,0.22)" : colors.border,
          }}
        >
          {loading ? (
            <ActivityIndicator color={amber ? "#FFFFFF" : colors.main} />
          ) : (
            <Ionicons
              name={icon}
              size={19}
              color={amber ? "#FFFFFF" : colors.main}
            />
          )}
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={{
              color: amber ? "#FFFFFF" : colors.strong,
              fontSize: 14.5,
              fontWeight: "900",
            }}
          >
            {title}
          </Text>

          {subtitle ? (
            <Text
              style={{
                color: amber ? "rgba(255,255,255,0.82)" : MUTED,
                fontSize: 12,
                fontWeight: "700",
                lineHeight: 17,
                marginTop: 3,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function DisciplineCard({ item, selected, onPress }) {
  const colors = tintColors(selected ? "amber" : "olive");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 158,
        minHeight: 130,
        borderRadius: 25,
        padding: 13,
        marginRight: 10,
        backgroundColor: selected ? AMBER_SOFT : SURFACE,
        borderWidth: 1,
        borderColor: selected ? AMBER_BORDER : CARD_BORDER,
        opacity: pressed ? 0.84 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
        shadowColor: SHADOW,
        shadowOpacity: selected ? 0.08 : 0.035,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: selected ? 2 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <StudioIcon icon={item.icon} tint={selected ? "amber" : "olive"} size={38} />

        {selected ? (
          <View
            style={{
              marginLeft: "auto",
              width: 26,
              height: 26,
              borderRadius: 999,
              backgroundColor: EVENT_AMBER,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="checkmark" size={15} color="#FFFFFF" />
          </View>
        ) : null}
      </View>

      <Text
        style={{
          color: selected ? EVENT_BROWN : TEXT,
          fontSize: 14.5,
          fontWeight: "900",
          marginTop: 10,
        }}
      >
        {item.label}
      </Text>

      <Text
        style={{
          color: MUTED,
          fontSize: 11.5,
          fontWeight: "700",
          lineHeight: 16,
          marginTop: 4,
        }}
        numberOfLines={3}
      >
        {item.helper}
      </Text>
    </Pressable>
  );
}

function TemplateCard({ item, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 220,
        borderRadius: 24,
        padding: 13,
        marginRight: 10,
        backgroundColor: SURFACE,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        opacity: pressed ? 0.82 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <StudioIcon icon="sparkles-outline" tint="amber" size={36} />

        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: TEXT, fontSize: 14, fontWeight: "900" }}>
            {item.title}
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 11.5,
              fontWeight: "700",
              marginTop: 3,
            }}
            numberOfLines={1}
          >
            {item.topic}
          </Text>
        </View>
      </View>

      <Text
        style={{
          color: MUTED,
          fontSize: 12,
          fontWeight: "700",
          lineHeight: 17,
          marginTop: 10,
        }}
        numberOfLines={3}
      >
        {item.description}
      </Text>
    </Pressable>
  );
}

function ChecklistRow({ done, label, helper }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 9,
        borderTopWidth: 1,
        borderTopColor: CARD_BORDER,
      }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 999,
          backgroundColor: done ? OLIVE_SOFT : DANGER_SOFT,
          borderWidth: 1,
          borderColor: done ? OLIVE_BORDER : DANGER_BORDER,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
        }}
      >
        <Ionicons
          name={done ? "checkmark" : "ellipse-outline"}
          size={16}
          color={done ? OLIVE : DANGER}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: TEXT,
            fontSize: 13,
            fontWeight: "900",
          }}
        >
          {label}
        </Text>

        {helper ? (
          <Text
            style={{
              color: MUTED,
              fontSize: 11.8,
              fontWeight: "700",
              lineHeight: 16,
              marginTop: 2,
            }}
          >
            {helper}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function ScriptureChips({ refs }) {
  if (!refs.length) {
    return (
      <Text
        style={{
          color: MUTED,
          fontSize: 12.5,
          fontWeight: "700",
          marginTop: 8,
        }}
      >
        No scripture references added yet.
      </Text>
    );
  }

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 9 }}>
      {refs.map((ref) => (
        <View
          key={ref}
          style={{
            borderRadius: 999,
            paddingHorizontal: 9,
            paddingVertical: 5,
            backgroundColor: OLIVE_SOFT,
            borderWidth: 1,
            borderColor: OLIVE_BORDER,
          }}
        >
          <Text style={{ color: OLIVE, fontSize: 11.5, fontWeight: "900" }}>
            {ref}
          </Text>
        </View>
      ))}
    </View>
  );
}

function MemberPreviewCard({
  disciplineLabel,
  title,
  description,
  whyItMatters,
  refs,
  actionLabel,
  lpBonus,
}) {
  return (
    <View
      style={{
        backgroundColor: PREMIUM_CREAM,
        borderWidth: 1,
        borderColor: AMBER_BORDER,
        borderRadius: 28,
        padding: 15,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <StudioIcon icon="flame-outline" tint="amber" size={48} />

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={{
              color: EVENT_BROWN,
              fontSize: 11,
              fontWeight: "900",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            This week’s challenge
          </Text>

          <Text
            style={[
              serifHeading,
              {
                fontSize: 22,
                lineHeight: 27,
                marginTop: 4,
              },
            ]}
          >
            {title || "Your challenge title will appear here"}
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 12.5,
              fontWeight: "800",
              marginTop: 6,
            }}
          >
            {disciplineLabel}
          </Text>
        </View>
      </View>

      <Text
        style={{
          color: TEXT,
          fontSize: 13.5,
          fontWeight: "700",
          lineHeight: 20,
          marginTop: 14,
        }}
      >
        {description ||
          "Add a short, clear challenge description so members know exactly what to do this week."}
      </Text>

      {whyItMatters ? (
        <View
          style={{
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            borderRadius: 20,
            padding: 12,
            marginTop: 12,
          }}
        >
          <Text
            style={{
              color: TEXT,
              fontSize: 13,
              fontWeight: "900",
            }}
          >
            Why it matters
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 12.5,
              fontWeight: "700",
              lineHeight: 18,
              marginTop: 5,
            }}
          >
            {whyItMatters}
          </Text>
        </View>
      ) : null}

      <ScriptureChips refs={refs} />

      <View
        style={{
          flexDirection: "row",
          gap: 9,
          marginTop: 14,
        }}
      >
        <View
          style={{
            flex: 1,
            borderRadius: 999,
            paddingVertical: 11,
            paddingHorizontal: 12,
            backgroundColor: EVENT_AMBER,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 12.5,
              fontWeight: "900",
            }}
            numberOfLines={1}
          >
            {actionLabel || "Complete challenge"}
          </Text>
        </View>

        <View
          style={{
            borderRadius: 999,
            paddingVertical: 11,
            paddingHorizontal: 12,
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
              fontSize: 12.5,
              fontWeight: "900",
            }}
          >
            +{Number(lpBonus || 0) || 0} LP
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function WeeklyChallengeEditor({ route, navigation }) {
  const churchId = route?.params?.churchId;
  const churchName = route?.params?.churchName || "Church";

  const { week_start } = useMemo(() => getCurrentWeekBoundsISO(), []);
  const weekLabel = useMemo(() => formatWeekLabel(week_start), [week_start]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [rowId, setRowId] = useState(null);
  const [status, setStatus] = useState("draft");

  const [discipline, setDiscipline] = useState("scripture");
  const [topic, setTopic] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [whyItMatters, setWhyItMatters] = useState("");
  const [scriptureRefsInput, setScriptureRefsInput] = useState("");

  const [actionLabel, setActionLabel] = useState("Complete challenge");
  const [actionUrl, setActionUrl] = useState("");
  const [lpBonus, setLpBonus] = useState("0");

  const scriptureRefs = useMemo(
    () => parseRefs(scriptureRefsInput),
    [scriptureRefsInput]
  );

  const selectedDiscipline = useMemo(() => {
    return DISCIPLINES.find((item) => item.key === discipline) || DISCIPLINES[0];
  }, [discipline]);

  const quality = useMemo(() => {
    const cleanTitle = String(title || "").trim();
    const cleanDescription = String(description || "").trim();
    const cleanWhy = String(whyItMatters || "").trim();
    const cleanAction = String(actionLabel || "").trim();

    return [
      {
        key: "title",
        done: cleanTitle.length >= 6,
        label: "Clear challenge title",
        helper: "Make it short, direct and action-focused.",
      },
      {
        key: "description",
        done: cleanDescription.length >= 40,
        label: "Practical instruction",
        helper: "Members should know exactly what to do this week.",
      },
      {
        key: "why",
        done: cleanWhy.length >= 35,
        label: "Spiritual purpose",
        helper: "Explain why this matters for discipleship.",
      },
      {
        key: "scripture",
        done: scriptureRefs.length > 0,
        label: "Scripture connected",
        helper: "Add at least one Bible reference where possible.",
      },
      {
        key: "action",
        done: cleanAction.length >= 3,
        label: "Action button ready",
        helper: "Give members a simple completion action.",
      },
    ];
  }, [title, description, whyItMatters, scriptureRefs.length, actionLabel]);

  const qualityScore = quality.filter((item) => item.done).length;
  const readyToPublish = qualityScore >= 4;

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);

        if (!churchId) {
          Alert.alert("Weekly Challenge", "Missing churchId.");
          return;
        }

        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr || !user) {
          Alert.alert("Weekly Challenge", "You must be logged in.");
          return;
        }

        const { data, error } = await supabase
          .from("church_weekly_challenges")
          .select(
            "id, church_id, week_start, discipline, topic, title, description, why_it_matters, scripture_refs, action_label, action_url, lp_bonus, status"
          )
          .eq("church_id", churchId)
          .eq("week_start", week_start)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          console.log("WeeklyChallengeEditor load error:", error);
          Alert.alert("Weekly Challenge", "Could not load current week challenge.");
          return;
        }

        if (data) {
          setRowId(data.id);
          setStatus(data.status || "draft");
          setDiscipline(data.discipline || "scripture");
          setTopic(data.topic || "");
          setTitle(data.title || "");
          setDescription(data.description || "");
          setWhyItMatters(data.why_it_matters || "");
          setScriptureRefsInput(refsToString(data.scripture_refs));
          setActionLabel(data.action_label || "Complete challenge");
          setActionUrl(data.action_url || "");
          setLpBonus(String(data.lp_bonus ?? 0));
        } else {
          setRowId(null);
          setStatus("draft");
          setDiscipline("scripture");
          setTopic("");
          setTitle("");
          setDescription("");
          setWhyItMatters("");
          setScriptureRefsInput("");
          setActionLabel("Complete challenge");
          setActionUrl("");
          setLpBonus("0");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [churchId, week_start]);

  function normalizeLp() {
    const n = Number(lpBonus);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.floor(n);
  }

  function validate(nextStatus) {
    if (!String(title || "").trim()) {
      Alert.alert("Weekly Challenge", "Please add a title.");
      return false;
    }

    if (nextStatus === "published" && !readyToPublish) {
      Alert.alert(
        "Review before publishing",
        "This challenge is not quite ready yet. Aim for at least 4 of 5 quality checks before publishing."
      );
      return false;
    }

    const url = String(actionUrl || "").trim();

    if (url && !(url.startsWith("http://") || url.startsWith("https://"))) {
      Alert.alert(
        "Weekly Challenge",
        "Action URL must start with http:// or https://"
      );
      return false;
    }

    return true;
  }

  async function saveWithStatus(nextStatus) {
    if (!validate(nextStatus)) return;

    try {
      setSaving(true);

      const payload = {
        id: rowId || undefined,
        church_id: churchId,
        week_start,
        discipline: String(discipline || "").trim() || null,
        topic: String(topic || "").trim() || null,
        title: String(title || "").trim(),
        description: String(description || "").trim() || null,
        why_it_matters: String(whyItMatters || "").trim() || null,
        scripture_refs: scriptureRefs.length ? scriptureRefs : null,
        action_label: String(actionLabel || "").trim() || null,
        action_url: String(actionUrl || "").trim() || null,
        lp_bonus: normalizeLp(),
        status: nextStatus,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("church_weekly_challenges")
        .upsert(payload, { onConflict: "church_id,week_start" })
        .select("id, status")
        .maybeSingle();

      if (error) {
        console.log("WeeklyChallengeEditor save error:", error);
        Alert.alert("Weekly Challenge", error.message || "Could not save.");
        return;
      }

      setRowId(data?.id || rowId || null);
      setStatus(data?.status || nextStatus);

      Alert.alert(
        nextStatus === "published" ? "Published" : "Draft saved",
        nextStatus === "published"
          ? "This challenge is now live for this week."
          : "Your weekly challenge draft has been saved."
      );
    } finally {
      setSaving(false);
    }
  }

  function confirmPublish() {
    Alert.alert(
      status === "published" ? "Update live challenge?" : "Publish challenge?",
      status === "published"
        ? "This will update the live weekly challenge members can see."
        : "This will make the weekly challenge visible to approved church members.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: status === "published" ? "Update Live" : "Publish",
          onPress: () => saveWithStatus("published"),
        },
      ]
    );
  }

  async function generateWithFaithCoach() {
    try {
      setGenerating(true);

      const { data, error } = await supabase.functions.invoke("faith-coach", {
body: {
  action: "generate_weekly_challenge",
  church_id: churchId,
  church_name: churchName,
  week_start,
  topic: `${discipline}${topic ? `: ${String(topic).trim()}` : ""}`,
},
      });

      if (error) {
        console.log("generate_weekly_challenge invoke error:", error);
        Alert.alert("Faith Coach", error.message || "Could not generate draft.");
        return;
      }

      if (!data || typeof data !== "object") {
        Alert.alert("Faith Coach", "No data returned.");
        return;
      }

      if (data.title) setTitle(String(data.title));
      if (data.description !== undefined) {
        setDescription(String(data.description || ""));
      }
      if (data.why_it_matters !== undefined) {
        setWhyItMatters(String(data.why_it_matters || ""));
      }
      if (Array.isArray(data.scripture_refs)) {
        setScriptureRefsInput(refsToString(data.scripture_refs));
      }
      if (data.action_label !== undefined) {
        setActionLabel(String(data.action_label || "Complete challenge"));
      }
      if (data.action_url !== undefined) {
        setActionUrl(String(data.action_url || ""));
      }
      if (data.lp_bonus !== undefined && data.lp_bonus !== null) {
        setLpBonus(String(data.lp_bonus));
      }

      Alert.alert(
        "Draft generated",
        "Faith Coach has created a draft. Review and polish it before publishing."
      );
    } catch (e) {
      console.log("generateWithFaithCoach unexpected:", e);
      Alert.alert("Faith Coach", "Unexpected error generating draft.");
    } finally {
      setGenerating(false);
    }
  }

  function applyTemplate(template) {
    Alert.alert(
      "Use this template?",
      "This will replace the current challenge fields with this quick-start template.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Use template",
          onPress: () => {
            setDiscipline(template.discipline);
            setTopic(template.topic);
            setTitle(template.challengeTitle);
            setDescription(template.description);
            setWhyItMatters(template.whyItMatters);
            setScriptureRefsInput(template.scriptureRefs);
            setActionLabel(template.actionLabel);
            setLpBonus(template.lpBonus);
          },
        },
      ]
    );
  }

  return (
    <Screen backgroundColor={PREMIUM_CREAM} padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 34,
        }}
      >
        <View
          style={{
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: AMBER_BORDER,
            borderRadius: 34,
            padding: 17,
            marginBottom: 14,
            shadowColor: SHADOW,
            shadowOpacity: 0.1,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 4,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <StudioIcon icon="sparkles-outline" tint="amber" size={58} />

            <View style={{ flex: 1, marginLeft: 13 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                }}
              >
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text
                    style={{
                      color: EVENT_BROWN,
                      fontSize: 11,
                      fontWeight: "900",
                      letterSpacing: 1.1,
                      textTransform: "uppercase",
                    }}
                  >
                    Ministry Tools
                  </Text>

                  <Text
                    style={[
                      serifHeading,
                      {
                        fontSize: 27,
                        lineHeight: 32,
                        marginTop: 3,
                      },
                    ]}
                  >
                    Weekly Challenge Studio
                  </Text>
                </View>

                <StatusPill status={status} />
              </View>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 13.5,
                  fontWeight: "700",
                  lineHeight: 20,
                  marginTop: 8,
                }}
              >
                Create a guided discipleship challenge for {churchName}. Build it
                with Faith Coach, preview it like a member, then publish with
                confidence.
              </Text>
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              gap: 9,
              marginTop: 15,
            }}
          >
            <View
              style={{
                flex: 1,
                borderRadius: 20,
                backgroundColor: AMBER_SOFT,
                borderWidth: 1,
                borderColor: AMBER_BORDER,
                padding: 11,
              }}
            >
              <Text style={{ color: EVENT_BROWN, fontSize: 16, fontWeight: "900" }}>
                {weekLabel}
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 11.5,
                  fontWeight: "800",
                  marginTop: 3,
                }}
              >
                Current week
              </Text>
            </View>

            <View
              style={{
                width: 112,
                borderRadius: 20,
                backgroundColor: readyToPublish ? OLIVE_SOFT : DANGER_SOFT,
                borderWidth: 1,
                borderColor: readyToPublish ? OLIVE_BORDER : DANGER_BORDER,
                padding: 11,
              }}
            >
              <Text
                style={{
                  color: readyToPublish ? OLIVE : DANGER,
                  fontSize: 16,
                  fontWeight: "900",
                }}
              >
                {qualityScore}/5
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 11.5,
                  fontWeight: "800",
                  marginTop: 3,
                }}
              >
                Ready score
              </Text>
            </View>
          </View>
        </View>

        {loading ? (
          <StudioCard style={{ alignItems: "center", paddingVertical: 34 }}>
            <ActivityIndicator color={EVENT_AMBER} />

            <Text
              style={{
                color: MUTED,
                fontWeight: "800",
                marginTop: 10,
              }}
            >
              Loading this week’s challenge…
            </Text>
          </StudioCard>
        ) : (
          <>
            <StudioCard style={{ marginBottom: 14 }}>
              <SectionHeader
                icon="compass-outline"
                tint="olive"
                title="1. Choose the spiritual focus"
                subtitle="Pick the discipleship lane this week’s challenge should serve."
              />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 8, paddingBottom: 4 }}
                style={{ marginRight: -15 }}
              >
                {DISCIPLINES.map((item) => (
                  <DisciplineCard
                    key={item.key}
                    item={item}
                    selected={discipline === item.key}
                    onPress={() => setDiscipline(item.key)}
                  />
                ))}
              </ScrollView>

              <View style={{ marginTop: 14 }}>
                <FieldLabel helper="Optional, but useful for Faith Coach and future analytics.">
                  Topic or theme
                </FieldLabel>

                <TextInput
                  value={topic}
                  onChangeText={setTopic}
                  placeholder="Example: Evangelism / Forgiveness / Prayer consistency"
                  placeholderTextColor="rgba(107, 114, 128, 0.68)"
                  style={inputStyle()}
                />
              </View>
            </StudioCard>

            <StudioCard style={{ marginBottom: 14 }}>
              <SectionHeader
                icon="color-wand-outline"
                tint="amber"
                title="2. Start with a smart draft"
                subtitle="Use Faith Coach or a quick-start ministry template, then edit it in your own church voice."
              />

              <PrimaryButton
                title={generating ? "Generating with Faith Coach..." : "Generate with Faith Coach"}
                subtitle="Creates title, description, scripture and action step."
                icon="sparkles-outline"
                tint="amber"
                loading={generating}
                disabled={saving}
                onPress={generateWithFaithCoach}
              />

              <Text
                style={{
                  color: TEXT,
                  fontSize: 13,
                  fontWeight: "900",
                  marginTop: 16,
                  marginBottom: 9,
                }}
              >
                Quick-start templates
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 8, paddingBottom: 4 }}
                style={{ marginRight: -15 }}
              >
                {QUICK_TEMPLATES.map((item) => (
                  <TemplateCard
                    key={item.key}
                    item={item}
                    onPress={() => applyTemplate(item)}
                  />
                ))}
              </ScrollView>
            </StudioCard>

            <StudioCard style={{ marginBottom: 14 }}>
              <SectionHeader
                icon="create-outline"
                tint="olive"
                title="3. Write the challenge"
                subtitle="Make it specific, warm, biblical and easy to complete."
              />

              <FieldLabel helper="Keep it direct and action-focused.">
                Challenge title
              </FieldLabel>

              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Example: Invite one person to church"
                placeholderTextColor="rgba(107, 114, 128, 0.68)"
                style={inputStyle({ marginBottom: 13 })}
              />

              <FieldLabel helper="Explain what members should actually do.">
                Challenge description
              </FieldLabel>

              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Explain the challenge in 2–4 sentences."
                placeholderTextColor="rgba(107, 114, 128, 0.68)"
                multiline
                style={inputStyle({
                  minHeight: 120,
                  textAlignVertical: "top",
                  marginBottom: 13,
                })}
              />

              <FieldLabel helper="This gives the challenge spiritual weight, not just activity.">
                Why it matters
              </FieldLabel>

              <TextInput
                value={whyItMatters}
                onChangeText={setWhyItMatters}
                placeholder="Explain why this matters spiritually."
                placeholderTextColor="rgba(107, 114, 128, 0.68)"
                multiline
                style={inputStyle({
                  minHeight: 120,
                  textAlignVertical: "top",
                })}
              />
            </StudioCard>

            <StudioCard style={{ marginBottom: 14 }}>
              <SectionHeader
                icon="book-outline"
                tint="amber"
                title="4. Add scripture and action"
                subtitle="Connect the challenge to Scripture and give members a simple response button."
              />

              <FieldLabel helper="Separate with commas or new lines. Maximum 6 references.">
                Scripture references
              </FieldLabel>

              <TextInput
                value={scriptureRefsInput}
                onChangeText={setScriptureRefsInput}
                placeholder="Matthew 28:19-20, Romans 10:14"
                placeholderTextColor="rgba(107, 114, 128, 0.68)"
                multiline
                style={inputStyle({
                  minHeight: 82,
                  textAlignVertical: "top",
                  marginBottom: 10,
                })}
              />

              <ScriptureChips refs={scriptureRefs} />

              <View style={{ flexDirection: "row", gap: 10, marginTop: 15 }}>
                <View style={{ flex: 1 }}>
                  <FieldLabel helper="Shown on the member action button.">
                    Action label
                  </FieldLabel>

                  <TextInput
                    value={actionLabel}
                    onChangeText={setActionLabel}
                    placeholder="Complete challenge"
                    placeholderTextColor="rgba(107, 114, 128, 0.68)"
                    style={inputStyle()}
                  />
                </View>

                <View style={{ width: 96 }}>
                  <FieldLabel helper="Optional">
                    LP bonus
                  </FieldLabel>

                  <TextInput
                    value={lpBonus}
                    onChangeText={setLpBonus}
                    placeholder="0"
                    placeholderTextColor="rgba(107, 114, 128, 0.68)"
                    keyboardType="numeric"
                    style={inputStyle()}
                  />
                </View>
              </View>

              <View style={{ marginTop: 14 }}>
                <FieldLabel helper="Optional. Use only when the challenge needs a link.">
                  Action URL
                </FieldLabel>

                <TextInput
                  value={actionUrl}
                  onChangeText={setActionUrl}
                  placeholder="https://example.com"
                  placeholderTextColor="rgba(107, 114, 128, 0.68)"
                  autoCapitalize="none"
                  style={inputStyle()}
                />
              </View>
            </StudioCard>

            <StudioCard style={{ marginBottom: 14 }}>
              <SectionHeader
                icon="phone-portrait-outline"
                tint="amber"
                title="5. Member preview"
                subtitle="This is the style and structure members should experience on the Daily screen."
              />

              <MemberPreviewCard
                disciplineLabel={selectedDiscipline.label}
                title={title}
                description={description}
                whyItMatters={whyItMatters}
                refs={scriptureRefs}
                actionLabel={actionLabel}
                lpBonus={lpBonus}
              />
            </StudioCard>

            <StudioCard style={{ marginBottom: 14 }}>
              <SectionHeader
                icon="shield-checkmark-outline"
                tint={readyToPublish ? "olive" : "danger"}
                title="Publication checklist"
                subtitle="A quick confidence check before this goes live to members."
                right={
                  <View
                    style={{
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      backgroundColor: readyToPublish ? OLIVE_SOFT : DANGER_SOFT,
                      borderWidth: 1,
                      borderColor: readyToPublish ? OLIVE_BORDER : DANGER_BORDER,
                    }}
                  >
                    <Text
                      style={{
                        color: readyToPublish ? OLIVE : DANGER,
                        fontSize: 11,
                        fontWeight: "900",
                      }}
                    >
                      {readyToPublish ? "READY" : "NEEDS REVIEW"}
                    </Text>
                  </View>
                }
              />

              {quality.map((item) => (
                <ChecklistRow
                  key={item.key}
                  done={item.done}
                  label={item.label}
                  helper={item.helper}
                />
              ))}
            </StudioCard>

            <StudioCard>
              <SectionHeader
                icon="rocket-outline"
                tint="amber"
                title="Publish control"
                subtitle={
                  status === "published"
                    ? "This challenge is currently live. Saving draft will keep a draft version; Update Live changes what members see."
                    : "Save safely as a draft, or publish when the challenge is ready."
                }
                right={<StatusPill status={status} />}
              />

              <View style={{ gap: 10 }}>
                <PrimaryButton
                  title={saving ? "Saving draft..." : "Save draft"}
                  subtitle="Keep editing without making it visible to members."
                  icon="save-outline"
                  tint="olive"
                  loading={saving}
                  disabled={generating}
                  onPress={() => saveWithStatus("draft")}
                />

                <PrimaryButton
                  title={
                    saving
                      ? "Publishing..."
                      : status === "published"
                        ? "Update Live"
                        : "Publish"
                  }
                  subtitle="Make this challenge visible on Daily for this week."
                  icon="cloud-upload-outline"
                  tint="amber"
                  loading={saving}
                  disabled={generating}
                  onPress={confirmPublish}
                />

                <Pressable
                  onPress={() => navigation.goBack()}
                  disabled={saving || generating}
                  style={({ pressed }) => ({
                    borderRadius: 20,
                    paddingVertical: 13,
                    paddingHorizontal: 14,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                    backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
                    opacity: saving || generating ? 0.55 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 13,
                      fontWeight: "900",
                    }}
                  >
                    Back to Ministry Tools
                  </Text>
                </Pressable>
              </View>
            </StudioCard>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}