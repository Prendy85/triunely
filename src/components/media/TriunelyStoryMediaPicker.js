// src/components/media/TriunelyStoryMediaPicker.js
import { Ionicons } from "@expo/vector-icons";

import {
    Modal,
    Platform,
    Pressable,
    Text,
    View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";

const CARD_BORDER =
  "rgba(15, 23, 42, 0.10)";

const AMBER_SOFT =
  "rgba(180, 83, 9, 0.10)";

const AMBER_BORDER =
  "rgba(180, 83, 9, 0.18)";

const OLIVE_SOFT =
  "rgba(79, 99, 59, 0.10)";

const OLIVE_BORDER =
  "rgba(79, 99, 59, 0.18)";

const OVERLAY =
  "rgba(15, 23, 42, 0.48)";

const displayFont =
  Platform.OS === "ios"
    ? "Georgia"
    : "serif";

function StoryMediaOption({
  icon,
  title,
  subtitle,
  tone = "olive",
  onPress,
}) {
  const isAmber =
    tone === "amber";

  const accent =
    isAmber
      ? EVENT_BROWN
      : OLIVE;

  const background =
    isAmber
      ? AMBER_SOFT
      : OLIVE_SOFT;

  const border =
    isAmber
      ? AMBER_BORDER
      : OLIVE_BORDER;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 76,
        borderRadius: 20,
        padding: 13,
        backgroundColor:
          pressed
            ? background
            : SURFACE,
        borderWidth: 1,
        borderColor:
          CARD_BORDER,
        flexDirection: "row",
        alignItems: "center",
        opacity:
          pressed ? 0.84 : 1,
      })}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 17,
          backgroundColor:
            background,
          borderWidth: 1,
          borderColor: border,
          alignItems: "center",
          justifyContent:
            "center",
          marginRight: 12,
        }}
      >
        <Ionicons
          name={icon}
          size={23}
          color={accent}
        />
      </View>

      <View
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <Text
          style={{
            color: TEXT,
            fontSize: 15,
            lineHeight: 19,
            fontWeight: "900",
          }}
        >
          {title}
        </Text>

        <Text
          style={{
            color: MUTED,
            fontSize: 12,
            lineHeight: 17,
            fontWeight: "700",
            marginTop: 3,
          }}
        >
          {subtitle}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={19}
        color={accent}
        style={{
          marginLeft: 8,
        }}
      />
    </Pressable>
  );
}

export default function TriunelyStoryMediaPicker({
  visible,
  mode = "type",
  onClose,
  onChoosePhoto,
  onChooseVideo,
  onChooseGallery,
  onChooseCamera,
}) {
  const insets =
    useSafeAreaInsets();

  const choosingSource =
    mode === "photo-source" ||
    mode === "video-source";

  const isVideoSource =
    mode === "video-source";

  const title =
    choosingSource
      ? isVideoSource
        ? "Add a video Story"
        : "Add a photo Story"
      : "Create a Story";

  const subtitle =
    choosingSource
      ? isVideoSource
        ? "Choose an existing video or record a new one."
        : "Choose an existing image or take a new photo."
      : "Share a moment from your Christian life.";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor:
            OVERLAY,
          justifyContent:
            "flex-end",
        }}
      >
        <Pressable
          style={{
            flex: 1,
          }}
          onPress={onClose}
        />

        <View
          style={{
            backgroundColor:
              PREMIUM_CREAM,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            paddingTop: 10,
            paddingHorizontal: 16,
            paddingBottom:
              Math.max(
                insets.bottom,
                14
              ) + 8,
            borderWidth: 1,
            borderColor:
              CARD_BORDER,
          }}
        >
          <View
            style={{
              width: 44,
              height: 5,
              borderRadius: 999,
              alignSelf: "center",
              backgroundColor:
                "rgba(107,114,128,0.28)",
              marginBottom: 14,
            }}
          />

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 15,
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
                  color: TEXT,
                  fontFamily:
                    displayFont,
                  fontSize: 23,
                  lineHeight: 28,
                  fontWeight: "900",
                  letterSpacing: -0.4,
                }}
              >
                {title}
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 12.5,
                  lineHeight: 18,
                  fontWeight: "700",
                  marginTop: 4,
                }}
              >
                {subtitle}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 42,
                height: 42,
                borderRadius: 16,
                backgroundColor:
                  pressed
                    ? OLIVE_SOFT
                    : SURFACE,
                borderWidth: 1,
                borderColor:
                  CARD_BORDER,
                alignItems: "center",
                justifyContent:
                  "center",
                marginLeft: 12,
              })}
            >
              <Ionicons
                name="close"
                size={22}
                color={OLIVE}
              />
            </Pressable>
          </View>

          <View
            style={{
              gap: 10,
            }}
          >
            {!choosingSource ? (
              <>
                <StoryMediaOption
                  icon="image-outline"
                  title="Add Photo"
                  subtitle="Choose or take a photo, then position it for your Story."
                  tone="olive"
                  onPress={
                    onChoosePhoto
                  }
                />

                <StoryMediaOption
                  icon="videocam-outline"
                  title="Add Video"
                  subtitle="Choose or record a short video Story."
                  tone="amber"
                  onPress={
                    onChooseVideo
                  }
                />
              </>
            ) : (
              <>
                <StoryMediaOption
                  icon={
                    isVideoSource
                      ? "film-outline"
                      : "images-outline"
                  }
                  title={
                    isVideoSource
                      ? "Choose from Gallery"
                      : "Choose from Photos"
                  }
                  subtitle={
                    isVideoSource
                      ? "Select a video already saved on your device."
                      : "Select an image already saved on your device."
                  }
                  tone="olive"
                  onPress={
                    onChooseGallery
                  }
                />

                <StoryMediaOption
                  icon={
                    isVideoSource
                      ? "videocam-outline"
                      : "camera-outline"
                  }
                  title={
                    isVideoSource
                      ? "Record Video"
                      : "Take Photo"
                  }
                  subtitle={
                    isVideoSource
                      ? "Record a new short video using your camera."
                      : "Capture a new photo using your camera."
                  }
                  tone="amber"
                  onPress={
                    onChooseCamera
                  }
                />
              </>
            )}
          </View>

          {choosingSource ? (
            <Pressable
              onPress={
                onChoosePhoto
              }
              style={({ pressed }) => ({
                marginTop: 12,
                minHeight: 46,
                borderRadius: 999,
                backgroundColor:
                  pressed
                    ? OLIVE_SOFT
                    : SURFACE,
                borderWidth: 1,
                borderColor:
                  CARD_BORDER,
                alignItems: "center",
                justifyContent:
                  "center",
                flexDirection: "row",
              })}
            >
              <Ionicons
                name="arrow-back"
                size={18}
                color={OLIVE}
                style={{
                  marginRight: 7,
                }}
              />

              <Text
                style={{
                  color: OLIVE,
                  fontSize: 13,
                  fontWeight: "900",
                }}
              >
                Back
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}