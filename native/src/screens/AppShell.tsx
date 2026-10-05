import { PharmaciesScreen } from "./pharmacies";
import { useShareIntentContext } from "expo-share-intent";
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
import { ShareInboxScreen } from "./share-inbox";
import { CreateLifestyleScreen, CreateListingScreen } from "./publish";
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
import { CallOverlay } from "../components/CallOverlay";
import { ActiveCallScreen, CallLinkScreen, CallsScreen } from "./calls";
import {
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
import { ScreenProtectionHost } from "../components/ScreenProtectionHost";
import { hydratePrivateVault } from "../lib/private-vault";
import { bootstrapPush, onSessionReady } from "../lib/push";
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
    case "share-inbox":
      return <ShareInboxScreen />;
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
      return <ActiveCallScreen userId={screen.userId} kind={screen.kind} dir={screen.dir} callId={screen.callId} chatId={screen.chatId} group={screen.group} />;
    case "call-link":
      return <CallLinkScreen />;
    case "connect":
      return <ConnectScreen />;
    case "my-qr":
      return <MyQrScreen />;
    case "scanner":
      return <ScannerScreen error={screen.error} />;
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
    case "pharmacies":
      return <PharmaciesScreen />;
    case "shop":
      return <ShopScreen shopId={screen.shopId} />;
    case "create-shop":
      return <CreateShopScreen />;
    case "lifestyle":
      return <LifestyleScreen itemId={screen.itemId} />;
    case "create-lifestyle":
      return <CreateLifestyleScreen eventId={screen.eventId} />;
    case "create-listing":
      return <CreateListingScreen listingId={screen.listingId} />;
    case "e2e-info":
      return <E2eInfoScreen chatId={screen.chatId} />;
    default:
      return <ChatsScreen />;
  }
}

export function AppShell() {
  const [introDone, setIntroDone] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(false);
  const stack = useWippStore((s) => s.stack);
  const raw = stack[stack.length - 1] ?? { name: "onboarding" as const };
  const signupMode = useWippStore((s) => s.pendingSignup.mode);
  const holdSignup =
    raw.name === "phone-entry" ||
    raw.name === "profile-reference" ||
    raw.name === "signup-celebration" ||
    raw.name === "signup" ||
    raw.name === "setup" ||
    (raw.name === "sms-reference" && signupMode !== "signin");
  const signedInScreen = firebaseUser && !holdSignup && (raw.name === "splash" || AUTH.has(raw.name));
  const top = signedInScreen ? ({ name: "chats" } as const) : raw.name === "splash" ? ({ name: "onboarding" } as const) : raw;
  const showTabs = isTabScreen(top.name);
  const { tablet, contentWidth } = useDeviceLayout();

  const onboarded = useWippStore((s) => s.onboarded);
  const { hasShareIntent } = useShareIntentContext();

  useEffect(() => {
    let stop = () => {};
    let cancelled = false;
    void (async () => {
      const { watchFirebaseUser } = await import("../lib/firebase-phone");
      const { signinOtp } = await import("../lib/auth-api");
      const { pendingMode } = await import("../lib/auth-flow");
      const { enterLinkedProfile, refreshLinkedProfile, restoreFirebaseSession } = await import("../lib/enter-session");
      const { readLinkedSession } = await import("../lib/firebase-linked-session");
      stop = watchFirebaseUser((user) => {
        if (cancelled) return;
        const creating = pendingMode() === "signup" || useWippStore.getState().pendingSignup.mode === "signup";
        if (!user || creating) {
          setFirebaseUser(false);
          setAuthReady(true);
          return;
        }
        void (async () => {
          const phone = user.phoneNumber ?? "";
          const cached = await readLinkedSession(user.uid);
          if (cancelled) return;
          if (cached?.username) {
            restoreFirebaseSession(cached, phone);
            setFirebaseUser(true);
            setAuthReady(true);
            try {
              const res = await signinOtp();
              if (cancelled || !res.ok) return;
              // Same account as the cached one: keep the inbox and photo already shown.
              refreshLinkedProfile(res.profile, phone);
            } catch {
              /* Firebase keeps the user. A network miss must not sign them out or request an SMS. */
            }
            return;
          }
          // No WIPP profile linked on this device: ask the server before opening the app,
          // so a number without an account stays on the auth screens instead of the demo inbox.
          try {
            const res = await signinOtp();
            if (cancelled) return;
            if (res.ok) {
              enterLinkedProfile(res.profile, phone);
              setFirebaseUser(true);
              setAuthReady(true);
              return;
            }
          } catch {
            /* Offline with nothing linked yet: stay on the auth screens. */
          }
          if (cancelled) return;
          setFirebaseUser(false);
          setAuthReady(true);
        })();
      });
    })();
    void hydratePrivateVault();
    // Keep the encrypted inbox snapshot fresh as messages arrive (debounced in the store).
    const offSnapshot = useWippStore.subscribe((st, prev) => {
      if (st.serverConnected && (st.messages !== prev.messages || st.chats !== prev.chats)) {
        void import("../lib/store").then(({ scheduleInboxSave }) => scheduleInboxSave(useWippStore.getState));
      }
    });
    void import("../lib/push/prefs").then(async ({ loadNotifPrefs }) => {
      const prefs = await loadNotifPrefs();
      useWippStore.setState({ notifs: prefs.notifs, pushMaster: prefs.pushMaster });
    });
    const stopPush = bootstrapPush();
    return () => {
      offSnapshot();
      cancelled = true;
      stop();
      stopPush();
    };
  }, []);

  useEffect(() => {
    if (!introDone || !authReady) return;
    const s = useWippStore.getState();
    const name = s.stack.at(-1)?.name;
    if (firebaseUser || s.onboarded) {
      if (!name || name === "splash" || AUTH.has(name)) s.goTab("chats");
    } else if (!s.stack.length || name === "splash") {
      s.replace({ name: "onboarding" });
    }
  }, [introDone, authReady, firebaseUser]);

  useEffect(() => {
    if (!onboarded) return;
    void useWippStore.getState().ensureCrypto();
    void useWippStore.getState().syncServerInbox();
    void onSessionReady();
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
    // Contacts' new profile photos and names show up within ~2 minutes while WIPP is open.
    const refresh = setInterval(() => {
      if (AppState.currentState === "active") void useWippStore.getState().syncServerInbox();
    }, 120_000);
    // Long-press on the WIPP icon → "WIPP Touch" opens the Touch screen directly.
    let offQuick = () => {};
    void import("expo-quick-actions")
      .then((QA) => {
        const open = (a?: { id?: string } | null) => {
          if (a?.id !== "wipp-touch") return;
          if (useWippStore.getState().stack.at(-1)?.name !== "wgo-touch") useWippStore.getState().push({ name: "wgo-touch" });
        };
        if (Platform.OS === "android") {
          void QA.setItems([{ id: "wipp-touch", title: "WIPP Touch", subtitle: "Rapprochez vos téléphones", params: { screen: "wgo-touch" } }]).catch(() => undefined);
        }
        open(QA.initial);
        const sub = QA.addListener(open);
        offQuick = () => sub.remove();
      })
      .catch(() => undefined);
    let unbind = () => {};
    let offMatch = () => {};
    void import("../lib/proximity/lifecycle").then(({ bindProximityLifecycle, syncProximityLifecycle }) => {
      unbind = bindProximityLifecycle();
      void syncProximityLifecycle(useWippStore.getState().stack.at(-1)?.name ?? "chats");
    });
    void import("../lib/proximity/touch-receiver").then(({ onTouchReceiverMatch }) => {
      offMatch = onTouchReceiverMatch(() => {
        const name = useWippStore.getState().stack.at(-1)?.name;
        if (name !== "wgo-touch" && name !== "touch-incoming") {
          useWippStore.getState().push({ name: "touch-incoming" });
        }
      });
    });
    return () => {
      stop();
      sub.remove();
      clearInterval(refresh);
      unbind();
      offQuick();
      offMatch();
    };
  }, [onboarded]);

  useEffect(() => {
    if (!onboarded) return;
    void import("../lib/proximity/lifecycle").then(({ syncProximityLifecycle }) => {
      void syncProximityLifecycle(top.name);
    });
  }, [onboarded, top.name]);

  useEffect(() => {
    if (!authReady || !firebaseUser || !hasShareIntent) return;
    const current = useWippStore.getState().stack.at(-1)?.name;
    if (current === "share-inbox") return;
    useWippStore.getState().push({ name: "share-inbox" });
  }, [authReady, firebaseUser, hasShareIntent, top.name]);

  if (!introDone || !authReady) {
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
        {Platform.OS === "web" ? <View nativeID="wipp-recaptcha" /> : <RecaptchaHost />}
        <ScreenProtectionHost>
          <ScreenSwitch screen={top} />
          {showTabs ? <TabBar active={top.name} /> : null}
          <CallOverlay />
        </ScreenProtectionHost>
      </View>
    </View>
  );
}
