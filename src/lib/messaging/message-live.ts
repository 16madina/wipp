export type LiveEvent = {
  id: string;
  chatId: string;
  kind: "message" | "edit" | "delete" | "reaction" | "pin" | "receipt" | "typing";
  at: number;
  payload: Record<string, unknown>;
};
