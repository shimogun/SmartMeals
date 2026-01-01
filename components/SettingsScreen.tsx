import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsScreenProps {
  visible: boolean;
  onClose: () => void;
}

type SettingsData = {
  notifications: boolean;
  darkMode: boolean;
  dataBackup: boolean;
  autoGeneration: boolean;
  showCalories: boolean;
  strictMode: boolean;
  analytics: boolean;
};

const defaultSettings: SettingsData = {
  notifications: true,
  darkMode: false,
  dataBackup: true,
  autoGeneration: false,
  showCalories: true,
  strictMode: false,
  analytics: true,
};

export default function SettingsScreen({ visible, onClose }: SettingsScreenProps) {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem('app_settings');
      if (stored) {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      }
    } catch (error) {
      console.error('設定読み込みエラー:', error);
    }
  };

  const saveSettings = async (newSettings: SettingsData) => {
    try {
      await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('設定保存エラー:', error);
      Alert.alert('エラー', '設定の保存に失敗しました');
    }
  };

  const toggleSetting = (key: keyof SettingsData) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    saveSettings(newSettings);
  };

  const handleDataExport = () => {
    Alert.alert(
      'データエクスポート',
      'データのエクスポート機能は今後のアップデートで対応予定です。',
      [{ text: 'OK' }]
    );
  };

  const handleDataClear = () => {
    Alert.alert(
      'データを削除',
      'すべてのデータが削除されます。この操作は取り消せません。本当に削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['glucose_records', 'weekly_records', 'users']);
              Alert.alert('完了', 'データを削除しました。アプリを再起動してください。');
            } catch (error) {
              Alert.alert('エラー', 'データの削除に失敗しました');
            }
          },
        },
      ]
    );
  };

  const handleFeedback = () => {
    Alert.alert(
      'フィードバック',
      'ご意見・ご要望をお聞かせください。\n\n今後のアップデートでフィードバック送信機能を追加予定です。',
      [{ text: 'OK' }]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'SmartMeals について',
      '糖尿病患者のための血糖値管理・食事提案アプリ\n\nバージョン: 1.0.0\n開発: SmartMeals Team\n\n© 2024 SmartMeals. All rights reserved.',
      [{ text: 'OK' }]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>設定</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* 通知設定 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔔 通知</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>プッシュ通知</Text>
                <Text style={styles.settingDescription}>記録リマインダー・週間レポート</Text>
              </View>
              <Switch
                value={settings.notifications}
                onValueChange={() => toggleSetting('notifications')}
                trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* 表示設定 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎨 表示</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>ダークモード</Text>
                <Text style={styles.settingDescription}>暗いテーマで表示</Text>
              </View>
              <Switch
                value={settings.darkMode}
                onValueChange={() => toggleSetting('darkMode')}
                trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>カロリー表示</Text>
                <Text style={styles.settingDescription}>献立にカロリー情報を表示</Text>
              </View>
              <Switch
                value={settings.showCalories}
                onValueChange={() => toggleSetting('showCalories')}
                trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* 献立生成 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🍽️ 献立生成</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>自動生成</Text>
                <Text style={styles.settingDescription}>血糖値記録時に自動で献立提案</Text>
              </View>
              <Switch
                value={settings.autoGeneration}
                onValueChange={() => toggleSetting('autoGeneration')}
                trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>厳格モード</Text>
                <Text style={styles.settingDescription}>より厳しい血糖管理向け献立</Text>
              </View>
              <Switch
                value={settings.strictMode}
                onValueChange={() => toggleSetting('strictMode')}
                trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* データ管理 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💾 データ管理</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>自動バックアップ</Text>
                <Text style={styles.settingDescription}>データを自動でクラウドに保存</Text>
              </View>
              <Switch
                value={settings.dataBackup}
                onValueChange={() => toggleSetting('dataBackup')}
                trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
                thumbColor="#fff"
              />
            </View>

            <TouchableOpacity style={styles.actionItem} onPress={handleDataExport}>
              <Ionicons name="download-outline" size={20} color="#007AFF" />
              <Text style={styles.actionLabel}>データをエクスポート</Text>
              <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={handleDataClear}>
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              <Text style={[styles.actionLabel, { color: '#FF3B30' }]}>全データを削除</Text>
              <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
            </TouchableOpacity>
          </View>

          {/* プライバシー */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔒 プライバシー</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>使用状況分析</Text>
                <Text style={styles.settingDescription}>アプリ改善のための匿名データ収集</Text>
              </View>
              <Switch
                value={settings.analytics}
                onValueChange={() => toggleSetting('analytics')}
                trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
                thumbColor="#fff"
              />
            </View>

            <TouchableOpacity style={styles.actionItem}>
              <Ionicons name="document-text-outline" size={20} color="#007AFF" />
              <Text style={styles.actionLabel}>プライバシーポリシー</Text>
              <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem}>
              <Ionicons name="document-outline" size={20} color="#007AFF" />
              <Text style={styles.actionLabel}>利用規約</Text>
              <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
            </TouchableOpacity>
          </View>

          {/* サポート */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>❓ サポート</Text>
            
            <TouchableOpacity style={styles.actionItem} onPress={handleFeedback}>
              <Ionicons name="chatbubble-outline" size={20} color="#007AFF" />
              <Text style={styles.actionLabel}>フィードバック送信</Text>
              <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem}>
              <Ionicons name="help-circle-outline" size={20} color="#007AFF" />
              <Text style={styles.actionLabel}>ヘルプ・FAQ</Text>
              <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={handleAbout}>
              <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
              <Text style={styles.actionLabel}>SmartMeals について</Text>
              <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
            </TouchableOpacity>
          </View>

          {/* バージョン情報 */}
          <View style={styles.versionSection}>
            <Text style={styles.versionText}>SmartMeals v1.0.0</Text>
            <Text style={styles.copyrightText}>© 2024 SmartMeals Team</Text>
          </View>

          <View style={{ height: 50 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 35,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginLeft: 16,
    marginBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  settingLeft: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#8E8E93',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '400',
    color: '#007AFF',
    marginLeft: 12,
    flex: 1,
  },
  versionSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  versionText: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 11,
    color: '#8E8E93',
  },
});