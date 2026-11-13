import { describe, test, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CategoryField from '../src/components/CategoryField';

// 分类选择行的结构回归：重点是「不再使用 datalist」——iOS Safari 不支持它，
// 手机用户因此选不到已有分类。改为可点选的 chip 行后两端行为一致。
const render = (props) =>
  renderToStaticMarkup(
    createElement(CategoryField, { value: '', onChange: () => {}, ...props })
  );

const CATEGORIES = [
  { name: 'torrent', count: 2 },
  { name: '运维', count: 3 },
];

describe('CategoryField', () => {
  test('never emits a datalist (unsupported by iOS Safari)', () => {
    const html = render({ suggestions: CATEGORIES });
    expect(html).not.toContain('datalist');
    expect(html).not.toContain('list=');
  });

  test('offers every existing category as a tappable chip with its count', () => {
    const html = render({ suggestions: CATEGORIES });
    expect(html).toContain('选择已有分类');
    expect(html).toContain('category-suggestion');
    expect(html).toContain('设为分类 torrent');
    expect(html).toContain('设为分类 运维');
    expect(html).toContain('>2<');
    expect(html).toContain('>3<');
  });

  test('marks the chip matching the current value as pressed', () => {
    const html = render({ value: '运维', suggestions: CATEGORIES });
    expect(html).toContain('取消分类 运维');
    expect(html).toContain('is-selected');
    // 只有命中的那个 chip 处于选中态
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
  });

  test('matches the selected chip after normalization (stray whitespace)', () => {
    const html = render({ value: '  运维 ', suggestions: CATEGORIES });
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html).toContain('取消分类 运维');
  });

  test('matches the selected chip ignoring case (Link = link)', () => {
    // 分类身份忽略大小写：输入 link 时已有的 torrent chip 不该被选中，
    // 但输入 TORRENT 时应认作同一个分类
    const lower = render({ value: 'TORRENT', suggestions: CATEGORIES });
    expect(lower.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(lower).toContain('取消分类 torrent');

    const other = render({ value: 'link', suggestions: CATEGORIES });
    expect(other.match(/aria-pressed="true"/g) ?? []).toHaveLength(0);
  });

  test('caps input length with the shared category limit', () => {
    const html = render({ suggestions: CATEGORIES });
    // renderToStaticMarkup 保留 React 的驼峰属性名，真实 DOM 中映射为 maxlength
    expect(html).toMatch(/maxlength="32"/i);
  });

  test('tells the user that typing a new name will create a category', () => {
    const html = render({ value: '新分类', suggestions: CATEGORIES });
    expect(html).toContain('将新建分类「新分类」');

    const existing = render({ value: 'torrent', suggestions: CATEGORIES });
    expect(existing).not.toContain('将新建分类');
    expect(render({ value: '', suggestions: CATEGORIES })).not.toContain('将新建分类');
  });

  test('keeps non-matching chips visible while ranking matches first', () => {
    // 自动识别预填 torrent 后，用户仍能看到并点选其他分类
    const html = render({ value: 'torrent', suggestions: CATEGORIES });
    expect(html).toContain('设为分类 运维');
    expect(html).toContain('取消分类 torrent');
  });

  test('warns instead of silently swallowing input beyond the length limit', () => {
    const html = render({ value: 'x'.repeat(32), suggestions: CATEGORIES });
    expect(html).toContain('已达 32 字上限');
  });

  test('caps the chip row and says how many are hidden', () => {
    const many = Array.from({ length: 11 }, (_, i) => ({ name: `c${i}`, count: 1 }));
    const html = render({ suggestions: many });
    expect(html.match(/data-category-chip/g)).toHaveLength(8);
    expect(html).toContain('还有 3 个，输入可筛选');
  });

  test('explains that tapping a selected chip clears the category', () => {
    const html = render({ value: 'torrent', suggestions: CATEGORIES });
    expect(html).toContain('再点一次取消选择');
  });

  test('shows the auto-detected badge only while the value still matches the guess', () => {
    expect(render({ value: 'torrent', autoDetected: 'torrent' })).toContain('自动识别');
    // 用户改成别的分类后提示要消失，避免误导
    expect(render({ value: 'Link', autoDetected: 'torrent' })).not.toContain('自动识别');
    expect(render({ value: '', autoDetected: '' })).not.toContain('自动识别');
  });

  test('skips the suggestion row entirely when there are no categories yet', () => {
    const html = render({ suggestions: [] });
    expect(html).not.toContain('category-suggestions');
    expect(html).toContain('category-input');
  });

  test('compact variants add their modifier class for in-card / manage editors', () => {
    expect(render({ variant: 'inline' })).toContain('category-field--compact');
    expect(render({ variant: 'manage' })).toContain('category-field--compact');
    expect(render({})).not.toContain('category-field--compact');
  });

  test('does not claim a rename will create a category', () => {
    expect(render({ value: '新名字', variant: 'manage' })).not.toContain('将新建分类');
    expect(render({ value: '新名字', variant: 'inline' })).toContain('将新建分类');
  });
});
