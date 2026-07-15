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
  View
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
import PrayerGroupDetailScreen from "./src/screens/PrayerGroupDetailScreen";
import { theme } from "./src/theme/theme";

// Auth / onboarding
import AuthScreen from "./src/screens/Auth";
import CompleteProfileOnboarding from "./src/screens/CompleteProfileOnboarding";

// Main tab screens
import Coach from "./src/screens/Coach";
import CoachChats from "./src/screens/CoachChats";
import Community from "./src/screens/Community";
import CommunityPostDetail from "./src/screens/CommunityPostDetail";
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
import SharePostRecipientScreen from "./src/screens/SharePostRecipientScreen";
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
import ChurchCourseEdit from "./src/screens/ChurchCourseEdit";
import ChurchCoursesAdmin from "./src/screens/ChurchCoursesAdmin";
import ChurchCreateChurch from "./src/screens/ChurchCreateChurch";
import ChurchCreateGroup from "./src/screens/ChurchCreateGroup";
import ChurchEdit from "./src/screens/ChurchEdit";
import ChurchEventAttendeeViewer from "./src/screens/ChurchEventAttendeeViewer";
import ChurchEventRegistrationDetail from "./src/screens/ChurchEventRegistrationDetail";
import ChurchEventRegistrationList from "./src/screens/ChurchEventRegistrationList";
import ChurchEventRegistrations from "./src/screens/ChurchEventRegistrations";
import ChurchEventsAdmin from "./src/screens/ChurchEventsAdmin";
import ChurchFeed from "./src/screens/ChurchFeed";
import ChurchFind from "./src/screens/ChurchFind";
import ChurchGiving from "./src/screens/ChurchGiving";
import ChurchGroupDetail from "./src/screens/ChurchGroupDetail";
import ChurchGroupInviteResponseScreen from "./src/screens/ChurchGroupInviteResponseScreen";
import ChurchGroupManage from "./src/screens/ChurchGroupManage";
import ChurchGroupsAdmin from "./src/screens/ChurchGroupsAdmin";
import ChurchGroupsMember from "./src/screens/ChurchGroupsMember";
import ChurchInbox from "./src/screens/ChurchInbox";
import ChurchNoticeboard from "./src/screens/ChurchNoticeboard";
import ChurchProfilePublic from "./src/screens/ChurchProfilePublic";
import MinistryOperationsScreen from "./src/screens/MinistryOperationsScreen";
import WeeklyChallengeEditor from "./src/screens/WeeklyChallengeEditor";
import WeeklyMessageEditor from "./src/screens/WeeklyMessageEditor";
import WeeklyMessageVideoEditor from "./src/screens/WeeklyMessageVideoEditor";

// Event screens
import CreateEventScreen from "./src/features/events/screens/CreateEventScreen";
import EventDetailsScreen from "./src/features/events/screens/EventDetailsScreen";
import EventInvitePeopleScreen from "./src/features/events/screens/EventInvitePeopleScreen";
import EventsScreen from "./src/features/events/screens/EventsScreen";
import RegisterEventScreen from "./src/features/events/screens/RegisterEventScreen";
// Partner screens
import AddPartnerGalleryMedia from "./src/features/partners/screens/AddPartnerGalleryMedia";
import CreatePartnerPost from "./src/features/partners/screens/CreatePartnerPost";
import CreatePartnerProfile from "./src/features/partners/screens/CreatePartnerProfile";
import CreatePromotionCampaign from "./src/features/partners/screens/CreatePromotionCampaign";
import ManagePartnerGalleryItem from "./src/features/partners/screens/ManagePartnerGalleryItem";
import MyPartnerProfiles from "./src/features/partners/screens/MyPartnerProfiles";
import PartnerProfilePublic from "./src/features/partners/screens/PartnerProfilePublic";
import PartnerProfilesDirectory from "./src/features/partners/screens/PartnerProfilesDirectory";
import ReorderPartnerGallery from "./src/features/partners/screens/ReorderPartnerGallery";

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
const PREMIUM_CREAM = "#FFFCF5";
const EVENT_AMBER = "#B45309";

function AuthLogoRevealOverlay({ visible, reveal, onDone }) {
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(1)).current;
  const bloomOpacity = useRef(new Animated.Value(0)).current;
  const bloomScale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (!visible) return;

    overlayOpacity.setValue(1);
    logoOpacity.setValue(1);
    logoScale.setValue(1);
    bloomOpacity.setValue(0.08);
    bloomScale.setValue(0.85);
  }, [visible, overlayOpacity, logoOpacity, logoScale, bloomOpacity, bloomScale]);

  useEffect(() => {
    if (!visible || !reveal) return;

    const holdTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1.16,
          duration: 1450,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(bloomOpacity, {
            toValue: 0.16,
            duration: 450,
            useNativeDriver: true,
          }),
          Animated.timing(bloomOpacity, {
            toValue: 0,
            duration: 950,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(bloomScale, {
          toValue: 1.45,
          duration: 1450,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 0,
          duration: 1150,
          delay: 260,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 950,
          delay: 520,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && typeof onDone === "function") {
          onDone();
        }
      });
    }, 220);

    return () => clearTimeout(holdTimer);
  }, [visible, reveal, overlayOpacity, logoOpacity, logoScale, bloomOpacity, bloomScale, onDone]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="auto"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2000,
        elevation: 2000,
        backgroundColor: PREMIUM_CREAM,
        alignItems: "center",
        justifyContent: "center",
        opacity: overlayOpacity,
      }}
    >
      <Animated.View
        style={{
          position: "absolute",
          width: 340,
          height: 340,
          borderRadius: 999,
          backgroundColor: "rgba(255, 255, 255, 0.92)",
          opacity: bloomOpacity,
          transform: [{ scale: bloomScale }],
        }}
      />

      <Animated.Image
        source={require("./src/assets/brand/triunely-logo.png")}
        resizeMode="contain"
        style={{
          width: 330,
          height: 330,
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
        }}
      />
    </Animated.View>
  );
}

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
        name="CommunityPostDetail"
        component={CommunityPostDetail}
        options={{ animation: "slide_from_right" }}
      />

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

      <PrayerStack.Screen
        name="PrayerGroupDetail"
        component={PrayerGroupDetailScreen}
        options={{ animation: "slide_from_right" }}
      />
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
        name="ChurchEventsAdmin"
        component={ChurchEventsAdmin}
        options={{ animation: "slide_from_right" }}
      />

            <ChurchStack.Screen
        name="ChurchCoursesAdmin"
        component={ChurchCoursesAdmin}
        options={{ animation: "slide_from_right" }}
      />

            <ChurchStack.Screen
        name="ChurchCourseEdit"
        component={ChurchCourseEdit}
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
        name="SharePostRecipient"
        component={SharePostRecipientScreen}
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
        name="PartnerProfilesDirectory"
        component={PartnerProfilesDirectory}
        options={{ animation: "slide_from_right" }}
      />

            <RootStack.Screen
        name="MyPartnerProfiles"
        component={MyPartnerProfiles}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="PartnerProfilePublic"
        component={PartnerProfilePublic}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="CreatePartnerProfile"
        component={CreatePartnerProfile}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="CreatePartnerPost"
        component={CreatePartnerPost}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="AddPartnerGalleryMedia"
        component={AddPartnerGalleryMedia}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="ManagePartnerGalleryItem"
        component={ManagePartnerGalleryItem}
        options={{ animation: "slide_from_right" }}
      />

            <RootStack.Screen
        name="ReorderPartnerGallery"
        component={ReorderPartnerGallery}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
        name="CreatePromotionCampaign"
        component={CreatePromotionCampaign}
        options={{ animation: "slide_from_right" }}
      />

      <RootStack.Screen
  name="PrayerGroupDetail"
  component={PrayerGroupDetailScreen}
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
  name="ChurchEventsAdmin"
  component={ChurchEventsAdmin}
  options={{ animation: "slide_from_right" }}
/>

<RootStack.Screen
  name="ChurchCoursesAdmin"
  component={ChurchCoursesAdmin}
  options={{ animation: "slide_from_right" }}
/>

<RootStack.Screen
  name="ChurchCourseEdit"
  component={ChurchCourseEdit}
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
  name="WeeklyMessageVideoEditor"
  component={WeeklyMessageVideoEditor}
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
  name="ChurchGroupInviteResponse"
  component={ChurchGroupInviteResponseScreen}
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
  const [showAuthReveal, setShowAuthReveal] = useState(false);
  const [authRevealReady, setAuthRevealReady] = useState(false);

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
setShowAuthReveal(false);
setAuthRevealReady(false);
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
  if (profileLoading) return;
  if (!churchAdminLandingChecked) return;

  requestAnimationFrame(() => {
    setShowAuthOverlay(false);
    setAuthExitFinished(false);
    authOverlayOpacity.setValue(1);

    requestAnimationFrame(() => {
      setAuthRevealReady(true);
    });
  });
}, [
  session,
  showAuthOverlay,
  authExitFinished,
  profileLoading,
  churchAdminLandingChecked,
  authOverlayOpacity,
]);

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
  setShowAuthReveal(true);
  setAuthRevealReady(false);
  authOverlayOpacity.setValue(1);
}}
                onAuthSuccessEnd={() => {
                  setAuthExitFinished(true);
                }}
              />
            </Animated.View>
          ) : null}
            <AuthLogoRevealOverlay
  visible={showAuthReveal}
  reveal={authRevealReady}
  onDone={() => {
    setShowAuthReveal(false);
    setAuthRevealReady(false);
  }}
/>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}