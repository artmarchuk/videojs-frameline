/**
 * The configurator's state, and its two text forms: the query string and the code snippet. Pure: no DOM, no React.
 */
import { TIERS, type FramelineFeatureOverrides, type FramelineLayout, type FramelineTier } from '@/pro';
// Internal to the skin, so imported from their source file: this page is part of the same repo.
import { resolveLayout, TIER_DEFAULTS } from '@/pro/features';

/** The flags the page offers, grouped as on the page: every flag the skin has. */
export const FLAG_GROUPS = [
  { name: 'Transport', flags: ['timecode', 'frameStep', 'loop', 'cuts'] },
  { name: 'Range', flags: ['range', 'markers'] },
  { name: 'Capture', flags: ['grabFrame', 'copyLink'] },
  { name: 'Guides', flags: ['guides', 'zones'] },
  { name: 'Zoom', flags: ['zoom'] },
] as const;

export type FlagName = (typeof FLAG_GROUPS)[number]['flags'][number];

export const FLAG_NAMES: readonly FlagName[] = FLAG_GROUPS.flatMap((group) => [...group.flags]);

export interface PageConfig {
  tier: FramelineTier;
  layout: FramelineLayout;
  flags: Record<FlagName, boolean>;
}

/** The page opens on the creator's monitor: that is the product. */
export const DEFAULT_TIER: FramelineTier = 'studio';

/** A tier's own flags, as on or off. `guides` is a list in the skin; here it is on when the list is not empty. */
export function tierFlags(tier: FramelineTier): Record<FlagName, boolean> {
  const defaults = TIER_DEFAULTS[tier];
  return Object.fromEntries(FLAG_NAMES.map((name) => [name, defaults[name] !== false])) as Record<FlagName, boolean>;
}

export function tierConfig(tier: FramelineTier): PageConfig {
  return { tier, layout: resolveLayout(tier), flags: tierFlags(tier) };
}

/** The flags that differ from the tier's defaults: what a host has to pass as `features`. */
export function overrides(config: PageConfig): FramelineFeatureOverrides {
  const defaults = tierFlags(config.tier);
  const result: Record<string, boolean> = {};
  for (const name of FLAG_NAMES) if (config.flags[name] !== defaults[name]) result[name] = config.flags[name];
  return result;
}

/** The layout, when it is not the tier's own. */
export function layoutOverride(config: PageConfig): FramelineLayout | undefined {
  return config.layout === resolveLayout(config.tier) ? undefined : config.layout;
}

/**
 * Compatibility, on this page only: the flag names before API 0.1, as they appear in URLs shared before the rename
 * (with the Video.js challenge's judges, and in posts). An old parameter is read as its new name; a new name in the
 * same URL wins. The page writes only the new names, so the address bar is corrected on load.
 */
const OLD_PARAMETERS: Readonly<Record<string, FlagName>> = {
  inOut: 'range',
  shotNav: 'cuts',
  copyTimecodeLink: 'copyLink',
  platformZones: 'zones',
};

const isTier = (value: string | null): value is FramelineTier => (TIERS as readonly string[]).includes(value ?? '');

/** Reads a configuration from a query string. The query wins over the defaults; anything it does not name, or names badly, keeps its default. */
export function readQuery(query: string): PageConfig {
  const params = new URLSearchParams(query);
  const tier = params.get('tier');
  const config = tierConfig(isTier(tier) ? tier : DEFAULT_TIER);
  const layout = params.get('layout');
  if (layout === 'dock' || layout === 'overlay') config.layout = layout;
  const read = (parameter: string, name: FlagName) => {
    const value = params.get(parameter);
    if (value === '0') config.flags[name] = false;
    else if (value === '1') config.flags[name] = true;
  };
  for (const [old, name] of Object.entries(OLD_PARAMETERS)) read(old, name);
  for (const name of FLAG_NAMES) read(name, name);
  return config;
}

/**
 * Writes a configuration into a query string: `tier` always, the layout and each flag only where they differ from
 * the tier's defaults (`zoom=0`). Parameters that are not ours (`media`, `debug`) are kept as they are.
 */
export function writeQuery(config: PageConfig, current = ''): string {
  const params = new URLSearchParams(current);
  for (const name of ['tier', 'layout', ...FLAG_NAMES, ...Object.keys(OLD_PARAMETERS)]) params.delete(name);
  const ours = new URLSearchParams();
  ours.set('tier', config.tier);
  const layout = layoutOverride(config);
  if (layout) ours.set('layout', layout);
  for (const [name, on] of Object.entries(overrides(config))) ours.set(name, on ? '1' : '0');
  for (const [name, value] of params) ours.append(name, value);
  return ours.toString();
}

/** Line length above which the snippet puts one prop on a line. */
const SNIPPET_WIDTH = 84;

/**
 * The configuration as JSX. It names the tier and the source's frame rate, and beyond those only what differs from
 * the tier's defaults.
 */
export function snippet(config: PageConfig, fps: number): string {
  const props = [`tier="${config.tier}"`, `fps={${Number(fps.toFixed(3))}}`];
  const layout = layoutOverride(config);
  if (layout) props.push(`layout="${layout}"`);
  const flags = Object.entries(overrides(config));
  if (flags.length) props.push(`features={{ ${flags.map(([name, on]) => `${name}: ${String(on)}`).join(', ')} }}`);
  const line = `<FramelineSkin ${props.join(' ')} />`;
  if (line.length <= SNIPPET_WIDTH) return line;
  return `<FramelineSkin\n${props.map((prop) => `  ${prop}`).join('\n')}\n/>`;
}
