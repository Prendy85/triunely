// src/features/partners/screens/ReorderPartnerGallery.js
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
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";

import Screen from "../../../components/Screen";
import { supabase } from "../../../lib/supabase";

import {
    fetchPartnerGalleryItems,
    fetchPartnerProfileById,
    reorderPartnerGalleryItems,
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

export default function ReorderPartnerGallery({
  route,
  navigation,
}) {
  const partnerProfileId =
    route?.params?.partnerProfileId || null;

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [partner, setPartner] =
    useState(null);

  const [items, setItems] =
    useState([]);

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
          "You need to be signed in to reorder this gallery."
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
          .select("id")
          .eq(
            "partner_profile_id",
            partnerProfileId
          )
          .eq("user_id", meId)
          .limit(1);

        if (adminError) {
          console.log(
            "ReorderPartnerGallery admin permission error:",
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
          "You do not have permission to reorder this gallery."
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
          includeArchived: false,
          limit: 100,
        });

      if (!galleryResult.ok) {
        throw galleryResult.error;
      }

      setItems(
        galleryResult.items || []
      );
    } catch (error) {
      console.log(
        "ReorderPartnerGallery load error:",
        error
      );

      Alert.alert(
        "Reorder gallery",
        error?.message ||
          "We couldn't load this gallery."
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

  function moveItem(
    currentIndex,
    direction
  ) {
    if (saving) return;

    const nextIndex =
      currentIndex + direction;

    if (
      nextIndex < 0 ||
      nextIndex >= items.length
    ) {
      return;
    }

    setItems((currentItems) => {
      const nextItems = [
        ...currentItems,
      ];

      const [movedItem] =
        nextItems.splice(
          currentIndex,
          1
        );

      nextItems.splice(
        nextIndex,
        0,
        movedItem
      );

      return nextItems;
    });
  }

  async function handleSaveOrder() {
    try {
      if (saving) return;

      if (
        !partnerProfileId ||
        items.length === 0
      ) {
        navigation.replace(
          "PartnerProfilePublic",
          {
            partnerProfileId,
            initialTab: "gallery",
          }
        );

        return;
      }

      setSaving(true);

      const result =
        await reorderPartnerGalleryItems({
          partnerProfileId,
          orderedItemIds:
            items.map(
              (item) => item.id
            ),
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
        "ReorderPartnerGallery save error:",
        error
      );

      Alert.alert(
        "Save gallery order",
        error?.message ||
          "We couldn't save the new gallery order."
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
          Loading gallery order…
        </Text>
      </View>
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
            style={{
              flex: 1,
            }}
            contentContainerStyle={{
              paddingBottom:
                bottomPad + 116,
            }}
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
                  opacity: saving
                    ? 0.4
                    : pressed
                      ? 0.76
                      : 1,
                })}
              >
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={OLIVE}
                />
              </Pressable>

              <Text
                style={{
                  ...serifHeading,
                  fontSize: 34,
                  lineHeight: 40,
                  marginTop: 16,
                }}
              >
                Reorder Gallery
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
                Choose which images appear
                first on{" "}
                {partner?.name ||
                  "this Partner Profile"}
                .
              </Text>
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
                      AMBER_SOFT,
                    borderWidth: 1,
                    borderColor:
                      AMBER_BORDER,
                    alignItems: "center",
                    justifyContent:
                      "center",
                    marginRight: 10,
                  }}
                >
                  <Ionicons
                    name="swap-vertical-outline"
                    size={22}
                    color={EVENT_AMBER}
                  />
                </View>

                <Text
                  style={{
                    flex: 1,
                    color: MUTED,
                    fontSize: 12.5,
                    fontWeight: "800",
                    lineHeight: 19,
                  }}
                >
                  Use the arrows to move each
                  image. The first image will
                  appear first in the public
                  gallery.
                </Text>
              </View>
            </View>

            {items.length === 0 ? (
              <View
                style={{
                  ...premiumCardStyle,
                  marginHorizontal: 16,
                  padding: 24,
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name="images-outline"
                  size={30}
                  color={OLIVE}
                />

                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 20,
                    marginTop: 10,
                  }}
                >
                  No images to reorder
                </Text>
              </View>
            ) : (
              items.map(
                (item, index) => (
                  <View
                    key={item.id}
                    style={{
                      ...premiumCardStyle,
                      marginHorizontal: 16,
                      padding: 11,
                      marginBottom: 10,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 78,
                        height: 78,
                        borderRadius: 17,
                        overflow: "hidden",
                        backgroundColor:
                          OLIVE_SOFT,
                        borderWidth: 1,
                        borderColor:
                          CARD_BORDER,
                      }}
                    >
                      <Image
                        source={{
                          uri:
                            item.thumbnail_url ||
                            item.media_url,
                        }}
                        resizeMode="cover"
                        style={{
                          width: "100%",
                          height: "100%",
                        }}
                      />
                    </View>

                    <View
                      style={{
                        flex: 1,
                        minWidth: 0,
                        paddingHorizontal: 11,
                      }}
                    >
                      <Text
                        style={{
                          color: EVENT_BROWN,
                          fontSize: 11,
                          fontWeight: "900",
                          textTransform:
                            "uppercase",
                          letterSpacing: 0.4,
                        }}
                      >
                        Position {index + 1}
                      </Text>

                      <Text
                        numberOfLines={2}
                        style={{
                          color: TEXT,
                          fontSize: 13,
                          lineHeight: 18,
                          fontWeight: "900",
                          marginTop: 4,
                        }}
                      >
                        {item.caption ||
                          `Gallery image ${
                            index + 1
                          }`}
                      </Text>
                    </View>

                    <View
                      style={{
                        gap: 7,
                      }}
                    >
                      <Pressable
                        onPress={() =>
                          moveItem(index, -1)
                        }
                        disabled={
                          saving ||
                          index === 0
                        }
                        style={({ pressed }) => ({
                          width: 40,
                          height: 36,
                          borderRadius: 14,
                          backgroundColor:
                            SURFACE,
                          borderWidth: 1,
                          borderColor:
                            CARD_BORDER,
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          opacity:
                            index === 0 ||
                            saving
                              ? 0.3
                              : pressed
                                ? 0.68
                                : 1,
                        })}
                      >
                        <Ionicons
                          name="chevron-up"
                          size={20}
                          color={OLIVE}
                        />
                      </Pressable>

                      <Pressable
                        onPress={() =>
                          moveItem(index, 1)
                        }
                        disabled={
                          saving ||
                          index ===
                            items.length - 1
                        }
                        style={({ pressed }) => ({
                          width: 40,
                          height: 36,
                          borderRadius: 14,
                          backgroundColor:
                            SURFACE,
                          borderWidth: 1,
                          borderColor:
                            CARD_BORDER,
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          opacity:
                            index ===
                              items.length - 1 ||
                            saving
                              ? 0.3
                              : pressed
                                ? 0.68
                                : 1,
                        })}
                      >
                        <Ionicons
                          name="chevron-down"
                          size={20}
                          color={OLIVE}
                        />
                      </Pressable>
                    </View>
                  </View>
                )
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
              onPress={handleSaveOrder}
              disabled={saving}
              style={({ pressed }) => ({
                minHeight: 50,
                borderRadius: 999,
                backgroundColor:
                  EVENT_AMBER,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                opacity: saving
                  ? 0.5
                  : 1,
                transform: [
                  {
                    translateY:
                      pressed ? 2 : 0,
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
                  ? "Saving gallery order…"
                  : "Save gallery order"}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </Screen>
  );
}