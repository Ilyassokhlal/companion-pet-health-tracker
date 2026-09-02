import { useTranslation } from 'react-i18next';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTheme } from '@/theme/ThemeContext';
import { themeColors } from '@/theme/palette';

export default function TabsLayout() {
  const { t } = useTranslation();
  const { theme, accent } = useTheme();

  return (
    <NativeTabs tintColor={themeColors(theme, accent).primary} disableIndicator>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label>{t('nav.dashboard')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="records">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'list.bullet.rectangle', selected: 'list.bullet.rectangle.fill' }}
          md="assignment"
        />
        <NativeTabs.Trigger.Label>{t('nav.records')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="tracking">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'chart.line.uptrend.xyaxis', selected: 'chart.line.uptrend.xyaxis' }}
          md="trending_up"
        />
        <NativeTabs.Trigger.Label>{t('nav.tracking')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="photos">
        <NativeTabs.Trigger.Icon sf={{ default: 'photo', selected: 'photo.fill' }} md="photo_library" />
        <NativeTabs.Trigger.Label>{t('nav.photos')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="chat">
        <NativeTabs.Trigger.Icon sf={{ default: 'message', selected: 'message.fill' }} md="chat" />
        <NativeTabs.Trigger.Label>{t('nav.chat')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}