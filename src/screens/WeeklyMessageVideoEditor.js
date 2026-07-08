// src/screens/WeeklyMessageVideoEditor.js
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import * as ScreenOrientation from "expo-screen-orientation";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const COLORS = {
  cream: "#FFFCF5",
  card: "#FFFFFF",
  ink: "#1F2933",
  muted: "#6B7280",
  softMuted: "#9CA3AF",
  line: "rgba(15, 23, 42, 0.09)",

  amber: "#B45309",
  amberDark: "#7C2D12",
  amberSoft: "rgba(180, 83, 9, 0.10)",
  amberBorder: "rgba(180, 83, 9, 0.20)",

  olive: "#4F633B",
  oliveDark: "#39472B",
  oliveSoft: "rgba(79, 99, 59, 0.10)",
  oliveBorder: "rgba(79, 99, 59, 0.20)",

  darkVideo: "#2A241D",
  darkVideo2: "#3B3027",
  danger: "#B42318",
  dangerSoft: "rgba(180, 35, 24, 0.08)",
  dangerBorder: "rgba(180, 35, 24, 0.20)",
};

const TABS = [
  { key: "trim", label: "Trim", icon: "cut-outline" },
  { key: "format", label: "Format", icon: "resize-outline" },
  { key: "music", label: "Music", icon: "musical-notes-outline" },
  { key: "captions", label: "Captions", icon: "text-outline" },
  { key: "ai", label: "AI Pro", icon: "sparkles-outline" },
];

const MUSIC_MOODS = [
  "No music",
  "Gentle piano",
  "Reflective pad",
  "Hopeful acoustic",
  "Soft ambient",
];

const TRANSITIONS = [
  "None",
  "Fade in/out",
  "Soft dissolve",
  "Intro title card",
  "Scripture outro",
];

const FORMATS = [
  {
    key: "original",
    label: "Original",
    helper: "Best for Weekly Message inside the app.",
    icon: "phone-portrait-outline",
    preview: "Original",
  },
  {
    key: "landscape_16_9",
    label: "Landscape 16:9",
    helper: "Best for YouTube, church websites and sermon pages.",
    icon: "tv-outline",
    preview: "16:9",
  },
  {
    key: "portrait_9_16",
    label: "Portrait 9:16",
    helper: "Best for Reels, Shorts and Stories.",
    icon: "phone-portrait-outline",
    preview: "9:16",
  },
  {
    key: "square_1_1",
    label: "Square 1:1",
    helper: "Best for simple social feed posts.",
    icon: "square-outline",
    preview: "1:1",
  },
  {
    key: "feed_4_5",
    label: "Feed 4:5",
    helper: "Best for Instagram and Facebook feed videos.",
    icon: "tablet-portrait-outline",
    preview: "4:5",
  },
];

function isLandscapeSize() {
  const { width, height } = Dimensions.get("window");
  return width > height;
}

function clampNumber(value, min, max) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(Math.max(number, min), max);
}

function formatSeconds(value) {
  const totalSeconds = Math.max(0, Math.floor(Number(value) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getFormatLabel(formatKey) {
  return FORMATS.find((item) => item.key === formatKey)?.label || "Original";
}

function getFormatPreviewStyle(formatKey) {
  if (formatKey === "landscape_16_9") return { width: 142, height: 80 };
  if (formatKey === "portrait_9_16") return { width: 70, height: 124 };
  if (formatKey === "square_1_1") return { width: 96, height: 96 };
  if (formatKey === "feed_4_5") return { width: 86, height: 108 };

  return { width: 112, height: 90 };
}

function getSafeDuration(duration) {
  const number = Number(duration);

  if (!Number.isFinite(number) || number <= 0) {
    return 0;
  }

  return number;
}

function buildTrimLabel(startSeconds, endSeconds) {
  if (endSeconds && String(endSeconds).trim().length > 0) {
    return `${startSeconds || "0"}s to ${endSeconds}s`;
  }

  return `Starts at ${startSeconds || "0"}s`;
}

export default function WeeklyMessageVideoEditor({ navigation, route }) {
  const params = route?.params || {};

  const {
    videoUrl = "",
    title = "",
    speakerLabel = "",
    churchName = "Your church",
    weekLabel = "This week",
    selectedMusicMood = "No music",
    initialTab = "trim",
    initialFormat = "original",
    existingPlan = null,
    onSavePlan,
  } = params;

  const [isLandscape, setIsLandscape] = useState(isLandscapeSize());
  const [activeTab, setActiveTab] = useState(initialTab || "trim");

  const [currentTime, setCurrentTime] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(
    Number(existingPlan?.durationSeconds) || 0
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const [startSeconds, setStartSeconds] = useState(
    existingPlan?.startSeconds || "0"
  );
  const [endSeconds, setEndSeconds] = useState(existingPlan?.endSeconds || "");

  const [format, setFormat] = useState(
    existingPlan?.format || initialFormat || "original"
  );

  const [musicMood, setMusicMood] = useState(
    existingPlan?.musicMood || selectedMusicMood || "No music"
  );

  const [transition, setTransition] = useState(
    existingPlan?.transition || "None"
  );

  const [lowerThirdCaption, setLowerThirdCaption] = useState(
    existingPlan?.lowerThirdCaption ||
      (speakerLabel ? `${speakerLabel} • ${churchName}` : churchName)
  );

  const [scriptureOverlay, setScriptureOverlay] = useState(
    existingPlan?.scriptureOverlay || ""
  );

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savingEdits, setSavingEdits] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(existingPlan?.savedAt || null);

  const previewStopRef = useRef(null);

  const player = useVideoPlayer(videoUrl || null, (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.timeUpdateEventInterval = 0.25;
  });

  function markUnsaved() {
    setHasUnsavedChanges(true);
  }

  useEffect(() => {
    let mounted = true;

    async function prepareOrientation() {
      try {
        await ScreenOrientation.unlockAsync();
      } catch (error) {
        console.log("Orientation unlock error:", error);
      }

      if (mounted) {
        setIsLandscape(isLandscapeSize());
      }
    }

    prepareOrientation();

    const dimensionSubscription = Dimensions.addEventListener("change", () => {
      setIsLandscape(isLandscapeSize());
    });

    return () => {
      mounted = false;
      dimensionSubscription?.remove?.();

      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      ).catch((error) => {
        console.log("Orientation lock back to portrait error:", error);
      });
    };
  }, []);

  useEffect(() => {
    if (!player) return undefined;

    const statusSubscription = player.addListener(
      "statusChange",
      ({ status, error }) => {
        if (error) {
          console.log("Video status error:", error);
        }

        if (status === "readyToPlay") {
          const nextDuration = getSafeDuration(player.duration);

          if (nextDuration > 0) {
            setDurationSeconds(nextDuration);
          }
        }
      }
    );

    const timeSubscription = player.addListener("timeUpdate", (event) => {
      const nextTime = Number(event?.currentTime) || 0;

      if (!isScrubbing) {
        setCurrentTime(nextTime);
      }

      const stopAt = previewStopRef.current;

      if (
        stopAt !== null &&
        Number.isFinite(Number(stopAt)) &&
        nextTime >= Number(stopAt)
      ) {
        player.pause();
        previewStopRef.current = null;
        setIsPlaying(false);
      }
    });

    const playingSubscription = player.addListener(
      "playingChange",
      ({ isPlaying: nextIsPlaying }) => {
        setIsPlaying(Boolean(nextIsPlaying));
      }
    );

    return () => {
      statusSubscription?.remove?.();
      timeSubscription?.remove?.();
      playingSubscription?.remove?.();
    };
  }, [player, isScrubbing]);

  const maxTimelineValue = durationSeconds > 0 ? durationSeconds : 1;

  const planSummary = useMemo(() => {
    return {
      trim: buildTrimLabel(startSeconds, endSeconds),
      format: getFormatLabel(format),
      music: musicMood,
      transition,
      lowerThird: lowerThirdCaption || "None",
      scripture: scriptureOverlay || "None",
      saved: lastSavedAt ? "Saved" : "Not saved yet",
    };
  }, [
    startSeconds,
    endSeconds,
    format,
    musicMood,
    transition,
    lowerThirdCaption,
    scriptureOverlay,
    lastSavedAt,
  ]);

  function seekTo(seconds) {
    const safeSeconds = clampNumber(seconds, 0, maxTimelineValue);

    try {
      player.currentTime = safeSeconds;
      setCurrentTime(safeSeconds);
    } catch (error) {
      console.log("Seek error:", error);
    }
  }

  function togglePlayPause() {
    try {
      previewStopRef.current = null;

      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
        player.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.log("Play/pause error:", error);
      Alert.alert("Video error", "The video could not be played.");
    }
  }

  function replayFromStart() {
    previewStopRef.current = null;
    seekTo(0);

    try {
      player.play();
      setIsPlaying(true);
    } catch (error) {
      console.log("Replay error:", error);
    }
  }

  function handleSliderValueChange(value) {
    setIsScrubbing(true);
    setCurrentTime(value);
  }

  function handleSliderComplete(value) {
    setIsScrubbing(false);
    seekTo(value);
  }

  function handleSetStartHere() {
    const rounded = Math.max(0, Math.floor(currentTime));
    const safeEnd = Number(endSeconds);

    if (Number.isFinite(safeEnd) && safeEnd > 0 && rounded >= safeEnd) {
      Alert.alert(
        "Start is after end",
        "Choose a start point before the end point."
      );
      return;
    }

    setStartSeconds(String(rounded));
    markUnsaved();
  }

  function handleSetEndHere() {
    const rounded = Math.max(0, Math.floor(currentTime));
    const safeStart = Number(startSeconds) || 0;

    if (rounded <= safeStart) {
      Alert.alert(
        "End is before start",
        "Choose an end point after the start point."
      );
      return;
    }

    setEndSeconds(String(rounded));
    markUnsaved();
  }

  function handleResetTrim() {
    previewStopRef.current = null;
    setStartSeconds("0");
    setEndSeconds("");
    markUnsaved();
  }

  function handlePreviewSelectedSection() {
    const safeStart = clampNumber(startSeconds || 0, 0, maxTimelineValue);
    const safeEnd = Number(endSeconds);

    if (!Number.isFinite(safeEnd) || safeEnd <= safeStart) {
      Alert.alert(
        "Set an end point",
        "Choose a start and end point before previewing the selected section."
      );
      return;
    }

    previewStopRef.current = safeEnd;
    seekTo(safeStart);

    try {
      player.play();
      setIsPlaying(true);
    } catch (error) {
      console.log("Preview selected section error:", error);
      Alert.alert("Video error", "The selected section could not be previewed.");
    }
  }

  function handleAiTighten() {
    Alert.alert(
      "Triunely Media Studio Pro",
      "AI tighten will help find a stronger start and end point for the message clip. This is planned for the premium media studio."
    );
  }

  function buildEditPlan() {
    const safeDuration = getSafeDuration(durationSeconds);
    const trimLabel = buildTrimLabel(startSeconds, endSeconds);
    const formatLabel = getFormatLabel(format);

    return {
      startSeconds: startSeconds || "0",
      endSeconds: endSeconds || "",
      trimLabel,
      format,
      formatLabel,
      musicMood,
      transition,
      lowerThirdCaption,
      scriptureOverlay,
      durationSeconds: safeDuration,
      savedAt: new Date().toISOString(),
    };
  }

  async function handleSaveEdits(options = {}) {
    const { leaveAfterSave = false, showAlert = true } = options;

    setSavingEdits(true);

    const plan = buildEditPlan();

    try {
      if (typeof onSavePlan === "function") {
        await onSavePlan(plan);
      }

      setLastSavedAt(plan.savedAt);
      setHasUnsavedChanges(false);
      setSavingEdits(false);

      if (leaveAfterSave) {
        navigation.goBack();
        return true;
      }

      if (showAlert) {
        Alert.alert(
          "Video edits saved",
          "Your edits have been saved. You can keep editing or tap Done when finished."
        );
      }

      return true;
    } catch (error) {
      console.log("Save video edits error:", error);
      setSavingEdits(false);

      Alert.alert(
        "Save failed",
        error?.message
          ? `The video edits could not be saved.\n\nError: ${error.message}`
          : "The video edits could not be saved. Please try again."
      );

      return false;
    }
  }

  function handleDone() {
    if (!hasUnsavedChanges) {
      navigation.goBack();
      return;
    }

    Alert.alert(
      "Save changes?",
      "You have unsaved video edits. Save them before returning to Weekly Message Studio?",
      [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Leave without saving",
          style: "destructive",
          onPress: () => navigation.goBack(),
        },
        {
          text: "Save and leave",
          onPress: () =>
            handleSaveEdits({ leaveAfterSave: true, showAlert: false }),
        },
      ]
    );
  }

  function handleBackWithoutSaving() {
    if (!hasUnsavedChanges) {
      navigation.goBack();
      return;
    }

    Alert.alert(
      "Leave without saving?",
      "Any video edits you have not saved will be lost.",
      [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Leave without saving",
          style: "destructive",
          onPress: () => navigation.goBack(),
        },
      ]
    );
  }

  function updateStartSeconds(value) {
    setStartSeconds(value);
    markUnsaved();
  }

  function updateEndSeconds(value) {
    setEndSeconds(value);
    markUnsaved();
  }

  function updateFormat(value) {
    setFormat(value);
    markUnsaved();
  }

  function updateMusicMood(value) {
    setMusicMood(value);
    markUnsaved();
  }

  function updateTransition(value) {
    setTransition(value);
    markUnsaved();
  }

  function updateLowerThirdCaption(value) {
    setLowerThirdCaption(value);
    markUnsaved();
  }

  function updateScriptureOverlay(value) {
    setScriptureOverlay(value);
    markUnsaved();
  }

  if (!isLandscape) {
    return (
      <View style={styles.rotateGate}>
        <View style={styles.rotateCard}>
          <View style={styles.rotateIconCircle}>
            <Ionicons
              name="phone-landscape-outline"
              size={48}
              color={COLORS.amber}
            />
          </View>

          <Text style={styles.rotateKicker}>Triunely Media Studio</Text>
          <Text style={styles.rotateTitle}>Turn your phone sideways</Text>

          <Text style={styles.rotateText}>
            The video editor opens in landscape so the video, timeline, captions
            and media controls have enough room.
          </Text>

          <View style={styles.rotateSteps}>
            <View style={styles.rotateStep}>
              <Text style={styles.rotateStepNumber}>1</Text>
              <Text style={styles.rotateStepText}>
                Rotate your phone sideways
              </Text>
            </View>

            <View style={styles.rotateStep}>
              <Text style={styles.rotateStepNumber}>2</Text>
              <Text style={styles.rotateStepText}>
                The editor will open automatically
              </Text>
            </View>
          </View>

          <Pressable style={styles.rotateBackButton} onPress={handleDone}>
            <Ionicons name="chevron-back" size={18} color={COLORS.oliveDark} />
            <Text style={styles.rotateBackText}>Back to Weekly Message</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function renderTabButton(tab) {
    const active = activeTab === tab.key;

    return (
      <Pressable
        key={tab.key}
        onPress={() => setActiveTab(tab.key)}
        style={[styles.tabButton, active && styles.tabButtonActive]}
      >
        <Ionicons
          name={tab.icon}
          size={16}
          color={active ? "#FFFFFF" : COLORS.oliveDark}
        />

        <Text
          style={[styles.tabButtonText, active && styles.tabButtonTextActive]}
        >
          {tab.label}
        </Text>
      </Pressable>
    );
  }

  function renderVideoPreview() {
    return (
      <View style={styles.videoCard}>
        <View style={styles.videoPreview}>
          {videoUrl ? (
            <VideoView
              style={styles.videoView}
              player={player}
              allowsFullscreen={false}
              allowsPictureInPicture={false}
              nativeControls={false}
              contentFit="contain"
            />
          ) : (
            <View style={styles.noVideoBox}>
              <Ionicons
                name="videocam-off-outline"
                size={48}
                color="#EADFCB"
              />

              <Text style={styles.noVideoTitle}>No video attached</Text>

              <Text style={styles.noVideoText}>
                Go back to Weekly Message Studio and upload a video first.
              </Text>
            </View>
          )}

          <View style={styles.videoOverlayTop}>
            <Text style={styles.videoOverlayTitle} numberOfLines={1}>
              {title || "Weekly message video"}
            </Text>

            <Text style={styles.videoOverlaySub} numberOfLines={1}>
              {speakerLabel || "Speaker not set"} • {weekLabel}
            </Text>
          </View>

          <View style={styles.videoOverlayBottom}>
            <Pressable
              style={styles.roundVideoButton}
              onPress={togglePlayPause}
              disabled={!videoUrl}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={22}
                color="#FFFFFF"
              />
            </Pressable>

            <Pressable
              style={styles.roundVideoButtonSecondary}
              onPress={replayFromStart}
              disabled={!videoUrl}
            >
              <Ionicons
                name="play-skip-back-outline"
                size={20}
                color="#FFFFFF"
              />
            </Pressable>

            <Text style={styles.videoTimeText}>
              {formatSeconds(currentTime)} / {formatSeconds(durationSeconds)}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <MetaItem label="Church" value={churchName || "Not set"} />
          <MetaItem label="Speaker" value={speakerLabel || "Not set"} />
          <MetaItem label="Week" value={weekLabel || "Not set"} />
        </View>
      </View>
    );
  }

  function renderTrimTab() {
    return (
      <View style={styles.editorPanel}>
        <View style={styles.panelHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.panelKicker}>Trim</Text>
            <Text style={styles.panelTitle}>
              Choose the strongest part of the message
            </Text>
          </View>

          <View
            style={[
              styles.smallStatusPill,
              hasUnsavedChanges && styles.unsavedPill,
            ]}
          >
            <Text
              style={[
                styles.smallStatusText,
                hasUnsavedChanges && styles.unsavedPillText,
              ]}
            >
              {hasUnsavedChanges ? "Unsaved" : "Saved"}
            </Text>
          </View>
        </View>

        <View style={styles.realTimelineCard}>
          <View style={styles.timelineHeader}>
            <Text style={styles.timelineTitle}>Timeline</Text>

            <Text style={styles.timelineTime}>
              {formatSeconds(currentTime)} / {formatSeconds(durationSeconds)}
            </Text>
          </View>

          <Slider
            value={clampNumber(currentTime, 0, maxTimelineValue)}
            minimumValue={0}
            maximumValue={maxTimelineValue}
            step={0.1}
            minimumTrackTintColor={COLORS.amber}
            maximumTrackTintColor="#E3D4BE"
            thumbTintColor={COLORS.olive}
            onValueChange={handleSliderValueChange}
            onSlidingComplete={handleSliderComplete}
            disabled={!videoUrl}
          />

          <View style={styles.trimMarkerRow}>
            <View style={styles.trimMarker}>
              <Text style={styles.trimMarkerLabel}>Start</Text>
              <Text style={styles.trimMarkerValue}>
                {formatSeconds(startSeconds || 0)}
              </Text>
            </View>

            <View style={styles.trimMarker}>
              <Text style={styles.trimMarkerLabel}>End</Text>
              <Text style={styles.trimMarkerValue}>
                {endSeconds ? formatSeconds(endSeconds) : "End of video"}
              </Text>
            </View>

            <View style={styles.trimMarker}>
              <Text style={styles.trimMarkerLabel}>Selected</Text>
              <Text style={styles.trimMarkerValue}>
                {buildTrimLabel(startSeconds, endSeconds)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.primaryControlGrid}>
          <Pressable
            style={styles.editorActionButton}
            onPress={handleSetStartHere}
            disabled={!videoUrl}
          >
            <Ionicons name="flag-outline" size={18} color={COLORS.oliveDark} />
            <Text style={styles.editorActionText}>Set start here</Text>
          </Pressable>

          <Pressable
            style={styles.editorActionButton}
            onPress={handleSetEndHere}
            disabled={!videoUrl}
          >
            <Ionicons name="flag" size={18} color={COLORS.oliveDark} />
            <Text style={styles.editorActionText}>Set end here</Text>
          </Pressable>

          <Pressable
            style={styles.editorActionButton}
            onPress={handlePreviewSelectedSection}
            disabled={!videoUrl}
          >
            <Ionicons name="eye-outline" size={18} color={COLORS.oliveDark} />
            <Text style={styles.editorActionText}>Preview selected</Text>
          </Pressable>

          <Pressable
            style={styles.editorActionButton}
            onPress={handleResetTrim}
          >
            <Ionicons
              name="refresh-outline"
              size={18}
              color={COLORS.oliveDark}
            />
            <Text style={styles.editorActionText}>Reset trim</Text>
          </Pressable>
        </View>

        <View style={styles.controlsRow}>
          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Start seconds</Text>
            <TextInput
              value={startSeconds}
              onChangeText={updateStartSeconds}
              placeholder="0"
              keyboardType="numeric"
              style={styles.input}
              placeholderTextColor={COLORS.softMuted}
            />
          </View>

          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>End seconds</Text>
            <TextInput
              value={endSeconds}
              onChangeText={updateEndSeconds}
              placeholder="Example: 180"
              keyboardType="numeric"
              style={styles.input}
              placeholderTextColor={COLORS.softMuted}
            />
          </View>

          <Pressable style={styles.proAction} onPress={handleAiTighten}>
            <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
            <Text style={styles.proActionText}>AI tighten</Text>
            <Text style={styles.proMiniBadge}>Pro</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function renderFormatTab() {
    return (
      <View style={styles.editorPanel}>
        <View style={styles.panelHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.panelKicker}>Format</Text>
            <Text style={styles.panelTitle}>
              Choose where this video will be used
            </Text>
          </View>
        </View>

        <View style={styles.formatLayout}>
          <View style={styles.formatList}>
            {FORMATS.map((item) => {
              const selected = format === item.key;

              return (
                <Pressable
                  key={item.key}
                  onPress={() => updateFormat(item.key)}
                  style={[
                    styles.formatOption,
                    selected && styles.formatOptionSelected,
                  ]}
                >
                  <View
                    style={[
                      styles.formatIcon,
                      selected && styles.formatIconSelected,
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={selected ? "#FFFFFF" : COLORS.amber}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.formatOptionTitle,
                        selected && styles.formatOptionTitleSelected,
                      ]}
                    >
                      {item.label}
                    </Text>

                    <Text
                      style={[
                        styles.formatOptionText,
                        selected && styles.formatOptionTextSelected,
                      ]}
                    >
                      {item.helper}
                    </Text>
                  </View>

                  {selected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#FFFFFF"
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.formatPreviewCard}>
            <Text style={styles.formatPreviewKicker}>Preview shape</Text>

            <View style={styles.formatPreviewStage}>
              <View
                style={[
                  styles.formatPreviewBox,
                  getFormatPreviewStyle(format),
                ]}
              >
                <Text style={styles.formatPreviewRatio}>
                  {FORMATS.find((item) => item.key === format)?.preview ||
                    "Original"}
                </Text>
              </View>
            </View>

            <Text style={styles.formatPreviewTitle}>
              {getFormatLabel(format)}
            </Text>

            <Text style={styles.formatPreviewText}>
              This saves the intended output shape. Final crop/export will be
              handled by the rendering system later.
            </Text>
          </View>
        </View>
      </View>
    );
  }
    function renderMusicTab() {
    return (
      <View style={styles.editorPanel}>
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.panelKicker}>Music</Text>

            <Text style={styles.panelTitle}>
              Choose mood and transition style
            </Text>
          </View>
        </View>

        <View style={styles.splitRow}>
          <View style={styles.splitColumn}>
            <Text style={styles.sectionLabel}>Music mood</Text>

            <View style={styles.choiceWrap}>
              {MUSIC_MOODS.map((mood) => {
                const selected = musicMood === mood;

                return (
                  <Pressable
                    key={mood}
                    onPress={() => updateMusicMood(mood)}
                    style={[
                      styles.choiceChip,
                      selected && styles.choiceChipSelected,
                    ]}
                  >
                    <Ionicons
                      name={selected ? "checkmark-circle" : "ellipse-outline"}
                      size={16}
                      color={selected ? "#FFFFFF" : COLORS.oliveDark}
                    />

                    <Text
                      style={[
                        styles.choiceText,
                        selected && styles.choiceTextSelected,
                      ]}
                    >
                      {mood}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.splitColumn}>
            <Text style={styles.sectionLabel}>Transition style</Text>

            <View style={styles.choiceWrap}>
              {TRANSITIONS.map((item) => {
                const selected = transition === item;

                return (
                  <Pressable
                    key={item}
                    onPress={() => updateTransition(item)}
                    style={[
                      styles.choiceChip,
                      selected && styles.choiceChipSelected,
                    ]}
                  >
                    <Ionicons
                      name={selected ? "checkmark-circle" : "ellipse-outline"}
                      size={16}
                      color={selected ? "#FFFFFF" : COLORS.oliveDark}
                    />

                    <Text
                      style={[
                        styles.choiceText,
                        selected && styles.choiceTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.licenceNotice}>
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color={COLORS.oliveDark}
          />

          <Text style={styles.licenceText}>
            Use only licensed music or Triunely-provided music. This protects
            churches when publishing clips online.
          </Text>
        </View>
      </View>
    );
  }

  function renderCaptionsTab() {
    return (
      <View style={styles.editorPanel}>
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.panelKicker}>Captions</Text>
            <Text style={styles.panelTitle}>Add simple on-screen text</Text>
          </View>
        </View>

        <View style={styles.captionLayout}>
          <View style={styles.captionFields}>
            <View style={styles.inputBlockFull}>
              <Text style={styles.inputLabel}>Speaker caption</Text>

              <TextInput
                value={lowerThirdCaption}
                onChangeText={updateLowerThirdCaption}
                placeholder="Example: Pastor James • Sunday Message"
                style={styles.input}
                placeholderTextColor={COLORS.softMuted}
              />
            </View>

            <View style={styles.inputBlockFull}>
              <Text style={styles.inputLabel}>Scripture overlay</Text>

              <TextInput
                value={scriptureOverlay}
                onChangeText={updateScriptureOverlay}
                placeholder="Example: John 3:16"
                style={styles.input}
                placeholderTextColor={COLORS.softMuted}
              />
            </View>
          </View>

          <View style={styles.socialPreview}>
            <View style={styles.socialVideoBox}>
              <Ionicons
                name="phone-portrait-outline"
                size={32}
                color="#EADFCB"
              />

              <Text style={styles.socialPreviewTitle}>Preview</Text>

              <View style={styles.lowerThirdPreview}>
                <Text style={styles.lowerThirdText}>
                  {lowerThirdCaption || "Speaker caption"}
                </Text>
              </View>

              {scriptureOverlay ? (
                <View style={styles.scripturePreview}>
                  <Text style={styles.scripturePreviewText}>
                    {scriptureOverlay}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    );
  }

  function renderAiTab() {
    return (
      <View style={styles.editorPanel}>
        <View style={styles.aiHero}>
          <View style={styles.aiHeroIcon}>
            <Ionicons name="sparkles-outline" size={28} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.aiKicker}>Triunely Media Studio Pro</Text>
            <Text style={styles.aiTitle}>Premium AI video help</Text>

            <Text style={styles.aiSubtitle}>
              Planned tools to help churches find strong clips, generate
              captions, create scripture overlays and prepare social posts.
            </Text>
          </View>
        </View>

        <View style={styles.aiGrid}>
          <AiFeature icon="cut-outline" title="Suggest best clip" />
          <AiFeature icon="text-outline" title="Generate captions" />
          <AiFeature icon="book-outline" title="Scripture overlays" />
          <AiFeature icon="film-outline" title="Social clip finder" />
          <AiFeature icon="create-outline" title="Write social post" />
          <AiFeature icon="cloud-upload-outline" title="Publishing support" />
        </View>
      </View>
    );
  }

  function renderActiveTab() {
    if (activeTab === "trim") return renderTrimTab();
    if (activeTab === "format") return renderFormatTab();
    if (activeTab === "music") return renderMusicTab();
    if (activeTab === "captions") return renderCaptionsTab();

    return renderAiTab();
  }

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={handleDone}>
          <Ionicons name="chevron-back" size={20} color={COLORS.ink} />
        </Pressable>

        <View style={styles.topTitleWrap}>
          <Text style={styles.topKicker}>Triunely Media Studio</Text>
          <Text style={styles.topTitle}>Edit video</Text>
        </View>

        <View
          style={[
            styles.topBadge,
            hasUnsavedChanges ? styles.topBadgeUnsaved : styles.topBadgeSaved,
          ]}
        >
          <Text
            style={[
              styles.topBadgeText,
              hasUnsavedChanges
                ? styles.topBadgeTextUnsaved
                : styles.topBadgeTextSaved,
            ]}
          >
            {hasUnsavedChanges ? "Unsaved changes" : "Saved"}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.editorScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.workspace}>
          <View style={styles.leftColumn}>
            {renderVideoPreview()}

            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryKicker}>Current edit choices</Text>
                <Text style={styles.summaryTitle}>Saved edit plan</Text>
              </View>

              <SummaryRow label="Trim" value={planSummary.trim} />
              <SummaryRow label="Format" value={planSummary.format} />
              <SummaryRow label="Music" value={planSummary.music} />
              <SummaryRow label="Transition" value={planSummary.transition} />
              <SummaryRow label="Caption" value={planSummary.lowerThird} />
              <SummaryRow label="Scripture" value={planSummary.scripture} />
            </View>
          </View>

          <View style={styles.rightColumn}>
            <View style={styles.tabDock}>{TABS.map(renderTabButton)}</View>

            {renderActiveTab()}

            <View style={styles.bottomActions}>
              <Pressable
                style={[
                  styles.saveButton,
                  savingEdits && styles.buttonDisabled,
                ]}
                onPress={() => handleSaveEdits()}
                disabled={savingEdits}
              >
                <Ionicons name="save-outline" size={18} color="#FFFFFF" />

                <Text style={styles.saveButtonText}>
                  {savingEdits ? "Saving..." : "Save edits"}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.doneButton,
                  savingEdits && styles.buttonDisabled,
                ]}
                onPress={handleDone}
                disabled={savingEdits}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color="#FFFFFF"
                />

                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>

              <Pressable
                style={styles.cancelButton}
                onPress={handleBackWithoutSaving}
                disabled={savingEdits}
              >
                <Ionicons
                  name="close-outline"
                  size={18}
                  color={COLORS.oliveDark}
                />

                <Text style={styles.cancelButtonText}>Back without saving</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function MetaItem({ label, value }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>

      <Text style={styles.metaValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function SummaryRow({ label, value }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>

      <Text style={styles.summaryValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function AiFeature({ icon, title }) {
  return (
    <View style={styles.aiFeature}>
      <View style={styles.aiFeatureIcon}>
        <Ionicons name={icon} size={19} color={COLORS.amber} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.aiFeatureTitle}>{title}</Text>
        <Text style={styles.aiFeatureSub}>Coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },

  rotateGate: {
    flex: 1,
    backgroundColor: COLORS.cream,
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },
  rotateCard: {
    width: "100%",
    maxWidth: 430,
    backgroundColor: COLORS.card,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: COLORS.amberBorder,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  rotateIconCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: COLORS.amberSoft,
    borderWidth: 1,
    borderColor: COLORS.amberBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 17,
  },
  rotateKicker: {
    color: COLORS.amberDark,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  rotateTitle: {
    color: COLORS.ink,
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 34,
  },
  rotateText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21,
    textAlign: "center",
    marginTop: 10,
  },
  rotateSteps: {
    width: "100%",
    gap: 10,
    marginTop: 20,
  },
  rotateStep: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cream,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 12,
  },
  rotateStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: COLORS.olive,
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 28,
    fontSize: 13,
    fontWeight: "900",
    marginRight: 10,
  },
  rotateStepText: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: "900",
    flex: 1,
  },
  rotateBackButton: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.oliveSoft,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.oliveBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rotateBackText: {
    color: COLORS.oliveDark,
    fontSize: 13,
    fontWeight: "900",
  },

  topBar: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    backgroundColor: COLORS.card,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.cream,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitleWrap: {
    flex: 1,
    marginLeft: 12,
  },
  topKicker: {
    color: COLORS.amberDark,
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  topTitle: {
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },
  topBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  topBadgeSaved: {
    backgroundColor: COLORS.oliveSoft,
    borderColor: COLORS.oliveBorder,
  },
  topBadgeUnsaved: {
    backgroundColor: COLORS.dangerSoft,
    borderColor: COLORS.dangerBorder,
  },
  topBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  topBadgeTextSaved: {
    color: COLORS.oliveDark,
  },
  topBadgeTextUnsaved: {
    color: COLORS.danger,
  },

  editorScroll: {
    padding: 12,
    paddingBottom: 22,
  },
  workspace: {
    flexDirection: "row",
    gap: 12,
  },
  leftColumn: {
    flex: 0.95,
    gap: 12,
  },
  rightColumn: {
    flex: 1.25,
    gap: 12,
  },

  videoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 10,
  },
  videoPreview: {
    height: 245,
    borderRadius: 21,
    backgroundColor: COLORS.darkVideo,
    overflow: "hidden",
  },
  videoView: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.darkVideo,
  },
  noVideoBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  noVideoTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 10,
    textAlign: "center",
  },
  noVideoText: {
    color: "#EADFCB",
    fontSize: 12.5,
    fontWeight: "700",
    lineHeight: 18,
    textAlign: "center",
    marginTop: 6,
  },
  videoOverlayTop: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 12,
    backgroundColor: "rgba(31, 41, 51, 0.76)",
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  videoOverlayTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  videoOverlaySub: {
    color: "#EADFCB",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  videoOverlayBottom: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(31, 41, 51, 0.76)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  roundVideoButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  roundVideoButtonSecondary: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  videoTimeText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right",
    paddingRight: 4,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 9,
  },
  metaItem: {
    flex: 1,
    backgroundColor: COLORS.cream,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 16,
    padding: 9,
  },
  metaLabel: {
    color: COLORS.softMuted,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  metaValue: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: "900",
  },

  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 14,
  },
  summaryHeader: {
    marginBottom: 7,
  },
  summaryKicker: {
    color: COLORS.amberDark,
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  summaryTitle: {
    color: COLORS.ink,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  summaryLabel: {
    width: 88,
    color: COLORS.softMuted,
    fontSize: 11.5,
    fontWeight: "900",
  },
  summaryValue: {
    flex: 1,
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
  },

  tabDock: {
    flexDirection: "row",
    gap: 7,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 8,
  },
  tabButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
    backgroundColor: COLORS.cream,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  tabButtonActive: {
    backgroundColor: COLORS.olive,
    borderColor: COLORS.olive,
  },
  tabButtonText: {
    color: COLORS.oliveDark,
    fontSize: 11.7,
    fontWeight: "900",
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
  },

  editorPanel: {
    backgroundColor: COLORS.card,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 14,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  panelKicker: {
    color: COLORS.amberDark,
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  panelTitle: {
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },
  smallStatusPill: {
    backgroundColor: COLORS.oliveSoft,
    borderWidth: 1,
    borderColor: COLORS.oliveBorder,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  smallStatusText: {
    color: COLORS.oliveDark,
    fontSize: 10.5,
    fontWeight: "900",
  },
  unsavedPill: {
    backgroundColor: COLORS.dangerSoft,
    borderColor: COLORS.dangerBorder,
  },
  unsavedPillText: {
    color: COLORS.danger,
  },

  realTimelineCard: {
    backgroundColor: COLORS.cream,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 12,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: 8,
  },
  timelineTitle: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: "900",
  },
  timelineTime: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  trimMarkerRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  trimMarker: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 9,
  },
  trimMarkerLabel: {
    color: COLORS.softMuted,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  trimMarkerValue: {
    color: COLORS.ink,
    fontSize: 11.5,
    fontWeight: "900",
    marginTop: 3,
  },

  primaryControlGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 12,
  },
  editorActionButton: {
    width: "48.7%",
    minHeight: 43,
    borderRadius: 16,
    backgroundColor: COLORS.oliveSoft,
    borderWidth: 1,
    borderColor: COLORS.oliveBorder,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 10,
  },
  editorActionText: {
    color: COLORS.oliveDark,
    fontSize: 12.5,
    fontWeight: "900",
  },

  controlsRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 12,
    alignItems: "flex-end",
  },
  inputBlock: {
    flex: 1,
  },
  inputBlockFull: {
    marginBottom: 12,
  },
  inputLabel: {
    color: COLORS.ink,
    fontSize: 12.5,
    fontWeight: "900",
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.cream,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  proAction: {
    minWidth: 132,
    minHeight: 43,
    borderRadius: 16,
    backgroundColor: COLORS.amber,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
  },
  proActionText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "900",
  },
  proMiniBadge: {
    overflow: "hidden",
    backgroundColor: COLORS.amberDark,
    color: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 9.5,
    fontWeight: "900",
  },

  formatLayout: {
    flexDirection: "row",
    gap: 14,
  },
  formatList: {
    flex: 1,
    gap: 9,
  },
  formatOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.cream,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 10,
  },
  formatOptionSelected: {
    backgroundColor: COLORS.olive,
    borderColor: COLORS.olive,
  },
  formatIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.amberSoft,
    borderWidth: 1,
    borderColor: COLORS.amberBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  formatIconSelected: {
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderColor: "rgba(255, 255, 255, 0.28)",
  },
  formatOptionTitle: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: "900",
  },
  formatOptionTitleSelected: {
    color: "#FFFFFF",
  },
  formatOptionText: {
    color: COLORS.muted,
    fontSize: 11.3,
    fontWeight: "700",
    lineHeight: 16,
    marginTop: 2,
  },
  formatOptionTextSelected: {
    color: "#EADFCB",
  },
  formatPreviewCard: {
    width: 190,
    backgroundColor: COLORS.cream,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 12,
    alignItems: "center",
  },
  formatPreviewKicker: {
    color: COLORS.amberDark,
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  formatPreviewStage: {
    height: 140,
    width: "100%",
    borderRadius: 18,
    backgroundColor: "#EFE3D2",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  formatPreviewBox: {
    borderRadius: 12,
    backgroundColor: COLORS.darkVideo,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.amber,
  },
  formatPreviewRatio: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  formatPreviewTitle: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 10,
    textAlign: "center",
  },
  formatPreviewText: {
    color: COLORS.muted,
    fontSize: 11.5,
    fontWeight: "700",
    lineHeight: 16,
    marginTop: 5,
    textAlign: "center",
  },

  splitRow: {
    flexDirection: "row",
    gap: 14,
  },
  splitColumn: {
    flex: 1,
  },
  sectionLabel: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 9,
  },
  choiceWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choiceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.cream,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  choiceChipSelected: {
    backgroundColor: COLORS.olive,
    borderColor: COLORS.olive,
  },
  choiceText: {
    color: COLORS.oliveDark,
    fontSize: 12,
    fontWeight: "900",
  },
  choiceTextSelected: {
    color: "#FFFFFF",
  },
  licenceNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    backgroundColor: COLORS.oliveSoft,
    borderWidth: 1,
    borderColor: COLORS.oliveBorder,
    borderRadius: 17,
    padding: 11,
    marginTop: 14,
  },
  licenceText: {
    flex: 1,
    color: COLORS.oliveDark,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
  },

  captionLayout: {
    flexDirection: "row",
    gap: 14,
  },
  captionFields: {
    flex: 1.15,
  },
  socialPreview: {
    width: 170,
  },
  socialVideoBox: {
    height: 250,
    borderRadius: 22,
    backgroundColor: COLORS.darkVideo,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    overflow: "hidden",
  },
  socialPreviewTitle: {
    color: "#EADFCB",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 6,
  },
  lowerThirdPreview: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 38,
    backgroundColor: "rgba(31, 41, 51, 0.92)",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  lowerThirdText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  scripturePreview: {
    position: "absolute",
    top: 18,
    alignSelf: "center",
    backgroundColor: COLORS.amber,
    borderWidth: 1,
    borderColor: COLORS.amberBorder,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  scripturePreviewText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },

  aiHero: {
    flexDirection: "row",
    gap: 13,
    backgroundColor: COLORS.darkVideo2,
    borderRadius: 22,
    padding: 15,
    marginBottom: 12,
  },
  aiHeroIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  aiKicker: {
    color: "#FCD9A4",
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  aiTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 3,
  },
  aiSubtitle: {
    color: "#EADFCB",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 5,
  },
  aiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  aiFeature: {
    width: "48.5%",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: COLORS.cream,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 17,
    padding: 10,
  },
  aiFeatureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.amberSoft,
    borderWidth: 1,
    borderColor: COLORS.amberBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  aiFeatureTitle: {
    color: COLORS.ink,
    fontSize: 12.5,
    fontWeight: "900",
  },
  aiFeatureSub: {
    color: COLORS.muted,
    fontSize: 10.5,
    fontWeight: "800",
    marginTop: 2,
  },

  bottomActions: {
    flexDirection: "row",
    gap: 10,
  },
  saveButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: COLORS.amber,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  doneButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: COLORS.olive,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  cancelButton: {
    flex: 1.25,
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: COLORS.oliveSoft,
    borderWidth: 1,
    borderColor: COLORS.oliveBorder,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cancelButtonText: {
    color: COLORS.oliveDark,
    fontSize: 14,
    fontWeight: "900",
  },
  buttonDisabled: {
    opacity: 0.58,
  },
});