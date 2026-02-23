// src/components/MessagesButton.js
import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable } from "react-native";
import { getOrCreateChurchConversation } from "../lib/messages";
import { theme } from "../theme/theme";

export default function MessagesButton({ navigation, context }) {
  const onPress = async () => {
    try {
      // If we're inside a church context → open unified church conversation
      if (context?.type === "church") {
        const churchId = context?.churchId;
        if (!churchId) return;

        const conversationId = await getOrCreateChurchConversation(churchId);
        navigation.navigate("Chat", { conversationId });
        return;
      }

      // Default → open unified inbox
      navigation.navigate("MessagesInbox");
    } catch (e) {
      console.log("MessagesButton error", e);
      Alert.alert("Messages", e?.message || "Could not open messages right now.");
    }
  };

  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 8,
        alignItems: "center",
        justifyContent: "center",
      }}
      hitSlop={10}
    >
      <Ionicons
        name="chatbubble-ellipses-outline"
        size={26}
        color={theme.colors.text2}
      />
    </Pressable>
  );
}
