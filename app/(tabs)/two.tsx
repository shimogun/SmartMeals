import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, Alert, 
  Modal, TextInput, ActivityIndicator 
} from 'react-native';
import { PanResponder } from 'react-native';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import secureAiService, { UserHealthProfile } from '../../services/secureAiService';
import localMealEngine from '../../services/localMealEngine';
import mealStorageService from '../../services/mealStorageService';
import { SavedMealPlan } from '../../types';

// 型定義
interface GlucoseRecord {
  id: string;
  value: number;
  timestamp: number;
  date: string;
  mealType: string;
  mealNote?: string;
  userId?: string;
}

interface User {
  id: string;
  name: string;
  age?: number;
  healthData?: {
    height?: number;
    weight?: number;
    gender?: 'male' | 'female';
    activityLevel?: 'light' | 'moderate' | 'high';
  };
}

interface GeneratedMeal {
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

export default function TwoScreen() {
  // 基本状態
  const [currentStep, setCurrentStep] = useState(1);
  const [glucose, setGlucose] = useState(120);
  const [records, setRecords] = useState<GlucoseRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMealType, setSelectedMealType] = useState('食前');
  const [mealNote, setMealNote] = useState('');
  
  // 食材選択状態
  const [selectedMainCourses, setSelectedMainCourses] = useState<string[]>([]);
  const [selectedMainIngredients, setSelectedMainIngredients] = useState<string[]>([]);
  const [selectedSideIngredients, setSelectedSideIngredients] = useState<string[]>([]);
  
  // その他の状態
  const [currentHba1c, setCurrentHba1c] = useState('');
  const [currentCondition, setCurrentCondition] = useState<'good' | 'normal' | 'poor'>('normal');
  const [dietRestriction, setDietRestriction] = useState<'strict' | 'normal' | 'relaxed'>('normal');
  const [showMealModal, setShowMealModal] = useState(false);
  const [selectedMealDetail, setSelectedMealDetail] = useState<GeneratedMeal | null>(null);
  
  // 献立生成関連
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMeals, setGeneratedMeals] = useState<{[key: string]: GeneratedMeal[]}>({});
  const [selectedPeriod, setSelectedPeriod] = useState(3);
  const [selectedServings, setSelectedServings] = useState(1);
  const [selectedStartDate, setSelectedStartDate] = useState(new Date());
  
  // 保存された献立プラン関連
  const [savedMealPlans, setSavedMealPlans] = useState<SavedMealPlan[]>([]);
  const [showSavedPlansModal, setShowSavedPlansModal] = useState(false);
  const [selectedSavedPlan, setSelectedSavedPlan] = useState<SavedMealPlan | null>(null);

  // お気に入り
  const [favoriteMealIds, setFavoriteMealIds] = useState<Set<string>>(new Set());

  // 食材データ
  const mainCourses = [
    '白米',
    '玄米', 
    '雑穀米 / 五穀米',
    'もち麦ごはん',
    '全粒粉パン / ブランパン',
    'オートミール',
    'そば',
    'こんにゃく米',
    '主食なし'
  ];

  const mainIngredients = {
    '肉類': ['鶏むね肉', 'ささみ', '鶏もも肉', '豚ヒレ肉', '豚ロース', '牛ヒレ肉', '牛もも肉', 'ラム肉'],
    '魚介類': ['鮭', 'サバ', 'イワシ', '白身魚', 'エビ', 'イカ', 'タコ', 'ホタテ', 'アジ'],
    '大豆製品': ['豆腐', '厚揚げ', '納豆', '豆乳', '湯葉', 'おから']
  };

  const sideIngredients = {
    '緑黄色野菜': ['ブロッコリー', 'ほうれん草', '小松菜', '人参', 'パプリカ', 'トマト', 'かぼちゃ'],
    '淡色野菜': ['キャベツ', 'レタス', '大根', 'きゅうり', 'もやし', '玉ねぎ', 'なす'],
    'きのこ類': ['しいたけ', 'えのき', 'しめじ', 'エリンギ', 'まいたけ'],
    '海藻類': ['わかめ', 'ひじき', 'のり', 'もずく', '昆布']
  };

  // ユーティリティ関数
  const toggleSelection = (item: string, currentList: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (currentList.includes(item)) {
      setList(currentList.filter(i => i !== item));
    } else {
      setList([...currentList, item]);
    }
  };


  // スワイプ処理
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
    },
    onPanResponderMove: (evt, gestureState) => {
      const sensitivity = 0.8;
      const newValue = glucose + gestureState.dx * sensitivity;
      const clampedValue = Math.max(50, Math.min(400, Math.round(newValue)));
      setGlucose(clampedValue);
    },
  });

  // 初期化
  useEffect(() => {
    loadUsers();
    loadRecords();
    loadSavedMealPlans();
    loadFavorites();
  }, []);

  const loadUsers = async () => {
    try {
      const stored = await AsyncStorage.getItem('users');
      if (stored) {
        const usersData = JSON.parse(stored);
        setUsers(usersData);
        if (usersData.length > 0 && !selectedUserId) {
          setSelectedUserId(usersData[0].id);
        }
      }
    } catch (error) {
      console.error('ユーザーデータ読み込みエラー:', error);
    }
  };

  const loadRecords = async () => {
    try {
      const stored = await AsyncStorage.getItem('glucose_records');
      if (stored) {
        setRecords(JSON.parse(stored));
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    }
  };

  const loadSavedMealPlans = async () => {
    try {
      console.log('🔄 loadSavedMealPlans開始 selectedUserId:', selectedUserId);
      let plans;
      if (selectedUserId) {
        plans = await mealStorageService.getUserMealPlans(selectedUserId);
        console.log(`📋 ユーザー別献立プラン取得: ${plans.length}件`);
      } else {
        plans = await mealStorageService.getSavedMealPlans();
        console.log(`📋 全献立プラン取得: ${plans.length}件`);
      }
      setSavedMealPlans(plans);
      console.log(`✅ 保存された献立プラン読み込み完了: ${plans.length}件`);
      console.log('📊 プラン詳細:', plans.map(p => ({ id: p.id, name: p.name, userId: p.userId })));
    } catch (error) {
      console.error('❌ 保存献立プラン読み込みエラー:', error);
    }
  };

  // お気に入り読み込み
  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem('favorite_meal_ids');
      if (stored) setFavoriteMealIds(new Set(JSON.parse(stored)));
    } catch (error) {
      console.error('お気に入り読み込みエラー:', error);
    }
  };

  // お気に入りトグル
  const toggleFavorite = async (mealId: string) => {
    const updated = new Set(favoriteMealIds);
    if (updated.has(mealId)) {
      updated.delete(mealId);
    } else {
      updated.add(mealId);
    }
    setFavoriteMealIds(updated);
    await AsyncStorage.setItem('favorite_meal_ids', JSON.stringify([...updated]));
  };

  // ユーザー変更時に保存済み献立プランも更新
  useEffect(() => {
    if (selectedUserId) {
      loadSavedMealPlans();
    }
  }, [selectedUserId]);

  // ステップ1: 血糖値入力
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionTitle}>血糖値を記録</Text>
      
      <ScrollView 
        style={styles.stepScrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.stepScrollContent}
        directionalLockEnabled={true}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        {/* 食材選択セクション */}
        <View style={styles.ingredientSection}>
          <Text style={styles.variableSectionTitle}>🍽️ 食材の好み</Text>
          
          {/* 主食選択 */}
          <View style={styles.ingredientRow}>
            <Text style={styles.ingredientLabel}>主食</Text>
            <View style={styles.ingredientOptionsContainer}>
              {mainCourses.map((course, index) => {
                const isSelected = selectedMainCourses.includes(course);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.ingredientOption, isSelected && styles.ingredientOptionSelected]}
                    onPress={() => toggleSelection(course, selectedMainCourses, setSelectedMainCourses)}
                  >
                    <Text style={[styles.ingredientOptionText, isSelected && styles.ingredientOptionTextSelected]}>
                      {course}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#007AFF" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 主菜選択 */}
          <View style={styles.ingredientRow}>
            <Text style={styles.ingredientLabel}>主菜</Text>
            {Object.entries(mainIngredients).map(([category, items]) => (
              <View key={category}>
                <Text style={styles.categoryLabel}>{category}</Text>
                <View style={styles.ingredientOptionsContainer}>
                  {items.map((item, index) => {
                    const isSelected = selectedMainIngredients.includes(item);
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[styles.ingredientOption, isSelected && styles.ingredientOptionSelected]}
                        onPress={() => toggleSelection(item, selectedMainIngredients, setSelectedMainIngredients)}
                      >
                        <Text style={[styles.ingredientOptionText, isSelected && styles.ingredientOptionTextSelected]}>
                          {item}
                        </Text>
                        {isSelected && <Ionicons name="checkmark" size={16} color="#4CAF50" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          {/* 副菜選択 */}
          <View style={styles.ingredientRow}>
            <Text style={styles.ingredientLabel}>副菜</Text>
            {Object.entries(sideIngredients).map(([category, items]) => (
              <View key={category}>
                <Text style={styles.categoryLabel}>{category}</Text>
                <View style={styles.ingredientOptionsContainer}>
                  {items.map((item, index) => {
                    const isSelected = selectedSideIngredients.includes(item);
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[styles.ingredientOption, isSelected && styles.ingredientOptionSelected]}
                        onPress={() => toggleSelection(item, selectedSideIngredients, setSelectedSideIngredients)}
                      >
                        <Text style={[styles.ingredientOptionText, isSelected && styles.ingredientOptionTextSelected]}>
                          {item}
                        </Text>
                        {isSelected && <Ionicons name="checkmark" size={16} color="#FF9800" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 血糖値入力カード */}
        <View style={styles.glucoseInputCard}>
          <View style={styles.valueContainer}>
            <Text style={styles.valueText}>{glucose}</Text>
            <Text style={styles.unitText}>mg/dL</Text>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => setGlucose(p => Math.max(50, p - 1))}
            >
              <Text style={styles.buttonText}>-</Text>
            </TouchableOpacity>

            <View style={styles.flickArea} {...panResponder.panHandlers}>
              <View style={styles.flickTrack}>
                <Text style={styles.hintText}>◀ スライドで調整 ▶</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.button} 
              onPress={() => setGlucose(p => Math.min(400, p + 1))}
            >
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.metaInfo}>
            <TouchableOpacity 
              style={styles.metaButton}
              onPress={() => setShowMealModal(true)}
            >
              <Text style={styles.metaText}>{selectedMealType}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 変動数値入力セクション */}
        <View style={styles.variableDataSection}>
          <Text style={styles.variableSectionTitle}>📊 その他の数値</Text>
          
          {/* HbA1c入力 */}
          <View style={styles.variableHorizontalRow}>
            <Text style={styles.variableHorizontalLabel}>HbA1c (%)</Text>
            <TextInput
              style={styles.variableHorizontalInput}
              value={currentHba1c}
              onChangeText={setCurrentHba1c}
              placeholder="6.5"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          {/* 体調選択 */}
          <View style={styles.variableHorizontalRow}>
            <Text style={styles.variableHorizontalLabel}>今日の体調</Text>
            <View style={styles.conditionHorizontalContainer}>
              {[
                { key: 'good', label: '良好', color: '#28a745' },
                { key: 'normal', label: '普通', color: '#6c757d' },
                { key: 'poor', label: '不調', color: '#dc3545' }
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.conditionHorizontalButton,
                    currentCondition === item.key && { ...styles.conditionButtonActive, backgroundColor: item.color }
                  ]}
                  onPress={() => setCurrentCondition(item.key as any)}
                >
                  <Text style={[
                    styles.conditionHorizontalText,
                    currentCondition === item.key && styles.conditionTextActive
                  ]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 食事制限レベル */}
          <View style={styles.variableHorizontalRow}>
            <Text style={styles.variableHorizontalLabel}>食事制限レベル</Text>
            <View style={styles.restrictionHorizontalContainer}>
              {[
                { key: 'strict', label: '厳格' },
                { key: 'normal', label: '普通' },
                { key: 'relaxed', label: '緩やか' }
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.restrictionHorizontalButton,
                    dietRestriction === item.key && styles.restrictionButtonActive
                  ]}
                  onPress={() => setDietRestriction(item.key as any)}
                >
                  <Text style={[
                    styles.restrictionHorizontalText,
                    dietRestriction === item.key && styles.restrictionTextActive
                  ]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>


        <View style={{ paddingTop: 20, paddingBottom: 50, zIndex: 100 }}>
          {/* 記録ボタン */}
          <TouchableOpacity 
            style={[styles.recordButton, { zIndex: 101 }]} 
            onPress={() => setCurrentStep(2)}
          >
            <Text style={styles.recordButtonText}>献立を生成</Text>
          </TouchableOpacity>

          {/* 保存済み献立を全削除（デバッグ用） */}
          {savedMealPlans.length > 0 && (
            <TouchableOpacity
              style={{ backgroundColor: '#FF3B30', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 10 }}
              onPress={() => {
                Alert.alert(
                  '全削除',
                  `保存済み献立${savedMealPlans.length}件を全て削除しますか？`,
                  [
                    { text: 'キャンセル', style: 'cancel' },
                    { text: '全削除', style: 'destructive', onPress: async () => {
                      await mealStorageService.clearAllMealPlans();
                      setSavedMealPlans([]);
                      setGeneratedMeals({});
                      Alert.alert('完了', '全ての献立プランを削除しました');
                    }},
                  ]
                );
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>保存済み献立を全削除（{savedMealPlans.length}件）</Text>
            </TouchableOpacity>
          )}

          {/* 保存済み献立プランボタン */}
          {(() => {
            const hasData = savedMealPlans && savedMealPlans.length > 0;
            
            if (hasData) {
              return (
                <TouchableOpacity 
                  style={[
                    styles.recordButton,
                    styles.savedPlansButton,
                    {
                      zIndex: 102,
                      elevation: 5,
                    }
                  ]} 
                  activeOpacity={0.8}
                  onPress={() => {
                    console.log('📚 過去の献立を見るボタンが押されました');
                    setShowSavedPlansModal(true);
                  }}
                >
                  <Text style={[styles.recordButtonText, styles.savedPlansButtonText]}>
                    📚 過去の献立を見る ({savedMealPlans.length}件)
                  </Text>
                </TouchableOpacity>
              );
            }
            return null; // データがない場合はボタンを表示しない
          })()}
          

        </View>
      </ScrollView>
    </View>
  );

  // ユーザープロフィール作成
  const createUserProfile = async (): Promise<UserHealthProfile> => {
    try {
      const storedUsers = await AsyncStorage.getItem('users');
      let currentUser = null;
      
      if (storedUsers) {
        const users = JSON.parse(storedUsers);
        currentUser = users[0];
      }
      
      const profile: UserHealthProfile = {
        height: currentUser?.healthData?.height,
        weight: currentUser?.healthData?.weight,
        gender: currentUser?.healthData?.gender,
        activityLevel: currentUser?.healthData?.activityLevel,
        age: currentUser?.age,
        currentHba1c: currentHba1c,
        currentCondition: currentCondition,
        dietRestriction: dietRestriction,
        currentGlucose: glucose,
        mealType: selectedMealType,
        preferredMainCourses: selectedMainCourses,
        preferredMainIngredients: selectedMainIngredients,
        preferredSideIngredients: selectedSideIngredients
      };
      
      return profile;
    } catch (error) {
      console.error('ユーザープロフィール作成エラー:', error);
      throw error;
    }
  };

  // AI献立生成
  const generatePeriodMeals = async () => {
    setIsGenerating(true);

    try {
      const userProfile = await createUserProfile();
      const periodDays = 1; // 1日分
      const servings = 1;

      let newMeals: {[key: string]: GeneratedMeal[]} = {};

      // まずChatGPT APIを試行
      if (secureAiService.isAvailable()) {
        try {
          console.log('🤖 ChatGPT APIで献立生成中...');
          newMeals = await secureAiService.generateMeals(
            userProfile,
            periodDays,
            servings,
            new Date()
          );
        } catch (apiError) {
          console.warn('ChatGPT API失敗、ローカルエンジンにフォールバック:', apiError);
          newMeals = await localMealEngine.generatePersonalizedMeals(
            userProfile,
            periodDays,
            servings,
            new Date()
          );
        }
      } else {
        // APIキーが設定されていない場合はローカルエンジンを使用
        console.log('🏠 ローカルエンジンで献立生成中...');
        newMeals = await localMealEngine.generatePersonalizedMeals(
          userProfile,
          periodDays,
          servings,
          new Date()
        );
      }

      setGeneratedMeals(newMeals);
      
      // 献立プランを自動保存
      try {
        if (selectedUserId && Object.keys(newMeals).length > 0) {
          await mealStorageService.saveMealPlan(
            selectedUserId,
            newMeals,
            userProfile,
            periodDays,
            new Date()
          );
          // 保存後、リストを更新
          await loadSavedMealPlans();
          console.log('✅ 献立プランが自動保存されました');
        }
      } catch (saveError) {
        console.warn('献立プラン自動保存エラー:', saveError);
        // 保存エラーでも献立表示は継続
      }
      
      setCurrentStep(3);
    } catch (error) {
      console.error('献立生成エラー:', error);
      Alert.alert('エラー', '献立の生成に失敗しました。しばらくしてから再試行してください。');
    } finally {
      setIsGenerating(false);
    }
  };

  // ステップ2: 献立生成中
  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>AI献立を生成中...</Text>
        <Text style={styles.loadingEmoji}>🤖</Text>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingSubText}>
          あなたの健康状態と食材の好みに合わせて{'\n'}
          今日の献立を作成しています
        </Text>
      </View>
    </View>
  );


  // ステップ3: 献立表示
  const renderStep3 = () => {
    // 詳細表示の場合
    if (selectedMealDetail) {
      return (
        <View style={styles.stepContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <TouchableOpacity
              onPress={() => setSelectedMealDetail(null)}
              style={{ padding: 8, marginRight: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={[styles.sectionTitle, { flex: 1 }]} numberOfLines={2}>{selectedMealDetail.name}</Text>
            <TouchableOpacity
              onPress={() => toggleFavorite(selectedMealDetail.id)}
              style={{ padding: 8 }}
            >
              <Ionicons
                name={favoriteMealIds.has(selectedMealDetail.id) ? 'heart' : 'heart-outline'}
                size={26}
                color={favoriteMealIds.has(selectedMealDetail.id) ? '#FF3B30' : '#ccc'}
              />
            </TouchableOpacity>
          </View>
          
          <View style={{ flex: 1 }}>
            <ScrollView 
              style={styles.stepScrollView} 
              showsVerticalScrollIndicator={false}
              scrollEnabled={true}
            >

            {/* 栄養情報 */}
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, elevation: 2 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' }}>📊 栄養情報</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <View style={{ width: '48%', backgroundColor: '#f8f9fa', borderRadius: 8, padding: 12, marginBottom: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>カロリー</Text>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#007AFF' }}>{selectedMealDetail.calories}</Text>
                  <Text style={{ fontSize: 12, color: '#666' }}>kcal</Text>
                </View>
                <View style={{ width: '48%', backgroundColor: '#f8f9fa', borderRadius: 8, padding: 12, marginBottom: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>糖質</Text>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FF6B35' }}>{selectedMealDetail.carbs}</Text>
                  <Text style={{ fontSize: 12, color: '#666' }}>g</Text>
                </View>
                <View style={{ width: '48%', backgroundColor: '#f8f9fa', borderRadius: 8, padding: 12, marginBottom: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>タンパク質</Text>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#4CAF50' }}>{selectedMealDetail.protein}</Text>
                  <Text style={{ fontSize: 12, color: '#666' }}>g</Text>
                </View>
                <View style={{ width: '48%', backgroundColor: '#f8f9fa', borderRadius: 8, padding: 12, marginBottom: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>脂質</Text>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FF9800' }}>{selectedMealDetail.fat}</Text>
                  <Text style={{ fontSize: 12, color: '#666' }}>g</Text>
                </View>
              </View>
              <Text style={{ textAlign: 'center', fontSize: 14, color: '#666', marginTop: 10, fontStyle: 'italic' }}>
                👥 {selectedMealDetail.servings}人分
              </Text>
            </View>

            {/* 材料 */}
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, elevation: 2 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' }}>🥕 材料</Text>
              {selectedMealDetail.ingredients.map((ingredient, index) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingVertical: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#007AFF', marginRight: 12 }} />
                  <Text style={{ fontSize: 16, color: '#333', flex: 1 }}>{ingredient}</Text>
                </View>
              ))}
            </View>

            {/* 作り方 */}
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, elevation: 2 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' }}>👩‍🍳 作り方</Text>
              {selectedMealDetail.recipe.map((step, index) => (
                <View key={index} style={{ flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' }}>
                  <View style={{ 
                    width: 28, height: 28, borderRadius: 14, backgroundColor: '#007AFF', 
                    justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2 
                  }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{index + 1}</Text>
                  </View>
                  <Text style={{ fontSize: 16, color: '#333', flex: 1, lineHeight: 24 }}>{step}</Text>
                </View>
              ))}
            </View>

            {/* 特徴 */}
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, elevation: 2 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' }}>💡 特徴</Text>
              <Text style={{ fontSize: 16, color: '#666', lineHeight: 24 }}>{selectedMealDetail.description}</Text>
            </View>
            </ScrollView>
          </View>
        </View>
      );
    }

    // 献立一覧表示
    return (
      <View style={styles.stepContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => setCurrentStep(1)}
            style={{ padding: 8, marginRight: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>AI献立提案</Text>
        </View>
        
        <View style={{ flex: 1 }}>
          <ScrollView 
            style={styles.stepScrollView} 
            showsVerticalScrollIndicator={false}
            scrollEnabled={true}
          >
          {Object.entries(generatedMeals).map(([date, meals]) => (
            <View key={date} style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15, textAlign: 'center' }}>
                {new Date(date).toLocaleDateString('ja-JP', { 
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'short'
                })}
              </Text>
              {meals.map((meal) => (
                <TouchableOpacity 
                  key={meal.id} 
                  style={{ 
                    backgroundColor: '#fff', 
                    borderRadius: 12, 
                    padding: 16, 
                    marginBottom: 12, 
                    elevation: 2,
                    borderLeftWidth: 4,
                    borderLeftColor: '#007AFF'
                  }}
                  onPress={() => setSelectedMealDetail(meal)}
                  activeOpacity={0.7}
                >
                  <View style={{ marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333', flex: 1 }} numberOfLines={2}>{meal.name}</Text>
                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation(); toggleFavorite(meal.id); }}
                          style={{ padding: 4, marginLeft: 8 }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons
                            name={favoriteMealIds.has(meal.id) ? 'heart' : 'heart-outline'}
                            size={22}
                            color={favoriteMealIds.has(meal.id) ? '#FF3B30' : '#ccc'}
                          />
                        </TouchableOpacity>
                        <Ionicons name="chevron-forward" size={20} color="#007AFF" />
                      </View>
                      <Text style={{ fontSize: 14, color: '#666', marginBottom: 8, lineHeight: 20 }}>{meal.description}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                    <Text style={{ fontSize: 12, color: '#007AFF', backgroundColor: '#f0f8ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                      {meal.calories}kcal
                    </Text>
                    <Text style={{ fontSize: 12, color: '#FF6B35', backgroundColor: '#fff5f2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                      糖質{meal.carbs}g
                    </Text>
                    <Text style={{ fontSize: 12, color: '#4CAF50', backgroundColor: '#f8fff8', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                      タンパク質{meal.protein}g
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          </ScrollView>
        </View>
      </View>
    );
  };

  // ステップ2に入ったら古いデータをクリアして1回だけ献立生成を実行
  const hasTriggeredGeneration = useRef(false);
  useEffect(() => {
    if (currentStep === 2) {
      if (!hasTriggeredGeneration.current) {
        hasTriggeredGeneration.current = true;
        setGeneratedMeals({});
        setSelectedMealDetail(null);
        const timer = setTimeout(generatePeriodMeals, 1000);
        return () => clearTimeout(timer);
      }
    } else {
      hasTriggeredGeneration.current = false;
    }
  }, [currentStep]);

  // レンダリング部分
  let mainContent;
  if (currentStep === 1) {
    mainContent = renderStep1();
  } else if (currentStep === 2) {
    mainContent = renderStep2();
  } else if (currentStep === 3) {
    mainContent = renderStep3();
  } else {
    mainContent = (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>エラー</Text>
      </View>
    );
  }

  return (
    <>
      {mainContent}
      
      {/* 食事タイプ選択モーダル */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showMealModal}
        onRequestClose={() => setShowMealModal(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>測定タイミング</Text>
            {['食前', '食後'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.modalOption,
                  selectedMealType === type && styles.modalOptionSelected
                ]}
                onPress={() => {
                  setSelectedMealType(type);
                  setShowMealModal(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  selectedMealType === type && styles.modalOptionTextSelected
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowMealModal(false)}
            >
              <Text style={styles.modalCloseText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 保存済み献立プラン一覧モーダル */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showSavedPlansModal}
        onRequestClose={() => setShowSavedPlansModal(false)}
      >
        <View style={styles.modalBackground}>
          <View style={[styles.modalContainer, { maxHeight: '85%', width: '95%' }]}>
            <Text style={styles.modalTitle}>過去の献立プラン</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {savedMealPlans.map((plan, index) => (
                <TouchableOpacity
                  key={plan.id}
                  style={styles.savedPlanItem}
                  onPress={() => {
                    setSelectedSavedPlan(plan);
                    setGeneratedMeals(plan.meals);
                    setShowSavedPlansModal(false);
                    setCurrentStep(3);
                  }}
                >
                  <View style={styles.savedPlanHeader}>
                    <Text style={styles.savedPlanName}>{plan.name}</Text>
                    <Text style={styles.savedPlanDate}>
                      {new Date(plan.createdAt).toLocaleDateString('ja-JP')}
                    </Text>
                  </View>
                  <Text style={styles.savedPlanDetails}>
                    📅 {plan.period}日間 | 🍽️ {Object.values(plan.meals).flat().length}品目
                  </Text>
                  <Text style={styles.savedPlanDetails}>
                    開始日: {new Date(plan.startDate).toLocaleDateString('ja-JP')}
                  </Text>
                </TouchableOpacity>
              ))}
              
              {savedMealPlans.length === 0 && (
                <View style={styles.emptyPlansContainer}>
                  <Text style={styles.emptyPlansText}>保存された献立プランはありません</Text>
                  <Text style={styles.emptyPlansSubText}>献立を生成すると自動保存されます</Text>
                </View>
              )}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowSavedPlansModal(false)}
            >
              <Text style={styles.modalCloseText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#f5f5f5',
  },
  stepScrollView: {
    flex: 1,
  },
  stepScrollContent: {
    paddingBottom: 200,
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#333',
  },
  ingredientSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  variableSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  ingredientRow: {
    marginBottom: 20,
  },
  ingredientLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginVertical: 8,
    color: '#666',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 4,
  },
  ingredientOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ingredientOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  ingredientOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
  },
  ingredientOptionText: {
    fontSize: 14,
    color: '#333',
    marginRight: 4,
  },
  ingredientOptionTextSelected: {
    color: '#1976D2',
    fontWeight: '500',
  },
  glucoseInputCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  valueContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  valueText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  unitText: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  flickArea: {
    flex: 1,
    marginHorizontal: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    height: 50,
  },
  flickTrack: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  metaInfo: {
    alignItems: 'center',
  },
  metaButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  metaText: {
    fontSize: 16,
    color: '#495057',
  },
  recordButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // 変動データセクション
  variableDataSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  variableHorizontalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  variableHorizontalLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  variableHorizontalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    minWidth: 80,
    textAlign: 'center',
  },
  conditionHorizontalContainer: {
    flexDirection: 'row',
    flex: 2,
    justifyContent: 'flex-end',
  },
  conditionHorizontalButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#f8f9fa',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  conditionButtonActive: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  conditionHorizontalText: {
    fontSize: 14,
    color: '#495057',
  },
  conditionTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  restrictionHorizontalContainer: {
    flexDirection: 'row',
    flex: 2,
    justifyContent: 'flex-end',
  },
  restrictionHorizontalButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#f8f9fa',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  restrictionButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  restrictionHorizontalText: {
    fontSize: 14,
    color: '#495057',
  },
  restrictionTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  // ローディング画面
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  loadingEmoji: {
    fontSize: 48,
    marginVertical: 20,
  },
  loadingSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  // 献立表示
  suggestionsContainer: {
    paddingHorizontal: 20,
    flex: 1,
  },
  mealCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  mealCardDate: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#007AFF',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  mealItemTouchable: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  mealDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  nutritionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nutritionText: {
    fontSize: 12,
    color: '#888',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  // モーダルスタイル
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 9999,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  modalOption: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  modalOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  modalOptionText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#495057',
  },
  modalOptionTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  modalCloseButton: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#6c757d',
    borderRadius: 10,
  },
  modalCloseText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
  // 献立詳細モーダル用スタイル
  mealDetailModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    margin: 20,
    maxHeight: '85%',
    width: '90%',
    maxWidth: 400,
    zIndex: 10000,
    elevation: 100,
  },
  mealDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  mealDetailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  mealDetailScrollView: {
    flex: 1,
    padding: 20,
  },
  mealDetailSection: {
    marginBottom: 25,
  },
  mealDetailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  nutritionGridItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  nutritionGridLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  nutritionGridValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  servingInfo: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ingredientBullet: {
    fontSize: 16,
    color: '#007AFF',
    marginRight: 8,
    marginTop: 2,
  },
  ingredientText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  recipeStep: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-start',
  },
  recipeStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  recipeStepText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  recipeStepDescription: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  savedPlansButton: {
    backgroundColor: '#28a745',
    marginTop: 10,
  },
  savedPlansButtonText: {
    color: '#fff',
  },
  savedPlanItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  savedPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  savedPlanName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  savedPlanDate: {
    fontSize: 12,
    color: '#666',
  },
  savedPlanDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  emptyPlansContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyPlansText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyPlansSubText: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});