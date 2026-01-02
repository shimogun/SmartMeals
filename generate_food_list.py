import os

# --- 設定：SmartMeals スタイルプロンプト ---
# 修正版：お皿全体を収め、余白をより極端な引きにするスタイル
STYLE_PROMPT = (
    "zoom out, high angle view, a single small dinner plate isolated in the center, "
    "significant white margin on all sides, 30% empty white space around the plate, "
    "the plate does not touch the edges, minimalist flat lay, pure white background, "
    "professional clean photography."
)

# --- 食材・調理法の定義（ここを増やすと組み合わせが倍増します） ---
main_dishes = [
    {"name": "chicken breast", "methods": ["grilled herb", "steamed", "stir-fry", "honey mustard"]},
    {"name": "salmon fillet", "methods": ["salt-grilled", "meuniere", "teriyaki", "lemon poached"]},
    {"name": "pork tenderloin", "methods": ["ginger soy", "shabu-shabu style", "garlic roast"]},
    {"name": "mackerel", "methods": ["salt-grilled", "miso-simmered", "curry flavored"]},
    {"name": "tofu", "methods": ["mapo style", "steak with mushrooms", "hiyayakko style"]},
    {"name": "white fish", "methods": ["boiled with soy", "steamed with lemon", "pan-seared"]},
    {"name": "beef lean cut", "methods": ["steak", "shabu-shabu", "red wine braised"]},
    # --- ここから追加分 ---
    {"name": "shrimp", "methods": ["garlic sauteed", "chili sauce", "boiled with herbs"]},
    {"name": "chicken thigh", "methods": ["teriyaki", "roasted with rosemary", "soy ginger braised"]},
    {"name": "cod fillet", "methods": ["steamed with ginger", "panko crusted", "miso marinated"]},
    {"name": "atsuage (fried tofu)", "methods": ["grilled with soy sauce", "simmered with vegetables"]},
    {"name": "scallops", "methods": ["butter seared", "lemon herb grilled"]}
]

side_dishes = [
    "steamed broccoli", "shredded cabbage", "spinach sesame salad", 
    "hijiki seaweed salad", "cherry tomatoes", "grilled asparagus", 
    "mashed pumpkin", "pickled cucumber",
    # --- ここから追加分 ---
    "sauteed mushrooms", "snap peas with salt", "sweet corn", 
    "roasted cauliflower", "kinpira burdock root"
]

def generate_optimized_list(filename, limit=1000):
    entries = []
    count = 0

    # 組み合わせを生成
    for main in main_dishes:
        for method in main['methods']:
            for side in side_dishes:
                if count >= limit:
                    break
                
                # IDとレシピ名の組み合わせ
                # 例: meal-0001 | grilled herb chicken breast with steamed broccoli
                recipe_name = f"{method} {main['name']} with {side}"
                entry = f"meal-{count:04d}|{recipe_name}"
                entries.append(entry)
                count += 1

    # ファイル書き出し
    with open(filename, 'w', encoding='utf-8') as f:
        for line in entries:
            f.write(line + '\n')
            
    print(f"✅ {count}件のリストを {filename} に作成しました。")
    print(f"💡 各行の形式: ID|プロンプト")

# 実行
generate_optimized_list("foods_list.txt", limit=300)