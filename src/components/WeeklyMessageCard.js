// src/components/WeeklyMessageCard.js
import { Ionicons } from "@expo/vector-icons";
import { Audio, Video } from "expo-av";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, Modal, Pressable, Text, View } from "react-native";

export default function WeeklyMessageCard({
  theme,
  sourceLabel = "Triunely",
  speakerLabel = null, // e.g. "Pastor John"
  videoUrl = null, // mp4 url
  weekLabel = null, // e.g. "Mon 6 Jan – Sun 12 Jan"
  onPressChallenges,
  onPressNoticeboard,
  onPressChurchProfile,
}) {
  const [open, setOpen] = useState(false);

  const videoRef = useRef(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(null);

  // Track whether the app is truly foreground
  const appStateRef = useRef(AppState.currentState);
  const [appState, setAppState] = useState(AppState.currentState);

  // If autoplay fails due to focus, we retry when app becomes active
  const pendingAutoplayRef = useRef(false);

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
    const day = now.getDay(); // Sun=0 ... Sat=6
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const fmt = (d) => d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
    return `${fmt(monday)} – ${fmt(sunday)}`;
  }, [weekLabel]);

  // Reset playback when closing
  useEffect(() => {
    if (!open) {
      (async () => {
        try {
          setVideoReady(false);
          setVideoError(null);
          pendingAutoplayRef.current = false;

          if (videoRef.current) {
            await videoRef.current.stopAsync();
            await videoRef.current.setPositionAsync(0);
          }
        } catch (e) {
          // ignore
        }
      })();
    }
  }, [open]);

  async function ensureAudioMode() {
    // Safe defaults for “Instagram-like” playback
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
    } catch (e) {
      // ignore
    }
  }

  async function tryAutoplay() {
    if (!open || !videoUrl || !videoReady) return;

    // Critical: only try to play when app is actually foreground
    if (appStateRef.current !== "active") {
      pendingAutoplayRef.current = true;
      return;
    }

    pendingAutoplayRef.current = false;

    try {
      await ensureAudioMode();
      await videoRef.current?.playAsync();
    } catch (e) {
      const msg = String(e?.message || e);

      // This is your exact error: app was considered background at the moment of play()
      if (msg.includes("AudioFocusNotAcquiredException")) {
        pendingAutoplayRef.current = true;

        // Retry shortly (and we also retry automatically when AppState becomes active)
        setTimeout(() => {
          tryAutoplay();
        }, 600);

        return;
      }

      console.log("WeeklyMessageCard autoplay playAsync error:", e);
    }
  }

  // Autoplay when modal is open and the video is loaded
  useEffect(() => {
    if (!open || !videoReady || !videoUrl) return;

    // Give the modal time to fully present before requesting audio focus
    const t = setTimeout(() => {
      tryAutoplay();
    }, 350);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, videoReady, videoUrl]);

  // If we were pending autoplay and the app becomes active, try again immediately
  useEffect(() => {
    if (!open || !videoReady) return;
    if (appState !== "active") return;

    if (pendingAutoplayRef.current) {
      tryAutoplay();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState, open, videoReady]);

  return (
    <>
      {/* CARD */}
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
        {/* Header */}
        <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 }}>
          <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
            Weekly Message
          </Text>

          <Text style={{ color: theme.colors.muted, marginTop: 4, fontWeight: "700" }}>
            {subtitle}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 6 }}>
            <Ionicons name="calendar-outline" size={14} color={theme.colors.sage} />
            <Text style={{ color: theme.colors.sage, fontWeight: "800", fontSize: 12 }}>
              {computedWeekLabel}
            </Text>
          </View>
        </View>

        {/* Video preview */}
        <Pressable
          onPress={() => {
            if (!videoUrl) return;
            setOpen(true);
          }}
          style={({ pressed }) => ({
            height: 190,
            backgroundColor: theme.colors.surfaceAlt,
            borderTopWidth: 1,
            borderTopColor: theme.colors.divider,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.92 : 1,
          })}
        >
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.22)",
            }}
          />

          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: "rgba(255,255,255,0.12)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.18)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="play" size={26} color="#fff" />
          </View>

          <Text style={{ color: "#fff", fontWeight: "900", marginTop: 10 }}>Tap to watch</Text>

          {!videoUrl ? (
            <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: 6, fontWeight: "700" }}>
              No video set yet (placeholder)
            </Text>
          ) : null}
        </Pressable>

        {/* Actions */}
        <View style={{ padding: 12, gap: 10 }}>
          <Pressable
            onPress={onPressChallenges}
            style={({ pressed }) => ({
              paddingVertical: 12,
              borderRadius: 999,
              alignItems: "center",
              backgroundColor: pressed ? theme.colors.goldPressed : theme.colors.gold,
            })}
          >
            <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
              View Challenges
            </Text>
          </Pressable>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={onPressNoticeboard}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 12,
                borderRadius: 999,
                alignItems: "center",
                backgroundColor: pressed ? theme.colors.surfaceAlt : "transparent",
                borderWidth: 1,
                borderColor: theme.colors.divider,
              })}
            >
              <Text style={{ color: theme.colors.text2, fontWeight: "900" }}>Noticeboard</Text>
            </Pressable>

            <Pressable
              onPress={onPressChurchProfile}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 12,
                borderRadius: 999,
                alignItems: "center",
                backgroundColor: pressed ? theme.colors.surfaceAlt : "transparent",
                borderWidth: 1,
                borderColor: theme.colors.divider,
              })}
            >
              <Text style={{ color: theme.colors.text2, fontWeight: "900" }}>Church Profile</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* MODAL PLAYER */}
      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)" }}>
          {/* Top bar */}
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
            <View>
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>
                Weekly Message
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: 4, fontWeight: "700" }}>
                {subtitle}
              </Text>
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

          {/* Player */}
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
                  shouldPlay={false} // we control autoplay ourselves for reliability
                  onLoad={() => {
                    setVideoReady(true);
                    // Attempt autoplay the moment it loads (guarded by AppState)
                    setTimeout(() => tryAutoplay(), 250);
                  }}
                  onError={(e) => {
                    console.log("WeeklyMessageCard Video onError:", e);
                    setVideoError("Video failed to load.");
                  }}
                />
              ) : (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#fff", fontWeight: "800" }}>No video set yet.</Text>
                </View>
              )}

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
                  <Text style={{ color: "#fff", fontWeight: "900" }}>{videoError}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
