// C:\triunely\src\components\NetworkPostActionsSheet.js

import { Ionicons } from "@expo/vector-icons";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SURFACE = "#FFFFFF";
const PREMIUM_CREAM = "#FFFCF5";
const HEAVENLY_GOLD = "#B45309";
const EVENT_BROWN = "#7C2D12";
const DEEP_OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";
const DANGER = "#B91C1C";

const SOFT_GOLD_BG = "rgba(180, 83, 9, 0.10)";
const GOLD_BORDER = "rgba(180, 83, 9, 0.18)";
const SOFT_OLIVE_BG = "rgba(79, 99, 59, 0.10)";
const OLIVE_BORDER = "rgba(79, 99, 59, 0.18)";
const SOFT_DANGER_BG = "rgba(185, 28, 28, 0.08)";
const DANGER_BORDER = "rgba(185, 28, 28, 0.18)";
const CARD_BORDER = "rgba(15, 23, 42, 0.08)";
const OVERLAY = "rgba(15, 23, 42, 0.48)";
const SHADOW = "rgba(15, 23, 42, 0.18)";

const displayFont = Platform.OS === "ios" ? "Georgia" : "serif";

function ActionRow({
  icon,
  title,
  description,
  onPress,
  tone = "olive",
  disabled = false,
}) {
  const isGold = tone === "gold";
  const isDanger = tone === "danger";

  const accent = isDanger
    ? DANGER
    : isGold
      ? HEAVENLY_GOLD
      : DEEP_OLIVE;

  const background = isDanger
    ? SOFT_DANGER_BG
    : isGold
      ? SOFT_GOLD_BG
      : SOFT_OLIVE_BG;

  const border = isDanger
    ? DANGER_BORDER
    : isGold
      ? GOLD_BORDER
      : OLIVE_BORDER;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 64,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: border,
        backgroundColor: pressed ? background : SURFACE,
        paddingHorizontal: 13,
        paddingVertical: 11,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 9,
        opacity: disabled ? 0.48 : 1,
        transform: [
          {
            translateY: pressed ? 1 : 0,
          },
        ],
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: background,
          borderWidth: 1,
          borderColor: border,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 11,
        }}
      >
        <Ionicons
          name={icon}
          size={20}
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
            color: isDanger ? DANGER : TEXT,
            fontSize: 13.5,
            fontWeight: "900",
          }}
        >
          {title}
        </Text>

        {description ? (
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
        ) : null}
      </View>

      <Ionicons
        name="chevron-forward"
        size={17}
        color={accent}
      />
    </Pressable>
  );
}

export default function NetworkPostActionsSheet({
  visible,
  post,
  busy = false,
  canEdit = true,
  canModerate = true,
  canDelete = true,
  onClose,
  onEdit,
  onTogglePin,
  onTogglePublication,
  onArchive,
  onRestore,
  onDelete,
}) {
  const insets =
    useSafeAreaInsets();

  if (!visible || !post) {
    return null;
  }

  const publicationStatus =
    post.publication_status ||
    "published";

  const isPublished =
    publicationStatus ===
    "published";

  const isDraft =
    publicationStatus ===
    "draft";

  const isArchived =
    Boolean(post.archived_at);

  const isDeleted =
    Boolean(post.deleted_at);

  const isPinned =
    Boolean(post.is_pinned);

  const isAnnouncement =
    post.post_type ===
    "announcement";

  function runAction(callback) {
    if (
      busy ||
      typeof callback !==
        "function"
    ) {
      return;
    }

    callback(post);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={
        busy
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
        onPress={
          busy
            ? undefined
            : onClose
        }
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor:
            OVERLAY,
        }}
      />

      <View
        style={{
          backgroundColor:
            PREMIUM_CREAM,
          borderTopLeftRadius:
            28,
          borderTopRightRadius:
            28,
          borderWidth: 1,
          borderColor:
            CARD_BORDER,
          paddingHorizontal: 16,
          paddingTop: 11,
          paddingBottom:
            Math.max(
              insets.bottom,
              14
            ) + 10,
          shadowColor: SHADOW,
          shadowOpacity: 0.22,
          shadowRadius: 20,
          shadowOffset: {
            width: 0,
            height: -6,
          },
          elevation: 18,
          maxHeight: "88%",
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
            marginBottom: 14,
          }}
        />

        <View
          style={{
            flexDirection: "row",
            alignItems:
              "flex-start",
            marginBottom: 15,
          }}
        >
          <View
            style={{
              width: 47,
              height: 47,
              borderRadius: 24,
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
              size={23}
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
              minWidth: 0,
            }}
          >
            <Text
              style={{
                fontFamily:
                  displayFont,
                color: TEXT,
                fontSize: 21,
                lineHeight: 26,
                fontWeight: "900",
              }}
            >
              Manage{" "}
              {isAnnouncement
                ? "announcement"
                : "Network post"}
            </Text>

            <Text
              numberOfLines={2}
              style={{
                color: MUTED,
                fontSize: 12,
                fontWeight: "700",
                lineHeight: 17,
                marginTop: 3,
              }}
            >
              {post.title ||
                post.body ||
                "Network content"}
            </Text>
          </View>

          <Pressable
            disabled={busy}
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 19,
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
              marginLeft: 8,
              opacity:
                busy ? 0.5 : 1,
            })}
          >
            <Ionicons
              name="close"
              size={20}
              color={DEEP_OLIVE}
            />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{
            paddingBottom: 2,
          }}
        >
        {canEdit &&
        !isDeleted &&
        !isArchived ? (
          <ActionRow
            icon="create-outline"
            title="Edit content"
            description="Update the title, body, visibility or comment setting."
            onPress={() =>
              runAction(onEdit)
            }
            disabled={busy}
          />
        ) : null}

        {canModerate &&
        !isDeleted &&
        !isArchived &&
        isPublished ? (
          <ActionRow
            icon={
              isPinned
                ? "pin"
                : "pin-outline"
            }
            title={
              isPinned
                ? "Unpin content"
                : "Pin content"
            }
            description={
              isPinned
                ? "Remove this item from the pinned position."
                : "Keep this item prominent above newer content."
            }
            tone="gold"
            onPress={() =>
              runAction(
                onTogglePin
              )
            }
            disabled={busy}
          />
        ) : null}

        {canModerate &&
        !isDeleted &&
        !isArchived ? (
          <ActionRow
            icon={
              isDraft
                ? "paper-plane-outline"
                : "document-outline"
            }
            title={
              isDraft
                ? "Publish content"
                : "Move to drafts"
            }
            description={
              isDraft
                ? "Make this content visible to its selected audience."
                : "Remove this content from the live feed without archiving it."
            }
            tone="gold"
            onPress={() =>
              runAction(
                onTogglePublication
              )
            }
            disabled={busy}
          />
        ) : null}

        {canModerate &&
        !isDeleted &&
        !isArchived ? (
          <ActionRow
            icon="archive-outline"
            title="Archive content"
            description="Remove this item from active content while preserving it."
            onPress={() =>
              runAction(
                onArchive
              )
            }
            disabled={busy}
          />
        ) : null}

        {canModerate &&
        !isDeleted &&
        isArchived ? (
          <ActionRow
            icon="refresh-outline"
            title="Restore content"
            description="Return this item to active Network content."
            onPress={() =>
              runAction(
                onRestore
              )
            }
            disabled={busy}
          />
        ) : null}

        {canDelete &&
        !isDeleted ? (
          <ActionRow
            icon="trash-outline"
            title="Delete content"
            description="Soft-delete this item and preserve its governance history."
            tone="danger"
            onPress={() =>
              runAction(
                onDelete
              )
            }
            disabled={busy}
          />
        ) : null}

        {isDeleted ? (
          <View
            style={{
              borderRadius: 18,
              borderWidth: 1,
              borderColor:
                DANGER_BORDER,
              backgroundColor:
                SOFT_DANGER_BG,
              padding: 15,
              flexDirection:
                "row",
              alignItems:
                "flex-start",
            }}
          >
            <Ionicons
              name="information-circle-outline"
              size={21}
              color={DANGER}
            />

            <Text
              style={{
                flex: 1,
                color: MUTED,
                fontSize: 12,
                fontWeight: "700",
                lineHeight: 18,
                marginLeft: 9,
              }}
            >
              This content has been soft-deleted. It remains
              preserved for governance history and cannot currently
              be edited or restored from this screen.
            </Text>
          </View>
        ) : null}

        {busy ? (
          <View
            style={{
              borderRadius: 16,
              backgroundColor:
                SOFT_GOLD_BG,
              borderWidth: 1,
              borderColor:
                GOLD_BORDER,
              paddingVertical: 11,
              paddingHorizontal: 13,
              marginTop: 3,
              flexDirection:
                "row",
              alignItems:
                "center",
              justifyContent:
                "center",
            }}
          >
            <Ionicons
              name="sync-outline"
              size={17}
              color={
                HEAVENLY_GOLD
              }
            />

            <Text
              style={{
                color:
                  EVENT_BROWN,
                fontSize: 12,
                fontWeight: "900",
                marginLeft: 7,
              }}
            >
              Updating Network content…
            </Text>
          </View>
        ) : null}
        </ScrollView>
      </View>
      </View>
    </Modal>
  );
}