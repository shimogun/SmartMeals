export const Colors = {
  light: {
    // 基本
    text: '#333',
    textSecondary: '#666',
    textMuted: '#999',
    background: '#f5f5f5',
    surface: '#fff',
    border: '#e0e0e0',
    borderLight: '#f0f0f0',

    // ブランド
    primary: '#007AFF',
    primaryDark: '#0056CC',
    accent: '#4CAF50',

    // カード
    card: '#fff',
    cardShadow: '#000',

    // 入力
    inputBg: '#fafafa',
    inputBorder: '#ddd',
    placeholder: '#999',

    // タブ
    tabIconDefault: '#ccc',
    tabIconSelected: '#007AFF',
    tabBg: '#fff',

    // セクション
    sectionBg: '#f0f0f0',

    // ステータス
    success: '#4CAF50',
    successBg: '#E8F5E9',
    warning: '#FF9800',
    danger: '#F44336',
    dangerBg: '#FFEBEE',

    // チャート
    chartLine: 'rgba(33, 150, 243, 1)',
    chartDot: '#2196F3',
    chartLabel: 'rgba(102, 102, 102, 1)',
    chartBg: '#fff',
  },
  dark: {
    // 基本
    text: '#E0E0E0',
    textSecondary: '#AAAAAA',
    textMuted: '#777',
    background: '#121212',
    surface: '#1E1E1E',
    border: '#333',
    borderLight: '#2A2A2A',

    // ブランド
    primary: '#4A9EFF',
    primaryDark: '#3A8EEF',
    accent: '#66BB6A',

    // カード
    card: '#1E1E1E',
    cardShadow: '#000',

    // 入力
    inputBg: '#2A2A2A',
    inputBorder: '#444',
    placeholder: '#666',

    // タブ
    tabIconDefault: '#666',
    tabIconSelected: '#4A9EFF',
    tabBg: '#1E1E1E',

    // セクション
    sectionBg: '#2A2A2A',

    // ステータス
    success: '#66BB6A',
    successBg: '#1B3A1B',
    warning: '#FFB74D',
    danger: '#EF5350',
    dangerBg: '#3E1A1A',

    // チャート
    chartLine: 'rgba(74, 158, 255, 1)',
    chartDot: '#4A9EFF',
    chartLabel: 'rgba(170, 170, 170, 1)',
    chartBg: '#1E1E1E',
  },
};

export type ThemeColors = typeof Colors.light;

export default Colors;
