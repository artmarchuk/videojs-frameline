/** @jsxImportSource react */

import './debug.css';
import { useEffect, useRef, type RefObject } from 'react';

import { useProStore, useProStoreApi } from '../context';
import type { FramelineFeatureFlags, FramelineTier } from '../features';
import { formatTimecode } from '../timecode';
import { measuredFps, SAMPLE_MS, shown, type FrameSample } from './stats';

export interface DebugReadoutProps {
  tier: FramelineTier;
  density: string;
  layout: string;
  features: Readonly<FramelineFeatureFlags>;
  fps: number;
  startFrames: number;
  video: HTMLVideoElement | null;
  skinRenders: RefObject<number>;
}

function summarise(features: Readonly<FramelineFeatureFlags>): string {
  const on = (Object.keys(features) as (keyof FramelineFeatureFlags)[]).filter((name) => features[name] !== false);
  return on
    .map((name) => (name === 'guides' && features.guides ? `guides[${features.guides.length}]` : name))
    .join(' ');
}

/**
 * Development readout, shown only with `debug` or `?debug`. Each value is read through its own selector, so the
 * rows that change every frame re-render this panel and nothing else. Frame numbers are best effort.
 */
export default function DebugReadout({ tier, density, layout, features, fps, startFrames, video, skinRenders }: DebugReadoutProps) {
  const frame = useProStore((state) => state.frame);
  const mediaTime = useProStore((state) => state.mediaTime);
  const source = useProStore((state) => state.clockSource);
  const precision = useProStore((state) => state.clockPrecision);
  const inPoint = useProStore((state) => state.inPoint);
  const outPoint = useProStore((state) => state.outPoint);
  const loopMode = useProStore((state) => state.loopMode);
  const stats = useProStore((state) => state.stats);
  const ownRenders = useRef(0);
  ownRenders.current += 1;

  // Playback statistics, sampled twice a second into the store. A browser without an API gives `null`, shown as a dash.
  const store = useProStoreApi();
  useEffect(() => {
    if (!video) return;
    const samples: FrameSample[] = [];
    const hasFrames = typeof (video as Partial<HTMLVideoElement>).requestVideoFrameCallback === 'function';
    const sample = () => {
      const quality = typeof video.getVideoPlaybackQuality === 'function' ? video.getVideoPlaybackQuality() : null;
      store.setStats({
        droppedFrames: quality ? quality.droppedVideoFrames : null,
        totalFrames: quality ? quality.totalVideoFrames : null,
        measuredFps: hasFrames ? measuredFps(samples, { at: performance.now(), count: store.presentedFrames() }) : null,
      });
    };
    sample();
    const timer = window.setInterval(sample, SAMPLE_MS);
    return () => window.clearInterval(timer);
  }, [video, store]);

  const point = (value: number | null) => (value === null ? '–' : value.toFixed(3));

  const rows: [string, string][] = [
    ['tier', tier],
    ['density', density],
    ['layout', layout],
    ['features', summarise(features) || 'none'],
    ['fps', String(fps)],
    ['measured fps', shown(stats?.measuredFps)],
    ['frame', String(frame)],
    ['timecode', formatTimecode(frame, fps, { startFrames })],
    ['mediaTime', mediaTime.toFixed(3)],
    ['clock', `${source ?? '–'} / ${precision ?? '–'} (best effort)`],
    ['in / out', `${point(inPoint)} / ${point(outPoint)}`],
    ['loop', loopMode],
    ['dropped', `${shown(stats?.droppedFrames)} of ${shown(stats?.totalFrames)}`],
    ['renders', `skin ${skinRenders.current} · readout ${ownRenders.current}`],
  ];

  return (
    <dl className={'pro-debug'} data-pro-debug>
      {rows.map(([label, value]) => (
        <div className={'pro-debug-row'} key={label}>
          <dt>{label}</dt>
          <dd data-debug={label}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
