// 静的画像のマップ
// ベース料理IDベースのマッピングシステム

export interface MealImageMap {
  [key: string]: any;
}

// ベース料理IDと既存画像のマッピング
// 標準化された料理名に対応する画像を定義
export const baseMealImageMap: MealImageMap = {
  // 自動生成されたマッピング (2026/1/3 18:38:51)
  'chicken_grilled': require('./meal-0000.webp'),
  'hambarg_vegetable': require('./meal-0002.webp'),
  'white_fish_grilled': require('./meal-0004.webp'),
  'chicken_vegetable_steam': require('./meal-0008.webp'),
  'chicken_vegetable_stirfry': require('./meal-0011.webp'),
  'red_fish_grilled': require('./meal-0032.webp'),
  'white_fish_meuniere': require('./meal-0036.webp'),
  'red_fish_meuniere': require('./meal-0037.webp'),
  'meat_vegetable_salad': require('./meal-0065.webp'),
  'white_fish_simmered': require('./meal-0101.webp'),
  'tofu_simmered': require('./meal-0112.webp'),
  'vegetables_stirfry': require('./meal-0114.webp'),
  'beef_vegetable_stirfry': require('./meal-0125.webp'),
  'tofu_grilled': require('./meal-0131.webp'),
  'egg_tamagoyaki': require('./meal-0132.webp'),
  'beef_lean_grilled': require('./meal-0160.webp'),
  'soup_vegetable': require('./meal-0224.webp'),
  'red_fish_steamed': require('./meal-0234.webp'),
  'white_fish_steamed': require('./meal-0235.webp'),
  'red_fish_simmered': require('./meal-0242.webp'),
};

// 既存の連番画像マップ（クリーンアップ済み - 2026/1/3 18:42:32）
export const mealImageMap: MealImageMap = {
  'meal-0000': require('./meal-0000.webp'),
  'meal-0002': require('./meal-0002.webp'),
  'meal-0004': require('./meal-0004.webp'),
  'meal-0005': require('./meal-0005.webp'),
  'meal-0008': require('./meal-0008.webp'),
  'meal-0009': require('./meal-0009.webp'),
  'meal-0010': require('./meal-0010.webp'),
  'meal-0011': require('./meal-0011.webp'),
  'meal-0032': require('./meal-0032.webp'),
  'meal-0036': require('./meal-0036.webp'),
  'meal-0037': require('./meal-0037.webp'),
  'meal-0040': require('./meal-0040.webp'),
  'meal-0045': require('./meal-0045.webp'),
  'meal-0047': require('./meal-0047.webp'),
  'meal-0049': require('./meal-0049.webp'),
  'meal-0053': require('./meal-0053.webp'),
  'meal-0059': require('./meal-0059.webp'),
  'meal-0060': require('./meal-0060.webp'),
  'meal-0061': require('./meal-0061.webp'),
  'meal-0065': require('./meal-0065.webp'),
  'meal-0066': require('./meal-0066.webp'),
  'meal-0067': require('./meal-0067.webp'),
  'meal-0073': require('./meal-0073.webp'),
  'meal-0074': require('./meal-0074.webp'),
  'meal-0080': require('./meal-0080.webp'),
  'meal-0101': require('./meal-0101.webp'),
  'meal-0104': require('./meal-0104.webp'),
  'meal-0112': require('./meal-0112.webp'),
  'meal-0114': require('./meal-0114.webp'),
  'meal-0115': require('./meal-0115.webp'),
  'meal-0116': require('./meal-0116.webp'),
  'meal-0119': require('./meal-0119.webp'),
  'meal-0125': require('./meal-0125.webp'),
  'meal-0131': require('./meal-0131.webp'),
  'meal-0132': require('./meal-0132.webp'),
  'meal-0139': require('./meal-0139.webp'),
  'meal-0140': require('./meal-0140.webp'),
  'meal-0148': require('./meal-0148.webp'),
  'meal-0149': require('./meal-0149.webp'),
  'meal-0155': require('./meal-0155.webp'),
  'meal-0156': require('./meal-0156.webp'),
  'meal-0157': require('./meal-0157.webp'),
  'meal-0160': require('./meal-0160.webp'),
  'meal-0162': require('./meal-0162.webp'),
  'meal-0164': require('./meal-0164.webp'),
  'meal-0165': require('./meal-0165.webp'),
  'meal-0167': require('./meal-0167.webp'),
  'meal-0168': require('./meal-0168.webp'),
  'meal-0169': require('./meal-0169.webp'),
  'meal-0170': require('./meal-0170.webp'),
  'meal-0171': require('./meal-0171.webp'),
  'meal-0176': require('./meal-0176.webp'),
  'meal-0177': require('./meal-0177.webp'),
  'meal-0178': require('./meal-0178.webp'),
  'meal-0179': require('./meal-0179.webp'),
  'meal-0180': require('./meal-0180.webp'),
  'meal-0182': require('./meal-0182.webp'),
  'meal-0183': require('./meal-0183.webp'),
  'meal-0184': require('./meal-0184.webp'),
  'meal-0185': require('./meal-0185.webp'),
  'meal-0186': require('./meal-0186.webp'),
  'meal-0187': require('./meal-0187.webp'),
  'meal-0190': require('./meal-0190.webp'),
  'meal-0191': require('./meal-0191.webp'),
  'meal-0192': require('./meal-0192.webp'),
  'meal-0195': require('./meal-0195.webp'),
  'meal-0198': require('./meal-0198.webp'),
  'meal-0200': require('./meal-0200.webp'),
  'meal-0203': require('./meal-0203.webp'),
  'meal-0205': require('./meal-0205.webp'),
  'meal-0211': require('./meal-0211.webp'),
  'meal-0213': require('./meal-0213.webp'),
  'meal-0216': require('./meal-0216.webp'),
  'meal-0217': require('./meal-0217.webp'),
  'meal-0219': require('./meal-0219.webp'),
  'meal-0223': require('./meal-0223.webp'),
  'meal-0224': require('./meal-0224.webp'),
  'meal-0226': require('./meal-0226.webp'),
  'meal-0234': require('./meal-0234.webp'),
  'meal-0235': require('./meal-0235.webp'),
  'meal-0236': require('./meal-0236.webp'),
  'meal-0237': require('./meal-0237.webp'),
  'meal-0238': require('./meal-0238.webp'),
  'meal-0241': require('./meal-0241.webp'),
  'meal-0242': require('./meal-0242.webp'),
  'meal-0245': require('./meal-0245.webp'),
  'meal-0246': require('./meal-0246.webp'),
  'meal-0247': require('./meal-0247.webp'),
  'meal-0249': require('./meal-0249.webp'),
  'meal-0251': require('./meal-0251.webp'),
  'meal-0255': require('./meal-0255.webp'),
  'meal-0256': require('./meal-0256.webp'),
  'meal-0257': require('./meal-0257.webp'),
  'meal-0258': require('./meal-0258.webp'),
  'meal-0259': require('./meal-0259.webp'),
  'meal-0260': require('./meal-0260.webp'),
  'meal-0264': require('./meal-0264.webp'),
  'meal-0265': require('./meal-0265.webp'),
  'meal-0267': require('./meal-0267.webp'),
  'meal-0268': require('./meal-0268.webp'),
  'meal-0269': require('./meal-0269.webp'),
  'meal-0271': require('./meal-0271.webp'),
  'meal-0273': require('./meal-0273.webp'),
  'meal-0275': require('./meal-0275.webp'),
};

/**
 * ベース料理IDに対応する静的画像が存在するかチェック
 */
export function hasBaseMealImage(baseMealId: string): boolean {
  return baseMealId in baseMealImageMap;
}

/**
 * ベース料理IDから静的画像のリソースを取得
 */
export function getBaseMealImageSource(baseMealId: string): any {
  return baseMealImageMap[baseMealId];
}

/**
 * 既存の静的画像が存在するかチェック（後方互換性）
 */
export function hasStaticImage(mealId: string): boolean {
  const fileName = `meal-${mealId.padStart(4, '0')}`;
  return fileName in mealImageMap;
}

/**
 * 静的画像のリソースを取得（後方互換性）
 */
export function getStaticImageSource(mealId: string): any {
  const fileName = `meal-${mealId.padStart(4, '0')}`;
  return mealImageMap[fileName];
}