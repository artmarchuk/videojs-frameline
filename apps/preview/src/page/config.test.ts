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
    for (const query of ['tier=studio', 'tier=viewer', 'tier=studio&zoom=0', 'tier=viewer&layout=dock&timecode=1&guides=1', 'tier=studio&layout=overlay&range=0&zones=0']) {
      expect(writeQuery(readQuery(query))).toBe(query);
    }
  });

  it('reads a flag name from before API 0.1 as its new name, and writes only the new names', () => {
    // The old names are spelled out here on purpose: these are the URLs that were shared.
    const shared = '?tier=studio&inOut=0&shotNav=0&copyTimecodeLink=0&platformZones=0';
    const config = readQuery(shared);
    expect(config.flags).toMatchObject({ range: false, cuts: false, copyLink: false, zones: false, markers: true });
    expect(writeQuery(config, `${shared}&media=reel`)).toBe('tier=studio&cuts=0&range=0&copyLink=0&zones=0&media=reel');
    // On over Viewer, and a new name beside an old one wins.
    expect(overrides(readQuery('?tier=viewer&copyTimecodeLink=1'))).toEqual({ copyLink: true });
    expect(readQuery('?tier=studio&inOut=0&range=1').flags.range).toBe(true);
    expect(readQuery('?tier=studio&inOut=maybe').flags.range).toBe(true);
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
