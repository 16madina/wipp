import { tr } from "./tr";
/** Listing categories shown in the form and in Explorer (ids are stored on the listing). */
export const LISTING_CATEGORIES = [
  { id: "auto", get label() { return tr("Véhicules"); } },
  { id: "realty", get label() { return tr("Immobilier"); } },
  { id: "electronics", get label() { return tr("Électronique"); } },
  { id: "fashion", get label() { return tr("Mode"); } },
  { id: "home", get label() { return tr("Maison & Jardin"); } },
  { id: "jobs", get label() { return tr("Emploi & Services"); } },
  { id: "leisure", get label() { return tr("Loisirs"); } },
  { id: "goods", get label() { return tr("Autre"); } },
] as const;

const LEGACY: Record<string, string> = { get services() { return tr("Services"); } };

export function listingCatLabel(id?: string) {
  return LISTING_CATEGORIES.find((c) => c.id === id)?.label ?? (id ? LEGACY[id] : undefined) ?? tr("Autre");
}
