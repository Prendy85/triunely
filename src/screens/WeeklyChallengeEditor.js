import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";

// Monday-start week bounds (Mon–Sun) in local time, returned as YYYY-MM-DD strings
function getCurrentWeekBoundsISO() {
  const now = new Date();
  const day = now.getDay(); // 0 Sun .. 6 Sat
  const diffToMonday = (day + 6) % 7; // Mon=0, Tue=1 ... Sun=6

  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const toISODate = (d) => d.toISOString().slice(0, 10);
  return { week_start: toISODate(monday), week_end: toISODate(sunday) };
}

const DISCIPLINES = [
  { key: "scripture", label: "Scripture" },
  { key: "prayer", label: "Prayer" },
  { key: "obedience", label: "Obedience" },
  { key: "service", label: "Service" },
  { key: "renunciation", label: "Renunciation" },
];

function parseRefs(input) {
  const raw = String(input || "")
    .split(/[\n,]+/g)
    .map((s) => s.trim())
    .filter(Boolean);

  // de-dupe (case-insensitive) but preserve order
  const seen = new Set();
  const out = [];
  for (const r of raw) {
    const k = r.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }

  // keep it tidy (chips UI)
  return out.slice(0, 6);
}

function refsToString(refs) {
  if (!Array.isArray(refs) || refs.length === 0) return "";
  return refs.join(", ");
}

export default function WeeklyChallengeEditor({ route, navigation }) {
  const churchId = route?.params?.churchId;
  const churchName = route?.params?.churchName || "Church";

  const { week_start } = useMemo(() => getCurrentWeekBoundsISO(), []);
  const weekLabel = useMemo(() => {
    const fmt = (d) =>
      d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
    const monday = new Date(`${week_start}T00:00:00`);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return `${fmt(monday)} – ${fmt(sunday)}`;
  }, [week_start]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // record identity
  const [rowId, setRowId] = useState(null);
  const [status, setStatus] = useState("draft"); // draft | published

  // discipline + topic
  const [discipline, setDiscipline] = useState("scripture");
  const [topic, setTopic] = useState("");

  // form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [whyItMatters, setWhyItMatters] = useState("");
  const [scriptureRefsInput, setScriptureRefsInput] = useState("");

  const [actionLabel, setActionLabel] = useState("Open link");
  const [actionUrl, setActionUrl] = useState("");
  const [lpBonus, setLpBonus] = useState("0");

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

          setActionLabel(data.action_label || "Open link");
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

          setActionLabel("Open link");
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

  const normalizeLp = () => {
    const n = Number(lpBonus);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.floor(n);
  };

  const validate = () => {
    if (!String(title || "").trim()) {
      Alert.alert("Weekly Challenge", "Please add a title.");
      return false;
    }

    const url = String(actionUrl || "").trim();
    if (url && !(url.startsWith("http://") || url.startsWith("https://"))) {
      Alert.alert("Weekly Challenge", "Action URL must start with http:// or https://");
      return false;
    }

    return true;
  };

  const saveWithStatus = async (nextStatus) => {
    if (!validate()) return;

    try {
      setSaving(true);

      const scriptureRefs = parseRefs(scriptureRefsInput);

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
        "Saved",
        nextStatus === "published"
          ? "Challenge published. It will show in the app for this week."
          : "Draft saved."
      );
    } finally {
      setSaving(false);
    }
  };

  // Faith Coach generator (uses existing "faith-coach" edge function)
  const generateWithFaithCoach = async () => {
    try {
      setGenerating(true);

      const { data, error } = await supabase.functions.invoke("faith-coach", {
        body: {
          action: "generate_weekly_challenge",
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
      if (data.description !== undefined) setDescription(String(data.description || ""));
      if (data.why_it_matters !== undefined) setWhyItMatters(String(data.why_it_matters || ""));
      if (Array.isArray(data.scripture_refs)) setScriptureRefsInput(refsToString(data.scripture_refs));

      if (data.action_label !== undefined) setActionLabel(String(data.action_label || "Open link"));
      if (data.action_url !== undefined) setActionUrl(String(data.action_url || ""));
      if (data.lp_bonus !== undefined && data.lp_bonus !== null) setLpBonus(String(data.lp_bonus));

      Alert.alert("Faith Coach", "Draft generated. Review, edit, then Save/Publish.");
    } catch (e) {
      console.log("generateWithFaithCoach unexpected:", e);
      Alert.alert("Faith Coach", "Unexpected error generating draft.");
    } finally {
      setGenerating(false);
    }
  };

  const Chip = ({ active, label, onPress }) => (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? "rgba(0,0,0,0.22)" : "rgba(0,0,0,0.10)",
        backgroundColor: active ? "rgba(255, 213, 74, 0.35)" : "transparent",
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Text style={{ fontWeight: "800", opacity: active ? 1 : 0.8 }}>{label}</Text>
    </Pressable>
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
        <Text style={{ fontSize: 22, fontWeight: "800" }}>Weekly Challenge</Text>
        <Text style={{ marginTop: 6, opacity: 0.75 }}>
          {churchName} • {weekLabel}
        </Text>

        {loading ? (
          <View style={{ marginTop: 18 }}>
            <ActivityIndicator />
          </View>
        ) : (
          <>
            <View
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "rgba(0,0,0,0.10)",
              }}
            >
              <Text style={{ fontWeight: "800" }}>Status</Text>
              <Text style={{ marginTop: 6, opacity: 0.8 }}>Current: {status || "draft"}</Text>
              <Text style={{ marginTop: 6, opacity: 0.65 }}>
                Draft is only visible to admins. Published shows on the Daily screen for members of this church.
              </Text>
            </View>

            <Text style={{ marginTop: 16, fontWeight: "800" }}>Discipline</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10 }}>
              {DISCIPLINES.map((d) => (
                <Chip
                  key={d.key}
                  label={d.label}
                  active={discipline === d.key}
                  onPress={() => setDiscipline(d.key)}
                />
              ))}
            </View>

            <Text style={{ marginTop: 8, fontWeight: "800" }}>Topic (optional)</Text>
            <TextInput
              value={topic}
              onChangeText={setTopic}
              placeholder="Example: Evangelism / Forgiveness / Prayer consistency"
              style={{
                marginTop: 8,
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "rgba(0,0,0,0.12)",
              }}
            />

            <Pressable
              disabled={generating}
              onPress={generateWithFaithCoach}
              style={{
                marginTop: 12,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "rgba(0,0,0,0.14)",
                opacity: generating ? 0.6 : 1,
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "900" }}>
                {generating ? "Generating..." : "Generate draft with Faith Coach"}
              </Text>
            </Pressable>

            <Text style={{ marginTop: 16, fontWeight: "800" }}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Example: Invite one person to church"
              style={{
                marginTop: 8,
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "rgba(0,0,0,0.12)",
              }}
            />

            <Text style={{ marginTop: 16, fontWeight: "800" }}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Explain the challenge in 2–4 sentences."
              multiline
              style={{
                marginTop: 8,
                padding: 12,
                minHeight: 110,
                textAlignVertical: "top",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "rgba(0,0,0,0.12)",
              }}
            />

            <Text style={{ marginTop: 16, fontWeight: "800" }}>Why it matters</Text>
            <TextInput
              value={whyItMatters}
              onChangeText={setWhyItMatters}
              placeholder="Explain why this matters spiritually (2–5 sentences)."
              multiline
              style={{
                marginTop: 8,
                padding: 12,
                minHeight: 110,
                textAlignVertical: "top",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "rgba(0,0,0,0.12)",
              }}
            />

            <Text style={{ marginTop: 16, fontWeight: "800" }}>Scripture refs (optional)</Text>
            <Text style={{ marginTop: 6, opacity: 0.7 }}>
              Separate with commas or new lines. Example: Matthew 28:19-20, Romans 10:14
            </Text>
            <TextInput
              value={scriptureRefsInput}
              onChangeText={setScriptureRefsInput}
              placeholder="Matthew 28:19-20, Romans 10:14"
              multiline
              style={{
                marginTop: 8,
                padding: 12,
                minHeight: 80,
                textAlignVertical: "top",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "rgba(0,0,0,0.12)",
              }}
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "800" }}>LP Bonus</Text>
                <TextInput
                  value={lpBonus}
                  onChangeText={setLpBonus}
                  placeholder="0"
                  keyboardType="numeric"
                  style={{
                    marginTop: 8,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "rgba(0,0,0,0.12)",
                  }}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "800" }}>Action label</Text>
                <TextInput
                  value={actionLabel}
                  onChangeText={setActionLabel}
                  placeholder="Open link"
                  style={{
                    marginTop: 8,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "rgba(0,0,0,0.12)",
                  }}
                />
              </View>
            </View>

            <Text style={{ marginTop: 16, fontWeight: "800" }}>Action URL (optional)</Text>
            <TextInput
              value={actionUrl}
              onChangeText={setActionUrl}
              placeholder="https://example.com"
              autoCapitalize="none"
              style={{
                marginTop: 8,
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "rgba(0,0,0,0.12)",
              }}
            />

            <View style={{ marginTop: 18, gap: 10 }}>
              <Pressable
                disabled={saving}
                onPress={() => saveWithStatus("draft")}
                style={{
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "rgba(0,0,0,0.14)",
                  opacity: saving ? 0.6 : 1,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "800" }}>
                  {saving ? "Saving..." : "Save draft"}
                </Text>
              </Pressable>

              <Pressable
                disabled={saving}
                onPress={() => saveWithStatus("published")}
                style={{
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: "#FFD54A",
                  opacity: saving ? 0.6 : 1,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "900" }}>
                  {saving ? "Publishing..." : "Publish"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => navigation.goBack()}
                style={{
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "rgba(0,0,0,0.10)",
                  alignItems: "center",
                  opacity: 0.75,
                }}
              >
                <Text style={{ fontWeight: "800" }}>Back</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
