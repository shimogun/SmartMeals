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
