// src/screens/MinistryOperationsScreen.js
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";

import Screen from "../components/Screen";
import { theme } from "../theme/theme";

const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const CREAM = theme.premium?.colors?.cream || "#FFFCF5";
const WHITE = theme.premium?.colors?.surface || "#FFFFFF";
const OLIVE = theme.premium?.colors?.olive || "#4F633B";
const MUTED = theme.premium?.colors?.muted || theme.colors.muted;
const TEXT = theme.premium?.colors?.text || theme.colors.text;
const CARD_BORDER =
  theme.premium?.colors?.cardBorder || "rgba(15, 23, 42, 0.08)";

function SectionLabel({ children }) {
  return (
    <Text
      style={{
        color: EVENT_BROWN,
        fontSize: 11.5,
        fontWeight: "900",
        textTransform: "uppercase",
        letterSpacing: 0.55,
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}

function PremiumModuleCard({
  icon,
  title,
  subtitle,
  active = false,
  onPress,
  accent = EVENT_AMBER,
}) {
  return (
    <Pressable
      onPress={active ? onPress : undefined}
      disabled={!active}
      style={({ pressed }) => ({
        backgroundColor: WHITE,
        borderRadius: 24,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: active ? "rgba(180, 83, 9, 0.22)" : CARD_BORDER,
        shadowColor: active ? EVENT_AMBER : "rgba(15, 23, 42, 0.08)",
        shadowOpacity: pressed ? 0.06 : active ? 0.12 : 0.07,
        shadowRadius: pressed ? 7 : active ? 11 : 8,
        shadowOffset: { width: 0, height: pressed ? 2 : 4 },
        elevation: pressed ? 1 : active ? 3 : 2,
        opacity: active ? 1 : 0.86,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: active
              ? "rgba(180, 83, 9, 0.11)"
              : "rgba(79, 99, 59, 0.08)",
            borderWidth: 1,
            borderColor: active
              ? "rgba(180, 83, 9, 0.20)"
              : "rgba(79, 99, 59, 0.13)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={22} color={active ? accent : OLIVE} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 7,
            }}
          >
            <Text
              style={{
                color: TEXT,
                fontSize: 16,
                fontWeight: "900",
                letterSpacing: -0.15,
              }}
            >
              {title}
            </Text>

            {active ? (
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: "rgba(180, 83, 9, 0.10)",
                  borderWidth: 1,
                  borderColor: "rgba(180, 83, 9, 0.18)",
                }}
              >
                <Text
                  style={{
                    color: EVENT_AMBER,
                    fontSize: 10.5,
                    fontWeight: "900",
                  }}
                >
                  Active
                </Text>
              </View>
            ) : (
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: "rgba(79, 99, 59, 0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(79, 99, 59, 0.12)",
                }}
              >
                <Text
                  style={{
                    color: OLIVE,
                    fontSize: 10.5,
                    fontWeight: "900",
                  }}
                >
                  Foundation
                </Text>
              </View>
            )}
          </View>

          <Text
            style={{
              color: MUTED,
              fontSize: 12.5,
              fontWeight: "700",
              lineHeight: 18,
              marginTop: 6,
            }}
          >
            {subtitle}
          </Text>
        </View>

        {active ? (
          <Ionicons name="chevron-forward" size={18} color={EVENT_AMBER} />
        ) : null}
      </View>
    </Pressable>
  );
}

function StatPill({ label, value, icon }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: "46%",
        padding: 13,
        borderRadius: 20,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        shadowColor: "rgba(15, 23, 42, 0.08)",
        shadowOpacity: 0.07,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: "rgba(180, 83, 9, 0.10)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
          borderWidth: 1,
          borderColor: "rgba(180, 83, 9, 0.16)",
        }}
      >
        <Ionicons name={icon} size={17} color={EVENT_AMBER} />
      </View>

      <Text
        style={{
          color: TEXT,
          fontSize: 20,
          fontWeight: "900",
          letterSpacing: -0.3,
        }}
      >
        {value}
      </Text>

      <Text
        style={{
          color: MUTED,
          fontSize: 11.5,
          fontWeight: "800",
          lineHeight: 15,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function MinistryOperationsScreen({ route, navigation }) {
  const { churchId, churchName } = route?.params || {};
  const name = churchName || "Church";

  return (
    <Screen backgroundColor={CREAM} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: bottomPad + 24,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 18,
            }}
          >
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={12}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: pressed ? "rgba(255,255,255,0.76)" : WHITE,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 13,
                shadowColor: "rgba(15, 23, 42, 0.08)",
                shadowOpacity: pressed ? 0.04 : 0.1,
                shadowRadius: pressed ? 5 : 8,
                shadowOffset: { width: 0, height: pressed ? 2 : 3 },
                elevation: pressed ? 1 : 2,
                transform: [{ scale: pressed ? 0.975 : 1 }],
              })}
            >
              <Ionicons name="chevron-back" size={25} color={OLIVE} />
            </Pressable>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  ...(theme.premium?.text?.screenTitle || theme.text.h1),
                  fontSize: 30,
                  lineHeight: 34,
                  letterSpacing: -0.5,
                }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                Ministry Operations
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 13,
                  fontWeight: "700",
                  lineHeight: 18,
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {name}
              </Text>
            </View>
          </View>

          <View
            style={{
              borderRadius: 30,
              padding: 18,
              backgroundColor: WHITE,
              borderWidth: 1,
              borderColor: "rgba(180, 83, 9, 0.16)",
              shadowColor: EVENT_AMBER,
              shadowOpacity: 0.12,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 7 },
              elevation: 4,
              marginBottom: 16,
              overflow: "hidden",
            }}
          >
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: -42,
                right: -36,
                width: 132,
                height: 132,
                borderRadius: 66,
                backgroundColor: "rgba(180, 83, 9, 0.10)",
              }}
            />

            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                bottom: -58,
                left: -40,
                width: 150,
                height: 150,
                borderRadius: 75,
                backgroundColor: "rgba(79, 99, 59, 0.08)",
              }}
            />

            <View
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: "rgba(180, 83, 9, 0.11)",
                borderWidth: 1,
                borderColor: "rgba(180, 83, 9, 0.20)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Ionicons name="sparkles-outline" size={25} color={EVENT_AMBER} />
            </View>

            <Text
              style={{
                color: TEXT,
                fontSize: 26,
                fontWeight: "900",
                letterSpacing: -0.55,
                lineHeight: 31,
              }}
            >
              A connected leadership space for church life.
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 14,
                fontWeight: "700",
                lineHeight: 21,
                marginTop: 9,
              }}
            >
              Manage events, registrations, courses, groups, serving, giving,
              communication and follow-up from one calm ministry workspace.
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 18,
            }}
          >
            <StatPill icon="calendar-outline" value="1" label="Active module" />
            <StatPill icon="layers-outline" value="10" label="Foundation areas" />
          </View>

          <SectionLabel>Live ministry tools</SectionLabel>

          <PremiumModuleCard
            icon="calendar-clear-outline"
            title="Events & Registrations"
            subtitle="Manage church events, course sign-ups, registration forms, custom answers and follow-up."
            active
            onPress={() =>
              navigation.navigate("ChurchEventRegistrations", {
                churchId,
                churchName: name,
              })
            }
          />

          <SectionLabel>Ministry foundation areas</SectionLabel>

          <PremiumModuleCard
            icon="school-outline"
            title="Courses & Programmes"
            subtitle="Structure Alpha, discipleship courses, training journeys and multi-week ministry pathways."
          />

          <PremiumModuleCard
            icon="person-circle-outline"
            title="People & Members"
            subtitle="Prepare member records, visitor follow-up, contact history and pastoral care links."
            accent={OLIVE}
          />

          <PremiumModuleCard
            icon="people-outline"
            title="Groups"
            subtitle="Connect Bible studies, tables, discipleship groups and church communities into ministry operations."
            accent={OLIVE}
          />

          <PremiumModuleCard
            icon="hand-left-outline"
            title="Serve & Volunteers"
            subtitle="Coordinate serving opportunities, teams, volunteer interest and future rota workflows."
          />

          <PremiumModuleCard
            icon="heart-outline"
            title="Giving & Donations"
            subtitle="Prepare donation campaigns, giving links, impact updates and future payment integrations."
          />

          <PremiumModuleCard
            icon="chatbubbles-outline"
            title="Communications"
            subtitle="Create a future home for member updates, event reminders and targeted church messages."
            accent={OLIVE}
          />

          <PremiumModuleCard
            icon="newspaper-outline"
            title="Media & Noticeboard"
            subtitle="Connect announcements, video updates, weekly messages and church noticeboard content."
            accent={OLIVE}
          />

          <PremiumModuleCard
            icon="shield-checkmark-outline"
            title="Support & Care"
            subtitle="Prepare pastoral follow-up, accessibility needs, prayer support and care pathways."
          />

          <PremiumModuleCard
            icon="analytics-outline"
            title="Insights"
            subtitle="Understand registrations, attendance, engagement and ministry health over time."
          />

          <PremiumModuleCard
            icon="git-network-outline"
            title="Integrations"
            subtitle="Prepare future links with giving providers, spreadsheets, payment systems and church tools."
          />

          <View
            style={{
              marginTop: 4,
              padding: 14,
              borderRadius: 22,
              backgroundColor: "rgba(79, 99, 59, 0.08)",
              borderWidth: 1,
              borderColor: "rgba(79, 99, 59, 0.14)",
            }}
          >
            <Text
              style={{
                color: OLIVE,
                fontWeight: "900",
                fontSize: 14,
              }}
            >
              Built carefully, one ministry tool at a time.
            </Text>

            <Text
              style={{
                color: MUTED,
                fontWeight: "700",
                lineHeight: 19,
                marginTop: 6,
              }}
            >
              Events & Registrations is the first active area. Each future area
              will connect into this same leadership workspace without breaking
              existing church flows.
            </Text>
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}