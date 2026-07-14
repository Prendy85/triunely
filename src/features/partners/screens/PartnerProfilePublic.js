// src/features/partners/screens/PartnerProfilePublic.js
import { Ionicons } from "@expo/vector-icons";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    Share,
    Text,
    View,
} from "react-native";

import Screen from "../../../components/Screen";
import { getOrCreateDirectConversation } from "../../../lib/messages";
import { supabase } from "../../../lib/supabase";

import PartnerAboutTab from "../components/PartnerAboutTab";
import PartnerGalleryCard from "../components/PartnerGalleryCard";
import PartnerGalleryViewer from "../components/PartnerGalleryViewer";
import PartnerGrowthTab from "../components/PartnerGrowthTab";
import PartnerHeroCard from "../components/PartnerHeroCard";
import PartnerPostMenuModal from "../components/PartnerPostMenuModal";
import PartnerPostsTab from "../components/PartnerPostsTab";
import PartnerSocialLinksCard from "../components/PartnerSocialLinksCard";
import PartnerTabs from "../components/PartnerTabs";

import {
    connectToPartnerProfile,
    disconnectFromPartnerProfile,
    fetchPartnerGalleryItems,
    fetchPartnerPosts,
    fetchPartnerProfileById,
    fetchPartnerProfileConnectionState,
    getPartnerTypeIcon,
    getPartnerTypeLabel,
} from "../services/partnersService";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";

const CARD_BORDER =
  "rgba(15, 23, 42, 0.08)";
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

function cleanUrl(url) {
  const value = String(url || "").trim();

  if (!value) return "";

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  return `https://${value}`;
}

export default function PartnerProfilePublic({
  route,
  navigation,
}) {
  const partnerProfileId =
    route?.params?.partnerProfileId;

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState(null);

  const [
    canManagePartner,
    setCanManagePartner,
  ] = useState(false);

  const [partner, setPartner] =
    useState(null);

  const [posts, setPosts] =
    useState([]);

  const [
    galleryItems,
    setGalleryItems,
  ] = useState([]);

  const [activeTab, setActiveTab] =
    useState(
      route?.params?.initialTab ===
        "gallery"
        ? "gallery"
        : "posts"
    );

  const [
    galleryViewerVisible,
    setGalleryViewerVisible,
  ] = useState(false);

  const [
    galleryViewerIndex,
    setGalleryViewerIndex,
  ] = useState(0);

  const [
    postMenuVisible,
    setPostMenuVisible,
  ] = useState(false);

  const [
    selectedPostForMenu,
    setSelectedPostForMenu,
  ] = useState(null);

  const [
    isConnected,
    setIsConnected,
  ] = useState(false);

  const [
    connectionCount,
    setConnectionCount,
  ] = useState(0);

  const [
    connectionLoading,
    setConnectionLoading,
  ] = useState(false);

  const [
    disconnectModalVisible,
    setDisconnectModalVisible,
  ] = useState(false);

  const typeLabel = useMemo(
    () =>
      getPartnerTypeLabel(
        partner?.partner_type
      ),
    [partner?.partner_type]
  );

  const typeIcon = useMemo(
    () =>
      getPartnerTypeIcon(
        partner?.partner_type
      ),
    [partner?.partner_type]
  );

  const isOwner = canManagePartner;

  const socialLinks = useMemo(() => {
    const raw =
      partner?.social_links &&
      typeof partner.social_links ===
        "object" &&
      !Array.isArray(
        partner.social_links
      )
        ? partner.social_links
        : {};

    const custom =
      raw.custom &&
      typeof raw.custom ===
        "object" &&
      !Array.isArray(raw.custom)
        ? raw.custom
        : {};

    return [
      {
        key: "instagram",
        label: "Instagram",
        icon: "logo-instagram",
        url: raw.instagram,
        amber: true,
      },
      {
        key: "facebook",
        label: "Facebook",
        icon: "logo-facebook",
        url: raw.facebook,
      },
      {
        key: "youtube",
        label: "YouTube",
        icon: "logo-youtube",
        url: raw.youtube,
        amber: true,
      },
      {
        key: "tiktok",
        label: "TikTok",
        icon: "logo-tiktok",
        url: raw.tiktok,
      },
      {
        key: "linkedin",
        label: "LinkedIn",
        icon: "logo-linkedin",
        url: raw.linkedin,
      },
      {
        key: "x",
        label: "X",
        icon: "at-outline",
        url: raw.x,
      },
      {
        key: "spotify",
        label: "Spotify",
        icon: "musical-notes-outline",
        url: raw.spotify,
        amber: true,
      },
      {
        key: "apple_podcasts",
        label: "Apple Podcasts",
        icon: "mic-outline",
        url: raw.apple_podcasts,
      },
      {
        key: "substack",
        label: "Substack",
        icon: "newspaper-outline",
        url: raw.substack,
      },
      {
        key: "custom",
        label: custom.label || "More",
        icon: "link-outline",
        url: custom.url,
        amber: true,
      },
    ].filter((item) =>
      String(item.url || "").trim()
    );
  }, [partner?.social_links]);

  const loadPartner = useCallback(
    async ({
      showSpinner = true,
    } = {}) => {
      try {
        if (showSpinner) {
          setLoading(true);
        }

        const { data: sessionData } =
          await supabase.auth.getSession();

        const meId =
          sessionData?.session?.user?.id ||
          null;

        setCurrentUserId(meId);
        setCanManagePartner(false);

        const profileResult =
          await fetchPartnerProfileById(
            partnerProfileId
          );

        if (
          !profileResult.ok ||
          !profileResult.partner
        ) {
          console.log(
            "PartnerProfilePublic load partner error:",
            profileResult.error
          );

          setPartner(null);
          setPosts([]);
          setGalleryItems([]);
          setCanManagePartner(false);
          return;
        }

        setPartner(
          profileResult.partner
        );

        const ownsPartner =
          Boolean(
            meId &&
              profileResult.partner
                ?.owner_id === meId
          );

        let isPartnerAdmin = false;

        if (meId && !ownsPartner) {
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
              "PartnerProfilePublic admin permission error:",
              adminError
            );
          } else {
            isPartnerAdmin =
              Array.isArray(adminData) &&
              adminData.length > 0;
          }
        }

        setCanManagePartner(
          ownsPartner ||
            isPartnerAdmin
        );

        const [
          postsResult,
          galleryResult,
          connectionResult,
        ] = await Promise.all([
          fetchPartnerPosts({
            partnerProfileId,
            limit: 30,
          }),
          fetchPartnerGalleryItems({
            partnerProfileId,
            includeArchived: false,
            limit: 100,
          }),
          fetchPartnerProfileConnectionState({
            partnerProfileId,
            currentUserId: meId,
          }),
        ]);

        if (connectionResult.ok) {
          setIsConnected(
            Boolean(
              connectionResult.state
                ?.isConnected
            )
          );

          setConnectionCount(
            Number(
              connectionResult.state
                ?.connectionCount
            ) || 0
          );
        } else {
          console.log(
            "PartnerProfilePublic connection state error:",
            connectionResult.error
          );

          setIsConnected(false);
          setConnectionCount(0);
        }

        if (postsResult.ok) {
          setPosts(
            postsResult.posts || []
          );
        } else {
          console.log(
            "PartnerProfilePublic load posts error:",
            postsResult.error
          );

          setPosts([]);
        }

        if (galleryResult.ok) {
          setGalleryItems(
            galleryResult.items || []
          );
        } else {
          console.log(
            "PartnerProfilePublic load gallery error:",
            galleryResult.error
          );

          setGalleryItems([]);
        }
      } catch (error) {
        console.log(
          "PartnerProfilePublic load exception:",
          error
        );

        setPartner(null);
        setPosts([]);
        setGalleryItems([]);
        setCanManagePartner(false);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [partnerProfileId]
  );

  useEffect(() => {
    loadPartner();
  }, [loadPartner]);

  async function handleRefresh() {
    setRefreshing(true);

    await loadPartner({
      showSpinner: false,
    });
  }

  async function handleConnectionPress() {
    if (
      connectionLoading ||
      !partner?.id
    ) {
      return;
    }

    if (!currentUserId) {
      Alert.alert(
        "Sign in required",
        "You need to be signed in to connect with a Partner Profile."
      );

      return;
    }

    if (isOwner) {
      return;
    }

    if (isConnected) {
      setDisconnectModalVisible(true);
      return;
    }

    try {
      setConnectionLoading(true);

      const result =
        await connectToPartnerProfile({
          partnerProfileId:
            partner.id,
          userId: currentUserId,
        });

      if (!result.ok) {
        throw result.error;
      }

      setIsConnected(true);

      if (!result.alreadyConnected) {
        setConnectionCount(
          (current) =>
            current + 1
        );
      }
    } catch (error) {
      console.log(
        "PartnerProfilePublic connect error:",
        error
      );

      Alert.alert(
        "Connect",
        error?.message ||
          "We couldn't connect you with this Partner Profile."
      );
    } finally {
      setConnectionLoading(false);
    }
  }

  async function handleConfirmDisconnect() {
    if (
      connectionLoading ||
      !partner?.id ||
      !currentUserId
    ) {
      return;
    }

    try {
      setConnectionLoading(true);

      const result =
        await disconnectFromPartnerProfile({
          partnerProfileId:
            partner.id,
          userId: currentUserId,
        });

      if (!result.ok) {
        throw result.error;
      }

      setIsConnected(false);

      setConnectionCount(
        (current) =>
          Math.max(
            current - 1,
            0
          )
      );

      setDisconnectModalVisible(
        false
      );
    } catch (error) {
      console.log(
        "PartnerProfilePublic disconnect error:",
        error
      );

      Alert.alert(
        "Disconnect",
        error?.message ||
          "We couldn't disconnect you from this Partner Profile."
      );
    } finally {
      setConnectionLoading(false);
    }
  }

  async function handleOpenExternalLink(
    url,
    label = "Link"
  ) {
    try {
      const cleanedUrl =
        cleanUrl(url);

      if (!cleanedUrl) {
        Alert.alert(
          label,
          "This link has not been added correctly."
        );

        return;
      }

      console.log(
        "PartnerProfilePublic opening external link:",
        {
          label,
          cleanedUrl,
        }
      );

      await Linking.openURL(
        cleanedUrl
      );
    } catch (error) {
      console.log(
        "PartnerProfilePublic external link error:",
        {
          label,
          url,
          error,
        }
      );

      Alert.alert(
        label,
        "We couldn't open this link. Please check that the address is correct."
      );
    }
  }

  async function handleWebsitePress() {
    try {
      const url = cleanUrl(
        partner?.website_url
      );

      if (!url) {
        Alert.alert(
          "No website",
          "This partner has not added a website yet."
        );

        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      console.log(
        "PartnerProfilePublic website error:",
        error
      );

      Alert.alert(
        "Website",
        "We couldn't open this website right now."
      );
    }
  }

  async function handleContactEmailPress() {
    try {
      const email = String(
        partner?.contact_email || ""
      ).trim();

      if (!email) {
        Alert.alert(
          "No email",
          "This partner has not added a contact email yet."
        );

        return;
      }

      await Linking.openURL(
        `mailto:${email}`
      );
    } catch (error) {
      console.log(
        "PartnerProfilePublic email error:",
        error
      );

      Alert.alert(
        "Email",
        "We couldn't open email right now."
      );
    }
  }

  async function handleMessageOwner() {
    try {
      if (!partner?.owner_id) return;

      const conversationId =
        await getOrCreateDirectConversation(
          partner.owner_id
        );

      navigation.navigate("Chat", {
        conversationId,
        type: "dm",
        title:
          partner?.name ||
          "Partner",
        avatarUrl:
          partner?.logo_url || null,
        otherUserId:
          partner.owner_id,
        handle: null,
      });
    } catch (error) {
      console.log(
        "PartnerProfilePublic message error:",
        error
      );

      Alert.alert(
        "Message",
        "We couldn't start a message right now."
      );
    }
  }

  async function handleSharePartner() {
    try {
      const message = [
        partner?.name,
        partner?.short_description,
        partner?.website_url,
      ]
        .filter(Boolean)
        .join("\n\n");

      if (!message) return;

      await Share.share({
        message,
      });
    } catch (error) {
      console.log(
        "PartnerProfilePublic share error:",
        error
      );
    }
  }

  function handleEditPartner() {
    if (!partner?.id) return;

    navigation.navigate(
      "CreatePartnerProfile",
      {
        partnerProfileId:
          partner.id,
        mode: "edit",
      }
    );
  }

  function handleCreatePost() {
    if (!partner?.id) return;

    navigation.navigate(
      "CreatePartnerPost",
      {
        partnerProfileId:
          partner.id,
      }
    );
  }

  function handleChoosePostToBoost() {
    if (!partner?.id) return;

    navigation.navigate(
      "CreatePromotionCampaign",
      {
        partnerProfileId:
          partner.id,
        campaignType:
          "boost_post",
      }
    );
  }

  function handleBoostProfile() {
    if (!partner?.id) return;

    navigation.navigate(
      "CreatePromotionCampaign",
      {
        partnerProfileId:
          partner.id,
        campaignType:
          "promote_profile",
      }
    );
  }

  function handleBoostPost(post) {
    if (
      !partner?.id ||
      !post?.id
    ) {
      return;
    }

    navigation.navigate(
      "CreatePromotionCampaign",
      {
        partnerProfileId:
          partner.id,
        partnerPostId:
          post.id,
        campaignType:
          "boost_post",
      }
    );
  }

  function openPostMenu(post) {
    if (!post?.id) return;

    setSelectedPostForMenu(post);
    setPostMenuVisible(true);
  }

  function closePostMenu() {
    setPostMenuVisible(false);
    setSelectedPostForMenu(null);
  }

  function handleEditPostFromMenu() {
    const post =
      selectedPostForMenu;

    closePostMenu();

    if (
      !partner?.id ||
      !post?.id
    ) {
      return;
    }

    navigation.navigate(
      "CreatePartnerPost",
      {
        partnerProfileId:
          partner.id,
        partnerPostId:
          post.id,
        mode: "edit",
      }
    );
  }

  function handleBoostPostFromMenu() {
    const post =
      selectedPostForMenu;

    closePostMenu();

    if (
      !partner?.id ||
      !post?.id
    ) {
      return;
    }

    navigation.navigate(
      "CreatePromotionCampaign",
      {
        partnerProfileId:
          partner.id,
        partnerPostId:
          post.id,
        campaignType:
          "boost_post",
      }
    );
  }

  function handleOpenGalleryItem(
    _item,
    index
  ) {
    setGalleryViewerIndex(
      Number(index) || 0
    );

    setGalleryViewerVisible(true);
  }

  function handleCloseGalleryViewer() {
    setGalleryViewerVisible(false);
  }

  function handleAddGalleryMedia() {
    if (!partner?.id || !isOwner) {
      return;
    }

    navigation.navigate(
      "AddPartnerGalleryMedia",
      {
        partnerProfileId:
          partner.id,
      }
    );
  }

    function handleReorderGallery() {
    if (!partner?.id || !isOwner) {
      return;
    }

    navigation.navigate(
      "ReorderPartnerGallery",
      {
        partnerProfileId:
          partner.id,
      }
    );
  }

  function handleManageGalleryItem(
    item
  ) {
    if (
      !partner?.id ||
      !item?.id ||
      !isOwner
    ) {
      return;
    }

    navigation.navigate(
      "ManagePartnerGalleryItem",
      {
        partnerProfileId:
          partner.id,
        galleryItemId:
          item.id,
      }
    );
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
          Loading partner profile…
        </Text>
      </View>
    );
  }

  if (!partner) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor:
            PREMIUM_CREAM,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <View
          style={{
            ...premiumCardStyle,
            padding: 22,
            width: "100%",
            maxWidth: 360,
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor:
                OLIVE_SOFT,
              borderWidth: 1,
              borderColor:
                OLIVE_BORDER,
              alignItems: "center",
              justifyContent:
                "center",
              marginBottom: 12,
            }}
          >
            <Ionicons
              name="briefcase-outline"
              size={25}
              color={OLIVE}
            />
          </View>

          <Text
            style={{
              ...serifHeading,
              fontSize: 22,
              lineHeight: 27,
              textAlign: "center",
            }}
          >
            Partner unavailable
          </Text>

          <Text
            style={{
              color: MUTED,
              textAlign: "center",
              fontWeight: "700",
              lineHeight: 20,
              marginTop: 8,
            }}
          >
            We couldn't load this
            Partner Profile.
          </Text>

          <Pressable
            onPress={() =>
              navigation.goBack()
            }
            style={({ pressed }) => ({
              marginTop: 16,
              borderRadius: 999,
              paddingHorizontal: 16,
              paddingVertical: 11,
              backgroundColor:
                EVENT_AMBER,
              shadowColor:
                EVENT_AMBER,
              shadowOpacity: pressed
                ? 0.05
                : 0.18,
              shadowRadius: pressed
                ? 2
                : 6,
              shadowOffset: {
                width: 0,
                height: pressed
                  ? 1
                  : 3,
              },
              elevation: pressed
                ? 1
                : 3,
              transform: [
                {
                  translateY: pressed
                    ? 2
                    : 0,
                },
                {
                  scale: pressed
                    ? 0.98
                    : 1,
                },
              ],
            })}
          >
            <Text
              style={{
                color: SURFACE,
                fontSize: 13,
                fontWeight: "900",
              }}
            >
              Go back
            </Text>
          </Pressable>
        </View>
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
                bottomPad + 24,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={
                  handleRefresh
                }
                tintColor={
                  EVENT_AMBER
                }
              />
            }
            showsVerticalScrollIndicator={
              false
            }
          >
            <View
              style={{
                paddingHorizontal: 18,
                paddingTop: 12,
                paddingBottom: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent:
                  "space-between",
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
                  shadowOpacity: pressed
                    ? 0.03
                    : 0.08,
                  shadowRadius: pressed
                    ? 2
                    : 7,
                  shadowOffset: {
                    width: 0,
                    height: pressed
                      ? 1
                      : 3,
                  },
                  elevation: pressed
                    ? 1
                    : 2,
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
                  flexDirection: "row",
                  gap: 8,
                }}
              >
                {isOwner ? (
                  <Pressable
                    onPress={
                      handleEditPartner
                    }
                    style={({ pressed }) => ({
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      justifyContent:
                        "center",
                      alignItems:
                        "center",
                      backgroundColor:
                        SURFACE,
                      borderWidth: 1,
                      borderColor:
                        CARD_BORDER,
                      shadowColor:
                        SHADOW,
                      shadowOpacity:
                        pressed
                          ? 0.02
                          : 0.07,
                      shadowRadius:
                        pressed
                          ? 2
                          : 6,
                      shadowOffset: {
                        width: 0,
                        height:
                          pressed
                            ? 1
                            : 3,
                      },
                      elevation:
                        pressed
                          ? 1
                          : 2,
                      transform: [
                        {
                          translateY:
                            pressed
                              ? 2
                              : 0,
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
                      name="pencil-outline"
                      size={19}
                      color={OLIVE}
                    />
                  </Pressable>
                ) : null}

                <Pressable
                  onPress={
                    handleSharePartner
                  }
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
                        ? 0.02
                        : 0.07,
                    shadowRadius:
                      pressed
                        ? 2
                        : 6,
                    shadowOffset: {
                      width: 0,
                      height:
                        pressed
                          ? 1
                          : 3,
                    },
                    elevation:
                      pressed
                        ? 1
                        : 2,
                    transform: [
                      {
                        translateY:
                          pressed
                            ? 2
                            : 0,
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
                    name="share-outline"
                    size={19}
                    color={OLIVE}
                  />
                </Pressable>
              </View>
            </View>

            <PartnerHeroCard
              partner={partner}
              typeIcon={typeIcon}
              typeLabel={typeLabel}
              isOwner={isOwner}
              isConnected={isConnected}
              connectionCount={
                connectionCount
              }
              connectionLoading={
                connectionLoading
              }
              onConnectionPress={
                handleConnectionPress
              }
              onMessagePress={
                handleMessageOwner
              }
              onWebsitePress={
                handleWebsitePress
              }
              onEmailPress={
                handleContactEmailPress
              }
            />

            <PartnerSocialLinksCard
              socialLinks={socialLinks}
              onOpenLink={
                handleOpenExternalLink
              }
            />

            <PartnerTabs
              activeTab={activeTab}
              onChange={setActiveTab}
            />

            {activeTab === "posts" ? (
              <PartnerPostsTab
                posts={posts}
                isOwner={isOwner}
                onCreatePost={
                  handleCreatePost
                }
                onPromoteProfile={
                  handleBoostProfile
                }
                onBoostPost={
                  handleBoostPost
                }
                onOpenPostMenu={
                  openPostMenu
                }
              />
            ) : activeTab ===
              "gallery" ? (
              <PartnerGalleryCard
                items={galleryItems}
                isOwner={isOwner}
                onOpenItem={
                  handleOpenGalleryItem
                }
                onAddMedia={
                  handleAddGalleryMedia
                }
                onManageItem={
                  handleManageGalleryItem
                }
                onReorder={
                  handleReorderGallery
                }
              />
            ) : activeTab ===
              "about" ? (
              <PartnerAboutTab
                partner={partner}
                typeIcon={typeIcon}
                typeLabel={typeLabel}
              />
            ) : (
              <PartnerGrowthTab
                isOwner={isOwner}
                onChoosePostToBoost={
                  handleChoosePostToBoost
                }
                onPromoteProfile={
                  handleBoostProfile
                }
              />
            )}
          </ScrollView>

          <PartnerPostMenuModal
            visible={postMenuVisible}
            selectedPost={
              selectedPostForMenu
            }
            bottomPad={bottomPad}
            onClose={closePostMenu}
            onEditPost={
              handleEditPostFromMenu
            }
            onBoostPost={
              handleBoostPostFromMenu
            }
          />

          <Modal
            visible={
              disconnectModalVisible
            }
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => {
              if (!connectionLoading) {
                setDisconnectModalVisible(
                  false
                );
              }
            }}
          >
            <Pressable
              onPress={() => {
                if (!connectionLoading) {
                  setDisconnectModalVisible(
                    false
                  );
                }
              }}
              style={{
                flex: 1,
                backgroundColor:
                  "rgba(15, 23, 42, 0.56)",
                justifyContent:
                  "flex-end",
              }}
            >
              <Pressable
                onPress={() => {}}
                style={{
                  marginHorizontal: 12,
                  marginBottom:
                    bottomPad + 12,
                  backgroundColor:
                    PREMIUM_CREAM,
                  borderRadius: 28,
                  borderWidth: 1,
                  borderColor:
                    CARD_BORDER,
                  padding: 18,
                  shadowColor:
                    "#000000",
                  shadowOpacity: 0.22,
                  shadowRadius: 18,
                  shadowOffset: {
                    width: 0,
                    height: 8,
                  },
                  elevation: 12,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor:
                      OLIVE_SOFT,
                    borderWidth: 1,
                    borderColor:
                      OLIVE_BORDER,
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                  }}
                >
                  <Ionicons
                    name="people-outline"
                    size={23}
                    color={OLIVE}
                  />
                </View>

                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 22,
                    lineHeight: 27,
                    marginTop: 14,
                  }}
                >
                  Disconnect from{" "}
                  {partner?.name ||
                    "this Partner"}?
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 13.5,
                    lineHeight: 20,
                    fontWeight: "700",
                    marginTop: 8,
                  }}
                >
                  You will no longer be
                  connected to this Partner
                  Profile. You can reconnect
                  again at any time.
                </Text>

                <View
                  style={{
                    marginTop: 18,
                    flexDirection: "row",
                    gap: 9,
                  }}
                >
                  <Pressable
                    onPress={() =>
                      setDisconnectModalVisible(
                        false
                      )
                    }
                    disabled={
                      connectionLoading
                    }
                    style={({ pressed }) => ({
                      flex: 1,
                      minHeight: 48,
                      borderRadius: 18,
                      backgroundColor:
                        SURFACE,
                      borderWidth: 1,
                      borderColor:
                        OLIVE_BORDER,
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      opacity:
                        connectionLoading
                          ? 0.5
                          : pressed
                            ? 0.8
                            : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: OLIVE,
                        fontSize: 14,
                        fontWeight: "900",
                      }}
                    >
                      Stay connected
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={
                      handleConfirmDisconnect
                    }
                    disabled={
                      connectionLoading
                    }
                    style={({ pressed }) => ({
                      flex: 1,
                      minHeight: 48,
                      borderRadius: 18,
                      backgroundColor:
                        EVENT_AMBER,
                      borderWidth: 1,
                      borderColor:
                        EVENT_AMBER,
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      flexDirection:
                        "row",
                      opacity:
                        connectionLoading
                          ? 0.66
                          : pressed
                            ? 0.84
                            : 1,
                      transform: [
                        {
                          translateY:
                            pressed
                              ? 2
                              : 0,
                        },
                      ],
                    })}
                  >
                    {connectionLoading ? (
                      <ActivityIndicator
                        size="small"
                        color={SURFACE}
                      />
                    ) : (
                      <>
                        <Ionicons
                          name="person-remove-outline"
                          size={18}
                          color={SURFACE}
                          style={{
                            marginRight: 7,
                          }}
                        />

                        <Text
                          style={{
                            color: SURFACE,
                            fontSize: 14,
                            fontWeight:
                              "900",
                          }}
                        >
                          Disconnect
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </Modal>

      <PartnerGalleryViewer
        visible={
          galleryViewerVisible
        }
        items={galleryItems}
        initialIndex={
          galleryViewerIndex
        }
        currentUserId={
          currentUserId
        }
        canManage={
          canManagePartner
        }
        onClose={
          handleCloseGalleryViewer
        }
      />
        </>
      )}
    </Screen>
  );
}