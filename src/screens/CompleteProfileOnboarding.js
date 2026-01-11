// src/screens/CompleteProfileOnboarding.js
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";

import { OFFICIAL_ACCOUNT_USER_ID } from "../config/constants";
import { supabase } from "../lib/supabase";
import { colors } from "../theme/colors";

export default function CompleteProfileOnboarding({ profile, onFinished }) {
  const [displayName, setDisplayName] = useState(
    profile?.display_name || ""
  );

  // Existing avatar URL from profile, if any
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
  // Newly selected local image (not yet uploaded)
  const [avatarLocal, setAvatarLocal] = useState(null);

  const [saving, setSaving] = useState(false);

  async function ensureMediaPermissions() {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "We need access to your photos so you can choose a profile picture."
      );
      return false;
    }
    return true;
  }

  async function handlePickAvatar() {
  const ok = await ensureMediaPermissions();
  if (!ok) return;

  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true, // IMPORTANT: we need base64 for the Edge Function
    });

    if (result.canceled) return;

    const asset = result.assets && result.assets[0];
    if (!asset || !asset.uri) return;

    if (!asset.base64) {
      Alert.alert(
        "Avatar error",
        "We couldn’t read this image. Please try another photo."
      );
      return;
    }

    // Keep uri (for preview) AND base64 (for upload)
    setAvatarLocal({
      uri: asset.uri,
      base64: asset.base64,
    });
  } catch (e) {
    console.log("Error picking avatar", e);
    Alert.alert(
      "Avatar error",
      "We couldn’t open that image. Please try another one."
    );
  }
}


 async function handleFinish() {
  if (!displayName.trim()) {
    Alert.alert(
      "Display name required",
      "Please choose a name your friends and community will see."
    );
    return;
  }

  setSaving(true);

  // Start from whatever avatar the profile already had (if any)
  let finalAvatarUrl = avatarUrl || null;

  try {
    // 1) Upload avatar if the user picked a new one (via Edge Function)
    if (avatarLocal && avatarLocal.base64 && avatarLocal.uri) {
      const fileExtFromUri =
        avatarLocal.uri.split(".").pop()?.toLowerCase().split("?")[0] || "jpg";
      const fileExt = fileExtFromUri === "" ? "jpg" : fileExtFromUri;

      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const contentType = "image/jpeg";

      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        "upload-post-image",
        {
          body: {
            base64: avatarLocal.base64,
            fileName,
            contentType,
            // keep avatars grouped by user id (same pattern as Profile)
            pathPrefix: `avatars/${profile.id}`,
          },
        }
      );

      if (fnError) {
        console.log("Avatar edge function error:", fnError);
        throw fnError;
      }

      if (!fnData?.publicUrl) {
        throw new Error("No publicUrl returned from edge function");
      }

      finalAvatarUrl = fnData.publicUrl;
    }

    // 2) Auto-follow your official account (if configured)
    if (
      OFFICIAL_ACCOUNT_USER_ID &&
      OFFICIAL_ACCOUNT_USER_ID !== profile.id
    ) {
      const { error: followError } = await supabase
        .from("follows")
        .insert({
          follower_id: profile.id,
          followed_id: OFFICIAL_ACCOUNT_USER_ID,
        });

      // Ignore "already exists" unique violations; only surface real errors
      if (followError && followError.code !== "23505") {
        console.log("Follow insert error", followError);
        throw followError;
      }
    }

          // 3) Create or update profile row (upsert)
      const updates = {
        id: profile.id, // make sure the row is tied to this user
        display_name: displayName.trim(),
        has_completed_onboarding: true,
      };

      if (finalAvatarUrl) {
        updates.avatar_url = finalAvatarUrl;
      }

      const { data: updated, error: updateError } = await supabase
        .from("profiles")
        .upsert(updates, { onConflict: "id" })
        .select("*")
        .single();


    if (updateError) {
      console.log("Profile update error", updateError);
      throw updateError;
    }

    const updatedProfile = updated || {
      ...profile,
      ...updates,
    };

    Alert.alert(
      "Welcome to Triunely",
      "Your profile is ready. Let’s head into the app."
    );

    // Tell App.js we’re done and pass the updated profile back
    onFinished(updatedProfile);
  } catch (e) {
    console.log("Onboarding error", e);
    const msg =
      e?.message ||
      e?.error_description ||
      "We couldn’t finish setting up your profile. Please try again.";
    Alert.alert("Setup failed", msg);
  } finally {
    setSaving(false);
  }
}


  const previewUri =
    avatarLocal?.uri || avatarUrl || null;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        padding: 20,
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: 26,
          fontWeight: "700",
          marginBottom: 8,
        }}
      >
        Welcome to Triunely
      </Text>

      <Text
        style={{
          color: colors.textMuted,
          marginBottom: 24,
        }}
      >
        Let’s set up your profile so the community knows who you are and
        automatically connect you with the Triunely account.
      </Text>

      {/* Avatar picker */}
      <View
        style={{
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: colors.surface,
            borderWidth: 2,
            borderColor: colors.accentGoldSoft,
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
            marginBottom: 12,
          }}
        >
          {previewUri ? (
            <Image
              source={{ uri: previewUri }}
              style={{ width: 96, height: 96 }}
            />
          ) : (
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 32,
                fontWeight: "700",
              }}
            >
              🙂
            </Text>
          )}
        </View>

        <Pressable
          onPress={handlePickAvatar}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 999,
            backgroundColor: colors.surfaceSoft,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
          }}
        >
          <Text
            style={{
              color: colors.textPrimary,
              fontWeight: "600",
            }}
          >
            {previewUri ? "Change photo" : "Add profile photo"}
          </Text>
        </Pressable>

        <Text
          style={{
            color: colors.textMuted,
            fontSize: 12,
            marginTop: 6,
          }}
        >
          You can update this any time in your Profile tab.
        </Text>
      </View>

      {/* Display name */}
      <View
        style={{
          marginBottom: 24,
        }}
      >
        <Text
          style={{
            color: colors.textPrimary,
            fontWeight: "600",
            marginBottom: 6,
          }}
        >
          Display name
        </Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="How should people see your name?"
          placeholderTextColor={colors.textMuted}
          style={{
            backgroundColor: colors.surface,
            color: colors.textPrimary,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
          }}
        />
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 12,
            marginTop: 4,
          }}
        >
          This name is shown on your posts, comments, and stories.
        </Text>
      </View>

      {/* Auto-follow info */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 10,
          padding: 12,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
          marginBottom: 24,
        }}
      >
        <Text
          style={{
            color: colors.textPrimary,
            fontWeight: "600",
            marginBottom: 4,
          }}
        >
          You’ll follow Triunely
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 13,
          }}
        >
          We’ll automatically connect you to the main Triunely account so
          you see announcements, encouragements, and platform updates in
          your feed.
        </Text>
      </View>

      {/* Finish button */}
      <Pressable
        onPress={handleFinish}
        disabled={saving}
        style={{
          backgroundColor: saving
            ? "rgba(242,183,5,0.6)"
            : colors.accentGold,
          paddingVertical: 12,
          borderRadius: 999,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
        }}
      >
        {saving && (
          <ActivityIndicator
            size="small"
            color={colors.textOnAccent}
            style={{ marginRight: 8 }}
          />
        )}
        <Text
          style={{
            color: colors.textOnAccent,
            fontWeight: "700",
            fontSize: 16,
          }}
        >
          {saving ? "Saving…" : "Finish setup"}
        </Text>
      </Pressable>
    </View>
  );
}
