// src/components/InAppNotificationBanner.js
import { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRealtime } from "../context/RealtimeProvider";
import { theme } from "../theme/theme";

function getNotificationText(notification) {
  if (!notification) {
    return {
      title: "New notification",
      body: "You have a new update.",
    };
  }

  const type = notification.type || notification.notification_type || "";

  if (type === "event_invite") {
    return {
      title: "New event invite",
      body: notification.title || notification.body || "You’ve been invited to an event.",
    };
  }

  if (type === "fellowship_request") {
    return {
      title: "New fellowship request",
      body: notification.title || notification.body || "Someone sent you a fellowship request.",
    };
  }

  if (type === "church_notice") {
    return {
      title: "New church notice",
      body: notification.title || notification.body || "Your church posted a new notice.",
    };
  }

  return {
    title: notification.title || "New notification",
    body: notification.body || notification.message || "You have a new update.",
  };
}

export default function InAppNotificationBanner({ navigation }) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;

  const realtime = useRealtime();
  const notification = realtime?.latestBannerNotification;
  const clearNotification = realtime?.clearLatestBannerNotification;

  const text = useMemo(() => getNotificationText(notification), [notification]);

  useEffect(() => {
    if (!notification) return;

    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(translateY, {
        toValue: -140,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        clearNotification?.();
      });
    }, 3800);

    return () => clearTimeout(timer);
  }, [notification, translateY, clearNotification]);

  if (!notification) return null;

  const handlePress = () => {
    Animated.timing(translateY, {
      toValue: -140,
      duration: 160,
      useNativeDriver: true,
    }).start(() => {
      clearNotification?.();

      if (navigation?.navigate) {
        navigation.navigate("Notifications");
      }
    });
  };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: insets.top + 8,
        left: 12,
        right: 12,
        zIndex: 9999,
        transform: [{ translateY }],
      }}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => ({
          borderRadius: 18,
          overflow: "hidden",
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.goldOutline || theme.colors.gold,
          shadowColor: "#000",
          shadowOpacity: 0.22,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
          opacity: pressed ? 0.94 : 1,
        })}
      >
        <View
          style={{
            paddingVertical: 12,
            paddingHorizontal: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: theme.colors.goldHalo,
              borderWidth: 1,
              borderColor: theme.colors.goldOutline,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 17 }}>🔔</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: theme.colors.text,
                fontWeight: "900",
                fontSize: 14,
              }}
              numberOfLines={1}
            >
              {text.title}
            </Text>

            <Text
              style={{
                color: theme.colors.text2,
                fontWeight: "700",
                marginTop: 2,
                fontSize: 12,
              }}
              numberOfLines={2}
            >
              {text.body}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}