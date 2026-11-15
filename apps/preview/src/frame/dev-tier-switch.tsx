import type { Tier } from '@/pro';

const TIERS: Tier[] = ['share', 'review', 'studio'];

/**
 * Development tool, shown only with `?debug`: three plain buttons that switch the tier of the preview player.
 * It sits outside the player and is deliberately unstyled. It is not the configurator (step 8).
 */
export default function DevTierSwitch({ tier, onChange }: { tier: Tier; onChange: (tier: Tier) => void }) {
  return (
    <div role="group" aria-label="Tier (development)" style={{ position: 'fixed', top: 8, left: 8, zIndex: 100 }}>
      {TIERS.map((name) => (
        <button key={name} type="button" aria-pressed={name === tier} onClick={() => onChange(name)}>
          {name === tier ? `[${name}]` : name}
        </button>
      ))}
    </div>
  );
}
