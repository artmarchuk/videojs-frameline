import { describe, expect, it } from 'vitest';

import { chooseDockSize, toolsSummary } from './dock-logic';

describe('chooseDockSize', () => {
  it('follows the container-width breakpoints', () => {
    expect(chooseDockSize(1200)).toBe('wide');
    expect(chooseDockSize(900)).toBe('wide');
    expect(chooseDockSize(899)).toBe('medium');
    expect(chooseDockSize(560)).toBe('medium');
    expect(chooseDockSize(559)).toBe('narrow');
    expect(chooseDockSize(320)).toBe('narrow');
  });

  it('keeps touch players narrow for longer, where 44 px targets need the room', () => {
    expect(chooseDockSize(600, true)).toBe('narrow');
    expect(chooseDockSize(680, true)).toBe('medium');
    expect(chooseDockSize(900, true)).toBe('wide');
  });

  it('assumes wide until the player has been measured', () => {
    expect(chooseDockSize(0)).toBe('wide');
    expect(chooseDockSize(Number.NaN)).toBe('wide');
  });
});

describe('toolsSummary', () => {
  it('is empty when nothing is set', () => {
    expect(toolsSummary({ in: null, out: null }, 60, 0)).toBe('');
  });

  it('lists only the parts that are set', () => {
    expect(toolsSummary({ in: 14, out: 31 }, 60, 3)).toBe('17 s range · 3 guides');
    expect(toolsSummary({ in: 14, out: 31 }, 60, 0)).toBe('17 s range');
    expect(toolsSummary({ in: null, out: null }, 60, 1)).toBe('1 guide');
  });

  it('measures an open range to the end it runs to', () => {
    expect(toolsSummary({ in: 40, out: null }, 60, 0)).toBe('20 s range');
    expect(toolsSummary({ in: null, out: 12 }, 60, 0)).toBe('12 s range');
  });
});
