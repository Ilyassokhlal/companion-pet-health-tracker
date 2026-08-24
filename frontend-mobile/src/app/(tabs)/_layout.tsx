import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTheme } from '@/theme/ThemeContext';
import { themeColors } from '@/theme/palette';

export default function TabsLayout() {
  const { theme, accent } = useTheme();

  return (
    <NativeTabs tintColor={themeColors(theme, accent).primary} disableIndicator>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="records">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'list.bullet.rectangle', selected: 'list.bullet.rectangle.fill' }}
          md="assignment"
        />
        <NativeTabs.Trigger.Label>Records</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="photos">
        <NativeTabs.Trigger.Icon sf={{ default: 'photo', selected: 'photo.fill' }} md="photo_library" />
        <NativeTabs.Trigger.Label>Photos</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="chat">
        <NativeTabs.Trigger.Icon sf={{ default: 'message', selected: 'message.fill' }} md="chat" />
        <NativeTabs.Trigger.Label>Chat</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md="settings" />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}