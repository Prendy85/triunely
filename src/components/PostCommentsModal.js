// src/components/PostCommentsModal.js
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function PostCommentsModal({
  visible,
  onClose,
  post,
  currentUserId,
  onCommentAdded,
}) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  useEffect(() => {
    if (visible && post) {
      loadComments(post.id);
      setText("");
      setAnonymous(false);
    } else if (!visible) {
      setComments([]);
      setLoading(false);
      setSending(false);
      setText("");
      setAnonymous(false);
    }
  }, [visible, post?.id]);

  async function loadComments(postId) {
    if (!postId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("post_comments")
        .select("id, user_id, content, is_anonymous, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (e) {
      console.log("Error loading comments", e);
    } finally {
      setLoading(false);
    }
  }

  async function submitComment() {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!currentUserId) {
      return;
    }
    if (!post) return;

    try {
      setSending(true);
      const { data, error } = await supabase
        .from("post_comments")
        .insert({
          post_id: post.id,
          user_id: currentUserId,
          content: trimmed,
          is_anonymous: anonymous,
        })
        .select("id, user_id, content, is_anonymous, created_at")
        .single();

      if (error) throw error;

      setComments((prev) => [...prev, data]);
      setText("");
      setAnonymous(false);

      if (onCommentAdded) {
        onCommentAdded(post.id);
      }
    } catch (e) {
      console.log("Error creating comment", e);
    } finally {
      setSending(false);
    }
  }

  const renderWho = (c) => {
    if (c.is_anonymous) return "Anonymous";
    if (currentUserId && c.user_id === currentUserId) return "You";
    return "Someone on Triunely";
  };

  if (!visible || !post) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.7)",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
        >
          <View
            style={{
              width: "100%",
              maxHeight: "90%",
              backgroundColor: "#0D1B2A",
              borderRadius: 18,
              padding: 16,
              borderWidth: 1,
              borderColor: "#11233B",
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  color: "#F2B705",
                  fontSize: 18,
                  fontWeight: "800",
                }}
              >
                Comments
              </Text>
              <Pressable
                onPress={onClose}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: "#9bb3c9", fontWeight: "600" }}>Close</Text>
              </Pressable>
            </View>

            {/* Post preview */}
            <View
              style={{
                backgroundColor: "#11233B",
                borderRadius: 10,
                padding: 10,
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  color: "#CFE0FF",
                  fontWeight: "700",
                  marginBottom: 4,
                }}
              >
                Post
              </Text>
              <Text style={{ color: "#fff" }} numberOfLines={3}>
                {post.content}
              </Text>
            </View>

            {/* Comments list */}
            <View
              style={{
                flex: 1,
                minHeight: 120,
                marginBottom: 10,
              }}
            >
              {loading ? (
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <ActivityIndicator size="small" color="#F2B705" />
                  <Text
                    style={{ color: "#9bb3c9", marginTop: 6, fontSize: 13 }}
                  >
                    Loading comments…
                  </Text>
                </View>
              ) : (
                <ScrollView>
                  {comments.length === 0 ? (
                    <Text
                      style={{
                        color: "#9bb3c9",
                        textAlign: "center",
                        marginTop: 10,
                      }}
                    >
                      No comments yet. Be the first to respond.
                    </Text>
                  ) : (
                    comments.map((c) => (
                      <View
                        key={c.id}
                        style={{
                          marginBottom: 10,
                          padding: 8,
                          borderRadius: 8,
                          backgroundColor: "#111F35",
                        }}
                      >
                        <Text
                          style={{
                            color: "#CFE0FF",
                            fontWeight: "700",
                            marginBottom: 2,
                          }}
                        >
                          {renderWho(c)}
                        </Text>
                        <Text style={{ color: "#fff" }}>{c.content}</Text>
                        <Text
                          style={{
                            color: "#9bb3c9",
                            fontSize: 10,
                            marginTop: 4,
                          }}
                        >
                          {new Date(c.created_at).toLocaleString()}
                        </Text>
                      </View>
                    ))
                  )}
                </ScrollView>
              )}
            </View>

            {/* New comment input */}
            <View>
              <TextInput
                placeholder="Write a comment…"
                placeholderTextColor="#9bb3c9"
                value={text}
                onChangeText={setText}
                multiline
                style={{
                  backgroundColor: "#11233B",
                  color: "#fff",
                  padding: 10,
                  borderRadius: 10,
                  height: 80,
                  textAlignVertical: "top",
                  marginBottom: 8,
                }}
              />

              <Pressable
                onPress={() => setAnonymous((prev) => !prev)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    borderWidth: 2,
                    borderColor: "#F2B705",
                    marginRight: 8,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: anonymous ? "#F2B705" : "transparent",
                  }}
                >
                  {anonymous ? (
                    <Text
                      style={{
                        color: "#0D1B2A",
                        fontSize: 12,
                        fontWeight: "800",
                      }}
                    >
                      ✓
                    </Text>
                  ) : null}
                </View>
                <Text style={{ color: "#CFE0FF", fontSize: 13 }}>
                  Comment as anonymous
                </Text>
              </Pressable>

              <Pressable
                disabled={sending || !text.trim()}
                onPress={submitComment}
                style={{
                  backgroundColor:
                    sending || !text.trim() ? "#556b8b" : "#F2B705",
                  paddingVertical: 10,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    color: "#0D1B2A",
                    fontWeight: "800",
                    textAlign: "center",
                  }}
                >
                  {sending ? "Posting…" : "Post comment"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
