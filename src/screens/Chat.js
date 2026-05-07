// src/screens/Chat.js
import { Audio } from "expo-av";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  PanResponder,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  deleteChatAudioFile,
  deleteMessage,
  fetchMessages,
  getChatAudioSignedUrl,
  getOtherMemberProfile,
  markConversationRead,
  sendAudioMessage,
  sendMessage,
  uploadChatAudio,
} from "../lib/messages";
import { supabase } from "../lib/supabase";
import { theme } from "../theme/theme";

function safeInitials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name).trim()[0]?.toUpperCase() || "?";
}

function formatMs(ms) {
  const totalSec = Math.max(0, Math.floor((ms || 0) / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function Chat({ route, navigation }) {
  // console.log("[CHAT] Chat.js render loaded");

  const conversationId = route?.params?.conversationId;

  // Route params (fast render)
  const initialTitle = route?.params?.title || "Chat";
  const initialAvatarUrl = route?.params?.avatarUrl || null;
  const initialOtherUserId = route?.params?.otherUserId || null;
  const initialHandle = route?.params?.handle || null;
  const type = route?.params?.type || "dm";

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [me, setMe] = useState(null);

  // Header identity state (DM)
  const [otherUserId, setOtherUserId] = useState(initialOtherUserId);
  const [headerName, setHeaderName] = useState(initialTitle);
  const [headerAvatar, setHeaderAvatar] = useState(initialAvatarUrl);
  const [headerHandle, setHeaderHandle] = useState(
    initialHandle ? `@${String(initialHandle).replace(/^@/, "")}` : null
  );

  // Sticky composer height so list bottom padding stays correct
  const [composerHeight, setComposerHeight] = useState(84);

  // Voice note state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingObj, setRecordingObj] = useState(null);
  const [recordingStartAt, setRecordingStartAt] = useState(null);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);

  // Press-and-hold UX
  const [isMicPressing, setIsMicPressing] = useState(false);
  const [showSwipeCancelHint, setShowSwipeCancelHint] = useState(false);
  const [willCancelOnRelease, setWillCancelOnRelease] = useState(false);
  const micDragX = useRef(new Animated.Value(0)).current;
  const swipeCancelThreshold = -60; // easier swipe-left cancel

  // Waveform-lite bars
  const waveAnim = useRef(new Animated.Value(0)).current;
  const waveLoopRef = useRef(null);

  // Playback state
  const [playingMessageId, setPlayingMessageId] = useState(null);
  const [playbackBusyId, setPlaybackBusyId] = useState(null);
  const soundRef = useRef(null);

  const listRef = useRef(null);
  const realtimeRefreshingRef = useRef(false);

  // Refs to avoid state timing issues in PanResponder
  const pressStartedAtRef = useRef(0);
  const recordingStartAtRef = useRef(0);
  const isRecordingRef = useRef(false);
  const isStartingRecordingRef = useRef(false); // lock for async createAsync race
  const pendingReleaseActionRef = useRef(null); // "cancel" | "send" | null
  const willCancelOnReleaseRef = useRef(false);
  const recordingObjRef = useRef(null);

  const initials = useMemo(() => safeInitials(headerName), [headerName]);

  const ordered = useMemo(() => {
    const arr = Array.isArray(messages) ? [...messages] : [];
    arr.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    return arr;
  }, [messages]);

  const shouldAutoScrollToBottom = ordered.length >= 3;

  const scrollToBottom = useCallback((animated = false) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd?.({ animated });
    });
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const { data: sess } = await supabase.auth.getSession();
      setMe(sess?.session?.user?.id || null);

      const rows = await fetchMessages(conversationId, 80);
      setMessages(rows || []);

      await markConversationRead(conversationId);
    } catch (e) {
      console.log("Chat load error", e);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Resolve actual DM header person (truth source)
  const resolveHeader = useCallback(async () => {
    try {
      if (!conversationId) return;
      if (type !== "dm") return;

      const prof = await getOtherMemberProfile(conversationId);
      if (!prof) return;

      setOtherUserId(prof.id || null);
      setHeaderName(prof.display_name || prof.username || prof.handle || "User");
      setHeaderAvatar(prof.avatar_url || null);

      const rawHandle = prof.username || prof.handle || null;
      setHeaderHandle(rawHandle ? `@${rawHandle}` : null);
    } catch (e) {
      console.log("resolveHeader error", e);
      // Keep route-param fallback if lookup fails
    }
  }, [conversationId, type]);

  useEffect(() => {
    if (!conversationId) return;
    load();
    resolveHeader();
  }, [conversationId, load, resolveHeader]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          console.log("chat realtime payload", {
            eventType: payload?.eventType,
            conversationId,
            newId: payload?.new?.id,
            oldId: payload?.old?.id,
          });

          // Live refresh on insert/update/delete
          await refreshMessagesRealtime();

          // Auto-scroll for new messages (especially inserts)
          if (payload?.eventType === "INSERT") {
            scrollToBottom(true);
          }
        }
      )
      .subscribe((status) => {
        console.log("chat realtime status", conversationId, status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, scrollToBottom]);

  useEffect(() => {
    if (!shouldAutoScrollToBottom) return;
    scrollToBottom(false);
  }, [shouldAutoScrollToBottom, ordered.length, scrollToBottom]);

  // Keep refs in sync with state
  useEffect(() => {
    willCancelOnReleaseRef.current = willCancelOnRelease;
  }, [willCancelOnRelease]);

  useEffect(() => {
    recordingObjRef.current = recordingObj;
  }, [recordingObj]);

  // Recording timer
  useEffect(() => {
    if (!isRecording || !recordingStartAt) return;

    const intervalId = setInterval(() => {
      setRecordingDurationMs(Date.now() - recordingStartAt);
    }, 250);

    return () => clearInterval(intervalId);
  }, [isRecording, recordingStartAt]);

  // Waveform-lite animation loop while recording
  useEffect(() => {
    if (isRecording) {
      waveAnim.setValue(0);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: false,
          }),
          Animated.timing(waveAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: false,
          }),
        ])
      );
      waveLoopRef.current = loop;
      loop.start();
    } else {
      if (waveLoopRef.current) {
        waveLoopRef.current.stop();
        waveLoopRef.current = null;
      }
      waveAnim.setValue(0);
    }
  }, [isRecording, waveAnim]);

  // Cleanup player on unmount
  useEffect(() => {
    return () => {
      (async () => {
        try {
          if (soundRef.current) {
            await soundRef.current.unloadAsync();
            soundRef.current = null;
          }
        } catch (e) {
          console.log("audio cleanup error", e);
        }
      })();
    };
  }, []);

  async function handleSend() {
    try {
      const text = draft.trim();
      if (!text) return;

      setDraft("");

      await sendMessage(conversationId, text);

      const rows = await fetchMessages(conversationId, 80);
      setMessages(rows || []);
      await markConversationRead(conversationId);

      scrollToBottom(true);
    } catch (e) {
      console.log("sendMessage error", e);
    }
  }

  async function refreshAfterSend() {
    const rows = await fetchMessages(conversationId, 80);
    console.log("refreshAfterSend rows", rows?.length ?? 0);
    setMessages(rows || []);
    await markConversationRead(conversationId);
    scrollToBottom(true);
  }

  async function refreshMessagesRealtime() {
    try {
      if (realtimeRefreshingRef.current) return;
      realtimeRefreshingRef.current = true;

      const rows = await fetchMessages(conversationId, 80);
      setMessages(rows || []);

      // Keep read state updated when you're in the chat
      await markConversationRead(conversationId);
    } catch (e) {
      console.log("refreshMessagesRealtime error", e);
    } finally {
      realtimeRefreshingRef.current = false;
    }
  }

  // -----------------------------
  // Delete message (long-press)
  // -----------------------------
  async function handleDeleteMessage(item) {
    try {
      if (!item?.id) return;
      const mine = !!me && item.sender_id === me;
      if (!mine) return;

      // Stop playback if deleting currently-playing voice note
      if (item.message_type === "audio" && playingMessageId === item.id) {
        await stopPlayback();
      }

      // ✅ Optimistic UI remove (instant)
      const prevMessages = messages;
      setMessages((prev) => prev.filter((m) => m.id !== item.id));

      try {
        // Delete DB row
        const deleted = await deleteMessage(item.id);

        // Best-effort storage cleanup (audio)
        const isAudio = (deleted?.message_type || item?.message_type) === "audio";
        const audioPath = deleted?.audio_url || item?.audio_url;

        if (isAudio && audioPath) {
          try {
            await deleteChatAudioFile(audioPath);
          } catch (storageErr) {
            console.log("deleteChatAudioFile error", storageErr);
            // Non-blocking on purpose
          }
        }
      } catch (serverErr) {
        // ✅ Rollback if backend delete fails
        setMessages(prevMessages);
        throw serverErr;
      }
    } catch (e) {
      console.log("handleDeleteMessage error", e);
      Alert.alert("Delete message", e?.message || "Could not delete message.");
    }
  }

  function confirmDeleteMessage(item) {
    const mine = !!me && item?.sender_id === me;
    if (!mine) return;

    const isAudio = item?.message_type === "audio" && !!item?.audio_url;

    Alert.alert(
      "Delete message?",
      isAudio
        ? "This will delete your voice note from the chat."
        : "This will delete your message from the chat.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // fire-and-forget alert callback
            handleDeleteMessage(item);
          },
        },
      ]
    );
  }

  // -----------------------------
  // Voice note: record / cancel / send
  // -----------------------------
  async function startRecording() {
    try {
      // console.log("[VOICE] startRecording entered");
      if (isUploadingAudio) return;

      // Prevent duplicate starts while createAsync is in-flight
      if (isStartingRecordingRef.current) return;

      // Prevent starting when already recording
      if (isRecordingRef.current || isRecording) return;

      isStartingRecordingRef.current = true;

      // console.log("[VOICE] before permission request");
      const permission = await Audio.requestPermissionsAsync();
      // console.log("[VOICE] permission result", permission?.granted);

      if (!permission.granted) {
        isStartingRecordingRef.current = false;
        Alert.alert(
          "Microphone permission",
          "Please allow microphone access to send voice notes."
        );
        return;
      }

      // Stop any playback before recording
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch {}
        soundRef.current = null;
        setPlayingMessageId(null);
      }

      // console.log("[VOICE] before setAudioModeAsync");
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // console.log("[VOICE] before createAsync");
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      // console.log("[VOICE] createAsync success");

      recordingObjRef.current = recording;
      setRecordingObj(recording);

      isRecordingRef.current = true;
      setIsRecording(true);
      const startedAt = Date.now();
      recordingStartAtRef.current = startedAt;
      setRecordingStartAt(startedAt);
      setRecordingDurationMs(0);
      setShowSwipeCancelHint(true);

      // IMPORTANT:
      // Do NOT reset willCancelOnRelease here.
      // User may have already swiped left while recording startup was in-flight.

      isStartingRecordingRef.current = false;
    } catch (e) {
      console.log("startRecording error", e);
      Alert.alert("Voice note", "Could not start recording.");

      recordingObjRef.current = null;
      isRecordingRef.current = false;
      isStartingRecordingRef.current = false;
      pendingReleaseActionRef.current = null;
      willCancelOnReleaseRef.current = false;

      setIsRecording(false);
      setRecordingObj(null);
      setRecordingStartAt(null);
      setRecordingDurationMs(0);
      setShowSwipeCancelHint(false);
      setWillCancelOnRelease(false);
    }
  }

  async function cancelRecording() {
    try {
      const activeRecording = recordingObjRef.current || recordingObj;
      if (activeRecording) {
        try {
          await activeRecording.stopAndUnloadAsync();
        } catch {
          // safe if already stopped
        }
      }
    } catch (e) {
      console.log("cancelRecording error", e);
    } finally {
      recordingObjRef.current = null;
      recordingStartAtRef.current = 0;
      isRecordingRef.current = false;
      isStartingRecordingRef.current = false;
      pendingReleaseActionRef.current = null;
      willCancelOnReleaseRef.current = false;

      setIsRecording(false);
      setRecordingObj(null);
      setRecordingStartAt(null);
      setRecordingDurationMs(0);
      setShowSwipeCancelHint(false);
      setWillCancelOnRelease(false);
      setIsMicPressing(false);

      Animated.spring(micDragX, {
        toValue: 0,
        useNativeDriver: false,
      }).start();

      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });
      } catch {}
    }
  }

  async function stopAndSendRecording() {
    try {
      // console.log("[VOICE] stopAndSend entered", {
      //   hasRecordingRef: !!recordingObjRef.current,
      //   hasRecordingState: !!recordingObj,
      //   conversationId,
      //   recordingDurationMs,
      // });

      const activeRecording = recordingObjRef.current || recordingObj;
      if (!activeRecording) return;
      if (!conversationId) return;

      const liveDurationMs = recordingStartAtRef.current
        ? Date.now() - recordingStartAtRef.current
        : 0;

      const durationMs = liveDurationMs || recordingDurationMs || null;

      // console.log("[VOICE] stopAndSend pre-short-check", {
      //   recordingDurationMs,
      //   liveDurationMs,
      // });

      // Ignore very short accidental taps
      if (liveDurationMs < 350) {
        await cancelRecording();
        return;
      }

      setIsUploadingAudio(true);

      await activeRecording.stopAndUnloadAsync();
      const localUri = activeRecording.getURI();

      console.log("VOICE localUri", localUri);
      console.log("VOICE durationMs", durationMs);

      if (!localUri) throw new Error("Recording URI missing");

      recordingObjRef.current = null;
      recordingStartAtRef.current = 0;
      isRecordingRef.current = false;
      isStartingRecordingRef.current = false;
      pendingReleaseActionRef.current = null;
      willCancelOnReleaseRef.current = false;

      setIsRecording(false);
      setRecordingObj(null);
      setRecordingStartAt(null);
      setRecordingDurationMs(0);
      setShowSwipeCancelHint(false);
      setWillCancelOnRelease(false);
      setIsMicPressing(false);

      Animated.spring(micDragX, {
        toValue: 0,
        useNativeDriver: false,
      }).start();

      const extMatch = String(localUri).match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
      const fileExt = extMatch?.[1]?.toLowerCase() || "m4a";
      console.log("VOICE fileExt guessed", fileExt);

      console.log("VOICE before uploadChatAudio", {
        conversationId,
        localUri,
        fileExt,
      });

      const { storagePath } = await uploadChatAudio({
        conversationId,
        localUri,
        fileExt,
      });

      console.log("VOICE upload storagePath", storagePath);

      console.log("VOICE before sendAudioMessage", {
        conversationId,
        audioStoragePath: storagePath,
        durationMs,
      });

      await sendAudioMessage({
        conversationId,
        audioStoragePath: storagePath,
        durationMs,
      });

      console.log("VOICE message insert success");

      await refreshAfterSend();
    } catch (e) {
      console.log("stopAndSendRecording error (raw)", e);
      console.log("stopAndSendRecording error message", e?.message);
      console.log("stopAndSendRecording error details", e?.details);
      console.log("stopAndSendRecording error hint", e?.hint);
      console.log("stopAndSendRecording error code", e?.code);

      Alert.alert("Voice note", e?.message || "Could not send voice note.");
    } finally {
      isStartingRecordingRef.current = false;
      setIsUploadingAudio(false);

      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });
      } catch {}
    }
  }

  // -----------------------------
  // Voice note playback
  // -----------------------------
  async function stopPlayback() {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (e) {
      console.log("stopPlayback error", e);
    } finally {
      setPlayingMessageId(null);
      setPlaybackBusyId(null);
    }
  }

  async function togglePlayAudioMessage(item) {
    try {
      const messageId = item?.id;
      const audioStoragePath = item?.audio_url;

      if (!messageId || !audioStoragePath) return;

      // If tapping currently playing one -> stop
      if (playingMessageId === messageId) {
        await stopPlayback();
        return;
      }

      setPlaybackBusyId(messageId);

      // Stop any previous sound
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch {}
        soundRef.current = null;
      }

      const uri = await getChatAudioSignedUrl(audioStoragePath, 3600);
      if (!uri) {
        Alert.alert("Voice note", "Audio URL could not be resolved.");
        setPlaybackBusyId(null);
        return;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => {
          if (!status?.isLoaded) return;

          if (status.didJustFinish) {
            setPlayingMessageId(null);
            setPlaybackBusyId(null);
            (async () => {
              try {
                if (soundRef.current) {
                  await soundRef.current.unloadAsync();
                  soundRef.current = null;
                }
              } catch {}
            })();
          }
        }
      );

      soundRef.current = sound;
      setPlayingMessageId(messageId);
      setPlaybackBusyId(null);
    } catch (e) {
      console.log("togglePlayAudioMessage error", e);
      Alert.alert("Voice note", "Could not play voice note.");
      setPlayingMessageId(null);
      setPlaybackBusyId(null);
    }
  }

  function openHeaderProfile() {
    if (!otherUserId) return;
    navigation.navigate("UserProfile", { userId: otherUserId });
  }

  const waveHeights = [
    waveAnim.interpolate({ inputRange: [0, 1], outputRange: [6, 18] }),
    waveAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 24] }),
    waveAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 20] }),
    waveAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 26] }),
    waveAnim.interpolate({ inputRange: [0, 1], outputRange: [7, 16] }),
    waveAnim.interpolate({ inputRange: [0, 1], outputRange: [9, 22] }),
  ];

  const composerDisabled = isUploadingAudio;

  const micPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !composerDisabled,
        onMoveShouldSetPanResponder: () => !composerDisabled,

        // Helps keep this gesture from being stolen mid-swipe
        onPanResponderTerminationRequest: () => false,

        onPanResponderGrant: () => {
          // console.log("[VOICE] grant");
          if (composerDisabled) return;

          pressStartedAtRef.current = Date.now();
          pendingReleaseActionRef.current = null;
          willCancelOnReleaseRef.current = false;
          setWillCancelOnRelease(false);
          micDragX.setValue(0);

          setIsMicPressing(true);

          // Fire-and-forget; release/terminate may happen while createAsync is in-flight
          startRecording().then(async () => {
            const pending = pendingReleaseActionRef.current;
            if (!pending) return;

            // Clear before running to avoid loops
            pendingReleaseActionRef.current = null;

            if (pending === "cancel") {
              await cancelRecording();
            } else if (pending === "send") {
              await stopAndSendRecording();
            }
          });
        },

        onPanResponderMove: (_evt, gestureState) => {
          // Treat "starting" as active too (avoid losing swipe during setup window)
          if (!isRecordingRef.current && !isStartingRecordingRef.current) return;

          const clampedX = Math.min(0, gestureState.dx); // only left drag matters
          micDragX.setValue(clampedX);

          const shouldCancel = clampedX <= swipeCancelThreshold;
          if (willCancelOnReleaseRef.current !== shouldCancel) {
            willCancelOnReleaseRef.current = shouldCancel;
            setWillCancelOnRelease(shouldCancel);
          }
        },

        onPanResponderRelease: async () => {
          // console.log("[VOICE] release", {
          //   isRecordingRef: isRecordingRef.current,
          //   isStartingRef: isStartingRecordingRef.current,
          //   willCancelOnReleaseRef: willCancelOnReleaseRef.current,
          // });

          setIsMicPressing(false);

          const heldMs = Date.now() - (pressStartedAtRef.current || Date.now());
          const quickTap = heldMs < 350;
          const shouldCancel = willCancelOnReleaseRef.current || quickTap;

          // Recording may still be starting (permission/createAsync in flight)
          if (!isRecordingRef.current) {
            if (isStartingRecordingRef.current) {
              pendingReleaseActionRef.current = shouldCancel ? "cancel" : "send";
            }

            Animated.spring(micDragX, { toValue: 0, useNativeDriver: false }).start();
            return;
          }

          if (shouldCancel) {
            await cancelRecording();
          } else {
            await stopAndSendRecording();
          }
        },

        onPanResponderTerminate: async () => {
          // console.log("[VOICE] terminate", {
          //   isRecordingRef: isRecordingRef.current,
          //   isStartingRef: isStartingRecordingRef.current,
          // });

          setIsMicPressing(false);

          // Gesture interruption: always cancel
          if (!isRecordingRef.current) {
            if (isStartingRecordingRef.current) {
              pendingReleaseActionRef.current = "cancel";
            }
            Animated.spring(micDragX, { toValue: 0, useNativeDriver: false }).start();
            return;
          }

          await cancelRecording();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [composerDisabled, swipeCancelThreshold, micDragX]
  );

  function renderMessageBubble(item) {
    const mine = me && item.sender_id === me;
    const isAudio = item.message_type === "audio" && !!item.audio_url;
    const isPlaying = playingMessageId === item.id;
    const isBusy = playbackBusyId === item.id;

    return (
      <Pressable
        onLongPress={mine ? () => confirmDeleteMessage(item) : undefined}
        delayLongPress={350}
        disabled={!mine}
        style={{
          alignSelf: mine ? "flex-end" : "flex-start",
          maxWidth: "82%",
          marginBottom: 10,
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 14,
          backgroundColor: mine ? theme.colors.goldHalo : theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.divider,
        }}
      >
        {isAudio ? (
          <View>
            <Pressable
              onPress={() => togglePlayAudioMessage(item)}
              onLongPress={mine ? () => confirmDeleteMessage(item) : undefined}
              delayLongPress={300}
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: theme.colors.divider,
                backgroundColor: theme.colors.surfaceAlt,
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 8,
                alignSelf: "flex-start",
              }}
            >
              <Text style={{ color: theme.colors.text, fontWeight: "900", marginRight: 8 }}>
                {isBusy ? "..." : isPlaying ? "Stop" : "Play"}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  columnGap: 3,
                  marginRight: 8,
                }}
              >
                {[8, 12, 10, 14, 9].map((h, i) => (
                  <View
                    key={`${item.id}-wave-${i}`}
                    style={{
                      width: 2,
                      height: h,
                      borderRadius: 999,
                      backgroundColor: theme.colors.muted,
                      opacity: isPlaying ? 1 : 0.6,
                    }}
                  />
                ))}
              </View>

              <Text style={{ color: theme.colors.muted, fontWeight: "700" }}>
                {formatMs(item.audio_duration_ms || 0)}
              </Text>
            </Pressable>
          </View>
        ) : (
          <Text style={{ color: theme.colors.text, fontWeight: "700" }}>{item.body}</Text>
        )}

        <Text style={{ color: theme.colors.muted, fontSize: 11, marginTop: 6 }}>
          {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
        </Text>
      </Pressable>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      edges={["top", "left", "right", "bottom"]}
    >
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.divider,
            backgroundColor: theme.colors.bg,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={10}
              style={{ paddingRight: 12, paddingVertical: 6 }}
            >
              <Text style={{ color: theme.colors.text2, fontWeight: "900" }}>Back</Text>
            </Pressable>

            <Pressable
              onPress={openHeaderProfile}
              disabled={!otherUserId}
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: theme.colors.divider,
                  overflow: "hidden",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                {headerAvatar ? (
                  <Image source={{ uri: headerAvatar }} style={{ width: "100%", height: "100%" }} />
                ) : (
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }}>{initials}</Text>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}
                  numberOfLines={1}
                >
                  {headerName}
                </Text>

                <Text style={{ color: theme.colors.muted, fontWeight: "700", fontSize: 12 }}>
                  {headerHandle || (type === "dm" ? "Direct message" : "Conversation")}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Messages area */}
        <View style={{ flex: 1, minHeight: 0 }}>
          {loading ? (
            <View style={{ paddingTop: 20, alignItems: "center" }}>
              <ActivityIndicator size="large" color={theme.colors.gold} />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={ordered}
              keyExtractor={(m) => String(m.id)}
              keyboardShouldPersistTaps="handled"
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: composerHeight + 24,
              }}
              onContentSizeChange={() => {
                if (shouldAutoScrollToBottom) scrollToBottom(false);
              }}
              renderItem={({ item }) => renderMessageBubble(item)}
            />
          )}

          {/* Sticky composer */}
          <KeyboardStickyView offset={0}>
            <View
              onLayout={(e) => {
                const h = e?.nativeEvent?.layout?.height || 84;
                if (Math.abs(h - composerHeight) > 1) setComposerHeight(h);
              }}
              style={{
                borderTopWidth: 1,
                borderTopColor: theme.colors.divider,
                backgroundColor: theme.colors.surface,
                paddingHorizontal: 12,
                paddingTop: 12,
                paddingBottom: 8,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", columnGap: 10 }}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={
                    isRecording
                      ? willCancelOnRelease
                        ? "Release to cancel"
                        : "Recording voice note..."
                      : "Message..."
                  }
                  placeholderTextColor={theme.colors.muted}
                  editable={!isRecording && !composerDisabled}
                  multiline={false}
                  returnKeyType="send"
                  returnKeyLabel="Send"
                  enterKeyHint="send"
                  onSubmitEditing={handleSend}
                  blurOnSubmit={false}
                  enablesReturnKeyAutomatically
                  style={{
                    flex: 1,
                    backgroundColor: theme.colors.surfaceAlt,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: willCancelOnRelease ? "#ff8c8c" : theme.colors.divider,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    color: theme.colors.text,
                    fontWeight: "700",
                    opacity: isRecording ? 0.8 : 1,
                  }}
                />

                <Pressable
                  onPress={handleSend}
                  disabled={isRecording || composerDisabled}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 999,
                    backgroundColor: theme.colors.gold,
                    opacity: isRecording || composerDisabled ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Send</Text>
                </Pressable>

                {/* Press-and-hold mic with swipe left cancel */}
                <Animated.View
                  {...micPanResponder.panHandlers}
                  style={{
                    transform: [{ translateX: micDragX }],
                    opacity: composerDisabled ? 0.6 : 1,
                  }}
                >
                  <View
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: willCancelOnRelease
                        ? "#ff8c8c"
                        : isRecording
                        ? theme.colors.gold
                        : theme.colors.divider,
                      backgroundColor: isRecording ? theme.colors.goldHalo : theme.colors.surfaceAlt,
                      minWidth: 52,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                      {isRecording ? "Rec" : "Mic"}
                    </Text>
                  </View>
                </Animated.View>
              </View>

              {/* Recording status panel */}
              {isRecording ? (
                <View
                  style={{
                    marginTop: 8,
                    borderWidth: 1,
                    borderColor: willCancelOnRelease ? "#ff8c8c" : theme.colors.divider,
                    backgroundColor: theme.colors.surfaceAlt,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text
                      style={{
                        color: willCancelOnRelease ? "#ff8c8c" : theme.colors.text,
                        fontWeight: "900",
                        marginRight: 10,
                      }}
                    >
                      {willCancelOnRelease ? "Release to cancel" : "Recording"}
                    </Text>

                    <Text style={{ color: theme.colors.muted, fontWeight: "700", marginRight: 10 }}>
                      {formatMs(recordingDurationMs)}
                    </Text>

                    <View style={{ flexDirection: "row", alignItems: "flex-end", columnGap: 3 }}>
                      {waveHeights.map((h, idx) => (
                        <Animated.View
                          key={`rec-wave-${idx}`}
                          style={{
                            width: 3,
                            height: h,
                            borderRadius: 999,
                            backgroundColor: willCancelOnRelease ? "#ff8c8c" : theme.colors.gold,
                          }}
                        />
                      ))}
                    </View>
                  </View>

                  {showSwipeCancelHint ? (
                    <Text
                      style={{
                        marginTop: 8,
                        color: theme.colors.muted,
                        fontWeight: "700",
                        fontSize: 12,
                      }}
                    >
                      Hold mic, slide left to cancel, release to send
                    </Text>
                  ) : null}

                  <View style={{ flexDirection: "row", columnGap: 8, marginTop: 8 }}>
                    <Pressable
                      onPress={cancelRecording}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: theme.colors.divider,
                        backgroundColor: theme.colors.surface,
                      }}
                    >
                      <Text style={{ color: theme.colors.text, fontWeight: "800" }}>Cancel</Text>
                    </Pressable>

                    <Pressable
                      onPress={stopAndSendRecording}
                      disabled={isUploadingAudio}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 999,
                        backgroundColor: theme.colors.gold,
                        opacity: isUploadingAudio ? 0.7 : 1,
                      }}
                    >
                      <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                        {isUploadingAudio ? "Sending..." : "Send now"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          </KeyboardStickyView>
        </View>
      </View>
    </SafeAreaView>
  );
}