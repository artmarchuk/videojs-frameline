/** @jsxImportSource react */

import { Dialog, useHotkey } from '@videojs/react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { CloseIcon } from '../icons';
import { strings } from '../strings';
import { Button } from './button';

interface ShortcutsContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const ShortcutsContext = createContext<ShortcutsContextValue | null>(null);

/** Holds the open state of the shortcut help so the settings menu and the `Shift+?` hotkey can both open it. */
export function ShortcutsProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);

  // Remember where focus was, and put it back on close if the dialog's own focus restore left it on the page body
  // (which happens when the element that opened it, such as a menu item, is gone by then).
  const setOpen = useCallback((next: boolean) => {
    if (next) {
      const active = document.activeElement;
      const menu = active instanceof HTMLElement ? active.closest('.media-menu-popup') : null;
      const container = active instanceof HTMLElement ? active.closest('.pro-skin') : null;
      returnFocus.current = menu
        ? (container?.querySelector<HTMLElement>('.media-settings-button') ?? null)
        : active instanceof HTMLElement
          ? active
          : null;
    }
    setOpenState(next);
  }, []);

  useEffect(() => {
    if (open) return;
    const target = returnFocus.current;
    if (!target) return;
    returnFocus.current = null;
    const timer = window.setTimeout(() => {
      const active = document.activeElement;
      if ((!active || active === document.body) && target.isConnected) target.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  const value = useMemo(() => ({ open, setOpen }), [open, setOpen]);
  return <ShortcutsContext.Provider value={value}>{children}</ShortcutsContext.Provider>;
}

export function useShortcutsDialog(): ShortcutsContextValue {
  const value = useContext(ShortcutsContext);
  if (!value) throw new Error('useShortcutsDialog must be used inside ShortcutsProvider');
  return value;
}

/** One row of the active keyboard map: the keys, then what they do. */
export interface ShortcutRow {
  keys: string[];
  label: string;
}

/** The Share map. Later tiers append their own rows. */
export const SHARE_SHORTCUTS: ShortcutRow[] = [
  { keys: ['Space', 'K'], label: strings.shortcut.playPause },
  { keys: ['←', '→'], label: strings.shortcut.seekShort },
  { keys: ['J', 'L'], label: strings.shortcut.seekLong },
  { keys: ['↑', '↓'], label: strings.shortcut.volume },
  { keys: ['M'], label: strings.shortcut.mute },
  { keys: ['C'], label: strings.shortcut.captions },
  { keys: ['F'], label: strings.shortcut.fullscreen },
  { keys: ['0', '9'], label: strings.shortcut.percent },
  { keys: ['Home', 'End'], label: strings.shortcut.startEnd },
  { keys: ['<', '>'], label: strings.shortcut.speed },
  { keys: ['Shift', '?'], label: strings.shortcut.help },
];

/**
 * The shortcut help dialog. It is a real dialog: focus moves in, Escape closes it, and focus returns to where it was.
 * `Shift+?` toggles it.
 */
export function ShortcutsDialog({ rows = SHARE_SHORTCUTS }: { rows?: ShortcutRow[] } = {}) {
  const { open, setOpen } = useShortcutsDialog();
  const toggle = useCallback(() => setOpen(!open), [open, setOpen]);

  // `?` is what a keyboard reports for the shifted key; `Shift+/` covers layouts and tools that report the base key.
  useHotkey({ keys: 'Shift+?', action: 'toggleShortcutsHelp', repeatable: false, onActivate: toggle });
  useHotkey({ keys: 'Shift+/', action: 'toggleShortcutsHelp', repeatable: false, onActivate: toggle });

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Backdrop className={'media-dialog-backdrop'} />
      <Dialog.Popup className={'media-dialog-popup pro-shortcuts'}>
        <div className={'media-dialog-header'}>
          <Dialog.Title className={'media-dialog-title'}>{strings.shortcutsTitle}</Dialog.Title>
          <Dialog.Close render={<Button />} className={'media-dialog-icon-close'} aria-label={strings.shortcutsClose}>
            <CloseIcon className={'media-button-icon'} />
          </Dialog.Close>
        </div>
        <dl className={'pro-shortcuts-list'}>
          {rows.map((row) => (
            <div className={'pro-shortcuts-row'} key={row.label}>
              <dt className={'pro-shortcuts-keys'}>
                {row.keys.map((key) => (
                  <kbd className={'pro-kbd'} key={key}>
                    {key}
                  </kbd>
                ))}
              </dt>
              <dd className={'pro-shortcuts-label'}>{row.label}</dd>
            </div>
          ))}
        </dl>
      </Dialog.Popup>
    </Dialog.Root>
  );
}
