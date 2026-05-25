import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
    Alert,
    Image,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";

import Screen from "../components/Screen";
import { supabase } from "../lib/supabase";
import { theme } from "../theme/theme";

const HEAVENLY_GOLD = "#D99400";
const DEEP_OLIVE = "#4F633B";
const SOFT_GOLD_BG = "rgba(217, 148, 0, 0.10)";
const SOFT_OLIVE_BG = "rgba(79, 99, 59, 0.10)";
const CARD_BORDER = "rgba(217, 148, 0, 0.18)";

const NETWORKS_BY_ID = {
  "mens-prayer": {
    id: "mens-prayer",
    title: "Men’s Prayer Network",
    subtitle:
      "Brothers strengthening faith together through prayer and encouragement.",
    members: "1.2K members",
    category: "Prayer",
    scope: "National",
    visibility: "Public",
    action: "Join",
    icon: "hand-left-outline",
    image:
      "https://images.unsplash.com/photo-1507692049790-de58290a4334?q=80&w=1200&auto=format&fit=crop",
    upcomingEvent: {
      month: "MAY",
      day: "22",
      weekday: "FRI",
      title: "Friday Morning Prayer Call",
      meta: "7:00 AM – 7:30 AM · Online prayer room",
    },
    posts: [
      {
        type: "discussion",
        title: "Weekly Prayer Thread",
        meta: "Michael R. · Admin · 2h ago",
        body:
          "Share one thing you would like brothers in Christ to pray for this week. Keep it honest, respectful, and faith-filled.",
      },
      {
        type: "discussion",
        title: "Standing Firm in Prayer",
        meta: "James T. · 1d ago",
        body:
          "What has helped you stay consistent in prayer when life gets busy or spiritually heavy?",
      },
    ],
    about:
      "A network for Christian men to pray together, encourage one another, share testimony, and strengthen disciplined faith in everyday life.",
  },

  business: {
    id: "business",
    title: "Christian Business Network",
    subtitle: "Faith-driven purpose. Kingdom impact in the marketplace.",
    members: "856 members",
    category: "Business",
    scope: "Your City",
    visibility: "Request to Join",
    action: "Request",
    icon: "briefcase-outline",
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop",
    upcomingEvent: {
      month: "MAY",
      day: "27",
      weekday: "WED",
      title: "Christian Business Breakfast",
      meta: "8:00 AM – 9:30 AM · Local café meetup",
    },
    posts: [
      {
        type: "discussion",
        title: "Faith in the Marketplace",
        meta: "Rebecca L. · Admin · 3h ago",
        body:
          "How do you honour God in business decisions when profit, pressure, and integrity all collide?",
      },
      {
        type: "discussion",
        title: "Prayer for Business Direction",
        meta: "Daniel P. · 1d ago",
        body:
          "I’m praying through a new opportunity this week. How do others here test whether a door is from God or just ambition?",
      },
    ],
    about:
      "A network for Christian founders, workers, salespeople, leaders, and business owners who want to build with integrity, wisdom, and Kingdom purpose.",
  },

  chess: {
    id: "chess",
    title: "Chess Fellowship",
    subtitle:
      "Sharpen your mind. Glorify God through strategy and fellowship.",
    members: "423 members",
    category: "Hobbies",
    scope: "Local",
    visibility: "Public",
    action: "Join",
    icon: "extension-puzzle-outline",
    image:
      "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?q=80&w=1200&auto=format&fit=crop",
    upcomingEvent: {
      month: "MAY",
      day: "24",
      weekday: "SAT",
      title: "Saturday Chess & Fellowship",
      meta: "2:00 PM – 5:00 PM · Grace Community Church",
    },
    posts: [
      {
        type: "event",
        title: "Saturday Chess & Fellowship",
        meta: "Daniel M. · Admin · 2h ago",
        body:
          "Join us this Saturday for an afternoon of chess, connection, and encouragement from God’s Word.",
      },
      {
        type: "discussion",
        title: "Opening with Purpose",
        meta: "Sarah J. · 1d ago",
        body:
          "What’s your favourite chess opening, and how does strategy remind you of patience, discipline, and walking with Christ?",
      },
    ],
    about:
      "A relaxed Christian fellowship network for people who enjoy chess, thoughtful conversation, friendly competition, and local meetups.",
  },

  "bible-study": {
    id: "bible-study",
    title: "Local Bible Study",
    subtitle: "Grow in God’s Word together in your local Christian community.",
    members: "312 members",
    category: "Bible Study",
    scope: "Local",
    visibility: "Public",
    action: "Join",
    icon: "book-outline",
    image:
      "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?q=80&w=1200&auto=format&fit=crop",
    upcomingEvent: {
      month: "MAY",
      day: "29",
      weekday: "FRI",
      title: "Gospel of John Study Night",
      meta: "7:30 PM – 9:00 PM · Local church hall",
    },
    posts: [
      {
        type: "discussion",
        title: "This Week’s Passage: John 15",
        meta: "Anna W. · Admin · 4h ago",
        body:
          "This week we’re reading John 15. What does it mean practically to abide in Christ during a normal working week?",
      },
      {
        type: "discussion",
        title: "Question for the Group",
        meta: "Luke H. · 1d ago",
        body:
          "How do you balance personal Bible reading with group study so that both stay meaningful and not just routine?",
      },
    ],
    about:
      "A local Christian Bible study network for people who want to read Scripture together, ask honest questions, and grow in practical discipleship.",
  },
};

const fallbackNetwork = NETWORKS_BY_ID["mens-prayer"];

function StatPill({ icon, label, tone = "olive" }) {
  const isGold = tone === "gold";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: isGold ? SOFT_GOLD_BG : SOFT_OLIVE_BG,
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Ionicons
        name={icon}
        size={14}
        color={isGold ? HEAVENLY_GOLD : DEEP_OLIVE}
      />

      <Text
        style={{
          color: isGold ? HEAVENLY_GOLD : DEEP_OLIVE,
          fontSize: 11,
          fontWeight: "900",
          marginLeft: 5,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function SectionTitle({ title, action }) {
  return (
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
        {title}
      </Text>

      {action ? (
        <Pressable onPress={action.onPress}>
          <Text
            style={{
              color: HEAVENLY_GOLD,
              fontSize: 13,
              fontWeight: "900",
            }}
          >
            {action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function NetworkPostCard({ type, title, body, meta }) {
  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        padding: 14,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: type === "event" ? SOFT_GOLD_BG : SOFT_OLIVE_BG,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Ionicons
            name={
              type === "event"
                ? "calendar-outline"
                : "chatbubble-ellipses-outline"
            }
            size={17}
            color={type === "event" ? HEAVENLY_GOLD : DEEP_OLIVE}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: theme.colors.text,
              fontSize: 14,
              fontWeight: "900",
            }}
          >
            {title}
          </Text>

          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 11,
              fontWeight: "700",
              marginTop: 2,
            }}
          >
            {meta}
          </Text>
        </View>

        <Ionicons
          name="ellipsis-horizontal"
          size={18}
          color={theme.colors.muted}
        />
      </View>

      <Text
        style={{
          color: theme.colors.text2,
          fontSize: 13,
          fontWeight: "700",
          lineHeight: 19,
        }}
      >
        {body}
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: 12,
          gap: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="heart-outline" size={16} color={DEEP_OLIVE} />
          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 11,
              fontWeight: "800",
              marginLeft: 4,
            }}
          >
            24
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="chatbubble-outline" size={16} color={DEEP_OLIVE} />
          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 11,
              fontWeight: "800",
              marginLeft: 4,
            }}
          >
            8
          </Text>
        </View>

        <Text
          style={{
            color: HEAVENLY_GOLD,
            fontSize: 11,
            fontWeight: "900",
            marginLeft: "auto",
          }}
        >
          View details
        </Text>
      </View>
    </View>
  );
}

export default function NetworkDetail() {
  const navigation = useNavigation();
  const route = useRoute();

  const networkId = route.params?.networkId || "mens-prayer";
  const network = NETWORKS_BY_ID[networkId] || fallbackNetwork;

const [activeTab, setActiveTab] = useState("Posts");
const [membershipStatus, setMembershipStatus] = useState("none");
const [membershipLoading, setMembershipLoading] = useState(false);
const [currentUserId, setCurrentUserId] = useState(null);

const isRequest = network.action === "Request";
const isJoined = membershipStatus === "joined";
const isPending = membershipStatus === "pending";

useEffect(() => {
  let alive = true;

  async function loadMembershipStatus() {
    try {
      setMembershipLoading(true);
      setMembershipStatus("none");

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        console.log("Network membership session error:", sessionError);
        return;
      }

      const userId = sessionData?.session?.user?.id ?? null;

      if (!alive) return;

      setCurrentUserId(userId);

      if (!userId) return;

      const { data, error } = await supabase
        .from("network_memberships")
        .select("status")
        .eq("network_id", network.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.log("Network membership load error:", error);
        return;
      }

      if (!alive) return;

      setMembershipStatus(data?.status ?? "none");
    } catch (e) {
      console.log("Unexpected network membership load error:", e);
    } finally {
      if (alive) setMembershipLoading(false);
    }
  }

  loadMembershipStatus();

  return () => {
    alive = false;
  };
}, [network.id]);

async function handleMembershipPress() {
  if (membershipLoading) return;

  if (!currentUserId) {
    Alert.alert("Not signed in", "Please sign in again before joining a network.");
    return;
  }

  if (isJoined) {
    Alert.alert("Already joined", `You are already a member of ${network.title}.`);
    return;
  }

  if (isPending) {
    Alert.alert(
      "Request pending",
      `Your request to join ${network.title} has already been sent.`
    );
    return;
  }

  const nextStatus = isRequest ? "pending" : "joined";

  try {
    setMembershipLoading(true);

    const { error } = await supabase.from("network_memberships").upsert(
      {
        network_id: network.id,
        user_id: currentUserId,
        status: nextStatus,
        role: "member",
      },
      {
        onConflict: "network_id,user_id",
      }
    );

    if (error) throw error;

    setMembershipStatus(nextStatus);

    Alert.alert(
      nextStatus === "pending" ? "Request sent" : "Joined",
      nextStatus === "pending"
        ? `Your request to join ${network.title} has been sent.`
        : `You have joined ${network.title}.`
    );
  } catch (e) {
    console.log("Network membership save error:", e);
    Alert.alert(
      "Could not update network",
      "We could not update your network membership right now. Please try again."
    );
  } finally {
    setMembershipLoading(false);
  }
}

  return (
    <Screen backgroundColor={theme.colors.bg} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: bottomPad + 22,
          }}
        >
          {/* Hero image */}
          <View style={{ height: 210, backgroundColor: theme.colors.surfaceAlt }}>
            <Image
              source={{ uri: network.image }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />

            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.18)",
              }}
            />

            {/* Top buttons */}
            <View
              style={{
                position: "absolute",
                top: 14,
                left: 16,
                right: 16,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
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
                    ? "rgba(255,255,255,0.78)"
                    : "rgba(255,255,255,0.92)",
                })}
              >
                <Ionicons name="chevron-back" size={24} color={DEEP_OLIVE} />
              </Pressable>

              <Pressable
                onPress={() =>
                  Alert.alert("Share", "Sharing networks is coming later.")
                }
                hitSlop={10}
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed
                    ? "rgba(255,255,255,0.78)"
                    : "rgba(255,255,255,0.92)",
                })}
              >
                <Ionicons
                  name="share-social-outline"
                  size={20}
                  color={DEEP_OLIVE}
                />
              </Pressable>
            </View>
          </View>

          {/* Main content */}
          <View style={{ paddingHorizontal: 16, marginTop: -34 }}>
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: 24,
                padding: 16,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                shadowColor: HEAVENLY_GOLD,
                shadowOpacity: 0.12,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 6 },
                elevation: 5,
                marginBottom: 18,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 29,
                    backgroundColor: DEEP_OLIVE,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 3,
                    borderColor: theme.colors.surface,
                    marginRight: 12,
                  }}
                >
                  <Ionicons name={network.icon} size={27} color="#fff" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: 26,
                      fontWeight: "900",
                      letterSpacing: -0.5,
                      lineHeight: 31,
                    }}
                  >
                    {network.title}
                  </Text>

                  <Text
                    style={{
                      color: theme.colors.muted,
                      fontSize: 13,
                      fontWeight: "700",
                      lineHeight: 19,
                      marginTop: 6,
                    }}
                  >
                    {network.subtitle}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  marginTop: 14,
                }}
              >
                <StatPill icon="pricetag-outline" label={network.category} />
                <StatPill icon="people-outline" label={network.members} />
                <StatPill
                  icon="globe-outline"
                  label={network.visibility || "Public"}
                  tone="gold"
                />
                <StatPill
                  icon="location-outline"
                  label={network.scope}
                  tone="gold"
                />
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <Pressable
  onPress={handleMembershipPress}
  disabled={membershipLoading}
  style={({ pressed }) => ({
                    flex: 1,
                    borderRadius: 999,
                    paddingVertical: 12,
                    alignItems: "center",
                    backgroundColor: isJoined
  ? DEEP_OLIVE
  : isPending
  ? SOFT_OLIVE_BG
  : isRequest
  ? theme.colors.surface
  : HEAVENLY_GOLD,
borderWidth: 1,
borderColor: isJoined
  ? DEEP_OLIVE
  : isPending
  ? DEEP_OLIVE
  : isRequest
  ? DEEP_OLIVE
  : HEAVENLY_GOLD,
                    opacity: membershipLoading ? 0.65 : pressed ? 0.8 : 1,
                  })}
                >
                 <Text
  style={{
    color: isJoined
      ? "#fff"
      : isPending
      ? DEEP_OLIVE
      : isRequest
      ? DEEP_OLIVE
      : "#fff",
    fontSize: 14,
    fontWeight: "900",
  }}
>
  {membershipLoading
  ? "Checking..."
  : isJoined
  ? "Joined"
  : isPending
  ? "Request Sent"
  : isRequest
  ? "Request to Join"
  : "Join Network"}
</Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    Alert.alert("Invite", "Inviting people is coming later.")
                  }
                  style={({ pressed }) => ({
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: pressed ? SOFT_OLIVE_BG : theme.colors.surface,
                    borderWidth: 1,
                    borderColor: theme.colors.divider,
                  })}
                >
                  <Ionicons
                    name="person-add-outline"
                    size={20}
                    color={DEEP_OLIVE}
                  />
                </Pressable>
              </View>
            </View>

            {/* Tabs */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: theme.colors.surface,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: theme.colors.divider,
                padding: 4,
                marginBottom: 18,
              }}
            >
              {["Posts", "Events", "About"].map((label) => {
                const active = activeTab === label;

                return (
                  <Pressable
                    key={label}
                    onPress={() => setActiveTab(label)}
                    style={({ pressed }) => ({
                      flex: 1,
                      borderRadius: 999,
                      paddingVertical: 9,
                      alignItems: "center",
                      backgroundColor: active
                        ? DEEP_OLIVE
                        : pressed
                        ? SOFT_OLIVE_BG
                        : "transparent",
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
            </View>

            {activeTab === "Posts" ? (
              <View>
                <SectionTitle title="Posts" />

                {network.posts.map((post) => (
                  <NetworkPostCard
                    key={post.title}
                    type={post.type}
                    title={post.title}
                    meta={post.meta}
                    body={post.body}
                  />
                ))}
              </View>
            ) : null}

            {activeTab === "Events" ? (
              <View style={{ marginBottom: 18 }}>
                <SectionTitle
                  title="Events"
                  action={{
                    label: "Create",
                    onPress: () =>
                      Alert.alert(
                        "Create Event",
                        "Network event creation is coming later."
                      ),
                  }}
                />

                <View
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: theme.colors.divider,
                    padding: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <View
                    style={{
                      width: 54,
                      height: 62,
                      borderRadius: 16,
                      backgroundColor: SOFT_OLIVE_BG,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: DEEP_OLIVE,
                        fontSize: 11,
                        fontWeight: "900",
                      }}
                    >
                      {network.upcomingEvent.month}
                    </Text>

                    <Text
                      style={{
                        color: DEEP_OLIVE,
                        fontSize: 22,
                        fontWeight: "900",
                      }}
                    >
                      {network.upcomingEvent.day}
                    </Text>

                    <Text
                      style={{
                        color: DEEP_OLIVE,
                        fontSize: 10,
                        fontWeight: "900",
                      }}
                    >
                      {network.upcomingEvent.weekday}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: 15,
                        fontWeight: "900",
                      }}
                    >
                      {network.upcomingEvent.title}
                    </Text>

                    <Text
                      style={{
                        color: theme.colors.muted,
                        fontSize: 12,
                        fontWeight: "700",
                        marginTop: 4,
                        lineHeight: 17,
                      }}
                    >
                      {network.upcomingEvent.meta}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() =>
                      Alert.alert("Interested", "Event interest is coming later.")
                    }
                    style={({ pressed }) => ({
                      paddingVertical: 7,
                      paddingHorizontal: 10,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: HEAVENLY_GOLD,
                      opacity: pressed ? 0.75 : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: HEAVENLY_GOLD,
                        fontSize: 11,
                        fontWeight: "900",
                      }}
                    >
                      Interested
                    </Text>
                  </Pressable>
                </View>

                <View
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: theme.colors.divider,
                    padding: 16,
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: 15,
                      fontWeight: "900",
                      marginBottom: 4,
                    }}
                  >
                    More events coming soon
                  </Text>

                  <Text
                    style={{
                      color: theme.colors.muted,
                      fontSize: 13,
                      fontWeight: "700",
                      lineHeight: 19,
                    }}
                  >
                    Future gatherings, meetups, prayer calls, online sessions, and
                    network activities will appear here.
                  </Text>
                </View>
              </View>
            ) : null}

            {activeTab === "About" ? (
              <View>
                <SectionTitle title="About this Network" />

                <View
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: theme.colors.divider,
                    padding: 16,
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: 16,
                      fontWeight: "900",
                      marginBottom: 8,
                    }}
                  >
                    Purpose
                  </Text>

                  <Text
                    style={{
                      color: theme.colors.text2,
                      fontSize: 13,
                      fontWeight: "700",
                      lineHeight: 20,
                    }}
                  >
                    {network.about}
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: theme.colors.divider,
                    padding: 16,
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: 16,
                      fontWeight: "900",
                      marginBottom: 8,
                    }}
                  >
                    Network Details
                  </Text>

                  <View style={{ gap: 10 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <Text
                        style={{ color: theme.colors.muted, fontWeight: "800" }}
                      >
                        Category
                      </Text>
                      <Text
                        style={{ color: theme.colors.text, fontWeight: "900" }}
                      >
                        {network.category}
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <Text
                        style={{ color: theme.colors.muted, fontWeight: "800" }}
                      >
                        Scope
                      </Text>
                      <Text
                        style={{ color: theme.colors.text, fontWeight: "900" }}
                      >
                        {network.scope}
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <Text
                        style={{ color: theme.colors.muted, fontWeight: "800" }}
                      >
                        Visibility
                      </Text>
                      <Text
                        style={{ color: theme.colors.text, fontWeight: "900" }}
                      >
                        {network.visibility || "Public"}
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <Text
                        style={{ color: theme.colors.muted, fontWeight: "800" }}
                      >
                        Members
                      </Text>
                      <Text
                        style={{ color: theme.colors.text, fontWeight: "900" }}
                      >
                        {network.members}
                      </Text>
                    </View>
                  </View>
                </View>

                <View
                  style={{
                    backgroundColor: SOFT_GOLD_BG,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                    padding: 16,
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: 16,
                      fontWeight: "900",
                      marginBottom: 8,
                    }}
                  >
                    Community Guidelines
                  </Text>

                  <Text
                    style={{
                      color: theme.colors.text2,
                      fontSize: 13,
                      fontWeight: "700",
                      lineHeight: 20,
                    }}
                  >
                    Keep discussion Christ-centred, respectful, truthful, and
                    encouraging. Admin tools, reporting, and moderation rules
                    will be added later.
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}