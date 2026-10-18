import { describe, test, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ImagePreview from '../src/components/ImagePreview';

const images = [
  { filename: '1-a.png', originalName: 'a.png' },
  { filename: '2-b.png', originalName: 'b.png' },
];

const render = (props = {}) =>
  renderToStaticMarkup(
    createElement(ImagePreview, {
      open: true,
      images,
      currentIndex: 0,
      onClose: () => {},
      onNavigate: () => {},
      ...props,
    })
  );

describe('ImagePreview', () => {
  test('renders a modal dialog with image, counter and navigation', () => {
    const html = render();
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('/api/images/1-a.png');
    expect(html).toContain('1 / 2');
    expect(html).toContain('下一张');
    expect(html).not.toContain('上一张');
  });

  test('renders nothing while closed', () => {
    expect(render({ open: false })).toBe('');
  });

  test('hides the next arrow on the last image', () => {
    const html = render({ currentIndex: 1 });
    expect(html).toContain('2 / 2');
    expect(html).toContain('上一张');
    expect(html).not.toContain('下一张');
  });
});
