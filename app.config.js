const IS_DEV = process.env.APP_VARIANT === 'development';

// .envファイルから環境変数を明示的に読み込み
require('dotenv').config();

export default {
  expo: {
    name: 'SmartMeals',
    slug: 'smartmeals',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'myapp',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/images/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: [
      '**/*'
    ],
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff'
      }
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
      themeColor: '#00BCD4',
      backgroundColor: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      startUrl: '/',
      shortName: 'SmartMeals',
      lang: 'ja',
      scope: '/',
      crossorigin: 'use-credentials'
    },
    plugins: [
      'expo-router',
      'expo-font'
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      // セキュアな環境変数設定
      openaiApiKey: process.env.OPENAI_API_KEY,
    }
  }
};