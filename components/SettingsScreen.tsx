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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as MailComposer from 'expo-mail-composer';
import dataExportService from '../services/dataExportService';
import { FOOD_CATEGORIES } from '../constants/foodCategories';
import notificationService, {
  ReminderSettings,
  defaultReminderSettings,
  DayOfWeek,
  SlotConfig,
  MAX_SLOTS,
} from '../services/notificationService';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
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
  avatarUri?: string;
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
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [likedFoods, setLikedFoods] = useState<string[]>([]);
  const [dislikedFoods, setDislikedFoods] = useState<string[]>([]);
  const [showFoodModal, setShowFoodModal] = useState<'liked' | 'disliked' | null>(null);
  const [targetHba1c, setTargetHba1c] = useState('');
  const [glucoseMin, setGlucoseMin] = useState('');
  const [glucoseMax, setGlucoseMax] = useState('');
  // dailyCarbLimit, dailyCalorieLimit は自動算出に移行（state不要）
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(defaultReminderSettings);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
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
      }
      const reminderStored = await AsyncStorage.getItem('reminder_settings');
      if (reminderStored) {
        try {
          const parsed = JSON.parse(reminderStored);
          // slotsが配列であることを確認（旧形式のオブジェクトだった場合はデフォルトを使う）
          if (parsed && Array.isArray(parsed.slots) && parsed.slots.length >= 1 && parsed.slots.length <= MAX_SLOTS) {
            setReminderSettings({
              enabled: parsed.enabled ?? defaultReminderSettings.enabled,
              slots: parsed.slots,
              days: parsed.days ?? defaultReminderSettings.days,
            });
          }
        } catch {}
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

  const saveReminderSettings = async (newRS: ReminderSettings) => {
    setReminderSettings(newRS);
    try {
      await AsyncStorage.setItem('reminder_settings', JSON.stringify(newRS));
      await notificationService.scheduleReminders(newRS);
    } catch {
      Alert.alert('エラー', '通知設定の保存に失敗しました');
    }
  };

  const handleToggleReminder = async () => {
    const newEnabled = !reminderSettings.enabled;
    if (newEnabled) {
      const granted = await notificationService.requestPermission();
      if (!granted) {
        Alert.alert('通知の許可', '設定アプリから通知を許可してください');
        return;
      }
    }
    saveReminderSettings({ ...reminderSettings, enabled: newEnabled });
  };

  const addSlot = () => {
    if (reminderSettings.slots.length >= MAX_SLOTS) return;
    const newSlot: SlotConfig = { enabled: true, hour: 12, minute: 0 };
    saveReminderSettings({ ...reminderSettings, slots: [...reminderSettings.slots, newSlot] });
  };

  const removeSlot = (index: number) => {
    if (reminderSettings.slots.length <= 1) return;
    const newSlots = reminderSettings.slots.filter((_, i) => i !== index);
    saveReminderSettings({ ...reminderSettings, slots: newSlots });
  };

  const toggleDay = (day: DayOfWeek) => {
    const newDays = { ...reminderSettings.days };
    newDays[day] = !newDays[day];
    saveReminderSettings({ ...reminderSettings, days: newDays });
  };

  const openSlotTimePicker = (index: number) => {
    const config = reminderSettings.slots[index];
    const d = new Date();
    d.setHours(config.hour, config.minute, 0, 0);
    setPickerDate(d);
    setEditingSlotIndex(index);
    setShowTimePicker(true);
  };

  const handleTimeChange = async (event: DateTimePickerEvent, date?: Date) => {
    setShowTimePicker(false);
    if (event.type === 'dismissed' || !date || editingSlotIndex === null) return;
    const hour = date.getHours();
    const minute = date.getMinutes();
    const newSlots = [...reminderSettings.slots];
    newSlots[editingSlotIndex] = { ...newSlots[editingSlotIndex], hour, minute };
    saveReminderSettings({ ...reminderSettings, slots: newSlots });
    setEditingSlotIndex(null);
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
          if (currentUser.avatarUri) setAvatarUri(currentUser.avatarUri);
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
    setEditingProfile(true);
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      try {
        const stored = await AsyncStorage.getItem('users');
        if (!stored || !user) return;
        const users = JSON.parse(stored);
        const index = users.findIndex((u: UserData) => u.id === user.id);
        if (index === -1) return;
        users[index].avatarUri = uri;
        await AsyncStorage.setItem('users', JSON.stringify(users));
      } catch {}
    }
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
      };

      await AsyncStorage.setItem('users', JSON.stringify(users));
      setUser(users[index]);
      setEditingProfile(false);
      Alert.alert('保存完了', '名前を更新しました');
    } catch {
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

  const FEEDBACK_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfP-BY6NVWGo_ary7IOqvWCia9i025lSjvvOkUR09-7xsRmow/viewform';

  const handleFeedback = async () => {
    try {
      await WebBrowser.openBrowserAsync(FEEDBACK_URL);
    } catch {
      Alert.alert('エラー', 'ブラウザの起動に失敗しました');
    }
  };

  const faqItems = [
    {
      q: '血糖値はいつ記録すればいいですか？',
      a: '食前または食後2時間を目安に記録してください。朝・昼・夜の食事タイミングに合わせて記録すると、トレンドが把握しやすくなります。',
    },
    {
      q: 'HbA1cはいつ入力すればいいですか？',
      a: '通院時に検査結果が出たタイミングで入力してください。HbA1cの値に応じて献立の糖質量が自動で最適化されます。',
    },
    {
      q: '献立のレパートリーはどのくらいありますか？',
      a: '朝食35種類、昼食38種類、夕食38種類の合計111種類です。糖尿病に配慮した低GI・低糖質メニューを中心に、和食・洋食のバリエーションがあります。',
    },
    {
      q: '食材の代替機能はどう使いますか？',
      a: '献立の詳細画面で食材横のアイコンをタップすると、栄養バランスを保った代替食材が提案されます。苦手な食材やアレルギーがある場合にご活用ください。',
    },
    {
      q: 'データのバックアップはどうすればいいですか？',
      a: '設定画面の「データをエクスポート」からCSVファイルとして書き出せます。定期的にエクスポートして保存することをおすすめします。',
    },
    {
      q: '通知が届きません',
      a: '端末の設定アプリから、SmartMealsの通知が許可されているか確認してください。また、省電力モードや「おやすみモード」が有効になっていると通知が届かない場合があります。',
    },
    {
      q: 'データを全て消したい場合は？',
      a: '設定画面の「データをクリア」から全データを削除できます。また、アプリのアンインストールでも端末内のデータは全て消去されます。',
    },
    {
      q: 'このアプリは医療アドバイスを提供しますか？',
      a: 'いいえ。本アプリは食事管理の補助ツールであり、医療行為や医療アドバイスを提供するものではありません。食事内容の変更は必ず担当医師にご相談ください。',
    },
  ];

  const PRIVACY_POLICY_URL = 'https://dune-lumber-1cf.notion.site/33618a8d471e80779246da10c3b79800';
  const TERMS_URL = 'https://dune-lumber-1cf.notion.site/33618a8d471e80679d75c4b86a01f6d1';

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

              <View style={styles.profileCard}>
                <TouchableOpacity onPress={pickAvatar} style={styles.avatarContainer}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
                      <Text style={styles.avatarPlaceholderText}>タップで追加</Text>
                    </View>
                  )}
                  {avatarUri && (
                    <View style={styles.avatarBadge}>
                      <Ionicons name="camera" size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <View style={styles.profileNameSection}>
                  {!editingProfile ? (
                    <>
                      <Text style={styles.profileName}>{user.name}</Text>
                      <TouchableOpacity onPress={startEditProfile}>
                        <Text style={styles.profileEditLink}>名前を変更</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={styles.editNameRow}>
                      <TextInput
                        style={styles.editNameInput}
                        value={editName}
                        onChangeText={setEditName}
                        placeholder="名前"
                        placeholderTextColor={colors.placeholder}
                        autoFocus
                      />
                      <TouchableOpacity style={styles.editNameSave} onPress={saveProfile}>
                        <Text style={styles.editNameSaveText}>保存</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setEditingProfile(false)}>
                        <Text style={styles.editNameCancel}>取消</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
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
                <Text style={styles.settingLabel}>リマインダー</Text>
                <Text style={styles.settingDescription}>血糖値の記録を促す通知</Text>
              </View>
              <Switch
                value={reminderSettings.enabled}
                onValueChange={handleToggleReminder}
                trackColor={{ false: colors.sectionBg, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            {reminderSettings.enabled && (
              <>
                {/* 通知時刻 */}
                {reminderSettings.slots.map((config, index) => (
                  <View key={index} style={styles.settingItem}>
                    <TouchableOpacity
                      style={styles.reminderSlotLeft}
                      onPress={() => openSlotTimePicker(index)}
                    >
                      <Ionicons name="time-outline" size={20} color={colors.primary} />
                      <Text style={styles.reminderTime}>
                        {notificationService.formatTime(config.hour, config.minute)}
                      </Text>
                    </TouchableOpacity>
                    {reminderSettings.slots.length > 1 && (
                      <TouchableOpacity onPress={() => removeSlot(index)} style={{ padding: 4 }}>
                        <Ionicons name="close-circle" size={22} color={colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {/* 追加ボタン */}
                {reminderSettings.slots.length < MAX_SLOTS && (
                  <TouchableOpacity style={styles.addSlotButton} onPress={addSlot}>
                    <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                    <Text style={styles.addSlotText}>通知を追加</Text>
                  </TouchableOpacity>
                )}

                {/* 曜日選択 */}
                <View style={styles.settingItem}>
                  <View style={styles.dayRow}>
                    {([0, 1, 2, 3, 4, 5, 6] as DayOfWeek[]).map(day => {
                      const labels = ['日', '月', '火', '水', '木', '金', '土'];
                      const active = reminderSettings.days[day];
                      return (
                        <TouchableOpacity
                          key={day}
                          style={[styles.dayChip, active && styles.dayChipActive]}
                          onPress={() => toggleDay(day)}
                        >
                          <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                            {labels[day]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </>
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

            <TouchableOpacity style={styles.actionItem} onPress={() => setShowFaqModal(true)}>
              <Ionicons name="help-circle-outline" size={20} color="#007AFF" />
              <Text style={styles.actionLabel}>ヘルプ・FAQ</Text>
              <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={() => setShowAboutModal(true)}>
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

        {/* ヘルプ・FAQ モーダル */}
        <Modal
          visible={showFaqModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowFaqModal(false)}
        >
          <SafeAreaView style={styles.container}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setShowFaqModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>ヘルプ・FAQ</Text>
              <View style={styles.placeholder} />
            </View>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              <View style={{ paddingVertical: 8 }}>
                {faqItems.map((item, index) => (
                  <View key={index}>
                    <TouchableOpacity
                      style={styles.faqQuestion}
                      onPress={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    >
                      <Text style={styles.faqQuestionText}>{item.q}</Text>
                      <Ionicons
                        name={expandedFaq === index ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                    {expandedFaq === index && (
                      <View style={styles.faqAnswer}>
                        <Text style={styles.faqAnswerText}>{item.a}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* SmartMeals について モーダル */}
        <Modal
          visible={showAboutModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowAboutModal(false)}
        >
          <SafeAreaView style={styles.container}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setShowAboutModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>SmartMeals について</Text>
              <View style={styles.placeholder} />
            </View>
            <ScrollView style={styles.scrollView} contentContainerStyle={{ padding: 20 }}>
              <View style={styles.aboutHeader}>
                <Text style={styles.aboutAppName}>SmartMeals</Text>
                <Text style={styles.aboutVersion}>バージョン 1.1.0</Text>
              </View>

              <Text style={styles.aboutDescription}>
                SmartMealsは、糖尿病と診断された方の日々の食事管理をサポートするアプリです。
              </Text>

              <View style={styles.aboutFeatureSection}>
                <Text style={styles.aboutFeatureTitle}>主な機能</Text>
                <Text style={styles.aboutFeatureItem}>・ 血糖値・HbA1cの記録とトレンド表示</Text>
                <Text style={styles.aboutFeatureItem}>・ あなたの数値に合わせたパーソナライズ献立提案</Text>
                <Text style={styles.aboutFeatureItem}>・ 111種類の糖尿病対応レシピ</Text>
                <Text style={styles.aboutFeatureItem}>・ 食材の代替提案と買い物リスト生成</Text>
                <Text style={styles.aboutFeatureItem}>・ 栄養サマリーと目標管理</Text>
              </View>

              <View style={styles.aboutFeatureSection}>
                <Text style={styles.aboutFeatureTitle}>ご注意</Text>
                <Text style={styles.aboutNote}>
                  本アプリは食事管理の補助ツールです。医療行為や医療アドバイスを提供するものではありません。食事内容の変更は必ず担当医師にご相談ください。
                </Text>
              </View>

              <View style={styles.aboutFooter}>
                <Text style={styles.aboutCopyright}>© 2026 SmartMeals</Text>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
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
    alignItems: 'center',
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    paddingVertical: 20,
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
  reminderSlotLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  reminderTime: { fontSize: 18, color: c.text, fontWeight: '700' },
  addSlotButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c.surface, borderTopWidth: 0.5, borderTopColor: c.border, borderBottomWidth: 0.5, borderBottomColor: c.border },
  addSlotText: { fontSize: 15, color: c.primary, fontWeight: '500' },
  // FAQ
  faqQuestion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: c.surface, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: c.border },
  faqQuestionText: { fontSize: 15, fontWeight: '500', color: c.text, flex: 1, marginRight: 8 },
  faqAnswer: { backgroundColor: c.sectionBg, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: c.border },
  faqAnswerText: { fontSize: 14, color: c.textSecondary, lineHeight: 22 },
  // About
  aboutHeader: { alignItems: 'center', marginBottom: 24, paddingTop: 12 },
  aboutAppName: { fontSize: 28, fontWeight: '700', color: c.text, marginBottom: 4 },
  aboutVersion: { fontSize: 14, color: c.textMuted },
  aboutDescription: { fontSize: 15, color: c.text, lineHeight: 24, marginBottom: 20 },
  aboutFeatureSection: { marginBottom: 20 },
  aboutFeatureTitle: { fontSize: 16, fontWeight: '600', color: c.text, marginBottom: 10 },
  aboutFeatureItem: { fontSize: 14, color: c.textSecondary, lineHeight: 24, paddingLeft: 4 },
  aboutNote: { fontSize: 14, color: c.textSecondary, lineHeight: 22 },
  aboutFooter: { alignItems: 'center', marginTop: 24, paddingVertical: 16 },
  aboutCopyright: { fontSize: 13, color: c.textMuted },
  // Avatar
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: c.sectionBg, borderWidth: 2, borderColor: c.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  avatarPlaceholderText: { fontSize: 11, color: c.textMuted, marginTop: 4 },
  avatarBadge: { position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.surface },
  profileNameSection: { alignItems: 'center' },
  profileEditLink: { fontSize: 13, color: c.primary, marginTop: 4 },
  editNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editNameInput: { flex: 1, borderWidth: 1, borderColor: c.inputBorder, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, fontSize: 16, color: c.text, backgroundColor: c.inputBg },
  editNameSave: { backgroundColor: c.primary, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  editNameSaveText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  editNameCancel: { color: c.textMuted, fontSize: 13 },
  dayRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', flex: 1, paddingVertical: 4 },
  dayChip: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.sectionBg, alignItems: 'center', justifyContent: 'center' },
  dayChipActive: { backgroundColor: c.primary },
  dayChipText: { fontSize: 13, fontWeight: '600', color: c.textSecondary },
  dayChipTextActive: { color: '#fff' },
});