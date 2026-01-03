import * as FileSystem from 'expo-file-system/legacy';

interface StabilityAIConfig {
  apiKey: string;
  apiUrl: string;
}

interface ImageGenerationOptions {
  mealName: string;
  mealId: string;
  style?: string;
  quality?: 'draft' | 'standard' | 'premium';
}

class ImageGenerationService {
  private config: StabilityAIConfig;

  constructor() {
    this.config = {
      apiKey: process.env.STABILITY_AI_API_KEY || '',
      apiUrl: 'https://api.stability.ai/v1/generation/stable-diffusion-v1-6/text-to-image'
    };
  }

  /**
   * 料理画像を生成してローカルディレクトリに保存
   */
  async generateMealImage(options: ImageGenerationOptions): Promise<string> {
    try {
      const { mealName, mealId } = options;
      const fileName = `meal-${mealId.padStart(4, '0')}.webp`;
      const localPath = `${FileSystem.documentDirectory}meals/${fileName}`;

      // ディレクトリが存在しない場合は作成
      const mealsDir = `${FileSystem.documentDirectory}meals/`;
      const dirInfo = await FileSystem.getInfoAsync(mealsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(mealsDir, { intermediates: true });
      }

      // プロンプト生成
      const prompt = this.createMealPrompt(mealName);
      
      // デバッグ用プロンプト出力
      console.log(`🎨 画像生成プロンプト (${mealName}):`, prompt);
      
      // Stability AI API呼び出し
      const imageBase64 = await this.callStabilityAPI(prompt);
      
      // Base64をファイルに保存
      await FileSystem.writeAsStringAsync(localPath, imageBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log(`画像を生成・保存しました: ${localPath}`);
      return localPath;

    } catch (error) {
      console.error('画像生成エラー:', error);
      throw new Error(`画像生成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }

  /**
   * 料理名から適切なプロンプトを生成
   * 糖尿病向け料理画像の品質基準に従った詳細なプロンプト
   */
  private createMealPrompt(mealName: string): string {
    // 基本プロンプト
    let prompt = `A beautifully plated ${mealName}, professional food photography, clean white background, well-lit, appetizing, healthy meal, high quality, detailed, restaurant style presentation, top view, centered composition`;
    
    // 料理カテゴリ別の特化指示
    const categorySpecific = this.getCategorySpecificInstructions(mealName);
    if (categorySpecific) {
      prompt += ', ' + categorySpecific;
    }
    
    // 糖尿病向け料理画像の品質基準
    const qualityStandards = [
      // 卵料理の制約
      'no omurice style egg wrapping',
      'simple egg preparation without wrapping other ingredients',
      
      // 魚料理の制約
      'fish should be filleted or opened flat, not whole fish',
      'fish cooked to medium doneness with visible grill marks',
      'no rare or raw appearance on fish',
      'fish should be clearly identifiable as fish',
      
      // 肉料理の制約  
      'meat cooked to medium doneness, not rare',
      'beef should show medium cooked interior, not red raw center',
      'meat should be sliced or cut to show cross-section',
      'no whole roasted meat, show cut portions',
      'meat should be clearly identifiable as meat',
      
      // 野菜と付け合わせの制約
      'no cucumber as garnish or side vegetable',
      'vegetables should not hide the main protein (meat or fish)',
      'ingredients should be moderately sized, not oversized',
      'vegetables should complement, not cover the main dish',
      
      // 調味料の制約
      'no heavy sauces or thick glazes on top',
      'only natural cooking juices or light seasoning',
      'no sauce drizzling or thick sauce coating',
      
      // 視覚的判別の要求
      'main protein should be clearly visible and identifiable',
      'clear distinction between meat and fish if present',
      'well-balanced composition showing all ingredients clearly'
    ];
    
    // プロンプトに品質基準を追加
    prompt += ', ' + qualityStandards.join(', ');
    
    // 禁止事項を明示
    prompt += ', no text, no watermark, no whole fish, no rare meat, no cucumber garnish, no heavy sauces';
    
    return prompt;
  }

  /**
   * 料理カテゴリ別の特化指示を取得
   */
  private getCategorySpecificInstructions(mealName: string): string {
    const lowerMealName = mealName.toLowerCase();
    
    // 魚料理の特化指示
    if (lowerMealName.includes('fish') || lowerMealName.includes('魚') || 
        lowerMealName.includes('鮭') || lowerMealName.includes('さば') || 
        lowerMealName.includes('あじ') || lowerMealName.includes('鯛') ||
        lowerMealName.includes('ひらめ') || lowerMealName.includes('かれい')) {
      return 'fish fillet opened flat showing the flesh, properly grilled with char marks, medium cooked, no whole fish presentation, fish skin visible on one side';
    }
    
    // 肉料理の特化指示
    if (lowerMealName.includes('meat') || lowerMealName.includes('肉') ||
        lowerMealName.includes('chicken') || lowerMealName.includes('鶏') ||
        lowerMealName.includes('pork') || lowerMealName.includes('豚') ||
        lowerMealName.includes('beef') || lowerMealName.includes('牛')) {
      return 'meat cut in slices showing cross-section, medium cooked interior, no rare red center, properly seared exterior, meat texture clearly visible';
    }
    
    // 卵料理の特化指示
    if (lowerMealName.includes('egg') || lowerMealName.includes('卵')) {
      return 'simple egg preparation, no wrapping style, clearly visible egg texture, traditional Japanese tamagoyaki style if applicable';
    }
    
    // 野菜料理の特化指示
    if (lowerMealName.includes('vegetable') || lowerMealName.includes('野菜')) {
      return 'vegetables cut in appropriate sizes, not oversized, showing natural colors, minimal seasoning visible';
    }
    
    // 肉野菜組み合わせの特化指示
    if (lowerMealName.includes('stirfry') || lowerMealName.includes('炒め') ||
        (lowerMealName.includes('meat') && lowerMealName.includes('vegetable'))) {
      return 'meat and vegetables clearly distinguishable, meat pieces showing cross-section, vegetables not covering the meat, balanced composition';
    }
    
    return '';
  }

  /**
   * Stability AI APIを呼び出して画像を生成
   */
  private async callStabilityAPI(prompt: string): Promise<string> {
    if (!this.config.apiKey) {
      // APIキーが設定されていない場合はダミー画像を返す（開発用）
      return await this.generateDummyImage();
    }

    const response = await fetch(this.config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        text_prompts: [
          {
            text: prompt,
            weight: 1
          }
        ],
        cfg_scale: 7,
        height: 512,
        width: 512,
        samples: 1,
        steps: 30,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Stability AI API エラー: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    
    if (!responseData.artifacts || responseData.artifacts.length === 0) {
      throw new Error('API から画像データが返されませんでした');
    }

    return responseData.artifacts[0].base64;
  }

  /**
   * 開発用のダミー画像を生成（単色の正方形）
   */
  private async generateDummyImage(): Promise<string> {
    // 1x1のピクセル透明PNGのBase64
    const transparentPixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    return transparentPixel;
  }

  /**
   * ローカルキャッシュディレクトリ内の画像ファイルが存在するかチェック
   */
  async checkLocalImageExists(mealId: string): Promise<string | null> {
    try {
      const fileName = `meal-${mealId.padStart(4, '0')}.webp`;
      const localPath = `${FileSystem.documentDirectory}meals/${fileName}`;
      
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      
      if (fileInfo.exists) {
        return localPath;
      }
      
      return null;
    } catch (error) {
      console.error('ローカル画像チェックエラー:', error);
      return null;
    }
  }

}

// シングルトンインスタンス
const imageGenerationService = new ImageGenerationService();
export default imageGenerationService;

// 型定義をエクスポート
export type { ImageGenerationOptions };