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
  preferredMainCourses?: string[];
  preferredMainIngredients?: string[];
  preferredSideIngredients?: string[];
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
      
      console.log('🔍 APIキー読み込みデバッグ情報:');
      console.log('- Constants.expoConfig存在:', !!Constants.expoConfig);
      console.log('- Constants.expoConfig.extra存在:', !!Constants.expoConfig?.extra);
      console.log('- openaiApiKey存在:', !!Constants.expoConfig?.extra?.openaiApiKey);
      console.log('- process.env.OPENAI_API_KEY存在:', !!process.env.OPENAI_API_KEY);
      console.log('- 最終APIキー存在:', !!envApiKey);
      console.log('- APIキー形式:', envApiKey ? (envApiKey.startsWith('sk-') ? '✅正常' : '❌無効') : '❌なし');
      
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
    // 食材選択に基づく要望を構築（複数選択対応）
    let foodPreferences = '';
    if (userProfile.preferredMainCourses && userProfile.preferredMainCourses.length > 0) {
      foodPreferences += `\n- 希望する主食: ${userProfile.preferredMainCourses.join('、')}`;
    }
    if (userProfile.preferredMainIngredients && userProfile.preferredMainIngredients.length > 0) {
      foodPreferences += `\n- 希望する主菜食材: ${userProfile.preferredMainIngredients.join('、')}`;
    }
    if (userProfile.preferredSideIngredients && userProfile.preferredSideIngredients.length > 0) {
      foodPreferences += `\n- 希望する副菜食材: ${userProfile.preferredSideIngredients.join('、')}`;
    }

    return `糖尿病専門栄養士として、${periodDays}日間の具体的な献立メニューを作成してください。

患者情報:
- 血糖値: ${userProfile.currentGlucose || '120'}mg/dL
- HbA1c: ${userProfile.currentHba1c || '6.5'}%
- 年齢: ${userProfile.age || '50'}歳
- 性別: ${userProfile.gender === 'male' ? '男性' : userProfile.gender === 'female' ? '女性' : '男性'}
- 体調: ${userProfile.currentCondition || '普通'}
- 食事制限: ${userProfile.dietRestriction || '普通'}

食材の好み:${foodPreferences || '\n- 特に指定なし'}

SmartMealsの厳格なルール（必須遵守）:
❌ 絶対に使用禁止の料理・食材:
- 揚げ物（とんかつ、唐揚げ、天ぷら、フライなど）
- 脂身の多い肉（豚バラ、ロース以外の部位）
- 油を多用する中華料理（チャーハン、麻婆豆腐、炒め物など）
- 食材選択セクションにない食材を使った料理
- 砂糖・みりんを多用する甘い料理

✅ 許可される食材のみ使用:
【主菜】鶏むね肉、ささみ、鶏もも肉、豚ヒレ肉、豚ロース、牛ヒレ肉、牛もも肉、ラム肉、鮭、サバ、イワシ、白身魚、エビ、イカ、タコ、ホタテ、アジ、豆腐、厚揚げ、納豆、豆乳、湯葉、おから
【野菜】ブロッコリー、ほうれん草、小松菜、人参、パプリカ、トマト、かぼちゃ、キャベツ、レタス、大根、きゅうり、もやし、玉ねぎ、なす、しいたけ、えのき、しめじ、エリンギ、まいたけ、わかめ、ひじき、のり、もずく、昆布

✅ 許可される調理法のみ:
- 蒸し、煮る、焼き（塩焼き・グリル）、サラダ・和え物、スープ・汁物

要件:
- ${periodDays}日分の具体的で実用的な献立
- 各日異なる料理名（例：鶏むね肉の塩焼き、鮭の蒸し焼き、豆腐の煮物など）
- 上記ルールを100%遵守した健康的料理のみ
- 糖尿病患者に適した低GI・低脂質の栄養バランス
- 可能な限り患者の食材の好みを反映した献立

以下の形式でJSONのみ返してください。
※レシピは必ず【下ごしらえ】【調理】【仕上げ】などの工程に分けて、10ステップ以上の詳細な手順で記載してください。

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
        "recipe": [
          "【下ごしらえ】鶏胸肉は1cm角に切り、塩こしょうで下味をつける",
          "【下ごしらえ】ほうれん草は洗って3cm長さに切る",
          "【下ごしらえ】卵をボウルに割り入れ、塩少々を加えてよく溶きほぐす",
          "【調理】フライパンにオリーブオイル小さじ1を熱し、鶏肉を中火で炒める",
          "【調理】鶏肉に火が通ったら、ほうれん草を加えてさっと炒める",
          "【調理】具材を一度取り出し、フライパンを拭いて残りのオリーブオイルを入れる",
          "【調理】溶き卵を流し入れ、大きくかき混ぜながら半熟状にする",
          "【仕上げ】卵の中央に具材を乗せ、半分に折りたたむ",
          "【盛り付け】器に盛り、お好みでパセリを散らして完成"
        ]
      },
      "lunch": {
        "name": "具体的な料理名（例：キノコサラダ）",
        "calories": 320,
        "carbs": 15,
        "protein": 25,
        "fat": 18,
        "description": "この料理が血糖値管理に良い理由",
        "ingredients": ["しめじ 100g", "レタス 80g", "トマト 1個"],
        "recipe": [
          "【下ごしらえ】しめじは石づきを切り落とし、小房に分ける",
          "【下ごしらえ】レタスは冷水に5分さらしてパリッとさせ、水気を切って一口大にちぎる",
          "【調理】フライパンを中火で熱し、油を引かずにきのこを入れる",
          "【仕上げ】器にレタスを敷き、きのこをのせてドレッシングをかける"
        ]
      },
      "dinner": {
        "name": "具体的な料理名（例：白身魚の蒸し焼き）",
        "calories": 300,
        "carbs": 12,
        "protein": 35,
        "fat": 12,
        "description": "この料理が血糖値管理に良い理由",
        "ingredients": ["白身魚 120g", "ブロッコリー 100g"],
        "recipe": [
          "【下ごしらえ】白身魚は水気を拭き取り、両面に塩を振って10分置く",
          "【下ごしらえ】出てきた水分を拭き取り、白ワインを振りかけて臭みを取る",
          "【調理】アルミホイルに魚と野菜を乗せ、レモンを添えて包む",
          "【調理】200度のオーブンで15分蒸し焼きにする",
          "【仕上げ】器に盛り付けて完成"
        ]
      }
    }
  ]
}

必須: ${periodDays}日分すべて異なる具体的な料理名で生成してください。

⚠️ 重要な確認事項:
- すべての料理名が揚げ物・炒め物を含まないこと
- すべての食材が上記許可リストに含まれること
- すべての調理法が蒸し・煮る・焼き・サラダ・スープのみであること
- 一つでも禁止項目が含まれている場合は生成をやり直すこと`;
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

    // 長期間の場合は分割生成
    if (periodDays > 3) {
      return this.generateMealsWithBatching(userProfile, periodDays, servings, startDate);
    }

    return this.generateSingleBatch(userProfile, periodDays, servings, startDate);
  }

  private async generateSingleBatch(
    userProfile: UserHealthProfile,
    periodDays: number,
    servings: number,
    startDate?: Date
  ): Promise<{[key: string]: GeneratedMeal[]}> {
    try {
      console.log(`🚀 ChatGPT API呼び出し開始... (${periodDays}日分)`);
      
      // タイムアウト付きfetch（60秒に延長）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒タイムアウト
      
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
          max_tokens: 4000,  // より多くのトークン数
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

  private async generateMealsWithBatching(
    userProfile: UserHealthProfile,
    periodDays: number,
    servings: number,
    startDate?: Date
  ): Promise<{[key: string]: GeneratedMeal[]}> {
    console.log(`📦 分割生成開始: ${periodDays}日分を複数回に分けて生成`);
    
    const batchSize = 3; // 1回あたり3日分
    const batches = Math.ceil(periodDays / batchSize);
    const allMeals: {[key: string]: GeneratedMeal[]} = {};
    const baseDate = startDate || new Date();

    for (let i = 0; i < batches; i++) {
      const startDay = i * batchSize;
      const remainingDays = periodDays - startDay;
      const currentBatchSize = Math.min(batchSize, remainingDays);
      
      const batchStartDate = new Date(baseDate);
      batchStartDate.setDate(baseDate.getDate() + startDay);
      
      console.log(`🔄 バッチ ${i + 1}/${batches}: ${currentBatchSize}日分生成中...`);
      
      try {
        // 少し間隔を空けてAPI呼び出し（レート制限回避）
        if (i > 0) {
          console.log('⏳ API呼び出し間隔調整中...');
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2秒待機
        }
        
        const batchMeals = await this.generateSingleBatch(
          userProfile, 
          currentBatchSize, 
          servings, 
          batchStartDate
        );
        
        // 結果をマージ
        Object.assign(allMeals, batchMeals);
        console.log(`✅ バッチ ${i + 1} 完了: ${Object.keys(batchMeals).length}日分追加`);
        
      } catch (error) {
        console.warn(`❌ バッチ ${i + 1} 失敗:`, error);
        
        // 失敗した分はローカルエンジンで補完
        console.log(`🏠 バッチ ${i + 1} をローカルエンジンで補完中...`);
        try {
          const localMealEngine = require('./localMealEngine').default;
          const fallbackMeals = await localMealEngine.generatePersonalizedMeals(
            userProfile,
            currentBatchSize,
            servings,
            batchStartDate
          );
          
          Object.assign(allMeals, fallbackMeals);
          console.log(`✅ バッチ ${i + 1} ローカル補完完了`);
          
        } catch (localError) {
          console.error(`❌ バッチ ${i + 1} ローカル補完も失敗:`, localError);
          // このバッチはスキップして次へ
        }
      }
    }
    
    const finalDayCount = Object.keys(allMeals).length;
    console.log(`🎯 分割生成完了: ${finalDayCount}日分の献立を生成 (要求: ${periodDays}日分)`);
    
    if (finalDayCount === 0) {
      throw new Error('すべてのバッチ生成に失敗しました');
    }
    
    return allMeals;
  }

  private parseAIResponse(
    aiResponse: string, 
    periodDays: number, 
    servings: number,
    startDate?: Date
  ): {[key: string]: GeneratedMeal[]} {
    try {
      console.log('📥 ChatGPT レスポンス全体（デバッグ用）:');
      console.log('レスポンス長:', aiResponse.length);
      console.log('先頭500文字:', aiResponse.substring(0, 500));
      console.log('末尾200文字:', aiResponse.substring(aiResponse.length - 200));
      
      // より柔軟なJSON抽出
      let jsonData: any;
      
      // より柔軟なJSON修復とパース
      try {
        jsonData = JSON.parse(aiResponse);
        console.log('✅ 直接JSON解析成功');
      } catch (directParseError) {
        console.log('直接解析失敗、JSON修復を試行...');
        
        // 不完全なJSONを修復
        let fixedJson = aiResponse.trim();
        
        // 1. 最後の不完全な文字列や部分的なオブジェクトを削除
        // 完全な }] } パターンを探す
        const completePattern = /\}\s*\]\s*\}\s*$/;
        if (!completePattern.test(fixedJson)) {
          console.log('不完全なJSON検出、修復中...');
          
          // 最後の完全な dinner オブジェクトまでを探す
          const lastDinnerIndex = fixedJson.lastIndexOf('"dinner"');
          if (lastDinnerIndex > 0) {
            // dinner オブジェクトの後の完全な } を探す
            let searchStart = lastDinnerIndex;
            let braceCount = 0;
            let endIndex = -1;
            
            for (let i = searchStart; i < fixedJson.length; i++) {
              if (fixedJson[i] === '{') braceCount++;
              if (fixedJson[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                  endIndex = i + 1;
                  break;
                }
              }
            }
            
            if (endIndex > 0) {
              fixedJson = fixedJson.substring(0, endIndex) + ']}';
              console.log('JSON修復完了:', fixedJson.length, '文字');
            }
          }
        }
        
        // 2. 修復されたJSONをパース
        try {
          jsonData = JSON.parse(fixedJson);
          console.log('✅ JSON修復成功');
        } catch (fixParseError) {
          console.log('修復解析失敗、正規表現抽出を試行...');
          
          // 3. より強力な正規表現でJSON部分を抽出
          const jsonMatch = fixedJson.match(/\{[\s\S]*"meals"[\s\S]*\]/);
          if (jsonMatch) {
            // 不完全な部分を修正してから閉じ括弧を追加
            let extractedJson = jsonMatch[0];
            if (!extractedJson.includes('"meals":[')) {
              extractedJson = extractedJson.replace('"meals":', '"meals":[') + ']}';
            } else {
              if (!extractedJson.endsWith('}')) {
                extractedJson += '}';
              }
            }
            
            try {
              jsonData = JSON.parse(extractedJson);
              console.log('✅ 正規表現抽出成功');
            } catch (regexParseError) {
              console.error('全ての解析方法が失敗:', regexParseError);
              throw new Error('JSON解析に失敗しました');
            }
          } else {
            throw new Error('JSONデータが見つかりません');
          }
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