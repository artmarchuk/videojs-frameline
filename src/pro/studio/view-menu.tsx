/** @jsxImportSource react */

import { Menu } from '@videojs/react';
import { useCallback, useMemo, type MouseEvent, type ReactNode } from 'react';

import { cn } from '@/lib/resolve-class-name';

import { CheckIcon, ChevronIcon } from '../../video/icons';
import { Button } from '../../video/shared/button';
import { ButtonTooltip } from '../../video/shared/tooltip';
import { useProStore, useProStoreApi } from '../context';
import type { ProStore } from '../store';
import { activeCount, viewMenuModel, type AllowedView, type CropId, type ViewMenuSection, type ZoneId } from '../view';
import { useAnnounce } from './announcer';
import { EyeIcon } from './icons';
import { studioStrings as t } from './strings';

type Announce = ReturnType<typeof useAnnounce>;

/**
 * Every change to the view goes through these, from the menu and from `Shift+V`, so each one is announced once
 * through the Studio live region (there is no second region) in the same words.
 */
export function createViewActions(store: ProStore, announce: Announce) {
  return {
    toggleGuide(id: string) {
      store.toggleGuide(id);
      const on = store.getState().view.guides.includes(id);
      announce((on ? t.guideOn : t.guideOff)(t.guideNames[id] ?? id));
    },

    setCrop(crop: CropId | null) {
      const hadZones = store.getState().view.zones !== null;
      store.setCrop(crop);
      const view = store.getState().view;
      const name = view.crop ? t.cropSet(t.cropNames[view.crop] ?? view.crop) : t.cropOff;
      // Platform zones live in the 9:16 frame: say so when another crop takes them away.
      announce(hadZones && view.zones === null ? t.zonesCleared(name) : name);
    },

    setZones(zones: ZoneId | null) {
      store.setZones(zones);
      const view = store.getState().view;
      announce(view.zones ? t.zonesSet(t.zoneNames[view.zones] ?? view.zones) : t.zonesOff);
    },

    toggleHidden() {
      const before = store.getState().view;
      store.toggleGuidesHidden();
      const after = store.getState().view;
      if (after === before) announce(t.noGuides, { toast: true });
      else announce(after.hidden ? t.guidesHidden : t.guidesShown, { toast: true });
    },
  };
}

export type ViewActions = ReturnType<typeof createViewActions>;

/** The leading mark of an item: a check for a checkbox that is on, a dot for the chosen radio item. */
function Mark({ kind, checked }: { kind: 'checkbox' | 'radio'; checked: boolean }) {
  return (
    <span className={'pro-menu-mark'} aria-hidden="true">
      {checked && (kind === 'checkbox' ? <CheckIcon className={'pro-menu-check'} /> : <span className={'pro-menu-dot'} />)}
    </span>
  );
}

function Section({ section, actions }: { section: ViewMenuSection; actions: ViewActions }) {
  const label = <Menu.GroupLabel className={'pro-menu-label'}>{t.sections[section.id]}</Menu.GroupLabel>;

  if (section.kind === 'checkbox') {
    return (
      <Menu.Group className={'pro-menu-group'}>
        {label}
        {section.items.map((item) => (
          <Menu.CheckboxItem key={item.id} className={'media-menu-item'} checked={item.checked} onCheckedChange={() => actions.toggleGuide(item.id)}>
            <Mark kind="checkbox" checked={item.checked} />
            <span>{t.guideNames[item.id] ?? item.id}</span>
            {t.guideHints[item.id] && <span className={'pro-menu-sub'}>{t.guideHints[item.id]}</span>}
          </Menu.CheckboxItem>
        ))}
      </Menu.Group>
    );
  }

  const zones = section.id === 'zones';
  const value = section.items.find((item) => item.checked)?.id ?? '';
  const choose = (id: string) => {
    const next = id === 'none' ? null : id;
    if (zones) actions.setZones(next as ZoneId | null);
    else actions.setCrop(next as CropId | null);
  };
  // A radio item closes the menu when it is selected. Here the menu stays open, so several things can be switched
  // in one visit: the click is handled and prevented, which skips the stock select-and-close.
  const onClick = (id: string) => (event: MouseEvent) => {
    event.preventDefault();
    choose(id);
  };

  return (
    <Menu.RadioGroup className={'pro-menu-group'} value={value} onValueChange={choose}>
      {label}
      {section.items.map((item) => (
        <Menu.RadioItem key={item.id} className={'media-menu-item'} value={item.id} onClick={onClick(item.id)}>
          <Mark kind="radio" checked={item.checked} />
          <span>{item.id === 'none' ? t.none : zones ? (t.zoneNames[item.id] ?? item.id) : (t.cropNames[item.id] ?? item.id)}</span>
          {zones && item.id !== 'none' && <span className={'pro-menu-sub'}>{t.approximate}</span>}
        </Menu.RadioItem>
      ))}
      {zones && <p className={'pro-menu-note'}>{t.zonesNote}</p>}
    </Menu.RadioGroup>
  );
}

/**
 * Video.js focuses the first CHECKED radio item when a menu opens (installed `menu.js`, `getInitialHighlightItem`),
 * which here is "Crop: None" in the right column. Keyboard order has to follow reading order (WCAG 2.4.3), so on open
 * we focus the first item ourselves. This runs one animation frame before the stock highlight, which then sees an
 * item already highlighted and leaves it alone.
 */
function focusFirstOnOpen(open: boolean) {
  if (!open) return;
  requestAnimationFrame(() => {
    const first = document.querySelector<HTMLElement>('.pro-view-popup [role^="menuitem"]:not([aria-disabled="true"])');
    first?.focus({ preventScroll: true });
  });
}

/**
 * The View menu: safe areas and composition guides (independent), one crop mask, one platform's zones, and a footer
 * that hides or shows them all. Two columns on a wide player, one scrolling column on a narrow one. The host's
 * `features` decide what is offered; a section with nothing left is not shown. Toggling keeps the menu open; Escape
 * closes it and returns focus to the button.
 *
 * `extra` is where step 7 adds its "Image" section, under the platform zones.
 */
export function ViewMenu({ allowed, actions, extra }: { allowed: AllowedView; actions: ViewActions; extra?: ReactNode }) {
  const view = useProStore((state) => state.view);
  const count = activeCount(view);
  const sections = viewMenuModel(view, allowed);
  const left = sections.filter((section) => section.column === 'left');
  const right = sections.filter((section) => section.column === 'right');
  const anything = view.guides.length > 0 || view.crop !== null;

  // Stays open like the other items of this menu.
  const onFooterClick = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      actions.toggleHidden();
    },
    [actions]
  );

  return (
    <Menu.Root side="top" align="end" onOpenChange={focusFirstOnOpen}>
      <ButtonTooltip label={<span>{t.view}</span>}>
        <Menu.Trigger render={<Button />} className={'pro-tool pro-tool-menu'} aria-label={t.viewCount(count)} data-pro-menu="view">
          <span className={'media-button-icon pro-tool-icon'}>
            <EyeIcon />
          </span>
          <span className={'pro-tool-word'}>{t.view}</span>
          {count > 0 && <span className={'pro-badge'}>{count}</span>}
          <ChevronIcon className={'pro-chevron-down'} />
        </Menu.Trigger>
      </ButtonTooltip>
      <Menu.Popup keepMounted className={cn('media-popup', 'media-menu-popup', 'pro-menu-popup', 'pro-view-popup')} data-columns={left.length > 0 && (right.length > 0 || extra) ? 2 : 1}>
        <Menu.Content className={'media-menu-content'}>
          <div className={'pro-view-columns'} role="none">
            {left.length > 0 && (
              <div className={'pro-view-column'} role="none">
                {left.map((section) => (
                  <Section key={section.id} section={section} actions={actions} />
                ))}
              </div>
            )}
            {(right.length > 0 || extra) && (
              <div className={'pro-view-column'} role="none">
                {right.map((section) => (
                  <Section key={section.id} section={section} actions={actions} />
                ))}
                {extra}
              </div>
            )}
          </div>
          <Menu.Separator className={'pro-menu-separator'} />
          <Menu.Item className={'media-menu-item'} disabled={!anything} onClick={onFooterClick}>
            <Mark kind="checkbox" checked={false} />
            <span>{view.hidden ? t.showGuides : t.hideGuides}</span>
            <span className={'media-menu-hint'}>
              <kbd className={'pro-kbd'}>Shift+V</kbd>
            </span>
          </Menu.Item>
        </Menu.Content>
      </Menu.Popup>
    </Menu.Root>
  );
}

/** Keeps `useProStoreApi` and the announcer together for the menu and the hotkey. */
export function useViewActions(): ViewActions {
  const store = useProStoreApi();
  const announce = useAnnounce();
  // The store and the announcer are stable for the life of the tier.
  return useMemo(() => createViewActions(store, announce), [store, announce]);
}
