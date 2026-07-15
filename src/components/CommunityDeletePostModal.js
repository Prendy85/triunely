import { Ionicons } from "@expo/vector-icons";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "../theme/theme";

export default function CommunityDeletePostModal({
  visible,
  deleting = false,
  onCancel,
  onConfirm,
}) {
  const insets = useSafeAreaInsets();

  function handleClose() {
    if (deleting) {
      return;
    }

    onCancel?.();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor:
            "rgba(15, 23, 42, 0.46)",
        }}
      >
        <Pressable
          onPress={handleClose}
          disabled={deleting}
          style={{
            flex: 1,
          }}
        />

        <View
          style={{
            paddingHorizontal: 18,
            paddingTop: 18,
            paddingBottom:
              Math.max(
                insets.bottom + 18,
                28
              ),
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            backgroundColor:
              "#FFFCF5",
            borderTopWidth: 1,
            borderColor:
              "rgba(180, 83, 9, 0.16)",
            shadowColor: "#000",
            shadowOpacity: 0.16,
            shadowRadius: 18,
            shadowOffset: {
              width: 0,
              height: -6,
            },
            elevation: 18,
          }}
        >
          <View
            style={{
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                alignItems: "center",
                justifyContent:
                  "center",
                backgroundColor:
                  "rgba(180, 83, 9, 0.11)",
                borderWidth: 1,
                borderColor:
                  "rgba(180, 83, 9, 0.22)",
              }}
            >
              <Ionicons
                name="trash-outline"
                size={24}
                color="#B45309"
              />
            </View>

            <Text
              style={{
                marginTop: 14,
                color:
                  theme.colors.text,
                fontSize: 20,
                lineHeight: 25,
                fontWeight: "900",
                textAlign: "center",
              }}
            >
              Delete this post?
            </Text>

            <Text
              style={{
                marginTop: 8,
                color:
                  theme.colors.muted,
                fontSize: 13.5,
                lineHeight: 20,
                fontWeight: "600",
                textAlign: "center",
                paddingHorizontal: 8,
              }}
            >
              This will permanently remove
              the post, including its
              reactions and comments, for
              everyone.
            </Text>
          </View>

          <Pressable
            onPress={onConfirm}
            disabled={deleting}
            style={({ pressed }) => ({
              minHeight: 52,
              marginTop: 20,
              borderRadius: 17,
              flexDirection: "row",
              alignItems: "center",
              justifyContent:
                "center",
              backgroundColor:
                "#B45309",
              opacity: deleting
                ? 0.65
                : pressed
                  ? 0.84
                  : 1,
              transform: [
                {
                  scale:
                    pressed &&
                    !deleting
                      ? 0.985
                      : 1,
                },
              ],
            })}
          >
            {deleting ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <>
                <Ionicons
                  name="trash-outline"
                  size={19}
                  color="#FFFFFF"
                />

                <Text
                  style={{
                    marginLeft: 8,
                    color: "#FFFFFF",
                    fontSize: 14,
                    fontWeight: "900",
                  }}
                >
                  Delete post
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={handleClose}
            disabled={deleting}
            style={({ pressed }) => ({
              minHeight: 50,
              marginTop: 10,
              borderRadius: 17,
              alignItems: "center",
              justifyContent:
                "center",
              backgroundColor:
                pressed
                  ? "rgba(79, 99, 59, 0.09)"
                  : theme.colors.surface,
              borderWidth: 1,
              borderColor:
                "rgba(79, 99, 59, 0.18)",
              opacity: deleting
                ? 0.45
                : 1,
            })}
          >
            <Text
              style={{
                color: "#4F633B",
                fontSize: 14,
                fontWeight: "900",
              }}
            >
              Keep post
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}