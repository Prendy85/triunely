import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
    Alert,
    Modal,
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

const mockAmounts = [5, 10, 20, 50];

const mockCampaigns = [
  {
    id: "local-outreach",
    icon: "people-outline",
    title: "Local Outreach",
    subtitle:
      "Help fund care, evangelism and practical support in the local community.",
    raised: 680,
    goal: 1500,
    tint: "gold",
  },
  {
    id: "mission-fund",
    icon: "earth-outline",
    title: "Mission Fund",
    subtitle: "Support mission work connected to the wider church family.",
    raised: 920,
    goal: 2500,
    tint: "olive",
  },
  {
    id: "community-need",
    icon: "hand-left-outline",
    title: "Community Need",
    subtitle:
      "Support a trusted need shared by the church with transparency and care.",
    raised: 350,
    goal: 1000,
    tint: "gold",
  },
];

const mockImpactUpdates = [
  {
    id: "food-support",
    icon: "heart-outline",
    title: "Families supported this month",
    body:
      "Your church community helped provide practical support for local families through meals, care and pastoral follow-up.",
    meta: "Community care",
  },
  {
    id: "outreach-evening",
    icon: "people-outline",
    title: "Outreach evening funded",
    body:
      "Recent giving helped cover venue costs, refreshments and materials for a local outreach evening.",
    meta: "Local outreach",
  },
  {
    id: "mission-partner",
    icon: "earth-outline",
    title: "Mission partner update",
    body:
      "Support has helped continue mission work connected to the wider church family.",
    meta: "Mission",
  },
];

const mockContributionBadges = [
  {
    id: "faithful-supporter",
    icon: "heart-outline",
    title: "Faithful Supporter",
    body: "Recognises regular participation in supporting church life.",
  },
  {
    id: "prayerful-member",
    icon: "hand-left-outline",
    title: "Prayerful Member",
    body: "Recognises prayer, encouragement and spiritual support.",
  },
  {
    id: "serving-hands",
    icon: "construct-outline",
    title: "Serving Hands",
    body: "Recognises volunteering, service and practical help.",
  },
  {
    id: "mission-hearted",
    icon: "earth-outline",
    title: "Mission Hearted",
    body: "Recognises support for mission, outreach and community work.",
  },
];

function formatPounds(value) {
  return `£${Number(value || 0).toLocaleString("en-GB")}`;
}

function GivingFrequencyButton({ label, subtitle, icon, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 112,
        borderRadius: 18,
        padding: 12,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: HEAVENLY_GOLD,
        shadowOpacity: pressed ? 0.04 : 0.09,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: pressed ? 1 : 3,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: SOFT_GOLD_BG,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        <Ionicons name={icon} size={20} color={HEAVENLY_GOLD} />
      </View>

      <Text
        style={{
          color: theme.colors.text,
          fontSize: 12,
          fontWeight: "900",
          textAlign: "center",
        }}
      >
        {label}
      </Text>

      <Text
        style={{
          color: theme.colors.muted,
          fontSize: 10,
          fontWeight: "700",
          textAlign: "center",
          marginTop: 4,
          lineHeight: 13,
        }}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}

function CampaignCard({ campaign, onPress }) {
  const isOlive = campaign.tint === "olive";
  const progress = Math.min(
    100,
    Math.round((campaign.raised / campaign.goal) * 100)
  );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 20,
        padding: 15,
        marginBottom: 12,
        shadowColor: HEAVENLY_GOLD,
        shadowOpacity: pressed ? 0.04 : 0.09,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: pressed ? 1 : 3,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: isOlive ? SOFT_OLIVE_BG : SOFT_GOLD_BG,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={campaign.icon}
            size={22}
            color={isOlive ? DEEP_OLIVE : HEAVENLY_GOLD}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: theme.colors.text,
              fontSize: 16,
              fontWeight: "900",
            }}
          >
            {campaign.title}
          </Text>

          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 12.5,
              fontWeight: "700",
              lineHeight: 17,
              marginTop: 4,
            }}
          >
            {campaign.subtitle}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 14 }}>
        <View
          style={{
            height: 8,
            borderRadius: 999,
            backgroundColor: theme.colors.surfaceAlt,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: theme.colors.divider,
          }}
        >
          <View
            style={{
              height: "100%",
              width: `${progress}%`,
              backgroundColor: isOlive ? DEEP_OLIVE : HEAVENLY_GOLD,
              borderRadius: 999,
            }}
          />
        </View>

        <View
          style={{
            marginTop: 8,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              color: theme.colors.text2,
              fontSize: 12,
              fontWeight: "900",
            }}
          >
            {formatPounds(campaign.raised)} raised
          </Text>

          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 12,
              fontWeight: "800",
            }}
          >
            Goal {formatPounds(campaign.goal)}
          </Text>
        </View>
      </View>

      <View
        style={{
          marginTop: 13,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            color: isOlive ? DEEP_OLIVE : HEAVENLY_GOLD,
            fontWeight: "900",
          }}
        >
          {progress}% funded
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Text
            style={{
              color: HEAVENLY_GOLD,
              fontSize: 13,
              fontWeight: "900",
            }}
          >
            Give
          </Text>

          <Ionicons name="chevron-forward" size={14} color={HEAVENLY_GOLD} />
        </View>
      </View>
    </Pressable>
  );
}

function ImpactUpdateCard({ update }) {
  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 18,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: SOFT_OLIVE_BG,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={update.icon} size={21} color={DEEP_OLIVE} />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: DEEP_OLIVE,
              fontSize: 11,
              fontWeight: "900",
              marginBottom: 4,
            }}
          >
            {update.meta}
          </Text>

          <Text
            style={{
              color: theme.colors.text,
              fontSize: 15,
              fontWeight: "900",
            }}
          >
            {update.title}
          </Text>

          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 12.5,
              fontWeight: "700",
              lineHeight: 18,
              marginTop: 5,
            }}
          >
            {update.body}
          </Text>
        </View>
      </View>
    </View>
  );
}

function ContributionBadgeCard({ badge }) {
  return (
    <View
      style={{
        width: "48%",
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 18,
        padding: 12,
        marginBottom: 10,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: SOFT_GOLD_BG,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}
      >
        <Ionicons name={badge.icon} size={20} color={HEAVENLY_GOLD} />
      </View>

      <Text
        style={{
          color: theme.colors.text,
          fontSize: 13,
          fontWeight: "900",
        }}
      >
        {badge.title}
      </Text>

      <Text
        style={{
          color: theme.colors.muted,
          fontSize: 11,
          fontWeight: "700",
          lineHeight: 15,
          marginTop: 5,
        }}
      >
        {badge.body}
      </Text>
    </View>
  );
}

function DonationFlowModal({
  visible,
  givingTarget,
  selectedAmount,
  setSelectedAmount,
  customAmount,
  setCustomAmount,
  amountMode,
  setAmountMode,
  onClose,
  onMockConfirm,
}) {
  if (!givingTarget) return null;

  const reviewAmount =
    amountMode === "custom" ? Number(customAmount || 0) : selectedAmount;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.colors.divider,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 20,
                fontWeight: "900",
                flex: 1,
              }}
            >
              Give to {givingTarget.title}
            </Text>

            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={theme.colors.text2} />
            </Pressable>
          </View>

          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 13,
              fontWeight: "700",
              lineHeight: 19,
              marginTop: 8,
            }}
          >
            This is a mock donation flow. No payment will be taken.
          </Text>

          <View style={{ marginTop: 16 }}>
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 15,
                fontWeight: "900",
                marginBottom: 10,
              }}
            >
              Choose an amount
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {mockAmounts.map((amount) => {
                const selected =
                  amountMode === "preset" && selectedAmount === amount;

                return (
                  <Pressable
                    key={amount}
                    onPress={() => {
                      setAmountMode("preset");
                      setSelectedAmount(amount);
                      setCustomAmount("");
                    }}
                    style={{
                      width: "47%",
                      paddingVertical: 14,
                      borderRadius: 16,
                      alignItems: "center",
                      backgroundColor: selected
                        ? SOFT_GOLD_BG
                        : theme.colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor: selected
                        ? HEAVENLY_GOLD
                        : theme.colors.divider,
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? HEAVENLY_GOLD : theme.colors.text,
                        fontSize: 18,
                        fontWeight: "900",
                      }}
                    >
                      {formatPounds(amount)}
                    </Text>
                  </Pressable>
                );
              })}

              <Pressable
                onPress={() => {
                  setAmountMode("custom");
                  setSelectedAmount(null);
                }}
                style={{
                  width: "47%",
                  paddingVertical: 14,
                  borderRadius: 16,
                  alignItems: "center",
                  backgroundColor:
                    amountMode === "custom"
                      ? SOFT_GOLD_BG
                      : theme.colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor:
                    amountMode === "custom"
                      ? HEAVENLY_GOLD
                      : theme.colors.divider,
                }}
              >
                <Text
                  style={{
                    color:
                      amountMode === "custom"
                        ? HEAVENLY_GOLD
                        : theme.colors.text,
                    fontSize: 18,
                    fontWeight: "900",
                  }}
                >
                  Other
                </Text>
              </Pressable>
            </View>

            {amountMode === "custom" ? (
              <View style={{ marginTop: 12 }}>
                <Text
                  style={{
                    color: theme.colors.muted,
                    fontWeight: "800",
                    marginBottom: 6,
                  }}
                >
                  Enter other amount
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: theme.colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: HEAVENLY_GOLD,
                    borderRadius: 16,
                    paddingHorizontal: 12,
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: 18,
                      fontWeight: "900",
                      marginRight: 4,
                    }}
                  >
                    £
                  </Text>

                  <TextInput
                    value={customAmount}
                    onChangeText={(value) => {
                      const cleaned = value.replace(/[^0-9.]/g, "");
                      setCustomAmount(cleaned);
                    }}
                    placeholder="Enter amount"
                    placeholderTextColor={theme.colors.muted}
                    keyboardType="decimal-pad"
                    style={{
                      flex: 1,
                      color: theme.colors.text,
                      fontSize: 18,
                      fontWeight: "900",
                      paddingVertical: 12,
                    }}
                  />
                </View>
              </View>
            ) : null}
          </View>

          <View
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 18,
              backgroundColor: SOFT_OLIVE_BG,
              borderWidth: 1,
              borderColor: CARD_BORDER,
            }}
          >
            <Text style={{ color: DEEP_OLIVE, fontWeight: "900" }}>
              Review
            </Text>

            <Text
              style={{
                color: theme.colors.muted,
                marginTop: 6,
                fontWeight: "700",
                lineHeight: 19,
              }}
            >
              {formatPounds(reviewAmount)} towards {givingTarget.title}
              {givingTarget.frequency ? ` · ${givingTarget.frequency}` : ""}
            </Text>
          </View>

          <Pressable
            onPress={onMockConfirm}
            style={[
              theme.button.primary,
              {
                marginTop: 16,
                borderRadius: 16,
                paddingVertical: 14,
              },
            ]}
          >
            <Text style={theme.button.primaryText}>Continue mock donation</Text>
          </Pressable>

          <Pressable
            onPress={onClose}
            style={[
              theme.button.outline,
              {
                marginTop: 10,
                borderRadius: 16,
                paddingVertical: 13,
              },
            ]}
          >
            <Text style={theme.button.outlineText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function ChurchGiving({ navigation, route }) {
  const churchId = route?.params?.churchId;
  const churchName = route?.params?.churchName || "your church";

  const [donationVisible, setDonationVisible] = useState(false);
  const [givingTarget, setGivingTarget] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(20);
  const [customAmount, setCustomAmount] = useState("");
  const [amountMode, setAmountMode] = useState("preset");

  function openDonationFlow(target) {
    setGivingTarget(target);
    setSelectedAmount(20);
    setCustomAmount("");
    setAmountMode("preset");
    setDonationVisible(true);
  }

  function closeDonationFlow() {
    setDonationVisible(false);
    setGivingTarget(null);
    setSelectedAmount(20);
    setCustomAmount("");
    setAmountMode("preset");
  }

  function getFinalAmount() {
    return amountMode === "custom"
      ? Number(customAmount || 0)
      : Number(selectedAmount || 0);
  }

  function handleMockConfirm() {
    const amount = getFinalAmount();

    if (!amount || amount <= 0) {
      Alert.alert(
        "Enter an amount",
        "Please choose or enter an amount greater than £0."
      );
      return;
    }

    const targetTitle = givingTarget?.title || "Giving";

    closeDonationFlow();

    setTimeout(() => {
      Alert.alert(
        "Mock donation complete",
        `${formatPounds(
          amount
        )} towards ${targetTitle} has been confirmed in this mock flow. Real payments will be added later with Stripe.`
      );
    }, 250);
  }

  return (
    <Screen backgroundColor={theme.colors.bg} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <>
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

              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: 18,
                  fontWeight: "900",
                }}
              >
                Giving
              </Text>

              <View style={{ width: 38 }} />
            </View>

            <View style={{ marginBottom: 18 }}>
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: 28,
                  fontWeight: "900",
                  letterSpacing: -0.7,
                  marginBottom: 8,
                }}
              >
                Give with purpose
              </Text>

              <Text
                style={{
                  color: theme.colors.muted,
                  fontSize: 16,
                  fontWeight: "700",
                  lineHeight: 23,
                  maxWidth: 330,
                }}
              >
                Support {churchName} through regular giving, one-off gifts and
                specific church-led campaigns.
              </Text>
            </View>

            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                marginBottom: 18,
              }}
            >
              <Ionicons name="heart-outline" size={25} color={HEAVENLY_GOLD} />

              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: 20,
                  fontWeight: "900",
                  marginTop: 12,
                }}
              >
                Christian stewardship, not pressure.
              </Text>

              <Text
                style={{
                  color: theme.colors.muted,
                  fontSize: 13.5,
                  fontWeight: "700",
                  lineHeight: 20,
                  marginTop: 8,
                }}
              >
                Giving in Triunely should support the church faithfully while staying
                transparent, peaceful and free from leaderboards, rankings or spiritual
                scoring.
              </Text>
            </View>

            <Text
              style={{
                color: theme.colors.text,
                fontSize: 22,
                fontWeight: "900",
                marginBottom: 12,
              }}
            >
              Regular giving
            </Text>

            <View
              style={{
                backgroundColor: SOFT_OLIVE_BG,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                borderRadius: 20,
                padding: 14,
                marginBottom: 14,
              }}
            >
              <Text
                style={{
                  color: DEEP_OLIVE,
                  fontSize: 16,
                  fontWeight: "900",
                }}
              >
                Tithe, offering and ongoing support
              </Text>

              <Text
                style={{
                  color: theme.colors.muted,
                  fontSize: 13,
                  fontWeight: "700",
                  lineHeight: 19,
                  marginTop: 6,
                  marginBottom: 13,
                }}
              >
                Give regularly or as a one-off to support worship, pastoral care,
                ministry, outreach and the everyday life of your church.
              </Text>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <GivingFrequencyButton
                  icon="calendar-outline"
                  label="Weekly"
                  subtitle="Regular weekly support"
                  onPress={() =>
                    openDonationFlow({
                      title: "Regular Giving",
                      frequency: "Weekly",
                    })
                  }
                />

                <GivingFrequencyButton
                  icon="repeat-outline"
                  label="Monthly"
                  subtitle="Ongoing monthly giving"
                  onPress={() =>
                    openDonationFlow({
                      title: "Regular Giving",
                      frequency: "Monthly",
                    })
                  }
                />

                <GivingFrequencyButton
                  icon="gift-outline"
                  label="One-off"
                  subtitle="Single gift today"
                  onPress={() =>
                    openDonationFlow({
                      title: "Regular Giving",
                      frequency: "One-off",
                    })
                  }
                />
              </View>
            </View>

            <Text
              style={{
                color: theme.colors.text,
                fontSize: 22,
                fontWeight: "900",
                marginTop: 6,
                marginBottom: 4,
              }}
            >
              Church campaigns
            </Text>

            <Text
              style={{
                color: theme.colors.muted,
                fontSize: 13,
                fontWeight: "700",
                lineHeight: 18,
                marginBottom: 12,
              }}
            >
              These will be editable by church admins for specific needs, appeals and
              projects.
            </Text>

            {mockCampaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onPress={() =>
                  openDonationFlow({
                    title: campaign.title,
                    campaignId: campaign.id,
                  })
                }
              />
            ))}

            <Text
              style={{
                color: theme.colors.text,
                fontSize: 22,
                fontWeight: "900",
                marginTop: 12,
                marginBottom: 4,
              }}
            >
              Impact updates
            </Text>

            <Text
              style={{
                color: theme.colors.muted,
                fontSize: 13,
                fontWeight: "700",
                lineHeight: 18,
                marginBottom: 12,
              }}
            >
              Churches will be able to share honest updates showing how giving is
              helping people, ministry and mission.
            </Text>

            {mockImpactUpdates.map((update) => (
              <ImpactUpdateCard key={update.id} update={update} />
            ))}

            <Text
              style={{
                color: theme.colors.text,
                fontSize: 22,
                fontWeight: "900",
                marginTop: 12,
                marginBottom: 4,
              }}
            >
              Contribution badges
            </Text>

            <Text
              style={{
                color: theme.colors.muted,
                fontSize: 13,
                fontWeight: "700",
                lineHeight: 18,
                marginBottom: 12,
              }}
            >
              Badges recognise faithful participation across prayer, service,
              volunteering, mission and outreach — never donor rankings or spiritual
              scores.
            </Text>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
              }}
            >
              {mockContributionBadges.map((badge) => (
                <ContributionBadgeCard key={badge.id} badge={badge} />
              ))}
            </View>

            <View
              style={{
                marginTop: 6,
                padding: 14,
                borderRadius: 18,
                backgroundColor: SOFT_OLIVE_BG,
                borderWidth: 1,
                borderColor: CARD_BORDER,
              }}
            >
              <Text
                style={{
                  color: DEEP_OLIVE,
                  fontWeight: "900",
                  fontSize: 14,
                }}
              >
                Coming next
              </Text>

              <Text
                style={{
                  color: theme.colors.muted,
                  fontWeight: "700",
                  marginTop: 6,
                  lineHeight: 19,
                }}
              >
                Next we’ll add the church admin giving dashboard so church leaders
                can manage campaigns and impact updates.
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

          <DonationFlowModal
            visible={donationVisible}
            givingTarget={givingTarget}
            selectedAmount={selectedAmount}
            setSelectedAmount={setSelectedAmount}
            customAmount={customAmount}
            setCustomAmount={setCustomAmount}
            amountMode={amountMode}
            setAmountMode={setAmountMode}
            onClose={closeDonationFlow}
            onMockConfirm={handleMockConfirm}
          />
        </>
      )}
    </Screen>
  );
}