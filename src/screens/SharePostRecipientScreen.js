// src/screens/SharePostRecipientScreen.js
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
    getOrCreateDirectConversation,
    searchUsersForDM,
} from "../lib/messages";
import { supabase } from "../lib/supabase";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const DEEP_OLIVE = "#4F633B";
const EVENT_AMBER = "#B45309";
const TEXT = "#1F2933";
const MUTED = "#6B7280";
const CARD_BORDER =
  "rgba(15, 23, 42, 0.08)";
const SOFT_OLIVE =
  "rgba(79, 99, 59, 0.10)";
const SOFT_AMBER =
  "rgba(180, 83, 9, 0.10)";

function safeInitials(name) {
  const value = String(
    name || ""
  ).trim();

  if (!value) {
    return "?";
  }

  const parts = value
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return (
      parts[0][0] +
      parts[1][0]
    ).toUpperCase();
  }

  return value[0]?.toUpperCase() || "?";
}

export default function SharePostRecipientScreen({
  navigation,
  route,
}) {
  const insets =
    useSafeAreaInsets();

  const sharedPost =
    route?.params?.sharedPost ||
    null;

  const sharedPostId =
    route?.params?.sharedPostId ||
    sharedPost?.id ||
    null;

  const [query, setQuery] =
    useState("");

  const [results, setResults] =
    useState([]);

  const [searching, setSearching] =
    useState(false);

  const [openingUserId, setOpeningUserId] =
    useState(null);

  const runSearch = useCallback(
    async (text) => {
      setQuery(text);

      const cleanQuery =
        String(text || "").trim();

      if (!cleanQuery) {
        setResults([]);
        return;
      }

      try {
        setSearching(true);

        const { data: sessionData } =
          await supabase.auth
            .getSession();

        const currentUserId =
          sessionData?.session
            ?.user?.id ||
          null;

        const rows =
          await searchUsersForDM(
            cleanQuery,
            30
          );

        setResults(
          (rows || []).filter(
            (user) =>
              user?.id &&
              user.id !==
                currentUserId
          )
        );
      } catch (error) {
        console.log(
          "SharePostRecipientScreen search error",
          error
        );

        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    []
  );

  const openRecipient =
    useCallback(
      async (user) => {
        if (
          !user?.id ||
          !sharedPostId ||
          openingUserId
        ) {
          return;
        }

        try {
          setOpeningUserId(user.id);

          const conversationId =
            await getOrCreateDirectConversation(
              user.id
            );

          navigation.replace(
            "Chat",
            {
              conversationId,
              type: "dm",
              title:
                user.display_name ||
                "Conversation",
              avatarUrl:
                user.avatar_url ||
                null,
              otherUserId:
                user.id,
              handle:
                user.username ||
                user.handle ||
                null,
              sharedPostId,
              sharedPost,
            }
          );
        } catch (error) {
          console.log(
            "SharePostRecipientScreen open recipient error",
            error
          );
        } finally {
          setOpeningUserId(null);
        }
      },
      [
        navigation,
        openingUserId,
        sharedPost,
        sharedPostId,
      ]
    );

  const previewText =
    String(
      sharedPost?.content ||
        sharedPost?.link_title ||
        ""
    ).trim();

  return (
    <SafeAreaView
      edges={[
        "top",
        "left",
        "right",
      ]}
      style={{
        flex: 1,
        backgroundColor:
          PREMIUM_CREAM,
      }}
    >
      <KeyboardAvoidingView
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
        style={{
          flex: 1,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 18,
            paddingTop: 10,
            paddingBottom: 13,
            borderBottomWidth: 1,
            borderBottomColor:
              CARD_BORDER,
          }}
        >
          <Pressable
            onPress={() =>
              navigation.goBack()
            }
            hitSlop={12}
            style={({ pressed }) => ({
              width: 42,
              height: 42,
              borderRadius: 21,
              alignItems: "center",
              justifyContent:
                "center",
              backgroundColor:
                pressed
                  ? SOFT_OLIVE
                  : SURFACE,
              borderWidth: 1,
              borderColor:
                CARD_BORDER,
            })}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={TEXT}
            />
          </Pressable>

          <View
            style={{
              flex: 1,
              marginLeft: 13,
            }}
          >
            <Text
              style={{
                color: TEXT,
                fontFamily:
                  Platform.OS ===
                  "android"
                    ? "serif"
                    : "Georgia",
                fontSize: 24,
                fontWeight: "900",
              }}
            >
              Share post
            </Text>

            <Text
              style={{
                color: MUTED,
                fontSize: 12,
                fontWeight: "700",
                marginTop: 2,
              }}
            >
              Choose someone to
              share this post with
            </Text>
          </View>
        </View>

        {!!sharedPost && (
          <View
            style={{
              marginHorizontal: 18,
              marginTop: 15,
              borderRadius: 18,
              backgroundColor:
                SURFACE,
              borderWidth: 1,
              borderColor:
                CARD_BORDER,
              padding: 13,
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
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  alignItems: "center",
                  justifyContent:
                    "center",
                  backgroundColor:
                    SOFT_AMBER,
                }}
              >
                <Ionicons
                  name="share-social-outline"
                  size={17}
                  color={EVENT_AMBER}
                />
              </View>

              <View
                style={{
                  flex: 1,
                  marginLeft: 9,
                }}
              >
                <Text
                  style={{
                    color:
                      DEEP_OLIVE,
                    fontSize: 11.5,
                    fontWeight:
                      "900",
                  }}
                >
                  Community post
                </Text>

                {!!previewText && (
                  <Text
                    numberOfLines={2}
                    style={{
                      color: TEXT,
                      fontSize: 12.5,
                      lineHeight: 17,
                      fontWeight:
                        "600",
                      marginTop: 3,
                    }}
                  >
                    {previewText}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        <View
          style={{
            marginHorizontal: 18,
            marginTop: 15,
            height: 52,
            borderRadius: 20,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 14,
            backgroundColor:
              SURFACE,
            borderWidth: 1,
            borderColor:
              CARD_BORDER,
          }}
        >
          <Ionicons
            name="search-outline"
            size={21}
            color={MUTED}
          />

          <TextInput
            value={query}
            onChangeText={runSearch}
            placeholder="Search by name or username"
            placeholderTextColor={
              MUTED
            }
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            style={{
              flex: 1,
              marginLeft: 10,
              color: TEXT,
              fontSize: 14,
              fontWeight: "700",
            }}
          />

          {!!query && (
            <Pressable
              onPress={() =>
                runSearch("")
              }
              hitSlop={10}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={MUTED}
              />
            </Pressable>
          )}
        </View>

        {searching ? (
          <View
            style={{
              paddingTop: 28,
              alignItems: "center",
            }}
          >
            <ActivityIndicator
              color={EVENT_AMBER}
            />
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) =>
              String(item.id)
            }
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: 18,
              paddingTop: 12,
              paddingBottom:
                Math.max(
                  insets.bottom,
                  18
                ) + 20,
              flexGrow: 1,
            }}
            renderItem={({ item }) => {
              const displayName =
                item.display_name ||
                "Triunely member";

              const username =
                item.username ||
                item.handle ||
                null;

              const opening =
                openingUserId ===
                item.id;

              return (
                <Pressable
                  disabled={
                    !!openingUserId
                  }
                  onPress={() =>
                    openRecipient(
                      item
                    )
                  }
                  style={({ pressed }) => ({
                    flexDirection:
                      "row",
                    alignItems:
                      "center",
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor:
                      CARD_BORDER,
                    opacity:
                      pressed ||
                      opening
                        ? 0.65
                        : 1,
                  })}
                >
                  {item.avatar_url ? (
                    <Image
                      source={{
                        uri:
                          item.avatar_url,
                      }}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        marginRight: 12,
                        backgroundColor:
                          SOFT_OLIVE,
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        marginRight: 12,
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        backgroundColor:
                          SOFT_OLIVE,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            DEEP_OLIVE,
                          fontSize: 16,
                          fontWeight:
                            "900",
                        }}
                      >
                        {safeInitials(
                          displayName
                        )}
                      </Text>
                    </View>
                  )}

                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        color: TEXT,
                        fontSize: 15,
                        fontWeight:
                          "900",
                      }}
                    >
                      {displayName}
                    </Text>

                    {!!username && (
                      <Text
                        numberOfLines={1}
                        style={{
                          color:
                            MUTED,
                          fontSize: 12,
                          fontWeight:
                            "700",
                          marginTop: 3,
                        }}
                      >
                        @
                        {String(
                          username
                        ).replace(
                          /^@/,
                          ""
                        )}
                      </Text>
                    )}
                  </View>

                  {opening ? (
                    <ActivityIndicator
                      color={
                        EVENT_AMBER
                      }
                    />
                  ) : (
                    <Ionicons
                      name="send-outline"
                      size={21}
                      color={
                        DEEP_OLIVE
                      }
                    />
                  )}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View
                style={{
                  flex: 1,
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  paddingHorizontal:
                    35,
                  paddingBottom: 90,
                }}
              >
                <View
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: 31,
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    backgroundColor:
                      SOFT_OLIVE,
                  }}
                >
                  <Ionicons
                    name={
                      query.trim()
                        ? "person-remove-outline"
                        : "people-outline"
                    }
                    size={28}
                    color={
                      DEEP_OLIVE
                    }
                  />
                </View>

                <Text
                  style={{
                    color: TEXT,
                    fontSize: 17,
                    fontWeight: "900",
                    marginTop: 14,
                    textAlign:
                      "center",
                  }}
                >
                  {query.trim()
                    ? "No people found"
                    : "Search for someone"}
                </Text>

                <Text
                  style={{
                    color: MUTED,
                    fontSize: 13,
                    lineHeight: 19,
                    fontWeight: "600",
                    marginTop: 6,
                    textAlign:
                      "center",
                  }}
                >
                  {query.trim()
                    ? "Try another name or username."
                    : "Choose who you would like to share this Community post with."}
                </Text>
              </View>
            }
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}