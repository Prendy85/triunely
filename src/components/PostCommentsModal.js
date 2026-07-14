// src/components/PostCommentsModal.js
import { Ionicons } from "@expo/vector-icons";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const DEEP_OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";

const CARD_BORDER =
  "rgba(15, 23, 42, 0.09)";

const OLIVE_BORDER =
  "rgba(79, 99, 59, 0.18)";

const AMBER_BORDER =
  "rgba(180, 83, 9, 0.20)";

const SOFT_OLIVE_BG =
  "rgba(79, 99, 59, 0.09)";

const SOFT_GOLD_BG =
  "rgba(180, 83, 9, 0.09)";

const DANGER = "#B42318";

function getInitials(name) {
  const cleanName = String(
    name || ""
  ).trim();

  if (!cleanName) {
    return "T";
  }

  const parts = cleanName
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return (
      parts[0][0] + parts[1][0]
    ).toUpperCase();
  }

  return cleanName
    .slice(0, 1)
    .toUpperCase();
}

function formatCommentTime(value) {
  if (!value) {
    return "";
  }

  try {
    const date = new Date(value);

    const now = new Date();

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
      Math.floor(minutes / 60);

    if (hours < 24) {
      return `${hours}h`;
    }

    const days =
      Math.floor(hours / 24);

    if (days < 7) {
      return `${days}d`;
    }

    return date.toLocaleDateString(
      undefined,
      {
        day: "numeric",
        month: "short",
      }
    );
  } catch {
    return "";
  }
}

export default function PostCommentsModal({
  visible,
  onClose,
  post,
  currentUserId,
  onCommentAdded,
}) {
  const [
    comments,
    setComments,
  ] = useState([]);

  const [
    profilesById,
    setProfilesById,
  ] = useState({});

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    text,
    setText,
  ] = useState("");

  const [
    anonymous,
    setAnonymous,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState(null);

  const scrollRef =
    useRef(null);

  useEffect(() => {
    if (
      visible &&
      post?.id
    ) {
      setText("");
      setAnonymous(false);
      setError(null);

      loadComments(
        post.id
      );

      return;
    }

    if (!visible) {
      setComments([]);
      setProfilesById({});
      setLoading(false);
      setSending(false);
      setText("");
      setAnonymous(false);
      setError(null);
    }
  }, [
    visible,
    post?.id,
  ]);

  async function loadProfiles(
    userIds
  ) {
    const uniqueIds =
      Array.from(
        new Set(
          (userIds || [])
            .filter(Boolean)
        )
      );

    if (
      uniqueIds.length === 0
    ) {
      return;
    }

    try {
      const {
        data,
        error:
          profileError,
      } =
        await supabase
          .from("profiles")
          .select(
            "id, display_name, avatar_url"
          )
          .in(
            "id",
            uniqueIds
          );

      if (profileError) {
        console.log(
          "Post comments profiles error:",
          profileError
        );

        return;
      }

      const nextProfiles = {};

      (data || []).forEach(
        (profile) => {
          if (!profile?.id) {
            return;
          }

          nextProfiles[
            profile.id
          ] = profile;
        }
      );

      setProfilesById(
        (previous) => ({
          ...previous,
          ...nextProfiles,
        })
      );
    } catch (profileError) {
      console.log(
        "Post comments profiles exception:",
        profileError
      );
    }
  }

  async function loadComments(
    postId
  ) {
    if (!postId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const {
        data,
        error:
          commentsError,
      } =
        await supabase
          .from(
            "post_comments"
          )
          .select(
            `
            id,
            user_id,
            content,
            is_anonymous,
            created_at
          `
          )
          .eq(
            "post_id",
            postId
          )
          .order(
            "created_at",
            {
              ascending: true,
            }
          );

      if (commentsError) {
        throw commentsError;
      }

      const nextComments =
        data || [];

      setComments(
        nextComments
      );

      const profileIds =
        nextComments
          .filter(
            (comment) =>
              !comment
                .is_anonymous
          )
          .map(
            (comment) =>
              comment.user_id
          )
          .filter(Boolean);

      await loadProfiles(
        profileIds
      );

      setTimeout(() => {
        scrollRef.current
          ?.scrollToEnd?.({
            animated: false,
          });
      }, 80);
    } catch (commentsError) {
      console.log(
        "Error loading comments:",
        commentsError
      );

      setError(
        "We couldn’t load the comments right now."
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitComment() {
    const trimmed =
      text.trim();

    if (
      !trimmed ||
      !currentUserId ||
      !post?.id ||
      sending
    ) {
      return;
    }

    try {
      setSending(true);
      setError(null);

      const {
        data,
        error:
          insertError,
      } =
        await supabase
          .from(
            "post_comments"
          )
          .insert({
            post_id:
              post.id,
            user_id:
              currentUserId,
            content:
              trimmed,
            is_anonymous:
              anonymous,
          })
          .select(
            `
            id,
            user_id,
            content,
            is_anonymous,
            created_at
          `
          )
          .single();

      if (insertError) {
        throw insertError;
      }

      setComments(
        (previous) => [
          ...previous,
          data,
        ]
      );

      if (!anonymous) {
        await loadProfiles([
          currentUserId,
        ]);
      }

      setText("");
      setAnonymous(false);

      onCommentAdded?.(
        post.id
      );

      setTimeout(() => {
        scrollRef.current
          ?.scrollToEnd?.({
            animated: true,
          });
      }, 80);
    } catch (insertError) {
      console.log(
        "Error creating comment:",
        insertError
      );

      setError(
        "We couldn’t post your comment. Please try again."
      );
    } finally {
      setSending(false);
    }
  }

  function getCommentAuthor(
    comment
  ) {
    if (
      comment?.is_anonymous
    ) {
      return {
        name: "Anonymous",
        avatarUrl: null,
        isAnonymous: true,
      };
    }

    if (
      currentUserId &&
      comment?.user_id ===
        currentUserId
    ) {
      const ownProfile =
        profilesById[
          currentUserId
        ];

      return {
        name:
          ownProfile
            ?.display_name ||
          "You",
        avatarUrl:
          ownProfile
            ?.avatar_url ||
          null,
        isAnonymous: false,
      };
    }

    const profile =
      profilesById[
        comment?.user_id
      ];

    return {
      name:
        profile
          ?.display_name ||
        "Triunely member",
      avatarUrl:
        profile
          ?.avatar_url ||
        null,
      isAnonymous: false,
    };
  }

  if (
    !visible ||
    !post
  ) {
    return null;
  }

  const canSubmit =
    Boolean(
      text.trim()
    ) &&
    Boolean(
      currentUserId
    ) &&
    !sending;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {
        if (!sending) {
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
      >
        <Pressable
          onPress={() => {
            if (!sending) {
              onClose?.();
            }
          }}
          style={{
            flex: 1,
            backgroundColor:
              "rgba(46, 34, 20, 0.48)",
            justifyContent:
              "flex-end",
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              maxHeight: "88%",
              minHeight: "60%",
              backgroundColor:
                PREMIUM_CREAM,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderWidth: 1,
              borderColor:
                CARD_BORDER,
              paddingTop: 9,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: 42,
                height: 5,
                borderRadius: 999,
                backgroundColor:
                  "rgba(79, 99, 59, 0.24)",
                alignSelf: "center",
                marginBottom: 7,
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
                    color: TEXT,
                    fontSize: 18,
                    lineHeight: 22,
                    fontWeight: "900",
                  }}
                >
                  Comments
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
                onPress={() => {
                  if (!sending) {
                    onClose?.();
                  }
                }}
                disabled={
                  sending
                }
                hitSlop={8}
                style={({
                  pressed,
                }) => ({
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
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  opacity:
                    sending
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

            {!!post?.content ? (
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
                    name="document-text-outline"
                    size={15}
                    color={EVENT_AMBER}
                  />

                  <Text
                    style={{
                      color:
                        EVENT_BROWN,
                      fontSize: 11,
                      lineHeight: 14,
                      fontWeight: "900",
                      marginLeft: 5,
                      textTransform:
                        "uppercase",
                      letterSpacing: 0.4,
                    }}
                  >
                    Original post
                  </Text>
                </View>

                <Text
                  style={{
                    color: TEXT,
                    fontSize: 13,
                    lineHeight: 19,
                    fontWeight: "650",
                  }}
                  numberOfLines={3}
                >
                  {post.content}
                </Text>
              </View>
            ) : null}

            <View
              style={{
                flex: 1,
                minHeight: 180,
              }}
            >
              {loading ? (
                <View
                  style={{
                    flex: 1,
                    minHeight: 180,
                    alignItems:
                      "center",
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
                    flexGrow:
                      comments.length ===
                      0
                        ? 1
                        : 0,
                  }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {comments.length ===
                  0 ? (
                    <View
                      style={{
                        flex: 1,
                        minHeight: 170,
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        paddingHorizontal: 24,
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
                          alignItems:
                            "center",
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
                          color: TEXT,
                          fontSize: 16,
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
                        const author =
                          getCommentAuthor(
                            comment
                          );

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
                              marginBottom:
                                13,
                            }}
                          >
                            <View
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 19,
                                backgroundColor:
                                  author
                                    .isAnonymous
                                    ? SOFT_GOLD_BG
                                    : SOFT_OLIVE_BG,
                                borderWidth: 1,
                                borderColor:
                                  author
                                    .isAnonymous
                                    ? AMBER_BORDER
                                    : OLIVE_BORDER,
                                alignItems:
                                  "center",
                                justifyContent:
                                  "center",
                                overflow:
                                  "hidden",
                                marginRight:
                                  9,
                              }}
                            >
                              {author.avatarUrl ? (
                                <Image
                                  source={{
                                    uri:
                                      author.avatarUrl,
                                  }}
                                  style={{
                                    width: 38,
                                    height: 38,
                                  }}
                                />
                              ) : author.isAnonymous ? (
                                <Ionicons
                                  name="person-outline"
                                  size={18}
                                  color={EVENT_AMBER}
                                />
                              ) : (
                                <Text
                                  style={{
                                    color:
                                      DEEP_OLIVE,
                                    fontSize: 12,
                                    fontWeight:
                                      "900",
                                  }}
                                >
                                  {getInitials(
                                    author.name
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
                                  borderRadius: 17,
                                  borderTopLeftRadius: 6,
                                  backgroundColor:
                                    SURFACE,
                                  borderWidth: 1,
                                  borderColor:
                                    CARD_BORDER,
                                  paddingHorizontal: 12,
                                  paddingVertical: 10,
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
                                    style={{
                                      flex: 1,
                                      color: TEXT,
                                      fontSize: 12.5,
                                      lineHeight: 16,
                                      fontWeight:
                                        "900",
                                    }}
                                    numberOfLines={
                                      1
                                    }
                                  >
                                    {author.name}
                                  </Text>

                                  <Text
                                    style={{
                                      color: MUTED,
                                      fontSize: 10,
                                      fontWeight:
                                        "800",
                                      marginLeft:
                                        8,
                                    }}
                                  >
                                    {formatCommentTime(
                                      comment.created_at
                                    )}
                                  </Text>
                                </View>

                                <Text
                                  style={{
                                    color: TEXT,
                                    fontSize: 13.5,
                                    lineHeight: 20,
                                    fontWeight:
                                      "600",
                                    marginTop: 4,
                                  }}
                                >
                                  {comment.content}
                                </Text>
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

            {error ? (
              <View
                style={{
                  marginHorizontal: 16,
                  marginBottom: 8,
                  borderRadius: 14,
                  backgroundColor:
                    "rgba(180, 35, 24, 0.07)",
                  borderWidth: 1,
                  borderColor:
                    "rgba(180, 35, 24, 0.18)",
                  paddingHorizontal: 11,
                  paddingVertical: 9,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={17}
                  color={DANGER}
                />

                <Text
                  style={{
                    flex: 1,
                    color: DANGER,
                    fontSize: 11.5,
                    lineHeight: 16,
                    fontWeight: "800",
                    marginLeft: 7,
                  }}
                >
                  {error}
                </Text>

                {!loading ? (
                  <Pressable
                    onPress={() =>
                      loadComments(
                        post.id
                      )
                    }
                    hitSlop={7}
                  >
                    <Text
                      style={{
                        color:
                          EVENT_BROWN,
                        fontSize: 11.5,
                        fontWeight:
                          "900",
                      }}
                    >
                      Retry
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <View
              style={{
                backgroundColor:
                  SURFACE,
                borderTopWidth: 1,
                borderTopColor:
                  CARD_BORDER,
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom:
                  Platform.OS ===
                  "ios"
                    ? 22
                    : 14,
              }}
            >
              <View
                style={{
                  minHeight: 50,
                  borderRadius: 18,
                  backgroundColor:
                    PREMIUM_CREAM,
                  borderWidth: 1,
                  borderColor:
                    text.trim()
                      ? AMBER_BORDER
                      : CARD_BORDER,
                  paddingLeft: 13,
                  paddingRight: 6,
                  flexDirection: "row",
                  alignItems:
                    "flex-end",
                }}
              >
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder="Write a comment…"
                  placeholderTextColor={
                    MUTED
                  }
                  multiline
                  maxLength={1000}
                  editable={!sending}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    maxHeight: 110,
                    color: TEXT,
                    fontSize: 13.5,
                    lineHeight: 20,
                    fontWeight: "650",
                    paddingTop: 13,
                    paddingBottom: 11,
                    textAlignVertical:
                      "top",
                  }}
                />

                <Pressable
                  onPress={
                    submitComment
                  }
                  disabled={
                    !canSubmit
                  }
                  style={({
                    pressed,
                  }) => ({
                    width: 42,
                    height: 42,
                    borderRadius: 15,
                    backgroundColor:
                      canSubmit
                        ? pressed
                          ? EVENT_BROWN
                          : EVENT_AMBER
                        : "rgba(107, 114, 128, 0.18)",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    marginBottom: 4,
                    opacity:
                      sending
                        ? 0.7
                        : 1,
                  })}
                >
                  {sending ? (
                    <ActivityIndicator
                      size="small"
                      color={SURFACE}
                    />
                  ) : (
                    <Ionicons
                      name="send"
                      size={18}
                      color={
                        canSubmit
                          ? SURFACE
                          : MUTED
                      }
                    />
                  )}
                </Pressable>
              </View>

              <View
                style={{
                  marginTop: 9,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Pressable
                  onPress={() =>
                    setAnonymous(
                      (previous) =>
                        !previous
                    )
                  }
                  disabled={sending}
                  style={({
                    pressed,
                  }) => ({
                    minHeight: 38,
                    borderRadius: 14,
                    paddingHorizontal: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor:
                      anonymous
                        ? SOFT_GOLD_BG
                        : pressed
                          ? SOFT_OLIVE_BG
                          : "transparent",
                    borderWidth: 1,
                    borderColor:
                      anonymous
                        ? AMBER_BORDER
                        : CARD_BORDER,
                    opacity:
                      sending
                        ? 0.45
                        : 1,
                  })}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 7,
                      backgroundColor:
                        anonymous
                          ? EVENT_AMBER
                          : SURFACE,
                      borderWidth: 1,
                      borderColor:
                        anonymous
                          ? EVENT_AMBER
                          : OLIVE_BORDER,
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      marginRight: 7,
                    }}
                  >
                    {anonymous ? (
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color={SURFACE}
                      />
                    ) : null}
                  </View>

                  <Text
                    style={{
                      color: anonymous
                        ? EVENT_BROWN
                        : DEEP_OLIVE,
                      fontSize: 11.5,
                      fontWeight: "900",
                    }}
                  >
                    Comment anonymously
                  </Text>
                </Pressable>

                <Text
                  style={{
                    flex: 1,
                    color: MUTED,
                    fontSize: 10.5,
                    lineHeight: 14,
                    fontWeight: "700",
                    marginLeft: 9,
                    textAlign: "right",
                  }}
                >
                  {text.length}/1000
                </Text>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}