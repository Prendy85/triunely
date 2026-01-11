// src/components/VerifiedBadge.js
import { Text, View } from "react-native";

/**
 * VerifiedBadge (Option A)
 * - Deep olive stamp
 * - Warm gold cross + border
 * - Subtle halo so it pops on light backgrounds
 *
 * Usage:
 *   <VerifiedBadge size={16} />
 */
export default function VerifiedBadge({ size = 16, style }) {
  const s = Number(size) || 16;

  // Stamp sizing
  const outer = Math.max(14, s);
  const inner = Math.max(12, s - 4);
  const crossSize = Math.max(10, Math.round(s * 0.82));

  // Triunely palette (tweak if desired)
  const GOLD = "#FFD76A";
  const GOLD_GLOW = "#FFF1C2";
  const OLIVE = "#5F6F52";
  const OLIVE_DARK = "#3F4A3C";

  return (
    <View
      style={[
        {
          width: outer,
          height: outer,
          borderRadius: outer / 2,

          // Outer ring (stamp border)
          backgroundColor: OLIVE_DARK,
          borderWidth: 1,
          borderColor: GOLD,

          alignItems: "center",
          justifyContent: "center",

          // Halo glow (subtle)
          shadowColor: GOLD_GLOW,
          shadowOpacity: 0.55,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },

          elevation: 4,
        },
        style,
      ]}
    >
      <View
        style={{
          width: inner,
          height: inner,
          borderRadius: inner / 2,

          // Inner fill
          backgroundColor: OLIVE,

          // Inner ring for “stamp” depth
          borderWidth: 1,
          borderColor: "rgba(255,215,106,0.55)",

          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            color: GOLD,
            fontSize: crossSize,
            fontWeight: "900",
            // Helps keep the cross centered visually
            lineHeight: crossSize + 1,
            textAlign: "center",

            // Micro shadow for legibility
            textShadowColor: "rgba(0,0,0,0.25)",
            textShadowRadius: 2,
            textShadowOffset: { width: 0, height: 1 },
          }}
        >
          ✝
        </Text>
      </View>
    </View>
  );
}
