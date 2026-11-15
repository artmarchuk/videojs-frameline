import type { FeatureFlags } from '../features';

/**
 * Review tier components: timecode, frame step, in/out, markers, guides. Loaded lazily, only when a Review feature
 * is on. Steps 4 to 6 fill this module; for now it renders nothing.
 */
export default function ReviewLayer(_props: { features: Readonly<FeatureFlags> }) {
  return null;
}
