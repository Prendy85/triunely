// src/components/NewPrayerModal.js
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

export default function NewPrayerModal({
  visible,
  onClose,
  onSubmit,
  loading,
  groups = [], // array of { id, name }
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  // audience: 'global' | 'group' | 'private'
  const [audience, setAudience] = useState("global");
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  // If user picks "Group" and there is no selected group yet, default to first
  useEffect(() => {
    if (audience === "group" && groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [audience, groups, selectedGroupId]);

  const resetState = () => {
    setTitle("");
    setBody("");
    setIsAnonymous(false);
    setAudience("global");
    setSelectedGroupId(null);
  };

  const handleClose = () => {
    if (loading) return;
    resetState();
    onClose && onClose();
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    let visibility = "global";
    let groupId = null;

    if (audience === "group" && groups.length > 0 && selectedGroupId) {
      visibility = "group";
      groupId = selectedGroupId;
    } else if (audience === "private") {
      visibility = "private";
      groupId = null;
    }

    onSubmit(
      title.trim(),
      body.trim() || null,
      isAnonymous,
      visibility,
      groupId
    );
  };

  const AudienceChip = ({ value, label, disabled }) => {
    const active = audience === value;
    return (
      <Pressable
        onPress={() => !disabled && setAudience(value)}
        style={{
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: active ? "#F2B705" : "#233952",
          backgroundColor: active ? "#233952" : "transparent",
          marginRight: 8,
          marginBottom: 8,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Text
          style={{
            color: active ? "#F2B705" : "#CFE0FF",
            fontSize: 12,
            fontWeight: active ? "600" : "400",
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
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
            New prayer request
          </Text>
          <Text style={{ color: "#9bb3c9", marginBottom: 12, fontSize: 13 }}>
            Share what you’d like others to pray for.
          </Text>

          <ScrollView
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* Title */}
            <Text
              style={{
                color: "#CFE0FF",
                fontSize: 13,
                marginBottom: 4,
                marginTop: 4,
              }}
            >
              Title
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Job interview on Tuesday"
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

            {/* Body */}
            <Text
              style={{
                color: "#CFE0FF",
                fontSize: 13,
                marginBottom: 4,
                marginTop: 12,
              }}
            >
              Details (optional)
            </Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Share any extra details you’d like others to know."
              placeholderTextColor="#567094"
              multiline
              style={{
                backgroundColor: "#11233B",
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: "#fff",
                fontSize: 14,
                minHeight: 80,
                textAlignVertical: "top",
              }}
            />

            {/* Audience */}
            <Text
              style={{
                color: "#CFE0FF",
                fontSize: 13,
                marginBottom: 4,
                marginTop: 12,
              }}
            >
              Who can see this?
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
              }}
            >
              <AudienceChip
                value="global"
                label="Triunely Global"
                disabled={false}
              />
              <AudienceChip
                value="group"
                label={
                  groups.length > 0 ? "One of my groups" : "Groups (none yet)"
                }
                disabled={groups.length === 0}
              />
              <AudienceChip value="private" label="Private (just me)" />
            </View>

            {/* Group chooser (when audience = group) */}
            {audience === "group" && groups.length > 0 && (
              <View
                style={{
                  marginTop: 8,
                  backgroundColor: "#11233B",
                  borderRadius: 10,
                  padding: 8,
                }}
              >
                <Text
                  style={{
                    color: "#CFE0FF",
                    fontSize: 13,
                    marginBottom: 6,
                  }}
                >
                  Choose group
                </Text>
                {groups.map((g) => {
                  const selected = selectedGroupId === g.id;
                  return (
                    <Pressable
                      key={g.id}
                      onPress={() => setSelectedGroupId(g.id)}
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
                        {g.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Anonymous toggle */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 14,
              }}
            >
              <Pressable
                onPress={() => setIsAnonymous((prev) => !prev)}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  borderWidth: 1,
                  borderColor: "#CFE0FF",
                  marginRight: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isAnonymous ? "#F2B705" : "transparent",
                }}
              >
                {isAnonymous ? (
                  <Text
                    style={{
                      color: "#0D1B2A",
                      fontSize: 14,
                      fontWeight: "800",
                    }}
                  >
                    ✓
                  </Text>
                ) : null}
              </Pressable>
              <Text style={{ color: "#CFE0FF", fontSize: 13 }}>
                Post anonymously
              </Text>
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
              onPress={handleClose}
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
              onPress={handleSubmit}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 999,
                alignItems: "center",
                backgroundColor: title.trim() ? "#1B6BF2" : "#163453",
              }}
              disabled={loading || !title.trim()}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                {loading ? "Posting…" : "Post request"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
