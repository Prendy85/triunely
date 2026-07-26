// src/components/NewPostModal.js
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import {
  KeyboardAwareScrollView,
} from "react-native-keyboard-controller";

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

const OVERLAY =
  "rgba(25, 20, 13, 0.68)";

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

function isVideoMedia(media) {
  const rawType =
    String(
      media?.type ||
      media?.mimeType ||
      media?.assetType ||
      media?.kind ||
      ""
    ).toLowerCase();

  return (
    rawType === "video" ||
    rawType.startsWith("video/")
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
          "COMMUNITY VIDEO THUMBNAIL ERROR:",
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
        backgroundColor: "#11150F",
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
    isVideoMedia(media);

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
      window.width - 72,
      240
    );

  const availableHeight =
    Math.min(
      Math.max(
        window.height * 0.50,
        280
      ),
      560
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

function LinkedContentCard({
  linkedContent,
}) {
  if (!linkedContent?.link_type) {
    return null;
  }

  const linkedIcon =
    linkedContent.link_type === "event"
      ? "calendar-outline"
      : linkedContent.link_type === "group"
        ? "people-outline"
        : linkedContent.link_type === "course"
          ? "school-outline"
          : linkedContent.link_type === "church"
            ? "business-outline"
            : "link-outline";

  const linkedLabel =
    linkedContent.link_type === "event"
      ? "Linked Event"
      : linkedContent.link_type === "group"
        ? "Linked Group"
        : linkedContent.link_type === "course"
          ? "Linked Course"
          : linkedContent.link_type === "church"
            ? "Linked Church"
            : "Linked Content";

  return (
    <View
      style={{
        ...premiumCardStyle,
        backgroundColor: "#FFF7ED",
        borderColor:
          "rgba(180, 83, 9, 0.22)",
        padding: 14,
        marginBottom: 14,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          position: "absolute",
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor:
            "rgba(180, 83, 9, 0.08)",
          right: -36,
          top: -42,
        }}
      />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor:
              "rgba(180, 83, 9, 0.20)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Ionicons
            name={linkedIcon}
            size={20}
            color={HEAVENLY_GOLD}
          />
        </View>

        <View
          style={{
            flex: 1,
          }}
        >
          <Text
            style={{
              color: "#92400E",
              fontSize: 11.5,
              fontWeight: "900",
              textTransform: "uppercase",
              letterSpacing: 0.45,
            }}
          >
            {linkedLabel}
          </Text>

          <Text
            numberOfLines={2}
            style={{
              color: TEXT,
              fontSize: 15.5,
              fontWeight: "900",
              marginTop: 2,
            }}
          >
            {linkedContent
              ?.linked_title ||
              "Shared church item"}
          </Text>
        </View>
      </View>

      {linkedContent
        ?.linked_image_url ? (
        <Image
          source={{
            uri:
              linkedContent
                .linked_image_url,
          }}
          resizeMode="cover"
          style={{
            width: "100%",
            height: 148,
            borderRadius: 18,
            backgroundColor:
              PREMIUM_CREAM,
            marginBottom: 12,
          }}
        />
      ) : null}

      {linkedContent
        ?.linked_subtitle ? (
        <Text
          style={{
            color: TEXT,
            fontSize: 13.5,
            fontWeight: "900",
            lineHeight: 19,
          }}
        >
          {
            linkedContent
              .linked_subtitle
          }
        </Text>
      ) : null}

      {linkedContent
        ?.linked_description ? (
        <Text
          numberOfLines={3}
          style={{
            color: MUTED,
            fontSize: 12.5,
            fontWeight: "700",
            lineHeight: 18,
            marginTop: 5,
          }}
        >
          {
            linkedContent
              .linked_description
          }
        </Text>
      ) : null}
    </View>
  );
}

export default function NewPostModal({
  visible,
  onClose,
  onSubmit,
  loading = false,
  linkedContent = null,
}) {
  const [
    content,
    setContent,
  ] = useState("");

  const [
    url,
    setUrl,
  ] = useState("");

  const [
    isAnonymous,
    setIsAnonymous,
  ] = useState(false);

  const [
    selectedMedia,
    setSelectedMedia,
  ] = useState(null);

  const [
    saveError,
    setSaveError,
  ] = useState("");

  const submittingRef =
    useRef(false);

  const hasLinkedContent =
    Boolean(
      linkedContent?.link_type
    );

  const selectedMediaIsVideo =
    isVideoMedia(
      selectedMedia
    );

  const cleanContent =
    content.trim();

  const cleanUrl =
    url.trim();

  const canSubmit =
    useMemo(
      () =>
        Boolean(
          cleanContent ||
          selectedMedia ||
          hasLinkedContent
        ) &&
        !loading,
      [
        cleanContent,
        hasLinkedContent,
        loading,
        selectedMedia,
      ]
    );

  useEffect(() => {
    if (!visible) {
      setContent("");
      setUrl("");
      setIsAnonymous(false);
      setSelectedMedia(null);
      setSaveError("");
      submittingRef.current = false;
    }
  }, [visible]);

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
    if (loading) {
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
        type:
          asset.mimeType ||
          "image/jpeg",
        mimeType:
          asset.mimeType ||
          "image/jpeg",
        fileName:
          asset.fileName ||
          `image-${Date.now()}.jpg`,
      });
    } catch (error) {
      console.log(
        "COMMUNITY POST PHOTO PICK ERROR:",
        error
      );

      setSaveError(
        error?.message ||
          "Triunely could not open that photo."
      );
    }
  }

  async function pickVideo() {
    if (loading) {
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
        type:
          asset.mimeType ||
          "video/mp4",
        mimeType:
          asset.mimeType ||
          "video/mp4",
        fileName:
          asset.fileName ||
          `video-${Date.now()}.mp4`,
      });
    } catch (error) {
      console.log(
        "COMMUNITY POST VIDEO PICK ERROR:",
        error
      );

      setSaveError(
        error?.message ||
          "Triunely could not open that video."
      );
    }
  }

  function removeMedia() {
    if (loading) {
      return;
    }

    setSelectedMedia(null);
    setSaveError("");
  }

  function handleSubmit() {
    if (
      !canSubmit ||
      submittingRef.current
    ) {
      return;
    }

    submittingRef.current = true;

    const submission = {
      content,
      url,
      isAnonymous:
        hasLinkedContent
          ? false
          : isAnonymous,
      media:
        selectedMedia
          ? {
              ...selectedMedia,
            }
          : null,
    };

    /*
     * Close immediately. Community.js continues
     * the upload and insert promise while the user
     * remains free to use the rest of Triunely.
     */
    onClose?.();

    Promise.resolve(
      onSubmit?.(
        submission.content,
        submission.url,
        submission.isAnonymous,
        submission.media
      )
    ).catch((error) => {
      console.log(
        "COMMUNITY BACKGROUND POST ERROR:",
        error
      );
    });
  }

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (!loading) {
          onClose?.();
        }
      }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: OVERLAY,
          paddingHorizontal: 12,
          paddingTop:
            Platform.OS === "android"
              ? 24
              : 42,
          paddingBottom: 14,
        }}
      >
        <View
          style={{
            flex: 1,
            width: "100%",
            maxWidth: 720,
            alignSelf: "center",
            borderRadius: 28,
            overflow: "hidden",
            backgroundColor:
              PREMIUM_CREAM,
            borderWidth: 1,
            borderColor:
              GOLD_BORDER,
            shadowColor: "#000000",
            shadowOpacity: 0.22,
            shadowRadius: 20,
            shadowOffset: {
              width: 0,
              height: 10,
            },
            elevation: 10,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 14,
              backgroundColor:
                PREMIUM_CREAM,
              borderBottomWidth: 1,
              borderBottomColor:
                CARD_BORDER,
            }}
          >
            <Pressable
              disabled={loading}
              onPress={onClose}
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
                borderColor:
                  OLIVE_BORDER,
                marginRight: 12,
                opacity:
                  loading
                    ? 0.5
                    : 1,
              })}
            >
              <Ionicons
                name="close"
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
                  fontFamily:
                    displayFont,
                  color: TEXT,
                  fontSize: 23,
                  lineHeight: 28,
                  fontWeight: "900",
                  letterSpacing: -0.3,
                }}
              >
                {hasLinkedContent
                  ? "Share to Community"
                  : "Create Community Post"}
              </Text>

              <Text
                numberOfLines={1}
                style={{
                  color: MUTED,
                  fontSize: 11.5,
                  fontWeight: "800",
                  marginTop: 2,
                }}
              >
                Encourage, update and connect with the Triunely community
              </Text>
            </View>
          </View>
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
              padding: 16,
              paddingBottom: 36,
            }}
          >
            <LinkedContentCard
              linkedContent={
                linkedContent
              }
            />

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
                Message
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 11.5,
                  fontWeight: "700",
                  lineHeight: 17,
                  marginBottom: 12,
                }}
              >
                {hasLinkedContent
                  ? "Add your own words above the shared item."
                  : "Share an update, testimony, prayer need or encouragement."}
              </Text>

              <TextInput
                value={content}
                onChangeText={
                  setContent
                }
                editable={!loading}
                placeholder={
                  hasLinkedContent
                    ? "Say something about this..."
                    : "What would you like to share?"
                }
                placeholderTextColor="rgba(107, 114, 128, 0.72)"
                multiline
                textAlignVertical="top"
                maxLength={10000}
                scrollEnabled
                style={{
                  minHeight: 180,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor:
                    cleanContent ||
                    selectedMedia ||
                    hasLinkedContent
                      ? OLIVE_BORDER
                      : DANGER_BORDER,
                  backgroundColor:
                    SURFACE,
                  paddingHorizontal: 14,
                  paddingVertical: 13,
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
                {content.length}/10,000
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
                Media keeps its original shape. Nothing is cropped.
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
                      disabled={loading}
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
                          loading
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
                      disabled={loading}
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
                          loading
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
                    disabled={loading}
                    onPress={
                      pickPhoto
                    }
                  />

                  <MediaActionButton
                    icon="videocam-outline"
                    label="Add Video"
                    tone="gold"
                    disabled={loading}
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
                Optional link
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 11.5,
                  fontWeight: "700",
                  lineHeight: 17,
                  marginBottom: 12,
                }}
              >
                Add a YouTube video, article or website.
              </Text>

              <View
                style={{
                  minHeight: 50,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor:
                    OLIVE_BORDER,
                  backgroundColor:
                    SURFACE,
                  flexDirection:
                    "row",
                  alignItems:
                    "center",
                  paddingHorizontal: 13,
                }}
              >
                <Ionicons
                  name="link-outline"
                  size={19}
                  color={DEEP_OLIVE}
                />

                <TextInput
                  value={url}
                  onChangeText={setUrl}
                  editable={!loading}
                  placeholder="YouTube, article or website..."
                  placeholderTextColor="rgba(107, 114, 128, 0.72)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={{
                    flex: 1,
                    minHeight: 48,
                    color: TEXT,
                    fontSize: 13.5,
                    fontWeight: "700",
                    paddingHorizontal: 10,
                    paddingVertical: 0,
                  }}
                />

                {cleanUrl ? (
                  <Pressable
                    disabled={loading}
                    onPress={() =>
                      setUrl("")
                    }
                    hitSlop={8}
                    style={({
                      pressed,
                    }) => ({
                      width: 32,
                      height: 32,
                      borderRadius:
                        16,
                      backgroundColor:
                        pressed
                          ? SOFT_OLIVE_BG
                          : "transparent",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
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
            </View>

            {!hasLinkedContent ? (
              <Pressable
                disabled={loading}
                onPress={() =>
                  setIsAnonymous(
                    (previous) =>
                      !previous
                  )
                }
                style={({
                  pressed,
                }) => ({
                  ...premiumCardStyle,
                  minHeight: 82,
                  padding: 14,
                  marginBottom: 14,
                  flexDirection:
                    "row",
                  alignItems:
                    "center",
                  backgroundColor:
                    isAnonymous
                      ? SOFT_GOLD_BG
                      : pressed
                        ? SOFT_OLIVE_BG
                        : SURFACE,
                  borderColor:
                    isAnonymous
                      ? GOLD_BORDER
                      : CARD_BORDER,
                  opacity:
                    loading
                      ? 0.6
                      : 1,
                })}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor:
                      isAnonymous
                        ? SOFT_GOLD_BG
                        : SOFT_OLIVE_BG,
                    borderWidth: 1,
                    borderColor:
                      isAnonymous
                        ? GOLD_BORDER
                        : OLIVE_BORDER,
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    marginRight: 11,
                  }}
                >
                  <Ionicons
                    name={
                      isAnonymous
                        ? "eye-off-outline"
                        : "person-outline"
                    }
                    size={21}
                    color={
                      isAnonymous
                        ? HEAVENLY_GOLD
                        : DEEP_OLIVE
                    }
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
                      color:
                        isAnonymous
                          ? EVENT_BROWN
                          : TEXT,
                      fontSize: 13.5,
                      fontWeight: "900",
                    }}
                  >
                    Post anonymously
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
                    Your name and profile image will not appear on this post.
                  </Text>
                </View>

                <Ionicons
                  name={
                    isAnonymous
                      ? "checkmark-circle"
                      : "ellipse-outline"
                  }
                  size={22}
                  color={
                    isAnonymous
                      ? HEAVENLY_GOLD
                      : MUTED
                  }
                />
              </Pressable>
            ) : null}

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

            <Pressable
              disabled={!canSubmit}
              onPress={
                handleSubmit
              }
              style={({ pressed }) => ({
                minHeight: 54,
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
                  loading
                    ? 0.7
                    : 1,
              })}
            >
              <Ionicons
                name="paper-plane-outline"
                size={19}
                color={
                  canSubmit
                    ? SURFACE
                    : MUTED
                }
              />

              <Text
                style={{
                  color:
                    canSubmit
                      ? SURFACE
                      : MUTED,
                  fontSize: 13.5,
                  fontWeight: "900",
                  marginLeft: 8,
                }}
              >
                {hasLinkedContent
                  ? "Share to Community"
                  : "Post to Community"}
              </Text>
            </Pressable>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent:
                  "center",
                marginTop: 11,
                paddingHorizontal: 12,
              }}
            >
              <Ionicons
                name="cloud-upload-outline"
                size={15}
                color={MUTED}
              />

              <Text
                style={{
                  color: MUTED,
                  fontSize: 10.5,
                  fontWeight: "800",
                  lineHeight: 15,
                  marginLeft: 6,
                  textAlign: "center",
                }}
              >
                The composer closes immediately while your post continues uploading inside Triunely.
              </Text>
            </View>
          </KeyboardAwareScrollView>
        </View>
      </View>
    </Modal>
  );
}