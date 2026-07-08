// src/components/NewPostModal.js
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { theme } from "../theme/theme";

const postModalColors = {
  overlay: "rgba(46, 34, 20, 0.46)",
  cream: "#FFF8EC",
  creamDeep: "#F7EBD8",
  card: "#FFFDF7",
  border: "#E7D8BE",
  brown: "#4A321F",
  brownSoft: "#7A5A3A",
  olive: "#6F7D4F",
  oliveDark: "#56633D",
  oliveSoft: "#EEF2E4",
  white: "#FFFFFF",
};

export default function NewPostModal({
  visible,
  onClose,
  onSubmit,
  loading,
  linkedContent = null,
}) {
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [media, setMedia] = useState(null);
  const hasLinkedContent = !!linkedContent?.link_type;

  const linkedIcon =
    linkedContent?.link_type === "event"
      ? "calendar-outline"
      : linkedContent?.link_type === "group"
      ? "people-outline"
      : linkedContent?.link_type === "course"
      ? "school-outline"
      : linkedContent?.link_type === "church"
      ? "business-outline"
      : "link-outline";

  const linkedLabel =
    linkedContent?.link_type === "event"
      ? "Linked Event"
      : linkedContent?.link_type === "group"
      ? "Linked Group"
      : linkedContent?.link_type === "course"
      ? "Linked Course"
      : linkedContent?.link_type === "church"
      ? "Linked Church"
      : "Linked Content";

  const mediaIsVideo = String(media?.type || "").startsWith("video");

  useEffect(() => {
    if (!visible) {
      setContent("");
      setUrl("");
      setIsAnonymous(false);
      setMedia(null);
    }
  }, [visible]);

  async function openMediaPicker(kind) {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Media permission needed",
          "Please allow photo and video access so you can attach media to your post."
        );
        return;
      }

      const mediaTypes =
        kind === "video"
          ? ImagePicker.MediaTypeOptions.Videos
          : ImagePicker.MediaTypeOptions.Images;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsEditing: false,
        quality: kind === "video" ? 0.5 : 0.8,
        videoMaxDuration: kind === "video" ? 180 : undefined,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      const pickedType =
        kind === "video"
          ? asset.mimeType || "video/mp4"
          : asset.mimeType || "image/jpeg";

      const fallbackName =
        kind === "video"
          ? `video-${Date.now()}.mp4`
          : `image-${Date.now()}.jpg`;

      setMedia({
        uri: asset.uri,
        type: pickedType,
        mimeType: pickedType,
        fileName: asset.fileName || fallbackName,
        assetType: kind,
        kind,
      });
    } catch (e) {
      console.log("NewPostModal openMediaPicker error:", e);
      Alert.alert(
        "Media error",
        "We could not open your media library. Please try again."
      );
    }
  }

  function pickMedia() {
    Alert.alert("Add media", "What would you like to add?", [
      {
        text: "Image",
        onPress: () => openMediaPicker("image"),
      },
      {
        text: "Video",
        onPress: () => openMediaPicker("video"),
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  }

  function removeMedia() {
    setMedia(null);
  }

  function handleSubmit() {
    if (!content.trim() && !media && !hasLinkedContent) {
      Alert.alert("Message required", "Please write something or attach media.");
      return;
    }

    onSubmit(content, url, hasLinkedContent ? false : isAnonymous, media);
  }

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: postModalColors.overlay,
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
        >
          <View
            style={{
              width: "100%",
              maxHeight: "92%",
              backgroundColor: postModalColors.card,
              borderRadius: 28,
              borderWidth: 1,
              borderColor: postModalColors.border,
              overflow: "hidden",
              shadowColor: "#000",
              shadowOpacity: 0.16,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
              elevation: 8,
            }}
          >
            <View
              style={{
                paddingHorizontal: 18,
                paddingTop: 18,
                paddingBottom: 14,
                borderBottomWidth: 1,
                borderBottomColor: postModalColors.border,
                backgroundColor: postModalColors.cream,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: postModalColors.brown,
                      fontSize: 20,
                      fontWeight: "900",
                    }}
                  >
                   {hasLinkedContent ? "Share to church feed" : "Share with your church"}
                  </Text>

                  <Text
                    style={{
                      color: postModalColors.brownSoft,
                      fontSize: 13,
                      fontWeight: "700",
                      marginTop: 4,
                      lineHeight: 18,
                    }}
                  >
                    {hasLinkedContent
                      ? "Add your own words, media or link above this shared item."
                      : "Post a testimony, prayer need, update or encouragement."}
                  </Text>
                </View>

                <Pressable
                  onPress={onClose}
                  disabled={loading}
                  hitSlop={10}
                  style={({ pressed }) => ({
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: pressed ? postModalColors.creamDeep : postModalColors.card,
                    borderWidth: 1,
                    borderColor: postModalColors.border,
                    opacity: loading ? 0.5 : 1,
                  })}
                >
                  <Ionicons name="close" size={20} color={postModalColors.brownSoft} />
                </Pressable>
              </View>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                padding: 18,
              }}
            >
              {hasLinkedContent ? (
                <View
                  style={{
                    backgroundColor: "#FFF7ED",
                    borderRadius: 22,
                    borderWidth: 1,
                    borderColor: "rgba(180, 83, 9, 0.22)",
                    padding: 14,
                    marginBottom: 12,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      position: "absolute",
                      width: 120,
                      height: 120,
                      borderRadius: 60,
                      backgroundColor: "rgba(180, 83, 9, 0.08)",
                      right: -36,
                      top: -42,
                    }}
                  />

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        backgroundColor: postModalColors.card,
                        borderWidth: 1,
                        borderColor: "rgba(180, 83, 9, 0.20)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 10,
                      }}
                    >
                      <Ionicons name={linkedIcon} size={20} color="#B45309" />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: "#92400E",
                          fontSize: 11.5,
                          fontWeight: "900",
                          textTransform: "uppercase",
                          letterSpacing: 0.45,
                        }}
                      >
                        {linkedLabel}
                      </Text>

                      <Text
                        style={{
                          color: postModalColors.brown,
                          fontSize: 15.5,
                          fontWeight: "900",
                          marginTop: 2,
                        }}
                        numberOfLines={2}
                      >
                        {linkedContent?.linked_title || "Shared church item"}
                      </Text>
                    </View>
                  </View>

                  {linkedContent?.linked_image_url ? (
                    <Image
                      source={{ uri: linkedContent.linked_image_url }}
                      style={{
                        width: "100%",
                        height: 132,
                        borderRadius: 18,
                        backgroundColor: postModalColors.creamDeep,
                        marginBottom: 12,
                      }}
                    />
                  ) : null}

                  {linkedContent?.linked_subtitle ? (
                    <Text
                      style={{
                        color: postModalColors.brown,
                        fontSize: 13.5,
                        fontWeight: "900",
                        lineHeight: 19,
                      }}
                    >
                      {linkedContent.linked_subtitle}
                    </Text>
                  ) : null}

                  {linkedContent?.linked_description ? (
                    <Text
                      style={{
                        color: postModalColors.brownSoft,
                        fontSize: 12.5,
                        fontWeight: "700",
                        lineHeight: 18,
                        marginTop: 5,
                      }}
                      numberOfLines={3}
                    >
                      {linkedContent.linked_description}
                    </Text>
                  ) : null}

                  <View
                    style={{
                      alignSelf: "flex-start",
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 12,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      backgroundColor: postModalColors.card,
                      borderWidth: 1,
                      borderColor: "rgba(180, 83, 9, 0.24)",
                    }}
                  >
                    <Text
                      style={{
                        color: "#B45309",
                        fontSize: 12.5,
                        fontWeight: "900",
                      }}
                    >
                      {linkedContent?.linked_button_label || "Open"}
                    </Text>

                    <Ionicons
                      name="chevron-forward"
                      size={15}
                      color="#B45309"
                      style={{ marginLeft: 4 }}
                    />
                  </View>
                </View>
              ) : null}
              <View
                style={{
                  backgroundColor: postModalColors.cream,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: postModalColors.border,
                  padding: 14,
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    color: postModalColors.brown,
                    fontWeight: "900",
                    fontSize: 13,
                    marginBottom: 8,
                  }}
                >
                {hasLinkedContent ? "Your message above the shared item" : "Message"}
                </Text>

                <TextInput
                  placeholder={
                    hasLinkedContent
                      ? "Say something about this..."
                      : "What would you like to share with your church family?"
                  }
                  placeholderTextColor={postModalColors.brownSoft}
                  value={content}
                  onChangeText={setContent}
                  multiline
                  style={{
                    minHeight: 120,
                    color: postModalColors.brown,
                    fontSize: 15,
                    lineHeight: 21,
                    fontWeight: "700",
                    textAlignVertical: "top",
                    padding: 0,
                  }}
                />
              </View>

              <View
                style={{
                  backgroundColor: postModalColors.cream,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: postModalColors.border,
                  padding: 14,
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    color: postModalColors.brown,
                    fontWeight: "900",
                    fontSize: 13,
                    marginBottom: 8,
                  }}
                >
                  Optional link
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Ionicons name="link-outline" size={18} color={postModalColors.olive} />

                  <TextInput
                    placeholder="YouTube, article, website..."
                    placeholderTextColor={postModalColors.brownSoft}
                    value={url}
                    onChangeText={setUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    style={{
                      flex: 1,
                      color: postModalColors.brown,
                      fontSize: 14,
                      fontWeight: "700",
                      paddingVertical: 0,
                    }}
                  />
                </View>
              </View>

              <View
                style={{
                  backgroundColor: postModalColors.cream,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: postModalColors.border,
                  padding: 14,
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: postModalColors.brown,
                        fontWeight: "900",
                        fontSize: 13,
                      }}
                    >
                      Media
                    </Text>

                    <Text
                      style={{
                        color: postModalColors.brownSoft,
                        fontWeight: "700",
                        fontSize: 12,
                        marginTop: 3,
                        lineHeight: 17,
                      }}
                    >
                      Add a photo or short video if it helps tell the story.
                    </Text>
                  </View>

                  <Pressable
                    onPress={pickMedia}
                    disabled={loading}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      backgroundColor: pressed ? postModalColors.oliveSoft : postModalColors.card,
                      borderWidth: 1,
                      borderColor: postModalColors.olive,
                      paddingVertical: 9,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      opacity: loading ? 0.6 : 1,
                    })}
                  >
                    <Ionicons name="images-outline" size={17} color={postModalColors.olive} />

                    <Text
                      style={{
                        color: postModalColors.oliveDark,
                        fontWeight: "900",
                        fontSize: 13,
                      }}
                    >
                      Add media
                    </Text>
                  </Pressable>
                </View>

                {media?.uri ? (
                  <View
                    style={{
                      marginTop: 12,
                      borderRadius: 18,
                      overflow: "hidden",
                      borderWidth: 1,
                      borderColor: postModalColors.border,
                      backgroundColor: postModalColors.card,
                    }}
                  >
                    {mediaIsVideo ? (
                      <View
                        style={{
                          width: "100%",
                          aspectRatio: 1.4,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "#1F2933",
                        }}
                      >
                        <Ionicons name="play-circle-outline" size={46} color="#fff" />

                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 13,
                            fontWeight: "900",
                            marginTop: 8,
                          }}
                        >
                          Video selected
                        </Text>

                        <Text
                          style={{
                            color: "rgba(255,255,255,0.72)",
                            fontSize: 11.5,
                            fontWeight: "700",
                            marginTop: 3,
                          }}
                          numberOfLines={1}
                        >
                          {media.fileName || "Video attachment"}
                        </Text>
                      </View>
                    ) : (
                      <Image
                        source={{ uri: media.uri }}
                        style={{
                          width: "100%",
                          aspectRatio: 1,
                        }}
                        resizeMode="cover"
                      />
                    )}

                    <Pressable
                      onPress={removeMedia}
                      disabled={loading}
                      style={({ pressed }) => ({
                        position: "absolute",
                        top: 10,
                        right: 10,
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: pressed
                          ? "rgba(0,0,0,0.72)"
                          : "rgba(0,0,0,0.56)",
                        opacity: loading ? 0.6 : 1,
                      })}
                    >
                      <Ionicons name="trash-outline" size={17} color="#fff" />
                    </Pressable>
                  </View>
                ) : null}
              </View>
              {!hasLinkedContent ? (
              <Pressable
                onPress={() => setIsAnonymous((prev) => !prev)}
                disabled={loading}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  backgroundColor: pressed ? postModalColors.creamDeep : postModalColors.cream,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: isAnonymous ? postModalColors.olive : postModalColors.border,
                  padding: 14,
                  marginBottom: 14,
                  opacity: loading ? 0.65 : 1,
                })}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 7,
                    borderWidth: 2,
                    borderColor: isAnonymous ? postModalColors.olive : postModalColors.border,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isAnonymous ? postModalColors.oliveSoft : postModalColors.card,
                  }}
                >
                  {isAnonymous ? (
                    <Ionicons name="checkmark" size={15} color={postModalColors.olive} />
                  ) : null}
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: postModalColors.brown,
                      fontWeight: "900",
                      fontSize: 14,
                    }}
                  >
                    Post anonymously
                  </Text>

                  <Text
                    style={{
                      color: postModalColors.brownSoft,
                      fontWeight: "700",
                      fontSize: 12,
                      marginTop: 2,
                      lineHeight: 17,
                    }}
                  >
                    Your name will not be shown on this post.
                  </Text>
                </View>
              </Pressable>
                            ) : null}

              <Pressable
                disabled={loading}
                onPress={handleSubmit}
                style={({ pressed }) => ({
                  backgroundColor: loading
                    ? theme.colors.divider
                    : pressed
                      ? postModalColors.oliveDark
                      : postModalColors.olive,
                  paddingVertical: 14,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 8,
                  opacity: loading ? 0.75 : 1,
                })}
              >
                {loading ? (
                  <Ionicons name="hourglass-outline" size={18} color={theme.colors.text2} />
                ) : (
                  <Ionicons name="send-outline" size={18} color={postModalColors.white} />
                )}

                <Text
                  style={{
                    color: loading ? theme.colors.text2 : postModalColors.white,
                    fontWeight: "900",
                    fontSize: 15,
                  }}
                >
                  {loading
                    ? "Posting..."
                    : hasLinkedContent
                    ? "Share to Feed"
                    : "Post"}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}