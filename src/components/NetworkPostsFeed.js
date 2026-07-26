// C:\triunely\src\components\NetworkPostsFeed.js

import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import {
    useFocusEffect,
    useNavigation,
} from "@react-navigation/native";
import * as ScreenOrientation from "expo-screen-orientation";
import {
    useVideoPlayer,
    VideoView,
} from "expo-video";
import * as VideoThumbnails from "expo-video-thumbnails";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Image,
    Modal,
    Platform,
    Pressable,
    Text,
    useWindowDimensions,
    View,
} from "react-native";

import { supabase } from "../lib/supabase";
import NetworkImageFullscreenViewer from "./NetworkImageFullscreenViewer";
import NetworkPostActionsSheet from "./NetworkPostActionsSheet";
import NetworkPostCommentsSheet from "./NetworkPostCommentsSheet";
import NetworkPostDeleteConfirmSheet from "./NetworkPostDeleteConfirmSheet";
import NetworkPostInteractionBar from "./NetworkPostInteractionBar";

const SURFACE = "#FFFFFF";
const HEAVENLY_GOLD = "#B45309";
const EVENT_BROWN = "#7C2D12";
const DEEP_OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";
const DANGER = "#B91C1C";

const SOFT_GOLD_BG =
  "rgba(180, 83, 9, 0.10)";
const GOLD_BORDER =
  "rgba(180, 83, 9, 0.18)";
const SOFT_OLIVE_BG =
  "rgba(79, 99, 59, 0.10)";
const OLIVE_BORDER =
  "rgba(79, 99, 59, 0.18)";
const SOFT_DANGER_BG =
  "rgba(185, 28, 28, 0.08)";
const DANGER_BORDER =
  "rgba(185, 28, 28, 0.17)";
const CARD_BORDER =
  "rgba(15, 23, 42, 0.08)";
const SHADOW =
  "rgba(15, 23, 42, 0.10)";

const displayFont =
  Platform.OS === "ios"
    ? "Georgia"
    : "serif";

const premiumCardStyle = {
  backgroundColor: SURFACE,
  borderRadius: 22,
  borderWidth: 1,
  borderColor: CARD_BORDER,
  shadowColor: SHADOW,
  shadowOpacity: 0.09,
  shadowRadius: 12,
  shadowOffset: {
    width: 0,
    height: 5,
  },
  elevation: 3,
};

function getInitials(name) {
  return String(
    name || "Triunely member"
  )
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase()
    )
    .join("");
}

function formatPostDate(value) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const now =
    new Date();

  const difference =
    now.getTime() -
    date.getTime();

  const minutes =
    Math.floor(
      difference / 60000
    );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return `${hours}h`;
  }

  const days =
    Math.floor(
      hours / 24
    );

  if (days < 7) {
    return `${days}d`;
  }

  return date.toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
      year:
        date.getFullYear() !==
        now.getFullYear()
          ? "numeric"
          : undefined,
    }
  );
}

function SectionHeader({
  networkUuid,
  networkName,
  canManage,
}) {
  const navigation =
    useNavigation();

  return (
    <View
      style={{
        marginBottom: 15,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems:
            "flex-start",
          justifyContent:
            "space-between",
        }}
      >
        <View
          style={{
            flex: 1,
            paddingRight: 12,
          }}
        >
          <Text
            style={{
              fontFamily:
                displayFont,
              color: TEXT,
              fontSize: 22,
              lineHeight: 27,
              fontWeight: "900",
              letterSpacing: -0.45,
            }}
          >
            Network Posts
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 12.5,
              fontWeight: "700",
              lineHeight: 18,
              marginTop: 4,
            }}
          >
            Updates, announcements and
            conversations shared with
            this Network.
          </Text>
        </View>

        {canManage ? (
          <Pressable
            onPress={() =>
              navigation.navigate(
                "NetworkPostsAdmin",
                {
                  networkUuid,
                  networkName,
                }
              )
            }
            style={({ pressed }) => ({
              minHeight: 38,
              borderRadius: 999,
              paddingHorizontal: 11,
              flexDirection: "row",
              alignItems: "center",
              justifyContent:
                "center",
              backgroundColor:
                pressed
                  ? SOFT_OLIVE_BG
                  : SURFACE,
              borderWidth: 1,
              borderColor:
                OLIVE_BORDER,
            })}
          >
            <Ionicons
              name="settings-outline"
              size={15}
              color={DEEP_OLIVE}
            />

            <Text
              style={{
                color: DEEP_OLIVE,
                fontSize: 11.5,
                fontWeight: "900",
                marginLeft: 5,
              }}
            >
              Manage
            </Text>
          </Pressable>
        ) : null}
      </View>

      {canManage ? (
        <View
          style={{
            flexDirection: "row",
            gap: 10,
            marginTop: 14,
          }}
        >
          <Pressable
            onPress={() =>
              navigation.navigate(
                "NetworkPostComposer",
                {
                  networkUuid,
                  networkName,
                  initialPostType:
                    "post",
                }
              )
            }
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 48,
              borderRadius: 16,
              borderWidth: 1,
              borderColor:
                OLIVE_BORDER,
              backgroundColor:
                pressed
                  ? SOFT_OLIVE_BG
                  : SURFACE,
              flexDirection: "row",
              alignItems: "center",
              justifyContent:
                "center",
            })}
          >
            <Ionicons
              name="create-outline"
              size={18}
              color={DEEP_OLIVE}
            />

            <Text
              style={{
                color: DEEP_OLIVE,
                fontSize: 12,
                fontWeight: "900",
                marginLeft: 7,
              }}
            >
              Create Post
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              navigation.navigate(
                "NetworkPostComposer",
                {
                  networkUuid,
                  networkName,
                  initialPostType:
                    "announcement",
                }
              )
            }
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 48,
              borderRadius: 16,
              borderWidth: 1,
              borderColor:
                GOLD_BORDER,
              backgroundColor:
                pressed
                  ? "rgba(180, 83, 9, 0.15)"
                  : SOFT_GOLD_BG,
              flexDirection: "row",
              alignItems: "center",
              justifyContent:
                "center",
            })}
          >
            <Ionicons
              name="megaphone-outline"
              size={18}
              color={HEAVENLY_GOLD}
            />

            <Text
              style={{
                color: EVENT_BROWN,
                fontSize: 12,
                fontWeight: "900",
                marginLeft: 7,
              }}
            >
              Announcement
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function NaturalImage({
  uri,
}) {
  const window =
    useWindowDimensions();

  const [
    dimensions,
    setDimensions,
  ] = useState(null);

  const [
    fullscreenVisible,
    setFullscreenVisible,
  ] = useState(false);

  useEffect(() => {
    let active = true;

    if (!uri) {
      setDimensions(null);
      return undefined;
    }

    Image.getSize(
      uri,
      (width, height) => {
        if (
          active &&
          width > 0 &&
          height > 0
        ) {
          setDimensions({
            width,
            height,
          });
        }
      },
      (error) => {
        console.log(
          "NETWORK FEED IMAGE SIZE ERROR:",
          error
        );

        if (active) {
          setDimensions(null);
        }
      }
    );

    return () => {
      active = false;
    };
  }, [uri]);

  const availableWidth =
    Math.max(
      window.width - 64,
      240
    );

  const ratio =
    dimensions?.width &&
    dimensions?.height
      ? dimensions.width /
        dimensions.height
      : 4 / 3;

  const naturalHeight =
    availableWidth / ratio;

  const displayHeight =
    Math.min(
      Math.max(
        naturalHeight,
        180
      ),
      Math.max(
        window.height * 0.72,
        420
      )
    );

  return (
    <>
      <Pressable
        onPress={() =>
          setFullscreenVisible(true)
        }
        accessibilityRole="imagebutton"
        accessibilityLabel="Open image fullscreen"
        style={({ pressed }) => ({
          width: "100%",
          minHeight:
            displayHeight,
          maxHeight:
            displayHeight,
          backgroundColor:
            "#11150F",
          alignItems: "center",
          justifyContent:
            "center",
          opacity:
            pressed
              ? 0.9
              : 1,
        })}
      >
        <Image
          source={{
            uri,
          }}
          resizeMode="contain"
          style={{
            width: "100%",
            height:
              displayHeight,
          }}
        />

        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            right: 11,
            bottom: 11,
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor:
              "rgba(0,0,0,0.66)",
            borderWidth: 1,
            borderColor:
              "rgba(255,255,255,0.20)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name="expand-outline"
            size={20}
            color="#FFFFFF"
          />
        </View>
      </Pressable>

      <NetworkImageFullscreenViewer
        visible={
          fullscreenVisible
        }
        imageUrl={uri}
        onClose={() =>
          setFullscreenVisible(false)
        }
      />
    </>
  );
}

function NetworkFullscreenVideoPlayer({
  uri,
  visible,
  onClose,
}) {
  const videoViewRef =
    useRef(null);

  const previousOrientationLockRef =
    useRef(null);

  const player =
    useVideoPlayer(
      {
        uri,
        useCaching: false,
      },
      (videoPlayer) => {
        videoPlayer.loop = true;

        videoPlayer.bufferOptions = {
          maxBufferBytes:
            12 * 1024 * 1024,
          preferredForwardBufferDuration:
            8,
          minBufferForPlayback:
            1.5,
        };

        videoPlayer.play();
      }
    );

  const allowAllOrientations =
    useCallback(async () => {
      try {
        const currentLock =
          await ScreenOrientation
            .getOrientationLockAsync();

        previousOrientationLockRef.current =
          currentLock;

        const supportsAll =
          await ScreenOrientation
            .supportsOrientationLockAsync(
              ScreenOrientation
                .OrientationLock
                .ALL
            );

        if (supportsAll) {
          await ScreenOrientation
            .lockAsync(
              ScreenOrientation
                .OrientationLock
                .ALL
            );
        } else {
          await ScreenOrientation
            .unlockAsync();
        }
      } catch (error) {
        console.log(
          "NETWORK VIDEO ORIENTATION ENABLE ERROR:",
          error
        );
      }
    }, []);

  const restoreOrientation =
    useCallback(async () => {
      const previousLock =
        previousOrientationLockRef.current;

      previousOrientationLockRef.current =
        null;

      try {
        if (
          previousLock !== null &&
          previousLock !== undefined &&
          previousLock !==
            ScreenOrientation
              .OrientationLock
              .UNKNOWN &&
          previousLock !==
            ScreenOrientation
              .OrientationLock
              .OTHER
        ) {
          await ScreenOrientation
            .lockAsync(previousLock);
        } else {
          await ScreenOrientation
            .lockAsync(
              ScreenOrientation
                .OrientationLock
                .DEFAULT
            );
        }
      } catch (error) {
        console.log(
          "NETWORK VIDEO ORIENTATION RESTORE ERROR:",
          error
        );
      }
    }, []);

  const closePlayer =
    useCallback(async () => {
      try {
        player.pause();
      } catch (error) {
        console.log(
          "NETWORK VIDEO PAUSE ERROR:",
          error
        );
      }

      await restoreOrientation();
      onClose();
    }, [
      onClose,
      player,
      restoreOrientation,
    ]);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    allowAllOrientations();

    const timer =
      setTimeout(() => {
        videoViewRef.current
          ?.enterFullscreen()
          .catch((error) => {
            console.log(
              "NETWORK VIDEO ENTER FULLSCREEN ERROR:",
              error
            );
          });
      }, 180);

    return () => {
      clearTimeout(timer);
    };
  }, [
    allowAllOrientations,
    visible,
  ]);

  useEffect(() => {
    return () => {
      restoreOrientation();
    };
  }, [restoreOrientation]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={closePlayer}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "#000000",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <VideoView
          ref={videoViewRef}
          player={player}
          nativeControls
          contentFit="contain"
          surfaceType="surfaceView"
          style={{
            width: "100%",
            height: "100%",
            backgroundColor:
              "#000000",
          }}
          onFullscreenExit={
            closePlayer
          }
        />

        <Pressable
          onPress={closePlayer}
          hitSlop={12}
          style={({ pressed }) => ({
            position: "absolute",
            top:
              Platform.OS === "android"
                ? 34
                : 52,
            right: 18,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor:
              pressed
                ? "rgba(255,255,255,0.30)"
                : "rgba(0,0,0,0.64)",
            borderWidth: 1,
            borderColor:
              "rgba(255,255,255,0.25)",
            alignItems: "center",
            justifyContent: "center",
          })}
        >
          <Ionicons
            name="close"
            size={25}
            color="#FFFFFF"
          />
        </Pressable>
      </View>
    </Modal>
  );
}

function NaturalVideo({
  uri,
  thumbnailUrl,
}) {
  const window =
    useWindowDimensions();

  const [
    generatedThumbnail,
    setGeneratedThumbnail,
  ] = useState(null);

  const [
    thumbnailDimensions,
    setThumbnailDimensions,
  ] = useState(null);

  const [
    preparingThumbnail,
    setPreparingThumbnail,
  ] = useState(
    !Boolean(thumbnailUrl)
  );

  const [
    playerVisible,
    setPlayerVisible,
  ] = useState(false);

  useEffect(() => {
    let active = true;

    if (!uri || thumbnailUrl) {
      setGeneratedThumbnail(null);
      setPreparingThumbnail(false);
      return undefined;
    }

    async function createThumbnail() {
      try {
        setPreparingThumbnail(true);

        const result =
          await VideoThumbnails
            .getThumbnailAsync(
              uri,
              {
                time: 300,
                quality: 0.45,
              }
            );

        if (!active) {
          return;
        }

        setGeneratedThumbnail(
          result?.uri || null
        );

        if (
          Number(result?.width) > 0 &&
          Number(result?.height) > 0
        ) {
          setThumbnailDimensions({
            width:
              Number(result.width),
            height:
              Number(result.height),
          });
        }
      } catch (error) {
        console.log(
          "NETWORK FEED VIDEO THUMBNAIL ERROR:",
          error
        );

        if (active) {
          setGeneratedThumbnail(null);
        }
      } finally {
        if (active) {
          setPreparingThumbnail(false);
        }
      }
    }

    createThumbnail();

    return () => {
      active = false;
    };
  }, [
    thumbnailUrl,
    uri,
  ]);

  useEffect(() => {
    let active = true;

    if (!thumbnailUrl) {
      return undefined;
    }

    Image.getSize(
      thumbnailUrl,
      (width, height) => {
        if (
          active &&
          width > 0 &&
          height > 0
        ) {
          setThumbnailDimensions({
            width,
            height,
          });
        }
      },
      () => {
        if (active) {
          setThumbnailDimensions(null);
        }
      }
    );

    return () => {
      active = false;
    };
  }, [thumbnailUrl]);

  const availableWidth =
    Math.max(
      window.width - 64,
      240
    );

  const ratio =
    thumbnailDimensions?.width &&
    thumbnailDimensions?.height
      ? thumbnailDimensions.width /
        thumbnailDimensions.height
      : 16 / 9;

  const calculatedHeight =
    availableWidth / ratio;

  const displayHeight =
    Math.min(
      Math.max(
        calculatedHeight,
        190
      ),
      Math.max(
        window.height * 0.72,
        420
      )
    );

  const previewUri =
    thumbnailUrl ||
    generatedThumbnail;

  return (
    <>
      <Pressable
        onPress={() =>
          setPlayerVisible(true)
        }
        accessibilityRole="button"
        accessibilityLabel="Play video fullscreen"
        style={({ pressed }) => ({
          width: "100%",
          height: displayHeight,
          backgroundColor:
            "#11150F",
          alignItems: "center",
          justifyContent: "center",
          opacity:
            pressed
              ? 0.92
              : 1,
        })}
      >
        {previewUri ? (
          <Image
            source={{
              uri: previewUri,
            }}
            resizeMode="contain"
            style={{
              width: "100%",
              height: displayHeight,
            }}
          />
        ) : null}

        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor:
              previewUri
                ? "rgba(0,0,0,0.20)"
                : "rgba(17,21,15,0.92)",
          }}
        >
          {preparingThumbnail ? (
            <>
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />

              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 11.5,
                  fontWeight: "800",
                  marginTop: 9,
                }}
              >
                Preparing video…
              </Text>
            </>
          ) : (
            <>
              <View
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: 31,
                  backgroundColor:
                    "rgba(255,255,255,0.95)",
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#000000",
                  shadowOpacity: 0.24,
                  shadowRadius: 10,
                  shadowOffset: {
                    width: 0,
                    height: 4,
                  },
                  elevation: 5,
                }}
              >
                <Ionicons
                  name="play"
                  size={29}
                  color={
                    HEAVENLY_GOLD
                  }
                  style={{
                    marginLeft: 4,
                  }}
                />
              </View>

              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 11.5,
                  fontWeight: "900",
                  marginTop: 10,
                }}
              >
                Play video
              </Text>
            </>
          )}
        </View>
      </Pressable>

      {playerVisible ? (
        <NetworkFullscreenVideoPlayer
          uri={uri}
          visible={
            playerVisible
          }
          onClose={() =>
            setPlayerVisible(false)
          }
        />
      ) : null}
    </>
  );
}

function NetworkPostCard({
  post,
  canOpenActions,
  onOpenActions,
  reactionBusy,
  onReact,
  onComment,
  onShare,
}) {
  const isAnnouncement =
    post?.post_type ===
    "announcement";

  const authorName =
    post?.author_display_name ||
    "Triunely member";

  const authorHandle =
    post?.author_handle
      ? `@${post.author_handle}`
      : "";

  const mediaType =
    String(
      post?.media_type || ""
    ).toLowerCase();

  const hasImage =
    Boolean(post?.media_url) &&
    (
      mediaType === "image" ||
      mediaType.startsWith(
        "image/"
      )
    );

  const hasVideo =
    Boolean(post?.media_url) &&
    (
      mediaType === "video" ||
      mediaType.startsWith(
        "video/"
      )
    );

  return (
    <View
      style={{
        ...premiumCardStyle,
        paddingTop: 15,
        marginBottom: 14,
        overflow: "hidden",
        borderColor:
          isAnnouncement
            ? GOLD_BORDER
            : CARD_BORDER,
      }}
    >
      {post?.is_pinned ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingBottom: 10,
          }}
        >
          <FontAwesome6
            name="thumbtack"
            size={12}
            color={HEAVENLY_GOLD}
          />

          <Text
            style={{
              color: EVENT_BROWN,
              fontSize: 10.5,
              fontWeight: "900",
              marginLeft: 6,
              textTransform:
                "uppercase",
              letterSpacing: 0.35,
            }}
          >
            Pinned by Network leadership
          </Text>
        </View>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          alignItems:
            "flex-start",
          paddingHorizontal: 16,
        }}
      >
        <View
          style={{
            width: 45,
            height: 45,
            borderRadius: 22.5,
            overflow: "hidden",
            backgroundColor:
              isAnnouncement
                ? SOFT_GOLD_BG
                : SOFT_OLIVE_BG,
            borderWidth: 1,
            borderColor:
              isAnnouncement
                ? GOLD_BORDER
                : OLIVE_BORDER,
            alignItems: "center",
            justifyContent:
              "center",
            marginRight: 11,
          }}
        >
          {post?.author_avatar_url ? (
            <Image
              source={{
                uri:
                  post.author_avatar_url,
              }}
              resizeMode="cover"
              style={{
                width: "100%",
                height: "100%",
              }}
            />
          ) : (
            <Text
              style={{
                color:
                  isAnnouncement
                    ? HEAVENLY_GOLD
                    : DEEP_OLIVE,
                fontSize: 13,
                fontWeight: "900",
              }}
            >
              {getInitials(
                authorName
              )}
            </Text>
          )}
        </View>

        <View
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Text
              style={{
                color: TEXT,
                fontSize: 13.5,
                fontWeight: "900",
              }}
              numberOfLines={1}
            >
              {authorName}
            </Text>

            {authorHandle ? (
              <Text
                style={{
                  color: MUTED,
                  fontSize: 11.5,
                  fontWeight: "700",
                  marginLeft: 6,
                }}
                numberOfLines={1}
              >
                {authorHandle}
              </Text>
            ) : null}
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flexWrap: "wrap",
              marginTop: 4,
            }}
          >
            <Text
              style={{
                color: MUTED,
                fontSize: 10.5,
                fontWeight: "800",
              }}
            >
              {formatPostDate(
                post?.published_at ||
                  post?.created_at
              )}
            </Text>

            {post?.edited_at ? (
              <Text
                style={{
                  color: MUTED,
                  fontSize: 10.5,
                  fontWeight: "800",
                  marginLeft: 7,
                }}
              >
                Edited
              </Text>
            ) : null}
          </View>
        </View>

        {isAnnouncement ? (
          <View
            style={{
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 5,
              backgroundColor:
                SOFT_GOLD_BG,
              borderWidth: 1,
              borderColor:
                GOLD_BORDER,
              flexDirection: "row",
              alignItems: "center",
              marginLeft: 8,
            }}
          >
            <Ionicons
              name="megaphone-outline"
              size={12}
              color={HEAVENLY_GOLD}
            />

            <Text
              style={{
                color: EVENT_BROWN,
                fontSize: 9,
                fontWeight: "900",
                marginLeft: 4,
                textTransform:
                  "uppercase",
                letterSpacing: 0.25,
              }}
            >
              Announcement
            </Text>
          </View>
        ) : null}

        {canOpenActions ? (
          <Pressable
            onPress={() =>
              onOpenActions?.(post)
            }
            hitSlop={10}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent:
                "center",
              backgroundColor:
                pressed
                  ? SOFT_OLIVE_BG
                  : SURFACE,
              borderWidth: 1,
              borderColor:
                OLIVE_BORDER,
              marginLeft: 8,
            })}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={18}
              color={DEEP_OLIVE}
            />
          </Pressable>
        ) : null}
      </View>

      <View
        style={{
          paddingHorizontal: 16,
          paddingBottom:
            hasImage || hasVideo
              ? 14
              : 16,
        }}
      >
        {post?.title ? (
          <Text
            style={{
              fontFamily:
                displayFont,
              color: TEXT,
              fontSize:
                isAnnouncement
                  ? 21
                  : 18,
              lineHeight:
                isAnnouncement
                  ? 27
                  : 23,
              fontWeight: "900",
              marginTop: 14,
            }}
          >
            {post.title}
          </Text>
        ) : null}

        <Text
          style={{
            color: TEXT,
            fontSize: 14,
            fontWeight: "600",
            lineHeight: 21,
            marginTop:
              post?.title
                ? 8
                : 14,
          }}
        >
          {post?.body || ""}
        </Text>
      </View>

      {hasImage ? (
        <NaturalImage
          uri={post.media_url}
        />
      ) : null}

      {hasVideo ? (
        <NaturalVideo
          uri={post.media_url}
          thumbnailUrl={
            post.media_thumbnail_url
          }
        />
      ) : null}

      <NetworkPostInteractionBar
        post={post}
        reactionBusy={
          reactionBusy
        }
        onReact={onReact}
        onComment={onComment}
        onShare={onShare}
      />
    </View>
  );
}


function LoadingState() {
  return (
    <View
      style={{
        ...premiumCardStyle,
        minHeight: 180,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <ActivityIndicator
        size="small"
        color={HEAVENLY_GOLD}
      />

      <Text
        style={{
          fontFamily:
            displayFont,
          color: TEXT,
          fontSize: 17,
          fontWeight: "900",
          marginTop: 13,
        }}
      >
        Loading Network posts
      </Text>

      <Text
        style={{
          color: MUTED,
          fontSize: 12,
          fontWeight: "700",
          textAlign: "center",
          lineHeight: 18,
          marginTop: 5,
        }}
      >
        Preparing the latest updates and
        announcements.
      </Text>
    </View>
  );
}

function EmptyState({
  canManage,
  onCreate,
}) {
  return (
    <View
      style={{
        ...premiumCardStyle,
        minHeight: 220,
        alignItems: "center",
        justifyContent: "center",
        padding: 25,
      }}
    >
      <View
        style={{
          width: 62,
          height: 62,
          borderRadius: 31,
          backgroundColor:
            SOFT_OLIVE_BG,
          borderWidth: 1,
          borderColor:
            OLIVE_BORDER,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={28}
          color={DEEP_OLIVE}
        />
      </View>

      <Text
        style={{
          fontFamily:
            displayFont,
          color: TEXT,
          fontSize: 19,
          fontWeight: "900",
          textAlign: "center",
          marginTop: 14,
        }}
      >
        No Network posts yet
      </Text>

      <Text
        style={{
          color: MUTED,
          fontSize: 12.5,
          fontWeight: "700",
          textAlign: "center",
          lineHeight: 19,
          marginTop: 7,
        }}
      >
        {canManage
          ? "Share the first update or announcement with this Network."
          : "Network updates and announcements will appear here."}
      </Text>

      {canManage ? (
        <Pressable
          onPress={onCreate}
          style={({ pressed }) => ({
            minHeight: 44,
            borderRadius: 999,
            paddingHorizontal: 17,
            backgroundColor:
              pressed
                ? "#92400E"
                : HEAVENLY_GOLD,
            flexDirection: "row",
            alignItems: "center",
            justifyContent:
              "center",
            marginTop: 17,
          })}
        >
          <Ionicons
            name="create-outline"
            size={17}
            color={SURFACE}
          />

          <Text
            style={{
              color: SURFACE,
              fontSize: 12,
              fontWeight: "900",
              marginLeft: 6,
            }}
          >
            Create First Post
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ErrorState({
  message,
  onRetry,
}) {
  return (
    <View
      style={{
        ...premiumCardStyle,
        padding: 22,
        alignItems: "center",
        borderColor:
          DANGER_BORDER,
      }}
    >
      <View
        style={{
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor:
            SOFT_DANGER_BG,
          borderWidth: 1,
          borderColor:
            DANGER_BORDER,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name="cloud-offline-outline"
          size={27}
          color={DANGER}
        />
      </View>

      <Text
        style={{
          fontFamily:
            displayFont,
          color: TEXT,
          fontSize: 18,
          fontWeight: "900",
          textAlign: "center",
          marginTop: 13,
        }}
      >
        Posts could not be loaded
      </Text>

      <Text
        style={{
          color: MUTED,
          fontSize: 12.5,
          fontWeight: "700",
          lineHeight: 19,
          textAlign: "center",
          marginTop: 7,
        }}
      >
        {message}
      </Text>

      <Pressable
        onPress={onRetry}
        style={({ pressed }) => ({
          minHeight: 43,
          borderRadius: 999,
          paddingHorizontal: 17,
          backgroundColor:
            pressed
              ? SOFT_OLIVE_BG
              : SURFACE,
          borderWidth: 1,
          borderColor:
            OLIVE_BORDER,
          flexDirection: "row",
          alignItems: "center",
          justifyContent:
            "center",
          marginTop: 16,
        })}
      >
        <Ionicons
          name="refresh-outline"
          size={17}
          color={DEEP_OLIVE}
        />

        <Text
          style={{
            color: DEEP_OLIVE,
            fontSize: 12,
            fontWeight: "900",
            marginLeft: 6,
          }}
        >
          Try Again
        </Text>
      </Pressable>
    </View>
  );
}

function MembershipRequiredState() {
  return (
    <View
      style={{
        ...premiumCardStyle,
        minHeight: 210,
        padding: 24,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor:
            SOFT_GOLD_BG,
          borderWidth: 1,
          borderColor:
            GOLD_BORDER,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name="people-outline"
          size={27}
          color={HEAVENLY_GOLD}
        />
      </View>

      <Text
        style={{
          fontFamily:
            displayFont,
          color: TEXT,
          fontSize: 19,
          fontWeight: "900",
          textAlign: "center",
          marginTop: 14,
        }}
      >
        Join to view Network posts
      </Text>

      <Text
        style={{
          color: MUTED,
          fontSize: 12.5,
          fontWeight: "700",
          lineHeight: 19,
          textAlign: "center",
          marginTop: 7,
        }}
      >
        Network conversations and
        member announcements are
        available to joined members.
      </Text>
    </View>
  );
}

export default function NetworkPostsFeed({
  networkUuid,
  networkName,
  isJoined,
  canManage,
}) {
  const navigation =
    useNavigation();

  const [
    posts,
    setPosts,
  ] = useState([]);

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState(null);

  const [
    selectedPost,
    setSelectedPost,
  ] = useState(null);

  const [
    deleteTargetPost,
    setDeleteTargetPost,
  ] = useState(null);

  const [
    commentsTargetPost,
    setCommentsTargetPost,
  ] = useState(null);

  const [
    actionsBusy,
    setActionsBusy,
  ] = useState(false);

  const [
    reactionBusyPostId,
    setReactionBusyPostId,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadError,
    setLoadError,
  ] = useState("");

  const loadPosts =
    useCallback(
      async ({
        showLoader = true,
      } = {}) => {
        if (
          !networkUuid ||
          !isJoined
        ) {
          setPosts([]);
          setLoadError("");
          setLoading(false);
          return;
        }

        try {
          if (showLoader) {
            setLoading(true);
          }

          setLoadError("");

          const {
            data: sessionData,
            error: sessionError,
          } =
            await supabase.auth
              .getSession();

          if (sessionError) {
            throw sessionError;
          }

          const activeUserId =
            sessionData
              ?.session
              ?.user
              ?.id ||
            null;

          setCurrentUserId(
            activeUserId
          );

          const [
            feedResult,
            interactionResult,
          ] = await Promise.all([
            supabase.rpc(
              "get_network_feed_rpc",
              {
                target_network_uuid:
                  networkUuid,
                requested_limit:
                  20,
                requested_offset:
                  0,
              }
            ),

            supabase.rpc(
              "get_network_post_interactions_rpc",
              {
                target_network_uuid:
                  networkUuid,
              }
            ),
          ]);

          if (feedResult.error) {
            throw feedResult.error;
          }

          if (
            interactionResult.error
          ) {
            throw interactionResult.error;
          }

          const feedPosts =
            Array.isArray(
              feedResult.data
            )
              ? feedResult.data
              : [];

          const interactions =
            Array.isArray(
              interactionResult.data
            )
              ? interactionResult.data
              : [];

          const interactionMap =
            new Map(
              interactions.map(
                (interaction) => [
                  interaction.post_id,
                  interaction,
                ]
              )
            );

          setPosts(
            feedPosts.map(
              (post) => ({
                ...post,
                reaction_count: 0,
                reaction_counts: {},
                viewer_reaction:
                  null,
                comment_count: 0,
                ...interactionMap.get(
                  post.id
                ),
              })
            )
          );
        } catch (error) {
          console.log(
            "NETWORK FEED LOAD ERROR:",
            error
          );

          setLoadError(
            error?.message ||
              "Triunely could not load this Network feed."
          );

          setPosts([]);
        } finally {
          setLoading(false);
        }
      },
      [
        isJoined,
        networkUuid,
      ]
    );

  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [loadPosts])
  );

  const orderedPosts =
    useMemo(
      () =>
        Array.isArray(posts)
          ? posts
          : [],
      [posts]
    );

  const selectedPostIsMine =
    Boolean(
      selectedPost &&
      currentUserId &&
      selectedPost
        .author_user_id ===
        currentUserId
    );

  async function handleReaction(
    post,
    reactionType
  ) {
    if (
      !post?.id ||
      !reactionType ||
      reactionBusyPostId
    ) {
      return;
    }

    try {
      setReactionBusyPostId(
        post.id
      );

      const {
        data,
        error,
      } =
        await supabase.rpc(
          "toggle_network_post_reaction_rpc",
          {
            target_post_id:
              post.id,
            requested_reaction_type:
              reactionType,
          }
        );

      if (error) {
        throw error;
      }

      const result =
        Array.isArray(data)
          ? data[0]
          : data;

      if (!result) {
        return;
      }

      setPosts(
        (currentPosts) =>
          currentPosts.map(
            (currentPost) =>
              currentPost.id ===
              post.id
                ? {
                    ...currentPost,
                    viewer_reaction:
                      result.viewer_reaction ||
                      null,
                    reaction_count:
                      Number(
                        result.reaction_count ||
                          0
                      ),
                    reaction_counts:
                      result.reaction_counts &&
                      typeof result.reaction_counts ===
                        "object"
                        ? result.reaction_counts
                        : {},
                  }
                : currentPost
          )
      );
    } catch (error) {
      console.log(
        "NETWORK POST REACTION ERROR:",
        error
      );
    } finally {
      setReactionBusyPostId(
        null
      );
    }
  }

  async function handleTogglePin(
    post
  ) {
    if (
      !post?.id ||
      actionsBusy ||
      !canManage
    ) {
      return;
    }

    try {
      setActionsBusy(true);

      const {
        error,
      } =
        await supabase.rpc(
          "set_network_post_pinned_rpc",
          {
            target_post_id:
              post.id,
            requested_is_pinned:
              !Boolean(
                post.is_pinned
              ),
          }
        );

      if (error) {
        throw error;
      }

      setSelectedPost(null);

      await loadPosts({
        showLoader: false,
      });
    } catch (error) {
      console.log(
        "NETWORK LIVE POST PIN ERROR:",
        error
      );
    } finally {
      setActionsBusy(false);
    }
  }

  async function handleTogglePublication(
    post
  ) {
    if (
      !post?.id ||
      actionsBusy ||
      !canManage
    ) {
      return;
    }

    try {
      setActionsBusy(true);

      const {
        error,
      } =
        await supabase.rpc(
          "set_network_post_publication_status_rpc",
          {
            target_post_id:
              post.id,
            requested_publication_status:
              post.publication_status ===
              "published"
                ? "draft"
                : "published",
          }
        );

      if (error) {
        throw error;
      }

      setSelectedPost(null);

      await loadPosts({
        showLoader: false,
      });
    } catch (error) {
      console.log(
        "NETWORK LIVE POST PUBLICATION ERROR:",
        error
      );
    } finally {
      setActionsBusy(false);
    }
  }

  async function handleArchivePost(
    post
  ) {
    if (
      !post?.id ||
      actionsBusy ||
      !canManage
    ) {
      return;
    }

    try {
      setActionsBusy(true);

      const {
        error,
      } =
        await supabase.rpc(
          "archive_network_post_rpc",
          {
            target_post_id:
              post.id,
          }
        );

      if (error) {
        throw error;
      }

      setSelectedPost(null);

      await loadPosts({
        showLoader: false,
      });
    } catch (error) {
      console.log(
        "NETWORK LIVE POST ARCHIVE ERROR:",
        error
      );
    } finally {
      setActionsBusy(false);
    }
  }

  return (
    <View>
      <SectionHeader
        networkUuid={
          networkUuid
        }
        networkName={
          networkName
        }
        canManage={
          canManage
        }
      />

      {!isJoined ? (
        <MembershipRequiredState />
      ) : loading ? (
        <LoadingState />
      ) : loadError ? (
        <ErrorState
          message={loadError}
          onRetry={() =>
            loadPosts()
          }
        />
      ) : orderedPosts.length ===
        0 ? (
        <EmptyState
          canManage={
            canManage
          }
          onCreate={() =>
            navigation.navigate(
              "NetworkPostComposer",
              {
                networkUuid,
                networkName,
                initialPostType:
                  "post",
              }
            )
          }
        />
      ) : (
        orderedPosts.map(
          (post) => {
            const isMine =
              Boolean(
                currentUserId &&
                post.author_user_id ===
                  currentUserId
              );

            return (
              <NetworkPostCard
                key={post.id}
                post={post}
                canOpenActions={
                  canManage ||
                  isMine
                }
                onOpenActions={
                  setSelectedPost
                }
                reactionBusy={
                  reactionBusyPostId ===
                  post.id
                }
                onReact={
                  handleReaction
                }
                onComment={(selectedPost) => {
                  setCommentsTargetPost(
                    selectedPost
                  );
                }}
                onShare={() => {
                  console.log(
                    "NETWORK SHARE NEXT"
                  );
                }}
              />
            );
          }
        )
      )}

      <NetworkPostActionsSheet
        visible={
          Boolean(
            selectedPost
          )
        }
        post={selectedPost}
        busy={actionsBusy}
        canEdit={
          canManage ||
          selectedPostIsMine
        }
        canModerate={
          canManage
        }
        canDelete={
          canManage ||
          selectedPostIsMine
        }
        onClose={() => {
          if (!actionsBusy) {
            setSelectedPost(
              null
            );
          }
        }}
        onEdit={(post) => {
          setSelectedPost(null);

          navigation.navigate(
            "NetworkPostEditor",
            {
              post,
            }
          );
        }}
        onTogglePin={
          handleTogglePin
        }
        onTogglePublication={
          handleTogglePublication
        }
        onArchive={
          handleArchivePost
        }
        onDelete={(post) => {
          setSelectedPost(null);
          setDeleteTargetPost(
            post
          );
        }}
      />

      <NetworkPostDeleteConfirmSheet
        visible={
          Boolean(
            deleteTargetPost
          )
        }
        post={
          deleteTargetPost
        }
        onClose={() =>
          setDeleteTargetPost(
            null
          )
        }
        onDeleted={async () => {
          setDeleteTargetPost(
            null
          );

          await loadPosts({
            showLoader: false,
          });
        }}
      />

      <NetworkPostCommentsSheet
        visible={
          Boolean(
            commentsTargetPost
          )
        }
        post={
          commentsTargetPost
        }
        currentUserId={
          currentUserId
        }
        onClose={() =>
          setCommentsTargetPost(
            null
          )
        }
        onCommentCountChange={(
          postId,
          amount
        ) => {
          setPosts(
            (currentPosts) =>
              currentPosts.map(
                (currentPost) =>
                  currentPost.id ===
                  postId
                    ? {
                        ...currentPost,
                        comment_count:
                          Math.max(
                            0,
                            Number(
                              currentPost.comment_count ||
                                0
                            ) +
                              Number(
                                amount ||
                                  0
                              )
                          ),
                      }
                    : currentPost
              )
          );

          setCommentsTargetPost(
            (currentPost) =>
              currentPost?.id ===
              postId
                ? {
                    ...currentPost,
                    comment_count:
                      Math.max(
                        0,
                        Number(
                          currentPost.comment_count ||
                            0
                        ) +
                          Number(
                            amount ||
                              0
                          )
                      ),
                  }
                : currentPost
          );
        }}
      />
    </View>
  );
}