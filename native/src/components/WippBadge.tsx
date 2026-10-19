import { tr } from "../lib/tr";
import { BadgeCheck } from "lucide-react-native";

/** Blue = Ambassadeur (3 amis invités) ; gold = certifié par WIPP. Nothing for everyone else. */
export function WippBadge({ badge, size = 16 }: { badge?: "blue" | "gold" | null; size?: number }) {
  if (badge !== "blue" && badge !== "gold") return null;
  return (
    <BadgeCheck
      size={size}
      color="#ffffff"
      fill={badge === "gold" ? "#d4a017" : "#1d9bf0"}
      accessibilityLabel={badge === "gold" ? tr("Certifié par WIPP") : tr("Ambassadeur WIPP")}
    />
  );
}
