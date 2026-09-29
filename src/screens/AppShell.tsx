import { isTabScreen, useWippStore } from "../lib/store";
import type { Screen } from "../lib/types";
import { TabBar } from "../components/TabBar";
import {
  LoginScreen,
  OnboardingScreen,
  OtpScreen,
  SetupScreen,
  SignupCelebrationScreen,
  SignupScreen,
  SplashScreen,
  WelcomeScreen,
  PhoneEntryScreen,
  SmsReferenceScreen,
  ProfileReferenceScreen,
} from "./auth";
import {
  ArchivesScreen,
  ChatInfoScreen,
  ChatsScreen,
  GlobalSearchScreen,
  MyGroupsScreen,
  NewChatScreen,
  PrivateChatsScreen,
  RequestsScreen,
} from "./chats";
import { ConversationScreen, E2eInfoScreen } from "./conversation";
import {
  ConnectScreen,
  FoundProfileScreen,
  MyQrScreen,
  NearbyScreen,
  QrGroupScreen,
  QrProfileScreen,
  ScannerScreen,
  SearchUserScreen,
  TouchIncomingScreen,
  WgoTouchScreen,
} from "./connect";
import { ActiveCallScreen, CallLinkScreen, CallsScreen } from "./calls";
import {
  CreateLifestyleScreen,
  CreateListingScreen,
  CreateShopScreen,
  ExploreScreen,
  ListingScreen,
  LifestyleScreen,
  PharmacyScreen,
  ShopScreen,
} from "./explore";
import {
  AccessibilityScreen,
  AccountScreen,
  AdminScreen,
  AppearanceScreen,
  BlockedScreen,
  BusinessCardEditorScreen,
  BusinessCardScreen,
  BusinessCardViewScreen,
  DeleteAccountScreen,
  DevicesScreen,
  HelpScreen,
  LanguageScreen,
  LegalScreen,
  MeScreen,
  MyActivityScreen,
  NotificationsScreen,
  PrivacyScreen,
  SecurityScreen,
} from "./me";
import {
  GroupInfoFull,
  GroupInviteScreen,
  GroupQrScreen,
  IntroduceScreen,
  IntroDetailScreen,
  LiveCodeScreen,
  NewGroupFlow,
  NewStoryScreen,
  OneTimeQrScreen,
  StoriesScreen,
} from "./extra";
import { useEffect, useState } from "react";
import { AppState, Platform, View } from "react-native";
import { RecaptchaHost } from "../components/FirebaseRecaptchaVerifierModal";
import { IntroSplash } from "./intro";
import { useDeviceLayout } from "../lib/device-layout";

const AUTH = new Set([
  "splash",
  "onboarding",
  "welcome",
  "phone-entry",
  "sms-reference",
  "profile-reference",
  "signup-celebration",
  "signup",
  "login",
  "otp",
  "setup",
]);

function ScreenSwitch({ screen }: { screen: Screen }) {
  switch (screen.name) {
    case "splash":
      return <SplashScreen />;
    case "onboarding":
      return <OnboardingScreen />;
    case "welcome":
      return <WelcomeScreen />;
    case "phone-entry":
      return <PhoneEntryScreen />;
    case "sms-reference":
      return <SmsReferenceScreen />;
    case "profile-reference":
      return <ProfileReferenceScreen />;
    case "signup-celebration":
      return <SignupCelebrationScreen username={screen.username} />;
    case "signup":
      return <SignupScreen />;
    case "login":
      return <LoginScreen />;
    case "otp":
      return <OtpScreen />;
    case "setup":
      return <SetupScreen />;
    case "chats":
      return <ChatsScreen />;
    case "conversation":
      return <ConversationScreen chatId={screen.chatId} />;
    case "archives":
      return <ArchivesScreen />;
    case "chat-info":
      return <ChatInfoScreen chatId={screen.chatId} />;
    case "new-chat":
      return <NewChatScreen />;
    case "requests":
      return <RequestsScreen />;
    case "calls":
      return <CallsScreen />;
    case "active-call":
      return <ActiveCallScreen userId={screen.userId} kind={screen.kind} dir={screen.dir} />;
    case "call-link":
      return <CallLinkScreen />;
    case "connect":
      return <ConnectScreen />;
    case "my-qr":
      return <MyQrScreen />;
    case "scanner":
      return <ScannerScreen />;
    case "search-user":
      return <SearchUserScreen />;
    case "nearby":
      return <NearbyScreen />;
    case "qr-profile":
      return <QrProfileScreen handoffKey={screen.key} />;
    case "qr-group":
      return <QrGroupScreen handoffKey={screen.key} />;
    case "found-profile":
      return <FoundProfileScreen userId={screen.userId} via={screen.via} />;
    case "explore":
      return <ExploreScreen />;
    case "listing":
      return <ListingScreen listingId={screen.listingId} />;
    case "me":
      return <MeScreen />;
    case "my-activity":
      return <MyActivityScreen kind={screen.kind} />;
    case "privacy":
      return <PrivacyScreen />;
    case "wipp-private":
      return <PrivateChatsScreen />;
    case "account":
      return <AccountScreen />;
    case "security":
      return <SecurityScreen />;
    case "notifications":
      return <NotificationsScreen />;
    case "appearance":
      return <AppearanceScreen />;
    case "business-card":
      return <BusinessCardScreen />;
    case "business-card-editor":
      return <BusinessCardEditorScreen />;
    case "business-card-view":
      return <BusinessCardViewScreen publicId={screen.publicId} />;
    case "admin":
      return <AdminScreen />;
    case "devices":
      return <DevicesScreen />;
    case "language":
      return <LanguageScreen />;
    case "accessibility":
      return <AccessibilityScreen />;
    case "help":
      return <HelpScreen />;
    case "blocked":
      return <BlockedScreen />;
    case "delete-account":
      return <DeleteAccountScreen />;
    case "legal":
      return <LegalScreen doc={screen.doc} />;
    case "stories":
      return <StoriesScreen userId={screen.userId} />;
    case "global-search":
      return <GlobalSearchScreen />;
    case "new-group":
      return <NewGroupFlow />;
    case "my-groups":
      return <MyGroupsScreen />;
    case "new-story":
      return <NewStoryScreen />;
    case "live-code":
      return <LiveCodeScreen />;
    case "one-time-qr":
      return <OneTimeQrScreen />;
    case "introduce":
      return <IntroduceScreen toUserId={screen.toUserId} />;
    case "intro-detail":
      return <IntroDetailScreen introId={screen.introId} />;
    case "group-qr":
      return <GroupQrScreen chatId={screen.chatId} />;
    case "group-info":
      return <GroupInfoFull chatId={screen.chatId} />;
    case "group-invite":
      return <GroupInviteScreen token={screen.token} />;
    case "wgo-touch":
      return <WgoTouchScreen />;
    case "touch-incoming":
      return <TouchIncomingScreen />;
    case "pharmacy":
      return <PharmacyScreen pharmacyId={screen.pharmacyId} />;
    case "shop":
      return <ShopScreen shopId={screen.shopId} />;
    case "create-shop":
      return <CreateShopScreen />;
    case "lifestyle":
      return <LifestyleScreen itemId={screen.itemId} />;
    case "create-lifestyle":
      return <CreateLifestyleScreen />;
    case "create-listing":
      return <CreateListingScreen />;
    case "e2e-info":
      return <E2eInfoScreen chatId={screen.chatId} />;
    default:
      return <ChatsScreen />;
  }
}

export function AppShell() {
  const [introDone, setIntroDone] = useState(false);
  const stack = useWippStore((s) => s.stack);
  const raw = stack[stack.length - 1] ?? { name: "onboarding" as const };
  const top = raw.name === "splash" ? ({ name: "onboarding" } as const) : raw;
  const showTabs = isTabScreen(top.name);
  const { tablet, contentWidth } = useDeviceLayout();

  const onboarded = useWippStore((s) => s.onboarded);

  useEffect(() => {
    if (!introDone) return;
    const s = useWippStore.getState();
    const name = s.stack.at(-1)?.name;
    if (s.onboarded) {
      if (!name || AUTH.has(name)) s.goTab("chats");
    } else if (!s.stack.length || name === "splash") {
      s.replace({ name: "onboarding" });
    }
  }, [introDone]);

  useEffect(() => {
    if (!onboarded) return;
    void useWippStore.getState().ensureCrypto();
    void useWippStore.getState().syncServerInbox();
    let stop = () => {};
    void import("../lib/messaging/live-client").then(({ startMessageStream }) => {
      stop = startMessageStream((event) => {
        void useWippStore.getState().applyLiveEvent(event);
      });
    });
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active") {
        void useWippStore.getState().syncServerInbox();
      }
    });
    return () => {
      stop();
      sub.remove();
    };
  }, [onboarded]);

  if (!introDone) {
    return <IntroSplash onDone={() => setIntroDone(true)} />;
  }

  const webPreview = Platform.OS === "web";
  const frameWidth = webPreview ? Math.min(430, contentWidth || 430) : tablet ? contentWidth : "100%";

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: webPreview ? "#05070c" : "#070a0f",
        alignItems: tablet || webPreview ? "center" : "stretch",
      }}
    >
      <View
        style={{
          flex: 1,
          width: frameWidth,
          maxWidth: webPreview ? 430 : tablet ? contentWidth : undefined,
          overflow: "visible",
        }}
      >
        {Platform.OS === "web" ? null : <RecaptchaHost />}
        <ScreenSwitch screen={top} />
        {showTabs ? <TabBar active={top.name} /> : null}
      </View>
    </View>
  );
}
