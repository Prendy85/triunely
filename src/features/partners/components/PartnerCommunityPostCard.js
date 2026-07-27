// src/features/partners/components/PartnerCommunityPostCard.js
import { Ionicons } from "@expo/vector-icons";
import {
    useVideoPlayer,
    VideoView,
} from "expo-video";
import * as VideoThumbnails from "expo-video-thumbnails";
import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Share,
    Text,
    useWindowDimensions,
    View,
} from "react-native";

import VerifiedBadge from "../../../components/VerifiedBadge";

import PartnerPostCommentsSheet from "./PartnerPostCommentsSheet";

import {
    fetchPartnerPostInteractionSummary,
    fetchPartnerPostMedia,
    PARTNER_POST_REACTION_TYPES,
    removePartnerPostReaction,
    setPartnerPostReaction,
} from "../services/partnersService";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";

const CARD_BORDER =
  "rgba(15, 23, 42, 0.08)";

const AMBER_SOFT =
  "rgba(180, 83, 9, 0.10)";

const AMBER_BORDER =
  "rgba(180, 83, 9, 0.18)";

const OLIVE_SOFT =
  "rgba(79, 99, 59, 0.10)";

const OLIVE_BORDER =
  "rgba(79, 99, 59, 0.18)";

const SHADOW =
  "rgba(15, 23, 42, 0.10)";

const displayFont =
  Platform.OS === "ios"
    ? "Georgia"
    : "serif";

const serifHeading = {
  fontFamily: displayFont,
  color: TEXT,
  fontWeight: "900",
  letterSpacing: -0.45,
};

const premiumCardStyle = {
  backgroundColor: SURFACE,
  borderRadius: 24,
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

const EMPTY_SUMMARY = {
  likeCount: 0,
  loveCount: 0,
  laughCount: 0,
  sadCount: 0,
  angryCount: 0,
  prayCount: 0,
  totalReactions: 0,
  commentCount: 0,
  currentUserReaction: null,
};

function cleanUrl(url) {
  const value =
    String(url || "").trim();

  if (!value) {
    return "";
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  return `https://${value}`;
}

function safeInitials(name) {
  if (!name) {
    return "P";
  }

  const parts = String(name)
    .trim()
    .split(" ")
    .filter(Boolean);

  if (parts.length >= 2) {
    return (
      parts[0][0] +
      parts[1][0]
    ).toUpperCase();
  }

  return (
    String(name)
      .trim()[0]
      ?.toUpperCase() || "P"
  );
}

function isPartnerPostVideo(mediaItem) {
  const mediaType = String(
    mediaItem?.media_type || ""
  ).toLowerCase();

  const mediaUrl = String(
    mediaItem?.media_url || ""
  ).toLowerCase();

  return (
    mediaType.startsWith("video/") ||
    mediaType === "video" ||
    mediaUrl.includes(".mp4") ||
    mediaUrl.includes(".mov") ||
    mediaUrl.includes(".webm")
  );
}

function FullscreenPartnerVideoPlayer({
  uri,
  onClose,
}) {
  const player = useVideoPlayer(
    {
      uri,
      useCaching: false,
    },
    (videoPlayer) => {
      videoPlayer.loop = false;

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

  function closePlayer() {
    try {
      player.pause();
    } catch (error) {
      console.log(
        "Community Partner video pause error:",
        error
      );
    }

    onClose?.();
  }

  return (
    <Modal
      visible
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
          player={player}
          nativeControls
          contentFit="contain"
          surfaceType="surfaceView"
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: "#000000",
          }}
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

function PartnerCommunityVideoPreview({
  uri,
  thumbnailUrl = null,
}) {
  const [
    generatedThumbnail,
    setGeneratedThumbnail,
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
      } catch (error) {
        console.log(
          "Community Partner video thumbnail error:",
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

  if (!uri) {
    return null;
  }

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
        accessibilityLabel="Play Partner video fullscreen"
        style={({ pressed }) => ({
          width: "100%",
          aspectRatio: 1,
          borderRadius: 18,
          backgroundColor: "#000000",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          opacity:
            pressed ? 0.92 : 1,
        })}
      >
        {previewUri ? (
          <Image
            source={{
              uri: previewUri,
            }}
            resizeMode="cover"
            style={{
              width: "100%",
              height: "100%",
              backgroundColor:
                "#000000",
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
                : "rgba(0,0,0,0.88)",
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
                  width: 60,
                  height: 60,
                  borderRadius: 30,
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
                  size={28}
                  color={EVENT_AMBER}
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
        <FullscreenPartnerVideoPlayer
          uri={uri}
          onClose={() =>
            setPlayerVisible(false)
          }
        />
      ) : null}
    </>
  );
}

function getReactionDetails(
  reactionType
) {
  return (
    PARTNER_POST_REACTION_TYPES.find(
      (reaction) =>
        reaction.value ===
        reactionType
    ) || null
  );
}

function getSummaryReactionEmojis(
  summary
) {
  const countByReaction = {
    like:
      Number(summary?.likeCount) || 0,
    love:
      Number(summary?.loveCount) || 0,
    laugh:
      Number(summary?.laughCount) || 0,
    sad:
      Number(summary?.sadCount) || 0,
    angry:
      Number(summary?.angryCount) || 0,
    pray:
      Number(summary?.prayCount) || 0,
  };

  return PARTNER_POST_REACTION_TYPES
    .map((reaction) => ({
      ...reaction,
      count:
        countByReaction[
          reaction.value
        ] || 0,
    }))
    .filter(
      (reaction) =>
        reaction.count > 0
    )
    .sort(
      (first, second) =>
        second.count - first.count
    )
    .slice(0, 3)
    .map(
      (reaction) =>
        reaction.emoji
    )
    .join(" ");
}

function createShareMessage(
  post,
  partner
) {
  return [
    partner?.name
      ? `From ${partner.name} on Triunely`
      : "",
    String(
      post?.title || ""
    ).trim(),
    String(
      post?.content || ""
    ).trim(),
    String(
      post?.link_url || ""
    ).trim(),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function ReactionTray({
  visible,
  selectedReaction,
  disabled = false,
  onSelect,
}) {
  if (!visible) {
    return null;
  }

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        bottom: 51,
        zIndex: 30,
        elevation: 30,
        backgroundColor: SURFACE,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        paddingHorizontal: 7,
        paddingVertical: 6,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: SHADOW,
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: {
          width: 0,
          height: 5,
        },
      }}
    >
      {PARTNER_POST_REACTION_TYPES.map(
        (reaction) => {
          const active =
            selectedReaction ===
            reaction.value;

          return (
            <Pressable
              key={reaction.value}
              onPress={() =>
                onSelect?.(
                  reaction.value
                )
              }
              disabled={disabled}
              hitSlop={3}
              style={({ pressed }) => ({
                width: 43,
                height: 43,
                borderRadius: 22,
                alignItems: "center",
                justifyContent:
                  "center",
                backgroundColor:
                  active
                    ? AMBER_SOFT
                    : "transparent",
                borderWidth:
                  active ? 1 : 0,
                borderColor:
                  active
                    ? AMBER_BORDER
                    : "transparent",
                opacity:
                  disabled
                    ? 0.45
                    : pressed
                      ? 0.68
                      : 1,
                transform: [
                  {
                    scale:
                      pressed
                        ? 1.12
                        : active
                          ? 1.07
                          : 1,
                  },
                ],
              })}
            >
              <Text
                style={{
                  fontSize: 25,
                  lineHeight: 31,
                }}
              >
                {reaction.emoji}
              </Text>
            </Pressable>
          );
        }
      )}
    </View>
  );
}

function InteractionButton({
  label,
  icon,
  emoji = null,
  active = false,
  disabled = false,
  onPress,
  onLongPress,
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      disabled={disabled}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 44,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        backgroundColor:
          active
            ? AMBER_SOFT
            : pressed
              ? OLIVE_SOFT
              : "transparent",
        opacity:
          disabled ? 0.45 : 1,
      })}
    >
      {emoji ? (
        <Text
          style={{
            fontSize: 21,
            lineHeight: 25,
          }}
        >
          {emoji}
        </Text>
      ) : (
        <>
          <Ionicons
            name={icon}
            size={19}
            color={
              active
                ? EVENT_AMBER
                : OLIVE
            }
            style={{
              marginRight: 6,
            }}
          />

          <Text
            style={{
              color:
                active
                  ? EVENT_BROWN
                  : OLIVE,
              fontSize: 12.5,
              fontWeight: "900",
            }}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

function PartnerPostMediaCarousel({
  media = [],
}) {
  const {
    width: windowWidth,
  } = useWindowDimensions();

  const [
    activeIndex,
    setActiveIndex,
  ] = useState(0);

  const safeMedia =
    Array.isArray(media)
      ? media.filter(
          (item) =>
            Boolean(
              item?.media_url
            )
        )
      : [];

  const mediaWidth =
    Math.max(
      windowWidth - 52,
      240
    );

  if (
    safeMedia.length === 0
  ) {
    return null;
  }

  function handleScrollEnd(event) {
    const offsetX =
      event?.nativeEvent
        ?.contentOffset?.x || 0;

    const nextIndex =
      Math.round(
        offsetX / mediaWidth
      );

    setActiveIndex(
      Math.max(
        0,
        Math.min(
          nextIndex,
          safeMedia.length - 1
        )
      )
    );
  }

  return (
    <View
      style={{
        marginTop: 12,
        marginHorizontal: -14,
      }}
    >
      <ScrollView
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={
          false
        }
        decelerationRate="fast"
        snapToInterval={mediaWidth}
        snapToAlignment="start"
        onMomentumScrollEnd={
          handleScrollEnd
        }
        contentContainerStyle={{
          paddingHorizontal: 14,
        }}
      >
        {safeMedia.map(
          (mediaItem, index) => (
            <View
              key={
                mediaItem.id ||
                `${mediaItem.media_url}-${index}`
              }
              style={{
                width: mediaWidth,
                paddingRight:
                  index ===
                  safeMedia.length - 1
                    ? 0
                    : 9,
              }}
            >
{isPartnerPostVideo(
  mediaItem
) ? (
  <PartnerCommunityVideoPreview
    uri={mediaItem.media_url}
    thumbnailUrl={
      mediaItem
        ?.thumbnail_url ||
      mediaItem
        ?.media_thumbnail_url ||
      null
    }
  />
) : (
  <Image
    source={{
      uri:
        mediaItem.media_url,
    }}
    style={{
      width: "100%",
      aspectRatio: 1,
      borderRadius: 18,
      backgroundColor:
        OLIVE_SOFT,
    }}
    resizeMode="cover"
  />
)}
            </View>
          )
        )}
      </ScrollView>

      {safeMedia.length > 1 ? (
        <>
          <View
            style={{
              position: "absolute",
              top: 10,
              right: 24,
              minWidth: 47,
              height: 28,
              paddingHorizontal: 9,
              borderRadius: 14,
              backgroundColor:
                "rgba(15,23,42,0.70)",
              alignItems: "center",
              justifyContent:
                "center",
            }}
          >
            <Text
              style={{
                color: SURFACE,
                fontSize: 11,
                fontWeight: "900",
              }}
            >
              {activeIndex + 1}/
              {safeMedia.length}
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent:
                "center",
              marginTop: 9,
            }}
          >
            {safeMedia.map(
              (mediaItem, index) => (
                <View
                  key={
                    mediaItem.id ||
                    `dot-${index}`
                  }
                  style={{
                    width:
                      activeIndex ===
                      index
                        ? 18
                        : 6,
                    height: 6,
                    borderRadius: 999,
                    backgroundColor:
                      activeIndex ===
                      index
                        ? EVENT_AMBER
                        : "rgba(107,114,128,0.28)",
                    marginHorizontal: 3,
                  }}
                />
              )
            )}
          </View>
        </>
      ) : null}
    </View>
  );
}

export default function PartnerCommunityPostCard({
  post,
  currentUserId = null,
  onOpenPartnerProfile,
}) {
  const partner =
    post?.partner || null;

  const [
    media,
    setMedia,
  ] = useState([]);

  const [
    loadingMedia,
    setLoadingMedia,
  ] = useState(true);

  const [
    summary,
    setSummary,
  ] = useState(
    EMPTY_SUMMARY
  );

  const [
    loadingInteractions,
    setLoadingInteractions,
  ] = useState(true);

  const [
    reactionSaving,
    setReactionSaving,
  ] = useState(false);

  const [
    reactionTrayVisible,
    setReactionTrayVisible,
  ] = useState(false);

  const [
    selectedPostForComments,
    setSelectedPostForComments,
  ] = useState(null);

  const title =
    post?.title || "";

  const content =
    post?.content || "";

  const partnerName =
    partner?.name ||
    "Christian Partner";

  const selectedReaction =
    getReactionDetails(
      summary.currentUserReaction
    );

  const typeLabel =
    String(
      post?.post_type ||
        "update"
    )
      .replace(/_/g, " ")
      .replace(
        /\b\w/g,
        (character) =>
          character.toUpperCase()
      );

  const loadMedia =
    useCallback(async () => {
      try {
        setLoadingMedia(true);

        const result =
          await fetchPartnerPostMedia({
            partnerPostId:
              post?.id,
          });

        if (!result.ok) {
          throw result.error;
        }

        const nextMedia =
          result.media || [];

        if (
          nextMedia.length > 0
        ) {
          setMedia(nextMedia);
          return;
        }

        if (post?.media_url) {
          setMedia([
            {
              id:
                `legacy-${post.id}`,
              partner_post_id:
                post.id,
              media_url:
                post.media_url,
              media_type:
                post.media_type ||
                "image",
              sort_order: 0,
            },
          ]);

          return;
        }

        setMedia([]);
      } catch (error) {
        console.log(
          "PartnerCommunityPostCard media load error:",
          error
        );

        if (post?.media_url) {
          setMedia([
            {
              id:
                `legacy-${post.id}`,
              partner_post_id:
                post.id,
              media_url:
                post.media_url,
              media_type:
                post.media_type ||
                "image",
              sort_order: 0,
            },
          ]);
        } else {
          setMedia([]);
        }
      } finally {
        setLoadingMedia(false);
      }
    }, [
      post?.id,
      post?.media_type,
      post?.media_url,
    ]);

  const loadInteractions =
    useCallback(async () => {
      try {
        setLoadingInteractions(
          true
        );

        const result =
          await fetchPartnerPostInteractionSummary({
            partnerPostId:
              post?.id,
            currentUserId,
          });

        if (!result.ok) {
          throw result.error;
        }

        setSummary(
          result.summary ||
            EMPTY_SUMMARY
        );
      } catch (error) {
        console.log(
          "PartnerCommunityPostCard interaction load error:",
          error
        );

        setSummary(
          EMPTY_SUMMARY
        );
      } finally {
        setLoadingInteractions(
          false
        );
      }
    }, [
      currentUserId,
      post?.id,
    ]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  useEffect(() => {
    loadInteractions();
  }, [loadInteractions]);

  function requireSignedInUser() {
    if (currentUserId) {
      return true;
    }

    Alert.alert(
      "Sign in required",
      "You need to be signed in to interact with this Partner Post."
    );

    return false;
  }

  async function handleReaction(
    reactionType
  ) {
    if (
      reactionSaving ||
      !post?.id ||
      !requireSignedInUser()
    ) {
      return;
    }

    try {
      setReactionSaving(true);
      setReactionTrayVisible(
        false
      );

      const previousReaction =
        summary.currentUserReaction;

      if (
        previousReaction ===
        reactionType
      ) {
        const result =
          await removePartnerPostReaction({
            partnerPostId:
              post.id,
            userId:
              currentUserId,
          });

        if (!result.ok) {
          throw result.error;
        }
      } else {
        const result =
          await setPartnerPostReaction({
            partnerPostId:
              post.id,
            userId:
              currentUserId,
            reactionType,
          });

        if (!result.ok) {
          throw result.error;
        }
      }

      await loadInteractions();
    } catch (error) {
      console.log(
        "PartnerCommunityPostCard reaction error:",
        error
      );

      Alert.alert(
        "Partner Post reaction",
        error?.message ||
          "We couldn't save your reaction."
      );
    } finally {
      setReactionSaving(false);
    }
  }

  function handleLikePress() {
    if (
      reactionTrayVisible
    ) {
      setReactionTrayVisible(
        false
      );

      return;
    }

    handleReaction("like");
  }

  function handleLikeLongPress() {
    if (
      reactionSaving ||
      !requireSignedInUser()
    ) {
      return;
    }

    setReactionTrayVisible(
      true
    );
  }

  function handleCommentPress() {
    if (
      !requireSignedInUser()
    ) {
      return;
    }

    setReactionTrayVisible(
      false
    );

    setSelectedPostForComments(
      post
    );
  }

  async function handleShare() {
    try {
      const message =
        createShareMessage(
          post,
          partner
        );

      await Share.share({
        title:
          title ||
          `${partnerName} on Triunely`,
        message:
          message ||
          "View this Partner Post on Triunely.",
        url:
          Platform.OS === "ios"
            ? cleanUrl(
                post?.link_url
              ) || undefined
            : undefined,
      });
    } catch (error) {
      console.log(
        "PartnerCommunityPostCard share error:",
        error
      );

      Alert.alert(
        "Share Partner Post",
        "We couldn't open sharing right now."
      );
    }
  }

  async function handleLinkPress() {
    const url =
      cleanUrl(
        post?.link_url
      );

    if (!url) {
      return;
    }

    try {
      await Linking.openURL(
        url
      );
    } catch (error) {
      console.log(
        "PartnerCommunityPostCard link error:",
        error
      );

      Alert.alert(
        "Open link",
        "We couldn't open this link."
      );
    }
  }

  function handleOpenPartner() {
    if (!partner?.id) {
      return;
    }

    onOpenPartnerProfile?.(
      partner
    );
  }

  return (
    <>
      <View
        style={{
          ...premiumCardStyle,
          borderRadius: 22,
          marginHorizontal: 16,
          padding: 14,
          overflow: "visible",
        }}
      >
        <Pressable
          onPress={
            handleOpenPartner
          }
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            opacity:
              pressed ? 0.76 : 1,
          })}
        >
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 16,
              backgroundColor: OLIVE,
              borderWidth: 1,
              borderColor:
                OLIVE_BORDER,
              overflow: "hidden",
              alignItems: "center",
              justifyContent:
                "center",
              marginRight: 10,
            }}
          >
            {partner?.logo_url ? (
              <Image
                source={{
                  uri:
                    partner.logo_url,
                }}
                style={{
                  width: "100%",
                  height: "100%",
                }}
                resizeMode="cover"
              />
            ) : (
              <Text
                style={{
                  color: SURFACE,
                  fontSize: 15,
                  fontWeight: "900",
                }}
              >
                {safeInitials(
                  partnerName
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
              }}
            >
              <Text
                style={{
                  ...serifHeading,
                  fontSize: 17,
                  lineHeight: 21,
                  flexShrink: 1,
                }}
                numberOfLines={1}
              >
                {partnerName}
              </Text>

              {partner?.badge_active === true ? (
                <View
                  style={{
                    marginLeft: 6,
                  }}
                >
                  <VerifiedBadge
                    size={14}
                  />
                </View>
              ) : null}
            </View>

            <View
              style={{
                marginTop: 3,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: EVENT_BROWN,
                  fontSize: 11.5,
                  fontWeight: "900",
                }}
              >
                Partner Post
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 11.5,
                  fontWeight: "800",
                  marginHorizontal: 5,
                }}
              >
                •
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 11.5,
                  fontWeight: "800",
                }}
              >
                {post?.created_at
                  ? new Date(
                      post.created_at
                    ).toLocaleDateString()
                  : ""}
              </Text>
            </View>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={OLIVE}
          />
        </Pressable>

        <View
          style={{
            marginTop: 12,
            flexDirection: "row",
          }}
        >
          <View
            style={{
              borderRadius: 999,
              backgroundColor:
                AMBER_SOFT,
              borderWidth: 1,
              borderColor:
                AMBER_BORDER,
              paddingHorizontal: 9,
              paddingVertical: 5,
            }}
          >
            <Text
              style={{
                color: EVENT_BROWN,
                fontSize: 11.5,
                fontWeight: "900",
              }}
            >
              {typeLabel}
            </Text>
          </View>
        </View>

        {title ? (
          <Text
            style={{
              ...serifHeading,
              fontSize: 20,
              lineHeight: 25,
              marginTop: 10,
            }}
          >
            {title}
          </Text>
        ) : null}

        {content ? (
          <Text
            style={{
              color: TEXT,
              fontSize: 14,
              fontWeight: "700",
              lineHeight: 20,
              marginTop:
                title ? 6 : 10,
            }}
          >
            {content}
          </Text>
        ) : null}

        {loadingMedia ? (
          <View
            style={{
              height: 170,
              borderRadius: 18,
              marginTop: 12,
              backgroundColor:
                OLIVE_SOFT,
              alignItems: "center",
              justifyContent:
                "center",
            }}
          >
            <ActivityIndicator
              size="small"
              color={OLIVE}
            />
          </View>
        ) : (
          <PartnerPostMediaCarousel
            media={media}
          />
        )}

        {post?.link_url ? (
          <Pressable
            onPress={
              handleLinkPress
            }
            style={({ pressed }) => ({
              marginTop: 12,
              borderRadius: 18,
              padding: 12,
              backgroundColor:
                PREMIUM_CREAM,
              borderWidth: 1,
              borderColor:
                CARD_BORDER,
              opacity:
                pressed ? 0.84 : 1,
            })}
          >
            <Text
              style={{
                color:
                  EVENT_BROWN,
                fontSize: 13,
                fontWeight: "900",
              }}
              numberOfLines={1}
            >
              {post.link_title ||
                post.link_url}
            </Text>

            {post?.link_description ? (
              <Text
                style={{
                  color: MUTED,
                  fontSize: 12.5,
                  fontWeight: "700",
                  lineHeight: 18,
                  marginTop: 4,
                }}
                numberOfLines={2}
              >
                {
                  post.link_description
                }
              </Text>
            ) : null}
          </Pressable>
        ) : null}

        <View
          style={{
            minHeight: 30,
            marginTop: 12,
            paddingHorizontal: 2,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          {loadingInteractions ? (
            <ActivityIndicator
              size="small"
              color={MUTED}
            />
          ) : (
            <>
              {summary.totalReactions >
              0 ? (
                <View
                  style={{
                    flexDirection:
                      "row",
                    alignItems:
                      "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      lineHeight: 19,
                      marginRight: 5,
                    }}
                  >
                    {getSummaryReactionEmojis(
  summary
)}
                  </Text>

                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 11.5,
                      fontWeight:
                        "800",
                    }}
                  >
                    {
                      summary.totalReactions
                    }
                  </Text>
                </View>
              ) : (
                <View />
              )}

              {summary.commentCount >
              0 ? (
                <Pressable
                  onPress={
                    handleCommentPress
                  }
                  style={({ pressed }) => ({
                    marginLeft: "auto",
                    opacity:
                      pressed
                        ? 0.62
                        : 1,
                  })}
                >
                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 11.5,
                      fontWeight:
                        "800",
                    }}
                  >
                    {
                      summary.commentCount
                    }{" "}
                    {summary.commentCount ===
                    1
                      ? "comment"
                      : "comments"}
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>

        <View
          style={{
            height: 1,
            backgroundColor:
              CARD_BORDER,
            marginTop: 7,
          }}
        />

        <View
          style={{
            position: "relative",
            flexDirection: "row",
            alignItems: "center",
            marginTop: 4,
          }}
        >
          <ReactionTray
            visible={
              reactionTrayVisible
            }
            selectedReaction={
              summary.currentUserReaction
            }
            disabled={
              reactionSaving
            }
            onSelect={
              handleReaction
            }
          />

          <InteractionButton
            label="Like"
            icon="thumbs-up-outline"
            emoji={
              selectedReaction?.emoji ||
              null
            }
            active={Boolean(
              selectedReaction
            )}
            disabled={
              reactionSaving ||
              loadingInteractions
            }
            onPress={
              handleLikePress
            }
            onLongPress={
              handleLikeLongPress
            }
          />

          <InteractionButton
            label="Comment"
            icon="chatbubble-outline"
            onPress={
              handleCommentPress
            }
          />

          <InteractionButton
            label="Share"
            icon="share-social-outline"
            onPress={
              handleShare
            }
          />
        </View>
      </View>

      <Modal
        visible={Boolean(
          selectedPostForComments
        )}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setSelectedPostForComments(
            null
          )
        }
      >
<PartnerPostCommentsSheet
  visible={Boolean(
    selectedPostForComments
  )}
  partnerPost={
    selectedPostForComments
  }
  partner={partner}
  currentUserId={
    currentUserId
  }
          canManage={false}
          onClose={() =>
            setSelectedPostForComments(
              null
            )
          }
          onCommentCountChange={(
            _partnerPostId,
            nextCount
          ) => {
            setSummary(
              (current) => ({
                ...current,
                commentCount:
                  Math.max(
                    0,
                    Number(
                      nextCount
                    ) || 0
                  ),
              })
            );
          }}
        />
      </Modal>
    </>
  );
}