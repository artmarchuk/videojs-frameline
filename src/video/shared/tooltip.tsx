/** @jsxImportSource react */

import { Tooltip } from '@videojs/react';
import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/lib/resolve-class-name';

/**
 * Tooltip for a control: its label plus its keyboard shortcut. It opens on hover and on keyboard focus, closes with
 * Escape, and is kept inside the player (`boundary="container"`) so it cannot overflow a narrow embed.
 */
export function ButtonTooltip({
  align,
  children,
  disabled,
  label,
}: {
  align?: 'start' | 'center' | 'end';
  children: ReactElement;
  disabled?: boolean;
  label?: ReactNode;
}) {
  return (
    <Tooltip.Root align={align} boundary="container" disabled={disabled} side="top">
      <Tooltip.Trigger render={children} />
      <Tooltip.Popup className={cn('media-popup', 'media-tooltip-popup')}>
        {label ?? <Tooltip.Label />}
        {!label && <Tooltip.Shortcut className={'media-tooltip-shortcut'} />}
      </Tooltip.Popup>
    </Tooltip.Root>
  );
}
