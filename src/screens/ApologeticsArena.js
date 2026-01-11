// src/screens/ApologeticsArena.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import Screen from "../components/Screen";
import ScriptureReaderModal from "../components/ScriptureReaderModal";

import {
    loadApologeticsV2Board,
    upsertApologeticsAttemptV2,
} from "../lib/apologeticsV2";

import { gradeDrillWithFaithCoach } from "../lib/faithCoachGradeDrill";

// ---------- helpers ----------
function safeNum(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function letterForIndex(idx) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return alphabet[idx] || "Z";
}

function clampText(s, max = 140) {
  const t = String(s || "").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trim() + "…";
}

function buildMissionBrief(why, prompt) {
  const w = String(why || "").trim();
  if (w) return clampText(w, 220);

  const p = String(prompt || "").trim();
  if (!p) {
    return "Your job: hear the claim clearly, then choose the strongest counter-evidence without getting reactive.";
  }

  return (
    "Mission Brief:\n" +
    "1) Understand the claim exactly.\n" +
    "2) Review their strongest evidence.\n" +
    "3) Choose the best counter-exhibit to dismantle it calmly."
  );
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
    lines.push(refs.join(" • "));
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
        "For Muslim opponents, don’t assume they accept your premise—use it as a historical method claim, not ‘because Christians say so.’",
      refs: ["Topic: textual variants vs doctrine", "Topic: critical editions NT"],
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
      refs: ["Topic: formal vs dynamic equivalence", "Topic: manuscript families"],
    },
  ];

  const moves = [
    {
      lane: "Moves",
      title: "Define the claim: ‘changed’ how?",
      proof:
        "Force clarity: are they claiming copying variants, translation differences, or intentional doctrinal rewrite? Each requires different evidence.",
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
        "If Muslim: you can ask how their own textual history is handled without implying disrespect.",
      refs: [],
    },
  ];

  const evidence = [
    {
      lane: "Evidence",
      title: "Textual criticism 101 (why variants don’t equal corruption)",
      proof:
        "Textual criticism exists precisely because we have lots of witnesses. It’s a method, not a faith claim.",
      howToUse:
        "Use one sentence: ‘We can see the variants—so we can evaluate them.’",
      muslimAngle:
        "Frame as history/methodology, not ‘because Christians say so.’",
      refs: ["Topic: critical apparatus", "Topic: earliest NT manuscripts"],
    },
    {
      lane: "Evidence",
      title: "Early Christian quotations (what did the early church cite?)",
      proof:
        "Early Christian writers quote Scripture extensively. Their citations can be compared to later manuscripts to test stability.",
      howToUse:
        "Say: ‘We can compare quotations across centuries—stability is measurable.’",
      muslimAngle:
        "Treat as historical evidence, not ‘church authority.’",
      refs: ["Topic: patristic citations NT"],
    },
  ];

  const sources = opponent === "muslim" ? muslimSourcePack : genericSourcePack;
  return { sources, moves, evidence };
}

function buildProsecutionExhibits(drill) {
  const seeded = Array.isArray(drill?.opponent_exhibits) ? drill.opponent_exhibits : null;
  if (seeded?.length) {
    return seeded
      .filter(Boolean)
      .slice(0, 6)
      .map((x, idx) => ({
        key: x.key || `pros-${idx}-${String(x.title || "exhibit").toLowerCase().replace(/\s+/g, "-")}`,
        side: "prosecution",
        lane: "Opponent Evidence",
        title: String(x.title || `Opponent Exhibit ${idx + 1}`),
        summary: String(x.summary || x.proof || "").trim(),
        proof: x.proof || x.summary || "",
        howToUse: x.howToUse || x.how_to_use || "",
        muslimAngle: x.muslimAngle || x.muslim_angle || "",
        refs: Array.isArray(x.refs) ? x.refs : [],
      }));
  }

  const prompt = String(drill?.prompt || "").toLowerCase();

  if (prompt.includes("never claimed") && prompt.includes("god")) {
    return [
      {
        key: "pros-jesus-no-direct-claim",
        side: "prosecution",
        lane: "Opponent Evidence",
        title: "No direct quote: “I am God”",
        summary:
          "They argue Jesus never explicitly said the exact phrase “I am God”, so divinity is a later interpretation.",
        proof:
          "Claim: Jesus never uses a direct, modern-style self-identification phrase. Therefore the doctrine is later and imposed.",
        howToUse:
          "They will press: “Show me the exact sentence where Jesus says ‘I am God’.”",
        muslimAngle:
          "Often paired with: ‘Jesus was a prophet, not God.’",
        refs: [],
      },
      {
        key: "pros-synoptics-focus",
        side: "prosecution",
        lane: "Opponent Evidence",
        title: "Synoptics emphasize prophet/servant language",
        summary:
          "They highlight passages where Jesus prays, obeys, or speaks as sent by God, implying He is not God.",
        proof:
          "Claim: dependence/submission language proves Jesus is not divine.",
        howToUse:
          "They’ll cite prayer/submission as incompatible with divinity.",
        muslimAngle:
          "They may argue: ‘God doesn’t pray to God.’",
        refs: [],
      },
      {
        key: "pros-john-late-unreliable",
        side: "prosecution",
        lane: "Opponent Evidence",
        title: "John is “late” so claims are unreliable",
        summary:
          "They argue John’s Gospel was written later and reflects theological development, not history.",
        proof:
          "Claim: later composition = less historical reliability for high Christology.",
        howToUse:
          "They’ll say: ‘Your strongest “divinity” texts are from the latest Gospel.’",
        muslimAngle:
          "This is used to downgrade John’s authority.",
        refs: [],
      },
    ];
  }

  return [
    {
      key: "pros-vague-claim-1",
      side: "prosecution",
      lane: "Opponent Evidence",
      title: "Vague claim: “The text was changed”",
      summary:
        "They assert changes happened over time but often don’t specify which passage, manuscript, or century.",
      proof:
        "Claim: copying and translation imply unreliability; therefore the message cannot be trusted.",
      howToUse:
        "They’ll use general suspicion rather than a single testable example.",
      muslimAngle:
        "Often paired with: ‘The original revelation is lost.’",
      refs: [],
    },
    {
      key: "pros-vague-claim-2",
      side: "prosecution",
      lane: "Opponent Evidence",
      title: "Appeal to “many versions”",
      summary:
        "They point to multiple translations/versions and conclude the meaning is unstable or manipulated.",
      proof:
        "Claim: if you have multiple versions, you cannot know what God said.",
      howToUse:
        "They’ll say: ‘Which Bible is the real one?’",
      muslimAngle:
        "Often contrasted with “one Qur’an”.",
      refs: [],
    },
    {
      key: "pros-vague-claim-3",
      side: "prosecution",
      lane: "Opponent Evidence",
      title: "Appeal to authority (internet polemics)",
      summary:
        "They cite an apologist/video rather than primary sources (manuscripts, critical editions).",
      proof:
        "Claim: ‘Scholars say…’ without checking the actual data.",
      howToUse:
        "They rely on claims that feel strong but aren’t pinned to evidence.",
      muslimAngle:
        "Common in social media debate clips.",
      refs: [],
    },
  ];
}

function buildDefenseExhibits(drill, studyPack) {
  const seeded = Array.isArray(drill?.defense_exhibits) ? drill.defense_exhibits : null;
  if (seeded?.length) {
    return seeded
      .filter(Boolean)
      .slice(0, 8)
      .map((x, idx) => ({
        key: x.key || `def-${idx}-${String(x.title || "exhibit").toLowerCase().replace(/\s+/g, "-")}`,
        side: "defense",
        lane: "Defense Evidence",
        title: String(x.title || `Defense Exhibit ${idx + 1}`),
        summary: String(x.summary || x.proof || "").trim(),
        proof: x.proof || x.summary || "",
        howToUse: x.howToUse || x.how_to_use || "",
        muslimAngle: x.muslimAngle || x.muslim_angle || "",
        refs: Array.isArray(x.refs) ? x.refs : [],
      }));
  }

  const pool = []
    .concat((studyPack?.evidence || []).map((x) => ({ ...x, lane: "Defense Evidence" })))
    .concat((studyPack?.sources || []).map((x) => ({ ...x, lane: "Defense Evidence" })))
    .concat((studyPack?.moves || []).map((x) => ({ ...x, lane: "Defense Evidence" })));

  return pool.slice(0, 7).map((it, idx) => ({
    key: `def-${idx}-${String(it.title || "exhibit").toLowerCase().replace(/\s+/g, "-")}`,
    side: "defense",
    lane: it.lane || "Defense Evidence",
    title: it.title || `Defense Exhibit ${idx + 1}`,
    summary: clampText(it.proof || it.howToUse || "", 140),
    proof: it.proof || "",
    howToUse: it.howToUse || "",
    muslimAngle: it.muslimAngle || "",
    refs: Array.isArray(it.refs) ? it.refs : [],
  }));
}

function buildFaultLines(drill) {
  const seeded = Array.isArray(drill?.fault_lines) ? drill.fault_lines : null;
  if (seeded?.length) return seeded.filter(Boolean).slice(0, 6);

  const prompt = String(drill?.prompt || "").toLowerCase();

  if (prompt.includes("never claimed") && prompt.includes("god")) {
    return [
      "Only the exact phrase “I am God” counts as a claim.",
      "John’s Gospel is too late to be reliable.",
      "If Jesus prays, He cannot be divine.",
      "Divine claims must match modern phrasing and categories.",
    ];
  }

  return [
    "If there are variants, the original message is unknowable.",
    "Translation differences automatically mean corruption.",
    "If something is complex, it must be invented later.",
    "If an argument sounds confident, it must be true.",
  ];
}

const STEP_META = {
  1: { title: "Charge", subtitle: "Hear the claim. Understand the target." },
  2: { title: "Evidence", subtitle: "Review their strongest exhibits and find the fault line." },
  3: { title: "Cross-exam", subtitle: "Select the best rebuttal exhibit (notes optional)." },
  4: { title: "Verdict", subtitle: "Get scored and claim rewards." },
};

const TUTORIAL_KEY = "triunely_apologetics_arena_tutorial_v1";

export default function ApologeticsArena({ navigation, route }) {
  const dayNumberOverride = route?.params?.dayNumberOverride ?? null;
  const initialDrillId = route?.params?.drillId ?? null;

  const [loading, setLoading] = useState(true);
  const [apo, setApo] = useState(null);

  const [selectedDrillId, setSelectedDrillId] = useState(initialDrillId);
  const [step, setStep] = useState(1);

  // Tutorial
  const [tutorialOpen, setTutorialOpen] = useState(false);

  // Scripture modal
  const [scriptureOpen, setScriptureOpen] = useState(false);
  const [scriptureRef, setScriptureRef] = useState("");
  const [scriptureTranslation] = useState("WEB");

  // Step 1 typewriter
  const [typedObjection, setTypedObjection] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const timerRef = useRef(null);

  // Evidence / Cross-exam selection states
  const [readMap, setReadMap] = useState({}); // { [exhibit.key]: true }
  const [selectedProsecutionKey, setSelectedProsecutionKey] = useState(null);
  const [selectedDefenseKey, setSelectedDefenseKey] = useState(null);

  // Fault line selection + help
  const [selectedFaultLine, setSelectedFaultLine] = useState(null);
  const [faultLineHelpOpen, setFaultLineHelpOpen] = useState(false);

  // Optional notes
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesText, setNotesText] = useState("");

  // Submit/grading
  const [saving, setSaving] = useState(false);
  const [grading, setGrading] = useState(false);
  const [verdict, setVerdict] = useState(null);

  // Header pulse
  const pulse = useRef(new Animated.Value(0)).current;

  // Progress bar anim
  const progressAnim = useRef(new Animated.Value(0.25)).current;

  // Step transition anim
  const stepOpacity = useRef(new Animated.Value(1)).current;
  const stepSlide = useRef(new Animated.Value(0)).current;

  // Shake anim for locked Next
  const shake = useRef(new Animated.Value(0)).current;

  // Verdict stamp anim
  const stampScale = useRef(new Animated.Value(0)).current;

  // Carousel anims
  const prosX = useRef(new Animated.Value(0)).current;
  const defX = useRef(new Animated.Value(0)).current;

  const apoDrills = apo?.drills || [];
  const attemptsByDrillId = apo?.attemptsByDrillId || {};
  const activeAttempt = selectedDrillId ? attemptsByDrillId?.[selectedDrillId] || null : null;

  const activeDrill = useMemo(() => {
    if (!apoDrills.length) return null;

    const desired = selectedDrillId || initialDrillId;
    if (desired) {
      const found = apoDrills.find((d) => d.id === desired);
      if (found) return found;
    }

    const firstUncompleted = apoDrills.find((d) => !attemptsByDrillId?.[d.id]?.completed);
    return firstUncompleted || apoDrills[0] || null;
  }, [apoDrills, selectedDrillId, initialDrillId, attemptsByDrillId]);

  const nextDrill = useMemo(() => {
    if (!apoDrills.length) return null;
    const firstUncompleted = apoDrills.find((d) => !attemptsByDrillId?.[d.id]?.completed);
    return firstUncompleted || apoDrills[0] || null;
  }, [apoDrills, attemptsByDrillId]);

  const completedCount = useMemo(() => {
    let n = 0;
    for (const d of apoDrills) if (attemptsByDrillId?.[d.id]?.completed) n += 1;
    return n;
  }, [apoDrills, attemptsByDrillId]);

  const studyPack = useMemo(() => buildStudyPack(activeDrill), [activeDrill]);
  const prosecutionExhibits = useMemo(() => buildProsecutionExhibits(activeDrill), [activeDrill]);
  const defenseExhibits = useMemo(() => buildDefenseExhibits(activeDrill, studyPack), [activeDrill, studyPack]);
  const faultLines = useMemo(() => buildFaultLines(activeDrill), [activeDrill]);

  const load = async () => {
    setLoading(true);

    const res = await loadApologeticsV2Board({
      dayNumberOverride: dayNumberOverride ?? undefined,
    });

    if (!res?.ok) {
      setApo({ ok: false, error: res?.error || "Failed to load apologetics." });
      setLoading(false);
      return;
    }

    setApo(res);

    const drills = res.drills || [];
    const attempts = res.attemptsByDrillId || {};
    let chosen = selectedDrillId || initialDrillId;

    if (!(chosen && drills.find((d) => d.id === chosen))) {
      const firstUncompleted = drills.find((d) => !attempts?.[d.id]?.completed);
      chosen = firstUncompleted?.id || drills[0]?.id || null;
    }

    setSelectedDrillId(chosen);

    // Reset state
    setStep(1);
    setVerdict(null);
    setReadMap({});
    setSelectedProsecutionKey(null);
    setSelectedDefenseKey(null);
    setSelectedFaultLine(null);
    setNotesOpen(false);
    setNotesText("");

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayNumberOverride]);

  useEffect(() => {
    if (!initialDrillId) return;
    setSelectedDrillId(initialDrillId);
    setStep(1);
    setVerdict(null);
    setReadMap({});
    setSelectedProsecutionKey(null);
    setSelectedDefenseKey(null);
    setSelectedFaultLine(null);
    setNotesOpen(false);
    setNotesText("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDrillId]);

  // Tutorial (first-time)
  useEffect(() => {
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(TUTORIAL_KEY);
        if (!seen) setTutorialOpen(true);
      } catch {
        // ignore
      }
    })();
  }, []);

  const dismissTutorial = async () => {
    try {
      await AsyncStorage.setItem(TUTORIAL_KEY, "1");
    } catch {
      // ignore
    }
    setTutorialOpen(false);
  };

  // Header pulse
  useEffect(() => {
    pulse.stopAnimation();
    pulse.setValue(0);
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [step]);

  // Progress bar animate
  useEffect(() => {
    const target = step === 1 ? 0.25 : step === 2 ? 0.5 : step === 3 ? 0.75 : 1;
    Animated.timing(progressAnim, {
      toValue: target,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [step, progressAnim]);

  // Step transitions
  useEffect(() => {
    stepOpacity.setValue(0);
    stepSlide.setValue(12);

    Animated.parallel([
      Animated.timing(stepOpacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(stepSlide, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [step, stepOpacity, stepSlide]);

  // Verdict stamp anim
  useEffect(() => {
    if (step !== 4 || !verdict) return;
    stampScale.setValue(0);

    Animated.spring(stampScale, {
      toValue: 1,
      friction: 6,
      tension: 110,
      useNativeDriver: true,
    }).start();
  }, [step, verdict, stampScale]);

  // Step 1 typewriter
  useEffect(() => {
    if (!activeDrill?.id) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    setTypedObjection("");
    setShowWhy(false);

    const full = String(activeDrill?.prompt || "").trim();
    if (!full) return;

    setIsTyping(true);

    let i = 0;
    const tick = () => {
      i += 1;
      setTypedObjection(full.slice(0, i));
      if (i < full.length) timerRef.current = setTimeout(tick, 14);
      else {
        setIsTyping(false);
        setShowWhy(true);
      }
    };

    timerRef.current = setTimeout(tick, 120);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeDrill?.id]);

  const openScripture = (ref) => {
    if (!ref) return;
    setScriptureRef(ref);
    setScriptureOpen(true);
  };

  const markRead = (exhibit) => {
    if (!exhibit?.key) return;
    setReadMap((prev) => ({ ...prev, [exhibit.key]: true }));
  };

  const selectExhibitAsBest = (exhibit) => {
    if (!exhibit?.key) return;

    if (exhibit.side === "prosecution") setSelectedProsecutionKey(exhibit.key);
    if (exhibit.side === "defense") setSelectedDefenseKey(exhibit.key);
  };

  const openExhibit = (exhibit) => {
    if (!exhibit?.key) return;

    markRead(exhibit);

    // Opening also selects, but selection is now explicit too via the button.
    selectExhibitAsBest(exhibit);

    navigation.navigate("ExhibitBrief", {
      exhibit,
      opponent_type: activeDrill?.opponent_type,
    });
  };

  const resetForDrill = (drillId) => {
    setSelectedDrillId(drillId);
    setStep(1);
    setVerdict(null);
    setReadMap({});
    setSelectedProsecutionKey(null);
    setSelectedDefenseKey(null);
    setSelectedFaultLine(null);
    setNotesOpen(false);
    setNotesText("");
  };

  const canAdvanceFromEvidence = () => {
    // Must OPEN at least one opponent exhibit (selection alone doesn’t count).
    return prosecutionExhibits.some((ex) => !!readMap?.[ex.key]);
  };

  const doShake = () => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const nextStep = () => {
    if (step === 2 && !canAdvanceFromEvidence()) {
      doShake();
      Alert.alert(
        "Quick study moment",
        "Open at least one opponent exhibit before continuing. This keeps you honest and makes the win feel earned."
      );
      return;
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const submit = async () => {
    if (!activeDrill?.id) return;

    if (!selectedDefenseKey) {
      Alert.alert("Select your best rebuttal", "Choose the strongest defence exhibit before submitting.");
      return;
    }

    const defense = defenseExhibits.find((x) => x.key === selectedDefenseKey) || null;
    const prosecution = selectedProsecutionKey
      ? prosecutionExhibits.find((x) => x.key === selectedProsecutionKey) || null
      : null;

    const openedOpponentCount = prosecutionExhibits.reduce((n, ex) => (readMap?.[ex.key] ? n + 1 : n), 0);

    const userAnswer = [
      "ARENA_MODE: evidence_selection_v2",
      `CLAIM: ${String(activeDrill?.prompt || "").trim()}`,
      prosecution ? `SELECTED_OPPONENT_EXHIBIT: ${prosecution.title}` : "SELECTED_OPPONENT_EXHIBIT: (none)",
      `OPENED_OPPONENT_EXHIBITS: ${openedOpponentCount}`,
      `FAULT_LINE: ${selectedFaultLine || "(not selected)"}`,
      `SELECTED_DEFENSE_EXHIBIT: ${defense?.title || "(unknown)"}`,
      notesText ? `NOTES: ${notesText.trim()}` : "NOTES: (none)",
    ].join("\n");

    try {
      setSaving(true);
      setGrading(true);

      const gradeRes = await gradeDrillWithFaithCoach({
        drill: {
          id: activeDrill.id,
          title: activeDrill.title,
          prompt: activeDrill.prompt,
          opponent_type: activeDrill.opponent_type,
          key_points: activeDrill.key_points || [],
          scripture_refs: activeDrill.scripture_refs || [],
        },
        userAnswer,
      });

      if (!gradeRes.ok) {
        console.log("FAITH COACH FAIL (Arena) gradeRes =", gradeRes);
        Alert.alert(
          "Faith Coach (Apologetics) failed",
          `Error: ${gradeRes.error || "Unknown"}\n\nStatus: ${gradeRes.status || "unknown"}`
        );
        return;
      }

      const grade = gradeRes.grade;
      const alreadyCompleted = !!activeAttempt?.completed;

      const xpEarned = alreadyCompleted ? 0 : safeNum(activeDrill.xp_reward);
      const lpEarned = alreadyCompleted ? 0 : safeNum(activeDrill.light_points_bonus);

      const coachFeedback = {
        mode: "arena_evidence_selection_v2",
        prosecution_selected_key: selectedProsecutionKey,
        defense_selected_key: selectedDefenseKey,
        fault_line_selected: selectedFaultLine,
        opened_opponent_exhibits: openedOpponentCount,
        read_map: readMap,
        notes_provided: !!notesText?.trim(),
        suggested_answer: buildSuggestedAnswer(activeDrill),
        grade,
      };

      const res = await upsertApologeticsAttemptV2({
        drillId: activeDrill.id,
        userAnswer,
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

      await load();
      setVerdict({ grade, xpEarned, lpEarned, alreadyCompleted });
      setStep(4);
    } finally {
      setGrading(false);
      setSaving(false);
    }
  };

  // ---------- UI blocks ----------
  const StepHeader = () => {
    const meta = STEP_META[step] || STEP_META[1];
    const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] });

    const barWidth = progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ["0%", "100%"],
    });

    return (
      <Animated.View style={{ opacity }}>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 22 }}>Apologetics Arena</Text>

        <Text style={{ color: "#FFCF4A", marginTop: 6, fontWeight: "900" }}>
          Drill {completedCount}/{apoDrills.length || 0} • Step {step}/4 — {meta.title}
        </Text>

        <Text style={{ color: "#9bb3c9", marginTop: 6, lineHeight: 20 }}>{meta.subtitle}</Text>

        <View
          style={{
            marginTop: 10,
            height: 10,
            borderRadius: 999,
            backgroundColor: "#0D1B2A",
            borderWidth: 1,
            borderColor: "#23466f",
            overflow: "hidden",
          }}
        >
          <Animated.View
            style={{
              height: "100%",
              width: barWidth,
              backgroundColor: "#FFCF4A",
            }}
          />
        </View>
      </Animated.View>
    );
  };

  const DrillStrip = () => {
    if (!apoDrills.length) return null;

    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 12 }}>
        {apoDrills.map((d, idx) => {
          const done = !!attemptsByDrillId?.[d.id]?.completed;
          const isActive = d.id === activeDrill?.id;

          return (
            <Pressable
              key={d.id}
              onPress={() => resetForDrill(d.id)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: done ? "#2a2a14" : "#163154",
                borderWidth: 1,
                borderColor: isActive ? "#1B6BF2" : done ? "#FFCF4A" : "#23466f",
                marginRight: 8,
                marginBottom: 8,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900" }}>
                {idx + 1} {done ? "✓" : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  const StepNav = ({ showSubmit }) => {
    const locked = step === 2 && !canAdvanceFromEvidence();

    const shakeX = shake.interpolate({
      inputRange: [-1, 1],
      outputRange: [-6, 6],
    });

    return (
      <View style={{ flexDirection: "row", marginTop: 14 }}>
        <Pressable
          onPress={prevStep}
          disabled={step === 1}
          style={{
            flex: 1,
            marginRight: 10,
            backgroundColor: step === 1 ? "#556b8b" : "#163154",
            paddingVertical: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#23466f",
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900" }}>Back</Text>
        </Pressable>

        {showSubmit ? (
          <Pressable
            onPress={submit}
            disabled={saving || grading}
            style={{
              flex: 1,
              backgroundColor: saving || grading ? "#556b8b" : "#FFCF4A",
              paddingVertical: 12,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "#0D1B2A", textAlign: "center", fontWeight: "900" }}>
              {grading ? "Scoring..." : saving ? "Saving..." : "Submit"}
            </Text>
          </Pressable>
        ) : (
          <Animated.View style={{ flex: 1, transform: [{ translateX: locked ? shakeX : 0 }] }}>
            <Pressable
              onPress={nextStep}
              style={{
                backgroundColor: step === 4 ? "#556b8b" : locked ? "#2b3f5c" : "#1B6BF2",
                paddingVertical: 12,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900" }}>
                {locked ? "Locked" : "Next"}
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    );
  };

  const Card = ({ children, borderColor = "#23466f" }) => {
    return (
      <View
        style={{
          marginTop: 12,
          padding: 14,
          borderRadius: 18,
          backgroundColor: "#11233B",
          borderWidth: 1,
          borderColor,
        }}
      >
        {children}
      </View>
    );
  };

  const RowPill = ({ text, accent }) => {
    return (
      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: "#0D1B2A",
          borderWidth: 1,
          borderColor: "#1f3e64",
          marginRight: 8,
          marginBottom: 8,
        }}
      >
        <Text style={{ color: accent || "#9bb3c9", fontWeight: "900" }}>{text}</Text>
      </View>
    );
  };

  const FloatingLaneLabel = ({ text }) => {
    return (
      <View style={{ position: "absolute", top: -10, left: 14, zIndex: 5 }}>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: "#0D1B2A",
            borderWidth: 1,
            borderColor: "#23466f",
          }}
        >
          <Text style={{ color: "#9bb3c9", fontWeight: "900", letterSpacing: 2 }}>{text}</Text>
        </View>
      </View>
    );
  };

  const ExhibitCard = ({
    exhibit,
    exhibitLabel,
    active,
    read,
    onRead,
    onSelectBest,
    width,
    selectLabel,
    disableSelect,
  }) => {
    const pressScale = useRef(new Animated.Value(1)).current;

    const onPressIn = () => {
      Animated.timing(pressScale, { toValue: 0.985, duration: 90, useNativeDriver: true }).start();
    };
    const onPressOut = () => {
      Animated.timing(pressScale, { toValue: 1, duration: 120, useNativeDriver: true }).start();
    };

    return (
      <Animated.View style={{ width, transform: [{ scale: pressScale }] }}>
        <View
          style={{
            borderRadius: 18,
            backgroundColor: "#0D1B2A",
            borderWidth: 1,
            borderColor: active ? "#1B6BF2" : read ? "#FFCF4A" : "#1f3e64",
            padding: 14,
            minHeight: 165,
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: "#11233B",
                borderWidth: 1,
                borderColor: "#23466f",
              }}
            >
              <Text style={{ color: "#FFCF4A", fontWeight: "900" }}>{exhibitLabel}</Text>
            </View>

            {read ? (
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: "#2a2a14",
                  borderWidth: 1,
                  borderColor: "#FFCF4A",
                }}
              >
                <Text style={{ color: "#FFCF4A", fontWeight: "900" }}>READ ✓</Text>
              </View>
            ) : null}
          </View>

          <View style={{ marginTop: 10 }}>
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>{exhibit.title}</Text>
            <Text style={{ color: "#9bb3c9", marginTop: 8, lineHeight: 20 }}>
              {clampText(exhibit.summary || exhibit.proof || "", 160)}
            </Text>
          </View>

          <View style={{ flexDirection: "row", marginTop: 12 }}>
            <Pressable
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              onPress={onRead}
              style={{
                flex: 1,
                marginRight: 10,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: "#163154",
                borderWidth: 1,
                borderColor: "#23466f",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900", textAlign: "center" }}>
                Read case file
              </Text>
            </Pressable>

            <Pressable
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              onPress={onSelectBest}
              disabled={!!disableSelect}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: disableSelect ? "#2b3f5c" : "#1B6BF2",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900", textAlign: "center" }}>
                {selectLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    );
  };

  const ExhibitCarousel = ({
    label,
    exhibits,
    selectedKey,
    scrollVal,
    exhibitLabelFn,
    selectLabel,
    disableSelect,
    onSelect,
    onRead,
  }) => {
    const GAP = 14;
    const CARD_WIDTH = 310;
    const ITEM_SIZE = CARD_WIDTH + GAP;

    return (
      <View style={{ marginTop: 14 }}>
        <View style={{ position: "relative", paddingTop: 12 }}>
          <FloatingLaneLabel text={label} />

          <Animated.FlatList
            horizontal
            data={exhibits}
            keyExtractor={(it) => it.key}
            showsHorizontalScrollIndicator={false}
            snapToInterval={ITEM_SIZE}
            decelerationRate="fast"
            disableIntervalMomentum
            contentContainerStyle={{ paddingHorizontal: 2 }}
            ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollVal } } }], {
              useNativeDriver: true,
            })}
            scrollEventThrottle={16}
            renderItem={({ item, index }) => {
              const inputRange = [(index - 1) * ITEM_SIZE, index * ITEM_SIZE, (index + 1) * ITEM_SIZE];
              const scale = scrollVal.interpolate({
                inputRange,
                outputRange: [0.96, 1, 0.96],
                extrapolate: "clamp",
              });
              const translateY = scrollVal.interpolate({
                inputRange,
                outputRange: [6, 0, 6],
                extrapolate: "clamp",
              });

              const isActive = selectedKey === item.key;
              const isRead = !!readMap?.[item.key];

              return (
                <Animated.View style={{ transform: [{ scale }, { translateY }] }}>
                  <ExhibitCard
                    exhibit={item}
                    exhibitLabel={exhibitLabelFn(index)}
                    active={isActive}
                    read={isRead}
                    width={CARD_WIDTH}
                    onRead={() => onRead(item)}
                    onSelectBest={() => onSelect(item)}
                    selectLabel={selectLabel}
                    disableSelect={disableSelect}
                  />
                </Animated.View>
              );
            }}
          />
        </View>
      </View>
    );
  };

  const Step1 = () => {
    const why = activeDrill?.why_it_matters || activeDrill?.why || null;
    const brief = buildMissionBrief(why, activeDrill?.prompt);

    return (
      <Card borderColor="#1B6BF2">
        <Text style={{ color: "#CFE0FF", fontWeight: "900" }}>{activeDrill?.title || "—"}</Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10 }}>
          <RowPill text={`Opponent: ${activeDrill?.opponent_type || "unknown"}`} />
          <RowPill text={`+${safeNum(activeDrill?.xp_reward)} XP`} accent="#FFCF4A" />
          <RowPill text={`+${safeNum(activeDrill?.light_points_bonus)} LP`} accent="#9CD8C3" />
        </View>

        <Text style={{ color: "#FFCF4A", fontWeight: "900", marginTop: 10 }}>Charge</Text>
        <Text style={{ color: "#fff", marginTop: 8, lineHeight: 22 }}>
          “{typedObjection}
          {isTyping ? "▌" : ""}”
        </Text>

        {showWhy ? (
          <>
            <Text style={{ color: "#FFCF4A", fontWeight: "900", marginTop: 14 }}>Mission Brief</Text>
            <Text style={{ color: "#fff", marginTop: 8, lineHeight: 22 }}>{brief}</Text>
          </>
        ) : null}
      </Card>
    );
  };

  const Step2 = () => {
    const refs = Array.isArray(activeDrill?.scripture_refs) ? activeDrill.scripture_refs.filter(Boolean) : [];
    const openedOpponentCount = prosecutionExhibits.reduce((n, ex) => (readMap?.[ex.key] ? n + 1 : n), 0);

    return (
      <Card borderColor="#23466f">
        <Text style={{ color: "#FFCF4A", fontWeight: "900" }}>Evidence</Text>
        <Text style={{ color: "#9bb3c9", marginTop: 8, lineHeight: 20 }}>
          Review their best evidence first. Then identify the hidden assumption (fault line).
        </Text>

        <ExhibitCarousel
          label="EVIDENCE"
          exhibits={prosecutionExhibits}
          selectedKey={selectedProsecutionKey}
          scrollVal={prosX}
          exhibitLabelFn={(index) => `EXHIBIT ${letterForIndex(index)}`}
          selectLabel="Mark as main claim"
          onSelect={(ex) => selectExhibitAsBest(ex)}
          onRead={(ex) => openExhibit(ex)}
        />

        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: "#CFE0FF", fontWeight: "900" }}>Find the fault line</Text>
            <Pressable onPress={() => setFaultLineHelpOpen(true)}>
              <Text style={{ color: "#9CD8C3", fontWeight: "900" }}>ⓘ</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10 }}>
            {faultLines.map((f) => {
              const selected = selectedFaultLine === f;
              return (
                <Pressable
                  key={f}
                  onPress={() => setSelectedFaultLine(f)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 999,
                    backgroundColor: selected ? "#1B6BF2" : "#163154",
                    borderWidth: 1,
                    borderColor: selected ? "#1B6BF2" : "#23466f",
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "900" }}>{f}</Text>
                </Pressable>
              );
            })}
          </View>

          <View
            style={{
              marginTop: 10,
              padding: 12,
              borderRadius: 14,
              backgroundColor: "#0D1B2A",
              borderWidth: 1,
              borderColor: "#1f3e64",
            }}
          >
            <Text style={{ color: "#9bb3c9", lineHeight: 20 }}>
              Evidence progress: opened {openedOpponentCount}/{prosecutionExhibits.length}
              {"\n"}Fault line: {selectedFaultLine ? "Selected ✓" : "Not selected"}
            </Text>
          </View>
        </View>

        <Text style={{ color: "#CFE0FF", fontWeight: "900", marginTop: 16 }}>Scripture anchors (optional)</Text>
        {refs.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
            {refs.map((r) => (
              <Pressable
                key={r}
                onPress={() => openScripture(r)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: "#163154",
                  borderWidth: 1,
                  borderColor: "#23466f",
                  marginRight: 8,
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "900" }}>{r}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={{ color: "#9bb3c9", marginTop: 8 }}>No scripture refs seeded for this drill yet.</Text>
        )}
      </Card>
    );
  };

  const Step3 = () => {
    const selected = selectedDefenseKey ? defenseExhibits.find((x) => x.key === selectedDefenseKey) : null;

    return (
      <Card borderColor="#23466f">
        <Text style={{ color: "#FFCF4A", fontWeight: "900" }}>Cross-exam</Text>
        <Text style={{ color: "#9bb3c9", marginTop: 8, lineHeight: 20 }}>
          Select the best rebuttal exhibit. Reading is recommended but not forced.
        </Text>

        <ExhibitCarousel
          label="DEFENCE"
          exhibits={defenseExhibits}
          selectedKey={selectedDefenseKey}
          scrollVal={defX}
          exhibitLabelFn={(index) => `EXHIBIT ${index + 1}`}
          selectLabel="Select best rebuttal"
          onSelect={(ex) => selectExhibitAsBest(ex)}
          onRead={(ex) => openExhibit(ex)}
        />

        <View
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 14,
            backgroundColor: "#0D1B2A",
            borderWidth: 1,
            borderColor: "#1f3e64",
          }}
        >
          <Text style={{ color: "#CFE0FF", fontWeight: "900" }}>Selection</Text>
          <Text style={{ color: "#fff", marginTop: 8, lineHeight: 20 }}>
            Best rebuttal: {selected ? `Selected ✓ — ${selected.title}` : "Not selected"}
          </Text>
          <Text style={{ color: "#9bb3c9", marginTop: 6 }}>
            Tip: opening the case file marks it as READ ✓.
          </Text>
        </View>

        <Pressable
          onPress={() => setNotesOpen((v) => !v)}
          style={{
            marginTop: 14,
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderRadius: 12,
            backgroundColor: notesOpen ? "#1B6BF2" : "#163154",
            borderWidth: 1,
            borderColor: "#23466f",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "900", textAlign: "center" }}>
            {notesOpen ? "Hide notes (optional) ▲" : "Add notes (optional) ▼"}
          </Text>
        </Pressable>

        {notesOpen ? (
          <TextInput
            value={notesText}
            onChangeText={setNotesText}
            placeholder="Optional: write what you’d actually say (1–3 lines)."
            placeholderTextColor="#6f87a2"
            multiline
            style={{
              marginTop: 10,
              minHeight: 90,
              backgroundColor: "#0D1B2A",
              borderRadius: 14,
              padding: 12,
              color: "#fff",
              borderWidth: 1,
              borderColor: "#1f3e64",
              textAlignVertical: "top",
            }}
          />
        ) : null}
      </Card>
    );
  };

  const Step4 = () => {
    const g = verdict?.grade || null;
    const score = safeNum(g?.score);
    const summary = g?.summary || g?.feedback_summary || null;

    const stampRotate = stampScale.interpolate({
      inputRange: [0, 1],
      outputRange: ["-8deg", "0deg"],
    });

    return (
      <Card borderColor="#FFCF4A">
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#FFCF4A", fontWeight: "900" }}>Verdict</Text>

          {verdict ? (
            <Animated.View style={{ transform: [{ scale: stampScale }, { rotate: stampRotate }] }}>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: "#2a2a14",
                  borderWidth: 1,
                  borderColor: "#FFCF4A",
                }}
              >
                <Text style={{ color: "#FFCF4A", fontWeight: "900", letterSpacing: 2 }}>STAMPED</Text>
              </View>
            </Animated.View>
          ) : null}
        </View>

        {verdict ? (
          <>
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 22, marginTop: 10 }}>
              Score: {score}/100
            </Text>

            <Text style={{ color: "#9bb3c9", marginTop: 8 }}>
              Rewards: +{safeNum(verdict.xpEarned)} XP • +{safeNum(verdict.lpEarned)} LP
              {verdict.alreadyCompleted ? " (already completed — no farming)" : ""}
            </Text>

            {!!summary ? (
              <>
                <Text style={{ color: "#CFE0FF", fontWeight: "900", marginTop: 14 }}>Summary</Text>
                <Text style={{ color: "#fff", marginTop: 6, lineHeight: 20 }}>{summary}</Text>
              </>
            ) : null}

            <Pressable
              onPress={() => {
                const next = nextDrill?.id;
                if (!next) return;
                resetForDrill(next);
              }}
              style={{
                marginTop: 14,
                backgroundColor: "#1B6BF2",
                paddingVertical: 12,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900" }}>
                Start next drill
              </Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.goBack()}
              style={{
                marginTop: 10,
                backgroundColor: "#163154",
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#23466f",
              }}
            >
              <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900" }}>
                Back to Daily
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={{ color: "#9bb3c9", marginTop: 10 }}>
              Submit your selection to get scored.
            </Text>
            <Pressable
              onPress={() => setStep(3)}
              style={{
                marginTop: 14,
                backgroundColor: "#1B6BF2",
                paddingVertical: 12,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900" }}>
                Go to cross-exam
              </Text>
            </Pressable>
          </>
        )}
      </Card>
    );
  };

  // ---------- render ----------
  if (loading) {
    return (
      <Screen backgroundColor="#0D1B2A">
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  if (apo?.ok === false) {
    return (
      <Screen backgroundColor="#0D1B2A">
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 22 }}>Apologetics Arena</Text>
          <View
            style={{
              marginTop: 12,
              padding: 14,
              borderRadius: 18,
              backgroundColor: "#11233B",
              borderWidth: 1,
              borderColor: "#23466f",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "900" }}>Couldn’t load</Text>
            <Text style={{ color: "#9bb3c9", marginTop: 8 }}>{apo?.error || "Unknown error"}</Text>
          </View>

          <Pressable
            onPress={() => navigation.goBack()}
            style={{
              marginTop: 14,
              backgroundColor: "#163154",
              paddingVertical: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#23466f",
            }}
          >
            <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900" }}>Back</Text>
          </Pressable>
        </ScrollView>
      </Screen>
    );
  }

  if (!activeDrill) {
    return (
      <Screen backgroundColor="#0D1B2A">
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 22 }}>Apologetics Arena</Text>
          <Text style={{ color: "#9bb3c9", marginTop: 10 }}>No drills seeded for today.</Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={{
              marginTop: 14,
              backgroundColor: "#163154",
              paddingVertical: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#23466f",
            }}
          >
            <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900" }}>Back</Text>
          </Pressable>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor="#0D1B2A">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <StepHeader />

        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            marginTop: 12,
            alignSelf: "flex-start",
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 999,
            backgroundColor: "#163154",
            borderWidth: 1,
            borderColor: "#23466f",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "900" }}>← Back</Text>
        </Pressable>

        <DrillStrip />

        <Animated.View style={{ opacity: stepOpacity, transform: [{ translateY: stepSlide }] }}>
          {step === 1 ? <Step1 /> : null}
          {step === 2 ? <Step2 /> : null}
          {step === 3 ? <Step3 /> : null}
          {step === 4 ? <Step4 /> : null}
        </Animated.View>

        <StepNav showSubmit={step === 3} />

        {/* Fault line tooltip */}
        <Modal visible={faultLineHelpOpen} transparent animationType="fade" onRequestClose={() => setFaultLineHelpOpen(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", padding: 18 }}>
            <View
              style={{
                backgroundColor: "#0D1B2A",
                borderRadius: 18,
                padding: 16,
                borderWidth: 1,
                borderColor: "#23466f",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 18 }}>Fault line</Text>
              <Text style={{ color: "#9bb3c9", marginTop: 10, lineHeight: 20 }}>
                Fault line = the hidden assumption.
              </Text>
              <Text style={{ color: "#fff", marginTop: 10, lineHeight: 20 }}>
                Which one has to be true for the claim to work?
              </Text>

              <Pressable
                onPress={() => setFaultLineHelpOpen(false)}
                style={{
                  marginTop: 14,
                  backgroundColor: "#1B6BF2",
                  paddingVertical: 12,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900" }}>Got it</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* First-time tutorial */}
        <Modal visible={tutorialOpen} transparent animationType="fade" onRequestClose={() => setTutorialOpen(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "center", padding: 18 }}>
            <View
              style={{
                backgroundColor: "#0D1B2A",
                borderRadius: 18,
                padding: 16,
                borderWidth: 1,
                borderColor: "#23466f",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 18 }}>How the Arena works</Text>

              <View style={{ marginTop: 12 }}>
                <Text style={{ color: "#FFCF4A", fontWeight: "900" }}>Charge:</Text>
                <Text style={{ color: "#fff", marginTop: 4, lineHeight: 20 }}>Hear the objection.</Text>

                <Text style={{ color: "#FFCF4A", fontWeight: "900", marginTop: 10 }}>Evidence:</Text>
                <Text style={{ color: "#fff", marginTop: 4, lineHeight: 20 }}>
                  Open at least one opponent exhibit and find the fault line.
                </Text>

                <Text style={{ color: "#FFCF4A", fontWeight: "900", marginTop: 10 }}>Cross-exam:</Text>
                <Text style={{ color: "#fff", marginTop: 4, lineHeight: 20 }}>
                  Select the best rebuttal exhibit (notes optional).
                </Text>

                <Text style={{ color: "#FFCF4A", fontWeight: "900", marginTop: 10 }}>Verdict:</Text>
                <Text style={{ color: "#fff", marginTop: 4, lineHeight: 20 }}>
                  Faith Coach scores it and you earn rewards.
                </Text>
              </View>

              <Pressable
                onPress={dismissTutorial}
                style={{
                  marginTop: 14,
                  backgroundColor: "#1B6BF2",
                  paddingVertical: 12,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900" }}>Start</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Scripture Reader Modal */}
        <ScriptureReaderModal
          open={scriptureOpen}
          onClose={() => setScriptureOpen(false)}
          reference={scriptureRef || ""}
          translation={scriptureTranslation || "WEB"}
        />
      </ScrollView>
    </Screen>
  );
}
