import { supabase } from "./supabase";
import { myProfileId } from "./lot7/api";

export const REPORT_REASONS = [
  "Contenu inapproprié",
  "Harcèlement",
  "Spam ou arnaque",
  "Nudité / contenu sexuel",
  "Violence",
  "Usurpation / faux profil",
  "Autre",
] as const;

export type ReportContentType = "story" | "listing" | "profile" | "message" | "business_card";

/**
 * Metadata only. Encrypted message bodies are not copied here.
 * The table is created by migrations/0023_wipp_product_completion.sql.
 */
export async function submitContentReport(input: {
  contentType: ReportContentType;
  contentId: string;
  targetProfileId?: string | null;
  reason: string;
}) {
  const reporter = await myProfileId();
  const target = input.targetProfileId?.replace(/^srvuser:/, "") || null;
  const id = `rpt_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const { error } = await supabase.from("wipp_content_reports").insert({
    id,
    reporter_id: reporter,
    target_profile_id: target,
    content_type: input.contentType,
    content_id: input.contentId.slice(0, 120),
    reason: input.reason.slice(0, 80),
  });
  if (error) {
    throw new Error("Le signalement n’est pas encore disponible. La mise à jour du serveur doit être appliquée.");
  }
}
