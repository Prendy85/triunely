// src/components/GlowCard.js
import { View } from "react-native";
import { theme } from "../theme/theme";

/**
 * GlowCard
 * - Outer "glow" wrapper + inner surface
 * - borderMode:
 *    - "full" (default): normal border all around
 *    - "topBottom": border only on top & bottom (no left/right) for edge-to-edge feeds
 */
export default function GlowCard({
  children,
  style,
  innerStyle,
  borderMode = "full", // "full" | "topBottom"
}) {
  const outer = {
    ...theme.glow.outer,
    ...(borderMode === "topBottom"
      ? {
          borderWidth: 0,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderLeftWidth: 0,
          borderRightWidth: 0,
        }
      : null),
  };

  return (
    <View style={[outer, style]}>
      <View style={[theme.glow.inner, innerStyle]}>{children}</View>
    </View>
  );
}
