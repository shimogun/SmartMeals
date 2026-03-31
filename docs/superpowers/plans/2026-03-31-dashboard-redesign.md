# SmartMeals ダッシュボードリデザイン 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ホーム画面をダッシュボード化し、記録タブを統合して2タブ構成に簡略化。オンボーディング・食材の好み・お気に入り・栄養サマリー・血糖値紐付けを実装する。

**Architecture:** Expo Router のタブナビゲーションを3タブから2タブに変更。オンボーディングは `app/_layout.tsx` でルート判定し、未完了なら `app/onboarding.tsx` へリダイレクト。データ層は既存の AsyncStorage + サービスクラスを拡張。

**Tech Stack:** Expo 54, React Native 0.81.5, TypeScript 5.9, AsyncStorage, react-native-reanimated, react-native-gesture-handler

**Spec:** `docs/superpowers/specs/2026-03-31-dashboard-redesign-design.md`

---

## ファイル構成

### 新規作成
| ファイル | 責務 |
|---------|------|
| `app/onboarding.tsx` | オンボーディング画面（3ステップ） |
| `services/favoritesService.ts` | お気に入り料理の管理サービス |
| `types/index.ts` | 共有型定義（User, GlucoseRecord, GeneratedMeal 等） |

### 変更
| ファイル | 変更内容 |
|---------|---------|
| `types/index.ts` | User型に `foodPreferences`, `onboardingCompleted` 追加、全型をここに集約 |
| `app/_layout.tsx` | オンボーディング判定ロジック追加 |
| `app/(tabs)/_layout.tsx` | 3タブ→2タブ化 |
| `app/(tabs)/index.tsx` | 全面刷新 → ダッシュボード |
| `app/(tabs)/two.tsx` | 献立タブリニューアル（1ステップ生成、お気に入り、履歴） |
| `components/SettingsScreen.tsx` | 食材の好みセクション追加 |
| `components/DailyNutritionSummary.tsx` | ダッシュボード組み込み用に props 調整 |
| `services/localMealEngine.ts` | 食材フィルタリング・お気に入り優先ロジック |
| `services/mealStorageService.ts` | 血糖値紐付けフィールド追加 |

### 廃止
| ファイル | 理由 |
|---------|------|
| `app/(tabs)/record.tsx` | 記録機能をホームに統合 |

---

## Task 1: 共有型定義の集約

現在 `User`, `GlucoseRecord`, `WeeklyRecord`, `GeneratedMeal` が `index.tsx`, `record.tsx`, `two.tsx` に重複定義されている。まず型を1箇所に集約し、新フィールドを追加する。

**Files:**
- Create: `types/index.ts`

- [ ] **Step 1: 型定義ファイルを作成**

```typescript
// types/index.ts

export interface GlucoseRecord {
  id: string;
  value: number;
  timestamp: number;
  date: string;
  mealType: string;
  mealNote?: string;
  userId: string;
}

export interface WeeklyRecord {
  id: string;
  weekStart: string;
  weight?: number;
  exercise?: string;
  condition?: string;
  hba1c?: number;
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  };
  timestamp: number;
  userId: string;
}

export interface User {
  id: string;
  name: string;
  age: number;
  avatar: string;
  createdAt: number;
  healthData: {
    height: number;
    weight: number;
    gender: 'male' | 'female';
    activityLevel: 'light' | 'moderate' | 'high';
  };
  foodPreferences: {
    liked: string[];
    disliked: string[];
  };
  onboardingCompleted: boolean;
}

export interface GeneratedMeal {
  id: string;
  name: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  description: string;
  ingredients: string[];
  recipe: string[];
  servings: number;
  mealType?: string;
}

export interface SavedMealPlan {
  id: string;
  userId: string;
  createdAt: number;
  period: number;
  startDate: string;
  meals: { [date: string]: GeneratedMeal[] };
  userProfile: UserHealthProfile;
  name?: string;
  glucoseAtGeneration?: number;
}

export interface UserHealthProfile {
  age: number;
  gender: 'male' | 'female';
  currentGlucose: number;
  hba1c: number;
  bodyCondition: string;
  activityLevel: 'light' | 'moderate' | 'high';
  dietRestriction: string;
  selectedMainCourses: string[];
  selectedMainIngredients: string[];
  selectedSideIngredients: string[];
  height?: number;
  weight?: number;
  likedFoods?: string[];
  dislikedFoods?: string[];
}

export type TimeRange = '1week' | '1month' | '3months';

export type MealTiming = '朝' | '昼' | '夜';
```

- [ ] **Step 2: TypeScript コンパイル確認**

Run: `cd /Users/a/SmartMeals && npx tsc --noEmit types/index.ts`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add types/index.ts
git commit -m "feat: 共有型定義ファイルを作成（User, GlucoseRecord, GeneratedMeal等を集約）"
```

---

## Task 2: お気に入りサービスの作成

お気に入り料理の登録/解除/取得を管理する軽量サービス。

**Files:**
- Create: `services/favoritesService.ts`

- [ ] **Step 1: サービスファイルを作成**

```typescript
// services/favoritesService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'favorite_meals';

export interface FavoriteMeal {
  id: string;
  name: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  mealType?: string;
}

class FavoritesService {
  async getFavorites(userId: string): Promise<FavoriteMeal[]> {
    try {
      const data = await AsyncStorage.getItem(`${STORAGE_KEY}_${userId}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  async toggleFavorite(userId: string, meal: FavoriteMeal): Promise<boolean> {
    const favorites = await this.getFavorites(userId);
    const index = favorites.findIndex(f => f.id === meal.id);

    if (index >= 0) {
      favorites.splice(index, 1);
      await this.saveFavorites(userId, favorites);
      return false; // removed
    } else {
      favorites.push(meal);
      await this.saveFavorites(userId, favorites);
      return true; // added
    }
  }

  async isFavorite(userId: string, mealId: string): Promise<boolean> {
    const favorites = await this.getFavorites(userId);
    return favorites.some(f => f.id === mealId);
  }

  async getFavoriteIds(userId: string): Promise<Set<string>> {
    const favorites = await this.getFavorites(userId);
    return new Set(favorites.map(f => f.id));
  }

  private async saveFavorites(userId: string, favorites: FavoriteMeal[]): Promise<void> {
    await AsyncStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(favorites));
  }
}

const favoritesService = new FavoritesService();
export default favoritesService;
```

- [ ] **Step 2: TypeScript コンパイル確認**

Run: `cd /Users/a/SmartMeals && npx tsc --noEmit services/favoritesService.ts`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add services/favoritesService.ts
git commit -m "feat: お気に入り料理管理サービスを作成"
```

---

## Task 3: mealStorageService に血糖値紐付けを追加

**Files:**
- Modify: `services/mealStorageService.ts`

- [ ] **Step 1: SavedMealPlan の import を types/index.ts に切り替え、saveMealPlan に glucoseAtGeneration パラメータを追加**

`services/mealStorageService.ts` の先頭の import と SavedMealPlan/GeneratedMeal インターフェース定義を削除し、`types/index.ts` からの import に置き換える。

`saveMealPlan` メソッドのパラメータに `glucoseAtGeneration?: number` を追加し、保存オブジェクトに含める。

変更前（ファイル先頭 line 1-27）:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserHealthProfile } from './secureAiService';

// ... SavedMealPlan interface definition ...
// ... GeneratedMeal interface definition ...
```

変更後:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedMealPlan, GeneratedMeal, UserHealthProfile } from '../types';
```

`saveMealPlan` メソッド（現在 line 33-68）に `glucoseAtGeneration` を追加:

変更前:
```typescript
async saveMealPlan(
  userId: string,
  period: number,
  startDate: string,
  meals: { [date: string]: GeneratedMeal[] },
  userProfile: UserHealthProfile,
  name?: string
): Promise<SavedMealPlan> {
```

変更後:
```typescript
async saveMealPlan(
  userId: string,
  period: number,
  startDate: string,
  meals: { [date: string]: GeneratedMeal[] },
  userProfile: UserHealthProfile,
  name?: string,
  glucoseAtGeneration?: number
): Promise<SavedMealPlan> {
```

保存オブジェクト作成部分（`const newPlan: SavedMealPlan = {` ブロック）に追加:
```typescript
glucoseAtGeneration,
```

- [ ] **Step 2: アプリ起動確認**

Run: `cd /Users/a/SmartMeals && npx expo start --android`
Expected: コンパイルエラーなし（既存の呼び出し元は optional パラメータなので影響なし）

- [ ] **Step 3: コミット**

```bash
git add services/mealStorageService.ts
git commit -m "feat: 献立保存時に血糖値を紐付け（#2）"
```

---

## Task 4: localMealEngine に食材フィルタリングとお気に入り優先を追加

**Files:**
- Modify: `services/localMealEngine.ts`

- [ ] **Step 1: UserHealthProfile の import を types/index.ts に切り替え**

`services/localMealEngine.ts` の先頭で `UserHealthProfile` と `GeneratedMeal` を `types/index.ts` から import するよう変更。既存のインターフェース定義（現在 line 4-52）を削除し、import に置き換える。

変更前:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// UserHealthProfile, GeneratedMeal, MealTemplate のインターフェース定義...
```

変更後:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserHealthProfile, GeneratedMeal } from '../types';

interface MealTemplate {
  id: string;
  name: string;
  category: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  description: string;
  ingredients: string[];
  recipe: string[];
  servings: number;
}
```

- [ ] **Step 2: filterMealsForUser に食材好み/苦手フィルタリングを追加**

既存の `filterMealsForUser` メソッド（現在 line 486-498 付近）を拡張。

変更後:
```typescript
filterMealsForUser(templates: MealTemplate[], profile: UserHealthProfile): MealTemplate[] {
  let filtered = templates;

  // 既存の糖質制限フィルタリング（現在のロジックを維持）
  if (profile.dietRestriction === 'strict') {
    filtered = filtered.filter(t => t.carbs < 40);
  }

  // 苦手な食材を除外
  if (profile.dislikedFoods && profile.dislikedFoods.length > 0) {
    filtered = filtered.filter(template => {
      const ingredientsText = template.ingredients.join(' ').toLowerCase();
      return !profile.dislikedFoods!.some(food =>
        ingredientsText.includes(food.toLowerCase())
      );
    });
  }

  // フィルタ後にテンプレートが0件にならないよう最低1件は確保
  if (filtered.length === 0) {
    filtered = templates.slice(0, 1);
  }

  return filtered;
}
```

- [ ] **Step 3: generatePersonalizedMeals にお気に入り優先ロジックを追加**

`generatePersonalizedMeals` メソッド（現在 line 344-407 付近）内の `selectMeal` 呼び出し前に、お気に入り料理を優先するロジックを追加。

`generatePersonalizedMeals` のパラメータに `favoriteIds?: string[]` を追加:

```typescript
async generatePersonalizedMeals(
  userProfile: UserHealthProfile,
  periodDays: number = 3,
  servings: number = 1,
  startDate?: string,
  favoriteIds?: string[]
): Promise<{ [date: string]: GeneratedMeal[] }> {
```

`selectMeal` メソッドを拡張して、お気に入りを優先:

```typescript
selectMeal(
  templates: MealTemplate[],
  category: string,
  usedIds: Set<string>,
  favoriteIds?: string[]
): MealTemplate {
  const categoryTemplates = templates.filter(t => t.category === category);
  if (categoryTemplates.length === 0) {
    return templates[0];
  }

  // お気に入りかつ未使用のテンプレートを優先
  if (favoriteIds && favoriteIds.length > 0) {
    const favUnused = categoryTemplates.filter(
      t => favoriteIds.includes(t.id) && !usedIds.has(t.id)
    );
    if (favUnused.length > 0) {
      const selected = favUnused[Math.floor(Math.random() * favUnused.length)];
      usedIds.add(selected.id);
      return selected;
    }
  }

  // 未使用のテンプレートから選択
  const unused = categoryTemplates.filter(t => !usedIds.has(t.id));
  const pool = unused.length > 0 ? unused : categoryTemplates;
  const selected = pool[Math.floor(Math.random() * pool.length)];
  usedIds.add(selected.id);
  return selected;
}
```

- [ ] **Step 4: アプリ起動確認**

Run: `cd /Users/a/SmartMeals && npx expo start --android`
Expected: コンパイルエラーなし

- [ ] **Step 5: コミット**

```bash
git add services/localMealEngine.ts
git commit -m "feat: 食材フィルタリングとお気に入り優先ロジックを追加（#6）"
```

---

## Task 5: オンボーディング画面の作成

**Files:**
- Create: `app/onboarding.tsx`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: オンボーディング画面を作成**

```typescript
// app/onboarding.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { User } from '../types';

// 食材データ（two.tsx の既存データと同じ）
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

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1: 基本情報
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');

  // Step 2: 体の情報
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [hba1c, setHba1c] = useState('');

  // Step 3: 食材の好み
  const [likedFoods, setLikedFoods] = useState<string[]>([]);
  const [dislikedFoods, setDislikedFoods] = useState<string[]>([]);

  const toggleFood = (food: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (list.includes(food)) {
      setList(list.filter(f => f !== food));
    } else {
      setList([...list, food]);
    }
  };

  const validateStep1 = (): boolean => {
    if (!name.trim()) {
      Alert.alert('入力エラー', '名前を入力してください');
      return false;
    }
    const ageNum = parseInt(age);
    if (!age || isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      Alert.alert('入力エラー', '正しい年齢を入力してください');
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (!height || isNaN(h) || h < 100 || h > 250) {
      Alert.alert('入力エラー', '正しい身長を入力してください（100-250cm）');
      return false;
    }
    if (!weight || isNaN(w) || w < 20 || w > 300) {
      Alert.alert('入力エラー', '正しい体重を入力してください（20-300kg）');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleComplete = async (skipFoodPreferences: boolean) => {
    try {
      const newUser: User = {
        id: Date.now().toString(),
        name: name.trim(),
        age: parseInt(age),
        avatar: '',
        createdAt: Date.now(),
        healthData: {
          height: parseFloat(height),
          weight: parseFloat(weight),
          gender,
          activityLevel: 'moderate',
        },
        foodPreferences: {
          liked: skipFoodPreferences ? [] : likedFoods,
          disliked: skipFoodPreferences ? [] : dislikedFoods,
        },
        onboardingCompleted: true,
      };

      // HbA1c があれば weekly_records に保存
      if (hba1c) {
        const hba1cValue = parseFloat(hba1c);
        if (!isNaN(hba1cValue) && hba1cValue >= 3 && hba1cValue <= 20) {
          const weeklyRecord = {
            id: Date.now().toString(),
            weekStart: new Date().toISOString().split('T')[0],
            hba1c: hba1cValue,
            weight: parseFloat(weight),
            timestamp: Date.now(),
            userId: newUser.id,
          };
          await AsyncStorage.setItem('weekly_records', JSON.stringify([weeklyRecord]));
        }
      }

      await AsyncStorage.setItem('users', JSON.stringify([newUser]));
      await AsyncStorage.setItem('currentUserIndex', '0');

      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('エラー', '保存に失敗しました。もう一度お試しください。');
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>基本情報</Text>
      <Text style={styles.stepDescription}>あなたに合った献立を提案するために教えてください</Text>

      <Text style={styles.label}>名前</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="名前を入力"
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>年齢</Text>
      <TextInput
        style={styles.input}
        value={age}
        onChangeText={setAge}
        placeholder="年齢を入力"
        placeholderTextColor="#999"
        keyboardType="number-pad"
      />

      <Text style={styles.label}>性別</Text>
      <View style={styles.genderRow}>
        <TouchableOpacity
          style={[styles.genderButton, gender === 'male' && styles.genderSelected]}
          onPress={() => setGender('male')}
        >
          <Text style={[styles.genderText, gender === 'male' && styles.genderTextSelected]}>男性</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.genderButton, gender === 'female' && styles.genderSelected]}
          onPress={() => setGender('female')}
        >
          <Text style={[styles.genderText, gender === 'female' && styles.genderTextSelected]}>女性</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>次へ</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>体の情報</Text>

      <Text style={styles.label}>身長 (cm)</Text>
      <TextInput
        style={styles.input}
        value={height}
        onChangeText={setHeight}
        placeholder="例: 170"
        placeholderTextColor="#999"
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>体重 (kg)</Text>
      <TextInput
        style={styles.input}
        value={weight}
        onChangeText={setWeight}
        placeholder="例: 65"
        placeholderTextColor="#999"
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>HbA1c（わかれば）</Text>
      <TextInput
        style={styles.input}
        value={hba1c}
        onChangeText={setHba1c}
        placeholder="例: 6.5"
        placeholderTextColor="#999"
        keyboardType="decimal-pad"
      />

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>次へ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>食材の好み</Text>
      <Text style={styles.stepDescription}>
        好きな食材と苦手な食材を選んでください。献立に反映されます。
      </Text>

      <Text style={styles.sectionLabel}>好きな食材</Text>
      {Object.entries({ ...FOOD_CATEGORIES.mainIngredients, ...FOOD_CATEGORIES.sideIngredients }).map(
        ([category, foods]) => (
          <View key={category}>
            <Text style={styles.categoryLabel}>{category}</Text>
            <View style={styles.foodGrid}>
              {foods.map(food => (
                <TouchableOpacity
                  key={food}
                  style={[styles.foodChip, likedFoods.includes(food) && styles.foodChipLiked]}
                  onPress={() => toggleFood(food, likedFoods, setLikedFoods)}
                >
                  <Text style={[styles.foodChipText, likedFoods.includes(food) && styles.foodChipTextSelected]}>
                    {food}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )
      )}

      <Text style={[styles.sectionLabel, { marginTop: 20 }]}>苦手な食材</Text>
      {Object.entries({ ...FOOD_CATEGORIES.mainIngredients, ...FOOD_CATEGORIES.sideIngredients }).map(
        ([category, foods]) => (
          <View key={`dislike-${category}`}>
            <Text style={styles.categoryLabel}>{category}</Text>
            <View style={styles.foodGrid}>
              {foods.map(food => (
                <TouchableOpacity
                  key={food}
                  style={[styles.foodChip, dislikedFoods.includes(food) && styles.foodChipDisliked]}
                  onPress={() => toggleFood(food, dislikedFoods, setDislikedFoods)}
                >
                  <Text style={[styles.foodChipText, dislikedFoods.includes(food) && styles.foodChipTextSelected]}>
                    {food}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={() => handleComplete(false)}>
          <Text style={styles.nextButtonText}>完了</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.skipButton} onPress={() => handleComplete(true)}>
        <Text style={styles.skipButtonText}>スキップ（あとで設定から登録できます）</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ステップインジケーター */}
        <View style={styles.stepIndicator}>
          {[1, 2, 3].map(s => (
            <View
              key={s}
              style={[styles.stepDot, s === step && styles.stepDotActive, s < step && styles.stepDotCompleted]}
            />
          ))}
        </View>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    gap: 8,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ddd',
  },
  stepDotActive: {
    backgroundColor: '#007AFF',
    width: 24,
  },
  stepDotCompleted: {
    backgroundColor: '#4CAF50',
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  genderSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  genderText: {
    fontSize: 16,
    color: '#333',
  },
  genderTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 30,
    flex: 1,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 30,
    flex: 1,
  },
  backButtonText: {
    color: '#333',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  skipButtonText: {
    color: '#999',
    fontSize: 14,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginTop: 8,
    marginBottom: 6,
  },
  foodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  foodChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  foodChipLiked: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  foodChipDisliked: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  foodChipText: {
    fontSize: 14,
    color: '#333',
  },
  foodChipTextSelected: {
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: app/_layout.tsx にオンボーディング判定を追加**

`app/_layout.tsx` を変更して、`onboarding` ルートをスタックに追加し、初回起動時の判定ロジックを入れる。

`RootLayoutNav` 関数（line 94-107）を以下に変更:

```typescript
function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 3: タブレイアウトにオンボーディング判定を追加**

`app/(tabs)/_layout.tsx` の `TabLayout` 関数の先頭に、オンボーディング未完了ならリダイレクトするロジックを追加:

```typescript
import { useEffect, useState } from 'react';  // 追加 import
import { useRouter } from 'expo-router';  // 追加 import
import AsyncStorage from '@react-native-async-storage/async-storage';  // 追加 import

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [showSettings, setShowSettings] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const usersData = await AsyncStorage.getItem('users');
      if (!usersData) {
        router.replace('/onboarding');
        return;
      }
      const users = JSON.parse(usersData);
      if (users.length === 0 || !users[0].onboardingCompleted) {
        router.replace('/onboarding');
        return;
      }
      setIsReady(true);
    } catch {
      router.replace('/onboarding');
    }
  };

  if (!isReady) {
    return null; // オンボーディング判定中は何も表示しない
  }

  // ... 以下既存のreturn文 ...
```

- [ ] **Step 4: アプリ起動確認**

Run: `cd /Users/a/SmartMeals && npx expo start --android`
Expected: 初回起動でオンボーディング画面が表示される。情報入力後にダッシュボードへ遷移する。

- [ ] **Step 5: コミット**

```bash
git add app/onboarding.tsx app/_layout.tsx app/\(tabs\)/_layout.tsx
git commit -m "feat: オンボーディング画面を実装（初回起動時に基本情報・食材の好みを登録）"
```

---

## Task 6: タブレイアウトの2タブ化

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: 3タブ→2タブに変更**

`app/(tabs)/_layout.tsx` の `Tabs` 内から `record` タブを削除し、タブ名を変更。PlusButtonIcon コンポーネントも不要になるので削除。

変更後の Tabs 部分:
```typescript
<Tabs
  screenOptions={{
    tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
    headerShown: useClientOnlyValue(false, true),
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
  {/* record.tsx をタブから非表示にする */}
  <Tabs.Screen
    name="record"
    options={{
      href: null,
    }}
  />
</Tabs>
```

注: Expo Router ではファイルが `(tabs)/` 内に存在する限りルートとして認識されるため、`href: null` で非表示にする。ファイル自体の削除は全機能完成後に行う。

- [ ] **Step 2: PlusButtonIcon と関連スタイルを削除**

`PlusButtonIcon` コンポーネント（line 21-29）と `styles.plusButtonContainer`, `styles.plusButton`（line 98-116）を削除。

- [ ] **Step 3: アプリ起動確認**

Run: `cd /Users/a/SmartMeals && npx expo start --android`
Expected: タブが「今日」「献立」の2つのみ表示される

- [ ] **Step 4: コミット**

```bash
git add app/\(tabs\)/_layout.tsx
git commit -m "feat: 3タブから2タブ構成に変更（今日・献立）"
```

---

## Task 7: ダッシュボード画面（ホーム）の実装

これが最大のタスク。`app/(tabs)/index.tsx` を全面刷新する。

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: index.tsx を全面書き換え — インポートと型、状態変数**

`app/(tabs)/index.tsx` の既存コードを全て置き換える。まずファイル先頭部分:

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, GlucoseRecord, GeneratedMeal, SavedMealPlan, MealTiming } from '../../types';
import DailyNutritionSummary from '../../components/DailyNutritionSummary';
import mealStorageService from '../../services/mealStorageService';
import localMealEngine from '../../services/localMealEngine';
import favoritesService from '../../services/favoritesService';

export default function DashboardScreen() {
  // ユーザー情報
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // 血糖値入力
  const [glucoseValue, setGlucoseValue] = useState('');
  const [mealTiming, setMealTiming] = useState<MealTiming>('朝');
  const [latestGlucose, setLatestGlucose] = useState<GlucoseRecord | null>(null);

  // 体重・血圧入力（アコーディオン）
  const [showExtraInputs, setShowExtraInputs] = useState(false);
  const [weightValue, setWeightValue] = useState('');
  const [systolicValue, setSystolicValue] = useState('');
  const [diastolicValue, setDiastolicValue] = useState('');

  // 今日の献立
  const [todayMeals, setTodayMeals] = useState<GeneratedMeal[]>([]);
  const [selectedMealDetail, setSelectedMealDetail] = useState<GeneratedMeal | null>(null);
  const [showMealModal, setShowMealModal] = useState(false);

  // お気に入り
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // リフレッシュ
  const [refreshing, setRefreshing] = useState(false);

  // 献立更新メッセージ
  const [updateMessage, setUpdateMessage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
```

- [ ] **Step 2: データロード関数群**

```typescript
  const today = new Date().toISOString().split('T')[0];

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'おはようございます';
    if (hour < 18) return 'こんにちは';
    return 'こんばんは';
  };

  const loadData = useCallback(async () => {
    try {
      // ユーザー情報
      const usersData = await AsyncStorage.getItem('users');
      const indexData = await AsyncStorage.getItem('currentUserIndex');
      if (usersData) {
        const users: User[] = JSON.parse(usersData);
        const index = indexData ? parseInt(indexData) : 0;
        const user = users[index] || users[0];
        // 既存ユーザーデータの互換性補完
        if (!user.foodPreferences) {
          user.foodPreferences = { liked: [], disliked: [] };
        }
        if (user.onboardingCompleted === undefined) {
          user.onboardingCompleted = true;
        }
        setCurrentUser(user);

        // お気に入り
        const favIds = await favoritesService.getFavoriteIds(user.id);
        setFavoriteIds(favIds);
      }

      // 直近の血糖値
      const glucoseData = await AsyncStorage.getItem('glucose_records');
      if (glucoseData) {
        const records: GlucoseRecord[] = JSON.parse(glucoseData);
        if (records.length > 0) {
          const sorted = records.sort((a, b) => b.timestamp - a.timestamp);
          setLatestGlucose(sorted[0]);
        }
      }

      // 今日の献立
      const plans = await mealStorageService.getSavedMealPlans();
      if (plans.length > 0) {
        for (const plan of plans) {
          if (plan.meals[today]) {
            setTodayMeals(plan.meals[today]);
            break;
          }
        }
      }

      // 献立更新メッセージ生成
      generateUpdateMessage();
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    }
  }, [today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const generateUpdateMessage = async () => {
    const glucoseData = await AsyncStorage.getItem('glucose_records');
    if (!glucoseData) {
      setUpdateMessage('献立を生成して、毎日の食事管理を始めましょう');
      return;
    }
    const records: GlucoseRecord[] = JSON.parse(glucoseData);
    const recent = records
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
    
    if (recent.length === 0) {
      setUpdateMessage('献立を生成して、毎日の食事管理を始めましょう');
      return;
    }

    const avgGlucose = recent.reduce((sum, r) => sum + r.value, 0) / recent.length;
    if (avgGlucose > 180) {
      setUpdateMessage('血糖値が高めの傾向です。糖質控えめの献立を提案します');
    } else if (avgGlucose > 140) {
      setUpdateMessage('血糖値がやや高めです。バランスの良い献立を提案します');
    } else {
      setUpdateMessage('血糖値は安定しています。現在の食事を継続しましょう');
    }
  };
```

- [ ] **Step 3: 記録保存関数群**

```typescript
  const saveGlucose = async () => {
    if (!currentUser) return;
    const value = parseFloat(glucoseValue);
    if (isNaN(value) || value < 20 || value > 600) {
      Alert.alert('入力エラー', '血糖値は20〜600の範囲で入力してください');
      return;
    }

    const record: GlucoseRecord = {
      id: Date.now().toString(),
      value,
      timestamp: Date.now(),
      date: today,
      mealType: mealTiming,
      userId: currentUser.id,
    };

    try {
      const existing = await AsyncStorage.getItem('glucose_records');
      const records: GlucoseRecord[] = existing ? JSON.parse(existing) : [];
      records.push(record);
      await AsyncStorage.setItem('glucose_records', JSON.stringify(records));
      setLatestGlucose(record);
      setGlucoseValue('');
      Alert.alert('保存完了', `血糖値 ${value} mg/dL を記録しました`);
      generateUpdateMessage();
    } catch {
      Alert.alert('エラー', '保存に失敗しました');
    }
  };

  const saveWeightAndBP = async () => {
    if (!currentUser) return;
    const hasWeight = weightValue.trim() !== '';
    const hasBP = systolicValue.trim() !== '' && diastolicValue.trim() !== '';

    if (!hasWeight && !hasBP) {
      Alert.alert('入力エラー', '体重または血圧を入力してください');
      return;
    }

    try {
      const existing = await AsyncStorage.getItem('weekly_records');
      const records = existing ? JSON.parse(existing) : [];

      const record: any = {
        id: Date.now().toString(),
        weekStart: today,
        timestamp: Date.now(),
        userId: currentUser.id,
      };

      if (hasWeight) {
        const w = parseFloat(weightValue);
        if (isNaN(w) || w < 20 || w > 300) {
          Alert.alert('入力エラー', '体重は20〜300kgの範囲で入力してください');
          return;
        }
        record.weight = w;
      }

      if (hasBP) {
        const sys = parseInt(systolicValue);
        const dia = parseInt(diastolicValue);
        if (isNaN(sys) || isNaN(dia) || sys < 60 || sys > 260 || dia < 30 || dia > 160) {
          Alert.alert('入力エラー', '正しい血圧値を入力してください');
          return;
        }
        record.bloodPressure = { systolic: sys, diastolic: dia };
      }

      records.push(record);
      await AsyncStorage.setItem('weekly_records', JSON.stringify(records));
      setWeightValue('');
      setSystolicValue('');
      setDiastolicValue('');
      setShowExtraInputs(false);
      Alert.alert('保存完了', '記録しました');
    } catch {
      Alert.alert('エラー', '保存に失敗しました');
    }
  };

  const toggleFavorite = async (meal: GeneratedMeal) => {
    if (!currentUser) return;
    const added = await favoritesService.toggleFavorite(currentUser.id, {
      id: meal.id,
      name: meal.name,
      calories: meal.calories,
      carbs: meal.carbs,
      protein: meal.protein,
      fat: meal.fat,
      mealType: meal.mealType,
    });
    const newIds = await favoritesService.getFavoriteIds(currentUser.id);
    setFavoriteIds(newIds);
  };

  const handleUpdateMeals = async () => {
    if (!currentUser) return;
    setIsUpdating(true);
    try {
      const glucoseData = await AsyncStorage.getItem('glucose_records');
      const records: GlucoseRecord[] = glucoseData ? JSON.parse(glucoseData) : [];
      const recentGlucose = records.length > 0
        ? records.sort((a, b) => b.timestamp - a.timestamp)[0].value
        : 120;

      const weeklyData = await AsyncStorage.getItem('weekly_records');
      const weeklyRecords = weeklyData ? JSON.parse(weeklyData) : [];
      const latestHba1c = weeklyRecords.length > 0
        ? weeklyRecords.sort((a: any, b: any) => b.timestamp - a.timestamp)
            .find((r: any) => r.hba1c)?.hba1c || 6.0
        : 6.0;

      const favIds = await favoritesService.getFavoriteIds(currentUser.id);

      const profile = {
        age: currentUser.age,
        gender: currentUser.healthData.gender,
        currentGlucose: recentGlucose,
        hba1c: latestHba1c,
        bodyCondition: 'normal',
        activityLevel: currentUser.healthData.activityLevel,
        dietRestriction: 'normal',
        selectedMainCourses: [],
        selectedMainIngredients: [],
        selectedSideIngredients: [],
        height: currentUser.healthData.height,
        weight: currentUser.healthData.weight,
        likedFoods: currentUser.foodPreferences.liked,
        dislikedFoods: currentUser.foodPreferences.disliked,
      };

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startDate = tomorrow.toISOString().split('T')[0];

      const meals = await localMealEngine.generatePersonalizedMeals(
        profile, 3, 1, startDate, Array.from(favIds)
      );

      await mealStorageService.saveMealPlan(
        currentUser.id, 3, startDate, meals, profile, undefined, recentGlucose
      );

      Alert.alert('更新完了', '明日からの献立を更新しました');
      await loadData();
    } catch (error) {
      Alert.alert('エラー', '献立の更新に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };
```

- [ ] **Step 4: レンダリング部分 — 健康情報セクション**

```typescript
  const formatDate = (): string => {
    const now = new Date();
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${now.getMonth() + 1}/${now.getDate()}（${days[now.getDay()]}）`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* 挨拶/日付/名前 */}
      <View style={styles.greetingSection}>
        <Text style={styles.greetingText}>{getGreeting()}</Text>
        <Text style={styles.dateText}>{formatDate()} {currentUser?.name}さん</Text>
      </View>

      {/* ===== 健康情報セクション ===== */}
      <View style={styles.sectionHeader}>
        <Ionicons name="heart" size={18} color="#E91E63" />
        <Text style={styles.sectionHeaderText}>健康情報</Text>
      </View>

      {/* 血糖値入力 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>血糖値</Text>
        <View style={styles.glucoseInputRow}>
          <TextInput
            style={styles.glucoseInput}
            value={glucoseValue}
            onChangeText={setGlucoseValue}
            placeholder="値を入力"
            placeholderTextColor="#999"
            keyboardType="number-pad"
          />
          <Text style={styles.unit}>mg/dL</Text>
          <View style={styles.mealTimingRow}>
            {(['朝', '昼', '夜'] as MealTiming[]).map(timing => (
              <TouchableOpacity
                key={timing}
                style={[styles.timingButton, mealTiming === timing && styles.timingButtonActive]}
                onPress={() => setMealTiming(timing)}
              >
                <Text style={[styles.timingText, mealTiming === timing && styles.timingTextActive]}>
                  {timing}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.saveButton} onPress={saveGlucose}>
            <Text style={styles.saveButtonText}>保存</Text>
          </TouchableOpacity>
        </View>
        {latestGlucose && (
          <Text style={styles.latestValue}>
            直近: {latestGlucose.value} mg/dL（{latestGlucose.mealType}）
          </Text>
        )}
      </View>

      {/* 体重・血圧（アコーディオン） */}
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={() => setShowExtraInputs(!showExtraInputs)}
      >
        <Ionicons
          name={showExtraInputs ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#666"
        />
        <Text style={styles.accordionHeaderText}>体重・血圧も記録する</Text>
      </TouchableOpacity>

      {showExtraInputs && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>体重</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.smallInput}
              value={weightValue}
              onChangeText={setWeightValue}
              placeholder="体重"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
            />
            <Text style={styles.unit}>kg</Text>
          </View>

          <Text style={[styles.cardTitle, { marginTop: 12 }]}>血圧</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.smallInput}
              value={systolicValue}
              onChangeText={setSystolicValue}
              placeholder="上"
              placeholderTextColor="#999"
              keyboardType="number-pad"
            />
            <Text style={styles.unit}>/</Text>
            <TextInput
              style={styles.smallInput}
              value={diastolicValue}
              onChangeText={setDiastolicValue}
              placeholder="下"
              placeholderTextColor="#999"
              keyboardType="number-pad"
            />
            <Text style={styles.unit}>mmHg</Text>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={saveWeightAndBP}>
            <Text style={styles.saveButtonText}>保存</Text>
          </TouchableOpacity>
        </View>
      )}
```

- [ ] **Step 5: レンダリング部分 — 献立セクション**

```typescript
      {/* ===== 献立セクション ===== */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Ionicons name="restaurant" size={18} color="#FF9800" />
        <Text style={styles.sectionHeaderText}>献立</Text>
      </View>

      {/* 今日の献立カード */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>今日の献立</Text>
        {todayMeals.length > 0 ? (
          <View style={styles.mealCardsRow}>
            {todayMeals.map((meal, index) => {
              const timings = ['朝', '昼', '夜'];
              return (
                <TouchableOpacity
                  key={meal.id}
                  style={styles.mealCard}
                  onPress={() => { setSelectedMealDetail(meal); setShowMealModal(true); }}
                >
                  <Text style={styles.mealCardTiming}>{timings[index] || ''}</Text>
                  <Text style={styles.mealCardName} numberOfLines={2}>{meal.name}</Text>
                  <Text style={styles.mealCardCalories}>{meal.calories}kcal</Text>
                  <TouchableOpacity
                    style={styles.favoriteButton}
                    onPress={(e) => { e.stopPropagation(); toggleFavorite(meal); }}
                  >
                    <Ionicons
                      name={favoriteIds.has(meal.id) ? 'star' : 'star-outline'}
                      size={20}
                      color={favoriteIds.has(meal.id) ? '#FFD700' : '#ccc'}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyText}>
            献立タブから献立を生成してください
          </Text>
        )}
      </View>

      {/* 栄養バランス */}
      <View style={styles.card}>
        <DailyNutritionSummary date={today} />
      </View>

      {/* 明日の献立を更新 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>明日の献立を更新</Text>
        <Text style={styles.updateMessage}>{updateMessage}</Text>
        <TouchableOpacity
          style={[styles.updateButton, isUpdating && styles.updateButtonDisabled]}
          onPress={handleUpdateMeals}
          disabled={isUpdating}
        >
          <Ionicons name="refresh" size={20} color="#fff" />
          <Text style={styles.updateButtonText}>
            {isUpdating ? '更新中...' : '更新する'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* レシピ詳細モーダル */}
      <Modal visible={showMealModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowMealModal(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            {selectedMealDetail && (
              <ScrollView>
                <Text style={styles.modalTitle}>{selectedMealDetail.name}</Text>
                <Text style={styles.modalDescription}>{selectedMealDetail.description}</Text>

                <View style={styles.nutritionRow}>
                  <Text style={styles.nutritionItem}>{selectedMealDetail.calories}kcal</Text>
                  <Text style={styles.nutritionItem}>糖質{selectedMealDetail.carbs}g</Text>
                  <Text style={styles.nutritionItem}>タンパク{selectedMealDetail.protein}g</Text>
                  <Text style={styles.nutritionItem}>脂質{selectedMealDetail.fat}g</Text>
                </View>

                <Text style={styles.modalSectionTitle}>材料</Text>
                {selectedMealDetail.ingredients.map((ing, i) => (
                  <Text key={i} style={styles.ingredientText}>・{ing}</Text>
                ))}

                <Text style={styles.modalSectionTitle}>作り方</Text>
                {selectedMealDetail.recipe.map((step, i) => (
                  <Text key={i} style={styles.recipeStep}>{i + 1}. {step}</Text>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
```

- [ ] **Step 6: スタイル定義**

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  greetingSection: {
    padding: 20,
    paddingBottom: 8,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  dateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 6,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  glucoseInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  glucoseInput: {
    flex: 1,
    minWidth: 80,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
    fontSize: 18,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  unit: {
    fontSize: 14,
    color: '#666',
  },
  mealTimingRow: {
    flexDirection: 'row',
    gap: 4,
  },
  timingButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  timingButtonActive: {
    backgroundColor: '#007AFF',
  },
  timingText: {
    fontSize: 14,
    color: '#666',
  },
  timingTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  latestValue: {
    fontSize: 13,
    color: '#888',
    marginTop: 8,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 6,
  },
  accordionHeaderText: {
    fontSize: 14,
    color: '#666',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallInput: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  mealCardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mealCard: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    position: 'relative',
  },
  mealCardTiming: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  mealCardName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  mealCardCalories: {
    fontSize: 12,
    color: '#666',
  },
  favoriteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  updateMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  updateButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalClose: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  nutritionItem: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  ingredientText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 2,
  },
  recipeStep: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
    lineHeight: 20,
  },
});
```

- [ ] **Step 7: アプリ起動・実機確認**

Run: `cd /Users/a/SmartMeals && npx expo start --android`
Expected: ホーム画面がダッシュボード形式で表示される。上半分に健康情報（血糖値入力、体重・血圧アコーディオン）、下半分に献立セクション（今日の献立カード、栄養バランス、明日の献立更新ボタン）。

- [ ] **Step 8: コミット**

```bash
git add app/\(tabs\)/index.tsx
git commit -m "feat: ホーム画面をダッシュボード化（健康記録＋今日の献立を統合）"
```

---

## Task 8: 献立タブのリニューアル

`app/(tabs)/two.tsx` を簡略化。3ステップウィザード → 1ステップモーダル生成に変更。

**Files:**
- Modify: `app/(tabs)/two.tsx`

- [ ] **Step 1: two.tsx を全面書き換え — インポートと状態変数**

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  TextInput,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, GeneratedMeal, SavedMealPlan, UserHealthProfile, GlucoseRecord } from '../../types';
import localMealEngine from '../../services/localMealEngine';
import mealStorageService from '../../services/mealStorageService';
import favoritesService, { FavoriteMeal } from '../../services/favoritesService';

export default function MealPlanScreen() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // 保存済み献立
  const [savedPlans, setSavedPlans] = useState<SavedMealPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SavedMealPlan | null>(null);
  const [showPlanDetail, setShowPlanDetail] = useState(false);

  // お気に入り
  const [favorites, setFavorites] = useState<FavoriteMeal[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // 献立生成モーダル
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [period, setPeriod] = useState(3);
  const [servings, setServings] = useState(1);
  const [restriction, setRestriction] = useState('normal');
  const [isGenerating, setIsGenerating] = useState(false);

  // レシピ詳細モーダル
  const [selectedMeal, setSelectedMeal] = useState<GeneratedMeal | null>(null);
  const [showMealModal, setShowMealModal] = useState(false);
```

- [ ] **Step 2: データロードと生成ロジック**

```typescript
  const loadData = useCallback(async () => {
    try {
      const usersData = await AsyncStorage.getItem('users');
      const indexData = await AsyncStorage.getItem('currentUserIndex');
      if (usersData) {
        const users: User[] = JSON.parse(usersData);
        const index = indexData ? parseInt(indexData) : 0;
        const user = users[index] || users[0];
        if (!user.foodPreferences) {
          user.foodPreferences = { liked: [], disliked: [] };
        }
        setCurrentUser(user);

        // 保存済み献立
        const plans = await mealStorageService.getUserMealPlans(user.id);
        setSavedPlans(plans);

        // お気に入り
        const favs = await favoritesService.getFavorites(user.id);
        setFavorites(favs);
        const ids = await favoritesService.getFavoriteIds(user.id);
        setFavoriteIds(ids);
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerate = async () => {
    if (!currentUser) return;
    setIsGenerating(true);
    try {
      // 直近の血糖値を自動取得
      const glucoseData = await AsyncStorage.getItem('glucose_records');
      const glucoseRecords: GlucoseRecord[] = glucoseData ? JSON.parse(glucoseData) : [];
      const recentGlucose = glucoseRecords.length > 0
        ? glucoseRecords.sort((a, b) => b.timestamp - a.timestamp)[0].value
        : 120;

      // HbA1c を自動取得
      const weeklyData = await AsyncStorage.getItem('weekly_records');
      const weeklyRecords = weeklyData ? JSON.parse(weeklyData) : [];
      const latestHba1c = weeklyRecords
        .sort((a: any, b: any) => b.timestamp - a.timestamp)
        .find((r: any) => r.hba1c)?.hba1c || 6.0;

      const profile: UserHealthProfile = {
        age: currentUser.age,
        gender: currentUser.healthData.gender,
        currentGlucose: recentGlucose,
        hba1c: latestHba1c,
        bodyCondition: 'normal',
        activityLevel: currentUser.healthData.activityLevel,
        dietRestriction: restriction,
        selectedMainCourses: [],
        selectedMainIngredients: [],
        selectedSideIngredients: [],
        height: currentUser.healthData.height,
        weight: currentUser.healthData.weight,
        likedFoods: currentUser.foodPreferences.liked,
        dislikedFoods: currentUser.foodPreferences.disliked,
      };

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startDate = tomorrow.toISOString().split('T')[0];

      const favIds = Array.from(favoriteIds);
      const meals = await localMealEngine.generatePersonalizedMeals(
        profile, period, servings, startDate, favIds
      );

      await mealStorageService.saveMealPlan(
        currentUser.id, period, startDate, meals, profile, undefined, recentGlucose
      );

      setShowGenerateModal(false);
      Alert.alert('完了', `${period}日分の献立を生成しました`);
      await loadData();
    } catch (error) {
      Alert.alert('エラー', '献立の生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const deletePlan = async (planId: string) => {
    Alert.alert('確認', 'この献立を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          await mealStorageService.deleteMealPlan(planId);
          await loadData();
        },
      },
    ]);
  };

  const toggleFavorite = async (meal: GeneratedMeal) => {
    if (!currentUser) return;
    await favoritesService.toggleFavorite(currentUser.id, {
      id: meal.id,
      name: meal.name,
      calories: meal.calories,
      carbs: meal.carbs,
      protein: meal.protein,
      fat: meal.fat,
      mealType: meal.mealType,
    });
    await loadData();
  };
```

- [ ] **Step 3: レンダリング — メイン画面**

```typescript
  return (
    <ScrollView style={styles.container}>
      {/* 保存済み献立一覧 */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>保存済み献立</Text>
      </View>

      {savedPlans.length > 0 ? (
        savedPlans.map(plan => (
          <TouchableOpacity
            key={plan.id}
            style={styles.planCard}
            onPress={() => { setSelectedPlan(plan); setShowPlanDetail(true); }}
          >
            <View style={styles.planCardHeader}>
              <Text style={styles.planCardTitle}>
                {plan.name || `${plan.startDate}〜 の献立`}
              </Text>
              <TouchableOpacity onPress={() => deletePlan(plan.id)}>
                <Ionicons name="trash-outline" size={18} color="#999" />
              </TouchableOpacity>
            </View>
            <Text style={styles.planCardMeta}>
              {plan.period}日分・{Object.values(plan.meals).flat().length}食
              {plan.glucoseAtGeneration ? ` ・生成時血糖値: ${plan.glucoseAtGeneration}mg/dL` : ''}
            </Text>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.emptyText}>保存済みの献立はありません</Text>
      )}

      {/* お気に入り一覧 */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>お気に入り</Text>
      </View>

      {favorites.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.favoritesScroll}>
          {favorites.map(fav => (
            <View key={fav.id} style={styles.favoriteCard}>
              <Text style={styles.favoriteCardName} numberOfLines={2}>{fav.name}</Text>
              <Text style={styles.favoriteCardCalories}>{fav.calories}kcal</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.emptyText}>献立の★ボタンでお気に入り登録できます</Text>
      )}

      {/* 新しい献立を作るボタン */}
      <TouchableOpacity
        style={styles.generateButton}
        onPress={() => setShowGenerateModal(true)}
      >
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.generateButtonText}>新しい献立を作る</Text>
      </TouchableOpacity>

      {/* 献立生成モーダル */}
      <Modal visible={showGenerateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>献立を作成</Text>
              <TouchableOpacity onPress={() => setShowGenerateModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>期間</Text>
            <View style={styles.optionRow}>
              {[3, 5, 7].map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.optionButton, period === d && styles.optionButtonActive]}
                  onPress={() => setPeriod(d)}
                >
                  <Text style={[styles.optionText, period === d && styles.optionTextActive]}>{d}日</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>人数</Text>
            <View style={styles.optionRow}>
              {[1, 2, 3, 4].map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.optionButton, servings === s && styles.optionButtonActive]}
                  onPress={() => setServings(s)}
                >
                  <Text style={[styles.optionText, servings === s && styles.optionTextActive]}>{s}人</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>制限レベル</Text>
            <View style={styles.optionRow}>
              {[
                { key: 'relaxed', label: 'ゆるめ' },
                { key: 'normal', label: 'ふつう' },
                { key: 'strict', label: 'きびしめ' },
              ].map(r => (
                <TouchableOpacity
                  key={r.key}
                  style={[styles.optionButton, restriction === r.key && styles.optionButtonActive]}
                  onPress={() => setRestriction(r.key)}
                >
                  <Text style={[styles.optionText, restriction === r.key && styles.optionTextActive]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.autoNote}>
              血糖値・HbA1c・食材の好みは自動で反映されます
            </Text>

            <TouchableOpacity
              style={[styles.createButton, isGenerating && styles.createButtonDisabled]}
              onPress={handleGenerate}
              disabled={isGenerating}
            >
              <Text style={styles.createButtonText}>
                {isGenerating ? '生成中...' : '作成する'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
```

- [ ] **Step 4: レンダリング — 献立詳細モーダルとレシピモーダル**

```typescript
      {/* 献立詳細モーダル */}
      <Modal visible={showPlanDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedPlan?.name || '献立詳細'}
              </Text>
              <TouchableOpacity onPress={() => setShowPlanDetail(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {selectedPlan && (
              <ScrollView>
                {Object.entries(selectedPlan.meals)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, meals]) => (
                    <View key={date} style={styles.daySection}>
                      <Text style={styles.dayTitle}>{date}</Text>
                      {meals.map((meal, i) => {
                        const timings = ['朝', '昼', '夜'];
                        return (
                          <TouchableOpacity
                            key={meal.id}
                            style={styles.mealRow}
                            onPress={() => { setSelectedMeal(meal); setShowMealModal(true); }}
                          >
                            <Text style={styles.mealTiming}>{timings[i] || ''}</Text>
                            <View style={styles.mealInfo}>
                              <Text style={styles.mealName}>{meal.name}</Text>
                              <Text style={styles.mealCalories}>{meal.calories}kcal</Text>
                            </View>
                            <TouchableOpacity onPress={() => toggleFavorite(meal)}>
                              <Ionicons
                                name={favoriteIds.has(meal.id) ? 'star' : 'star-outline'}
                                size={20}
                                color={favoriteIds.has(meal.id) ? '#FFD700' : '#ccc'}
                              />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* レシピ詳細モーダル */}
      <Modal visible={showMealModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowMealModal(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            {selectedMeal && (
              <ScrollView>
                <Text style={styles.recipeTitle}>{selectedMeal.name}</Text>
                <Text style={styles.recipeDescription}>{selectedMeal.description}</Text>

                <View style={styles.nutritionRow}>
                  <Text style={styles.nutritionItem}>{selectedMeal.calories}kcal</Text>
                  <Text style={styles.nutritionItem}>糖質{selectedMeal.carbs}g</Text>
                  <Text style={styles.nutritionItem}>タンパク{selectedMeal.protein}g</Text>
                  <Text style={styles.nutritionItem}>脂質{selectedMeal.fat}g</Text>
                </View>

                <Text style={styles.recipeSectionTitle}>材料</Text>
                {selectedMeal.ingredients.map((ing, i) => (
                  <Text key={i} style={styles.ingredientText}>・{ing}</Text>
                ))}

                <Text style={styles.recipeSectionTitle}>作り方</Text>
                {selectedMeal.recipe.map((step, i) => (
                  <Text key={i} style={styles.recipeStep}>{i + 1}. {step}</Text>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
```

- [ ] **Step 5: スタイル定義**

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  planCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  planCardMeta: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  favoritesScroll: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  favoriteCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginRight: 8,
    width: 120,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  favoriteCardName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  favoriteCardCalories: {
    fontSize: 12,
    color: '#666',
  },
  generateButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: '#007AFF',
  },
  optionText: {
    fontSize: 15,
    color: '#333',
  },
  optionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  autoNote: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
  createButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  daySection: {
    marginBottom: 16,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
    gap: 8,
  },
  mealTiming: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 24,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  mealCalories: {
    fontSize: 13,
    color: '#888',
  },
  recipeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  recipeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  nutritionItem: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  recipeSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  ingredientText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 2,
  },
  recipeStep: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
    lineHeight: 20,
  },
});
```

- [ ] **Step 6: アプリ起動・実機確認**

Run: `cd /Users/a/SmartMeals && npx expo start --android`
Expected: 献立タブに保存済み献立一覧、お気に入り横スクロール、「新しい献立を作る」ボタンが表示される。ボタンタップで1ステップ生成モーダルが開く。

- [ ] **Step 7: コミット**

```bash
git add app/\(tabs\)/two.tsx
git commit -m "feat: 献立タブをリニューアル（1ステップ生成、お気に入り、血糖値紐付け）"
```

---

## Task 9: 設定画面に食材の好みセクションを追加

**Files:**
- Modify: `components/SettingsScreen.tsx`

- [ ] **Step 1: 食材データとstateを追加**

`components/SettingsScreen.tsx` の先頭に食材カテゴリデータを追加し、state変数を拡張。

import 文の後に追加:
```typescript
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
```

既存の state 変数群（line 57-65 付近）に追加:
```typescript
const [editingFoodPreferences, setEditingFoodPreferences] = useState(false);
const [likedFoods, setLikedFoods] = useState<string[]>([]);
const [dislikedFoods, setDislikedFoods] = useState<string[]>([]);
const [showFoodModal, setShowFoodModal] = useState<'liked' | 'disliked' | null>(null);
```

- [ ] **Step 2: 食材の好みのロード・保存関数を追加**

`loadUser` 関数（line 100-113 付近）の中で、ユーザーの foodPreferences をロード:
```typescript
// loadUser 内の user セット後に追加:
if (userData.foodPreferences) {
  setLikedFoods(userData.foodPreferences.liked || []);
  setDislikedFoods(userData.foodPreferences.disliked || []);
}
```

新しい関数を追加:
```typescript
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
```

- [ ] **Step 3: 設定画面のレンダリングに食材セクションを追加**

既存の設定項目（プロフィールセクション）の後、アプリ設定セクションの前に食材の好みセクションを追加:

```typescript
{/* 食材の好み */}
<Text style={styles.sectionTitle}>食材の好み</Text>

<View style={styles.settingItem}>
  <Text style={styles.settingLabel}>好きな食材</Text>
  <View style={styles.foodTagsContainer}>
    {likedFoods.length > 0 ? (
      likedFoods.map(food => (
        <View key={food} style={[styles.foodTag, styles.foodTagLiked]}>
          <Text style={styles.foodTagText}>{food}</Text>
          <TouchableOpacity onPress={() => toggleFoodPreference(food, 'liked')}>
            <Ionicons name="close-circle" size={16} color="#2196F3" />
          </TouchableOpacity>
        </View>
      ))
    ) : (
      <Text style={styles.emptyFoodText}>未登録</Text>
    )}
    <TouchableOpacity
      style={styles.addFoodButton}
      onPress={() => setShowFoodModal('liked')}
    >
      <Ionicons name="add" size={20} color="#007AFF" />
    </TouchableOpacity>
  </View>
</View>

<View style={styles.settingItem}>
  <Text style={styles.settingLabel}>苦手な食材</Text>
  <View style={styles.foodTagsContainer}>
    {dislikedFoods.length > 0 ? (
      dislikedFoods.map(food => (
        <View key={food} style={[styles.foodTag, styles.foodTagDisliked]}>
          <Text style={styles.foodTagText}>{food}</Text>
          <TouchableOpacity onPress={() => toggleFoodPreference(food, 'disliked')}>
            <Ionicons name="close-circle" size={16} color="#F44336" />
          </TouchableOpacity>
        </View>
      ))
    ) : (
      <Text style={styles.emptyFoodText}>未登録</Text>
    )}
    <TouchableOpacity
      style={styles.addFoodButton}
      onPress={() => setShowFoodModal('disliked')}
    >
      <Ionicons name="add" size={20} color="#007AFF" />
    </TouchableOpacity>
  </View>
</View>

<TouchableOpacity style={styles.saveFoodButton} onPress={saveFoodPreferences}>
  <Text style={styles.saveFoodButtonText}>食材の好みを保存</Text>
</TouchableOpacity>

{/* 食材選択モーダル */}
<Modal visible={showFoodModal !== null} animationType="slide" transparent>
  <View style={styles.foodModalOverlay}>
    <View style={styles.foodModalContent}>
      <View style={styles.foodModalHeader}>
        <Text style={styles.foodModalTitle}>
          {showFoodModal === 'liked' ? '好きな食材を選択' : '苦手な食材を選択'}
        </Text>
        <TouchableOpacity onPress={() => setShowFoodModal(null)}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      <ScrollView>
        {Object.entries({ ...FOOD_CATEGORIES.mainIngredients, ...FOOD_CATEGORIES.sideIngredients }).map(
          ([category, foods]) => (
            <View key={category}>
              <Text style={styles.foodCategoryLabel}>{category}</Text>
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
          )
        )}
      </ScrollView>
    </View>
  </View>
</Modal>
```

- [ ] **Step 4: スタイルを追加**

既存の StyleSheet に追加:
```typescript
foodTagsContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 6,
  marginTop: 4,
  alignItems: 'center',
},
foodTag: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 16,
  gap: 4,
},
foodTagLiked: {
  backgroundColor: '#E3F2FD',
},
foodTagDisliked: {
  backgroundColor: '#FFEBEE',
},
foodTagText: {
  fontSize: 13,
  color: '#333',
},
emptyFoodText: {
  fontSize: 13,
  color: '#999',
},
addFoodButton: {
  width: 28,
  height: 28,
  borderRadius: 14,
  backgroundColor: '#f0f0f0',
  alignItems: 'center',
  justifyContent: 'center',
},
saveFoodButton: {
  backgroundColor: '#007AFF',
  borderRadius: 10,
  padding: 12,
  marginHorizontal: 16,
  marginTop: 8,
  alignItems: 'center',
},
saveFoodButtonText: {
  color: '#fff',
  fontSize: 15,
  fontWeight: '600',
},
foodModalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'flex-end',
},
foodModalContent: {
  backgroundColor: '#fff',
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  padding: 20,
  maxHeight: '70%',
},
foodModalHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 16,
},
foodModalTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#333',
},
foodCategoryLabel: {
  fontSize: 14,
  fontWeight: '500',
  color: '#666',
  marginTop: 12,
  marginBottom: 6,
},
foodGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},
foodChip: {
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 20,
  backgroundColor: '#f5f5f5',
  borderWidth: 1,
  borderColor: '#e0e0e0',
},
foodChipLiked: {
  backgroundColor: '#E3F2FD',
  borderColor: '#2196F3',
},
foodChipDisliked: {
  backgroundColor: '#FFEBEE',
  borderColor: '#F44336',
},
foodChipText: {
  fontSize: 14,
  color: '#333',
},
foodChipTextSelected: {
  fontWeight: '600',
},
```

- [ ] **Step 5: アプリ起動確認**

Run: `cd /Users/a/SmartMeals && npx expo start --android`
Expected: 設定画面に「食材の好み」セクションが表示される。好き/苦手な食材をタグ形式で表示・追加・削除できる。

- [ ] **Step 6: コミット**

```bash
git add components/SettingsScreen.tsx
git commit -m "feat: 設定画面に食材の好み登録機能を追加"
```

---

## Task 10: DailyNutritionSummary のダッシュボード組み込み調整

**Files:**
- Modify: `components/DailyNutritionSummary.tsx`

- [ ] **Step 1: import を types/index.ts に切り替え**

`components/DailyNutritionSummary.tsx` の import を変更:

変更前:
```typescript
import { ... } from '../services/mealStorageService';
```

変更後（GeneratedMeal の import を types から取得、mealStorageService はデフォルト import のみ）:
```typescript
import mealStorageService from '../services/mealStorageService';
import { GeneratedMeal } from '../types';
```

- [ ] **Step 2: meals を外部から渡せるように props を拡張**

現在は内部で `mealStorageService` からデータを取得しているが、ダッシュボードから直接 meals を渡せるようにもする:

変更前:
```typescript
interface DailyNutritionSummaryProps {
  date: string;
}
```

変更後:
```typescript
interface DailyNutritionSummaryProps {
  date: string;
  meals?: GeneratedMeal[];
}
```

`loadMeals` 内で props.meals が渡されていればそちらを使う:
```typescript
useEffect(() => {
  if (props.meals) {
    setMeals(props.meals);
  } else {
    loadMeals();
  }
}, [props.date, props.meals]);
```

- [ ] **Step 3: アプリ起動確認**

Run: `cd /Users/a/SmartMeals && npx expo start --android`
Expected: ダッシュボードの栄養バランスセクションが正常に表示される

- [ ] **Step 4: コミット**

```bash
git add components/DailyNutritionSummary.tsx
git commit -m "feat: DailyNutritionSummary を props 経由でも meals を受け取れるよう拡張（#8）"
```

---

## Task 11: 全体統合テストと最終調整

**Files:**
- All modified files

- [ ] **Step 1: 既存データとの互換性テスト**

AsyncStorage をクリアせずにアプリを起動し、既存ユーザーデータが正しく表示されるか確認。

Run: `cd /Users/a/SmartMeals && npx expo start --android`

確認項目:
- 既存ユーザーがいる場合、オンボーディングをスキップしてダッシュボードが表示される
- `foodPreferences` が未定義の既存ユーザーでもエラーにならない
- 既存の保存済み献立が献立タブに表示される
- 既存の血糖値記録がダッシュボードに直近値として表示される

- [ ] **Step 2: 新規ユーザーフローテスト**

AsyncStorage をクリアしてアプリを起動:

Run: Expo Go アプリのキャッシュクリア or `await AsyncStorage.clear()` をデバッグコンソールで実行

確認項目:
- オンボーディング画面が表示される
- Step 1→2→3 の遷移が正常
- Step 3 でスキップしてもダッシュボードに到達する
- ダッシュボードで血糖値を入力→保存できる
- 献立タブで新規献立を生成できる
- 生成した献立がダッシュボードの「今日の献立」に表示される

- [ ] **Step 3: お気に入り・紐付けテスト**

確認項目:
- ダッシュボードの献立カードで★をタップ→お気に入り登録される
- 献立タブにお気に入り一覧が表示される
- 献立タブの詳細モーダルでも★が機能する
- 保存済み献立カードに「生成時血糖値」が表示される

- [ ] **Step 4: 体重・血圧アコーディオンテスト**

確認項目:
- 「体重・血圧も記録する」をタップで展開/折りたたみ
- 体重のみ入力→保存できる
- 血圧のみ入力→保存できる
- 両方入力→保存できる
- バリデーションが機能する（範囲外の値でエラー表示）

- [ ] **Step 5: 最終コミット**

```bash
git add -A
git commit -m "feat: ダッシュボードリデザイン完了 — 2タブ化、オンボーディング、お気に入り、栄養サマリー、血糖値紐付け（#2, #6, #8）"
```
