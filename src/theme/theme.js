// src/theme/theme.js
import { Platform } from "react-native";
import { colors } from "./colors";

export const theme = {
  colors,

  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 22,
  },

  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
  },

  // Always-on glow treatment (subtle, consistent)
  glow: {
    outer: {
      borderWidth: 1,
      borderColor: colors.goldOutline,
      backgroundColor: colors.goldHalo,
      borderRadius: 18,

      // iOS shadow = real glow
      shadowColor: colors.gold,
      shadowOpacity: 0.22,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },

      // Android: elevation is the only reliable shadow
      elevation: Platform.OS === "android" ? 4 : 0,
    },
    inner: {
      backgroundColor: colors.surface,
      borderRadius: 16,
    },
  },

  text: {
    h1: { color: colors.text, fontSize: 22, fontWeight: "800" },
    h2: { color: colors.text, fontSize: 18, fontWeight: "800" },
    body: { color: colors.text, fontSize: 15, lineHeight: 21 },
    sub: { color: colors.text2, fontSize: 13, lineHeight: 18 },
    muted: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  },

  button: {
    primary: {
      backgroundColor: colors.gold,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryText: { color: colors.text, fontWeight: "800" },

    outline: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.goldOutline,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    outlineText: { color: colors.goldPressed, fontWeight: "800" },
  },

  input: {
    box: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.goldOutline,
      borderRadius: 14,
      padding: 12,
      color: colors.text,
    },
    placeholder: colors.muted,
  },
};
