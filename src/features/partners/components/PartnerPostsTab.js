// src/features/partners/components/PartnerPostsTab.js
import { Ionicons } from "@expo/vector-icons";
import {
    useCallback,
    useEffect,
    useState
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

import { supabase } from "../../../lib/supabase";

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

function createShareMessage(post) {
  return [
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

function PartnerActionButton({
  label,
  icon,
  onPress,
  amber = false,
}) {
  const backgroundColor =
    amber
      ? AMBER_SOFT
      : OLIVE_SOFT;

  const borderColor =
    amber
      ? AMBER_BORDER
      : OLIVE_BORDER;

  const color =
    amber
      ? EVENT_BROWN
      : OLIVE;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        borderRadius: 17,
        paddingVertical: 11,
        paddingHorizontal: 10,
        backgroundColor,
        borderWidth: 1,
        borderColor,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        opacity:
          pressed ? 0.84 : 1,
      })}
    >
      <Ionicons
        name={icon}
        size={16}
        color={color}
        style={{
          marginRight: 6,
        }}
      />

      <Text
        style={{
          color,
          fontSize: 12.5,
          fontWeight: "900",
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
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
        bottom: 49,
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

function PostMediaCarousel({
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

  const cardHorizontalSpace = 60;

  const mediaWidth =
    Math.max(
      windowWidth -
        cardHorizontalSpace,
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
              <Image
                source={{
                  uri:
                    mediaItem.media_url,
                }}
                style={{
                  width: "100%",
                  height: 238,
                  borderRadius: 18,
                  backgroundColor:
                    OLIVE_SOFT,
                }}
                resizeMode="cover"
              />
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

function PartnerPostCard({
  post,
  currentUserId = null,
  canManage = false,
  onBoostPress,
  onMenuPress,
  onOpenComments,
}) {
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

  const title =
    post?.title || "";

  const content =
    post?.content || "";

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
          "PartnerPostCard media load error:",
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
          "PartnerPostCard interaction load error:",
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
        "PartnerPostsTab link error:",
        error
      );

      Alert.alert(
        "Open link",
        "We couldn't open this link."
      );
    }
  }

  async function handleShare() {
    try {
      const message =
        createShareMessage(
          post
        );

      await Share.share({
        title:
          title ||
          "Partner Post",
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
        "PartnerPostsTab share error:",
        error
      );

      Alert.alert(
        "Share Partner Post",
        "We couldn't open sharing right now."
      );
    }
  }

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
        "PartnerPostCard reaction error:",
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

    onOpenComments?.(
      post,
      summary.commentCount
    );
  }

  function handleCommentCountChange(
    nextCount
  ) {
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
  }

  return (
    <View
      style={{
        ...premiumCardStyle,
        borderRadius: 22,
        padding: 14,
        marginBottom: 12,
        overflow: "visible",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems:
            "flex-start",
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
            marginRight: 8,
          }}
        >
          <Text
            style={{
              color:
                EVENT_BROWN,
              fontSize: 11.5,
              fontWeight: "900",
            }}
          >
            {typeLabel}
          </Text>
        </View>

        <View
          style={{
            marginLeft: "auto",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: MUTED,
              fontSize: 11.5,
              fontWeight: "800",
              marginTop: 1,
            }}
          >
            {post?.created_at
              ? new Date(
                  post.created_at
                ).toLocaleDateString()
              : ""}
          </Text>

          {canManage ? (
            <Pressable
              onPress={() =>
                onMenuPress?.(
                  post
                )
              }
              hitSlop={8}
              style={({ pressed }) => ({
                marginLeft: 8,
                width: 30,
                height: 30,
                borderRadius: 15,
                alignItems:
                  "center",
                justifyContent:
                  "center",
                backgroundColor:
                  pressed
                    ? OLIVE_SOFT
                    : "transparent",
                opacity:
                  pressed
                    ? 0.72
                    : 1,
              })}
            >
              <Ionicons
                name="ellipsis-vertical"
                size={17}
                color={OLIVE}
              />
            </Pressable>
          ) : null}
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
        <PostMediaCarousel
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
                  👍 ❤️
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
          onPress={handleShare}
        />
      </View>

      {canManage ? (
        <Pressable
          onPress={() =>
            onBoostPress?.(post)
          }
          style={({ pressed }) => ({
            marginTop: 10,
            borderRadius: 999,
            paddingHorizontal: 13,
            paddingVertical: 10,
            backgroundColor:
              EVENT_AMBER,
            flexDirection: "row",
            alignItems: "center",
            justifyContent:
              "center",
            opacity:
              pressed ? 0.86 : 1,
          })}
        >
          <Ionicons
            name="trending-up-outline"
            size={16}
            color={SURFACE}
            style={{
              marginRight: 6,
            }}
          />

          <Text
            style={{
              color: SURFACE,
              fontSize: 13,
              fontWeight: "900",
            }}
          >
            Boost Post
          </Text>
        </Pressable>
      ) : null}

    </View>
  );
}

export default function PartnerPostsTab({
  posts = [],
  isOwner = false,
  onCreatePost,
  onPromoteProfile,
  onBoostPost,
  onOpenPostMenu,
}) {
  const [
    currentUserId,
    setCurrentUserId,
  ] = useState(null);

  const [
    selectedPostForComments,
    setSelectedPostForComments,
  ] = useState(null);

  const [
    commentCountsByPostId,
    setCommentCountsByPostId,
  ] = useState({});

  const safePosts =
    Array.isArray(posts)
      ? posts
      : [];

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const {
          data,
          error,
        } =
          await supabase.auth
            .getSession();

        if (error) {
          throw error;
        }

        if (active) {
          setCurrentUserId(
            data?.session
              ?.user?.id || null
          );
        }
      } catch (error) {
        console.log(
          "PartnerPostsTab session error:",
          error
        );

        if (active) {
          setCurrentUserId(null);
        }
      }
    }

    loadSession();

    const {
      data: authSubscription,
    } =
      supabase.auth
        .onAuthStateChange(
          (
            _event,
            session
          ) => {
            if (active) {
              setCurrentUserId(
                session?.user?.id ||
                  null
              );
            }
          }
        );

    return () => {
      active = false;

      authSubscription
        ?.subscription
        ?.unsubscribe?.();
    };
  }, []);

  const handleOpenComments =
    useCallback(
      (
        post,
        currentCount = 0
      ) => {
        if (!currentUserId) {
          Alert.alert(
            "Sign in required",
            "You need to be signed in to comment."
          );
          return;
        }

        setCommentCountsByPostId(
          (current) => ({
            ...current,
            [post.id]:
              current[
                post.id
              ] ??
              currentCount,
          })
        );

        setSelectedPostForComments(
          post
        );
      },
      [currentUserId]
    );

  const handleCloseComments =
    useCallback(() => {
      setSelectedPostForComments(
        null
      );
    }, []);

  const handleCommentCountChange =
    useCallback(
      (
        partnerPostId,
        nextCount
      ) => {
        setCommentCountsByPostId(
          (current) => ({
            ...current,
            [partnerPostId]:
              Math.max(
                0,
                Number(
                  nextCount
                ) || 0
              ),
          })
        );
      },
      []
    );

  return (
    <>
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 24,
        }}
      >
        {isOwner ? (
          <View
            style={{
              ...premiumCardStyle,
              borderRadius: 22,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                ...serifHeading,
                fontSize: 20,
                lineHeight: 25,
                marginBottom: 4,
              }}
            >
              Partner tools
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 12.5,
                fontWeight: "700",
                lineHeight: 18,
                marginBottom: 11,
              }}
            >
              Post updates from this profile
              or promote the profile to reach
              more Christians.
            </Text>

            <View
              style={{
                flexDirection: "row",
                gap: 9,
              }}
            >
              <PartnerActionButton
                label="Create Post"
                icon="add-circle-outline"
                onPress={
                  onCreatePost
                }
                amber
              />

              <PartnerActionButton
                label="Promote Profile"
                icon="megaphone-outline"
                onPress={
                  onPromoteProfile
                }
              />
            </View>
          </View>
        ) : null}

        {safePosts.length > 0 ? (
          <View
            style={{
              marginBottom: 12,
              paddingTop: 2,
            }}
          >
            <Text
              style={{
                color: MUTED,
                fontSize: 11.5,
                fontWeight: "900",
                textTransform:
                  "uppercase",
                letterSpacing: 0.45,
                marginBottom: 8,
              }}
            >
              Partner posts
            </Text>
          </View>
        ) : null}

        {safePosts.length === 0 ? (
          <View
            style={{
              ...premiumCardStyle,
              padding: 20,
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                backgroundColor:
                  OLIVE_SOFT,
                borderWidth: 1,
                borderColor:
                  OLIVE_BORDER,
                alignItems: "center",
                justifyContent:
                  "center",
                marginBottom: 12,
              }}
            >
              <Ionicons
                name="megaphone-outline"
                size={25}
                color={OLIVE}
              />
            </View>

            <Text
              style={{
                ...serifHeading,
                fontSize: 22,
                lineHeight: 27,
                textAlign: "center",
              }}
            >
              No partner posts yet
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 13.5,
                fontWeight: "700",
                lineHeight: 20,
                textAlign: "center",
                marginTop: 6,
              }}
            >
              Updates, offers, resources and
              promoted posts will appear here.
            </Text>

            {isOwner ? (
              <Pressable
                onPress={
                  onCreatePost
                }
                style={({ pressed }) => ({
                  marginTop: 14,
                  borderRadius: 999,
                  backgroundColor:
                    EVENT_AMBER,
                  paddingHorizontal: 16,
                  paddingVertical: 11,
                  flexDirection: "row",
                  alignItems: "center",
                  opacity:
                    pressed
                      ? 0.86
                      : 1,
                })}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={16}
                  color={SURFACE}
                  style={{
                    marginRight: 6,
                  }}
                />

                <Text
                  style={{
                    color: SURFACE,
                    fontSize: 13,
                    fontWeight: "900",
                  }}
                >
                  Create Partner Post
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          safePosts.map(
            (post) => (
              <PartnerPostCard
                key={
                  `${post.id}-${
                    commentCountsByPostId[
                      post.id
                    ] ?? ""
                  }`
                }
                post={post}
                currentUserId={
                  currentUserId
                }
                canManage={
                  isOwner
                }
                onBoostPress={
                  onBoostPost
                }
                onMenuPress={
                  onOpenPostMenu
                }
                onOpenComments={
                  handleOpenComments
                }
              />
            )
          )
        )}
      </View>

      <Modal
        visible={Boolean(
          selectedPostForComments
        )}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={
          handleCloseComments
        }
      >
        <PartnerPostCommentsSheet
          visible={Boolean(
            selectedPostForComments
          )}
          partnerPost={
            selectedPostForComments
          }
          currentUserId={
            currentUserId
          }
          canManage={isOwner}
          onClose={
            handleCloseComments
          }
          onCommentCountChange={
            handleCommentCountChange
          }
        />
      </Modal>
    </>
  );
}