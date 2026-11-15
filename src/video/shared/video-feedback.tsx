/** @jsxImportSource react */

import { BufferingIndicator as BufferingIndicatorPrimitive, Poster as PosterPrimitive } from '@videojs/react';

import { SpinnerIcon } from '../icons';

export function Poster({ renderImage }: { renderImage?: PosterPrimitive.ImageProps['render'] } = {}) {
  return (
    <PosterPrimitive.Root className={'media-poster'}>
      <PosterPrimitive.Image render={renderImage} className={'media-poster-image'} />
    </PosterPrimitive.Root>
  );
}

/** Centre spinner, shown after a short delay while the media is waiting for data. */
export function BufferingIndicator() {
  return (
    <BufferingIndicatorPrimitive className={'media-buffering-indicator'}>
      <SpinnerIcon className={'media-buffering-indicator-icon'} />
    </BufferingIndicatorPrimitive>
  );
}
