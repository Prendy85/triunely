// src/components/NewPostModal.js
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";

export default function NewPostModal({ visible, onClose, onSubmit, loading }) {
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  // media = { uri, type, fileName } | null
  const [media, setMedia] = useState(null);

  // Reset when opened/closed
  useEffect(() => {
    if (!visible) {
      setContent("");
      setUrl("");
      setIsAnonymous(false);
      setMedia(null);
    }
  }, [visible]);

 async function pickImage() {
  try {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      alert("We need permission to access your photos to attach an image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      // ✅ Stable API for your current Expo version
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // no crop UI, like Facebook
      quality: 0.8,
      // no base64 needed – we upload from the file URI in Community.js
    });

    if (result.canceled) return;

    const asset = result.assets[0];

    setMedia({
      uri: asset.uri,
      type: asset.type || "image/jpeg",
      fileName: asset.fileName || `image-${Date.now()}.jpg`,
    });
  } catch (e) {
    console.log("Error picking image", e);
  }
}



  function handleSubmit() {
    if (!content.trim() && !media) {
      alert("Please write something or attach an image.");
      return;
    }
    // Pass everything back to Community screen
    onSubmit(content, url, isAnonymous, media);
  }

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.7)",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
        >
          <View
            style={{
              width: "100%",
              backgroundColor: "#0D1B2A",
              borderRadius: 18,
              padding: 16,
              borderWidth: 1,
              borderColor: "#11233B",
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: "#F2B705",
                  fontSize: 18,
                  fontWeight: "800",
                }}
              >
                New Post
              </Text>
              <Pressable
                onPress={onClose}
                disabled={loading}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  opacity: loading ? 0.5 : 1,
                }}
              >
                <Text style={{ color: "#9bb3c9", fontWeight: "600" }}>
                  Close
                </Text>
              </Pressable>
            </View>

            {/* Post content */}
            <TextInput
              placeholder="What's on your heart?"
              placeholderTextColor="#9bb3c9"
              value={content}
              onChangeText={setContent}
              multiline
              style={{
                backgroundColor: "#11233B",
                color: "#fff",
                padding: 10,
                borderRadius: 10,
                height: 100,
                textAlignVertical: "top",
                marginBottom: 10,
              }}
            />

            {/* Optional link */}
            <TextInput
              placeholder="Optional link (YouTube, article, etc.)"
              placeholderTextColor="#9bb3c9"
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              keyboardType="url"
              style={{
                backgroundColor: "#11233B",
                color: "#fff",
                padding: 10,
                borderRadius: 10,
                marginBottom: 10,
              }}
            />

            {/* Image attach + preview */}
            <View style={{ marginBottom: 12 }}>
              <Pressable
                onPress={pickImage}
                style={{
                  backgroundColor: "#1B6BF2",
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  alignSelf: "flex-start",
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: "700",
                    fontSize: 13,
                  }}
                >
                  + Add image
                </Text>
              </Pressable>

             {media?.uri && (
  <View
    style={{
      marginTop: 8,
      borderRadius: 10,
      overflow: "hidden",
      width: "100%",      // fill the modal width
      // alignSelf: "flex-start", // not needed any more
      // no blue border
    }}
  >
    <Image
      source={{ uri: media.uri }}
      style={{
        width: "100%",
        height: undefined,
        aspectRatio: 1, // square preview tile
      }}
      resizeMode="cover" // match the feed look
    />
  </View>
)}

            </View>

            {/* Anonymous toggle */}
            <Pressable
              onPress={() => setIsAnonymous((prev) => !prev)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: "#F2B705",
                  marginRight: 8,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: isAnonymous ? "#F2B705" : "transparent",
                }}
              >
                {isAnonymous ? (
                  <Text
                    style={{
                      color: "#0D1B2A",
                      fontSize: 12,
                      fontWeight: "800",
                    }}
                  >
                    ✓
                  </Text>
                ) : null}
              </View>
              <Text style={{ color: "#CFE0FF", fontSize: 13 }}>
                Post as anonymous
              </Text>
            </Pressable>

            {/* Submit */}
            <Pressable
              disabled={loading}
              onPress={handleSubmit}
              style={{
                backgroundColor: loading ? "#556b8b" : "#F2B705",
                paddingVertical: 10,
                borderRadius: 10,
              }}
            >
              <Text
                style={{
                  color: "#0D1B2A",
                  fontWeight: "800",
                  textAlign: "center",
                }}
              >
                {loading ? "Posting…" : "Post"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
