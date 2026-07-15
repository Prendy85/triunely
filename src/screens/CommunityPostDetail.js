// src/screens/CommunityPostDetail.js
import { Ionicons } from "@expo/vector-icons";
import {
    useCallback,
    useEffect,
    useState,
} from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import PostCard from "../components/PostCard";
import PostCommentsModal from "../components/PostCommentsModal";
import { supabase } from "../lib/supabase";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const DEEP_OLIVE = "#4F633B";
const EVENT_AMBER = "#B45309";
const TEXT = "#1F2933";
const MUTED = "#6B7280";

const CARD_BORDER =
  "rgba(15, 23, 42, 0.08)";

const SOFT_OLIVE =
  "rgba(79, 99, 59, 0.10)";

function mapPostRow(row) {
  if (!row) {
    return null;
  }

  const commentCount =
    Array.isArray(
      row.post_comments
    ) &&
    row.post_comments.length > 0
      ? row.post_comments[0]
          ?.count || 0
      : 0;

  const nestedPost =
    row.shared_post
      ? {
          ...row.shared_post,
          church:
            row.shared_post
              ?.churches ||
            null,
        }
      : null;

  return {
    id: row.id,
    user_id: row.user_id,
    church_id: row.church_id,
    shared_post_id:
      row.shared_post_id ||
      null,

    church:
      row.churches ||
      null,

    shared_post:
      nestedPost,

    content:
      row.content ||
      null,

    url:
      row.url ||
      null,

    link_title:
      row.link_title ||
      null,

    link_description:
      row.link_description ||
      null,

    link_image:
      row.link_image ||
      null,

    is_anonymous:
      !!row.is_anonymous,

    media_url:
      row.media_url ||
      null,

    media_type:
      row.media_type ||
      null,

    created_at:
      row.created_at ||
      null,

    reactions:
      row.post_reactions ||
      [],

    comment_count:
      commentCount,
  };
}

export default function CommunityPostDetail({
  navigation,
  route,
}) {
  const insets =
    useSafeAreaInsets();

  const postId =
    route?.params?.postId ||
    route?.params?.openPostId ||
    null;

  const [post, setPost] =
    useState(null);

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState(null);

  const [
    profilesById,
    setProfilesById,
  ] = useState({});

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(null);

  const [
    commentsVisible,
    setCommentsVisible,
  ] = useState(false);

  const [
    reactionPickerForPost,
    setReactionPickerForPost,
  ] = useState(null);

  const loadPost =
    useCallback(async () => {
      if (!postId) {
        setError(
          "This post could not be found."
        );

        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const {
          data: sessionData,
        } =
          await supabase.auth
            .getSession();

        const userId =
          sessionData?.session
            ?.user?.id ||
          null;

        setCurrentUserId(
          userId
        );

        const {
          data,
          error: postError,
        } = await supabase
          .from("posts")
          .select(
            `
            id,
            user_id,
            church_id,
            shared_post_id,
            content,
            url,
            link_title,
            link_description,
            link_image,
            is_anonymous,
            media_url,
            media_type,
            created_at,

            churches:church_id (
              id,
              name,
              display_name,
              avatar_url,
              is_verified
            ),

            shared_post:shared_post_id (
              id,
              user_id,
              church_id,
              content,
              url,
              link_title,
              link_description,
              link_image,
              is_anonymous,
              media_url,
              media_type,
              created_at,

              churches:church_id (
                id,
                name,
                display_name,
                avatar_url,
                is_verified
              )
            ),

            post_reactions (
              user_id,
              type
            ),

            post_comments (
              count
            )
            `
          )
          .eq("id", postId)
          .maybeSingle();

        if (
          postError ||
          !data
        ) {
          throw (
            postError ||
            new Error(
              "Post not found"
            )
          );
        }

        const mappedPost =
          mapPostRow(data);

        const profileIds =
          [
            !mappedPost
              ?.is_anonymous
              ? mappedPost
                  ?.user_id
              : null,

            !mappedPost
              ?.shared_post
              ?.is_anonymous
              ? mappedPost
                  ?.shared_post
                  ?.user_id
              : null,
          ].filter(Boolean);

        let nextProfiles = {};

        if (
          profileIds.length > 0
        ) {
          const {
            data: profiles,
            error:
              profilesError,
          } =
            await supabase
              .from(
                "profiles"
              )
              .select(
                `
                id,
                display_name,
                avatar_url
                `
              )
              .in(
                "id",
                [
                  ...new Set(
                    profileIds
                  ),
                ]
              );

          if (profilesError) {
            console.log(
              "CommunityPostDetail profiles error",
              profilesError
            );
          } else {
            nextProfiles =
              Object.fromEntries(
                (
                  profiles || []
                ).map(
                  (
                    profile
                  ) => [
                    profile.id,
                    profile,
                  ]
                )
              );
          }
        }

        const nestedAuthor =
          mappedPost
            ?.shared_post
            ?.user_id
            ? nextProfiles[
                mappedPost
                  .shared_post
                  .user_id
              ] || null
            : null;

        setProfilesById(
          nextProfiles
        );

        setPost({
          ...mappedPost,
          shared_post:
            mappedPost
              ?.shared_post
              ? {
                  ...mappedPost
                    .shared_post,
                  author_profile:
                    nestedAuthor,
                }
              : null,
        });
      } catch (loadError) {
        console.log(
          "CommunityPostDetail load error",
          loadError
        );

        setError(
          "This post is unavailable or you no longer have permission to view it."
        );

        setPost(null);
      } finally {
        setLoading(false);
      }
    }, [postId]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  const handleCommentAdded =
    useCallback(() => {
      setPost(
        (
          currentPost
        ) =>
          currentPost
            ? {
                ...currentPost,
                comment_count:
                  Number(
                    currentPost
                      .comment_count ||
                      0
                  ) + 1,
              }
            : currentPost
      );
    }, []);

  const handleSetReaction =
    useCallback(
      async (
        targetPost,
        reactionType
      ) => {
        if (
          !currentUserId ||
          !targetPost?.id
        ) {
          return;
        }

        const existingReaction =
          (
            targetPost
              .reactions ||
            []
          ).find(
            (reaction) =>
              reaction.user_id ===
              currentUserId
          );

        try {
          if (
            existingReaction
              ?.type ===
            reactionType
          ) {
            const {
              error:
                deleteError,
            } =
              await supabase
                .from(
                  "post_reactions"
                )
                .delete()
                .eq(
                  "post_id",
                  targetPost.id
                )
                .eq(
                  "user_id",
                  currentUserId
                );

            if (deleteError) {
              throw deleteError;
            }
          } else {
            const {
              error:
                reactionError,
            } =
              await supabase
                .from(
                  "post_reactions"
                )
                .upsert(
                  {
                    post_id:
                      targetPost.id,
                    user_id:
                      currentUserId,
                    type:
                      reactionType,
                  },
                  {
                    onConflict:
                      "post_id,user_id",
                  }
                );

            if (
              reactionError
            ) {
              throw reactionError;
            }
          }

          setReactionPickerForPost(
            null
          );

          await loadPost();
        } catch (
          reactionError
        ) {
          console.log(
            "CommunityPostDetail reaction error",
            reactionError
          );
        }
      },
      [
        currentUserId,
        loadPost,
      ]
    );

  const openAuthor =
    useCallback(
      (userId) => {
        if (!userId) {
          return;
        }

        navigation.navigate(
          "UserProfile",
          {
            userId,
          }
        );
      },
      [navigation]
    );

  const openOriginalPost =
    useCallback(
      (originalPost) => {
        if (
          !originalPost?.id
        ) {
          return;
        }

        navigation.push(
          "CommunityPostDetail",
          {
            postId:
              originalPost.id,
          }
        );
      },
      [navigation]
    );

  const outerAuthorProfile =
    post?.user_id
      ? profilesById[
          post.user_id
        ] || null
      : null;

  const outerAuthorName =
    post?.is_anonymous
      ? "Anonymous"
      : post?.church
      ?.display_name ||
        post?.church?.name ||
        (post?.user_id ===
        currentUserId
          ? "You"
          : outerAuthorProfile
              ?.display_name ||
            "Member on Triunely");

  const outerAvatarUrl =
    post?.is_anonymous
      ? null
      : post?.church
          ?.avatar_url ||
        outerAuthorProfile
          ?.avatar_url ||
        null;

  const outerAuthor = post
    ? {
        id:
          post.church_id ||
          post.user_id ||
          null,

        name:
          outerAuthorName,

        avatarUrl:
          outerAvatarUrl,

        isAnonymous:
          !!post.is_anonymous,

        isOwner:
          !!(
            currentUserId &&
            post.user_id ===
              currentUserId
          ),

        isVerified:
          !!post?.church
            ?.is_verified,
      }
    : null;

  return (
    <SafeAreaView
      edges={[
        "top",
        "left",
        "right",
      ]}
      style={{
        flex: 1,
        backgroundColor:
          PREMIUM_CREAM,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: 9,
          paddingBottom: 12,
          backgroundColor:
            PREMIUM_CREAM,
          borderBottomWidth: 1,
          borderBottomColor:
            CARD_BORDER,
        }}
      >
        <Pressable
          onPress={() =>
            navigation.goBack()
          }
          hitSlop={10}
          style={({ pressed }) => ({
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: "center",
            justifyContent:
              "center",
            backgroundColor:
              pressed
                ? SOFT_OLIVE
                : SURFACE,
            borderWidth: 1,
            borderColor:
              CARD_BORDER,
          })}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={DEEP_OLIVE}
          />
        </Pressable>

        <View
          style={{
            flex: 1,
            marginLeft: 13,
          }}
        >
          <Text
            style={{
              color: TEXT,
              fontSize: 21,
              fontWeight: "900",
              fontFamily:
                "Georgia",
            }}
          >
            Community post
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 11.5,
              fontWeight: "700",
              marginTop: 2,
            }}
          >
            The original post and conversation
          </Text>
        </View>

        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems:
              "center",
            justifyContent:
              "center",
            backgroundColor:
              "rgba(180, 83, 9, 0.09)",
          }}
        >
          <Ionicons
            name="chatbubbles-outline"
            size={17}
            color={EVENT_AMBER}
          />
        </View>
      </View>

      {loading ? (
        <View
          style={{
            flex: 1,
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
              fontWeight: "700",
              marginTop: 12,
            }}
          >
            Loading post…
          </Text>
        </View>
      ) : error || !post ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent:
              "center",
            paddingHorizontal: 35,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              alignItems:
                "center",
              justifyContent:
                "center",
              backgroundColor:
                SOFT_OLIVE,
            }}
          >
            <Ionicons
              name="document-text-outline"
              size={29}
              color={DEEP_OLIVE}
            />
          </View>

          <Text
            style={{
              color: TEXT,
              fontSize: 18,
              fontWeight: "900",
              textAlign:
                "center",
              marginTop: 15,
            }}
          >
            Post unavailable
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 13,
              lineHeight: 19,
              fontWeight: "600",
              textAlign:
                "center",
              marginTop: 7,
            }}
          >
            {error}
          </Text>
        </View>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 14,
            paddingTop: 14,
            paddingBottom:
              Math.max(
                insets.bottom,
                18
              ) + 28,
          }}
        >
          <PostCard
            post={post}
            currentUserId={
              currentUserId
            }
            author={
              outerAuthor
            }
            onPressAvatar={() => {
              if (
                !post.church_id &&
                !post.is_anonymous
              ) {
                openAuthor(
                  post.user_id
                );
              }
            }}
            onPressOriginalPost={
              openOriginalPost
            }
            onPressOriginalAuthor={(
              originalPost
            ) => {
              if (
                !originalPost
                  ?.is_anonymous
              ) {
                openAuthor(
                  originalPost
                    ?.user_id
                );
              }
            }}
            onOpenComments={() =>
              setCommentsVisible(
                true
              )
            }
            onSetReaction={
              handleSetReaction
            }
            reactionPickerForPost={
              reactionPickerForPost
            }
            setReactionPickerForPost={
              setReactionPickerForPost
            }
            preferInAppYouTube
          />
        </ScrollView>
      )}

      <PostCommentsModal
        visible={
          commentsVisible
        }
        onClose={() =>
          setCommentsVisible(
            false
          )
        }
        post={post}
        currentUserId={
          currentUserId
        }
        onCommentAdded={
          handleCommentAdded
        }
      />
    </SafeAreaView>
  );
}