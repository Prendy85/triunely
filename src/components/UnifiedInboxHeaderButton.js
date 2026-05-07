import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { useRealtime } from "../context/RealtimeProvider";
import { theme } from "../theme/theme";

export default function UnifiedInboxHeaderButton({
  navigation,
  size = 22,
  color = theme.colors.text2,
  hitSlop = 8,
  style,
  iconContainerStyle,
  badgeOffset = { top: -6, right: -8 },
  debugLabel,
}) {
  const rt = useRealtime();

  const unreadMessageCount =
    rt?.unreadMessageCount ??
    rt?.unreadInboxCount ??
    rt?.messageUnreadCount ??
    0;

  // Optional debug (leave off unless needed)
  if (debugLabel) {
    console.log(`${debugLabel} MESSAGE COUNT:`, {
      unreadMessageCount,
      unreadMessageCount_key: rt?.unreadMessageCount,
      unreadInboxCount_key: rt?.unreadInboxCount,
      messageUnreadCount_key: rt?.messageUnreadCount,
      rtKeys: rt ? Object.keys(rt) : null,
    });
  }

  return (
    <Pressable
      onPress={() => navigation.navigate("MessagesInbox")}
      style={style}
      hitSlop={hitSlop}
    >
      <View style={[{ position: "relative" }, iconContainerStyle]}>
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={size}
          color={color}
        />

        {unreadMessageCount > 0 && (
          <View
            style={{
              position: "absolute",
              top: badgeOffset.top,
              right: badgeOffset.right,
              minWidth: 18,
              height: 18,
              paddingHorizontal: 4,
              borderRadius: 999,
              backgroundColor: theme.colors.gold,
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 1,
              borderColor: theme.colors.goldOutline,
            }}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 10,
                fontWeight: "900",
              }}
            >
              {unreadMessageCount > 99 ? "99+" : String(unreadMessageCount)}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}