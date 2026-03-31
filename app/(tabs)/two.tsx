import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, GeneratedMeal, SavedMealPlan, UserHealthProfile, GlucoseRecord } from '../../types';
import localMealEngine from '../../services/localMealEngine';
import mealStorageService from '../../services/mealStorageService';
import favoritesService, { FavoriteMeal } from '../../services/favoritesService';

// ============================================================
// Types
// ============================================================

type RestrictionLevel = 'ゆるめ' | 'ふつう' | 'きびしめ';

// ============================================================
// Main Screen
// ============================================================

export default function MealPlanScreen() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [savedPlans, setSavedPlans] = useState<SavedMealPlan[]>([]);
  const [favorites, setFavorites] = useState<FavoriteMeal[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Generation modal
  const [showGenModal, setShowGenModal] = useState(false);
  const [genPeriod, setGenPeriod] = useState<3 | 5 | 7>(3);
  const [genServings, setGenServings] = useState<1 | 2 | 3 | 4>(1);
  const [genRestriction, setGenRestriction] = useState<RestrictionLevel>('ふつう');
  const [preferLowGi, setPreferLowGi] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Plan detail modal
  const [selectedPlan, setSelectedPlan] = useState<SavedMealPlan | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planFavoriteIds, setPlanFavoriteIds] = useState<Set<string>>(new Set());

  // Recipe detail modal
  const [selectedMeal, setSelectedMeal] = useState<GeneratedMeal | null>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);

  // ============================================================
  // Data Loading
  // ============================================================

  const loadData = useCallback(async () => {
    try {
      // Load user
      const usersData = await AsyncStorage.getItem('users');
      const indexData = await AsyncStorage.getItem('currentUserIndex');
      let user: User | null = null;
      if (usersData) {
        const users: User[] = JSON.parse(usersData);
        const index = indexData ? parseInt(indexData) : 0;
        user = users[index] || users[0];
        if (!user.foodPreferences) user.foodPreferences = { liked: [], disliked: [] };
        setCurrentUser(user);
      }

      // Load saved plans
      if (user) {
        const plans = await mealStorageService.getUserMealPlans(user.id);
        setSavedPlans(plans);

        // Load favorites
        const favList = await favoritesService.getFavorites(user.id);
        setFavorites(favList);
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ============================================================
  // Generation
  // ============================================================

  const buildUserHealthProfile = async (): Promise<UserHealthProfile | null> => {
    if (!currentUser) return null;

    // Latest glucose
    let currentGlucose = 120;
    try {
      const glucoseData = await AsyncStorage.getItem('glucose_records');
      if (glucoseData) {
        const records: GlucoseRecord[] = JSON.parse(glucoseData);
        if (records.length > 0) {
          const sorted = records.sort((a, b) => b.timestamp - a.timestamp);
          currentGlucose = sorted[0].value;
        }
      }
    } catch {}

    // Latest HbA1c from weekly records
    let hba1c = 7.0;
    try {
      const weeklyData = await AsyncStorage.getItem('weekly_records');
      if (weeklyData) {
        const weekly = JSON.parse(weeklyData);
        const withHba1c = weekly.filter((r: any) => r.hba1c != null);
        if (withHba1c.length > 0) {
          const sorted = withHba1c.sort((a: any, b: any) => b.timestamp - a.timestamp);
          hba1c = sorted[0].hba1c;
        }
      }
    } catch {}

    // Diet restriction mapping
    const restrictionMap: Record<RestrictionLevel, string> = {
      'ゆるめ': 'light',
      'ふつう': 'standard',
      'きびしめ': 'strict',
    };

    return {
      age: currentUser.age || 50,
      gender: currentUser.healthData?.gender || 'male',
      currentGlucose,
      hba1c,
      bodyCondition: 'normal',
      activityLevel: currentUser.healthData?.activityLevel || 'moderate',
      dietRestriction: restrictionMap[genRestriction],
      selectedMainCourses: [],
      selectedMainIngredients: currentUser.foodPreferences?.liked || [],
      selectedSideIngredients: [],
      height: currentUser.healthData?.height,
      weight: currentUser.healthData?.weight,
      likedFoods: currentUser.foodPreferences?.liked || [],
      dislikedFoods: currentUser.foodPreferences?.disliked || [],
      preferLowGi,
    };
  };

  const handleGenerate = async () => {
    if (!currentUser) {
      Alert.alert('エラー', 'ユーザー情報が読み込めませんでした');
      return;
    }

    setIsGenerating(true);
    try {
      const profile = await buildUserHealthProfile();
      if (!profile) throw new Error('プロフィール構築に失敗しました');

      const favoriteIds = await favoritesService.getFavoriteIds(currentUser.id);

      const meals = await localMealEngine.generatePersonalizedMeals(
        profile,
        genPeriod,
        genServings,
        new Date(),
        Array.from(favoriteIds)
      );

      const planName = `${genPeriod}日間献立 ${new Date().toLocaleDateString('ja-JP')}`;
      await mealStorageService.saveMealPlan(
        currentUser.id,
        meals,
        profile,
        genPeriod,
        new Date(),
        planName,
        profile.currentGlucose
      );

      setShowGenModal(false);
      await loadData();
      Alert.alert('完了', `${genPeriod}日分の献立を作成しました`);
    } catch (error) {
      console.error('献立生成エラー:', error);
      Alert.alert('エラー', '献立の生成に失敗しました。もう一度お試しください。');
    } finally {
      setIsGenerating(false);
    }
  };

  // ============================================================
  // Plan actions
  // ============================================================

  const handleDeletePlan = (plan: SavedMealPlan) => {
    Alert.alert(
      '献立を削除',
      `「${plan.name || '献立プラン'}」を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            await mealStorageService.deleteMealPlan(plan.id);
            await loadData();
          },
        },
      ]
    );
  };

  const handleOpenPlan = async (plan: SavedMealPlan) => {
    setSelectedPlan(plan);
    if (currentUser) {
      const ids = await favoritesService.getFavoriteIds(currentUser.id);
      setPlanFavoriteIds(ids);
    }
    setShowPlanModal(true);
  };

  const handleToggleFavorite = async (meal: GeneratedMeal) => {
    if (!currentUser) return;
    const favMeal: FavoriteMeal = {
      id: meal.id,
      name: meal.name,
      calories: meal.calories,
      carbs: meal.carbs,
      protein: meal.protein,
      fat: meal.fat,
      mealType: meal.mealType,
    };
    const added = await favoritesService.toggleFavorite(currentUser.id, favMeal);
    const ids = await favoritesService.getFavoriteIds(currentUser.id);
    setPlanFavoriteIds(ids);
    // Refresh favorites list
    const favList = await favoritesService.getFavorites(currentUser.id);
    setFavorites(favList);
  };

  const handleOpenRecipe = (meal: GeneratedMeal) => {
    setSelectedMeal(meal);
    setShowRecipeModal(true);
  };

  // ============================================================
  // Helpers
  // ============================================================

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${d.getMonth() + 1}/${d.getDate()}（${days[d.getDay()]}）`;
  };

  const getMealTimingLabel = (index: number): string => {
    const labels = ['朝', '昼', '夜'];
    return labels[index] || `${index + 1}`;
  };

  const getPlanDateRange = (plan: SavedMealPlan): string => {
    const dates = Object.keys(plan.meals).sort();
    if (dates.length === 0) return '';
    const start = new Date(dates[0]);
    const end = new Date(dates[dates.length - 1]);
    return `${start.getMonth() + 1}/${start.getDate()} 〜 ${end.getMonth() + 1}/${end.getDate()}`;
  };

  const getTotalMealCount = (plan: SavedMealPlan): number => {
    return Object.values(plan.meals).reduce((sum, meals) => sum + meals.length, 0);
  };

  // ============================================================
  // Render helpers
  // ============================================================

  const renderSelectorButtons = <T extends number | string>(
    options: T[],
    value: T,
    onSelect: (v: T) => void,
    labelSuffix?: string
  ) => (
    <View style={styles.selectorRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={String(opt)}
          style={[styles.selectorBtn, value === opt && styles.selectorBtnActive]}
          onPress={() => onSelect(opt)}
        >
          <Text style={[styles.selectorBtnText, value === opt && styles.selectorBtnTextActive]}>
            {String(opt)}{labelSuffix || ''}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ============================================================
  // Render
  // ============================================================

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>献立</Text>
        <TouchableOpacity
          style={styles.newPlanBtn}
          onPress={() => setShowGenModal(true)}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.newPlanBtnText}>新しい献立</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Favorites Section */}
        {favorites.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>お気に入り</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.favScroll}>
              {favorites.map((fav) => (
                <View key={fav.id} style={styles.favCard}>
                  <Ionicons name="star" size={14} color="#f5a623" style={{ marginBottom: 4 }} />
                  <Text style={styles.favCardName} numberOfLines={2}>{fav.name}</Text>
                  <Text style={styles.favCardCalories}>{fav.calories} kcal</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Saved Plans Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>保存済みの献立</Text>
          {savedPlans.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>献立がまだありません</Text>
              <Text style={styles.emptyStateSubText}>「新しい献立」ボタンで作成できます</Text>
            </View>
          ) : (
            savedPlans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={styles.planCard}
                onPress={() => handleOpenPlan(plan)}
                activeOpacity={0.7}
              >
                <View style={styles.planCardHeader}>
                  <View style={styles.planCardInfo}>
                    <Text style={styles.planCardName} numberOfLines={1}>
                      {plan.name || '献立プラン'}
                    </Text>
                    <Text style={styles.planCardMeta}>
                      {getPlanDateRange(plan)} · {plan.period}日間
                    </Text>
                    <Text style={styles.planCardMeta}>
                      {getTotalMealCount(plan)}食分
                      {plan.glucoseAtGeneration ? ` · 血糖値 ${plan.glucoseAtGeneration} mg/dL` : ''}
                    </Text>
                  </View>
                  <View style={styles.planCardActions}>
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); handleDeletePlan(plan); }}
                      style={styles.deleteBtn}
                    >
                      <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                    </TouchableOpacity>
                    <Ionicons name="chevron-forward" size={18} color="#aaa" />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* ============================================================ */}
      {/* Generation Modal */}
      {/* ============================================================ */}
      <Modal visible={showGenModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>新しい献立を作成</Text>
              <TouchableOpacity onPress={() => setShowGenModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Period */}
              <Text style={styles.fieldLabel}>期間</Text>
              {renderSelectorButtons<3 | 5 | 7>(
                [3, 5, 7],
                genPeriod,
                setGenPeriod,
                '日間'
              )}

              {/* Servings */}
              <Text style={styles.fieldLabel}>人数</Text>
              {renderSelectorButtons<1 | 2 | 3 | 4>(
                [1, 2, 3, 4],
                genServings,
                setGenServings,
                '人前'
              )}

              {/* Restriction */}
              <Text style={styles.fieldLabel}>制限レベル</Text>
              {renderSelectorButtons<RestrictionLevel>(
                ['ゆるめ', 'ふつう', 'きびしめ'],
                genRestriction,
                setGenRestriction
              )}

              {/* 低GI優先トグル */}
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>低GI優先</Text>
                <TouchableOpacity
                  style={[styles.toggleButton, preferLowGi && styles.toggleButtonActive]}
                  onPress={() => setPreferLowGi(!preferLowGi)}
                >
                  <Text style={[styles.toggleButtonText, preferLowGi && styles.toggleButtonTextActive]}>
                    {preferLowGi ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.autoNote}>
                血糖値・HbA1c・食材の好みは自動で反映されます
              </Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.generateBtn, isGenerating && styles.generateBtnDisabled]}
                onPress={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.generateBtnText}>作成する</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* Plan Detail Modal */}
      {/* ============================================================ */}
      <Modal visible={showPlanModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, styles.modalSheetTall]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedPlan?.name || '献立プラン'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowPlanModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedPlan &&
                Object.keys(selectedPlan.meals)
                  .sort()
                  .map((dateKey) => (
                    <View key={dateKey} style={styles.daySection}>
                      <Text style={styles.dayTitle}>{formatDate(dateKey)}</Text>
                      {selectedPlan.meals[dateKey].map((meal, idx) => (
                        <TouchableOpacity
                          key={meal.id}
                          style={styles.mealRow}
                          onPress={() => handleOpenRecipe(meal)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.mealTimingBadge}>
                            <Text style={styles.mealTimingText}>
                              {getMealTimingLabel(idx)}
                            </Text>
                          </View>
                          <View style={styles.mealRowInfo}>
                            <Text style={styles.mealRowName} numberOfLines={1}>
                              {meal.name}
                            </Text>
                            <Text style={styles.mealRowCal}>{meal.calories} kcal</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleToggleFavorite(meal)}
                            style={styles.starBtn}
                          >
                            <Ionicons
                              name={planFavoriteIds.has(meal.id) ? 'star' : 'star-outline'}
                              size={20}
                              color={planFavoriteIds.has(meal.id) ? '#f5a623' : '#ccc'}
                            />
                          </TouchableOpacity>
                          <Ionicons name="chevron-forward" size={16} color="#ccc" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* Recipe Detail Modal */}
      {/* ============================================================ */}
      <Modal visible={showRecipeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, styles.modalSheetTall]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedMeal?.name || 'レシピ'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowRecipeModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedMeal && (
                <>
                  {/* Description */}
                  {selectedMeal.description ? (
                    <Text style={styles.recipeDescription}>{selectedMeal.description}</Text>
                  ) : null}

                  {/* Nutrition row */}
                  <View style={styles.nutritionRow}>
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionValue}>{selectedMeal.calories}</Text>
                      <Text style={styles.nutritionLabel}>kcal</Text>
                    </View>
                    <View style={styles.nutritionDivider} />
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionValue}>{selectedMeal.carbs}g</Text>
                      <Text style={styles.nutritionLabel}>糖質</Text>
                    </View>
                    <View style={styles.nutritionDivider} />
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionValue}>{selectedMeal.protein}g</Text>
                      <Text style={styles.nutritionLabel}>たんぱく質</Text>
                    </View>
                    <View style={styles.nutritionDivider} />
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionValue}>{selectedMeal.fat}g</Text>
                      <Text style={styles.nutritionLabel}>脂質</Text>
                    </View>
                  </View>

                  {/* Ingredients */}
                  <Text style={styles.recipeSectionTitle}>材料</Text>
                  {selectedMeal.ingredients.map((ing, i) => (
                    <View key={i} style={styles.ingredientRow}>
                      <View style={styles.ingredientDot} />
                      <Text style={styles.ingredientText}>{ing}</Text>
                    </View>
                  ))}

                  {/* Recipe steps */}
                  <Text style={styles.recipeSectionTitle}>作り方</Text>
                  {selectedMeal.recipe.map((step, i) => (
                    <View key={i} style={styles.stepRow}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{i + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================================
// Styles
// ============================================================

const ACCENT = '#4CAF50';
const ACCENT_DARK = '#388E3C';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
  },
  newPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  newPlanBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Section
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
  },
  emptyStateSubText: {
    marginTop: 4,
    fontSize: 13,
    color: '#bbb',
  },

  // Favorites
  favScroll: {
    marginHorizontal: -4,
  },
  favCard: {
    width: 120,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  favCardName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  favCardCalories: {
    fontSize: 12,
    color: '#888',
  },

  // Plan card
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planCardInfo: {
    flex: 1,
  },
  planCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  planCardMeta: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  planCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: {
    padding: 6,
  },

  // Modal overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalSheetTall: {
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },

  // Generation modal fields
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
    marginTop: 16,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectorBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  selectorBtnActive: {
    borderColor: ACCENT,
    backgroundColor: ACCENT + '15',
  },
  selectorBtnText: {
    fontSize: 13,
    color: '#777',
    fontWeight: '500',
  },
  selectorBtnTextActive: {
    color: ACCENT_DARK,
    fontWeight: '700',
  },
  autoNote: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },

  // Generate button
  generateBtn: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  generateBtnDisabled: {
    opacity: 0.6,
  },
  generateBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Plan detail
  daySection: {
    marginBottom: 20,
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
    gap: 8,
  },
  mealTimingBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: ACCENT + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealTimingText: {
    fontSize: 12,
    fontWeight: '700',
    color: ACCENT_DARK,
  },
  mealRowInfo: {
    flex: 1,
  },
  mealRowName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  mealRowCal: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  starBtn: {
    padding: 4,
  },

  // Recipe detail
  recipeDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 16,
  },
  nutritionRow: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    alignItems: 'center',
  },
  nutritionItem: {
    flex: 1,
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  nutritionLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  nutritionDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#ddd',
  },
  recipeSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
    marginTop: 4,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT,
    marginTop: 6,
  },
  ingredientText: {
    flex: 1,
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingVertical: 8,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  toggleButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  toggleButtonActive: {
    backgroundColor: '#4CAF50',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
});
