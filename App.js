// App.js
import "react-native-gesture-handler";

import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { PointsProvider } from "./src/context/PointsContext";
import { supabase } from "./src/lib/supabase";

// Theme
import { theme } from "./src/theme/theme";

// screens (tabs)
import AuthScreen from "./src/screens/Auth";
import Coach from "./src/screens/Coach";
import CoachChats from "./src/screens/CoachChats";
import Community from "./src/screens/Community";
import Daily from "./src/screens/Daily";
import NotificationsScreen from "./src/screens/NotificationsScreen";
import Prayer from "./src/screens/Prayer";
import Profile from "./src/screens/Profile";
import UserProfile from "./src/screens/UserProfile";

// Global Search screen
import GlobalSearch from "./src/screens/GlobalSearch";

// onboarding screen
import CompleteProfileOnboarding from "./src/screens/CompleteProfileOnboarding";

// impact modal
import ImpactModal from "./src/components/ImpactModal";

// full-page courtroom screens
import ApologeticsArena from "./src/screens/ApologeticsArena";
import ExhibitBrief from "./src/screens/ExhibitBrief";

// church admin screens
import ChurchAdminHome from "./src/screens/ChurchAdminHome";
import ChurchNoticeboard from "./src/screens/ChurchNoticeboard";
import WeeklyChallengeEditor from "./src/screens/WeeklyChallengeEditor";
import WeeklyMessageEditor from "./src/screens/WeeklyMessageEditor";

// church hub + feed + church profile + inbox
import ChurchAdminAdmins from "./src/screens/ChurchAdminAdmins";
import ChurchAdminHub from "./src/screens/ChurchAdminHub";
import ChurchAdminInbox from "./src/screens/ChurchAdminInbox";
import ChurchAdminThread from "./src/screens/ChurchAdminThread";
import ChurchCreateGroup from "./src/screens/ChurchCreateGroup";
import ChurchFeed from "./src/screens/ChurchFeed";
import ChurchFind from "./src/screens/ChurchFind";
import ChurchInbox from "./src/screens/ChurchInbox";
import ChurchProfilePublic from "./src/screens/ChurchProfilePublic";

// ✅ Existing: ChurchEdit screen
import ChurchEdit from "./src/screens/ChurchEdit";

// ✅ Step 2B: ADD ChurchCreateChurch screen
import ChurchCreateChurch from "./src/screens/ChurchCreateChurch";

const Tab = createBottomTabNavigator();
const CoachStack = createNativeStackNavigator();
const CommunityStack = createNativeStackNavigator();
const PrayerStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const ChurchStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

// Hard-coded for now – you can change this number any time.
const CURRENT_SUBSCRIBERS = 0;
const SUBSCRIPTION_PRICE = 6.99;
const CHARITY_PER_SUBSCRIBER = 2;
const GOAL_SUBSCRIBERS = 1_000_000;

/**
 * NotificationsBell
 * - headerRight bell button (used by stacks)
 */
function NotificationsBell({ navigation }) {
  return (
    <Pressable
      onPress={() => navigation.navigate("Notifications")}
      style={{ paddingHorizontal: 12, paddingVertical: 8 }}
      hitSlop={10}
    >
      <Ionicons name="notifications-outline" size={22} color={theme.colors.gold} />
    </Pressable>
  );
}

/**
 * ChurchEntry
 * - This is the first screen in the Church tab.
 * - It decides which church profile to open.
 *
 * REQUIRED BEHAVIOR:
 * - If user has APPROVED membership -> open that church
 * - Else if user is admin (church_admins) -> open that church
 * - Else -> go to ChurchFind (NO default church fallback)
 */
function ChurchEntry({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [resolvedChurchId, setResolvedChurchId] = useState(null);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErrorText("");

        const { data: sessData, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) throw sessErr;

        const uid = sessData?.session?.user?.id;

        // If not signed in (shouldn't happen in tabs), go to Find Church.
        if (!uid) {
          if (!alive) return;
          setResolvedChurchId(null);
          navigation.replace("ChurchFind");
          return;
        }

        // Resolve which church to open for this user.
        // Order:
        // 1) APPROVED church_memberships
        // 2) church_admins (admin but not a membership row)
        //
        // IMPORTANT: NO default/fallback church.
        let approvedMemberChurchId = null;
        let adminChurchId = null;

        // 1) Approved membership (user_id, church_id, status)
        try {
          const { data, error } = await supabase
            .from("church_memberships")
            .select("church_id, created_at")
            .eq("user_id", uid)
            .eq("status", "approved")
            .order("created_at", { ascending: false })
            .limit(1);

          if (error) {
            console.log("church_memberships lookup error:", error);
          } else if (Array.isArray(data) && data.length > 0) {
            approvedMemberChurchId = data?.[0]?.church_id ?? null;
          }
        } catch (e) {
          console.log("church_memberships lookup exception:", e);
        }

        // 2) church_admins (user_id, church_id) — admin routing support
        try {
          const { data, error } = await supabase
            .from("church_admins")
            .select("church_id, created_at")
            .eq("user_id", uid)
            .order("created_at", { ascending: false })
            .limit(1);

          if (!error && Array.isArray(data) && data.length > 0) {
            adminChurchId = data?.[0]?.church_id ?? null;
          }
        } catch (e) {
          // Ignore: table may not exist yet
        }

        const finalId = approvedMemberChurchId || adminChurchId || null;

        if (!alive) return;
        setResolvedChurchId(finalId);

        // If we have a church id, route to it.
        // Otherwise, go to Find your church.
        if (finalId) {
          navigation.replace("ChurchProfilePublic", {
            churchId: finalId,
          });
        } else {
          navigation.replace("ChurchFind");
        }
      } catch (e) {
        if (!alive) return;
        console.log("ChurchEntry routing error:", e);
        setErrorText(e?.message || "Could not load your church right now.");
        setResolvedChurchId(null);
        navigation.replace("ChurchFind");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [navigation]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.gold} />
        <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Loading church…</Text>
      </View>
    );
  }

  // We should almost always have navigated away. If not, show a safe fallback UI.
  if (!resolvedChurchId) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.bg,
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 18,
            fontWeight: "900",
            marginBottom: 6,
          }}
        >
          Find your church
        </Text>

        <Text style={{ color: theme.colors.muted, textAlign: "center", marginBottom: 16 }}>
          You’re not linked to a church yet.
        </Text>

        {errorText ? (
          <Text
            style={{
              color: "tomato",
              fontWeight: "800",
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            {errorText}
          </Text>
        ) : null}

        <Pressable
          onPress={() => navigation.replace("ChurchFind")}
          style={[
            theme.button.primary,
            { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 },
          ]}
        >
          <Text style={theme.button.primaryText}>Find your church</Text>
        </Pressable>
      </View>
    );
  }

  // If we have a resolved id but navigation.replace hasn't fired for some reason
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.bg,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ActivityIndicator size="small" color={theme.colors.gold} />
      <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Opening church…</Text>
    </View>
  );
}

function CoachStackNavigator() {
  return (
    <CoachStack.Navigator screenOptions={{ headerShown: false }}>
      <CoachStack.Screen name="CoachMain" component={Coach} />
      <CoachStack.Screen name="CoachChats" component={CoachChats} />
    </CoachStack.Navigator>
  );
}

function CommunityStackNavigator() {
  return (
    <CommunityStack.Navigator screenOptions={{ headerShown: false }}>

      <CommunityStack.Screen name="CommunityMain" component={Community} />
    </CommunityStack.Navigator>
  );
}

function PrayerStackNavigator() {
  return (
   <PrayerStack.Navigator screenOptions={{ headerShown: false }}>

      <PrayerStack.Screen name="PrayerMain" component={Prayer} />
    </PrayerStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
   <ProfileStack.Navigator screenOptions={{ headerShown: false }}>

      <ProfileStack.Screen name="ProfileMain" component={Profile} />
    </ProfileStack.Navigator>
  );
}

/**
 * Church stack inside tabs
 * This is what keeps the bottom tab bar visible on:
 * - Church profile
 * - Church inbox
 * - Church admin inbox/thread
 */
function ChurchStackNavigator() {
  return (
    <ChurchStack.Navigator screenOptions={{ headerShown: false }}>
      {/* Entry point for Church tab */}
      <ChurchStack.Screen name="ChurchEntry" component={ChurchEntry} />

      <ChurchStack.Screen name="ChurchProfilePublic" component={ChurchProfilePublic} />

      {/* ✅ ChurchCreateChurch inside Church tab stack */}
      <ChurchStack.Screen
        name="ChurchCreateChurch"
        component={ChurchCreateChurch}
        options={{ animation: "slide_from_right" }}
      />

      {/* ✅ ChurchEdit inside Church tab stack */}
      <ChurchStack.Screen
        name="ChurchEdit"
        component={ChurchEdit}
        options={{ animation: "slide_from_right" }}
      />

      <ChurchStack.Screen
        name="ChurchFind"
        component={ChurchFind}
        options={{ animation: "slide_from_right" }}
      />

      <ChurchStack.Screen
        name="ChurchInbox"
        component={ChurchInbox}
        options={{ animation: "slide_from_right" }}
      />
      <ChurchStack.Screen
        name="ChurchAdminInbox"
        component={ChurchAdminInbox}
        options={{ animation: "slide_from_right" }}
      />
      <ChurchStack.Screen
        name="ChurchAdminThread"
        component={ChurchAdminThread}
        options={{ animation: "slide_from_right" }}
      />
      <ChurchStack.Screen
        name="ChurchAdminHub"
        component={ChurchAdminHub}
        options={{ animation: "slide_from_right" }}
      />

      <ChurchStack.Screen
        name="ChurchAdminAdmins"
        component={ChurchAdminAdmins}
        options={{ animation: "slide_from_right" }}
      />

      <ChurchStack.Screen
        name="ChurchFeed"
        component={ChurchFeed}
        options={{ animation: "slide_from_right" }}
      />

      <ChurchStack.Screen
        name="ChurchAdminHome"
        component={ChurchAdminHome}
        options={{ animation: "slide_from_right" }}
      />
      <ChurchStack.Screen
        name="WeeklyMessageEditor"
        component={WeeklyMessageEditor}
        options={{ animation: "slide_from_right" }}
      />
      <ChurchStack.Screen
        name="WeeklyChallengeEditor"
        component={WeeklyChallengeEditor}
        options={{ animation: "slide_from_right" }}
      />
      <ChurchStack.Screen
        name="ChurchNoticeboard"
        component={ChurchNoticeboard}
        options={{ animation: "slide_from_right" }}
      />
      <ChurchStack.Screen
        name="ChurchCreateGroup"
        component={ChurchCreateGroup}
        options={{ animation: "slide_from_right" }}
      />
    </ChurchStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.bg,
          borderTopColor: theme.colors.divider,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: theme.colors.goldPressed,
        tabBarInactiveTintColor: theme.colors.sageSoft,
        tabBarLabelStyle: { fontWeight: "800", fontSize: 11 },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName = "ellipse-outline";

          if (route.name === "Daily") iconName = focused ? "calendar" : "calendar-outline";
          if (route.name === "Coach") iconName = focused ? "chatbubbles" : "chatbubbles-outline";
          if (route.name === "Prayer") iconName = focused ? "hand-left" : "hand-left-outline";
          if (route.name === "Community") iconName = focused ? "people" : "people-outline";
          if (route.name === "Church") iconName = focused ? "business" : "business-outline";
          if (route.name === "Profile") iconName = focused ? "person" : "person-outline";

          return <Ionicons name={iconName} size={size ?? 22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Daily" component={Daily} />
      <Tab.Screen name="Coach" component={CoachStackNavigator} />
      <Tab.Screen name="Prayer" component={PrayerStackNavigator} />
      <Tab.Screen name="Community" component={CommunityStackNavigator} />
      <Tab.Screen name="Church" component={ChurchStackNavigator} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={MainTabs} />

      <RootStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ animation: "slide_from_right", headerShown: false }}
      />

      <RootStack.Screen
        name="GlobalSearch"
        component={GlobalSearch}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="ApologeticsArena"
        component={ApologeticsArena}
        options={{ animation: "slide_from_right" }}
      />
      <RootStack.Screen
        name="ExhibitBrief"
        component={ExhibitBrief}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="UserProfile"
        component={UserProfile}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="ChurchFind"
        component={ChurchFind}
        options={{ animation: "slide_from_right" }}
      />

      {/* Keep these RootStack church routes as fallback for now */}
      <RootStack.Screen
        name="ChurchProfilePublic"
        component={ChurchProfilePublic}
        options={{ animation: "slide_from_right" }}
      />

      {/* ✅ ChurchCreateChurch fallback route */}
      <RootStack.Screen
        name="ChurchCreateChurch"
        component={ChurchCreateChurch}
        options={{ animation: "slide_from_right" }}
      />

      {/* ChurchEdit fallback route */}
      <RootStack.Screen
        name="ChurchEdit"
        component={ChurchEdit}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="ChurchInbox"
        component={ChurchInbox}
        options={{ animation: "slide_from_right" }}
      />
      <RootStack.Screen
        name="ChurchAdminInbox"
        component={ChurchAdminInbox}
        options={{ animation: "slide_from_right" }}
      />
      <RootStack.Screen
        name="ChurchAdminThread"
        component={ChurchAdminThread}
        options={{ animation: "slide_from_right" }}
      />
      <RootStack.Screen
        name="ChurchAdminHub"
        component={ChurchAdminHub}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="ChurchAdminAdmins"
        component={ChurchAdminAdmins}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="ChurchFeed"
        component={ChurchFeed}
        options={{ animation: "slide_from_right" }}
      />
      <RootStack.Screen
        name="ChurchAdminHome"
        component={ChurchAdminHome}
        options={{ animation: "slide_from_right" }}
      />
      <RootStack.Screen
        name="WeeklyMessageEditor"
        component={WeeklyMessageEditor}
        options={{ animation: "slide_from_right" }}
      />
      <RootStack.Screen
        name="WeeklyChallengeEditor"
        component={WeeklyChallengeEditor}
        options={{ animation: "slide_from_right" }}
      />
      <RootStack.Screen
        name="ChurchNoticeboard"
        component={ChurchNoticeboard}
        options={{ animation: "slide_from_right" }}
      />
      <RootStack.Screen
        name="ChurchCreateGroup"
        component={ChurchCreateGroup}
        options={{ animation: "slide_from_right" }}
      />
    </RootStack.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [showImpact, setShowImpact] = useState(false);

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Keep session in sync with Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Handle deep links like: triunelyapp://auth?code=...  (PKCE)
  useEffect(() => {
    const handleUrl = async (url) => {
      try {
        const { queryParams } = Linking.parse(url);
        const code = queryParams?.code;
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }
      } catch {
        // ignore
      }
    };

    Linking.getInitialURL().then((url) => url && handleUrl(url));
    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  // When user becomes logged in, show the impact popup once
  useEffect(() => {
    if (session) {
      setShowImpact(true);
    } else {
      setShowImpact(false);
      setProfile(null);
    }
  }, [session]);

  // Load the current user's profile when we have a session
  useEffect(() => {
    async function loadProfile() {
      if (!session) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      try {
        setProfileLoading(true);
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (error) {
          console.log("Error loading profile in App.js", error);
          setProfile(null);
        } else {
          setProfile(data);
        }
      } catch (e) {
        console.log("Unexpected error loading profile in App.js", e);
        setProfile(null);
      } finally {
        setProfileLoading(false);
      }
    }

    loadProfile();
  }, [session]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {!session ? (
          <AuthScreen />
        ) : profileLoading ? (
          <View
            style={{
              flex: 1,
              backgroundColor: theme.colors.bg,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="large" color={theme.colors.gold} />
            <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Loading your profile…</Text>
          </View>
        ) : (
          <PointsProvider>
            {profile && profile.has_completed_onboarding === false ? (
              <CompleteProfileOnboarding
                profile={profile}
                onFinished={(updatedProfile) => {
                  setProfile(updatedProfile);
                  setShowImpact(true);
                }}
              />
            ) : (
              <>
                <NavigationContainer>
                  <RootNavigator />
                </NavigationContainer>

                <ImpactModal
                  visible={showImpact}
                  onClose={() => setShowImpact(false)}
                  subscribers={CURRENT_SUBSCRIBERS}
                  pricePerMonth={SUBSCRIPTION_PRICE}
                  charityPerSubscriber={CHARITY_PER_SUBSCRIBER}
                  goalSubscribers={GOAL_SUBSCRIBERS}
                />
              </>
            )}
          </PointsProvider>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
