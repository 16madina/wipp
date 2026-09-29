/** Native vault ids stay local (`priv-`). No second backend. */
export function isPrivateChat(id: string) {
  return id.startsWith("priv-");
}
