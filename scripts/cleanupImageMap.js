/**
 * imageMap.tsのクリーンアップ
 * 削除された画像のエントリを除去
 */

const fs = require('fs');
const path = require('path');

const IMAGE_MAP_PATH = './assets/images/meals/imageMap.ts';
const IMAGES_DIR = './assets/images/meals/';

function cleanupImageMap() {
  console.log('🧹 imageMap.ts クリーンアップ開始...\n');
  
  // 現在存在する画像ファイルを取得
  const existingImages = fs.readdirSync(IMAGES_DIR)
    .filter(file => file.endsWith('.webp'))
    .sort();
  
  console.log(`📊 現在の画像数: ${existingImages.length}枚\n`);
  
  // 新しいmealImageMapを生成
  const newMealImageMapEntries = existingImages.map(fileName => {
    const key = fileName.replace('.webp', '');
    return `  '${key}': require('./${fileName}'),`;
  });
  
  // 現在のimageMap.tsを読み込み
  let imageMapContent = fs.readFileSync(IMAGE_MAP_PATH, 'utf8');
  
  // 新しいmealImageMapを作成
  const newMealImageMap = `// 既存の連番画像マップ（クリーンアップ済み - ${new Date().toLocaleString('ja-JP')}）
export const mealImageMap: MealImageMap = {
${newMealImageMapEntries.join('\n')}
};`;
  
  // 既存のmealImageMapを置換
  const mealMapRegex = /\/\/ 既存の連番画像マップ.*?export const mealImageMap: MealImageMap = \{[^}]+\};/s;
  
  if (mealMapRegex.test(imageMapContent)) {
    imageMapContent = imageMapContent.replace(mealMapRegex, newMealImageMap);
    
    // バックアップを作成
    const backupPath = IMAGE_MAP_PATH + '.backup.' + Date.now();
    fs.writeFileSync(backupPath, fs.readFileSync(IMAGE_MAP_PATH, 'utf8'));
    console.log(`💾 バックアップを作成: ${backupPath}`);
    
    // 新しいマッピングを書き込み
    fs.writeFileSync(IMAGE_MAP_PATH, imageMapContent);
    console.log(`✅ imageMap.tsを更新: ${existingImages.length}枚の画像をマッピング`);
    
    console.log('\n🎯 クリーンアップ完了!');
    console.log('- 削除された画像のエントリを除去');
    console.log('- 既存画像のみの清潔なマッピングに更新');
  } else {
    console.error('❌ mealImageMapが見つかりませんでした');
  }
}

// 実行
cleanupImageMap();