// src/components/PostCard.js
import { Ionicons } from "@expo/vector-icons";
import { Video } from "expo-av";
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

const POST_REACTIONS = [
  {
    type: "like",
    emoji: "👍",
    label: "Like",
  },
  {
    type: "love",
    emoji: "❤️",
    label: "Love",
  },
  {
    type: "pray",
    emoji: "🙏",
    label: "Pray",
  },
  {
    type: "laugh",
    emoji: "😂",
    label: "Laugh",
  },
  {
    type: "sad",
    emoji: "😢",
    label: "Sad",
  },
  {
    type: "support",
    emoji: "🤍",
    label: "Support",
  },
];

function getPostReactionMeta(type) {
  return (
    POST_REACTIONS.find(
      (reaction) =>
        reaction.type === type
    ) || null
  );
}

function FeedActionButton({
  icon,
  emoji,
  label,
  active = false,
  onPress,
  onLongPress,
  disabled = false,
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={280}
      disabled={disabled}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 46,
        borderRadius: 15,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 8,
        backgroundColor: active
          ? "rgba(180, 83, 9, 0.10)"
          : pressed
            ? "rgba(79, 99, 59, 0.09)"
            : "transparent",
        opacity: disabled
          ? 0.35
          : pressed
            ? 0.8
            : 1,
        transform: [
          {
            scale:
              pressed && !disabled
                ? 0.97
                : 1,
          },
        ],
      })}
    >
      {emoji ? (
        <Text
          style={{
            fontSize: 18,
            lineHeight: 22,
            marginRight: 6,
          }}
        >
          {emoji}
        </Text>
      ) : (
        <Ionicons
          name={icon}
          size={19}
          color={
            active
              ? "#B45309"
              : "#4F633B"
          }
          style={{
            marginRight: 6,
          }}
        />
      )}

      <Text
        style={{
          color: active
            ? "#9A4708"
            : "#4F633B",
          fontWeight: "900",
          fontSize: 12.5,
        }}
        numberOfLines={1}
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
function SharedPostPreview({
  sharedPost,
  onPressOriginalPost,
  onPressOriginalAuthor,
}) {
  const [
    imageAspectRatio,
    setImageAspectRatio,
  ] = useState(null);

  if (!sharedPost) {
    return null;
  }

  const sharedChurch =
    sharedPost?.church || null;

  const sharedAuthorProfile =
    sharedPost?.author_profile ||
    null;

  const originalOwnerName =
    sharedChurch?.display_name ||
    sharedChurch?.name ||
    sharedAuthorProfile
      ?.display_name ||
    (sharedPost?.is_anonymous
      ? "Anonymous"
      : "Triunely member");

  const originalAvatarUrl =
    sharedChurch?.avatar_url ||
    sharedAuthorProfile
      ?.avatar_url ||
    null;

  const canOpenOriginalAuthor =
    !sharedPost?.is_anonymous &&
    typeof onPressOriginalAuthor ===
      "function";

  const sharedMediaType =
    String(
      sharedPost?.media_type || ""
    );

  const sharedIsImage =
    !!sharedPost?.media_url &&
    sharedMediaType.startsWith(
      "image"
    );

  const sharedIsVideo =
    !!sharedPost?.media_url &&
    sharedMediaType.startsWith(
      "video"
    );

  const sharedUrl =
    normalizeHttpUrl(
      sharedPost?.url
    );

  function handleSharedLinkPress() {
    if (!sharedUrl) {
      return;
    }

    openExternalUrl(
      sharedUrl,
      Linking,
      Alert
    );
  }

  return (
    <View
      style={{
        marginTop: 12,
        borderRadius: 17,
        borderWidth: 1,
        borderColor:
          "rgba(79, 99, 59, 0.22)",
        backgroundColor: "#FFFCF5",
        overflow: "hidden",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 13,
          paddingTop: 12,
          paddingBottom: 10,
        }}
      >
        {originalAvatarUrl ? (
          <Pressable
            onPress={() => {
              if (
                canOpenOriginalAuthor
              ) {
                onPressOriginalAuthor();
              }
            }}
            disabled={
              !canOpenOriginalAuthor
            }
          >
            <Image
              source={{
                uri:
                  originalAvatarUrl,
              }}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor:
                "#F3F1E8",
              }}
            />
          </Pressable>
        ) : (
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: "center",
              justifyContent:
                "center",
              backgroundColor:
                "rgba(79, 99, 59, 0.11)",
            }}
          >
            <Ionicons
              name={
                sharedChurch
                  ? "business-outline"
                  : "person-outline"
              }
              size={17}
              color="#4F633B"
            />
          </View>
        )}

        <View
          style={{
            flex: 1,
            marginLeft: 9,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Pressable
              onPress={() => {
                if (
                  canOpenOriginalAuthor
                ) {
                  onPressOriginalAuthor();
                }
              }}
              disabled={
                !canOpenOriginalAuthor
              }
              style={{
                flexShrink: 1,
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  color: "#1F2933",
                  fontSize: 13,
                  fontWeight: "900",
                }}
              >
                {originalOwnerName}
              </Text>
            </Pressable>

            {!!sharedChurch
              ?.is_verified && (
              <Ionicons
                name="checkmark-circle"
                size={14}
                color="#B45309"
                style={{
                  marginLeft: 4,
                }}
              />
            )}
          </View>

          <Text
            style={{
              color: "#6B7280",
              fontSize: 10.5,
              fontWeight: "700",
              marginTop: 2,
            }}
          >
            Original post
          </Text>
        </View>

        <Ionicons
          name="repeat-outline"
          size={18}
          color="#B45309"
        />
      </View>

      {!!sharedPost?.content && (
        <Text
          style={{
            color: "#1F2933",
            paddingHorizontal: 13,
            paddingBottom: 12,
            fontSize: 14,
            lineHeight: 20,
            fontWeight: "500",
          }}
        >
          {sharedPost.content}
        </Text>
      )}

      {sharedIsImage && (
        <Image
          source={{
            uri:
              sharedPost.media_url,
          }}
          resizeMode="cover"
          style={{
            width: "100%",
            aspectRatio:
              imageAspectRatio || 1,
            backgroundColor:
              "#F3F1E8",
          }}
          onLoad={(event) => {
            const source =
              event?.nativeEvent
                ?.source;

            const width =
              Number(
                source?.width
              );

            const height =
              Number(
                source?.height
              );

            if (
              width > 0 &&
              height > 0
            ) {
              const ratio =
                Math.min(
                  Math.max(
                    width /
                      height,
                    0.5
                  ),
                  2.2
                );

              setImageAspectRatio(
                ratio
              );
            }
          }}
        />
      )}

      {sharedIsVideo && (
        <View
          style={{
            width: "100%",
            backgroundColor: "#000",
          }}
        >
          <Video
            source={{
              uri:
                sharedPost.media_url,
            }}
            style={{
              width: "100%",
              aspectRatio: 9 / 16,
              backgroundColor:
                "#000",
            }}
            resizeMode="cover"
            useNativeControls
            shouldPlay={false}
            isLooping={false}
          />
        </View>
      )}

      {!!sharedUrl && (
        <Pressable
          onPress={
            handleSharedLinkPress
          }
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 13,
            paddingVertical: 12,
            backgroundColor: pressed
              ? "rgba(79, 99, 59, 0.10)"
              : "rgba(79, 99, 59, 0.06)",
            borderTopWidth: 1,
            borderTopColor:
              "rgba(79, 99, 59, 0.12)",
          })}
        >
          <Ionicons
            name="link-outline"
            size={17}
            color="#4F633B"
          />

          <View
            style={{
              flex: 1,
              marginLeft: 8,
            }}
          >
            {!!sharedPost
              ?.link_title && (
              <Text
                numberOfLines={1}
                style={{
                  color:
                    "#1F2933",
                  fontSize: 12.5,
                  fontWeight:
                    "900",
                }}
              >
                {
                  sharedPost.link_title
                }
              </Text>
            )}

            <Text
              numberOfLines={1}
              style={{
                color: "#6B7280",
                fontSize: 11,
                fontWeight: "700",
                marginTop:
                  sharedPost
                    ?.link_title
                    ? 2
                    : 0,
              }}
            >
              {getDomainFromUrl(
                sharedUrl
              ) || "Open link"}
            </Text>
          </View>

          <Ionicons
            name="open-outline"
            size={16}
            color="#B45309"
          />
        </Pressable>
      )}
    </View>
  );
}

export default function PostCard({
  post,
  currentUserId,
  author, // { id, name, avatarUrl, isAnonymous, isOwner }
  onPressAvatar, // (userId) => void
  onPressOriginalPost,
  onPressOriginalAuthor,
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
  const [mediaAspectRatio, setMediaAspectRatio] = useState(null);

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

  const reactions =
    Array.isArray(post?.reactions)
      ? post.reactions
      : [];

  const reactionCounts =
    reactions.reduce(
      (counts, reaction) => {
        const type =
          reaction?.type;

        if (!type) {
          return counts;
        }

        counts[type] =
          (counts[type] || 0) + 1;

        return counts;
      },
      {}
    );

  const totalReactions =
    reactions.length;

  const userReaction =
    currentUserId
      ? reactions.find(
          (reaction) =>
            reaction.user_id ===
            currentUserId
        ) || null
      : null;

  const selectedReaction =
    getPostReactionMeta(
      userReaction?.type
    );

  const visibleReactionTypes =
    POST_REACTIONS.filter(
      (reaction) =>
        reactionCounts[
          reaction.type
        ] > 0
    ).slice(0, 3);

  const createdLabel = post?.created_at
    ? new Date(post.created_at).toLocaleString()
    : "";

  const isImage =
    post?.media_url &&
    post?.media_type &&
    String(post.media_type).startsWith("image");

  const isVideo =
    post?.media_url &&
    post?.media_type &&
    String(post.media_type).startsWith("video");

  const isFormationShare = post?.media_type === "formation_share";

  function updateMediaAspectRatio(width, height) {
    const w = Number(width);
    const h = Number(height);

    if (!w || !h || w <= 0 || h <= 0) return;

    const ratio = w / h;

    // Keep very unusual/broken metadata from creating unusable layouts.
    // 0.45 is tall portrait, 2.2 is wide landscape.
    const safeRatio = Math.min(Math.max(ratio, 0.45), 2.2);

    setMediaAspectRatio(safeRatio);
  }

  const displayAspectRatio = mediaAspectRatio || (isVideo ? 9 / 16 : 1);

  const formationTitle = post?.link_title || "Daily Formation";
  const formationDescription =
    post?.link_description || "Formation practice shared today.";

  const who = author?.name || "Member on Triunely";
  const avatarUrl = author?.avatarUrl || null;
  const initials = (who || "T").slice(0, 1).toUpperCase();
  const isOwner = !!author?.isOwner;

  const canPressAvatar =
    typeof onPressAvatar === "function" && !author?.isAnonymous && !!author?.id;

  const socialRight =
    Number(post?.comment_count || 0) > 0
      ? `${post.comment_count} comment${
          post.comment_count === 1
            ? ""
            : "s"
        }`
      : "";

  function handlePrimaryReactionPress() {
    /*
     * No reaction:
     * quickly apply Like.
     *
     * Existing reaction:
     * tapping the same reaction toggles
     * it off through Community's
     * existing setReaction function.
     */
    onSetReaction?.(
      post.id,
      selectedReaction?.type ||
        "like"
    );
  }

  function toggleReactionPicker() {
    setReactionPickerForPost?.(
      reactionPickerForPost ===
        post.id
        ? null
        : post.id
    );
  }

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
          <Pressable
            disabled={!canPressAvatar}
            onPress={() => onPressAvatar?.(author?.id)}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.colors.surfaceAlt,
              borderWidth: 1,
              borderColor: theme.colors.divider,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              opacity: !canPressAvatar ? 1 : pressed ? 0.75 : 1,
            })}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={{ width: 40, height: 40 }} />
            ) : (
              <Text style={{ color: theme.colors.text2, fontWeight: "900" }}>
                {initials}
              </Text>
            )}
          </Pressable>

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

      {isFormationShare && (
        <View
          style={{
            marginTop: 12,
            borderRadius: 22,
            overflow: "hidden",
            backgroundColor: "#FFFCF5",
            borderWidth: 1,
            borderColor: "rgba(180, 83, 9, 0.18)",
            shadowColor: "rgba(15, 23, 42, 0.10)",
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 5 },
            elevation: 2,
          }}
        >
          <View
            style={{
              padding: 15,
              backgroundColor: "rgba(180, 83, 9, 0.08)",
              borderBottomWidth: 1,
              borderBottomColor: "rgba(180, 83, 9, 0.14)",
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
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "rgba(180, 83, 9, 0.20)",
                }}
              >
                <Ionicons name="leaf-outline" size={22} color="#B45309" />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: "#7C2D12",
                    fontSize: 12,
                    fontWeight: "900",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Daily Formation
                </Text>

                <Text
                  style={{
                    color: "#1F2933",
                    marginTop: 3,
                    fontSize: 18,
                    lineHeight: 22,
                    fontWeight: "900",
                  }}
                >
                  {formationTitle}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ padding: 15 }}>
            <View
              style={{
                alignSelf: "flex-start",
                paddingHorizontal: 11,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: "rgba(79, 99, 59, 0.10)",
                borderWidth: 1,
                borderColor: "rgba(79, 99, 59, 0.18)",
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Ionicons name="checkmark-circle-outline" size={15} color="#4F633B" />

              <Text
                style={{
                  color: "#4F633B",
                  fontSize: 12,
                  fontWeight: "900",
                }}
              >
                {formationDescription}
              </Text>
            </View>

            <View
              style={{
                marginTop: 14,
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {["Scripture", "Prayer", "Obedience", "Service", "Renunciation"].map(
                (label) => (
                  <View
                    key={label}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor: "#FFFFFF",
                      borderWidth: 1,
                      borderColor: "rgba(15, 23, 42, 0.08)",
                    }}
                  >
                    <Text
                      style={{
                        color: "#6B7280",
                        fontSize: 11,
                        fontWeight: "800",
                      }}
                    >
                      {label}
                    </Text>
                  </View>
                )
              )}
            </View>

            {!!post?.content ? (
              <Text
                style={{
                  color: "#1F2933",
                  marginTop: 15,
                  fontSize: 15,
                  lineHeight: 22,
                  fontWeight: "600",
                }}
              >
                {post.content}
              </Text>
            ) : null}

            <View
              style={{
                marginTop: 15,
                paddingTop: 13,
                borderTopWidth: 1,
                borderTopColor: "rgba(15, 23, 42, 0.08)",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Ionicons name="people-outline" size={16} color="#4F633B" />

              <Text
                style={{
                  color: "#6B7280",
                  marginLeft: 7,
                  fontSize: 12,
                  fontWeight: "800",
                }}
              >
                Shared for fellowship encouragement
              </Text>
            </View>
          </View>
        </View>
      )}

      {!isFormationShare &&
        !!post?.content && (
          <Text
            style={{
              color:
                theme.colors.text,
              marginTop: 10,
              fontSize: 15,
              lineHeight: 21,
              fontWeight: "500",
            }}
          >
            {post.content}
          </Text>
        )}

      {!!post?.shared_post_id && (
        <SharedPostPreview
          sharedPost={
            post?.shared_post
          }
          onPressOriginalPost={() =>
            onPressOriginalPost?.(
              post.shared_post
            )
          }
          onPressOriginalAuthor={() =>
            onPressOriginalAuthor?.(
              post.shared_post
            )
          }
        />
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
            style={{
              width: "100%",
              aspectRatio: displayAspectRatio,
              backgroundColor: theme.colors.surfaceAlt,
            }}
            resizeMode="cover"
            onLoad={(event) => {
              const source = event?.nativeEvent?.source;

              updateMediaAspectRatio(source?.width, source?.height);
            }}
          />
        </View>
      )}

      {isVideo && (
        <View
          style={{
            marginTop: 10,
            borderRadius: 14,
            overflow: "hidden",
            width: "100%",
            backgroundColor: "#000",
            borderWidth: 1,
            borderColor: theme.colors.divider,
          }}
        >
          <Video
            source={{ uri: post.media_url }}
            style={{
              width: "100%",
              aspectRatio: displayAspectRatio,
              backgroundColor: "#000",
            }}
            useNativeControls
            resizeMode="cover"
            shouldPlay={false}
            isLooping={false}
            onReadyForDisplay={(event) => {
              const naturalSize = event?.naturalSize;

              updateMediaAspectRatio(
                naturalSize?.width,
                naturalSize?.height
              );
            }}
            onError={(e) => {
              console.log("PostCard video playback error:", {
                error: e,
                mediaUrl: post?.media_url,
                mediaType: post?.media_type,
                postId: post?.id,
              });
            }}
            onLoad={() => {
              console.log("PostCard video loaded:", {
                mediaUrl: post?.media_url,
                mediaType: post?.media_type,
                postId: post?.id,
              });
            }}
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

      {(totalReactions > 0 || socialRight) ? (
        <View
          style={{
            marginTop: 13,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: "rgba(15, 23, 42, 0.08)",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            {visibleReactionTypes.length > 0 ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginRight: 6,
                }}
              >
                {visibleReactionTypes.map((reaction, index) => (
                  <View
                    key={reaction.type}
                    style={{
                      width: 25,
                      height: 25,
                      borderRadius: 13,
                      marginLeft: index === 0 ? 0 : -6,
                      backgroundColor: "#FFFCF5",
                      borderWidth: 1.5,
                      borderColor: "#FFFFFF",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: visibleReactionTypes.length - index,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                      }}
                    >
                      {reaction.emoji}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {totalReactions > 0 ? (
              <Text
                style={{
                  color: "#6B7280",
                  fontSize: 12,
                  fontWeight: "800",
                }}
              >
                {totalReactions}
              </Text>
            ) : null}
          </View>

          {socialRight ? (
            <Pressable
              onPress={() => onOpenComments?.(post)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.68 : 1,
              })}
            >
              <Text
                style={{
                  color: "#6B7280",
                  fontSize: 12,
                  fontWeight: "800",
                }}
              >
                {socialRight}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View
        style={{
          marginTop: 9,
          padding: 4,
          borderRadius: 19,
          backgroundColor: "#FFFCF5",
          borderWidth: 1,
          borderColor: "rgba(79, 99, 59, 0.15)",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <FeedActionButton
          icon={selectedReaction ? undefined : "thumbs-up-outline"}
          emoji={selectedReaction?.emoji}
          label={selectedReaction?.label || "React"}
          active={Boolean(selectedReaction)}
          onPress={handlePrimaryReactionPress}
          onLongPress={toggleReactionPicker}
        />

        <View
          style={{
            width: 1,
            height: 25,
            backgroundColor: "rgba(79, 99, 59, 0.14)",
          }}
        />

        <FeedActionButton
          icon="chatbubble-ellipses-outline"
          label="Comment"
          onPress={() => onOpenComments?.(post)}
        />

        <View
          style={{
            width: 1,
            height: 25,
            backgroundColor: "rgba(79, 99, 59, 0.14)",
          }}
        />

        <FeedActionButton
          icon="arrow-redo-outline"
          label="Share"
          disabled={typeof onShare !== "function"}
          onPress={() => onShare?.(post)}
        />
      </View>

      {reactionPickerForPost === post.id ? (
        <View
          style={{
            marginTop: 9,
            alignSelf: "flex-start",
            borderRadius: 22,
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "rgba(79, 99, 59, 0.18)",
            paddingHorizontal: 7,
            paddingVertical: 7,
            flexDirection: "row",
            alignItems: "center",
            shadowColor: "rgba(15, 23, 42, 0.12)",
            shadowOpacity: 0.14,
            shadowRadius: 10,
            shadowOffset: {
              width: 0,
              height: 4,
            },
            elevation: 5,
          }}
        >
          {POST_REACTIONS.map((reaction) => {
            const isSelected =
              userReaction?.type === reaction.type;

            return (
              <Pressable
                key={reaction.type}
                onPress={() =>
                  onSetReaction?.(
                    post.id,
                    reaction.type
                  )
                }
                accessibilityLabel={reaction.label}
                style={({ pressed }) => ({
                  width: 43,
                  height: 43,
                  borderRadius: 16,
                  marginHorizontal: 2,
                  backgroundColor: isSelected
                    ? "rgba(180, 83, 9, 0.12)"
                    : pressed
                      ? "rgba(79, 99, 59, 0.10)"
                      : "transparent",
                  borderWidth: isSelected ? 1 : 0,
                  borderColor:
                    "rgba(180, 83, 9, 0.25)",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: [
                    {
                      scale: pressed
                        ? 1.12
                        : isSelected
                          ? 1.06
                          : 1,
                    },
                  ],
                })}
              >
                <Text
                  style={{
                    fontSize: 23,
                    lineHeight: 28,
                  }}
                >
                  {reaction.emoji}
                </Text>
              </Pressable>
            );
          })}

          <Pressable
            onPress={() =>
              setReactionPickerForPost?.(null)
            }
            hitSlop={7}
            style={({ pressed }) => ({
              width: 33,
              height: 33,
              borderRadius: 12,
              marginLeft: 4,
              backgroundColor: pressed
                ? "rgba(79, 99, 59, 0.10)"
                : "#FFFCF5",
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <Ionicons
              name="close"
              size={17}
              color="#4F633B"
            />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}