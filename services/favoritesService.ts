import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'favorite_meals';

export interface FavoriteMeal {
  id: string;
  name: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  mealType?: string;
}

class FavoritesService {
  async getFavorites(userId: string): Promise<FavoriteMeal[]> {
    try {
      const data = await AsyncStorage.getItem(`${STORAGE_KEY}_${userId}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  async toggleFavorite(userId: string, meal: FavoriteMeal): Promise<boolean> {
    const favorites = await this.getFavorites(userId);
    const index = favorites.findIndex(f => f.id === meal.id);

    if (index >= 0) {
      favorites.splice(index, 1);
      await this.saveFavorites(userId, favorites);
      return false; // removed
    } else {
      favorites.push(meal);
      await this.saveFavorites(userId, favorites);
      return true; // added
    }
  }

  async isFavorite(userId: string, mealId: string): Promise<boolean> {
    const favorites = await this.getFavorites(userId);
    return favorites.some(f => f.id === mealId);
  }

  async getFavoriteIds(userId: string): Promise<Set<string>> {
    const favorites = await this.getFavorites(userId);
    return new Set(favorites.map(f => f.id));
  }

  private async saveFavorites(userId: string, favorites: FavoriteMeal[]): Promise<void> {
    await AsyncStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(favorites));
  }
}

const favoritesService = new FavoritesService();
export default favoritesService;
