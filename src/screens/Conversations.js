import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import Screen from "../components/Screen";
import { fetchMyConversations } from "../lib/messages";
import { theme } from "../theme/theme";

export default function Conversations({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  async function load() {
    try {
      setLoading(true);
      const rows = await fetchMyConversations();
      setItems(rows);
    } catch (e) {
      console.log("fetchMyConversations error", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Screen backgroundColor={theme.colors.bg} padded={true} style={{ flex: 1 }}>
      <Text style={theme.text.h1}>Messages</Text>

      {loading ? (
        <View style={{ paddingTop: 20 }}>
          <ActivityIndicator size="large" color={theme.colors.gold} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.conversation_id}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                navigation.navigate("Chat", {
                  conversationId: item.conversation_id,
                })
              }
              style={({ pressed }) => ({
                padding: 14,
                borderRadius: 16,
                backgroundColor: pressed ? theme.colors.surfaceAlt : theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.divider,
              })}
            >
              <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                Conversation
              </Text>

              <Text style={{ color: theme.colors.muted, marginTop: 6 }}>
                Unread: {item.unread_count || 0}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={{ color: theme.colors.muted, marginTop: 16 }}>
              No messages yet.
            </Text>
          }
        />
      )}
    </Screen>
  );
}
