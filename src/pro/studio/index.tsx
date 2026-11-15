import type { FeatureFlags } from '../features';

/**
 * Studio tier components: channel view, gain and gamma, zoom. Loaded lazily, only when a Studio feature is on.
 * Step 7 fills this module; for now it renders nothing.
 */
export default function StudioLayer(_props: { features: Readonly<FeatureFlags> }) {
  return null;
}
