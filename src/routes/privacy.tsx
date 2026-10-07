import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/privacy")({
  component: () => <LegalPage id="privacy" pill="Confidentialité" />,
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — WIPP" },
      { name: "description", content: "Politique de confidentialité de l’application WIPP." },
    ],
  }),
});
