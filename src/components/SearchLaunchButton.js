// src/components/SearchLaunchButton.js
import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import { theme } from "../theme/theme";

export default function SearchLaunchButton({ navigation }) {
  return (
    <Pressable
      onPress={() => navigation.navigate("GlobalSearch")}
      hitSlop={10}
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name="search-outline" size={20} color={theme.colors.text2} />
    </Pressable>
  );
}
