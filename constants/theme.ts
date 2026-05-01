/**
 * StudyBloom Theme Colors
 * A cute, pastel-themed color palette for the student support app.
 */

import { Platform } from 'react-native';

// StudyBloom Brand Colors
export const StudyBloomColors = {
  primary: '#D81B60',      // Pink/Magenta - main brand color
  secondary: '#9C27B0',    // Purple - accent color
  tertiary: '#FF80AB',     // Light pink - highlights
  neutral: '#F3E5F5',      // Very light pink/lavender - backgrounds
  white: '#FFFFFF',
  black: '#1A1A1A',
  gray: '#666666',
  lightGray: '#E0E0E0',
  error: '#FF5252',
  success: '#4CAF50',
  warning: '#FF9800',
};

export const Colors = {
  light: {
    text: '#1A1A1A',
    textSecondary: '#666666',
    background: '#FFFFFF',
    backgroundSecondary: '#F3E5F5',
    tint: '#D81B60',
    primary: '#D81B60',
    secondary: '#9C27B0',
    tertiary: '#FF80AB',
    neutral: '#F3E5F5',
    icon: '#9C27B0',
    tabIconDefault: '#9C27B0',
    tabIconSelected: '#D81B60',
    border: '#E0E0E0',
    card: '#FFFFFF',
    inputBackground: '#F3E5F5',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    background: '#1A1A2E',
    backgroundSecondary: '#2D2D44',
    tint: '#FF80AB',
    primary: '#D81B60',
    secondary: '#9C27B0',
    tertiary: '#FF80AB',
    neutral: '#2D2D44',
    icon: '#FF80AB',
    tabIconDefault: '#B0B0B0',
    tabIconSelected: '#FF80AB',
    border: '#3D3D5C',
    card: '#2D2D44',
    inputBackground: '#2D2D44',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
