// src/screens/TriunelyAnnouncements.js
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";

import NewPostModal from "../components/NewPostModal";
import PostCard from "../components/PostCard";
import Screen from "../components/Screen";
import VerifiedBadge from "../components/VerifiedBadge";
import { HOME_COMMUNITY_ID, TRIUNELY_CHURCH_ID } from "../lib/constants";
import { supabase } from "../lib/supabase";
import { theme } from "../theme/theme";

const PAGE_LIMIT = 50;

export default function TriunelyAnnouncements({ navigation }) {
  const [viewerId, setViewerId] = useState(null);

  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [isTriunelyAdmin, setIsTriunelyAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [posts, setPosts] = useState([]);

  const [showNewModal, setShowNewModal] = useState(false);
  const [posting, setPosting] = useState(false);

  const triunelyAuthor = useMemo(
    () => ({
      id: TRIUNELY_CHURCH_ID,
      name: "Triunely",
      avatarUrl: null,
      isAnonymous: false,
      isOwner: false,
      isVerified: true,
    }),
    []
  );

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const { data: sessData } = await supabase.auth.getSession();
        const uid = sessData?.session?.user?.id || null;
        setViewerId(uid);

        if (!uid) {
          setIsTriunelyAdmin(false);
          return;
        }

        await checkIsTriunelyAdmin(uid);
        await loadAnnouncements();
      } catch (e) {
        console.log("TriunelyAnnouncements load error:", e);
        Alert.alert("Error", "We couldn't load announcements right now.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAnnouncements();
    }, [])
  );

  async function checkIsTriunelyAdmin(uid) {
    try {
      setCheckingAdmin(true);

      const { data, error } = await supabase
        .from("church_admins")
        .select("user_id, church_id")
        .eq("user_id", uid)
        .eq("church_id", TRIUNELY_CHURCH_ID)
        .maybeSingle();

      if (error) {
        console.log("checkIsTriunelyAdmin error:", error);
        setIsTriunelyAdmin(false);
        return;
      }

      setIsTriunelyAdmin(Boolean(data));
    } finally {
      setCheckingAdmin(false);
    }
  }

  async function loadAnnouncements() {
    try {
      setPostsLoading(true);

      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          id,
          user_id,
          church_id,
          community_id,
          visibility,
          content,
          url,
          link_title,
          link_description,
          link_image,
          is_anonymous,
          media_url,
          media_type,
          created_at,
          post_reactions (
            user_id,
            type
          ),
          post_comments (
            count
          )
        `
        )
        .eq("community_id", HOME_COMMUNITY_ID)
        .eq("church_id", TRIUNELY_CHURCH_ID)
        .eq("visibility", "global")
        .order("created_at", { ascending: false })
        .limit(PAGE_LIMIT);

      if (error) throw error;

      const mapped =
        (data || []).map((row) => {
          const commentCount =
            Array.isArray(row.post_comments) && row.post_comments.length > 0
              ? row.post_comments[0].count ?? 0
              : 0;

          return {
            id: row.id,
            user_id: row.user_id,
            church_id: row.church_id,
            content: row.content,
            url: row.url,
            link_title: row.link_title,
            link_description: row.link_description,
            link_image: row.link_image,
            is_anonymous: row.is_anonymous,
            media_url: row.media_url,
            media_type: row.media_type,
            created_at: row.created_at,
            reactions: row.post_reactions || [],
            comment_count: commentCount,
          };
        }) ?? [];

      setPosts(mapped);
    } catch (e) {
      console.log("loadAnnouncements error:", e);
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }

  async function handleCreateAnnouncement(content, url, _isAnonymous, _media) {
    if (!isTriunelyAdmin) {
      Alert.alert("Not allowed", "Only Triunely admins can post announcements.");
      return;
    }

    if (!content.trim()) {
      Alert.alert("Message required", "Please write something.");
      return;
    }

    try {
      setPosting(true);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        Alert.alert("Not signed in", "Please sign in again before posting.");
        return;
      }

      const payload = {
        user_id: userId,
        community_id: HOME_COMMUNITY_ID,
        church_id: TRIUNELY_CHURCH_ID,
        visibility: "global",
        is_anonymous: false,
        content: content.trim(),
      };

      if (url && url.trim()) payload.url = url.trim();

      const { data, error } = await supabase
        .from("posts")
        .insert(payload)
        .select(
          `
          id,
          user_id,
          church_id,
          content,
          url,
          link_title,
          link_description,
          link_image,
          is_anonymous,
          media_url,
          media_type,
          created_at
        `
        )
        .single();

      if (error) throw error;

      setPosts((prev) => [{ ...data, reactions: [], comment_count: 0 }, ...(prev || [])]);
      setShowNewModal(false);
    } catch (e) {
      console.log("handleCreateAnnouncement error:", e);
      Alert.alert("Could not post", e?.message || "Please try again.");
    } finally {
      setPosting(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={theme.colors.gold} />
        <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Loading…</Text>
      </View>
    );
  }

  return (
    <Screen backgroundColor={theme.colors.bg} padded={false} style={{ flex: 1 }}>
      {({ bottomPad }) => (
        <>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: bottomPad, paddingHorizontal: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "900" }}>
                  Triunely Announcements
                </Text>
                <VerifiedBadge size={15} />
              </View>

              <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
                <Ionicons name="close" size={24} color={theme.colors.text2} />
              </Pressable>
            </View>

            {checkingAdmin ? (
              <Text style={{ color: theme.colors.muted, marginTop: 6 }}>Checking admin permissions…</Text>
            ) : null}

            {isTriunelyAdmin ? (
              <Pressable
                onPress={() => setShowNewModal(true)}
                style={[theme.button.primary, { borderRadius: 14, paddingVertical: 12, marginTop: 12 }]}
              >
                <Text style={theme.button.primaryText}>Post a global announcement</Text>
              </Pressable>
            ) : (
              <View
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.divider,
                }}
              >
                <Text style={{ color: theme.colors.text2, fontWeight: "700" }}>
                  You can view announcements, but only Triunely admins can post them.
                </Text>
              </View>
            )}

            {postsLoading ? (
              <View style={{ paddingVertical: 18, alignItems: "center" }}>
                <ActivityIndicator size="small" color={theme.colors.gold} />
                <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Loading announcements…</Text>
              </View>
            ) : null}

            {!postsLoading && (posts || []).length === 0 ? (
              <Text style={{ color: theme.colors.muted, fontWeight: "700", marginTop: 14 }}>No announcements yet.</Text>
            ) : null}

            <View style={{ marginTop: 12 }}>
              {(posts || []).map((p) => (
                <View key={p.id} style={{ marginBottom: 10 }}>
                  <PostCard
                    post={p}
                    currentUserId={viewerId}
                    author={triunelyAuthor}
                    onPressAvatar={() => {}}
                    onOpenComments={() => {}}
                    onShare={null}
                    onSetReaction={() => {}}
                    reactionPickerForPost={null}
                    setReactionPickerForPost={() => {}}
                    preferInAppYouTube={true}
                  />
                </View>
              ))}
            </View>
          </ScrollView>

          <NewPostModal
            visible={showNewModal}
            onClose={() => {
              if (!posting) setShowNewModal(false);
            }}
            onSubmit={handleCreateAnnouncement}
            loading={posting}
          />
        </>
      )}
    </Screen>
  );
}
