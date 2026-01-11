// src/components/NewPrayerGroupModal.js
import { useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

const PRIVACY_OPTIONS = [
  { id: "public", label: "Public (anyone can find and see requests)" },
  { id: "request", label: "By request (ask to join)" },
  { id: "private", label: "Private (invite only)" },
];

const GROUP_TYPES = [
  { id: "church", label: "Church" },
  { id: "family", label: "Family" },
  { id: "friends", label: "Friends" },
  { id: "youth", label: "Youth" },
  { id: "ministry", label: "Ministry" },
  { id: "other", label: "Other" },
];

export default function NewPrayerGroupModal({
  visible,
  onClose,
  onSubmit,
  loading,
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [groupType, setGroupType] = useState("church");

  const handleCreate = () => {
    if (!name.trim()) {
      return;
    }
    onSubmit(name.trim(), description.trim() || null, privacy, groupType);
  };

  const resetAndClose = () => {
    if (loading) return;
    setName("");
    setDescription("");
    setPrivacy("public");
    setGroupType("church");
    onClose && onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={resetAndClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: "#0D1B2A",
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 24,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: "90%",
          }}
        >
          {/* Handle bar */}
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 999,
              backgroundColor: "#233952",
              alignSelf: "center",
              marginBottom: 10,
            }}
          />

          <Text
            style={{
              color: "#fff",
              fontSize: 18,
              fontWeight: "700",
              marginBottom: 4,
            }}
          >
            Create prayer group
          </Text>
          <Text style={{ color: "#9bb3c9", marginBottom: 12, fontSize: 13 }}>
            Create a space for your church, family, or friends to share
            prayer requests and encouragement.
          </Text>

          <ScrollView
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* Group name */}
            <Text
              style={{
                color: "#CFE0FF",
                fontSize: 13,
                marginBottom: 4,
                marginTop: 4,
              }}
            >
              Group name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Hope Church Young Adults"
              placeholderTextColor="#567094"
              style={{
                backgroundColor: "#11233B",
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: "#fff",
                fontSize: 14,
              }}
            />

            {/* Description */}
            <Text
              style={{
                color: "#CFE0FF",
                fontSize: 13,
                marginBottom: 4,
                marginTop: 12,
              }}
            >
              Description (optional)
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe who this group is for and how to use it."
              placeholderTextColor="#567094"
              multiline
              style={{
                backgroundColor: "#11233B",
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: "#fff",
                fontSize: 14,
                minHeight: 70,
                textAlignVertical: "top",
              }}
            />

            {/* Privacy */}
            <Text
              style={{
                color: "#CFE0FF",
                fontSize: 13,
                marginBottom: 4,
                marginTop: 12,
              }}
            >
              Privacy
            </Text>
            <View
              style={{
                backgroundColor: "#11233B",
                borderRadius: 10,
                padding: 8,
              }}
            >
              {PRIVACY_OPTIONS.map((option) => {
                const selected = privacy === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => setPrivacy(option.id)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 8,
                      borderRadius: 8,
                      backgroundColor: selected ? "#163453" : "transparent",
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? "#F2B705" : "#CFE0FF",
                        fontSize: 13,
                      }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Group type */}
            <Text
              style={{
                color: "#CFE0FF",
                fontSize: 13,
                marginBottom: 4,
                marginTop: 12,
              }}
            >
              Group type
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
              }}
            >
              {GROUP_TYPES.map((g) => {
                const selected = groupType === g.id;
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => setGroupType(g.id)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: selected ? "#F2B705" : "#233952",
                      backgroundColor: selected ? "#233952" : "transparent",
                      marginRight: 8,
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? "#F2B705" : "#CFE0FF",
                        fontSize: 12,
                      }}
                    >
                      {g.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Buttons */}
          <View
            style={{
              flexDirection: "row",
              marginTop: 8,
            }}
          >
            <Pressable
              onPress={resetAndClose}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 999,
                alignItems: "center",
                marginRight: 8,
                borderWidth: 1,
                borderColor: "#233952",
              }}
              disabled={loading}
            >
              <Text
                style={{
                  color: "#CFE0FF",
                  fontSize: 13,
                  fontWeight: "500",
                }}
              >
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={handleCreate}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 999,
                alignItems: "center",
                backgroundColor: name.trim() ? "#1B6BF2" : "#163453",
              }}
              disabled={loading || !name.trim()}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                {loading ? "Creating…" : "Create group"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
