import { describe, expect, it } from 'vitest';

import { layoutOverride, overrides, readQuery, snippet, tierConfig, writeQuery } from './config';

describe('configurator state', () => {
  it('starts from the tier: Studio has everything on in a dock, Viewer nothing in an overlay', () => {
    expect(tierConfig('studio')).toMatchObject({ layout: 'dock', flags: { timecode: true, guides: true, zoom: true } });
    expect(tierConfig('viewer')).toMatchObject({ layout: 'overlay', flags: { timecode: false, guides: false, zoom: false } });
    expect(overrides(tierConfig('studio'))).toEqual({});
    expect(layoutOverride(tierConfig('viewer'))).toBeUndefined();
  });

  it('reads the query over the defaults and ignores what it cannot read', () => {
    expect(readQuery('')).toEqual(tierConfig('studio'));
    expect(readQuery('?tier=viewer')).toEqual(tierConfig('viewer'));
    const config = readQuery('?tier=studio&zoom=0&layout=overlay&markers=maybe&tier2=x');
    expect(config.flags.zoom).toBe(false);
    expect(config.flags.markers).toBe(true);
    expect(config.layout).toBe('overlay');
    expect(readQuery('?tier=pro&layout=side')).toEqual(tierConfig('studio'));
    // A pro flag over Viewer.
    expect(overrides(readQuery('?tier=viewer&timecode=1'))).toEqual({ timecode: true });
  });

  it('round-trips through the query string', () => {
    for (const query of ['tier=studio', 'tier=viewer', 'tier=studio&zoom=0', 'tier=viewer&layout=dock&timecode=1&guides=1', 'tier=studio&layout=overlay&inOut=0&platformZones=0']) {
      expect(writeQuery(readQuery(query))).toBe(query);
    }
  });

  it('writes only what differs from the tier, and keeps parameters that are not its own', () => {
    expect(writeQuery(tierConfig('studio'))).toBe('tier=studio');
    expect(writeQuery(readQuery('zoom=1&layout=dock'))).toBe('tier=studio');
    expect(writeQuery(readQuery('zoom=0'), '?media=reel&zoom=1&debug=')).toBe('tier=studio&zoom=0&media=reel&debug=');
  });

  it('writes the snippet with only the props that differ from the tier', () => {
    expect(snippet(tierConfig('studio'), 24)).toBe('<FramelineSkin tier="studio" fps={24} />');
    expect(snippet(readQuery('tier=studio&zoom=0'), 24)).toBe('<FramelineSkin tier="studio" fps={24} features={{ zoom: false }} />');
    expect(snippet(readQuery('tier=viewer&timecode=1&layout=dock'), 30)).toBe('<FramelineSkin tier="viewer" fps={30} layout="dock" features={{ timecode: true }} />');
    expect(snippet(tierConfig('viewer'), 30000 / 1001)).toBe('<FramelineSkin tier="viewer" fps={29.97} />');
  });

  it('puts one prop on a line when the snippet gets long', () => {
    expect(snippet(readQuery('tier=studio&zoom=0&markers=0&loop=0&layout=overlay'), 24)).toBe(
      ['<FramelineSkin', '  tier="studio"', '  fps={24}', '  layout="overlay"', '  features={{ loop: false, markers: false, zoom: false }}', '/>'].join('\n')
    );
  });
});
