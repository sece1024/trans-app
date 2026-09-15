import { describe, test, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ResourceGrid from '../src/components/ResourceGrid';

// framer-motion 在 SSR 下渲染为普通标签，可直接断言结构。
const render = (props) =>
  renderToStaticMarkup(
    createElement(ResourceGrid, {
      items: [],
      getItemKey: (item) => item.id,
      renderItem: () => null,
      ...props,
    })
  );

describe('ResourceGrid', () => {
  test('renders the empty state when there are no items', () => {
    const html = render({ emptyIcon: '📂', emptyTitle: '暂无文件', emptyDescription: '点击上传' });
    expect(html).toContain('empty-state');
    expect(html).toContain('暂无文件');
    expect(html).toContain('点击上传');
    // 空列表不应渲染 grid 或「加载更多」
    expect(html).not.toContain('bento-grid');
    expect(html).not.toContain('加载更多');
  });

  test('wraps each item in a glass-card carrying its class name', () => {
    const html = render({
      items: [{ id: 'a' }, { id: 'b' }],
      itemClassName: 'file-card',
      renderItem: (item) => createElement('p', null, item.id),
    });
    expect(html.match(/glass-card file-card/g)).toHaveLength(2);
    expect(html).toContain('bento-grid');
    expect(html).toContain('>a<');
    expect(html).toContain('>b<');
  });

  test('supports a per-item class name function', () => {
    const html = render({
      items: [{ id: 'a', wide: true }, { id: 'b', wide: false }],
      itemClassName: (item) => `clip-card${item.wide ? ' card--wide' : ''}`,
      renderItem: () => null,
    });
    expect(html).toContain('glass-card clip-card card--wide');
    expect(html.match(/glass-card clip-card"/g)).toHaveLength(1);
  });

  test('applies extra motion props from itemMotionProps', () => {
    const html = render({
      items: [{ id: 'a' }],
      itemMotionProps: (item) => ({ role: 'button', 'aria-label': `预览 ${item.id}` }),
      renderItem: () => null,
    });
    expect(html).toContain('role="button"');
    expect(html).toContain('aria-label="预览 a"');
  });

  test('renders the load-more button only while hasMore, disabled while loading', () => {
    const base = { items: [{ id: 'a' }], renderItem: () => null };
    expect(render(base)).not.toContain('加载更多');
    expect(render({ ...base, hasMore: true })).toContain('加载更多');
    expect(render({ ...base, hasMore: true, loadingMore: true })).toContain('加载中…');
  });

  test('passes the item index to renderItem', () => {
    const seen = [];
    render({
      items: [{ id: 'a' }, { id: 'b' }],
      renderItem: (item, index) => {
        seen.push(index);
        return null;
      },
    });
    expect(seen).toEqual([0, 1]);
  });
});
