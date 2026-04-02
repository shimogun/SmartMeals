import React, { useState, useEffect } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';
import { Link, Tabs, useRouter } from 'expo-router';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SettingsScreen from '../../components/SettingsScreen';

import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useThemeColors } from '../../hooks/useThemeColors';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

// 設定ボタンコンポーネント
function SettingsButton({ onPress, color }: { onPress: () => void; color: string }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ paddingRight: 15 }}
    >
      <Ionicons name="settings-outline" size={22} color={color} />
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const colors = useThemeColors();
  const [showSettings, setShowSettings] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const usersData = await AsyncStorage.getItem('users');
        if (!usersData) {
          router.replace('/onboarding' as any);
          return;
        }
        const users = JSON.parse(usersData);
        if (users.length === 0 || !users[0].onboardingCompleted) {
          router.replace('/onboarding' as any);
          return;
        }
        setIsReady(true);
      } catch {
        router.replace('/onboarding' as any);
      }
    };

    checkOnboarding();
  }, []);

  if (!isReady) {
    return null;
  }

  const handleSettingsPress = () => {
    setShowSettings(true);
  };

  return (
    <>
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: { backgroundColor: colors.tabBg, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '今日',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          headerRight: () => <SettingsButton onPress={handleSettingsPress} color="#fff" />,
          headerTitle: '今日',
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: '献立',
          tabBarIcon: ({ color }) => <TabBarIcon name="cutlery" color={color} />,
          headerRight: () => <SettingsButton onPress={handleSettingsPress} color="#fff" />,
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          href: null,
        }}
      />
    </Tabs>

    <SettingsScreen
      visible={showSettings}
      onClose={() => setShowSettings(false)}
    />
    </>
  );
}

const styles = StyleSheet.create({});
