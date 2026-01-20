// src/components/icons/ChurchIcon.js
import Svg, { Line, Path } from "react-native-svg";

/**
 * ChurchIcon — home outline + large cross (Ionicons-like)
 * - simple silhouette like home-outline
 * - big central cross to communicate "church"
 * - thin stroke, rounded caps/joins to match Ionicons header icons
 */
export default function ChurchIcon({
  size = 22,
  color = "#111",
  strokeWidth = 1.15,
}) {
  return (
    <Svg width={size} height={size} viewBox="0 1 24 24" fill="none">
      {/* Home outline */}
      <Path
        d="M5.8 11.2 L12 6.2 L18.2 11.2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7.3 10.9 V19.8 H16.7 V10.9"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Big cross in the middle */}
      <Line
        x1="12"
        y1="11.0"
        x2="12"
        y2="18.0"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Line
        x1="9.6"
        y1="13.2"
        x2="14.4"
        y2="13.2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}
