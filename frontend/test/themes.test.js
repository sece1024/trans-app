import { describe, test, expect } from 'vitest';
import { DEFAULT_THEME, THEME_COLORS, THEMES, normalizeTheme } from '../src/utils/themes';

describe('themes', () => {
  test('every theme has a label and a theme-color value', () => {
    for (const theme of THEMES) {
      expect(theme.label).toBeTruthy();
      expect(THEME_COLORS[theme.id]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  test('falls back to the default theme for unknown stored values', () => {
    expect(normalizeTheme('dark')).toBe('dark');
    expect(normalizeTheme('not-a-theme')).toBe(DEFAULT_THEME);
    expect(normalizeTheme(null)).toBe(DEFAULT_THEME);
    expect(normalizeTheme(undefined)).toBe(DEFAULT_THEME);
  });
});
