/** @jsxImportSource react */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Named places in the control bar where the lazily loaded pro module puts its controls, in this order:
 * `timeline` (in place of the seek bar), `time` (the left column: the timecode), `transport-start` (before Play),
 * `transport-end` (after Play), `range` (after the transport, in the centre column: Loop and Reset range),
 * `range-narrow` (start of the right column: In, Out and Loop on narrow and touch layouts) and `tools` (the Markers,
 * Capture and View menus). The Viewer tier renders none of this. Each slot is an element with `display: contents`,
 * so what is portalled into it takes part in the bar's layout and sits at that point of the focus order.
 */
export type ProSlotName = 'timeline' | 'time' | 'transport-start' | 'transport-end' | 'range' | 'range-narrow' | 'tools';

interface ProSlotsValue {
  nodes: Partial<Record<ProSlotName, HTMLElement | null>>;
  register: (name: ProSlotName, node: HTMLElement | null) => void;
  /** The host's thumbnail renderer, handed on to the pro timeline's preview. */
  renderThumbnail?: unknown;
  /**
   * Items the pro module adds to the settings menu (on narrow layouts: the markers). They are rendered inside the
   * menu's own React tree, so they can use the menu parts.
   */
  settingsItems: ReactNode;
  setSettingsItems: (items: ReactNode) => void;
}

const ProSlotsContext = createContext<ProSlotsValue | null>(null);

export function ProSlotsProvider({ children, renderThumbnail }: { children: ReactNode; renderThumbnail?: unknown }) {
  const [nodes, setNodes] = useState<ProSlotsValue['nodes']>({});
  const [settingsItems, setSettingsItems] = useState<ReactNode>(null);
  const register = useCallback((name: ProSlotName, node: HTMLElement | null) => {
    setNodes((current) => (current[name] === node ? current : { ...current, [name]: node }));
  }, []);
  const value = useMemo(
    () => ({ nodes, register, renderThumbnail, settingsItems, setSettingsItems }),
    [nodes, register, renderThumbnail, settingsItems]
  );
  return <ProSlotsContext.Provider value={value}>{children}</ProSlotsContext.Provider>;
}

/** Renders the slot element. Renders nothing when pro slots are not enabled (the Viewer tier). */
export function ProSlot({ name }: { name: ProSlotName }) {
  const slots = useContext(ProSlotsContext);
  const register = slots?.register;
  const ref = useCallback((node: HTMLElement | null) => register?.(name, node), [register, name]);
  if (!slots) return null;
  return <span className={'pro-slot'} data-pro-slot={name} ref={ref} />;
}

/** The DOM node of a slot, to portal into; `null` until it is mounted. */
export function useProSlot(name: ProSlotName): HTMLElement | null {
  return useContext(ProSlotsContext)?.nodes[name] ?? null;
}

/** The host's `renderThumbnail`, for pro modules that draw their own slider preview. */
export function useProThumbnailRenderer<T>(): T | undefined {
  return useContext(ProSlotsContext)?.renderThumbnail as T | undefined;
}

/** What the pro module added to the settings menu; `null` in the Viewer tier. */
export function useProSettingsItems(): ReactNode {
  return useContext(ProSlotsContext)?.settingsItems ?? null;
}

/** Lets the pro module put items into the settings menu. A no-op outside the pro bar. */
export function useSetProSettingsItems(): (items: ReactNode) => void {
  const set = useContext(ProSlotsContext)?.setSettingsItems;
  return useMemo(() => set ?? (() => {}), [set]);
}
