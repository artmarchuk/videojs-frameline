/** @jsxImportSource react */

import { ErrorDialog as ErrorDialogPrimitive, selectError, useMedia, usePlayer } from '@videojs/react';

import { ErrorIcon } from '../icons';
import { strings } from '../strings';
import { Button } from './button';

/**
 * Shown when the media reports an error: a plain message, a retry action and a dismiss action.
 * Retry clears the error and asks the media to load its source again. Video.js leaves recovery to the skin.
 */
export function ErrorDialog() {
  const media = useMedia();
  const error = usePlayer(selectError);

  function retry() {
    error?.dismissError();
    // Assigning the source again starts a fresh load, which also lets the engine report a new error if it fails again.
    const target = media as { src?: string; load?: () => void } | null;
    if (!target) return;
    const src = target.src;
    if (typeof src === 'string' && src) {
      target.src = '';
      target.src = src;
    } else if (typeof target.load === 'function') {
      target.load();
    }
  }

  return (
    <ErrorDialogPrimitive.Root>
      <ErrorDialogPrimitive.Backdrop className={'media-dialog-backdrop'} />
      <ErrorDialogPrimitive.Popup className={'media-dialog-popup pro-error'}>
        <div className={'media-dialog-header'}>
          <ErrorIcon className={'pro-error-icon'} />
          <ErrorDialogPrimitive.Title className={'media-dialog-title'} />
        </div>
        <ErrorDialogPrimitive.Description className={'media-dialog-description'} />
        <div className={'media-dialog-actions'}>
          <ErrorDialogPrimitive.Close render={<Button />} className={'media-dialog-button'} />
          <Button className={'media-dialog-button media-dialog-button-primary'} onClick={retry} type="button">
            {strings.retry}
          </Button>
        </div>
      </ErrorDialogPrimitive.Popup>
    </ErrorDialogPrimitive.Root>
  );
}
