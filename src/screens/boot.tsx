import { lazy, Suspense, useEffect, useState } from "react";
import { PhoneShell } from "@/components/phone-shell";
import { withGroupMeta } from "@/lib/seed";
import { useWgoStore } from "@/lib/store";

const AUTH = new Set(["splash", "onboarding", "signup", "login", "otp", "setup"]);

const WgoApp = lazy(() => import("./app").then((m) => ({ default: m.WgoApp })));

export function BootedApp({ pendingGroupToken }: { pendingGroupToken?: string }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void Promise.resolve(useWgoStore.persist.rehydrate()).then(() => {
      const s = useWgoStore.getState();
      useWgoStore.setState({ chats: withGroupMeta(s.chats) });
      if (s.onboarded) {
        const top = s.stack.at(-1)?.name;
        if (!top || AUTH.has(top)) {
          useWgoStore.setState({ stack: [{ name: "chats" }] });
        }
      } else {
        useWgoStore.setState({ stack: [{ name: "signup" }] });
      }
      if (pendingGroupToken) {
        if (!useWgoStore.getState().onboarded) {
          useWgoStore.getState().openDemo();
        }
        useWgoStore.getState().openGroupInvite(pendingGroupToken);
      }
      setReady(true);
      void useWgoStore.getState().ensureCrypto();
    });
  }, [pendingGroupToken]);

  useEffect(() => {
    void import("./app");
  }, []);

  if (!ready) {
    return (
      <PhoneShell intro>
        <div className="h-full w-full" style={{ background: "#02081e" }} />
      </PhoneShell>
    );
  }

  return (
    <Suspense
      fallback={
        <PhoneShell>
          <div className="h-full bg-bg" />
        </PhoneShell>
      }
    >
      <WgoApp />
    </Suspense>
  );
}
