/**
 * HbA1c・基本情報から糖質上限・カロリー上限を自動算出するサービス
 */

interface BasicProfile {
  height?: number;   // cm
  weight?: number;   // kg
  age: number;
  gender: 'male' | 'female';
  activityLevel: 'light' | 'moderate' | 'high';
}

interface AutoLimits {
  dailyCalorieLimit: number;
  dailyCarbLimit: number;
}

// 活動量係数
const ACTIVITY_FACTORS: Record<string, number> = {
  light: 1.3,
  moderate: 1.5,
  high: 1.7,
};

/**
 * Harris-Benedict式で基礎代謝量(BMR)を算出し、活動量係数を乗じてTDEEを求める
 */
function calcTDEE(profile: BasicProfile): number {
  const { height, weight, age, gender, activityLevel } = profile;
  if (!height || !weight) return 1800; // デフォルト

  let bmr: number;
  if (gender === 'male') {
    bmr = 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
  } else {
    bmr = 447.593 + 9.247 * weight + 3.098 * height - 4.330 * age;
  }

  return Math.round(bmr * (ACTIVITY_FACTORS[activityLevel] || 1.5));
}

/**
 * HbA1cに基づく糖質制限の厳しさ（糖質のカロリー比率）
 * - HbA1c < 6.0  → ゆるめ（50-55%）
 * - HbA1c 6.0-7.0 → ふつう（45-50%）
 * - HbA1c 7.0-8.0 → きびしめ（40-45%）
 * - HbA1c > 8.0  → 厳格（35-40%）
 */
function getCarbRatio(hba1c?: number): number {
  if (!hba1c || hba1c < 6.0) return 0.50;
  if (hba1c < 7.0) return 0.45;
  if (hba1c < 8.0) return 0.40;
  return 0.35;
}

/**
 * HbA1cから献立生成の制限レベルを自動判定
 */
export function getAutoRestrictionLevel(hba1c?: number): 'ゆるめ' | 'ふつう' | 'きびしめ' {
  if (!hba1c || hba1c < 6.0) return 'ゆるめ';
  if (hba1c < 7.0) return 'ふつう';
  return 'きびしめ';
}

/**
 * 基本情報とHbA1cから糖質・カロリー上限を自動算出
 */
export function calcAutoLimits(profile: BasicProfile, hba1c?: number): AutoLimits {
  const tdee = calcTDEE(profile);
  // 糖尿病管理向けにTDEEの90-95%を目標カロリーとする
  const dailyCalorieLimit = Math.round(tdee * 0.92);
  const carbRatio = getCarbRatio(hba1c);
  // 糖質1g = 4kcal
  const dailyCarbLimit = Math.round((dailyCalorieLimit * carbRatio) / 4);

  return { dailyCalorieLimit, dailyCarbLimit };
}

export default { calcAutoLimits, getAutoRestrictionLevel };
