// src/features/partners/screens/ManagePartnerGalleryItem.js
import { Ionicons } from "@expo/vector-icons";
import {
    useCallback,
    useEffect,
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
import { supabase } from "../../../lib/supabase";

import {
    deletePartnerGalleryItem,
    fetchPartnerGalleryItems,
    fetchPartnerProfileById,
    updatePartnerGalleryItem,
} from "../services/partnersService";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";
const DANGER = "#A33A2B";

const CARD_BORDER =
  "rgba(15, 23, 42, 0.08)";

const AMBER_SOFT =
  "rgba(180, 83, 9, 0.10)";

const AMBER_BORDER =
  "rgba(180, 83, 9, 0.18)";

const DANGER_SOFT =
  "rgba(163, 58, 43, 0.09)";

const DANGER_BORDER =
  "rgba(163, 58, 43, 0.18)";

const SHADOW =
  "rgba(15, 23, 42, 0.10)";

const OVERLAY =
  "rgba(15, 23, 42, 0.48)";

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

export default function ManagePartnerGalleryItem({
  route,
  navigation,
}) {
  const partnerProfileId =
    route?.params?.partnerProfileId || null;

  const galleryItemId =
    route?.params?.galleryItemId || null;

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [
    deleteModalVisible,
    setDeleteModalVisible,
  ] = useState(false);

  const [partner, setPartner] =
    useState(null);

  const [galleryItem, setGalleryItem] =
    useState(null);

  const [caption, setCaption] =
    useState("");

  const [altText, setAltText] =
    useState("");

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

      if (!meId) {
        Alert.alert(
          "Sign in required",
          "You need to be signed in to manage this gallery."
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
        partnerResult.partner.owner_id ===
        meId;

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
            "ManagePartnerGalleryItem admin permission error:",
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
          "You do not have permission to manage this gallery."
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

      if (!galleryResult.ok) {
        throw galleryResult.error;
      }

      const selectedItem =
        galleryResult.items?.find(
          (item) =>
            item.id === galleryItemId
        ) || null;

      if (!selectedItem) {
        throw new Error(
          "Gallery image not found."
        );
      }

      setGalleryItem(selectedItem);
      setCaption(
        selectedItem.caption || ""
      );
      setAltText(
        selectedItem.alt_text || ""
      );
    } catch (error) {
      console.log(
        "ManagePartnerGalleryItem load error:",
        error
      );

      Alert.alert(
        "Gallery image",
        error?.message ||
          "We couldn't load this gallery image."
      );

      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [
    galleryItemId,
    navigation,
    partnerProfileId,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    try {
      if (saving || deleting) return;

      if (!galleryItemId) {
        return;
      }

      setSaving(true);

      const result =
        await updatePartnerGalleryItem({
          galleryItemId,
          caption:
            String(caption || "").trim(),
          altText:
            String(altText || "").trim(),
        });

      if (!result.ok) {
        throw result.error;
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
        "ManagePartnerGalleryItem save error:",
        error
      );

      Alert.alert(
        "Save gallery image",
        error?.message ||
          "We couldn't save these changes."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    try {
      if (
        deleting ||
        saving ||
        !galleryItemId
      ) {
        return;
      }

      setDeleting(true);

      const result =
        await deletePartnerGalleryItem(
          galleryItemId
        );

      if (!result.ok) {
        throw result.error;
      }

      setDeleteModalVisible(false);

      navigation.replace(
        "PartnerProfilePublic",
        {
          partnerProfileId,
          initialTab: "gallery",
        }
      );
    } catch (error) {
      console.log(
        "ManagePartnerGalleryItem delete error:",
        error
      );

      setDeleteModalVisible(false);

      Alert.alert(
        "Delete gallery image",
        error?.message ||
          "We couldn't delete this image."
      );
    } finally {
      setDeleting(false);
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
          Loading gallery image…
        </Text>
      </View>
    );
  }

  if (!galleryItem) {
    return null;
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
                  bottomPad + 124,
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
                  disabled={
                    saving || deleting
                  }
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
                      saving || deleting
                        ? 0.4
                        : 1,
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
                    Manage Gallery Image
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
                    Update the image text or
                    remove it from{" "}
                    {partner?.name ||
                      "this Partner Profile"}
                    .
                  </Text>
                </View>
              </View>

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
                    width: "100%",
                    minHeight: 240,
                    maxHeight: 520,
                    aspectRatio: 1,
                    borderRadius: 22,
                    overflow: "hidden",
                    backgroundColor:
                      "rgba(79,99,59,0.08)",
                    borderWidth: 1,
                    borderColor:
                      CARD_BORDER,
                  }}
                >
                  <Image
                    source={{
                      uri:
                        galleryItem.media_url,
                    }}
                    resizeMode="contain"
                    style={{
                      width: "100%",
                      height: "100%",
                    }}
                  />
                </View>

                <View
                  style={{
                    marginTop: 12,
                    borderRadius: 17,
                    backgroundColor:
                      AMBER_SOFT,
                    borderWidth: 1,
                    borderColor:
                      AMBER_BORDER,
                    padding: 11,
                    flexDirection: "row",
                    alignItems: "flex-start",
                  }}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color={EVENT_AMBER}
                    style={{
                      marginRight: 8,
                      marginTop: 1,
                    }}
                  />

                  <Text
                    style={{
                      flex: 1,
                      color: EVENT_BROWN,
                      fontSize: 12,
                      lineHeight: 18,
                      fontWeight: "800",
                    }}
                  >
                    Editing the text does not
                    crop or alter the original
                    photograph.
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
                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 23,
                    lineHeight: 28,
                    marginBottom: 14,
                  }}
                >
                  Image details
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 11.5,
                    fontWeight: "900",
                    textTransform:
                      "uppercase",
                    letterSpacing: 0.45,
                    marginBottom: 7,
                  }}
                >
                  Caption
                </Text>

                <TextInput
                  value={caption}
                  onChangeText={setCaption}
                  editable={
                    !saving && !deleting
                  }
                  placeholder="Tell people what this image shows"
                  placeholderTextColor={
                    MUTED
                  }
                  multiline
                  maxLength={300}
                  style={{
                    minHeight: 94,
                    textAlignVertical:
                      "top",
                    borderRadius: 18,
                    backgroundColor:
                      PREMIUM_CREAM,
                    borderWidth: 1,
                    borderColor:
                      CARD_BORDER,
                    paddingHorizontal: 13,
                    paddingVertical: 12,
                    color: TEXT,
                    fontSize: 14,
                    fontWeight: "800",
                    lineHeight: 20,
                  }}
                />

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 11,
                    fontWeight: "700",
                    textAlign: "right",
                    marginTop: 5,
                  }}
                >
                  {caption.length} / 300
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 11.5,
                    fontWeight: "900",
                    textTransform:
                      "uppercase",
                    letterSpacing: 0.45,
                    marginTop: 15,
                    marginBottom: 7,
                  }}
                >
                  Accessibility description
                </Text>

                <TextInput
                  value={altText}
                  onChangeText={setAltText}
                  editable={
                    !saving && !deleting
                  }
                  placeholder="Describe the image for people using accessibility tools"
                  placeholderTextColor={
                    MUTED
                  }
                  multiline
                  maxLength={300}
                  style={{
                    minHeight: 88,
                    textAlignVertical:
                      "top",
                    borderRadius: 18,
                    backgroundColor:
                      PREMIUM_CREAM,
                    borderWidth: 1,
                    borderColor:
                      CARD_BORDER,
                    paddingHorizontal: 13,
                    paddingVertical: 12,
                    color: TEXT,
                    fontSize: 14,
                    fontWeight: "800",
                    lineHeight: 20,
                  }}
                />
              </View>

              <View
                style={{
                  ...premiumCardStyle,
                  marginHorizontal: 16,
                  padding: 16,
                  marginBottom: 14,
                  borderColor:
                    DANGER_BORDER,
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
                      width: 46,
                      height: 46,
                      borderRadius: 23,
                      backgroundColor:
                        DANGER_SOFT,
                      borderWidth: 1,
                      borderColor:
                        DANGER_BORDER,
                      alignItems: "center",
                      justifyContent:
                        "center",
                      marginRight: 11,
                    }}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={21}
                      color={DANGER}
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
                        fontSize: 20,
                        lineHeight: 25,
                      }}
                    >
                      Remove image
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
                      Remove this image from
                      the public Partner
                      Gallery.
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() =>
                    setDeleteModalVisible(
                      true
                    )
                  }
                  disabled={
                    saving || deleting
                  }
                  style={({ pressed }) => ({
                    marginTop: 14,
                    minHeight: 46,
                    borderRadius: 999,
                    backgroundColor:
                      DANGER_SOFT,
                    borderWidth: 1,
                    borderColor:
                      DANGER_BORDER,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent:
                      "center",
                    opacity:
                      saving || deleting
                        ? 0.4
                        : 1,
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
                    name="trash-outline"
                    size={18}
                    color={DANGER}
                    style={{
                      marginRight: 7,
                    }}
                  />

                  <Text
                    style={{
                      color: DANGER,
                      fontSize: 13,
                      fontWeight: "900",
                    }}
                  >
                    Delete gallery image
                  </Text>
                </Pressable>
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
              <Pressable
                onPress={handleSave}
                disabled={
                  saving || deleting
                }
                style={({ pressed }) => ({
                  minHeight: 50,
                  borderRadius: 999,
                  backgroundColor:
                    EVENT_AMBER,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent:
                    "center",
                  opacity:
                    saving || deleting
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
                    name="checkmark-circle-outline"
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
                  {saving
                    ? "Saving changes…"
                    : "Save image details"}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>

          <Modal
            visible={deleteModalVisible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => {
              if (!deleting) {
                setDeleteModalVisible(
                  false
                );
              }
            }}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: OVERLAY,
                justifyContent: "flex-end",
              }}
            >
              <Pressable
                style={{
                  flex: 1,
                }}
                disabled={deleting}
                onPress={() =>
                  setDeleteModalVisible(
                    false
                  )
                }
              />

              <View
                style={{
                  backgroundColor:
                    PREMIUM_CREAM,
                  borderTopLeftRadius: 30,
                  borderTopRightRadius: 30,
                  paddingHorizontal: 18,
                  paddingTop: 20,
                  paddingBottom:
                    Math.max(
                      bottomPad + 18,
                      26
                    ),
                  borderWidth: 1,
                  borderColor:
                    CARD_BORDER,
                  shadowColor: SHADOW,
                  shadowOpacity: 0.18,
                  shadowRadius: 18,
                  shadowOffset: {
                    width: 0,
                    height: -5,
                  },
                  elevation: 16,
                }}
              >
                <View
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 27,
                    backgroundColor:
                      DANGER_SOFT,
                    borderWidth: 1,
                    borderColor:
                      DANGER_BORDER,
                    alignItems: "center",
                    justifyContent:
                      "center",
                    marginBottom: 13,
                  }}
                >
                  <Ionicons
                    name="trash-outline"
                    size={25}
                    color={DANGER}
                  />
                </View>

                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 25,
                    lineHeight: 30,
                  }}
                >
                  Delete this image?
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 14,
                    lineHeight: 21,
                    fontWeight: "700",
                    marginTop: 7,
                  }}
                >
                  This image and its caption
                  will be removed from the
                  Partner Gallery. This action
                  cannot be undone.
                </Text>

                <Pressable
                  onPress={
                    handleConfirmDelete
                  }
                  disabled={deleting}
                  style={({ pressed }) => ({
                    marginTop: 18,
                    minHeight: 50,
                    borderRadius: 999,
                    backgroundColor:
                      DANGER,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent:
                      "center",
                    opacity: deleting
                      ? 0.55
                      : 1,
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
                  {deleting ? (
                    <ActivityIndicator
                      size="small"
                      color={SURFACE}
                      style={{
                        marginRight: 8,
                      }}
                    />
                  ) : (
                    <Ionicons
                      name="trash-outline"
                      size={18}
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
                    {deleting
                      ? "Deleting image…"
                      : "Yes, delete image"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    setDeleteModalVisible(
                      false
                    )
                  }
                  disabled={deleting}
                  style={({ pressed }) => ({
                    marginTop: 10,
                    minHeight: 48,
                    borderRadius: 999,
                    backgroundColor:
                      SURFACE,
                    borderWidth: 1,
                    borderColor:
                      CARD_BORDER,
                    alignItems: "center",
                    justifyContent:
                      "center",
                    opacity: deleting
                      ? 0.4
                      : pressed
                        ? 0.76
                        : 1,
                    transform: [
                      {
                        translateY:
                          pressed ? 2 : 0,
                      },
                    ],
                  })}
                >
                  <Text
                    style={{
                      color: OLIVE,
                      fontSize: 13.5,
                      fontWeight: "900",
                    }}
                  >
                    Keep image
                  </Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        </>
      )}
    </Screen>
  );
}