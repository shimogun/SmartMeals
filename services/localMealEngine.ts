// SmartMeals ローカル献立生成エンジン - API不要のルールベース生成
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserHealthProfile {
  // 基本健康データ
  height?: number;
  weight?: number;
  gender?: 'male' | 'female';
  activityLevel?: 'light' | 'moderate' | 'high';
  age?: number;
  
  // 変動データ
  currentHba1c?: string;
  currentCondition?: 'good' | 'normal' | 'poor';
  dietRestriction?: 'strict' | 'normal' | 'relaxed';
  currentGlucose?: number;
  mealType?: string;
  
  // 食材選択データ（複数選択対応）
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

interface MealTemplate {
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
}

class LocalMealEngine {
  private mealTemplates: MealTemplate[] = [];

  constructor() {
    this.initializeMealTemplates();
  }

  private initializeMealTemplates(): void {
    this.mealTemplates = [
      // 朝食メニュー
      {
        name: '鶏胸肉のオムレツ',
        baseCalories: 280,
        baseCarbs: 8,
        baseProtein: 28,
        baseFat: 15,
        ingredients: ['鶏胸肉100g', '卵2個', 'ほうれん草50g', 'チーズ20g', 'オリーブオイル大さじ1'],
        recipe: [
          '鶏胸肉を小さく切り、塩胡椒で下味をつける',
          'ほうれん草を茹でて水気を切る',
          '卵を溶いて塩胡椒で味付け',
          'フライパンで鶏胸肉を炒める',
          '卵液を加えて半熟状態でほうれん草とチーズを乗せる',
          '半分に折って完成'
        ],
        category: 'breakfast',
        diabeticFriendly: true,
        lowCarb: true,
        highProtein: true,
        difficulty: 'easy'
      },
      {
        name: '鮭のムニエル',
        baseCalories: 290,
        baseCarbs: 5,
        baseProtein: 30,
        baseFat: 16,
        ingredients: ['鮭切り身120g', 'レモン1/2個', 'バター10g', 'ほうれん草100g', '塩胡椒'],
        recipe: [
          '鮭に塩胡椒で下味をつけて15分置く',
          'ほうれん草をさっと茹でる',
          'フライパンでバターを溶かす',
          '鮭を両面焼く',
          'ほうれん草を付け合わせ、レモンを絞る'
        ],
        category: 'breakfast',
        diabeticFriendly: true,
        lowCarb: true,
        highProtein: true,
        difficulty: 'easy'
      },
      {
        name: 'アボカド納豆トースト',
        baseCalories: 320,
        baseCarbs: 25,
        baseProtein: 18,
        baseFat: 18,
        ingredients: ['全粒粉パン1枚', '納豆1パック', 'アボカド1/2個', '海苔', 'オリーブオイル小さじ1'],
        recipe: [
          'アボカドを潰してペースト状にする',
          '納豆をよく混ぜる',
          '全粒粉パンを軽くトーストする',
          'アボカドペーストを塗る',
          '納豆をのせて海苔を散らす',
          'オリーブオイルを数滴たらして完成'
        ],
        category: 'breakfast',
        diabeticFriendly: true,
        lowCarb: false,
        highProtein: true,
        difficulty: 'easy'
      },
      {
        name: 'ギリシャヨーグルトパフェ',
        baseCalories: 250,
        baseCarbs: 20,
        baseProtein: 20,
        baseFat: 8,
        ingredients: ['ギリシャヨーグルト150g', 'ミックスベリー80g', 'アーモンド20g', 'チアシード小さじ1'],
        recipe: [
          'ギリシャヨーグルトを器に入れる',
          'ミックスベリーを洗って水気を切る',
          'アーモンドを軽く砕く',
          'ヨーグルトの上にベリーをのせる',
          'アーモンドとチアシードを散らす'
        ],
        category: 'breakfast',
        diabeticFriendly: true,
        lowCarb: true,
        highProtein: true,
        difficulty: 'easy'
      },
      {
        name: '豆腐スクランブルエッグ',
        baseCalories: 260,
        baseCarbs: 10,
        baseProtein: 22,
        baseFat: 14,
        ingredients: ['木綿豆腐150g', '卵1個', 'ねぎ30g', 'ごま油小さじ1', '醤油小さじ1'],
        recipe: [
          '豆腐をざっと崩す',
          'ねぎを小口切りにする',
          'フライパンでごま油を熱する',
          '豆腐を炒めて水分を飛ばす',
          '溶き卵とねぎを加えて炒める',
          '醤油で味を調える'
        ],
        category: 'breakfast',
        diabeticFriendly: true,
        lowCarb: true,
        highProtein: true,
        difficulty: 'easy'
      },

      // 昼食メニュー
      {
        name: 'キノコたっぷりサラダ',
        baseCalories: 220,
        baseCarbs: 15,
        baseProtein: 12,
        baseFat: 14,
        ingredients: ['しめじ', 'えのき', 'レタス', 'トマト', 'アボカド', '亜麻仁油', '鶏ささみ'],
        recipe: [
          'きのこ類をバターで炒めて冷ます',
          '鶏ささみを茹でて裂く',
          'レタスを手でちぎる',
          'トマトを角切り、アボカドをスライス',
          '全ての野菜と鶏ささみを混ぜる',
          '亜麻仁油と塩胡椒でドレッシングを作る',
          'ドレッシングをかけて混ぜ合わせる'
        ],
        category: 'lunch',
        diabeticFriendly: true,
        lowCarb: true,
        highProtein: true,
        difficulty: 'easy'
      },
      {
        name: '豆腐ハンバーグ定食',
        baseCalories: 350,
        baseCarbs: 25,
        baseProtein: 25,
        baseFat: 18,
        ingredients: ['豆腐', '鶏ひき肉', '玉ねぎ', 'きのこ', '玄米', 'みそ'],
        recipe: [
          '豆腐の水気をしっかり切る',
          '玉ねぎをみじん切りにして炒める',
          '豆腐、鶏ひき肉、玉ねぎを混ぜる',
          'ハンバーグ形に成形して焼く',
          'きのこソースを作る',
          '玄米と一緒に盛り付け'
        ],
        category: 'lunch',
        diabeticFriendly: true,
        lowCarb: false,
        highProtein: true,
        difficulty: 'medium'
      },
      {
        name: 'お魚のカルパッチョ',
        baseCalories: 280,
        baseCarbs: 8,
        baseProtein: 30,
        baseFat: 15,
        ingredients: ['白身魚', 'ルッコラ', 'トマト', 'オリーブオイル', 'レモン', 'ケーパー'],
        recipe: [
          '白身魚を薄くスライス',
          'ルッコラとトマトを準備',
          'レモン汁、オリーブオイル、塩でドレッシング',
          '魚を皿に美しく並べる',
          'ルッコラとトマトを散らす',
          'ドレッシングとケーパーをのせて完成'
        ],
        category: 'lunch',
        diabeticFriendly: true,
        lowCarb: true,
        highProtein: true,
        difficulty: 'medium'
      },

      // 夕食メニュー
      {
        name: '白身魚の蒸し焼き',
        baseCalories: 300,
        baseCarbs: 12,
        baseProtein: 35,
        baseFat: 12,
        ingredients: ['白身魚', 'ブロッコリー', 'ニンジン', 'レモン', 'ハーブソルト'],
        recipe: [
          '白身魚に塩胡椒とハーブソルトをまぶす',
          'ブロッコリーとニンジンを一口大に切る',
          'アルミホイルに魚と野菜を乗せる',
          'レモンスライスを乗せて包む',
          '200度のオーブンで15分焼く',
          '器に盛り付けて完成'
        ],
        category: 'dinner',
        diabeticFriendly: true,
        lowCarb: true,
        highProtein: true,
        difficulty: 'easy'
      },
      {
        name: '鶏むね肉のグリル',
        baseCalories: 320,
        baseCarbs: 10,
        baseProtein: 40,
        baseFat: 14,
        ingredients: ['鶏むね肉', 'ズッキーニ', 'パプリカ', 'ローズマリー', 'オリーブオイル'],
        recipe: [
          '鶏むね肉を開いて平たくする',
          'ハーブと塩胡椒で下味',
          'ズッキーニとパプリカを切る',
          'グリルパンで鶏肉を焼く',
          '野菜も同じく焼く',
          'ローズマリーで香りをつけて完成'
        ],
        category: 'dinner',
        diabeticFriendly: true,
        lowCarb: true,
        highProtein: true,
        difficulty: 'medium'
      },
      {
        name: '豆腐ステーキきのこあんかけ',
        baseCalories: 280,
        baseCarbs: 18,
        baseProtein: 22,
        baseFat: 16,
        ingredients: ['木綿豆腐', 'しいたけ', 'えのき', 'ねぎ', '生姜', '醤油'],
        recipe: [
          '豆腐を厚切りにして水気を切る',
          'きのこ類を食べやすく切る',
          '豆腐をフライパンで焼く',
          'きのこあんかけを作る',
          '豆腐にあんかけをかける',
          'ねぎと生姜を散らして完成'
        ],
        category: 'dinner',
        diabeticFriendly: true,
        lowCarb: true,
        highProtein: true,
        difficulty: 'medium'
      },
    ];
  }

  async generatePersonalizedMeals(
    userProfile: UserHealthProfile,
    periodDays: number,
    servings: number,
    startDate?: Date
  ): Promise<{[key: string]: GeneratedMeal[]}> {
    
    const weeklyMeals: {[key: string]: GeneratedMeal[]} = {};
    const baseDate = startDate || new Date();
    
    // ユーザープロフィールを分析
    const nutritionMultipliers = this.calculateNutritionMultipliers(userProfile);
    const filteredMeals = this.filterMealsForUser(userProfile);
    
    console.log(`🏠 ローカルエンジン: ${periodDays}日分の献立生成開始`);
    
    for (let i = 0; i < periodDays; i++) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(baseDate.getDate() + i);
      const dateKey = currentDate.toISOString().split('T')[0];
      
      console.log(`📅 ${i + 1}日目 (${dateKey}) の献立生成中...`);
      
      const dailyMeals: GeneratedMeal[] = [];
      
      // 朝食
      const breakfast = this.selectMeal(filteredMeals, 'breakfast', i);
      dailyMeals.push(this.createMealFromTemplate(
        breakfast, 
        `${i}-breakfast`, 
        nutritionMultipliers, 
        servings, 
        userProfile,
        '朝食'
      ));
      
      // 昼食
      const lunch = this.selectMeal(filteredMeals, 'lunch', i);
      dailyMeals.push(this.createMealFromTemplate(
        lunch, 
        `${i}-lunch`, 
        nutritionMultipliers, 
        servings, 
        userProfile,
        '昼食'
      ));
      
      // 夕食
      const dinner = this.selectMeal(filteredMeals, 'dinner', i);
      dailyMeals.push(this.createMealFromTemplate(
        dinner, 
        `${i}-dinner`, 
        nutritionMultipliers, 
        servings, 
        userProfile,
        '夕食'
      ));
      
      weeklyMeals[dateKey] = dailyMeals;
    }
    
    console.log(`✅ ローカルエンジン: ${Object.keys(weeklyMeals).length}日分の献立生成完了`);
    return weeklyMeals;
  }

  private calculateNutritionMultipliers(profile: UserHealthProfile): {
    calorie: number;
    carb: number;
    protein: number;
    fat: number;
  } {
    let calorieMultiplier = 1.0;
    let carbMultiplier = 1.0;
    let proteinMultiplier = 1.0;
    let fatMultiplier = 1.0;

    // 年齢と性別による基礎代謝調整
    if (profile.age && profile.age > 60) {
      calorieMultiplier *= 0.9;
    }
    if (profile.gender === 'male') {
      calorieMultiplier *= 1.1;
      proteinMultiplier *= 1.1;
    }

    // 運動レベルによる調整
    switch (profile.activityLevel) {
      case 'light':
        calorieMultiplier *= 0.9;
        break;
      case 'high':
        calorieMultiplier *= 1.2;
        proteinMultiplier *= 1.15;
        break;
    }

    // 血糖値状態による調整
    if (profile.currentGlucose && profile.currentGlucose > 140) {
      carbMultiplier *= 0.7; // 炭水化物を制限
      proteinMultiplier *= 1.1;
    }

    // HbA1cによる調整
    if (profile.currentHba1c) {
      const hba1c = parseFloat(profile.currentHba1c);
      if (hba1c > 7.0) {
        carbMultiplier *= 0.8;
        proteinMultiplier *= 1.1;
      }
    }

    // 食事制限レベルによる調整
    switch (profile.dietRestriction) {
      case 'strict':
        carbMultiplier *= 0.6;
        proteinMultiplier *= 1.2;
        fatMultiplier *= 0.9;
        break;
      case 'relaxed':
        carbMultiplier *= 1.1;
        break;
    }

    // 体調による調整
    switch (profile.currentCondition) {
      case 'poor':
        calorieMultiplier *= 0.95;
        carbMultiplier *= 0.8;
        break;
      case 'good':
        calorieMultiplier *= 1.05;
        break;
    }

    return {
      calorie: calorieMultiplier,
      carb: carbMultiplier,
      protein: proteinMultiplier,
      fat: fatMultiplier
    };
  }

  private filterMealsForUser(profile: UserHealthProfile): MealTemplate[] {
    let filteredMeals = [...this.mealTemplates];

    // 糖尿病に適したメニューを優先
    filteredMeals = filteredMeals.filter(meal => meal.diabeticFriendly);

    // 食事制限レベルに応じたフィルタリング
    if (profile.dietRestriction === 'strict') {
      filteredMeals = filteredMeals.filter(meal => meal.lowCarb);
    }

    return filteredMeals;
  }

  private selectMeal(
    availableMeals: MealTemplate[], 
    category: 'breakfast' | 'lunch' | 'dinner', 
    dayIndex: number
  ): MealTemplate {
    const categoryMeals = availableMeals.filter(meal => meal.category === category);
    
    // ローテーションして重複を避ける
    const selectedIndex = dayIndex % categoryMeals.length;
    return categoryMeals[selectedIndex];
  }

  private createMealFromTemplate(
    template: MealTemplate,
    id: string,
    multipliers: { calorie: number; carb: number; protein: number; fat: number },
    servings: number,
    profile: UserHealthProfile,
    mealTypeJapanese: string
  ): GeneratedMeal {
    
    // 栄養価を調整
    const adjustedCalories = Math.round(template.baseCalories * multipliers.calorie);
    const adjustedCarbs = Math.round(template.baseCarbs * multipliers.carb);
    const adjustedProtein = Math.round(template.baseProtein * multipliers.protein);
    const adjustedFat = Math.round(template.baseFat * multipliers.fat);

    // パーソナライズされた説明を生成
    const personalizedDescription = this.generatePersonalizedDescription(
      template, 
      profile, 
      mealTypeJapanese
    );

    return {
      id,
      name: template.name,
      calories: adjustedCalories,
      carbs: adjustedCarbs,
      protein: adjustedProtein,
      fat: adjustedFat,
      description: personalizedDescription,
      ingredients: [...template.ingredients],
      recipe: [...template.recipe],
      servings
    };
  }

  private generatePersonalizedDescription(
    template: MealTemplate,
    profile: UserHealthProfile,
    mealType: string
  ): string {
    let description = `${mealType}に最適化された血糖値管理メニュー。`;

    // 食材選択に基づく説明を追加（複数選択対応）
    if (profile.preferredMainCourses && profile.preferredMainCourses.length > 0) {
      const mainCoursesText = profile.preferredMainCourses.join('、');
      if (profile.preferredMainCourses.some(course => course.includes('玄米') || course.includes('雑穀'))) {
        description += "選択された低GI主食で血糖値上昇を緩やかにします。";
      } else if (profile.preferredMainCourses.some(course => course.includes('なし'))) {
        description += "主食なしの糖質制限スタイルでケトジェニック効果を重視します。";
      } else if (profile.preferredMainCourses.some(course => course.includes('オートミール'))) {
        description += "水溶性食物繊維豊富なオートミールで満腹感と血糖値安定を両立。";
      }
    }

    if (profile.preferredMainIngredients && profile.preferredMainIngredients.length > 0) {
      if (profile.preferredMainIngredients.some(ingredient => ingredient.includes('鶏むね肉') || ingredient.includes('ささみ'))) {
        description += "高タンパク・低脂肪の鶏肉で筋肉維持をサポート。";
      } else if (profile.preferredMainIngredients.some(ingredient => ingredient.includes('鮭') || ingredient.includes('サバ'))) {
        description += "オメガ3脂肪酸豊富な魚で心血管の健康もケア。";
      } else if (profile.preferredMainIngredients.some(ingredient => ingredient.includes('豆腐'))) {
        description += "植物性タンパク質で消化に優しく血糖値に影響を与えません。";
      }
    }

    if (profile.preferredSideIngredients && profile.preferredSideIngredients.length > 0) {
      if (profile.preferredSideIngredients.some(ingredient => ingredient.includes('ブロッコリー') || ingredient.includes('ほうれん草'))) {
        description += "緑黄色野菜で抗酸化作用とミネラル補給。";
      } else if (profile.preferredSideIngredients.some(ingredient => ingredient.includes('きのこ'))) {
        description += "きのこ類の食物繊維で血糖値上昇抑制効果を期待。";
      } else if (profile.preferredSideIngredients.some(ingredient => ingredient.includes('わかめ') || ingredient.includes('ひじき'))) {
        description += "海藻のミネラルと水溶性食物繊維で代謝をサポート。";
      }
    }

    // 個人の状況に応じた説明を追加
    if (profile.currentGlucose && profile.currentGlucose > 140) {
      description += "現在の血糖値が高めのため、低GI食材中心の構成です。";
    }

    if (profile.dietRestriction === 'strict') {
      description += "厳格な糖質制限に対応した低炭水化物メニューです。";
    }

    if (template.highProtein) {
      description += "高タンパク質で筋肉維持と血糖値安定をサポートします。";
    }

    if (profile.currentCondition === 'poor') {
      description += "体調不良時でも消化しやすく調理しています。";
    }

    return description;
  }

  // テスト用のダミー生成
  async generateSampleMeals(periodDays: number, servings: number, startDate?: Date): Promise<{[key: string]: GeneratedMeal[]}> {
    return this.generatePersonalizedMeals(
      {
        age: 45,
        gender: 'male',
        height: 170,
        weight: 70,
        activityLevel: 'moderate',
        currentGlucose: 120,
        currentHba1c: '6.8',
        currentCondition: 'normal',
        dietRestriction: 'normal'
      },
      periodDays,
      servings,
      startDate
    );
  }
}

export default new LocalMealEngine();