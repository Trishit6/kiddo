import { Tabs } from 'expo-router';
import { KiddoTabBar } from '@/components/kiddo-tab-bar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <KiddoTabBar {...props} />}
      screenOptions={{ headerShown: false, lazy: true }}
    >
      <Tabs.Screen name="feed" options={{ title: 'Home' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="upload" options={{ title: 'Upload' }} />
      <Tabs.Screen name="inbox" options={{ title: 'Inbox' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
