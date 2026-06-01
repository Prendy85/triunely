// App.js
import "react-native-gesture-handler";

import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Linking from "expo-linking";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import ImpactModal from "./src/components/ImpactModal";
import InAppNotificationBanner from "./src/components/InAppNotificationBanner";
import { FellowshipRequestsModalProvider } from "./src/context/FellowshipRequestsModalProvider";
import { PointsProvider } from "./src/context/PointsContext";
import { RealtimeProvider } from "./src/context/RealtimeProvider";
import { supabase } from "./src/lib/supabase";
import { theme } from "./src/theme/theme";

// Auth / onboarding
import AuthScreen from "./src/screens/Auth";
import CompleteProfileOnboarding from "./src/screens/CompleteProfileOnboarding";

// Main tab screens
import Coach from "./src/screens/Coach";
import CoachChats from "./src/screens/CoachChats";
import Community from "./src/screens/Community";
import Daily from "./src/screens/Daily";
import Prayer from "./src/screens/Prayer";
import Profile from "./src/screens/Profile";

// Global / shared screens
import Chat from "./src/screens/Chat";
import DirectMessageUserSearch from "./src/screens/DirectMessageUserSearch";
import GlobalSearch from "./src/screens/GlobalSearch";
import MessagesInbox from "./src/screens/MessagesInbox";
import NetworkDetail from "./src/screens/NetworkDetail";
import Networks from "./src/screens/Networks";
import NotificationsScreen from "./src/screens/NotificationsScreen";
import UserProfile from "./src/screens/UserProfile";

// Apologetics screens
import ApologeticsArena from "./src/screens/ApologeticsArena";
import ExhibitBrief from "./src/screens/ExhibitBrief";

// Church screens
import ChurchAdminAdmins from "./src/screens/ChurchAdminAdmins";
import ChurchAdminGiving from "./src/screens/ChurchAdminGiving";
import ChurchAdminHome from "./src/screens/ChurchAdminHome";
import ChurchAdminHub from "./src/screens/ChurchAdminHub";
import ChurchAdminInbox from "./src/screens/ChurchAdminInbox";
import ChurchAdminThread from "./src/screens/ChurchAdminThread";
import ChurchCreateChurch from "./src/screens/ChurchCreateChurch";
import ChurchCreateGroup from "./src/screens/ChurchCreateGroup";
import ChurchEdit from "./src/screens/ChurchEdit";
import ChurchEventAttendeeViewer from "./src/screens/ChurchEventAttendeeViewer";
import ChurchEventRegistrationDetail from "./src/screens/ChurchEventRegistrationDetail";
import ChurchEventRegistrationList from "./src/screens/ChurchEventRegistrationList";
import ChurchEventRegistrations from "./src/screens/ChurchEventRegistrations";
import ChurchFeed from "./src/screens/ChurchFeed";
import ChurchFind from "./src/screens/ChurchFind";
import ChurchGiving from "./src/screens/ChurchGiving";
import ChurchGroupDetail from "./src/screens/ChurchGroupDetail";
import ChurchGroupManage from "./src/screens/ChurchGroupManage";
import ChurchGroupsAdmin from "./src/screens/ChurchGroupsAdmin";
import ChurchGroupsMember from "./src/screens/ChurchGroupsMember";
import ChurchInbox from "./src/screens/ChurchInbox";
import ChurchNoticeboard from "./src/screens/ChurchNoticeboard";
import ChurchProfilePublic from "./src/screens/ChurchProfilePublic";
import MinistryOperationsScreen from "./src/screens/MinistryOperationsScreen";
import WeeklyChallengeEditor from "./src/screens/WeeklyChallengeEditor";
import WeeklyMessageEditor from "./src/screens/WeeklyMessageEditor";

// Event screens
import CreateEventScreen from "./src/features/events/screens/CreateEventScreen";
import EventDetailsScreen from "./src/features/events/screens/EventDetailsScreen";
import EventInvitePeopleScreen from "./src/features/events/screens/EventInvitePeopleScreen";
import EventsScreen from "./src/features/events/screens/EventsScreen";
import RegisterEventScreen from "./src/features/events/screens/RegisterEventScreen";

const Tab = createBottomTabNavigator();
const CoachStack = createNativeStackNavigator();
const CommunityStack = createNativeStackNavigator();
const PrayerStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const ChurchStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

const navigationRef = createNavigationContainerRef();

const CURRENT_SUBSCRIBERS = 0;
const SUBSCRIPTION_PRICE = 6.99;
const CHARITY_PER_SUBSCRIBER = 2;
const GOAL_SUBSCRIBERS = 1_000_000;

function NotificationsBell({ navigation }) {
  return (
    <Pressable
      onPress={() => navigation.navigate("Notifications")}
      style={{ paddingHorizontal: 12, paddingVertical: 8 }}
      hitSlop={10}
    >
      <Ionicons
        name="notifications-outline"
        size={22}
        color={theme.colors.gold}
      />
    </Pressable>
  );
}

function ChurchEntry({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [resolvedChurchId, setResolvedChurchId] = useState(null);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    let alive = true;

    async function resolveChurch() {
      try {
        setLoading(true);
        setErrorText("");

        const { data: sessData, error: sessErr } =
          await supabase.auth.getSession();

        if (sessErr) throw sessErr;

        const uid = sessData?.session?.user?.id;

        if (!uid) {
          if (!alive) return;

          setResolvedChurchId(null);
          navigation.replace("ChurchFind");
          return;
        }

        let approvedMemberChurchId = null;
        let adminChurchId = null;

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
        } catch {
          // Ignore admin lookup exception.
        }

        const finalId = approvedMemberChurchId || adminChurchId || null;

        if (!alive) return;

        setResolvedChurchId(finalId);

        if (finalId) {
          navigation.replace("ChurchProfilePublic", { churchId: finalId });
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
    }

    resolveChurch();

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
        <Text style={{ color: theme.colors.muted, marginTop: 8 }}>
          Loading church…
        </Text>
      </View>
    );
  }

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

        <Text
          style={{
            color: theme.colors.muted,
            textAlign: "center",
            marginBottom: 16,
          }}
        >
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
            {
              borderRadius: 14,
              paddingVertical: 12,
              paddingHorizontal: 14,
            },
          ]}
        >
          <Text style={theme.button.primaryText}>Find your church</Text>
        </Pressable>
      </View>
    );
  }

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
      <Text style={{ color: theme.colors.muted, marginTop: 8 }}>
        Opening church…
      </Text>
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

      <CommunityStack.Screen
        name="Networks"
        component={Networks}
        options={{ animation: "slide_from_right" }}
      />

      <CommunityStack.Screen
        name="NetworkDetail"
        component={NetworkDetail}
        options={{ animation: "slide_from_right" }}
      />
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

function ChurchStackNavigator() {
  return (
    <ChurchStack.Navigator screenOptions={{ headerShown: false }}>
      <ChurchStack.Screen name="ChurchEntry" component={ChurchEntry} />

      <ChurchStack.Screen
        name="ChurchProfilePublic"
        component={ChurchProfilePublic}
        options={{ animation: "slide_from_right" }}
      />

      <ChurchStack.Screen
        name="ChurchCreateChurch"
        component={ChurchCreateChurch}
        options={{ animation: "slide_from_right" }}
      />

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
        name="MinistryOperations"
        component={MinistryOperationsScreen}
        options={{ animation: "slide_from_right" }}
      />

      <ChurchStack.Screen
        name="ChurchEventRegistrations"
        component={ChurchEventRegistrations}
        options={{ animation: "slide_from_right" }}
      />

      <ChurchStack.Screen
        name="ChurchEventRegistrationList"
        component={ChurchEventRegistrationList}
        options={{ animation: "slide_from_right" }}
      />

      <ChurchStack.Screen
        name="ChurchEventRegistrationDetail"
        component={ChurchEventRegistrationDetail}
        options={{ animation: "slide_from_right" }}
      />

      <ChurchStack.Screen
        name="ChurchEventAttendeeViewer"
        component={ChurchEventAttendeeViewer}
        options={{ animation: "slide_from_right" }}
      />

      <ChurchStack.Screen
        name="ChurchAdminGiving"
        component={ChurchAdminGiving}
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
        name="ChurchGroupsMember"
        component={ChurchGroupsMember}
        options={{ animation: "slide_from_right" }}
      />

      <ChurchStack.Screen
        name="ChurchGroupDetail"
        component={ChurchGroupDetail}
        options={{ animation: "slide_from_right" }}
      />

      <ChurchStack.Screen
        name="ChurchGroupsAdmin"
        component={ChurchGroupsAdmin}
        options={{ animation: "slide_from_right" }}
      />

      <ChurchStack.Screen
        name="ChurchGroupManage"
        component={ChurchGroupManage}
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

function MainTabs({ initialTabName = "Daily" }) {
  return (
    <Tab.Navigator
      initialRouteName={initialTabName}
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

          if (route.name === "Daily") {
            iconName = focused ? "calendar" : "calendar-outline";
          }

          if (route.name === "Coach") {
            iconName = focused ? "chatbubbles" : "chatbubbles-outline";
          }

          if (route.name === "Prayer") {
            iconName = focused ? "hand-left" : "hand-left-outline";
          }

          if (route.name === "Community") {
            iconName = focused ? "people" : "people-outline";
          }

          if (route.name === "Church") {
            iconName = focused ? "business" : "business-outline";
          }

          if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }

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

function RootNavigator({ initialTabName = "Daily" }) {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs">
        {(props) => <MainTabs {...props} initialTabName={initialTabName} />}
      </RootStack.Screen>

      <RootStack.Screen
        name="MessagesInbox"
        component={MessagesInbox}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="DirectMessageUserSearch"
        component={DirectMessageUserSearch}
        options={{ animation: "slide_from_right" }}
      />

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
        name="Events"
        component={EventsScreen}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="CreateEvent"
        component={CreateEventScreen}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="EventDetails"
        component={EventDetailsScreen}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="RegisterEvent"
        component={RegisterEventScreen}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="EventInvitePeople"
        component={EventInvitePeopleScreen}
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

      <RootStack.Screen
        name="ChurchProfilePublic"
        component={ChurchProfilePublic}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="ChurchGiving"
        component={ChurchGiving}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="ChurchCreateChurch"
        component={ChurchCreateChurch}
        options={{ animation: "slide_from_right" }}
      />

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
        name="MinistryOperations"
        component={MinistryOperationsScreen}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="ChurchEventRegistrations"
        component={ChurchEventRegistrations}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="ChurchEventRegistrationList"
        component={ChurchEventRegistrationList}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="ChurchEventRegistrationDetail"
        component={ChurchEventRegistrationDetail}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="ChurchEventAttendeeViewer"
        component={ChurchEventAttendeeViewer}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="ChurchAdminGiving"
        component={ChurchAdminGiving}
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
        name="Chat"
        component={Chat}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="ChurchGroupsMember"
        component={ChurchGroupsMember}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="ChurchGroupDetail"
        component={ChurchGroupDetail}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="ChurchGroupsAdmin"
        component={ChurchGroupsAdmin}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="ChurchGroupManage"
        component={ChurchGroupManage}
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
  const [pendingImpact, setPendingImpact] = useState(false);

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [churchAdminLandingChecked, setChurchAdminLandingChecked] =
    useState(false);
  const [isChurchAdminLandingUser, setIsChurchAdminLandingUser] =
    useState(false);

  const [showAuthOverlay, setShowAuthOverlay] = useState(false);
  const [authExitFinished, setAuthExitFinished] = useState(false);

  const authOverlayOpacity = useRef(new Animated.Value(1)).current;
  const impactTimerRef = useRef(null);

  function fadeOutAuthOverlay(onDone) {
    Animated.timing(authOverlayOpacity, {
      toValue: 0,
      duration: 260,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && typeof onDone === "function") onDone();
    });
  }

  const linking = useMemo(
    () => ({
      prefixes: [Linking.createURL("/")],
      config: {
        screens: {
          MainTabs: {
            screens: {
              Daily: "daily",
              Coach: "coach",
              Prayer: "prayer",
              Community: "community",
              Church: "church",
              Profile: "profile",
            },
          },
          Notifications: "notifications",
          GlobalSearch: "search",
        },
      },
    }),
    []
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function handleUrl(url) {
      try {
        const { queryParams } = Linking.parse(url);
        const code = queryParams?.code;

        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }
      } catch {
        // Ignore deep-link exchange errors.
      }
    }

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));

    return () => {
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (session) {
      setShowImpact(false);
      setPendingImpact(true);
      setChurchAdminLandingChecked(false);
      setIsChurchAdminLandingUser(false);
      return;
    }

    setShowImpact(false);
    setPendingImpact(false);
    setProfile(null);

    setChurchAdminLandingChecked(false);
    setIsChurchAdminLandingUser(false);

    if (impactTimerRef.current) {
      clearTimeout(impactTimerRef.current);
      impactTimerRef.current = null;
    }

    setShowAuthOverlay(false);
    setAuthExitFinished(false);
    authOverlayOpacity.setValue(1);
  }, [session, authOverlayOpacity]);

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

  useEffect(() => {
    let alive = true;

    async function checkChurchAdminLanding() {
      if (!session?.user?.id) {
        setChurchAdminLandingChecked(false);
        setIsChurchAdminLandingUser(false);
        return;
      }

      try {
        setChurchAdminLandingChecked(false);
        setIsChurchAdminLandingUser(false);

        const { data, error } = await supabase
          .from("church_admins")
          .select("church_id")
          .eq("user_id", session.user.id)
          .limit(1);

        if (!alive) return;

        if (error) {
          console.log("church_admins landing lookup error:", error);
          setIsChurchAdminLandingUser(false);
        } else {
          setIsChurchAdminLandingUser(
            Array.isArray(data) && data.length > 0 && !!data[0]?.church_id
          );
        }
      } catch (e) {
        if (!alive) return;

        console.log("church_admins landing lookup exception:", e);
        setIsChurchAdminLandingUser(false);
      } finally {
        if (alive) {
          setChurchAdminLandingChecked(true);
        }
      }
    }

    checkChurchAdminLanding();

    return () => {
      alive = false;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session) return;
    if (!showAuthOverlay) return;
    if (!authExitFinished) return;

    fadeOutAuthOverlay(() => {
      setShowAuthOverlay(false);
      setAuthExitFinished(false);
      authOverlayOpacity.setValue(1);
    });
  }, [session, showAuthOverlay, authExitFinished, authOverlayOpacity]);

  useEffect(() => {
    if (!session) return;
    if (showAuthOverlay) return;
    if (profileLoading) return;
    if (!profile) return;

    const onboardingIncomplete = profile.has_completed_onboarding === false;
    if (onboardingIncomplete) return;

    if (!pendingImpact) return;

    if (impactTimerRef.current) {
      clearTimeout(impactTimerRef.current);
      impactTimerRef.current = null;
    }

    impactTimerRef.current = setTimeout(() => {
      setShowImpact(true);
      setPendingImpact(false);
      impactTimerRef.current = null;
    }, 2000);

    return () => {
      if (impactTimerRef.current) {
        clearTimeout(impactTimerRef.current);
        impactTimerRef.current = null;
      }
    };
  }, [session, showAuthOverlay, profileLoading, profile, pendingImpact]);

  const shouldShowAuth = !session || showAuthOverlay;
  const initialTabName = isChurchAdminLandingUser ? "Church" : "Daily";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          {session ? (
            profileLoading || !churchAdminLandingChecked ? (
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
                      setShowImpact(false);
                      setPendingImpact(true);
                    }}
                  />
                ) : (
                  <>
                    <FellowshipRequestsModalProvider>
                      <RealtimeProvider session={session} profile={profile}>
                        <NavigationContainer
                          ref={navigationRef}
                          linking={linking}
                        >
                          <RootNavigator initialTabName={initialTabName} />
                          <InAppNotificationBanner navigation={navigationRef} />
                        </NavigationContainer>
                      </RealtimeProvider>
                    </FellowshipRequestsModalProvider>

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
            )
          ) : null}

          {shouldShowAuth ? (
            <Animated.View
              pointerEvents="auto"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "#FFFFFF",
                opacity: authOverlayOpacity,
              }}
            >
              <AuthScreen
                onAuthSuccessStart={() => {
                  setShowAuthOverlay(true);
                  setAuthExitFinished(false);
                  authOverlayOpacity.setValue(1);
                }}
                onAuthSuccessEnd={() => {
                  setAuthExitFinished(true);
                }}
              />
            </Animated.View>
          ) : null}
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}