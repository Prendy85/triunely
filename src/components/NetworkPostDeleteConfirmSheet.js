// C:\triunely\src\components\NetworkPostDeleteConfirmSheet.js

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    Modal,
    Platform,
    Pressable,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "../lib/supabase";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const DANGER = "#B91C1C";
const TEXT = "#1F2933";
const MUTED = "#6B7280";
const DEEP_OLIVE = "#4F633B";

const SOFT_DANGER_BG = "rgba(185, 28, 28, 0.08)";
const DANGER_BORDER = "rgba(185, 28, 28, 0.18)";
const SOFT_OLIVE_BG = "rgba(79, 99, 59, 0.10)";
const OLIVE_BORDER = "rgba(79, 99, 59, 0.18)";
const CARD_BORDER = "rgba(15, 23, 42, 0.08)";
const OVERLAY = "rgba(15, 23, 42, 0.54)";
const SHADOW = "rgba(15, 23, 42, 0.20)";

const displayFont =
  Platform.OS === "ios" ? "Georgia" : "serif";

export default function NetworkPostDeleteConfirmSheet({
  visible,
  post,
  onClose,
  onDeleted,
}) {
  const insets = useSafeAreaInsets();

  const [deleting, setDeleting] =
    React.useState(false);

  const [deleteError, setDeleteError] =
    React.useState("");

  if (!visible || !post) {
    return null;
  }

  const isAnnouncement =
    post.post_type === "announcement";

  async function handleDelete() {
    if (!post?.id || deleting) {
      return;
    }

    try {
      setDeleting(true);
      setDeleteError("");

      const { data, error } = await supabase.rpc(
        "soft_delete_network_post_rpc",
        {
          target_post_id: post.id,
        }
      );

      if (error) {
        throw error;
      }

      console.log(
        "NETWORK POST SOFT DELETE SUCCESS:",
        data
      );

      onDeleted?.(data);
    } catch (error) {
      console.log(
        "NETWORK POST SOFT DELETE ERROR:",
        error
      );

      setDeleteError(
        error?.message ||
          "Triunely could not delete this content."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={
        deleting
          ? undefined
          : onClose
      }
    >
      <View
        style={{
          flex: 1,
          justifyContent:
            "flex-end",
        }}
      >
      <Pressable
        onPress={deleting ? undefined : onClose}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: OVERLAY,
        }}
      />

      <View
        style={{
          backgroundColor: PREMIUM_CREAM,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          paddingHorizontal: 17,
          paddingTop: 11,
          paddingBottom:
            Math.max(insets.bottom, 14) + 10,
          shadowColor: SHADOW,
          shadowOpacity: 0.24,
          shadowRadius: 20,
          shadowOffset: {
            width: 0,
            height: -6,
          },
          elevation: 20,
        }}
      >
        <View
          style={{
            width: 44,
            height: 5,
            borderRadius: 999,
            backgroundColor:
              "rgba(79, 99, 59, 0.24)",
            alignSelf: "center",
            marginBottom: 17,
          }}
        />

        <View
          style={{
            width: 58,
            height: 58,
            borderRadius: 29,
            backgroundColor: SOFT_DANGER_BG,
            borderWidth: 1,
            borderColor: DANGER_BORDER,
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "center",
          }}
        >
          <Ionicons
            name="trash-outline"
            size={27}
            color={DANGER}
          />
        </View>

        <Text
          style={{
            fontFamily: displayFont,
            color: TEXT,
            fontSize: 22,
            lineHeight: 27,
            fontWeight: "900",
            textAlign: "center",
            marginTop: 14,
          }}
        >
          Delete{" "}
          {isAnnouncement
            ? "announcement"
            : "Network post"}?
        </Text>

        <Text
          style={{
            color: MUTED,
            fontSize: 12.5,
            fontWeight: "700",
            lineHeight: 19,
            textAlign: "center",
            marginTop: 7,
            paddingHorizontal: 8,
          }}
        >
          This content will be removed from the
          Network feed and moved to Deleted. Its
          governance history will remain preserved.
        </Text>

        <View
          style={{
            borderRadius: 17,
            backgroundColor: SURFACE,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            padding: 13,
            marginTop: 16,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              color: TEXT,
              fontSize: 13,
              fontWeight: "900",
            }}
          >
            {post.title ||
              (isAnnouncement
                ? "Official announcement"
                : "Network post")}
          </Text>

          <Text
            numberOfLines={2}
            style={{
              color: MUTED,
              fontSize: 11.5,
              fontWeight: "700",
              lineHeight: 17,
              marginTop: 4,
            }}
          >
            {post.body || ""}
          </Text>
        </View>

        {deleteError ? (
          <View
            style={{
              borderRadius: 16,
              backgroundColor: SOFT_DANGER_BG,
              borderWidth: 1,
              borderColor: DANGER_BORDER,
              padding: 12,
              marginTop: 12,
              flexDirection: "row",
              alignItems: "flex-start",
            }}
          >
            <Ionicons
              name="warning-outline"
              size={19}
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
              {deleteError}
            </Text>
          </View>
        ) : null}

        <View
          style={{
            flexDirection: "row",
            gap: 10,
            marginTop: 17,
          }}
        >
          <Pressable
            disabled={deleting}
            onPress={onClose}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 48,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: OLIVE_BORDER,
              backgroundColor: pressed
                ? SOFT_OLIVE_BG
                : SURFACE,
              alignItems: "center",
              justifyContent: "center",
              opacity: deleting ? 0.5 : 1,
            })}
          >
            <Text
              style={{
                color: DEEP_OLIVE,
                fontSize: 12.5,
                fontWeight: "900",
              }}
            >
              Keep Content
            </Text>
          </Pressable>

          <Pressable
            disabled={deleting}
            onPress={handleDelete}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 48,
              borderRadius: 999,
              backgroundColor: pressed
                ? "#991B1B"
                : DANGER,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              opacity: deleting ? 0.72 : 1,
            })}
          >
            <Ionicons
              name={
                deleting
                  ? "sync-outline"
                  : "trash-outline"
              }
              size={17}
              color={SURFACE}
            />

            <Text
              style={{
                color: SURFACE,
                fontSize: 12.5,
                fontWeight: "900",
                marginLeft: 7,
              }}
            >
              {deleting
                ? "Deleting…"
                : "Delete Content"}
            </Text>
          </Pressable>
        </View>
      </View>
      </View>
    </Modal>
  );
}