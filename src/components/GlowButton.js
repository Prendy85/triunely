// src/components/GlowButton.js
import { Pressable, Text, View } from "react-native";
import { theme } from "../theme/theme";

export default function GlowButton({
  title,
  onPress,
  disabled,
  variant = "primary", // "primary" | "outline"
  style,
}) {
  const isPrimary = variant === "primary";

  return (
    <Pressable onPress={onPress} disabled={disabled}>
      {({ pressed }) => (
        <View
          style={[
            theme.glow.outer, // always-on glow wrapper
            { opacity: disabled ? 0.55 : 1 },
            style,
          ]}
        >
          <View
            style={[
              isPrimary ? theme.button.primary : theme.button.outline,
              pressed && !disabled
                ? { transform: [{ scale: 0.99 }], opacity: 0.95 }
                : null,
            ]}
          >
            <Text style={isPrimary ? theme.button.primaryText : theme.button.outlineText}>
              {title}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}
