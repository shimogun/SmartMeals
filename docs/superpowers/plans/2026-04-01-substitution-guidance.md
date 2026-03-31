# 食材置き換え提案・医師指導値連携 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** レシピ詳細で食材の代替候補を表示・置き換え＋栄養再計算（#5）、設定画面で医師の指導値を入力し献立生成・栄養サマリー・トレンドグラフに反映（#9）。

**Architecture:** 食材置き換えは新サービスに代替データベースと計算ロジックを集約し、両画面のレシピモーダルから呼び出す。指導値はUser型にmedicalGuidance を追加し、設定→献立生成→栄養サマリー→トレンドグラフに段階的に反映。

**Tech Stack:** Expo 54, React Native 0.81.5, TypeScript 5.9, AsyncStorage, react-native-chart-kit

**Spec:** `docs/superpowers/specs/2026-04-01-substitution-guidance-design.md`

---

## ファイル構成

### 新規
| ファイル | 責務 |
|---------|------|
| `services/ingredientSubstitutionService.ts` | 代替食材データベース＋置き換え計算 |

### 変更
| ファイル | 変更内容 |
|---------|---------|
| `types/index.ts` | User に medicalGuidance、UserHealthProfile に dailyCarbLimit/dailyCalorieLimit |
| `services/localMealEngine.ts` | 糖質/カロリー上限フィルタリング |
| `components/SettingsScreen.tsx` | 指導値セクション追加 |
| `components/DailyNutritionSummary.tsx` | 指導値で目標上書き＋超過警告 |
| `app/(tabs)/index.tsx` | レシピモーダル置き換えUI＋トレンド目標ライン＋指導値props |
| `app/(tabs)/two.tsx` | レシピモーダル置き換えUI |

---

## Task 1: 型定義の拡張

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: User に medicalGuidance を追加**

`types/index.ts` の `User` インターフェースの `onboardingCompleted: boolean;` の後に追加:

```typescript
  medicalGuidance?: {
    targetHba1c?: number;
    glucoseMin?: number;
    glucoseMax?: number;
    dailyCarbLimit?: number;
    dailyCalorieLimit?: number;
  };
```

- [ ] **Step 2: UserHealthProfile に dailyCarbLimit/dailyCalorieLimit を追加**

`UserHealthProfile` の `preferLowGi?: boolean;` の後に追加:

```typescript
  dailyCarbLimit?: number;
  dailyCalorieLimit?: number;
```

- [ ] **Step 3: コンパイル確認・コミット**

Run: `npx tsc --noEmit`

```bash
git add types/index.ts
git commit -m "feat: User に medicalGuidance、UserHealthProfile に糖質/カロリー上限を追加"
```

---

## Task 2: 代替食材サービスの作成

**Files:**
- Create: `services/ingredientSubstitutionService.ts`

- [ ] **Step 1: サービスファイルを作成**

```typescript
// services/ingredientSubstitutionService.ts

export interface IngredientNutrition {
  gi: number;
  caloriesPer100g: number;
  carbsPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
}

export interface SubstituteOption {
  name: string;
  nutrition: IngredientNutrition;
}

interface SubstitutionEntry {
  nutrition: IngredientNutrition;
  substitutes: SubstituteOption[];
}

const SUBSTITUTION_DB: { [key: string]: SubstitutionEntry } = {
  '鶏むね肉': {
    nutrition: { gi: 40, caloriesPer100g: 108, carbsPer100g: 0, proteinPer100g: 22, fatPer100g: 1.5 },
    substitutes: [
      { name: 'ささみ', nutrition: { gi: 40, caloriesPer100g: 105, carbsPer100g: 0, proteinPer100g: 23, fatPer100g: 0.8 } },
      { name: '豆腐', nutrition: { gi: 42, caloriesPer100g: 56, carbsPer100g: 1.6, proteinPer100g: 5, fatPer100g: 3 } },
      { name: 'タラ', nutrition: { gi: 40, caloriesPer100g: 77, carbsPer100g: 0.1, proteinPer100g: 18, fatPer100g: 0.2 } },
    ],
  },
  'ささみ': {
    nutrition: { gi: 40, caloriesPer100g: 105, carbsPer100g: 0, proteinPer100g: 23, fatPer100g: 0.8 },
    substitutes: [
      { name: '鶏むね肉', nutrition: { gi: 40, caloriesPer100g: 108, carbsPer100g: 0, proteinPer100g: 22, fatPer100g: 1.5 } },
      { name: 'エビ', nutrition: { gi: 40, caloriesPer100g: 82, carbsPer100g: 0.7, proteinPer100g: 18, fatPer100g: 0.6 } },
    ],
  },
  '豚ヒレ肉': {
    nutrition: { gi: 45, caloriesPer100g: 115, carbsPer100g: 0.2, proteinPer100g: 22, fatPer100g: 1.9 },
    substitutes: [
      { name: '鶏むね肉', nutrition: { gi: 40, caloriesPer100g: 108, carbsPer100g: 0, proteinPer100g: 22, fatPer100g: 1.5 } },
      { name: '鮭', nutrition: { gi: 40, caloriesPer100g: 133, carbsPer100g: 0.1, proteinPer100g: 22, fatPer100g: 4.1 } },
    ],
  },
  '鮭': {
    nutrition: { gi: 40, caloriesPer100g: 133, carbsPer100g: 0.1, proteinPer100g: 22, fatPer100g: 4.1 },
    substitutes: [
      { name: 'サバ', nutrition: { gi: 40, caloriesPer100g: 202, carbsPer100g: 0.3, proteinPer100g: 20, fatPer100g: 12 } },
      { name: 'タラ', nutrition: { gi: 40, caloriesPer100g: 77, carbsPer100g: 0.1, proteinPer100g: 18, fatPer100g: 0.2 } },
    ],
  },
  'サバ': {
    nutrition: { gi: 40, caloriesPer100g: 202, carbsPer100g: 0.3, proteinPer100g: 20, fatPer100g: 12 },
    substitutes: [
      { name: '鮭', nutrition: { gi: 40, caloriesPer100g: 133, carbsPer100g: 0.1, proteinPer100g: 22, fatPer100g: 4.1 } },
      { name: 'アジ', nutrition: { gi: 40, caloriesPer100g: 121, carbsPer100g: 0.1, proteinPer100g: 20, fatPer100g: 3.5 } },
    ],
  },
  '豆腐': {
    nutrition: { gi: 42, caloriesPer100g: 56, carbsPer100g: 1.6, proteinPer100g: 5, fatPer100g: 3 },
    substitutes: [
      { name: '厚揚げ', nutrition: { gi: 46, caloriesPer100g: 150, carbsPer100g: 0.2, proteinPer100g: 11, fatPer100g: 11 } },
      { name: '鶏むね肉', nutrition: { gi: 40, caloriesPer100g: 108, carbsPer100g: 0, proteinPer100g: 22, fatPer100g: 1.5 } },
    ],
  },
  '納豆': {
    nutrition: { gi: 33, caloriesPer100g: 200, carbsPer100g: 12, proteinPer100g: 17, fatPer100g: 10 },
    substitutes: [
      { name: '豆腐', nutrition: { gi: 42, caloriesPer100g: 56, carbsPer100g: 1.6, proteinPer100g: 5, fatPer100g: 3 } },
      { name: 'おから', nutrition: { gi: 35, caloriesPer100g: 111, carbsPer100g: 14, proteinPer100g: 6, fatPer100g: 3.6 } },
    ],
  },
  'ブロッコリー': {
    nutrition: { gi: 26, caloriesPer100g: 33, carbsPer100g: 5.2, proteinPer100g: 4.3, fatPer100g: 0.5 },
    substitutes: [
      { name: 'ほうれん草', nutrition: { gi: 15, caloriesPer100g: 20, carbsPer100g: 3, proteinPer100g: 2.2, fatPer100g: 0.4 } },
      { name: '小松菜', nutrition: { gi: 23, caloriesPer100g: 14, carbsPer100g: 2.4, proteinPer100g: 1.5, fatPer100g: 0.2 } },
    ],
  },
  'ほうれん草': {
    nutrition: { gi: 15, caloriesPer100g: 20, carbsPer100g: 3, proteinPer100g: 2.2, fatPer100g: 0.4 },
    substitutes: [
      { name: 'ブロッコリー', nutrition: { gi: 26, caloriesPer100g: 33, carbsPer100g: 5.2, proteinPer100g: 4.3, fatPer100g: 0.5 } },
      { name: '小松菜', nutrition: { gi: 23, caloriesPer100g: 14, carbsPer100g: 2.4, proteinPer100g: 1.5, fatPer100g: 0.2 } },
    ],
  },
  'アボカド': {
    nutrition: { gi: 27, caloriesPer100g: 176, carbsPer100g: 6, proteinPer100g: 2.5, fatPer100g: 15 },
    substitutes: [
      { name: 'ブロッコリー', nutrition: { gi: 26, caloriesPer100g: 33, carbsPer100g: 5.2, proteinPer100g: 4.3, fatPer100g: 0.5 } },
      { name: 'トマト', nutrition: { gi: 30, caloriesPer100g: 19, carbsPer100g: 4.7, proteinPer100g: 0.7, fatPer100g: 0.1 } },
    ],
  },
};

class IngredientSubstitutionService {
  /**
   * 食材名から代替候補を検索
   * ingredients配列の各要素（例: "鶏むね肉100g"）から食材名を抽出してマッチ
   */
  findSubstitutes(ingredientText: string): { originalName: string; entry: SubstitutionEntry } | null {
    for (const [name, entry] of Object.entries(SUBSTITUTION_DB)) {
      if (ingredientText.includes(name)) {
        return { originalName: name, entry };
      }
    }
    return null;
  }

  /**
   * 食材を置き換えた場合の栄養差分を計算
   * @param originalName 元食材名
   * @param substituteName 代替食材名
   * @param amountGrams 使用量(g)
   * @returns 栄養差分 { calories, carbs, protein, fat }
   */
  calculateNutritionDiff(
    originalName: string,
    substituteName: string,
    amountGrams: number
  ): { calories: number; carbs: number; protein: number; fat: number } | null {
    const entry = SUBSTITUTION_DB[originalName];
    if (!entry) return null;

    const substitute = entry.substitutes.find(s => s.name === substituteName);
    if (!substitute) return null;

    const ratio = amountGrams / 100;
    return {
      calories: Math.round((substitute.nutrition.caloriesPer100g - entry.nutrition.caloriesPer100g) * ratio),
      carbs: Math.round((substitute.nutrition.carbsPer100g - entry.nutrition.carbsPer100g) * ratio * 10) / 10,
      protein: Math.round((substitute.nutrition.proteinPer100g - entry.nutrition.proteinPer100g) * ratio * 10) / 10,
      fat: Math.round((substitute.nutrition.fatPer100g - entry.nutrition.fatPer100g) * ratio * 10) / 10,
    };
  }

  /**
   * 食材テキストから使用量(g)を推定
   */
  parseAmount(ingredientText: string): number {
    const match = ingredientText.match(/(\d+)\s*g/);
    if (match) return parseInt(match[1]);
    // "1丁" "1切れ" などの目安量
    if (ingredientText.includes('丁')) return 300;
    if (ingredientText.includes('切り身') || ingredientText.includes('切れ')) return 100;
    if (ingredientText.includes('束')) return 200;
    if (ingredientText.includes('株')) return 150;
    if (ingredientText.includes('個')) return 100;
    return 100; // デフォルト
  }

  /**
   * 食材テキスト内の食材名を代替名に置き換え
   */
  replaceIngredientText(ingredientText: string, originalName: string, substituteName: string): string {
    return ingredientText.replace(originalName, substituteName);
  }
}

const ingredientSubstitutionService = new IngredientSubstitutionService();
export default ingredientSubstitutionService;
```

- [ ] **Step 2: コンパイル確認・コミット**

Run: `npx tsc --noEmit`

```bash
git add services/ingredientSubstitutionService.ts
git commit -m "feat: 代替食材サービスを作成（データベース＋栄養差分計算）"
```

---

## Task 3: 設定画面に指導値セクションを追加

**Files:**
- Modify: `components/SettingsScreen.tsx`

- [ ] **Step 1: state 変数を追加**

SettingsScreen の既存 state 変数セクション（`showFoodModal` の後あたり）に追加:

```typescript
  // 医師の指導値
  const [targetHba1c, setTargetHba1c] = useState('');
  const [glucoseMin, setGlucoseMin] = useState('');
  const [glucoseMax, setGlucoseMax] = useState('');
  const [dailyCarbLimit, setDailyCarbLimit] = useState('');
  const [dailyCalorieLimit, setDailyCalorieLimit] = useState('');
```

- [ ] **Step 2: loadUser で指導値をロード**

`loadUser` 関数内で、food preferences ロードの後に追加:

```typescript
        // 指導値のロード
        if (userData.medicalGuidance) {
          const mg = userData.medicalGuidance;
          if (mg.targetHba1c != null) setTargetHba1c(String(mg.targetHba1c));
          if (mg.glucoseMin != null) setGlucoseMin(String(mg.glucoseMin));
          if (mg.glucoseMax != null) setGlucoseMax(String(mg.glucoseMax));
          if (mg.dailyCarbLimit != null) setDailyCarbLimit(String(mg.dailyCarbLimit));
          if (mg.dailyCalorieLimit != null) setDailyCalorieLimit(String(mg.dailyCalorieLimit));
        }
```

- [ ] **Step 3: 指導値保存関数を追加**

```typescript
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
          dailyCarbLimit: dailyCarbLimit ? parseInt(dailyCarbLimit) : undefined,
          dailyCalorieLimit: dailyCalorieLimit ? parseInt(dailyCalorieLimit) : undefined,
        };
        await AsyncStorage.setItem('users', JSON.stringify(users));
        Alert.alert('保存完了', '指導値を更新しました');
      }
    } catch {
      Alert.alert('エラー', '保存に失敗しました');
    }
  };
```

- [ ] **Step 4: UIセクションを追加**

食材の好みセクションの保存ボタンの後、アプリ設定セクションの前に追加:

```typescript
        {/* 医師の指導値 */}
        <Text style={styles.sectionTitle}>医師の指導値</Text>

        <View style={styles.guidanceRow}>
          <Text style={styles.guidanceLabel}>HbA1c目標</Text>
          <TextInput
            style={styles.guidanceInput}
            value={targetHba1c}
            onChangeText={setTargetHba1c}
            placeholder="例: 6.5"
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.guidanceRow}>
          <Text style={styles.guidanceLabel}>血糖値目標（下限）</Text>
          <TextInput
            style={styles.guidanceInput}
            value={glucoseMin}
            onChangeText={setGlucoseMin}
            placeholder="例: 80"
            placeholderTextColor="#999"
            keyboardType="number-pad"
          />
          <Text style={styles.guidanceUnit}>mg/dL</Text>
        </View>

        <View style={styles.guidanceRow}>
          <Text style={styles.guidanceLabel}>血糖値目標（上限）</Text>
          <TextInput
            style={styles.guidanceInput}
            value={glucoseMax}
            onChangeText={setGlucoseMax}
            placeholder="例: 140"
            placeholderTextColor="#999"
            keyboardType="number-pad"
          />
          <Text style={styles.guidanceUnit}>mg/dL</Text>
        </View>

        <View style={styles.guidanceRow}>
          <Text style={styles.guidanceLabel}>1日の糖質上限</Text>
          <TextInput
            style={styles.guidanceInput}
            value={dailyCarbLimit}
            onChangeText={setDailyCarbLimit}
            placeholder="例: 200"
            placeholderTextColor="#999"
            keyboardType="number-pad"
          />
          <Text style={styles.guidanceUnit}>g</Text>
        </View>

        <View style={styles.guidanceRow}>
          <Text style={styles.guidanceLabel}>1日のカロリー上限</Text>
          <TextInput
            style={styles.guidanceInput}
            value={dailyCalorieLimit}
            onChangeText={setDailyCalorieLimit}
            placeholder="例: 1800"
            placeholderTextColor="#999"
            keyboardType="number-pad"
          />
          <Text style={styles.guidanceUnit}>kcal</Text>
        </View>

        <TouchableOpacity style={styles.saveFoodButton} onPress={saveMedicalGuidance}>
          <Text style={styles.saveFoodButtonText}>指導値を保存</Text>
        </TouchableOpacity>
```

- [ ] **Step 5: スタイルを追加**

```typescript
  guidanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  guidanceLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  guidanceInput: {
    width: 80,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  guidanceUnit: {
    fontSize: 13,
    color: '#888',
    width: 40,
  },
```

- [ ] **Step 6: コンパイル確認・コミット**

Run: `npx tsc --noEmit`

```bash
git add components/SettingsScreen.tsx
git commit -m "feat: 設定画面に医師の指導値セクションを追加（#9）"
```

---

## Task 4: DailyNutritionSummary に指導値反映＋超過警告

**Files:**
- Modify: `components/DailyNutritionSummary.tsx`

- [ ] **Step 1: props に medicalGuidance を追加**

props インターフェースを拡張:

```typescript
interface DailyNutritionSummaryProps {
  date: string;
  meals?: GeneratedMeal[];
  medicalGuidance?: {
    dailyCarbLimit?: number;
    dailyCalorieLimit?: number;
  };
}
```

- [ ] **Step 2: 目標値を指導値で上書き**

コンポーネント内で、DAILY_TARGETS を使用している箇所の前に、指導値がある場合の上書きロジックを追加。既存の定数 `DAILY_TARGETS` を直接変更せず、実際に使う目標値を変数で管理:

```typescript
  const targets = {
    ...DAILY_TARGETS,
    ...(medicalGuidance?.dailyCalorieLimit ? { calories: medicalGuidance.dailyCalorieLimit } : {}),
    ...(medicalGuidance?.dailyCarbLimit ? { carbs: medicalGuidance.dailyCarbLimit } : {}),
  };
```

その後、DAILY_TARGETS を参照している全箇所を `targets` に置き換える。

- [ ] **Step 3: 超過警告テキストを追加**

プログレスバーの表示部分で、指導値があり超過している場合に警告テキストを表示:

```typescript
  const hasOverage = medicalGuidance && (
    (medicalGuidance.dailyCalorieLimit && totals.calories > medicalGuidance.dailyCalorieLimit) ||
    (medicalGuidance.dailyCarbLimit && totals.carbs > medicalGuidance.dailyCarbLimit)
  );
```

レンダリング部分の最初（プログレスバーの前）に:

```typescript
        {hasOverage && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>指導値を超えています</Text>
          </View>
        )}
```

スタイル追加:
```typescript
  warningBanner: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  warningText: {
    color: '#F44336',
    fontSize: 13,
    fontWeight: '600',
  },
```

- [ ] **Step 4: コンパイル確認・コミット**

Run: `npx tsc --noEmit`

```bash
git add components/DailyNutritionSummary.tsx
git commit -m "feat: 栄養サマリーに指導値反映と超過警告を追加（#9）"
```

---

## Task 5: localMealEngine に糖質/カロリー上限フィルタリングを追加

**Files:**
- Modify: `services/localMealEngine.ts`

- [ ] **Step 1: filterMealsForUser に糖質/カロリーフィルタを追加**

`filterMealsForUser` メソッド内の GI フィルタリングブロックの後、フォールバック（`if (filtered.length === 0)`）の前に追加:

```typescript
    // 糖質上限フィルタリング（1食あたり = 1日上限の1/3）
    if (profile.dailyCarbLimit) {
      const perMealLimit = profile.dailyCarbLimit / 3;
      const carbFiltered = filtered.filter(meal => meal.baseCarbs <= perMealLimit);
      if (carbFiltered.length >= 3) {
        filtered = carbFiltered;
      }
    }

    // カロリー上限フィルタリング（1食あたり = 1日上限の1/3）
    if (profile.dailyCalorieLimit) {
      const perMealLimit = profile.dailyCalorieLimit / 3;
      const calFiltered = filtered.filter(meal => meal.baseCalories <= perMealLimit);
      if (calFiltered.length >= 3) {
        filtered = calFiltered;
      }
    }
```

- [ ] **Step 2: コンパイル確認・コミット**

Run: `npx tsc --noEmit`

```bash
git add services/localMealEngine.ts
git commit -m "feat: 献立生成に糖質/カロリー上限フィルタリングを追加（#9）"
```

---

## Task 6: ダッシュボードのレシピモーダルに置き換えUI＋トレンド目標ライン＋指導値props

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: import を追加**

```typescript
import ingredientSubstitutionService, { SubstituteOption } from '../../services/ingredientSubstitutionService';
```

- [ ] **Step 2: state 変数を追加**

既存 state の trend 変数セクションの後に追加:

```typescript
  // Substitution modal
  const [showSubstModal, setShowSubstModal] = useState(false);
  const [substIngredient, setSubstIngredient] = useState('');
  const [substOriginalName, setSubstOriginalName] = useState('');
  const [substOptions, setSubstOptions] = useState<SubstituteOption[]>([]);
  const [substOriginalNutrition, setSubstOriginalNutrition] = useState<any>(null);

  // 置き換え後の表示用（モーダル内のみ）
  const [displayMeal, setDisplayMeal] = useState<GeneratedMeal | null>(null);
```

- [ ] **Step 3: loadData で medicalGuidance をロードする変数を追加**

既存の state 変数に追加:

```typescript
  const [medicalGuidance, setMedicalGuidance] = useState<User['medicalGuidance']>(undefined);
```

`loadData` 内の `setCurrentUser(user)` の後に追加:

```typescript
        setMedicalGuidance(user.medicalGuidance);
```

- [ ] **Step 4: 置き換え関数を追加**

```typescript
  const openSubstitution = (ingredientText: string) => {
    const result = ingredientSubstitutionService.findSubstitutes(ingredientText);
    if (!result) {
      Alert.alert('情報', 'この食材の代替候補はまだ登録されていません');
      return;
    }
    setSubstIngredient(ingredientText);
    setSubstOriginalName(result.originalName);
    setSubstOptions(result.entry.substitutes);
    setSubstOriginalNutrition(result.entry.nutrition);
    setShowSubstModal(true);
  };

  const applySubstitution = (option: SubstituteOption) => {
    if (!selectedMealDetail) return;
    const amount = ingredientSubstitutionService.parseAmount(substIngredient);
    const diff = ingredientSubstitutionService.calculateNutritionDiff(
      substOriginalName, option.name, amount
    );
    if (!diff) return;

    const newIngredients = selectedMealDetail.ingredients.map(ing =>
      ing === substIngredient
        ? ingredientSubstitutionService.replaceIngredientText(ing, substOriginalName, option.name)
        : ing
    );

    const updatedMeal: GeneratedMeal = {
      ...selectedMealDetail,
      ingredients: newIngredients,
      calories: selectedMealDetail.calories + diff.calories,
      carbs: Math.max(0, selectedMealDetail.carbs + diff.carbs),
      protein: Math.max(0, selectedMealDetail.protein + diff.protein),
      fat: Math.max(0, selectedMealDetail.fat + diff.fat),
    };

    setSelectedMealDetail(updatedMeal);
    setShowSubstModal(false);
  };
```

- [ ] **Step 5: レシピモーダルの材料リストに置き換えボタンを追加**

既存のレシピ詳細モーダル内の材料表示部分を変更。現在:
```typescript
                {selectedMealDetail.ingredients.map((ing, i) => (
                  <Text key={i} style={styles.ingredientText}>・{ing}</Text>
                ))}
```

変更後:
```typescript
                {selectedMealDetail.ingredients.map((ing, i) => (
                  <View key={i} style={styles.ingredientRow}>
                    <Text style={styles.ingredientText}>・{ing}</Text>
                    {ingredientSubstitutionService.findSubstitutes(ing) && (
                      <TouchableOpacity
                        style={styles.substButton}
                        onPress={() => openSubstitution(ing)}
                      >
                        <Ionicons name="swap-horizontal" size={16} color="#007AFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
```

- [ ] **Step 6: 栄養表示の後に置き換えモーダルを追加**

レシピ詳細モーダル（showMealModal）の閉じタグの後に追加:

```typescript
      {/* Substitution modal */}
      <Modal visible={showSubstModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '60%' }]}>
            <View style={styles.trendHeader}>
              <Text style={styles.trendTitle}>「{substOriginalName}」の代替候補</Text>
              <TouchableOpacity onPress={() => setShowSubstModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {substOptions.map((option, i) => (
                <View key={i} style={styles.substCard}>
                  <Text style={styles.substName}>{option.name}</Text>
                  <View style={styles.substCompareRow}>
                    <Text style={styles.substCompareText}>
                      GI: {substOriginalNutrition?.gi}→{option.nutrition.gi}
                    </Text>
                    <Text style={styles.substCompareText}>
                      Cal: {substOriginalNutrition?.caloriesPer100g}→{option.nutrition.caloriesPer100g}
                    </Text>
                  </View>
                  <View style={styles.substCompareRow}>
                    <Text style={styles.substCompareText}>
                      糖質: {substOriginalNutrition?.carbsPer100g}→{option.nutrition.carbsPer100g}g
                    </Text>
                    <Text style={styles.substCompareText}>
                      タンパク: {substOriginalNutrition?.proteinPer100g}→{option.nutrition.proteinPer100g}g
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.substApplyButton}
                    onPress={() => applySubstitution(option)}
                  >
                    <Text style={styles.substApplyText}>この食材に置き換える</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
```

- [ ] **Step 7: DailyNutritionSummary に medicalGuidance props を渡す**

ダッシュボードのレンダリング部分で `<DailyNutritionSummary date={today} />` を変更:

```typescript
        <DailyNutritionSummary date={today} medicalGuidance={medicalGuidance} />
```

- [ ] **Step 8: トレンドグラフに目標ラインを反映**

トレンドモーダル内の LineChart の `chartConfig` の後に `decorator` prop を追加して目標ラインを描画。

LineChart が react-native-chart-kit では水平線を直接描画できないため、代わりにグラフ下部に目標値をテキスト表示:

グラフの後、食事タイミングフィルタの前に追加:

```typescript
              {/* 目標値表示 */}
              {medicalGuidance && (medicalGuidance.glucoseMin || medicalGuidance.glucoseMax) && (
                <View style={styles.trendTargetRow}>
                  {medicalGuidance.glucoseMin && (
                    <Text style={styles.trendTargetText}>
                      下限目標: {medicalGuidance.glucoseMin} mg/dL
                    </Text>
                  )}
                  {medicalGuidance.glucoseMax && (
                    <Text style={[styles.trendTargetText, { color: '#F44336' }]}>
                      上限目標: {medicalGuidance.glucoseMax} mg/dL
                    </Text>
                  )}
                </View>
              )}
```

- [ ] **Step 9: handleUpdateMeals の profile に指導値を反映**

`handleUpdateMeals` 関数内の profile オブジェクトに追加（`dislikedFoods` の行の後）:

```typescript
        dailyCarbLimit: currentUser.medicalGuidance?.dailyCarbLimit,
        dailyCalorieLimit: currentUser.medicalGuidance?.dailyCalorieLimit,
```

- [ ] **Step 10: スタイルを追加**

```typescript
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  substButton: {
    padding: 4,
  },
  substCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  substName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  substCompareRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  substCompareText: {
    fontSize: 13,
    color: '#666',
  },
  substApplyButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  substApplyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  trendTargetRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  trendTargetText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4CAF50',
  },
```

- [ ] **Step 11: コンパイル確認・コミット**

Run: `npx tsc --noEmit`

```bash
git add app/\(tabs\)/index.tsx
git commit -m "feat: ダッシュボードに食材置き換えUI＋トレンド目標ライン＋指導値連携を追加（#5, #9）"
```

---

## Task 7: 献立タブのレシピモーダルにも置き換えUIを追加

**Files:**
- Modify: `app/(tabs)/two.tsx`

- [ ] **Step 1: import を追加**

```typescript
import ingredientSubstitutionService, { SubstituteOption } from '../../services/ingredientSubstitutionService';
```

- [ ] **Step 2: state 変数を追加**

`showShoppingModal` の state グループの後に追加:

```typescript
  // Substitution modal
  const [showSubstModal, setShowSubstModal] = useState(false);
  const [substIngredient, setSubstIngredient] = useState('');
  const [substOriginalName, setSubstOriginalName] = useState('');
  const [substOptions, setSubstOptions] = useState<SubstituteOption[]>([]);
  const [substOriginalNutrition, setSubstOriginalNutrition] = useState<any>(null);
```

- [ ] **Step 3: 置き換え関数を追加**

Task 6 と同じ `openSubstitution` と `applySubstitution` 関数を追加。ただし `selectedMealDetail` を `selectedMeal` に読み替え（two.tsx のレシピモーダルは `selectedMeal` を使用）:

```typescript
  const openSubstitution = (ingredientText: string) => {
    const result = ingredientSubstitutionService.findSubstitutes(ingredientText);
    if (!result) {
      Alert.alert('情報', 'この食材の代替候補はまだ登録されていません');
      return;
    }
    setSubstIngredient(ingredientText);
    setSubstOriginalName(result.originalName);
    setSubstOptions(result.entry.substitutes);
    setSubstOriginalNutrition(result.entry.nutrition);
    setShowSubstModal(true);
  };

  const applySubstitution = (option: SubstituteOption) => {
    if (!selectedMeal) return;
    const amount = ingredientSubstitutionService.parseAmount(substIngredient);
    const diff = ingredientSubstitutionService.calculateNutritionDiff(
      substOriginalName, option.name, amount
    );
    if (!diff) return;

    const newIngredients = selectedMeal.ingredients.map(ing =>
      ing === substIngredient
        ? ingredientSubstitutionService.replaceIngredientText(ing, substOriginalName, option.name)
        : ing
    );

    setSelectedMeal({
      ...selectedMeal,
      ingredients: newIngredients,
      calories: selectedMeal.calories + diff.calories,
      carbs: Math.max(0, selectedMeal.carbs + diff.carbs),
      protein: Math.max(0, selectedMeal.protein + diff.protein),
      fat: Math.max(0, selectedMeal.fat + diff.fat),
    });
    setShowSubstModal(false);
  };
```

- [ ] **Step 4: レシピモーダルの材料リストに置き換えボタンを追加**

two.tsx のレシピ詳細モーダル内の材料表示を変更。Task 6 Step 5 と同じパターン（`selectedMealDetail` → `selectedMeal`）。

- [ ] **Step 5: 置き換えモーダルを追加**

Task 6 Step 6 と同じ置き換えモーダルを、two.tsx のレシピモーダルの閉じタグの後に追加。

- [ ] **Step 6: 献立生成の profile に指導値を反映**

`buildUserHealthProfile` 関数の return オブジェクトに追加（`preferLowGi` の後）:

```typescript
      dailyCarbLimit: currentUser.medicalGuidance?.dailyCarbLimit,
      dailyCalorieLimit: currentUser.medicalGuidance?.dailyCalorieLimit,
```

- [ ] **Step 7: スタイルを追加**

Task 6 Step 10 と同じスタイル（`ingredientRow`, `substButton`, `substCard`, `substName`, `substCompareRow`, `substCompareText`, `substApplyButton`, `substApplyText`）を追加。

- [ ] **Step 8: コンパイル確認・コミット**

Run: `npx tsc --noEmit`

```bash
git add app/\(tabs\)/two.tsx
git commit -m "feat: 献立タブのレシピモーダルにも食材置き換えUIを追加＋献立生成に指導値反映（#5, #9）"
```

---

## Task 8: 全体統合テスト

- [ ] **Step 1: コンパイル確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 2: 実機確認 — 食材置き換え**

確認項目:
- ダッシュボードの献立カード → レシピモーダル → 材料リストに [↔] ボタンが表示
- [↔] タップ → 代替候補モーダル表示
- 「この食材に置き換える」→ 材料名が更新、栄養値が再計算
- モーダル閉じて再度開くとリセットされている
- 献立タブのレシピモーダルでも同様に動作

- [ ] **Step 3: 実機確認 — 指導値**

確認項目:
- 設定画面 → 「医師の指導値」セクションが表示
- HbA1c目標、血糖値上限/下限、糖質上限、カロリー上限を入力→保存
- ダッシュボードの栄養サマリーに指導値が反映（カロリー・糖質の目標が変わる）
- 指導値を超えた場合に「指導値を超えています」警告が表示
- トレンドモーダルに目標値が表示される
- 献立生成時に糖質/カロリー上限が反映される

- [ ] **Step 4: 最終コミット**

```bash
git add -A
git commit -m "feat: 食材置き換え提案・医師指導値連携の実装完了（#5, #9）"
```
