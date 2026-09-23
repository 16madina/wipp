import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { AppLockGate } from "@/components/safety";
import { PhoneShell } from "@/components/phone-shell";
import { TabBar } from "@/components/tab-bar";
import { isTabScreen, useWgoStore } from "@/lib/store";
import type { Screen } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  LoginScreen,
  OnboardingScreen,
  OtpScreen,
  SetupScreen,
  SignupScreen,
  SplashScreen,
} from "./auth";
import {
  ChatsScreen,
  GlobalSearchScreen,
  MyGroupsScreen,
  NewChatScreen,
  NewGroupScreen,
  RequestsScreen,
} from "./chats";
import {
  ConnectScreen,
  FoundProfileScreen,
  MyQrScreen,
  NearbyScreen,
  ScannerScreen,
  SearchUserScreen,
} from "./connect";
import { ConversationScreen } from "./conversation";
import {
  AccountScreen,
  AccessibilityScreen,
  AppearanceScreen,
  BlockedScreen,
  DeleteAccountScreen,
  HelpScreen,
  MeScreen,
  MyActivityScreen,
  NotificationsScreen,
  PrivacyScreen,
  SecurityScreen,
} from "./me";
import { LegalScreen } from "./legal";

const loadCalls = () => import("./calls");
const loadExplore = () => import("./explore");
const loadStories = () => import("./stories");
const loadTrust = () => import("./trust");
const loadE2e = () => import("./e2e");
const loadTouch = () => import("./touch");

const CallsScreen = lazy(() => loadCalls().then((m) => ({ default: m.CallsScreen })));
const ActiveCallScreen = lazy(() => loadCalls().then((m) => ({ default: m.ActiveCallScreen })));
const CallLinkScreen = lazy(() => loadCalls().then((m) => ({ default: m.CallLinkScreen })));
const CallLayer = lazy(() => loadCalls().then((m) => ({ default: m.CallLayer })));

const ExploreScreen = lazy(() => loadExplore().then((m) => ({ default: m.ExploreScreen })));
const ListingScreen = lazy(() => loadExplore().then((m) => ({ default: m.ListingScreen })));
const PharmacyScreen = lazy(() => loadExplore().then((m) => ({ default: m.PharmacyScreen })));
const ShopScreen = lazy(() => loadExplore().then((m) => ({ default: m.ShopScreen })));
const CreateShopScreen = lazy(() => loadExplore().then((m) => ({ default: m.CreateShopScreen })));
const LifestyleScreen = lazy(() => loadExplore().then((m) => ({ default: m.LifestyleScreen })));
const CreateLifestyleScreen = lazy(() =>
  loadExplore().then((m) => ({ default: m.CreateLifestyleScreen })),
);

const StoriesScreen = lazy(() => loadStories().then((m) => ({ default: m.StoriesScreen })));
const NewStoryScreen = lazy(() => loadStories().then((m) => ({ default: m.NewStoryScreen })));

const LiveCodeScreen = lazy(() => loadTrust().then((m) => ({ default: m.LiveCodeScreen })));
const OneTimeQrScreen = lazy(() => loadTrust().then((m) => ({ default: m.OneTimeQrScreen })));
const IntroduceScreen = lazy(() => loadTrust().then((m) => ({ default: m.IntroduceScreen })));
const IntroDetailScreen = lazy(() => loadTrust().then((m) => ({ default: m.IntroDetailScreen })));
const GroupQrScreen = lazy(() => loadTrust().then((m) => ({ default: m.GroupQrScreen })));
const GroupInfoScreen = lazy(() => loadTrust().then((m) => ({ default: m.GroupInfoScreen })));
const GroupInviteScreen = lazy(() => loadTrust().then((m) => ({ default: m.GroupInviteScreen })));

const E2eInfoScreen = lazy(() => loadE2e().then((m) => ({ default: m.E2eInfoScreen })));
const WgoTouchScreen = lazy(() => loadTouch().then((m) => ({ default: m.WgoTouchScreen })));

function prefetchTabs() {
  void loadCalls();
  void loadExplore();
  void loadStories();
  void loadTrust();
}

function layerKey(screen: Screen, index: number) {
  switch (screen.name) {
    case "conversation":
    case "group-qr":
    case "group-info":
    case "e2e-info":
      return `${screen.name}:${screen.chatId}:${index}`;
    case "group-invite":
      return `${screen.name}:${screen.token}:${index}`;
    case "found-profile":
    case "stories":
      return `${screen.name}:${screen.userId}:${index}`;
    case "active-call":
      return `${screen.name}:${screen.userId}:${screen.kind}:${screen.dir ?? "out"}:${index}`;
    case "listing":
      return `listing:${screen.listingId}`;
    case "pharmacy":
      return `pharmacy:${screen.pharmacyId}`;
    case "shop":
      return `shop:${screen.shopId}`;
    case "lifestyle":
      return `lifestyle:${screen.itemId}`;
    case "my-activity":
      return `activity:${screen.kind}:${index}`;
    case "introduce":
      return `introduce:${screen.toUserId}`;
    case "intro-detail":
      return `intro:${screen.introId}`;
    default:
      return `${screen.name}:${index}`;
  }
}

function ScreenFallback() {
  return <div className="h-full bg-bg" />;
}

function ScreenView({ screen }: { screen: Screen }) {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <ScreenSwitch screen={screen} />
    </Suspense>
  );
}

function ScreenSwitch({ screen }: { screen: Screen }) {
  switch (screen.name) {
    case "splash":
      return <SplashScreen />;
    case "onboarding":
      return <OnboardingScreen />;
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
    case "account":
      return <AccountScreen />;
    case "security":
      return <SecurityScreen />;
    case "notifications":
      return <NotificationsScreen />;
    case "appearance":
      return <AppearanceScreen />;
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
      return <NewGroupScreen />;
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
      return <GroupInfoScreen chatId={screen.chatId} />;
    case "group-invite":
      return <GroupInviteScreen token={screen.token} />;
    case "wgo-touch":
      return <WgoTouchScreen />;
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
    case "e2e-info":
      return <E2eInfoScreen chatId={screen.chatId} />;
    default:
      return <ChatsScreen />;
  }
}

function PushLayer({
  screen,
  index,
  exiting,
}: {
  screen: Screen;
  index: number;
  exiting: boolean;
}) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={cn(
        "stack-layer",
        entered && !exiting && "is-in",
        exiting && "is-out",
      )}
    >
      <ScreenView screen={screen} />
    </div>
  );
}

function NativeStack() {
  const stack = useWgoStore((s) => s.stack);
  const top = stack.at(-1) ?? { name: "splash" as const };
  const showTabs = isTabScreen(top.name);
  const root = stack[0] ?? { name: "splash" as const };
  const livePushed = stack.slice(1);

  const stackLen = stack.length;
  const [exitScreen, setExitScreen] = useState<Screen | null>(null);
  const prevPushed = useRef(livePushed);

  useEffect(() => {
    const current = stack.slice(1);
    const prev = prevPushed.current;
    if (current.length < prev.length) {
      setExitScreen(prev[prev.length - 1] ?? null);
      const t = window.setTimeout(() => {
        setExitScreen(null);
        prevPushed.current = current;
      }, 320);
      return () => window.clearTimeout(t);
    }
    prevPushed.current = current;
    setExitScreen(null);
  }, [stack, stackLen]);

  const displayPushed = exitScreen ? [...livePushed, exitScreen] : livePushed;
  const pushedIn = livePushed.length > 0;

  return (
    <div className="relative h-full min-h-0">
      <div className="h-full overflow-hidden">
        <div className={cn("stack-root", pushedIn && "is-pushed")}>
          <ScreenView screen={root} />
        </div>
        {displayPushed.map((screen, i) => (
          <PushLayer
            key={layerKey(screen, i)}
            screen={screen}
            index={i}
            exiting={Boolean(exitScreen) && i === displayPushed.length - 1}
          />
        ))}
      </div>
      {showTabs ? (
        <div className="pointer-events-none absolute inset-0 z-20">
          <TabBar active={top.name} />
        </div>
      ) : null}
    </div>
  );
}

export function WgoApp() {
  const liveCall = useWgoStore((s) => s.liveCall);
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 500));
    const id = idle(() => prefetchTabs());
    return () => {
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(id as number);
      else window.clearTimeout(id as number);
    };
  }, []);

  return (
    <PhoneShell>
      <div className="relative h-full min-h-0">
        <NativeStack />
        {liveCall ? (
          <Suspense fallback={null}>
            <CallLayer />
          </Suspense>
        ) : null}
        <AppLockGate />
      </div>
    </PhoneShell>
  );
}
