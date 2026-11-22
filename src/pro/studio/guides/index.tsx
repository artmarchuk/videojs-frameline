/** @jsxImportSource react */

import './guides.css';
import { memo, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useProStore } from '../../context';
import { effectiveView } from '../../view';
import { studioStrings as t } from '../strings';
import {
  centreCross,
  crisp,
  crispRect,
  cropMask,
  CROP_RATIOS,
  LABELS_FROM_WIDTH,
  percentToRect,
  SAFE_AREAS,
  safeAreaRect,
  thirdsLines,
  type Line,
  type Rect,
} from './geometry';
import { PLATFORM_ZONES } from './platform-zones';

/**
 * The guides, drawn in the overlay layer, which is sized to the picture's rectangle: a guide never lands on a
 * letterbox bar. One SVG per guide. The layer is `aria-hidden` and ignores the pointer; switching a guide is
 * announced by the View menu, not here.
 *
 * Every line is drawn twice: a wider dark stroke, then a 1 px white one at 75% on top. So it reads over white, over
 * black and over anything between, without the accent colour. Coordinates sit on device-pixel centres, and the SVG's
 * user space is the picture in CSS pixels, so a line is one crisp pixel on any screen.
 */
export function Guides({ rect, layer }: { rect: Rect | null; layer: HTMLElement | null }) {
  const view = useProStore((state) => state.view);
  if (!rect || !layer || !(rect.width > 0) || !(rect.height > 0)) return null;
  const { guides, crop, zones } = effectiveView(view);
  if (guides.length === 0 && crop === null) return null;
  return createPortal(<GuideSet width={rect.width} height={rect.height} guides={guides.join(' ')} crop={crop} zones={zones} />, layer);
}

const GuideSet = memo(function GuideSet({ width, height, guides, crop, zones }: { width: number; height: number; guides: string; crop: string | null; zones: string | null }) {
  const ratio = typeof window === 'undefined' ? 1 : Math.max(1, window.devicePixelRatio || 1);
  const on = (id: string) => guides.split(' ').includes(id);
  const labels = width >= LABELS_FROM_WIDTH;
  const snap = (rect: Rect) => crispRect(rect, width, height, ratio);
  const mask = crop ? cropMask(width, height, CROP_RATIOS[crop] ?? 0) : null;
  const platform = zones && mask ? PLATFORM_ZONES[zones as keyof typeof PLATFORM_ZONES] : null;

  const layerProps = { width, height };

  return (
    <>
      {mask && (
        <GuideSvg id={crop!} {...layerProps}>
          {mask.outside.map((part, index) => (
            <rect key={index} className={'pro-guide-dim'} x={part.x} y={part.y} width={part.width} height={part.height} />
          ))}
          <Outline rect={snap(mask.rect)} />
        </GuideSvg>
      )}

      {platform && mask && (
        <>
          <GuideSvg id={`zones-${platform.id}`} {...layerProps}>
            {platform.zones.map((zone) => {
              const area = percentToRect(zone.rect, mask.rect);
              return (
                <g key={zone.part}>
                  <rect className={'pro-guide-zone'} x={area.x} y={area.y} width={area.width} height={area.height} />
                  <Outline rect={snap(area)} dashed />
                </g>
              );
            })}
          </GuideSvg>
          {labels &&
            platform.zones.map((zone) => {
              const area = percentToRect(zone.rect, mask.rect);
              const name = zone.part === 'top' ? `${t.zoneNames[platform.id]}: ${t.zoneParts.top}` : t.zoneParts[zone.part];
              // The rail is too narrow for a label inside it: its label sits to its left.
              const style: CSSProperties = zone.part === 'rail' ? { right: width - area.x + 6, top: area.y + 6 } : { left: area.x + 6, top: area.y + 6 };
              return (
                <span key={zone.part} className={zone.part === 'rail' ? 'pro-guide-label pro-guide-label-end' : 'pro-guide-label'} style={style}>
                  {name}
                </span>
              );
            })}
        </>
      )}

      {on('action-safe') && (
        <SafeArea id="action-safe" label={labels ? t.guideNames['action-safe'] : null} rect={snap(safeAreaRect(width, height, SAFE_AREAS['action-safe']))} straddle {...layerProps} />
      )}
      {on('title-safe') && (
        <SafeArea id="title-safe" label={labels ? t.guideNames['title-safe'] : null} rect={snap(safeAreaRect(width, height, SAFE_AREAS['title-safe']))} {...layerProps} />
      )}

      {on('thirds') && (
        <GuideSvg id="thirds" {...layerProps}>
          <Lines lines={thirdsLines(width, height)} ratio={ratio} />
        </GuideSvg>
      )}
      {on('center') && (
        <GuideSvg id="center" {...layerProps}>
          <Lines lines={centreCross(width, height)} ratio={ratio} />
        </GuideSvg>
      )}
    </>
  );
});

function GuideSvg({ id, width, height, children }: { id: string; width: number; height: number; children: ReactNode }) {
  return (
    <svg className={'pro-guide'} data-guide={id} viewBox={`0 0 ${width} ${height}`} width={width} height={height} focusable="false">
      {children}
    </svg>
  );
}

/** A rectangle outline: the dark under-stroke, then the white line (dashed for safe areas and zones). */
function Outline({ rect, dashed = false }: { rect: Rect; dashed?: boolean }) {
  const box = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  return (
    <>
      <rect className={'pro-guide-under'} {...box} />
      <rect className={dashed ? 'pro-guide-line pro-guide-dashed' : 'pro-guide-line'} {...box} />
    </>
  );
}

function Lines({ lines, ratio }: { lines: Line[]; ratio: number }) {
  // A horizontal line is snapped in y, a vertical one in x; its length is left alone.
  const snapped = lines.map((line) => (line.y1 === line.y2 ? { ...line, y1: crisp(line.y1, ratio), y2: crisp(line.y2, ratio) } : { ...line, x1: crisp(line.x1, ratio), x2: crisp(line.x2, ratio) }));
  return (
    <>
      {snapped.map((line, index) => (
        <line key={`u${index}`} className={'pro-guide-under'} {...line} />
      ))}
      {snapped.map((line, index) => (
        <line key={`l${index}`} className={'pro-guide-line'} {...line} />
      ))}
    </>
  );
}

/**
 * A safe area: a dashed rectangle and its name. Title safe's label sits inside its top-left corner; action safe's
 * sits on its top edge (`straddle`), because the gap between the two rectangles is too small for a label.
 */
function SafeArea({ id, label, rect, straddle = false, width, height }: { id: string; label: string | null; rect: Rect; straddle?: boolean; width: number; height: number }) {
  return (
    <>
      <GuideSvg id={id} width={width} height={height}>
        <Outline rect={rect} dashed />
      </GuideSvg>
      {label && (
        <span className={straddle ? 'pro-guide-label pro-guide-label-straddle' : 'pro-guide-label'} style={{ left: rect.x + (straddle ? 10 : 6), top: rect.y + (straddle ? 0 : 6) }}>
          {label}
        </span>
      )}
    </>
  );
}
