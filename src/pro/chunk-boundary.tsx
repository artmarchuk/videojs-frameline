/** @jsxImportSource react */

import { Component, type ReactNode } from 'react';

interface ChunkBoundaryProps {
  /** Called once, after the part inside could not render. */
  onError?: (() => void) | undefined;
  children: ReactNode;
}

/**
 * An error boundary around one lazily loaded pro chunk. When the chunk fails to load, its `lazy()` component throws
 * during render; without a boundary React then unmounts the whole root, the player and everything the host rendered
 * beside it. With this, only the part inside goes away, and the skin is told so it can fall back to the Viewer.
 *
 * The error is not logged here: React logs every error a boundary catches (`console.error`, also in production
 * builds, through the root's `onCaughtError`, whose default is `console.error`), so logging it again would print it
 * twice. A host that set its own `onCaughtError` receives it there.
 *
 * It lives in the Viewer chunk and imports nothing from the pro chunks.
 */
export class ChunkBoundary extends Component<ChunkBoundaryProps, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch() {
    this.props.onError?.();
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}
