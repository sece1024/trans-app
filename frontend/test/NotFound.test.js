import { describe, test, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import NotFound from '../src/pages/NotFound';

describe('NotFound', () => {
  test('renders a friendly message and a link back to the file page', () => {
    const html = renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(NotFound))
    );
    expect(html).toContain('页面不存在');
    expect(html).toContain('返回文件页');
    expect(html).toContain('href="/"');
  });
});
