// src/components/CommunityShareSheet.js
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const DEEP_OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";
const CARD_BORDER = "rgba(15, 23, 42, 0.08)";
const AMBER_BORDER = "rgba(180, 83, 9, 0.20)";
const SOFT_GOLD_BG = "rgba(180, 83, 9, 0.10)";
const SOFT_OLIVE_BG = "rgba(79, 99, 59, 0.10)";

function ShareOption({
  icon,
  title,
  subtitle,
  onPress,
  disabled = false,
  accent = "olive",
}) {
  const isAmber = accent === "amber";

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 13,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: isAmber ? AMBER_BORDER : CARD_BORDER,
        backgroundColor: pressed
          ? isAmber
            ? SOFT_GOLD_BG
            : SOFT_OLIVE_BG
          : SURFACE,
        opacity: disabled ? 0.45 : 1,
      })}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isAmber ? SOFT_GOLD_BG : SOFT_OLIVE_BG,
        }}
      >
        <Ionicons
          name={icon}
          size={21}
          color={isAmber ? EVENT_AMBER : DEEP_OLIVE}
        />
      </View>

      <View
        style={{
          flex: 1,
          marginLeft: 12,
        }}
      >
        <Text
          style={{
            color: TEXT,
            fontSize: 14,
            fontWeight: "900",
          }}
        >
          {title}
        </Text>

        {!!subtitle && (
          <Text
            style={{
              color: MUTED,
              fontSize: 11.5,
              lineHeight: 16,
              fontWeight: "600",
              marginTop: 3,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={disabled ? "#B8B8B8" : MUTED}
      />
    </Pressable>
  );
}

function OriginalPostPreview({ post }) {
  if (!post) return null;

  const previewText =
    String(post.content || "").trim() ||
    String(post.link_title || "").trim() ||
    "Shared Community post";

  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        backgroundColor: PREMIUM_CREAM,
        padding: 13,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: SOFT_OLIVE_BG,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={15}
            color={DEEP_OLIVE}
          />
        </View>

        <Text
          style={{
            color: DEEP_OLIVE,
            fontSize: 11.5,
            fontWeight: "900",
            marginLeft: 8,
          }}
        >
          Original Community post
        </Text>
      </View>

      <Text
        numberOfLines={4}
        style={{
          color: TEXT,
          fontSize: 13,
          lineHeight: 19,
          fontWeight: "650",
        }}
      >
        {previewText}
      </Text>

      {!!post.media_url && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 9,
          }}
        >
          <Ionicons
            name={
              post.media_type === "video"
                ? "videocam-outline"
                : "image-outline"
            }
            size={15}
            color={EVENT_AMBER}
          />

          <Text
            style={{
              color: MUTED,
              fontSize: 11,
              fontWeight: "700",
              marginLeft: 5,
            }}
          >
            {post.media_type === "video"
              ? "Includes a video"
              : "Includes an image"}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function CommunityShareSheet({
  visible,
  post,
  sharingToFeed = false,
  onClose,
  onConfirmFeedShare,
  onSendInMessage,
  onShareExternally,
  onCopyLink,
}) {
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState("options");
  const [commentary, setCommentary] = useState("");

  useEffect(() => {
    if (visible) {
      setMode("options");
      setCommentary("");
    }
  }, [visible, post?.id]);

  function handleClose() {
    if (sharingToFeed) return;

    setMode("options");
    setCommentary("");
    onClose?.();
  }

  function handleConfirmFeedShare() {
    onConfirmFeedShare?.(commentary.trim());
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
        keyboardVerticalOffset={0}
        style={{
          flex: 1,
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          onPress={handleClose}
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: "rgba(15, 23, 42, 0.54)",
          }}
        />

        <View
          style={{
            maxHeight: "88%",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            backgroundColor: PREMIUM_CREAM,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 24,
            shadowOffset: {
              width: 0,
              height: -8,
            },
            elevation: 18,
          }}
        >
          <View
            style={{
              alignItems: "center",
              paddingTop: 10,
            }}
          >
            <View
              style={{
                width: 46,
                height: 5,
                borderRadius: 999,
                backgroundColor: "rgba(79, 99, 59, 0.24)",
              }}
            />
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios"
                ? "interactive"
                : "on-drag"
            }
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: Math.max(insets.bottom + 16, 32),
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 15,
              }}
            >
              {mode === "feed" ? (
                <Pressable
                  disabled={sharingToFeed}
                  onPress={() => setMode("options")}
                  hitSlop={10}
                  style={({ pressed }) => ({
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: pressed
                      ? SOFT_OLIVE_BG
                      : SURFACE,
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                  })}
                >
                  <Ionicons
                    name="arrow-back"
                    size={21}
                    color={DEEP_OLIVE}
                  />
                </Pressable>
              ) : (
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: SOFT_GOLD_BG,
                  }}
                >
                  <Ionicons
                    name="share-social-outline"
                    size={21}
                    color={EVENT_AMBER}
                  />
                </View>
              )}

              <View
                style={{
                  flex: 1,
                  marginLeft: 11,
                }}
              >
                <Text
                  style={{
                    color: TEXT,
                    fontSize: 18,
                    fontWeight: "900",
                  }}
                >
                  {mode === "feed"
                    ? "Share to your feed"
                    : "Share this post"}
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 11.5,
                    fontWeight: "650",
                    marginTop: 2,
                  }}
                >
                  {mode === "feed"
                    ? "Add your own thoughts before sharing."
                    : "Choose how you would like to share it."}
                </Text>
              </View>

              <Pressable
                disabled={sharingToFeed}
                onPress={handleClose}
                hitSlop={10}
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed
                    ? "rgba(180, 83, 9, 0.10)"
                    : SURFACE,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                })}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={TEXT}
                />
              </Pressable>
            </View>

            {mode === "options" ? (
              <>
                <OriginalPostPreview post={post} />

                <View
                  style={{
                    gap: 9,
                    marginTop: 14,
                  }}
                >
                  <ShareOption
                    icon="newspaper-outline"
                    title="Share to my feed"
                    subtitle="Add an optional comment, then confirm the share."
                    accent="amber"
                    onPress={() => setMode("feed")}
                  />

                  <ShareOption
                    icon="paper-plane-outline"
                    title="Send in a message"
                    subtitle="Share this post privately with another Triunely user."
                    onPress={() => onSendInMessage?.(post)}
                  />

                  <ShareOption
                    icon="open-outline"
                    title="Share externally"
                    subtitle="Use your device’s normal sharing options."
                    onPress={() => onShareExternally?.(post)}
                  />

                  <ShareOption
                    icon="link-outline"
                    title="Copy link"
                    subtitle="Copy a direct link to this post."
                    onPress={() => onCopyLink?.(post)}
                  />
                </View>

                <Pressable
                  onPress={handleClose}
                  style={({ pressed }) => ({
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 46,
                    borderRadius: 15,
                    marginTop: 13,
                    backgroundColor: pressed
                      ? SOFT_OLIVE_BG
                      : "transparent",
                  })}
                >
                  <Text
                    style={{
                      color: DEEP_OLIVE,
                      fontSize: 13.5,
                      fontWeight: "900",
                    }}
                  >
                    Cancel
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text
                  style={{
                    color: TEXT,
                    fontSize: 12,
                    fontWeight: "850",
                    marginBottom: 7,
                  }}
                >
                  Your comment
                </Text>

                <TextInput
                  value={commentary}
                  editable={!sharingToFeed}
                  onChangeText={setCommentary}
                  placeholder="Say something about this post…"
                  placeholderTextColor="#9A9A9A"
                  multiline
                  maxLength={1000}
                  textAlignVertical="top"
                  style={{
                    minHeight: 112,
                    borderRadius: 17,
                    borderWidth: 1,
                    borderColor: AMBER_BORDER,
                    backgroundColor: SURFACE,
                    color: TEXT,
                    fontSize: 14,
                    lineHeight: 20,
                    paddingHorizontal: 13,
                    paddingTop: 12,
                    paddingBottom: 12,
                  }}
                />

                <Text
                  style={{
                    alignSelf: "flex-end",
                    color: MUTED,
                    fontSize: 10.5,
                    fontWeight: "700",
                    marginTop: 5,
                    marginBottom: 12,
                  }}
                >
                  {commentary.length}/1000
                </Text>

                <OriginalPostPreview post={post} />

                <Pressable
                  disabled={sharingToFeed}
                  onPress={handleConfirmFeedShare}
                  style={({ pressed }) => ({
                    minHeight: 50,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    marginTop: 15,
                    backgroundColor: sharingToFeed
                      ? "rgba(180, 83, 9, 0.50)"
                      : pressed
                      ? "#9A4608"
                      : EVENT_AMBER,
                  })}
                >
                  {sharingToFeed ? (
                    <>
                      <ActivityIndicator
                        size="small"
                        color="#FFFFFF"
                      />

                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontSize: 14,
                          fontWeight: "900",
                          marginLeft: 9,
                        }}
                      >
                        Sharing…
                      </Text>
                    </>
                  ) : (
                    <>
                      <Ionicons
                        name="share-social"
                        size={18}
                        color="#FFFFFF"
                      />

                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontSize: 14,
                          fontWeight: "900",
                          marginLeft: 8,
                        }}
                      >
                        Confirm share
                      </Text>
                    </>
                  )}
                </Pressable>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 10.5,
                    lineHeight: 15,
                    fontWeight: "650",
                    textAlign: "center",
                    marginTop: 9,
                    paddingHorizontal: 8,
                  }}
                >
                  The original post remains owned by its original author.
                </Text>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}