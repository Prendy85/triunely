// src/features/partners/screens/MyPartnerProfiles.js
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
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

import Screen from "../../../components/Screen";
import VerifiedBadge from "../../../components/VerifiedBadge";
import useUserCommercialAccountScope from "../../../hooks/useUserCommercialAccountScope";
import { supabase } from "../../../lib/supabase";
import {
    fetchMyPartnerProfiles,
    getPartnerTypeIcon,
    getPartnerTypeLabel,
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

const displayFont = Platform.OS === "ios" ? "Georgia" : "serif";

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
  shadowOffset: { width: 0, height: 5 },
  elevation: 3,
};

function safeInitials(name) {
  if (!name) return "?";

  const parts = String(name).trim().split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return String(name).trim()[0]?.toUpperCase() || "?";
}

function StatusPill({ status }) {
  const cleanStatus = status || "draft";

  const label = cleanStatus
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

  const isPublished = cleanStatus === "published";

  return (
    <View
      style={{
        borderRadius: 999,
        backgroundColor: isPublished ? AMBER_SOFT : OLIVE_SOFT,
        borderWidth: 1,
        borderColor: isPublished ? AMBER_BORDER : OLIVE_BORDER,
        paddingHorizontal: 9,
        paddingVertical: 5,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <Ionicons
        name={isPublished ? "checkmark-circle-outline" : "time-outline"}
        size={13}
        color={isPublished ? EVENT_BROWN : OLIVE}
        style={{ marginRight: 5 }}
      />

      <Text
        style={{
          color: isPublished ? EVENT_BROWN : OLIVE,
          fontSize: 11,
          fontWeight: "900",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function PartnerManageCard({
  partner,
  onOpen,
  onEdit,
  onPost,
  onPromote,
}) {
  const name = partner?.name || "Partner";
  const logoUrl = partner?.logo_url || null;
  const coverUrl = partner?.cover_image_url || null;
  const typeLabel = getPartnerTypeLabel(partner?.partner_type);
  const typeIcon = getPartnerTypeIcon(partner?.partner_type);

  return (
    <View
      style={{
        ...premiumCardStyle,
        overflow: "hidden",
        marginBottom: 14,
      }}
    >
      <Pressable onPress={onOpen}>
        <View
          style={{
            height: 84,
            backgroundColor: OLIVE_SOFT,
            overflow: "hidden",
          }}
        >
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                flex: 1,
                backgroundColor: OLIVE_SOFT,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name={typeIcon} size={26} color={OLIVE} />
            </View>
          )}

          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.08)",
            }}
          />
        </View>

        <View style={{ padding: 14, paddingTop: 0 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              marginTop: -28,
            }}
          >
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 19,
                backgroundColor: OLIVE,
                borderWidth: 3,
                borderColor: SURFACE,
                overflow: "hidden",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {logoUrl ? (
                <Image
                  source={{ uri: logoUrl }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <Text
                  style={{
                    color: SURFACE,
                    fontSize: 18,
                    fontWeight: "900",
                  }}
                >
                  {safeInitials(name)}
                </Text>
              )}
            </View>

            <View style={{ marginLeft: "auto", marginBottom: 5 }}>
              <StatusPill status={partner?.status} />
            </View>
          </View>

          <View style={{ marginTop: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  ...serifHeading,
                  fontSize: 21,
                  lineHeight: 26,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {name}
              </Text>

             {partner?.badge_active === true ? (
                <View style={{ marginLeft: 7 }}>
                  <VerifiedBadge size={15} />
                </View>
              ) : null}
            </View>

            <View
              style={{
                marginTop: 7,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  borderRadius: 999,
                  backgroundColor: OLIVE_SOFT,
                  borderWidth: 1,
                  borderColor: OLIVE_BORDER,
                  paddingHorizontal: 9,
                  paddingVertical: 5,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name={typeIcon}
                  size={13}
                  color={OLIVE}
                  style={{ marginRight: 5 }}
                />

                <Text
                  style={{
                    color: OLIVE,
                    fontSize: 11.5,
                    fontWeight: "900",
                  }}
                  numberOfLines={1}
                >
                  {typeLabel}
                </Text>
              </View>

              {partner?.location_text ? (
                <Text
                  style={{
                    color: MUTED,
                    fontSize: 12,
                    fontWeight: "800",
                    marginLeft: 8,
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {partner.location_text}
                </Text>
              ) : null}
            </View>

            {partner?.short_description ? (
              <Text
                style={{
                  color: TEXT,
                  fontSize: 13.5,
                  fontWeight: "700",
                  lineHeight: 19,
                  marginTop: 9,
                }}
                numberOfLines={2}
              >
                {partner.short_description}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: CARD_BORDER,
          padding: 10,
          flexDirection: "row",
          gap: 8,
        }}
      >
        <Pressable
          onPress={onEdit}
          style={({ pressed }) => ({
            opacity: pressed ? 0.82 : 1,
            flex: 1,
            borderRadius: 15,
            backgroundColor: OLIVE_SOFT,
            borderWidth: 1,
            borderColor: OLIVE_BORDER,
            paddingVertical: 10,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
          })}
        >
          <Ionicons
            name="pencil-outline"
            size={15}
            color={OLIVE}
            style={{ marginRight: 5 }}
          />

          <Text
            style={{
              color: OLIVE,
              fontSize: 12,
              fontWeight: "900",
            }}
          >
            Edit
          </Text>
        </Pressable>

        <Pressable
          onPress={onPost}
          style={({ pressed }) => ({
            opacity: pressed ? 0.82 : 1,
            flex: 1,
            borderRadius: 15,
            backgroundColor: AMBER_SOFT,
            borderWidth: 1,
            borderColor: AMBER_BORDER,
            paddingVertical: 10,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
          })}
        >
          <Ionicons
            name="megaphone-outline"
            size={15}
            color={EVENT_BROWN}
            style={{ marginRight: 5 }}
          />

          <Text
            style={{
              color: EVENT_BROWN,
              fontSize: 12,
              fontWeight: "900",
            }}
          >
            Post
          </Text>
        </Pressable>

        <Pressable
          onPress={onPromote}
          style={({ pressed }) => ({
            opacity: pressed ? 0.82 : 1,
            flex: 1,
            borderRadius: 15,
            backgroundColor: EVENT_AMBER,
            paddingVertical: 10,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
          })}
        >
          <Ionicons
            name="trending-up-outline"
            size={15}
            color={SURFACE}
            style={{ marginRight: 5 }}
          />

          <Text
            style={{
              color: SURFACE,
              fontSize: 12,
              fontWeight: "900",
            }}
          >
            Boost
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function MyPartnerProfiles({ navigation }) {
  useUserCommercialAccountScope();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [currentUserId, setCurrentUserId] = useState(null);
  const [partners, setPartners] = useState([]);

  const publishedCount = useMemo(
    () => partners.filter((item) => item.status === "published").length,
    [partners]
  );

  const loadPartners = useCallback(
    async ({ showSpinner = true } = {}) => {
      try {
        if (showSpinner) setLoading(true);

        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        const userId = sessionData?.session?.user?.id || null;
        setCurrentUserId(userId);

        if (!userId) {
          setPartners([]);
          return;
        }

        const res = await fetchMyPartnerProfiles({
          ownerId: userId,
          limit: 50,
        });

        if (res.ok) {
          setPartners(res.partners || []);
        } else {
          console.log("MyPartnerProfiles load error:", res.error);
          setPartners([]);
        }
      } catch (e) {
        console.log("MyPartnerProfiles exception:", e);
        setPartners([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadPartners();
  }, [loadPartners]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadPartners({ showSpinner: false });
  }

  function openCreatePartner() {
    navigation.navigate("CreatePartnerProfile");
  }

  function openPartner(partner) {
    navigation.navigate("PartnerProfilePublic", {
      partnerProfileId: partner.id,
    });
  }

  function editPartner(partner) {
    navigation.navigate("CreatePartnerProfile", {
      partnerProfileId: partner.id,
      mode: "edit",
    });
  }

  function createPost(partner) {
    navigation.navigate("CreatePartnerPost", {
      partnerProfileId: partner.id,
    });
  }

  function promotePartner(partner) {
    navigation.navigate("CreatePromotionCampaign", {
      partnerProfileId: partner.id,
      campaignType: "promote_profile",
    });
  }

  return (
    <Screen backgroundColor={PREMIUM_CREAM} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: bottomPad + 24,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={EVENT_AMBER}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              paddingHorizontal: 18,
              paddingTop: 12,
              paddingBottom: 14,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
              }}
            >
              <Pressable
                onPress={() => navigation.goBack()}
                hitSlop={10}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: SURFACE,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  shadowColor: SHADOW,
                  shadowOpacity: 0.08,
                  shadowRadius: 7,
                  shadowOffset: { width: 0, height: 3 },
                  elevation: 2,
                }}
              >
                <Ionicons name="chevron-back" size={22} color={OLIVE} />
              </Pressable>

              <Pressable
                onPress={openCreatePartner}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.84 : 1,
                  borderRadius: 999,
                  backgroundColor: EVENT_AMBER,
                  paddingHorizontal: 13,
                  paddingVertical: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  shadowColor: EVENT_AMBER,
                  shadowOpacity: 0.16,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 3,
                })}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={16}
                  color={SURFACE}
                  style={{ marginRight: 5 }}
                />

                <Text
                  style={{
                    color: SURFACE,
                    fontSize: 12.5,
                    fontWeight: "900",
                  }}
                >
                  New Partner
                </Text>
              </Pressable>
            </View>

            <View style={{ marginTop: 16 }}>
              <Text
                style={{
                  ...serifHeading,
                  fontSize: 34,
                  lineHeight: 40,
                }}
              >
                My Partners
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
                Manage your Christian business, creator, ministry or organisation
                profiles. Post updates, promote your work and grow your presence.
              </Text>
            </View>

            <View
              style={{
                ...premiumCardStyle,
                borderRadius: 22,
                padding: 14,
                marginTop: 15,
                flexDirection: "row",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: MUTED,
                    fontSize: 11.5,
                    fontWeight: "900",
                    textTransform: "uppercase",
                    letterSpacing: 0.45,
                  }}
                >
                  Total profiles
                </Text>

                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 28,
                    lineHeight: 33,
                    marginTop: 3,
                  }}
                >
                  {partners.length}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: MUTED,
                    fontSize: 11.5,
                    fontWeight: "900",
                    textTransform: "uppercase",
                    letterSpacing: 0.45,
                  }}
                >
                  Published
                </Text>

                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 28,
                    lineHeight: 33,
                    marginTop: 3,
                  }}
                >
                  {publishedCount}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: 18 }}>
            {loading ? (
              <View
                style={{
                  paddingVertical: 30,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ActivityIndicator size="large" color={EVENT_AMBER} />

                <Text
                  style={{
                    color: MUTED,
                    marginTop: 10,
                    fontWeight: "800",
                  }}
                >
                  Loading your Partner Profiles…
                </Text>
              </View>
            ) : !currentUserId ? (
              <View
                style={{
                  ...premiumCardStyle,
                  padding: 20,
                  alignItems: "center",
                }}
              >
                <Ionicons name="lock-closed-outline" size={28} color={OLIVE} />

                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 22,
                    lineHeight: 27,
                    textAlign: "center",
                    marginTop: 10,
                  }}
                >
                  Sign in required
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 13.5,
                    fontWeight: "700",
                    lineHeight: 20,
                    textAlign: "center",
                    marginTop: 6,
                  }}
                >
                  Sign in to manage your Partner Profiles.
                </Text>
              </View>
            ) : partners.length === 0 ? (
              <View
                style={{
                  ...premiumCardStyle,
                  padding: 20,
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 27,
                    backgroundColor: OLIVE_SOFT,
                    borderWidth: 1,
                    borderColor: OLIVE_BORDER,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                  }}
                >
                  <Ionicons name="briefcase-outline" size={25} color={OLIVE} />
                </View>

                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 22,
                    lineHeight: 27,
                    textAlign: "center",
                  }}
                >
                  No Partner Profiles yet
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 13.5,
                    fontWeight: "700",
                    lineHeight: 20,
                    textAlign: "center",
                    marginTop: 6,
                  }}
                >
                  Create your first Partner Profile to start building your
                  Christian presence on Triunely.
                </Text>

                <Pressable
                  onPress={openCreatePartner}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.86 : 1,
                    marginTop: 14,
                    borderRadius: 999,
                    backgroundColor: EVENT_AMBER,
                    paddingHorizontal: 16,
                    paddingVertical: 11,
                    flexDirection: "row",
                    alignItems: "center",
                  })}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={16}
                    color={SURFACE}
                    style={{ marginRight: 6 }}
                  />

                  <Text
                    style={{
                      color: SURFACE,
                      fontSize: 13,
                      fontWeight: "900",
                    }}
                  >
                    Create Partner Profile
                  </Text>
                </Pressable>
              </View>
            ) : (
              partners.map((partner) => (
                <PartnerManageCard
                  key={partner.id}
                  partner={partner}
                  onOpen={() => openPartner(partner)}
                  onEdit={() => editPartner(partner)}
                  onPost={() => createPost(partner)}
                  onPromote={() => promotePartner(partner)}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}