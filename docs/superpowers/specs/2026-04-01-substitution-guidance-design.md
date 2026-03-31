# 食材置き換え提案・医師指導値連携 設計書

## 概要

- #5 食材の置き換え提案機能 — レシピ詳細モーダルで食材タップ→代替候補表示→置き換え＋栄養再計算
- #9 医師・栄養士の指導値との連携 — 設定画面で目標値入力→献立生成・栄養サマリー・トレンドグラフに反映

### 設計方針

- 新しい画面を作らない（既存モーダル・設定画面内で完結）
- 操作工数を増やさない

---

## 1. 食材の置き換え提案 (#5)

### 代替食材データ

`services/ingredientSubstitutionService.ts` を新規作成。食材名をキーに、栄養情報と代替候補の配列を持つ。

データ構造:
```typescript
interface IngredientData {
  gi: number;
  caloriesPer100g: number;
  carbsPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
}

interface SubstituteEntry {
  original: IngredientData;
  substitutes: (IngredientData & { name: string })[];
}
```

対象食材（MealTemplate の ingredients に含まれる主要食材）:
- 肉類: 鶏むね肉, ささみ, 豚ヒレ肉, 牛もも肉, 鶏もも肉
- 魚介類: 鮭, サバ, タラ, マグロ, エビ
- 大豆製品: 豆腐, 納豆, 厚揚げ
- 野菜: ブロッコリー, ほうれん草, にんじん, キャベツ, トマト
- 主食: 白米, 玄米, オートミール, 全粒粉パン

各食材は2〜3個の代替候補を持つ。

### UI

ダッシュボード（index.tsx）と献立タブ（two.tsx）の両方のレシピ詳細モーダルの材料リストを拡張。

各材料の横に [↔] ボタンを表示。タップで代替候補モーダル（ボトムシート）を表示:

```
┌───────────────────────────┐
│ 「鶏むね肉」の代替候補   [✕] │
│                             │
│  ┌─ ささみ ──────────────┐ │
│  │ GI: 40→40  Cal: 108→105│ │
│  │ 糖質: 0→0g  タンパク: 22→23g │ │
│  │ [この食材に置き換える]   │ │
│  └──────────────────────┘ │
│  ┌─ 豆腐 ───────────────┐ │
│  │ GI: 40→42  Cal: 108→56 │ │
│  │ 糖質: 0→1.6g タンパク: 22→5g │ │
│  │ [この食材に置き換える]   │ │
│  └──────────────────────┘ │
└───────────────────────────┘
```

### 置き換え＋再計算ロジック

1. 「この食材に置き換える」タップ
2. 材料リストの該当食材名を代替食材名に表示更新
3. 栄養素を概算で再計算:
   - 元食材の使用量からグラム数を推定（parseIngredient でパース）
   - 100gあたり栄養差分 × 使用量(g)/100 で補正値を計算
   - GeneratedMeal の calories/carbs/protein/fat に補正値を加算
4. 置き換えはモーダル内の表示のみ（保存データは変更しない）
5. モーダルを閉じるとリセット

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `services/ingredientSubstitutionService.ts` | 新規 — 代替食材データベース＋置き換え計算 |
| `app/(tabs)/index.tsx` | レシピモーダルに置き換えUI追加 |
| `app/(tabs)/two.tsx` | レシピモーダルに置き換えUI追加 |

---

## 2. 医師の指導値連携 (#9)

### データ構造

`types/index.ts` の `User` インターフェースに追加:

```typescript
medicalGuidance?: {
  targetHba1c?: number;      // HbA1c目標値
  glucoseMin?: number;       // 血糖値目標下限 (mg/dL)
  glucoseMax?: number;       // 血糖値目標上限 (mg/dL)
  dailyCarbLimit?: number;   // 1日の糖質上限 (g)
  dailyCalorieLimit?: number; // 1日のカロリー上限 (kcal)
};
```

### 設定画面

`components/SettingsScreen.tsx` に「医師の指導値」セクションを追加。食材の好みセクションの後に配置。

入力項目:
- HbA1c目標: 数値入力 (例: 6.5)
- 血糖値目標 下限: 数値入力 (例: 80)
- 血糖値目標 上限: 数値入力 (例: 140)
- 1日の糖質上限: 数値入力 (例: 200)
- 1日のカロリー上限: 数値入力 (例: 1800)
- [指導値を保存] ボタン

全項目任意。空欄の場合はデフォルト値を使用。

### 反映先

#### 1. 献立生成 (localMealEngine.ts)

`UserHealthProfile` に `dailyCarbLimit` と `dailyCalorieLimit` を追加。
`filterMealsForUser` で、1食あたりの糖質/カロリーが上限の1/3を超えるテンプレートを除外。

#### 2. 栄養サマリー (DailyNutritionSummary.tsx)

`medicalGuidance` を props で受け取り、指導値があればデフォルトの `DAILY_TARGETS` を上書き。
- `dailyCalorieLimit` → カロリー目標
- `dailyCarbLimit` → 糖質目標

#### 3. 血糖値トレンド (index.tsx)

トレンドグラフに目標ラインを追加:
- `glucoseMin` → 下限ライン（緑の点線）
- `glucoseMax` → 上限ライン（赤の点線）

#### 4. 超過警告

栄養サマリーで指導値を超えた場合、プログレスバーを赤色にし「指導値を超えています」テキストを表示。

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `types/index.ts` | User に `medicalGuidance` 追加、UserHealthProfile に `dailyCarbLimit`/`dailyCalorieLimit` 追加 |
| `components/SettingsScreen.tsx` | 指導値セクション追加 |
| `components/DailyNutritionSummary.tsx` | 目標値を指導値で上書き、超過警告 |
| `app/(tabs)/index.tsx` | トレンドグラフに目標ライン追加、ダッシュボードからDailyNutritionSummaryに指導値props伝達 |
| `services/localMealEngine.ts` | 糖質/カロリー上限フィルタリング追加 |

---

## 3. 全体の変更ファイルまとめ

### 新規
| ファイル | 内容 |
|---------|------|
| `services/ingredientSubstitutionService.ts` | 代替食材データベース＋置き換え計算 |

### 変更
| ファイル | 変更内容 |
|---------|---------|
| `types/index.ts` | User に medicalGuidance、UserHealthProfile に dailyCarbLimit/dailyCalorieLimit |
| `services/localMealEngine.ts` | 糖質/カロリー上限フィルタリング |
| `components/SettingsScreen.tsx` | 指導値セクション追加 |
| `components/DailyNutritionSummary.tsx` | 指導値で目標値上書き＋超過警告 |
| `app/(tabs)/index.tsx` | レシピモーダル置き換えUI＋トレンド目標ライン＋指導値props |
| `app/(tabs)/two.tsx` | レシピモーダル置き換えUI |
