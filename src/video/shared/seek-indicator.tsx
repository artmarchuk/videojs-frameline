/** @jsxImportSource react */

import { SeekIndicator as SeekIndicatorPrimitive } from '@videojs/react';

import { cn } from '@/lib/resolve-class-name';

import { ChevronIcon } from '../icons';

/** Feedback for the arrow-key and double-tap seeks, shown on the side it seeks towards. */
export function SeekIndicator() {
  return (
    <SeekIndicatorPrimitive.Root className={cn('media-indicator', 'media-seek-indicator')}>
      <ChevronIcon className={'media-indicator-icon media-seek-indicator-icon'} />
      <SeekIndicatorPrimitive.Value className={'media-indicator-value'} />
    </SeekIndicatorPrimitive.Root>
  );
}
