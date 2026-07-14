// src/features/partners/screens/AddPartnerGalleryMedia.js
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
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

import Screen from "../../../components/Screen";
import { supabase } from "../../../lib/supabase";
import { uploadFeedMedia } from "../../../lib/uploadFeedMedia";

import {
    createPartnerGalleryItem,
    fetchPartnerGalleryItems,
    fetchPartnerProfileById,
} from "../services/partnersService";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";
const SUCCESS = "#3F6B3A";

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

const MAX_SELECTION = 20;

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

function createLocalItem(asset, index = 0) {
  return {
    localId:
      asset?.assetId ||
      `${Date.now()}-${index}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

    asset,
    caption: "",
    altText: "",
    status: "ready",
    errorText: "",
  };
}

function getPreviewAspectRatio(asset) {
  const width = Number(asset?.width) || 0;
  const height = Number(asset?.height) || 0;

  if (!width || !height) {
    return 1;
  }

  const naturalRatio = width / height;

  return Math.min(
    1.8,
    Math.max(0.7, naturalRatio)
  );
}

function SelectedImageCard({
  item,
  index,
  saving,
  onRemove,
  onChangeCaption,
  onChangeAltText,
}) {
  const uploaded =
    item?.status === "uploaded";

  const failed =
    item?.status === "error";

  const asset = item?.asset || {};

  const aspectRatio =
    getPreviewAspectRatio(asset);

  return (
    <View
      style={{
        ...premiumCardStyle,
        marginHorizontal: 16,
        padding: 14,
        marginBottom: 14,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 11,
        }}
      >
        <View
          style={{
            width: 35,
            height: 35,
            borderRadius: 18,
            backgroundColor: uploaded
              ? OLIVE_SOFT
              : AMBER_SOFT,
            borderWidth: 1,
            borderColor: uploaded
              ? OLIVE_BORDER
              : AMBER_BORDER,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 9,
          }}
        >
          <Ionicons
            name={
              uploaded
                ? "checkmark"
                : "image-outline"
            }
            size={17}
            color={
              uploaded
                ? SUCCESS
                : EVENT_AMBER
            }
          />
        </View>

        <View
          style={{
            flex: 1,
          }}
        >
          <Text
            style={{
              color: TEXT,
              fontSize: 13.5,
              lineHeight: 18,
              fontWeight: "900",
            }}
          >
            Image {index + 1}
          </Text>

          <Text
            numberOfLines={1}
            style={{
              color: MUTED,
              fontSize: 11.5,
              lineHeight: 16,
              fontWeight: "700",
              marginTop: 1,
            }}
          >
            {uploaded
              ? "Uploaded successfully"
              : failed
                ? item.errorText ||
                  "Upload failed"
                : asset?.fileName ||
                  "Selected image"}
          </Text>
        </View>

        {!uploaded ? (
          <Pressable
            onPress={() =>
              onRemove(item.localId)
            }
            disabled={saving}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 37,
              height: 37,
              borderRadius: 19,
              backgroundColor:
                "rgba(124,45,18,0.08)",
              borderWidth: 1,
              borderColor:
                "rgba(124,45,18,0.13)",
              alignItems: "center",
              justifyContent: "center",
              opacity: saving
                ? 0.35
                : pressed
                  ? 0.72
                  : 1,
              transform: [
                {
                  translateY:
                    pressed ? 2 : 0,
                },
                {
                  scale:
                    pressed ? 0.95 : 1,
                },
              ],
            })}
          >
            <Ionicons
              name="trash-outline"
              size={17}
              color={EVENT_BROWN}
            />
          </Pressable>
        ) : null}
      </View>

      <View
        style={{
          width: "100%",
          aspectRatio,
          minHeight: 180,
          maxHeight: 420,
          borderRadius: 20,
          overflow: "hidden",
          backgroundColor:
            "rgba(79,99,59,0.08)",
          borderWidth: 1,
          borderColor: CARD_BORDER,
        }}
      >
        <Image
          source={{
            uri: asset?.uri,
          }}
          resizeMode="contain"
          style={{
            width: "100%",
            height: "100%",
          }}
        />

        {uploaded ? (
          <View
            style={{
              position: "absolute",
              top: 11,
              right: 11,
              minHeight: 34,
              paddingHorizontal: 11,
              borderRadius: 999,
              backgroundColor:
                "rgba(63,107,58,0.92)",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={SURFACE}
              style={{
                marginRight: 5,
              }}
            />

            <Text
              style={{
                color: SURFACE,
                fontSize: 11.5,
                fontWeight: "900",
              }}
            >
              Uploaded
            </Text>
          </View>
        ) : null}
      </View>

      <Text
        style={{
          color: MUTED,
          fontSize: 11.5,
          fontWeight: "900",
          textTransform: "uppercase",
          letterSpacing: 0.45,
          marginTop: 14,
          marginBottom: 7,
        }}
      >
        Caption
      </Text>

      <TextInput
        value={item.caption}
        onChangeText={(value) =>
          onChangeCaption(
            item.localId,
            value
          )
        }
        editable={!saving && !uploaded}
        placeholder="Tell people what this image shows"
        placeholderTextColor={MUTED}
        multiline
        maxLength={300}
        style={{
          minHeight: 78,
          textAlignVertical: "top",
          borderRadius: 17,
          backgroundColor:
            PREMIUM_CREAM,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          paddingHorizontal: 12,
          paddingVertical: 11,
          color: TEXT,
          fontSize: 13.5,
          fontWeight: "800",
          lineHeight: 19,
          opacity: uploaded ? 0.72 : 1,
        }}
      />

      <Text
        style={{
          color: MUTED,
          fontSize: 10.5,
          fontWeight: "700",
          textAlign: "right",
          marginTop: 4,
        }}
      >
        {item.caption.length} / 300
      </Text>

      <Text
        style={{
          color: MUTED,
          fontSize: 11.5,
          fontWeight: "900",
          textTransform: "uppercase",
          letterSpacing: 0.45,
          marginTop: 13,
          marginBottom: 7,
        }}
      >
        Accessibility description
      </Text>

      <TextInput
        value={item.altText}
        onChangeText={(value) =>
          onChangeAltText(
            item.localId,
            value
          )
        }
        editable={!saving && !uploaded}
        placeholder="Briefly describe the image for accessibility tools"
        placeholderTextColor={MUTED}
        multiline
        maxLength={300}
        style={{
          minHeight: 72,
          textAlignVertical: "top",
          borderRadius: 17,
          backgroundColor:
            PREMIUM_CREAM,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          paddingHorizontal: 12,
          paddingVertical: 11,
          color: TEXT,
          fontSize: 13.5,
          fontWeight: "800",
          lineHeight: 19,
          opacity: uploaded ? 0.72 : 1,
        }}
      />
    </View>
  );
}

export default function AddPartnerGalleryMedia({
  route,
  navigation,
}) {
  const partnerProfileId =
    route?.params?.partnerProfileId ||
    null;

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    savingProgress,
    setSavingProgress,
  ] = useState({
    current: 0,
    total: 0,
  });

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState(null);

  const [partner, setPartner] =
    useState(null);

  const [
    existingGalleryCount,
    setExistingGalleryCount,
  ] = useState(0);

  const [
    selectedItems,
    setSelectedItems,
  ] = useState([]);

  const readyItems = useMemo(
    () =>
      selectedItems.filter(
        (item) =>
          item.status !== "uploaded"
      ),
    [selectedItems]
  );

  const uploadedCount = useMemo(
    () =>
      selectedItems.filter(
        (item) =>
          item.status === "uploaded"
      ).length,
    [selectedItems]
  );

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
          "You need to be signed in to manage a Partner Gallery."
        );

        navigation.goBack();
        return;
      }

      const partnerResult =
        await fetchPartnerProfileById(
          partnerProfileId
        );

      if (
        !partnerResult.ok ||
        !partnerResult.partner
      ) {
        throw (
          partnerResult.error ||
          new Error(
            "Partner Profile not found."
          )
        );
      }

      const ownsPartner =
        partnerResult.partner
          .owner_id === meId;

      let isPartnerAdmin = false;

      if (!ownsPartner) {
        const {
          data: adminData,
          error: adminError,
        } = await supabase
          .from(
            "partner_profile_admins"
          )
          .select("id, role")
          .eq(
            "partner_profile_id",
            partnerProfileId
          )
          .eq("user_id", meId)
          .limit(1);

        if (adminError) {
          console.log(
            "AddPartnerGalleryMedia admin permission error:",
            adminError
          );
        } else {
          isPartnerAdmin =
            Array.isArray(adminData) &&
            adminData.length > 0;
        }
      }

      if (
        !ownsPartner &&
        !isPartnerAdmin
      ) {
        Alert.alert(
          "Not allowed",
          "You do not have permission to manage this Partner Gallery."
        );

        navigation.goBack();
        return;
      }

      setPartner(
        partnerResult.partner
      );

      const galleryResult =
        await fetchPartnerGalleryItems({
          partnerProfileId,
          includeArchived: true,
          limit: 100,
        });

      if (galleryResult.ok) {
        setExistingGalleryCount(
          galleryResult.items?.length ||
            0
        );
      } else {
        console.log(
          "AddPartnerGalleryMedia gallery count error:",
          galleryResult.error
        );

        setExistingGalleryCount(0);
      }
    } catch (error) {
      console.log(
        "AddPartnerGalleryMedia load error:",
        error
      );

      Alert.alert(
        "Partner Gallery",
        "We couldn't load this Partner Profile."
      );

      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [
    navigation,
    partnerProfileId,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  async function chooseImages() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Photo access required",
          "Allow Triunely to access your photos so you can add images to this gallery."
        );

        return;
      }

      const remainingSlots = Math.max(
        0,
        MAX_SELECTION -
          selectedItems.length
      );

      if (!remainingSlots) {
        Alert.alert(
          "Selection limit reached",
          `You can add up to ${MAX_SELECTION} images at once.`
        );

        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes:
            ImagePicker.MediaTypeOptions
              .Images,

          allowsEditing: false,
          allowsMultipleSelection: true,
          selectionLimit: remainingSlots,
          orderedSelection: true,
          quality: 1,
          exif: false,
        });

      if (
        result.canceled ||
        !result.assets?.length
      ) {
        return;
      }

      const validAssets =
        result.assets.filter(
          (asset) => asset?.uri
        );

      if (!validAssets.length) {
        Alert.alert(
          "Choose images",
          "We couldn't read the selected images."
        );

        return;
      }

      setSelectedItems(
        (currentItems) => {
          const existingUris =
            new Set(
              currentItems.map(
                (item) =>
                  item?.asset?.uri
              )
            );

          const newItems =
            validAssets
              .filter(
                (asset) =>
                  !existingUris.has(
                    asset.uri
                  )
              )
              .map((asset, index) =>
                createLocalItem(
                  asset,
                  index
                )
              );

          return [
            ...currentItems,
            ...newItems,
          ].slice(0, MAX_SELECTION);
        }
      );
    } catch (error) {
      console.log(
        "AddPartnerGalleryMedia picker error:",
        error
      );

      Alert.alert(
        "Choose images",
        "We couldn't open your photo library."
      );
    }
  }

  function removeSelectedItem(localId) {
    if (saving) return;

    setSelectedItems(
      (currentItems) =>
        currentItems.filter(
          (item) =>
            item.localId !== localId
        )
    );
  }

  function updateSelectedItem(
    localId,
    changes
  ) {
    setSelectedItems(
      (currentItems) =>
        currentItems.map((item) =>
          item.localId === localId
            ? {
                ...item,
                ...changes,
              }
            : item
        )
    );
  }

  async function handlePublish() {
    if (saving) return;

    const itemsToUpload =
      selectedItems.filter(
        (item) =>
          item.status !== "uploaded"
      );

    if (!itemsToUpload.length) {
      if (uploadedCount > 0) {
        navigation.replace(
          "PartnerProfilePublic",
          {
            partnerProfileId,
            initialTab: "gallery",
          }
        );

        return;
      }

      Alert.alert(
        "Choose images",
        "Select at least one image before adding media to the gallery."
      );

      return;
    }

    if (
      !currentUserId ||
      !partnerProfileId
    ) {
      Alert.alert(
        "Partner Gallery",
        "The Partner Profile details are missing."
      );

      return;
    }

    try {
      setSaving(true);

      setSavingProgress({
        current: 0,
        total: itemsToUpload.length,
      });

      let successfulThisRun = 0;

      for (
        let index = 0;
        index < itemsToUpload.length;
        index += 1
      ) {
        const item =
          itemsToUpload[index];

        setSavingProgress({
          current: index + 1,
          total: itemsToUpload.length,
        });

        updateSelectedItem(
          item.localId,
          {
            status: "uploading",
            errorText: "",
          }
        );

        try {
          const asset =
            item.asset || {};

          const uploaded =
            await uploadFeedMedia({
              media: {
                ...asset,
                uri: asset.uri,
                type:
                  asset.mimeType ||
                  asset.type ||
                  "image/jpeg",
                mimeType:
                  asset.mimeType ||
                  asset.type ||
                  "image/jpeg",
                mediaType: "image",
                assetType: "image",
                kind: "image",
              },
              scope:
                "partner-profiles",
              ownerId:
                currentUserId,
              folderId:
                partnerProfileId,
            });

          if (
            !uploaded?.mediaUrl
          ) {
            throw new Error(
              "The image upload did not return a media URL."
            );
          }

          const createResult =
            await createPartnerGalleryItem({
              partnerProfileId,
              uploadedBy:
                currentUserId,
              mediaUrl:
                uploaded.mediaUrl,
              mediaType: "image",
              thumbnailUrl: "",
              caption: String(
                item.caption || ""
              ).trim(),
              altText: String(
                item.altText || ""
              ).trim(),
              sortOrder:
                existingGalleryCount +
                uploadedCount +
                successfulThisRun,
              status: "published",
            });

          if (!createResult.ok) {
            throw createResult.error;
          }

          successfulThisRun += 1;

          updateSelectedItem(
            item.localId,
            {
              status: "uploaded",
              errorText: "",
            }
          );
        } catch (itemError) {
          console.log(
            "AddPartnerGalleryMedia item upload error:",
            {
              localId:
                item.localId,
              error: itemError,
            }
          );

          updateSelectedItem(
            item.localId,
            {
              status: "error",
              errorText:
                itemError?.message ||
                "Upload failed",
            }
          );
        }
      }

      const failedCount =
        itemsToUpload.length -
        successfulThisRun;

      if (failedCount > 0) {
        Alert.alert(
          "Gallery upload partly completed",
          `${successfulThisRun} image${
            successfulThisRun === 1
              ? ""
              : "s"
          } uploaded. ${failedCount} image${
            failedCount === 1
              ? ""
              : "s"
          } could not be uploaded. You can press the button again to retry the failed images.`
        );

        return;
      }

      navigation.replace(
        "PartnerProfilePublic",
        {
          partnerProfileId,
          initialTab: "gallery",
        }
      );
    } catch (error) {
      console.log(
        "AddPartnerGalleryMedia publish error:",
        error
      );

      Alert.alert(
        "Partner Gallery",
        error?.message ||
          "We couldn't add these images to the gallery."
      );
    } finally {
      setSaving(false);

      setSavingProgress({
        current: 0,
        total: 0,
      });
    }
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor:
            PREMIUM_CREAM,
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
          Loading Partner Gallery…
        </Text>
      </View>
    );
  }

  const publishLabel = saving
    ? `Uploading ${savingProgress.current} of ${savingProgress.total}…`
    : readyItems.length > 0
      ? `Add ${readyItems.length} Image${
          readyItems.length === 1
            ? ""
            : "s"
        } to Gallery`
      : uploadedCount > 0
        ? "Return to Partner Gallery"
        : "Add Images to Gallery";

  return (
    <Screen
      backgroundColor={PREMIUM_CREAM}
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
                bottomPad + 120,
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
                hitSlop={10}
                disabled={saving}
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
                    pressed
                      ? 0.03
                      : 0.08,
                  shadowRadius:
                    pressed ? 2 : 7,
                  shadowOffset: {
                    width: 0,
                    height:
                      pressed ? 1 : 3,
                  },
                  elevation:
                    pressed ? 1 : 2,
                  opacity:
                    saving ? 0.4 : 1,
                  transform: [
                    {
                      translateY:
                        pressed ? 2 : 0,
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
                  Add Gallery Media
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
                  Add complete photographs
                  without cropping them.
                  Landscape, portrait and
                  square images will retain
                  their original proportions.
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
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor:
                      AMBER_SOFT,
                    borderWidth: 1,
                    borderColor:
                      AMBER_BORDER,
                    alignItems: "center",
                    justifyContent:
                      "center",
                    marginRight: 11,
                  }}
                >
                  <Ionicons
                    name="images-outline"
                    size={23}
                    color={EVENT_BROWN}
                  />
                </View>

                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={{
                      ...serifHeading,
                      fontSize: 21,
                      lineHeight: 26,
                    }}
                  >
                    {partner?.name ||
                      "Partner Gallery"}
                  </Text>

                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 12.5,
                      lineHeight: 18,
                      fontWeight: "700",
                      marginTop: 2,
                    }}
                  >
                    Select up to{" "}
                    {MAX_SELECTION} complete
                    images at once.
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={chooseImages}
                disabled={
                  saving ||
                  selectedItems.length >=
                    MAX_SELECTION
                }
                style={({ pressed }) => ({
                  marginTop: 15,
                  minHeight: 50,
                  borderRadius: 999,
                  backgroundColor:
                    selectedItems.length
                      ? PREMIUM_CREAM
                      : EVENT_AMBER,
                  borderWidth: 1,
                  borderColor:
                    selectedItems.length
                      ? CARD_BORDER
                      : EVENT_AMBER,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity:
                    saving ||
                    selectedItems.length >=
                      MAX_SELECTION
                      ? 0.42
                      : 1,
                  shadowColor:
                    selectedItems.length
                      ? SHADOW
                      : EVENT_BROWN,
                  shadowOpacity:
                    pressed
                      ? 0.04
                      : 0.16,
                  shadowRadius:
                    pressed ? 2 : 7,
                  shadowOffset: {
                    width: 0,
                    height:
                      pressed ? 1 : 4,
                  },
                  elevation:
                    pressed ? 1 : 3,
                  transform: [
                    {
                      translateY:
                        pressed ? 2 : 0,
                    },
                    {
                      scale:
                        pressed
                          ? 0.985
                          : 1,
                    },
                  ],
                })}
              >
                <Ionicons
                  name={
                    selectedItems.length
                      ? "add-circle-outline"
                      : "images-outline"
                  }
                  size={19}
                  color={
                    selectedItems.length
                      ? OLIVE
                      : SURFACE
                  }
                  style={{
                    marginRight: 7,
                  }}
                />

                <Text
                  style={{
                    color:
                      selectedItems.length
                        ? OLIVE
                        : SURFACE,
                    fontSize: 13.5,
                    fontWeight: "900",
                  }}
                >
                  {selectedItems.length
                    ? "Add more images"
                    : "Select gallery images"}
                </Text>
              </Pressable>

              {selectedItems.length ? (
                <View
                  style={{
                    marginTop: 12,
                    borderRadius: 17,
                    backgroundColor:
                      OLIVE_SOFT,
                    borderWidth: 1,
                    borderColor:
                      OLIVE_BORDER,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color={OLIVE}
                    style={{
                      marginRight: 7,
                    }}
                  />

                  <Text
                    style={{
                      flex: 1,
                      color: OLIVE,
                      fontSize: 12,
                      lineHeight: 17,
                      fontWeight: "900",
                    }}
                  >
                    {selectedItems.length} of{" "}
                    {MAX_SELECTION} images
                    selected
                  </Text>
                </View>
              ) : (
                <View
                  style={{
                    marginTop: 12,
                    borderRadius: 17,
                    backgroundColor:
                      OLIVE_SOFT,
                    borderWidth: 1,
                    borderColor:
                      OLIVE_BORDER,
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "flex-start",
                  }}
                >
                  <Ionicons
                    name="expand-outline"
                    size={18}
                    color={OLIVE}
                    style={{
                      marginRight: 8,
                      marginTop: 1,
                    }}
                  />

                  <Text
                    style={{
                      flex: 1,
                      color: OLIVE,
                      fontSize: 12,
                      lineHeight: 18,
                      fontWeight: "800",
                    }}
                  >
                    Images are stored with
                    their full contents.
                    Square gallery tiles are
                    only previews; opening an
                    image shows the complete
                    photograph.
                  </Text>
                </View>
              )}
            </View>

            {selectedItems.map(
              (item, index) => (
                <SelectedImageCard
                  key={item.localId}
                  item={item}
                  index={index}
                  saving={saving}
                  onRemove={
                    removeSelectedItem
                  }
                  onChangeCaption={(
                    localId,
                    value
                  ) =>
                    updateSelectedItem(
                      localId,
                      {
                        caption: value,
                      }
                    )
                  }
                  onChangeAltText={(
                    localId,
                    value
                  ) =>
                    updateSelectedItem(
                      localId,
                      {
                        altText: value,
                      }
                    )
                  }
                />
              )
            )}
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
            <Pressable
              onPress={handlePublish}
              disabled={
                saving ||
                selectedItems.length === 0
              }
              style={({ pressed }) => ({
                minHeight: 50,
                borderRadius: 999,
                backgroundColor:
                  EVENT_AMBER,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                opacity:
                  saving ||
                  selectedItems.length === 0
                    ? 0.45
                    : 1,
                shadowColor:
                  EVENT_BROWN,
                shadowOpacity:
                  pressed
                    ? 0.06
                    : 0.18,
                shadowRadius:
                  pressed ? 2 : 8,
                shadowOffset: {
                  width: 0,
                  height:
                    pressed ? 1 : 4,
                },
                elevation:
                  pressed ? 1 : 3,
                transform: [
                  {
                    translateY:
                      pressed ? 2 : 0,
                  },
                  {
                    scale:
                      pressed
                        ? 0.985
                        : 1,
                  },
                ],
              })}
            >
              {saving ? (
                <ActivityIndicator
                  size="small"
                  color={SURFACE}
                  style={{
                    marginRight: 8,
                  }}
                />
              ) : (
                <Ionicons
                  name="images-outline"
                  size={19}
                  color={SURFACE}
                  style={{
                    marginRight: 7,
                  }}
                />
              )}

              <Text
                style={{
                  color: SURFACE,
                  fontSize: 14,
                  fontWeight: "900",
                }}
              >
                {publishLabel}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}