/**
 * 画像マッピング確認・修正ツール
 * 282枚の画像を効率的に分類するためのインタラクティブツール
 */

const fs = require('fs');
const path = require('path');

// ベース料理カテゴリの定義
const CATEGORIES = {
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
  
  // 肉野菜組み合わせ料理（★重要★）
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
  soup_vegetable: '野菜スープ',
  
  other: 'その他（使用しない）'
};

const imagePath = './assets/images/meals/';

/**
 * 画像一覧を生成
 */
function generateImageList() {
  const images = [];
  for (let i = 0; i <= 281; i++) {
    const fileName = `meal-${String(i).padStart(4, '0')}.webp`;
    const fullPath = path.join(imagePath, fileName);
    
    if (fs.existsSync(fullPath)) {
      images.push({
        id: String(i).padStart(4, '0'),
        fileName: fileName,
        path: fullPath,
        category: null,
        checked: false
      });
    }
  }
  return images;
}

/**
 * マッピング結果をHTMLで表示
 */
function generateHTML(images) {
  const categoryOptions = Object.entries(CATEGORIES)
    .map(([key, name]) => `<option value="${key}">${name}</option>`)
    .join('');

  const imageCards = images.map(img => `
    <div class="image-card" data-id="${img.id}">
      <img src="./assets/images/meals/${img.fileName}" alt="${img.fileName}" />
      <div class="image-info">
        <h3>${img.fileName}</h3>
        <select class="category-select" data-id="${img.id}">
          <option value="">カテゴリを選択...</option>
          ${categoryOptions}
        </select>
        <label class="checked-label">
          <input type="checkbox" class="checked-box" data-id="${img.id}">
          確認済み
        </label>
      </div>
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <title>SmartMeals 画像マッピングツール</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .controls { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 8px; }
    .button { padding: 10px 15px; margin: 5px; border: none; border-radius: 4px; cursor: pointer; }
    .button.primary { background: #007AFF; color: white; }
    .button.secondary { background: #8E8E93; color: white; }
    .filters { margin: 10px 0; }
    .filter-button { padding: 5px 10px; margin: 2px; border: 1px solid #ddd; background: white; cursor: pointer; }
    .filter-button.active { background: #007AFF; color: white; }
    
    .image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
    .image-card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; background: white; }
    .image-card.checked { border-color: #34C759; background-color: #f0fff0; }
    .image-card img { width: 100%; height: 200px; object-fit: cover; border-radius: 4px; }
    .image-info { margin-top: 10px; }
    .image-info h3 { margin: 0 0 10px 0; font-size: 14px; }
    .category-select { width: 100%; padding: 5px; margin-bottom: 10px; }
    .checked-label { display: block; margin-top: 10px; }
    
    .progress { background: #f0f0f0; border-radius: 10px; padding: 3px; margin: 10px 0; }
    .progress-bar { background: #007AFF; height: 20px; border-radius: 7px; transition: width 0.3s; }
    .stats { display: flex; gap: 20px; margin: 10px 0; }
    .stat { padding: 10px; background: white; border-radius: 4px; border: 1px solid #ddd; }
  </style>
</head>
<body>
  <h1>SmartMeals 画像マッピングツール</h1>
  
  <div class="controls">
    <div class="stats">
      <div class="stat">総画像数: <span id="total-count">${images.length}</span></div>
      <div class="stat">確認済み: <span id="checked-count">0</span></div>
      <div class="stat">未確認: <span id="unchecked-count">${images.length}</span></div>
    </div>
    
    <div class="progress">
      <div class="progress-bar" id="progress-bar" style="width: 0%"></div>
    </div>
    
    <div class="filters">
      <button class="filter-button active" onclick="filterImages('all')">すべて</button>
      <button class="filter-button" onclick="filterImages('unchecked')">未確認のみ</button>
      <button class="filter-button" onclick="filterImages('checked')">確認済みのみ</button>
      ${Object.entries(CATEGORIES).map(([key, name]) => 
        `<button class="filter-button" onclick="filterImages('${key}')">${name}</button>`
      ).join('')}
    </div>
    
    <button class="button primary" onclick="exportMapping()">マッピングデータをエクスポート</button>
    <button class="button secondary" onclick="resetAll()">すべてリセット</button>
  </div>

  <div class="image-grid" id="image-grid">
    ${imageCards}
  </div>

  <script>
    let imageData = ${JSON.stringify(images)};
    
    // ローカルストレージから保存されたデータを読み込み
    function loadSavedData() {
      const saved = localStorage.getItem('smartmeals-image-mapping');
      if (saved) {
        const savedData = JSON.parse(saved);
        imageData = imageData.map(img => ({
          ...img,
          ...(savedData.find(s => s.id === img.id) || {})
        }));
        updateUI();
      }
    }
    
    // データをローカルストレージに保存
    function saveData() {
      localStorage.setItem('smartmeals-image-mapping', JSON.stringify(imageData));
    }
    
    // UI更新
    function updateUI() {
      imageData.forEach(img => {
        const card = document.querySelector('[data-id="' + img.id + '"]');
        if (card) {
          const select = card.querySelector('.category-select');
          const checkbox = card.querySelector('.checked-box');
          
          select.value = img.category || '';
          checkbox.checked = img.checked || false;
          card.classList.toggle('checked', img.checked);
        }
      });
      updateStats();
    }
    
    // 統計更新
    function updateStats() {
      const checked = imageData.filter(img => img.checked).length;
      const unchecked = imageData.length - checked;
      const progress = (checked / imageData.length * 100).toFixed(1);
      
      document.getElementById('checked-count').textContent = checked;
      document.getElementById('unchecked-count').textContent = unchecked;
      document.getElementById('progress-bar').style.width = progress + '%';
    }
    
    // フィルター
    function filterImages(filter) {
      const cards = document.querySelectorAll('.image-card');
      document.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');
      
      cards.forEach(card => {
        const id = card.dataset.id;
        const img = imageData.find(i => i.id === id);
        let show = true;
        
        switch(filter) {
          case 'all':
            show = true;
            break;
          case 'checked':
            show = img.checked;
            break;
          case 'unchecked':
            show = !img.checked;
            break;
          default:
            show = img.category === filter;
        }
        
        card.style.display = show ? 'block' : 'none';
      });
    }
    
    // マッピングデータをエクスポート
    function exportMapping() {
      const mapping = {};
      const byCategory = {};
      
      imageData.forEach(img => {
        if (img.category && img.category !== 'other') {
          if (!byCategory[img.category]) byCategory[img.category] = [];
          byCategory[img.category].push(img.fileName);
        }
      });
      
      // 各カテゴリから最も適切な画像を1枚選択（最初の画像を使用）
      Object.entries(byCategory).forEach(([category, files]) => {
        mapping[category] = files[0];
      });
      
      const output = {
        mapping,
        byCategory,
        stats: {
          total: imageData.length,
          checked: imageData.filter(img => img.checked).length,
          categorized: imageData.filter(img => img.category && img.category !== 'other').length
        }
      };
      
      const blob = new Blob([JSON.stringify(output, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'smartmeals-image-mapping.json';
      a.click();
    }
    
    // リセット
    function resetAll() {
      if (confirm('すべてのデータをリセットしますか？')) {
        imageData = imageData.map(img => ({...img, category: null, checked: false}));
        localStorage.removeItem('smartmeals-image-mapping');
        updateUI();
      }
    }
    
    // イベントリスナー
    document.addEventListener('change', function(e) {
      if (e.target.classList.contains('category-select')) {
        const id = e.target.dataset.id;
        const img = imageData.find(i => i.id === id);
        img.category = e.target.value;
        saveData();
      }
      
      if (e.target.classList.contains('checked-box')) {
        const id = e.target.dataset.id;
        const img = imageData.find(i => i.id === id);
        img.checked = e.target.checked;
        e.target.closest('.image-card').classList.toggle('checked', e.target.checked);
        saveData();
        updateStats();
      }
    });
    
    // 初期化
    loadSavedData();
  </script>
</body>
</html>
  `;
}

// HTMLファイルを生成
const images = generateImageList();
const html = generateHTML(images);

fs.writeFileSync('./image-mapping-tool.html', html);
console.log('✅ 画像マッピングツールを生成しました: image-mapping-tool.html');
console.log(`📊 対象画像数: ${images.length}枚`);
console.log('');
console.log('使い方:');
console.log('1. image-mapping-tool.htmlをブラウザで開く');
console.log('2. 各画像を確認してカテゴリを選択');
console.log('3. 確認済みチェックボックスをON');
console.log('4. "マッピングデータをエクスポート"でJSONファイルを保存');
console.log('5. 生成されたJSONを使ってimageMapを更新');