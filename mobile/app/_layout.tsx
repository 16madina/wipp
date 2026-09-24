import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import {
  bindTouchNotificationResponses,
  startTouchReceiver,
} from '@/lib/touch-receiver';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  useEffect(() => {
    const unsub = bindTouchNotificationResponses();
    void startTouchReceiver().catch(() => undefined);
    return () => {
      unsub.remove();
    };
  }, []);

  if (!loaded) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0b1220' },
          headerTintColor: '#ffd84d',
          headerTitleStyle: { color: '#f9fafb' },
          contentStyle: { backgroundColor: '#070a0f' },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="touch" options={{ title: 'WIPP Touch' }} />
        <Stack.Screen name="t/[code]" options={{ title: 'Invitation WIPP' }} />
        <Stack.Screen name="admin" options={{ title: 'Admin' }} />
        <Stack.Screen name="chat/[id]" options={{ title: 'Conversation' }} />
      </Stack>
    </>
  );
}
