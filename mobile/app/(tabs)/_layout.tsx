import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import Colors from '@/constants/Colors';

function TabIcon(props: { name: React.ComponentProps<typeof FontAwesome>['name']; color: string }) {
  return <FontAwesome size={22} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: Colors.dark.background },
        headerTintColor: Colors.dark.text,
        tabBarStyle: {
          backgroundColor: '#121722',
          borderTopColor: Colors.dark.hair,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: Colors.dark.accent,
        tabBarInactiveTintColor: Colors.dark.tabIconDefault,
        headerShadowVisible: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color }) => <TabIcon name="comments" color={color} />,
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          title: 'Appels',
          tabBarIcon: ({ color }) => <TabIcon name="phone" color={color} />,
        }}
      />
      <Tabs.Screen
        name="connect"
        options={{
          title: 'WIPP',
          tabBarIcon: ({ color }) => <TabIcon name="qrcode" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explorer',
          tabBarIcon: ({ color }) => <TabIcon name="compass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'Moi',
          tabBarIcon: ({ color }) => <TabIcon name="user" color={color} />,
        }}
      />
      <Tabs.Screen name="two" options={{ href: null }} />
    </Tabs>
  );
}
