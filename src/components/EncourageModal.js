// src/components/EncourageModal.js
import { useEffect, useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

export default function EncourageModal({
  visible,
  onClose,
  onSubmit,
  loading,
  prayer,
}) {
  const [message, setMessage] = useState("");

  // Reset message whenever we open the modal with a new prayer
  useEffect(() => {
    if (visible) {
      setMessage("");
    }
  }, [visible, prayer?.id]);

  const handleClose = () => {
    if (loading) return;
    setMessage("");
    onClose && onClose();
  };

  const handleSend = () => {
    if (!message.trim()) return;
    onSubmit && onSubmit(message.trim());
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: "#0D1B2A",
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 24,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: "90%",
          }}
        >
          {/* Handle bar */}
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 999,
              backgroundColor: "#233952",
              alignSelf: "center",
              marginBottom: 10,
            }}
          />

          <Text
            style={{
              color: "#fff",
              fontSize: 18,
              fontWeight: "700",
              marginBottom: 4,
            }}
          >
            Encourage
          </Text>
          <Text style={{ color: "#9bb3c9", marginBottom: 10, fontSize: 13 }}>
            Send a short encouragement or prayer for this request.
          </Text>

          {/* Show a small summary of the prayer we're replying to */}
          {prayer ? (
            <View
              style={{
                backgroundColor: "#11233B",
                borderRadius: 10,
                padding: 10,
                marginBottom: 14,
              }}
            >
              <Text
                style={{
                  color: "#CFE0FF",
                  fontSize: 12,
                  fontWeight: "600",
                  marginBottom: 4,
                }}
              >
                {prayer.title}
              </Text>
              {prayer.body ? (
                <Text
                  style={{
                    color: "#9bb3c9",
                    fontSize: 12,
                  }}
                  numberOfLines={3}
                >
                  {prayer.body}
                </Text>
              ) : null}
            </View>
          ) : null}

          <ScrollView
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            <Text
              style={{
                color: "#CFE0FF",
                fontSize: 13,
                marginBottom: 4,
              }}
            >
              Your encouragement
            </Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="e.g. Praying for peace and favour over you in this situation."
              placeholderTextColor="#567094"
              multiline
              style={{
                backgroundColor: "#11233B",
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: "#fff",
                fontSize: 14,
                minHeight: 90,
                textAlignVertical: "top",
              }}
            />
          </ScrollView>

          {/* Buttons */}
          <View
            style={{
              flexDirection: "row",
              marginTop: 8,
            }}
          >
            <Pressable
              onPress={handleClose}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 999,
                alignItems: "center",
                marginRight: 8,
                borderWidth: 1,
                borderColor: "#233952",
              }}
              disabled={loading}
            >
              <Text
                style={{
                  color: "#CFE0FF",
                  fontSize: 13,
                  fontWeight: "500",
                }}
              >
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSend}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 999,
                alignItems: "center",
                backgroundColor:
                  message.trim().length > 0 ? "#1B6BF2" : "#163453",
              }}
              disabled={loading || !message.trim()}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                {loading ? "Sending…" : "Send"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
