import { describe, expect, it, vi } from 'vitest';

import { createProStore } from './store';

describe('pro store', () => {
  it('keeps in before out by swapping', () => {
    const store = createProStore();
    store.setIn(10);
    store.setOut(5);
    expect(store.getState()).toMatchObject({ inPoint: 5, outPoint: 10 });
    store.setIn(20);
    expect(store.getState()).toMatchObject({ inPoint: 10, outPoint: 20 });
  });

  it('rejects a zero-length range and non-finite times', () => {
    const store = createProStore();
    store.setIn(5);
    store.setOut(5);
    expect(store.getState()).toMatchObject({ inPoint: 5, outPoint: null });
    store.setOut(Number.NaN);
    expect(store.getState().outPoint).toBeNull();
  });

  it('clamps to [0, duration], and a point at its own end is not set', () => {
    const store = createProStore();
    store.setIn(-3);
    expect(store.getState().inPoint).toBeNull();
    store.setDuration(60);
    store.setOut(500);
    expect(store.getState().outPoint).toBeNull();
    store.setOut(59);
    store.setIn(70);
    // In past the end clamps to the end, which is past Out: swapped, and the point at the end is not set.
    expect(store.getState()).toMatchObject({ inPoint: 59, outPoint: null });
  });

  it('unsets a point that is moved back to its end', () => {
    const store = createProStore();
    const onInOutChange = vi.fn();
    store.setDuration(60);
    store.setCallbacks({ onInOutChange });
    store.setIn(10);
    store.setOut(20);
    store.setIn(0);
    expect(store.getState()).toMatchObject({ inPoint: null, outPoint: 20 });
    store.setOut(60);
    expect(store.getState()).toMatchObject({ inPoint: null, outPoint: null });
    expect(onInOutChange).toHaveBeenLastCalledWith({ in: null, out: null });
  });

  it('re-clamps when the duration arrives late', () => {
    const store = createProStore();
    store.setIn(10);
    store.setOut(90);
    store.setDuration(60);
    expect(store.getState()).toMatchObject({ inPoint: 10, outPoint: null });
  });

  it('loops the range while a point is set and the whole video otherwise', () => {
    const store = createProStore();
    store.setLoop();
    expect(store.getState().loopMode).toBe('whole');
    store.setIn(1);
    expect(store.getState().loopMode).toBe('range');
    store.setOut(2);
    store.clearIn();
    expect(store.getState()).toMatchObject({ inPoint: null, outPoint: 2, loopMode: 'range' });
    store.clearInOut();
    expect(store.getState()).toMatchObject({ inPoint: null, outPoint: null, loopMode: 'whole' });
    store.setLoop();
    expect(store.getState().loopMode).toBe('off');
    store.setIn(3);
    expect(store.getState().loopMode).toBe('off');
    store.setLoop(true);
    expect(store.getState().loopMode).toBe('range');
  });

  it('fires onInOutChange only when the range changes', () => {
    const store = createProStore();
    const onInOutChange = vi.fn();
    store.setCallbacks({ onInOutChange });
    store.setIn(1);
    store.setIn(1);
    store.toggleTimeDisplay();
    store.setFrame(3, 0.125);
    store.setOut(4);
    store.clearInOut();
    store.clearInOut();
    expect(onInOutChange.mock.calls).toEqual([[{ in: 1, out: null }], [{ in: 1, out: 4 }], [{ in: null, out: null }]]);
  });

  it('fires onFrameChange only when the frame number changes', () => {
    const store = createProStore();
    const onFrameChange = vi.fn();
    const listener = vi.fn();
    store.setCallbacks({ onFrameChange });
    store.subscribe(listener);
    store.setFrame(1, 0.0417);
    store.setFrame(1, 0.0417);
    store.setFrame(1, 0.05);
    store.setFrame(2, 0.0833);
    expect(onFrameChange.mock.calls).toEqual([[{ frame: 1, time: 0.0417 }], [{ frame: 2, time: 0.0833 }]]);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('only switches on what the host allows, and drops what stops being allowed', () => {
    const store = createProStore({ allowedView: { guides: ['title-safe'], crops: ['9:16'], zones: [], zoom: false } });
    store.toggleGuide('thirds');
    store.setCrop('1:1');
    store.setZones('tiktok');
    expect(store.getState().view).toMatchObject({ guides: [], crop: null, zones: null });
    const before = store.getState().view;
    store.setCrop('9:16');
    store.toggleGuide('title-safe');
    expect(store.getState().view).toMatchObject({ guides: ['title-safe'], crop: '9:16' });
    expect(store.getState().view).not.toBe(before);
    store.setAllowedView({ guides: ['title-safe'], crops: [], zones: [], zoom: false });
    expect(store.getState().view).toMatchObject({ guides: ['title-safe'], crop: null });
    store.toggleGuide('title-safe');
    expect(store.getState().view.guides).toEqual([]);
  });

  it('fires onGuidesChange when the drawn set changes, not for the starting view', () => {
    const allowedView = { guides: ['title-safe', 'thirds'], crops: ['9:16' as const, '1:1' as const], zones: ['tiktok' as const], zoom: false };
    const store = createProStore({ allowedView, view: { guides: ['thirds'], crop: null, zones: null, hidden: false } });
    const onGuidesChange = vi.fn();
    store.setCallbacks({ onGuidesChange });
    expect(store.getState().view.guides).toEqual(['thirds']);
    expect(onGuidesChange).not.toHaveBeenCalled();
    store.toggleGuide('thirds', true); // already on
    store.setZones('tiktok');
    expect(onGuidesChange).toHaveBeenLastCalledWith({ guides: ['thirds'], crop: '9:16', zones: 'tiktok' });
    store.toggleGuidesHidden();
    expect(onGuidesChange).toHaveBeenLastCalledWith({ guides: [], crop: null, zones: null });
    store.toggleGuidesHidden();
    expect(onGuidesChange).toHaveBeenLastCalledWith({ guides: ['thirds'], crop: '9:16', zones: 'tiktok' });
    expect(onGuidesChange).toHaveBeenCalledTimes(3);
  });

  it('starts from a remembered view only as far as the host allows it', () => {
    const store = createProStore({
      allowedView: { guides: ['thirds'], crops: [], zones: [], zoom: false },
      view: { guides: ['title-safe', 'thirds'], crop: '1:1', zones: 'reels', hidden: false },
      timeDisplay: 'seconds',
    });
    expect(store.getState().view).toMatchObject({ guides: ['thirds'], crop: null, zones: null });
    expect(store.getState().timeDisplay).toBe('seconds');
  });

  it('passes marker selection to the host', () => {
    const store = createProStore();
    const onMarkerSelect = vi.fn();
    store.setCallbacks({ onMarkerSelect });
    const marker = { time: 3, label: 'Cut' };
    store.selectMarker(marker);
    expect(onMarkerSelect).toHaveBeenCalledWith(marker);
  });

  it('is per instance: two stores do not share state', () => {
    const allowedView = { guides: ['thirds'], crops: [], zones: [], zoom: false };
    const a = createProStore({ allowedView });
    const b = createProStore({ allowedView });
    a.setIn(5);
    a.toggleGuide('thirds');
    a.setFrame(10, 0.4);
    expect(b.getState()).toMatchObject({ inPoint: null, frame: 0 });
    expect(b.getState().view.guides).toEqual([]);
  });

  it('stops notifying after unsubscribe', () => {
    const store = createProStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.toggleTimeDisplay();
    unsubscribe();
    store.toggleTimeDisplay();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('removed state', () => {
  it('has no toolsOpen', () => {
    const store = createProStore();
    expect('toolsOpen' in store.getState()).toBe(false);
    expect('setToolsOpen' in store).toBe(false);
  });
});

describe('selectedMarker', () => {
  it('remembers the selected marker and reports it', () => {
    const store = createProStore();
    const seen: unknown[] = [];
    store.setCallbacks({ onMarkerSelect: (marker) => seen.push(marker) });
    const marker = { time: 3, label: 'a' };
    store.selectMarker(marker);
    expect(store.getState().selectedMarker).toBe(marker);
    expect(seen).toEqual([marker]);
  });

  it('drops the selection without telling the host', () => {
    const store = createProStore();
    const onMarkerSelect = vi.fn();
    store.setCallbacks({ onMarkerSelect });
    store.selectMarker({ time: 3, label: 'a' });
    store.deselectMarker();
    expect(store.getState().selectedMarker).toBeNull();
    expect(onMarkerSelect).toHaveBeenCalledTimes(1);
  });

  it('zoom: starts at Fit, cycles with Z, and the host flag switches it off', () => {
    const allowedView = { guides: [], crops: [], zones: [], zoom: true };
    const store = createProStore({ allowedView });
    expect(store.getState().zoom).toBe('fit');
    store.cycleZoom();
    expect(store.getState().zoom).toBe('100');
    store.cycleZoom();
    expect(store.getState().zoom).toBe('200');
    store.cycleZoom();
    expect(store.getState().zoom).toBe('fit');
    store.setZoom('200');
    store.setZoom('300' as never);
    expect(store.getState().zoom).toBe('200');

    // The host turns the feature off: back to Fit, and nothing switches it on again.
    store.setAllowedView({ ...allowedView, zoom: false });
    expect(store.getState().zoom).toBe('fit');
    store.setZoom('100');
    store.cycleZoom();
    expect(store.getState().zoom).toBe('fit');
  });

  it('zoom is off without the flag', () => {
    const store = createProStore();
    store.cycleZoom();
    store.setZoom('100');
    expect(store.getState().zoom).toBe('fit');
  });
});
