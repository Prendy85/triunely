// src/screens/ChurchGroupInviteResponseScreen.js
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    ScrollView,
    Text,
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
const CARD_BORDER = "rgba(15, 23, 42, 0.08)";
const AMBER_SOFT = "rgba(180, 83, 9, 0.10)";
const AMBER_BORDER = "rgba(180, 83, 9, 0.18)";
const OLIVE_SOFT = "rgba(79, 99, 59, 0.10)";
const OLIVE_BORDER = "rgba(79, 99, 59, 0.18)";
const DANGER = "#B42318";
const DANGER_SOFT = "rgba(180, 35, 24, 0.08)";
const DANGER_BORDER = "rgba(180, 35, 24, 0.18)";
const SHADOW = "rgba(15, 23, 42, 0.10)";

const displayFont = Platform.OS === "ios" ? "Georgia" : "serif";

const serifHeading = {
  fontFamily: displayFont,
  color: TEXT,
  fontWeight: "900",
  letterSpacing: -0.45,
};

function tintColors(tint) {
  if (tint === "amber") {
    return {
      soft: AMBER_SOFT,
      border: AMBER_BORDER,
      main: EVENT_AMBER,
      strong: EVENT_BROWN,
    };
  }

  if (tint === "danger") {
    return {
      soft: DANGER_SOFT,
      border: DANGER_BORDER,
      main: DANGER,
      strong: DANGER,
    };
  }

  return {
    soft: OLIVE_SOFT,
    border: OLIVE_BORDER,
    main: OLIVE,
    strong: OLIVE,
  };
}

function PremiumIcon({ icon, tint = "olive", size = 48 }) {
  const colors = tintColors(tint);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.soft,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Ionicons name={icon} size={Math.round(size * 0.47)} color={colors.main} />
    </View>
  );
}

function InviteActionButton({
  title,
  subtitle,
  icon,
  tint = "amber",
  loading,
  disabled,
  onPress,
}) {
  const colors = tintColors(tint);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        backgroundColor: tint === "amber" ? EVENT_AMBER : SURFACE,
        borderWidth: 1,
        borderColor: tint === "amber" ? EVENT_AMBER : colors.border,
        borderRadius: 24,
        padding: 14,
        marginBottom: 10,
        opacity: disabled || loading ? 0.65 : pressed ? 0.86 : 1,
        shadowColor: SHADOW,
        shadowOpacity: tint === "amber" ? 0.12 : 0.04,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 5 },
        elevation: tint === "amber" ? 3 : 1,
        transform: [{ scale: pressed && !disabled && !loading ? 0.99 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor:
              tint === "amber" ? "rgba(255,255,255,0.18)" : colors.soft,
            borderWidth: 1,
            borderColor:
              tint === "amber" ? "rgba(255,255,255,0.22)" : colors.border,
          }}
        >
          {loading ? (
            <ActivityIndicator color={tint === "amber" ? "#FFFFFF" : colors.main} />
          ) : (
            <Ionicons
              name={icon}
              size={19}
              color={tint === "amber" ? "#FFFFFF" : colors.main}
            />
          )}
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={{
              color: tint === "amber" ? "#FFFFFF" : colors.strong,
              fontSize: 15,
              fontWeight: "900",
            }}
          >
            {title}
          </Text>

          {subtitle ? (
            <Text
              style={{
                color:
                  tint === "amber"
                    ? "rgba(255,255,255,0.82)"
                    : MUTED,
                fontSize: 12.3,
                fontWeight: "700",
                lineHeight: 17,
                marginTop: 3,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function ChurchGroupInviteResponseScreen({ navigation, route }) {
  const invitationId =
    route?.params?.invitationId ||
    route?.params?.inviteId ||
    route?.params?.membershipId ||
    null;

  const groupId = route?.params?.groupId || null;

  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [invite, setInvite] = useState(null);
  const [group, setGroup] = useState(null);
  const [church, setChurch] = useState(null);

  const groupName = group?.name || "this church group";
  const churchName = church?.name || "your church";

  const inviteStatus = String(invite?.status || "").toLowerCase();

  const alreadyHandled = useMemo(() => {
    return inviteStatus && inviteStatus !== "invited";
  }, [inviteStatus]);

  useEffect(() => {
    loadInvite();
  }, [invitationId, groupId]);

  async function loadInvite() {
    try {
      setLoading(true);

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError) throw userError;

      const uid = userData?.user?.id || null;
      setCurrentUserId(uid);

      if (!uid) {
        Alert.alert("Sign in needed", "Please sign in to respond to this invite.");
        navigation.goBack();
        return;
      }

      let query = supabase
        .from("church_group_members")
        .select("id, group_id, church_id, user_id, role, status, created_at, updated_at")
        .eq("user_id", uid)
        .eq("status", "invited")
        .limit(1);

      if (invitationId) {
        query = query.eq("id", invitationId);
      } else if (groupId) {
        query = query.eq("group_id", groupId);
      } else {
        Alert.alert(
          "Invite not found",
          "This notification is missing the invite details."
        );
        navigation.goBack();
        return;
      }

      const { data: inviteRows, error: inviteError } = await query;

      if (inviteError) throw inviteError;

      const foundInvite = Array.isArray(inviteRows) ? inviteRows[0] : null;

      if (!foundInvite) {
        setInvite(null);
        setGroup(null);
        setChurch(null);
        return;
      }

      setInvite(foundInvite);

      const { data: groupData, error: groupError } = await supabase
        .from("church_groups")
        .select("id, church_id, name, type, description, area, meeting_day, meeting_time, meeting_format")
        .eq("id", foundInvite.group_id)
        .maybeSingle();

      if (groupError) {
        console.log("load invite group error:", groupError);
      }

      setGroup(groupData || null);

      const resolvedChurchId = foundInvite.church_id || groupData?.church_id || null;

      if (resolvedChurchId) {
        const { data: churchData, error: churchError } = await supabase
          .from("churches")
          .select("id, name")
          .eq("id", resolvedChurchId)
          .maybeSingle();

        if (churchError) {
          console.log("load invite church error:", churchError);
        }

        setChurch(churchData || null);
      }
    } catch (e) {
      console.log("load church group invite error:", e);

      Alert.alert(
        "Could not load invite",
        e?.message || "Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleAcceptInvite() {
    if (!invite?.id || !currentUserId) return;

    try {
      setActing("accept");

      const { error } = await supabase
        .from("church_group_members")
        .update({
          status: "approved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", invite.id)
        .eq("user_id", currentUserId)
        .eq("status", "invited");

      if (error) throw error;

      Alert.alert(
        "Invite accepted",
        `You have joined ${groupName}.`,
        [
          {
            text: "Continue",
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (e) {
      console.log("accept church group invite error:", e);

      Alert.alert(
        "Could not accept invite",
        e?.message || "Please try again."
      );
    } finally {
      setActing(null);
    }
  }

  async function handleDeclineInvite() {
    if (!invite?.id || !currentUserId) return;

    Alert.alert(
      "Decline invite?",
      `This will remove your invite to ${groupName}.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            try {
              setActing("decline");

              const { error } = await supabase
                .from("church_group_members")
                .delete()
                .eq("id", invite.id)
                .eq("user_id", currentUserId)
                .eq("status", "invited");

              if (error) throw error;

              Alert.alert(
                "Invite declined",
                "The group invite has been removed.",
                [
                  {
                    text: "OK",
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (e) {
              console.log("decline church group invite error:", e);

              Alert.alert(
                "Could not decline invite",
                e?.message || "Please try again."
              );
            } finally {
              setActing(null);
            }
          },
        },
      ]
    );
  }

  return (
    <Screen backgroundColor={PREMIUM_CREAM} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <View style={{ flex: 1, backgroundColor: PREMIUM_CREAM }}>
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: CARD_BORDER,
              backgroundColor: PREMIUM_CREAM,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Pressable
                onPress={() => navigation.goBack()}
                hitSlop={10}
                style={({ pressed }) => ({
                  width: 42,
                  height: 42,
                  borderRadius: 999,
                  backgroundColor: pressed ? OLIVE_SOFT : SURFACE,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                })}
              >
                <Ionicons name="chevron-back" size={22} color={TEXT} />
              </Pressable>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: MUTED,
                    fontSize: 11,
                    fontWeight: "900",
                    letterSpacing: 1.1,
                    textTransform: "uppercase",
                  }}
                >
                  Group invite
                </Text>

                <Text
                  style={[
                    serifHeading,
                    {
                      fontSize: 23,
                      lineHeight: 28,
                      marginTop: 1,
                    },
                  ]}
                  numberOfLines={1}
                >
                  Respond to invite
                </Text>
              </View>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              padding: 16,
              paddingBottom: bottomPad + 28,
            }}
          >
            {loading ? (
              <View
                style={{
                  backgroundColor: SURFACE,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  borderRadius: 28,
                  paddingVertical: 32,
                  alignItems: "center",
                }}
              >
                <ActivityIndicator color={EVENT_AMBER} />

                <Text
                  style={{
                    color: MUTED,
                    fontWeight: "800",
                    marginTop: 10,
                  }}
                >
                  Loading invite…
                </Text>
              </View>
            ) : !invite ? (
              <View
                style={{
                  backgroundColor: SURFACE,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  borderRadius: 30,
                  padding: 18,
                  shadowColor: SHADOW,
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 5 },
                  elevation: 2,
                }}
              >
                <PremiumIcon icon="mail-open-outline" tint="olive" size={56} />

                <Text
                  style={[
                    serifHeading,
                    {
                      fontSize: 24,
                      lineHeight: 29,
                      marginTop: 14,
                    },
                  ]}
                >
                  Invite not available
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 13.5,
                    fontWeight: "700",
                    lineHeight: 20,
                    marginTop: 8,
                  }}
                >
                  This invite may already have been accepted, declined, removed,
                  or it may belong to another account.
                </Text>
              </View>
            ) : (
              <>
                <View
                  style={{
                    backgroundColor: SURFACE,
                    borderWidth: 1,
                    borderColor: AMBER_BORDER,
                    borderRadius: 32,
                    padding: 18,
                    marginBottom: 14,
                    shadowColor: SHADOW,
                    shadowOpacity: 0.09,
                    shadowRadius: 16,
                    shadowOffset: { width: 0, height: 7 },
                    elevation: 3,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                    <PremiumIcon icon="people-outline" tint="amber" size={58} />

                    <View style={{ flex: 1, marginLeft: 13 }}>
                      <Text
                        style={[
                          serifHeading,
                          {
                            fontSize: 25,
                            lineHeight: 30,
                          },
                        ]}
                      >
                        You’ve been invited
                      </Text>

                      <Text
                        style={{
                          color: MUTED,
                          fontSize: 13.5,
                          fontWeight: "700",
                          lineHeight: 20,
                          marginTop: 7,
                        }}
                      >
                        You have been invited to join{" "}
                        <Text style={{ color: TEXT, fontWeight: "900" }}>
                          {groupName}
                        </Text>{" "}
                        at {churchName}.
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      marginTop: 16,
                      padding: 13,
                      borderRadius: 22,
                      backgroundColor: AMBER_SOFT,
                      borderWidth: 1,
                      borderColor: AMBER_BORDER,
                    }}
                  >
                    <Text
                      style={{
                        color: EVENT_BROWN,
                        fontSize: 14,
                        fontWeight: "900",
                      }}
                    >
                      {groupName}
                    </Text>

                    {group?.description ? (
                      <Text
                        style={{
                          color: MUTED,
                          fontSize: 12.8,
                          fontWeight: "700",
                          lineHeight: 19,
                          marginTop: 5,
                        }}
                      >
                        {group.description}
                      </Text>
                    ) : null}

                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 7,
                        marginTop: 10,
                      }}
                    >
                      {group?.type ? (
                        <View
                          style={{
                            borderRadius: 999,
                            paddingHorizontal: 9,
                            paddingVertical: 5,
                            backgroundColor: SURFACE,
                            borderWidth: 1,
                            borderColor: AMBER_BORDER,
                          }}
                        >
                          <Text
                            style={{
                              color: EVENT_BROWN,
                              fontSize: 11,
                              fontWeight: "900",
                            }}
                          >
                            {group.type}
                          </Text>
                        </View>
                      ) : null}

                      {group?.area ? (
                        <View
                          style={{
                            borderRadius: 999,
                            paddingHorizontal: 9,
                            paddingVertical: 5,
                            backgroundColor: SURFACE,
                            borderWidth: 1,
                            borderColor: OLIVE_BORDER,
                          }}
                        >
                          <Text
                            style={{
                              color: OLIVE,
                              fontSize: 11,
                              fontWeight: "900",
                            }}
                          >
                            {group.area}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>

                {alreadyHandled ? (
                  <View
                    style={{
                      backgroundColor: OLIVE_SOFT,
                      borderWidth: 1,
                      borderColor: OLIVE_BORDER,
                      borderRadius: 24,
                      padding: 14,
                    }}
                  >
                    <Text
                      style={{
                        color: OLIVE,
                        fontSize: 15,
                        fontWeight: "900",
                      }}
                    >
                      Invite already handled
                    </Text>

                    <Text
                      style={{
                        color: MUTED,
                        fontSize: 12.8,
                        fontWeight: "700",
                        lineHeight: 19,
                        marginTop: 5,
                      }}
                    >
                      This invite is currently marked as {inviteStatus}.
                    </Text>
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor: SURFACE,
                      borderWidth: 1,
                      borderColor: CARD_BORDER,
                      borderRadius: 28,
                      padding: 14,
                    }}
                  >
                    <InviteActionButton
                      title="Accept invite"
                      subtitle="Join this group and appear as an approved member."
                      icon="checkmark-circle-outline"
                      tint="amber"
                      loading={acting === "accept"}
                      disabled={!!acting}
                      onPress={handleAcceptInvite}
                    />

                    <InviteActionButton
                      title="Decline invite"
                      subtitle="Remove this invitation from your account."
                      icon="close-circle-outline"
                      tint="danger"
                      loading={acting === "decline"}
                      disabled={!!acting}
                      onPress={handleDeclineInvite}
                    />
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      )}
    </Screen>
  );
}