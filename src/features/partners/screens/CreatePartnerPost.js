// src/features/partners/screens/CreatePartnerPost.js
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
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

import Screen from "../../../components/Screen";
import useCommercial from "../../../hooks/useCommercial";
import useCommercialAccountScope from "../../../hooks/useCommercialAccountScope";
import { supabase } from "../../../lib/supabase";
import {
    isFeedVideoMedia,
    uploadFeedMedia,
} from "../../../lib/uploadFeedMedia";

import {
    createPartnerPost,
    createPartnerPostMediaWithGallery,
    fetchPartnerPostById,
    fetchPartnerPostMedia,
    fetchPartnerProfileById,
    PARTNER_POST_TYPES,
    updatePartnerPost,
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
  "rgba(15, 23, 42, 0.10)";

const displayFont =
  Platform.OS === "ios"
    ? "Georgia"
    : "serif";

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
    <View
      style={{
        marginBottom: 13,
      }}
    >
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
          minHeight:
            multiline ? 120 : 48,
          textAlignVertical:
            multiline
              ? "top"
              : "center",
          borderRadius: 18,
          backgroundColor:
            PREMIUM_CREAM,
          borderWidth: 1,
          borderColor:
            CARD_BORDER,
          paddingHorizontal: 13,
          paddingVertical:
            multiline ? 12 : 0,
          color: TEXT,
          fontSize: 14,
          fontWeight: "800",
          lineHeight:
            multiline
              ? 20
              : undefined,
        }}
      />
    </View>
  );
}

function PostTypeOption({
  item,
  active,
  onPress,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity:
          pressed ? 0.84 : 1,
        width: "48%",
        borderRadius: 18,
        padding: 12,
        marginBottom: 10,
        backgroundColor:
          active
            ? AMBER_SOFT
            : PREMIUM_CREAM,
        borderWidth: 1,
        borderColor:
          active
            ? AMBER_BORDER
            : CARD_BORDER,
      })}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor:
            active
              ? EVENT_AMBER
              : OLIVE_SOFT,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        <Ionicons
          name={item.icon}
          size={17}
          color={
            active
              ? SURFACE
              : OLIVE
          }
        />
      </View>

      <Text
        style={{
          color:
            active
              ? EVENT_BROWN
              : TEXT,
          fontSize: 12.5,
          fontWeight: "900",
          lineHeight: 17,
        }}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

function MediaPreview({
  item,
  index,
  onRemove,
  disabled = false,
}) {
  const previewUri =
    item?.uri ||
    item?.media_url ||
    "";

  return (
    <View
      style={{
        width: 118,
        marginRight: 10,
      }}
    >
      <View
        style={{
          width: 118,
          height: 118,
          borderRadius: 18,
          overflow: "hidden",
          backgroundColor:
            OLIVE_SOFT,
          borderWidth: 1,
          borderColor:
            OLIVE_BORDER,
        }}
      >
        {previewUri ? (
          <Image
            source={{
              uri: previewUri,
            }}
            resizeMode="cover"
            style={{
              width: "100%",
              height: "100%",
            }}
          />
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent:
                "center",
            }}
          >
            <Ionicons
              name="image-outline"
              size={30}
              color={OLIVE}
            />
          </View>
        )}

        <View
          style={{
            position: "absolute",
            left: 7,
            bottom: 7,
            minWidth: 27,
            height: 27,
            paddingHorizontal: 7,
            borderRadius: 14,
            backgroundColor:
              "rgba(0,0,0,0.66)",
            alignItems: "center",
            justifyContent:
              "center",
          }}
        >
          <Text
            style={{
              color: SURFACE,
              fontSize: 11,
              fontWeight: "900",
            }}
          >
            {index + 1}
          </Text>
        </View>

        {onRemove ? (
          <Pressable
            onPress={onRemove}
            disabled={disabled}
            hitSlop={6}
            style={({ pressed }) => ({
              position: "absolute",
              top: 7,
              right: 7,
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor:
                "rgba(0,0,0,0.72)",
              borderWidth: 1,
              borderColor:
                "rgba(255,255,255,0.46)",
              alignItems: "center",
              justifyContent:
                "center",
              opacity:
                disabled
                  ? 0.4
                  : pressed
                    ? 0.72
                    : 1,
            })}
          >
            <Ionicons
              name="close"
              size={18}
              color={SURFACE}
            />
          </Pressable>
        ) : null}
      </View>

      <Text
        numberOfLines={1}
        style={{
          color: MUTED,
          fontSize: 10.5,
          fontWeight: "800",
          marginTop: 6,
          textAlign: "center",
        }}
      >
        {index === 0
          ? "Gallery caption"
          : `Image ${index + 1}`}
      </Text>
    </View>
  );
}

export default function CreatePartnerPost({
  route,
  navigation,
}) {
  const partnerProfileId =
    route?.params
      ?.partnerProfileId || null;

  useCommercialAccountScope(
    "partner",
    partnerProfileId
  );

  const {
    loading: commercialLoading,
    canPostNativeVideo,
    canUploadPermanentVideo,
  } = useCommercial();

  const canAddPartnerVideo =
    canPostNativeVideo === true &&
    canUploadPermanentVideo === true;

  const partnerPostId =
    route?.params
      ?.partnerPostId || null;

  const mode =
    route?.params?.mode ||
    (partnerPostId
      ? "edit"
      : "create");

  const isEdit =
    mode === "edit" &&
    Boolean(partnerPostId);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    uploadProgress,
    setUploadProgress,
  ] = useState("");

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState(null);

  const [
    partner,
    setPartner,
  ] = useState(null);

  const [
    postType,
    setPostType,
  ] = useState("update");

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    content,
    setContent,
  ] = useState("");

  const [
    selectedMedia,
    setSelectedMedia,
  ] = useState([]);

  const [
    selectedVideo,
    setSelectedVideo,
  ] = useState(null);

  const [
    videoUpgradeModalVisible,
    setVideoUpgradeModalVisible,
  ] = useState(false);

  const [
    upgradeOptionsRequested,
    setUpgradeOptionsRequested,
  ] = useState(false);

  const [
    existingMedia,
    setExistingMedia,
  ] = useState([]);

  const [
    legacyMediaUrl,
    setLegacyMediaUrl,
  ] = useState("");

  const [
    legacyMediaType,
    setLegacyMediaType,
  ] = useState("");

  const [
    linkUrl,
    setLinkUrl,
  ] = useState("");

  const [
    linkTitle,
    setLinkTitle,
  ] = useState("");

  const [
    linkDescription,
    setLinkDescription,
  ] = useState("");

  const [
    linkImage,
    setLinkImage,
  ] = useState("");

  const selectedPostType =
    useMemo(() => {
      return (
        PARTNER_POST_TYPES.find(
          (item) =>
            item.value ===
            postType
        ) ||
        PARTNER_POST_TYPES[0]
      );
    }, [postType]);

  const load = useCallback(
    async () => {
      try {
        setLoading(true);

        const {
          data: sessionData,
          error: sessionError,
        } =
          await supabase.auth
            .getSession();

        if (sessionError) {
          throw sessionError;
        }

        const meId =
          sessionData?.session
            ?.user?.id || null;

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
          profileResult.partner
            .owner_id !== meId
        ) {
          Alert.alert(
            "Not allowed",
            "Only the owner can create posts for this Partner Profile."
          );

          navigation.goBack();
          return;
        }

        setPartner(
          profileResult.partner
        );

        if (isEdit) {
          const postResult =
            await fetchPartnerPostById(
              partnerPostId
            );

          if (
            !postResult.ok ||
            !postResult.post
          ) {
            throw (
              postResult.error ||
              new Error(
                "Partner post not found"
              )
            );
          }

          const post =
            postResult.post;

          if (
            post.partner_profile_id !==
            partnerProfileId
          ) {
            throw new Error(
              "This post does not belong to this Partner Profile."
            );
          }

          setPostType(
            post.post_type ||
              "update"
          );

          setTitle(
            post.title || ""
          );

          setContent(
            post.content || ""
          );

          setLegacyMediaUrl(
            post.media_url || ""
          );

          setLegacyMediaType(
            post.media_type || ""
          );

          setLinkUrl(
            post.link_url || ""
          );

          setLinkTitle(
            post.link_title || ""
          );

          setLinkDescription(
            post.link_description ||
              ""
          );

          setLinkImage(
            post.link_image || ""
          );

          const mediaResult =
            await fetchPartnerPostMedia({
              partnerPostId,
            });

          if (mediaResult.ok) {
            setExistingMedia(
              mediaResult.media || []
            );
          } else {
            console.log(
              "CreatePartnerPost existing media load error:",
              mediaResult.error
            );
          }
        }
      } catch (error) {
        console.log(
          "CreatePartnerPost load error:",
          error
        );

        Alert.alert(
          "Partner Post",
          "We couldn't load this Partner Profile."
        );

        navigation.goBack();
      } finally {
        setLoading(false);
      }
    },
    [
      isEdit,
      navigation,
      partnerPostId,
      partnerProfileId,
    ]
  );

  useEffect(() => {
    load();
  }, [load]);

  async function handleChooseVideo() {
    try {
      if (saving || commercialLoading) {
        return;
      }

      if (!canAddPartnerVideo) {
        setUpgradeOptionsRequested(false);
        setVideoUpgradeModalVisible(true);
        return;
      }

      const permissionResult =
        await ImagePicker
          .requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Video access required",
          "Allow Triunely to access your videos so you can add one to this Partner Post."
        );

        return;
      }

      const result =
        await ImagePicker
          .launchImageLibraryAsync({
            mediaTypes: [
              "videos",
            ],
            allowsMultipleSelection:
              false,
            quality: 1,
          });

      if (
        result.canceled ||
        !Array.isArray(result.assets) ||
        !result.assets[0]
      ) {
        return;
      }

      const asset = {
        ...result.assets[0],
        localId:
          result.assets[0].assetId ||
          `${Date.now()}-${result.assets[0].uri}`,
        kind: "video",
        assetType: "video",
        mediaType: "video",
      };

      if (!isFeedVideoMedia(asset)) {
        throw new Error(
          "The selected file was not recognised as a video."
        );
      }

      setSelectedMedia([]);
      setSelectedVideo(asset);
    } catch (error) {
      console.log(
        "CreatePartnerPost video picker error:",
        error
      );

      Alert.alert(
        "Add video",
        error?.message ||
          "We couldn't open your video library."
      );
    }
  }

  async function handleChooseImages() {
    try {
      if (saving) {
        return;
      }

      const permissionResult =
        await ImagePicker
          .requestMediaLibraryPermissionsAsync();

      if (
        !permissionResult.granted
      ) {
        Alert.alert(
          "Photo access required",
          "Allow Triunely to access your photos so you can add images to this Partner Post."
        );

        return;
      }

      const result =
        await ImagePicker
          .launchImageLibraryAsync({
            mediaTypes: [
              "images",
            ],
            allowsMultipleSelection:
              true,
            selectionLimit: 10,
            quality: 0.9,
            orderedSelection: true,
          });

      if (
        result.canceled ||
        !Array.isArray(
          result.assets
        )
      ) {
        return;
      }

      setSelectedVideo(null);

      const incomingAssets =
        result.assets
          .filter(
            (asset) =>
              Boolean(asset?.uri)
          )
          .map(
            (asset, index) => ({
              ...asset,
              localId:
                asset.assetId ||
                `${Date.now()}-${index}-${asset.uri}`,
              kind: "image",
              assetType: "image",
              mediaType: "image",
            })
          );

      setSelectedMedia(
        (current) => {
          const merged = [
            ...current,
            ...incomingAssets,
          ];

          const unique = [];

          const seen =
            new Set();

          for (
            const item of merged
          ) {
            const key =
              item.assetId ||
              item.uri;

            if (
              !key ||
              seen.has(key)
            ) {
              continue;
            }

            seen.add(key);
            unique.push(item);
          }

          return unique.slice(
            0,
            10
          );
        }
      );
    } catch (error) {
      console.log(
        "CreatePartnerPost image picker error:",
        error
      );

      Alert.alert(
        "Add images",
        error?.message ||
          "We couldn't open your photo library."
      );
    }
  }

  function handleRemoveSelectedVideo() {
    if (saving) {
      return;
    }

    setSelectedVideo(null);
  }


  function handleRemoveSelectedImage(
    indexToRemove
  ) {
    if (saving) {
      return;
    }

    setSelectedMedia(
      (current) =>
        current.filter(
          (_item, index) =>
            index !==
            indexToRemove
        )
    );
  }

  async function uploadSelectedVideo() {
    if (!selectedVideo) {
      return null;
    }

    if (!canAddPartnerVideo) {
      throw new Error(
        "This Partner Profile does not have permission to publish permanent native video."
      );
    }

    setUploadProgress(
      "Uploading Partner video…"
    );

    const uploadResult =
      await uploadFeedMedia({
        media: selectedVideo,
        scope: "partner-posts",
        ownerId: currentUserId,
        folderId: partnerProfileId,
        allowPermanentVideo: true,
      });

    if (!uploadResult?.mediaUrl) {
      throw new Error(
        "The Partner video could not be uploaded."
      );
    }

    return {
      mediaUrl: uploadResult.mediaUrl,
      mediaType:
        uploadResult.mediaType ||
        "video/mp4",
      thumbnailUrl: "",
    };
  }

  async function uploadSelectedImages() {
    const uploadedMedia = [];

    for (
      let index = 0;
      index <
      selectedMedia.length;
      index += 1
    ) {
      setUploadProgress(
        `Uploading image ${
          index + 1
        } of ${
          selectedMedia.length
        }…`
      );

      const selectedItem =
        selectedMedia[index];

      const uploadResult =
        await uploadFeedMedia({
          media:
            selectedItem,
          scope:
            "partner-posts",
          ownerId:
            currentUserId,
          folderId:
            partnerProfileId,
        });

      if (
        !uploadResult?.mediaUrl
      ) {
        throw new Error(
          `Image ${
            index + 1
          } could not be uploaded.`
        );
      }

      uploadedMedia.push({
        mediaUrl:
          uploadResult.mediaUrl,
        mediaType:
          uploadResult.mediaType ||
          "image/jpeg",
        thumbnailUrl: "",
      });
    }

    return uploadedMedia;
  }

  async function handleCreatePost({
    cleanTitle,
    cleanContent,
  }) {
    const uploadedVideo =
      selectedVideo
        ? await uploadSelectedVideo()
        : null;

    const uploadedMedia =
      selectedMedia.length > 0
        ? await uploadSelectedImages()
        : [];

    setUploadProgress(
      "Publishing Partner Post…"
    );

    const firstMedia =
      uploadedVideo ||
      uploadedMedia[0] ||
      null;

    const createResult =
      await createPartnerPost({
        partnerProfileId,
        authorId:
          currentUserId,
        title: cleanTitle,
        content: cleanContent,
        postType,
        mediaUrl:
          firstMedia?.mediaUrl ||
          "",
        mediaType:
          firstMedia?.mediaType ||
          "",
        linkUrl,
        linkTitle,
        linkDescription,
        linkImage,
      });

    if (
      !createResult.ok ||
      !createResult.post
    ) {
      throw (
        createResult.error ||
        new Error(
          "The Partner Post was not created."
        )
      );
    }

    if (
      uploadedMedia.length > 0
    ) {
      setUploadProgress(
        "Adding images to the Partner Gallery…"
      );

      const mediaResult =
        await createPartnerPostMediaWithGallery({
          partnerPostId:
            createResult.post.id,
          partnerProfileId,
          uploadedBy:
            currentUserId,
          uploadedMedia,
          title: cleanTitle,
          content: cleanContent,
        });

      if (!mediaResult.ok) {
        throw (
          mediaResult.error ||
          new Error(
            "The post was created, but its images could not be added to the Gallery."
          )
        );
      }
    }

    return createResult.post;
  }

  async function handleUpdatePost({
    cleanTitle,
    cleanContent,
  }) {
    setUploadProgress(
      "Saving Partner Post…"
    );

    const updateResult =
      await updatePartnerPost({
        partnerPostId,
        title: cleanTitle,
        content: cleanContent,
        postType,
        mediaUrl:
          legacyMediaUrl,
        mediaType:
          legacyMediaType,
        linkUrl,
        linkTitle,
        linkDescription,
        linkImage,
        status: "published",
      });

    if (
      !updateResult.ok ||
      !updateResult.post
    ) {
      throw (
        updateResult.error ||
        new Error(
          "The Partner Post was not updated."
        )
      );
    }

    return updateResult.post;
  }

  async function handleSave() {
    try {
      if (saving) {
        return;
      }

      const cleanTitle =
        String(
          title || ""
        ).trim();

      const cleanContent =
        String(
          content || ""
        ).trim();

      const hasAnyMedia =
        Boolean(selectedVideo) ||
        selectedMedia.length >
          0 ||
        existingMedia.length >
          0 ||
        Boolean(
          legacyMediaUrl
        );

      if (
        !cleanTitle &&
        !cleanContent &&
        !hasAnyMedia
      ) {
        Alert.alert(
          "Post needs content",
          "Add a title, some content or at least one image."
        );

        return;
      }

      setSaving(true);
      setUploadProgress("");

      if (isEdit) {
        await handleUpdatePost({
          cleanTitle,
          cleanContent,
        });
      } else {
        await handleCreatePost({
          cleanTitle,
          cleanContent,
        });
      }

      navigation.replace(
        "PartnerProfilePublic",
        {
          partnerProfileId,
        }
      );
    } catch (error) {
      console.log(
        "CreatePartnerPost save error:",
        error
      );

      Alert.alert(
        "Partner Post",
        error?.message ||
          "We couldn't save this Partner Post right now."
      );
    } finally {
      setSaving(false);
      setUploadProgress("");
    }
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor:
            PREMIUM_CREAM,
          justifyContent:
            "center",
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
          Loading partner post…
        </Text>
      </View>
    );
  }

  const mediaForEditPreview =
    existingMedia.length > 0
      ? existingMedia
      : legacyMediaUrl
        ? [
            {
              id:
                "legacy-media",
              media_url:
                legacyMediaUrl,
              media_type:
                legacyMediaType,
            },
          ]
        : [];

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
        <KeyboardAvoidingView
          style={{
            flex: 1,
          }}
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >
          <ScrollView
            style={{
              flex: 1,
            }}
            contentContainerStyle={{
              paddingBottom:
                bottomPad + 128,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={
              false
            }
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
                disabled={saving}
                hitSlop={10}
                style={({ pressed }) => ({
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  justifyContent:
                    "center",
                  alignItems: "center",
                  backgroundColor:
                    SURFACE,
                  borderWidth: 1,
                  borderColor:
                    CARD_BORDER,
                  shadowColor:
                    SHADOW,
                  shadowOpacity:
                    0.08,
                  shadowRadius: 7,
                  shadowOffset: {
                    width: 0,
                    height: 3,
                  },
                  elevation: 2,
                  opacity:
                    saving
                      ? 0.4
                      : pressed
                        ? 0.72
                        : 1,
                })}
              >
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={OLIVE}
                />
              </Pressable>

              <View
                style={{
                  marginTop: 16,
                }}
              >
                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 34,
                    lineHeight: 40,
                  }}
                >
                  {isEdit
                    ? "Edit Partner Post"
                    : "Create Partner Post"}
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
                  {isEdit
                    ? "Update this Partner Post so it stays clear, useful and relevant."
                    : "Share updates, offers, resources and promotions from "}
                  {!isEdit
                    ? partner?.name ||
                      "your Partner Profile"
                    : null}
                  {!isEdit
                    ? "."
                    : null}
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
                  backgroundColor:
                    AMBER_SOFT,
                  borderWidth: 1,
                  borderColor:
                    AMBER_BORDER,
                  alignItems: "center",
                  justifyContent:
                    "center",
                  marginBottom: 12,
                }}
              >
                <Ionicons
                  name={
                    selectedPostType
                      ?.icon ||
                    "megaphone-outline"
                  }
                  size={25}
                  color={
                    EVENT_BROWN
                  }
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
                Post type
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent:
                    "space-between",
                }}
              >
                {PARTNER_POST_TYPES.map(
                  (item) => (
                    <PostTypeOption
                      key={
                        item.value
                      }
                      item={item}
                      active={
                        postType ===
                        item.value
                      }
                      onPress={() =>
                        setPostType(
                          item.value
                        )
                      }
                    />
                  )
                )}
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
              <Text
                style={{
                  ...serifHeading,
                  fontSize: 23,
                  lineHeight: 28,
                  marginBottom: 12,
                }}
              >
                Message
              </Text>

              <Field
                label="Title"
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. New worship resource available"
              />

              <Field
                label="Content"
                value={content}
                onChangeText={setContent}
                placeholder="Share what you want Christians, churches or families to know"
                multiline
              />
            </View>

            {!isEdit ? (
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
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <Text
                      style={{
                        ...serifHeading,
                        fontSize: 23,
                        lineHeight: 28,
                      }}
                    >
                      Video
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
                      Add one permanent native video
                      to this Partner Post.
                    </Text>
                  </View>

                  <Pressable
                    onPress={handleChooseVideo}
                    disabled={
                      saving ||
                      commercialLoading ||
                      Boolean(selectedVideo)
                    }
                    style={({ pressed }) => ({
                      minWidth: 94,
                      minHeight: 42,
                      marginLeft: 12,
                      borderRadius: 999,
                      paddingHorizontal: 13,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor:
                        canAddPartnerVideo
                          ? EVENT_AMBER
                          : OLIVE,
                      opacity:
                        saving ||
                        commercialLoading ||
                        Boolean(selectedVideo)
                          ? 0.42
                          : pressed
                            ? 0.8
                            : 1,
                    })}
                  >
                    <Ionicons
                      name={
                        canAddPartnerVideo
                          ? "videocam-outline"
                          : "lock-closed-outline"
                      }
                      size={17}
                      color={SURFACE}
                      style={{
                        marginRight: 6,
                      }}
                    />

                    <Text
                      style={{
                        color: SURFACE,
                        fontSize: 12.5,
                        fontWeight: "900",
                      }}
                    >
                      {commercialLoading
                        ? "Checking"
                        : canAddPartnerVideo
                          ? "Add video"
                          : "Upgrade"}
                    </Text>
                  </Pressable>
                </View>

                {selectedVideo ? (
                  <View
                    style={{
                      marginTop: 15,
                      minHeight: 118,
                      borderRadius: 20,
                      backgroundColor: OLIVE_SOFT,
                      borderWidth: 1,
                      borderColor: OLIVE_BORDER,
                      padding: 14,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 76,
                        height: 76,
                        borderRadius: 18,
                        backgroundColor: OLIVE,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name="play"
                        size={30}
                        color={SURFACE}
                      />
                    </View>

                    <View
                      style={{
                        flex: 1,
                        minWidth: 0,
                        marginLeft: 12,
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        style={{
                          color: TEXT,
                          fontSize: 13.5,
                          fontWeight: "900",
                        }}
                      >
                        {selectedVideo.fileName ||
                          "Selected Partner video"}
                      </Text>

                      <Text
                        style={{
                          color: MUTED,
                          fontSize: 11.5,
                          lineHeight: 17,
                          fontWeight: "700",
                          marginTop: 4,
                        }}
                      >
                        This video will be the primary
                        media for the post.
                      </Text>
                    </View>

                    <Pressable
                      onPress={
                        handleRemoveSelectedVideo
                      }
                      disabled={saving}
                      hitSlop={8}
                      style={({ pressed }) => ({
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        marginLeft: 8,
                        backgroundColor: SURFACE,
                        borderWidth: 1,
                        borderColor: CARD_BORDER,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={EVENT_BROWN}
                      />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={handleChooseVideo}
                    disabled={
                      saving ||
                      commercialLoading
                    }
                    style={({ pressed }) => ({
                      marginTop: 15,
                      minHeight: 110,
                      borderRadius: 22,
                      borderWidth: 1.5,
                      borderStyle: "dashed",
                      borderColor:
                        canAddPartnerVideo
                          ? AMBER_BORDER
                          : OLIVE_BORDER,
                      backgroundColor:
                        canAddPartnerVideo
                          ? AMBER_SOFT
                          : OLIVE_SOFT,
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 18,
                      opacity:
                        saving ||
                        commercialLoading
                          ? 0.45
                          : pressed
                            ? 0.78
                            : 1,
                    })}
                  >
                    <Ionicons
                      name={
                        canAddPartnerVideo
                          ? "videocam-outline"
                          : "lock-closed-outline"
                      }
                      size={28}
                      color={
                        canAddPartnerVideo
                          ? EVENT_AMBER
                          : OLIVE
                      }
                    />

                    <Text
                      style={{
                        color:
                          canAddPartnerVideo
                            ? EVENT_BROWN
                            : OLIVE,
                        fontSize: 14,
                        fontWeight: "900",
                        marginTop: 8,
                      }}
                    >
                      {commercialLoading
                        ? "Checking video access…"
                        : canAddPartnerVideo
                          ? "Choose a video"
                          : "Video requires an eligible Partner plan"}
                    </Text>

                    <Text
                      style={{
                        color: MUTED,
                        fontSize: 11.5,
                        lineHeight: 17,
                        fontWeight: "700",
                        textAlign: "center",
                        marginTop: 4,
                      }}
                    >
                      {canAddPartnerVideo
                        ? "Select one video from your media library."
                        : "Your current Partner entitlements do not include permanent native video."}
                    </Text>
                  </Pressable>
                )}
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
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <Text
                    style={{
                      ...serifHeading,
                      fontSize: 23,
                      lineHeight: 28,
                    }}
                  >
                    Images
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
                    Add up to 10 images.
                    Every image is
                    automatically added to
                    this Partner Profile’s
                    Gallery.
                  </Text>
                </View>

                {!isEdit ? (
                  <Pressable
                    onPress={
                      handleChooseImages
                    }
                    disabled={
                      saving ||
                      selectedMedia.length >=
                        10
                    }
                    style={({ pressed }) => ({
                      minWidth: 94,
                      minHeight: 42,
                      marginLeft: 12,
                      borderRadius: 999,
                      paddingHorizontal: 13,
                      flexDirection:
                        "row",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      backgroundColor:
                        EVENT_AMBER,
                      opacity:
                        saving ||
                        selectedMedia.length >=
                          10
                          ? 0.42
                          : pressed
                            ? 0.8
                            : 1,
                    })}
                  >
                    <Ionicons
                      name="images-outline"
                      size={17}
                      color={SURFACE}
                      style={{
                        marginRight: 6,
                      }}
                    />

                    <Text
                      style={{
                        color: SURFACE,
                        fontSize: 12.5,
                        fontWeight: "900",
                      }}
                    >
                      Add images
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {!isEdit &&
              selectedMedia.length ===
                0 ? (
                <Pressable
                  onPress={
                    handleChooseImages
                  }
                  disabled={saving}
                  style={({ pressed }) => ({
                    marginTop: 15,
                    minHeight: 142,
                    borderRadius: 22,
                    borderWidth: 1.5,
                    borderStyle:
                      "dashed",
                    borderColor:
                      AMBER_BORDER,
                    backgroundColor:
                      AMBER_SOFT,
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    padding: 18,
                    opacity:
                      pressed
                        ? 0.78
                        : 1,
                  })}
                >
                  <View
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 27,
                      backgroundColor:
                        SURFACE,
                      borderWidth: 1,
                      borderColor:
                        AMBER_BORDER,
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                    }}
                  >
                    <Ionicons
                      name="images-outline"
                      size={25}
                      color={
                        EVENT_AMBER
                      }
                    />
                  </View>

                  <Text
                    style={{
                      color:
                        EVENT_BROWN,
                      fontSize: 14,
                      fontWeight: "900",
                      marginTop: 10,
                    }}
                  >
                    Choose photos
                  </Text>

                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 12,
                      lineHeight: 17,
                      fontWeight: "700",
                      textAlign:
                        "center",
                      marginTop: 4,
                    }}
                  >
                    Select one or several
                    images from your photo
                    library.
                  </Text>
                </Pressable>
              ) : null}

              {!isEdit &&
              selectedMedia.length >
                0 ? (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={
                      false
                    }
                    contentContainerStyle={{
                      paddingTop: 15,
                      paddingRight: 4,
                    }}
                  >
                    {selectedMedia.map(
                      (
                        item,
                        index
                      ) => (
                        <MediaPreview
                          key={
                            item.localId ||
                            item.uri
                          }
                          item={item}
                          index={index}
                          disabled={
                            saving
                          }
                          onRemove={() =>
                            handleRemoveSelectedImage(
                              index
                            )
                          }
                        />
                      )
                    )}
                  </ScrollView>

                  <View
                    style={{
                      marginTop: 12,
                      borderRadius: 17,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor:
                        OLIVE_SOFT,
                      borderWidth: 1,
                      borderColor:
                        OLIVE_BORDER,
                      flexDirection:
                        "row",
                      alignItems:
                        "flex-start",
                    }}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={18}
                      color={OLIVE}
                      style={{
                        marginRight: 7,
                        marginTop: 1,
                      }}
                    />

                    <Text
                      style={{
                        flex: 1,
                        color: OLIVE,
                        fontSize: 11.5,
                        lineHeight: 17,
                        fontWeight: "800",
                      }}
                    >
                      The first image receives
                      the post title and
                      content as its Gallery
                      caption. The remaining
                      images are added without
                      repeating the caption.
                    </Text>
                  </View>
                </>
              ) : null}

              {isEdit &&
              mediaForEditPreview.length >
                0 ? (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={
                      false
                    }
                    contentContainerStyle={{
                      paddingTop: 15,
                      paddingRight: 4,
                    }}
                  >
                    {mediaForEditPreview.map(
                      (
                        item,
                        index
                      ) => (
                        <MediaPreview
                          key={
                            item.id ||
                            item.media_url ||
                            index
                          }
                          item={item}
                          index={index}
                        />
                      )
                    )}
                  </ScrollView>

                  <View
                    style={{
                      marginTop: 12,
                      borderRadius: 17,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor:
                        OLIVE_SOFT,
                      borderWidth: 1,
                      borderColor:
                        OLIVE_BORDER,
                      flexDirection:
                        "row",
                      alignItems:
                        "flex-start",
                    }}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={17}
                      color={OLIVE}
                      style={{
                        marginRight: 7,
                        marginTop: 1,
                      }}
                    />

                    <Text
                      style={{
                        flex: 1,
                        color: OLIVE,
                        fontSize: 11.5,
                        lineHeight: 17,
                        fontWeight: "800",
                      }}
                    >
                      Existing post images are
                      preserved while editing.
                      Image replacement and
                      removal will be added
                      after the new
                      multi-image publishing
                      flow is tested.
                    </Text>
                  </View>
                </>
              ) : null}

              {isEdit &&
              mediaForEditPreview.length ===
                0 ? (
                <View
                  style={{
                    marginTop: 15,
                    minHeight: 90,
                    borderRadius: 20,
                    backgroundColor:
                      PREMIUM_CREAM,
                    borderWidth: 1,
                    borderColor:
                      CARD_BORDER,
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    padding: 16,
                  }}
                >
                  <Ionicons
                    name="image-outline"
                    size={25}
                    color={MUTED}
                  />

                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 12.5,
                      fontWeight: "800",
                      marginTop: 7,
                    }}
                  >
                    This post has no images.
                  </Text>
                </View>
              ) : null}
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
                Optional link
              </Text>

              <Field
                label="Link URL"
                value={linkUrl}
                onChangeText={setLinkUrl}
                placeholder="https://..."
                autoCapitalize="none"
                keyboardType="url"
              />

              <Field
                label="Link title"
                value={linkTitle}
                onChangeText={
                  setLinkTitle
                }
                placeholder="Optional"
              />

              <Field
                label="Link description"
                value={
                  linkDescription
                }
                onChangeText={
                  setLinkDescription
                }
                placeholder="Optional"
                multiline
              />

              <Field
                label="Link image"
                value={linkImage}
                onChangeText={
                  setLinkImage
                }
                placeholder="Optional image URL"
                autoCapitalize="none"
                keyboardType="url"
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
              paddingBottom:
                bottomPad + 12,
              backgroundColor:
                "rgba(255,252,245,0.97)",
              borderTopWidth: 1,
              borderTopColor:
                CARD_BORDER,
            }}
          >
            {saving &&
            uploadProgress ? (
              <Text
                numberOfLines={1}
                style={{
                  color: MUTED,
                  fontSize: 11.5,
                  fontWeight: "800",
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                {uploadProgress}
              </Text>
            ) : null}

            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => ({
                opacity:
                  saving
                    ? 0.62
                    : pressed
                      ? 0.86
                      : 1,
                borderRadius: 999,
                backgroundColor:
                  EVENT_AMBER,
                paddingVertical: 14,
                alignItems: "center",
                justifyContent:
                  "center",
                flexDirection: "row",
                shadowColor:
                  EVENT_AMBER,
                shadowOpacity: 0.16,
                shadowRadius: 8,
                shadowOffset: {
                  width: 0,
                  height: 4,
                },
                elevation: 3,
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
                    name="megaphone-outline"
                    size={17}
                    color={SURFACE}
                    style={{
                      marginRight: 7,
                    }}
                  />

                  <Text
                    style={{
                      color: SURFACE,
                      fontSize: 14,
                      fontWeight: "900",
                    }}
                  >
                    {isEdit
                      ? "Save Partner Post"
                      : "Publish Partner Post"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          <Modal
            visible={
              videoUpgradeModalVisible
            }
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => {
              setVideoUpgradeModalVisible(
                false
              );

              setUpgradeOptionsRequested(
                false
              );
            }}
          >
            <Pressable
              onPress={() => {
                setVideoUpgradeModalVisible(
                  false
                );

                setUpgradeOptionsRequested(
                  false
                );
              }}
              style={{
                flex: 1,
                backgroundColor:
                  "rgba(15,23,42,0.58)",
                justifyContent: "center",
                paddingHorizontal: 20,
                paddingVertical: 32,
              }}
            >
              <Pressable
                onPress={() => {}}
                style={{
                  backgroundColor: SURFACE,
                  borderRadius: 28,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  padding: 20,
                  shadowColor: SHADOW,
                  shadowOpacity: 0.2,
                  shadowRadius: 20,
                  shadowOffset: {
                    width: 0,
                    height: 9,
                  },
                  elevation: 9,
                }}
              >
                <View
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 29,
                    backgroundColor:
                      AMBER_SOFT,
                    borderWidth: 1,
                    borderColor:
                      AMBER_BORDER,
                    alignItems: "center",
                    justifyContent:
                      "center",
                    marginBottom: 16,
                  }}
                >
                  <Ionicons
                    name={
                      upgradeOptionsRequested
                        ? "heart-outline"
                        : "videocam-outline"
                    }
                    size={27}
                    color={EVENT_AMBER}
                  />
                </View>

                {upgradeOptionsRequested ? (
                  <>
                    <Text
                      style={{
                        ...serifHeading,
                        fontSize: 25,
                        lineHeight: 31,
                      }}
                    >
                      Partner upgrades are being
                      prepared
                    </Text>

                    <Text
                      style={{
                        color: MUTED,
                        fontSize: 13.5,
                        fontWeight: "700",
                        lineHeight: 21,
                        marginTop: 10,
                      }}
                    >
                      We are building the Partner
                      upgrade experience carefully,
                      including clear pricing and a
                      transparent explanation of
                      what each plan supports.
                    </Text>

                    <Text
                      style={{
                        color: TEXT,
                        fontSize: 13.5,
                        fontWeight: "800",
                        lineHeight: 21,
                        marginTop: 12,
                      }}
                    >
                      No payment will be taken from
                      this screen.
                    </Text>

                    <Pressable
                      onPress={() => {
                        setVideoUpgradeModalVisible(
                          false
                        );

                        setUpgradeOptionsRequested(
                          false
                        );
                      }}
                      style={({ pressed }) => ({
                        marginTop: 20,
                        minHeight: 48,
                        borderRadius: 999,
                        backgroundColor:
                          EVENT_AMBER,
                        alignItems: "center",
                        justifyContent:
                          "center",
                        opacity:
                          pressed ? 0.84 : 1,
                      })}
                    >
                      <Text
                        style={{
                          color: SURFACE,
                          fontSize: 13.5,
                          fontWeight: "900",
                        }}
                      >
                        Done
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text
                      style={{
                        ...serifHeading,
                        fontSize: 25,
                        lineHeight: 31,
                      }}
                    >
                      Grow your Partner presence with video
                    </Text>

                    <Text
                      style={{
                        color: MUTED,
                        fontSize: 13.5,
                        fontWeight: "700",
                        lineHeight: 21,
                        marginTop: 10,
                      }}
                    >
                      Hosting and delivering video
                      creates ongoing costs for
                      Triunely, including storage,
                      streaming, security and
                      platform infrastructure.
                    </Text>

                    <Text
                      style={{
                        color: MUTED,
                        fontSize: 13.5,
                        fontWeight: "700",
                        lineHeight: 21,
                        marginTop: 12,
                      }}
                    >
                      Upgrading helps cover those
                      costs while supporting the
                      continued growth of Triunely
                      as we build tools that
                      strengthen Christians,
                      churches and Christian
                      organisations.
                    </Text>

                    <View
                      style={{
                        marginTop: 14,
                        borderRadius: 18,
                        backgroundColor:
                          AMBER_SOFT,
                        borderWidth: 1,
                        borderColor:
                          AMBER_BORDER,
                        padding: 13,
                        flexDirection: "row",
                        alignItems:
                          "flex-start",
                      }}
                    >
                      <Ionicons
                        name="heart-outline"
                        size={20}
                        color={EVENT_AMBER}
                        style={{
                          marginRight: 9,
                          marginTop: 1,
                        }}
                      />

                      <Text
                        style={{
                          flex: 1,
                          color: EVENT_BROWN,
                          fontSize: 13,
                          fontWeight: "900",
                          lineHeight: 20,
                        }}
                      >
                        Your upgrade does more than
                        unlock video posts. It helps
                        us keep building a
                        sustainable platform
                        created to serve Christ, His
                        Church and His mission.
                      </Text>
                    </View>

                    <Pressable
onPress={() => {
  setVideoUpgradeModalVisible(
    false
  );

  setUpgradeOptionsRequested(
    false
  );

  navigation.navigate(
    "PartnerGrowth",
    {
      partnerProfileId,
      partnerName:
        partner?.name ||
        "your Partner Profile",
    }
  );
}}
                      style={({ pressed }) => ({
                        marginTop: 20,
                        minHeight: 48,
                        borderRadius: 999,
                        backgroundColor:
                          EVENT_AMBER,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent:
                          "center",
                        opacity:
                          pressed ? 0.84 : 1,
                      })}
                    >
                      <Ionicons
                        name="arrow-forward"
                        size={18}
                        color={SURFACE}
                        style={{
                          marginRight: 7,
                        }}
                      />

                      <Text
                        style={{
                          color: SURFACE,
                          fontSize: 13.5,
                          fontWeight: "900",
                        }}
                      >
                       View Partner Growth
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        setVideoUpgradeModalVisible(
                          false
                        );

                        setUpgradeOptionsRequested(
                          false
                        );
                      }}
                      style={({ pressed }) => ({
                        marginTop: 9,
                        minHeight: 44,
                        borderRadius: 999,
                        backgroundColor:
                          pressed
                            ? OLIVE_SOFT
                            : "transparent",
                        borderWidth: 1,
                        borderColor:
                          OLIVE_BORDER,
                        alignItems: "center",
                        justifyContent:
                          "center",
                      })}
                    >
                      <Text
                        style={{
                          color: OLIVE,
                          fontSize: 13,
                          fontWeight: "900",
                        }}
                      >
                        Not now
                      </Text>
                    </Pressable>
                  </>
                )}
              </Pressable>
            </Pressable>
          </Modal>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}