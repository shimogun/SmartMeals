import React, { useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';
import { Link, Tabs } from 'expo-router';
import { Pressable, TouchableOpacity, Alert, View, StyleSheet } from 'react-native';
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

// +ボタン用のカスタムアイコン
function PlusButtonIcon({ focused }: { focused: boolean }) {
  return (
    <View style={styles.plusButtonContainer}>
      <View style={styles.plusButton}>
        <Ionicons name="add" size={32} color="#fff" />
      </View>
    </View>
  );
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
          title: 'ユーザー',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
          headerRight: () => <SettingsButton onPress={handleSettingsPress} />,
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => <PlusButtonIcon focused={focused} />,
          headerRight: () => <SettingsButton onPress={handleSettingsPress} />,
          headerTitle: '記録',
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
    </Tabs>

    <SettingsScreen
      visible={showSettings}
      onClose={() => setShowSettings(false)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  plusButtonContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    top: -15,
  },
  plusButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
