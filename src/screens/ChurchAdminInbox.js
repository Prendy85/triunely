// src/screens/ChurchAdminInbox.js
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from "react-native";

import { fetchChurchInboxThreads } from "../lib/churchInbox";
import { theme } from "../theme/theme";

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString();
}

export default function ChurchAdminInbox() {
  const navigation = useNavigation();
  const route = useRoute();

  const churchId = route?.params?.churchId;

  const [activeTab, setActiveTab] = useState("member"); // 'member' | 'non_member'
  const [loading, setLoading] = useState(false);
  const [threads, setThreads] = useState([]);
  const [errorText, setErrorText] = useState("");

  const tabs = useMemo(
    () => [
      { key: "member", label: "Member messages" },
      { key: "non_member", label: "Non-member messages" },
    ],
    []
  );

  async function loadThreads() {
    if (!churchId) {
      setErrorText("Missing churchId (navigation param).");
      return;
    }

    try {
      setErrorText("");
      setLoading(true);

      const data = await fetchChurchInboxThreads({
        churchId,
        inboxType: activeTab,
      });

      setThreads(data);
    } catch (e) {
      setErrorText(e.message || "Failed to load inbox");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [churchId, activeTab]);

  const renderTab = (t) => {
    const isActive = t.key === activeTab;

    return (
      <Pressable
        key={t.key}
        onPress={() => setActiveTab(t.key)}
        style={{
          flex: 1,
          paddingVertical: 12,
          borderBottomWidth: 3,
          borderBottomColor: isActive ? theme.colors.gold : theme.colors.divider,
          backgroundColor: theme.colors.bg,
        }}
      >
        <Text
          style={{
            textAlign: "center",
            fontWeight: "900",
            color: isActive ? theme.colors.gold : theme.colors.muted,
          }}
        >
          {t.label}
        </Text>
      </Pressable>
    );
  };

  const renderAvatar = (item) => {
    const uri =
      item.user_avatar_url ||
      item.avatar_url ||
      item.profile_photo_url ||
      item.photo_url ||
      "";

    if (uri) {
      return (
        <Image
          source={{ uri }}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: theme.colors.card,
          }}
        />
      );
    }

    return (
      <Ionicons
        name="person-circle-outline"
        size={42}
        color={theme.colors.muted}
      />
    );
  };

  const renderItem = ({ item }) => {
    const title = item.user_display_name || "User";
    const snippet = item.last_message_body || "(no messages)";
    const time = formatTime(item.last_message_at);

    return (
      <Pressable
        onPress={() =>
          navigation.navigate("MainTabs", {
            screen: "Church",
            params: {
              screen: "ChurchAdminThread",
              params: {
                churchId,
                threadId: item.thread_id,
                inboxType: item.inbox_type,
                directUserId: item.direct_user_id,
                userDisplayName: title,
              },
            },
          })
        }
        style={{
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.divider,
          backgroundColor: theme.colors.bg,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {renderAvatar(item)}

          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
              {title}
            </Text>

            <Text
              style={{ color: theme.colors.muted, marginTop: 3 }}
              numberOfLines={1}
            >
              {snippet}
            </Text>
          </View>

          <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
            {time}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View
        style={{
          paddingHorizontal: 14,
          paddingTop: 14,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.divider,
          backgroundColor: theme.colors.bg,
        }}
      >
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 20,
            fontWeight: "900",
          }}
        >
          Inbox
        </Text>

        <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
          Private messages to this church (shared inbox for admins).
        </Text>
      </View>

      <View style={{ flexDirection: "row" }}>{tabs.map(renderTab)}</View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={theme.colors.gold} />
          <Text style={{ color: theme.colors.muted, marginTop: 8 }}>
            Loading messages…
          </Text>
        </View>
      ) : errorText ? (
        <View style={{ padding: 14 }}>
          <Text style={{ color: "tomato", fontWeight: "900" }}>
            {errorText}
          </Text>

          <Pressable
            onPress={loadThreads}
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: theme.colors.divider,
              backgroundColor: theme.colors.bg,
            }}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontWeight: "900",
                textAlign: "center",
              }}
            >
              Retry
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(x) => x.thread_id}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={{ padding: 14 }}>
              <Text style={{ color: theme.colors.muted }}>
                No messages in this tab yet.
              </Text>
            </View>
          }
          refreshing={loading}
          onRefresh={loadThreads}
        />
      )}
    </SafeAreaView>
  );
}
