// C:\triunely\src\components\NetworkPostInteractionBar.js

import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
    Modal,
    Platform,
    Pressable,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SURFACE = "#FFFFFF";
const PREMIUM_CREAM = "#FFFCF5";
const HEAVENLY_GOLD = "#B45309";
const EVENT_BROWN = "#7C2D12";
const DEEP_OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";

const SOFT_GOLD_BG = "rgba(180, 83, 9, 0.10)";
const GOLD_BORDER = "rgba(180, 83, 9, 0.18)";
const SOFT_OLIVE_BG = "rgba(79, 99, 59, 0.10)";
const OLIVE_BORDER = "rgba(79, 99, 59, 0.18)";
const CARD_BORDER = "rgba(15, 23, 42, 0.08)";
const SHADOW = "rgba(15, 23, 42, 0.18)";

const displayFont =
  Platform.OS === "ios"
    ? "Georgia"
    : "serif";

const REACTION_OPTIONS = [
  {
    type: "like",
    label: "Like",
    emoji: "👍",
  },
  {
    type: "love",
    label: "Love",
    emoji: "❤️",
  },
  {
    type: "pray",
    label: "Pray",
    emoji: "🙏",
  },
  {
    type: "laugh",
    label: "Laugh",
    emoji: "😂",
  },
  {
    type: "sad",
    label: "Sad",
    emoji: "😢",
  },
  {
    type: "support",
    label: "Support",
    emoji: "🤝",
  },
];

function getReactionOption(type) {
  return (
    REACTION_OPTIONS.find(
      (option) =>
        option.type === type
    ) || null
  );
}

function getLeadingReactionEmojis(
  reactionCounts
) {
  return REACTION_OPTIONS
    .filter(
      (option) =>
        Number(
          reactionCounts?.[
            option.type
          ] || 0
        ) > 0
    )
    .sort(
      (first, second) =>
        Number(
          reactionCounts?.[
            second.type
          ] || 0
        ) -
        Number(
          reactionCounts?.[
            first.type
          ] || 0
        )
    )
    .slice(0, 3);
}

export default function NetworkPostInteractionBar({
  post,
  reactionBusy = false,
  onReact,
  onComment,
  onShare,
}) {
  const insets = useSafeAreaInsets();

  const [
    reactionPickerVisible,
    setReactionPickerVisible,
  ] = useState(false);

  const viewerReaction =
    post?.viewer_reaction || null;

  const selectedReaction =
    getReactionOption(
      viewerReaction
    );

  const reactionCount =
    Number(
      post?.reaction_count || 0
    );

  const commentCount =
    Number(
      post?.comment_count || 0
    );

  const reactionCounts =
    post?.reaction_counts &&
    typeof post.reaction_counts ===
      "object"
      ? post.reaction_counts
      : {};

  const leadingReactions =
    useMemo(
      () =>
        getLeadingReactionEmojis(
          reactionCounts
        ),
      [reactionCounts]
    );

  function handleDefaultReaction() {
    if (
      reactionBusy ||
      typeof onReact !==
        "function"
    ) {
      return;
    }

    onReact(
      post,
      viewerReaction || "like"
    );
  }

  function handleChooseReaction(
    reactionType
  ) {
    if (
      reactionBusy ||
      typeof onReact !==
        "function"
    ) {
      return;
    }

    setReactionPickerVisible(
      false
    );

    onReact(
      post,
      reactionType
    );
  }

  return (
    <>
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor:
            CARD_BORDER,
          backgroundColor:
            PREMIUM_CREAM,
        }}
      >
        {reactionCount > 0 ||
        commentCount > 0 ? (
          <View
            style={{
              minHeight: 38,
              paddingHorizontal: 15,
              paddingTop: 9,
              paddingBottom: 7,
              flexDirection: "row",
              alignItems: "center",
              justifyContent:
                "space-between",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flex: 1,
                minWidth: 0,
              }}
            >
              {leadingReactions.map(
                (
                  reaction,
                  index
                ) => (
                  <View
                    key={reaction.type}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor:
                        SURFACE,
                      borderWidth: 1,
                      borderColor:
                        GOLD_BORDER,
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      marginLeft:
                        index === 0
                          ? 0
                          : -5,
                      zIndex:
                        leadingReactions.length -
                        index,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                      }}
                    >
                      {
                        reaction.emoji
                      }
                    </Text>
                  </View>
                )
              )}

              {reactionCount > 0 ? (
                <Text
                  style={{
                    color: MUTED,
                    fontSize: 11.5,
                    fontWeight: "800",
                    marginLeft:
                      leadingReactions
                        .length > 0
                        ? 7
                        : 0,
                  }}
                >
                  {reactionCount}
                </Text>
              ) : null}
            </View>

            {commentCount > 0 ? (
              <Text
                style={{
                  color: MUTED,
                  fontSize: 11.5,
                  fontWeight: "800",
                  marginLeft: 12,
                }}
              >
                {commentCount}{" "}
                {commentCount === 1
                  ? "comment"
                  : "comments"}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View
          style={{
            minHeight: 52,
            paddingHorizontal: 8,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Pressable
            disabled={
              reactionBusy
            }
            onPress={
              handleDefaultReaction
            }
            onLongPress={() => {
              if (
                !reactionBusy
              ) {
                setReactionPickerVisible(
                  true
                );
              }
            }}
            delayLongPress={260}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 42,
              borderRadius: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent:
                "center",
              backgroundColor:
                pressed
                  ? selectedReaction
                    ? SOFT_GOLD_BG
                    : SOFT_OLIVE_BG
                  : "transparent",
              opacity:
                reactionBusy
                  ? 0.55
                  : 1,
            })}
          >
            {selectedReaction ? (
              <Text
                style={{
                  fontSize: 18,
                }}
              >
                {
                  selectedReaction.emoji
                }
              </Text>
            ) : (
              <Ionicons
                name="heart-outline"
                size={18}
                color={
                  DEEP_OLIVE
                }
              />
            )}

            <Text
              style={{
                color:
                  selectedReaction
                    ? EVENT_BROWN
                    : DEEP_OLIVE,
                fontSize: 11.5,
                fontWeight: "900",
                marginLeft: 6,
              }}
            >
              {selectedReaction
                ? selectedReaction.label
                : reactionBusy
                  ? "Updating…"
                  : "React"}
            </Text>
          </Pressable>

          <Pressable
            disabled={
              !post
                ?.comments_enabled
            }
            onPress={() =>
              onComment?.(post)
            }
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 42,
              borderRadius: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent:
                "center",
              backgroundColor:
                pressed
                  ? SOFT_OLIVE_BG
                  : "transparent",
              opacity:
                post
                  ?.comments_enabled
                  ? 1
                  : 0.48,
            })}
          >
            <Ionicons
              name={
                post
                  ?.comments_enabled
                  ? "chatbubble-ellipses-outline"
                  : "chatbubble-ellipses"
              }
              size={18}
              color={
                post
                  ?.comments_enabled
                  ? DEEP_OLIVE
                  : MUTED
              }
            />

            <Text
              style={{
                color:
                  post
                    ?.comments_enabled
                    ? DEEP_OLIVE
                    : MUTED,
                fontSize: 11.5,
                fontWeight: "900",
                marginLeft: 6,
              }}
            >
              {post
                ?.comments_enabled
                ? "Comment"
                : "Closed"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              onShare?.(post)
            }
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 42,
              borderRadius: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent:
                "center",
              backgroundColor:
                pressed
                  ? SOFT_OLIVE_BG
                  : "transparent",
            })}
          >
            <Ionicons
              name="share-social-outline"
              size={18}
              color={DEEP_OLIVE}
            />

            <Text
              style={{
                color: DEEP_OLIVE,
                fontSize: 11.5,
                fontWeight: "900",
                marginLeft: 6,
              }}
            >
              Share
            </Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={
          reactionPickerVisible
        }
        transparent
        animationType="slide"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={() =>
          setReactionPickerVisible(
            false
          )
        }
      >
        <View
          style={{
            flex: 1,
            justifyContent:
              "flex-end",
          }}
        >
          <Pressable
            onPress={() =>
              setReactionPickerVisible(
                false
              )
            }
            style={{
              position:
                "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor:
                "transparent",
            }}
          />

          <View
            style={{
              backgroundColor:
                PREMIUM_CREAM,
              borderTopLeftRadius:
                28,
              borderTopRightRadius:
                28,
              borderWidth: 1,
              borderColor:
                CARD_BORDER,
              paddingHorizontal:
                16,
              paddingTop: 11,
              paddingBottom:
                Math.max(
                  insets.bottom,
                  14
                ) + 10,
              shadowColor: SHADOW,
              shadowOpacity:
                0.22,
              shadowRadius: 20,
              shadowOffset: {
                width: 0,
                height: -6,
              },
              elevation: 18,
            }}
          >
            <View
              style={{
                width: 44,
                height: 5,
                borderRadius: 999,
                backgroundColor:
                  "rgba(79, 99, 59, 0.24)",
                alignSelf:
                  "center",
                marginBottom: 15,
              }}
            />

            <Text
              style={{
                fontFamily:
                  displayFont,
                color: TEXT,
                fontSize: 21,
                lineHeight: 26,
                fontWeight: "900",
                textAlign:
                  "center",
              }}
            >
              Choose a reaction
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 12,
                fontWeight: "700",
                lineHeight: 18,
                textAlign:
                  "center",
                marginTop: 4,
                marginBottom: 16,
              }}
            >
              Share how this post
              encouraged or moved
              you.
            </Text>

            <View
              style={{
                flexDirection: "row",
                justifyContent:
                  "space-between",
                gap: 6,
              }}
            >
              {REACTION_OPTIONS.map(
                (reaction) => {
                  const isSelected =
                    viewerReaction ===
                    reaction.type;

                  return (
                    <Pressable
                      key={
                        reaction.type
                      }
                      disabled={
                        reactionBusy
                      }
                      onPress={() =>
                        handleChooseReaction(
                          reaction.type
                        )
                      }
                      style={({ pressed }) => ({
                        flex: 1,
                        minHeight: 66,
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor:
                          isSelected
                            ? GOLD_BORDER
                            : OLIVE_BORDER,
                        backgroundColor:
                          pressed ||
                          isSelected
                            ? SOFT_GOLD_BG
                            : SURFACE,
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        opacity:
                          reactionBusy
                            ? 0.5
                            : 1,
                      })}
                    >
                      <Text
                        style={{
                          fontSize: 25,
                        }}
                      >
                        {
                          reaction.emoji
                        }
                      </Text>

                      <Text
                        style={{
                          color:
                            isSelected
                              ? EVENT_BROWN
                              : DEEP_OLIVE,
                          fontSize: 9.5,
                          fontWeight:
                            "900",
                          marginTop: 4,
                        }}
                      >
                        {
                          reaction.label
                        }
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}