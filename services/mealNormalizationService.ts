/**
 * 料理名標準化サービス
 * 
 * 目的:
 * 1. 料理名を [メイン食材]の[調理法] 形式に標準化
 * 2. ベース料理と代用リストのマッピング
 * 3. 画像キャッシュ率の向上
 */

interface BaseMeal {
  id: string;
  name: string;
  category: string;
  keywords: string[];
}

interface MealSubstitution {
  baseId: string;
  substitutes: string[];
}

export class MealNormalizationService {
  // ベース料理の定義（糖尿病向けヘルシー料理を中心に）
  private readonly baseMeals: BaseMeal[] = [
    // 白身魚料理
    { id: 'white_fish_grilled', name: '白身魚の塩焼き', category: 'white_fish', keywords: ['白身魚', '鯛', 'ひらめ', 'かれい', 'すずき', '塩焼き', 'グリル'] },
    { id: 'white_fish_simmered', name: '白身魚の煮つけ', category: 'white_fish', keywords: ['白身魚', '鯛', 'かれい', 'ひらめ', '煮つけ', '煮付け'] },
    { id: 'white_fish_steamed', name: '白身魚の蒸し物', category: 'white_fish', keywords: ['白身魚', '鯛', 'ひらめ', '蒸し魚', '蒸し'] },
    { id: 'white_fish_meuniere', name: '白身魚のムニエル', category: 'white_fish', keywords: ['白身魚', 'ムニエル', 'ひらめ', 'かれい', 'バター焼き'] },
    
    // 赤身魚料理
    { id: 'red_fish_grilled', name: '赤身魚の塩焼き', category: 'red_fish', keywords: ['赤身魚', '鮭', 'さば', 'あじ', 'いわし', 'さんま', '塩焼き', 'グリル'] },
    { id: 'red_fish_simmered', name: '赤身魚の煮つけ', category: 'red_fish', keywords: ['赤身魚', 'さば', 'ぶり', 'あじ', '煮つけ', '煮付け'] },
    { id: 'red_fish_steamed', name: '赤身魚の蒸し物', category: 'red_fish', keywords: ['赤身魚', '鮭', 'さば', '蒸し魚', '蒸し'] },
    { id: 'red_fish_meuniere', name: '赤身魚のムニエル', category: 'red_fish', keywords: ['赤身魚', '鮭', 'ムニエル', 'バター焼き'] },
    
    // 肉料理
    { id: 'chicken_steamed', name: '蒸し鶏', category: 'meat', keywords: ['蒸し鶏', 'サラダチキン', 'よだれ鶏', '棒棒鶏'] },
    { id: 'chicken_grilled', name: '鶏の塩焼き', category: 'meat', keywords: ['焼き鳥', '塩焼き', 'グリルチキン', '鶏もも', '鶏むね'] },
    { id: 'pork_steamed', name: '豚の蒸し物', category: 'meat', keywords: ['蒸し豚', 'しゃぶしゃぶ', '冷しゃぶ'] },
    { id: 'beef_lean_grilled', name: '赤身肉のグリル', category: 'meat', keywords: ['ステーキ', 'グリル', '赤身', 'ヒレ', 'もも肉'] },
    
    // 野菜料理
    { id: 'greens_gomae', name: '青菜の胡麻和え', category: 'vegetables', keywords: ['胡麻和え', 'ごま和え', 'ほうれん草', '小松菜', '春菊'] },
    { id: 'greens_ohitashi', name: '青菜のお浸し', category: 'vegetables', keywords: ['お浸し', 'おひたし', 'ほうれん草', '小松菜', '青菜'] },
    { id: 'vegetables_stirfry', name: '野菜炒め', category: 'vegetables', keywords: ['野菜炒め', '炒め物', 'きんぴら', 'もやし炒め'] },
    { id: 'vegetables_simmered', name: '野菜の煮物', category: 'vegetables', keywords: ['煮物', '筑前煮', '肉じゃが', 'ひじき煮', '切り干し大根'] },
    { id: 'vegetables_steamed', name: '野菜の蒸し物', category: 'vegetables', keywords: ['蒸し野菜', '温野菜', 'ブロッコリー', 'カリフラワー'] },
    
    // 豆腐・大豆製品
    { id: 'tofu_simmered', name: '豆腐の煮物', category: 'tofu', keywords: ['湯豆腐', '肉豆腐', 'あんかけ豆腐', 'マーボー豆腐'] },
    { id: 'tofu_grilled', name: '豆腐の焼き物', category: 'tofu', keywords: ['焼き豆腐', '厚揚げ', 'がんもどき'] },
    
    // 卵料理
    { id: 'egg_tamagoyaki', name: '卵焼き', category: 'egg', keywords: ['だし巻き卵', '厚焼き卵', 'オムレツ', 'スクランブルエッグ'] },
    { id: 'egg_chawanmushi', name: '茶碗蒸し', category: 'egg', keywords: ['茶碗蒸し', '卵豆腐', '蒸し卵'] },
    
    // スープ・汁物
    { id: 'soup_miso', name: '味噌汁', category: 'soup', keywords: ['味噌汁', 'みそ汁', 'わかめ', 'しじみ', 'あさり汁'] },
    { id: 'soup_clear', name: '清汁', category: 'soup', keywords: ['すまし汁', 'お吸い物', '清汁', 'はまぐり'] },
    { id: 'soup_vegetable', name: '野菜スープ', category: 'soup', keywords: ['コンソメスープ', '野菜スープ', 'ミネストローネ', '中華スープ'] },
    
    // 肉野菜組み合わせ料理（糖尿病向け定番）
    { id: 'chicken_vegetable_stirfry', name: '鶏肉と野菜の炒め物', category: 'meat_vegetable', keywords: ['鶏肉', '野菜炒め', 'ピーマン', 'もやし', 'キャベツ', 'ブロッコリー'] },
    { id: 'pork_vegetable_stirfry', name: '豚肉と野菜の炒め物', category: 'meat_vegetable', keywords: ['豚肉', '野菜炒め', 'キャベツ', 'もやし', 'ピーマン'] },
    { id: 'beef_vegetable_stirfry', name: '牛肉と野菜の炒め物', category: 'meat_vegetable', keywords: ['牛肉', '野菜炒め', 'ピーマン', 'もやし'] },
    { id: 'chicken_vegetable_simmer', name: '鶏肉と野菜の煮物', category: 'meat_vegetable', keywords: ['鶏肉', '煮物', '筑前煮', '大根', '人参', 'ごぼう'] },
    { id: 'pork_vegetable_simmer', name: '豚肉と野菜の煮物', category: 'meat_vegetable', keywords: ['豚肉', '煮物', '大根', '白菜', '人参'] },
    { id: 'chicken_vegetable_steam', name: '鶏肉と野菜の蒸し物', category: 'meat_vegetable', keywords: ['鶏肉', '蒸し', 'キャベツ', 'もやし', '白菜'] },
    { id: 'meat_vegetable_salad', name: '肉野菜サラダ', category: 'meat_vegetable', keywords: ['サラダ', '温野菜', 'しゃぶしゃぶ', '冷しゃぶ', 'チキンサラダ'] },
    { id: 'hambarg_vegetable', name: 'ハンバーグ風肉野菜', category: 'meat_vegetable', keywords: ['ハンバーグ', 'つくね', '肉団子', 'ミートボール'] },
  ];

  // 代用マッピング（同じベース料理として扱う食材グループ）
  private readonly substitutions: MealSubstitution[] = [
    {
      baseId: 'greens_gomae',
      substitutes: ['ほうれん草の胡麻和え', '小松菜の胡麻和え', '春菊の胡麻和え', 'いんげんの胡麻和え']
    },
    {
      baseId: 'greens_ohitashi',
      substitutes: ['ほうれん草のお浸し', '小松菜のお浸し', '青菜のお浸し', 'もやしのお浸し']
    },
    {
      baseId: 'white_fish_grilled',
      substitutes: ['鯛の塩焼き', 'ひらめの塩焼き', 'かれいの塩焼き', 'すずきの塩焼き', '白身魚の塩焼き']
    },
    {
      baseId: 'white_fish_simmered',
      substitutes: ['鯛の煮つけ', 'かれいの煮つけ', 'ひらめの煮つけ', '金目鯛の煮つけ']
    },
    {
      baseId: 'white_fish_meuniere',
      substitutes: ['ひらめのムニエル', 'かれいのムニエル', '鯛のムニエル', '白身魚のムニエル']
    },
    {
      baseId: 'red_fish_grilled',
      substitutes: ['鮭の塩焼き', 'さばの塩焼き', 'あじの塩焼き', 'さんまの塩焼き', 'いわしの塩焼き']
    },
    {
      baseId: 'red_fish_simmered',
      substitutes: ['さばの煮つけ', 'ぶりの煮つけ', 'あじの煮つけ', '赤身魚の煮つけ']
    },
    {
      baseId: 'red_fish_meuniere',
      substitutes: ['鮭のムニエル', 'さばのムニエル', '赤身魚のムニエル']
    },
    {
      baseId: 'chicken_steamed',
      substitutes: ['蒸し鶏', 'よだれ鶏', '棒棒鶏', 'サラダチキン', '鶏むね肉の蒸し物']
    },
    {
      baseId: 'vegetables_simmered',
      substitutes: ['筑前煮', 'ひじき煮', '切り干し大根の煮物', 'かぼちゃの煮物', '大根の煮物']
    },
    {
      baseId: 'chicken_vegetable_stirfry',
      substitutes: ['鶏肉とピーマンの炒め物', '鶏肉ともやしの炒め物', '鶏肉とブロッコリーの炒め物', '鶏肉とキャベツの炒め物']
    },
    {
      baseId: 'pork_vegetable_stirfry', 
      substitutes: ['豚肉とキャベツの炒め物', '豚肉ともやしの炒め物', '豚肉とピーマンの炒め物', '野菜炒め']
    },
    {
      baseId: 'beef_vegetable_stirfry',
      substitutes: ['牛肉とピーマンの炒め物', '牛肉ともやしの炒め物', '牛肉と玉ねぎの炒め物']
    },
    {
      baseId: 'chicken_vegetable_simmer',
      substitutes: ['筑前煮', '鶏肉と大根の煮物', '鶏肉と人参の煮物', '鶏肉とごぼうの煮物']
    },
    {
      baseId: 'meat_vegetable_salad',
      substitutes: ['チキンサラダ', '冷しゃぶサラダ', '温野菜サラダ', 'しゃぶしゃぶ', 'バンバンジー']
    }
  ];

  /**
   * 料理名を標準化された形式に変換
   * [メイン食材]の[調理法] または ベース料理名
   */
  public normalizeMealName(mealName: string): string {
    // まず直接マッチするベース料理を検索
    const directMatch = this.baseMeals.find(base => 
      base.keywords.some(keyword => 
        mealName.includes(keyword) || 
        this.containsSimilarWords(mealName, keyword)
      )
    );

    if (directMatch) {
      return directMatch.name;
    }

    // 代用リストから検索
    const substitution = this.substitutions.find(sub => 
      sub.substitutes.some(substitute => 
        this.containsSimilarWords(mealName, substitute)
      )
    );

    if (substitution) {
      const baseMeal = this.baseMeals.find(base => base.id === substitution.baseId);
      if (baseMeal) {
        return baseMeal.name;
      }
    }

    // パターンマッチングで標準化を試行
    return this.extractStandardizedPattern(mealName);
  }

  /**
   * 料理名から標準化されたIDを生成
   * 画像ファイル名として使用
   */
  public getMealImageId(mealName: string): string {
    const normalizedName = this.normalizeMealName(mealName);
    
    // ベース料理のIDを検索
    const baseMeal = this.baseMeals.find(base => base.name === normalizedName);
    if (baseMeal) {
      return baseMeal.id;
    }

    // フォールバック: 文字列をハッシュ化
    return this.generateHashId(normalizedName);
  }

  /**
   * 類似する単語を含むかチェック（あいまい検索）
   */
  private containsSimilarWords(text: string, keyword: string): boolean {
    // シンプルな部分文字列マッチング
    return text.includes(keyword) || keyword.includes(text);
  }

  /**
   * 料理名から [メイン食材]の[調理法] パターンを抽出
   */
  private extractStandardizedPattern(mealName: string): string {
    const cookingMethods = ['焼き', '煮', '蒸し', '炒め', '揚げ', '茹で', 'グリル', 'ソテー'];
    const mainIngredients = ['鶏', '豚', '牛', '魚', '野菜', '豆腐', '卵'];

    let detectedMethod = '';
    let detectedIngredient = '';

    // 調理法を検出
    for (const method of cookingMethods) {
      if (mealName.includes(method)) {
        detectedMethod = method;
        break;
      }
    }

    // メイン食材を検出
    for (const ingredient of mainIngredients) {
      if (mealName.includes(ingredient)) {
        detectedIngredient = ingredient;
        break;
      }
    }

    if (detectedIngredient && detectedMethod) {
      return `${detectedIngredient}の${detectedMethod}`;
    }

    // パターンが検出できない場合は元の名前を返す
    return mealName;
  }

  /**
   * 文字列から簡単なハッシュIDを生成
   */
  private generateHashId(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit integerに変換
    }
    return `custom_${Math.abs(hash)}`;
  }

  /**
   * ベース料理一覧を取得
   */
  public getBaseMeals(): BaseMeal[] {
    return [...this.baseMeals];
  }

  /**
   * 特定カテゴリのベース料理を取得
   */
  public getBaseMealsByCategory(category: string): BaseMeal[] {
    return this.baseMeals.filter(meal => meal.category === category);
  }
}

// シングルトンインスタンス
const mealNormalizationService = new MealNormalizationService();
export default mealNormalizationService;

// 型定義をエクスポート
export type { BaseMeal, MealSubstitution };