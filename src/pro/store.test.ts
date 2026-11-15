import { describe, expect, it, vi } from 'vitest';

import { createProStore, DEFAULT_INSPECTION } from './store';

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

  it('clamps to [0, duration]', () => {
    const store = createProStore();
    store.setIn(-3);
    expect(store.getState().inPoint).toBe(0);
    store.setDuration(60);
    store.setOut(500);
    expect(store.getState().outPoint).toBe(60);
  });

  it('re-clamps when the duration arrives late', () => {
    const store = createProStore();
    store.setIn(10);
    store.setOut(90);
    store.setDuration(60);
    expect(store.getState()).toMatchObject({ inPoint: 10, outPoint: 60 });
  });

  it('resets range looping when in and out are cleared', () => {
    const store = createProStore();
    store.setIn(1);
    store.setOut(2);
    store.setLoopMode('range');
    store.clearInOut();
    expect(store.getState()).toMatchObject({ inPoint: null, outPoint: null, loopMode: 'off' });

    store.setLoopMode('whole');
    store.clearInOut();
    expect(store.getState().loopMode).toBe('whole');
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

  it('only switches on allowed overlays, and drops ones that stop being allowed', () => {
    const store = createProStore({ allowedOverlays: ['title-safe', '9:16'] });
    store.toggleOverlay('thirds');
    expect(store.getState().activeOverlays.size).toBe(0);
    const before = store.getState().activeOverlays;
    store.toggleOverlay('9:16');
    store.toggleOverlay('title-safe');
    expect([...store.getState().activeOverlays]).toEqual(['9:16', 'title-safe']);
    expect(store.getState().activeOverlays).not.toBe(before);
    store.setAllowedOverlays(['title-safe']);
    expect([...store.getState().activeOverlays]).toEqual(['title-safe']);
    store.toggleOverlay('title-safe');
    expect(store.getState().activeOverlays.size).toBe(0);
  });

  it('validates inspection values and resets them', () => {
    const store = createProStore();
    store.setInspection({ channel: 'luma', gain: 99, gamma: -1, zoom: 2 });
    expect(store.getState().inspection).toEqual({ channel: 'luma', gain: 8, gamma: 0.1, zoom: 2 });
    store.setInspection({ channel: 'x' as never, zoom: -1 });
    expect(store.getState().inspection.channel).toBe('luma');
    store.resetInspection();
    expect(store.getState().inspection).toBe(DEFAULT_INSPECTION);
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
    const a = createProStore({ allowedOverlays: ['thirds'] });
    const b = createProStore({ allowedOverlays: ['thirds'] });
    a.setIn(5);
    a.toggleOverlay('thirds');
    a.setFrame(10, 0.4);
    expect(b.getState()).toMatchObject({ inPoint: null, frame: 0 });
    expect(b.getState().activeOverlays.size).toBe(0);
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
