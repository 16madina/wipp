import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'wipp-read-receipts-v1';

export async function readReceiptsEnabled() {
  return (await AsyncStorage.getItem(KEY)) !== '0';
}

export async function setReadReceiptsEnabled(on: boolean) {
  await AsyncStorage.setItem(KEY, on ? '1' : '0');
}
