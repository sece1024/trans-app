import { describe, test, expect } from 'vitest';
import { applyClipboardEvent, isOwnClipboardEvent } from '../src/utils/clipboardListPatch';

const items = [
  { id: 'a', content: 'A', category: '运维' },
  { id: 'b', content: 'B', category: 'Link' },
  { id: 'c', content: 'C', category: null },
];

describe('isOwnClipboardEvent', () => {
  test('matches only events echoing this client id', () => {
    expect(isOwnClipboardEvent({ type: 'deleted', originId: 'me' }, 'me')).toBe(true);
    expect(isOwnClipboardEvent({ type: 'deleted', originId: 'other' }, 'me')).toBe(false);
  });

  test('treats events without originId as foreign (never silently drops them)', () => {
    // 旧客户端 / 缺少请求头时服务端不下发 originId，必须按「别人发的」处理
    expect(isOwnClipboardEvent({ type: 'deleted' }, 'me')).toBe(false);
    expect(isOwnClipboardEvent({ type: 'deleted', originId: undefined }, 'me')).toBe(false);
    expect(isOwnClipboardEvent({ type: 'deleted', originId: 'me' }, undefined)).toBe(false);
  });
});

describe('applyClipboardEvent: created', () => {
  test('always asks for a refetch — new page content (and any pruned row) is server knowledge', () => {
    const result = applyClipboardEvent({ items, event: { type: 'created', item: { id: 'z' } } });
    expect(result.needsRefetch).toBe(true);
    expect(result.items).toBe(items);
  });
});

describe('applyClipboardEvent: deleted', () => {
  test('drops the row and reports the total delta', () => {
    const result = applyClipboardEvent({ items, event: { type: 'deleted', id: 'b' } });
    expect(result.items.map((item) => item.id)).toEqual(['a', 'c']);
    expect(result.totalDelta).toBe(-1);
    expect(result.needsRefetch).toBe(false);
  });

  test('is a no-op when the row is not on the current page', () => {
    const result = applyClipboardEvent({ items, event: { type: 'deleted', id: 'zzz' } });
    expect(result.items).toBe(items);
    expect(result.totalDelta).toBe(0);
    expect(result.needsRefetch).toBe(false);
  });
});

describe('applyClipboardEvent: updated, unfiltered view', () => {
  test('patches the category in place, keeping position and pagination', () => {
    const result = applyClipboardEvent({
      items,
      event: { type: 'updated', id: 'a', category: 'SQL' },
    });
    expect(result.items.map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(result.items[0].category).toBe('SQL');
    expect(result.items[1]).toBe(items[1]); // 其余条目引用不变，避免整列重渲染
    expect(result.totalDelta).toBe(0);
    expect(result.needsRefetch).toBe(false);
  });

  test('clearing a category stores null rather than undefined', () => {
    const result = applyClipboardEvent({
      items,
      event: { type: 'updated', id: 'a', category: null },
    });
    expect(result.items[0].category).toBeNull();
  });
});

describe('applyClipboardEvent: updated, filtered view', () => {
  test('removes the row when it leaves the active filter', () => {
    const result = applyClipboardEvent({
      items,
      filter: '运维',
      event: { type: 'updated', id: 'a', category: 'Link' },
    });
    expect(result.items.map((item) => item.id)).toEqual(['b', 'c']);
    expect(result.totalDelta).toBe(-1);
    expect(result.needsRefetch).toBe(false);
  });

  test('keeps the row when it stays inside the active filter', () => {
    const result = applyClipboardEvent({
      items,
      filter: '运维',
      event: { type: 'updated', id: 'a', category: '运维' },
    });
    expect(result.items).toHaveLength(3);
    expect(result.totalDelta).toBe(0);
    expect(result.needsRefetch).toBe(false);
  });

  test('refetches when the row is not on the page but now belongs to the filter', () => {
    // 场景：正在看「运维」，某条原本是 Link 的条目（不在当前页）被改成了运维
    const result = applyClipboardEvent({
      items,
      filter: '运维',
      event: { type: 'updated', id: 'not-loaded', category: '运维' },
    });
    expect(result.needsRefetch).toBe(true);
    expect(result.totalDelta).toBe(0);
  });

  test('stays a no-op when the row is not on the page and still does not match', () => {
    const result = applyClipboardEvent({
      items,
      filter: '运维',
      event: { type: 'updated', id: 'not-loaded', category: 'Link' },
    });
    expect(result.needsRefetch).toBe(false);
    expect(result.items).toBe(items);
  });

  test('uncategorized filter compares against null, not the empty string', () => {
    const leaving = applyClipboardEvent({
      items,
      filter: '',
      event: { type: 'updated', id: 'c', category: 'Link' },
    });
    expect(leaving.items.map((item) => item.id)).toEqual(['a', 'b']);

    const entering = applyClipboardEvent({
      items,
      filter: '',
      event: { type: 'updated', id: 'c', category: null },
    });
    expect(entering.items).toHaveLength(3);
    expect(entering.needsRefetch).toBe(false);
  });
});

describe('applyClipboardEvent: unknown event types', () => {
  test('falls back to a full refetch instead of guessing', () => {
    const result = applyClipboardEvent({ items, event: { type: 'pruned' } });
    expect(result.needsRefetch).toBe(true);
    expect(result.totalDelta).toBe(0);
  });
});
