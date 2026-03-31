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

    for (const meals of Object.values(plan.meals)) {
      for (const meal of meals) {
        allIngredients.push(...meal.ingredients);
      }
    }

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

    const items: ShoppingItem[] = [];
    for (const [name, amounts] of itemMap) {
      items.push({
        name,
        amounts,
        category: this.categorize(name),
        checked: false,
      });
    }

    const categoryOrder = ['肉類', '魚介類', '大豆製品', '野菜', 'きのこ類', '海藻類', 'その他'];
    items.sort((a, b) => {
      const ai = categoryOrder.indexOf(a.category);
      const bi = categoryOrder.indexOf(b.category);
      return ai - bi;
    });

    return { planId: plan.id, items };
  }

  private parseIngredient(ingredient: string): { name: string; amount: string } {
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

  async saveCheckedState(planId: string, checkedNames: string[]): Promise<void> {
    await AsyncStorage.setItem(`shopping_list_${planId}`, JSON.stringify(checkedNames));
  }

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
