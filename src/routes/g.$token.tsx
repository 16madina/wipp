import { createFileRoute } from "@tanstack/react-router";
import { BootedApp } from "@/screens/boot";

export const Route = createFileRoute("/g/$token")({ component: GroupLinkPage });

function GroupLinkPage() {
  const { token } = Route.useParams();
  return <BootedApp pendingGroupToken={token} />;
}
