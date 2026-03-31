# GI値フィルター・買い物リスト・血糖値トレンド 設計書

## 概要

既存の2タブ構成を維持したまま、3つの機能を追加する。
- #1 GI値・糖質量ベースの食材フィルター
- #3 買い物リスト自動生成
- #7 血糖値トレンドの可視化強化

### 設計方針

- 新しい画面を作らない（モーダルで完結）
- 操作工数を増やさない（#1はトグル1つ、#3と#7はボタンタップで表示）

---

## 1. GI値フィルター (#1)

### データ追加

`localMealEngine.ts` の `MealTemplate` に `gi: number` フィールドを追加。料理単位のGI値目安として設定する。

GI値の基準:
- 低GI (55以下): 豆腐系、魚の蒸し焼き、野菜サラダ系
- 中GI (56-69): 鶏むね肉グリル、豆腐ハンバーグ
- 高GI (70以上): 白米ベースの献立

### 型の追加

`types/index.ts` の `UserHealthProfile` に追加:
```typescript
preferLowGi?: boolean;
```

### UI変更

`app/(tabs)/two.tsx` の献立生成モーダルに「低GI優先」トグルを追加。制限レベルの下に1行追加するだけ。

### ロジック

`localMealEngine.ts` の `filterMealsForUser` を拡張:
- `preferLowGi === true` の場合、GI値55以下のテンプレートを優先
- 低GIテンプレートが不足する場合は中GI(69以下)も許容
- 全てフィルタされた場合は最低1件確保（既存のフォールバックロジック）

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `types/index.ts` | UserHealthProfile に `preferLowGi?: boolean` 追加 |
| `services/localMealEngine.ts` | MealTemplate に `gi` フィールド追加、全テンプレートにGI値設定、フィルタリング拡張 |
| `app/(tabs)/two.tsx` | 生成モーダルにトグル追加、profile に `preferLowGi` を渡す |
| `app/(tabs)/index.tsx` | handleUpdateMeals の profile にも `preferLowGi` 反映（設定から取得） |

---

## 2. 買い物リスト (#3)

### 場所

献立タブ → 保存済み献立の詳細モーダル → 「買い物リストを見る」ボタン → 買い物リストモーダル

### 食材抽出ロジック

`services/shoppingListService.ts` を新規作成:

```typescript
interface ShoppingItem {
  name: string;
  amount: string;
  category: string;
  checked: boolean;
}

interface ShoppingList {
  planId: string;
  items: ShoppingItem[];
  createdAt: number;
}
```

ロジック:
1. SavedMealPlan の全日程の全料理から `ingredients` を収集
2. 食材名を正規化（「鶏むね肉 200g」→ name: 鶏むね肉, amount: 200g）
3. 同じ食材名は統合し、量の文字列を結合（「200g × 3日分」のような表示）
4. カテゴリ別にグルーピング:
   - 肉類: 鶏、豚、牛、ひき肉を含む
   - 魚介類: 鮭、サバ、タラ、エビ等を含む
   - 野菜: ブロッコリー、ほうれん草等を含む
   - 大豆製品: 豆腐、納豆等を含む
   - その他: 上記に該当しないもの

### チェック状態の永続化

AsyncStorage に `shopping_list_{planId}` キーでチェック状態を保存。

### テキストコピー

Clipboard API でリストをテキスト形式にしてコピー。形式:
```
【買い物リスト】3/31〜4/3
■ 肉類
・鶏むね肉 200g × 3日分
・豚ヒレ肉 150g × 2日分
■ 野菜
・ブロッコリー 2株
...
```

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `services/shoppingListService.ts` | 新規作成 — 食材抽出・統合・カテゴリ分類ロジック |
| `app/(tabs)/two.tsx` | 献立詳細モーダルに「買い物リストを見る」ボタン追加、買い物リストモーダル追加 |

---

## 3. 血糖値トレンド (#7)

### 場所

ダッシュボード（今日タブ）→ 血糖値セクションに「トレンドを見る →」リンク → トレンドモーダル

### モーダル内容

1. **期間選択**: 1週 / 1ヶ月 / 3ヶ月 / 6ヶ月（ボタン切替）
2. **折れ線グラフ**: react-native-chart-kit の LineChart を使用
   - X軸: 日付
   - Y軸: 血糖値 (mg/dL)
   - 目標ライン: 140（注意・オレンジ点線）、180（高値・赤点線）
3. **食事タイミングフィルタ**: 朝/昼/夜のチップボタン（複数選択ON/OFF）
   - 選択中のタイミングのデータのみグラフに表示
4. **平均値比較**: 今週の平均 vs 先週の平均（改善↓/悪化↑の矢印付き）
5. **HbA1c推移**: weekly_records から HbA1c を時系列でテキスト表示

### データソース

- 血糖値: AsyncStorage `glucose_records` → GlucoseRecord[]
- HbA1c: AsyncStorage `weekly_records` → hba1c フィールド

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `app/(tabs)/index.tsx` | 血糖値セクションに「トレンドを見る」リンク追加、トレンドモーダル（グラフ+統計+HbA1c）追加 |

新規ファイルなし（ダッシュボード内のモーダルとして完結）。

---

## 4. 全体の変更ファイルまとめ

### 新規
| ファイル | 内容 |
|---------|------|
| `services/shoppingListService.ts` | 買い物リスト生成サービス |

### 変更
| ファイル | 変更内容 |
|---------|---------|
| `types/index.ts` | UserHealthProfile に `preferLowGi` 追加 |
| `services/localMealEngine.ts` | MealTemplate に `gi` 追加、GIフィルタリング |
| `app/(tabs)/index.tsx` | トレンドモーダル追加、handleUpdateMeals に lowGi 反映 |
| `app/(tabs)/two.tsx` | 生成モーダルにトグル追加、献立詳細に買い物リストボタン+モーダル追加 |

### 変更しないファイル
- `app/(tabs)/_layout.tsx`
- `app/_layout.tsx`
- `app/onboarding.tsx`
- `components/SettingsScreen.tsx`
- `components/DailyNutritionSummary.tsx`
- `services/mealStorageService.ts`
- `services/favoritesService.ts`
