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

  events.notify('clipboard-changed');
  expect(a.writes).toHaveLength(1);
  expect(a.writes[0]).toContain('clipboard-changed');
  expect(b.writes).toHaveLength(1);

  events.unsubscribe(a);
  events.notify('clipboard-changed');
  expect(a.writes).toHaveLength(1);
  expect(b.writes).toHaveLength(2);

  events.unsubscribe(b);
  expect(events.clientCount()).toBe(0);
});

test('notify skips clients whose write throws', () => {
  const broken = {
    write() {
      throw new Error('closed');
    },
  };
  events.subscribe(broken);
  expect(events.clientCount()).toBe(1);

  events.notify('clipboard-changed');
  expect(events.clientCount()).toBe(0);
});
