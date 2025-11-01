const colors = {
  primary: '#2563eb',
  primaryDark: '#1e40af',
  secondary: '#10b981',
  secondaryDark: '#059669',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  background: '#ffffff',
  surface: '#f8fafc',
  surfaceAlt: '#f1f5f9',
  text: '#0f172a',
  textSecondary: '#475569',
  textTertiary: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  white: '#ffffff',
  excellent: '#22c55e',
  good: '#10b981',
  needsWork: '#ef4444',
};

const tintColorLight = colors.primary;

export default {
  light: {
    text: colors.text,
    background: colors.background,
    tint: tintColorLight,
    tabIconDefault: colors.textTertiary,
    tabIconSelected: tintColorLight,
  },
  ...colors,
};
