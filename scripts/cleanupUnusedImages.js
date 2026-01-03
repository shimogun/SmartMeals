/**
 * 未使用画像のクリーンアップスクリプト
 * 「その他（使用しない）」に分類された画像を安全に削除
 */

const fs = require('fs');
const path = require('path');

const MAPPING_DATA_PATH = './smartmeals-image-mapping.json';
const IMAGES_DIR = './assets/images/meals/';
const BACKUP_DIR = './unused_images_backup/';

function cleanupUnusedImages() {
  // マッピングデータを読み込み
  if (!fs.existsSync(MAPPING_DATA_PATH)) {
    console.error('❌ マッピングデータファイルが見つかりません:', MAPPING_DATA_PATH);
    return;
  }

  const mappingData = JSON.parse(fs.readFileSync(MAPPING_DATA_PATH, 'utf8'));
  
  console.log('🗂️  画像クリーンアップ開始...\n');
  
  // 使用中の画像ファイル名を収集
  const usedImages = new Set();
  
  // カテゴリ別マッピングから使用中画像を抽出
  Object.values(mappingData.byCategory || {}).forEach(categoryFiles => {
    categoryFiles.forEach(fileName => {
      usedImages.add(fileName);
    });
  });
  
  // その他カテゴリ（削除対象）の画像を特定
  const unusedImages = [];
  const imageData = JSON.parse(fs.readFileSync(MAPPING_DATA_PATH, 'utf8'));
  
  // マッピングデータから未使用画像を特定
  const allImageData = loadImageDataFromMapping(mappingData);
  allImageData.forEach(img => {
    if (img.category === 'other' || !img.category || img.category === '') {
      unusedImages.push(img.fileName);
    }
  });
  
  console.log(`📊 削除対象画像の統計:`);
  console.log(`- 使用中画像: ${usedImages.size}枚`);
  console.log(`- 未使用画像: ${unusedImages.length}枚`);
  console.log(`- 削除予定: ${unusedImages.length}枚\n`);
  
  if (unusedImages.length === 0) {
    console.log('✅ 削除対象の画像はありません');
    return;
  }
  
  // バックアップディレクトリを作成
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`📁 バックアップディレクトリを作成: ${BACKUP_DIR}`);
  }
  
  // 削除前に削除対象画像をリスト表示
  console.log('🗑️  削除予定の画像:');
  unusedImages.slice(0, 10).forEach((fileName, index) => {
    console.log(`  ${index + 1}. ${fileName}`);
  });
  if (unusedImages.length > 10) {
    console.log(`  ... 他 ${unusedImages.length - 10}枚`);
  }
  console.log('');
  
  // 画像を移動（削除）
  let successCount = 0;
  let errorCount = 0;
  
  unusedImages.forEach(fileName => {
    const sourcePath = path.join(IMAGES_DIR, fileName);
    const backupPath = path.join(BACKUP_DIR, fileName);
    
    try {
      if (fs.existsSync(sourcePath)) {
        // バックアップに移動
        fs.copyFileSync(sourcePath, backupPath);
        fs.unlinkSync(sourcePath);
        successCount++;
      }
    } catch (error) {
      console.error(`❌ ${fileName} の削除に失敗:`, error.message);
      errorCount++;
    }
  });
  
  // 結果を表示
  console.log('🎯 クリーンアップ完了!');
  console.log(`✅ 成功: ${successCount}枚`);
  console.log(`❌ 失敗: ${errorCount}枚`);
  console.log(`💾 バックアップ場所: ${BACKUP_DIR}`);
  
  // 残り画像数を表示
  const remainingImages = fs.readdirSync(IMAGES_DIR)
    .filter(file => file.endsWith('.webp'))
    .length;
  
  console.log(`\n📈 結果:`);
  console.log(`- 削除前: ${282}枚`);
  console.log(`- 削除後: ${remainingImages}枚`);
  console.log(`- 削減: ${282 - remainingImages}枚 (${((282 - remainingImages) / 282 * 100).toFixed(1)}%)`);
  
  // 復元方法を表示
  console.log(`\n💡 復元方法:`);
  console.log(`cp ${BACKUP_DIR}*.webp ${IMAGES_DIR}`);
}

function loadImageDataFromMapping(mappingData) {
  // マッピングデータから画像情報を再構築
  const imageData = [];
  
  // すべての画像ファイル名を収集
  for (let i = 0; i <= 281; i++) {
    const fileName = `meal-${String(i).padStart(4, '0')}.webp`;
    const filePath = path.join(IMAGES_DIR, fileName);
    
    if (fs.existsSync(filePath)) {
      // この画像がどのカテゴリに属するかを検索
      let category = 'other';
      let found = false;
      
      Object.entries(mappingData.byCategory || {}).forEach(([cat, files]) => {
        if (files.includes(fileName)) {
          category = cat;
          found = true;
        }
      });
      
      // マッピングに含まれていない画像は「その他」扱い
      imageData.push({
        fileName,
        category: found ? category : 'other'
      });
    }
  }
  
  return imageData;
}

// 実行前に確認を求める
console.log('⚠️  未使用画像の削除を開始します');
console.log('この操作により、「その他（使用しない）」に分類された画像がバックアップフォルダに移動されます\n');

// 実行
cleanupUnusedImages();