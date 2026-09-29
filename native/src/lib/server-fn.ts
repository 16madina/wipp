import { fromCrossJSON, toJSONAsync, type SerovalNode } from "seroval";
import { WIPP_WEB_ORIGIN } from "./firebase-config";
import { supabase } from "./supabase";

export async function callServerFn<T>(id: string, data: unknown): Promise<T> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  const body = JSON.stringify(await toJSONAsync({ data }));
  let res: Response;
  try {
    res = await fetch(`${WIPP_WEB_ORIGIN}/_serverFn/${id}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "x-tsr-serverFn": "true",
        Origin: WIPP_WEB_ORIGIN,
        Referer: `${WIPP_WEB_ORIGIN}/`,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body,
    });
  } catch {
    throw new Error("Réseau indisponible. Vérifie ta connexion.");
  }
  const text = await res.text();
  if (res.status === 403) {
    throw new Error("Connexion au serveur WIPP refusée. Réessaie dans un instant.");
  }
  if (!text) {
    throw new Error("Réponse vide du serveur WIPP.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error(res.ok ? "Réponse serveur illisible." : `Erreur serveur (${res.status}).`);
  }
  const serialized = res.headers.get("x-tss-serialized") === "true";
  const value = serialized ? fromCrossJSON(parsed as SerovalNode, { plugins: [] }) : parsed;
  return unwrapServerFn<T>(value, res.ok, res.status);
}

function unwrapServerFn<T>(value: unknown, ok: boolean, status: number): T {
  if (value && typeof value === "object" && ("result" in value || "error" in value)) {
    const env = value as { result?: T; error?: unknown };
    if (env.error != null && env.result === undefined) {
      const err = env.error;
      throw new Error(
        err instanceof Error ? err.message : typeof err === "string" ? err : `Erreur serveur (${status}).`,
      );
    }
    if (!ok) {
      const inner = env.result;
      const message =
        inner && typeof inner === "object" && "error" in inner && typeof (inner as { error: unknown }).error === "string"
          ? (inner as { error: string }).error
          : `Erreur serveur (${status}).`;
      throw new Error(message);
    }
    return env.result as T;
  }
  if (!ok) {
    const message =
      value && typeof value === "object" && "error" in value && typeof (value as { error: unknown }).error === "string"
        ? (value as { error: string }).error
        : `Erreur serveur (${status}).`;
    throw new Error(message);
  }
  return value as T;
}
