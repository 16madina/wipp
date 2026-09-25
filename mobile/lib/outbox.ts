import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'wipp-outbox-v1';

export type NativeOutboxItem = {
  chatId: string;
  clientId: string;
  text: string;
  replyId?: string;
  replyPreview?: string;
  forwarded?: boolean;
  vault?: boolean;
};

async function read(): Promise<NativeOutboxItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as NativeOutboxItem[]) : [];
  } catch {
    return [];
  }
}

async function write(items: NativeOutboxItem[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

export async function enqueueOutbox(item: NativeOutboxItem) {
  const items = (await read()).filter((x) => x.clientId !== item.clientId);
  items.push(item);
  await write(items);
}

export async function dropOutbox(clientId: string) {
  await write((await read()).filter((x) => x.clientId !== clientId));
}

export async function listOutbox() {
  return read();
}
