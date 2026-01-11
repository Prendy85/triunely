// src/screens/ChurchNoticeboard.js
import { Text, View } from "react-native";
import Screen from "../components/Screen";
import { theme } from "../theme/theme";

export default function ChurchNoticeboard({ route }) {
  const churchId = route?.params?.churchId;

  return (
    <Screen>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: theme.colors.text }}>
          Noticeboard
        </Text>
        <Text style={{ marginTop: 8, color: theme.colors.muted }}>
          Coming next. This will show official church announcements and events.
        </Text>

        {!!churchId && (
          <Text style={{ marginTop: 12, color: theme.colors.muted, fontSize: 12 }}>
            Church ID: {churchId}
          </Text>
        )}
      </View>
    </Screen>
  );
}
