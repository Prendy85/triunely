import { Ionicons } from "@expo/vector-icons";
import {
    Pressable,
    Text,
    View,
} from "react-native";

const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const OLIVE = "#4F633B";

const CARD_BORDER =
  "rgba(15, 23, 42, 0.08)";

const AMBER_SOFT =
  "rgba(180, 83, 9, 0.10)";

const SHADOW =
  "rgba(15, 23, 42, 0.10)";

const TABS = [
  {
    key: "posts",
    label: "Posts",
    icon: "chatbubble-ellipses-outline",
  },
  {
    key: "gallery",
    label: "Gallery",
    icon: "images-outline",
  },
  {
    key: "about",
    label: "About",
    icon: "information-circle-outline",
  },
  {
    key: "growth",
    label: "Growth",
    icon: "trending-up-outline",
  },
];

export default function PartnerTabs({
  activeTab = "posts",
  onChange,
}) {
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 12,
        backgroundColor: SURFACE,
        borderRadius: 22,
        padding: 5,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        flexDirection: "row",
        shadowColor: SHADOW,
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: {
          width: 0,
          height: 3,
        },
        elevation: 2,
      }}
    >
      {TABS.map((tab) => {
        const active =
          activeTab === tab.key;

        return (
          <Pressable
            key={tab.key}
            onPress={() =>
              onChange?.(tab.key)
            }
            style={({ pressed }) => ({
              flex: 1,
              minWidth: 0,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 3,
              paddingVertical: 10,
              borderRadius: 18,

              backgroundColor: active
                ? AMBER_SOFT
                : pressed
                  ? "rgba(79, 99, 59, 0.06)"
                  : "transparent",

              borderWidth: 0,

              shadowOpacity: 0,
              elevation: 0,

              transform: [
                {
                  translateY:
                    pressed ? 2 : 0,
                },
                {
                  scale:
                    pressed ? 0.97 : 1,
                },
              ],
            })}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={
                active
                  ? EVENT_AMBER
                  : OLIVE
              }
            />

            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
              style={{
                color: active
                  ? EVENT_BROWN
                  : OLIVE,
                fontSize: 11.5,
                fontWeight: "900",
                marginTop: 4,
                textAlign: "center",
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}