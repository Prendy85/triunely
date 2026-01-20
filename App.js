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
import ChurchAdminHub from "./src/screens/ChurchAdminHub";
import ChurchAdminInbox from "./src/screens/ChurchAdminInbox";
import ChurchAdminThread from "./src/screens/ChurchAdminThread";
import ChurchCreateGroup from "./src/screens/ChurchCreateGroup";
import ChurchFeed from "./src/screens/ChurchFeed";
import ChurchFind from "./src/screens/ChurchFind";
import ChurchInbox from "./src/screens/ChurchInbox";
import ChurchProfilePublic from "./src/screens/ChurchProfilePublic";


const Tab = createBottomTabNavigator();
const CoachStack = createNativeStackNavigator();
const CommunityStack = createNativeStackNavigator();
const ChurchStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

// Hard-coded for now – you can change this number any time.
const CURRENT_SUBSCRIBERS = 0;
const SUBSCRIPTION_PRICE = 6.99;
const CHARITY_PER_SUBSCRIBER = 2;
const GOAL_SUBSCRIBERS = 1_000_000;

/**
 * IMPORTANT:
 * Set this to your real Triunely Church row id in Supabase once you know it.
 * For now it can be null; ChurchEntry will show a friendly fallback screen.
 */
const TRIUNELY_CHURCH_ID = "d32ac34f-6468-41b6-aabc-c314230cd7c4";


/**
 * ChurchEntry
 * - This is the first screen in the Church tab.
 * - It decides which church profile to open.
 * - For now it tries to find a membership in a defensive way, without breaking builds.
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

if (!uid) {
  const finalId = TRIUNELY_CHURCH_ID || null;

  if (!alive) return;
  setResolvedChurchId(finalId);

  if (finalId) {
    navigation.replace("ChurchProfilePublic", {
      churchId: finalId,
      isDefaultTriunelyChurch: true,
    });
  }

  return;
}


                // Resolve which church to open for this user.
        // Order:
        // 1) profiles.church_id (if you store it there)
        // 2) church_members (normal membership)
        // 3) church_admins (admin but not a "member" row)
        // 4) TRIUNELY_CHURCH_ID fallback
        let profileChurchId = null;
        let memberChurchId = null;
        let adminChurchId = null;

        // 1) profiles.church_id (safe if column exists; ignore if it doesn't)
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("church_id")
            .eq("id", uid)
            .single();

          if (!error && data?.church_id) {
            profileChurchId = data.church_id;
          }
        } catch (e) {
          // Ignore: column/table might differ
        }

        // 2) church_members (user_id, church_id)
        try {
  // Your actual table name (from Supabase): church_memberships (user_id, church_id)
  const { data, error } = await supabase
    .from("church_memberships")
    .select("church_id")
    .eq("user_id", uid)
    .limit(1);

  if (error) {
    console.log("church_memberships lookup error:", error);
  } else if (Array.isArray(data) && data.length > 0) {
    memberChurchId = data?.[0]?.church_id ?? null;
  }
} catch (e) {
  console.log("church_memberships lookup exception:", e);
}


        // 3) church_admins (user_id, church_id) — admin routing support
        try {
          const { data, error } = await supabase
            .from("church_admins")
            .select("church_id")
            .eq("user_id", uid)
            .limit(1);

          if (!error && Array.isArray(data) && data.length > 0) {
            adminChurchId = data?.[0]?.church_id ?? null;
          }
        } catch (e) {
          // Ignore: table may not exist yet
        }

        const finalId =
          profileChurchId || memberChurchId || adminChurchId || TRIUNELY_CHURCH_ID || null;


        if (!alive) return;
        setResolvedChurchId(finalId);

        // If we have a church id, immediately route to the profile within the Church tab stack
        if (finalId) {
          navigation.replace("ChurchProfilePublic", {
  churchId: finalId,
  isDefaultTriunelyChurch: finalId === TRIUNELY_CHURCH_ID,
});

        }
      } catch (e) {
        if (!alive) return;
        setErrorText(e?.message || "Could not load your church right now.");
        setResolvedChurchId(TRIUNELY_CHURCH_ID || null);
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
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={theme.colors.gold} />
        <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Loading church…</Text>
      </View>
    );
  }

  // If we didn't resolve any church id, show a safe fallback UI.
  // Later we will replace this with your Join/Find Church page with an X dismiss.
  if (!resolvedChurchId) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: "center", alignItems: "center", padding: 16 }}>
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900", marginBottom: 6 }}>
          Find a church
        </Text>

        <Text style={{ color: theme.colors.muted, textAlign: "center", marginBottom: 16 }}>
          You’re not linked to a church yet. Next we’ll add the Join/Find Church screen here.
        </Text>

        {errorText ? (
          <Text style={{ color: "tomato", fontWeight: "800", textAlign: "center", marginBottom: 12 }}>
            {errorText}
          </Text>
        ) : null}

        <Pressable
          onPress={() => {
            if (!TRIUNELY_CHURCH_ID) return;
            navigation.replace("ChurchProfilePublic", {
  churchId: TRIUNELY_CHURCH_ID,
  isDefaultTriunelyChurch: true,
});

          }}
          style={[
            theme.button.primary,
            { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, opacity: TRIUNELY_CHURCH_ID ? 1 : 0.5 },
          ]}
          disabled={!TRIUNELY_CHURCH_ID}
        >
          <Text style={theme.button.primaryText}>
            {TRIUNELY_CHURCH_ID ? "Open Triunely Church" : "Set TRIUNELY_CHURCH_ID to enable"}
          </Text>
        </Pressable>
      </View>
    );
  }

  // If we have a resolved id but navigation.replace hasn't fired for some reason
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: "center", alignItems: "center" }}>
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
      <Tab.Screen name="Prayer" component={Prayer} />
      <Tab.Screen name="Community" component={CommunityStackNavigator} />
      <Tab.Screen name="Church" component={ChurchStackNavigator} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={MainTabs} />

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
            <Text style={{ color: theme.colors.muted, marginTop: 8 }}>
              Loading your profile…
            </Text>
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
