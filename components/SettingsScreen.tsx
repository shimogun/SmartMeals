import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
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

const FOOD_CATEGORIES = {
  mainIngredients: {
    肉類: ['鶏むね肉', 'ささみ', '豚ヒレ肉', '牛もも肉', '鶏もも肉', '豚ロース', '鶏ひき肉', '豚ひき肉'],
    魚介類: ['鮭', 'サバ', 'タラ', 'マグロ', 'エビ', 'イカ', 'カツオ', 'アジ', 'ブリ'],
    大豆製品: ['豆腐', '厚揚げ', '納豆', '油揚げ', '豆乳', 'おから'],
  },
  sideIngredients: {
    緑黄色野菜: ['ブロッコリー', 'ほうれん草', 'にんじん', 'パプリカ', 'トマト', 'かぼちゃ', '小松菜'],
    淡色野菜: ['キャベツ', 'レタス', '大根', 'もやし', 'きゅうり', '玉ねぎ', 'なす'],
    きのこ類: ['しめじ', 'えのき', 'エリンギ', 'まいたけ', 'しいたけ'],
    海藻類: ['わかめ', 'ひじき', 'のり', 'もずく', '昆布'],
  },
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

type UserData = {
  id: string;
  name: string;
  age: number;
  avatar: string;
  healthData?: {
    height?: number;
    weight?: number;
    gender?: 'male' | 'female';
    activityLevel?: 'light' | 'moderate' | 'high';
  };
};

export default function SettingsScreen({ visible, onClose }: SettingsScreenProps) {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [user, setUser] = useState<UserData | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editGender, setEditGender] = useState<'male' | 'female'>('male');
  const [editActivity, setEditActivity] = useState<'light' | 'moderate' | 'high'>('moderate');
  const [likedFoods, setLikedFoods] = useState<string[]>([]);
  const [dislikedFoods, setDislikedFoods] = useState<string[]>([]);
  const [showFoodModal, setShowFoodModal] = useState<'liked' | 'disliked' | null>(null);

  useEffect(() => {
    if (visible) {
      loadSettings();
      loadUser();
    }
  }, [visible]);

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

  const loadUser = async () => {
    try {
      const stored = await AsyncStorage.getItem('users');
      if (stored) {
        const users = JSON.parse(stored);
        const currentIndex = await AsyncStorage.getItem('currentUserIndex');
        const index = currentIndex ? parseInt(currentIndex) : 0;
        const currentUser = users[index] || users[0];
        if (currentUser) {
          setUser(currentUser);
          if (currentUser.foodPreferences) {
            setLikedFoods(currentUser.foodPreferences.liked || []);
            setDislikedFoods(currentUser.foodPreferences.disliked || []);
          }
        }
      }
    } catch (error) {
      console.error('ユーザー読み込みエラー:', error);
    }
  };

  const startEditProfile = () => {
    if (!user) return;
    setEditName(user.name);
    setEditAge(user.age?.toString() || '');
    setEditHeight(user.healthData?.height?.toString() || '');
    setEditWeight(user.healthData?.weight?.toString() || '');
    setEditGender(user.healthData?.gender || 'male');
    setEditActivity(user.healthData?.activityLevel || 'moderate');
    setEditingProfile(true);
  };

  const saveProfile = async () => {
    if (!user) return;
    if (!editName.trim()) {
      Alert.alert('入力エラー', '名前を入力してください');
      return;
    }
    try {
      const stored = await AsyncStorage.getItem('users');
      if (!stored) return;
      const users = JSON.parse(stored);
      const index = users.findIndex((u: UserData) => u.id === user.id);
      if (index === -1) return;

      users[index] = {
        ...users[index],
        name: editName.trim(),
        age: parseInt(editAge) || user.age,
        healthData: {
          ...users[index].healthData,
          height: editHeight ? parseFloat(editHeight) : undefined,
          weight: editWeight ? parseFloat(editWeight) : undefined,
          gender: editGender,
          activityLevel: editActivity,
        },
      };

      await AsyncStorage.setItem('users', JSON.stringify(users));
      setUser(users[index]);
      setEditingProfile(false);
      Alert.alert('保存完了', 'プロフィールを更新しました');
    } catch (error) {
      console.error('プロフィール保存エラー:', error);
      Alert.alert('エラー', '保存に失敗しました');
    }
  };

  const saveFoodPreferences = async () => {
    try {
      const usersData = await AsyncStorage.getItem('users');
      if (!usersData) return;
      const users = JSON.parse(usersData);
      const indexData = await AsyncStorage.getItem('currentUserIndex');
      const index = indexData ? parseInt(indexData) : 0;

      if (users[index]) {
        users[index].foodPreferences = {
          liked: likedFoods,
          disliked: dislikedFoods,
        };
        await AsyncStorage.setItem('users', JSON.stringify(users));
        Alert.alert('保存完了', '食材の好みを更新しました');
      }
    } catch {
      Alert.alert('エラー', '保存に失敗しました');
    }
  };

  const toggleFoodPreference = (food: string, type: 'liked' | 'disliked') => {
    if (type === 'liked') {
      setLikedFoods(prev =>
        prev.includes(food) ? prev.filter(f => f !== food) : [...prev, food]
      );
    } else {
      setDislikedFoods(prev =>
        prev.includes(food) ? prev.filter(f => f !== food) : [...prev, food]
      );
    }
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
          {/* ユーザー情報 */}
          {user && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>👤 アカウント</Text>

              {!editingProfile ? (
                <>
                  <View style={styles.profileCard}>
                    <Text style={styles.profileAvatar}>{user.avatar}</Text>
                    <View style={styles.profileInfo}>
                      <Text style={styles.profileName}>{user.name}</Text>
                      <Text style={styles.profileSub}>{user.age}歳</Text>
                    </View>
                    <TouchableOpacity onPress={startEditProfile} style={styles.profileEditButton}>
                      <Ionicons name="pencil" size={18} color="#007AFF" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.loginHint}>
                    <Ionicons name="log-in-outline" size={18} color="#8E8E93" />
                    <Text style={styles.loginHintText}>Google / メールログインは今後対応予定</Text>
                  </View>
                </>
              ) : (
                <View style={styles.editForm}>
                  <View style={styles.editRow}>
                    <Text style={styles.editLabel}>名前</Text>
                    <TextInput style={styles.editInput} value={editName} onChangeText={setEditName} placeholder="名前" placeholderTextColor="#999" />
                  </View>
                  <View style={styles.editRow}>
                    <Text style={styles.editLabel}>年齢</Text>
                    <TextInput style={styles.editInput} value={editAge} onChangeText={setEditAge} placeholder="30" keyboardType="numeric" placeholderTextColor="#999" />
                  </View>
                  <View style={styles.editActions}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingProfile(false)}>
                      <Text style={styles.cancelBtnText}>キャンセル</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
                      <Text style={styles.saveBtnText}>保存</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* 食材の好み */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🥦 食材の好み</Text>

            {/* 好きな食材 */}
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>好きな食材</Text>
              </View>
            </View>
            <View style={styles.foodTagsContainer}>
              {likedFoods.length === 0 && (
                <Text style={styles.emptyFoodText}>未設定</Text>
              )}
              {likedFoods.map(food => (
                <TouchableOpacity
                  key={food}
                  style={[styles.foodTag, styles.foodTagLiked]}
                  onPress={() => toggleFoodPreference(food, 'liked')}
                >
                  <Text style={styles.foodTagText}>{food} ✕</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.addFoodButton}
                onPress={() => setShowFoodModal('liked')}
              >
                <Ionicons name="add" size={18} color="#007AFF" />
              </TouchableOpacity>
            </View>

            {/* 苦手な食材 */}
            <View style={[styles.settingItem, { marginTop: 8 }]}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>苦手な食材</Text>
              </View>
            </View>
            <View style={styles.foodTagsContainer}>
              {dislikedFoods.length === 0 && (
                <Text style={styles.emptyFoodText}>未設定</Text>
              )}
              {dislikedFoods.map(food => (
                <TouchableOpacity
                  key={food}
                  style={[styles.foodTag, styles.foodTagDisliked]}
                  onPress={() => toggleFoodPreference(food, 'disliked')}
                >
                  <Text style={styles.foodTagText}>{food} ✕</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.addFoodButton}
                onPress={() => setShowFoodModal('disliked')}
              >
                <Ionicons name="add" size={18} color="#007AFF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.saveFoodButton} onPress={saveFoodPreferences}>
              <Text style={styles.saveFoodButtonText}>食材の好みを保存</Text>
            </TouchableOpacity>
          </View>

          {/* 食材選択モーダル */}
          <Modal
            visible={showFoodModal !== null}
            animationType="slide"
            transparent
            onRequestClose={() => setShowFoodModal(null)}
          >
            <View style={styles.foodModalOverlay}>
              <View style={styles.foodModalContent}>
                <View style={styles.foodModalHeader}>
                  <Text style={styles.foodModalTitle}>
                    {showFoodModal === 'liked' ? '好きな食材を選択' : '苦手な食材を選択'}
                  </Text>
                  <TouchableOpacity onPress={() => setShowFoodModal(null)}>
                    <Ionicons name="close" size={24} color="#007AFF" />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {Object.entries(FOOD_CATEGORIES).map(([groupKey, categories]) => (
                    <View key={groupKey}>
                      {Object.entries(categories).map(([categoryName, foods]) => (
                        <View key={categoryName}>
                          <Text style={styles.foodCategoryLabel}>{categoryName}</Text>
                          <View style={styles.foodGrid}>
                            {foods.map(food => {
                              const isSelected = showFoodModal === 'liked'
                                ? likedFoods.includes(food)
                                : dislikedFoods.includes(food);
                              return (
                                <TouchableOpacity
                                  key={food}
                                  style={[
                                    styles.foodChip,
                                    isSelected && (showFoodModal === 'liked' ? styles.foodChipLiked : styles.foodChipDisliked),
                                  ]}
                                  onPress={() => toggleFoodPreference(food, showFoodModal!)}
                                >
                                  <Text style={[styles.foodChipText, isSelected && styles.foodChipTextSelected]}>
                                    {food}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      ))}
                    </View>
                  ))}
                  <View style={{ height: 40 }} />
                </ScrollView>
              </View>
            </View>
          </Modal>

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
  // ユーザー情報
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  profileAvatar: {
    fontSize: 36,
    marginRight: 14,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  profileSub: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  profileEditButton: {
    padding: 8,
  },
  healthSummary: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  healthItem: {
    fontSize: 13,
    color: '#666',
  },
  loginHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  loginHintText: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 8,
  },
  // 編集フォーム
  editForm: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  editLabel: {
    width: 50,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f8f9fa',
  },
  editUnit: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    width: 28,
  },
  toggleRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
  },
  toggleText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#fff',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  cancelBtnText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  saveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  saveBtnText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  // 食材の好み
  foodTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
    alignItems: 'center',
  },
  foodTag: {
    borderRadius: 16,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  foodTagLiked: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  foodTagDisliked: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  foodTagText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  emptyFoodText: {
    fontSize: 13,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  addFoodButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveFoodButton: {
    margin: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  saveFoodButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  // 食材選択モーダル
  foodModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  foodModalContent: {
    backgroundColor: '#F2F2F7',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  foodModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  foodModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  foodCategoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 16,
    textTransform: 'uppercase',
  },
  foodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
  },
  foodChip: {
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  foodChipLiked: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  foodChipDisliked: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  foodChipText: {
    fontSize: 13,
    color: '#333',
  },
  foodChipTextSelected: {
    fontWeight: '600',
    color: '#000',
  },
});