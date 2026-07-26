// C:\triunely\src\screens\NetworkPostEditor.js

import { Ionicons } from "@expo/vector-icons";
import {
    useNavigation,
    useRoute,
} from "@react-navigation/native";
import {
    useMemo,
    useState,
} from "react";
import {
    ActivityIndicator,
    Platform,
    Pressable,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";
import {
    KeyboardAwareScrollView,
} from "react-native-keyboard-controller";

import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";

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

function VisibilityOption({
  value,
  label,
  description,
  icon,
  selected,
  onPress,
}) {
  return (
    <Pressable
      onPress={() => onPress(value)}
      style={({ pressed }) => ({
        minHeight: 72,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: selected
          ? GOLD_BORDER
          : OLIVE_BORDER,
        backgroundColor: selected
          ? SOFT_GOLD_BG
          : pressed
            ? SOFT_OLIVE_BG
            : SURFACE,
        padding: 13,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
      })}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: selected
            ? SOFT_GOLD_BG
            : SOFT_OLIVE_BG,
          borderWidth: 1,
          borderColor: selected
            ? GOLD_BORDER
            : OLIVE_BORDER,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 11,
        }}
      >
        <Ionicons
          name={icon}
          size={20}
          color={
            selected
              ? HEAVENLY_GOLD
              : DEEP_OLIVE
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
            color: selected
              ? EVENT_BROWN
              : TEXT,
            fontSize: 13.5,
            fontWeight: "900",
          }}
        >
          {label}
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
          {description}
        </Text>
      </View>

      <Ionicons
        name={
          selected
            ? "checkmark-circle"
            : "ellipse-outline"
        }
        size={21}
        color={
          selected
            ? HEAVENLY_GOLD
            : MUTED
        }
      />
    </Pressable>
  );
}

export default function NetworkPostEditor() {
  const navigation = useNavigation();
  const route = useRoute();

  const post =
    route.params?.post || null;

  const isAnnouncement =
    post?.post_type ===
    "announcement";

  const [title, setTitle] = useState(
    post?.title || ""
  );

  const [body, setBody] = useState(
    post?.body || ""
  );

  const [
    visibility,
    setVisibility,
  ] = useState(
    post?.visibility === "leadership"
      ? "leadership"
      : "members"
  );

  const [
    commentsEnabled,
    setCommentsEnabled,
  ] = useState(
    post?.comments_enabled !== false
  );

  const [saving, setSaving] =
    useState(false);

  const [
    saveError,
    setSaveError,
  ] = useState("");

  const cleanTitle = title.trim();
  const cleanBody = body.trim();

  const hasChanges = useMemo(() => {
    const originalTitle =
      String(
        post?.title || ""
      ).trim();

    const originalBody =
      String(
        post?.body || ""
      ).trim();

    const originalVisibility =
      post?.visibility === "leadership"
        ? "leadership"
        : "members";

    const originalCommentsEnabled =
      post?.comments_enabled !== false;

    return (
      cleanTitle !== originalTitle ||
      cleanBody !== originalBody ||
      visibility !==
        originalVisibility ||
      commentsEnabled !==
        originalCommentsEnabled
    );
  }, [
    cleanTitle,
    cleanBody,
    visibility,
    commentsEnabled,
    post,
  ]);

  const canSave =
    Boolean(post?.id) &&
    Boolean(cleanBody) &&
    (
      !isAnnouncement ||
      Boolean(cleanTitle)
    ) &&
    cleanTitle.length <= 180 &&
    cleanBody.length <= 10000 &&
    hasChanges &&
    !saving;

  async function handleSave() {
    if (!canSave) {
      return;
    }

    try {
      setSaving(true);
      setSaveError("");

      const {
        data,
        error,
      } = await supabase.rpc(
        "update_network_post_rpc",
        {
          target_post_id: post.id,
          requested_title:
            cleanTitle || null,
          requested_body:
            cleanBody,
          requested_visibility:
            visibility,
          requested_comments_enabled:
            commentsEnabled,
        }
      );

      if (error) {
        throw error;
      }

      console.log(
        "NETWORK POST UPDATE SUCCESS:",
        data
      );

      navigation.goBack();
    } catch (error) {
      console.log(
        "NETWORK POST UPDATE ERROR:",
        error
      );

      setSaveError(
        error?.message ||
          "Triunely could not update this Network content."
      );
    } finally {
      setSaving(false);
    }
  }

  if (!post?.id) {
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
        {() => (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent:
                "center",
              paddingHorizontal: 24,
            }}
          >
            <Ionicons
              name="warning-outline"
              size={34}
              color={DANGER}
            />

            <Text
              style={{
                fontFamily:
                  displayFont,
                color: TEXT,
                fontSize: 21,
                fontWeight: "900",
                textAlign: "center",
                marginTop: 12,
              }}
            >
              Content unavailable
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 12.5,
                fontWeight: "700",
                textAlign: "center",
                lineHeight: 19,
                marginTop: 6,
              }}
            >
              Triunely could not
              identify the Network
              content to edit.
            </Text>

            <Pressable
              onPress={() =>
                navigation.goBack()
              }
              style={({
                pressed,
              }) => ({
                minHeight: 46,
                borderRadius: 999,
                backgroundColor:
                  pressed
                    ? "#92400E"
                    : HEAVENLY_GOLD,
                paddingHorizontal: 22,
                alignItems: "center",
                justifyContent:
                  "center",
                marginTop: 18,
              })}
            >
              <Text
                style={{
                  color: SURFACE,
                  fontSize: 12.5,
                  fontWeight: "900",
                }}
              >
                Go Back
              </Text>
            </Pressable>
          </View>
        )}
      </Screen>
    );
  }

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
            flexGrow: 1,
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom:
              Math.max(
                bottomPad,
                20
              ) + 48,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 18,
            }}
          >
            <Pressable
              disabled={saving}
              onPress={() =>
                navigation.goBack()
              }
              hitSlop={10}
              style={({
                pressed,
              }) => ({
                width: 42,
                height: 42,
                borderRadius: 21,
                alignItems: "center",
                justifyContent:
                  "center",
                backgroundColor:
                  pressed
                    ? SOFT_OLIVE_BG
                    : SURFACE,
                borderWidth: 1,
                borderColor:
                  OLIVE_BORDER,
                marginRight: 12,
                opacity:
                  saving
                    ? 0.5
                    : 1,
              })}
            >
              <Ionicons
                name="chevron-back"
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
                  fontSize: 25,
                  lineHeight: 30,
                  fontWeight: "900",
                  letterSpacing: -0.4,
                }}
              >
                Edit{" "}
                {isAnnouncement
                  ? "Announcement"
                  : "Network Post"}
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 12,
                  fontWeight: "800",
                  marginTop: 2,
                }}
              >
                Update content and
                audience settings
              </Text>
            </View>
          </View>

          <View
            style={{
              ...premiumCardStyle,
              padding: 16,
              borderColor:
                isAnnouncement
                  ? GOLD_BORDER
                  : OLIVE_BORDER,
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
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor:
                    isAnnouncement
                      ? SOFT_GOLD_BG
                      : SOFT_OLIVE_BG,
                  borderWidth: 1,
                  borderColor:
                    isAnnouncement
                      ? GOLD_BORDER
                      : OLIVE_BORDER,
                  alignItems: "center",
                  justifyContent:
                    "center",
                  marginRight: 11,
                }}
              >
                <Ionicons
                  name={
                    isAnnouncement
                      ? "megaphone-outline"
                      : "document-text-outline"
                  }
                  size={22}
                  color={
                    isAnnouncement
                      ? HEAVENLY_GOLD
                      : DEEP_OLIVE
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
                    fontSize: 14,
                    fontWeight: "900",
                  }}
                >
                  {isAnnouncement
                    ? "Official announcement"
                    : "Network post"}
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
                  The content type
                  cannot be changed
                  after creation.
                </Text>
              </View>
            </View>
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
                color: TEXT,
                fontSize: 13,
                fontWeight: "900",
                marginBottom: 7,
              }}
            >
              Title
              {isAnnouncement
                ? " *"
                : ""}
            </Text>

            <TextInput
              value={title}
              onChangeText={setTitle}
              editable={!saving}
              placeholder={
                isAnnouncement
                  ? "Announcement title"
                  : "Optional post title"
              }
              placeholderTextColor="rgba(107, 114, 128, 0.72)"
              maxLength={180}
              returnKeyType="next"
              style={{
                minHeight: 50,
                borderRadius: 16,
                borderWidth: 1,
                borderColor:
                  isAnnouncement &&
                  !cleanTitle
                    ? DANGER_BORDER
                    : OLIVE_BORDER,
                backgroundColor:
                  SURFACE,
                paddingHorizontal: 14,
                color: TEXT,
                fontSize: 14,
                fontWeight: "700",
              }}
            />

            <Text
              style={{
                color:
                  cleanTitle.length >
                  180
                    ? DANGER
                    : MUTED,
                fontSize: 10.5,
                fontWeight: "800",
                textAlign: "right",
                marginTop: 5,
              }}
            >
              {cleanTitle.length}/180
            </Text>

            <Text
              style={{
                color: TEXT,
                fontSize: 13,
                fontWeight: "900",
                marginTop: 12,
                marginBottom: 7,
              }}
            >
              Content *
            </Text>

            <TextInput
              value={body}
              onChangeText={setBody}
              editable={!saving}
              placeholder="Write the Network content"
              placeholderTextColor="rgba(107, 114, 128, 0.72)"
              multiline
              textAlignVertical="top"
              maxLength={10000}
              scrollEnabled
              style={{
                minHeight: 190,
                borderRadius: 16,
                borderWidth: 1,
                borderColor:
                  !cleanBody
                    ? DANGER_BORDER
                    : OLIVE_BORDER,
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
              {body.length}/10,000
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
              Visibility
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
              Choose who can see
              this content in the
              Network feed.
            </Text>

            <VisibilityOption
              value="members"
              label="All Network members"
              description="Visible to joined members with feed access."
              icon="people-outline"
              selected={
                visibility ===
                "members"
              }
              onPress={
                setVisibility
              }
            />

            <VisibilityOption
              value="leadership"
              label="Leadership only"
              description="Visible only to authorised Network leadership."
              icon="shield-checkmark-outline"
              selected={
                visibility ===
                "leadership"
              }
              onPress={
                setVisibility
              }
            />
          </View>

          <View
            style={{
              ...premiumCardStyle,
              padding: 16,
              marginBottom: 14,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor:
                  SOFT_OLIVE_BG,
                borderWidth: 1,
                borderColor:
                  OLIVE_BORDER,
                alignItems: "center",
                justifyContent:
                  "center",
                marginRight: 11,
              }}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={21}
                color={DEEP_OLIVE}
              />
            </View>

            <View
              style={{
                flex: 1,
                marginRight: 10,
              }}
            >
              <Text
                style={{
                  color: TEXT,
                  fontSize: 13.5,
                  fontWeight: "900",
                }}
              >
                Allow comments
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
                Members can discuss
                and respond beneath
                this content.
              </Text>
            </View>

            <Switch
              value={
                commentsEnabled
              }
              onValueChange={
                setCommentsEnabled
              }
              disabled={saving}
              trackColor={{
                false:
                  "rgba(107, 114, 128, 0.26)",
                true:
                  "rgba(180, 83, 9, 0.34)",
              }}
              thumbColor={
                commentsEnabled
                  ? HEAVENLY_GOLD
                  : "#F3F4F6"
              }
            />
          </View>

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
            disabled={!canSave}
            onPress={handleSave}
            style={({ pressed }) => ({
              minHeight: 52,
              borderRadius: 999,
              backgroundColor:
                canSave
                  ? pressed
                    ? "#92400E"
                    : HEAVENLY_GOLD
                  : "rgba(107, 114, 128, 0.24)",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              opacity:
                saving
                  ? 0.76
                  : 1,
              marginBottom: 8,
            })}
          >
            {saving ? (
              <ActivityIndicator
                size="small"
                color={SURFACE}
              />
            ) : (
              <Ionicons
                name="checkmark-circle-outline"
                size={19}
                color={
                  canSave
                    ? SURFACE
                    : MUTED
                }
              />
            )}

            <Text
              style={{
                color:
                  canSave
                    ? SURFACE
                    : MUTED,
                fontSize: 13,
                fontWeight: "900",
                marginLeft: 8,
              }}
            >
              {saving
                ? "Saving Changes…"
                : hasChanges
                  ? "Save Changes"
                  : "No Changes"}
            </Text>
          </Pressable>
        </KeyboardAwareScrollView>
      )}
    </Screen>
  );
}