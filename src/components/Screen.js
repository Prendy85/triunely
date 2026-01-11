// src/components/Screen.js
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme/theme";

/**
 * Screen
 * - Safe area handled by SafeAreaView (top/left/right by default)
 * - DOES NOT add extra top padding by default (prevents "pushed down" UI)
 * - Exposes bottomPad so FlatList/ScrollView can avoid the bottom tab bar
 * - Default background is Triunely light theme (white)
 *
 * NEW: `edges` prop lets a screen opt into bottom safe area if needed.
 */
export default function Screen({
  children,
  backgroundColor = theme.colors.bg,
  padded = true,
  style,
  contentStyle,
  edges = ["top", "left", "right"],
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

  return (
    <SafeAreaView
      style={[
        {
          flex: 1,
          width: "100%",
          backgroundColor,
          alignItems: "stretch",
          overflow: "visible", // allow carousel peeks, shadows, etc.
        },
        style,
      ]}
      edges={edges}
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
