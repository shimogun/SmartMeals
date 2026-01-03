import React, { useState, useEffect } from 'react';
import { 
  View, 
  Image, 
  ActivityIndicator, 
  Text, 
  StyleSheet, 
  Alert 
} from 'react-native';
import imageGenerationService from '../services/imageGenerationService';
import { hasStaticImage, getStaticImageSource, hasBaseMealImage, getBaseMealImageSource } from '../assets/images/meals/imageMap';
import mealNormalizationService from '../services/mealNormalizationService';
import externalFoodImageService from '../services/externalFoodImageService';

interface HybridMealImageProps {
  mealId: string;
  mealName: string;
  style?: any;
  width?: number;
  height?: number;
  showLoadingText?: boolean;
}

interface ImageState {
  status: 'loading' | 'static' | 'cached' | 'external' | 'generating' | 'generated' | 'error';
  uri?: string;
  error?: string;
  source?: string;
}

export default function HybridMealImage({ 
  mealId, 
  mealName, 
  style, 
  width = 200, 
  height = 200,
  showLoadingText = true
}: HybridMealImageProps) {
  const [imageState, setImageState] = useState<ImageState>({ status: 'loading' });

  useEffect(() => {
    loadImage();
  }, [mealId, mealName]);

  const loadImage = async () => {
    try {
      setImageState({ status: 'loading' });

      // 1. 料理名を標準化してベース画像をチェック
      const baseMealId = mealNormalizationService.getMealImageId(mealName);
      console.log(`🔍 画像検索: ${mealName} → ${baseMealId}`);
      
      if (hasBaseMealImage(baseMealId)) {
        const staticImageSource = getBaseMealImageSource(baseMealId);
        console.log(`✅ 静的画像見つかりました: ${baseMealId}`);
        setImageState({ status: 'static', uri: staticImageSource });
        return;
      }

      // 2. 後方互換性: 従来のmealIdで静的アセットをチェック
      if (hasStaticImage(mealId)) {
        const staticImageSource = getStaticImageSource(mealId);
        console.log(`✅ 従来ID画像見つかりました: ${mealId}`);
        setImageState({ status: 'static', uri: staticImageSource });
        return;
      }

      // 3. 標準化されたIDでローカルキャッシュをチェック
      let cachedPath = await imageGenerationService.checkLocalImageExists(baseMealId);
      if (cachedPath) {
        console.log(`✅ キャッシュ画像見つかりました: ${baseMealId}`);
        setImageState({ status: 'cached', uri: cachedPath });
        return;
      }

      // 4. 従来のmealIdでローカルキャッシュをチェック
      cachedPath = await imageGenerationService.checkLocalImageExists(mealId);
      if (cachedPath) {
        console.log(`✅ 従来IDキャッシュ画像見つかりました: ${mealId}`);
        setImageState({ status: 'cached', uri: cachedPath });
        return;
      }

      // 5. 外部APIで料理画像を検索
      console.log(`🌐 外部API検索開始: ${mealName}`);
      const externalImage = await externalFoodImageService.searchFoodImage(mealName);
      if (externalImage) {
        console.log(`✅ 外部API画像取得成功: ${mealName} (${externalImage.source})`);
        setImageState({ 
          status: 'external', 
          uri: externalImage.url,
          source: externalImage.source 
        });
        return;
      }

      // 6. 画像が見つからない場合のフォールバック
      console.log(`⚠️ すべての検索で画像が見つかりません: ${mealName} (${baseMealId})`);
      
      // デフォルト画像を表示
      setImageState({ 
        status: 'error', 
        error: `${mealName} の画像が見つかりません` 
      });

    } catch (error) {
      console.error('画像読み込みエラー:', error);
      setImageState({ 
        status: 'error', 
        error: error instanceof Error ? error.message : '画像の読み込みに失敗しました'
      });
    }
  };


  /**
   * スケルトンスクリーンコンポーネント
   */
  const SkeletonScreen = () => (
    <View style={[styles.skeletonContainer, { width, height }]}>
      <View style={[styles.skeletonImage, { height: height - 60 }]} />
      <View style={styles.skeletonTextContainer}>
        <View style={styles.skeletonTextLong} />
        <View style={styles.skeletonTextShort} />
      </View>
    </View>
  );

  /**
   * ローディング表示コンポーネント
   */
  const LoadingDisplay = ({ message }: { message: string }) => (
    <View style={[styles.loadingContainer, { width, height }]}>
      <ActivityIndicator size="large" color="#007AFF" />
      {showLoadingText && (
        <Text style={styles.loadingText}>{message}</Text>
      )}
    </View>
  );

  /**
   * エラー表示コンポーネント
   */
  const ErrorDisplay = ({ error }: { error: string }) => (
    <View style={[styles.errorContainer, { width, height }]}>
      <Text style={styles.errorIcon}>🍽️</Text>
      <Text style={styles.errorText}>画像準備中</Text>
    </View>
  );

  // 状態に応じて表示を切り替え
  switch (imageState.status) {
    case 'loading':
      return <SkeletonScreen />;

    case 'generating':
      return <LoadingDisplay message="AI画像を生成中..." />;

    case 'static':
    case 'cached':
    case 'external':
    case 'generated':
      if (!imageState.uri) {
        return <ErrorDisplay error="画像URIが取得できませんでした" />;
      }
      
      return (
        <View style={[styles.imageContainer, { width, height }, style]}>
          <Image
            source={
              imageState.status === 'static' 
                ? imageState.uri  // 静的画像の場合はrequire()の結果をそのまま使用
                : { uri: imageState.uri }  // 動的画像・外部画像の場合はuri形式
            }
            style={[styles.image, { width, height }]}
            resizeMode="contain"
            onError={(error) => {
              console.error('Image load error:', error);
              setImageState({ 
                status: 'error', 
                error: '画像の表示に失敗しました' 
              });
            }}
          />
          {false && (
            <View style={styles.debugBadge}>
              <Text style={styles.debugText}>
                {imageState.status === 'static' ? 'Static' : 
                 imageState.status === 'cached' ? 'Cached' : 'Generated'}
              </Text>
              <Text style={styles.debugTextSmall}>
                {mealNormalizationService.getMealImageId(mealName)}
              </Text>
            </View>
          )}
        </View>
      );

    case 'error':
      return <ErrorDisplay error={imageState.error || '不明なエラー'} />;

    default:
      return <ErrorDisplay error="不明な状態です" />;
  }
}

const styles = StyleSheet.create({
  imageContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    borderRadius: 8,
  },
  loadingContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  errorDetail: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 8,
  },
  skeletonContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  skeletonImage: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonTextContainer: {
    height: 40,
    justifyContent: 'space-between',
  },
  skeletonTextLong: {
    height: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    width: '80%',
  },
  skeletonTextShort: {
    height: 14,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    width: '60%',
  },
  debugBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  debugText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  debugTextSmall: {
    color: '#fff',
    fontSize: 8,
    marginTop: 1,
  },
});