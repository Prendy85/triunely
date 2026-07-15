// src/screens/Chat.js
import { Ionicons } from "@expo/vector-icons";
import {
  Audio,
  Video,
} from "expo-av";
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
  sendSharedPostMessage,
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
  const initialHandle =
    route?.params?.handle ||
    null;

  const type =
    route?.params?.type ||
    "dm";

  const incomingSharedPost =
    route?.params?.sharedPost ||
    null;

  const incomingSharedPostId =
    route?.params
      ?.sharedPostId ||
    incomingSharedPost?.id ||
    null;

  const [
    pendingSharedPost,
    setPendingSharedPost,
  ] = useState(
    incomingSharedPostId
      ? incomingSharedPost
      : null
  );

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

      if (
        !text &&
        !pendingSharedPost?.id
      ) {
        return;
      }

      setDraft("");

      if (pendingSharedPost?.id) {
        await sendSharedPostMessage({
          conversationId,
          sharedPostId:
            pendingSharedPost.id,
          body: text || null,
        });

        setPendingSharedPost(null);
      } else {
        await sendMessage(
          conversationId,
          text
        );
      }

      const rows =
        await fetchMessages(
          conversationId,
          80
        );

      setMessages(rows || []);

      await markConversationRead(
        conversationId
      );

      scrollToBottom(true);
    } catch (e) {
      console.log(
        "send message error",
        e
      );

      Alert.alert(
        "Message failed",
        e?.message ||
          "Could not send this message."
      );
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
    const mine =
      me &&
      item.sender_id === me;

    const isAudio =
      item.message_type ===
        "audio" &&
      !!item.audio_url;

    const isSharedPost =
      item.message_type ===
        "shared_post" &&
      !!item.shared_post_id;

    const sharedPost =
      item?.shared_post || null;

    const sharedChurch =
      sharedPost?.churches ||
      sharedPost?.church ||
      null;

    const sharedAuthor =
      sharedPost?.author_profile ||
      null;

    const sharedOwnerName =
      sharedPost?.is_anonymous
        ? "Anonymous"
        : sharedChurch?.display_name ||
          sharedChurch?.name ||
          sharedAuthor?.display_name ||
          sharedAuthor?.username ||
          "Triunely member";

    const sharedOwnerAvatar =
      sharedChurch?.avatar_url ||
      sharedAuthor?.avatar_url ||
      null;

    const sharedByName =
      mine
        ? "You"
        : headerName ||
          "Triunely member";

    const sharedMediaType =
      String(
        sharedPost?.media_type ||
          ""
      ).toLowerCase();

    const sharedMediaUrl =
      sharedPost?.media_url ||
      null;

    const sharedIsImage =
      !!sharedMediaUrl &&
      sharedMediaType.startsWith(
        "image"
      );

    const sharedIsVideo =
      !!sharedMediaUrl &&
      sharedMediaType.startsWith(
        "video"
      );

    const originalPost =
      sharedPost?.shared_post ||
      null;

    const originalChurch =
      originalPost?.churches ||
      originalPost?.church ||
      null;

    const originalAuthor =
      originalPost?.author_profile ||
      null;

    const originalOwnerName =
      originalPost?.is_anonymous
        ? "Anonymous"
        : originalChurch
            ?.display_name ||
          originalChurch?.name ||
          originalAuthor
            ?.display_name ||
          "Triunely member";

    const originalOwnerAvatar =
      originalChurch?.avatar_url ||
      originalAuthor?.avatar_url ||
      null;

    const originalMediaUrl =
      originalPost?.media_url ||
      null;

    const originalMediaType =
      String(
        originalPost?.media_type ||
          ""
      ).toLowerCase();

    const originalIsImage =
      !!originalMediaUrl &&
      originalMediaType.startsWith(
        "image"
      );

    const originalIsVideo =
      !!originalMediaUrl &&
      originalMediaType.startsWith(
        "video"
      );

    const isPlaying =
      playingMessageId === item.id;

    const isBusy =
      playbackBusyId === item.id;

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
              onPress={() =>
                togglePlayAudioMessage(
                  item
                )
              }
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
        ) : isSharedPost ? (
          <View>
            <Text
              style={{
                color:
                  theme.colors.muted,
                fontSize: 11.5,
                fontWeight: "800",
                marginBottom: 8,
              }}
            >
              {sharedByName} shared a post
            </Text>

            {!!item?.body && (
              <Text
                style={{
                  color:
                    theme.colors.text,
                  fontWeight: "700",
                  marginBottom: 9,
                  lineHeight: 20,
                }}
              >
                {item.body}
              </Text>
            )}

            {sharedPost ? (
              <Pressable
                onPress={() => {
                  if (
                    !sharedPost?.id
                  ) {
                    return;
                  }

                  navigation.navigate(
                    "MainTabs",
                    {
                      screen:
                        "Community",
                      params: {
                        initial: false,
                        screen:
                          "CommunityPostDetail",
                        params: {
                          postId:
                            sharedPost.id,
                        },
                      },
                    }
                  );
                }}
                style={({ pressed }) => ({
                  minWidth: 220,
                  maxWidth: 290,
                  borderRadius: 15,
                  borderWidth: 1,
                  borderColor:
                    "rgba(79, 99, 59, 0.20)",
                  backgroundColor:
                    "#FFFCF5",
                  overflow: "hidden",
                  opacity: pressed
                    ? 0.86
                    : 1,
                })}
              >
                <View
                  style={{
                    flexDirection:
                      "row",
                    alignItems:
                      "center",
                    paddingHorizontal:
                      11,
                    paddingTop: 10,
                    paddingBottom: 8,
                  }}
                >
                  {sharedOwnerAvatar ? (
                    <Image
                      source={{
                        uri:
                          sharedOwnerAvatar,
                      }}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor:
                          theme.colors
                            .surfaceAlt,
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        backgroundColor:
                          "rgba(79, 99, 59, 0.10)",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 15,
                        }}
                      >
                        ↗
                      </Text>
                    </View>
                  )}

                  <View
                    style={{
                      flex: 1,
                      marginLeft: 8,
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        color:
                          theme.colors
                            .text,
                        fontSize: 12.5,
                        fontWeight:
                          "900",
                      }}
                    >
                      {sharedOwnerName}
                    </Text>

                    <Text
                      style={{
                        color:
                          theme.colors
                            .muted,
                        fontSize: 10.5,
                        fontWeight:
                          "700",
                        marginTop: 2,
                      }}
                    >
                      Shared on Community
                    </Text>
                  </View>

                  <Text
                    style={{
                      color: "#B45309",
                      fontSize: 17,
                      fontWeight:
                        "900",
                    }}
                  >
                    ↗
                  </Text>
                </View>

                {!!sharedPost
                  ?.content && (
                  <Text
                    numberOfLines={5}
                    style={{
                      color:
                        theme.colors.text,
                      paddingHorizontal:
                        11,
                      paddingBottom: 10,
                      fontSize: 13,
                      lineHeight: 18,
                      fontWeight:
                        "600",
                    }}
                  >
                    {
                      sharedPost.content
                    }
                  </Text>
                )}

                {sharedIsImage && (
                  <Image
                    source={{
                      uri: sharedMediaUrl,
                    }}
                    resizeMode="cover"
                    style={{
                      width: "100%",
                      height: 170,
                      backgroundColor:
                        theme.colors
                          .surfaceAlt,
                    }}
                  />
                )}

                {sharedIsVideo && (
                  <View
                    style={{
                      width: "100%",
                      height: 170,
                      backgroundColor:
                        "#111811",
                      overflow: "hidden",
                    }}
                  >
                    <Video
                      source={{
                        uri: sharedMediaUrl,
                      }}
                      resizeMode="cover"
                      shouldPlay={false}
                      isLooping={false}
                      isMuted
                      useNativeControls={
                        false
                      }
                      positionMillis={0}
                      pointerEvents="none"
                      style={{
                        width: "100%",
                        height: "100%",
                      }}
                    />

                    <View
                      pointerEvents="none"
                      style={{
                        position:
                          "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        backgroundColor:
                          "rgba(0,0,0,0.16)",
                      }}
                    >
                      <View
                        style={{
                          width: 50,
                          height: 50,
                          borderRadius: 25,
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          backgroundColor:
                            "rgba(255,255,255,0.92)",
                          borderWidth: 1,
                          borderColor:
                            "rgba(255,255,255,0.65)",
                        }}
                      >
                        <Ionicons
                          name="play"
                          size={23}
                          color="#4F633B"
                          style={{
                            marginLeft: 3,
                          }}
                        />
                      </View>
                    </View>

                    <View
                      pointerEvents="none"
                      style={{
                        position:
                          "absolute",
                        left: 9,
                        bottom: 9,
                        flexDirection:
                          "row",
                        alignItems:
                          "center",
                        borderRadius: 999,
                        paddingHorizontal:
                          9,
                        paddingVertical: 5,
                        backgroundColor:
                          "rgba(0,0,0,0.62)",
                      }}
                    >
                      <Ionicons
                        name="videocam"
                        size={13}
                        color="#FFFFFF"
                      />

                      <Text
                        style={{
                          color:
                            "#FFFFFF",
                          fontSize: 10.5,
                          fontWeight:
                            "900",
                          marginLeft: 5,
                        }}
                      >
                        Video post
                      </Text>
                    </View>
                  </View>
                )}

                {!!originalPost && (
                  <View
                    style={{
                      marginHorizontal: 10,
                      marginTop: 10,
                      marginBottom: 10,
                      borderRadius: 13,
                      borderWidth: 1,
                      borderColor:
                        "rgba(180, 83, 9, 0.20)",
                      backgroundColor:
                        "#FFFFFF",
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        flexDirection:
                          "row",
                        alignItems:
                          "center",
                        paddingHorizontal:
                          10,
                        paddingTop: 10,
                        paddingBottom: 8,
                      }}
                    >
                      {originalOwnerAvatar ? (
                        <Image
                          source={{
                            uri:
                              originalOwnerAvatar,
                          }}
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 15,
                            backgroundColor:
                              theme.colors
                                .surfaceAlt,
                          }}
                        />
                      ) : (
                        <View
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 15,
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            backgroundColor:
                              "rgba(180, 83, 9, 0.10)",
                          }}
                        >
                          <Ionicons
                            name="person-outline"
                            size={15}
                            color="#B45309"
                          />
                        </View>
                      )}

                      <View
                        style={{
                          flex: 1,
                          marginLeft: 8,
                        }}
                      >
                        <Text
                          numberOfLines={1}
                          style={{
                            color:
                              theme.colors
                                .text,
                            fontSize: 12,
                            fontWeight:
                              "900",
                          }}
                        >
                          {originalOwnerName}
                        </Text>

                        <Text
                          style={{
                            color:
                              theme.colors
                                .muted,
                            fontSize: 10,
                            fontWeight:
                              "700",
                            marginTop: 2,
                          }}
                        >
                          Original post
                        </Text>
                      </View>

                      <Ionicons
                        name="arrow-forward-circle-outline"
                        size={18}
                        color="#B45309"
                      />
                    </View>

                    {!!originalPost?.content && (
                      <Text
                        numberOfLines={6}
                        style={{
                          color:
                            theme.colors
                              .text,
                          paddingHorizontal:
                            10,
                          paddingBottom: 10,
                          fontSize: 12.5,
                          lineHeight: 18,
                          fontWeight:
                            "600",
                        }}
                      >
                        {originalPost.content}
                      </Text>
                    )}

                    {originalIsImage && (
                      <Image
                        source={{
                          uri:
                            originalMediaUrl,
                        }}
                        resizeMode="cover"
                        style={{
                          width: "100%",
                          height: 180,
                          backgroundColor:
                            theme.colors
                              .surfaceAlt,
                        }}
                      />
                    )}

                    {originalIsVideo && (
                      <View
                        style={{
                          width: "100%",
                          height: 180,
                          backgroundColor:
                            "#111811",
                          overflow: "hidden",
                        }}
                      >
                        <Video
                          source={{
                            uri:
                              originalMediaUrl,
                          }}
                          resizeMode="cover"
                          shouldPlay={false}
                          isLooping={false}
                          isMuted
                          useNativeControls={
                            false
                          }
                          positionMillis={0}
                          pointerEvents="none"
                          style={{
                            width: "100%",
                            height: "100%",
                          }}
                        />

                        <View
                          pointerEvents="none"
                          style={{
                            position:
                              "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            backgroundColor:
                              "rgba(0,0,0,0.18)",
                          }}
                        >
                          <View
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 24,
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              backgroundColor:
                                "rgba(255,255,255,0.94)",
                            }}
                          >
                            <Ionicons
                              name="play"
                              size={22}
                              color="#4F633B"
                              style={{
                                marginLeft: 3,
                              }}
                            />
                          </View>
                        </View>

                        <View
                          pointerEvents="none"
                          style={{
                            position:
                              "absolute",
                            left: 9,
                            bottom: 9,
                            flexDirection:
                              "row",
                            alignItems:
                              "center",
                            borderRadius: 999,
                            paddingHorizontal:
                              9,
                            paddingVertical: 5,
                            backgroundColor:
                              "rgba(0,0,0,0.65)",
                          }}
                        >
                          <Ionicons
                            name="videocam"
                            size={13}
                            color="#FFFFFF"
                          />

                          <Text
                            style={{
                              color:
                                "#FFFFFF",
                              fontSize: 10.5,
                              fontWeight:
                                "900",
                              marginLeft: 5,
                            }}
                          >
                            Original video
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </Pressable>
            ) : (
              <View
                style={{
                  borderRadius: 13,
                  borderWidth: 1,
                  borderColor:
                    theme.colors
                      .divider,
                  backgroundColor:
                    theme.colors
                      .surfaceAlt,
                  padding: 11,
                }}
              >
                <Text
                  style={{
                    color:
                      theme.colors.muted,
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >
                  This Community post
                  is no longer available.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <Text
            style={{
              color:
                theme.colors.text,
              fontWeight: "700",
            }}
          >
            {item.body}
          </Text>
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
              onPress={() =>
                navigation.goBack()
              }
              hitSlop={10}
              style={({ pressed }) => ({
                width: 42,
                height: 42,
                borderRadius: 21,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 11,
                backgroundColor:
                  pressed
                    ? "rgba(79, 99, 59, 0.12)"
                    : "#FFFCF5",
                borderWidth: 1,
                borderColor:
                  "rgba(79, 99, 59, 0.18)",
                transform: [
                  {
                    scale: pressed
                      ? 0.95
                      : 1,
                  },
                ],
              })}
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color="#4F633B"
              />
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
                borderTopColor:
                  "rgba(79, 99, 59, 0.16)",
                backgroundColor:
                  "#FFFCF5",
                paddingHorizontal: 12,
                paddingTop: 11,
                paddingBottom: 10,
                shadowColor: "#1F2933",
                shadowOpacity: 0.08,
                shadowRadius: 12,
                shadowOffset: {
                  width: 0,
                  height: -4,
                },
                elevation: 12,
              }}
            >
              {!!pendingSharedPost && (
                <View
                  style={{
                    marginBottom: 10,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor:
                      "rgba(79, 99, 59, 0.18)",
                    backgroundColor:
                      "#FFFCF5",
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 12,
                      paddingTop: 11,
                      paddingBottom: 9,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        alignItems: "center",
                        justifyContent:
                          "center",
                        backgroundColor:
                          "rgba(79, 99, 59, 0.10)",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                        }}
                      >
                        ↗
                      </Text>
                    </View>

                    <View
                      style={{
                        flex: 1,
                        marginLeft: 9,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            theme.colors
                              .text,
                          fontSize: 12.5,
                          fontWeight: "900",
                        }}
                      >
                        Community post
                      </Text>

                      <Text
                        numberOfLines={1}
                        style={{
                          color:
                            theme.colors
                              .muted,
                          fontSize: 11,
                          fontWeight: "700",
                          marginTop: 2,
                        }}
                      >
                        Ready to send
                      </Text>
                    </View>

                    <Pressable
                      onPress={() =>
                        setPendingSharedPost(
                          null
                        )
                      }
                      hitSlop={10}
                      style={({ pressed }) => ({
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        alignItems: "center",
                        justifyContent:
                          "center",
                        backgroundColor:
                          pressed
                            ? "rgba(180, 83, 9, 0.10)"
                            : theme.colors
                                .surface,
                        borderWidth: 1,
                        borderColor:
                          theme.colors
                            .divider,
                      })}
                    >
                      <Text
                        style={{
                          color:
                            theme.colors
                              .text,
                          fontSize: 18,
                          fontWeight: "800",
                        }}
                      >
                        ×
                      </Text>
                    </Pressable>
                  </View>

                  {!!pendingSharedPost
                    ?.content && (
                    <Text
                      numberOfLines={4}
                      style={{
                        color:
                          theme.colors.text,
                        paddingHorizontal: 12,
                        paddingBottom: 11,
                        fontSize: 13,
                        lineHeight: 18,
                        fontWeight: "600",
                      }}
                    >
                      {
                        pendingSharedPost.content
                      }
                    </Text>
                  )}

                  {!!pendingSharedPost
                    ?.media_url &&
                    String(
                      pendingSharedPost
                        ?.media_type ||
                        ""
                    )
                      .toLowerCase()
                      .startsWith(
                        "image"
                      ) && (
                      <Image
                        source={{
                          uri:
                            pendingSharedPost
                              .media_url,
                        }}
                        resizeMode="cover"
                        style={{
                          width: "100%",
                          height: 120,
                          backgroundColor:
                            theme.colors
                              .surfaceAlt,
                        }}
                      />
                    )}

                  {!!pendingSharedPost
                    ?.media_url &&
                    String(
                      pendingSharedPost
                        ?.media_type ||
                        ""
                    )
                      .toLowerCase()
                      .startsWith(
                        "video"
                      ) && (
                      <View
                        style={{
                          width: "100%",
                          height: 130,
                          backgroundColor:
                            "#111811",
                          overflow: "hidden",
                        }}
                      >
                        <Video
                          source={{
                            uri:
                              pendingSharedPost
                                .media_url,
                          }}
                          resizeMode="cover"
                          shouldPlay={false}
                          isMuted
                          useNativeControls={
                            false
                          }
                          pointerEvents="none"
                          style={{
                            width: "100%",
                            height: "100%",
                          }}
                        />

                        <View
                          pointerEvents="none"
                          style={{
                            position:
                              "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            backgroundColor:
                              "rgba(0,0,0,0.18)",
                          }}
                        >
                          <View
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 22,
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              backgroundColor:
                                "rgba(255,255,255,0.94)",
                            }}
                          >
                            <Ionicons
                              name="play"
                              size={21}
                              color="#4F633B"
                              style={{
                                marginLeft: 3,
                              }}
                            />
                          </View>
                        </View>
                      </View>
                    )}

                  {!!pendingSharedPost
                    ?.shared_post && (
                    <View
                      style={{
                        marginHorizontal: 10,
                        marginTop: 9,
                        marginBottom: 10,
                        borderRadius: 13,
                        borderWidth: 1,
                        borderColor:
                          "rgba(180, 83, 9, 0.20)",
                        backgroundColor:
                          "#FFFFFF",
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          flexDirection:
                            "row",
                          alignItems:
                            "center",
                          paddingHorizontal:
                            10,
                          paddingVertical: 9,
                        }}
                      >
                        {!!pendingSharedPost
                          ?.shared_post
                          ?.author_profile
                          ?.avatar_url ? (
                          <Image
                            source={{
                              uri:
                                pendingSharedPost
                                  .shared_post
                                  .author_profile
                                  .avatar_url,
                            }}
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 15,
                            }}
                          />
                        ) : (
                          <View
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 15,
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              backgroundColor:
                                "rgba(180, 83, 9, 0.10)",
                            }}
                          >
                            <Ionicons
                              name="person-outline"
                              size={15}
                              color="#B45309"
                            />
                          </View>
                        )}

                        <View
                          style={{
                            flex: 1,
                            marginLeft: 8,
                          }}
                        >
                          <Text
                            numberOfLines={1}
                            style={{
                              color:
                                "#1F2933",
                              fontSize: 12,
                              fontWeight:
                                "900",
                            }}
                          >
                            {pendingSharedPost
                              ?.shared_post
                              ?.author_profile
                              ?.display_name ||
                              pendingSharedPost
                                ?.shared_post
                                ?.church
                                ?.display_name ||
                              pendingSharedPost
                                ?.shared_post
                                ?.churches
                                ?.display_name ||
                              "Original author"}
                          </Text>

                          <Text
                            style={{
                              color:
                                "#6B7280",
                              fontSize: 10,
                              fontWeight:
                                "700",
                              marginTop: 2,
                            }}
                          >
                            Original post
                          </Text>
                        </View>
                      </View>

                      {!!pendingSharedPost
                        ?.shared_post
                        ?.content && (
                        <Text
                          numberOfLines={5}
                          style={{
                            color:
                              "#1F2933",
                            paddingHorizontal:
                              10,
                            paddingBottom: 9,
                            fontSize: 12.5,
                            lineHeight: 18,
                            fontWeight:
                              "600",
                          }}
                        >
                          {
                            pendingSharedPost
                              .shared_post
                              .content
                          }
                        </Text>
                      )}

                      {!!pendingSharedPost
                        ?.shared_post
                        ?.media_url &&
                        String(
                          pendingSharedPost
                            ?.shared_post
                            ?.media_type ||
                            ""
                        )
                          .toLowerCase()
                          .startsWith(
                            "image"
                          ) && (
                          <Image
                            source={{
                              uri:
                                pendingSharedPost
                                  .shared_post
                                  .media_url,
                            }}
                            resizeMode="cover"
                            style={{
                              width: "100%",
                              height: 150,
                              backgroundColor:
                                theme.colors
                                  .surfaceAlt,
                            }}
                          />
                        )}

                      {!!pendingSharedPost
                        ?.shared_post
                        ?.media_url &&
                        String(
                          pendingSharedPost
                            ?.shared_post
                            ?.media_type ||
                            ""
                        )
                          .toLowerCase()
                          .startsWith(
                            "video"
                          ) && (
                          <View
                            style={{
                              width: "100%",
                              height: 150,
                              backgroundColor:
                                "#111811",
                              overflow:
                                "hidden",
                            }}
                          >
                            <Video
                              source={{
                                uri:
                                  pendingSharedPost
                                    .shared_post
                                    .media_url,
                              }}
                              resizeMode="cover"
                              shouldPlay={
                                false
                              }
                              isMuted
                              useNativeControls={
                                false
                              }
                              pointerEvents="none"
                              style={{
                                width: "100%",
                                height: "100%",
                              }}
                            />

                            <View
                              pointerEvents="none"
                              style={{
                                position:
                                  "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                alignItems:
                                  "center",
                                justifyContent:
                                  "center",
                                backgroundColor:
                                  "rgba(0,0,0,0.18)",
                              }}
                            >
                              <View
                                style={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: 22,
                                  alignItems:
                                    "center",
                                  justifyContent:
                                    "center",
                                  backgroundColor:
                                    "rgba(255,255,255,0.94)",
                                }}
                              >
                                <Ionicons
                                  name="play"
                                  size={21}
                                  color="#4F633B"
                                  style={{
                                    marginLeft: 3,
                                  }}
                                />
                              </View>
                            </View>
                          </View>
                        )}
                    </View>
                  )}
                </View>
              )}

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
                    minHeight: 46,
                    backgroundColor:
                      "#FFFFFF",
                    borderRadius: 23,
                    borderWidth: 1.5,
                    borderColor:
                      willCancelOnRelease
                        ? "#DC2626"
                        : isRecording
                        ? "#B45309"
                        : "rgba(79, 99, 59, 0.28)",
                    paddingHorizontal: 16,
                    paddingVertical: 11,
                    color: "#1F2933",
                    fontSize: 14,
                    fontWeight: "700",
                    opacity:
                      isRecording
                        ? 0.82
                        : 1,
                    shadowColor:
                      "#4F633B",
                    shadowOpacity: 0.05,
                    shadowRadius: 5,
                    shadowOffset: {
                      width: 0,
                      height: 2,
                    },
                    elevation: 1,
                  }}
                />

                <Pressable
                  onPress={handleSend}
                  disabled={
                    isRecording ||
                    composerDisabled ||
                    (!draft.trim() &&
                      !pendingSharedPost?.id)
                  }
                  hitSlop={6}
                  style={({ pressed }) => ({
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor:
                      pressed
                        ? "#7C2D12"
                        : "#B45309",
                    borderWidth: 1,
                    borderColor:
                      "rgba(124, 45, 18, 0.30)",
                    opacity:
                      isRecording ||
                      composerDisabled ||
                      (!draft.trim() &&
                        !pendingSharedPost?.id)
                        ? 0.45
                        : pressed
                        ? 0.78
                        : 1,
                    transform: [
                      {
                        scale: pressed
                          ? 0.95
                          : 1,
                      },
                    ],
                  })}
                >
                  <Ionicons
                    name="send"
                    size={20}
                    color="#FFFFFF"
                  />
                </Pressable>

                {/* Press-and-hold microphone with swipe-left cancel */}
                <Animated.View
                  {...micPanResponder.panHandlers}
                  style={{
                    transform: [
                      {
                        translateX:
                          micDragX,
                      },
                    ],
                    opacity:
                      composerDisabled
                        ? 0.45
                        : 1,
                  }}
                >
                  <View
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 23,
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      borderWidth: 1,
                      borderColor:
                        willCancelOnRelease
                          ? "#DC2626"
                          : isRecording
                          ? theme.colors.gold
                          : theme.colors
                              .divider,
                      backgroundColor:
                        willCancelOnRelease
                          ? "rgba(220, 38, 38, 0.10)"
                          : isRecording
                          ? theme.colors
                              .goldHalo
                          : theme.colors
                              .surfaceAlt,
                    }}
                  >
                    <Ionicons
                      name={
                        isRecording
                          ? "radio"
                          : "mic"
                      }
                      size={21}
                      color={
                        willCancelOnRelease
                          ? "#DC2626"
                          : isRecording
                          ? "#B45309"
                          : theme.colors
                              .text
                      }
                    />
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