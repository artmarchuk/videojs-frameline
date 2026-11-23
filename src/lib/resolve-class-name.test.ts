import { describe, expect, it } from 'vitest';

import { cn, resolveClassName } from './resolve-class-name';

describe('cn', () => {
  it('joins class names with single spaces', () => {
    expect(cn('media-button', 'media-play-button')).toBe('media-button media-play-button');
  });

  it('leaves out empty values', () => {
    expect(cn('media-button', undefined, '', null, false, 'pro-tool')).toBe('media-button pro-tool');
    expect(cn(undefined)).toBe('');
    expect(cn()).toBe('');
  });

  it('keeps a caller class beside the skin classes, without merging', () => {
    expect(cn('media-skin', 'pro-skin', 'p-2 p-4')).toBe('media-skin pro-skin p-2 p-4');
  });
});

describe('resolveClassName', () => {
  it('returns a plain value and calls a function with the state', () => {
    expect(resolveClassName('a', { paused: true })).toBe('a');
    expect(resolveClassName((state: { paused: boolean }) => (state.paused ? 'is-paused' : undefined), { paused: true })).toBe('is-paused');
  });
});
