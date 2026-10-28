/**
 * Checks an in-app purchase with RevenueCat before any paid generation.
 * The secret key (REVENUECAT_SECRET_KEY) lives only in the server environment.
 */
import { getSql } from "@/lib/db";
import { WippHttpError } from "@/lib/messaging/server";

/** Store product → what it unlocks. */
export const WIPPMOJI_PRODUCTS: Record<string, { pop: boolean; size: number }> = {
  "com.wipp.studio.moji5": { pop: false, size: 5 },
  "com.wipp.studio.moji10": { pop: false, size: 10 },
  "com.wipp.studio.pop3": { pop: true, size: 3 },
  "com.wipp.studio.wipppop7": { pop: true, size: 7 },
};

export type PurchaseProof = { productId?: string; transactionId?: string };

type RcPurchase = { id?: string; store_transaction_id?: string; store?: string; is_sandbox?: boolean };

/** Asks RevenueCat whether this user really bought this product in this transaction. */
async function findInRevenueCat(profileId: string, productId: string, transactionId: string) {
  const key = process.env.REVENUECAT_SECRET_KEY;
  if (!key) throw new WippHttpError(503, "payments_unavailable", "Paiement indisponible pour le moment.");
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(profileId)}`, {
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new WippHttpError(502, "payment_check_failed", "Impossible de vérifier l’achat. Réessaie.");
  const json = (await res.json()) as { subscriber?: { non_subscriptions?: Record<string, RcPurchase[]> } };
  const list = json.subscriber?.non_subscriptions?.[productId] ?? [];
  return list.find((p) => p.store_transaction_id === transactionId || p.id === transactionId) ?? null;
}

/**
 * Verifies the purchase matches the pack asked for and was never used, then records it.
 * Returns the transaction id, to link it to the pack once created.
 */
export async function claimPurchase(profileId: string, proof: PurchaseProof, want: { pop: boolean; size: number }) {
  const productId = proof.productId ?? "";
  const transactionId = proof.transactionId ?? "";
  const product = WIPPMOJI_PRODUCTS[productId];
  if (!product || !transactionId) throw new WippHttpError(400, "bad_purchase", "Achat invalide.");
  if (product.pop !== want.pop || product.size !== want.size) throw new WippHttpError(400, "wrong_purchase", "Cet achat ne correspond pas à ce pack.");
  const found = await findInRevenueCat(profileId, productId, transactionId);
  if (!found) throw new WippHttpError(402, "purchase_not_found", "Achat introuvable. S’il a été débité, il sera vérifié dans quelques instants.");
  const sql = await getSql();
  const rows = await sql<{ transaction_id: string }>`
    insert into wippmoji_purchases (transaction_id, profile_id, product_id, store)
    values (${transactionId}, ${profileId}, ${productId}, ${found.store ?? null})
    on conflict (transaction_id) do nothing returning transaction_id`;
  if (!rows[0]) {
    // Already recorded: allowed again only if no pack was made with it (e.g. the first try failed).
    const prev = await sql<{ pack_id: string | null; profile_id: string }>`select pack_id, profile_id from wippmoji_purchases where transaction_id = ${transactionId} limit 1`;
    if (prev[0]?.profile_id !== profileId || prev[0]?.pack_id) throw new WippHttpError(409, "purchase_used", "Cet achat a déjà été utilisé.");
  }
  return transactionId;
}

export async function linkPurchase(transactionId: string, packId: string) {
  const sql = await getSql();
  await sql`update wippmoji_purchases set pack_id = ${packId} where transaction_id = ${transactionId}`;
}
