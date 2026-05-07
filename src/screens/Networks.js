import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
    Alert,
    Image,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

import Screen from "../components/Screen";
import { theme } from "../theme/theme";

const HEAVENLY_GOLD = "#D99400";
const DEEP_OLIVE = "#4F633B";
const SOFT_GOLD_BG = "rgba(217, 148, 0, 0.10)";
const SOFT_OLIVE_BG = "rgba(79, 99, 59, 0.10)";
const CARD_BORDER = "rgba(217, 148, 0, 0.18)";

const demoNetworks = [
  {
    id: "mens-prayer",
    title: "Men’s Prayer Network",
    subtitle: "Brothers strengthening faith together through prayer and encouragement.",
    members: "1.2K members",
    category: "Prayer",
    scope: "National",
    action: "Join",
    icon: "hand-left-outline",
    image:
      "https://images.unsplash.com/photo-1507692049790-de58290a4334?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "business",
    title: "Christian Business Network",
    subtitle: "Faith-driven purpose. Kingdom impact in the marketplace.",
    members: "856 members",
    category: "Business",
    scope: "Your City",
    action: "Request",
    icon: "briefcase-outline",
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "chess",
    title: "Chess Fellowship",
    subtitle: "Sharpen your mind. Glorify God through strategy and fellowship.",
    members: "423 members",
    category: "Hobbies",
    scope: "Local",
    action: "Join",
    icon: "extension-puzzle-outline",
    image:
      "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "bible-study",
    title: "Local Bible Study",
    subtitle: "Grow in God’s Word together in your local Christian community.",
    members: "312 members",
    category: "Bible Study",
    scope: "Local",
    action: "Join",
    icon: "book-outline",
    image:
      "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?q=80&w=1200&auto=format&fit=crop",
  },
];

const categories = [
  "Prayer",
  "Bible Study",
  "Men",
  "Women",
  "Young Adults",
  "Business",
  "Hobbies",
  "Activism",
  "Family",
  "Local Fellowship",
];

function CategoryChip({ label }) {
  return (
    <Pressable
      onPress={() => Alert.alert(label, `${label} filtering is coming next.`)}
      style={({ pressed }) => ({
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: pressed ? SOFT_OLIVE_BG : theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        marginRight: 8,
        marginBottom: 8,
      })}
    >
      <Text style={{ color: DEEP_OLIVE, fontSize: 12, fontWeight: "900" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function NetworkListCard({ network }) {
  const navigation = useNavigation();
  const isJoin = network.action === "Join";

  return (
    <Pressable
      onPress={() => navigation.push("NetworkDetail", { networkId: network.id })}
      style={({ pressed }) => ({
        flexDirection: "row",
        height: 138,
        backgroundColor: theme.colors.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        overflow: "hidden",
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <View
        style={{
          width: 96,
          height: 138,
          backgroundColor: theme.colors.surfaceAlt,
        }}
      >
        <Image
          source={{ uri: network.image }}
          style={{ width: 96, height: 138 }}
          resizeMode="cover"
        />

        <View
          style={{
            position: "absolute",
            left: 8,
            bottom: 8,
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: DEEP_OLIVE,
            borderWidth: 2,
            borderColor: theme.colors.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={network.icon} size={17} color="#fff" />
        </View>
      </View>

      <View style={{ flex: 1, padding: 12 }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 15,
            fontWeight: "900",
            lineHeight: 19,
          }}
          numberOfLines={2}
        >
          {network.title}
        </Text>

        <Text
          style={{
            color: theme.colors.muted,
            fontSize: 11.5,
            fontWeight: "700",
            lineHeight: 16,
            marginTop: 4,
          }}
          numberOfLines={2}
        >
          {network.subtitle}
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 6,
            marginTop: 8,
          }}
        >
          <View
            style={{
              paddingVertical: 4,
              paddingHorizontal: 8,
              borderRadius: 999,
              backgroundColor: SOFT_OLIVE_BG,
            }}
          >
            <Text
              style={{
                color: DEEP_OLIVE,
                fontSize: 10.5,
                fontWeight: "900",
              }}
            >
              {network.category}
            </Text>
          </View>

          <View
            style={{
              paddingVertical: 4,
              paddingHorizontal: 8,
              borderRadius: 999,
              backgroundColor: SOFT_GOLD_BG,
            }}
          >
            <Text
              style={{
                color: HEAVENLY_GOLD,
                fontSize: 10.5,
                fontWeight: "900",
              }}
            >
              {network.scope}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "auto",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <Ionicons name="people-outline" size={14} color={DEEP_OLIVE} />
            <Text
              style={{
                color: theme.colors.muted,
                fontSize: 11,
                fontWeight: "800",
                marginLeft: 4,
              }}
              numberOfLines={1}
            >
              {network.members}
            </Text>
          </View>

          <Pressable
            onPress={() => navigation.push("NetworkDetail", { networkId: network.id })}
            style={({ pressed }) => ({
              minWidth: 70,
              paddingVertical: 7,
              paddingHorizontal: 10,
              borderRadius: 999,
              alignItems: "center",
              backgroundColor: isJoin ? "transparent" : theme.colors.surface,
              borderWidth: 1,
              borderColor: isJoin ? HEAVENLY_GOLD : DEEP_OLIVE,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Text
              style={{
                color: isJoin ? HEAVENLY_GOLD : DEEP_OLIVE,
                fontSize: 12,
                fontWeight: "900",
              }}
            >
              {network.action}
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

export default function Networks() {
  const navigation = useNavigation();

  return (
    <Screen backgroundColor={theme.colors.bg} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: bottomPad + 20,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={10}
              style={({ pressed }) => ({
                width: 38,
                height: 38,
                borderRadius: 19,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed ? SOFT_OLIVE_BG : theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.divider,
              })}
            >
              <Ionicons name="chevron-back" size={23} color={DEEP_OLIVE} />
            </Pressable>

            <Pressable
              onPress={() => Alert.alert("Create Network", "Network creation is coming later.")}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 9,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: pressed ? SOFT_GOLD_BG : theme.colors.surface,
                borderWidth: 1,
                borderColor: CARD_BORDER,
              })}
            >
              <Ionicons name="add" size={17} color={HEAVENLY_GOLD} />
              <Text
                style={{
                  color: HEAVENLY_GOLD,
                  fontSize: 12,
                  fontWeight: "900",
                  marginLeft: 4,
                }}
              >
                Create
              </Text>
            </Pressable>
          </View>

          {/* Hero */}
          <View style={{ marginBottom: 16 }}>
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: -20,
                right: -20,
                width: 190,
                height: 120,
                borderRadius: 28,
                backgroundColor: "rgba(217, 148, 0, 0.08)",
              }}
            />

            <Text
              style={{
                color: theme.colors.text,
                fontSize: 34,
                fontWeight: "900",
                letterSpacing: -0.8,
              }}
            >
              Networks
            </Text>

            <Text
              style={{
                color: theme.colors.muted,
                fontSize: 15,
                fontWeight: "700",
                lineHeight: 22,
                marginTop: 8,
              }}
            >
              Join Christian networks built around prayer, purpose, fellowship,
              mission, and shared interests.
            </Text>
          </View>

          {/* Search */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.colors.surface,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: theme.colors.divider,
              paddingHorizontal: 14,
              paddingVertical: 10,
              marginBottom: 12,
            }}
          >
            <Ionicons name="search-outline" size={18} color={DEEP_OLIVE} />

            <TextInput
              placeholder="Search networks, topics, or keywords..."
              placeholderTextColor={theme.colors.muted}
              style={{
                flex: 1,
                color: theme.colors.text,
                fontWeight: "700",
                marginLeft: 8,
                paddingVertical: 0,
              }}
            />

            <Ionicons name="options-outline" size={18} color={DEEP_OLIVE} />
          </View>

          {/* Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingRight: 16 }}
            style={{ marginBottom: 18 }}
          >
            {["Suggested", "Popular", "Local", "My Networks"].map((label, index) => {
              const active = index === 0;

              return (
                <Pressable
                  key={label}
                  onPress={() => Alert.alert(label, `${label} tab is coming next.`)}
                  style={({ pressed }) => ({
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    backgroundColor: active ? DEEP_OLIVE : theme.colors.surface,
                    borderWidth: 1,
                    borderColor: active ? DEEP_OLIVE : theme.colors.divider,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: active ? "#fff" : theme.colors.text2,
                      fontSize: 12,
                      fontWeight: "900",
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Categories */}
          <View style={{ marginBottom: 18 }}>
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 22,
                fontWeight: "900",
                marginBottom: 10,
              }}
            >
              Browse by Category
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {categories.map((category) => (
                <CategoryChip key={category} label={category} />
              ))}
            </View>
          </View>

          {/* Network list */}
          <View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: 22,
                  fontWeight: "900",
                }}
              >
                Suggested Networks
              </Text>

              <Text style={{ color: HEAVENLY_GOLD, fontSize: 13, fontWeight: "900" }}>
                View all
              </Text>
            </View>

            {demoNetworks.map((network) => (
              <NetworkListCard key={network.id} network={network} />
            ))}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}