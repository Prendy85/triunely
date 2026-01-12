// App.js
import "react-native-gesture-handler";

import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { PointsProvider } from "./src/context/PointsContext";
import { supabase } from "./src/lib/supabase";

// ✅ Theme (makes tabs + loading match Prayer styling)
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

// NEW: onboarding screen
import CompleteProfileOnboarding from "./src/screens/CompleteProfileOnboarding";

// NEW: impact modal
import ImpactModal from "./src/components/ImpactModal";

// NEW: full-page courtroom screens
import ApologeticsArena from "./src/screens/ApologeticsArena";
import ExhibitBrief from "./src/screens/ExhibitBrief";

// NEW: church admin screens
import ChurchAdminHome from "./src/screens/ChurchAdminHome";
import ChurchNoticeboard from "./src/screens/ChurchNoticeboard";
import WeeklyChallengeEditor from "./src/screens/WeeklyChallengeEditor";
import WeeklyMessageEditor from "./src/screens/WeeklyMessageEditor";

// ✅ NEW: church hub + feed + church profile
import ChurchAdminHub from "./src/screens/ChurchAdminHub";
import ChurchFeed from "./src/screens/ChurchFeed";
import ChurchProfilePublic from "./src/screens/ChurchProfilePublic";

const Tab = createBottomTabNavigator();
const CoachStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

// Hard-coded for now – you can change this number any time.
const CURRENT_SUBSCRIBERS = 0;
const SUBSCRIPTION_PRICE = 6.99;
const CHARITY_PER_SUBSCRIBER = 2;
const GOAL_SUBSCRIBERS = 1_000_000;

function CoachStackNavigator() {
  return (
    <CoachStack.Navigator screenOptions={{ headerShown: false }}>
      <CoachStack.Screen name="CoachMain" component={Coach} />
      <CoachStack.Screen name="CoachChats" component={CoachChats} />
    </CoachStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        // ✅ Tab bar now matches Prayer theme
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
          if (route.name === "Profile") iconName = focused ? "person" : "person-outline";

          return <Ionicons name={iconName} size={size ?? 22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Daily" component={Daily} />
      <Tab.Screen name="Coach" component={CoachStackNavigator} />
      <Tab.Screen name="Prayer" component={Prayer} />
      <Tab.Screen name="Community" component={Community} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {/* Tabs */}
      <RootStack.Screen name="MainTabs" component={MainTabs} />

      {/* Courtroom: full-page screens */}
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

      {/* User profiles */}
      <RootStack.Screen
        name="UserProfile"
        component={UserProfile}
        options={{ animation: "slide_from_right" }}
      />

      {/* Church Admin: entry + editors */}
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

      {/* ✅ Church Admin Hub + Church Feed + Church Profile */}
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
        name="ChurchProfilePublic"
        component={ChurchProfilePublic}
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
          // ✅ Loading screen now matches Prayer theme
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
