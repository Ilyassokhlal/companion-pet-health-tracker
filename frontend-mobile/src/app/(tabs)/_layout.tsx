import { Tabs } from 'expo-router';
import { View } from 'react-native';

import PatternBackground from '@/components/PatternBackground';
import TabBar from '@/components/TabBar';

// Custom tab bar layout with a patterned background. The pattern is rendered behind the tab screens. The tab bar itself is rendered on top of the pattern.
export default function TabsLayout() {
  return (
    <View className="flex-1 bg-ink">
      <PatternBackground />
      <Tabs
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
        tabBar={(props) => <TabBar {...props} />}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="records" />
        <Tabs.Screen name="tracking" />
        <Tabs.Screen name="photos" />
        <Tabs.Screen name="chat" />
      </Tabs>
    </View>
  );
}