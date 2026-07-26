// C:\triunely\src\screens\CreateNetwork.js

import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";

import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";
const DANGER_RED = "#991B1B";

const CARD_BORDER = "rgba(15, 23, 42, 0.08)";
const AMBER_SOFT = "rgba(180, 83, 9, 0.10)";
const AMBER_BORDER = "rgba(180, 83, 9, 0.18)";
const OLIVE_SOFT = "rgba(79, 99, 59, 0.10)";
const OLIVE_BORDER = "rgba(79, 99, 59, 0.18)";
const SHADOW = "rgba(15, 23, 42, 0.10)";
const MODAL_BACKDROP = "rgba(15, 23, 42, 0.58)";

const displayFont = Platform.OS === "ios" ? "Georgia" : "serif";

const serifHeading = {
  fontFamily: displayFont,
  color: TEXT,
  fontWeight: "900",
  letterSpacing: -0.45,
};

const premiumCardStyle = {
  backgroundColor: SURFACE,
  borderRadius: 24,
  borderWidth: 1,
  borderColor: CARD_BORDER,
  shadowColor: SHADOW,
  shadowOpacity: 0.09,
  shadowRadius: 12,
  shadowOffset: {
    width: 0,
    height: 5,
  },
  elevation: 3,
};

const FEATURED_CATEGORIES = [
  "Prayer",
  "Bible Study",
  "Local Fellowship",
  "Business",
  "Hobbies",
  "Family",
  "Ministry",
  "Young Adults",
];

const ALL_CATEGORIES = [
  "Prayer",
  "Bible Study",
  "Local Fellowship",
  "Business",
  "Hobbies",
  "Family",
  "Ministry",
  "Young Adults",
  "Men",
  "Women",
  "Marriage",
  "Parenting",
  "Careers & Professions",
  "Arts & Creativity",
  "Music & Worship",
  "Sport & Fitness",
  "Technology",
  "Education",
  "Leadership",
  "Mission",
  "Charity & Causes",
  "Politics & Public Life",
  "Mental Health & Wellbeing",
  "Disability & Accessibility",
  "Volunteering",
  "Other",
];

const SCOPE_OPTIONS = [
  {
    value: "local",
    label: "Local",
    description: "For a town, city or local area.",
    icon: "location-outline",
  },
  {
    value: "regional",
    label: "Regional",
    description: "For a county, region or wider local area.",
    icon: "map-outline",
  },
  {
    value: "national",
    label: "National",
    description: "For people across one country.",
    icon: "flag-outline",
  },
  {
    value: "global",
    label: "Global",
    description: "For members across countries and continents.",
    icon: "earth-outline",
  },
  {
    value: "online",
    label: "Online",
    description: "Primarily organised as an online community.",
    icon: "globe-outline",
  },
];

const VISIBILITY_OPTIONS = [
  {
    value: "public",
    label: "Public",
    description:
      "People can discover the Network and view its public profile.",
    icon: "globe-outline",
  },
  {
    value: "members_only",
    label: "Members Only",
    description:
      "People can view the landing page, but Network activity is for members.",
    icon: "people-outline",
  },
  {
    value: "unlisted",
    label: "Unlisted",
    description:
      "The Network is mainly accessible through a direct link or invitation.",
    icon: "link-outline",
  },
];

const MEMBERSHIP_OPTIONS = [
  {
    value: "open",
    label: "Open",
    description: "Eligible users can join immediately.",
    icon: "enter-outline",
  },
  {
    value: "approval_required",
    label: "Approval Required",
    description: "Owners and admins review requests before people join.",
    icon: "shield-checkmark-outline",
  },
  {
    value: "invite_only",
    label: "Invite Only",
    description: "People can only join through an authorised invitation.",
    icon: "lock-closed-outline",
  },
];

const POSTING_OPTIONS = [
  {
    value: "all_members",
    label: "All members",
    description: "Joined members can create posts.",
  },
  {
    value: "approval_required",
    label: "Posts need approval",
    description: "Member posts will require moderation approval.",
  },
  {
    value: "admins_only",
    label: "Admins only",
    description: "Only owners and Network admins can publish.",
  },
];

const COMMENTING_OPTIONS = [
  {
    value: "all_members",
    label: "All members",
    description: "Joined members can comment.",
  },
  {
    value: "admins_only",
    label: "Admins only",
    description: "Only Network leadership can comment.",
  },
  {
    value: "disabled",
    label: "Disabled",
    description: "Comments will not be available.",
  },
];

const COMMERCIAL_OPTIONS = [
  {
    value: "none",
    label: "No commercial purpose",
    description:
      "The Network is not primarily connected to commercial activity.",
    icon: "heart-outline",
  },
  {
    value: "community_with_commercial_activity",
    label: "Community with commercial activity",
    description:
      "The Network may include relevant offers, services or business activity.",
    icon: "briefcase-outline",
  },
  {
    value: "brand_led",
    label: "Brand-led Network",
    description:
      "The Network is operated by or substantially connected to a business, creator or organisation.",
    icon: "storefront-outline",
  },
];

function trimOrNull(value) {
  const cleaned = String(value || "").trim();

  return cleaned || null;
}

function FieldLabel({ children, required = false }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 7,
      }}
    >
      <Text
        style={{
          color: MUTED,
          fontSize: 12,
          fontWeight: "900",
          textTransform: "uppercase",
          letterSpacing: 0.45,
        }}
      >
        {children}
      </Text>

      {required ? (
        <Text
          style={{
            color: EVENT_AMBER,
            fontSize: 13,
            fontWeight: "900",
            marginLeft: 3,
          }}
        >
          *
        </Text>
      ) : null}
    </View>
  );
}

function FormSection({ icon, title, description, children }) {
  return (
    <View
      style={{
        ...premiumCardStyle,
        padding: 17,
        marginBottom: 15,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          marginBottom: 16,
        }}
      >
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: AMBER_SOFT,
            borderWidth: 1,
            borderColor: AMBER_BORDER,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 11,
          }}
        >
          <Ionicons name={icon} size={20} color={EVENT_AMBER} />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              ...serifHeading,
              fontSize: 20,
              lineHeight: 25,
            }}
          >
            {title}
          </Text>

          {description ? (
            <Text
              style={{
                color: MUTED,
                fontSize: 12.5,
                fontWeight: "700",
                lineHeight: 18,
                marginTop: 4,
              }}
            >
              {description}
            </Text>
          ) : null}
        </View>
      </View>

      {children}
    </View>
  );
}

function IdentityFieldPanel({ number, title, description, children }) {
  return (
    <View
      style={{
        backgroundColor: "rgba(255, 252, 245, 0.78)",
        borderRadius: 20,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: OLIVE_SOFT,
            borderWidth: 1,
            borderColor: OLIVE_BORDER,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 9,
          }}
        >
          <Text
            style={{
              color: OLIVE,
              fontSize: 12,
              fontWeight: "900",
            }}
          >
            {number}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: TEXT,
              fontSize: 14,
              fontWeight: "900",
            }}
          >
            {title}
          </Text>

          {description ? (
            <Text
              style={{
                color: MUTED,
                fontSize: 11.5,
                fontWeight: "700",
                lineHeight: 17,
                marginTop: 3,
              }}
            >
              {description}
            </Text>
          ) : null}
        </View>
      </View>

      {children}
    </View>
  );
}

function TextField({
  label,
  required = false,
  value,
  onChangeText,
  placeholder,
  maxLength,
  multiline = false,
  keyboardType = "default",
  autoCapitalize = "sentences",
  helper,
  hideLabel = false,
}) {
  return (
    <View style={{ marginBottom: hideLabel ? 0 : 15 }}>
      {!hideLabel ? (
        <FieldLabel required={required}>{label}</FieldLabel>
      ) : null}

      <View
        style={{
          borderRadius: 18,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          backgroundColor: SURFACE,
          paddingHorizontal: 13,
          paddingVertical: multiline ? 11 : 0,
          minHeight: multiline ? 112 : 48,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(107, 114, 128, 0.78)"
          maxLength={maxLength}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={{
            flex: 1,
            minHeight: multiline ? 88 : 46,
            color: TEXT,
            fontSize: 14,
            fontWeight: "700",
            lineHeight: multiline ? 20 : undefined,
            paddingVertical: 0,
          }}
        />
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginTop: 6,
        }}
      >
        <Text
          style={{
            flex: 1,
            color: MUTED,
            fontSize: 10.5,
            fontWeight: "700",
            lineHeight: 15,
            paddingRight: 8,
          }}
        >
          {helper || ""}
        </Text>

        {maxLength ? (
          <Text
            style={{
              color: MUTED,
              fontSize: 10.5,
              fontWeight: "800",
            }}
          >
            {String(value || "").length}/{maxLength}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function ChoiceCard({
  icon,
  label,
  description,
  selected,
  onPress,
  compact = false,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: 18,
        borderWidth: 1,
        borderColor: selected ? AMBER_BORDER : CARD_BORDER,
        backgroundColor: selected
          ? AMBER_SOFT
          : pressed
          ? "rgba(79, 99, 59, 0.06)"
          : SURFACE,
        padding: compact ? 12 : 14,
        marginBottom: 9,
        opacity: pressed ? 0.78 : 1,
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        {icon ? (
          <View
            style={{
              width: 37,
              height: 37,
              borderRadius: 19,
              backgroundColor: selected ? AMBER_SOFT : OLIVE_SOFT,
              borderWidth: 1,
              borderColor: selected ? AMBER_BORDER : OLIVE_BORDER,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 11,
            }}
          >
            <Ionicons
              name={icon}
              size={18}
              color={selected ? EVENT_AMBER : OLIVE}
            />
          </View>
        ) : null}

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: selected ? EVENT_BROWN : TEXT,
              fontSize: 13.5,
              fontWeight: "900",
            }}
          >
            {label}
          </Text>

          {description ? (
            <Text
              style={{
                color: MUTED,
                fontSize: 11.5,
                fontWeight: "700",
                lineHeight: 17,
                marginTop: 3,
              }}
            >
              {description}
            </Text>
          ) : null}
        </View>

        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: 2,
            borderColor: selected ? EVENT_AMBER : CARD_BORDER,
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 9,
          }}
        >
          {selected ? (
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: EVENT_AMBER,
              }}
            />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function CategoryChip({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: selected
          ? AMBER_SOFT
          : pressed
          ? OLIVE_SOFT
          : SURFACE,
        borderWidth: 1,
        borderColor: selected ? AMBER_BORDER : CARD_BORDER,
        marginRight: 8,
        marginBottom: 8,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text
        style={{
          color: selected ? EVENT_BROWN : OLIVE,
          fontSize: 12,
          fontWeight: "900",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function AgreementRow({ value, onValueChange, title, description }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 10,
      }}
    >
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: CARD_BORDER,
          true: "rgba(180, 83, 9, 0.30)",
        }}
        thumbColor={value ? EVENT_AMBER : "#F4F1E8"}
      />

      <View
        style={{
          flex: 1,
          marginLeft: 11,
          paddingTop: 1,
        }}
      >
        <Text
          style={{
            color: TEXT,
            fontSize: 13,
            fontWeight: "900",
          }}
        >
          {title}
        </Text>

        <Text
          style={{
            color: MUTED,
            fontSize: 11.5,
            fontWeight: "700",
            lineHeight: 17,
            marginTop: 3,
          }}
        >
          {description}
        </Text>
      </View>
    </View>
  );
}

function IntroductionVideoCard({ onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        ...premiumCardStyle,
        flexDirection: "row",
        alignItems: "center",
        padding: 13,
        marginBottom: 16,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View
        style={{
          width: 92,
          height: 72,
          borderRadius: 17,
          overflow: "hidden",
          backgroundColor: OLIVE,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <View
          style={{
            position: "absolute",
            width: 110,
            height: 110,
            borderRadius: 55,
            backgroundColor: "rgba(255, 255, 255, 0.06)",
            top: -55,
            right: -30,
          }}
        />

        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(255, 255, 255, 0.94)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name="play"
            size={20}
            color={EVENT_AMBER}
            style={{ marginLeft: 2 }}
          />
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: EVENT_AMBER,
            fontSize: 10.5,
            fontWeight: "900",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Introduction
        </Text>

        <Text
          style={{
            ...serifHeading,
            fontSize: 17,
            lineHeight: 21,
            marginTop: 3,
          }}
        >
          What are Networks?
        </Text>

        <Text
          style={{
            color: MUTED,
            fontSize: 11.5,
            fontWeight: "700",
            lineHeight: 16,
            marginTop: 4,
          }}
          numberOfLines={2}
        >
          See how Networks connect people around shared faith,
          purpose and interests.
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={MUTED}
        style={{ marginLeft: 7 }}
      />
    </Pressable>
  );
}

function CategoryModal({
  visible,
  selectedCategory,
  searchQuery,
  onSearchChange,
  onSelect,
  onClose,
}) {
  const filteredCategories = useMemo(() => {
    const query = String(searchQuery || "").trim().toLowerCase();

    if (!query) {
      return ALL_CATEGORIES;
    }

    return ALL_CATEGORIES.filter((item) =>
      item.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: MODAL_BACKDROP,
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            backgroundColor: PREMIUM_CREAM,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: "82%",
            paddingTop: 10,
          }}
        >
          <View
            style={{
              width: 44,
              height: 5,
              borderRadius: 999,
              backgroundColor: "rgba(107, 114, 128, 0.28)",
              alignSelf: "center",
              marginBottom: 13,
            }}
          />

          <View
            style={{
              paddingHorizontal: 18,
              paddingBottom: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 24,
                  }}
                >
                  More categories
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 12.5,
                    fontWeight: "700",
                    lineHeight: 18,
                    marginTop: 4,
                  }}
                >
                  Choose the closest match. You can create your
                  own category by selecting Other.
                </Text>
              </View>

              <Pressable
                onPress={onClose}
                hitSlop={10}
                style={({ pressed }) => ({
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: pressed
                    ? OLIVE_SOFT
                    : SURFACE,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  alignItems: "center",
                  justifyContent: "center",
                })}
              >
                <Ionicons name="close" size={20} color={OLIVE} />
              </Pressable>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: SURFACE,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                paddingHorizontal: 12,
                minHeight: 47,
                marginTop: 15,
              }}
            >
              <Ionicons
                name="search-outline"
                size={18}
                color={OLIVE}
              />

              <TextInput
                value={searchQuery}
                onChangeText={onSearchChange}
                placeholder="Search categories"
                placeholderTextColor="rgba(107, 114, 128, 0.75)"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  flex: 1,
                  color: TEXT,
                  fontSize: 14,
                  fontWeight: "700",
                  marginLeft: 8,
                }}
              />

              {searchQuery ? (
                <Pressable onPress={() => onSearchChange("")}>
                  <Ionicons
                    name="close-circle"
                    size={19}
                    color={MUTED}
                  />
                </Pressable>
              ) : null}
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: 18,
              paddingBottom: 30,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
              }}
            >
              {filteredCategories.map((item) => (
                <CategoryChip
                  key={item}
                  label={item}
                  selected={selectedCategory === item}
                  onPress={() => onSelect(item)}
                />
              ))}
            </View>

            {filteredCategories.length === 0 ? (
              <View
                style={{
                  alignItems: "center",
                  paddingVertical: 30,
                }}
              >
                <Ionicons
                  name="search-outline"
                  size={28}
                  color={MUTED}
                />

                <Text
                  style={{
                    color: TEXT,
                    fontSize: 15,
                    fontWeight: "900",
                    marginTop: 10,
                  }}
                >
                  No category found
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 12.5,
                    fontWeight: "700",
                    textAlign: "center",
                    marginTop: 5,
                  }}
                >
                  Select Other to name your own category.
                </Text>

                <Pressable
                  onPress={() => onSelect("Other")}
                  style={({ pressed }) => ({
                    marginTop: 14,
                    borderRadius: 999,
                    paddingVertical: 10,
                    paddingHorizontal: 17,
                    backgroundColor: pressed
                      ? "rgba(180, 83, 9, 0.14)"
                      : AMBER_SOFT,
                    borderWidth: 1,
                    borderColor: AMBER_BORDER,
                  })}
                >
                  <Text
                    style={{
                      color: EVENT_BROWN,
                      fontSize: 12.5,
                      fontWeight: "900",
                    }}
                  >
                    Choose Other
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function InformationModal({
  visible,
  icon,
  title,
  message,
  buttonLabel = "Got it",
  onClose,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: MODAL_BACKDROP,
          justifyContent: "center",
          paddingHorizontal: 22,
        }}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            backgroundColor: SURFACE,
            borderRadius: 26,
            borderWidth: 1,
            borderColor: AMBER_BORDER,
            padding: 22,
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 24,
            shadowOffset: {
              width: 0,
              height: 12,
            },
            elevation: 12,
          }}
        >
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 29,
              alignSelf: "center",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              backgroundColor: AMBER_SOFT,
              borderWidth: 1,
              borderColor: AMBER_BORDER,
            }}
          >
            <Ionicons
              name={icon}
              size={28}
              color={EVENT_AMBER}
            />
          </View>

          <Text
            style={{
              ...serifHeading,
              fontSize: 22,
              textAlign: "center",
            }}
          >
            {title}
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 14,
              fontWeight: "700",
              lineHeight: 21,
              textAlign: "center",
              marginTop: 9,
            }}
          >
            {message}
          </Text>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({
              marginTop: 20,
              borderRadius: 999,
              paddingVertical: 12,
              alignItems: "center",
              backgroundColor: pressed ? "#92400E" : EVENT_AMBER,
            })}
          >
            <Text
              style={{
                color: SURFACE,
                fontSize: 14,
                fontWeight: "900",
              }}
            >
              {buttonLabel}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ResultModal({
  visible,
  success,
  title,
  message,
  onClose,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: MODAL_BACKDROP,
          justifyContent: "center",
          paddingHorizontal: 22,
        }}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            backgroundColor: SURFACE,
            borderRadius: 26,
            borderWidth: 1,
            borderColor: success
              ? AMBER_BORDER
              : "rgba(153, 27, 27, 0.20)",
            padding: 22,
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 24,
            shadowOffset: {
              width: 0,
              height: 12,
            },
            elevation: 12,
          }}
        >
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 29,
              alignSelf: "center",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              backgroundColor: success
                ? AMBER_SOFT
                : "rgba(153, 27, 27, 0.10)",
              borderWidth: 1,
              borderColor: success
                ? AMBER_BORDER
                : "rgba(153, 27, 27, 0.18)",
            }}
          >
            <Ionicons
              name={
                success
                  ? "checkmark-circle-outline"
                  : "alert-circle-outline"
              }
              size={29}
              color={success ? EVENT_AMBER : DANGER_RED}
            />
          </View>

          <Text
            style={{
              ...serifHeading,
              fontSize: 22,
              textAlign: "center",
            }}
          >
            {title}
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 14,
              fontWeight: "700",
              lineHeight: 21,
              textAlign: "center",
              marginTop: 9,
            }}
          >
            {message}
          </Text>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({
              marginTop: 20,
              borderRadius: 999,
              paddingVertical: 12,
              alignItems: "center",
              backgroundColor: pressed ? "#92400E" : EVENT_AMBER,
            })}
          >
            <Text
              style={{
                color: SURFACE,
                fontSize: 14,
                fontWeight: "900",
              }}
            >
              {success ? "Open Network" : "Try Again"}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function CreateNetwork() {
  const navigation = useNavigation();

  const [name, setName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [about, setAbout] = useState("");

  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [categoryModalVisible, setCategoryModalVisible] =
    useState(false);
  const [categorySearch, setCategorySearch] = useState("");

  const [scope, setScope] = useState("global");
  const [locationName, setLocationName] = useState("");
  const [countryCode, setCountryCode] = useState("");

  const [visibility, setVisibility] = useState("public");
  const [membershipMode, setMembershipMode] = useState("open");

  const [postingPolicy, setPostingPolicy] =
    useState("all_members");
  const [commentingPolicy, setCommentingPolicy] =
    useState("all_members");

  const [commercialMode, setCommercialMode] = useState("none");
  const [commercialDisclosure, setCommercialDisclosure] =
    useState("");

  const [rulesText, setRulesText] = useState("");
  const [safeguardingText, setSafeguardingText] = useState("");

  const [allowMemberInvites, setAllowMemberInvites] =
    useState(true);

  const [
    acceptedOwnerResponsibilities,
    setAcceptedOwnerResponsibilities,
  ] = useState(false);

  const [
    acceptedNetworkStandards,
    setAcceptedNetworkStandards,
  ] = useState(false);

  const [videoInfoVisible, setVideoInfoVisible] = useState(false);

  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [resultModal, setResultModal] = useState(null);
  const [createdNetwork, setCreatedNetwork] = useState(null);

  const needsLocation = [
    "local",
    "regional",
    "national",
  ].includes(scope);

  const needsCommercialDisclosure =
    commercialMode !== "none";

  const finalCategory =
    category === "Other"
      ? customCategory.trim()
      : category.trim();

  const canSubmit = useMemo(() => {
    if (saving) return false;
    if (name.trim().length < 3) return false;
    if (!finalCategory) return false;

    if (
      needsCommercialDisclosure &&
      !commercialDisclosure.trim()
    ) {
      return false;
    }

    if (
      !acceptedOwnerResponsibilities ||
      !acceptedNetworkStandards
    ) {
      return false;
    }

    return true;
  }, [
    acceptedNetworkStandards,
    acceptedOwnerResponsibilities,
    commercialDisclosure,
    finalCategory,
    name,
    needsCommercialDisclosure,
    saving,
  ]);

  function selectCategory(nextCategory) {
    setCategory(nextCategory);
    setCategorySearch("");
    setCategoryModalVisible(false);

    if (nextCategory !== "Other") {
      setCustomCategory("");
    }
  }

  function validateForm() {
    if (name.trim().length < 3) {
      return "Enter a Network name containing at least 3 characters.";
    }

    if (shortDescription.trim().length < 10) {
      return "Add a short description explaining what the Network is for.";
    }

    if (about.trim().length < 20) {
      return "Add a fuller purpose explaining what the Network will do.";
    }

    if (!finalCategory) {
      return category === "Other"
        ? "Name your custom Network category."
        : "Choose a Network category.";
    }

    if (needsLocation && !locationName.trim()) {
      return "Add the location served by this Network.";
    }

    if (
      needsCommercialDisclosure &&
      !commercialDisclosure.trim()
    ) {
      return "Commercial and brand-led Networks must include a clear disclosure.";
    }

    if (!acceptedOwnerResponsibilities) {
      return "Confirm that you accept the responsibilities of a Network owner.";
    }

    if (!acceptedNetworkStandards) {
      return "Confirm that this Network will follow Triunely’s Network standards.";
    }

    return "";
  }

  async function handleCreateNetwork() {
    if (saving) return;

    const validationError = validateForm();

    if (validationError) {
      setFieldError(validationError);
      return;
    }

    try {
      setSaving(true);
      setFieldError("");

      const { data, error } = await supabase.rpc(
        "create_network_rpc",
        {
          p_name: name.trim(),
          p_short_description: trimOrNull(shortDescription),
          p_about: trimOrNull(about),
          p_category: finalCategory,

          p_scope: scope,
          p_visibility: visibility,
          p_membership_mode: membershipMode,

          p_location_name: trimOrNull(locationName),
          p_country_code: trimOrNull(countryCode),

          p_avatar_url: null,
          p_cover_image_url: null,
          p_icon_name: null,

          p_creator_context: "independent",

          p_posting_policy: postingPolicy,
          p_commenting_policy: commentingPolicy,

          p_commercial_mode: commercialMode,
          p_commercial_disclosure:
            trimOrNull(commercialDisclosure),

          p_rules_text: trimOrNull(rulesText),
          p_safeguarding_text: trimOrNull(safeguardingText),

          p_allow_member_invites: allowMemberInvites,
        }
      );

      if (error) throw error;

      if (!data?.id || !data?.slug) {
        throw new Error(
          "The Network was created but its identity was not returned."
        );
      }

      setCreatedNetwork(data);

      setResultModal({
        success: true,
        title: "Network created",
        message: `${data.name} is now live. You are its owner and first member.`,
      });
    } catch (error) {
      console.log("Create Network RPC error:", error);

      setResultModal({
        success: false,
        title: "Network could not be created",
        message:
          error?.message ||
          "Triunely could not create this Network. Please check the details and try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleResultModalClose() {
    if (resultModal?.success && createdNetwork) {
      setResultModal(null);

      navigation.replace("NetworkDetail", {
        networkId: createdNetwork.slug,
        networkUuid: createdNetwork.id,
        networkSlug: createdNetwork.slug,
        slug: createdNetwork.slug,
      });

      return;
    }

    setResultModal(null);
  }

  return (
    <Screen
      backgroundColor={PREMIUM_CREAM}
      padded={false}
      style={{ flex: 1 }}
    >
      {({ bottomPad }) => (
        <>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={
              Platform.OS === "ios" ? "padding" : undefined
            }
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: bottomPad + 30,
              }}
            >
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
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: pressed
                      ? OLIVE_SOFT
                      : SURFACE,
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                    shadowColor: SHADOW,
                    shadowOpacity: 0.08,
                    shadowRadius: 7,
                    shadowOffset: {
                      width: 0,
                      height: 3,
                    },
                    elevation: 2,
                  })}
                >
                  <Ionicons
                    name="chevron-back"
                    size={23}
                    color={OLIVE}
                  />
                </Pressable>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 7,
                    paddingHorizontal: 11,
                    borderRadius: 999,
                    backgroundColor: AMBER_SOFT,
                    borderWidth: 1,
                    borderColor: AMBER_BORDER,
                  }}
                >
                  <Ionicons
                    name="person-circle-outline"
                    size={15}
                    color={EVENT_AMBER}
                  />

                  <Text
                    style={{
                      color: EVENT_BROWN,
                      fontSize: 11,
                      fontWeight: "900",
                      marginLeft: 5,
                    }}
                  >
                    You’ll be the owner
                  </Text>
                </View>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 34,
                    lineHeight: 40,
                    letterSpacing: -0.8,
                  }}
                >
                  Create a Network
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 14,
                    fontWeight: "700",
                    lineHeight: 21,
                    marginTop: 8,
                  }}
                >
                  Build a Christian community around a calling,
                  cause, profession, location, interest or shared
                  mission.
                </Text>
              </View>

              <IntroductionVideoCard
                onPress={() => setVideoInfoVisible(true)}
              />

              <FormSection
                icon="git-network-outline"
                title="Network identity"
                description="Help people quickly understand what your Network is and who it is for."
              >
                <IdentityFieldPanel
                  number="1"
                  title="Network name"
                  description="Choose a clear, recognisable name."
                >
                  <TextField
                    hideLabel
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Christian Creatives Network"
                    maxLength={80}
                    helper="This will appear in discovery, search and invitations."
                  />
                </IdentityFieldPanel>

                <IdentityFieldPanel
                  number="2"
                  title="Short description"
                  description="A quick summary people can understand at a glance."
                >
                  <TextField
                    hideLabel
                    value={shortDescription}
                    onChangeText={setShortDescription}
                    placeholder="e.g. A community for Christian designers, photographers and filmmakers to connect, collaborate and grow."
                    maxLength={240}
                    multiline
                    helper="Aim for one or two strong sentences."
                  />
                </IdentityFieldPanel>

                <IdentityFieldPanel
                  number="3"
                  title="Full purpose"
                  description="Explain what the Network will do and what members can expect."
                >
                  <TextField
                    hideLabel
                    value={about}
                    onChangeText={setAbout}
                    placeholder="e.g. This Network brings together Christian creatives to share work, find collaborators, support one another and explore how faith shapes creativity."
                    maxLength={5000}
                    multiline
                    helper="You can expand this later through Network Admin."
                  />
                </IdentityFieldPanel>

                <IdentityFieldPanel
                  number="4"
                  title="Category"
                  description="Choose the closest category so people can discover the Network."
                >
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                    }}
                  >
                    {FEATURED_CATEGORIES.map((item) => (
                      <CategoryChip
                        key={item}
                        label={item}
                        selected={category === item}
                        onPress={() => selectCategory(item)}
                      />
                    ))}

                    <Pressable
                      onPress={() =>
                        setCategoryModalVisible(true)
                      }
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 9,
                        paddingHorizontal: 12,
                        borderRadius: 999,
                        backgroundColor: pressed
                          ? AMBER_SOFT
                          : SURFACE,
                        borderWidth: 1,
                        borderColor: AMBER_BORDER,
                        marginRight: 8,
                        marginBottom: 8,
                      })}
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={16}
                        color={EVENT_AMBER}
                      />

                      <Text
                        style={{
                          color: EVENT_BROWN,
                          fontSize: 12,
                          fontWeight: "900",
                          marginLeft: 5,
                        }}
                      >
                        More categories
                      </Text>
                    </Pressable>
                  </View>

                  {category &&
                  !FEATURED_CATEGORIES.includes(category) ? (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        alignSelf: "flex-start",
                        backgroundColor: AMBER_SOFT,
                        borderWidth: 1,
                        borderColor: AMBER_BORDER,
                        borderRadius: 999,
                        paddingVertical: 7,
                        paddingHorizontal: 10,
                        marginTop: 3,
                      }}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={EVENT_AMBER}
                      />

                      <Text
                        style={{
                          color: EVENT_BROWN,
                          fontSize: 12,
                          fontWeight: "900",
                          marginLeft: 5,
                        }}
                      >
                        {category}
                      </Text>
                    </View>
                  ) : null}

                  {category === "Other" ? (
                    <View style={{ marginTop: 12 }}>
                      <FieldLabel required>
                        Name your category
                      </FieldLabel>

                      <TextField
                        hideLabel
                        value={customCategory}
                        onChangeText={setCustomCategory}
                        placeholder="e.g. Christian Farming, Homeschooling or Prison Ministry"
                        maxLength={80}
                        helper="Use a short, clear category name."
                      />
                    </View>
                  ) : null}
                </IdentityFieldPanel>
              </FormSection>

              <FormSection
                icon="earth-outline"
                title="Scope and location"
                description="Choose the geographic or online reach of this Network."
              >
                {SCOPE_OPTIONS.map((option) => (
                  <ChoiceCard
                    key={option.value}
                    icon={option.icon}
                    label={option.label}
                    description={option.description}
                    selected={scope === option.value}
                    onPress={() => setScope(option.value)}
                  />
                ))}

                {needsLocation ? (
                  <>
                    <View style={{ height: 7 }} />

                    <TextField
                      label="Location"
                      required
                      value={locationName}
                      onChangeText={setLocationName}
                      placeholder="e.g. Southampton, Hampshire"
                      maxLength={160}
                    />

                    <TextField
                      label="Country code"
                      value={countryCode}
                      onChangeText={(value) =>
                        setCountryCode(
                          value.toUpperCase().slice(0, 2)
                        )
                      }
                      placeholder="e.g. GB"
                      maxLength={2}
                      autoCapitalize="characters"
                      helper="Use the two-letter country code where relevant."
                    />
                  </>
                ) : null}
              </FormSection>

              <FormSection
                icon="lock-open-outline"
                title="Visibility and membership"
                description="Control how people discover and join the Network."
              >
                <FieldLabel required>Visibility</FieldLabel>

                {VISIBILITY_OPTIONS.map((option) => (
                  <ChoiceCard
                    key={option.value}
                    icon={option.icon}
                    label={option.label}
                    description={option.description}
                    selected={visibility === option.value}
                    onPress={() => setVisibility(option.value)}
                  />
                ))}

                <View style={{ height: 12 }} />

                <FieldLabel required>
                  Membership mode
                </FieldLabel>

                {MEMBERSHIP_OPTIONS.map((option) => (
                  <ChoiceCard
                    key={option.value}
                    icon={option.icon}
                    label={option.label}
                    description={option.description}
                    selected={membershipMode === option.value}
                    onPress={() =>
                      setMembershipMode(option.value)
                    }
                  />
                ))}

                <AgreementRow
                  value={allowMemberInvites}
                  onValueChange={setAllowMemberInvites}
                  title="Allow members to invite people"
                  description="Invitations will still respect this Network’s membership and approval settings."
                />
              </FormSection>

              <FormSection
                icon="chatbubbles-outline"
                title="Participation"
                description="Choose who will be able to publish and comment when Network posts are connected."
              >
                <FieldLabel required>
                  Who may post?
                </FieldLabel>

                {POSTING_OPTIONS.map((option) => (
                  <ChoiceCard
                    key={option.value}
                    label={option.label}
                    description={option.description}
                    selected={postingPolicy === option.value}
                    onPress={() =>
                      setPostingPolicy(option.value)
                    }
                    compact
                  />
                ))}

                <View style={{ height: 10 }} />

                <FieldLabel required>
                  Who may comment?
                </FieldLabel>

                {COMMENTING_OPTIONS.map((option) => (
                  <ChoiceCard
                    key={option.value}
                    label={option.label}
                    description={option.description}
                    selected={commentingPolicy === option.value}
                    onPress={() =>
                      setCommentingPolicy(option.value)
                    }
                    compact
                  />
                ))}
              </FormSection>

              <FormSection
                icon="briefcase-outline"
                title="Commercial disclosure"
                description="Commercial activity is allowed, but it must be transparent."
              >
                {COMMERCIAL_OPTIONS.map((option) => (
                  <ChoiceCard
                    key={option.value}
                    icon={option.icon}
                    label={option.label}
                    description={option.description}
                    selected={commercialMode === option.value}
                    onPress={() =>
                      setCommercialMode(option.value)
                    }
                  />
                ))}

                {needsCommercialDisclosure ? (
                  <View style={{ marginTop: 8 }}>
                    <TextField
                      label="Commercial disclosure"
                      required
                      value={commercialDisclosure}
                      onChangeText={setCommercialDisclosure}
                      placeholder="Explain the commercial connection, business interest or brand relationship."
                      maxLength={1000}
                      multiline
                      helper="This helps members understand who benefits commercially from the Network."
                    />
                  </View>
                ) : null}
              </FormSection>

              <FormSection
                icon="document-text-outline"
                title="Rules and safeguarding"
                description="You can add initial standards now and expand them later through Network Admin."
              >
                <TextField
                  label="Network rules"
                  value={rulesText}
                  onChangeText={setRulesText}
                  placeholder="Add the main standards members should follow."
                  maxLength={5000}
                  multiline
                />

                <TextField
                  label="Safeguarding information"
                  value={safeguardingText}
                  onChangeText={setSafeguardingText}
                  placeholder="Add any relevant safety, age, access or safeguarding information."
                  maxLength={5000}
                  multiline
                />
              </FormSection>

              <FormSection
                icon="shield-checkmark-outline"
                title="Owner responsibilities"
                description="The creator becomes the Network owner and first joined member."
              >
                <AgreementRow
                  value={acceptedOwnerResponsibilities}
                  onValueChange={
                    setAcceptedOwnerResponsibilities
                  }
                  title="I accept responsibility for this Network"
                  description="I understand that owners are accountable for membership, moderation, accurate representation and lawful use."
                />

                <AgreementRow
                  value={acceptedNetworkStandards}
                  onValueChange={setAcceptedNetworkStandards}
                  title="This Network will follow Triunely standards"
                  description="The Network will not be used for harassment, threats, unlawful activity, deceptive impersonation, spam or hidden commercial outreach."
                />
              </FormSection>

              {fieldError ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    backgroundColor:
                      "rgba(153, 27, 27, 0.08)",
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor:
                      "rgba(153, 27, 27, 0.16)",
                    padding: 13,
                    marginBottom: 14,
                  }}
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={20}
                    color={DANGER_RED}
                    style={{ marginTop: 1 }}
                  />

                  <Text
                    style={{
                      flex: 1,
                      color: DANGER_RED,
                      fontSize: 12.5,
                      fontWeight: "800",
                      lineHeight: 18,
                      marginLeft: 9,
                    }}
                  >
                    {fieldError}
                  </Text>
                </View>
              ) : null}

              <Pressable
                onPress={handleCreateNetwork}
                disabled={!canSubmit}
                style={({ pressed }) => ({
                  minHeight: 54,
                  borderRadius: 999,
                  backgroundColor: canSubmit
                    ? pressed
                      ? "#92400E"
                      : EVENT_AMBER
                    : "rgba(107, 114, 128, 0.22)",
                  borderWidth: 1,
                  borderColor: canSubmit
                    ? AMBER_BORDER
                    : CARD_BORDER,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 20,
                  opacity: saving ? 0.75 : 1,
                })}
              >
                {saving ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <ActivityIndicator
                      size="small"
                      color={SURFACE}
                    />

                    <Text
                      style={{
                        color: SURFACE,
                        fontSize: 14,
                        fontWeight: "900",
                        marginLeft: 9,
                      }}
                    >
                      Creating Network...
                    </Text>
                  </View>
                ) : (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name="git-network-outline"
                      size={20}
                      color={canSubmit ? SURFACE : MUTED}
                    />

                    <Text
                      style={{
                        color: canSubmit ? SURFACE : MUTED,
                        fontSize: 14,
                        fontWeight: "900",
                        marginLeft: 8,
                      }}
                    >
                      Create Network
                    </Text>
                  </View>
                )}
              </Pressable>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 10.5,
                  fontWeight: "700",
                  lineHeight: 15,
                  textAlign: "center",
                  marginTop: 10,
                  paddingHorizontal: 16,
                }}
              >
                Basic Network creation is available to eligible
                users. Verification and premium tools will later
                support greater trust, scale and professional
                management.
              </Text>
            </ScrollView>
          </KeyboardAvoidingView>

          <CategoryModal
            visible={categoryModalVisible}
            selectedCategory={category}
            searchQuery={categorySearch}
            onSearchChange={setCategorySearch}
            onSelect={selectCategory}
            onClose={() => {
              setCategoryModalVisible(false);
              setCategorySearch("");
            }}
          />

          <InformationModal
            visible={videoInfoVisible}
            icon="videocam-outline"
            title="Introduction video"
            message="Your Networks introduction video will live here. When the video is ready, this card can open the full-screen Triunely video player."
            onClose={() => setVideoInfoVisible(false)}
          />

          <ResultModal
            visible={Boolean(resultModal)}
            success={Boolean(resultModal?.success)}
            title={resultModal?.title || ""}
            message={resultModal?.message || ""}
            onClose={handleResultModalClose}
          />
        </>
      )}
    </Screen>
  );
}