import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";

import Screen from "../components/Screen";
import { theme } from "../theme/theme";

const HEAVENLY_GOLD = "#D99400";
const DEEP_OLIVE = "#4F633B";
const SOFT_GOLD_BG = "rgba(217, 148, 0, 0.10)";
const SOFT_OLIVE_BG = "rgba(79, 99, 59, 0.10)";
const CARD_BORDER = "rgba(217, 148, 0, 0.18)";

const mockAdminCampaigns = [
  {
    id: "local-outreach",
    title: "Local Outreach",
    status: "Active",
    raised: "£680",
    goal: "£1,500",
  },
  {
    id: "mission-fund",
    title: "Mission Fund",
    status: "Active",
    raised: "£920",
    goal: "£2,500",
  },
  {
    id: "community-need",
    title: "Community Need",
    status: "Draft",
    raised: "£350",
    goal: "£1,000",
  },
];

function AdminStatCard({ icon, label, value, tint = "gold" }) {
  const isOlive = tint === "olive";

  return (
    <View
      style={{
        flex: 1,
        minHeight: 96,
        borderRadius: 18,
        padding: 12,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: CARD_BORDER,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: isOlive ? SOFT_OLIVE_BG : SOFT_GOLD_BG,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        <Ionicons
          name={icon}
          size={18}
          color={isOlive ? DEEP_OLIVE : HEAVENLY_GOLD}
        />
      </View>

      <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: "900" }}>
        {value}
      </Text>

      <Text
        style={{
          color: theme.colors.muted,
          fontSize: 11,
          fontWeight: "700",
          marginTop: 3,
          lineHeight: 14,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function AdminCampaignRow({ campaign }) {
  const isDraft = campaign.status === "Draft";

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 18,
        padding: 14,
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: "900" }}>
            {campaign.title}
          </Text>

          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 12,
              fontWeight: "700",
              marginTop: 5,
            }}
          >
            {campaign.raised} raised of {campaign.goal}
          </Text>
        </View>

        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 999,
            backgroundColor: isDraft ? SOFT_OLIVE_BG : SOFT_GOLD_BG,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            alignSelf: "flex-start",
          }}
        >
          <Text
            style={{
              color: isDraft ? DEEP_OLIVE : HEAVENLY_GOLD,
              fontSize: 11,
              fontWeight: "900",
            }}
          >
            {campaign.status}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <Pressable
          onPress={() => {}}
          style={[
            theme.button.outline,
            {
              flex: 1,
              borderRadius: 14,
              paddingVertical: 10,
            },
          ]}
        >
          <Text style={theme.button.outlineText}>Edit</Text>
        </Pressable>

        <Pressable
          onPress={() => {}}
          style={[
            theme.button.primary,
            {
              flex: 1,
              borderRadius: 14,
              paddingVertical: 10,
            },
          ]}
        >
          <Text style={theme.button.primaryText}>Update</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ChurchAdminGiving({ navigation, route }) {
  const { churchId, churchName } = route?.params || {};
  const name = churchName || "Church";

  return (
    <Screen backgroundColor={theme.colors.bg} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: bottomPad + 24,
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
              <Ionicons name="chevron-back" size={22} color={DEEP_OLIVE} />
            </Pressable>

            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
              Giving Admin
            </Text>

            <View style={{ width: 38 }} />
          </View>

          <Text
            style={{
              color: theme.colors.text,
              fontSize: 28,
              fontWeight: "900",
              letterSpacing: -0.7,
              marginBottom: 8,
            }}
          >
            Giving dashboard
          </Text>

          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 15,
              fontWeight: "700",
              lineHeight: 22,
              marginBottom: 18,
            }}
          >
            Manage giving campaigns, impact updates and stewardship communication for {name}.
          </Text>

          <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
            <AdminStatCard icon="heart-outline" label="Mock regular giving" value="£1,240" />
            <AdminStatCard icon="flag-outline" label="Active campaigns" value="2" tint="olive" />
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginBottom: 18 }}>
            <AdminStatCard icon="people-outline" label="Mock supporters" value="37" tint="olive" />
            <AdminStatCard icon="newspaper-outline" label="Impact updates" value="3" />
          </View>

          <Pressable
            onPress={() => {}}
            style={[
              theme.button.primary,
              {
                borderRadius: 16,
                paddingVertical: 14,
                marginBottom: 18,
                flexDirection: "row",
                gap: 8,
              },
            ]}
          >
            <Ionicons name="add-circle-outline" size={18} color={theme.colors.text} />
            <Text style={theme.button.primaryText}>Create mock campaign</Text>
          </Pressable>

          <Text
            style={{
              color: theme.colors.text,
              fontSize: 22,
              fontWeight: "900",
              marginBottom: 10,
            }}
          >
            Campaigns
          </Text>

          {mockAdminCampaigns.map((campaign) => (
            <AdminCampaignRow key={campaign.id} campaign={campaign} />
          ))}

          <Text
            style={{
              color: theme.colors.text,
              fontSize: 22,
              fontWeight: "900",
              marginTop: 10,
              marginBottom: 10,
            }}
          >
            Impact communication
          </Text>

          <View
            style={{
              backgroundColor: SOFT_OLIVE_BG,
              borderWidth: 1,
              borderColor: CARD_BORDER,
              borderRadius: 18,
              padding: 14,
              marginBottom: 14,
            }}
          >
            <Text style={{ color: DEEP_OLIVE, fontWeight: "900", fontSize: 15 }}>
              Keep giving transparent
            </Text>

            <Text
              style={{
                color: theme.colors.muted,
                fontWeight: "700",
                lineHeight: 19,
                marginTop: 6,
              }}
            >
              Churches will be able to post updates showing what giving helped achieve,
              without public donor rankings or pressure-based messaging.
            </Text>
          </View>

          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: CARD_BORDER,
              borderRadius: 18,
              padding: 14,
            }}
          >
            <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 15 }}>
              Coming later
            </Text>

            <Text
              style={{
                color: theme.colors.muted,
                fontWeight: "700",
                lineHeight: 19,
                marginTop: 6,
              }}
            >
              Real campaign editing, Supabase tables, receipts, Gift Aid and Stripe
              will be added only after the mock UI is stable.
            </Text>
          </View>

          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 11,
              fontWeight: "700",
              textAlign: "center",
              marginTop: 18,
            }}
          >
            Church ID: {churchId || "not set"}
          </Text>
        </ScrollView>
      )}
    </Screen>
  );
}