/** @jsxImportSource react */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Named places in the control bar where lazily loaded pro modules put their controls, in this order:
 * `timeline` (in place of the seek bar), `transport-start` (before play), `transport-end` (after play), `time` (after volume), `tools` (before captions).
 * The Share tier renders none of this. Each slot is an element with `display: contents`, so what is portalled into it
 * takes part in the bar's layout and sits at that point of the focus order.
 */
export type ProSlotName = 'timeline' | 'transport-start' | 'transport-end' | 'time' | 'tools';

interface ProSlotsValue {
  nodes: Partial<Record<ProSlotName, HTMLElement | null>>;
  register: (name: ProSlotName, node: HTMLElement | null) => void;
  /** The host's thumbnail renderer, handed on to the pro timeline's preview. */
  renderThumbnail?: unknown;
}

const ProSlotsContext = createContext<ProSlotsValue | null>(null);

export function ProSlotsProvider({ children, renderThumbnail }: { children: ReactNode; renderThumbnail?: unknown }) {
  const [nodes, setNodes] = useState<ProSlotsValue['nodes']>({});
  const register = useCallback((name: ProSlotName, node: HTMLElement | null) => {
    setNodes((current) => (current[name] === node ? current : { ...current, [name]: node }));
  }, []);
  const value = useMemo(() => ({ nodes, register, renderThumbnail }), [nodes, register, renderThumbnail]);
  return <ProSlotsContext.Provider value={value}>{children}</ProSlotsContext.Provider>;
}

/** Renders the slot element. Renders nothing when pro slots are not enabled (the Share tier). */
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
