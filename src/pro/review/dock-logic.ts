/**
 * Dock layout logic. Pure: no React, no DOM.
 */
import { formatRangeLength } from './timeline/logic';

/**
 * The dock's three arrangements, by the player's own width:
 * - `wide`: the main row and the Tools tray are one line each.
 * - `medium`: the main row is one line with fewer inline controls (CSS drops them step by step); the tray may wrap.
 * - `narrow`: two rows. Timecode, step, Play and cut buttons; then Tools, Mute and Fullscreen. The tray stacks.
 *
 * CSS container queries do the visual work. This exists because the narrow arrangement changes the order of the
 * controls, and the DOM order has to change with it so the focus order matches what is on screen.
 */
export type DockSize = 'wide' | 'medium' | 'narrow';

export const DOCK_WIDE_FROM = 900;
export const DOCK_MEDIUM_FROM = 560;
/** With 44 px touch targets the one-line main row needs more room, so touch stays narrow for longer. */
export const DOCK_MEDIUM_FROM_COARSE = 680;

export function chooseDockSize(width: number, coarsePointer = false): DockSize {
  if (!(width > 0)) return 'wide'; // not measured yet
  if (width < (coarsePointer ? DOCK_MEDIUM_FROM_COARSE : DOCK_MEDIUM_FROM)) return 'narrow';
  return width < DOCK_WIDE_FROM ? 'medium' : 'wide';
}

/**
 * The dim summary on the closed Tools button: only the parts that are set, nothing when none is.
 * `17 s range · 3 guides`.
 */
export function toolsSummary(range: { in: number | null; out: number | null }, duration: number, guides: number): string {
  const parts: string[] = [];
  if (range.in !== null && range.out !== null) parts.push(`${formatRangeLength(range.out - range.in)} range`);
  else if (range.in !== null) parts.push(duration > 0 ? `${formatRangeLength(duration - range.in)} range` : 'In set');
  else if (range.out !== null) parts.push(`${formatRangeLength(range.out)} range`);
  if (guides > 0) parts.push(guides === 1 ? '1 guide' : `${guides} guides`);
  return parts.join(' · ');
}
