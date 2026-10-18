import { describe, test, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import UploadZone from '../src/components/UploadZone';

const render = () =>
  renderToStaticMarkup(
    createElement(UploadZone, {
      icon: '📂',
      label: '选择文件',
      isLoading: false,
      onFileChange: () => {},
      onUpload: () => {},
    })
  );

describe('UploadZone', () => {
  test('keeps the file input focusable instead of using display:none', () => {
    const html = render();
    expect(html).toContain('type="file"');
    expect(html).toContain('visually-hidden');
    expect(html).not.toContain('display:none');
  });
});
