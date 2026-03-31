# GI値フィルター・買い物リスト・血糖値トレンド 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** GI値フィルター、買い物リスト自動生成、血糖値トレンドグラフの3機能を既存2タブ内に追加する。

**Architecture:** GI値は MealTemplate にデータ追加＋フィルタリング拡張。買い物リストは新サービスで食材抽出・統合し献立詳細モーダル内に表示。血糖値トレンドはダッシュボード内のモーダルで react-native-chart-kit のグラフを表示。

**Tech Stack:** Expo 54, React Native 0.81.5, TypeScript 5.9, AsyncStorage, react-native-chart-kit, Clipboard API

**Spec:** `docs/superpowers/specs/2026-04-01-gi-shopping-trend-design.md`

---

## ファイル構成

### 新規作成
| ファイル | 責務 |
|---------|------|
| `services/shoppingListService.ts` | 献立から買い物リストを生成するサービス |

### 変更
| ファイル | 変更内容 |
|---------|---------|
| `types/index.ts` | UserHealthProfile に `preferLowGi?: boolean` 追加 |
| `services/localMealEngine.ts` | MealTemplate に `gi` フィールド追加、GIフィルタリング |
| `app/(tabs)/two.tsx` | 生成モーダルにトグル追加、献立詳細に買い物リストボタン＋モーダル追加 |
| `app/(tabs)/index.tsx` | トレンドモーダル追加 |

---

## Task 1: 型定義に preferLowGi を追加

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: UserHealthProfile に preferLowGi を追加**

`types/index.ts` の `UserHealthProfile` インターフェースの最後（`dislikedFoods?: string[];` の後）に追加:

```typescript
  preferLowGi?: boolean;
```

- [ ] **Step 2: コンパイル確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add types/index.ts
git commit -m "feat: UserHealthProfile に preferLowGi フィールドを追加"
```

---

## Task 2: MealTemplate に GI値を追加し、フィルタリングを拡張

**Files:**
- Modify: `services/localMealEngine.ts`

- [ ] **Step 1: MealTemplate インターフェースに gi フィールドを追加**

`services/localMealEngine.ts` の `MealTemplate` インターフェース（現在 line 4-19）に `gi: number` を追加:

```typescript
interface MealTemplate {
  id: string;
  name: string;
  baseCalories: number;
  baseCarbs: number;
  baseProtein: number;
  baseFat: number;
  ingredients: string[];
  recipe: string[];
  category: 'breakfast' | 'lunch' | 'dinner';
  diabeticFriendly: boolean;
  lowCarb: boolean;
  highProtein: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  season?: string[];
  gi: number;  // GI値目安（低GI: 55以下、中GI: 56-69、高GI: 70以上）
}
```

- [ ] **Step 2: 全テンプレートに gi 値を設定**

各テンプレートのオブジェクトに `gi` フィールドを追加。テンプレートIDと対応するGI値:

| テンプレートID | 料理名 | gi値 |
|---|---|---|
| `breakfast-01` | 鶏むね肉の蒸し焼き | 40 |
| `breakfast-02` | 鮭の塩焼き | 35 |
| `breakfast-03` | アボカド納豆トースト | 52 |
| `breakfast-04` | ギリシャヨーグルトパフェ | 45 |
| `breakfast-05` | 豆腐スクランブル | 38 |
| `lunch-01` | きのこたっぷりサラダ | 30 |
| `lunch-02` | 豆腐ハンバーグ | 48 |
| `lunch-03` | 白身魚のカルパッチョ | 35 |
| `dinner-01` | 白身魚の蒸し焼き | 38 |
| `dinner-02` | 鶏むね肉のハーブグリル | 42 |
| `dinner-03` | 豆腐ステーキきのこあんかけ | 45 |

各テンプレートオブジェクトの `difficulty` の行の後に `gi: XX` を追加する。例:

```typescript
      {
        id: 'breakfast-01',
        name: '鶏むね肉の蒸し焼き',
        // ... 既存フィールド ...
        difficulty: 'easy',
        gi: 40,
      },
```

- [ ] **Step 3: filterMealsForUser に GI値フィルタリングを追加**

`filterMealsForUser` メソッド（現在 line 468-495）の苦手食材フィルタリングの後、フォールバックの前に追加:

```typescript
    // 低GI優先フィルタリング
    if (profile.preferLowGi) {
      const lowGi = filtered.filter(meal => meal.gi <= 55);
      if (lowGi.length >= 3) {
        filtered = lowGi;
      } else {
        // 低GIが3件未満なら中GI以下も許容
        const medGi = filtered.filter(meal => meal.gi <= 69);
        if (medGi.length > 0) {
          filtered = medGi;
        }
      }
    }
```

挿入位置は苦手食材フィルタリングブロック（`if (profile.dislikedFoods ...)`）の閉じ括弧の後、フォールバック（`if (filtered.length === 0)`）の前。

- [ ] **Step 4: コンパイル確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 5: コミット**

```bash
git add services/localMealEngine.ts
git commit -m "feat: MealTemplateにGI値を追加し、低GI優先フィルタリングを実装（#1）"
```

---

## Task 3: 献立生成モーダルに低GIトグルを追加

**Files:**
- Modify: `app/(tabs)/two.tsx`

- [ ] **Step 1: state 変数に preferLowGi を追加**

`app/(tabs)/two.tsx` の state 変数セクション（`genRestriction` の後、line 41 付近）に追加:

```typescript
  const [preferLowGi, setPreferLowGi] = useState(false);
```

- [ ] **Step 2: buildUserHealthProfile に preferLowGi を追加**

`buildUserHealthProfile` 関数（line 99-152 付近）の return オブジェクトに追加。`dislikedFoods` の行の後に:

```typescript
      preferLowGi,
```

- [ ] **Step 3: 生成モーダルUIにトグルを追加**

生成モーダル内の制限レベル選択ボタンの後、「血糖値・HbA1c...」注釈テキストの前に、低GIトグルを追加。

ファイル内で「血糖値・HbA1c・食材の好みは」というテキストを含む `<Text>` を探し、その直前に挿入:

```typescript
            {/* 低GI優先トグル */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>低GI優先</Text>
              <TouchableOpacity
                style={[styles.toggleButton, preferLowGi && styles.toggleButtonActive]}
                onPress={() => setPreferLowGi(!preferLowGi)}
              >
                <Text style={[styles.toggleButtonText, preferLowGi && styles.toggleButtonTextActive]}>
                  {preferLowGi ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
            </View>
```

- [ ] **Step 4: スタイルを追加**

ファイル末尾の `StyleSheet.create` 内に追加:

```typescript
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingVertical: 8,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  toggleButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  toggleButtonActive: {
    backgroundColor: '#4CAF50',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
```

- [ ] **Step 5: コンパイル確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 6: コミット**

```bash
git add app/\(tabs\)/two.tsx
git commit -m "feat: 献立生成モーダルに低GI優先トグルを追加（#1）"
```

---

## Task 4: 買い物リストサービスの作成

**Files:**
- Create: `services/shoppingListService.ts`

- [ ] **Step 1: サービスファイルを作成**

```typescript
// services/shoppingListService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedMealPlan, GeneratedMeal } from '../types';

export interface ShoppingItem {
  name: string;
  amounts: string[];
  category: string;
  checked: boolean;
}

export interface ShoppingList {
  planId: string;
  items: ShoppingItem[];
}

const CATEGORY_KEYWORDS: { [category: string]: string[] } = {
  '肉類': ['鶏', '豚', '牛', 'ひき肉', 'ささみ', 'もも肉', 'むね肉', 'ヒレ', 'ロース'],
  '魚介類': ['鮭', 'サバ', 'タラ', 'マグロ', 'エビ', 'イカ', 'カツオ', 'アジ', 'ブリ', '白身魚', '魚'],
  '大豆製品': ['豆腐', '納豆', '油揚げ', '厚揚げ', '豆乳', 'おから'],
  '野菜': ['ブロッコリー', 'ほうれん草', 'にんじん', '人参', 'パプリカ', 'トマト', 'かぼちゃ', '小松菜',
           'キャベツ', 'レタス', '大根', 'もやし', 'きゅうり', '玉ねぎ', 'なす', 'ねぎ', 'アボカド', '生姜'],
  'きのこ類': ['しめじ', 'えのき', 'エリンギ', 'まいたけ', 'しいたけ', 'きのこ'],
  '海藻類': ['わかめ', 'ひじき', 'のり', 'もずく', '昆布'],
};

class ShoppingListService {
  generateFromPlan(plan: SavedMealPlan): ShoppingList {
    const allIngredients: string[] = [];

    // 全日程の全料理から ingredients を収集
    for (const meals of Object.values(plan.meals)) {
      for (const meal of meals) {
        allIngredients.push(...meal.ingredients);
      }
    }

    // 食材を統合
    const itemMap = new Map<string, string[]>();

    for (const ingredient of allIngredients) {
      const { name, amount } = this.parseIngredient(ingredient);
      if (!itemMap.has(name)) {
        itemMap.set(name, []);
      }
      if (amount) {
        itemMap.get(name)!.push(amount);
      }
    }

    // ShoppingItem に変換
    const items: ShoppingItem[] = [];
    for (const [name, amounts] of itemMap) {
      items.push({
        name,
        amounts,
        category: this.categorize(name),
        checked: false,
      });
    }

    // カテゴリ順にソート
    const categoryOrder = ['肉類', '魚介類', '大豆製品', '野菜', 'きのこ類', '海藻類', 'その他'];
    items.sort((a, b) => {
      const ai = categoryOrder.indexOf(a.category);
      const bi = categoryOrder.indexOf(b.category);
      return ai - bi;
    });

    return { planId: plan.id, items };
  }

  private parseIngredient(ingredient: string): { name: string; amount: string } {
    // "鶏むね肉100g" → name: "鶏むね肉", amount: "100g"
    // "ブロッコリー50g" → name: "ブロッコリー", amount: "50g"
    // "塩小さじ1/2" → name: "塩", amount: "小さじ1/2"
    const match = ingredient.match(/^(.+?)([\d０-９]+.*|少々|適量|小さじ.+|大さじ.+)$/);
    if (match) {
      return { name: match[1].trim(), amount: match[2].trim() };
    }
    return { name: ingredient.trim(), amount: '' };
  }

  private categorize(name: string): string {
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(keyword => name.includes(keyword))) {
        return category;
      }
    }
    return 'その他';
  }

  formatAsText(list: ShoppingList, planName: string): string {
    const lines: string[] = [`【買い物リスト】${planName}`];
    let currentCategory = '';

    for (const item of list.items) {
      if (item.category !== currentCategory) {
        currentCategory = item.category;
        lines.push(`■ ${currentCategory}`);
      }
      const amountText = item.amounts.length > 0
        ? ` ── ${item.amounts.join('、')}`
        : '';
      lines.push(`・${item.name}${amountText}`);
    }

    return lines.join('\n');
  }

  // チェック状態の保存
  async saveCheckedState(planId: string, checkedNames: string[]): Promise<void> {
    await AsyncStorage.setItem(`shopping_list_${planId}`, JSON.stringify(checkedNames));
  }

  // チェック状態の読み込み
  async loadCheckedState(planId: string): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(`shopping_list_${planId}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
}

const shoppingListService = new ShoppingListService();
export default shoppingListService;
```

- [ ] **Step 2: コンパイル確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add services/shoppingListService.ts
git commit -m "feat: 買い物リスト生成サービスを作成（#3）"
```

---

## Task 5: 献立詳細モーダルに買い物リストを追加

**Files:**
- Modify: `app/(tabs)/two.tsx`

- [ ] **Step 1: import を追加**

`app/(tabs)/two.tsx` の先頭の import セクションに追加:

```typescript
import * as Clipboard from 'expo-clipboard';
import shoppingListService, { ShoppingItem, ShoppingList } from '../../services/shoppingListService';
```

注: `expo-clipboard` がまだインストールされていない場合は先にインストール:

Run: `npx expo install expo-clipboard`

- [ ] **Step 2: state 変数を追加**

既存の state 変数セクション（`showRecipeModal` の後）に追加:

```typescript
  // Shopping list modal
  const [showShoppingModal, setShowShoppingModal] = useState(false);
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
```

- [ ] **Step 3: 買い物リスト関数を追加**

データロードセクションの後に追加:

```typescript
  // ============================================================
  // Shopping List
  // ============================================================

  const openShoppingList = async (plan: SavedMealPlan) => {
    const list = shoppingListService.generateFromPlan(plan);
    const checked = await shoppingListService.loadCheckedState(plan.id);
    setShoppingList(list);
    setCheckedItems(new Set(checked));
    setShowShoppingModal(true);
  };

  const toggleShoppingItem = async (itemName: string) => {
    if (!shoppingList) return;
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemName)) {
      newChecked.delete(itemName);
    } else {
      newChecked.add(itemName);
    }
    setCheckedItems(newChecked);
    await shoppingListService.saveCheckedState(shoppingList.planId, Array.from(newChecked));
  };

  const copyShoppingList = async () => {
    if (!shoppingList || !selectedPlan) return;
    const text = shoppingListService.formatAsText(
      shoppingList,
      selectedPlan.name || `${selectedPlan.startDate}〜の献立`
    );
    await Clipboard.setStringAsync(text);
    Alert.alert('コピー完了', '買い物リストをクリップボードにコピーしました');
  };
```

- [ ] **Step 4: 献立詳細モーダル内に「買い物リストを見る」ボタンを追加**

献立詳細モーダル（`showPlanModal` のモーダル）内で、日別の献立一覧の後（`</ScrollView>` の直前）に追加:

```typescript
                <TouchableOpacity
                  style={styles.shoppingButton}
                  onPress={() => selectedPlan && openShoppingList(selectedPlan)}
                >
                  <Ionicons name="cart-outline" size={20} color="#fff" />
                  <Text style={styles.shoppingButtonText}>買い物リストを見る</Text>
                </TouchableOpacity>
```

- [ ] **Step 5: 買い物リストモーダルを追加**

レシピ詳細モーダルの閉じタグの後、`<View style={{ height: 40 }} />` の前に追加:

```typescript
      {/* Shopping list modal */}
      <Modal visible={showShoppingModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>買い物リスト</Text>
              <TouchableOpacity onPress={() => setShowShoppingModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {shoppingList && (
              <ScrollView>
                {(() => {
                  let currentCategory = '';
                  return shoppingList.items.map((item, index) => {
                    const showCategory = item.category !== currentCategory;
                    currentCategory = item.category;
                    return (
                      <View key={index}>
                        {showCategory && (
                          <Text style={styles.shoppingCategory}>{item.category}</Text>
                        )}
                        <TouchableOpacity
                          style={styles.shoppingItem}
                          onPress={() => toggleShoppingItem(item.name)}
                        >
                          <Ionicons
                            name={checkedItems.has(item.name) ? 'checkbox' : 'square-outline'}
                            size={22}
                            color={checkedItems.has(item.name) ? '#4CAF50' : '#999'}
                          />
                          <Text style={[
                            styles.shoppingItemName,
                            checkedItems.has(item.name) && styles.shoppingItemChecked,
                          ]}>
                            {item.name}
                          </Text>
                          {item.amounts.length > 0 && (
                            <Text style={styles.shoppingItemAmount}>
                              {item.amounts.join('、')}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  });
                })()}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.copyButton} onPress={copyShoppingList}>
              <Ionicons name="copy-outline" size={18} color="#fff" />
              <Text style={styles.copyButtonText}>テキストをコピー</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
```

- [ ] **Step 6: スタイルを追加**

StyleSheet に追加:

```typescript
  shoppingButton: {
    backgroundColor: '#FF9800',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  shoppingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  shoppingCategory: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  shoppingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 10,
  },
  shoppingItemName: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  shoppingItemChecked: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  shoppingItemAmount: {
    fontSize: 13,
    color: '#888',
  },
  copyButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
```

- [ ] **Step 7: expo-clipboard のインストール（未インストールの場合）**

Run: `npx expo install expo-clipboard`

- [ ] **Step 8: コンパイル確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 9: コミット**

```bash
git add services/shoppingListService.ts app/\(tabs\)/two.tsx
git commit -m "feat: 献立詳細から買い物リスト表示・チェック・コピー機能を追加（#3）"
```

---

## Task 6: ダッシュボードに血糖値トレンドモーダルを追加

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: import に追加**

`app/(tabs)/index.tsx` の先頭に追加:

```typescript
import { Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { WeeklyRecord } from '../../types';
```

- [ ] **Step 2: state 変数を追加**

既存の state 変数セクション（`isUpdating` の後）に追加:

```typescript
  // Trend modal
  const [showTrendModal, setShowTrendModal] = useState(false);
  const [trendRange, setTrendRange] = useState<'1week' | '1month' | '3months' | '6months'>('1month');
  const [trendFilters, setTrendFilters] = useState<Set<MealTiming>>(new Set(['朝', '昼', '夜']));
  const [allGlucoseRecords, setAllGlucoseRecords] = useState<GlucoseRecord[]>([]);
  const [weeklyRecords, setWeeklyRecords] = useState<WeeklyRecord[]>([]);
```

- [ ] **Step 3: loadData にトレンド用データロードを追加**

`loadData` 関数内の血糖値ロード部分（`const glucoseData = await AsyncStorage.getItem('glucose_records')` のブロック）を拡張。既存の `setLatestGlucose` の後に追加:

```typescript
          setAllGlucoseRecords(records);
```

さらに `loadData` 内の `generateUpdateMessage()` の前に weekly_records のロードを追加:

```typescript
      // Weekly records for HbA1c trend
      const weeklyData = await AsyncStorage.getItem('weekly_records');
      if (weeklyData) {
        setWeeklyRecords(JSON.parse(weeklyData));
      }
```

- [ ] **Step 4: トレンド関連の関数を追加**

`handleUpdateMeals` の後に追加:

```typescript
  // ============================================================
  // Trend Modal
  // ============================================================

  const toggleTrendFilter = (timing: MealTiming) => {
    const newFilters = new Set(trendFilters);
    if (newFilters.has(timing)) {
      if (newFilters.size > 1) { // 最低1つは残す
        newFilters.delete(timing);
      }
    } else {
      newFilters.add(timing);
    }
    setTrendFilters(newFilters);
  };

  const getFilteredTrendRecords = (): GlucoseRecord[] => {
    const now = new Date();
    let cutoff: Date;
    switch (trendRange) {
      case '1week':
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1month':
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3months':
        cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '6months':
        cutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
    }

    return allGlucoseRecords
      .filter(r => new Date(r.timestamp) >= cutoff)
      .filter(r => trendFilters.has(r.mealType as MealTiming))
      .sort((a, b) => a.timestamp - b.timestamp);
  };

  const getTrendChartData = () => {
    const records = getFilteredTrendRecords();
    if (records.length === 0) {
      return { labels: [''], datasets: [{ data: [0] }] };
    }

    // 日付ごとに平均値をとる
    const dateMap = new Map<string, number[]>();
    for (const r of records) {
      const date = r.date;
      if (!dateMap.has(date)) dateMap.set(date, []);
      dateMap.get(date)!.push(r.value);
    }

    const dates = Array.from(dateMap.keys()).sort();
    // ラベルは間引く（最大10個表示）
    const step = Math.max(1, Math.floor(dates.length / 10));
    const labels = dates.map((d, i) => i % step === 0 ? d.slice(5) : '');
    const data = dates.map(d => {
      const values = dateMap.get(d)!;
      return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
    });

    return {
      labels,
      datasets: [{ data, strokeWidth: 2 }],
    };
  };

  const getTrendStats = () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeek = allGlucoseRecords.filter(
      r => new Date(r.timestamp) >= oneWeekAgo
    );
    const lastWeek = allGlucoseRecords.filter(
      r => new Date(r.timestamp) >= twoWeeksAgo && new Date(r.timestamp) < oneWeekAgo
    );

    const thisAvg = thisWeek.length > 0
      ? Math.round(thisWeek.reduce((s, r) => s + r.value, 0) / thisWeek.length)
      : null;
    const lastAvg = lastWeek.length > 0
      ? Math.round(lastWeek.reduce((s, r) => s + r.value, 0) / lastWeek.length)
      : null;

    return { thisAvg, lastAvg };
  };

  const getHba1cHistory = (): { date: string; value: number }[] => {
    return weeklyRecords
      .filter(r => r.hba1c != null)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(r => ({
        date: r.weekStart,
        value: r.hba1c!,
      }));
  };

  const screenWidth = Dimensions.get('window').width;
```

- [ ] **Step 5: 血糖値セクションに「トレンドを見る」リンクを追加**

血糖値カード内の `latestGlucose` 表示の後に追加。ファイル内で `直近:` を含む `<Text>` の閉じタグの後に:

```typescript
        <TouchableOpacity
          style={styles.trendLink}
          onPress={() => setShowTrendModal(true)}
        >
          <Text style={styles.trendLinkText}>トレンドを見る</Text>
          <Ionicons name="chevron-forward" size={16} color="#007AFF" />
        </TouchableOpacity>
```

ただし `latestGlucose` が null のときもリンクを表示するため、`{latestGlucose && (` ブロックの外（その下）に配置する。

- [ ] **Step 6: トレンドモーダルを追加**

レシピ詳細モーダル（`showMealModal`）の閉じタグの後、`<View style={{ height: 40 }} />` の前に追加:

```typescript
      {/* Trend modal */}
      <Modal visible={showTrendModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.trendHeader}>
              <Text style={styles.trendTitle}>血糖値トレンド</Text>
              <TouchableOpacity onPress={() => setShowTrendModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {/* Period selector */}
              <View style={styles.trendPeriodRow}>
                {([
                  { key: '1week', label: '1週' },
                  { key: '1month', label: '1ヶ月' },
                  { key: '3months', label: '3ヶ月' },
                  { key: '6months', label: '6ヶ月' },
                ] as const).map(p => (
                  <TouchableOpacity
                    key={p.key}
                    style={[styles.trendPeriodButton, trendRange === p.key && styles.trendPeriodButtonActive]}
                    onPress={() => setTrendRange(p.key)}
                  >
                    <Text style={[styles.trendPeriodText, trendRange === p.key && styles.trendPeriodTextActive]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Chart */}
              {getFilteredTrendRecords().length > 0 ? (
                <LineChart
                  data={getTrendChartData()}
                  width={screenWidth - 60}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#fff',
                    backgroundGradientFrom: '#fff',
                    backgroundGradientTo: '#fff',
                    decimalCount: 0,
                    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
                    propsForDots: { r: '3', strokeWidth: '1', stroke: '#2196F3' },
                  }}
                  bezier
                  style={{ borderRadius: 8, marginVertical: 8 }}
                  withHorizontalLines
                  fromZero={false}
                  decorator={() => null}
                />
              ) : (
                <Text style={styles.emptyText}>選択期間にデータがありません</Text>
              )}

              {/* Meal timing filter */}
              <View style={styles.trendFilterRow}>
                {(['朝', '昼', '夜'] as MealTiming[]).map(timing => (
                  <TouchableOpacity
                    key={timing}
                    style={[styles.trendFilterChip, trendFilters.has(timing) && styles.trendFilterChipActive]}
                    onPress={() => toggleTrendFilter(timing)}
                  >
                    <Text style={[styles.trendFilterText, trendFilters.has(timing) && styles.trendFilterTextActive]}>
                      {timing}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Stats */}
              {(() => {
                const stats = getTrendStats();
                return (
                  <View style={styles.trendStatsCard}>
                    <Text style={styles.trendStatsTitle}>平均値</Text>
                    <View style={styles.trendStatsRow}>
                      <View style={styles.trendStatItem}>
                        <Text style={styles.trendStatLabel}>今週</Text>
                        <Text style={styles.trendStatValue}>
                          {stats.thisAvg != null ? `${stats.thisAvg} mg/dL` : '—'}
                        </Text>
                      </View>
                      <View style={styles.trendStatItem}>
                        <Text style={styles.trendStatLabel}>先週</Text>
                        <Text style={styles.trendStatValue}>
                          {stats.lastAvg != null ? `${stats.lastAvg} mg/dL` : '—'}
                        </Text>
                      </View>
                      {stats.thisAvg != null && stats.lastAvg != null && (
                        <View style={styles.trendStatItem}>
                          <Text style={styles.trendStatLabel}>変化</Text>
                          <Text style={[
                            styles.trendStatValue,
                            { color: stats.thisAvg <= stats.lastAvg ? '#4CAF50' : '#F44336' },
                          ]}>
                            {stats.thisAvg <= stats.lastAvg ? '↓' : '↑'}
                            {Math.abs(stats.thisAvg - stats.lastAvg)} mg/dL
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })()}

              {/* HbA1c history */}
              {(() => {
                const history = getHba1cHistory();
                if (history.length === 0) return null;
                return (
                  <View style={styles.trendStatsCard}>
                    <Text style={styles.trendStatsTitle}>HbA1c推移</Text>
                    <View style={styles.hba1cRow}>
                      {history.slice(-6).map((h, i, arr) => (
                        <View key={i} style={styles.hba1cItem}>
                          <Text style={styles.hba1cValue}>{h.value}</Text>
                          <Text style={styles.hba1cDate}>{h.date.slice(5)}</Text>
                          {i < arr.length - 1 && (
                            <Text style={styles.hba1cArrow}>→</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>
```

- [ ] **Step 7: スタイルを追加**

StyleSheet に追加:

```typescript
  trendLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 2,
  },
  trendLinkText: {
    fontSize: 14,
    color: '#007AFF',
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  trendTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  trendPeriodRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  trendPeriodButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  trendPeriodButtonActive: {
    backgroundColor: '#007AFF',
  },
  trendPeriodText: {
    fontSize: 13,
    color: '#666',
  },
  trendPeriodTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  trendFilterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 12,
  },
  trendFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  trendFilterChipActive: {
    backgroundColor: '#2196F3',
  },
  trendFilterText: {
    fontSize: 14,
    color: '#666',
  },
  trendFilterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  trendStatsCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
  },
  trendStatsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  trendStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  trendStatItem: {
    alignItems: 'center',
  },
  trendStatLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  trendStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  hba1cRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  hba1cItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  hba1cValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  hba1cDate: {
    fontSize: 11,
    color: '#888',
  },
  hba1cArrow: {
    fontSize: 16,
    color: '#ccc',
    marginHorizontal: 4,
  },
```

- [ ] **Step 8: コンパイル確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 9: コミット**

```bash
git add app/\(tabs\)/index.tsx
git commit -m "feat: ダッシュボードに血糖値トレンドモーダルを追加（#7）"
```

---

## Task 7: 全体統合テスト

- [ ] **Step 1: コンパイル確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 2: 実機確認 — GI値フィルター**

Run: `npx expo start --android`

確認項目:
- 献立タブ → 「新しい献立」→ 生成モーダルに「低GI優先 OFF」トグルが表示
- トグルをONにして献立生成 → 低GI料理が優先的に選ばれる
- トグルOFFでも通常通り生成できる

- [ ] **Step 3: 実機確認 — 買い物リスト**

確認項目:
- 献立タブ → 保存済み献立をタップ → 詳細モーダルに「買い物リストを見る」ボタンが表示
- ボタンタップ → 買い物リストモーダルが開く
- カテゴリ別に食材が分類されている
- チェックボックスで買った食材を管理できる
- アプリ再起動後もチェック状態が保持される
- 「テキストをコピー」でクリップボードにコピーされる

- [ ] **Step 4: 実機確認 — 血糖値トレンド**

確認項目:
- ダッシュボード → 血糖値セクションに「トレンドを見る →」リンクが表示
- リンクタップ → トレンドモーダルが開く
- 期間切替（1週/1ヶ月/3ヶ月/6ヶ月）でグラフが更新される
- 朝/昼/夜フィルタでデータが絞り込まれる
- 平均値の今週vs先週が表示される
- HbA1cの推移が表示される（データがある場合）

- [ ] **Step 5: 最終コミット**

```bash
git add -A
git commit -m "feat: GI値フィルター・買い物リスト・血糖値トレンド実装完了（#1, #3, #7）"
```
