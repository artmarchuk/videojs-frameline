/** @jsxImportSource react */

import './debug.css';
import { useRef, type RefObject } from 'react';

import { useProStore } from '../context';
import type { FeatureFlags, Tier } from '../features';
import { formatTimecode } from '../timecode';

export interface DebugReadoutProps {
  tier: Tier;
  density: string;
  features: Readonly<FeatureFlags>;
  fps: number;
  startFrames: number;
  video: HTMLVideoElement | null;
  skinRenders: RefObject<number>;
}

function summarise(features: Readonly<FeatureFlags>): string {
  const on = (Object.keys(features) as (keyof FeatureFlags)[]).filter((name) => features[name] !== false);
  return on
    .map((name) => (name === 'guides' && features.guides ? `guides[${features.guides.length}]` : name))
    .join(' ');
}

/**
 * Development readout, shown only with `debug` or `?debug`. Each value is read through its own selector, so the
 * rows that change every frame re-render this panel and nothing else. Frame numbers are best effort.
 */
export default function DebugReadout({ tier, density, features, fps, startFrames, video, skinRenders }: DebugReadoutProps) {
  const frame = useProStore((state) => state.frame);
  const mediaTime = useProStore((state) => state.mediaTime);
  const source = useProStore((state) => state.clockSource);
  const precision = useProStore((state) => state.clockPrecision);
  const inPoint = useProStore((state) => state.inPoint);
  const outPoint = useProStore((state) => state.outPoint);
  const loopMode = useProStore((state) => state.loopMode);
  const ownRenders = useRef(0);
  ownRenders.current += 1;

  const quality = typeof video?.getVideoPlaybackQuality === 'function' ? video.getVideoPlaybackQuality() : null;
  const point = (value: number | null) => (value === null ? '–' : value.toFixed(3));

  const rows: [string, string][] = [
    ['tier', tier],
    ['density', density],
    ['features', summarise(features) || 'none'],
    ['fps', String(fps)],
    ['frame', String(frame)],
    ['timecode', formatTimecode(frame, fps, { startFrames })],
    ['mediaTime', mediaTime.toFixed(3)],
    ['clock', `${source ?? '–'} / ${precision ?? '–'} (best effort)`],
    ['in / out', `${point(inPoint)} / ${point(outPoint)}`],
    ['loop', loopMode],
    ['dropped', quality ? `${quality.droppedVideoFrames} of ${quality.totalVideoFrames}` : 'n/a'],
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
