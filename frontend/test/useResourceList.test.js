import { describe, test, expect, vi } from 'vitest';
import { runDelete } from '../src/hooks/useResourceList';

function makeDeps(overrides = {}) {
  return {
    remove: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue(undefined),
    item: { filename: 'a.txt' },
    getItemId: (item) => item.filename,
    setDeletingId: vi.fn(),
    toast: vi.fn(),
    removed: '已删除',
    removeFailed: '删除失败',
    ...overrides,
  };
}

describe('runDelete', () => {
  test('marks the item in progress, removes it, reloads, then clears the marker', async () => {
    const deps = makeDeps();
    await runDelete(deps);

    expect(deps.remove).toHaveBeenCalledWith({ filename: 'a.txt' });
    expect(deps.reload).toHaveBeenCalledTimes(1);
    expect(deps.toast).toHaveBeenCalledWith('已删除', 'info');
    // 先置为 id，结束后置回 null
    expect(deps.setDeletingId.mock.calls).toEqual([['a.txt'], [null]]);
  });

  test('toasts the failure and still clears the marker when remove rejects', async () => {
    const deps = makeDeps({ remove: vi.fn().mockRejectedValue(new Error('boom')) });
    await runDelete(deps);

    expect(deps.reload).not.toHaveBeenCalled();
    expect(deps.toast).toHaveBeenCalledWith('删除失败', 'error');
    expect(deps.setDeletingId.mock.calls).toEqual([['a.txt'], [null]]);
  });

  test('reports failure but keeps the API success silent when reload rejects', async () => {
    const deps = makeDeps({ reload: vi.fn().mockRejectedValue(new Error('boom')) });
    await runDelete(deps);

    expect(deps.remove).toHaveBeenCalledTimes(1);
    expect(deps.toast).toHaveBeenCalledWith('删除失败', 'error');
    expect(deps.setDeletingId.mock.calls).toEqual([['a.txt'], [null]]);
  });

  test('does not reject even when both remove and reload fail', async () => {
    const deps = makeDeps({
      remove: vi.fn().mockRejectedValue(new Error('boom')),
      reload: vi.fn().mockRejectedValue(new Error('boom')),
    });
    await expect(runDelete(deps)).resolves.toBeUndefined();
  });

  test('uses the custom getItemId to derive the in-progress marker', async () => {
    const deps = makeDeps({ item: { id: 'clip-1' }, getItemId: (item) => item.id });
    await runDelete(deps);
    expect(deps.setDeletingId.mock.calls).toEqual([['clip-1'], [null]]);
  });
});
