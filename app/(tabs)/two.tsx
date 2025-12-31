import { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, PanResponder, Alert, Platform, TextInput, Modal, Dimensions, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import localMealEngine, { UserHealthProfile } from '../../services/localMealEngine';
import secureAiService from '../../services/secureAiService';

type GlucoseRecord = {
  id: string;
  value: number;
  timestamp: number;
  date: string;
  mealType: string;
  mealNote: string;
};

type MealSuggestion = {
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
};


const { height } = Dimensions.get('window');

export default function MealScreen() {
  // 血糖値入力用のstate
  const [glucose, setGlucose] = useState(100);
  const [records, setRecords] = useState<GlucoseRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('空腹時');
  const [mealNote, setMealNote] = useState('');
  const [showMealModal, setShowMealModal] = useState(false);
  
  // 変動数値用のstate
  const [currentHba1c, setCurrentHba1c] = useState('');
  const [currentCondition, setCurrentCondition] = useState<'good' | 'normal' | 'poor'>('normal');
  const [dietRestriction, setDietRestriction] = useState<'strict' | 'normal' | 'relaxed'>('normal');

  // ステップコントロール用
  const [currentStep, setCurrentStep] = useState(1); // 1: 入力, 2: 生成中, 2.5: 週選択, 3: 結果
  const [mealSuggestions, setMealSuggestions] = useState<MealSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedWeekStart, setSelectedWeekStart] = useState(new Date());
  const [selectedWeekEnd, setSelectedWeekEnd] = useState(new Date());
  const [weeklyMeals, setWeeklyMeals] = useState<{[key: string]: MealSuggestion[]}>({});
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealSuggestion | null>(null);
  
  // ローカル献立エンジン管理用（APIキー不要）


  const mealTypes = ['空腹時', '朝食前', '朝食後', '昼食前', '昼食後', '夕食前', '夕食後', '就寝前'];
  
  // 血糖値スワイプ用
  const lastUpdateX = useRef(0);

  useEffect(() => {
    loadRecords();
    // 初期値として今日から7日後をセット
    const today = new Date();
    const weekLater = new Date(today);
    weekLater.setDate(today.getDate() + 6);
    setSelectedWeekStart(today);
    setSelectedWeekEnd(weekLater);
  }, []);

  // ユーザー数を取得
  const getUserCount = async () => {
    try {
      const storedUsers = await AsyncStorage.getItem('users');
      if (storedUsers) {
        const users = JSON.parse(storedUsers);
        return users.length;
      }
      return 1; // デフォルト1人
    } catch (error) {
      console.error('ユーザー数取得エラー:', error);
      return 1;
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

  // 血糖値記録保存
  const saveRecord = async () => {
    const newRecord: GlucoseRecord = {
      id: Date.now().toString(),
      value: glucose,
      timestamp: selectedDate.getTime(),
      date: selectedDate.toISOString().split('T')[0],
      mealType: selectedMealType,
      mealNote: mealNote
    };

    try {
      const newRecords = [...records, newRecord];
      await AsyncStorage.setItem('glucose_records', JSON.stringify(newRecords));
      setRecords(newRecords);
      
      Alert.alert(
        '記録完了',
        `血糖値 ${glucose} mg/dL を記録しました`,
        [{ text: 'OK' }]
      );
      
      setMealNote('');
    } catch (error) {
      console.error('データ保存エラー:', error);
      Alert.alert('エラー', 'データの保存に失敗しました');
    }
  };

  // 献立生成機能（記録後に週選択に進む）
  const proceedToWeekSelection = () => {
    setCurrentStep(2.5); // 週選択ステップに移行
  };

  // ユーザーデータを取得してAIプロフィールを作成
  const createUserProfile = async (): Promise<UserHealthProfile> => {
    try {
      const storedUsers = await AsyncStorage.getItem('users');
      let currentUser = null;
      
      if (storedUsers) {
        const users = JSON.parse(storedUsers);
        // 現在選択されているユーザーまたは最初のユーザーを使用
        currentUser = users[0]; // 簡略化のため最初のユーザーを使用
      }
      
      const profile: UserHealthProfile = {
        // 基本健康データ（ユーザータブから）
        height: currentUser?.healthData?.height,
        weight: currentUser?.healthData?.weight,
        gender: currentUser?.healthData?.gender,
        activityLevel: currentUser?.healthData?.activityLevel,
        age: currentUser?.age,
        
        // 変動データ（献立タブから）
        currentHba1c: currentHba1c,
        currentCondition: currentCondition,
        dietRestriction: dietRestriction,
        currentGlucose: glucose,
        mealType: selectedMealType
      };
      
      return profile;
    } catch (error) {
      console.error('ユーザープロフィール作成エラー:', error);
      throw error;
    }
  };

  // AI献立生成（実際のAI機能付き）
  const generatePeriodMeals = async (glucoseValue: number, mealType: string, startDate: Date, endDate: Date) => {
    setCurrentStep(2); // 生成中ステップに移行
    setIsGenerating(true);
    
    try {
      // 日数を計算
      const timeDiff = endDate.getTime() - startDate.getTime();
      const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
      
      console.log('📅 献立生成期間:', {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        dayDiff: dayDiff
      });
      
      // ユーザー数を取得
      const userCount = await getUserCount();
      
      // ユーザープロフィールを作成
      const userProfile = await createUserProfile();
      
      let weeklyData: {[key: string]: MealSuggestion[]} = {};
      
      let aiGenerationSuccess = false;
      
      // まずローカルエンジンを試行（安定性優先）
      try {
        console.log('🏠 ローカルAI献立生成エンジンを使用中...');
        const localMeals = await localMealEngine.generatePersonalizedMeals(
          userProfile,
          dayDiff,
          userCount,
          startDate
        );
        
        weeklyData = convertLocalToAppFormat(localMeals);
        console.log('✅ ローカルエンジンによる献立生成成功');
        
      } catch (localError) {
        console.warn('ローカルエンジン失敗、ChatGPT APIを試行:', localError);
        
        // ローカル失敗時にChatGPT APIを試行
        if (secureAiService.isAvailable()) {
          try {
            console.log('🧠 ChatGPT APIを使用した高品質献立生成中...');
            const chatGptMeals = await secureAiService.generateMeals(
              userProfile,
              dayDiff,
              userCount,
              startDate
            );
            
            weeklyData = convertLocalToAppFormat(chatGptMeals);
            aiGenerationSuccess = true;
            console.log('✅ ChatGPT APIによる献立生成成功');
            
          } catch (chatGptError) {
            console.warn('ChatGPT API利用失敗、最終フォールバック使用:', chatGptError);
            
            // 最終フォールバック
            const fallbackMeals = await localMealEngine.generateSampleMeals(dayDiff, userCount, startDate);
            weeklyData = convertLocalToAppFormat(fallbackMeals);
            
            Alert.alert(
              '献立生成完了',
              'AI機能で問題が発生しましたが、基本的な献立を生成しました。',
              [{ text: 'OK' }]
            );
          }
        } else {
          // API未設定の場合は最終フォールバック
          const fallbackMeals = await localMealEngine.generateSampleMeals(dayDiff, userCount, startDate);
          weeklyData = convertLocalToAppFormat(fallbackMeals);
        }
      }
      
      // 結果検証
      const generatedDays = Object.keys(weeklyData).length;
      console.log(`🎯 最終結果: ${generatedDays}日分の献立を生成 (要求: ${dayDiff}日分)`);
      
      // 使用したエンジンをユーザーに通知
      if (aiGenerationSuccess && secureAiService.isAvailable()) {
        console.log('ChatGPT APIによる高品質献立生成完了');
      } else {
        console.log('ローカルエンジンによる献立生成完了');
      }
      
      if (generatedDays < dayDiff) {
        console.warn(`⚠️ 要求より少ない献立: ${generatedDays}/${dayDiff}日分`);
      }
      
      setWeeklyMeals(weeklyData);
      setCurrentStep(3); // 結果ステップに移行
    } catch (error) {
      console.error('献立生成エラー:', error);
      Alert.alert('エラー', '献立生成に失敗しました');
      setCurrentStep(2.5); // エラー時は週選択に戻る
    } finally {
      setIsGenerating(false);
    }
  };

  // ローカルエンジン形式からアプリ形式に変換
  const convertLocalToAppFormat = (localMeals: {[key: string]: any[]}): {[key: string]: MealSuggestion[]} => {
    const converted: {[key: string]: MealSuggestion[]} = {};
    
    Object.entries(localMeals).forEach(([dateKey, meals]) => {
      converted[dateKey] = meals.map(meal => ({
        id: meal.id,
        name: meal.name,
        calories: meal.calories,
        carbs: meal.carbs,
        protein: meal.protein,
        fat: meal.fat,
        description: meal.description,
        ingredients: meal.ingredients,
        recipe: meal.recipe,
        servings: meal.servings
      }));
    });
    
    return converted;
  };

  // 記録して週選択に進む
  const saveRecordAndProceed = async () => {
    try {
      // まず血糖値を記録
      const newRecord: GlucoseRecord = {
        id: Date.now().toString(),
        value: glucose,
        timestamp: selectedDate.getTime(),
        date: selectedDate.toISOString().split('T')[0],
        mealType: selectedMealType,
        mealNote: mealNote
      };

      const newRecords = [...records, newRecord];
      await AsyncStorage.setItem('glucose_records', JSON.stringify(newRecords));
      setRecords(newRecords);
      
      // 週選択に進む
      proceedToWeekSelection();
      
      setMealNote('');
    } catch (error) {
      console.error('データ保存エラー:', error);
      Alert.alert('エラー', 'データの保存に失敗しました');
    }
  };

  // 最初に戻る
  const resetToStart = () => {
    setCurrentStep(1);
    setMealSuggestions([]);
    setWeeklyMeals({});
  };

  // 週の開始日（月曜日）を取得
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 月曜日を開始日とする
    return new Date(d.setDate(diff));
  };

  // 日付をフォーマット
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ja-JP', { 
      month: 'short', 
      day: 'numeric',
      weekday: 'short'
    });
  };

  // 血糖値スワイプジェスチャー
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        lastUpdateX.current = 0;
      },
      onPanResponderMove: (evt, gestureState) => {
        const threshold = 1;
        const distance = gestureState.dx - lastUpdateX.current;

        if (Math.abs(distance) >= threshold) {
          const direction = distance > 0 ? 1 : -1;
          
          setGlucose(prev => {
            const next = prev + direction;
            return Math.max(50, Math.min(400, next));
          });

          lastUpdateX.current = gestureState.dx;
        }
      },
      onPanResponderRelease: () => {
        lastUpdateX.current = 0;
      },
    })
  ).current;

  // 日時選択
  const onDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      const newDate = new Date(selectedDate);
      newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setSelectedDate(newDate);
    }
  };

  const onTimeChange = (event: any, time?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (time) {
      const newDate = new Date(selectedDate);
      newDate.setHours(time.getHours(), time.getMinutes());
      setSelectedDate(newDate);
    }
  };

  // 開始日選択
  const onStartDateChange = (event: any, date?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedWeekStart(date);
      // 開始日が終了日より後になった場合、終了日を調整
      if (date > selectedWeekEnd) {
        const newEndDate = new Date(date);
        newEndDate.setDate(date.getDate() + 6);
        setSelectedWeekEnd(newEndDate);
      }
    }
  };

  // 終了日選択
  const onEndDateChange = (event: any, date?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (date) {
      // 終了日が開始日より前にならないようにチェック
      if (date >= selectedWeekStart) {
        setSelectedWeekEnd(date);
      } else {
        Alert.alert('エラー', '終了日は開始日以降を選択してください');
      }
    }
  };

  // プログレスインジケーター
  const renderProgressIndicator = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressSteps}>
        <View style={[styles.progressStep, currentStep >= 1 && styles.progressStepActive]}>
          <Text style={[styles.progressStepText, currentStep >= 1 && styles.progressStepTextActive]}>1</Text>
        </View>
        <View style={[styles.progressLine, currentStep >= 2 && styles.progressLineActive]} />
        <View style={[styles.progressStep, currentStep >= 2 && styles.progressStepActive]}>
          <Text style={[styles.progressStepText, currentStep >= 2 && styles.progressStepTextActive]}>2</Text>
        </View>
        <View style={[styles.progressLine, currentStep >= 3 && styles.progressLineActive]} />
        <View style={[styles.progressStep, currentStep >= 3 && styles.progressStepActive]}>
          <Text style={[styles.progressStepText, currentStep >= 3 && styles.progressStepTextActive]}>3</Text>
        </View>
      </View>
      <View style={styles.progressLabels}>
        <Text style={styles.progressLabel}>入力</Text>
        <Text style={styles.progressLabel}>生成</Text>
        <Text style={styles.progressLabel}>結果</Text>
      </View>
    </View>
  );

  // ステップ1: 血糖値入力
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionTitle}>血糖値を記録</Text>
      
      <ScrollView 
        style={styles.stepScrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.stepScrollContent}
      >
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

        {/* 変動数値入力セクション */}
        <View style={styles.variableDataSection}>
          <Text style={styles.variableSectionTitle}>📊 その他の数値</Text>
          
          <View style={styles.variableRowsContainer}>
            {/* HbA1c入力 */}
            <View style={styles.variableColumn}>
              <Text style={styles.variableLabel}>HbA1c (%)</Text>
              <TextInput
                style={styles.variableInput}
                value={currentHba1c}
                onChangeText={setCurrentHba1c}
                placeholder="6.5"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>

            {/* 体調選択 */}
            <View style={styles.variableColumn}>
              <Text style={styles.variableLabel}>今日の体調</Text>
              <View style={styles.conditionContainer}>
                {[
                  { key: 'good', label: '良好', color: '#28a745' },
                  { key: 'normal', label: '普通', color: '#6c757d' },
                  { key: 'poor', label: '不調', color: '#dc3545' }
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.conditionButton,
                      currentCondition === item.key && { backgroundColor: item.color }
                    ]}
                    onPress={() => setCurrentCondition(item.key as any)}
                  >
                    <Text style={[
                      styles.conditionText,
                      currentCondition === item.key && styles.conditionTextActive
                    ]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* 食事制限レベル */}
          <View style={styles.variableRow}>
            <Text style={styles.variableLabel}>食事制限レベル</Text>
            <View style={styles.restrictionContainer}>
              {[
                { key: 'strict', label: '厳格' },
                { key: 'normal', label: '普通' },
                { key: 'relaxed', label: '緩やか' }
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.restrictionButton,
                    dietRestriction === item.key && styles.restrictionButtonActive
                  ]}
                  onPress={() => setDietRestriction(item.key as any)}
                >
                  <Text style={[
                    styles.restrictionText,
                    dietRestriction === item.key && styles.restrictionTextActive
                  ]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.recordButton} onPress={saveRecordAndProceed}>
          <Text style={styles.recordButtonText}>記録してAI献立を生成</Text>
        </TouchableOpacity>
        
        <View style={styles.aiInfoCard}>
          <Text style={styles.aiInfoTitle}>
            {secureAiService.isAvailable() ? '🧠 ChatGPT + ローカルAI' : '🤖 ローカルAI献立生成'}
          </Text>
          <Text style={styles.aiInfoText}>
            {secureAiService.isAvailable() 
              ? 'ChatGPT APIが設定済み。高品質な個別最適化献立を生成します'
              : 'あなたの健康データを分析して最適な献立を自動生成します'
            }
          </Text>
          <Text style={styles.aiInfoSubtext}>
            {secureAiService.isAvailable()
              ? '• ChatGPT高品質生成 • ローカルフォールバック • セキュア設定'
              : '• 血糖値管理に特化 • 栄養バランス最適化 • API不要'
            }
          </Text>
        </View>
        </View>
      </ScrollView>
    </View>
  );

  // ステップ2: AI献立生成中
  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionTitle}>AI献立を生成中...</Text>
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>あなたの健康データを分析し</Text>
        <Text style={styles.loadingText}>最適な献立をAIが生成しています</Text>
        <Text style={styles.loadingSubText}>血糖値管理・栄養バランス・個人最適化</Text>
        <Text style={styles.loadingEmoji}>🤖🍽️</Text>
      </View>
    </View>
  );

  // ステップ2.5: 期間選択（カレンダー）
  const renderPeriodSelection = () => {
    const dayDiff = Math.ceil((selectedWeekEnd.getTime() - selectedWeekStart.getTime()) / (1000 * 3600 * 24)) + 1;

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.sectionTitle}>献立を生成する期間を選択</Text>
        
        <View style={styles.dateSelectionContainer}>
          {/* 開始日選択 */}
          <View style={styles.dateInputSection}>
            <Text style={styles.dateLabel}>開始日</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {selectedWeekStart.toLocaleDateString('ja-JP')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 終了日選択 */}
          <View style={styles.dateInputSection}>
            <Text style={styles.dateLabel}>終了日</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {selectedWeekEnd.toLocaleDateString('ja-JP')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 期間情報 */}
        <View style={styles.periodInfo}>
          <Text style={styles.periodInfoText}>期間: {dayDiff}日間</Text>
          <Text style={styles.periodInfoText}>総献立数: {dayDiff * 3}食分</Text>
        </View>

        {/* 生成ボタン */}
        <TouchableOpacity
          style={styles.generateButton}
          onPress={() => generatePeriodMeals(glucose, selectedMealType, selectedWeekStart, selectedWeekEnd)}
        >
          <Text style={styles.generateButtonText}>🤖 AI献立を生成する</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ステップ3: 期間献立結果  
  const renderStep3 = () => {
    const weekStart = selectedWeekStart;
    const weekEnd = selectedWeekEnd;

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.sectionTitle}>期間別献立</Text>
        <Text style={styles.weekTitle}>
          {formatDate(weekStart)} 〜 {formatDate(weekEnd)}
        </Text>
        
        <ScrollView style={styles.weeklyScrollContainer} showsVerticalScrollIndicator={false}>
          {Object.entries(weeklyMeals).map(([dateKey, meals]) => {
            const date = new Date(dateKey);
            return (
              <View key={dateKey} style={styles.dayContainer}>
                <Text style={styles.dayTitle}>{formatDate(date)}</Text>
                {meals.map((meal) => (
                  <TouchableOpacity 
                    key={meal.id} 
                    style={styles.weeklyMealCard}
                    onPress={() => {
                      setSelectedMeal(meal);
                      setShowRecipeModal(true);
                    }}
                  >
                    <Text style={styles.weeklyMealName}>{meal.name}</Text>
                    <Text style={styles.weeklyMealDescription}>{meal.description}</Text>
                    <View style={styles.weeklyNutritionInfo}>
                      <Text style={styles.weeklyNutritionText}>{meal.calories}kcal</Text>
                      <Text style={styles.weeklyNutritionText}>炭水化物{meal.carbs}g</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            );
          })}
          <View style={styles.bottomSpacer} />
        </ScrollView>
        
        <TouchableOpacity style={styles.resetButton} onPress={resetToStart}>
          <Text style={styles.resetButtonText}>新しく記録する</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderProgressIndicator()}
      
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 2.5 && renderPeriodSelection()}
      {currentStep === 3 && renderStep3()}

      {/* モーダル */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}
      
      {showTimePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="time"
          display="default"
          onChange={onTimeChange}
        />
      )}

      {showStartDatePicker && (
        <DateTimePicker
          value={selectedWeekStart}
          mode="date"
          display="default"
          onChange={onStartDateChange}
          minimumDate={new Date()}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={selectedWeekEnd}
          mode="date"
          display="default"
          onChange={onEndDateChange}
          minimumDate={selectedWeekStart}
        />
      )}

      <Modal
        visible={showMealModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMealModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>食事タイミング</Text>
            
            {mealTypes.map((type, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.mealOption,
                  selectedMealType === type && styles.selectedMealOption
                ]}
                onPress={() => {
                  setSelectedMealType(type);
                  setShowMealModal(false);
                }}
              >
                <Text style={[
                  styles.mealOptionText,
                  selectedMealType === type && styles.selectedMealOptionText
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

      {/* レシピ詳細モーダル */}
      <Modal
        visible={showRecipeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRecipeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.recipeModalContent}>
            {selectedMeal && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.recipeTitle}>{selectedMeal.name}</Text>
                <Text style={styles.recipeServings}>{selectedMeal.servings}人分</Text>
                
                {/* 栄養情報 */}
                <View style={styles.recipeNutrition}>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>{selectedMeal.calories * selectedMeal.servings}</Text>
                    <Text style={styles.nutritionLabel}>kcal</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>{selectedMeal.carbs * selectedMeal.servings}</Text>
                    <Text style={styles.nutritionLabel}>炭水化物(g)</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>{selectedMeal.protein * selectedMeal.servings}</Text>
                    <Text style={styles.nutritionLabel}>タンパク質(g)</Text>
                  </View>
                </View>

                {/* 材料 */}
                <View style={styles.recipeSection}>
                  <Text style={styles.recipeSectionTitle}>材料（{selectedMeal.servings}人分）</Text>
                  {selectedMeal.ingredients.map((ingredient, index) => (
                    <Text key={index} style={styles.ingredientItem}>• {ingredient}</Text>
                  ))}
                </View>

                {/* 作り方 */}
                <View style={styles.recipeSection}>
                  <Text style={styles.recipeSectionTitle}>作り方</Text>
                  {selectedMeal.recipe.map((step, index) => (
                    <View key={index} style={styles.recipeStep}>
                      <Text style={styles.recipeStepNumber}>{index + 1}.</Text>
                      <Text style={styles.recipeStepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
            
            <TouchableOpacity
              style={styles.recipeCloseButton}
              onPress={() => setShowRecipeModal(false)}
            >
              <Text style={styles.recipeCloseText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  progressStep: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepActive: {
    backgroundColor: '#007AFF',
  },
  progressStepText: {
    fontSize: 14,
    color: '#999',
    fontWeight: 'bold',
  },
  progressStepTextActive: {
    color: '#fff',
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 10,
  },
  progressLineActive: {
    backgroundColor: '#007AFF',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 15,
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  stepContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  glucoseInputCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  valueText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  unitText: {
    fontSize: 18,
    marginLeft: 8,
    color: '#666',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  button: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  flickArea: {
    flex: 1,
    height: 45,
    marginHorizontal: 15,
    justifyContent: 'center',
  },
  flickTrack: {
    backgroundColor: '#f0f0f0',
    height: 35,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hintText: {
    color: '#999',
    fontSize: 11,
    fontWeight: 'bold',
  },
  metaInfo: {
    marginBottom: 20,
  },
  metaButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  metaText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  recordButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 30,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  mealOption: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginBottom: 8,
  },
  selectedMealOption: {
    backgroundColor: '#007AFF',
  },
  mealOptionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  selectedMealOptionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalCloseButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 20,
  },
  loadingSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  suggestionsContainer: {
    paddingHorizontal: 20,
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
  mealName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  mealDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  nutritionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nutritionText: {
    fontSize: 12,
    color: '#999',
  },
  resetButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginTop: 20,
    alignSelf: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  weekSelectionContainer: {
    paddingHorizontal: 20,
  },
  weekOption: {
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
  weekOptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  weekOptionDate: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  weekTitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  weeklyContainer: {
    paddingHorizontal: 10,
    maxHeight: '70%',
  },
  dayContainer: {
    marginBottom: 20,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 8,
  },
  weeklyMealCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  weeklyMealName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  weeklyNutritionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weeklyNutritionText: {
    fontSize: 11,
    color: '#999',
  },
  dateSelectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  dateInputSection: {
    marginBottom: 20,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  dateButton: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  dateButtonText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    fontWeight: '600',
  },
  periodInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 30,
  },
  periodInfoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  generateButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginHorizontal: 20,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  weeklyScrollContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  weeklyMealDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  bottomSpacer: {
    height: 20,
  },
  recipeModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
  },
  recipeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  recipeServings: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 8,
  },
  recipeNutrition: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  recipeSection: {
    marginBottom: 20,
  },
  recipeSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  ingredientItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
    paddingLeft: 10,
  },
  recipeStep: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingLeft: 10,
  },
  recipeStepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 10,
    minWidth: 20,
  },
  recipeStepText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  recipeCloseButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
  },
  recipeCloseText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  variableDataSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 20,
    marginVertical: 15,
  },
  variableSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  variableRow: {
    marginBottom: 15,
  },
  variableLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  variableInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  conditionContainer: {
    flexDirection: 'column',
  },
  conditionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#e9ecef',
    marginVertical: 2,
    alignItems: 'center',
  },
  conditionText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  conditionTextActive: {
    color: '#fff',
  },
  restrictionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  restrictionButton: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#e9ecef',
    marginHorizontal: 2,
    alignItems: 'center',
  },
  restrictionButtonActive: {
    backgroundColor: '#007AFF',
  },
  restrictionText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  restrictionTextActive: {
    color: '#fff',
  },
  stepScrollView: {
    flex: 1,
  },
  stepScrollContent: {
    paddingBottom: 20,
  },
  variableRowsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  variableColumn: {
    flex: 1,
    marginHorizontal: 5,
  },
  aiInfoCard: {
    backgroundColor: '#e3f2fd',
    borderRadius: 15,
    padding: 20,
    marginTop: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  aiInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
    textAlign: 'center',
  },
  aiInfoText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  aiInfoSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
