// src/features/partners/screens/PartnerGrowth.js
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";

import Screen from "../../../components/Screen";
import VerifiedBadge from "../../../components/VerifiedBadge";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";

const CARD_BORDER =
  "rgba(15, 23, 42, 0.08)";

const AMBER_SOFT =
  "rgba(180, 83, 9, 0.10)";

const AMBER_BORDER =
  "rgba(180, 83, 9, 0.18)";

const OLIVE_SOFT =
  "rgba(79, 99, 59, 0.10)";

const OLIVE_BORDER =
  "rgba(79, 99, 59, 0.18)";

const SHADOW =
  "rgba(15, 23, 42, 0.10)";

const displayFont =
  Platform.OS === "ios"
    ? "Georgia"
    : "serif";

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

const GROWTH_BENEFITS = [
  {
    icon: "videocam-outline",
    title: "Permanent native video posts",
    description:
      "Upload video directly to Triunely and share launches, testimonies, resources, courses, products and ministry updates.",
  },
  {
    icon: "person-circle-outline",
    title: "Enhanced Partner Profile",
    description:
      "Build a richer presence with featured content, clearer services, mission information and stronger calls to action.",
  },
  {
    icon: "people-outline",
    title: "Up to five administrators",
    description:
      "Give trusted team members access to help manage your Partner Profile, content and activity.",
  },
  {
    icon: "images-outline",
    title: "Expanded media and Gallery",
    description:
      "Receive greater image and video allowances for a more complete and engaging Partner presence.",
  },
  {
    icon: "push-outline",
    title: "Featured Partner content",
    description:
      "Highlight important posts, resources, offers, events or Campaigns at the top of your Partner Profile.",
  },
  {
    icon: "business-outline",
    title: "Church connections",
    description:
      "Build recognised relationships with churches and become easier for church leaders and Christian communities to assess.",
  },
  {
    icon: "chatbubbles-outline",
    title: "Structured enquiries",
    description:
      "Receive clearer enquiries for bookings, partnerships, quotes, support, courses and other Partner opportunities.",
  },
  {
    icon: "analytics-outline",
    title: "Partner analytics",
    description:
      "Understand profile views, video plays, website visits, content engagement and enquiry activity.",
  },
  {
    icon: "megaphone-outline",
    title: "Promotion tools",
    description:
      "Access responsible tools for promoting Partner posts, profiles, events, courses, resources and Campaigns.",
  },
  {
    icon: "heart-outline",
    title: "Campaign growth tools",
    description:
      "Build stronger fundraising and mission Campaigns with richer storytelling, video and supporter updates.",
  },
];

function BenefitRow({
  icon,
  title,
  description,
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor:
          CARD_BORDER,
      }}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor:
            OLIVE_SOFT,
          borderWidth: 1,
          borderColor:
            OLIVE_BORDER,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Ionicons
          name={icon}
          size={20}
          color={OLIVE}
        />
      </View>

      <View
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <Text
          style={{
            color: TEXT,
            fontSize: 14,
            fontWeight: "900",
            lineHeight: 19,
          }}
        >
          {title}
        </Text>

        <Text
          style={{
            color: MUTED,
            fontSize: 12.5,
            fontWeight: "700",
            lineHeight: 19,
            marginTop: 4,
          }}
        >
          {description}
        </Text>
      </View>
    </View>
  );
}

function VerificationCondition({
  number,
  title,
  description,
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        marginTop: 13,
      }}
    >
      <View
        style={{
          width: 29,
          height: 29,
          borderRadius: 15,
          backgroundColor:
            EVENT_AMBER,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
        }}
      >
        <Text
          style={{
            color: SURFACE,
            fontSize: 12,
            fontWeight: "900",
          }}
        >
          {number}
        </Text>
      </View>

      <View
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <Text
          style={{
            color: EVENT_BROWN,
            fontSize: 13.5,
            fontWeight: "900",
            lineHeight: 18,
          }}
        >
          {title}
        </Text>

        <Text
          style={{
            color: MUTED,
            fontSize: 12,
            fontWeight: "700",
            lineHeight: 18,
            marginTop: 3,
          }}
        >
          {description}
        </Text>
      </View>
    </View>
  );
}

export default function PartnerGrowth({
  route,
  navigation,
}) {
  const partnerProfileId =
    route?.params
      ?.partnerProfileId || null;

  const partnerName =
    route?.params
      ?.partnerName ||
    "your Partner Profile";

  const [
    enrolmentModalVisible,
    setEnrolmentModalVisible,
  ] = useState(false);

  return (
    <Screen
      backgroundColor={
        PREMIUM_CREAM
      }
      padded={false}
      style={{
        flex: 1,
      }}
    >
      {({ bottomPad }) => (
        <>
          <ScrollView
            style={{
              flex: 1,
            }}
            contentContainerStyle={{
              paddingBottom:
                bottomPad + 124,
            }}
            showsVerticalScrollIndicator={
              false
            }
          >
            <View
              style={{
                paddingHorizontal: 18,
                paddingTop: 12,
                paddingBottom: 18,
              }}
            >
              <Pressable
                onPress={() =>
                  navigation.goBack()
                }
                hitSlop={10}
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor:
                    SURFACE,
                  borderWidth: 1,
                  borderColor:
                    CARD_BORDER,
                  alignItems: "center",
                  justifyContent:
                    "center",
                  opacity:
                    pressed
                      ? 0.72
                      : 1,
                })}
              >
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={OLIVE}
                />
              </Pressable>

              <View
                style={{
                  marginTop: 20,
                }}
              >
                <View
                  style={{
                    alignSelf:
                      "flex-start",
                    borderRadius: 999,
                    backgroundColor:
                      AMBER_SOFT,
                    borderWidth: 1,
                    borderColor:
                      AMBER_BORDER,
                    paddingHorizontal: 11,
                    paddingVertical: 7,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Ionicons
                    name="trending-up-outline"
                    size={16}
                    color={EVENT_AMBER}
                  />

                  <Text
                    style={{
                      color:
                        EVENT_BROWN,
                      fontSize: 11,
                      fontWeight: "900",
                      marginLeft: 6,
                      letterSpacing: 0.4,
                      textTransform:
                        "uppercase",
                    }}
                  >
                    Partner Growth
                  </Text>
                </View>

                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 35,
                    lineHeight: 41,
                    marginTop: 13,
                  }}
                >
                  Build trust. Reach more
                  people. Grow your
                  Christian presence.
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 14,
                    fontWeight: "700",
                    lineHeight: 22,
                    marginTop: 10,
                  }}
                >
                  Partner Growth gives{" "}
                  {partnerName} the tools
                  to build credibility,
                  share richer content,
                  connect with churches
                  and grow across
                  Triunely.
                </Text>
              </View>
            </View>

            <View
              style={{
                ...premiumCardStyle,
                marginHorizontal: 16,
                padding: 18,
                marginBottom: 14,
                borderColor:
                  AMBER_BORDER,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
<View
  style={{
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor:
      "rgba(109, 40, 217, 0.09)",
    borderWidth: 1,
    borderColor:
      "rgba(109, 40, 217, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  }}
>
  <VerifiedBadge
    size={46}
  />
</View>

                <View
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <Text
                    style={{
                      color:
                        EVENT_AMBER,
                      fontSize: 11,
                      fontWeight: "900",
                      letterSpacing: 0.6,
                      textTransform:
                        "uppercase",
                    }}
                  >
                    Trust at the centre
                  </Text>

                  <Text
                    style={{
                      ...serifHeading,
                      fontSize: 24,
                      lineHeight: 29,
                      marginTop: 3,
                    }}
                  >
                    Build trust with a
                    Verified Partner badge
                  </Text>
                </View>
              </View>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 13.5,
                  fontWeight: "700",
                  lineHeight: 21,
                  marginTop: 15,
                }}
              >
                Partner Growth gives you
                access to Triunely’s
                Partner verification
                process.
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 13.5,
                  fontWeight: "700",
                  lineHeight: 21,
                  marginTop: 11,
                }}
              >
                Once your Partner Profile
                has been successfully
                reviewed, the Verified
                Partner badge can appear
                across your profile,
                posts and directory
                presence.
              </Text>

              <View
                style={{
                  marginTop: 16,
                  borderRadius: 19,
                  backgroundColor:
                    PREMIUM_CREAM,
                  borderWidth: 1,
                  borderColor:
                    AMBER_BORDER,
                  padding: 14,
                }}
              >
                <Text
                  style={{
                    color:
                      EVENT_BROWN,
                    fontSize: 12,
                    fontWeight: "900",
                    textTransform:
                      "uppercase",
                    letterSpacing: 0.45,
                  }}
                >
                  The badge requires both
                </Text>

                <VerificationCondition
                  number="1"
                  title="An active Partner Growth membership"
                  description="The Verified Partner badge is an exclusive Partner Growth benefit."
                />

                <VerificationCondition
                  number="2"
                  title="Successful Triunely verification"
                  description="The Partner must complete and pass Triunely’s verification review."
                />
              </View>

              <View
                style={{
                  marginTop: 13,
                  flexDirection: "row",
                  alignItems:
                    "flex-start",
                }}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={OLIVE}
                  style={{
                    marginRight: 8,
                    marginTop: 1,
                  }}
                />

                <Text
                  style={{
                    flex: 1,
                    color: OLIVE,
                    fontSize: 11.5,
                    fontWeight: "800",
                    lineHeight: 17,
                  }}
                >
                  Upgrading does not
                  automatically approve
                  verification. The badge
                  is activated only after
                  successful review.
                </Text>
              </View>
            </View>

            <View
              style={{
                ...premiumCardStyle,
                marginHorizontal: 16,
                padding: 18,
                marginBottom: 14,
              }}
            >
              <Text
                style={{
                  ...serifHeading,
                  fontSize: 25,
                  lineHeight: 30,
                }}
              >
                Everything in Partner
                Growth
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 13,
                  fontWeight: "700",
                  lineHeight: 20,
                  marginTop: 7,
                  marginBottom: 4,
                }}
              >
                Concrete tools for trust,
                content, discovery,
                collaboration and growth.
              </Text>

              {GROWTH_BENEFITS.map(
                (benefit) => (
                  <BenefitRow
                    key={
                      benefit.title
                    }
                    {...benefit}
                  />
                )
              )}
            </View>

            <View
              style={{
                ...premiumCardStyle,
                marginHorizontal: 16,
                padding: 18,
                marginBottom: 14,
                backgroundColor:
                  "#F7F5EC",
                borderColor:
                  OLIVE_BORDER,
              }}
            >
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor:
                    OLIVE,
                  alignItems: "center",
                  justifyContent:
                    "center",
                  marginBottom: 13,
                }}
              >
                <Ionicons
                  name="leaf-outline"
                  size={24}
                  color={SURFACE}
                />
              </View>

              <Text
                style={{
                  ...serifHeading,
                  fontSize: 24,
                  lineHeight: 29,
                }}
              >
                Help Triunely grow and
                serve Christ
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 13.5,
                  fontWeight: "700",
                  lineHeight: 21,
                  marginTop: 10,
                }}
              >
                Partner Growth helps fund
                the storage, media
                delivery, security and
                infrastructure required
                to keep Triunely
                sustainable.
              </Text>

              <Text
                style={{
                  color: OLIVE,
                  fontSize: 13.5,
                  fontWeight: "900",
                  lineHeight: 21,
                  marginTop: 12,
                }}
              >
                Your membership supports
                the continued development
                of tools created to
                strengthen Christ’s
                people, His Church and
                His mission.
              </Text>
            </View>

            <View
              style={{
                marginHorizontal: 16,
                borderRadius: 20,
                backgroundColor:
                  AMBER_SOFT,
                borderWidth: 1,
                borderColor:
                  AMBER_BORDER,
                padding: 15,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems:
                    "flex-start",
                }}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={21}
                  color={EVENT_AMBER}
                  style={{
                    marginRight: 9,
                    marginTop: 1,
                  }}
                />

                <Text
                  style={{
                    flex: 1,
                    color:
                      EVENT_BROWN,
                    fontSize: 12,
                    fontWeight: "800",
                    lineHeight: 18,
                  }}
                >
                  Final pricing, payment
                  and enrolment are not
                  active yet. No payment
                  can be taken from this
                  screen.
                </Text>
              </View>
            </View>
          </ScrollView>

          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom:
                bottomPad + 12,
              backgroundColor:
                "rgba(255,252,245,0.97)",
              borderTopWidth: 1,
              borderTopColor:
                CARD_BORDER,
            }}
          >
            <Pressable
              onPress={() =>
                setEnrolmentModalVisible(
                  true
                )
              }
              style={({ pressed }) => ({
                minHeight: 50,
                borderRadius: 999,
                backgroundColor:
                  EVENT_AMBER,
                flexDirection: "row",
                alignItems: "center",
                justifyContent:
                  "center",
                opacity:
                  pressed ? 0.84 : 1,
                shadowColor:
                  EVENT_AMBER,
                shadowOpacity: 0.16,
                shadowRadius: 8,
                shadowOffset: {
                  width: 0,
                  height: 4,
                },
                elevation: 3,
              })}
            >
              <Ionicons
                name="trending-up-outline"
                size={19}
                color={SURFACE}
                style={{
                  marginRight: 8,
                }}
              />

              <Text
                style={{
                  color: SURFACE,
                  fontSize: 14,
                  fontWeight: "900",
                }}
              >
                Partner Growth coming
                soon
              </Text>
            </Pressable>
          </View>

          <Modal
            visible={
              enrolmentModalVisible
            }
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() =>
              setEnrolmentModalVisible(
                false
              )
            }
          >
            <Pressable
              onPress={() =>
                setEnrolmentModalVisible(
                  false
                )
              }
              style={{
                flex: 1,
                backgroundColor:
                  "rgba(15,23,42,0.58)",
                justifyContent:
                  "center",
                paddingHorizontal: 20,
                paddingVertical: 32,
              }}
            >
              <Pressable
                onPress={() => {}}
                style={{
                  ...premiumCardStyle,
                  padding: 20,
                }}
              >
                <View
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 29,
                    backgroundColor:
                      AMBER_SOFT,
                    borderWidth: 1,
                    borderColor:
                      AMBER_BORDER,
                    alignItems: "center",
                    justifyContent:
                      "center",
                    marginBottom: 16,
                  }}
                >
                  <Ionicons
                    name="heart-outline"
                    size={27}
                    color={EVENT_AMBER}
                  />
                </View>

                <Text
                  style={{
                    ...serifHeading,
                    fontSize: 25,
                    lineHeight: 31,
                  }}
                >
                  Partner Growth is being
                  prepared
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 13.5,
                    fontWeight: "700",
                    lineHeight: 21,
                    marginTop: 10,
                  }}
                >
                  We are finalising the
                  Partner Growth
                  membership, pricing and
                  verification journey.
                </Text>

                <Text
                  style={{
                    color: TEXT,
                    fontSize: 13.5,
                    fontWeight: "800",
                    lineHeight: 21,
                    marginTop: 12,
                  }}
                >
                  No payment will be
                  taken until the complete
                  membership experience is
                  ready.
                </Text>

                <Pressable
                  onPress={() =>
                    setEnrolmentModalVisible(
                      false
                    )
                  }
                  style={({ pressed }) => ({
                    marginTop: 20,
                    minHeight: 48,
                    borderRadius: 999,
                    backgroundColor:
                      EVENT_AMBER,
                    alignItems: "center",
                    justifyContent:
                      "center",
                    opacity:
                      pressed
                        ? 0.84
                        : 1,
                  })}
                >
                  <Text
                    style={{
                      color: SURFACE,
                      fontSize: 13.5,
                      fontWeight: "900",
                    }}
                  >
                    Done
                  </Text>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>
        </>
      )}
    </Screen>
  );
}