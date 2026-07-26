// C:\triunely\src\screens\NetworkPostComposer.js

import { Ionicons } from "@expo/vector-icons";
import {
    useNavigation,
    useRoute,
} from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import {
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    ActivityIndicator,
    Image,
    Platform,
    Pressable,
    Switch,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from "react-native";
import {
    KeyboardAwareScrollView,
} from "react-native-keyboard-controller";

import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";
import {
    isFeedVideoMedia,
    uploadFeedMedia,
} from "../lib/uploadFeedMedia";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const HEAVENLY_GOLD = "#B45309";
const EVENT_BROWN = "#7C2D12";
const DEEP_OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";
const DANGER = "#B91C1C";

const SOFT_GOLD_BG =
  "rgba(180, 83, 9, 0.10)";
const GOLD_BORDER =
  "rgba(180, 83, 9, 0.18)";
const SOFT_OLIVE_BG =
  "rgba(79, 99, 59, 0.10)";
const OLIVE_BORDER =
  "rgba(79, 99, 59, 0.18)";
const SOFT_DANGER_BG =
  "rgba(185, 28, 28, 0.08)";
const DANGER_BORDER =
  "rgba(185, 28, 28, 0.17)";
const CARD_BORDER =
  "rgba(15, 23, 42, 0.08)";
const SHADOW =
  "rgba(15, 23, 42, 0.10)";

const displayFont =
  Platform.OS === "ios"
    ? "Georgia"
    : "serif";

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

function ChoiceCard({
  value,
  selectedValue,
  icon,
  title,
  description,
  tone = "olive",
  onPress,
  disabled = false,
}) {
  const selected =
    value === selectedValue;

  const isGold =
    tone === "gold";

  const accentColor =
    isGold
      ? HEAVENLY_GOLD
      : DEEP_OLIVE;

  const selectedBackground =
    isGold
      ? SOFT_GOLD_BG
      : SOFT_OLIVE_BG;

  const selectedBorder =
    isGold
      ? GOLD_BORDER
      : OLIVE_BORDER;

  return (
    <Pressable
      disabled={disabled}
      onPress={() => onPress(value)}
      style={({ pressed }) => ({
        minHeight: 76,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: selected
          ? selectedBorder
          : CARD_BORDER,
        backgroundColor: selected
          ? selectedBackground
          : pressed
            ? "rgba(79, 99, 59, 0.06)"
            : SURFACE,
        padding: 13,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        opacity: disabled ? 0.5 : 1,
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: selected
            ? selectedBackground
            : "rgba(107, 114, 128, 0.08)",
          borderWidth: 1,
          borderColor: selected
            ? selectedBorder
            : CARD_BORDER,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 11,
        }}
      >
        <Ionicons
          name={icon}
          size={21}
          color={
            selected
              ? accentColor
              : MUTED
          }
        />
      </View>

      <View
        style={{
          flex: 1,
          paddingRight: 8,
        }}
      >
        <Text
          style={{
            color: selected
              ? isGold
                ? EVENT_BROWN
                : DEEP_OLIVE
              : TEXT,
            fontSize: 13.5,
            fontWeight: "900",
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
            marginTop: 3,
          }}
        >
          {description}
        </Text>
      </View>

      <Ionicons
        name={
          selected
            ? "checkmark-circle"
            : "ellipse-outline"
        }
        size={21}
        color={
          selected
            ? accentColor
            : MUTED
        }
      />
    </Pressable>
  );
}

function MediaActionButton({
  icon,
  label,
  tone = "olive",
  onPress,
  disabled = false,
}) {
  const isGold =
    tone === "gold";

  const accentColor =
    isGold
      ? HEAVENLY_GOLD
      : DEEP_OLIVE;

  const textColor =
    isGold
      ? EVENT_BROWN
      : DEEP_OLIVE;

  const borderColor =
    isGold
      ? GOLD_BORDER
      : OLIVE_BORDER;

  const pressedBackground =
    isGold
      ? SOFT_GOLD_BG
      : SOFT_OLIVE_BG;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 86,
        borderRadius: 18,
        borderWidth: 1,
        borderColor,
        backgroundColor: pressed
          ? pressedBackground
          : SURFACE,
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
        opacity: disabled ? 0.5 : 1,
      })}
    >
      <Ionicons
        name={icon}
        size={25}
        color={accentColor}
      />

      <Text
        style={{
          color: textColor,
          fontSize: 12.5,
          fontWeight: "900",
          marginTop: 7,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function NaturalVideoPreview({
  uri,
  width,
  height,
}) {
  const [
    thumbnailUri,
    setThumbnailUri,
  ] = useState(null);

  const [
    thumbnailLoading,
    setThumbnailLoading,
  ] = useState(true);

  const [
    thumbnailFailed,
    setThumbnailFailed,
  ] = useState(false);

  useEffect(() => {
    let active = true;

    async function createThumbnail() {
      if (!uri) {
        if (active) {
          setThumbnailUri(null);
          setThumbnailLoading(false);
          setThumbnailFailed(true);
        }

        return;
      }

      try {
        setThumbnailLoading(true);
        setThumbnailFailed(false);

        const result =
          await VideoThumbnails
            .getThumbnailAsync(
              uri,
              {
                time: 250,
                quality: 0.55,
              }
            );

        if (!active) {
          return;
        }

        setThumbnailUri(
          result?.uri || null
        );

        setThumbnailFailed(
          !result?.uri
        );
      } catch (error) {
        console.log(
          "NETWORK VIDEO THUMBNAIL ERROR:",
          error
        );

        if (active) {
          setThumbnailUri(null);
          setThumbnailFailed(true);
        }
      } finally {
        if (active) {
          setThumbnailLoading(false);
        }
      }
    }

    createThumbnail();

    return () => {
      active = false;
    };
  }, [uri]);

  return (
    <View
      style={{
        width,
        height,
        backgroundColor:
          "#11150F",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {thumbnailUri ? (
        <Image
          source={{
            uri: thumbnailUri,
          }}
          resizeMode="contain"
          style={{
            width,
            height,
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
            thumbnailUri
              ? "rgba(0, 0, 0, 0.18)"
              : "rgba(17, 21, 15, 0.92)",
        }}
      >
        {thumbnailLoading ? (
          <>
            <ActivityIndicator
              size="small"
              color={SURFACE}
            />

            <Text
              style={{
                color: SURFACE,
                fontSize: 11.5,
                fontWeight: "800",
                marginTop: 9,
              }}
            >
              Preparing video preview…
            </Text>
          </>
        ) : (
          <>
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 29,
                backgroundColor:
                  "rgba(255, 255, 255, 0.94)",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000000",
                shadowOpacity: 0.18,
                shadowRadius: 8,
                shadowOffset: {
                  width: 0,
                  height: 3,
                },
                elevation: 4,
              }}
            >
              <Ionicons
                name={
                  thumbnailFailed
                    ? "videocam-outline"
                    : "play"
                }
                size={
                  thumbnailFailed
                    ? 25
                    : 26
                }
                color={HEAVENLY_GOLD}
                style={
                  thumbnailFailed
                    ? undefined
                    : {
                        marginLeft: 3,
                      }
                }
              />
            </View>

            <Text
              style={{
                color: SURFACE,
                fontSize: 11.5,
                lineHeight: 16,
                fontWeight: "900",
                marginTop: 9,
                textAlign: "center",
                paddingHorizontal: 18,
              }}
            >
              {thumbnailFailed
                ? "Video selected"
                : "Video ready to publish"}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

function NaturalMediaPreview({
  media,
}) {
  const window =
    useWindowDimensions();

  const video =
    isFeedVideoMedia(media);

  const sourceWidth =
    Math.max(
      Number(media?.width) || 0,
      1
    );

  const sourceHeight =
    Math.max(
      Number(media?.height) || 0,
      1
    );

  const hasRealDimensions =
    Number(media?.width) > 0 &&
    Number(media?.height) > 0;

  const fallbackWidth =
    video ? 16 : 4;

  const fallbackHeight =
    video ? 9 : 3;

  const naturalWidth =
    hasRealDimensions
      ? sourceWidth
      : fallbackWidth;

  const naturalHeight =
    hasRealDimensions
      ? sourceHeight
      : fallbackHeight;

  const availableWidth =
    Math.max(
      window.width - 64,
      240
    );

  const availableHeight =
    Math.min(
      Math.max(
        window.height * 0.62,
        320
      ),
      620
    );

  const scale =
    Math.min(
      availableWidth /
        naturalWidth,
      availableHeight /
        naturalHeight
    );

  const displayWidth =
    Math.max(
      1,
      naturalWidth * scale
    );

  const displayHeight =
    Math.max(
      1,
      naturalHeight * scale
    );

  return (
    <View
      style={{
        width: "100%",
        minHeight: displayHeight,
        borderRadius: 18,
        overflow: "hidden",
        backgroundColor: "#11150F",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {video ? (
        <NaturalVideoPreview
          uri={media.uri}
          width={displayWidth}
          height={displayHeight}
        />
      ) : (
        <Image
          source={{
            uri: media.uri,
          }}
          style={{
            width: displayWidth,
            height: displayHeight,
          }}
          resizeMode="contain"
        />
      )}
    </View>
  );
}

function getAssetMediaKind(
  asset,
  expectedKind
) {
  const rawType =
    String(
      asset?.type ||
      asset?.mimeType ||
      ""
    ).toLowerCase();

  if (
    rawType === "video" ||
    rawType.startsWith("video/")
  ) {
    return "video";
  }

  if (
    rawType === "image" ||
    rawType.startsWith("image/")
  ) {
    return "image";
  }

  return expectedKind;
}

export default function NetworkPostComposer() {
  const navigation =
    useNavigation();

  const route =
    useRoute();

  const networkUuid =
    route.params?.networkUuid ||
    route.params?.networkId ||
    null;

  const networkName =
    route.params?.networkName ||
    "Network";

  const initialPostType =
    route.params
      ?.initialPostType ===
    "announcement"
      ? "announcement"
      : "post";

  const [
    postType,
    setPostType,
  ] = useState(
    initialPostType
  );

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    body,
    setBody,
  ] = useState("");

  const [
    visibility,
    setVisibility,
  ] = useState("members");

  const [
    commentsEnabled,
    setCommentsEnabled,
  ] = useState(true);

  const [
    savingMode,
    setSavingMode,
  ] = useState(null);

  const [
    saveError,
    setSaveError,
  ] = useState("");

  const [
    selectedMedia,
    setSelectedMedia,
  ] = useState(null);

  const isAnnouncement =
    postType ===
    "announcement";

  const cleanTitle =
    title.trim();

  const cleanBody =
    body.trim();

  const isSaving =
    savingMode !== null;

  const selectedMediaIsVideo =
    isFeedVideoMedia(
      selectedMedia
    );

  const canSubmit =
    useMemo(
      () =>
        Boolean(networkUuid) &&
        Boolean(cleanBody) &&
        (
          !isAnnouncement ||
          Boolean(cleanTitle)
        ) &&
        cleanTitle.length <=
          180 &&
        cleanBody.length <=
          10000 &&
        !isSaving,
      [
        cleanBody,
        cleanTitle,
        isAnnouncement,
        isSaving,
        networkUuid,
      ]
    );

  function handlePostTypeChange(
    nextPostType
  ) {
    if (isSaving) {
      return;
    }

    setPostType(nextPostType);
    setSaveError("");
  }

  async function ensureMediaPermission() {
    const permission =
      await ImagePicker
        .requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setSaveError(
        "Please allow photo and video access before adding media."
      );

      return false;
    }

    return true;
  }

  async function pickPhoto() {
    if (isSaving) {
      return;
    }

    try {
      setSaveError("");

      const allowed =
        await ensureMediaPermission();

      if (!allowed) {
        return;
      }

      const result =
        await ImagePicker
          .launchImageLibraryAsync({
            mediaTypes:
              ImagePicker
                .MediaTypeOptions
                .Images,
            allowsEditing: false,
            quality: 1,
            selectionLimit: 1,
          });

      if (result.canceled) {
        return;
      }

      const asset =
        result.assets?.[0];

      if (!asset?.uri) {
        throw new Error(
          "Triunely could not read the selected photo."
        );
      }

      const kind =
        getAssetMediaKind(
          asset,
          "image"
        );

      if (kind !== "image") {
        throw new Error(
          "Please select a photo from your library."
        );
      }

      setSelectedMedia({
        ...asset,
        kind: "image",
        assetType: "image",
        mediaType: "image",
      });
    } catch (error) {
      console.log(
        "NETWORK POST PHOTO PICK ERROR:",
        error
      );

      setSaveError(
        error?.message ||
          "Triunely could not open that photo."
      );
    }
  }

  async function pickVideo() {
    if (isSaving) {
      return;
    }

    try {
      setSaveError("");

      const allowed =
        await ensureMediaPermission();

      if (!allowed) {
        return;
      }

      const result =
        await ImagePicker
          .launchImageLibraryAsync({
            mediaTypes:
              ImagePicker
                .MediaTypeOptions
                .Videos,
            allowsEditing: false,
            quality: 0.7,
            selectionLimit: 1,
          });

      if (result.canceled) {
        return;
      }

      const asset =
        result.assets?.[0];

      if (!asset?.uri) {
        throw new Error(
          "Triunely could not read the selected video."
        );
      }

      const kind =
        getAssetMediaKind(
          asset,
          "video"
        );

      if (kind !== "video") {
        throw new Error(
          "Please select a video from your library."
        );
      }

      setSelectedMedia({
        ...asset,
        width:
          Number(asset.width) > 0
            ? Number(asset.width)
            : 16,
        height:
          Number(asset.height) > 0
            ? Number(asset.height)
            : 9,
        kind: "video",
        assetType: "video",
        mediaType: "video",
      });
    } catch (error) {
      console.log(
        "NETWORK POST VIDEO PICK ERROR:",
        error
      );

      setSaveError(
        error?.message ||
          "Triunely could not open that video."
      );
    }
  }

  function removeMedia() {
    if (isSaving) {
      return;
    }

    setSelectedMedia(null);
    setSaveError("");
  }

  async function handleSubmit(
    publicationStatus
  ) {
    if (!canSubmit) {
      return;
    }

    try {
      setSavingMode(
        publicationStatus
      );

      setSaveError("");

      let uploadedMediaUrl =
        null;

      let uploadedMediaType =
        null;

      if (selectedMedia?.uri) {
        const {
          data:
            sessionData,
          error:
            sessionError,
        } =
          await supabase.auth
            .getSession();

        if (sessionError) {
          throw sessionError;
        }

        const userId =
          sessionData
            ?.session
            ?.user
            ?.id;

        if (!userId) {
          throw new Error(
            "Please sign in again before uploading media."
          );
        }

        const uploaded =
          await uploadFeedMedia({
            media:
              selectedMedia,
            scope:
              "network-posts",
            ownerId:
              userId,
            folderId:
              networkUuid,
          });

        uploadedMediaUrl =
          uploaded?.mediaUrl ||
          null;

        if (
          !uploadedMediaUrl
        ) {
          throw new Error(
            "Triunely could not upload the selected media."
          );
        }

        uploadedMediaType =
          isFeedVideoMedia(
            selectedMedia
          )
            ? "video"
            : "image";
      }

      const {
        data,
        error,
      } =
        await supabase.rpc(
          "create_network_post_rpc",
          {
            target_network_uuid:
              networkUuid,

            requested_post_type:
              postType,

            requested_title:
              cleanTitle ||
              null,

            requested_body:
              cleanBody,

            requested_publication_status:
              publicationStatus,

            requested_visibility:
              visibility,

            requested_comments_enabled:
              commentsEnabled,

            requested_media_url:
              uploadedMediaUrl,

            requested_media_type:
              uploadedMediaType,

            requested_media_thumbnail_url:
              null,

            requested_linked_entity_type:
              null,

            requested_linked_entity_id:
              null,
          }
        );

      if (error) {
        throw error;
      }

      console.log(
        publicationStatus ===
          "published"
          ? "NETWORK POST PUBLISH SUCCESS:"
          : "NETWORK POST DRAFT SUCCESS:",
        data
      );

      navigation.goBack();
    } catch (error) {
      console.log(
        "NETWORK POST CREATE ERROR:",
        error
      );

      setSaveError(
        error?.message ||
          "Triunely could not create this Network content."
      );
    } finally {
      setSavingMode(null);
    }
  }

  if (!networkUuid) {
    return (
      <Screen
        backgroundColor={
          PREMIUM_CREAM
        }
        padded={false}
        style={{
          flex: 1,
        }}
      >
        {() => (
          <View
            style={{
              flex: 1,
              alignItems:
                "center",
              justifyContent:
                "center",
              paddingHorizontal:
                24,
            }}
          >
            <Ionicons
              name="warning-outline"
              size={36}
              color={DANGER}
            />

            <Text
              style={{
                fontFamily:
                  displayFont,
                color: TEXT,
                fontSize: 22,
                fontWeight:
                  "900",
                textAlign:
                  "center",
                marginTop: 12,
              }}
            >
              Network unavailable
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 13,
                fontWeight:
                  "700",
                lineHeight: 19,
                textAlign:
                  "center",
                marginTop: 7,
              }}
            >
              Triunely could not
              identify the Network
              for this content.
            </Text>

            <Pressable
              onPress={() =>
                navigation.goBack()
              }
              style={({
                pressed,
              }) => ({
                minHeight: 47,
                borderRadius:
                  999,
                backgroundColor:
                  pressed
                    ? "#92400E"
                    : HEAVENLY_GOLD,
                paddingHorizontal:
                  22,
                alignItems:
                  "center",
                justifyContent:
                  "center",
                marginTop: 18,
              })}
            >
              <Text
                style={{
                  color:
                    SURFACE,
                  fontSize: 13,
                  fontWeight:
                    "900",
                }}
              >
                Go Back
              </Text>
            </Pressable>
          </View>
        )}
      </Screen>
    );
  }

  return (
    <Screen
      backgroundColor={
        PREMIUM_CREAM
      }
      padded={false}
      style={{
        flex: 1,
      }}
    >
      {({ bottomPad }) => (
        <KeyboardAwareScrollView
          style={{
            flex: 1,
          }}
          bottomOffset={24}
          extraKeyboardSpace={0}
          disableScrollOnKeyboardHide={
            false
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal:
              16,
            paddingTop: 14,
            paddingBottom:
              Math.max(
                bottomPad,
                20
              ) + 48,
          }}
        >
          <View
            style={{
              flexDirection:
                "row",
              alignItems:
                "center",
              marginBottom:
                18,
            }}
          >
            <Pressable
              disabled={isSaving}
              onPress={() =>
                navigation.goBack()
              }
              hitSlop={10}
              style={({
                pressed,
              }) => ({
                width: 42,
                height: 42,
                borderRadius:
                  21,
                alignItems:
                  "center",
                justifyContent:
                  "center",
                backgroundColor:
                  pressed
                    ? SOFT_OLIVE_BG
                    : SURFACE,
                borderWidth: 1,
                borderColor:
                  OLIVE_BORDER,
                marginRight: 12,
                opacity:
                  isSaving
                    ? 0.5
                    : 1,
              })}
            >
              <Ionicons
                name="chevron-back"
                size={23}
                color={
                  DEEP_OLIVE
                }
              />
            </Pressable>

            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={{
                  fontFamily:
                    displayFont,
                  color: TEXT,
                  fontSize: 25,
                  lineHeight: 30,
                  fontWeight:
                    "900",
                  letterSpacing:
                    -0.4,
                }}
              >
                Create Network Content
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 12,
                  fontWeight:
                    "800",
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {networkName}
              </Text>
            </View>
          </View>

          <View
            style={{
              ...premiumCardStyle,
              padding: 16,
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                fontFamily:
                  displayFont,
                color: TEXT,
                fontSize: 18,
                fontWeight: "900",
                marginBottom: 5,
              }}
            >
              Content type
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 11.5,
                fontWeight: "700",
                lineHeight: 17,
                marginBottom: 13,
              }}
            >
              Choose whether this is a
              normal Network post or an
              official announcement.
            </Text>

            <ChoiceCard
              value="post"
              selectedValue={
                postType
              }
              icon="chatbubble-ellipses-outline"
              title="Network post"
              description="A normal update or discussion for the Network."
              disabled={isSaving}
              onPress={
                handlePostTypeChange
              }
            />

            <ChoiceCard
              value="announcement"
              selectedValue={
                postType
              }
              icon="megaphone-outline"
              title="Official announcement"
              description="Leadership communication that requires a title."
              tone="gold"
              disabled={isSaving}
              onPress={
                handlePostTypeChange
              }
            />
          </View>

          <View
            style={{
              ...premiumCardStyle,
              padding: 16,
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                color: TEXT,
                fontSize: 13,
                fontWeight: "900",
                marginBottom: 7,
              }}
            >
              Title
              {isAnnouncement
                ? " *"
                : ""}
            </Text>

            <TextInput
              value={title}
              onChangeText={
                setTitle
              }
              editable={!isSaving}
              placeholder={
                isAnnouncement
                  ? "Announcement title"
                  : "Optional post title"
              }
              placeholderTextColor="rgba(107, 114, 128, 0.72)"
              maxLength={180}
              returnKeyType="next"
              style={{
                minHeight: 50,
                borderRadius: 16,
                borderWidth: 1,
                borderColor:
                  isAnnouncement &&
                  !cleanTitle
                    ? DANGER_BORDER
                    : OLIVE_BORDER,
                backgroundColor:
                  SURFACE,
                paddingHorizontal:
                  14,
                color: TEXT,
                fontSize: 14,
                fontWeight: "700",
              }}
            />

            <Text
              style={{
                color: MUTED,
                fontSize: 10.5,
                fontWeight: "800",
                textAlign: "right",
                marginTop: 5,
              }}
            >
              {title.length}/180
            </Text>

            <Text
              style={{
                color: TEXT,
                fontSize: 13,
                fontWeight: "900",
                marginTop: 12,
                marginBottom: 7,
              }}
            >
              Content *
            </Text>

            <TextInput
              value={body}
              onChangeText={
                setBody
              }
              editable={!isSaving}
              placeholder={
                isAnnouncement
                  ? "Write the announcement"
                  : "Share an update with the Network"
              }
              placeholderTextColor="rgba(107, 114, 128, 0.72)"
              multiline
              textAlignVertical="top"
              maxLength={10000}
              scrollEnabled
              style={{
                minHeight: 190,
                borderRadius: 16,
                borderWidth: 1,
                borderColor:
                  !cleanBody
                    ? DANGER_BORDER
                    : OLIVE_BORDER,
                backgroundColor:
                  SURFACE,
                paddingHorizontal:
                  14,
                paddingVertical:
                  13,
                color: TEXT,
                fontSize: 14,
                lineHeight: 21,
                fontWeight: "600",
              }}
            />

            <Text
              style={{
                color: MUTED,
                fontSize: 10.5,
                fontWeight: "800",
                textAlign: "right",
                marginTop: 5,
              }}
            >
              {body.length}/10,000
            </Text>
          </View>

          <View
            style={{
              ...premiumCardStyle,
              padding: 16,
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                fontFamily:
                  displayFont,
                color: TEXT,
                fontSize: 18,
                fontWeight: "900",
                marginBottom: 5,
              }}
            >
              Photo or video
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 11.5,
                fontWeight: "700",
                lineHeight: 17,
                marginBottom: 13,
              }}
            >
              Media keeps its original
              shape. Nothing is cropped.
            </Text>

            {selectedMedia?.uri ? (
              <View
                style={{
                  borderRadius: 18,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor:
                    CARD_BORDER,
                  backgroundColor:
                    "#11150F",
                }}
              >
                <NaturalMediaPreview
                  media={
                    selectedMedia
                  }
                />

                <View
                  style={{
                    backgroundColor:
                      SURFACE,
                    padding: 12,
                    flexDirection:
                      "row",
                    gap: 10,
                  }}
                >
                  <Pressable
                    disabled={
                      isSaving
                    }
                    onPress={
                      selectedMediaIsVideo
                        ? pickVideo
                        : pickPhoto
                    }
                    style={({
                      pressed,
                    }) => ({
                      flex: 1,
                      minHeight: 43,
                      borderRadius:
                        999,
                      borderWidth: 1,
                      borderColor:
                        OLIVE_BORDER,
                      backgroundColor:
                        pressed
                          ? SOFT_OLIVE_BG
                          : SURFACE,
                      flexDirection:
                        "row",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      opacity:
                        isSaving
                          ? 0.5
                          : 1,
                    })}
                  >
                    <Ionicons
                      name="swap-horizontal-outline"
                      size={17}
                      color={
                        DEEP_OLIVE
                      }
                    />

                    <Text
                      style={{
                        color:
                          DEEP_OLIVE,
                        fontSize: 12,
                        fontWeight:
                          "900",
                        marginLeft: 6,
                      }}
                    >
                      Change
                    </Text>
                  </Pressable>

                  <Pressable
                    disabled={
                      isSaving
                    }
                    onPress={
                      removeMedia
                    }
                    style={({
                      pressed,
                    }) => ({
                      flex: 1,
                      minHeight: 43,
                      borderRadius:
                        999,
                      borderWidth: 1,
                      borderColor:
                        DANGER_BORDER,
                      backgroundColor:
                        pressed
                          ? SOFT_DANGER_BG
                          : SURFACE,
                      flexDirection:
                        "row",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      opacity:
                        isSaving
                          ? 0.5
                          : 1,
                    })}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={17}
                      color={DANGER}
                    />

                    <Text
                      style={{
                        color: DANGER,
                        fontSize: 12,
                        fontWeight:
                          "900",
                        marginLeft: 6,
                      }}
                    >
                      Remove
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View
                style={{
                  flexDirection:
                    "row",
                  gap: 10,
                }}
              >
                <MediaActionButton
                  icon="image-outline"
                  label="Add Photo"
                  disabled={
                    isSaving
                  }
                  onPress={
                    pickPhoto
                  }
                />

                <MediaActionButton
                  icon="videocam-outline"
                  label="Add Video"
                  tone="gold"
                  disabled={
                    isSaving
                  }
                  onPress={
                    pickVideo
                  }
                />
              </View>
            )}
          </View>

          <View
            style={{
              ...premiumCardStyle,
              padding: 16,
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                fontFamily:
                  displayFont,
                color: TEXT,
                fontSize: 18,
                fontWeight: "900",
                marginBottom: 5,
              }}
            >
              Visibility
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 11.5,
                fontWeight: "700",
                lineHeight: 17,
                marginBottom: 13,
              }}
            >
              Decide who can see this
              content.
            </Text>

            <ChoiceCard
              value="members"
              selectedValue={
                visibility
              }
              icon="people-outline"
              title="All Network members"
              description="Visible in the normal Network feed."
              disabled={isSaving}
              onPress={
                setVisibility
              }
            />

            <ChoiceCard
              value="leadership"
              selectedValue={
                visibility
              }
              icon="shield-checkmark-outline"
              title="Leadership only"
              description="Visible only through authorised leadership access."
              tone="gold"
              disabled={isSaving}
              onPress={
                setVisibility
              }
            />
          </View>

          <View
            style={{
              ...premiumCardStyle,
              padding: 16,
              marginBottom: 14,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor:
                  SOFT_OLIVE_BG,
                borderWidth: 1,
                borderColor:
                  OLIVE_BORDER,
                alignItems:
                  "center",
                justifyContent:
                  "center",
                marginRight: 11,
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
                marginRight: 10,
              }}
            >
              <Text
                style={{
                  color: TEXT,
                  fontSize: 13.5,
                  fontWeight: "900",
                }}
              >
                Allow comments
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 11.5,
                  fontWeight: "700",
                  lineHeight: 16,
                  marginTop: 3,
                }}
              >
                Members can discuss and
                respond beneath this
                content.
              </Text>
            </View>

            <Switch
              value={
                commentsEnabled
              }
              onValueChange={
                setCommentsEnabled
              }
              disabled={isSaving}
              trackColor={{
                false:
                  "rgba(107, 114, 128, 0.26)",
                true:
                  "rgba(180, 83, 9, 0.34)",
              }}
              thumbColor={
                commentsEnabled
                  ? HEAVENLY_GOLD
                  : "#F3F4F6"
              }
            />
          </View>

          {saveError ? (
            <View
              style={{
                borderRadius: 18,
                backgroundColor:
                  SOFT_DANGER_BG,
                borderWidth: 1,
                borderColor:
                  DANGER_BORDER,
                padding: 13,
                marginBottom: 14,
                flexDirection: "row",
                alignItems:
                  "flex-start",
              }}
            >
              <Ionicons
                name="warning-outline"
                size={20}
                color={DANGER}
              />

              <Text
                style={{
                  flex: 1,
                  color: DANGER,
                  fontSize: 11.5,
                  fontWeight: "800",
                  lineHeight: 17,
                  marginLeft: 8,
                }}
              >
                {saveError}
              </Text>
            </View>
          ) : null}

          <View
            style={{
              flexDirection: "row",
              gap: 10,
            }}
          >
            <Pressable
              disabled={!canSubmit}
              onPress={() =>
                handleSubmit("draft")
              }
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 52,
                borderRadius: 999,
                borderWidth: 1,
                borderColor:
                  canSubmit
                    ? OLIVE_BORDER
                    : CARD_BORDER,
                backgroundColor:
                  canSubmit
                    ? pressed
                      ? SOFT_OLIVE_BG
                      : SURFACE
                    : "rgba(107, 114, 128, 0.08)",
                alignItems: "center",
                justifyContent:
                  "center",
                flexDirection: "row",
                opacity:
                  isSaving
                    ? 0.7
                    : 1,
              })}
            >
              {savingMode ===
              "draft" ? (
                <ActivityIndicator
                  size="small"
                  color={DEEP_OLIVE}
                />
              ) : (
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={
                    canSubmit
                      ? DEEP_OLIVE
                      : MUTED
                  }
                />
              )}

              <Text
                style={{
                  color:
                    canSubmit
                      ? DEEP_OLIVE
                      : MUTED,
                  fontSize: 12.5,
                  fontWeight: "900",
                  marginLeft: 7,
                }}
              >
                {savingMode ===
                "draft"
                  ? selectedMedia
                    ? "Uploading…"
                    : "Saving…"
                  : "Save Draft"}
              </Text>
            </Pressable>

            <Pressable
              disabled={!canSubmit}
              onPress={() =>
                handleSubmit(
                  "published"
                )
              }
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 52,
                borderRadius: 999,
                backgroundColor:
                  canSubmit
                    ? pressed
                      ? "#92400E"
                      : HEAVENLY_GOLD
                    : "rgba(107, 114, 128, 0.24)",
                alignItems: "center",
                justifyContent:
                  "center",
                flexDirection: "row",
                opacity:
                  isSaving
                    ? 0.7
                    : 1,
              })}
            >
              {savingMode ===
              "published" ? (
                <ActivityIndicator
                  size="small"
                  color={SURFACE}
                />
              ) : (
                <Ionicons
                  name="paper-plane-outline"
                  size={18}
                  color={
                    canSubmit
                      ? SURFACE
                      : MUTED
                  }
                />
              )}

              <Text
                style={{
                  color:
                    canSubmit
                      ? SURFACE
                      : MUTED,
                  fontSize: 12.5,
                  fontWeight: "900",
                  marginLeft: 7,
                }}
              >
                {savingMode ===
                "published"
                  ? selectedMedia
                    ? "Uploading…"
                    : "Publishing…"
                  : "Publish"}
              </Text>
            </Pressable>
          </View>
        </KeyboardAwareScrollView>
      )}
    </Screen>
  );
}