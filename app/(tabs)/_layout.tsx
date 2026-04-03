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
  return <FontAwesome size={22} style={{ marginBottom: -2 }} {...props} />;
}

function SettingsButton({ onPress, color }: { onPress: () => void; color: string }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ paddingRight: 16 }}
    >
      <Ionicons name="settings-outline" size={21} color={color} />
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
        tabBarStyle: {
          backgroundColor: colors.tabBg,
          borderTopColor: colors.borderLight,
          borderTopWidth: 0.5,
          height: 56,
          paddingBottom: 6,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
        headerStyle: {
          backgroundColor: colors.surface,
          shadowColor: colors.cardShadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 4,
          elevation: 2,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontFamily: 'Nunito_900Black',
          fontSize: 28,
          color: colors.primary,
          letterSpacing: 0.5,
        },
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'ホーム',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          headerRight: () => <SettingsButton onPress={handleSettingsPress} color={colors.primary} />,
          headerTitle: 'SmartMeals',
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: '献立',
          tabBarIcon: ({ color }) => <TabBarIcon name="cutlery" color={color} />,
          headerRight: () => <SettingsButton onPress={handleSettingsPress} color={colors.primary} />,
          headerTitle: 'SmartMeals',
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
