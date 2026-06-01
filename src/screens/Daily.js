// src/screens/Daily.js
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import LottieView from "lottie-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
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
import Reanimated, {
  Easing as ReanimatedEasing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import formationConfetti from "../assets/lottie/formation-confetti.json";
import formationDove from "../assets/lottie/formation-dove.json";
import GlowButton from "../components/GlowButton";
import GlowCard from "../components/GlowCard";
import WeeklyChallengeSpotlight from "../components/WeeklyChallengeSpotlight";
import WeeklyMessageCard from "../components/WeeklyMessageCard";
import {
  fetchUpcomingEvents,
  formatEventDateTime,
} from "../features/events/services/eventsService";
import { HOME_COMMUNITY_ID } from "../lib/constants";
import { theme } from "../theme/theme";



// --- Premium Triunely Daily visual system ---
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

// Keep these because the mission carousel still uses silver/gold status rings.
const SILVER = "#C9CED8";
const SILVER_DIM = "rgba(201,206,216,0.55)";
const SILVER_HALO = "rgba(201,206,216,0.12)";

// Keep these existing variable names so older sections do not break.
const NEUTRAL_BORDER = CARD_BORDER;
const NEUTRAL_SHADOW = SHADOW;
const PARCHMENT = "rgba(255, 252, 245, 1)";
const SAGE_BAND = OLIVE_SOFT;
const SECTION_GAP = 18;

const displayFont = Platform.OS === "ios" ? "Georgia" : "serif";

const serifHeading = {
  fontFamily: displayFont,
  color: TEXT,
  fontWeight: "900",
  letterSpacing: -0.45,
};

const SCRIPTURE_IMAGES = [
  require("../assets/scripture/scripture-1.jpg"),
  require("../assets/scripture/scripture-2.jpg"),
  require("../assets/scripture/scripture-3.jpg"),
  require("../assets/scripture/scripture-4.jpg"),
  require("../assets/scripture/scripture-5.jpg"),
  require("../assets/scripture/scripture-6.jpg"),
  require("../assets/scripture/scripture-7.jpg"),
  require("../assets/scripture/scripture-8.jpg"),
  require("../assets/scripture/scripture-9.jpg"),
  require("../assets/scripture/scripture-10.jpg"),
  require("../assets/scripture/scripture-11.jpg"),
  require("../assets/scripture/scripture-12.jpg"),
  require("../assets/scripture/scripture-13.jpg"),
  require("../assets/scripture/scripture-14.jpg"),
];

const getDayOfYear = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;

  return Math.floor(diff / oneDay);
};

const scriptureImageForToday = () => {
  const dayOfYear = getDayOfYear();
  const index = dayOfYear % SCRIPTURE_IMAGES.length;

  return SCRIPTURE_IMAGES[index];
};
const premiumCardStyle = {
  backgroundColor: SURFACE,
  borderRadius: 24,
  borderWidth: 1,
  borderColor: CARD_BORDER,
  shadowColor: SHADOW,
  shadowOpacity: 0.09,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 5 },
  elevation: 3,
};

const DISCIPLINE_META = {
  scripture: { label: "Scripture", icon: "📖", blurb: "Truth that resets your mind." },
  prayer: { label: "Prayer", icon: "🙏", blurb: "Connection, not performance." },
  obedience: { label: "Obedience", icon: "✅", blurb: "Faith with feet." },
  service: { label: "Service", icon: "🤝", blurb: "Love made visible." },
  renunciation: { label: "Renunciation", icon: "🛡️", blurb: "Freedom over impulse." },
};

const DISCIPLINES = ["scripture", "prayer", "obedience", "service", "renunciation"];


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

  // Build the date using LOCAL calendar values first.
  // This avoids toISOString() shifting the date backwards/forwards.
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();
  const day = now.getDay(); // 0 Sun .. 6 Sat

  // Monday = start of week
  const diffToMonday = (day + 6) % 7;

  const monday = new Date(year, month, date - diffToMonday);
  const sunday = new Date(year, month, date - diffToMonday + 6);

  const toLocalISODate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  return {
    week_start: toLocalISODate(monday),
    week_end: toLocalISODate(sunday),
  };
}

async function getUserChurchForDaily(userId) {
  if (!userId) return null;

  // 1) First try normal approved church membership
  const { data: memberships, error: memErr } = await supabase
    .from("church_memberships")
    .select("church_id, status, created_at")
    .eq("user_id", userId)
    .eq("status", "approved")
    .order("created_at", { ascending: true })
    .limit(1);

  if (memErr) {
    console.log("Daily church lookup: membership load error:", memErr);
  }

  const membership = memberships?.[0];

  if (membership?.church_id) {
    return {
      church_id: membership.church_id,
      source: "membership",
    };
  }

  // 2) Then try church admin/owner/editor access
  const { data: adminRows, error: adminErr } = await supabase
    .from("church_admins")
    .select("church_id, role, created_at")
    .eq("user_id", userId)
    .in("role", ["owner", "admin", "editor"])
    .order("created_at", { ascending: true })
    .limit(1);

  if (adminErr) {
    console.log("Daily church lookup: admin load error:", adminErr);
    return null;
  }

  const adminRow = adminRows?.[0];

  if (adminRow?.church_id) {
    return {
      church_id: adminRow.church_id,
      source: "admin",
      role: adminRow.role,
    };
  }

  return null;
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
const [dailyEventsLoading, setDailyEventsLoading] = useState(false);
const [dailyEvents, setDailyEvents] = useState([]);
const [noticeboardUnreadCount, setNoticeboardUnreadCount] = useState(0);

  // Hidden Daily preview switcher
const [dayOverride, setDayOverride] = useState(null);
const [dailyPreviewOpen, setDailyPreviewOpen] = useState(false);

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
  const [savingComplete, setSavingComplete] = useState(false);

  const celebrationCardScale = useSharedValue(0.92);
const celebrationCardOpacity = useSharedValue(0);
const celebrationGlowScale = useSharedValue(0.72);
const celebrationGlowOpacity = useSharedValue(0);
const celebrationDoveFloat = useSharedValue(0);
const celebrationDoveScale = useSharedValue(0.9);
const celebrationProgress = useSharedValue(0);
const celebrationMilestoneScale = useSharedValue(0.4);
const celebrationMilestoneOpacity = useSharedValue(0);


  // Formation celebration modal
const [formationCelebrationOpen, setFormationCelebrationOpen] = useState(false);
const [formationCelebrationMission, setFormationCelebrationMission] = useState(null);
const [formationCelebrationCount, setFormationCelebrationCount] = useState(0);

  // Share modal
  const [shareOpen, setShareOpen] = useState(false);
  const [shareText, setShareText] = useState("");
  const [shareSaving, setShareSaving] = useState(false);
  const [shareVisibility, setShareVisibility] = useState("public");
  const shareSheetTranslateY = useRef(new Animated.Value(0)).current;
const shareSheetBaseYRef = useRef(0);

const SHARE_SHEET_COLLAPSED_Y = 0;
const SHARE_SHEET_EXPANDED_Y = -260;

const animateShareSheetTo = useCallback(
  (toValue) => {
    Animated.spring(shareSheetTranslateY, {
      toValue,
      damping: 18,
      stiffness: 160,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
  },
  [shareSheetTranslateY]
);

const closeShareSheet = useCallback(() => {
  Animated.timing(shareSheetTranslateY, {
    toValue: 40,
    duration: 160,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  }).start(() => {
    shareSheetTranslateY.setValue(0);
    setShareOpen(false);
  });
}, [shareSheetTranslateY]);

const shareSheetPanResponder = useMemo(
  () =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 6,

      onPanResponderGrant: () => {
        shareSheetTranslateY.stopAnimation((value) => {
          shareSheetBaseYRef.current = value;
        });
      },

      onPanResponderMove: (_, gestureState) => {
        const nextY = Math.max(
          SHARE_SHEET_EXPANDED_Y,
          Math.min(90, shareSheetBaseYRef.current + gestureState.dy)
        );

        shareSheetTranslateY.setValue(nextY);
      },

      onPanResponderRelease: (_, gestureState) => {
        const finalY = shareSheetBaseYRef.current + gestureState.dy;

        if (gestureState.dy > 140 && finalY > 20) {
          closeShareSheet();
          return;
        }

        if (finalY < -90) {
          animateShareSheetTo(SHARE_SHEET_EXPANDED_Y);
          return;
        }

        animateShareSheetTo(SHARE_SHEET_COLLAPSED_Y);
      },
    }),
  [animateShareSheetTo, closeShareSheet, shareSheetTranslateY]
);

useEffect(() => {
  if (shareOpen) {
    shareSheetTranslateY.setValue(0);
  }
}, [shareOpen, shareSheetTranslateY]);

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
const [scriptureY, setScriptureY] = useState(0);
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

const scrollToScripture = useCallback(() => {
  const y = Math.max((scriptureY || 0) - 12, 0);
  scrollRef.current?.scrollTo({ y, animated: true });
}, [scriptureY]);

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



  const missionsByDiscipline = useMemo(() => groupMissions(board?.missions || []), [board]);

  const completedByDiscipline = board?.completedByDiscipline || {};
  const completedCount = useMemo(() => {
    let n = 0;
    for (const d of DISCIPLINES) if (completedByDiscipline?.[d]) n += 1;
    return n;
  }, [completedByDiscipline]);

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
  const silent = !!opts.silent;

  if (!silent) setLoading(true);

  const dayNumberOverride = opts.dayNumberOverride ?? dayOverride ?? undefined;

  const res = await loadDailyV2Board({ dayNumberOverride });
  setBoard(res);

  if (!silent) setLoading(false);

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

    console.log("WM DEBUG 1 week_start:", week_start);

    // 1) Get user's church access for Daily
// Normal approved members come from church_memberships.
// Church admins/owners/editors may only exist in church_admins.
const userChurch = await getUserChurchForDaily(user.id);

if (!userChurch?.church_id) {
  setWeeklyMsg(null);
  return;
}

const churchId = userChurch.church_id;

    // 2) Fetch church name
    let churchName = "Church";
    const { data: churchRow, error: churchErr } = await supabase
      .from("churches")
      .select("name, display_name")
      .eq("id", churchId)
      .maybeSingle();

    if (!churchErr && (churchRow?.display_name || churchRow?.name)) {
  churchName = churchRow.display_name || churchRow.name;
}

    // 3) Fetch this week's weekly message (published or not)
    // NOTE: We fetch the row for the week; if none exists, we still keep church context.
    const { data: msg, error: msgErr } = await supabase
      .from("church_weekly_messages")
      .select("id, church_id, week_start, video_url, speaker_label, title, status, source_label")
      .eq("church_id", churchId)
      .eq("week_start", week_start)
      .maybeSingle();

      console.log("Daily WeeklyMessage churchId:", churchId);
console.log("Daily WeeklyMessage msg:", msg);
console.log("Daily WeeklyMessage msgErr:", msgErr);

    if (msgErr) {
      console.log("WeeklyMessage: message load error:", msgErr);
      // Still keep church context even if message fetch fails
      setWeeklyMsg({
        id: null,
        church_id: churchId,
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
        church_id: churchId,
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
      church_id: msg.church_id ?? churchId,
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

  
    // 1) Get user's church access for Daily
// Normal approved members come from church_memberships.
// Church admins/owners/editors may only exist in church_admins.
const userChurch = await getUserChurchForDaily(user.id);

if (!userChurch?.church_id) {
  setWeeklyChallenge(null);
  return;
}

const churchId = userChurch.church_id;

    // 2) Fetch this week's published weekly challenge
    const { data: ch, error: chErr } = await supabase
      .from("church_weekly_challenges")
      .select("id, church_id, week_start, title, description, why_it_matters, scripture_refs, action_label, action_url, lp_bonus, status, discipline")
      .eq("church_id", churchId)
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

const loadDailyEvents = useCallback(async () => {
  try {
    setDailyEventsLoading(true);

    const res = await fetchUpcomingEvents({ limit: 3 });

    if (!res?.ok) {
      console.log("Daily upcoming events load error:", res?.error);
      setDailyEvents([]);
      return;
    }

    setDailyEvents(Array.isArray(res.events) ? res.events.slice(0, 3) : []);
  } catch (e) {
    console.log("Daily upcoming events unexpected error:", e);
    setDailyEvents([]);
  } finally {
    setDailyEventsLoading(false);
  }
}, []);

const loadNoticeboardUnreadCount = useCallback(async () => {
  try {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      setNoticeboardUnreadCount(0);
      return;
    }

    const userChurch = await getUserChurchForDaily(user.id);

    if (!userChurch?.church_id) {
      setNoticeboardUnreadCount(0);
      return;
    }

    const churchId = userChurch.church_id;

    const { data: readRow, error: readErr } = await supabase
      .from("church_noticeboard_reads")
      .select("last_seen_at")
      .eq("user_id", user.id)
      .eq("church_id", churchId)
      .maybeSingle();

    if (readErr) {
      console.log("Daily noticeboard read row error:", readErr);
    }

    const lastSeenAt = readRow?.last_seen_at || "1970-01-01T00:00:00.000Z";

    const { count, error: countErr } = await supabase
      .from("church_noticeboard_posts")
      .select("id", { count: "exact", head: true })
      .eq("church_id", churchId)
      .gt("created_at", lastSeenAt);

    if (countErr) {
      console.log("Daily noticeboard unread count error:", countErr);
      setNoticeboardUnreadCount(0);
      return;
    }

    setNoticeboardUnreadCount(Number(count || 0));
  } catch (e) {
    console.log("Daily noticeboard unread count unexpected error:", e);
    setNoticeboardUnreadCount(0);
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
    loadDailyEvents();
    loadNoticeboardUnreadCount();
  }, [
    loadWeeklyMessage,
    loadWeeklyChallenge,
    loadDailyEvents,
    loadNoticeboardUnreadCount,
  ])
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

useEffect(() => {
if (!formationCelebrationOpen) {
  celebrationCardScale.value = 0.92;
  celebrationCardOpacity.value = 0;
  celebrationGlowScale.value = 0.72;
  celebrationGlowOpacity.value = 0;
  celebrationDoveFloat.value = 0;
  celebrationDoveScale.value = 0.9;
  celebrationProgress.value = 0;
  celebrationMilestoneScale.value = 0.4;
  celebrationMilestoneOpacity.value = 0;
  return;
}

celebrationMilestoneScale.value = 0.4;
celebrationMilestoneOpacity.value = 0;

  celebrationCardOpacity.value = withTiming(1, {
    duration: 220,
    easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
  });

  celebrationCardScale.value = withSpring(1, {
    damping: 14,
    stiffness: 160,
  });

  celebrationGlowOpacity.value = withTiming(1, {
    duration: 350,
    easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
  });

  celebrationGlowScale.value = withSpring(
    formationCelebrationCount >= 5 ? 1.2 : 1.05,
    {
      damping: 14,
      stiffness: 120,
    }
  );

  celebrationDoveScale.value = withSpring(1, {
    damping: 12,
    stiffness: 180,
  });

  celebrationDoveFloat.value = withRepeat(
    withSequence(
      withTiming(-8, {
        duration: 1800,
        easing: ReanimatedEasing.inOut(ReanimatedEasing.sin),
      }),
      withTiming(0, {
        duration: 1800,
        easing: ReanimatedEasing.inOut(ReanimatedEasing.sin),
      })
    ),
    -1,
    true
  );

  celebrationProgress.value = withTiming(
    Math.min(1, formationCelebrationCount / 5),
    {
      duration: 750,
      easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
    }
  );
  celebrationMilestoneOpacity.value = withDelay(
  680,
  withSequence(
    withTiming(1, { duration: 90 }),
    withTiming(0, { duration: 520 })
  )
);

celebrationMilestoneScale.value = withDelay(
  680,
  withSequence(
    withTiming(1.15, {
      duration: 120,
      easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
    }),
    withTiming(2.2, {
      duration: 520,
      easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
    })
  )
);

}, [formationCelebrationOpen, formationCelebrationCount]);

const animatedCelebrationCardStyle = useAnimatedStyle(() => ({
  opacity: celebrationCardOpacity.value,
  transform: [{ scale: celebrationCardScale.value }],
}));

const animatedCelebrationGlowStyle = useAnimatedStyle(() => ({
  opacity: celebrationGlowOpacity.value,
  transform: [{ scale: celebrationGlowScale.value }],
}));

const animatedCelebrationDoveStyle = useAnimatedStyle(() => ({
  transform: [
    { translateY: celebrationDoveFloat.value },
    { scale: celebrationDoveScale.value },
  ],
}));

const animatedCelebrationProgressStyle = useAnimatedStyle(() => ({
  width: `${celebrationProgress.value * 100}%`,
}));

const animatedCelebrationMilestoneStyle = useAnimatedStyle(() => ({
  opacity: celebrationMilestoneOpacity.value,
  transform: [{ scale: celebrationMilestoneScale.value }],
}));

function getFormationCelebrationTitle(count) {
  if (count >= 5) return "Day Complete";
  if (count === 4) return "Nearly There";
  if (count === 3) return "Your Rhythm Is Forming";
  if (count === 2) return "Keep Walking";
  return "A Faithful Step";
}

function getFormationCelebrationBody(count) {
  if (count >= 5) {
    return "Beautiful. You completed today’s full formation rhythm. Scripture, prayer, obedience, service and renunciation are shaping your walk with God.";
  }

  if (count === 4) {
    return "You’re close to completing today’s formation rhythm. Keep walking faithfully.";
  }

  if (count === 3) {
    return "This is becoming a rhythm now. Small faithful practices are shaping something real.";
  }

  if (count === 2) {
    return "Two practices complete. Keep going — quiet consistency matters.";
  }

  return "One obedient step matters. Formation grows through faithful moments like this.";
}


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

 const startCompleteMission = async (mission) => {
  if (!board?.day?.id || !mission) return;

  if (completedByDiscipline?.[mission.discipline]) {
    Alert.alert(
      "Already complete",
      "You’ve already completed a practice for this discipline today."
    );
    return;
  }

  try {
    setSavingComplete(true);

    const nextCompletedCount = Math.min(5, Number(completedCount || 0) + 1);

    const res = await completeMissionV2({
      dayId: board.day.id,
      mission,
      unseenAct: false,
      reflectionText: "",
    });

    if (!res.ok) {
      Alert.alert("Couldn’t mark complete", res.error || "Try again.");
      return;
    }

  setFormationCelebrationMission(mission);
setFormationCelebrationCount(nextCompletedCount);
setFormationCelebrationOpen(true);

await reload({ silent: true });
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

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      Alert.alert("Share", "You must be logged in to share.");
      return;
    }

    const completedMissionIds = new Set(
      (board?.completions || []).map((c) => c.mission_id)
    );

    const completedMissions = (board?.missions || []).filter((m) =>
      completedMissionIds.has(m.id)
    );

    const completedCountForShare = Math.min(
      5,
      Number(completedMissions.length || completedCount || 0)
    );

    const formationTitle =
      completedCountForShare >= 5
        ? "Daily Formation Complete"
        : "Daily Formation Progress";

    const optionalMessage = String(shareText || "").trim();

    const completedLines = completedMissions.length
      ? completedMissions
          .map((m) => {
            const label = DISCIPLINE_META?.[m.discipline]?.label || m.discipline;
            return `• ${label}: ${m.mission_title}`;
          })
          .join("\n")
      : "• Formation practice completed";

    const content =
      `${formationTitle}\n` +
      `${completedCountForShare}/5 practices completed today\n\n` +
      `${completedLines}` +
      (optionalMessage ? `\n\n${optionalMessage}` : "");

    const payload = {
      pack_id: board?.pack?.id,
      pack_name: board?.pack?.name,
      day_number: board?.dayNumber,
      day_title: board?.day?.title,
      verse_ref: board?.verse?.ref,
      completed: completedMissions.map((m) => ({
        discipline: m.discipline,
        title: m.mission_title,
        unseen_allowed: m.allows_unseen_act,
      })),
      completed_count: completedCountForShare,
      formation_progress: {
        completed: completedCountForShare,
        total: 5,
      },
    };

    // Keep the formation share record for future analytics/history.
    await upsertDailyShareV2({
      dayId: board.day.id,
      visibility: "fellowship",
      postText: optionalMessage,
      payload,
    });

// Create the actual Home feed post.
const { error: postErr } = await supabase.from("posts").insert({
  user_id: user.id,
  community_id: HOME_COMMUNITY_ID,

  // This matches the existing Weekly Challenge Home feed share pattern.
  // If your feed later gets a dedicated "fellowship" visibility, we can switch this.
  visibility: "communities",

  is_anonymous: false,

  // Keep the user’s own words as the visible post message.
  // The premium Formation card will show the formation summary separately.
  content: optionalMessage,

  url: null,

  // These fields tell the feed to render this as a premium Formation Share Card.
  media_type: "formation_share",
  media_url: null,
  link_title: formationTitle,
  link_description: `${completedCountForShare}/5 practices completed today`,
  link_image: null,
});

    if (postErr) {
      console.log("Share formation -> posts error:", postErr);
      Alert.alert("Share", postErr.message || "Could not share to the feed.");
      return;
    }

    setShareOpen(false);
    Alert.alert("Shared", "Your Formation update has been shared to your fellowship feed.");
  } catch (e) {
    console.log("Share formation unexpected error:", e);
    Alert.alert("Share", "Could not share right now.");
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
    <Screen backgroundColor={PREMIUM_CREAM} padded>
      {() => (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActivityIndicator size="large" color={EVENT_AMBER} />

          <Text
            style={{
              color: MUTED,
              marginTop: 8,
              fontWeight: "800",
            }}
          >
            Loading Daily…
          </Text>
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
  if (!__DEV__ || !dailyPreviewOpen) return null;

  const computed = board?.computedDayNumber ?? board?.dayNumber ?? 1;
  const viewing = Number(dayOverride ?? board?.dayNumber ?? computed ?? 1);

  const goToDay = (day) => {
    const safeDay = Math.max(1, Math.min(30, Number(day || 1)));

    setDayOverride(safeDay);
    setOpenMissionId(null);

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  };

  const resetPreview = () => {
    setDayOverride(null);
    setOpenMissionId(null);

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  };

  const buttons = [
    { label: "Day 1", onPress: () => goToDay(1) },
    { label: "Day 10", onPress: () => goToDay(10) },
    { label: "Day 20", onPress: () => goToDay(20) },
    { label: "Day 30", onPress: () => goToDay(30) },
    { label: "◀ Prev", onPress: () => goToDay(viewing - 1) },
    { label: "Next ▶", onPress: () => goToDay(viewing + 1) },
    { label: "Reset", onPress: resetPreview, primary: true },
  ];

  return (
    <View
      style={{
        marginTop: 12,
        marginBottom: 16,
        padding: 12,
        borderRadius: 22,
        backgroundColor: SURFACE,
        borderWidth: 1,
        borderColor: AMBER_BORDER,
        shadowColor: SHADOW,
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
        elevation: 2,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text
            style={{
              color: EVENT_BROWN,
              fontSize: 13,
              fontWeight: "900",
            }}
          >
            Daily Preview
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 12,
              fontWeight: "700",
              marginTop: 2,
            }}
          >
            Viewing Day {viewing} • real cycle day {computed}
          </Text>
        </View>

        <Pressable
          onPress={() => setDailyPreviewOpen(false)}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: AMBER_SOFT,
            borderWidth: 1,
            borderColor: AMBER_BORDER,
          }}
        >
          <Ionicons name="close" size={18} color={EVENT_BROWN} />
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {buttons.map((b) => (
          <Pressable
            key={b.label}
            onPress={b.onPress}
            style={{
              paddingVertical: 9,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: b.primary ? EVENT_AMBER : AMBER_SOFT,
              borderWidth: 1,
              borderColor: b.primary ? EVENT_AMBER : AMBER_BORDER,
              marginRight: 8,
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                color: b.primary ? "#FFFFFF" : EVENT_BROWN,
                fontWeight: "900",
                fontSize: 12,
              }}
            >
              {b.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

  const missionsByDisciplineLocal = missionsByDiscipline;
  const completedByDisciplineLocal = completedByDiscipline;

  const renderMissionOption = (m, completed) => {
    const isMissionOpen = openMissionId === m.id;
    const disabled = completed;

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
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
  <Text
    style={{
      color: theme.colors.text,
      fontWeight: "900",
      flex: 1,
      paddingRight: 10,
    }}
  >
    {m.mission_title}
  </Text>

  <View
    style={{
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: disabled ? AMBER_SOFT : OLIVE_SOFT,
      borderWidth: 1,
      borderColor: disabled ? AMBER_BORDER : OLIVE_BORDER,
    }}
  >
    <Text
      style={{
        color: disabled ? EVENT_BROWN : OLIVE,
        fontWeight: "900",
        fontSize: 11,
      }}
    >
      {disabled ? "Completed" : "Practice"}
    </Text>
  </View>
</View>

<Text style={{ color: theme.colors.text2, marginTop: 8, lineHeight: 20 }}>
  {m.objective_line}
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
          disabled={disabled || savingComplete}
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
            {disabled
  ? "Completed for this discipline ✅"
  : savingComplete
    ? "Marking complete..."
    : "Mark Practice Complete"}
          </Text>
        </Pressable>
      </View>
    );
  };

    function DailyStatTile({ icon, label, value, subtext, tint = "amber" }) {
  const isOlive = tint === "olive";
  const accent = isOlive ? OLIVE : EVENT_AMBER;
  const bg = isOlive ? OLIVE_SOFT : AMBER_SOFT;
  const border = isOlive ? OLIVE_BORDER : AMBER_BORDER;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: SURFACE,
        borderRadius: 22,
        padding: 12,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        shadowColor: SHADOW,
        shadowOpacity: 0.08,
        shadowRadius: 9,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: border,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 9,
        }}
      >
        <Ionicons name={icon} size={17} color={accent} />
      </View>

      <Text
        style={{
          color: MUTED,
          fontWeight: "900",
          fontSize: 10.5,
          textTransform: "uppercase",
          letterSpacing: 0.35,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>

      <Text
        style={{
          color: TEXT,
          fontWeight: "900",
          fontSize: 20,
          marginTop: 3,
        }}
        numberOfLines={1}
      >
        {value}
      </Text>

      {!!subtext ? (
        <Text
          style={{
            color: MUTED,
            fontWeight: "700",
            fontSize: 10.5,
            marginTop: 2,
          }}
          numberOfLines={1}
        >
          {subtext}
        </Text>
      ) : null}
    </View>
  );
}

function SectionTitle({ title, subtitle, icon = "sparkles-outline", amber = true }) {
  const accent = amber ? EVENT_AMBER : OLIVE;
  const bg = amber ? AMBER_SOFT : OLIVE_SOFT;
  const border = amber ? AMBER_BORDER : OLIVE_BORDER;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: border,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
        }}
      >
        <Ionicons name={icon} size={19} color={accent} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            ...serifHeading,
            fontSize: 20,
            lineHeight: 25,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>

        {!!subtitle ? (
          <Text
            style={{
              color: MUTED,
              fontSize: 12.5,
              fontWeight: "700",
              lineHeight: 17,
              marginTop: 1,
            }}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function TodayPathTile({ icon, title, description, onPress, tint = "amber" }) {
  const isOlive = tint === "olive";
  const accent = isOlive ? OLIVE : EVENT_AMBER;
  const bg = isOlive ? OLIVE_SOFT : AMBER_SOFT;
  const border = isOlive ? OLIVE_BORDER : AMBER_BORDER;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: SURFACE,
        borderRadius: 20,
        padding: 14,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        shadowColor: SHADOW,
        shadowOpacity: pressed ? 0.04 : 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: pressed ? 1 : 2,
        marginBottom: 10,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: bg,
            borderWidth: 1,
            borderColor: border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={21} color={accent} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              color: TEXT,
              fontWeight: "900",
              fontSize: 15,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>

          <Text
            style={{
              color: MUTED,
              marginTop: 3,
              lineHeight: 18,
              fontWeight: "700",
              fontSize: 12.5,
            }}
            numberOfLines={2}
          >
            {description}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color={accent} />
      </View>
    </Pressable>
  );
}

function UpcomingEventsMiniCard() {
  return (
    <View
      style={{
        ...premiumCardStyle,
        padding: 16,
      }}
    >
      <SectionTitle
        title="Upcoming Events"
        subtitle="Gatherings, prayer, worship and church life"
        icon="calendar-outline"
        amber={false}
      />

      <View style={{ marginTop: 2 }}>
        {dailyEventsLoading ? (
          <View style={{ paddingVertical: 10, alignItems: "center" }}>
            <ActivityIndicator color={EVENT_AMBER} />

            <Text
              style={{
                color: MUTED,
                marginTop: 6,
                fontWeight: "800",
              }}
            >
              Loading events…
            </Text>
          </View>
        ) : dailyEvents.length > 0 ? (
          dailyEvents.map((event) => (
            <Pressable
              key={event.id}
              onPress={() => navigation.navigate("EventDetails", { eventId: event.id })}
              style={({ pressed }) => ({
                paddingVertical: 11,
                paddingHorizontal: 11,
                borderRadius: 16,
                backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                marginBottom: 8,
              })}
            >
              <Text
                style={{
                  color: TEXT,
                  fontWeight: "900",
                  fontSize: 14,
                }}
                numberOfLines={1}
              >
                {event.title || "Untitled event"}
              </Text>

              <Text
                style={{
                  color: EVENT_BROWN,
                  marginTop: 4,
                  fontWeight: "900",
                  fontSize: 12,
                }}
                numberOfLines={1}
              >
                {formatEventDateTime(event.start_at, event.end_at)}
              </Text>

              {!!(event.location_name || event.location_address || event.online_url) ? (
                <Text
                  style={{
                    color: MUTED,
                    marginTop: 3,
                    fontWeight: "700",
                    fontSize: 12,
                  }}
                  numberOfLines={1}
                >
                  {event.location_name ||
                    event.location_address ||
                    (event.online_url ? "Online" : "")}
                </Text>
              ) : null}
            </Pressable>
          ))
        ) : (
          <Text
            style={{
              color: MUTED,
              lineHeight: 20,
              fontWeight: "700",
            }}
          >
            No upcoming events yet.
          </Text>
        )}
      </View>

      <Pressable
        onPress={() => navigation.navigate("Events")}
        style={({ pressed }) => ({
          marginTop: 10,
          borderRadius: 999,
          paddingVertical: 11,
          paddingHorizontal: 14,
          backgroundColor: pressed ? "rgba(79, 99, 59, 0.14)" : OLIVE_SOFT,
          borderWidth: 1,
          borderColor: OLIVE_BORDER,
          alignItems: "center",
        })}
      >
        <Text
          style={{
            color: OLIVE,
            fontWeight: "900",
            fontSize: 13,
          }}
        >
          View Events
        </Text>
      </Pressable>
    </View>
  );
}
  const renderDisciplineCard = ({ item: d, index }) => {
  const meta = DISCIPLINE_META[d];
  const completed = !!completedByDisciplineLocal?.[d];
  const options = missionsByDisciplineLocal?.[d] || [];
  const primaryMission = options[0] || null;

  const inputRange = [(index - 1) * ITEM_SIZE, index * ITEM_SIZE, (index + 1) * ITEM_SIZE];

  const baseScale = scrollX.interpolate({
    inputRange,
    outputRange: [0.95, 1, 0.95],
    extrapolate: "clamp",
  });

  const translateY = scrollX.interpolate({
    inputRange,
    outputRange: [8, 0, 8],
    extrapolate: "clamp",
  });

  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.9, 1, 0.9],
    extrapolate: "clamp",
  });

  const focusOpacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.1, 1, 0.1],
    extrapolate: "clamp",
  });

  const isActive = index === activeIndex;
  const isPressed = pressedIndex === index;
  const pressedBump = isActive && isPressed ? 1.015 : 1;

  const accent = completed ? EVENT_AMBER : OLIVE;
  const accentSoft = completed ? AMBER_SOFT : OLIVE_SOFT;
  const accentBorder = completed ? AMBER_BORDER : OLIVE_BORDER;

  const disciplineLabel = completed ? "Completed" : "Practice";

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
        <Pressable
          onPressIn={() => setPressedIndex(index)}
          onPressOut={() => setPressedIndex(null)}
          style={({ pressed }) => ({
            backgroundColor: SURFACE,
            borderRadius: 26,
            borderWidth: 1,
            borderColor: completed ? AMBER_BORDER : CARD_BORDER,
            shadowColor: SHADOW,
            shadowOpacity: pressed ? 0.08 : 0.12,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: 4,
            overflow: "hidden",
          })}
        >
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 26,
              borderWidth: 2,
              borderColor: accentBorder,
              opacity: focusOpacity,
            }}
          />

          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: accentSoft,
                  borderWidth: 1,
                  borderColor: accentBorder,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 11,
                }}
              >
                <Text style={{ fontSize: 21 }}>{meta.icon}</Text>
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    color: TEXT,
                    fontWeight: "900",
                    fontSize: 18,
                    lineHeight: 23,
                  }}
                  numberOfLines={1}
                >
                  {meta.label}
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    marginTop: 3,
                    fontWeight: "700",
                    lineHeight: 18,
                    fontSize: 12.5,
                  }}
                  numberOfLines={2}
                >
                  {meta.blurb}
                </Text>
              </View>

              <View
                style={{
                  paddingHorizontal: 9,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: completed ? AMBER_SOFT : OLIVE_SOFT,
                  borderWidth: 1,
                  borderColor: completed ? AMBER_BORDER : OLIVE_BORDER,
                  marginLeft: 8,
                }}
              >
                <Text
                  style={{
                    color: completed ? EVENT_AMBER : OLIVE,
                    fontWeight: "900",
                    fontSize: 11.5,
                  }}
                >
                  {completed ? "Done" : "Open"}
                </Text>
              </View>
            </View>

            <View
              style={{
                marginTop: 15,
                borderRadius: 20,
                padding: 14,
                backgroundColor: completed ? AMBER_SOFT : PREMIUM_CREAM,
                borderWidth: 1,
                borderColor: completed ? AMBER_BORDER : CARD_BORDER,
              }}
            >
              <Text
                style={{
                  color: EVENT_BROWN,
                  fontWeight: "900",
                  fontSize: 11,
                  letterSpacing: 0.35,
                  textTransform: "uppercase",
                }}
              >
                Today’s mission
              </Text>

              {primaryMission ? (
                <>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginTop: 7,
                    }}
                  >
                    <Text
                      style={{
                        color: TEXT,
                        fontWeight: "900",
                        fontSize: 16,
                        lineHeight: 21,
                        flex: 1,
                        paddingRight: 10,
                      }}
                      numberOfLines={openMissionId === primaryMission.id ? undefined : 2}
                    >
                      {primaryMission.mission_title}
                    </Text>

                    <View
  style={{
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: completed ? AMBER_SOFT : OLIVE_SOFT,
    borderWidth: 1,
    borderColor: completed ? AMBER_BORDER : OLIVE_BORDER,
  }}
>
  <Text
    style={{
      color: completed ? EVENT_AMBER : OLIVE,
      fontWeight: "900",
      fontSize: 11.5,
    }}
  >
    {disciplineLabel}
  </Text>
</View>
                  </View>

                 <Text
  style={{
    color: MUTED,
    marginTop: 7,
    fontWeight: "700",
    lineHeight: 20,
    fontSize: 13.5,
  }}
  numberOfLines={openMissionId === primaryMission.id ? undefined : 3}
>
  {primaryMission.objective_line}
</Text>

                  {openMissionId === primaryMission.id ? (
                    <View style={{ marginTop: 12 }}>
                      {!!primaryMission.why_short ? (
                        <>
                          <Text
                            style={{
                              color: TEXT,
                              fontWeight: "900",
                              fontSize: 13,
                            }}
                          >
                            Why this matters
                          </Text>

                          <Text
                            style={{
                              color: MUTED,
                              marginTop: 5,
                              lineHeight: 19,
                              fontWeight: "700",
                              fontSize: 12.5,
                            }}
                          >
                            {primaryMission.why_short}
                          </Text>
                        </>
                      ) : null}

                      {Array.isArray(primaryMission.steps) && primaryMission.steps.length ? (
                        <View style={{ marginTop: 10 }}>
                          <Text
                            style={{
                              color: TEXT,
                              fontWeight: "900",
                              fontSize: 13,
                            }}
                          >
                            How to do it
                          </Text>

                          {primaryMission.steps.map((s, idx) => (
                            <Text
                              key={`${primaryMission.id}-step-${idx}`}
                              style={{
                                color: MUTED,
                                marginTop: 4,
                                lineHeight: 18,
                                fontWeight: "700",
                                fontSize: 12.5,
                              }}
                            >
                              • {s}
                            </Text>
                          ))}
                        </View>
                      ) : null}

                      {Array.isArray(primaryMission.scripture_refs) &&
                      primaryMission.scripture_refs.length ? (
                        <View style={{ marginTop: 10, flexDirection: "row", flexWrap: "wrap" }}>
                          {primaryMission.scripture_refs.slice(0, 2).map((r) => (
                            <Pressable
                              key={`${primaryMission.id}-ref-${r}`}
                              onPress={() => openScripture(r)}
                              style={({ pressed }) => ({
                                marginRight: 7,
                                marginBottom: 7,
                                borderRadius: 999,
                                paddingHorizontal: 10,
                                paddingVertical: 7,
                                backgroundColor: pressed ? AMBER_SOFT : SURFACE,
                                borderWidth: 1,
                                borderColor: AMBER_BORDER,
                              })}
                            >
                              <Text
                                style={{
                                  color: EVENT_BROWN,
                                  fontWeight: "900",
                                  fontSize: 11.5,
                                }}
                              >
                                {r}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={{ flexDirection: "row", gap: 8, marginTop: 13 }}>
                    <Pressable
                      onPress={() =>
                        setOpenMissionId(
                          openMissionId === primaryMission.id ? null : primaryMission.id
                        )
                      }
                      style={({ pressed }) => ({
                        flex: 1,
                        borderRadius: 999,
                        paddingVertical: 10,
                        alignItems: "center",
                        backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
                        borderWidth: 1,
                        borderColor: OLIVE_BORDER,
                      })}
                    >
                      <Text
                        style={{
                          color: OLIVE,
                          fontWeight: "900",
                          fontSize: 12,
                        }}
                      >
                        {openMissionId === primaryMission.id ? "Hide Details" : "Details"}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => startCompleteMission(primaryMission)}
                      disabled={completed}
                      style={({ pressed }) => ({
                        flex: 1.2,
                        borderRadius: 999,
                        paddingVertical: 10,
                        alignItems: "center",
                        backgroundColor: completed
                          ? "rgba(107, 114, 128, 0.12)"
                          : pressed
                          ? "rgba(180, 83, 9, 0.88)"
                          : EVENT_AMBER,
                        borderWidth: 1,
                        borderColor: completed ? CARD_BORDER : EVENT_AMBER,
                      })}
                    >
                      <Text
                        style={{
                          color: completed ? MUTED : SURFACE,
                          fontWeight: "900",
                          fontSize: 12,
                        }}
                      >
                        {completed ? "Completed" : "Mark Complete"}
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <Text
                  style={{
                    color: MUTED,
                    marginTop: 8,
                    fontWeight: "700",
                    lineHeight: 20,
                  }}
                >
                  No mission has been added for this discipline yet.
                </Text>
              )}
            </View>

            {options.length > 1 ? (
              <Text
                style={{
                  color: MUTED,
                  marginTop: 10,
                  fontWeight: "700",
                  fontSize: 11.5,
                  textAlign: "center",
                }}
              >
                Showing today’s primary mission
              </Text>
            ) : null}
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

  return (
  <Screen backgroundColor={PREMIUM_CREAM} padded>
      {({ bottomPad }) => (
        <>
      <ScrollView
  ref={scrollRef}
  keyboardShouldPersistTaps="handled"
  showsVerticalScrollIndicator={false}
  contentContainerStyle={{
    paddingBottom: (bottomPad || 0) + 22,
  }}
>

{/* Daily Dashboard Header */}
<View
  style={{
    marginBottom: 18,
  }}
>
  <View
    style={{
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
    }}
  >
    <View style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
      <Text
        style={{
          ...serifHeading,
          fontSize: 36,
          lineHeight: 41,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.78}
      >
        Daily
      </Text>

      <Text
        style={{
          color: MUTED,
          fontSize: 14,
          fontWeight: "700",
          lineHeight: 20,
          marginTop: 3,
        }}
        numberOfLines={2}
      >
        Scripture, formation and your walk with God today.
      </Text>
    </View>

    <Pressable
  onLongPress={() => {
    if (__DEV__) setDailyPreviewOpen((v) => !v);
  }}
  delayLongPress={700}
  style={{
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: AMBER_SOFT,
    borderWidth: 1,
    borderColor: AMBER_BORDER,
    alignItems: "center",
    justifyContent: "center",
  }}
>
  <Ionicons name="sunny-outline" size={23} color={EVENT_AMBER} />
</Pressable>
  </View>
</View>

<DevDaySwitcher />

{/* ========================= */}
{/* Scripture “Hero” Section  */}
{/* ========================= */}
<View
  onLayout={(e) => {
    setScriptureY(e.nativeEvent.layout.y);
  }}
  style={{ marginTop: 0, marginBottom: 16 }}
>
  <View
    style={{
      borderRadius: 28,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: AMBER_BORDER,
      shadowColor: SHADOW,
      shadowOpacity: 0.16,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 5,
      backgroundColor: EVENT_BROWN,
    }}
  >
    {scriptureImageForToday() ? (
      <ImageBackground
        source={scriptureImageForToday()}
        resizeMode="cover"
        style={{
          minHeight: 260,
        }}
      >
        <View
          style={{
            flex: 1,
            minHeight: 260,
            padding: 18,
            backgroundColor: "rgba(31, 41, 51, 0.22)",
          }}
        >
          <View
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: "rgba(255, 252, 245, 0.92)",
              borderWidth: 1,
              borderColor: "rgba(255, 252, 245, 0.35)",
            }}
          >
            <Text
              style={{
                color: EVENT_BROWN,
                fontSize: 11,
                fontWeight: "900",
                letterSpacing: 0.25,
              }}
            >
              TODAY’S SCRIPTURE
            </Text>
          </View>

          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <Text
              style={{
                color: SURFACE,
                fontSize: 12.5,
                fontWeight: "800",
                marginBottom: 8,
              }}
            >
              {dateLabel}
            </Text>

            <Text
              style={{
                fontFamily: displayFont,
                color: SURFACE,
                fontSize: 28,
                lineHeight: 34,
                fontWeight: "900",
                letterSpacing: -0.45,
              }}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
            >
              {scriptureTitle}
            </Text>

            <Text
              style={{
                color: "rgba(255, 252, 245, 0.94)",
                fontSize: 15,
                lineHeight: 24,
                fontWeight: "700",
                marginTop: 12,
              }}
              numberOfLines={4}
            >
              “{verse.text ?? "—"}”
            </Text>

            <Pressable
              onPress={() => openScripture(verse.ref)}
              disabled={!verse?.ref}
              style={({ pressed }) => ({
                alignSelf: "flex-start",
                marginTop: 12,
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 7,
                backgroundColor: pressed
                  ? "rgba(255, 252, 245, 0.82)"
                  : "rgba(255, 252, 245, 0.94)",
              })}
            >
              <Text
                style={{
                  color: EVENT_BROWN,
                  fontSize: 12,
                  fontWeight: "900",
                }}
              >
                {verse.ref ?? "—"} {verse.translation ? `(${verse.translation})` : ""}
              </Text>
            </Pressable>

            <Pressable
              onPress={openCoach}
              style={({ pressed }) => ({
                alignSelf: "flex-start",
                marginTop: 14,
                borderRadius: 999,
                paddingHorizontal: 14,
                paddingVertical: 9,
                backgroundColor: pressed ? "rgba(180, 83, 9, 0.86)" : EVENT_AMBER,
                borderWidth: 1,
                borderColor: "rgba(255, 252, 245, 0.32)",
              })}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="sparkles-outline" size={15} color={SURFACE} />

                <Text
                  style={{
                    color: SURFACE,
                    fontSize: 12.5,
                    fontWeight: "900",
                    marginLeft: 6,
                  }}
                >
                  Faith Coach
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </ImageBackground>
    ) : (
      <View
        style={{
          minHeight: 260,
          padding: 18,
          backgroundColor: EVENT_BROWN,
        }}
      >
        <View
          style={{
            position: "absolute",
            top: -50,
            right: -40,
            width: 160,
            height: 160,
            borderRadius: 80,
            backgroundColor: "rgba(180, 83, 9, 0.34)",
          }}
        />

        <View
          style={{
            position: "absolute",
            bottom: -65,
            left: -55,
            width: 190,
            height: 190,
            borderRadius: 95,
            backgroundColor: "rgba(255, 252, 245, 0.10)",
          }}
        />

        <View
          style={{
            alignSelf: "flex-start",
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: "rgba(255, 252, 245, 0.92)",
            borderWidth: 1,
            borderColor: "rgba(255, 252, 245, 0.35)",
          }}
        >
          <Text
            style={{
              color: EVENT_BROWN,
              fontSize: 11,
              fontWeight: "900",
              letterSpacing: 0.25,
            }}
          >
            TODAY’S SCRIPTURE
          </Text>
        </View>

        <View style={{ flex: 1, justifyContent: "flex-end", marginTop: 46 }}>
          <Text
            style={{
              color: "rgba(255, 252, 245, 0.84)",
              fontSize: 12.5,
              fontWeight: "800",
              marginBottom: 8,
            }}
          >
            {dateLabel}
          </Text>

          <Text
            style={{
              fontFamily: displayFont,
              color: SURFACE,
              fontSize: 28,
              lineHeight: 34,
              fontWeight: "900",
              letterSpacing: -0.45,
            }}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
          >
            {scriptureTitle}
          </Text>

          <Text
            style={{
              color: "rgba(255, 252, 245, 0.94)",
              fontSize: 15,
              lineHeight: 24,
              fontWeight: "700",
              marginTop: 12,
            }}
            numberOfLines={4}
          >
            “{verse.text ?? "—"}”
          </Text>

          <Pressable
            onPress={() => openScripture(verse.ref)}
            disabled={!verse?.ref}
            style={({ pressed }) => ({
              alignSelf: "flex-start",
              marginTop: 12,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 7,
              backgroundColor: pressed
                ? "rgba(255, 252, 245, 0.82)"
                : "rgba(255, 252, 245, 0.94)",
            })}
          >
            <Text
              style={{
                color: EVENT_BROWN,
                fontSize: 12,
                fontWeight: "900",
              }}
            >
              {verse.ref ?? "—"} {verse.translation ? `(${verse.translation})` : ""}
            </Text>
          </Pressable>

          <Pressable
            onPress={openCoach}
            style={({ pressed }) => ({
              alignSelf: "flex-start",
              marginTop: 14,
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 9,
              backgroundColor: pressed ? "rgba(180, 83, 9, 0.86)" : EVENT_AMBER,
              borderWidth: 1,
              borderColor: "rgba(255, 252, 245, 0.32)",
            })}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="sparkles-outline" size={15} color={SURFACE} />

              <Text
                style={{
                  color: SURFACE,
                  fontSize: 12.5,
                  fontWeight: "900",
                  marginLeft: 6,
                }}
              >
                Faith Coach
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    )}
  </View>
</View>

{/* This Week */}
<View style={{ marginBottom: 16 }}>
 <SectionTitle
  title="Church This Week"
  subtitle="Your church message, challenge and upcoming gatherings"
  icon="calendar-clear-outline"
  amber
/>

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
messageTitle={weeklyMsg.title || null}
  sourceLabel={weeklyMsg.source_label || weeklyMsg.church_name || "Church"}
  speakerLabel={weeklyMsg.speaker_label || ""}
  videoUrl={weeklyMsg.video_url || null}
  noticeboardUnreadCount={noticeboardUnreadCount}
  onPressChallenges={scrollToFormation}
  onPressNoticeboard={() => {
    if (!weeklyMsg?.church_id) return;
    navigation.navigate("ChurchNoticeboard", {
      churchId: weeklyMsg.church_id,
    });
  }}
  onPressChurchProfile={() => {
    if (!weeklyMsg?.church_id) return;
    navigation.navigate("ChurchProfilePublic", {
      churchId: weeklyMsg.church_id,
    });
  }}
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
  <View style={{ marginTop: 10 }}>
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
            await loadWeeklyCommitment({
              church_id: churchId,
              week_start: wk,
              challenge_id: chId,
            });
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

  <View style={{ marginTop: 10 }}>
    <UpcomingEventsMiniCard />
  </View>
</View>


{/* Today’s Formation */}
<View
  onLayout={(e) => {
    setFormationY(e.nativeEvent.layout.y);
  }}
  style={{ marginTop: 18 }}
>
  <View
    style={{
      ...premiumCardStyle,
      paddingVertical: 16,
      marginBottom: 16,
    }}
  >
    <View style={{ paddingHorizontal: 16 }}>
      <SectionTitle
        title="Today’s Formation"
        subtitle="Choose one discipline to practise today"
        icon="shield-checkmark-outline"
        amber={false}
      />

      <Text
        style={{
          color: MUTED,
          fontSize: 13,
          fontWeight: "700",
          lineHeight: 20,
          marginBottom: 4,
        }}
      >
        Swipe through Scripture, Prayer, Obedience, Service and Renunciation.
      </Text>
    </View>

    <View
      onLayout={(e) => {
        const w = Math.round(e.nativeEvent.layout.width);
        if (w && w !== carouselW) setCarouselW(w);
      }}
      style={{ marginTop: 12, overflow: "visible" }}
    >
      {!carouselW ? (
        <View style={{ height: 220, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={EVENT_AMBER} />
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
            paddingVertical: 4,
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

            {/* Apologetics Arena hidden from Daily for now. Logic kept above for safe rollback. */}

            {/* Formation Celebration Modal */}
<Modal
  visible={formationCelebrationOpen}
  transparent
  animationType="fade"
  onRequestClose={() => setFormationCelebrationOpen(false)}
>
  <View
    style={{
      flex: 1,
      backgroundColor: "rgba(15, 23, 42, 0.42)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    }}
  >
    <Reanimated.View
      style={[
        {
          width: "100%",
          maxWidth: 420,
          backgroundColor: SURFACE,
          borderRadius: 30,
          padding: 22,
          borderWidth: 1,
          borderColor: AMBER_BORDER,
          shadowColor: SHADOW,
          shadowOpacity: 0.18,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
          elevation: 8,
          overflow: "hidden",
        },
        animatedCelebrationCardStyle,
      ]}
    >

      <LottieView
  key={`formation-confetti-${formationCelebrationCount}-${formationCelebrationMission?.id || "none"}`}
  source={formationConfetti}
  autoPlay
  loop={false}
  pointerEvents="none"
  style={{
    position: "absolute",
    top: -20,
    left: 0,
    right: 0,
    height: 300,
    zIndex: 30,
  }}
/>

      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -70,
          right: -45,
          width: 190,
          height: 190,
          borderRadius: 999,
          backgroundColor: "rgba(180, 83, 9, 0.06)",
        }}
      />

      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          bottom: -80,
          left: -60,
          width: 180,
          height: 180,
          borderRadius: 999,
          backgroundColor: "rgba(79, 99, 59, 0.06)",
        }}
      />

      <View style={{ alignItems: "center", marginBottom: 16, zIndex: 40 }}>
        <Reanimated.View
          style={[
            {
              position: "absolute",
              width: 120,
              height: 120,
              borderRadius: 999,
              backgroundColor:
                formationCelebrationCount >= 5
                  ? "rgba(180, 83, 9, 0.18)"
                  : "rgba(212, 175, 55, 0.14)",
              borderWidth: 1,
              borderColor: "rgba(212, 175, 55, 0.28)",
              top: 2,
            },
            animatedCelebrationGlowStyle,
          ]}
        />

        <Reanimated.View
          style={[
            {
              width: 108,
              height: 108,
              alignItems: "center",
              justifyContent: "center",
            },
            animatedCelebrationDoveStyle,
          ]}
        >
<LottieView
  source={formationDove}
  autoPlay
  loop
  style={{
    width: 150,
    height: 150,
  }}
/>
        </Reanimated.View>
      </View>

      <Text
        style={{
          ...serifHeading,
          fontSize: 28,
          lineHeight: 34,
          color: EVENT_BROWN,
          textAlign: "center",
        }}
      >
        {getFormationCelebrationTitle(formationCelebrationCount)}
      </Text>

      <Text
        style={{
          color: MUTED,
          fontSize: 13,
          fontWeight: "800",
          lineHeight: 19,
          textAlign: "center",
          marginTop: 8,
        }}
      >
        {formationCelebrationMission?.discipline
          ? `${
              DISCIPLINE_META?.[formationCelebrationMission.discipline]?.label ||
              "Formation"
            } practice completed`
          : "Formation practice completed"}
      </Text>

      <View
        style={{
          marginTop: 18,
          padding: 14,
          borderRadius: 22,
          backgroundColor: PREMIUM_CREAM,
          borderWidth: 1,
          borderColor: CARD_BORDER,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              color: TEXT,
              fontSize: 13,
              fontWeight: "900",
            }}
          >
            Today’s formation
          </Text>

          <Text
            style={{
              color: EVENT_BROWN,
              fontSize: 13,
              fontWeight: "900",
            }}
          >
            {formationCelebrationCount}/5
          </Text>
        </View>

        <View
          style={{
            height: 10,
            borderRadius: 999,
            backgroundColor: "rgba(15, 23, 42, 0.08)",
            overflow: "hidden",
          }}
        >
          <Reanimated.View
            style={[
              {
                height: "100%",
                borderRadius: 999,
                backgroundColor: EVENT_AMBER,
              },
              animatedCelebrationProgressStyle,
            ]}
          />
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 12,
          }}
        >
         {[1, 2, 3, 4, 5].map((n) => {
  const active = formationCelebrationCount >= n;
  const isCurrentMilestone = formationCelebrationCount === n;

  return (
    <Reanimated.View
      key={n}
      style={{
        width: 24,
        height: 24,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {isCurrentMilestone ? (
        <Reanimated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              width: 18,
              height: 18,
              borderRadius: 999,
              backgroundColor:
                formationCelebrationCount >= 5
                  ? "rgba(180, 83, 9, 0.22)"
                  : "rgba(212, 175, 55, 0.22)",
              borderWidth: 1,
              borderColor:
                formationCelebrationCount >= 5
                  ? "rgba(180, 83, 9, 0.35)"
                  : "rgba(212, 175, 55, 0.35)",
            },
            animatedCelebrationMilestoneStyle,
          ]}
        />
      ) : null}

      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: 999,
          backgroundColor: active
            ? EVENT_AMBER
            : "rgba(15, 23, 42, 0.10)",
          borderWidth: 1,
          borderColor: active ? EVENT_AMBER : CARD_BORDER,
        }}
      />
    </Reanimated.View>
  );
})}
        </View>

        <Text
          style={{
            color: MUTED,
            fontSize: 12.5,
            fontWeight: "700",
            lineHeight: 18,
            marginTop: 12,
            textAlign: "center",
          }}
        >
          {getFormationCelebrationBody(formationCelebrationCount)}
        </Text>
      </View>

      {!!formationCelebrationMission?.mission_title ? (
        <View
          style={{
            marginTop: 14,
            padding: 13,
            borderRadius: 20,
            backgroundColor: OLIVE_SOFT,
            borderWidth: 1,
            borderColor: OLIVE_BORDER,
          }}
        >
          <Text
            style={{
              color: OLIVE,
              fontSize: 11,
              fontWeight: "900",
              textTransform: "uppercase",
              letterSpacing: 0.4,
              marginBottom: 4,
            }}
          >
            Completed practice
          </Text>

          <Text
            style={{
              color: TEXT,
              fontSize: 14,
              fontWeight: "900",
              lineHeight: 19,
            }}
          >
            {formationCelebrationMission.mission_title}
          </Text>
        </View>
      ) : null}

      {formationCelebrationCount >= 5 ? (
  <View style={{ marginTop: 18, gap: 10 }}>
    <Pressable
      onPress={() => {
        setFormationCelebrationOpen(false);

        setTimeout(() => {
          openShare();
        }, 180);
      }}
      style={({ pressed }) => ({
        backgroundColor: EVENT_AMBER,
        borderRadius: 18,
        paddingVertical: 14,
        alignItems: "center",
        borderWidth: 1,
        borderColor: AMBER_BORDER,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <Text
        style={{
          color: "#FFFFFF",
          fontSize: 14,
          fontWeight: "900",
        }}
      >
        Share Formation
      </Text>
    </Pressable>

    <Pressable
      onPress={() => setFormationCelebrationOpen(false)}
      style={({ pressed }) => ({
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        paddingVertical: 14,
        alignItems: "center",
        borderWidth: 1,
        borderColor: CARD_BORDER,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <Text
        style={{
          color: TEXT,
          fontSize: 14,
          fontWeight: "900",
        }}
      >
        Close
      </Text>
    </Pressable>
  </View>
) : (
  <Pressable
    onPress={() => setFormationCelebrationOpen(false)}
    style={({ pressed }) => ({
      marginTop: 18,
      backgroundColor: EVENT_AMBER,
      borderRadius: 18,
      paddingVertical: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: AMBER_BORDER,
      transform: [{ scale: pressed ? 0.985 : 1 }],
    })}
  >
    <Text
      style={{
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "900",
      }}
    >
      Continue
    </Text>
  </Pressable>
)}
    </Reanimated.View>
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


{/* Share Formation Composer - full screen */}
<Modal
  visible={shareOpen}
  animationType="none"
  presentationStyle="fullScreen"
  onRequestClose={() => setShareOpen(false)}
>
  <KeyboardAvoidingView
    behavior={Platform.OS === "ios" ? "padding" : undefined}
    style={{ flex: 1, backgroundColor: PREMIUM_CREAM }}
  >
    <View
      style={{
        flex: 1,
        backgroundColor: PREMIUM_CREAM,
        paddingTop: Platform.OS === "ios" ? 58 : 34,
      }}
    >
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 18,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: CARD_BORDER,
          backgroundColor: PREMIUM_CREAM,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => setShareOpen(false)}
          hitSlop={10}
          style={({ pressed }) => ({
            width: 42,
            height: 42,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
            borderWidth: 1,
            borderColor: OLIVE_BORDER,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          })}
        >
          <Ionicons name="close" size={21} color={OLIVE} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text
            style={[
              serifHeading,
              {
                fontSize: 22,
                lineHeight: 26,
                textAlign: "center",
              },
            ]}
          >
            Share Formation
          </Text>

          <Text
            style={{
              color: MUTED,
              marginTop: 2,
              fontSize: 12,
              fontWeight: "800",
              textAlign: "center",
            }}
          >
            Visible to your fellowship
          </Text>
        </View>

        <Pressable
          onPress={saveShare}
          disabled={shareSaving}
          style={({ pressed }) => ({
            paddingHorizontal: 15,
            height: 42,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: shareSaving ? "rgba(180, 83, 9, 0.52)" : EVENT_AMBER,
            borderWidth: 1,
            borderColor: AMBER_BORDER,
            shadowColor: EVENT_AMBER,
            shadowOpacity: shareSaving ? 0 : 0.2,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 5 },
            elevation: shareSaving ? 0 : 3,
            transform: [{ scale: pressed && !shareSaving ? 0.96 : 1 }],
          })}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 13,
              fontWeight: "900",
            }}
          >
            {shareSaving ? "Sharing…" : "Share"}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 18,
          paddingBottom: Platform.OS === "android" ? 48 : 34,
        }}
      >
        {/* Audience card */}
        <View
          style={{
            padding: 14,
            borderRadius: 24,
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            shadowColor: SHADOW,
            shadowOpacity: 0.07,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 5 },
            elevation: 2,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 11,
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
              }}
            >
              <Ionicons name="people-outline" size={20} color={OLIVE} />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: TEXT,
                  fontSize: 15,
                  fontWeight: "900",
                }}
              >
                Fellowship feed
              </Text>

              <Text
                style={{
                  color: MUTED,
                  marginTop: 3,
                  fontSize: 13,
                  lineHeight: 18,
                  fontWeight: "700",
                }}
              >
                Your Formation update will be shared with people connected to you in fellowship.
              </Text>
            </View>
          </View>
        </View>

        {/* Post preview card */}
        <View
          style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 26,
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: AMBER_BORDER,
            shadowColor: SHADOW,
            shadowOpacity: 0.08,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: 3,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: AMBER_SOFT,
                borderWidth: 1,
                borderColor: AMBER_BORDER,
              }}
            >
              <Ionicons name="leaf-outline" size={19} color={EVENT_AMBER} />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: TEXT,
                  fontSize: 14,
                  fontWeight: "900",
                }}
              >
                Daily Formation
              </Text>

              <Text
                style={{
                  color: MUTED,
                  marginTop: 2,
                  fontSize: 12,
                  fontWeight: "800",
                }}
              >
                {Math.min(5, Number(completedCount || 0))}/5 practices completed today
              </Text>
            </View>
          </View>

          <TextInput
            value={shareText}
            onChangeText={setShareText}
            placeholder="Write something about what God is forming in you today..."
            placeholderTextColor="rgba(107, 114, 128, 0.72)"
            multiline
            textAlignVertical="top"
            autoFocus={false}
            style={{
              minHeight: 170,
              color: TEXT,
              fontSize: 17,
              lineHeight: 25,
              fontWeight: "700",
              paddingTop: 2,
            }}
          />

          <View
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTopWidth: 1,
              borderTopColor: CARD_BORDER,
            }}
          >
            <Text
              style={{
                color: EVENT_BROWN,
                fontSize: 13,
                fontWeight: "900",
              }}
            >
              Formation summary
            </Text>

            <Text
              style={{
                color: MUTED,
                marginTop: 6,
                fontSize: 13,
                lineHeight: 20,
                fontWeight: "700",
              }}
            >
              {Math.min(5, Number(completedCount || 0))}/5 practices completed • Scripture, prayer, obedience, service and renunciation.
            </Text>
          </View>
        </View>

        <Text
          style={{
            color: MUTED,
            marginTop: 14,
            fontSize: 12,
            lineHeight: 18,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          This will post directly to your Home feed for fellowship encouragement.
        </Text>
      </ScrollView>
    </View>
  </KeyboardAvoidingView>
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
