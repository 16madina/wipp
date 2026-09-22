import { createFileRoute } from "@tanstack/react-router";
import { BootedApp } from "@/screens/boot";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <BootedApp />;
}
