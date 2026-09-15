import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// 数据层打桩：隔离网络与分页逻辑，只验证页面把 ResourceGrid / useResourceList
// 接对了（卡片类名、空状态、按钮回调、加载更多等回归点）。
const listState = {
  items: [],
  hasMore: false,
  loadingMore: false,
  isLoading: false,
  total: 0,
  deletingId: null,
  loadMore: vi.fn(),
  reload: vi.fn(),
  setItems: vi.fn(),
  handleDelete: vi.fn(),
};

vi.mock('../src/hooks/useResourceList', () => ({
  default: () => listState,
  runDelete: vi.fn(),
}));

vi.mock('../src/context/ToastContext', () => ({
  useToast: () => vi.fn(),
  ToastProvider: ({ children }) => children,
}));

const api = {
  getFiles: vi.fn(),
  getImages: vi.fn(),
  getClipboard: vi.fn(),
  deleteFile: vi.fn(),
  deleteImage: vi.fn(),
  deleteClipboard: vi.fn(),
  uploadFile: vi.fn(),
  uploadImage: vi.fn(),
  addClipboard: vi.fn(),
};
vi.mock('../src/api/client', () => ({ api }));

const FileUpload = (await import('../src/pages/FileUpload')).default;
const ImageUpload = (await import('../src/pages/ImageUpload')).default;
const SharedClipboard = (await import('../src/pages/SharedClipboard')).default;

const render = (Component) => renderToStaticMarkup(createElement(Component));

beforeEach(() => {
  listState.items = [];
  listState.hasMore = false;
  listState.loadingMore = false;
  listState.deletingId = null;
});

describe('FileUpload page', () => {
  test('renders the empty state when there are no files', () => {
    const html = render(FileUpload);
    expect(html).toContain('暂无文件');
    expect(html).toContain('选择文件');
    expect(html).not.toContain('bento-grid');
  });

  test('renders file cards with icon, size and actions', () => {
    listState.items = [
      { filename: '100-a.txt', originalName: 'a.txt', size: 12 },
      { filename: '101-b.pdf', originalName: 'b.pdf', size: 2048 },
    ];
    const html = render(FileUpload);
    expect(html.match(/glass-card file-card/g)).toHaveLength(2);
    expect(html).toContain('a.txt');
    expect(html).toContain('12 B');
    expect(html).toContain('2.0 KB');
    expect(html).toContain('复制链接');
    expect(html).toContain('下载');
    // 文件列表头部在选择模式关闭时只显示计数
    expect(html).toContain('已上传 · 2 个文件');
  });

  test('renders the load-more button when hasMore', () => {
    listState.items = [{ filename: '100-a.txt', originalName: 'a.txt', size: 1 }];
    listState.hasMore = true;
    expect(render(FileUpload)).toContain('加载更多');
  });
});

describe('ImageUpload page', () => {
  test('renders the empty state when there are no images', () => {
    expect(render(ImageUpload)).toContain('暂无图片');
  });

  test('renders image cards pointing at the image API', () => {
    listState.items = [{ filename: '200-p.png', originalName: 'p.png' }];
    const html = render(ImageUpload);
    expect(html).toContain('glass-card image-card');
    expect(html).toContain('/api/images/200-p.png');
    expect(html).toContain('图片库 · 1 张');
    expect(html).toContain('预览图片：p.png');
  });
});

describe('SharedClipboard page', () => {
  test('renders the empty state when there are no clips', () => {
    expect(render(SharedClipboard)).toContain('暂无剪贴板内容');
  });

  test('renders clip cards, marking long content as expandable', () => {
    listState.items = [
      { id: 'c1', content: 'short', createdAt: '2026-01-01T00:00:00.000Z', deviceInfo: 'Mac · Chrome' },
      { id: 'c2', content: 'x'.repeat(300), createdAt: '2026-01-01T00:00:00.000Z', deviceInfo: 'iPhone' },
    ];
    const html = render(SharedClipboard);
    expect(html.match(/glass-card clip-card/g)).toHaveLength(2);
    // 超过 120 字符的卡片加宽
    expect(html).toContain('card--wide');
    expect(html).toContain('已分享 · 2 条');
    // 超过 200 字符才显示展开按钮
    expect(html.match(/展开全文/g)).toHaveLength(1);
    expect(html).toContain('Mac · Chrome');
  });
});
