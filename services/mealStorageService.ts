import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedMealPlan, GeneratedMeal, UserHealthProfile } from '../types';

class MealStorageService {
  private readonly STORAGE_KEY = 'saved_meal_plans';

  // 献立プランを保存
  async saveMealPlan(
    userId: string,
    meals: {[date: string]: GeneratedMeal[]},
    userProfile: UserHealthProfile,
    period: number = 7,
    startDate: Date = new Date(),
    name?: string,
    glucoseAtGeneration?: number
  ): Promise<SavedMealPlan> {
    try {
      const savedPlan: SavedMealPlan = {
        id: Date.now().toString(),
        userId,
        createdAt: Date.now(),
        period,
        startDate: startDate.toISOString().split('T')[0], // YYYY-MM-DD
        meals,
        userProfile,
        name: name || `献立プラン ${new Date().toLocaleDateString('ja-JP')}`,
        glucoseAtGeneration,
      };

      // 既存の献立プランを取得
      const existingPlans = await this.getSavedMealPlans();
      const updatedPlans = [...existingPlans, savedPlan];

      // 最新30件のみ保持（古いものを削除）
      const limitedPlans = updatedPlans.slice(-30);

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(limitedPlans));
      
      console.log(`献立プラン保存完了: ${savedPlan.name} (ID: ${savedPlan.id})`);
      return savedPlan;
    } catch (error) {
      console.error('献立プラン保存エラー:', error);
      throw new Error('献立プランの保存に失敗しました');
    }
  }

  // 保存された献立プランを全件取得
  async getSavedMealPlans(): Promise<SavedMealPlan[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const plans: SavedMealPlan[] = JSON.parse(stored);
        // 作成日時で降順ソート（新しい順）
        return plans.sort((a, b) => b.createdAt - a.createdAt);
      }
      return [];
    } catch (error) {
      console.error('献立プラン読み込みエラー:', error);
      return [];
    }
  }

  // ユーザー別の献立プランを取得
  async getUserMealPlans(userId: string): Promise<SavedMealPlan[]> {
    const allPlans = await this.getSavedMealPlans();
    return allPlans.filter(plan => plan.userId === userId);
  }

  // 特定の献立プランを取得
  async getMealPlanById(planId: string): Promise<SavedMealPlan | null> {
    const allPlans = await this.getSavedMealPlans();
    return allPlans.find(plan => plan.id === planId) || null;
  }

  // 献立プランを削除
  async deleteMealPlan(planId: string): Promise<boolean> {
    try {
      const allPlans = await this.getSavedMealPlans();
      const updatedPlans = allPlans.filter(plan => plan.id !== planId);
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedPlans));
      console.log(`献立プラン削除完了: ${planId}`);
      return true;
    } catch (error) {
      console.error('献立プラン削除エラー:', error);
      return false;
    }
  }

  // 献立プラン名を更新
  async updateMealPlanName(planId: string, newName: string): Promise<boolean> {
    try {
      const allPlans = await this.getSavedMealPlans();
      const planIndex = allPlans.findIndex(plan => plan.id === planId);
      
      if (planIndex === -1) {
        throw new Error('献立プランが見つかりません');
      }

      allPlans[planIndex].name = newName;
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(allPlans));
      
      console.log(`献立プラン名更新完了: ${planId} -> ${newName}`);
      return true;
    } catch (error) {
      console.error('献立プラン名更新エラー:', error);
      return false;
    }
  }

  // ストレージ使用量の統計を取得
  async getStorageStats(): Promise<{
    totalPlans: number;
    totalMeals: number;
    oldestPlan: string | null;
    newestPlan: string | null;
  }> {
    const allPlans = await this.getSavedMealPlans();
    
    if (allPlans.length === 0) {
      return {
        totalPlans: 0,
        totalMeals: 0,
        oldestPlan: null,
        newestPlan: null
      };
    }

    const totalMeals = allPlans.reduce((sum, plan) => {
      return sum + Object.values(plan.meals).reduce((mealSum, dailyMeals) => {
        return mealSum + dailyMeals.length;
      }, 0);
    }, 0);

    const sortedByDate = [...allPlans].sort((a, b) => a.createdAt - b.createdAt);

    return {
      totalPlans: allPlans.length,
      totalMeals,
      oldestPlan: sortedByDate[0]?.name || null,
      newestPlan: sortedByDate[sortedByDate.length - 1]?.name || null
    };
  }

  // データをリセット（開発用）
  async clearAllMealPlans(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      console.log('全献立プランを削除しました');
      return true;
    } catch (error) {
      console.error('献立プラン全削除エラー:', error);
      return false;
    }
  }
}

// シングルトンインスタンスをエクスポート
const mealStorageService = new MealStorageService();
export default mealStorageService;