// src/features/partners/screens/PartnerProfilesDirectory.js
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
    TextInput,
    View,
} from "react-native";

import Screen from "../../../components/Screen";
import VerifiedBadge from "../../../components/VerifiedBadge";
import { supabase } from "../../../lib/supabase";

import {
    fetchMyConnectedPartnerProfiles,
    fetchPartnerProfiles,
    getPartnerTypeIcon,
    getPartnerTypeLabel,
    PARTNER_TYPES,
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

function PartnerTypeChip({ item, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.82 : 1,
        marginRight: 8,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 9,
        backgroundColor: active ? EVENT_AMBER : SURFACE,
        borderWidth: 1,
        borderColor: active ? EVENT_AMBER : CARD_BORDER,
        flexDirection: "row",
        alignItems: "center",
      })}
    >
      <Ionicons
        name={item.icon}
        size={15}
        color={active ? SURFACE : OLIVE}
        style={{ marginRight: 6 }}
      />

      <Text
        style={{
          color: active ? SURFACE : TEXT,
          fontSize: 12.5,
          fontWeight: "900",
        }}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

function PartnerCard({ partner, onPress }) {
  const typeLabel = getPartnerTypeLabel(partner?.partner_type);
  const typeIcon = getPartnerTypeIcon(partner?.partner_type);
  const name = partner?.name || "Partner";
  const logoUrl = partner?.logo_url || null;
  const coverUrl = partner?.cover_image_url || null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        ...premiumCardStyle,
        overflow: "hidden",
        marginBottom: 13,
        opacity: pressed ? 0.92 : 1,
        transform: [{ scale: pressed ? 0.995 : 1 }],
      })}
    >
      <View
        style={{
          height: 86,
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
              shadowColor: SHADOW,
              shadowOpacity: 0.12,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 3,
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

          {partner?.is_verified ? (
            <View
              style={{
                marginLeft: "auto",
                marginBottom: 5,
                borderRadius: 999,
                backgroundColor: AMBER_SOFT,
                borderWidth: 1,
                borderColor: AMBER_BORDER,
                paddingHorizontal: 10,
                paddingVertical: 6,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <VerifiedBadge size={14} />

              <Text
                style={{
                  color: EVENT_BROWN,
                  fontSize: 11.5,
                  fontWeight: "900",
                  marginLeft: 5,
                }}
              >
                Verified
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ marginTop: 10 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              minWidth: 0,
            }}
          >
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
          </View>

          <View
            style={{
              marginTop: 6,
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

          <View
            style={{
              marginTop: 11,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: EVENT_BROWN,
                fontSize: 12.5,
                fontWeight: "900",
              }}
            >
              View partner profile
            </Text>

            <Ionicons
              name="chevron-forward"
              size={15}
              color={EVENT_BROWN}
              style={{ marginLeft: 2 }}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function PartnerProfilesDirectory({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [partners, setPartners] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [directoryMode, setDirectoryMode] =
    useState("discover");

  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState(null);
  const [onlyVerified, setOnlyVerified] = useState(false);

  const typeChips = useMemo(() => {
    return [
      {
        value: null,
        label: "All",
        icon: "apps-outline",
      },
      ...PARTNER_TYPES,
    ];
  }, []);

  const loadPartners = useCallback(
    async ({ showSpinner = true } = {}) => {
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

        if (directoryMode === "connected") {
          if (!meId) {
            setPartners([]);
            return;
          }

          const result =
            await fetchMyConnectedPartnerProfiles({
              userId: meId,
              limit: 100,
            });

          if (!result.ok) {
            console.log(
              "PartnerProfilesDirectory connected load error:",
              result.error
            );

            setPartners([]);
            return;
          }

          const cleanSearch = String(
            search || ""
          )
            .trim()
            .toLowerCase();

          const filteredPartners = (
            result.partners || []
          ).filter((partner) => {
            if (
              selectedType &&
              partner?.partner_type !==
                selectedType
            ) {
              return false;
            }

            if (
              onlyVerified &&
              !partner?.is_verified
            ) {
              return false;
            }

            if (!cleanSearch) {
              return true;
            }

            const searchableText = [
              partner?.name,
              partner?.short_description,
              partner?.about,
              partner?.category,
              partner?.location_text,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            return searchableText.includes(
              cleanSearch
            );
          });

          setPartners(filteredPartners);
          return;
        }

        const result =
          await fetchPartnerProfiles({
            search,
            partnerType: selectedType,
            onlyVerified,
            limit: 50,
          });

        if (result.ok) {
          setPartners(
            result.partners || []
          );
        } else {
          console.log(
            "PartnerProfilesDirectory load error:",
            result.error
          );

          setPartners([]);
        }
      } catch (error) {
        console.log(
          "PartnerProfilesDirectory exception:",
          error
        );

        setPartners([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      directoryMode,
      onlyVerified,
      search,
      selectedType,
    ]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPartners();
    }, 250);

    return () =>
      clearTimeout(timer);
  }, [loadPartners]);

  useEffect(() => {
    const unsubscribe =
      navigation.addListener(
        "focus",
        () => {
          loadPartners({
            showSpinner: false,
          });
        }
      );

    return unsubscribe;
  }, [loadPartners, navigation]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadPartners({ showSpinner: false });
  }

  function openPartner(partner) {
    navigation.navigate("PartnerProfilePublic", {
      partnerProfileId: partner.id,
    });
  }

  function openCreatePartner() {
    navigation.navigate("CreatePartnerProfile");
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

              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Pressable
                  onPress={() => navigation.navigate("MyPartnerProfiles")}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.84 : 1,
                    borderRadius: 999,
                    backgroundColor: SURFACE,
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    shadowColor: SHADOW,
                    shadowOpacity: 0.08,
                    shadowRadius: 7,
                    shadowOffset: { width: 0, height: 3 },
                    elevation: 2,
                  })}
                >
                  <Ionicons
                    name="briefcase-outline"
                    size={16}
                    color={OLIVE}
                    style={{ marginRight: 5 }}
                  />

                  <Text
                    style={{
                      color: OLIVE,
                      fontSize: 12.5,
                      fontWeight: "900",
                    }}
                  >
                    Mine
                  </Text>
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
                    Create
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={{ marginTop: 16 }}>
              <Text
                style={{
                  ...serifHeading,
                  fontSize: 34,
                  lineHeight: 40,
                }}
              >
                Christian Partners
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
                {directoryMode ===
                "connected"
                  ? "Return to the Christian businesses, creators, ministries and organisations you have connected with."
                  : "Discover Christian businesses, creators, ministries and organisations helping believers, churches and families grow."}
              </Text>
            </View>

            <View
              style={{
                marginTop: 15,
                padding: 5,
                borderRadius: 20,
                backgroundColor:
                  OLIVE_SOFT,
                borderWidth: 1,
                borderColor:
                  OLIVE_BORDER,
                flexDirection: "row",
              }}
            >
              <Pressable
                onPress={() =>
                  setDirectoryMode(
                    "discover"
                  )
                }
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 46,
                  borderRadius: 16,
                  backgroundColor:
                    directoryMode ===
                    "discover"
                      ? SURFACE
                      : "transparent",
                  borderWidth:
                    directoryMode ===
                    "discover"
                      ? 1
                      : 0,
                  borderColor:
                    CARD_BORDER,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent:
                    "center",
                  opacity: pressed
                    ? 0.82
                    : 1,
                  shadowColor: SHADOW,
                  shadowOpacity:
                    directoryMode ===
                    "discover"
                      ? 0.07
                      : 0,
                  shadowRadius: 6,
                  shadowOffset: {
                    width: 0,
                    height: 3,
                  },
                  elevation:
                    directoryMode ===
                    "discover"
                      ? 2
                      : 0,
                })}
              >
                <Ionicons
                  name="compass-outline"
                  size={18}
                  color={
                    directoryMode ===
                    "discover"
                      ? EVENT_AMBER
                      : OLIVE
                  }
                  style={{
                    marginRight: 7,
                  }}
                />

                <Text
                  style={{
                    color:
                      directoryMode ===
                      "discover"
                        ? EVENT_BROWN
                        : OLIVE,
                    fontSize: 13.5,
                    fontWeight: "900",
                  }}
                >
                  Discover
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  setDirectoryMode(
                    "connected"
                  )
                }
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 46,
                  borderRadius: 16,
                  backgroundColor:
                    directoryMode ===
                    "connected"
                      ? SURFACE
                      : "transparent",
                  borderWidth:
                    directoryMode ===
                    "connected"
                      ? 1
                      : 0,
                  borderColor:
                    CARD_BORDER,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent:
                    "center",
                  opacity: pressed
                    ? 0.82
                    : 1,
                  shadowColor: SHADOW,
                  shadowOpacity:
                    directoryMode ===
                    "connected"
                      ? 0.07
                      : 0,
                  shadowRadius: 6,
                  shadowOffset: {
                    width: 0,
                    height: 3,
                  },
                  elevation:
                    directoryMode ===
                    "connected"
                      ? 2
                      : 0,
                })}
              >
                <Ionicons
                  name="people-outline"
                  size={18}
                  color={
                    directoryMode ===
                    "connected"
                      ? EVENT_AMBER
                      : OLIVE
                  }
                  style={{
                    marginRight: 7,
                  }}
                />

                <Text
                  style={{
                    color:
                      directoryMode ===
                      "connected"
                        ? EVENT_BROWN
                        : OLIVE,
                    fontSize: 13.5,
                    fontWeight: "900",
                  }}
                >
                  Connected
                </Text>
              </Pressable>
            </View>

            <View
              style={{
                marginTop: 12,
                ...premiumCardStyle,
                borderRadius: 22,
                padding: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: PREMIUM_CREAM,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  paddingHorizontal: 12,
                }}
              >
                <Ionicons
                  name="search-outline"
                  size={18}
                  color={OLIVE}
                  style={{ marginRight: 8 }}
                />

                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search partners, services, creators..."
                  placeholderTextColor={MUTED}
                  style={{
                    flex: 1,
                    color: TEXT,
                    fontSize: 14,
                    fontWeight: "800",
                    paddingVertical: 11,
                  }}
                />

                {search ? (
                  <Pressable onPress={() => setSearch("")} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={MUTED} />
                  </Pressable>
                ) : null}
              </View>

              <Pressable
                onPress={() => setOnlyVerified((prev) => !prev)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.84 : 1,
                  marginTop: 10,
                  borderRadius: 18,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  backgroundColor: onlyVerified ? AMBER_SOFT : OLIVE_SOFT,
                  borderWidth: 1,
                  borderColor: onlyVerified ? AMBER_BORDER : OLIVE_BORDER,
                  flexDirection: "row",
                  alignItems: "center",
                })}
              >
                <Ionicons
                  name={onlyVerified ? "shield-checkmark" : "shield-outline"}
                  size={17}
                  color={onlyVerified ? EVENT_BROWN : OLIVE}
                  style={{ marginRight: 8 }}
                />

                <Text
                  style={{
                    color: onlyVerified ? EVENT_BROWN : OLIVE,
                    fontSize: 13,
                    fontWeight: "900",
                  }}
                >
                  {onlyVerified ? "Showing verified partners" : "Verified partners only"}
                </Text>
              </Pressable>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 18,
              paddingBottom: 12,
            }}
          >
            {typeChips.map((item) => (
              <PartnerTypeChip
                key={item.value || "all"}
                item={item}
                active={selectedType === item.value}
                onPress={() => setSelectedType(item.value)}
              />
            ))}
          </ScrollView>

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
                  Loading Christian partners…
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
                  {directoryMode ===
                  "connected"
                    ? "No connected Partners yet"
                    : "No partners found"}
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
                  {directoryMode ===
                  "connected"
                    ? currentUserId
                      ? "Connect with Christian Partners you value and they will appear here."
                      : "Sign in to view the Partner Profiles you are connected with."
                    : "Try a different search or create the first Partner Profile."}
                </Text>

                {directoryMode ===
                "discover" ? (
                  <Pressable
                    onPress={
                      openCreatePartner
                    }
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
                ) : null}
              </View>
            ) : (
              <>
                <Text
                  style={{
                    color: MUTED,
                    fontSize: 12.5,
                    fontWeight: "900",
                    textTransform: "uppercase",
                    letterSpacing: 0.45,
                    marginBottom: 9,
                  }}
                >
                  {partners.length} {partners.length === 1 ? "partner" : "partners"}
                </Text>

                {partners.map((partner) => (
                  <PartnerCard
                    key={partner.id}
                    partner={partner}
                    onPress={() => openPartner(partner)}
                  />
                ))}
              </>
            )}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}