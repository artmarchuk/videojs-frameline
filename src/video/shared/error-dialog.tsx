/** @jsxImportSource react */

import { ErrorDialog as ErrorDialogPrimitive, selectError, useMedia, usePlayer } from '@videojs/react';

import { ErrorIcon } from '../icons';
import { strings } from '../strings';
import { Button } from './button';

/**
 * Shown when the media reports an error: a plain message, a retry action and a dismiss action.
 * Retry asks the media to load its source again and keeps the dialog until that load gets somewhere. Video.js leaves
 * recovery to the skin.
 */
/** Events that mean the retried load got somewhere: the dialog closes on the first of them. */
const LOADED_EVENTS = ['loadedmetadata', 'canplay', 'playing'] as const;

export function ErrorDialog() {
  const media = useMedia();
  const error = usePlayer(selectError);

  function retry() {
    // `load()` starts a fresh load of the current source through the engine when there is one (an HLS stream's `src`
    // is a blob URL by then, so assigning it again would do nothing). The dialog stays on screen until the media has
    // loaded: the engine keeps its error object across the reload, so a second failure would not report as a new error,
    // and the dialog would otherwise vanish on a source that is still broken. A dismiss by hand still works meanwhile.
    const target = media as (EventTarget & { load?: () => void }) | null;
    if (!target || typeof target.load !== 'function') {
      error?.dismissError();
      return;
    }
    const loaded = () => {
      for (const type of LOADED_EVENTS) target.removeEventListener(type, loaded);
      error?.dismissError();
    };
    for (const type of LOADED_EVENTS) target.addEventListener(type, loaded);
    target.load();
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
