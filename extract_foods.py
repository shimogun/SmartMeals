import json

input_file = "smartmeals_batch_requests.jsonl"
output_file = "foods.txt"

food_list = []

try:
    with open(input_file, 'r', encoding='utf-8') as f:
        for line in f:
            # JSONLの各行を読み込む
            data = json.loads(line)
            # 以前のコードで "custom_id" に食材名を入れている、
            # あるいはプロンプトの先頭にある食材名を抽出します
            # ここでは custom_id を使うのが一番確実です
            food_name = data.get("custom_id", "").replace("meal-", "")
            
            if food_name:
                food_list.append(food_name)

    # 重複を除去して保存
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(",".join(food_list))

    print(f"✅ {len(food_list)} 件の食材を {output_file} に書き出しました！")

except FileNotFoundError:
    print(f"❌ {input_file} が見つかりません。")