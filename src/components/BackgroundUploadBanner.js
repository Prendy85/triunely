// src/components/BackgroundUploadBanner.js
import { Ionicons } from "@expo/vector-icons";
import {
    ActivityIndicator,
    Platform,
    Pressable,
    Text,
    View,
} from "react-native";
import {
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
    useBackgroundUploads,
} from "../context/BackgroundUploadProvider";

const SURFACE = "#FFFFFF";
const PREMIUM_CREAM = "#FFFCF5";
const HEAVENLY_GOLD = "#B45309";
const DEEP_OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";
const DANGER = "#B91C1C";

const CARD_BORDER =
  "rgba(15, 23, 42, 0.10)";

const GOLD_BORDER =
  "rgba(180, 83, 9, 0.20)";

const OLIVE_BORDER =
  "rgba(79, 99, 59, 0.18)";

const DANGER_BORDER =
  "rgba(185, 28, 28, 0.20)";

const SOFT_GOLD_BG =
  "rgba(180, 83, 9, 0.10)";

const SOFT_OLIVE_BG =
  "rgba(79, 99, 59, 0.10)";

const SOFT_DANGER_BG =
  "rgba(185, 28, 28, 0.08)";

function getStatusAppearance(
  status
) {
  if (status === "completed") {
    return {
      icon:
        "checkmark-circle",
      accent:
        DEEP_OLIVE,
      border:
        OLIVE_BORDER,
      background:
        SOFT_OLIVE_BG,
      label:
        "Completed",
    };
  }

  if (status === "failed") {
    return {
      icon:
        "warning-outline",
      accent:
        DANGER,
      border:
        DANGER_BORDER,
      background:
        SOFT_DANGER_BG,
      label:
        "Upload failed",
    };
  }

  return {
    icon:
      "cloud-upload-outline",
    accent:
      HEAVENLY_GOLD,
    border:
      GOLD_BORDER,
    background:
      SOFT_GOLD_BG,
    label:
      "Uploading in background",
  };
}

export default function BackgroundUploadBanner() {
  const insets =
    useSafeAreaInsets();

  const {
    visibleUploads,
    hideUpload,
    removeUpload,
  } =
    useBackgroundUploads();

  const upload =
    visibleUploads?.[0] ||
    null;

  if (!upload) {
    return null;
  }

  const appearance =
    getStatusAppearance(
      upload.status
    );

  const progress =
    Math.max(
      0,
      Math.min(
        1,
        Number(
          upload.progress
        ) || 0
      )
    );

  const percentage =
    Math.round(
      progress * 100
    );

  const isUploading =
    upload.status ===
    "uploading";

  const isFinished =
    upload.status ===
      "completed" ||
    upload.status ===
      "failed";

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 5000,
        elevation: 5000,
        paddingTop:
          Math.max(
            insets.top,
            Platform.OS ===
              "android"
              ? 8
              : 0
          ),
        paddingHorizontal:
          10,
      }}
    >
      <View
        style={{
          backgroundColor:
            SURFACE,
          borderRadius: 18,
          borderWidth: 1,
          borderColor:
            appearance.border,
          shadowColor:
            "#000000",
          shadowOpacity:
            0.16,
          shadowRadius: 12,
          shadowOffset: {
            width: 0,
            height: 5,
          },
          elevation: 7,
          overflow:
            "hidden",
        }}
      >
        <View
          style={{
            flexDirection:
              "row",
            alignItems:
              "center",
            paddingHorizontal:
              13,
            paddingTop: 12,
            paddingBottom:
              10,
            backgroundColor:
              PREMIUM_CREAM,
          }}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              alignItems:
                "center",
              justifyContent:
                "center",
              backgroundColor:
                appearance
                  .background,
              borderWidth: 1,
              borderColor:
                appearance
                  .border,
              marginRight: 10,
            }}
          >
            {isUploading ? (
              <ActivityIndicator
                size="small"
                color={
                  appearance.accent
                }
              />
            ) : (
              <Ionicons
                name={
                  appearance.icon
                }
                size={22}
                color={
                  appearance.accent
                }
              />
            )}
          </View>

          <View
            style={{
              flex: 1,
              paddingRight: 8,
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                color: TEXT,
                fontSize: 13.5,
                fontWeight:
                  "900",
              }}
            >
              {upload.title}
            </Text>

            <Text
              numberOfLines={2}
              style={{
                color: MUTED,
                fontSize: 11.5,
                lineHeight: 16,
                fontWeight:
                  "700",
                marginTop: 2,
              }}
            >
              {upload.errorMessage
                ? upload.errorMessage
                : upload.subtitle ||
                  appearance.label}
            </Text>
          </View>

          <View
            style={{
              alignItems:
                "flex-end",
              justifyContent:
                "center",
            }}
          >
            {isUploading ? (
              <Text
                style={{
                  color:
                    appearance
                      .accent,
                  fontSize: 12,
                  fontWeight:
                    "900",
                  marginBottom: 5,
                }}
              >
                {percentage}%
              </Text>
            ) : null}

            <Pressable
              onPress={() => {
                if (
                  isFinished
                ) {
                  removeUpload(
                    upload.id
                  );

                  return;
                }

                hideUpload(
                  upload.id
                );
              }}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={
                isFinished
                  ? "Dismiss upload message"
                  : "Hide upload progress"
              }
              style={({
                pressed,
              }) => ({
                width: 34,
                height: 34,
                borderRadius:
                  17,
                alignItems:
                  "center",
                justifyContent:
                  "center",
                backgroundColor:
                  pressed
                    ? "rgba(79, 99, 59, 0.10)"
                    : "transparent",
              })}
            >
              <Ionicons
                name="close"
                size={19}
                color={MUTED}
              />
            </Pressable>
          </View>
        </View>

        {isUploading ? (
          <View
            style={{
              height: 5,
              backgroundColor:
                "rgba(107, 114, 128, 0.16)",
            }}
          >
            <View
              style={{
                width:
                  `${percentage}%`,
                height: "100%",
                backgroundColor:
                  HEAVENLY_GOLD,
              }}
            />
          </View>
        ) : null}

        {visibleUploads.length >
        1 ? (
          <View
            style={{
              minHeight: 30,
              backgroundColor:
                SURFACE,
              borderTopWidth:
                1,
              borderTopColor:
                CARD_BORDER,
              paddingHorizontal:
                13,
              alignItems:
                "center",
              flexDirection:
                "row",
            }}
          >
            <Ionicons
              name="layers-outline"
              size={14}
              color={MUTED}
            />

            <Text
              style={{
                color: MUTED,
                fontSize: 10.5,
                fontWeight:
                  "800",
                marginLeft: 6,
              }}
            >
              {visibleUploads.length -
                1}{" "}
              more upload
              {visibleUploads.length -
                1 ===
              1
                ? ""
                : "s"}{" "}
              in progress
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}