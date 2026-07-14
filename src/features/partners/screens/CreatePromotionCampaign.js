// src/features/partners/screens/CreatePromotionCampaign.js
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";

import Screen from "../../../components/Screen";
import { supabase } from "../../../lib/supabase";
import {
    createPromotionCampaign,
    fetchPartnerPosts,
    fetchPartnerProfileById,
    PROMOTION_CAMPAIGN_TYPES,
    TARGET_AUDIENCE_TYPE_OPTIONS,
    TARGET_CHURCH_CONTEXT_OPTIONS,
    TARGET_CONTENT_TYPE_OPTIONS,
    TARGET_INTEREST_OPTIONS,
    TARGET_LIFE_STAGE_OPTIONS,
    TARGET_ROLE_OPTIONS,
} from "../services/partnersService";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";

const CARD_BORDER = "rgba(15, 23, 42, 0.08)";
const AMBER_SOFT = "rgba(180, 83, 9, 0.10)";
const AMBER_BORDER = "rgba(180, 83, 9, 0.18)";
const OLIVE_SOFT = "rgba(79, 99, 59, 0.10)";
const OLIVE_BORDER = "rgba(79, 99, 59, 0.18)";
const SHADOW = "rgba(15, 23, 42, 0.10)";

const displayFont =
  Platform.OS === "ios" ? "Georgia" : "serif";

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

function humanLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function formatPostDate(value) {
  if (!value) return "Partner post";

  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "Partner post";
  }
}

function getPostDisplayTitle(post) {
  return (
    String(post?.title || "").trim() ||
    String(post?.content || "").trim() ||
    "Partner post"
  );
}

function getPostPreviewText(post) {
  return String(
    post?.content ||
      post?.link_description ||
      post?.title ||
      ""
  ).trim();
}

function isVideoPost(post) {
  const mediaType = String(
    post?.media_type || ""
  ).toLowerCase();

  const mediaUrl = String(
    post?.media_url || ""
  ).toLowerCase();

  return (
    mediaType.includes("video") ||
    mediaUrl.includes(".mp4") ||
    mediaUrl.includes(".mov") ||
    mediaUrl.includes(".webm")
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = "default",
  autoCapitalize = "sentences",
}) {
  return (
    <View style={{ marginBottom: 13 }}>
      <Text
        style={{
          color: MUTED,
          fontSize: 11.5,
          fontWeight: "900",
          textTransform: "uppercase",
          letterSpacing: 0.45,
          marginBottom: 7,
        }}
      >
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={MUTED}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={{
          minHeight: multiline ? 104 : 48,
          textAlignVertical: multiline
            ? "top"
            : "center",
          borderRadius: 18,
          backgroundColor: PREMIUM_CREAM,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          paddingHorizontal: 13,
          paddingVertical: multiline ? 12 : 0,
          color: TEXT,
          fontSize: 14,
          fontWeight: "800",
          lineHeight: multiline ? 20 : undefined,
        }}
      />
    </View>
  );
}

function OptionCard({
  label,
  icon,
  active,
  onPress,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: "48%",
        borderRadius: 18,
        padding: 12,
        marginBottom: 10,
        backgroundColor: active
          ? AMBER_SOFT
          : PREMIUM_CREAM,
        borderWidth: 1,
        borderColor: active
          ? AMBER_BORDER
          : CARD_BORDER,

        transform: [
          {
            translateY: pressed ? 2 : 0,
          },
          {
            scale: pressed ? 0.985 : 1,
          },
        ],

        shadowColor: SHADOW,
        shadowOpacity: pressed ? 0.01 : 0.06,
        shadowRadius: pressed ? 1 : 5,
        shadowOffset: {
          width: 0,
          height: pressed ? 0 : 3,
        },

        elevation: pressed ? 0 : 1,
        opacity: pressed ? 0.96 : 1,
      })}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: active
            ? EVENT_AMBER
            : OLIVE_SOFT,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        <Ionicons
          name={icon}
          size={17}
          color={active ? SURFACE : OLIVE}
        />
      </View>

      <Text
        style={{
          color: active ? EVENT_BROWN : TEXT,
          fontSize: 12.5,
          fontWeight: "900",
          lineHeight: 17,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function LockedCampaignTypeCard({
  campaignType,
  icon,
  label,
}) {
  const description =
    campaignType === "boost_post"
      ? "Choose a specific Partner Post and promote it to a targeted Christian audience."
      : "Promote the whole Partner Profile across relevant parts of Triunely.";

  return (
    <View
      style={{
        borderRadius: 20,
        padding: 14,
        backgroundColor: AMBER_SOFT,
        borderWidth: 1,
        borderColor: AMBER_BORDER,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: EVENT_AMBER,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Ionicons
          name={icon || "trending-up-outline"}
          size={21}
          color={SURFACE}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: EVENT_BROWN,
            fontSize: 15,
            fontWeight: "900",
          }}
        >
          {label}
        </Text>

        <Text
          style={{
            color: MUTED,
            fontSize: 12.5,
            fontWeight: "700",
            lineHeight: 18,
            marginTop: 3,
          }}
        >
          {description}
        </Text>
      </View>

      <Ionicons
        name="checkmark-circle"
        size={21}
        color={EVENT_AMBER}
        style={{ marginLeft: 8 }}
      />
    </View>
  );
}

function TargetChip({
  label,
  active,
  onPress,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: 999,
        paddingHorizontal: 11,
        paddingVertical: 8,
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: active
          ? EVENT_AMBER
          : PREMIUM_CREAM,
        borderWidth: 1,
        borderColor: active
          ? EVENT_AMBER
          : CARD_BORDER,
        flexDirection: "row",
        alignItems: "center",

        transform: [
          {
            translateY: pressed ? 2 : 0,
          },
          {
            scale: pressed ? 0.98 : 1,
          },
        ],

        opacity: pressed ? 0.95 : 1,
      })}
    >
      {active ? (
        <Ionicons
          name="checkmark-circle"
          size={14}
          color={SURFACE}
          style={{ marginRight: 5 }}
        />
      ) : null}

      <Text
        style={{
          color: active ? SURFACE : TEXT,
          fontSize: 12,
          fontWeight: "900",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  icon,
}) {
  return (
    <View
      style={{
        borderRadius: 18,
        backgroundColor: value
          ? AMBER_SOFT
          : OLIVE_SOFT,
        borderWidth: 1,
        borderColor: value
          ? AMBER_BORDER
          : OLIVE_BORDER,
        padding: 12,
        marginBottom: 9,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: SURFACE,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
        }}
      >
        <Ionicons
          name={icon}
          size={17}
          color={value ? EVENT_BROWN : OLIVE}
        />
      </View>

      <View
        style={{
          flex: 1,
          paddingRight: 10,
        }}
      >
        <Text
          style={{
            color: TEXT,
            fontSize: 13.5,
            fontWeight: "900",
          }}
        >
          {label}
        </Text>

        {description ? (
          <Text
            style={{
              color: MUTED,
              fontSize: 12,
              fontWeight: "700",
              lineHeight: 17,
              marginTop: 2,
            }}
          >
            {description}
          </Text>
        ) : null}
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: "rgba(79, 99, 59, 0.22)",
          true: AMBER_BORDER,
        }}
        thumbColor={
          value ? EVENT_AMBER : SURFACE
        }
      />
    </View>
  );
}

function BudgetOption({
  title,
  subtitle,
  amount,
  active,
  onPress,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: "48%",
        borderRadius: 18,
        padding: 12,
        marginBottom: 10,
        backgroundColor: active
          ? AMBER_SOFT
          : PREMIUM_CREAM,
        borderWidth: 1,
        borderColor: active
          ? AMBER_BORDER
          : CARD_BORDER,

        transform: [
          {
            translateY: pressed ? 3 : 0,
          },
          {
            scale: pressed ? 0.985 : 1,
          },
        ],

        shadowColor: SHADOW,
        shadowOpacity: pressed ? 0.01 : 0.07,
        shadowRadius: pressed ? 1 : 5,
        shadowOffset: {
          width: 0,
          height: pressed ? 0 : 3,
        },

        elevation: pressed ? 0 : 1,
        opacity: pressed ? 0.96 : 1,
      })}
    >
      <Text
        style={{
          color: active ? EVENT_BROWN : TEXT,
          fontSize: 15,
          fontWeight: "900",
        }}
      >
        £{amount}
      </Text>

      <Text
        style={{
          color: active ? EVENT_BROWN : TEXT,
          fontSize: 12.5,
          fontWeight: "900",
          marginTop: 4,
        }}
      >
        {title}
      </Text>

      <Text
        style={{
          color: MUTED,
          fontSize: 11.5,
          fontWeight: "700",
          lineHeight: 16,
          marginTop: 4,
        }}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}

function CompactPostCard({
  post,
  active,
  onPress,
}) {
  const title = getPostDisplayTitle(post);
  const postType = humanLabel(
    post?.post_type || "update"
  );

  const hasMedia = Boolean(post?.media_url);
  const video = isVideoPost(post);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 154,
        marginRight: 11,
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: active
          ? AMBER_SOFT
          : SURFACE,
        borderWidth: active ? 2 : 1,
        borderColor: active
          ? EVENT_AMBER
          : CARD_BORDER,

        transform: [
          {
            translateY: pressed ? 3 : 0,
          },
          {
            scale: pressed ? 0.975 : 1,
          },
        ],

        shadowColor: SHADOW,
        shadowOpacity: pressed
          ? 0.01
          : active
            ? 0.13
            : 0.07,
        shadowRadius: pressed
          ? 1
          : active
            ? 8
            : 5,
        shadowOffset: {
          width: 0,
          height: pressed ? 0 : 4,
        },

        elevation: pressed
          ? 0
          : active
            ? 4
            : 2,

        opacity: pressed ? 0.97 : 1,
      })}
    >
      <View
        style={{
          height: 96,
          backgroundColor: OLIVE_SOFT,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {hasMedia && !video ? (
          <Image
            source={{ uri: post.media_url }}
            style={{
              width: "100%",
              height: "100%",
            }}
            resizeMode="cover"
          />
        ) : hasMedia && video ? (
          <>
            {post?.link_image ? (
              <Image
                source={{ uri: post.link_image }}
                style={{
                  width: "100%",
                  height: "100%",
                }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  flex: 1,
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: OLIVE,
                }}
              >
                <Ionicons
                  name="videocam-outline"
                  size={27}
                  color={SURFACE}
                />
              </View>
            )}

            <View
              style={{
                position: "absolute",
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor:
                  "rgba(15, 23, 42, 0.72)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="play"
                size={21}
                color={SURFACE}
                style={{ marginLeft: 2 }}
              />
            </View>
          </>
        ) : (
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: SURFACE,
                borderWidth: 1,
                borderColor: OLIVE_BORDER,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="document-text-outline"
                size={21}
                color={OLIVE}
              />
            </View>

            <Text
              style={{
                color: OLIVE,
                fontSize: 10.5,
                fontWeight: "900",
                marginTop: 6,
              }}
            >
              Text post
            </Text>
          </View>
        )}

        {active ? (
          <View
            style={{
              position: "absolute",
              top: 7,
              right: 7,
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: EVENT_AMBER,
              borderWidth: 2,
              borderColor: SURFACE,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="checkmark"
              size={17}
              color={SURFACE}
            />
          </View>
        ) : null}

        <View
          style={{
            position: "absolute",
            left: 7,
            bottom: 7,
            borderRadius: 999,
            backgroundColor:
              "rgba(255,255,255,0.94)",
            paddingHorizontal: 7,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: CARD_BORDER,
          }}
        >
          <Text
            style={{
              color: EVENT_BROWN,
              fontSize: 9.5,
              fontWeight: "900",
            }}
            numberOfLines={1}
          >
            {postType}
          </Text>
        </View>
      </View>

      <View
        style={{
          minHeight: 92,
          paddingHorizontal: 10,
          paddingTop: 9,
          paddingBottom: 10,
        }}
      >
        <Text
          style={{
            color: active
              ? EVENT_BROWN
              : TEXT,
            fontSize: 12.5,
            fontWeight: "900",
            lineHeight: 17,
          }}
          numberOfLines={2}
        >
          {title}
        </Text>

        <Text
          style={{
            color: MUTED,
            fontSize: 10.5,
            fontWeight: "700",
            marginTop: "auto",
            paddingTop: 7,
          }}
          numberOfLines={1}
        >
          {formatPostDate(post?.created_at)}
        </Text>
      </View>
    </Pressable>
  );
}

function SelectedPostSummary({
  post,
  onClear,
}) {
  if (!post) return null;

  const title = getPostDisplayTitle(post);
  const previewText = getPostPreviewText(post);
  const video = isVideoPost(post);

  return (
    <View
      style={{
        marginTop: 14,
        borderRadius: 20,
        backgroundColor: AMBER_SOFT,
        borderWidth: 1,
        borderColor: AMBER_BORDER,
        padding: 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: EVENT_AMBER,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 9,
          }}
        >
          <Ionicons
            name="checkmark"
            size={19}
            color={SURFACE}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: EVENT_BROWN,
              fontSize: 11,
              fontWeight: "900",
              textTransform: "uppercase",
              letterSpacing: 0.45,
            }}
          >
            Selected post
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 11,
              fontWeight: "700",
              marginTop: 2,
            }}
          >
            This is the post the campaign will boost.
          </Text>
        </View>

        <Pressable
          onPress={onClear}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            alignItems: "center",
            justifyContent: "center",

            transform: [
              {
                translateY: pressed ? 2 : 0,
              },
              {
                scale: pressed ? 0.95 : 1,
              },
            ],

            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Ionicons
            name="close"
            size={18}
            color={EVENT_BROWN}
          />
        </Pressable>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 78,
            height: 68,
            borderRadius: 15,
            overflow: "hidden",
            backgroundColor: OLIVE_SOFT,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 11,
          }}
        >
          {post?.media_url && !video ? (
            <Image
              source={{ uri: post.media_url }}
              style={{
                width: "100%",
                height: "100%",
              }}
              resizeMode="cover"
            />
          ) : (
            <Ionicons
              name={
                video
                  ? "videocam-outline"
                  : "document-text-outline"
              }
              size={25}
              color={OLIVE}
            />
          )}

          {video ? (
            <View
              style={{
                position: "absolute",
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor:
                  "rgba(15, 23, 42, 0.70)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="play"
                size={16}
                color={SURFACE}
                style={{ marginLeft: 2 }}
              />
            </View>
          ) : null}
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: EVENT_BROWN,
              fontSize: 14,
              fontWeight: "900",
              lineHeight: 19,
            }}
            numberOfLines={2}
          >
            {title}
          </Text>

          {previewText ? (
            <Text
              style={{
                color: MUTED,
                fontSize: 11.5,
                fontWeight: "700",
                lineHeight: 16,
                marginTop: 4,
              }}
              numberOfLines={2}
            >
              {previewText}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function PostPicker({
  partnerPosts,
  selectedPost,
  searchText,
  setSearchText,
  onSelectPost,
  onClearSelection,
}) {
  const normalisedSearch = String(
    searchText || ""
  )
    .trim()
    .toLowerCase();

  const filteredPosts = useMemo(() => {
    const posts = Array.isArray(partnerPosts)
      ? partnerPosts
      : [];

    let result = posts;

    if (normalisedSearch) {
      result = posts.filter((post) => {
        const haystack = [
          post?.title,
          post?.content,
          post?.post_type,
          post?.link_title,
          post?.link_description,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalisedSearch);
      });
    }

    if (
      !normalisedSearch &&
      selectedPost?.id
    ) {
      const selected = result.find(
        (post) => post.id === selectedPost.id
      );

      if (selected) {
        result = [
          selected,
          ...result.filter(
            (post) =>
              post.id !== selectedPost.id
          ),
        ];
      }
    }

    return result;
  }, [
    normalisedSearch,
    partnerPosts,
    selectedPost?.id,
  ]);

  if (!partnerPosts?.length) {
    return (
      <View
        style={{
          borderRadius: 18,
          backgroundColor: PREMIUM_CREAM,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          padding: 14,
        }}
      >
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: OLIVE_SOFT,
            borderWidth: 1,
            borderColor: OLIVE_BORDER,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 10,
          }}
        >
          <Ionicons
            name="document-text-outline"
            size={21}
            color={OLIVE}
          />
        </View>

        <Text
          style={{
            color: TEXT,
            fontSize: 13.5,
            fontWeight: "900",
          }}
        >
          No Partner Posts yet
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
          Create a Partner Post first, then come
          back to boost it.
        </Text>
      </View>
    );
  }

  return (
    <>
      <View
        style={{
          borderRadius: 18,
          backgroundColor: PREMIUM_CREAM,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          marginBottom: 12,
        }}
      >
        <Ionicons
          name="search-outline"
          size={18}
          color={OLIVE}
          style={{ marginRight: 8 }}
        />

        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search posts by title, wording or type"
          placeholderTextColor={MUTED}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            flex: 1,
            minHeight: 48,
            color: TEXT,
            fontSize: 13.5,
            fontWeight: "800",
          }}
        />

        {searchText ? (
          <Pressable
            onPress={() => setSearchText("")}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed
                ? OLIVE_SOFT
                : "transparent",
            })}
          >
            <Ionicons
              name="close-circle"
              size={19}
              color={MUTED}
            />
          </Pressable>
        ) : null}
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 9,
        }}
      >
        <Text
          style={{
            flex: 1,
            color: MUTED,
            fontSize: 11.5,
            fontWeight: "800",
          }}
        >
          {filteredPosts.length}{" "}
          {filteredPosts.length === 1
            ? "post"
            : "posts"}{" "}
          available
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: OLIVE,
              fontSize: 10.5,
              fontWeight: "900",
              marginRight: 4,
            }}
          >
            Swipe to browse
          </Text>

          <Ionicons
            name="arrow-forward"
            size={14}
            color={OLIVE}
          />
        </View>
      </View>

      {filteredPosts.length === 0 ? (
        <View
          style={{
            borderRadius: 18,
            backgroundColor: OLIVE_SOFT,
            borderWidth: 1,
            borderColor: OLIVE_BORDER,
            padding: 14,
            alignItems: "center",
          }}
        >
          <Ionicons
            name="search-outline"
            size={24}
            color={OLIVE}
          />

          <Text
            style={{
              color: TEXT,
              fontSize: 13.5,
              fontWeight: "900",
              marginTop: 8,
            }}
          >
            No matching posts
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 12,
              fontWeight: "700",
              lineHeight: 17,
              textAlign: "center",
              marginTop: 4,
            }}
          >
            Try a different title, phrase or post
            type.
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingRight: 18,
            paddingBottom: 8,
          }}
        >
          {filteredPosts.map((post) => (
            <CompactPostCard
              key={post.id}
              post={post}
              active={
                selectedPost?.id === post.id
              }
              onPress={() => onSelectPost(post)}
            />
          ))}
        </ScrollView>
      )}

      <SelectedPostSummary
        post={selectedPost}
        onClear={onClearSelection}
      />
    </>
  );
}

function TargetSection({
  title,
  subtitle,
  options,
  selected,
  setSelected,
}) {
  function toggle(value) {
    setSelected((previous) => {
      const values = Array.isArray(previous)
        ? previous
        : [];

      if (values.includes(value)) {
        return values.filter(
          (item) => item !== value
        );
      }

      return [...values, value];
    });
  }

  return (
    <View style={{ marginBottom: 15 }}>
      <Text
        style={{
          color: TEXT,
          fontSize: 15,
          fontWeight: "900",
          marginBottom: 3,
        }}
      >
        {title}
      </Text>

      {subtitle ? (
        <Text
          style={{
            color: MUTED,
            fontSize: 12.5,
            fontWeight: "700",
            lineHeight: 18,
            marginBottom: 9,
          }}
        >
          {subtitle}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
        }}
      >
        {(options || []).map((value) => (
          <TargetChip
            key={value}
            label={humanLabel(value)}
            active={(selected || []).includes(
              value
            )}
            onPress={() => toggle(value)}
          />
        ))}
      </View>
    </View>
  );
}

export default function CreatePromotionCampaign({
  route,
  navigation,
}) {
  const partnerProfileId =
    route?.params?.partnerProfileId || null;

  const partnerPostId =
    route?.params?.partnerPostId || null;

  const suppliedCampaignType =
    route?.params?.campaignType || null;

  const initialCampaignType =
    suppliedCampaignType || "boost_post";

  const campaignTypeIsLocked = Boolean(
    suppliedCampaignType
  );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState(null);

  const [partner, setPartner] =
    useState(null);

  const [
    selectedPost,
    setSelectedPost,
  ] = useState(null);

  const [
    partnerPosts,
    setPartnerPosts,
  ] = useState([]);

  const [
    postSearchText,
    setPostSearchText,
  ] = useState("");

  const [
    campaignType,
    setCampaignType,
  ] = useState(initialCampaignType);

  const [title, setTitle] =
    useState("");

  const [objective, setObjective] =
    useState("");

  const [
    budgetPounds,
    setBudgetPounds,
  ] = useState("10");

  const [
    targetLocationsText,
    setTargetLocationsText,
  ] = useState("");

  const [
    targetCategoriesText,
    setTargetCategoriesText,
  ] = useState("");

  const [targetRoles, setTargetRoles] =
    useState([]);

  const [
    targetInterests,
    setTargetInterests,
  ] = useState([]);

  const [
    targetLifeStages,
    setTargetLifeStages,
  ] = useState([]);

  const [
    targetAudienceTypes,
    setTargetAudienceTypes,
  ] = useState([]);

  const [
    targetChurchContexts,
    setTargetChurchContexts,
  ] = useState([]);

  const [
    targetContentTypes,
    setTargetContentTypes,
  ] = useState([]);

  const [
    localRadiusMiles,
    setLocalRadiusMiles,
  ] = useState("20");

  const [national, setNational] =
    useState(false);

  const [
    churchFacing,
    setChurchFacing,
  ] = useState(false);

  const [
    familyFacing,
    setFamilyFacing,
  ] = useState(false);

  const [
    creatorFacing,
    setCreatorFacing,
  ] = useState(false);

  const [
    entrepreneurFacing,
    setEntrepreneurFacing,
  ] = useState(false);

  const selectedCampaignType = useMemo(() => {
    return (
      PROMOTION_CAMPAIGN_TYPES.find(
        (item) => item.value === campaignType
      ) || PROMOTION_CAMPAIGN_TYPES[0]
    );
  }, [campaignType]);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const meId =
        sessionData?.session?.user?.id ||
        null;

      setCurrentUserId(meId);

      if (!meId) {
        Alert.alert(
          "Sign in required",
          "You need to be signed in."
        );

        navigation.goBack();
        return;
      }

      const profileResult =
        await fetchPartnerProfileById(
          partnerProfileId
        );

      if (
        !profileResult.ok ||
        !profileResult.partner
      ) {
        throw (
          profileResult.error ||
          new Error(
            "Partner profile not found"
          )
        );
      }

      if (
        profileResult.partner.owner_id !==
        meId
      ) {
        Alert.alert(
          "Not allowed",
          "Only the owner can promote this Partner Profile."
        );

        navigation.goBack();
        return;
      }

      setPartner(profileResult.partner);

      const postsResult =
        await fetchPartnerPosts({
          partnerProfileId,
          limit: 100,
        });

      const loadedPosts =
        postsResult?.ok
          ? postsResult.posts || []
          : [];

      setPartnerPosts(loadedPosts);

      const suppliedPost = partnerPostId
        ? loadedPosts.find(
            (post) =>
              post.id === partnerPostId
          )
        : null;

      setSelectedPost(suppliedPost || null);

      if (suppliedPost) {
        setTitle(
          `Boost: ${getPostDisplayTitle(
            suppliedPost
          )}`
        );
      } else {
        setTitle(
          initialCampaignType === "boost_post"
            ? `Boost ${profileResult.partner.name}`
            : `Promote ${profileResult.partner.name}`
        );
      }
    } catch (error) {
      console.log(
        "CreatePromotionCampaign load error:",
        error
      );

      Alert.alert(
        "Promotion",
        "We couldn't load this promotion campaign."
      );

      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [
    initialCampaignType,
    navigation,
    partnerPostId,
    partnerProfileId,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (
      campaignType !== "boost_post"
    ) {
      setSelectedPost(null);
      setPostSearchText("");
    }

    if (
      partner &&
      !partnerPostId
    ) {
      setTitle(
        campaignType === "boost_post"
          ? `Boost ${partner.name}`
          : `Promote ${partner.name}`
      );
    }
  }, [
    campaignType,
    partner,
    partnerPostId,
  ]);

  function splitTextList(value) {
    return String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function handleSelectPost(post) {
    setSelectedPost(post);

    setTitle(
      `Boost: ${getPostDisplayTitle(post)}`
    );
  }

  function handleClearSelectedPost() {
    setSelectedPost(null);

    if (partner) {
      setTitle(`Boost ${partner.name}`);
    }
  }

  async function handleSave() {
    try {
      if (saving) return;

      const cleanTitle = String(
        title || ""
      ).trim();

      if (!cleanTitle) {
        Alert.alert(
          "Campaign title required",
          "Add a campaign title."
        );

        return;
      }

      if (
        campaignType === "boost_post" &&
        !selectedPost?.id
      ) {
        Alert.alert(
          "Choose a post to boost",
          "Select the Partner Post you want this boost campaign to promote."
        );

        return;
      }

      setSaving(true);

      const budgetNumber = Number(
        budgetPounds || 0
      );

      if (
        !Number.isFinite(budgetNumber) ||
        budgetNumber <= 0
      ) {
        Alert.alert(
          "Budget required",
          "Add a campaign budget greater than £0."
        );

        return;
      }

      const budgetPence = Math.round(
        budgetNumber * 100
      );

      const campaignPostId =
        campaignType === "boost_post"
          ? selectedPost?.id
          : null;

      const result =
        await createPromotionCampaign({
          partnerProfileId,
          partnerPostId: campaignPostId,
          ownerId: currentUserId,
          campaignType,
          title: cleanTitle,
          objective,
          budgetPence,
          targetLocations: splitTextList(
            targetLocationsText
          ),
          targetCategories: splitTextList(
            targetCategoriesText
          ),
          targetRoles,
          targetInterests,
          targetLifeStages,
          targetAudienceTypes,
          targetChurchContexts,
          targetContentTypes,
          localRadiusMiles:
            localRadiusMiles
              ? Number(localRadiusMiles)
              : null,
          national,
          churchFacing,
          familyFacing,
          creatorFacing,
          entrepreneurFacing,
        });

      if (!result.ok) {
        throw result.error;
      }

      Alert.alert(
        campaignType === "boost_post"
          ? "Boost submitted"
          : "Promotion submitted",
        campaignType === "boost_post"
          ? "Your post boost has been saved as a draft and is ready for review/payment flow."
          : "Your promotion has been saved as a draft and is ready for review/payment flow.",
        [
          {
            text: "View Partner Profile",
            onPress: () => {
              navigation.replace(
                "PartnerProfilePublic",
                {
                  partnerProfileId,
                }
              );
            },
          },
        ]
      );
    } catch (error) {
      console.log(
        "CreatePromotionCampaign save error:",
        error
      );

      Alert.alert(
        "Promotion",
        error?.message ||
          "We couldn't create this promotion campaign right now."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: PREMIUM_CREAM,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator
          size="large"
          color={EVENT_AMBER}
        />

        <Text
          style={{
            color: MUTED,
            marginTop: 10,
            fontWeight: "800",
          }}
        >
          Loading promotion tools…
        </Text>
      </View>
    );
  }

  return (
    <Screen
      backgroundColor={PREMIUM_CREAM}
      padded={false}
      style={{ flex: 1 }}
    >
      {({ bottomPad }) => (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingBottom:
                bottomPad + 112,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                paddingHorizontal: 18,
                paddingTop: 12,
                paddingBottom: 14,
              }}
            >
              <Pressable
                onPress={() =>
                  navigation.goBack()
                }
                hitSlop={10}
                style={({ pressed }) => ({
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: SURFACE,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,

                  transform: [
                    {
                      translateY: pressed
                        ? 2
                        : 0,
                    },
                    {
                      scale: pressed
                        ? 0.96
                        : 1,
                    },
                  ],

                  shadowColor: SHADOW,
                  shadowOpacity: pressed
                    ? 0.01
                    : 0.08,
                  shadowRadius: pressed
                    ? 1
                    : 7,
                  shadowOffset: {
                    width: 0,
                    height: pressed
                      ? 0
                      : 3,
                  },

                  elevation: pressed ? 0 : 2,
                })}
              >
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={OLIVE}
                />
              </Pressable>

              <View style={{ marginTop: 16 }}>
                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 34,
                    lineHeight: 40,
                  }}
                >
                  {campaignType === "boost_post"
                    ? "Boost Partner Post"
                    : "Promote Partner Profile"}
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 14,
                    fontWeight: "700",
                    lineHeight: 21,
                    marginTop: 6,
                  }}
                >
                  {campaignType === "boost_post"
                    ? "Choose the right Partner Post, set your audience and build a targeted campaign."
                    : "Reach more Christians, churches, families, creators and entrepreneurs through the Triunely ecosystem."}
                </Text>
              </View>
            </View>

            <View
              style={{
                ...premiumCardStyle,
                marginHorizontal: 16,
                padding: 16,
                marginBottom: 14,
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: AMBER_SOFT,
                  borderWidth: 1,
                  borderColor: AMBER_BORDER,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Ionicons
                  name={
                    selectedCampaignType?.icon ||
                    "trending-up-outline"
                  }
                  size={25}
                  color={EVENT_BROWN}
                />
              </View>

              <Text
                style={{
                  ...serifHeading,
                  fontSize: 23,
                  lineHeight: 28,
                  marginBottom: 12,
                }}
              >
                Campaign type
              </Text>

              {campaignTypeIsLocked ? (
                <LockedCampaignTypeCard
                  campaignType={campaignType}
                  icon={
                    selectedCampaignType?.icon
                  }
                  label={
                    selectedCampaignType?.label ||
                    humanLabel(campaignType)
                  }
                />
              ) : (
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent:
                      "space-between",
                  }}
                >
                  {PROMOTION_CAMPAIGN_TYPES.map(
                    (item) => (
                      <OptionCard
                        key={item.value}
                        label={item.label}
                        icon={item.icon}
                        active={
                          campaignType ===
                          item.value
                        }
                        onPress={() =>
                          setCampaignType(
                            item.value
                          )
                        }
                      />
                    )
                  )}
                </View>
              )}
            </View>

            {campaignType === "boost_post" ? (
              <View
                style={{
                  ...premiumCardStyle,
                  marginHorizontal: 16,
                  padding: 16,
                  marginBottom: 14,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 5,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor:
                        OLIVE_SOFT,
                      borderWidth: 1,
                      borderColor:
                        OLIVE_BORDER,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 10,
                    }}
                  >
                    <Ionicons
                      name="albums-outline"
                      size={21}
                      color={OLIVE}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        ...serifHeading,
                        fontSize: 22,
                        lineHeight: 27,
                      }}
                    >
                      Post to boost
                    </Text>

                    <Text
                      style={{
                        color: MUTED,
                        fontSize: 12.5,
                        fontWeight: "700",
                        lineHeight: 18,
                        marginTop: 2,
                      }}
                    >
                      Search or swipe through your
                      Partner Posts and select one.
                    </Text>
                  </View>
                </View>

                <View style={{ marginTop: 14 }}>
                  <PostPicker
                    partnerPosts={partnerPosts}
                    selectedPost={selectedPost}
                    searchText={postSearchText}
                    setSearchText={
                      setPostSearchText
                    }
                    onSelectPost={
                      handleSelectPost
                    }
                    onClearSelection={
                      handleClearSelectedPost
                    }
                  />
                </View>
              </View>
            ) : null}

            <View
              style={{
                ...premiumCardStyle,
                marginHorizontal: 16,
                padding: 16,
                marginBottom: 14,
              }}
            >
              <Text
                style={{
                  ...serifHeading,
                  fontSize: 23,
                  lineHeight: 28,
                  marginBottom: 12,
                }}
              >
                Campaign details
              </Text>

              <Field
                label="Campaign title"
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Reach local Christian families"
              />

              <Field
                label="Objective"
                value={objective}
                onChangeText={setObjective}
                placeholder="What do you want this promotion to achieve?"
                multiline
              />

              <Text
                style={{
                  color: MUTED,
                  fontSize: 11.5,
                  fontWeight: "900",
                  textTransform: "uppercase",
                  letterSpacing: 0.45,
                  marginBottom: 8,
                }}
              >
                Budget
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent:
                    "space-between",
                  marginBottom: 8,
                }}
              >
                <BudgetOption
                  title="Starter"
                  subtitle="Test reach with a small local boost."
                  amount="5"
                  active={
                    budgetPounds === "5"
                  }
                  onPress={() =>
                    setBudgetPounds("5")
                  }
                />

                <BudgetOption
                  title="Growth"
                  subtitle="A stronger boost for local discovery."
                  amount="10"
                  active={
                    budgetPounds === "10"
                  }
                  onPress={() =>
                    setBudgetPounds("10")
                  }
                />

                <BudgetOption
                  title="Church reach"
                  subtitle="Push further across churches and families."
                  amount="25"
                  active={
                    budgetPounds === "25"
                  }
                  onPress={() =>
                    setBudgetPounds("25")
                  }
                />

                <BudgetOption
                  title="Wider reach"
                  subtitle="A serious campaign for wider Christian attention."
                  amount="50"
                  active={
                    budgetPounds === "50"
                  }
                  onPress={() =>
                    setBudgetPounds("50")
                  }
                />
              </View>

              <Field
                label="Custom budget"
                value={budgetPounds}
                onChangeText={setBudgetPounds}
                placeholder="10"
                keyboardType="numeric"
              />
            </View>

            <View
              style={{
                ...premiumCardStyle,
                marginHorizontal: 16,
                padding: 16,
                marginBottom: 14,
              }}
            >
              <Text
                style={{
                  ...serifHeading,
                  fontSize: 23,
                  lineHeight: 28,
                  marginBottom: 12,
                }}
              >
                Reach settings
              </Text>

              <ToggleRow
                icon="earth-outline"
                label="National reach"
                description="Promote beyond local discovery."
                value={national}
                onValueChange={setNational}
              />

              <ToggleRow
                icon="business-outline"
                label="Church-facing"
                description="Prioritise churches, leaders and church teams."
                value={churchFacing}
                onValueChange={setChurchFacing}
              />

              <ToggleRow
                icon="people-outline"
                label="Family-facing"
                description="Prioritise Christian families and parents."
                value={familyFacing}
                onValueChange={setFamilyFacing}
              />

              <ToggleRow
                icon="videocam-outline"
                label="Creator-facing"
                description="Prioritise Christian creators and content audiences."
                value={creatorFacing}
                onValueChange={setCreatorFacing}
              />

              <ToggleRow
                icon="briefcase-outline"
                label="Entrepreneur-facing"
                description="Prioritise Christian entrepreneurs and businesses."
                value={entrepreneurFacing}
                onValueChange={
                  setEntrepreneurFacing
                }
              />

              <Field
                label="Local radius miles"
                value={localRadiusMiles}
                onChangeText={
                  setLocalRadiusMiles
                }
                placeholder="20"
                keyboardType="numeric"
              />

              <Field
                label="Target locations"
                value={targetLocationsText}
                onChangeText={
                  setTargetLocationsText
                }
                placeholder="Southampton, Hampshire, London"
              />

              <Field
                label="Target categories"
                value={targetCategoriesText}
                onChangeText={
                  setTargetCategoriesText
                }
                placeholder="Worship, Counselling, Events, Books"
              />
            </View>

            <View
              style={{
                ...premiumCardStyle,
                marginHorizontal: 16,
                padding: 16,
                marginBottom: 24,
              }}
            >
              <Text
                style={{
                  ...serifHeading,
                  fontSize: 23,
                  lineHeight: 28,
                  marginBottom: 6,
                }}
              >
                Full targeting
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 13,
                  fontWeight: "700",
                  lineHeight: 19,
                  marginBottom: 15,
                }}
              >
                Choose who this campaign is built
                to reach. These options give
                Triunely the foundation for
                serious Christian business and
                creator growth.
              </Text>

              <TargetSection
                title="Roles"
                subtitle="Reach people by church, family, leadership or creator role."
                options={TARGET_ROLE_OPTIONS}
                selected={targetRoles}
                setSelected={setTargetRoles}
              />

              <TargetSection
                title="Interests"
                subtitle="Reach people based on what they care about."
                options={
                  TARGET_INTEREST_OPTIONS
                }
                selected={targetInterests}
                setSelected={
                  setTargetInterests
                }
              />

              <TargetSection
                title="Life stage"
                subtitle="Reach people in a relevant life or family context."
                options={
                  TARGET_LIFE_STAGE_OPTIONS
                }
                selected={targetLifeStages}
                setSelected={
                  setTargetLifeStages
                }
              />

              <TargetSection
                title="Audience type"
                subtitle="Reach broad strategic Christian audiences."
                options={
                  TARGET_AUDIENCE_TYPE_OPTIONS
                }
                selected={
                  targetAudienceTypes
                }
                setSelected={
                  setTargetAudienceTypes
                }
              />

              <TargetSection
                title="Church context"
                subtitle="Reach people connected to specific church contexts."
                options={
                  TARGET_CHURCH_CONTEXT_OPTIONS
                }
                selected={
                  targetChurchContexts
                }
                setSelected={
                  setTargetChurchContexts
                }
              />

              <TargetSection
                title="Content type"
                subtitle="Match the campaign to content people are likely to value."
                options={
                  TARGET_CONTENT_TYPE_OPTIONS
                }
                selected={
                  targetContentTypes
                }
                setSelected={
                  setTargetContentTypes
                }
              />
            </View>
          </ScrollView>

          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: bottomPad + 12,
              backgroundColor:
                "rgba(255,252,245,0.96)",
              borderTopWidth: 1,
              borderTopColor: CARD_BORDER,
            }}
          >
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => ({
                borderRadius: 999,
                backgroundColor: EVENT_AMBER,
                paddingVertical: 14,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",

                transform: [
                  {
                    translateY:
                      pressed && !saving
                        ? 3
                        : 0,
                  },
                  {
                    scale:
                      pressed && !saving
                        ? 0.985
                        : 1,
                  },
                ],

                shadowColor: EVENT_AMBER,
                shadowOpacity:
                  pressed || saving
                    ? 0.02
                    : 0.18,
                shadowRadius:
                  pressed || saving ? 1 : 8,
                shadowOffset: {
                  width: 0,
                  height:
                    pressed || saving
                      ? 0
                      : 4,
                },

                elevation:
                  pressed || saving ? 0 : 3,
                opacity: saving ? 0.62 : 1,
              })}
            >
              {saving ? (
                <ActivityIndicator
                  size="small"
                  color={SURFACE}
                />
              ) : (
                <>
                  <Ionicons
                    name="trending-up-outline"
                    size={17}
                    color={SURFACE}
                    style={{ marginRight: 7 }}
                  />

                  <Text
                    style={{
                      color: SURFACE,
                      fontSize: 14,
                      fontWeight: "900",
                    }}
                  >
                    {campaignType ===
                    "boost_post"
                      ? "Submit Boost for Review"
                      : "Submit Promotion for Review"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}