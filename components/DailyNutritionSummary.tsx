import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import mealStorageService from '../services/mealStorageService';
import { GeneratedMeal } from '../types';

interface DailyNutritionSummaryProps {
  date: string; // YYYY-MM-DD
  meals?: GeneratedMeal[];
}

// 日次栄養目標（糖尿病管理向けデフォルト値）
const DAILY_TARGETS = {
  calories: 1800,
  carbs: 200,
  protein: 60,
  fat: 50,
};

type NutrientKey = 'calories' | 'carbs' | 'protein' | 'fat';

interface NutrientTotals {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

// 達成率に応じた色を返す
const getProgressColor = (ratio: number): string => {
  if (ratio > 1.0) return '#F44336'; // 超過（赤）
  if (ratio >= 0.8) return '#FF9800'; // 80-100%（黄）
  return '#4CAF50'; // 80%未満（緑）
};

// 食事IDからカテゴリを判定
const getMealCategory = (meal: GeneratedMeal): string => {
  const id = meal.id.toLowerCase();
  if (id.includes('breakfast')) return '朝食';
  if (id.includes('lunch')) return '昼食';
  if (id.includes('dinner')) return '夕食';
  // IDで判定できない場合は名前から推定
  if (meal.name.includes('朝食')) return '朝食';
  if (meal.name.includes('昼食')) return '昼食';
  if (meal.name.includes('夕食')) return '夕食';
  return 'その他';
};

// 栄養素のプログレスバー
const NutrientBar = ({ label, value, target, unit }: {
  label: string;
  value: number;
  target: number;
  unit: string;
}) => {
  const ratio = target > 0 ? value / target : 0;
  const percentage = Math.min(ratio * 100, 100);
  const color = getProgressColor(ratio);

  return (
    <View style={barStyles.container}>
      <View style={barStyles.labelRow}>
        <Text style={barStyles.label}>{label}</Text>
        <Text style={barStyles.value}>
          {Math.round(value)}{unit} / {target}{unit}
        </Text>
      </View>
      <View style={barStyles.track}>
        <View
          style={[
            barStyles.fill,
            { width: `${percentage}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
};

export default function DailyNutritionSummary({ date, meals: propMeals }: DailyNutritionSummaryProps) {
  const [meals, setMeals] = useState<GeneratedMeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (propMeals) {
      setMeals(propMeals);
      setLoading(false);
    } else {
      loadMeals();
    }
  }, [date, propMeals]);

  const loadMeals = async () => {
    setLoading(true);
    try {
      const mealsForDate = await mealStorageService.getMealsForDate(date);
      setMeals(mealsForDate);
    } catch (error) {
      console.error('栄養サマリー読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  if (meals.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>今日の栄養</Text>
        <Text style={styles.noDataText}>今日の献立データがありません</Text>
      </View>
    );
  }

  // 合計を計算
  const totals: NutrientTotals = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + (meal.calories || 0),
      carbs: acc.carbs + (meal.carbs || 0),
      protein: acc.protein + (meal.protein || 0),
      fat: acc.fat + (meal.fat || 0),
    }),
    { calories: 0, carbs: 0, protein: 0, fat: 0 }
  );

  // 食事カテゴリ別に分類
  const mealsByCategory: { [key: string]: GeneratedMeal[] } = {};
  for (const meal of meals) {
    const category = getMealCategory(meal);
    if (!mealsByCategory[category]) {
      mealsByCategory[category] = [];
    }
    mealsByCategory[category].push(meal);
  }

  // 表示順序
  const categoryOrder = ['朝食', '昼食', '夕食', 'その他'];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>今日の栄養</Text>

      {/* 栄養素プログレスバー */}
      <View style={styles.barsContainer}>
        <NutrientBar
          label="カロリー"
          value={totals.calories}
          target={DAILY_TARGETS.calories}
          unit="kcal"
        />
        <NutrientBar
          label="炭水化物"
          value={totals.carbs}
          target={DAILY_TARGETS.carbs}
          unit="g"
        />
        <NutrientBar
          label="たんぱく質"
          value={totals.protein}
          target={DAILY_TARGETS.protein}
          unit="g"
        />
        <NutrientBar
          label="脂質"
          value={totals.fat}
          target={DAILY_TARGETS.fat}
          unit="g"
        />
      </View>

      {/* 食事別内訳 */}
      <View style={styles.breakdownContainer}>
        <Text style={styles.breakdownTitle}>食事別内訳</Text>
        {categoryOrder.map((category) => {
          const categoryMeals = mealsByCategory[category];
          if (!categoryMeals || categoryMeals.length === 0) return null;

          const categoryTotals = categoryMeals.reduce(
            (acc, meal) => ({
              calories: acc.calories + (meal.calories || 0),
              carbs: acc.carbs + (meal.carbs || 0),
              protein: acc.protein + (meal.protein || 0),
              fat: acc.fat + (meal.fat || 0),
            }),
            { calories: 0, carbs: 0, protein: 0, fat: 0 }
          );

          return (
            <View key={category} style={styles.breakdownRow}>
              <Text style={styles.breakdownCategory}>{category}</Text>
              <Text style={styles.breakdownValues}>
                {Math.round(categoryTotals.calories)}kcal / 炭{Math.round(categoryTotals.carbs)}g / た{Math.round(categoryTotals.protein)}g / 脂{Math.round(categoryTotals.fat)}g
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  value: {
    fontSize: 12,
    color: '#666',
  },
  track: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 14,
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 12,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 12,
  },
  barsContainer: {
    marginBottom: 14,
  },
  breakdownContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  breakdownCategory: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    minWidth: 40,
  },
  breakdownValues: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    textAlign: 'right',
  },
});
