// C:\triunely\src\components\NetworkPostCommentsSheet.js

import { Ionicons } from "@expo/vector-icons";
import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "../lib/supabase";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const DEEP_OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";
const DANGER = "#B42318";

const CARD_BORDER =
  "rgba(15, 23, 42, 0.09)";

const OLIVE_BORDER =
  "rgba(79, 99, 59, 0.18)";

const AMBER_BORDER =
  "rgba(180, 83, 9, 0.20)";

const DANGER_BORDER =
  "rgba(180, 35, 24, 0.18)";

const SOFT_OLIVE_BG =
  "rgba(79, 99, 59, 0.09)";

const SOFT_GOLD_BG =
  "rgba(180, 83, 9, 0.09)";

const SOFT_DANGER_BG =
  "rgba(180, 35, 24, 0.07)";

const MODAL_BACKDROP =
  "rgba(46, 34, 20, 0.48)";

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
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase()
    )
    .join("");
}

function formatCommentTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const difference =
    Date.now() -
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
        new Date().getFullYear()
          ? "numeric"
          : undefined,
    }
  );
}

function CommentAvatar({
  comment,
}) {
  const displayName =
    comment?.author_display_name ||
    "Triunely member";

  const isAnonymous =
    Boolean(
      comment?.is_anonymous
    );

  return (
    <View
      style={{
        width: 39,
        height: 39,
        borderRadius: 19.5,
        overflow: "hidden",
        backgroundColor:
          isAnonymous
            ? SOFT_GOLD_BG
            : SOFT_OLIVE_BG,
        borderWidth: 1,
        borderColor:
          isAnonymous
            ? AMBER_BORDER
            : OLIVE_BORDER,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 9,
      }}
    >
      {comment?.author_avatar_url ? (
        <Image
          source={{
            uri:
              comment.author_avatar_url,
          }}
          resizeMode="cover"
          style={{
            width: "100%",
            height: "100%",
          }}
        />
      ) : isAnonymous ? (
        <Ionicons
          name="person-outline"
          size={18}
          color={EVENT_AMBER}
        />
      ) : (
        <Text
          style={{
            color: DEEP_OLIVE,
            fontSize: 12,
            fontWeight: "900",
          }}
        >
          {getInitials(
            displayName
          )}
        </Text>
      )}
    </View>
  );
}

function ErrorNotice({
  message,
  onRetry,
}) {
  if (!message) {
    return null;
  }

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 9,
        borderRadius: 15,
        backgroundColor:
          SOFT_DANGER_BG,
        borderWidth: 1,
        borderColor:
          DANGER_BORDER,
        paddingHorizontal: 11,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <Ionicons
        name="alert-circle-outline"
        size={18}
        color={DANGER}
      />

      <Text
        style={{
          flex: 1,
          color: DANGER,
          fontSize: 11.5,
          lineHeight: 17,
          fontWeight: "800",
          marginLeft: 8,
        }}
      >
        {message}
      </Text>

      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => ({
            minHeight: 32,
            borderRadius: 999,
            paddingHorizontal: 10,
            alignItems: "center",
            justifyContent:
              "center",
            backgroundColor:
              pressed
                ? "rgba(180, 35, 24, 0.12)"
                : SURFACE,
            borderWidth: 1,
            borderColor:
              DANGER_BORDER,
            marginLeft: 8,
          })}
        >
          <Text
            style={{
              color: DANGER,
              fontSize: 10.5,
              fontWeight: "900",
            }}
          >
            Retry
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function NetworkPostCommentsSheet({
  visible,
  post,
  currentUserId,
  onClose,
  onCommentCountChange,
}) {
  const insets =
    useSafeAreaInsets();

  const [
    keyboardVisible,
    setKeyboardVisible,
  ] = useState(false);

  const scrollRef =
    useRef(null);

  useEffect(() => {
    const showSubscription =
      Keyboard.addListener(
        "keyboardDidShow",
        () => {
          setKeyboardVisible(true);

          setTimeout(() => {
            scrollRef.current
              ?.scrollToEnd?.({
                animated: true,
              });
          }, 140);
        }
      );

    const hideSubscription =
      Keyboard.addListener(
        "keyboardDidHide",
        () => {
          setKeyboardVisible(false);
        }
      );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

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
    deleteConfirmComment,
    setDeleteConfirmComment,
  ] = useState(null);

  const [
    text,
    setText,
  ] = useState("");

  const [
    anonymous,
    setAnonymous,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const loadComments =
    useCallback(
      async ({
        scrollToEnd = false,
      } = {}) => {
        if (!post?.id) {
          return;
        }

        try {
          setLoading(true);
          setErrorMessage("");

          const {
            data,
            error,
          } =
            await supabase.rpc(
              "get_network_post_comments_rpc",
              {
                target_post_id:
                  post.id,
                requested_limit:
                  200,
                requested_offset:
                  0,
              }
            );

          if (error) {
            throw error;
          }

          setComments(
            Array.isArray(data)
              ? data
              : []
          );

          if (scrollToEnd) {
            setTimeout(() => {
              scrollRef.current
                ?.scrollToEnd?.({
                  animated: true,
                });
            }, 100);
          }
        } catch (error) {
          console.log(
            "NETWORK COMMENTS LOAD ERROR:",
            error
          );

          setErrorMessage(
            error?.message ||
              "Triunely could not load these comments."
          );
        } finally {
          setLoading(false);
        }
      },
      [post?.id]
    );

  useEffect(() => {
    if (
      visible &&
      post?.id
    ) {
      setText("");
      setAnonymous(false);
      setDeleteConfirmComment(
        null
      );
      setErrorMessage("");

      loadComments();

      return;
    }

    if (!visible) {
      setComments([]);
      setText("");
      setAnonymous(false);
      setLoading(false);
      setSending(false);
      setDeletingCommentId(
        null
      );
      setDeleteConfirmComment(
        null
      );
      setErrorMessage("");
    }
  }, [
    loadComments,
    post?.id,
    visible,
  ]);

  async function submitComment() {
    const cleanText =
      text.trim();

    if (
      !cleanText ||
      !post?.id ||
      !currentUserId ||
      sending
    ) {
      return;
    }

    try {
      setSending(true);
      setErrorMessage("");

      const {
        error,
      } =
        await supabase.rpc(
          "create_network_post_comment_rpc",
          {
            target_post_id:
              post.id,
            requested_content:
              cleanText,
            requested_is_anonymous:
              anonymous,
            requested_parent_comment_id:
              null,
          }
        );

      if (error) {
        throw error;
      }

      setText("");
      setAnonymous(false);

      onCommentCountChange?.(
        post.id,
        1
      );

      await loadComments({
        scrollToEnd: true,
      });
    } catch (error) {
      console.log(
        "NETWORK COMMENT CREATE ERROR:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Triunely could not post your comment."
      );
    } finally {
      setSending(false);
    }
  }

  async function deleteComment(
    comment
  ) {
    if (
      !comment?.id ||
      deletingCommentId
    ) {
      return;
    }

    try {
      setDeletingCommentId(
        comment.id
      );
      setErrorMessage("");

      const {
        data,
        error,
      } =
        await supabase.rpc(
          "delete_network_post_comment_rpc",
          {
            target_comment_id:
              comment.id,
          }
        );

      if (error) {
        throw error;
      }

      if (data !== false) {
        onCommentCountChange?.(
          post.id,
          -1
        );
      }

      setDeleteConfirmComment(
        null
      );

      await loadComments();
    } catch (error) {
      console.log(
        "NETWORK COMMENT DELETE ERROR:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Triunely could not remove this comment."
      );
    } finally {
      setDeletingCommentId(
        null
      );
    }
  }

  if (
    !visible ||
    !post
  ) {
    return null;
  }

  const canSubmit =
    Boolean(text.trim()) &&
    Boolean(currentUserId) &&
    !sending;

  const sheetBusy =
    sending ||
    Boolean(
      deletingCommentId
    );

  const postPreview =
    post.title
      ? `${post.title}\n${post.body || ""}`
      : post.body || "";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent={
        false
      }
      presentationStyle="overFullScreen"
      onRequestClose={() => {
        if (!sheetBusy) {
          onClose?.();
        }
      }}
    >
      <KeyboardAvoidingView
        style={{
          flex: 1,
        }}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
        keyboardVerticalOffset={0}
      >
        <View
          style={{
            flex: 1,
            justifyContent:
              "flex-end",
          }}
        >
          <Pressable
            onPress={() => {
              if (!sheetBusy) {
                onClose?.();
              }
            }}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor:
                MODAL_BACKDROP,
            }}
          />

          <View
            style={{
              flex: 1,
              marginTop:
                Math.max(
                  insets.top + 8,
                  24
                ),
              backgroundColor:
                PREMIUM_CREAM,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderWidth: 1,
              borderColor:
                CARD_BORDER,
              paddingTop: 10,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: 44,
                height: 5,
                borderRadius: 999,
                backgroundColor:
                  "rgba(79, 99, 59, 0.24)",
                alignSelf: "center",
                marginBottom: 8,
              }}
            />

            <View
              style={{
                minHeight: 58,
                paddingHorizontal: 16,
                flexDirection: "row",
                alignItems: "center",
                borderBottomWidth: 1,
                borderBottomColor:
                  CARD_BORDER,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 15,
                  backgroundColor:
                    SOFT_OLIVE_BG,
                  borderWidth: 1,
                  borderColor:
                    OLIVE_BORDER,
                  alignItems: "center",
                  justifyContent:
                    "center",
                }}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={21}
                  color={DEEP_OLIVE}
                />
              </View>

              <View
                style={{
                  flex: 1,
                  minWidth: 0,
                  marginLeft: 11,
                }}
              >
                <Text
                  style={{
                    fontFamily:
                      displayFont,
                    color: TEXT,
                    fontSize: 19,
                    lineHeight: 23,
                    fontWeight: "900",
                  }}
                >
                  Network comments
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 11.5,
                    lineHeight: 15,
                    fontWeight: "700",
                    marginTop: 1,
                  }}
                >
                  Join the conversation
                </Text>
              </View>

              <Pressable
                disabled={sheetBusy}
                onPress={onClose}
                hitSlop={8}
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  backgroundColor:
                    pressed
                      ? SOFT_OLIVE_BG
                      : SURFACE,
                  borderWidth: 1,
                  borderColor:
                    CARD_BORDER,
                  alignItems: "center",
                  justifyContent:
                    "center",
                  opacity:
                    sheetBusy
                      ? 0.45
                      : 1,
                })}
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={DEEP_OLIVE}
                />
              </Pressable>
            </View>

            {postPreview ? (
              <View
                style={{
                  marginHorizontal: 16,
                  marginTop: 12,
                  borderRadius: 17,
                  backgroundColor:
                    SURFACE,
                  borderWidth: 1,
                  borderColor:
                    CARD_BORDER,
                  padding: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <Ionicons
                    name={
                      post.post_type ===
                      "announcement"
                        ? "megaphone-outline"
                        : "document-text-outline"
                    }
                    size={15}
                    color={EVENT_AMBER}
                  />

                  <Text
                    style={{
                      color: EVENT_BROWN,
                      fontSize: 10.5,
                      lineHeight: 14,
                      fontWeight: "900",
                      marginLeft: 5,
                      textTransform:
                        "uppercase",
                      letterSpacing: 0.4,
                    }}
                  >
                    {post.post_type ===
                    "announcement"
                      ? "Announcement"
                      : "Original post"}
                  </Text>
                </View>

                <Text
                  numberOfLines={3}
                  style={{
                    color: TEXT,
                    fontSize: 13,
                    lineHeight: 19,
                    fontWeight: "650",
                  }}
                >
                  {postPreview}
                </Text>
              </View>
            ) : null}

            <View
              style={{
                flex: 1,
                minHeight: 0,
              }}
            >
              {loading ? (
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent:
                      "center",
                    padding: 24,
                  }}
                >
                  <ActivityIndicator
                    size="small"
                    color={EVENT_AMBER}
                  />

                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 12.5,
                      fontWeight: "800",
                      marginTop: 9,
                    }}
                  >
                    Loading comments…
                  </Text>
                </View>
              ) : (
                <ScrollView
                  ref={scrollRef}
                  style={{
                    flex: 1,
                  }}
                  contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: 13,
                    paddingBottom: 16,
                    flexGrow: 1,
                  }}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  showsVerticalScrollIndicator={
                    false
                  }
                >
                  {comments.length ===
                  0 ? (
                    <View
                      style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent:
                          "center",
                        paddingHorizontal: 24,
                        paddingVertical: 20,
                      }}
                    >
                      <View
                        style={{
                          width: 58,
                          height: 58,
                          borderRadius: 21,
                          backgroundColor:
                            SOFT_GOLD_BG,
                          borderWidth: 1,
                          borderColor:
                            AMBER_BORDER,
                          alignItems: "center",
                          justifyContent:
                            "center",
                          marginBottom: 11,
                        }}
                      >
                        <Ionicons
                          name="chatbubbles-outline"
                          size={26}
                          color={EVENT_AMBER}
                        />
                      </View>

                      <Text
                        style={{
                          fontFamily:
                            displayFont,
                          color: TEXT,
                          fontSize: 17,
                          lineHeight: 21,
                          fontWeight: "900",
                          textAlign:
                            "center",
                        }}
                      >
                        No comments yet
                      </Text>

                      <Text
                        style={{
                          color: MUTED,
                          fontSize: 12.5,
                          lineHeight: 18,
                          fontWeight: "700",
                          textAlign:
                            "center",
                          marginTop: 4,
                        }}
                      >
                        Be the first to add something encouraging or helpful.
                      </Text>
                    </View>
                  ) : (
                    comments.map(
                      (comment) => {
                        const isRemoved =
                          comment.content ===
                          "Comment removed";

                        return (
                          <View
                            key={
                              comment.id
                            }
                            style={{
                              flexDirection:
                                "row",
                              alignItems:
                                "flex-start",
                              marginBottom: 13,
                            }}
                          >
                            <CommentAvatar
                              comment={
                                comment
                              }
                            />

                            <View
                              style={{
                                flex: 1,
                                minWidth: 0,
                              }}
                            >
                              <View
                                style={{
                                  borderRadius: 17,
                                  borderTopLeftRadius: 6,
                                  backgroundColor:
                                    SURFACE,
                                  borderWidth: 1,
                                  borderColor:
                                    CARD_BORDER,
                                  paddingHorizontal: 12,
                                  paddingVertical: 10,
                                  opacity:
                                    isRemoved
                                      ? 0.65
                                      : 1,
                                }}
                              >
                                <View
                                  style={{
                                    flexDirection:
                                      "row",
                                    alignItems:
                                      "center",
                                  }}
                                >
                                  <Text
                                    numberOfLines={1}
                                    style={{
                                      flex: 1,
                                      color: TEXT,
                                      fontSize: 12.5,
                                      lineHeight: 16,
                                      fontWeight:
                                        "900",
                                    }}
                                  >
                                    {comment.author_display_name ||
                                      "Triunely member"}
                                  </Text>

                                  <Text
                                    style={{
                                      color: MUTED,
                                      fontSize: 10,
                                      fontWeight:
                                        "800",
                                      marginLeft: 8,
                                    }}
                                  >
                                    {formatCommentTime(
                                      comment.created_at
                                    )}
                                  </Text>

                                  {comment.can_delete &&
                                  !isRemoved ? (
                                    <Pressable
                                      disabled={
                                        Boolean(
                                          deletingCommentId
                                        )
                                      }
                                      onPress={() =>
                                        setDeleteConfirmComment(
                                          comment
                                        )
                                      }
                                      hitSlop={8}
                                      style={({ pressed }) => ({
                                        width: 28,
                                        height: 28,
                                        borderRadius: 14,
                                        alignItems:
                                          "center",
                                        justifyContent:
                                          "center",
                                        backgroundColor:
                                          pressed
                                            ? SOFT_DANGER_BG
                                            : "transparent",
                                        marginLeft: 5,
                                      })}
                                    >
                                      <Ionicons
                                        name="trash-outline"
                                        size={15}
                                        color={DANGER}
                                      />
                                    </Pressable>
                                  ) : null}
                                </View>

                                <Text
                                  style={{
                                    color:
                                      isRemoved
                                        ? MUTED
                                        : TEXT,
                                    fontSize: 13.5,
                                    lineHeight: 20,
                                    fontWeight:
                                      isRemoved
                                        ? "700"
                                        : "600",
                                    fontStyle:
                                      isRemoved
                                        ? "italic"
                                        : "normal",
                                    marginTop: 4,
                                  }}
                                >
                                  {comment.content}
                                </Text>

                                {comment.edited_at &&
                                !isRemoved ? (
                                  <Text
                                    style={{
                                      color: MUTED,
                                      fontSize: 9.5,
                                      fontWeight:
                                        "800",
                                      marginTop: 5,
                                    }}
                                  >
                                    Edited
                                  </Text>
                                ) : null}
                              </View>
                            </View>
                          </View>
                        );
                      }
                    )
                  )}
                </ScrollView>
              )}
            </View>

            <ErrorNotice
              message={
                errorMessage
              }
              onRetry={
                comments.length === 0
                  ? () =>
                      loadComments()
                  : null
              }
            />

            {deleteConfirmComment ? (
              <View
                style={{
                  marginHorizontal: 16,
                  marginBottom: 10,
                  borderRadius: 17,
                  backgroundColor:
                    SOFT_DANGER_BG,
                  borderWidth: 1,
                  borderColor:
                    DANGER_BORDER,
                  padding: 12,
                }}
              >
                <Text
                  style={{
                    color: DANGER,
                    fontSize: 12.5,
                    fontWeight: "900",
                  }}
                >
                  Remove this comment?
                </Text>

                <Text
                  numberOfLines={2}
                  style={{
                    color: MUTED,
                    fontSize: 11.5,
                    lineHeight: 17,
                    fontWeight: "700",
                    marginTop: 4,
                  }}
                >
                  {deleteConfirmComment.content}
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    gap: 9,
                    marginTop: 11,
                  }}
                >
                  <Pressable
                    disabled={
                      Boolean(
                        deletingCommentId
                      )
                    }
                    onPress={() =>
                      setDeleteConfirmComment(
                        null
                      )
                    }
                    style={({ pressed }) => ({
                      flex: 1,
                      minHeight: 40,
                      borderRadius: 999,
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
                    <Text
                      style={{
                        color: DEEP_OLIVE,
                        fontSize: 11.5,
                        fontWeight: "900",
                      }}
                    >
                      Keep
                    </Text>
                  </Pressable>

                  <Pressable
                    disabled={
                      Boolean(
                        deletingCommentId
                      )
                    }
                    onPress={() =>
                      deleteComment(
                        deleteConfirmComment
                      )
                    }
                    style={({ pressed }) => ({
                      flex: 1,
                      minHeight: 40,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent:
                        "center",
                      flexDirection: "row",
                      backgroundColor:
                        pressed
                          ? "#991B1B"
                          : DANGER,
                      opacity:
                        deletingCommentId
                          ? 0.65
                          : 1,
                    })}
                  >
                    <Ionicons
                      name={
                        deletingCommentId
                          ? "sync-outline"
                          : "trash-outline"
                      }
                      size={15}
                      color={SURFACE}
                    />

                    <Text
                      style={{
                        color: SURFACE,
                        fontSize: 11.5,
                        fontWeight: "900",
                        marginLeft: 6,
                      }}
                    >
                      {deletingCommentId
                        ? "Removing…"
                        : "Remove"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <View
              style={{
                flexShrink: 0,
                borderTopWidth: 1,
                borderTopColor:
                  CARD_BORDER,
                backgroundColor:
                  SURFACE,
                paddingHorizontal: 14,
                paddingTop: 9,
                paddingBottom:
                  keyboardVisible
                    ? 8
                    : Math.max(
                        insets.bottom,
                        Platform.OS ===
                          "android"
                          ? 12
                          : 8
                      ),
              }}
            >
              <View
                style={{
                  minHeight: 48,
                  borderRadius: 18,
                  backgroundColor:
                    PREMIUM_CREAM,
                  borderWidth: 1,
                  borderColor:
                    CARD_BORDER,
                  flexDirection: "row",
                  alignItems:
                    "flex-end",
                  paddingLeft: 12,
                  paddingRight: 5,
                  paddingVertical: 5,
                }}
              >
                <TextInput
                  value={text}
                  onChangeText={
                    setText
                  }
                  editable={
                    !sending
                  }
                  placeholder={
                    anonymous
                      ? "Write anonymously…"
                      : "Write a comment…"
                  }
                  placeholderTextColor="rgba(107, 114, 128, 0.76)"
                  multiline
                  maxLength={4000}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollRef.current
                        ?.scrollToEnd?.({
                          animated: true,
                        });
                    }, 140);
                  }}
                  style={{
                    flex: 1,
                    minHeight: 38,
                    maxHeight: 96,
                    color: TEXT,
                    fontSize: 13.5,
                    lineHeight: 19,
                    fontWeight: "600",
                    paddingVertical: 9,
                    paddingRight: 8,
                    textAlignVertical:
                      "top",
                  }}
                />

                <View
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Send comment"
                  pointerEvents="box-only"
                  onTouchStart={(event) => {
                    event.stopPropagation();

                    if (
                      canSubmit &&
                      !sending
                    ) {
                      submitComment();
                    }
                  }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor:
                      canSubmit
                        ? EVENT_AMBER
                        : "rgba(107, 114, 128, 0.16)",
                    alignItems: "center",
                    justifyContent:
                      "center",
                    opacity:
                      sending
                        ? 0.72
                        : 1,
                  }}
                >
                  {sending ? (
                    <ActivityIndicator
                      size="small"
                      color={SURFACE}
                    />
                  ) : (
                    <Ionicons
                      name="send"
                      size={17}
                      color={
                        canSubmit
                          ? SURFACE
                          : MUTED
                      }
                    />
                  )}
                </View>
              </View>

              <Pressable
                disabled={sending}
                onPress={() =>
                  setAnonymous(
                    (current) =>
                      !current
                  )
                }
                style={{
                  alignSelf:
                    "flex-start",
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 8,
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 7,
                    backgroundColor:
                      anonymous
                        ? SOFT_GOLD_BG
                        : SOFT_OLIVE_BG,
                    borderWidth: 1,
                    borderColor:
                      anonymous
                        ? AMBER_BORDER
                        : OLIVE_BORDER,
                    alignItems: "center",
                    justifyContent:
                      "center",
                  }}
                >
                  <Ionicons
                    name={
                      anonymous
                        ? "checkmark"
                        : "person-outline"
                    }
                    size={13}
                    color={
                      anonymous
                        ? EVENT_AMBER
                        : DEEP_OLIVE
                    }
                  />
                </View>

                <Text
                  style={{
                    color:
                      anonymous
                        ? EVENT_BROWN
                        : DEEP_OLIVE,
                    fontSize: 10.5,
                    fontWeight: "900",
                    marginLeft: 6,
                  }}
                >
                  Comment anonymously
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}