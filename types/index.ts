export interface GlucoseRecord {
  id: string;
  value: number;
  timestamp: number;
  date: string;
  mealType: string;
  mealNote?: string;
  userId: string;
}

export interface WeeklyRecord {
  id: string;
  weekStart: string;
  weight?: number;
  exercise?: string;
  condition?: string;
  hba1c?: number;
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  };
  timestamp: number;
  userId: string;
}

export interface User {
  id: string;
  name: string;
  age: number;
  avatar: string;
  createdAt: number;
  healthData: {
    height: number;
    weight: number;
    gender: 'male' | 'female';
    activityLevel: 'light' | 'moderate' | 'high';
  };
  foodPreferences: {
    liked: string[];
    disliked: string[];
  };
  onboardingCompleted: boolean;
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
  mealType?: string;
}

export interface SavedMealPlan {
  id: string;
  userId: string;
  createdAt: number;
  period: number;
  startDate: string;
  meals: { [date: string]: GeneratedMeal[] };
  userProfile: UserHealthProfile;
  name?: string;
  glucoseAtGeneration?: number;
}

export interface UserHealthProfile {
  age: number;
  gender: 'male' | 'female';
  currentGlucose: number;
  hba1c: number;
  bodyCondition: string;
  activityLevel: 'light' | 'moderate' | 'high';
  dietRestriction: string;
  selectedMainCourses: string[];
  selectedMainIngredients: string[];
  selectedSideIngredients: string[];
  height?: number;
  weight?: number;
  likedFoods?: string[];
  dislikedFoods?: string[];
}

export type TimeRange = '1week' | '1month' | '3months';

export type MealTiming = '朝' | '昼' | '夜';
