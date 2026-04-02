import { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';
import Colors, { ThemeColors } from '../constants/Colors';

export function useThemeColors(): ThemeColors {
  const { isDark } = useContext(ThemeContext);
  return isDark ? Colors.dark : Colors.light;
}

export function useIsDark(): boolean {
  const { isDark } = useContext(ThemeContext);
  return isDark;
}
