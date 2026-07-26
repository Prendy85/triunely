// C:\triunely\src\screens\NetworkPostsAdmin.js

import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import {
    useCallback,
    useMemo,
    useState,
} from "react";
import {
    ActivityIndicator,
    Image,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from "react-native";

import NetworkPostActionsSheet from "../components/NetworkPostActionsSheet";
import NetworkPostDeleteConfirmSheet from "../components/NetworkPostDeleteConfirmSheet";
import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const HEAVENLY_GOLD = "#B45309";
const EVENT_BROWN = "#7C2D12";
const DEEP_OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";
const DANGER = "#B91C1C";

const SOFT_GOLD_BG = "rgba(180, 83, 9, 0.10)";
const GOLD_BORDER = "rgba(180, 83, 9, 0.18)";
const SOFT_OLIVE_BG = "rgba(79, 99, 59, 0.10)";
const OLIVE_BORDER = "rgba(79, 99, 59, 0.18)";
const SOFT_DANGER_BG = "rgba(185, 28, 28, 0.08)";
const DANGER_BORDER = "rgba(185, 28, 28, 0.17)";
const CARD_BORDER = "rgba(15, 23, 42, 0.08)";
const SHADOW = "rgba(15, 23, 42, 0.10)";

const displayFont = Platform.OS === "ios" ? "Georgia" : "serif";

const CONTENT_STATES = [
  {
    key: "published",
    label: "Published",
    icon: "checkmark-circle-outline",
  },
  {
    key: "draft",
    label: "Drafts",
    icon: "document-outline",
  },
  {
    key: "archived",
    label: "Archived",
    icon: "archive-outline",
  },
  {
    key: "deleted",
    label: "Deleted",
    icon: "trash-outline",
  },
];

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

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name) {
  return String(name || "Triunely member")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function StateTab({
  item,
  selected,
  onPress,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 42,
        borderRadius: 999,
        paddingHorizontal: 13,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
        borderWidth: 1,
        borderColor: selected ? GOLD_BORDER : OLIVE_BORDER,
        backgroundColor: selected
          ? SOFT_GOLD_BG
          : pressed
            ? SOFT_OLIVE_BG
            : SURFACE,
        transform: [
          {
            translateY: pressed ? 1 : 0,
          },
        ],
      })}
    >
      <Ionicons
        name={item.icon}
        size={16}
        color={selected ? HEAVENLY_GOLD : DEEP_OLIVE}
      />

      <Text
        style={{
          color: selected ? EVENT_BROWN : DEEP_OLIVE,
          fontSize: 12,
          fontWeight: "900",
          marginLeft: 6,
        }}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

function ContentCard({ post, onOpenActions }) {
  const isAnnouncement =
    post?.post_type === "announcement";

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

  const videoThumbnail =
    post?.media_thumbnail_url ||
    null;

  return (
    <View
      style={{
        ...premiumCardStyle,
        padding: 16,
        marginBottom: 13,
        borderColor:
          isAnnouncement
            ? GOLD_BORDER
            : OLIVE_BORDER,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
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
            justifyContent: "center",
            marginRight: 11,
            overflow: "hidden",
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
              marginTop: 5,
            }}
          >
            <View
              style={{
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 4,
                backgroundColor:
                  isAnnouncement
                    ? SOFT_GOLD_BG
                    : SOFT_OLIVE_BG,
                borderWidth: 1,
                borderColor:
                  isAnnouncement
                    ? GOLD_BORDER
                    : OLIVE_BORDER,
              }}
            >
              <Text
                style={{
                  color:
                    isAnnouncement
                      ? EVENT_BROWN
                      : DEEP_OLIVE,
                  fontSize: 9.5,
                  fontWeight: "900",
                  textTransform:
                    "uppercase",
                  letterSpacing: 0.35,
                }}
              >
                {isAnnouncement
                  ? "Official announcement"
                  : "Network post"}
              </Text>
            </View>

            {hasImage || hasVideo ? (
              <View
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  backgroundColor:
                    hasVideo
                      ? SOFT_GOLD_BG
                      : SOFT_OLIVE_BG,
                  borderWidth: 1,
                  borderColor:
                    hasVideo
                      ? GOLD_BORDER
                      : OLIVE_BORDER,
                  flexDirection: "row",
                  alignItems: "center",
                  marginLeft: 6,
                }}
              >
                <Ionicons
                  name={
                    hasVideo
                      ? "videocam-outline"
                      : "image-outline"
                  }
                  size={11}
                  color={
                    hasVideo
                      ? HEAVENLY_GOLD
                      : DEEP_OLIVE
                  }
                />

                <Text
                  style={{
                    color:
                      hasVideo
                        ? EVENT_BROWN
                        : DEEP_OLIVE,
                    fontSize: 9.5,
                    fontWeight: "900",
                    textTransform:
                      "uppercase",
                    letterSpacing: 0.3,
                    marginLeft: 4,
                  }}
                >
                  {hasVideo
                    ? "Video"
                    : "Photo"}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginLeft: 8,
          }}
        >
          {post?.is_pinned ? (
            <View
              accessibilityLabel="Pinned Network content"
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent:
                  "center",
                backgroundColor:
                  SOFT_GOLD_BG,
                borderWidth: 1,
                borderColor:
                  GOLD_BORDER,
                marginRight: 7,
              }}
            >
              <FontAwesome6
                name="thumbtack"
                size={17}
                color={
                  HEAVENLY_GOLD
                }
              />
            </View>
          ) : null}

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
            })}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={18}
              color={DEEP_OLIVE}
            />
          </Pressable>
        </View>
      </View>

      {post?.title ? (
        <Text
          style={{
            fontFamily:
              displayFont,
            color: TEXT,
            fontSize: 19,
            lineHeight: 24,
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
          fontSize: 13.5,
          fontWeight: "600",
          lineHeight: 20,
          marginTop:
            post?.title ? 8 : 14,
        }}
        numberOfLines={5}
      >
        {post?.body || ""}
      </Text>

      {hasImage ? (
        <View
          style={{
            width: "100%",
            height: 150,
            borderRadius: 16,
            overflow: "hidden",
            backgroundColor:
              "rgba(15, 23, 42, 0.04)",
            borderWidth: 1,
            borderColor:
              CARD_BORDER,
            marginTop: 14,
          }}
        >
          <Image
            source={{
              uri: post.media_url,
            }}
            resizeMode="contain"
            style={{
              width: "100%",
              height: "100%",
            }}
          />
        </View>
      ) : null}

      {hasVideo ? (
        <View
          style={{
            width: "100%",
            height: 150,
            borderRadius: 16,
            overflow: "hidden",
            backgroundColor:
              "#11150F",
            borderWidth: 1,
            borderColor:
              CARD_BORDER,
            marginTop: 14,
            alignItems: "center",
            justifyContent:
              "center",
          }}
        >
          {videoThumbnail ? (
            <Image
              source={{
                uri:
                  videoThumbnail,
              }}
              resizeMode="contain"
              style={{
                width: "100%",
                height: "100%",
              }}
            />
          ) : (
            <>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor:
                    "rgba(255,255,255,0.12)",
                  borderWidth: 1,
                  borderColor:
                    "rgba(255,255,255,0.18)",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                }}
              >
                <Ionicons
                  name="play"
                  size={24}
                  color={SURFACE}
                  style={{
                    marginLeft: 3,
                  }}
                />
              </View>

              <Text
                style={{
                  color:
                    "rgba(255,255,255,0.78)",
                  fontSize: 11.5,
                  fontWeight: "800",
                  marginTop: 9,
                }}
              >
                Video attached
              </Text>
            </>
          )}

          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 10,
              bottom: 10,
              borderRadius: 999,
              paddingHorizontal: 9,
              paddingVertical: 5,
              backgroundColor:
                "rgba(0,0,0,0.68)",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons
              name="videocam-outline"
              size={13}
              color={SURFACE}
            />

            <Text
              style={{
                color: SURFACE,
                fontSize: 9.5,
                fontWeight: "900",
                marginLeft: 5,
                textTransform:
                  "uppercase",
              }}
            >
              Video
            </Text>
          </View>
        </View>
      ) : null}

      <View
        style={{
          height: 1,
          backgroundColor:
            CARD_BORDER,
          marginTop: 15,
          marginBottom: 11,
        }}
      />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <Ionicons
          name={
            post?.comments_enabled
              ? "chatbubble-ellipses-outline"
              : "chatbubble-ellipses"
          }
          size={14}
          color={
            post?.comments_enabled
              ? DEEP_OLIVE
              : MUTED
          }
        />

        <Text
          style={{
            color: MUTED,
            fontSize: 10.5,
            fontWeight: "800",
            marginLeft: 5,
          }}
        >
          Comments{" "}
          {post?.comments_enabled
            ? "open"
            : "closed"}
        </Text>

        <Text
          style={{
            color: MUTED,
            fontSize: 10.5,
            fontWeight: "800",
            marginLeft: 10,
          }}
        >
          {formatDate(
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
              marginLeft: 10,
            }}
          >
            Edited
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function NetworkPostsAdmin() {
  const navigation = useNavigation();
  const route = useRoute();

  const networkUuid =
    route.params?.networkUuid ||
    route.params?.networkId ||
    null;

  const [selectedState, setSelectedState] =
    useState("published");

const [posts, setPosts] = useState([]);
const [selectedPost, setSelectedPost] = useState(null);
const [deleteTargetPost, setDeleteTargetPost] = useState(null);
const [actionsBusy, setActionsBusy] = useState(false);

const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] =
  useState(false);
const [loadError, setLoadError] = useState("");

  const selectedStateDetails = useMemo(
    () =>
      CONTENT_STATES.find(
        (item) => item.key === selectedState
      ) || CONTENT_STATES[0],
    [selectedState]
  );

  const loadPosts = useCallback(
    async ({ showLoader = true } = {}) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        setLoadError("");

        if (!networkUuid) {
          throw new Error(
            "No Network identity was provided."
          );
        }

        const { data, error } = await supabase.rpc(
          "get_network_posts_for_management_rpc",
          {
            target_network_uuid: networkUuid,
            requested_content_state: selectedState,
            requested_post_type: null,
            requested_limit: 50,
            requested_offset: 0,
          }
        );

        if (error) {
          throw error;
        }

        setPosts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.log(
          "Network Posts Admin load error:",
          error
        );

        setLoadError(
          error?.message ||
            "Triunely could not load Network content."
        );

        setPosts([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [networkUuid, selectedState]
  );

  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [loadPosts])
  );

function handleRefresh() {
  setRefreshing(true);
  loadPosts({
    showLoader: false,
  });
}

async function handleTogglePin(post) {
  if (!post?.id || actionsBusy) {
    return;
  }

  try {
    setActionsBusy(true);

    const requestedIsPinned = !Boolean(post.is_pinned);

    const { data, error } = await supabase.rpc(
      "set_network_post_pinned_rpc",
      {
        target_post_id: post.id,
        requested_is_pinned: requestedIsPinned,
      }
    );

    if (error) {
      throw error;
    }

    setPosts((currentPosts) =>
      currentPosts.map((currentPost) =>
        currentPost.id === data.id
          ? {
              ...currentPost,
              is_pinned: data.is_pinned,
              pinned_at: data.pinned_at,
              updated_at: data.updated_at,
            }
          : currentPost
      )
    );

    setSelectedPost(null);

    await loadPosts({
      showLoader: false,
    });

    console.log(
      requestedIsPinned
        ? "NETWORK POST PIN SUCCESS:"
        : "NETWORK POST UNPIN SUCCESS:",
      data
    );
  } catch (error) {
    console.log(
      "NETWORK POST PIN TOGGLE ERROR:",
      error
    );
  } finally {
    setActionsBusy(false);
  }
}

async function handleTogglePublication(post) {
  if (!post?.id || actionsBusy) {
    return;
  }

  try {
    setActionsBusy(true);

    const requestedPublicationStatus =
      post.publication_status === "published"
        ? "draft"
        : "published";

    const { data, error } = await supabase.rpc(
      "set_network_post_publication_status_rpc",
      {
        target_post_id: post.id,
        requested_publication_status:
          requestedPublicationStatus,
      }
    );

    if (error) {
      throw error;
    }

    setSelectedPost(null);

    await loadPosts({
      showLoader: false,
    });

    console.log(
      requestedPublicationStatus === "published"
        ? "NETWORK POST PUBLISH SUCCESS:"
        : "NETWORK POST MOVE TO DRAFT SUCCESS:",
      data
    );
  } catch (error) {
    console.log(
      "NETWORK POST PUBLICATION TOGGLE ERROR:",
      error
    );
  } finally {
    setActionsBusy(false);
  }
}

async function handleArchivePost(post) {
  if (!post?.id || actionsBusy) {
    return;
  }

  try {
    setActionsBusy(true);

    const { data, error } = await supabase.rpc(
      "archive_network_post_rpc",
      {
        target_post_id: post.id,
      }
    );

    if (error) {
      throw error;
    }

    setSelectedPost(null);

    await loadPosts({
      showLoader: false,
    });

    console.log(
      "NETWORK POST ARCHIVE SUCCESS:",
      data
    );
  } catch (error) {
    console.log(
      "NETWORK POST ARCHIVE ERROR:",
      error
    );
  } finally {
    setActionsBusy(false);
  }
}

async function handleRestorePost(post) {
  if (!post?.id || actionsBusy) {
    return;
  }

  try {
    setActionsBusy(true);

    const { data, error } = await supabase.rpc(
      "restore_network_post_rpc",
      {
        target_post_id: post.id,
      }
    );

    if (error) {
      throw error;
    }

    setSelectedPost(null);

    await loadPosts({
      showLoader: false,
    });

    console.log(
      "NETWORK POST RESTORE SUCCESS:",
      data
    );
  } catch (error) {
    console.log(
      "NETWORK POST RESTORE ERROR:",
      error
    );
  } finally {
    setActionsBusy(false);
  }
}

  if (loading) {
    return (
      <Screen
        backgroundColor={PREMIUM_CREAM}
        padded={false}
        style={{
          flex: 1,
        }}
      >
        {() => (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 24,
            }}
          >
            <View
              style={{
                width: 66,
                height: 66,
                borderRadius: 33,
                backgroundColor: SOFT_GOLD_BG,
                borderWidth: 1,
                borderColor: GOLD_BORDER,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ActivityIndicator
                size="small"
                color={HEAVENLY_GOLD}
              />
            </View>

            <Text
              style={{
                fontFamily: displayFont,
                color: TEXT,
                fontSize: 20,
                lineHeight: 25,
                fontWeight: "900",
                textAlign: "center",
                marginTop: 16,
              }}
            >
              Opening communications
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 13,
                fontWeight: "700",
                textAlign: "center",
                lineHeight: 19,
                marginTop: 6,
              }}
            >
              Loading Network posts and announcements.
            </Text>
          </View>
        )}
      </Screen>
    );
  }

  return (
    <Screen
      backgroundColor={PREMIUM_CREAM}
      padded={false}
      style={{
        flex: 1,
      }}
    >
{({ bottomPad }) => (
  <>
    <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={HEAVENLY_GOLD}
              colors={[HEAVENLY_GOLD]}
            />
          }
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: bottomPad + 24,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 18,
            }}
          >
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={10}
              style={({ pressed }) => ({
                width: 42,
                height: 42,
                borderRadius: 21,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed
                  ? SOFT_OLIVE_BG
                  : SURFACE,
                borderWidth: 1,
                borderColor: OLIVE_BORDER,
                marginRight: 12,
              })}
            >
              <Ionicons
                name="chevron-back"
                size={23}
                color={DEEP_OLIVE}
              />
            </Pressable>

            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={{
                  fontFamily: displayFont,
                  color: TEXT,
                  fontSize: 25,
                  lineHeight: 30,
                  fontWeight: "900",
                  letterSpacing: -0.4,
                }}
              >
                Posts and Announcements
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 12,
                  fontWeight: "800",
                  marginTop: 2,
                }}
              >
                Official communication and Network content
              </Text>
            </View>
          </View>

          <View
            style={{
              borderRadius: 25,
              backgroundColor: DEEP_OLIVE,
              padding: 18,
              marginBottom: 18,
              overflow: "hidden",
            }}
          >
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                width: 180,
                height: 180,
                borderRadius: 90,
                top: -105,
                right: -45,
                backgroundColor:
                  "rgba(180, 83, 9, 0.26)",
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
                  width: 51,
                  height: 51,
                  borderRadius: 26,
                  backgroundColor:
                    "rgba(255, 255, 255, 0.12)",
                  borderWidth: 1,
                  borderColor:
                    "rgba(255, 255, 255, 0.20)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 13,
                }}
              >
                <Ionicons
                  name="megaphone-outline"
                  size={25}
                  color={SURFACE}
                />
              </View>

              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={{
                    fontFamily: displayFont,
                    color: SURFACE,
                    fontSize: 21,
                    fontWeight: "900",
                    lineHeight: 26,
                  }}
                >
                  Network Communications
                </Text>

                <Text
                  style={{
                    color:
                      "rgba(255, 255, 255, 0.82)",
                    fontSize: 12,
                    fontWeight: "700",
                    lineHeight: 18,
                    marginTop: 4,
                  }}
                >
                  Manage official announcements, drafts,
                  published posts and archived content.
                </Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                gap: 9,
                marginTop: 16,
              }}
            >
              <Pressable
                onPress={() => {
                  console.log(
                    "Create Network announcement will be connected next."
                  );
                }}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 45,
                  borderRadius: 999,
                  backgroundColor: pressed
                    ? "rgba(255, 255, 255, 0.15)"
                    : "rgba(255, 255, 255, 0.11)",
                  borderWidth: 1,
                  borderColor:
                    "rgba(255, 255, 255, 0.20)",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  transform: [
                    {
                      translateY: pressed ? 1 : 0,
                    },
                  ],
                })}
              >
                <Ionicons
                  name="megaphone-outline"
                  size={17}
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
                  Announcement
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  console.log(
                    "Create Network post will be connected next."
                  );
                }}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 45,
                  borderRadius: 999,
                  backgroundColor: pressed
                    ? "#92400E"
                    : HEAVENLY_GOLD,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  transform: [
                    {
                      translateY: pressed ? 1 : 0,
                    },
                  ],
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
                    fontSize: 11.5,
                    fontWeight: "900",
                    marginLeft: 6,
                  }}
                >
                  Create Post
                </Text>
              </Pressable>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingRight: 8,
              paddingBottom: 4,
            }}
            style={{
              marginBottom: 15,
            }}
          >
            {CONTENT_STATES.map((item) => (
              <StateTab
                key={item.key}
                item={item}
                selected={selectedState === item.key}
                onPress={() => {
                  setSelectedState(item.key);
                }}
              />
            ))}
          </ScrollView>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={{
                  fontFamily: displayFont,
                  color: TEXT,
                  fontSize: 20,
                  fontWeight: "900",
                  lineHeight: 25,
                }}
              >
                {selectedStateDetails.label}
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 11.5,
                  fontWeight: "700",
                  marginTop: 2,
                }}
              >
                {posts.length === 1
                  ? "1 item"
                  : `${posts.length} items`}
              </Text>
            </View>

            <Pressable
              onPress={handleRefresh}
              hitSlop={10}
              style={({ pressed }) => ({
                width: 38,
                height: 38,
                borderRadius: 19,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: OLIVE_BORDER,
                backgroundColor: pressed
                  ? SOFT_OLIVE_BG
                  : SURFACE,
              })}
            >
              <Ionicons
                name="refresh-outline"
                size={18}
                color={DEEP_OLIVE}
              />
            </Pressable>
          </View>

          {loadError ? (
            <View
              style={{
                ...premiumCardStyle,
                borderColor: DANGER_BORDER,
                backgroundColor: SOFT_DANGER_BG,
                padding: 18,
                alignItems: "center",
              }}
            >
              <Ionicons
                name="warning-outline"
                size={28}
                color={DANGER}
              />

              <Text
                style={{
                  color: DANGER,
                  fontSize: 14,
                  fontWeight: "900",
                  textAlign: "center",
                  marginTop: 10,
                }}
              >
                Communications unavailable
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 12.5,
                  fontWeight: "700",
                  lineHeight: 18,
                  textAlign: "center",
                  marginTop: 6,
                }}
              >
                {loadError}
              </Text>

              <Pressable
                onPress={() => loadPosts()}
                style={({ pressed }) => ({
                  minHeight: 44,
                  borderRadius: 999,
                  backgroundColor: pressed
                    ? "#92400E"
                    : HEAVENLY_GOLD,
                  paddingHorizontal: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 15,
                })}
              >
                <Text
                  style={{
                    color: SURFACE,
                    fontSize: 12,
                    fontWeight: "900",
                  }}
                >
                  Try Again
                </Text>
              </Pressable>
            </View>
          ) : posts.length === 0 ? (
            <View
              style={{
                ...premiumCardStyle,
                padding: 23,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 29,
                  backgroundColor: SOFT_OLIVE_BG,
                  borderWidth: 1,
                  borderColor: OLIVE_BORDER,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name={selectedStateDetails.icon}
                  size={27}
                  color={DEEP_OLIVE}
                />
              </View>

              <Text
                style={{
                  fontFamily: displayFont,
                  color: TEXT,
                  fontSize: 19,
                  fontWeight: "900",
                  textAlign: "center",
                  marginTop: 14,
                }}
              >
                No {selectedStateDetails.label.toLowerCase()} content
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 12.5,
                  fontWeight: "700",
                  lineHeight: 19,
                  textAlign: "center",
                  marginTop: 6,
                }}
              >
                Network posts and official announcements
                in this section will appear here.
              </Text>
            </View>
          ) : (
posts.map((post) => (
  <ContentCard
    key={post.id}
    post={post}
    onOpenActions={setSelectedPost}
  />
))
          )}
        </ScrollView>

        <NetworkPostActionsSheet
          visible={Boolean(selectedPost)}
          post={selectedPost}
          busy={actionsBusy}
          onClose={() => {
            if (!actionsBusy) {
              setSelectedPost(null);
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
onTogglePin={handleTogglePin}
          onTogglePublication={handleTogglePublication}
          onArchive={handleArchivePost}
          onRestore={handleRestorePost}
          onDelete={(post) => {
            setSelectedPost(null);
            setDeleteTargetPost(post);
          }}
        />

        <NetworkPostDeleteConfirmSheet
          visible={Boolean(deleteTargetPost)}
          post={deleteTargetPost}
          onClose={() => {
            setDeleteTargetPost(null);
          }}
          onDeleted={async () => {
            setDeleteTargetPost(null);

            await loadPosts({
              showLoader: false,
            });
          }}
        />
      </>
      )}
    </Screen>
  );
}