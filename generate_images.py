import requests
import os
import time

# --- 設定 ---
API_KEY = "sk-wHfyuxDPFx2Dhn8prDnu2c4p66GHhJP6uQeI0E8VmlDsdg7F"
INPUT_FILE = "foods_list.txt"  # generate_food_list.pyで作ったリスト
OUTPUT_DIR = "./assets/images/meals" # 整理したmealsフォルダ
MODEL_URL = "https://api.stability.ai/v2beta/stable-image/generate/sd3"

# フォルダがない場合は自動作成
os.makedirs(OUTPUT_DIR, exist_ok=True)

# リストの読み込み
try:
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        lines = f.readlines()
except FileNotFoundError:
    print(f"❌ {INPUT_FILE} が見つかりません。先に generate_food_list.py を実行してください。")
    exit()

print(f"🚀 合計 {len(lines)} 件の生成を開始します...")

# 画像を生成
for line in lines:
    if "|" not in line:
        continue
    
    # IDとプロンプトに分割 (例: meal-0000|grilled herb chicken...)
    meal_id, prompt = line.strip().split("|")
    filename = f"{meal_id}.webp"
    save_path = os.path.join(OUTPUT_DIR, filename)

    # 重複チェック（すでにファイルがあればスキップ）
    if os.path.exists(save_path):
        print(f"⏩ スキップ: {meal_id} は既に存在します")
        continue

    print(f"📦 生成中: {meal_id}...")
    
    response = requests.post(
        MODEL_URL,
        headers={
            "authorization": f"Bearer {API_KEY}",
            "accept": "image/*"
        },
        files={"none": ""},
        data={
            "prompt": prompt,
            "model": "sd3-medium", # ここをMediumに指定（3.5クレジット消費）
            "output_format": "webp",
            "aspect_ratio": "1:1"
        },
    )

    if response.status_code == 200:
        with open(save_path, "wb") as f:
            f.write(response.content)
        print(f"✅ 保存完了: {save_path}")
        # API制限を考慮して1秒待機
        time.sleep(1)
    else:
        error_msg = response.json()
        print(f"❌ エラー ({meal_id}): {error_msg}")
        # クレジット不足の場合はループを抜ける
        if "insufficient_balance" in str(error_msg):
            print("💰 クレジットが不足しています。チャージが必要です。")
            break

print("\n--- すべての処理が終了しました ---")