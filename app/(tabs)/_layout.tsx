import React, { useState, useEffect } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';
import { Link, Tabs, useRouter } from 'expo-router';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SettingsScreen from '../../components/SettingsScreen';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

// 設定ボタンコンポーネント
function SettingsButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity 
      onPress={onPress}
      style={{ paddingRight: 15 }}
    >
      <Ionicons name="settings-outline" size={22} color="#fff" />
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
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
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
        // タブ間のスワイプナビゲーションを無効化
        swipeEnabled: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '今日',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          headerRight: () => <SettingsButton onPress={handleSettingsPress} />,
          headerTitle: '今日',
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: '献立',
          tabBarIcon: ({ color }) => <TabBarIcon name="cutlery" color={color} />,
          headerRight: () => <SettingsButton onPress={handleSettingsPress} />,
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
