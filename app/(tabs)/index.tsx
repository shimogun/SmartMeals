import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, GlucoseRecord, GeneratedMeal, SavedMealPlan, MealTiming } from '../../types';
import DailyNutritionSummary from '../../components/DailyNutritionSummary';
import mealStorageService from '../../services/mealStorageService';
import localMealEngine from '../../services/localMealEngine';
import favoritesService from '../../services/favoritesService';

export default function DashboardScreen() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Blood glucose input
  const [glucoseValue, setGlucoseValue] = useState('');
  const [mealTiming, setMealTiming] = useState<MealTiming>('朝');
  const [latestGlucose, setLatestGlucose] = useState<GlucoseRecord | null>(null);

  // Weight/BP accordion
  const [showExtraInputs, setShowExtraInputs] = useState(false);
  const [weightValue, setWeightValue] = useState('');
  const [systolicValue, setSystolicValue] = useState('');
  const [diastolicValue, setDiastolicValue] = useState('');

  // Today's meals
  const [todayMeals, setTodayMeals] = useState<GeneratedMeal[]>([]);
  const [selectedMealDetail, setSelectedMealDetail] = useState<GeneratedMeal | null>(null);
  const [showMealModal, setShowMealModal] = useState(false);

  // Favorites
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Refresh
  const [refreshing, setRefreshing] = useState(false);

  // Meal update
  const [updateMessage, setUpdateMessage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'おはようございます';
    if (hour < 18) return 'こんにちは';
    return 'こんばんは';
  };

  const formatDate = (): string => {
    const now = new Date();
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${now.getMonth() + 1}/${now.getDate()}（${days[now.getDay()]}）`;
  };

  const loadData = useCallback(async () => {
    try {
      const usersData = await AsyncStorage.getItem('users');
      const indexData = await AsyncStorage.getItem('currentUserIndex');
      if (usersData) {
        const users: User[] = JSON.parse(usersData);
        const index = indexData ? parseInt(indexData) : 0;
        const user = users[index] || users[0];
        if (!user.foodPreferences) {
          user.foodPreferences = { liked: [], disliked: [] };
        }
        if (user.onboardingCompleted === undefined) {
          user.onboardingCompleted = true;
        }
        setCurrentUser(user);

        const favIds = await favoritesService.getFavoriteIds(user.id);
        setFavoriteIds(favIds);
      }

      const glucoseData = await AsyncStorage.getItem('glucose_records');
      if (glucoseData) {
        const records: GlucoseRecord[] = JSON.parse(glucoseData);
        if (records.length > 0) {
          const sorted = records.sort((a, b) => b.timestamp - a.timestamp);
          setLatestGlucose(sorted[0]);
        }
      }

      const plans = await mealStorageService.getSavedMealPlans();
      if (plans.length > 0) {
        for (const plan of plans) {
          if (plan.meals[today]) {
            setTodayMeals(plan.meals[today]);
            break;
          }
        }
      }

      generateUpdateMessage();
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    }
  }, [today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const generateUpdateMessage = async () => {
    const glucoseData = await AsyncStorage.getItem('glucose_records');
    if (!glucoseData) {
      setUpdateMessage('献立を生成して、毎日の食事管理を始めましょう');
      return;
    }
    const records: GlucoseRecord[] = JSON.parse(glucoseData);
    const recent = records.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

    if (recent.length === 0) {
      setUpdateMessage('献立を生成して、毎日の食事管理を始めましょう');
      return;
    }

    const avgGlucose = recent.reduce((sum, r) => sum + r.value, 0) / recent.length;
    if (avgGlucose > 180) {
      setUpdateMessage('血糖値が高めの傾向です。糖質控えめの献立を提案します');
    } else if (avgGlucose > 140) {
      setUpdateMessage('血糖値がやや高めです。バランスの良い献立を提案します');
    } else {
      setUpdateMessage('血糖値は安定しています。現在の食事を継続しましょう');
    }
  };

  const saveGlucose = async () => {
    if (!currentUser) return;
    const value = parseFloat(glucoseValue);
    if (isNaN(value) || value < 20 || value > 600) {
      Alert.alert('入力エラー', '血糖値は20〜600の範囲で入力してください');
      return;
    }

    const record: GlucoseRecord = {
      id: Date.now().toString(),
      value,
      timestamp: Date.now(),
      date: today,
      mealType: mealTiming,
      userId: currentUser.id,
    };

    try {
      const existing = await AsyncStorage.getItem('glucose_records');
      const records: GlucoseRecord[] = existing ? JSON.parse(existing) : [];
      records.push(record);
      await AsyncStorage.setItem('glucose_records', JSON.stringify(records));
      setLatestGlucose(record);
      setGlucoseValue('');
      Alert.alert('保存完了', `血糖値 ${value} mg/dL を記録しました`);
      generateUpdateMessage();
    } catch {
      Alert.alert('エラー', '保存に失敗しました');
    }
  };

  const saveWeightAndBP = async () => {
    if (!currentUser) return;
    const hasWeight = weightValue.trim() !== '';
    const hasBP = systolicValue.trim() !== '' && diastolicValue.trim() !== '';

    if (!hasWeight && !hasBP) {
      Alert.alert('入力エラー', '体重または血圧を入力してください');
      return;
    }

    try {
      const existing = await AsyncStorage.getItem('weekly_records');
      const records = existing ? JSON.parse(existing) : [];

      const record: any = {
        id: Date.now().toString(),
        weekStart: today,
        timestamp: Date.now(),
        userId: currentUser.id,
      };

      if (hasWeight) {
        const w = parseFloat(weightValue);
        if (isNaN(w) || w < 20 || w > 300) {
          Alert.alert('入力エラー', '体重は20〜300kgの範囲で入力してください');
          return;
        }
        record.weight = w;
      }

      if (hasBP) {
        const sys = parseInt(systolicValue);
        const dia = parseInt(diastolicValue);
        if (isNaN(sys) || isNaN(dia) || sys < 60 || sys > 260 || dia < 30 || dia > 160) {
          Alert.alert('入力エラー', '正しい血圧値を入力してください');
          return;
        }
        record.bloodPressure = { systolic: sys, diastolic: dia };
      }

      records.push(record);
      await AsyncStorage.setItem('weekly_records', JSON.stringify(records));
      setWeightValue('');
      setSystolicValue('');
      setDiastolicValue('');
      setShowExtraInputs(false);
      Alert.alert('保存完了', '記録しました');
    } catch {
      Alert.alert('エラー', '保存に失敗しました');
    }
  };

  const toggleFavorite = async (meal: GeneratedMeal) => {
    if (!currentUser) return;
    await favoritesService.toggleFavorite(currentUser.id, {
      id: meal.id,
      name: meal.name,
      calories: meal.calories,
      carbs: meal.carbs,
      protein: meal.protein,
      fat: meal.fat,
      mealType: meal.mealType,
    });
    const newIds = await favoritesService.getFavoriteIds(currentUser.id);
    setFavoriteIds(newIds);
  };

  const handleUpdateMeals = async () => {
    if (!currentUser) return;
    setIsUpdating(true);
    try {
      const glucoseData = await AsyncStorage.getItem('glucose_records');
      const records: GlucoseRecord[] = glucoseData ? JSON.parse(glucoseData) : [];
      const recentGlucose = records.length > 0
        ? records.sort((a, b) => b.timestamp - a.timestamp)[0].value
        : 120;

      const weeklyData = await AsyncStorage.getItem('weekly_records');
      const weeklyRecords = weeklyData ? JSON.parse(weeklyData) : [];
      const latestHba1c = weeklyRecords.length > 0
        ? weeklyRecords.sort((a: any, b: any) => b.timestamp - a.timestamp)
            .find((r: any) => r.hba1c)?.hba1c || 6.0
        : 6.0;

      const favIds = await favoritesService.getFavoriteIds(currentUser.id);

      const profile = {
        age: currentUser.age,
        gender: currentUser.healthData.gender,
        currentGlucose: recentGlucose,
        hba1c: latestHba1c,
        bodyCondition: 'normal',
        activityLevel: currentUser.healthData.activityLevel,
        dietRestriction: 'normal',
        selectedMainCourses: [] as string[],
        selectedMainIngredients: [] as string[],
        selectedSideIngredients: [] as string[],
        height: currentUser.healthData.height,
        weight: currentUser.healthData.weight,
        likedFoods: currentUser.foodPreferences.liked,
        dislikedFoods: currentUser.foodPreferences.disliked,
      };

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startDate = tomorrow.toISOString().split('T')[0];

      const meals = await localMealEngine.generatePersonalizedMeals(
        profile, 3, 1, tomorrow, Array.from(favIds)
      );

      await mealStorageService.saveMealPlan(
        currentUser.id, meals, profile, 3, tomorrow, undefined, recentGlucose
      );

      Alert.alert('更新完了', '明日からの献立を更新しました');
      await loadData();
    } catch (error) {
      Alert.alert('エラー', '献立の更新に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Greeting */}
      <View style={styles.greetingSection}>
        <Text style={styles.greetingText}>{getGreeting()}</Text>
        <Text style={styles.dateText}>{formatDate()} {currentUser?.name}さん</Text>
      </View>

      {/* ===== Health Info Section ===== */}
      <View style={styles.sectionHeader}>
        <Ionicons name="heart" size={18} color="#E91E63" />
        <Text style={styles.sectionHeaderText}>健康情報</Text>
      </View>

      {/* Blood glucose input */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>血糖値</Text>
        <View style={styles.glucoseInputRow}>
          <TextInput
            style={styles.glucoseInput}
            value={glucoseValue}
            onChangeText={setGlucoseValue}
            placeholder="値を入力"
            placeholderTextColor="#999"
            keyboardType="number-pad"
          />
          <Text style={styles.unit}>mg/dL</Text>
          <View style={styles.mealTimingRow}>
            {(['朝', '昼', '夜'] as MealTiming[]).map(timing => (
              <TouchableOpacity
                key={timing}
                style={[styles.timingButton, mealTiming === timing && styles.timingButtonActive]}
                onPress={() => setMealTiming(timing)}
              >
                <Text style={[styles.timingText, mealTiming === timing && styles.timingTextActive]}>
                  {timing}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.saveButton} onPress={saveGlucose}>
            <Text style={styles.saveButtonText}>保存</Text>
          </TouchableOpacity>
        </View>
        {latestGlucose && (
          <Text style={styles.latestValue}>
            直近: {latestGlucose.value} mg/dL（{latestGlucose.mealType}）
          </Text>
        )}
      </View>

      {/* Weight/BP accordion */}
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={() => setShowExtraInputs(!showExtraInputs)}
      >
        <Ionicons
          name={showExtraInputs ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#666"
        />
        <Text style={styles.accordionHeaderText}>体重・血圧も記録する</Text>
      </TouchableOpacity>

      {showExtraInputs && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>体重</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.smallInput}
              value={weightValue}
              onChangeText={setWeightValue}
              placeholder="体重"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
            />
            <Text style={styles.unit}>kg</Text>
          </View>

          <Text style={[styles.cardTitle, { marginTop: 12 }]}>血圧</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.smallInput}
              value={systolicValue}
              onChangeText={setSystolicValue}
              placeholder="上"
              placeholderTextColor="#999"
              keyboardType="number-pad"
            />
            <Text style={styles.unit}>/</Text>
            <TextInput
              style={styles.smallInput}
              value={diastolicValue}
              onChangeText={setDiastolicValue}
              placeholder="下"
              placeholderTextColor="#999"
              keyboardType="number-pad"
            />
            <Text style={styles.unit}>mmHg</Text>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={saveWeightAndBP}>
            <Text style={styles.saveButtonText}>保存</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ===== Meal Section ===== */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Ionicons name="restaurant" size={18} color="#FF9800" />
        <Text style={styles.sectionHeaderText}>献立</Text>
      </View>

      {/* Today's meals */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>今日の献立</Text>
        {todayMeals.length > 0 ? (
          <View style={styles.mealCardsRow}>
            {todayMeals.map((meal, index) => {
              const timings = ['朝', '昼', '夜'];
              return (
                <TouchableOpacity
                  key={meal.id}
                  style={styles.mealCard}
                  onPress={() => { setSelectedMealDetail(meal); setShowMealModal(true); }}
                >
                  <Text style={styles.mealCardTiming}>{timings[index] || ''}</Text>
                  <Text style={styles.mealCardName} numberOfLines={2}>{meal.name}</Text>
                  <Text style={styles.mealCardCalories}>{meal.calories}kcal</Text>
                  <TouchableOpacity
                    style={styles.favoriteButton}
                    onPress={() => toggleFavorite(meal)}
                  >
                    <Ionicons
                      name={favoriteIds.has(meal.id) ? 'star' : 'star-outline'}
                      size={20}
                      color={favoriteIds.has(meal.id) ? '#FFD700' : '#ccc'}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyText}>献立タブから献立を生成してください</Text>
        )}
      </View>

      {/* Nutrition summary */}
      <View style={styles.card}>
        <DailyNutritionSummary date={today} />
      </View>

      {/* Update tomorrow's meals */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>明日の献立を更新</Text>
        <Text style={styles.updateMessage}>{updateMessage}</Text>
        <TouchableOpacity
          style={[styles.updateButton, isUpdating && styles.updateButtonDisabled]}
          onPress={handleUpdateMeals}
          disabled={isUpdating}
        >
          <Ionicons name="refresh" size={20} color="#fff" />
          <Text style={styles.updateButtonText}>
            {isUpdating ? '更新中...' : '更新する'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Recipe detail modal */}
      <Modal visible={showMealModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowMealModal(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            {selectedMealDetail && (
              <ScrollView>
                <Text style={styles.modalTitle}>{selectedMealDetail.name}</Text>
                <Text style={styles.modalDescription}>{selectedMealDetail.description}</Text>

                <View style={styles.nutritionRow}>
                  <Text style={styles.nutritionItem}>{selectedMealDetail.calories}kcal</Text>
                  <Text style={styles.nutritionItem}>糖質{selectedMealDetail.carbs}g</Text>
                  <Text style={styles.nutritionItem}>タンパク{selectedMealDetail.protein}g</Text>
                  <Text style={styles.nutritionItem}>脂質{selectedMealDetail.fat}g</Text>
                </View>

                <Text style={styles.modalSectionTitle}>材料</Text>
                {selectedMealDetail.ingredients.map((ing, i) => (
                  <Text key={i} style={styles.ingredientText}>・{ing}</Text>
                ))}

                <Text style={styles.modalSectionTitle}>作り方</Text>
                {selectedMealDetail.recipe.map((step, i) => (
                  <Text key={i} style={styles.recipeStep}>{i + 1}. {step}</Text>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  greetingSection: {
    padding: 20,
    paddingBottom: 8,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  dateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 6,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  glucoseInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  glucoseInput: {
    flex: 1,
    minWidth: 80,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
    fontSize: 18,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  unit: {
    fontSize: 14,
    color: '#666',
  },
  mealTimingRow: {
    flexDirection: 'row',
    gap: 4,
  },
  timingButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  timingButtonActive: {
    backgroundColor: '#007AFF',
  },
  timingText: {
    fontSize: 14,
    color: '#666',
  },
  timingTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  latestValue: {
    fontSize: 13,
    color: '#888',
    marginTop: 8,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 6,
  },
  accordionHeaderText: {
    fontSize: 14,
    color: '#666',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallInput: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  mealCardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mealCard: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    position: 'relative',
  },
  mealCardTiming: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  mealCardName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  mealCardCalories: {
    fontSize: 12,
    color: '#666',
  },
  favoriteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  updateMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  updateButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalClose: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  nutritionItem: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  ingredientText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 2,
  },
  recipeStep: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
    lineHeight: 20,
  },
});
