// 主题是单一配置源：ThemePicker 用它渲染选项，App 用它同步 <meta name="theme-color">。
// color 是各主题页面背景的近似十六进制值，用于移动端浏览器地址栏着色。
export const THEMES = [
  { id: 'light', label: '浅色', color: '#eef2f7' },
  { id: 'dark', label: '深色', color: '#0d1117' },
  { id: 'forest', label: '森林', color: '#0b1710' },
  { id: 'sunset', label: '日落', color: '#f6f1e8' },
  { id: 'ocean', label: '海洋', color: '#08141a' },
];

export const DEFAULT_THEME = 'light';

export const THEME_COLORS = Object.fromEntries(THEMES.map(({ id, color }) => [id, color]));

/**
 * 把 localStorage 等来源的主题值收敛到已知主题，避免旧值/脏值让页面失去样式。
 *
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeTheme(value) {
  if (typeof value !== 'string') return DEFAULT_THEME;
  return THEMES.some((theme) => theme.id === value) ? value : DEFAULT_THEME;
}
