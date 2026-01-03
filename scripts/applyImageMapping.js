/**
 * 画像マッピングデータを適用するスクリプト
 * 手動分類した結果をimageMap.tsに反映
 */

const fs = require('fs');
const path = require('path');

const IMAGE_MAP_PATH = './assets/images/meals/imageMap.ts';
const MAPPING_DATA_PATH = './smartmeals-image-mapping.json';

function applyMapping() {
  // マッピングデータを読み込み
  if (!fs.existsSync(MAPPING_DATA_PATH)) {
    console.error('❌ マッピングデータファイルが見つかりません:', MAPPING_DATA_PATH);
    console.log('💡 まず image-mapping-tool.html で分類作業を行い、データをエクスポートしてください');
    return;
  }

  const mappingData = JSON.parse(fs.readFileSync(MAPPING_DATA_PATH, 'utf8'));
  
  console.log('📊 マッピングデータ統計:');
  console.log(`- 総画像数: ${mappingData.stats.total}`);
  console.log(`- 確認済み: ${mappingData.stats.checked}`);
  console.log(`- 分類済み: ${mappingData.stats.categorized}`);
  console.log('');

  // 現在のimageMap.tsを読み込み
  let imageMapContent = fs.readFileSync(IMAGE_MAP_PATH, 'utf8');
  
  // baseMealImageMapの部分を置換
  const newMappingLines = Object.entries(mappingData.mapping).map(([categoryId, fileName]) => {
    return `  '${categoryId}': require('./${fileName}'),`;
  });
  
  const newBaseMealImageMap = `export const baseMealImageMap: MealImageMap = {
  // 自動生成されたマッピング (${new Date().toLocaleString('ja-JP')})
${newMappingLines.join('\n')}
};`;

  // 既存のbaseMealImageMapを新しいものに置換
  const baseMealMapRegex = /export const baseMealImageMap: MealImageMap = \{[^}]+\};/s;
  
  if (baseMealMapRegex.test(imageMapContent)) {
    imageMapContent = imageMapContent.replace(baseMealMapRegex, newBaseMealImageMap);
  } else {
    console.error('❌ baseMealImageMapが見つかりませんでした');
    return;
  }

  // バックアップを作成
  const backupPath = IMAGE_MAP_PATH + '.backup.' + Date.now();
  fs.writeFileSync(backupPath, fs.readFileSync(IMAGE_MAP_PATH, 'utf8'));
  console.log(`💾 バックアップを作成: ${backupPath}`);

  // 新しいマッピングを適用
  fs.writeFileSync(IMAGE_MAP_PATH, imageMapContent);
  console.log(`✅ 画像マッピングを更新: ${IMAGE_MAP_PATH}`);
  
  // 結果を表示
  console.log('\n📋 適用されたマッピング:');
  Object.entries(mappingData.mapping).forEach(([categoryId, fileName]) => {
    const categoryName = getCategoryName(categoryId);
    console.log(`  ${categoryName}: ${fileName}`);
  });

  // 各カテゴリの代替画像候補も表示
  console.log('\n🔄 代替画像候補 (今後のローテーションに使用可能):');
  Object.entries(mappingData.byCategory).forEach(([categoryId, files]) => {
    if (files.length > 1) {
      const categoryName = getCategoryName(categoryId);
      console.log(`  ${categoryName}: ${files.slice(1).join(', ')}`);
    }
  });
}

function getCategoryName(categoryId) {
  const categories = {
    // 白身魚料理
    white_fish_grilled: '白身魚の塩焼き（鯛、ひらめ、かれいなど）',
    white_fish_simmered: '白身魚の煮つけ',
    white_fish_steamed: '白身魚の蒸し物',
    white_fish_meuniere: '白身魚のムニエル',
    
    // 赤身魚料理
    red_fish_grilled: '赤身魚の塩焼き（鮭、さば、あじなど）',
    red_fish_simmered: '赤身魚の煮つけ',
    red_fish_steamed: '赤身魚の蒸し物',
    red_fish_meuniere: '赤身魚のムニエル',
    
    // 肉料理（単体）
    chicken_steamed: '蒸し鶏',
    chicken_grilled: '鶏の塩焼き',
    pork_steamed: '豚の蒸し物',
    beef_lean_grilled: '赤身肉のグリル',
    
    // 肉野菜組み合わせ料理
    chicken_vegetable_stirfry: '鶏肉と野菜の炒め物',
    pork_vegetable_stirfry: '豚肉と野菜の炒め物',
    beef_vegetable_stirfry: '牛肉と野菜の炒め物', 
    chicken_vegetable_simmer: '鶏肉と野菜の煮物（筑前煮など）',
    pork_vegetable_simmer: '豚肉と野菜の煮物',
    chicken_vegetable_steam: '鶏肉と野菜の蒸し物',
    meat_vegetable_salad: '肉野菜サラダ（冷しゃぶなど）',
    hambarg_vegetable: 'ハンバーグ風肉野菜',
    
    // 野菜料理（単体）
    greens_gomae: '青菜の胡麻和え',
    greens_ohitashi: '青菜のお浸し',
    vegetables_stirfry: '野菜炒め（肉なし）',
    vegetables_simmered: '野菜の煮物（肉なし）',
    vegetables_steamed: '野菜の蒸し物',
    
    // 豆腐・卵料理
    tofu_simmered: '豆腐の煮物',
    tofu_grilled: '豆腐の焼き物',
    egg_tamagoyaki: '卵焼き',
    egg_chawanmushi: '茶碗蒸し',
    
    // スープ・汁物
    soup_miso: '味噌汁',
    soup_clear: '清汁',
    soup_vegetable: '野菜スープ'
  };
  return categories[categoryId] || categoryId;
}

// 実行
applyMapping();