/**
 * 外部料理画像API統合サービス
 * 複数のAPIを組み合わせて高品質な料理画像を提供
 */

interface FoodImageResult {
  url: string;
  source: 'spoonacular' | 'edamam' | 'themealdb' | 'unsplash';
  title?: string;
  description?: string;
}

interface SpoonacularRecipe {
  id: number;
  title: string;
  image: string;
  imageType: string;
}

interface EdamamHit {
  recipe: {
    label: string;
    image: string;
    images: {
      THUMBNAIL: { url: string };
      SMALL: { url: string };
      REGULAR: { url: string };
      LARGE: { url: string };
    };
  };
}

class ExternalFoodImageService {
  private readonly spoonacularApiKey: string;
  private readonly edamamAppId: string;
  private readonly edamamAppKey: string;
  private readonly unsplashAccessKey: string;

  constructor() {
    // 環境変数から取得（後で設定）
    this.spoonacularApiKey = process.env.SPOONACULAR_API_KEY || '';
    this.edamamAppId = process.env.EDAMAM_APP_ID || '';
    this.edamamAppKey = process.env.EDAMAM_APP_KEY || '';
    this.unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY || '';
  }

  /**
   * 料理名から最適な画像を検索
   */
  async searchFoodImage(mealName: string): Promise<FoodImageResult | null> {
    console.log(`🔍 外部API画像検索開始: ${mealName}`);

    // 1. Spoonacular API (最高品質の料理画像)
    if (this.spoonacularApiKey) {
      const spoonacularResult = await this.searchSpoonacular(mealName);
      if (spoonacularResult) {
        console.log(`✅ Spoonacular画像取得成功: ${mealName}`);
        return spoonacularResult;
      }
    }

    // 2. Edamam Recipe API (栄養情報付きレシピ画像)
    if (this.edamamAppId && this.edamamAppKey) {
      const edamamResult = await this.searchEdamam(mealName);
      if (edamamResult) {
        console.log(`✅ Edamam画像取得成功: ${mealName}`);
        return edamamResult;
      }
    }

    // 3. TheMealDB (無料の料理画像)
    const themealdbResult = await this.searchTheMealDB(mealName);
    if (themealdbResult) {
      console.log(`✅ TheMealDB画像取得成功: ${mealName}`);
      return themealdbResult;
    }

    // 4. Unsplash (高品質フード写真)
    if (this.unsplashAccessKey) {
      const unsplashResult = await this.searchUnsplash(mealName);
      if (unsplashResult) {
        console.log(`✅ Unsplash画像取得成功: ${mealName}`);
        return unsplashResult;
      }
    }

    console.log(`❌ 外部API画像検索失敗: ${mealName}`);
    return null;
  }

  /**
   * Spoonacular Recipe API検索
   */
  private async searchSpoonacular(mealName: string): Promise<FoodImageResult | null> {
    try {
      const encodedQuery = encodeURIComponent(this.translateToEnglish(mealName));
      const url = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${this.spoonacularApiKey}&query=${encodedQuery}&number=1&addRecipeInformation=true&fillIngredients=false&sort=popularity`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const recipe: SpoonacularRecipe = data.results[0];
        return {
          url: recipe.image,
          source: 'spoonacular',
          title: recipe.title,
        };
      }
    } catch (error) {
      console.error('Spoonacular API エラー:', error);
    }
    return null;
  }

  /**
   * Edamam Recipe API検索
   */
  private async searchEdamam(mealName: string): Promise<FoodImageResult | null> {
    try {
      const encodedQuery = encodeURIComponent(this.translateToEnglish(mealName));
      const url = `https://api.edamam.com/api/recipes/v2?type=public&q=${encodedQuery}&app_id=${this.edamamAppId}&app_key=${this.edamamAppKey}&imageSize=REGULAR&random=true`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.hits && data.hits.length > 0) {
        const hit: EdamamHit = data.hits[0];
        return {
          url: hit.recipe.images?.REGULAR?.url || hit.recipe.image,
          source: 'edamam',
          title: hit.recipe.label,
        };
      }
    } catch (error) {
      console.error('Edamam API エラー:', error);
    }
    return null;
  }

  /**
   * TheMealDB API検索（無料）
   */
  private async searchTheMealDB(mealName: string): Promise<FoodImageResult | null> {
    try {
      const encodedQuery = encodeURIComponent(this.translateToEnglish(mealName));
      const url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodedQuery}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.meals && data.meals.length > 0) {
        const meal = data.meals[0];
        return {
          url: meal.strMealThumb,
          source: 'themealdb',
          title: meal.strMeal,
          description: meal.strInstructions?.substring(0, 100) + '...'
        };
      }
    } catch (error) {
      console.error('TheMealDB API エラー:', error);
    }
    return null;
  }

  /**
   * Unsplash検索
   */
  private async searchUnsplash(mealName: string): Promise<FoodImageResult | null> {
    try {
      const encodedQuery = encodeURIComponent(`${this.translateToEnglish(mealName)} food dish`);
      const url = `https://api.unsplash.com/search/photos?query=${encodedQuery}&per_page=1&orientation=landscape&client_id=${this.unsplashAccessKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const photo = data.results[0];
        return {
          url: photo.urls.regular,
          source: 'unsplash',
          title: photo.alt_description || photo.description,
        };
      }
    } catch (error) {
      console.error('Unsplash API エラー:', error);
    }
    return null;
  }

  /**
   * 日本語料理名を英語に翻訳（簡易版）
   */
  private translateToEnglish(japaneseFood: string): string {
    const translations: { [key: string]: string } = {
      // 魚料理
      '鮭': 'salmon',
      'さけ': 'salmon', 
      '鯛': 'sea bream',
      'たい': 'sea bream',
      'さば': 'mackerel',
      '鯖': 'mackerel',
      'あじ': 'horse mackerel',
      'ひらめ': 'flatfish',
      'かれい': 'flounder',
      
      // 肉料理
      '鶏肉': 'chicken',
      '鶏': 'chicken',
      'とり': 'chicken',
      '豚肉': 'pork',
      '豚': 'pork',
      'ぶた': 'pork',
      '牛肉': 'beef',
      '牛': 'beef',
      
      // 野菜
      '大根': 'daikon radish',
      '人参': 'carrot',
      '玉ねぎ': 'onion',
      'キャベツ': 'cabbage',
      'ブロッコリー': 'broccoli',
      'ほうれん草': 'spinach',
      '小松菜': 'komatsuna',
      
      // 調理法
      '塩焼き': 'grilled with salt',
      '煮つけ': 'simmered',
      '煮物': 'simmered dish',
      '炒め物': 'stir-fry',
      '蒸し物': 'steamed',
      'ムニエル': 'meuniere',
      '刺身': 'sashimi',
      '寿司': 'sushi',
      
      // 料理名
      '味噌汁': 'miso soup',
      '卵焼き': 'tamagoyaki',
      '豆腐': 'tofu',
      '筑前煮': 'chikuzenni',
      '肉じゃが': 'nikujaga',
    };

    let translated = japaneseFood.toLowerCase();
    
    // 辞書で置換
    Object.entries(translations).forEach(([japanese, english]) => {
      translated = translated.replace(new RegExp(japanese, 'g'), english);
    });

    // 「の」「と」「を」などの助詞を除去
    translated = translated.replace(/の|と|を|が|は|に|で|から/g, ' ');
    
    // 複数の空白を1つに
    translated = translated.replace(/\s+/g, ' ').trim();

    return translated || japaneseFood;
  }
}

// シングルトンインスタンス
const externalFoodImageService = new ExternalFoodImageService();
export default externalFoodImageService;