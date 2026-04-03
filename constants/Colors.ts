export const Colors = {
  light: {
    // 基本
    text: '#2D3A2E',
    textSecondary: '#5F6B5E',
    textMuted: '#9CA898',
    background: '#F6F9F7',
    surface: '#FFFFFF',
    border: '#E2EAE4',
    borderLight: '#EEF3EF',

    // ブランド
    primary: '#6BBF8A',
    primaryDark: '#4DA870',
    accent: '#6BBF8A',

    // カード
    card: '#FFFFFF',
    cardShadow: '#3A5A40',

    // 入力
    inputBg: '#F0F5F1',
    inputBorder: '#D5DFD7',
    placeholder: '#9CA898',

    // タブ
    tabIconDefault: '#B8C4B8',
    tabIconSelected: '#6BBF8A',
    tabBg: '#FFFFFF',

    // セクション
    sectionBg: '#EEF4EF',

    // ステータス
    success: '#6BBF8A',
    successBg: '#E8F5EE',
    warning: '#F0B060',
    danger: '#E07070',
    dangerBg: '#FDEEEE',

    // チャート
    chartLine: 'rgba(107, 191, 138, 1)',
    chartDot: '#6BBF8A',
    chartLabel: 'rgba(95, 107, 94, 1)',
    chartBg: '#FFFFFF',
  },
  dark: {
    // 基本
    text: '#DEE8DF',
    textSecondary: '#A3B2A4',
    textMuted: '#6E7E6F',
    background: '#0F1610',
    surface: '#1A231B',
    border: '#2A382B',
    borderLight: '#222E23',

    // ブランド
    primary: '#7DCCA0',
    primaryDark: '#5FB882',
    accent: '#7DCCA0',

    // カード
    card: '#1A231B',
    cardShadow: '#000',

    // 入力
    inputBg: '#222E23',
    inputBorder: '#344536',
    placeholder: '#6E7E6F',

    // タブ
    tabIconDefault: '#4E5E4F',
    tabIconSelected: '#7DCCA0',
    tabBg: '#1A231B',

    // セクション
    sectionBg: '#222E23',

    // ステータス
    success: '#7DCCA0',
    successBg: '#1A2E1E',
    warning: '#F0C070',
    danger: '#E88080',
    dangerBg: '#2E1A1A',

    // チャート
    chartLine: 'rgba(125, 204, 160, 1)',
    chartDot: '#7DCCA0',
    chartLabel: 'rgba(163, 178, 164, 1)',
    chartBg: '#1A231B',
  },
};

export type ThemeColors = typeof Colors.light;

export default Colors;
