# 設定画面 本格実装 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SmartMeals設定画面のプレースホルダー機能を実際に動作する本格実装に昇格させる。

**Architecture:** 既存の `SettingsScreen.tsx` をベースに、新規サービスファイル（通知・エクスポート）を追加。食材カテゴリは共通定数に抽出。SettingsScreen 自体は既に1,061行あるため、ロジック追加は最小限にしてサービス層に委譲する。

**Tech Stack:** Expo SDK 54 / TypeScript / expo-notifications / expo-sharing / expo-mail-composer / expo-web-browser / expo-file-system

---

## ファイル構成

```
SmartMeals/
├── constants/
│   └── foodCategories.ts              ← 新規: 食材カテゴリ定数（オンボーディング＆設定で共用）
├── services/
│   ├── notificationService.ts         ← 新規: ローカル通知スケジュール管理
│   └── dataExportService.ts           ← 新規: CSVエクスポート
├── components/
│   └── SettingsScreen.tsx             ← 修正: 全機能実装
└── app/
    └── onboarding.tsx                 ← 修正: 食材カテゴリをimportに変更
```

---

## Task 1: 食材カテゴリの共通化

**Files:**
- Create: `constants/foodCategories.ts`
- Modify: `app/onboarding.tsx:17-29`
- Modify: `components/SettingsScreen.tsx:33-45`

- [ ] **Step 1: `constants/foodCategories.ts` を作成**

```typescript
// constants/foodCategories.ts

export const FOOD_CATEGORIES = {
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
} as const;

export type FoodCategoryGroup = typeof FOOD_CATEGORIES;
```

- [ ] **Step 2: `app/onboarding.tsx` のローカル定義を import に置き換え**

行17-29の `const FOOD_CATEGORIES = { ... };` を削除し、先頭のimportブロックに追加:

```typescript
import { FOOD_CATEGORIES } from '../constants/foodCategories';
```

- [ ] **Step 3: `components/SettingsScreen.tsx` のローカル定義を import に置き換え**

行33-45の `const FOOD_CATEGORIES = { ... };` を削除し、先頭のimportブロックに追加:

```typescript
import { FOOD_CATEGORIES } from '../constants/foodCategories';
```

- [ ] **Step 4: 型エラーチェック**

```bash
npx tsc --noEmit
```

期待: エラーなし

- [ ] **Step 5: コミット**

```bash
git add constants/foodCategories.ts app/onboarding.tsx components/SettingsScreen.tsx
git commit -m "refactor: 食材カテゴリ定数を共通ファイルに抽出"
```

---

## Task 2: プロフィール編集強化

**Files:**
- Modify: `components/SettingsScreen.tsx`

現状の編集フォーム（行342-359）には名前・年齢しかない。身長・体重・性別・活動量・HbA1cフィールドを追加する。`saveProfile()` は既に `healthData` を保存するロジックがあるが、UIにフィールドがない状態。

- [ ] **Step 1: 編集フォームに身長・体重フィールドを追加**

`components/SettingsScreen.tsx` の編集フォーム部分（`editingProfile` が true の時）、年齢フィールドの後に追加:

```tsx
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
```

- [ ] **Step 2: 性別トグルを追加**

体重フィールドの後に追加:

```tsx
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
```

- [ ] **Step 3: 活動量セレクタを追加**

性別トグルの後に追加:

```tsx
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
```

- [ ] **Step 4: プロフィールカードの表示にも身長・体重を追加**

プロフィールカード（`!editingProfile` 時）の `profileSub` テキスト（行329）を拡張。`user.age` の後に健康情報を追加表示:

`<Text style={styles.profileSub}>{user.age}歳</Text>` の下に追加:

```tsx
                    {user.healthData && (
                      <Text style={styles.profileSub}>
                        {user.healthData.height ? `${user.healthData.height}cm` : ''}
                        {user.healthData.height && user.healthData.weight ? ' / ' : ''}
                        {user.healthData.weight ? `${user.healthData.weight}kg` : ''}
                        {user.healthData.gender ? ` / ${user.healthData.gender === 'male' ? '男性' : '女性'}` : ''}
                      </Text>
                    )}
```

- [ ] **Step 5: `saveProfile()` にバリデーションを追加**

既存の `saveProfile()` 関数（行162-196）の `if (!editName.trim())` チェックの後に追加:

```typescript
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
```

- [ ] **Step 6: 型エラーチェック**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: コミット**

```bash
git add components/SettingsScreen.tsx
git commit -m "feat: プロフィール編集に身長・体重・性別・活動量を追加"
```

---

## Task 3: プラポリ・利用規約（expo-web-browser）

**Files:**
- Modify: `components/SettingsScreen.tsx`

`expo-web-browser` は既にインストール済み。

- [ ] **Step 1: import を追加**

`components/SettingsScreen.tsx` の先頭に追加:

```typescript
import * as WebBrowser from 'expo-web-browser';
```

- [ ] **Step 2: URL定数とハンドラ関数を追加**

`handleAbout` 関数の後に追加:

```typescript
  const PRIVACY_POLICY_URL = 'https://smartmeals.app/privacy'; // TODO: 実URLに差し替え
  const TERMS_URL = 'https://smartmeals.app/terms'; // TODO: 実URLに差し替え

  const handleOpenUrl = async (url: string, title: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert(title, '現在準備中です。');
    }
  };
```

- [ ] **Step 3: プラポリ・利用規約ボタンに `onPress` を接続**

行640のプライバシーポリシーボタン:

```tsx
            <TouchableOpacity style={styles.actionItem} onPress={() => handleOpenUrl(PRIVACY_POLICY_URL, 'プライバシーポリシー')}>
```

行646の利用規約ボタン:

```tsx
            <TouchableOpacity style={styles.actionItem} onPress={() => handleOpenUrl(TERMS_URL, '利用規約')}>
```

- [ ] **Step 4: 型エラーチェック**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: コミット**

```bash
git add components/SettingsScreen.tsx
git commit -m "feat: プライバシーポリシー・利用規約をWebBrowserで表示"
```

---

## Task 4: フィードバック送信（expo-mail-composer）

**Files:**
- Modify: `components/SettingsScreen.tsx`

- [ ] **Step 1: expo-mail-composer をインストール**

```bash
npx expo install expo-mail-composer
```

- [ ] **Step 2: import を追加**

`components/SettingsScreen.tsx` の先頭に追加:

```typescript
import * as MailComposer from 'expo-mail-composer';
```

- [ ] **Step 3: `handleFeedback()` を実装に置き換え**

既存の `handleFeedback` 関数（行284-290）を以下に置き換え:

```typescript
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
```

- [ ] **Step 4: 型エラーチェック**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: コミット**

```bash
git add components/SettingsScreen.tsx package.json package-lock.json
git commit -m "feat: フィードバック送信をexpo-mail-composerで実装"
```

---

## Task 5: データエクスポート（CSV生成 + expo-sharing）

**Files:**
- Create: `services/dataExportService.ts`
- Modify: `components/SettingsScreen.tsx`

- [ ] **Step 1: expo-sharing をインストール**

```bash
npx expo install expo-sharing
```

- [ ] **Step 2: `services/dataExportService.ts` を作成**

```typescript
// services/dataExportService.ts

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlucoseRecord, WeeklyRecord, SavedMealPlan } from '../types';

const BOM = '\uFEFF'; // UTF-8 BOM for Excel

class DataExportService {
  async exportAll(userId: string): Promise<void> {
    const timestamp = new Date().toISOString().slice(0, 10);
    const files: string[] = [];

    // 血糖値記録
    const glucoseCsv = await this.buildGlucoseCsv(userId);
    if (glucoseCsv) {
      const path = `${FileSystem.cacheDirectory}glucose_${timestamp}.csv`;
      await FileSystem.writeAsStringAsync(path, BOM + glucoseCsv);
      files.push(path);
    }

    // 週間記録
    const weeklyCsv = await this.buildWeeklyCsv(userId);
    if (weeklyCsv) {
      const path = `${FileSystem.cacheDirectory}weekly_${timestamp}.csv`;
      await FileSystem.writeAsStringAsync(path, BOM + weeklyCsv);
      files.push(path);
    }

    // 献立データ
    const mealsCsv = await this.buildMealsCsv(userId);
    if (mealsCsv) {
      const path = `${FileSystem.cacheDirectory}meals_${timestamp}.csv`;
      await FileSystem.writeAsStringAsync(path, BOM + mealsCsv);
      files.push(path);
    }

    if (files.length === 0) {
      throw new Error('エクスポートするデータがありません');
    }

    // expo-sharing は1ファイルずつしか共有できないため、最初のファイルから順に共有
    for (const file of files) {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
      }
    }
  }

  private async buildGlucoseCsv(userId: string): Promise<string | null> {
    try {
      const data = await AsyncStorage.getItem('glucose_records');
      if (!data) return null;
      const records: GlucoseRecord[] = JSON.parse(data).filter((r: GlucoseRecord) => r.userId === userId);
      if (records.length === 0) return null;

      const header = '日時,血糖値(mg/dL),食事タイミング,メモ';
      const rows = records
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(r => {
          const date = new Date(r.timestamp).toLocaleString('ja-JP');
          return `${date},${r.value},${r.mealType},${this.escapeCsv(r.mealNote || '')}`;
        });
      return [header, ...rows].join('\n');
    } catch {
      return null;
    }
  }

  private async buildWeeklyCsv(userId: string): Promise<string | null> {
    try {
      const data = await AsyncStorage.getItem('weekly_records');
      if (!data) return null;
      const records: WeeklyRecord[] = JSON.parse(data).filter((r: WeeklyRecord) => r.userId === userId);
      if (records.length === 0) return null;

      const header = '週開始日,体重(kg),HbA1c(%),血圧(収縮/拡張),運動,体調';
      const rows = records
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(r => {
          const bp = r.bloodPressure ? `${r.bloodPressure.systolic}/${r.bloodPressure.diastolic}` : '';
          return `${r.weekStart},${r.weight ?? ''},${r.hba1c ?? ''},${bp},${this.escapeCsv(r.exercise || '')},${this.escapeCsv(r.condition || '')}`;
        });
      return [header, ...rows].join('\n');
    } catch {
      return null;
    }
  }

  private async buildMealsCsv(userId: string): Promise<string | null> {
    try {
      const data = await AsyncStorage.getItem('saved_meal_plans');
      if (!data) return null;
      const plans: SavedMealPlan[] = JSON.parse(data).filter((p: SavedMealPlan) => p.userId === userId);
      if (plans.length === 0) return null;

      const header = '日付,食事名,カロリー(kcal),糖質(g),たんぱく質(g),脂質(g)';
      const rows: string[] = [];
      for (const plan of plans) {
        for (const [date, meals] of Object.entries(plan.meals)) {
          for (const meal of meals) {
            rows.push(`${date},${this.escapeCsv(meal.name)},${meal.calories},${meal.carbs},${meal.protein},${meal.fat}`);
          }
        }
      }
      if (rows.length === 0) return null;
      return [header, ...rows].join('\n');
    } catch {
      return null;
    }
  }

  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}

const dataExportService = new DataExportService();
export default dataExportService;
```

- [ ] **Step 3: SettingsScreen の `handleDataExport()` を実装に置き換え**

既存の `handleDataExport` 関数（行254-260）を以下に置き換え:

```typescript
  const handleDataExport = async () => {
    if (!user) return;
    try {
      await dataExportService.exportAll(user.id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'エクスポートに失敗しました';
      Alert.alert('エクスポート', message);
    }
  };
```

import を追加:

```typescript
import dataExportService from '../services/dataExportService';
```

- [ ] **Step 4: 型エラーチェック**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: コミット**

```bash
git add services/dataExportService.ts components/SettingsScreen.tsx package.json package-lock.json
git commit -m "feat: データエクスポート機能実装（CSV + expo-sharing）"
```

---

## Task 6: データクリア改善（二重確認）

**Files:**
- Modify: `components/SettingsScreen.tsx`

- [ ] **Step 1: `handleDataClear()` を二重確認に置き換え**

既存の `handleDataClear` 関数（行262-282）を以下に置き換え:

```typescript
  const handleDataClear = () => {
    Alert.alert(
      'データを削除',
      'すべてのデータが削除されます。この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '続ける',
          style: 'destructive',
          onPress: () => {
            Alert.prompt(
              '最終確認',
              '削除を確定するには「削除」と入力してください',
              [
                { text: 'キャンセル', style: 'cancel' },
                {
                  text: '完全に削除',
                  style: 'destructive',
                  onPress: async (input?: string) => {
                    if (input?.trim() !== '削除') {
                      Alert.alert('キャンセル', '入力が一致しませんでした');
                      return;
                    }
                    try {
                      await AsyncStorage.multiRemove([
                        'glucose_records',
                        'weekly_records',
                        'saved_meal_plans',
                        'users',
                        'currentUserIndex',
                        'app_settings',
                      ]);
                      Alert.alert('完了', 'すべてのデータを削除しました。アプリを再起動します。');
                    } catch {
                      Alert.alert('エラー', 'データの削除に失敗しました');
                    }
                  },
                },
              ],
              'plain-text'
            );
          },
        },
      ]
    );
  };
```

**注意:** `Alert.prompt` は iOS のみ対応。Android では代替が必要。Android対応のため、以下のアプローチに変更:

実際には `Alert.prompt` は Android で動かないため、二段階の `Alert.alert` を使う:

```typescript
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
```

- [ ] **Step 2: 型エラーチェック**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: コミット**

```bash
git add components/SettingsScreen.tsx
git commit -m "feat: データクリアに二重確認ダイアログを追加"
```

---

## Task 7: ローカル通知リマインダー（expo-notifications）

**Files:**
- Create: `services/notificationService.ts`
- Modify: `components/SettingsScreen.tsx`

- [ ] **Step 1: expo-notifications をインストール**

```bash
npx expo install expo-notifications
```

- [ ] **Step 2: `services/notificationService.ts` を作成**

```typescript
// services/notificationService.ts

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const REMINDER_IDENTIFIER = 'daily-record-reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  async requestPermission(): Promise<boolean> {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  async scheduleReminder(hour: number, minute: number): Promise<boolean> {
    const granted = await this.requestPermission();
    if (!granted) return false;

    // 既存のリマインダーをキャンセル
    await this.cancelReminder();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'SmartMeals',
        body: '今日の血糖値・体重を記録しましょう',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
      identifier: REMINDER_IDENTIFIER,
    });

    return true;
  }

  async cancelReminder(): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER);
  }

  parseTime(timeStr: string): { hour: number; minute: number } {
    const [h, m] = timeStr.split(':').map(Number);
    return { hour: h || 20, minute: m || 0 };
  }

  formatTime(hour: number, minute: number): string {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }
}

const notificationService = new NotificationService();
export default notificationService;
```

- [ ] **Step 3: SettingsScreen に通知設定UIを追加**

`SettingsData` 型に `reminderTime` を追加:

```typescript
type SettingsData = {
  notifications: boolean;
  darkMode: boolean;
  dataBackup: boolean;
  autoGeneration: boolean;
  showCalories: boolean;
  strictMode: boolean;
  analytics: boolean;
  reminderTime: string; // HH:mm format
};
```

`defaultSettings` に追加:

```typescript
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
```

import を追加:

```typescript
import notificationService from '../services/notificationService';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
```

- [ ] **Step 4: 通知トグルのロジックを実装**

state 追加:

```typescript
const [showTimePicker, setShowTimePicker] = useState(false);
```

通知トグルの `onValueChange` を専用関数に置き換え:

```typescript
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

  const handleTimeChange = async (event: DateTimePickerEvent, date?: Date) => {
    setShowTimePicker(false);
    if (event.type === 'dismissed' || !date) return;
    const hour = date.getHours();
    const minute = date.getMinutes();
    const timeStr = notificationService.formatTime(hour, minute);
    const newSettings = { ...settings, reminderTime: timeStr };
    saveSettings(newSettings);
    if (settings.notifications) {
      await notificationService.scheduleReminder(hour, minute);
    }
  };
```

- [ ] **Step 5: 通知セクションのUIを更新**

既存の通知セクション（行513-529）を以下に置き換え:

```tsx
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
                onPress={() => setShowTimePicker(true)}
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
                value={(() => {
                  const { hour, minute } = notificationService.parseTime(settings.reminderTime);
                  const d = new Date();
                  d.setHours(hour, minute, 0, 0);
                  return d;
                })()}
                mode="time"
                is24Hour={true}
                display="spinner"
                onChange={handleTimeChange}
              />
            )}
          </View>
```

- [ ] **Step 6: アプリ起動時に通知を再スケジュール**

`loadSettings` 関数内で、通知がONの場合にスケジュールを再登録する処理を追加。`loadSettings` の末尾に:

```typescript
      // 通知がONの場合、起動時に再スケジュール
      if (loaded.notifications) {
        const { hour, minute } = notificationService.parseTime(loaded.reminderTime || '20:00');
        notificationService.scheduleReminder(hour, minute);
      }
```

ここで `loaded` は `const loaded = { ...defaultSettings, ...JSON.parse(stored) }` で取得した値。

- [ ] **Step 7: 型エラーチェック**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: コミット**

```bash
git add services/notificationService.ts components/SettingsScreen.tsx package.json package-lock.json
git commit -m "feat: ローカル通知リマインダー実装（毎日指定時刻に記録促進通知）"
```

---

## Task 8: 最終確認・クリーンアップ

**Files:**
- Modify: `components/SettingsScreen.tsx` (minor)

- [ ] **Step 1: ダークモードトグルにdisabled状態を追加**

ダークモードは今回スコープ外なので、UIでその旨を表示。既存のダークモードSwitchに `disabled` を追加:

```tsx
              <Switch
                value={settings.darkMode}
                onValueChange={() => toggleSetting('darkMode')}
                trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
                thumbColor="#fff"
                disabled={true}
              />
```

`settingDescription` を変更:

```tsx
                <Text style={styles.settingDescription}>今後のアップデートで対応予定</Text>
```

- [ ] **Step 2: 自動バックアップも同様に disabled 化**

バックアップはクラウド連携が必要なためスコープ外。同様に disabled を追加:

```tsx
              <Switch
                value={settings.dataBackup}
                onValueChange={() => toggleSetting('dataBackup')}
                trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
                thumbColor="#fff"
                disabled={true}
              />
```

descriptionを変更:

```tsx
                <Text style={styles.settingDescription}>今後のアップデートで対応予定</Text>
```

- [ ] **Step 3: バージョン表示を更新**

```tsx
          <View style={styles.versionSection}>
            <Text style={styles.versionText}>SmartMeals v1.1.0</Text>
            <Text style={styles.copyrightText}>© 2026 SmartMeals</Text>
          </View>
```

- [ ] **Step 4: 全体の型エラーチェック**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Expo Doctor でSDK互換性確認**

```bash
npx expo-doctor
```

- [ ] **Step 6: コミット**

```bash
git add components/SettingsScreen.tsx
git commit -m "chore: 未実装機能をdisabled化 + バージョン更新"
```
