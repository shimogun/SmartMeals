# 設定画面 本格実装 設計書

## 概要

SmartMeals 設定画面の未実装・プレースホルダー状態の機能を本格実装する。
現在の SettingsScreen.tsx（1,061行）をベースに、実際に動作する機能に昇格させる。

## スコープ

| # | 機能 | 状態 | 対応内容 |
|---|------|------|----------|
| 1 | プロフィール編集強化 | 名前・年齢のみ編集可 | 身長・体重・性別・活動量・HbA1cも編集可能に |
| 2 | ローカル通知リマインダー | トグルUIのみ | expo-notifications で毎日指定時刻に記録リマインダー送信 |
| 3 | データエクスポート | ボタンのみ | 血糖値・体重・献立データをCSV出力＋共有 |
| 4 | データクリア改善 | 単一確認ダイアログ | 二重確認（テキスト入力「削除」で確定） |
| 5 | プラポリ・利用規約 | ダミーリンク | expo-web-browser でURL表示 |
| 6 | フィードバック | プレースホルダー | expo-mail-composer でメール作成画面起動 |
| 7 | 食材カテゴリ共通化 | オンボーディング・設定で重複定義 | constants/foodCategories.ts に統合 |

## スコープ外

- ダークモード（別サイクル）
- 週間レポート通知（記録リマインダーのみ）
- クラウドバックアップ/復元
- マルチユーザー切り替え

## 技術選定

| 用途 | ライブラリ | 状態 |
|------|-----------|------|
| ローカル通知 | `expo-notifications` | 新規追加 |
| CSV書き出し | `expo-file-system` | インストール済み |
| ファイル共有 | `expo-sharing` | 新規追加 |
| メール作成 | `expo-mail-composer` | 新規追加 |
| URL表示 | `expo-web-browser` | インストール済み |
| リンク | `expo-linking` | インストール済み |

すべて `npx expo install` でインストール。

## 機能詳細

### 1. プロフィール編集強化

**現状**: 名前・年齢のみテキスト入力で編集可。身長・体重はフォームにあるが保存ロジックが不完全。性別・活動量の編集UIなし。

**対応**:
- 編集フォームに性別トグル（男性/女性）を追加
- 活動量セレクタ（軽い/普通/多い）を追加
- HbA1c入力フィールドを追加（オンボーディングStep 2と同等）
- `saveProfile()` で全フィールドを `healthData` に反映
- バリデーション: オンボーディングと同じ基準（身長100-250cm、体重20-300kg、HbA1c 3-20）

**変更ファイル**: `components/SettingsScreen.tsx`

### 2. ローカル通知リマインダー

**仕様**:
- 通知ON/OFFトグル（既存）+ リマインダー時刻設定（新規）
- デフォルト時刻: 20:00（夕食後の記録を促す）
- 通知内容: タイトル「SmartMeals」、本文「今日の血糖値・体重を記録しましょう」
- 毎日繰り返しスケジュール通知

**フロー**:
1. 通知トグルON → パーミッション要求
2. 許可された → 指定時刻でスケジュール登録
3. 時刻変更 → 既存スケジュールキャンセル → 新時刻で再登録
4. トグルOFF → スケジュールキャンセル

**データ保存**: `app_settings` に `reminderTime: string`（HH:mm形式）を追加

**変更ファイル**: `components/SettingsScreen.tsx`、新規 `services/notificationService.ts`

### 3. データエクスポート

**仕様**:
- 「データをエクスポート」ボタン押下 → CSV生成 → OS共有シート表示
- エクスポート対象:
  - 血糖値記録（日時、値、食事タイミング）
  - 週間記録（日付、体重、HbA1c、血圧）
  - 献立データ（日付、食事名、カロリー、糖質、たんぱく質、脂質）
- 各データを別CSVファイルとして生成、まとめて共有
- UTF-8 BOM付き（Excelでの日本語文字化け防止）

**フロー**:
1. ボタン押下 → ローディング表示
2. AsyncStorageから各データ取得
3. CSV文字列生成（ヘッダー行 + データ行）
4. `expo-file-system` でキャッシュディレクトリに書き出し
5. `expo-sharing` で共有シート表示

**新規ファイル**: `services/dataExportService.ts`
**変更ファイル**: `components/SettingsScreen.tsx`

### 4. データクリア改善

**現状**: `Alert.alert` で1回確認 → 全データ削除

**改善**:
1. 最初のAlert: 「本当にすべてのデータを削除しますか？この操作は取り消せません。」
2. 確認後、2回目のAlert: テキスト入力プロンプトで「削除」と入力させて確定
3. 削除実行 → オンボーディング画面にリダイレクト

**変更ファイル**: `components/SettingsScreen.tsx`

### 5. プラポリ・利用規約

**仕様**:
- プラポリ・利用規約のURLを定数化（当面はプレースホルダーURL）
- タップ → `expo-web-browser` の `openBrowserAsync()` でChrome Custom Tab表示
- URLが未設定の場合は「準備中です」アラート

**変更ファイル**: `components/SettingsScreen.tsx`

### 6. フィードバック

**仕様**:
- `expo-mail-composer` で作成画面起動
- プリセット:
  - 宛先: フィードバック用メールアドレス（定数、当面プレースホルダー）
  - 件名: 「SmartMeals フィードバック」
  - 本文テンプレート: アプリバージョン、デバイス情報を自動挿入
- メール送信不可の端末 → `isAvailableAsync()` チェック → Linkingで `mailto:` フォールバック

**変更ファイル**: `components/SettingsScreen.tsx`

### 7. 食材カテゴリ共通化

**現状**: `app/onboarding.tsx` と `components/SettingsScreen.tsx` で同じカテゴリ定義が重複。

**対応**:
- `constants/foodCategories.ts` を新規作成
- `FOOD_CATEGORIES` 定数をエクスポート
- オンボーディングと設定画面の両方からインポート

**新規ファイル**: `constants/foodCategories.ts`
**変更ファイル**: `app/onboarding.tsx`、`components/SettingsScreen.tsx`

## ファイル構成（変更・新規）

```
SmartMeals/
├── constants/
│   └── foodCategories.ts          ← 新規: 食材カテゴリ定数
├── services/
│   ├── notificationService.ts     ← 新規: 通知スケジュール管理
│   └── dataExportService.ts       ← 新規: CSVエクスポート
├── components/
│   └── SettingsScreen.tsx         ← 修正: 全機能実装
└── app/
    └── onboarding.tsx             ← 修正: 食材カテゴリをimportに変更
```

## 実装順序

1. 食材カテゴリ共通化（依存なし、他の作業のベース）
2. プロフィール編集強化（UI変更のみ、ライブラリ不要）
3. プラポリ・利用規約（既存ライブラリで即実装可）
4. フィードバック（expo-mail-composer 追加後に実装）
5. データエクスポート（expo-sharing 追加後に実装）
6. データクリア改善（UI変更のみ）
7. ローカル通知リマインダー（expo-notifications 追加、パーミッション処理あり、最も複雑）
