/**
 * In-app purchases for WIPP Studio (Apple / Google, through RevenueCat).
 * Only the public SDK key is here; the server checks every purchase with its secret key before generating.
 */
import { Platform } from "react-native";

/** Public RevenueCat SDK keys (safe in the app). Empty = purchases not set up on this platform yet. */
const KEYS = { ios: "appl_XOXhlRSfiqjvMRRAbMnLhsMciQb", android: "goog_iaMeuVwkZBBqqqPrywRNkYHbUlM" };

export const STUDIO_PRODUCTS = {
  moji: { 5: "com.wipp.studio.moji5", 10: "com.wipp.studio.moji10" } as Record<number, string>,
  pop: { 3: "com.wipp.studio.pop3", 7: "com.wipp.studio.wipppop7" } as Record<number, string>,
};

type RC = typeof import("react-native-purchases").default;
let rc: RC | null = null;
let configuredFor: string | null = null;

function apiKey() {
  return Platform.OS === "ios" ? KEYS.ios : Platform.OS === "android" ? KEYS.android : "";
}

export function purchasesAvailable() {
  return Boolean(apiKey());
}

/** Sets RevenueCat up for this WIPP user (same id as on the server, so the server can find the purchase). */
async function ready(buyerId: string) {
  const key = apiKey();
  if (!key) throw new Error("purchases_unavailable");
  if (!rc) rc = (await import("react-native-purchases")).default;
  if (!configuredFor) {
    rc.configure({ apiKey: key, appUserID: buyerId });
    configuredFor = buyerId;
  } else if (configuredFor !== buyerId) {
    await rc.logIn(buyerId);
    configuredFor = buyerId;
  }
  return rc;
}

/** Store prices in the customer's currency, by product id. Empty when unavailable. */
export async function studioPrices(buyerId: string): Promise<Record<string, string>> {
  try {
    const p = await ready(buyerId);
    const ids = [...Object.values(STUDIO_PRODUCTS.moji), ...Object.values(STUDIO_PRODUCTS.pop)];
    const products = await p.getProducts(ids, p.PURCHASE_TYPE.INAPP);
    return Object.fromEntries(products.map((x) => [x.identifier, x.priceString]));
  } catch {
    return {};
  }
}

export type PurchaseResult = { productId: string; transactionId: string } | { cancelled: true };

/** Opens the Apple / Google payment sheet. */
export async function buyStudioPack(buyerId: string, productId: string): Promise<PurchaseResult> {
  const p = await ready(buyerId);
  const [product] = await p.getProducts([productId], p.PURCHASE_TYPE.INAPP);
  if (!product) throw new Error("product_unavailable");
  try {
    const { transaction } = await p.purchaseStoreProduct(product);
    return { productId, transactionId: transaction.transactionIdentifier };
  } catch (err) {
    if ((err as { userCancelled?: boolean })?.userCancelled) return { cancelled: true };
    throw err;
  }
}
