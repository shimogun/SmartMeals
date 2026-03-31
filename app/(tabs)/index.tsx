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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart } from 'react-native-chart-kit';
import { User, GlucoseRecord, GeneratedMeal, SavedMealPlan, MealTiming, WeeklyRecord } from '../../types';
import DailyNutritionSummary from '../../components/DailyNutritionSummary';
import mealStorageService from '../../services/mealStorageService';
import localMealEngine from '../../services/localMealEngine';
import favoritesService from '../../services/favoritesService';
import ingredientSubstitutionService, { SubstituteOption } from '../../services/ingredientSubstitutionService';

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

  // Trend modal
  const [showTrendModal, setShowTrendModal] = useState(false);
  const [trendRange, setTrendRange] = useState<'1week' | '1month' | '3months' | '6months'>('1month');
  const [trendFilters, setTrendFilters] = useState<Set<MealTiming>>(new Set(['朝', '昼', '夜']));
  const [allGlucoseRecords, setAllGlucoseRecords] = useState<GlucoseRecord[]>([]);
  const [weeklyRecords, setWeeklyRecords] = useState<WeeklyRecord[]>([]);

  // Substitution modal
  const [showSubstModal, setShowSubstModal] = useState(false);
  const [substIngredient, setSubstIngredient] = useState('');
  const [substOriginalName, setSubstOriginalName] = useState('');
  const [substOptions, setSubstOptions] = useState<SubstituteOption[]>([]);
  const [substOriginalNutrition, setSubstOriginalNutrition] = useState<any>(null);

  // Medical guidance
  const [medicalGuidance, setMedicalGuidance] = useState<User['medicalGuidance']>(undefined);

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
        setMedicalGuidance(user.medicalGuidance);

        const favIds = await favoritesService.getFavoriteIds(user.id);
        setFavoriteIds(favIds);
      }

      const glucoseData = await AsyncStorage.getItem('glucose_records');
      if (glucoseData) {
        const records: GlucoseRecord[] = JSON.parse(glucoseData);
        setAllGlucoseRecords(records);
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

      const weeklyData = await AsyncStorage.getItem('weekly_records');
      if (weeklyData) {
        setWeeklyRecords(JSON.parse(weeklyData));
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
        dailyCarbLimit: currentUser.medicalGuidance?.dailyCarbLimit,
        dailyCalorieLimit: currentUser.medicalGuidance?.dailyCalorieLimit,
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

  const toggleTrendFilter = (timing: MealTiming) => {
    const newFilters = new Set(trendFilters);
    if (newFilters.has(timing)) {
      if (newFilters.size > 1) {
        newFilters.delete(timing);
      }
    } else {
      newFilters.add(timing);
    }
    setTrendFilters(newFilters);
  };

  const getFilteredTrendRecords = (): GlucoseRecord[] => {
    const now = new Date();
    let cutoff: Date;
    switch (trendRange) {
      case '1week':
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1month':
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3months':
        cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '6months':
        cutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
    }

    return allGlucoseRecords
      .filter(r => new Date(r.timestamp) >= cutoff)
      .filter(r => trendFilters.has(r.mealType as MealTiming))
      .sort((a, b) => a.timestamp - b.timestamp);
  };

  const getTrendChartData = () => {
    const records = getFilteredTrendRecords();
    if (records.length === 0) {
      return { labels: [''], datasets: [{ data: [0] }] };
    }

    const dateMap = new Map<string, number[]>();
    for (const r of records) {
      const date = r.date;
      if (!dateMap.has(date)) dateMap.set(date, []);
      dateMap.get(date)!.push(r.value);
    }

    const dates = Array.from(dateMap.keys()).sort();
    const step = Math.max(1, Math.floor(dates.length / 10));
    const labels = dates.map((d, i) => i % step === 0 ? d.slice(5) : '');
    const data = dates.map(d => {
      const values = dateMap.get(d)!;
      return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
    });

    return {
      labels,
      datasets: [{ data, strokeWidth: 2 }],
    };
  };

  const getTrendStats = () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeek = allGlucoseRecords.filter(
      r => new Date(r.timestamp) >= oneWeekAgo
    );
    const lastWeek = allGlucoseRecords.filter(
      r => new Date(r.timestamp) >= twoWeeksAgo && new Date(r.timestamp) < oneWeekAgo
    );

    const thisAvg = thisWeek.length > 0
      ? Math.round(thisWeek.reduce((s, r) => s + r.value, 0) / thisWeek.length)
      : null;
    const lastAvg = lastWeek.length > 0
      ? Math.round(lastWeek.reduce((s, r) => s + r.value, 0) / lastWeek.length)
      : null;

    return { thisAvg, lastAvg };
  };

  const getHba1cHistory = (): { date: string; value: number }[] => {
    return weeklyRecords
      .filter(r => r.hba1c != null)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(r => ({
        date: r.weekStart,
        value: r.hba1c!,
      }));
  };

  const openSubstitution = (ingredientText: string) => {
    const result = ingredientSubstitutionService.findSubstitutes(ingredientText);
    if (!result) {
      Alert.alert('情報', 'この食材の代替候補はまだ登録されていません');
      return;
    }
    setSubstIngredient(ingredientText);
    setSubstOriginalName(result.originalName);
    setSubstOptions(result.entry.substitutes);
    setSubstOriginalNutrition(result.entry.nutrition);
    setShowSubstModal(true);
  };

  const applySubstitution = (option: SubstituteOption) => {
    if (!selectedMealDetail) return;
    const amount = ingredientSubstitutionService.parseAmount(substIngredient);
    const diff = ingredientSubstitutionService.calculateNutritionDiff(
      substOriginalName, option.name, amount
    );
    if (!diff) return;

    const newIngredients = selectedMealDetail.ingredients.map(ing =>
      ing === substIngredient
        ? ingredientSubstitutionService.replaceIngredientText(ing, substOriginalName, option.name)
        : ing
    );

    setSelectedMealDetail({
      ...selectedMealDetail,
      ingredients: newIngredients,
      calories: Math.round(Math.max(0, selectedMealDetail.calories + diff.calories)),
      carbs: Math.round(Math.max(0, selectedMealDetail.carbs + diff.carbs) * 10) / 10,
      protein: Math.round(Math.max(0, selectedMealDetail.protein + diff.protein) * 10) / 10,
      fat: Math.round(Math.max(0, selectedMealDetail.fat + diff.fat) * 10) / 10,
    });
    setShowSubstModal(false);
  };

  const screenWidth = Dimensions.get('window').width;

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
        <TouchableOpacity
          style={styles.trendLink}
          onPress={() => setShowTrendModal(true)}
        >
          <Text style={styles.trendLinkText}>トレンドを見る</Text>
          <Ionicons name="chevron-forward" size={16} color="#007AFF" />
        </TouchableOpacity>
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
        <DailyNutritionSummary date={today} medicalGuidance={medicalGuidance} />
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
                  <View key={i} style={styles.ingredientRow}>
                    <Text style={styles.ingredientText}>・{ing}</Text>
                    {ingredientSubstitutionService.findSubstitutes(ing) && (
                      <TouchableOpacity style={styles.substButton} onPress={() => openSubstitution(ing)}>
                        <Ionicons name="swap-horizontal" size={16} color="#007AFF" />
                      </TouchableOpacity>
                    )}
                  </View>
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

      {/* Substitution modal */}
      <Modal visible={showSubstModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '60%' }]}>
            <View style={styles.trendHeader}>
              <Text style={styles.trendTitle}>「{substOriginalName}」の代替候補</Text>
              <TouchableOpacity onPress={() => setShowSubstModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {substOptions.map((option, i) => (
                <View key={i} style={styles.substCard}>
                  <Text style={styles.substName}>{option.name}</Text>
                  <View style={styles.substCompareRow}>
                    <Text style={styles.substCompareText}>GI: {substOriginalNutrition?.gi}→{option.nutrition.gi}</Text>
                    <Text style={styles.substCompareText}>Cal: {substOriginalNutrition?.caloriesPer100g}→{option.nutrition.caloriesPer100g}</Text>
                  </View>
                  <View style={styles.substCompareRow}>
                    <Text style={styles.substCompareText}>糖質: {substOriginalNutrition?.carbsPer100g}→{option.nutrition.carbsPer100g}g</Text>
                    <Text style={styles.substCompareText}>タンパク: {substOriginalNutrition?.proteinPer100g}→{option.nutrition.proteinPer100g}g</Text>
                  </View>
                  <TouchableOpacity style={styles.substApplyButton} onPress={() => applySubstitution(option)}>
                    <Text style={styles.substApplyText}>この食材に置き換える</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Trend modal */}
      <Modal visible={showTrendModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.trendHeader}>
              <Text style={styles.trendTitle}>血糖値トレンド</Text>
              <TouchableOpacity onPress={() => setShowTrendModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {/* Period selector */}
              <View style={styles.trendPeriodRow}>
                {([
                  { key: '1week', label: '1週' },
                  { key: '1month', label: '1ヶ月' },
                  { key: '3months', label: '3ヶ月' },
                  { key: '6months', label: '6ヶ月' },
                ] as const).map(p => (
                  <TouchableOpacity
                    key={p.key}
                    style={[styles.trendPeriodButton, trendRange === p.key && styles.trendPeriodButtonActive]}
                    onPress={() => setTrendRange(p.key)}
                  >
                    <Text style={[styles.trendPeriodText, trendRange === p.key && styles.trendPeriodTextActive]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Chart */}
              {getFilteredTrendRecords().length > 0 ? (
                <LineChart
                  data={getTrendChartData()}
                  width={screenWidth - 60}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#fff',
                    backgroundGradientFrom: '#fff',
                    backgroundGradientTo: '#fff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
                    propsForDots: { r: '3', strokeWidth: '1', stroke: '#2196F3' },
                  }}
                  bezier
                  style={{ borderRadius: 8, marginVertical: 8 }}
                />
              ) : (
                <Text style={styles.emptyText}>選択期間にデータがありません</Text>
              )}

              {medicalGuidance && (medicalGuidance.glucoseMin || medicalGuidance.glucoseMax) && (
                <View style={styles.trendTargetRow}>
                  {medicalGuidance.glucoseMin && (
                    <Text style={styles.trendTargetText}>下限目標: {medicalGuidance.glucoseMin} mg/dL</Text>
                  )}
                  {medicalGuidance.glucoseMax && (
                    <Text style={[styles.trendTargetText, { color: '#F44336' }]}>上限目標: {medicalGuidance.glucoseMax} mg/dL</Text>
                  )}
                </View>
              )}

              {/* Meal timing filter */}
              <View style={styles.trendFilterRow}>
                {(['朝', '昼', '夜'] as MealTiming[]).map(timing => (
                  <TouchableOpacity
                    key={timing}
                    style={[styles.trendFilterChip, trendFilters.has(timing) && styles.trendFilterChipActive]}
                    onPress={() => toggleTrendFilter(timing)}
                  >
                    <Text style={[styles.trendFilterText, trendFilters.has(timing) && styles.trendFilterTextActive]}>
                      {timing}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Stats */}
              {(() => {
                const stats = getTrendStats();
                return (
                  <View style={styles.trendStatsCard}>
                    <Text style={styles.trendStatsTitle}>平均値</Text>
                    <View style={styles.trendStatsRow}>
                      <View style={styles.trendStatItem}>
                        <Text style={styles.trendStatLabel}>今週</Text>
                        <Text style={styles.trendStatValue}>
                          {stats.thisAvg != null ? `${stats.thisAvg} mg/dL` : '—'}
                        </Text>
                      </View>
                      <View style={styles.trendStatItem}>
                        <Text style={styles.trendStatLabel}>先週</Text>
                        <Text style={styles.trendStatValue}>
                          {stats.lastAvg != null ? `${stats.lastAvg} mg/dL` : '—'}
                        </Text>
                      </View>
                      {stats.thisAvg != null && stats.lastAvg != null && (
                        <View style={styles.trendStatItem}>
                          <Text style={styles.trendStatLabel}>変化</Text>
                          <Text style={[
                            styles.trendStatValue,
                            { color: stats.thisAvg <= stats.lastAvg ? '#4CAF50' : '#F44336' },
                          ]}>
                            {stats.thisAvg <= stats.lastAvg ? '↓' : '↑'}
                            {Math.abs(stats.thisAvg - stats.lastAvg)} mg/dL
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })()}

              {/* HbA1c history */}
              {(() => {
                const history = getHba1cHistory();
                if (history.length === 0) return null;
                return (
                  <View style={styles.trendStatsCard}>
                    <Text style={styles.trendStatsTitle}>HbA1c推移</Text>
                    <View style={styles.hba1cRow}>
                      {history.slice(-6).map((h, i, arr) => (
                        <View key={i} style={styles.hba1cItem}>
                          <Text style={styles.hba1cValue}>{h.value}</Text>
                          <Text style={styles.hba1cDate}>{h.date.slice(5)}</Text>
                          {i < arr.length - 1 && (
                            <Text style={styles.hba1cArrow}>→</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })()}
            </ScrollView>
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
  trendLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 2,
  },
  trendLinkText: {
    fontSize: 14,
    color: '#007AFF',
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  trendTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  trendPeriodRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  trendPeriodButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  trendPeriodButtonActive: {
    backgroundColor: '#007AFF',
  },
  trendPeriodText: {
    fontSize: 13,
    color: '#666',
  },
  trendPeriodTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  trendFilterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 12,
  },
  trendFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  trendFilterChipActive: {
    backgroundColor: '#2196F3',
  },
  trendFilterText: {
    fontSize: 14,
    color: '#666',
  },
  trendFilterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  trendStatsCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
  },
  trendStatsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  trendStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  trendStatItem: {
    alignItems: 'center',
  },
  trendStatLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  trendStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  hba1cRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  hba1cItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  hba1cValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  hba1cDate: {
    fontSize: 11,
    color: '#888',
  },
  hba1cArrow: {
    fontSize: 16,
    color: '#ccc',
    marginHorizontal: 4,
  },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  substButton: { padding: 4 },
  substCard: { backgroundColor: '#f9f9f9', borderRadius: 10, padding: 14, marginBottom: 10 },
  substName: { fontSize: 17, fontWeight: '600', color: '#333', marginBottom: 8 },
  substCompareRow: { flexDirection: 'row', gap: 16, marginBottom: 4 },
  substCompareText: { fontSize: 13, color: '#666' },
  substApplyButton: { backgroundColor: '#007AFF', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8 },
  substApplyText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  trendTargetRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 8, backgroundColor: '#f9f9f9', borderRadius: 8, marginBottom: 8 },
  trendTargetText: { fontSize: 13, fontWeight: '500', color: '#4CAF50' },
});
