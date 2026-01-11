// src/components/PostCard.js
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    Linking,
    Modal,
    PanResponder,
    Platform,
    Pressable,
    StatusBar,
    Text,
    View,
} from "react-native";
import { WebView } from "react-native-webview";

import { getDomainFromUrl, getYouTubeVideoId, openExternalUrl } from "../lib/youtube";
import { theme } from "../theme/theme";

function FeedActionButton({ icon, label, active, onPress, onLongPress }) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => ({
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        gap: 8,
        backgroundColor: active
          ? theme.colors.goldHalo
          : pressed
          ? theme.colors.surfaceAlt
          : theme.colors.surface,
      })}
    >
      <Ionicons
        name={icon}
        size={18}
        color={active ? theme.colors.goldPressed : theme.colors.text2}
      />
      <Text
        style={{
          color: active ? theme.colors.goldPressed : theme.colors.text2,
          fontWeight: "800",
          fontSize: 13,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* -------------------- YouTube helpers (PostCard = single source of truth) -------------------- */
function normalizeHttpUrl(raw) {
  if (!raw || typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isYouTubeUrl(raw) {
  const url = normalizeHttpUrl(raw);
  if (!url) return false;
  return /(^|\/\/)(www\.)?(youtube\.com|youtu\.be)\//i.test(url);
}

function sanitizeYouTubeId(id) {
  if (!id) return null;
  const s = String(id).trim();
  // YouTube video IDs are typically 11 chars: letters, numbers, _ and -
  const ok = /^[a-zA-Z0-9_-]{11}$/.test(s);
  return ok ? s : null;
}

function extractYouTubeVideoIdRobust(raw) {
  const url = normalizeHttpUrl(raw);
  if (!url) return null;

  try {
    const u = new URL(url);

    // youtu.be/VIDEO_ID
    if (u.hostname.toLowerCase().includes("youtu.be")) {
      return sanitizeYouTubeId(u.pathname.split("/").filter(Boolean)[0]);
    }

    // youtube.com/watch?v=VIDEO_ID
    const v = u.searchParams.get("v");
    const vOk = sanitizeYouTubeId(v);
    if (vOk) return vOk;

    // youtube.com/shorts/VIDEO_ID
    const shortsMatch = u.pathname.match(/\/shorts\/([^/?#]+)/i);
    const shortsOk = sanitizeYouTubeId(shortsMatch?.[1]);
    if (shortsOk) return shortsOk;

    // youtube.com/embed/VIDEO_ID
    const embedMatch = u.pathname.match(/\/embed\/([^/?#]+)/i);
    const embedOk = sanitizeYouTubeId(embedMatch?.[1]);
    if (embedOk) return embedOk;
  } catch {
    // ignore
  }

  // LAST: your existing library helper (sanitized)
  const fromLib = raw ? sanitizeYouTubeId(getYouTubeVideoId(raw)) : null;
  return fromLib;
}

function buildYouTubeEmbedUrl(videoId) {
  if (!videoId) return "";

  const base = `https://www.youtube.com/embed/${videoId}`;

  // Keep params minimal. DO NOT include `origin` in WebView.
  // (origin can cause redirects / “home page” loads in some Android WebView configs)
  const params = new URLSearchParams({
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    controls: "1",
    fs: "1",
    enablejsapi: "1",
  });

  return `${base}?${params.toString()}`;
}

/**
 * IMPORTANT:
 * We use HTML + baseUrl (not `source={{ uri: ... }}`) because Android WebView + YouTube embeds
 * can behave better when there is a document context.
 */
function buildYouTubeEmbedHtml(videoId) {
  if (!videoId) return "";

  const src = buildYouTubeEmbedUrl(videoId);

  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <style>
      html, body { margin:0; padding:0; width:100%; height:100%; background:#000; overflow:hidden; }
      iframe { position:absolute; top:0; left:0; width:100%; height:100%; border:0; }
    </style>
  </head>
  <body>
    <iframe
      src="${src}"
      title="YouTube video"
      referrerpolicy="origin-when-cross-origin"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
      allowfullscreen
    ></iframe>
  </body>
</html>`;
}

function getYouTubeDeepLinks(videoId) {
  if (!videoId) return [];
  return [
    `vnd.youtube://${videoId}`,
    `youtube://${videoId}`,
    `vnd.youtube://watch?v=${videoId}`,
    `youtube://watch?v=${videoId}`,
  ];
}

async function openYouTubeExternally({ rawUrl, videoId }) {
  const id = sanitizeYouTubeId(videoId);

  if (id) {
    const candidates = getYouTubeDeepLinks(id);

    for (const u of candidates) {
      try {
        await Linking.openURL(u);
        return;
      } catch {
        // try next
      }
    }

    // Guaranteed fallback: https
    await Linking.openURL(`https://www.youtube.com/watch?v=${id}`);
    return;
  }

  await Linking.openURL(normalizeHttpUrl(rawUrl));
}

function isYouTubeHomeRedirect(url) {
  if (!url || typeof url !== "string") return false;
  const u = url.trim();
  // These are the common “fallback” navigations we’ve seen when YouTube refuses the embed
  return (
    u === "https://www.youtube.com/" ||
    u === "https://m.youtube.com/" ||
    u === "https://www.youtube.com" ||
    u === "https://m.youtube.com" ||
    u.startsWith("https://www.youtube.com/?") ||
    u.startsWith("https://m.youtube.com/?")
  );
}
/* -------------------- end helpers -------------------- */

export default function PostCard({
  post,
  currentUserId,
  author, // { name, avatarUrl, isAnonymous, isOwner }
  onDelete,
  onHide,
  onOpenComments,
  onShare,
  onSetReaction,
  reactionPickerForPost,
  setReactionPickerForPost,
  preferInAppYouTube = true,
}) {
  const [ytVisible, setYtVisible] = useState(false);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytError, setYtError] = useState(null);

  // Prevent repeated auto-fallback loops
  const ytAutoOpenedRef = useRef(false);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(30)).current;
  const sheetScale = useRef(new Animated.Value(0.98)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  const domain = useMemo(
    () => (post?.url ? getDomainFromUrl(post.url) : null),
    [post?.url]
  );

  // Determine if it’s YouTube by URL
  const isYouTubeLink = useMemo(() => isYouTubeUrl(post?.url), [post?.url]);

  const ytId = useMemo(
    () => (post?.url ? extractYouTubeVideoIdRobust(post.url) : null),
    [post?.url]
  );

  const youtubeThumb = useMemo(() => {
    if (!ytId) return null;
    return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  }, [ytId]);

  const reactions = post?.reactions || [];
  const likeCount = reactions.filter((r) => r.type === "like").length;
  const loveCount = reactions.filter((r) => r.type === "love").length;
  const prayCount = reactions.filter((r) => r.type === "pray").length;
  const totalReactions = likeCount + loveCount + prayCount;

  const userReaction = currentUserId
    ? reactions.find((r) => r.user_id === currentUserId)
    : null;

  const createdLabel = post?.created_at
    ? new Date(post.created_at).toLocaleString()
    : "";
  const isImage =
    post?.media_url &&
    post?.media_type &&
    String(post.media_type).startsWith("image");

  const who = author?.name || "Member on Triunely";
  const avatarUrl = author?.avatarUrl || null;
  const initials = (who || "T").slice(0, 1).toUpperCase();
  const isOwner = !!author?.isOwner;

  const socialLeft =
    totalReactions > 0
      ? `${totalReactions} reaction${totalReactions === 1 ? "" : "s"}`
      : "";
  const socialRight =
    post?.comment_count && post.comment_count > 0
      ? `${post.comment_count} comment${post.comment_count === 1 ? "" : "s"}`
      : "";

  const likeIcon =
    userReaction?.type === "like" ? "thumbs-up" : "thumbs-up-outline";

  const openYouTubeModal = () => {
    if (!preferInAppYouTube) return;

    ytAutoOpenedRef.current = false;

    console.log("[YT] raw url:", post?.url);
    console.log("[YT] extracted id:", ytId);
    console.log("[YT] embed url:", ytId ? buildYouTubeEmbedUrl(ytId) : null);

    setYtError(null);
    setYtLoading(!!ytId);
    setYtVisible(true);

    backdropOpacity.setValue(0);
    sheetTranslateY.setValue(30);
    sheetScale.setValue(0.98);
    dragY.setValue(0);

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(sheetScale, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeYouTubeModal = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 30,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(sheetScale, {
        toValue: 0.98,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setYtVisible(false);
      setYtLoading(false);
      setYtError(null);
      dragY.setValue(0);
      ytAutoOpenedRef.current = false;
    });
  };

  const handleOpenInYouTube = async () => {
    try {
      await openYouTubeExternally({ rawUrl: post?.url, videoId: ytId });
    } catch {
      Alert.alert("Could not open YouTube. Please try again.");
    }
  };

  const autoFallbackToYouTube = async () => {
    if (ytAutoOpenedRef.current) return;
    ytAutoOpenedRef.current = true;

    setYtLoading(false);
    setYtError("This video can’t play in-app. Opening YouTube…");

    try {
      await handleOpenInYouTube();
    } finally {
      // Close quickly so the user never gets stuck on a dead player
      setTimeout(() => {
        closeYouTubeModal();
      }, 250);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        if (!ytVisible) return false;
        const isMostlyVertical = Math.abs(gesture.dy) > Math.abs(gesture.dx);
        return isMostlyVertical && gesture.dy > 6;
      },
      onPanResponderMove: (_, gesture) => {
        const dy = Math.max(0, gesture.dy);
        dragY.setValue(dy);
      },
      onPanResponderRelease: (_, gesture) => {
        const dy = Math.max(0, gesture.dy);
        const vy = gesture.vy;

        const shouldDismiss = dy > 140 || vy > 1.2;
        if (shouldDismiss) {
          closeYouTubeModal();
          return;
        }

        Animated.spring(dragY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
        }).start();
      },
    })
  ).current;

  function handlePressLink() {
    if (!post?.url) return;

    // For YouTube: open our modal. If YouTube refuses playback, we auto-open the YouTube app.
    if (isYouTubeLink && preferInAppYouTube) {
      openYouTubeModal();
      return;
    }

    openExternalUrl(post.url, Linking, Alert);
  }

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: theme.colors.divider,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 10,
      }}
    >
      {ytVisible && (
        <Modal
          visible={ytVisible}
          transparent
          animationType="none"
          onRequestClose={closeYouTubeModal}
        >
          <StatusBar
            barStyle="light-content"
            translucent
            backgroundColor="transparent"
          />

          <Animated.View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.98)",
              opacity: backdropOpacity,
            }}
          >
            <Pressable style={{ flex: 1 }} onPress={closeYouTubeModal} />
          </Animated.View>

          <Animated.View
            {...panResponder.panHandlers}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              transform: [
                { translateY: Animated.add(sheetTranslateY, dragY) },
                { scale: sheetScale },
              ],
            }}
          >
            <View style={{ flex: 1, backgroundColor: "transparent" }}>
              <View
                style={{
                  position: "absolute",
                  top: Platform.OS === "android" ? 14 : 18,
                  left: 14,
                  right: 14,
                  zIndex: 20,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
                pointerEvents="box-none"
              >
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: "rgba(255,255,255,0.10)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.12)",
                  }}
                >
                  <Text
                    style={{ color: "white", fontSize: 12, fontWeight: "700" }}
                  >
                    YouTube
                  </Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Pressable
                    onPress={handleOpenInYouTube}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: "rgba(255,255,255,0.12)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.12)",
                      marginRight: 10,
                    }}
                    hitSlop={10}
                  >
                    <Text
                      style={{ color: "white", fontSize: 12, fontWeight: "700" }}
                    >
                      Open in YouTube
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={closeYouTubeModal}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 999,
                      backgroundColor: "rgba(255,255,255,0.12)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.12)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    hitSlop={10}
                  >
                    <Text style={{ color: "white", fontSize: 18, fontWeight: "900" }}>
                      ×
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={{ flex: 1, backgroundColor: "black" }}>
                {!ytId ? (
                  <View
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 24,
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: 16,
                        fontWeight: "800",
                        marginBottom: 10,
                      }}
                    >
                      This video can’t be played here
                    </Text>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.75)",
                        textAlign: "center",
                        marginBottom: 16,
                      }}
                    >
                      We couldn’t extract a valid YouTube video ID. You can still open it in YouTube.
                    </Text>

                    <Pressable
                      onPress={handleOpenInYouTube}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 999,
                        backgroundColor: "rgba(255,255,255,0.14)",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.12)",
                      }}
                    >
                      <Text style={{ color: "white", fontWeight: "800" }}>
                        Open in YouTube
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <WebView
                      source={{
                        html: buildYouTubeEmbedHtml(ytId),
                        baseUrl: "https://www.youtube.com",
                      }}
                      javaScriptEnabled
                      domStorageEnabled
                      allowsFullscreenVideo
                      mediaPlaybackRequiresUserAction={false}
                      allowsInlineMediaPlayback
                      thirdPartyCookiesEnabled={true}
                      sharedCookiesEnabled={true}
                      mixedContentMode="always"
                      javaScriptCanOpenWindowsAutomatically={false}
                      setSupportMultipleWindows={false}
                      userAgent={
                        Platform.OS === "android"
                          ? "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
                          : "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
                      }
                      onLoadStart={(e) => {
                        setYtLoading(true);
                        setYtError(null);
                        console.log("[YT] load start:", e?.nativeEvent?.url);
                      }}
                      onLoadEnd={(e) => {
                        setYtLoading(false);
                        console.log("[YT] load end:", e?.nativeEvent?.url);
                      }}
                      onError={(e) => {
                        console.log("[YT] webview error:", e?.nativeEvent);
                        autoFallbackToYouTube();
                      }}
                      onHttpError={(e) => {
                        console.log("[YT] http error:", e?.nativeEvent);
                        autoFallbackToYouTube();
                      }}
                      onNavigationStateChange={(navState) => {
                        const url = navState?.url;
                        if (!url) return;

                        // If YouTube refuses the embed on this device/build, it often navigates to YouTube home.
                        if (isYouTubeHomeRedirect(url)) {
                          console.log("[YT] redirected to YouTube home (embed refused):", url);
                          autoFallbackToYouTube();
                        }
                      }}
                      originWhitelist={["*"]}
                      style={{ flex: 1, backgroundColor: "black" }}
                    />

                    {ytLoading && (
                      <View
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "rgba(0,0,0,0.35)",
                          padding: 24,
                        }}
                        pointerEvents="none"
                      >
                        <ActivityIndicator />
                        <Text style={{ color: "white", marginTop: 10, fontWeight: "700" }}>
                          Loading video…
                        </Text>
                      </View>
                    )}

                    {!!ytError && (
                      <View
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "rgba(0,0,0,0.70)",
                          padding: 24,
                        }}
                      >
                        <Text
                          style={{
                            color: "white",
                            fontSize: 16,
                            fontWeight: "900",
                            marginBottom: 10,
                            textAlign: "center",
                          }}
                        >
                          {ytError}
                        </Text>

                        <Pressable
                          onPress={handleOpenInYouTube}
                          style={{
                            marginTop: 10,
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 999,
                            backgroundColor: "rgba(255,255,255,0.14)",
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.12)",
                          }}
                        >
                          <Text style={{ color: "white", fontWeight: "800" }}>
                            Open in YouTube
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </>
                )}
              </View>
            </View>
          </Animated.View>
        </Modal>
      )}

      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.colors.surfaceAlt,
              borderWidth: 1,
              borderColor: theme.colors.divider,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={{ width: 40, height: 40 }} />
            ) : (
              <Text style={{ color: theme.colors.text2, fontWeight: "900" }}>
                {initials}
              </Text>
            )}
          </View>

          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text
              style={{ color: theme.colors.text, fontWeight: "900", fontSize: 14 }}
              numberOfLines={1}
            >
              {who}
            </Text>
            {!!createdLabel && (
              <Text style={{ color: theme.colors.muted, fontSize: 12, marginTop: 1 }}>
                {createdLabel}
              </Text>
            )}
          </View>
        </View>

        {currentUserId ? (
          <Pressable
            onPress={() => (isOwner ? onDelete?.(post.id) : onHide?.(post.id))}
            style={{ paddingHorizontal: 6, paddingVertical: 6 }}
            hitSlop={8}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={theme.colors.muted} />
          </Pressable>
        ) : null}
      </View>

      {!!post?.content && (
        <Text
          style={{
            color: theme.colors.text,
            marginTop: 10,
            fontSize: 15,
            lineHeight: 21,
            fontWeight: "500",
          }}
        >
          {post.content}
        </Text>
      )}

      {isImage && (
        <View
          style={{
            marginTop: 10,
            borderRadius: 14,
            overflow: "hidden",
            width: "100%",
            backgroundColor: theme.colors.surfaceAlt,
            borderWidth: 1,
            borderColor: theme.colors.divider,
          }}
        >
          <Image
            source={{ uri: post.media_url }}
            style={{ width: "100%", height: undefined, aspectRatio: 1 }}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Link preview */}
      {post?.url ? (
        <Pressable
          onPress={handlePressLink}
          style={{
            marginTop: 10,
            borderRadius: 14,
            overflow: "hidden",
            backgroundColor: theme.colors.surfaceAlt,
            borderWidth: 1,
            borderColor: theme.colors.divider,
          }}
        >
          {youtubeThumb ? (
            <View>
              <Image
                source={{ uri: youtubeThumb }}
                style={{ width: "100%", height: 190 }}
                resizeMode="cover"
              />
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                pointerEvents="none"
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: "rgba(0,0,0,0.55)",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.25)",
                  }}
                >
                  <Ionicons name="play" size={26} color="#fff" style={{ marginLeft: 2 }} />
                </View>
              </View>
            </View>
          ) : null}

          <View style={{ padding: 12 }}>
            <Text
              style={{
                color: theme.colors.muted,
                fontSize: 12,
                fontWeight: "800",
                marginBottom: 4,
              }}
            >
              {domain ? domain.toUpperCase() : "LINK"}
            </Text>

            <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 13 }}>
              {domain ? `Open on ${domain}` : "Open link"}
            </Text>

            <Text
              style={{ color: theme.colors.text2, marginTop: 4, fontSize: 12 }}
              numberOfLines={1}
            >
              {post.url}
            </Text>

            {isYouTubeLink && preferInAppYouTube ? (
              <Text
                style={{
                  color: theme.colors.muted,
                  marginTop: 6,
                  fontSize: 12,
                  fontWeight: "800",
                }}
              >
                Opens full screen in-app (auto-falls back to YouTube if blocked)
              </Text>
            ) : null}

            {isYouTubeLink ? (
              <View style={{ marginTop: 10, flexDirection: "row" }}>
                <Pressable
                  onPress={handleOpenInYouTube}
                  style={{
                    alignSelf: "flex-start",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: theme.colors.surface,
                    borderWidth: 1,
                    borderColor: theme.colors.divider,
                  }}
                  hitSlop={8}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 12 }}>
                    Open in YouTube
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </Pressable>
      ) : null}

      {(socialLeft || socialRight) && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 12,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: theme.colors.divider,
          }}
        >
          <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: "800" }}>
            {socialLeft}
          </Text>
          <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: "800" }}>
            {socialRight}
          </Text>
        </View>
      )}

      <View style={{ flexDirection: "row", marginTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.divider }}>
        <FeedActionButton
          icon={likeIcon}
          label="Like"
          active={!!userReaction}
          onPress={() => onSetReaction?.(post.id, "like")}
          onLongPress={() => setReactionPickerForPost?.(post.id)}
        />
        <FeedActionButton
          icon="chatbubble-outline"
          label="Comment"
          active={false}
          onPress={() => onOpenComments?.(post)}
        />
        <FeedActionButton
          icon="arrow-redo-outline"
          label="Share"
          active={false}
          onPress={() => onShare?.(post)}
        />
      </View>

      {reactionPickerForPost === post.id && (
        <View
          style={{
            flexDirection: "row",
            marginTop: 10,
            alignSelf: "flex-start",
            backgroundColor: theme.colors.surfaceAlt,
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: theme.colors.divider,
          }}
        >
          <Pressable onPress={() => onSetReaction?.(post.id, "like")} style={{ marginHorizontal: 6 }}>
            <Text style={{ fontSize: 20 }}>👍</Text>
          </Pressable>
          <Pressable onPress={() => onSetReaction?.(post.id, "love")} style={{ marginHorizontal: 6 }}>
            <Text style={{ fontSize: 20 }}>❤️</Text>
          </Pressable>
          <Pressable onPress={() => onSetReaction?.(post.id, "pray")} style={{ marginHorizontal: 6 }}>
            <Text style={{ fontSize: 20 }}>🙏</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
