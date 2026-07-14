import { Ionicons } from "@expo/vector-icons";
import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
    createPartnerGalleryComment,
    deletePartnerGalleryComment,
    fetchPartnerGalleryComments,
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
  "rgba(15, 23, 42, 0.12)";

const displayFont =
  Platform.OS === "ios"
    ? "Georgia"
    : "serif";

function getInitials(name) {
  const cleanName = String(
    name || ""
  ).trim();

  if (!cleanName) {
    return "T";
  }

  return cleanName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase()
    )
    .join("");
}

function formatCommentDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();

  const differenceMinutes =
    Math.floor(
      (now.getTime() -
        date.getTime()) /
        60000
    );

  if (differenceMinutes < 1) {
    return "Just now";
  }

  if (differenceMinutes < 60) {
    return `${differenceMinutes}m`;
  }

  const differenceHours =
    Math.floor(
      differenceMinutes / 60
    );

  if (differenceHours < 24) {
    return `${differenceHours}h`;
  }

  const differenceDays =
    Math.floor(
      differenceHours / 24
    );

  if (differenceDays < 7) {
    return `${differenceDays}d`;
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

function CommentAvatar({
  profile,
}) {
  const displayName =
    profile?.display_name ||
    "Triunely member";

  if (profile?.avatar_url) {
    return (
      <Image
        source={{
          uri: profile.avatar_url,
        }}
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor:
            OLIVE_SOFT,
          borderWidth: 1,
          borderColor:
            OLIVE_BORDER,
        }}
      />
    );
  }

  return (
    <View
      style={{
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor:
          OLIVE_SOFT,
        borderWidth: 1,
        borderColor:
          OLIVE_BORDER,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: OLIVE,
          fontSize: 13,
          fontWeight: "900",
        }}
      >
        {getInitials(displayName)}
      </Text>
    </View>
  );
}

function GalleryComment({
  comment,
  currentUserId,
  canManage = false,
  deleting = false,
  onDelete,
}) {
  const profile =
    comment?.profile || null;

  const displayName =
    profile?.display_name ||
    (comment?.user_id ===
    currentUserId
      ? "You"
      : "Triunely member");

  const canDelete =
    Boolean(
      comment?.id &&
        (comment.user_id ===
          currentUserId ||
          canManage)
    );

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 15,
      }}
    >
      <CommentAvatar
        profile={profile}
      />

      <View
        style={{
          flex: 1,
          minWidth: 0,
          marginLeft: 10,
        }}
      >
        <View
          style={{
            backgroundColor:
              SURFACE,
            borderRadius: 18,
            borderWidth: 1,
            borderColor:
              CARD_BORDER,
            paddingHorizontal: 13,
            paddingVertical: 11,
            shadowColor: SHADOW,
            shadowOpacity: 0.05,
            shadowRadius: 6,
            shadowOffset: {
              width: 0,
              height: 2,
            },
            elevation: 1,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                color: TEXT,
                fontSize: 13,
                fontWeight: "900",
              }}
            >
              {displayName}
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 10.5,
                fontWeight: "800",
                marginLeft: 8,
              }}
            >
              {formatCommentDate(
                comment?.created_at
              )}
            </Text>
          </View>

          <Text
            style={{
              color: TEXT,
              fontSize: 13.5,
              lineHeight: 19,
              fontWeight: "700",
              marginTop: 5,
            }}
          >
            {comment?.content || ""}
          </Text>
        </View>

        {canDelete ? (
          <Pressable
            onPress={() =>
              onDelete?.(comment)
            }
            disabled={deleting}
            hitSlop={6}
            style={({ pressed }) => ({
              alignSelf: "flex-start",
              marginTop: 5,
              paddingHorizontal: 4,
              paddingVertical: 3,
              opacity: deleting
                ? 0.4
                : pressed
                  ? 0.6
                  : 1,
            })}
          >
            <Text
              style={{
                color:
                  comment?.user_id ===
                  currentUserId
                    ? MUTED
                    : EVENT_BROWN,
                fontSize: 11,
                fontWeight: "900",
              }}
            >
              {deleting
                ? "Deleting…"
                : "Delete"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function PartnerGalleryCommentsModal({
  visible = false,
  galleryItem = null,
  currentUserId = null,
  canManage = false,
  onClose,
  onCommentCountChange,
}) {
  const insets =
    useSafeAreaInsets();

  const scrollRef =
    useRef(null);

  const [
    comments,
    setComments,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    deletingCommentId,
    setDeletingCommentId,
  ] = useState(null);

  const [
    commentText,
    setCommentText,
  ] = useState("");

  const galleryItemId =
    galleryItem?.id || null;

  const loadComments =
    useCallback(async () => {
      if (!galleryItemId) {
        setComments([]);
        return;
      }

      try {
        setLoading(true);

        const result =
          await fetchPartnerGalleryComments({
            galleryItemId,
            limit: 100,
          });

        if (!result.ok) {
          throw result.error;
        }

        const nextComments =
          result.comments || [];

        setComments(nextComments);
      } catch (error) {
        console.log(
          "PartnerGalleryCommentsModal load error:",
          error
        );

        Alert.alert(
          "Gallery comments",
          error?.message ||
            "We couldn't load these comments."
        );
      } finally {
        setLoading(false);
      }
    }, [
      galleryItemId,
    ]);

  useEffect(() => {
    if (!visible) {
      setComments([]);
      setCommentText("");
      setLoading(false);
      setSending(false);
      setDeletingCommentId(null);
      return;
    }

    loadComments();
  }, [
    loadComments,
    visible,
  ]);

  async function handleSubmit() {
    try {
      if (
        sending ||
        !galleryItemId
      ) {
        return;
      }

      const cleanComment =
        String(
          commentText || ""
        ).trim();

      if (!cleanComment) {
        return;
      }

      if (!currentUserId) {
        Alert.alert(
          "Sign in required",
          "You need to be signed in to comment."
        );
        return;
      }

      setSending(true);

      const result =
        await createPartnerGalleryComment({
          galleryItemId,
          userId:
            currentUserId,
          content:
            cleanComment,
        });

      if (
        !result.ok ||
        !result.comment
      ) {
        throw (
          result.error ||
          new Error(
            "The comment was not created."
          )
        );
      }

      const nextComments = [
        ...comments,
        result.comment,
      ];

      setComments(nextComments);
      setCommentText("");

      onCommentCountChange?.(
        galleryItemId,
        nextComments.length
      );

      setTimeout(() => {
        scrollRef.current
          ?.scrollToEnd({
            animated: true,
          });
      }, 100);
    } catch (error) {
      console.log(
        "PartnerGalleryCommentsModal submit error:",
        error
      );

      Alert.alert(
        "Post comment",
        error?.message ||
          "We couldn't post your comment."
      );
    } finally {
      setSending(false);
    }
  }

  function requestDelete(
    comment
  ) {
    if (
      !comment?.id ||
      deletingCommentId
    ) {
      return;
    }

    Alert.alert(
      "Delete comment?",
      canManage &&
        comment.user_id !==
          currentUserId
        ? "This comment will be removed from the Partner Gallery."
        : "Your comment will be permanently removed.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            handleDelete(comment),
        },
      ]
    );
  }

  async function handleDelete(
    comment
  ) {
    try {
      setDeletingCommentId(
        comment.id
      );

      const result =
        await deletePartnerGalleryComment(
          comment.id
        );

      if (!result.ok) {
        throw result.error;
      }

      const nextComments =
        comments.filter(
          (existingComment) =>
            existingComment.id !==
            comment.id
        );

      setComments(nextComments);

      onCommentCountChange?.(
        galleryItemId,
        nextComments.length
      );
    } catch (error) {
      console.log(
        "PartnerGalleryCommentsModal delete error:",
        error
      );

      Alert.alert(
        "Delete comment",
        error?.message ||
          "We couldn't delete this comment."
      );
    } finally {
      setDeletingCommentId(
        null
      );
    }
  }

  if (!visible) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      pointerEvents="box-none"
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        elevation: 100,
      }}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor:
            "rgba(15, 23, 42, 0.58)",
          justifyContent:
            "flex-end",
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            height: "82%",
            backgroundColor:
              PREMIUM_CREAM,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            borderTopWidth: 1,
            borderColor:
              CARD_BORDER,
            overflow: "hidden",
            shadowColor:
              "#000000",
            shadowOpacity: 0.2,
            shadowRadius: 20,
            shadowOffset: {
              width: 0,
              height: -6,
            },
            elevation: 20,
          }}
        >
          <View
            style={{
              paddingTop: 10,
              paddingHorizontal: 16,
              paddingBottom: 12,
              backgroundColor:
                SURFACE,
              borderBottomWidth: 1,
              borderBottomColor:
                CARD_BORDER,
            }}
          >
            <View
              style={{
                width: 44,
                height: 5,
                borderRadius: 999,
                backgroundColor:
                  "rgba(107,114,128,0.32)",
                alignSelf: "center",
                marginBottom: 13,
              }}
            />

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor:
                    AMBER_SOFT,
                  borderWidth: 1,
                  borderColor:
                    AMBER_BORDER,
                  alignItems: "center",
                  justifyContent:
                    "center",
                  marginRight: 10,
                }}
              >
                <Ionicons
                  name="chatbubbles-outline"
                  size={20}
                  color={EVENT_AMBER}
                />
              </View>

              <View
                style={{
                  flex: 1,
                  minWidth: 0,
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
                    letterSpacing:
                      -0.35,
                  }}
                >
                  Comments
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 12,
                    fontWeight: "700",
                    marginTop: 1,
                  }}
                >
                  {comments.length ===
                  1
                    ? "1 comment"
                    : `${comments.length} comments`}
                </Text>
              </View>

              <Pressable
                onPress={onClose}
                hitSlop={10}
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor:
                    pressed
                      ? OLIVE_SOFT
                      : PREMIUM_CREAM,
                  borderWidth: 1,
                  borderColor:
                    CARD_BORDER,
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  opacity:
                    pressed
                      ? 0.72
                      : 1,
                })}
              >
                <Ionicons
                  name="close"
                  size={23}
                  color={OLIVE}
                />
              </Pressable>
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            style={{
              flex: 1,
            }}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 24,
              flexGrow: 1,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={
              false
            }
          >
            {loading ? (
              <View
                style={{
                  flex: 1,
                  minHeight: 220,
                  alignItems: "center",
                  justifyContent:
                    "center",
                }}
              >
                <ActivityIndicator
                  size="large"
                  color={EVENT_AMBER}
                />

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 13,
                    fontWeight: "800",
                    marginTop: 10,
                  }}
                >
                  Loading comments…
                </Text>
              </View>
            ) : comments.length ===
              0 ? (
              <View
                style={{
                  flex: 1,
                  minHeight: 220,
                  alignItems: "center",
                  justifyContent:
                    "center",
                  paddingHorizontal: 24,
                }}
              >
                <View
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 29,
                    backgroundColor:
                      OLIVE_SOFT,
                    borderWidth: 1,
                    borderColor:
                      OLIVE_BORDER,
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                  }}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={27}
                    color={OLIVE}
                  />
                </View>

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
                    marginTop: 12,
                  }}
                >
                  Start the conversation
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 13,
                    lineHeight: 19,
                    fontWeight: "700",
                    textAlign:
                      "center",
                    marginTop: 6,
                  }}
                >
                  Be the first to comment on
                  this gallery image.
                </Text>
              </View>
            ) : (
              comments.map(
                (comment) => (
                  <GalleryComment
                    key={comment.id}
                    comment={comment}
                    currentUserId={
                      currentUserId
                    }
                    canManage={
                      canManage
                    }
                    deleting={
                      deletingCommentId ===
                      comment.id
                    }
                    onDelete={
                      requestDelete
                    }
                  />
                )
              )
            )}
          </ScrollView>

          <View
            style={{
              backgroundColor:
                SURFACE,
              borderTopWidth: 1,
              borderTopColor:
                CARD_BORDER,
              paddingHorizontal: 14,
              paddingTop: 10,
              paddingBottom:
                Math.max(
                  insets.bottom,
                  12
                ),
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                backgroundColor:
                  PREMIUM_CREAM,
                borderRadius: 22,
                borderWidth: 1,
                borderColor:
                  commentText.trim()
                    ? AMBER_BORDER
                    : CARD_BORDER,
                paddingLeft: 13,
                paddingRight: 6,
                paddingVertical: 6,
              }}
            >
              <TextInput
                value={commentText}
                onChangeText={
                  setCommentText
                }
                placeholder="Write a comment…"
                placeholderTextColor={
                  MUTED
                }
                multiline
                maxLength={2000}
                editable={!sending}
                style={{
                  flex: 1,
                  maxHeight: 110,
                  minHeight: 38,
                  color: TEXT,
                  fontSize: 14,
                  lineHeight: 19,
                  fontWeight: "700",
                  paddingTop: 9,
                  paddingBottom: 8,
                  paddingRight: 8,
                  textAlignVertical:
                    "top",
                }}
              />

              <Pressable
                onPress={handleSubmit}
                disabled={
                  sending ||
                  !commentText.trim()
                }
                style={({ pressed }) => ({
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor:
                    EVENT_AMBER,
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  opacity:
                    sending ||
                    !commentText.trim()
                      ? 0.38
                      : pressed
                        ? 0.76
                        : 1,
                  transform: [
                    {
                      translateY:
                        pressed
                          ? 2
                          : 0,
                    },
                    {
                      scale:
                        pressed
                          ? 0.96
                          : 1,
                    },
                  ],
                })}
              >
                {sending ? (
                  <ActivityIndicator
                    size="small"
                    color={SURFACE}
                  />
                ) : (
                  <Ionicons
                    name="arrow-up"
                    size={21}
                    color={SURFACE}
                  />
                )}
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </KeyboardAvoidingView>
  );
}