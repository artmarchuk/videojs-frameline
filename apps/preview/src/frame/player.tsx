import { MuxVideo } from '@videojs/react/media/mux-video';
import { VideoPlayer } from '@videojs/react/video';
import { lazy, Suspense, useCallback, useMemo, useState } from 'react';

import { ProSkin, TIERS, type Density, type Tier } from '@/pro';

import type { PlaybackProps } from '../shell/params';

// The media lives in ./media so it can be swapped in one place.
import { MEDIA } from './media';

// Loaded only with `?debug`, so it is not part of the normal preview bundle.
const EventLog = lazy(() => import('./event-log'));

const QUERY = new URLSearchParams(window.location.search);
const DEBUG = QUERY.has('debug');
const START_TIER = TIERS.find((tier) => tier === QUERY.get('tier')) ?? 'studio';
// `?layout=dock|overlay` overrides the tier's default layout, to check both layouts in any tier.
const LAYOUT = QUERY.get('layout') === 'dock' ? 'dock' : QUERY.get('layout') === 'overlay' ? 'overlay' : undefined;
// `?guides=title-safe,9:16` restricts the View menu to those ids (`?guides=0` removes it) and `?zones=0` switches the
// platform zones off: the host's side of the feature flags, for checking that they win over remembered choices.
const GUIDES = QUERY.get('guides');
const FEATURES = {
  ...(GUIDES === null ? {} : { guides: GUIDES === '0' ? false : GUIDES.split(',') }),
  ...(QUERY.get('zones') === '0' ? { platformZones: false } : {}),
};

const START_DENSITY: Density = QUERY.get('density') === 'compact' ? 'compact' : 'comfortable';

const TIER_LABELS: Record<Tier, string> = { viewer: 'Viewer', studio: 'Studio' };
const DENSITIES: { value: Density; label: string }[] = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
];

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="monitor-switch" role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={option.value === value} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * The preview page: a monitor. A slim top bar (product, file, tier and density switches) and the player, as large as
 * the window allows. `?tier=viewer|studio`, `?density=compact` and `?layout=dock|overlay` set the starting state; `?debug` adds the
 * debug readout and the event log. `media` carries the workbench's playback options.
 */
export function Player({ media }: { media?: PlaybackProps }) {
  const [tier, setTier] = useState<Tier>(START_TIER);
  const [density, setDensity] = useState<Density>(START_DENSITY);
  const [events, setEvents] = useState<string[]>([]);

  const log = useCallback((name: string, detail: unknown) => {
    const line = `${name} ${JSON.stringify(detail, (_key, value) => (typeof value === 'number' ? Number(value.toFixed(3)) : value))}`;
    setEvents((current) => [line, ...current].slice(0, 30));
  }, []);

  // With `?debug` every event the skin emits is appended to the on-page log.
  const handlers = useMemo(
    () =>
      DEBUG
        ? {
            onInOutChange: (range: unknown) => log('inout:change', range),
            onMarkerSelect: (marker: unknown) => log('marker:select', marker),
            onCopyLink: (info: unknown) => log('link:copy', info),
            onFrameChange: (frame: unknown) => log('frame:change', frame),
            onViewChange: (view: unknown) => log('view:change', view),
          }
        : {},
    [log]
  );

  return (
    <>
      <header className="monitor-bar">
        <div className="monitor-title">
          <h1>Video.js PRO</h1>
          {MEDIA.info && <p>{MEDIA.info}</p>}
        </div>
        <div className="monitor-switches">
          <Segmented label="Tier" value={tier} options={TIERS.map((value) => ({ value, label: TIER_LABELS[value] }))} onChange={setTier} />
          <Segmented label="Density" value={density} options={DENSITIES} onChange={setDensity} />
        </div>
      </header>
      <div className="monitor-stage">
        <VideoPlayer poster={MEDIA.poster}>
          <ProSkin tier={tier} density={density} layout={LAYOUT} features={FEATURES} fps={MEDIA.fps} markers={MEDIA.markers} {...handlers}>
            <MuxVideo {...media} src={MEDIA.src} playsInline crossOrigin={MEDIA.noCors ? undefined : ''}>
              {MEDIA.chapters && <track kind="chapters" label="English" srcLang="en" src={MEDIA.chapters} default />}
            </MuxVideo>
          </ProSkin>
        </VideoPlayer>
      </div>
      {DEBUG && (
        <Suspense fallback={null}>
          <EventLog events={events} />
        </Suspense>
      )}
    </>
  );
}
