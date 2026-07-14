// src/features/partners/screens/CreatePartnerProfile.js
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
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
import TriunelyImageEditor from "../../../components/media/TriunelyImageEditor";
import { supabase } from "../../../lib/supabase";
import { uploadFeedMedia } from "../../../lib/uploadFeedMedia";
import {
    createPartnerProfile,
    fetchPartnerProfileById,
    getPartnerTypeIcon,
    PARTNER_TYPES,
    updatePartnerProfile,
} from "../services/partnersService";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const DANGER_RED = "#991B1B";
const OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";

const CARD_BORDER = "rgba(15, 23, 42, 0.08)";
const AMBER_SOFT = "rgba(180, 83, 9, 0.10)";
const AMBER_BORDER = "rgba(180, 83, 9, 0.18)";
const OLIVE_SOFT = "rgba(79, 99, 59, 0.10)";
const OLIVE_BORDER = "rgba(79, 99, 59, 0.18)";
const DANGER_SOFT = "rgba(153, 27, 27, 0.08)";
const DANGER_BORDER = "rgba(153, 27, 27, 0.18)";
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
          textAlignVertical: multiline ? "top" : "center",
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

function ToggleRow({ label, description, value, onValueChange, icon }) {
  return (
    <View
      style={{
        borderRadius: 18,
        backgroundColor: value ? AMBER_SOFT : OLIVE_SOFT,
        borderWidth: 1,
        borderColor: value ? AMBER_BORDER : OLIVE_BORDER,
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

      <View style={{ flex: 1, paddingRight: 10 }}>
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
        trackColor={{ false: "rgba(79, 99, 59, 0.22)", true: AMBER_BORDER }}
        thumbColor={value ? EVENT_AMBER : SURFACE}
      />
    </View>
  );
}

function PartnerTypeOption({ item, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.84 : 1,
        width: "48%",
        borderRadius: 18,
        padding: 12,
        marginBottom: 10,
        backgroundColor: active ? AMBER_SOFT : PREMIUM_CREAM,
        borderWidth: 1,
        borderColor: active ? AMBER_BORDER : CARD_BORDER,
      })}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: active ? EVENT_AMBER : OLIVE_SOFT,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        <Ionicons
          name={item.icon}
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
        {item.label}
      </Text>
    </Pressable>
  );
}

export default function CreatePartnerProfile({ route, navigation }) {
  const partnerProfileId = route?.params?.partnerProfileId || null;
  const mode = route?.params?.mode || (partnerProfileId ? "edit" : "create");
  const isEdit = mode === "edit" && !!partnerProfileId;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [logoUrl, setLogoUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");

  const [selectedLogoAsset, setSelectedLogoAsset] = useState(null);
  const [selectedCoverAsset, setSelectedCoverAsset] = useState(null);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [imageEditorVisible, setImageEditorVisible] = useState(false);
  const [imageEditorMode, setImageEditorMode] = useState("logo");
  const [imageEditorAsset, setImageEditorAsset] = useState(null);

  const [name, setName] = useState("");
  const [partnerType, setPartnerType] = useState("christian_business");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [about, setAbout] = useState("");

  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [xUrl, setXUrl] = useState("");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [applePodcastsUrl, setApplePodcastsUrl] = useState("");
  const [substackUrl, setSubstackUrl] = useState("");
  const [customLinkLabel, setCustomLinkLabel] = useState("");
  const [customLinkUrl, setCustomLinkUrl] = useState("");

  const [locationText, setLocationText] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [country, setCountry] = useState("United Kingdom");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postcodePrefix, setPostcodePrefix] = useState("");

  const [isOnline, setIsOnline] = useState(false);
  const [servesChurches, setServesChurches] = useState(false);
  const [servesFamilies, setServesFamilies] = useState(false);
  const [servesCreators, setServesCreators] = useState(false);
  const [servesBusinesses, setServesBusinesses] = useState(false);

  const selectedPartnerTypeIcon = useMemo(
    () => getPartnerTypeIcon(partnerType),
    [partnerType]
  );

  const title = isEdit ? "Edit Partner Profile" : "Create Partner Profile";

  const loadForEdit = useCallback(async () => {
    try {
      setLoading(true);

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const meId = sessionData?.session?.user?.id || null;
      setCurrentUserId(meId);

      if (!isEdit) return;

      const res = await fetchPartnerProfileById(partnerProfileId);

      if (!res.ok || !res.partner) {
        throw res.error || new Error("Partner profile not found");
      }

      const partner = res.partner;

      if (meId && partner.owner_id && meId !== partner.owner_id) {
        Alert.alert(
          "Not allowed",
          "Only the owner can edit this Partner Profile."
        );
        navigation.goBack();
        return;
      }

      setLogoUrl(partner.logo_url || "");
      setCoverImageUrl(partner.cover_image_url || "");
      setSelectedLogoAsset(null);
      setSelectedCoverAsset(null);

      setName(partner.name || "");
      setPartnerType(partner.partner_type || "christian_business");
      setCategory(partner.category || "");
      setSubcategory(partner.subcategory || "");
      setShortDescription(partner.short_description || "");
      setAbout(partner.about || "");

      setWebsiteUrl(partner.website_url || "");
      setContactEmail(partner.contact_email || "");
      setPhone(partner.phone || "");

      const socialLinks =
        partner.social_links &&
        typeof partner.social_links === "object" &&
        !Array.isArray(partner.social_links)
          ? partner.social_links
          : {};

      setInstagramUrl(socialLinks.instagram || "");
      setFacebookUrl(socialLinks.facebook || "");
      setYoutubeUrl(socialLinks.youtube || "");
      setTiktokUrl(socialLinks.tiktok || "");
      setLinkedinUrl(socialLinks.linkedin || "");
      setXUrl(socialLinks.x || "");
      setSpotifyUrl(socialLinks.spotify || "");
      setApplePodcastsUrl(socialLinks.apple_podcasts || "");
      setSubstackUrl(socialLinks.substack || "");
      setCustomLinkLabel(socialLinks.custom?.label || "");
      setCustomLinkUrl(socialLinks.custom?.url || "");

      setLocationText(partner.location_text || "");
      setServiceArea(partner.service_area || "");
      setCountry(partner.country || "United Kingdom");
      setCity(partner.city || "");
      setRegion(partner.region || "");
      setPostcodePrefix(partner.postcode_prefix || "");

      setIsOnline(Boolean(partner.is_online));
      setServesChurches(Boolean(partner.serves_churches));
      setServesFamilies(Boolean(partner.serves_families));
      setServesCreators(Boolean(partner.serves_creators));
      setServesBusinesses(Boolean(partner.serves_businesses));
    } catch (e) {
      console.log("CreatePartnerProfile load error:", e);
      Alert.alert(
        "Partner Profile",
        "We couldn't load this Partner Profile right now."
      );
    } finally {
      setLoading(false);
    }
  }, [isEdit, navigation, partnerProfileId]);

  useEffect(() => {
    loadForEdit();
  }, [loadForEdit]);

  async function ensureCurrentUser() {
    if (currentUserId) return currentUserId;

    const { data: sessionData, error } = await supabase.auth.getSession();

    if (error) throw error;

    const meId = sessionData?.session?.user?.id || null;

    if (!meId) throw new Error("You need to be signed in.");

    setCurrentUserId(meId);

    return meId;
  }

  async function ensurePhotoPermission() {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Photo permission needed",
        "Allow Triunely to access your photos so you can add Partner Profile branding."
      );

      return false;
    }

    return true;
  }

    function openImageEditor(asset, mode) {
    if (!asset?.uri) return;

    setImageEditorAsset(asset);
    setImageEditorMode(mode);
    setImageEditorVisible(true);
  }

  function closeImageEditor() {
    setImageEditorVisible(false);
    setImageEditorAsset(null);
  }

  function handleEditedImageComplete(editedAsset) {
    if (!editedAsset?.uri) return;

    if (imageEditorMode === "logo") {
      setSelectedLogoAsset(editedAsset);
    } else {
      setSelectedCoverAsset(editedAsset);
    }

    closeImageEditor();
  }

  async function pickLogoImage() {
    try {
      const allowed = await ensurePhotoPermission();

      if (!allowed) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];

      if (!asset?.uri) return;

      openImageEditor(asset, "logo");
    } catch (e) {
      console.log("CreatePartnerProfile logo picker error:", e);

      Alert.alert(
        "Logo",
        "We couldn't open that image. Please choose another image."
      );
    }
  }

  async function pickCoverImage() {
    try {
      const allowed = await ensurePhotoPermission();

      if (!allowed) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];

      if (!asset?.uri) return;

      openImageEditor(asset, "cover");
    } catch (e) {
      console.log("CreatePartnerProfile cover picker error:", e);

      Alert.alert(
        "Cover image",
        "We couldn't open that image. Please choose another image."
      );
    }
  }

  function removeSelectedLogo() {
    setSelectedLogoAsset(null);
    setLogoUrl("");
  }

  function removeSelectedCover() {
    setSelectedCoverAsset(null);
    setCoverImageUrl("");
  }

  async function uploadSelectedBranding({ meId }) {
    let finalLogoUrl = logoUrl;
    let finalCoverImageUrl = coverImageUrl;

    const uploadFolderId = partnerProfileId || meId;

    if (selectedLogoAsset?.uri) {
      setUploadingLogo(true);

      const uploadedLogo = await uploadFeedMedia({
        media: {
          ...selectedLogoAsset,
          uri: selectedLogoAsset.uri,
          type: "image",
          mediaType: "image",
        },
        scope: "partner-profiles",
        ownerId: meId,
        folderId: uploadFolderId,
      });

      finalLogoUrl = uploadedLogo.mediaUrl || "";
      setLogoUrl(finalLogoUrl);
      setSelectedLogoAsset(null);
      setUploadingLogo(false);
    }

    if (selectedCoverAsset?.uri) {
      setUploadingCover(true);

      const uploadedCover = await uploadFeedMedia({
        media: {
          ...selectedCoverAsset,
          uri: selectedCoverAsset.uri,
          type: "image",
          mediaType: "image",
        },
        scope: "partner-profiles",
        ownerId: meId,
        folderId: uploadFolderId,
      });

      finalCoverImageUrl = uploadedCover.mediaUrl || "";
      setCoverImageUrl(finalCoverImageUrl);
      setSelectedCoverAsset(null);
      setUploadingCover(false);
    }

    return {
      finalLogoUrl,
      finalCoverImageUrl,
    };
  }

    function buildSocialLinks() {
    const links = {};

    const cleanInstagram = String(instagramUrl || "").trim();
    const cleanFacebook = String(facebookUrl || "").trim();
    const cleanYoutube = String(youtubeUrl || "").trim();
    const cleanTiktok = String(tiktokUrl || "").trim();
    const cleanLinkedin = String(linkedinUrl || "").trim();
    const cleanX = String(xUrl || "").trim();
    const cleanSpotify = String(spotifyUrl || "").trim();
    const cleanApplePodcasts = String(applePodcastsUrl || "").trim();
    const cleanSubstack = String(substackUrl || "").trim();
    const cleanCustomLabel = String(customLinkLabel || "").trim();
    const cleanCustomUrl = String(customLinkUrl || "").trim();

    if (cleanInstagram) links.instagram = cleanInstagram;
    if (cleanFacebook) links.facebook = cleanFacebook;
    if (cleanYoutube) links.youtube = cleanYoutube;
    if (cleanTiktok) links.tiktok = cleanTiktok;
    if (cleanLinkedin) links.linkedin = cleanLinkedin;
    if (cleanX) links.x = cleanX;
    if (cleanSpotify) links.spotify = cleanSpotify;
    if (cleanApplePodcasts) links.apple_podcasts = cleanApplePodcasts;
    if (cleanSubstack) links.substack = cleanSubstack;

    if (cleanCustomUrl) {
      links.custom = {
        label: cleanCustomLabel || "More",
        url: cleanCustomUrl,
      };
    }

    return links;
  }

  async function handleSave() {
    try {
      if (saving) return;

      const cleanName = String(name || "").trim();

      if (!cleanName) {
        Alert.alert("Partner name required", "Add the name of this partner.");
        return;
      }

      if (!partnerType) {
        Alert.alert("Partner type required", "Choose the type of Partner Profile.");
        return;
      }

      setSaving(true);

      const meId = await ensureCurrentUser();

      const socialLinks = buildSocialLinks();

      const {
        finalLogoUrl,
        finalCoverImageUrl,
      } = await uploadSelectedBranding({
        meId,
      });

      let res;

      if (isEdit) {
        res = await updatePartnerProfile({
          partnerProfileId,
          name: cleanName,
          partnerType,
          category,
          subcategory,
          shortDescription,
          about,
          websiteUrl,
          contactEmail,
          phone,
          socialLinks,
          locationText,
          serviceArea,
          country,
          city,
          region,
          postcodePrefix,
          isOnline,
          servesChurches,
          servesFamilies,
          servesCreators,
          servesBusinesses,
          logoUrl: finalLogoUrl,
          coverImageUrl: finalCoverImageUrl,
          status: "published",
        });
      } else {
        res = await createPartnerProfile({
          ownerId: meId,
          name: cleanName,
          partnerType,
          category,
          subcategory,
          shortDescription,
          about,
          websiteUrl,
          contactEmail,
          phone,
          socialLinks,
          locationText,
          serviceArea,
          country,
          city,
          region,
          postcodePrefix,
          isOnline,
          servesChurches,
          servesFamilies,
          servesCreators,
          servesBusinesses,
          logoUrl: finalLogoUrl,
          coverImageUrl: finalCoverImageUrl,
        });
      }

      if (!res.ok) throw res.error;

      navigation.replace("PartnerProfilePublic", {
        partnerProfileId: res.partner.id,
      });
    } catch (e) {
      console.log("CreatePartnerProfile save error:", e);
      Alert.alert(
        "Partner Profile",
        e?.message || "We couldn't save this Partner Profile right now."
      );
    } finally {
      setSaving(false);
      setUploadingLogo(false);
      setUploadingCover(false);
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
        <ActivityIndicator size="large" color={EVENT_AMBER} />

        <Text
          style={{
            color: MUTED,
            marginTop: 10,
            fontWeight: "800",
          }}
        >
          Loading Partner Profile…
        </Text>
      </View>
    );
  }

  return (
    <Screen backgroundColor={PREMIUM_CREAM} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingBottom: bottomPad + 112,
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

              <View style={{ marginTop: 16 }}>
                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 34,
                    lineHeight: 40,
                  }}
                >
                  {title}
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
                  Build a trusted Christian presence for your business, creator
                  work, ministry or organisation.
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
                  name={selectedPartnerTypeIcon}
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
                Profile identity
              </Text>

              <View
                style={{
                  borderRadius: 22,
                  backgroundColor: PREMIUM_CREAM,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  overflow: "hidden",
                  marginBottom: 18,
                }}
              >
                <Pressable
                  onPress={pickCoverImage}
                  style={({ pressed }) => ({
                    height: 146,
                    backgroundColor: OLIVE_SOFT,
                    opacity: pressed ? 0.9 : 1,
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  })}
                >
                  {selectedCoverAsset?.uri || coverImageUrl ? (
                    <Image
                      source={{
                        uri: selectedCoverAsset?.uri || coverImageUrl,
                      }}
                      style={{
                        width: "100%",
                        height: "100%",
                      }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={{
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 20,
                      }}
                    >
                      <View
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 23,
                          backgroundColor: SURFACE,
                          borderWidth: 1,
                          borderColor: OLIVE_BORDER,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons
                          name="image-outline"
                          size={22}
                          color={OLIVE}
                        />
                      </View>

                      <Text
                        style={{
                          color: TEXT,
                          fontSize: 14,
                          fontWeight: "900",
                          marginTop: 9,
                        }}
                      >
                        Add cover image
                      </Text>

                      <Text
                        style={{
                          color: MUTED,
                          fontSize: 12,
                          fontWeight: "700",
                          marginTop: 3,
                          textAlign: "center",
                        }}
                      >
                        Show your organisation, work, ministry or mission
                      </Text>
                    </View>
                  )}

                  <View
                    style={{
                      position: "absolute",
                      right: 10,
                      top: 10,
                      borderRadius: 999,
                      backgroundColor: "rgba(255,255,255,0.94)",
                      borderWidth: 1,
                      borderColor: CARD_BORDER,
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    {uploadingCover ? (
                      <ActivityIndicator
                        size="small"
                        color={EVENT_AMBER}
                      />
                    ) : (
                      <>
                        <Ionicons
                          name="camera-outline"
                          size={15}
                          color={EVENT_BROWN}
                          style={{ marginRight: 5 }}
                        />

                        <Text
                          style={{
                            color: EVENT_BROWN,
                            fontSize: 11.5,
                            fontWeight: "900",
                          }}
                        >
                          {selectedCoverAsset?.uri || coverImageUrl
                            ? "Change"
                            : "Add cover"}
                        </Text>
                      </>
                    )}
                  </View>
                </Pressable>

                <View
                  style={{
                    paddingHorizontal: 14,
                    paddingBottom: 14,
                  }}
                >
                  <View
                    style={{
                      marginTop: -40,
                      flexDirection: "row",
                      alignItems: "flex-end",
                    }}
                  >
                    <Pressable
                      onPress={pickLogoImage}
                      style={({ pressed }) => ({
                        width: 82,
                        height: 82,
                        borderRadius: 26,
                        backgroundColor: OLIVE,
                        borderWidth: 4,
                        borderColor: SURFACE,
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        opacity: pressed ? 0.88 : 1,
                        shadowColor: SHADOW,
                        shadowOpacity: 0.14,
                        shadowRadius: 9,
                        shadowOffset: {
                          width: 0,
                          height: 4,
                        },
                        elevation: 4,
                      })}
                    >
                      {selectedLogoAsset?.uri || logoUrl ? (
                        <Image
                          source={{
                            uri: selectedLogoAsset?.uri || logoUrl,
                          }}
                          style={{
                            width: "100%",
                            height: "100%",
                          }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons
                          name="business-outline"
                          size={30}
                          color={SURFACE}
                        />
                      )}

                      <View
                        style={{
                          position: "absolute",
                          right: 5,
                          bottom: 5,
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          backgroundColor: EVENT_AMBER,
                          borderWidth: 2,
                          borderColor: SURFACE,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {uploadingLogo ? (
                          <ActivityIndicator
                            size="small"
                            color={SURFACE}
                          />
                        ) : (
                          <Ionicons
                            name="camera"
                            size={13}
                            color={SURFACE}
                          />
                        )}
                      </View>
                    </Pressable>

                    <View
                      style={{
                        flex: 1,
                        paddingLeft: 12,
                        paddingBottom: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: TEXT,
                          fontSize: 14,
                          fontWeight: "900",
                        }}
                      >
                        Partner branding
                      </Text>

                      <Text
                        style={{
                          color: MUTED,
                          fontSize: 12,
                          fontWeight: "700",
                          lineHeight: 17,
                          marginTop: 3,
                        }}
                      >
                        Add a square logo and a wide cover image.
                      </Text>
                    </View>
                  </View>

                  {selectedLogoAsset?.uri ||
                  logoUrl ||
                  selectedCoverAsset?.uri ||
                  coverImageUrl ? (
                    <View
                      style={{
                        marginTop: 12,
                        flexDirection: "row",
                        flexWrap: "wrap",
                      }}
                    >
                      {selectedLogoAsset?.uri || logoUrl ? (
                        <Pressable
                          onPress={removeSelectedLogo}
                          style={({ pressed }) => ({
                            opacity: pressed ? 0.75 : 1,
                            borderRadius: 999,
                            backgroundColor: DANGER_SOFT,
                            borderWidth: 1,
                            borderColor: DANGER_BORDER,
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            marginRight: 8,
                            marginBottom: 6,
                            flexDirection: "row",
                            alignItems: "center",
                          })}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={14}
                            color={DANGER_RED}
                            style={{ marginRight: 5 }}
                          />

                          <Text
                            style={{
                              color: DANGER_RED,
                              fontSize: 11.5,
                              fontWeight: "900",
                            }}
                          >
                            Remove logo
                          </Text>
                        </Pressable>
                      ) : null}

                      {selectedCoverAsset?.uri || coverImageUrl ? (
                        <Pressable
                          onPress={removeSelectedCover}
                          style={({ pressed }) => ({
                            opacity: pressed ? 0.75 : 1,
                            borderRadius: 999,
                            backgroundColor: DANGER_SOFT,
                            borderWidth: 1,
                            borderColor: DANGER_BORDER,
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            marginRight: 8,
                            marginBottom: 6,
                            flexDirection: "row",
                            alignItems: "center",
                          })}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={14}
                            color={DANGER_RED}
                            style={{ marginRight: 5 }}
                          />

                          <Text
                            style={{
                              color: DANGER_RED,
                              fontSize: 11.5,
                              fontWeight: "900",
                            }}
                          >
                            Remove cover
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              </View>

              <Field
                label="Partner name"
                value={name}
                onChangeText={setName}
                placeholder="e.g. Kingdom Creative Studio"
              />

              <Field
                label="Category"
                value={category}
                onChangeText={setCategory}
                placeholder="e.g. Design, Counselling, Music, Events"
              />

              <Field
                label="Subcategory"
                value={subcategory}
                onChangeText={setSubcategory}
                placeholder="Optional"
              />

              <Field
                label="Short pitch"
                value={shortDescription}
                onChangeText={setShortDescription}
                placeholder="One or two sentences that explain what you do"
                multiline
              />

              <Field
                label="About"
                value={about}
                onChangeText={setAbout}
                placeholder="Tell Christians, churches and families what you offer and why it matters"
                multiline
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
                Partner type
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                }}
              >
                {PARTNER_TYPES.map((item) => (
                  <PartnerTypeOption
                    key={item.value}
                    item={item}
                    active={partnerType === item.value}
                    onPress={() => setPartnerType(item.value)}
                  />
                ))}
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
                  backgroundColor: OLIVE_SOFT,
                  borderWidth: 1,
                  borderColor: OLIVE_BORDER,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Ionicons
                  name="share-social-outline"
                  size={24}
                  color={OLIVE}
                />
              </View>

              <Text
                style={{
                  ...serifHeading,
                  fontSize: 23,
                  lineHeight: 28,
                }}
              >
                Social presence
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 13,
                  fontWeight: "700",
                  lineHeight: 19,
                  marginTop: 5,
                  marginBottom: 14,
                }}
              >
                Help people discover your content, channels, music, podcasts and
                wider work.
              </Text>

              <Field
                label="Instagram"
                value={instagramUrl}
                onChangeText={setInstagramUrl}
                placeholder="https://instagram.com/..."
                autoCapitalize="none"
                keyboardType="url"
              />

              <Field
                label="Facebook"
                value={facebookUrl}
                onChangeText={setFacebookUrl}
                placeholder="https://facebook.com/..."
                autoCapitalize="none"
                keyboardType="url"
              />

              <Field
                label="YouTube"
                value={youtubeUrl}
                onChangeText={setYoutubeUrl}
                placeholder="https://youtube.com/@..."
                autoCapitalize="none"
                keyboardType="url"
              />

              <Field
                label="TikTok"
                value={tiktokUrl}
                onChangeText={setTiktokUrl}
                placeholder="https://tiktok.com/@..."
                autoCapitalize="none"
                keyboardType="url"
              />

              <Field
                label="LinkedIn"
                value={linkedinUrl}
                onChangeText={setLinkedinUrl}
                placeholder="https://linkedin.com/..."
                autoCapitalize="none"
                keyboardType="url"
              />

              <Field
                label="X"
                value={xUrl}
                onChangeText={setXUrl}
                placeholder="https://x.com/..."
                autoCapitalize="none"
                keyboardType="url"
              />

              <Field
                label="Spotify"
                value={spotifyUrl}
                onChangeText={setSpotifyUrl}
                placeholder="https://open.spotify.com/..."
                autoCapitalize="none"
                keyboardType="url"
              />

              <Field
                label="Apple Podcasts"
                value={applePodcastsUrl}
                onChangeText={setApplePodcastsUrl}
                placeholder="https://podcasts.apple.com/..."
                autoCapitalize="none"
                keyboardType="url"
              />

              <Field
                label="Substack"
                value={substackUrl}
                onChangeText={setSubstackUrl}
                placeholder="https://yourname.substack.com"
                autoCapitalize="none"
                keyboardType="url"
              />

              <View
                style={{
                  marginTop: 4,
                  borderRadius: 20,
                  backgroundColor: PREMIUM_CREAM,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  padding: 13,
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
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: AMBER_SOFT,
                      borderWidth: 1,
                      borderColor: AMBER_BORDER,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 9,
                    }}
                  >
                    <Ionicons
                      name="link-outline"
                      size={17}
                      color={EVENT_BROWN}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: TEXT,
                        fontSize: 14,
                        fontWeight: "900",
                      }}
                    >
                      Custom link
                    </Text>

                    <Text
                      style={{
                        color: MUTED,
                        fontSize: 11.5,
                        fontWeight: "700",
                        marginTop: 2,
                      }}
                    >
                      Add a shop, booking page, podcast or another destination.
                    </Text>
                  </View>
                </View>

                <Field
                  label="Link label"
                  value={customLinkLabel}
                  onChangeText={setCustomLinkLabel}
                  placeholder="e.g. Shop, Book now, Listen"
                />

                <Field
                  label="Link URL"
                  value={customLinkUrl}
                  onChangeText={setCustomLinkUrl}
                  placeholder="https://..."
                  autoCapitalize="none"
                  keyboardType="url"
                />
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
                Contact and location
              </Text>

              <Field
                label="Website"
                value={websiteUrl}
                onChangeText={setWebsiteUrl}
                placeholder="https://..."
                autoCapitalize="none"
                keyboardType="url"
              />

              <Field
                label="Contact email"
                value={contactEmail}
                onChangeText={setContactEmail}
                placeholder="hello@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Field
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                placeholder="Optional"
                keyboardType="phone-pad"
              />

              <Field
                label="Location text"
                value={locationText}
                onChangeText={setLocationText}
                placeholder="e.g. Southampton, Hampshire"
              />

              <Field
                label="Service area"
                value={serviceArea}
                onChangeText={setServiceArea}
                placeholder="e.g. Local, UK-wide, Online, Churches across the UK"
              />

              <Field
                label="Country"
                value={country}
                onChangeText={setCountry}
                placeholder="United Kingdom"
              />

              <Field
                label="City"
                value={city}
                onChangeText={setCity}
                placeholder="Optional"
              />

              <Field
                label="Region"
                value={region}
                onChangeText={setRegion}
                placeholder="Optional"
              />

              <Field
                label="Postcode prefix"
                value={postcodePrefix}
                onChangeText={setPostcodePrefix}
                placeholder="e.g. SO, GU, PO"
                autoCapitalize="characters"
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
                  marginBottom: 12,
                }}
              >
                Who do you serve?
              </Text>

              <ToggleRow
                icon="wifi-outline"
                label="Online / digital"
                description="You can serve people online, not only locally."
                value={isOnline}
                onValueChange={setIsOnline}
              />

              <ToggleRow
                icon="business-outline"
                label="Churches"
                description="Your work can help churches, leaders or church teams."
                value={servesChurches}
                onValueChange={setServesChurches}
              />

              <ToggleRow
                icon="people-outline"
                label="Families"
                description="Your work serves Christian families, parents or children."
                value={servesFamilies}
                onValueChange={setServesFamilies}
              />

              <ToggleRow
                icon="videocam-outline"
                label="Creators"
                description="Your work helps Christian creators, media or content."
                value={servesCreators}
                onValueChange={setServesCreators}
              />

              <ToggleRow
                icon="briefcase-outline"
                label="Businesses"
                description="Your work helps Christian businesses or entrepreneurs."
                value={servesBusinesses}
                onValueChange={setServesBusinesses}
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
              backgroundColor: "rgba(255,252,245,0.96)",
              borderTopWidth: 1,
              borderTopColor: CARD_BORDER,
            }}
          >
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => ({
                opacity: saving ? 0.62 : pressed ? 0.86 : 1,
                borderRadius: 999,
                backgroundColor: EVENT_AMBER,
                paddingVertical: 14,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                shadowColor: EVENT_AMBER,
                shadowOpacity: 0.16,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: 3,
              })}
            >
              {saving ? (
                <ActivityIndicator size="small" color={SURFACE} />
              ) : (
                <>
                  <Ionicons
                    name={isEdit ? "save-outline" : "rocket-outline"}
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
                    {isEdit ? "Save Partner Profile" : "Create Partner Profile"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          <TriunelyImageEditor
            visible={imageEditorVisible}
            imageUri={imageEditorAsset?.uri || null}
            cropMode={imageEditorMode}
            title={
              imageEditorMode === "logo"
                ? "Position your Partner logo"
                : "Position your Partner cover"
            }
            onCancel={closeImageEditor}
            onChooseDifferent={() => {
              const modeToReplace = imageEditorMode;

              closeImageEditor();

              setTimeout(() => {
                if (modeToReplace === "logo") {
                  pickLogoImage();
                } else {
                  pickCoverImage();
                }
              }, 250);
            }}
            onComplete={handleEditedImageComplete}
          />
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}