// src/components/Screen.js
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Platform, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme/theme";

/**
 * Screen
 * - Safe area handled by SafeAreaView (top/left/right by default)
 * - DOES NOT add extra top padding by default (prevents "pushed down" UI)
 * - Exposes bottomPad so FlatList/ScrollView can avoid the bottom tab bar
 * - Default background is Triunely light theme (white)
 *
 * `edges` prop lets a screen opt into bottom safe area if needed.
 * NEW: `keyboardSafe` lets a screen include bottom edge on Android so IME (keyboard) insets resize the layout.
 */
export default function Screen({
  children,
  backgroundColor = theme.colors.bg,
  padded = true,
  style,
  contentStyle,
  edges = ["top", "left", "right"],
  keyboardSafe = false,
}) {
  const insets = useSafeAreaInsets();

  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch {
    tabBarHeight = 0;
  }

  const horizontalPad = padded ? theme.spacing.md : 0;
  const bottomPad = insets.bottom + tabBarHeight;

  // ✅ If keyboardSafe on Android, include "bottom" so IME inset (keyboard) resizes the view.
  const effectiveEdges =
    keyboardSafe && Platform.OS === "android"
      ? Array.from(new Set([...(edges || []), "bottom"]))
      : edges;

  return (
    <SafeAreaView
      style={[
        {
          flex: 1,
          width: "100%",
          backgroundColor,
          alignItems: "stretch",
          overflow: "visible",
        },
        style,
      ]}
      edges={effectiveEdges}
    >
      <View
        style={[
          {
            flex: 1,
            width: "100%",
            paddingHorizontal: horizontalPad,
            overflow: "visible",
          },
          contentStyle,
        ]}
      >
        {typeof children === "function"
          ? children({
              insets,
              tabBarHeight,
              bottomPad,
              horizontalPad,
              theme,
              colors: theme.colors,
            })
          : children}
      </View>
    </SafeAreaView>
  );
}