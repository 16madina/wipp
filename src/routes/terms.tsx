import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/terms")({
  component: () => <LegalPage id="terms" pill="Conditions" />,
  head: () => ({
    meta: [
      { title: "Conditions d’utilisation — WIPP" },
      { name: "description", content: "Conditions d’utilisation de l’application WIPP." },
    ],
  }),
});
