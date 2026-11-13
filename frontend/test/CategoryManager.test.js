import { describe, test, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CategoryManager from '../src/components/CategoryManager';

// 分类管理的结构回归：重点是「分类可以被整体重命名/合并/清空」，
// 而不是只能逐条进卡片改。重命名为已有分类名即合并，因此不应出现单独的合并按钮。
const CATEGORIES = [
  { name: 'torrent', count: 2 },
  { name: '运维', count: 3 },
];

const render = (props = {}) =>
  renderToStaticMarkup(
    createElement(CategoryManager, {
      open: true,
      categories: CATEGORIES,
      onRename: async () => true,
      onClear: async () => true,
      onClose: () => {},
      ...props,
    })
  );

describe('CategoryManager', () => {
  test('renders a modal dialog listing every category with its count', () => {
    const html = render();
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('torrent');
    expect(html).toContain('运维');
    expect(html).toContain('>2<');
    expect(html).toContain('>3<');
  });

  test('offers rename and clear per category, without a separate merge action', () => {
    const html = render();
    expect(html).toContain('重命名分类 torrent');
    expect(html).toContain('清空分类 torrent');
    // 合并是「重命名为已有名字」的自然结果，不该再多一个入口
    expect(html).not.toContain('aria-label="合并');
    expect(html).toContain('重命名为另一个分类即合并');
  });

  test('renders nothing while closed', () => {
    expect(render({ open: false })).toBe('');
  });

  test('explains the empty state instead of showing an empty list', () => {
    const html = render({ categories: [] });
    expect(html).toContain('还没有分类');
    expect(html).not.toContain('category-manager-list');
  });

  test('never emits a datalist for suggestions (unsupported by iOS Safari)', () => {
    expect(render()).not.toContain('datalist');
  });
});
