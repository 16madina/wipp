/** Listing categories shown in the form and in Explorer (ids are stored on the listing). */
export const LISTING_CATEGORIES = [
  { id: "auto", label: "Véhicules" },
  { id: "realty", label: "Immobilier" },
  { id: "electronics", label: "Électronique" },
  { id: "fashion", label: "Mode" },
  { id: "home", label: "Maison & Jardin" },
  { id: "jobs", label: "Emploi & Services" },
  { id: "leisure", label: "Loisirs" },
  { id: "goods", label: "Autre" },
] as const;

const LEGACY: Record<string, string> = { services: "Services" };

export function listingCatLabel(id?: string) {
  return LISTING_CATEGORIES.find((c) => c.id === id)?.label ?? (id ? LEGACY[id] : undefined) ?? "Autre";
}
