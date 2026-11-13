import { test, expect } from 'bun:test';
import events from '../src/services/clipboardEvents';

function fakeClient() {
  return {
    writes: [],
    write(payload) {
      this.writes.push(payload);
    },
  };
}

test('notify broadcasts to subscribed clients only', () => {
  const a = fakeClient();
  const b = fakeClient();
  events.subscribe(a);
  events.subscribe(b);
  expect(events.clientCount()).toBe(2);

  events.notify({ type: 'deleted', id: 'x' });
  expect(a.writes).toHaveLength(1);
  expect(a.writes[0]).toContain('deleted');
  expect(b.writes).toHaveLength(1);

  events.unsubscribe(a);
  events.notify({ type: 'deleted', id: 'x' });
  expect(a.writes).toHaveLength(1);
  expect(b.writes).toHaveLength(2);

  events.unsubscribe(b);
  expect(events.clientCount()).toBe(0);
});

test('payload carries the change itself, not just a "something changed" signal', () => {
  // 订阅者要能在本地精确应用变更（只打补丁、不重拉列表），
  // 因此事件必须自带 type + 受影响的 id / 分类。
  const client = fakeClient();
  events.subscribe(client);

  events.notify({ type: 'updated', id: 'abc', category: '运维', originId: 'client-1' });

  const line = client.writes[0];
  expect(line.startsWith('data: ')).toBe(true);
  const payload = JSON.parse(line.slice('data: '.length));
  expect(payload).toEqual({
    type: 'updated',
    id: 'abc',
    category: '运维',
    originId: 'client-1',
  });

  events.unsubscribe(client);
});

test('null category is preserved so "cleared" is distinguishable from "absent"', () => {
  const client = fakeClient();
  events.subscribe(client);

  events.notify({ type: 'updated', id: 'abc', category: null });

  const payload = JSON.parse(client.writes[0].slice('data: '.length));
  expect(payload.category).toBeNull();
  expect('category' in payload).toBe(true);

  events.unsubscribe(client);
});

test('notify skips clients whose write throws', () => {
  const broken = {
    write() {
      throw new Error('closed');
    },
  };
  events.subscribe(broken);
  expect(events.clientCount()).toBe(1);

  events.notify({ type: 'created', item: { id: 'x' } });
  expect(events.clientCount()).toBe(0);
});
