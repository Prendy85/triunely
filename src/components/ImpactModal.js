// src/components/ImpactModal.js
import { Modal, Pressable, Text, View } from "react-native";

export default function ImpactModal({
  visible,
  onClose,
  subscribers,
  pricePerMonth,
  charityPerSubscriber,
  goalSubscribers,
}) {
  const subs = subscribers ?? 0;
  const monthlyCharity = subs * charityPerSubscriber;
  const yearlyCharity = monthlyCharity * 12;

  const goalMonthlyCharity = goalSubscribers * charityPerSubscriber;
  const goalYearlyCharity = goalMonthlyCharity * 12;

  const fmt = (n) => n.toLocaleString("en-GB", { maximumFractionDigits: 2 });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.7)",
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            width: "100%",
            backgroundColor: "#0D1B2A",
            borderRadius: 18,
            padding: 20,
            borderWidth: 1,
            borderColor: "#11233B",
          }}
        >
          <Text
            style={{
              color: "#F2B705",
              fontSize: 20,
              fontWeight: "800",
              marginBottom: 8,
            }}
          >
            You’re part of something bigger
          </Text>

          <Text style={{ color: "#CFE0FF", marginBottom: 10 }}>
            Right now we have{" "}
            <Text style={{ fontWeight: "700" }}>{fmt(subs)}</Text> monthly
            Triunely subscribers.
          </Text>

          <Text style={{ color: "#CFE0FF", marginBottom: 10 }}>
            Premium is £{pricePerMonth.toFixed(2)} / month. From every
            subscription,{" "}
            <Text style={{ fontWeight: "700" }}>
              £{charityPerSubscriber.toFixed(2)}
            </Text>{" "}
            goes straight to Christian charities.
          </Text>

          <Text style={{ color: "#9CD8C3", marginBottom: 12 }}>
            That means we’re currently giving about{" "}
            <Text style={{ fontWeight: "700" }}>
              £{fmt(monthlyCharity)} per month
            </Text>{" "}
            (around £{fmt(yearlyCharity)} per year) to charity.
          </Text>

          <Text style={{ color: "#CFE0FF", fontWeight: "700", marginBottom: 6 }}>
            Our first goal
          </Text>
          <Text style={{ color: "#CFE0FF", marginBottom: 10 }}>
            We’re believing for{" "}
            <Text style={{ fontWeight: "700" }}>
              {fmt(goalSubscribers)} Christian subscribers
            </Text>
            . That would mean around{" "}
            <Text style={{ fontWeight: "700" }}>
              £{fmt(goalMonthlyCharity)} per month
            </Text>{" "}
            and{" "}
            <Text style={{ fontWeight: "700" }}>
              £{fmt(goalYearlyCharity)} per year
            </Text>{" "}
            going to kingdom charities.
          </Text>

          <Text style={{ color: "#9bb3c9", marginBottom: 16 }}>
            Every subscription helps us keep Triunely running, reach more
            people with the gospel, and increase what we can give away to
            charity each month.
          </Text>

          <Pressable
            onPress={onClose}
            style={{
              backgroundColor: "#F2B705",
              paddingVertical: 10,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                textAlign: "center",
                fontWeight: "800",
                color: "#0D1B2A",
              }}
            >
              Got it
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
