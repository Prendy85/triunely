// src/screens/Daily.js
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import Screen from "../components/Screen";
import ScriptureReaderModal from "../components/ScriptureReaderModal";
import { usePoints } from "../context/PointsContext";
import {
  loadApologeticsV2Board,
  startBossAttemptV2,
  upsertApologeticsAttemptV2,
} from "../lib/apologeticsV2";

import { gradeDrillWithFaithCoach } from "../lib/faithCoachGradeDrill";
import { fetchFaithCoachByVerseId } from "../lib/formationDaily";
import {
  completeMissionV2,
  loadDailyV2Board,
  upsertDailyShareV2,
} from "../lib/formationDailyV2";
import { supabase } from "../lib/supabase";

// ✅ Theme (match Prayer.js)
import GlowButton from "../components/GlowButton";
import GlowCard from "../components/GlowCard";
import WeeklyChallengeSpotlight from "../components/WeeklyChallengeSpotlight";
import WeeklyMessageCard from "../components/WeeklyMessageCard";
import { HOME_COMMUNITY_ID } from "../lib/constants";
import { theme } from "../theme/theme";



// --- Visual rules requested ---
// Incomplete = thick SILVER outline
// Complete   = thick GOLD outline
const SILVER = "#C9CED8";
const SILVER_DIM = "rgba(201,206,216,0.55)";
const SILVER_HALO = "rgba(201,206,216,0.12)";

// ✅ Neutral UI structure tokens (to avoid “gold everywhere”)
const NEUTRAL_BORDER = "rgba(0,0,0,0.08)";
const NEUTRAL_SHADOW = "rgba(0,0,0,0.18)";
const PARCHMENT = "rgba(250, 247, 239, 1)"; // warm, calm section band
const SAGE_BAND = "rgba(125, 160, 120, 0.10)"; // soft sage tint
const SECTION_GAP = 18;

const DISCIPLINE_META = {
  scripture: { label: "Scripture", icon: "📖", blurb: "Truth that resets your mind." },
  prayer: { label: "Prayer", icon: "🙏", blurb: "Connection, not performance." },
  obedience: { label: "Obedience", icon: "✅", blurb: "Faith with feet." },
  service: { label: "Service", icon: "🤝", blurb: "Love made visible." },
  renunciation: { label: "Renunciation", icon: "🛡️", blurb: "Freedom over impulse." },
};

const DISCIPLINES = ["scripture", "prayer", "obedience", "service", "renunciation"];

// Streak bonus tuning
const STREAK_BONUS_CAP = 5;
const streakBonus = (streak) => Math.min(Number(streak || 0), STREAK_BONUS_CAP);

function groupMissions(missions) {
  const grouped = {};
  for (const d of DISCIPLINES) grouped[d] = [];
  for (const m of missions || []) {
    if (!grouped[m.discipline]) grouped[m.discipline] = [];
    grouped[m.discipline].push(m);
  }
  for (const d of Object.keys(grouped)) {
    grouped[d].sort((a, b) => (a.slot || 0) - (b.slot || 0));
  }
  return grouped;
}

function mod(n, m) {
  return ((n % m) + m) % m;
}

function safeNum(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function buildSuggestedAnswer(drill) {
  const points = Array.isArray(drill?.key_points) ? drill.key_points.filter(Boolean) : [];
  const refs = Array.isArray(drill?.scripture_refs) ? drill.scripture_refs.filter(Boolean) : [];

  const lines = [];
  lines.push("Suggested response (calm + clear):");
  lines.push("");
  lines.push("1) Acknowledge the question respectfully, then answer with clarity and confidence.");
  lines.push("");

  if (points.length) {
    lines.push("2) Key points to include:");
    for (const p of points) lines.push(`• ${p}`);
    lines.push("");
  } else {
    lines.push("2) Key points to include:");
    lines.push("• (No key points seeded yet for this drill.)");
    lines.push("");
  }

  if (refs.length) {
    lines.push("3) Scripture anchors:");
    lines.push(refs.map((r) => r).join(" • "));
  } else {
    lines.push("3) Scripture anchors:");
    lines.push("(No scripture refs seeded yet for this drill.)");
  }

  return lines.join("\n");
}

function buildStudyPack(drill) {
  const opponent = String(drill?.opponent_type || "").toLowerCase();

  const muslimSourcePack = [
    {
      lane: "Sources",
      title: "Qur’an: Allah’s words cannot be changed",
      proof:
        "Use the Qur’an’s own claim of preservation as an internal premise: if Allah’s words cannot be altered, then broad claims that earlier revelation is totally corrupted become logically unstable unless the Qur’an explicitly teaches that.",
      howToUse:
        "Ask: ‘Do you believe Allah’s words can be changed?’ If not, then ask how that squares with the Qur’an acknowledging earlier revelation while denying its reliability.",
      muslimAngle:
        "Keep it respectful: you’re using the Muslim’s own authority as a premise, not mocking it. Invite consistency.",
      refs: ["Qur’an 6:115", "Qur’an 18:27", "Qur’an 10:64"],
    },
    {
      lane: "Sources",
      title: "Qur’an: Torah and Gospel given as guidance/light",
      proof:
        "The Qur’an speaks of the Torah and the Gospel in affirming terms (guidance/light). That creates tension with the claim ‘the Bible was changed beyond recognition’—especially if the Qur’an still appeals to those revelations.",
      howToUse:
        "Say: ‘Your book calls the Torah and Gospel guidance/light. So the question becomes: what exactly was changed, and where is the evidence?’",
      muslimAngle:
        "If they respond ‘your Bible today isn’t the Injil,’ ask for a definition of Injil and historical evidence for an alternative text.",
      refs: ["Qur’an 5:44–47", "Qur’an 5:68", "Qur’an 3:3"],
    },
  ];

  const genericSourcePack = [
    {
      lane: "Sources",
      title: "Manuscripts: we can detect changes because we have so many",
      proof:
        "Textual variants are expected when copying by hand, but the volume and spread of manuscripts means variants are visible, catalogued, and evaluated. The existence of variants is not the same as losing the original message.",
      howToUse:
        "Say: ‘We can’t hide changes—we can see them. The question is whether any variant changes core doctrine.’",
      muslimAngle:
        "For Muslim opponents, don’t assume they accept your premise—use it as a historical method claim, not ‘because the Bible says so.’",
      refs: ["Look up: ‘textual variants vs doctrine’", "Look up: ‘critical editions NT’"],
    },
    {
      lane: "Sources",
      title: "Translation is not corruption (meaning preserved across languages)",
      proof:
        "All translation involves choices, but responsible translation aims to preserve meaning. Differences between translations are typically about style/clarity, not a rewritten theology.",
      howToUse:
        "Say: ‘Show me a doctrine that appears in one translation family but disappears in another. Most differences are wording, not worldview.’",
      muslimAngle:
        "If Muslim: point out Qur’an translations exist too; translation isn’t automatically ‘corruption.’",
      refs: ["Look up: ‘formal vs dynamic equivalence’", "Look up: ‘manuscript families’"],
    },
  ];

  const argumentMoves = [
    {
      lane: "Moves",
      title: "Define the claim: ‘changed’ how?",
      proof:
        "Force clarity: are they claiming (a) copying variants, (b) translation differences, or (c) intentional doctrinal rewrite? Each requires different evidence.",
      howToUse:
        "Ask: ‘Do you mean copying errors, translation differences, or deliberate rewriting? Which manuscripts and what changes?’",
      muslimAngle:
        "With Muslims: keep it non-combative; you’re asking for precision, not cornering them.",
      refs: [],
    },
    {
      lane: "Moves",
      title: "Burden of proof: which verse, which manuscript, which century?",
      proof:
        "A global claim needs specific evidence. ‘It’s changed’ is too vague to be meaningful. Ask for a testable example.",
      howToUse:
        "Say: ‘Pick one passage. Show earliest witnesses, and show the doctrinal change.’",
      muslimAngle:
        "This keeps the conversation honest and prevents vague internet claims from driving the debate.",
      refs: [],
    },
    {
      lane: "Moves",
      title: "Variants ≠ doctrine: ask what core belief was lost",
      proof:
        "Most textual variants are minor. Even where variants are meaningful, core doctrines are not built on a single disputed line.",
      howToUse:
        "Say: ‘Which doctrine collapses if we remove the disputed variant? Let’s test it.’",
      muslimAngle:
        "If Muslim: you can also ask how their own textual history is handled without implying disrespect.",
      refs: [],
    },
  ];

  const evidenceCards = [
    {
      lane: "Evidence",
      title: "Textual criticism 101 (why variants don’t equal corruption)",
      proof:
        "Textual criticism exists precisely because we have lots of witnesses. It’s a method, not a faith claim.",
      howToUse: "Use one sentence: ‘We can see the variants—so we can evaluate them.’",
      muslimAngle: "Frame as history/methodology, not ‘because Christians say so.’",
      refs: ["Topic: ‘critical apparatus’", "Topic: ‘earliest NT manuscripts’"],
    },
    {
      lane: "Evidence",
      title: "Early Christian quotations (what did the early church cite?)",
      proof:
        "Early Christian writers quote Scripture extensively. Their citations can be compared to later manuscripts to test stability.",
      howToUse: "Say: ‘We can compare quotations across centuries—stability is measurable.’",
      muslimAngle: "For Muslim: treat as historical evidence, not ‘church authority.’",
      refs: ["Topic: ‘patristic citations NT’"],
    },
  ];

  const sources = opponent === "muslim" ? muslimSourcePack : genericSourcePack;

  return {
    sources,
    moves: argumentMoves,
    evidence: evidenceCards,
  };
}

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


export default function Daily({ navigation }) {
  // ✅ Show monthly LP total if your PointsContext provides it; otherwise fall back to total.
  const points = usePoints();
  const total = points?.total ?? 0;
  const streak = points?.streak ?? 0;
  const monthTotal = points?.monthTotal;
  const monthLP = Number.isFinite(Number(monthTotal)) ? Number(monthTotal) : Number(total || 0);

  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState(null);

  const [weeklyMsgLoading, setWeeklyMsgLoading] = useState(false);
const [weeklyMsg, setWeeklyMsg] = useState(null);
const [weeklyChallengeLoading, setWeeklyChallengeLoading] = useState(false);
const [weeklyChallenge, setWeeklyChallenge] = useState(null);


  // DEV day switcher
  const [dayOverride, setDayOverride] = useState(null);

  // Mission details expansion state
  const [openMissionId, setOpenMissionId] = useState(null);

  // Scripture reader modal
  const [scriptureOpen, setScriptureOpen] = useState(false);
  const [scriptureRef, setScriptureRef] = useState("");

  // Faith Coach modal (verse coach)
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachData, setCoachData] = useState(null);

  // Completion modal
  const [victoryOpen, setVictoryOpen] = useState(false);
  const [victoryMission, setVictoryMission] = useState(null);
  const [victoryUnseen, setVictoryUnseen] = useState(false);
  const [victoryNote, setVictoryNote] = useState("");
  const [savingComplete, setSavingComplete] = useState(false);

  // Share modal
  const [shareOpen, setShareOpen] = useState(false);
  const [shareText, setShareText] = useState("");
  const [shareSaving, setShareSaving] = useState(false);
  const [shareVisibility, setShareVisibility] = useState("public");

   // Weekly Challenge → Commitment → Share (Step D1)
  const [commitmentModalOpen, setCommitmentModalOpen] = useState(false);
  const [weeklyCommitmentText, setWeeklyCommitmentText] = useState("");
  const [weeklyCommitmentSaved, setWeeklyCommitmentSaved] = useState(false);
  const [commitmentSharing, setCommitmentSharing] = useState(false);
  const [commitmentWeekStart, setCommitmentWeekStart] = useState(null);
  const [commitmentSaving, setCommitmentSaving] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);

  const weeklyShareEnabled =
    weeklyCommitmentSaved && weeklyCommitmentText.trim().length > 0;

  const onChangeWeeklyCommitmentText = (next) => {
    setWeeklyCommitmentText(next);

    // Editing after saving disables Share again until "Start Challenge" is pressed.
    if (weeklyCommitmentSaved) setWeeklyCommitmentSaved(false);
  };

  // ---- Carousel sizing based on REAL container width (works with Screen padding) ----
  const [carouselW, setCarouselW] = useState(null);

  // Centre card fully visible + neighbours peek
  const CARD_FRACTION = 0.82;
  const GAP = 14;

  const viewportW = carouselW || 360;
  const CARD_WIDTH = Math.floor(viewportW * CARD_FRACTION);
  const SIDE_SPACING = Math.floor((viewportW - CARD_WIDTH) / 2);

  const ITEM_SIZE = CARD_WIDTH + GAP;

  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);
const [formationY, setFormationY] = useState(0);

  const listRef = useRef(null);

  const N = DISCIPLINES.length;
  const LOOP_SETS = 9;

  const loopData = useMemo(() => {
    const out = [];
    for (let i = 0; i < LOOP_SETS; i++) out.push(...DISCIPLINES);
    return out;
  }, []);

  const START_INDEX = useMemo(() => Math.floor(LOOP_SETS / 2) * N, [N]);

  const shareWeeklyChallengeToHomeFeed = async (challenge, commitmentRaw) => {
    try {
      setCommitmentSharing(true);

      // 1) Must be logged in
      const { data: auth, error: authErr } = await supabase.auth.getUser();
      const user = auth?.user;

      if (authErr || !user) {
        Alert.alert("Share", "You must be logged in.");
        return;
      }

      // 2) Must have a challenge
      if (!challenge) {
        Alert.alert("Share", "No weekly challenge found to share.");
        return;
      }

      // 3) Must have a commitment
      const commitment = String(commitmentRaw || "").trim();
      if (!commitment) {
        Alert.alert("Share", "Please write your commitment first.");
        return;
      }

      // 4) Build the post content
      const disciplineLabel = challenge?.discipline
        ? String(challenge.discipline).replace(/^\w/, (c) => c.toUpperCase())
        : "Weekly Challenge";

      const title = String(challenge.title || "Weekly Challenge").trim();

      const content =
        `Weekly Challenge — ${disciplineLabel}\n` +
        `${title}\n\n` +
        `My commitment: ${commitment}\n\n` +
        `Pray for me and keep me accountable.`;

      // 5) Insert into posts (Global/Home feed)
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        community_id: HOME_COMMUNITY_ID,

visibility: "communities",

        is_anonymous: false,
        content,
        url: challenge?.action_url ? String(challenge.action_url).trim() : null,
      });

      if (error) {
        console.log("Share weekly challenge -> posts error:", error);
        Alert.alert("Share", error.message || "Could not share.");
        return;
      }

      Alert.alert("Shared", "Posted to Home feed.");
    } catch (e) {
      console.log("Share weekly challenge unexpected error:", e);
      Alert.alert("Share", "Could not share right now.");
    } finally {
      setCommitmentSharing(false);
    }
  };

 const handleStartWeeklyChallenge = async () => {
  const trimmed = weeklyCommitmentText.trim();

  if (!trimmed) {
    Alert.alert("Write your commitment", "Please add a commitment to continue.");
    return;
  }

  const churchId = weeklyChallenge?.church_id || null;
  const wk = weeklyChallenge?.week_start || null;
  const chId = weeklyChallenge?.id || null;

  if (!churchId || !wk || !chId) {
    Alert.alert("Weekly Challenge", "Weekly challenge data is missing. Try again.");
    return;
  }

  const res = await saveWeeklyCommitment({
    church_id: churchId,
    week_start: wk,
    challenge_id: chId,
    commitment_text: trimmed,
  });

  if (!res.ok) {
    Alert.alert("Couldn’t save", res.error || "Try again.");
    return;
  }

  setWeeklyCommitmentSaved(true);
  setCommitmentWeekStart(wk);
  setCommitmentModalOpen(false);

  Alert.alert(
    "Share to Home feed?",
    "Would you like to share this to your Home feed for encouragement?",
    [
      { text: "Not now", style: "cancel" },
      {
        text: "Yes, share",
        onPress: () => shareWeeklyChallengeToHomeFeed(weeklyChallenge, trimmed),
      },
    ]
  );
};


  const handleShareWeeklyChallenge = () => {
    // Spec: if not saved, open the commitment modal
    if (!weeklyCommitmentSaved || weeklyCommitmentText.trim().length === 0) {
      setCommitmentModalOpen(true);
      return;
    }

    shareWeeklyChallengeToHomeFeed(weeklyChallenge, weeklyCommitmentText.trim());
  };


  // Active/pressed state for “front card” feel
  // activeIndex updates DURING scroll (so "Active" label can update promptly)
  // settledIndex updates onMomentumEnd (so pulse doesn't fire every frame)
  const [activeIndex, setActiveIndex] = useState(START_INDEX);
  const [settledIndex, setSettledIndex] = useState(START_INDEX);
  const activeIndexRef = useRef(START_INDEX);

  const [pressedIndex, setPressedIndex] = useState(null);

  // Pulse glow when a card becomes settled (snapped)
  const glowPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    // quick pulse each time the centred card settles
    glowPulse.stopAnimation?.();
    glowPulse.setValue(0);
    Animated.sequence([
      Animated.timing(glowPulse, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(glowPulse, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start();
  }, [settledIndex, glowPulse]);

  useEffect(() => {
    if (!carouselW) return;
    requestAnimationFrame(() => {
      try {
        listRef.current?.scrollToOffset({ offset: START_INDEX * ITEM_SIZE, animated: false });
        setActiveIndex(START_INDEX);
        setSettledIndex(START_INDEX);
        activeIndexRef.current = START_INDEX;
      } catch (e) {}
    });
  }, [carouselW, START_INDEX, ITEM_SIZE]);

  const onMomentumScrollEnd = (e) => {
    const x = e?.nativeEvent?.contentOffset?.x ?? 0;
    const rawIndex = Math.round(x / ITEM_SIZE);

    setActiveIndex(rawIndex);
    setSettledIndex(rawIndex);
    activeIndexRef.current = rawIndex;

    const BUFFER_SETS = 2;
    const minIndex = N * BUFFER_SETS;
    const maxIndex = loopData.length - N * BUFFER_SETS - 1;

    if (rawIndex < minIndex || rawIndex > maxIndex) {
      const idxInSet = mod(rawIndex, N);
      const target = START_INDEX + idxInSet;
      requestAnimationFrame(() => {
        try {
          listRef.current?.scrollToOffset({ offset: target * ITEM_SIZE, animated: false });
          setActiveIndex(target);
          setSettledIndex(target);
          activeIndexRef.current = target;
        } catch (err) {}
      });
    }
  };
  // -------------------------------------------------------------------------------
// --- Triunely "brand + progress" header (logo + animated streak + light points) ---
const pointsCtx = (() => {
  try {
    return typeof usePoints === "function" ? usePoints() : {};
  } catch {
    return {};
  }
})();

const scrollToFormation = useCallback(() => {
  const y = Math.max((formationY || 0) - 12, 0); // small offset so the title isn't flush to the top
  scrollRef.current?.scrollTo({ y, animated: true });
}, [formationY]);


// These are defensive so it won't crash if your context uses different names
const lightPointsValue =
  pointsCtx?.lightPoints ??
  pointsCtx?.points ??
  pointsCtx?.totalPoints ??
  0;

const streakValue =
  pointsCtx?.streakDays ??
  pointsCtx?.streak ??
  pointsCtx?.currentStreak ??
  0;

// Subtle pulse animation for the streak badge
const streakPulse = useState(() => new Animated.Value(0))[0];

useEffect(() => {
  const loop = Animated.loop(
    Animated.sequence([
      Animated.timing(streakPulse, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(streakPulse, {
        toValue: 0,
        duration: 900,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ])
  );

  loop.start();
  return () => loop.stop();
}, [streakPulse]);

const streakScale = streakPulse.interpolate({
  inputRange: [0, 1],
  outputRange: [1, 1.08],
});

const streakGlowOpacity = streakPulse.interpolate({
  inputRange: [0, 1],
  outputRange: [0.18, 0.38],
});

function TriunelyDailyHeader() {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
      {/* Brand row */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Image
          source={require("../assets/brand/triunely-logo.png")}
          style={{ width: 42, height: 42, marginRight: 10 }}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }}>
          <Text style={[theme?.text?.h1, { color: theme?.colors?.text }]} numberOfLines={1}>
            Triunely
          </Text>
          <Text style={{ color: theme?.colors?.muted, fontWeight: "700", marginTop: 2 }}>
            Your daily formation
          </Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        {/* Streak */}
        <View
          style={{
            flex: 1,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: theme?.colors?.divider,
            backgroundColor: theme?.colors?.surface,
            overflow: "hidden",
            padding: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: theme?.colors?.muted, fontWeight: "900" }}>Streak</Text>

            <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
              <Animated.View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: theme?.colors?.gold || "rgba(255,215,0,0.35)",
                  opacity: streakGlowOpacity,
                  transform: [{ scale: streakScale }],
                }}
              />
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: theme?.colors?.goldHalo || "rgba(255,215,0,0.16)",
                  borderWidth: 1,
                  borderColor: theme?.colors?.goldOutline || "rgba(255,215,0,0.35)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: theme?.colors?.text, fontWeight: "900" }}>
                  {Number(streakValue) || 0}
                </Text>
              </View>
            </View>
          </View>

          <Text style={{ color: theme?.colors?.text2, marginTop: 6, fontWeight: "800" }}>
            Keep it going today
          </Text>
        </View>

        {/* Light Points */}
        <View
          style={{
            flex: 1,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: theme?.colors?.divider,
            backgroundColor: theme?.colors?.surface,
            padding: 12,
          }}
        >
          <Text style={{ color: theme?.colors?.muted, fontWeight: "900" }}>Light Points</Text>
          <Text style={{ color: theme?.colors?.text, fontWeight: "900", fontSize: 28, marginTop: 6 }}>
            {Number(lightPointsValue) || 0}
          </Text>
          <Text style={{ color: theme?.colors?.text2, marginTop: 2, fontWeight: "800" }}>
            Earned so far
          </Text>
        </View>
      </View>
    </View>
  );
}

  const missionsByDiscipline = useMemo(() => groupMissions(board?.missions || []), [board]);

  const completedByDiscipline = board?.completedByDiscipline || {};
  const completedCount = useMemo(() => {
    let n = 0;
    for (const d of DISCIPLINES) if (completedByDiscipline?.[d]) n += 1;
    return n;
  }, [completedByDiscipline]);

  const basePointsToday = useMemo(() => {
    const completedMissionIds = new Set((board?.completions || []).map((c) => c.mission_id));
    let sum = 0;
    for (const m of board?.missions || []) {
      if (completedMissionIds.has(m.id)) sum += Number(m.reward_points || 0);
    }
    return sum;
  }, [board]);

  const streakBonusPerMission = useMemo(() => streakBonus(streak), [streak]);

  const streakBonusToday = useMemo(() => {
    const n = Number(completedCount || 0);
    return n * streakBonusPerMission;
  }, [completedCount, streakBonusPerMission]);

  const earnedPointsToday = useMemo(
    () => basePointsToday + streakBonusToday,
    [basePointsToday, streakBonusToday]
  );

  // ---------------- Apologetics state ----------------
  const [apoLoading, setApoLoading] = useState(false);
  const [apo, setApo] = useState(null);

  // Drill modal (kept for future; current UI navigates to ApologeticsArena)
  const [drillOpen, setDrillOpen] = useState(false);
  const [selectedDrillId, setSelectedDrillId] = useState(null);

  const [drillCoachOpen, setDrillCoachOpen] = useState(false);
  const [drillAnswerOpen, setDrillAnswerOpen] = useState(false);
  const [drillUsedCoach, setDrillUsedCoach] = useState(false);

  // typed rebuttal
  const [drillText, setDrillText] = useState("");
  const [drillGrading, setDrillGrading] = useState(false);

  // Practice checklist (tap through key points)
  const [drillChecked, setDrillChecked] = useState({}); // { [idx]: true }

  const [drillSaving, setDrillSaving] = useState(false);

  // Arena v2 step flow
  const [drillStep, setDrillStep] = useState(1); // 1..4
  // Step 1: objection typewriter + "Why it matters"
  const [typedObjection, setTypedObjection] = useState("");
  const [isTypingObjection, setIsTypingObjection] = useState(false);
  const [showWhyItMatters, setShowWhyItMatters] = useState(false);
  const objectionTimerRef = useRef(null);

  const [studyOpenedCount, setStudyOpenedCount] = useState(0);
  const [studyBriefOpenedCount, setStudyBriefOpenedCount] = useState(0);

  // Step 2: Study engagement (for gating)
  const [studyCueChecked, setStudyCueChecked] = useState({}); // { [idx]: true }
  const [evidenceTapped, setEvidenceTapped] = useState({}); // { [idx]: true }

  // Study Brief modal (Step 2)
  const [studyBriefOpen, setStudyBriefOpen] = useState(false);
  const [studyBriefItem, setStudyBriefItem] = useState(null);

  // Step 2: study progress + selections
  const [studyRead, setStudyRead] = useState({});
  const [studySelected, setStudySelected] = useState({
    Sources: null,
    Moves: null,
    Evidence: null,
  });

  const [drillVictoryOpen, setDrillVictoryOpen] = useState(false);
  const [drillVictoryData, setDrillVictoryData] = useState(null);

  // Boss modal
  const [bossOpen, setBossOpen] = useState(false);
  const [bossSaving, setBossSaving] = useState(false);
  // ---------------------------------------------------

  const reload = async (opts = {}) => {
    setLoading(true);

    const dayNumberOverride = opts.dayNumberOverride ?? dayOverride ?? undefined;

    const res = await loadDailyV2Board({ dayNumberOverride });
    setBoard(res);

    setLoading(false);

    // Apologetics loads separately so Daily doesn't feel blocked
    setApoLoading(true);
    const apoRes = await loadApologeticsV2Board({ dayNumberOverride });
    if (apoRes?.ok) setApo(apoRes);
    else setApo({ ok: false, error: apoRes?.error || "Failed to load apologetics." });
    setApoLoading(false);
  };

  // ✅ PASTE IT RIGHT HERE (directly under reload)
const loadWeeklyMessage = useCallback(async () => {
  try {
    setWeeklyMsgLoading(true);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      setWeeklyMsg(null);
      return;
    }

    const { week_start } = getCurrentWeekBoundsISO();

    // 1) Get user's first approved church membership (MVP)
    const { data: memberships, error: memErr } = await supabase
      .from("church_memberships")
      .select("church_id, status, created_at")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .order("created_at", { ascending: true })
      .limit(1);

    if (memErr) {
      console.log("WeeklyMessage: membership load error:", memErr);
      setWeeklyMsg(null);
      return;
    }

    const membership = memberships?.[0];
    if (!membership?.church_id) {
      setWeeklyMsg(null);
      return;
    }

    // 2) Fetch church name
    let churchName = "Church";
    const { data: churchRow, error: churchErr } = await supabase
      .from("churches")
      .select("name")
      .eq("id", membership.church_id)
      .maybeSingle();

    if (!churchErr && churchRow?.name) churchName = churchRow.name;

    // 3) Fetch this week's weekly message (published or not)
    // NOTE: We fetch the row for the week; if none exists, we still keep church context.
    const { data: msg, error: msgErr } = await supabase
      .from("church_weekly_messages")
      .select("id, church_id, week_start, video_url, speaker_label, title, status, source_label")
      .eq("church_id", membership.church_id)
      .eq("week_start", week_start)
      .maybeSingle();

    if (msgErr) {
      console.log("WeeklyMessage: message load error:", msgErr);
      // Still keep church context even if message fetch fails
      setWeeklyMsg({
        id: null,
        church_id: membership.church_id,
        church_name: churchName,
        week_start,
        video_url: null,
        speaker_label: null,
        title: null,
        status: null,
        source_label: churchName,
      });
      return;
    }

    // Always keep church context, even if no message exists for the week
    if (!msg) {
      setWeeklyMsg({
        id: null,
        church_id: membership.church_id,
        church_name: churchName,
        week_start,
        video_url: null,
        speaker_label: null,
        title: null,
        status: null,
        source_label: churchName,
      });
      return;
    }

    // Explicit mapping (NO spread)
    setWeeklyMsg({
      id: msg.id ?? null,
      church_id: msg.church_id ?? membership.church_id,
      church_name: churchName,
      week_start: msg.week_start ?? week_start,
      video_url: msg.video_url ?? null,
      speaker_label: msg.speaker_label ?? null,
      title: msg.title ?? null,
      status: msg.status ?? null,
      source_label: msg.source_label ?? churchName,
    });
  } catch (e) {
    console.log("WeeklyMessage: unexpected error:", e);
    setWeeklyMsg(null);
  } finally {
    setWeeklyMsgLoading(false);
  }
}, []);

const loadWeeklyChallenge = useCallback(async () => {
  try {
    setWeeklyChallengeLoading(true);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      setWeeklyChallenge(null);
      return;
    }

    const { week_start } = getCurrentWeekBoundsISO();

    // 1) Get user's first approved church membership (MVP)
    const { data: memberships, error: memErr } = await supabase
      .from("church_memberships")
      .select("church_id, status, created_at")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .order("created_at", { ascending: true })
      .limit(1);

    if (memErr) {
      console.log("WeeklyChallenge: membership load error:", memErr);
      setWeeklyChallenge(null);
      return;
    }

    const membership = memberships?.[0];
    if (!membership?.church_id) {
      setWeeklyChallenge(null);
      return;
    }

    // 2) Fetch this week's published weekly challenge
    const { data: ch, error: chErr } = await supabase
      .from("church_weekly_challenges")
      .select("id, church_id, week_start, title, description, why_it_matters, scripture_refs, action_label, action_url, lp_bonus, status, discipline")
      .eq("church_id", membership.church_id)
      .eq("week_start", week_start)
      .eq("status", "published")
      .maybeSingle();

    if (chErr) {
      console.log("WeeklyChallenge: challenge load error:", chErr);
      setWeeklyChallenge(null);
      return;
    }

    setWeeklyChallenge(ch || null);
  } catch (e) {
    console.log("WeeklyChallenge: unexpected error:", e);
    setWeeklyChallenge(null);
  } finally {
    setWeeklyChallengeLoading(false);
  }
}, []);

const loadWeeklyCommitment = useCallback(async ({ church_id, week_start, challenge_id }) => {
  try {
    setCommitmentSaving(true);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) return;

    if (!church_id || !week_start || !challenge_id) return;

    const { data: row, error } = await supabase
      .from("weekly_challenge_commitments")
      .select("commitment_text, week_start, challenge_id")
      .eq("user_id", user.id)
      .eq("challenge_id", challenge_id)
      .maybeSingle();

    if (error) {
      console.log("loadWeeklyCommitment error:", error);
      return;
    }

    if (row?.commitment_text) {
      setWeeklyCommitmentText(String(row.commitment_text));
      setWeeklyCommitmentSaved(true);
      setCommitmentWeekStart(String(row.week_start));
    } else {
      // no saved commitment yet
      setWeeklyCommitmentText("");
      setWeeklyCommitmentSaved(false);
      setCommitmentWeekStart(String(week_start));
    }
  } finally {
    setCommitmentSaving(false);
  }
}, []);

const saveWeeklyCommitment = useCallback(async ({ church_id, week_start, challenge_id, commitment_text }) => {
  const commitment = String(commitment_text || "").trim();
  if (!commitment) return { ok: false, error: "Empty commitment" };

  try {
    setCommitmentSaving(true);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) return { ok: false, error: "Not logged in" };

    const { error } = await supabase
      .from("weekly_challenge_commitments")
      .upsert(
        {
          user_id: user.id,
          church_id,
          challenge_id,
          week_start,
          commitment_text: commitment,
        },
        { onConflict: "user_id,challenge_id" }
      );

    if (error) {
      console.log("saveWeeklyCommitment error:", error);
      return { ok: false, error: error.message || "Save failed" };
    }

    return { ok: true };
  } finally {
    setCommitmentSaving(false);
  }
}, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayOverride]);

 useFocusEffect(
  useCallback(() => {
    loadWeeklyMessage();
    loadWeeklyChallenge();
  }, [loadWeeklyMessage, loadWeeklyChallenge])
);

useEffect(() => {
  if (Platform.OS !== "android") return;

  const show = Keyboard.addListener("keyboardDidShow", (e) => {
    const h = e?.endCoordinates?.height ?? 0;
    setKbHeight(h);
  });

  const hide = Keyboard.addListener("keyboardDidHide", () => {
    setKbHeight(0);
  });

  return () => {
    show.remove();
    hide.remove();
  };
}, []);

// Reset commitment when a NEW weekly challenge week_start is loaded
useEffect(() => {
  const wk = weeklyChallenge?.week_start || null;
  if (!wk) return;

  // If we have never set a week yet, or it changed, reset commitment
  if (commitmentWeekStart !== wk) {
    setCommitmentWeekStart(wk);
    setWeeklyCommitmentText("");
    setWeeklyCommitmentSaved(false);
  }
}, [weeklyChallenge?.week_start, commitmentWeekStart]);


  const openScripture = (ref) => {
    if (!ref) return;
    setScriptureRef(ref);
    setScriptureOpen(true);

    if (drillOpen) setStudyOpenedCount((n) => n + 1);
  };

  const openCoach = async () => {
    const verseId = board?.day?.verse_id || board?.verse?.verseId;
    if (!verseId) {
      setCoachData({
        context_text:
          "Read the paragraph before and after this verse so you can feel the moment and the audience.",
        theological_meaning:
          "God is not inviting you into pressure—He is inviting you into trust. Grace first, then growth.",
        practical_application:
          "Pick one worry today and hand it over on purpose. Replace it with one promise.",
        related_scripture: ["James 1:22", "John 14:21", "Psalm 119:105"],
      });
      setCoachOpen(true);
      return;
    }

    try {
      setCoachLoading(true);
      setCoachOpen(true);
      const data = await fetchFaithCoachByVerseId(verseId);
      setCoachData(data);
    } catch (e) {
      setCoachData(null);
      Alert.alert("Faith Coach", "Couldn’t load Faith Coach right now.");
    } finally {
      setCoachLoading(false);
    }
  };

  const startCompleteMission = (mission) => {
    setVictoryMission(mission);
    setVictoryUnseen(false);
    setVictoryNote("");
    setVictoryOpen(true);
  };

  const confirmCompleteMission = async () => {
    if (!board?.day?.id || !victoryMission) return;

    if (completedByDiscipline?.[victoryMission.discipline]) {
      Alert.alert("Already done", "You’ve already completed a mission for this discipline today.");
      setVictoryOpen(false);
      return;
    }

    try {
      setSavingComplete(true);

      const res = await completeMissionV2({
        dayId: board.day.id,
        mission: victoryMission,
        unseenAct: victoryUnseen,
        reflectionText: victoryNote,
      });

      if (!res.ok) {
        Alert.alert("Couldn’t mark complete", res.error || "Try again.");
        return;
      }

      setVictoryOpen(false);
      await reload();

      const base = Number(victoryMission.reward_points || 0);
      const bonus = streakBonusPerMission;
      const totalEarned = base + bonus;

      Alert.alert(
        "Mission complete",
        `Reward claimed: +${totalEarned} points\n\nBase +${base} • Streak bonus +${bonus} (cap ${STREAK_BONUS_CAP})`
      );
    } finally {
      setSavingComplete(false);
    }
  };

  const openShare = () => {
    if (!board?.day?.id) {
      Alert.alert("Not ready", "There isn’t a mission day loaded to share yet.");
      return;
    }
    setShareText("");
    setShareVisibility("public");
    setShareOpen(true);
  };

  const saveShare = async () => {
    if (!board?.day?.id) return;

    try {
      setShareSaving(true);

      const completedMissionIds = new Set((board?.completions || []).map((c) => c.mission_id));
      const completedMissions = (board?.missions || []).filter((m) => completedMissionIds.has(m.id));

      const payload = {
        pack_id: board?.pack?.id,
        pack_name: board?.pack?.name,
        day_number: board?.dayNumber,
        day_title: board?.day?.title,
        verse_ref: board?.verse?.ref,
        completed: completedMissions.map((m) => ({
          discipline: m.discipline,
          title: m.mission_title,
          base_points: Number(m.reward_points || 0),
          streak_bonus: streakBonusPerMission,
          total_points: Number(m.reward_points || 0) + streakBonusPerMission,
          unseen_allowed: m.allows_unseen_act,
        })),
        earned_points_today: earnedPointsToday,
        base_points_today: basePointsToday,
        streak_bonus_today: streakBonusToday,
        streak_bonus_per_mission: streakBonusPerMission,
        streak_bonus_cap: STREAK_BONUS_CAP,
      };

      const res = await upsertDailyShareV2({
        dayId: board.day.id,
        visibility: shareVisibility,
        postText: shareText,
        payload,
      });

      if (!res.ok) {
        Alert.alert("Couldn’t save share", res.error || "Try again.");
        return;
      }

      setShareOpen(false);
      Alert.alert("Saved", "Your share draft is saved.");
    } finally {
      setShareSaving(false);
    }
  };

  // ---------------- Apologetics derived data ----------------
  const apoDrills = apo?.drills || [];
  const attemptsByDrillId = apo?.attemptsByDrillId || {};
  const apoBoss = apo?.boss || null;
  const apoBossAttempt = apo?.bossAttempt || null;

  const completedDrillsCount = useMemo(() => {
    let n = 0;
    for (const d of apoDrills) if (attemptsByDrillId?.[d.id]?.completed) n += 1;
    return n;
  }, [apoDrills, attemptsByDrillId]);

  const nextDrill = useMemo(() => {
    if (!apoDrills.length) return null;
    const firstUncompleted = apoDrills.find((d) => !attemptsByDrillId?.[d.id]?.completed);
    return firstUncompleted || apoDrills[0] || null;
  }, [apoDrills, attemptsByDrillId]);

  const activeDrill = useMemo(() => {
    if (!apoDrills.length) return null;
    const id = selectedDrillId || nextDrill?.id || apoDrills[0]?.id;
    return apoDrills.find((d) => d.id === id) || null;
  }, [apoDrills, selectedDrillId, nextDrill]);

  const activeAttempt = activeDrill?.id ? attemptsByDrillId?.[activeDrill.id] || null : null;

  const goToApologeticsArena = (drillIdOverride) => {
    navigation.navigate("ApologeticsArena", {
      dayNumberOverride: dayOverride ?? null,
      initialDrillId: drillIdOverride ?? nextDrill?.id ?? null,
    });
  };

  useEffect(() => {
    if (!drillOpen) return;

    if (objectionTimerRef.current) clearTimeout(objectionTimerRef.current);

    setTypedObjection("");
    setShowWhyItMatters(false);

    const full = String(activeDrill?.prompt || "").trim();
    if (!full) return;

    setIsTypingObjection(true);

    let i = 0;
    const tick = () => {
      i += 1;
      setTypedObjection(full.slice(0, i));

      if (i < full.length) {
        objectionTimerRef.current = setTimeout(tick, 14);
      } else {
        setIsTypingObjection(false);
        setShowWhyItMatters(true);
      }
    };

    objectionTimerRef.current = setTimeout(tick, 120);

    return () => {
      if (objectionTimerRef.current) clearTimeout(objectionTimerRef.current);
    };
  }, [drillOpen, activeDrill?.id]);

  // (kept for future in-screen drill flow)
  const openDrill = (drillId) => {
    if (!apoDrills?.length) {
      Alert.alert("No drills yet", "No apologetics drills are seeded for today.");
      return;
    }

    const targetId = drillId || nextDrill?.id || apoDrills[0]?.id;
    setSelectedDrillId(targetId);

    setDrillCoachOpen(false);
    setDrillAnswerOpen(false);
    setDrillUsedCoach(false);
    setDrillChecked({});

    setDrillStep(1);
    setStudyOpenedCount(0);
    setDrillVictoryOpen(false);
    setDrillVictoryData(null);

    setStudyCueChecked({});
    setEvidenceTapped({});

    setStudyRead({});
    setStudySelected({ Sources: null, Moves: null, Evidence: null });

    const attempt = attemptsByDrillId?.[targetId] || null;
    setDrillText(String(attempt?.user_answer || ""));

    setDrillOpen(true);
  };

  const toggleDrillCoach = () => {
    setDrillCoachOpen((v) => !v);
    setDrillUsedCoach(true);
  };

  const toggleDrillAnswer = () => {
    setDrillAnswerOpen((v) => !v);
    setDrillUsedCoach(true);
  };

  const toggleKeyPoint = (idx) => {
    setDrillChecked((prev) => ({ ...prev, [idx]: !prev?.[idx] }));
  };

  const canGoNextFromStudy = () => {
    const cueCheckedCount = Object.values(studyCueChecked || {}).filter(Boolean).length;
    const evidenceTappedCount = Object.values(evidenceTapped || {}).filter(Boolean).length;
    return studyOpenedCount > 0 || cueCheckedCount > 0 || evidenceTappedCount > 0;
  };

  const goNextStep = () => {
    if (drillStep === 2 && !canGoNextFromStudy()) {
      Alert.alert(
        "Quick study moment",
        "Before you continue, open at least one scripture anchor or tick one key point."
      );
      return;
    }
    setDrillStep((s) => Math.min(4, s + 1));
  };

  const goPrevStep = () => {
    setDrillStep((s) => Math.max(1, s - 1));
  };

  const submitDrill = async () => {
    const drill = activeDrill;
    if (!drill?.id) return;

    const answer = String(drillText || "").trim();
    if (!answer || answer.length < 20) {
      Alert.alert("Write your rebuttal", "Give at least a couple of sentences before submitting.");
      return;
    }

    const points = Array.isArray(drill?.key_points) ? drill.key_points.filter(Boolean) : [];
    const checkedCount = points.length
      ? points.reduce((n, _, idx) => (drillChecked?.[idx] ? n + 1 : n), 0)
      : 0;

    if (points.length && checkedCount === 0) {
      Alert.alert(
        "Quick tip",
        "Tap a few key points first so you actually learn the response.\n\nDo you still want to submit now?",
        [
          { text: "Go practice", style: "cancel" },
          { text: "Submit anyway", style: "destructive", onPress: () => actuallySubmitDrill() },
        ]
      );
      return;
    }

    actuallySubmitDrill();
  };

  const actuallySubmitDrill = async () => {
    const drill = activeDrill;
    if (!drill?.id) return;

    const answer = String(drillText || "").trim();

    try {
      setDrillSaving(true);
      setDrillGrading(true);

      const points = Array.isArray(drill?.key_points) ? drill.key_points.filter(Boolean) : [];
      const checkedIdxs = points
        .map((_, idx) => (drillChecked?.[idx] ? idx : null))
        .filter((v) => v !== null);

      const gradeRes = await gradeDrillWithFaithCoach({
        drill: {
          id: drill.id,
          title: drill.title,
          prompt: drill.prompt,
          opponent_type: drill.opponent_type,
          key_points: drill.key_points || [],
          scripture_refs: drill.scripture_refs || [],
        },
        userAnswer: answer,
      });

      if (!gradeRes.ok) {
        console.log("FAITH COACH FAIL (Apologetics) gradeRes =", gradeRes);
        Alert.alert(
          "Faith Coach (Apologetics) failed",
          `Error: ${gradeRes.error || "Unknown"}\n\nStatus: ${
            gradeRes.status || "unknown"
          }\n\nDetails:\n${
            gradeRes.details ? JSON.stringify(gradeRes.details, null, 2) : "(none)"
          }`
        );
        return;
      }

      const grade = gradeRes.grade;

      const alreadyCompleted = !!activeAttempt?.completed;
      const xpEarned = alreadyCompleted ? 0 : safeNum(drill.xp_reward);
      const lpEarned = alreadyCompleted ? 0 : safeNum(drill.light_points_bonus);

      const coachFeedback = {
        mode: "arena_v2_typed_rebuttal",
        used_cues_panel: !!drillCoachOpen,
        used_suggested_answer: !!drillAnswerOpen,
        checked_key_points: checkedIdxs,
        key_points: drill.key_points || [],
        scripture_refs: drill.scripture_refs || [],
        suggested_answer: buildSuggestedAnswer(drill),
        grade,
      };

      const res = await upsertApologeticsAttemptV2({
        drillId: drill.id,
        userAnswer: answer,
        usedFaithCoach: true,
        completed: true,
        score: Number.isFinite(Number(grade?.score)) ? Number(grade.score) : 0,
        xpEarned,
        lightPointsEarned: lpEarned,
        coachFeedback,
      });

      if (!res.ok) {
        Alert.alert("Couldn’t save", res.error || "Try again.");
        return;
      }

      await reload();

      setDrillVictoryData({
        grade,
        xpEarned,
        lpEarned,
        alreadyCompleted,
      });
      setDrillVictoryOpen(true);
      setDrillStep(4);
    } finally {
      setDrillGrading(false);
      setDrillSaving(false);
    }
  };

  const openBoss = () => {
    if (!apoBoss?.id) {
      Alert.alert("No boss battle yet", "No boss battle is seeded for this week.");
      return;
    }
    setBossOpen(true);
  };

  const enterBossArena = async () => {
    const boss = apoBoss;
    if (!boss?.id) return;

    try {
      setBossSaving(true);

      const state = {
        current_round: 0,
        answers: {},
        used_faith_coach_rounds: {},
      };

      const res = await startBossAttemptV2({ bossId: boss.id, state });
      if (!res.ok) {
        Alert.alert("Couldn’t enter", res.error || "Try again.");
        return;
      }

      await reload();
      Alert.alert(
        "Entered the Arena",
        "Boss Battle gameplay is the next build step. You’re now ‘in progress’."
      );
      setBossOpen(false);
    } finally {
      setBossSaving(false);
    }
  };
  // -----------------------------------------------------

  if (loading || !board) {
    return (
      <Screen padded>
        {() => (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color={theme.colors.gold} />
            <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Loading Daily…</Text>
          </View>
        )}
      </Screen>
    );
  }

  const verse = board?.verse || { text: "—", ref: "—", translation: "WEB" };

  // ✅ Show a real date on the Daily Scripture (not Day 1/2/etc)
  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ✅ “Peace under pressure” etc should feel like a proper title
  const scriptureTitle = board?.day?.title || "Daily Scripture";

  const DevDaySwitcher = () => {
    if (!__DEV__) return null;

    const computed = board.computedDayNumber ?? board.dayNumber ?? 1;
    const viewing = dayOverride ?? board.dayNumber ?? computed;

    return (
      <View style={{ marginTop: 12 }}>
        <GlowCard innerStyle={{ paddingVertical: 10, paddingHorizontal: 12 }}>
          <Text style={{ color: theme.colors.text2, fontSize: 12, fontWeight: "800" }}>
            DEV: computedDay={computed} • viewingDay={viewing} • override={dayOverride ?? "none"}
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10 }}>
            {[
              { label: "Go Day 1", onPress: () => setDayOverride(1) },
              { label: "Go Day 2", onPress: () => setDayOverride(2) },
              { label: "◀ Prev", onPress: () => setDayOverride(Math.max(1, viewing - 1)) },
              { label: "Next ▶", onPress: () => setDayOverride(viewing + 1) },
              { label: "Reset", onPress: () => setDayOverride(null), primary: true },
            ].map((b) => (
              <Pressable
                key={b.label}
                onPress={b.onPress}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  backgroundColor: b.primary ? theme.colors.gold : theme.colors.surface,
                  borderWidth: 1,
                  // ✅ neutral structure border
                  borderColor: b.primary ? theme.colors.goldOutline : NEUTRAL_BORDER,
                  marginRight: 10,
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    color: b.primary ? theme.colors.text : theme.colors.text2,
                    fontWeight: "900",
                    fontSize: 12,
                  }}
                >
                  {b.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </GlowCard>
      </View>
    );
  };

  const missionsByDisciplineLocal = missionsByDiscipline;
  const completedByDisciplineLocal = completedByDiscipline;

  const renderMissionOption = (m, completed) => {
    const isMissionOpen = openMissionId === m.id;
    const disabled = completed;

    const base = Number(m.reward_points || 0);
    const bonus = streakBonusPerMission;
    const totalReward = base + bonus;

    // ✅ thick silver when incomplete; thick gold when complete
    const outlineColor = disabled ? theme.colors.gold : SILVER;

    return (
      <View
        key={m.id}
        style={{
          marginTop: 10,
          padding: 12,
          borderRadius: 16,
          backgroundColor: theme.colors.surfaceAlt,

          // ✅ keep the ring as the “status” indicator (silver/gold)
          borderWidth: 3,
          borderColor: outlineColor,

          // ✅ neutral shadow (so gold isn’t doing layout/structure)
          shadowColor: NEUTRAL_SHADOW,
          shadowOpacity: 0.14,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 3,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: theme.colors.text, fontWeight: "900", flex: 1, paddingRight: 10 }}>
            {m.mission_title}
          </Text>
          <Text style={{ color: theme.colors.goldPressed, fontWeight: "900" }}>+{totalReward}</Text>
        </View>

        <Text style={{ color: theme.colors.text2, marginTop: 8, lineHeight: 20 }}>
          {m.objective_line}
        </Text>

        <Text style={{ color: theme.colors.muted, marginTop: 6, fontSize: 12, fontWeight: "700" }}>
          Reward: +{base} base +{bonus} streak
        </Text>

        <Pressable
          onPress={() => setOpenMissionId(isMissionOpen ? null : m.id)}
          style={{ marginTop: 10 }}
        >
          <Text style={{ color: theme.colors.sage, fontWeight: "900" }}>
            {isMissionOpen ? "Hide mission details ▲" : "Open mission details ▼"}
          </Text>
        </Pressable>

        {isMissionOpen ? (
          <View style={{ marginTop: 10 }}>
            {!!m.why_short ? (
              <>
                <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Why this matters</Text>
                <Text style={{ color: theme.colors.text2, marginTop: 6, lineHeight: 20 }}>
                  {m.why_short}
                </Text>
              </>
            ) : null}

            <Text style={{ color: theme.colors.text, fontWeight: "900", marginTop: 12 }}>
              How to do it
            </Text>

            {Array.isArray(m.steps) && m.steps.length ? (
              <View style={{ marginTop: 6 }}>
                {m.steps.map((s, idx) => (
                  <Text
                    key={`${m.id}-s-${idx}`}
                    style={{ color: theme.colors.text2, lineHeight: 20, marginTop: 4 }}
                  >
                    • {s}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={{ color: theme.colors.muted, marginTop: 6 }}>No steps provided yet.</Text>
            )}

            {!!m.prayer_prompt ? (
              <>
                <Text style={{ color: theme.colors.text, fontWeight: "900", marginTop: 12 }}>
                  Prayer
                </Text>
                <Text style={{ color: theme.colors.text2, marginTop: 6, lineHeight: 20 }}>
                  {m.prayer_prompt}
                </Text>
              </>
            ) : null}

            {Array.isArray(m.scripture_refs) && m.scripture_refs.length ? (
              <View style={{ marginTop: 12 }}>
                <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Read</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
                  {m.scripture_refs.map((r) => (
                    <Pressable
                      key={`${m.id}-ref-${r}`}
                      onPress={() => openScripture(r)}
                      style={{
                        backgroundColor: theme.colors.surface,
                        borderRadius: 999,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderWidth: 1,
                        // ✅ neutral structure border (gold reserved for actions/achievements)
                        borderColor: NEUTRAL_BORDER,
                        marginRight: 8,
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ color: theme.colors.text, fontWeight: "900" }}>{r}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        <Pressable
          onPress={() => startCompleteMission(m)}
          disabled={disabled}
          style={{
            marginTop: 12,
            backgroundColor: disabled ? theme.colors.divider : theme.colors.gold,
            paddingVertical: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: disabled ? theme.colors.divider : theme.colors.goldOutline,
          }}
        >
          <Text style={{ color: theme.colors.text, textAlign: "center", fontWeight: "900" }}>
            {disabled ? "Completed for this discipline ✅" : "Claim reward (complete)"}
          </Text>
        </Pressable>
      </View>
    );
  };

  const renderDisciplineCard = ({ item: d, index }) => {
    const meta = DISCIPLINE_META[d];
    const completed = !!completedByDisciplineLocal?.[d];
    const options = missionsByDisciplineLocal?.[d] || [];

    // ✅ thick silver when incomplete; thick gold when complete
    const ringColor = completed ? theme.colors.gold : SILVER;

    // ✅ glow as you swipe into the card (continuous)
    const inputRange = [(index - 1) * ITEM_SIZE, index * ITEM_SIZE, (index + 1) * ITEM_SIZE];

    const baseScale = scrollX.interpolate({
      inputRange,
      outputRange: [0.94, 1, 0.94],
      extrapolate: "clamp",
    });

    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [10, 0, 10],
      extrapolate: "clamp",
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.88, 1, 0.88],
      extrapolate: "clamp",
    });

    // Preselect ring appears BEFORE snap settles
    const preselect = scrollX.interpolate({
      inputRange,
      outputRange: [0.15, 1, 0.15],
      extrapolate: "clamp",
    });

    // Continuous "focus glow" based on proximity to centre card
    const focusGlowOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.12, 0.62, 0.12],
      extrapolate: "clamp",
    });

    const isActive = index === activeIndex; // updates promptly during scroll
    const isSettled = index === settledIndex; // used for pulse on settle only

    const isPressed = pressedIndex === index;
    const pressedBump = isActive && isPressed ? 1.03 : 1;

    // Pulse overlay (extra kick on settle)
    const pulseOpacity = isSettled ? glowPulse : 0;

    return (
      <Animated.View
        style={{
          width: ITEM_SIZE,
          paddingRight: GAP,
          opacity,
          transform: [{ scale: baseScale }, { translateY }],
        }}
      >
        <Animated.View style={{ width: CARD_WIDTH, transform: [{ scale: pressedBump }] }}>
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 18,

              // ✅ neutral structure border (gold saved for “meaning”)
              borderWidth: 1,
              borderColor: NEUTRAL_BORDER,

              overflow: "hidden",
              shadowColor: NEUTRAL_SHADOW,
              shadowOpacity: 0.18,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 10 },
              elevation: 4,
            }}
          >
            {/* ✅ Thick “selected” ring that fades in early while swiping */}
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 18,
                borderWidth: 4,
                borderColor: ringColor,
                opacity: preselect,
              }}
            />

            {/* ✅ Continuous focus glow while swiping/selected */}
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: -10,
                left: -10,
                right: -10,
                bottom: -10,
                borderRadius: 24,
                borderWidth: 3,
                borderColor: ringColor,
                opacity: focusGlowOpacity,
              }}
            />
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: completed ? theme.colors.goldHalo : SILVER_HALO,
                opacity: focusGlowOpacity,
              }}
            />

            {/* Pulse overlay on settle */}
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 18,
                borderWidth: 2,
                borderColor: ringColor,
                opacity: pulseOpacity,
              }}
            />

            <Pressable
              onPressIn={() => setPressedIndex(index)}
              onPressOut={() => setPressedIndex(null)}
              style={{ padding: 14 }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                    paddingRight: 10,
                  }}
                >
                  <Text style={{ fontSize: 18, marginRight: 10 }}>{meta.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
                      {meta.label}
                    </Text>
                    <Text style={{ color: theme.colors.text2, marginTop: 2 }}>{meta.blurb}</Text>
                  </View>
                </View>

                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: completed ? theme.colors.goldHalo : "rgba(201,206,216,0.10)",
                    borderWidth: 2,
                    borderColor: completed ? theme.colors.goldOutline : SILVER_DIM,
                    alignSelf: "flex-start",
                  }}
                >
                  <Text
                    style={{
                      color: completed ? theme.colors.goldPressed : SILVER,
                      fontWeight: "900",
                    }}
                  >
                    {completed ? "1/1" : "0/1"}
                  </Text>
                </View>
              </View>

              {isActive ? (
                <Text style={{ color: theme.colors.sage, marginTop: 10, fontWeight: "900" }}>
                  Active
                </Text>
              ) : (
                <Text style={{ color: theme.colors.muted, marginTop: 10 }}>
                  Swipe to bring forward
                </Text>
              )}
            </Pressable>

            <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
              {options.length === 0 ? (
                <Text style={{ color: theme.colors.muted }}>No missions for this discipline yet.</Text>
              ) : (
                options.map((m) => renderMissionOption(m, completed))
              )}
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    );
  };

  return (
    <Screen padded>
      {({ bottomPad }) => (
        <>
          <ScrollView
  ref={scrollRef}
  keyboardShouldPersistTaps="handled"
  contentContainerStyle={{ paddingBottom: (bottomPad || 0) + 18 }}
>

            {/* Header (Prayer-style) */}
            <View style={{ marginBottom: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[theme.text.h1, { fontSize: 22 }]}>Daily</Text>
                  <Text style={[theme.text.sub, { marginTop: 2 }]}>
                    Verse, missions, streak, and progress.
                  </Text>
                </View>

                {/* ✅ Light Points pill shows MONTH total */}
                <View
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderWidth: 1,
                    // ✅ neutral structure border
                    borderColor: NEUTRAL_BORDER,
                    shadowColor: NEUTRAL_SHADOW,
                    shadowOpacity: 0.16,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 3,
                    alignItems: "flex-end",
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: "900" }}>
                    Light Points 
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.goldPressed,
                      fontSize: 14,
                      fontWeight: "900",
                      marginTop: 2,
                    }}
                  >
                    {monthLP}
                  </Text>
                </View>
              </View>

              <View style={{ marginTop: 10 }}>
                <GlowCard innerStyle={{ paddingVertical: 10, paddingHorizontal: 14 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: theme.colors.text2, fontSize: 12, fontWeight: "700" }}>
                      Streak: {streak} day(s)
                    </Text>
                    <Text style={{ color: theme.colors.text2, fontSize: 12, fontWeight: "700" }}>
                      Light Points (Month): {monthLP}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginTop: 6,
                    }}
                  >
                    <Text style={{ color: theme.colors.text2, fontSize: 12, fontWeight: "700" }}>
                      Progress: {completedCount}/5
                    </Text>
                    <Text style={{ color: theme.colors.text2, fontSize: 12, fontWeight: "700" }}>
                      Earned today: +{earnedPointsToday}
                    </Text>
                  </View>
                  <Text style={{ color: theme.colors.muted, marginTop: 6, fontSize: 12 }}>
                    Streak bonus: +{streakBonusPerMission}/mission (cap {STREAK_BONUS_CAP})
                  </Text>
                </GlowCard>
              </View>
            </View>

{/* Weekly Message (Mon–Sun encouragement) */}
<View style={{ marginTop: 6 }}>
  {weeklyMsgLoading ? (
    <GlowCard innerStyle={{ padding: 14, alignItems: "center" }}>
      <ActivityIndicator color={theme.colors.gold} />
      <Text style={{ color: theme.colors.muted, marginTop: 8, fontWeight: "700" }}>
        Loading weekly encouragement…
      </Text>
    </GlowCard>
  ) : weeklyMsg ? (
    <WeeklyMessageCard
      theme={theme}
      sourceLabel={weeklyMsg.source_label || weeklyMsg.church_name || "Church"}
      speakerLabel={weeklyMsg.speaker_label || ""}
      videoUrl={weeklyMsg.video_url || null}
      onPressChallenges={scrollToFormation}
      onPressNoticeboard={() => console.log("Go to Noticeboard")}
      onPressChurchProfile={() => console.log("Go to Church Profile")}
    />
  ) : (
    <GlowCard innerStyle={{ padding: 14 }}>
      <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
        Weekly Encouragement
      </Text>
      <Text style={{ color: theme.colors.text2, marginTop: 8, lineHeight: 20 }}>
        You’re not currently linked to a church yet.
      </Text>
    </GlowCard>
  )}
</View>

{/* Weekly Challenge Spotlight (church-set) */}
<View style={{ marginTop: 0 }}>
  {weeklyChallengeLoading ? (
    <GlowCard innerStyle={{ padding: 14, alignItems: "center" }}>
      <ActivityIndicator color={theme.colors.gold} />
      <Text style={{ color: theme.colors.muted, marginTop: 8, fontWeight: "700" }}>
        Loading weekly challenge…
      </Text>
    </GlowCard>
  ) : weeklyChallenge ? (
   <WeeklyChallengeSpotlight
  theme={theme}
  challenge={weeklyChallenge}
  onPressGoToChallenges={scrollToFormation}
  onOpenScripture={openScripture}
 onStart={async () => {
  const churchId = weeklyChallenge?.church_id || null;
  const wk = weeklyChallenge?.week_start || null;
  const chId = weeklyChallenge?.id || null;

  if (churchId && wk && chId) {
    await loadWeeklyCommitment({ church_id: churchId, week_start: wk, challenge_id: chId });
  }

  setCommitmentModalOpen(true);
}}


  onShare={handleShareWeeklyChallenge}
  shareEnabled={weeklyShareEnabled}
commitmentText={weeklyCommitmentText}
hasStarted={weeklyCommitmentSaved && weeklyCommitmentText.trim().length > 0}

/>


  ) : (
    <GlowCard innerStyle={{ padding: 14 }}>
      <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
        Weekly Challenge
      </Text>
      <Text style={{ color: theme.colors.text2, marginTop: 8, lineHeight: 20 }}>
        No weekly challenge has been published for your church yet.
      </Text>
    </GlowCard>
  )}
</View>

            {/* ========================= */}
            {/* Scripture “Hero” Section  */}
            {/* ========================= */}
            <View style={{ marginTop: 14 }}>
              <View
                style={{
                  marginHorizontal: -16,
                  backgroundColor: PARCHMENT,
                  borderTopWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: NEUTRAL_BORDER,
                }}
              >
                <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
                  {/* Meta bar */}
                  <View
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderRadius: 16,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: NEUTRAL_BORDER,
                      shadowColor: NEUTRAL_SHADOW,
                      shadowOpacity: 0.12,
                      shadowRadius: 12,
                      shadowOffset: { width: 0, height: 6 },
                      elevation: 2,
                    }}
                  >
                    <Text style={{ color: theme.colors.text2, fontSize: 12, fontWeight: "800" }}>
                      {dateLabel}
                    </Text>

                    <Text
                      style={{
                        color: theme.colors.text,
                        fontWeight: "900",
                        fontSize: 20,
                        textAlign: "center",
                        marginTop: 8,
                        letterSpacing: 0.3,
                        fontFamily: Platform.select({
                          ios: "Georgia",
                          android: "serif",
                          default: "serif",
                        }),
                      }}
                    >
                      {scriptureTitle}
                    </Text>

                    <Text
                      style={{
                        color: theme.colors.muted,
                        fontSize: 12,
                        fontWeight: "800",
                        marginTop: 10,
                        textAlign: "center",
                      }}
                    >
                      Tap the reference to read the full passage
                    </Text>
                  </View>

                  {/* Verse body (clearer hierarchy + more “air”) */}
                  <View style={{ marginTop: 14 }}>
                    <View
                      style={{
                        paddingLeft: 12,
                        borderLeftWidth: 3,
                        borderLeftColor: theme.colors.goldOutline,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.colors.text,
                          fontSize: 16,
                          lineHeight: 26,
                        }}
                      >
                        {verse.text ?? "—"}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => openScripture(verse.ref)}
                      disabled={!verse?.ref}
                      style={{ marginTop: 12 }}
                    >
                      <Text
                        style={{
                          color: theme.colors.goldPressed,
                          fontWeight: "900",
                        }}
                      >
                        — {verse.ref ?? "—"} {verse.translation ? `(${verse.translation})` : ""}
                      </Text>
                    </Pressable>
                  </View>

                  <View style={{ flexDirection: "row", marginTop: 14 }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <GlowButton title="Faith Coach" onPress={openCoach} variant="primary" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <GlowButton title="Share progress" onPress={openShare} variant="outline" />
                    </View>
                  </View>
                </View>
              </View>
            </View>

           {/* Formation Section (clear chapter) */}
<View
  onLayout={(e) => {
    setFormationY(e.nativeEvent.layout.y);
  }}
  style={{ marginTop: SECTION_GAP }}
>

              <View
                style={{
                  marginHorizontal: -16,
                  backgroundColor: SAGE_BAND,
                  borderTopWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: NEUTRAL_BORDER,
                }}
              >
                <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
                  <Text style={[theme.text.h2, { fontSize: 18 }]}>Today’s Formation</Text>
                  <Text style={{ color: theme.colors.text2, marginTop: 6, lineHeight: 20 }}>
                    This is your daily training plan. Each card is one discipline that strengthens you
                    as a Christian. Bring a discipline to the centre, choose one mission, and complete
                    it to grow your consistency.
                  </Text>
                  <Text style={{ color: theme.colors.muted, marginTop: 6, lineHeight: 20 }}>
                    Incomplete missions are marked with a silver ring. When completed, the ring turns
                    gold.
                  </Text>

                  <View
                    onLayout={(e) => {
                      const w = Math.round(e.nativeEvent.layout.width);
                      if (w && w !== carouselW) setCarouselW(w);
                    }}
                    style={{ marginTop: 14, overflow: "visible" }}
                  >
                    {!carouselW ? (
                      <View style={{ height: 220, justifyContent: "center", alignItems: "center" }}>
                        <ActivityIndicator color={theme.colors.gold} />
                      </View>
                    ) : (
                      <Animated.FlatList
                        ref={listRef}
                        horizontal
                        data={loopData}
                        keyExtractor={(d, i) => `${d}-${i}`}
                        renderItem={renderDisciplineCard}
                        showsHorizontalScrollIndicator={false}
                        decelerationRate="fast"
                        snapToInterval={ITEM_SIZE}
                        snapToAlignment="start"
                        disableIntervalMomentum
                        bounces={false}
                        removeClippedSubviews={false}
                        style={{ width: carouselW, overflow: "visible" }}
                        contentContainerStyle={{
                          paddingHorizontal: SIDE_SPACING,
                          paddingVertical: 2,
                          overflow: "visible",
                        }}
                        getItemLayout={(_, index) => ({
                          length: ITEM_SIZE,
                          offset: ITEM_SIZE * index,
                          index,
                        })}
                        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                          useNativeDriver: true,
                          listener: (e) => {
                            const x = e?.nativeEvent?.contentOffset?.x ?? 0;
                            const idx = Math.round(x / ITEM_SIZE);
                            if (idx !== activeIndexRef.current) {
                              activeIndexRef.current = idx;
                              setActiveIndex(idx);
                            }
                          },
                        })}
                        scrollEventThrottle={16}
                        onMomentumScrollEnd={onMomentumScrollEnd}
                        onScrollBeginDrag={() => setOpenMissionId(null)}
                      />
                    )}
                  </View>
                </View>
              </View>
            </View>

            {/* ===================================== */}
            {/* Apologetics Section (clear chapter)   */}
            {/* ===================================== */}
            <View style={{ marginTop: SECTION_GAP }}>
              <View
                style={{
                  marginHorizontal: -16,
                  backgroundColor: theme.colors.surface,
                  borderTopWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: NEUTRAL_BORDER,
                }}
              >
                <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
                  <Text style={[theme.text.h2, { fontSize: 18 }]}>Apologetics Arena</Text>
                  <Text style={{ color: theme.colors.text2, marginTop: 6, lineHeight: 20 }}>
                    Train calm, confident answers. Start a drill and practice your defence.
                  </Text>

                  {apoLoading ? (
                    <View style={{ marginTop: 12 }}>
                      <GlowCard innerStyle={{ padding: 14 }}>
                        <ActivityIndicator color={theme.colors.gold} />
                      </GlowCard>
                    </View>
                  ) : apo?.ok === false ? (
                    <View style={{ marginTop: 12 }}>
                      <GlowCard innerStyle={{ padding: 14 }}>
                        <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                          Couldn’t load Apologetics
                        </Text>
                        <Text style={{ color: theme.colors.text2, marginTop: 8 }}>
                          {apo?.error || "Unknown error"}
                        </Text>
                      </GlowCard>
                    </View>
                  ) : (
                    <>
                      {/* DRILLS CARD */}
                      <Pressable
                        onPress={() => goToApologeticsArena(nextDrill?.id)}
                        style={{ marginTop: 12 }}
                      >
                        <GlowCard innerStyle={{ padding: 14 }}>
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}
                            >
                              Today’s Drills
                            </Text>

                            {apoDrills.length ? (
                              <Text style={{ color: theme.colors.goldPressed, fontWeight: "900" }}>
                                {completedDrillsCount}/{apoDrills.length}
                              </Text>
                            ) : (
                              <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
                                NOT SEEDED
                              </Text>
                            )}
                          </View>

                          {nextDrill ? (
                            <>
                              <Text
                                style={{
                                  color: theme.colors.text,
                                  marginTop: 10,
                                  fontWeight: "900",
                                }}
                              >
                                Next: {nextDrill.title}
                              </Text>

                              <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10 }}>
                                {[
                                  { text: `Opponent: ${nextDrill.opponent_type}`, kind: "sage" },
                                  { text: `+${safeNum(nextDrill.xp_reward)} XP`, kind: "gold" },
                                  { text: `+${safeNum(nextDrill.light_points_bonus)} LP bonus`, kind: "sage" },
                                ].map((chip) => (
                                  <View
                                    key={chip.text}
                                    style={{
                                      paddingHorizontal: 10,
                                      paddingVertical: 6,
                                      borderRadius: 999,
                                      backgroundColor:
                                        chip.kind === "gold"
                                          ? theme.colors.goldHalo
                                          : theme.colors.sageTint,
                                      borderWidth: 1,
                                      borderColor:
                                        chip.kind === "gold"
                                          ? theme.colors.goldOutline
                                          : theme.colors.sageOutline,
                                      marginRight: 8,
                                      marginBottom: 8,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        color:
                                          chip.kind === "gold"
                                            ? theme.colors.goldPressed
                                            : theme.colors.sage,
                                        fontWeight: "900",
                                      }}
                                    >
                                      {chip.text}
                                    </Text>
                                  </View>
                                ))}
                              </View>

                              {apoDrills.length > 1 ? (
                                <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
                                  {apoDrills.map((d, idx) => {
                                    const done = !!attemptsByDrillId?.[d.id]?.completed;
                                    const isNext = d.id === nextDrill.id;
                                    return (
                                      <Pressable
                                        key={d.id}
                                        onPress={() => goToApologeticsArena(d.id)}
                                        style={{
                                          paddingHorizontal: 10,
                                          paddingVertical: 8,
                                          borderRadius: 999,
                                          backgroundColor: done
                                            ? theme.colors.goldHalo
                                            : theme.colors.surface,
                                          borderWidth: 1,
                                          borderColor: done
                                            ? theme.colors.goldOutline
                                            : isNext
                                            ? theme.colors.gold
                                            : NEUTRAL_BORDER,
                                          marginRight: 8,
                                          marginBottom: 8,
                                        }}
                                      >
                                        <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                                          {idx + 1} {done ? "✓" : ""}
                                        </Text>
                                      </Pressable>
                                    );
                                  })}
                                </View>
                              ) : null}

                              <View style={{ marginTop: 10 }}>
                                <GlowButton
                                  title="Start next drill"
                                  onPress={() => goToApologeticsArena(nextDrill?.id)}
                                />
                              </View>
                            </>
                          ) : (
                            <Text style={{ color: theme.colors.muted, marginTop: 10 }}>
                              No drills seeded for today yet.
                            </Text>
                          )}
                        </GlowCard>
                      </Pressable>

                      {/* WEEKLY BOSS CARD */}
                      <Pressable onPress={openBoss} style={{ marginTop: 12 }}>
                        <GlowCard innerStyle={{ padding: 14 }}>
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}
                            >
                              Weekly Boss Battle
                            </Text>

                            {apoBossAttempt ? (
                              <Text style={{ color: theme.colors.goldPressed, fontWeight: "900" }}>
                                {apoBossAttempt.completed ? "COMPLETED ✅" : "IN PROGRESS"}
                              </Text>
                            ) : (
                              <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
                                {apoBoss ? "AVAILABLE" : "NOT SEEDED"}
                              </Text>
                            )}
                          </View>

                          {apoBoss ? (
                            <>
                              <Text
                                style={{
                                  color: theme.colors.text,
                                  marginTop: 10,
                                  fontWeight: "900",
                                }}
                              >
                                {apoBoss.title}
                              </Text>

                              {!!apoBoss.description ? (
                                <Text style={{ color: theme.colors.text2, marginTop: 8, lineHeight: 20 }}>
                                  {apoBoss.description}
                                </Text>
                              ) : null}

                              <Text style={{ color: theme.colors.text2, marginTop: 10 }}>
                                Rewards: +{safeNum(apoBoss.xp_reward_total)} XP • +{safeNum(
                                  apoBoss.light_points_bonus_total
                                )}{" "}
                                LP bonus
                              </Text>

                              <View style={{ marginTop: 10 }}>
                                <GlowButton title="Enter Arena" onPress={openBoss} />
                              </View>
                            </>
                          ) : (
                            <Text style={{ color: theme.colors.muted, marginTop: 10 }}>
                              No boss battle seeded for this week yet.
                            </Text>
                          )}
                        </GlowCard>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            </View>

            {/* Victory Modal (themed) */}
            <Modal
              visible={victoryOpen}
              transparent
              animationType="slide"
              onRequestClose={() => setVictoryOpen(false)}
            >
              <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
                <View
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderTopLeftRadius: 18,
                    borderTopRightRadius: 18,
                    padding: 16,
                    borderTopWidth: 1,
                    borderColor: theme.colors.goldOutline,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
                      Victory check-in
                    </Text>
                    <Pressable onPress={() => setVictoryOpen(false)}>
                      <Text style={{ color: theme.colors.sage, fontWeight: "900" }}>Close</Text>
                    </Pressable>
                  </View>

                  <Text style={{ color: theme.colors.goldPressed, marginTop: 10, fontWeight: "900" }}>
                    +{Number(victoryMission?.reward_points || 0) + streakBonusPerMission} points
                  </Text>

                  <Text style={{ color: theme.colors.text2, marginTop: 6 }}>
                    Base +{Number(victoryMission?.reward_points || 0)} • Streak bonus +{streakBonusPerMission} (cap{" "}
                    {STREAK_BONUS_CAP})
                  </Text>

                  <Text style={{ color: theme.colors.text, marginTop: 10, lineHeight: 20 }}>
                    {victoryMission?.mission_title || "—"}
                  </Text>

                  {victoryMission?.discipline === "service" && victoryMission?.allows_unseen_act ? (
                    <Pressable
                      onPress={() => setVictoryUnseen((v) => !v)}
                      style={{
                        marginTop: 12,
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: victoryUnseen ? theme.colors.sageTint : theme.colors.surfaceAlt,
                        borderWidth: 1,
                        borderColor: victoryUnseen ? theme.colors.sageOutline : NEUTRAL_BORDER,
                      }}
                    >
                      <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                        {victoryUnseen ? "Unseen Act: ON (private)" : "Unseen Act: OFF"}
                      </Text>
                      <Text style={{ color: theme.colors.text2, marginTop: 6 }}>
                        If you served quietly, keep it unseen.
                      </Text>
                    </Pressable>
                  ) : null}

                  <Text style={{ color: theme.colors.text, fontWeight: "900", marginTop: 14 }}>
                    Optional: one-line note (for you)
                  </Text>

                  <TextInput
                    value={victoryNote}
                    onChangeText={setVictoryNote}
                    placeholder="Example: I chose peace over panic."
                    placeholderTextColor={theme.colors.muted}
                    style={[
                      theme.input.box,
                      {
                        marginTop: 8,
                      },
                    ]}
                  />

                  <View style={{ marginTop: 14 }}>
                    <GlowButton
                      title={savingComplete ? "Saving..." : "Complete mission"}
                      onPress={confirmCompleteMission}
                      disabled={savingComplete}
                      variant="primary"
                    />
                  </View>
                </View>
              </View>
            </Modal>

       {/* Weekly Challenge Commitment Modal */}
<Modal
  visible={commitmentModalOpen}
  transparent
  animationType="fade"
  statusBarTranslucent
  onRequestClose={() => setCommitmentModalOpen(false)}
>
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : undefined}
    keyboardVerticalOffset={0}
  >
    <View
      style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 16,
        // Android: push the whole modal upward when keyboard is open
        paddingBottom: 16 + (Platform.OS === "android" ? kbHeight : 0),
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 520,
          backgroundColor: theme.colors.surface,
          borderRadius: 18,
          padding: 16,
          borderWidth: 1,
          borderColor: theme.colors.goldOutline,
          // Give it more room; internal ScrollView will handle overflow
          maxHeight: "90%",
        }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 10 }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
              Weekly Challenge Commitment
            </Text>

            <Pressable onPress={() => setCommitmentModalOpen(false)} hitSlop={10}>
              <Text style={{ color: theme.colors.sage, fontWeight: "900" }}>Close</Text>
            </Pressable>
          </View>

          <Text style={{ color: theme.colors.text2, marginTop: 10, lineHeight: 20 }}>
            Write what you are committing to this week. Once you press Start Challenge, sharing becomes available.
          </Text>

          <Text style={{ color: theme.colors.text, fontWeight: "900", marginTop: 14 }}>
            My commitment
          </Text>

          <TextInput
            value={weeklyCommitmentText}
            onChangeText={onChangeWeeklyCommitmentText}
            placeholder="Example: I will complete this challenge every day after breakfast."
            placeholderTextColor={theme.colors.muted}
            style={[theme.input.box, { marginTop: 8, minHeight: 120 }]}
            multiline
            textAlignVertical="top"
          />

          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <View style={{ flex: 1 }}>
              <GlowButton
                title="Cancel"
                onPress={() => setCommitmentModalOpen(false)}
                variant="outline"
              />
            </View>

            <View style={{ flex: 1 }}>
              <GlowButton
                title={commitmentSaving || commitmentSharing ? "Please wait..." : "Start Challenge"}
                onPress={handleStartWeeklyChallenge}
                disabled={commitmentSaving || commitmentSharing}
                variant="primary"
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  </KeyboardAvoidingView>
</Modal>


            {/* Share Modal (themed) */}
            <Modal
              visible={shareOpen}
              transparent
              animationType="slide"
              onRequestClose={() => setShareOpen(false)}
            >
              <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
                <View
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderTopLeftRadius: 18,
                    borderTopRightRadius: 18,
                    padding: 16,
                    borderTopWidth: 1,
                    borderColor: theme.colors.goldOutline,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
                      Share progress
                    </Text>
                    <Pressable onPress={() => setShareOpen(false)}>
                      <Text style={{ color: theme.colors.sage, fontWeight: "900" }}>Close</Text>
                    </Pressable>
                  </View>

                  <Text style={{ color: theme.colors.text2, marginTop: 8, lineHeight: 20 }}>
                    This saves a share draft for your Home feed integration step.
                  </Text>

                  <Text style={{ color: theme.colors.text, fontWeight: "900", marginTop: 12 }}>Visibility</Text>
                  <View style={{ flexDirection: "row", marginTop: 10, flexWrap: "wrap" }}>
                    {["public", "friends", "private"].map((v) => {
                      const active = shareVisibility === v;
                      return (
                        <Pressable
                          key={v}
                          onPress={() => setShareVisibility(v)}
                          style={{
                            marginRight: 10,
                            marginBottom: 10,
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderRadius: 999,
                            backgroundColor: active ? theme.colors.goldHalo : theme.colors.surface,
                            borderWidth: 1,
                            borderColor: active ? theme.colors.gold : NEUTRAL_BORDER,
                          }}
                        >
                          <Text style={{ color: theme.colors.text, fontWeight: "900" }}>{v}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={{ color: theme.colors.text, fontWeight: "900", marginTop: 4 }}>
                    Optional message
                  </Text>

                  <TextInput
                    value={shareText}
                    onChangeText={setShareText}
                    placeholder="Example: God met me today. I chose obedience."
                    placeholderTextColor={theme.colors.muted}
                    style={[
                      theme.input.box,
                      {
                        marginTop: 8,
                      },
                    ]}
                  />

                  <View style={{ marginTop: 14 }}>
                    <GlowButton
                      title={shareSaving ? "Saving..." : "Save share draft"}
                      onPress={saveShare}
                      disabled={shareSaving}
                      variant="primary"
                    />
                  </View>
                </View>
              </View>
            </Modal>

            {/* Faith Coach Modal (verse coach) - themed */}
            <Modal
              visible={coachOpen}
              transparent
              animationType="slide"
              onRequestClose={() => setCoachOpen(false)}
            >
              <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
                <View
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderTopLeftRadius: 18,
                    borderTopRightRadius: 18,
                    padding: 16,
                    maxHeight: "80%",
                    borderTopWidth: 1,
                    borderColor: theme.colors.goldOutline,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
                      Faith Coach
                    </Text>
                    <Pressable onPress={() => setCoachOpen(false)}>
                      <Text style={{ color: theme.colors.sage, fontWeight: "900" }}>Close</Text>
                    </Pressable>
                  </View>

                  <ScrollView style={{ marginTop: 12 }}>
                    {coachLoading ? (
                      <ActivityIndicator color={theme.colors.gold} />
                    ) : coachData ? (
                      <>
                        <Text style={{ color: theme.colors.text, fontWeight: "900", marginTop: 8 }}>Context</Text>
                        <Text style={{ color: theme.colors.text2, marginTop: 6, lineHeight: 22 }}>
                          {coachData.context_text}
                        </Text>

                        <Text style={{ color: theme.colors.text, fontWeight: "900", marginTop: 14 }}>Meaning</Text>
                        <Text style={{ color: theme.colors.text2, marginTop: 6, lineHeight: 22 }}>
                          {coachData.theological_meaning}
                        </Text>

                        <Text style={{ color: theme.colors.text, fontWeight: "900", marginTop: 14 }}>Practice</Text>
                        <Text style={{ color: theme.colors.text2, marginTop: 6, lineHeight: 22 }}>
                          {coachData.practical_application}
                        </Text>

                        {Array.isArray(coachData.related_scripture) && coachData.related_scripture.length ? (
                          <>
                            <Text style={{ color: theme.colors.text, fontWeight: "900", marginTop: 14 }}>
                              Related Scripture
                            </Text>
                            {coachData.related_scripture.map((r) => (
                              <Text key={r} style={{ color: theme.colors.sage, marginTop: 6, fontWeight: "800" }}>
                                • {r}
                              </Text>
                            ))}
                          </>
                        ) : null}
                      </>
                    ) : (
                      <Text style={{ color: theme.colors.text }}>No Faith Coach content found for this verse.</Text>
                    )}
                  </ScrollView>
                </View>
              </View>
            </Modal>

            {/* Study Brief Modal (used in Step 2) - themed */}
            <Modal
              visible={studyBriefOpen}
              transparent
              animationType="slide"
              onRequestClose={() => setStudyBriefOpen(false)}
            >
              <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
                <View
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderTopLeftRadius: 18,
                    borderTopRightRadius: 18,
                    padding: 16,
                    maxHeight: "80%",
                    borderTopWidth: 1,
                    borderColor: theme.colors.goldOutline,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
                      {studyBriefItem?.lane ? `${studyBriefItem.lane} Brief` : "Study Brief"}
                    </Text>
                    <Pressable onPress={() => setStudyBriefOpen(false)}>
                      <Text style={{ color: theme.colors.sage, fontWeight: "900" }}>Close</Text>
                    </Pressable>
                  </View>

                  <ScrollView style={{ marginTop: 12 }} keyboardShouldPersistTaps="handled">
                    <View
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        backgroundColor: theme.colors.surfaceAlt,
                        borderWidth: 1,
                        borderColor: NEUTRAL_BORDER,
                      }}
                    >
                      <Text style={{ color: theme.colors.goldPressed, fontWeight: "900", fontSize: 16 }}>
                        {studyBriefItem?.title || "—"}
                      </Text>

                      {!!studyBriefItem?.proof ? (
                        <>
                          <Text style={{ color: theme.colors.text, fontWeight: "900", marginTop: 12 }}>
                            The point (what you’re learning)
                          </Text>
                          <Text style={{ color: theme.colors.text2, marginTop: 6, lineHeight: 20 }}>
                            {studyBriefItem.proof}
                          </Text>
                        </>
                      ) : null}

                      {!!studyBriefItem?.howToUse ? (
                        <>
                          <Text style={{ color: theme.colors.text, fontWeight: "900", marginTop: 12 }}>
                            How to use it in a debate
                          </Text>
                          <Text style={{ color: theme.colors.text2, marginTop: 6, lineHeight: 20 }}>
                            {studyBriefItem.howToUse}
                          </Text>
                        </>
                      ) : null}

                      {!!studyBriefItem?.muslimAngle ? (
                        <>
                          <Text style={{ color: theme.colors.text, fontWeight: "900", marginTop: 12 }}>
                            If your opponent is Muslim
                          </Text>
                          <Text style={{ color: theme.colors.text2, marginTop: 6, lineHeight: 20 }}>
                            {studyBriefItem.muslimAngle}
                          </Text>
                        </>
                      ) : null}

                      {Array.isArray(studyBriefItem?.refs) && studyBriefItem.refs.length ? (
                        <>
                          <Text style={{ color: theme.colors.text, fontWeight: "900", marginTop: 12 }}>
                            What to look up / references
                          </Text>
                          {studyBriefItem.refs.map((r, idx) => (
                            <Text
                              key={`ref-${idx}`}
                              style={{ color: theme.colors.sage, marginTop: 6, fontWeight: "800" }}
                            >
                              • {r}
                            </Text>
                          ))}
                        </>
                      ) : null}
                    </View>

                    <View style={{ marginTop: 14 }}>
                      <GlowButton title="Done" onPress={() => setStudyBriefOpen(false)} />
                    </View>
                  </ScrollView>
                </View>
              </View>
            </Modal>

            {/* Boss Battle Modal - themed */}
            <Modal
              visible={bossOpen}
              transparent
              animationType="slide"
              onRequestClose={() => setBossOpen(false)}
            >
              <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
                <View
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderTopLeftRadius: 18,
                    borderTopRightRadius: 18,
                    padding: 16,
                    maxHeight: "88%",
                    borderTopWidth: 1,
                    borderColor: theme.colors.goldOutline,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
                      Weekly Boss Battle
                    </Text>
                    <Pressable onPress={() => setBossOpen(false)}>
                      <Text style={{ color: theme.colors.sage, fontWeight: "900" }}>Close</Text>
                    </Pressable>
                  </View>

                  <ScrollView style={{ marginTop: 12 }} keyboardShouldPersistTaps="handled">
                    <Text style={{ color: theme.colors.text, fontWeight: "900" }}>{apoBoss?.title || "—"}</Text>

                    {!!apoBoss?.description ? (
                      <Text style={{ color: theme.colors.text2, marginTop: 8, lineHeight: 20 }}>
                        {apoBoss.description}
                      </Text>
                    ) : null}

                    <Text style={{ color: theme.colors.text2, marginTop: 10 }}>
                      Rewards: +{safeNum(apoBoss?.xp_reward_total)} XP • +{safeNum(apoBoss?.light_points_bonus_total)}{" "}
                      LP bonus
                    </Text>

                    <Text style={{ color: theme.colors.text, fontWeight: "900", marginTop: 14 }}>Rounds</Text>

                    {Array.isArray(apoBoss?.rounds) && apoBoss.rounds.length ? (
                      <View style={{ marginTop: 8 }}>
                        {apoBoss.rounds.map((r, idx) => (
                          <View
                            key={`round-${idx}`}
                            style={{
                              marginTop: 10,
                              padding: 12,
                              borderRadius: 12,
                              backgroundColor: theme.colors.surfaceAlt,
                              borderWidth: 1,
                              borderColor: NEUTRAL_BORDER,
                            }}
                          >
                            <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                              {r.title || `Round ${idx + 1}`}
                            </Text>
                            <Text style={{ color: theme.colors.text2, marginTop: 6, lineHeight: 20 }}>
                              {r.prompt || "—"}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={{ color: theme.colors.muted, marginTop: 8 }}>No rounds found.</Text>
                    )}

                    <View style={{ marginTop: 14 }}>
                      <GlowButton
                        title={bossSaving ? "Entering..." : "Enter Arena (start / resume)"}
                        onPress={enterBossArena}
                        disabled={bossSaving}
                        variant="primary"
                      />
                    </View>

                    <Text style={{ color: theme.colors.muted, marginTop: 10, lineHeight: 18 }}>
                      Next build step: make this playable round-by-round with Faith Coach upgrades after each round.
                    </Text>
                  </ScrollView>
                </View>
              </View>
            </Modal>

            {/* Scripture Reader Modal */}
            <ScriptureReaderModal
              open={scriptureOpen}
              onClose={() => setScriptureOpen(false)}
              reference={scriptureRef || verse?.ref || ""}
              translation={verse?.translation || "WEB"}
            />
          </ScrollView>
        </>
      )}
    </Screen>
  );
}
