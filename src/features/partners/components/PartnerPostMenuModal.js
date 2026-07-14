// src/features/partners/components/PartnerPostMenuModal.js
import { Ionicons } from "@expo/vector-icons";
import {
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";

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

const displayFont =
  Platform.OS === "ios" ? "Georgia" : "serif";

const serifHeading = {
  fontFamily: displayFont,
  color: TEXT,
  fontWeight: "900",
  letterSpacing: -0.45,
};

function MenuAction({
  icon,
  title,
  description,
  onPress,
  amber = false,
}) {
  const backgroundColor = amber
    ? AMBER_SOFT
    : SURFACE;

  const borderColor = amber
    ? AMBER_BORDER
    : CARD_BORDER;

  const iconBackground = amber
    ? EVENT_AMBER
    : OLIVE_SOFT;

  const iconBorder = amber
    ? EVENT_AMBER
    : OLIVE_BORDER;

  const iconColor = amber
    ? SURFACE
    : OLIVE;

  const titleColor = amber
    ? EVENT_BROWN
    : TEXT;

  const chevronColor = amber
    ? EVENT_BROWN
    : MUTED;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: 18,
        padding: 13,
        backgroundColor,
        borderWidth: 1,
        borderColor,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 9,
        opacity: pressed ? 0.84 : 1,
      })}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: iconBackground,
          borderWidth: 1,
          borderColor: iconBorder,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 11,
        }}
      >
        <Ionicons
          name={icon}
          size={18}
          color={iconColor}
        />
      </View>

      <View
        style={{
          flex: 1,
        }}
      >
        <Text
          style={{
            color: titleColor,
            fontSize: 14,
            fontWeight: "900",
          }}
        >
          {title}
        </Text>

        <Text
          style={{
            color: MUTED,
            fontSize: 12.5,
            fontWeight: "700",
            lineHeight: 17,
            marginTop: 2,
          }}
        >
          {description}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={chevronColor}
      />
    </Pressable>
  );
}

export default function PartnerPostMenuModal({
  visible = false,
  selectedPost = null,
  bottomPad = 0,
  onClose,
  onEditPost,
  onBoostPost,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor:
            "rgba(15, 23, 42, 0.34)",
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor:
              PREMIUM_CREAM,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: Math.max(
              bottomPad + 22,
              34
            ),
            borderTopWidth: 1,
            borderColor: CARD_BORDER,
            shadowColor: "#000000",
            shadowOpacity: 0.18,
            shadowRadius: 18,
            shadowOffset: {
              width: 0,
              height: -6,
            },
            elevation: 10,
            maxHeight: "82%",
          }}
        >
          <View
            style={{
              width: 44,
              height: 5,
              borderRadius: 999,
              backgroundColor:
                "rgba(107, 114, 128, 0.35)",
              alignSelf: "center",
              marginBottom: 14,
            }}
          />

          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
            contentContainerStyle={{
              paddingBottom: 8,
            }}
          >
            <Text
              style={{
                ...serifHeading,
                fontSize: 23,
                lineHeight: 28,
              }}
            >
              Partner Post
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
              numberOfLines={3}
            >
              {selectedPost?.title ||
                selectedPost?.content ||
                "Manage this Partner Post."}
            </Text>

            <MenuAction
              icon="pencil-outline"
              title="Edit post"
              description="Update the wording, link or post type."
              onPress={onEditPost}
            />

            <MenuAction
              icon="trending-up-outline"
              title="Boost post"
              description="Promote this post to reach more Christians."
              onPress={onBoostPost}
              amber
            />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}