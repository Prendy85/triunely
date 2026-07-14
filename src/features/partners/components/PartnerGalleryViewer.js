import { Ionicons } from "@expo/vector-icons";
import * as ScreenOrientation from "expo-screen-orientation";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Alert,
    FlatList,
    Image,
    Modal,
    Platform,
    Pressable,
    Share,
    StatusBar,
    Text,
    useWindowDimensions,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PartnerGalleryCommentsModal from "./PartnerGalleryCommentsModal";

import {
    fetchPartnerGalleryInteractionSummary,
    removePartnerGalleryReaction,
    setPartnerGalleryReaction,
} from "../services/partnersService";

const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const MUTED_LIGHT =
  "rgba(255, 255, 255, 0.74)";
const VIEWER_BACKGROUND = "#101510";

const displayFont =
  Platform.OS === "ios"
    ? "Georgia"
    : "serif";

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

const REACTIONS = [
  {
    key: "like",
    label: "Like",
    emoji: "👍",
  },
  {
    key: "love",
    label: "Love",
    emoji: "❤️",
  },
  {
    key: "laugh",
    label: "Laugh",
    emoji: "😂",
  },
  {
    key: "sad",
    label: "Sad",
    emoji: "😢",
  },
  {
    key: "angry",
    label: "Angry",
    emoji: "😡",
  },
  {
    key: "pray",
    label: "Pray",
    emoji: "🙏",
  },
];

function getReactionDefinition(
  reactionType
) {
  return (
    REACTIONS.find(
      (reaction) =>
        reaction.key ===
        reactionType
    ) || null
  );
}

function ViewerControl({
  icon,
  onPress,
  disabled = false,
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      style={({ pressed }) => ({
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor:
          "rgba(0, 0, 0, 0.58)",
        borderWidth: 1,
        borderColor:
          "rgba(255, 255, 255, 0.28)",
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled
          ? 0.35
          : pressed
            ? 0.78
            : 1,
        transform: [
          {
            translateY:
              pressed ? 2 : 0,
          },
          {
            scale:
              pressed ? 0.96 : 1,
          },
        ],
      })}
    >
      <Ionicons
        name={icon}
        size={22}
        color={SURFACE}
      />
    </Pressable>
  );
}

function InteractionButton({
  icon,
  emoji,
  label,
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
        minHeight: 46,
        borderRadius: 18,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active
          ? "rgba(180, 83, 9, 0.94)"
          : "rgba(0, 0, 0, 0.60)",
        borderWidth: 1,
        borderColor: active
          ? "rgba(255,255,255,0.72)"
          : "rgba(255,255,255,0.22)",
        opacity: disabled
          ? 0.4
          : pressed
            ? 0.76
            : 1,
        transform: [
          {
            translateY:
              pressed ? 2 : 0,
          },
          {
            scale:
              pressed ? 0.98 : 1,
          },
        ],
      })}
    >
      {emoji ? (
        <Text
          style={{
            fontSize: 19,
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
          color={SURFACE}
          style={{
            marginRight: 6,
          }}
        />
      )}

      {!emoji ? (
        <Text
          numberOfLines={1}
          style={{
            color: SURFACE,
            fontSize: 12.5,
            fontWeight: "900",
          }}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default function PartnerGalleryViewer({
  visible = false,
  items = [],
  initialIndex = 0,
  currentUserId = null,
  canManage = false,
  onClose,
}) {
  const {
    width,
    height,
  } = useWindowDimensions();

  const insets =
    useSafeAreaInsets();

  const listRef =
    useRef(null);

  const activeItemIdRef =
    useRef(null);

  const previousVisibleRef =
    useRef(false);

  const safeItems = useMemo(
    () =>
      Array.isArray(items)
        ? items
        : [],
    [items]
  );

  const safeInitialIndex = useMemo(
    () =>
      Math.min(
        Math.max(
          Number(initialIndex) || 0,
          0
        ),
        Math.max(
          safeItems.length - 1,
          0
        )
      ),
    [
      initialIndex,
      safeItems.length,
    ]
  );

  const [
    activeIndex,
    setActiveIndex,
  ] = useState(
    safeInitialIndex
  );

  const [
    summariesByItemId,
    setSummariesByItemId,
  ] = useState({});

  const [
    loadingSummaryId,
    setLoadingSummaryId,
  ] = useState(null);

  const [
    savingReaction,
    setSavingReaction,
  ] = useState(false);

  const [
    reactionTrayVisible,
    setReactionTrayVisible,
  ] = useState(false);

  const [
    commentsVisible,
    setCommentsVisible,
  ] = useState(false);

  const [
    viewerChromeVisible,
    setViewerChromeVisible,
  ] = useState(true);

  const [
    repositioningForRotation,
    setRepositioningForRotation,
  ] = useState(false);

  const previousDimensionsRef =
    useRef({
      width,
      height,
    });

  const rotationFirstFrameRef =
    useRef(null);

  const rotationSecondFrameRef =
    useRef(null);

  function handleToggleViewerChrome() {
    setReactionTrayVisible(false);

    setViewerChromeVisible(
      (current) => !current
    );
  }

  const activeItem =
    safeItems[activeIndex] ||
    null;

  const activeItemId =
    activeItem?.id || null;

  useEffect(() => {
    activeItemIdRef.current =
      activeItemId;
  }, [activeItemId]);

  const activeSummary =
    summariesByItemId[
      activeItemId
    ] || EMPTY_SUMMARY;

  const selectedReaction =
    getReactionDefinition(
      activeSummary.currentUserReaction
    );

  const topInset = Math.max(
    insets.top,
    Platform.OS === "android"
      ? 18
      : 12
  );

  const bottomInset = Math.max(
    insets.bottom,
    16
  );

  const isLandscape =
    width > height;

  const hasCaption = Boolean(
    String(
      activeItem?.caption || ""
    ).trim()
  );

  const mediaBottomPadding =
    isLandscape ? 106 : 122;

  const scrollToIndex =
    useCallback(
      (
        index,
        animated = false
      ) => {
        if (
          !listRef.current ||
          !safeItems.length
        ) {
          return;
        }

        const safeIndex =
          Math.min(
            Math.max(
              Number(index) || 0,
              0
            ),
            safeItems.length - 1
          );

        listRef.current
          ?.scrollToOffset({
            offset:
              safeIndex * width,
            animated,
          });
      },
      [
        safeItems.length,
        width,
      ]
    );

  const loadSummary =
    useCallback(
      async (
        galleryItemId
      ) => {
        if (!galleryItemId) {
          return;
        }

        try {
          setLoadingSummaryId(
            galleryItemId
          );

          const result =
            await fetchPartnerGalleryInteractionSummary({
              galleryItemId,
              currentUserId,
            });

          if (!result.ok) {
            throw result.error;
          }

          setSummariesByItemId(
            (current) => ({
              ...current,
              [galleryItemId]:
                result.summary ||
                EMPTY_SUMMARY,
            })
          );
        } catch (error) {
          console.log(
            "PartnerGalleryViewer summary error:",
            error
          );
        } finally {
          setLoadingSummaryId(
            (currentId) =>
              currentId ===
              galleryItemId
                ? null
                : currentId
          );
        }
      },
      [currentUserId]
    );

  useEffect(() => {
    if (!visible) {
      return;
    }

    ScreenOrientation.lockAsync(
      ScreenOrientation
        .OrientationLock.DEFAULT
    ).catch((error) => {
      console.log(
        "PartnerGalleryViewer orientation unlock error:",
        error
      );
    });

    return () => {
      ScreenOrientation.lockAsync(
        ScreenOrientation
          .OrientationLock.PORTRAIT_UP
      ).catch((error) => {
        console.log(
          "PartnerGalleryViewer portrait restore error:",
          error
        );
      });
    };
  }, [visible]);

  useEffect(() => {
    const wasVisible =
      previousVisibleRef.current;

    previousVisibleRef.current =
      visible;

    if (!visible || wasVisible) {
      return;
    }

    const openingIndex =
      safeInitialIndex;

    const openingItemId =
      safeItems[
        openingIndex
      ]?.id || null;

    setActiveIndex(
      openingIndex
    );

    activeItemIdRef.current =
      openingItemId;

    setReactionTrayVisible(
      false
    );

    setCommentsVisible(false);

    const timer = setTimeout(
      () => {
        listRef.current
          ?.scrollToOffset({
            offset:
              openingIndex *
              width,
            animated: false,
          });
      },
      120
    );

    return () =>
      clearTimeout(timer);
  }, [
    safeInitialIndex,
    safeItems,
    visible,
    width,
  ]);

  useEffect(() => {
    if (
      !visible ||
      !activeItemId
    ) {
      return;
    }

    setReactionTrayVisible(
      false
    );

    setViewerChromeVisible(
      true
    );

    loadSummary(
      activeItemId
    );
  }, [
    activeItemId,
    loadSummary,
    visible,
  ]);

  useEffect(() => {
    if (
      !visible ||
      safeItems.length === 0
    ) {
      previousDimensionsRef.current = {
        width,
        height,
      };

      return;
    }

    const previousDimensions =
      previousDimensionsRef.current;

    const dimensionsChanged =
      previousDimensions.width !==
        width ||
      previousDimensions.height !==
        height;

    previousDimensionsRef.current = {
      width,
      height,
    };

    if (!dimensionsChanged) {
      return;
    }

    const rememberedItemId =
      activeItemIdRef.current;

    let retainedIndex =
      rememberedItemId
        ? safeItems.findIndex(
            (item) =>
              item?.id ===
              rememberedItemId
          )
        : activeIndex;

    if (retainedIndex < 0) {
      retainedIndex =
        Math.min(
          Math.max(
            activeIndex,
            0
          ),
          safeItems.length - 1
        );
    }

    setRepositioningForRotation(
      true
    );

    setActiveIndex(
      retainedIndex
    );

    const firstFrame =
      requestAnimationFrame(() => {
        listRef.current
          ?.scrollToOffset({
            offset:
              retainedIndex *
              width,
            animated: false,
          });

        const secondFrame =
          requestAnimationFrame(() => {
            listRef.current
              ?.scrollToOffset({
                offset:
                  retainedIndex *
                  width,
                animated: false,
              });

            setRepositioningForRotation(
              false
            );
          });

        rotationSecondFrameRef.current =
          secondFrame;
      });

    rotationFirstFrameRef.current =
      firstFrame;

    return () => {
      if (
        rotationFirstFrameRef.current
      ) {
        cancelAnimationFrame(
          rotationFirstFrameRef.current
        );
      }

      if (
        rotationSecondFrameRef.current
      ) {
        cancelAnimationFrame(
          rotationSecondFrameRef.current
        );
      }
    };
  }, [
    activeIndex,
    height,
    safeItems,
    visible,
    width,
  ]);

  function handleMomentumScrollEnd(
    event
  ) {
    const offsetX =
      event?.nativeEvent
        ?.contentOffset?.x || 0;

    const nextIndex =
      Math.round(
        offsetX / width
      );

    setActiveIndex(
      Math.min(
        Math.max(
          nextIndex,
          0
        ),
        Math.max(
          safeItems.length - 1,
          0
        )
      )
    );
  }

  async function handleShare() {
    try {
      const mediaUrl =
        activeItem?.media_url ||
        activeItem?.thumbnail_url ||
        "";

      if (!mediaUrl) {
        return;
      }

      const caption = String(
        activeItem?.caption || ""
      ).trim();

      const message = [
        caption,
        mediaUrl,
      ]
        .filter(Boolean)
        .join("\n\n");

      await Share.share({
        message,
        url:
          Platform.OS === "ios"
            ? mediaUrl
            : undefined,
      });
    } catch (error) {
      console.log(
        "PartnerGalleryViewer share error:",
        error
      );
    }
  }

  async function handleReaction(
    reactionType
  ) {
    try {
      setReactionTrayVisible(
        false
      );

      if (
        savingReaction ||
        !activeItemId
      ) {
        return;
      }

      if (!currentUserId) {
        Alert.alert(
          "Sign in required",
          "You need to be signed in to react to gallery images."
        );

        return;
      }

      setSavingReaction(true);

      const existingReaction =
        activeSummary
          .currentUserReaction;

      if (
        existingReaction ===
        reactionType
      ) {
        const result =
          await removePartnerGalleryReaction({
            galleryItemId:
              activeItemId,
            userId:
              currentUserId,
          });

        if (!result.ok) {
          throw result.error;
        }
      } else {
        const result =
          await setPartnerGalleryReaction({
            galleryItemId:
              activeItemId,
            userId:
              currentUserId,
            reactionType,
          });

        if (!result.ok) {
          throw result.error;
        }
      }

      await loadSummary(
        activeItemId
      );
    } catch (error) {
      console.log(
        "PartnerGalleryViewer reaction error:",
        error
      );

      Alert.alert(
        "Gallery reaction",
        error?.message ||
          "We couldn't save your reaction."
      );
    } finally {
      setSavingReaction(false);
    }
  }

  function handleLikePress() {
    handleReaction("like");
  }

  function handleLikeLongPress() {
    if (
      savingReaction ||
      !activeItemId
    ) {
      return;
    }

    setReactionTrayVisible(
      true
    );
  }

  function handleOpenComments() {
    if (!activeItemId) {
      return;
    }

    setReactionTrayVisible(
      false
    );

    setCommentsVisible(true);
  }

  const handleCommentCountChange =
    useCallback(
      (
        galleryItemId,
        commentCount
      ) => {
        if (!galleryItemId) {
          return;
        }

        setSummariesByItemId(
          (current) => ({
            ...current,
            [galleryItemId]: {
              ...EMPTY_SUMMARY,
              ...(current[
                galleryItemId
              ] || {}),
              commentCount:
                Number(
                  commentCount
                ) || 0,
            },
          })
        );
      },
      []
    );

  function renderItem({
    item,
  }) {
    const isVideo =
      String(
        item?.media_type || ""
      ).toLowerCase() ===
      "video";

    const previewUrl = isVideo
      ? item?.thumbnail_url || ""
      : item?.media_url || "";

    return (
      <Pressable
        onPress={
          handleToggleViewerChrome
        }
        style={{
          width,
          height,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor:
            VIEWER_BACKGROUND,
        }}
      >
        {previewUrl ? (
          <Image
            source={{
              uri: previewUrl,
            }}
            resizeMode="contain"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width,
              height,
            }}
          />
        ) : (
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={
                isVideo
                  ? "videocam-outline"
                  : "image-outline"
              }
              size={54}
              color={MUTED_LIGHT}
            />

            <Text
              style={{
                color: MUTED_LIGHT,
                fontSize: 14,
                fontWeight: "800",
                marginTop: 12,
              }}
            >
              Preview unavailable
            </Text>
          </View>
        )}

        {isVideo ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              width: 68,
              height: 68,
              borderRadius: 34,
              backgroundColor:
                "rgba(0, 0, 0, 0.62)",
              borderWidth: 1,
              borderColor:
                "rgba(255, 255, 255, 0.65)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="play"
              size={32}
              color={SURFACE}
              style={{
                marginLeft: 3,
              }}
            />
          </View>
        ) : null}
            </Pressable>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      supportedOrientations={[
        "portrait",
        "portrait-upside-down",
        "landscape",
        "landscape-left",
        "landscape-right",
      ]}
      onRequestClose={
        commentsVisible
          ? () =>
              setCommentsVisible(
                false
              )
          : onClose
      }
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={
          VIEWER_BACKGROUND
        }
      />

      <View
        style={{
          flex: 1,
          backgroundColor:
            VIEWER_BACKGROUND,
        }}
      >
        <FlatList
          ref={listRef}
          data={safeItems}
          style={{
            opacity:
              repositioningForRotation
                ? 0
                : 1,
          }}
          keyExtractor={(
            item,
            index
          ) =>
            item?.id ||
            `viewer-${index}`
          }
          horizontal
          pagingEnabled
          scrollEnabled={
            !commentsVisible &&
            !reactionTrayVisible
          }
          decelerationRate="fast"
          disableIntervalMomentum
          snapToInterval={width}
          snapToAlignment="start"
          showsHorizontalScrollIndicator={
            false
          }
          renderItem={renderItem}
          initialScrollIndex={
            safeInitialIndex
          }
          getItemLayout={(
            _data,
            index
          ) => ({
            length: width,
            offset:
              width * index,
            index,
          })}
          onMomentumScrollEnd={
            handleMomentumScrollEnd
          }
          onScrollToIndexFailed={(
            info
          ) => {
            setTimeout(() => {
              listRef.current
                ?.scrollToOffset({
                  offset:
                    info.index *
                    width,
                  animated: false,
                });
            }, 120);
          }}
          windowSize={3}
          initialNumToRender={2}
          maxToRenderPerBatch={3}
        />

        {repositioningForRotation ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor:
                VIEWER_BACKGROUND,
            }}
          />
        ) : null}

        {viewerChromeVisible ? (
          <>

        <View
          style={{
            position: "absolute",
            top: topInset + 8,
            left: 16,
            right: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent:
              "space-between",
            zIndex: 30,
            elevation: 30,
          }}
        >
          <View
            style={{
              minWidth: 62,
              minHeight: 38,
              paddingHorizontal: 13,
              borderRadius: 999,
              backgroundColor:
                "rgba(0, 0, 0, 0.50)",
              borderWidth: 1,
              borderColor:
                "rgba(255,255,255,0.12)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: SURFACE,
                fontSize: 13,
                fontWeight: "900",
              }}
            >
              {safeItems.length
                ? `${activeIndex + 1} / ${safeItems.length}`
                : "0 / 0"}
            </Text>
          </View>

          <ViewerControl
            icon="close"
            onPress={onClose}
          />
        </View>

        {hasCaption ? (
          <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              left:
                isLandscape
                  ? 72
                  : 18,
              right:
                isLandscape
                  ? 72
                  : 18,
              bottom:
                bottomInset +
                (isLandscape
                  ? 96
                  : 110),
              alignItems: "center",
              zIndex: 20,
              elevation: 20,
            }}
          >
            <View
              style={{
                maxWidth:
                  isLandscape
                    ? 720
                    : 560,
                width: "100%",
                maxHeight:
                  isLandscape
                    ? 66
                    : 104,
                borderRadius: 20,
                backgroundColor:
                  "rgba(0, 0, 0, 0.68)",
                borderWidth: 1,
                borderColor:
                  "rgba(255, 255, 255, 0.14)",
                paddingHorizontal: 16,
                paddingVertical:
                  isLandscape
                    ? 9
                    : 12,
              }}
            >
              <Text
                numberOfLines={
                  isLandscape
                    ? 2
                    : 3
                }
                style={{
                  fontFamily:
                    displayFont,
                  color: SURFACE,
                  fontSize:
                    isLandscape
                      ? 14
                      : 15,
                  lineHeight:
                    isLandscape
                      ? 19
                      : 21,
                  fontWeight: "900",
                  textAlign: "center",
                }}
              >
                {activeItem.caption}
              </Text>
            </View>
          </View>
        ) : null}

        {activeSummary.totalReactions >
          0 ||
        activeSummary.commentCount >
          0 ? (
          <View
            style={{
              position: "absolute",
              left: 18,
              right: 18,
              bottom:
                bottomInset + 70,
              flexDirection: "row",
              alignItems: "center",
              justifyContent:
                "space-between",
              zIndex: 25,
              elevation: 25,
            }}
          >
            <Text
              style={{
                color: MUTED_LIGHT,
                fontSize: 12,
                fontWeight: "800",
              }}
            >
              {activeSummary
                .totalReactions > 0
                ? `${activeSummary.totalReactions} ${
                    activeSummary
                      .totalReactions ===
                    1
                      ? "reaction"
                      : "reactions"
                  }`
                : ""}
            </Text>

            <Text
              style={{
                color: MUTED_LIGHT,
                fontSize: 12,
                fontWeight: "800",
              }}
            >
              {activeSummary
                .commentCount > 0
                ? `${activeSummary.commentCount} ${
                    activeSummary
                      .commentCount ===
                    1
                      ? "comment"
                      : "comments"
                  }`
                : ""}
            </Text>
          </View>
        ) : null}

        {reactionTrayVisible ? (
          <>
            <Pressable
              onPress={() =>
                setReactionTrayVisible(
                  false
                )
              }
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 38,
                elevation: 38,
              }}
            />

            <View
              style={{
                position: "absolute",
                left: 12,
                right: 12,
                bottom:
                  bottomInset + 66,
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 8,
                backgroundColor:
                  SURFACE,
                flexDirection: "row",
                alignItems: "center",
                justifyContent:
                  "space-between",
                shadowColor:
                  "#000000",
                shadowOpacity: 0.3,
                shadowRadius: 14,
                shadowOffset: {
                  width: 0,
                  height: 5,
                },
                elevation: 40,
                zIndex: 40,
              }}
            >
              {REACTIONS.map(
                (reaction) => (
                  <Pressable
                    key={reaction.key}
                    onPress={() =>
                      handleReaction(
                        reaction.key
                      )
                    }
                    disabled={
                      savingReaction
                    }
                    style={({ pressed }) => ({
                      flex: 1,
                      minHeight: 48,
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      borderRadius: 24,
                      backgroundColor:
                        activeSummary
                          .currentUserReaction ===
                        reaction.key
                          ? "rgba(180,83,9,0.12)"
                          : pressed
                            ? "rgba(79,99,59,0.10)"
                            : "transparent",
                      transform: [
                        {
                          scale:
                            pressed
                              ? 1.18
                              : 1,
                        },
                      ],
                    })}
                  >
                    <Text
                      style={{
                        fontSize: 27,
                        lineHeight: 32,
                      }}
                    >
                      {reaction.emoji}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
          </>
        ) : null}

        <View
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom:
              bottomInset + 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent:
              "center",
            gap: 8,
            zIndex: 30,
            elevation: 30,
          }}
        >
          <InteractionButton
            icon="thumbs-up-outline"
            emoji={
              selectedReaction?.emoji
            }
            label={
              selectedReaction?.label ||
              "Like"
            }
            active={
              Boolean(
                selectedReaction
              )
            }
            disabled={
              savingReaction
            }
            onPress={
              handleLikePress
            }
            onLongPress={
              handleLikeLongPress
            }
          />

          <InteractionButton
            icon="chatbubble-outline"
            label="Comment"
            disabled={
              !activeItemId
            }
            onPress={
              handleOpenComments
            }
          />

          <InteractionButton
            icon="share-social-outline"
            label="Share"
            disabled={
              !activeItem
                ?.media_url &&
              !activeItem
                ?.thumbnail_url
            }
            onPress={handleShare}
          />


        </View>

                  </>
        ) : null}

        <PartnerGalleryCommentsModal
          visible={commentsVisible}
          galleryItem={activeItem}
          currentUserId={
            currentUserId
          }
          canManage={canManage}
          onClose={() =>
            setCommentsVisible(false)
          }
          onCommentCountChange={
            handleCommentCountChange
          }
        />
      </View>
    </Modal>
  );
}