// SmartMeals セキュアAIサービス - 環境変数からAPIキー自動読み込み
import Constants from 'expo-constants';

export interface UserHealthProfile {
  height?: number;
  weight?: number;
  gender?: 'male' | 'female';
  activityLevel?: 'light' | 'moderate' | 'high';
  age?: number;
  currentHba1c?: string;
  currentCondition?: 'good' | 'normal' | 'poor';
  dietRestriction?: 'strict' | 'normal' | 'relaxed';
  currentGlucose?: number;
  mealType?: string;
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
}

class SecureAiService {
  private apiKey: string | null = null;
  private baseUrl = 'https://api.openai.com/v1';

  constructor() {
    this.loadApiKey();
  }

  private loadApiKey(): void {
    try {
      // 環境変数から安全にAPIキーを読み込み
      const envApiKey = Constants.expoConfig?.extra?.openaiApiKey || 
                       process.env.OPENAI_API_KEY || 
                       null;
      
      console.log('APIキー読み込み状況:', {
        expoConfigPresent: !!Constants.expoConfig?.extra?.openaiApiKey,
        processEnvPresent: !!process.env.OPENAI_API_KEY,
        finalKeyPresent: !!envApiKey,
        keyFormat: envApiKey ? (envApiKey.startsWith('sk-') ? '正常' : '無効') : 'なし'
      });
      
      if (envApiKey && envApiKey.startsWith('sk-')) {
        this.apiKey = envApiKey;
        console.log('✅ 有効なAPIキーを読み込みました');
      } else {
        console.warn('❌ 無効なAPIキー形式が検出されました:', envApiKey?.substring(0, 10) + '...');
        this.apiKey = null;
      }
    } catch (error) {
      console.error('❌ APIキーの読み込みに失敗:', error);
      this.apiKey = null;
    }
  }

  isAvailable(): boolean {
    return this.apiKey !== null;
  }

  private generatePrompt(
    userProfile: UserHealthProfile,
    periodDays: number,
    servings: number
  ): string {
    return `糖尿病専門栄養士として、${periodDays}日間の具体的な献立メニューを作成してください。

患者情報:
- 血糖値: ${userProfile.currentGlucose || '120'}mg/dL
- HbA1c: ${userProfile.currentHba1c || '6.5'}%
- 年齢: ${userProfile.age || '50'}歳
- 性別: ${userProfile.gender === 'male' ? '男性' : userProfile.gender === 'female' ? '女性' : '男性'}
- 体調: ${userProfile.currentCondition || '普通'}
- 食事制限: ${userProfile.dietRestriction || '普通'}

要件:
- ${periodDays}日分の具体的で実用的な献立
- 各日異なる料理名（例：鶏胸肉のオムレツ、鮭のムニエル、豆腐ハンバーグなど）
- 日本の一般家庭で作れる料理
- 糖尿病患者に適した栄養バランス

以下の形式でJSONのみ返してください：

{
  "meals": [
    {
      "breakfast": {
        "name": "具体的な料理名（例：鶏胸肉のオムレツ）",
        "calories": 280,
        "carbs": 8,
        "protein": 28,
        "fat": 15,
        "description": "この料理が血糖値管理に良い理由",
        "ingredients": ["鶏胸肉 100g", "卵 2個", "ほうれん草 50g", "チーズ 20g", "オリーブオイル 大さじ1"],
        "recipe": ["鶏胸肉を小さく切る", "卵を溶く", "フライパンで調理"]
      },
      "lunch": {
        "name": "具体的な料理名（例：キノコサラダ）",
        "calories": 320,
        "carbs": 15,
        "protein": 25,
        "fat": 18,
        "description": "この料理が血糖値管理に良い理由",
        "ingredients": ["しめじ 100g", "レタス 80g", "トマト 1個"],
        "recipe": ["野菜を洗う", "きのこを炒める", "盛り付ける"]
      },
      "dinner": {
        "name": "具体的な料理名（例：白身魚の蒸し焼き）",
        "calories": 300,
        "carbs": 12,
        "protein": 35,
        "fat": 12,
        "description": "この料理が血糖値管理に良い理由",
        "ingredients": ["白身魚 120g", "ブロッコリー 100g"],
        "recipe": ["魚に下味をつける", "野菜と一緒に蒸し焼きにする"]
      }
    }
  ]
}

必須: ${periodDays}日分すべて異なる具体的な料理名で生成してください。`;
  }

  private formatHealthCondition(profile: UserHealthProfile): string {
    const parts = [];
    
    if (profile.age) parts.push(`年齢: ${profile.age}歳`);
    if (profile.gender) parts.push(`性別: ${profile.gender === 'male' ? '男性' : '女性'}`);
    if (profile.height) parts.push(`身長: ${profile.height}cm`);
    if (profile.weight) parts.push(`体重: ${profile.weight}kg`);
    
    if (profile.height && profile.weight) {
      const bmi = profile.weight / Math.pow(profile.height / 100, 2);
      parts.push(`BMI: ${bmi.toFixed(1)}`);
    }
    
    if (profile.activityLevel) {
      const activityMap = {
        'light': '軽度（デスクワーク中心、運動習慣なし）',
        'moderate': '中程度（立ち仕事、週2-3回の軽い運動）',
        'high': '高度（肉体労働、週4回以上の運動習慣）'
      };
      parts.push(`運動レベル: ${activityMap[profile.activityLevel]}`);
    }
    
    if (profile.currentHba1c) parts.push(`直近HbA1c: ${profile.currentHba1c}%`);
    if (profile.currentGlucose) parts.push(`現在の血糖値: ${profile.currentGlucose}mg/dL`);
    if (profile.mealType) parts.push(`測定タイミング: ${profile.mealType}`);
    
    return parts.join('\n');
  }

  private formatDietaryRestrictions(profile: UserHealthProfile): string {
    const parts = [];
    
    if (profile.currentCondition) {
      const conditionMap = {
        'good': '良好（積極的な血糖管理が可能）',
        'normal': '普通（標準的な糖尿病食事療法）',
        'poor': '不調（より厳格な血糖管理が必要）'
      };
      parts.push(`体調: ${conditionMap[profile.currentCondition]}`);
    }
    
    if (profile.dietRestriction) {
      const restrictionMap = {
        'strict': '厳格（低糖質、低GI食品中心）',
        'normal': '普通（バランス重視、適度な糖質制限）',
        'relaxed': '緩やか（緩やかな糖質コントロール）'
      };
      parts.push(`食事制限レベル: ${restrictionMap[profile.dietRestriction]}`);
    }
    
    return parts.join('\n');
  }

  async generateMeals(
    userProfile: UserHealthProfile,
    periodDays: number,
    servings: number,
    startDate?: Date
  ): Promise<{[key: string]: GeneratedMeal[]}> {
    if (!this.isAvailable()) {
      throw new Error('ChatGPT APIが利用できません。環境変数を確認してください。');
    }

    try {
      console.log('🚀 ChatGPT API呼び出し開始...');
      
      // タイムアウト付きfetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒タイムアウト
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',  // より安価で安定
          messages: [
            {
              role: 'system',
              content: 'あなたは糖尿病専門の管理栄養士です。必ず指定されたJSON形式でのみ応答してください。説明文は一切含めないでください。'
            },
            {
              role: 'user',
              content: this.generatePrompt(userProfile, periodDays, servings)
            }
          ],
          temperature: 0.3,  // より一貫性のある応答
          max_tokens: 2000,  // トークン数を制限
          response_format: { type: "json_object" }  // JSON形式を強制
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log('📡 ChatGPT API応答受信:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('ChatGPT API 詳細エラー:', {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData,
          apiKeyPresent: !!this.apiKey,
          apiKeyPrefix: this.apiKey ? this.apiKey.substring(0, 7) + '...' : 'なし'
        });
        
        // 具体的なエラーメッセージを提供
        let errorMessage = `ChatGPT API エラー: ${response.status}`;
        if (response.status === 401) {
          errorMessage = 'APIキーが無効です。OpenAI Platformで確認してください。';
        } else if (response.status === 429) {
          errorMessage = '使用制限に達しました。しばらく待ってから再試行してください。';
        } else if (response.status === 403) {
          errorMessage = 'APIアクセスが拒否されました。課金設定を確認してください。';
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      return this.parseAIResponse(aiResponse, periodDays, servings, startDate);
    } catch (error) {
      console.error('ChatGPT API通信エラー:', error);
      throw error;
    }
  }

  private parseAIResponse(
    aiResponse: string, 
    periodDays: number, 
    servings: number,
    startDate?: Date
  ): {[key: string]: GeneratedMeal[]} {
    try {
      console.log('ChatGPT 生レスポンス（最初の500文字）:', aiResponse.substring(0, 500));
      
      // より柔軟なJSON抽出
      let jsonData: any;
      
      // 方法1: 直接JSON解析を試行
      try {
        jsonData = JSON.parse(aiResponse);
      } catch (directParseError) {
        console.log('直接解析失敗、JSON抽出を試行...');
        
        // 方法2: JSON部分を抽出
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            jsonData = JSON.parse(jsonMatch[0]);
          } catch (extractParseError) {
            console.log('抽出解析失敗、代替形式を試行...');
            throw new Error('JSON解析に失敗しました');
          }
        } else {
          throw new Error('JSONデータが見つかりません');
        }
      }

      console.log('解析成功したJSONデータ構造:', Object.keys(jsonData));
      
      const weeklyMeals: {[key: string]: GeneratedMeal[]} = {};
      const baseDate = startDate || new Date();
      
      // データ構造の柔軟な検証
      let mealsArray: any[] = [];
      
      if (jsonData.meals && Array.isArray(jsonData.meals)) {
        mealsArray = jsonData.meals;
      } else if (Array.isArray(jsonData)) {
        mealsArray = jsonData;
      } else {
        console.warn('予期しないデータ構造、フォールバック生成を使用');
        throw new Error('無効なレスポンス形式');
      }
      
      // 期間日数分のデータを処理
      const processCount = Math.min(mealsArray.length, periodDays);
      
      console.log(`📊 解析状況: 要求${periodDays}日分、受信${mealsArray.length}日分、処理${processCount}日分`);
      
      for (let i = 0; i < processCount; i++) {
        const dayMeal = mealsArray[i];
        const currentDate = new Date(baseDate);
        currentDate.setDate(baseDate.getDate() + i);
        const dateKey = currentDate.toISOString().split('T')[0];
        
        const dailyMeals: GeneratedMeal[] = [];
        
        try {
          // 朝食
          if (dayMeal?.breakfast) {
            dailyMeals.push(this.formatMealData(
              dayMeal.breakfast, 
              `${i}-breakfast`, 
              servings, 
              '朝食'
            ));
          }
          
          // 昼食
          if (dayMeal?.lunch) {
            dailyMeals.push(this.formatMealData(
              dayMeal.lunch, 
              `${i}-lunch`, 
              servings, 
              '昼食'
            ));
          }
          
          // 夕食
          if (dayMeal?.dinner) {
            dailyMeals.push(this.formatMealData(
              dayMeal.dinner, 
              `${i}-dinner`, 
              servings, 
              '夕食'
            ));
          }
          
          if (dailyMeals.length > 0) {
            weeklyMeals[dateKey] = dailyMeals;
          }
        } catch (mealError) {
          console.warn(`日 ${i + 1} の献立データエラー:`, mealError);
          // この日はスキップして続行
        }
      }
      
      // 結果が空か不完全な場合はエラー
      if (Object.keys(weeklyMeals).length === 0) {
        throw new Error('解析可能な献立データがありませんでした');
      }
      
      // 要求された日数より大幅に少ない場合はエラー（ローカルエンジンにフォールバック）
      if (Object.keys(weeklyMeals).length < Math.max(1, periodDays * 0.5)) {
        throw new Error(`不完全なデータ: 要求${periodDays}日分に対し${Object.keys(weeklyMeals).length}日分のみ`);
      }
      
      console.log(`✅ ${Object.keys(weeklyMeals).length}日分の献立を解析完了`);
      return weeklyMeals;
      
    } catch (error) {
      console.error('ChatGPTレスポンス解析詳細エラー:', {
        error: error,
        responseLength: aiResponse?.length || 0,
        responseStart: aiResponse?.substring(0, 200) || 'なし'
      });
      throw new Error(`ChatGPTからの応答を解析できませんでした: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }

  private formatMealData(
    mealData: any, 
    id: string, 
    servings: number, 
    mealType: string
  ): GeneratedMeal {
    return {
      id,
      name: mealData.name || `${mealType}メニュー`,
      calories: parseInt(mealData.calories) || 300,
      carbs: parseInt(mealData.carbs) || 20,
      protein: parseInt(mealData.protein) || 25,
      fat: parseInt(mealData.fat) || 10,
      description: mealData.description || '血糖値管理に配慮したメニューです',
      ingredients: Array.isArray(mealData.ingredients) ? mealData.ingredients : ['食材情報なし'],
      recipe: Array.isArray(mealData.recipe) ? mealData.recipe : ['レシピ情報なし'],
      servings
    };
  }
}

export default new SecureAiService();