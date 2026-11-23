/** @jsxImportSource react */

import { Tooltip } from '@videojs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentProps, ReactElement, ReactNode } from 'react';

import { cn } from '../../lib/resolve-class-name';

type OpenChange = NonNullable<ComponentProps<typeof Tooltip.Root>['onOpenChange']>;

/**
 * Close of the tooltip that is open now, on any player on the page. A tooltip that opens closes it first, so at most
 * one is ever on screen. `Tooltip.Provider` does not do this (it only skips the open delay), and the Studio dock is
 * portalled in from outside the provider anyway.
 */
let closeOpenTooltip: (() => void) | null = null;

function isKeyboardFocus(el: Element | null): boolean {
  try {
    return el?.matches(':focus-visible') ?? false;
  } catch {
    return false;
  }
}

/**
 * Tooltip for a control: its label plus its keyboard shortcut. It opens on hover and on keyboard focus, closes with
 * Escape, and is kept inside the player (`boundary="container"`) so it cannot overflow a narrow embed.
 *
 * Video.js opens a tooltip on any focus, and closes a focus-opened one only on blur. Focus that a script moves after a
 * mouse action (a menu closing hands focus back to its button; Reset range hands it to Loop) would then leave a
 * tooltip stuck away from the pointer, until that button was hovered again. So the tooltip is controlled here: a
 * focus that is not keyboard focus (`:focus-visible`) does not open it, and opening one tooltip closes any other.
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
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  // Set when Video.js has opened the tooltip for a focus we do not show it for: the next render closes it again.
  const rejected = useRef(false);

  const close = useCallback(() => setOpen(false), []);

  const onOpenChange = useCallback<OpenChange>(
    (next, details) => {
      if (!next) {
        if (closeOpenTooltip === close) closeOpenTooltip = null;
        setOpen(false);
        return;
      }
      // `Tooltip.Root` syncs a controlled `open` only when the prop changes, so a rejected open is mirrored as `true`
      // and then set back to `false` in an effect; the root's own effect then closes it before it is painted.
      if (details.reason === 'focus' && !isKeyboardFocus(triggerRef.current)) rejected.current = true;
      else if (closeOpenTooltip !== close) {
        closeOpenTooltip?.();
        closeOpenTooltip = close;
      }
      setOpen(true);
    },
    [close]
  );

  useEffect(() => {
    if (!open || !rejected.current) return;
    rejected.current = false;
    setOpen(false);
  }, [open]);

  useEffect(
    () => () => {
      if (closeOpenTooltip === close) closeOpenTooltip = null;
    },
    [close]
  );

  return (
    <Tooltip.Root align={align} boundary="container" disabled={disabled} side="top" open={open} onOpenChange={onOpenChange}>
      <Tooltip.Trigger ref={triggerRef} render={children} />
      <Tooltip.Popup className={cn('media-popup', 'media-tooltip-popup')}>
        {label ?? <Tooltip.Label />}
        {!label && <Tooltip.Shortcut className={'media-tooltip-shortcut'} />}
      </Tooltip.Popup>
    </Tooltip.Root>
  );
}
