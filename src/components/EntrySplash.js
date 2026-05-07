// src/components/EntrySplash.js
import { useEffect } from "react";
import { Image, StyleSheet } from "react-native";
import Animated, {
    Easing,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

/**
 * EntrySplash
 * - Full-screen overlay that animates the Triunely logo (zoom forward + fade out)
 * - Calls onDone() after the animation finishes
 */
export default function EntrySplash({ visible, onDone }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!visible) return;

    // reset (in case it shows again)
    scale.value = 1;
    opacity.value = 1;

    // zoom forward
    scale.value = withTiming(
      6,
      { duration: 650, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (!finished) return;

        // fade the overlay slightly at the end (small delay baked into duration)
        opacity.value = withTiming(
          0,
          { duration: 220, easing: Easing.out(Easing.quad) },
          (fadeFinished) => {
            if (fadeFinished && typeof onDone === "function") {
              runOnJS(onDone)();
            }
          }
        );
      }
    );
  }, [visible, opacity, scale, onDone]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="none">
      <Animated.View style={logoStyle}>
        <Image
          source={require("../assets/brand/triunely-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  logo: {
    width: 160,
    height: 160,
  },
});