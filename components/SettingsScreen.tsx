import React, { useState, useEffect, useContext } from 'react';
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
import * as WebBrowser from 'expo-web-browser';
import * as MailComposer from 'expo-mail-composer';
import dataExportService from '../services/dataExportService';
import { FOOD_CATEGORIES } from '../constants/foodCategories';
import notificationService from '../services/notificationService';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { ThemeContext } from '../contexts/ThemeContext';
import { useThemeColors } from '../hooks/useThemeColors';

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
  reminderTime: string;
};

const defaultSettings: SettingsData = {
  notifications: true,
  darkMode: false,
  dataBackup: true,
  autoGeneration: false,
  showCalories: true,
  strictMode: false,
  analytics: true,
  reminderTime: '20:00',
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
  const { isDark, toggleDark } = useContext(ThemeContext);
  const colors = useThemeColors();
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
  const [targetHba1c, setTargetHba1c] = useState('');
  const [glucoseMin, setGlucoseMin] = useState('');
  const [glucoseMax, setGlucoseMax] = useState('');
  // dailyCarbLimit, dailyCalorieLimit は自動算出に移行（state不要）
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(20, 0, 0, 0);
    return d;
  });

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
        const loaded = { ...defaultSettings, ...JSON.parse(stored) };
        setSettings(loaded);
        if (loaded.notifications) {
          const { hour, minute } = notificationService.parseTime(loaded.reminderTime || '20:00');
          notificationService.scheduleReminder(hour, minute);
        }
      }
    } catch (error) {
      console.error('設定読み込みエラー:', error);
    }
  };

  const saveSettings = async (newSettings: SettingsData) => {
    setSettings(newSettings);
    try {
      await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('設定保存エラー:', error);
      Alert.alert('エラー', '設定の保存に失敗しました');
    }
  };

  const toggleSetting = (key: keyof SettingsData) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    saveSettings(newSettings);
  };

  const handleToggleNotifications = async () => {
    const newValue = !settings.notifications;
    if (newValue) {
      const granted = await notificationService.requestPermission();
      if (!granted) {
        Alert.alert('通知の許可', '設定アプリから通知を許可してください');
        return;
      }
      const { hour, minute } = notificationService.parseTime(settings.reminderTime);
      await notificationService.scheduleReminder(hour, minute);
    } else {
      await notificationService.cancelReminder();
    }
    const newSettings = { ...settings, notifications: newValue };
    saveSettings(newSettings);
  };

  const openTimePicker = () => {
    const { hour, minute } = notificationService.parseTime(settings.reminderTime);
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    setPickerDate(d);
    setShowTimePicker(true);
  };

  const handleTimeChange = async (event: DateTimePickerEvent, date?: Date) => {
    setShowTimePicker(false);
    if (event.type === 'dismissed' || !date) return;
    const hour = date.getHours();
    const minute = date.getMinutes();
    const timeStr = notificationService.formatTime(hour, minute);
    const newSettings = { ...settings, reminderTime: timeStr };
    saveSettings(newSettings);
    if (newSettings.notifications) {
      await notificationService.scheduleReminder(hour, minute);
    }
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
          if (currentUser.medicalGuidance) {
            const mg = currentUser.medicalGuidance;
            if (mg.targetHba1c != null) setTargetHba1c(String(mg.targetHba1c));
            if (mg.glucoseMin != null) setGlucoseMin(String(mg.glucoseMin));
            if (mg.glucoseMax != null) setGlucoseMax(String(mg.glucoseMax));
            // dailyCarbLimit, dailyCalorieLimit は自動算出に移行
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
    const heightVal = editHeight ? parseFloat(editHeight) : undefined;
    const weightVal = editWeight ? parseFloat(editWeight) : undefined;
    if (heightVal !== undefined && (heightVal < 100 || heightVal > 250)) {
      Alert.alert('入力エラー', '身長は100〜250cmの範囲で入力してください');
      return;
    }
    if (weightVal !== undefined && (weightVal < 20 || weightVal > 300)) {
      Alert.alert('入力エラー', '体重は20〜300kgの範囲で入力してください');
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

  const saveMedicalGuidance = async () => {
    try {
      const usersData = await AsyncStorage.getItem('users');
      if (!usersData) return;
      const users = JSON.parse(usersData);
      const indexData = await AsyncStorage.getItem('currentUserIndex');
      const index = indexData ? parseInt(indexData) : 0;
      if (users[index]) {
        users[index].medicalGuidance = {
          targetHba1c: targetHba1c ? parseFloat(targetHba1c) : undefined,
          glucoseMin: glucoseMin ? parseInt(glucoseMin) : undefined,
          glucoseMax: glucoseMax ? parseInt(glucoseMax) : undefined,
        };
        await AsyncStorage.setItem('users', JSON.stringify(users));
        Alert.alert('保存完了', '指導値を更新しました');
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

  const handleDataExport = async () => {
    if (!user) return;
    try {
      await dataExportService.exportAll(user.id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'エクスポートに失敗しました';
      Alert.alert('エクスポート', message);
    }
  };

  const handleDataClear = () => {
    Alert.alert(
      'データを削除',
      'すべてのデータが削除されます。この操作は取り消せません。本当に削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '最終確認',
              'この操作は元に戻せません。本当にすべてのデータを完全に削除しますか？',
              [
                { text: 'やめる', style: 'cancel' },
                {
                  text: '完全に削除する',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await AsyncStorage.multiRemove([
                        'glucose_records',
                        'weekly_records',
                        'saved_meal_plans',
                        'users',
                        'currentUserIndex',
                        'app_settings',
                      ]);
                      Alert.alert('完了', 'すべてのデータを削除しました。アプリを再起動してください。');
                    } catch {
                      Alert.alert('エラー', 'データの削除に失敗しました');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleFeedback = async () => {
    const isAvailable = await MailComposer.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert(
        'メール未設定',
        'メールアプリが設定されていません。smartmeals.feedback@gmail.com までご連絡ください。'
      );
      return;
    }
    try {
      await MailComposer.composeAsync({
        recipients: ['smartmeals.feedback@gmail.com'],
        subject: 'SmartMeals フィードバック',
        body: `\n\n---\nアプリバージョン: 1.0.0\nユーザー名: ${user?.name || '未設定'}`,
      });
    } catch {
      Alert.alert('エラー', 'メールの起動に失敗しました');
    }
  };

  const handleAbout = () => {
    Alert.alert(
      'SmartMeals について',
      '糖尿病患者のための血糖値管理・食事提案アプリ\n\nバージョン: 1.0.0\n開発: SmartMeals Team\n\n© 2024 SmartMeals. All rights reserved.',
      [{ text: 'OK' }]
    );
  };

  const PRIVACY_POLICY_URL = 'https://smartmeals.app/privacy';
  const TERMS_URL = 'https://smartmeals.app/terms';

  const handleOpenUrl = async (url: string, title: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert(title, '現在準備中です。');
    }
  };

  const styles = createSettingsStyles(colors);

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
            <Ionicons name="close" size={24} color={colors.primary} />
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
                      {user.healthData && (
                        <Text style={styles.profileSub}>
                          {user.healthData.height ? `${user.healthData.height}cm` : ''}
                          {user.healthData.height && user.healthData.weight ? ' / ' : ''}
                          {user.healthData.weight ? `${user.healthData.weight}kg` : ''}
                          {user.healthData.gender ? ` / ${user.healthData.gender === 'male' ? '男性' : '女性'}` : ''}
                        </Text>
                      )}
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
                  <View style={styles.editRow}>
                    <Text style={styles.editLabel}>身長</Text>
                    <TextInput style={styles.editInput} value={editHeight} onChangeText={setEditHeight} placeholder="170" keyboardType="decimal-pad" placeholderTextColor="#999" />
                    <Text style={styles.editUnit}>cm</Text>
                  </View>
                  <View style={styles.editRow}>
                    <Text style={styles.editLabel}>体重</Text>
                    <TextInput style={styles.editInput} value={editWeight} onChangeText={setEditWeight} placeholder="65" keyboardType="decimal-pad" placeholderTextColor="#999" />
                    <Text style={styles.editUnit}>kg</Text>
                  </View>
                  <View style={styles.editRow}>
                    <Text style={styles.editLabel}>性別</Text>
                    <View style={styles.toggleRow}>
                      <TouchableOpacity
                        style={[styles.toggleButton, editGender === 'male' && styles.toggleButtonActive]}
                        onPress={() => setEditGender('male')}
                      >
                        <Text style={[styles.toggleText, editGender === 'male' && styles.toggleTextActive]}>男性</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.toggleButton, editGender === 'female' && styles.toggleButtonActive]}
                        onPress={() => setEditGender('female')}
                      >
                        <Text style={[styles.toggleText, editGender === 'female' && styles.toggleTextActive]}>女性</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.editRow}>
                    <Text style={styles.editLabel}>活動量</Text>
                    <View style={styles.toggleRow}>
                      {([['light', '軽い'], ['moderate', '普通'], ['high', '多い']] as const).map(([value, label]) => (
                        <TouchableOpacity
                          key={value}
                          style={[styles.toggleButton, editActivity === value && styles.toggleButtonActive]}
                          onPress={() => setEditActivity(value)}
                        >
                          <Text style={[styles.toggleText, editActivity === value && styles.toggleTextActive]}>{label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
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

          {/* 医師の指導値 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>医師の指導値</Text>
            <Text style={styles.guidanceHint}>入力するとカロリー・糖質の目標が自動で最適化されます</Text>
            <View style={styles.guidanceRowVertical}>
              <Text style={styles.guidanceLabel}>HbA1c目標</Text>
              <TextInput style={styles.guidanceInput} value={targetHba1c} onChangeText={setTargetHba1c} placeholder="例: 6.5" placeholderTextColor="#999" keyboardType="decimal-pad" />
            </View>
            <View style={styles.guidanceRowVertical}>
              <Text style={styles.guidanceLabel}>血糖値目標範囲</Text>
              <View style={styles.glucoseRangeRow}>
                <TextInput style={styles.glucoseRangeInput} value={glucoseMin} onChangeText={setGlucoseMin} placeholder="80" placeholderTextColor="#999" keyboardType="number-pad" />
                <Text style={styles.glucoseRangeSeparator}>〜</Text>
                <TextInput style={styles.glucoseRangeInput} value={glucoseMax} onChangeText={setGlucoseMax} placeholder="130" placeholderTextColor="#999" keyboardType="number-pad" />
                <Text style={styles.guidanceUnit}>mg/dL</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.saveFoodButton} onPress={saveMedicalGuidance}>
              <Text style={styles.saveFoodButtonText}>指導値を保存</Text>
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
                            {(foods as readonly string[]).map((food: string) => {
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
                <Text style={styles.settingLabel}>記録リマインダー</Text>
                <Text style={styles.settingDescription}>毎日指定時刻に記録を促す通知</Text>
              </View>
              <Switch
                value={settings.notifications}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
                thumbColor="#fff"
              />
            </View>

            {settings.notifications && (
              <TouchableOpacity
                style={styles.settingItem}
                onPress={openTimePicker}
              >
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>リマインダー時刻</Text>
                </View>
                <Text style={{ fontSize: 16, color: '#007AFF', fontWeight: '600' }}>
                  {settings.reminderTime}
                </Text>
              </TouchableOpacity>
            )}

            {showTimePicker && (
              <DateTimePicker
                value={pickerDate}
                mode="time"
                is24Hour={true}
                display="spinner"
                onChange={handleTimeChange}
              />
            )}
          </View>

          {/* 表示設定 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎨 表示</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>ダークモード</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleDark}
                trackColor={{ false: '#E0E0E0', true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

          </View>

          {/* 献立生成セクションは制限レベル選択と自動算出に統合済みのため削除 */}

          {/* データ管理 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💾 データ管理</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>自動バックアップ</Text>
                <Text style={styles.settingDescription}>今後のアップデートで対応予定</Text>
              </View>
              <Switch
                value={settings.dataBackup}
                onValueChange={() => toggleSetting('dataBackup')}
                trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
                thumbColor="#fff"
                disabled={true}
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

            <TouchableOpacity style={styles.actionItem} onPress={() => handleOpenUrl(PRIVACY_POLICY_URL, 'プライバシーポリシー')}>
              <Ionicons name="document-text-outline" size={20} color="#007AFF" />
              <Text style={styles.actionLabel}>プライバシーポリシー</Text>
              <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={() => handleOpenUrl(TERMS_URL, '利用規約')}>
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
            <Text style={styles.versionText}>SmartMeals v1.1.0</Text>
            <Text style={styles.copyrightText}>© 2026 SmartMeals</Text>
          </View>

          <View style={{ height: 50 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const createSettingsStyles = (c: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: c.text,
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
    color: c.text,
    marginLeft: 16,
    marginBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: c.border,
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
  },
  settingLeft: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '400',
    color: c.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: c.textMuted,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: c.border,
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '400',
    color: c.primary,
    marginLeft: 12,
    flex: 1,
  },
  versionSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  versionText: {
    fontSize: 13,
    color: c.textMuted,
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 11,
    color: c.textMuted,
  },
  // ユーザー情報
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 0.5,
    borderTopColor: c.border,
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
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
    color: c.text,
  },
  profileSub: {
    fontSize: 14,
    color: c.textMuted,
    marginTop: 2,
  },
  profileEditButton: {
    padding: 8,
  },
  healthSummary: {
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  healthItem: {
    fontSize: 13,
    color: c.textSecondary,
  },
  loginHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
  },
  loginHintText: {
    fontSize: 13,
    color: c.textMuted,
    marginLeft: 8,
  },
  // 編集フォーム
  editForm: {
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: c.border,
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
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
    color: c.text,
  },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: c.inputBorder,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: c.text,
    backgroundColor: c.inputBg,
  },
  editUnit: {
    fontSize: 14,
    color: c.textSecondary,
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
    backgroundColor: c.sectionBg,
  },
  toggleButtonActive: {
    backgroundColor: c.primary,
  },
  toggleText: {
    fontSize: 13,
    color: c.textSecondary,
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
    backgroundColor: c.sectionBg,
  },
  cancelBtnText: {
    fontSize: 14,
    color: c.textSecondary,
    fontWeight: '600',
  },
  saveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: c.primary,
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
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
    alignItems: 'center',
  },
  foodTag: {
    borderRadius: 16,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  foodTagLiked: {
    backgroundColor: c.successBg,
    borderWidth: 1,
    borderColor: c.success,
  },
  foodTagDisliked: {
    backgroundColor: c.dangerBg,
    borderWidth: 1,
    borderColor: c.danger,
  },
  foodTagText: {
    fontSize: 13,
    color: c.text,
    fontWeight: '500',
  },
  emptyFoodText: {
    fontSize: 13,
    color: c.textMuted,
    fontStyle: 'italic',
  },
  addFoodButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.sectionBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveFoodButton: {
    margin: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: c.primary,
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
    backgroundColor: c.background,
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
    backgroundColor: c.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
  },
  foodModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: c.text,
  },
  foodCategoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textMuted,
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
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  foodChipLiked: {
    backgroundColor: c.successBg,
    borderColor: c.success,
  },
  foodChipDisliked: {
    backgroundColor: c.dangerBg,
    borderColor: c.danger,
  },
  foodChipText: {
    fontSize: 13,
    color: c.text,
  },
  foodChipTextSelected: {
    fontWeight: '600',
    color: c.text,
  },
  guidanceRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  guidanceLabel: { flex: 1, fontSize: 14, color: c.text },
  guidanceInput: { width: 80, backgroundColor: c.inputBg, borderRadius: 8, padding: 8, fontSize: 16, textAlign: 'center', borderWidth: 1, borderColor: c.inputBorder, color: c.text },
  guidanceUnit: { fontSize: 13, color: c.textMuted, marginLeft: 4 },
  guidanceHint: { fontSize: 12, color: c.textMuted, marginBottom: 12, lineHeight: 18, paddingHorizontal: 16 },
  guidanceRowVertical: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  glucoseRangeRow: { flexDirection: 'row', alignItems: 'center' },
  glucoseRangeInput: { borderWidth: 1, borderColor: c.inputBorder, borderRadius: 8, padding: 8, fontSize: 15, width: 60, textAlign: 'center', backgroundColor: c.inputBg, color: c.text },
  glucoseRangeSeparator: { fontSize: 16, color: c.textSecondary, marginHorizontal: 6 },
});