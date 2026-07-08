// src/components/WeeklyMessageCard.js
import { Ionicons } from "@expo/vector-icons";
import { Audio, Video } from "expo-av";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, Modal, Pressable, Text, View } from "react-native";

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

function safeNumber(value, fallback = 0) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return number;
}

function formatSeconds(value) {
  const totalSeconds = Math.max(0, Math.floor(safeNumber(value, 0)));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function WeeklyMessageCard({
  theme,
  messageTitle = null,
  sourceLabel = "Triunely",
  speakerLabel = null,
  videoUrl = null,
  weekLabel = null,
  videoEditorPlan = null,
  noticeboardUnreadCount = 0,
  onPressChallenges,
  onPressNoticeboard,
  onPressChurchProfile,
}) {
  const [open, setOpen] = useState(false);

  const videoRef = useRef(null);
  const startAppliedRef = useRef(false);
  const endReachedRef = useRef(false);

  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(null);

  const appStateRef = useRef(AppState.currentState);
  const [appState, setAppState] = useState(AppState.currentState);
  const pendingAutoplayRef = useRef(false);

  const playbackStartSeconds = useMemo(() => {
    return Math.max(0, safeNumber(videoEditorPlan?.startSeconds, 0));
  }, [videoEditorPlan?.startSeconds]);

  const playbackEndSeconds = useMemo(() => {
    const end = safeNumber(videoEditorPlan?.endSeconds, 0);
    const start = playbackStartSeconds;

    if (!end || end <= start) {
      return 0;
    }

    return Math.max(0, end);
  }, [videoEditorPlan?.endSeconds, playbackStartSeconds]);

  const hasPlaybackTrim = playbackStartSeconds > 0 || playbackEndSeconds > 0;

  const lowerThirdCaption = useMemo(() => {
    return String(videoEditorPlan?.lowerThirdCaption || "").trim();
  }, [videoEditorPlan?.lowerThirdCaption]);

  const scriptureOverlay = useMemo(() => {
    return String(videoEditorPlan?.scriptureOverlay || "").trim();
  }, [videoEditorPlan?.scriptureOverlay]);

  const formatLabel = useMemo(() => {
    return String(videoEditorPlan?.formatLabel || "").trim();
  }, [videoEditorPlan?.formatLabel]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      appStateRef.current = next;
      setAppState(next);
    });

    return () => sub.remove();
  }, []);

  const subtitle = useMemo(() => {
    if (speakerLabel) return `From ${sourceLabel} • ${speakerLabel}`;
    return `From ${sourceLabel}`;
  }, [sourceLabel, speakerLabel]);

  const computedWeekLabel = useMemo(() => {
    if (weekLabel) return weekLabel;

    const now = new Date();
    const day = now.getDay();
    const diffToMonday = (day + 6) % 7;

    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const fmt = (d) =>
      d.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      });

    return `${fmt(monday)} – ${fmt(sunday)}`;
  }, [weekLabel]);

  useEffect(() => {
    if (!open) {
      (async () => {
        try {
          setVideoReady(false);
          setVideoError(null);
          pendingAutoplayRef.current = false;
          startAppliedRef.current = false;
          endReachedRef.current = false;

          if (videoRef.current) {
            await videoRef.current.stopAsync();
            await videoRef.current.setPositionAsync(0);
          }
        } catch (e) {}
      })();
    }
  }, [open]);

  async function ensureAudioMode() {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        shouldDuckAndroid: true,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        staysActiveInBackground: false,
        playThroughEarpieceAndroid: false,
      });
    } catch (e) {}
  }

  async function applyStartPosition() {
    if (!videoRef.current || startAppliedRef.current) return;

    try {
      if (playbackStartSeconds > 0) {
        await videoRef.current.setPositionAsync(Math.floor(playbackStartSeconds * 1000));
      }

      startAppliedRef.current = true;
      endReachedRef.current = false;
    } catch (e) {
      console.log("WeeklyMessageCard applyStartPosition error:", e);
    }
  }

  async function tryAutoplay() {
    if (!open || !videoUrl || !videoReady) return;

    if (appStateRef.current !== "active") {
      pendingAutoplayRef.current = true;
      return;
    }

    pendingAutoplayRef.current = false;

    try {
      await ensureAudioMode();
      await applyStartPosition();
      await videoRef.current?.playAsync();
    } catch (e) {
      const msg = String(e?.message || e);

      if (msg.includes("AudioFocusNotAcquiredException")) {
        pendingAutoplayRef.current = true;

        setTimeout(() => {
          tryAutoplay();
        }, 600);

        return;
      }

      console.log("WeeklyMessageCard autoplay playAsync error:", e);
    }
  }

  useEffect(() => {
    if (!open || !videoReady || !videoUrl) return;

    const t = setTimeout(() => {
      tryAutoplay();
    }, 350);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, videoReady, videoUrl, playbackStartSeconds]);

  useEffect(() => {
    if (!open || !videoReady) return;
    if (appState !== "active") return;

    if (pendingAutoplayRef.current) {
      tryAutoplay();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState, open, videoReady]);

  async function handlePlaybackStatusUpdate(status) {
    if (!status?.isLoaded) return;

    if (!playbackEndSeconds || endReachedRef.current) return;

    const positionMillis = safeNumber(status.positionMillis, 0);
    const endMillis = Math.floor(playbackEndSeconds * 1000);

    if (positionMillis >= endMillis) {
      endReachedRef.current = true;

      try {
        await videoRef.current?.pauseAsync();
        await videoRef.current?.setPositionAsync(endMillis);
      } catch (e) {
        console.log("WeeklyMessageCard stop at end error:", e);
      }
    }
  }

  async function handleReplayFromSelectedStart() {
    if (!videoRef.current) return;

    try {
      endReachedRef.current = false;
      await videoRef.current.setPositionAsync(Math.floor(playbackStartSeconds * 1000));
      await videoRef.current.playAsync();
    } catch (e) {
      console.log("WeeklyMessageCard replay selected start error:", e);
    }
  }

  function openVideoModal() {
    if (!videoUrl) return;

    startAppliedRef.current = false;
    endReachedRef.current = false;
    setVideoReady(false);
    setVideoError(null);
    setOpen(true);
  }

  return (
    <>
      <View
        style={{
          borderRadius: 24,
          overflow: "hidden",
          backgroundColor: SURFACE,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          marginBottom: 12,
          shadowColor: SHADOW,
          shadowOpacity: 0.1,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 5 },
          elevation: 3,
        }}
      >
        <View style={{ padding: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: AMBER_SOFT,
                borderWidth: 1,
                borderColor: AMBER_BORDER,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 11,
              }}
            >
              <Ionicons name="play-circle-outline" size={22} color={EVENT_AMBER} />
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  color: EVENT_BROWN,
                  fontWeight: "900",
                  fontSize: 11,
                  letterSpacing: 0.35,
                  textTransform: "uppercase",
                }}
              >
                Weekly Message
              </Text>

              <Text
                style={{
                  color: TEXT,
                  marginTop: 4,
                  fontWeight: "900",
                  fontSize: 17,
                  lineHeight: 22,
                }}
                numberOfLines={2}
              >
                {messageTitle || "This week’s message"}
              </Text>

              <Text
                style={{
                  color: MUTED,
                  marginTop: 4,
                  fontWeight: "700",
                  fontSize: 12.5,
                }}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 11,
              gap: 7,
              flexWrap: "wrap",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: OLIVE_SOFT,
                borderWidth: 1,
                borderColor: OLIVE_BORDER,
              }}
            >
              <Ionicons name="calendar-outline" size={13} color={OLIVE} />
              <Text
                style={{
                  color: OLIVE,
                  fontWeight: "900",
                  fontSize: 11.5,
                  marginLeft: 5,
                }}
              >
                {computedWeekLabel}
              </Text>
            </View>

            {videoUrl ? (
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: AMBER_SOFT,
                  borderWidth: 1,
                  borderColor: AMBER_BORDER,
                }}
              >
                <Text
                  style={{
                    color: EVENT_AMBER,
                    fontWeight: "900",
                    fontSize: 11.5,
                  }}
                >
                  Video ready
                </Text>
              </View>
            ) : null}

            {hasPlaybackTrim ? (
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: OLIVE_SOFT,
                  borderWidth: 1,
                  borderColor: OLIVE_BORDER,
                }}
              >
                <Text
                  style={{
                    color: OLIVE,
                    fontWeight: "900",
                    fontSize: 11.5,
                  }}
                >
                  {playbackEndSeconds
                    ? `${formatSeconds(playbackStartSeconds)} – ${formatSeconds(
                        playbackEndSeconds
                      )}`
                    : `Starts ${formatSeconds(playbackStartSeconds)}`}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <Pressable
          onPress={openVideoModal}
          style={({ pressed }) => ({
            marginHorizontal: 14,
            marginBottom: 14,
            height: 112,
            borderRadius: 20,
            backgroundColor: videoUrl ? EVENT_BROWN : PREMIUM_CREAM,
            borderWidth: 1,
            borderColor: videoUrl ? AMBER_BORDER : CARD_BORDER,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.94 : 1,
            overflow: "hidden",
          })}
        >
          {!!videoUrl ? (
            <Video
              source={{ uri: videoUrl }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: "100%",
                height: "100%",
              }}
              resizeMode="cover"
              shouldPlay={false}
              isMuted
              useNativeControls={false}
              onError={(e) => {
                console.log("WeeklyMessageCard preview video error:", e);
              }}
            />
          ) : null}

          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: videoUrl
                ? "rgba(31, 41, 51, 0.28)"
                : "rgba(180, 83, 9, 0.07)",
            }}
          />

          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: videoUrl ? "rgba(255,255,255,0.18)" : SURFACE,
              borderWidth: 1,
              borderColor: videoUrl ? "rgba(255,255,255,0.26)" : AMBER_BORDER,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={videoUrl ? "play" : "videocam-outline"}
              size={videoUrl ? 23 : 21}
              color={videoUrl ? "#fff" : EVENT_AMBER}
            />
          </View>

          <Text
            style={{
              color: videoUrl ? "#fff" : MUTED,
              fontWeight: "900",
              marginTop: 8,
              fontSize: 12.5,
            }}
          >
            {videoUrl ? "Tap to watch" : "No video set yet"}
          </Text>
        </Pressable>

        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={onPressChallenges}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 10,
                borderRadius: 999,
                alignItems: "center",
                backgroundColor: pressed ? "rgba(180, 83, 9, 0.88)" : EVENT_AMBER,
                borderWidth: 1,
                borderColor: EVENT_AMBER,
              })}
            >
              <Text style={{ color: SURFACE, fontWeight: "900", fontSize: 12.5 }}>
                Challenges
              </Text>
            </Pressable>

            <Pressable
              onPress={onPressNoticeboard}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 10,
                borderRadius: 999,
                alignItems: "center",
                backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
                borderWidth: 1,
                borderColor: OLIVE_BORDER,
              })}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ color: OLIVE, fontWeight: "900", fontSize: 12.5 }}>
                  Noticeboard
                </Text>

                {Number(noticeboardUnreadCount || 0) > 0 ? (
                  <View
                    style={{
                      minWidth: 19,
                      height: 19,
                      borderRadius: 9.5,
                      paddingHorizontal: 5,
                      backgroundColor: EVENT_AMBER,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: SURFACE,
                        fontWeight: "900",
                        fontSize: 10.5,
                      }}
                    >
                      {Number(noticeboardUnreadCount) > 9
                        ? "9+"
                        : Number(noticeboardUnreadCount)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          </View>

          <Pressable
            onPress={onPressChurchProfile}
            style={({ pressed }) => ({
              marginTop: 8,
              paddingVertical: 10,
              borderRadius: 999,
              alignItems: "center",
              backgroundColor: pressed ? AMBER_SOFT : SURFACE,
              borderWidth: 1,
              borderColor: AMBER_BORDER,
            })}
          >
            <Text style={{ color: EVENT_BROWN, fontWeight: "900", fontSize: 12.5 }}>
              Church Profile
            </Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={open}
        animationType="fade"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)" }}>
          <View
            style={{
              paddingTop: 18,
              paddingHorizontal: 14,
              paddingBottom: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>
                Weekly Message
              </Text>

              {messageTitle ? (
                <Text
                  style={{
                    color: "#fff",
                    marginTop: 4,
                    fontWeight: "900",
                    fontSize: 18,
                  }}
                  numberOfLines={2}
                >
                  {messageTitle}
                </Text>
              ) : null}

              <Text
                style={{
                  color: "rgba(255,255,255,0.75)",
                  marginTop: 4,
                  fontWeight: "700",
                }}
                numberOfLines={1}
              >
                {subtitle}
              </Text>

              {hasPlaybackTrim ? (
                <Text
                  style={{
                    color: "rgba(255,255,255,0.65)",
                    marginTop: 4,
                    fontWeight: "800",
                    fontSize: 12,
                  }}
                  numberOfLines={1}
                >
                  Playing selected section:{" "}
                  {playbackEndSeconds
                    ? `${formatSeconds(playbackStartSeconds)} – ${formatSeconds(
                        playbackEndSeconds
                      )}`
                    : `from ${formatSeconds(playbackStartSeconds)}`}
                </Text>
              ) : null}
            </View>

            <Pressable
              onPress={() => setOpen(false)}
              hitSlop={10}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.10)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
              }}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>
          </View>

          <View style={{ flex: 1, paddingHorizontal: 12, paddingBottom: 18 }}>
            <View
              style={{
                flex: 1,
                borderRadius: 16,
                overflow: "hidden",
                backgroundColor: "#000",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
              }}
            >
              {!!videoUrl ? (
                <Video
                  ref={videoRef}
                  source={{ uri: videoUrl }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="contain"
                  useNativeControls
                  shouldPlay={false}
                  onLoad={async () => {
                    setVideoReady(true);

                    try {
                      await applyStartPosition();
                    } catch (e) {
                      console.log("WeeklyMessageCard onLoad seek error:", e);
                    }

                    setTimeout(() => tryAutoplay(), 250);
                  }}
                  onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                  onError={(e) => {
                    console.log("WeeklyMessageCard Video onError:", e);
                    setVideoError("Video failed to load.");
                  }}
                />
              ) : (
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "800" }}>
                    No video set yet.
                  </Text>
                </View>
              )}

              {lowerThirdCaption || scriptureOverlay ? (
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: 14,
                    right: 14,
                    bottom: 18,
                  }}
                >
                  {scriptureOverlay ? (
                    <View
                      style={{
                        alignSelf: "center",
                        marginBottom: 9,
                        maxWidth: "92%",
                        borderRadius: 999,
                        paddingHorizontal: 13,
                        paddingVertical: 8,
                        backgroundColor: "rgba(180, 83, 9, 0.92)",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.18)",
                      }}
                    >
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontWeight: "900",
                          fontSize: 13,
                          textAlign: "center",
                        }}
                        numberOfLines={2}
                      >
                        {scriptureOverlay}
                      </Text>
                    </View>
                  ) : null}

                  {lowerThirdCaption ? (
                    <View
                      style={{
                        alignSelf: "flex-start",
                        maxWidth: "92%",
                        borderRadius: 14,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        backgroundColor: "rgba(0,0,0,0.58)",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.16)",
                      }}
                    >
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontWeight: "900",
                          fontSize: 13,
                        }}
                        numberOfLines={2}
                      >
                        {lowerThirdCaption}
                      </Text>

                      {formatLabel ? (
                        <Text
                          style={{
                            color: "rgba(255,255,255,0.68)",
                            fontWeight: "800",
                            fontSize: 10.5,
                            marginTop: 3,
                          }}
                          numberOfLines={1}
                        >
                          {formatLabel}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : null}

              {videoError ? (
                <View
                  style={{
                    position: "absolute",
                    left: 12,
                    right: 12,
                    bottom: 12,
                    padding: 10,
                    borderRadius: 12,
                    backgroundColor: "rgba(0,0,0,0.55)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.12)",
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "900" }}>
                    {videoError}
                  </Text>
                </View>
              ) : null}

              {endReachedRef.current ? (
                <Pressable
                  onPress={handleReplayFromSelectedStart}
                  style={{
                    position: "absolute",
                    alignSelf: "center",
                    bottom: 22,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 999,
                    backgroundColor: "rgba(255,255,255,0.14)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.18)",
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="refresh-outline" size={17} color="#FFFFFF" />

                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontWeight: "900",
                      fontSize: 12.5,
                      marginLeft: 7,
                    }}
                  >
                    Replay selected section
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}