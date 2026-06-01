// src/theme/theme.js
import { Platform } from "react-native";
import { colors } from "./colors";

const FONT_DISPLAY = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: undefined,
});

const FONT_BODY = undefined;

export const theme = {
  colors,

  fonts: {
    display: FONT_DISPLAY,
    body: FONT_BODY,
  },

  premium: {
    colors: {
      cream: "#FFFCF5",
      surface: "#FFFFFF",

      gold: colors.gold || "#D99400",
      goldSoft: "rgba(217, 148, 0, 0.10)",
      goldBorder: "rgba(217, 148, 0, 0.20)",
      goldLine: "rgba(217, 148, 0, 0.75)",

      olive: "#4F633B",
      oliveSoft: "rgba(79, 99, 59, 0.10)",
      oliveBorder: "rgba(79, 99, 59, 0.16)",

      text: colors.text || "#111827",
      textDark: "#102116",
      muted: colors.muted || "#7B8493",

      cardBorder: "rgba(15, 23, 42, 0.08)",
      softDivider: "rgba(15, 23, 42, 0.10)",
      shadow: "rgba(15, 23, 42, 0.08)",
    },

    radius: {
      card: 20,
      cardLarge: 22,
      button: 22,
      avatar: 25,
      pill: 999,
    },

    spacing: {
      screenX: 20,
      headerTop: 18,
      sectionTop: 20,
      cardGap: 10,
    },

    shadow: {
      soft: {
        shadowColor: "rgba(15, 23, 42, 0.08)",
        shadowOpacity: 0.12,
        shadowRadius: 9,
        shadowOffset: { width: 0, height: 4 },
        elevation: Platform.OS === "android" ? 2 : 0,
      },

      button: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 9,
        shadowOffset: { width: 0, height: 4 },
        elevation: Platform.OS === "android" ? 2 : 0,
      },

      goldUnderline: {
        shadowColor: colors.gold || "#D99400",
        shadowOpacity: 0.35,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
        elevation: Platform.OS === "android" ? 2 : 0,
      },
    },

    text: {
      screenTitle: {
        color: "#102116",
        fontFamily: FONT_DISPLAY,
        fontSize: 33,
        fontWeight: "900",
        letterSpacing: -0.6,
        lineHeight: 37,
      },

      sectionTitle: {
        color: colors.text || "#111827",
        fontFamily: FONT_DISPLAY,
        fontSize: 24,
        fontWeight: "900",
        letterSpacing: -0.2,
      },

      cardTitle: {
        color: colors.text || "#111827",
        fontFamily: FONT_DISPLAY,
        fontSize: 15.5,
        fontWeight: "900",
        letterSpacing: -0.1,
      },

      body: {
        color: colors.text || "#111827",
        fontFamily: FONT_BODY,
        fontSize: 14,
        fontWeight: "700",
        lineHeight: 18,
      },

      small: {
        color: colors.muted || "#7B8493",
        fontFamily: FONT_BODY,
        fontSize: 12.5,
        fontWeight: "700",
        lineHeight: 17,
      },

      tiny: {
        color: colors.muted || "#7B8493",
        fontFamily: FONT_BODY,
        fontSize: 11,
        fontWeight: "800",
      },

      tab: {
        fontFamily: FONT_BODY,
        fontSize: 13.5,
        fontWeight: "800",
      },

      badge: {
        fontFamily: FONT_BODY,
        fontSize: 10.5,
        fontWeight: "900",
      },
    },

    headerButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(15, 23, 42, 0.08)",
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 9,
      shadowOffset: { width: 0, height: 4 },
      elevation: Platform.OS === "android" ? 2 : 0,
    },

    card: {
      borderRadius: 20,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "rgba(15, 23, 42, 0.08)",
      shadowColor: "rgba(15, 23, 42, 0.08)",
      shadowOpacity: 0.12,
      shadowRadius: 9,
      shadowOffset: { width: 0, height: 4 },
      elevation: Platform.OS === "android" ? 2 : 0,
    },

    avatar: {
      md: {
        width: 50,
        height: 50,
        borderRadius: 25,
      },
      sm: {
        width: 42,
        height: 42,
        borderRadius: 21,
      },
    },

    underlineTabs: {
      container: {
        marginHorizontal: 20,
        marginTop: 17,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(15, 23, 42, 0.10)",
        flexDirection: "row",
        alignItems: "flex-end",
      },

      item: {
        flex: 1,
        paddingTop: 8,
        paddingBottom: 10,
        alignItems: "center",
        justifyContent: "center",
      },

      activeLine: {
        position: "absolute",
        left: 16,
        right: 16,
        bottom: -1,
        height: 3,
        borderRadius: 999,
        backgroundColor: "rgba(217, 148, 0, 0.75)",
      },
    },
  },

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
    h1: {
      color: colors.text,
      fontFamily: FONT_DISPLAY,
      fontSize: 24,
      fontWeight: "900",
      letterSpacing: -0.2,
    },
    h2: {
      color: colors.text,
      fontFamily: FONT_DISPLAY,
      fontSize: 20,
      fontWeight: "900",
      letterSpacing: -0.1,
    },
    body: {
      color: colors.text,
      fontFamily: FONT_BODY,
      fontSize: 15,
      lineHeight: 21,
    },
    sub: {
      color: colors.text2,
      fontFamily: FONT_BODY,
      fontSize: 13,
      lineHeight: 18,
    },
    muted: {
      color: colors.muted,
      fontFamily: FONT_BODY,
      fontSize: 13,
      lineHeight: 18,
    },
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