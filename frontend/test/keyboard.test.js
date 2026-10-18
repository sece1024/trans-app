import { describe, test, expect } from 'vitest';
import { isSelfKeyboardEvent } from '../src/utils/keyboard';

describe('isSelfKeyboardEvent', () => {
  test('accepts an event whose target is the bound card', () => {
    const card = {};
    expect(isSelfKeyboardEvent({ target: card, currentTarget: card })).toBe(true);
  });

  test('rejects events bubbling from buttons inside the card', () => {
    const card = {};
    const button = {};
    expect(isSelfKeyboardEvent({ target: button, currentTarget: card })).toBe(false);
  });
});
